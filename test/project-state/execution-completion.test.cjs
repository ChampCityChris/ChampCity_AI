const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createInMemoryProjectStateStore } = require("../../dist/shared/projectState/inMemoryProjectStateStore.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { WORKFLOW_TYPE_REGISTRY } = require("../../dist/shared/projectState/workflowTypeRegistry.js");

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
