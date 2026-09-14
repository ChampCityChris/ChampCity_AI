const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  applyCurrentDisposition,
  applyOperatorValidationDecisionForCurrentWorkCard,
  beginWorkCardPlanning,
  createRepairForCurrentFailure,
  generateCloseReturnNextIntakeHandoff,
  generateCurrentHandoff,
  getCloseReturnSelectionProjection,
  getCurrentCloseProjection,
  getCurrentRepairWorkspaceProjection,
  getCurrentWorkspaceModel,
  getCurrentWorkCardMapProjection,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  generateWorkCardIntakeHandoff,
  selectNextWorkCardCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  setFormalWorkCardDisposition,
} = require("../../dist/main/workCardPlanning/workCardPlanningService.js");
const {
  getArchitectOutputWorkspaceModel,
  prepareArchitectOutputHandoff,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  __setPlanningDocumentServiceTestHooks,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  __setPlanningProjectionContextTestHooks,
  createPlanningProjectionContext,
} = require("../../dist/main/documents/planningProjectionContext.js");
const {
  getPhaseMapProjection,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  getPhasePlanningCompletion,
} = require("../../dist/main/phasePlanning/phasePlanningService.js");
const {
  resolveWorkCardLoopState,
} = require("../../dist/main/workCardLoop/workCardLoopStateService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  listPlanningDocuments,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function seedProjectThroughPhaseMap(root) {
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "demo");
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: {
      phases: [
        {
          phaseId: "phase-01",
          title: "Foundation",
          order: 1,
          purpose: "Create the first usable workflow.",
          dependsOn: [],
          sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
        },
        {
          phaseId: "phase-02",
          title: "Expansion",
          order: 2,
          purpose: "Extend the workflow.",
          dependsOn: ["phase-01"],
          sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
        },
      ],
    },
  });
}

test("current workflow reuses one Planning Projection Context across a deep projection", () => {
  const root = tempWorkspace("champcity-current-projection-context-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  let acquisitions = 0;
  let inventoryScans = 0;
  let contentReads = 0;
  let recordParses = 0;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions += 1; },
    onInventoryScan: () => { inventoryScans += 1; },
    onContentRead: () => { contentReads += 1; },
    onRecordParse: () => { recordParses += 1; },
  });

  try {
    const model = getCurrentWorkspaceModel(root);
    assert.equal(model.activeWorkspaceId, "phase-work-card-selection");
    assert.equal(acquisitions, 1);
    assert.equal(inventoryScans, 1);

    acquisitions = 0;
    inventoryScans = 0;
    contentReads = 0;
    recordParses = 0;
    const warmModel = getCurrentWorkspaceModel(root);
    assert.equal(warmModel.activeWorkspaceId, model.activeWorkspaceId);
    assert.equal(acquisitions, 1);
    assert.equal(inventoryScans, 1);
    assert.equal(contentReads, 0);
    assert.equal(recordParses, 0);
  } finally {
    __setPlanningDocumentServiceTestHooks();
  }
});

test("legacy root-scoped Current Workflow composition has a reproducible five-acquisition baseline", () => {
  const root = tempWorkspace("champcity-current-legacy-acquisition-baseline-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  let acquisitions = 0;
  let inventoryScans = 0;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions += 1; },
    onInventoryScan: () => { inventoryScans += 1; },
  });

  try {
    getArchitectOutputWorkspaceModel(root, "project-phase-map");
    resolveFirstNonApprovedDocument(root);
    getPhaseMapProjection(root);
    getPhasePlanningCompletion(root, "phase-01");
    resolveWorkCardLoopState(root, "phase-01");
    assert.equal(acquisitions, 5);
    assert.equal(inventoryScans, 5);
  } finally {
    __setPlanningDocumentServiceTestHooks();
  }
});

test("one current-workflow projection stays on one snapshot generation", () => {
  const root = tempWorkspace("champcity-current-generation-coherence-");
  seedProjectThroughPhaseMap(root);
  let injected = false;
  __setPlanningProjectionContextTestHooks({
    onContextCreated: () => {
      if (injected) return;
      injected = true;
      writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Pending", {
        workflowData: { phases: [] },
      });
    },
  });

  try {
    const stableProjection = getCurrentWorkspaceModel(root);
    assert.equal(stableProjection.activeWorkspaceId, "phase-interview");
  } finally {
    __setPlanningProjectionContextTestHooks();
  }

  const refreshedProjection = getCurrentWorkspaceModel(root);
  assert.equal(refreshedProjection.activeWorkspaceId, "project-phase-map");
});

test("Planning Projection Context rejects cross-workspace reuse", () => {
  const firstRoot = tempWorkspace("champcity-context-first-root-");
  const secondRoot = tempWorkspace("champcity-context-second-root-");
  const context = createPlanningProjectionContext(firstRoot);

  assert.throws(
    () => getArchitectOutputWorkspaceModel(secondRoot, "project-phase-map", context),
    /different workspace root/,
  );
});

test("standalone and caller-owned Phase Map reads remain equivalent", () => {
  const root = tempWorkspace("champcity-context-compatible-");
  seedProjectThroughPhaseMap(root);
  let acquisitions = 0;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions += 1; },
  });

  try {
    const standalone = getPhaseMapProjection(root);
    assert.equal(acquisitions, 1);
    acquisitions = 0;
    const context = createPlanningProjectionContext(root);
    const contextOwned = getPhaseMapProjection(root, context);
    assert.equal(acquisitions, 1);
    assert.deepEqual(contextOwned, standalone);
  } finally {
    __setPlanningDocumentServiceTestHooks();
  }
});

