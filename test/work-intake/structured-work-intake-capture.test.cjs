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

test("structured Work Intake capture persists without creating source state", async context => {
  const { root, projectId, head } = await fixture(context);
  fs.writeFileSync(path.join(root, "tracked.txt"), "dirty\n");
  assert.equal(selectedStructuredProjectId(root), projectId);
  const saved = await captureStructuredWorkIntake(root, projectId, submission(projectId, "dev", head));
  assert.equal(saved.source.state, "unprepared", JSON.stringify(saved.source));
  assert.equal(saved.workRequest, "Keep entered work");
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty\n");
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await store.listEntities(projectId, "SourceBinding")).length, 0);
    assert.deepEqual(git(root, "branch", "--list", "champcity/work/*"), "");
  } finally { store.close(); }
  const projection = await getStructuredWorkIntakeProjection(root, projectId);
  assert.equal(projection.blockedReason, null);
  assert.equal(projection.currentCapturedIntake.intakeId, saved.intakeId);
  assert.equal(projection.currentCapturedIntake.source.state, "unprepared");
});

test("retry before target Workflow handoff remains unprepared and does not mutate provider state", async context => {
  const { root, projectId, head } = await fixture(context);
  const saved = await captureStructuredWorkIntake(root, projectId, submission(projectId));
  const before = git(root, "branch", "--list");
  const retried = await retryStructuredWorkIntakeSource(root, projectId, saved.intakeId);
  assert.equal(retried.source.state, "unprepared");
  assert.equal(git(root, "branch", "--list"), before);
  let projection = await getStructuredWorkIntakeProjection(root, projectId);
  assert.equal(projection.currentCapturedIntake.workRequest, "Keep entered work");
  assert.equal(projection.currentCapturedIntake.source.state, "unprepared");
  projection = await getStructuredWorkIntakeProjection(root, projectId);
  assert.equal(projection.currentCapturedIntake.source.state, "unprepared");
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

test("multiple Work Intakes do not create source branches", async context => {
  const { root, projectId, head } = await fixture(context);
  fs.writeFileSync(path.join(root, "tracked.txt"), "dirty primary\n");
  const first = await captureStructuredWorkIntake(root, projectId, submission(projectId, "unrelated-target", head));
  assert.equal(first.source.state, "unprepared");
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty primary\n");
  const second = await captureStructuredWorkIntake(root, projectId, submission(projectId, "another-target", head));
  assert.equal(second.source.state, "unprepared");
  const branches = git(root, "branch", "--list");
  assert.equal((branches.match(/champcity\/work\//g) ?? []).length, 0);
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(git(root, "rev-parse", "HEAD"), head);
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty primary\n");
});

test("legacy branch collisions are irrelevant to Work Intake capture", async context => {
  const { root, projectId, head } = await fixture(context);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let intakeId;
  try {
    const state = createProjectStateService(store, operator);
    const intake = await state.createWorkIntake(projectId, { request: "Collision", desiredOutcome: "Inspect", constraints: [],
      evidenceContext: [], requestedIntegrationTarget: "dev" });
    intakeId = intake.intake.id;
  } finally { store.close(); }
  const blocked = await retryStructuredWorkIntakeSource(root, projectId, intakeId);
  assert.equal(blocked.source.state, "unprepared");
  assert.equal(git(root, "branch", "--show-current"), "dev");
});
