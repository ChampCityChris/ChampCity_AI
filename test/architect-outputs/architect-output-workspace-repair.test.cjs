const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  copyArchitectOutputHandoffResult,
  getArchitectOutputWorkspaceModel,
  getPreparedArchitectOutputInstruction,
  prepareArchitectOutputHandoff,
  resolveArchitectOutputCopyHandoff,
  reviewArchitectOutput,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  getCurrentWorkspaceModel,
} = require("../../dist/main/currentWorkflow/currentWorkflowService.js");
const {
  listPlanningDocuments,
  assertGenericDocumentDispositionRouteAllowed,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  createRepairWorkCard,
} = require("../../dist/main/workCardRepair/workCardRepairService.js");
const {
  generateWorkCardIntakeHandoff,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  seedApprovedFormalWorkCard,
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

function presentedRevisions(model) {
  return model.documentSlots
    .filter((slot) => slot.logicalDocumentId && slot.targetPath && slot.artifactRevision)
    .map((slot) => ({
      slotId: slot.slotId,
      targetPath: slot.targetPath,
      artifactRevision: slot.artifactRevision,
    }));
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function seedFormalPrerequisites(root, candidateId = "WC01") {
  seedProjectThroughPlanning(root);
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", candidateId);
}

function seedProjectThroughPlanning(root) {
  const { intake, prompt, interview } = seedApprovedProjectIntake(root, "demo");
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [
      { path: intake, revision: 1 },
      { path: prompt, revision: 1 },
    ],
  });
}

