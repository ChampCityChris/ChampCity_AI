const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { runtimeFixture, selection, catalog } = require("../support/codex-runtime.cjs");
const { createCodexRuntimeOperations } = require("../../dist/main/workCardBuilding/codexRuntimeOperations.js");
const { normalizeModelCatalog } = require("../../dist/shared/codexRuntimeContracts.js");

test("newer compatible runtime is probed before atomic promotion and owns the launch", async () => {
  const fixture = runtimeFixture({ latestVersion: async () => "0.153.4" });
  await fixture.ready;
  assert.deepEqual(fixture.calls.slice(0, 4), ["probe", "stage", "probe", ["promote", "0.153.4"]]);
  assert.equal(fixture.manager.getStatus().updateState, "updated");
  await fixture.manager.launch();
  assert.equal(fixture.calls.at(-1)[1].executable, "managed/candidate/codex");
});

test("current runtime is retained; repeated initialization and status reads have no update/process side effects", async () => {
  const f = runtimeFixture(); await f.ready;
  const calls = [...f.calls];
  for (let i = 0; i < 30; i++) f.manager.getStatus();
  await f.manager.initialize(f.initializer, f.ops);
  assert.deepEqual(f.calls, calls);
  assert.equal(f.manager.getStatus().updateState, "current");
  assert.deepEqual(f.manager.getStatus().selection, selection);
});

test("first-launch offline bootstrap is copied/probed/promoted and update failure remains visible", async () => {
  const f = runtimeFixture({ loadCurrent: async () => null, latestVersion: async () => { throw Error("offline"); } });
  await f.ready;
  assert.equal(f.manager.getStatus().updateState, "degraded");
  assert.deepEqual(f.calls, ["probe", ["promote", "0.146.0"]]);
});

test("unavailable preferred selection and stale saved selections never use the catalog default", async () => {
  for (const saved of [null, selection, { model: "missing", reasoningEffort: "high" }, { model: "gpt-5.6-sol", reasoningEffort: "removed" }]) {
    const f = runtimeFixture({ readSelection: async () => saved, probe: async () => [{ ...catalog[0], supportedReasoningEfforts: ["low"], isDefault: true }] });
    await f.ready;
    assert.ok(f.manager.getStatus().selectionBlocker);
    assert.throws(() => f.manager.acquire(f.manager.getStatus().selection), /Choose|unavailable/);
    assert.deepEqual(f.manager.getStatus().selection, saved);
  }
});

test("explicit preferences are projected by both consumers and frozen during an active lease", async () => {
  const f = runtimeFixture(); await f.ready;
  await f.manager.setSelection({ ...selection, reasoningEffort: "low", sandbox: "danger-full-access" });
  assert.deepEqual(f.manager.getStatus().selection, { ...selection, reasoningEffort: "low" });
  const snapshot = { ...selection };
  const lease = f.manager.acquire(snapshot); snapshot.model = "tampered";
  assert.deepEqual(lease.selection, selection);
  assert.throws(() => f.manager.acquire(selection), /already active/);
  await assert.rejects(f.manager.setSelection(selection), /active/);
  lease.release();
  await f.manager.setSelection(selection);
  const exactRuns = Array.from({ length: 4 }, () => f.manager.acquireConcurrentExact(selection));
  assert.throws(() => f.manager.acquireConcurrentExact(selection), /shared Codex execution capacity is busy/i);
  exactRuns.forEach(exactRun => exactRun.release());
  assert.doesNotThrow(() => f.manager.acquireConcurrentExact(selection).release());
});

