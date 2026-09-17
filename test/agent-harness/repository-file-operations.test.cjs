const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const {
  MAX_REPOSITORY_FILE_OPERATION_BYTES,
  assertRepositoryFileOperationSize,
  copyRepositoryFile,
  moveRepositoryFile,
} = require("../../dist/main/agentHarness/repository/fileOperations.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");

test("copy_file preserves opaque release bytes, creates contained parents, and returns bounded integrity evidence", async () => {
  const root = createWorkspace("Opaque Copy");
  const bytes = Buffer.from([0x00, 0xff, 0xfe, 0x80, 0x61, 0x00, 0xc3, 0x28]);
  write(root, "release/source.bin", bytes);
  let parentObserved = false;
  const result = await copyRepositoryFile(root, "release/source.bin", "nested/new/target.bin", {
    afterDestinationParentCreated(destinationPath) {
      parentObserved = fs.statSync(path.dirname(destinationPath)).isDirectory();
    },
  });

  assert.equal(parentObserved, true);
  assert.deepEqual(fs.readFileSync(path.join(root, "release/source.bin")), bytes);
  assert.deepEqual(fs.readFileSync(path.join(root, "nested/new/target.bin")), bytes);
  assert.deepEqual(result, {
    sourceRelativePath: "release/source.bin",
    destinationRelativePath: "nested/new/target.bin",
    bytes: bytes.length,
    sha256: sha256(bytes),
    sourcePreserved: true,
  });
  assert.equal(JSON.stringify(result).includes(bytes.toString("base64")), false);
});

test("move_file preserves opaque bytes, removes the source, and verifies destination evidence", async () => {
  const root = createWorkspace("Opaque Move");
  const bytes = Buffer.from([0x89, 0x00, 0xff, 0x10, 0x80, 0xfe, 0x7f]);
  write(root, "incoming/source.dat", bytes);

  const result = await moveRepositoryFile(root, "incoming/source.dat", "out/archive.dat");

  assert.equal(fs.existsSync(path.join(root, "incoming/source.dat")), false);
  assert.deepEqual(fs.readFileSync(path.join(root, "out/archive.dat")), bytes);
  assert.deepEqual(result, {
    sourceRelativePath: "incoming/source.dat",
    destinationRelativePath: "out/archive.dat",
    bytes: bytes.length,
    sha256: sha256(bytes),
    sourceState: "absent",
    destinationState: "present",
  });
});

test("copy and move reject existing destinations without overwriting them", async () => {
  const root = createWorkspace("Existing Destinations");
  write(root, "copy-source.bin", Buffer.from([1, 2, 3]));
  write(root, "move-source.bin", Buffer.from([4, 5, 6]));
  write(root, "copy-destination.bin", Buffer.from("keep-copy"));
  write(root, "move-destination.bin", Buffer.from("keep-move"));

  await rejectsCode(copyRepositoryFile(root, "copy-source.bin", "copy-destination.bin"), "FILE_DENIED");
  await rejectsCode(moveRepositoryFile(root, "move-source.bin", "move-destination.bin"), "FILE_DENIED");
  assert.equal(fs.readFileSync(path.join(root, "copy-destination.bin"), "utf8"), "keep-copy");
  assert.equal(fs.readFileSync(path.join(root, "move-destination.bin"), "utf8"), "keep-move");
  assert.equal(fs.existsSync(path.join(root, "move-source.bin")), true);
});

test("exclusive copy creation preserves a destination that appears after validation", async () => {
  const root = createWorkspace("Concurrent Copy Destination");
  write(root, "source.bin", Buffer.from("source"));

  await rejectsCode(copyRepositoryFile(root, "source.bin", "appeared.bin", {
    beforeDestinationCreate(destinationPath) {
      fs.writeFileSync(destinationPath, "concurrent");
    },
  }), "FILE_DENIED");

  assert.equal(fs.readFileSync(path.join(root, "appeared.bin"), "utf8"), "concurrent");
  assert.equal(fs.readFileSync(path.join(root, "source.bin"), "utf8"), "source");
});

