"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createWorkflowExecutionApplicationService } = require("../../dist/main/workflow/workflowExecutionApplicationService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { registerWorkflowApplicationIpc } = require("../../dist/main/workflow/workflowApplicationIpc.js");

const operator = { principalId: "test-operator", principalType: "human", role: "Operator" };
const db = root => path.join(root, ".champcity", "project-state.sqlite");

async function setup(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-execution-kernel-"));
  const registration = await registerCurrentProject(root, "existing", { projectName: "Execution Kernel Fixture" });
  const store = createSQLiteProjectStateStore(db(root));
  context.after(() => { store.close(); fs.rmSync(root, { recursive: true, force: true }); });
  return { root, projectId: registration.project.id, store, state: createProjectStateService(store, operator) };
}

function graph(workflowId, topology, kind, workItems, phases = []) {
  return { workflowId, topology,
    solution: { title: "Accepted", objective: "Deliver", scopeIn: ["in"], scopeOut: [], constraints: [], assumptions: [], risks: [] },
    solutionCriteria: [], phases, workItems };
}

test("Workflow execution completion projection blocks source-neutral Workflow with an open WorkItem", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Neutral completion", entryWorkspace: "feature-intake" });
  await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(created.workflow.id, "direct", "feature", [
    { key: "open-item", kind: "feature", title: "Open", objective: "Finish", dependencyKeys: [], criteria: [] },
  ]));
  const kernel = createWorkflowExecutionApplicationService();
  const projection = await kernel.getWorkflowExecutionCompletionProjection(env.root, created.workflow.id);
  assert.equal(projection.eligible, false);
  assert.ok(projection.blockers.some(blocker => blocker.startsWith("work-item-open:")));
  assert.equal(projection.sourceMode, "source-neutral");
  await assert.rejects(kernel.completeWorkflowExecution(env.root, created.workflow.id, projection.workflowVersion), /not eligible/);
  assert.equal((await env.store.getEntity(env.projectId, created.workflow.id)).body.workflowState, "active");
  assert.equal((await env.store.listEntities(env.projectId, "IntegrationRecord")).length, 0);
});

test("typed source-neutral Workflow completion closes only after exact WorkItem and Phase completion", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Neutral completion", entryWorkspace: "feature-intake" });
  const plan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(created.workflow.id, "phased", "feature", [
    { key: "close-item", kind: "feature", title: "Close", objective: "Complete", phaseKey: "close-phase", dependencyKeys: [], criteria: [] },
  ], [{ key: "close-phase", title: "Close", objective: "Complete", sequence: 1 }]));
  const kernel = createWorkflowExecutionApplicationService();
  const item = plan.workItemsByPhase[plan.phases[0].phaseId][0];
  const attempt = await kernel.beginWorkItemAttempt(env.root, created.workflow.id, item.id, item.recordVersion, "neutral-workflow-completion");
  const implementation = await kernel.finishWorkItemAttempt(env.root, created.workflow.id, item.id, attempt.executionRef,
    { summary: "Completed", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  await createProjectStateService(env.store, { principalId: "completion-tester", principalType: "agent", role: "Tester" }).createTesterResult(
    env.projectId, created.workflow.id, item.id, implementation.id,
    { sourceMode: "source-neutral", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["No source work required"], unknowns: [], rationale: "This WorkItem is source-neutral." });
  const latestItem = await env.state.getRecord(env.projectId, item.id);
  await kernel.completeWorkItem(env.root, created.workflow.id, item.id, latestItem.recordVersion);
  await kernel.completePhase(env.root, created.workflow.id, plan.phases[0].phaseId, plan.phases[0].record.recordVersion);
  const current = await kernel.getWorkflowExecutionCompletionProjection(env.root, created.workflow.id);
  assert.equal(current.eligible, true); assert.equal(current.sourceMode, "source-neutral");
  const closed = await kernel.completeWorkflowExecution(env.root, created.workflow.id, current.workflowVersion);
  assert.equal(closed.body.workflowState, "closed"); assert.equal(closed.body.currentWorkspace, "execution-complete");
  assert.equal((await env.store.listEntities(env.projectId, "IntegrationRecord")).length, 0);
});

