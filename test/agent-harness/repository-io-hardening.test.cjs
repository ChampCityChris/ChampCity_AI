const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  gitDiff,
  gitStatus,
  listRepositoryFiles,
  readRepositoryFile,
  searchRepositoryFiles,
  writeTextArtifact,
} = require("../../dist/main/agentHarness/repository/repositoryOperations.js");
const {
  GIT_COMMAND_TIMEOUT_MS,
  GIT_STDERR_LIMIT_BYTES,
  GIT_STDOUT_LIMIT_BYTES,
  runBoundedGit,
} = require("../../dist/main/agentHarness/repository/boundedGit.js");
const {
  AgentHarnessService,
} = require("../../dist/main/agentHarness/runtime/agentHarnessService.js");

test("Git-backed discovery honors Git ignore rules while exact ignored reads remain available", async () => {
  const root = createGitWorkspace("Git Ignore Project");
  write(root, ".gitignore", ["tmp/", "dist/", "node_modules/", "logs/", "*.cache", ""].join("\n"));
  write(root, "README.md", "tracked eligible needle\n");
  write(root, "docs/guide.md", "ordinary eligible content\n");
  write(root, "tmp/electron-runtime/ignored.txt", "ignored-only-needle\n");
  write(root, "dist/ignored.txt", "ignored-only-needle\n");
  write(root, "node_modules/pkg/ignored.txt", "ignored-only-needle\n");
  write(root, "logs/runtime.log", "ignored-only-needle\n");
  write(root, "cache/runtime.cache", "ignored-only-needle\n");
  git(root, ["add", ".gitignore", "README.md", "docs/guide.md"]);

  const listed = await listRepositoryFiles(root, { gitBacked: true });
  assert.equal(listed.truncated, false);
  assert.equal(listed.completion.status, "complete");
  assert.equal(listed.completion.reason, null);
  assert.ok(listed.files.includes("README.md"));
  assert.ok(listed.files.includes("docs/guide.md"));
  assert.equal(listed.files.some((entry) => /^(tmp|dist|node_modules|logs|cache)\//.test(entry)), false);

  const searched = await searchRepositoryFiles(root, "ignored-only-needle", { gitBacked: true });
  assert.deepEqual(searched.matches, []);
  assert.equal(searched.truncated, false);

  const exactIgnoredRead = readRepositoryFile(root, "git_ignore_project", "tmp/electron-runtime/ignored.txt");
  assert.match(exactIgnoredRead.content, /ignored-only-needle/);

});

test("non-Git workspaces list, search, and prune infrastructure with deterministic traversal bounds", async () => {
  const root = createWorkspace("Notes Workspace");
  write(root, "notes/ideas.md", "brainstorming needle\n");
  write(root, "shopping/list.md", "tea\ncoffee\n");
  for (const directory of [".git", "node_modules", "dist", "build", "out", "release", "coverage", ".vite", "logs", "tmp", "temp", ".vscode", ".idea"]) {
    write(root, `${directory}/ignored.md`, "pruned-only-needle\n");
  }

  const listed = await listRepositoryFiles(root, { gitBacked: false });
  assert.deepEqual(listed.files.sort(), ["notes/ideas.md", "shopping/list.md"]);
  assert.equal(listed.truncated, false);
  const searched = await searchRepositoryFiles(root, "brainstorming needle", { gitBacked: false });
  assert.equal(searched.matches[0].relativePath, "notes/ideas.md");
  assert.equal(searched.truncated, false);
  const ignoredSearch = await searchRepositoryFiles(root, "pruned-only-needle", { gitBacked: false });
  assert.deepEqual(ignoredSearch.matches, []);
  writeTextArtifact(root, "notes/generated.md", "# Generated\n\nDurable note.\n", { expectedExtension: ".md" });
  assert.match(readRepositoryFile(root, "notes_workspace", "notes/generated.md").content, /Durable note/);

  await assert.rejects(
    listRepositoryFiles(root, { gitBacked: false, maxVisitedEntries: 2 }),
    (error) => error.code === "REPOSITORY_TRAVERSAL_INCOMPLETE" &&
      error.details.completion.reason === "visit-limit",
  );
});

test("search and direct text projection preflight oversized files before complete reads", async () => {
  const root = createWorkspace("Preflight Workspace");
  const oversizedPath = path.join(root, "oversized.txt");
  write(root, "eligible.txt", "find-the-eligible-text\n");
  write(root, "binary.bin", Buffer.from([0, 1, 2, 3]));
  write(root, "oversized.txt", "x".repeat(500_001));
  write(root, "oversized-binary.bin", Buffer.alloc(500_001, 1));

  const originalAsyncRead = fs.promises.readFile;
  fs.promises.readFile = async function guardedRead(file, ...args) {
    if (path.resolve(String(file)) === path.resolve(oversizedPath)) {
      throw new Error("oversized search candidate was read");
    }
    return originalAsyncRead.call(this, file, ...args);
  };
  try {
    const searched = await searchRepositoryFiles(root, "find-the-eligible-text", { gitBacked: false });
    assert.equal(searched.matches.length, 1);
    assert.equal(searched.matches[0].relativePath, "eligible.txt");
  } finally {
    fs.promises.readFile = originalAsyncRead;
  }

  const originalSyncRead = fs.readFileSync;
  let oversizedReadCount = 0;
  fs.readFileSync = function guardedSyncRead(file, ...args) {
    if (path.resolve(String(file)) === path.resolve(oversizedPath)) {
      oversizedReadCount += 1;
    }
    return originalSyncRead.call(this, file, ...args);
  };
  try {
    assert.throws(
      () => readRepositoryFile(root, "preflight_workspace", "oversized.txt"),
      (error) => error.code === "FILE_DENIED",
    );
    assert.equal(oversizedReadCount, 0);
  } finally {
    fs.readFileSync = originalSyncRead;
  }

});

test("large read_file inspection performs one complete permitted source load", () => {
  const root = createWorkspace("Single Load Workspace");
  const target = path.join(root, "large.md");
  write(root, "large.md", `# Heading\n${"line content\n".repeat(1_500)}`);
  const originalRead = fs.readFileSync;
  let targetReadCount = 0;
  fs.readFileSync = function countedRead(file, ...args) {
    if (path.resolve(String(file)) === path.resolve(target)) {
      targetReadCount += 1;
    }
    return originalRead.call(this, file, ...args);
  };
  try {
    const result = readRepositoryFile(root, "single_load_workspace", "large.md");
    assert.equal(result.contentOmitted, true);
    assert.equal(result.markdownDetected, true);
    assert.equal(result.headingIndex.length, 1);
    assert.match(result.sourceSha256, /^[a-f0-9]{64}$/);
    assert.equal(targetReadCount, 1);
  } finally {
    fs.readFileSync = originalRead;
  }
});

test("list and search caps project deterministic truncation", async () => {
  const root = createWorkspace("Budget Workspace");
  for (let index = 0; index < 1_001; index += 1) {
    write(root, `files/file-${String(index).padStart(4, "0")}.txt`, "ordinary\n");
  }
  const listed = await listRepositoryFiles(root, { gitBacked: false });
  assert.equal(listed.files.length, 1_000);
  assert.equal(listed.truncated, true);
  assert.equal(listed.completion.reason, "file-limit");

  const resultRoot = createWorkspace("Result Budget Workspace");
  write(resultRoot, "matches.txt", `${"match needle\n".repeat(201)}`);
  const resultBounded = await searchRepositoryFiles(resultRoot, "needle", { gitBacked: false });
  assert.equal(resultBounded.matches.length, 200);
  assert.equal(resultBounded.truncated, true);
  assert.equal(resultBounded.completion.reason, "result-limit");

  const byteRoot = createWorkspace("Byte Budget Workspace");
  write(byteRoot, "a.txt", "a".repeat(90));
  write(byteRoot, "b.txt", "needle\n".repeat(20));
  await assert.rejects(
    searchRepositoryFiles(byteRoot, "needle", { gitBacked: false, maxContentBytes: 100 }),
    (error) => error.code === "REPOSITORY_TRAVERSAL_INCOMPLETE" &&
      error.details.completion.reason === "content-byte-limit",
  );

});

test("Git status and diff are asynchronous, bounded, and terminate timed-out children", async (t) => {
  const root = createGitWorkspace("Bounded Git Project");
  write(root, "tracked.txt", "baseline\n");
  git(root, ["add", "tracked.txt"]);
  git(root, ["commit", "-m", "fixture baseline"]);
  write(root, "tracked.txt", "changed\n");

  const childProcess = require("node:child_process");
  for (const method of ["execFileSync", "execSync", "spawnSync"]) {
    t.mock.method(childProcess, method, () => assert.fail(`Repository I/O blocked on ${method}`));
  }
  const status = await gitStatus(root, true);
  assert.equal(status.gitBacked, true);
  assert.match(status.shortStatus, /tracked\.txt/);
  const diff = await gitDiff(root, true);
  assert.match(diff.diff, /changed/);

  write(root, "tracked.txt", `${"z".repeat(1_050_000)}\n`);
  await assert.rejects(
    gitDiff(root, true),
    (error) => error.code === "GIT_OUTPUT_LIMIT" && error.message.length < 200,
  );

  let daemonProcessId = null;
  await assert.rejects(
    runBoundedGit({
      cwd: root,
      args: ["daemon", "--reuseaddr", "--listen=127.0.0.1", "--port=0", "--export-all", "."],
      timeoutMs: 50,
      onSpawn: (processId) => {
        daemonProcessId = processId;
      },
    }),
    (error) => error.code === "GIT_TIMEOUT",
  );
  assert.ok(daemonProcessId);
  await delay(100);
  assert.equal(processExists(daemonProcessId), false);

  assert.equal(GIT_COMMAND_TIMEOUT_MS, 15_000);
  assert.equal(GIT_STDOUT_LIMIT_BYTES, 1_000_000);
  assert.equal(GIT_STDERR_LIMIT_BYTES, 65_536);
});

test("bounded Git cancels streamed output and terminates children on either output limit", async (t) => {
  const childProcess = require("node:child_process");
  const { EventEmitter } = require("node:events");
  const { PassThrough } = require("node:stream");
  for (const scenario of ["cancel", "stdout", "stderr"]) {
    await t.test(scenario, async (context) => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.exitCode = null;
      let kills = 0;
      child.kill = () => {
        kills += 1;
        child.exitCode = 1;
        queueMicrotask(() => child.emit("close", 1));
      };
      context.mock.method(childProcess, "spawn", (executable, args, options) => {
        assert.equal(executable, "git");
        assert.equal(options.shell, false);
        queueMicrotask(() => child[scenario === "stderr" ? "stderr" : "stdout"].write("bounded-output"));
        return child;
      });
      let observed = "";
      const result = runBoundedGit({
        cwd: path.resolve(__dirname, "../.."), args: ["status"],
        stdoutLimitBytes: scenario === "stdout" ? 4 : 100,
        stderrLimitBytes: 4,
        onStdout: (chunk, stop) => { observed += chunk.toString(); stop(); stop(); },
      });
      if (scenario === "cancel") {
        assert.equal((await result).stoppedEarly, true);
        assert.equal(observed, "bounded-output");
      } else {
        await assert.rejects(result, (error) => error.code === "GIT_OUTPUT_LIMIT" && error.message.includes(scenario));
      }
      assert.equal(kills, 1);
    });
  }
});

test("Git status and public toolboxes contain nested registered roots while preserving repository-root status", async () => {
  const nested = createGitWorkspace("Parent Git Project");
  const registeredRoot = path.join(nested, "Registered Workspace");
  write(nested, "outside.txt", "outside baseline\n");
  write(nested, "Registered Workspace/inside.txt", "inside baseline\n");
  write(nested, "Registered Workspace/nested/child.txt", "child baseline\n");
  git(nested, ["add", "."]);
  git(nested, ["commit", "-m", "nested fixture baseline"]);
  write(nested, "outside.txt", "outside changed\n");
  write(nested, "Registered Workspace/inside.txt", "inside changed\n");
  write(nested, "Registered Workspace/nested/child.txt", "child changed\n");

  const directStatus = await gitStatus(registeredRoot, true);
  assert.equal(directStatus.gitBacked, true);
  assert.match(directStatus.shortStatus, /inside\.txt/);
  assert.match(directStatus.shortStatus, /nested\/child\.txt/);
  assert.doesNotMatch(directStatus.shortStatus, /outside\.txt|\.\.\//);

  const directDiff = await gitDiff(registeredRoot, true);
  assert.equal(directDiff.gitBacked, true);
  assert.match(directDiff.diff, /inside changed/);
  assert.match(directDiff.diff, /child changed/);
  assert.doesNotMatch(directDiff.diff, /outside changed|outside\.txt/);

  const nestedService = new AgentHarnessService({
    userDataRoot: path.join(path.dirname(nested), "nested-user-data"),
    allowUnauthenticatedLocal: true,
  });
  const nestedRegistration = await nestedService.registerWorkspaceRoot(registeredRoot);
  const nestedWorkspaceId = nestedRegistration.workspace.workspaceId;
  assert.equal(nestedRegistration.workspace.gitBacked, true);

  const gitToolStatus = await nestedService.toolRegistry().callTool({
    name: "git_toolbox",
    scope: "files.read",
    arguments: { workspaceId: nestedWorkspaceId, action: "status" },
  });
  assert.equal(gitToolStatus.ok, true);
  assert.deepEqual(Object.keys(gitToolStatus.payload).sort(), ["gitBacked", "shortStatus"]);
  assert.match(gitToolStatus.payload.shortStatus, /inside\.txt/);
  assert.match(gitToolStatus.payload.shortStatus, /nested\/child\.txt/);
  assert.doesNotMatch(gitToolStatus.payload.shortStatus, /outside\.txt|\.\.\//);

  const repoToolStatus = await nestedService.toolRegistry().callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: nestedWorkspaceId, action: "status" },
  });
  assert.equal(repoToolStatus.ok, true);
  assert.match(repoToolStatus.payload.repository.shortStatus, /inside\.txt/);
  assert.match(repoToolStatus.payload.repository.shortStatus, /nested\/child\.txt/);
  assert.doesNotMatch(repoToolStatus.payload.repository.shortStatus, /outside\.txt|\.\.\//);

  const unknownStatus = await nestedService.toolRegistry().callTool({
    name: "git_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "unknown_workspace", action: "status" },
  });
  assert.equal(unknownStatus.ok, false);
  assert.equal(unknownStatus.error.code, "WORKSPACE_ACCESS_DENIED");

  const ordinaryRoot = createGitWorkspace("Ordinary Git Root");
  write(ordinaryRoot, "tracked.txt", "baseline\n");
  git(ordinaryRoot, ["add", "tracked.txt"]);
  git(ordinaryRoot, ["commit", "-m", "ordinary fixture baseline"]);
  write(ordinaryRoot, "tracked.txt", "changed\n");
  write(ordinaryRoot, "untracked.txt", "new\n");
  const ordinaryService = new AgentHarnessService({
    userDataRoot: path.join(path.dirname(ordinaryRoot), "ordinary-user-data"),
    allowUnauthenticatedLocal: true,
  });
  const ordinaryRegistration = await ordinaryService.registerWorkspaceRoot(ordinaryRoot);
  const ordinaryStatus = await ordinaryService.toolRegistry().callTool({
    name: "git_toolbox",
    scope: "files.read",
    arguments: { workspaceId: ordinaryRegistration.workspace.workspaceId, action: "status" },
  });
  assert.equal(ordinaryStatus.ok, true);
  assert.deepEqual(Object.keys(ordinaryStatus.payload).sort(), ["gitBacked", "shortStatus"]);
  assert.match(ordinaryStatus.payload.shortStatus, /tracked\.txt/);
  assert.match(ordinaryStatus.payload.shortStatus, /untracked\.txt/);
});

function createWorkspace(name) {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-repair05-"));
  const root = path.join(container, name);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function createGitWorkspace(name) {
  const root = createWorkspace(name);
  git(root, ["init"]);
  git(root, ["config", "user.name", "ChampCity Test"]);
  git(root, ["config", "user.email", "champcity-test@example.invalid"]);
  return root;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function processExists(processId) {
  try {
    process.kill(processId, 0);
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
