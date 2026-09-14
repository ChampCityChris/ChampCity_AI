const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { AgentHarnessError } = require("../../dist/main/agentHarness/core/errors.js");
const {
  listRepositoryFiles,
  searchRepositoryFiles,
} = require("../../dist/main/agentHarness/repository/repositoryOperations.js");
const {
  createAgentHarnessToolRegistry,
} = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const {
  createRegisteredWorkspaceAccessProvider,
  resolveWorkspaceRootContext,
} = require("../../dist/main/agentHarness/workspace/workspaceAccess.js");
const {
  buildMcpWorkspaceBindingPromptBlock,
} = require("../../dist/main/integrations/mcpWorkspacePromptContract.js");

test("fair non-Git traversal finds shallow governed artifacts before a deep sibling consumes the visit budget", async () => {
  const root = createWorkspace("Explorer Theme");
  const workCardPath = "planning/phases/phase-10/Work_Cards/RC10_exact.md";
  const reportPath = "planning/phases/phase-10/Implementer_Reports/IMPLEMENTER_REPORT_RC10_exact.md";
  write(root, workCardPath, "# RC10\n");
  write(root, reportPath, "# RC10 Implementer Report\n");
  let deepPath = "aaa-deep-tree";
  for (let index = 0; index < 40; index += 1) {
    deepPath = `${deepPath}/level-${String(index).padStart(2, "0")}`;
  }
  write(root, `${deepPath}/late.txt`, "late\n");
  write(root, "node_modules/pruned/ignored.txt", "must stay pruned\n");

  const outside = createWorkspace("Outside Workspace");
  write(outside, "outside.txt", "must stay outside\n");
  tryCreateDirectoryLink(outside, path.join(root, "linked-outside"));

  const listed = await listRepositoryFiles(root, { gitBacked: false, maxVisitedEntries: 18 });
  assert.equal(listed.completion.status, "partial");
  assert.equal(listed.completion.reason, "visit-limit");
  assert.ok(listed.files.includes(workCardPath));
  assert.ok(listed.files.includes(reportPath));
  assert.equal(listed.files.some((entry) => /node_modules|linked-outside|outside\.txt/.test(entry)), false);
  assert.ok(listed.completion.visitedEntries <= 18);
  assert.ok(listed.completion.elapsedMs >= 0);

  const fileBounded = await listRepositoryFiles(root, { gitBacked: false, maxFiles: 1 });
  assert.equal(fileBounded.files.length, 1);
  assert.equal(fileBounded.truncated, true);
  assert.equal(fileBounded.completion.reason, "file-limit");
});

test("incomplete-empty list results are typed while a fully enumerated empty repository is a complete success", async () => {
  const emptyRoot = createWorkspace("Actually Empty");
  const empty = await listRepositoryFiles(emptyRoot, { gitBacked: false });
  assert.deepEqual(empty.files, []);
  assert.equal(empty.truncated, false);
  assert.deepEqual(empty.completion, {
    status: "complete",
    reason: null,
    visitedEntries: 0,
    candidateFiles: 0,
    elapsedMs: empty.completion.elapsedMs,
  });

  const visitRoot = createWorkspace("Visit Bound");
  write(visitRoot, "deep/child/target.md", "target\n");
  await assert.rejects(
    listRepositoryFiles(visitRoot, { gitBacked: false, maxVisitedEntries: 1 }),
    (error) => incompleteWithReason(error, "list", "visit-limit"),
  );

  const deadlineRoot = createWorkspace("Deadline Bound");
  write(deadlineRoot, "target.md", "target\n");
  const originalReaddir = fs.promises.readdir;
  fs.promises.readdir = async function delayedRootRead(directory, ...args) {
    if (path.resolve(String(directory)) === path.resolve(deadlineRoot)) {
      await delay(10);
    }
    return originalReaddir.call(this, directory, ...args);
  };
  try {
    await assert.rejects(
      listRepositoryFiles(deadlineRoot, { gitBacked: false, traversalDeadlineMs: 1 }),
      (error) => incompleteWithReason(error, "list", "deadline"),
    );
  } finally {
    fs.promises.readdir = originalReaddir;
  }
});

test("partial zero-match searches fail closed and partial searches with matches expose the exact reason", async () => {
  const root = createWorkspace("Search Bounds");
  write(root, "a-first.txt", "ordinary\n");
  write(root, "b-second.txt", "needle\n");

  await assert.rejects(
    searchRepositoryFiles(root, "needle", { gitBacked: false, maxCandidateFiles: 1 }),
    (error) => incompleteWithReason(error, "search", "candidate-limit"),
  );

  write(root, "a-first.txt", "needle\n");
  const partial = await searchRepositoryFiles(root, "needle", { gitBacked: false, maxCandidateFiles: 1 });
  assert.equal(partial.matches.length, 1);
  assert.equal(partial.truncated, true);
  assert.equal(partial.completion.status, "partial");
  assert.equal(partial.completion.reason, "candidate-limit");
  assert.equal(partial.completion.scannedFiles, 1);
  assert.ok(partial.completion.contentBytesRead > 0);

  const noMatch = await searchRepositoryFiles(root, "definitively-absent", { gitBacked: false });
  assert.deepEqual(noMatch.matches, []);
  assert.equal(noMatch.completion.status, "complete");
  assert.equal(noMatch.completion.reason, null);

  const oversizedRoot = createWorkspace("Oversized Search Candidate");
  write(oversizedRoot, "oversized.txt", "x".repeat(500_001));
  await assert.rejects(
    searchRepositoryFiles(oversizedRoot, "needle", { gitBacked: false }),
    (error) => incompleteWithReason(error, "search", "file-size-limit"),
  );
});