test("Architect Output project and Work Card domains reuse a caller-owned context", () => {
  const root = tempWorkspace("champcity-architect-output-context-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  let acquisitions = 0;
  __setPlanningDocumentServiceTestHooks({
    onSnapshotAcquisition: () => { acquisitions += 1; },
  });

  try {
    const context = createPlanningProjectionContext(root);
    assert.equal(acquisitions, 1, "context acquisition");
    const phase = getArchitectOutputWorkspaceModel(root, "phase-interview", context);
    assert.equal(acquisitions, 1, "phase Architect Output must reuse context");
    const workCard = getArchitectOutputWorkspaceModel(root, "work-card-planning", context);
    assert.equal(acquisitions, 1, "Work Card Architect Output must reuse context");
    assert.equal(phase.workspaceId, "phase-interview");
    assert.equal(workCard.workspaceId, "work-card-planning");
    assert.ok(phase.evidencePaths.length > 0);
    assert.ok(workCard.evidencePaths.length > 0);
  } finally {
    __setPlanningDocumentServiceTestHooks();
  }
});

test("current execution context clears phase and Work Card before Phase Map approval", () => {
  const root = tempWorkspace("champcity-execution-context-empty-");

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.executionContext.phase.state, "none");
  assert.equal(model.executionContext.workCard.state, "none");
  assert.match(model.executionContext.phase.reason, /No active phase/);
});

test("current execution context projects first incomplete phase metadata from Approved Phase Map", () => {
  const root = tempWorkspace("champcity-execution-context-phase-");
  seedProjectThroughPhaseMap(root);

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.activeWorkspaceId, "phase-interview");
  assert.deepEqual(model.executionContext.phase, {
    state: "active",
    phaseId: "phase-01",
    title: "Foundation",
    order: 1,
    totalPhaseCount: 2,
    purpose: "Create the first usable workflow.",
    dependsOn: [],
    loopStep: "Phase Intake",
    reason: "Current phase is the lowest-order dependency-eligible incomplete Approved Phase Map entry.",
  });
  assert.equal(model.executionContext.workCard.state, "none");
});

test("current execution context advances phase after closeout evidence", () => {
  const root = tempWorkspace("champcity-execution-context-phase-advance-");
  seedProjectThroughPhaseMap(root);
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md", "phase-closeout", "Approved", {
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.executionContext.phase.phaseId, "phase-02");
  assert.equal(model.executionContext.phase.title, "Expansion");
  assert.equal(model.executionContext.phase.order, 2);
  assert.deepEqual(model.executionContext.phase.dependsOn, ["phase-01"]);
});

test("current execution context projects Work Card intake, planning, build, validation, and completion states", () => {
  const root = tempWorkspace("champcity-execution-context-work-card-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");

  let model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "phase-work-card-selection");
  assert.equal(model.workCardIntake, undefined);
  assert.equal(model.executionContext.workCard.state, "none");
  const map = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(map.action, "currentWorkflow:getWorkCardMapProjection");
  assert.equal(map.payload.candidates[0].candidateId, "WC01");
  assert.equal(map.payload.candidates[0].status, "Eligible");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Work Card Map requires candidate-scoped Begin Planning/,
  );

  const handoff = beginWorkCardPlanning(root, "phase-01", "WC01");
  assert.equal(handoff.action, "currentWorkflow:beginWorkCardPlanning");
  assert.equal(handoff.payload.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md");
  const handoffDocument = listPlanningDocuments(root)
    .find((document) => document.markdownPath === handoff.payload.handoffMarkdownPath);
  assert.equal(handoffDocument.metadata.artifactType, "work-card-intake-handoff");
  assert.equal(handoffDocument.metadata.participationRole, "nonReviewHandoff");
  assert.equal(handoffDocument.effectiveDisposition, "Approved");
  assert.equal(
    handoffDocument.metadata.canonical.workflowData.formalWorkCardTarget,
    "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
  );
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-planning");
  assert.equal(model.workCardIntake, undefined);
  assert.equal(model.executionContext.workCard.loopStep, "Planning");

  promoteFormalWorkCard(root, "WC01");
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-planning");
  assert.equal(model.executionContext.workCard.dispositionOrState, "Pending");

  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-building-review");
  assert.equal(model.workCardBuildingReview.reportReadiness, "reserved-skeleton");
  assert.equal(model.executionContext.workCard.loopStep, "Implement");
  assert.throws(
    () => applyOperatorValidationDecisionForCurrentWorkCard(root, {
      decision: "ValidatePassed",
      operatorNotes: "Operator validation passed.",
    }),
    /Current workflow step must be Review & Validation/,
  );

  writeReadyImplementerReport(root, "phase-01", "WC01");
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-report-review");
  assert.equal(model.workCardBuildingReview.report.disposition, "Pending");
  assert.equal(model.workCardBuildingReview.reportReadiness, "ready-for-review");
  assert.equal(model.executionContext.workCard.loopStep, "Review & Validation");
  assert.throws(
    () => applyCurrentDisposition(root, "Approved"),
    /Implementer Report disposition is invalid from Review & Validation/,
  );
  const validation = applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed.",
  });
  assert.equal(validation.payload.status, "Approved");
  assert.equal(validation.development.currentModel.activeWorkspaceId, "work-card-close");
  assert.equal(validation.development.resolverResult.status, "current");
  assert.equal(validation.development.planningGeneration > 0, true);
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-close");
  assert.equal(model.executionContext.workCard.state, "active");
  assert.equal(model.executionContext.workCard.loopStep, "Close");
  const closeProjection = getCurrentCloseProjection(root);
  assert.equal(closeProjection.action, "currentWorkflow:getWorkCardCloseProjection");
  assert.equal(closeProjection.payload.closed, true);
  assert.equal(closeProjection.payload.returnTarget, "phase-work-card-selection");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Handoff action is invalid from the current workflow state: work-card-close/,
  );
  const candidateSelection = selectNextWorkCardCandidate(root, "phase-01");
  assert.equal(candidateSelection.state, "all-complete");
  assert.equal(candidateSelection.explanations[0].state, "complete");
  assert.match(candidateSelection.explanations[0].reason, /Approved validation evidence/);
  const directMap = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(directMap.payload.state, "ready");
  assert.equal(directMap.payload.phaseValidationWorkspaceId, "phase-validation");
  assert.equal(directMap.payload.candidates[0].status, "Eligible");
  assert.equal(directMap.payload.candidates[0].isActive, true);
  const completeMap = getCurrentWorkCardMapProjection(root, "phase-01", { closeReturnCompleted: true });
  assert.equal(completeMap.payload.state, "all-complete");
  assert.equal(completeMap.payload.phaseValidationWorkspaceId, "phase-validation");
  assert.equal(completeMap.payload.candidates[0].status, "Complete");
  assert.equal(completeMap.payload.candidates[0].isActive, false);
  const repeatedDefaultMap = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(repeatedDefaultMap.payload.state, "all-complete");
  assert.equal(
    listPlanningDocuments(root)
      .filter((document) => document.metadata.artifactType === "work-card-close-return-record")
      .length,
    1,
  );
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root, "WC01"),
    /Eligible Work Card candidate: WC01/,
  );
});

