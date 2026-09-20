const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  resolveWorkCardLoopState,
} = require("../../dist/main/workCardLoop/workCardLoopStateService.js");
const {
  resolveEffectiveWorkCardCompletion,
} = require("../../dist/main/workCardLoop/effectiveWorkCardCompletion.js");
const {
  consumeWorkCardCloseReturn,
  resolveWorkCardCloseReturnConsumption,
} = require("../../dist/main/workCardLoop/workCardCloseReturnLifecycle.js");
const {
  beginWorkCardPlanningForCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  applyOperatorValidationDecision,
  getWorkCardCloseProjection,
} = require("../../dist/main/workCardValidation/workCardValidationService.js");
const {
  createRepairWorkCard,
} = require("../../dist/main/workCardRepair/workCardRepairService.js");
const {
  listPlanningDocuments,
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

/*
 * Characterization boundary:
 * These tests intentionally freeze current Desktop Development behavior at the
 * service/projection boundary. Extraction may change implementation structure,
 * but changing these outcomes requires an explicit product decision.
 */

test("Desktop Work Card lifecycle remains Map -> Planning -> Build -> Review/Validation -> Close -> complete", () => {
  const root = preparedDevelopmentWorkspace("champcity-characterization-work-card-");

  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "map-ready",
    workspaceId: "phase-work-card-selection",
    loopStep: "Map",
  });

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-planning",
    loopStep: "Planning",
    workCardId: "WC01",
  });

  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-building-review",
    loopStep: "Build",
    workCardId: "WC01",
  });

  const reportPath = writeReadyImplementerReport(root, "phase-01", "WC01");
  const reportBeforeValidation = fs.readFileSync(path.join(root, reportPath), "utf8");
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-report-review",
    loopStep: "ReviewAndValidation",
    workCardId: "WC01",
  });

  const validation = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Characterization: current Desktop behavior passed.",
    advisorySummary: "Advisory review is evidence; the Operator is disposition loopState.",
  });
  assert.equal(validation.status, "Approved");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);

  const report = listPlanningDocuments(root).find((document) => document.markdownPath === reportPath);
  assert.equal(report.effectiveDisposition, "Pending", "Operator validation must not rewrite Implementer Report disposition");
  assert.equal(fs.readFileSync(path.join(root, reportPath), "utf8"), reportBeforeValidation);
  const validationRecord = listPlanningDocuments(root).find((document) => document.markdownPath === validation.markdownPath);
  assert.equal(validationRecord.metadata.artifactType, "validation-record");
  assert.ok(validationRecord.metadata.sourceRevisions.some((source) => source.path === reportPath && source.revision === 1));

  const closeState = resolveWorkCardLoopState(root, "phase-01");
  assertState(closeState, {
    status: "active",
    workspaceId: "work-card-close",
    loopStep: "Close",
    workCardId: "WC01",
  });
  assert.ok(closeState.sourceEvidence.includes(validation.markdownPath));

  const completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(completion.validationRecord.markdownPath, validation.markdownPath);
  const pendingReturn = resolveWorkCardCloseReturnConsumption(root, completion);
  assert.equal(pendingReturn.consumed, false, "passed validation still requires explicit Close Return");
  assert.equal(fs.existsSync(path.join(root, pendingReturn.recordPath)), false);
  const consumed = consumeWorkCardCloseReturn(root, completion);
  assert.equal(consumed.reusedExisting, false);
  assert.equal(consumeWorkCardCloseReturn(root, completion).reusedExisting, true, "close-return consumption remains idempotent");

  const completed = resolveWorkCardLoopState(root, "phase-01");
  assertState(completed, {
    status: "all-complete",
    workspaceId: "phase-work-card-selection",
    loopStep: "Map",
  });
  assert.equal(completed.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
});

