const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { metadataOpenDelimiter, parseCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
const { formalWorkCardArchitectOutputDefinition, getActiveFormalWorkCardDraftSubmission, getWorkCardBuildingEligibility, setFormalWorkCardDisposition } = require("../../dist/main/workCardPlanning/workCardPlanningService.js");
const { getArchitectOutputWorkspaceModel, prepareArchitectOutputHandoff } = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const { beginWorkCardPlanningForCandidate, generateWorkCardIntakeHandoff } = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const { buildImplementationValidationScopeGuidance } = require("../../dist/main/validation/implementationValidationScopeGuidance.js");
const { seedApprovedPhaseInterview, seedApprovedPhasePlanningBundle, seedApprovedProjectIntake, seedApprovedProjectPlanning, seedPhaseMap, tempWorkspace, writeDoc, listPlanningDocuments } = require("../support/canonical-markdown-fixtures.cjs");

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
  assert.equal(intakeCanonical.metadata.workflowData.repositoryBinding.projectRepository, path.resolve(root));
  assert.equal(intakeCanonical.metadata.workflowData.repositoryBinding.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
  assert.match(prepared.preparedInstruction, /Use ChampCity MCP workspaceId "alpha" only/);
  assert.match(prepared.preparedInstruction, /stop drafting the Formal Work Card and propose decomposition/);
  assert.match(prepared.preparedInstruction, /Do not split by length alone/);
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
    formalCanonical.metadata.workflowData.repositoryBinding,
    intakeCanonical.metadata.workflowData.repositoryBinding,
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
    const decomposition = prepareArchitectOutputHandoff(root, "work-card-planning");
    writeDraft(root, decomposition.submission.draftSlots[0].draftRelativePath, "# Decomposition\n```champcity-work-item-decomposition\n{}\n```\n");
    const stopped = getArchitectOutputWorkspaceModel(root, "work-card-planning");
    assert.equal(stopped.state, "promotion-failed");
    assert.match(stopped.promotionError, /decomposition proposal is not a Formal Work Card/);
    assert.equal(fs.existsSync(path.join(root, finalPath)), false);
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

for (const disposition of ["Pending", "Approved", "Rejected"]) {
  test(`${disposition} Formal Work Card blocks preparation and late revision promotion without changing bytes`, () => {
    const root = tempWorkspace("champcity-work-card-planning-target-preserve-");
    seedApprovedProjectPlanning(root);
    seedPhaseMap(root, "phase-01");
    seedApprovedPhaseInterview(root, "phase-01");
    seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
    generateWorkCardIntakeHandoff(root, "phase-01");
    const formalPath = "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md";
    writeCanonicalFormal(root, formalPath, "RevisionRequested", "Tighten the acceptance proof.");
    const prepared = prepareArchitectOutputHandoff(root, "work-card-planning");
    // Another review can protect the target while the Architect is drafting.
    writeCanonicalFormal(root, formalPath, disposition);
    const before = fs.readFileSync(path.join(root, formalPath), "utf8");

    assert.throws(
      () => prepareArchitectOutputHandoff(root, "work-card-planning"),
      /can only replace an absent target or a current RevisionRequested Formal Work Card/,
    );
    assert.equal(fs.readFileSync(path.join(root, formalPath), "utf8"), before);

    writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, "This revision must not replace a protected target.");
    const failed = getArchitectOutputWorkspaceModel(root, "work-card-planning");
    assert.equal(failed.submission.state, "promotion-failed");
    assert.equal(failed.canPrepareHandoff, false);
    assert.match(failed.promotionError, /can only replace an absent target or a current RevisionRequested Formal Work Card/);
    assert.equal(fs.readFileSync(path.join(root, formalPath), "utf8"), before);
  });
}


test("retained Work Card standard maps validation scope to owned behavior", () => {
  const standard = fs.readFileSync(
    path.join(__dirname, "..", "..", "docs", "governance", "WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md"),
    "utf8",
  );

  assert.match(standard, /Validation scope must map to the card's owned behavior/);
  assert.match(standard, /shared test file or suite contains unrelated domains/);
  assert.match(standard, /all-or-nothing acceptance gate unless the card owns those domains/);
  assert.match(standard, /Unrelated or pre-existing failures discovered by broader validation must be recorded and routed/);
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
    "## In-Scope Surface",
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

// The binding owner is outside this inventory regression; real binding conformance remains in routed lifecycle proof.
test("routed projection shares one fresh inventory across large Work Item and document sets", async (t) => {
  const { tempWorkspace, writeDoc } = require("../support/canonical-markdown-fixtures.cjs");
  const bindingOwner = require("../../dist/main/planExecution/routedDevelopmentExecutionBinding.js");
  const { createRoutedDevelopmentExecutionService } = require("../../dist/main/planExecution/routedDevelopmentExecutionService.js");
  const { __setPlanningRepositorySnapshotTestHooks: hooks } = require("../../dist/main/documents/planningRepositorySnapshot.js");
  const root = tempWorkspace("champcity-routed-inventory-");
  t.after(() => { hooks(); fs.rmSync(root, {recursive:true,force:true}); });
  const intakeId = "intake-11111111-1111-4111-8111-111111111111";
  const identity = { intakeId, routeDecisionId:"decision-22222222-2222-4222-8222-222222222222", planId:"PLAN01" };
  const binding = { identity, planPath:"planning/work-plan.md", relativePath:"planning/execution.md", planRevision:1, artifactRevision:1, planDigest:"a".repeat(64),
    structure:{topology:"direct",topologyRationale:"Bounded inventory proof",acceptanceCriteria:["Accepted"],workItems:[]} };
  writeDoc(root,binding.planPath,"work-planning-plan","Approved",{identity});
  writeDoc(root,binding.relativePath,"routed-development-execution-binding","Approved",{identity});
  t.mock.method(bindingOwner,"readRoutedDevelopmentExecutionBinding",async()=>binding);
  const api=createRoutedDevelopmentExecutionService(root,intakeId);
  for(const count of [1,40]) {
    binding.structure.workItems=Array.from({length:count},(_,i)=>({workItemId:"WI"+String(i+1).padStart(2,"0"),title:"Item "+i,purpose:"Bounded behavior",dependsOn:i?["WI01"]:[],acceptanceCriteria:["Accepted"]}));
    for(let i=0;i<count*10;i++)writeDoc(root,"planning/context/"+i+".md","project-overview","Approved");
    let scans=0,acquisitions=0;
    hooks({onInventoryScan:()=>scans++,onSnapshotAcquisition:()=>acquisitions++});
    const first=await api.query(); assert.equal(scans,1);assert.equal(acquisitions,1);
    scans=0; acquisitions=0;
    await api.getDraft({workItemId:"WI01",expectedFingerprint:first.fingerprint});assert.equal(scans,1);assert.equal(acquisitions,1);
    scans=0;
    const handoff=await api.begin({workItemId:"WI01",expectedFingerprint:first.fingerprint});assert.equal(scans,1,"pre-write state is shared");
    scans=0;
    const after=await api.query();assert.equal(scans,1,"post-write projection acquires a fresh generation");
    if(count===1)assert.notEqual(after.fingerprint,first.fingerprint);
    fs.appendFileSync(path.join(root,handoff.handoffMarkdownPath),"\nSame-revision content edit\n");
    scans=0;const edited=await api.query();assert.equal(scans,1);assert.notEqual(edited.fingerprint,after.fingerprint);
    hooks();fs.unlinkSync(path.join(root,handoff.handoffMarkdownPath));
  }
});
test('shared WorkItem planning adapter contains no Architect parsing or prompt authority', () => {
  const source=fs.readFileSync(path.join(__dirname,'../../src/renderer/app/WorkItemPlanningWorkspace.tsx'),'utf8');
  const exact=fs.readFileSync(path.join(__dirname,'../../src/renderer/app/WorkflowExecutionWorkspace.tsx'),'utf8');
  assert.doesNotMatch(source,/JSON\.parse|Return bounded JSON|implementationBoundaries:/); assert.doesNotMatch(exact,/Architect WorkItem execution plan\\n|JSON\.parse\(architectDraft|decompositionDraft/);
  assert.match(source,/PlanReviewShell/); assert.match(exact,/WorkItemPlanningWorkspace/);
});
