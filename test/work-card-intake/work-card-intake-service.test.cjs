const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  saveArchitectInterviewDraft,
  setArchitectInterviewDisposition,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  generateProjectPlanningHandoff,
  setProjectPlanningBundleDisposition,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  generatePhaseInterviewHandoff,
  setPhaseInterviewDisposition,
} = require("../../dist/main/phaseInterview/phaseInterviewService.js");
const {
  generatePhaseMapHandoff,
  setPhaseMapDisposition,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  generatePhasePlanningHandoff,
  reviseWorkCardPlanCandidates,
  setPhasePlanningBundleDisposition,
} = require("../../dist/main/phasePlanning/phasePlanningService.js");
const {
  generateWorkCardIntakeHandoff,
  selectNextWorkCardCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedPhaseInterviewOutput,
  seedPhaseMapOutput,
  seedPhasePlanningOutputs,
  seedProjectPlanningOutputs,
} = require("../support/architect-output-fixtures.cjs");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-work-card-intake-"));
}

function submission(root) {
  return {
    projectName: "Work Card Intake Project",
    projectPurpose: "Select work card candidates.",
    desiredOutcome: "The first eligible candidate receives an intake handoff.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  };
}

function phaseMap() {
  return [
    {
      phaseId: "phase-01",
      title: "Foundation",
      order: 1,
      purpose: "Prepare the foundation.",
      dependsOn: [],
      sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
    },
  ];
}

function candidate(overrides = {}) {
  return {
    candidateId: "WC01",
    order: 1,
    title: "Initial Work Card",
    purpose: "Implement the first unit.",
    dependsOn: [],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
    ...overrides,
  };
}

function readyApprovedPlan(candidates = [candidate()]) {
  const root = createRepository();
  submitProjectIntake(submission(root));
  approveProjectIntake(root);
  saveArchitectInterviewDraft(root, "Approved interview for work card intake.");
  setArchitectInterviewDisposition(root, "Approved");
  seedProjectPlanningOutputs(root, generateProjectPlanningHandoff(root));
  setProjectPlanningBundleDisposition(root, "Approved");
  seedPhaseMapOutput(root, generatePhaseMapHandoff(root, phaseMap()), phaseMap());
  setPhaseMapDisposition(root, "Approved");
  seedPhaseInterviewOutput(root, generatePhaseInterviewHandoff(root));
  setPhaseInterviewDisposition(root, "phase-01", "Approved");
  seedPhasePlanningOutputs(root, generatePhasePlanningHandoff(root, candidates), candidates);
  setPhasePlanningBundleDisposition(root, "phase-01", "Approved");
  return root;
}

function approveProjectIntake(root) {
  const intake = listPlanningDocuments(root).find((document) =>
    document.jsonPath?.includes("planning/project/Project_Intake/"),
  );
  setDocumentDisposition(root, intake.logicalDocumentId, "Approved");
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeValidation(root, candidateId) {
  const directory = path.join(root, "planning/phases/phase-01/Validation_Reports");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, `VALIDATION_REPORT_${candidateId}.json`),
    JSON.stringify(
      {
        artifactType: "validation-record",
        artifactRevision: 1,
        participationRole: "gatingReview",
        phaseId: "phase-01",
        candidateId,
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

test("candidate selection requires current Approved Phase Planning bundle", () => {
  const root = readyApprovedPlan();
  const interview = listPlanningDocuments(root).find((document) =>
    document.jsonPath === "planning/phases/phase-01/Phase_Interview.json"
  );
  savePlanningDocumentRevision(root, interview.logicalDocumentId);

  assert.equal(selectNextWorkCardCandidate(root, "phase-01").state, "invalid-plan");
});

test("candidate selection explains eligible dependency-blocked and resolved candidates", () => {
  const root = readyApprovedPlan([
    candidate({ candidateId: "WC01", order: 1, resolutionStatus: "deferred", resolutionReason: "Out of scope.", evidencePaths: ["planning/evidence.md"] }),
    candidate({ candidateId: "WC02", order: 2, dependsOn: ["WC03"] }),
    candidate({ candidateId: "WC03", order: 3 }),
  ]);

  const result = selectNextWorkCardCandidate(root, "phase-01");

  assert.equal(result.state, "selected");
  assert.equal(result.selectedCandidate.candidateId, "WC03");
  assert.equal(result.explanations.find((entry) => entry.candidateId === "WC01").state, "deferred");
  assert.equal(result.explanations.find((entry) => entry.candidateId === "WC02").state, "dependency-blocked");
  assert.equal(result.explanations.find((entry) => entry.candidateId === "WC03").state, "eligible");
});

test("candidate completion is derived from Approved validation evidence", () => {
  const root = readyApprovedPlan([
    candidate({ candidateId: "WC01", order: 1 }),
    candidate({ candidateId: "WC02", order: 2, dependsOn: ["WC01"] }),
  ]);
  writeValidation(root, "WC01");

  const result = selectNextWorkCardCandidate(root, "phase-01");

  assert.equal(result.state, "selected");
  assert.equal(result.selectedCandidate.candidateId, "WC02");
  assert.equal(result.explanations.find((entry) => entry.candidateId === "WC01").state, "complete");
});

test("Work Card Intake handoff is Approved non-review and names one Formal Work Card target only", () => {
  const root = readyApprovedPlan([candidate({ title: "Build Intake Surface" })]);

  const result = generateWorkCardIntakeHandoff(root, "phase-01");
  const handoff = readJson(root, result.handoffJsonPath);

  assert.equal(handoff.participationRole, "nonReviewHandoff");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(result.formalWorkCardMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01_build_intake_surface.md");
  assert.equal(handoff.outputTargets.formalWorkCard.json, result.formalWorkCardJsonPath);
  assert.equal(fs.existsSync(path.join(root, result.formalWorkCardMarkdownPath)), false);
});

test("Approved intake handoff cannot trap lifecycle resolver", () => {
  const root = readyApprovedPlan([candidate({ title: "Build Intake Surface" })]);
  generateWorkCardIntakeHandoff(root, "phase-01");

  const result = resolveFirstNonApprovedDocument(root);

  assert.notEqual(result.status === "current" ? result.document.displayTitle : "", "WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01");
});

test("Work Card Plan revision stops selection and requires regeneration", () => {
  const root = readyApprovedPlan([candidate({ title: "Build Intake Surface" })]);
  generateWorkCardIntakeHandoff(root, "phase-01");

  reviseWorkCardPlanCandidates(root, "phase-01", [
    candidate({ title: "Revised Intake Surface" }),
  ]);

  assert.equal(selectNextWorkCardCandidate(root, "phase-01").state, "invalid-plan");
});
