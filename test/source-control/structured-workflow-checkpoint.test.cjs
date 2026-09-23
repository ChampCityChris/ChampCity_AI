const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { captureGreenfieldWorkIntake, getStructuredWorkIntakeProjection } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { selectStructuredWorkRoute, recordStructuredImplementation, recordStructuredWorkDisposition } =
  require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
test("structured route, implementation and revision review share one SourceLine with exact checkpoint projections", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-workflow-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const saved = await captureGreenfieldWorkIntake(root, { projectId: null, projectName: "Structured workflow",
    workRequest: "Implement feature", desiredOutcome: "Working feature", knownConstraints: "One source line",
    repositoryReviewContext: "Greenfield", hasExistingSourceOrPlanning: false, baseBranch: "", baseCommit: "" });
  assert.equal(saved.source.state, "ready");
  const line = saved.source.binding.sourceLine.sourceLineId;
  git(root, "switch", line);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const assessment = await state.recordRouteAssessment(saved.projectId, saved.intakeId,
    { recommendation: "feature-change", traits: [], rationale: "Feature route", evidenceIds: [] });
  const routeInput = { route: "feature-change", assessmentId: assessment.id, rationale: "Operator selects feature route" };
  const route = await selectStructuredWorkRoute(root, saved.projectId, saved.intakeId, routeInput);
  assert.equal(route.checkpoint.state, "committed", JSON.stringify(route.checkpoint));
  const routeHead = git(root, "rev-parse", "HEAD");
  const routeRetry = await selectStructuredWorkRoute(root, saved.projectId, saved.intakeId, routeInput);
  assert.equal(routeRetry.record.id, route.record.id);
  assert.equal(routeRetry.checkpoint.revision.revisionId, routeHead);
  assert.equal(git(root, "rev-parse", "HEAD"), routeHead);
  const summary = await state.getWorkIntakeSummary(saved.projectId, saved.intakeId);
  const work = await state.createRecord(saved.projectId, "WorkItem", {
    workItemKind: "feature", title: "Feature", objective: "Implement feature", workState: "implemented" });
  await state.createRelationship(saved.projectId, work.id, "part_of", summary.workflowId);
  store.close();
  fs.writeFileSync(path.join(root, "feature.txt"), "implemented\n");
  const implementationInput = { summary: "Feature implemented", deviations: [], blockers: [], residualRisks: [],
    outcome: "implemented", executionRef: "execution-1" };
  const implementation = await recordStructuredImplementation(root, saved.projectId, saved.intakeId, work.id,
    implementationInput, "implementation-1", ["feature.txt"]);
  assert.equal(implementation.checkpoint.state, "committed", JSON.stringify(implementation.checkpoint));
  const implementationHead = git(root, "rev-parse", "HEAD");
  assert.equal(implementation.checkpoint.revision.revisionId, implementationHead);
  const implementationRetry = await recordStructuredImplementation(root, saved.projectId, saved.intakeId, work.id,
    implementationInput, "implementation-1", ["feature.txt"]);
  assert.equal(implementationRetry.record.id, implementation.record.id);
  assert.equal(git(root, "rev-parse", "HEAD"), implementationHead);
  const revision = await recordStructuredWorkDisposition(root, saved.projectId, saved.intakeId, work.id,
    { decisionType: "review", outcome: "revision_requested", rationale: "Adjust behavior", decisionScope: "work-review-1" }, "review-1");
  assert.equal(revision.checkpoint.state, "committed", JSON.stringify(revision.checkpoint));
  const revisionHead = git(root, "rev-parse", "HEAD");
  assert.equal(git(root, "branch", "--show-current"), line);
  const projection = await getStructuredWorkIntakeProjection(root, saved.projectId);
  const checkpoints = projection.currentCapturedIntake.sourceCheckpoints;
  assert.deepEqual(checkpoints.map(item => item.state), ["committed", "committed", "committed"]);
  assert.equal(checkpoints.at(-1).revision.revisionId, revisionHead);
  assert.equal(projection.currentCapturedIntake.source.binding.sourceLine.sourceLineId, line);
});
