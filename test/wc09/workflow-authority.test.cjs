const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const mainArtifacts = require("../../dist/main/artifacts");
const mainWorkflow = require("../../dist/main/workflow");
const sharedWorkflow = require("../../dist/shared/workflow");
const { CanonicalWorkflowAuthority } = require(
  "../../dist/main/workCards/canonicalWorkflowAuthority",
);
const {
  resolveCurrentActionArchitectReviewBinding,
} = require("../../dist/shared/workCards/architectReviewRecord");

const { ArtifactPairService } = mainArtifacts;
const {
  RoutedActionService,
  WorkflowStateArtifactPort,
  WorkflowStateStore,
  updateReferenceNavigation,
} = mainWorkflow;
const {
  advanceWorkflowState,
  createWorkflowStateIndex,
  defaultLifecycleActionTemplates,
  evaluateRoleGate,
  materializeActionCatalog,
  validateWorkflowStateIndex,
  withWorkflowBlockers,
} = sharedWorkflow;

const PROJECT_ID = "champcity-ai";
const PHASE_ID = "phase-03";
const WC08_TARGET = "champcity-ai/phase-03/work_card/WC08-REPAIR04";
const WC08_SOURCE = "champcity-ai/phase-03/implementer_report/WC08-REPAIR04";
const WC08_OUTPUT = "champcity-ai/phase-03/architect_review/WC08-REPAIR04";
const WC08_VALIDATION = "champcity-ai/phase-03/validation_report/WC08-REPAIR04";

const SUCCESS_LIFECYCLE = [
  "project_intake_required",
  "project_architect_interview_required",
  "project_planning_required",
  "repository_reconciliation_required",
  "project_roadmap_required",
  "operator_project_approval_required",
  "phase_mapping_required",
  "phase_intake_required",
  "phase_architect_interview_required",
  "phase_planning_required",
  "work_card_plan_review_required",
  "operator_phase_approval_required",
  "work_card_authoring_required",
  "operator_work_card_approval_required",
  "implementer_handoff_required",
  "implementer_execution_required",
  "architect_review_of_implementer_report_required",
  "operator_validation_required",
  "phase_closeout_required",
  "operator_closeout_approval_required",
  "roadmap_update_required",
  "next_phase_activation_required",
  "workflow_complete",
];

function lifecycleBindings(overrides = {}) {
  return Object.fromEntries(
    defaultLifecycleActionTemplates.map((template) => {
      const standard = {
        targetArtifactId: `champcity-ai/targets/${template.actionId}`,
        sourceArtifactIds: [`champcity-ai/sources/${template.actionId}`],
        expectedOutputArtifactId: `champcity-ai/outputs/${template.actionId}`,
      };
      return [template.actionId, { ...standard, ...overrides[template.actionId] }];
    }),
  );
}

function createState(initialActionId, bindingOverrides = {}) {
  return createWorkflowStateIndex({
    projectId: PROJECT_ID,
    activePhaseId: PHASE_ID,
    createdAt: "2026-07-14T14:00:00.000Z",
    initialActionId,
    actions: materializeActionCatalog(
      defaultLifecycleActionTemplates,
      lifecycleBindings(bindingOverrides),
    ),
  });
}

function transition(state, route = "success", options = {}) {
  const action = state.currentAction;
  assert.ok(action, "A current routed action is required for a transition.");
  const evidence = {
    artifactId: action.expectedOutput.artifactId,
    artifactType: action.expectedOutput.artifactType,
    pairVerified: true,
    registryCommitted: true,
  };
  return advanceWorkflowState(state, {
    actionId: action.actionId,
    stateRevision: state.stateRevision,
    actorRole: action.role,
    route,
    evidence,
    ...(action.actionId === "architect_review_of_implementer_report_required" &&
    route === "success"
      ? { authorization: { decision: "authorized", artifactId: evidence.artifactId } }
      : {}),
    occurredAt:
      options.occurredAt ??
      new Date(Date.parse(state.updatedAt) + 1000).toISOString(),
    ...options,
  });
}

