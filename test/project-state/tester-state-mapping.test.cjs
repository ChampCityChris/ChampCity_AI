const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");

const principal = { principalId: "tester", principalType: "agent", role: "Tester" };
const digest = "a".repeat(64);
const obligationInput = { title: "Continue to protect routing", statement: "A selected route remains attributable", capabilityId: "work-routing", riskCategory: "functional" };

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-tester-state-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

async function setup(store) {
  const service = createProjectStateService(store, principal);
  const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Tester state" });
  const work = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Routing", objective: "Implement routing", workState: "implemented" });
  return { service, project, work };
}

function register(name, factory) {
  test(`${name}: obligation lifecycle and typed assessment remain historical`, async context => {
    const store = factory(context);
    const { service, project, work } = await setup(store);
    await assert.rejects(service.createRecord(project.id, "RegressionObligation", { ...obligationInput, obligationState: "active" }), /typed commands/);
    const obligation = await service.createRegressionObligation(project.id, { ...obligationInput, sourceWorkItemId: work.id });
    assert.equal(obligation.body.obligationState, "active");
    await assert.rejects(service.recordValidation(project.id, obligation.id, { validationType: "test-lifecycle-assessment", method: "analysis", outcome: "pass", summary: "Reuse" }), /typed command/);
    const assessment = await service.recordTestLifecycleAssessment(project.id, obligation.id, { status: "PRESERVE", method: "catalog-analysis", summary: "Current proof covers invariant" });
    assert.equal(assessment.body.validationType, "test-lifecycle-assessment");
    assert.equal(assessment.body.assessmentStatus, "PRESERVE");
    assert.equal(assessment.body.outcome, "inconclusive");
    const quarantined = await service.setRegressionObligationState(project.id, obligation.id, "quarantined", 1);
    assert.equal(quarantined.body.obligationState, "quarantined");
    const retired = await service.setRegressionObligationState(project.id, obligation.id, "retired", 2);
    assert.equal(retired.lifecycleState, "closed");
    await assert.rejects(service.setRegressionObligationState(project.id, obligation.id, "active", 3), /unavailable or stale/);
    const view = await service.getRegressionObligationView(project.id, obligation.id);
    assert.equal(view.assessments[0].id, assessment.id);
    assert.equal((await service.getRecordHistory(project.id, obligation.id)).records.length, 3);
  });

  test(`${name}: immutable implementation proof survives transient executable removal`, async context => {
    const store = factory(context);
    const { service, project, work } = await setup(store);
    const obligation = await service.createRegressionObligation(project.id, { ...obligationInput, sourceWorkItemId: work.id });
    const implementation = await service.recordImplementation(project.id, work.id, { summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
    await assert.rejects(service.recordEvidence(project.id, work.id, { evidenceType: "implementation-proof", description: "Result", mediaType: "application/json", payloadRef: "evidence:receipt", digest }), /typed command/);
    const proof = await service.recordImplementationProof(project.id, implementation.id, { description: "Local validation receipt", mediaType: "application/json", payloadRef: "evidence:transient-receipt", digest, sourceBaselineRef: "source-revision-a" });
    assert.equal(proof.body.sourceBaselineRef, "source-revision-a");
    assert.equal(proof.body.evidenceType, "implementation-proof");
    assert.deepEqual(new Set((await service.getRelationships(project.id, proof.id)).map(edge => edge.toEntityId)), new Set([implementation.id, work.id]));
    assert.equal((await service.getRegressionObligationView(project.id, obligation.id)).implementationProof[0].id, proof.id);
    await assert.rejects(service.reviseRecord(project.id, proof.id, { description: "Changed" }, 1), /Immutable semantic records/);
    assert.equal((await store.listStateChanges(project.id)).length, (await store.listOutbox(project.id)).length);
  });

  test(`${name}: one catalog reference proves multiple obligations across supersession`, async context => {
    const store = factory(context);
    const { service, project, work } = await setup(store);
    const first = await service.createRegressionObligation(project.id, { ...obligationInput, sourceWorkItemId: work.id });
    const second = await service.createRegressionObligation(project.id, { title: "Protect reroute", statement: "Reroute keeps prior decision", capabilityId: "work-routing", riskCategory: "history", sourceWorkItemId: work.id });
    const reference = await service.recordPermanentTestReference(project.id, { catalogTestId: "routing-history", testPath: "test/regression/routing-history.test.cjs", sourceRevisionId: "source-revision-b" }, [first.id, second.id]);
    assert.equal(reference.body.provider, "ValidationCatalog");
    assert.equal(reference.body.locator, "test/regression/routing-history.test.cjs");
    assert.equal((await service.getRegressionObligationView(project.id, first.id)).permanentReferences[0].id, reference.id);
    assert.equal((await service.getRegressionObligationView(project.id, second.id)).permanentReferences[0].id, reference.id);
    await assert.rejects(service.recordPermanentTestReference(project.id, { catalogTestId: "routing-history", testPath: "test/regression/routing-history.test.cjs" }, [first.id]), /already exists/);
    await assert.rejects(service.recordPermanentTestReference(project.id, { catalogTestId: "outside", testPath: "../outside.test.cjs" }, [first.id]), /repository-relative test path/);
    const replacement = await service.supersedeRecord(project.id, first.id, { ...obligationInput, statement: "Updated route invariant", obligationState: "active", sourceWorkItemId: work.id }, 1);
    assert.equal(replacement.successor.lineageId, first.lineageId);
    await service.linkPermanentTestReference(project.id, reference.id, replacement.successor.id);
    assert.equal((await service.getRegressionObligationView(project.id, replacement.successor.id)).permanentReferences[0].id, reference.id);
    assert.equal((await service.getRegressionObligationView(project.id, first.id)).permanentReferences[0].id, reference.id);
    assert.equal((await service.getLineage(project.id, replacement.successor.id)).records.length, 4);
  });

  test(`${name}: TesterResult binds the exact Workflow, WorkItem, and implementation revision`, async context => {
    const store = factory(context);
    const { service, project } = await setup(store);
    const implementer = createProjectStateService(store, { principalId: "implementer-agent", principalType: "agent", role: "Implementer" });
    const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Tester result", currentWorkspace: "development" });
    async function implementedWork(title) {
      const work = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title, objective: "Validate bounded work", workState: "implemented" });
      await service.createRelationship(project.id, work.id, "part_of", workflow.id);
      const implementation = await implementer.recordImplementation(project.id, work.id, {
        summary: "Implementation complete", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: `execution-${title}`,
      });
      return { work, implementation };
    }
    const unchanged = await implementedWork("Unchanged candidate");
    const unchangedResult = await service.createTesterResult(project.id, workflow.id, unchanged.work.id, unchanged.implementation.id, {
      implementerRevisionId: "revision-unchanged", recommendation: "reuse-existing-proof", affectedCapabilityIds: ["validation-execution"],
      permanentTestPaths: [], determinationEvidence: ["Mapped permanent proof covers the changed behavior."], unknowns: [], rationale: "Existing permanent proof is sufficient.",
    });
    assert.equal(unchangedResult.body.candidateRevisionId, "revision-unchanged");
    assert.equal(unchangedResult.body.checkpointState, "not-required");
    assert.equal((await service.getRelationships(project.id, unchangedResult.id)).map(edge => edge.relationshipType).sort().join(","), "assesses_work_item,records_attempt");
    await assert.rejects(service.createTesterResult(project.id, workflow.id, unchanged.work.id, unchanged.implementation.id, {
      implementerRevisionId: "revision-unchanged", recommendation: "reuse-existing-proof", affectedCapabilityIds: [],
      permanentTestPaths: [], determinationEvidence: ["Retry"], unknowns: [], rationale: "Duplicate.",
    }), /already exists/);

    const changed = await implementedWork("Changed candidate");
    const pending = await service.createTesterResult(project.id, workflow.id, changed.work.id, changed.implementation.id, {
      implementerRevisionId: "revision-before-tests", recommendation: "permanent-proof-change-warranted", affectedCapabilityIds: ["validation-execution"],
      permanentTestPaths: ["test/validation/new-proof.test.cjs"], determinationEvidence: ["No mapped permanent proof covers this behavior."], unknowns: [], rationale: "Add durable proof.",
    });
    assert.equal(pending.body.checkpointState, "pending");
    assert.equal(pending.body.candidateRevisionId, undefined);
    await assert.rejects(service.reviseRecord(project.id, pending.id, { rationale: "Bypass" }, 1), /Immutable semantic records/);
    await assert.rejects(service.createRecord(project.id, "TesterResult", {}), /typed commands/);

    const unfinished = await service.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Not implemented", objective: "Wait", workState: "planned" });
    await service.createRelationship(project.id, unfinished.id, "part_of", workflow.id);
    await assert.rejects(service.createTesterResult(project.id, workflow.id, unfinished.id, unchanged.implementation.id, {
      implementerRevisionId: "revision", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["Evidence"], unknowns: [], rationale: "No result.",
    }), /implemented WorkItem/);
    await assert.rejects(service.createTesterResult(project.id, workflow.id, changed.work.id, unchanged.implementation.id, {
      implementerRevisionId: "revision", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["Evidence"], unknowns: [], rationale: "Wrong attempt.",
    }), /for its WorkItem/);
    await assert.rejects(service.createTesterResult(project.id, workflow.id, changed.work.id, changed.implementation.id, {
      implementerRevisionId: "revision", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: ["src/main/production.ts"],
      determinationEvidence: ["Evidence"], unknowns: [], rationale: "Unsafe path.",
    }), /test-owned repository surfaces/);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);
