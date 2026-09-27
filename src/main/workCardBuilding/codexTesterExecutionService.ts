import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import type { EntityId, ProjectStateRecord, TesterRecommendation } from "../../shared/projectState/domainContracts";
import { isTesterOwnedPath } from "../../shared/projectState/testerOwnedPathPolicy";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { CodexTesterExecutionModel } from "../../shared/workspaceContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath, workflowRepositoryCheckoutId } from "../sourceControl/projectSourceTopology";
import { workflowSourceLineName } from "../sourceControl/workSourceNaming";
import { checkpointStructuredTesterResult } from "../sourceControl/structuredWorkflowCheckpointService";
import { createWorkflowExecutionApplicationService } from "../workflow/workflowExecutionApplicationService";
import { determineTestLifecycle, type TestLifecycleCatalogProof, type TestLifecycleDeterminationResult } from "../validation/testLifecycleDeterminationService";
import { loadCodexAppServerAdapter, type CodexAppServerThreadAdapter, type CodexAppServerThreadEvent } from "./codexAppServerTransport";
import type { CodexAppServerExecutionAdapter } from "./codexImplementerExecutionService";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import { acquireWorkflowExecutionLease, workflowExecutionLeaseKey } from "./workflowExecutionLease";

const recommendations: readonly TesterRecommendation[] = ["reuse-existing-proof", "permanent-proof-change-warranted", "lifecycle-review-candidate", "no-permanent-test-required", "production-defect-suspected"];
const maxTail = 24;
const maxText = 1200;
type Ids = { workflowId: string; workItemId: string; implementationRecordId: string };
type ExecutionState = "unavailable" | "ready" | "running" | "completed" | "failed" | "cancelled";
interface Context extends Ids { projectId: string; root: string; sourceMode: "source-backed" | "source-neutral"; checkoutRoot?: string; workerDirectory: string; sourceLineId?: string; checkoutId?: string; revision?: string; changedPaths: string[]; workItemTitle: string; contract: unknown; determination: TestLifecycleDeterminationResult; }
interface Session extends Context { state: ExecutionState; startedAt: number; completedAt: number | null; model: string; reasoningEffort: string; eventTail: string[]; finalText: string; failureReason: string | null; runtimeState: CodexTesterExecutionModel["runtimeState"]; thread: CodexAppServerThreadAdapter | null; appServer: CodexAppServerExecutionAdapter | null; pendingApproval: CodexTesterExecutionModel["pendingApproval"]; pendingUserInput: CodexTesterExecutionModel["pendingUserInput"]; resultId: string | null; candidateRevisionId: string | null; checkpointState: "not-required" | "pending" | "committed" | "blocked" | "inspection-required" | null; cancelRequested: boolean; promise: Promise<void> | null; attributablePaths: string[]; }
function fail(message: string): never { throw new Error(message); }
function addTail(target: string[], value: unknown) { const text = String(value).slice(0, maxText); target.push(text); while (target.length > maxTail) target.shift(); }
export function isEligibleTesterPath(value: string): boolean {
  return isTesterOwnedPath(value);
}
function globMatches(pattern: string, file: string): boolean {
  const escaped = pattern.split("**").map(part => part.split("*").map(piece => piece.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")).join("[^/]*")).join(".*");
  return new RegExp(`^${escaped}$`).test(file);
}
function readLifecycleCatalog(root: string, changedPaths: string[]) {
  const file = path.join(root, "validation", "capability-map.json");
  try {
    const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as { capabilities?: Array<{ capabilityId: string; sourcePatterns?: string[] }>; tests?: Array<{
      testPath: string; behaviorCoverage?: Array<{ capabilityId: string; behaviorId: string; proofRole?: string }>;
      proposedValidationLane?: string; duration?: { milliseconds?: number }; execution?: { ownedResources?: string[] };
    }> };
    if (!Array.isArray(catalog.capabilities) || !Array.isArray(catalog.tests)) return null;
    const affectedCapabilityIds = [...new Set(catalog.capabilities.filter(capability =>
      Array.isArray(capability.sourcePatterns) && changedPaths.some(changed => capability.sourcePatterns!.some(pattern => globMatches(pattern, changed))))
      .map(capability => capability.capabilityId))].sort();
    const catalogProof: TestLifecycleCatalogProof[] = catalog.tests.filter(test => typeof test.testPath === "string" && Array.isArray(test.behaviorCoverage))
      .map(test => ({ testPath: test.testPath, behaviorCoverage: test.behaviorCoverage!,
        ...(test.behaviorCoverage!.find(item => item.proofRole)?.proofRole ? { proofRole: test.behaviorCoverage!.find(item => item.proofRole)!.proofRole } : {}),
        ...(test.proposedValidationLane ? { validationLane: test.proposedValidationLane } : {}),
        ...(test.duration?.milliseconds !== undefined ? { durationMs: test.duration.milliseconds } : {}),
        ...(test.execution?.ownedResources ? { ownedResources: test.execution.ownedResources } : {}) }));
    return { affectedCapabilityIds, catalogProof };
  } catch { return null; }
}
function extractChanges(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) fail("Tester file-change event omitted attributable paths.");
  return value.map(change => {
    const file = change && typeof change === "object" && !Array.isArray(change) ? (change as { path?: unknown }).path : null;
    if (typeof file !== "string" || !isEligibleTesterPath(file) || file.includes("..") || file.includes("\\") || path.isAbsolute(file))
      fail("Tester changed a path outside eligible permanent test files.");
    return file;
  });
}
function checkoutChangedPaths(status: string): string[] {
  const entries = status.split(/\r?\n/).filter(Boolean);
  const paths = entries.map(entry => {
    const file = entry.slice(3);
    if (entry.length < 4 || entry.includes(" -> ") || !isEligibleTesterPath(file)) fail("Tester checkout contains an unattributed or ineligible file change.");
    return file;
  });
  if (new Set(paths).size !== paths.length) fail("Tester checkout change attribution contains duplicate paths.");
  return paths.sort();
}
export function parseTesterResult(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const keys = ["recommendation", "permanentTestPaths", "determinationEvidence", "unknowns", "rationale"];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).sort().join("|") !== keys.sort().join("|")) fail("Tester response does not match the bounded semantic result schema.");
  if (!recommendations.includes(parsed.recommendation as TesterRecommendation)) fail("Tester recommendation is unsupported.");
  for (const key of ["permanentTestPaths", "determinationEvidence", "unknowns"])
    if (!Array.isArray(parsed[key]) || (parsed[key] as unknown[]).length > 128 || (parsed[key] as unknown[]).some(item => typeof item !== "string")) fail(`Tester ${key} must be a bounded string list.`);
  if (typeof parsed.rationale !== "string" || !parsed.rationale.trim() || parsed.rationale.length > 8000) fail("Tester rationale is missing or over bound.");
  return parsed as { recommendation: TesterRecommendation; permanentTestPaths: string[]; determinationEvidence: string[]; unknowns: string[]; rationale: string };
}

