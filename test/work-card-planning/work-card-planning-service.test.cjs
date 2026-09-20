const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("routed Work Items reuse Formal planning and report review without legacy Phase artifacts", async (t) => {
  const { seedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { createRoutedDevelopmentExecutionService: service, loadRoutedDevelopmentExecution: load } = require("../../dist/main/planExecution/routedDevelopmentExecutionService.js");
  const { writeCanonicalMarkdownDocument: write } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const item = (id, deps = []) => ({ workItemId: id, title: `Deliver ${id}`, purpose: "Bounded export behavior", dependsOn: deps, acceptanceCriteria: [`${id} export accepted`] });
  const { root, intake, binding, git, initialHead } = await seedApprovedRoutedWorkPlan(t, { topology: "direct", topologyRationale: "One bounded export", acceptanceCriteria: ["Export accepted"], workItems: [item("WI01"), item("WI02", ["WI01"])] });
  const api = service(root, intake.intakeId);
  const request = async (id = "WI01") => ({ workItemId: id, expectedFingerprint: (await api.query()).fingerprint });
  const first = await request();
  await assert.rejects(api.begin({ ...first, workItemId: "WI02" }), /eligible/);
  const beginning = api.begin(first);
  await assert.rejects(service(root, intake.intakeId).begin(first), /already in progress/);
  const handoff = await beginning;
  await assert.rejects(api.prepare(first), /evidence changed/);
  const prepared = await api.prepare(await request());
  writeDraft(root, prepared.expectedDraftSlots[0].draftRelativePath, formalWorkCardBody("WI01"));
  const promoted = await api.getDraft(await request());
  assert.equal(promoted.submission.state, "promoted", promoted.promotionError);
  const read = (relative) => parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relative), "utf8"));
  const formal = read(handoff.formalWorkCardMarkdownPath);
  assert.equal(formal.metadata.identity.phaseId, undefined);
  assert.equal(formal.metadata.identity.planId, binding.identity.planId);
  assert.equal(formal.metadata.identity.workCardId, "WI01");
  assert.equal(formal.metadata.sourceRevisions.some((source) => source.path === binding.relativePath), true);
  await api.reviewFormal({ ...await request(), expectedRevision: 1, disposition: "Approved" });
  let review = await api.buildingReview(await request());
  assert.equal(review.reportReadiness, "reserved-skeleton");
  assert.match(review.implementerReportPath, /\/direct\/Implementer_Reports\/IMPLEMENTER_REPORT_WI01_deliver_wi01.md$/);
  await assert.rejects(api.reviewReport({ ...await request(), expectedRevision: 1, disposition: "Approved" }), /skeleton|completion|evidence/i);
  const report = read(review.implementerReportPath);
  assert.equal(report.metadata.identity.phaseId, undefined);
  assert.deepEqual(report.metadata.identity.artifactScope, formal.metadata.identity.artifactScope);
  write({ workspaceRoot: root, relativePath: review.implementerReportPath, metadata: report.metadata, bodyMarkdown: "# Implementer Report\n\nImplemented the bounded export. Synthetic service validation passed.\n" });
  assert.equal((await api.query()).workItems[0].stage, "review-validate");
  await api.reviewReport({ ...await request(), expectedRevision: 1, disposition: "Approved" });
  review = await api.buildingReview(await request());
  assert.equal(review.report.disposition, "Approved");
  assert.equal((await api.query()).workItems[0].complete, false, "report review does not claim validation or close");
  const state = await load(root, intake.intakeId);
  const { generateRoutedWorkCardIntakeHandoff } = require("../../dist/main/workCardIntake/workCardIntakeService.js");
  const other = state.entries[1];
  generateRoutedWorkCardIntakeHandoff(root, state.binding, other.scope, other.candidate);
  const conflict = await api.query();
  assert.equal(conflict.workItems.every((entry) => !entry.eligible), true);
  await assert.rejects(api.prepare({ workItemId: "WI01", expectedFingerprint: conflict.fingerprint }), /eligible/);
  assert.equal(fs.existsSync(path.join(root, "planning/phases")), false);
  assert.equal(git("rev-parse", "HEAD"), initialHead);
  fs.appendFileSync(path.join(root, binding.planPath), "\nChanged approved Plan body.\n");
  await assert.rejects(api.query(), /binding|Plan|digest/i);
});

