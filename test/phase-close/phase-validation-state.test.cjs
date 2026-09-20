const assert = require("node:assert/strict");
const test = require("node:test");

test("generic phased executor distinguishes item, Phase, and Plan criteria and blocks stale Phase progression", () => {
  const { projectPlanExecution } = require("../../dist/main/planExecution/planExecutor.js");
  const boundary = (criteria, extra = {}) => ({ planRevision: 3, fresh: true, blockers: [], evidencePaths: ["planning/acceptance.md"], criteria: criteria.map((criterion) => ({ criterion, status: "passed", evidencePaths: ["planning/acceptance.md"] })), ...extra });
  const candidate = (id, phaseId, dependsOn = []) => ({ workItemId: id, phaseId, title: id, purpose: `Deliver ${id}`, dependsOn, acceptanceCriteria: [`${id} verified`] });
  const phase = (id, dependsOn) => ({ phaseId: id, title: id, purpose: `Milestone ${id}`, dependsOn, acceptanceCriteria: [`${id} accepted`] });
  const input = { planId: "phased-fixture", planRevision: 3, approved: true, fresh: true, blockers: [],
    structure: { topology: "phased", topologyRationale: "Independent milestone acceptance", acceptanceCriteria: ["Whole Plan accepted"], phases: [phase("P2", ["P1"]), phase("P1", [])], workItems: [candidate("B", "P2"), candidate("A", "P1")] }, workItems: [], phases: [] };
  let result = projectPlanExecution(input); assert.equal(result.status, "ready"); assert.equal(result.nextWorkItemId, "A"); assert.equal(result.phases.find((entry) => entry.phaseId === "P2").eligible, false);
  input.workItems = [{ ...boundary(["A verified"]), workItemId: "A", stage: "complete" }];
  result = projectPlanExecution(input);
  assert.equal(result.workItems.find((entry) => entry.candidate.workItemId === "A").complete, true);
  assert.equal(result.phases.find((entry) => entry.phaseId === "P1").workItemsComplete, true);
  assert.equal(result.phases.find((entry) => entry.phaseId === "P1").complete, false);
  assert.equal(result.nextWorkItemId, undefined, "Phase criteria gate successors even when all child items complete");
  input.phases = [{ ...boundary(["P1 accepted"]), phaseId: "P1" }];
  assert.equal(projectPlanExecution(input).nextWorkItemId, "B");
  input.phases[0].fresh = false;
  assert.equal(projectPlanExecution(input).nextWorkItemId, undefined);
  input.phases[0].fresh = true; input.phases[0].blockers = ["Recovery proof unresolved"];
  assert.equal(projectPlanExecution(input).status, "blocked");
  input.phases[0].blockers = [];
  input.workItems.push({ ...boundary(["B verified"]), workItemId: "B", stage: "complete" });
  input.phases.push({ ...boundary(["P2 accepted"]), phaseId: "P2" });
  result = projectPlanExecution(input); assert.equal(result.phasesComplete, true); assert.equal(result.complete, false); assert.equal(result.status, "awaiting-criteria");
  input.planEvidence = boundary(["Whole Plan accepted"]);
  assert.equal(projectPlanExecution(input).complete, true);
  input.planEvidence.criteria.push({ ...input.planEvidence.criteria[0] });
  assert.throws(() => projectPlanExecution(input), /malformed/);
  input.planEvidence.criteria.pop(); input.structure.workItems[1].dependsOn = ["B"];
  assert.throws(() => projectPlanExecution(input), /cycle/);
});

