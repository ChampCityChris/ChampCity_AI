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
const { registerFeaturePlanningIpc } = require("../../dist/main/featurePlanning/featurePlanningIpc.js");
const { registerIssuePlanningIpc } = require("../../dist/main/issuePlanning/issuePlanningIpc.js");

const operator = { principalId: "test-operator", principalType: "human", role: "Operator" };
const acceptedAssessment = { currentProductBaseline: "Current behavior", requestedCapabilityDelta: "Requested outcome", behaviorContractsToPreserve: "Existing contract", affectedArchitectureIntegrationPoints: "Feature surfaces", compatibilityRollout: "No migration", regressionBoundary: "Focused regression", excludedFutureWork: "Out of scope" };
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

async function approveIntake(root, id) {
  const service = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
  const intake = await service.ensureWorkflowIntake(root, id);
  await service.reviewWorkflowIntake(root, id, {expectedIntakeRecordVersion: intake.recordVersion, outcome: "approved"});
}

function groups(inventory) { return new Map(inventory.groups.map(group => [group.workflowType, group.workflows])); }

test("Greenfield Architect persists typed SQL candidates, rematerializes review and bridges Planning without canonical Interview authority", async context => {
  const {GREENFIELD_ARCHITECT_SECTIONS} = require("../../dist/shared/architectWorkspaceContracts.js");
  const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
  const intakeService = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
  const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
  const {resolveProjectPlanningContext} = require("../../dist/main/projectPlanning/projectPlanningContext.js");
  const {resolveFirstNonApprovedDocument} = require("../../dist/main/documents/firstNonApprovedResolver.js");
  const env = await setup(context);
  try {
    const workflow = (await env.state.createProjectCreationWorkflow(env.projectId, {title: "Greenfield SQL"})).workflow;
    const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS["project-creation"].fields.filter(field => field.required).map(field => [field.key, field.key === "hasExistingSourceOrPlanning" ? false : field.key === "projectRepository" ? env.root : field.key === "projectType" ? "Desktop application" : `${field.key} fixture`]));
    const intake = await intakeService.saveProjectCreationIntake(env.root, workflow.id, values);
    await intakeService.reviewWorkflowIntake(env.root, workflow.id, {expectedIntakeRecordVersion: intake.recordVersion, outcome: "approved"});
    fs.unlinkSync(path.join(env.root, intake.reviewDocument.markdownPath));
    const historical = path.join(env.root, "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_old.md");
    fs.mkdirSync(path.dirname(historical), {recursive: true}); fs.writeFileSync(historical, "Historical prose: must not import as architecture.");
    const prepared = await architect.prepare(env.root, workflow.id);
    assert.equal(prepared.ready, true); assert.ok(prepared.handoff.includes(`${intake.intakeId}@1`));
    assert.equal(resolveFirstNonApprovedDocument(env.root).activeWorkspaceId, "architect-interview");
    assert.notEqual(resolveProjectPlanningContext(env.root).status, "ready");
    const output = Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key => [key, [`${key} direction`]]));
    await assert.rejects(architect.save(env.root, workflow.id, {intakeId: intake.intakeId, intakeVersion: 1, output: {...output, extra: "not bounded"}}));
    const candidate = await architect.save(env.root, workflow.id, {intakeId: intake.intakeId, intakeVersion: 1, output});
    assert.equal(candidate.review.disposition.state, "none");
    const cycle = await env.store.getEntity(env.projectId, candidate.review.cycleId);
    const ids = (await env.store.listRelationships(env.projectId, "review_member")).filter(edge => !edge.endedAt && edge.toEntityId === cycle.id).map(edge => edge.fromEntityId);
    assert.equal(ids.length, candidate.review.sources.length); assert.ok((await env.store.listEntities(env.projectId, "BoundedSolution")).some(record => ids.includes(record.id)));
    assert.ok(!((await env.store.listEntities(env.projectId, "Decision")).some(record => record.body.decisionType === "architect-review")));
    let previous = -1; for (const title of Object.values(GREENFIELD_ARCHITECT_SECTIONS)) {const index = candidate.review.markdown.indexOf(`## ${title}`); assert.ok(index > previous, title); previous = index;}
    const projection = path.join(env.root, candidate.review.relativePath);
    fs.writeFileSync(projection, "Manually changed approval and scope");
    assert.equal((await architect.get(env.root, workflow.id)).review.markdown, candidate.review.markdown);
    assert.equal(fs.readFileSync(projection, "utf8"), candidate.review.markdown);
    fs.unlinkSync(projection); await architect.get(env.root, workflow.id); assert.ok(fs.existsSync(projection));
    await assert.rejects(architect.review(env.root, workflow.id, cycle.id, {expectedRecordVersion: 99, outcome: "approved"}));
    const approved = await architect.review(env.root, workflow.id, cycle.id, {expectedRecordVersion: 1, outcome: "approved"});
    assert.equal(approved.railStatus, "Completed"); fs.unlinkSync(projection);
    const planning = resolveProjectPlanningContext(env.root);
    assert.equal(planning.status, "ready"); assert.ok(planning.architectSemanticMarkdown.includes("projectPlanningDirection direction"));
    require("../../dist/main/projectPlanning/projectPlanningService.js").generateProjectPlanningHandoff(env.root);
    assert.ok(fs.readFileSync(path.join(env.root, planning.handoffMarkdownPath), "utf8").includes("projectPlanningDirection direction"));
    assert.equal(planning.interview.logicalDocumentId, cycle.id); assert.equal(fs.readFileSync(historical, "utf8"), "Historical prose: must not import as architecture.");
    const revised = await architect.save(env.root, workflow.id, {intakeId: intake.intakeId, intakeVersion: 1, expectedCycleVersion: 1, output: {...output, scope: ["Revised scope"]}});
    assert.equal(revised.review.recordVersion, 2); assert.equal(revised.review.disposition.state, "none"); assert.notEqual(resolveProjectPlanningContext(env.root).status, "ready");
    await architect.review(env.root, workflow.id, cycle.id, {expectedRecordVersion: 2, outcome: "approved"});
    await intakeService.saveProjectCreationIntake(env.root, workflow.id, {...values, projectPurpose: "Material Intake revision"}, 1);
    assert.equal((await architect.get(env.root, workflow.id)).review, undefined);
    await assert.rejects(architect.review(env.root, workflow.id, cycle.id, {expectedRecordVersion: 2, outcome: "approved"}), /stale/);
    assert.equal(fs.existsSync(path.join(env.root, "planning/project/Project_Architect_Interview_Prompts")), false);
  } finally {env.store.close();}
});

