const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { WORKFLOW_TYPE_REGISTRY } = require("../../dist/shared/projectState/workflowTypeRegistry.js");
const { createRelationship: createDomainRelationship } = require("../../dist/shared/projectState/relationshipRegistry.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const reviewer = { principalId: "reviewer", principalType: "agent", role: "Reviewer" };
const workBody = (title, workItemKind = "feature") => ({ workItemKind, title, objective: `Complete ${title}`, workState: "ready" });
const attempt = outcome => ({ summary: `Attempt ${outcome}`, deviations: [], blockers: outcome === "blocked" ? ["Unresolved"] : [], residualRisks: [], outcome, executionRef: "runtime:attempt" });
const criterion = policy => ({ statement: "Prove completion", criticality: "required", verificationIntent: "Show the result", validationPolicy: policy, criterionState: "open" });
const validation = mode => ({ validationType: "review", method: "inspection", validationMode: mode, outcome: "pass", summary: "Observed" });

function sqliteFixture(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-execution-test-"));
  const store = createSQLiteProjectStateStore(path.join(root, "project-state.sqlite"));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return store;
}

function register(name, factory) {
  test(`${name}: exact failing Criterion creates one atomic same-Workflow Repair`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Repair", description: "Synthetic" });
    const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature", currentWorkspace: "feature-intake" });
    const accepted = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: workflow.id, topology: "direct",
      solution: { title: "Accepted", objective: "Repair the feature", scopeIn: ["feature"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
      solutionCriteria: [], workItems: [{ key: "parent", kind: "feature", title: "Parent", objective: "Implement feature", dependencyKeys: [],
        criteria: [{ statement: "Output preserves all rows", criticality: "required", verificationIntent: "Run the focused export proof", validationPolicy: "deterministic" }] }] });
    const parent = accepted.directWorkItems[0];
    const target = accepted.criteria.find(item => item.ownerId === parent.id).record;
    const failure = await service.recordValidation(project.id, target.id, { validationType: "criterion", method: "catalog-profile", outcome: "fail",
      summary: "One export row is missing", targetRecordVersion: target.recordVersion });
    const result = await service.createWorkflowRepair(project.id, { workflowId: workflow.id, workItemId: parent.id, failureEvidenceId: failure.id });
    assert.equal(result.repair.body.workItemKind, "fix");
    assert.equal(result.repair.body.workState, "planned");
    assert.match(result.repair.body.objective, new RegExp(`validation:${failure.id}`));
    assert.equal((await store.listRelationships(project.id, "repairs")).some(edge => edge.fromEntityId === result.repair.id && edge.toEntityId === parent.id), true);
    assert.equal((await store.listRelationships(project.id, "implements")).some(edge => edge.fromEntityId === result.repair.id && edge.toEntityId === accepted.solutions[0].id), true);
    assert.equal((await store.listRelationships(project.id, "part_of")).some(edge => edge.fromEntityId === result.repair.id && edge.toEntityId === workflow.id), true);
    assert.equal((await store.listRelationships(project.id, "defines_criterion")).some(edge => edge.fromEntityId === result.repair.id && edge.toEntityId === result.criterion.id), true);
    const before = (await store.listEntities(project.id)).length;
    await assert.rejects(service.createWorkflowRepair(project.id, { workflowId: workflow.id, workItemId: parent.id, failureEvidenceId: failure.id }), /already exists/);
    assert.equal((await store.listEntities(project.id)).length, before, "duplicate rejection must not partially write");
    await assert.rejects(service.createWorkflowRepair(project.id, { workflowId: workflow.id, workItemId: parent.id, failureEvidenceId: result.criterion.id }), /failing current Validation or exact production-defect TesterResult/);
  });

  test(`${name}: reviewed Workflow planning graph normalizes atomically and projects by exact Workflow`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Planning", description: "Synthetic" });
    const first = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Same", currentWorkspace: "feature-intake" });
    const second = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Same", currentWorkspace: "feature-intake" });
    const criterion = { statement: "Works", criticality: "required", verificationIntent: "Run proof", validationPolicy: "deterministic" };
    const accepted = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: first.id, topology: "phased",
      solution: { title: "Solution", objective: "Deliver", scopeIn: ["feature"], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [criterion],
      phases: [{ key: "p1", title: "Phase", objective: "Build", sequence: 1, criteria: [criterion] }],
      workItems: [{ key: "temp-a", kind: "feature", title: "A", objective: "A", phaseKey: "p1", dependencyKeys: [], criteria: [criterion] }, { key: "temp-b", kind: "feature", title: "B", objective: "B", phaseKey: "p1", dependencyKeys: ["temp-a"], criteria: [] }] });
    assert.equal(accepted.workflow.body.currentWorkspace, "work-item-map");
    assert.equal(accepted.phases.length, 1);
    assert.equal(accepted.phases[0].sequence, 1);
    assert.equal(accepted.workItemsByPhase[accepted.phases[0].phaseId].length, 2);
    assert.equal(accepted.criteria.length, 3);
    assert.ok(accepted.decisions.some(item => item.body.decisionType === "planning-acceptance" && item.body.outcome === "accepted"));
    assert.ok(accepted.solutions[0].id !== "temp-a");
    assert.equal((await service.getWorkflowExecutionPlan(project.id, second.id)).solutions.length, 0);
    const before = (await store.listEntities(project.id)).length;
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, { workflowId: second.id, topology: "direct",
      solution: { title: "Invalid", objective: "Invalid", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      workItems: [{ key: "a", kind: "feature", title: "A", objective: "A", dependencyKeys: ["missing"], criteria: [] }] }), /dependency key/);
    assert.equal((await store.listEntities(project.id)).length, before);
    assert.equal((await service.getRecord(project.id, second.id)).body.currentWorkspace, "feature-intake");
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, { workflowId: second.id, topology: "direct",
      solution: { title: "Invalid policy", objective: "Invalid", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      workItems: [{ key: "a", kind: "feature", title: "A", objective: "A", dependencyKeys: [], criteria: [{ statement: "Must be explicit", criticality: "required", verificationIntent: "Verify" }] }] }), /validation policy/);
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, { workflowId: second.id, topology: "direct",
      solution: { title: "Invalid deferred visual", objective: "Needs a Phase boundary", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] },
      solutionCriteria: [{ statement: "Review at close", criticality: "required", verificationIntent: "Visual review at Phase close", validationPolicy: "deferred_visual_phase" }],
      workItems: [{ key: "a", kind: "feature", title: "A", objective: "A", dependencyKeys: [], criteria: [] }] }), /real Phase boundary/);
    assert.equal((await store.listEntities(project.id)).length, before);
    const secondPlan = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: second.id, topology: "phased",
      solution: { title: "Second solution", objective: "Isolated", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      phases: [{ key: "p2", title: "Second phase", objective: "Independent", sequence: 1 }],
      workItems: [{ key: "second-work", kind: "feature", title: "Second work", objective: "Independent", phaseKey: "p2", dependencyKeys: [], criteria: [] }] });
    assert.equal(secondPlan.phases[0].sequence, 1);
    assert.equal(secondPlan.workItemsByPhase[secondPlan.phases[0].phaseId].length, 1);
    assert.notEqual(secondPlan.phases[0].phaseId, accepted.phases[0].phaseId);
    const latePhase = await service.createRecord(project.id, "Phase", { title: "Late", objective: "Must not append", phaseState: "planned", sequence: 2 });
    await assert.rejects(service.createRelationship(project.id, latePhase.id, "part_of", second.id), /accepted Workflow planning graph cannot be changed/);
    const outsider = await service.createRecord(project.id, "WorkItem", workBody("Other Workflow"));
    const third = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Other", currentWorkspace: "feature-intake" });
    await service.createRelationship(project.id, outsider.id, "part_of", third.id);
    await assert.rejects(service.createRelationship(project.id, accepted.workItemsByPhase[accepted.phases[0].phaseId][0].id, "depends_on", outsider.id), /cannot cross Workflow ownership/);
    const wir = await service.createWorkflow(project.id, { workflowType: "work-intake-routing", title: "Routing", currentWorkspace: "work-intake" });
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, { workflowId: wir.id, topology: "direct", solution: {}, solutionCriteria: [], workItems: [] }), /current active implementation Workflow/);
    await assert.rejects(service.getWorkflowExecutionPlan(project.id, wir.id), /substantive Workflow/);
    const projectCreation = await service.createWorkflow(project.id, { workflowType: "project-creation", title: "Project", currentWorkspace: "project-intake" });
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, { workflowId: projectCreation.id, topology: "direct", solution: {}, solutionCriteria: [], workItems: [] }), /current active implementation Workflow/);
  });

  test(`${name}: pre-plan semantic Workflow owners do not block plan acceptance and cannot cross owners`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Owned planning", description: "Synthetic" });
    const feature = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature", currentWorkspace: "feature-intake" });
    const issue = await service.createWorkflow(project.id, { workflowType: "issue-resolution", title: "Issue", currentWorkspace: "issue-rca" });
    const peerIssue = await service.createWorkflow(project.id, { workflowType: "issue-resolution", title: "Peer issue", currentWorkspace: "issue-rca" });
    const routing = await service.createWorkflow(project.id, { workflowType: "work-intake-routing", title: "Routing", currentWorkspace: "work-intake" });
    const projectCreation = await service.createWorkflow(project.id, { workflowType: "project-creation", title: "Creation", currentWorkspace: "project-intake" });
    const featureFinding = await service.createRecord(project.id, "Finding", { title: "Feature intake", statement: "Feature context", category: "feature-intake", impact: "Planning context", observedAt: new Date().toISOString(), findingState: "current" });
    const issueFinding = await service.createRecord(project.id, "Finding", { title: "Issue intake", statement: "Issue context", category: "issue-intake", impact: "Planning context", observedAt: new Date().toISOString(), findingState: "current" });
    const root = await service.createRecord(project.id, "RootCause", { title: "Cause", statement: "Observed cause", rationale: "Evidence", rootCauseState: "accepted" });
    await service.createRelationship(project.id, featureFinding.id, "workflow_member", feature.id);
    await service.createRelationship(project.id, issueFinding.id, "workflow_member", issue.id);
    await service.createRelationship(project.id, root.id, "workflow_member", issue.id);
    await assert.rejects(service.createRelationship(project.id, featureFinding.id, "workflow_member", feature.id), /Relationship already exists/);
    await assert.rejects(service.createRelationship(project.id, issueFinding.id, "workflow_member", peerIssue.id), /already belongs to a Workflow/);
    const historicalOwnerFinding = await service.createRecord(project.id, "Finding", { title: "Historical owner", statement: "Ownership cannot be rebound", category: "issue-intake", impact: "Issue", observedAt: new Date().toISOString(), findingState: "current" });
    const originalOwner = await service.createRelationship(project.id, historicalOwnerFinding.id, "workflow_member", issue.id);
    await assert.rejects(service.endRelationship(project.id, originalOwner.id), /Immutable provenance relationship cannot be ended/);
    await assert.rejects(service.createRelationship(project.id, historicalOwnerFinding.id, "workflow_member", peerIssue.id), /already belongs to a Workflow/);
    assert.ok((await store.listRelationships(project.id, "workflow_member")).some(edge => edge.id === originalOwner.id && !edge.endedAt));
    const invalidTargetFinding = await service.createRecord(project.id, "Finding", { title: "Invalid target", statement: "Must remain unowned", category: "issue-intake", impact: "Issue", observedAt: new Date().toISOString(), findingState: "current" });
    await assert.rejects(service.createRelationship(project.id, invalidTargetFinding.id, "workflow_member", routing.id), /current substantive implementation Workflow/);
    await assert.rejects(service.createRelationship(project.id, invalidTargetFinding.id, "workflow_member", projectCreation.id), /current substantive implementation Workflow/);
    const graph = (workflowId, addresses, kind) => ({ workflowId, topology: "direct", solutionAddresses: addresses,
      solution: { title: "Plan", objective: "Deliver", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      workItems: [{ key: "work", kind, title: "Work", objective: "Complete", dependencyKeys: [], criteria: [] }] });
    const acceptedFeature = await service.acceptWorkflowPlanningGraph(project.id, graph(feature.id, [featureFinding.id], "feature"));
    assert.equal(acceptedFeature.solutions.length, 1);
    const acceptedIssue = await service.acceptWorkflowPlanningGraph(project.id, graph(issue.id, [issueFinding.id, root.id], "fix"));
    assert.equal(acceptedIssue.solutions.length, 1);
    const peerEvidence = await service.recordEvidence(project.id, peerIssue.id, { evidenceType: "issue-supplied", description: "Issue evidence", mediaType: "text/plain", payloadRef: "test:evidence", digest: "b".repeat(64) });
    const before = (await store.listEntities(project.id)).length;
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, graph(peerIssue.id, [peerEvidence.id], "fix")), /must be current Finding or RootCause/);
    assert.equal((await store.listEntities(project.id)).length, before);
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, graph(peerIssue.id, [root.id], "fix")), /owned by this exact Workflow/);
    assert.equal((await store.listEntities(project.id)).length, before);
    assert.equal((await store.getEntity(project.id, peerIssue.id)).body.currentWorkspace, "issue-rca");
    await assert.rejects(service.acceptWorkflowPlanningGraph(project.id, graph(issue.id, [issueFinding.id, root.id], "fix")), /already been accepted/);
  });

  test(`${name}: Issue RCA command rolls back all writes after a controlled mid-command failure`, async context => {
    const store = factory(context);
    const service = createProjectStateService(failOnSecondRootCauseSave(store), operator);
    const project = await service.createRecord(null, "Project", { name: "Atomic RCA", description: "Synthetic" });
    const workflow = await service.createWorkflow(project.id, { workflowType: "issue-resolution", title: "Issue", currentWorkspace: "issue-rca" });
    const finding = await service.createRecord(project.id, "Finding", { title: "Observed", statement: "Failure", category: "issue-intake", impact: "Issue", observedAt: new Date().toISOString(), findingState: "current" });
    await service.createRelationship(project.id, finding.id, "workflow_member", workflow.id);
    const evidence = await service.recordEvidence(project.id, workflow.id, { evidenceType: "issue-supplied", description: "Reproduction", mediaType: "text/plain", payloadRef: "test:evidence", digest: "a".repeat(64) });
    await service.createRelationship(project.id, evidence.id, "supports", finding.id);
    const candidate = title => ({ title, statement: "Explains the failure", rationale: "Evidence supports it", findingIds: [finding.id], evidenceIds: [evidence.id] });
    await assert.rejects(service.acceptIssueRca(project.id, { workflowId: workflow.id, rationale: "Accept reviewed causes", rootCauses: [candidate("First"), candidate("Second")] }), /injected RootCause write failure/);
    assert.equal((await store.listEntities(project.id, "RootCause")).length, 0);
    assert.equal((await store.listEntities(project.id, "Decision")).filter(record => record.entityType === "Decision" && record.body.decisionType === "issue-rca-review").length, 0);
    assert.equal((await store.getEntity(project.id, workflow.id)).body.currentWorkspace, "issue-rca");
    assert.equal((await store.listRelationships(project.id, "workflow_member")).filter(edge => edge.toEntityId === workflow.id && edge.fromEntityId !== finding.id).length, 0);
  });

  test(`${name}: Workflow repeatability, lifetime uniqueness and type stability follow registry policy`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Workflow policy", description: "Synthetic" });
    const repeatableTypes = Object.values(WORKFLOW_TYPE_REGISTRY).filter(item => item.repeatable).map(item => item.workflowType);
    const created = [];
    for (const workflowType of repeatableTypes) {
      const first = await service.createWorkflow(project.id, { workflowType, title: "Same title", currentWorkspace: "same-workspace" });
      const second = await service.createWorkflow(project.id, { workflowType, title: "Same title", currentWorkspace: "same-workspace" });
      assert.notEqual(first.id, second.id);
      assert.equal((await service.getRecord(project.id, first.id)).id, first.id);
      assert.equal((await service.getRecord(project.id, second.id)).id, second.id);
      created.push(first, second);
    }
    const queried = await service.queryRecords(project.id, { entityType: "Workflow" });
    assert.equal(queried.length, created.length);
    assert.equal(new Set(queried.map(record => record.id)).size, created.length);
    assert.equal((await service.getCurrentProjectStateView(project.id)).workflows.length, created.length);

    const projectCreation = await service.createWorkflow(project.id, { workflowType: "project-creation", title: "Create", currentWorkspace: "planning" });
    const eventsBefore = (await store.listStateChanges(project.id)).length;
    await assert.rejects(service.createWorkflow(project.id, { workflowType: "project-creation", title: "Again", currentWorkspace: "elsewhere" }), /non-repeatable project-creation Workflow/);
    assert.equal((await service.queryRecords(project.id, { entityType: "Workflow" })).length, created.length + 1);
    assert.equal((await store.listStateChanges(project.id)).length, eventsBefore);
    const otherProject = await service.createRecord(null, "Project", { name: "Other", description: "Synthetic" });
    assert.equal((await service.createWorkflow(otherProject.id, { workflowType: "project-creation", title: "Create", currentWorkspace: "planning" })).body.workflowType, "project-creation");

    await assert.rejects(service.reviseRecord(project.id, created[0].id, { workflowType: "project-creation" }, 1), /Workflow type is immutable/);
    const sameType = await service.supersedeRecord(project.id, projectCreation.id, { ...projectCreation.body, title: "Corrected" }, 1);
    await assert.rejects(service.createWorkflow(project.id, { workflowType: "project-creation", title: "Again", currentWorkspace: "elsewhere" }), /non-repeatable project-creation Workflow/);
    await assert.rejects(service.supersedeRecord(project.id, sameType.successor.id, { ...sameType.successor.body, workflowType: "feature-capability" }, 1), /retain its Workflow type/);
  });

  test(`${name}: direct Workflow and Work Item completion uses attempts and current Criterion proof`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const work = await service.createRecord(project.id, "WorkItem", workBody("Direct"));
    await assert.rejects(service.createRecord(project.id, "Workflow", { workflowType: "development", workspace: "work", governingEntityId: work.id, workflowState: "active" }), /typed commands/);
    const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Direct work", currentWorkspace: "work" });
    assert.equal(workflow.body.workflowState, "active");
    assert.deepEqual(workflow.body, { workflowType: "feature-capability", title: "Direct work", currentWorkspace: "work", workflowState: "active" });
    await assert.rejects(service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Legacy", currentWorkspace: "work", governingEntityId: work.id }), /Unsupported semantic input field/);
    assert.equal((await service.getExecutionPlan(project.id)).directWorkItemIds[0], work.id);
    const required = await service.createRecord(project.id, "Criterion", criterion("deterministic"));
    await service.createRelationship(project.id, work.id, "defines_criterion", required.id);
    await assert.rejects(service.createRecord(project.id, "ImplementationRecord", { ...attempt("implemented"), workItemId: work.id }), /typed commands/);
    const implementation = await service.recordImplementation(project.id, work.id, attempt("implemented"));
    assert.equal(implementation.body.workItemId, work.id);
    await assert.rejects(service.createRelationship(project.id, implementation.id, "implements_work_item", work.id), /typed command/);
    assert.equal((await service.getImplementationAttempts(project.id, work.id))[0].id, implementation.id);
    assert.ok((await service.getWorkItemCompletionEligibility(project.id, work.id)).blockers.some(code => code.startsWith("criterion:")));
    await assert.rejects(service.reviseRecord(project.id, work.id, { workState: "closed" }, 1), /typed eligibility command/);
    await assert.rejects(service.completeWorkItem(project.id, work.id, 1), /completion is blocked/);
    await service.recordValidation(project.id, required.id, validation("deterministic"));
    const semantic = await service.createRecord(project.id, "Criterion", criterion("semantic_ai"));
    await service.createRelationship(project.id, work.id, "defines_criterion", semantic.id);
    await service.recordValidation(project.id, semantic.id, validation("semantic_ai"));
    assert.ok((await service.getWorkItemCompletionEligibility(project.id, work.id)).blockers.some(code => code.startsWith("independent-review:")));
    await createProjectStateService(store, reviewer).recordValidation(project.id, semantic.id, validation("semantic_ai"));
    assert.equal((await service.getWorkItemCompletionEligibility(project.id, work.id)).eligible, true);
    const closed = await service.completeWorkItem(project.id, work.id, 1);
    assert.equal(closed.body.workState, "closed");
    assert.equal(closed.lifecycleState, "closed");
    assert.ok(closed.closedAt);
    assert.equal((await store.listStateChanges(project.id)).length, (await store.listOutbox(project.id)).length);
  });

  test(`${name}: phased plan derives nested membership and Phase milestone proof`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const phase = await service.createRecord(project.id, "Phase", { title: "Milestone", objective: "Finish", phaseState: "active", sequence: 1 });
    const parent = await service.createRecord(project.id, "WorkItem", workBody("Parent"));
    const child = await service.createRecord(project.id, "WorkItem", workBody("Child"));
    const direct = await service.createRecord(project.id, "WorkItem", workBody("Direct"));
    await service.createRelationship(project.id, parent.id, "part_of", phase.id);
    await service.createRelationship(project.id, child.id, "part_of", parent.id);
    const plan = await service.getExecutionPlan(project.id);
    assert.deepEqual(plan.phases[0].workItemIds, [child.id, parent.id].sort());
    assert.deepEqual(plan.directWorkItemIds, [direct.id]);
    await assert.rejects(service.createRelationship(project.id, parent.id, "part_of", child.id), /already has an active parent|cycle/);
    const visual = await service.createRecord(project.id, "Criterion", criterion("deferred_visual_phase"));
    await service.createRelationship(project.id, phase.id, "defines_criterion", visual.id);
    await service.recordImplementation(project.id, parent.id, attempt("implemented"));
    await service.recordImplementation(project.id, child.id, attempt("implemented"));
    assert.ok((await service.getWorkItemCompletionEligibility(project.id, parent.id)).blockers.some(code => code.startsWith("open-child:")));
    await service.completeWorkItem(project.id, child.id, 1);
    await service.completeWorkItem(project.id, parent.id, 1);
    assert.ok((await service.getPhaseCompletionEligibility(project.id, phase.id)).blockers.some(code => code.startsWith("criterion:")));
    await assert.rejects(service.reviseRecord(project.id, phase.id, { phaseState: "closed" }, 1), /typed eligibility command/);
    await service.recordValidation(project.id, visual.id, validation("visual_human"));
    assert.equal((await service.getPhaseCompletionEligibility(project.id, phase.id)).eligible, true);
    const closed = await service.completePhase(project.id, phase.id, 1);
    assert.equal(closed.body.phaseState, "closed");
    assert.equal(closed.lifecycleState, "closed");
  });

  test(`${name}: dependencies, Repair ancestry, attempts and Decisions determine eligibility`, async context => {
    const store = factory(context);
    const service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", { name: "Synthetic", description: "Project" });
    const parent = await service.createRecord(project.id, "WorkItem", workBody("Parent"));
    const dependency = await service.createRecord(project.id, "WorkItem", workBody("Dependency"));
    const repair = await service.createRecord(project.id, "WorkItem", workBody("Repair", "repair"));
    const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Execution owner", currentWorkspace: "work-item-map" });
    for (const workItem of [parent, dependency, repair]) await service.createRelationship(project.id, workItem.id, "part_of", workflow.id);
    await service.createRelationship(project.id, parent.id, "depends_on", dependency.id);
    await service.createRelationship(project.id, repair.id, "repairs", parent.id);
    await assert.rejects(service.createRelationship(project.id, dependency.id, "depends_on", parent.id), /cycle/);
    await assert.rejects(service.createRelationship(project.id, parent.id, "repairs", dependency.id), /Only a Repair/);
    await service.recordImplementation(project.id, parent.id, attempt("implemented"));
    const initial = await service.getWorkItemCompletionEligibility(project.id, parent.id);
    assert.ok(initial.blockers.some(code => code.startsWith("dependency:")));
    assert.ok(initial.blockers.some(code => code.startsWith("open-repair:")));
    await service.recordImplementation(project.id, dependency.id, attempt("implemented"));
    await service.completeWorkItem(project.id, dependency.id, 1);
    await service.recordImplementation(project.id, repair.id, attempt("implemented"));
    await service.completeWorkItem(project.id, repair.id, 1);
    assert.equal((await service.getRecord(project.id, parent.id)).body.workState, "ready", "the final closed Repair requeues its validation-pending parent for the shared Implementer loop");
    assert.equal((await service.getWorkItemCompletionEligibility(project.id, parent.id)).eligible, true);
    await service.recordImplementation(project.id, parent.id, attempt("blocked"));
    assert.ok((await service.getWorkItemCompletionEligibility(project.id, parent.id)).blockers.includes("implementation-incomplete"));
    await service.recordImplementation(project.id, parent.id, attempt("implemented"));
    await service.recordDecision(project.id, parent.id, { decisionType: "review", outcome: "revision_requested", decisionScope: "work" });
    assert.ok((await service.getWorkItemCompletionEligibility(project.id, parent.id)).blockers.includes("blocking-disposition"));
    await service.recordDecision(project.id, parent.id, { decisionType: "review", outcome: "accepted", decisionScope: "work" });
    assert.equal((await service.getWorkItemCompletionEligibility(project.id, parent.id)).eligible, true);
  });
}

