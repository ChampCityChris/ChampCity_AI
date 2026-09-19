const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");
const { WorkCardReportReviewWorkspace } = require("./renderer-source-loader.cjs")
  .loadRendererSourceModule("src/renderer/app/WorkCardReportReviewWorkspace.tsx");

function reportReviewModel() {
  return {
    activeWorkspaceId: "work-card-report-review",
    currentWorkCardId: "WC44-REPAIR03",
    currentTarget: "Review & Validation Workspace Layout and Document Viewer",
    workCardBuildingReview: {
      workCardId: "WC44-REPAIR03",
      workCardTitle: "Review & Validation Workspace Layout and Document Viewer",
      formalWorkCardPath: "planning/phases/phase-08/Work_Cards/WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      formalWorkCardRevision: 2,
      implementerReportPath: "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      reportFreshnessState: "fresh",
      reportDocumentReadState: "readable",
      reportReadError: "",
      report: {
        logicalDocumentId: "report-doc",
        artifactRevision: 1,
        disposition: "Pending",
      },
    },
  };
}

function reviewDocuments() {
  return [
    {
      logicalDocumentId: "formal-doc",
      markdownPath: "planning/phases/phase-08/Work_Cards/WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      displayFilename: "WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      documentReadState: "readable",
      effectiveDisposition: "Approved",
      metadata: { artifactType: "work-card", participationRole: "gatingReview" },
    },
    {
      logicalDocumentId: "report-doc",
      markdownPath: "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      displayFilename: "IMPLEMENTER_REPORT_WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer.md",
      documentReadState: "readable",
      effectiveDisposition: "Pending",
      metadata: { artifactType: "implementer-report", participationRole: "gatingReview" },
    },
  ];
}

function renderWorkspace(overrides = {}) {
  return renderToStaticMarkup(
    React.createElement(WorkCardReportReviewWorkspace, {
      advisorySummary: "",
      documentError: "",
      documents: reviewDocuments(),
      feedback: "",
      isApplying: false,
      model: reportReviewModel(),
      onAdvisorySummaryChange: () => undefined,
      onOperatorNotesChange: () => undefined,
      onRepairDefectTextChange: () => undefined,
      onSelectDocument: () => undefined,
      onValidationDecision: () => undefined,
      operatorNotes: "",
      repairDefectText: "",
      selectedDocument: {
        ...reviewDocuments()[1],
        bodyMarkdown: "# Implementer Report\n\nImplementation evidence is visible.",
        preview: "# Implementer Report",
      },
      selectedDocumentId: "report-doc",
      ...overrides,
    }),
  );
}

test("Review & Validation renders Implementer Report by default in a compact document pane", () => {
  const markup = renderWorkspace();

  assert.match(markup, /work-card-report-evidence-strip/);
  assert.match(markup, /Work Card/);
  assert.match(markup, /WC44-REPAIR03 - Review &amp; Validation Workspace Layout and Document Viewer/);
  assert.match(markup, /Report/);
  assert.match(markup, /revision 1 \| Pending \| fresh\/readable/);
  assert.match(markup, /Decision ownership/);
  assert.match(markup, /Architect review advisory; Operator decision creates validation basis\./);
  assert.match(markup, /aria-selected="true" class="document-choice selected"[^>]*><span>Implementer Report<\/span>/);
  assert.match(markup, /Read \/ Freshness/);
  assert.match(markup, /fresh \/ readable/);
  assert.match(markup, /# Implementer Report/);
  assert.match(markup, /Operator validation notes/);
  assert.match(markup, /Validate Passed/);
  assert.match(markup, /Request Repair/);
  assert.doesNotMatch(markup, /Work Card Path/);
  assert.doesNotMatch(markup, /Current Required Workflow Step/);
});

test("Review & Validation renders Approved Work Card tab content and missing document errors inline", () => {
  const approvedMarkup = renderWorkspace({
    selectedDocument: {
      ...reviewDocuments()[0],
      bodyMarkdown: "# Approved Work Card\n\nAcceptance criteria are visible.",
      preview: "# Approved Work Card",
    },
    selectedDocumentId: "formal-doc",
  });

  assert.match(approvedMarkup, /aria-selected="true" class="document-choice selected"[^>]*><span>Approved Work Card<\/span>/);
  assert.match(approvedMarkup, /# Approved Work Card/);
  assert.match(approvedMarkup, /planning\/phases\/phase-08\/Work_Cards\/WC44-REPAIR03_review_validation_workspace_layout_and_document_viewer\.md/);

  const missingReportMarkup = renderWorkspace({
    documents: reviewDocuments().filter((document) => document.logicalDocumentId !== "report-doc"),
    selectedDocument: null,
    selectedDocumentId: null,
  });

  assert.match(missingReportMarkup, /Implementer Report Markdown is missing or unreadable\./);
  assert.match(missingReportMarkup, /class="document-error"/);
});

test("Review & Validation controls omit Copy Advisory Prompt", () => {
  const componentMarkup = renderWorkspace();

  assert.doesNotMatch(componentMarkup, /Copy Advisory Prompt/);
});

test("Review and Validation uses runtime registry order and classifies report evidence", () => {
  const { workspaceDefinitions } = require("../../dist/shared/workspaceContracts.js");
  const { classifyPlanningDocument } = require("../../dist/shared/workspaces/documentWorkspace.js");
  const ids = ["work-card-building-review", "work-card-report-review", "work-card-repair"];
  const entries = ids.map((id) => workspaceDefinitions.find((entry) => entry.id === id));
  assert.deepEqual(entries.map((entry) => entry.label), ["Implement", "Review & Validation", "Work Card Repair"]);
  assert.ok(entries[0].order < entries[1].order && entries[1].order < entries[2].order);
  assert.equal(classifyPlanningDocument(reviewDocuments()[1]).workspaceId, "work-card-report-review");
  const markup = renderWorkspace();
  assert.match(markup, /Operator validation notes/);
  assert.match(markup, /Repair defect text/);
  assert.doesNotMatch(markup, /Select disposition|Apply Review|Run Codex Implementer|Cancel Codex Run/);
});