test("close-return selection can create next Work Card Intake handoff without making work-card-close generic", () => {
  const root = tempWorkspace("champcity-close-return-selected-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeTwoCandidatePhasePlanningBundle(root);
  generateWorkCardIntakeHandoff(root, "phase-01");
  promoteFormalWorkCard(root, "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(root, "phase-01", "WC01");
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed.",
  });

  let model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-close");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Handoff action is invalid from the current workflow state: work-card-close/,
  );

  const closeReturnSelection = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturnSelection.payload.state, "selection-required");
  assert.equal(closeReturnSelection.payload.closedWorkCardId, "WC01");
  assert.deepEqual(
    closeReturnSelection.payload.eligibleCandidates.map((candidate) => candidate.candidateId),
    ["WC02"],
  );
  assert.equal(closeReturnSelection.payload.closeReturnRecordReused, false);
  assert.equal(
    closeReturnSelection.payload.explanations.find((entry) => entry.candidateId === "WC01").state,
    "complete",
  );
  const closeReturnRecords = listPlanningDocuments(root)
    .filter((document) => document.metadata.artifactType === "work-card-close-return-record");
  assert.equal(closeReturnRecords.length, 1);
  assert.equal(closeReturnRecords[0].markdownPath, closeReturnSelection.payload.closeReturnRecordPath);
  assert.equal(closeReturnRecords[0].metadata.participationRole, "contextOnly");
  assert.equal(closeReturnRecords[0].metadata.canonical.workflowData.transition, "close-return-consumed");
  assert.equal(closeReturnRecords[0].metadata.canonical.workflowData.returnTarget, "phase-work-card-selection");
  assert.equal(
    listPlanningDocuments(root)
      .some((document) => document.metadata.workCardId === "WC02" && document.metadata.artifactType === "work-card-intake-handoff"),
    false,
  );

  const directMap = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(directMap.payload.state, "ready");
  assert.equal(directMap.payload.candidates.find((entry) => entry.candidateId === "WC01").status, "Complete");
  assert.equal(directMap.payload.candidates.find((entry) => entry.candidateId === "WC01").isActive, false);
  assert.equal(directMap.payload.candidates.find((entry) => entry.candidateId === "WC02").status, "Eligible");
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root, "UNKNOWN"),
    /does not exist in the current Work Card Plan: UNKNOWN/,
  );
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root, "WC01"),
    /Eligible Work Card candidate: WC01/,
  );

  const handoff = generateCloseReturnNextIntakeHandoff(root, "WC02");
  assert.equal(handoff.action, "currentWorkflow:generateCloseReturnNextIntakeHandoff");
  assert.equal(handoff.payload.candidateId, "WC02");
  assert.equal(
    handoff.payload.handoffMarkdownPath,
    "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md",
  );
  assert.equal(
    listPlanningDocuments(root)
      .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
      .some((document) => document.metadata.workCardId === "WC02" && document.effectiveDisposition === "Approved"),
    true,
  );
  const reused = generateCloseReturnNextIntakeHandoff(root, "WC02");
  assert.equal(reused.payload.reusedExisting, true);
  assert.equal(
    listPlanningDocuments(root)
      .filter((document) =>
        document.metadata.workCardId === "WC02" &&
        document.metadata.artifactType === "work-card-intake-handoff"
      ).length,
    1,
  );
  assert.equal(
    listPlanningDocuments(root)
      .some((document) => document.markdownPath.toLowerCase().includes("closeout")),
    false,
  );

  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-planning");
  assert.equal(model.currentWorkCardId, "WC02");
  assert.equal(model.executionContext.workCard.workCardId, "WC02");
  assert.equal(model.executionContext.workCard.loopStep, "Planning");
  assert.equal(model.workCardIntake, undefined);
  assert.match(model.sourceEvidence.join(";"), /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02\.md/);
  assert.throws(
    () => generateCurrentHandoff(root),
    /Handoff action is invalid from the current workflow state: work-card-planning/,
  );
});