test("exclusive hard-link move preserves a destination that appears after validation", async () => {
  const root = createWorkspace("Concurrent Move Destination");
  write(root, "source.bin", Buffer.from("source"));

  await rejectsCode(moveRepositoryFile(root, "source.bin", "appeared.bin", {
    beforeDestinationCreate(destinationPath) {
      fs.writeFileSync(destinationPath, "concurrent");
    },
  }), "FILE_DENIED");

  assert.equal(fs.readFileSync(path.join(root, "appeared.bin"), "utf8"), "concurrent");
  assert.equal(fs.readFileSync(path.join(root, "source.bin"), "utf8"), "source");
});

test("source validation rejects missing files, directories, and canonical identity aliases", async () => {
  const root = createWorkspace("Invalid Sources");
  write(root, "source.bin", Buffer.from("source"));
  fs.mkdirSync(path.join(root, "directory"));
  fs.linkSync(path.join(root, "source.bin"), path.join(root, "same-identity.bin"));

  await rejectsCode(copyRepositoryFile(root, "missing.bin", "unused.bin"), "FILE_DENIED");
  await rejectsCode(copyRepositoryFile(root, "directory", "unused.bin"), "FILE_DENIED");
  await rejectsCode(copyRepositoryFile(root, "source.bin", "source.bin"), "FILE_DENIED");
  await rejectsCode(moveRepositoryFile(root, "source.bin", "same-identity.bin"), "FILE_DENIED");
  assert.equal(fs.readFileSync(path.join(root, "source.bin"), "utf8"), "source");
});

test("source leaf symlinks or junctions are rejected even when their targets remain in the workspace", async () => {
  const root = createWorkspace("Source Symlink");
  write(root, "real.bin", Buffer.from("source"));
  const linkPath = path.join(root, "source-link.bin");
  if (!tryCreateLink(path.join(root, "real.bin"), linkPath, "file")) {
    const containedDirectory = path.join(root, "contained-directory");
    fs.mkdirSync(containedDirectory);
    fs.symlinkSync(containedDirectory, linkPath, process.platform === "win32" ? "junction" : "dir");
  }

  assert.equal(fs.lstatSync(linkPath).isSymbolicLink(), true);
  await rejectsCode(copyRepositoryFile(root, "source-link.bin", "destination.bin"), "FILE_DENIED");
  assert.equal(fs.existsSync(path.join(root, "destination.bin")), false);
});

test("existing out-of-workspace destination-parent indirection is rejected", async (t) => {
  const root = createWorkspace("Outside Parent");
  const outside = createWorkspace("Outside Target");
  write(root, "source.bin", Buffer.from("source"));
  if (!tryCreateLink(outside, path.join(root, "outside-link"), "dir")) {
    t.skip("Directory link creation is unavailable on this Windows test host.");
    return;
  }

  await rejectsCode(copyRepositoryFile(root, "source.bin", "outside-link/destination.bin"), "PATH_DENIED");
  assert.equal(fs.existsSync(path.join(outside, "destination.bin")), false);
});

test("destination parent is canonically rechecked after recursive creation", async (t) => {
  const root = createWorkspace("Parent Recheck");
  const outside = createWorkspace("Parent Recheck Outside");
  write(root, "source.bin", Buffer.from("source"));
  const probe = path.join(root, "link-probe");
  if (!tryCreateLink(outside, probe, "dir")) {
    t.skip("Directory link creation is unavailable on this Windows test host.");
    return;
  }
  fs.unlinkSync(probe);

  await rejectsCode(copyRepositoryFile(root, "source.bin", "created/child/destination.bin", {
    afterDestinationParentCreated(destinationPath) {
      const createdTop = path.join(root, "created");
      fs.rmSync(createdTop, { recursive: true });
      fs.symlinkSync(outside, createdTop, process.platform === "win32" ? "junction" : "dir");
      assert.equal(path.dirname(destinationPath).endsWith(path.join("created", "child")), true);
    },
  }), "PATH_DENIED");
  assert.equal(fs.existsSync(path.join(outside, "child", "destination.bin")), false);
});

