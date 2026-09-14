const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");
const {
  SessionActiveWorkspaceSelection,
} = require("../../dist/main/sessionActiveWorkspaceSelection.js");
const {
  validateWorkspaceRoot,
  readSelectedWorkspace,
  saveSelectedWorkspace,
} = require("../../dist/main/workspaceSettings.js");

/*
 * Characterization boundary:
 * Desktop project selection is session-scoped and explicit. Agent Harness
 * repository binding is keyed by exact registered workspaceId and every
 * repository operation remains contained by the registered root.
 */

test("Desktop project selection changes only after a valid explicit workspace selection", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-characterization-project-selection-"));
  const projectA = path.join(container, "Project A");
  const projectB = path.join(container, "Project B");
  const invalid = path.join(container, "not-a-project");
  fs.mkdirSync(projectA, { recursive: true });
  fs.mkdirSync(projectB, { recursive: true });
  fs.writeFileSync(invalid, "not a directory", "utf8");

  const selection = new SessionActiveWorkspaceSelection();
  const detached = [];
  const detach = (workspaceRoot) => detached.push(workspaceRoot);

  assert.equal(selection.currentSelection().ok, false);
  assert.throws(() => selection.requireWorkspaceRoot(), /No workspace selected/);

  const first = validateWorkspaceRoot(projectA);
  assert.equal(first.ok, true);
  selection.activateFromValidation(first, detach);
  assert.equal(selection.requireWorkspaceRoot(), path.resolve(projectA));

  const rejected = selection.activateFromValidation(validateWorkspaceRoot(invalid), detach);
  assert.equal(rejected.ok, false);
  assert.equal(selection.requireWorkspaceRoot(), path.resolve(projectA), "invalid selection must not displace current project selection");
  assert.deepEqual(detached, []);

  const second = validateWorkspaceRoot(projectB);
  assert.equal(second.ok, true);
  selection.activateFromValidation(second, detach);
  assert.equal(selection.requireWorkspaceRoot(), path.resolve(projectB));
  assert.deepEqual(detached, [path.resolve(projectA)], "switching projects must detach the prior active workspace");

  selection.deactivate(detach);
  assert.equal(selection.currentSelection().ok, false);
  assert.deepEqual(detached, [path.resolve(projectA), path.resolve(projectB)]);
});

test("Desktop remembered project settings do not activate a new session", () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-characterization-remembered-project-"));
  const project = path.join(container, "Remembered Project");
  const userDataRoot = path.join(container, "user-data");
  createProject(project, "remembered project");
  assert.equal(saveSelectedWorkspace(userDataRoot, project).ok, true);
  const remembered = readSelectedWorkspace(userDataRoot);
  assert.equal(remembered.ok, true);
  assert.equal(remembered.workspaceRoot, path.resolve(project));

  const freshSession = new SessionActiveWorkspaceSelection();
  assert.equal(freshSession.currentSelection().ok, false);
  assert.throws(() => freshSession.requireWorkspaceRoot(), /No workspace selected/);
  freshSession.activateFromValidation(validateWorkspaceRoot(project));
  assert.equal(freshSession.requireWorkspaceRoot(), path.resolve(project));
});

