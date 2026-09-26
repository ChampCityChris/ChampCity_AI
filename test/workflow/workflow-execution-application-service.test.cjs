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
    await env.state.updateSourceBinding(projectId, binding.id, { preparationState: "preparing" }, current.recordVersion);
    const preparing = await env.store.getEntity(projectId, binding.id);
    const ready = await env.state.updateSourceBinding(projectId, binding.id,
      { preparationState: "ready", workSourceLineId: `workflow/${workflowId}`, currentRevisionId: "base-revision", repositoryCheckoutId: `checkout-${workflowId}` }, preparing.recordVersion);
    return { binding: ready };
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
  assert.equal(preparations, 1);
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
