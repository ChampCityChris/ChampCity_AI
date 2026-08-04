const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  applyOperatorValidationDecision,
  buildAdvisoryArchitectReviewPrompt,
  createValidationAttempt,
  getWorkCardCloseProjection,
  setValidationRecordDisposition,
} = require("../../dist/main/workCardValidation/workCardValidationService.js");
const {
  seedApprovedFormalWorkCard,
  tempWorkspace,
  listPlanningDocuments,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card validation creates Markdown-only validation record and closes on approval", () => {
  const root = tempWorkspace("champcity-work-card-validation-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Approved", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
  });

  const result = createValidationAttempt(root, "phase-01", "WC01");
  assert.equal(result.attemptNumber, 1);
  assert.equal(result.markdownPath, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md");
  assert.equal(["json", "Path"].join("") in result, false);

  setValidationRecordDisposition(root, "phase-01", "WC01", "Approved");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);
});

test("advisory Architect prompt is generated from repository evidence", () => {
  const root = tempWorkspace("champcity-work-card-advisory-prompt-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [{ path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 }],
    workflowData: {
      filesChanged: ["src/main/workCardValidation/workCardValidationService.ts"],
    },
  });

  const result = buildAdvisoryArchitectReviewPrompt(root, "phase-01", "WC01");
  assert.match(result.instruction, /Use ChampCity MCP with repository reference <PROJECT_REPO>\./);
  assert.match(result.instruction, /You are not the disposition authority\./);
  assert.match(result.instruction, /The Operator is the final authority/);
  assert.match(result.instruction, /# Advisory Architect Review — WC01/);
  assert.match(result.instruction, /## Suggested Operator Decision/);
  assert.match(result.instruction, /- Validate Passed/);
  assert.match(result.instruction, /- Request Repair/);
  assert.match(result.instruction, /- Inconclusive/);
  assert.match(result.instruction, /- src\/main\/workCardValidation\/workCardValidationService\.ts/);
  assert.match(result.formalWorkCardSha256, /^[a-f0-9]{64}$/);
  assert.match(result.implementerReportSha256, /^[a-f0-9]{64}$/);
});

test("Operator Validate Passed writes validation authority without mutating Implementer Report disposition", () => {
  const root = tempWorkspace("champcity-operator-validate-passed-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");
  const reportPath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [{ path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 }],
  });

  const result = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "ValidatePassed",
    operatorNotes: "Manual smoke passed.",
    advisorySummary: "Architect suggested Validate Passed.",
  });

  assert.equal(result.status, "Approved");
  assert.equal(result.markdownPath, "planning/phases/phase-01/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT01.md");
  assert.equal(getWorkCardCloseProjection(root, "phase-01", "WC01").closed, true);
  const report = listPlanningDocuments(root).find((document) => document.markdownPath === reportPath);
  assert.equal(report.effectiveDisposition, "Pending");
  const validation = fs.readFileSync(path.join(root, result.markdownPath), "utf8");
  assert.match(validation, /operatorDecisionCreatesAuthority/);
  assert.match(validation, /Manual smoke passed\./);
});

test("Operator Request Repair requires defect text, writes one RevisionRequested validation record, and blocks duplicate final decision", () => {
  const root = tempWorkspace("champcity-operator-request-repair-");
  seedApprovedFormalWorkCard(root, "phase-01", "WC01");
  writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    sourceRevisions: [{ path: "planning/phases/phase-01/Work_Cards/WC01_first_work_card.md", revision: 1 }],
  });

  assert.throws(
    () => applyOperatorValidationDecision(root, "phase-01", "WC01", {
      decision: "RequestRepair",
      operatorNotes: "Found defect.",
      repairDefectText: "",
    }),
    /Repair defect text is required/,
  );

  const result = applyOperatorValidationDecision(root, "phase-01", "WC01", {
    decision: "RequestRepair",
    operatorNotes: "Found defect.",
    advisorySummary: "Architect suggested Request Repair.",
    repairDefectText: "Fix the missing authority path.",
  });
  assert.equal(result.status, "RevisionRequested");
  assert.equal(result.attemptNumber, 1);
  assert.throws(
    () => applyOperatorValidationDecision(root, "phase-01", "WC01", {
      decision: "ValidatePassed",
      operatorNotes: "Trying again.",
    }),
    /Validation decision already exists/,
  );
  const records = listPlanningDocuments(root).filter((document) =>
    document.markdownPath.includes("/Validation_Records/VALIDATION_RECORD_WC01_ATTEMPT")
  );
  assert.equal(records.length, 1);
});
