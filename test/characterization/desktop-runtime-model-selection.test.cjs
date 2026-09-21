const assert = require("node:assert/strict");
const test = require("node:test");

const {
  catalog,
  runtimeFixture,
  selection,
} = require("../support/codex-runtime.cjs");

/*
 * Characterization boundary:
 * Model and reasoning effort are explicit Operator/runtime selections. Desktop
 * must not silently substitute a catalog default, and the execution lease must
 * freeze the selected pair for the active run. Runtime update failure retains
 * the last known good executable instead of changing execution selection.
 */

test("Desktop execution freezes explicit model/reasoning selection for the active runtime lease", async () => {
  const fixture = runtimeFixture({ readSelection: async () => selection });
  await fixture.ready;

  assert.deepEqual(fixture.manager.getStatus().selection, selection);
  const requested = { ...selection };
  const lease = fixture.manager.acquire(requested);
  requested.model = "caller-mutated-after-acquire";
  requested.reasoningEffort = "caller-mutated-after-acquire";
  assert.deepEqual(lease.selection, selection, "active execution owns an independent selection snapshot");

  assert.throws(() => fixture.manager.acquire(selection), /already active/);
  await assert.rejects(
    fixture.manager.setSelection({ ...selection, reasoningEffort: "low" }),
    /active/,
  );

  lease.release();
  await fixture.manager.setSelection({ ...selection, reasoningEffort: "low", sandbox: "danger-full-access" });
  assert.deepEqual(
    fixture.manager.getStatus().selection,
    { ...selection, reasoningEffort: "low" },
    "selection persistence remains model/reasoning selection rather than sandbox policy",
  );
  assert.deepEqual(fixture.calls.filter((call) => Array.isArray(call) && call[0] === "save"), [
    ["save", { ...selection, reasoningEffort: "low" }],
  ]);
});

for (const [label, unavailable] of [
  ["model", { model: "removed-model-id", reasoningEffort: "high" }],
  ["reasoning effort", { ...selection, reasoningEffort: "removed-effort" }],
]) {
test(`Desktop does not silently replace unavailable saved ${label} selection with the catalog default`, async () => {
  const fixture = runtimeFixture({
    readSelection: async () => unavailable,
    probe: async () => [{ ...catalog[0], isDefault: true }],
  });
  await fixture.ready;

  const status = fixture.manager.getStatus();
  assert.deepEqual(status.selection, unavailable);
  assert.ok(status.selectionBlocker);
  assert.throws(() => fixture.manager.acquire(unavailable), /Choose|unavailable/);
  assert.notDeepEqual(status.selection, selection, "catalog default must not become implicit execution selection");
  await assert.rejects(fixture.manager.setSelection(unavailable), /unavailable/);
  assert.equal(fixture.calls.some((call) => Array.isArray(call) && call[0] === "save"), false);
});
}

for (const failure of ["lookup", "download", "probe", "promotion"]) {
test(`Desktop runtime ${failure} failure retains the last known good runtime and explicit model selection`, async () => {
  const fixture = runtimeFixture({
    readSelection: async () => selection,
    latestVersion: async () => {
      if (failure === "lookup") throw new Error("offline");
      return "0.153.4";
    },
    ...(failure === "download" ? { stage: async () => { throw new Error("download failed"); } } : {}),
    ...(failure === "probe" ? { probe: async (runtime) => {
      if (runtime.version === "0.153.4") throw new Error("incompatible candidate");
      return catalog;
    } } : {}),
    ...(failure === "promotion" ? { promote: async () => { throw new Error("promotion failed"); } } : {}),
  });
  await fixture.ready;

  const status = fixture.manager.getStatus();
  assert.equal(status.version, fixture.prior.version);
  assert.equal(status.updateState, "degraded");
  assert.deepEqual(status.selection, selection);
  assert.equal(fixture.calls.some(call => Array.isArray(call) && call[0] === "promote"), false);

  const lease = fixture.manager.acquire(selection);
  await fixture.manager.launch();
  const launch = fixture.calls.at(-1);
  assert.equal(launch[0], "launch");
  assert.equal(launch[1].executable, fixture.prior.executable);
  lease.release();
});
}
