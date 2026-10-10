const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const repositoryRoot = path.resolve(__dirname, "../..");
const { AgentHarnessError } = require("../../dist/main/core/applicationErrors.js");
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
  createGitToolboxWorkspace,
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
    "src/main/repository/gitMutations.ts",
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
  const root = createGitToolboxWorkspace("champcity-git-mutations-success-");
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
  const root = createGitToolboxWorkspace("champcity-git-branch-state-");
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
  const root = createGitToolboxWorkspace("champcity-git-merge-lifecycle-");
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
  const root = createGitToolboxWorkspace("champcity-git-merge-conflict-");
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
  const root = createGitToolboxWorkspace("champcity-git-security-boundary-");
  const registry = registryFor(root);
  const tool = registry.listTools("files.read files.write").find((entry) => entry.name === "git_toolbox");
  assert.ok(tool);
  assert.equal(tool.inputZodSchema.safeParse({
    workspaceId: "alpha",
    action: "stage_changes",
    params: { repositoryCheckoutId: "fixture-checkout", paths: ["one.txt", "two/*.ts"] },
  }).success, true);
  assert.equal(tool.inputZodSchema.safeParse({
    workspaceId: "alpha",
    action: "merge_branch",
    params: { repositoryCheckoutId: "fixture-checkout", sourceBranch: "hotfix/one", targetBranch: "dev", mode: "merge" },
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
    arguments: { workspaceId: "alpha", action: "stage_changes", params: { repositoryCheckoutId: "fixture-checkout", paths: [] } },
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

// Reuse this capability owner: local target authorization is exercised through
// the production registry and SDK transport, without a Project or workspace.
const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
function localFixture(t, options = {}) {
  const trusted = fs.mkdtempSync(path.join(os.tmpdir(), "localgit01-"));
  t.after(() => fs.rmSync(trusted, { recursive: true, force: true }));
  let roots = options.roots ?? [trusted];
  const access = new LocalGitRepositoryAccessService(() => roots, options.now);
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(trusted, "harness"), localGitAccess: access,
    workspaceAccess: createRegisteredWorkspaceAccessProvider({ resolveWorkspaceContext: () => { throw new Error("Local target attempted workspace registration/resolution"); }, listWorkspaceSummaries: () => [] }) });
  const invoke = (action, params, scope = "files.read files.write", extra = {}) => registry.callTool({ name: "git_toolbox", scope, arguments: { action, params, ...extra } });
  const success = async (action, params) => { const result = await invoke(action, params); assert.equal(result.ok, true, JSON.stringify(result)); return result.payload; };
  const source = (name = "arbitrary-source") => { const directory = path.join(trusted, name); fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, "source.txt"), "original source\n"); return directory; };
  return { trusted, access, registry, invoke, success, source, setRoots: next => { roots = next; } };
}
const localIdentity = root => {
  // Fixture identity is a prerequisite, never a product-created Git identity.
  fs.appendFileSync(path.join(root, ".git", "config"), "\n[user]\n\tname = Local Git Test\n\temail = local@example.invalid\n");
};

