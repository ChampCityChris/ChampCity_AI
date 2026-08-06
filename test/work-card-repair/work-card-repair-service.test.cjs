const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createRepairWorkCard,
  getWorkCardRepairProjection,
  resolveCurrentRepairEvidence,
} = require("../../dist/main/workCardRepair/workCardRepairService.js");
const {
  getArchitectOutputWorkspaceModel,
  prepareArchitectOutputHandoff,
} = require("../../dist/main/architectOutputs/architectOutputWorkspaceService.js");
const {
  listPlanningDocuments,
  tempWorkspace,
  writeDoc,
} = require("../support/canonical-markdown-fixtures.cjs");

test("work card repair creates Markdown-only repair handoff from RevisionRequested evidence", () => {
  const root = tempWorkspace("champcity-work-card-repair-");
  const evidencePath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    notes: "Repair required.",
  });

  const result = createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Fix literal compliance");
  assert.equal(result.repairId, "WC01-REPAIR01");
  assert.equal(result.handoffMarkdownPath, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md");
  assert.equal(result.repairMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(["repair", "Json", "Path"].join("") in result, false);
});

test("work card repair resolves MVP phase metadata and reuses evidence-matched handoff", () => {
  const root = tempWorkspace("champcity-work-card-repair-mvp-");
  const evidencePath = writeDoc(root, "planning/phases/MVP-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "RevisionRequested", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    workflowData: { repairDefectText: "Repair the workspace handoff flow." },
  });

  const evidence = resolveCurrentRepairEvidence(root);
  assert.equal(evidence.phaseId, "MVP-01");
  assert.equal(evidence.workCardId, "WC02");
  assert.equal(evidence.path, evidencePath);
  assert.equal(evidence.origin, "postValidationRecord");
  assert.equal(evidence.repairDefectText, "Repair the workspace handoff flow.");

  const first = createRepairWorkCard(root, evidence.phaseId, evidence.workCardId, evidence.path, evidence.origin, evidence.repairDefectText);
  const second = createRepairWorkCard(root, evidence.phaseId, evidence.workCardId, evidence.path, evidence.origin, evidence.repairDefectText);
  assert.deepEqual(second, first);
  assert.equal(
    listPlanningDocuments(root).filter((document) => document.metadata.canonical?.workflowData.handoffKind === "repair").length,
    1,
  );
  assert.equal(first.handoffMarkdownPath, "planning/phases/MVP-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC02-REPAIR01.md");
  assert.equal(first.repairMarkdownPath, "planning/phases/MVP-01/Work_Cards/WC02-REPAIR01.md");
});

test("repair creation normalizes unattached legacy defect-slug handoff target", () => {
  const root = tempWorkspace("champcity-work-card-repair-normalize-");
  const evidencePath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    notes: "Repair required.",
  });
  const oldTarget = "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_repair_required.md";
  writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: evidencePath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath,
      boundedDefect: "Repair required.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: oldTarget,
    },
  });

  const result = createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Repair required.");
  const handoff = listPlanningDocuments(root).find((document) => document.markdownPath === result.handoffMarkdownPath);

  assert.equal(result.repairMarkdownPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01.md");
  assert.equal(handoff.metadata.canonical.workflowData.repairWorkCardTarget, result.repairMarkdownPath);
  assert.equal(handoff.metadata.artifactRevision, 2);
});

test("repair creation preserves attached legacy defect-slug handoff target", () => {
  const root = tempWorkspace("champcity-work-card-repair-preserve-");
  const evidencePath = writeDoc(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01_first_work_card.md", "implementer-report", "RevisionRequested", {
    identity: { phaseId: "phase-01", workCardId: "WC01" },
    notes: "Repair required.",
  });
  const oldTarget = "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_repair_required.md";
  const handoffPath = writeDoc(root, "planning/phases/phase-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC01-REPAIR01.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "phase-01", repairId: "WC01-REPAIR01" },
    sourceRevisions: [{ path: evidencePath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC01-REPAIR01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath,
      boundedDefect: "Repair required.",
      returnTarget: "work-card-building-review",
      repairWorkCardTarget: oldTarget,
    },
  });
  writeDoc(root, oldTarget, "repair-work-card", "Pending", {
    identity: { phaseId: "phase-01", workCardId: "WC01-REPAIR01", repairId: "WC01-REPAIR01", parentWorkCardId: "WC01" },
    sourceRevisions: [
      { path: evidencePath, revision: 1 },
      { path: handoffPath, revision: 1 },
    ],
    workflowData: {
      repairId: "WC01-REPAIR01",
      parentWorkCardId: "WC01",
      originalParentWorkCardId: "WC01",
      origin: "preValidationReportReview",
      evidencePath,
      boundedDefect: "Repair required.",
      returnTarget: "work-card-building-review",
    },
  });

  const result = createRepairWorkCard(root, "phase-01", "WC01", evidencePath, "preValidationReportReview", "Repair required.");
  const handoff = listPlanningDocuments(root).find((document) => document.markdownPath === result.handoffMarkdownPath);

  assert.equal(result.repairMarkdownPath, oldTarget);
  assert.equal(handoff.metadata.canonical.workflowData.repairWorkCardTarget, oldTarget);
  assert.equal(handoff.metadata.artifactRevision, 1);
});

