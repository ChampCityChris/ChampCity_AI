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
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  generateProjectPlanningHandoff,
  getProjectPlanningCompletion,
  setProjectPlanningBundleDisposition,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-project-planning-"));
}

function submission(root) {
  return {
    projectName: "Planning Bundle",
    projectPurpose: "Create project planning bundle.",
    desiredOutcome: "Project Profile and Roadmap are reviewed together.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  };
}

function readyRepository() {
  const root = createRepository();
  submitProjectIntake(submission(root));
  saveArchitectInterviewDraft(root, "Approved interview for planning.");
  setArchitectInterviewDisposition(root, "Approved");
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Project Planning handoff requires Approved current interview", () => {
  const root = createRepository();
  submitProjectIntake(submission(root));

  assert.throws(() => generateProjectPlanningHandoff(root), /Current Approved input/);
});

test("Project Planning handoff is Approved non-review and names exact outputs", () => {
  const root = readyRepository();

  const result = generateProjectPlanningHandoff(root);
  const handoff = readJson(root, result.handoffJsonPath);

  assert.equal(handoff.participationRole, "nonReviewHandoff");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(handoff.outputTargets.projectProfile.markdown, "planning/project/PROJECT_PROFILE.md");
  assert.equal(handoff.outputTargets.projectProfile.json, "planning/project/PROJECT_PROFILE.json");
  assert.equal(handoff.outputTargets.projectRoadmap.markdown, result.roadmapMarkdownPath);
  assert.equal(handoff.outputTargets.projectRoadmap.json, result.roadmapJsonPath);
  assert.equal(handoff.sourceRevisions.length, 3);
});

test("Project Profile and Roadmap begin Pending with source revisions", () => {
  const root = readyRepository();
  const result = generateProjectPlanningHandoff(root);
  const profile = readJson(root, result.profileJsonPath);
  const roadmap = readJson(root, result.roadmapJsonPath);

  assert.equal(profile.documentDisposition.status, "Pending");
  assert.equal(roadmap.documentDisposition.status, "Pending");
  assert.equal(profile.participationRole, "compoundGatingReview");
  assert.deepEqual(profile.sourceRevisions, roadmap.sourceRevisions);
});

test("shared bundle disposition approves both planning documents", () => {
  const root = readyRepository();
  const result = generateProjectPlanningHandoff(root);

  setProjectPlanningBundleDisposition(root, "Approved");

  assert.equal(readJson(root, result.profileJsonPath).documentDisposition.status, "Approved");
  assert.equal(readJson(root, result.roadmapJsonPath).documentDisposition.status, "Approved");
  assert.equal(getProjectPlanningCompletion(root).complete, true);
});

test("shared bundle disposition rolls back all four planning files after injected failure", () => {
  const root = readyRepository();
  const result = generateProjectPlanningHandoff(root);
  const files = [
    result.profileMarkdownPath,
    result.profileJsonPath,
    result.roadmapMarkdownPath,
    result.roadmapJsonPath,
  ];
  const before = new Map(
    files.map((relativePath) => [
      relativePath,
      fs.readFileSync(path.join(root, relativePath), "utf8"),
    ]),
  );

  assert.throws(
    () => setProjectPlanningBundleDisposition(root, "Approved", { failAfterWrites: 2 }),
    /Injected write failure/,
  );

  for (const relativePath of files) {
    assert.equal(fs.readFileSync(path.join(root, relativePath), "utf8"), before.get(relativePath));
  }
  assert.equal(getProjectPlanningCompletion(root).complete, false);
});

test("mixed missing bundle cannot complete Project Planning", () => {
  const root = readyRepository();
  generateProjectPlanningHandoff(root);

  assert.equal(getProjectPlanningCompletion(root).complete, false);
});

test("upstream interview revision makes older planning bundle incomplete", () => {
  const root = readyRepository();
  generateProjectPlanningHandoff(root);
  setProjectPlanningBundleDisposition(root, "Approved");

  saveArchitectInterviewDraft(root, "Revised interview after planning.");

  assert.equal(getProjectPlanningCompletion(root).complete, false);
});

test("Project Planning preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
