const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectWorkflowStateFacade } = require("../../dist/main/projectState/projectWorkflowStateFacade.js");
const { writeCanonicalMarkdownDocument, writeCanonicalMarkdownDocumentOnce,
  replaceCanonicalMarkdownBodyPreservingMetadata } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-project-workflow-"));
  const app = path.join(root, ".champcity");
  fs.mkdirSync(app);
  const store = createSQLiteProjectStateStore(path.join(app, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, store, facade: createProjectWorkflowStateFacade(store, operator) };
}

test("Project, Architect Planning and Work Intake execute from Structured Project State without Markdown", async context => {
  const { root, store, facade } = fixture(context);
  const { project, repository } = await facade.createProject({ name: "Synthetic", purpose: "Build a product",
    repository: { provider: "git", repositoryId: "repository-1", locator: "repo://synthetic" } });
  const projectRead = await facade.getProject(project.id);
  assert.equal(projectRead.project.body.name, "Synthetic");
  assert.equal(projectRead.resources[0].id, repository.id);
  const planning = await facade.recordArchitectPlanning(project.id, { findings: [{ title: "Need", statement: "Current state needs work",
    category: "capability", impact: "Users cannot finish" }], rootCauses: [{ title: "Cause", statement: "No workflow", rationale: "Observed", findingIndex: 0 }],
    solutions: [{ title: "Solution", objective: "Create workflow", scopeIn: ["Project workflow"], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed", rootCauseIndex: 0 }] });
  assert.equal(planning.findings.length, 1);
  const beforeInvalid = (await store.listEntities(project.id)).length;
  await assert.rejects(facade.recordArchitectPlanning(project.id, { findings: [{ title: "Uncommitted", statement: "Invalid association",
    category: "capability", impact: "None" }], rootCauses: [{ title: "Invalid", statement: "Invalid association", rationale: "None", findingIndex: 2 }],
    solutions: [] }), /unknown Finding or Root Cause/);
  assert.equal((await store.listEntities(project.id)).length, beforeInvalid);
  assert.equal((await facade.getArchitectPlanning(project.id)).solutions.length, 1);
  const plan = await facade.createProjectPlan(project.id, { workflowType: "project-creation", phases: [{ title: "Phase 1",
    objective: "Implement", workItems: [{ workItemKind: "feature", title: "Work", objective: "Deliver" }] }] });
  assert.equal(plan.phases.length, 1);
  assert.equal(plan.workflow.body.workflowType, "project-creation");
  assert.equal(plan.workflow.body.title, "Project Creation / Greenfield");
  assert.equal(plan.workflow.body.currentWorkspace, "project-planning");
  await assert.rejects(facade.createProjectPlan(project.id, { workflowType: "project-creation", phases: [{ title: "Phase 2",
    objective: "Implement", workItems: [{ workItemKind: "feature", title: "More work", objective: "Deliver" }] }] }), /non-repeatable project-creation Workflow/);
  assert.equal((await facade.getProjectPlan(project.id)).phases.length > 0, true);
  const intake = await facade.captureWorkIntake(project.id, { request: "New capability", desiredOutcome: "Done", constraints: [],
    evidenceContext: [], requestedIntegrationTarget: "dev" });
  const assessment = await facade.assessWorkIntakeRoute(project.id, intake.id, { recommendation: "feature-change", traits: [],
    rationale: "Existing source", evidenceIds: [] });
  await facade.selectWorkIntakeRoute(project.id, intake.id, { route: "feature-change", assessmentId: assessment.id, rationale: "Proceed" });
  const intakeRead = await facade.getWorkIntake(project.id, intake.id);
  assert.equal(intakeRead.summary.intakeState, "routed");
  assert.equal(intakeRead.route.route, "feature-change");
  assert.equal(intakeRead.projection.metadata.authoritative, false);
  assert.equal((await facade.getProjectView(project.id)).workIntakes.length, 1);
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
  assert.equal((await store.listEntities(project.id)).length > 6, true);
});

test("legacy canonical writer remains compatible before cutover and is fenced by durable structured authority", async context => {
  const { root, store, facade } = fixture(context);
  const { project } = await facade.createProject({ name: "Synthetic", purpose: "Build", repository: {
    provider: "git", repositoryId: "repository-1", locator: "repo://synthetic" } });
  const relativePath = "planning/project/PROJECT.md";
  const input = { workspaceRoot: root, relativePath, bodyMarkdown: "# Legacy Project\n",
    metadata: { schemaVersion: 1, artifactType: "project-profile", artifactRevision: 1, participationRole: "contextOnly",
      identity: { projectId: "legacy-project" }, sourceRevisions: [], workflowData: {},
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null } } };
  writeCanonicalMarkdownDocument(input);
  const before = fs.readFileSync(path.join(root, relativePath), "utf8");
  await store.transaction(project.id, async unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 1,
    authority: "legacy", updatedAt: "2026-09-20T12:00:00.000Z" }, null));
  writeCanonicalMarkdownDocument({ ...input, bodyMarkdown: "# Still Legacy\n" });
  await store.transaction(project.id, async unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 2,
    authority: "structured", updatedAt: "2026-09-20T12:01:00.000Z" }, 1));
  const current = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.notEqual(current, before);
  assert.throws(() => writeCanonicalMarkdownDocument(input), /fenced after Structured Project State authority selection/);
  assert.throws(() => writeCanonicalMarkdownDocumentOnce({ ...input, relativePath: "planning/project/NEW.md" }),
    /fenced after Structured Project State authority selection/);
  assert.throws(() => replaceCanonicalMarkdownBodyPreservingMetadata({ workspaceRoot: root, relativePath,
    metadataEnvelope: current.slice(0, current.indexOf("\n\n")), expectedMetadata: input.metadata, bodyMarkdown: "# Replacement" }),
    /fenced after Structured Project State authority selection/);
  assert.equal(fs.readFileSync(path.join(root, relativePath), "utf8"), current);
});
