const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectInterviewWorkspaceModel,
  saveArchitectInterviewDraft,
  setArchitectInterviewDisposition,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  architectBrowserSecuritySummary,
} = require("../../dist/main/browser/architectBrowserService.js");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-architect-interview-"));
}

function submission(root) {
  return {
    projectName: "Interview Workspace",
    projectPurpose: "Capture interview output.",
    desiredOutcome: "Project Intake completes only after a fresh approved interview.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  };
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Architect Interview waits for WC02 prompt target", () => {
  const root = createRepository();
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });

  assert.deepEqual(getArchitectInterviewWorkspaceModel(root), {
    state: "waiting",
    projectIntakeComplete: false,
    reason: "Project Architect Interview Prompt target is not available yet.",
  });
});

test("interview draft uses canonical target and current source revisions", () => {
  const root = createRepository();
  const intake = submitProjectIntake(submission(root));

  const model = saveArchitectInterviewDraft(root, "Interview notes include Interview Workspace.");
  const interview = readJson(root, intake.architectInterviewTargetJsonPath);

  assert.equal(model.state, "ready");
  assert.equal(model.markdownPath, intake.architectInterviewTargetMarkdownPath);
  assert.equal(model.jsonPath, intake.architectInterviewTargetJsonPath);
  assert.equal(interview.artifactRevision, 1);
  assert.equal(interview.documentDisposition.status, "Pending");
  assert.deepEqual(interview.sourceRevisions, [
    { path: intake.projectIntakeJsonPath, revision: 1 },
    { path: intake.architectPromptJsonPath, revision: 1 },
  ]);
});

test("disposition writes are synchronized and Approved interview completes Project Intake", () => {
  const root = createRepository();
  const intake = submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Approved interview notes.");

  const model = setArchitectInterviewDisposition(root, "Approved");
  const markdown = fs.readFileSync(path.join(root, intake.architectInterviewTargetMarkdownPath), "utf8");
  const json = readJson(root, intake.architectInterviewTargetJsonPath);

  assert.equal(model.state, "Approved");
  assert.equal(model.projectIntakeComplete, true);
  assert.match(markdown, /Document.Status=Approved/);
  assert.equal(json.documentDisposition.status, "Approved");
});

test("upstream intake edit makes prior Approved interview stale and incomplete", () => {
  const root = createRepository();
  submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Approved interview notes.");
  setArchitectInterviewDisposition(root, "Approved");

  submitProjectIntake({
    ...submission(root),
    projectPurpose: "Revised purpose after interview.",
  });
  const model = getArchitectInterviewWorkspaceModel(root);

  assert.equal(model.projectIntakeComplete, false);
  assert.equal(model.freshnessState, "stale");
  assert.match(model.reason, /remains incomplete/);
});

test("revision requested and rejected states remain on interview pair", () => {
  const root = createRepository();
  submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Needs more detail.");

  assert.equal(setArchitectInterviewDisposition(root, "RevisionRequested").state, "RevisionRequested");
  assert.equal(setArchitectInterviewDisposition(root, "Rejected").state, "Rejected");
});

test("WC04 preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
