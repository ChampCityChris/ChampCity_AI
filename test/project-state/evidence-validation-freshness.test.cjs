const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const agent = { principalId: "reviewer", principalType: "agent", role: "Reviewer" };
const workBody = { workItemKind: "feature", title: "Work", objective: "Implement", workState: "ready" };
const validationInput = { validationType: "test", method: "automated", outcome: "pass", summary: "Passed" };
const evidenceInput = { evidenceType: "test-output", description: "Output", mediaType: "text/plain", payloadRef: "sha256:artifact", digest: "a".repeat(64), size: 128 };
const criterionBody = mode => ({ statement: "Prove behavior", criticality: "required", verificationIntent: "Demonstrate the result", validationPolicy: mode, criterionState: "open" });

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-freshness-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: exact target version and source baseline determine historical proof freshness`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    const validation = await service.recordValidation(project.id, work.id, { ...validationInput, targetRecordVersion: 1, sourceBaselineRef: "rev-a" });
    assert.equal(validation.body.targetEntityId, work.id);
    assert.equal(validation.body.targetRecordVersion, 1);
    assert.equal(validation.body.sourceBaselineRef, "rev-a");
    assert.deepEqual(await service.getValidationFreshness(project.id, validation.id, "rev-a"), {
      validationId: validation.id, targetEntityId: work.id, targetRecordVersion: 1, current: true, staleReason: null,
    });
    assert.equal((await service.getValidationFreshness(project.id, validation.id, "rev-b")).staleReason, "source-baseline-changed");
    assert.equal((await service.getValidationFreshness(project.id, validation.id)).staleReason, "source-baseline-changed");
    const evidence = await service.recordEvidence(project.id, validation.id, evidenceInput);
    assert.equal((await service.getEvidence(project.id, validation.id))[0].id, evidence.id);
    assert.equal(evidence.body.payloadRef, evidenceInput.payloadRef);
    assert.equal(evidence.body.digest, evidenceInput.digest);
    assert.equal(evidence.provenance.origin, "native");
    await assert.rejects(service.reviseRecord(project.id, evidence.id, { description: "Rewrite" }, 1), /Immutable/);
    await assert.rejects(service.recordEvidence(project.id, validation.id, { ...evidenceInput, payloadRef: "data:text/plain;base64,QQ==" }), /external reference/);
    await assert.rejects(service.recordEvidence(project.id, validation.id, { ...evidenceInput, payloadRef: "results/output.txt" }), /external reference/);
    await service.reviseRecord(project.id, work.id, { objective: "Changed" }, 1);
    assert.equal((await service.getValidationFreshness(project.id, validation.id, "rev-a")).staleReason, "target-version-changed");
    assert.equal((await service.getRecord(project.id, validation.id)).body.outcome, "pass");
    await assert.rejects(service.recordValidation(project.id, work.id, { ...validationInput, targetRecordVersion: 1 }), /version is stale/);
  });

  test(`${name}: policy and latest fresh result control completion-relevant proof`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const reviewer = createProjectStateService(store, agent);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", workBody);
    await assert.rejects(service.createRecord(project.id, "Criterion", criterionBody("unregistered")), /validationPolicy is unsupported/);
    const deterministic = await service.createRecord(project.id, "Criterion", criterionBody("deterministic"));
    await service.createRelationship(project.id, work.id, "defines_criterion", deterministic.id);
    assert.equal((await service.getCriterionValidationStatus(project.id, deterministic.id)).reason, "no-current-validation");
    const passed = await reviewer.recordValidation(project.id, deterministic.id, validationInput);
    assert.deepEqual(await service.getCriterionValidationStatus(project.id, deterministic.id), {
      criterionId: deterministic.id, policy: "deterministic", satisfied: true, validationId: passed.id, reason: "current-pass",
    });
    const failed = await reviewer.recordValidation(project.id, deterministic.id, { ...validationInput, outcome: "fail", summary: "Regressed" });
    assert.equal((await service.getCriterionValidationStatus(project.id, deterministic.id)).validationId, failed.id);
    assert.equal((await service.getCriterionValidationStatus(project.id, deterministic.id)).satisfied, false);
    await service.reviseRecord(project.id, deterministic.id, { statement: "Changed criterion" }, 1);
    assert.equal((await service.getCriterionValidationStatus(project.id, deterministic.id)).reason, "no-current-validation");

    const semantic = await service.createRecord(project.id, "Criterion", criterionBody("semantic_ai"));
    await assert.rejects(reviewer.recordValidation(project.id, semantic.id, validationInput), /does not satisfy Criterion policy/);
    await reviewer.recordValidation(project.id, semantic.id, { ...validationInput, validationMode: "semantic_ai" });
    assert.equal((await service.getCriterionValidationStatus(project.id, semantic.id)).satisfied, true);
    const visual = await service.createRecord(project.id, "Criterion", criterionBody("visual_human"));
    await assert.rejects(reviewer.recordValidation(project.id, visual.id, { ...validationInput, validationMode: "visual_human" }), /human performer/);
    await service.recordValidation(project.id, visual.id, { ...validationInput, validationMode: "visual_human" });
    assert.equal((await service.getCriterionValidationStatus(project.id, visual.id)).satisfied, true);
    const operatorDecision = await service.createRecord(project.id, "Criterion", criterionBody("operator_decision"));
    await assert.rejects(service.recordValidation(project.id, operatorDecision.id, validationInput), /cannot be replaced by Validation/);
    assert.equal((await service.getCriterionValidationStatus(project.id, operatorDecision.id)).reason, "operator-decision-required");
  });

  test(`${name}: deferred visual proof becomes eligible at its Phase criterion`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const criterion = await service.createRecord(project.id, "Criterion", criterionBody("deferred_visual_phase"));
    assert.equal((await service.getCriterionValidationStatus(project.id, criterion.id)).reason, "deferred-to-phase");
    const phase = await service.createRecord(project.id, "Phase", { title: "Phase", objective: "Complete", phaseState: "active", sequence: 1 });
    await service.createRelationship(project.id, phase.id, "defines_criterion", criterion.id);
    await service.recordValidation(project.id, criterion.id, { ...validationInput, validationMode: "visual_human" });
    assert.equal((await service.getCriterionValidationStatus(project.id, criterion.id)).satisfied, true);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
