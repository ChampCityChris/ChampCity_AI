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

test("Work Intake branch binding selects an exact base and fails closed before persistence", async (t) => {
  const root = createBoundWorkspace("champcity-intake-branch-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "base baseline");
  const baseCommit = git(root, ["rev-parse", "HEAD"]);
  execFileSync("git", ["branch", "integration-target"], { cwd: root, stdio: "ignore" });
  fs.writeFileSync(path.join(root, "later.txt"), "prior checkout has later work\n");
  commitAllFixtureState(root, "later original checkout");
  const originalCommit = git(root, ["rev-parse", "HEAD"]);
  const service = createWorkIntakeBranchService({ repositoryId: "repository-alpha", repositoryRoot: root });
  const input = { intakeId: "WI.01", baseBranch: "integration-target", baseCommit };
  assert.equal(workIntakeBranchName(input.intakeId), workIntakeBranchName(input.intakeId));
  assert.notEqual(workIntakeBranchName("WI.01"), workIntakeBranchName("wi-01"));
  assert.throws(() => workIntakeBranchName("../bad"));
  let persistenceCalls = 0;
  const persist = () => { persistenceCalls++; };

  fs.writeFileSync(path.join(root, "dirty.txt"), "pre-existing\n");
  const dirty = await service.establish(input, persist);
  assert.equal(dirty.ok, false);
  assert.equal(dirty.recovery, "unchanged");
  assert.equal(persistenceCalls, 0);
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  fs.unlinkSync(path.join(root, "dirty.txt"));
  const stale = await service.establish({ ...input, baseCommit: originalCommit }, persist);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, "STALE_SOURCE");
  assert.equal(persistenceCalls, 0);

  const established = await service.establish(input, async (binding) => {
    persistenceCalls++;
    assert.equal(git(root, ["branch", "--show-current"]), binding.workBranch);
    assert.equal(git(root, ["rev-parse", "HEAD"]), baseCommit);
    assert.equal(fs.existsSync(path.join(root, "later.txt")), false);
    await service.verify(binding);
    fs.writeFileSync(path.join(root, "intake.md"), "intake fixture\n");
    return "persisted";
  });
  assert.equal(established.ok, true, JSON.stringify(established));
  assert.equal(established.value, "persisted");
  assert.equal(established.binding.repositoryId, "repository-alpha");
  assert.equal(established.binding.currentHead, baseCommit);
  assert.equal(established.binding.baseBranch, "integration-target");
  assert.equal(established.binding.remote, undefined);
  assert.equal(git(root, ["rev-parse", "dev"]), originalCommit);
  assert.equal(persistenceCalls, 1);
  await assert.rejects(service.verify({ ...established.binding, repositoryId: "other" }), /binding does not match/);
  commitAllFixtureState(root, "fixture persistence checkpoint");
  await assert.rejects(service.verify(established.binding), /recorded head/);
  execFileSync("git", ["switch", "dev"], { cwd: root, stdio: "ignore" });
  await assert.rejects(service.verify(established.binding), /current checkout/);
  const collision = await service.establish(input, persist);
  assert.equal(collision.ok, false);
  assert.match(collision.error.message, /already exists/);
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  assert.equal(persistenceCalls, 1);

  const failureInput = { intakeId: "WI02", baseBranch: "dev", baseCommit: originalCommit };
  const failed = await service.establish(failureInput, () => { throw Error("synthetic persistence failure"); });
  assert.equal(failed.ok, false);
  assert.equal(failed.recovery, "restored");
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  assert.equal(git(root, ["branch", "--list", workIntakeBranchName("WI02")]), "");
  assert.equal(git(root, ["rev-parse", "HEAD"]), originalCommit);

  const partial = await service.establish({ ...failureInput, intakeId: "WI03" }, () => {
    fs.writeFileSync(path.join(root, "partial.md"), "retain this evidence\n");
    throw Error("partial persistence failure");
  });
  assert.equal(partial.ok, false);
  assert.equal(partial.recovery, "inspection-required");
  assert.equal(fs.readFileSync(path.join(root, "partial.md"), "utf8"), "retain this evidence\n");
  assert.equal(git(root, ["branch", "--show-current"]), partial.binding.workBranch);
  assert.equal(git(root, ["rev-parse", "dev"]), originalCommit);

  const nonGitRoot = path.join(path.dirname(root), "non-git");
  fs.mkdirSync(nonGitRoot);
  const nonGit = await createWorkIntakeBranchService({ repositoryId: "non-git", repositoryRoot: nonGitRoot })
    .establish(input, persist);
  assert.equal(nonGit.ok, false);
  assert.equal(persistenceCalls, 1);
});