const {
  applyCurrentDisposition,
  createPhaseCloseoutForCurrentPhase,
  getCloseReturnSelectionProjection,
  getCurrentWorkspaceModel,
  getPhaseValidationActionProjection,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  getPhaseCloseProjection,
} = require("../../dist/main/phaseClose/phaseCloseService.js");
const {
  getPhaseMapProjection,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  classifyLifecycleArtifact,
} = require("../../dist/shared/documents/lifecycleArtifact.js");
const {
  listPlanningDocuments,
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("repository-derived Phase Validation gate owns create, dispose, and Phase Close completion", () => {
  const root = seedAllCompletePhase();

  const current = getCurrentWorkspaceModel(root);
  assert.equal(current.activeWorkspaceId, "phase-work-card-selection");
  assert.equal(current.currentPhaseId, "phase-01");
  assert.match(current.expectedNextState, /Phase Validation/);

  const before = getPhaseValidationActionProjection(root);
  assert.equal(before.phaseId, "phase-01");
  assert.equal(before.workspaceId, "phase-validation");
  assert.equal(before.requiredAction, "create-closeout");
  assert.equal(before.closeout, undefined);
  assert.throws(
    () => applyCurrentDisposition(root, "Approved", "", "phase-validation"),
    /requires a current canonical Phase Closeout/,
  );

  const created = createPhaseCloseoutForCurrentPhase(root, "Close", "All phase work is complete.");
  assert.equal(created.payload.markdownPath, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md");
  assert.equal(created.payload.phaseAction.requiredAction, "dispose-closeout");
  assert.equal(created.payload.phaseAction.workspaceId, "phase-validation");
  assert.equal(created.payload.phaseAction.closeout.effectiveDisposition, "Pending");
  assert.equal(created.payload.phaseAction.closeout.closureDecision, "Close");
  assert.throws(
    () => createPhaseCloseoutForCurrentPhase(root, "Close", "Duplicate."),
    /already exists/,
  );
  assert.throws(
    () => applyCurrentDisposition(root, "Approved", "", "phase-close"),
    /cannot bypass the Phase Validation disposition/,
  );

  const revisionRequested = applyCurrentDisposition(root, "RevisionRequested", "", "phase-validation");
  assert.equal(revisionRequested.payload.phaseAction.requiredAction, "dispose-closeout");
  assert.equal(revisionRequested.payload.phaseAction.workspaceId, "phase-validation");
  assert.equal(
    revisionRequested.payload.document.logicalDocumentId,
    revisionRequested.payload.phaseAction.closeout.logicalDocumentId,
  );

  const approved = applyCurrentDisposition(root, "Approved", "", "phase-validation");
  assert.equal(approved.payload.phaseAction.requiredAction, "phase-close-complete");
  assert.equal(approved.payload.phaseAction.workspaceId, "phase-close");
  assert.equal(approved.payload.phaseAction.closeout.freshnessState, "fresh");
  assert.equal(getPhaseCloseProjection(root, "phase-01").complete, true);
});

test("Phase Validation routing cannot create eligibility for active or invalid Work Card state", () => {
  const activeRoot = seedCurrentPhasePlanning();
  generateWorkCardIntakeHandoff(activeRoot, "phase-01", "WC01");
  assert.throws(
    () => createPhaseCloseoutForCurrentPhase(activeRoot, "Close", "Not complete."),
    /not repository-eligible/,
  );
  assert.throws(
    () => applyCurrentDisposition(activeRoot, "Approved", "", "phase-validation"),
    /not repository-eligible/,
  );

  const invalidRoot = seedProjectThroughPhaseMap();
  seedApprovedPhaseInterview(invalidRoot, "phase-01");
  writeDoc(invalidRoot, "planning/phases/phase-01/Phase_Planning.md", "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01" },
  });
  writeDoc(invalidRoot, "planning/phases/phase-01/Work_Card_Plan.md", "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01" },
    workflowData: { candidates: "not-an-array" },
  });
  assert.throws(
    () => createPhaseCloseoutForCurrentPhase(invalidRoot, "Close", "Invalid plan."),
    /not repository-eligible/,
  );
});

