const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const test = require("node:test");

const { ENTITY_TYPE_REGISTRY, createProjectStateEntity, validateProjectStateEntity } = require("../../dist/shared/projectState/entityTypeRegistry.js");
const principal = { principalId: "system", principalType: "system", role: "state-service" };
const now = new Date().toISOString();
const linkedId = randomUUID();
const common = { title: "Title", statement: "Statement" };
const bodies = {
  Project: { name: "Project", description: "Description" },
  ProjectResource: { resourceType: "repository", provider: "git", logicalName: "Source", locator: "opaque", role: "source" },
  WorkIntake: { request: "Request", desiredOutcome: "Outcome", constraints: [], evidenceContext: [], intakeState: "captured", requestedIntegrationTarget: "dev" },
  RouteAssessment: { workIntakeId: linkedId, recommendation: "feature", traits: [], rationale: "Reason", evidenceIds: [] },
  Workflow: { workflowType: "development", workspace: "work", governingEntityId: linkedId, workflowState: "active" },
  Phase: { title: "Phase", objective: "Objective", phaseState: "active", sequence: 1 },
  Finding: { ...common, category: "defect", impact: "Impact", observedAt: now, findingState: "open" },
  RootCause: { ...common, rationale: "Rationale", rootCauseState: "proposed" },
  BoundedSolution: { title: "Solution", objective: "Objective", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [], solutionState: "proposed" },
  Criterion: { statement: "Observable", criticality: "required", verificationIntent: "Test", criterionState: "active" },
  WorkItem: { workItemKind: "feature", title: "Work", objective: "Objective", workState: "ready" },
  ImplementationRecord: { workItemId: linkedId, summary: "Done", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" },
  Validation: { validationType: "test", method: "automated", outcome: "pass", performedBy: principal, performedAt: now, summary: "Passed" },
  Evidence: { evidenceType: "test-output", description: "Output", capturedAt: now, capturedBy: principal, mediaType: "text/plain", payloadRef: "sha256:payload", digest: "a".repeat(64) },
  Decision: { decisionType: "proceed", outcome: "approved", rationale: "Reason", decisionRole: "Operator", decisionScope: "project", decidedBy: principal, decidedAt: now, effectiveAt: now },
  RegressionObligation: { ...common, obligationState: "open" },
  SourceBinding: { workIntakeId: linkedId, repositoryId: "repo", integrationTargetSourceLineId: "dev", preparationState: "unprepared" },
  SourceCheckpoint: { boundaryId: "boundary", workIntakeId: linkedId, sourceLineId: "work", expectedRevisionId: "revision", checkpointKind: "implementation", checkpointState: "pending" },
  IntegrationRecord: { workIntakeId: linkedId, incomingRevisionId: "incoming", targetSourceLineId: "dev", targetBeforeRevisionId: "before", integrationState: "prepared" },
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

test("registry enforces text, list, timestamp and total record bounds", () => {
  const valid = createProjectStateEntity({ entityType: "WorkIntake", projectId: randomUUID(), body: bodies.WorkIntake, principal });
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, request: "x".repeat(4097) } }), /bounded text/);
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, constraints: Array(129).fill("x") } }), /list bound/);
  assert.throws(() => validateProjectStateEntity({ ...valid, body: { ...valid.body, constraints: Array(128).fill("x".repeat(4096)) } }), /byte bound/);
  assert.throws(() => validateProjectStateEntity({ ...valid, createdAt: "yesterday" }), /UTC instant/);
  assert.throws(() => validateProjectStateEntity({ ...valid, provenance: { origin: "native", extra: "x" } }), /unsupported/);
});
