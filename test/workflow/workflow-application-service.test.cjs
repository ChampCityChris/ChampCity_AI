"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createWorkflowApplicationService } = require("../../dist/main/workflow/workflowApplicationService.js");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { bootstrapProjectSource } = require("../../dist/main/sourceControl/projectSourceBootstrap.js");

const operator = { principalId: "test-operator", principalType: "human", role: "Operator" };
const database = root => path.join(root, ".champcity", "project-state.sqlite");
const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

async function setup(context, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-workflow-app-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const registration = await registerCurrentProject(root, "existing", {
    projectName: "Workflow Application Fixture",
    ...(options.sourceRepositoryId ? { sourceRepositoryId: options.sourceRepositoryId } : {}),
  });
  const store = createSQLiteProjectStateStore(database(root));
  return { root, projectId: registration.project.id, store, state: createProjectStateService(store, operator) };
}

function groups(inventory) { return new Map(inventory.groups.map(group => [group.workflowType, group.workflows])); }

test("direct Workflow creation preserves exact identity, concurrent instances, provenance, and current history", async context => {
  const env = await setup(context);
  const application = createWorkflowApplicationService();
  try {
    const featureA = await application.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Same title" });
    const featureB = await application.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Same title" });
    const issue = await application.startDirectWorkflow(env.root, { workflowType: "issue-resolution", title: "Issue" });
    const migration = await application.startDirectWorkflow(env.root, { workflowType: "refactor-migration", title: "Migration" });
    assert.notEqual(featureA.workflow.workflowId, featureB.workflow.workflowId);
    assert.equal(featureA.workflow.currentWorkspace, "feature-intake");
    await assert.rejects(application.startDirectWorkflow(env.root, { workflowType: "project-creation", title: "No" }), /not available for direct start/);
    await assert.rejects(application.startDirectWorkflow(env.root, { workflowType: "work-intake-routing", title: "No" }), /not available for direct start/);
    await assert.rejects(application.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "  " }), /title must contain/);

    const intake = await env.state.createWorkIntake(env.projectId, { request: "Route this", desiredOutcome: "Choose a workflow",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const routedTarget = (await application.startDirectWorkflow(env.root, { workflowType: "research-prototype", title: "Routed target" })).workflow;
    await env.state.linkWorkflowRouteTarget(env.projectId, intake.workflow.id, routedTarget.workflowId);
    const closed = await env.state.createWorkflow(env.projectId, { workflowType: "issue-resolution", title: "Closed history",
      currentWorkspace: "issue-intake", workflowState: "closed" });
    const retired = await env.state.createWorkflow(env.projectId, { workflowType: "feature-capability", title: "Retired" , currentWorkspace: "feature-intake" });
    await env.state.supersedeRecord(env.projectId, retired.id, { ...retired.body, title: "Replacement" }, retired.recordVersion);

    const inventory = groups(await application.listCurrentProjectWorkflows(env.root));
    assert.equal(inventory.get("feature-capability").filter(item => item.title === "Same title").length, 2);
    assert.equal(new Set(inventory.get("feature-capability").filter(item => item.title === "Same title").map(item => item.workflowId)).size, 2);
    assert.ok(inventory.get("issue-resolution").some(item => item.workflowId === issue.workflow.workflowId));
    assert.ok(inventory.get("refactor-migration").some(item => item.workflowId === migration.workflow.workflowId));
    assert.ok(inventory.get("issue-resolution").some(item => item.workflowId === closed.id && item.workflowState === "closed"));
    assert.ok(!inventory.get("feature-capability").some(item => item.workflowId === retired.id));

    const wir = inventory.get("work-intake-routing").find(item => item.workflowId === intake.workflow.id);
    assert.equal(wir.workIntakeId, intake.intake.id);
    assert.equal(wir.routedTargetWorkflowId, routedTarget.workflowId);
    const routed = inventory.get("research-prototype").find(item => item.workflowId === routedTarget.workflowId);
    assert.equal(routed.routedSourceWorkflowId, intake.workflow.id);
    assert.equal(routed.workIntakeId, intake.intake.id);
    const direct = inventory.get("feature-capability").find(item => item.workflowId === featureA.workflow.workflowId);
    assert.deepEqual(Object.keys(routed).filter(key => !["workIntakeId", "routedSourceWorkflowId", "routedTargetWorkflowId"].includes(key)).sort(),
      Object.keys(direct).filter(key => !["workIntakeId", "routedSourceWorkflowId", "routedTargetWorkflowId"].includes(key)).sort());
    assert.deepEqual((await application.getCurrentProjectWorkflow(env.root, featureB.workflow.workflowId)).workflow, inventory.get("feature-capability").find(item => item.workflowId === featureB.workflow.workflowId));
    await assert.rejects(application.getCurrentProjectWorkflow(env.root, retired.id), /unavailable/);
    await env.state.createWorkflow(env.projectId, { workflowType: "work-intake-routing", title: "Invalid orphan WIR", currentWorkspace: "work-intake" });
    await assert.rejects(application.listCurrentProjectWorkflows(env.root), /invalid Work Intake provenance/);
  } finally { env.store.close(); }
});