test("Feature and Issue use the same exact-Workflow projection and isolate concurrent plans", async context => {
  const env = await setup(context);
  const feature = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Feature", entryWorkspace: "feature-intake" });
  const issue = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "issue-resolution", title: "Issue", entryWorkspace: "issue-intake" });
  const featurePlan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(feature.workflow.id, "direct", "feature", [
    { key: "feature-a", kind: "feature", title: "First", objective: "First", dependencyKeys: [], criteria: [{ statement: "Check", criticality: "required", verificationIntent: "test", validationPolicy: "deterministic" }] },
    { key: "feature-b", kind: "feature", title: "Second", objective: "Second", dependencyKeys: ["feature-a"], criteria: [] },
  ]));
  const issuePlan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(issue.workflow.id, "direct", "fix", [
    { key: "issue-fix", kind: "fix", title: "Fix", objective: "Correct", dependencyKeys: [], criteria: [] },
    { key: "issue-repair", kind: "repair", title: "Repair", objective: "Repair", dependencyKeys: [], criteria: [] },
    { key: "issue-blocked", kind: "fix", title: "Blocked", objective: "Wait", dependencyKeys: [], criteria: [] },
  ]));
  const issueParent = issuePlan.directWorkItems.find(item => item.body.title === "Fix");
  const issueRepair = issuePlan.directWorkItems.find(item => item.body.title === "Repair");
  const issueBlocked = issuePlan.directWorkItems.find(item => item.body.title === "Blocked");
  await env.state.reviseRecord(env.projectId, issueBlocked.id, { ...issueBlocked.body, workState: "blocked" }, issueBlocked.recordVersion);
  await env.state.createRelationship(env.projectId, issueRepair.id, "repairs", issueParent.id);
  const kernel = createWorkflowExecutionApplicationService();
  const a = await kernel.getExecutionProjection(env.root, feature.workflow.id);
  const b = await kernel.getExecutionProjection(env.root, issue.workflow.id);
  assert.equal(a.workflowId, feature.workflow.id);
  assert.equal(b.workflowId, issue.workflow.id);
  assert.deepEqual(Object.keys(a.items[0]).sort(), Object.keys(b.items[0]).sort());
  assert.deepEqual(a.nextEligibleWorkItemIds, [featurePlan.directWorkItems.find(item => item.body.title === "First").id]);
  const second = a.items.find(item => item.record.body.title === "Second");
  const expectedDependency = featurePlan.dependencyIds.find(edge => edge.from === second.record.id).to;
  assert.ok(second.eligibility.blockers.includes(`dependency:${expectedDependency}`));
  assert.deepEqual(b.nextEligibleWorkItemIds.sort(), [issueParent.id, issueRepair.id].sort());
  assert.equal(b.nextEligibleWorkItemIds.includes(issueBlocked.id), false);
  assert.deepEqual(b.items.find(item => item.record.id === issueRepair.id).repairIds, []);
  assert.equal("workIntakeId" in a, false);
  assert.equal(a.plan.workflow.id, feature.workflow.id);
  assert.equal(b.plan.workflow.id, issue.workflow.id);
  const featureFirst = featurePlan.directWorkItems.find(item => item.body.title === "First");
  const firstContract = await kernel.createWorkItemExecutionContract(env.root, feature.workflow.id, featureFirst.id,
    { sourceMutation: "not-required", affectedPaths: ["src/feature.ts"], proofIntent: ["Run focused feature proof"] });
  const issueContract = await kernel.createWorkItemExecutionContract(env.root, issue.workflow.id, issueParent.id,
    { sourceMutation: "not-required", affectedPaths: [], proofIntent: ["Run focused issue proof"] });
  assert.equal(firstContract.workflowId, feature.workflow.id);
  assert.equal(firstContract.workItemId, featureFirst.id);
  assert.equal(firstContract.workItemVersion, featureFirst.recordVersion);
  assert.equal(firstContract.criteria.length, 1);
  assert.equal(firstContract.solution.id, featurePlan.solutions[0].id);
  assert.equal(firstContract.sourceRevisionId, null);
  assert.equal(issueContract.workflowId, issue.workflow.id);
  assert.notEqual(firstContract.contractId, issueContract.contractId);
  assert.equal(firstContract.digest.length, 64);
  const attempt = await kernel.beginWorkItemAttempt(env.root, feature.workflow.id, featureFirst.id, featureFirst.recordVersion, "tester-contract-execution");
  await kernel.finishWorkItemAttempt(env.root, feature.workflow.id, featureFirst.id, attempt.executionRef,
    { summary: "Implementation complete", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const testerContract = await kernel.createTesterWorkItemExecutionContract(env.root, feature.workflow.id, featureFirst.id,
    { sourceMutation: "not-required", affectedPaths: ["src/feature.ts"], proofIntent: ["Assess permanent proof"] });
  assert.equal(testerContract.workItemId, featureFirst.id);
  assert.equal(testerContract.workItemVersion, (await env.state.getRecord(env.projectId, featureFirst.id)).recordVersion);
  await assert.rejects(kernel.createTesterWorkItemExecutionContract(env.root, feature.workflow.id,
    featurePlan.directWorkItems.find(item => item.body.title === "Second").id,
    { sourceMutation: "not-required", affectedPaths: [], proofIntent: ["No implementation exists yet"] }), /not eligible/);
  const laterImplementer = createProjectStateService(env.store, { principalId: "later-implementer", principalType: "agent", role: "Implementer" });
  await laterImplementer.recordImplementation(env.projectId, featureFirst.id,
    { summary: "Later attempt failed", deviations: [], blockers: ["execution stopped"], residualRisks: [], outcome: "failed", executionRef: "later-failed-attempt" });
  await assert.rejects(kernel.createTesterWorkItemExecutionContract(env.root, feature.workflow.id, featureFirst.id,
    { sourceMutation: "not-required", affectedPaths: [], proofIntent: ["Latest implementation attempt failed"] }), /latest successful implementation/);
  await assert.rejects(kernel.createWorkItemExecutionContract(env.root, feature.workflow.id, featureFirst.id,
    { sourceMutation: "not-required", affectedPaths: [], proofIntent: ["Implementer path remains closed"] }), /not eligible/);
  assert.equal((await env.state.getRecord(env.projectId, featureFirst.id)).body.workState, "validation_pending");
  await assert.rejects(kernel.createWorkItemExecutionContract(env.root, feature.workflow.id,
    featurePlan.directWorkItems.find(item => item.body.title === "Second").id,
    { sourceMutation: "not-required", affectedPaths: [], proofIntent: ["Must be ineligible"] }), /not eligible/);
});