function createArtifactService(projectRoot) {
  let transaction = 0;
  let clockTick = 0;
  return new ArtifactPairService({
    projectRoot,
    clock: () =>
      new Date(Date.parse("2026-07-14T15:00:00.000Z") + clockTick++ * 1000).toISOString(),
    transactionIdFactory: () => `wc08-route-${++transaction}`,
  });
}

async function withTemporaryRoot(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "champcity-wc09-workflow-"));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("role gates enforce current action, revision, responsible role, output identity, and blockers", () => {
  const state = createState("implementer_execution_required");
  const action = state.currentAction;
  const baseRequest = {
    actorRole: "implementer",
    actionId: action.actionId,
    stateRevision: state.stateRevision,
    outputArtifactId: action.expectedOutput.artifactId,
    outputArtifactType: action.expectedOutput.artifactType,
  };

  assert.deepEqual(evaluateRoleGate(state, action, baseRequest), { allowed: true });
  assert.equal(
    evaluateRoleGate(state, action, { ...baseRequest, actorRole: "architect" }).code,
    "role_mismatch",
  );
  assert.equal(
    evaluateRoleGate(state, action, {
      ...baseRequest,
      actionId: "architect_review_of_implementer_report_required",
    })
      .code,
    "stale_action",
  );
  assert.equal(
    evaluateRoleGate(state, action, {
      ...baseRequest,
      stateRevision: state.stateRevision + 1,
    }).code,
    "stale_state_revision",
  );
  assert.equal(
    evaluateRoleGate(state, action, {
      ...baseRequest,
      outputArtifactId: "champcity-ai/outputs/wrong",
    }).code,
    "output_identity_mismatch",
  );

  const blockedState = withWorkflowBlockers(
    state,
    [
      {
        code: "pair_mismatch",
        message: "The routed source pair is not synchronized.",
        ownerRole: "application",
        artifactIds: action.sourceArtifactIds,
        blocking: true,
      },
    ],
    "2026-07-14T14:00:01.000Z",
  );
  assert.equal(
    evaluateRoleGate(blockedState, blockedState.currentAction, baseRequest).code,
    "blocked_action",
  );
});

test("the success route traverses every non-repair lifecycle process category", () => {
  let state = createState("project_intake_required");
  const visited = [];

  while (state.currentAction) {
    visited.push(state.currentAction.actionId);
    state = transition(state, "success");
  }

  assert.deepEqual(visited, SUCCESS_LIFECYCLE);
  assert.equal(state.currentActionId, null);
  assert.equal(state.responsibleRole, null);
  assert.equal(state.transitionHistory.length, SUCCESS_LIFECYCLE.length);
  assert.equal(state.closeout.status, "approved");
  assert.equal(state.roadmap.status, "updated");
  assert.equal(state.nextPhase.status, "project_complete");
  assert.deepEqual(
    new Set(visited.map((actionId) => state.actionCatalog[actionId].role)),
    new Set(["operator", "architect", "implementer", "application"]),
  );
});

test("failed validation routes through Architect disposition and repair creation", () => {
  let state = createState("operator_validation_required");

  state = transition(state, "failure");
  assert.equal(state.currentActionId, "architect_disposition_required");
  assert.equal(state.responsibleRole, "architect");

  const dispositionArtifactId = state.currentAction.expectedOutput.artifactId;
  state = transition(state, "repair");
  assert.equal(state.currentActionId, "repair_work_card_required");
  assert.equal(state.openRepairChain.status, "open");
  assert.equal(state.openRepairChain.latestDispositionArtifactId, dispositionArtifactId);

  const repairArtifactId = state.currentAction.expectedOutput.artifactId;
  state = transition(state, "success");
  assert.equal(state.currentActionId, "operator_work_card_approval_required");
  assert.equal(state.responsibleRole, "operator");
  assert.deepEqual(state.openRepairChain.activeRepairArtifactIds, [repairArtifactId]);
  assert.deepEqual(
    state.transitionHistory.map((entry) => entry.route),
    ["failure", "repair", "success"],
  );
});

