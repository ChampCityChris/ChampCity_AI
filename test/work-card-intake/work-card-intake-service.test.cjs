const assert = require("node:assert/strict");
const test = require("node:test");

const {
  beginWorkCardPlanningForCandidate,
  generateWorkCardIntakeHandoff,
  getWorkCardIntakeProjection,
  getWorkCardMapProjection,
  resolveActiveWorkCardState,
  selectNextWorkCardCandidate,
} = require("../../dist/main/workCardIntake/workCardIntakeService.js");
const {
  resolveEffectiveWorkCardCompletion,
} = require("../../dist/main/workCardLoop/effectiveWorkCardCompletion.js");
const {
  consumeWorkCardCloseReturn,
} = require("../../dist/main/workCardLoop/workCardCloseReturnLifecycle.js");
const {
  seedApprovedPhaseInterview,
  seedApprovedPhasePlanningBundle,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
  writeDoc,
  listPlanningDocuments,
} = require("../support/canonical-markdown-fixtures.cjs");

test("Work Item artifact scopes preserve legacy paths and bind direct or genuine Phase ownership", async (t) => {
  const fs = require("node:fs");
  const path = require("node:path");
  const scopeService = require("../../dist/main/workCardLoop/workItemArtifactScope.js");
  const { seedApprovedRoutedWorkPlan } = require("../support/work-intake-fixtures.cjs");
  const { resolveWorkItemArtifactScope: resolve, workItemArtifactRoot: rootFor, workItemArtifactIdentity: identityFor,
    workItemArtifactScopeFromIdentity: scopeFrom, workItemIntakeTargets: targets, workItemReportPath: report,
    workItemValidationPath: validation, workItemRepairTargets: repair } = scopeService;
  const candidate = { candidateId: "WI01", title: "Export Rows" };
  assert.deepEqual(targets("phase-01", candidate), {
    handoffMarkdownPath: "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WI01.md",
    formalWorkCardMarkdownPath: "planning/phases/phase-01/Work_Cards/WI01_export_rows.md",
  });
  assert.equal(report("phase-01", "WI01", "planning/phases/phase-01/Work_Cards/WI01_export_rows.md"), "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WI01_export_rows.md");
  assert.equal(validation("phase-01", "WI01", 2), "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WI01_ATTEMPT02.md");
  assert.equal(repair("phase-01", "WI01-REPAIR01").repairMarkdownPath, "planning/phases/phase-01/Work_Cards/WI01-REPAIR01.md");
  assert.equal(report("phase-01", "WI01-REPAIR01", "unused", true), "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WI01-REPAIR01.md");
  assert.deepEqual(identityFor("phase-01", "WI01"), { phaseId: "phase-01", workCardId: "WI01" });
  assert.deepEqual(scopeFrom(identityFor("phase-01", "WI01")), { kind: "legacy-phase", phaseId: "phase-01" });
  assert.throws(() => rootFor("../escape"), /bounded identifier/);
  assert.throws(() => targets("phase-01", { ...candidate, candidateId: "../escape" }), /bounded identifier/);
  assert.throws(() => validation("phase-01", "WI01", 0), /positive integer/);
  for (const topology of ["direct", "phased"]) await t.test(topology, async (t) => {
    const structure = { topology, topologyRationale: "Two bounded export outcomes", acceptanceCriteria: ["Exports preserve values"],
      workItems: ["WI01", "WI02"].map((workItemId, i) => ({ workItemId, title: "Export Rows", purpose: "Preserve exported row values", dependsOn: i ? ["WI01"] : [], acceptanceCriteria: ["Rows round-trip"] })) };
    if (topology === "phased") {
      structure.phases = ["P1", "P2"].map((phaseId, i) => ({ phaseId, title: "Export milestone", purpose: "Prove the export boundary", dependsOn: i ? ["P1"] : [], acceptanceCriteria: ["Milestone proven"] }));
      structure.workItems.forEach((item, i) => { item.phaseId = `P${i + 1}`; });
    }
    const { root, intake, binding, initialHead, git } = await seedApprovedRoutedWorkPlan(t, structure);
    const ref = { kind: topology === "direct" ? "routed-direct-plan" : "routed-phase", intakeId: intake.intakeId,
      routeDecisionId: binding.identity.routeDecisionId, planId: binding.identity.planId, ...(topology === "phased" ? { phaseId: "P1" } : {}) };
    const scope = await resolve(root, ref);
    const expectedRoot = `planning/work-intake/execution/${intake.intakeId}/${ref.routeDecisionId}/${ref.planId}/${topology === "direct" ? "direct" : "phases/P1"}`;
    assert.equal(rootFor(scope), expectedRoot);
    assert.equal(scope.planDigest, binding.planDigest);
    const paths = targets(scope, candidate);
    assert.equal(paths.formalWorkCardMarkdownPath, `${expectedRoot}/Work_Cards/WI01_export_rows.md`);
    assert.equal(paths.handoffMarkdownPath, `${expectedRoot}/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WI01.md`);
    assert.equal(report(scope, "WI01", paths.formalWorkCardMarkdownPath), `${expectedRoot}/Implementer_Reports/IMPLEMENTER_REPORT_WI01_export_rows.md`);
    assert.equal(validation(scope, "WI01", 1), `${expectedRoot}/Validation_Records/VALIDATION_RECORD_WI01_ATTEMPT01.md`);
    assert.equal(repair(scope, "WI01-REPAIR02").repairMarkdownPath, `${expectedRoot}/Work_Cards/WI01-REPAIR02.md`);
    const identity = JSON.parse(JSON.stringify(identityFor(scope, "WI01")));
    assert.deepEqual(scopeFrom(identity), ref);
    assert.equal(identity.phaseId, topology === "direct" ? undefined : "P1");
    assert.throws(() => rootFor({ ...scope, root: "planning/phases/fake" }), /Resolve routed artifact scope/);
    assert.throws(() => targets(scope, { ...candidate, candidateId: "Unknown" }), /does not belong/);
    assert.throws(() => scopeFrom({ ...identity, phaseId: "fake" }), /conflicts/);
    await assert.rejects(resolve(root, { ...ref, phaseId: "fake" }), /no Phase|genuine declared Phase/);
    await assert.rejects(resolve(root, { ...ref, planId: "another-plan" }), /current routed execution binding/);
    if (topology === "phased") assert.throws(() => targets(scope, { ...candidate, candidateId: "WI02" }), /does not belong/);
    assert.equal(fs.existsSync(path.join(root, "planning/phases")), false);
    assert.equal(fs.existsSync(path.join(root, expectedRoot)), false, "addressing creates no workflow artifacts");
    assert.equal(git("rev-parse", "HEAD"), initialHead);
    const { workPlanningKernel: kernel } = require("../../dist/main/workPlanning/workPlanningKernel.js");
    await kernel.review(root, intake.intakeId, "plan", { expectedRevision: 1, disposition: "RevisionRequested", notes: "Revisit export criteria" });
    await assert.rejects(resolve(root, ref), /current approved/);
  });
});