test("registered Feature and Issue IPC handlers persist intake using preload argument shapes", async context => {
  const env = await setup(context); const app = createWorkflowApplicationService(); const feature = createFeaturePlanningService(); const issue = createIssuePlanningService();
  const handlers = new Map(); const registry = { handle: (channel, listener) => handlers.set(channel, listener) };
  registerFeaturePlanningIpc(registry, () => env.root, () => {}, feature);
  registerIssuePlanningIpc(registry, () => env.root, () => {}, issue);
  try {
    const featureWorkflow = await app.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "IPC Feature" });
    const featureIntake = { requestedCapability: "Export", baseline: "None", scopeIn: "CSV", scopeOut: "PDF", constraints: "Stable API", preservation: "Reports", affectedSurfaces: "UI", evidence: "Cases", compatibilityRollout: "Flag" };
    const featureResult = await handlers.get("featurePlanning:saveIntake")({}, featureWorkflow.workflow.workflowId, featureIntake);
    assert.equal(featureResult.intake.requestedCapability, "Export");
    const issueWorkflow = await app.startDirectWorkflow(env.root, { workflowType: "issue-resolution", title: "IPC Issue" });
    const issueIntake = { title: "Crash", observed: "App exits", expected: "App stays open", reproduction: "Open settings", environment: "Windows", impact: "Blocked", constraints: "No data loss" };
    const issueResult = await handlers.get("issuePlanning:saveIntake")({}, issueWorkflow.workflow.workflowId, issueIntake);
    assert.equal(issueResult.intake.title, "Crash");
  } finally { env.store.close(); }
});

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
    fs.writeFileSync(path.join(dev, "changed-after-workflow.txt"), "Dev changed after the Workflow baseline was captured.\n");
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
    assert.equal(sourceContext.source.baseline.body.baseRevisionId, source.integrationTarget.headRevisionId);
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
    const targetPlanner = createFeaturePlanningService();
    await targetPlanner.saveIntake(env.root, completed.targetWorkflowId, { requestedCapability: "Routed capability", baseline: "Current behavior", scopeIn: "Bounded addition", scopeOut: "Unrelated changes", constraints: "Preserve contracts", preservation: "Existing behavior", affectedSurfaces: "Feature surface", evidence: "Synthetic route evidence", compatibilityRollout: "No migration" });
    await approveIntake(env.root, completed.targetWorkflowId);
    await targetPlanner.prepare(env.root, completed.targetWorkflowId, "assessment");
    await targetPlanner.act(env.root, completed.targetWorkflowId, { type: "save-draft", content: "Assess the routed capability." });
    await targetPlanner.act(env.root, completed.targetWorkflowId, { type: "decide", stage: "assessment", outcome: "accept", rationale: "Accept routed assessment.", assessment: acceptedAssessment });
    const routedGraph = { workflowId: completed.targetWorkflowId, topology: "phased", solution: { title: "Routed capability", objective: "Deliver routed result", scopeIn: ["bounded addition"], scopeOut: ["unrelated changes"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [{ statement: "Preserve existing behavior", criticality: "required", verificationIntent: "Run the preserved behavior suite", validationPolicy: "semantic_ai" }], phases: [{ key: "routed-phase", title: "Capability phase", objective: "Deliver capability", sequence: 1 }], workItems: [{ key: "routed-work", kind: "feature", title: "Implement routed addition", objective: "Deliver the addition", phaseKey: "routed-phase", dependencyKeys: [], criteria: [] }] };
    await targetPlanner.act(env.root, completed.targetWorkflowId, { type: "save-draft", content: "Reviewed routed Feature graph." });
    const routedPlan = await targetPlanner.act(env.root, completed.targetWorkflowId, { type: "decide", stage: "plan", outcome: "accept", rationale: "Accept routed plan.", graph: routedGraph });
    assert.equal(routedPlan.stage, "work-item-map");
    assert.equal(routedPlan.workflow.workflowId, completed.targetWorkflowId);
    assert.equal(routedPlan.workflow.currentWorkspace, "work-item-map");
    assert.equal(routedPlan.provenance, "routed");
    assert.equal(routedPlan.acceptedPlan.workflow.id, completed.targetWorkflowId);
    assert.equal(routedPlan.acceptedPlan.phases[0].sequence, 1);
    assert.equal(routedPlan.acceptedPlan.criteria.some(item => item.record.body.validationPolicy === "semantic_ai"), true);
    assert.equal((await targetPlanner.get(env.root, completed.targetWorkflowId)).stage, "work-item-map");
    assert.equal((await env.state.getRecord(env.projectId, captured.workflow.id)).lifecycleState, "closed");
    assert.equal((await env.state.getWorkflowExecutionPlan(env.projectId, completed.targetWorkflowId)).solutions[0].id, routedPlan.acceptedPlan.solutions[0].id);
    assert.equal((await env.store.listEntities(env.projectId, "ImplementationRecord")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "Validation")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "SourceCheckpoint")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "IntegrationRecord")).length, 0);
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

test("structured WIR accepts without prose, retains optional notes, and requires override and revision rationale", async context => {
  const env = await setup(context);
  const routing = createStructuredWorkRoutingService({ readDevRevision: async () => { throw Error("No managed source"); } });
  async function assessed(suffix) {
    const captured = await env.state.createWorkIntake(env.projectId, { request: `Route request ${suffix}`, desiredOutcome: "Choose a workflow",
      constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    const prepared = await routing.prepare(env.root, captured.intake.id, captured.workflow.id);
    const draftPath = path.join(env.root, prepared.preparedSubmission.expectedDraftSlots[0].draftRelativePath);
    fs.mkdirSync(path.dirname(draftPath), { recursive: true });
    fs.writeFileSync(draftPath, "# Work Intake Routing Assessment\n\n## Recommended Route\nfeature-change\n\n## Traits\nNone\n\n## Rationale\nA bounded capability change.\n\n## Alternate Route\nNone\n", "utf8");
    const promoted = await routing.get(env.root, captured.intake.id, captured.workflow.id);
    assert.ok(promoted.assessment, promoted.error);
    return { captured, assessmentId: promoted.assessment.assessmentId };
  }
  try {
    const first = await assessed("default");
    const decideFirst = input => routing.decide(env.root, first.captured.intake.id, first.captured.workflow.id,
      { assessmentId: first.assessmentId, ...input });
    await assert.rejects(decideFirst({ disposition: "override", route: "refactor-migration" }), /bounded Operator route decision/);
    await assert.rejects(decideFirst({ disposition: "override", route: "refactor-migration", rationale: "  " }), /bounded Operator route decision/);
    await assert.rejects(decideFirst({ disposition: "request-revision" }), /bounded Operator route decision/);
    await assert.rejects(decideFirst({ disposition: "request-revision", rationale: "  " }), /bounded Operator route decision/);
    await assert.rejects(decideFirst({ disposition: "accept", route: "refactor-migration" }), /Accept does not accept an override route/);
    const completed = await decideFirst({ disposition: "accept" });
    assert.equal(completed.selectedRoute, "feature-change");
    assert.equal(completed.closed, true);
    assert.ok(completed.targetWorkflowId);
    assert.equal((await env.state.getRecord(env.projectId, completed.targetWorkflowId)).body.workflowType, "feature-capability");
    const history = await env.state.getWorkRouteHistory(env.projectId, first.captured.intake.id);
    assert.equal(history.decisions[0].body.rationale, "Operator accepted Architect recommendation.");
    assert.equal((await env.state.getRecord(env.projectId, first.captured.workflow.id)).lifecycleState, "closed");
    const changed = await assessed("changed intake");
    await env.state.reviseWorkIntake(env.projectId, changed.captured.intake.id, { desiredOutcome: "Changed result" }, changed.captured.intake.recordVersion);
    assert.equal((await routing.get(env.root, changed.captured.intake.id, changed.captured.workflow.id)).assessment.stale, true);
    for (const disposition of ["accept", "override"]) {
      await assert.rejects(routing.decide(env.root, changed.captured.intake.id, changed.captured.workflow.id,
        { assessmentId: changed.assessmentId, disposition, ...(disposition === "override" ? { route: "refactor-migration" } : {}), rationale: "Route changed request" }), /stale or unavailable/);
    }
    const second = await assessed("optional note");
    const noted = await routing.decide(env.root, second.captured.intake.id, second.captured.workflow.id,
      { assessmentId: second.assessmentId, disposition: "accept", rationale: "  Proceed after review.  " });
    assert.equal(noted.selectedRoute, "feature-change");
    assert.equal((await env.state.getWorkRouteHistory(env.projectId, second.captured.intake.id)).decisions[0].body.rationale,
      "Proceed after review.");
  } finally { env.store.close(); }
});

test("structured source-backed WIR captures optional Dev evidence and gives its target the same lazy baseline shape", async context => {
  for (const disposition of ["accept", "override", "request-revision"]) {
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
      const assessmentId = promoted.assessment.assessmentId;
      const provenance = (await env.state.getRecord(env.projectId, assessmentId)).provenance.sourceRef;
      assert.match(provenance, new RegExp(`;dev-head:${revision}$`));
      revision = "b".repeat(40);
      const current = await routing.get(env.root, captured.intake.id, captured.workflow.id);
      assert.equal(current.assessment.assessmentId, assessmentId);
      assert.equal(current.assessment.stale, false);
      assert.equal(current.closed, false);
      const completed = await routing.decide(env.root, captured.intake.id, captured.workflow.id, { assessmentId: promoted.assessment.assessmentId,
        disposition, ...(disposition === "override" ? { route: "refactor-migration" } : {}), rationale: "Investigate the reported defect." });
      assert.equal((await env.state.getRecord(env.projectId, assessmentId)).provenance.sourceRef, provenance);
      if (disposition === "request-revision") {
        assert.equal(completed.reviewState, "revision-requested");
        assert.equal(completed.targetWorkflowId, null);
        assert.equal((await env.store.listEntities(env.projectId, "SourceBaseline")).length, 0);
        continue;
      }
      assert.ok(completed.targetWorkflowId);
      assert.equal(completed.selectedRoute, disposition === "accept" ? "issue-resolution" : "refactor-migration");
      assert.equal((await env.state.getRecord(env.projectId, completed.targetWorkflowId)).body.workflowType,
        disposition === "accept" ? "issue-resolution" : "refactor-migration");
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
  }
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
    const featureIntakeFindings = (await env.store.listEntities(env.projectId, "Finding")).filter(record => record.entityType === "Finding" && record.body.category === "feature-intake");
    const featureOwnership = await env.store.listRelationships(env.projectId, "workflow_member");
    assert.equal(featureIntakeFindings.length, 0);
    assert.ok(featureIntakeFindings.every(record => featureOwnership.some(edge => edge.fromEntityId === record.id && edge.toEntityId === direct.workflow.workflowId && !edge.endedAt)));
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-intake");
    assert.equal((await createFeaturePlanningService().get(env.root, direct.workflow.workflowId)).stage, "intake");
    assert.equal((await feature.get(env.root, second.workflow.workflowId)).intake, null);
    assert.equal((await env.store.listEntities(env.projectId, "WorkIntake")).length, 0);
    await assert.rejects(feature.prepare(env.root, direct.workflow.workflowId, "assessment"), /Approve the current Feature Intake/);
    await approveIntake(env.root, direct.workflow.workflowId);
    await assert.rejects(feature.prepare(env.root, direct.workflow.workflowId, "plan"), /Accept the current Feature assessment/);
    await approveIntake(env.root, direct.workflow.workflowId);
    await feature.prepare(env.root, direct.workflow.workflowId, "assessment");
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-assessment");
    assert.equal((await createFeaturePlanningService().get(env.root, direct.workflow.workflowId)).stage, "assessment");
    await feature.act(env.root, direct.workflow.workflowId, { type: "save-draft", content: "Assessment accepted by Operator." });
    await feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "assessment", outcome: "revision", rationale: "Clarify rollout." });
    assert.equal((await env.store.listEntities(env.projectId, "WorkItem")).length, 0);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-assessment");
    assert.equal((await feature.get(env.root, direct.workflow.workflowId)).assessmentState, "revision-requested");
    await approveIntake(env.root, direct.workflow.workflowId);
    await feature.prepare(env.root, direct.workflow.workflowId, "assessment");
    await feature.act(env.root, direct.workflow.workflowId, { type: "save-draft", content: "Assessment current." });
    await feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "assessment", outcome: "accept", rationale: "Assessment approved.", assessment: acceptedAssessment });
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-planning");
    const reopened = await createFeaturePlanningService().get(env.root, direct.workflow.workflowId);
    assert.equal(reopened.stage, "plan");
    assert.equal(reopened.acceptedAssessment.length, 7);
    const acceptedAssessmentOwnership = await env.store.listRelationships(env.projectId, "workflow_member");
    assert.ok(reopened.acceptedAssessment.every(record => acceptedAssessmentOwnership.some(edge => edge.fromEntityId === record.id && edge.toEntityId === direct.workflow.workflowId && !edge.endedAt)));
    const planningHandoff = await feature.prepare(env.root, direct.workflow.workflowId, "plan");
    assert.match(planningHandoff.draft.instruction, /Exact accepted Feature assessment from SPS/);
    assert.match(planningHandoff.draft.instruction, /Current Product Baseline/);
    assert.match(planningHandoff.draft.instruction, /Source-neutral validation policy: required deterministic ValidationCatalog proof is unavailable/i);
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

