const assert = require("node:assert/strict");
const test = require("node:test");
const { runPlanningDraftAction } = require("../renderer/renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/planningDraftAction.ts");

const { registerFeaturePlanningIpc } = require("../../dist/main/featurePlanning/featurePlanningIpc.js");
const { registerIssuePlanningIpc } = require("../../dist/main/issuePlanning/issuePlanningIpc.js");

function capture(register, service, copied = []) {
  const handlers = new Map();
  register({ handle: (channel, listener) => handlers.set(channel, listener) }, () => "<PROJECT_REPO>", text => copied.push(text), service);
  return handlers;
}
function rejectsSync(action, pattern) { assert.throws(action, pattern); }

test("Feature planning IPC accepts preload argument shapes and rejects missing or surplus arguments", async () => {
  const calls = [];
  const service = {
    get: async (...args) => { calls.push(["get", ...args]); return { draft: { instruction: "feature handoff" } }; },
    saveIntake: async (...args) => calls.push(["saveIntake", ...args]),
    prepare: async (...args) => calls.push(["prepare", ...args]),
    act: async (...args) => calls.push(["act", ...args]),
  };
  const handlers = capture(registerFeaturePlanningIpc, service);
  const id = "feature-exact-workflow-123";
  const intake = { requestedCapability: "x" };
  const action = { type: "decide", stage: "assessment", outcome: "accept", rationale: "accepted" };
  await handlers.get("featurePlanning:get")({}, id);
  await handlers.get("featurePlanning:copy")({}, id);
  await handlers.get("featurePlanning:saveIntake")({}, id, intake);
  await handlers.get("featurePlanning:prepare")({}, id, "assessment");
  await handlers.get("featurePlanning:act")({}, id, action);
  assert.deepEqual(calls.map(call => call[0]), ["get", "get", "saveIntake", "prepare", "act"]);
  assert.deepEqual(calls[0], ["get", "<PROJECT_REPO>", id]);
  assert.deepEqual(calls[2], ["saveIntake", "<PROJECT_REPO>", id, intake]);
  assert.deepEqual(calls[3], ["prepare", "<PROJECT_REPO>", id, "assessment"]);
  assert.deepEqual(calls[4], ["act", "<PROJECT_REPO>", id, action]);
  for (const channel of ["featurePlanning:get", "featurePlanning:copy"]) {
    rejectsSync(() => handlers.get(channel)({}), /exactly 1 argument/);
    rejectsSync(() => handlers.get(channel)({}, id, "surplus"), /exactly 1 argument/);
  }
  for (const channel of ["featurePlanning:saveIntake", "featurePlanning:prepare", "featurePlanning:act"]) {
    rejectsSync(() => handlers.get(channel)({}, id), /exactly 2 arguments/);
    rejectsSync(() => handlers.get(channel)({}, id, channel === "featurePlanning:prepare" ? "plan" : {}, "surplus"), /exactly 2 arguments/);
  }
  rejectsSync(() => handlers.get("featurePlanning:act")({}, id, { type: "unknown" }), /action type is invalid/);
  rejectsSync(() => handlers.get("featurePlanning:act")({}, id, { type: "decide", outcome: "maybe" }), /outcome is invalid/);
});

test("Issue planning IPC accepts preload argument shapes and rejects missing or surplus arguments", async () => {
  const calls = [];
  const service = {
    get: async (...args) => { calls.push(["get", ...args]); return { draft: { instruction: "issue handoff" } }; },
    saveIntake: async (...args) => calls.push(["saveIntake", ...args]),
    addEvidence: async (...args) => calls.push(["addEvidence", ...args]),
    prepare: async (...args) => calls.push(["prepare", ...args]),
    act: async (...args) => calls.push(["act", ...args]),
  };
  const handlers = capture(registerIssuePlanningIpc, service);
  const id = "issue-exact-workflow-123";
  const intake = { title: "failure" };
  const files = [{ name: "log.txt", base64: "AA==" }];
  const action = { type: "decide-rca", outcome: "accept", rationale: "accepted" };
  await handlers.get("issuePlanning:get")({}, id);
  await handlers.get("issuePlanning:copy")({}, id);
  await handlers.get("issuePlanning:saveIntake")({}, id, intake);
  await handlers.get("issuePlanning:addEvidence")({}, id, files);
  await handlers.get("issuePlanning:prepare")({}, id, "rca");
  await handlers.get("issuePlanning:act")({}, id, action);
  assert.deepEqual(calls.map(call => call[0]), ["get", "get", "saveIntake", "addEvidence", "prepare", "act"]);
  assert.deepEqual(calls[0], ["get", "<PROJECT_REPO>", id]);
  assert.deepEqual(calls[2], ["saveIntake", "<PROJECT_REPO>", id, intake]);
  assert.deepEqual(calls[3], ["addEvidence", "<PROJECT_REPO>", id, files]);
  assert.deepEqual(calls[4], ["prepare", "<PROJECT_REPO>", id, "rca"]);
  assert.deepEqual(calls[5], ["act", "<PROJECT_REPO>", id, action]);
  for (const channel of ["issuePlanning:get", "issuePlanning:copy"]) {
    rejectsSync(() => handlers.get(channel)({}), /exactly 1 argument/);
    rejectsSync(() => handlers.get(channel)({}, id, "surplus"), /exactly 1 argument/);
  }
  for (const channel of ["issuePlanning:saveIntake", "issuePlanning:addEvidence", "issuePlanning:prepare", "issuePlanning:act"]) {
    rejectsSync(() => handlers.get(channel)({}, id), /exactly 2 arguments/);
    rejectsSync(() => handlers.get(channel)({}, id, channel === "issuePlanning:prepare" ? "plan" : [], "surplus"), /exactly 2 arguments/);
  }
  rejectsSync(() => handlers.get("issuePlanning:act")({}, id, { type: "unknown" }), /action type is invalid/);
  rejectsSync(() => handlers.get("issuePlanning:act")({}, id, { type: "decide-plan", outcome: "maybe" }), /outcome is invalid/);
});

test("planning renderer reports invalid JSON and never invokes disposition", async () => {
  let visibleError = "";
  let dispositions = 0;
  await runPlanningDraftAction(() => JSON.parse("{"), async () => { dispositions++; }, message => { visibleError = message; });
  assert.match(visibleError, /JSON/);
  assert.equal(dispositions, 0);
});