test("current close return yields all-complete toward Phase Validation without a successor intake", () => {
  const root = tempWorkspace("champcity-close-return-all-complete-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  promoteFormalWorkCard(root, "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(root, "phase-01", "WC01");
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed.",
  });

  const result = getCloseReturnSelectionProjection(root);
  assert.equal(result.payload.state, "all-complete");
  assert.equal(result.payload.continuationTarget, "phase-validation");
  assert.equal(result.payload.candidates[0].status, "Complete");
  assert.equal(
    listPlanningDocuments(root)
      .filter((document) => document.metadata.artifactType === "work-card-close-return-record")
      .length,
    1,
  );
  assert.equal(
    listPlanningDocuments(root)
      .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
      .length,
    1,
  );
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "phase-work-card-selection");
});

test("close return exposes every eligible choice and revalidates the exact selected identity", () => {
  const root = tempWorkspace("champcity-close-return-multiple-choices-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeCloseReturnChoicePhasePlanningBundle(root);
  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  promoteFormalWorkCard(root, "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(root, "phase-01", "WC01");
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed.",
  });

  const projection = getCloseReturnSelectionProjection(root);
  assert.equal(projection.payload.state, "selection-required");
  assert.deepEqual(
    projection.payload.eligibleCandidates.map((candidate) => candidate.candidateId),
    ["WC02", "WC03"],
  );
  assert.equal(
    listPlanningDocuments(root)
      .some((document) => ["WC02", "WC03"].includes(document.metadata.workCardId) &&
        document.metadata.artifactType === "work-card-intake-handoff"),
    false,
  );
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root, "WC04"),
    /Eligible Work Card candidate: WC04/,
  );
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root, "WC05"),
    /Eligible Work Card candidate: WC05/,
  );

  const selected = generateCloseReturnNextIntakeHandoff(root, "WC03");
  assert.equal(selected.payload.candidateId, "WC03");
  assert.equal(selected.payload.reusedExisting, false);
  assert.equal(getCurrentWorkspaceModel(root).currentWorkCardId, "WC03");
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root, "WC02"),
    /Cannot begin WC02 because WC03 is the active Work Card/,
  );
});

test("default post-close refresh keeps two prior Work Cards historical and exposes successors", () => {
  const root = tempWorkspace("champcity-close-return-two-prior-complete-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeCloseReturnChoicePhasePlanningBundle(root);

  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  promoteFormalWorkCard(root, "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(root, "phase-01", "WC01");
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "WC01 validation passed.",
  });

  const firstCloseReturn = getCloseReturnSelectionProjection(root);
  assert.equal(firstCloseReturn.payload.state, "selection-required");
  generateCloseReturnNextIntakeHandoff(root, "WC02");
  promoteFormalWorkCard(root, "WC02");
  setFormalWorkCardDisposition(root, "phase-01", "WC02", "Approved");
  writeReadyImplementerReport(root, "phase-01", "WC02", "Pending", "second_work_card");
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "WC02 validation passed.",
  });

  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "work-card-close");
  const secondCloseReturn = getCloseReturnSelectionProjection(root);
  assert.equal(secondCloseReturn.payload.state, "selection-required");
  const defaultMap = getCurrentWorkCardMapProjection(root, "phase-01");
  for (const completedId of ["WC01", "WC02"]) {
    const candidate = defaultMap.payload.candidates.find((entry) => entry.candidateId === completedId);
    assert.equal(candidate.status, "Complete");
    assert.equal(candidate.isActive, false);
  }
  assert.equal(defaultMap.payload.candidates.find((entry) => entry.candidateId === "WC03").status, "Eligible");
  assert.doesNotMatch(defaultMap.payload.reason, /Multiple active incomplete Work Cards/);
  assert.equal(
    listPlanningDocuments(root).filter((document) =>
      document.metadata.artifactType === "work-card-intake-handoff" &&
      document.effectiveDisposition === "Approved" &&
      ["WC01", "WC02"].includes(document.metadata.workCardId)
    ).length,
    2,
  );
});

