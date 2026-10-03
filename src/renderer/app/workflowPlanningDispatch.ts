import { ARCHITECT_WORKSPACE_BY_WORKFLOW } from "../../shared/projectState/architectReviewContracts";
import { isIntakeWorkflowType } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY, isExactExecutionWorkflowType } from "../../shared/projectState/workflowTypeRegistry";
type PlanningWorkflow = { workflowType: string; lifecycleState: string; currentWorkspace: string };
export function workflowPlanningSurface(workflow: PlanningWorkflow | null | undefined): "intake" | "feature" | "issue" | "planning" | "execution" | "architect" | "generic" {
  if (!workflow || workflow.lifecycleState !== "active") return "generic";
  if (workflow.workflowType !== "project-creation" && isIntakeWorkflowType(workflow.workflowType) && workflow.currentWorkspace === WORKFLOW_TYPE_REGISTRY[workflow.workflowType].entryWorkspace) return "intake";
  if (workflow.workflowType === "feature-capability" && [ARCHITECT_WORKSPACE_BY_WORKFLOW[workflow.workflowType], "feature-planning"].includes(workflow.currentWorkspace)) return "feature";
  if (workflow.workflowType === "issue-resolution" && [ARCHITECT_WORKSPACE_BY_WORKFLOW[workflow.workflowType], "issue-planning"].includes(workflow.currentWorkspace)) return "issue";
  if (["refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype"].includes(workflow.workflowType)) {
    if (workflow.currentWorkspace === "planning") return "planning";
    if (workflow.currentWorkspace === ARCHITECT_WORKSPACE_BY_WORKFLOW[workflow.workflowType as keyof typeof ARCHITECT_WORKSPACE_BY_WORKFLOW]) return "architect";
  }
  if (isExactExecutionWorkflowType(workflow.workflowType) && ["work-item-map", "implementation", "execution-complete", "integration-ready", "validation"].includes(workflow.currentWorkspace)) return "execution";
  return "generic";
}
export function shouldShowClosedWorkIntakeSummary(workflow: PlanningWorkflow | null | undefined): boolean {
  return workflow?.workflowType === "work-intake-routing" && workflow.lifecycleState === "closed";
}
