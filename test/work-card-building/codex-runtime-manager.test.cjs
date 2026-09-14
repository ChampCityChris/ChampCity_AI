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

for (const failure of ["lookup", "download", "probe", "promotion"]) {
  test(`${failure} failure retains last known good with degraded status`, async () => {
    const f = runtimeFixture({
      latestVersion: async () => { if (failure === "lookup") throw Error("offline"); return "0.153.4"; },
      ...(failure === "download" ? { stage: async () => { throw Error("download failed"); } } : {}),
      ...(failure === "probe" ? { probe: async (runtime) => { if (runtime.version !== "0.146.0") throw Error("incompatible"); return catalog; } } : {}),
      ...(failure === "promotion" ? { promote: async () => { throw Error("rename failed"); } } : {}),
    });
    await f.ready;
    assert.equal(f.manager.getStatus().version, "0.146.0");
    assert.equal(f.manager.getStatus().updateState, "degraded");
    await f.manager.launch();
    assert.equal(f.calls.at(-1)[1].executable, f.prior.executable);
    assert.equal(f.calls.some((call) => Array.isArray(call) && call[0] === "promote"), false);
  });
}

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
    message: "Managed Codex runtime initialization failed in its utility worker. Restart to retry.",
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
  const calls=[];
  const directory="11111111-1111-1111-1111-111111111111";
  let adapter;
  try {
    await fs.mkdir(path.join(root,"codex-runtime"));
    await fs.writeFile(path.join(root,"codex-runtime","current.json"),JSON.stringify({directory,version:"0.153.4"}));
    childProcess.spawn=(command,args,options)=>{
      calls.push({command,args,options});
      const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();
      child.kill=()=>{child.killed=true;queueMicrotask(()=>child.emit("exit",0));return true;};
      child.stdin.on("data",data=>{const request=JSON.parse(data.toString());if(request.method==="initialize")child.stdout.write(JSON.stringify({id:request.id,result:{userAgent:"fixture",codexHome:"<CODEX_HOME>"}})+"\n");});
      return child;
    };
    const ops=createCodexRuntimeOperations(root);
    const runtime=await ops.loadCurrent();
    adapter=await ops.launch(runtime);
    assert.equal(calls.length,1);
    assert.equal(calls[0].command,runtime.executable);
    assert.equal(path.relative(path.join(root,"codex-runtime","versions",directory),runtime.executable).startsWith(".."),false);
    assert.doesNotMatch(calls[0].command,/node_modules/);
    assert.deepEqual(calls[0].args,["app-server","--listen","stdio://"]);
    assert.equal(calls[0].options.windowsHide,true);
  } finally {await adapter?.dispose();childProcess.spawn=originalSpawn;await fs.rm(root,{recursive:true,force:true});}
});
