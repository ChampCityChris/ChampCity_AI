const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  __setPlanningDocumentServiceTestHooks,
  listPlanningDocuments,
  readPlanningDocument,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  assignDocumentsToWorkspaces,
  getWorkspaceGroups,
} = require("../../dist/shared/workspaces/documentWorkspace.js");

const repoRoot = path.resolve(__dirname, "../..");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-workspaces-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function listFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  visit(path.join(root, "planning"));
  return files.sort();
}

function fixtureWorkspace() {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md", "# Intake\n");
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md", "# Roadmap\n");
  writeFile(root, "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md", "# Phase Map\n");
  writeFile(root, "planning/phases/phase-07/Phase_Interview.md", "# Phase Interview\n");
  writeFile(root, "planning/phases/phase-07/Phase_Planning.md", "# Phase Planning\n");
  writeFile(root, "planning/phases/phase-07/Work_Card_Plan.md", "# Work Card Plan\n");
  writeFile(root, "planning/phases/phase-07/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md", "# Intake Handoff\n");
  writeFile(root, "planning/phases/phase-07/Work_Cards/WC01_example.md", "# Work Card\n");
  writeFile(root, "planning/phases/phase-07/Work_Cards/WC01-REPAIR01_example.md", "# Repair Work Card\n");
  writeFile(root, "planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01_example.md", "# Report\n");
  writeFile(root, "planning/phases/phase-07/Validation_Reports/VALIDATION_REPORT_WC01_example.md", "# Validation\n");
  writeFile(root, "planning/phases/phase-07/Phase_Closeouts/PHASE_07_CLOSEOUT_example.md", "# Closeout\n");
  writeFile(root, "planning/archive/Work_Cards/WC99_archived.md", "# Archived\n");
  writeFile(root, "planning/misc/loose_note.md", "# Loose\n");
  writeFile(
    root,
    "planning/status/approved.md",
    "# Approved\n\n## Document Disposition\nDocument.Status=Approved\n",
  );
  writeFile(root, "planning/preview/json_only.json", JSON.stringify({ title: "Json Preview" }, null, 2));
  return root;
}

function grouped(root, workspace) {
  return getWorkspaceGroups(listPlanningDocuments(root), workspace).flatMap(
    (group) => group.documents,
  );
}

function findByPath(root, relativePath) {
  return listPlanningDocuments(root).find(
    (document) => document.markdownPath === relativePath || document.jsonPath === relativePath,
  );
}

function withServiceHooks(t, hooks) {
  __setPlanningDocumentServiceTestHooks(hooks);
  t.after(() => __setPlanningDocumentServiceTestHooks());
}

test("every fixture logical document appears in exactly one workspace", () => {
  const root = fixtureWorkspace();
  const documents = listPlanningDocuments(root);
  const assigned = assignDocumentsToWorkspaces(documents);

  assert.equal(assigned.length, documents.length);
  assert.equal(new Set(assigned.map((document) => document.logicalDocumentId)).size, documents.length);
  for (const document of assigned) {
    assert.equal(typeof document.workspace, "string");
  }
});

test("Project Intake appears in Project Intake Capture", () => {
  const root = fixtureWorkspace();
  const projectDocuments = grouped(root, "project-intake-capture");

  assert.equal(projectDocuments[0].markdownPath.includes("Project_Intake"), true);
});

test("Project Intake classification is canonical and excludes project_intake filename noise", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/project/Project_Intake/PROJECT_INTAKE_real.md",
    "# Intake\n\n## Document Disposition\nDocument.Status=Approved\n",
  );
  writeFile(
    root,
    "planning/project/Project_Intake/PROJECT_INTAKE_real.json",
    JSON.stringify(
      {
        artifactType: "project-intake",
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
  );
  writeFile(root, "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_project_intake_fix.md", "# Report\n");
  writeFile(root, "planning/phases/phase-08/Work_Cards/WC17_project_intake_example.md", "# Work Card\n");
  writeFile(root, "planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md", "# Design\n");

  const intakePaths = grouped(root, "project-intake-capture").map((document) => document.markdownPath ?? document.jsonPath);

  assert.deepEqual(intakePaths, ["planning/project/Project_Intake/PROJECT_INTAKE_real.md"]);
  assert.equal(
    grouped(root, "work-card-building-review").some((document) =>
      document.markdownPath === "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_project_intake_fix.md",
    ),
    true,
  );
  assert.equal(
    grouped(root, "work-card-planning").some((document) =>
      document.markdownPath === "planning/phases/phase-08/Work_Cards/WC17_project_intake_example.md",
    ),
    true,
  );
  assert.equal(
    grouped(root, "phase-planning-bundle").some((document) =>
      document.markdownPath === "planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md",
    ),
    true,
  );
});

