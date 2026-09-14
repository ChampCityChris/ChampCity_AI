const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveWorkCardLoopState,
} = require("../../dist/main/workCardLoop/workCardLoopStateService.js");
const {
  resolveEffectiveWorkCardCompletion,
} = require("../../dist/main/workCardLoop/effectiveWorkCardCompletion.js");
const {
  consumeWorkCardCloseReturn,
} = require("../../dist/main/workCardLoop/workCardCloseReturnLifecycle.js");
const {
  beginWorkCardPlanningForCandidate,
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  applyOperatorValidationDecision,
  getWorkCardCloseProjection,
} = require("../../dist/main/workCardValidation/workCardValidationService.js");
const {
  createRepairWorkCard,
  resolveTerminalApprovedRepairImplementationContext,
} = require("../../dist/main/workCardRepair/workCardRepairService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
  listPlanningDocuments,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Work Card loop state resolves map-ready, planning, build, review, close, all-complete, and conflict", () => {
  const root = tempWorkspace("champcity-work-card-loop-state-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);

  let loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "map-ready");
  assert.equal(loopState.workspaceId, "phase-work-card-selection");
  assert.equal(loopState.loopStep, "Map");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Eligible");

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-planning");
  assert.equal(loopState.workCardId, "WC01");
  assert.equal(loopState.loopStep, "Planning");

  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-building-review");
  assert.equal(loopState.loopStep, "Build");
  assert.equal(loopState.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md");

  writeReadyImplementerReport(root, "phase-01", "WC01", "Pending");
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-report-review");
  assert.equal(loopState.loopStep, "ReviewAndValidation");

  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    reviewedAt: "2026-08-30T12:00:00.000Z",
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", revision: 1 },
    ],
  });
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-close");
  assert.equal(loopState.loopStep, "Close");
  assert.equal(
    resolveWorkCardLoopState(root, "phase-01", { closeReturnCompleted: true }).workspaceId,
    "work-card-close",
  );

  const wc01Completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  const wc01Consumption = consumeWorkCardCloseReturn(root, wc01Completion);
  assert.equal(wc01Consumption.reusedExisting, false);
  assert.equal(consumeWorkCardCloseReturn(root, wc01Completion).reusedExisting, true);
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "map-ready");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Eligible");

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC02", "Pending", "second_work_card");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
    reviewedAt: "2026-08-30T13:00:00.000Z",
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC02_second_work_card.md", revision: 1 },
    ],
  });
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-close");
  assert.equal(loopState.workCardId, "WC02");
  assert.doesNotMatch(loopState.reason, /Multiple active incomplete Work Cards/);

  const wc02Completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC02");
  consumeWorkCardCloseReturn(root, wc02Completion);
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "all-complete");
  assert.equal(loopState.workspaceId, "phase-work-card-selection");

  const conflictRoot = tempWorkspace("champcity-work-card-loop-conflict-");
  seedApprovedProjectPlanning(conflictRoot);
  seedPhaseMap(conflictRoot, "phase-01");
  seedApprovedPhaseInterview(conflictRoot, "phase-01");
  seedSimultaneouslyEligiblePhasePlanningBundle(conflictRoot);
  generateWorkCardIntakeHandoff(conflictRoot, "phase-01", "WC01");
  writeDoc(conflictRoot, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md", "work-card-intake-handoff", "Approved", {
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
  loopState = resolveWorkCardLoopState(conflictRoot, "phase-01");
  assert.equal(loopState.status, "conflict");
  assert.equal(loopState.workspaceId, "phase-work-card-selection");
  assert.match(loopState.blocker, /Multiple active incomplete Work Cards/);
});

test("Work Card loop state resolves active repair with parent identity", () => {
  const root = tempWorkspace("champcity-work-card-loop-repair-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
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
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_repair_test_defect.md",
    },
  });

  const loopState = resolveWorkCardLoopState(root, "phase-01");

  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-repair");
  assert.equal(loopState.workCardId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.loopStep, "Repair");
});