test("repair projection enables Architect preparation and copy after handoff creation", () => {
  const root = tempWorkspace("champcity-work-card-repair-projection-");
  const { evidencePath, reportPath, formalPath } = seedPostValidationRepairEvidence(root);

  let projection = getWorkCardRepairProjection(root);
  assert.equal(projection.state, "handoff-needed");
  assert.equal(projection.canCreateRepairHandoff, true);
  assert.equal(projection.repairDefectText, "Repair the workspace handoff flow.");
  assert.equal(projection.primaryEvidenceDocument.label, "Validation Record");
  assert.equal(projection.primaryEvidenceDocument.markdownPath, evidencePath);
  assert.equal(projection.primaryEvidenceDocument.documentReadState, "readable");
  assert.deepEqual(
    projection.supportingEvidenceDocuments.map((document) => document.markdownPath),
    [reportPath, formalPath],
  );
  assert.match(projection.primaryEvidenceDocument.bodyMarkdown, /Operator Validation Notes/);
  assert.equal(projection.operatorValidationNotes, "Operator noted the failed repair UX.");
  assert.equal(projection.advisorySummary, "Architect advised a prompt-flow repair.");

  createRepairWorkCard(root, "MVP-01", "WC02", evidencePath, "postValidationRecord", "Repair the workspace handoff flow.");
  projection = getWorkCardRepairProjection(root);
  assert.equal(projection.state, "handoff-ready");
  assert.equal(projection.canPrepareArchitectHandoff, true);
  assert.equal(projection.repairWorkCardTarget, "planning/phases/MVP-01/Work_Cards/WC02-REPAIR01.md");

  const prepared = prepareArchitectOutputHandoff(root, "work-card-repair");
  assert.equal(prepared.canCopyHandoff, true);
  projection = getWorkCardRepairProjection(root);
  assert.equal(projection.state, "draft-pending");
  assert.equal(projection.canCopyArchitectHandoff, true);
  const refreshed = getArchitectOutputWorkspaceModel(root, "work-card-repair");
  assert.match(refreshed.preparedInstruction, /Use the selected project workspace already connected in this task/);
  assert.match(refreshed.preparedInstruction, /Treat the Validation Record as the repair authority/);
  assert.match(refreshed.preparedInstruction, /Read the Validation Record first/);
  assert.match(refreshed.preparedInstruction, new RegExp(`Validation Record path: ${evidencePath}`));
  assert.match(refreshed.preparedInstruction, new RegExp(`Implementer Report path: ${reportPath}`));
  assert.match(refreshed.preparedInstruction, new RegExp(`Formal Work Card path: ${formalPath}`));
  assert.match(refreshed.preparedInstruction, /Phase ID: MVP-01/);
  assert.match(refreshed.preparedInstruction, /Final Repair Work Card target: planning\/phases\/MVP-01\/Work_Cards\/WC02-REPAIR01\.md/);
  assert.doesNotMatch(refreshed.preparedInstruction, /separate Advisory Architect Review document/);
});