test("routed phased eligibility retains genuine phase barriers and rejects wrong lineage", async (t) => {
  const { seedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { createRoutedDevelopmentExecutionService: service } = require("../../dist/main/planExecution/routedDevelopmentExecutionService.js");
  const phase = (id, deps) => ({ phaseId: id, title: id, purpose: "Independent milestone", dependsOn: deps, acceptanceCriteria: [`${id} accepted`] });
  const item = (id, phaseId) => ({ workItemId: id, phaseId, title: `Deliver ${id}`, purpose: "Bounded export", dependsOn: [], acceptanceCriteria: [`${id} accepted`] });
  const { root, intake } = await seedApprovedRoutedWorkPlan(t, { topology: "phased", topologyRationale: "Real milestone acceptance gates", acceptanceCriteria: ["Delivery accepted"], phases: [phase("P1", []), phase("P2", ["P1"])], workItems: [item("WI01", "P1"), item("WI02", "P2")] });
  const api = service(root, intake.intakeId);
  const projection = await api.query();
  assert.equal(projection.nextWorkItemId, "WI01");
  assert.equal(projection.workItems[1].eligible, false);
  const handoff = await api.begin({ workItemId: "WI01", expectedFingerprint: projection.fingerprint });
  assert.match(handoff.formalWorkCardMarkdownPath, /\/phases\/P1\//);
  const prepared = await api.prepare({ workItemId: "WI01", expectedFingerprint: (await api.query()).fingerprint });
  writeDraft(root, prepared.expectedDraftSlots[0].draftRelativePath, formalWorkCardBody("WI01"));
  const absolute = path.join(root, handoff.handoffMarkdownPath);
  const currentHandoff = fs.readFileSync(absolute, "utf8");
  const altered = parseCanonicalMarkdownDocument(currentHandoff);
  const { writeCanonicalMarkdownDocument } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath: handoff.handoffMarkdownPath,
    metadata: { ...altered.metadata, sourceRevisions: [] }, bodyMarkdown: altered.bodyMarkdown });
  assert.equal((await api.query()).status, "blocked", "a current revision with missing source lineage cannot authorize promotion");
  fs.writeFileSync(absolute, currentHandoff.replaceAll('"phaseId": "P1"', '"phaseId": "P2"'));
  const invalid = await api.query();
  assert.equal(invalid.status, "blocked");
  await assert.rejects(api.getDraft({ workItemId: "WI01", expectedFingerprint: invalid.fingerprint }), /eligible/);
  assert.equal(fs.existsSync(path.join(root, handoff.formalWorkCardMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, "planning/phases")), false);
});

