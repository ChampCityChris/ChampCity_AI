import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { PlanExecutionInput, WorkItemExecutionEvidence } from "../../shared/planExecutionContracts";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary } from "../../shared/documents/planningDocument";
import { readRoutedDevelopmentExecutionBinding } from "./routedDevelopmentExecutionBinding";
import { projectPlanExecution } from "./planExecutor";
import { developmentLifecycleStage } from "./developmentExecutionAdapter";
import { resolveWorkItemArtifactScope, workItemArtifactScopeFromIdentity, workItemIntakeTargets } from "../workCardLoop/workItemArtifactScope";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { generateRoutedWorkCardIntakeHandoff } from "../workCardIntake/workCardIntakeService";
import { createFormalWorkCardArchitectOutputDefinition, type FormalWorkCardContext } from "../workCardPlanning/workCardPlanningService";
import { resolveMcpWorkspaceBindingForPrompt } from "../integrations/mcpWorkspacePromptContract";
import { createArchitectOutputRegistry } from "../architectOutputs/architectOutputRegistry";
import { prepareArchitectOutputRuntimeSubmission, getArchitectOutputRuntimeStatus } from "../architectOutputs/architectOutputRuntimeService";
import { approveFormalWorkCardAndRegisterReport, getWorkCardBuildingReviewProjection, resolveWorkCardImplementerReportContext, setImplementerReportDisposition, requireReadyImplementerReportForReview } from "../workCardBuilding/workCardBuildingReviewService";
import { updateCanonicalMarkdownDisposition } from "../documents/canonicalMarkdownDocumentWriter";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";

const actionsInProgress = new Set<string>();
export interface RoutedWorkItemRequest { workItemId: string; expectedFingerprint: string }