test("concurrent same-title direct Features accept and reopen isolated canonical planning graphs", async context => {
  const env = await setup(context); const workflows = createWorkflowApplicationService(); const planner = createFeaturePlanningService();
  try {
    const first = await workflows.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Concurrent capability" });
    const second = await workflows.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Concurrent capability" });
    const accept = async (workflow, label) => {
      await planner.saveIntake(env.root, workflow.workflowId, { requestedCapability: `${label} request`, baseline: `${label} baseline`, scopeIn: `${label} scope`, scopeOut: "Unrelated", constraints: "Preserve interface", preservation: "Existing behavior", affectedSurfaces: `${label} surface`, evidence: `${label} evidence`, compatibilityRollout: "No migration" });
      await approveIntake(env.root, workflow.workflowId);
    await planner.prepare(env.root, workflow.workflowId, "assessment");
      await planner.act(env.root, workflow.workflowId, { type: "save-draft", content: `${label} assessment` });
      await planner.act(env.root, workflow.workflowId, { type: "decide", stage: "assessment", outcome: "accept", rationale: `${label} assessment accepted`, assessment: { ...acceptedAssessment, requestedCapabilityDelta: `${label} outcome` } });
      const graph = { workflowId: workflow.workflowId, topology: "direct", solution: { title: `${label} solution`, objective: `${label} outcome`, scopeIn: [`${label} scope`], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [{ statement: `${label} criterion`, criticality: "required", verificationIntent: `Verify ${label}`, validationPolicy: "semantic_ai" }], workItems: [{ key: `${label}-work`, kind: "feature", title: `${label} work`, objective: `${label} result`, dependencyKeys: [], criteria: [] }] };
      await planner.act(env.root, workflow.workflowId, { type: "save-draft", content: `${label} reviewed graph` });
      return planner.act(env.root, workflow.workflowId, { type: "decide", stage: "plan", outcome: "accept", rationale: `${label} plan accepted`, graph });
    };
    const a = await accept(first.workflow, "alpha"); const b = await accept(second.workflow, "beta");
    assert.equal(a.stage, "work-item-map"); assert.equal(b.stage, "work-item-map");
    assert.notEqual(a.acceptedPlan.solutions[0].id, b.acceptedPlan.solutions[0].id);
    assert.notEqual(a.acceptedPlan.directWorkItems[0].id, b.acceptedPlan.directWorkItems[0].id);
    assert.notEqual(a.acceptedPlan.criteria[0].record.id, b.acceptedPlan.criteria[0].record.id);
    assert.ok(!(await planner.get(env.root, second.workflow.workflowId)).acceptedArchitecture.some(record => record.entityType === "BoundedSolution" && record.id === a.acceptedPlan.solutions[0].id));
    assert.equal((await planner.get(env.root, first.workflow.workflowId)).stage, "work-item-map");
    assert.equal((await planner.get(env.root, second.workflow.workflowId)).stage, "work-item-map");
    assert.deepEqual((await planner.get(env.root, first.workflow.workflowId)).intake.requestedCapability, "alpha request");
    assert.deepEqual((await planner.get(env.root, second.workflow.workflowId)).intake.requestedCapability, "beta request");
    assert.equal((await env.state.getWorkflowExecutionPlan(env.projectId, first.workflow.workflowId)).workflow.id, first.workflow.workflowId);
    assert.equal((await env.state.getWorkflowExecutionPlan(env.projectId, second.workflow.workflowId)).workflow.id, second.workflow.workflowId);
    assert.equal((await env.store.listEntities(env.projectId, "ImplementationRecord")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "Validation")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "SourceCheckpoint")).length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "IntegrationRecord")).length, 0);
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
    const issueOwnership = await env.store.listRelationships(env.projectId, "workflow_member");
    const firstIssueFindings = (await env.store.listEntities(env.projectId, "Finding")).filter(record => record.entityType === "Finding" && record.body.category === "issue-intake");
    assert.equal(firstIssueFindings.length, 0);
    assert.ok(firstIssueFindings.every(record => issueOwnership.some(edge => edge.fromEntityId === record.id && edge.toEntityId === first.workflow.workflowId && !edge.endedAt)));
    assert.equal((await issues.get(env.root, second.workflow.workflowId)).intake, null);
    const wir = await env.state.createWorkIntake(env.projectId, { request: "Crash after export", desiredOutcome: "Restore export", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
    await env.state.linkWorkflowRouteTarget(env.projectId, wir.workflow.id, second.workflow.workflowId);
    const routed = await issues.get(env.root, second.workflow.workflowId);
    assert.equal(routed.workflow.workflowId, second.workflow.workflowId);
    assert.equal(routed.provenance, "routed");
    assert.equal(routed.intake, null);
    await issues.saveIntake(env.root, second.workflow.workflowId, { ...intake, title: "Independent issue", observed: "A separate observed failure", reproduction: "Use independent steps" });
    const secondEvidence = await issues.addEvidence(env.root, second.workflow.workflowId, [{ name: "second.txt", mediaType: "text/plain", base64: Buffer.from("second issue evidence").toString("base64"), description: "Second issue log" }]);
    assert.notEqual(secondEvidence.intakeAuthority.intakeId, (await issues.get(env.root, first.workflow.workflowId)).intakeAuthority.intakeId);
    assert.equal(secondEvidence.evidence.length, 1);
    await approveIntake(env.root, second.workflow.workflowId);
    await issues.prepare(env.root, second.workflow.workflowId, "rca");
    await issues.act(env.root, second.workflow.workflowId, { type: "save-draft", content: "Second issue RCA under revision." });
    await issues.act(env.root, second.workflow.workflowId, { type: "decide-rca", outcome: "revision", rationale: "Clarify the independent reproduction." });
    assert.equal((await issues.get(env.root, second.workflow.workflowId)).rootCauses.length, 0);
    assert.equal((await env.store.listEntities(env.projectId, "WorkItem")).length, 0);
    const evidence = await issues.addEvidence(env.root, first.workflow.workflowId, [{ name: "repro.txt", mediaType: "text/plain", base64: Buffer.from("reproduction evidence").toString("base64"), description: "Reproduction log" }]);
    assert.equal(evidence.evidence.length, 1);
    assert.notEqual(evidence.evidence[0].id, secondEvidence.evidence[0].id);
    assert.match(evidence.evidence[0].body.payloadRef, /^project-evidence:/);
    assert.equal(evidence.evidence[0].body.digest, require("node:crypto").createHash("sha256").update("reproduction evidence").digest("hex"));
    await approveIntake(env.root, first.workflow.workflowId);
    await issues.prepare(env.root, first.workflow.workflowId, "rca");
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    assert.equal((await createIssuePlanningService().get(env.root, first.workflow.workflowId)).stage, "rca");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Initial RCA draft" });
    await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "revision", rationale: "Cite the reproduction log." });
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses.length, 0);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    const current = await issues.get(env.root, first.workflow.workflowId);
    const finding = await env.state.createRecord(env.projectId, "Finding", {title: "Observed behavior", statement: "Independent RCA observation", category: "issue-rca", impact: "Issue context", observedAt: new Date().toISOString(), findingState: "current"});
    await env.state.createRelationship(env.projectId, finding.id, "workflow_member", first.workflow.workflowId);
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "RCA cites the persisted observed failure and reproduction evidence." });
    const rootCauseCountBeforeFailure = (await env.store.listEntities(env.projectId, "RootCause")).length;
    const decisionCountBeforeFailure = (await env.store.listEntities(env.projectId, "Decision")).length;
    await assert.rejects(issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "accept", rationale: "Should remain atomic.", rootCauses: [
      { title: "Valid first candidate", statement: "Would be written first in a non-atomic path.", rationale: "Supported.", findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] },
      { title: "Foreign finding candidate", statement: "Cannot cross Issue owners.", rationale: "Rejected in preflight.", findingIds: [secondEvidence.intakeAuthority.intakeId], evidenceIds: [secondEvidence.evidence[0].id] },
    ] }), /current Findings owned by this exact Issue Workflow/);
    assert.equal((await env.store.listEntities(env.projectId, "RootCause")).length, rootCauseCountBeforeFailure);
    assert.equal((await env.store.listEntities(env.projectId, "Decision")).length, decisionCountBeforeFailure);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    const afterRca = await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "accept", rationale: "Evidence supports the cause.", rootCauses: [{ title: "Export state exception", statement: "Export crashes when search state is populated.", rationale: "The reproduced state transition omits the export data shape.", confidence: 0.9, findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] }] });
    assert.equal(afterRca.stage, "plan");
    assert.match(afterRca.draft.instruction, /Source-neutral validation policy: required deterministic ValidationCatalog proof is unavailable/i);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-planning");
    assert.equal((await createIssuePlanningService().get(env.root, first.workflow.workflowId)).stage, "plan");
    assert.equal(afterRca.rootCauses.length, 1);
    const links = await env.store.listRelationships(env.projectId);
    assert.ok(links.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === afterRca.rootCauses[0].id && edge.toEntityId === first.workflow.workflowId));
    const firstRcaDecision = (await env.store.listEntities(env.projectId, "Decision")).find(record => record.entityType === "Decision" && record.body.decisionType === "issue-rca-review" && record.body.outcome === "accepted" && links.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === record.id && edge.toEntityId === first.workflow.workflowId));
    assert.ok(firstRcaDecision);
    assert.ok(links.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === firstRcaDecision.id && edge.toEntityId === afterRca.rootCauses[0].id));
    assert.doesNotMatch(firstRcaDecision.body.rationale, /canonical-root-causes/i);
    assert.ok(links.some(edge => edge.relationshipType === "explains" && edge.fromEntityId === afterRca.rootCauses[0].id && edge.toEntityId === finding.id));
    assert.ok(links.some(edge => edge.relationshipType === "supports" && edge.fromEntityId === evidence.evidence[0].id && edge.toEntityId === afterRca.rootCauses[0].id));
    await approveIntake(env.root, first.workflow.workflowId);
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
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses.length, 1);
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses[0].id, reviewedAgain.rootCauses[0].id);
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Proposed correction plan draft." });
    await issues.act(env.root, first.workflow.workflowId, { type: "decide-plan", outcome: "revision", rationale: "Add deterministic regression coverage." });
    assert.equal((await env.store.listEntities(env.projectId, "WorkItem")).length, 0);
    const lateEvidence = await issues.addEvidence(env.root, first.workflow.workflowId, [{ name: "late.txt", mediaType: "text/plain", base64: Buffer.from("new RCA evidence").toString("base64"), description: "Evidence added after RCA acceptance" }]);
    const latestEvidence = lateEvidence.evidence.find(record => record.body.description === "Evidence added after RCA acceptance");
    const reproductionEvidence = evidence.evidence.find(record => record.body.description === "Reproduction log");
    assert.ok(latestEvidence && reproductionEvidence);
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rcaState, "not-reviewed");
    await assert.rejects(issues.act(env.root, first.workflow.workflowId, { type: "decide-plan", outcome: "accept" }), /current plan workspace and an accepted current RCA/);
    assert.equal((await env.store.listEntities(env.projectId, "WorkItem")).length, 0);
    await approveIntake(env.root, first.workflow.workflowId);
    await issues.prepare(env.root, first.workflow.workflowId, "rca");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Re-review with the newly added evidence." });
    const refreshedRca = await issues.act(env.root, first.workflow.workflowId, { type: "decide-rca", outcome: "accept", rationale: "Accept RCA with current evidence.", rootCauses: [{ title: "Search-dependent export mapping", statement: "Export crashes when search state is populated.", rationale: "The reproduction and newly added evidence confirm the missing state mapping.", findingIds: [finding.id], evidenceIds: [reproductionEvidence.id, latestEvidence.id] }] });
    assert.equal(refreshedRca.stage, "plan");
    const graph = { workflowId: first.workflow.workflowId, topology: "direct", solution: { title: "Restore Export", objective: "Export from populated search state", scopeIn: ["export state shape"], scopeOut: ["new formats"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], workItems: [{ key: "correct", kind: "fix", title: "Correct export state mapping", objective: "Prevent crash", dependencyKeys: [], criteria: [] }] };
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Reviewed correction graph." });
    const accepted = await issues.act(env.root, first.workflow.workflowId, { type: "decide-plan", outcome: "accept", rationale: "Accept correction graph.", graph });
    assert.equal(accepted.stage, "work-item-map"); assert.equal(accepted.acceptedPlan.directWorkItems[0].body.workItemKind, "fix");
    const finalLinks = await env.store.listRelationships(env.projectId, "addresses");
    assert.ok(finalLinks.some(edge => edge.fromEntityId === accepted.acceptedPlan.solutions[0].id && edge.toEntityId === accepted.rootCauses[0].id));
    assert.equal((await issues.get(env.root, second.workflow.workflowId)).stage, "rca");
    assert.equal((await issues.get(env.root, second.workflow.workflowId)).rootCauses.length, 0);
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

test("generic intake facade persists exact fields, revises optional omissions and rejects invalid authority", async context => {
  const { createWorkflowIntakeService } = require("../../dist/main/workflow/workflowIntakeService.js");
  const { WORKFLOW_INTAKE_DEFINITIONS } = require("../../dist/shared/workflowIntakeContracts.js");
  const { WORKFLOW_TYPE_REGISTRY } = require("../../dist/shared/projectState/workflowTypeRegistry.js");
  const env = await setup(context), app = createWorkflowApplicationService(), intake = createWorkflowIntakeService();
  try {
    for (const [workflowType, definition] of Object.entries(WORKFLOW_INTAKE_DEFINITIONS).filter(([type]) => type !== "project-creation")) {
      const id = (await app.startDirectWorkflow(env.root, { workflowType, title: "Intake fixture" })).workflow.workflowId;
      const otherId = (await app.startDirectWorkflow(env.root, { workflowType, title: "Intake fixture" })).workflow.workflowId;
      assert.equal((await intake.getWorkflowIntake(env.root, id)).values, null);
      const values = Object.fromEntries(definition.fields.map(field => [field.key, `  ${field.key} content  `]));
      await intake.saveWorkflowIntake(env.root, id, { workflowType, values });
      assert.deepEqual((await intake.getWorkflowIntake(env.root, id)).values, Object.fromEntries(Object.entries(values).map(([k,v]) => [k,v.trim()])));
      assert.equal((await intake.getWorkflowIntake(env.root, otherId)).values, null);
      const first = definition.fields[0].key;
      for (const bad of [
        { workflowType: workflowType === "issue-resolution" ? "feature-capability" : "issue-resolution", values },
        { workflowType, values: { ...values, extra: "no" } },
        { workflowType, values: { ...values, [first]: " " } },
        { workflowType, values: { ...values, [first]: "Invalid\u0000content" } },
        { workflowType, values: { ...values, [first]: "a".repeat(4097) } },
        { workflowType, values: { ...values, [first]: "😀".repeat(1025) } },
      ]) await assert.rejects(intake.saveWorkflowIntake(env.root, id, bad));
      const missing = { ...values }; delete missing[first];
      await assert.rejects(intake.saveWorkflowIntake(env.root, id, { workflowType, values: missing }));
      if (workflowType === "feature-capability") assert.equal((await createFeaturePlanningService().get(env.root, id)).intake[first], values[first].trim());
      else if (workflowType === "issue-resolution") assert.equal((await createIssuePlanningService().get(env.root, id)).intake[first], values[first].trim());
      else {
        const before = (await env.store.listEntities(env.projectId, "Finding")).filter(r => r.body.category.startsWith(`workflow-intake:${workflowType}:`));
        const optional = definition.fields.find(field => !field.required).key;
        await intake.saveWorkflowIntake(env.root, id, { workflowType, values: { ...values, [optional]: "" } });
        assert.equal((await intake.getWorkflowIntake(env.root, id)).values[optional], undefined);
        const after = (await env.store.listEntities(env.projectId, "Finding")).filter(r => r.body.category.startsWith(`workflow-intake:${workflowType}:`));
        assert.deepEqual(after.map(r => r.id).sort(), before.map(r => r.id).sort());
        assert.equal(after.length, 0);
        await intake.saveWorkflowIntake(env.root, id, { workflowType, values });
        assert.equal((await intake.getWorkflowIntake(env.root, id)).values[optional], values[optional].trim());
        const requiredOnly = Object.fromEntries(definition.fields.filter(f => f.required).map(f => [f.key, "required"]));
        await intake.saveWorkflowIntake(env.root, otherId, { workflowType, values: requiredOnly });
        assert.deepEqual((await intake.getWorkflowIntake(env.root, otherId)).values, requiredOnly);
      }
      const record = await env.store.getEntity(env.projectId, id);
      assert.equal(record.body.currentWorkspace, WORKFLOW_TYPE_REGISTRY[workflowType].entryWorkspace);
      await env.state.reviseRecord(env.projectId, id, { currentWorkspace: "unrelated-intake" }, record.recordVersion);
      await assert.rejects(intake.saveWorkflowIntake(env.root, id, { workflowType, values }), /entry workspace/);
    }
    await assert.rejects(intake.getWorkflowIntake(env.root, "missing"));
  } finally { env.store.close(); }
});

test("generic intake IPC and preload bound arguments while preserving later planning APIs", async context => {
  const { registerWorkflowApplicationIpc } = require("../../dist/main/workflow/workflowApplicationIpc.js");
  const env = await setup(context), handlers = new Map();
  registerWorkflowApplicationIpc({ handle: (channel, fn) => handlers.set(channel, fn) }, () => env.root);
  try {
    const id = (await createWorkflowApplicationService().startDirectWorkflow(env.root, { workflowType: "research-prototype", title: "Research" })).workflow.workflowId;
    const get = handlers.get("workflow:getIntake"), save = handlers.get("workflow:saveIntake");
    assert.equal((await get({}, id)).values, null);
    const { WORKFLOW_INTAKE_DEFINITIONS } = require("../../dist/shared/workflowIntakeContracts.js");
    const payload = { workflowType: "research-prototype", values: Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS["research-prototype"].fields.filter(f => f.required).map(f => [f.key, "evidence"])) };
    assert.ok((await save({}, id, payload)).values);
    for (const args of [[], [id, "extra"], [null], ["x".repeat(129)]]) await assert.rejects(async () => get({}, ...args));
    for (const args of [[], [id], [id, payload, "extra"], [id, { ...payload, extra: true }], [id, { ...payload, values: [] }]]) await assert.rejects(async () => save({}, ...args));
    const preload = fs.readFileSync(path.join(__dirname, "../../src/preload/index.ts"), "utf8");
    assert.doesNotMatch(preload, /saveFeatureIntake|saveIssueWorkflowIntake/);
    for (const method of ["getWorkflowIntake", "saveWorkflowIntake", "getFeaturePlanning", "prepareFeaturePlanning", "actOnFeaturePlanning", "getIssueWorkflowPlanning", "prepareIssueWorkflowPlanning", "actOnIssueWorkflowPlanning"]) assert.ok(preload.includes(method));
  } finally { env.store.close(); }
});


