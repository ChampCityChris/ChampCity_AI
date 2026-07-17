const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalWorkflowSpine,
  createWorkflowStateIndex,
  executableTransitionRules,
  materializeActionCatalog,
  requireExecutableTransitionRule,
  WorkflowTransitionError,
} = require("../../dist/shared/workflow");

const projectId = "project-alpha";
const phaseId = "phase-04";
const fixedTime = "2026-07-16T18:30:00.000Z";

function bindings() {
  return Object.fromEntries(
    executableTransitionRules.map((rule) => [
      rule.actionId,
      {
        targetArtifactId: `${projectId}/${phaseId}/target/${rule.actionId}`,
        sourceArtifactIds: [`${projectId}/${phaseId}/source/${rule.actionId}`],
        expectedOutputArtifactId: `${projectId}/${phaseId}/${rule.expectedOutputArtifactType}/${rule.actionId}`,
      },
    ]),
  );
}

function stateFor(actionId) {
  return createWorkflowStateIndex({
    workflowStateArtifactId: `${projectId}/system/relationship_resolver`,
    projectId,
    activePhaseId: phaseId,
    createdAt: fixedTime,
    initialActionId: actionId,
    actions: materializeActionCatalog(executableTransitionRules, bindings()),
  });
}

function commandFor(state, route, overrides = {}) {
  const action = state.currentAction;
  return {
    actionId: action.actionId,
    stateRevision: state.stateRevision,
    actorRole: action.role,
    route,
    evidence: {
      artifactId: action.expectedOutput.artifactId,
      artifactType: action.expectedOutput.artifactType,
      pairVerified: true,
      registryCommitted: true,
      ...overrides.evidence,
    },
    ...(action.screenId === "architect-review" && route === "success"
      ? {
          authorization: {
            decision: "authorized",
            artifactId:
              overrides.evidence?.artifactId ?? action.expectedOutput.artifactId,
          },
        }
      : {}),
    occurredAt: fixedTime,
    ...overrides.command,
  };
}

test("executable transition model covers every locked process-map step", () => {
  const covered = [
    ...new Set(
      executableTransitionRules
        .filter((rule) => rule.processClassification === "top_level" && rule.advancesWorkflowState)
        .map((rule) => rule.processId),
    ),
  ];
  assert.deepEqual(covered, canonicalWorkflowSpine);
  for (const rule of executableTransitionRules) {
    assert.deepEqual(requireExecutableTransitionRule(rule.actionId), rule);
  }
});

test("valid expected output advances by executable success route", () => {
  const {
    advanceWorkflowState,
  } = require("../../dist/shared/workflow");
  for (const rule of executableTransitionRules.filter((item) => item.routes.success)) {
    const state = stateFor(rule.actionId);
    const next = advanceWorkflowState(state, commandFor(state, "success"));
    const expected =
      rule.actionId === "operator_validation_required"
        ? "phase_closeout_required"
        : rule.routes.success;
    assert.equal(next.currentActionId, expected, `${rule.actionId} success route`);
  }
});

test("failed and repair outputs route only through declared executable routes", () => {
  const {
    advanceWorkflowState,
  } = require("../../dist/shared/workflow");
  for (const route of ["failure", "repair"]) {
    for (const rule of executableTransitionRules.filter((item) => item.routes[route])) {
      const state = stateFor(rule.actionId);
      const next = advanceWorkflowState(state, commandFor(state, route));
      assert.equal(next.currentActionId, rule.routes[route], `${rule.actionId} ${route} route`);
    }
  }
});

test("missing command leaves current action unchanged until expected output evidence exists", () => {
  const state = stateFor("architect_review_of_implementer_report_required");
  assert.equal(state.currentActionId, "architect_review_of_implementer_report_required");
  assert.equal(
    state.currentAction.expectedOutput.artifactId,
    `${projectId}/${phaseId}/architect_review/architect_review_of_implementer_report_required`,
  );
});

test("invalid pair, output mismatch, and stale revision block advancement", () => {
  const {
    advanceWorkflowState,
  } = require("../../dist/shared/workflow");
  const state = stateFor("implementer_execution_required");
  assert.throws(
    () =>
      advanceWorkflowState(
        state,
        commandFor(state, "success", {
          evidence: { pairVerified: false },
        }),
      ),
    (error) =>
      error instanceof WorkflowTransitionError &&
      error.code === "unverified_evidence",
  );
  assert.throws(
    () =>
      advanceWorkflowState(
        state,
        commandFor(state, "success", {
          evidence: { artifactId: `${projectId}/${phaseId}/implementer_report/other` },
        }),
      ),
    (error) => error instanceof Error && /expected output identity/i.test(error.message),
  );
  assert.throws(
    () =>
      advanceWorkflowState(
        state,
        commandFor(state, "success", {
          command: { stateRevision: state.stateRevision + 1 },
        }),
      ),
    (error) => error instanceof Error && /revision/i.test(error.message),
  );
});
