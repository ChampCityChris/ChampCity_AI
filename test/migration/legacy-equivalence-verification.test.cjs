const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
const { inventoryLegacyMarkdownAuthority } = require("../../dist/main/migrations/legacyAuthorityInventory.js");
const { stageLegacyAuthorityImport } = require("../../dist/main/migrations/stagedLegacyImporter.js");
const { verifyStagedLegacyEquivalence } = require("../../dist/main/migrations/legacyEquivalenceVerification.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-equivalence-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function write(name, artifactType, identity, workflowData, sourceRevisions = [], status = "Pending") {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType, artifactRevision: 1,
      participationRole: "contextOnly", identity, sourceRevisions, workflowData,
      documentDisposition: { status, notes: status === "Pending" ? "" : "Reviewed", reviewedAt: status === "Pending" ? null : "2026-09-20T12:00:00.000Z" } },
    `# ${artifactType}\n\nExact source text.\n`));
  }
  const project = "planning/work-intake/PROJECT.md";
  const intake = "planning/work-intake/intakes/intake-1.md";
  const assessment = "planning/work-intake/routing/intake-1.md";
  const route = "planning/work-intake/routes/intake-1.md";
  const work = "planning/development/Work_Cards/WI01.md";
  const validation = "planning/development/VALIDATION.md";
  write(project, "work-project", { projectId: "project-1" }, { name: "Synthetic", repositoryId: "repository-1" });
  write(intake, "work-intake", { intakeId: "intake-1" }, { workRequest: "Import", desiredOutcome: "Equivalent state",
    branchBinding: { repositoryId: "repository-1", baseBranch: "dev", baseCommit: "base-1", workBranch: "work-1", currentHead: "head-1" } }, [{ path: project, revision: 1 }]);
  write(assessment, "work-routing-assessment", { intakeId: "intake-1", assessmentId: "assessment-1" },
    { recommendedRouteId: "feature-change", traits: ["existing-source"], rationale: "Bounded feature" }, [{ path: intake, revision: 1 }]);
  write(route, "operator-route-decision", { intakeId: "intake-1" }, { history: [{
    advice: { recommendedRouteId: "feature-change", traits: ["existing-source"], rationale: "Bounded feature" },
    decision: { selectedRouteId: "feature-change", rationale: "Proceed" }, recordedAt: "2026-09-20T12:00:00.000Z",
  }] }, [{ path: intake, revision: 1 }, { path: assessment, revision: 1 }]);
  write(work, "formal-work-card", { workCardId: "WI01" }, { candidate: { title: "Build", purpose: "Equivalent import" } }, [{ path: route, revision: 1 }], "Approved");
  write(validation, "validation-record", { validationId: "V01" }, { targetPath: work, validationType: "review", method: "source review",
    validationMode: "visual_human", outcome: "pass", performedBy: { principalId: "legacy-operator", principalType: "human", role: "Operator" },
    performedAt: "2026-09-20T12:00:00.000Z", summary: "Accepted" }, [{ path: work, revision: 1 }], "Approved");
  return { root, work };
}

test("equivalence verification binds exact snapshot, schema and importer with zero blocking mismatches", async context => {
  const { root, work } = fixture(context);
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  const staged = await stageLegacyAuthorityImport(root, snapshot);
  const before = fs.readFileSync(staged.databasePath);
  const result = await verifyStagedLegacyEquivalence(root, snapshot, staged, { shadowRead: true });
  assert.equal(result.eligible, true, JSON.stringify(result.mismatches));
  assert.equal(result.mismatches.every(item => item.code === "projection-format" && item.severity === "non-blocking"), true);
  assert.equal(result.mismatches.length > 0, true);
  assert.equal(result.shadowRead, true);
  assert.equal(result.snapshotDigest, snapshot.digest);
  assert.equal(result.importerVersion > 0, true);
  assert.equal(result.schemaVersion > 0, true);
  assert.equal(result.importerVersion, staged.importerVersion);
  assert.equal(result.schemaVersion, staged.schemaVersion);
  assert.equal(result.projectionDigests.some(item => item.path === work), true);
  assert.deepEqual(fs.readFileSync(staged.databasePath), before);
  assert.deepEqual((await verifyStagedLegacyEquivalence(root, snapshot, staged)).projectionDigests, result.projectionDigests);
});

test("stale source and staged semantic mismatch block cutover with explicit evidence", async context => {
  const { root, work } = fixture(context);
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  const staged = await stageLegacyAuthorityImport(root, snapshot);
  const store = createSQLiteProjectStateStore(staged.databasePath);
  const workId = staged.correlations.find(item => item.legacyPath === work).entityId;
  const current = await store.getEntity(staged.projectId, workId);
  await store.transaction(staged.projectId, async unit => unit.saveEntity({ ...current, recordVersion: 2,
    body: { ...current.body, workState: "blocked" } }, 1));
  store.close();
  const mismatch = await verifyStagedLegacyEquivalence(root, snapshot, staged);
  assert.equal(mismatch.eligible, false);
  assert.equal(mismatch.mismatches.some(item => item.code === "work-stage" && item.severity === "blocking"), true);
  fs.appendFileSync(path.join(root, work), "source changed\n");
  const stale = await verifyStagedLegacyEquivalence(root, snapshot, staged);
  assert.equal(stale.eligible, false);
  assert.deepEqual(stale.mismatches.map(item => item.code), ["stale-source"]);
});
