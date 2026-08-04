const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const componentSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "WorkCardReportReviewWorkspace.tsx");
const appSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "app", "App.tsx");
const stylesSourcePath = path.join(__dirname, "..", "..", "src", "renderer", "styles.css");
const workspaceSourcePath = path.join(__dirname, "..", "..", "src", "shared", "workspaceContracts.ts");
const documentWorkspaceSourcePath = path.join(__dirname, "..", "..", "src", "shared", "workspaces", "documentWorkspace.ts");
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
      onCopyAdvisoryPrompt: () => undefined,
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

test("Review & Validation workspace offers evidence choices and Operator validation controls", () => {
  const source = fs.readFileSync(componentSourcePath, "utf8");
  const selectorSource = source.slice(
    source.indexOf("aria-label=\"Review and validation documents\""),
    source.indexOf("<article className=\"document-preview\">"),
  );
  const choiceLabels = [...selectorSource.matchAll(/<span>(Approved Work Card|Implementer Report)<\/span>/g)]
    .map((match) => match[1]);

  assert.deepEqual(choiceLabels, ["Approved Work Card", "Implementer Report"]);
  assert.match(source, /selectedRole === "report"/);
  assert.match(source, /className="work-card-report-evidence-strip"/);
  assert.match(source, /className="work-card-report-document-pane"/);
  assert.match(source, /reportIsCurrent/);
  assert.match(source, /Architect review advisory; Operator decision creates validation authority\./);
  assert.match(source, /Copy Advisory Prompt/);
  assert.match(source, /Operator validation notes/);
  assert.match(source, /Advisory summary \/ pasted recommendation \(optional\)/);
  assert.match(source, /Repair defect text/);
  assert.match(source, /Validate Passed/);
  assert.match(source, /Request Repair/);
  assert.doesNotMatch(source, /Select disposition/);
  assert.doesNotMatch(source, /Apply Review/);
  assert.doesNotMatch(source, /Run Codex Implementer/);
  assert.doesNotMatch(source, /Cancel Codex Run/);
  assert.doesNotMatch(source, /Event Tail/);
  assert.doesNotMatch(source, /className="work-card-report-reference"/);
});

test("Review & Validation is a visible Work Card Building workspace between Build and Repair", () => {
  const source = fs.readFileSync(workspaceSourcePath, "utf8");
  const registrySlice = source.slice(
    source.indexOf("id: \"work-card-building-review\""),
    source.indexOf("id: \"work-card-validation\""),
  );

  assert.match(registrySlice, /id:\s*"work-card-building-review"[\s\S]*label:\s*"Implementer Build"[\s\S]*order:\s*10/);
  assert.match(registrySlice, /id:\s*"work-card-report-review"[\s\S]*label:\s*"Review & Validation"[\s\S]*order:\s*15/);
  assert.match(registrySlice, /id:\s*"work-card-repair"[\s\S]*order:\s*20/);
});

test("Implementer Report documents classify to Review & Validation and App targets Operator decisions there", () => {
  const documentWorkspaceSource = fs.readFileSync(documentWorkspaceSourcePath, "utf8");
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const browserPanelSource = fs.readFileSync(path.join(__dirname, "..", "..", "src", "renderer", "app", "figma", "FigmaBrowserPanel.tsx"), "utf8");

  assert.match(documentWorkspaceSource, /workspace\("work-card-report-review"\), group: "Implementer reports"/);
  assert.match(appSource, /<WorkCardReportReviewWorkspace/);
  assert.match(appSource, /activeWorkspaceId === "work-card-report-review"/);
  assert.match(appSource, /window\.champcity\.copyCurrentWorkCardAdvisoryReviewPrompt\(\)/);
  assert.match(appSource, /window\.champcity\.applyOperatorValidationDecisionForCurrentWorkCard\(/);
  assert.doesNotMatch(appSource, /applyCurrentDisposition\(\s*workCardBuildingReviewStatus/);
  assert.match(appSource, /<FigmaBrowserPanel/);
  assert.match(browserPanelSource, /aria-label="Embedded ChatGPT browser"/);
});

test("Review & Validation renders Implementer Report by default in a compact document pane", () => {
  const markup = renderWorkspace();

  assert.match(markup, /work-card-report-evidence-strip/);
  assert.match(markup, /Work Card/);
  assert.match(markup, /WC44-REPAIR03 - Review &amp; Validation Workspace Layout and Document Viewer/);
  assert.match(markup, /Report/);
  assert.match(markup, /revision 1 \| Pending \| fresh\/readable/);
  assert.match(markup, /Authority/);
  assert.match(markup, /Architect review advisory; Operator decision creates validation authority\./);
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

test("Review & Validation App and CSS suppress global context and preserve dual-pane browser layout", () => {
  const appSource = fs.readFileSync(appSourcePath, "utf8");
  const browserPanelSource = fs.readFileSync(path.join(__dirname, "..", "..", "src", "renderer", "app", "figma", "FigmaBrowserPanel.tsx"), "utf8");
  const stylesSource = fs.readFileSync(stylesSourcePath, "utf8");

  assert.match(appSource, /isWorkCardReportReview \? "review-validation-surface" : ""/);
  assert.match(appSource, /suppress=\{isWorkCardReportReview\}/);
  assert.match(appSource, /if \(suppress\) \{\s*return null;\s*\}/);
  assert.match(appSource, /"figma-doc-chat-workspace review-validation-workspace"/);
  assert.match(appSource, /usesFigmaWorkspaceBody[\s\S]*isWorkCardReportReview/);
  assert.match(appSource, /<FigmaBrowserPanel/);
  assert.match(browserPanelSource, /aria-label="Embedded ChatGPT browser"/);
  assert.match(browserPanelSource, /ref=\{hostRef\} className="architect-browser-host figma-browser-host"/);
  assert.match(stylesSource, /\.workspace-surface\.review-validation-surface/);
  assert.match(stylesSource, /\.review-validation-workspace\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) 288px/);
  assert.match(stylesSource, /\.work-card-report-document-pane\s*\{[\s\S]*grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(stylesSource, /\.work-card-report-evidence-strip\s*\{[\s\S]*grid-template-columns:/);
});
