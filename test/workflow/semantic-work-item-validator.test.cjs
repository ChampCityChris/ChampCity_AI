"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { reviewWorkItemCriterion } = require("../../dist/main/workflow/semanticWorkItemValidator.js");

function context() {
  return {
    workingDirectory: "<PROJECT_REPO>", workflowId: "workflow-exact", workItemId: "work-exact", workItemTitle: "Export behavior",
    criterion: { body: { statement: "All rows are exported", verificationIntent: "Review focused evidence" } },
    implementation: { body: { summary: "Added the export", deviations: [], blockers: [], residualRisks: [] } },
    testerResult: { body: { recommendation: "reuse-existing-proof", rationale: "Existing proof applies", determinationEvidence: ["test receipt"], unknowns: [] } },
    deterministicEvidence: ["focused test receipt: passed"],
    sourceMode: "source-backed", sourceRevisionId: "candidate-123",
  };
}

function adapterWith(events, observe) {
  const thread = {
    async runStreamed(prompt) { observe.prompt = prompt; return { events: (async function* () { for (const event of events) yield event; })() }; },
    async respondToApproval(id, decision) { observe.denied = { id, decision }; },
    async dispose() { observe.threadDisposed = true; },
  };
  return { startThread(options) { observe.options = options; return thread; }, async dispose() { observe.adapterDisposed = true; } };
}

test("semantic Validator is read-only, network-disabled, and persists only a bounded semantic result", async () => {
  const observe = {};
  const result = await reviewWorkItemCriterion(context(), { model: "model-a", reasoningEffort: "medium" }, async () => adapterWith([
    { type: "item.completed", item: { type: "agent_message", text: '{"outcome":"pass","summary":"The supplied evidence satisfies the Criterion."}' } },
  ], observe));
  assert.equal(result.outcome, "pass");
  assert.match(result.principalId, /^validator-/);
  assert.equal(observe.options.readOnly, true);
  assert.equal(observe.options.networkAccessEnabled, false);
  assert.deepEqual(observe.options.writableRoots, []);
  assert.match(observe.prompt, /candidate-123/);
  assert.match(observe.prompt, /focused test receipt: passed/);
  assert.equal(observe.threadDisposed, true);
  assert.equal(observe.adapterDisposed, true);
});

test("semantic Validator denies capability requests and rejects malformed or mutating results", async () => {
  const denied = {};
  await assert.rejects(reviewWorkItemCriterion(context(), { model: "model-a", reasoningEffort: "medium" }, async () => adapterWith([
    { type: "approval.requested", approval: { requestId: "approval-1" } },
  ], denied)), /outside its read-only review boundary/);
  assert.deepEqual(denied.denied, { id: "approval-1", decision: { decision: "deny" } });
  const mutation = {};
  await assert.rejects(reviewWorkItemCriterion(context(), { model: "model-a", reasoningEffort: "medium" }, async () => adapterWith([
    { type: "item.completed", item: { type: "file_change", changes: [] } },
  ], mutation)), /interactive or mutating action/);
  await assert.rejects(reviewWorkItemCriterion(context(), { model: "model-a", reasoningEffort: "medium" }, async () => adapterWith([
    { type: "item.completed", item: { type: "agent_message", text: "not JSON" } },
  ], {})), /invalid structured evidence/);
});