test("multiple completed handoffs fail closed when final Validation Record ordering evidence is ambiguous", () => {
  const root = tempWorkspace("champcity-work-card-loop-ambiguous-completion-order-");
  seedSequentialCompletedWorkCards(root);

  const loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "conflict");
  assert.equal(loopState.workspaceId, "phase-work-card-selection");
  assert.match(loopState.reason, /unique latest completed Work Card cannot be established/);
  assert.doesNotMatch(loopState.reason, /Multiple active incomplete Work Cards/);
});

test("stale close-return consumption does not suppress later exact completion for the same parent", () => {
  const root = tempWorkspace("champcity-work-card-loop-stale-close-return-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeReadyImplementerReport(root, "phase-01", "WC01");
  const validation01 = writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    reviewedAt: "2026-08-30T12:00:00.000Z",
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: reportPath, revision: 1 },
    ],
  });

  const firstCompletion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  const firstConsumption = consumeWorkCardCloseReturn(root, firstCompletion);
  assert.equal(firstConsumption.artifactRevision, 1);
  assert.equal(resolveWorkCardLoopState(root, "phase-01").status, "all-complete");

  writeReadyImplementerReport(root, "phase-01", "WC01", "Pending", "first_work_card", 2);
  const validation02 = writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT02.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    reviewedAt: "2026-08-30T13:00:00.000Z",
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: reportPath, revision: 2 },
    ],
  });

  const loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-close");
  assert.equal(loopState.workCardId, "WC01");
  assert.ok(loopState.sourceEvidence.includes(validation02));
  assert.equal(loopState.sourceEvidence.includes(validation01), false);

  const secondCompletion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  const secondConsumption = consumeWorkCardCloseReturn(root, secondCompletion);
  assert.equal(secondConsumption.recordPath, firstConsumption.recordPath);
  assert.equal(secondConsumption.artifactRevision, 2);
  assert.equal(secondConsumption.reusedExisting, false);
  assert.equal(resolveWorkCardLoopState(root, "phase-01").status, "all-complete");
});

