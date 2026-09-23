const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const principal = { principalId: "operator", principalType: "human", role: "Operator" };
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
function commit(root, name) {
  fs.writeFileSync(path.join(root, `${name}.txt`), `${name}\n`);
  git(root, "add", `${name}.txt`);
  git(root, "commit", "-m", name);
  return git(root, "rev-parse", "HEAD");
}

async function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-graph-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "-b", "main");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "config", "user.name", "Synthetic Test");
  const base = commit(root, "base");
  git(root, "switch", "-c", "dev");
  commit(root, "dev-base");
  git(root, "switch", "-c", "feature/work-1");
  const feature = commit(root, "feature");
  git(root, "switch", "dev");
  const devBefore = commit(root, "dev-concurrent");
  git(root, "merge", "--no-ff", "-m", "merge feature", "feature/work-1");
  const devMerge = git(root, "rev-parse", "HEAD");
  git(root, "switch", "main");
  git(root, "switch", "-c", "hotfix/one");
  const hotfixOne = commit(root, "hotfix-one");
  git(root, "switch", "main");
  commit(root, "main-concurrent");
  git(root, "merge", "--no-ff", "-m", "merge hotfix one", "hotfix/one");
  const mainMerge = git(root, "rev-parse", "HEAD");
  git(root, "switch", "-c", "hotfix/two");
  const hotfixTwo = commit(root, "hotfix-two");
  git(root, "switch", "dev");
  return { root, base, feature, devBefore, devMerge, hotfixOne, mainMerge, hotfixTwo };
}

test("read-only source graph preserves five branch heads, merge parents, semantic bindings and explicit bounds", async context => {
  const { root, base, feature, devBefore, devMerge, hotfixOne, mainMerge, hotfixTwo } = await fixture(context);
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let intakeId;
  try {
    const state = createProjectStateService(store, principal);
    const project = await state.createRecord(null, "Project", { name: "Synthetic", description: "Source graph" });
    await store.transaction(project.id, unit => unit.advanceProviderGeneration({ projectId: project.id, generation: 1,
      authority: "structured", updatedAt: new Date().toISOString() }, null));
    const { intake } = await state.createWorkIntake(project.id, { request: "Implement graph feature", desiredOutcome: "Delivered",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    intakeId = intake.id;
    const binding = await state.createSourceBinding(project.id, intake.id, { repositoryId: "repo-graph", integrationTargetSourceLineId: "dev" });
    await state.updateSourceBinding(project.id, binding.id, { preparationState: "preparing", baseRevisionId: base }, 1);
    await state.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "feature/work-1",
      currentRevisionId: feature }, 2);
    const assessment = await state.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [],
      rationale: "Feature", evidenceIds: [] });
    await state.recordRouteDecision(project.id, intake.id, { route: "feature-change", assessmentId: assessment.id });
    await state.createSourceCheckpoint(project.id, binding.id, intake.id, { boundaryId: "feature-checkpoint",
      expectedRevisionId: feature, checkpointKind: "implementation", checkpointState: "committed", resultingRevisionId: feature });
    const integration = await state.createIntegrationRecord(project.id, binding.id, { targetBeforeRevisionId: devBefore });
    await state.advanceIntegrationRecord(project.id, integration.id, { integrationState: "validating" }, 1);
    await state.advanceIntegrationRecord(project.id, integration.id, { integrationState: "ready" }, 2);
    await state.advanceIntegrationRecord(project.id, integration.id, { integrationState: "integrated", outcome: "integrated",
      targetAfterRevisionId: devMerge, resultRevisionId: devMerge }, 3);
  } finally { store.close(); }

  const before = git(root, "status", "--porcelain");
  const source = createSourceControlService({ repositoryId: "repo-graph", repositoryRoot: root });
  const response = await source.getSourceGraph({ maxRevisions: 50 });
  assert.equal(response.ok, true, JSON.stringify(response));
  assert.equal(response.receipt.operation, "source-graph");
  const graph = response.result;
  assert.deepEqual(graph.sourceLines.map(line => line.providerBranchName),
    ["dev", "feature/work-1", "hotfix/one", "hotfix/two", "main"]);
  assert.equal(new Set(graph.sourceLines.map(line => line.id)).size, 5);
  assert.ok(graph.sourceLines.every(line => line.id !== line.providerBranchName));
  assert.equal(graph.integrationTargets.length, 2);
  assert.deepEqual(graph.revisions.find(row => row.id === devMerge).parents, [devBefore, feature]);
  assert.ok(graph.revisions.find(row => row.id === mainMerge).parents.includes(hotfixOne));
  assert.ok(graph.revisions.some(row => row.id === hotfixTwo));
  const featureLine = graph.sourceLines.find(line => line.providerBranchName === "feature/work-1");
  assert.deepEqual(featureLine.workIntakeIds, [intakeId]);
  const work = graph.workBindings.find(row => row.workIntakeId === intakeId);
  assert.equal(work.lineId, featureLine.id);
  assert.equal(work.title, "Implement graph feature");
  assert.equal(work.route, "feature-change");
  assert.equal(work.integrationState, "integrated");
  assert.equal(work.baseRevisionId, base);
  assert.equal(work.currentRevisionId, feature);
  assert.deepEqual(work.checkpointKinds, ["implementation"]);
  assert.deepEqual(graph.revisions.find(row => row.id === feature).checkpointKinds, ["implementation"]);
  assert.deepEqual(graph.revisions.find(row => row.id === devMerge).integrationStates, ["integrated"]);
  assert.equal(graph.providerDiagnostics.metadata, "available");
  assert.equal(graph.truncation.revisionsTruncated, false);
  assert.equal(git(root, "status", "--porcelain"), before);
  assert.equal(git(root, "branch", "--show-current"), "dev");

  const bounded = await source.getSourceGraph({ maxRevisions: 2, maxLines: 3 });
  assert.equal(bounded.ok, true);
  assert.equal(bounded.result.revisions.length, 2);
  assert.equal(bounded.result.sourceLines.length, 3);
  assert.equal(bounded.result.truncation.revisionsTruncated, true);
  assert.equal(bounded.result.truncation.linesTruncated, true);
  assert.ok(bounded.result.truncation.omittedParentLinks >= 0);
  const invalid = await source.getSourceGraph({ maxRevisions: 501 });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "INVALID_INPUT");
});

