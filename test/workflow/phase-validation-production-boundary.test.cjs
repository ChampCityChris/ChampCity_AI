const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  applyCurrentDisposition,
  applyOperatorValidationDecisionForCurrentWorkCard,
  createPhaseCloseoutForCurrentPhase,
  getCloseReturnSelectionProjection,
  getCurrentWorkspaceModel,
  getCurrentWorkCardMapProjection,
  getPhaseValidationActionProjection,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
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
  listPlanningDocuments,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

const {
  phaseValidationActionForWorkspace,
  phaseValidationPresentation,
} = require("../renderer/renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/phaseValidationRendererOrchestration.ts");

const repoRoot = path.resolve(__dirname, "../..");

test("production boundary preserves explicit map continuation and reaches Phase Close only after fresh Approved Close", () => {
  const root = seedAllCompleteWorkCardAtClose();

  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "work-card-close");
  const closeReturn = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturn.payload.state, "all-complete");
  assert.equal(closeReturn.payload.continuationTarget, "phase-validation");
  assert.equal(getCurrentWorkspaceModel(root).activeWorkspaceId, "phase-work-card-selection");
  const map = getCurrentWorkCardMapProjection(root, "phase-01");
  assert.equal(map.payload.state, "all-complete");
  assert.equal(map.payload.phaseValidationWorkspaceId, "phase-validation");

  const entry = getPhaseValidationActionProjection(root);
  assert.equal(entry.requiredAction, "create-closeout");
  assert.equal(entry.workspaceId, "phase-validation");
  assert.equal(phaseValidationPresentation(entry).canCreateCloseout, true);
  assert.equal(
    phaseValidationActionForWorkspace("phase-close", entry),
    null,
    "direct Phase Close rail navigation must drop retained create-closeout action state",
  );

  const created = createPhaseCloseoutForCurrentPhase(root, "Close", "All planned phase work is complete.");
  assert.equal(created.payload.phaseAction.requiredAction, "dispose-closeout");
  assert.equal(created.payload.phaseAction.workspaceId, "phase-validation");
  assert.equal(
    phaseValidationActionForWorkspace("phase-close", created.payload.phaseAction),
    null,
    "direct Phase Close rail navigation must drop retained dispose-closeout action state",
  );
  assert.equal(created.payload.phaseAction.closeout.effectiveDisposition, "Pending");
  assert.equal(
    listPlanningDocuments(root).some(
      (document) => document.logicalDocumentId === created.payload.phaseAction.closeout.logicalDocumentId,
    ),
    true,
    "the canonical closeout is visible on immediate repository refresh",
  );

  for (const status of ["RevisionRequested", "Rejected"]) {
    const incomplete = applyCurrentDisposition(root, status, "", created.payload.phaseAction.workspaceId);
    assert.equal(incomplete.payload.phaseAction.requiredAction, "dispose-closeout");
    assert.equal(incomplete.payload.phaseAction.workspaceId, "phase-validation");
    assert.equal(phaseValidationPresentation(incomplete.payload.phaseAction).dispositionTarget, "phase-validation");
  }

  assert.throws(
    () => applyCurrentDisposition(root, "Approved", "", "phase-close"),
    /cannot bypass the Phase Validation disposition/,
  );
  assert.throws(
    () => applyCurrentDisposition(root, "Approved", "", "work-card-validation"),
    /does not provide Work Card state|Disposition is invalid from the current workflow state/,
  );
  const approved = applyCurrentDisposition(root, "Approved", "", "phase-validation");
  assert.equal(approved.payload.phaseAction.requiredAction, "phase-close-complete");
  assert.equal(approved.payload.phaseAction.workspaceId, "phase-close");
  assert.equal(approved.payload.phaseAction.closeout.effectiveDisposition, "Approved");
  assert.equal(approved.payload.phaseAction.closeout.closureDecision, "Close");
  assert.equal(approved.payload.phaseAction.closeout.freshnessState, "fresh");
  assert.equal(
    phaseValidationActionForWorkspace("phase-close", approved.payload.phaseAction),
    approved.payload.phaseAction,
    "the current completion projection must remain available in Phase Close",
  );
  const completePresentation = phaseValidationPresentation(approved.payload.phaseAction);
  assert.equal(completePresentation.canCreateCloseout, false);
  assert.equal(completePresentation.dispositionTarget, null);
});

