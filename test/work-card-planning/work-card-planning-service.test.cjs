const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  formalWorkCardArchitectOutputDefinition,
  getActiveFormalWorkCardDraftSubmission,
  getWorkCardBuildingEligibility,
  setFormalWorkCardDisposition,
} = require("../../dist/main/workCardPlanning/workCardPlanningService.js");
const {
  getArchitectOutputWorkspaceModel,
  prepareArchitectOutputHandoff,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  beginWorkCardPlanningForCandidate,
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
  listPlanningDocuments,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card planning creates Markdown-only Formal Work Card and approves eligibility", () => {
  const root = tempWorkspace("champcity-work-card-planning-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  const intakeHandoff = generateWorkCardIntakeHandoff(root, "phase-01");
  const intakeCanonical = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, intakeHandoff.handoffMarkdownPath), "utf8"),
  );
  assert.equal(intakeCanonical.metadata.workflowData.repositoryAuthority.projectRepository, path.resolve(root));
  assert.equal(intakeCanonical.metadata.workflowData.repositoryAuthority.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  assert.match(prepared.preparedInstruction, /Use ChampCity MCP workspaceId "alpha" only/);
  const draftPath = prepared.submission.draftSlots[0].draftRelativePath;
  fs.mkdirSync(path.dirname(path.join(root, draftPath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftPath), formalWorkCardBody("WC01"), "utf8");
  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(promoted.documentSlots[0].targetPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(promoted.documentSlots[0].disposition, "Pending");
  const formalCanonical = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md"), "utf8"),
  );
  assert.deepEqual(
    formalCanonical.metadata.workflowData.repositoryAuthority,
    intakeCanonical.metadata.workflowData.repositoryAuthority,
  );

  setFormalWorkCardDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getWorkCardBuildingEligibility(root, "phase-01", "WC01").eligible, true);
});

test("formal Work Card preparation targets the active selected candidate", () => {
  const root = tempWorkspace("champcity-work-card-planning-active-candidate-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  writeSimultaneouslyEligiblePhasePlanningBundle(root);

  const handoff = beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  assert.equal(handoff.candidateId, "WC02");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  assert.equal(
    prepared.handoff.path,
    "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md",
  );
  assert.equal(
    prepared.documentSlots.find((slot) => slot.slotId === "formal-work-card").targetPath,
    "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
  );

  writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, formalWorkCardBody("WC02"));
  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(
    promoted.documentSlots.find((slot) => slot.slotId === "formal-work-card").targetPath,
    "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
  );
  const canonical = parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md"), "utf8"),
  );
  assert.equal(canonical.metadata.identity.workCardId, "WC02");
  assert.equal(canonical.metadata.identity.candidateId, "WC02");
});

test("formal Work Card promotion accepts substantive bodies with embedded heading examples", () => {
  const root = tempWorkspace("champcity-work-card-planning-heading-examples-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, formalBodyWithEmbeddedHeadingExamples("WC01"));

  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  const slot = promoted.documentSlots[0];
  const finalPath = "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
  const canonical = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, finalPath), "utf8"));

  assert.equal(promoted.state, "ready-for-review");
  assert.equal(slot.targetPath, finalPath);
  assert.equal(slot.disposition, "Pending");
  assert.ok(slot.logicalDocumentId);
  assert.equal(promoted.canApplyDisposition, true);
  assert.equal(canonical.metadata.artifactType, "formal-work-card");
  assert.equal(canonical.metadata.documentDisposition.status, "Pending");
  assert.equal(canonical.metadata.identity.workCardId, "WC01");
  assert.equal(canonical.bodyMarkdown.includes("```markdown\n# Example Architecture Decision"), true);
  assert.equal(fs.existsSync(path.join(root, prepared.submission.draftSlots[0].draftRelativePath)), false);
});

