const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRendererSourceModule } = require("./renderer-source-loader.cjs");
const {
  codexExecutionPresentationReducer,
  initialCodexExecutionPresentationState,
  issueCodexExecutionContextKey,
} = loadRendererSourceModule("src/renderer/app/codexExecutionPresentationOwnership.ts");

test("inactive Development cleanup cannot clear a populated Issue Codex status", () => {
  const contextKey = issueCodexExecutionContextKey("ISSUE_002", "ISSUE_002-FC01");
  let state = codexExecutionPresentationReducer(initialCodexExecutionPresentationState, {
    type: "activate-issue-context",
    contextKey,
  });
  state = codexExecutionPresentationReducer(state, {
    type: "set-issue",
    contextKey,
    status: executionStatus("ready", "ISSUE_002-FC01"),
  });

  state = codexExecutionPresentationReducer(state, { type: "clear-development" });

  assert.equal(state.issue.contextKey, contextKey);
  assert.equal(state.issue.status.state, "ready");
  assert.equal(state.issue.status.canRunAgain, true);
  assert.equal(state.development, null);
});

test("inactive Issue cleanup cannot clear a populated Development Codex status", () => {
  let state = codexExecutionPresentationReducer(initialCodexExecutionPresentationState, {
    type: "set-development",
    status: executionStatus("ready", "WC01"),
  });

  state = codexExecutionPresentationReducer(state, { type: "clear-issue" });

  assert.equal(state.development.state, "ready");
  assert.equal(state.development.workCardId, "WC01");
  assert.equal(state.issue, null);
});

test("switching Issue execution context clears only Issue presentation and rejects a stale status response", () => {
  const firstContext = issueCodexExecutionContextKey("ISSUE_002", "ISSUE_002-FC01");
  const secondContext = issueCodexExecutionContextKey("ISSUE_002", "ISSUE_002-FC02");
  let state = codexExecutionPresentationReducer(initialCodexExecutionPresentationState, {
    type: "set-development",
    status: executionStatus("ready", "WC01"),
  });
  state = codexExecutionPresentationReducer(state, { type: "activate-issue-context", contextKey: firstContext });
  state = codexExecutionPresentationReducer(state, {
    type: "set-issue",
    contextKey: firstContext,
    status: executionStatus("running", "ISSUE_002-FC01"),
  });

  state = codexExecutionPresentationReducer(state, { type: "activate-issue-context", contextKey: secondContext });
  assert.equal(state.issue.contextKey, secondContext);
  assert.equal(state.issue.status, null);
  assert.equal(state.development.workCardId, "WC01");

  state = codexExecutionPresentationReducer(state, {
    type: "set-issue",
    contextKey: firstContext,
    status: executionStatus("completed", "ISSUE_002-FC01"),
  });
  assert.equal(state.issue.contextKey, secondContext);
  assert.equal(state.issue.status, null);

  state = codexExecutionPresentationReducer(state, {
    type: "set-issue",
    contextKey: secondContext,
    status: executionStatus("ready", "ISSUE_002-FC02"),
  });
  assert.equal(state.issue.status.workCardId, "ISSUE_002-FC02");
  assert.equal(state.issue.status.state, "ready");
});

function executionStatus(state, workCardId) {
  return {
    state,
    workCardId,
    canRunAgain: state === "ready" || state === "completed",
  };
}
