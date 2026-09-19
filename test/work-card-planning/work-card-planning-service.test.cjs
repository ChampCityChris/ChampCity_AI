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
  buildImplementationValidationScopeGuidance,
} = require("../../dist/main/validation/implementationValidationScopeGuidance.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectIntake,
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
  assert.equal(intakeCanonical.metadata.workflowData.repositoryBinding.projectRepository, path.resolve(root));
  assert.equal(intakeCanonical.metadata.workflowData.repositoryBinding.mcpWorkspaceBinding.mcpWorkspaceId, "alpha");

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

test("Formal Work Card production review prepares and copies exact revision notes then promotes the bounded replacement", async () => {
  const root = tempWorkspace("champcity-work-card-planning-revision-prompt-");
  const { intake, prompt, interview } = seedApprovedProjectIntake(root);
  writeDoc(root, interview, "project-architect-interview", "Approved", {
    identity: { "Project.ArtifactKey": "demo" },
    sourceRevisions: [{ path: intake, revision: 1 }, { path: prompt, revision: 1 }],
  });
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  const handoff = generateWorkCardIntakeHandoff(root, "phase-01");
  const handoffBytes = fs.readFileSync(path.join(root, handoff.handoffMarkdownPath), "utf8");
  const { api, clipboard } = productionArchitectOutputApi(root);
  const initial = await api.prepareArchitectOutputHandoff("work-card-planning");
  writeDraft(root, initial.submission.draftSlots[0].draftRelativePath, formalWorkCardBody("WC01"));
  const pending = await api.getArchitectOutputWorkspaceModel("work-card-planning");
  const targetPath = pending.documentSlots[0].targetPath;
  const before = fs.readFileSync(path.join(root, targetPath), "utf8");
  const presented = pending.documentSlots.map(({ slotId, targetPath, artifactRevision }) =>
    ({ slotId, targetPath, artifactRevision }));
  assert.equal(pending.state, "ready-for-review");
  assert.equal(pending.documentSlots[0].disposition, "Pending");

  await assert.rejects(
    api.reviewArchitectOutput("work-card-planning", "RevisionRequested", " \n\t ", presented),
    /RevisionRequested requires Operator revision instructions/,
  );
  assert.equal(fs.readFileSync(path.join(root, targetPath), "utf8"), before);
  const revisionNotes = "Tighten the acceptance proof around renderer-visible state transition.\nKeep exact punctuation [A+B], and  internal spacing.";
  const reviewed = await api.reviewArchitectOutput(
    "work-card-planning", "RevisionRequested", ` \n${revisionNotes}\n\t `, presented,
    pending.documentSlots[0].logicalDocumentId,
  );
  const revisionRequested = reviewed.architectOutput;
  const persisted = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, targetPath), "utf8"));
  assert.equal(persisted.metadata.documentDisposition.status, "RevisionRequested");
  assert.equal(persisted.metadata.documentDisposition.notes, revisionNotes);
  assert.equal(persisted.metadata.artifactRevision, 1);
  assert.equal(revisionRequested.state, "revision-requested");
  assert.equal(revisionRequested.documentSlots[0].targetPath, targetPath);
  assert.equal(revisionRequested.currentOperatorReviewNotes, revisionNotes);
  assert.equal(revisionRequested.canPrepareHandoff, true);
  assert.equal(revisionRequested.canCopyHandoff, false);
  assert.equal(revisionRequested.preparedInstruction, undefined);
  assert.equal(reviewed.development.currentModel.activeWorkspaceId, "work-card-planning");
  assert.equal(reviewed.development.currentModel.currentWorkCardId, "WC01");
  assert.equal((await api.getCurrentWorkspaceModel()).activeWorkspaceId, "work-card-planning");
  await assert.rejects(api.copyArchitectOutputHandoff("work-card-planning"), /Prepare Handoff must be completed/);
  assert.deepEqual(clipboard, []);

  const prepared = await api.prepareArchitectOutputHandoff("work-card-planning");
  assert.equal(prepared.canCopyHandoff, true);
  assert.notEqual(prepared.submission.submissionId, initial.submission.submissionId);
  assert.notEqual(prepared.submission.draftSlots[0].draftRelativePath, initial.submission.draftSlots[0].draftRelativePath);
  assert.deepEqual(prepared.handoff, initial.handoff);
  const instruction = prepared.preparedInstruction;
  assert.ok(instruction.includes(`Current Operator revision instructions:\n${persisted.metadata.documentDisposition.notes}\n`));
  const copyResult = await api.copyArchitectOutputHandoff("work-card-planning");
  assert.equal(copyResult.ok, true);
  assert.equal(copyResult.payload.bytes, Buffer.byteLength(instruction, "utf8"));
  assert.deepEqual(clipboard, [instruction]);
  const active = getActiveFormalWorkCardDraftSubmission(root);
  assert.deepEqual(active.preparedContext.sourceRevisions, persisted.metadata.sourceRevisions);
  for (const source of persisted.metadata.sourceRevisions) {
    assert.ok(instruction.includes(`- path: ${source.path} revision: ${source.revision}`));
  }
  const actionBlocks = [...instruction.matchAll(/```json\n([\s\S]*?)\n```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((block) => block.action === "write_markdown_artifact");

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
  assert.match(instruction, /managed machine-level setup is in-scope implementation work/);
  assert.match(instruction, /## In-Scope Surface/);
  assert.doesNotMatch(instruction, /## Authorized Surface/);
  assert.match(instruction, /Tests are evidence of the Work Card objective, not an independent product decision/);
  assert.match(instruction, /smallest practical boundary relevant to the behavior owned by this Work Card/);
  assert.match(instruction, /Do not make an entire multi-domain test file or broad suite an all-or-nothing acceptance gate/);
  assert.match(instruction, /prefer dedicated focused tests, relevant named test cases, or a focused lane/);
  assert.match(instruction, /Full-suite or broad integration cleanliness belongs only to a Work Card that explicitly owns integration or baseline validation/);
  assert.match(instruction, /demonstrated unrelated or pre-existing failure/);
  assert.match(instruction, /Unexplained failures that may affect this Work Card objective still require classification/);
  const expectedValidationGuidance = buildImplementationValidationScopeGuidance("work-card");
  const validationGuidanceStart = instruction.indexOf(expectedValidationGuidance[0]);
  const formalWorkCardStructureStart = instruction.indexOf("Create one complete Formal Work Card body with exactly this structure:");
  assert.notEqual(validationGuidanceStart, -1);
  assert.ok(formalWorkCardStructureStart > validationGuidanceStart);
  assert.equal(
    instruction.slice(validationGuidanceStart, formalWorkCardStructureStart),
    `${expectedValidationGuidance.join("\n")}\n`,
  );
  assert.doesNotMatch(instruction, /ChampCity_AI/);
  assert.doesNotMatch(instruction, /champcity_ai/);
  assert.equal(actionBlocks.length, 1);
  assert.equal(actionBlocks[0].workspaceId, "alpha");
  assert.equal(actionBlocks[0].params.relativePath, prepared.submission.draftSlots[0].draftRelativePath);
  assert.equal(actionBlocks[0].params.overwrite, false);
  assert.doesNotMatch(instruction, /"relativePath":\s*"planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md"/);

  const revisedBody = `${formalWorkCardBody("WC01")}\nRevision proof: preserve the renderer-visible state transition.\n`;
  writeDraft(root, prepared.submission.draftSlots[0].draftRelativePath, revisedBody);
  const promoted = await api.getArchitectOutputWorkspaceModel("work-card-planning");
  const replacementBytes = fs.readFileSync(path.join(root, targetPath), "utf8");
  const replacement = parseCanonicalMarkdownDocument(replacementBytes);
  assert.equal(promoted.state, "ready-for-review");
  assert.equal(promoted.documentSlots[0].targetPath, targetPath);
  assert.equal(replacement.metadata.artifactRevision, 2);
  assert.deepEqual(replacement.metadata.documentDisposition, { status: "Pending", notes: "", reviewedAt: null });
  assert.deepEqual(replacement.metadata.identity, persisted.metadata.identity);
  assert.deepEqual(replacement.metadata.sourceRevisions, persisted.metadata.sourceRevisions);
  assert.deepEqual(replacement.metadata.workflowData.repositoryBinding, persisted.metadata.workflowData.repositoryBinding);
  assert.equal(replacement.bodyMarkdown.trim(), revisedBody.trim());
  assert.equal(fs.existsSync(path.join(root, prepared.submission.draftSlots[0].draftRelativePath)), false);
  await assert.rejects(api.prepareArchitectOutputHandoff("work-card-planning"), /can only replace an absent target or a current RevisionRequested Formal Work Card/);
  assert.equal(fs.readFileSync(path.join(root, targetPath), "utf8"), replacementBytes);
  assert.equal(fs.readFileSync(path.join(root, handoff.handoffMarkdownPath), "utf8"), handoffBytes);
});

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

function productionArchitectOutputApi(root) {
  const ts = require("typescript");
  const vm = require("node:vm");
  const source = fs.readFileSync(path.join(__dirname, "../../src/main/main.ts"), "utf8");
  const ast = ts.createSourceFile("main.ts", source, ts.ScriptTarget.Latest, true);
  const channels = new Set([
    "architectOutput:getWorkspaceModel", "architectOutput:prepareHandoff",
    "architectOutput:copyHandoff", "architectOutput:review", "currentWorkflow:getModel",
  ]);
  const registrations = ast.statements.filter((node) =>
    ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    channels.has(node.expression.arguments[0]?.text));
  const handlers = new Map();
  const clipboard = [];
  vm.runInNewContext(ts.transpileModule(registrations.map((node) => node.getText(ast)).join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    ...require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js"),
    ...require("../../dist/main/currentWorkflow/currentWorkflowService.js"),
    ...require("../../dist/main/documents/developmentPostMutationProjection.js"),
    getRequiredWorkspaceRoot: () => root,
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    clipboard: { writeText: (instruction) => clipboard.push(instruction) },
  });
  assert.equal(handlers.size, channels.size);
  let api;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../dist/preload/index.js"), "utf8"), {
    exports: {},
    require: (id) => {
      assert.equal(id, "electron");
      return {
        contextBridge: { exposeInMainWorld: (key, value) => { assert.equal(key, "champcity"); api = value; } },
        ipcRenderer: { invoke: async (channel, ...args) => handlers.get(channel)({}, ...args) },
      };
    },
  });
  return { api, clipboard };
}

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
