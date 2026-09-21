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

test("release tag actions create, verify, and push tags without overwriting local or remote tags", async () => {
  const root = createBoundWorkspace("champcity-git-tags-", true);
  commitAllFixtureState(root, "fixture baseline");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "tag-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  const registry = registryFor(root);

  const created = await requireSuccess(callGit(registry, root, "create_tag", {
    tagName: "v1.2.3",
    tagType: "annotated",
    target: "HEAD",
    message: "Release v1.2.3",
  }));
  assert.equal(created.payload.targetCommit, baseline);
  const verified = await requireSuccess(callGit(registry, root, "verify_tag", { tagName: "v1.2.3" }, "files.read"));
  assert.equal(verified.payload.tagType, "annotated");
  assert.equal(verified.payload.targetCommit, baseline);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName: "v1.2.3", remote: "origin" }));
  assert.equal(git(remote, ["rev-parse", "refs/tags/v1.2.3^{}"]), baseline);

  const duplicate = await callGit(registry, root, "create_tag", {
    tagName: "v1.2.3",
    tagType: "lightweight",
  });
  assert.equal(duplicate.ok, false);
  fs.writeFileSync(path.join(root, "advance.txt"), "advance\n", "utf8");
  commitAllFixtureState(root, "advance after release");
  execFileSync("git", ["tag", "--force", "v1.2.3", "HEAD"], { cwd: root, stdio: "ignore" });
  const remoteOverwrite = await callGit(registry, root, "push_tag", { tagName: "v1.2.3", remote: "origin" });
  assert.equal(remoteOverwrite.ok, false);
  assert.equal(git(remote, ["rev-parse", "refs/tags/v1.2.3^{}"]), baseline);
});

test("delete_tag removes exact annotated and lightweight remote refs first and preserves history and other tags", async (t) => {
  for (const tagType of ["annotated", "lightweight"]) {
    await t.test(tagType, async () => {
      const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
      await requireSuccess(callGit(registry, root, "create_tag", { tagName, tagType, ...tagType === "annotated" ? { message: "candidate" } : {} }));
      await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
      git(root, ["tag", "--annotate", "--no-sign", "--message", "keep", "keep-local"]);
      git(root, ["config", "push.followTags", "true"]);
      const result = await requireSuccess(callGit(registry, root, "delete_tag", { tagName }));
      assert.deepEqual(result.payload, {
        remote: "origin", tagName, deletedCommit: baseline,
        localDeleted: true, remoteDeleted: true, localState: "absent", remoteState: "absent",
      });
      assert.equal(git(root, ["tag", "--list", tagName]), "");
      assert.equal(git(remote, ["tag", "--list", tagName]), "");
      assert.equal(git(remote, ["tag", "--list", "keep-local"]), "");
      assert.equal(git(root, ["rev-parse", "keep-local^{commit}"]), baseline);
      assert.equal(git(root, ["rev-parse", "HEAD"]), baseline);
      assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), baseline);
      assert.equal(git(root, ["status", "--porcelain"]), "");
    });
  }
});

test("delete_tag preserves local evidence on remote rejection and supports explicit retry", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
  fs.writeFileSync(path.join(remote, "hooks", "pre-receive"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  const result = await callGit(registry, root, "delete_tag", { tagName });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(remote, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  fs.unlinkSync(path.join(remote, "hooks", "pre-receive"));
  assert.equal((await requireSuccess(callGit(registry, root, "delete_tag", { tagName }))).payload.remoteDeleted, true);
});

test("delete_tag cleans local-only tags and both-absent retries without touching remote history", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  const localOnly = await requireSuccess(callGit(registry, root, "delete_tag", { tagName, remote: "origin" }));
  assert.equal(localOnly.payload.deletedCommit, baseline);
  assert.equal(localOnly.payload.localDeleted, true);
  assert.equal(localOnly.payload.remoteDeleted, false);
  const absent = await requireSuccess(callGit(registry, root, "delete_tag", { tagName }));
  assert.equal(absent.payload.deletedCommit, null);
  assert.equal(absent.payload.localDeleted, false);
  assert.equal(absent.payload.remoteDeleted, false);
  assert.equal(git(remote, ["rev-parse", "refs/heads/dev"]), baseline);
});

test("delete_tag recovers after remote success followed by local deletion failure", async (t) => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
  const boundedGit = require(path.join(repositoryRoot, "dist/main/agentHarness/repository/boundedGit.js"));
  const realRun = boundedGit.runBoundedGit;
  const calls = [];
  const mocked = t.mock.method(boundedGit, "runBoundedGit", async (options) => {
    calls.push(options.args);
    if (options.args[0] === "update-ref") throw new AgentHarnessError("GIT_EXECUTION_FAILED", "synthetic local ref lock failure");
    return realRun(options);
  });
  assert.equal((await callGit(registry, root, "delete_tag", { tagName })).ok, false);
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(remote, ["tag", "--list", tagName]), "");
  assert.deepEqual(calls.find((args) => args[0] === "push"), ["push", "--no-follow-tags", "--delete", "--", "origin", `refs/tags/${tagName}`]);
  assert.ok(calls.findIndex((args) => args[0] === "push") < calls.findIndex((args) => args[0] === "update-ref"));
  assert.equal(calls.flat().some((arg) => /^(?:--force|--force-with-lease|--mirror|reset|rebase)$/.test(arg)), false);
  mocked.mock.restore();
  const retry = await requireSuccess(callGit(registry, root, "delete_tag", { tagName }));
  assert.equal(retry.payload.localDeleted, true);
  assert.equal(retry.payload.remoteDeleted, false);
});

