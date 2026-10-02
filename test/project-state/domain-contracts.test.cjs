const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const test = require("node:test");

const { ENTITY_TYPE_REGISTRY, createProjectStateEntity, validateProjectStateEntity } = require("../../dist/shared/projectState/entityTypeRegistry.js");
const { RELATIONSHIP_REGISTRY, createRelationship, assertRelationshipEnd, validateRelationship } = require("../../dist/shared/projectState/relationshipRegistry.js");
const { assertRevision, assertSupersession, assertNoHardDelete } = require("../../dist/shared/projectState/domainInvariants.js");
const principal = { principalId: "system", principalType: "system", role: "state-service" };
const now = new Date().toISOString();
const linkedId = randomUUID();
const common = { title: "Title", statement: "Statement" };
const bodies = {
  PlanReviewCycle: {workflowId: linkedId, workflowType: "feature-capability", semanticDigest: "a".repeat(64), layout: {solutionId: linkedId, solutionAddresses: [], solutionCriterionIds: [], phases: [], workItems: [], boundaries: [], sources: []}},
  Project: { name: "Project", description: "Description" },
  ProjectResource: { resourceType: "repository", provider: "git", logicalName: "Source", locator: "opaque", role: "source" },
  WorkIntake: { request: "Request", desiredOutcome: "Outcome", constraints: [], evidenceContext: [], intakeState: "captured", requestedIntegrationTarget: "dev" },
  RouteAssessment: { workIntakeId: linkedId, recommendation: "feature-change", traits: [], rationale: "Reason", evidenceIds: [] },
  Workflow: { workflowType: "feature-capability", title: "Feature / Capability", currentWorkspace: "work", workflowState: "active" },
  ArchitectReviewCycle: {workflowId: linkedId, workflowType: "feature-capability", stageKind: "feature-assessment", semanticDigest: "a".repeat(64)},
  WorkflowIntake: { workflowId: linkedId, workflowType: "feature-capability", values: { request: "Build", existing: false } },
  SourceBaseline: { workflowId: linkedId, repositoryId: "repo", integrationTargetSourceLineId: "dev", baseRevisionId: "revision" },
  Phase: { title: "Phase", objective: "Objective", phaseState: "active", sequence: 1 },
  Finding: { ...common, category: "defect", impact: "Impact", observedAt: now, findingState: "open" },
  RootCause: { ...common, rationale: "Rationale", rootCauseState: "proposed" },
  BoundedSolution: { title: "Solution", objective: "Objective", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed" },
  Criterion: { statement: "Observable", criticality: "required", verificationIntent: "Prove the result", validationPolicy: "deterministic", criterionState: "active" },
  WorkItem: { workItemKind: "feature", title: "Work", objective: "Objective", workState: "ready" },
  ImplementationRecord: { workItemId: linkedId, summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" },
  TesterResult: { workflowId: linkedId, workItemId: linkedId, implementationRecordId: linkedId, sourceMode: "source-backed", implementerRevisionId: "revision",
    recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [], determinationEvidence: ["Catalog proof reviewed"],
    unknowns: [], rationale: "Existing proof covers the affected behavior", checkpointState: "not-required", candidateRevisionId: "revision" },
  Validation: { validationType: "test", method: "automated", validationMode: "deterministic", outcome: "pass", targetEntityId: linkedId, targetRecordVersion: 1, performedBy: principal, performedAt: now, summary: "Passed" },
  Evidence: { evidenceType: "test-output", description: "Output", capturedAt: now, capturedBy: principal, mediaType: "text/plain", payloadRef: "sha256:payload", digest: "a".repeat(64) },
  Decision: { decisionType: "proceed", outcome: "approved", rationale: "Reason", decisionRole: "Operator", decisionScope: "project", decidedBy: principal, decidedAt: now, effectiveAt: now },
  RegressionObligation: { ...common, capabilityId: "sample-capability", riskCategory: "functional", obligationState: "active" },
  SourceBinding: { workflowId: linkedId, sourceBaselineId: linkedId, preparationState: "unprepared" },
  SourceCheckpoint: { boundaryId: "boundary", workflowId: linkedId, sourceLineId: "work", expectedRevisionId: "revision", checkpointKind: "implementation", checkpointState: "pending" },
  IntegrationRecord: { workflowId: linkedId, incomingRevisionId: "incoming", targetSourceLineId: "dev", targetBeforeRevisionId: "before", integrationState: "prepared", outcome: "pending", validationIds: [], repairWorkItemIds: [] },
};

test("all adopted Project State types have registered bounded schemas and application-issued envelopes", () => {
  assert.deepEqual(Object.keys(ENTITY_TYPE_REGISTRY).sort(), Object.keys(bodies).sort());
  const tester = createProjectStateEntity({ entityType: "TesterResult", projectId: linkedId, body: bodies.TesterResult, principal });
  assert.throws(() => validateProjectStateEntity({ ...tester, body: { ...tester.body, candidateRevisionId: "another-revision" } }), /Unchanged Tester result/);
  assert.throws(() => validateProjectStateEntity({ ...tester, body: { ...tester.body, checkpointState: "pending", candidateRevisionId: undefined } }), /Pending or blocked Tester result/);
  const project = createProjectStateEntity({ entityType: "Project", body: bodies.Project, principal });
  assert.equal(project.projectId, project.id);
  for (const [entityType, body] of Object.entries(bodies)) {
    const record = createProjectStateEntity({ entityType, projectId: project.id, body, principal });
    assert.equal(record.entityType, entityType);
    assert.equal(record.schemaVersion, 1);
    assert.equal(record.recordVersion, 1);
    assert.match(record.id, /^[0-9a-f-]{36}$/);
    assert.equal(validateProjectStateEntity(structuredClone(record)).id, record.id);
  }
  assert.equal(ENTITY_TYPE_REGISTRY.SourceBaseline.immutableAfterCreation, true);
  const baseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId: project.id, body: { ...bodies.SourceBaseline, workflowId: linkedId }, principal });
  assert.throws(() => createProjectStateEntity({ entityType: "SourceBinding", projectId: project.id,
    body: { workIntakeId: linkedId, repositoryId: "repo", integrationTargetSourceLineId: "dev", preparationState: "unprepared" }, principal }), /workflowId is required/);
  assert.throws(() => validateProjectStateEntity({ ...baseline, body: { ...baseline.body, extra: "x" } }), /unsupported/);
  const { baseRevisionId: _baseRevisionId, ...missingBaselineRevision } = baseline.body;
  assert.throws(() => validateProjectStateEntity({ ...baseline, body: missingBaselineRevision }), /baseRevisionId is required/);
  for (const field of ["repositoryId", "integrationTargetSourceLineId", "baseRevisionId"]) {
    assert.throws(() => validateProjectStateEntity({ ...baseline, body: { ...baseline.body, [field]: "bad reference" } }), /opaque RepositoryService reference/);
  }
});

