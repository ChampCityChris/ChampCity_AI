const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { IntegrationRepairImplementerService } = require("../../dist/main/planExecution/integrationRepairImplementerService.js");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const candidateId = "a".repeat(64);
const selector = { ownerKind: "integration-repair", intakeId: "IN01", candidateId, repairId: "REPAIR01" };
const selection = { model: "gpt-6-sol", reasoningEffort: "high" };

function fixture(t, paths = { "src/change.ts": "before", "src/remove.ts": "remove me" }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-repair-test-"));
  t.after(() => { assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, { recursive: true, force: true }); });
  const checkout = path.join(root, ".git", "champcity-integration", candidateId, "checkout");
  fs.mkdirSync(checkout, { recursive: true });
  for (const [relative, body] of Object.entries(paths)) {
    const target = path.join(checkout, relative); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body);
  }
  const editable = Object.fromEntries(Object.entries(paths).map(([relative, body]) => [relative, digest(body)]));
  const attempt = { repairId: "REPAIR01", candidateId, attempt: 1, status: "prepared", prompt: "# Bounded Integration Repair",
    policy: { sources: [], editablePaths: Object.keys(paths) }, snapshot: { head: "b".repeat(40), mergeHead: null,
      indexDigest: "c".repeat(64), changed: {}, editable, unmerged: [] }, sourceDigests: {}, validation: [], message: "Prepared" };
  const calls = [];
  const integration = {
    readRepair(id, repairId) { assert.equal(id, candidateId); assert.equal(repairId, "REPAIR01"); return attempt; },
    async query() { return { completionFingerprint: "d".repeat(64) }; },
    async applyRepair(input) { calls.push({ kind: "apply", input, candidateBefore: fs.readFileSync(path.join(checkout, "src/change.ts"), "utf8") });
      for (const patch of input.patches) { const target = path.join(checkout, patch.path);
        if (patch.content === null) fs.unlinkSync(target); else fs.writeFileSync(target, patch.content); } },
    async completeRepair(input) { calls.push({ kind: "complete", input }); },
    async requestOperatorDecision(input) { calls.push({ kind: "decision", input }); },
  };
  return { root, checkout, attempt, integration, calls };
}

function runtime(onRun) {
  const threads = [];
  return { threads, factory: async () => ({ startThread(options) {
    assert.equal(options.sandboxMode, "workspace-write");
    assert.equal(options.networkAccessEnabled, false);
    assert.deepEqual(options.writableRoots, [options.workingDirectory]);
    assert.equal(fs.existsSync(path.join(options.workingDirectory, ".git")), false);
    threads.push(options);
    return { id: "fake", async runStreamed(prompt) {
      assert.match(prompt, /Do not return JSON patches/);
      const message = await onRun(options.workingDirectory);
      return { events: (async function* () { yield { type: "item.completed", item: { type: "agent_message", text: message } }; })() };
    } };
  } }) };
}

function owner(fixture, runtimeFactory) {
  return new IntegrationRepairImplementerService(runtimeFactory, () => fixture.integration,
    (selected) => ({ selection: selected, release() {} }));
}

test("Integration Repair runs against only isolated editable source and applies exact changed and deleted patches", async (t) => {
  const data = fixture(t);
  const fake = runtime(async (cwd) => {
    assert.notEqual(cwd, data.root);
    assert.notEqual(cwd, data.checkout);
    assert.equal(fs.readFileSync(path.join(cwd, "src/change.ts"), "utf8"), "before");
    assert.equal(fs.readFileSync(path.join(cwd, "src/remove.ts"), "utf8"), "remove me");
    fs.writeFileSync(path.join(cwd, "src/change.ts"), "after");
    fs.unlinkSync(path.join(cwd, "src/remove.ts"));
    assert.equal(fs.readFileSync(path.join(data.checkout, "src/change.ts"), "utf8"), "before");
    return "Source resolution complete.";
  });
  const service = owner(data, fake.factory);
  assert.equal(service.status(data.root, selector).state, "ready");
  await service.start(data.root, selector, selection);
  await service.awaitCompletion(data.root);
  const completed = service.status(data.root, selector);
  assert.equal(completed.state, "completed");
  assert.equal(completed.implementerReportPath, null, "Integration Repair has no Implementer Report contract");
  assert.deepEqual(data.calls.map((entry) => entry.kind), ["apply", "complete"]);
  assert.equal(data.calls[0].candidateBefore, "before", "candidate remains unchanged until application patch owner runs");
  assert.deepEqual(data.calls[0].input.patches, [
    { path: "src/change.ts", beforeSha256: digest("before"), content: "after" },
    { path: "src/remove.ts", beforeSha256: digest("remove me"), content: null },
  ]);
  assert.equal(data.calls[0].input.expectedFingerprint, "d".repeat(64));
  assert.equal(fs.existsSync(fake.threads[0].workingDirectory), false, "isolated source is removed after completion");
});

test("unexpected Integration Repair file creation fails closed before candidate patching", async (t) => {
  const data = fixture(t, { "src/change.ts": "before" });
  const fake = runtime(async (cwd) => { fs.writeFileSync(path.join(cwd, "unexpected.txt"), "unapproved");
    fs.writeFileSync(path.join(cwd, "src/change.ts"), "after"); return "Done"; });
  const service = owner(data, fake.factory);
  await service.start(data.root, selector, selection);
  await service.awaitCompletion(data.root);
  assert.equal(service.status(data.root, selector).state, "failed");
  assert.match(service.status(data.root, selector).failureReason, /undeclared path/);
  assert.deepEqual(data.calls, []);
  assert.equal(fs.readFileSync(path.join(data.checkout, "src/change.ts"), "utf8"), "before");
  assert.equal(fs.existsSync(fake.threads[0].workingDirectory), false);
});

test("incompatible accepted intent records an Operator decision without applying source", async (t) => {
  const data = fixture(t, { "src/change.ts": "before" });
  const fake = runtime(async () => "OPERATOR_DECISION_REQUIRED: Accepted target and incoming behavior conflict.");
  const service = owner(data, fake.factory);
  await service.start(data.root, selector, selection);
  await service.awaitCompletion(data.root);
  assert.equal(service.status(data.root, selector).state, "completed");
  assert.deepEqual(data.calls.map((entry) => entry.kind), ["decision"]);
  assert.equal(data.calls[0].input.reason, "Accepted target and incoming behavior conflict.");
  assert.equal(fs.readFileSync(path.join(data.checkout, "src/change.ts"), "utf8"), "before");
});

test("cancel interrupts isolated Integration Repair without applying source", async (t) => {
  const data = fixture(t, { "src/change.ts": "before" });
  let started;
  const running = new Promise((resolve) => { started = resolve; });
  let isolatedRoot;
  let interrupted = false;
  const service = owner(data, async () => ({ startThread(options) {
    isolatedRoot = options.workingDirectory;
    return { async runStreamed(_prompt, { signal }) {
      started();
      return { events: (async function* () {
        await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
        yield { type: "item.completed", item: { type: "agent_message", text: "Cancelled." } };
      })() };
    }, async interrupt() { interrupted = true; } };
  } }));
  await service.start(data.root, selector, selection);
  await running;
  await service.cancel(data.root, selector);
  await service.awaitCompletion(data.root);
  assert.equal(interrupted, true);
  assert.equal(service.status(data.root, selector).state, "cancelled");
  assert.deepEqual(data.calls, []);
  assert.equal(fs.readFileSync(path.join(data.checkout, "src/change.ts"), "utf8"), "before");
  assert.equal(fs.existsSync(isolatedRoot), false);
});
