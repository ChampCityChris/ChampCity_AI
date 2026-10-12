const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { AgentHarnessError } = require("../../dist/main/core/applicationErrors.js");
const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const { createRegisteredWorkspaceAccessProvider, resolveWorkspaceRootContext } = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const { parseCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");

function createTagDeletionFixture() {
  const root = createGitToolboxWorkspace("champcity-delete-tag-");
  commitAllFixtureState(root, "candidate source remains history");
  const baseline = git(root, ["rev-parse", "HEAD"]);
  const remote = path.join(path.dirname(root), "tag-remote.git");
  execFileSync("git", ["init", "--bare", remote], { stdio: "ignore" });
  git(root, ["remote", "add", "origin", remote]);
  git(root, ["push", "--", "origin", "refs/heads/dev:refs/heads/dev"]);
  return { root, remote, baseline, registry: registryFor(root), tagName: "v1.2.3-beta.1" };
}

function createGitToolboxWorkspace(prefix) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const project = path.join(container, "Alpha");
  const root = path.join(project, "Dev");
  fs.mkdirSync(path.join(project, ".champcity"), { recursive: true });
  fs.writeFileSync(path.join(project, ".champcity", "mcp-workspace-binding.json"), JSON.stringify({ mcpWorkspaceId: "alpha", repositoryName: "Test/Alpha", gitBacked: false }), "utf8");
  fs.mkdirSync(root, { recursive: true });
  execFileSync("git", ["init", "-b", "dev"], { cwd: root, stdio: "ignore" });
  configureGitIdentity(root);
  fs.writeFileSync(path.join(root, "README.md"), "temporary repository\n", "utf8");
  return root;
}

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
  const projectRoot = path.basename(root) === "Dev" ? path.dirname(root) : root;
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
      const context = resolveWorkspaceRootContext(projectRoot);
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [],
    resolveRepositoryCheckoutContext: async (workspaceId, repositoryCheckoutId) => {
      if (repositoryCheckoutId !== "fixture-checkout") throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Repository checkout is not registered.");
      const context = resolveWorkspaceRootContext(projectRoot);
      if (workspaceId !== context.workspaceId) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Project workspace is not registered.");
      const checkoutRoot = path.basename(root) === "Dev" ? root : context.root;
      if (!fs.existsSync(path.join(checkoutRoot, ".git"))) throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "Fixture Git checkout is unavailable.");
      return { workspaceId: context.workspaceId, root: checkoutRoot, checkout: { repositoryCheckoutId, repositoryId: "fixture-repository", sourceLineId: "dev", role: "dev", projectRelativePath: "Dev" }, release: () => {} };
    },
    listRepositoryCheckoutSummaries: async () => [],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: path.join(path.dirname(root), "user-data") });
}

function callGit(registry, root, action, params, scope = "files.read files.write") {
  const workspaceRoot = path.basename(root) === "Dev" ? path.dirname(root) : root;
  const workspaceId = resolveWorkspaceRootContext(workspaceRoot).workspaceId;
  return registry.callTool({
    name: "git_toolbox",
    arguments: { workspaceId, action, params: { repositoryCheckoutId: "fixture-checkout", ...(params ?? {}) } },
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

module.exports = {
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
};
