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
  architectBrowserSecuritySummary,
} = require("../../dist/main/browser/architectBrowserService.js");
const {
  listPlanningDocuments,
  savePlanningDocumentRevision,
} = require("../../dist/main/documents/planningDocumentService.js");
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
  getPhasePlanningCompletion,
  reviseWorkCardPlanCandidates,
  setPhasePlanningBundleDisposition,
  validateCandidates,
} = require("../../dist/main/phasePlanning/phasePlanningService.js");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-phase-planning-"));
}

function submission(root) {
  return {
    projectName: "Phase Planning Project",
    projectPurpose: "Create phase planning bundle.",
    desiredOutcome: "A candidate plan is reviewed.",
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

function readyPhaseInterviewRepository(approveInterview = true) {
  const root = createRepository();
  submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Approved interview for phase planning.");
  setArchitectInterviewDisposition(root, "Approved");
  generateProjectPlanningHandoff(root);
  setProjectPlanningBundleDisposition(root, "Approved");
  generatePhaseMapHandoff(root, phaseMap());
  setPhaseMapDisposition(root, "Approved");
  generatePhaseInterviewHandoff(root);
  if (approveInterview) {
    setPhaseInterviewDisposition(root, "phase-01", "Approved");
  }
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Phase Planning handoff requires current Approved Phase Interview", () => {
  const root = readyPhaseInterviewRepository(false);

  assert.throws(() => generatePhasePlanningHandoff(root), /Current Approved Phase Interview/);
});

test("Phase Planning handoff is Approved non-review and outputs begin Pending", () => {
  const root = readyPhaseInterviewRepository();

  const result = generatePhasePlanningHandoff(root, [candidate()]);
  const handoff = readJson(root, result.handoffJsonPath);
  const phasePlanning = readJson(root, result.phasePlanningJsonPath);
  const workCardPlan = readJson(root, result.workCardPlanJsonPath);

  assert.equal(handoff.participationRole, "nonReviewHandoff");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(handoff.outputTargets.phasePlanning.markdown, "planning/phases/phase-01/Phase_Planning.md");
  assert.equal(handoff.outputTargets.workCardPlan.json, "planning/phases/phase-01/Work_Card_Plan.json");
  assert.equal(phasePlanning.documentDisposition.status, "Pending");
  assert.equal(workCardPlan.documentDisposition.status, "Pending");
  assert.deepEqual(
    Object.keys(workCardPlan.candidates[0]).sort(),
    ["candidateId", "dependsOn", "evidencePaths", "order", "purpose", "resolutionReason", "resolutionStatus", "title"],
  );
  assert.equal(fs.existsSync(path.join(root, "planning/phases/phase-01/Work_Cards")), false);
});

test("candidate contract rejects persisted completion and missing resolution evidence", () => {
  assert.throws(() => validateCandidates([{ ...candidate(), completed: true }]), /completion must be derived/);
  assert.throws(
    () => validateCandidates([{ ...candidate({ resolutionStatus: "deferred" }) }]),
    /resolution reason/,
  );
  assert.throws(
    () => validateCandidates([{ ...candidate({ resolutionStatus: "carriedForward", resolutionReason: "Later", evidencePaths: ["planning/evidence.md"] }) }]),
    /target phase ID/,
  );
  assert.equal(
    validateCandidates([
      candidate({
        resolutionStatus: "alreadySatisfied",
        resolutionReason: "Accepted earlier.",
        evidencePaths: ["planning/evidence.md"],
      }),
    ])[0].resolutionStatus,
    "alreadySatisfied",
  );
});

test("shared Phase Planning disposition approves both bundle documents", () => {
  const root = readyPhaseInterviewRepository();
  generatePhasePlanningHandoff(root, [candidate()]);

  setPhasePlanningBundleDisposition(root, "phase-01", "Approved");

  assert.equal(getPhasePlanningCompletion(root).complete, true);
});

test("shared Phase Planning disposition rolls back all four files after injected failure", () => {
  const root = readyPhaseInterviewRepository();
  const result = generatePhasePlanningHandoff(root, [candidate()]);
  const files = [
    result.phasePlanningMarkdownPath,
    result.phasePlanningJsonPath,
    result.workCardPlanMarkdownPath,
    result.workCardPlanJsonPath,
  ];
  const before = new Map(
    files.map((relativePath) => [
      relativePath,
      fs.readFileSync(path.join(root, relativePath), "utf8"),
    ]),
  );

  assert.throws(
    () => setPhasePlanningBundleDisposition(root, "phase-01", "Approved", { failAfterWrites: 2 }),
    /Injected write failure/,
  );

  for (const relativePath of files) {
    assert.equal(fs.readFileSync(path.join(root, relativePath), "utf8"), before.get(relativePath));
  }
  assert.equal(getPhasePlanningCompletion(root).complete, false);
});

test("Work Card Plan candidate revision resets bundle and invalidates downstream evidence", () => {
  const root = readyPhaseInterviewRepository();
  const result = generatePhasePlanningHandoff(root, [candidate()]);
  setPhasePlanningBundleDisposition(root, "phase-01", "Approved");
  const formalDir = path.join(root, "planning/phases/phase-01/Work_Cards");
  fs.mkdirSync(formalDir, { recursive: true });
  fs.writeFileSync(
    path.join(formalDir, "WC01_formal.md"),
    [
      "# Formal Work Card",
      "Artifact.Revision=1",
      "participationRole=gatingReview",
      "phaseId=phase-01",
      "workCardId=WC01",
      "",
      "## Source Revisions",
      `- path: ${result.workCardPlanJsonPath} revision: 1`,
      "",
      "## Document Disposition",
      "",
      "Document.Status=Approved",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(formalDir, "WC01_formal.json"),
    JSON.stringify(
      {
        artifactType: "formal-work-card",
        artifactRevision: 1,
        participationRole: "gatingReview",
        phaseId: "phase-01",
        workCardId: "WC01",
        sourceRevisions: [{ path: result.workCardPlanJsonPath, revision: 1 }],
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  reviseWorkCardPlanCandidates(root, "phase-01", [
    candidate({ title: "Revised Work Card", purpose: "Revised purpose." }),
  ]);

  const phasePlanning = readJson(root, result.phasePlanningJsonPath);
  const workCardPlan = readJson(root, result.workCardPlanJsonPath);
  const formal = listPlanningDocuments(root).find((document) => document.displayFilename === "WC01_formal");
  assert.equal(phasePlanning.documentDisposition.status, "Pending");
  assert.equal(workCardPlan.documentDisposition.status, "Pending");
  assert.equal(workCardPlan.artifactRevision, 2);
  assert.equal(workCardPlan.candidates[0].title, "Revised Work Card");
  assert.equal(formal.effectiveDisposition, "Pending");
});

test("Phase Interview revision invalidates older Approved Phase Planning bundle", () => {
  const root = readyPhaseInterviewRepository();
  generatePhasePlanningHandoff(root, [candidate()]);
  setPhasePlanningBundleDisposition(root, "phase-01", "Approved");
  const interview = listPlanningDocuments(root).find((document) =>
    document.jsonPath === "planning/phases/phase-01/Phase_Interview.json"
  );

  savePlanningDocumentRevision(root, interview.logicalDocumentId);

  assert.equal(getPhasePlanningCompletion(root, "phase-01").complete, false);
});

test("Phase Planning preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