test("registry rejects unknown type, unsupported fields, and invalid envelope semantics", () => {
  const valid = createProjectStateEntity({ entityType: "WorkItem", projectId: randomUUID(), body: bodies.WorkItem, principal });
  assert.throws(() => validateProjectStateEntity({ ...valid, entityType: "Invented" }), /Unregistered/);
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, approvalShortcut: true } }), /unsupported/);
  assert.throws(() => validateProjectStateEntity({ ...valid, recordVersion: 0 }), /version/);
  assert.throws(() => validateProjectStateEntity({ ...valid, schemaVersion: 2 }), /schema version/);
  assert.throws(() => validateProjectStateEntity({ ...valid, lifecycleState: "superseded" }), /timestamp/);
  assert.throws(() => validateProjectStateEntity({ ...valid, sourcePath: "outside" }), /unsupported/);
});

test("Workflow bodies require canonical types and canonical instance fields", () => {
  const projectId = randomUUID();
  const valid = createProjectStateEntity({ entityType: "Workflow", projectId, body: bodies.Workflow, principal });
  assert.equal(validateProjectStateEntity(structuredClone(valid)).body.workflowType, "feature-capability");
  for (const workflowType of ["development", "work-intake", "project-planning", "greenfield"]) {
    assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, workflowType } }), /unsupported/);
  }
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, workspace: "legacy" } }), /unsupported/);
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, governingEntityId: linkedId } }), /unsupported/);
  const { title: _title, ...missingTitle } = valid.body;
  assert.throws(() => validateProjectStateEntity({ ...valid, body: missingTitle }), /title is required/);
  const { currentWorkspace: _workspace, ...missingWorkspace } = valid.body;
  assert.throws(() => validateProjectStateEntity({ ...valid, body: missingWorkspace }), /currentWorkspace is required/);
});

