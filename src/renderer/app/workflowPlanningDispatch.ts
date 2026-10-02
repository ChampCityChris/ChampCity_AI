import { isIntakeWorkflowType } from "../../shared/workflowIntakeContracts";
import { WORKFLOW_TYPE_REGISTRY, isExactExecutionWorkflowType } from "../../shared/projectState/workflowTypeRegistry";
type PlanningWorkflow = { workflowType: string; lifecycleState: string; currentWorkspace: string };
export function workflowPlanningSurface(workflow: PlanningWorkflow | null | undefined): "intake" | "feature" | "issue" | "planning" | "execution" | "architect" | "generic" {
  if (!workflow || workflow.lifecycleState !== "active") return "generic";
  if (workflow.workflowType !== "project-creation" && isIntakeWorkflowType(workflow.workflowType) && workflow.currentWorkspace === WORKFLOW_TYPE_REGISTRY[workflow.workflowType].entryWorkspace) return "intake";
  if (workflow.workflowType === "feature-capability") return ["feature-assessment", "feature-planning"].includes(workflow.currentWorkspace) ? "feature" : "execution";
  if (workflow.workflowType === "issue-resolution") return ["issue-rca", "issue-planning"].includes(workflow.currentWorkspace) ? "issue" : "execution";
  if (["refactor-migration", "integration-composition", "infrastructure-platform", "research-prototype"].includes(workflow.workflowType)) {
    if (workflow.currentWorkspace === "planning") return "planning";
    if (["refactor-assessment", "integration-assessment", "infrastructure-assessment", "research-assessment"].includes(workflow.currentWorkspace)) return "architect";
  }
  if (isExactExecutionWorkflowType(workflow.workflowType) && ["work-item-map", "implementation", "execution-complete", "integration-ready", "validation"].includes(workflow.currentWorkspace)) return "execution";
  return "generic";
}
export function shouldShowClosedWorkIntakeSummary(workflow: PlanningWorkflow | null | undefined): boolean {
  return workflow?.workflowType === "work-intake-routing" && workflow.lifecycleState === "closed";
}
