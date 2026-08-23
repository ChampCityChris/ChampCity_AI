const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  getArchitectOutputWorkspaceModel,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  getProjectPlanningWorkspaceModel,
  prepareProjectPlanningHandoff,
} = require("../../dist/main/projectPlanning/projectPlanningService.js");
const {
  deriveArchitectInterviewRailStatusFromDocuments,
  deriveProjectLifecycleRailStatuses,
} = require("../../dist/shared/workspaces/projectLifecycleRailStatus.js");
const {
  assignDocumentsToWorkspaces,
  classifyPlanningDocument,
} = require("../../dist/shared/workspaces/documentWorkspace.js");
const {
  classifyLifecycleArtifact,
} = require("../../dist/shared/documents/lifecycleArtifact.js");
const {
  listPlanningDocuments,
  seedApprovedProjectIntake,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("reconstruction repair corpus keeps Project Planning ready and context documents reference-only", () => {
  const root = tempWorkspace("champcity-reconstruction-repair01-");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "main.ts"), "export const app = 'ChampCity A/I';\n", "utf8");

  const seeded = seedApprovedProjectIntake(root, "champcity_a_i");
  writeDoc(root, seeded.intake, "project-intake", "Approved", {
    identity: { "Project.ArtifactKey": "champcity_a_i", projectSlug: "champcity_a_i" },
    workflowData: {
      hasExistingSourceOrPlanning: true,
      repositoryReviewContext: "Reconstruct from the approved clean corpus and current source.",
    },
  });
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "champcity_a_i", projectSlug: "champcity_a_i" },
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  writeDoc(root, "planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md", "context-document", "Approved", {
    participationRole: "contextOnly",
    sourceRevisions: [{ path: "planning/archive/removed-baseline.md", revision: 7 }],
  });
  writeDoc(root, "planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md", "context-document", "Approved", {
    participationRole: "contextOnly",
    sourceRevisions: [{ path: "planning/archive/removed-future-design.md", revision: 3 }],
  });
  fs.mkdirSync(path.join(root, "planning/project/Design_Documents"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md"),
    "# Work Card and Repair Card Creation Standard\n\nReference-only standard.\n",
    "utf8",
  );

  const documents = listPlanningDocuments(root);
  const projectPlanningModel = getProjectPlanningWorkspaceModel(root);
  const statuses = deriveProjectLifecycleRailStatuses(documents, {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: deriveArchitectInterviewRailStatusFromDocuments(documents),
    projectPlanningStatus: projectPlanningModel.railStatus,
  });
  assert.equal(statuses["project-intake-capture"], "Completed");
  assert.equal(statuses["architect-interview"], "Completed");
  assert.equal(statuses["project-planning-review"], "Ready");

  assert.equal(projectPlanningModel.reconciliationMode, "reconciliation-required");
  assert.equal(projectPlanningModel.state, "ready-for-handoff");
  assert.equal(projectPlanningModel.railStatus, "Ready");
  assert.equal(projectPlanningModel.canPrepareHandoff, true);

  const workspaceModel = getArchitectOutputWorkspaceModel(root, "project-planning-review");
  assert.equal(workspaceModel.state, "ready-for-handoff");
  assert.equal(workspaceModel.railStatus, "Ready");
  assert.equal(workspaceModel.canPrepareHandoff, true);
  assert.equal(workspaceModel.reason, projectPlanningModel.reason);

  const projected = assignDocumentsToWorkspaces(documents);
  const baseline = projected.find((document) => document.markdownPath === "planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md");
  const future = projected.find((document) => document.markdownPath === "planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md");
  const standard = projected.find((document) => document.markdownPath === "planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md");
  assert.equal(baseline.workspaceId, "project-planning-review");
  assert.equal(baseline.group, "Context documents");
  assert.equal(future.workspaceId, "project-planning-review");
  assert.equal(future.group, "Context documents");
  assert.notEqual(classifyPlanningDocument(baseline).workspaceId, "phase-planning-bundle");
  assert.notEqual(classifyPlanningDocument(future).workspaceId, "phase-planning-bundle");
  assert.equal(standard.group, "Reference and history");

  for (const document of [baseline, future, standard]) {
    assert.equal(isStrictLifecycleReviewDocument(document, "project-planning-review"), false, document.markdownPath);
  }
  const selectedReviewDocument = documents.find((document) =>
    classifyPlanningDocument(document).workspaceId === "project-planning-review" &&
    isStrictLifecycleReviewDocument(document, "project-planning-review")
  );
  assert.equal(selectedReviewDocument, undefined);

  const prepared = prepareProjectPlanningHandoff(root);
  assert.equal(prepared.state, "waiting-for-output");
  assert.equal(prepared.canCopyHandoff, true);
  assert.equal(fs.existsSync(path.join(root, prepared.handoffMarkdownPath)), true);
});