test("phased readiness observes owning Phase and dependencies; source preparation remains lazy and bounded", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Phased", entryWorkspace: "feature-intake" });
  const accepted = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(created.workflow.id, "phased", "feature", [
    { key: "phase-a-work", kind: "feature", title: "Phase A", objective: "A", phaseKey: "phase-a", dependencyKeys: [], criteria: [] },
    { key: "phase-b-work", kind: "feature", title: "Phase B", objective: "B", phaseKey: "phase-b", dependencyKeys: ["phase-a-work"], criteria: [] },
  ], [
    { key: "phase-a", title: "Phase A", objective: "A", sequence: 1 },
    { key: "phase-b", title: "Phase B", objective: "B", sequence: 2 },
  ]));
  const baseline = await env.state.createWorkflowSourceBaseline(env.projectId, created.workflow.id,
    { repositoryId: "repo-kernel", integrationTargetSourceLineId: "dev", baseRevisionId: "base-revision" });
  const binding = await env.state.createWorkflowSourceBinding(env.projectId, created.workflow.id, baseline.id);
  let preparations = 0;
  const kernel = createWorkflowExecutionApplicationService({ materializeWorkflowSource: async (_root, projectId, workflowId) => {
    preparations++;
    const current = await env.store.getEntity(projectId, binding.id);
    if (current.body.preparationState === "ready") return { binding: current, checkout: { repositoryCheckoutId: `checkout-${workflowId}`, repositoryId: "repo-kernel", sourceLineId: `workflow/${workflowId}`,
      role: "workflow", projectRelativePath: `.champcity/checkouts/${workflowId}`, workflowId } };
    await env.state.updateSourceBinding(projectId, binding.id, { preparationState: "preparing" }, current.recordVersion);
    const preparing = await env.store.getEntity(projectId, binding.id);
    const ready = await env.state.updateSourceBinding(projectId, binding.id,
      { preparationState: "ready", workSourceLineId: `workflow/${workflowId}`, currentRevisionId: "base-revision", repositoryCheckoutId: `checkout-${workflowId}` }, preparing.recordVersion);
    return { binding: ready, checkout: { repositoryCheckoutId: `checkout-${workflowId}`, repositoryId: "repo-kernel", sourceLineId: `workflow/${workflowId}`,
      role: "workflow", projectRelativePath: `.champcity/checkouts/${workflowId}`, workflowId } };
  } });
  const before = await kernel.getExecutionProjection(env.root, created.workflow.id);
  assert.equal(before.source.state, "unprepared");
  assert.deepEqual(before.nextEligibleWorkItemIds, [accepted.workItemsByPhase[accepted.phases[0].phaseId][0].id]);
  const phaseB = accepted.workItemsByPhase[accepted.phases[1].phaseId][0];
  assert.ok(before.items.find(item => item.record.id === phaseB.id).eligibility.blockers.some(blocker => blocker.startsWith("prior-phase:")));
  assert.equal((await kernel.prepareExecution(env.root, created.workflow.id, { sourceMutating: false })).state, "unprepared");
  assert.equal(preparations, 0);
  const prepared = await kernel.prepareExecution(env.root, created.workflow.id, { sourceMutating: true });
  assert.equal(prepared.state, "ready");
  assert.equal(prepared.currentRevisionId, "base-revision");
  assert.equal(prepared.repositoryCheckoutId, `checkout-${created.workflow.id}`);
  assert.equal((await kernel.prepareExecution(env.root, created.workflow.id, { sourceMutating: true })).state, "ready");
  assert.equal(preparations, 2);
});

