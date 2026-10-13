const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createAgentHarnessToolRegistry } = require("../../dist/main/agentHarness/tools/toolRegistry.js");
const { LocalGitRepositoryAccessService } = require("../../dist/main/agentHarness/workspace/localGitRepositoryAccessService.js");
const { startAgentHarnessHttpRuntime } = require("../../dist/main/agentHarness/runtime/httpRuntime.js");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { execFileSync } = require("node:child_process");

test("RMCP repository process uses disconnected portable targets and bounds programs paths source output secrets and process trees", { timeout: 180000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-process-"));
  const first = path.join(root, "one"), second = path.join(root, "two");
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true, stdio: "pipe" }).trim();
  const script = `const fs = require('node:fs');
const {spawn} = require('node:child_process');
const mode = process.argv[2];
if(mode === 'tree') {
  const child = spawn(process.execPath, ['fixture.cjs', 'wait'], {stdio:'ignore'});
  fs.writeFileSync('pids.json', JSON.stringify([process.pid,child.pid]));
  setInterval(()=>{},1000);
} else if(mode === 'wait') setInterval(()=>{},1000);
else if(mode === 'flood') { process.stdout.write('o'.repeat(200000)); process.stderr.write('e'.repeat(200000)); }
else if(mode === 'paths') process.stdout.write('/x '.repeat(30000));
else if(mode === 'unicode') process.stdout.write('a' + '🌊'.repeat(40000));
else if(mode === 'secret') { console.log(process.argv[3]); console.error(process.argv[3]); }
else if(mode === 'partial') process.stdout.write('x'.repeat(65530) + process.argv[3]);
else if(mode === 'nonzero') process.exitCode = 7;
else {
  fs.writeFileSync('ran.txt','yes');
  const names=['FORGEJO_TOKEN','GITHUB_TOKEN','CHAMPCITY_SECRET','OPENAI_API_KEY','NODE_OPTIONS','GIT_CONFIG_VALUE_0'];
  console.log(JSON.stringify({numeric:1,cwd:process.cwd(), present:names.filter(key=>process.env[key]),stdin:fs.readFileSync(0,'utf8')}));
}`;
  for (const directory of [first, second]) {
    fs.mkdirSync(directory); git(directory, "init", "-b", "dev"); fs.writeFileSync(path.join(directory, "fixture.cjs"), script);
    git(directory, "add", "."); git(directory, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "seed");
  }
  const access = new LocalGitRepositoryAccessService(() => [root]);
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(root, "harness"), localGitAccess: access, workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not register a workspace"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: path.join(root, "harness"), registry, allowUnauthenticatedLocal: true });
  t.after(async () => { await runtime.close(); await registry.shutdownProviders(); fs.rmSync(root, { recursive: true, force: true }); });
  const call = async (name, action, params) => {
    const client = new Client({ name: "process-fixture", version: "1" });
    const transport = new StreamableHTTPClientTransport(new URL(runtime.url));
    await client.connect(transport);
    try { return (await client.callTool({ name, arguments: { action, params } })).structuredContent; }
    finally { await transport.terminateSession(); await client.close(); }
  };
  const group = (await call("git_toolbox", "discover_local_repositories", { directory: first })).payload.repositories[0];
  const other = (await call("git_toolbox", "discover_local_repositories", { directory: second })).payload.repositories[0];
  const selected = (await call("git_toolbox", "select_repository_context", { repositoryHandle: group.repositoryHandle })).payload;
  const target = { repositoryContextHandle: selected.repositoryContextHandle, localCheckoutHandle: group.checkouts[0].localCheckoutHandle };
  const params = { ...target, program: "node", arguments: ["fixture.cjs"], expectedHead: selected.headCommit };
  const direct = (extra, signal) => registry.callTool({ name: "development_toolbox", arguments: { action: "run_repository_process", params: { ...params, ...extra } }, principal: "local-unauthenticated", signal });
  const names = ["FORGEJO_TOKEN", "GITHUB_TOKEN", "CHAMPCITY_SECRET", "OPENAI_API_KEY", "NODE_OPTIONS", "GIT_CONFIG_VALUE_0", "ELECTRON_RUN_AS_NODE"];
  const saved = new Map(names.map(name => [name, process.env[name]]));
  names.forEach(name => { process.env[name] = "synthetic-process-private-value"; });
  process.env.ELECTRON_RUN_AS_NODE = "1";
  try {
    const result = await call("development_toolbox", "run_repository_process", params);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.payload.exitCode, 0); assert.equal(result.payload.startingHead, selected.headCommit);
    assert.equal(result.payload.terminationReason, "exited"); assert.equal(result.workspaceId, undefined);
    const output = JSON.parse(result.payload.stdout); assert.equal(output.numeric, 1); assert.equal(output.cwd, "<checkout>"); assert.deepEqual(output.present, []); assert.equal(output.stdin, "");
    assert.equal(JSON.stringify(result).includes(root), false);
    for (const mode of ["secret", "partial"]) {
      const secret = await direct({ arguments: ["fixture.cjs", mode, "synthetic-process-private-value"] });
      assert.equal(secret.ok, true, JSON.stringify(secret)); assert.equal(JSON.stringify(secret).includes("synthetic-process-private-value"), false);
      assert.equal(secret.payload.stdout.includes("synthe"), false, "capture boundary must redact partial credentials");
    }
  } finally { for (const [name, value] of saved) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } }
  fs.unlinkSync(path.join(first, "ran.txt"));
  const stale = await direct({ expectedHead: "0".repeat(40) }); assert.equal(stale.error.code, "STALE_SOURCE"); assert.equal(fs.existsSync(path.join(first, "ran.txt")), false);
  const wrong = await direct({ localCheckoutHandle: other.checkouts[0].localCheckoutHandle }); assert.equal(wrong.error.code, "REPOSITORY_CONTEXT_MISMATCH"); assert.equal(fs.existsSync(path.join(second, "ran.txt")), false);
  for (const program of ["cmd.exe", "powershell", "pwsh", "bash", "sh", "node fixture.cjs", process.execPath]) assert.equal((await direct({ program })).ok, false, program);
  for (const arguments of [["../fixture.cjs"], [path.join(first, "fixture.cjs")], ["--output=../../escape"], ["--output=/tmp/escape"], [".git/config"], ["NUL.txt"], ["file.bin:stream"], ["-e", "process.exit()"], ["--eval=process.exit()"], ["x\ncmd"], Array(129).fill("x"), Array(10).fill("x".repeat(4096))]) assert.equal((await direct({ arguments })).ok, false, JSON.stringify(arguments).slice(0,100));
  for (const extra of [{ cwd: second }, { env: { X: "x" } }, { timeoutMs: 600001 }, { timeoutMs: 1 }, { arguments: ["x".repeat(4097)] }]) assert.equal((await direct(extra)).ok, false);
  assert.equal((await registry.callTool({ name: "development_toolbox", scope: "files.read", arguments: { action: "run_repository_process", params } })).error.code, "OAUTH_SCOPE_DENIED");
  const nonzero = await direct({ arguments: ["fixture.cjs", "nonzero"] }); assert.equal(nonzero.payload.exitCode, 7); assert.equal(nonzero.payload.terminationReason, "exited");
  const flood = await direct({ arguments: ["fixture.cjs", "flood"] }); assert.equal(flood.ok, true); assert.equal(Buffer.byteLength(flood.payload.stdout), 65536); assert.equal(Buffer.byteLength(flood.payload.stderr), 65536); assert.equal(flood.payload.stdoutTruncated, true); assert.equal(flood.payload.stderrTruncated, true);
  for (const mode of ["paths", "unicode"]) { const result = await direct({ arguments: ["fixture.cjs", mode] }); assert.equal(result.ok, true); assert.ok(Buffer.byteLength(result.payload.stdout) <= 65536); assert.equal(result.payload.stdoutTruncated, true); }
  const isAlive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const pidsFile = path.join(first, "pids.json");
  const waitForPids = async () => { const end = Date.now()+20000; while (!fs.existsSync(pidsFile) && Date.now()<end) await new Promise(r => setTimeout(r, 30)); assert.ok(fs.existsSync(pidsFile)); return JSON.parse(fs.readFileSync(pidsFile)); };
  const timed = await direct({ arguments: ["fixture.cjs", "tree"], timeoutMs: 1500 }); assert.equal(timed.ok, true, JSON.stringify(timed)); assert.equal(timed.payload.terminationReason, "timeout");
  const timedPids = await waitForPids(); assert.deepEqual(timedPids.map(isAlive), [false,false]); fs.unlinkSync(pidsFile);
  const controller = new AbortController(); const pending = direct({ arguments: ["fixture.cjs", "tree"], timeoutMs: 30000 }, controller.signal);
  const cancelledPids = await waitForPids(); controller.abort(); const cancelled = await pending;
  assert.equal(cancelled.ok, true, JSON.stringify(cancelled)); assert.equal(cancelled.payload.terminationReason, "cancelled"); assert.deepEqual(cancelledPids.map(isAlive), [false,false]);
  const preCancelled = new AbortController(); preCancelled.abort(); fs.unlinkSync(pidsFile);
  assert.equal((await direct({ arguments: ["fixture.cjs", "tree"] }, preCancelled.signal)).payload.terminationReason, "cancelled"); assert.equal(fs.existsSync(pidsFile), false);
  // Exercise the SDK cancellation notification and the server's current AbortSignal.
  const cancelClient = new Client({ name: "process-cancel", version: "1" });
  const cancelTransport = new StreamableHTTPClientTransport(new URL(runtime.url)); await cancelClient.connect(cancelTransport);
  const originalCall = registry.callTool;
  let finished;
  const finishedPromise = new Promise(resolve => { finished = resolve; });
  registry.callTool = async request => { const result = await originalCall(request); if (request.name === "development_toolbox") finished(result); return result; };
  try {
    const sdkController = new AbortController();
    const request = cancelClient.callTool({ name: "development_toolbox", arguments: { action: "run_repository_process", params: { ...params, arguments: ["fixture.cjs", "tree"], timeoutMs: 30000 } } }, undefined, { signal: sdkController.signal });
    const rejected = assert.rejects(request);
    const sdkPids = await waitForPids(); sdkController.abort(); await rejected;
    let timer;
    const completed = await Promise.race([finishedPromise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error("MCP cancellation cleanup timed out")), 15000); })]).finally(() => clearTimeout(timer));
    assert.equal(completed.payload.terminationReason, "cancelled"); assert.deepEqual(sdkPids.map(isAlive), [false,false]);
  } finally { registry.callTool = originalCall; await cancelTransport.terminateSession(); await cancelClient.close(); }
  await fs.promises.symlink(first, path.join(first, "redirect"), process.platform === "win32" ? "junction" : "dir");
  assert.equal((await direct({ arguments: ["redirect/fixture.cjs"] })).ok, false); fs.rmSync(path.join(first, "redirect"), { recursive: true });
  fs.linkSync(path.join(first, "fixture.cjs"), path.join(first, "hard.cjs")); assert.equal((await direct({ arguments: ["hard.cjs"] })).ok, false); fs.unlinkSync(path.join(first, "hard.cjs"));
  // Replaced checkout control metadata cannot run a process, even with old handles.
  const control = path.join(first, ".git"), savedControl = path.join(first, "saved-control"); fs.renameSync(control, savedControl); git(first, "init", "-b", "dev");
  assert.equal((await direct({})).error.code, "REPOSITORY_CONTEXT_STALE");
});

