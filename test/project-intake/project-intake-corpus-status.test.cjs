const assert = require("node:assert/strict");
const test = require("node:test");

const {
  analyzeProjectIntakeCorpus,
  deriveProjectIntakeRailStatus,
} = require("../../dist/shared/projectIntake/projectIntakeCorpus.js");

function intake(status, suffix = "demo") {
  return {
    logicalDocumentId: suffix,
    markdownPath: `planning/project/Project_Intake/PROJECT_INTAKE_${suffix}.md`,
    jsonPath: `planning/project/Project_Intake/PROJECT_INTAKE_${suffix}.json`,
    displayFilename: `PROJECT_INTAKE_${suffix}`,
    metadata: {
      artifactType: "project-intake",
      participationRole: "gatingReview",
    },
    effectiveDisposition: status,
  };
}

function archivedIntake(status, suffix = "old") {
  return {
    ...intake(status, suffix),
    logicalDocumentId: `archived-${suffix}`,
    markdownPath: `planning/archive/project/Project_Intake/PROJECT_INTAKE_${suffix}.md`,
    jsonPath: `planning\\archive\\project\\Project_Intake\\PROJECT_INTAKE_${suffix}.json`,
  };
}

test("Project Intake corpus helper distinguishes open single and conflict states", () => {
  assert.equal(analyzeProjectIntakeCorpus([]).state, "open");
  assert.equal(analyzeProjectIntakeCorpus([intake("Pending")]).state, "single");
  assert.equal(analyzeProjectIntakeCorpus([intake("Pending", "one"), intake("Approved", "two")]).state, "conflict");
});

test("Project Intake rail status is derived from corpus and disposition", () => {
  assert.equal(deriveProjectIntakeRailStatus([]), "Open");
  assert.equal(deriveProjectIntakeRailStatus([intake("Pending")]), "Awaiting Approval");
  assert.equal(deriveProjectIntakeRailStatus([intake("Rejected")]), "Awaiting Approval");
  assert.equal(deriveProjectIntakeRailStatus([intake("RevisionRequested")]), "Awaiting Approval");
  assert.equal(deriveProjectIntakeRailStatus([intake("Approved")]), "Completed");
  assert.equal(deriveProjectIntakeRailStatus([intake("Pending", "one"), intake("Approved", "two")]), "Conflict");
});

test("Project Intake lifecycle label does not depend on active workspace selection", () => {
  const documents = [intake("Approved")];

  assert.equal(deriveProjectIntakeRailStatus(documents), "Completed");
  assert.equal(deriveProjectIntakeRailStatus(documents), "Completed");
  assert.notEqual(deriveProjectIntakeRailStatus(documents), "CURRENT");
});

test("archive-only Project Intake metadata is excluded from the active corpus", () => {
  const documents = [archivedIntake("Approved")];
  const corpus = analyzeProjectIntakeCorpus(documents);

  assert.equal(corpus.state, "open");
  assert.equal(deriveProjectIntakeRailStatus(documents), "Open");
  assert.deepEqual(corpus.evidencePaths, []);
});

test("active Pending Intake wins over archived Approved Intake", () => {
  const active = intake("Pending", "current");
  const archived = archivedIntake("Approved", "old");
  const corpus = analyzeProjectIntakeCorpus([archived, active]);

  assert.equal(corpus.state, "single");
  assert.equal(deriveProjectIntakeRailStatus([archived, active]), "Awaiting Approval");
  assert.deepEqual(corpus.evidencePaths, [active.markdownPath, active.jsonPath]);
});

test("active Approved Intake wins over archived Pending Intake", () => {
  const active = intake("Approved", "current");
  const archived = archivedIntake("Pending", "old");
  const corpus = analyzeProjectIntakeCorpus([archived, active]);

  assert.equal(corpus.state, "single");
  assert.equal(deriveProjectIntakeRailStatus([archived, active]), "Completed");
  assert.deepEqual(corpus.evidencePaths, [active.markdownPath, active.jsonPath]);
});

test("true conflict evidence excludes archived Project Intake paths", () => {
  const activeOne = intake("Approved", "one");
  const activeTwo = intake("Pending", "two");
  const archived = archivedIntake("Approved", "old");
  const corpus = analyzeProjectIntakeCorpus([archived, activeTwo, activeOne]);

  assert.equal(corpus.state, "conflict");
  assert.deepEqual(corpus.evidencePaths, [
    activeOne.markdownPath,
    activeOne.jsonPath,
    activeTwo.markdownPath,
    activeTwo.jsonPath,
  ]);
  assert.equal(corpus.evidencePaths.some((value) => value.includes("archive")), false);
});