test("Architect Interview Prompt appears in Architect Interview not Project Intake", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_example.json",
    JSON.stringify(
      {
        artifactType: "project-architect-interview-prompt",
        participationRole: "nonReviewHandoff",
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
  );

  assert.equal(grouped(root, "project-intake-capture").length, 0);
  assert.equal(grouped(root, "architect-interview").length, 1);
});

test("Phase Planning and Work Card Plan appear in Phase Planning", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "phase-planning-bundle").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Phase_Planning.md"), true);
  assert.equal(paths.includes("planning/phases/phase-07/Work_Card_Plan.md"), true);
});

test("Phase Map appears in Project Phase Map", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "project-phase-map").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md"), true);
});

test("Phase Interview appears in Phase Interview", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "phase-interview").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Phase_Interview.md"), true);
});

test("Work Card Intake handoff appears in Work Card Intake", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "work-card-intake").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_WC01.md"), true);
});

test("ordinary Work Cards appear in Work Card Planning", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "work-card-planning").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Work_Cards/WC01_example.md"), true);
});

test("repair Work Cards appear in Work Card Repair", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "work-card-repair").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Work_Cards/WC01-REPAIR01_example.md"), true);
});

test("Implementer Report appears in Work Card Building Review", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "work-card-building-review").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01_example.md"), true);
});

test("validation evidence appears in Operator Validation", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "work-card-validation").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Validation_Reports/VALIDATION_REPORT_WC01_example.md"), true);
});

test("closeout records appear in Phase Validation", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "phase-validation").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/phases/phase-07/Phase_Closeouts/PHASE_07_CLOSEOUT_example.md"), true);
});

test("unclassified records remain visible in Project Plan and Roadmap Review", () => {
  const root = fixtureWorkspace();
  const loose = grouped(root, "project-planning-review").find((document) =>
    document.markdownPath.endsWith("loose_note.md"),
  );

  assert.equal(loose.group, "Context documents");
});

test("archived documents remain visible in their category", () => {
  const root = fixtureWorkspace();
  const paths = grouped(root, "work-card-planning").map((document) => document.markdownPath);

  assert.equal(paths.includes("planning/archive/Work_Cards/WC99_archived.md"), true);
});

test("document list model shows effective disposition", () => {
  const root = fixtureWorkspace();
  const approved = findByPath(root, "planning/status/approved.md");

  assert.equal(approved.effectiveDisposition, "Approved");
});

test("preview loads selected Markdown and formatted JSON", () => {
  const root = fixtureWorkspace();
  const markdown = findByPath(root, "planning/phases/phase-07/Phase_Planning.md");
  const json = findByPath(root, "planning/preview/json_only.json");

  assert.equal(readPlanningDocument(root, markdown.logicalDocumentId).preview.includes("# Phase Planning"), true);
  assert.equal(readPlanningDocument(root, json.logicalDocumentId).preview.includes('"title": "Json Preview"'), true);
});

test("Approve writes Approved to the selected document only", () => {
  const root = fixtureWorkspace();
  const selected = findByPath(root, "planning/phases/phase-07/Phase_Planning.md");
  const untouched = fs.readFileSync(path.join(root, "planning/phases/phase-07/Work_Card_Plan.md"), "utf8");

  setDocumentDisposition(root, selected.logicalDocumentId, "Approved");

  assert.equal(fs.readFileSync(path.join(root, "planning/phases/phase-07/Phase_Planning.md"), "utf8").includes("Document.Status=Approved"), true);
  assert.equal(fs.readFileSync(path.join(root, "planning/phases/phase-07/Work_Card_Plan.md"), "utf8"), untouched);
});

