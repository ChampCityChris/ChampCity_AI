import { getWorkflowTypeDefinition } from "../../shared/projectState/workflowTypeRegistry";
import { ARCHITECT_WORKSPACE_BY_WORKFLOW } from "../../shared/projectState/architectReviewContracts";
import type { WorkflowStage } from "./WorkflowStageRail";

export type InspectedWorkflowStage = "intake" | "assessment" | "planning" | "topology" | "execution" | "validation" | "close";
type RailWorkflow = {workflowType: string; currentWorkspace: string; lifecycleState?: string};
export function canonicalWorkflowRailStage(workflow: RailWorkflow): InspectedWorkflowStage | null {
  const definition = getWorkflowTypeDefinition(workflow.workflowType);
  if (!definition?.directStart) return null;
  if (workflow.lifecycleState === "closed" || workflow.currentWorkspace === "research-close") return "close";
  if (workflow.currentWorkspace === definition.entryWorkspace) return "intake";
  if (workflow.currentWorkspace === ARCHITECT_WORKSPACE_BY_WORKFLOW[definition.workflowType]) return "assessment";
  const planning = definition.workflowType === "feature-capability" ? "feature-planning" : definition.workflowType === "issue-resolution" ? "issue-planning" : "planning";
  if (workflow.currentWorkspace === planning) return "planning";
  const later: Record<string, InspectedWorkflowStage> = {"work-item-map":"topology", "implementation":"execution", "validation":"validation", "execution-complete":"close", "integration-ready":"close"};
  return later[workflow.currentWorkspace] ?? null;
}
export function deriveWorkflowStageRailModel(workflow: RailWorkflow | null | undefined, inspectedStage?: InspectedWorkflowStage, onInspect?: (stage: InspectedWorkflowStage) => void): readonly WorkflowStage[] | null {
  if (!workflow) return null;
  const canonical = canonicalWorkflowRailStage(workflow);
  if (!canonical) return null;
  const issue = workflow.workflowType === "issue-resolution";
  const stages: [InspectedWorkflowStage,string][] = [["intake","Intake"],["assessment",issue ? "Root Cause Analysis" : "Architect Assessment"],["planning",issue ? "Correction Planning" : "Planning"],["topology","Work Item Map"],["execution","Execution"],["validation","Validation"],["close","Close"]];
  const current = stages.findIndex(([id]) => id === canonical);
  return stages.map(([id,label],index) => ({id,label,
    statusLabel: workflow.lifecycleState === "closed" ? (workflow.currentWorkspace === "research-close" && index > 1 && index < 6 ? "Not Required" : "Completed") : index < current ? "Completed" : index === current ? "Open" : "Not Ready",
    state: id === (inspectedStage ?? canonical) ? "exact" : "available",
    isRequired: id === canonical && workflow.lifecycleState !== "closed", enabled: true,
    onClick: () => onInspect?.(id),
  }));
}
export function workflowStageInspectionBlocker(stage: InspectedWorkflowStage, canonical: InspectedWorkflowStage): string {
  switch (stage) {
    case "assessment": return "Approve the current Intake before Architect Assessment / RCA work.";
    case "planning": return "Approve the current Architect Assessment / RCA revision before Planning.";
    case "topology": return "Approve the current Plan to accept its Work Item Map.";
    case "execution": return canonical === "topology" ? "Complete Work Item Map readiness and approve the required WorkItem planning contracts." : "An accepted Plan and Work Item Map are required before Execution.";
    case "validation": return "Complete the required Execution work and collect current validation evidence.";
    case "close": return "Pass the required Validation and integration / closure eligibility gates.";
    default: return "Return to the current required stage to continue work.";
  }
}
