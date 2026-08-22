const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generatePhasePlanningHandoff,
  getPhasePlanningCompletion,
  getPhasePlanningWorkspaceModel,
  preparePhasePlanningHandoff,
  reviewPhasePlanningBundle,
} = require("../../dist/main/phasePlanning/phasePlanningService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  listPlanningDocuments,
  seedApprovedPhaseInterview,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

const candidate = {
  candidateId: "WC37A",
  order: 1,
  title: "Phase Planning Bundle",
  purpose: "Implement the phase planning cutover.",
  dependsOn: [],
  resolutionStatus: "planned",
  resolutionReason: "",
  evidencePaths: [],
};

function validPhasePlanningBody() {
  return [
    "# Phase Planning",
    "",
    "## Phase Objective",
    "Objective.",
    "## Scope",
    "Scope.",
    "## Non-Scope",
    "Non-scope.",
    "## Inherited Constraints",
    "Constraints.",
    "## Architecture and Implementation Direction",
    "Direction.",
    "## Major Deliverables",
    "Deliverables.",
    "## Dependencies",
    "Dependencies.",
    "## Risks and Mitigations",
    "Risks.",
    "## Validation Strategy",
    "Validation.",
    "## Acceptance Criteria",
    "Acceptance.",
    "## Sequencing Direction",
    "Sequence.",
    "## Deferred Items",
    "Deferred.",
    "## Unresolved Questions",
    "Questions.",
  ].join("\n");
}

function validWorkCardPlanBody() {
  return [
    "# Work Card Plan",
    "",
    "```champcity-work-card-plan",
    JSON.stringify([candidate], null, 2),
    "```",
  ].join("\n");
}

function writeDraft(root, relativePath, body) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, body, "utf8");
}

function seedReadyRoot(prefix) {
  const root = tempWorkspace("champcity-phase-planning-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  return root;
}

function draftPathsFromInstruction(instruction) {
  return [...instruction.matchAll(/"relativePath": "([^"]+)"/g)].map((match) => match[1]);
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function promoteValidBundle(root) {
  const result = generatePhasePlanningHandoff(root);
  let model = getPhasePlanningWorkspaceModel(root);
  const draftPaths = draftPathsFromInstruction(model.handoffInstruction);
  writeDraft(root, draftPaths[0], validPhasePlanningBody());
  writeDraft(root, draftPaths[1], validWorkCardPlanBody());
  model = getPhasePlanningWorkspaceModel(root);
  return { result, model, draftPaths };
}

test("phase planning handoff uses one atomic draft bundle and promotes both outputs", () => {
  const root = seedReadyRoot("happy");

  const result = generatePhasePlanningHandoff(root);
  assert.equal(result.phasePlanningMarkdownPath, "planning/phases/phase-01/Phase_Planning.md");
  assert.equal(result.workCardPlanMarkdownPath, "planning/phases/phase-01/Work_Card_Plan.md");
  assert.equal(["workCardPlan", "Json", "Path"].join("") in result, false);

  let model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "waiting-for-drafts");
  assert.doesNotMatch(model.handoffInstruction, /Initial Work Card/);
  assert.match(model.handoffInstruction, /"overwrite": false/);
  assert.equal((model.handoffInstruction.match(/"action": "create_markdown_artifact"/g) ?? []).length, 2);
  assert.match(model.handoffInstruction, /host environment and repository foundation/);
  assert.match(model.handoffInstruction, /managed capability means ChampCity provisions and verifies it/i);
  assert.match(model.handoffInstruction, /external capability means approved evidence establishes outside ownership/i);
  assert.match(model.handoffInstruction, /human-interaction boundary means ChampCity prepares the action/i);
  assert.match(model.handoffInstruction, /Do not use phrases like prerequisite problem or Operator must install/i);
  assert.match(model.handoffInstruction, /establish and verify missing or unverified managed development capabilities before candidates that depend on them/i);
  const draftPaths = draftPathsFromInstruction(model.handoffInstruction);
  assert.equal(draftPaths.length, 2);

  writeDraft(root, draftPaths[0], validPhasePlanningBody());
  model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "partial-draft-set");
  assert.equal(fs.existsSync(path.join(root, result.phasePlanningMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, result.workCardPlanMarkdownPath)), false);

  writeDraft(root, draftPaths[1], validWorkCardPlanBody());
  model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "promoted");
  assert.equal(model.phasePlanningDocument.disposition, "Pending");
  assert.equal(model.workCardPlanDocument.disposition, "Pending");
  assert.deepEqual(
    model.workCardPlanDocument && listPlanningDocuments(root)
      .find((document) => document.markdownPath === result.workCardPlanMarkdownPath)
      .metadata.canonical.workflowData.candidates,
    [candidate],
  );

  model = reviewPhasePlanningBundle(root, "Approved", "");
  assert.equal(model.phasePlanningDocument.disposition, "Approved");
  assert.equal(model.workCardPlanDocument.disposition, "Approved");
  assert.equal(getPhasePlanningCompletion(root, "phase-01").complete, true);
});

test("phase planning malformed draft retains drafts and explicit retry uses fresh paths", () => {
  const root = seedReadyRoot("malformed");
  const result = generatePhasePlanningHandoff(root);
  let model = getPhasePlanningWorkspaceModel(root);
  const firstDraftPaths = draftPathsFromInstruction(model.handoffInstruction);
  writeDraft(root, firstDraftPaths[0], validPhasePlanningBody());
  writeDraft(root, firstDraftPaths[1], "# Work Card Plan\n\n```champcity-work-card-plan\n{\"candidates\": []}\n```");

  model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "promotion-failed");
  assert.match(model.draftPromotionError, /candidates must be an array/);
  assert.equal(fs.existsSync(path.join(root, result.phasePlanningMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, result.workCardPlanMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[0])), true);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[1])), true);

  model = preparePhasePlanningHandoff(root);
  const retryDraftPaths = draftPathsFromInstruction(model.handoffInstruction);
  assert.equal(retryDraftPaths.length, 2);
  assert.notDeepEqual(retryDraftPaths, firstDraftPaths);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[0])), true);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[1])), true);
});

test("phase planning RevisionRequested bundle revises both documents once and resets review state", () => {
  const root = seedReadyRoot("revision");
  const { result } = promoteValidBundle(root);
  reviewPhasePlanningBundle(root, "RevisionRequested", "Tighten the sequencing and split the bundle work.");

  let model = preparePhasePlanningHandoff(root);
  const draftPaths = draftPathsFromInstruction(model.handoffInstruction);
  writeDraft(root, draftPaths[0], `${validPhasePlanningBody()}\n\nRevision pass.`);
  writeDraft(root, draftPaths[1], validWorkCardPlanBody());
  model = getPhasePlanningWorkspaceModel(root);

  assert.equal(model.draftSubmissionState, "promoted");
  const phasePlanning = readCanonical(root, result.phasePlanningMarkdownPath);
  const workCardPlan = readCanonical(root, result.workCardPlanMarkdownPath);
  assert.equal(phasePlanning.metadata.artifactRevision, 2);
  assert.equal(workCardPlan.metadata.artifactRevision, 2);
  assert.equal(phasePlanning.metadata.documentDisposition.status, "Pending");
  assert.equal(workCardPlan.metadata.documentDisposition.status, "Pending");
  assert.equal(phasePlanning.metadata.documentDisposition.notes, "");
  assert.equal(workCardPlan.metadata.documentDisposition.notes, "");
  assert.equal(phasePlanning.metadata.documentDisposition.reviewedAt, null);
  assert.equal(workCardPlan.metadata.documentDisposition.reviewedAt, null);
});
