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
  Project: { name: "Project", description: "Description" },
  ProjectResource: { resourceType: "repository", provider: "git", logicalName: "Source", locator: "opaque", role: "source" },
  WorkIntake: { request: "Request", desiredOutcome: "Outcome", constraints: [], evidenceContext: [], intakeState: "captured", requestedIntegrationTarget: "dev" },
  RouteAssessment: { workIntakeId: linkedId, recommendation: "feature-change", traits: [], rationale: "Reason", evidenceIds: [] },
  Workflow: { workflowType: "feature-capability", title: "Feature / Capability", currentWorkspace: "work", workflowState: "active" },
  Phase: { title: "Phase", objective: "Objective", phaseState: "active", sequence: 1 },
  Finding: { ...common, category: "defect", impact: "Impact", observedAt: now, findingState: "open" },
  RootCause: { ...common, rationale: "Rationale", rootCauseState: "proposed" },
  BoundedSolution: { title: "Solution", objective: "Objective", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed" },
  Criterion: { statement: "Observable", criticality: "required", verificationIntent: "Prove the result", validationPolicy: "deterministic", criterionState: "active" },
  WorkItem: { workItemKind: "feature", title: "Work", objective: "Objective", workState: "ready" },
  ImplementationRecord: { workItemId: linkedId, summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" },
  Validation: { validationType: "test", method: "automated", validationMode: "deterministic", outcome: "pass", targetEntityId: linkedId, targetRecordVersion: 1, performedBy: principal, performedAt: now, summary: "Passed" },
  Evidence: { evidenceType: "test-output", description: "Output", capturedAt: now, capturedBy: principal, mediaType: "text/plain", payloadRef: "sha256:payload", digest: "a".repeat(64) },
  Decision: { decisionType: "proceed", outcome: "approved", rationale: "Reason", decisionRole: "Operator", decisionScope: "project", decidedBy: principal, decidedAt: now, effectiveAt: now },
  RegressionObligation: { ...common, capabilityId: "sample-capability", riskCategory: "functional", obligationState: "active" },
  SourceBinding: { workIntakeId: linkedId, repositoryId: "repo", integrationTargetSourceLineId: "dev", preparationState: "unprepared" },
  SourceCheckpoint: { boundaryId: "boundary", workIntakeId: linkedId, sourceLineId: "work", expectedRevisionId: "revision", checkpointKind: "implementation", checkpointState: "pending" },
  IntegrationRecord: { workIntakeId: linkedId, incomingRevisionId: "incoming", targetSourceLineId: "dev", targetBeforeRevisionId: "before", integrationState: "prepared", outcome: "pending", validationIds: [], repairWorkItemIds: [] },
};

test("all adopted Project State types have registered bounded schemas and application-issued envelopes", () => {
  assert.deepEqual(Object.keys(ENTITY_TYPE_REGISTRY).sort(), Object.keys(bodies).sort());
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
  const source = createProjectStateEntity({ entityType: "SourceBinding", projectId, body: { ...bodies.SourceBinding, workIntakeId: intake.id }, principal });
  const entities = new Map([finding, cause, other, intake, source].map(entity => [entity.id, entity]));
  const lookup = id => entities.get(id);
  const link = createRelationship({ projectId, fromEntityId: cause.id, relationshipType: "explains", toEntityId: finding.id, createdBy: principal }, lookup);
  assert.equal(validateRelationship(link, lookup).id, link.id);
  assert.throws(() => assertRelationshipEnd(link, now), /Immutable provenance/);
  assert.equal(createRelationship({ projectId, fromEntityId: source.id, relationshipType: "binds_source", toEntityId: intake.id, createdBy: principal }, lookup).relationshipType, "binds_source");
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