test("structured Intake imports all seven legacy families once, preserves evidence and imports exact Greenfield review", async context => {
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
  const {writeCanonicalMarkdownDocument} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const {resolveStructuredArchitectInterviewIntake} = require("../../dist/main/architectInterview/architectInterviewContextResolver.js");
  const env = await setup(context), intake = createWorkflowIntakeService(), app = createWorkflowApplicationService();
  const featureTitles = ["Requested Capability Delta", "Current Product Baseline", "Scope In", "Scope Out", "Constraints", "Behavior and Contracts to Preserve", "Affected Architecture and Integration Points", "Evidence and Regression Boundary", "Compatibility and Rollout"];
  const issueTitles = ["Issue title", "Observed behavior", "Expected behavior", "Reproduction steps", "Environment", "Known impact", "Constraints"];
  try {
    for (const [workflowType, definition] of Object.entries(WORKFLOW_INTAKE_DEFINITIONS)) {
      const workflow = workflowType === "project-creation" ? (await env.state.createProjectCreationWorkflow(env.projectId, {title: "Registered existing Greenfield"})).workflow : await env.store.getEntity(env.projectId, (await app.startDirectWorkflow(env.root, {workflowType, title: "Legacy intake fixture"})).workflow.workflowId);
      const values = Object.fromEntries(definition.fields.filter(f => f.required).map(f => [f.key, f.key === "hasExistingSourceOrPlanning" ? false : f.key === "projectType" ? "Desktop application" : f.key === "projectRepository" ? env.root : `${f.key} legacy content`]));
      let originalMarkdown;
      if (workflowType === "project-creation") {
        const relativePath = "planning/project/Project_Intake/PROJECT_INTAKE_legacy.md";
        writeCanonicalMarkdownDocument({workspaceRoot: env.root, relativePath, metadata: {schemaVersion: 1, artifactType: "project-intake", artifactRevision: 2, participationRole: "gatingReview", identity: {"Project.ArtifactKey": "legacy"}, sourceRevisions: [], workflowData: values, documentDisposition: {status: "Approved", notes: "Historical approval", reviewedAt: "2026-01-02T03:04:05.000Z"}}, bodyMarkdown: "# Legacy Project Intake"});
        originalMarkdown = fs.readFileSync(path.join(env.root, relativePath), "utf8");
      } else {
        for (const [index, field] of definition.fields.entries()) {
          const omitted = values[field.key] === undefined;
          const record = await env.state.createRecord(env.projectId, "Finding", {title: workflowType === "feature-capability" ? featureTitles[index] : workflowType === "issue-resolution" ? issueTitles[index] : field.label, statement: omitted ? "Optional intake field omitted by Operator." : values[field.key], category: workflowType === "feature-capability" ? "feature-intake" : workflowType === "issue-resolution" ? "issue-intake" : `workflow-intake:${workflowType}:${field.key}`, impact: "Legacy context", observedAt: "2026-01-01T00:00:00.000Z", findingState: omitted ? "omitted" : "current"});
          await env.state.createRelationship(env.projectId, record.id, "workflow_member", workflow.id);
        }
      }
      const legacyBefore = await env.store.listEntities(env.projectId, "Finding");
      const workspaceBefore = await env.store.getEntity(env.projectId, workflow.id);
      assert.equal((await intake.previewWorkflowIntakeMigration(env.root, workflow.id)).status, "ready");
      assert.equal((await env.store.listEntities(env.projectId, "WorkflowIntake")).filter(r => r.body.workflowId === workflow.id).length, 0, "Preview never mutates");
      const imported = await intake.applyWorkflowIntakeMigration(env.root, workflow.id);
      assert.deepEqual(imported.values, values);
      assert.equal(imported.recordVersion, 1);
      const record = await env.store.getEntity(env.projectId, imported.intakeId);
      assert.equal(record.provenance.origin, "legacy-import");
      assert.deepEqual(await env.store.listEntities(env.projectId, "Finding"), legacyBefore);
      assert.deepEqual(await env.store.getEntity(env.projectId, workflow.id), workspaceBefore);
      assert.deepEqual(await intake.ensureWorkflowIntake(env.root, workflow.id), imported);
      assert.equal((await intake.previewWorkflowIntakeMigration(env.root, workflow.id)).status, "not-needed");
      if (workflowType === "project-creation") {
        assert.equal(record.provenance.sourceRef, "planning/project/Project_Intake/PROJECT_INTAKE_legacy.md");
        assert.equal(imported.disposition.state, "approved");
        assert.equal(imported.disposition.effectiveAt, "2026-01-02T03:04:05.000Z");
        const decision = await env.store.getEntity(env.projectId, imported.disposition.decisionId);
        assert.equal(decision.body.decisionScope, `workflow-intake:${imported.intakeId}@1`);
        assert.match(decision.body.rationale, /Historical approval/);
        assert.deepEqual((await resolveStructuredArchitectInterviewIntake(env.root)).values, values);
        const architect = require("../../dist/main/architectInterview/architectInterviewService.js").getArchitectInterviewWorkspaceModel(env.root);
        assert.equal(architect.state, "prompt-missing");
        assert.equal(architect.intakeRecoveryDetail.logicalDocumentId, imported.intakeId);
        assert.equal(architect.intakeRecoveryDetail.bodyMarkdown, imported.reviewDocument.bodyMarkdown);

        await intake.saveProjectCreationIntake(env.root, workflow.id, {...values, projectRepository: "ignored", projectPurpose: "Revised structured purpose"}, 1);
        assert.equal((await intake.getWorkflowIntake(env.root, workflow.id)).values.projectRepository, fs.realpathSync(env.root));
        assert.equal((await intake.getWorkflowIntake(env.root, workflow.id)).disposition.state, "none");
        assert.match(fs.readFileSync(path.join(env.root, record.provenance.sourceRef), "utf8"), /GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE/);
        await assert.rejects(intake.reviewWorkflowIntake(env.root, workflow.id, {expectedIntakeRecordVersion: 1, outcome: "approved"}), /stale/);
        await intake.reviewWorkflowIntake(env.root, workflow.id, {expectedIntakeRecordVersion: 2, outcome: "approved"});
      } else if (workflowType === "feature-capability") {
        await approveIntake(env.root, workflow.id);
        const prepared = await createFeaturePlanningService().prepare(env.root, workflow.id, "assessment");
        assert.match(prepared.draft.instruction, new RegExp(`WorkflowIntake ${imported.intakeId}@1`));
      } else if (workflowType === "issue-resolution") {
        await approveIntake(env.root, workflow.id);
        const prepared = await createIssuePlanningService().prepare(env.root, workflow.id, "rca");
        assert.match(prepared.draft.instruction, new RegExp(`WorkflowIntake ${imported.intakeId}@1`));
      } else {
        const revised = await intake.saveWorkflowIntake(env.root, workflow.id, {workflowType, values: {...values, [definition.fields[0].key]: "Structured revision"}}, 1);
        assert.equal(revised.intakeId, imported.intakeId); assert.equal(revised.recordVersion, 2);
      }
      assert.deepEqual(await env.store.listEntities(env.projectId, "Finding"), legacyBefore);
    }
    assert.equal((await env.store.listEntities(env.projectId, "WorkflowIntake")).length, 7);
  } finally {env.store.close();}
});