test("delete_tag refuses uncorroborated or mismatched remote tags", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(remote, ["tag", tagName, baseline]);
  const uncorroborated = await callGit(registry, root, "delete_tag", { tagName });
  assert.equal(uncorroborated.ok, false);
  assert.match(uncorroborated.error.message, /corroborating local/);
  fs.writeFileSync(path.join(root, "new.txt"), "new source\n");
  commitAllFixtureState(root, "later candidate");
  git(root, ["tag", tagName]);
  const mismatched = await callGit(registry, root, "delete_tag", { tagName });
  assert.equal(mismatched.ok, false);
  assert.match(mismatched.error.message, /targets do not match/);
  assert.equal(git(remote, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), git(root, ["rev-parse", "HEAD"]));
});

test("delete_tag rejects dirty state, invalid tag names, and unsafe configured destinations", async () => {
  const { root, remote, registry, baseline, tagName } = createTagDeletionFixture();
  git(root, ["tag", tagName]);
  await requireSuccess(callGit(registry, root, "push_tag", { tagName }));
  fs.writeFileSync(path.join(root, "untracked.txt"), "dirty\n");
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /clean/);
  git(root, ["add", "--", "untracked.txt"]);
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /clean/);
  commitAllFixtureState(root, "unrelated later source");
  for (const invalid of ["*", "v*", "refs/tags/*", "--all", "v1:v2", "../bad", "v1\nother"]) {
    assert.equal((await callGit(registry, root, "delete_tag", { tagName: invalid })).error.code, "INVALID_INPUT");
  }
  assert.equal((await callGit(registry, root, "delete_tag", { tagName, remote: "missing" })).ok, false);
  git(root, ["config", "remote.origin.pushurl", path.join(path.dirname(root), "different.git")]);
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /destination/);
  git(root, ["config", "--unset", "remote.origin.pushurl"]);
  git(root, ["config", "remote.origin.mirror", "true"]);
  assert.match((await callGit(registry, root, "delete_tag", { tagName })).error.message, /non-mirroring/);
  assert.equal(git(root, ["rev-parse", `refs/tags/${tagName}`]), baseline);
  assert.equal(git(remote, ["rev-parse", `refs/tags/${tagName}`]), baseline);
});

test("delete_tag retains OAuth, registered-workspace, Git-backed, and exact parameter gates", async () => {
  const { root, registry, tagName } = createTagDeletionFixture();
  const tool = registry.listTools("files.read files.write").find((entry) => entry.name === "git_toolbox");
  const input = { workspaceId: "alpha", action: "delete_tag", params: { tagName } };
  assert.equal(tool.inputZodSchema.safeParse(input).success, true);
  assert.equal(tool.inputZodSchema.safeParse({ ...input, params: {} }).success, false);
  for (const key of ["force", "pattern", "branch", "args", "command", "cwd", "environment", "timeout"]) {
    assert.equal(tool.inputZodSchema.safeParse({ ...input, params: { tagName, [key]: "forbidden" } }).success, false);
  }
  assert.equal(registry.listTools("files.read").find((entry) => entry.name === "git_toolbox").actions.includes("delete_tag"), false);
  assert.equal((await callGit(registry, root, "delete_tag", { tagName }, "files.read")).error.code, "OAUTH_SCOPE_DENIED");
  const foreign = await registry.callTool({ name: "git_toolbox", arguments: { ...input, workspaceId: "foreign" }, scope: "files.write" });
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");
  const nonGit = createBoundWorkspace("champcity-delete-tag-non-git-", false);
  assert.equal((await callGit(registryFor(nonGit), nonGit, "delete_tag", { tagName })).error.code, "GIT_CAPABILITY_UNAVAILABLE");
});
