const assert = require("node:assert/strict");
const test = require("node:test");
const service = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const { getPhaseCloseProjection } = require("../../dist/main/phaseClose/phaseCloseService.js");
const { mainPreloadHarness } = require("../support/production-execution.cjs");
const { seedAllCompletePhaseAfterCloseReturn } = require("../support/phase-validation-fixtures.cjs");

function phaseValidationApi(root) {
  const calls = [];
  const scope = { getRequiredWorkspaceRoot: () => root };
  for (const name of ["getPhaseValidationActionProjection", "createPhaseCloseoutForCurrentPhase", "applyCurrentDisposition"]) {
    scope[name] = (...args) => { calls.push({ name, args }); return service[name](...args); };
  }
  return { ...mainPreloadHarness([
    "currentWorkflow:getPhaseValidationActionProjection", "currentWorkflow:createPhaseCloseout",
    "currentWorkflow:applyDisposition",
  ], scope), calls };
}

test("Phase Validation repository projection crosses main and compiled preload public API", async () => {
  const root = seedAllCompletePhaseAfterCloseReturn();
  const { api, calls, invocations } = phaseValidationApi(root);
  const action = await api.getPhaseValidationActionProjection();
  assert.deepEqual(action, service.getPhaseValidationActionProjection(root));
  assert.equal(action.workspaceId, "phase-validation");
  assert.equal(action.requiredAction, "create-closeout");
  assert.deepEqual(calls, [{ name: "getPhaseValidationActionProjection", args: [root] }]);
  assert.deepEqual(invocations.map((call) => call.channel), ["currentWorkflow:getPhaseValidationActionProjection"]);
});

test("projection disposition target reaches the service despite the model's different active workspace", async () => {
  const root = seedAllCompletePhaseAfterCloseReturn();
  const { api, calls } = phaseValidationApi(root);
  const created = await api.createPhaseCloseoutForCurrentPhase("Close", "All planned work complete");
  const action = created.payload.phaseAction;
  assert.equal(action.workspaceId, "phase-validation");
  assert.notEqual(service.getCurrentWorkspaceModel(root).activeWorkspaceId, action.workspaceId);
  const result = await api.applyCurrentDisposition("Approved", "Reviewed current closeout", action.workspaceId);
  assert.deepEqual(calls.at(-1), { name: "applyCurrentDisposition", args: [root, "Approved", "Reviewed current closeout", action.workspaceId] });
  assert.equal(result.payload.phaseAction.workspaceId, "phase-close");
  assert.equal(result.payload.phaseAction.closeout.effectiveDisposition, "Approved");
  await assert.rejects(api.applyCurrentDisposition("Approved", "", "phase-close"), /cannot bypass the Phase Validation disposition/);
});

test("create and disposition public API results contain refreshed repository Phase Validation evidence", async () => {
  const root = seedAllCompletePhaseAfterCloseReturn();
  const { api } = phaseValidationApi(root);
  const created = await api.createPhaseCloseoutForCurrentPhase("Close", "All planned work complete");
  assert.deepEqual(created.payload.phaseAction, await api.getPhaseValidationActionProjection());
  assert.equal(created.payload.phaseAction.requiredAction, "dispose-closeout");
  assert.equal(created.payload.phaseAction.closeout.effectiveDisposition, "Pending");
  for (const status of ["RevisionRequested", "Rejected", "Approved"]) {
    const result = await api.applyCurrentDisposition(status, "Current review", created.payload.phaseAction.workspaceId);
    const refreshed = result.payload.phaseAction;
    const close = getPhaseCloseProjection(root, "phase-01");
    assert.deepEqual(refreshed.closeout, close.closeout);
    assert.equal(refreshed.workspaceId, close.workspaceId);
    assert.equal(close.complete, status === "Approved");
    if (status !== "Approved") {
      assert.deepEqual(refreshed, await api.getPhaseValidationActionProjection());
    }
    assert.equal(refreshed.closeout.effectiveDisposition, status);
    assert.equal(refreshed.requiredAction, status === "Approved" ? "phase-close-complete" : "dispose-closeout");
    assert.equal(refreshed.workspaceId, status === "Approved" ? "phase-close" : "phase-validation");
    assert.equal(refreshed.closeout.logicalDocumentId, created.payload.phaseAction.closeout.logicalDocumentId);
    assert.equal(refreshed.closeout.freshnessState, "fresh");
  }
});