test("Intake migration blocks duplicate field sources and duplicate Greenfield documents without mutation", async context => {
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const {writeCanonicalMarkdownDocument} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const env = await setup(context), intake = createWorkflowIntakeService(), app = createWorkflowApplicationService();
  try {
    const refactor = (await app.startDirectWorkflow(env.root, {workflowType: "refactor-migration", title: "Duplicate field fixture"})).workflow.workflowId;
    for (let index = 0; index < 2; index++) {
      const finding = await env.state.createRecord(env.projectId, "Finding", {title: "Objective", statement: "Same value", category: "workflow-intake:refactor-migration:transformationObjective", impact: "Legacy", observedAt: new Date().toISOString(), findingState: "current"});
      await env.state.createRelationship(env.projectId, finding.id, "workflow_member", refactor);
    }
    assert.match((await intake.previewWorkflowIntakeMigration(env.root, refactor)).reason, /Duplicate legacy Intake field/);
    await assert.rejects(intake.ensureWorkflowIntake(env.root, refactor), /Duplicate legacy Intake field/);
    const greenfield = (await env.state.createProjectCreationWorkflow(env.projectId, {title: "Ambiguous Greenfield"})).workflow;
    for (const key of ["one", "two"]) writeCanonicalMarkdownDocument({workspaceRoot: env.root, relativePath: `planning/project/Project_Intake/PROJECT_INTAKE_${key}.md`, metadata: {schemaVersion: 1, artifactType: "project-intake", artifactRevision: 1, participationRole: "gatingReview", identity: {"Project.ArtifactKey": key}, sourceRevisions: [], workflowData: {}, documentDisposition: {status: "Pending", notes: "", reviewedAt: null}}, bodyMarkdown: "# Legacy"});
    const before = await env.store.listEntities(env.projectId);
    assert.match((await intake.previewWorkflowIntakeMigration(env.root, greenfield.id)).reason, /Ambiguous canonical Greenfield/);
    await assert.rejects(intake.applyWorkflowIntakeMigration(env.root, greenfield.id), /Ambiguous canonical Greenfield/);
    assert.deepEqual(await env.store.listEntities(env.projectId), before);
    const unaffected = (await app.startDirectWorkflow(env.root, {workflowType: "research-prototype", title: "Unaffected"})).workflow.workflowId;
    assert.equal((await intake.previewWorkflowIntakeMigration(env.root, unaffected)).status, "not-needed");
    assert.equal((await intake.ensureWorkflowIntake(env.root, unaffected)).values, null);
  } finally {env.store.close();}
});


