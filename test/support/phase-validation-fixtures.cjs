const assert = require("node:assert/strict");
const { applyOperatorValidationDecisionForCurrentWorkCard, getCurrentWorkspaceModel, getCloseReturnSelectionProjection } = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("./canonical-markdown-fixtures.cjs");

function seedCurrentPhasePlan() {
  const root = tempWorkspace("champcity-phase-validation-production-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "demo");
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  return root;
}

function seedAllCompleteWorkCardAtClose() {
  const root = seedCurrentPhasePlan();
  const handoff = generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  writeDoc(root, handoff.formalWorkCardMarkdownPath, "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [{ path: handoff.handoffMarkdownPath, revision: 1 }],
  });
  const reportPath = "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md";
  writeDoc(root, reportPath, "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [{ path: handoff.formalWorkCardMarkdownPath, revision: 1 }],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/currentWorkflow/currentWorkflowService.ts"],
      implementationSummary: "Implemented fixture work.",
      validationResults: ["Focused validation passed."],
      acceptanceEvidence: ["Fixture evidence."],
    },
    bodyMarkdown: [
      "# Implementer Report - WC01",
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented fixture work.",
      "## Validation Performed",
      "Focused validation passed.",
      "",
    ].join("\n"),
  });
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "work-card-report-review");
  const validation = applyOperatorValidationDecisionForCurrentWorkCard(root, {
    decision: "ValidatePassed",
    operatorNotes: "Operator validation passed in the disposable fixture.",
  });
  assert.equal(validation.development.currentModel.activeWorkspaceId, "work-card-close");
  return root;
}

function seedAllCompletePhaseAfterCloseReturn() {
  const root = seedAllCompleteWorkCardAtClose();
  const closeReturn = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturn.payload.state, "all-complete");
  return root;
}

module.exports = { seedCurrentPhasePlan, seedAllCompleteWorkCardAtClose, seedAllCompletePhaseAfterCloseReturn };
