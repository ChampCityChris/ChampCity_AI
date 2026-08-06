const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveWorkCardLoopAuthority,
} = require("../../dist/main/workCardLoop/workCardLoopAuthorityService.js");
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

test("Work Card loop authority resolves map-ready, planning, build, review, close, all-complete, and conflict", () => {
  const root = tempWorkspace("champcity-work-card-loop-authority-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);

  let authority = resolveWorkCardLoopAuthority(root, "phase-01");
  assert.equal(authority.status, "map-ready");
  assert.equal(authority.workspaceId, "phase-work-card-selection");
  assert.equal(authority.loopStep, "Map");
  assert.equal(authority.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Eligible");

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC01");
  authority = resolveWorkCardLoopAuthority(root, "phase-01");
  assert.equal(authority.status, "active");
  assert.equal(authority.workspaceId, "work-card-planning");
  assert.equal(authority.workCardId, "WC01");
  assert.equal(authority.loopStep, "Planning");

  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  authority = resolveWorkCardLoopAuthority(root, "phase-01");
  assert.equal(authority.workspaceId, "work-card-building-review");
  assert.equal(authority.loopStep, "Build");
  assert.equal(authority.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md");

  writeReadyImplementerReport(root, "phase-01", "WC01", "Pending");
  authority = resolveWorkCardLoopAuthority(root, "phase-01");
  assert.equal(authority.workspaceId, "work-card-report-review");
  assert.equal(authority.loopStep, "ReviewAndValidation");

  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", revision: 1 },
    ],
  });
  authority = resolveWorkCardLoopAuthority(root, "phase-01");
  assert.equal(authority.workspaceId, "work-card-close");
  assert.equal(authority.loopStep, "Close");

  authority = resolveWorkCardLoopAuthority(root, "phase-01", { closeReturnCompleted: true });
  assert.equal(authority.status, "map-ready");
  assert.equal(authority.candidates.find((candidate) => candidate.candidateId === "WC01").status, "Complete");
  assert.equal(authority.candidates.find((candidate) => candidate.candidateId === "WC02").status, "Eligible");

  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
  });
  authority = resolveWorkCardLoopAuthority(root, "phase-01", { closeReturnCompleted: true });
  assert.equal(authority.status, "all-complete");
  assert.equal(authority.workspaceId, "phase-work-card-selection");

  const conflictRoot = tempWorkspace("champcity-work-card-loop-conflict-");
  seedApprovedProjectPlanning(conflictRoot);
  seedPhaseMap(conflictRoot, "phase-01");
  seedApprovedPhaseInterview(conflictRoot, "phase-01");
  seedSimultaneouslyEligiblePhasePlanningBundle(conflictRoot);
  generateWorkCardIntakeHandoff(conflictRoot, "phase-01", "WC01");
  writeDoc(conflictRoot, "planning/phases/phase-01/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC02.md", "work-card-intake-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { phaseId: "phase-01", workCardId: "WC02" },
    workflowData: {
      candidate: {
        candidateId: "WC02",
        order: 2,
        title: "Second Work Card",
        purpose: "Implement the second unit.",
        dependsOn: [],
        resolutionStatus: "planned",
        resolutionReason: "",
        evidencePaths: [],
        phaseId: "phase-01",
      },
      formalWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md",
    },
  });
  authority = resolveWorkCardLoopAuthority(conflictRoot, "phase-01");
  assert.equal(authority.status, "conflict");
  assert.equal(authority.workspaceId, "phase-work-card-selection");
  assert.match(authority.blocker, /Multiple active incomplete Work Cards/);
});

test("Work Card loop authority resolves active repair with parent identity", () => {
  const root = tempWorkspace("champcity-work-card-loop-repair-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_repair_test_defect.md",
    },
  });

  const authority = resolveWorkCardLoopAuthority(root, "phase-01");

  assert.equal(authority.status, "active");
  assert.equal(authority.workspaceId, "work-card-repair");
  assert.equal(authority.workCardId, "WC01");
  assert.equal(authority.repairId, "WC01-REPAIR01");
  assert.equal(authority.parentWorkCardId, "WC01");
  assert.equal(authority.loopStep, "Repair");
});

