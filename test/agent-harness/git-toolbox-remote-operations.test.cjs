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

test("fetch_remote and fast_forward_branch update from configured upstream without a merge commit", async () => {
  const root = createBoundWorkspace("champcity-git-fast-forward-", true);
  commitAllFixtureState(root, "fixture baseline");
  const remote = path.join(path.dirname(root), "upstream.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["push", "--set-upstream", "origin", "dev"], { cwd: root, stdio: "ignore" });

  const competitor = path.join(path.dirname(root), "upstream-writer");
  execFileSync("git", ["clone", remote, competitor], { stdio: "ignore" });
  configureGitIdentity(competitor);
  execFileSync("git", ["switch", "dev"], { cwd: competitor, stdio: "ignore" });
  fs.writeFileSync(path.join(competitor, "remote-update.txt"), "remote update\n", "utf8");
  execFileSync("git", ["add", "--", "remote-update.txt"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "remote update"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "dev"], { cwd: competitor, stdio: "ignore" });
  const remoteCommit = git(competitor, ["rev-parse", "HEAD"]);

  const registry = registryFor(root);
  const fetched = await requireSuccess(callGit(registry, root, "fetch_remote", { remote: "origin" }));
  assert.equal(fetched.payload.remote, "origin");
  assert.ok(fetched.payload.remoteTrackingRefs.some((ref) => ref.name === "origin/dev" && ref.commit === remoteCommit));
  const before = git(root, ["rev-parse", "HEAD"]);
  const state = await requireSuccess(callGit(registry, root, "inspect_branch_state", { branchName: "dev" }, "files.read"));
  assert.equal(state.payload.selectedBranch.upstream, "origin/dev");
  assert.equal(state.payload.selectedBranch.ahead, 0);
  assert.equal(state.payload.selectedBranch.behind, 1);

  const updated = await requireSuccess(callGit(registry, root, "fast_forward_branch"));
  assert.equal(updated.payload.previousCommit, before);
  assert.equal(updated.payload.commit, remoteCommit);
  assert.equal(updated.payload.behind, 1);
  assert.equal(git(root, ["rev-list", "--count", `${before}..${remoteCommit}`]), "1");
  assert.equal(git(root, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(" ").length, 2);

  fs.writeFileSync(path.join(root, "local-divergence.txt"), "local divergence\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["local-divergence.txt"] }));
  const localAdvance = await requireSuccess(callGit(registry, root, "commit", { message: "local divergence" }));
  fs.writeFileSync(path.join(competitor, "remote-divergence.txt"), "remote divergence\n", "utf8");
  execFileSync("git", ["add", "--", "remote-divergence.txt"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "remote divergence"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "dev"], { cwd: competitor, stdio: "ignore" });
  await requireSuccess(callGit(registry, root, "fetch_remote", { remote: "origin" }));
  const divergence = await callGit(registry, root, "fast_forward_branch");
  assert.equal(divergence.ok, false);
  assert.equal(divergence.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(divergence.error.details.ahead, 1);
  assert.equal(divergence.error.details.behind, 1);
  assert.equal(git(root, ["rev-parse", "HEAD"]), localAdvance.payload.commit);
});

test("push and integrate_to_dev reject divergence without force, merge commits, rebase, or reset", async () => {
  const pushRoot = createBoundWorkspace("champcity-git-push-reject-", true);
  commitAllFixtureState(pushRoot, "fixture baseline");
  const pushRegistry = registryFor(pushRoot);
  await requireSuccess(callGit(pushRegistry, pushRoot, "prepare_branch", { branchName: "feature/diverged" }));
  fs.writeFileSync(path.join(pushRoot, "first.txt"), "first\n", "utf8");
  await requireSuccess(callGit(pushRegistry, pushRoot, "stage_changes", { paths: ["first.txt"] }));
  await requireSuccess(callGit(pushRegistry, pushRoot, "commit", { message: "first" }));
  const remote = path.join(path.dirname(pushRoot), "reject-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: pushRoot, stdio: "ignore" });
  await requireSuccess(callGit(pushRegistry, pushRoot, "push"));

  const competitor = path.join(path.dirname(pushRoot), "competitor");
  execFileSync("git", ["clone", remote, competitor], { stdio: "ignore" });
  configureGitIdentity(competitor);
  execFileSync("git", ["switch", "feature/diverged"], { cwd: competitor, stdio: "ignore" });
  fs.writeFileSync(path.join(competitor, "remote.txt"), "remote\n", "utf8");
  execFileSync("git", ["add", "--", "remote.txt"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "remote advance"], { cwd: competitor, stdio: "ignore" });
  execFileSync("git", ["push", "origin", "feature/diverged"], { cwd: competitor, stdio: "ignore" });
  fs.writeFileSync(path.join(pushRoot, "local.txt"), "local\n", "utf8");
  await requireSuccess(callGit(pushRegistry, pushRoot, "stage_changes", { paths: ["local.txt"] }));
  await requireSuccess(callGit(pushRegistry, pushRoot, "commit", { message: "local advance" }));
  const rejectedPush = await callGit(pushRegistry, pushRoot, "push");
  assert.equal(rejectedPush.ok, false);
  assert.equal(rejectedPush.error.code, "GIT_EXECUTION_FAILED");

  const integrateRoot = createBoundWorkspace("champcity-git-integrate-reject-", true);
  commitAllFixtureState(integrateRoot, "fixture baseline");
  const integrateRegistry = registryFor(integrateRoot);
  await requireSuccess(callGit(integrateRegistry, integrateRoot, "prepare_branch", { branchName: "feature/non-ff" }));
  fs.writeFileSync(path.join(integrateRoot, "feature.txt"), "feature\n", "utf8");
  await requireSuccess(callGit(integrateRegistry, integrateRoot, "stage_changes", { paths: ["feature.txt"] }));
  await requireSuccess(callGit(integrateRegistry, integrateRoot, "commit", { message: "feature" }));
  execFileSync("git", ["switch", "dev"], { cwd: integrateRoot, stdio: "ignore" });
  fs.writeFileSync(path.join(integrateRoot, "dev.txt"), "dev\n", "utf8");
  execFileSync("git", ["add", "--", "dev.txt"], { cwd: integrateRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "dev diverged"], { cwd: integrateRoot, stdio: "ignore" });
  const devBefore = git(integrateRoot, ["rev-parse", "dev"]);
  execFileSync("git", ["switch", "feature/non-ff"], { cwd: integrateRoot, stdio: "ignore" });
  const rejectedIntegration = await callGit(integrateRegistry, integrateRoot, "integrate_to_dev");
  assert.equal(rejectedIntegration.ok, false);
  assert.equal(rejectedIntegration.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(integrateRoot, ["branch", "--show-current"]), "feature/non-ff");
  assert.equal(git(integrateRoot, ["rev-parse", "dev"]), devBefore);
});

test("independent branch refs preserve dirty checkout state and enforce exact fast-forward ownership", async (t) => {
  const root = createBoundWorkspace("champcity-ref-primitives-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "base");
  const base = git(root, ["rev-parse", "HEAD"]);
  git(root, ["config", "branch.autoSetupMerge", "always"]);
  git(root, ["branch", "old-endpoint"]); git(root, ["tag", "base-tag"]);
  fs.writeFileSync(path.join(root, "later.txt"), "later\n"); commitAllFixtureState(root, "later");
  const later = git(root, ["rev-parse", "HEAD"]);
  git(root, ["update-ref", "refs/remotes/origin/fetched", later]);
  fs.writeFileSync(path.join(root, "README.md"), "staged\n"); git(root, ["add", "README.md"]);
  fs.appendFileSync(path.join(root, "README.md"), "unstaged\n");
  fs.writeFileSync(path.join(root, "untracked.txt"), "untracked\n");
  const snapshot = () => ({
    head: git(root, ["rev-parse", "HEAD"]), branch: git(root, ["symbolic-ref", "HEAD"]),
    index: fs.readFileSync(path.join(root, ".git", "index")).toString("base64"),
    status: git(root, ["status", "--porcelain=v1", "-z"]),
    staged: git(root, ["diff", "--cached", "--binary"]), unstaged: git(root, ["diff", "--binary"]),
    untracked: fs.readFileSync(path.join(root, "untracked.txt"), "utf8"),
  });
  const before = snapshot(); const registry = registryFor(root);
  for (const [branchName, sourceRef, sourceCommit] of [
    ["copy/local", "old-endpoint", base], ["copy/tag", "base-tag", base],
    ["copy/sha", later, later], ["copy/remote", "origin/fetched", later], ["copy/dev", "dev", later],
  ]) {
    const created = await requireSuccess(callGit(registry, root, "create_branch_from_ref", { branchName, sourceRef }));
    assert.deepEqual(created.payload, { branchName, sourceRef, sourceCommit });
    assert.equal(git(root, ["rev-parse", branchName]), sourceCommit);
    assert.equal(git(root, ["for-each-ref", "--format=%(upstream)", `refs/heads/${branchName}`]), "");
    assert.deepEqual(snapshot(), before);
  }
  assert.equal((await callGit(registry, root, "create_branch_from_ref", { branchName: "copy/local", sourceRef: later })).ok, false);
  assert.equal(git(root, ["rev-parse", "copy/local"]), base);
  const advance = { branchName: "copy/local", sourceRef: later, expectedCurrentCommit: base };
  const advanced = await requireSuccess(callGit(registry, root, "advance_branch_ref", advance));
  assert.equal(advanced.payload.previousCommit, base); assert.equal(advanced.payload.commit, later);
  assert.equal((await callGit(registry, root, "advance_branch_ref", advance)).ok, false, "stale expected commit");
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, sourceRef: base, expectedCurrentCommit: later })).ok, false, "non-fast-forward");
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, branchName: "dev", expectedCurrentCommit: later })).ok, false, "current checkout");
  const peer = path.join(path.dirname(root), "peer"); git(root, ["worktree", "add", peer, "copy/tag"]);
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, branchName: "copy/tag" })).ok, false, "other checkout");
  assert.equal((await callGit(registry, root, "rename_branch", { branchName: "copy/tag", newBranchName: "must-not-rename" })).ok, false);
  await requireSuccess(callGit(registry, root, "rename_branch", { branchName: "copy/sha", newBranchName: "renamed" }));
  assert.equal(git(root, ["rev-parse", "renamed"]), later);
  assert.equal((await callGit(registry, root, "rename_branch", { branchName: "renamed", newBranchName: "copy/dev" })).ok, false);
  assert.deepEqual(snapshot(), before);
  await requireSuccess(callGit(registry, root, "rename_branch", { branchName: "dev", newBranchName: "dirty-renamed" }));
  assert.deepEqual(snapshot(), { ...before, branch: "refs/heads/dirty-renamed" });
  for (const sourceRef of ["--all", "missing", "HEAD\nother", "x".repeat(1025)]) {
    assert.equal((await callGit(registry, root, "create_branch_from_ref", { branchName: "invalid-source", sourceRef })).ok, false);
  }
  git(root, ["symbolic-ref", "refs/heads/symbolic", "refs/heads/renamed"]);
  assert.equal((await callGit(registry, root, "advance_branch_ref", { ...advance, branchName: "symbolic", expectedCurrentCommit: later })).ok, false);
  git(root, ["symbolic-ref", "refs/heads/dangling", "refs/heads/missing"]);
  assert.equal((await callGit(registry, root, "create_branch_from_ref", { branchName: "dangling", sourceRef: base })).ok, false);
  assert.equal(git(root, ["symbolic-ref", "refs/heads/dangling"]), "refs/heads/missing");
});