test("Approved Repair Work Card routes to Implement with repair report target", () => {
  const root = tempWorkspace("champcity-work-card-loop-approved-repair-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const handoffPath = writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md",
    },
  });
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", "repair-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", repairId: "WC01-REPAIR01", parentWorkCardId: "WC01" },
    sourceRevisions: [
      { path: reportPath, revision: 1 },
      { path: handoffPath, revision: 1 },
    ],
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
    },
  });

  const loopState = resolveWorkCardLoopState(root, "phase-01");

  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-building-review");
  assert.equal(loopState.workCardId, "WC01-REPAIR01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.loopStep, "Build");
  assert.equal(loopState.formalWorkCardPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(loopState.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.match(loopState.requiredAction, /create the application-owned repair Implementer Report/);
  assert.equal(loopState.blocker, undefined);
});

test("reserved repair Implementer Report keeps Approved Repair Work Card in Implement", () => {
  const root = tempWorkspace("champcity-work-card-loop-approved-repair-reserved-");
  seedApprovedRepairImplementation(root);
  writeReservedRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");

  const loopState = resolveWorkCardLoopState(root, "phase-01");

  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-building-review");
  assert.equal(loopState.workCardId, "WC01-REPAIR01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.loopStep, "Build");
  assert.equal(loopState.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.match(loopState.requiredAction, /complete the reserved repair Implementer Report with substantive evidence/);
  assert.equal(loopState.blocker, undefined);
});

test("invalid and conflicting repair Implementer Reports keep Approved Repair Work Card in Implement with blocker", () => {
  const invalidRoot = tempWorkspace("champcity-work-card-loop-approved-repair-invalid-");
  seedApprovedRepairImplementation(invalidRoot);
  writeReadyRepairImplementerReport(invalidRoot, "phase-01", "WC02", "WC01-REPAIR01");

  const invalidState = resolveWorkCardLoopState(invalidRoot, "phase-01");

  assert.equal(invalidState.workspaceId, "work-card-building-review");
  assert.equal(invalidState.loopStep, "Build");
  assert.equal(invalidState.workCardId, "WC01-REPAIR01");
  assert.equal(invalidState.parentWorkCardId, "WC01");
  assert.match(invalidState.requiredAction, /repair identity does not match/);
  assert.match(invalidState.blocker, /repair identity does not match/);

  const conflictRoot = tempWorkspace("champcity-work-card-loop-approved-repair-conflict-");
  seedApprovedRepairImplementation(conflictRoot);
  writeReadyRepairImplementerReport(conflictRoot, "phase-01", "WC01", "WC01-REPAIR01");
  writeReadyRepairImplementerReportAtPath(
    conflictRoot,
    "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_other.md",
    "phase-01",
    "WC01",
    "WC01-REPAIR01",
  );

  const conflictState = resolveWorkCardLoopState(conflictRoot, "phase-01");

  assert.equal(conflictState.workspaceId, "work-card-building-review");
  assert.equal(conflictState.loopStep, "Build");
  assert.equal(conflictState.workCardId, "WC01-REPAIR01");
  assert.equal(conflictState.parentWorkCardId, "WC01");
  assert.match(conflictState.requiredAction, /Conflicting Implementer Report target exists/);
  assert.match(conflictState.blocker, /Conflicting Implementer Report target exists/);
});

test("ready repair Implementer Report routes Approved Repair Work Card to Review and Validation", () => {
  const root = tempWorkspace("champcity-work-card-loop-approved-repair-ready-");
  seedApprovedRepairImplementation(root);
  writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");

  const loopState = resolveWorkCardLoopState(root, "phase-01");

  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-report-review");
  assert.equal(loopState.workCardId, "WC01-REPAIR01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.loopStep, "ReviewAndValidation");
  assert.equal(loopState.formalWorkCardPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(loopState.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.match(loopState.requiredAction, /Review the current repair Implementer Report/);
});

test("exact Approved Repair validation closes the parent and releases dependencies only after close return", () => {
  const root = tempWorkspace("champcity-work-card-loop-repair-approved-close-");
  seedApprovedRepairImplementation(root, true);
  const repairReportPath = writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");

  const validation = applyOperatorValidationDecision(root, "phase-01", "WC01-REPAIR01", {
    decision: "ValidatePassed",
    operatorNotes: "Repair behavior passed validation.",
  });
  assert.throws(
    () => applyOperatorValidationDecision(root, "phase-01", "WC01-REPAIR01", {
      decision: "ValidatePassed",
      operatorNotes: "Duplicate validation must be rejected.",
    }),
    /Validation decision already exists/,
  );

  let loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-close");
  assert.equal(loopState.loopStep, "Close");
  assert.equal(loopState.workCardId, "WC01");
  assert.equal(loopState.candidateId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.formalWorkCardPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(loopState.implementerReportPath, repairReportPath);
  assert.ok(loopState.sourceEvidence.includes("planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md"));
  assert.ok(loopState.sourceEvidence.includes(repairReportPath));
  assert.ok(loopState.sourceEvidence.includes(validation.markdownPath));
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Eligible");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Ineligible");
  assert.equal(
    listPlanningDocuments(root).some((document) =>
      document.markdownPath.includes("/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT")
    ),
    false,
  );

  const completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  const consumption = consumeWorkCardCloseReturn(root, completion);
  const record = listPlanningDocuments(root)
    .find((document) => document.markdownPath === consumption.recordPath);
  assert.equal(record.metadata.artifactType, "work-card-close-return-record");
  assert.equal(record.metadata.participationRole, "contextOnly");
  assert.equal(record.metadata.canonical.identity.parentWorkCardId, "WC01");
  assert.equal(record.metadata.canonical.identity.executionKind, "repair");
  assert.equal(record.metadata.canonical.identity.executionWorkCardId, "WC01-REPAIR01");
  assert.equal(record.metadata.canonical.identity.repairId, "WC01-REPAIR01");
  assert.equal(record.metadata.sourceRevisions[0].path, validation.markdownPath);

  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.status, "map-ready");
  assert.equal(loopState.workspaceId, "phase-work-card-selection");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Eligible");
});

test("exact RevisionRequested Repair validation keeps the parent incomplete and creates the next normalized Repair", () => {
  const root = tempWorkspace("champcity-work-card-loop-repair-revision-requested-");
  seedApprovedRepairImplementation(root, true);
  const repairReportPath = writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");
  const validation = applyOperatorValidationDecision(root, "phase-01", "WC01-REPAIR01", {
    decision: "RequestRepair",
    operatorNotes: "Repair still has a bounded defect.",
    repairDefectText: "Correct the terminal repair completion rule.",
  });

  let loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-repair");
  assert.equal(loopState.loopStep, "Repair");
  assert.equal(loopState.workCardId, "WC01");
  assert.equal(loopState.candidateId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.ok(loopState.sourceEvidence.includes(repairReportPath));
  assert.ok(loopState.sourceEvidence.includes(validation.markdownPath));
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, false);
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Eligible");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Ineligible");

  const repair02 = createRepairWorkCard(
    root,
    "phase-01",
    "WC01-REPAIR01",
    validation.markdownPath,
    "postValidationRecord",
    "Correct the terminal repair completion rule.",
  );
  assert.equal(repair02.repairId, "WC01-REPAIR02");
  assert.deepEqual(
    createRepairWorkCard(
      root,
      "phase-01",
      "WC01-REPAIR01",
      validation.markdownPath,
      "postValidationRecord",
      "Correct the terminal repair completion rule.",
    ),
    repair02,
  );

  writeDoc(root, repair02.repairMarkdownPath, "repair-work-card", "Approved", {
    identity: {
      phaseId: "phase-01",
      workCardId: "WC01-REPAIR02",
      repairId: "WC01-REPAIR02",
      parentWorkCardId: "WC01",
    },
    sourceRevisions: [
      { path: validation.markdownPath, revision: 1 },
      { path: repair02.handoffMarkdownPath, revision: 1 },
    ],
    workflowData: {
      repairId: "WC01-REPAIR02",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "postValidationRecord",
      evidencePath: validation.markdownPath,
      boundedDefect: "Correct the terminal repair completion rule.",
      returnTarget: "work-card-validation",
    },
  });
  writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR02");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01-REPAIR01_ATTEMPT02.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", candidateId: "WC01-REPAIR01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", revision: 1 },
      { path: repairReportPath, revision: 1 },
    ],
  });

  const terminalRepair = resolveTerminalApprovedRepairImplementationContext(root, "phase-01", "WC01");
  assert.equal(terminalRepair.status, "ready", JSON.stringify(terminalRepair));
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-report-review", JSON.stringify({
    reason: loopState.reason,
    workCardId: loopState.workCardId,
    repairId: loopState.repairId,
    formalWorkCardPath: loopState.formalWorkCardPath,
  }));
  assert.equal(loopState.workCardId, "WC01-REPAIR02");
  assert.equal(loopState.repairId, "WC01-REPAIR02");
  assert.equal(loopState.candidateId, "WC01");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, false);
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Ineligible");
});

