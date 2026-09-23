const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const principal = { principalId: "operator", principalType: "human", role: "Operator" };
const intakeBody = { request: "Work", desiredOutcome: "Delivered", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Implement", workState: "ready" };

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-source-semantic-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

async function readyBinding(service, projectId, intakeId) {
  const created = await service.createSourceBinding(projectId, intakeId, { repositoryId: "repo-opaque", integrationTargetSourceLineId: "target-line" });
  await service.updateSourceBinding(projectId, created.id, { preparationState: "preparing", baseRevisionId: "base-revision" }, 1);
  const ready = await service.updateSourceBinding(projectId, created.id, { preparationState: "ready", workSourceLineId: "work-line", currentRevisionId: "work-revision" }, 2);
  return ready;
}

function register(name, factory) {
  test(`${name}: SourceBinding retains opaque RepositoryService references and preparation history`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, principal);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake } = await service.createWorkIntake(project.id, intakeBody);
    await assert.rejects(service.createRecord(project.id, "SourceBinding", { workIntakeId: intake.id, repositoryId: "repo", integrationTargetSourceLineId: "dev", preparationState: "unprepared" }), /typed commands/);
    await assert.rejects(service.createSourceBinding(project.id, intake.id, { repositoryId: "repo with spaces", integrationTargetSourceLineId: "dev" }), /opaque RepositoryService reference/);
    const binding = await service.createSourceBinding(project.id, intake.id, { repositoryId: "repo-opaque", integrationTargetSourceLineId: "target-line" });
    assert.equal(binding.body.preparationState, "unprepared");
    await assert.rejects(service.createSourceBinding(project.id, intake.id, { repositoryId: "repo-2", integrationTargetSourceLineId: "dev" }), /already has an active SourceBinding/);
    await assert.rejects(service.updateSourceBinding(project.id, binding.id, { preparationState: "ready" }, 1), /Invalid source preparation transition/);
    await service.updateSourceBinding(project.id, binding.id, { preparationState: "preparing", baseRevisionId: "base-revision" }, 1);
    await assert.rejects(service.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "work-line" }, 2), /Ready SourceBinding requires/);
    const ready = await service.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: "work-line", currentRevisionId: "work-revision" }, 2);
    assert.equal(ready.body.currentRevisionId, "work-revision");
    assert.equal((await service.getSourceSemanticView(project.id, "repo-opaque")).bindings[0].id, binding.id);
    assert.equal((await service.getSourceSemanticView(project.id, "other-repo")).bindings.length, 0);
    assert.equal((await service.getRecordHistory(project.id, binding.id)).records.length, 3);
    assert.equal((await store.listStateChanges(project.id)).length, (await store.listOutbox(project.id)).length);
  });

  test(`${name}: implementation and disposition checkpoints retain exact revisions and semantic targets`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, principal);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake } = await service.createWorkIntake(project.id, intakeBody);
    const binding = await readyBinding(service, project.id, intake.id);
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    const implementation = await service.recordImplementation(project.id, work.id, { summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
    await assert.rejects(service.createSourceCheckpoint(project.id, binding.id, implementation.id, { boundaryId: "boundary-1", expectedRevisionId: "wrong", checkpointKind: "implementation", checkpointState: "pending" }), /expected revision differs/);
    const checkpoint = await service.createSourceCheckpoint(project.id, binding.id, implementation.id, { boundaryId: "boundary-1", expectedRevisionId: "work-revision", checkpointKind: "implementation", checkpointState: "pending" });
    assert.equal(checkpoint.body.sourceLineId, "work-line");
    assert.equal(checkpoint.body.workIntakeId, intake.id);
    assert.deepEqual(new Set((await service.getRelationships(project.id, checkpoint.id)).map(edge => edge.toEntityId)), new Set([binding.id, intake.id, implementation.id]));
    await assert.rejects(service.createSourceCheckpoint(project.id, binding.id, work.id, { boundaryId: "boundary-1", expectedRevisionId: "work-revision", checkpointKind: "disposition", checkpointState: "pending" }), /boundary already exists/);
    const committed = await service.advanceSourceCheckpoint(project.id, checkpoint.id, { checkpointState: "committed", resultingRevisionId: "work-revision-2" }, 1);
    assert.equal(committed.body.resultingRevisionId, "work-revision-2");
    await assert.rejects(service.advanceSourceCheckpoint(project.id, checkpoint.id, { checkpointState: "pending" }, 2), /Invalid checkpoint transition/);
    const updatedBinding = await service.updateSourceBinding(project.id, binding.id, { currentRevisionId: "work-revision-2" }, 3);
    assert.equal(updatedBinding.body.currentRevisionId, "work-revision-2");
    const disposition = await service.createSourceCheckpoint(project.id, binding.id, work.id, { boundaryId: "boundary-2", expectedRevisionId: "work-revision-2", checkpointKind: "disposition", checkpointState: "pending" });
    assert.equal(disposition.body.checkpointKind, "disposition");
    assert.equal((await service.getSourceSemanticView(project.id, "repo-opaque")).checkpoints.length, 2);
  });

  test(`${name}: IntegrationRecord links incoming, validation, repair and result revisions without Git inspection`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, principal);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const { intake } = await service.createWorkIntake(project.id, intakeBody);
    const binding = await readyBinding(service, project.id, intake.id);
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    const integration = await service.createIntegrationRecord(project.id, binding.id, { targetBeforeRevisionId: "target-before", candidateRevisionId: "candidate", targetEntityId: work.id });
    assert.equal(integration.body.incomingRevisionId, "work-revision");
    assert.equal(integration.body.targetSourceLineId, "target-line");
    const validation = await service.recordValidation(project.id, integration.id, { validationType: "integration", method: "automated", outcome: "pass", summary: "Candidate checked", sourceBaselineRef: "candidate" });
    const repair = await service.createRecord(project.id, "WorkItem", { ...workBody, workItemKind: "repair", title: "Repair" });
    const validating = await service.advanceIntegrationRecord(project.id, integration.id, { integrationState: "validating", validationIds: [validation.id] }, 1);
    assert.deepEqual(validating.body.validationIds, [validation.id]);
    const repairing = await service.advanceIntegrationRecord(project.id, integration.id, { integrationState: "repairing", repairWorkItemIds: [repair.id] }, 2);
    assert.deepEqual(repairing.body.repairWorkItemIds, [repair.id]);
    await service.advanceIntegrationRecord(project.id, integration.id, { integrationState: "ready" }, 3);
    await assert.rejects(service.advanceIntegrationRecord(project.id, integration.id, { integrationState: "integrated", outcome: "integrated" }, 4), /matching target and result revisions/);
    const integrated = await service.advanceIntegrationRecord(project.id, integration.id, { integrationState: "integrated", outcome: "integrated", targetAfterRevisionId: "target-after", resultRevisionId: "target-after" }, 4);
    assert.equal(integrated.body.resultRevisionId, "target-after");
    assert.equal((await service.getSourceSemanticView(project.id, "repo-opaque")).integrations[0].id, integration.id);
    assert.equal((await service.getRecordHistory(project.id, integration.id)).records.length, 5);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
