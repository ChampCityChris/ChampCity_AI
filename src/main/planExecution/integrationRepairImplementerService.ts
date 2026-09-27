import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import type { IntegrationRepairAttempt, IntegrationRepairPatch } from "../../shared/integrationRepairContracts";
import type { CodexImplementerExecutionModel, CodexApprovalResponse, CodexMcpElicitationResponse } from "../../shared/workspaceContracts";
import { integrationPaths } from "../agentHarness/repository/integrationGit";
import { assertIntegrationSourceText, integrationSourceBytes, integrationSourceDigest, integrationSourceFile } from "../agentHarness/repository/integrationRepairGit";
import type { CodexAppServerExecutionAdapter, CodexThreadAdapter } from "../workCardBuilding/codexImplementerExecutionService";
import { codexRuntimeManager } from "../workCardBuilding/codexRuntimeManager";
import { createRoutedIntegrationService } from "./routedIntegrationService";

export interface IntegrationRepairExecutionSelector {
  ownerKind: "integration-repair";
  intakeId: string;
  candidateId: string;
  repairId: string;
}

export interface IntegrationRepairExecutionContext {
  ownerKind: "integration-repair";
  repositoryRoot: string;
  selector: IntegrationRepairExecutionSelector;
  attempt: IntegrationRepairAttempt;
  isolatedRoot: string;
  editablePaths: string[];
  startingHashes: Record<string, string>;
}

interface Session {
  context: IntegrationRepairExecutionContext;
  selection: CodexModelSelection;
  state: "running" | "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt: number | null;
  failureReason: string | null;
  eventTail: string[];
  stderrTail: string[];
  finalResponseTail: string[];
  approvalTail: CodexImplementerExecutionModel["approvalTail"];
  runtimeDenialTail: string[];
  runtimeState: CodexImplementerExecutionModel["runtimeState"];
  pendingApproval: CodexImplementerExecutionModel["pendingApproval"];
  pendingUserInput: CodexImplementerExecutionModel["pendingUserInput"];
  pendingMcpElicitation: CodexImplementerExecutionModel["pendingMcpElicitation"];
  abort: AbortController;
  thread: CodexThreadAdapter | null;
  run: Promise<void> | null;
  release: () => void;
}

type IntegrationService = ReturnType<typeof createRoutedIntegrationService>;
type RuntimeFactory = () => Promise<CodexAppServerExecutionAdapter>;
type Lease = { selection: CodexModelSelection; release: () => void };
const identity = (selector: IntegrationRepairExecutionSelector) => `${selector.intakeId}:${selector.candidateId}:${selector.repairId}`;
const tail = (items: string[], value: string) => { items.push(value.slice(0, 1200)); if (items.length > 24) items.shift(); };
const reason = (error: unknown) => error instanceof Error && !/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(error.message)
  ? error.message.slice(0, 1500) : "Integration Repair execution failed.";

function baseModel(state: CodexImplementerExecutionModel["state"], failureReason: string | null = null): CodexImplementerExecutionModel {
  return { state, executionKind: "integration-repair", lastRunState: null, canRunAgain: state === "ready", canResolveEnvironment: false,
    retryBlocker: failureReason, integrationMode: "app-server-stdio", phaseId: null, workflowId: null, workItemId: null,
    workItemVersion: null, executionContractDigest: null, sourceMode: null, workCardId: null, workCardTitle: null,
    projectRoot: null, formalWorkCardPath: null, formalWorkCardRevision: null, formalWorkCardSha256: null,
    implementerReportPath: null, implementerReportRevision: null, implementerReportSha256: null,
    startedAt: null, completedAt: null, elapsedMs: null, eventTail: [], stderrTail: [], finalResponseTail: [],
    approvalTail: [], runtimeDenialTail: [], runtimeState: null, pendingApproval: null, pendingUserInput: null,
    pendingMcpElicitation: null, failureReason, reportUpdated: false, reportSha256After: null,
    developmentEnvironmentPreflight: null };
}