test("LOCALGIT01 published MCP bootstraps and promotes remote-free sibling worktrees without registration", { timeout: 90000 }, async t => {
  const fixture = localFixture(t);
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const { startAgentHarnessHttpRuntime } = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: path.join(fixture.trusted, "harness"), registry: fixture.registry, allowUnauthenticatedLocal: true });
  let client;
  t.after(async () => { await client?.close(); await runtime.close(); });
  const connect = async () => { client = new Client({ name: "localgit01-proof", version: "1" }); await client.connect(new StreamableHTTPClientTransport(new URL(runtime.url))); };
  await connect();
  const definition = (await client.listTools()).tools.find(tool => tool.name === "git_toolbox");
  const names = definition.inputSchema.oneOf.map(branch => branch.properties.action.const);
  for (const name of ["discover_local_repositories", "init_local_repository", "create_local_worktree", "remove_local_worktree"]) assert.ok(names.includes(name));
  const contract = fixture.registry.listTools().find(tool => tool.name === "git_toolbox");
  assert.equal(contract.inputZodSchema.safeParse({ action: "status", params: { localCheckoutHandle: "opaque" } }).success, true);
  assert.equal(contract.inputZodSchema.safeParse({ workspaceId: "legacy", action: "status", params: { repositoryCheckoutId: "legacy-checkout" } }).success, true);
  assert.equal(contract.inputZodSchema.safeParse({ workspaceId: "legacy", action: "status", params: { localCheckoutHandle: "opaque" } }).success, false);
  const invoke = async (action, params) => { const result = await client.callTool({ name: "git_toolbox", arguments: { action, params } }); const body = result.structuredContent; assert.equal(body?.ok, true, JSON.stringify(result)); return body.payload; };
  const primaryRoot = fixture.source("dev");
  const original = fs.readFileSync(path.join(primaryRoot, "source.txt"));
  const initialized = await invoke("init_local_repository", { directory: primaryRoot, initialBranch: "dev" });
  assert.equal(initialized.unborn, true); assert.equal(initialized.headCommit, null); assert.equal(initialized.noRemote, true);
  assert.deepEqual(fs.readFileSync(path.join(primaryRoot, "source.txt")), original);
  const dev = initialized.localCheckoutHandle;
  assert.equal((await invoke("status", { localCheckoutHandle: dev })).unborn, true);
  localIdentity(primaryRoot);
  await invoke("stage_changes", { localCheckoutHandle: dev, paths: ["source.txt"] });
  const first = (await invoke("commit", { localCheckoutHandle: dev, message: "Initial local source" })).commit;
  await invoke("create_branch_from_ref", { localCheckoutHandle: dev, branchName: "main", sourceRef: first });
  const mainRoot = path.join(fixture.trusted, "main");
  const main = (await invoke("create_local_worktree", { localCheckoutHandle: dev, destinationDirectory: mainRoot, branchName: "main" })).localCheckoutHandle;
  assert.equal(fs.statSync(path.join(mainRoot, ".git")).isFile(), true);
  assert.equal(fs.realpathSync(path.resolve(primaryRoot, git(primaryRoot, ["rev-parse", "--git-common-dir"]))), fs.realpathSync(path.resolve(mainRoot, git(mainRoot, ["rev-parse", "--git-common-dir"]))));
  const discovered = await invoke("discover_local_repositories", { directory: fixture.trusted });
  assert.equal(discovered.repositories.length, 1); assert.equal(discovered.repositories[0].checkouts.length, 2);
  assert.deepEqual(discovered.repositories[0].checkouts.map(checkout => [checkout.branchName, checkout.primary, checkout.clean, checkout.headCommit, checkout.noRemote]), [["dev", true, true, first, true], ["main", false, true, first, true]]);
  assert.equal(JSON.stringify(discovered).includes(fixture.trusted), false);
  fs.writeFileSync(path.join(primaryRoot, "source.txt"), "promoted source\n");
  await invoke("stage_changes", { localCheckoutHandle: dev, paths: ["source.txt"] });
  const second = (await invoke("commit", { localCheckoutHandle: dev, message: "Dev advance" })).commit;
  assert.equal(git(mainRoot, ["rev-parse", "HEAD"]), first);
  assert.equal((await fixture.invoke("advance_branch_ref", { localCheckoutHandle: dev, branchName: "main", sourceRef: second, expectedCurrentCommit: first })).ok, false, "checked-out branch guard survives local routing");
  await invoke("merge_branch", { localCheckoutHandle: main, sourceBranch: "dev", mode: "ff-only" });
  assert.equal(git(mainRoot, ["rev-parse", "HEAD"]), second);
  for (const handle of [dev, main]) { const state = await invoke("status", { localCheckoutHandle: handle }); assert.equal(state.clean, true); assert.equal(state.headCommit, second); assert.equal(state.noRemote, true); }
  await invoke("create_tag", { localCheckoutHandle: main, tagName: "local-proof", tagType: "lightweight", target: second });
  await invoke("delete_tag", { localCheckoutHandle: main, tagName: "local-proof" });
  assert.equal(git(primaryRoot, ["tag", "--list"]), "");
  assert.equal((await invoke("list_worktrees", { localCheckoutHandle: dev })).length, 2);
  assert.equal((await invoke("inspect_worktree", { localCheckoutHandle: main })).primary, false);
  const newBranch = await invoke("create_local_worktree", { localCheckoutHandle: dev, destinationDirectory: path.join(fixture.trusted, "other"), branchName: "feature/exact", sourceRef: first });
  assert.equal(newBranch.headCommit, first); assert.equal(git(primaryRoot, ["rev-parse", "HEAD"]), second);
  await invoke("remove_local_worktree", { localCheckoutHandle: newBranch.localCheckoutHandle, expectedBranch: "feature/exact" });
  assert.equal(git(primaryRoot, ["rev-parse", "refs/heads/feature/exact"]), first);
  await client.close(); await connect();
  assert.equal((await invoke("discover_local_repositories", { directory: mainRoot })).repositories[0].checkouts.length, 2);
  assert.equal(fs.existsSync(path.join(primaryRoot, ".champcity")), false); assert.equal(fs.existsSync(path.join(primaryRoot, "planning")), false);
  t.diagnostic(`Built MCP local bootstrap and main promotion verified; commits ${first} -> ${second}; no remote, Project, Workflow or SQL.`);
});