test("source-backed direct start records the exact managed Dev commit and leaves source materialization lazy", async context => {
  const env = await setup(context, { sourceRepositoryId: "workflow-app-repository" });
  try {
    const source = await bootstrapProjectSource(env.root, "workflow-app-repository");
    const dev = path.join(env.root, "Dev");
    fs.writeFileSync(path.join(dev, "uncommitted.txt"), "not part of the baseline\n");
    const application = createWorkflowApplicationService();
    const result = await application.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Source backed" });
    const baselines = (await env.store.listEntities(env.projectId, "SourceBaseline")).filter(record => record.entityType === "SourceBaseline");
    const bindings = (await env.store.listEntities(env.projectId, "SourceBinding")).filter(record => record.entityType === "SourceBinding");
    assert.equal(baselines.length, 1);
    assert.equal(baselines[0].body.workflowId, result.workflow.workflowId);
    assert.equal(baselines[0].body.repositoryId, "workflow-app-repository");
    assert.equal(baselines[0].body.integrationTargetSourceLineId, "dev");
    assert.equal(baselines[0].body.baseRevisionId, source.integrationTarget.headRevisionId);
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0].body.preparationState, "unprepared");
    assert.equal(bindings[0].body.workSourceLineId, undefined);
    assert.equal(path.resolve(git(dev, "rev-parse", "--show-toplevel")), path.resolve(dev));
    assert.equal(git(dev, "branch", "--show-current"), "dev");
    assert.equal(git(dev, "rev-parse", "HEAD"), source.integrationTarget.headRevisionId);
    assert.equal(fs.existsSync(path.join(env.root, ".champcity", "checkouts")), false);
    assert.equal(fs.existsSync(path.join(dev, "uncommitted.txt")), true);
  } finally { env.store.close(); }
});

test("failed Dev inspection and non-source Projects never create partial source state", async context => {
  const source = await setup(context, { sourceRepositoryId: "missing-dev-repository" });
  const application = createWorkflowApplicationService({ readDevRevision: async () => { throw Error("invalid Dev"); } });
  try {
    await assert.rejects(application.startDirectWorkflow(source.root, { workflowType: "feature-capability", title: "Must fail" }), /invalid Dev/);
    assert.equal((await source.store.listEntities(source.projectId, "Workflow")).filter(record => record.entityType === "Workflow").length, 0);
    assert.equal((await source.store.listEntities(source.projectId, "SourceBaseline")).length, 0);
  } finally { source.store.close(); }

  const plain = await setup(context);
  try {
    await assert.rejects(plain.state.createSubstantiveWorkflow(plain.projectId, { workflowType: "feature-capability",
      title: "Atomic rejection", entryWorkspace: "feature-intake",
      sourceSeed: { repositoryId: "repo", integrationTargetSourceLineId: "dev", baseRevisionId: "revision", unexpected: true } }), /Unsupported semantic input field/);
    assert.equal((await plain.store.listEntities(plain.projectId, "Workflow")).length, 0);
    const result = await createWorkflowApplicationService().startDirectWorkflow(plain.root,
      { workflowType: "feature-capability", title: "No source" });
    assert.equal(result.workflow.workflowType, "feature-capability");
    assert.equal((await plain.store.listEntities(plain.projectId, "SourceBaseline")).length, 0);
    assert.equal((await plain.store.listEntities(plain.projectId, "SourceBinding")).length, 0);
  } finally { plain.store.close(); }
});
