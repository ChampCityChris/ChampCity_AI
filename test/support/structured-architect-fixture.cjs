const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const {registerCurrentProject} = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const {createSQLiteProjectStateStore} = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const {createProjectStateService} = require("../../dist/shared/projectState/projectStateService.js");
const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
const {createStructuredArchitectWorkspaceService} = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js");
const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
const {GREENFIELD_ARCHITECT_SECTIONS} = require("../../dist/shared/architectWorkspaceContracts.js");
async function structuredArchitectFixture(context, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-architect-"));
  const registration = await registerCurrentProject(root, "existing", {projectName: "Structured Architect fixture"});
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  context.after(() => {store.close(); fs.rmSync(root, {recursive: true, force: true});});
  const projectId = registration.project.id, operator = {principalId: "fixture-operator", principalType: "human", role: "Operator"};
  const state = createProjectStateService(store, operator);
  const {workflow} = await state.createProjectCreationWorkflow(projectId, {title: "Structured Greenfield"});
  const intakeService = createWorkflowIntakeService(), architect = createStructuredArchitectWorkspaceService();
  const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS["project-creation"].fields.filter(field => field.required).map(field => [field.key, field.key === "hasExistingSourceOrPlanning" ? false : field.key === "projectRepository" ? root : field.key === "projectType" ? "Desktop application" : `${field.key} fixture`]));
  const intake = await intakeService.saveProjectCreationIntake(root, workflow.id, values);
  await intakeService.reviewWorkflowIntake(root, workflow.id, {expectedIntakeRecordVersion: intake.recordVersion, outcome: "approved"});
  const prepared = await architect.prepare(root, workflow.id);
  const output = Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key => [key, [`${key} substantive direction`]]));
  const input = {intakeId: intake.intakeId, intakeVersion: intake.recordVersion, output};
  const candidate = options.save === false ? null : await architect.save(root, workflow.id, input);
  return {root, projectId, store, state, workflow, intake, intakeService, architect, input, prepared, candidate, output};
}
module.exports = {structuredArchitectFixture};