test("newly registered Projects lazily import existing Greenfield dispositions without schema changes", async context => {
  const {DatabaseSync} = require("node:sqlite");
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const {writeCanonicalMarkdownDocument} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const {resolveStructuredArchitectInterviewIntake} = require("../../dist/main/architectInterview/architectInterviewContextResolver.js");
  const outcomes = {Pending: "none", Approved: "approved", RevisionRequested: "revision_requested", Rejected: "rejected"};
  for (const [status, expected] of Object.entries(outcomes)) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-existing-greenfield-"));
    context.after(() => fs.rmSync(root, {recursive: true, force: true}));
    const relativePath = "planning/project/Project_Intake/PROJECT_INTAKE_existing.md";
    const values = {projectName: "Existing Greenfield", projectPurpose: "Preserved legacy purpose", desiredOutcome: "Legacy outcome", projectType: "Desktop application", projectRepository: root, hasExistingSourceOrPlanning: true, knownConstraints: "", repositoryReviewContext: "Existing planning"};
    const metadata = {schemaVersion: 1, artifactType: "project-intake", artifactRevision: 1, participationRole: "gatingReview", identity: {"Project.ArtifactKey": "existing"}, sourceRevisions: [], workflowData: values, documentDisposition: {status, notes: "Historical review notes", reviewedAt: status === "Pending" ? null : "2026-02-03T04:05:06.000Z"}};
    writeCanonicalMarkdownDocument({workspaceRoot: root, relativePath, metadata, bodyMarkdown: "# Existing Intake before registration"});
    const legacy = fs.readFileSync(path.join(root, relativePath), "utf8");
    const registration = await registerCurrentProject(root, "greenfield", {projectName: values.projectName});
    const store = createSQLiteProjectStateStore(database(root));
    try {
      const state = createProjectStateService(store, operator);
      const {workflow} = await state.createProjectCreationWorkflow(registration.project.id, {title: "New registration of existing Intake"});
      const schema = () => {const db = new DatabaseSync(database(root), {readOnly: true}); try {return db.prepare("SELECT name, sql FROM sqlite_master ORDER BY name").all();} finally {db.close();}};
      const beforeSchema = schema(), beforeWorkflow = await store.getEntity(registration.project.id, workflow.id);
      const service = createWorkflowIntakeService();
      const imported = await service.ensureWorkflowIntake(root, workflow.id);
      assert.equal(imported.disposition.state, expected);
      assert.equal(imported.values.knownConstraints, undefined);
      assert.equal(imported.values.hasExistingSourceOrPlanning, true);
      assert.deepEqual(await service.applyWorkflowIntakeMigration(root, workflow.id), imported);
      assert.deepEqual(await store.getEntity(registration.project.id, workflow.id), beforeWorkflow);
      assert.deepEqual(schema(), beforeSchema);
      assert.match(fs.readFileSync(path.join(root, relativePath), "utf8"), /GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE/);
      if (status !== "Pending") {
        const decision = await store.getEntity(registration.project.id, imported.disposition.decisionId);
        assert.equal(decision.body.rationale, "Historical review notes");
        assert.equal(decision.body.decidedAt, "2026-02-03T04:05:06.000Z");
      }
      if (status === "Approved") {
        writeCanonicalMarkdownDocument({workspaceRoot: root, relativePath, metadata: {...metadata, workflowData: {...values, projectPurpose: "Changed historical purpose"}, documentDisposition: {status: "Rejected", notes: "Later historical edit", reviewedAt: null}}, bodyMarkdown: "# Historical evidence changed"});
        assert.equal((await resolveStructuredArchitectInterviewIntake(root)).values.projectPurpose, "Preserved legacy purpose");
        assert.equal((await service.previewWorkflowIntakeMigration(root, workflow.id)).status, "not-needed");
      }
    } finally {store.close();}
  }
});