test("candidate-scoped Begin Planning keeps a later simultaneously eligible candidate active", () => {
  const root = tempWorkspace("champcity-explicit-later-candidate-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeSimultaneouslyEligiblePhasePlanningBundle(root);

  const map = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(map.payload.state, "ready");
  assert.equal(map.payload.candidates.find((entry) => entry.candidateId === "WC01").status, "Eligible");
  assert.equal(map.payload.candidates.find((entry) => entry.candidateId === "WC02").status, "Eligible");

  const handoff = beginWorkCardPlanning(root, "phase-01", "WC02");
  assert.equal(handoff.payload.candidateId, "WC02");
  assert.equal(
    handoff.payload.handoffMarkdownPath,
    "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md",
  );

  const model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-planning");
  assert.equal(model.currentWorkCardId, "WC02");
  assert.equal(model.executionContext.workCard.workCardId, "WC02");
  assert.match(model.sourceEvidence.join(";"), /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02\.md/);
  assert.doesNotMatch(model.sourceEvidence.join(";"), /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01\.md/);

  const lockedMap = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(lockedMap.payload.candidates.find((entry) => entry.candidateId === "WC02").isActive, true);
  assert.equal(lockedMap.payload.candidates.find((entry) => entry.candidateId === "WC02").status, "Eligible");
  assert.equal(lockedMap.payload.candidates.find((entry) => entry.candidateId === "WC01").status, "Ineligible");
  assert.throws(
    () => beginWorkCardPlanning(root, "phase-01", "WC01"),
    /Cannot begin WC01 because WC02 is the active Work Card/,
  );

  const planningModel = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(
    planningModel.handoff.path,
    "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md",
  );
  assert.equal(
    planningModel.documentSlots.find((slot) => slot.slotId === "formal-work-card").targetPath,
    "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
  );

  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
    bodyMarkdown: formalWorkCardBody("WC02"),
  });
  const continued = beginWorkCardPlanning(root, "phase-01", "WC02");
  assert.equal(continued.payload.reusedExisting, true);
  assert.equal(continued.payload.currentWorkspace.activeWorkspaceId, "work-card-building-review");
  assert.equal(continued.payload.currentWorkspace.currentWorkCardId, "WC02");
  assert.equal(continued.payload.currentWorkspace.workCardBuildingReview.reportMissing, true);
});

test("current workflow routes WC02 approved Formal Work Card to Implement despite stale WC01 close evidence", () => {
  const root = tempWorkspace("champcity-current-workflow-stale-close-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeTwoCandidatePhasePlanningBundle(root);
  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    bodyMarkdown: formalWorkCardBody("WC01"),
  });
  writeReadyImplementerReport(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", revision: 1 },
    ],
  });

  beginWorkCardPlanning(root, "phase-01", "WC02", { closeReturnCompleted: true });
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
    bodyMarkdown: formalWorkCardBody("WC02"),
  });

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.activeWorkspaceId, "work-card-building-review");
  assert.equal(model.currentWorkCardId, "WC02");
  assert.equal(model.executionContext.workCard.workCardId, "WC02");
  assert.equal(model.executionContext.workCard.loopStep, "Implement");
  assert.match(model.expectedOutput, /IMPLEMENTER_REPORT_WC02_second_work_card\.md/);
  assert.doesNotMatch(model.sourceEvidence.join(";"), /VALIDATION_RECORD_WC01/);
});

test("multiple active Work Cards surface a Work Card Map conflict", () => {
  const root = tempWorkspace("champcity-active-work-card-conflict-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeSimultaneouslyEligiblePhasePlanningBundle(root);
  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md", "work-card-intake-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { phaseId: "phase-01", workCardId: "WC02" },
    workflowData: {
      candidate: {
        candidateId: "WC02",
        order: 2,
        title: "Second Work Card",
        purpose: "Implement the second unit.",
        dependsOn: [],
        resolutionStatus: "planned",
        resolutionReason: "",
        evidencePaths: [],
        phaseId: "phase-01",
      },
      formalWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
    },
  });

  const map = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(map.payload.state, "needs-attention");
  assert.match(map.payload.reason, /Multiple active incomplete Work Cards exist in this phase: WC01, WC02/);
  assert.equal(
    map.payload.candidates.every((candidate) => ["Complete", "Eligible", "Ineligible"].includes(candidate.status)),
    true,
  );

  const model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "phase-work-card-selection");
  assert.equal(model.blocker, map.payload.reason);
  assert.throws(
    () => beginWorkCardPlanning(root, "phase-01", "WC01"),
    /Multiple active incomplete Work Cards/,
  );
});