test("protected .git paths and canonical link disguises are rejected", async (t) => {
  const root = createWorkspace("Protected Git");
  write(root, "source.bin", Buffer.from("source"));
  write(root, ".git/config", Buffer.from("metadata"));

  await rejectsCode(copyRepositoryFile(root, ".git/config", "copy.bin"), "PATH_DENIED");
  await rejectsCode(copyRepositoryFile(root, "source.bin", ".git/copy.bin"), "PATH_DENIED");
  await rejectsCode(moveRepositoryFile(root, "source.bin", ".git/moved.bin"), "PATH_DENIED");

  const disguise = path.join(root, "metadata-link");
  if (!tryCreateLink(path.join(root, ".git"), disguise, "dir")) {
    t.skip("Directory link creation is unavailable; direct .git checks completed.");
    return;
  }
  await rejectsCode(copyRepositoryFile(root, "metadata-link/config", "copy.bin"), "PATH_DENIED");
  await rejectsCode(copyRepositoryFile(root, "source.bin", "metadata-link/copy.bin"), "PATH_DENIED");
});

test("absolute paths and traversal are rejected without exposing local roots", async () => {
  const root = createWorkspace("Unsafe Paths");
  write(root, "source.bin", Buffer.from("source"));
  const attempts = [
    copyRepositoryFile(root, path.join(root, "source.bin"), "destination.bin"),
    copyRepositoryFile(root, "../source.bin", "destination.bin"),
    moveRepositoryFile(root, "source.bin", "../destination.bin"),
  ];
  for (const attempt of attempts) {
    await assert.rejects(attempt, (error) => {
      assert.equal(error.code, "PATH_DENIED");
      assert.equal(JSON.stringify(error).includes(root), false);
      return true;
    });
  }
});

test("copy detects source-content mutation and removes only its operation-owned destination", async () => {
  const root = createWorkspace("Mutated Copy Source");
  write(root, "source.bin", Buffer.from("before"));

  await rejectsCode(copyRepositoryFile(root, "source.bin", "destination.bin", {
    afterCopyTransfer(sourcePath) {
      fs.writeFileSync(sourcePath, "after!");
    },
  }), "FILE_OPERATION_FAILED");

  assert.equal(fs.readFileSync(path.join(root, "source.bin"), "utf8"), "after!");
  assert.equal(fs.existsSync(path.join(root, "destination.bin")), false);
});

test("move restores the source and cleans its destination after a post-removal failure", async () => {
  const root = createWorkspace("Move Recovery");
  const bytes = Buffer.from([0x00, 0xff, 0x22, 0x80]);
  write(root, "source.bin", bytes);

  await assert.rejects(moveRepositoryFile(root, "source.bin", "destination.bin", {
    afterMoveSourceRemoval() {
      throw new Error("synthetic post-removal failure");
    },
  }), (error) => {
    assert.equal(error.code, "FILE_OPERATION_FAILED");
    assert.deepEqual(error.details, { sourceState: "present", destinationState: "absent" });
    return true;
  });

  assert.deepEqual(fs.readFileSync(path.join(root, "source.bin")), bytes);
  assert.equal(fs.existsSync(path.join(root, "destination.bin")), false);
});

test("move reports unsupported cross-device semantics and leaves the source intact", async () => {
  const root = createWorkspace("Cross Device Move");
  write(root, "source.bin", Buffer.from("source"));

  await assert.rejects(moveRepositoryFile(root, "source.bin", "destination.bin", {
    async link() {
      const error = new Error("synthetic cross-device link");
      error.code = "EXDEV";
      throw error;
    },
  }), (error) => error.code === "FILE_DENIED" && /cross-device/i.test(error.message));

  assert.equal(fs.readFileSync(path.join(root, "source.bin"), "utf8"), "source");
  assert.equal(fs.existsSync(path.join(root, "destination.bin")), false);
});

test("the fixed 2 GiB bound rejects oversized evidence without allocating an oversized fixture", () => {
  assert.equal(MAX_REPOSITORY_FILE_OPERATION_BYTES, 2 * 1024 * 1024 * 1024);
  assert.doesNotThrow(() => assertRepositoryFileOperationSize(MAX_REPOSITORY_FILE_OPERATION_BYTES));
  assert.throws(
    () => assertRepositoryFileOperationSize(MAX_REPOSITORY_FILE_OPERATION_BYTES + 1),
    (error) => error.code === "FILE_DENIED" && /2 GiB/.test(error.message),
  );
});