test("settings survive restart in supplied userData only", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-codex-settings-"));
  try {
    const ops = createCodexRuntimeOperations(root);
    await ops.writeSelection(selection);
    assert.deepEqual(await createCodexRuntimeOperations(root).readSelection(), selection);
    assert.deepEqual(await fs.readdir(root), ["codex-runtime"]);
    assert.deepEqual(await fs.readdir(path.join(root, "codex-runtime")), ["selection.json"]);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("model normalization preserves exact execution IDs and arbitrary ordered effort strings", () => {
  const raw = { ...catalog[0], supportedReasoningEfforts: [{ reasoningEffort: "future-effort" }, { reasoningEffort: "low" }] };
  assert.deepEqual(normalizeModelCatalog([raw])[0].supportedReasoningEfforts, ["future-effort", "low"]);
  assert.equal(normalizeModelCatalog([raw])[0].model, selection.model);
  assert.throws(() => normalizeModelCatalog([{ ...raw, model: undefined }]), /invalid/);
});


test("execution stays blocked until startup selects its final runtime", async () => {
  let finishLookup;
  const f = runtimeFixture({readSelection:async()=>selection,latestVersion:()=>new Promise(resolve=>{finishLookup=resolve;})});
  while(!finishLookup) await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.manager.getStatus().version,null);
  assert.equal(f.manager.getStatus().updateState,"initializing");
  assert.throws(()=>f.manager.acquire(selection),/startup initialization/);
  await assert.rejects(f.manager.setSelection(selection),/startup initialization/);
  await assert.rejects(f.manager.launch(),/unavailable/);
  finishLookup("0.153.4"); await f.ready;
  const lease=f.manager.acquire(selection);
  await f.manager.launch();
  assert.equal(f.calls.at(-1)[1].version,"0.153.4");
  lease.release();
});

test("a damaged prior runtime can recover through a compatible candidate", async () => {
  const f=runtimeFixture({loadCurrent:async()=>{throw Error("damaged pointer");},latestVersion:async()=>"0.153.4"});
  await f.ready;
  assert.equal(f.manager.getStatus().updateState,"updated");
  assert.equal(f.manager.getStatus().version,"0.153.4");
});

test("initializer failure atomically projects bounded unavailable state", async () => {
  const f = runtimeFixture();
  const manager = new (require("../../dist/main/workCardBuilding/codexRuntimeManager.js").CodexRuntimeManager)();
  await manager.initialize({
    initialize: async () => { throw Error("worker leaked an implementation detail"); },
    shutdown: async () => undefined,
  }, f.ops);
  assert.deepEqual(manager.getStatus(), {
    version: null,
    updateState: "unavailable",
    catalog: [],
    selection: null,
    selectionBlocker: "The managed Codex runtime is unavailable.",
    message: "Managed Codex runtime initialization failed in its utility worker. Retry Codex Runtime.",
    busy: false,
  });
  await assert.rejects(manager.launch(), /unavailable/);
});


test("production operations resolve userData runtime and spawn that executable without repository package source", async () => {
  const childProcess=require("node:child_process");
  const {EventEmitter}=require("node:events");
  const {PassThrough}=require("node:stream");
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"champcity-runtime-launch-"));
  const originalSpawn=childProcess.spawn;
  const originalExecFile=childProcess.execFile;
  const calls=[];
  const directory="11111111-1111-1111-1111-111111111111";
  let adapter;
  try {
    await fs.mkdir(path.join(root,"codex-runtime"));
    await fs.writeFile(path.join(root,"codex-runtime","current.json"),JSON.stringify({directory,version:"0.153.4"}));
    childProcess.execFile=(_command,args,_options,done)=>{assert.deepEqual(args,["mcp","list","--json"]);done(null,"[]","");};
    childProcess.spawn=(command,args,options)=>{
      calls.push({command,args,options});
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();
      child.kill=()=>{child.killed=true;queueMicrotask(()=>child.emit("exit",0));return true;};
      child.stdin.on("data",data=>{const request=JSON.parse(data.toString());if(request.method==="initialize")child.stdout.write(JSON.stringify({id:request.id,result:{userAgent:"fixture",codexHome:"<CODEX_HOME>"}})+"\n");if(request.method==="mcpServerStatus/list")child.stdout.write(JSON.stringify({id:request.id,result:{data:[],nextCursor:null}})+"\n");});
      return child;
    };
    const ops=createCodexRuntimeOperations(root);
    const runtime=await ops.loadCurrent();
    adapter=await ops.launch(runtime);
    assert.equal(calls.length,2);
    assert.equal(calls[0].command,runtime.executable);
    assert.equal(path.relative(path.join(root,"codex-runtime","versions",directory),runtime.executable).startsWith(".."),false);
    assert.doesNotMatch(calls[0].command,/node_modules/);
    assert.deepEqual(calls[0].args,["-c","features.apps=false","-c","features.plugins=false","app-server","--listen","stdio://"]);
    assert.ok(calls[0].options.env.CODEX_HOME);
    assert.equal(calls[0].options.windowsHide,true);
  } finally {await adapter?.dispose();childProcess.spawn=originalSpawn;childProcess.execFile=originalExecFile;await fs.rm(root,{recursive:true,force:true});}
});


test("connection inventory failure preserves verified runtime/catalog and explicit selection", async () => {
  const f = runtimeFixture({ readSelection: async () => selection,
    refreshConnections: async () => { throw Error("inventory failure"); },
    getConnectionsStatus: () => ({ connections: [], requiredReady: false, optionalWarnings: 0, blocker: "Connection inventory check failed." }),
  });
  await f.ready;
  assert.equal(f.manager.getStatus().updateState, "current");
  assert.deepEqual(f.manager.getStatus().catalog, catalog);
  assert.deepEqual(f.manager.getStatus().selection, selection);
  assert.match(f.manager.getStatus().connections.blocker, /inventory/);
  await f.manager.setSelection(selection);
});

