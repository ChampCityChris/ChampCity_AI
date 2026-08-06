const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  classifyExpectedImplementerReportReadiness,
  createImplementerReportForApprovedWorkCard,
  getWorkCardBuildingReviewProjection,
  getOperatorValidationEligibility,
  resolveWorkCardImplementerReportContext,
  setImplementerReportDisposition,
} = require("../../dist/main/workCardBuilding/workCardBuildingReviewService.js");
const {
  seedApprovedFormalWorkCard,
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card building creates Markdown-only Implementer Report and gates validation eligibility", () => {
  const root = tempWorkspace("champcity-work-card-building-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");

  const result = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  assert.equal(result.markdownPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md");
  assert.equal(["json", "Path"].join("") in result, false);
  const canonical = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, result.markdownPath), "utf8"));
  assert.equal(canonical.metadata.artifactType, "implementer-report");
  assert.equal(canonical.metadata.participationRole, "gatingReview");
  assert.deepEqual(canonical.metadata.identity, { phaseId: "phase-01", workCardId: "WC01" });
  assert.deepEqual(canonical.metadata.sourceRevisions, [{
    path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md",
    revision: 1,
  }]);
  assert.equal(canonical.metadata.documentDisposition.status, "Pending");
  assert.equal(canonical.metadata.documentDisposition.notes, "");
  assert.equal(canonical.metadata.documentDisposition.reviewedAt, null);
  assert.match(canonical.bodyMarkdown, /^# Implementer Report — WC01/);
  assert.match(canonical.bodyMarkdown, /Approved Formal Work Card: planning\/phases\/phase-01\/Work_Cards\/WC01_first_work_card\.md revision 1/);
  assert.match(canonical.bodyMarkdown, /Report target: planning\/phases\/phase-01\/Implementer_Reports\/IMPLEMENTER_REPORT_WC01_first_work_card\.md/);
  assert.match(canonical.bodyMarkdown, /Status: Pending Implementer completion\./);

  let projection = getWorkCardBuildingReviewProjection(root, "phase-01", "WC01");
  assert.equal(projection.reportReadiness, "reserved-skeleton");
  assert.match(projection.reportReadinessReason, /reserved scaffold/);
  assert.equal(getOperatorValidationEligibility(root, "phase-01", "WC01").eligible, false);

  setImplementerReportDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getOperatorValidationEligibility(root, "phase-01", "WC01").eligible, false);

  writeReadyImplementerReport(root, result.markdownPath, "phase-01", "WC01");
  setImplementerReportDisposition(root, "phase-01", "WC01", "Approved");
  projection = getWorkCardBuildingReviewProjection(root, "phase-01", "WC01");
  assert.equal(projection.reportReadiness, "ready-for-review");
  assert.equal(getOperatorValidationEligibility(root, "phase-01", "WC01").eligible, true);
});

test("deterministic report resolver preserves Revisionary-style Work Card target convention", () => {
  const root = tempWorkspace("champcity-work-card-building-target-");
  const context = resolveWorkCardImplementerReportContext(root, {
    phaseId: "MVP-01",
    workCardId: "MVP-01-WC01",
    formalWorkCardPath: "planning/phases/MVP-01/Work_Cards/MVP-01-WC01_architecture_baseline_and_decision_framework.md",
    formalWorkCardRevision: 3,
    workCardTitle: "Architecture Baseline and Decision Framework",
  });

  assert.equal(
    context.implementerReportPath,
    "planning/phases/MVP-01/Implementer_Reports/IMPLEMENTER_REPORT_MVP-01-WC01_architecture_baseline_and_decision_framework.md",
  );
  assert.equal(context.formalWorkCardRevision, 3);
  assert.equal(context.workCardTitle, "Architecture Baseline and Decision Framework");
});

test("repair implementation report target is repair-specific and contract-labeled", () => {
  const root = tempWorkspace("champcity-work-card-building-repair-");
  const repairPath = "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md";
  writeDoc(root, repairPath, "repair-work-card", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", repairId: "WC01-REPAIR01", parentWorkCardId: "WC01" },
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
    },
  });

  const result = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01-REPAIR01");
  const canonical = parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, result.markdownPath), "utf8"));
  const projection = getWorkCardBuildingReviewProjection(root, "phase-01", "WC01-REPAIR01");

  assert.equal(result.markdownPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01-REPAIR01.md");
  assert.equal(projection.implementationContractType, "repair-work-card");
  assert.equal(projection.implementationContractLabel, "Approved Repair Work Card Contract");
  assert.equal(projection.formalWorkCardPath, repairPath);
  assert.equal(projection.parentWorkCardId, "WC01");
  assert.equal(canonical.metadata.identity.workCardId, "WC01-REPAIR01");
  assert.equal(canonical.metadata.identity.parentWorkCardId, "WC01");
  assert.deepEqual(canonical.metadata.sourceRevisions, [{ path: repairPath, revision: 1 }]);
  assert.match(canonical.bodyMarkdown, /Approved Repair Work Card Contract:/);
});