test("verified Work Card evidence rebinds each noncurrent build/prove action to exact persisted identities", () => {
  let state = createState("work_card_authoring_required", {
    work_card_authoring_required: {
      targetArtifactId: null,
      sourceArtifactIds: [],
      expectedOutputArtifactId: "champcity-ai/phase-03/work_card/WC10",
    },
  });

  state = transition(state);
  assert.equal(state.currentActionId, "operator_work_card_approval_required");
  assert.equal(state.currentAction.targetArtifactId, "champcity-ai/phase-03/work_card/WC10");
  assert.deepEqual(state.currentAction.expectedOutput, {
    artifactId: "champcity-ai/phase-03/work_card_approval/WC10",
    artifactType: "work_card_approval",
  });

  state = transition(state);
  assert.equal(state.currentActionId, "implementer_handoff_required");
  assert.deepEqual(state.currentAction.expectedOutput, {
    artifactId: "champcity-ai/phase-03/implementer_execution_packet/WC10",
    artifactType: "implementer_execution_packet",
  });

  state = transition(state);
  assert.equal(state.currentActionId, "implementer_execution_required");
  assert.deepEqual(state.currentAction.expectedOutput, {
    artifactId: "champcity-ai/phase-03/implementer_report/WC10",
    artifactType: "implementer_report",
  });

  state = transition(state);
  assert.equal(state.currentActionId, "architect_review_of_implementer_report_required");
  assert.deepEqual(state.currentAction.expectedOutput, {
    artifactId: "champcity-ai/phase-03/architect_review/WC10",
    artifactType: "architect_review",
  });

  state = transition(state);
  assert.equal(state.currentActionId, "operator_validation_required");
  assert.deepEqual(state.currentAction.expectedOutput, {
    artifactId: "champcity-ai/phase-03/validation_report/WC10",
    artifactType: "validation_report",
  });
  assert.equal(
    JSON.stringify(state.actionCatalog).includes("/workflow/expected/"),
    false,
  );
});

test("workflow validation rejects placeholder expected-output authority", () => {
  const state = createState("project_intake_required");
  state.actionCatalog.project_intake_required.expectedOutput.artifactId =
    "champcity-ai/workflow/expected/project_intake_required";
  state.currentAction.expectedOutput.artifactId =
    "champcity-ai/workflow/expected/project_intake_required";

  const validation = validateWorkflowStateIndex(state);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /exact persisted artifact identity/);
});

test("reference navigation is non-authoritative and cannot replace a routed target", () => {
  const state = createState("architect_review_of_implementer_report_required", {
    architect_review_of_implementer_report_required: {
      targetArtifactId: WC08_TARGET,
      sourceArtifactIds: [WC08_SOURCE],
      expectedOutputArtifactId: WC08_OUTPUT,
    },
  });
  const authorityBefore = structuredClone(state.currentAction);
  const stateBefore = structuredClone(state);

  const reference = updateReferenceNavigation(null, {
    selectedArtifactIds: [
      "champcity-ai/phase-03/work_card/WC08",
      "champcity-ai/phase-03/work_card/WC08-REPAIR05",
    ],
    previewArtifactId: "champcity-ai/phase-03/work_card/WC08-REPAIR05",
    updatedAt: "2026-07-14T14:30:00.000Z",
  });

  assert.deepEqual(state, stateBefore);
  assert.deepEqual(state.currentAction, authorityBefore);
  assert.equal(state.currentAction.targetArtifactId, WC08_TARGET);
  assert.equal(Object.hasOwn(reference, "targetArtifactId"), false);
  assert.equal(Object.hasOwn(reference, "actionId"), false);
  assert.equal(Object.hasOwn(reference, "stateRevision"), false);
  assert.equal(Object.hasOwn(reference, "routes"), false);
});