test("LOCALGIT01 trust, expiry, redirects and helper suppression fail closed without registration", { timeout: 90000 }, async t => {
  let now = Date.now(); const f = localFixture(t, { roots: [], now: () => now });
  const root = f.source(); const bytes = fs.readFileSync(path.join(root, "source.txt"));
  assert.equal((await f.invoke("init_local_repository", { directory: root, initialBranch: "dev" })).error.code, "WORKSPACE_ACCESS_DENIED");
  f.setRoots([f.trusted]);
  assert.equal((await f.invoke("init_local_repository", { directory: root, initialBranch: "../bad" })).ok, false);
  assert.equal(fs.existsSync(path.join(root, ".git")), false);
  for (const action of ["init_local_repository", "discover_local_repositories"]) assert.equal((await f.invoke(action, { directory: path.dirname(f.trusted), ...(action.startsWith("init") ? { initialBranch: "dev" } : {}) })).ok, false);
  const init = await f.success("init_local_repository", { directory: root, initialBranch: "topic" }); const handle = init.localCheckoutHandle;
  const metadata = fs.readFileSync(path.join(root, ".git", "config"));
  assert.equal((await f.invoke("init_local_repository", { directory: root, initialBranch: "main" })).ok, false);
  assert.deepEqual(fs.readFileSync(path.join(root, ".git", "config")), metadata); assert.deepEqual(fs.readFileSync(path.join(root, "source.txt")), bytes);
  assert.equal((await f.invoke("create_local_worktree", { localCheckoutHandle: handle, destinationDirectory: path.join(f.trusted, "unborn"), branchName: "main", sourceRef: "HEAD" })).ok, false);
  for (const [action, params] of [["init_local_repository", { directory: f.source("read-only"), initialBranch: "dev" }], ["stage_changes", { localCheckoutHandle: handle, paths: ["source.txt"] }], ["commit", { localCheckoutHandle: handle, message: "denied" }], ["merge_branch", { localCheckoutHandle: handle, sourceBranch: "dev", mode: "ff-only" }], ["create_local_worktree", { localCheckoutHandle: handle, destinationDirectory: path.join(f.trusted, "denied"), branchName: "main" }], ["remove_local_worktree", { localCheckoutHandle: handle, expectedBranch: "topic" }]]) assert.equal((await f.invoke(action, params, "files.read")).error.code, "OAUTH_SCOPE_DENIED");
  assert.equal((await f.invoke("status", { localCheckoutHandle: handle, repositoryCheckoutId: "collision" })).error.code, "INVALID_INPUT");
  assert.equal((await f.invoke("status", { localCheckoutHandle: handle }, undefined, { workspaceId: "collision" })).error.code, "INVALID_INPUT");
  assert.equal((await f.invoke("status", { localCheckoutHandle: init.repositoryHandle })).ok, false);
  assert.equal((await f.invoke("status", { localCheckoutHandle: "not-a-handle" })).ok, false);
  const nested = path.join(root, "nested"); fs.mkdirSync(nested);
  assert.equal((await f.invoke("init_local_repository", { directory: nested, initialBranch: "main" })).ok, false);
  localIdentity(root);
  // Hooks and filters would create evidence if any repository program ran.
  const marker = path.join(f.trusted, "invoked.txt");
  const script = path.join(f.trusted, "helper.cjs"); fs.writeFileSync(script, `require('node:fs').writeFileSync(${JSON.stringify(marker)},'unsafe');`);
  const helperCommand = `node "${script.replaceAll("\\", "/")}"`;
  git(root, ["config", "filter.untrusted.clean", helperCommand]); git(root, ["config", "filter.untrusted.smudge", helperCommand]); git(root, ["config", "filter.untrusted.required", "true"]);
  git(root, ["config", "core.fsmonitor", helperCommand]); git(root, ["config", "credential.helper", `!${helperCommand}`]);
  git(root, ["config", "diff.untrusted.textconv", helperCommand]);
  fs.writeFileSync(path.join(root, ".gitattributes"), "source.txt filter=untrusted diff=untrusted\n");
  fs.mkdirSync(path.join(root, ".git", "hooks"), { recursive: true });
  fs.writeFileSync(path.join(root, ".git", "hooks", "pre-commit"), `#!/bin/sh\n${helperCommand}\n`, { mode: 0o755 });
  await f.success("stage_changes", { localCheckoutHandle: handle, paths: ["source.txt", ".gitattributes"] });
  const first = (await f.success("commit", { localCheckoutHandle: handle, message: "No external helpers" })).commit;
  await f.success("inspect_commit", { localCheckoutHandle: handle, ref: first, includePatch: true });
  git(root, ["remote", "add", "trap", `ext::${helperCommand}`]);
  assert.equal((await f.invoke("fetch_remote", { localCheckoutHandle: handle, remote: "trap" })).ok, false);
  git(root, ["remote", "remove", "trap"]);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(git(root, ["show", `${first}:source.txt`]), "original source");
  const mainRoot = path.join(f.trusted, "linked"); const main = await f.success("create_local_worktree", { localCheckoutHandle: handle, destinationDirectory: mainRoot, branchName: "main", sourceRef: first });
  assert.equal(fs.existsSync(marker), false);
  assert.equal((await f.invoke("remove_local_worktree", { localCheckoutHandle: handle, expectedBranch: "topic" })).ok, false);
  assert.equal((await f.invoke("remove_local_worktree", { localCheckoutHandle: main.localCheckoutHandle, expectedBranch: "wrong" })).ok, false);
  fs.writeFileSync(path.join(mainRoot, "untracked.txt"), "preserve");
  assert.equal((await f.invoke("remove_local_worktree", { localCheckoutHandle: main.localCheckoutHandle, expectedBranch: "main" })).ok, false);
  assert.equal(fs.readFileSync(path.join(mainRoot, "untracked.txt"), "utf8"), "preserve");
  fs.unlinkSync(path.join(mainRoot, "untracked.txt"));
  fs.writeFileSync(path.join(mainRoot, "source.txt"), "dirty");
  assert.equal((await f.invoke("remove_local_worktree", { localCheckoutHandle: main.localCheckoutHandle, expectedBranch: "main" })).ok, false);
  fs.writeFileSync(path.join(mainRoot, "source.txt"), bytes);
  const collision = f.source("collision");
  assert.equal((await f.invoke("create_local_worktree", { localCheckoutHandle: handle, destinationDirectory: collision, branchName: "collision", sourceRef: first })).ok, false);
  assert.equal(git(root, ["branch", "--list", "collision"]), "");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "localgit01-outside-")); t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const redirect = path.join(f.trusted, "redirect"); fs.symlinkSync(outside, redirect, process.platform === "win32" ? "junction" : "dir");
  assert.equal((await f.invoke("discover_local_repositories", { directory: redirect })).ok, false);
  assert.equal((await f.invoke("create_local_worktree", { localCheckoutHandle: handle, destinationDirectory: path.join(redirect, "escape"), branchName: "escape", sourceRef: first })).ok, false);
  const pointer = fs.readFileSync(path.join(mainRoot, ".git"));
  const replaceControl = (file, content) => { const fd = fs.openSync(file, "r+"); try { fs.ftruncateSync(fd); fs.writeFileSync(fd, content); } finally { fs.closeSync(fd); } };
  replaceControl(path.join(mainRoot, ".git"), `gitdir: ${path.join(outside, ".git")}\n`);
  assert.equal((await f.invoke("status", { localCheckoutHandle: main.localCheckoutHandle })).ok, false);
  replaceControl(path.join(mainRoot, ".git"), pointer);
  const gitDir = path.resolve(mainRoot, git(mainRoot, ["rev-parse", "--git-dir"]));
  const commonFile = path.join(gitDir, "commondir"), commonBytes = fs.readFileSync(commonFile);
  fs.writeFileSync(commonFile, outside); assert.equal((await f.invoke("status", { localCheckoutHandle: main.localCheckoutHandle })).ok, false); fs.writeFileSync(commonFile, commonBytes);
  const alternate = path.join(root, ".git", "objects", "info", "alternates"); fs.writeFileSync(alternate, outside);
  assert.equal((await f.invoke("status", { localCheckoutHandle: handle })).ok, false); fs.unlinkSync(alternate);
  f.setRoots([]); assert.equal((await f.invoke("stage_changes", { localCheckoutHandle: handle, paths: ["source.txt"] })).error.code, "WORKSPACE_ACCESS_DENIED"); f.setRoots([f.trusted]);
  now += 31 * 60_000; assert.equal((await f.invoke("status", { localCheckoutHandle: handle })).ok, false);
  const rediscovered = await f.success("discover_local_repositories", { directory: root }); assert.notEqual(rediscovered.repositories[0].checkouts[0].localCheckoutHandle, handle);
  const fresh = rediscovered.repositories[0].checkouts[0].localCheckoutHandle;
  if (process.platform === "win32") {
    const variedPath = await f.invoke("discover_local_repositories", { directory: root.toUpperCase() });
    assert.equal(variedPath.ok, true, JSON.stringify(variedPath));
    assert.equal(variedPath.payload.repositories[0].checkouts[0].localCheckoutHandle, fresh);
    const metadata = path.join(root, ".git"), mixedMetadata = path.join(root, ".GiT");
    fs.renameSync(metadata, mixedMetadata);
    assert.equal((await f.invoke("status", { localCheckoutHandle: fresh })).ok, false, "altered metadata naming must still match Git's actual worktree inventory");
    fs.renameSync(mixedMetadata, metadata);
    const config = path.join(metadata, "config"), upper = path.join(metadata, "CONFIG"), before = fs.readFileSync(config);
    fs.appendFileSync(config, `\n[include]\n\tpath = ${path.join(outside, "untrusted-config").replaceAll("\\", "/")}\n`);
    fs.renameSync(config, upper);
    assert.equal((await f.invoke("status", { localCheckoutHandle: fresh })).error.code, "WORKSPACE_ACCESS_DENIED");
    fs.renameSync(upper, config); fs.writeFileSync(config, before);
  }
  const other = f.source("unrelated"); const otherInit = await f.success("init_local_repository", { directory: other, initialBranch: "ordinary" }); localIdentity(other);
  const otherPointer = path.join(other, ".git");
  const otherMetadata = `${otherPointer}-saved`; fs.renameSync(otherPointer, otherMetadata);
  fs.cpSync(otherMetadata, otherPointer, { recursive: true });
  assert.equal((await f.invoke("status", { localCheckoutHandle: otherInit.localCheckoutHandle })).ok, false);
  fs.rmSync(otherPointer, { recursive: true }); fs.renameSync(otherMetadata, otherPointer);
  const swapPointer = fs.readFileSync(path.join(mainRoot, ".git"));
  replaceControl(path.join(mainRoot, ".git"), `gitdir: ${otherPointer}\n`);
  assert.equal((await f.invoke("stage_changes", { localCheckoutHandle: rediscovered.repositories[0].checkouts.find(checkout => !checkout.primary).localCheckoutHandle, paths: ["source.txt"] })).ok, false);
  replaceControl(path.join(mainRoot, ".git"), swapPointer);
  assert.equal((await f.invoke("create_local_worktree", { localCheckoutHandle: rediscovered.repositories[0].checkouts[0].localCheckoutHandle, destinationDirectory: path.join(root, ".git", "control-target"), branchName: "control", sourceRef: first })).ok, false);
  const reopened = new LocalGitRepositoryAccessService(() => [f.trusted]);
  const newRegistry = createAgentHarnessToolRegistry({ userDataRoot: path.join(f.trusted, "fresh-harness"), localGitAccess: reopened, workspaceAccess: createRegisteredWorkspaceAccessProvider({ resolveWorkspaceContext: () => { throw new Error("Registration forbidden"); }, listWorkspaceSummaries: () => [] }) });
  const call = (action, params, name = "git_toolbox") => newRegistry.callTool({ name, scope: "files.read files.write", arguments: { action, params } });
  assert.equal((await call("status", { localCheckoutHandle: otherInit.localCheckoutHandle })).ok, false);
  const result = await call("discover_local_repositories", { directory: other }); const unrelatedHandle = result.payload.repositories[0].checkouts[0].localCheckoutHandle;
  fs.writeFileSync(path.join(other, "clean"), "command-looking filename"); fs.writeFileSync(path.join(other, "diff"), "another filename");
  assert.equal((await call("stage_changes", { localCheckoutHandle: unrelatedHandle, paths: ["source.txt", "clean", "diff"] })).ok, true);
  assert.equal((await call("commit", { localCheckoutHandle: unrelatedHandle, message: "log" })).ok, true);
  assert.equal((await call("prepare_branch", { localCheckoutHandle: unrelatedHandle, branchName: "clean" })).ok, true);
  const capped = await call("discover_local_repositories", { directory: f.trusted, maxDepth: 0 }); assert.equal(capped.payload.partial, true); assert.ok(capped.payload.reasons.includes("depth-limit"));
  assert.equal((await call("discover_local_repositories", { directory: other, maxDepth: 0 })).payload.repositories.length, 1, "exact root is discovered before traversal caps");
  const dangling = path.join(f.trusted, "linked-missing"); fs.renameSync(mainRoot, dangling);
  assert.equal((await call("discover_local_repositories", { directory: root })).ok, false); fs.renameSync(dangling, mainRoot);
  for (const name of ["repo_toolbox", "release_toolbox", "test_toolbox"]) assert.equal((await call("status", { localCheckoutHandle: unrelatedHandle }, name)).ok, false);
  assert.equal(fs.existsSync(marker), false);
});