test("exact Phase completion eligibility ignores a peer Workflow Phase and its Criterion", async context => {
  const env = await setup(context);
  const first = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Phase owner A", entryWorkspace: "feature-intake" });
  const peer = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "issue-resolution", title: "Phase owner B", entryWorkspace: "issue-intake" });
  const firstPlan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(first.workflow.id, "phased", "feature", [
    { key: "work-a", kind: "feature", title: "A work", objective: "A work", phaseKey: "phase-a", dependencyKeys: [], criteria: [] },
  ], [
    { key: "phase-a", title: "A", objective: "A", sequence: 1, criteria: [] },
  ]));
  const peerPlan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(peer.workflow.id, "phased", "fix", [
    { key: "work-b", kind: "fix", title: "B work", objective: "B work", phaseKey: "phase-b", dependencyKeys: [], criteria: [] },
  ], [
    { key: "phase-b", title: "B", objective: "B", sequence: 1, criteria: [
      { statement: "Peer must pass", criticality: "required", verificationIntent: "Check peer proof", validationPolicy: "deterministic" },
    ] },
  ]));
  const firstPhase = firstPlan.phases[0];
  const peerPhase = peerPlan.phases[0];
  const firstEligibility = await env.state.getPhaseCompletionEligibility(env.projectId, firstPhase.phaseId);
  const peerEligibility = await env.state.getPhaseCompletionEligibility(env.projectId, peerPhase.phaseId);
  assert.ok(firstEligibility.blockers.some(blocker => blocker.startsWith("open-work-item:")));
  assert.equal(firstEligibility.blockers.some(blocker => blocker.startsWith("criterion:")), false);
  assert.ok(peerEligibility.blockers.some(blocker => blocker.startsWith("criterion:")));
});

test("Workflow validation and completion IPC accepts only exact bounded argument shapes", async () => {
  const handlers = new Map();
  registerWorkflowApplicationIpc({ handle: (channel, listener) => handlers.set(channel, listener) }, () => "<PROJECT_REPO>");
  const exactPairs = ["workflow:workItemValidation", "workflow:completeWorkItem", "workflow:completePhase", "workflow:createRepair", "workflow:validateDeterministicCriterion"];
  for (const channel of exactPairs) {
    await assert.rejects(handlers.get(channel)({}, "workflow-id"), /Exact/);
    await assert.rejects(handlers.get(channel)({}, "workflow-id", "work-item-id", "extra", "surplus"), /Exact/);
  }
  await assert.rejects(handlers.get("workflow:completeWorkItem")({}, "workflow-id", "work-item-id", 1.5), /Exact/);
  await assert.rejects(handlers.get("workflow:validateSemanticCriterion")({}, "workflow-id", "work-item-id", "criterion-id"), /Exact/);
  await assert.rejects(handlers.get("workflow:validateSemanticCriterion")({}, "workflow-id", "work-item-id", "criterion-id", { model: "m", reasoningEffort: "high", outcome: "pass" }), /Exact/);
});

