const assert = require("node:assert/strict");
const test = require("node:test");
const {architectReviewRevisionKey, canReviewArchitectRevision} = require("../../dist/shared/structuredArchitectReviewState.js");
const model = {workflowId: "exact-workflow", ready: true, review: {cycleId: "cycle", recordVersion: 1}};
test("Architect review acknowledgment binds exact Workflow cycle revision", () => {
  const key = architectReviewRevisionKey(model); assert.equal(canReviewArchitectRevision(model, key), true);
  assert.equal(canReviewArchitectRevision({...model, workflowId: "foreign"}, key), false);
  assert.equal(canReviewArchitectRevision({...model, review: {...model.review, recordVersion: 2}}, key), false);
  assert.equal(canReviewArchitectRevision({...model, review: {...model.review, cycleId: "new-cycle"}}, key), false);
});
test("missing or stale Architect prerequisites cannot retain review eligibility", () => {
  const key = architectReviewRevisionKey(model);
  assert.equal(canReviewArchitectRevision({...model, ready: false}, key), false);
  assert.equal(canReviewArchitectRevision({...model, review: undefined}, key), false);
  assert.equal(canReviewArchitectRevision(model, null), false);
});
