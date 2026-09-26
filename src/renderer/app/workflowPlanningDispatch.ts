type PlanningWorkflow = { workflowType: string; lifecycleState: string; currentWorkspace: string };
export function workflowPlanningSurface(workflow: PlanningWorkflow | null | undefined): "feature" | "issue" | "generic" {
  if (!workflow || workflow.lifecycleState !== "active") return "generic";
  if (workflow.workflowType === "feature-capability" && ["feature-intake", "feature-assessment", "feature-planning", "work-item-map"].includes(workflow.currentWorkspace)) return "feature";
  if (workflow.workflowType === "issue-resolution" && ["issue-intake", "issue-rca", "issue-planning", "work-item-map"].includes(workflow.currentWorkspace)) return "issue";
  return "generic";
}
export function shouldShowClosedWorkIntakeSummary(workflow: PlanningWorkflow | null | undefined): boolean {
  return workflow?.workflowType === "work-intake-routing" && workflow.lifecycleState === "closed";
}
