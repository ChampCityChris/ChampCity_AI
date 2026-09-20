import type { PlanExecutionProjection, WorkItemExecutionEvidence, WorkItemExecutionStage } from "../../shared/planExecutionContracts";
import type { WorkCardCandidate } from "../phasePlanning/phasePlanningService";
import type { PlanningProjectionContext } from "../documents/planningProjectionContext";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { resolveEffectiveWorkCardCompletion } from "../workCardLoop/effectiveWorkCardCompletion";
import { resolveWorkCardCloseReturnConsumption } from "../workCardLoop/workCardCloseReturnLifecycle";
import { projectPlanExecution, projectExecutionDependencies } from "./planExecutor";

/** Interpret established artifact semantics; the executor owns progression. */
export function developmentLifecycleStage(input: { formalApproved: boolean; reportReady: boolean; validation: "incomplete" | "awaiting-validation" | "revision-requested" | "approved"; closeConsumed?: boolean }): WorkItemExecutionStage {
  if (!input.formalApproved || !input.reportReady) return "implement";
  if (input.validation === "revision-requested") return "repair";
  if (input.validation === "approved") return input.closeConsumed ? "complete" : "close";
  return "review-validate";
}

export function projectDevelopmentWorkItems(
  workspaceRoot: string, phaseId: string, candidates: WorkCardCandidate[], context?: PlanningProjectionContext,
  active?: { status: "none" | "active" | "conflict"; workCardId?: string; evidencePaths: string[]; reason: string },
): PlanExecutionProjection | undefined {
  const source = context ?? workspaceRoot;
  const plan = listPlanningDocuments(source).filter((document) => document.markdownPath.startsWith(`planning/phases/${phaseId}/Work_Card_Plan`)).at(-1);
  if (!plan) throw Error("Development execution requires a Work Card Plan.");
  const planned = candidates.filter((candidate) => candidate.resolutionStatus === "planned").sort((left, right) => left.order - right.order);
  if (!planned.length) return undefined; // Existing explicit resolutions are not implementation Work Items.
  const revision = plan.metadata.artifactRevision ?? 1;
  const workItems = planned.map((candidate) => ({ workItemId: candidate.candidateId, title: candidate.title, purpose: candidate.purpose,
    dependsOn: candidate.dependsOn.filter((id) => { const dependency = candidates.find((entry) => entry.candidateId === id); return !dependency || dependency.resolutionStatus === "planned"; }),
    acceptanceCriteria: [`Current effective approved validation for ${candidate.candidateId}`] }));
  const evidence: WorkItemExecutionEvidence[] = [];
  for (const candidate of workItems) {
    const completion = resolveEffectiveWorkCardCompletion(workspaceRoot, phaseId, candidate.workItemId, context);
    if (!completion.complete) {
      if (active?.status === "active" && active.workCardId === candidate.workItemId) evidence.push({ workItemId: candidate.workItemId, planRevision: revision, fresh: true,
        stage: completion.state === "revision-requested" ? "repair" : completion.state === "awaiting-validation" ? "review-validate" : "implement", blockers: [], evidencePaths: active.evidencePaths, criteria: [] });
      continue;
    }
    const consumed = resolveWorkCardCloseReturnConsumption(workspaceRoot, completion, context).consumed;
    // Existing exact active/close-return selection retains the current Close boundary;
    // older approved completions cannot outrank a later current Work Card.
    const closePending = !consumed && active?.status === "active" && active.workCardId === candidate.workItemId;
    evidence.push({ workItemId: candidate.workItemId, planRevision: revision, fresh: true, stage: closePending ? "close" : "complete", blockers: [],
      evidencePaths: completion.sourceEvidence, criteria: candidate.acceptanceCriteria.map((criterion) => ({ criterion, status: "passed", evidencePaths: completion.sourceEvidence })) });
  }
  return projectPlanExecution({ planId: plan.logicalDocumentId, planRevision: revision, approved: plan.effectiveDisposition === "Approved",
    fresh: evaluateDocumentFreshness(source, plan.logicalDocumentId).state === "fresh", blockers: active?.status === "conflict" ? [active.reason] : [],
    structure: { topology: "direct", topologyRationale: "Existing ordered Work Card Plan within its owning scope", acceptanceCriteria: ["Owning scope acceptance"], workItems },
    workItems: evidence, phases: [] });
}

/** Phase Maps precede detailed planning: retain real Phase identities without inventing child Work Items. */
export function projectDevelopmentPhases(phases: readonly { phaseId: string; order: number; dependsOn: string[] }[], completedPhaseIds: string[]) {
  return projectExecutionDependencies([...phases].sort((left, right) => left.order - right.order).map((phase) => ({ id: phase.phaseId, dependsOn: phase.dependsOn })), completedPhaseIds);
}
