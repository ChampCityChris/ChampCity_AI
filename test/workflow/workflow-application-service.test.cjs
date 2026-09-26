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
const { createStructuredWorkRoutingService } = require("../../dist/main/workflow/structuredWorkRoutingService.js");

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
    const planningContext = await application.getWorkflowPlanningContext(env.root, featureA.workflow.workflowId);
    assert.equal(planningContext.workflow.workflowId, featureA.workflow.workflowId);
    assert.equal(planningContext.provenance, "direct");
    assert.equal(planningContext.source, null);
    const acceptedPlan = await application.acceptReviewedWorkflowPlanningGraph(env.root, { workflowId: featureA.workflow.workflowId, topology: "direct",
      solution: { title: "Feature plan", objective: "Implement", scopeIn: ["feature"], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      workItems: [{ key: "candidate-1", kind: "feature", title: "Implement feature", objective: "Deliver the feature", dependencyKeys: [], criteria: [] }] });
    assert.equal(acceptedPlan.workflow.body.currentWorkspace, "work-item-map");
    assert.equal(acceptedPlan.directWorkItems.length, 1);
    assert.equal(acceptedPlan.solutions.length, 1);
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
    const sourceContext = await application.getWorkflowPlanningContext(env.root, result.workflow.workflowId);
    assert.equal(sourceContext.source.baseline.id, baselines[0].id);
    assert.equal(sourceContext.source.binding.id, bindings[0].id);
    const sourcePlan = await application.acceptReviewedWorkflowPlanningGraph(env.root, { workflowId: result.workflow.workflowId, topology: "direct",
      solution: { title: "Source plan", objective: "Plan without materializing", scopeIn: ["change"], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [],
      workItems: [{ key: "candidate-1", kind: "feature", title: "Change", objective: "Implement", dependencyKeys: [], criteria: [] }] });
    assert.equal(sourcePlan.workflow.body.currentWorkspace, "work-item-map");
    assert.equal((await env.store.listEntities(env.projectId, "SourceBinding")).find(record => record.entityType === "SourceBinding").body.preparationState, "unprepared");
    assert.equal((await env.store.listEntities(env.projectId, "SourceCheckpoint")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "IntegrationRecord")).length, 0);
    assert.equal(path.resolve(git(dev, "rev-parse", "--show-toplevel")), path.resolve(dev));
    assert.equal(git(dev, "branch", "--show-current"), "dev");
    assert.equal(git(dev, "rev-parse", "HEAD"), source.integrationTarget.headRevisionId);
    assert.equal(fs.existsSync(path.join(env.root, ".champcity", "checkouts")), false);
    assert.equal(fs.existsSync(path.join(dev, "uncommitted.txt")), true);
  } finally { env.store.close(); }
});