test("formal Work Card promotion accepts substantive bodies without the former heading shape", () => {
  const root = tempWorkspace("champcity-work-card-planning-freeform-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  writeDraft(
    root,
    prepared.submission.draftSlots[0].draftRelativePath,
    [
      "This is a substantive body-only implementation contract.",
      "",
      "It intentionally does not use the former exact H1/H2 template.",
      "The Operator and Architect review whether this organization is good enough.",
    ].join("\n"),
  );

  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(promoted.state, "ready-for-review");
  assert.equal(promoted.documentSlots[0].targetPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(promoted.documentSlots[0].disposition, "Pending");
});

test("formal Work Card promotion validates champcity-development-environment block", () => {
  const root = tempWorkspace("champcity-work-card-planning-dev-env-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  writeDraft(
    root,
    prepared.submission.draftSlots[0].draftRelativePath,
    [
      formalWorkCardBody("WC01"),
      "```champcity-development-environment",
      JSON.stringify({
        schemaVersion: 1,
        requirements: [{
          capabilityId: "nodejs",
          provisioning: "managed",
        }],
      }, null, 2),
      "```",
    ].join("\n"),
  );

  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(promoted.state, "ready-for-review");
});

test("formal Work Card promotion rejects malformed champcity-development-environment block", () => {
  const root = tempWorkspace("champcity-work-card-planning-dev-env-reject-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  const finalPath = "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");

  writeDraft(
    root,
    prepared.submission.draftSlots[0].draftRelativePath,
    [
      formalWorkCardBody("WC01"),
      "```champcity-development-environment",
      JSON.stringify({
        schemaVersion: 1,
        requirements: [{
          capabilityId: "",
          provisioning: "operatorInstalled",
        }],
      }, null, 2),
      "```",
    ].join("\n"),
  );

  const failed = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(failed.state, "promotion-failed");
  assert.match(failed.promotionError, /non-empty capabilityId|provisioning must be managed or external/);
  assert.equal(fs.existsSync(path.join(root, finalPath)), false);
});

test("formal Work Card retained validators reject empty and metadata drafts without final mutation", () => {
  {
    const root = tempWorkspace("champcity-work-card-planning-empty-reject-");
    seedApprovedProjectPlanning(root);
    seedPhaseMap(root, "phase-01");
    seedApprovedPhaseInterview(root, "phase-01");
    seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
    generateWorkCardIntakeHandoff(root, "phase-01");
    const finalPath = "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
    const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");

    writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, "   \n");
    const failed = getArchitectOutputWorkspaceModel(root, "work-card-planning");

    assert.equal(failed.state, "promotion-failed");
    assert.match(failed.promotionError, /empty/);
    assert.equal(fs.existsSync(path.join(root, finalPath)), false);
    assert.equal(fs.existsSync(path.join(root, prepared.submission.draftSlots[0].draftRelativePath)), true);
  }

  {
    const root = tempWorkspace("champcity-work-card-planning-metadata-reject-");
    seedApprovedProjectPlanning(root);
    seedPhaseMap(root, "phase-01");
    seedApprovedPhaseInterview(root, "phase-01");
    seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
    generateWorkCardIntakeHandoff(root, "phase-01");
    const finalPath = "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
    writeCanonicalFormal(root, finalPath, "RevisionRequested", "Remove caller metadata.");
    const before = fs.readFileSync(path.join(root, finalPath), "utf8");
    const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");

    writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, `${metadataOpenDelimiter}\n{}\n-->\n\nBody.`);
    const failed = getArchitectOutputWorkspaceModel(root, "work-card-planning");

    assert.equal(failed.state, "promotion-failed");
    assert.match(failed.promotionError, /metadata delimiters/);
    assert.equal(fs.readFileSync(path.join(root, finalPath), "utf8"), before);
    assert.equal(fs.existsSync(path.join(root, prepared.submission.draftSlots[0].draftRelativePath)), true);
  }
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
  assert.match(instruction, /Application-owned Implementer Report target:\n- planning\/phases\/phase-01\/Implementer_Reports\/IMPLEMENTER_REPORT_WC01_first_work_card\.md/);
  assert.match(instruction, /Bound workspaceId: alpha/);
  assert.match(instruction, /Use ChampCity MCP workspaceId "alpha" only\./);
  assert.match(instruction, /If the bound workspace cannot be verified through these exact paths, stop with BLOCKED_WORKSPACE_OR_ARTIFACT_MISMATCH/);
  assert.match(instruction, /Application-owned selected workspace target binding:/);
  assert.match(instruction, /selected MCP workspaceId: alpha/);
  assert.match(instruction, /approved Work Card Intake handoff path: planning\/phases\/phase-01\/Architect_Handoffs\/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01\.md/);
  assert.match(instruction, /Formal Work Card target path: planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md/);
  assert.match(instruction, /Implementer Report target path: planning\/phases\/phase-01\/Implementer_Reports\/IMPLEMENTER_REPORT_WC01_first_work_card\.md/);
  assert.match(instruction, /phase ID: phase-01/);
  assert.match(instruction, /candidate ID: WC01/);
  assert.match(instruction, /selected workspace verification evidence/);
  assert.match(instruction, /Implementer Report Requirements must name the exact application-owned Implementer Report target above/);
  assert.match(instruction, /updates that existing canonical report rather than creating an alternate report/);
  assert.match(instruction, /Implementation is incomplete until the report at that exact path contains the complete auditable evidence/);
  assert.match(instruction, /champcity-development-environment/);
  assert.match(instruction, /provisioning set only to managed or external/);
  assert.match(instruction, /Do not place installer commands, package IDs, download URLs/);
  assert.match(instruction, /managed machine-level setup is authorized implementation work/);
  assert.doesNotMatch(instruction, /ChampCity_AI/);
  assert.doesNotMatch(instruction, /champcity_ai/);
  assert.equal(actionBlocks.length, 1);
  assert.equal(actionBlocks[0].workspaceId, "alpha");
  assert.equal(actionBlocks[0].params.relativePath, prepared.submission.draftSlots[0].draftRelativePath);
  assert.equal(actionBlocks[0].params.overwrite, false);
  assert.doesNotMatch(instruction, /"relativePath":\s*"planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md"/);
});

