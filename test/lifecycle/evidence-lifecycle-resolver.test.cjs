const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  __setPlanningDocumentServiceTestHooks,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-lifecycle-resolver-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function markdown(title, status = "Pending", extra = "") {
  return `# ${title}\n\n${extra}\n\n## Document Disposition\nDocument.Status=${status}\n`;
}

function json(status = "Pending", extra = {}) {
  return JSON.stringify({ ...extra, documentDisposition: { status } }, null, 2);
}

function current(root) {
  const result = resolveFirstNonApprovedDocument(root);
  assert.equal(result.status, "current");
  return result.document;
}

test("non-review handoffs are visible evidence but cannot trap lifecycle resolution", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.md", markdown("Prompt"));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo.md", markdown("Intake", "Approved"));

  const result = resolveFirstNonApprovedDocument(root);

  assert.equal(result.status, "all-approved");
  assert.match(result.reason, /non-review handoffs/);
});

test("Approved DoNotClose phase closeout remains current at Phase Validation", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_demo.md",
    markdown("Closeout", "Approved", "closureDecision=DoNotClose"),
  );

  const resolved = current(root);

  assert.equal(resolved.owningWorkspaceId, "phase-validation");
  assert.equal(resolved.lifecycleLocation.level, "phase");
  assert.equal(resolved.lifecycleLocation.stage, "validation");
  assert.match(resolved.reason, /DoNotClose/);
});

test("Approved Close phase closeout completes and does not remain current", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_demo.md",
    markdown("Closeout", "Approved", "closureDecision=Close"),
  );

  assert.equal(resolveFirstNonApprovedDocument(root).status, "all-approved");
});

test("Project Close is terminal when Approved with Close decision", () => {
  const root = createWorkspace();
  writeFile(
    root,
    "planning/project/Project_Closeouts/PROJECT_CLOSEOUT_demo.json",
    json("Approved", { closureDecision: "Close" }),
  );

  assert.equal(resolveFirstNonApprovedDocument(root).status, "all-approved");
});

test("selected phase and Work Card identities are derived from evidence paths", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-12/Work_Cards/WC03_example.md", markdown("Work Card"));

  const resolved = current(root);

  assert.equal(resolved.selectedPhaseId, "phase-12");
  assert.equal(resolved.selectedWorkCardId, "WC03");
  assert.equal(resolved.owningWorkspaceId, "work-card-planning");
});

test("resolver explanations include lifecycle location and evidence paths", () => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-02/Work_Cards/WC01_example.md", markdown("Work Card"));

  const resolved = current(root);

  assert.match(resolved.reason, /Work Card Planning is current at workCard \/ planning/);
  assert.deepEqual(resolved.evidencePaths, ["planning/phases/phase-02/Work_Cards/WC01_example.md"]);
});

test("historical archive evidence is excluded from current lifecycle projection", () => {
  const root = createWorkspace();
  writeFile(root, "planning/archive/phases/phase-01/Work_Cards/WC01_archived.md", markdown("Archived"));

  assert.equal(resolveFirstNonApprovedDocument(root).status, "all-approved");
});

test("malformed current evidence remains local and explainable", (t) => {
  const root = createWorkspace();
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_broken.md", markdown("Broken"));
  __setPlanningDocumentServiceTestHooks({
    failRead: (relativePath) =>
      relativePath === "planning/phases/phase-01/Work_Cards/WC01_broken.md"
        ? "Injected lifecycle read failure."
        : undefined,
  });
  t.after(() => __setPlanningDocumentServiceTestHooks());

  const resolved = current(root);

  assert.equal(resolved.owningWorkspaceId, "work-card-planning");
  assert.match(resolved.reason, /Injected lifecycle read failure/);
});
