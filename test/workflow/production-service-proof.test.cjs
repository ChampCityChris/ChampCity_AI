const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectInterviewWorkspaceModel,
  reviewArchitectInterview,
  prepareArchitectInterviewHandoff,
} = require("../../dist/main/architectInterview/architectInterviewService.js");
const {
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  listPlanningDocuments,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedProjectIntake,
  tempWorkspace: tempCanonicalWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-proof2-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function assertSingleMarkdown(root, relativePath) {
  assert.equal(fs.existsSync(path.join(root, relativePath)), true);
  assert.equal(fs.existsSync(path.join(root, relativePath.replace(/\.md$/, ".json"))), false);
}

function submitDraft(root, body) {
  const prepared = prepareArchitectInterviewHandoff(root);
  const draftPath = prepared.handoffInstruction.match(/Temporary draft Markdown: ([^\n]+)/)[1];
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), body, "utf8");
  return getArchitectInterviewWorkspaceModel(root);
}

test("Proof 2 production-service workflow reaches Project Planning after revised Architect output", () => {
  const root = tempWorkspace();
  const intakeResult = submitProjectIntake({
    projectName: "Proof Two",
    projectPurpose: "Verify the production service path.",
    desiredOutcome: "Architect output revision advances to Project Planning.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "",
    repositoryReviewContext: "",
  });

  assertSingleMarkdown(root, intakeResult.projectIntakeMarkdownPath);
  assertSingleMarkdown(root, intakeResult.architectPromptMarkdownPath);
  const intakeDocument = listPlanningDocuments(root).find((document) => document.markdownPath === intakeResult.projectIntakeMarkdownPath);
  setDocumentDisposition(root, intakeDocument.logicalDocumentId, "Approved");

  const waiting = getArchitectInterviewWorkspaceModel(root);
  assert.equal(waiting.railStatus, "Waiting for Output");
  assert.equal(waiting.interviewTargets.markdownPath, intakeResult.architectInterviewTargetMarkdownPath);

  const firstSave = submitDraft(root, "# Project Understanding\n\nInitial Architect body.\n");
  const interviewPath = firstSave.interviewTargets.markdownPath;
  assertSingleMarkdown(root, interviewPath);
  let parsed = readCanonical(root, interviewPath);
  assert.equal(parsed.metadata.artifactRevision, 1);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.match(parsed.bodyMarkdown, /Initial Architect body/);
  assert.deepEqual(parsed.metadata.sourceRevisions, [
    { path: intakeResult.projectIntakeMarkdownPath, revision: 1 },
    { path: intakeResult.architectPromptMarkdownPath, revision: 1 },
  ]);

  reviewArchitectInterview(root, "RevisionRequested", "Tighten the planning implications.", undefined);
  parsed = readCanonical(root, interviewPath);
  assert.equal(parsed.metadata.artifactRevision, 1);
  assert.equal(parsed.metadata.documentDisposition.status, "RevisionRequested");
  assert.equal(parsed.metadata.documentDisposition.notes, "Tighten the planning implications.");

  submitDraft(root, "# Project Understanding\n\nRevised Architect body with planning implications.\n");
  parsed = readCanonical(root, interviewPath);
  assert.equal(parsed.metadata.artifactRevision, 2);
  assert.equal(parsed.metadata.documentDisposition.status, "Pending");
  assert.match(parsed.bodyMarkdown, /Revised Architect body/);
  assert.deepEqual(parsed.metadata.sourceRevisions, [
    { path: intakeResult.projectIntakeMarkdownPath, revision: 1 },
    { path: intakeResult.architectPromptMarkdownPath, revision: 1 },
  ]);

  reviewArchitectInterview(root, "Approved", "", undefined);
  parsed = readCanonical(root, interviewPath);
  assert.equal(parsed.metadata.artifactRevision, 2);
  assert.equal(parsed.metadata.documentDisposition.status, "Approved");

  const projectPlanning = getCurrentWorkspaceModel(root);
  assert.equal(projectPlanning.activeWorkspaceId, "project-planning-review");
  assert.equal(projectPlanning.sourceEvidence.includes(interviewPath), true);

  const reconstructed = getCurrentWorkspaceModel(root);
  assert.deepEqual(reconstructed, projectPlanning);
});

test("current workflow opens missing Phase Map with Profile and Roadmap input evidence", () => {
  const root = tempCanonicalWorkspace("champcity-current-phase-map-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
  const handoff = writeDoc(
    root,
    "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_demo.md",
    "generated-handoff",
    "Approved",
    {
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "project-planning", "Project.ArtifactKey": "demo" },
      sourceRevisions: [
        { path: intake, revision: 1 },
        { path: prompt, revision: 1 },
        { path: interview, revision: 1 },
      ],
      workflowData: {
        handoffKind: "project-planning",
        projectProfileTarget: "planning/project/PROJECT_PROFILE.md",
        projectRoadmapTarget: "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
      },
    },
  );
  const profile = writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
      { path: interview, revision: 1 },
      { path: handoff, revision: 1 },
    ],
  });
  const roadmap = writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
      { path: interview, revision: 1 },
      { path: handoff, revision: 1 },
    ],
  });

  const model = getCurrentWorkspaceModel(root);

  assert.equal(model.activeWorkspaceId, "project-phase-map");
  assert.deepEqual(model.sourceEvidence, [profile, roadmap]);
  assert.equal(model.eligibility, "Ready");
});