test("wrong Repair report revision validation cannot close the parent or release dependencies", () => {
  const root = tempWorkspace("champcity-work-card-loop-repair-wrong-report-revision-");
  seedApprovedRepairImplementation(root, true);
  const repairReportPath = writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01-REPAIR01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", candidateId: "WC01-REPAIR01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", revision: 1 },
      { path: repairReportPath, revision: 2 },
    ],
  });

  const loopState = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(loopState.workspaceId, "work-card-report-review");
  assert.equal(loopState.workCardId, "WC01-REPAIR01");
  assert.equal(loopState.candidateId, "WC01");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, false);
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Eligible");
  assert.equal(loopState.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Ineligible");
});

test("WC02 approved Formal Work Card outranks stale WC01 Close evidence", () => {
  const root = tempWorkspace("champcity-work-card-loop-stale-close-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);
  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC01", "Pending");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", revision: 1 },
    ],
  });

  consumeWorkCardCloseReturn(
    root,
    resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01"),
  );
  beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
  });

  const loopState = resolveWorkCardLoopState(root, "phase-01");

  assert.equal(loopState.status, "active");
  assert.equal(loopState.workspaceId, "work-card-building-review");
  assert.equal(loopState.workCardId, "WC02");
  assert.equal(loopState.loopStep, "Build");
  assert.doesNotMatch(loopState.sourceEvidence.join(";"), /VALIDATION_RECORD_WC01/);
});

