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

test("Git dispatch and mutation modules do not import workflow decision services", () => {
  const forbiddenDirectories = [
    "src/main/workCardLoop",
    "src/main/currentWorkflow",
    "src/main/issueResolution",
  ].map((relativePath) => path.resolve(repositoryRoot, relativePath));
  const forbiddenModules = [
    "src/main/documents/planningDocumentService",
    "src/main/documents/gitMutationAuthorization",
  ].map((relativePath) => path.resolve(repositoryRoot, relativePath));

  for (const relativePath of [
    "src/main/agentHarness/tools/toolRegistry.ts",
    "src/main/agentHarness/repository/gitMutations.ts",
    "src/main/sourceControl/sourceControlService.ts",
  ]) {
    const filePath = path.join(repositoryRoot, relativePath);
    const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        specifier = node.moduleSpecifier;
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        specifier = node.moduleReference.expression;
      } else if (ts.isCallExpression(node) && (
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")
      )) {
        specifier = node.arguments[0];
      }
      if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith(".")) {
        const target = path.resolve(path.dirname(filePath), specifier.text);
        const forbidden = forbiddenDirectories.some((directory) => target === directory || target.startsWith(`${directory}${path.sep}`)) ||
          forbiddenModules.some((modulePath) => [modulePath, `${modulePath}.ts`, `${modulePath}.js`].includes(target));
        assert.equal(forbidden, false, `${relativePath} imports workflow decision service ${specifier.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
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