test("missing report projection identifies exact target and recovery is idempotent", () => {
  const root = tempWorkspace("champcity-work-card-building-recovery-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");

  const missing = getWorkCardBuildingReviewProjection(root, "phase-01", "WC01");
  assert.equal(missing.reportMissing, true);
  assert.equal(missing.reportReadiness, "missing");
  assert.equal(missing.reportDocumentReadState, "missing");
  assert.equal(missing.implementerReportPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md");

  const created = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  const before = fs.readFileSync(path.join(root, created.markdownPath), "utf8");
  const repeated = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  const after = fs.readFileSync(path.join(root, repeated.markdownPath), "utf8");

  assert.equal(repeated.markdownPath, created.markdownPath);
  assert.equal(after, before);
  assert.equal(parseCanonicalMarkdownDocument(after).metadata.artifactRevision, 1);
  assert.equal(getWorkCardBuildingReviewProjection(root, "phase-01", "WC01").reportReadiness, "reserved-skeleton");
});

test("Implementer Report readiness classifier distinguishes ready, invalid, and conflict states", () => {
  const readyRoot = tempWorkspace("champcity-work-card-building-ready-");
  seedApprovedFormalWorkCard(readyRoot, "phase-01", "WC01");
  const readyContext = resolveWorkCardImplementerReportContext(readyRoot, {
    phaseId: "phase-01",
    workCardId: "WC01",
  });
  writeReadyImplementerReport(readyRoot, readyContext.implementerReportPath, "phase-01", "WC01");
  assert.equal(
    classifyExpectedImplementerReportReadiness(readyRoot, {
      ...readyContext,
      existingReport: listPlanningDocuments(readyRoot)
        .find((document) => document.markdownPath === readyContext.implementerReportPath),
    }).reportReadiness,
    "ready-for-review",
  );

  const invalidRoot = tempWorkspace("champcity-work-card-building-invalid-");
  seedApprovedFormalWorkCard(invalidRoot, "phase-01", "WC01");
  writeReadyImplementerReport(invalidRoot, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "phase-01", "WC02");
  assert.equal(getWorkCardBuildingReviewProjection(invalidRoot, "phase-01", "WC01").reportReadiness, "invalid");

  const conflictRoot = tempWorkspace("champcity-work-card-building-readiness-conflict-");
  seedApprovedFormalWorkCard(conflictRoot, "phase-01", "WC01");
  writeReadyImplementerReport(conflictRoot, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "phase-01", "WC01");
  writeReadyImplementerReport(conflictRoot, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_other.md", "phase-01", "WC01");
  assert.equal(getWorkCardBuildingReviewProjection(conflictRoot, "phase-01", "WC01").reportReadiness, "conflict");
});

test("conflicting existing report blocks registration without mutating either file", () => {
  const root = tempWorkspace("champcity-work-card-building-conflict-");
  const formalPath = seedApprovedFormalWorkCard(root, "phase-01", "WC01");
  const conflictPath = "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_wrong.md";
  writeDoc(root, conflictPath, "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });
  const beforeFormal = fs.readFileSync(path.join(root, formalPath), "utf8");
  const beforeConflict = fs.readFileSync(path.join(root, conflictPath), "utf8");

  assert.throws(
    () => createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01"),
    /Conflicting Implementer Report target/,
  );
  assert.equal(fs.readFileSync(path.join(root, formalPath), "utf8"), beforeFormal);
  assert.equal(fs.readFileSync(path.join(root, conflictPath), "utf8"), beforeConflict);
  assert.equal(
    fs.existsSync(path.join(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md")),
    false,
  );
});

function writeReadyImplementerReport(root, relativePath, phaseId, workCardId) {
  return writeDoc(root, relativePath, "implementer-report", "Pending", {
    identity: { phaseId, workCardId },
    sourceRevisions: [
      { path: `planning/phases/${phaseId}/Work_Cards/${workCardId}_first_work_card.md`, revision: 1 },
    ],
    workflowData: {
      repositoryVerification: "Verified approved repo root.",
      filesChanged: ["src/main/workCardBuilding/workCardBuildingReviewService.ts"],
      implementationSummary: "Implemented the readiness classifier.",
      validationResults: ["focused readiness tests passed"],
      acceptanceEvidence: ["ready report routes to review"],
    },
    bodyMarkdown: [
      `# Implementer Report - ${workCardId}`,
      "",
      "Status: Pending Operator review.",
      "",
      "## Repository Verification",
      "Verified approved repo root.",
      "## Implementation Summary",
      "Implemented the readiness classifier.",
      "## Files Modified",
      "src/main/workCardBuilding/workCardBuildingReviewService.ts",
      "## Validation Performed",
      "focused readiness tests passed",
      "",
    ].join("\n"),
  });
}
