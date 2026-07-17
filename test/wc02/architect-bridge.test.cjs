const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildArchitectTaskPacket,
} = require("../../dist/shared/workCards/architectTaskPacket");
const {
  currentActionSurfaceRoutes,
  getCurrentActionSurfaceRoute,
} = require("../../dist/shared/workCards/currentActionRouteTable");
const {
  processIpcPolicies,
} = require("../../dist/main/workflow/processIpcPolicy");

const projectId = "champcity-ai";
const phaseId = "phase-04";
const workCardId = "WC01";

function architectDispositionAction() {
  return {
    id: "architect_disposition_required",
    workflowStep: "Work Card Loop",
    title: "Architect disposition required",
    summary: "Review validation and repair evidence.",
    responsibleRole: "architect",
    phaseId,
    workCardId,
    status: "needs_review",
    reason: "Validation evidence needs Architect disposition.",
    sourceArtifacts: [],
    missingArtifacts: [],
    warnings: [],
    routedAction: {
      schemaVersion: "champcity.routed-action.v1",
      actionId: "architect_disposition_required",
      processId: "work_card_loop",
      processClassification: "top_level",
      advancesWorkflowState: true,
      stage: "prove",
      role: "architect",
      screenId: "architect-bridge",
      targetArtifactId: `${projectId}/${phaseId}/work_card/${workCardId}`,
      sourceArtifactIds: [
        `${projectId}/${phaseId}/operator_validation/${workCardId}`,
        `${projectId}/${phaseId}/architect_review/${workCardId}`,
        `${projectId}/${phaseId}/work_card/${workCardId}`,
        `${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`,
        `${projectId}/${phaseId}/implementer_report/${workCardId}`,
        `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
      ],
      expectedOutput: {
        artifactId: `${projectId}/${phaseId}/candidate_disposition/${workCardId}`,
        artifactType: "candidate_disposition",
      },
      routes: { success: "operator_validation_required", failure: "repair_work_card_required", repair: "repair_work_card_required" },
      bindingSource: {
        kind: "relationship_resolver",
        workflowStateArtifactId: `${projectId}/system/workflow_state`,
        stateRevision: 1,
        projectId,
        evidenceArtifactIds: [],
      },
      authorityStatus: "ready",
      blockers: [],
      stateRevision: 1,
    },
  };
}

test("current-action route table maps architect disposition to Architect Bridge, not Human Validation", () => {
  const route = getCurrentActionSurfaceRoute("architect_disposition_required");
  assert.equal(route.responsibleRole, "architect");
  assert.equal(route.manualScreenId, "architect-bridge");
  assert.equal(route.uiSurface, "architect-bridge");
  assert.equal(route.authorizedOperations.includes("workCards:previewHumanValidationRecord"), false);
  assert.equal(route.authorizedOperations.includes("workCards:ensureArchitectTaskPacket"), true);
});

test("architect disposition task packet IPC policy is an Architect Bridge support write", () => {
  const policy = processIpcPolicies.find(
    (candidate) => candidate.channel === "workCards:ensureArchitectTaskPacket",
  );
  assert.equal(policy.kind, "routed");
  assert.equal(policy.operation, "supporting-write");
  assert.deepEqual(policy.allowedAuxiliaryArtifactTypes, ["architect_task"]);
  assert.deepEqual(policy.transition, { mode: "none" });

  const dispositionVariant = policy.variants.find(
    (variant) => variant.actionId === "architect_disposition_required",
  );
  assert.ok(dispositionVariant);
  assert.equal(dispositionVariant.role, "architect");
  assert.equal(dispositionVariant.screenId, "architect-bridge");
  assert.equal(dispositionVariant.expectedOutputArtifactType, "candidate_disposition");

  const validationReviewVariant = policy.variants.find(
    (variant) => variant.actionId === "architect_review_of_validation_report_required",
  );
  assert.ok(validationReviewVariant);
  assert.equal(validationReviewVariant.screenId, "architect-bridge");
});

test("current-action route table inventories every locked current-action family", () => {
  const ids = new Set(currentActionSurfaceRoutes.map((route) => route.actionId));
  for (const required of [
    "project_intake_required",
    "project_interview_required",
    "reconciliation_review_required",
    "project_mapping_required",
    "operator_project_approval_required",
    "phase_mapping_required",
    "operator_phase_approval_required",
    "implementer_execution_required",
    "architect_review_of_implementer_report_required",
    "operator_validation_required",
    "architect_disposition_required",
    "repair_work_card_required",
    "candidate_disposition_required",
    "phase_closeout_required",
    "operator_phase_closeout_approval_required",
    "roadmap_update_required",
    "next_phase_activation_required",
  ]) {
    assert.equal(ids.has(required), true, `${required} must have an explicit surface route`);
  }
});

test("architect disposition packet targets repaired parent candidate disposition", () => {
  const packet = buildArchitectTaskPacket(architectDispositionAction(), projectId);
  const data = packet.payload.data;

  assert.equal(packet.artifactType, "architect_task");
  assert.equal(packet.directoryPath, `planning/phases/${phaseId}/Architect_Tasks`);
  assert.equal(packet.jsonFileName, "ARCHITECT_TASK_WC01_candidate_disposition.json");
  assert.equal(data.role, "Architect");
  assert.equal(data.currentAction, "architect_disposition_required");
  assert.equal(data.requestedAction, "review_validation_report_and_write_candidate_disposition");
  assert.equal(data.targetArtifactId, `${projectId}/${phaseId}/work_card/${workCardId}`);
  assert.equal(data.expectedOutput.artifactId, `${projectId}/${phaseId}/candidate_disposition/${workCardId}`);
  assert.equal(data.expectedOutput.artifactType, "candidate_disposition");
  for (const requiredSource of [
    `${projectId}/${phaseId}/operator_validation/${workCardId}`,
    `${projectId}/${phaseId}/architect_review/${workCardId}`,
    `${projectId}/${phaseId}/work_card/${workCardId}`,
    `${projectId}/${phaseId}/implementer_report/${workCardId}`,
    `${projectId}/${phaseId}/work_card/${workCardId}-REPAIR01`,
    `${projectId}/${phaseId}/implementer_report/${workCardId}-REPAIR01-repository-observed-evidence-derived-workflow-authority`,
  ]) {
    assert.ok(data.sourceArtifactIds.includes(requiredSource), `${requiredSource} must be in the packet source bundle`);
  }
  assert.equal(
    data.sourceArtifactIds.includes(`${projectId}/${phaseId}/architect_disposition/${workCardId}`),
    false,
  );
  assert.equal(
    data.defaultDecisionRule,
    "Validation Report = Pass plus parent completed after authorized repair chain means write completed_via_repair.",
  );
  assert.equal(packet.relationships.expectedOutputs[0], data.expectedOutput.artifactId);
  assert.ok(packet.chatGptPrompt.includes(packet.jsonFileName));
  assert.ok(packet.chatGptPrompt.includes("Do not rely on chat history."));
});

test("architect review packet preserves existing Architect Review output contract", () => {
  const action = architectDispositionAction();
  action.id = "architect_review_of_implementer_report_required";
  action.routedAction.actionId = "architect_review_of_implementer_report_required";
  action.routedAction.screenId = "architect-review";
  action.routedAction.expectedOutput = {
    artifactId: `${projectId}/${phaseId}/architect_review/${workCardId}`,
    artifactType: "architect_review",
  };
  action.routedAction.sourceArtifactIds = [
    `${projectId}/${phaseId}/implementer_report/${workCardId}`,
  ];

  const packet = buildArchitectTaskPacket(action, projectId);
  assert.equal(packet.payload.data.requestedAction, "review_implementer_report_and_write_architect_review");
  assert.equal(packet.payload.data.expectedOutput.artifactId, `${projectId}/${phaseId}/architect_review/${workCardId}`);
  assert.equal(packet.payload.data.expectedOutput.artifactType, "architect_review");
});
