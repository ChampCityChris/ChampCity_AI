const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
const { writeCanonicalMarkdownDocument } = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
const { inventoryLegacyMarkdownAuthority } = require("../../dist/main/migrations/legacyAuthorityInventory.js");
const { stageLegacyAuthorityImport } = require("../../dist/main/migrations/stagedLegacyImporter.js");
const { cutOverLegacyProject, readDurableProviderGeneration, rollBackUnwrittenCutover } = require("../../dist/main/migrations/structuredProviderCutover.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createLightweightIssueRecord } = require("../../dist/main/issueResolution/issueResolutionService.js");

function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-cutover-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function write(relativePath, artifactType, identity, workflowData, sourceRevisions = [], status = "Pending") {
    const metadata = { schemaVersion: 1, artifactType, artifactRevision: 1, participationRole: "contextOnly", identity,
      sourceRevisions, workflowData, documentDisposition: { status, notes: status === "Pending" ? "" : "Reviewed",
        reviewedAt: status === "Pending" ? null : "2026-09-20T12:00:00.000Z" } };
    const bodyMarkdown = `# ${artifactType}\n\nSynthetic legacy source.\n`;
    const file = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, serializeCanonicalMarkdownDocument(metadata, bodyMarkdown));
    return { workspaceRoot: root, relativePath, metadata, bodyMarkdown };
  }
  const project = "planning/work-intake/PROJECT.md";
  const intake = "planning/work-intake/intakes/intake-1.md";
  const assessment = "planning/work-intake/routing/intake-1.md";
  const route = "planning/work-intake/routes/intake-1.md";
  const work = "planning/development/Work_Cards/WI01.md";
  const projectWrite = write(project, "work-project", { projectId: "project-1" }, { name: "Synthetic", repositoryId: "repository-1" });
  write(intake, "work-intake", { intakeId: "intake-1" }, { workRequest: "Import", desiredOutcome: "Equivalent state",
    branchBinding: { repositoryId: "repository-1", baseBranch: "dev", baseCommit: "base-1", workBranch: "work-1", currentHead: "head-1" } }, [{ path: project, revision: 1 }]);
  write(assessment, "work-routing-assessment", { intakeId: "intake-1", assessmentId: "assessment-1" },
    { recommendedRouteId: "feature-change", traits: ["existing-source"], rationale: "Bounded" }, [{ path: intake, revision: 1 }]);
  write(route, "operator-route-decision", { intakeId: "intake-1" }, { history: [{
    advice: { recommendedRouteId: "feature-change", traits: ["existing-source"], rationale: "Bounded" },
    decision: { selectedRouteId: "feature-change", rationale: "Proceed" }, recordedAt: "2026-09-20T12:00:00.000Z",
  }] }, [{ path: intake, revision: 1 }, { path: assessment, revision: 1 }]);
  write(work, "formal-work-card", { workCardId: "WI01" }, { candidate: { title: "Build", purpose: "Equivalent import" } }, [{ path: route, revision: 1 }], "Approved");
  write("planning/development/VALIDATION.md", "validation-record", { validationId: "V01" }, { targetPath: work,
    validationType: "review", method: "source review", validationMode: "visual_human", outcome: "pass",
    performedBy: { principalId: "legacy-operator", principalType: "human", role: "Operator" },
    performedAt: "2026-09-20T12:00:00.000Z", summary: "Accepted" }, [{ path: work, revision: 1 }], "Approved");
  return { root, projectWrite, work };
}

async function stage(context) {
  const source = fixture(context);
  const snapshot = inventoryLegacyMarkdownAuthority(source.root);
  const staged = await stageLegacyAuthorityImport(source.root, snapshot);
  return { ...source, snapshot, staged };
}

test("cutover fences a late legacy writer, verifies backup and selects one durable structured generation", async context => {
  const { root, projectWrite, snapshot, staged, work } = await stage(context);
  const pending = cutOverLegacyProject(root, snapshot, staged);
  assert.throws(() => writeCanonicalMarkdownDocument(projectWrite), /fenced during Project State cutover/);
  const receipt = await pending;
  assert.equal(receipt.outcome, "selected");
  assert.equal(receipt.generation, 1);
  assert.equal(receipt.candidateBackup.projectIds.includes(staged.projectId), true);
  assert.equal(readDurableProviderGeneration(root, staged.projectId).authority, "structured");
  assert.throws(() => writeCanonicalMarkdownDocument(projectWrite), /fenced after Structured Project State authority selection/);
  assert.throws(() => createLightweightIssueRecord(root, { title: "Late Issue", issue: "Old state write",
    currentConsequence: "Would create Markdown" }), /fenced after Structured Project State authority selection/);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const evidence = (await store.listEntities(staged.projectId, "Evidence")).find(record => record.provenance.sourceRef?.includes(work));
  assert.equal(fs.existsSync(path.join(root, ".champcity", evidence.body.payloadRef)), true);
  store.close();
  await assert.rejects(cutOverLegacyProject(root, snapshot, staged), /exactly once/);
  assert.equal(readDurableProviderGeneration(root, staged.projectId).generation, 1);
});

test("unknown post-selection outcome recovers from durable generation and rollback requires untouched structured state", async context => {
  const { root, projectWrite, snapshot, staged } = await stage(context);
  const receipt = await cutOverLegacyProject(root, snapshot, staged, { afterSelection: () => { throw Error("Simulated lost acknowledgment"); } });
  assert.equal(receipt.outcome, "recovered");
  const restored = await rollBackUnwrittenCutover(root, staged.projectId, snapshot.digest, 1, true);
  assert.equal(restored.authority, "legacy");
  writeCanonicalMarkdownDocument(projectWrite);
  const second = await cutOverLegacyProject(root, snapshot, staged);
  assert.equal(second.generation, 3);
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const service = createProjectStateService(store, { principalId: "operator", principalType: "human", role: "Operator" });
  await service.createRecord(staged.projectId, "WorkItem", { workItemKind: "feature", title: "Post-cutover", objective: "Mutate", workState: "planned" });
  store.close();
  await assert.rejects(rollBackUnwrittenCutover(root, staged.projectId, snapshot.digest, 3, true), /Structured mutations occurred/);
  assert.equal(readDurableProviderGeneration(root, staged.projectId).authority, "structured");
});

test("stale source and a failed pre-selection step leave legacy authority writable", async context => {
  const { root, projectWrite, snapshot, staged } = await stage(context);
  await assert.rejects(cutOverLegacyProject(root, snapshot, staged, { beforeSelection: () => { throw Error("Simulated pre-selection crash"); } }), /Simulated pre-selection crash/);
  assert.equal(readDurableProviderGeneration(root, staged.projectId), null);
  writeCanonicalMarkdownDocument(projectWrite);
  fs.appendFileSync(path.join(root, projectWrite.relativePath), "Changed after snapshot.\n");
  await assert.rejects(cutOverLegacyProject(root, snapshot, staged), /Legacy source changed/);
  assert.equal(readDurableProviderGeneration(root, staged.projectId), null);
});