test("Work Card loop keeps application-created skeleton reports in Build Review", () => {
  const root = tempWorkspace("champcity-work-card-loop-skeleton-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
    },
    bodyMarkdown: [
      "# Implementer Report - WC01",
      "",
      "Status: Pending Implementer completion.",
      "",
      "## Repository Verification",
      "## Implementation Summary",
      "## Files Created",
      "## Files Modified",
      "## Acceptance Criteria Evidence",
      "",
    ].join("\n"),
  });

  const loopState = resolveWorkCardLoopState(root, "phase-01");

  assert.equal(loopState.workspaceId, "work-card-building-review");
  assert.equal(loopState.loopStep, "Build");
  assert.match(loopState.reason, /reserved scaffold/);
});

function seedTwoCandidatePhasePlanningBundle(root) {
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

function seedSequentialCompletedWorkCards(root) {
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const wc01Report = writeReadyImplementerReport(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: wc01Report, revision: 1 },
    ],
  });
  consumeWorkCardCloseReturn(root, resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01"));

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
  });
  const wc02Report = writeReadyImplementerReport(root, "phase-01", "WC02", "Pending", "second_work_card");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", revision: 1 },
      { path: wc02Report, revision: 1 },
    ],
  });
}

function seedSimultaneouslyEligiblePhasePlanningBundle(root) {
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

function writeReadyImplementerReport(
  root,
  phaseId,
  workCardId,
  status = "Pending",
  slug = "first_work_card",
  artifactRevision = 1,
) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_${slug}.md`, "implementer-report", status, {
    artifactRevision,
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_${slug}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardLoop/workCardLoopStateService.ts"],
      implementationSummary: "Implemented readiness-gated loop routing.",
      validationResults: ["work card loop state test passed"],
      acceptanceEvidence: ["ready report routes to Review & Validation"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Implementation Summary",
      "Implemented readiness-gated loop routing.",
      "## Validation Performed",
      "work card loop state test passed",
      "",
    ].join("\n"),
  });
}

function seedApprovedRepairImplementation(root, includeDependentCandidate = false) {
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  if (includeDependentCandidate) {
    seedTwoCandidatePhasePlanningBundle(root);
  } else {
    seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  }
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const handoffPath = writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md",
    },
  });
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", "repair-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", repairId: "WC01-REPAIR01", parentWorkCardId: "WC01" },
    sourceRevisions: [
      { path: reportPath, revision: 1 },
      { path: handoffPath, revision: 1 },
    ],
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
    },
  });
}

function writeReadyRepairImplementerReport(root, phaseId, parentWorkCardId, repairId) {
  return writeReadyRepairImplementerReportAtPath(
    root,
    `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`,
    phaseId,
    parentWorkCardId,
    repairId,
  );
}

function writeReadyRepairImplementerReportAtPath(root, markdownPath, phaseId, parentWorkCardId, repairId) {
  return writeDoc(root, markdownPath, "implementer-report", "Pending", {
    identity: { phaseId, workCardId: repairId, repairId, parentWorkCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${repairId}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardLoop/workCardLoopStateService.ts"],
      implementationSummary: "Implemented the approved repair contract.",
      validationResults: ["repair implementation test passed"],
      acceptanceEvidence: ["ready repair report routes to Review & Validation"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented the approved repair contract.",
      "## Validation Performed",
      "repair implementation test passed",
      "",
    ].join("\n"),
  });
}

function writeReservedRepairImplementerReport(root, phaseId, parentWorkCardId, repairId) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`, "implementer-report", "Pending", {
    identity: { phaseId, workCardId: repairId, repairId, parentWorkCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${repairId}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Implementer completion.",
      "",
      "## Repository Verification",
      "## Implementation Summary",
      "## Files Created",
      "## Files Modified",
      "## Acceptance Criteria Evidence",
      "",
    ].join("\n"),
  });
}