test("Phase Close completion matrix and lifecycle classification fail closed", async (t) => {
  const cases = [
    { label: "Pending Close", status: "Pending", decision: "Close", complete: false },
    { label: "Rejected Close", status: "Rejected", decision: "Close", complete: false },
    { label: "RevisionRequested Close", status: "RevisionRequested", decision: "Close", complete: false },
    { label: "Approved DoNotClose", status: "Approved", decision: "DoNotClose", complete: false },
    { label: "fresh Approved Close", status: "Approved", decision: "Close", complete: true },
  ];

  for (const entry of cases) {
    await t.test(entry.label, () => {
      const root = tempWorkspace("champcity-phase-close-matrix-");
      const sourcePath = writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_demo.md", "formal-work-card", "Approved", {
        identity: { phaseId: "phase-01", workCardId: "WC01" },
      });
      const closeoutPath = writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", "phase-closeout", entry.status, {
        participationRole: "compoundGatingReview",
        identity: { phaseId: "phase-01", closureDecision: entry.decision },
        sourceRevisions: [{ path: sourcePath, revision: 1 }],
        workflowData: { phaseId: "phase-01", closureDecision: entry.decision },
      });
      const projection = getPhaseCloseProjection(root, "phase-01");
      assert.equal(projection.complete, entry.complete);
      assert.equal(projection.workspaceId, entry.complete ? "phase-close" : "phase-validation");
      const closeout = listPlanningDocuments(root).find((document) => document.markdownPath === closeoutPath);
      assert.equal(classifyLifecycleArtifact(closeout).workspaceId, "phase-validation");
    });
  }

  const projectRoot = tempWorkspace("champcity-project-close-classifier-");
  const projectPath = writeDoc(projectRoot, "planning/project/Project_Closeouts/PROJECT_CLOSEOUT_demo.md", "project-closeout", "Pending", {
    participationRole: "compoundGatingReview",
    identity: { closureDecision: "Close" },
    workflowData: { closureDecision: "Close" },
  });
  const projectCloseout = listPlanningDocuments(projectRoot).find((document) => document.markdownPath === projectPath);
  assert.equal(classifyLifecycleArtifact(projectCloseout).workspaceId, "project-close");
});

test("stale Approved Close evidence cannot complete Phase Map or advance current phase", () => {
  const root = seedProjectThroughPhaseMap(true);
  const sourcePath = writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_demo.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  writeDoc(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.md", "phase-closeout", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId: "phase-01", closureDecision: "Close" },
    sourceRevisions: [{ path: sourcePath, revision: 1 }],
    workflowData: { phaseId: "phase-01", closureDecision: "Close" },
  });
  const fresh = getPhaseMapProjection(root);
  assert.equal(fresh.state, "first-incomplete");
  assert.equal(fresh.phase.phaseId, "phase-02");
  assert.deepEqual(fresh.completedPhaseIds, ["phase-01"]);

  writeDoc(root, sourcePath, "formal-work-card", "Approved", {
    artifactRevision: 2,
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const staleClose = getPhaseCloseProjection(root, "phase-01");
  assert.equal(staleClose.complete, false);
  assert.equal(staleClose.closeout.freshnessState, "stale");
  const staleMap = getPhaseMapProjection(root);
  assert.equal(staleMap.state, "first-incomplete");
  assert.equal(staleMap.phase.phaseId, "phase-01");
  assert.deepEqual(staleMap.completedPhaseIds, []);
});

function seedAllCompletePhase() {
  const root = seedCurrentPhasePlanning();
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
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01", attemptNumber: 1 },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: { decision: "ValidatePassed", validationStatus: "Approved" },
    reviewedAt: "2026-09-08T12:00:00.000Z",
  });
  const closeReturn = getCloseReturnSelectionProjection(root);
  assert.equal(closeReturn.payload.state, "all-complete");
  return root;
}

function seedCurrentPhasePlanning() {
  const root = seedProjectThroughPhaseMap();
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  return root;
}

function seedProjectThroughPhaseMap(twoPhases = false) {
  const root = tempWorkspace("champcity-phase-validation-state-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  seedApprovedProjectPlanning(root, "demo");
  const phases = [{
    phaseId: "phase-01",
    title: "Foundation",
    order: 1,
    purpose: "Create the first usable workflow.",
    dependsOn: [],
    sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
  }];
  if (twoPhases) {
    phases.push({
      phaseId: "phase-02",
      title: "Expansion",
      order: 2,
      purpose: "Extend the workflow.",
      dependsOn: ["phase-01"],
      sourceReferences: ["planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"],
    });
  }
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", "Approved", {
    workflowData: { phases },
  });
  return root;
}