test("mapped branch push upstream and exact remote deletion preserve local refs and sanitize failures", async (t) => {
  const root = createBoundWorkspace("champcity-remote-branches-", true);
  t.after(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));
  commitAllFixtureState(root, "base"); const base = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "remote.git"); git(path.dirname(root), ["init", "--bare", remote]);
  git(root, ["remote", "add", "origin", remote]);
  const registry = registryFor(root);
  const pushed = await requireSuccess(callGit(registry, root, "push", { branch: "dev", remoteBranch: "published/other", expectedCommit: base, setUpstream: true }));
  assert.equal(pushed.payload.upstream, "origin/published/other");
  assert.equal(git(remote, ["rev-parse", "refs/heads/published/other"]), base);
  const inspect = async () => (await requireSuccess(callGit(registry, root, "inspect_branch_state", { branchName: "dev" }, "files.read"))).payload.selectedBranch;
  assert.equal((await inspect()).upstream, "origin/published/other");
  await requireSuccess(callGit(registry, root, "unset_branch_upstream", { branchName: "dev" }));
  assert.equal((await inspect()).upstream, null);
  for (const params of [{ branchName: "missing", remote: "origin", remoteBranch: "published/other" }, { branchName: "dev", remote: "missing", remoteBranch: "published/other" }, { branchName: "dev", remote: "origin", remoteBranch: "missing" }]) {
    assert.equal((await callGit(registry, root, "set_branch_upstream", params)).ok, false);
  }
  await requireSuccess(callGit(registry, root, "set_branch_upstream", { branchName: "dev", remote: "origin", remoteBranch: "published/other" }));
  assert.equal((await inspect()).upstream, "origin/published/other");
  fs.writeFileSync(path.join(root, "later.txt"), "later\n"); commitAllFixtureState(root, "later");
  const later = git(root, ["rev-parse", "HEAD"]);
  assert.equal((await callGit(registry, root, "push", { expectedCommit: base })).ok, false);
  const oldPush = await requireSuccess(callGit(registry, root, "push"));
  assert.deepEqual(oldPush.payload, { remote: "origin", branch: "dev", commit: later });
  assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), later);
  const localRefs = git(root, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags"]);
  const params = { remote: "origin", remoteBranch: "published/other", expectedRemoteCommit: later };
  assert.equal((await callGit(registry, root, "delete_remote_branch", params)).ok, false);
  const rejectedHook = path.join(remote, "hooks", "pre-receive");
  fs.writeFileSync(rejectedHook, '#!/bin/sh\necho "private-diagnostic-marker" >&2\nexit 1\n'); fs.chmodSync(rejectedHook, 0o755);
  const rejected = await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base });
  assert.equal(rejected.ok, false); assert.equal(JSON.stringify(rejected).includes("private-diagnostic-marker"), false);
  assert.equal(JSON.stringify(rejected).includes(remote), false); fs.unlinkSync(rejectedHook);
  git(root, ["config", "remote.origin.mirror", "true"]);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false);
  git(root, ["config", "--unset", "remote.origin.mirror"]);
  git(root, ["config", "remote.origin.pushurl", root]);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false);
  git(root, ["config", "--unset", "remote.origin.pushurl"]);
  const raceHook = path.join(root, ".git", "hooks", "pre-push");
  fs.writeFileSync(raceHook, `#!/bin/sh
git --git-dir="$2" update-ref refs/heads/published/other ${later} ${base}
`); fs.chmodSync(raceHook, 0o755);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false, "Remote movement between inspection and receive-pack is preserved");
  assert.equal(git(remote, ["rev-parse", "refs/heads/published/other"]), later);
  fs.unlinkSync(raceHook); git(remote, ["update-ref", "refs/heads/published/other", base, later]);
  const deleted = await requireSuccess(callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base }));
  assert.deepEqual(deleted.payload, { remote: "origin", remoteBranch: "published/other", deletedCommit: base, remoteState: "absent" });
  assert.equal(git(remote, ["for-each-ref", "--format=%(objectname)", "refs/heads/published/other"]), "");
  assert.equal(git(root, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/tags"]), localRefs);
  assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), later);
  assert.equal((await callGit(registry, root, "delete_remote_branch", { ...params, expectedRemoteCommit: base })).ok, false);
});