test("unavailable runtime retry retires the initializer and uses a fresh generation", async () => {
  const { CodexRuntimeManager } = require("../../dist/main/workCardBuilding/codexRuntimeManager.js");
  const manager = new CodexRuntimeManager();
  let retired = 0, generations = 0;
  const failed = { initialize: async () => { throw Error("failed"); }, shutdown: async () => { retired++; } };
  const result = { runtime: { version: "0.159.3", executable: "managed/codex", directory: "managed" },
    status: { version: "0.159.3", updateState: "current", catalog, selection, selectionBlocker: null, message: "Ready", busy: false } };
  const ops = { writeSelection: async () => {}, launch: async () => ({}) };
  manager.configureInitializerFactory(() => { generations++; return { initialize: async () => result, shutdown: async () => {} }; });
  await manager.initialize(failed, ops);
  assert.equal(manager.getStatus().connections, undefined);
  const recovered = await manager.retry();
  assert.equal(retired, 1); assert.equal(generations, 1);
  assert.deepEqual(recovered.selection, selection);
  assert.deepEqual(recovered.catalog, catalog);
  assert.equal(recovered.updateState, "current");
  const lease = manager.acquire(selection);
  await assert.rejects(manager.retry(), /active run/);
  lease.release();
});

test("core failure reports a bounded stage without raw credential diagnostics", async () => {
  const { RuntimeHealthError } = require("../../dist/main/workCardBuilding/codexRuntimeInitialization.js");
  const f = runtimeFixture({ probe: async () => { throw new RuntimeHealthError("Model catalog check failed", "Connection-neutral model enumeration failed."); } });
  await f.ready;
  assert.equal(f.manager.getStatus().updateState, "unavailable");
  assert.match(f.manager.getStatus().message, /^Model catalog check failed:/);
});