test("RMCP repair discovers generic trusted common directories and rejects inconsistent worktree identity", { timeout: 120000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-topology-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
  const seed = path.join(root, "seed"); fs.mkdirSync(seed); git(seed, "init", "-b", "dev");
  fs.writeFileSync(path.join(seed, "source.txt"), "fixture"); git(seed, "add", "."); git(seed, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "seed");
  for (const layout of ["metadata/control", ".champcity/repository.git"]) {
    const trusted = path.join(root, layout.startsWith("metadata") ? "generic" : "managed"); fs.mkdirSync(trusted);
    const common = path.join(trusted, layout); fs.mkdirSync(path.dirname(common), { recursive: true });
    git(trusted, "clone", "--bare", "--no-local", seed, common);
    const dev = path.join(trusted, "Dev"), main = path.join(trusted, "Main");
    git(trusted, "--git-dir", common, "worktree", "add", dev, "dev");
    git(dev, "worktree", "add", "-b", "main", main, "HEAD");
    const access = new LocalGitRepositoryAccessService(() => [trusted]), session = {};
    const discovery = await access.discover({ directory: dev }, session);
    assert.equal(discovery.repositories.length, 1); const group = discovery.repositories[0];
    assert.equal(group.checkouts.length, 2); assert.ok(group.checkouts.every(checkout => checkout.repositoryHandle === group.repositoryHandle && !checkout.primary));
    const selection = await access.selectContext(session, { repositoryHandle: group.repositoryHandle, branchName: "main" });
    assert.equal(selection.activeBranch, "main");
    await access.withContext(session, selection.selectedCheckout.localCheckoutHandle, checkout => assert.equal(checkout.commonDirectory, common));
    assert.equal((await access.discover({ directory: common })).repositories.length, 0, "bare metadata never issues a checkout handle");
    const gitDir = git(dev, "rev-parse", "--absolute-git-dir");
    const hardlink = path.join(trusted, "pointer-hardlink"); fs.linkSync(path.join(dev, ".git"), hardlink);
    await assert.rejects(access.discover({ directory: dev })); fs.unlinkSync(hardlink);
    const replace = (file, content) => { const descriptor = fs.openSync(file, "r+"); try { fs.ftruncateSync(descriptor); fs.writeFileSync(descriptor, content); } finally { fs.closeSync(descriptor); } };
    const rejects = async (file, content) => { const bytes = fs.readFileSync(file); replace(file, content); try { await assert.rejects(access.discover({ directory: dev })); } finally { replace(file, bytes); } };
    await rejects(path.join(gitDir, "gitdir"), path.join(main, ".git"));
    await rejects(path.join(gitDir, "commondir"), seed);
    await rejects(path.join(gitDir, "commondir"), "");
    await rejects(path.join(main, ".git"), `gitdir: ${path.join(seed, ".git")}\n`);
    const config = path.join(common, "config"); await rejects(config, fs.readFileSync(config, "utf8") + "\n[include]\npath = external\n");
    const alternate = path.join(common, "objects", "info", "alternates"); fs.writeFileSync(alternate, seed);
    await assert.rejects(access.discover({ directory: dev })); fs.unlinkSync(alternate);
    const saved = common + "-saved"; fs.renameSync(common, saved); fs.symlinkSync(saved, common, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(access.discover({ directory: dev })); fs.rmSync(common, { recursive: true }); fs.renameSync(saved, common);
    const moved = main + "-moved"; fs.renameSync(main, moved); await assert.rejects(access.discover({ directory: dev })); fs.renameSync(moved, main);
    assert.equal((await access.discover({ directory: dev })).repositories[0].checkouts.length, 2);
  }
  const trusted = path.join(root, "separate"); fs.mkdirSync(trusted);
  const checkout = path.join(trusted, "source"), common = path.join(trusted, "control");
  git(trusted, "init", "--separate-git-dir", common, checkout);
  const access = new LocalGitRepositoryAccessService(() => [trusted]);
  assert.equal((await access.discover({ directory: checkout })).repositories[0].checkouts[0].primary, true);
  const external = new LocalGitRepositoryAccessService(() => [checkout]);
  await assert.rejects(external.discover({ directory: checkout }), /outside Trusted/);
});

test("RMCP generic public MCP bootstraps independent repositories and closes identity clone index worktree and remote gaps", { timeout: 600000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-qual-")), first = path.join(root, "one"), second = path.join(root, "two"); fs.mkdirSync(first); fs.mkdirSync(second);
  let now = Date.now(); const access = new LocalGitRepositoryAccessService(() => [root], () => now);
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(root, "harness"), localGitAccess: access, workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not enroll a Project"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: path.join(root, "harness"), registry, allowUnauthenticatedLocal: true });
  const a = new Client({ name: "independent-one", version: "1" }), b = new Client({ name: "independent-two", version: "1" });
  t.after(async () => { await a.close(); await b.close(); await runtime.close(); await registry.shutdownProviders(); fs.rmSync(root, { recursive: true, force: true }); });
  await a.connect(new StreamableHTTPClientTransport(new URL(runtime.url))); await b.connect(new StreamableHTTPClientTransport(new URL(runtime.url)));
  const invoke = async (client, action, params = {}) => { const response = await client.callTool({ name: "git_toolbox", arguments: { action, params } }); return response.structuredContent ?? response; };
  const success = async (client, action, params) => { const response = await invoke(client, action, params); assert.equal(response.ok, true, JSON.stringify(response)); return response.payload; };
  const one = await success(a, "init_local_repository", { directory: first, initialBranch: "dev" });
  const two = await success(b, "init_local_repository", { directory: second, initialBranch: "dev" });
  assert.notEqual(one.repositoryHandle, two.repositoryHandle);
  const select = (client, checkout) => success(client, "select_repository_context", { repositoryHandle: checkout.repositoryHandle, localCheckoutHandle: checkout.localCheckoutHandle });
  await select(a, one); await select(b, two);
  const run = (client, checkout, action, params = {}) => success(client, action, { localCheckoutHandle: checkout.localCheckoutHandle, ...params });
  const state = (client, checkout) => run(client, checkout, "inspect_git_state");
  const write = async (client, checkout, filePath, content, stage = true) => { const file = await run(client, checkout, "inspect_git_file", { filePath }); return run(client, checkout, "write_git_file_cas", { filePath, content, stage, expectedFileState: file.fileState, expectedIndexState: file.indexState }); };
  for (const [client, checkout, content] of [[a, one, "first\n"], [b, two, "unrelated\n"]]) {
    const identity = await run(client, checkout, "inspect_git_identity");
    await run(client, checkout, "configure_git_identity", { name: "MCP Fixture", email: "fixture@example.invalid", expectedConfigurationState: identity.configurationState });
    assert.equal((await invoke(client, "configure_git_identity", { localCheckoutHandle: checkout.localCheckoutHandle, name: "stale", email: "stale@example.invalid", expectedConfigurationState: identity.configurationState })).ok, false);
    await write(client, checkout, "file.txt", content); await run(client, checkout, "commit", { message: "MCP bootstrap" });
  }
  const firstState = await state(a, one), secondState = await state(b, two); assert.notEqual(firstState.head, secondState.head);
  assert.equal((await invoke(a, "status", { localCheckoutHandle: two.localCheckoutHandle })).error.code, "REPOSITORY_CONTEXT_MISMATCH");
  assert.equal((await run(b, two, "status")).headCommit, secondState.head);
  const discovered = await success(a, "discover_local_repositories", { directory: root }); assert.equal(discovered.repositories.length, 2);
  await select(a, one);
  const clone = await run(a, one, "clone_local_repository", { destinationDirectory: path.join(root, "clone"), branch: "dev", expectedSourceCommit: firstState.head });
  assert.equal(clone.headCommit, firstState.head); assert.equal(clone.requiresRepositorySelection, true);
  assert.equal((await invoke(a, "status", { localCheckoutHandle: clone.localCheckoutHandle })).error.code, "REPOSITORY_CONTEXT_MISMATCH");
  await run(a, one, "checkout_ref", { ref: firstState.head, expectedState: firstState.state });
  assert.equal((await invoke(a, "checkout_branch", { localCheckoutHandle: one.localCheckoutHandle, branchName: "dev", expectedBranchCommit: secondState.head, expectedState: (await state(a, one)).state })).ok, false);
  assert.equal((await run(a, one, "checkout_branch", { branchName: "dev", expectedBranchCommit: firstState.head, expectedState: (await state(a, one)).state })).branch, "refs/heads/dev");
  await write(a, one, "file.txt", "staged change\n");
  await run(a, one, "restore_file_cas", { filePath: "file.txt", expectedState: (await state(a, one)).state, sourceRef: firstState.head, index: true, worktree: false });
  assert.equal(fs.readFileSync(path.join(first, "file.txt"), "utf8"), "staged change\n");
  await run(a, one, "restore_file_cas", { filePath: "file.txt", expectedState: (await state(a, one)).state, index: false, worktree: true }); assert.equal(fs.readFileSync(path.join(first, "file.txt"), "utf8").replace(/\r\n/g, "\n"), "first\n");
  await run(a, one, "create_tag", { tagName: "v1", tagType: "annotated", target: firstState.head, message: "bounded object" });
  const tag = await run(a, one, "inspect_tag_object", { tagName: "v1" }); assert.notEqual(tag.objectId, firstState.head);
  assert.equal((await invoke(a, "delete_tag_cas", { localCheckoutHandle: one.localCheckoutHandle, tagName: "v1", expectedObjectId: firstState.head })).ok, false);
  assert.equal((await run(a, one, "delete_tag_cas", { tagName: "v1", expectedObjectId: tag.objectId })).objectId, null);
  const tree = await run(a, one, "create_local_worktree", { destinationDirectory: path.join(root, "linked"), branchName: "linked", sourceRef: firstState.head });
  await select(a, tree);
  assert.equal((await run(a, tree, "set_local_worktree_lock", { locked: true, expectedLocked: false, expectedHead: firstState.head, expectedBranch: "linked", reason: "fixture lock" })).locked, true);
  assert.equal((await invoke(a, "remove_local_worktree", { localCheckoutHandle: tree.localCheckoutHandle, expectedBranch: "linked" })).ok, false);
  assert.equal((await run(a, tree, "set_local_worktree_lock", { locked: false, expectedLocked: true, expectedHead: firstState.head, expectedBranch: "linked" })).locked, false);
  await run(a, tree, "remove_local_worktree", { expectedBranch: "linked" });
  await success(a, "discover_local_repositories", { directory: root }); await select(a, one);
  let remote = await run(a, one, "bind_local_repository_remote", { sourceCheckoutHandle: two.localCheckoutHandle, remoteName: "peer" });
  assert.equal((await invoke(a, "remove_remote", { localCheckoutHandle: one.localCheckoutHandle, remoteName: "peer", expectedBinding: "0".repeat(64) })).ok, false);
  const oldBinding = remote.binding;
  remote = await run(a, one, "configure_remote_tracking", { remote: "peer", sourceBranch: "dev", trackingBranch: "dev", expectedBinding: remote.binding }); assert.notEqual(remote.binding, oldBinding);
  assert.equal((await invoke(a, "rename_remote", { localCheckoutHandle: one.localCheckoutHandle, remote: "peer", newName: "other", expectedBinding: oldBinding })).ok, false);
  remote = await run(a, one, "rename_remote", { remote: "peer", newName: "other", expectedBinding: remote.binding }); assert.equal(remote.remote, "other");
  await run(a, one, "remove_remote", { remoteName: "other", expectedBinding: remote.binding });
  assert.deepEqual((await run(a, one, "inspect_remotes")).remotes, []);
  await select(a, two); assert.equal((await invoke(a, "status", { localCheckoutHandle: one.localCheckoutHandle })).error.code, "REPOSITORY_CONTEXT_MISMATCH"); await select(a, one);
  for (const params of [{ sourceRef: firstState.head, mode: "hard", expectedState: firstState.state }, { sourceRef: firstState.head, mode: "mixed", expectedState: firstState.state, command: "git clean -fd" }]) { const response = await invoke(a, "reset_ref", { localCheckoutHandle: one.localCheckoutHandle, ...params }); assert.ok(response.isError || response.ok === false); }
  now += 31 * 60_000; assert.equal((await invoke(a, "status", { localCheckoutHandle: one.localCheckoutHandle })).error.code, "REPOSITORY_CONTEXT_STALE");
  assert.equal(fs.existsSync(path.join(first, ".champcity")), false); assert.equal(fs.existsSync(path.join(second, ".champcity")), false);
});


test("RMCP portable context survives disconnected SDK clients and isolates repositories trust identity expiry and principals", { timeout: 180000 }, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rmcp-portable-"));
  const first = path.join(root, "one"), second = path.join(root, "two");
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true, stdio: "pipe" }).trim();
  for (const directory of [first, second]) {
    fs.mkdirSync(directory); git(directory, "init", "-b", "dev");
    git(directory, "config", "user.name", "Fixture"); git(directory, "config", "user.email", "fixture@example.invalid");
    fs.writeFileSync(path.join(directory, "file.txt"), path.basename(directory));
    git(directory, "add", "."); git(directory, "commit", "-m", "seed");
  }
  let now = Date.now(), roots = [first, second];
  const access = new LocalGitRepositoryAccessService(() => roots, () => now, next => { roots = next; });
  const registry = createAgentHarnessToolRegistry({ userDataRoot: path.join(root, "harness"), localGitAccess: access, workspaceAccess: {
    resolveWorkspaceContext: () => { throw Error("must not register a workspace"); }, listWorkspaceSummaries: () => [], listRepositoryCheckoutSummaries: () => [],
  } });
  const runtime = await startAgentHarnessHttpRuntime({ host: "127.0.0.1", port: 0, userDataRoot: path.join(root, "harness"), registry, allowUnauthenticatedLocal: true });
  t.after(async () => { await runtime.close(); await registry.shutdownProviders(); fs.rmSync(root, { recursive: true, force: true }); });
  const call = async (action, params, error) => {
    // Every invocation initializes AND terminates a distinct real SDK transport.
    const client = new Client({ name: "portable-fixture", version: "1" });
    const transport = new StreamableHTTPClientTransport(new URL(runtime.url));
    await client.connect(transport);
    try {
      const response = await client.callTool({ name: "git_toolbox", arguments: { action, params } });
      const result = response.structuredContent ?? response;
      assert.equal(result.ok, !error, JSON.stringify(result));
      if (error) assert.equal(result.error.code, error);
      assert.equal(JSON.stringify(result).includes(root), false, "context output must not expose filesystem paths");
      return result.payload;
    } finally { await transport.terminateSession(); await client.close(); }
  };
  const discover = async directory => (await call("discover_local_repositories", { directory })).repositories[0];
  const select = group => call("select_repository_context", { repositoryHandle: group.repositoryHandle, localCheckoutHandle: group.checkouts[0].localCheckoutHandle });
  const a = await discover(first), b = await discover(second);
  const ca = await select(a), cb = await select(b);
  assert.match(ca.repositoryContextHandle, /^local_context_[a-f0-9]{48}$/);
  assert.notEqual(ca.repositoryContextHandle, cb.repositoryContextHandle);
  const active = new Client({ name: "explicit-priority", version: "1" });
  const activeTransport = new StreamableHTTPClientTransport(new URL(runtime.url));
  await active.connect(activeTransport);
  try {
    await active.callTool({ name: "git_toolbox", arguments: { action: "select_repository_context", params: { repositoryHandle: b.repositoryHandle } } });
    const explicit = await active.callTool({ name: "git_toolbox", arguments: { action: "inspect_repository_context", params: { repositoryContextHandle: ca.repositoryContextHandle } } });
    assert.equal(explicit.structuredContent.payload.repositoryHandle, a.repositoryHandle);
    const fallback = await active.callTool({ name: "git_toolbox", arguments: { action: "inspect_repository_context", params: {} } });
    assert.equal(fallback.structuredContent.payload.repositoryHandle, b.repositoryHandle);
  } finally { await activeTransport.terminateSession(); await active.close(); }
  const targetA = { repositoryContextHandle: ca.repositoryContextHandle, localCheckoutHandle: a.checkouts[0].localCheckoutHandle };
  const targetB = { repositoryContextHandle: cb.repositoryContextHandle, localCheckoutHandle: b.checkouts[0].localCheckoutHandle };
  assert.equal((await call("inspect_repository_context", { repositoryContextHandle: ca.repositoryContextHandle })).repositoryHandle, a.repositoryHandle);
  assert.equal((await call("status", targetA)).headCommit, ca.headCommit);
  assert.equal((await call("inspect_history", targetA)).resolvedCommit, ca.headCommit);
  await call("status", { localCheckoutHandle: targetA.localCheckoutHandle }, "REPOSITORY_CONTEXT_REQUIRED");
  await call("status", { ...targetA, repositoryContextHandle: "local_context_unknown" }, "REPOSITORY_CONTEXT_STALE");
  const beforeB = git(second, "rev-parse", "HEAD");
  await call("commit", { ...targetA, localCheckoutHandle: targetB.localCheckoutHandle, message: "must not execute" }, "REPOSITORY_CONTEXT_MISMATCH");
  assert.equal(git(second, "rev-parse", "HEAD"), beforeB);
  fs.writeFileSync(path.join(first, "change.txt"), "portable mutation");
  await call("stage_changes", { ...targetA, paths: ["change.txt"] });
  const commit = await call("commit", { ...targetA, message: "portable commit", expectedHead: ca.headCommit });
  assert.notEqual(git(first, "rev-parse", "HEAD"), ca.headCommit);
  assert.ok(commit); assert.equal((await call("status", targetB)).headCommit, beforeB);
  const crossPrincipal = await registry.callTool({ name: "git_toolbox", arguments: { action: "status", params: targetA }, principal: "different-client", scope: "files.read" });
  assert.equal(crossPrincipal.error.code, "REPOSITORY_CONTEXT_STALE");
  const revoked = await registry.callTool({ name: "git_toolbox", arguments: { action: "commit", params: { ...targetA, message: "denied" } }, principal: "local-unauthenticated", scope: "files.read" });
  assert.equal(revoked.error.code, "OAUTH_SCOPE_DENIED");
  await call("status", targetA);
  await call("configure_local_git_access", { operation: "remove", directories: [first], expectedConfigurationId: access.accessConfiguration().configurationId });
  await call("status", targetA, "REPOSITORY_CONTEXT_STALE"); await call("status", targetB);
  await call("configure_local_git_access", { operation: "add", directories: [first], expectedConfigurationId: access.accessConfiguration().configurationId });
  await call("status", targetA, "REPOSITORY_CONTEXT_STALE");
  const freshA = await discover(first), freshContext = await select(freshA);
  const freshTarget = { localCheckoutHandle: freshA.checkouts[0].localCheckoutHandle, repositoryContextHandle: freshContext.repositoryContextHandle };
  const old = path.join(first, "saved-control"); fs.renameSync(path.join(first, ".git"), old);
  git(first, "init", "-b", "dev");
  await call("inspect_repository_context", { repositoryContextHandle: freshContext.repositoryContextHandle }, "REPOSITORY_CONTEXT_STALE");
  fs.rmSync(path.join(first, ".git"), { recursive: true }); fs.renameSync(old, path.join(first, ".git"));
  await call("status", freshTarget, "REPOSITORY_CONTEXT_STALE");
  const linked = path.join(first, "linked"); git(first, "worktree", "add", "-b", "linked", linked);
  const group = await discover(first), linkedCheckout = group.checkouts.find(checkout => checkout.branchName === "linked");
  const linkedContext = await call("select_repository_context", { repositoryHandle: group.repositoryHandle, localCheckoutHandle: linkedCheckout.localCheckoutHandle });
  fs.renameSync(path.join(linked, ".git"), path.join(linked, "saved-pointer"));
  fs.writeFileSync(path.join(linked, ".git"), fs.readFileSync(path.join(linked, "saved-pointer")));
  await call("status", { repositoryContextHandle: linkedContext.repositoryContextHandle, localCheckoutHandle: linkedCheckout.localCheckoutHandle }, "REPOSITORY_CONTEXT_STALE");
  await call("status", targetB);
  now += 31 * 60_000;
  await call("inspect_repository_context", { repositoryContextHandle: cb.repositoryContextHandle }, "REPOSITORY_CONTEXT_STALE");
});