test("Reject writes Rejected and keeps the document selectable", () => {
  const root = fixtureWorkspace();
  const selected = findByPath(root, "planning/phases/phase-07/Work_Cards/WC01_example.md");

  const updated = setDocumentDisposition(root, selected.logicalDocumentId, "Rejected");
  const reloaded = readPlanningDocument(root, selected.logicalDocumentId);

  assert.equal(updated.effectiveDisposition, "Rejected");
  assert.equal(reloaded.logicalDocumentId, selected.logicalDocumentId);
});

test("Request Revision writes RevisionRequested and keeps the document selectable", () => {
  const root = fixtureWorkspace();
  const selected = findByPath(root, "planning/phases/phase-07/Work_Cards/WC01-REPAIR01_example.md");

  const updated = setDocumentDisposition(root, selected.logicalDocumentId, "RevisionRequested");
  const reloaded = readPlanningDocument(root, selected.logicalDocumentId);

  assert.equal(updated.effectiveDisposition, "RevisionRequested");
  assert.equal(reloaded.logicalDocumentId, selected.logicalDocumentId);
});

test("pair mismatch and malformed JSON are local document errors", () => {
  const root = createWorkspace();
  writeFile(root, "planning/mismatch.md", "# Mismatch\n\n## Document Disposition\nDocument.Status=Approved\n");
  writeFile(root, "planning/mismatch.json", JSON.stringify({ documentDisposition: { status: "Rejected" } }, null, 2));
  writeFile(root, "planning/broken.json", "{ broken\n");

  const mismatch = findByPath(root, "planning/mismatch.md");
  const broken = findByPath(root, "planning/broken.json");

  assert.equal(mismatch.synchronizationState, "mismatched");
  assert.equal(Boolean(broken.readError), true);
});

test("one document error does not block another document", () => {
  const root = createWorkspace();
  writeFile(root, "planning/broken.json", "{ broken\n");
  writeFile(root, "planning/healthy.md", "# Healthy\n");
  const healthy = findByPath(root, "planning/healthy.md");

  const updated = setDocumentDisposition(root, healthy.logicalDocumentId, "Approved");

  assert.equal(updated.effectiveDisposition, "Approved");
});

test("read-error document remains visible while readable sibling can preview and write", (t) => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_broken.md", "# Broken\n");
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC02_healthy.md", "# Healthy\n");
  withServiceHooks(t, {
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-01/Work_Cards/WC01_broken.md"
        ? "Injected local read failure."
        : undefined,
  });

  const documents = listPlanningDocuments(root);
  const workCards = grouped(root, "work-card-planning");
  const broken = findByPath(root, "planning/phases/phase-01/Work_Cards/WC01_broken.md");
  const healthy = findByPath(root, "planning/phases/phase-01/Work_Cards/WC02_healthy.md");

  assert.equal(workCards.some((document) => document.markdownPath.endsWith("WC01_broken.md")), true);
  assert.equal(broken.synchronizationState, "read-error");
  assert.equal(readPlanningDocument(root, healthy.logicalDocumentId).preview, "# Healthy\n");
  assert.equal(setDocumentDisposition(root, healthy.logicalDocumentId, "Approved").effectiveDisposition, "Approved");
  assert.equal(documents.length, 2);
});

test("no approval artifact or extra file is created", () => {
  const root = fixtureWorkspace();
  const before = listFiles(root);
  const selected = findByPath(root, "planning/phases/phase-07/Phase_Planning.md");

  setDocumentDisposition(root, selected.logicalDocumentId, "Approved");

  assert.deepEqual(listFiles(root), before);
});

test("renderer has no separate approval destination or legacy governance label", () => {
  const rendererSource = fs.readFileSync(path.join(repoRoot, "src/renderer/app/App.tsx"), "utf8");

  assert.equal(/approval queue|approval screen|governance|route token|role gate/i.test(rendererSource), false);
});

test("direct manual workspace use remains available without legacy route authority", () => {
  const root = fixtureWorkspace();
  const sourceText = fs.readFileSync(path.join(repoRoot, "src/renderer/app/App.tsx"), "utf8");

  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "project-planning-review").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "project-phase-map").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "phase-interview").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "phase-planning-bundle").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "work-card-intake").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "work-card-planning").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "work-card-building-review").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "work-card-repair").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "work-card-validation").length > 0, true);
  assert.equal(getWorkspaceGroups(listPlanningDocuments(root), "phase-validation").length > 0, true);
  assert.equal(/route token|workflow-state|approval artifact|role gate/i.test(sourceText), false);
});