test("registry enforces text, list, timestamp and total record bounds", () => {
  const valid = createProjectStateEntity({ entityType: "WorkIntake", projectId: randomUUID(), body: bodies.WorkIntake, principal });
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, request: "x".repeat(4097) } }), /bounded text/);
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, constraints: Array(129).fill("x") } }), /list bound/);
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, constraints: Array(128).fill("x".repeat(4096)) } }), /byte bound/);
  assert.throws(() => validateProjectStateEntity({ ...valid, createdAt: "yesterday" }), /UTC instant/);
  assert.throws(() => validateProjectStateEntity({ ...valid, provenance: { origin: "native", extra: "x" } }), /unsupported/);
});

test("relationship registry enforces direction, endpoint existence, Project ownership and provenance", () => {
  const projectId = randomUUID();
  const finding = createProjectStateEntity({ entityType: "Finding", projectId, body: bodies.Finding, principal });
  const cause = createProjectStateEntity({ entityType: "RootCause", projectId, body: bodies.RootCause, principal });
  const other = createProjectStateEntity({ entityType: "Finding", projectId: randomUUID(), body: bodies.Finding, principal });
  const intake = createProjectStateEntity({ entityType: "WorkIntake", projectId, body: bodies.WorkIntake, principal });
  const workflow = createProjectStateEntity({ entityType: "Workflow", projectId, body: bodies.Workflow, principal });
  const workItem = createProjectStateEntity({ entityType: "WorkItem", projectId, body: { ...bodies.WorkItem, workState: "implemented" }, principal });
  const implementation = createProjectStateEntity({ entityType: "ImplementationRecord", projectId,
    body: { ...bodies.ImplementationRecord, workItemId: workItem.id }, principal });
  const testerResult = createProjectStateEntity({ entityType: "TesterResult", projectId, body: {
    ...bodies.TesterResult, workflowId: workflow.id, workItemId: workItem.id, implementationRecordId: implementation.id,
  }, principal });
  const baseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId, body: { ...bodies.SourceBaseline, workflowId: workflow.id }, principal });
  const source = createProjectStateEntity({ entityType: "SourceBinding", projectId, body: { workflowId: workflow.id, sourceBaselineId: baseline.id, preparationState: "unprepared" }, principal });
  const entities = new Map([finding, cause, other, intake, source, workflow, baseline, workItem, implementation, testerResult].map(entity => [entity.id, entity]));
  const lookup = id => entities.get(id);
  const link = createRelationship({ projectId, fromEntityId: cause.id, relationshipType: "explains", toEntityId: finding.id, createdBy: principal }, lookup);
  assert.equal(validateRelationship(link, lookup).id, link.id);
  assert.throws(() => assertRelationshipEnd(link, now), /Immutable provenance/);
  assert.equal(createRelationship({ projectId, fromEntityId: source.id, relationshipType: "binds_source", toEntityId: workflow.id, createdBy: principal }, lookup).relationshipType, "binds_source");
  assert.throws(() => createRelationship({ projectId, fromEntityId: source.id, relationshipType: "binds_source", toEntityId: intake.id, createdBy: principal }, lookup), /direction or endpoint/);
  assert.equal(createRelationship({ projectId, fromEntityId: testerResult.id, relationshipType: "assesses_work_item", toEntityId: workItem.id, createdBy: principal }, lookup).relationshipType, "assesses_work_item");
  assert.equal(createRelationship({ projectId, fromEntityId: testerResult.id, relationshipType: "records_attempt", toEntityId: implementation.id, createdBy: principal }, lookup).relationshipType, "records_attempt");
  assert.throws(() => createRelationship({ projectId, fromEntityId: testerResult.id, relationshipType: "assesses_work_item", toEntityId: workflow.id, createdBy: principal }, lookup), /direction or endpoint/);
  const successor = { ...workflow, id: randomUUID(), lineageId: workflow.lineageId };
  const successorBinding = createProjectStateEntity({ entityType: "SourceBinding", projectId,
    body: { workflowId: successor.id, sourceBaselineId: baseline.id, preparationState: "unprepared" }, principal });
  const unrelatedWorkflow = createProjectStateEntity({ entityType: "Workflow", projectId, body: { ...bodies.Workflow, title: "Other lineage" }, principal });
  const unrelatedBaseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId,
    body: { ...bodies.SourceBaseline, workflowId: unrelatedWorkflow.id }, principal });
  entities.set(successor.id, successor); entities.set(successorBinding.id, successorBinding);
  entities.set(unrelatedWorkflow.id, unrelatedWorkflow); entities.set(unrelatedBaseline.id, unrelatedBaseline);
  assert.equal(createRelationship({ projectId, fromEntityId: successorBinding.id, relationshipType: "binds_source", toEntityId: successor.id, createdBy: principal }, lookup).relationshipType, "binds_source");
  const mismatchedBinding = createProjectStateEntity({ entityType: "SourceBinding", projectId,
    body: { workflowId: successor.id, sourceBaselineId: unrelatedBaseline.id, preparationState: "unprepared" }, principal });
  entities.set(mismatchedBinding.id, mismatchedBinding);
  assert.throws(() => createRelationship({ projectId, fromEntityId: mismatchedBinding.id, relationshipType: "binds_source", toEntityId: successor.id, createdBy: principal }, lookup), /same Workflow lineage/);
  const baselineLink = createRelationship({ projectId, fromEntityId: baseline.id, relationshipType: "baselines_source", toEntityId: workflow.id, createdBy: principal }, lookup);
  assert.equal(baselineLink.relationshipType, "baselines_source");
  assert.throws(() => assertRelationshipEnd(baselineLink, now), /Immutable provenance/);
  assert.ok(Object.hasOwn(RELATIONSHIP_REGISTRY, "baselines_source"));
  const routing = createProjectStateEntity({ entityType: "Workflow", projectId, body: { ...bodies.Workflow, workflowType: "work-intake-routing" }, principal });
  const routingBaseline = createProjectStateEntity({ entityType: "SourceBaseline", projectId, body: { ...bodies.SourceBaseline, workflowId: routing.id }, principal });
  entities.set(routing.id, routing); entities.set(routingBaseline.id, routingBaseline);
  assert.throws(() => createRelationship({ projectId, fromEntityId: routingBaseline.id, relationshipType: "baselines_source", toEntityId: routing.id, createdBy: principal }, lookup), /substantive Workflow/);
  const unrelatedWorkflowForBaseline = createProjectStateEntity({ entityType: "Workflow", projectId, body: { ...bodies.Workflow, title: "Other" }, principal });
  entities.set(unrelatedWorkflowForBaseline.id, unrelatedWorkflowForBaseline);
  assert.throws(() => createRelationship({ projectId, fromEntityId: baseline.id, relationshipType: "baselines_source", toEntityId: unrelatedWorkflowForBaseline.id, createdBy: principal }, lookup), /body Workflow must match/);
  assert.ok(Object.hasOwn(RELATIONSHIP_REGISTRY, "proves"));
  assert.ok(Object.hasOwn(RELATIONSHIP_REGISTRY, "routes_to"));
  assert.equal(Object.hasOwn(RELATIONSHIP_REGISTRY, "owns_workflow"), false);
  assert.throws(() => createRelationship({ projectId, fromEntityId: finding.id, relationshipType: "explains", toEntityId: cause.id, createdBy: principal }, lookup), /direction/);
  assert.throws(() => createRelationship({ projectId, fromEntityId: cause.id, relationshipType: "explains", toEntityId: other.id, createdBy: principal }, lookup), /one Project/);
  assert.throws(() => createRelationship({ projectId, fromEntityId: cause.id, relationshipType: "explains", toEntityId: randomUUID(), createdBy: principal }, lookup), /does not exist/);
  assert.throws(() => createRelationship({ projectId, fromEntityId: cause.id, relationshipType: "invented", toEntityId: finding.id, createdBy: principal }, lookup), /Unregistered/);
});