test("Windows qualification probes bundled and normal managed current/latest without ambient MCP", {
  skip: !process.env.CHAMPCITY_IRR_RUNTIME_QUALIFICATION,
  timeout: 360000,
}, async () => {
  const { initializeManagedCodexRuntime } = require("../../dist/main/workCardBuilding/codexRuntimeInitialization.js");
  const actualRoot = process.env.CHAMPCITY_IRR_RUNTIME_QUALIFICATION;
  const currentOps = createCodexRuntimeOperations(actualRoot);
  const current = await currentOps.loadCurrent();
  assert.ok(current, "qualification requires an actual managed current pointer");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-runtime-qualification-"));
  const ops = createCodexRuntimeOperations(root);
  const previousHome = process.env.CODEX_HOME;
  const ambientHome = path.join(root, "ambient-home");
  const marker = path.join(root, "ambient-worker-started");
  await fs.mkdir(ambientHome);
  const auth = path.join(previousHome ?? path.join(os.homedir(), ".codex"), "auth.json");
  try { await fs.copyFile(auth, path.join(ambientHome, "auth.json")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const worker = path.join(root, "invalid-token-worker.cjs");
  await fs.writeFile(worker, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started'); setInterval(() => {}, 1000);`);
  await fs.writeFile(path.join(ambientHome, "config.toml"), ["cloudflare", "github"].map(name =>
    `[mcp_servers.${name}]\ncommand=${JSON.stringify(process.execPath)}\nargs=[${JSON.stringify(worker)}]\n`).join("\n"));
  process.env.CODEX_HOME = ambientHome;
  try {
    const bundled = await ops.bootstrap();
    const bundledCatalog = await ops.probe(bundled);
    assert.ok(bundledCatalog.length);
    const initialized = await initializeManagedCodexRuntime({ ...ops, loadCurrent: async () => current });
    assert.ok(initialized.runtime, initialized.status.message);
    assert.ok(initialized.status.catalog.some(entry => entry.model === "gpt-6.1-sol"));
    const connections = await ops.refreshConnections(initialized.runtime);
    assert.equal(connections.requiredReady, true);
    assert.equal(connections.blocker, null);
    const transport = await ops.launch(initialized.runtime);
    const project = path.join(root, "signal-forge");
    await fs.mkdir(path.join(project, ".codex"), { recursive: true });
    await fs.writeFile(path.join(project, ".codex", "config.toml"), `[mcp_servers.project_ambient]\ncommand=${JSON.stringify(process.execPath)}\nargs=[${JSON.stringify(worker)}]\n`);
    const thread = transport.startThread({ workingDirectory: project, model: "gpt-6.1-sol", sandboxMode: "workspace-write" });
    const threadId = await transport.startAppThread(thread);
    assert.ok(threadId);
    assert.deepEqual((await transport.listManagedConnections(threadId)).filter(entry => entry.initialized), []);
    await transport.dispose();
    await assert.rejects(fs.stat(marker), { code: "ENOENT" });
    const metadata = JSON.parse(await fs.readFile(path.join(root, "codex-runtime", "verified.json"), "utf8"));
    assert.equal(metadata.version, initialized.runtime.version);
    assert.ok(metadata.catalog.length);
    console.log(JSON.stringify({ qualification: "IRR-R01", bundledVersion: bundled.version, bundledCore: "passed", bundledCatalogCount: bundledCatalog.length,
      managedCurrentVersion: current.version, selectedVersion: initialized.runtime.version, selectedCore: "passed", catalogCount: initialized.status.catalog.length,
      isolation: "fresh temporary CODEX_HOME; authentication only; apps/plugins disabled; project layers disabled before thread/start", connectionPreflight: "passed", threadIsolation: "passed", updateState: initialized.status.updateState }));
  } finally {
    if (previousHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = previousHome;
    await ops.shutdown(); await currentOps.shutdown(); await fs.rm(root, { recursive: true, force: true });
  }
});


test("candidate connection policy failure preserves current pointer and verified catalog", async () => {
  let promotions = 0, remembered;
  const f = runtimeFixture({ latestVersion: async () => "0.160.0", readSelection: async () => selection,
    verifyCandidateConnections: async () => { throw Error("unsafe candidate isolation"); },
    promote: async () => { promotions++; },
    persistVerified: async (runtime, models) => { remembered = { runtime, models }; },
  });
  await f.ready;
  assert.equal(promotions, 0);
  assert.equal(f.manager.getStatus().version, f.prior.version);
  assert.equal(f.manager.getStatus().updateState, "degraded");
  assert.match(f.manager.getStatus().message, /^Connection policy check failed/);
  assert.deepEqual(remembered.models, catalog);
  assert.equal(remembered.runtime.version, f.prior.version);
});


test("production core probe neither inventories MCP nor inherits ambient configuration", async () => {
  const cp = require("node:child_process"), { EventEmitter } = require("node:events"), { PassThrough } = require("node:stream");
  const original = { execFile: cp.execFile, spawn: cp.spawn };
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "champcity-core-neutral-"));
  let home, inventoryCalls = 0, hang = false;
  cp.execFile = (_file, args, _options, done) => {
    if (args[0] === "mcp") { inventoryCalls++; done(Error("inventory unavailable")); return; }
    if (args[0] === "--version") { done(null, "codex-cli 0.159.3", ""); return; }
    const directory = args[args.indexOf("--out") + 1];
    const schema = { methods: ["initialize", "model/list", "thread/start", "turn/start", "turn/interrupt", "mcpServerStatus/list", "item/commandExecution/requestApproval", "item/fileChange/requestApproval", "item/permissions/requestApproval", "item/tool/requestUserInput", "mcpServer/elicitation/request"],
      ThreadStartParams: { properties: { model: {}, sandbox: {}, approvalPolicy: {}, approvalsReviewer: {} } },
      TurnStartParams: { properties: { model: {}, effort: {}, sandboxPolicy: {}, approvalsReviewer: {} } } };
    require("node:fs").writeFileSync(path.join(directory, "schema.json"), JSON.stringify(schema)); done(null, "", "");
  };
  cp.spawn = (_file, args, options) => {
    home = options.env.CODEX_HOME;
    assert.ok(home); assert.notEqual(home, process.env.CODEX_HOME);
    assert.equal(require("node:fs").existsSync(path.join(home, "config.toml")), false);
    assert.deepEqual(args, ["-c", "features.apps=false", "-c", "features.plugins=false", "app-server", "--listen", "stdio://"]);
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { child.killed = true; queueMicrotask(() => child.emit("exit", 0)); return true; };
    child.stdin.on("data", bytes => {
      const request = JSON.parse(bytes.toString()); if (!request.id || hang) return;
      const result = request.method === "initialize" ? { userAgent: "fixture" } : { data: catalog.map(entry => ({ ...entry, supportedReasoningEfforts: entry.supportedReasoningEfforts.map(reasoningEffort => ({ reasoningEffort })) })), nextCursor: null };
      child.stdout.write(JSON.stringify({ id: request.id, result }) + "\n");
    }); return child;
  };
  const ops = createCodexRuntimeOperations(root);
  try {
    assert.deepEqual(await ops.probe({ version: "0.159.3", executable: "fixture", directory: root }), catalog);
    assert.equal(inventoryCalls, 0);
    await assert.rejects(fs.stat(home), { code: "ENOENT" });
    hang = true; home = undefined;
    const pending = ops.probe({ version: "0.159.3", executable: "fixture", directory: root });
    void pending.catch(() => undefined);
    while (!home) await new Promise(resolve => setImmediate(resolve));
    await ops.shutdown();
    await assert.rejects(pending, /Runtime App Server initialization failed/);
    await assert.rejects(fs.stat(home), { code: "ENOENT" });
  } finally { await ops.shutdown(); Object.assign(cp, original); await fs.rm(root, { recursive: true, force: true }); }
});
