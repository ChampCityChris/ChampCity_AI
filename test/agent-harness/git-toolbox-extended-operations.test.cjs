const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const { configureGitIdentity, git } = require("../support/git-mutation-fixtures.cjs");

test("unregistered selected Git checkout supports file CAS, stash, search, notes, reset and conflict recovery", { timeout: 600000 }, async t => {
  const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
  const trusted = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-ext-")), root = path.join(trusted, "one"); fs.mkdirSync(root);
  t.after(() => fs.rmSync(trusted, { recursive: true, force: true }));
  git(root, ["init", "-b", "dev"]); configureGitIdentity(root); git(root, ["config", "core.autocrlf", "false"]);
  fs.writeFileSync(path.join(root, "file.txt"), "baseline\n"); git(root, ["add", "--", "file.txt"]); git(root, ["commit", "-m", "baseline"]);
  const baseline = git(root, ["rev-parse", "HEAD"]), session = Object.freeze({});
  const registry = createAgentHarnessToolRegistry({ localGitAccess: new LocalGitRepositoryAccessService(() => [trusted]), userDataRoot: path.join(trusted, "harness"), workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not register a Project"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  let handle;
  const invoke = (action, params = {}, scope = "files.read files.write") => registry.callTool({ name: "git_toolbox", session, scope, arguments: { action, params: { ...(handle ? { localCheckoutHandle: handle } : {}), ...params } } });
  const success = async (action, params) => { const result = await invoke(action, params); assert.equal(result.ok, true, JSON.stringify(result.error)); return result.payload; };
  const discovered = await success("discover_local_repositories", { directory: trusted });
  const repository = discovered.repositories[0];
  await success("select_repository_context", { repositoryHandle: repository.repositoryHandle });
  handle = repository.checkouts[0].localCheckoutHandle;
  const state = () => success("inspect_git_state");
  const write = async content => { const inspected = await success("inspect_git_file", { filePath: "file.txt" }); return success("write_git_file_cas", { filePath: "file.txt", expectedFileState: inspected.fileState, expectedIndexState: inspected.indexState, content }); };
  const initial = await success("inspect_git_file", { filePath: "file.txt" });
  const originalBranch = await state();
  git(root, ["switch", "-c", "same-head"]);
  assert.equal((await invoke("reset_ref", { sourceRef: baseline, mode: "mixed", expectedState: originalBranch.state })).ok, false);
  git(root, ["switch", "dev"]);
  await write("working\n");
  const staleWrite = await invoke("write_git_file_cas", { filePath: "file.txt", expectedFileState: initial.fileState, expectedIndexState: initial.indexState, content: "stale" }); assert.equal(staleWrite.ok, false); assert.equal(fs.readFileSync(path.join(root, "file.txt"), "utf8"), "working\n");
  const dirty = await state(); await write("changed again\n");
  assert.equal((await invoke("stash_create", { expectedState: dirty.state, paths: ["file.txt"] })).ok, false);
  await success("stash_create", { expectedState: (await state()).state, paths: ["file.txt"], message: "saved work" });
  assert.equal(fs.readFileSync(path.join(root, "file.txt"), "utf8"), "baseline\n");
  let stash = (await success("stash_list")).entries[0];
  await success("stash_apply", { expectedState: (await state()).state, stashIndex: 0, expectedStashCommit: stash.commit });
  assert.equal(fs.readFileSync(path.join(root, "file.txt"), "utf8"), "changed again\n");
  await success("restore_files", { paths: ["file.txt"] });
  await success("stash_pop", { expectedState: (await state()).state, stashIndex: 0, expectedStashCommit: stash.commit });
  assert.equal((await success("stash_list")).entries.length, 0);
  await success("stash_create", { expectedState: (await state()).state, paths: ["file.txt"] });
  stash = (await success("stash_list")).entries[0];
  assert.equal((await invoke("stash_drop", { expectedState: (await state()).state, stashIndex: 0, expectedStashCommit: baseline })).ok, false);
  await success("stash_drop", { expectedState: (await state()).state, stashIndex: 0, expectedStashCommit: stash.commit });
  const scratch = await success("inspect_git_file", { filePath: "scratch.txt" });
  await success("write_git_file_cas", { filePath: scratch.filePath, expectedFileState: scratch.fileState, expectedIndexState: scratch.indexState, content: "untracked\n" });
  await success("stash_create", { expectedState: (await state()).state, paths: ["scratch.txt"], includeUntracked: true });
  assert.equal(fs.existsSync(path.join(root, "scratch.txt")), false);
  stash = (await success("stash_list")).entries[0];
  await success("stash_pop", { expectedState: (await state()).state, stashIndex: 0, expectedStashCommit: stash.commit });
  assert.equal(fs.readFileSync(path.join(root, "scratch.txt"), "utf8"), "untracked\n");
  await success("delete_untracked_file", { filePath: "scratch.txt", expectedState: (await state()).state });
  assert.equal(fs.existsSync(path.join(root, "scratch.txt")), false);
  assert.match((await success("blame", { filePath: "file.txt", startLine: 1, endLine: 1 })).porcelain, /baseline/);
  assert.equal((await success("grep", { query: "baseline", paths: ["file.txt"] })).matched, true);
  assert.equal((await success("grep", { query: "missing" })).matched, false);
  const note = await success("write_note", { ref: baseline, expectedNotesCommit: "absent", content: "bounded note" }); assert.match(note.content, /bounded note/);
  assert.equal((await invoke("write_note", { ref: baseline, expectedNotesCommit: "absent", content: "stale note" })).ok, false);
  await success("remove_note", { ref: baseline, expectedNotesCommit: note.notesCommit });
  await success("move_file", { filePath: "file.txt", destinationPath: "moved.txt", expectedState: (await state()).state });
  await success("commit", { message: "move", expectedHead: baseline });
  const moved = git(root, ["rev-parse", "HEAD"]);
  await success("reset_ref", { sourceRef: baseline, mode: "soft", expectedState: (await state()).state });
  assert.equal(git(root, ["rev-parse", "HEAD"]), baseline); assert.equal(fs.existsSync(path.join(root, "moved.txt")), true);
  await success("reset_ref", { sourceRef: moved, mode: "mixed", expectedState: (await state()).state });
  assert.equal((await state()).clean, true);
  await success("remove_file", { filePath: "moved.txt", expectedState: (await state()).state });
  await success("commit", { message: "remove", expectedHead: moved });
  await success("checkout_ref", { ref: baseline, expectedState: (await state()).state }); assert.equal(git(root, ["branch", "--show-current"]), "");
  // Arrange divergent refs; begin/resolve/continue/abort run through the published MCP.
  git(root, ["switch", "-c", "left"]); git(root, ["branch", "right", baseline]);
  await write("left\n"); await success("stage_changes", { paths: ["file.txt"] }); await success("commit", { message: "left" });
  git(root, ["switch", "right"]); await write("right\n"); await success("stage_changes", { paths: ["file.txt"] }); await success("commit", { message: "right" });
  const right = git(root, ["rev-parse", "HEAD"]);
  const conflict = await success("begin_git_operation", { operation: "merge", sourceRef: "left", expectedState: (await state()).state });
  assert.equal(conflict.outcome, "conflicted-or-failed"); assert.deepEqual(conflict.conflictingPaths, ["file.txt"]);
  assert.equal((await invoke("recover_git_operation", { operation: "merge", step: "continue", expectedState: conflict.state })).ok, false);
  let file = await success("inspect_git_file", { filePath: "file.txt" });
  await success("resolve_conflict_file", { filePath: "file.txt", expectedFileState: file.fileState, expectedIndexState: file.indexState, content: "resolved\n" });
  const continued = await success("recover_git_operation", { operation: "merge", step: "continue", expectedState: (await state()).state }); assert.equal(continued.outcome, "completed"); assert.equal(continued.clean, true);
  await success("reset_ref", { sourceRef: right, mode: "mixed", expectedState: (await state()).state }); await success("restore_files", { paths: ["file.txt"] });
  await success("begin_git_operation", { operation: "merge", sourceRef: "left", expectedState: (await state()).state });
  const aborted = await success("recover_git_operation", { operation: "merge", step: "abort", expectedState: (await state()).state }); assert.equal(aborted.head, right); assert.equal(aborted.clean, true);
  assert.equal((await success("diagnose_repository")).healthy, true);
  for (const filePath of ["../escape", ".git/config", "C:/outside", ".git./config"]) assert.equal((await invoke("inspect_git_file", { filePath })).ok, false);
  fs.linkSync(path.join(root, "file.txt"), path.join(root, "linked.txt"));
  assert.equal((await invoke("inspect_git_file", { filePath: "linked.txt" })).ok, false); fs.unlinkSync(path.join(root, "linked.txt"));
  const readOnly = await invoke("reset_ref", { sourceRef: baseline, mode: "mixed", expectedState: (await state()).state }, "files.read"); assert.equal(readOnly.error.code, "OAUTH_SCOPE_DENIED");
  assert.equal(fs.existsSync(path.join(root, ".champcity")), false);
});

test("RMCP direct rebase cherry-pick and revert preserve conflicts and recover through typed MCP", { timeout: 600000 }, async t => {
  const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-transform-")), checkout = path.join(root, "one"); fs.mkdirSync(checkout);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(checkout, ["init", "-b", "dev"]); configureGitIdentity(checkout); git(checkout, ["config", "core.autocrlf", "false"]);
  fs.writeFileSync(path.join(checkout, "file.txt"), "base\n"); git(checkout, ["add", "file.txt"]); git(checkout, ["commit", "-m", "base"]);
  const base = git(checkout, ["rev-parse", "HEAD"]);
  git(checkout, ["switch", "-c", "source"]); fs.writeFileSync(path.join(checkout, "file.txt"), "source\n"); git(checkout, ["commit", "-am", "source"]); const source = git(checkout, ["rev-parse", "HEAD"]);
  git(checkout, ["switch", "dev"]); fs.writeFileSync(path.join(checkout, "file.txt"), "target\n"); git(checkout, ["commit", "-am", "target"]); const target = git(checkout, ["rev-parse", "HEAD"]);
  // Arrange a merge object for explicit mainline selection; all requested transforms use MCP.
  git(checkout, ["switch", "-c", "merge-fixture", base]); git(checkout, ["merge", "--no-ff", "--no-edit", source]); const merge = git(checkout, ["rev-parse", "HEAD"]); git(checkout, ["switch", "dev"]);
  const session = Object.freeze({}), registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(root, "harness"), localGitAccess: new LocalGitRepositoryAccessService(() => [root]), workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not enroll a Project"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  let handle;
  const invoke = (action, params = {}) => registry.callTool({ name: "git_toolbox", scope: "files.read files.write", session, arguments: { action, params: { ...(handle ? { localCheckoutHandle: handle } : {}), ...params } } });
  const success = async (action, params) => { const response = await invoke(action, params); assert.equal(response.ok, true, JSON.stringify(response)); return response.payload; };
  const discovered = await success("discover_local_repositories", { directory: root }), repository = discovered.repositories[0];
  await success("select_repository_context", { repositoryHandle: repository.repositoryHandle }); handle = repository.checkouts[0].localCheckoutHandle;
  const state = () => success("inspect_git_state");
  for (const [operation, sourceRef] of [["rebase", source], ["cherry-pick", source], ["revert", source]]) {
    const conflict = await success("begin_git_operation", { operation, sourceRef, expectedState: (await state()).state }); assert.equal(conflict.outcome, "conflicted-or-failed"); assert.deepEqual(conflict.conflictingPaths, ["file.txt"]);
    const aborted = await success("recover_git_operation", { operation, step: "abort", expectedState: conflict.state }); assert.equal(aborted.head, target); assert.equal(aborted.clean, true);
  }
  const conflicted = await success("begin_git_operation", { operation: "cherry-pick", sourceRef: source, expectedState: (await state()).state }); assert.equal(conflicted.conflictingPaths.length, 1);
  const file = await success("inspect_git_file", { filePath: "file.txt" });
  await success("resolve_conflict_file", { filePath: "file.txt", content: "resolved\n", expectedFileState: file.fileState, expectedIndexState: file.indexState });
  assert.equal((await success("recover_git_operation", { operation: "cherry-pick", step: "continue", expectedState: (await state()).state })).outcome, "completed");
  await success("checkout_ref", { ref: source, expectedState: (await state()).state });
  assert.equal((await invoke("begin_git_operation", { operation: "revert", sourceRef: merge, mainline: 3, expectedState: (await state()).state })).ok, false);
  const reverted = await success("begin_git_operation", { operation: "revert", sourceRef: merge, mainline: 1, expectedState: (await state()).state }); assert.equal(reverted.outcome, "completed"); assert.equal(fs.readFileSync(path.join(checkout, "file.txt"), "utf8"), "base\n");
  assert.equal(fs.existsSync(path.join(checkout, ".champcity")), false);
});