test("close-return selection blocks without Approved close evidence and preserves repair routing", () => {
  const missingCloseRoot = tempWorkspace("champcity-close-return-missing-");
  seedProjectThroughPhaseMap(missingCloseRoot);
  seedApprovedPhaseInterview(missingCloseRoot, "phase-01");
  seedApprovedPhasePlanningBundle(missingCloseRoot, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(missingCloseRoot, "phase-01");
  promoteFormalWorkCard(missingCloseRoot, "WC01");
  setFormalWorkCardDisposition(missingCloseRoot, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(missingCloseRoot, "phase-01", "WC01");

  assert.equal(getCurrentWorkspaceModel(missingCloseRoot).activeWorkspaceId, "work-card-report-review");
  assert.throws(
    () => getCloseReturnSelectionProjection(missingCloseRoot),
    /Close-return selection requires current Work Card close state/,
  );

  const repairRoot = tempWorkspace("champcity-close-return-repair-");
  seedProjectThroughPhaseMap(repairRoot);
  seedApprovedPhaseInterview(repairRoot, "phase-01");
  seedApprovedPhasePlanningBundle(repairRoot, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(repairRoot, "phase-01");
  promoteFormalWorkCard(repairRoot, "WC01");
  setFormalWorkCardDisposition(repairRoot, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(repairRoot, "phase-01", "WC01");
  const repairDecision = applyOperatorValidationDecisionForCurrentWorkCard(repairRoot, {
    decision: "RequestRepair",
    operatorNotes: "Repair required.",
    repairDefectText: "Bounded repair is required.",
  });
  assert.equal(repairDecision.development.currentModel.activeWorkspaceId, "work-card-repair");
  assert.equal(repairDecision.development.resolverResult.status, "current");

  const repairModel = getCurrentWorkspaceModel(repairRoot);
  assert.equal(repairModel.activeWorkspaceId, "work-card-repair");
  assert.throws(
    () => getCloseReturnSelectionProjection(repairRoot),
    /Close-return selection requires current Work Card close state; current workspace is work-card-repair/,
  );
});

test("current workflow Implement recovery creates missing report through generate handoff route", () => {
  const root = tempWorkspace("champcity-execution-context-report-recovery-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    bodyMarkdown: formalWorkCardBody("WC01"),
  });

  let model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-building-review");
  assert.equal(model.workCardBuildingReview.reportMissing, true);
  assert.equal(
    model.workCardBuildingReview.implementerReportPath,
    "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md",
  );

  const created = generateCurrentHandoff(root);
  assert.equal(created.action, "currentWorkflow:generateHandoff");
  assert.equal(created.payload.markdownPath, model.workCardBuildingReview.implementerReportPath);

  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-building-review");
  assert.equal(model.workCardBuildingReview.reportMissing, false);
  assert.equal(model.workCardBuildingReview.report.disposition, "Pending");
  assert.equal(model.workCardBuildingReview.reportReadiness, "reserved-skeleton");
  assert.equal(model.executionContext.workCard.loopStep, "Implement");
  assert.throws(
    () => applyOperatorValidationDecisionForCurrentWorkCard(root, {
      decision: "ValidatePassed",
      operatorNotes: "Operator validation passed.",
    }),
    /Current workflow step must be Review & Validation/,
  );

  writeReadyImplementerReport(root, "phase-01", "WC01");
  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-report-review");
  assert.equal(model.workCardBuildingReview.reportReadiness, "ready-for-review");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Handoff action is invalid from the current workflow state/,
  );
});

test("ineligible Work Card selection exposes no Planning handoff action and writes no handoff", () => {
  const root = tempWorkspace("champcity-execution-context-work-card-blocked-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeBlockedPhasePlanningBundle(root);

  const model = getCurrentWorkspaceModel(root);
  assert.notEqual(model.activeWorkspaceId, "work-card-planning");
  assert.notEqual(model.activeWorkspaceId, "phase-work-card-selection");
  assert.equal(model.workCardIntake, undefined);
  assert.throws(
    () => generateCurrentHandoff(root),
    /Handoff action is invalid from the current workflow state/,
  );
  assert.equal(
    listPlanningDocuments(root)
      .some((document) => document.metadata.artifactType === "work-card-intake-handoff"),
    false,
  );
  assert.equal(
    require("node:fs").existsSync(path.join(root, "planning", "runtime", "architect-drafts")),
    false,
  );
});

test("current execution context shows repair ID without replacing parent Work Card", () => {
  const root = tempWorkspace("champcity-execution-context-repair-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  promoteFormalWorkCard(root, "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  const reportPath = writeReadyImplementerReport(root, "phase-01", "WC01", "Approved");
  writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Fix current execution context repair identity.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_fix.md",
    },
  });

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.activeWorkspaceId, "work-card-repair");
  assert.equal(model.executionContext.workCard.workCardId, "WC01");
  assert.equal(model.executionContext.workCard.title, "First Work Card");
  assert.equal(model.executionContext.workCard.repairId, "WC01-REPAIR01");
  assert.equal(model.executionContext.workCard.parentWorkCardId, "WC01");
  assert.equal(model.executionContext.workCard.loopStep, "Repair");
});

test("current execution context keeps parent identity and Repair genealogy through repaired Close", () => {
  const root = tempWorkspace("champcity-execution-context-repaired-close-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  promoteFormalWorkCard(root, "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  writeReadyImplementerReport(root, "phase-01", "WC01");
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "RequestRepair",
    operatorNotes: "A bounded repair is required.",
    repairDefectText: "Correct repaired Close record.",
  });

  const created = createRepairForCurrentFailure(root);
  const handoff = listPlanningDocuments(root).find((document) =>
    document.markdownPath === created.payload.handoffMarkdownPath
  );
  const validationSource = handoff.metadata.sourceRevisions[0];
  writeDoc(root, created.payload.repairMarkdownPath, "repair-work-card", "Approved", {
    identity: {
      phaseId: "phase-01",
      workCardId: created.payload.repairId,
      repairId: created.payload.repairId,
      parentWorkCardId: "WC01",
    },
    sourceRevisions: [
      validationSource,
      { path: created.payload.handoffMarkdownPath, revision: 1 },
    ],
    workflowData: {
      repairId: created.payload.repairId,
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "postValidationRecord",
      evidencePath: validationSource.path,
      boundedDefect: "Correct repaired Close record.",
      returnTarget: "work-card-validation",
    },
  });
  writeReadyRepairImplementerReport(root, "phase-01", "WC01", created.payload.repairId);

  let model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-report-review");
  assert.equal(model.currentWorkCardId, created.payload.repairId);
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Repair validation passed.",
  });

  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-close");
  assert.equal(model.currentWorkCardId, "WC01");
  assert.equal(model.executionContext.workCard.workCardId, "WC01");
  assert.equal(model.executionContext.workCard.repairId, created.payload.repairId);
  assert.equal(model.executionContext.workCard.parentWorkCardId, "WC01");
  assert.equal(model.executionContext.workCard.loopStep, "Close");
  assert.ok(model.sourceEvidence.includes(created.payload.repairMarkdownPath));

  const closeReturn = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturn.payload.state, "all-complete");
  const closeRecord = listPlanningDocuments(root)
    .find((document) => document.markdownPath === closeReturn.payload.closeReturnRecordPath);
  assert.equal(closeRecord.metadata.canonical.identity.workCardId, "WC01");
  assert.equal(closeRecord.metadata.canonical.identity.executionWorkCardId, created.payload.repairId);
  assert.equal(closeRecord.metadata.canonical.identity.executionKind, "repair");
  assert.equal(closeRecord.metadata.canonical.identity.repairId, created.payload.repairId);
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "phase-work-card-selection");
});