function writeDraft(root, draftRelativePath, bodyMarkdown) {
  fs.mkdirSync(path.dirname(path.join(root, draftRelativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, draftRelativePath), bodyMarkdown, "utf8");
}

test("copy handoff reads one prepared instruction without promoting temporary drafts", () => {
  const root = tempWorkspace("champcity-copy-read-only-");
  seedFormalPrerequisites(root);
  generateWorkCardIntakeHandoff(root, "phase-01");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  const instruction = getPreparedArchitectOutputInstruction(root, "work-card-planning");
  const before = resolveArchitectOutputCopyHandoff(root, "work-card-planning");
  assert.equal(before.instruction, instruction);
  assert.equal(before.result.payload.bytes, Buffer.byteLength(instruction, "utf8"));
  assert.equal(
    copyArchitectOutputHandoffResult("work-card-planning", instruction).payload.bytes,
    before.result.payload.bytes,
  );

  writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, formalWorkCardBody("WC01"));
  const after = resolveArchitectOutputCopyHandoff(root, "work-card-planning");

  assert.equal(after.result.payload.bytes, before.result.payload.bytes);
  assert.equal(getPreparedArchitectOutputInstruction(root, "work-card-planning"), instruction);
  assert.equal(
    fs.existsSync(path.join(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md")),
    false,
  );
});

test("production copy handler source resolves the prepared instruction once", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/main/main.ts"), "utf8");
  const copyHandler = source.slice(
    source.indexOf('"architectOutput:copyHandoff"'),
    source.indexOf('"architectOutput:review"'),
  );
  assert.match(copyHandler, /resolveArchitectOutputCopyHandoff\(workspaceRoot, workspaceId\)/);
  assert.doesNotMatch(copyHandler, /getPreparedArchitectOutputInstruction/);
  assert.doesNotMatch(copyHandler, /copyArchitectOutputHandoffResult/);
});

test("architect output review blocks stale presented revisions and then permits current single-output review", () => {
  const root = tempWorkspace("champcity-review-revision-");
  seedFormalPrerequisites(root);
  generateWorkCardIntakeHandoff(root, "phase-01");
  promoteFormal(root, "WC01");

  const presented = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  const staleEvidence = presentedRevisions(presented);
  savePlanningDocumentRevision(root, presented.documentSlots[0].logicalDocumentId);
  const beforeBytes = fs.readFileSync(path.join(root, presented.documentSlots[0].targetPath), "utf8");

  assert.throws(
    () => reviewArchitectOutput(root, "work-card-planning", "Approved", "", staleEvidence),
    /Refresh the workspace/,
  );
  assert.equal(fs.readFileSync(path.join(root, presented.documentSlots[0].targetPath), "utf8"), beforeBytes);

  const current = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  const reviewed = reviewArchitectOutput(root, "work-card-planning", "Approved", "", presentedRevisions(current));
  assert.equal(reviewed.documentSlots[0].disposition, "Approved");
});

test("atomic architect bundle review is synchronized and rejects mixed bundle authority unchanged", () => {
  const root = tempWorkspace("champcity-bundle-review-");
  const seeded = seedApprovedProjectIntake(root);
  writeDoc(root, seeded.interview, "project-architect-interview", "Approved", {
    sourceRevisions: [
      { path: seeded.intake, revision: 1 },
      { path: seeded.prompt, revision: 1 },
    ],
  });
  const prepared = prepareArchitectOutputHandoff(root, "project-planning-review");
  const sourceRevisions = [
    { path: seeded.intake, revision: 1 },
    { path: seeded.prompt, revision: 1 },
    { path: seeded.interview, revision: 1 },
    { path: prepared.handoff.path, revision: prepared.handoff.revision },
  ];
  writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Pending", {
    participationRole: "compoundGatingReview",
    sourceRevisions,
  });
  writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Pending", {
    participationRole: "compoundGatingReview",
    sourceRevisions,
  });

  const model = getArchitectOutputWorkspaceModel(root, "project-planning-review");
  const reviewed = reviewArchitectOutput(
    root,
    "project-planning-review",
    "RevisionRequested",
    "Tighten both outputs.",
    presentedRevisions(model),
  );
  assert.equal(reviewed.documentSlots.every((slot) => slot.disposition === "RevisionRequested"), true);
  assert.equal(readCanonical(root, "planning/project/PROJECT_PROFILE.md").metadata.documentDisposition.notes, "Tighten both outputs.");
  assert.equal(readCanonical(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md").metadata.documentDisposition.notes, "Tighten both outputs.");

  writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Approved", {
    participationRole: "compoundGatingReview",
    sourceRevisions,
  });
  writeDoc(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md", "project-roadmap", "Pending", {
    participationRole: "compoundGatingReview",
    sourceRevisions,
  });
  const mixed = getArchitectOutputWorkspaceModel(root, "project-planning-review");
  const beforeProfile = fs.readFileSync(path.join(root, "planning/project/PROJECT_PROFILE.md"), "utf8");
  const beforeRoadmap = fs.readFileSync(path.join(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"), "utf8");
  assert.throws(
    () => reviewArchitectOutput(root, "project-planning-review", "Approved", "", presentedRevisions(mixed)),
    /member dispositions differ/,
  );
  assert.equal(fs.readFileSync(path.join(root, "planning/project/PROJECT_PROFILE.md"), "utf8"), beforeProfile);
  assert.equal(fs.readFileSync(path.join(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.md"), "utf8"), beforeRoadmap);
});

test("generic document disposition rejects catalog outputs and permits non-catalog documents", () => {
  const root = tempWorkspace("champcity-catalog-route-");
  writeDoc(root, "planning/project/PROJECT_PROFILE.md", "project-profile", "Pending", {
    participationRole: "compoundGatingReview",
  });
  writeDoc(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", "project-intake", "Pending");
  const documents = listPlanningDocuments(root);
  const profile = documents.find((document) => document.markdownPath === "planning/project/PROJECT_PROFILE.md");
  const intake = documents.find((document) => document.markdownPath === "planning/project/Project_Intake/PROJECT_INTAKE_demo.md");

  assert.throws(
    () => assertGenericDocumentDispositionRouteAllowed(root, profile.logicalDocumentId),
    /architectOutput:review/,
  );
  assert.doesNotThrow(() => assertGenericDocumentDispositionRouteAllowed(root, intake.logicalDocumentId));
  const updated = setDocumentDisposition(root, intake.logicalDocumentId, "Approved");
  assert.equal(updated.effectiveDisposition, "Approved");
});

test("formal work card readiness uses the exact current candidate handoff and prompt contract", () => {
  const root = tempWorkspace("champcity-formal-exact-");
  seedFormalPrerequisites(root, "WC01");
  writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC99.md", "work-card-intake-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { phaseId: "phase-01", workCardId: "WC99" },
    workflowData: {
      candidate: { phaseId: "phase-01", candidateId: "WC99", title: "Old Work Card" },
      formalWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC99_old.md",
    },
  });

  const notReady = getArchitectOutputWorkspaceModel(root, "work-card-planning");
  assert.equal(notReady.state, "not-ready");
  assert.equal(notReady.canPrepareHandoff, false);

  generateWorkCardIntakeHandoff(root, "phase-01");
  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  assert.equal(prepared.state, "waiting-for-drafts");
  assert.match(prepared.preparedInstruction, /Selected Work Card:\n- ID: WC01/);
  assert.match(prepared.preparedInstruction, /Application-owned outputs:[\s\S]*- temporary body-only draft path:/);
  assert.match(prepared.preparedInstruction, /Inspect the complete production path relevant to this candidate/);
  assert.match(prepared.preparedInstruction, /call artifact_toolbox\.create_markdown_artifact exactly once/);
  for (const heading of formalHeadings()) {
    assert.match(prepared.preparedInstruction, new RegExp(`## ${heading}`));
  }
});

test("repair work card prompt contract includes exact repair identity and required headings", () => {
  const root = tempWorkspace("champcity-repair-contract-");
  const evidencePath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    notes: "Repair required.",
  });
  createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Fix literal compliance");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-repair");

  assert.match(prepared.preparedInstruction, /Repair ID: WC01-REPAIR01/);
  assert.match(prepared.preparedInstruction, /Parent Work Card: WC01/);
  assert.match(prepared.preparedInstruction, /Bounded defect: Fix literal compliance/);
  assert.match(prepared.preparedInstruction, /Return target: work-card-building-review/);
  assert.match(prepared.preparedInstruction, /Temporary body-only draft path:/);
  for (const heading of repairHeadings()) {
    assert.match(prepared.preparedInstruction, new RegExp(`## ${heading}`));
  }
});

