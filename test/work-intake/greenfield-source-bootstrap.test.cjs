const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { captureGreenfieldWorkIntake, getStructuredWorkIntakeProjection, isGreenfieldProjectRoot,
  retryStructuredWorkIntakeSource, selectedStructuredProjectId } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");

function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function root(context) {
  const selected = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-greenfield-"));
  context.after(() => fs.rmSync(selected, { recursive: true, force: true }));
  return selected;
}
function submission() {
  return { projectId: null, projectName: "New Product", workRequest: "Build first capability", desiredOutcome: "Working product",
    knownConstraints: "Keep source isolated", repositoryReviewContext: "No prior source", hasExistingSourceOrPlanning: false,
    baseBranch: "", baseCommit: "" };
}

test("semantic greenfield bootstrap creates deterministic managed Main/Dev with tracked ignore baseline", async context => {
  const selected = root(context);
  const registrationCalls = [];
  const source = createSourceControlService({ repositoryId: "repository-greenfield", repositoryRoot: selected,
    checkoutRegistration: { workspaceId: "project-workspace", registerRepositoryCheckout: async (_workspaceId, checkout) => {
      registrationCalls.push(checkout); return { ...checkout, availability: "available", validationError: null };
    } } });
  const first = await source.bootstrapProjectSource();
  assert.equal(first.ok, true, JSON.stringify(first));
  const initial = first.result.initialRevision.revisionId;
  assert.equal(first.result.stableLine.headRevisionId, initial);
  assert.equal(first.result.integrationTarget.headRevisionId, initial);
  assert.equal(fs.existsSync(path.join(selected, ".git")), false);
  const main = path.join(selected, "Main");
  const dev = path.join(selected, "Dev");
  assert.equal(git(main, "branch", "--show-current"), "main");
  assert.equal(git(dev, "branch", "--show-current"), "dev");
  assert.equal(git(main, "rev-parse", "HEAD"), initial);
  assert.equal(git(dev, "rev-parse", "HEAD"), initial);
  assert.equal(git(main, "ls-files"), ".gitignore");
  fs.mkdirSync(path.join(main, "node_modules"));
  fs.writeFileSync(path.join(main, "node_modules", "ignored.txt"), "ignored\n");
  fs.writeFileSync(path.join(main, "visible.txt"), "visible\n");
  assert.match(git(main, "status", "--short"), /visible\.txt/);
  assert.doesNotMatch(git(main, "status", "--short"), /node_modules/);
  assert.equal(git(main, "rev-list", "--parents", "-n", "1", initial).split(" ").length, 1);
  const recovered = await source.bootstrapProjectSource();
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  assert.equal(recovered.result.initialRevision.revisionId, initial);
  assert.equal(git(dev, "rev-parse", "HEAD"), initial);
  assert.equal(registrationCalls.length, 4);
  assert.deepEqual(registrationCalls.slice(0, 2).map(checkout => checkout.role), ["main", "dev"]);
  const another = root(context);
  const same = await createSourceControlService({ repositoryId: "repository-second", repositoryRoot: another }).bootstrapProjectSource();
  assert.equal(same.ok, true, JSON.stringify(same));
  assert.equal(same.result.initialRevision.revisionId, initial, "empty baseline commit metadata is deterministic");
});

test("greenfield Work Intake persists Project, bootstrap evidence and first work source", async context => {
  const selected = root(context);
  assert.equal(isGreenfieldProjectRoot(selected), true);
  const saved = await captureGreenfieldWorkIntake(selected, submission());
  assert.equal(saved.source.state, "ready", JSON.stringify(saved.source));
  const projectId = selectedStructuredProjectId(selected);
  assert.equal(saved.projectId, projectId);
  const initial = git(selected, "rev-parse", "main");
  assert.equal(git(selected, "rev-parse", "dev"), initial);
  assert.equal(git(selected, "rev-parse", saved.source.binding.sourceLine.sourceLineId), initial);
  assert.equal(saved.source.binding.baseRevision.revisionId, initial);
  assert.equal(git(selected, "branch", "--show-current"), "main");
  const projection = await getStructuredWorkIntakeProjection(selected, projectId);
  assert.equal(projection.currentCapturedIntake.intakeId, saved.intakeId);
  assert.equal(projection.currentCapturedIntake.source.state, "ready");
  const store = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
  try {
    assert.equal((await store.listEntities(projectId, "ProjectResource")).length, 1);
    assert.equal((await store.listEntities(projectId, "Evidence")).filter(item => item.body.evidenceType === "source-bootstrap").length, 1);
    assert.equal((await store.listEntities(projectId, "WorkIntake")).length, 1);
  } finally { store.close(); }
});

test("incompatible partial dev blocks saved Intake and retry succeeds after exact repair", async context => {
  const selected = root(context);
  const source = createSourceControlService({ repositoryId: "repository-greenfield", repositoryRoot: selected });
  const prepared = await source.bootstrapProjectSource();
  assert.equal(prepared.ok, true, JSON.stringify(prepared));
  const initial = prepared.result.initialRevision.revisionId;
  const next = git(selected, "-c", "user.name=Synthetic", "-c", "user.email=test@example.invalid", "commit-tree",
    `${initial}^{tree}`, "-p", initial, "-m", "incompatible dev");
  git(selected, "update-ref", "refs/heads/dev", next, initial);
  const saved = await captureGreenfieldWorkIntake(selected, submission());
  assert.equal(saved.source.state, "blocked");
  assert.equal(git(selected, "rev-parse", "dev"), next, "bootstrap never overwrites incompatible dev");
  git(selected, "update-ref", "refs/heads/dev", initial, next);
  const ready = await retryStructuredWorkIntakeSource(selected, saved.projectId, saved.intakeId);
  assert.equal(ready.source.state, "ready", JSON.stringify(ready.source));
  assert.equal(ready.source.binding.baseRevision.revisionId, initial);
});
