const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
const { inventoryLegacyMarkdownAuthority } = require("../../dist/main/migrations/legacyAuthorityInventory.js");
const { stageLegacyAuthorityImport } = require("../../dist/main/migrations/stagedLegacyImporter.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");

function workspace(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-staged-import-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, name, artifactType, identity, workflowData, sourceRevisions = []) {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType, artifactRevision: 1,
    participationRole: "contextOnly", identity, sourceRevisions, workflowData,
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null } }, `# ${artifactType}\n\nOriginal legacy ${artifactType} content.\n`);
  fs.writeFileSync(target, content);
  return content;
}
function source(root) {
  const project = "planning/work-intake/PROJECT.md";
  const intake = "planning/work-intake/intakes/intake-1.md";
  const phase = "planning/development/PHASE.md";
  const work = "planning/development/Work_Cards/WI01.md";
  const repair = "planning/development/Work_Cards/WI01-REPAIR01.md";
  write(root, project, "work-project", { projectId: "project-1" }, { name: "Synthetic Project", repositoryId: "repository-1" });
  write(root, intake, "work-intake", { intakeId: "intake-1" },
    { workRequest: "Improve import", desiredOutcome: "Preserve evidence", knownConstraints: "Stay bounded",
      branchBinding: { baseBranch: "dev" } }, [{ path: project, revision: 1 }]);
  write(root, phase, "phase-planning", { phaseId: "PH01" }, {}, [{ path: intake, revision: 1 }]);
  write(root, work, "formal-work-card", { phaseId: "PH01", workCardId: "WI01" },
    { candidate: { title: "Import", purpose: "Preserve source" } }, [{ path: phase, revision: 1 }]);
  write(root, repair, "repair-work-card", { repairId: "WI01-REPAIR01", parentWorkCardId: "WI01" },
    { candidate: { title: "Repair", purpose: "Correct import", dependsOn: ["WI01"] } }, [{ path: work, revision: 1 }]);
  write(root, "issues/ISSUE_001/ISSUE_RECORD.md", "issue-record", { issueId: "ISSUE_001" }, {});
  write(root, "planning/development/VALIDATION.md", "validation-record", { validationId: "V01" },
    { targetPath: work, validationType: "work-card-review", method: "reviewed source", validationMode: "visual_human",
      outcome: "pass", performedBy: { principalId: "legacy-operator", principalType: "human", role: "Operator" },
      performedAt: "2026-09-20T12:00:00.000Z", summary: "Accepted reviewed source" }, [{ path: work, revision: 1 }]);
  return { project, intake, phase, work, repair };
}

test("one exact legacy snapshot stages deterministic structured graph and historical Markdown Evidence", async context => {
  const root = workspace(context);
  const names = source(root);
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  assert.equal(snapshot.complete, true);
  const first = await stageLegacyAuthorityImport(root, snapshot);
  const store = createSQLiteProjectStateStore(first.databasePath);
  const records = await store.listEntities(first.projectId);
  const relationships = await store.listRelationships(first.projectId);
  assert.equal((await store.getProviderGeneration(first.projectId)), null);
  assert.equal(records.filter(record => record.entityType === "Evidence").length, snapshot.documents.length);
  assert.equal(records.filter(record => record.entityType === "WorkItem").length, 2);
  assert.equal(records.filter(record => record.entityType === "WorkIntake").length, 1);
  assert.equal(records.filter(record => record.entityType === "Phase").length, 1);
  assert.equal(records.filter(record => record.entityType === "Finding").length, 1);
  assert.equal(records.filter(record => record.entityType === "Validation").length, 1);
  assert.equal(relationships.some(edge => edge.relationshipType === "repairs"), true);
  assert.equal(relationships.some(edge => edge.relationshipType === "depends_on"), true);
  assert.equal(relationships.some(edge => edge.relationshipType === "part_of"), true);
  assert.equal(relationships.some(edge => edge.relationshipType === "initiates"), true);
  assert.equal(relationships.some(edge => edge.relationshipType === "derived_from"), true);
  assert.equal(relationships.some(edge => edge.relationshipType === "evaluates"), true);
  const workCorrelation = first.correlations.find(item => item.legacyPath === names.work);
  assert.equal(records.find(record => record.id === workCorrelation.entityId).provenance.sourceRef.includes(workCorrelation.legacyHash), true);
  const evidence = records.find(record => record.id === workCorrelation.evidenceId);
  assert.equal(fs.readFileSync(path.join(first.stageRoot, evidence.body.payloadRef), "utf8"), fs.readFileSync(path.join(root, names.work), "utf8"));
  const changes = await store.listStateChanges(first.projectId);
  const outbox = await store.listOutbox(first.projectId);
  assert.equal(changes.length, outbox.length);
  store.close();
  await assert.rejects(stageLegacyAuthorityImport(root, snapshot), /already has a staged candidate/);
  fs.rmSync(first.stageRoot, { recursive: true });
  const second = await stageLegacyAuthorityImport(root, snapshot);
  const rebuilt = createSQLiteProjectStateStore(second.databasePath);
  assert.equal(second.projectId, first.projectId);
  assert.deepEqual(second.correlations, first.correlations);
  assert.deepEqual(await rebuilt.listEntities(second.projectId), records);
  assert.deepEqual(await rebuilt.listRelationships(second.projectId), relationships);
  rebuilt.close();
});

test("staged import rejects stale snapshots and dangling Repair parents without leaving a candidate", async context => {
  const root = workspace(context);
  const names = source(root);
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  const altered = structuredClone(snapshot);
  altered.documents[0].metadata.identity.injected = "untrusted";
  await assert.rejects(stageLegacyAuthorityImport(root, altered), /incomplete or differs/);
  fs.appendFileSync(path.join(root, names.work), "new source\n");
  await assert.rejects(stageLegacyAuthorityImport(root, snapshot), /incomplete or differs/);
  assert.equal(inventoryLegacyMarkdownAuthority(root).complete, true);
  const repairFile = path.join(root, names.repair);
  const repairContent = fs.readFileSync(repairFile, "utf8").replace('"parentWorkCardId": "WI01"', '"parentWorkCardId": "MISSING"');
  fs.writeFileSync(repairFile, repairContent);
  const dangling = inventoryLegacyMarkdownAuthority(root);
  await assert.rejects(stageLegacyAuthorityImport(root, dangling), /Repair parent is missing or ambiguous/);
  assert.equal(fs.existsSync(path.join(root, ".champcity", "project-state-staging", dangling.snapshotId)), false);
  fs.writeFileSync(repairFile, repairContent.replace('"parentWorkCardId": "MISSING"', '"parentWorkCardId": "WI01-REPAIR01"'));
  await assert.rejects(stageLegacyAuthorityImport(root, inventoryLegacyMarkdownAuthority(root)), /cannot point to itself/);
  fs.writeFileSync(repairFile, repairContent.replace('"parentWorkCardId": "MISSING"', '"parentWorkCardId": "WI01"'));
  const validationFile = path.join(root, "planning/development/VALIDATION.md");
  fs.writeFileSync(validationFile, fs.readFileSync(validationFile, "utf8").replace(/\s+"method": "reviewed source",/, ""));
  await assert.rejects(stageLegacyAuthorityImport(root, inventoryLegacyMarkdownAuthority(root)), /Validation facts are incomplete/);
});