test("WC08 Architect Review save binds R4 authority and advances to Operator Validation only after authorization", async () => {
  await withTemporaryRoot(async (root) => {
    const state = createState("architect_review_of_implementer_report_required", {
      architect_review_of_implementer_report_required: {
        targetArtifactId: WC08_TARGET,
        sourceArtifactIds: [WC08_SOURCE],
        expectedOutputArtifactId: WC08_OUTPUT,
      },
      operator_validation_required: {
        targetArtifactId: WC08_OUTPUT,
        sourceArtifactIds: [WC08_OUTPUT],
        expectedOutputArtifactId: WC08_VALIDATION,
      },
    });
    const artifactPairs = createArtifactService(root);
    const workflowStore = new WorkflowStateStore(
      root,
      new WorkflowStateArtifactPort(artifactPairs),
    );
    const routedActions = new RoutedActionService(workflowStore);
    await workflowStore.initialize(state);

    const authorizedRoute = await routedActions.authorizeCurrentAction({
      actorRole: "architect",
      actionId: "architect_review_of_implementer_report_required",
      stateRevision: 1,
      outputArtifactId: WC08_OUTPUT,
      outputArtifactType: "architect_review",
    });
    assert.equal(authorizedRoute.targetArtifactId, WC08_TARGET);
    assert.deepEqual(authorizedRoute.sourceArtifactIds, [WC08_SOURCE]);
    assert.deepEqual(authorizedRoute.expectedOutput, {
      artifactId: WC08_OUTPUT,
      artifactType: "architect_review",
    });

    const reviewSave = await artifactPairs.commitArtifact({
      artifactId: WC08_OUTPUT,
      artifactType: "architect_review",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: PHASE_ID,
      workCardId: "WC08-REPAIR04",
      relationships: {
        sources: [WC08_SOURCE, WC08_TARGET],
        expectedOutputs: [WC08_VALIDATION],
        supersedes: [],
        children: [],
      },
      payload: {
        title: "Architect Review WC08-REPAIR04",
        contentMarkdown:
          "# Architect Review WC08-REPAIR04\n\nAuthorized for Operator Validation.\n",
        data: {
          decision: "authorized",
          nextActionId: "operator_validation_required",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-03/Architect_Reviews",
        fileStem: "ARCHITECT_REVIEW_WC08-REPAIR04",
      },
      expectedRevision: null,
    });
    const verifiedReviewSave = {
      artifactId: reviewSave.artifact.artifactId,
      artifactType: reviewSave.artifact.artifactType,
      pairVerified: reviewSave.pairVerified,
      registryCommitted: reviewSave.registryCommitted,
    };

    await assert.rejects(
      workflowStore.advanceAfterArtifactCommit(
        {
          actionId: "architect_review_of_implementer_report_required",
          stateRevision: 1,
          actorRole: "architect",
          route: "success",
          occurredAt: "2026-07-14T15:01:00.000Z",
        },
        verifiedReviewSave,
      ),
      (error) => error?.code === "authorization_required",
    );
    assert.equal((await routedActions.getAuthoritySnapshot()).state.stateRevision, 1);

    const advanced = await workflowStore.advanceAfterArtifactCommit(
      {
        actionId: "architect_review_of_implementer_report_required",
        stateRevision: 1,
        actorRole: "architect",
        route: "success",
        authorization: { decision: "authorized", artifactId: WC08_OUTPUT },
        occurredAt: "2026-07-14T15:01:00.000Z",
      },
      verifiedReviewSave,
    );

    assert.equal(advanced.state.stateRevision, 2);
    assert.equal(advanced.state.currentActionId, "operator_validation_required");
    assert.equal(advanced.state.responsibleRole, "operator");
    assert.equal(advanced.state.authoritativeTargetArtifactId, WC08_TARGET);
    assert.deepEqual(advanced.state.requiredSourceArtifactIds, [WC08_OUTPUT]);
    assert.deepEqual(advanced.state.expectedOutput, {
      artifactId: WC08_VALIDATION,
      artifactType: "validation_report",
    });
    assert.equal(advanced.commit.artifactRevision, 2);

    const reloaded = await routedActions.getAuthoritySnapshot();
    assert.equal(reloaded.routedAction.actionId, "operator_validation_required");
    assert.equal(reloaded.routedAction.screenId, "operator-validation");
    assert.equal(reloaded.routedAction.targetArtifactId, WC08_TARGET);
    assert.equal(reloaded.routedAction.bindingSource.stateRevision, 2);

    const registry = await artifactPairs.loadRegistry();
    assert.equal(
      registry.entries.filter((entry) => entry.artifactId === WC08_OUTPUT).length,
      1,
    );
    assert.equal(
      registry.entries.find((entry) => entry.artifactId === WC08_OUTPUT).authoritative,
      true,
    );
    assert.equal(
      registry.entries.some((entry) => entry.artifactId.includes("WC08-REPAIR07")),
      false,
    );
  });
});

test("the main-process WC08 route rehydrates authority, defeats reference overrides, saves a pair, and returns Operator Validation", async () => {
  await withTemporaryRoot(async (root) => {
    const artifactPairs = createArtifactService(root);
    await artifactPairs.commitArtifact({
      artifactId: WC08_TARGET,
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: PHASE_ID,
      workCardId: "WC08-REPAIR04",
      parentArtifactId: "champcity-ai/phase-03/work_card/WC08",
      relationships: { sources: [], expectedOutputs: [WC08_OUTPUT], supersedes: [], children: [] },
      payload: {
        title: "Controlled Route Recovery and Accurate Route Evidence Authority",
        contentMarkdown: "# WC08-REPAIR04\n",
        data: {
          workCardId: "WC08-REPAIR04",
          parentWorkCardId: "WC08",
          title: "Controlled Route Recovery and Accurate Route Evidence Authority",
        },
      },
      location: {
        directoryPath: "planning/phases/phase-03/Work_Cards",
        fileStem: "WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority",
      },
      expectedRevision: null,
    });
    await artifactPairs.commitArtifact({
      artifactId: WC08_SOURCE,
      artifactType: "implementer_report",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: PHASE_ID,
      workCardId: "WC08-REPAIR04",
      relationships: { sources: [WC08_TARGET], expectedOutputs: [WC08_OUTPUT], supersedes: [], children: [] },
      payload: {
        title: "Implementer Report WC08-REPAIR04",
        contentMarkdown: "# Implementer Report WC08-REPAIR04\n",
        data: {},
      },
      location: {
        directoryPath: "planning/phases/phase-03/Implementer_Reports",
        fileStem: "IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority",
      },
      expectedRevision: null,
    });
    const state = createState("architect_review_of_implementer_report_required", {
      architect_review_of_implementer_report_required: {
        targetArtifactId: WC08_TARGET,
        sourceArtifactIds: [WC08_SOURCE],
        expectedOutputArtifactId: WC08_OUTPUT,
      },
      operator_validation_required: {
        targetArtifactId: WC08_TARGET,
        sourceArtifactIds: [WC08_OUTPUT],
        expectedOutputArtifactId: WC08_VALIDATION,
      },
    });
    const workflowStore = new WorkflowStateStore(
      root,
      new WorkflowStateArtifactPort(artifactPairs),
    );
    await workflowStore.initialize(state);

    const authority = new CanonicalWorkflowAuthority(root, () =>
      "2026-07-14T16:00:00.000Z",
    );
    const projected = await authority.projectCurrentRequiredAction();
    assert.equal(projected.currentAction.workCardId, "WC08-REPAIR04");
    assert.equal(
      projected.currentAction.sourceArtifacts[0].path,
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md",
    );
    const binding = resolveCurrentActionArchitectReviewBinding(
      projected.currentAction,
    ).binding;
    assert.ok(binding);
    const authorized = await authority.authorizeArchitectReview(binding);
    assert.equal(authorized.workCardId, "WC08-REPAIR04");

    await assert.rejects(
      authority.authorizeArchitectReview({
        ...binding,
        targetArtifactId: "champcity-ai/phase-03/work_card/WC08-REPAIR05",
      }),
      /stale or mismatched/,
    );

    const committed = await authority.commitArchitectReview({
      authority: authorized,
      reviewMarkdown: "# Architect Review WC08-REPAIR04\n\nReady for Operator validation.\n",
      decision: "Ready for Operator validation",
      reviewData: { decision: "Ready for Operator validation" },
    });
    assert.equal(committed.pairCommit.artifact.artifactId, WC08_OUTPUT);
    assert.equal(committed.pairCommit.pairVerified, true);
    assert.equal(committed.pairCommit.registryCommitted, true);
    assert.equal(committed.transition.state.currentActionId, "operator_validation_required");
    assert.equal(committed.transition.state.currentAction.screenId, "operator-validation");
    assert.equal(committed.transition.state.stateRevision, 2);
    assert.equal(
      committed.pairCommit.artifact.markdownPath,
      "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md",
    );
  });
});