test("Project Creation is created once for the exact Project with registry workspace and optional lazy source binding", async context => {
  const plain = await setup(context);
  try {
    const application = createWorkflowApplicationService();
    const first = await application.ensureProjectCreationWorkflow(plain.root);
    const reopened = await application.ensureProjectCreationWorkflow(plain.root);
    assert.equal(first.workflow.workflowId, reopened.workflow.workflowId);
    assert.equal(first.workflow.title, "Workflow Application Fixture");
    assert.equal(first.workflow.workflowType, "project-creation");
    assert.equal(first.workflow.currentWorkspace, "project-intake");
    assert.equal((await plain.store.listEntities(plain.projectId, "Workflow")).length, 1);
    assert.equal((await plain.store.listEntities(plain.projectId, "SourceBaseline")).length, 0);
  } finally { plain.store.close(); }

  const source = await setup(context, { sourceRepositoryId: "project-creation-repository" });
  try {
    const bootstrapped = await bootstrapProjectSource(source.root, "project-creation-repository");
    const created = await createWorkflowApplicationService().ensureProjectCreationWorkflow(source.root);
    const baseline = (await source.store.listEntities(source.projectId, "SourceBaseline"))[0];
    const binding = (await source.store.listEntities(source.projectId, "SourceBinding"))[0];
    assert.equal(baseline.body.workflowId, created.workflow.workflowId);
    assert.equal(baseline.body.repositoryId, "project-creation-repository");
    assert.equal(baseline.body.integrationTargetSourceLineId, "dev");
    assert.equal(baseline.body.baseRevisionId, bootstrapped.integrationTarget.headRevisionId);
    assert.equal(binding.body.workflowId, created.workflow.workflowId);
    assert.equal(binding.body.preparationState, "unprepared");
    assert.equal(binding.body.workSourceLineId, undefined);
    assert.equal(fs.existsSync(path.join(source.root, ".champcity", "checkouts")), false);
  } finally { source.store.close(); }
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

test("structured WIR promotes one Architect assessment and atomically opens an exact non-source target", async context => {
  const env = await setup(context);
  try {
    const captured = await env.state.createWorkIntake(env.projectId, { request: "Investigate a new capability", desiredOutcome: "Working feature",
      constraints: ["Keep the change bounded"], evidenceContext: ["Current Project"], requestedIntegrationTarget: "dev" });
    const routing = createStructuredWorkRoutingService({ readDevRevision: async () => { throw Error("No managed source"); } });
    const prepared = await routing.prepare(env.root, captured.intake.id, captured.workflow.id);
    assert.match(prepared.preparedInstruction, /six|exact set/i);
    assert.match(prepared.preparedInstruction, /Project State remains authoritative/);
    assert.match(fs.readFileSync(path.join(env.root, "planning/Generated/Work_Intake_Routing", `${captured.intake.id}.md`), "utf8"), /non-authoritative/);
    const slot = prepared.preparedSubmission.expectedDraftSlots[0];
    const draftPath = path.join(env.root, slot.draftRelativePath);
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.writeFileSync(draftPath, "# Work Intake Routing Assessment\n\n## Recommended Route\nfeature-change\n\n## Traits\n- existing-source\n\n## Rationale\nA bounded capability change matches the request.\n\n## Alternate Route\nNone\n", "utf8");
    const promoted = await routing.get(env.root, captured.intake.id, captured.workflow.id);
    assert.ok(promoted.assessment, promoted.error ?? `submission state: ${promoted.preparedSubmission?.state}`);
    assert.equal(promoted.assessment.recommendation, "feature-change");
    assert.equal(promoted.assessment.stale, false, promoted.error);
    assert.equal((await env.state.getWorkRouteHistory(env.projectId, captured.intake.id)).assessments.length, 1);
    assert.equal((await routing.get(env.root, captured.intake.id, captured.workflow.id)).assessment.assessmentId, promoted.assessment.assessmentId);
    assert.equal((await createStructuredWorkRoutingService().get(env.root, captured.intake.id, captured.workflow.id)).assessment.assessmentId, promoted.assessment.assessmentId);
    const revision = await routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: promoted.assessment.assessmentId,
      disposition: "request-revision", rationale: "Explain why the integration option is less suitable." });
    assert.equal(revision.reviewState, "revision-requested");
    assert.equal(revision.targetWorkflowId, null);
    assert.equal(revision.closed, false);
    await assert.rejects(routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: promoted.assessment.assessmentId,
      disposition: "accept", rationale: "Premature route selection." }), /Prepare and review the requested revised assessment/);
    const revised = await routing.prepare(env.root, captured.intake.id, captured.workflow.id);
    assert.match(revised.preparedInstruction, /Explain why the integration option is less suitable/);
    const revisedPath = path.join(env.root, revised.preparedSubmission.expectedDraftSlots[0].draftRelativePath);
    fs.mkdirSync(path.dirname(revisedPath), { recursive: true });
    fs.writeFileSync(revisedPath, "# Work Intake Routing Assessment\n\n## Recommended Route\nfeature-change\n\n## Traits\n- existing-source\n\n## Rationale\nThe existing capability route remains appropriate after review.\n\n## Alternate Route\nNone\n", "utf8");
    const revisedAssessment = await routing.get(env.root, captured.intake.id, captured.workflow.id);
    assert.equal(revisedAssessment.reviewState, "none");
    const completed = await routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: revisedAssessment.assessment.assessmentId,
      disposition: "accept", rationale: "Proceed with the recommendation." });
    assert.equal(completed.selectedRoute, "feature-change");
    assert.ok(completed.targetWorkflowId);
    assert.equal(completed.closed, true);
    const target = await env.state.getRecord(env.projectId, completed.targetWorkflowId);
    assert.equal(target.body.workflowType, "feature-capability");
    assert.equal((await env.store.listEntities(env.projectId, "SourceBaseline")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "SourceBinding")).length, 0);
    const routesTo = (await env.store.listRelationships(env.projectId, "routes_to")).filter(edge => edge.fromEntityId === captured.workflow.id);
    assert.equal(routesTo.length, 1);
    assert.equal(routesTo[0].toEntityId, completed.targetWorkflowId);
    const edited = await env.state.createWorkIntake(env.projectId, { request: "Another request", desiredOutcome: "Another result",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const pending = await routing.prepare(env.root, edited.intake.id, edited.workflow.id);
    const pendingPath = path.join(env.root, pending.preparedSubmission.expectedDraftSlots[0].draftRelativePath);
    fs.mkdirSync(path.dirname(pendingPath), { recursive: true });
    fs.writeFileSync(pendingPath, "# Work Intake Routing Assessment\n\n## Recommended Route\nfeature-change\n\n## Traits\nNone\n\n## Rationale\nA bounded change.\n\n## Alternate Route\nNone\n", "utf8");
    await env.state.reviseWorkIntake(env.projectId, edited.intake.id, { desiredOutcome: "Changed result" }, edited.intake.recordVersion);
    const staleIntake = await routing.get(env.root, edited.intake.id, edited.workflow.id);
    assert.equal(staleIntake.assessment, null);
    assert.equal(staleIntake.preparedSubmission.state, "superseded");
    assert.equal((await env.state.getWorkRouteHistory(env.projectId, edited.intake.id)).assessments.length, 0);
  } finally { env.store.close(); }
});