test("development Phase Loop routes direct Phase Close selection through action pruning", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src", "renderer", "app", "App.tsx"), "utf8");
  const railHandler = source.slice(
    source.indexOf("onWorkspaceChange={(workspaceId) =>"),
    source.indexOf("projectRailStatuses=", source.indexOf("onWorkspaceChange={(workspaceId) =>")),
  );
  assert.match(railHandler, /transitionToWorkflowStep\(workspaceId\)/);

  const transition = source.slice(
    source.indexOf("function transitionToWorkflowStep"),
    source.indexOf("function openSettings", source.indexOf("function transitionToWorkflowStep")),
  );
  assert.match(transition, /phaseValidationActionForWorkspace\([\s\S]*?destinationWorkspaceId[\s\S]*?phaseValidationAction/);
  assert.match(transition, /setPhaseValidationAction\(retainedPhaseValidationAction\)/);
});

test("negative production boundary cannot bypass Phase Validation", async (t) => {
  await t.test("incomplete Work Card", () => {
    const root = seedCurrentPhasePlan();
    assert.throws(
      () => getPhaseValidationActionProjection(root),
      /not repository-eligible/,
    );
  });

  await t.test("dependency blocker", () => {
    const root = seedCurrentPhasePlan();
    const candidate = {
      candidateId: "WC02",
      order: 1,
      title: "Blocked Work Card",
      purpose: "Cannot begin until a missing predecessor completes.",
      dependsOn: ["WC01"],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    };
    writeDoc(root, "planning/phases/phase-01/Work_Card_Plan.md", "work-card-plan", "Approved", {
      artifactRevision: 2,
      participationRole: "compoundGatingReview",
      identity: { phaseId: "phase-01" },
      workflowData: { candidates: [candidate] },
      bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify([candidate], null, 2)}\n\`\`\`\n`,
    });
    assert.throws(
      () => getPhaseValidationActionProjection(root),
      /not repository-eligible/,
    );
  });

  await t.test("missing and non-Approved closeout", () => {
    const root = seedAllCompletePhaseAfterCloseReturn();
    const missing = getPhaseValidationActionProjection(root);
    assert.equal(missing.requiredAction, "create-closeout");
    assert.equal(missing.workspaceId, "phase-validation");
    const created = createPhaseCloseoutForCurrentPhase(root, "Close", "Pending review.");
    assert.equal(created.payload.phaseAction.requiredAction, "dispose-closeout");
    for (const status of ["RevisionRequested", "Rejected"]) {
      const result = applyCurrentDisposition(root, status, "", "phase-validation");
      assert.equal(result.payload.phaseAction.workspaceId, "phase-validation");
      assert.equal(result.payload.phaseAction.requiredAction, "dispose-closeout");
    }
  });

  await t.test("Approved DoNotClose", () => {
    const root = seedAllCompletePhaseAfterCloseReturn();
    createPhaseCloseoutForCurrentPhase(root, "DoNotClose", "The phase remains open.");
    const result = applyCurrentDisposition(root, "Approved", "", "phase-validation");
    assert.equal(result.payload.phaseAction.workspaceId, "phase-validation");
    assert.equal(result.payload.phaseAction.requiredAction, "dispose-closeout");
    assert.equal(result.payload.phaseAction.closeout.closureDecision, "DoNotClose");
  });

  await t.test("stale Approved Close", () => {
    const root = seedAllCompletePhaseAfterCloseReturn();
    createPhaseCloseoutForCurrentPhase(root, "Close", "Initially fresh.");
    const formal = listPlanningDocuments(root).find(
      (document) => document.metadata.artifactType === "formal-work-card",
    );
    assert.ok(formal);
    writeDoc(root, formal.markdownPath, "formal-work-card", "Approved", {
      artifactRevision: (formal.metadata.artifactRevision ?? 1) + 1,
      identity: formal.metadata.canonical.identity,
      sourceRevisions: formal.metadata.canonical.sourceRevisions,
      workflowData: formal.metadata.canonical.workflowData,
    });
    assert.throws(
      () => applyCurrentDisposition(root, "Approved", "", "phase-validation"),
      /not repository-eligible|stale/i,
    );
  });
});

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
