const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
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

test("git_toolbox production dispatch has no workflow, planning, Issue, or document authorization dependency", () => {
  const toolRegistrySource = readSource("src/main/agentHarness/tools/toolRegistry.ts");
  const gitMutationSource = readSource("src/main/agentHarness/repository/gitMutations.ts");
  const workCardLoopSource = readSource("src/main/workCardLoop/workCardLoopStateService.ts");
  const reviewSource = readSource("src/main/workCardBuilding/workCardBuildingReviewService.ts");
  const forbiddenImport = /from\s+["'][^"']*(?:workCardLoop|currentWorkflow|issueResolution|planningDocument|gitMutationAuthorization)/i;
  const mutationDispatch = toolRegistrySource.slice(
    toolRegistrySource.indexOf("function gitMutationAction"),
    toolRegistrySource.indexOf("function statusOnlyProvider"),
  );

  assert.doesNotMatch(toolRegistrySource, forbiddenImport);
  assert.doesNotMatch(gitMutationSource, forbiddenImport);
  assert.doesNotMatch(mutationDispatch, /workCard|currentWorkflow|issue|planning|authorization/i);
  assert.doesNotMatch(toolRegistrySource, /resolveGitMutationWorkflowAuthorization|gitMutationAuthorization/);
  assert.doesNotMatch(workCardLoopSource, /resolveGitMutationWorkflowAuthorization|GitMutationWorkflowAuthorization|gitMutationAuthorization/);
  assert.doesNotMatch(reviewSource, /stampGitMutationAuthorization|gitMutationAuthorization/);
  assert.equal(fs.existsSync(path.join(repositoryRoot, "src/main/documents/gitMutationAuthorization.ts")), false);
});

test("Work Card and Repair approval ignore Git wording and do not stamp Git-tool metadata", () => {
  const gitSections = [
    "",
    "## Authorized Git Mutations\n\nThis is ordinary prose, not a machine grant.\n",
    "## Authorized Git Mutations\n\n- `stage_everything`\n- duplicate prose\n\n## Authorized Git Mutations\n\nNothing to parse.\n",
  ];

  for (const [index, section] of gitSections.entries()) {
    const root = tempWorkspace(`champcity-git-approval-scope-${index}-`);
    const formalPath = "planning/phases/phase-01/Work_Cards/WC01_scope_test.md";
    writeDoc(root, formalPath, "formal-work-card", "Pending", {
      identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
      bodyMarkdown: `# WC01 - Scope Test\n\nOrdinary bounded instructions.\n\n${section}`,
    });

    assert.doesNotThrow(() => approveFormalWorkCardAndRegisterReport({
      workspaceRoot: root,
      formalWorkCardPath: formalPath,
      reviewedAt: "2026-09-14T12:00:00.000Z",
    }));
    const formal = readCanonical(root, formalPath);
    assert.equal(formal.metadata.documentDisposition.status, "Approved");
    assert.equal(Object.hasOwn(formal.metadata.workflowData, "gitMutationAuthorization"), false);
    assert.equal(
      fs.existsSync(path.join(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_scope_test.md")),
      true,
    );
  }

  const repairRoot = tempWorkspace("champcity-git-repair-approval-scope-");
  const repairPath = "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md";
  writeDoc(repairRoot, repairPath, "repair-work-card", "Pending", {
    identity: {
      phaseId: "phase-01",
      workCardId: "WC01-REPAIR01",
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
    },
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
    },
    bodyMarkdown: "# Repair\n\n## Authorized Git Mutations\n\nMalformed prose remains ordinary task wording.\n",
  });
  const documents = buildApprovedRepairWorkCardAndReportDocuments({
    workspaceRoot: repairRoot,
    repairWorkCardPath: repairPath,
    approvedStatus: "Approved",
    notes: "",
    reviewedAt: "2026-09-14T12:00:00.000Z",
  });
  writeCanonicalMarkdownDocuments(documents);
  const repair = readCanonical(repairRoot, repairPath);
  assert.equal(repair.metadata.documentDisposition.status, "Approved");
  assert.equal(Object.hasOwn(repair.metadata.workflowData, "gitMutationAuthorization"), false);
});

test("all five bounded git_toolbox mutations execute in a registered Git repository without a planning corpus", async () => {
  const root = createBoundWorkspace("champcity-git-mutations-success-", true);
  fs.writeFileSync(path.join(root, "delete-me.txt"), "delete me\n", "utf8");
  commitAllFixtureState(root, "fixture baseline");
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
  const registry = registryFor(root);

  const beforeStatus = await callGit(registry, root, "status", undefined, "files.read");
  assert.equal(beforeStatus.ok, true);
  assert.equal(beforeStatus.payload.gitBacked, true);

  const prepared = await callGit(registry, root, "prepare_branch", { branchName: "feature/bounded" });
  assert.equal(prepared.ok, true);
  assert.equal(git(root, ["branch", "--show-current"]), "feature/bounded");

  fs.writeFileSync(path.join(root, "requested.txt"), "requested\n", "utf8");
  fs.writeFileSync(path.join(root, "unrelated.txt"), "unrelated\n", "utf8");
  fs.unlinkSync(path.join(root, "delete-me.txt"));
  const staged = await callGit(registry, root, "stage_changes", { paths: ["requested.txt", "delete-me.txt"] });
  assert.equal(staged.ok, true);
  assert.deepEqual(staged.payload.stagedPaths, ["requested.txt", "delete-me.txt"]);
  assert.deepEqual(gitLines(root, ["diff", "--cached", "--name-only"]), ["delete-me.txt", "requested.txt"]);
  assert.match(git(root, ["status", "--short"]), /\?\? unrelated\.txt/);

  const committed = await callGit(registry, root, "commit", { message: "Commit only explicit staged state" });
  assert.equal(committed.ok, true);
  assert.equal(git(root, ["log", "-1", "--pretty=%s"]), "Commit only explicit staged state");
  assert.deepEqual(gitLines(root, ["show", "--pretty=", "--name-only", "HEAD"]), ["delete-me.txt", "requested.txt"]);
  assert.equal(fs.existsSync(path.join(root, "unrelated.txt")), true);
  fs.unlinkSync(path.join(root, "unrelated.txt"));

  const remote = path.join(path.dirname(root), "remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root, stdio: "ignore" });
  const pushed = await callGit(registry, root, "push");
  assert.equal(pushed.ok, true);
  assert.equal(git(remote, ["rev-parse", "refs/heads/feature/bounded"]), committed.payload.commit);

  const integrated = await callGit(registry, root, "integrate_to_dev");
  assert.equal(integrated.ok, true);
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  assert.equal(git(root, ["rev-parse", "dev"]), committed.payload.commit);
  assert.equal(fs.existsSync(path.join(root, "planning")), false);

  const emptyCommit = await callGit(registry, root, "commit", { message: "must fail" });
  assert.equal(emptyCommit.ok, false);
  assert.equal(emptyCommit.error.code, "GIT_EXECUTION_FAILED");
  const existingBranch = await callGit(registry, root, "prepare_branch", { branchName: "feature/bounded" });
  assert.equal(existingBranch.ok, false);
  const invalidBranch = await callGit(registry, root, "prepare_branch", { branchName: "../invalid" });
  assert.equal(invalidBranch.ok, false);
  assert.equal(invalidBranch.error.code, "INVALID_INPUT");
  fs.writeFileSync(path.join(root, "dirty.txt"), "dirty\n", "utf8");
  const dirtyBranch = await callGit(registry, root, "prepare_branch", { branchName: "feature/dirty" });
  assert.equal(dirtyBranch.ok, false);
  assert.equal(dirtyBranch.error.code, "GIT_EXECUTION_FAILED");
});

test("branch state, existing-branch switching, and bounded history expose real repository evidence", async () => {
  const root = createBoundWorkspace("champcity-git-branch-state-", true);
  commitAllFixtureState(root, "fixture baseline");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  execFileSync("git", ["branch", "main"], { cwd: root, stdio: "ignore" });
  const registry = registryFor(root);

  const state = await requireSuccess(callGit(registry, root, "inspect_branch_state", undefined, "files.read"));
  assert.equal(state.payload.currentBranch, "dev");
  assert.equal(state.payload.head, baseline);
  assert.deepEqual(state.payload.branches.map((branch) => branch.name), ["dev", "main"]);
  assert.deepEqual(state.payload.remotes, []);
  assert.deepEqual(state.payload.selectedBranch, {
    name: "dev",
    commit: baseline,
    upstream: null,
    ahead: null,
    behind: null,
  });

  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "main" }));
  assert.equal(git(root, ["branch", "--show-current"]), "main");
  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  assert.equal(git(root, ["branch", "--show-current"]), "dev");

  fs.writeFileSync(path.join(root, "dirty.txt"), "dirty\n", "utf8");
  const dirtySwitch = await callGit(registry, root, "switch_branch", { branchName: "main" });
  assert.equal(dirtySwitch.ok, false);
  assert.equal(dirtySwitch.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(root, ["branch", "--show-current"]), "dev");
  fs.unlinkSync(path.join(root, "dirty.txt"));

  execFileSync("git", ["checkout", "--detach", baseline], { cwd: root, stdio: "ignore" });
  const detachedSwitch = await callGit(registry, root, "switch_branch", { branchName: "main" });
  assert.equal(detachedSwitch.ok, false);
  assert.equal(detachedSwitch.error.code, "GIT_EXECUTION_FAILED");
  assert.equal(git(root, ["branch", "--show-current"]), "");
  execFileSync("git", ["switch", "dev"], { cwd: root, stdio: "ignore" });

  fs.writeFileSync(path.join(root, "history.txt"), "history\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["history.txt"] }));
  const latest = await requireSuccess(callGit(registry, root, "commit", { message: "history evidence" }));
  const history = await requireSuccess(callGit(registry, root, "inspect_history", {
    ref: "dev",
    maxCount: 2,
    ancestor: baseline,
    descendant: "dev",
  }, "files.read"));
  assert.equal(history.payload.resolvedCommit, latest.payload.commit);
  assert.deepEqual(history.payload.commits.map((commit) => commit.subject), ["history evidence", "fixture baseline"]);
  assert.equal(history.payload.ancestry.ancestorCommit, baseline);
  assert.equal(history.payload.ancestry.descendantCommit, latest.payload.commit);
  assert.equal(history.payload.ancestry.isAncestor, true);
});

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

test("merge_branch carries a hotfix into main and forward into diverged dev, then deletes merged branches safely", async () => {
  const root = createBoundWorkspace("champcity-git-merge-lifecycle-", true);
  commitAllFixtureState(root, "fixture baseline");
  execFileSync("git", ["branch", "main"], { cwd: root, stdio: "ignore" });
  const registry = registryFor(root);

  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "main" }));
  await requireSuccess(callGit(registry, root, "prepare_branch", { branchName: "hotfix/release" }));
  fs.writeFileSync(path.join(root, "hotfix.txt"), "hotfix\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["hotfix.txt"] }));
  const hotfix = await requireSuccess(callGit(registry, root, "commit", { message: "release hotfix" }));

  const mergedMain = await requireSuccess(callGit(registry, root, "merge_branch", {
    sourceBranch: "hotfix/release",
    targetBranch: "main",
    mode: "ff-only",
  }));
  assert.equal(mergedMain.payload.commit, hotfix.payload.commit);
  assert.equal(git(root, ["branch", "--show-current"]), "main");

  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  fs.writeFileSync(path.join(root, "dev-only.txt"), "dev line\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["dev-only.txt"] }));
  const devAdvance = await requireSuccess(callGit(registry, root, "commit", { message: "dev advance" }));
  const mergedDev = await requireSuccess(callGit(registry, root, "merge_branch", {
    sourceBranch: "main",
    targetBranch: "dev",
    mode: "merge",
  }));
  assert.notEqual(mergedDev.payload.commit, hotfix.payload.commit);
  assert.notEqual(mergedDev.payload.commit, devAdvance.payload.commit);
  assert.equal(git(root, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(" ").length, 3);

  const deleted = await requireSuccess(callGit(registry, root, "delete_branch", { branchName: "hotfix/release" }));
  assert.equal(deleted.payload.deletedCommit, hotfix.payload.commit);
  assert.equal(gitLines(root, ["branch", "--list", "hotfix/release"]).length, 0);
  const currentDelete = await callGit(registry, root, "delete_branch", { branchName: "dev" });
  assert.equal(currentDelete.ok, false);

  await requireSuccess(callGit(registry, root, "prepare_branch", { branchName: "unmerged/work" }));
  fs.writeFileSync(path.join(root, "unmerged.txt"), "unmerged\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["unmerged.txt"] }));
  await requireSuccess(callGit(registry, root, "commit", { message: "unmerged work" }));
  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  const unmergedDelete = await callGit(registry, root, "delete_branch", { branchName: "unmerged/work" });
  assert.equal(unmergedDelete.ok, false);
  assert.equal(gitLines(root, ["branch", "--list", "unmerged/work"]).length, 1);
});

test("merge_branch reports conflicts and aborts the merge without resolving or rewriting history", async () => {
  const root = createBoundWorkspace("champcity-git-merge-conflict-", true);
  fs.writeFileSync(path.join(root, "shared.txt"), "baseline\n", "utf8");
  commitAllFixtureState(root, "fixture baseline");
  const registry = registryFor(root);
  await requireSuccess(callGit(registry, root, "prepare_branch", { branchName: "hotfix/conflict" }));
  fs.writeFileSync(path.join(root, "shared.txt"), "hotfix\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["shared.txt"] }));
  await requireSuccess(callGit(registry, root, "commit", { message: "hotfix conflict side" }));
  await requireSuccess(callGit(registry, root, "switch_branch", { branchName: "dev" }));
  fs.writeFileSync(path.join(root, "shared.txt"), "development\n", "utf8");
  await requireSuccess(callGit(registry, root, "stage_changes", { paths: ["shared.txt"] }));
  const dev = await requireSuccess(callGit(registry, root, "commit", { message: "dev conflict side" }));

  const conflict = await callGit(registry, root, "merge_branch", {
    sourceBranch: "hotfix/conflict",
    targetBranch: "dev",
    mode: "merge",
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error.code, "GIT_EXECUTION_FAILED");
  assert.deepEqual(conflict.error.details.conflictingPaths, ["shared.txt"]);
  assert.equal(conflict.error.details.mergeAborted, true);
  assert.equal(conflict.error.details.mergeInProgress, false);
  assert.equal(git(root, ["rev-parse", "HEAD"]), dev.payload.commit);
  assert.equal(git(root, ["status", "--porcelain=v1"]), "");
});

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

function createTagDeletionFixture() {
  const root = createBoundWorkspace("champcity-delete-tag-", true);
  commitAllFixtureState(root, "candidate source remains history");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "tag-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  git(root, ["remote", "add", "origin", remote]);
  git(root, ["push", "--", "origin", "refs/heads/dev:refs/heads/dev"]);
  return { root, remote, baseline, registry: registryFor(root), tagName: "v1.2.3-beta.1" };
}

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

test("OAuth, workspace registration, Git-backed state, action, and parameter gates remain enforced", async () => {
  const root = createBoundWorkspace("champcity-git-security-boundary-", true);
  const registry = registryFor(root);
  const tool = registry.listTools("files.read files.write").find((entry) => entry.name === "git_toolbox");
  assert.ok(tool);
  assert.equal(tool.inputZodSchema.safeParse({
    workspaceId: "alpha",
    action: "stage_changes",
    params: { paths: ["one.txt", "two/*.ts"] },
  }).success, true);
  assert.equal(tool.inputZodSchema.safeParse({
    workspaceId: "alpha",
    action: "merge_branch",
    params: { sourceBranch: "hotfix/one", targetBranch: "dev", mode: "merge" },
  }).success, true);
  for (const input of [
    { workspaceId: "alpha", action: "stage_changes", params: { paths: [] } },
    { workspaceId: "alpha", action: "stage_changes", params: { paths: "one.txt" } },
    { workspaceId: "alpha", action: "commit", params: {} },
    { workspaceId: "alpha", action: "push", params: { force: true } },
    { workspaceId: "alpha", action: "integrate_to_dev", params: { branch: "main" } },
    { workspaceId: "alpha", action: "merge_branch", params: { targetBranch: "dev" } },
    { workspaceId: "alpha", action: "merge_branch", params: { sourceBranch: "hotfix/one", mode: "force" } },
    { workspaceId: "alpha", action: "create_tag", params: { tagName: "v1" } },
    { workspaceId: "alpha", action: "create_tag", params: { tagName: "v1", tagType: "signed" } },
    { workspaceId: "alpha", action: "delete_branch", params: { branchName: "old", force: true } },
    { workspaceId: "alpha", action: "raw_git", params: { args: ["reset", "--hard"] } },
  ]) {
    assert.equal(tool.inputZodSchema.safeParse(input).success, false);
  }

  const deniedByScope = await callGit(registry, root, "stage_changes", { paths: ["README.md"] }, "files.read");
  assert.equal(deniedByScope.ok, false);
  assert.equal(deniedByScope.error.code, "OAUTH_SCOPE_DENIED");

  const foreign = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "foreign", action: "stage_changes", params: { paths: ["README.md"] } },
    scope: "files.write",
  });
  assert.equal(foreign.ok, false);
  assert.equal(foreign.error.code, "WORKSPACE_ACCESS_DENIED");

  const unknownAction = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "alpha", action: "raw_git", params: { args: ["status"] } },
    scope: "files.write",
  });
  assert.equal(unknownAction.ok, false);
  assert.equal(unknownAction.error.code, "INVALID_INPUT");

  const malformedParams = await registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId: "alpha", action: "stage_changes", params: { paths: [] } },
    scope: "files.write",
  });
  assert.equal(malformedParams.ok, false);
  assert.equal(malformedParams.error.code, "INVALID_INPUT");
  assert.equal(git(root, ["diff", "--cached", "--name-only"]), "");

  const nonGitRoot = createBoundWorkspace("champcity-git-non-git-boundary-", false);
  const nonGitResult = await callGit(registryFor(nonGitRoot), nonGitRoot, "stage_changes", { paths: ["README.md"] });
  assert.equal(nonGitResult.ok, false);
  assert.equal(nonGitResult.error.code, "GIT_CAPABILITY_UNAVAILABLE");
});

