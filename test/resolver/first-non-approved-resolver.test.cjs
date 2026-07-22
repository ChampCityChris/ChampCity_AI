const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  __setPlanningDocumentServiceTestHooks,
  listPlanningDocuments,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  orderPlanningDocuments,
} = require("../../dist/shared/documents/documentOrder.js");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-resolver-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function markdown(title, status, extra = "") {
  const disposition = status
    ? `\n\n## Document Disposition\nDocument.Status=${status}\n`
    : "\n";
  return `# ${title}\n\n${extra}${disposition}`;
}

function current(root) {
  const result = resolveFirstNonApprovedDocument(root);
  assert.equal(result.status, "current");
  return result.document;
}

function withServiceHooks(t, hooks) {
  __setPlanningDocumentServiceTestHooks(hooks);
  t.after(() => __setPlanningDocumentServiceTestHooks());
}

function allApproved(root) {
  const result = resolveFirstNonApprovedDocument(root);
  assert.equal(result.status, "all-approved");
  return result;
}

test("Project Intake is first when pending", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));

  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
  assert.equal(current(root).owningWorkspaceId, "project-intake-capture");
});

test("missing disposition behaves as Pending", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", "# Intake\n");

  assert.equal(current(root).effectiveDisposition, "Pending");
});

test("approving Project Intake advances to the next Project Planning document", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));
  const intake = current(root);

  setDocumentDisposition(root, intake.logicalDocumentId, "Approved");

  assert.equal(current(root).markdownPath, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md");
});

test("Rejected remains current", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "Rejected"));
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));

  assert.equal(current(root).effectiveDisposition, "Rejected");
  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
});

test("RevisionRequested remains current", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "RevisionRequested"));
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP.md", markdown("Roadmap"));

  assert.equal(current(root).effectiveDisposition, "RevisionRequested");
  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
});

test("Phase Planning precedes Work Card Plan", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Card_Plan.md", markdown("Work Card Plan"));
  writeFile(root, "planning/phases/phase-01/Phase_Planning.md", markdown("Phase Planning"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Planning.md");
});

test("Phase 01 Work Card precedes Phase 02 Phase Planning", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Phase 01 Work Card"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01_base.md");
});

test("Phase 01 Operator Validation precedes Phase 02 Phase Planning", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md");
});

test("Phase 01 Phase Closeout precedes Phase 02 Phase Planning", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  writeFile(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", markdown("Closeout"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md");
});

test("Phase 02 Phase Planning becomes current only after every Phase 01 document is Approved", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Phase_Planning.md", markdown("Phase 01 planning", "Approved"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Phase 01 Work Card", "Approved"));
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation", "Approved"));
  writeFile(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", markdown("Closeout", "Approved", "closureDecision=Close"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-02/Phase_Planning.md");
});

test("numbered phases sort numerically", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-10/Phase_Planning.md", markdown("Phase 10"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-02/Phase_Planning.md");
});

test("base Work Card precedes repairs", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR01_fix.md", markdown("Repair"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01_base.md");
});

test("repair numbers sort numerically", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR10_fix.md", markdown("Repair 10"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01-REPAIR02_fix.md", markdown("Repair 02"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base", "Approved"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01-REPAIR02_fix.md");
});

test("implementation and validation evidence follows its Work Card", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base", "Approved"));
  writeFile(root, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01.md", markdown("Report"));
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Implementer_Reports/IMPLEMENTER_REPORT_WC01.md");
});

test("closeout follows validation evidence", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.md", markdown("Validation", "Approved"));
  writeFile(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md", markdown("Closeout"));

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT.md");
});

test("archives remain ordered and visible but do not block current lifecycle projection", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_base.md", markdown("Base", "Approved"));
  writeFile(root, "planning/archive/phases/phase-01/Work_Cards/WC01_archived.md", markdown("Archived"));

  const orderedPaths = orderPlanningDocuments(listPlanningDocuments(root)).map(
    (document) => document.markdownPath,
  );

  assert.equal(orderedPaths.includes("planning/archive/phases/phase-01/Work_Cards/WC01_archived.md"), true);
  assert.equal(allApproved(root).status, "all-approved");
});

test("unparseable records remain visible", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/not-a-number/Work_Cards/UNPARSEABLE.md", markdown("Unparseable"));

  assert.equal(current(root).markdownPath, "planning/phases/not-a-number/Work_Cards/UNPARSEABLE.md");
});

test("malformed later records do not preempt earlier pending records", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_broken.json", "{ broken\n");

  assert.equal(current(root).markdownPath, "planning/project/Project_Intake/PROJECT_INTAKE.md");
});

test("read-error document is selected when its normal order position is current", (t) => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_broken.md", markdown("Broken"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Phase 02"));
  withServiceHooks(t, {
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-01/Work_Cards/WC01_broken.md"
        ? "Injected local read failure."
        : undefined,
  });

  const selected = current(root);

  assert.equal(selected.markdownPath, "planning/phases/phase-01/Work_Cards/WC01_broken.md");
  assert.equal(selected.effectiveDisposition, "Pending");
});

test("later read-error document does not preempt earlier readable Pending document", (t) => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_readable.md", markdown("Readable"));
  writeFile(root, "planning/phases/phase-02/Phase_Planning.md", markdown("Broken"));
  withServiceHooks(t, {
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-02/Phase_Planning.md"
        ? "Injected local read failure."
        : undefined,
  });

  assert.equal(current(root).markdownPath, "planning/phases/phase-01/Work_Cards/WC01_readable.md");
});

test("refresh reflects external status changes", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "Approved"));

  assert.equal(allApproved(root).message, "All planning documents approved");
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE.md"),
    markdown("Intake", "Rejected"),
    "utf8",
  );

  assert.equal(current(root).effectiveDisposition, "Rejected");
});

test("restart derives the same current document without route persistence", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake"));

  assert.deepEqual(resolveFirstNonApprovedDocument(root), resolveFirstNonApprovedDocument(root));
});

test("all-approved returns the terminal informational state", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "Approved"));

  assert.deepEqual(allApproved(root), {
    status: "all-approved",
    message: "All planning documents approved",
    totalDocumentCount: 1,
    reason: "All gating lifecycle documents are Approved or semantically complete; non-review handoffs, context-only records, and historical records do not block progression.",
  });
});

test("old governance approval maintenance role route Registry or hash input does not influence result", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/project/Project_Intake/PROJECT_INTAKE.json",
    JSON.stringify(
      {
        approval: "Approved",
        routeToken: "continue",
        role: "Operator",
        registryStatus: "Approved",
        targetHash: "approved",
        maintenance: "complete",
      },
      null,
      2,
    ),
  );

  assert.equal(current(root).effectiveDisposition, "Pending");
});
