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