test("typed Workflow WorkItem and Phase completion uses the application principal after exact Tester proof", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Exact close", entryWorkspace: "feature-intake" });
  const plan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(created.workflow.id, "phased", "feature", [
    { key: "close-work", kind: "feature", title: "Close work", objective: "Close exactly", phaseKey: "close-phase", dependencyKeys: [], criteria: [] },
  ], [{ key: "close-phase", title: "Close phase", objective: "Close phase", sequence: 1 }]));
  const workItem = plan.workItemsByPhase[plan.phases[0].phaseId][0];
  const kernel = createWorkflowExecutionApplicationService();
  const attempt = await kernel.beginWorkItemAttempt(env.root, created.workflow.id, workItem.id, workItem.recordVersion, "close-attempt");
  const implementation = await kernel.finishWorkItemAttempt(env.root, created.workflow.id, workItem.id, attempt.executionRef,
    { summary: "Implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  await createProjectStateService(env.store, { principalId: "tester-runtime", principalType: "agent", role: "Tester" }).createTesterResult(
    env.projectId, created.workflow.id, workItem.id, implementation.id,
    { sourceMode: "source-neutral", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["Focused source-neutral determination"], unknowns: [], rationale: "No permanent repository proof change is needed." });
  const currentWork = await env.state.getRecord(env.projectId, workItem.id);
  const closedWork = await kernel.completeWorkItem(env.root, created.workflow.id, workItem.id, currentWork.recordVersion);
  assert.equal(closedWork.body.workState, "closed");
  assert.deepEqual(closedWork.updatedBy, { principalId: "workflow-execution-application", principalType: "system", role: "System" });
  const phase = plan.phases[0].record;
  const closedPhase = await kernel.completePhase(env.root, created.workflow.id, phase.id, phase.recordVersion);
  assert.equal(closedPhase.body.phaseState, "closed");
  assert.deepEqual(closedPhase.updatedBy, { principalId: "workflow-execution-application", principalType: "system", role: "System" });
});