test("current repair action derives defect from RevisionRequested validation record", () => {
  const root = tempWorkspace("champcity-current-repair-derived-defect-");
  seedMvpValidationRepairRecord(root, {
    repairDefectText: "Repair the workspace Architect handoff flow.",
  });

  const before = getCurrentRepairWorkspaceProjection(root).payload;
  assert.equal(before.phaseId, "MVP-01");
  assert.equal(before.parentWorkCardId, "WC02");
  assert.equal(before.repairDefectText, "Repair the workspace Architect handoff flow.");
  assert.throws(
    () => getCloseReturnSelectionProjection(root),
    /Close-return selection requires current Work Card close state/,
  );
  assert.equal(before.state, "handoff-needed");

  const created = createRepairForCurrentFailure(root);
  assert.equal(created.action, "currentWorkflow:createRepair");
  assert.equal(created.payload.repairId, "WC02-REPAIR01");
  assert.equal(
    created.payload.handoffMarkdownPath,
    "planning/phases/MVP-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC02-REPAIR01.md",
  );

  const reused = createRepairForCurrentFailure(root);
  assert.deepEqual(reused.payload, created.payload);
  const after = getCurrentRepairWorkspaceProjection(root).payload;
  assert.equal(after.state, "handoff-ready");
  assert.equal(after.repairWorkCardTarget, created.payload.repairMarkdownPath);
});

test("current repair action blocks when validation record lacks repair defect text", () => {
  const root = tempWorkspace("champcity-current-repair-missing-defect-");
  seedMvpValidationRepairRecord(root);

  const projection = getCurrentRepairWorkspaceProjection(root).payload;
  assert.equal(projection.state, "handoff-needed");
  assert.equal(projection.phaseId, "MVP-01");
  assert.throws(
    () => createRepairForCurrentFailure(root),
    /RevisionRequested validation record is missing repairDefectText/,
  );
});

function seedMvpValidationRepairRecord(root, workflowData = {}) {
  const formalPath = writeDoc(root, "planning/phases/MVP-01/Work_Cards/WC02_first.md", "formal-work-card", "Approved", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
  });
  const reportPath = writeDoc(root, "planning/phases/MVP-01/Implementer_Reports/IMPLEMENTER_REPORT_WC02_first.md", "implementer-report", "Approved", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    sourceRevisions: [{ path: formalPath, revision: 1 }],
  });
  return writeDoc(root, "planning/phases/MVP-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "RevisionRequested", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    sourceRevisions: [
      { path: formalPath, revision: 1 },
      { path: reportPath, revision: 1 },
    ],
    workflowData: {
      operatorValidationNotes: "Operator validation notes.",
      advisorySummary: "Advisory summary.",
      formalWorkCardPath: formalPath,
      implementerReportPath: reportPath,
      implementerReportRevision: 1,
      ...workflowData,
    },
  });
}

function promoteFormalWorkCard(root, workCardId) {
  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  const draftPath = prepared.submission.draftSlots[0].draftRelativePath;
  const path = require("node:path");
  const fs = require("node:fs");
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), formalWorkCardBody(workCardId), "utf8");
  getArchitectOutputWorkspaceModel(root, "work-card-planning");
}

function writeBlockedPhasePlanningBundle(root) {
  const phaseId = "phase-01";
  const candidate = {
    candidateId: "WC02",
    order: 1,
    title: "Blocked Work Card",
    purpose: "Wait for a missing predecessor.",
    dependsOn: ["WC01"],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
  };
  writeDoc(root, `planning/phases/${phaseId}/Phase_Planning.md`, "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
  });
  writeDoc(root, `planning/phases/${phaseId}/Work_Card_Plan.md`, "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    workflowData: { candidates: [candidate] },
    bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify([candidate], null, 2)}\n\`\`\`\n`,
  });
}

function writeSimultaneouslyEligiblePhasePlanningBundle(root) {
  const phaseId = "phase-01";
  const documents = listPlanningDocuments(root);
  const sourceRevisions = [
    "planning/project/PROJECT_PROFILE.md",
    "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    "planning/project/Phase_Map/PHASE_MAP_demo.md",
    `planning/phases/${phaseId}/Phase_Interview.md`,
  ].map((markdownPath) => {
    const document = documents.find((candidate) => candidate.markdownPath === markdownPath);
    return document
      ? { path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }
      : null;
  }).filter(Boolean);
  const candidates = [
    {
      candidateId: "WC01",
      order: 1,
      title: "First Work Card",
      purpose: "Implement the first unit.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC02",
      order: 2,
      title: "Second Work Card",
      purpose: "Implement the second unit.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
  ];
  writeDoc(root, `planning/phases/${phaseId}/Phase_Planning.md`, "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
  });
  writeDoc(root, `planning/phases/${phaseId}/Work_Card_Plan.md`, "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
    workflowData: { candidates },
    bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify(candidates, null, 2)}\n\`\`\`\n`,
  });
}