/** Resolve existing lifecycle evidence; the generic executor alone decides progression. */
export async function loadRoutedDevelopmentExecution(workspaceRoot: string, intakeId: string) {
  const binding = await readRoutedDevelopmentExecutionBinding(workspaceRoot, intakeId);
  if (!binding) throw Error("Current routed Development execution binding is required.");
  const scopes = new Map<string, Awaited<ReturnType<typeof resolveWorkItemArtifactScope>>>();
  for (const item of binding.structure.workItems) {
    const key = item.phaseId ?? "";
    if (!scopes.has(key)) scopes.set(key, await resolveWorkItemArtifactScope(workspaceRoot, {
      intakeId, routeDecisionId: binding.identity.routeDecisionId, planId: binding.identity.planId,
      ...(binding.structure.topology === "direct" ? { kind: "routed-direct-plan" as const } : { kind: "routed-phase" as const, phaseId: item.phaseId! }),
    }));
  }
  if ([...scopes.values()].some((scope) => scope.planDigest !== binding.planDigest)) throw Error("Plan changed while resolving execution scope.");
  const prefix = `planning/work-intake/execution/${intakeId}/`;
  const documents = listPlanningDocuments(workspaceRoot).filter((document) => document.markdownPath.startsWith(prefix));
  const blockers: string[] = [];
  const workItems: WorkItemExecutionEvidence[] = [];
  for (const document of documents.filter((entry) => entry.markdownPath !== binding.relativePath)) {
    try {
      const identity = document.metadata.canonical?.identity;
      if (!identity || document.documentReadState !== "readable") throw Error("Unreadable execution artifact.");
      const ref = workItemArtifactScopeFromIdentity(identity);
      const candidate = binding.structure.workItems.find((item) => item.workItemId === identity.workCardId);
      if (!candidate || ref.kind === "legacy-phase" || ref.planId !== binding.identity.planId || ref.routeDecisionId !== binding.identity.routeDecisionId ||
        !isDeepStrictEqual(ref, scopes.get(candidate.phaseId ?? "")!.reference)) throw Error("Execution artifact has incompatible Work Item lineage.");
      if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state !== "fresh") throw Error("Execution artifact is stale.");
    } catch (error) { blockers.push(`${document.markdownPath}: ${(error as Error).message}`); }
  }
  const entries = binding.structure.workItems.map((candidate) => {
    const scope = scopes.get(candidate.phaseId ?? "")!;
    const targets = workItemIntakeTargets(scope, { candidateId: candidate.workItemId, title: candidate.title });
    const owned = documents.filter((document) => document.metadata.canonical?.identity.workCardId === candidate.workItemId);
    const handoffs = owned.filter((document) => document.metadata.artifactType === "work-card-intake-handoff");
    const formals = owned.filter((document) => document.metadata.artifactType === "formal-work-card");
    if (handoffs.length > 1 || formals.length > 1 || handoffs.some((d) => d.markdownPath !== targets.handoffMarkdownPath) || formals.some((d) => d.markdownPath !== targets.formalWorkCardMarkdownPath)) blockers.push(`Conflicting artifacts for ${candidate.workItemId}.`);
    const handoff = handoffs[0], formal = formals[0];
    const handoffSources = [{ path: binding.planPath, revision: binding.planRevision }, { path: binding.relativePath, revision: binding.artifactRevision }];
    if (handoff && (!isDeepStrictEqual(handoff.metadata.sourceRevisions, handoffSources) ||
      !isDeepStrictEqual(handoff.metadata.canonical?.workflowData.candidate, { ...candidate, candidateId: candidate.workItemId }) ||
      handoff.metadata.canonical?.workflowData.formalWorkCardTarget !== targets.formalWorkCardMarkdownPath)) blockers.push(`Work Card handoff ${candidate.workItemId} conflicts with its approved Plan.`);
    if (formal && !handoff) blockers.push(`Formal Work Card ${candidate.workItemId} is missing its intake handoff.`);
    if (formal && handoff && (!isDeepStrictEqual(formal.metadata.sourceRevisions, [...handoffSources, { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 }]) ||
      formal.metadata.canonical?.identity.candidateId !== candidate.workItemId || formal.metadata.canonical?.participationRole !== "gatingReview")) blockers.push(`Formal Work Card ${candidate.workItemId} has incompatible source evidence.`);
    if (handoff && handoff.effectiveDisposition !== "Approved") blockers.push(`Work Card handoff ${candidate.workItemId} is not Approved.`);
    if (formal?.effectiveDisposition === "Rejected") blockers.push(`Formal Work Card ${candidate.workItemId} was rejected; return to its approved Plan.`);
    let reportReady = false;
    if (formal?.effectiveDisposition === "Approved") {
      try {
        const review = getWorkCardBuildingReviewProjection(workspaceRoot, scope, candidate.workItemId);
        reportReady = review.reportReadiness === "ready-for-review";
        if (["invalid", "conflict"].includes(review.reportReadiness)) blockers.push(review.reportReadinessReason);
      } catch (error) { blockers.push((error as Error).message); }
    }
    if (owned.length) workItems.push({ workItemId: candidate.workItemId, planRevision: binding.planRevision, fresh: true, blockers: [], criteria: [],
      evidencePaths: owned.map((document) => document.markdownPath), stage: developmentLifecycleStage({ formalApproved: formal?.effectiveDisposition === "Approved", reportReady, validation: "incomplete" }) });
    return { candidate, scope, targets, handoff, formal };
  });
  // Same-revision edits also invalidate presented action evidence.
  const evidenceFingerprint = createHash("sha256").update(documents.map((document) => {
    const resolved = resolveRepositoryPath(workspaceRoot, document.markdownPath);
    if (resolved.relativePath !== document.markdownPath || fs.statSync(resolved.resolvedPath).size > 1_000_000) throw Error("Execution artifact must be bounded Markdown within its exact repository target.");
    return `${document.markdownPath}\n${fs.readFileSync(resolved.resolvedPath, "utf8")}`;
  }).join("\n")).digest("hex");
  const input: PlanExecutionInput & { evidenceFingerprint: string } = { planId: binding.identity.planId, planRevision: binding.planRevision,
    approved: true, fresh: true, structure: binding.structure, blockers, workItems, phases: [], evidenceFingerprint };
  return { binding, entries, input, projection: projectPlanExecution(input) };
}