test("new Issue RCA can cite structured Intake Evidence without creating Intake Findings", async context => {
  const env = await setup(context), app = createWorkflowApplicationService(), issue = createIssuePlanningService();
  try {
    const id = (await app.startDirectWorkflow(env.root, {workflowType: "issue-resolution", title: "Structured RCA"})).workflow.workflowId;
    await issue.saveIntake(env.root, id, {title: "Failure", observed: "Observed failure", expected: "Success", reproduction: "Run fixture", environment: "Test", impact: "Blocked", constraints: "Preserve behavior"});
    const model = await issue.addEvidence(env.root, id, [{name: "proof.txt", mediaType: "text/plain", base64: Buffer.from("Failure proof").toString("base64"), description: "Failure proof"}]);
    await approveIntake(env.root, id);
    await issue.prepare(env.root, id, "rca");
    await issue.act(env.root, id, {type: "save-draft", content: "Root cause based on structured Intake and supplied Evidence"});
    const result = await issue.act(env.root, id, {type: "decide-rca", outcome: "accept", rationale: "Exact Intake and Evidence support this cause", rootCauses: [{title: "Cause", statement: "Cause explains failure", rationale: "Evidence reproduces the failure", findingIds: [], evidenceIds: [model.evidence[0].id]}]});
    assert.equal(result.rootCauses.length, 1);
    assert.equal((await env.store.listEntities(env.projectId, "Finding")).filter(r => r.body.category === "issue-intake").length, 0);
  } finally {env.store.close();}
});


