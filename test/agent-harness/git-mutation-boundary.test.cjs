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
  for (const input of [
    { workspaceId: "alpha", action: "stage_changes", params: { paths: [] } },
    { workspaceId: "alpha", action: "stage_changes", params: { paths: "one.txt" } },
    { workspaceId: "alpha", action: "commit", params: {} },
    { workspaceId: "alpha", action: "push", params: { force: true } },
    { workspaceId: "alpha", action: "integrate_to_dev", params: { branch: "main" } },
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
    assert.match(document, /MCP does not.*(?:interpret|read).*planning|MCP does not.*interpret.*card/is);
    assert.match(document, /files\.write/);
    assert.match(document, /registered workspace|registered-project/i);
  }
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