export class CodexTesterExecutionService {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly appServerFactory: () => Promise<CodexAppServerExecutionAdapter> = loadCodexAppServerAdapter,
    private readonly now: () => number = () => Date.now()) {}

  async getStatus(root: string, ids: Ids): Promise<CodexTesterExecutionModel> {
    const selected = path.resolve(root), key = testerSessionKey(selected, ids), current = this.sessions.get(key);
    if (current && sameIds(current, ids)) return this.model(current);
    try {
      const context = await this.resolveContext(selected, ids);
      if (current && sameIds(current, ids)) return this.model(current);
      return { state: "ready", ...ids, sourceMode: context.sourceMode, projectId: context.projectId, testerResultId: null, candidateRevisionId: null,
        checkpointState: null, startedAt: null, completedAt: null, eventTail: [], failureReason: null, runtimeState: null,
        pendingApproval: null, pendingUserInput: null };
    } catch (error) { return unavailable(ids, error instanceof Error ? error.message : "Tester context is unavailable."); }
  }

  async start(root: string, ids: Ids, selection: CodexModelSelection): Promise<CodexTesterExecutionModel> {
    const selected = path.resolve(root), key = testerSessionKey(selected, ids), active = this.sessions.get(key);
    if (active?.state === "running") return this.model(active, sameIds(active, ids) ? "Tester is already running for this WorkItem." : "Another exact WorkItem role is active for this project.");
    let context: Context;
    try { context = await this.resolveContext(selected, ids); }
    catch (error) { return unavailable(ids, error instanceof Error ? error.message : "Tester context is unavailable."); }
    const lease = acquireWorkflowExecutionLease(workflowExecutionLeaseKey(context.sourceMode,
      context.checkoutRoot ?? context.workerDirectory), `tester:${ids.workflowId}:${ids.workItemId}`, this.now());
    if (!lease) return unavailable(ids, "Another source-mutating role owns this exact Workflow checkout.");
    const actorId = `tester-${crypto.randomUUID()}`;
    const session: Session = { ...context, state: "running", startedAt: this.now(), completedAt: null, model: selection.model,
      reasoningEffort: selection.reasoningEffort, eventTail: [], finalText: "", failureReason: null, runtimeState: null,
      thread: null, appServer: null, pendingApproval: null, pendingUserInput: null, resultId: null, candidateRevisionId: null,
      checkpointState: null, cancelRequested: false, promise: null, attributablePaths: [] };
    this.sessions.set(key, session);
    session.promise = this.run(session, actorId);
    const renewLease = setInterval(lease.renew, 60_000); renewLease.unref?.();
    void session.promise.finally(() => { clearInterval(renewLease); lease.release(); });
    void session.promise;
    return this.model(session);
  }

  async cancel(root: string, ids: Ids): Promise<CodexTesterExecutionModel> {
    const session = this.sessions.get(testerSessionKey(root, ids));
    if (!session || session.state !== "running") return session ? this.model(session) : unavailable({ workflowId: "", workItemId: "", implementationRecordId: "" }, "No Tester session is active.");
    session.cancelRequested = true;
    try { await session.thread?.interrupt?.(); } catch { /* terminal state records cancellation */ }
    return this.model(session);
  }

  async respondToApproval(root: string, ids: Ids, requestId: string, decision: "approve" | "deny"): Promise<CodexTesterExecutionModel> {
    const session = this.requireRunning(root, ids);
    if (!session.pendingApproval || session.pendingApproval.requestId !== requestId || !session.thread?.respondToApproval) fail("Tester approval request is stale.");
    await session.thread.respondToApproval(requestId, { decision }); session.pendingApproval = null; return this.model(session);
  }
  async respondToUserInput(root: string, ids: Ids, requestId: string, answers: Record<string, string[]>): Promise<CodexTesterExecutionModel> {
    const session = this.requireRunning(root, ids);
    if (!session.pendingUserInput || session.pendingUserInput.requestId !== requestId || !session.thread?.respondToUserInput) fail("Tester input request is stale.");
    const questions = session.pendingUserInput.questions;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || Object.keys(answers).length !== questions.length) fail("Tester input answers do not match the pending questions.");
    for (const question of questions) {
      const answer = answers[question.id];
      if (!Array.isArray(answer) || answer.length === 0 || answer.some(value => !question.options.some(option => option.label === value))) fail("Tester input answer is not one of the pending choices.");
    }
    await session.thread.respondToUserInput(requestId, answers); session.pendingUserInput = null; return this.model(session);
  }

  private requireRunning(root: string, ids: Ids) { const session = this.sessions.get(testerSessionKey(root, ids)); if (!session || session.state !== "running") fail("No Tester session is active for that exact Workflow WorkItem attempt."); return session; }
  private model(session: Session, blocker?: string): CodexTesterExecutionModel { return { state: session.state, workflowId: session.workflowId,
    workItemId: session.workItemId, implementationRecordId: session.implementationRecordId, sourceMode: session.sourceMode, projectId: session.projectId,
    testerResultId: session.resultId, candidateRevisionId: session.candidateRevisionId, checkpointState: session.checkpointState,
    startedAt: new Date(session.startedAt).toISOString(), completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    eventTail: [...session.eventTail], failureReason: blocker ?? session.failureReason, runtimeState: session.runtimeState,
    pendingApproval: session.pendingApproval, pendingUserInput: session.pendingUserInput }; }

  private async resolveContext(root: string, ids: Ids): Promise<Context> {
    const projectId = selectedCurrentProjectId(root); if (!projectId) fail("Selected Current Project registration is unavailable.");
    const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
    try {
      const state = createProjectStateService(store, { principalId: "tester-preflight", principalType: "agent", role: "Tester" });
      const workflow = await state.getRecord(projectId, ids.workflowId), workItem = await state.getRecord(projectId, ids.workItemId), implementation = await state.getRecord(projectId, ids.implementationRecordId);
      if (workflow?.entityType !== "Workflow" || workflow.body.workflowType === "work-intake-routing" || workflow.lifecycleState !== "active" || ["closed", "cancelled"].includes(workflow.body.workflowState)) fail("Tester requires the exact active substantive Workflow.");
      if (workItem?.entityType !== "WorkItem" || workItem.lifecycleState !== "active" || workItem.body.workState !== "validation_pending") fail("Tester requires the exact active validation-pending WorkItem.");
      if (implementation?.entityType !== "ImplementationRecord" || implementation.body.workItemId !== workItem.id || implementation.body.outcome !== "implemented") fail("Tester requires the selected WorkItem's successful ImplementationRecord.");
      const attempts = await state.getImplementationAttempts(projectId, workItem.id);
      if (attempts.at(-1)?.id !== implementation.id) fail("Tester requires the latest ImplementationRecord for the exact WorkItem to be successful.");
      const parents = (await store.listRelationships(projectId, "part_of")).filter(edge => !edge.endedAt); let cursor: EntityId | undefined = workItem.id; const visited = new Set<EntityId>();
      while (cursor !== workflow.id && cursor && !visited.has(cursor)) { visited.add(cursor); const links = parents.filter(edge => edge.fromEntityId === cursor); cursor = links.length === 1 ? links[0].toEntityId : undefined; }
      if (cursor !== workflow.id) fail("Tester WorkItem is not owned by the exact Workflow.");
      const workflows = (await store.listEntities(projectId, "Workflow")).filter(row => row.entityType === "Workflow" && row.lineageId === workflow.lineageId);
      if (workflows.filter(row => row.lifecycleState === "active" && row.entityType === "Workflow" && row.body.workflowType !== "work-intake-routing" && !["closed", "cancelled"].includes(row.body.workflowState)).length !== 1) fail("Tester Workflow is not the unique current owner.");
      const lineage = new Set(workflows.map(row => row.id));
      const bindings = (await store.listEntities(projectId, "SourceBinding")).filter((row): row is ProjectStateRecord<"SourceBinding"> => row.entityType === "SourceBinding" && lineage.has(row.body.workflowId) && row.lifecycleState === "active");
      const execution = createWorkflowExecutionApplicationService();
      if (bindings.length === 0) {
        const projection = await execution.getExecutionProjection(root, workflow.id);
        if (projection.source.state !== "non-source") fail("Tester source-neutral mode requires an exact non-source Workflow.");
        const contract = await execution.createSourceNeutralWorkItemExecutionContract(root, workflow.id, workItem.id,
          { affectedPaths: [], proofIntent: ["Assess whether this source-neutral WorkItem requires repository-backed permanent proof."] }, true);
        const obligations = (await store.listEntities(projectId, "RegressionObligation"))
          .filter((row): row is ProjectStateRecord<"RegressionObligation"> => row.entityType === "RegressionObligation" && row.lifecycleState === "active" && row.body.obligationState !== "retired")
          .map(row => ({ id: row.id, capabilityId: row.body.capabilityId, state: row.body.obligationState }));
        const validations = (await store.listEntities(projectId, "Validation"))
          .filter((row): row is ProjectStateRecord<"Validation"> => row.entityType === "Validation" && row.body.validationType === "test-lifecycle-assessment");
        const validationLinks = (await store.listRelationships(projectId, "evaluates")).filter(edge => !edge.endedAt);
        const priorLifecycleStatuses = validations.filter(validation => validationLinks.some(edge => edge.fromEntityId === validation.id && obligations.some(obligation => obligation.id === edge.toEntityId)))
          .map(validation => validation.body.assessmentStatus).filter(value => value !== undefined);
        const determination = determineTestLifecycle({ workItemId: workItem.id, implementationRecordId: implementation.id,
          changedPaths: [], affectedCapabilityIds: [], catalogProof: [], regressionObligations: obligations, priorLifecycleStatuses, evidenceComplete: false });
        return { ...ids, projectId, root, sourceMode: "source-neutral", workerDirectory: path.join(root, ".champcity", "runtime", "tester-workers", `${implementation.id}-${crypto.randomUUID()}`),
          changedPaths: [], workItemTitle: contract.objective, contract, determination };
      }
      if (bindings.length !== 1 || bindings[0].body.preparationState !== "ready" || !bindings[0].body.repositoryCheckoutId || !bindings[0].body.workSourceLineId || !bindings[0].body.currentRevisionId) fail("Tester requires one ready source-backed Workflow binding.");
      const binding = bindings[0];
      if (binding.body.repositoryCheckoutId !== workflowRepositoryCheckoutId(workflow.id) || binding.body.workSourceLineId !== workflowSourceLineName(workflow.id)) fail("Tester SourceBinding does not identify the exact managed Workflow checkout.");
      const links = await store.listRelationships(projectId, "checkpoints");
      const checkpoints = (await store.listEntities(projectId, "SourceCheckpoint")).filter((row): row is ProjectStateRecord<"SourceCheckpoint"> => row.entityType === "SourceCheckpoint" && row.body.checkpointKind === "implementation" && row.body.checkpointState === "committed" && row.body.resultingRevisionId !== undefined && row.body.workflowId === workflow.id && links.some(edge => edge.fromEntityId === row.id && edge.toEntityId === implementation.id && !edge.endedAt));
      if (checkpoints.length !== 1 || checkpoints[0].body.resultingRevisionId !== binding.body.currentRevisionId)
        fail(`Tester requires the exact committed implementation checkpoint at the current source revision (matching checkpoints: ${checkpoints.length}; checkpoint revision: ${checkpoints[0]?.body.resultingRevisionId ?? "missing"}; bound revision: ${binding.body.currentRevisionId ?? "missing"}).`);
      const managed = resolveManagedWorkflowCheckoutPath(root, workflow.id), checkoutRoot = fs.realpathSync(managed.checkoutRoot);
      const [top, branch, head, common, status] = await Promise.all([
        runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "--show-toplevel"] }), runBoundedGit({ cwd: checkoutRoot, args: ["branch", "--show-current"] }),
        runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "HEAD"] }), runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "--git-common-dir"] }),
        runBoundedGit({ cwd: checkoutRoot, args: ["status", "--porcelain", "--untracked-files=all"] }),
      ]);
      const testRoot = path.join(checkoutRoot, "test");
      const commonPath = path.resolve(checkoutRoot, common.stdout.trim());
      const devCheckout = resolveManagedProjectSourceTopology(root).devCheckoutRoot;
      const devCommon = await runBoundedGit({ cwd: devCheckout, args: ["rev-parse", "--git-common-dir"] });
      const expectedCommon = path.resolve(devCheckout, devCommon.stdout.trim());
      const validationRoot = path.join(checkoutRoot, "validation");
      if (fs.realpathSync(top.stdout.trim()) !== checkoutRoot || branch.stdout.trim() !== binding.body.workSourceLineId || head.stdout.trim() !== binding.body.currentRevisionId || status.stdout || !fs.existsSync(testRoot) || fs.realpathSync(testRoot) !== testRoot || !fs.existsSync(validationRoot) || fs.realpathSync(validationRoot) !== validationRoot || fs.realpathSync(commonPath) !== fs.realpathSync(expectedCommon)) fail("Tester checkout is stale, dirty, redirected, or does not match SourceBinding.");
      const changedPaths = (await runBoundedGit({ cwd: checkoutRoot, args: ["diff-tree", "--no-commit-id", "--name-only", "-r", checkpoints[0].body.resultingRevisionId! ] })).stdout.split(/\r?\n/).filter(Boolean).sort();
      const catalog = readLifecycleCatalog(checkoutRoot, changedPaths);
      const obligations = (await store.listEntities(projectId, "RegressionObligation"))
        .filter((row): row is ProjectStateRecord<"RegressionObligation"> => row.entityType === "RegressionObligation" && row.lifecycleState === "active" && row.body.obligationState !== "retired")
        .map(row => ({ id: row.id, capabilityId: row.body.capabilityId, state: row.body.obligationState }));
      const validations = (await store.listEntities(projectId, "Validation"))
        .filter((row): row is ProjectStateRecord<"Validation"> => row.entityType === "Validation" && row.body.validationType === "test-lifecycle-assessment");
      const validationLinks = (await store.listRelationships(projectId, "evaluates")).filter(edge => !edge.endedAt);
      const priorLifecycleStatuses = validations.filter(validation => validationLinks.some(edge => edge.fromEntityId === validation.id && obligations.some(obligation => obligation.id === edge.toEntityId)))
        .map(validation => validation.body.assessmentStatus).filter(value => value !== undefined);
      const determination = determineTestLifecycle({ workItemId: workItem.id, implementationRecordId: implementation.id, implementerRevision: binding.body.currentRevisionId,
        changedPaths, affectedCapabilityIds: catalog?.affectedCapabilityIds ?? [], catalogProof: catalog?.catalogProof ?? [], regressionObligations: obligations,
        priorLifecycleStatuses, evidenceComplete: catalog !== null });
      const contract = await execution.createTesterWorkItemExecutionContract(root, workflow.id, workItem.id,
        { sourceMutation: "required", affectedPaths: changedPaths, proofIntent: ["Assess permanent regression proof for this exact implemented WorkItem."] });
      return { ...ids, projectId, root, sourceMode: "source-backed", checkoutRoot, workerDirectory: checkoutRoot, sourceLineId: binding.body.workSourceLineId!, checkoutId: binding.body.repositoryCheckoutId!,
        revision: binding.body.currentRevisionId!, changedPaths, workItemTitle: contract.objective, contract, determination };
    } finally { store.close(); }
  }

  private async run(session: Session, actorId: string): Promise<void> {
    try {
      const app = await this.appServerFactory(); session.appServer = app;
      const backed = session.sourceMode === "source-backed", checkoutRoot = session.checkoutRoot;
      let writableRoots: string[];
      const workingDirectory = backed ? checkoutRoot! : session.workerDirectory;
      if (backed) {
        const testRoot = fs.realpathSync(path.join(checkoutRoot!, "test"));
        const validationRoot = fs.realpathSync(path.join(checkoutRoot!, "validation"));
        if (!testRoot.startsWith(`${checkoutRoot}${path.sep}`) || !validationRoot.startsWith(`${checkoutRoot}${path.sep}`)) fail("Tester writable root escaped the managed checkout.");
        writableRoots = [testRoot, validationRoot];
      } else {
        fs.mkdirSync(session.workerDirectory, { recursive: true });
        const worker = fs.realpathSync(session.workerDirectory);
        if (!worker.startsWith(`${path.join(session.root, ".champcity", "runtime", "tester-workers")}${path.sep}`)) fail("Source-neutral Tester worker escaped its application-owned runtime directory.");
        writableRoots = [worker];
      }
      const thread = app.startThread({ workingDirectory, model: session.model, reasoningEffort: session.reasoningEffort,
        skipGitRepoCheck: true, sandboxMode: "workspace-write", approvalPolicy: "on-request", approvalsReviewer: "user",
        networkAccessEnabled: false, writableRoots });
      session.thread = thread; session.runtimeState = app.getRuntimeState?.() ?? null;
      addTail(session.eventTail, "tester.thread.start requested");
      const streamed = await thread.runStreamed(buildPrompt(session));
      for await (const event of streamed.events) this.consume(session, event);
      if (session.cancelRequested && session.failureReason) fail(session.failureReason);
      if (session.cancelRequested) { session.state = "cancelled"; session.completedAt = this.now(); session.failureReason = "Tester session cancelled before result persistence."; return; }
      if (session.failureReason) fail(session.failureReason);
      const result = parseTesterResult(session.finalText);
      const reported = [...new Set(result.permanentTestPaths)].sort(), observed = [...new Set(session.attributablePaths)].sort();
      if (reported.length !== result.permanentTestPaths.length || reported.join("\0") !== observed.join("\0")) fail("Tester result paths do not equal attributed test edits.");
      if (!backed && reported.length) fail("Source-neutral Tester cannot edit or claim permanent repository proof.");
      if (backed) {
        const checkoutStatus = await runBoundedGit({ cwd: checkoutRoot!, args: ["status", "--porcelain=v1", "--untracked-files=all"] });
        const onDiskPaths = checkoutChangedPaths(checkoutStatus.stdout);
        if (onDiskPaths.join("\0") !== observed.join("\0")) fail("Tester App Server file-change attribution does not match the exact checkout changes.");
      }
      const store = createSQLiteProjectStateStore(path.join(session.root, ".champcity", "project-state.sqlite"));
      let testerResult: ProjectStateRecord<"TesterResult">;
      try {
        const service = createProjectStateService(store, { principalId: actorId, principalType: "agent", role: "Tester" });
        testerResult = await service.createTesterResult(session.projectId, session.workflowId, session.workItemId, session.implementationRecordId, {
          sourceMode: session.sourceMode, ...(session.revision ? { implementerRevisionId: session.revision } : {}), ...result,
          ...(session.sourceMode === "source-neutral" && result.recommendation === "permanent-proof-change-warranted" ? { recommendation: "lifecycle-review-candidate" as const } : {}),
          affectedCapabilityIds: session.determination.affectedCapabilityIds, permanentTestPaths: reported,
          determinationEvidence: [...new Set([...session.determination.evidence, ...result.determinationEvidence,
            `Application-owned lifecycle determination: ${session.determination.recommendation}.`])],
          unknowns: [...new Set([...session.determination.unknowns, ...result.unknowns,
            ...(session.sourceMode === "source-neutral" && result.recommendation === "permanent-proof-change-warranted" ? ["No repository-backed permanent proof surface exists for this source-neutral WorkItem."] : [])])],
        });
      } finally { store.close(); }
      session.resultId = testerResult.id; session.checkpointState = testerResult.body.checkpointState;
      if (reported.length && backed) {
        try {
          const checkpoint = await checkpointStructuredTesterResult(session.root, session.projectId, testerResult.id);
          session.candidateRevisionId = checkpoint.record.body.candidateRevisionId ?? null; session.checkpointState = checkpoint.record.body.checkpointState;
        } catch (error) {
          const store = createSQLiteProjectStateStore(path.join(session.root, ".champcity", "project-state.sqlite"));
          try {
            const current = await store.getEntity(session.projectId, testerResult.id);
            if (current?.entityType === "TesterResult") {
              session.checkpointState = current.body.checkpointState;
              session.candidateRevisionId = current.body.candidateRevisionId ?? null;
            }
          } finally { store.close(); }
          throw error;
        }
      } else session.candidateRevisionId = session.revision ?? null;
      session.state = "completed"; session.completedAt = this.now();
    } catch (error) { session.state = "failed"; session.completedAt = this.now(); session.failureReason = error instanceof Error ? error.message : "Tester execution failed."; }
    finally { try { await session.thread?.dispose?.(); } catch { /* terminal state is retained */ } try { await session.appServer?.dispose?.(); } catch { /* terminal state is retained */ } }
  }

  private consume(session: Session, event: CodexAppServerThreadEvent): void {
    addTail(session.eventTail, summarize(event));
    if (event.type === "item.completed" && event.item.type === "file_change") {
      try { if (session.sourceMode === "source-neutral") fail("Source-neutral Tester has no permanent proof write surface."); session.attributablePaths.push(...extractChanges(event.item.changes)); }
      catch (error) { session.failureReason = error instanceof Error ? error.message : "Tester file-change attribution failed."; session.cancelRequested = true; void session.thread?.interrupt?.(); }
    } else if (event.type === "item.completed" && event.item.type === "agent_message") session.finalText = String(event.item.text).slice(0, 12000);
    else if (event.type === "approval.requested") session.pendingApproval = event.approval;
    else if (event.type === "user_input.requested") session.pendingUserInput = event.request;
  }
}