test("governance and Desktop architecture describe Operator authority and MCP execution boundaries", () => {
  const governance = readSource("docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md");
  const architecture = readSource("docs/architecture/DESKTOP_ARCHITECTURE.md");

  for (const document of [governance, architecture]) {
    assert.match(document, /human Operator is the only authority/i);
    assert.match(document, /Work Cards?[^.]*Repair Cards?[^.]*(?:cannot serve|none[^.]*can serve) as (?:a )?permission principals?/is);
  }
  assert.match(architecture, /MCP does not.*(?:interpret|read).*planning|MCP does not.*interpret.*card/is);
  assert.match(architecture, /files\.write/);
  assert.match(architecture, /registered workspace|registered-project/i);
  assert.match(governance, /machine permission grant/i);
  assert.doesNotMatch(governance, /versioned grant|machine permission grant.*exact heading|token-only/i);
});

test("Agent Harness production vocabulary contains no non-Operator authority terminology", () => {
  const source = readSourceTree("src/main/agentHarness");
  assert.doesNotMatch(source, /authority/i);
  assert.equal(fs.existsSync(path.join(repositoryRoot, "src/main/agentHarness/workspace/workspaceAccess.ts")), true);
});

function createBoundWorkspace(prefix, gitBacked) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const root = path.join(container, "Alpha");
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(root, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({
    mcpWorkspaceId: "alpha",
    label: "Alpha Test Workspace",
    repositoryName: "Test/Alpha",
    gitBacked,
  }, null, 2), "utf8");
  if (gitBacked) {
    execFileSync("git", ["init", "-b", "dev"], { cwd: root, stdio: "ignore" });
    configureGitIdentity(root);
  }
  fs.writeFileSync(path.join(root, "README.md"), "temporary repository\n", "utf8");
  return root;
}

function configureGitIdentity(root) {
  execFileSync("git", ["config", "user.name", "ChampCity Test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "champcity-test@example.invalid"], { cwd: root, stdio: "ignore" });
}

function registryFor(root) {
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(root);
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: path.join(path.dirname(root), "user-data") });
}

function readSourceTree(relativeRoot) {
  const pending = [path.join(repositoryRoot, relativeRoot)];
  const sources = [];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(target);
      } else if (entry.isFile() && target.endsWith(".ts")) {
        sources.push(fs.readFileSync(target, "utf8"));
      }
    }
  }
  return sources.join("\n");
}

function callGit(registry, root, action, params, scope = "files.read files.write") {
  const workspaceId = resolveWorkspaceRootContext(root).workspaceId;
  return registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId, action, ...(params === undefined ? {} : { params }) },
    scope,
  });
}

async function requireSuccess(promise) {
  const result = await promise;
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return result;
}

function commitAllFixtureState(root, message) {
  execFileSync("git", ["add", "--all", "--", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd: root, stdio: "ignore" });
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function gitLines(root, args) {
  const value = git(root, args);
  return value ? value.split(/\r?\n/).sort() : [];
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}