test("formal, repair, and phase map workspace states classify final output before prepare eligibility", () => {
  for (const entry of formalStateCases()) {
    const root = tempWorkspace(`champcity-formal-state-${entry.label}-`);
    const target = seedFormalOutputTarget(root);
    if (entry.status) {
      writeFormalOutput(root, target, entry.status);
    }
    if (entry.promotionFailed) {
      const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
      writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, "# Wrong Work Card\n");
    }
    assertWorkspaceState(root, "work-card-planning", entry);
  }

  for (const entry of repairStateCases()) {
    const root = tempWorkspace(`champcity-repair-state-${entry.label}-`);
    const repair = seedRepairHandoff(root, "WC01", "Repair required.");
    if (entry.status) {
      writeRepairOutput(root, repair, entry.status);
    }
    if (entry.promotionFailed) {
      const prepared = prepareArchitectOutputHandoff(root, "work-card-repair");
      writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, "# Wrong Repair\n");
    }
    assertWorkspaceState(root, "work-card-repair", entry);
  }

  for (const entry of phaseMapStateCases()) {
    const root = tempWorkspace(`champcity-phase-map-state-${entry.label}-`);
    seedProjectThroughPlanning(root);
    seedApprovedProjectPlanning(root);
    if (entry.status) {
      writePhaseMapOutput(root, entry.status);
    }
    if (entry.promotionFailed) {
      const prepared = prepareArchitectOutputHandoff(root, "project-phase-map");
      writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, "# Phase Map\n\nNo domain block.\n");
    }
    assertWorkspaceState(root, "project-phase-map", entry);
  }
});