function sameIds(session: Ids, ids: Ids) { return session.workflowId === ids.workflowId && session.workItemId === ids.workItemId && session.implementationRecordId === ids.implementationRecordId; }
function testerSessionKey(root: string, ids: Ids) { return `${path.resolve(root).toLowerCase()}::${ids.workflowId}::${ids.workItemId}::${ids.implementationRecordId}`; }
function unavailable(ids: Ids, failureReason: string): CodexTesterExecutionModel { return { state: "unavailable", ...ids, sourceMode: null, projectId: null, testerResultId: null, candidateRevisionId: null, checkpointState: null, startedAt: null, completedAt: null, eventTail: [], failureReason, runtimeState: null, pendingApproval: null, pendingUserInput: null }; }
function summarize(event: CodexAppServerThreadEvent): string { if (event.type === "item.completed") return `${event.item.type}.completed`; if (event.type === "approval.requested") return `approval.requested ${event.approval.requestId}`; if (event.type === "user_input.requested") return `user_input.requested ${event.request.requestId}`; return event.type; }
function buildPrompt(session: Session): string {
  const sourceRules = session.sourceMode === "source-neutral"
    ? "This exact WorkItem is source-neutral. No repository checkout, source revision, Git operation, or permanent proof file exists in this mode. Review only the exact contract and implementation evidence supplied here. Do not write files. If repository-backed proof would be needed, return lifecycle-review-candidate and explain this limitation in unknowns."
    : `Implementer revision: ${session.revision}\nChanged implementation paths: ${JSON.stringify(session.changedPaths)}\nReview the current implementation and permanent proof. You may add or edit ordinary files under test/ and exactly validation/capability-map.json.`;
  return `You are the independent Tester for one exact ChampCity Workflow WorkItem. Do not act as Implementer, Validator, Repair agent, or Operator. Do not run Git commands or change files outside the bounded Tester-owned proof package. The application owns source checkpoints.\n\nExact contract:\n${JSON.stringify(session.contract, null, 2)}\n\nSource mode: ${session.sourceMode}\nImplementation attempt: ${session.implementationRecordId}\n${sourceRules}\nBounded lifecycle determination: ${JSON.stringify(session.determination, null, 2)}\n\nDo not edit production source, other validation metadata, configuration, generated files, secrets, or application state. Return exactly one JSON object with keys recommendation, permanentTestPaths, determinationEvidence, unknowns, rationale. recommendation must be one of ${recommendations.join(", ")}. permanentTestPaths must list exactly the proof files you changed; it must be empty for source-neutral work. If a production defect is found, report production-defect-suspected and describe it; do not repair production code. Do not claim Operator acceptance or Validator proof.`;
}