test("canonical Repair executes through the shared exact contract and requeues its parent when closed", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Repair loop", entryWorkspace: "feature-intake" });
  const plan = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(created.workflow.id, "direct", "feature", [
    { key: "parent", kind: "feature", title: "Parent", objective: "Repair defect", dependencyKeys: [],
      criteria: [{ statement: "Preserve every row", criticality: "required", verificationIntent: "Run export proof", validationPolicy: "deterministic" }] },
  ]));
  const parent = plan.directWorkItems[0];
  const parentCriterion = plan.criteria.find(entry => entry.ownerId === parent.id).record;
  const kernel = createWorkflowExecutionApplicationService();
  const parentAttempt = await kernel.beginWorkItemAttempt(env.root, created.workflow.id, parent.id, parent.recordVersion, "parent-first");
  const parentImplementation = await kernel.finishWorkItemAttempt(env.root, created.workflow.id, parent.id, parentAttempt.executionRef,
    { summary: "Initial implementation", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const parentTester = await createProjectStateService(env.store, { principalId: "parent-tester", principalType: "agent", role: "Tester" }).createTesterResult(
    env.projectId, created.workflow.id, parent.id, parentImplementation.id,
    { sourceMode: "source-neutral", recommendation: "production-defect-suspected", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["A required row is missing"], unknowns: [], rationale: "The completed product behavior has a production defect." });
  const defectBlockers = await env.state.getWorkItemCompletionEligibility(env.projectId, parent.id);
  assert.ok(defectBlockers.blockers.includes("tester-production-defect-requires-repair"));
  const createdRepair = await kernel.validateDeterministicWorkItemCriterion(env.root, created.workflow.id, parent.id, parentCriterion.id);
  assert.ok((await env.store.listRelationships(env.projectId, "derived_from")).some(edge =>
    edge.fromEntityId === createdRepair.repair.criterion.id && edge.toEntityId === parentTester.id));
  const repair = createdRepair.repair.repair;
  const repairPlan = await env.state.getWorkflowExecutionPlan(env.projectId, created.workflow.id);
  assert.ok(repairPlan.directWorkItems.some(item => item.id === repair.id));
  const contract = await kernel.createWorkItemExecutionContract(env.root, created.workflow.id, repair.id,
    { sourceMutation: "not-required", affectedPaths: [], proofIntent: ["Verify the Repair objective"] });
  assert.equal(contract.workItemId, repair.id);
  assert.equal(contract.workflowId, created.workflow.id);
  assert.equal(contract.criteria.length, 1);
  const attempt = await kernel.beginWorkItemAttempt(env.root, created.workflow.id, repair.id, contract.workItemVersion, "repair-attempt");
  const implementation = await kernel.finishWorkItemAttempt(env.root, created.workflow.id, repair.id, attempt.executionRef,
    { summary: "Corrected the missing row", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  await createProjectStateService(env.store, { principalId: "repair-tester", principalType: "agent", role: "Tester" }).createTesterResult(
    env.projectId, created.workflow.id, repair.id, implementation.id,
    { sourceMode: "source-neutral", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["Repair proof reviewed"], unknowns: [], rationale: "No permanent repository proof change is needed." });
  const repairCriterion = contract.criteria[0];
  await createProjectStateService(env.store, { principalId: "repair-validator", principalType: "agent", role: "Validator" }).recordValidation(
    env.projectId, repairCriterion.id, { validationType: "work-item-criterion", method: "focused-source-neutral-proof", validationMode: "deterministic",
      outcome: "pass", summary: "The Repair proof satisfies its exact Criterion.", targetRecordVersion: repairCriterion.recordVersion,
      implementationRecordId: implementation.id });
  const currentRepair = await env.state.getRecord(env.projectId, repair.id);
  const closed = await kernel.completeWorkItem(env.root, created.workflow.id, repair.id, currentRepair.recordVersion);
  assert.equal(closed.body.workState, "closed");
  assert.equal((await env.state.getRecord(env.projectId, parent.id)).body.workState, "ready");
});

test("source-neutral semantic Validator persists exact evidence without Git identity", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "issue-resolution", title: "Neutral validation", entryWorkspace: "issue-intake" });
  const neutralGraph = graph(created.workflow.id, "direct", "fix", [
    { key: "neutral", kind: "fix", title: "Neutral work", objective: "Clarify the result", dependencyKeys: [],
      criteria: [{ statement: "The result explains the decision", criticality: "required", verificationIntent: "Review the decision explanation", validationPolicy: "semantic_ai" }] },
  ]);
  neutralGraph.solutionCriteria = [{ statement: "The solution rationale is clear", criticality: "required",
    verificationIntent: "Review the accepted rationale", validationPolicy: "semantic_ai" }];
  const plan = await env.state.acceptWorkflowPlanningGraph(env.projectId, neutralGraph);
  const workItem = plan.directWorkItems[0];
  const criterion = plan.criteria.find(entry => entry.ownerId === workItem.id).record;
  const solution = plan.solutions[0];
  const solutionCriterion = plan.criteria.find(entry => entry.ownerId === solution.id).record;
  const initialAttempt = await createWorkflowExecutionApplicationService().beginWorkItemAttempt(env.root, created.workflow.id, workItem.id, workItem.recordVersion, "neutral-semantic-attempt");
  const implementation = await createWorkflowExecutionApplicationService().finishWorkItemAttempt(env.root, created.workflow.id, workItem.id, initialAttempt.executionRef,
    { summary: "Explained the decision", deviations: [], blockers: [], residualRisks: [], outcome: "implemented" });
  const tester = await createProjectStateService(env.store, { principalId: "neutral-tester", principalType: "agent", role: "Tester" }).createTesterResult(
    env.projectId, created.workflow.id, workItem.id, implementation.id,
    { sourceMode: "source-neutral", recommendation: "reuse-existing-proof", affectedCapabilityIds: [], permanentTestPaths: [],
      determinationEvidence: ["Source-neutral explanation inspected"], unknowns: [], rationale: "No repository source or permanent tests are involved." });
  let validatorOptions;
  const adapterFactory = async () => ({
    startThread(options) {
      validatorOptions = options;
      return { async runStreamed() { return { events: (async function* () { yield { type: "item.completed", item: { type: "agent_message", text: '{"outcome":"pass","summary":"The exact explanation satisfies the Criterion."}' } }; })() }; },
        async dispose() {} };
    }, async dispose() {},
  });
  const kernel = createWorkflowExecutionApplicationService({ createValidatorAdapter: adapterFactory });
  const result = await kernel.validateSemanticWorkItemCriterion(env.root, created.workflow.id, workItem.id, criterion.id,
    { model: "test-model", reasoningEffort: "low" });
  assert.equal(result.validation.body.validationMode, "semantic_ai");
  assert.equal(result.validation.body.sourceBaselineRef, undefined);
  assert.equal(result.validation.body.implementationRecordId, implementation.id);
  assert.equal(result.validation.body.performedBy.role, "Validator");
  assert.notEqual(result.validation.body.performedBy.principalId, implementation.createdBy.principalId);
  assert.notEqual(result.validation.body.performedBy.principalId, tester.createdBy.principalId);
  assert.equal(validatorOptions.readOnly, true);
  assert.equal(validatorOptions.networkAccessEnabled, false);
  assert.deepEqual(validatorOptions.writableRoots, []);
  const solutionResult = await kernel.validateSemanticWorkItemCriterion(env.root, created.workflow.id, workItem.id, solutionCriterion.id,
    { model: "test-model", reasoningEffort: "low" });
  assert.equal(solutionResult.validation.body.validationMode, "semantic_ai");
  const projection = await kernel.getWorkItemValidationProjection(env.root, created.workflow.id, workItem.id);
  assert.equal(projection.sourceMode, "source-neutral");
  assert.equal(projection.criteria.find(entry => entry.criterion.id === criterion.id).outcome, "pass");
  assert.equal(projection.criteria.find(entry => entry.criterion.id === solutionCriterion.id).outcome, "pass");
  assert.deepEqual(new Set(projection.criteria.map(entry => entry.ownerId)), new Set([workItem.id, solution.id]));
  assert.equal(projection.completion.eligible, true);
});