test("structured source-backed WIR captures optional Dev evidence and gives its target the same lazy baseline shape", async context => {
  const env = await setup(context, { sourceRepositoryId: "structured-wir-repository" });
  try {
    await bootstrapProjectSource(env.root, "structured-wir-repository");
    const captured = await env.state.createWorkIntake(env.projectId, { request: "Fix a defect", desiredOutcome: "Correct behavior",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    let revision = "a".repeat(40);
    const routing = createStructuredWorkRoutingService({ readDevRevision: async () => revision });
    const prepared = await routing.prepare(env.root, captured.intake.id, captured.workflow.id);
    const slot = prepared.preparedSubmission.expectedDraftSlots[0];
    const draftPath = path.join(env.root, slot.draftRelativePath);
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.writeFileSync(draftPath, "# Work Intake Routing Assessment\n\n## Recommended Route\nissue-resolution\n\n## Traits\nNone\n\n## Rationale\nThe request describes a defect.\n\n## Alternate Route\nNone\n", "utf8");
    const promoted = await routing.get(env.root, captured.intake.id, captured.workflow.id);
    assert.equal(promoted.assessment.stale, false);
    revision = "b".repeat(40);
    const stale = await routing.get(env.root, captured.intake.id, captured.workflow.id);
    assert.equal(stale.assessment.stale, true);
    await assert.rejects(routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: promoted.assessment.assessmentId,
      disposition: "accept", rationale: "Stale source evidence must not route." }), /stale or unavailable|Managed Dev HEAD changed/);
    assert.equal((await env.store.listEntities(env.projectId, "Workflow")).filter(record => record.entityType === "Workflow" && record.body.workflowType !== "work-intake-routing").length, 0);
    revision = "a".repeat(40);
    const completed = await routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: promoted.assessment.assessmentId,
      disposition: "accept", rationale: "Investigate the reported defect." });
    const baselines = (await env.store.listEntities(env.projectId, "SourceBaseline")).filter(record => record.entityType === "SourceBaseline");
    const bindings = (await env.store.listEntities(env.projectId, "SourceBinding")).filter(record => record.entityType === "SourceBinding");
    assert.equal(baselines.length, 1);
    assert.equal(baselines[0].body.workflowId, completed.targetWorkflowId);
    assert.equal(baselines[0].body.repositoryId, "structured-wir-repository");
    assert.equal(baselines[0].body.integrationTargetSourceLineId, "dev");
    assert.equal(baselines[0].body.baseRevisionId, revision);
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0].body.preparationState, "unprepared");
    assert.equal((await env.store.listEntities(env.projectId, "WorkSourceLine")).length, 0);
  } finally { env.store.close(); }
});

test("structured WIR allows unavailable source during assessment and leaves no partial decision after failed Dev preflight", async context => {
  const env = await setup(context, { sourceRepositoryId: "unavailable-wir-repository" });
  try {
    const captured = await env.state.createWorkIntake(env.projectId, { request: "Investigate a regression", desiredOutcome: "Understand failure",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const routing = createStructuredWorkRoutingService({ readDevRevision: async () => { throw Error("Dev unavailable"); } });
    const prepared = await routing.prepare(env.root, captured.intake.id, captured.workflow.id);
    assert.match(prepared.preparedInstruction, /continue from the Work Intake/i);
    const draftPath = path.join(env.root, prepared.preparedSubmission.expectedDraftSlots[0].draftRelativePath);
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.writeFileSync(draftPath, "# Work Intake Routing Assessment\n\n## Recommended Route\nissue-resolution\n\n## Traits\nNone\n\n## Rationale\nThe request describes a regression.\n\n## Alternate Route\nNone\n", "utf8");
    const promoted = await routing.get(env.root, captured.intake.id, captured.workflow.id);
    assert.ok(promoted.assessment);
    await assert.rejects(routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: promoted.assessment.assessmentId,
      disposition: "accept", rationale: "Do not create source-backed work without an exact Dev baseline." }), /Dev unavailable/);
    assert.equal((await env.state.getRecord(env.projectId, captured.intake.id)).lifecycleState, "active");
    assert.equal((await env.state.getRecord(env.projectId, captured.workflow.id)).lifecycleState, "active");
    assert.equal((await env.state.getWorkRouteHistory(env.projectId, captured.intake.id)).decisions.length, 0);
    assert.equal((await env.store.listRelationships(env.projectId, "routes_to")).filter(edge => edge.fromEntityId === captured.workflow.id).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "SourceBaseline")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "SourceBinding")).length, 0);
  } finally { env.store.close(); }
});
