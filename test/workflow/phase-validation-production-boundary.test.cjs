const { seedCurrentPhasePlan, seedAllCompleteWorkCardAtClose, seedAllCompletePhaseAfterCloseReturn } = require("../support/phase-validation-fixtures.cjs");
const { listPlanningDocuments, writeDoc } = require("../support/canonical-markdown-fixtures.cjs");
const { loadProductionFunctions } = require("../support/production-execution.cjs");

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  applyCurrentDisposition,
  createPhaseCloseoutForCurrentPhase,
  getCloseReturnSelectionProjection,
  getCurrentWorkspaceModel,
  getCurrentWorkCardMapProjection,
  getPhaseValidationActionProjection,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  phaseValidationActionForWorkspace,
  phaseValidationPresentation,
} = require("../renderer/renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/phaseValidationRendererOrchestration.ts");

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

test("direct Phase Close selection prunes pending actions and retains current completion state", () => {
  const root = seedAllCompletePhaseAfterCloseReturn();
  const create = getPhaseValidationActionProjection(root);
  const dispose = createPhaseCloseoutForCurrentPhase(root, "Close", "Complete phase work").payload.phaseAction;
  const complete = applyCurrentDisposition(root, "Approved", "", dispose.workspaceId).payload.phaseAction;
  for (const action of [create, dispose, complete]) {
    const state = { phaseAction: action };
    const { transitionToWorkflowStep } = loadProductionFunctions("src/renderer/app/App.tsx", ["transitionToWorkflowStep"], {
      phaseValidationAction: action, phaseValidationActionForWorkspace,
      setPhaseValidationAction: (value) => { state.phaseAction = value; },
      settingsWorkspaceId: "settings", documents: [], resolverResult: null, selectedDocumentId: null,
      documentIdForWorkflowStep: () => null,
      setShellView: (value) => { state.shell = value; },
      setActiveWorkflowId: (value) => { state.workflow = value; },
      setActiveWorkspaceId: (value) => { state.workspace = value; },
      setPriorWorkflowWorkspaceId: (value) => { state.prior = value; },
      setSelectedDocumentId() {}, setSelectedDocument() {}, setSelectedStatus() {},
    });
    transitionToWorkflowStep("phase-close");
    assert.equal(state.phaseAction, action === complete ? complete : null);
    assert.equal(state.workspace, "phase-close");
    assert.equal(state.prior, "phase-close");
    assert.equal(state.shell, "workflow");
    assert.equal(state.workflow, "development");
  }
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
