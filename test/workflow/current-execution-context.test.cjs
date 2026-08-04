const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  applyCurrentDisposition,
  applyOperatorValidationDecisionForCurrentWorkCard,
  generateCloseReturnNextIntakeHandoff,
  generateCurrentHandoff,
  getCloseReturnSelectionProjection,
  getCurrentCloseProjection,
  getCurrentWorkspaceModel,
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
    reason: "Current phase is the first incomplete Approved Phase Map entry.",
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
  assert.equal(model.activeWorkspaceId, "work-card-planning");
  assert.equal(model.workCardIntake.phaseId, "phase-01");
  assert.equal(model.workCardIntake.sourceWorkCardPlanPath, "planning/phases/phase-01/Work_Card_Plan.md");
  assert.equal(model.workCardIntake.candidate.candidateId, "WC01");
  assert.equal(model.workCardIntake.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md");
  assert.equal(model.workCardIntake.formalWorkCardMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(model.executionContext.workCard.workCardId, "WC01");
  assert.equal(model.executionContext.workCard.title, "First Work Card");
  assert.equal(model.executionContext.workCard.loopStep, "Planning");

  const handoff = generateCurrentHandoff(root);
  assert.equal(handoff.action, "currentWorkflow:generateHandoff");
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
  assert.equal(model.activeWorkspaceId, "work-card-report-review");
  assert.equal(model.workCardBuildingReview.report.disposition, "Pending");
  assert.equal(model.executionContext.workCard.loopStep, "Review & Validation");
  assert.throws(
    () => applyCurrentDisposition(root, "Approved"),
    /Review & Validation does not authorize Implementer Report disposition/,
  );
  const validation = applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed.",
  });
  assert.equal(validation.payload.status, "Approved");
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
    /Current workflow step does not authorize a handoff action: work-card-close/,
  );
  const candidateSelection = selectNextWorkCardCandidate(root, "phase-01");
  assert.equal(candidateSelection.state, "all-complete");
  assert.equal(candidateSelection.explanations[0].state, "complete");
  assert.match(candidateSelection.explanations[0].reason, /Approved validation evidence/);
  const closeReturnSelection = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturnSelection.action, "currentWorkflow:getCloseReturnSelectionProjection");
  assert.equal(closeReturnSelection.payload.state, "all-complete");
  assert.equal(closeReturnSelection.payload.closedWorkCardId, "WC01");
  assert.equal(closeReturnSelection.payload.close.closed, true);
  assert.throws(
    () => generateCloseReturnNextIntakeHandoff(root),
    /No eligible Work Card candidate is available after close return: all-complete/,
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
  applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed.",
  });

  let model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-close");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Current workflow step does not authorize a handoff action: work-card-close/,
  );

  const closeReturnSelection = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturnSelection.payload.state, "selected");
  assert.equal(closeReturnSelection.payload.closedWorkCardId, "WC01");
  assert.equal(closeReturnSelection.payload.workCardIntake.candidate.candidateId, "WC02");
  assert.equal(
    closeReturnSelection.payload.explanations.find((entry) => entry.candidateId === "WC01").state,
    "complete",
  );

  const handoff = generateCloseReturnNextIntakeHandoff(root);
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
  assert.equal(
    listPlanningDocuments(root)
      .some((document) => document.markdownPath.toLowerCase().includes("closeout")),
    false,
  );

  model = getCurrentWorkspaceModel(root);
  assert.equal(model.activeWorkspaceId, "work-card-close");
  assert.equal(model.currentWorkCardId, "WC01");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Current workflow step does not authorize a handoff action: work-card-close/,
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

  assert.equal(getCurrentWorkspaceModel(missingCloseRoot).activeWorkspaceId, "work-card-report-review");
  assert.throws(
    () => getCloseReturnSelectionProjection(missingCloseRoot),
    /Close-return selection requires current Work Card Close authority/,
  );

  const repairRoot = tempWorkspace("champcity-close-return-repair-");
  seedProjectThroughPhaseMap(repairRoot);
  seedApprovedPhaseInterview(repairRoot, "phase-01");
  seedApprovedPhasePlanningBundle(repairRoot, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(repairRoot, "phase-01");
  promoteFormalWorkCard(repairRoot, "WC01");
  setFormalWorkCardDisposition(repairRoot, "phase-01", "WC01", "Approved");
  applyOperatorValidationDecisionForCurrentWorkCard(repairRoot, {
    decision: "RequestRepair",
    operatorNotes: "Repair required.",
    repairDefectText: "Bounded repair is required.",
  });

  const repairModel = getCurrentWorkspaceModel(repairRoot);
  assert.equal(repairModel.activeWorkspaceId, "work-card-repair");
  assert.throws(
    () => getCloseReturnSelectionProjection(repairRoot),
    /Close-return selection requires current Work Card Close authority; current workspace is work-card-repair/,
  );
});

test("current workflow Build Review recovery creates missing report through generate handoff route", () => {
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
  assert.equal(model.activeWorkspaceId, "work-card-report-review");
  assert.equal(model.workCardBuildingReview.reportMissing, false);
  assert.equal(model.workCardBuildingReview.report.disposition, "Pending");
  assert.equal(model.executionContext.workCard.loopStep, "Review & Validation");
  assert.throws(
    () => generateCurrentHandoff(root),
    /Current workflow step does not authorize a handoff action/,
  );
});

test("ineligible Work Card selection exposes no Planning handoff action and writes no handoff", () => {
  const root = tempWorkspace("champcity-execution-context-work-card-blocked-");
  seedProjectThroughPhaseMap(root);
  seedApprovedPhaseInterview(root, "phase-01");
  writeBlockedPhasePlanningBundle(root);

  const model = getCurrentWorkspaceModel(root);
  assert.notEqual(model.activeWorkspaceId, "work-card-planning");
  assert.equal(model.workCardIntake, undefined);
  assert.throws(
    () => generateCurrentHandoff(root),
    /Current workflow step does not authorize a handoff action/,
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
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
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
    "## Authorized Surface",
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
