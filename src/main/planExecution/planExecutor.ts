import { createHash } from "node:crypto";
import type { ExecutionBoundaryEvidence, PlanExecutionHooks, PlanExecutionInput, PlanExecutionProjection, WorkItemExecutionAction, WorkItemExecutionProjection, WorkItemExecutionStage } from "../../shared/planExecutionContracts";
import { validateWorkPlanStructure } from "../workPlanning/workPlanStructure";

const actions: Record<WorkItemExecutionStage, WorkItemExecutionAction[]> = {
  ready: ["implement"], implement: ["review"], "review-validate": ["review", "validate", "repair"],
  repair: ["repair", "implement", "review"], close: ["close"], complete: [],
};
const texts = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every((item) => typeof item === "string" && !!item.trim() && item.length <= 4000);
/** Shared dependency query also supports real Phases before their detailed Work Items exist. */
export function projectExecutionDependencies(nodes: readonly { id: string; dependsOn: readonly string[] }[], completedIds: readonly string[]) {
  const completed = new Set(completedIds);
  return nodes.map((node) => ({ id: node.id, complete: completed.has(node.id), waitingOn: node.dependsOn.filter((id) => !completed.has(id)),
    eligible: !completed.has(node.id) && node.dependsOn.every((id) => completed.has(id)) }));
}
function validateEvidence(evidence: ExecutionBoundaryEvidence, criteria: string[]) {
  if (!evidence || !Number.isSafeInteger(evidence.planRevision) || evidence.planRevision < 1 || typeof evidence.fresh !== "boolean" || !texts(evidence.blockers) || !texts(evidence.evidencePaths) || !Array.isArray(evidence.criteria) || evidence.criteria.length > criteria.length ||
    evidence.criteria.some((entry) => !entry || !criteria.includes(entry.criterion) || !["pending", "passed", "failed"].includes(entry.status) || !texts(entry.evidencePaths)) ||
    new Set(evidence.criteria.map((entry) => entry.criterion)).size !== evidence.criteria.length) throw Error("Execution evidence is malformed or does not match declared acceptance criteria.");
}