function sessionModel(session: Session, now: number): CodexImplementerExecutionModel {
  const terminal = session.state !== "running";
  return { ...baseModel(session.state, session.failureReason), lastRunState: session.state === "running" ? null : session.state,
    canRunAgain: terminal && session.state !== "completed", retryBlocker: terminal ? session.failureReason : "Integration Repair is running.",
    startedAt: new Date(session.startedAt).toISOString(), completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    elapsedMs: (session.completedAt ?? now) - session.startedAt, eventTail: [...session.eventTail], stderrTail: [...session.stderrTail],
    finalResponseTail: [...session.finalResponseTail], approvalTail: [...session.approvalTail], runtimeDenialTail: [...session.runtimeDenialTail],
    runtimeState: session.runtimeState, pendingApproval: session.pendingApproval, pendingUserInput: session.pendingUserInput,
    pendingMcpElicitation: session.pendingMcpElicitation };
}

function createIsolatedContext(root: string, selector: IntegrationRepairExecutionSelector, attempt: IntegrationRepairAttempt): IntegrationRepairExecutionContext {
  const editablePaths = attempt.policy.editablePaths;
  if (attempt.status !== "prepared" || !editablePaths.length || editablePaths.length > 32 ||
    new Set(editablePaths).size !== editablePaths.length || Object.keys(attempt.snapshot.editable).length !== editablePaths.length)
    throw Error("The exact prepared Integration Repair scope is required.");
  const sourceRoot = integrationPaths(root, selector.candidateId).checkout;
  const isolatedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-integration-repair-"));
  try {
    for (const relativePath of editablePaths) {
      const bytes = integrationSourceBytes(sourceRoot, relativePath);
      const actualHash = bytes === null ? "deleted" : integrationSourceDigest(bytes);
      if (actualHash !== attempt.snapshot.editable[relativePath]) throw Error("Integration Repair source changed after preparation.");
      if (bytes !== null) {
        const target = integrationSourceFile(isolatedRoot, relativePath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, bytes, { flag: "wx" });
      }
    }
    return { ownerKind: "integration-repair", repositoryRoot: root, selector, attempt, isolatedRoot,
      editablePaths: [...editablePaths], startingHashes: { ...attempt.snapshot.editable } };
  } catch (error) { removeIsolatedRoot(isolatedRoot); throw error; }
}

function removeIsolatedRoot(root: string): void {
  const parent = fs.realpathSync(os.tmpdir());
  if (path.dirname(root) !== parent || !path.basename(root).startsWith("champcity-integration-repair-"))
    throw Error("Integration Repair temporary root is outside its owned directory.");
  fs.rmSync(root, { recursive: true, force: true });
}

export function collectIntegrationRepairPatches(context: IntegrationRepairExecutionContext): IntegrationRepairPatch[] {
  const declared = new Set(context.editablePaths);
  const prefixes = new Set(context.editablePaths.flatMap((entry) => entry.split("/").slice(0, -1)
    .map((_, index, segments) => segments.slice(0, index + 1).join("/"))));
  function inspect(directory: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(context.isolatedRoot, absolute).replaceAll("\\", "/");
      if (entry.isSymbolicLink() || entry.isDirectory() && !prefixes.has(relative) || entry.isFile() && !declared.has(relative) ||
        !entry.isDirectory() && !entry.isFile()) throw Error("Integration Repair created an undeclared path.");
      if (entry.isDirectory()) inspect(absolute);
    }
  }
  inspect(context.isolatedRoot);
  const patches: IntegrationRepairPatch[] = [];
  for (const relativePath of context.editablePaths) {
    const bytes = integrationSourceBytes(context.isolatedRoot, relativePath);
    if (bytes !== null) assertIntegrationSourceText(bytes);
    const after = bytes === null ? "deleted" : integrationSourceDigest(bytes);
    if (after !== context.startingHashes[relativePath]) patches.push({ path: relativePath,
      beforeSha256: context.startingHashes[relativePath], content: bytes });
  }
  if (!patches.length) throw Error("Integration Repair produced no bounded source change.");
  return patches;
}

