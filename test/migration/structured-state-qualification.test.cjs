const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { serializeCanonicalMarkdownDocument } = require("../../dist/shared/documents/canonicalMarkdown.js");
const { acquirePlanningRepositorySnapshot, listPlanningRecordsFromSnapshot } = require("../../dist/main/documents/planningRepositorySnapshot.js");
const { createPlanningProjectionContext } = require("../../dist/main/documents/planningProjectionContext.js");
const { listPlanningDocumentsFromContext } = require("../../dist/main/documents/planningDocumentService.js");
const { getWorkIntakeProjection } = require("../../dist/main/workIntake/workIntakeService.js");
const { inventoryLegacyMarkdownAuthority } = require("../../dist/main/migrations/legacyAuthorityInventory.js");
const { stageLegacyAuthorityImport } = require("../../dist/main/migrations/stagedLegacyImporter.js");
const { cutOverLegacyProject, readDurableProviderGeneration } = require("../../dist/main/migrations/structuredProviderCutover.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createSQLiteProjectStateRecovery } = require("../../dist/main/projectState/sqliteProjectStateRecovery.js");
const { createProjectStateService, advanceDerivedEventCursor } = require("../../dist/shared/projectState/projectStateService.js");
const { createEngineeringWorkflowStateFacade } = require("../../dist/main/projectState/engineeringWorkflowStateFacade.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
function fixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-qualified-state-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function write(relativePath, artifactType, identity, workflowData, sources = []) {
    const file = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType, artifactRevision: 1,
      participationRole: "contextOnly", identity, sourceRevisions: sources, workflowData,
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null } }, `# ${artifactType}\n\nSynthetic legacy state.\n`));
  }
  const project = "planning/work-intake/PROJECT.md";
  const intake = "planning/work-intake/intakes/intake-1.md";
  const assessment = "planning/work-intake/routing/intake-1.md";
  write(project, "work-project", { projectId: "project-1" }, { name: "Synthetic", repositoryId: "repository-1" });
  write(intake, "work-intake", { intakeId: "intake-1" }, { workRequest: "Qualify", desiredOutcome: "Structured truth",
    branchBinding: { repositoryId: "repository-1", baseBranch: "dev", baseCommit: "base-1", workBranch: "work-1", currentHead: "head-1" } }, [{ path: project, revision: 1 }]);
  write(assessment, "work-routing-assessment", { intakeId: "intake-1", assessmentId: "assessment-1" },
    { recommendedRouteId: "feature-change", traits: ["existing-source"], rationale: "Bounded" }, [{ path: intake, revision: 1 }]);
  write("planning/work-intake/routes/intake-1.md", "operator-route-decision", { intakeId: "intake-1" }, { history: [{
    advice: { recommendedRouteId: "feature-change", traits: ["existing-source"], rationale: "Bounded" },
    decision: { selectedRouteId: "feature-change", rationale: "Proceed" }, recordedAt: "2026-09-20T12:00:00.000Z",
  }] }, [{ path: intake, revision: 1 }, { path: assessment, revision: 1 }]);
  return { root, intake };
}