register("in-memory Project State", () => createInMemoryProjectStateStore());
register("SQLite Project State", sqliteFixture);

test("typed exact Workflow attempt commands enforce dependencies and retain immutable attempts", async context => {
  const store = sqliteFixture(context);
  const service = createProjectStateService(store, operator);
  const implementerService = createProjectStateService(store, { principalId: "codex-implementer:test-runtime", principalType: "agent", role: "Implementer" });
  const project = await service.createRecord(null, "Project", { name: "Exact attempts", description: "Synthetic" });
  const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Exact", currentWorkspace: "feature-intake" });
  const plan = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: workflow.id, topology: "direct",
    solution: { title: "Solution", objective: "Deliver", scopeIn: ["work"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], workItems: [
      { key: "first", kind: "feature", title: "Duplicate", objective: "First objective", dependencyKeys: [], criteria: [] },
      { key: "second", kind: "feature", title: "Duplicate", objective: "Second objective", dependencyKeys: ["first"], criteria: [] },
      { key: "third", kind: "feature", title: "Independent", objective: "Third objective", dependencyKeys: [], criteria: [] },
    ] });
  for (const item of plan.directWorkItems) {
    const saved = await service.saveWorkItemPlanningContract(project.id, {workflowId: workflow.id, workItemId: item.id, expectedVersion: item.recordVersion, implementationBoundaries: ["Bounded"], affectedPaths: [], proofIntent: ["Inspect semantic result"]});
    await service.recordWorkItemPlanningReview(project.id, workflow.id, item.id, {expectedRecordVersion: saved.recordVersion, outcome: "approved", notes: "Approved"});
    Object.assign(item, saved);
  }
  const first = plan.directWorkItems.find(item => item.body.objective === "First objective");
  const second = plan.directWorkItems.find(item => item.body.objective === "Second objective");
  await assert.rejects(implementerService.beginWorkItemAttempt(project.id, workflow.id, second.id, second.recordVersion, "attempt:blocked"), /dependencies/);
  const firstAttempt = await service.prepareImplementationAttempt(project.id, workflow.id, first.id);
  assert.equal((await service.prepareImplementationAttempt(project.id, workflow.id, first.id)).id, firstAttempt.id);
  assert.equal((await service.getRecord(project.id, first.id)).body.workState, "planned");
  assert.equal((await service.getImplementationAttempts(project.id, first.id)).length, 0);
  const recoveredService = createProjectStateService(store, operator);
  assert.equal((await recoveredService.getImplementationAttempt(project.id, workflow.id, first.id)).id, firstAttempt.id);
  const pendingReport = await recoveredService.renderView(project.id, {projectionType: "implementation-report", sourceEntityId: firstAttempt.id});
  assert.match(pendingReport.markdown, /Status: Pending/);
  assert.deepEqual(await service.renderView(project.id, {projectionType: "implementation-report", sourceEntityId: firstAttempt.id}), pendingReport);
  const begun = await implementerService.beginWorkItemAttempt(project.id, workflow.id, first.id, first.recordVersion, firstAttempt.id);
  assert.equal(begun.workItemId, first.id);
  const implementation = await implementerService.finishWorkItemAttempt(project.id, workflow.id, first.id, firstAttempt.id,
    { summary: "Implemented first", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  assert.equal(implementation.body.workItemId, first.id);
  assert.equal(implementation.body.executionRef, firstAttempt.id);
  assert.deepEqual(implementation.createdBy, { principalId: "codex-implementer:test-runtime", principalType: "agent", role: "Implementer" });
  assert.deepEqual((await service.getRecord(project.id, first.id)).updatedBy,
    { principalId: "codex-implementer:test-runtime", principalType: "agent", role: "Implementer" });
  assert.equal((await service.getRecord(project.id, first.id)).body.workState, "validation_pending");
  await assert.rejects(implementerService.beginWorkItemAttempt(project.id, workflow.id, second.id, second.recordVersion, "attempt:two"), /stale|unavailable|dependencies/);
  await assert.rejects(implementerService.finishWorkItemAttempt(project.id, workflow.id, first.id, firstAttempt.id,
    { summary: "Conflicting result", deviations: [], blockers: [], residualRisks: [], outcome: "failed" }), /unavailable|conflicts/);
  assert.equal((await service.getImplementationAttempts(project.id, first.id)).length, 1);
  assert.equal((await service.getImplementationAttempt(project.id, workflow.id, first.id)).body.attemptState, "completed");
  assert.equal((await store.listRelationships(project.id, "attempt_result")).filter(edge => edge.toEntityId === firstAttempt.id).length, 1);
  assert.equal((await implementerService.finishWorkItemAttempt(project.id, workflow.id, first.id, firstAttempt.id, {summary: "Implemented first", deviations: [], blockers: [], residualRisks: [], outcome: "implemented"})).id, implementation.id);
  assert.match((await recoveredService.getImplementationAttemptReport(project.id, firstAttempt.id)).markdown, /Implemented first/);
  const third = plan.directWorkItems.find(item => item.body.objective === "Third objective");
  const thirdAttempt = await service.prepareImplementationAttempt(project.id, workflow.id, third.id);
  await implementerService.beginWorkItemAttempt(project.id, workflow.id, third.id, third.recordVersion, thirdAttempt.id);
  await assert.rejects(service.prepareImplementationAttempt(project.id, workflow.id, third.id), /recovery\/inspection/);
  const partial = await implementerService.finishWorkItemAttempt(project.id, workflow.id, third.id, thirdAttempt.id,
    { summary: "Partial progress", deviations: [], blockers: [], residualRisks: ["Incomplete"], outcome: "partial" });
  assert.equal(partial.body.outcome, "partial");
  assert.equal((await service.getRecord(project.id, third.id)).body.workState, "ready");
  const readyThird = await service.getRecord(project.id, third.id);
  const retryAttempt = await service.prepareImplementationAttempt(project.id, workflow.id, third.id);
  assert.notEqual(retryAttempt.id, thirdAttempt.id);
  await implementerService.beginWorkItemAttempt(project.id, workflow.id, third.id, readyThird.recordVersion, retryAttempt.id);
  await implementerService.finishWorkItemAttempt(project.id, workflow.id, third.id, retryAttempt.id,
    { summary: "Retryable failure", deviations: [], blockers: [], residualRisks: [], outcome: "failed" });
  assert.equal((await service.getImplementationAttempts(project.id, third.id)).length, 2);
  assert.equal((await service.getRecord(project.id, third.id)).body.workState, "ready");
  await assert.rejects(implementerService.beginWorkItemAttempt(project.id, workflow.id, third.id,
    (await service.getRecord(project.id, third.id)).recordVersion, thirdAttempt.id), /already been used/);
});

test("typed WorkItem decomposition preserves exact ownership, criteria, dependencies, and rollback", async context => {
  const store = sqliteFixture(context);
  const service = createProjectStateService(store, operator);
  const project = await service.createRecord(null, "Project", { name: "Decomposition", description: "Synthetic" });
  const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: "Decompose", currentWorkspace: "feature-intake" });
  const criterion = statement => ({ statement, criticality: "required", verificationIntent: `Verify ${statement}`, validationPolicy: "deterministic" });
  const graph = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: workflow.id, topology: "direct",
    solution: { title: "Accepted solution", objective: "Deliver", scopeIn: ["scope"], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
    workItems: [
      { key: "base", kind: "feature", title: "Base", objective: "Base dependency", dependencyKeys: [], criteria: [] },
      { key: "source", kind: "feature", title: "Large", objective: "Large objective", dependencyKeys: ["base"], criteria: [criterion("First obligation"), criterion("Aggregate obligation"), criterion("Split obligation")] },
      { key: "downstream", kind: "feature", title: "Downstream", objective: "Consumes large item", dependencyKeys: ["source"], criteria: [] },
    ] });
  const source = graph.directWorkItems.find(item => item.body.objective === "Large objective");
  const base = graph.directWorkItems.find(item => item.body.objective === "Base dependency");
  const downstream = graph.directWorkItems.find(item => item.body.objective === "Consumes large item");
  const sourceCriteria = graph.criteria.filter(item => item.ownerId === source.id);
  const beforeCount = (await store.listEntities(project.id)).length;
  await assert.rejects(service.decomposeWorkItem(project.id, { workflowId: workflow.id, workItemId: source.id, expectedWorkItemVersion: source.recordVersion,
    replacements: [
      { key: "part-a", kind: "feature", title: "Part A", objective: "A", dependencyWorkItemIds: [base.id, workflow.id], dependencyReplacementKeys: [] },
      { key: "part-b", kind: "feature", title: "Part B", objective: "B", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
    ], criterionDispositions: [
      { criterionId: sourceCriteria[0].record.id, disposition: "transfer", replacementKey: "part-a" },
      { criterionId: sourceCriteria[1].record.id, disposition: "elevate", owner: "solution" },
      { criterionId: sourceCriteria[2].record.id, disposition: "split", replacements: [
        { owner: { kind: "replacement", key: "part-a" }, criterion: { ...criterion("Split obligation A"), criterionState: "active" } },
        { owner: { kind: "replacement", key: "part-b" }, criterion: { ...criterion("Split obligation B"), criterionState: "active" } },
      ] },
    ], incomingDependentMappings: [{ dependentWorkItemId: downstream.id, replacementKeys: ["part-a"] }] }), /unknown, foreign/);
  assert.equal((await store.listEntities(project.id)).length, beforeCount);
  assert.equal((await service.getRecord(project.id, source.id)).lifecycleState, "active");
  const beforeRelationships = (await store.listRelationships(project.id)).length;
  const failingService = createProjectStateService(failOnDecomposedLink(store), operator);
  await assert.rejects(failingService.decomposeWorkItem(project.id, { workflowId: workflow.id, workItemId: source.id, expectedWorkItemVersion: source.recordVersion,
    replacements: [
      { key: "part-a", kind: "feature", title: "Part A", objective: "A", dependencyWorkItemIds: [base.id], dependencyReplacementKeys: [] },
      { key: "part-b", kind: "feature", title: "Part B", objective: "B", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
    ], criterionDispositions: [
      { criterionId: sourceCriteria[0].record.id, disposition: "transfer", replacementKey: "part-a" },
      { criterionId: sourceCriteria[1].record.id, disposition: "elevate", owner: "solution" },
      { criterionId: sourceCriteria[2].record.id, disposition: "split", replacements: [
        { owner: { kind: "replacement", key: "part-a" }, criterion: { ...criterion("Split obligation A"), criterionState: "active" } },
        { owner: { kind: "replacement", key: "part-b" }, criterion: { ...criterion("Split obligation B"), criterionState: "active" } },
      ] },
    ], incomingDependentMappings: [{ dependentWorkItemId: downstream.id, replacementKeys: ["part-a", "part-b"] }] }), /injected decomposed_into write/);
  assert.equal((await store.listEntities(project.id)).length, beforeCount);
  assert.equal((await store.listRelationships(project.id)).length, beforeRelationships);
  assert.equal((await service.getRecord(project.id, source.id)).lifecycleState, "active");
  const result = await service.decomposeWorkItem(project.id, { workflowId: workflow.id, workItemId: source.id, expectedWorkItemVersion: source.recordVersion,
    replacements: [
      { key: "part-a", kind: "feature", title: "Part A", objective: "A", dependencyWorkItemIds: [base.id], dependencyReplacementKeys: [] },
      { key: "part-b", kind: "feature", title: "Part B", objective: "B", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
    ], criterionDispositions: [
      { criterionId: sourceCriteria[0].record.id, disposition: "transfer", replacementKey: "part-a" },
      { criterionId: sourceCriteria[1].record.id, disposition: "elevate", owner: "solution" },
      { criterionId: sourceCriteria[2].record.id, disposition: "split", replacements: [
        { owner: { kind: "replacement", key: "part-a" }, criterion: { ...criterion("Split obligation A"), criterionState: "active" } },
        { owner: { kind: "replacement", key: "part-b" }, criterion: { ...criterion("Split obligation B"), criterionState: "active" } },
      ] },
    ], incomingDependentMappings: [{ dependentWorkItemId: downstream.id, replacementKeys: ["part-a", "part-b"] }] });
  assert.equal(result.replacements.length, 2);
  assert.notEqual(result.replacements[0].lineageId, result.replacements[1].lineageId);
  const terminal = await service.getRecord(project.id, source.id);
  assert.equal(terminal.lifecycleState, "voided");
  assert.equal(terminal.body.workState, "cancelled");
  const currentPlan = await service.getWorkflowExecutionPlan(project.id, workflow.id);
  assert.equal(currentPlan.directWorkItems.some(item => item.id === source.id), false);
  assert.ok(result.replacements.every(item => currentPlan.directWorkItems.some(current => current.id === item.id)));
  const provenance = await store.listRelationships(project.id, "decomposed_into");
  assert.equal(provenance.filter(edge => edge.fromEntityId === source.id && !edge.endedAt).length, 2);
  const remappedDependencies = (await store.listRelationships(project.id, "depends_on")).filter(edge => !edge.endedAt);
  assert.ok(remappedDependencies.some(edge => edge.fromEntityId === result.replacements[0].id && edge.toEntityId === base.id));
  assert.ok(result.replacements.every(replacement => remappedDependencies.some(edge => edge.fromEntityId === downstream.id && edge.toEntityId === replacement.id)));
  assert.ok(result.replacements.every(replacement => currentPlan.criteria.some(item => item.ownerId === replacement.id)));
  assert.equal((await service.getRecord(project.id, sourceCriteria[2].record.id)).lifecycleState, "voided");
  const splitProof = await store.listRelationships(project.id, "derived_from");
  assert.equal(splitProof.filter(edge => edge.toEntityId === sourceCriteria[2].record.id && !edge.endedAt).length, 2);
  assert.ok(currentPlan.criteria.some(item => item.ownerId === graph.solutions[0].id && item.record.id === sourceCriteria[1].record.id));
  await assert.rejects(service.createRelationship(project.id, source.id, "decomposed_into", result.replacements[0].id), /typed decomposition/);
});

test("the same typed WorkItem decomposition command supports Issue Workflows", async context => {
  const store = sqliteFixture(context);
  const service = createProjectStateService(store, operator);
  const project = await service.createRecord(null, "Project", { name: "Issue decomposition", description: "Synthetic" });
  const workflow = await service.createWorkflow(project.id, { workflowType: "issue-resolution", title: "Issue", currentWorkspace: "issue-intake" });
  const graph = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: workflow.id, topology: "direct",
    solution: { title: "Accepted fix", objective: "Resolve", scopeIn: ["fix"], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
    workItems: [{ key: "source", kind: "fix", title: "Large fix", objective: "Large issue fix", dependencyKeys: [], criteria: [
      { statement: "Correct behavior", criticality: "required", verificationIntent: "Verify correction", validationPolicy: "deterministic" },
    ] }] });
  const source = graph.directWorkItems[0];
  const criterion = graph.criteria.find(item => item.ownerId === source.id).record;
  const result = await service.decomposeWorkItem(project.id, { workflowId: workflow.id, workItemId: source.id, expectedWorkItemVersion: source.recordVersion,
    replacements: [
      { key: "fix-a", kind: "fix", title: "Fix A", objective: "Correct A", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
      { key: "fix-b", kind: "fix", title: "Fix B", objective: "Correct B", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
    ], criterionDispositions: [{ criterionId: criterion.id, disposition: "transfer", replacementKey: "fix-a" }], incomingDependentMappings: [] });
  assert.equal(result.replacements.length, 2);
  assert.ok((await service.getWorkflowExecutionPlan(project.id, workflow.id)).directWorkItems.some(item => item.id === result.replacements[0].id));
});

test("WorkItem decomposition rejects implementation, validation, checkpoint, and Repair history", async context => {
  const store = sqliteFixture(context);
  const service = createProjectStateService(store, operator);
  const project = await service.createRecord(null, "Project", { name: "Decomposition history", description: "Synthetic" });
  for (const history of ["implementation", "validation", "checkpoint", "repair"]) {
    const workflow = await service.createWorkflow(project.id, { workflowType: "feature-capability", title: history, currentWorkspace: "feature-intake" });
    const accepted = await service.acceptWorkflowPlanningGraph(project.id, { workflowId: workflow.id, topology: "direct",
      solution: { title: `Solution ${history}`, objective: "Deliver", scopeIn: [], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      workItems: [{ key: "source", kind: "feature", title: "Source", objective: "Source", dependencyKeys: [], criteria: [] }] });
    const source = accepted.directWorkItems[0];
    if (history === "implementation") await service.recordImplementation(project.id, source.id, { summary: "Prior attempt", deviations: [], blockers: [], residualRisks: [], outcome: "partial" });
    if (history === "validation") await service.recordValidation(project.id, source.id, { validationType: "review", method: "inspection", outcome: "pass", summary: "Reviewed" });
    if (history === "checkpoint") {
      const baseline = await service.createWorkflowSourceBaseline(project.id, workflow.id, { repositoryId: "decomposition-repo", integrationTargetSourceLineId: "dev", baseRevisionId: "base" });
      const binding = await service.createWorkflowSourceBinding(project.id, workflow.id, baseline.id);
      await service.updateSourceBinding(project.id, binding.id, { preparationState: "preparing" }, binding.recordVersion);
      const preparing = await service.getRecord(project.id, binding.id);
      const ready = await service.updateSourceBinding(project.id, binding.id, { preparationState: "ready", workSourceLineId: `workflow/${workflow.id}`, currentRevisionId: "base", repositoryCheckoutId: `checkout-${workflow.id}` }, preparing.recordVersion);
      await service.createSourceCheckpoint(project.id, ready.id, workflow.id, source.id, { boundaryId: `decomposition-${workflow.id}`, expectedRevisionId: "base", checkpointKind: "disposition", checkpointState: "pending" });
    }
    if (history === "repair") {
      const repair = await service.createRecord(project.id, "WorkItem", { workItemKind: "repair", title: "Repair", objective: "Repair source", workState: "planned" });
      await store.transaction(project.id, async unit => {
        await unit.saveRelationship(createDomainRelationship({ projectId: project.id, fromEntityId: repair.id, relationshipType: "part_of", toEntityId: workflow.id, createdBy: operator },
          id => id === repair.id ? repair : id === workflow.id ? workflow : undefined));
        await unit.saveRelationship(createDomainRelationship({ projectId: project.id, fromEntityId: repair.id, relationshipType: "repairs", toEntityId: source.id, createdBy: operator },
          id => id === repair.id ? repair : id === source.id ? source : undefined));
      });
    }
    await assert.rejects(service.decomposeWorkItem(project.id, { workflowId: workflow.id, workItemId: source.id, expectedWorkItemVersion: source.recordVersion,
      replacements: [
        { key: "replacement-a", kind: "feature", title: "A", objective: "A", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
        { key: "replacement-b", kind: "feature", title: "B", objective: "B", dependencyWorkItemIds: [], dependencyReplacementKeys: [] },
      ], criterionDispositions: [], incomingDependentMappings: [] }), /history/);
  }
});

function failOnSecondRootCauseSave(store) {
  let rootCauseWrites = 0;
  return new Proxy(store, {
    get(target, property) {
      if (property === "transaction") return (projectId, action) => target.transaction(projectId, unit => action(new Proxy(unit, {
        get(unitTarget, unitProperty) {
          if (unitProperty === "saveEntity") return (entity, expectedVersion, policy) => {
            if (entity.entityType === "RootCause" && ++rootCauseWrites === 2) throw Error("injected RootCause write failure");
            return unitTarget.saveEntity(entity, expectedVersion, policy);
          };
          const value = Reflect.get(unitTarget, unitProperty, unitTarget);
          return typeof value === "function" ? value.bind(unitTarget) : value;
        },
      })));
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function failOnDecomposedLink(store) {
  return new Proxy(store, {
    get(target, property) {
      if (property === "transaction") return (projectId, action) => target.transaction(projectId, unit => action(new Proxy(unit, {
        get(unitTarget, unitProperty) {
          if (unitProperty === "saveRelationship") return relationship => {
            if (relationship.relationshipType === "decomposed_into") throw Error("injected decomposed_into write failure");
            return unitTarget.saveRelationship(relationship);
          };
          const value = Reflect.get(unitTarget, unitProperty, unitTarget);
          return typeof value === "function" ? value.bind(unitTarget) : value;
        },
      })));
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

const { resolvePlanTopology } = require("../../dist/shared/projectState/planReviewContracts.js");
const planCandidate = workflow => ({workflowId: workflow.id, workflowType: workflow.body.workflowType,
  solution: {title: "Candidate", objective: "Bounded outcome", scopeIn: ["outcome"], scopeOut: [], constraints: [], assumptions: [], risks: []},
  solutionCriteria: [], sources: [], workItems: [{key: "a", kind: "feature", title: "First", objective: "First outcome", dependencyKeys: [], criteria: []}, {key: "b", kind: "feature", title: "Second", objective: "Second outcome", dependencyKeys: ["a"], criteria: []}]});
function phasedCandidate(workflow) {
  const candidate = planCandidate(workflow);
  candidate.phases = [1, 2].map(sequence => ({key: `p${sequence}`, title: `Phase ${sequence}`, objective: "Independently accepted outcome", sequence, criteria: [{statement: "Accept outcome", criticality: "required", verificationIntent: "Inspect outcome", validationPolicy: "operator_decision"}]}));
  candidate.workItems.forEach((work, i) => work.phaseKey = `p${i + 1}`);
  candidate.phaseDependencies = [{phaseKey: "p2", dependencyKeys: ["p1"]}];
  candidate.boundaries = [{phaseKey: "p2", reason: "cutover_transition", rationale: "Cut over after preparation", evidenceRefs: ["architecture:cutover"]}];
  return candidate;
}
test("Plan topology derives direct and phased and fails closed on invalid semantic boundaries", () => {
  const workflow = {id: "workflow", body: {workflowType: "feature-capability"}};
  assert.equal(resolvePlanTopology(planCandidate(workflow)).topology, "direct");
  assert.equal(resolvePlanTopology(phasedCandidate(workflow)).topology, "phased");
  for (const [edit, pattern] of [
    [c => c.phases.pop(), /single Phase/],
    [c => delete c.workItems[1].phaseKey, /assigned exactly once/],
    [c => c.phaseDependencies.push({phaseKey: "p1", dependencyKeys: ["p2"]}), /cycle/],
    [c => {c.workItems[0].dependencyKeys = ["b"]; c.workItems[1].dependencyKeys = [];}, /contradicts Phase order/],
    [c => c.boundaries[0].reason = "file_count", /allowed reason/],
    [c => c.boundaries[0].evidenceRefs = [], /bounded rationale\/evidence/],
    [c => c.phases[0].criteria = [], /acceptance criteria/],
  ]) { const candidate = phasedCandidate(workflow); edit(candidate); assert.throws(() => resolvePlanTopology(candidate), pattern); }
});
for (const [name, factory] of [["memory", () => createInMemoryProjectStateStore()], ["SQLite", sqliteFixture]]) {
  test(`${name}: Plan review persists exact revision and atomically activates the same semantic graph`, async context => {
    const store = factory(context), service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", {name: "Plan", description: "Synthetic"});
    const workflow = await service.createWorkflow(project.id, {workflowType: "feature-capability", title: "Feature", currentWorkspace: "feature-planning"});
    const first = await service.savePlanCandidate(project.id, phasedCandidate(workflow));
    assert.equal((await service.getWorkflowExecutionPlan(project.id, workflow.id)).directWorkItems.length, 0);
    assert.equal((await service.getWorkflowExecutionPlan(project.id, workflow.id)).phases.length, 0);
    await service.recordPlanReview(project.id, first.id, {expectedRecordVersion: 1, outcome: "revision_requested", notes: "Refine scope"});
    const second = await service.savePlanCandidate(project.id, {...phasedCandidate(workflow), expectedRecordVersion: 1});
    assert.equal(second.recordVersion, 2);
    assert.equal((await service.getPlanReview(project.id, second.id)).disposition.state, "none");
    await assert.rejects(service.recordPlanReview(project.id, second.id, {expectedRecordVersion: 1, outcome: "approved"}), /stale/);
    await service.recordPlanReview(project.id, second.id, {expectedRecordVersion: 2, outcome: "approved"});
    const accepted = await service.getWorkflowExecutionPlan(project.id, workflow.id);
    assert.equal(accepted.solutions[0].id, second.body.layout.solutionId);
    assert.deepEqual(accepted.phases.map(phase => phase.phaseId), second.body.layout.phases.map(phase => phase.entityId));
    assert.equal(accepted.dependencyIds.length, 2);
    assert.ok(accepted.dependencyIds.some(edge => edge.from === second.body.layout.phases[1].entityId && edge.to === second.body.layout.phases[0].entityId));
    assert.equal((await service.getPlanReview(project.id, second.id)).disposition.state, "approved");
    await assert.rejects(service.savePlanCandidate(project.id, {...phasedCandidate(workflow), expectedRecordVersion: 2}), /approved Plan/);
  });
  test(`${name}: rejected and stale-source Plans do not materialize an execution graph`, async context => {
    const store = factory(context), service = createProjectStateService(store, operator);
    const project = await service.createRecord(null, "Project", {name: "Plan", description: "Synthetic"});
    const workflow = await service.createWorkflow(project.id, {workflowType: "feature-capability", title: "Feature", currentWorkspace: "feature-planning"});
    const cycle = await service.savePlanCandidate(project.id, planCandidate(workflow));
    await service.recordPlanReview(project.id, cycle.id, {expectedRecordVersion: 1, outcome: "rejected"});
    assert.equal((await service.getWorkflowExecutionPlan(project.id, workflow.id)).directWorkItems.length, 0);
    await service.reviseRecord(project.id, workflow.id, {title: "Changed"}, workflow.recordVersion);
    await assert.rejects(service.recordPlanReview(project.id, cycle.id, {expectedRecordVersion: 1, outcome: "approved"}), /source revision is stale/);
  });
}
