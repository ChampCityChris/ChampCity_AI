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
const { createFeaturePlanningService } = require("../../dist/main/featurePlanning/featurePlanningService.js");
const { createIssuePlanningService } = require("../../dist/main/issuePlanning/issuePlanningService.js");

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

test("Feature planning persists exact Workflow intake, keeps revision noncanonical, and accepts one SPS graph", async context => {
  const env = await setup(context);
  const workflows = createWorkflowApplicationService();
  const feature = createFeaturePlanningService();
  try {
    const direct = await workflows.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Same title" });
    const second = await workflows.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Same title" });
    const intake = { requestedCapability: "Add export", baseline: "No export today", scopeIn: "CSV export", scopeOut: "PDF", constraints: "Keep existing API stable", preservation: "Existing reports", affectedSurfaces: "Reports and toolbar", evidence: "Export acceptance cases", compatibilityRollout: "Feature flag" };
    await feature.saveIntake(env.root, direct.workflow.workflowId, intake);
    assert.deepEqual((await feature.get(env.root, direct.workflow.workflowId)).intake, intake);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-intake");
    assert.equal((await createFeaturePlanningService().get(env.root, direct.workflow.workflowId)).stage, "intake");
    assert.equal((await feature.get(env.root, second.workflow.workflowId)).intake, null);
    assert.equal((await env.store.listEntities(env.projectId, "WorkIntake")).length, 0);
    await assert.rejects(feature.prepare(env.root, direct.workflow.workflowId, "plan"), /Accept the current Feature assessment/);
    await feature.prepare(env.root, direct.workflow.workflowId, "assessment");
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-assessment");
    assert.equal((await createFeaturePlanningService().get(env.root, direct.workflow.workflowId)).stage, "assessment");
    await feature.act(env.root, direct.workflow.workflowId, { type: "save-draft", content: "Assessment accepted by Operator." });
    await feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "assessment", outcome: "revision", rationale: "Clarify rollout." });
    assert.equal((await env.store.listEntities(env.projectId, "WorkItem")).length, 0);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-assessment");
    assert.equal((await feature.get(env.root, direct.workflow.workflowId)).assessmentState, "revision-requested");
    await feature.prepare(env.root, direct.workflow.workflowId, "assessment");
    await feature.act(env.root, direct.workflow.workflowId, { type: "save-draft", content: "Assessment current." });
    await feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "assessment", outcome: "accept", rationale: "Assessment approved." });
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-planning");
    assert.equal((await createFeaturePlanningService().get(env.root, direct.workflow.workflowId)).stage, "plan");
    await feature.act(env.root, direct.workflow.workflowId, { type: "save-draft", content: "plan draft placeholder" });
    const graph = { workflowId: direct.workflow.workflowId, topology: "direct", solution: { title: "CSV export", objective: "Export reports", scopeIn: ["CSV"], scopeOut: ["PDF"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], workItems: [{ key: "export", kind: "feature", title: "Implement CSV export", objective: "Deliver export", dependencyKeys: [], criteria: [] }] };
    const accepted = await feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "plan", outcome: "accept", rationale: "Accept feature graph", graph });
    assert.equal(accepted.stage, "work-item-map");
    assert.equal(accepted.acceptedPlan.directWorkItems.length, 1);
    assert.equal(accepted.acceptedPlan.directWorkItems[0].body.workItemKind, "feature");
    assert.equal((await feature.get(env.root, second.workflow.workflowId)).stage, "intake");
    const routedIntake = await env.state.createWorkIntake(env.projectId, { request: "Add export", desiredOutcome: "Export reports", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    await env.state.linkWorkflowRouteTarget(env.projectId, routedIntake.workflow.id, second.workflow.workflowId);
    const routedFeature = await feature.get(env.root, second.workflow.workflowId);
    assert.equal(routedFeature.workflow.workflowId, second.workflow.workflowId);
    assert.equal(routedFeature.provenance, "routed");
    assert.equal(routedFeature.intake, null);
    await assert.rejects(feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "plan", outcome: "accept", rationale: "Duplicate", graph }), /non-empty Architect draft|Workflow is already planned|unavailable/);
  } finally { env.store.close(); }
});

