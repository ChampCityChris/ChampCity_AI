const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { registerCurrentProject, selectedCurrentProjectId } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { captureStructuredWorkIntake, getStructuredWorkIntakeProjection } =
  require("../../dist/main/workIntake/structuredWorkIntakeService.js");

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
  const project = await registerCurrentProject(root, "existing", { projectName: "Synthetic", sourceRepositoryId: "synthetic-source" });
  return { root, projectId: project.project.id, head };
}
function submission(projectId) {
  return { projectId, projectName: "Synthetic", workRequest: "Keep entered work", desiredOutcome: "Saved first",
    knownConstraints: "No cleanup", repositoryReviewContext: "Review context", hasExistingSourceOrPlanning: true,
  };
}

test("structured Work Intake capture persists without creating source state", async context => {
  const { root, projectId, head } = await fixture(context);
  fs.writeFileSync(path.join(root, "tracked.txt"), "dirty\n");
  assert.equal(selectedCurrentProjectId(root), projectId);
  await assert.rejects(captureStructuredWorkIntake(root, projectId, { ...submission(projectId), baseBranch: "dev", baseCommit: "a".repeat(40) }), /Work Intake form is invalid/);
  const saved = await captureStructuredWorkIntake(root, projectId, submission(projectId));
  assert.equal(saved.source.state, "not-applicable", JSON.stringify(saved.source));
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
  assert.equal(projection.project.repositoryId, "synthetic-source");
  assert.deepEqual(projection.branches, undefined);
  assert.equal(projection.currentBranch, undefined);
  assert.equal(projection.suggestedBase, undefined);
  assert.equal(projection.currentCapturedIntake.intakeId, saved.intakeId);
  assert.equal(projection.currentCapturedIntake.source.state, "not-applicable");
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
  const first = await captureStructuredWorkIntake(root, projectId, submission(projectId));
  assert.equal(first.source.state, "not-applicable");
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty primary\n");
  const second = await captureStructuredWorkIntake(root, projectId, submission(projectId));
  assert.equal(second.source.state, "not-applicable");
  const branches = git(root, "branch", "--list");
  assert.equal((branches.match(/champcity\/work\//g) ?? []).length, 0);
  assert.equal(git(root, "branch", "--show-current"), "dev");
  assert.equal(git(root, "rev-parse", "HEAD"), head);
  assert.equal(fs.readFileSync(path.join(root, "tracked.txt"), "utf8"), "dirty primary\n");
});

test("non-source Current Project accepts Work Intake with no fabricated Repository or branch projection", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-capture-no-source-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = await registerCurrentProject(root, "existing", { projectName: "Synthetic" });
  const saved = await captureStructuredWorkIntake(root, project.project.id, submission(project.project.id));
  const projection = await getStructuredWorkIntakeProjection(root, project.project.id);
  assert.equal(saved.source.state, "not-applicable");
  assert.equal(projection.project.repositoryId, null);
  assert.equal(projection.branches, undefined);
  assert.equal(projection.currentBranch, undefined);
  assert.equal(projection.suggestedBase, undefined);
});

test("unavailable managed Dev leaves source-backed Work Intake projection valid and savable", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-capture-unavailable-dev-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = await registerCurrentProject(root, "existing", { projectName: "Synthetic", sourceRepositoryId: "synthetic-source" });
  const dev = path.join(root, "Dev");
  fs.mkdirSync(dev);
  const projection = await getStructuredWorkIntakeProjection(root, project.project.id);
  assert.equal(projection.blockedReason, null);
  assert.deepEqual(projection.project, { projectId: project.project.id, repositoryId: "synthetic-source", name: "Synthetic" });
  assert.equal(projection.branches, undefined);
  assert.equal(projection.currentBranch, undefined);
  assert.equal(projection.suggestedBase, undefined);
  const invalidCheckoutProjection = await getStructuredWorkIntakeProjection(root, project.project.id);
  assert.equal(invalidCheckoutProjection.blockedReason, null);
  assert.deepEqual(invalidCheckoutProjection.project, projection.project);
  assert.equal(invalidCheckoutProjection.branches, undefined);
  assert.equal(invalidCheckoutProjection.currentBranch, undefined);
  assert.equal(invalidCheckoutProjection.suggestedBase, undefined);
  const first = await captureStructuredWorkIntake(root, project.project.id, submission(project.project.id));
  const second = await captureStructuredWorkIntake(root, project.project.id, { ...submission(project.project.id), workRequest: "Save another request" });
  assert.equal(first.source.state, "not-applicable");
  assert.equal(second.source.state, "not-applicable");
  assert.notEqual(first.intakeId, second.intakeId);
  const after = await getStructuredWorkIntakeProjection(root, project.project.id);
  assert.equal(after.blockedReason, null);
  assert.equal(after.capturedIntakes.length, 2);
  assert.equal(after.capturedIntakes.every(item => item.source.state === "not-applicable"), true);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await store.listEntities(project.project.id, "SourceBinding")).length, 0);
    assert.equal((await store.listEntities(project.project.id, "SourceBaseline")).length, 0);
  } finally { store.close(); }
});
