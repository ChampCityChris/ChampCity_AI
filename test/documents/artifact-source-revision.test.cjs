const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-revision-"));
  fs.mkdirSync(path.join(root, "planning"), { recursive: true });
  return root;
}

function writeFile(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function byPath(root, relativePath) {
  return listPlanningDocuments(root).find(
    (document) => document.markdownPath === relativePath || document.jsonPath === relativePath,
  );
}

function json(status, extra = {}) {
  return `${JSON.stringify({ ...extra, documentDisposition: { status } }, null, 2)}\n`;
}

function markdown(title, status, revision = 1) {
  return `# ${title}\nArtifact.Revision=${revision}\n\n## Document Disposition\n\nDocument.Status=${status}\n`;
}

function snapshot(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        files.push([
          path.relative(root, absolutePath).split(path.sep).join("/"),
          fs.readFileSync(absolutePath, "utf8"),
        ]);
      }
    }
  }
  visit(path.join(root, "planning"));
  return files.sort(([left], [right]) => left.localeCompare(right));
}

test("substantive revision increments artifactRevision in synchronized pair", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.md", markdown("Intake", "Approved", 1));
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.json", json("Approved", { artifactRevision: 1 }));
  const intake = byPath(root, "planning/project/Project_Intake/PROJECT_INTAKE.md");

  const result = savePlanningDocumentRevision(root, intake.logicalDocumentId);

  assert.equal(result.revisedDocument.metadata.artifactRevision, 2);
  assert.match(readText(root, "planning/project/Project_Intake/PROJECT_INTAKE.md"), /Artifact\.Revision=2/);
  assert.equal(readJson(root, "planning/project/Project_Intake/PROJECT_INTAKE.json").artifactRevision, 2);
});

test("disposition-only changes do not increment artifactRevision", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.json", json("Pending", { artifactRevision: 4 }));
  const intake = byPath(root, "planning/project/Project_Intake/PROJECT_INTAKE.json");

  setDocumentDisposition(root, intake.logicalDocumentId, "Approved");

  assert.equal(readJson(root, "planning/project/Project_Intake/PROJECT_INTAKE.json").artifactRevision, 4);
});

test("source revision change resets approved downstream review document to Pending", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.json", json("Approved", { artifactRevision: 1 }));
  writeFile(
    root,
    "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json",
    json("Approved", {
      artifactRevision: 1,
      sourceRevisions: [{ path: "planning/project/Project_Intake/PROJECT_INTAKE.json", revision: 1 }],
    }),
  );
  const intake = byPath(root, "planning/project/Project_Intake/PROJECT_INTAKE.json");

  const result = savePlanningDocumentRevision(root, intake.logicalDocumentId);

  assert.deepEqual(
    result.invalidatedDocuments.map((document) => document.displayFilename),
    ["PROJECT_ARCHITECT_INTERVIEW_demo"],
  );
  assert.equal(
    readJson(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json").documentDisposition.status,
    "Pending",
  );
  assert.equal(
    evaluateDocumentFreshness(
      root,
      byPath(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json").logicalDocumentId,
    ).state,
    "stale",
  );
});

test("Project planning bundle invalidates atomically", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json", json("Approved", { artifactRevision: 1 }));
  writeFile(
    root,
    "planning/project/PROJECT_PROFILE.json",
    json("Approved", {
      artifactRevision: 1,
      sourceRevisions: [{ path: "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json", revision: 1 }],
    }),
  );
  writeFile(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.json", json("Approved", { artifactRevision: 1 }));
  const interview = byPath(root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json");

  savePlanningDocumentRevision(root, interview.logicalDocumentId);

  assert.equal(readJson(root, "planning/project/PROJECT_PROFILE.json").documentDisposition.status, "Pending");
  assert.equal(readJson(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo.json").documentDisposition.status, "Pending");
});

test("non-review handoff regenerates source revision and remains Approved", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.json", json("Approved", { artifactRevision: 1 }));
  writeFile(
    root,
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.json",
    json("Approved", {
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      sourceRevisions: [{ path: "planning/project/Project_Intake/PROJECT_INTAKE.json", revision: 1 }],
    }),
  );
  const intake = byPath(root, "planning/project/Project_Intake/PROJECT_INTAKE.json");

  savePlanningDocumentRevision(root, intake.logicalDocumentId);

  const handoff = readJson(root, "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo.json");
  assert.equal(handoff.documentDisposition.status, "Approved");
  assert.equal(handoff.artifactRevision, 2);
  assert.deepEqual(handoff.sourceRevisions, [
    { path: "planning/project/Project_Intake/PROJECT_INTAKE.json", revision: 2 },
  ]);
});

test("validation record becomes stale after Formal Work Card revision", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.json", json("Approved", { artifactRevision: 1 }));
  writeFile(root, "planning/phases/phase-01/Work_Cards/WC01_demo.json", json("Approved", { artifactRevision: 1 }));
  writeFile(
    root,
    "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.json",
    json("Approved", {
      artifactRevision: 1,
      sourceRevisions: [{ path: "planning/phases/phase-01/Work_Cards/WC01_demo.json", revision: 1 }],
    }),
  );
  const workCard = byPath(root, "planning/phases/phase-01/Work_Cards/WC01_demo.json");

  savePlanningDocumentRevision(root, workCard.logicalDocumentId);

  assert.equal(
    readJson(root, "planning/phases/phase-01/Validation_Reports/VALIDATION_REPORT_WC01.json").documentDisposition.status,
    "Pending",
  );
  const resolved = resolveFirstNonApprovedDocument(root);
  assert.equal(resolved.status, "current");
  assert.equal(resolved.document.freshnessState, "stale");
  assert.match(resolved.document.reason, /expected revision 1, current revision 2/);
});

test("revision and downstream invalidation roll back together", () => {
  const root = createWorkspace();
  writeFile(root, "planning/project/Project_Intake/PROJECT_INTAKE.json", json("Approved", { artifactRevision: 1 }));
  writeFile(
    root,
    "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo.json",
    json("Approved", {
      artifactRevision: 1,
      sourceRevisions: [{ path: "planning/project/Project_Intake/PROJECT_INTAKE.json", revision: 1 }],
    }),
  );
  const before = snapshot(root);
  const intake = byPath(root, "planning/project/Project_Intake/PROJECT_INTAKE.json");

  assert.throws(() => savePlanningDocumentRevision(root, intake.logicalDocumentId, { failAfterWrites: 1 }));
  assert.deepEqual(snapshot(root), before);
});