test("Approved Repair Work Card routes to Implement with repair report target", () => {
  const root = tempWorkspace("champcity-work-card-loop-approved-repair-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const handoffPath = writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md",
    },
  });
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", "repair-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", repairId: "WC01-REPAIR01", parentWorkCardId: "WC01" },
    sourceRevisions: [
      { path: reportPath, revision: 1 },
      { path: handoffPath, revision: 1 },
    ],
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
    },
  });

  const authority = resolveWorkCardLoopAuthority(root, "phase-01");

  assert.equal(authority.status, "active");
  assert.equal(authority.workspaceId, "work-card-building-review");
  assert.equal(authority.workCardId, "WC01-REPAIR01");
  assert.equal(authority.repairId, "WC01-REPAIR01");
  assert.equal(authority.parentWorkCardId, "WC01");
  assert.equal(authority.loopStep, "Build");
  assert.equal(authority.formalWorkCardPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(authority.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.match(authority.requiredAction, /create the application-owned repair Implementer Report/);
  assert.equal(authority.blocker, undefined);
});

test("reserved repair Implementer Report keeps Approved Repair Work Card in Implement", () => {
  const root = tempWorkspace("champcity-work-card-loop-approved-repair-reserved-");
  seedApprovedRepairImplementation(root);
  writeReservedRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");

  const authority = resolveWorkCardLoopAuthority(root, "phase-01");

  assert.equal(authority.status, "active");
  assert.equal(authority.workspaceId, "work-card-building-review");
  assert.equal(authority.workCardId, "WC01-REPAIR01");
  assert.equal(authority.repairId, "WC01-REPAIR01");
  assert.equal(authority.parentWorkCardId, "WC01");
  assert.equal(authority.loopStep, "Build");
  assert.equal(authority.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.match(authority.requiredAction, /complete the reserved repair Implementer Report with substantive evidence/);
  assert.equal(authority.blocker, undefined);
});

test("invalid and conflicting repair Implementer Reports keep Approved Repair Work Card in Implement with blocker", () => {
  const invalidRoot = tempWorkspace("champcity-work-card-loop-approved-repair-invalid-");
  seedApprovedRepairImplementation(invalidRoot);
  writeReadyRepairImplementerReport(invalidRoot, "phase-01", "WC02", "WC01-REPAIR01");

  const invalidAuthority = resolveWorkCardLoopAuthority(invalidRoot, "phase-01");

  assert.equal(invalidAuthority.workspaceId, "work-card-building-review");
  assert.equal(invalidAuthority.loopStep, "Build");
  assert.equal(invalidAuthority.workCardId, "WC01-REPAIR01");
  assert.equal(invalidAuthority.parentWorkCardId, "WC01");
  assert.match(invalidAuthority.requiredAction, /repair identity does not match/);
  assert.match(invalidAuthority.blocker, /repair identity does not match/);

  const conflictRoot = tempWorkspace("champcity-work-card-loop-approved-repair-conflict-");
  seedApprovedRepairImplementation(conflictRoot);
  writeReadyRepairImplementerReport(conflictRoot, "phase-01", "WC01", "WC01-REPAIR01");
  writeReadyRepairImplementerReportAtPath(
    conflictRoot,
    "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01_other.md",
    "phase-01",
    "WC01",
    "WC01-REPAIR01",
  );

  const conflictAuthority = resolveWorkCardLoopAuthority(conflictRoot, "phase-01");

  assert.equal(conflictAuthority.workspaceId, "work-card-building-review");
  assert.equal(conflictAuthority.loopStep, "Build");
  assert.equal(conflictAuthority.workCardId, "WC01-REPAIR01");
  assert.equal(conflictAuthority.parentWorkCardId, "WC01");
  assert.match(conflictAuthority.requiredAction, /Conflicting Implementer Report target exists/);
  assert.match(conflictAuthority.blocker, /Conflicting Implementer Report target exists/);
});

test("ready repair Implementer Report routes Approved Repair Work Card to Review and Validation", () => {
  const root = tempWorkspace("champcity-work-card-loop-approved-repair-ready-");
  seedApprovedRepairImplementation(root);
  writeReadyRepairImplementerReport(root, "phase-01", "WC01", "WC01-REPAIR01");

  const authority = resolveWorkCardLoopAuthority(root, "phase-01");

  assert.equal(authority.status, "active");
  assert.equal(authority.workspaceId, "work-card-report-review");
  assert.equal(authority.workCardId, "WC01-REPAIR01");
  assert.equal(authority.repairId, "WC01-REPAIR01");
  assert.equal(authority.parentWorkCardId, "WC01");
  assert.equal(authority.loopStep, "ReviewAndValidation");
  assert.equal(authority.formalWorkCardPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(authority.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.match(authority.requiredAction, /Review the current repair Implementer Report/);
});

test("WC02 approved Formal Work Card outranks stale WC01 Close evidence", () => {
  const root = tempWorkspace("champcity-work-card-loop-stale-close-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedTwoCandidatePhasePlanningBundle(root);
  generateWorkCardIntakeHandoff(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeReadyImplementerReport(root, "phase-01", "WC01", "Pending");
  writeDoc(root, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md", "validation-record", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
      { path: "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", revision: 1 },
    ],
  });

  beginWorkCardPlanningForCandidate(root, "phase-01", "WC02", { closeReturnCompleted: true });
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC02_second_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC02", candidateId: "WC02" },
  });

  const authority = resolveWorkCardLoopAuthority(root, "phase-01");

  assert.equal(authority.status, "active");
  assert.equal(authority.workspaceId, "work-card-building-review");
  assert.equal(authority.workCardId, "WC02");
  assert.equal(authority.loopStep, "Build");
  assert.doesNotMatch(authority.sourceEvidence.join(";"), /VALIDATION_RECORD_WC01/);
});

test("Work Card loop keeps application-created skeleton reports in Build Review", () => {
  const root = tempWorkspace("champcity-work-card-loop-skeleton-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [
      { path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
    },
    bodyMarkdown: [
      "# Implementer Report - WC01",
      "",
      "Status: Pending Implementer completion.",
      "",
      "## Repository Verification",
      "## Implementation Summary",
      "## Files Created",
      "## Files Modified",
      "## Acceptance Criteria Evidence",
      "",
    ].join("\n"),
  });

  const authority = resolveWorkCardLoopAuthority(root, "phase-01");

  assert.equal(authority.workspaceId, "work-card-building-review");
  assert.equal(authority.loopStep, "Build");
  assert.match(authority.reason, /reserved scaffold/);
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

function writeReadyImplementerReport(root, phaseId, workCardId, status = "Pending") {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCardId}_first_work_card.md`, "implementer-report", status, {
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardLoop/workCardLoopAuthorityService.ts"],
      implementationSummary: "Implemented readiness-gated loop routing.",
      validationResults: ["work card loop authority test passed"],
      acceptanceEvidence: ["ready report routes to Review & Validation"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Implementation Summary",
      "Implemented readiness-gated loop routing.",
      "## Validation Performed",
      "work card loop authority test passed",
      "",
    ].join("\n"),
  });
}

function seedApprovedRepairImplementation(root) {
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  seedApprovedPhasePlanningBundle(root, "phase-01", "WC01");
  generateWorkCardIntakeHandoff(root, "phase-01");
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", "formal-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01", candidateId: "WC01" },
  });
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const handoffPath = writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: reportPath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md",
    },
  });
  writeDoc(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md", "repair-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", repairId: "WC01-REPAIR01", parentWorkCardId: "WC01" },
    sourceRevisions: [
      { path: reportPath, revision: 1 },
      { path: handoffPath, revision: 1 },
    ],
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath: reportPath,
      boundedDefect: "Repair test defect.",
      returnTarget: "work-card-building-review",
    },
  });
}

function writeReadyRepairImplementerReport(root, phaseId, parentWorkCardId, repairId) {
  return writeReadyRepairImplementerReportAtPath(
    root,
    `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`,
    phaseId,
    parentWorkCardId,
    repairId,
  );
}

function writeReadyRepairImplementerReportAtPath(root, markdownPath, phaseId, parentWorkCardId, repairId) {
  return writeDoc(root, markdownPath, "implementer-report", "Pending", {
    identity: { phaseId, workCardId: repairId, repairId, parentWorkCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${repairId}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardLoop/workCardLoopAuthorityService.ts"],
      implementationSummary: "Implemented the approved repair contract.",
      validationResults: ["repair implementation test passed"],
      acceptanceEvidence: ["ready repair report routes to Review & Validation"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented the approved repair contract.",
      "## Validation Performed",
      "repair implementation test passed",
      "",
    ].join("\n"),
  });
}

function writeReservedRepairImplementerReport(root, phaseId, parentWorkCardId, repairId) {
  return writeDoc(root, `planning/phases/${phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}.md`, "implementer-report", "Pending", {
    identity: { phaseId, workCardId: repairId, repairId, parentWorkCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${repairId}.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Pending Implementer verification.",
      filesChanged: [],
      implementationSummary: "",
      validationResults: [],
      acceptanceEvidence: [],
    },
    bodyMarkdown: [
      `# Implementer Report - ${repairId}`,
      "",
      "Status: Pending Implementer completion.",
      "",
      "## Repository Verification",
      "## Implementation Summary",
      "## Files Created",
      "## Files Modified",
      "## Acceptance Criteria Evidence",
      "",
    ].join("\n"),
  });
}
