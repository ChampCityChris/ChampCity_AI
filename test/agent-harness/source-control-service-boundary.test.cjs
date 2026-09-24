const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const repositoryRoot = path.resolve(__dirname, "../..");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const { createSourceControlService } = require("../../dist/main/sourceControl/sourceControlService.js");
const { workflowSourceLineName } = require("../../dist/main/sourceControl/workSourceNaming.js");
const {
  createWorkIntakeBranchService, workIntakeBranchName,
} = require("../../dist/main/workIntake/workIntakeBranchService.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const {
  approveFormalWorkCardAndRegisterReport,
  buildApprovedRepairWorkCardAndReportDocuments,
} = require("../../dist/main/workCardBuilding/workCardBuildingReviewService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  writeCanonicalMarkdownDocuments,
} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const {
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");
const {
  createBoundWorkspace,
  configureGitIdentity,
  registryFor,
  callGit,
  requireSuccess,
  commitAllFixtureState,
  git,
  gitLines,
  readCanonical,
  createTagDeletionFixture,
} = require("../support/git-mutation-fixtures.cjs");

test("application source control returns attributable receipts and preserves Git safety without MCP", async (t) => {
  const metrics = require("../support/execution-metrics.cjs").measureExecution(t, "source-control-service-boundary");
  const root = createBoundWorkspace("champcity-application-source-control-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "service baseline");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const service = createSourceControlService({ repositoryId: "repository-alpha", repositoryRoot: root });
  // Constructing the service has no side effects or workflow hooks.
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  async function success(promise, operation) {
    const value = await requireSuccess(promise);
    assert.equal(value.receipt.repositoryId, "repository-alpha");
    assert.equal(value.receipt.operation, operation);
    assert.ok(value.receipt.before.commit);
    assert.ok(value.receipt.after.commit);
    assert.ok(Date.parse(value.receipt.completedAt) >= Date.parse(value.receipt.startedAt));
    assert.equal(JSON.stringify(value).includes(root), false);
    assert.equal("workspaceId" in value, false);
    return value;
  }
  const beforeFirstStatus = metrics.boundedGit;
  assert.equal((await success(service.status(), "status")).result.clean, true);
  assert.equal(metrics.boundedGit - beforeFirstStatus, 6, "First status verifies the root once and uses lightweight receipt positions");
  const beforeCachedStatus = metrics.boundedGit;
  assert.equal((await success(service.status(), "status")).result.clean, true);
  assert.equal(metrics.boundedGit - beforeCachedStatus, 5, "Later operations reuse instance-bound root verification");
  assert.equal((await success(service.readiness(), "readiness")).result.clean, true);
  const branchInventory = (await success(service.branches(), "branches")).result;
  assert.deepEqual(branchInventory.remotes, []);
  assert.deepEqual(branchInventory.branches, [{ name: "dev", commit: baseline }]);
  assert.deepEqual(branchInventory.selectedBranch, { name: "dev", commit: baseline, upstream: null, ahead: null, behind: null });
  const baseRevision = (await success(service.resolveSourceRevision({ kind: "source-line", sourceLineId: "dev" }), "resolve-source-revision")).result;
  assert.deepEqual(baseRevision, { repositoryId: "repository-alpha", revisionId: baseline });
  assert.deepEqual((await success(service.resolveSourceRevision({ kind: "revision", revisionId: baseline }), "resolve-source-revision")).result, baseRevision);
  const invalidRevision = await service.resolveSourceRevision({ kind: "revision", revisionId: "dev" });
  assert.equal(invalidRevision.ok, false);
  assert.equal(invalidRevision.error.code, "INVALID_INPUT");
  const createdRef = await success(service.createBranchFromRef({ branchName: "non-checkout", sourceRef: "dev" }), "create-branch-from-ref");
  assert.equal(createdRef.result.sourceCommit, baseline);
  assert.deepEqual(createdRef.receipt.before, createdRef.receipt.after);
  await success(service.renameBranch({ branchName: "non-checkout", newBranchName: "non-checkout-renamed" }), "rename-branch");
  await success(service.advanceBranchRef({ branchName: "non-checkout-renamed", sourceRef: baseline, expectedCurrentCommit: baseline }), "advance-branch-ref");
  const prepared = await success(service.prepareBranch("work/service"), "prepare-branch");
  assert.deepEqual(prepared.receipt.before, { branch: "dev", commit: baseline });
  assert.deepEqual(prepared.receipt.after, { branch: "work/service", commit: baseline });

  const dirtyPath = 'file with spaces.txt';
  fs.writeFileSync(path.join(root, dirtyPath), "service content\n");
  const workflowId = "a1b2c3d4-e5f6-4789-8abc-0123456789ab";
  const secondWorkflowId = "b1b2c3d4-e5f6-4789-8abc-0123456789ab";
  const workSource = (await success(service.createWorkSource({ baseRevision, owner: { kind: "workflow", workflowId } }), "create-work-source")).result;
  assert.deepEqual(workSource.owner, { kind: "workflow", workflowId });
  assert.equal(workSource.sourceLine.sourceLineId, `workflow/${workflowId}`);
  assert.equal(workSource.sourceLine.providerBranchName, `workflow/${workflowId}`);
  assert.equal(workSource.sourceLine.headRevisionId, baseline);
  assert.equal(workSource.repositoryCheckoutId, undefined);
  assert.equal(git(root, ["rev-parse", workSource.sourceLine.providerBranchName]), baseline);
  assert.equal(git(root, ["branch", "--show-current"]), "work/service");
  assert.equal(fs.readFileSync(path.join(root, dirtyPath), "utf8"), "service content\n");
  const collision = await service.createWorkSource({ baseRevision, owner: { kind: "workflow", workflowId } });
  assert.equal(collision.ok, false);
  assert.equal(collision.error.mutationMayHaveOccurred, true);
  assert.equal(git(root, ["rev-parse", workSource.sourceLine.providerBranchName]), baseline);
  const otherWorkSource = (await success(service.createWorkSource({ baseRevision, owner: { kind: "workflow", workflowId: secondWorkflowId } }), "create-work-source")).result;
  assert.equal(otherWorkSource.sourceLine.sourceLineId, `workflow/${secondWorkflowId}`);
  assert.notEqual(otherWorkSource.sourceLine.sourceLineId, workSource.sourceLine.sourceLineId);
  assert.equal(git(root, ["rev-parse", otherWorkSource.sourceLine.providerBranchName]), baseline);
  const wrongRepository = await service.createWorkSource({ baseRevision: { ...baseRevision, repositoryId: "another" }, owner: { kind: "workflow", workflowId: "c1b2c3d4-e5f6-4789-8abc-0123456789ab" } });
  assert.equal(wrongRepository.ok, false);
  assert.equal(wrongRepository.error.code, "INVALID_INPUT");
  assert.equal(git(root, ["branch", "--list", "workflow/c1b2c3d4-e5f6-4789-8abc-0123456789ab"]), "");
  const malformedOwner = await service.createWorkSource({ baseRevision, owner: { kind: "work-intake", workIntakeId: "WI.01" } });
  assert.equal(malformedOwner.ok, false);
  assert.equal(malformedOwner.error.code, "INVALID_INPUT");
  assert.equal(git(root, ["branch", "--list", "work-intake/*"]), "");
  assert.equal(git(root, ["branch", "--list", "workflow/*"]).trim().split(/\r?\n/).filter(Boolean).length, 2);
  const dirty = await service.switchBranch("dev");
  assert.equal(dirty.ok, false);
  assert.equal(dirty.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(dirty.error.phase, "operation");
  assert.equal(git(root, ["branch", "--show-current"]), "work/service");
  assert.deepEqual((await success(service.changedFiles(), "changed-files")).result, [
    { path: dirtyPath, indexStatus: "?", worktreeStatus: "?" },
  ]);
  const traversal = await service.stage(["../outside.txt"]);
  assert.equal(traversal.ok, false);
  assert.equal(traversal.error.code, "PATH_DENIED");
  await success(service.stage([dirtyPath]), "stage");
  assert.match((await success(service.diff(), "diff")).result.staged, /service content/);
  const committed = await success(service.commit("application checkpoint"), "commit");
  assert.equal(committed.result.commit, committed.receipt.after.commit);
  assert.notEqual(committed.result.commit, baseline);
  const history = await success(service.history({ ancestor: baseline, descendant: "work/service", maxCount: 2 }), "history");
  assert.equal(history.result.ancestry.isAncestor, true);
  assert.deepEqual(history.result.commits.map(({ subject }) => subject), ["application checkpoint", "service baseline"]);
  const historyWithMessages = await success(service.historyWithMessages({ ref: "work/service", maxCount: 2 }), "history-with-messages");
  assert.deepEqual(historyWithMessages.result.commits.map(({ subject }) => subject), ["application checkpoint", "service baseline"]);
  assert.match(historyWithMessages.result.commits[0].message, /^application checkpoint/m);
  const invalidRef = await service.history({ ref: "--all" });
  assert.equal(invalidRef.ok, false);
  assert.equal(invalidRef.error.code, "INVALID_INPUT");
  const emptyCommit = await service.commit("empty must fail");
  assert.equal(emptyCommit.ok, false);
  assert.equal(emptyCommit.error.code, "GIT_EXECUTION_FAILED");

  // Porcelain -z must preserve rename paths rather than parsing quoted display text.
  fs.renameSync(path.join(root, dirtyPath), path.join(root, "renamed file.txt"));
  await success(service.stage([dirtyPath, "renamed file.txt"]), "stage");
  assert.deepEqual((await success(service.changedFiles(), "changed-files")).result, [
    { path: "renamed file.txt", originalPath: dirtyPath, indexStatus: "R", worktreeStatus: " " },
  ]);
  await success(service.commit("rename checkpoint"), "commit");

  const missingRemote = await service.push();
  assert.equal(missingRemote.ok, false);
  assert.equal(missingRemote.error.code, "GIT_EXECUTION_FAILED");
  const remote = path.join(path.dirname(root), "local-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  await success(service.push(), "push");
  await success(service.fetch(), "fetch");
  await success(service.switchBranch("dev"), "switch-branch");
  const advanced = await success(service.fastForward({ remote: "origin", remoteBranch: "work/service" }), "fast-forward");
  assert.equal(advanced.receipt.before.commit, baseline);
  assert.equal(advanced.receipt.after.commit, git(remote, ["rev-parse", "refs/heads/work/service"]));
  await success(service.deleteBranch("work/service"), "delete-branch");
  const deleteCurrent = await service.deleteBranch("dev");
  assert.equal(deleteCurrent.ok, false);

  fs.mkdirSync(path.join(root, "nested"));
  const nested = createSourceControlService({ repositoryId: "nested", repositoryRoot: path.join(root, "nested") });
  const denied = await nested.prepareBranch("must-not-exist");
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, "WORKSPACE_ACCESS_DENIED");
  assert.equal(denied.error.phase, "precondition");
  assert.equal(denied.error.mutationMayHaveOccurred, false);
  assert.equal(git(root, ["branch", "--list", "must-not-exist"]), "");
  const nonGitRoot = path.join(path.dirname(root), "not-a-repository");
  fs.mkdirSync(nonGitRoot);
  const nonGit = await createSourceControlService({ repositoryId: "non-git", repositoryRoot: nonGitRoot }).status();
  assert.equal(nonGit.ok, false);
  assert.equal(nonGit.error.code, "GIT_CAPABILITY_UNAVAILABLE");
});

test("workflow source-line names require canonical Workflow UUIDs", () => {
  const id = "a1b2c3d4-e5f6-4789-8abc-0123456789ab";
  assert.equal(workflowSourceLineName(id), `workflow/${id}`);
  for (const invalid of [
    id.toUpperCase(),
    "00000000-0000-0000-0000-000000000000",
    "a1b2c3d4-e5f6-0789-8abc-0123456789ab",
    "a1b2c3d4-e5f6-4789-7abc-0123456789ab",
    `../${id}`,
    `${id}/extra`,
    ` ${id}`,
  ]) {
    assert.throws(() => workflowSourceLineName(invalid), { code: "INVALID_INPUT" });
  }
});
