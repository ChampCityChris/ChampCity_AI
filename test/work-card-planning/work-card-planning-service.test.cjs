const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { saveArchitectInterviewDraft, setArchitectInterviewDisposition } = require("../../dist/main/architectInterview/architectInterviewService.js");
const { architectBrowserSecuritySummary } = require("../../dist/main/browser/architectBrowserService.js");
const { listPlanningDocuments, savePlanningDocumentRevision } = require("../../dist/main/documents/planningDocumentService.js");
const { submitProjectIntake } = require("../../dist/main/projectIntake/projectIntakeService.js");
const { generateProjectPlanningHandoff, setProjectPlanningBundleDisposition } = require("../../dist/main/projectPlanning/projectPlanningService.js");
const { generatePhaseInterviewHandoff, setPhaseInterviewDisposition } = require("../../dist/main/phaseInterview/phaseInterviewService.js");
const { generatePhaseMapHandoff, setPhaseMapDisposition } = require("../../dist/main/phaseMap/phaseMapService.js");
const { generatePhasePlanningHandoff, setPhasePlanningBundleDisposition } = require("../../dist/main/phasePlanning/phasePlanningService.js");
const { generateWorkCardIntakeHandoff } = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedPhaseInterviewOutput,
  seedPhaseMapOutput,
  seedPhasePlanningOutputs,
  seedProjectPlanningOutputs,
} = require("../support/architect-output-fixtures.cjs");
const {
  createFormalWorkCardFromIntakeHandoff,
  getWorkCardBuildingEligibility,
  reviseFormalWorkCard,
  setFormalWorkCardDisposition,
} = require("../../dist/main/workCardPlanning/workCardPlanningService.js");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-work-card-planning-"));
}

function readyIntakeHandoff() {
  const root = createRepository();
  submitProjectIntake({
    projectName: "Formal Work Card Project",
    projectPurpose: "Review one formal work card.",
    desiredOutcome: "Approved card gates building.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });
  saveArchitectInterviewDraft(root, "Approved interview.");
  setArchitectInterviewDisposition(root, "Approved");
  seedProjectPlanningOutputs(root, generateProjectPlanningHandoff(root));
  setProjectPlanningBundleDisposition(root, "Approved");
  const phases = [{
    phaseId: "phase-01",
    title: "Foundation",
    order: 1,
    purpose: "Prepare the foundation.",
    dependsOn: [],
    sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
  }];
  seedPhaseMapOutput(root, generatePhaseMapHandoff(root, phases), phases);
  setPhaseMapDisposition(root, "Approved");
  seedPhaseInterviewOutput(root, generatePhaseInterviewHandoff(root));
  setPhaseInterviewDisposition(root, "phase-01", "Approved");
  const candidates = [{
    candidateId: "WC01",
    order: 1,
    title: "Build Formal Surface",
    purpose: "Create the formal card.",
    dependsOn: [],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
  }];
  seedPhasePlanningOutputs(root, generatePhasePlanningHandoff(root, candidates), candidates);
  setPhasePlanningBundleDisposition(root, "phase-01", "Approved");
  generateWorkCardIntakeHandoff(root, "phase-01");
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Formal Work Card pair is created from current Approved intake handoff", () => {
  const root = readyIntakeHandoff();

  const result = createFormalWorkCardFromIntakeHandoff(root, "phase-01", "WC01");
  const card = readJson(root, result.jsonPath);

  assert.equal(result.markdownPath, "planning/phases/phase-01/Work_Cards/WC01_build_formal_surface.md");
  assert.equal(card.workCardId, "WC01");
  assert.equal(card.candidateId, "WC01");
  assert.equal(card.documentDisposition.status, "Pending");
  assert.equal(card.returnToPhasePlanningOnRejected, true);
  assert.ok(card.implementationContract.validationExpectations.includes("npm test"));
});

test("Approved Formal Work Card is the sole Work Card Building gate", () => {
  const root = readyIntakeHandoff();
  createFormalWorkCardFromIntakeHandoff(root, "phase-01", "WC01");

  assert.equal(getWorkCardBuildingEligibility(root, "phase-01", "WC01").eligible, false);
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");

  assert.deepEqual(getWorkCardBuildingEligibility(root, "phase-01", "WC01"), {
    eligible: true,
    reason: "Approved Formal Work Card is the Work Card Building instruction.",
  });
});

test("Rejected Formal Work Card returns to Phase Planning", () => {
  const root = readyIntakeHandoff();
  createFormalWorkCardFromIntakeHandoff(root, "phase-01", "WC01");

  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Rejected");

  assert.match(getWorkCardBuildingEligibility(root, "phase-01", "WC01").reason, /Phase Planning bundle revision/);
});

test("upstream intake handoff revision invalidates Formal Work Card", () => {
  const root = readyIntakeHandoff();
  createFormalWorkCardFromIntakeHandoff(root, "phase-01", "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  const handoff = listPlanningDocuments(root).find((document) =>
    document.jsonPath === "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.json"
  );

  savePlanningDocumentRevision(root, handoff.logicalDocumentId);

  assert.equal(getWorkCardBuildingEligibility(root, "phase-01", "WC01").eligible, false);
});

test("Formal Work Card revision invalidates downstream validation evidence", () => {
  const root = readyIntakeHandoff();
  const result = createFormalWorkCardFromIntakeHandoff(root, "phase-01", "WC01");
  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  const validationDir = path.join(root, "planning/phases/phase-01/Validation_Reports");
  fs.mkdirSync(validationDir, { recursive: true });
  fs.writeFileSync(
    path.join(validationDir, "VALIDATION_REPORT_WC01.json"),
    JSON.stringify({
      artifactType: "validation-record",
      artifactRevision: 1,
      participationRole: "gatingReview",
      phaseId: "phase-01",
      workCardId: "WC01",
      sourceRevisions: [{ path: result.jsonPath, revision: 1 }],
      documentDisposition: { status: "Approved" },
    }, null, 2) + "\n",
    "utf8",
  );

  reviseFormalWorkCard(root, "phase-01", "WC01");

  const validation = listPlanningDocuments(root).find((document) => document.displayFilename === "VALIDATION_REPORT_WC01");
  assert.equal(validation.effectiveDisposition, "Pending");
});

test("Formal Work Card planning preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