/** Every action re-resolves current Plan, branch, scope and artifact evidence before writing. */
export function createRoutedDevelopmentExecutionService(workspaceRoot: string, intakeId: string) {
  const lockKey = `${path.resolve(workspaceRoot).toLowerCase()}\0${intakeId}`;
  async function action<T>(request: RoutedWorkItemRequest, run: (state: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>, entry: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>["entries"][number]) => T): Promise<T> {
    if (actionsInProgress.has(lockKey)) throw Error("A routed Work Item action is already in progress.");
    actionsInProgress.add(lockKey);
    try {
      const state = await loadRoutedDevelopmentExecution(workspaceRoot, intakeId);
      if (state.projection.fingerprint !== request.expectedFingerprint) throw Error("Presented Plan execution evidence changed; refresh before acting.");
      const selected = state.projection.workItems.find((item) => item.candidate.workItemId === request.workItemId);
      if (!selected?.eligible || state.projection.nextWorkItemId !== request.workItemId) throw Error("Requested Work Item is not the current eligible Work Item.");
      return run(state, state.entries.find((entry) => entry.candidate.workItemId === request.workItemId)!);
    } finally { actionsInProgress.delete(lockKey); }
  }
  function formalContext(state: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>, entry: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>["entries"][number]): FormalWorkCardContext {
    if (!entry.handoff) throw Error("Begin routed Work Card Intake before Formal Work Card planning.");
    // The shared handoff writer validates idempotent reuse without rewriting evidence.
    generateRoutedWorkCardIntakeHandoff(workspaceRoot, state.binding, entry.scope, entry.candidate);
    const report = resolveWorkCardImplementerReportContext(workspaceRoot, { scope: entry.scope, workCardId: entry.candidate.workItemId,
      formalWorkCardPath: entry.targets.formalWorkCardMarkdownPath, formalWorkCardRevision: entry.formal?.metadata.artifactRevision ?? 1, workCardTitle: entry.candidate.title });
    const mcp = resolveMcpWorkspaceBindingForPrompt(workspaceRoot, entry.handoff.metadata.canonical?.workflowData ?? {});
    return { handoff: entry.handoff, scope: entry.scope, phaseId: entry.candidate.phaseId, workCardId: entry.candidate.workItemId, candidateId: entry.candidate.workItemId,
      candidate: { ...entry.candidate, candidateId: entry.candidate.workItemId }, targetPath: entry.targets.formalWorkCardMarkdownPath, implementerReportPath: report.implementerReportPath,
      selectedWorkspaceTarget: { mcpWorkspaceId: mcp.workspaceId, workspaceLabel: mcp.label, handoffPath: entry.handoff.markdownPath,
        formalWorkCardTargetPath: entry.targets.formalWorkCardMarkdownPath, implementerReportTargetPath: report.implementerReportPath },
      sourceRevisions: [...(entry.handoff.metadata.sourceRevisions ?? []), { path: entry.handoff.markdownPath, revision: entry.handoff.metadata.artifactRevision ?? 1 }], existing: entry.formal };
  }
  function draft(state: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>, entry: Awaited<ReturnType<typeof loadRoutedDevelopmentExecution>>["entries"][number], prepare: boolean) {
    const owner = `routed-work-card-planning-${intakeId}`;
    const registry = createArchitectOutputRegistry([createFormalWorkCardArchitectOutputDefinition(() => formalContext(state, entry), owner)]);
    return prepare ? prepareArchitectOutputRuntimeSubmission(workspaceRoot, "formal-work-card", owner, registry) : getArchitectOutputRuntimeStatus(workspaceRoot, "formal-work-card", owner, registry);
  }
  return {
    async query() { return (await loadRoutedDevelopmentExecution(workspaceRoot, intakeId)).projection; },
    begin(request: RoutedWorkItemRequest) { return action(request, (state, entry) => generateRoutedWorkCardIntakeHandoff(workspaceRoot, state.binding, entry.scope, entry.candidate)); },
    prepare(request: RoutedWorkItemRequest) { return action(request, (state, entry) => draft(state, entry, true)); },
    getDraft(request: RoutedWorkItemRequest) { return action(request, (state, entry) => draft(state, entry, false)); },
    reviewFormal(request: RoutedWorkItemRequest & { expectedRevision: number; disposition: DocumentDispositionStatus; notes?: string }) {
      return action(request, (_state, entry) => {
        if (!entry.formal || entry.formal.metadata.artifactRevision !== request.expectedRevision || !["Approved", "RevisionRequested", "Rejected"].includes(request.disposition)) throw Error("Current Formal Work Card review revision and disposition are required.");
        if (request.disposition === "Approved") approveFormalWorkCardAndRegisterReport({ workspaceRoot, formalWorkCardPath: entry.formal.markdownPath, scope: entry.scope, notes: request.notes });
        else updateCanonicalMarkdownDisposition({ workspaceRoot, relativePath: entry.formal.markdownPath, status: request.disposition, notes: request.notes ?? "", reviewedAt: new Date().toISOString() });
      });
    },
    buildingReview(request: RoutedWorkItemRequest) { return action(request, (_state, entry) => getWorkCardBuildingReviewProjection(workspaceRoot, entry.scope, entry.candidate.workItemId)); },
    reviewReport(request: RoutedWorkItemRequest & { expectedRevision: number; disposition: DocumentDispositionStatus; notes?: string }) {
      return action(request, (_state, entry) => {
        const report: PlanningDocumentSummary = requireReadyImplementerReportForReview(workspaceRoot, entry.scope, entry.candidate.workItemId);
        if (report.metadata.artifactRevision !== request.expectedRevision || !["Approved", "RevisionRequested", "Rejected"].includes(request.disposition)) throw Error("Current Implementer Report review revision and disposition are required.");
        return setImplementerReportDisposition(workspaceRoot, entry.scope, entry.candidate.workItemId, request.disposition, request.notes);
      });
    },
  };
}
