type PlanningWorkflow = { workflowType: string; lifecycleState: string; currentWorkspace: string };
export function workflowPlanningSurface(workflow: PlanningWorkflow | null | undefined): "feature" | "issue" | "execution" | "generic" {
  if (!workflow || workflow.lifecycleState !== "active") return "generic";
  if (workflow.workflowType === "feature-capability") return ["feature-intake", "feature-assessment", "feature-planning"].includes(workflow.currentWorkspace) ? "feature" : "execution";
  if (workflow.workflowType === "issue-resolution") return ["issue-intake", "issue-rca", "issue-planning"].includes(workflow.currentWorkspace) ? "issue" : "execution";
  return "generic";
}
export function shouldShowClosedWorkIntakeSummary(workflow: PlanningWorkflow | null | undefined): boolean {
  return workflow?.workflowType === "work-intake-routing" && workflow.lifecycleState === "closed";
}
