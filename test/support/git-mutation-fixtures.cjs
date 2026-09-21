const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const { createRegisteredWorkspaceAccessProvider, resolveWorkspaceRootContext } = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const { parseCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");

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

module.exports = {
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
};