test("Desktop Repair lifecycle preserves parent identity and Repair validation is effective close record", () => {
  const root = preparedDevelopmentWorkspace("champcity-characterization-repair-");
  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC01");

  const failedValidation = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "RequestRepair",
    operatorNotes: "Characterization: bounded defect remains.",
    repairDefectText: "Preserve the current parent completion and close-record semantics.",
  });
  assert.equal(failedValidation.status, "RevisionRequested");
  const failedCompletion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(failedCompletion.complete, false);
  assert.throws(() => consumeWorkCardCloseReturn(root, failedCompletion), /Approved completion evidence/);

  let loopState = resolveWorkCardLoopState(root, "phase-01");
  assertState(loopState, {
    status: "active",
    workspaceId: "work-card-repair",
    loopStep: "Repair",
    workCardId: "WC01",
  });

  const repair = createRepairWorkCard(
    root,
    "phase-01",
    "WC01",
    failedValidation.markdownPath,
    "postValidationRecord",
    "Preserve the current parent completion and close-record semantics.",
  );
  assert.equal(repair.repairId, "WC01-REPAIR01");
  assert.deepEqual(
    createRepairWorkCard(
      root,
      "phase-01",
      "WC01",
      failedValidation.markdownPath,
      "postValidationRecord",
      "Preserve the current parent completion and close-record semantics.",
    ),
    repair,
    "the same Repair evidence must not allocate a second Repair identity",
  );

  writeApprovedRepairContract(root, repair, failedValidation.markdownPath);
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assertState(loopState, {
    status: "active",
    workspaceId: "work-card-building-review",
    loopStep: "Build",
    workCardId: "WC01-REPAIR01",
  });
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");

  const repairReportPath = writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");
  assertState(resolveWorkCardLoopState(root, "phase-01"), {
    status: "active",
    workspaceId: "work-card-report-review",
    loopStep: "ReviewAndValidation",
    workCardId: "WC01-REPAIR01",
  });

  const repairValidation = applyOperatorValidationDecision(root, "phase-01", "WC01-REPAIR01", {
    decision: "ValidatePassed",
    operatorNotes: "Characterization: Repair passed.",
  });
  loopState = resolveWorkCardLoopState(root, "phase-01");
  assertState(loopState, {
    status: "active",
    workspaceId: "work-card-close",
    loopStep: "Close",
    workCardId: "WC01",
  });
  assert.equal(loopState.parentWorkCardId, "WC01");
  assert.equal(loopState.repairId, "WC01-REPAIR01");
  assert.equal(loopState.formalWorkCardPath, repair.repairMarkdownPath);
  assert.equal(loopState.implementerReportPath, repairReportPath);
  assert.ok(loopState.sourceEvidence.includes(repairValidation.markdownPath));
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);

  const completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(completion.parentWorkCardId, "WC01");
  assert.equal(completion.executionWorkCardId, repair.repairId);
  assert.equal(completion.validationRecord.markdownPath, repairValidation.markdownPath);
  assert.equal(resolveWorkCardCloseReturnConsumption(root, completion).consumed, false);
  const consumed = consumeWorkCardCloseReturn(root, completion);
  const closeReturn = listPlanningDocuments(root).find((document) => document.markdownPath === consumed.recordPath);
  assert.equal(closeReturn.metadata.artifactType, "work-card-close-return-record");
  assert.equal(closeReturn.metadata.canonical.identity.parentWorkCardId, "WC01");
  assert.equal(closeReturn.metadata.canonical.identity.executionKind, "repair");
  assert.equal(closeReturn.metadata.canonical.identity.executionWorkCardId, "WC01-REPAIR01");
  assert.equal(closeReturn.metadata.canonical.identity.repairId, "WC01-REPAIR01");
  assert.equal(closeReturn.metadata.sourceRevisions[0].path, repairValidation.markdownPath);
  assert.equal(consumeWorkCardCloseReturn(root, completion).reusedExisting, true);

  const completed = resolveWorkCardLoopState(root, "phase-01");
  assert.equal(completed.status, "all-complete");
  assert.equal(completed.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
});

test("Desktop completion and Close Return reject approval for an older Implementer Report revision", () => {
  const root = preparedDevelopmentWorkspace("champcity-characterization-stale-completion-");
  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC01");
  const awaiting = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(awaiting.state, "awaiting-validation");
  assert.throws(() => consumeWorkCardCloseReturn(root, awaiting), /Approved completion evidence/);

  const validation = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Only report revision 1 has been validated.",
  });
  const consumed = consumeWorkCardCloseReturn(root, resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01"));
  const closeBytes = fs.readFileSync(path.join(root, consumed.recordPath), "utf8");
  const validationBytes = fs.readFileSync(path.join(root, validation.markdownPath), "utf8");

  writeReadyImplementerReport(root, "phase-01", "WC01", 2);
  const current = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC01");
  assert.equal(current.state, "awaiting-validation");
  assert.equal(current.complete, false);
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, false);
  assert.equal(resolveWorkCardCloseReturnConsumption(root, current).consumed, false);
  assert.throws(() => consumeWorkCardCloseReturn(root, current), /Approved completion evidence/);
  assert.equal(fs.readFileSync(path.join(root, consumed.recordPath), "utf8"), closeBytes);
  assert.equal(fs.readFileSync(path.join(root, validation.markdownPath), "utf8"), validationBytes);
});

