const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { captureStructuredWorkIntake, getStructuredWorkIntakeProjection, retryStructuredWorkIntakeSource,
  selectedStructuredProjectId } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { workIntakeBranchName } = require("../../dist/main/sourceControl/workSourceNaming.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
async function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-capture-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "-b", "dev");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "Synthetic Test");
  fs.writeFileSync(path.join(root, "tracked.txt"), "baseline\n");
  git(root, "add", "tracked.txt");
  git(root, "commit", "-m", "baseline");
  const head = git(root, "rev-parse", "HEAD");
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const project = await state.createRecord(null, "Project", { name: "Synthetic", description: "Capture test" });
  await state.createRecord(project.id, "ProjectResource", { resourceType: "source-repository", provider: "git",
    logicalName: "repository-1", locator: "selected-repository", role: "project-source" });
  await store.transaction(project.id, unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 1,
    authority: "structured", updatedAt: new Date().toISOString() }, null));
  store.close();
  return { root, projectId: project.id, head };
}
function submission(projectId, branch = "dev", commit = "") {
  return { projectId, projectName: "Synthetic", workRequest: "Keep entered work", desiredOutcome: "Saved first",
    knownConstraints: "No cleanup", repositoryReviewContext: "Review context", hasExistingSourceOrPlanning: true,
    baseBranch: branch, baseCommit: commit };
}

test("dirty primary checkout does not block structured Work Intake capture or source creation", async context => {
  const { root, projectId, head } = await fixture(context);
  fs.writeFileSync(path.join(root, "tracked.txt"), "dirty\n");
  assert.equal(selectedStructuredProjectId(root), projectId);
  const saved = await captureStructuredWorkIntake(root, projectId, submission(projectId, "dev", head));
  assert.equal(saved.source.state, "ready", JSON.stringify(saved.source));
  assert.equal(saved.workRequest, "Keep entered work");
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty\n");
  assert.equal(git(root, "rev-parse", saved.source.binding.sourceLine.sourceLineId), head);
  const projection = await getStructuredWorkIntakeProjection(root, projectId);
  assert.equal(projection.blockedReason, null);
  assert.equal(projection.currentCapturedIntake.intakeId, saved.intakeId);
  assert.equal(projection.currentCapturedIntake.source.state, "ready");
});

test("failed source preparation preserves saved Intake and reload/retry restores source state", async context => {
  const { root, projectId, head } = await fixture(context);
  git(root, "branch", "main", head);
  git(root, "switch", "main");
  git(root, "branch", "-D", "dev");
  const saved = await captureStructuredWorkIntake(root, projectId, submission(projectId, "missing-target"));
  assert.equal(saved.source.state, "blocked");
  assert.equal(saved.source.inspectionRequired, false);
  let projection = await getStructuredWorkIntakeProjection(root, projectId);
  assert.equal(projection.currentCapturedIntake.workRequest, "Keep entered work");
  assert.equal(projection.currentCapturedIntake.source.state, "blocked");
  git(root, "branch", "dev", head);
  const ready = await retryStructuredWorkIntakeSource(root, projectId, saved.intakeId);
  assert.equal(ready.source.state, "ready", JSON.stringify(ready.source));
  projection = await getStructuredWorkIntakeProjection(root, projectId);
  assert.equal(projection.currentCapturedIntake.source.state, "ready");
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const intake = await store.getEntity(projectId, saved.intakeId);
    assert.equal(intake.body.hasExistingSourceOrPlanning, true);
    assert.equal(intake.body.constraints[0], "No cleanup");
    assert.equal((await store.listEntities(projectId, "WorkIntake")).length, 1);
  } finally { store.close(); }
});

test("renderer Save eligibility depends on form validity and busy state", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/renderer/app/WorkIntakeWorkspace.tsx"), "utf8");
  assert.match(source, /disabled=\{busy \|\| !formValid\}/);
  assert.doesNotMatch(source, /disabled=\{busy \|\| !!projection\.blockedReason\}/);
  assert.match(source, /projection\.currentCapturedIntake \?\? null/);
});

test("two Work Intake source lines use exact successive dev revisions without changing dirty primary checkout", async context => {
  const { root, projectId, head } = await fixture(context);
  fs.writeFileSync(path.join(root, "tracked.txt"), "dirty primary\n");
  const first = await captureStructuredWorkIntake(root, projectId, submission(projectId, "unrelated-target", head));
  assert.equal(first.source.state, "ready", JSON.stringify(first.source));
  assert.equal(first.source.binding.baseRevision.revisionId, head);
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty primary\n");
  fs.writeFileSync(path.join(root, "tracked.txt"), "second baseline\n");
  git(root, "add", "tracked.txt");
  git(root, "commit", "-m", "second baseline");
  const secondHead = git(root, "rev-parse", "dev");
  fs.writeFileSync(path.join(root, "tracked.txt"), "new dirty primary\n");
  const second = await captureStructuredWorkIntake(root, projectId, submission(projectId, "another-target", head));
  assert.equal(second.source.state, "ready", JSON.stringify(second.source));
  assert.equal(second.source.binding.baseRevision.revisionId, secondHead);
  assert.equal(second.source.binding.sourceLine.headRevisionId, secondHead);
  assert.notEqual(first.source.binding.sourceLine.sourceLineId, second.source.binding.sourceLine.sourceLineId);
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(git(root, "rev-parse", "HEAD"), secondHead);
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "new dirty primary\n");
});

test("pre-existing deterministic branch is blocked as an inspectable collision", async context => {
  const { root, projectId, head } = await fixture(context);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let intakeId;
  try {
    const state = createProjectStateService(store, operator);
    const intake = await state.createWorkIntake(projectId, { request: "Collision", desiredOutcome: "Inspect", constraints: [],
      evidenceContext: [], requestedIntegrationTarget: "dev" });
    intakeId = intake.intake.id;
    await state.createSourceBinding(projectId, intakeId, { repositoryId: "repository-1", integrationTargetSourceLineId: "dev" });
  } finally { store.close(); }
  git(root, "branch", workIntakeBranchName(intakeId), head);
  const blocked = await retryStructuredWorkIntakeSource(root, projectId, intakeId);
  assert.equal(blocked.source.state, "blocked");
  assert.equal(blocked.source.code, "BRANCH_COLLISION");
  assert.equal(blocked.source.inspectionRequired, true);
  const repeated = await retryStructuredWorkIntakeSource(root, projectId, intakeId);
  assert.equal(repeated.source.code, "BRANCH_COLLISION");
  assert.equal(git(root, "branch", "--show-current"), "dev");
});