test("formal Work Card promotion context rejects mismatched active target evidence", () => {
  const root = tempWorkspace("champcity-work-card-planning-target-guard-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");

  prepareArchitectOutputHandoff(root, "work-card-planning");
  const active = getActiveFormalWorkCardDraftSubmission(root);
  assert.ok(active);

  assert.throws(
    () => formalWorkCardArchitectOutputDefinition.resolvePromotionContext({
      workspaceRoot: root,
      submission: active.submission,
      preparedContext: {
        ...active.preparedContext,
        targetPath: "planning/phases/phase-01/Work_Cards/WC99_wrong_target.md",
      },
    }),
    /Formal Work Card draft no longer matches the current Work Card Intake handoff/,
  );
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

function writeDraft(root, draftRelativePath, bodyMarkdown) {
  fs.mkdirSync(path.dirname(path.join(root, draftRelativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftRelativePath), bodyMarkdown, "utf8");
}

function writeSimultaneouslyEligiblePhasePlanningBundle(root) {
  const phaseId = "phase-01";
  const documents = listPlanningDocuments(root);
  const sourceRevisions = [
    "planning/project/PROJECT_PROFILE.md",
    "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md",
    "planning/project/Phase_Map/PHASE_MAP_demo.md",
    `planning/phases/${phaseId}/Phase_Interview.md`,
  ].map((markdownPath) => {
    const document = documents.find((candidate) => candidate.markdownPath === markdownPath);
    return document
      ? { path: document.markdownPath, revision: document.metadata.artifactRevision ?? 1 }
      : null;
  }).filter(Boolean);
  const candidates = [
    {
      candidateId: "WC01",
      order: 1,
      title: "First Work Card",
      purpose: "Implement the first unit.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC02",
      order: 2,
      title: "Second Work Card",
      purpose: "Implement the second unit.",
      dependsOn: [],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
  ];
  writeDoc(root, `planning/phases/${phaseId}/Phase_Planning.md`, "phase-planning", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
  });
  writeDoc(root, `planning/phases/${phaseId}/Work_Card_Plan.md`, "work-card-plan", "Approved", {
    participationRole: "compoundGatingReview",
    identity: { phaseId },
    sourceRevisions,
    workflowData: { candidates },
    bodyMarkdown: `# Work Card Plan\n\n\`\`\`champcity-work-card-plan\n${JSON.stringify(candidates, null, 2)}\n\`\`\`\n`,
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

function formalBodyWithEmbeddedHeadingExamples(workCardId) {
  return [
    `# ${workCardId} - First Work Card`,
    "",
    "The body is substantive and includes exact examples the Implementer must create.",
    "",
    "```markdown",
    "# Example Architecture Decision",
    "",
    "## Context",
    "Example context.",
    "",
    "## Decision",
    "Example decision.",
    "```",
    "",
    "## Verified Repository Evidence",
    "Evidence remains substantive even with extra literal heading examples above.",
  ].join("\n");
}