test("Desktop validation is Operator-owned, final, and cannot validate a reserved Implementer Report scaffold", () => {
  const reservedRoot = preparedDevelopmentWorkspace("champcity-characterization-validation-reserved-");
  beginWorkCardPlanningForCandidate(reservedRoot, "phase-01", "WC01");
  writeDoc(reservedRoot, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReservedImplementerReport(reservedRoot, "phase-01", "WC01");

  assert.throws(
    () => applyOperatorValidationDecision(reservedRoot, "phase-01", "WC01", {
      decision: "ValidatePassed",
      operatorNotes: "A reserved scaffold is not implementation evidence.",
    }),
    /reserved scaffold/,
  );

  const decidedRoot = preparedDevelopmentWorkspace("champcity-characterization-validation-final-");
  beginWorkCardPlanningForCandidate(decidedRoot, "phase-01", "WC01");
  writeDoc(decidedRoot, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(decidedRoot, "phase-01", "WC01");
  const decision = applyOperatorValidationDecision(decidedRoot, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Operator establishes final validation loopState.",
  });
  assert.equal(decision.status, "Approved");
  assert.throws(
    () => applyOperatorValidationDecision(decidedRoot, "phase-01", "WC01", {
      decision: "RequestRepair",
      operatorNotes: "A second final decision must not replace the first.",
      repairDefectText: "Should never be written.",
    }),
    /Validation decision already exists/,
  );
});

function preparedDevelopmentWorkspace(prefix) {
  const root = tempWorkspace(prefix);
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  return root;
}

function assertState(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${key} should remain ${value}`);
  }
  if (actual.status !== "conflict") {
    assert.equal(actual.execution.topology, "direct", "the Work Card sequence runs through generic direct progression within its owning scope");
    assert.equal(actual.execution.phases.length, 0, "no artificial Phase is created inside a direct sequence");
    if (actual.status === "all-complete") assert.equal(actual.execution.workItemsComplete, true);
    else if (actual.status === "active") {
      const id = actual.parentWorkCardId ?? actual.candidateId ?? actual.workCardId;
      const item = actual.execution.workItems.find((entry) => entry.candidate.workItemId === id);
      assert.equal(actual.execution.nextWorkItemId, id);
      assert.equal(item.stage, { Planning: "implement", Build: "implement", ReviewAndValidation: "review-validate", Repair: "repair", Close: "close" }[actual.loopStep]);
      assert.equal(item.complete, false);
    }
  }
}

function writeReadyImplementerReport(root, phaseId, workCardId, artifactRevision = 1) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_first_work_card.md`, "implementer-report", "Pending", {
    artifactRevision,
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/currentWorkflow/currentWorkflowService.ts"],
      implementationSummary: "Characterization fixture represents a completed implementation.",
      validationResults: ["characterization implementation checks passed"],
      acceptanceEvidence: ["current Desktop lifecycle behavior is observable"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Implementation Summary",
      "Characterization fixture represents a completed implementation.",
      "## Validation Performed",
      "characterization implementation checks passed",
      "",
    ].join("\n"),
  });
}

function writeReservedImplementerReport(root, phaseId, workCardId) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_first_work_card.md`, "implementer-report", "Pending", {
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Implementer completion.",
      "",
      "## Repository Verification",
      "## Implementation Summary",
      "## Files Modified",
      "## Validation Performed",
      "",
    ].join("\n"),
  });
}

function writeApprovedRepairContract(root, repair, validationPath) {
  writeDoc(root, repair.repairMarkdownPath, "repair-work-card", "Approved", {
    identity: {
      phaseId: "phase-01",
      workCardId: repair.repairId,
      repairId: repair.repairId,
      parentWorkCardId: "WC01",
    },
    sourceRevisions: [
      { path: validationPath, revision: 1 },
      { path: repair.handoffMarkdownPath, revision: 1 },
    ],
    workflowData: {
      repairId: repair.repairId,
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "postValidationRecord",
      evidencePath: validationPath,
      boundedDefect: "Preserve the current parent completion and close-record semantics.",
      returnTarget: "work-card-validation",
    },
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
      filesChanged: ["src/main/workCardLoop/workCardLoopStateService.ts"],
      implementationSummary: "Implemented the approved Repair contract.",
      validationResults: ["repair characterization checks passed"],
      acceptanceEvidence: ["Repair retains parent identity through close"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented the approved Repair contract.",
      "## Validation Performed",
      "repair characterization checks passed",
      "",
    ].join("\n"),
  });
}