test("Desktop repository binding uses exact workspaceId and fails closed for unknown or out-of-root access", async () => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-characterization-repository-binding-"));
  const projectA = path.join(container, "Project A");
  const projectB = path.join(container, "Project B");
  const userDataRoot = path.join(container, "user-data");
  createProject(projectA, "repository A content");
  createProject(projectB, "repository B content");
  fs.writeFileSync(path.join(container, "outside.txt"), "must remain outside repository binding\n", "utf8");

  const service = new AgentHarnessService({ userDataRoot, allowUnauthenticatedLocal: true });
  await service.registerWorkspaceRoot(projectA);
  await service.registerWorkspaceRoot(projectB);
  const tools = service.toolRegistry();

  const readA = await readRepository(tools, "project_a", "README.md");
  const readB = await readRepository(tools, "project_b", "README.md");
  assert.equal(readA.ok, true);
  assert.equal(readB.ok, true);
  assert.match(readA.payload.content, /repository A content/);
  assert.match(readB.payload.content, /repository B content/);
  assert.doesNotMatch(readA.payload.content, /repository B content/);

  for (const workspaceId of ["project_c", "PROJECT_A", " project_a "]) {
    const unknown = await readRepository(tools, workspaceId, "README.md");
    assert.equal(unknown.ok, false);
    assert.equal(unknown.error.code, "WORKSPACE_ACCESS_DENIED");
    const unknownWrite = await writeRepository(tools, workspaceId, "notes/unknown.md");
    assert.equal(unknownWrite.ok, false);
    assert.equal(unknownWrite.error.code, "WORKSPACE_ACCESS_DENIED");
  }
  assert.equal(fs.existsSync(path.join(projectA, "notes", "unknown.md")), false);
  assert.equal(fs.existsSync(path.join(projectB, "notes", "unknown.md")), false);

  const written = await writeRepository(tools, "project_a", "notes/selection.md");
  assert.equal(written.ok, true);
  assert.equal(fs.readFileSync(path.join(projectA, "notes", "selection.md"), "utf8"), "# Repository binding\n");
  assert.equal(fs.existsSync(path.join(projectB, "notes", "selection.md")), false);
  assert.match((await readRepository(tools, "project_b", "README.md")).payload.content, /repository B content/);

  for (const relativePath of ["../outside.txt", "..\\outside.txt", path.join(container, "outside.txt")]) {
    const escapedRead = await readRepository(tools, "project_a", relativePath);
    assert.equal(escapedRead.ok, false);
    assert.equal(escapedRead.error.code, "PATH_DENIED");
    assert.equal(JSON.stringify(escapedRead).includes("must remain outside repository binding"), false);
  }
  for (const relativePath of ["../escape.md", "..\\escape.md", path.join(container, "escape.md")]) {
    const escapedWrite = await writeRepository(tools, "project_a", relativePath);
    assert.equal(escapedWrite.ok, false);
    assert.equal(escapedWrite.error.code, "PATH_DENIED");
  }
  assert.equal(fs.existsSync(path.join(container, "escape.md")), false);
});

test("Desktop repository reads and writes reject directory links that escape the registered root", async (t) => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-characterization-linked-repository-"));
  const project = path.join(container, "Linked Project");
  const outside = path.join(container, "outside");
  createProject(project, "inside repository");
  createProject(outside, "outside repository evidence");
  try {
    fs.symlinkSync(outside, path.join(project, "linked"), process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    t.skip("Directory link creation is unavailable in this environment.");
    return;
  }
  const service = new AgentHarnessService({ userDataRoot: path.join(container, "user-data"), allowUnauthenticatedLocal: true });
  await service.registerWorkspaceRoot(project);
  const tools = service.toolRegistry();
  const read = await readRepository(tools, "linked_project", "linked/README.md");
  assert.equal(read.ok, false);
  assert.equal(read.error.code, "PATH_DENIED");
  assert.equal(JSON.stringify(read).includes("outside repository evidence"), false);
  const write = await writeRepository(tools, "linked_project", "linked/new/note.md");
  assert.equal(write.ok, false);
  assert.equal(write.error.code, "PATH_DENIED");
  assert.equal(fs.existsSync(path.join(outside, "new")), false);
  assert.equal(fs.readFileSync(path.join(outside, "README.md"), "utf8"), "outside repository evidence\n");
});

function writeRepository(tools, workspaceId, relativePath) {
  return tools.callTool({
    name: "repo_toolbox",
    scope: "files.write",
    arguments: {
      workspaceId,
      action: "write_markdown_artifact",
      params: { relativePath, content: "# Repository binding\n" },
    },
  });
}

function createProject(root, content) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), `${content}\n`, "utf8");
}

function readRepository(tools, workspaceId, relativePath) {
  return tools.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: {
      workspaceId,
      action: "read_file",
      params: { relativePath },
    },
  });
}