test("work card intake selects eligible candidate and writes Markdown-only handoff", () => {
  const root = tempWorkspace("champcity-work-card-intake-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");

  const selection = selectNextWorkCardCandidate(root, "phase-01");
  assert.equal(selection.state, "selected");
  const result = generateWorkCardIntakeHandoff(root, "phase-01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md");
  assert.equal(result.formalWorkCardMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md");
  assert.equal(result.reusedExisting, false);
  assert.equal(["handoff", "Json", "Path"].join("") in result, false);
});

test("work card intake projection uses the same selected candidate and target paths as generation", () => {
  const root = tempWorkspace("champcity-work-card-intake-projection-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");

  const projection = getWorkCardIntakeProjection(root, "phase-01");
  const generated = generateWorkCardIntakeHandoff(root, "phase-01");

  assert.equal(projection.phaseId, "phase-01");
  assert.equal(projection.sourceWorkCardPlanPath, "planning/phases/phase-01/Work_Card_Plan.md");
  assert.equal(projection.selectionReason, "Candidate is planned, incomplete, and all predecessors permit continuation.");
  assert.deepEqual(projection.candidate, {
    candidateId: "WC01",
    order: 1,
    title: "First Work Card",
    purpose: "Implement the first unit.",
    dependsOn: [],
    resolutionStatus: "planned",
    resolutionReason: "",
    evidencePaths: [],
    carriedForwardToPhaseId: undefined,
  });
  assert.equal(projection.handoffMarkdownPath, generated.handoffMarkdownPath);
  assert.equal(projection.formalWorkCardMarkdownPath, generated.formalWorkCardMarkdownPath);
});

test("Work Card Map projection exposes only Complete, Eligible, and Ineligible user-facing statuses", () => {
  const root = tempWorkspace("champcity-work-card-map-projection-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);
  writeEffectiveCompletion(root, "phase-01", "WC01", "first_work_card", "2026-08-30T12:00:00.000Z");

  const projection = getWorkCardMapProjection(root, "phase-01");

  assert.equal(projection.state, "ready");
  assert.deepEqual(projection.candidates.map((candidate) => candidate.candidateId), ["WC01", "WC02", "WC03"]);
  assert.equal(projection.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
  assert.equal(projection.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Eligible");
  assert.equal(projection.candidates.find((candidate) => candidate.candidateId === "WC03").status, "Ineligible");
  assert.equal(
    projection.candidates.some((candidate) =>
      !["Complete", "Eligible", "Ineligible"].includes(candidate.status),
    ),
    false,
  );
});

test("candidate-scoped Begin Planning rejects non-eligible candidates and reuses exact current handoff", () => {
  const root = tempWorkspace("champcity-work-card-map-begin-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);
  writeEffectiveCompletion(root, "phase-01", "WC01", "first_work_card", "2026-08-30T12:00:00.000Z");

  assert.throws(
    () => beginWorkCardPlanningForCandidate(root, "phase-01", "WC01"),
    /Eligible Work Card candidate: WC01/,
  );
  assert.throws(
    () => beginWorkCardPlanningForCandidate(root, "phase-01", "WC03"),
    /Eligible Work Card candidate: WC03/,
  );

  const created = beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  assert.equal(created.candidateId, "WC02");
  assert.equal(created.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md");
  assert.equal(created.reusedExisting, false);

  const reused = beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  assert.equal(reused.candidateId, "WC02");
  assert.equal(reused.reusedExisting, true);
});

test("active Work Card state locks Begin Planning and reports conflicts", () => {
  const root = tempWorkspace("champcity-work-card-map-active-state-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedSimultaneouslyEligiblePhasePlanningBundle(root);

  const created = beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  assert.equal(created.candidateId, "WC02");

  const active = resolveActiveWorkCardState(root, "phase-01");
  assert.equal(active.status, "active");
  assert.equal(active.workCardId, "WC02");
  assert.match(active.evidencePaths.join(";"), /WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02\.md/);

  const projection = getWorkCardMapProjection(root, "phase-01");
  assert.equal(projection.candidates.find((candidate) => candidate.candidateId === "WC02").isActive, true);
  assert.equal(projection.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Eligible");
  assert.equal(projection.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Ineligible");
  assert.match(
    projection.candidates.find((candidate) => candidate.candidateId === "WC01").reason,
    /WC02 is the active Work Card/,
  );

  const reused = beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  assert.equal(reused.reusedExisting, true);
  const directReuse = generateWorkCardIntakeHandoff(root, "phase-01", "WC02");
  assert.equal(directReuse.reusedExisting, true);
  assert.throws(
    () => generateWorkCardIntakeHandoff(root, "phase-01", "WC01"),
    /Cannot begin WC01 because WC02 is the active Work Card/,
  );
  assert.throws(
    () => beginWorkCardPlanningForCandidate(root, "phase-01", "WC01"),
    /Cannot begin WC01 because WC02 is the active Work Card/,
  );

  writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md", "work-card-intake-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    workflowData: {
      candidate: {
        candidateId: "WC01",
        order: 1,
        title: "First Work Card",
        purpose: "Implement the first unit.",
        dependsOn: [],
        resolutionStatus: "planned",
        resolutionReason: "",
        evidencePaths: [],
        phaseId: "phase-01",
      },
      formalWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
    },
  });
  const conflict = resolveActiveWorkCardState(root, "phase-01");
  assert.equal(conflict.status, "conflict");
  assert.deepEqual(conflict.activeWorkCardIds.sort(), ["WC01", "WC02"]);
  const conflictMap = getWorkCardMapProjection(root, "phase-01");
  assert.equal(conflictMap.state, "needs-attention");
  assert.match(conflictMap.reason, /Multiple active incomplete Work Cards/);
  assert.throws(
    () => beginWorkCardPlanningForCandidate(root, "phase-01", "WC02"),
    /Multiple active incomplete Work Cards/,
  );
});

test("close-pending validation keeps active state until durable close-return consumption", () => {
  const root = tempWorkspace("champcity-work-card-map-close-pending-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);
  writeEffectiveCompletion(root, "phase-01", "WC01", "first_work_card", "2026-08-30T12:00:00.000Z");

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC02");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
  });
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC02_second_work_card.md", "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardIntake/workCardIntakeService.ts"],
      implementationSummary: "Completed WC02 close-pending evidence.",
      validationResults: ["work card intake service test passed"],
      acceptanceEvidence: ["close-pending active state remains bound to WC02"],
    },
    bodyMarkdown: [
      "# Implementer Report - WC02",
      "",
      "Status: Pending Operator review.",
      "",
      "## Implementation Summary",
      "Completed WC02 close-pending evidence.",
      "",
    ].join("\n"),
  });
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
    reviewedAt: "2026-08-30T13:00:00.000Z",
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC02_second_work_card.md", revision: 1 },
    ],
  });

  const active = resolveActiveWorkCardState(root, "phase-01");
  assert.equal(active.status, "active");
  assert.equal(active.workCardId, "WC02");
  assert.match(active.evidencePaths.join(";"), /IMPLEMENTER_REPORT_WC02_second_work_card\.md/);
  assert.match(active.evidencePaths.join(";"), /VALIDATION_RECORD_WC02_ATTEMPT01\.md/);

  const directMap = getWorkCardMapProjection(root, "phase-01");
  assert.equal(directMap.state, "ready");
  assert.equal(directMap.candidates.find((candidate) => candidate.candidateId === "WC02").isActive, true);
  assert.equal(directMap.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Eligible");
  assert.equal(directMap.candidates.find((candidate) => candidate.candidateId === "WC03").status, "Ineligible");
  assert.throws(
    () => beginWorkCardPlanningForCandidate(root, "phase-01", "WC03"),
    /Cannot begin WC03 because WC02 is the active Work Card/,
  );

  const completion = resolveEffectiveWorkCardCompletion(root, "phase-01", "WC02");
  consumeWorkCardCloseReturn(root, completion);
  const closeReturnedMap = getWorkCardMapProjection(root, "phase-01");
  assert.equal(closeReturnedMap.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Complete");
  assert.equal(closeReturnedMap.candidates.find((candidate) => candidate.candidateId === "WC02").isActive, false);
  assert.equal(closeReturnedMap.candidates.find((candidate) => candidate.candidateId === "WC03").status, "Eligible");
  const next = beginWorkCardPlanningForCandidate(root, "phase-01", "WC03");
  assert.equal(next.candidateId, "WC03");
});

function seedTwoCandidatePhasePlanningBundle(root) {
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
      dependsOn: ["WC01"],
      resolutionStatus: "planned",
      resolutionReason: "",
      evidencePaths: [],
    },
    {
      candidateId: "WC03",
      order: 3,
      title: "Third Work Card",
      purpose: "Implement the third unit.",
      dependsOn: ["WC02"],
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

function writeEffectiveCompletion(root, phaseId, workCardId, slug, reviewedAt) {
  const formalPath = writeDoc(
    root,
    `planning/phases/${phaseId}/Work_Cards/${workCardId}_${slug}.md`,
    "formal-work-card",
    "Approved",
    { identity: { phaseId, workCardId, candidateId: workCardId } },
  );
  const reportPath = writeDoc(
    root,
    `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_${slug}.md`,
    "implementer-report",
    "Pending",
    {
      identity: { phaseId, workCardId, candidateId: workCardId },
      sourceRevisions: [{ path: formalPath, revision: 1 }],
      workflowData: {
        repositoryVerification: "Verified approved repo root.",
        filesChanged: ["src/main/workCardIntake/workCardIntakeService.ts"],
        implementationSummary: `Completed ${workCardId} effective completion evidence.`,
        validationResults: ["work card intake service test passed"],
        acceptanceEvidence: [`${workCardId} has exact current Approved validation evidence`],
      },
      bodyMarkdown: [
        `# Implementer Report - ${workCardId}`,
        "",
        "Status: Pending Operator review.",
        "",
        "## Implementation Summary",
        `Completed ${workCardId} effective completion evidence.`,
        "",
      ].join("\n"),
    },
  );
  return writeDoc(
    root,
    `planning/phases/${phaseId}/Validation_Records/VALIDATION_RECORD_${workCardId}_ATTEMPT01.md`,
    "validation-record",
    "Approved",
    {
      identity: { phaseId, workCardId, candidateId: workCardId },
      reviewedAt,
      sourceRevisions: [
        { path: formalPath, revision: 1 },
        { path: reportPath, revision: 1 },
      ],
    },
  );
}

function seedSimultaneouslyEligiblePhasePlanningBundle(root) {
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
