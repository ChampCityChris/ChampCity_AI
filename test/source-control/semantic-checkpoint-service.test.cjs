const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { captureGreenfieldWorkIntake } = require("../../dist/main/workIntake/structuredWorkIntakeService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createImplementationCheckpoint, createDispositionCheckpoint } = require("../../dist/main/sourceControl/semanticCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
async function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-checkpoint-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const saved = await captureGreenfieldWorkIntake(root, {
    projectId: null, projectName: "Checkpoint project", workRequest: "Implement feature", desiredOutcome: "Working feature",
    knownConstraints: "Keep source bounded", repositoryReviewContext: "New project", hasExistingSourceOrPlanning: false,
    baseBranch: "", baseCommit: "",
  });
  assert.equal(saved.source.state, "ready", JSON.stringify(saved.source));
  const line = saved.source.binding.sourceLine.sourceLineId;
  const head = saved.source.binding.sourceLine.headRevisionId;
  git(root, "switch", line);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const work = await state.createRecord(saved.projectId, "WorkItem", {
    workItemKind: "feature", title: "Feature", objective: "Implement", workState: "implemented",
  });
  const implementation = await state.recordImplementation(saved.projectId, work.id, {
    summary: "Implemented feature", deviations: [], blockers: [], residualRisks: [], outcome: "implemented",
  });
  const decision = await state.recordDecision(saved.projectId, work.id, {
    decisionType: "accept", outcome: "accepted", rationale: "Reviewed", decisionScope: "work-item",
  });
  store.close();
  return { root, projectId: saved.projectId, intakeId: saved.intakeId, line, head, workId: work.id,
    implementationId: implementation.id, decisionId: decision.id };
}
function implementation(f) {
  return { boundaryId: "implementation-1", workIntakeId: f.intakeId, targetEntityId: f.implementationId,
    sourceLineId: f.line, expectedRevisionId: f.head, attributablePaths: ["feature.txt"] };
}

test("implementation checkpoint commits attributed file and duplicate retry returns exact revision", async context => {
  const f = await fixture(context);
  fs.writeFileSync(path.join(f.root, "feature.txt"), "feature content\n");
  const first = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(first.state, "committed", JSON.stringify(first));
  assert.equal(first.revision.revisionId, git(f.root, "rev-parse", "HEAD"));
  assert.equal(git(f.root, "show", "--format=", "--name-only", "HEAD"), "feature.txt");
  const second = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(second.state, "committed", JSON.stringify(second));
  assert.equal(second.revision.revisionId, first.revision.revisionId);
  assert.equal(second.checkpointId, first.checkpointId);
  assert.equal(git(f.root, "rev-list", "--count", f.line), "2");
});

test("wrong source line and unrelated file block without staging or source mutation", async context => {
  const f = await fixture(context);
  fs.writeFileSync(path.join(f.root, "feature.txt"), "feature content\n");
  const wrong = await createImplementationCheckpoint(f.root, f.projectId, { ...implementation(f), sourceLineId: "dev" });
  assert.equal(wrong.state, "blocked");
  fs.writeFileSync(path.join(f.root, "unrelated.txt"), "other\n");
  const unrelated = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(unrelated.state, "blocked");
  assert.ok(unrelated.checkpointId);
  const store = createSQLiteProjectStateStore(path.join(f.root, ".champcity", "project-state.sqlite"));
  try { assert.equal((await store.getEntity(f.projectId, unrelated.checkpointId)).body.checkpointState, "blocked"); }
  finally { store.close(); }
  assert.equal(git(f.root, "rev-parse", "HEAD"), f.head);
  assert.equal(git(f.root, "diff", "--cached", "--name-only"), "");
  fs.rmSync(path.join(f.root, "unrelated.txt"));
  const retried = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(retried.state, "committed", JSON.stringify(retried));
  assert.equal(retried.checkpointId, unrelated.checkpointId);
});

test("operator disposition creates an evidenced empty lifecycle revision", async context => {
  const f = await fixture(context);
  const request = { boundaryId: "disposition-1", workIntakeId: f.intakeId, targetEntityId: f.workId,
    sourceLineId: f.line, expectedRevisionId: f.head, dispositionId: f.decisionId, attributablePaths: [] };
  const first = await createDispositionCheckpoint(f.root, f.projectId, request);
  assert.equal(first.state, "committed", JSON.stringify(first));
  assert.equal(git(f.root, "show", "--format=", "--name-only", "HEAD"), "");
  assert.equal((await createDispositionCheckpoint(f.root, f.projectId, request)).revision.revisionId, first.revision.revisionId);
  assert.equal(git(f.root, "rev-list", "--count", f.line), "2");
});

test("retry reconciles a committed source revision after a failed binding update", async context => {
  const f = await fixture(context);
  fs.writeFileSync(path.join(f.root, "feature.txt"), "feature content\n");
  const module = require("../../dist/shared/projectState/projectStateService.js");
  const original = module.createProjectStateService;
  let failOnce = true;
  module.createProjectStateService = (...args) => {
    const service = original(...args);
    return { ...service, updateSourceBinding: async (...updateArgs) => {
      if (failOnce) { failOnce = false; throw Error("Synthetic post-commit failure"); }
      return service.updateSourceBinding(...updateArgs);
    } };
  };
  let first;
  try { first = await createImplementationCheckpoint(f.root, f.projectId, implementation(f)); }
  finally { module.createProjectStateService = original; }
  assert.equal(first.state, "inspection-required", JSON.stringify(first));
  assert.ok(first.checkpointId);
  const committedHead = git(f.root, "rev-parse", "HEAD");
  assert.notEqual(committedHead, f.head);
  const recovered = await createImplementationCheckpoint(f.root, f.projectId, implementation(f));
  assert.equal(recovered.state, "committed", JSON.stringify(recovered));
  assert.equal(recovered.checkpointId, first.checkpointId);
  assert.equal(recovered.revision.revisionId, committedHead);
  assert.equal(git(f.root, "rev-list", "--count", f.line), "2");
});
