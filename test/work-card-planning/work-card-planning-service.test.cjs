const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const {
  getWorkCardBuildingEligibility,
  setFormalWorkCardDisposition,
} = require("../../dist/main/workCardPlanning/workCardPlanningService.js");
const {
  getArchitectOutputWorkspaceModel,
  prepareArchitectOutputHandoff,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card planning creates Markdown-only Formal Work Card and approves eligibility", () => {
  const root = tempWorkspace("champcity-work-card-planning-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  const draftPath = prepared.submission.draftSlots[0].draftRelativePath;
  fs.mkdirSync(require("node:path").dirname(require("node:path").join(root, draftPath)), { recursive: true });
  fs.writeFileSync(require("node:path").join(root, draftPath), formalWorkCardBody("WC01"), "utf8");
  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(promoted.documentSlots[0].targetPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(promoted.documentSlots[0].disposition, "Pending");

  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getWorkCardBuildingEligibility(root, "phase-01", "WC01").eligible, true);
});

test("pending Formal Work Card remains byte-identical and blocks new draft preparation", () => {
  const root = tempWorkspace("champcity-work-card-planning-pending-preserve-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  const formalPath = "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
  writeCanonicalFormal(root, formalPath, "Pending");
  const before = fs.readFileSync(require("node:path").join(root, formalPath), "utf8");

  assert.throws(
    () => prepareArchitectOutputHandoff(root, "work-card-planning"),
    /can only replace an absent target or a current RevisionRequested Formal Work Card/,
  );

  assert.equal(fs.readFileSync(require("node:path").join(root, formalPath), "utf8"), before);
});

test("revision requested Formal Work Card prompt includes exact Operator notes and one temporary draft call", () => {
  const root = tempWorkspace("champcity-work-card-planning-revision-prompt-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  const revisionNotes = "Tighten the acceptance proof around renderer-visible state transition.";
  writeCanonicalFormal(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "RevisionRequested", revisionNotes);

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  const instruction = prepared.preparedInstruction;
  const actionBlocks = [...instruction.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((block) => block.action === "create_markdown_artifact");

  assert.match(instruction, new RegExp(revisionNotes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(instruction, /Current Operator revision instructions:/);
  assert.equal(actionBlocks.length, 1);
  assert.equal(actionBlocks[0].params.relativePath, prepared.submission.draftSlots[0].draftRelativePath);
  assert.equal(actionBlocks[0].params.overwrite, false);
  assert.doesNotMatch(instruction, /"relativePath":\s*"planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md"/);
});

function writeCanonicalFormal(root, relativePath, status, notes = "") {
  const {
    writeCanonicalMarkdownDocument,
  } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  writeCanonicalMarkdownDocument({
    workspaceRoot: root,
    relativePath,
    metadata: {
      schemaVersion: 1,
      artifactType: "formal-work-card",
      artifactRevision: 1,
      participationRole: "gatingReview",
      identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
      sourceRevisions: [
        {
          path: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md",
          revision: 1,
        },
      ],
      workflowData: {
        phaseId: "phase-01",
        workCardId: "WC01",
        candidateId: "WC01",
      },
      documentDisposition: { status, notes, reviewedAt: null },
    },
    bodyMarkdown: formalWorkCardBody("WC01"),
  });
}

function formalWorkCardBody(workCardId) {
  return [
    `# ${workCardId} - First Work Card`,
    "",
    "## Verified Repository Evidence",
    "Evidence.",
    "## Objective",
    "Objective.",
    "## Runtime Sequence",
    "Sequence.",
    "## Required Changes",
    "Changes.",
    "## Preserved Behavior",
    "Behavior.",
    "## Authorized Surface",
    "Surface.",
    "## Risks and Constraints",
    "Risks.",
    "## Acceptance Criteria",
    "Criteria.",
    "## Negative Constraints",
    "Constraints.",
    "## Implementer Report Requirements",
    "Report.",
    "## Manual Validation",
    "Manual.",
    "",
  ].join("\n");
}