test("SQL Intake projection rebuild, manual edits, exact review, failure isolation and authority fences", async context => {
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const {registerWorkflowApplicationIpc} = require("../../dist/main/workflow/workflowApplicationIpc.js");
  const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
  const {listPlanningDocuments} = require("../../dist/main/documents/planningDocumentService.js");
  const {writeCanonicalMarkdownDocument} = require("../../dist/main/documents/canonicalMarkdownDocumentWriter.js");
  const env = await setup(context), service = createWorkflowIntakeService(), handlers = new Map();
  registerWorkflowApplicationIpc({handle: (channel, handler) => handlers.set(channel, handler)}, () => env.root);
  try {
    const workflow = (await createWorkflowApplicationService().startDirectWorkflow(env.root, {workflowType: "refactor-migration", title: "Projection fixture"})).workflow;
    const id = workflow.workflowId;
    assert.equal((await handlers.get("workflow:getIntake")({}, id)).values, null);
    const payload = {workflowType: workflow.workflowType, values: Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS[workflow.workflowType].fields.filter(f => f.required).map(f => [f.key, `${f.key} fixture`]))};
    const saved = await handlers.get("workflow:saveIntake")({}, id, payload, undefined);
    assert.equal(saved.recordVersion, 1); assert.equal(saved.reviewDocument.effectiveDisposition, "Pending");
    const file = path.join(env.root, saved.reviewDocument.markdownPath);
    const content = fs.readFileSync(file, "utf8");
    assert.match(content, /GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE/);
    assert.equal(listPlanningDocuments(env.root).some(d => d.markdownPath === saved.reviewDocument.markdownPath), false);
    writeCanonicalMarkdownDocument({workspaceRoot: env.root, relativePath: "planning/unrelated-notes.md", metadata: {schemaVersion: 1, artifactType: "context-notes", artifactRevision: 1, participationRole: "contextOnly", identity: {}, sourceRevisions: [], workflowData: {}, documentDisposition: {status: "Pending", notes: "", reviewedAt: null}}, bodyMarkdown: `# Notes\n\nQuoted marker: ${require("../../dist/shared/documents/generatedIntakeProjection.js").GENERATED_INTAKE_MARKER}`});
    assert.equal(listPlanningDocuments(env.root).some(d => d.markdownPath === "planning/unrelated-notes.md"), true, "Unrelated Markdown quoting the marker remains discoverable");
    const {writeIntakeProjection} = require("../../dist/main/workflow/workflowIntakeProjectionWriter.js");
    assert.throws(() => writeIntakeProjection(env.root, {...saved.reviewDocument, markdownPath: "../escaped.md"}), /path/i);
    const directory = path.dirname(file), backup = directory + "-held";
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-intake-outside-"));
    context.after(() => fs.rmSync(outside, {recursive: true, force: true}));
    fs.renameSync(directory, backup);
    try {
      fs.symlinkSync(outside, directory, process.platform === "win32" ? "junction" : "dir");
      assert.throws(() => writeIntakeProjection(env.root, saved.reviewDocument), /contained real directories/);
      assert.deepEqual(fs.readdirSync(outside), []);
    } finally {
      if (fs.existsSync(directory)) fs.unlinkSync(directory);
      fs.renameSync(backup, directory);
    }
    fs.unlinkSync(file);
    assert.deepEqual(await handlers.get("workflow:getIntake")({}, id), saved);
    assert.equal(fs.readFileSync(file, "utf8"), content);
    fs.writeFileSync(file, "Manual text is never an Intake mutation.");
    assert.deepEqual((await env.store.getEntity(env.projectId, saved.intakeId)).body.values, payload.values);
    assert.deepEqual(await service.ensureWorkflowIntake(env.root, id), saved);
    const approved = await handlers.get("workflow:reviewIntake")({}, id, {expectedIntakeRecordVersion: 1, outcome: "approved", notes: "Reviewed"});
    assert.equal(approved.reviewDocument.effectiveDisposition, "Approved");
    assert.match(fs.readFileSync(file, "utf8"), /"disposition":"Approved"/);
    await assert.rejects(Promise.resolve().then(() => handlers.get("workflow:reviewIntake")({}, id, {expectedIntakeRecordVersion: 1, outcome: "approved", legacyReviewedAt: "2000-01-01"})), /Bounded/);
    const revised = await handlers.get("workflow:saveIntake")({}, id, {...payload, values: {...payload.values, transformationObjective: "New objective"}}, 1);
    assert.equal(revised.recordVersion, 2); assert.equal(revised.reviewDocument.effectiveDisposition, "Pending");
    await assert.rejects(handlers.get("workflow:reviewIntake")({}, id, {expectedIntakeRecordVersion: 1, outcome: "approved"}), /stale/);
    fs.unlinkSync(file); fs.mkdirSync(file);
    const failed = await service.saveWorkflowIntake(env.root, id, payload, 2);
    assert.match(failed.materializationError, /SQL Intake is committed/);
    assert.equal((await env.store.getEntity(env.projectId, saved.intakeId)).recordVersion, 3);
    fs.rmdirSync(file);
    const {DatabaseSync} = require("node:sqlite");
    const db = new DatabaseSync(database(env.root));
    try { db.prepare("INSERT INTO project_state_authority (project_id,generation,authority,updated_at) VALUES (?,1,'structured',?) ON CONFLICT(project_id) DO UPDATE SET authority='structured'").run(env.projectId, new Date().toISOString()); } finally {db.close();}
    const structured = await service.ensureWorkflowIntake(env.root, id);
    assert.equal(structured.materializationError, undefined); assert.equal(fs.readFileSync(file, "utf8"), structured.reviewDocument.bodyMarkdown);
    assert.throws(() => writeCanonicalMarkdownDocument({workspaceRoot: env.root, relativePath: "planning/unrelated.md", metadata: {}, bodyMarkdown: "Legacy authority"}), /structured|legacy|authority/i);
  } finally {env.store.close();}
});


test("Greenfield SQL Intake preserves its generated path and prepares Interview from current approval", async context => {
  const env = await setup(context);
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const {regenerateArchitectInterviewPrompt} = require("../../dist/main/architectInterview/architectInterviewService.js");
  const {resolveFirstNonApprovedDocument} = require("../../dist/main/documents/firstNonApprovedResolver.js");
  const {resolveProjectPlanningContext} = require("../../dist/main/projectPlanning/projectPlanningContext.js");
  try {
    const workflow = (await env.state.createProjectCreationWorkflow(env.projectId,{title:"Greenfield fixture"})).workflow;
    const service = createWorkflowIntakeService();
    const payload = {workflowType:"project-creation",values:{projectName:"My Greenfield",projectPurpose:"Create",desiredOutcome:"Deliver",projectType:"Desktop application",projectRepository:"untrusted renderer repository",hasExistingSourceOrPlanning:false}};
    let saved = await service.saveWorkflowIntake(env.root,workflow.id,payload);
    assert.equal(saved.values.projectRepository,fs.realpathSync(env.root));
    assert.equal(saved.reviewDocument.markdownPath,"planning/project/Project_Intake/PROJECT_INTAKE_my_greenfield.md");
    await assert.rejects(regenerateArchitectInterviewPrompt(env.root),/approved/i);
    await service.reviewWorkflowIntake(env.root,workflow.id,{expectedIntakeRecordVersion:saved.recordVersion,outcome:"approved"});
    const prepared = await regenerateArchitectInterviewPrompt(env.root);
    assert.equal(prepared.canPrepareHandoff,true);
    assert.equal(resolveFirstNonApprovedDocument(env.root).activeWorkspaceId,"architect-interview");
    const generated = path.join(env.root,saved.reviewDocument.markdownPath);
    fs.writeFileSync(generated,"A manual file edit cannot remove SQL approval.");
    assert.equal(resolveFirstNonApprovedDocument(env.root).activeWorkspaceId,"architect-interview");
    assert.match(resolveProjectPlanningContext(env.root).reason,/Architect Interview output/);
    saved = await service.saveWorkflowIntake(env.root,workflow.id,{...payload,values:{...payload.values,projectName:"Renamed project"}},saved.recordVersion);
    assert.equal(saved.reviewDocument.markdownPath,"planning/project/Project_Intake/PROJECT_INTAKE_my_greenfield.md");
    assert.equal(saved.reviewDocument.effectiveDisposition,"Pending");
    assert.equal(resolveFirstNonApprovedDocument(env.root).document.owningWorkspaceId,"project-intake-capture");
    await service.reviewWorkflowIntake(env.root,workflow.id,{expectedIntakeRecordVersion:saved.recordVersion,outcome:"approved"});
    assert.equal((await regenerateArchitectInterviewPrompt(env.root)).canPrepareHandoff,true);
    const prompt = require("../../dist/shared/documents/canonicalMarkdown.js").parseCanonicalMarkdownDocument(fs.readFileSync(path.join(env.root,prepared.promptDocument.markdownPath),"utf8"));
    assert.equal(prompt.metadata.artifactRevision,2);
    assert.equal(prompt.metadata.sourceRevisions[0].revision,saved.recordVersion);
  } finally {env.store.close();}
});