test("public repo_toolbox exposes strict copy and move schemas only with files.write", async () => {
  const root = createWorkspace("Public File Operations");
  write(root, "source.bin", Buffer.from([0x00, 0xff, 0x01]));
  const registry = createRegistry(root);
  const readTool = registry.listTools("files.read").find((entry) => entry.name === "repo_toolbox");
  const writeTool = registry.listTools("files.read files.write").find((entry) => entry.name === "repo_toolbox");

  assert.equal(readTool.actions.includes("copy_file"), false);
  assert.equal(readTool.actions.includes("move_file"), false);
  assert.equal(writeTool.actions.includes("copy_file"), true);
  assert.equal(writeTool.actions.includes("move_file"), true);
  for (const action of ["copy_file", "move_file"]) {
    const branch = writeTool.inputSchema.oneOf.find((entry) => entry.title === action);
    assert.deepEqual(branch.properties.params.required.sort(), ["destinationRelativePath", "sourceRelativePath"]);
    assert.deepEqual(Object.keys(branch.properties.params.properties).sort(), [
      "destinationRelativePath",
      "sourceRelativePath",
    ]);
    assert.equal(branch.properties.params.additionalProperties, false);
  }

  const readDenied = await registry.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: {
      workspaceId: "public_file_operations",
      action: "copy_file",
      params: { sourceRelativePath: "source.bin", destinationRelativePath: "copy.bin" },
    },
  });
  assert.equal(readDenied.ok, false);
  assert.equal(readDenied.error.code, "OAUTH_SCOPE_DENIED");

  const unknownParam = await registry.callTool({
    name: "repo_toolbox",
    scope: "files.write",
    arguments: {
      workspaceId: "public_file_operations",
      action: "copy_file",
      params: { sourceRelativePath: "source.bin", destinationRelativePath: "copy.bin", overwrite: true },
    },
  });
  assert.equal(unknownParam.ok, false);
  assert.equal(unknownParam.error.code, "INVALID_INPUT");

  const copied = await registry.callTool({
    name: "repo_toolbox",
    scope: "files.write",
    arguments: {
      workspaceId: "public_file_operations",
      action: "copy_file",
      params: { sourceRelativePath: "source.bin", destinationRelativePath: "copy.bin" },
    },
  });
  assert.equal(copied.ok, true);
  const moved = await registry.callTool({
    name: "repo_toolbox",
    scope: "files.write",
    arguments: {
      workspaceId: "public_file_operations",
      action: "move_file",
      params: { sourceRelativePath: "copy.bin", destinationRelativePath: "moved.bin" },
    },
  });
  assert.equal(moved.ok, true);
  assert.equal(fs.existsSync(path.join(root, "copy.bin")), false);
  assert.deepEqual(fs.readFileSync(path.join(root, "moved.bin")), Buffer.from([0x00, 0xff, 0x01]));
});

test("implementation stays chunked and documents its non-hostile namespace concurrency boundary", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../src/main/agentHarness/repository/fileOperations.ts"),
    "utf8",
  );
  assert.match(source, /TRANSFER_BUFFER_BYTES = 1_048_576/);
  assert.doesNotMatch(source, /readFile(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /exec|spawn|cmd\.exe|powershell|robocopy/i);
  assert.match(source, /hostile local[\s\S]*outside HOTFIX07/i);
  assert.match(source, /cross-device copy-and-delete is not supported/i);
});

function createRegistry(root) {
  const context = resolveWorkspaceRootContext(root);
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext(workspaceId) {
      if (workspaceId !== context.workspaceId) {
        throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.");
      }
      return context;
    },
    listWorkspaceSummaries: () => [{
      workspaceId: context.workspaceId,
      repositoryName: context.repositoryName,
      gitBacked: context.gitBacked,
      availability: "available",
    }],
  });
  return createAgentHarnessToolRegistry({ workspaceAccess, userDataRoot: path.join(path.dirname(root), "user-data") });
}

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-hotfix07-"));
  const root = path.join(container, name);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function tryCreateLink(target, linkPath, kind) {
  try {
    fs.symlinkSync(target, linkPath, process.platform === "win32" && kind === "dir" ? "junction" : kind);
    return true;
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      return false;
    }
    throw error;
  }
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}