test("missing workflow metadata leaves mechanical topology valid", async context => {
  const { root, devMerge } = await fixture(context);
  const response = await createSourceControlService({ repositoryId: "repo-graph", repositoryRoot: root }).getSourceGraph();
  assert.equal(response.ok, true, JSON.stringify(response));
  assert.equal(response.result.providerDiagnostics.metadata, "missing");
  assert.deepEqual(response.result.workBindings, []);
  assert.ok(response.result.revisions.some(row => row.id === devMerge && row.parents.length === 2));
});

test("revision detail returns a bounded changed-file summary without mutating the source", async context => {
  const { root, feature } = await fixture(context);
  const source = createSourceControlService({ repositoryId: "repo-graph", repositoryRoot: root });
  const before = git(root, "status", "--porcelain");
  const detail = await source.getSourceGraphRevisionDetail(feature);
  assert.equal(detail.ok, true, JSON.stringify(detail));
  assert.equal(detail.receipt.operation, "source-graph-revision-detail");
  assert.equal(detail.result.revisionId, feature);
  assert.deepEqual(detail.result.changedFiles, [{ path: "feature.txt", status: "A" }]);
  assert.equal(detail.result.totalChangedFiles, 1);
  assert.equal(detail.result.changedFilesTruncated, false);
  for (let index = 0; index < 26; index++) fs.writeFileSync(path.join(root, `bulk-${index}.txt`), `${index}\n`);
  git(root, "add", "--all");
  git(root, "commit", "-m", "bounded detail");
  const bulk = await source.getSourceGraphRevisionDetail(git(root, "rev-parse", "HEAD"));
  assert.equal(bulk.ok, true, JSON.stringify(bulk));
  assert.equal(bulk.result.totalChangedFiles, 26);
  assert.equal(bulk.result.changedFiles.length, 24);
  assert.equal(bulk.result.changedFilesTruncated, true);
  const invalid = await source.getSourceGraphRevisionDetail("HEAD");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "INVALID_INPUT");
  assert.equal(git(root, "status", "--porcelain"), before);
  assert.equal(git(root, "branch", "--show-current"), "dev");
});