test("Git-backed list and search retain truthful completion semantics", async () => {
  const root = createGitWorkspace("Git Enumeration");
  write(root, "a-first.txt", "ordinary\n");
  write(root, "b-second.txt", "needle\n");
  git(root, ["add", "."]);

  const complete = await listRepositoryFiles(root, { gitBacked: true });
  assert.equal(complete.completion.status, "complete");
  assert.equal(complete.completion.reason, null);

  const partial = await listRepositoryFiles(root, { gitBacked: true, maxFiles: 1 });
  assert.equal(partial.files.length, 1);
  assert.equal(partial.completion.reason, "file-limit");

  await assert.rejects(
    searchRepositoryFiles(root, "needle", { gitBacked: true, maxCandidateFiles: 1 }),
    (error) => incompleteWithReason(error, "search", "candidate-limit"),
  );
});

test("MCP tool results omit local roots, retain exact reads, and reject invented workspace IDs", async () => {
  const root = createWorkspace("Explorer Theme");
  const workCardPath = "planning/phases/phase-10/Work_Cards/RC10_exact.md";
  const reportPath = "planning/phases/phase-10/Implementer_Reports/IMPLEMENTER_REPORT_RC10_exact.md";
  write(root, "README.md", "repository marker\n");
  write(root, workCardPath, "# RC10 exact Work Card\n");
  write(root, reportPath, "# RC10 exact Implementer Report\n");
  const registry = createRegistry(root);

  const listed = await registry.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "explorer_theme", action: "list_files", params: { maxFiles: 1 } },
  });
  assert.equal(listed.ok, true);
  assert.equal(Object.hasOwn(listed.payload, "root"), false);
  assert.equal(listed.payload.completion.status, "partial");
  assert.equal(listed.payload.completion.reason, "file-limit");
  assert.doesNotMatch(JSON.stringify(listed), new RegExp(escapeRegExp(path.resolve(root)), "i"));

  for (const relativePath of [workCardPath, reportPath]) {
    const exact = await registry.callTool({
      name: "repo_toolbox",
      scope: "files.read",
      arguments: { workspaceId: "explorer_theme", action: "read_file", params: { relativePath } },
    });
    assert.equal(exact.ok, true);
    assert.equal(exact.payload.relativePath, relativePath);
  }

  const invented = await registry.callTool({
    name: "repo_toolbox",
    scope: "files.read",
    arguments: { workspaceId: "explorer_theme_greenfield", action: "list_files" },
  });
  assert.equal(invented.ok, false);
  assert.equal(invented.error.code, "WORKSPACE_ACCESS_DENIED");
});

test("generated MCP prompt contract forbids absence and workspace-ID inference from incomplete results", () => {
  const root = createWorkspace("Explorer Theme");
  const prompt = buildMcpWorkspaceBindingPromptBlock(root).join("\n");
  assert.match(prompt, /truncated or incomplete repository result never establishes that an artifact is absent/i);
  assert.match(prompt, /Prefer an exact known artifact path over broad repository enumeration/i);
  assert.match(prompt, /Use registered workspace IDs exactly as returned by registered-workspace diagnostics/i);
  assert.match(prompt, /do not invent, normalize, or infer an alternate workspaceId/i);
  assert.match(prompt, /unknown workspaceId fails closed with WORKSPACE_ACCESS_DENIED/i);
});

function incompleteWithReason(error, operation, reason) {
  return error?.code === "REPOSITORY_TRAVERSAL_INCOMPLETE" &&
    error.details?.operation === operation &&
    error.details?.usefulResultCount === 0 &&
    error.details?.completion?.status === "incomplete" &&
    error.details?.completion?.reason === reason &&
    !JSON.stringify(error.details).includes(path.parse(process.cwd()).root);
}

function createRegistry(root) {
  const context = resolveWorkspaceRootContext(root);
  const workspaceAccess = createRegisteredWorkspaceAccessProvider({
    resolveWorkspaceContext: (workspaceId) => {
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
  const container = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-repository-semantics-"));
  const root = path.join(container, name);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function createGitWorkspace(name) {
  const root = createWorkspace(name);
  git(root, ["init"]);
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

function tryCreateDirectoryLink(target, linkPath) {
  try {
    fs.symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error?.code !== "EPERM") {
      throw error;
    }
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
