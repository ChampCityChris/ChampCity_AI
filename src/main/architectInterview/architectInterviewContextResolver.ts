export async function resolveStructuredArchitectInterviewIntake(workspaceRoot: string) {
  const { selectedCurrentProjectId } = await import("../projectState/currentProjectRegistrationService");
  const { createSQLiteProjectStateStore } = await import("../projectState/sqliteProjectStateStore");
  const { createWorkflowIntakeService } = await import("../workflow/workflowIntakeService");
  const path = await import("node:path");
  const projectId = selectedCurrentProjectId(workspaceRoot);
  if (!projectId) throw Error("Selected Project is not registered.");
  const store = createSQLiteProjectStateStore(path.join(workspaceRoot, ".champcity", "project-state.sqlite"));
  let workflowId: string;
  try {
    const workflows = (await store.listEntities(projectId, "Workflow")).filter(r => r.entityType === "Workflow" && r.lifecycleState === "active" && r.body.workflowState === "active" && r.body.workflowType === "project-creation");
    if (workflows.length !== 1) throw Error("Exact current Project Creation Workflow is ambiguous or unavailable.");
    workflowId = workflows[0].id;
  } finally { store.close(); }
  const intake = await createWorkflowIntakeService().ensureWorkflowIntake(workspaceRoot, workflowId);
  if (intake.workflowType !== "project-creation" || !intake.values) throw Error("Save Project Intake before Architect preparation.");
  if (intake.disposition?.state !== "approved") throw Error("Current structured Project Intake must be approved before Architect preparation.");
  const {buildRepositoryBindingFromProjectIntake} = await import("../documents/repositoryBinding");
  const {readExplicitMcpWorkspaceBinding} = await import("../integrations/mcpWorkspacePromptContract");
  const binding = readExplicitMcpWorkspaceBinding(workspaceRoot);
  const repositoryBinding = buildRepositoryBindingFromProjectIntake({projectRepository: workspaceRoot, mcpWorkspaceBinding: binding ? {mcpWorkspaceId: binding.workspaceId, label: binding.label, repositoryName: binding.repositoryName, branch: binding.branch, gitBacked: binding.gitBacked} : null});
  return {...intake, workflowId, repositoryBinding};
}
