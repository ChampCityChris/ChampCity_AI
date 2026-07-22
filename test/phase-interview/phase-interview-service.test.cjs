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
  __setPlanningDocumentServiceTestHooks,
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
  generatePhaseMapHandoff,
  setPhaseMapDisposition,
} = require("../../dist/main/phaseMap/phaseMapService.js");
const {
  generatePhaseInterviewHandoff,
  getPhaseIntakeCompletion,
  setPhaseInterviewDisposition,
} = require("../../dist/main/phaseInterview/phaseInterviewService.js");
const {
  seedPhaseInterviewOutput,
  seedPhaseMapOutput,
  seedProjectPlanningOutputs,
} = require("../support/architect-output-fixtures.cjs");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-phase-interview-"));
}

function submission(root) {
  return {
    projectName: "Phase Interview Project",
    projectPurpose: "Create phase interview.",
    desiredOutcome: "A selected phase interview is reviewed.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  };
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

function readyPlanningRepository() {
  const root = createRepository();
  submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Approved interview for phase interview.");
  setArchitectInterviewDisposition(root, "Approved");
  seedProjectPlanningOutputs(root, generateProjectPlanningHandoff(root));
  setProjectPlanningBundleDisposition(root, "Approved");
  return root;
}

function readyPhaseMapRepository() {
  const root = readyPlanningRepository();
  seedPhaseMapOutput(root, generatePhaseMapHandoff(root, phases()), phases());
  setPhaseMapDisposition(root, "Approved");
  return root;
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

test("Phase Interview handoff requires resolver-selected phase", () => {
  const root = readyPlanningRepository();

  assert.throws(() => generatePhaseInterviewHandoff(root), /Resolver-selected phase is unavailable/);
});

test("Phase Interview handoff is Approved non-review for resolver-selected phase", () => {
  const root = readyPhaseMapRepository();

  const result = generatePhaseInterviewHandoff(root, {
    clarificationRequired: true,
    questionsAndAnswers: [{ question: "What matters?", answer: "Foundation first." }],
  });
  const handoff = readJson(root, result.handoffJsonPath);

  assert.equal(result.phaseId, "phase-01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-01.md");
  assert.equal(handoff.participationRole, "nonReviewHandoff");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(handoff.outputTargets.phaseInterview.markdown, "planning/phases/phase-01/Phase_Interview.md");
  assert.equal(handoff.outputTargets.phaseInterview.json, "planning/phases/phase-01/Phase_Interview.json");
  assert.equal(fs.existsSync(path.join(root, result.interviewJsonPath)), false);
});

test("Phase Interview no-questions path remains handoff-only", () => {
  const root = readyPhaseMapRepository();

  const result = generatePhaseInterviewHandoff(root);

  assert.equal(fs.existsSync(path.join(root, result.interviewJsonPath)), false);
});

test("Approved current Phase Interview completes Phase Intake", () => {
  const root = readyPhaseMapRepository();
  seedPhaseInterviewOutput(root, generatePhaseInterviewHandoff(root));

  assert.equal(getPhaseIntakeCompletion(root).complete, false);
  setPhaseInterviewDisposition(root, "phase-01", "Approved");

  assert.deepEqual(getPhaseIntakeCompletion(root), {
    complete: true,
    phaseId: "phase-01",
    reason: "Phase Intake is complete because the current Phase Interview is synchronized, fresh, and Approved.",
  });
});

test("prior closeout context is included for the next resolver-selected phase", () => {
  const root = readyPhaseMapRepository();
  writeCloseout(root, "phase-01");

  const result = generatePhaseInterviewHandoff(root);
  const handoff = readJson(root, result.handoffJsonPath);

  assert.equal(result.phaseId, "phase-02");
  assert.equal(handoff.sourceRevisions.some((source) => source.path.includes("PHASE_CLOSEOUT_phase-01.json")), true);
});

test("Phase Map revision invalidates older Approved Phase Interview", () => {
  const root = readyPhaseMapRepository();
  seedPhaseInterviewOutput(root, generatePhaseInterviewHandoff(root));
  setPhaseInterviewDisposition(root, "phase-01", "Approved");
  const phaseMap = listPlanningDocuments(root).find((document) =>
    document.jsonPath === "planning/project/Phase_Map/PHASE_MAP_phase_interview_project.json"
  );

  savePlanningDocumentRevision(root, phaseMap.logicalDocumentId);

  assert.equal(getPhaseIntakeCompletion(root, "phase-01").complete, false);
});

test("Phase Interview local read errors prevent completion without blocking other documents", (t) => {
  const root = readyPhaseMapRepository();
  seedPhaseInterviewOutput(root, generatePhaseInterviewHandoff(root));
  setPhaseInterviewDisposition(root, "phase-01", "Approved");
  __setPlanningDocumentServiceTestHooks({
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-01/Phase_Interview.md"
        ? "Injected phase interview read failure."
        : undefined,
  });
  t.after(() => __setPlanningDocumentServiceTestHooks());

  assert.equal(getPhaseIntakeCompletion(root, "phase-01").complete, false);
});

test("Phase Interview preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