export class IntegrationRepairImplementerService {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly runtimeFactory: RuntimeFactory = () => codexRuntimeManager.launch(),
    private readonly integrationFactory: (root: string, intakeId: string) => IntegrationService = createRoutedIntegrationService,
    private readonly acquire: (selection: CodexModelSelection) => Lease = (selection) => codexRuntimeManager.acquire(selection),
    private readonly now: () => number = () => Date.now()) {}

  status(root: string, selector: IntegrationRepairExecutionSelector): CodexImplementerExecutionModel {
    const active = this.sessions.get(path.resolve(root));
    if (active && identity(active.context.selector) === identity(selector)) return sessionModel(active, this.now());
    if (active?.state === "running") return baseModel("unavailable", "Another Codex run is active in this repository.");
    try {
      const attempt = this.integrationFactory(root, selector.intakeId).readRepair(selector.candidateId, selector.repairId);
      return attempt.status === "prepared" ? baseModel("ready") : baseModel("unavailable", "Integration Repair is no longer awaiting source resolution.");
    } catch (error) { return baseModel("unavailable", reason(error)); }
  }

  async start(root: string, selector: IntegrationRepairExecutionSelector, selection: CodexModelSelection): Promise<CodexImplementerExecutionModel> {
    const key = path.resolve(root);
    const active = this.sessions.get(key);
    if (active?.state === "running") return baseModel("unavailable", "Another Codex run is active in this repository.");
    const integration = this.integrationFactory(root, selector.intakeId);
    const attempt = integration.readRepair(selector.candidateId, selector.repairId);
    const context = createIsolatedContext(root, selector, attempt);
    let lease: Lease;
    try { lease = this.acquire(selection); }
    catch (error) { removeIsolatedRoot(context.isolatedRoot); return baseModel("unavailable", reason(error)); }
    const session: Session = { context, selection: lease.selection, state: "running", startedAt: this.now(), completedAt: null,
      failureReason: null, eventTail: [], stderrTail: [], finalResponseTail: [], approvalTail: [], runtimeDenialTail: [],
      runtimeState: null, pendingApproval: null, pendingUserInput: null, pendingMcpElicitation: null,
      abort: new AbortController(), thread: null, run: null, release: lease.release };
    this.sessions.set(key, session);
    session.run = this.execute(session, integration);
    void session.run;
    return sessionModel(session, this.now());
  }

  async awaitCompletion(root: string): Promise<void> { await this.sessions.get(path.resolve(root))?.run; }

  async cancel(root: string, selector: IntegrationRepairExecutionSelector): Promise<CodexImplementerExecutionModel> {
    const session = this.running(root, selector);
    session.abort.abort();
    await session.thread?.interrupt?.();
    return sessionModel(session, this.now());
  }

  async respondApproval(root: string, selector: IntegrationRepairExecutionSelector, response: CodexApprovalResponse): Promise<CodexImplementerExecutionModel> {
    const session = this.running(root, selector);
    if (session.pendingApproval?.requestId !== response.requestId || !session.thread?.respondToApproval) throw Error("Current Integration Repair approval is required.");
    await session.thread.respondToApproval(response.requestId, { decision: response.decision });
    session.pendingApproval = null; return sessionModel(session, this.now());
  }

  async respondInput(root: string, selector: IntegrationRepairExecutionSelector, response: { requestId: string; answers: Record<string, string[]> }): Promise<CodexImplementerExecutionModel> {
    const session = this.running(root, selector);
    if (session.pendingUserInput?.requestId !== response.requestId || !session.thread?.respondToUserInput) throw Error("Current Integration Repair input request is required.");
    await session.thread.respondToUserInput(response.requestId, response.answers);
    session.pendingUserInput = null; return sessionModel(session, this.now());
  }

  async respondElicitation(root: string, selector: IntegrationRepairExecutionSelector, response: CodexMcpElicitationResponse): Promise<CodexImplementerExecutionModel> {
    const session = this.running(root, selector);
    if (session.pendingMcpElicitation?.requestId !== response.requestId || !session.thread?.respondToMcpElicitation) throw Error("Current Integration Repair elicitation is required.");
    await session.thread.respondToMcpElicitation(response.requestId, { action: response.action, content: response.content });
    session.pendingMcpElicitation = null; return sessionModel(session, this.now());
  }

  private running(root: string, selector: IntegrationRepairExecutionSelector): Session {
    const session = this.sessions.get(path.resolve(root));
    if (!session || session.state !== "running" || identity(session.context.selector) !== identity(selector)) throw Error("The exact running Integration Repair is required.");
    return session;
  }

  private async execute(session: Session, integration: IntegrationService): Promise<void> {
    let adapter: CodexAppServerExecutionAdapter | null = null;
    try {
      adapter = await this.runtimeFactory();
      session.runtimeState = adapter.getRuntimeState?.() ?? null;
      const thread = adapter.startThread({ workingDirectory: session.context.isolatedRoot, model: session.selection.model,
        reasoningEffort: session.selection.reasoningEffort, skipGitRepoCheck: true, sandboxMode: "workspace-write",
        approvalPolicy: "on-request", approvalsReviewer: "user", networkAccessEnabled: false,
        writableRoots: [session.context.isolatedRoot] });
      session.thread = thread;
      const prompt = `${session.context.attempt.prompt}\n\n## In-product execution\nEdit only the declared source files in this isolated working directory. Do not use Git, create files outside the editable set, or write an Implementer Report. ChampCity will collect the changed bytes, apply the bounded patch, commit, and validate. If accepted intent is incompatible, make no edits and end with OPERATOR_DECISION_REQUIRED: followed by the reason. Do not return JSON patches.`;
      const streamed = await thread.runStreamed(prompt, { signal: session.abort.signal });
      for await (const event of streamed.events) {
        tail(session.eventTail, event.type);
        if (event.type === "item.completed" && event.item.type === "agent_message") tail(session.finalResponseTail, String(event.item.text));
        if (event.type === "runtime.stderr") tail(session.stderrTail, event.message);
        if (event.type === "runtime.denial") tail(session.runtimeDenialTail, event.message);
        if (event.type === "approval.requested") session.pendingApproval = event.approval;
        if (event.type === "approval.completed") { session.approvalTail.push(event.approval); session.pendingApproval = null; }
        if (event.type === "user_input.requested") session.pendingUserInput = event.request;
        if (event.type === "mcp_elicitation.requested") session.pendingMcpElicitation = event.request;
        if (event.type === "turn.failed") throw Error(event.error.message);
        if (event.type === "error") throw Error(event.message);
      }
      if (session.abort.signal.aborted) { session.state = "cancelled"; return; }
      const decision = session.finalResponseTail.join("\n").match(/^OPERATOR_DECISION_REQUIRED:\s*(.+)$/m);
      const { selector } = session.context;
      const expectedFingerprint = (await integration.query()).completionFingerprint;
      if (!expectedFingerprint) throw Error("Current completion fingerprint is unavailable for Integration Repair.");
      if (decision) {
        await integration.requestOperatorDecision({ expectedFingerprint, candidateId: selector.candidateId,
          repairId: selector.repairId, reason: decision[1].trim() });
      } else {
        const patches = collectIntegrationRepairPatches(session.context);
        await integration.applyRepair({ expectedFingerprint, candidateId: selector.candidateId, repairId: selector.repairId, patches });
        await integration.completeRepair({ expectedFingerprint, candidateId: selector.candidateId, repairId: selector.repairId });
      }
      tail(session.eventTail, decision ? "integration-repair.operator-decision" : "integration-repair.application-validation-complete");
      session.state = "completed";
    } catch (error) {
      session.state = session.abort.signal.aborted ? "cancelled" : "failed";
      session.failureReason = reason(error);
      tail(session.stderrTail, session.failureReason);
    } finally {
      session.pendingApproval = null; session.pendingUserInput = null; session.pendingMcpElicitation = null;
      session.completedAt = this.now();
      try { await session.thread?.dispose?.(); } catch { /* Preserve execution result. */ }
      try { await adapter?.dispose?.(); } catch { /* Preserve execution result. */ }
      session.thread = null;
      try { removeIsolatedRoot(session.context.isolatedRoot); }
      catch { session.state = "failed"; session.failureReason = "Integration Repair temporary source could not be removed."; }
      finally { session.release(); }
    }
  }
}

export const integrationRepairImplementerService = new IntegrationRepairImplementerService();