test("non-source workflows remain source-neutral and reject source mutation without Git fabrication", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "issue-resolution", title: "No source", entryWorkspace: "issue-intake" });
  const kernel = createWorkflowExecutionApplicationService({ materializeWorkflowSource: async () => { throw Error("must not prepare a non-source workflow"); } });
  assert.deepEqual(await kernel.prepareExecution(env.root, created.workflow.id, { sourceMutating: false }), { state: "non-source", currentRevisionId: null });
  assert.deepEqual(await kernel.prepareExecution(env.root, created.workflow.id, { sourceMutating: true }),
    { state: "blocked", currentRevisionId: null, failureCode: "SOURCE_CAPABILITY_UNAVAILABLE" });
  assert.equal((await env.store.listEntities(env.projectId, "SourceBinding")).length, 0);
  assert.equal(fs.existsSync(path.join(env.root, ".champcity", "checkouts")), false);
});

test("exact validation projection keeps source-neutral Workflow identity and exposes completion blockers", async context => {
  const env = await setup(context);
  const created = await env.state.createSubstantiveWorkflow(env.projectId, { workflowType: "feature-capability", title: "Validation projection", entryWorkspace: "feature-intake" });
  const accepted = await env.state.acceptWorkflowPlanningGraph(env.projectId, graph(created.workflow.id, "direct", "feature", [
    { key: "validation-work", kind: "feature", title: "Validation work", objective: "Implement and validate", dependencyKeys: [],
      criteria: [{ statement: "Required proof passes", criticality: "required", verificationIntent: "focused test", validationPolicy: "deterministic" }] },
  ]));
  const work = accepted.directWorkItems[0];
  const kernel = createWorkflowExecutionApplicationService();
  const projection = await kernel.getWorkItemValidationProjection(env.root, created.workflow.id, work.id);
  assert.equal(projection.workflowId, created.workflow.id);
  assert.equal(projection.workItemId, work.id);
  assert.equal(projection.sourceMode, "source-neutral");
  assert.equal(projection.sourceRevisionId, null);
  assert.equal(projection.criteria.length, 1);
  assert.equal(projection.criteria[0].policy, "deterministic");
  assert.equal(projection.criteria[0].outcome, "pending");
  assert.equal(projection.criteria[0].humanEvidenceRequired, false);
  await assert.rejects(kernel.getWorkItemValidationProjection(env.root, created.workflow.id, "foreign-work-item"), /not part/);
  await assert.rejects(kernel.completeWorkItem(env.root, created.workflow.id, work.id, work.recordVersion), /completion is blocked/);
});
