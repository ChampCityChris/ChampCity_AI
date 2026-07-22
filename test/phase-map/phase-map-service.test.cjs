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
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  generateProjectPlanningHandoff,
  setProjectPlanningBundleDisposition,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  generatePhaseMapHandoff,
  getPhaseMapProjection,
  setPhaseMapDisposition,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  seedPhaseMapOutput,
  seedProjectPlanningOutputs,
} = require("../support/architect-output-fixtures.cjs");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-phase-map-"));
}

function submission(root) {
  return {
    projectName: "Phase Map Project",
    projectPurpose: "Create phase map.",
    desiredOutcome: "A deterministic first incomplete phase.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  };
}

function readyPlanningRepository() {
  const root = createRepository();
  submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Approved interview for phase map.");
  setArchitectInterviewDisposition(root, "Approved");
  seedProjectPlanningOutputs(root, generateProjectPlanningHandoff(root));
  setProjectPlanningBundleDisposition(root, "Approved");
  return root;
}

function phases() {
  return [
    {
      phaseId: "phase-01",
      title: "Foundation",
      order: 1,
      purpose: "Prepare the foundation.",
      dependsOn: [],
      sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
    },
    {
      phaseId: "phase-02",
      title: "Workflow",
      order: 2,
      purpose: "Build the workflow.",
      dependsOn: ["phase-01"],
      sourceReferences: ["planning/project/Project_Roadmap"],
    },
  ];
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeCloseout(root, phaseId, status = "Approved", closureDecision = "Close") {
  const directory = path.join(root, "planning/phases", phaseId, "Phase_Closeouts");
  fs.mkdirSync(directory, { recursive: true });
  const stem = `PHASE_CLOSEOUT_${phaseId}`;
  fs.writeFileSync(
    path.join(directory, `${stem}.md`),
    [
      `# Phase Closeout ${phaseId}`,
      "Artifact.Revision=1",
      `phaseId=${phaseId}`,
      `closureDecision=${closureDecision}`,
      "",
      "## Document Disposition",
      "",
      `Document.Status=${status}`,
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(directory, `${stem}.json`),
    JSON.stringify(
      {
        artifactType: "phase-closeout",
        artifactRevision: 1,
        participationRole: "compoundGatingReview",
        phaseId,
        closureDecision,
        documentDisposition: { status },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

test("Phase Map handoff requires Approved project planning bundle", () => {
  const root = createRepository();
  submitProjectIntake(submission(root));

  assert.throws(() => generatePhaseMapHandoff(root, phases()), /Phase Map document is missing|Current Approved input/);
});

test("Phase Map handoff is Approved non-review and does not create placeholder output map", () => {
  const root = readyPlanningRepository();

  const result = generatePhaseMapHandoff(root, phases());
  const handoff = readJson(root, result.handoffJsonPath);

  assert.equal(handoff.participationRole, "nonReviewHandoff");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(handoff.outputTargets.phaseMap.markdown, result.phaseMapMarkdownPath);
  assert.equal(handoff.outputTargets.phaseMap.json, result.phaseMapJsonPath);
  assert.equal(fs.existsSync(path.join(root, result.phaseMapJsonPath)), false);
  seedPhaseMapOutput(root, result, phases());
  const map = readJson(root, result.phaseMapJsonPath);
  assert.equal(map.participationRole, "gatingReview");
  assert.equal(map.documentDisposition.status, "Pending");
  assert.deepEqual(
    Object.keys(map.phases[0]).sort(),
    ["dependsOn", "order", "phaseId", "purpose", "sourceReferences", "title"],
  );
});

test("Phase Map projection derives first incomplete and all complete from closeout evidence", () => {
  const root = readyPlanningRepository();
  seedPhaseMapOutput(root, generatePhaseMapHandoff(root, phases()), phases());
  setPhaseMapDisposition(root, "Approved");

  assert.equal(getPhaseMapProjection(root).state, "first-incomplete");
  assert.equal(getPhaseMapProjection(root).phase.phaseId, "phase-01");

  writeCloseout(root, "phase-01");
  assert.equal(getPhaseMapProjection(root).state, "first-incomplete");
  assert.equal(getPhaseMapProjection(root).phase.phaseId, "phase-02");

  writeCloseout(root, "phase-02");
  assert.equal(getPhaseMapProjection(root).state, "all-complete");
});

test("Phase Map rejects persisted completion authority during projection", () => {
  const root = readyPlanningRepository();
  const result = generatePhaseMapHandoff(root, phases());
  seedPhaseMapOutput(root, result, phases());
  const map = readJson(root, result.phaseMapJsonPath);
  map.phases[0].completed = true;
  fs.writeFileSync(path.join(root, result.phaseMapJsonPath), JSON.stringify(map, null, 2) + "\n", "utf8");
  setPhaseMapDisposition(root, "Approved");

  const projection = getPhaseMapProjection(root);

  assert.equal(projection.state, "malformed");
  assert.match(projection.reason, /must not persist completion/);
});

test("Project planning source revision invalidates older Approved Phase Map", () => {
  const root = readyPlanningRepository();
  seedPhaseMapOutput(root, generatePhaseMapHandoff(root, phases()), phases());
  setPhaseMapDisposition(root, "Approved");
  const profile = listPlanningDocuments(root).find((document) => document.displayFilename === "PROJECT_PROFILE");

  savePlanningDocumentRevision(root, profile.logicalDocumentId);

  assert.equal(getPhaseMapProjection(root).state, "not-approved");
});

test("Phase Map revision invalidates dependent phase evidence", () => {
  const root = readyPlanningRepository();
  const result = generatePhaseMapHandoff(root, phases());
  seedPhaseMapOutput(root, result, phases());
  setPhaseMapDisposition(root, "Approved");
  const phaseMap = listPlanningDocuments(root).find((document) => document.jsonPath === result.phaseMapJsonPath);
  const phaseEvidenceDir = path.join(root, "planning/phases/phase-01/Phase_Interviews");
  fs.mkdirSync(phaseEvidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(phaseEvidenceDir, "PHASE_INTERVIEW_phase-01.md"),
    [
      "# Phase Interview",
      "Artifact.Revision=1",
      "participationRole=gatingReview",
      "phaseId=phase-01",
      "",
      "## Source Revisions",
      `- path: ${result.phaseMapJsonPath} revision: 1`,
      "",
      "## Document Disposition",
      "",
      "Document.Status=Approved",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(phaseEvidenceDir, "PHASE_INTERVIEW_phase-01.json"),
    JSON.stringify(
      {
        artifactType: "phase-interview",
        artifactRevision: 1,
        participationRole: "gatingReview",
        phaseId: "phase-01",
        sourceRevisions: [{ path: result.phaseMapJsonPath, revision: 1 }],
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  const phaseInterview = listPlanningDocuments(root).find((document) => document.displayFilename === "PHASE_INTERVIEW_phase-01");

  savePlanningDocumentRevision(root, phaseMap.logicalDocumentId);

  const updated = listPlanningDocuments(root).find((document) => document.logicalDocumentId === phaseInterview.logicalDocumentId);
  assert.equal(updated.effectiveDisposition, "Pending");
});

test("Phase Map preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