function writeTwoCandidatePhasePlanningBundle(root) {
  const phaseId = "phase-01";
  const documents = listPlanningDocuments(root);
  const sourceRevisions = [
    "planning/project/PROJECT_PROFILE.md",
    "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    "planning/project/Phase_Map/PHASE_MAP_demo.md",
    `planning/phases/${phaseId}/Phase_Interview.md`,
  ].map((markdownPath) => {
    const document = documents.find((candidate) => candidate.markdownPath === markdownPath);
    return document
      ? { path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }
      : null;
  }).filter(Boolean);
  const candidates = [
    {
      candidateId: "WC01",
      order: 1,
      title: "First Work Card",
      purpose: "Implement the first unit.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC02",
      order: 2,
      title: "Second Work Card",
      purpose: "Implement the second unit.",
      dependsOn: ["WC01"],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
  ];
  writeDoc(root, `planning/phases/${phaseId}/Phase_Planning.md`, "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
  });
  writeDoc(root, `planning/phases/${phaseId}/Work_Card_Plan.md`, "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
    workflowData: { candidates },
    bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify(candidates, null, 2)}\n\`\`\`\n`,
  });
}

function writeCloseReturnChoicePhasePlanningBundle(root) {
  const phaseId = "phase-01";
  const documents = listPlanningDocuments(root);
  const sourceRevisions = [
    "planning/project/PROJECT_PROFILE.md",
    "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    "planning/project/Phase_Map/PHASE_MAP_demo.md",
    `planning/phases/${phaseId}/Phase_Interview.md`,
  ].map((markdownPath) => {
    const document = documents.find((candidate) => candidate.markdownPath === markdownPath);
    return document
      ? { path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }
      : null;
  }).filter(Boolean);
  const candidates = [
    {
      candidateId: "WC01",
      order: 1,
      title: "First Work Card",
      purpose: "Implement the first unit.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC02",
      order: 2,
      title: "Second Work Card",
      purpose: "Implement the second selectable unit.",
      dependsOn: ["WC01"],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC03",
      order: 3,
      title: "Third Work Card",
      purpose: "Implement the alternate selectable unit.",
      dependsOn: ["WC01"],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC04",
      order: 4,
      title: "Blocked Work Card",
      purpose: "Remain blocked until WC02 completes.",
      dependsOn: ["WC02"],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC05",
      order: 5,
      title: "Deferred Work Card",
      purpose: "Remain explicitly deferred.",
      dependsOn: [],
      resolutionStatus: "deferred",
      resolutionReason: "Deferred by the Approved Work Card Plan.",
      evidencePaths: ["planning/project/PROJECT_PROFILE.md"],
    },
  ];
  writeDoc(root, `planning/phases/${phaseId}/Phase_Planning.md`, "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
  });
  writeDoc(root, `planning/phases/${phaseId}/Work_Card_Plan.md`, "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
    workflowData: { candidates },
    bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify(candidates, null, 2)}\n\`\`\`\n`,
  });
}

function formalWorkCardBody(workCardId) {
  return [
    `# ${workCardId} - First Work Card`,
    "",
    "## Verified Repository Evidence",
    "Evidence.",
    "## Objective",
    "Objective.",
    "## Runtime Sequence",
    "Sequence.",
    "## Required Changes",
    "Changes.",
    "## Preserved Behavior",
    "Behavior.",
    "## In-Scope Surface",
    "Surface.",
    "## Risks and Constraints",
    "Risks.",
    "## Acceptance Criteria",
    "Criteria.",
    "## Negative Constraints",
    "Constraints.",
    "## Implementer Report Requirements",
    "Report.",
    "## Manual Validation",
    "Manual.",
    "",
  ].join("\n");
}

function writeReadyImplementerReport(root, phaseId, workCardId, status = "Pending", slug = "first_work_card") {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_${slug}.md`, "implementer-report", status, {
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_${slug}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/currentWorkflow/currentWorkflowService.ts"],
      implementationSummary: "Implemented a substantive readiness gate for the current workflow.",
      validationResults: ["current execution context test passed"],
      acceptanceEvidence: ["ready report routes to Review & Validation"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented a substantive readiness gate for the current workflow.",
      "## Validation Performed",
      "current execution context test passed",
      "",
    ].join("\n"),
  });
}

function writeReadyRepairImplementerReport(root, phaseId, parentWorkCardId, repairId) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`, "implementer-report", "Pending", {
    identity: { phaseId, workCardId: repairId, repairId, parentWorkCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${repairId}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/currentWorkflow/currentWorkflowService.ts"],
      implementationSummary: "Implemented repaired Close identity projection.",
      validationResults: ["current execution context repaired Close test passed"],
      acceptanceEvidence: ["parent identity retains Repair genealogy through Close"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented repaired Close identity projection.",
      "## Validation Performed",
      "current execution context repaired Close test passed",
      "",
    ].join("\n"),
  });
}
