const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { captureStructuredWorkIntake } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { selectStructuredWorkRoute } = require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }

test("WIR is source-not-applicable and routed target Workflows own their source records", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-wir-source-neutral-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "Synthetic Test");
  fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
  git(root, "add", "README.md");
  git(root, "commit", "-m", "baseline");
  git(root, "branch", "dev");
  const current = await registerCurrentProject(root, "existing", { projectName: "Source neutral routing", sourceRepositoryId: "source-neutral-repo" });
  const projectId = current.project.id;
  const baseRevisionId = git(root, "rev-parse", "dev");
  const submissions = ["Feature", "Hotfix"];
  const intakes = [];

  for (const [index, title] of submissions.entries()) {
    const captured = await captureStructuredWorkIntake(root, projectId, {
      projectId, projectName: "Source neutral routing", workRequest: title, desiredOutcome: `${title} handled`,
      knownConstraints: "Preserve source", repositoryReviewContext: "Synthetic proof", hasExistingSourceOrPlanning: true,
      baseBranch: "dev", baseCommit: baseRevisionId,
    });
    assert.deepEqual(captured.source, { state: "not-applicable", workIntakeId: captured.intakeId });
    intakes.push(captured);

    const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
    try {
      const state = createProjectStateService(store, operator);
      const assessment = await state.recordRouteAssessment(projectId, captured.intakeId,
        { recommendation: index === 0 ? "feature-change" : "issue-resolution", traits: [], rationale: title, evidenceIds: [] });
      const selected = await selectStructuredWorkRoute(root, projectId, captured.intakeId,
        { route: assessment.body.recommendation, assessmentId: assessment.id, rationale: `Select ${title}` });
      assert.equal(selected.checkpoint.state, "not-required");
      const summary = await state.getWorkIntakeSummary(projectId, captured.intakeId);
      const routingWorkflow = await store.getEntity(projectId, summary.routingWorkflowId);
      assert.equal(routingWorkflow.body.workflowType, "work-intake-routing");
      const target = await state.createWorkflow(projectId, { workflowType: index === 0 ? "feature-capability" : "issue-resolution",
        title: `${title} target`, currentWorkspace: index === 0 ? "development" : "issue" });
      await state.linkWorkflowRouteTarget(projectId, routingWorkflow.id, target.id);
      const baseline = await state.createWorkflowSourceBaseline(projectId, target.id, { repositoryId: "source-neutral-repo",
        integrationTargetSourceLineId: "dev", baseRevisionId });
      const binding = await state.createWorkflowSourceBinding(projectId, target.id, baseline.id);
      assert.equal(baseline.body.workflowId, target.id);
      assert.equal(binding.body.workflowId, target.id);
      assert.equal(binding.body.preparationState, "unprepared");
    } finally { store.close(); }
  }

  const verify = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const workflows = (await verify.listEntities(projectId, "Workflow")).filter(row => row.entityType === "Workflow");
    const routingIds = new Set(workflows.filter(row => row.body.workflowType === "work-intake-routing").map(row => row.id));
    const baselines = (await verify.listEntities(projectId, "SourceBaseline")).filter(row => row.entityType === "SourceBaseline");
    const bindings = (await verify.listEntities(projectId, "SourceBinding")).filter(row => row.entityType === "SourceBinding");
    assert.equal(intakes.length, 2);
    assert.equal(baselines.length, 2);
    assert.equal(bindings.length, 2);
    assert.ok(baselines.every(row => !routingIds.has(row.body.workflowId)));
    assert.ok(bindings.every(row => !routingIds.has(row.body.workflowId)));
  } finally { verify.close(); }
});