test("Work Item decomposition uses explicit Operator review, preserves lineage, and corrects topology atomically", async (t) => {
  const { seedRoutedWorkIntake } = require("../support/work-intake-fixtures.cjs");
  const { root, intake, route, git, initialHead } = await seedRoutedWorkIntake(t, "feature-change");
  const { workPlanningKernel: kernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
  const { resolveWorkPlanningProfile } = require("../../dist/main/workPlanning/workPlanningProfiles.js");
  const { workItemDecompositionService } = require("../../dist/main/workCardPlanning/workItemDecompositionService.js");
  const { applyWorkItemDecomposition } = require("../../dist/main/workCardPlanning/workItemDecomposition.js");
  const { __setCanonicalMarkdownWriterTestHooks: hooks } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  t.after(() => hooks());
  const { mainPreloadHarness } = require("../support/production-execution.cjs");
  let copied;
  const { api } = mainPreloadHarness(["workDecomposition:status", "workDecomposition:prepare", "workDecomposition:copy", "workDecomposition:review"], {
    workItemDecompositionService, getRequiredWorkspaceRoot: () => root, clipboard: { writeText: (value) => { copied = value; } },
  });
  const profile = resolveWorkPlanningProfile("feature-change");
  const item = (id, dependsOn = []) => ({ workItemId: id, title: `Outcome ${id}`, purpose: `Deliver the bounded ${id} outcome`, dependsOn, acceptanceCriteria: [`${id} demonstrated`] });
  const direct = { topology: "direct", topologyRationale: "Ordered feature outcomes", acceptanceCriteria: ["Preserve existing behavior and demonstrate the added capability"], workItems: [item("WI00"), item("WI01", ["WI00"]), item("WI02", ["WI01"])] };
  for (const stage of ["assessment", "plan"]) {
    let model = await kernel.prepare(root, intake.intakeId, stage);
    const body = `# ${stage === "assessment" ? "Route Architect Assessment" : "Work Plan"}\n` + profile[`${stage}Sections`].map((heading) => `## ${heading}\nInspect the existing capability; preserve its behavior while adding the bounded outcome.\n`).join("\n") +
      (stage === "plan" ? "\n```champcity-work-plan\n" + JSON.stringify(direct) + "\n```\n" : "");
    writeDraft(root, model.submission.expectedDraftSlots[0].draftRelativePath, body);
    model = await kernel.get(root, intake.intakeId, stage);
    assert.equal(model.artifact.disposition, "Pending");
    await kernel.review(root, intake.intakeId, stage, { expectedRevision: 1, disposition: "Approved", notes: "Fixture baseline accepted" });
  }
  let plan = (await kernel.get(root, intake.intakeId, "plan")).artifact;
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const originalPlan = read(plan.relativePath), originalIntake = read(intake.relativePath);
  const block = (proposal) => "# Work Item Decomposition\n\n```champcity-work-item-decomposition\n" + JSON.stringify(proposal) + "\n```\n";
  const siblings = { kind: "siblings", rationale: "Separate contract preparation from behavior delivery", evidence: ["Distinct acceptance outcomes found during detailed card inspection"], replacements: [item("WI01A"), item("WI01B", ["WI01A"])] };
  const prepare = (id) => api.prepareWorkItemDecomposition(intake.intakeId, id);
  const status = (id) => api.getWorkItemDecomposition(intake.intakeId, id);
  const review = (id, model, disposition = "accept", notes = "Plan change accepted") => api.reviewWorkItemDecomposition(intake.intakeId, id, { disposition, expectedProposalRevision: model.revision, expectedPlanRevision: model.planRevision, notes });
  let proposal = await prepare("WI01");
  await api.copyWorkItemDecomposition(intake.intakeId, "WI01");
  assert.match(copied, /not an implementation disposition/); assert.match(copied, /Do not split by length alone/);
  writeDraft(root, proposal.submission.expectedDraftSlots[0].draftRelativePath, block(siblings));
  proposal = await status("WI01");
  assert.equal(proposal.state, "pending"); assert.equal(read(plan.relativePath), originalPlan);
  assert.equal(proposal.resumeWorkItemId, "WI01A");
  await review("WI01", proposal, "request-revision", "Clarify acceptance ownership");
  assert.equal(read(plan.relativePath), originalPlan);
  proposal = await prepare("WI01");
  assert.match(proposal.preparedInstruction, /Clarify acceptance ownership/);
  writeDraft(root, proposal.submission.expectedDraftSlots[0].draftRelativePath, block(siblings));
  proposal = await status("WI01");
  assert.equal(proposal.revision, 2);
  await assert.rejects(review("WI01", { ...proposal, revision: 1 }), /stale/);
  const pendingBytes = read(proposal.relativePath);
  const historyPath = proposal.relativePath.replace(/\.md$/, "/PLAN_REVISION_1.md");
  hooks({ failInstalledVerification: (relative) => relative === plan.relativePath ? Error("Injected Plan install failure") : undefined });
  await assert.rejects(review("WI01", proposal), /Injected Plan install failure/);
  hooks();
  assert.equal(read(plan.relativePath), originalPlan); assert.equal(read(proposal.relativePath), pendingBytes);
  assert.equal(fs.existsSync(path.join(root, historyPath)), false);
  proposal = await review("WI01", proposal);
  assert.equal(proposal.state, "accepted"); assert.equal(proposal.resumeWorkItemId, "WI01A");
  plan = (await kernel.get(root, intake.intakeId, "plan")).artifact;
  assert.equal(plan.disposition, "Approved"); assert.equal(plan.artifactRevision, 2);
  assert.deepEqual(plan.structure.workItems.map((entry) => entry.workItemId), ["WI00", "WI01A", "WI01B", "WI02"]);
  assert.deepEqual(plan.structure.workItems[1].dependsOn, ["WI00"]);
  assert.deepEqual(plan.structure.workItems[2].dependsOn, ["WI00", "WI01A"]);
  assert.deepEqual(plan.structure.workItems[3].dependsOn, ["WI01B"]);
  const historical = parseCanonicalMarkdownDocument(read(historyPath));
  assert.equal(historical.metadata.participationRole, "historical");
  assert.equal(historical.bodyMarkdown, parseCanonicalMarkdownDocument(originalPlan).bodyMarkdown);
  const saved = parseCanonicalMarkdownDocument(read(plan.relativePath));
  assert.equal(saved.metadata.workflowData.decompositions[0].kind, "superseded-by-decomposition");
  assert.deepEqual(saved.metadata.workflowData.decompositions[0].originalCandidate, direct.workItems[1]);
  assert.throws(() => applyWorkItemDecomposition(direct, "WI01", { ...siblings, replacements: [item("X", ["Y"]), item("Y", ["X"])] }), /cycle/);
  assert.throws(() => applyWorkItemDecomposition(direct, "WI01", { ...siblings, replacements: [item("X", ["WI02"]), item("Y")] }), /original prerequisites/);

  const phase = (id, deps) => ({ phaseId: id, title: id === "P1" ? "Foundation milestone" : "Delivery milestone", purpose: `Complete ${id}`, dependsOn: deps, acceptanceCriteria: [`${id} accepted`] });
  const topology = { kind: "direct-to-phased", rationale: "Detailed acceptance requires a foundation milestone before delivery", evidence: ["Different ownership and milestone acceptance"], topologyRationale: "Genuine foundation and delivery boundaries", phases: [phase("P1", []), phase("P2", ["P1"])],
    phaseAssignments: { WI00: "P1", WI01A: "P1", WI01B: "P1" }, replacements: [{ ...item("WI02A", ["WI02B"]), phaseId: "P2" }, { ...item("WI02B"), phaseId: "P1" }] };
  proposal = await prepare("WI02");
  writeDraft(root, proposal.submission.expectedDraftSlots[0].draftRelativePath, block(topology));
  proposal = await status("WI02");
  assert.equal(proposal.resultingStructure.topology, "phased"); assert.equal(proposal.resumeWorkItemId, "WI02B", "resume follows dependencies, not array position");
  await kernel.review(root, intake.intakeId, "plan", { expectedRevision: 2, disposition: "Approved", notes: "Changed review evidence" });
  await assert.rejects(review("WI02", proposal), /stale/);
  proposal = await prepare("WI02");
  writeDraft(root, proposal.submission.expectedDraftSlots[0].draftRelativePath, block(topology));
  proposal = await status("WI02");
  await review("WI02", proposal);
  plan = (await kernel.get(root, intake.intakeId, "plan")).artifact;
  assert.equal(plan.structure.topology, "phased"); assert.equal(plan.structure.phases.length, 2);
  assert.equal(plan.identity.routeDecisionId, route.selection.decisionId);
  assert.equal(read(intake.relativePath), originalIntake); assert.equal(git("rev-parse", "HEAD"), initialHead);
  assert.equal(fs.existsSync(path.join(root, "planning/phases")), false, "no legacy executor or replacement implementation launched");
  assert.equal((await status("WI01")).state, "accepted", "original decomposition remains inspectable after later correction");
});

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
  assert.match(instruction, /inspect the existing tests and validation\/capability-map\.json/);
  assert.match(instruction, /reuse an existing test unchanged/);
  assert.match(instruction, /modify or extend an existing test at the same stable behavior or proof boundary/);
  assert.match(instruction, /consolidate overlapping or redundant proof only when this Work Card explicitly authorizes it/);
  assert.match(instruction, /create a new permanent test only for a materially distinct uncovered behavior/);
  assert.match(instruction, /production-code change does not by itself require a new test/);
  assert.match(instruction, /does not require test-count growth/);
  assert.match(instruction, /test quantity is not an acceptance criterion/);
  assert.match(instruction, /specific coverage-gap justification/);
  assert.match(instruction, /existing tests reused unchanged/);
  assert.match(instruction, /existing tests modified or extended/);
  assert.match(instruction, /tests consolidated when explicitly authorized/);
  assert.match(instruction, /tests retired when explicitly authorized/);
  assert.match(instruction, /new permanent tests added/);
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
