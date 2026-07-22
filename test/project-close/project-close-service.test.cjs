const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createProjectCloseout, getProjectCloseProjection, projectCloseBlockers, setProjectCloseoutDisposition } = require("../../dist/main/projectClose/projectCloseService.js");
const { listPlanningDocuments, savePlanningDocumentRevision } = require("../../dist/main/documents/planningDocumentService.js");

function writePair(root, relativeStem, extra) {
  fs.mkdirSync(path.dirname(path.join(root, `${relativeStem}.json`)), { recursive: true });
  fs.writeFileSync(path.join(root, `${relativeStem}.json`), JSON.stringify({ artifactRevision: 1, participationRole: "gatingReview", documentDisposition: { status: "Approved" }, ...extra }, null, 2) + "\n", "utf8");
}

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-project-close-"));
  writePair(root, "planning/project/Project_Intake/PROJECT_INTAKE_demo", { artifactType: "project-intake" });
  writePair(root, "planning/project/PROJECT_PROFILE", { artifactType: "project-profile" });
  writePair(root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_demo", { artifactType: "project-roadmap" });
  writePair(root, "planning/project/Phase_Map/PHASE_MAP_demo", { artifactType: "phase-map", phases: [{ phaseId: "phase-01", title: "One", order: 1, purpose: "Done", dependsOn: [], sourceReferences: [] }] });
  writePair(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close", { artifactType: "phase-closeout", phaseId: "phase-01", closureDecision: "Close" });
  return root;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

test("Project Closeout begins Pending when project evidence is complete", () => {
  const root = createRepository();
  const result = createProjectCloseout(root, "Close", "Complete.");
  const closeout = readJson(root, result.jsonPath);
  assert.equal(closeout.documentDisposition.status, "Pending");
  assert.equal(closeout.closureDecision, "Close");
  assert.equal(closeout.sourceRevisions.length > 0, true);
});

test("Approved Close completes terminal project close", () => {
  const root = createRepository();
  createProjectCloseout(root, "Close", "Complete.");
  setProjectCloseoutDisposition(root, "Approved");
  assert.equal(getProjectCloseProjection(root).complete, true);
  assert.equal(getProjectCloseProjection(root).workspaceId, "project-close");
});

test("Approved DoNotClose remains at Project Validation", () => {
  const root = createRepository();
  createProjectCloseout(root, "DoNotClose", "Keep open.");
  setProjectCloseoutDisposition(root, "Approved");
  assert.equal(getProjectCloseProjection(root).workspaceId, "project-validation");
});

test("missing phase close evidence blocks project close", () => {
  const root = createRepository();
  fs.unlinkSync(path.join(root, "planning/phases/phase-01/Phase_Closeouts/PHASE_01_CLOSEOUT_close.json"));
  assert.match(projectCloseBlockers(root).join(" "), /Phase Map is not all complete/);
});

test("upstream project evidence revision invalidates terminal approval", () => {
  const root = createRepository();
  createProjectCloseout(root, "Close", "Complete.");
  setProjectCloseoutDisposition(root, "Approved");
  const profile = listPlanningDocuments(root).find((document) => document.displayFilename === "PROJECT_PROFILE");
  savePlanningDocumentRevision(root, profile.logicalDocumentId);
  assert.equal(getProjectCloseProjection(root).complete, false);
});
