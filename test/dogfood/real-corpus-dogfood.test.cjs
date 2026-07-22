const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "../..");
const {
  listPlanningDocuments,
  previewDispositionInitialization,
  readPlanningDocument,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  getWorkspaceGroups,
} = require("../../dist/shared/workspaces/documentWorkspace.js");

function walkPlanningFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const stats = fs.lstatSync(absolutePath);
      if (stats.isSymbolicLink()) continue;
      if (stats.isDirectory()) visit(absolutePath);
      else if (stats.isFile() && /\.(md|json)$/i.test(entry.name)) {
        files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  visit(path.join(root, "planning"));
  return files.sort();
}

function independentCorpusCounts(root) {
  const files = walkPlanningFiles(root);
  const logicalDocuments = new Map();

  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const stemKey = file.slice(0, -extension.length);
    const entry = logicalDocuments.get(stemKey) ?? { markdown: false, json: false };
    if (extension === ".md") entry.markdown = true;
    if (extension === ".json") entry.json = true;
    logicalDocuments.set(stemKey, entry);
  }

  const pairCounts = {
    "markdown-only": 0,
    paired: 0,
    "json-only": 0,
  };

  for (const entry of logicalDocuments.values()) {
    if (entry.markdown && entry.json) pairCounts.paired += 1;
    else if (entry.markdown) pairCounts["markdown-only"] += 1;
    else if (entry.json) pairCounts["json-only"] += 1;
  }

  return {
    files,
    markdownFiles: files.filter((file) => file.endsWith(".md")).length,
    jsonFiles: files.filter((file) => file.endsWith(".json")).length,
    logicalDocuments: logicalDocuments.size,
    pairCounts,
  };
}

function createTempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-dogfood-"));
  fs.mkdirSync(path.join(root, "planning/project/Project_Intake"), { recursive: true });
  fs.mkdirSync(path.join(root, "planning/project/Project_Roadmap"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE_copy.md"),
    "# Intake\n\n## Document Disposition\nDocument.Status=Pending\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_copy.md"),
    "# Roadmap\n\n## Document Disposition\nDocument.Status=Pending\n",
    "utf8",
  );
  return root;
}

function current(root) {
  const result = resolveFirstNonApprovedDocument(root);
  assert.equal(result.status, "current");
  return result.document;
}

test("real corpus runtime count reconciliation after initialization", () => {
  const expected = independentCorpusCounts(repoRoot);
  const documents = listPlanningDocuments(repoRoot);
  const pairCounts = documents.reduce((acc, document) => {
    acc[document.pairStatus] = (acc[document.pairStatus] || 0) + 1;
    return acc;
  }, {
    "markdown-only": 0,
    paired: 0,
    "json-only": 0,
  });

  assert.equal(expected.files.length, expected.markdownFiles + expected.jsonFiles);
  assert.equal(documents.length, expected.logicalDocuments);
  assert.deepEqual(pairCounts, expected.pairCounts);
});

test("every real logical document has a valid effective disposition", () => {
  const preview = previewDispositionInitialization(repoRoot);
  const documents = listPlanningDocuments(repoRoot);

  assert.equal(preview.affectedLogicalDocuments, 0);
  assert.equal(documents.every((document) =>
    ["Pending", "Approved", "Rejected", "RevisionRequested"].includes(document.effectiveDisposition),
  ), true);
});

test("real corpus pairs are synchronized", () => {
  const unsynchronizedPairs = listPlanningDocuments(repoRoot).filter(
    (document) => document.pairStatus === "paired" && document.synchronizationState !== "synchronized",
  );

  assert.deepEqual(unsynchronizedPairs, []);
});

test("real resolver returns Project Intake first when pending", () => {
  const result = resolveFirstNonApprovedDocument(repoRoot);

  assert.equal(result.status, "current");
  assert.equal(result.document.owningWorkspaceId, "project-intake-capture");
  assert.equal(result.document.owningWorkspace, "Project Intake Capture");
  assert.equal(result.document.displayTitle, "PROJECT_INTAKE_champcity_a_i");
  assert.equal(result.document.orderPosition, 1);
});

test("temporary dogfood transitions preserve resolver behavior", () => {
  const root = createTempWorkspace();
  const intake = current(root);
  assert.equal(intake.effectiveDisposition, "Pending");

  setDocumentDisposition(root, intake.logicalDocumentId, "Approved");
  assert.equal(current(root).displayTitle, "PROJECT_ROADMAP_copy");

  const roadmap = current(root);
  setDocumentDisposition(root, roadmap.logicalDocumentId, "Rejected");
  assert.equal(current(root).effectiveDisposition, "Rejected");

  setDocumentDisposition(root, roadmap.logicalDocumentId, "RevisionRequested");
  assert.equal(current(root).effectiveDisposition, "RevisionRequested");

  setDocumentDisposition(root, roadmap.logicalDocumentId, "Pending");
  assert.equal(current(root).effectiveDisposition, "Pending");
});

test("real corpus workspaces contain expected document categories", () => {
  const documents = listPlanningDocuments(repoRoot);

  assert.equal(getWorkspaceGroups(documents, "phase-planning-bundle").some((group) =>
    group.documents.some((document) => document.displayFilename === "Phase_Planning") &&
    group.documents.some((document) => document.displayFilename === "Work_Card_Plan"),
  ), true);
  assert.equal(getWorkspaceGroups(documents, "work-card-planning").some((group) =>
    group.documents.some((document) => /WC\d+/.test(document.displayFilename)),
  ), true);
  assert.equal(getWorkspaceGroups(documents, "work-card-building-review").length > 0, true);
  assert.equal(getWorkspaceGroups(documents, "work-card-validation").length > 0, true);
  assert.equal(getWorkspaceGroups(documents, "phase-validation").length > 0, true);
});

test("real refresh and restart derive the same current document", () => {
  assert.deepEqual(resolveFirstNonApprovedDocument(repoRoot), resolveFirstNonApprovedDocument(repoRoot));
});

test("malformed later temporary document does not replace earlier pending document", () => {
  const root = createTempWorkspace();
  fs.mkdirSync(path.join(root, "planning/phases/phase-01/Work_Cards"), { recursive: true });
  fs.writeFileSync(path.join(root, "planning/phases/phase-01/Work_Cards/WC01_broken.json"), "{ broken\n", "utf8");

  assert.equal(current(root).displayTitle, "PROJECT_INTAKE_copy");
});

test("prohibited old architecture is absent from active source", () => {
  const sourceFiles = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) sourceFiles.push(absolutePath);
    }
  }
  visit(path.join(repoRoot, "src"));
  const sourceText = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

  assert.equal(fs.existsSync(path.join(repoRoot, "scripts/migration/historical-corpus-v1")), false);
  assert.equal(/Governance Maintenance|Governance Repair|Governance Approval|approval queue|approval artifact|target hash|decision timeline|Execution Run|context packet|role gate|screen gate|routed IPC/i.test(sourceText), false);
});

test("all five continuous-pass Implementer Reports exist", () => {
  const reports = [
    "IMPLEMENTER_REPORT_WC03_clean_room_application_source_reset.md",
    "IMPLEMENTER_REPORT_WC04_planning_document_discovery_and_disposition_io.md",
    "IMPLEMENTER_REPORT_WC05_workspace_integrated_document_disposition.md",
    "IMPLEMENTER_REPORT_WC06_first_non_approved_document_resolver.md",
    "IMPLEMENTER_REPORT_WC07_real_corpus_initialization_and_dogfood_validation.md",
  ];

  for (const report of reports) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, "planning/phases/phase-07/Implementer_Reports", report)),
      true,
      report,
    );
  }
});
