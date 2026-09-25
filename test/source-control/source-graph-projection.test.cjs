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
  git(root, "branch", `champcity-integration/${"a".repeat(64)}`, devMerge);
  git(root, "branch", "champcity-mcp/op-synthetic", devMerge);
  return { root, base, feature, devBefore, devMerge, hotfixOne, mainMerge, hotfixTwo };
}

test("read-only source graph preserves five branch heads, merge parents, semantic bindings and explicit bounds", async context => {
  const { root, base, feature, devBefore, devMerge, hotfixOne, mainMerge, hotfixTwo } = await fixture(context);
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let intakeId;
  let routingId;
  let workflowId;
  let sourceAnchorWorkflowId;
  let directWorkflowId;
  let completedWorkflowId;
  try {
    const state = createProjectStateService(store, principal);
    const project = await state.createRecord(null, "Project", { name: "Synthetic", description: "Source graph" });
    await state.createRecord(project.id, "ProjectResource", { resourceType: "source-repository", provider: "git", logicalName: "repo-graph", locator: "selected-project", role: "project-source" });
    const { intake } = await state.createWorkIntake(project.id, { request: "Implement graph feature", desiredOutcome: "Delivered",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    intakeId = intake.id;
    const routing = (await store.listEntities(project.id, "Workflow")).find(row => row.entityType === "Workflow" && row.body.workflowType === "work-intake-routing");
    routingId = routing.id;
    const workflow = await state.createWorkflow(project.id, { workflowType: "feature-capability", title: "Implement graph feature", currentWorkspace: "development" });
    workflowId = workflow.id;
    sourceAnchorWorkflowId = workflow.id;
    await state.linkWorkflowRouteTarget(project.id, routing.id, workflow.id);
    const baseline = await state.createWorkflowSourceBaseline(project.id, workflow.id, { repositoryId: "repo-graph", integrationTargetSourceLineId: "dev", baseRevisionId: base });
    const binding = await state.createWorkflowSourceBinding(project.id, workflow.id, baseline.id);
    await state.updateSourceBinding(project.id, binding.id, { preparationState: "preparing" }, 1);
    await state.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "feature/work-1",
      currentRevisionId: feature, repositoryCheckoutId: "workflow-checkout-fixture" }, 2);
    const work = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Graph feature", objective: "Implement", workState: "implemented" });
    await state.createRelationship(project.id, work.id, "part_of", workflow.id);
    const implementation = await state.recordImplementation(project.id, work.id, { summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
    await state.createSourceCheckpoint(project.id, binding.id, workflow.id, implementation.id, { boundaryId: "feature-checkpoint",
      expectedRevisionId: feature, checkpointKind: "implementation", checkpointState: "committed", resultingRevisionId: feature });
    const integration = await state.createIntegrationRecord(project.id, binding.id, workflow.id, { targetBeforeRevisionId: devBefore });
    await state.advanceIntegrationRecord(project.id, integration.id, { integrationState: "validating" }, 1);
    await state.advanceIntegrationRecord(project.id, integration.id, { integrationState: "ready" }, 2);
    await state.advanceIntegrationRecord(project.id, integration.id, { integrationState: "integrated", outcome: "integrated",
      targetAfterRevisionId: devMerge, resultRevisionId: devMerge }, 3);

    async function addDirectWorkflow(title, branch, revision, stateName = "active") {
      const created = await state.createWorkflow(project.id, { workflowType: "issue-resolution", title, currentWorkspace: "development" });
      const sourceBaseline = await state.createWorkflowSourceBaseline(project.id, created.id, { repositoryId: "repo-graph",
        integrationTargetSourceLineId: "dev", baseRevisionId: base });
      const sourceBinding = await state.createWorkflowSourceBinding(project.id, created.id, sourceBaseline.id);
      await state.updateSourceBinding(project.id, sourceBinding.id, { preparationState: "preparing" }, 1);
      await state.updateSourceBinding(project.id, sourceBinding.id, { preparationState: "ready", workSourceLineId: branch,
        currentRevisionId: revision, repositoryCheckoutId: `checkout-${branch}` }, 2);
      if (stateName === "closed") await state.reviseRecord(project.id, created.id, { workflowState: "closed" }, 1);
      return created.id;
    }
    directWorkflowId = await addDirectWorkflow("Direct hotfix one", "hotfix/one", hotfixOne);
    completedWorkflowId = await addDirectWorkflow("Completed hotfix two", "hotfix/two", hotfixTwo, "closed");

    const successor = await state.supersedeRecord(project.id, workflow.id, { ...workflow.body, title: "Current graph feature" }, 1);
    assert.equal(successor.successor.lineageId, workflow.lineageId);
    workflowId = successor.successor.id;
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
  assert.deepEqual(featureLine.workflowIds, [workflowId]);
  assert.ok(!featureLine.workflowIds.includes(sourceAnchorWorkflowId));
  const workflows = graph.workflowBindings;
  assert.deepEqual(new Set(workflows.map(row => row.workflowId)), new Set([workflowId, directWorkflowId, completedWorkflowId]));
  assert.equal(workflows.length, 3);
  assert.equal(new Set(workflows.map(row => row.lineId)).size, 3);
  const current = workflows.find(row => row.workflowId === workflowId);
  assert.equal(current.lineId, featureLine.id);
  assert.equal(current.sourceAnchorWorkflowId, sourceAnchorWorkflowId);
  assert.equal(current.title, "Current graph feature");
  assert.equal(current.workflowType, "feature-capability");
  assert.equal(current.integrationState, "integrated");
  assert.equal(current.baseRevisionId, base);
  assert.equal(current.currentRevisionId, feature);
  assert.deepEqual(current.checkpointKinds, ["implementation"]);
  assert.deepEqual(graph.sourceLines.find(line => line.providerBranchName === "hotfix/one").workflowIds, [directWorkflowId]);
  assert.deepEqual(graph.sourceLines.find(line => line.providerBranchName === "hotfix/two").workflowIds, [completedWorkflowId]);
  assert.deepEqual(graph.sourceLines.filter(line => ["main", "dev"].includes(line.role)).map(line => line.workflowIds), [[], []]);
  assert.equal(JSON.stringify(graph).includes(intakeId), false);
  assert.equal(JSON.stringify(graph).includes(routingId), false);
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
  assert.deepEqual(response.result.workflowBindings, []);
  assert.ok(response.result.sourceLines.every(line => line.workflowIds.length === 0));
  assert.ok(response.result.revisions.some(row => row.id === devMerge && row.parents.length === 2));
});

test("includeCompleted filters Workflow metadata while retaining provider topology", async context => {
  const { root } = await fixture(context);
  fs.mkdirSync(path.join(root, ".champcity"));
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let completedWorkflowId;
  try {
    const state = createProjectStateService(store, principal);
    const project = await state.createRecord(null, "Project", { name: "Synthetic", description: "Completion filter" });
    await state.createRecord(project.id, "ProjectResource", { resourceType: "source-repository", provider: "git", logicalName: "repo-graph", locator: "selected-project", role: "project-source" });
    const workflow = await state.createWorkflow(project.id, { workflowType: "issue-resolution", title: "Completed source", currentWorkspace: "development" });
    completedWorkflowId = workflow.id;
    const baseline = await state.createWorkflowSourceBaseline(project.id, workflow.id, { repositoryId: "repo-graph", integrationTargetSourceLineId: "dev", baseRevisionId: git(root, "rev-parse", "main") });
    const binding = await state.createWorkflowSourceBinding(project.id, workflow.id, baseline.id);
    await state.updateSourceBinding(project.id, binding.id, { preparationState: "preparing" }, 1);
    await state.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "hotfix/two",
      currentRevisionId: git(root, "rev-parse", "hotfix/two"), repositoryCheckoutId: "checkout-completed" }, 2);
    await state.reviseRecord(project.id, workflow.id, { workflowState: "cancelled" }, 1);
  } finally { store.close(); }
  const source = createSourceControlService({ repositoryId: "repo-graph", repositoryRoot: root });
  const normal = await source.getSourceGraph();
  const filtered = await source.getSourceGraph({ includeCompleted: false });
  assert.ok(normal.result.workflowBindings.some(row => row.workflowId === completedWorkflowId));
  assert.ok(!filtered.result.workflowBindings.some(row => row.workflowId === completedWorkflowId));
  assert.ok(filtered.result.sourceLines.some(row => row.providerBranchName === "hotfix/two"));
  assert.deepEqual(filtered.result.sourceLines.find(row => row.providerBranchName === "hotfix/two").workflowIds, []);
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