test("routes_to is immutable WIR-to-substantive-Workflow provenance", () => {
  const projectId = randomUUID();
  const routing = createProjectStateEntity({ entityType: "Workflow", projectId, body: { ...bodies.Workflow, workflowType: "work-intake-routing" }, principal });
  const target = createProjectStateEntity({ entityType: "Workflow", projectId, body: bodies.Workflow, principal });
  const otherRouting = createProjectStateEntity({ entityType: "Workflow", projectId, body: { ...bodies.Workflow, workflowType: "work-intake-routing" }, principal });
  const linked = new Map([routing, target, otherRouting].map(record => [record.id, record]));
  const lookup = id => linked.get(id);
  const edge = createRelationship({ projectId, fromEntityId: routing.id, relationshipType: "routes_to", toEntityId: target.id, createdBy: principal }, lookup);
  assert.equal(edge.relationshipType, "routes_to");
  assert.throws(() => assertRelationshipEnd(edge, now), /Immutable provenance/);
  assert.throws(() => createRelationship({ projectId, fromEntityId: target.id, relationshipType: "routes_to", toEntityId: otherRouting.id, createdBy: principal }, lookup), /direction|routing Workflow source/);
  assert.throws(() => createRelationship({ projectId, fromEntityId: routing.id, relationshipType: "routes_to", toEntityId: otherRouting.id, createdBy: principal }, lookup), /non-routing Workflow target/);
});

