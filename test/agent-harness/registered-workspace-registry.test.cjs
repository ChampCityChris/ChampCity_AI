const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const {
  getRegisteredWorkspaceRegistryPath,
  RegisteredWorkspaceRegistry,
} = require("../../dist/main/agentHarness/workspace/registeredWorkspaceRegistry.js");

test("registered workspace registry durably stores two exact projects and re-registration is idempotent", async () => {
  const fixture = createFixture();
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: fixture.userDataRoot });

  assert.equal((await registry.register(fixture.projectA)).workspaceId, "project_a");
  assert.equal((await registry.register(fixture.projectB)).workspaceId, "project_b");
  assert.equal((await registry.register(fixture.projectA)).workspaceId, "project_a");
  assert.deepEqual(registry.snapshot().workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);

  const stored = JSON.parse(fs.readFileSync(getRegisteredWorkspaceRegistryPath(fixture.userDataRoot), "utf8"));
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.workspaces.length, 2);
  assert.deepEqual(Object.keys(stored.workspaces[0]).sort(), ["canonicalRoot", "workspaceId"]);
  assert.equal(JSON.stringify(stored).includes("needle"), false);

  const reloaded = new RegisteredWorkspaceRegistry({ userDataRoot: fixture.userDataRoot });
  await reloaded.initialize();
  assert.deepEqual(reloaded.snapshot().workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);
});

test("exact workspaceId selects simultaneous registered workspace access and unknown IDs fail closed", async () => {
  const fixture = createFixture();
  const service = new AgentHarnessService({ userDataRoot: fixture.userDataRoot, allowUnauthenticatedLocal: true });
  await service.registerWorkspaceRoot(fixture.projectA);
  await service.registerWorkspaceRoot(fixture.projectB);
  const tools = service.toolRegistry();

  for (const [workspaceId, expected] of [["project_a", "needle A"], ["project_b", "needle B"], ["project_a", "needle A"]]) {
    const result = await tools.callTool({
      name: "repo_toolbox",
      scope: "files.read",
      arguments: { workspaceId, action: "read_file", params: { relativePath: "README.md" } },
    });
    assert.equal(result.ok, true);
    assert.match(result.payload.content, new RegExp(expected));
  }

  const unknown = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "project_c", action: "read_file", params: { relativePath: "README.md" } },
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, "WORKSPACE_ACCESS_DENIED");

  const diagnostics = await tools.callTool({
    name: "diagnostics_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "project_a", action: "list_workspaces" },
  });
  assert.equal(diagnostics.ok, true);
  assert.deepEqual(diagnostics.payload.workspaces.map((entry) => entry.workspaceId), ["project_a", "project_b"]);
  assert.equal(diagnostics.payload.workspaces.some((entry) => Object.hasOwn(entry, "root")), false);
});

test("registered non-Git workspace preserves exact read, search, Markdown write, and non-Git status semantics", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-non-git-"));
  const workspace = path.join(container, "Plain Notes");
  fs.mkdirSync(path.join(workspace, "notes"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "README.md"), "plain non-git workspace\n", "utf8");
  fs.writeFileSync(path.join(workspace, "notes", "source.md"), "non-git-search-target\n", "utf8");
  const service = new AgentHarnessService({
    userDataRoot: path.join(container, "user-data"),
    allowUnauthenticatedLocal: true,
  });
  const registration = await service.registerWorkspaceRoot(workspace);
  const tools = service.toolRegistry();

  assert.equal(registration.workspace.workspaceId, "plain_notes");
  assert.equal(registration.workspace.gitBacked, false);
  const read = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "plain_notes", action: "read_file", params: { relativePath: "README.md" } },
  });
  assert.equal(read.ok, true);
  assert.match(read.payload.content, /plain non-git workspace/);

  const searched = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "plain_notes", action: "search_files", params: { query: "non-git-search-target" } },
  });
  assert.equal(searched.ok, true);
  assert.equal(searched.payload.matches[0].relativePath, "notes/source.md");

  const written = await tools.callTool({
    name: "repo_toolbox",
    scope: "files.write",
    arguments: {
      workspaceId: "plain_notes",
      action: "write_markdown_artifact",
      params: { relativePath: "notes/generated.md", content: "# Generated\n\nNon-Git write.\n" },
    },
  });
  assert.equal(written.ok, true);
  assert.match(fs.readFileSync(path.join(workspace, "notes", "generated.md"), "utf8"), /Non-Git write/);

  const gitStatus = await tools.callTool({
    name: "git_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "plain_notes", action: "status" },
  });
  assert.equal(gitStatus.ok, false);
  assert.equal(gitStatus.error.code, "GIT_CAPABILITY_UNAVAILABLE");
  assert.match(gitStatus.error.message, /not Git-backed/i);
});

test("workspace ID collisions are rejected without replacing the original registration", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-collision-"));
  const first = path.join(container, "one", "Same Project");
  const second = path.join(container, "two", "Same Project");
  createProject(first, "first");
  createProject(second, "second");
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: path.join(container, "user-data") });

  await registry.register(first);
  await assert.rejects(registry.register(second), (error) => error.code === "WORKSPACE_REGISTRY_CONFLICT");
  assert.match(fs.readFileSync((await registry.resolve("same_project")).root + path.sep + "README.md", "utf8"), /first/);
  assert.equal(registry.snapshot().workspaces.length, 1);
});

test("unavailable roots and malformed registry data fail closed without deleting registration", async () => {
  const fixture = createFixture();
  const registry = new RegisteredWorkspaceRegistry({ userDataRoot: fixture.userDataRoot });
  await registry.register(fixture.projectA);
  const moved = `${fixture.projectA}-moved`;
  fs.renameSync(fixture.projectA, moved);

  await assert.rejects(registry.resolve("project_a"), (error) => error.code === "WORKSPACE_UNAVAILABLE");
  assert.equal(registry.snapshot().workspaces[0].availability, "unavailable");
  assert.equal(JSON.parse(fs.readFileSync(getRegisteredWorkspaceRegistryPath(fixture.userDataRoot), "utf8")).workspaces.length, 1);

  const corruptRoot = path.join(fixture.container, "corrupt-user-data");
  const corruptPath = getRegisteredWorkspaceRegistryPath(corruptRoot);
  fs.mkdirSync(path.dirname(corruptPath), { recursive: true });
  fs.writeFileSync(corruptPath, "{not-json", "utf8");
  const corrupt = new RegisteredWorkspaceRegistry({ userDataRoot: corruptRoot });
  assert.equal(corrupt.snapshot().state, "failed");
  await assert.rejects(corrupt.resolve("project_a"), (error) => error.code === "WORKSPACE_REGISTRY_INVALID");
  await assert.rejects(corrupt.register(moved), (error) => error.code === "WORKSPACE_REGISTRY_INVALID");
});

function createFixture() {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-registry-"));
  const projectA = path.join(container, "Project A");
  const projectB = path.join(container, "Project B");
  createProject(projectA, "needle A");
  createProject(projectB, "needle B");
  return { container, projectA, projectB, userDataRoot: path.join(container, "user-data") };
}

function createProject(root, content) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), `${content}\n`, "utf8");
}