test("Issue Workflow persists evidence and accepted RCA, keeps revision canonical state, and normalizes fix graph", async context => {
  const env = await setup(context); const workflows = createWorkflowApplicationService(); const issues = createIssuePlanningService();
  try {
    const first = await workflows.startDirectWorkflow(env.root, { workflowType: "issue-resolution", title: "Same incident" });
    const second = await workflows.startDirectWorkflow(env.root, { workflowType: "issue-resolution", title: "Same incident" });
    const intake = { title: "Export crash", observed: "Export exits unexpectedly", expected: "Export succeeds", reproduction: "Click export after search", environment: "Desktop fixture", impact: "Report cannot be saved", constraints: "Preserve existing reports" };
    await issues.saveIntake(env.root, first.workflow.workflowId, intake);
    assert.deepEqual((await issues.get(env.root, first.workflow.workflowId)).intake, intake);
    assert.equal((await issues.get(env.root, second.workflow.workflowId)).intake, null);
    const wir = await env.state.createWorkIntake(env.projectId, { request: "Crash after export", desiredOutcome: "Restore export", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    await env.state.linkWorkflowRouteTarget(env.projectId, wir.workflow.id, second.workflow.workflowId);
    const routed = await issues.get(env.root, second.workflow.workflowId);
    assert.equal(routed.workflow.workflowId, second.workflow.workflowId);
    assert.equal(routed.provenance, "routed");
    assert.equal(routed.intake, null);
    const evidence = await issues.addEvidence(env.root, first.workflow.workflowId, [{ name: "repro.txt", mediaType: "text/plain", base64: Buffer.from("reproduction evidence").toString("base64"), description: "Reproduction log" }]);
    assert.equal(evidence.evidence.length, 1);
    assert.match(evidence.evidence[0].body.payloadRef, /^project-evidence:/);
    assert.equal(evidence.evidence[0].body.digest, require("node:crypto").createHash("sha256").update("reproduction evidence").digest("hex"));
    await issues.prepare(env.root, first.workflow.workflowId, "rca");
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    assert.equal((await createIssuePlanningService().get(env.root, first.workflow.workflowId)).stage, "rca");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Initial RCA draft" });
    await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "revision", rationale: "Cite the reproduction log." });
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses.length, 0);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    const current = await issues.get(env.root, first.workflow.workflowId);
    const finding = current.findings.find(record => record.body.title === "Observed behavior");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "RCA cites the persisted observed failure and reproduction evidence." });
    const afterRca = await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "accept", rationale: "Evidence supports the cause.", rootCauses: [{ title: "Export state exception", statement: "Export crashes when search state is populated.", rationale: "The reproduced state transition omits the export data shape.", confidence: 0.9, findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] }] });
    assert.equal(afterRca.stage, "plan");
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-planning");
    assert.equal((await createIssuePlanningService().get(env.root, first.workflow.workflowId)).stage, "plan");
    assert.equal(afterRca.rootCauses.length, 1);
    const links = await env.store.listRelationships(env.projectId);
    assert.ok(links.some(edge => edge.relationshipType === "explains" && edge.fromEntityId === afterRca.rootCauses[0].id && edge.toEntityId === finding.id));
    assert.ok(links.some(edge => edge.relationshipType === "supports" && edge.fromEntityId === evidence.evidence[0].id && edge.toEntityId === afterRca.rootCauses[0].id));
    await issues.prepare(env.root, first.workflow.workflowId, "rca");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Updated RCA review draft." });
    await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "revision", rationale: "Clarify the regression trigger." });
    const unchangedRca = await issues.get(env.root, first.workflow.workflowId);
    assert.equal(unchangedRca.rootCauses.length, 1);
    assert.equal(unchangedRca.rootCauses[0].id, afterRca.rootCauses[0].id);
    await assert.rejects(issues.prepare(env.root, first.workflow.workflowId, "plan"), /Accept the current Issue RCA/);
    const revisedRoot = { title: "Search-dependent export mapping", statement: "Export crashes when search state is populated.", rationale: "The reproduction confirms the missing search state mapping.", confidence: 0.95, findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] };
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Revised RCA with clearer trigger." });
    const reviewedAgain = await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "accept", rationale: "Accept clarified cause.", rootCauses: [revisedRoot] });
    assert.equal(reviewedAgain.rootCauses.length, 1);
    assert.notEqual(reviewedAgain.rootCauses[0].id, afterRca.rootCauses[0].id);
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Proposed correction plan draft." });
    await issues.act(env.root, first.workflow.workflowId, { type: "decide-plan", outcome: "revision", rationale: "Add deterministic regression coverage." });
    assert.equal((await env.store.listEntities(env.projectId, "WorkItem")).length, 0);
    const graph = { workflowId: first.workflow.workflowId, topology: "direct", solution: { title: "Restore Export", objective: "Export from populated search state", scopeIn: ["export state shape"], scopeOut: ["new formats"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], workItems: [{ key: "correct", kind: "fix", title: "Correct export state mapping", objective: "Prevent crash", dependencyKeys: [], criteria: [] }] };
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Reviewed correction graph." });
    const accepted = await issues.act(env.root, first.workflow.workflowId, { type: "decide-plan", outcome: "accept", rationale: "Accept correction graph.", graph });
    assert.equal(accepted.stage, "work-item-map"); assert.equal(accepted.acceptedPlan.directWorkItems[0].body.workItemKind, "fix");
    const finalLinks = await env.store.listRelationships(env.projectId, "addresses");
    assert.ok(finalLinks.some(edge => edge.fromEntityId === accepted.acceptedPlan.solutions[0].id && edge.toEntityId === accepted.rootCauses[0].id));
    assert.equal((await issues.get(env.root, second.workflow.workflowId)).stage, "intake");
  } finally { env.store.close(); }
});

test("source-backed Issue Workflow planning exposes its exact lazy SourceBaseline without materializing source", async context => {
  const env = await setup(context, { sourceRepositoryId: "issue-workflow-repository" });
  try {
    const source = await bootstrapProjectSource(env.root, "issue-workflow-repository");
    const started = await createWorkflowApplicationService().startDirectWorkflow(env.root, { workflowType: "issue-resolution", title: "Source-backed incident" });
    const projection = await createIssuePlanningService().get(env.root, started.workflow.workflowId);
    assert.equal(projection.source.revisionId, source.integrationTarget.headRevisionId);
    assert.equal(projection.source.bindingPrepared, false);
    assert.equal((await env.store.listEntities(env.projectId, "SourceBinding"))[0].body.preparationState, "unprepared");
  } finally { env.store.close(); }
});
