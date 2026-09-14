const { CodexRuntimeManager } = require("../../dist/main/workCardBuilding/codexRuntimeManager.js");
const { initializeManagedCodexRuntime } = require("../../dist/main/workCardBuilding/codexRuntimeInitialization.js");
const selection = { model: "gpt-5.6-sol", reasoningEffort: "high" };
const catalog = [{ id: "picker-sol", model: selection.model, displayName: "GPT-5.6 Sol", description: "Sol", supportedReasoningEfforts: ["low", "high"], defaultReasoningEffort: "low", isDefault: false }];
function runtimeFixture(overrides = {}) {
  const calls = [];
  const prior = { version: "0.146.0", directory: "managed/prior", executable: "managed/prior/codex" };
  const ops = {
    loadCurrent: async () => prior,
    bootstrap: async () => prior,
    latestVersion: async () => "0.146.0",
    stage: async (version) => { calls.push("stage"); return { ...prior, version, directory: "managed/candidate", executable: "managed/candidate/codex" }; },
    probe: async () => { calls.push("probe"); return catalog; },
    promote: async (runtime) => { calls.push(["promote", runtime.version]); },
    readSelection: async () => null,
    writeSelection: async (value) => { calls.push(["save", value]); },
    launch: async (runtime) => { calls.push(["launch", runtime]); return {}; },
    ...overrides,
  };
  const manager = new CodexRuntimeManager();
  const initializer = {
    initialize: () => initializeManagedCodexRuntime(ops),
    shutdown: async () => ops.shutdown?.(),
  };
  const ready = manager.initialize(initializer, ops);
  return { manager, ready, initializer, ops, calls, prior };
}
module.exports = { runtimeFixture, selection, catalog };
