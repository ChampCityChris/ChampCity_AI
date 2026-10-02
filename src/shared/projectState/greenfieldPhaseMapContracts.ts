import type {WorkflowPlanningGraph} from "./projectStateService";
export interface GreenfieldPhaseEntry {phaseId: string; title: string; order: number; purpose: string; dependsOn: string[]; sourceReferences: string[]; criteria?: WorkflowPlanningGraph["solutionCriteria"]}
export interface GreenfieldPhaseMapCandidate {workflowId: string; phases: GreenfieldPhaseEntry[]; sources: {entityId: string; recordVersion: number}[]; expectedRecordVersion?: number}
export function validateGreenfieldPhases(phases: GreenfieldPhaseEntry[]): void {
  if (!Array.isArray(phases) || !phases.length || phases.length > 32) throw Error("Bounded nonempty Phase Map required.");
  const byKey = new Map(phases.map(phase => [phase.phaseId, phase]));
  if (byKey.size !== phases.length || new Set(phases.map(phase => phase.order)).size !== phases.length) throw Error("Unique Phase identities and order required.");
  for (const phase of phases) {
    if (Object.keys(phase).some(key => !["phaseId", "title", "order", "purpose", "dependsOn", "sourceReferences", "criteria"].includes(key)) || !/^[A-Za-z0-9_-]{1,64}$/.test(phase.phaseId) || !Number.isSafeInteger(phase.order) || phase.order < 1 || !Array.isArray(phase.dependsOn) || phase.dependsOn.length > 32 || new Set(phase.dependsOn).size !== phase.dependsOn.length || !Array.isArray(phase.sourceReferences) || phase.sourceReferences.length > 64 || phase.sourceReferences.some(ref => typeof ref !== "string" || !ref || ref.length > 512 || ref.startsWith("/") || ref.includes("\\") || ref.includes(":") || ref.split("/").some(part => !part || part === "." || part === ".."))) throw Error("Invalid Phase semantics or source references.");
    for (const dependency of phase.dependsOn) if (!byKey.has(dependency) || byKey.get(dependency)!.order >= phase.order) throw Error("Phase dependency is missing, cyclic or contradicts order.");
  }
}