/** Pure progression: adapters own lifecycle evidence/actions, never topology decisions. */
export function projectPlanExecution(input: PlanExecutionInput): PlanExecutionProjection {
  const structure = validateWorkPlanStructure(input.structure);
  if (!input.planId || !Number.isSafeInteger(input.planRevision) || input.planRevision < 1 || typeof input.approved !== "boolean" || typeof input.fresh !== "boolean" || !texts(input.blockers) || !Array.isArray(input.workItems) || !Array.isArray(input.phases)) throw Error("Execution requires a bounded Plan identity, revision and evidence collections.");
  const candidates = new Map(structure.workItems.map((item) => [item.workItemId, item]));
  const phases = new Map(structure.topology === "phased" ? structure.phases.map((phase) => [phase.phaseId, phase]) : []);
  const itemsById = new Map(input.workItems.map((item) => [item.workItemId, item]));
  const phasesById = new Map(input.phases.map((phase) => [phase.phaseId, phase]));
  if (itemsById.size !== input.workItems.length || phasesById.size !== input.phases.length) throw Error("Execution evidence identities conflict.");
  for (const item of input.workItems) {
    if (!candidates.has(item.workItemId) || !Object.hasOwn(actions, item.stage)) throw Error("Execution evidence references an unknown or superseded Work Item/stage.");
    validateEvidence(item, candidates.get(item.workItemId)!.acceptanceCriteria);
  }
  for (const phase of input.phases) {
    if (!phases.has(phase.phaseId)) throw Error("Execution evidence references an unknown Phase; direct Plans have none.");
    validateEvidence(phase, phases.get(phase.phaseId)!.acceptanceCriteria);
  }
  if (input.planEvidence) validateEvidence(input.planEvidence, structure.acceptanceCriteria);
  const current = (evidence?: ExecutionBoundaryEvidence) => input.approved && input.fresh && !!evidence && evidence.fresh && evidence.planRevision === input.planRevision;
  const satisfied = (criteria: string[], evidence?: ExecutionBoundaryEvidence) => current(evidence) && !evidence!.blockers.length && !!evidence!.evidencePaths.length && criteria.every((criterion) => evidence!.criteria.some((entry) => entry.criterion === criterion && entry.status === "passed" && entry.evidencePaths.length > 0));
  const blockers = [...input.blockers, ...(!input.approved ? ["Plan is not approved."] : []), ...(!input.fresh ? ["Plan sources are stale."] : []), ...(input.planEvidence?.blockers ?? [])];
  const activeIds = input.workItems.filter((item) => !["ready", "complete"].includes(item.stage)).map((item) => item.workItemId);
  if (activeIds.length > 1) blockers.push("Multiple active Work Items conflict; resolve adapter evidence before progressing.");
  const itemCompletion = new Map<string, boolean>(); const phaseCompletion = new Map<string, boolean>();
  const completeItem = (id: string): boolean => {
    if (itemCompletion.has(id)) return itemCompletion.get(id)!;
    const item = candidates.get(id)!; const evidence = itemsById.get(id);
    const complete = evidence?.stage === "complete" && satisfied(item.acceptanceCriteria, evidence) && item.dependsOn.every(completeItem) && (!item.phaseId || phases.get(item.phaseId)!.dependsOn.every(completePhase));
    itemCompletion.set(id, complete); return complete;
  };
  const completePhase = (id: string): boolean => {
    if (phaseCompletion.has(id)) return phaseCompletion.get(id)!;
    const phase = phases.get(id)!;
    const complete = satisfied(phase.acceptanceCriteria, phasesById.get(id)) && phase.dependsOn.every(completePhase) && structure.workItems.filter((item) => item.phaseId === id).every((item) => completeItem(item.workItemId));
    phaseCompletion.set(id, complete); return complete;
  };
  const phaseProjections = [...phases.values()].map((phase) => {
    const evidence = phasesById.get(phase.phaseId);
    const reasons = [...blockers, ...(evidence?.blockers ?? [])];
    if (evidence && !current(evidence)) reasons.push("Phase evidence is stale.");
    if (!phase.dependsOn.every(completePhase)) reasons.push("Phase prerequisites are incomplete.");
    return { phaseId: phase.phaseId, eligible: reasons.length === 0, workItemsComplete: structure.workItems.filter((item) => item.phaseId === phase.phaseId).every((item) => completeItem(item.workItemId)),
      criteriaSatisfied: satisfied(phase.acceptanceCriteria, evidence), complete: blockers.length === 0 && completePhase(phase.phaseId), reasons };
  });
  const dependencyProjection = projectExecutionDependencies(structure.workItems.map((item) => ({ id: item.workItemId, dependsOn: item.dependsOn })), structure.workItems.filter((item) => completeItem(item.workItemId)).map((item) => item.workItemId));
  const workItems: WorkItemExecutionProjection[] = structure.workItems.map((candidate) => {
    const evidence = itemsById.get(candidate.workItemId); const stage = evidence?.stage ?? "ready";
    const complete = completeItem(candidate.workItemId);
    const reasons = [...blockers, ...(evidence?.blockers ?? [])];
    if (evidence && !current(evidence)) reasons.push("Work Item evidence is stale.");
    if (dependencyProjection.find((item) => item.id === candidate.workItemId)!.waitingOn.length) reasons.push("Work Item prerequisites are incomplete.");
    const phase = phaseProjections.find((entry) => entry.phaseId === candidate.phaseId);
    if (phase && !phase.eligible) reasons.push(...phase.reasons);
    if (stage === "complete" && !complete) reasons.push("Completion requires current accepted criteria, dependencies and durable close evidence.");
    if (activeIds.length && !activeIds.includes(candidate.workItemId) && !complete) reasons.push("Another Work Item is active.");
    const eligible = !complete && !reasons.length;
    return { candidate, stage, complete, eligible, status: complete ? "complete" : reasons.length ? "blocked" : stage === "ready" ? "ready" : "active",
      reasons: [...new Set(reasons)], evidencePaths: evidence?.evidencePaths ?? [], availableActions: eligible ? [...actions[stage]] : [] };
  });
  const workItemsComplete = workItems.every((item) => item.complete);
  const phasesComplete = phaseProjections.every((phase) => phase.complete);
  const criteriaSatisfied = satisfied(structure.acceptanceCriteria, input.planEvidence);
  const complete = !blockers.length && workItemsComplete && phasesComplete && criteriaSatisfied;
  return { planId: input.planId, planRevision: input.planRevision, topology: structure.topology, fingerprint: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
    status: complete ? "complete" : blockers.length ? "blocked" : workItems.some((item) => item.status === "active") ? "active" : workItems.some((item) => item.status === "ready") ? "ready" : workItemsComplete && !phaseProjections.some((phase) => phase.reasons.length) ? "awaiting-criteria" : "blocked",
    complete, workItemsComplete, phasesComplete, criteriaSatisfied, blockers, workItems, phases: phaseProjections,
    nextWorkItemId: workItems.find((item) => item.status === "active")?.candidate.workItemId ?? workItems.find((item) => item.status === "ready")?.candidate.workItemId };
}

/** No callers migrate here: Development/Issue adapters supply these hooks later. */
export function createPlanExecutor(hooks: PlanExecutionHooks) {
  let running = false;
  return {
    async query() { return projectPlanExecution(await hooks.load()); },
    async perform(input: { workItemId: string; action: WorkItemExecutionAction; expectedFingerprint: string }) {
      if (running) throw Error("A Plan execution action is already in progress.");
      running = true;
      try {
        const state = await hooks.load(); const projection = projectPlanExecution(state);
        if (projection.fingerprint !== input.expectedFingerprint) throw Error("Presented Plan execution evidence changed; refresh before acting.");
        const workItem = projection.workItems.find((item) => item.candidate.workItemId === input.workItemId);
        if (!workItem?.availableActions.includes(input.action)) throw Error("Work Item action is not eligible at the current lifecycle boundary.");
        const action = hooks.actions?.[input.action];
        if (!action) throw Error("This lifecycle action has no execution adapter.");
        await action({ input: state, projection, workItem });
        return projectPlanExecution(await hooks.load());
      } finally { running = false; }
    },
  };
}