test("repair authority selects the exact active handoff without redirecting unrelated repair output", () => {
  const root = tempWorkspace("champcity-repair-exact-active-");
  const unrelated = seedRepairHandoff(root, "WC02", "Unrelated repair.");
  writeRepairOutput(root, unrelated, "Approved");
  const unrelatedBefore = fs.readFileSync(path.join(root, unrelated.repairMarkdownPath), "utf8");

  const active = seedRepairHandoff(root, "WC01", "Active repair.");
  const prepared = prepareArchitectOutputHandoff(root, "work-card-repair");

  assert.match(prepared.preparedInstruction, new RegExp(`Repair ID: ${active.repairId}`));
  assert.match(prepared.preparedInstruction, /Parent Work Card: WC01/);
  assert.match(prepared.preparedInstruction, new RegExp(active.evidencePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(prepared.preparedInstruction, new RegExp(active.repairMarkdownPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(prepared.preparedInstruction, new RegExp(unrelated.repairId));
  assert.doesNotMatch(prepared.preparedInstruction, new RegExp(unrelated.repairMarkdownPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  writeDraft(
    root,
    prepared.submission.draftSlots[0].draftRelativePath,
    repairWorkCardBody(active.repairId, "Active repair.", "work-card-building-review"),
  );
  const promoted = getArchitectOutputWorkspaceModel(root, "work-card-repair");
  assert.equal(promoted.documentSlots[0].targetPath, active.repairMarkdownPath);
  assert.equal(promoted.documentSlots[0].disposition, "Pending");
  assert.equal(fs.readFileSync(path.join(root, unrelated.repairMarkdownPath), "utf8"), unrelatedBefore);
});

test("repair path prepares, promotes revision one, reviews to RevisionRequested, and promotes revision two", () => {
  const root = tempWorkspace("champcity-repair-complete-path-");
  const repair = seedRepairHandoff(root, "WC01", "Fix literal compliance.");
  const first = prepareArchitectOutputHandoff(root, "work-card-repair");
  assert.match(first.preparedInstruction, /This is the prepared Repair Work Card Architect output handoff/);
  writeDraft(
    root,
    first.submission.draftSlots[0].draftRelativePath,
    repairWorkCardBody(repair.repairId, "Fix literal compliance.", "work-card-building-review"),
  );
  const revisionOne = getArchitectOutputWorkspaceModel(root, "work-card-repair");
  assert.equal(revisionOne.documentSlots[0].disposition, "Pending");
  assert.equal(revisionOne.documentSlots[0].artifactRevision, 1);

  const revisionRequested = reviewArchitectOutput(
    root,
    "work-card-repair",
    "RevisionRequested",
    "Clarify the acceptance proof.",
    presentedRevisions(revisionOne),
  );
  assert.equal(revisionRequested.state, "revision-requested");
  assert.equal(revisionRequested.canPrepareHandoff, true);

  const second = prepareArchitectOutputHandoff(root, "work-card-repair");
  writeDraft(
    root,
    second.submission.draftSlots[0].draftRelativePath,
    repairWorkCardBody(repair.repairId, "Fix literal compliance revised.", "work-card-building-review"),
  );
  const revisionTwo = getArchitectOutputWorkspaceModel(root, "work-card-repair");
  assert.equal(revisionTwo.documentSlots[0].disposition, "Pending");
  assert.equal(revisionTwo.documentSlots[0].artifactRevision, 2);
});

test("Formal and Repair revision prompts include exact Operator instructions", () => {
  const formalRoot = tempWorkspace("champcity-formal-revision-prompt-");
  seedFormalOutputTarget(formalRoot);
  const formalPending = promoteFormal(formalRoot, "WC01");
  const formalInstructions = "Replace the ambiguous acceptance criterion with measurable evidence.";
  reviewArchitectOutput(
    formalRoot,
    "work-card-planning",
    "RevisionRequested",
    formalInstructions,
    presentedRevisions(formalPending),
  );
  const revisedFormal = prepareArchitectOutputHandoff(formalRoot, "work-card-planning");
  assert.match(revisedFormal.preparedInstruction, /Current Operator revision instructions:/);
  assert.ok(revisedFormal.preparedInstruction.includes(formalInstructions));

  const repairRoot = tempWorkspace("champcity-repair-revision-prompt-");
  const repair = seedRepairHandoff(repairRoot, "WC01", "Fix revision prompt delivery.");
  const firstRepair = prepareArchitectOutputHandoff(repairRoot, "work-card-repair");
  writeDraft(
    repairRoot,
    firstRepair.submission.draftSlots[0].draftRelativePath,
    repairWorkCardBody(repair.repairId, repair.defect, "work-card-building-review"),
  );
  const repairPending = getArchitectOutputWorkspaceModel(repairRoot, "work-card-repair");
  const repairInstructions = "Clarify the production-path proof and preserve the accepted implementation.";
  reviewArchitectOutput(
    repairRoot,
    "work-card-repair",
    "RevisionRequested",
    repairInstructions,
    presentedRevisions(repairPending),
  );
  const revisedRepair = prepareArchitectOutputHandoff(repairRoot, "work-card-repair");
  assert.match(revisedRepair.preparedInstruction, /Current Operator revision instructions:/);
  assert.ok(revisedRepair.preparedInstruction.includes(repairInstructions));
});

test("Repair output authority rejects mismatched metadata and source revisions without mutation", () => {
  const cases = [
    {
      label: "participation role",
      mutate: ({ workflowData, sourceRevisions }) => ({
        participationRole: "contextOnly",
        workflowData,
        sourceRevisions,
      }),
    },
    {
      label: "workflow repair identity",
      mutate: ({ workflowData, sourceRevisions }) => ({
        workflowData: { ...workflowData, repairId: "WC99-REPAIR99" },
        sourceRevisions,
      }),
    },
    {
      label: "origin evidence and bounded defect",
      mutate: ({ workflowData, sourceRevisions }) => ({
        workflowData: {
          ...workflowData,
          origin: "postValidationRecord",
          evidencePath: "planning/phases/phase-01/Validation_Records/UNRELATED.md",
          boundedDefect: "Unrelated defect",
        },
        sourceRevisions,
      }),
    },
    {
      label: "exact source revisions",
      mutate: ({ workflowData }) => ({
        workflowData,
        sourceRevisions: [],
      }),
    },
  ];

  for (const entry of cases) {
    const root = tempWorkspace(`champcity-repair-authority-${entry.label.replace(/\s+/g, "-")}-`);
    const repair = seedRepairHandoff(root, "WC01", "Preserve exact Repair authority.");
    const handoff = listPlanningDocuments(root).find((document) => document.markdownPath === repair.handoffMarkdownPath);
    const parentWorkCardId = repair.repairId.replace(/-REPAIR\d+$/i, "");
    const workflowData = {
      repairId: repair.repairId,
      parentWorkCardId,
      originalParentWorkCardId: parentWorkCardId,
      origin: "preValidationReportReview",
      evidencePath: repair.evidencePath,
      boundedDefect: repair.defect,
      returnTarget: "work-card-building-review",
    };
    const sourceRevisions = [
      ...(handoff.metadata.sourceRevisions || []),
      { path: repair.handoffMarkdownPath, revision: handoff.metadata.artifactRevision || 1 },
    ];
    const mutation = entry.mutate({ workflowData, sourceRevisions });
    writeDoc(root, repair.repairMarkdownPath, "repair-work-card", "Pending", {
      participationRole: mutation.participationRole || "gatingReview",
      identity: {
        phaseId: "phase-01",
        workCardId: repair.repairId,
        repairId: repair.repairId,
        parentWorkCardId,
      },
      sourceRevisions: mutation.sourceRevisions,
      workflowData: mutation.workflowData,
      bodyMarkdown: repairWorkCardBody(repair.repairId, repair.defect, "work-card-building-review"),
    });
    const before = fs.readFileSync(path.join(root, repair.repairMarkdownPath), "utf8");

    const model = getArchitectOutputWorkspaceModel(root, "work-card-repair");

    assert.equal(model.state, "needs-attention", entry.label);
    assert.equal(model.canPrepareHandoff, false, entry.label);
    assert.equal(fs.readFileSync(path.join(root, repair.repairMarkdownPath), "utf8"), before, entry.label);
  }
});

test("missing and conflicting Repair authority are non-mutating and cannot redirect unrelated current work", () => {
  const missingRoot = tempWorkspace("champcity-repair-missing-authority-");
  const orphanPath = "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_orphan.md";
  writeDoc(missingRoot, orphanPath, "repair-work-card", "Pending", {
    identity: {
      phaseId: "phase-01",
      workCardId: "WC01-REPAIR01",
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
    },
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: "planning/phases/phase-01/Implementer_Reports/MISSING.md",
      boundedDefect: "Orphan Repair output",
      returnTarget: "work-card-building-review",
    },
    bodyMarkdown: repairWorkCardBody("WC01-REPAIR01", "Orphan Repair output", "work-card-building-review"),
  });
  const orphanBefore = fs.readFileSync(path.join(missingRoot, orphanPath), "utf8");
  const missing = getArchitectOutputWorkspaceModel(missingRoot, "work-card-repair");
  assert.equal(missing.state, "not-ready");
  assert.equal(missing.canPrepareHandoff, false);
  assert.equal(fs.readFileSync(path.join(missingRoot, orphanPath), "utf8"), orphanBefore);

  const conflictRoot = tempWorkspace("champcity-repair-conflict-current-work-");
  const first = seedRepairHandoff(conflictRoot, "WC01", "First unresolved repair.");
  const second = seedRepairHandoff(conflictRoot, "WC02", "Second unresolved repair.");
  const firstBefore = fs.readFileSync(path.join(conflictRoot, first.handoffMarkdownPath), "utf8");
  const secondBefore = fs.readFileSync(path.join(conflictRoot, second.handoffMarkdownPath), "utf8");
  writeDoc(conflictRoot, "planning/project/PROJECT_PROFILE.md", "project-profile", "RevisionRequested", {
    participationRole: "compoundGatingReview",
    notes: "Revise the project profile independently of the Repair conflict.",
  });

  const repairModel = getArchitectOutputWorkspaceModel(conflictRoot, "work-card-repair");
  assert.equal(repairModel.state, "needs-attention");
  assert.equal(repairModel.canPrepareHandoff, false);
  const current = getCurrentWorkspaceModel(conflictRoot);
  assert.equal(current.activeWorkspaceId, "project-planning-review");
  assert.notEqual(current.activeWorkspaceId, "work-card-repair");
  assert.equal(fs.readFileSync(path.join(conflictRoot, first.handoffMarkdownPath), "utf8"), firstBefore);
  assert.equal(fs.readFileSync(path.join(conflictRoot, second.handoffMarkdownPath), "utf8"), secondBefore);
  assert.equal(fs.existsSync(path.join(conflictRoot, first.repairMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(conflictRoot, second.repairMarkdownPath)), false);
});

test("Current Workflow projects explicit promotion failure for Formal Repair and Phase Map", () => {
  const cases = [
    {
      workspaceId: "work-card-planning",
      setup(root) {
        seedFormalOutputTarget(root);
      },
      invalidBody: "# Wrong Work Card\n",
    },
    {
      workspaceId: "work-card-repair",
      setup(root) {
        seedRepairHandoff(root, "WC01", "Prove Repair promotion failure.");
      },
      invalidBody: "# Wrong Repair\n",
    },
    {
      workspaceId: "project-phase-map",
      setup(root) {
        seedProjectThroughPlanning(root);
        seedApprovedProjectPlanning(root);
      },
      invalidBody: "# Phase Map\n\nNo domain block.\n",
    },
  ];

  for (const entry of cases) {
    const root = tempWorkspace(`champcity-current-promotion-failed-${entry.workspaceId}-`);
    entry.setup(root);
    const prepared = prepareArchitectOutputHandoff(root, entry.workspaceId);
    writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, entry.invalidBody);
    const shared = getArchitectOutputWorkspaceModel(root, entry.workspaceId);
    assert.equal(shared.state, "promotion-failed", entry.workspaceId);
    const current = getCurrentWorkspaceModel(root);
    assert.equal(current.activeWorkspaceId, entry.workspaceId, entry.workspaceId);
    assert.equal(current.architectOutputState, "promotion-failed", entry.workspaceId);
    assert.equal(current.railStatus, "Needs Attention", entry.workspaceId);
    assert.equal(current.canPrepareHandoff, true, entry.workspaceId);
    assert.equal(current.requiredAction, shared.requiredAction, entry.workspaceId);
    assert.equal(current.blocker, shared.reason, entry.workspaceId);
  }
});

function promoteFormal(root, workCardId) {
  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, formalWorkCardBody(workCardId));
  return getArchitectOutputWorkspaceModel(root, "work-card-planning");
}

function seedFormalOutputTarget(root) {
  seedFormalPrerequisites(root);
  const handoff = generateWorkCardIntakeHandoff(root, "phase-01");
  return handoff.formalWorkCardMarkdownPath;
}

function seedRepairHandoff(root, workCardId, defect) {
  if (!listPlanningDocuments(root).some((document) => document.metadata.artifactType === "project-intake")) {
    seedFormalPrerequisites(root, workCardId);
    seedApprovedFormalWorkCard(root, "phase-01", workCardId);
  }
  const evidencePath = writeDoc(root, `planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_repair.md`, "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId },
    notes: "Repair required.",
  });
  return {
    ...createRepairWorkCard(root, "phase-01", workCardId, evidencePath, "preValidationReportReview", defect),
    evidencePath,
    defect,
  };
}

function writeFormalOutput(root, target, status) {
  writeDoc(root, target, "formal-work-card", status, {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    notes: status === "RevisionRequested" ? "Revise the formal Work Card." : "",
    bodyMarkdown: formalWorkCardBody("WC01"),
  });
}

function writeRepairOutput(root, repair, status) {
  const handoff = listPlanningDocuments(root).find((document) => document.markdownPath === repair.handoffMarkdownPath);
  const sourceRevisions = [
    ...(handoff.metadata.sourceRevisions || []),
    { path: repair.handoffMarkdownPath, revision: handoff.metadata.artifactRevision || 1 },
  ];
  writeDoc(root, repair.repairMarkdownPath, "repair-work-card", status, {
    identity: {
      phaseId: "phase-01",
      workCardId: repair.repairId,
      repairId: repair.repairId,
      parentWorkCardId: repair.repairId.replace(/-REPAIR\d+$/i, ""),
    },
    sourceRevisions,
    workflowData: {
      repairId: repair.repairId,
      parentWorkCardId: repair.repairId.replace(/-REPAIR\d+$/i, ""),
      originalParentWorkCardId: repair.repairId.replace(/-REPAIR\d+$/i, ""),
      origin: "preValidationReportReview",
      evidencePath: repair.evidencePath,
      boundedDefect: repair.defect,
      returnTarget: "work-card-building-review",
    },
    notes: status === "RevisionRequested" ? "Revise the Repair Work Card." : "",
    bodyMarkdown: repairWorkCardBody(repair.repairId, repair.defect, "work-card-building-review"),
  });
}

function writePhaseMapOutput(root, status) {
  const phase = {
    phaseId: "phase-01",
    title: "Phase 01",
    order: 1,
    purpose: "Build the first phase.",
    dependsOn: [],
    sourceReferences: ["planning/project/PROJECT_PROFILE.md"],
  };
  writeDoc(root, "planning/project/Phase_Map/PHASE_MAP_demo.md", "phase-map", status, {
    workflowData: { phases: [phase] },
    notes: status === "RevisionRequested" ? "Revise the Phase Map." : "",
    bodyMarkdown: `# Phase Map\n\n\`\`\`champcity-phase-map\n${JSON.stringify({ phases: [phase] }, null, 2)}\n\`\`\`\n`,
  });
}

function assertWorkspaceState(root, workspaceId, expected) {
  const model = getArchitectOutputWorkspaceModel(root, workspaceId);
  assert.equal(model.state, expected.state, `${workspaceId} ${expected.label} state`);
  assert.equal(model.canPrepareHandoff, expected.canPrepareHandoff, `${workspaceId} ${expected.label} canPrepareHandoff`);
  assert.equal(model.railStatus, expected.railStatus, `${workspaceId} ${expected.label} railStatus`);
  assert.equal(model.requiredAction, expected.requiredAction, `${workspaceId} ${expected.label} requiredAction`);
  assert.equal(model.reason, expected.reason || expected.requiredAction, `${workspaceId} ${expected.label} reason`);

  if (expected.assertCurrent !== false) {
    const current = getCurrentWorkspaceModel(root);
    assert.equal(current.activeWorkspaceId, workspaceId, `${workspaceId} ${expected.label} current workspace`);
    assert.equal(current.architectOutputState, model.state, `${workspaceId} ${expected.label} current state`);
    assert.equal(current.railStatus, model.railStatus, `${workspaceId} ${expected.label} current rail`);
    assert.equal(current.canPrepareHandoff, model.canPrepareHandoff, `${workspaceId} ${expected.label} current prepare`);
    assert.equal(current.requiredAction, model.requiredAction, `${workspaceId} ${expected.label} current action`);
    assert.equal(
      current.blocker,
      model.state === "needs-attention" || model.state === "promotion-failed" ? model.reason : undefined,
      `${workspaceId} ${expected.label} current blocker`,
    );
  }
}

function formalStateCases() {
  return [
    stateCase("absent", undefined, "ready-for-handoff", true, "Ready", "Prepare Handoff, copy it, and send it manually in embedded ChatGPT."),
    stateCase("pending", "Pending", "ready-for-review", false, "Awaiting Approval", "Review every current output revision and apply one disposition."),
    stateCase("revision", "RevisionRequested", "revision-requested", true, "Awaiting Approval", "Prepare a revision handoff with Operator instructions."),
    stateCase("rejected", "Rejected", "rejected", false, "Needs Attention", "Resolve current Architect output evidence."),
    stateCase("approved", "Approved", "completed", false, "Completed", "Architect output is Approved.", { assertCurrent: false }),
    stateCase("promotion-failed", undefined, "promotion-failed", true, "Needs Attention", "Promotion failed; correct the draft and explicitly prepare a fresh handoff.", {
      promotionFailed: true,
      assertCurrent: false,
    }),
  ];
}

function repairStateCases() {
  return [
    stateCase("absent", undefined, "ready-for-handoff", true, "Ready", "Prepare Handoff, copy it, and send it manually in embedded ChatGPT."),
    stateCase("pending", "Pending", "ready-for-review", false, "Awaiting Approval", "Review every current output revision and apply one disposition."),
    stateCase("revision", "RevisionRequested", "revision-requested", true, "Awaiting Approval", "Prepare a revision handoff with Operator instructions."),
    stateCase("rejected", "Rejected", "rejected", false, "Needs Attention", "Resolve current Architect output evidence."),
    stateCase("approved", "Approved", "completed", false, "Completed", "Architect output is Approved.", { assertCurrent: false }),
    stateCase("promotion-failed", undefined, "promotion-failed", true, "Needs Attention", "Promotion failed; correct the draft and explicitly prepare a fresh handoff.", {
      promotionFailed: true,
      assertCurrent: false,
    }),
  ];
}

function phaseMapStateCases() {
  return [
    stateCase("absent", undefined, "ready-for-handoff", true, "Ready", "Prepare Handoff, copy it, and send it manually in embedded ChatGPT.", {
      reason: "Approved Project Profile and Project Roadmap are available.",
      assertCurrent: false,
    }),
    stateCase("pending", "Pending", "ready-for-review", false, "Awaiting Approval", "Review every current output revision and apply one disposition."),
    stateCase("revision", "RevisionRequested", "revision-requested", true, "Awaiting Approval", "Prepare a revision handoff with Operator instructions."),
    stateCase("rejected", "Rejected", "rejected", false, "Needs Attention", "Resolve current Architect output evidence."),
    stateCase("approved", "Approved", "completed", false, "Completed", "Architect output is Approved.", { assertCurrent: false }),
    stateCase("promotion-failed", undefined, "promotion-failed", true, "Needs Attention", "Promotion failed; correct the draft and explicitly prepare a fresh handoff.", {
      promotionFailed: true,
      assertCurrent: false,
    }),
  ];
}

function stateCase(label, status, state, canPrepareHandoff, railStatus, requiredAction, options = {}) {
  return {
    label,
    status,
    state,
    canPrepareHandoff,
    railStatus,
    requiredAction,
    ...options,
  };
}

function formalHeadings() {
  return [
    "Verified Repository Evidence",
    "Objective",
    "Runtime Sequence",
    "Required Changes",
    "Preserved Behavior",
    "Authorized Surface",
    "Risks and Constraints",
    "Acceptance Criteria",
    "Negative Constraints",
    "Implementer Report Requirements",
    "Manual Validation",
  ];
}

function repairHeadings() {
  return [
    "Confirmed Defect",
    "Source Evidence",
    "Objective",
    "Runtime Sequence",
    "Required Changes",
    "Preserved Behavior",
    "Authorized Surface",
    "Acceptance Criteria",
    "Negative Constraints",
    "Return Target",
    "Implementer Report Requirements",
    "Manual Validation",
  ];
}

function formalWorkCardBody(workCardId) {
  return [
    `# ${workCardId} - First Work Card`,
    "",
    ...formalHeadings().flatMap((heading) => [`## ${heading}`, `${heading} content.`]),
    "",
  ].join("\n");
}

function repairWorkCardBody(repairId, defect, returnTarget) {
  return [
    `# ${repairId} - ${defect}`,
    "",
    ...repairHeadings().flatMap((heading) => [
      `## ${heading}`,
      heading === "Return Target" ? `${returnTarget} remains the required return target.` : `${heading} content.`,
    ]),
    "",
  ].join("\n");
}
