const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { architectBrowserSecuritySummary } = require("../../dist/main/browser/architectBrowserService.js");
const { listPlanningDocuments, savePlanningDocumentRevision } = require("../../dist/main/documents/planningDocumentService.js");
const {
  createImplementerReportForApprovedWorkCard,
  getOperatorValidationEligibility,
  reviseImplementerReport,
  setImplementerReportDisposition,
} = require("../../dist/main/workCardBuilding/workCardBuildingReviewService.js");

function createRepository(status = "Approved") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-work-card-building-"));
  const dir = path.join(root, "planning/phases/phase-01/Work_Cards");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "WC01_build.md"),
    [
      "# Formal Work Card",
      "Artifact.Revision=1",
      "participationRole=gatingReview",
      "phaseId=phase-01",
      "workCardId=WC01",
      "",
      "## Document Disposition",
      "",
      `Document.Status=${status}`,
      "",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "WC01_build.json"),
    JSON.stringify({
      artifactType: "formal-work-card",
      artifactRevision: 1,
      participationRole: "gatingReview",
      phaseId: "phase-01",
      workCardId: "WC01",
      documentDisposition: { status },
    }, null, 2) + "\n",
    "utf8",
  );
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Implementer report requires Approved Formal Work Card handoff authority", () => {
  const root = createRepository("Pending");

  assert.throws(() => createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01"), /Approved Formal Work Card/);
});

test("Implementer report references exact parent Work Card path and revision", () => {
  const root = createRepository();

  const result = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  const report = readJson(root, result.jsonPath);

  assert.equal(result.jsonPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_build.json");
  assert.deepEqual(report.parentWorkCard, {
    path: "planning/phases/phase-01/Work_Cards/WC01_build.json",
    revision: 1,
  });
  assert.equal(report.documentDisposition.status, "Pending");
  assert.equal(fs.existsSync(path.join(root, "planning/phases/phase-01/Validation_Reports")), false);
});

test("Architect review disposition is stored on the Implementer Report pair", () => {
  const root = createRepository();
  createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");

  setImplementerReportDisposition(root, "phase-01", "WC01", "Approved");

  assert.equal(getOperatorValidationEligibility(root, "phase-01", "WC01").eligible, true);
});

test("RevisionRequested report enables repair but not validation", () => {
  const root = createRepository();
  createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");

  setImplementerReportDisposition(root, "phase-01", "WC01", "RevisionRequested");

  const result = getOperatorValidationEligibility(root, "phase-01", "WC01");
  assert.equal(result.eligible, false);
  assert.equal(result.repairRequired, true);
});

test("Formal Work Card revision invalidates stale Implementer Report", () => {
  const root = createRepository();
  createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  setImplementerReportDisposition(root, "phase-01", "WC01", "Approved");
  const formal = listPlanningDocuments(root).find((document) =>
    document.jsonPath === "planning/phases/phase-01/Work_Cards/WC01_build.json"
  );

  savePlanningDocumentRevision(root, formal.logicalDocumentId);

  assert.equal(getOperatorValidationEligibility(root, "phase-01", "WC01").eligible, false);
});

test("Implementer Report revision invalidates later validation evidence", () => {
  const root = createRepository();
  const report = createImplementerReportForApprovedWorkCard(root, "phase-01", "WC01");
  setImplementerReportDisposition(root, "phase-01", "WC01", "Approved");
  const validationDir = path.join(root, "planning/phases/phase-01/Validation_Reports");
  fs.mkdirSync(validationDir, { recursive: true });
  fs.writeFileSync(
    path.join(validationDir, "VALIDATION_REPORT_WC01.json"),
    JSON.stringify({
      artifactType: "validation-record",
      artifactRevision: 1,
      participationRole: "gatingReview",
      phaseId: "phase-01",
      workCardId: "WC01",
      sourceRevisions: [{ path: report.jsonPath, revision: 1 }],
      documentDisposition: { status: "Approved" },
    }, null, 2) + "\n",
    "utf8",
  );

  reviseImplementerReport(root, "phase-01", "WC01");

  const validation = listPlanningDocuments(root).find((document) => document.displayFilename === "VALIDATION_REPORT_WC01");
  assert.equal(validation.effectiveDisposition, "Pending");
});

test("Work Card Building review preserves WC03 browser security contract", () => {
  assert.deepEqual(architectBrowserSecuritySummary(), {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: null,
  });
});
