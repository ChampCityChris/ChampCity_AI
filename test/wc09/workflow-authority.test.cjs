const assert = require("node:assert/strict");
const { mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const mainArtifacts = require("../../dist/main/artifacts");
const mainWorkflow = require("../../dist/main/workflow");
const sharedWorkflow = require("../../dist/shared/workflow");
const { CanonicalWorkflowAuthority } = require(
  "../../dist/main/workCards/canonicalWorkflowAuthority",
);

const { ArtifactPairService } = mainArtifacts;
const {
  RoutedActionService,
  WorkflowStateArtifactPort,
  WorkflowStateStore,
  updateReferenceNavigation,
} = mainWorkflow;
const {
  advanceWorkflowState,
  canonicalWorkflowSpine,
  createPhaseExecutionState,
  createWorkflowStateIndex,
  defaultLifecycleActionTemplates,
  evaluatePhaseCloseoutEligibility,
  evaluateRoleGate,
  materializeActionCatalog,
  resolvePhaseCandidate,
  validateExecutableProcessConformance,
  validateWorkflowStateIndex,
  withWorkflowBlockers,
} = sharedWorkflow;

const PROJECT_ID = "champcity-ai";
const PHASE_ID = "phase-03";
const WC08_TARGET = "champcity-ai/phase-03/work_card/WC08-REPAIR04";
const WC08_SOURCE = "champcity-ai/phase-03/implementer_report/WC08-REPAIR04";
const WC08_OUTPUT = "champcity-ai/phase-03/architect_review/WC08-REPAIR04";
const WC08_VALIDATION = "champcity-ai/phase-03/validation_report/WC08-REPAIR04";
const WC09_TARGET = "champcity-ai/phase-03/work_card/WC09-REPAIR02";
const WC09_SOURCE = "champcity-ai/phase-03/implementer_report/WC09-REPAIR02";
const WC09_OUTPUT = "champcity-ai/phase-03/architect_review/WC09-REPAIR02";
const WC09_TITLE = "Locked Process Contract and Evidence Precedence Correction";
const WC09_STEM = "locked_process_contract_and_evidence_precedence_correction";

const SUCCESS_LIFECYCLE = [
  "project_intake_required",
  "project_interview_required",
  "reconciliation_review_required",
  "project_mapping_required",
  "operator_project_approval_required",
  "phase_mapping_required",
  "operator_phase_approval_required",
  "work_card_authoring_required",
  "operator_work_card_approval_required",
  "implementer_execution_required",
  "architect_review_of_implementer_report_required",
  "operator_validation_required",
  "phase_closeout_required",
  "operator_phase_closeout_approval_required",
  "roadmap_update_required",
  "next_phase_activation_required",
  "repeat_phase_mapping_and_work_card_loop_required",
  "workflow_complete",
];

const LOCKED_WORKFLOW_SPINE = [
  "project_intake",
  "project_interview",
  "reconciliation_review",
  "project_mapping",
  "operator_project_approval",
  "phase_mapping",
  "operator_phase_approval",
  "work_card_loop",
  "phase_closeout",
  "operator_phase_closeout_approval",
  "roadmap_update",
  "next_phase_activation",
  "repeat_phase_mapping_and_work_card_loop",
];

function candidate(candidateId, order, overrides = {}) {
  return {
    candidateId,
    order,
    title: `${candidateId} fixture`,
    fullWorkCardArtifactId: null,
    fullWorkCardStatus: "missing",
    resolutionStatus: "unresolved",
    resolutionEvidenceArtifactIds: [],
    ...overrides,
  };
}

function phaseExecution(candidates = [candidate("WC10", 1)], overrides = {}) {
  return createPhaseExecutionState({
    workCardPlanArtifactId:
      "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    workCardPlanAuthority: "authoritative",
    approvedCandidates: candidates,
    activeCandidateId:
      candidates.find((item) => item.resolutionStatus === "unresolved")
        ?.candidateId ?? null,
    ...overrides,
  });
}

const workCardLoopBindings = {
  work_card_authoring_required: {
    targetArtifactId:
      "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    sourceArtifactIds: [
      "champcity-ai/phase-03/approval/Operator_Phase_Approval",
      "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    ],
    expectedOutputArtifactId: "champcity-ai/phase-03/work_card/WC10",
  },
  operator_work_card_approval_required: {
    targetArtifactId: "champcity-ai/phase-03/work_card/WC10",
    sourceArtifactIds: ["champcity-ai/phase-03/work_card/WC10"],
    expectedOutputArtifactId:
      "champcity-ai/phase-03/work_card_approval/WC10",
  },
  implementer_execution_required: {
    targetArtifactId: "champcity-ai/phase-03/work_card/WC10",
    sourceArtifactIds: ["champcity-ai/phase-03/work_card/WC10"],
    expectedOutputArtifactId:
      "champcity-ai/phase-03/implementer_report/WC10",
  },
  architect_review_of_implementer_report_required: {
    targetArtifactId: "champcity-ai/phase-03/work_card/WC10",
    sourceArtifactIds: [
      "champcity-ai/phase-03/implementer_report/WC10",
    ],
    expectedOutputArtifactId:
      "champcity-ai/phase-03/architect_review/WC10",
  },
  operator_validation_required: {
    targetArtifactId: "champcity-ai/phase-03/work_card/WC10",
    sourceArtifactIds: ["champcity-ai/phase-03/architect_review/WC10"],
    expectedOutputArtifactId:
      "champcity-ai/phase-03/validation_report/WC10",
  },
};

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

function createState(
  initialActionId,
  bindingOverrides = {},
  candidateState = phaseExecution(),
) {
  return createWorkflowStateIndex({
    projectId: PROJECT_ID,
    activePhaseId: PHASE_ID,
    createdAt: "2026-07-14T14:00:00.000Z",
    initialActionId,
    actions: materializeActionCatalog(
      defaultLifecycleActionTemplates,
      lifecycleBindings({ ...workCardLoopBindings, ...bindingOverrides }),
    ),
    phaseExecution: candidateState,
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

test("the canonical workflow spine matches the locked process baseline", () => {
  assert.deepEqual([...canonicalWorkflowSpine], LOCKED_WORKFLOW_SPINE);
});

test("Phase Mapping routes directly to Operator Phase Approval with interview evidence subordinate", () => {
  const state = createState("phase_mapping_required");
  assert.equal(
    defaultLifecycleActionTemplates.some(
      (template) => template.actionId === "phase_intake_required",
    ),
    false,
  );
  assert.equal(
    defaultLifecycleActionTemplates.some(
      (template) => template.actionId === "phase_architect_interview_required",
    ),
    false,
  );
  assert.equal(
    state.actionCatalog.phase_mapping_required.routes.success,
    "operator_phase_approval_required",
  );
  const advanced = transition(state);
  assert.equal(advanced.currentActionId, "operator_phase_approval_required");
  assert.equal(advanced.responsibleRole, "operator");
});

test("Phase Interview authority is conditional on an explicit Phase Mapping decision", () => {
  const phaseInterview =
    "champcity-ai/phase-03/architect_interview/Phase_Interview";
  const baseSources = [
    "champcity-ai/project/phase_map/PHASE_MAP_test",
    "champcity-ai/phase-03/phase_planning/Phase_Planning",
    "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    phaseInterview,
  ];
  const notRequired = transition(
    createState("phase_mapping_required", {
      operator_phase_approval_required: { sourceArtifactIds: baseSources },
    }),
    "success",
    { phaseMappingDecision: { phaseInterviewRequired: false } },
  );
  assert.equal(notRequired.blockingConditions.length, 0);
  assert.equal(notRequired.currentAction.sourceArtifactIds.includes(phaseInterview), false);

  const required = transition(
    createState("phase_mapping_required", {
      operator_phase_approval_required: { sourceArtifactIds: baseSources.slice(0, 3) },
    }),
    "success",
    {
      phaseMappingDecision: {
        phaseInterviewRequired: true,
        phaseInterviewArtifactId: phaseInterview,
      },
    },
  );
  assert.equal(required.blockingConditions.length, 0);
  assert.equal(required.currentAction.sourceArtifactIds.includes(phaseInterview), true);

  const missing = transition(createState("phase_mapping_required"), "success", {
    phaseMappingDecision: { phaseInterviewRequired: true },
  });
  assert.equal(missing.currentAction.authorityStatus, "blocked");
  assert.equal(missing.blockingConditions[0].code, "missing_authority");
  assert.equal(missing.blockingConditions[0].ownerRole, "architect");
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

test("passing a non-final candidate resolves it and routes to the earliest unresolved candidate authoring", () => {
  const candidates = [
    candidate("WC10", 1, {
      fullWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC10",
      fullWorkCardStatus: "active",
    }),
    candidate("WC11", 2),
  ];
  let state = createState(
    "operator_validation_required",
    {},
    phaseExecution(candidates, {
      activeCandidateId: "WC10",
      activeWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC10",
    }),
  );

  state = transition(state);

  assert.equal(state.phaseExecution.approvedCandidates[0].resolutionStatus, "completed");
  assert.deepEqual(
    state.phaseExecution.approvedCandidates[0].resolutionEvidenceArtifactIds,
    ["champcity-ai/phase-03/validation_report/WC10"],
  );
  assert.equal(state.phaseExecution.earliestUnresolvedCandidateId, "WC11");
  assert.equal(state.currentActionId, "work_card_authoring_required");
  assert.deepEqual(state.currentAction.expectedOutput, {
    artifactId: "champcity-ai/phase-03/work_card/WC11",
    artifactType: "work_card",
  });
});

test("passing the final candidate routes to an unblocked Phase Closeout", () => {
  const state = transition(
    createState(
      "operator_validation_required",
      {},
      phaseExecution([
        candidate("WC10", 1, {
          fullWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC10",
          fullWorkCardStatus: "active",
        }),
      ], {
        activeCandidateId: "WC10",
        activeWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC10",
      }),
    ),
  );

  assert.equal(state.phaseExecution.earliestUnresolvedCandidateId, null);
  assert.equal(state.phaseExecution.closeoutEligibility.eligible, true);
  assert.equal(state.currentActionId, "phase_closeout_required");
  assert.equal(state.currentAction.authorityStatus, "ready");
  assert.deepEqual(state.blockingConditions, []);
});

test("unresolved candidate and active repair authority block Phase Closeout with owners", () => {
  const eligibility = evaluatePhaseCloseoutEligibility({
    workCardPlanArtifactId:
      "champcity-ai/phase-03/work_card_plan/Work_Card_Plan",
    workCardPlanAuthority: "authoritative",
    approvedCandidates: [candidate("WC10", 1)],
    activeRepairArtifactId:
      "champcity-ai/phase-03/work_card/WC10-REPAIR01",
  });

  assert.equal(eligibility.eligible, false);
  assert.deepEqual(
    new Set(eligibility.blockers.map((blocker) => blocker.code)),
    new Set(["candidate_unresolved", "active_repair_unresolved"]),
  );
  assert.ok(eligibility.blockers.every((blocker) => blocker.ownerRole));
});

for (const status of [
  "completed",
  "completed_via_repair",
  "carried_forward",
  "deferred",
  "cancelled",
]) {
  test(`${status} is an explicit closeout-eligible candidate resolution`, () => {
    const resolved = resolvePhaseCandidate(phaseExecution(), {
      candidateId: "WC10",
      resolutionStatus: status,
      evidenceArtifactId: `champcity-ai/phase-03/resolution_evidence/WC10-${status}`,
    });

    assert.equal(resolved.approvedCandidates[0].resolutionStatus, status);
    assert.equal(resolved.closeoutEligibility.eligible, true);
  });
}

test("Roadmap Update is Architect-owned and Next Phase Activation is Operator-owned", () => {
  const roadmapState = createState("roadmap_update_required");
  const activationState = createState("next_phase_activation_required");
  assert.equal(roadmapState.currentAction.role, "architect");
  assert.equal(activationState.currentAction.role, "operator");

  for (const state of [roadmapState, activationState]) {
    const action = state.currentAction;
    const denied = evaluateRoleGate(state, action, {
      actorRole: "application",
      actionId: action.actionId,
      stateRevision: state.stateRevision,
      outputArtifactId: action.expectedOutput.artifactId,
      outputArtifactType: action.expectedOutput.artifactType,
    });
    assert.equal(denied.allowed, false);
    assert.equal(denied.code, "role_mismatch");
  }
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
  assert.equal(state.currentActionId, "implementer_execution_required");
  assert.deepEqual(state.currentAction.sourceArtifactIds, [
    "champcity-ai/phase-03/work_card/WC10",
    "champcity-ai/phase-03/work_card_approval/WC10",
  ]);
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

for (const status of ["carried_forward", "deferred", "cancelled"]) {
  test(`${status} uses the governed Operator candidate-disposition route`, () => {
    let state = createState(
      "operator_work_card_approval_required",
      {},
      phaseExecution([
        candidate("WC10", 1, {
          fullWorkCardArtifactId: "champcity-ai/phase-03/work_card/WC10",
          fullWorkCardStatus: "active",
        }),
      ]),
    );
    state = transition(state, "failure");
    assert.equal(state.currentActionId, "candidate_disposition_required");
    assert.equal(state.responsibleRole, "operator");
    assert.equal(state.currentAction.expectedOutput.artifactType, "candidate_disposition");

    assert.throws(
      () =>
        transition(state, "success", {
          actorRole: "architect",
          candidateDisposition: {
            candidateId: "WC10",
            status,
            rationale: "Operator-governed disposition fixture.",
            sourceAuthorityArtifactIds: [...state.currentAction.sourceArtifactIds],
          },
        }),
      (error) => error?.code === "role_mismatch",
    );

    state = transition(state, "success", {
      candidateDisposition: {
        candidateId: "WC10",
        status,
        rationale: "Operator-governed disposition fixture.",
        sourceAuthorityArtifactIds: [...state.currentAction.sourceArtifactIds],
      },
    });
    assert.equal(state.phaseExecution.approvedCandidates[0].resolutionStatus, status);
    assert.equal(state.currentActionId, "phase_closeout_required");
    assert.equal(state.phaseExecution.closeoutEligibility.eligible, true);
  });
}

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
    const binding = projected.routedArchitectReviewBinding;
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

test("the canonical routed-screen adapter resolves exact WC09-REPAIR02 authority and blocks missing, ambiguous, or tampered pairs", async () => {
  await withTemporaryRoot(async (root) => {
    const artifactPairs = createArtifactService(root);
    const targetCommit = await artifactPairs.commitArtifact({
      artifactId: WC09_TARGET,
      artifactType: "work_card",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: PHASE_ID,
      workCardId: "WC09-REPAIR02",
      parentArtifactId: "champcity-ai/phase-03/work_card/WC09",
      relationships: { sources: [], expectedOutputs: [WC09_OUTPUT], supersedes: [], children: [] },
      payload: {
        title: `Repair Work Card: WC09-REPAIR02 ${WC09_TITLE}`,
        contentMarkdown: `# Repair Work Card: WC09-REPAIR02 - ${WC09_TITLE}\n`,
        data: { workCardId: "WC09-REPAIR02", parentWorkCardId: "WC09" },
      },
      location: {
        directoryPath: "planning/phases/phase-03/Work_Cards",
        fileStem: `WC09-REPAIR02_${WC09_STEM}`,
      },
      expectedRevision: null,
    });
    await artifactPairs.commitArtifact({
      artifactId: "champcity-ai/phase-03/implementer_report/WC09-REPAIR01",
      artifactType: "implementer_report",
      status: "active",
      projectId: PROJECT_ID,
      phaseId: PHASE_ID,
      workCardId: "WC09-REPAIR01",
      relationships: { sources: [], expectedOutputs: [], supersedes: [], children: [] },
      payload: { title: "Earlier filename decoy", contentMarkdown: "# Decoy\n", data: {} },
      location: {
        directoryPath: "planning/phases/phase-03/Implementer_Reports",
        fileStem: "IMPLEMENTER_REPORT_AAA_WC09-REPAIR01_decoy",
      },
      expectedRevision: null,
    });
    await artifactPairs.commitArtifact({
      artifactId: WC09_SOURCE,
      artifactType: "implementer_report",
      status: "pending",
      projectId: PROJECT_ID,
      phaseId: PHASE_ID,
      workCardId: "WC09-REPAIR02",
      relationships: { sources: [WC09_TARGET], expectedOutputs: [WC09_OUTPUT], supersedes: [], children: [] },
      payload: {
        title: "Implementer Report: WC09-REPAIR02",
        contentMarkdown: "# Implementer Report: WC09-REPAIR02\n",
        data: { status: "not-a-routing-marker" },
      },
      location: {
        directoryPath: "planning/phases/phase-03/Implementer_Reports",
        fileStem: `IMPLEMENTER_REPORT_WC09-REPAIR02_${WC09_STEM}`,
      },
      expectedRevision: null,
    });
    const state = createState("architect_review_of_implementer_report_required", {
      architect_review_of_implementer_report_required: {
        targetArtifactId: WC09_TARGET,
        sourceArtifactIds: [WC09_SOURCE],
        expectedOutputArtifactId: WC09_OUTPUT,
      },
      operator_validation_required: {
        targetArtifactId: WC09_TARGET,
        sourceArtifactIds: [WC09_OUTPUT],
        expectedOutputArtifactId: "champcity-ai/phase-03/validation_report/WC09-REPAIR02",
      },
    });
    await new WorkflowStateStore(
      root,
      new WorkflowStateArtifactPort(artifactPairs),
    ).initialize(state);

    const authority = new CanonicalWorkflowAuthority(root, () => "2026-07-15T17:00:00.000Z");
    const projected = await authority.projectCurrentRequiredAction();
    assert.equal(projected.routedScreen.ready, true);
    assert.equal(projected.routedScreen.target.artifactId, WC09_TARGET);
    assert.equal(projected.routedScreen.target.displayTitle, WC09_TITLE);
    assert.deepEqual(projected.routedScreen.sources.map((source) => source.artifactId), [WC09_SOURCE]);
    assert.equal(
      projected.routedScreen.sources[0].markdownPath,
      `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09-REPAIR02_${WC09_STEM}.md`,
    );
    assert.equal(projected.routedScreen.expectedOutput.artifactId, WC09_OUTPUT);
    assert.equal(
      projected.routedScreen.expectedOutput.markdownPath,
      `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC09-REPAIR02_${WC09_STEM}.md`,
    );
    assert.equal(projected.routedArchitectReviewBinding.workCardTitle, WC09_TITLE);
    assert.equal(projected.routedArchitectReviewBinding.blockingState.blocked, false);

    await assert.rejects(
      authority.authorizeArchitectReview({
        ...projected.routedArchitectReviewBinding,
        targetArtifactId: "champcity-ai/phase-03/work_card/WC09-REPAIR01",
      }),
      /stale or mismatched/,
      "Reference navigation cannot retarget the routed action.",
    );

    const missingRoot = await mkdtemp(path.join(os.tmpdir(), "champcity-wc01-missing-"));
    try {
      const missingPairs = createArtifactService(missingRoot);
      await new WorkflowStateStore(
        missingRoot,
        new WorkflowStateArtifactPort(missingPairs),
      ).initialize(state);
      const missing = await new CanonicalWorkflowAuthority(missingRoot).projectCurrentRequiredAction();
      assert.equal(missing.routedScreen.ready, false);
      assert.deepEqual(
        missing.routedScreen.blockers.map((blocker) => blocker.code),
        ["missing_target", "missing_source", "missing_output_location"],
      );
    } finally {
      await rm(missingRoot, { recursive: true, force: true });
    }

    const tamperedMarkdownPath = path.join(root, ...targetCommit.artifact.markdownPath.split("/"));
    const originalMarkdown = await readFile(tamperedMarkdownPath, "utf8");
    await writeFile(tamperedMarkdownPath, `${originalMarkdown}\nTampered.\n`, "utf8");
    const tampered = await authority.projectCurrentRequiredAction();
    assert.equal(tampered.routedScreen.ready, false);
    assert.ok(tampered.routedScreen.blockers.some((blocker) => blocker.code === "unsynchronized_pair"));
  });
});

test("the persisted production state activates Phase 04 WC01 after the blocking WC09-REPAIR02 validation", async () => {
  const projectRoot = path.resolve(process.cwd());
  const artifactPairs = new ArtifactPairService({ projectRoot });
  const workflowStore = new WorkflowStateStore(
    projectRoot,
    new WorkflowStateArtifactPort(artifactPairs),
  );

  const firstRead = await workflowStore.load();
  const secondRead = await workflowStore.load();
  assert.ok(firstRead);
  assert.ok(secondRead);
  assert.deepEqual(secondRead.state, firstRead.state);

  const state = firstRead.state;
  const workCardId = "champcity-ai/phase-04/work_card/WC01";
  const reportId = "champcity-ai/phase-04/implementer_report/WC01";
  assert.equal(state.activePhaseId, "phase-04");
  assert.equal(state.currentActionId, "implementer_execution_required");
  assert.equal(state.currentAction.targetArtifactId, workCardId);
  assert.deepEqual(state.currentAction.sourceArtifactIds, [
    "champcity-ai/phase-04/phase_activation/phase-04",
    "champcity-ai/phase-04/approval/Operator_Phase_Approval",
  ]);
  assert.equal(state.currentAction.expectedOutput.artifactId, reportId);
  assert.equal(state.phaseExecution.activeRepairArtifactId, null);
  assert.deepEqual(state.openRepairChain.activeRepairArtifactIds, []);
  assert.equal(state.phaseExecution.earliestUnresolvedCandidateId, "WC01");
  const conformance = validateExecutableProcessConformance(state.actionCatalog);
  assert.equal(conformance.conforms, true, conformance.issues.join("\n"));
  const registry = await artifactPairs.loadRegistry();
  assert.ok(registry);
  for (const artifactId of [
    "champcity-ai/phase-03/validation_report/WC09-REPAIR02",
    "champcity-ai/phase-04/phase_activation/phase-04",
    workCardId,
    reportId,
  ]) {
    const entry = registry.entries.find((item) => item.artifactId === artifactId);
    assert.ok(entry, `${artifactId} must be registered`);
    assert.equal(entry.authoritative, true);
    assert.equal(entry.synchronized, true);
  }
});
