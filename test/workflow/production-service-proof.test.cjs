const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  listPlanningDocuments,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  submitProjectIntake,
} = require("../support/legacy-project-intake-fixture.cjs");
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
  fs.mkdirSync(path.join(root, ".champcity"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".champcity", "mcp-workspace-binding.json"),
    JSON.stringify({
      mcpWorkspaceId: "alpha",
      label: "Alpha Test Workspace",
      repositoryName: "Test/Alpha",
      gitBacked: true,
    }, null, 2),
    "utf8",
  );
  return root;
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function assertSingleMarkdown(root, relativePath) {
  assert.equal(fs.existsSync(path.join(root, relativePath)), true);
  assert.equal(fs.existsSync(path.join(root, relativePath.replace(/\.md$/, ".json"))), false);
}

test("Proof 2 production-service workflow reaches Project Planning after revised structured Architect output", async context => {
  const env = await require("../support/structured-architect-fixture.cjs").structuredArchitectFixture(context);
  assert.equal(getCurrentWorkspaceModel(env.root).activeWorkspaceId, "architect-interview");
  await env.architect.review(env.root, env.workflow.id, env.candidate.review.cycleId, {expectedRecordVersion: 1, outcome: "revision_requested", notes: "Clarify full Planning direction"});
  const revised = await env.architect.save(env.root, env.workflow.id, {...env.input, expectedCycleVersion: 1, output: {...env.output, projectPlanningDirection: ["Full adopted scope and dependencies"]}});
  await env.architect.review(env.root, env.workflow.id, revised.review.cycleId, {expectedRecordVersion: 2, outcome: "approved"});
  fs.unlinkSync(path.join(env.root, revised.review.relativePath));
  const model = getCurrentWorkspaceModel(env.root); assert.equal(model.activeWorkspaceId, "project-planning-review");
  assert.ok(model.sourceEvidence.includes(revised.review.relativePath)); assert.deepEqual(getCurrentWorkspaceModel(env.root), model);
});

test("current workflow opens missing Phase Map with Profile and Roadmap input evidence", async () => {
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