test("revision and supersession invariants retain identity, lineage and immutable history", () => {
  const projectId = randomUUID();
  const original = createProjectStateEntity({ entityType: "BoundedSolution", projectId, body: bodies.BoundedSolution, principal });
  const revised = { ...original, recordVersion: 2, body: { ...original.body, objective: "Revised objective" } };
  assert.doesNotThrow(() => assertRevision(original, revised));
  assert.throws(() => assertRevision(original, { ...revised, lineageId: randomUUID() }), /identity/);
  assert.throws(() => assertRevision(original, { ...revised, recordVersion: 3 }), /one version/);
  const terminal = { ...original, recordVersion: 2, lifecycleState: "superseded", supersededAt: now };
  const successor = { ...createProjectStateEntity({ entityType: "BoundedSolution", projectId, body: bodies.BoundedSolution, principal }), lineageId: original.lineageId };
  assert.doesNotThrow(() => assertSupersession(original, terminal, successor));
  assert.throws(() => assertSupersession(original, terminal, { ...successor, lineageId: randomUUID() }), /shared type/);
  const linked = new Map([terminal, successor].map(entity => [entity.id, entity]));
  assert.equal(createRelationship({ projectId, fromEntityId: successor.id, relationshipType: "supersedes", toEntityId: terminal.id, createdBy: principal }, id => linked.get(id)).relationshipType, "supersedes");
  assert.throws(() => createRelationship({ projectId, fromEntityId: terminal.id, relationshipType: "supersedes", toEntityId: successor.id, createdBy: principal }, id => linked.get(id)), /successor|predecessor/);
  const decision = createProjectStateEntity({ entityType: "Decision", projectId, body: bodies.Decision, principal });
  assert.throws(() => assertRevision(decision, { ...decision, recordVersion: 2 }), /Immutable/);
  const evidence = createProjectStateEntity({ entityType: "Evidence", projectId, body: bodies.Evidence, principal });
  assert.throws(() => assertRevision(evidence, { ...evidence, recordVersion: 2 }, { evidenceReliedUpon: true }), /Immutable/);
  assert.throws(() => assertNoHardDelete(), /hard-deleted/);
});

test("WorkflowIntake scalar maps and exact ownership are bounded", () => {
  const workflow = createProjectStateEntity({ entityType: "Workflow", projectId: linkedId, body: { ...bodies.Workflow, workflowType: "project-creation" }, principal });
  const intake = createProjectStateEntity({ entityType: "WorkflowIntake", projectId: linkedId, body: { workflowId: workflow.id, workflowType: "project-creation", values: { request: "Build", confirmed: true } }, principal });
  const link = (record, target = workflow) => createRelationship({ projectId: linkedId, fromEntityId: record.id, toEntityId: target.id, relationshipType: "intake_for", createdBy: principal }, id => id === record.id ? record : target);
  assert.throws(() => assertRelationshipEnd(link(intake)), /immutable/i);
  for (const values of [[], null, { nested: {} }, { nested: [] }, { n: 1 }, { x: null }, { x: "" }, { x: "é".repeat(2049) }, Object.fromEntries(Array.from({ length: 33 }, (_, i) => [String(i), true])), { "": true }, { ["k".repeat(129)]: true }, { "bad\nkey": true }, Object.create(null)]) {
    assert.throws(() => validateProjectStateEntity({ ...intake, body: { ...intake.body, values } }));
  }
  assert.throws(() => validateProjectStateEntity({ ...intake, body: { ...intake.body, values: Object.fromEntries(Array.from({ length: 32 }, (_, i) => [String(i), "x".repeat(4096)])) } }), /byte bound/);
  assert.throws(() => link({ ...intake, body: { ...intake.body, workflowId: randomUUID() } }), /matching/);
  assert.throws(() => link({ ...intake, body: { ...intake.body, workflowType: "feature-capability" } }), /matching/);
  for (const target of [{ ...workflow, body: { ...workflow.body, workflowType: "work-intake-routing" } }, { ...workflow, lifecycleState: "closed" }, { ...workflow, body: { ...workflow.body, workflowState: "closed" } }, { ...workflow, projectId: randomUUID() }]) assert.throws(() => link(intake, target));
});