test("qualified Project uses structured truth after restart, while legacy scanners and cached snapshots are fenced", async context => {
  const { root, intake } = fixture(context);
  const cached = acquirePlanningRepositorySnapshot(root);
  const contextBefore = createPlanningProjectionContext(root);
  assert.equal(listPlanningRecordsFromSnapshot(cached).length > 0, true);
  const snapshot = inventoryLegacyMarkdownAuthority(root);
  const staged = await stageLegacyAuthorityImport(root, snapshot);
  const receipt = await cutOverLegacyProject(root, snapshot, staged);
  assert.equal(receipt.outcome, "selected");
  assert.throws(() => acquirePlanningRepositorySnapshot(root), /reads are fenced after Structured Project State authority selection/);
  assert.throws(() => listPlanningRecordsFromSnapshot(cached), /reads are fenced after Structured Project State authority selection/);
  assert.throws(() => listPlanningDocumentsFromContext(contextBefore), /reads are fenced after Structured Project State authority selection/);
  await assert.rejects(getWorkIntakeProjection(root), /reads are fenced after Structured Project State authority selection/);

  const live = path.join(root, ".champcity", "project-state.sqlite");
  let store = createSQLiteProjectStateStore(live);
  let service = createProjectStateService(store, operator);
  const intakeId = staged.correlations.find(item => item.legacyPath === intake).entityId;
  const summary = await service.getWorkIntakeSummary(staged.projectId, intakeId);
  assert.equal(summary.currentRoute.route, "feature-change");
  const binding = await service.getSourceSemanticView(staged.projectId, "repository-1");
  assert.equal(binding.bindings.length, 1);
  const workflow = await service.getRecord(staged.projectId, summary.workflowId);
  const facade = createEngineeringWorkflowStateFacade(store, operator);
  const phase = await facade.addPhase(staged.projectId, workflow.id, { title: "Delivery", objective: "Build", sequence: 1 });
  const work = await facade.addWorkItem(staged.projectId, { workItemKind: "feature", title: "Work", objective: "Deliver" }, phase.id);
  const criterion = await facade.defineCriterion(staged.projectId, work.id, { statement: "Pass test", criticality: "required",
    verificationIntent: "Run test", validationPolicy: "deterministic" });
  await facade.recordImplementation(staged.projectId, work.id, { summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const validation = await facade.recordValidation(staged.projectId, criterion.id, { validationType: "test", method: "synthetic", outcome: "pass", summary: "Pass" });
  assert.equal((await service.getValidationFreshness(staged.projectId, validation.id)).current, true);
  await facade.recordReviewDecision(staged.projectId, work.id, { decisionType: "work-review", outcome: "approved", decisionScope: "work-item", rationale: "Reviewed" });
  assert.equal((await service.getEffectiveDisposition(staged.projectId, work.id)).state, "approved");
  await facade.completeWorkItem(staged.projectId, work.id, 1);
  const issue = await facade.recordIssueAnalysis(staged.projectId, { finding: { title: "Issue", statement: "Observed", category: "defect", impact: "User impact" },
    rootCause: { title: "Cause", statement: "Missing state", rationale: "Inspection" },
    solution: { title: "Fix", objective: "Restore", scopeIn: ["Issue"], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed" } });
  const fix = await facade.addIssueFix(staged.projectId, issue.solution.id, { title: "Fix work", objective: "Restore" }, work.id);
  const obligation = await facade.createRegressionObligation(staged.projectId, { title: "Protect behavior", statement: "Keep working",
    capabilityId: "qualified-project", riskCategory: "functional", sourceWorkItemId: fix.id });
  await facade.assessRegressionObligation(staged.projectId, obligation.id, { status: "PRESERVE", summary: "Covered", method: "analysis" });
  assert.equal((await facade.regressionStatus(staged.projectId, obligation.id)).assessments.length, 1);
  const beforeChanges = (await store.listStateChanges(staged.projectId)).length;
  let cursor = { projectId: staged.projectId, sequence: 0, eventId: null };
  const derivedIndex = new Map();
  while (true) {
    const feed = await service.getCommittedEventFeed(staged.projectId, { cursor, limit: 20 });
    for (const event of feed.events) {
      if (event.entityId) derivedIndex.set(event.entityId, event.sequence);
      cursor = advanceDerivedEventCursor(cursor, event);
    }
    if (!feed.hasMore) break;
  }
  assert.equal(derivedIndex.has(work.id), true);
  assert.equal(derivedIndex.has(fix.id), true);
  assert.equal((await store.listStateChanges(staged.projectId)).length, beforeChanges);
  const backup = await createSQLiteProjectStateRecovery(live, store).createBackup();
  assert.equal(backup.projectIds.includes(staged.projectId), true);
  store.close();

  fs.renameSync(path.join(root, "planning"), path.join(root, "historical-planning"));
  store = createSQLiteProjectStateStore(live);
  service = createProjectStateService(store, operator);
  const current = await service.getCurrentProjectStateView(staged.projectId, { limitPerSection: 100 });
  assert.equal(current.workItems.find(item => item.id === work.id).state, "closed");
  assert.equal((await service.getAuthoritativeContext(staged.projectId, { scope: "work-item", entityId: work.id, limit: 100 })).authoritative, true);
  const projection = await service.renderView(staged.projectId, { projectionType: "work-item", sourceEntityId: work.id });
  assert.equal(projection.metadata.authoritative, false);
  assert.equal(readDurableProviderGeneration(root, staged.projectId).authority, "structured");
  store.close();
});