test("reconstruction repair Project Planning blocker has planning-only evidence across rail and workspace model", () => {
  const root = tempWorkspace("champcity-reconstruction-repair01-blocker-");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export const sourceEvidence = true;\n", "utf8");

  const seeded = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const malformedPath = "planning/project/Design_Documents/MALFORMED_CONTEXT.md";
  fs.mkdirSync(path.dirname(path.join(root, malformedPath)), { recursive: true });
  fs.writeFileSync(
    path.join(root, malformedPath),
    "<!-- CHAMPCITY-METADATA\n{ broken\nCHAMPCITY-METADATA -->\n\n# Broken\n",
    "utf8",
  );

  const documents = listPlanningDocuments(root);
  const projectPlanningModel = getProjectPlanningWorkspaceModel(root);
  assert.equal(projectPlanningModel.state, "needs-attention");
  assert.equal(projectPlanningModel.railStatus, "Needs Attention");
  assert.equal(projectPlanningModel.canPrepareHandoff, false);
  assert.match(projectPlanningModel.reason, /Malformed canonical planning evidence/);
  assert.equal(projectPlanningModel.evidencePaths.every((evidencePath) => evidencePath.startsWith("planning/")), true);
  assert.equal(projectPlanningModel.evidencePaths.includes("src/index.ts"), false);

  const statuses = deriveProjectLifecycleRailStatuses(documents, {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: deriveArchitectInterviewRailStatusFromDocuments(documents),
    projectPlanningStatus: projectPlanningModel.railStatus,
  });
  assert.equal(statuses["project-planning-review"], "Needs Attention");
  assert.equal(statuses["project-phase-map"], "Needs Attention");

  const workspaceModel = getArchitectOutputWorkspaceModel(root, "project-planning-review");
  assert.equal(workspaceModel.state, "needs-attention");
  assert.equal(workspaceModel.railStatus, "Needs Attention");
  assert.equal(workspaceModel.canPrepareHandoff, false);
  assert.equal(workspaceModel.reason, projectPlanningModel.reason);
  assert.deepEqual(workspaceModel.evidencePaths, projectPlanningModel.evidencePaths);

  const statusesAfterActiveWorkspaceProjection = deriveProjectLifecycleRailStatuses(documents, {
    projectIntakeStatus: "Completed",
    architectInterviewStatus: deriveArchitectInterviewRailStatusFromDocuments(documents),
    projectPlanningStatus: projectPlanningModel.railStatus,
  });
  assert.deepEqual(statusesAfterActiveWorkspaceProjection, statuses);
});

function isStrictLifecycleReviewDocument(document, workspaceId) {
  if (
    !document.metadata.canonical ||
    document.readError ||
    (document.documentReadState && document.documentReadState !== "readable")
  ) {
    return false;
  }
  const classification = classifyLifecycleArtifact(document);
  return (
    (
      classification.participationRole === "gatingReview" ||
      classification.participationRole === "compoundGatingReview"
    ) &&
    classification.workspaceId === workspaceId
  );
}