test("repair projection surfaces conflicting active repair authority", () => {
  const root = tempWorkspace("champcity-work-card-repair-conflict-");
  const { evidencePath } = seedPostValidationRepairEvidence(root);
  createRepairWorkCard(root, "MVP-01", "WC02", evidencePath, "postValidationRecord", "Repair the workspace handoff flow.");
  writeDoc(root, "planning/phases/MVP-01/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_WC02-REPAIR99.md", "generated-handoff", "Approved", {
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "repair", phaseId: "MVP-01", repairId: "WC02-REPAIR99" },
    sourceRevisions: [{ path: evidencePath, revision: 1 }],
    workflowData: {
      handoffKind: "repair",
      repairId: "WC02-REPAIR99",
      originalParentWorkCardId: "WC02",
      origin: "postValidationRecord",
      evidencePath,
      boundedDefect: "Conflicting repair.",
      returnTarget: "work-card-validation",
      repairWorkCardTarget: "planning/phases/MVP-01/Work_Cards/WC02-REPAIR99_conflicting_repair.md",
    },
  });

  const projection = getWorkCardRepairProjection(root);
  assert.equal(projection.state, "needs-attention");
  assert.match(projection.reason, /Multiple Approved Repair Architect handoffs have no final Repair Work Card output/);
  assert.throws(
    () => createRepairWorkCard(root, "MVP-01", "WC02", evidencePath, "postValidationRecord", "Another repair."),
    /active Repair Architect handoff already exists/,
  );
});

test("repair projection surfaces missing supporting evidence as needs-attention", () => {
  const root = tempWorkspace("champcity-work-card-repair-missing-evidence-");
  const formalPath = "planning/phases/MVP-01/Work_Cards/WC02_first.md";
  const reportPath = "planning/phases/MVP-01/Implementer_Reports/MISSING_REPORT.md";
  writeDoc(root, formalPath, "formal-work-card", "Approved", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
  });
  const evidencePath = writeDoc(root, "planning/phases/MVP-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "RevisionRequested", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    sourceRevisions: [
      { path: formalPath, revision: 1 },
      { path: reportPath, revision: 1 },
    ],
    workflowData: {
      operatorValidationNotes: "Operator notes",
      advisorySummary: "Advisory summary",
      repairDefectText: "Repair the workspace handoff flow.",
      formalWorkCardPath: formalPath,
      implementerReportPath: reportPath,
      implementerReportRevision: 1,
    },
    bodyMarkdown: "# Validation Record\n\n## Operator Validation Notes\nOperator notes\n",
  });

  const projection = getWorkCardRepairProjection(root);

  assert.equal(projection.state, "needs-attention");
  assert.equal(projection.primaryEvidenceDocument.markdownPath, evidencePath);
  const report = projection.supportingEvidenceDocuments.find((document) => document.label === "Implementer Report");
  assert.equal(report.documentReadState, "missing");
  assert.match(projection.reason, /Implementer Report repair evidence needs attention/);
  assert.equal(projection.canCreateRepairHandoff, false);
});

function seedPostValidationRepairEvidence(root) {
  const formalPath = writeDoc(root, "planning/phases/MVP-01/Work_Cards/WC02_first.md", "formal-work-card", "Approved", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    bodyMarkdown: "# Formal Work Card\n\nApproved work card body.\n",
  });
  const reportPath = writeDoc(root, "planning/phases/MVP-01/Implementer_Reports/IMPLEMENTER_REPORT_WC02_first.md", "implementer-report", "Approved", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    sourceRevisions: [{ path: formalPath, revision: 1 }],
    bodyMarkdown: "# Implementer Report\n\nImplementation evidence.\n",
  });
  const evidencePath = writeDoc(root, "planning/phases/MVP-01/Validation_Records/VALIDATION_RECORD_WC02_ATTEMPT01.md", "validation-record", "RevisionRequested", {
    identity: { phaseId: "MVP-01", workCardId: "WC02" },
    sourceRevisions: [
      { path: formalPath, revision: 1 },
      { path: reportPath, revision: 1 },
    ],
    workflowData: {
      operatorValidationNotes: "Operator noted the failed repair UX.",
      advisorySummary: "Architect advised a prompt-flow repair.",
      repairDefectText: "Repair the workspace handoff flow.",
      formalWorkCardPath: formalPath,
      implementerReportPath: reportPath,
      implementerReportRevision: 1,
    },
    bodyMarkdown: [
      "# Validation Record",
      "",
      "## Operator Validation Notes",
      "Operator noted the failed repair UX.",
      "",
      "## Advisory Summary",
      "Architect advised a prompt-flow repair.",
      "",
      "## Repair Defect Text",
      "Repair the workspace handoff flow.",
      "",
    ].join("\n"),
  });
  return { evidencePath, formalPath, reportPath };
}
