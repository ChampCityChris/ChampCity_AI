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

async function reviewSqlGraph(env, workflowId, graph, outcome = "approved", notes = "Review exact Plan") {
  const service = require("../../dist/main/workPlanning/exactWorkflowPlanningService.js").createExactWorkflowPlanningService();
  const model = await service.prepare(env.root, workflowId);
  const sources = JSON.parse(model.handoff.split("Required exact sources: ").at(-1));
  const type = model.workflowType;
  const proposed = graph ?? {workflowId, solution:{title:"Proposed correction",objective:"Repair the evidenced Issue",scopeIn:["correction"],scopeOut:[],constraints:[],assumptions:[],risks:[]},solutionCriteria:[],workItems:[{key:"correction",kind:"fix",title:"Correct defect",objective:"Restore expected behavior",dependencyKeys:[],criteria:[]}]};
  const {topology: _, ...semantic} = proposed;
  const saved = await service.save(env.root, workflowId, {...semantic,workflowType:type,sources,expectedRecordVersion:model.review?.recordVersion ?? model.staleReview?.recordVersion});
  await service.review(env.root, workflowId, saved.review.cycleId, {expectedRecordVersion:saved.review.recordVersion,outcome,notes});
  return type === "issue-resolution" ? createIssuePlanningService().get(env.root, workflowId) : createFeaturePlanningService().get(env.root, workflowId);
}

async function approveIntake(root, id) {
  const service = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
  const intake = await service.ensureWorkflowIntake(root, id);
  await service.reviewWorkflowIntake(root, id, {expectedIntakeRecordVersion: intake.recordVersion, outcome: "approved"});
}

function groups(inventory) { return new Map(inventory.groups.map(group => [group.workflowType, group.workflows])); }

async function architectFixture(env, workflowType, title = "Architect fixture") {
  const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
  const intake = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
  const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
  const {workflow} = await createWorkflowApplicationService().startDirectWorkflow(env.root, {workflowType, title});
  const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS[workflowType].fields.filter(field => field.required).map(field => [field.key, `${field.key} fixture`]));
  await intake.saveWorkflowIntake(env.root, workflow.workflowId, {workflowType, values});
  await approveIntake(env.root, workflow.workflowId);
  const prepared = await architect.prepare(env.root, workflow.workflowId);
  return {workflow, architect, input: {intakeId: prepared.intakeId, intakeVersion: prepared.intakeVersion}, prepared};
}

function assertArchitectHandoff(model, type) {
  const {GREENFIELD_ARCHITECT_SECTIONS, FEATURE_ARCHITECT_SECTIONS, ASSESSMENT_SECTIONS, validateArchitectCandidateOutput} = require("../../dist/shared/architectWorkspaceContracts.js");
  const handoff = model.handoff;
  const blocks = handoff.split("\n\n");
  const templateIndex = blocks.findIndex(block => block.startsWith("Workflow-specific JSON template"));
  assert.ok(templateIndex >= 0);
  const output = JSON.parse(blocks[templateIndex + 1]);
  assert.ok(handoff.includes("100000"));
  assert.ok(handoff.includes("UTF-8"));
  const groundZero = "Project ground zero is the selected repository plus the local development machine. Distinguish verified installed, verified missing and unverified capabilities, repository bootstrap mechanisms and explicitly externally managed capabilities. Missing required capabilities are Project work unless approved evidence establishes external ownership.";
  assert.equal(blocks.filter(block => block === groundZero).length, 1);
  assert.equal(handoff.includes("Project Planning Direction must"), type === "project-creation");
  assert.ok(handoff.includes("never Operator Decisions"));
  if (type === "issue-resolution") {
    assert.deepEqual(Object.keys(output), ["rootCauses"]);
    assert.match(handoff, /1-12 typed RootCause/);
    assert.match(handoff, /title .*200 bytes/);
    assert.match(handoff, /each at most 4096 bytes/);
    assert.match(handoff, /Optional confidence.*between 0 and 1/);
    assert.match(handoff, /0-32 unique string IDs.*128 characters/);
    assert.match(handoff, /at least one valid supplied Finding or Evidence before persistence succeeds/);
    assert.match(handoff, /exact IDs supplied/);
    assert.ok(!handoff.includes("Feature dimensions"));
    const evidence = model.supportRecords.find(record => record.entityType === "Evidence");
    assert.ok(evidence, "Actual handoff supplies a valid Evidence ID");
    output.rootCauses[0].evidenceIds = [evidence.id];
  } else {
    const sections = type === "project-creation" ? GREENFIELD_ARCHITECT_SECTIONS : type === "feature-capability" ? FEATURE_ARCHITECT_SECTIONS : ASSESSMENT_SECTIONS[type];
    assert.deepEqual(Object.keys(output), Object.keys(sections));
    for (const key of Object.keys(sections)) assert.ok(handoff.includes(key));
    if (type === "project-creation") {
      assert.match(handoff, /exactly the fifteen/);
      assert.match(handoff, /array of 1-32.*4000 bytes/);
      assert.match(handoff, /Maximum 200 total items/);
      assert.match(handoff, /sum of UTF-8 bytes of JSON-serialized section arrays/);
      assert.match(handoff, /projectPlanningDirection joined with newline.*4096 bytes/);
      assert.ok(Object.values(output).every(Array.isArray));
      assert.ok(!handoff.includes("scalar string"));
    } else {
      assert.match(handoff, /one nonempty scalar string, not an array/);
      assert.ok(handoff.includes(`at most ${type === "feature-capability" ? 4096 : 4000} bytes`));
      assert.ok(Object.values(output).every(value => typeof value === "string"));
      if (type === "feature-capability") assert.match(handoff, /All seven dimensions are required/);
      else assert.ok(!handoff.includes("seven dimensions"));
      assert.ok(!handoff.includes("array of 1-32"));
    }
    assert.ok(!handoff.includes("typed RootCause"));
  }
  if (type !== "project-creation") {
    assert.ok(!handoff.includes("Project Planning Direction must"));
    assert.ok(!handoff.includes("GREENFIELD_ARCHITECT_SECTIONS"));
  }
  assert.doesNotThrow(() => validateArchitectCandidateOutput(type, output));
  const other = type === "feature-capability" ? Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key => [key, ["Direction"]])) : acceptedAssessment;
  assert.throws(() => validateArchitectCandidateOutput(type, other));
  return output;
}

async function reviewFeatureCandidate(root, id, outcome, rationale, output = acceptedAssessment) {
  const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
  const current = await architect.prepare(root, id);
  const saved = await architect.save(root, id, {intakeId: current.intakeId, intakeVersion: current.intakeVersion, expectedCycleVersion: current.cycleVersion, output});
  await architect.review(root, id, saved.review.cycleId, {expectedRecordVersion: saved.review.recordVersion, outcome: {accept: "approved", revision: "revision_requested", reject: "rejected"}[outcome], notes: rationale});
  const planner = createFeaturePlanningService();
  return outcome === "accept" ? planner.prepare(root, id, "plan") : planner.get(root, id);
}

async function reviewIssueCandidate(root, id, action) {
  const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
  const current = await architect.prepare(root, id);
  const finding = current.supportRecords.find(record => record.entityType === "Finding" && record.body.findingState === "current");
  const evidence = current.supportRecords.find(record => record.entityType === "Evidence" && record.body.evidenceType === "issue-supplied");
  const rootCauses = action.rootCauses ?? [{title: "Investigated fixture cause", statement: "Proposed explanation of the observed fixture failure", rationale: action.rationale, findingIds: finding ? [finding.id] : [], evidenceIds: evidence ? [evidence.id] : []}];
  const saved = await architect.save(root, id, {intakeId: current.intakeId, intakeVersion: current.intakeVersion, expectedCycleVersion: current.cycleVersion, output: {rootCauses}});
  await architect.review(root, id, saved.review.cycleId, {expectedRecordVersion: saved.review.recordVersion, outcome: {accept: "approved", revision: "revision_requested", reject: "rejected"}[action.outcome], notes: action.rationale});
  const planner = createIssuePlanningService();
  return action.outcome === "accept" ? planner.prepare(root, id, "plan") : planner.get(root, id);
}

test("Feature and Issue Architect SQL candidates precede disposition and exact cycles gate their existing Planning", async context => {
  const env = await setup(context);
  try {
    const feature = await architectFixture(env, "feature-capability"), featurePlanner = createFeaturePlanningService();
    assertArchitectHandoff(feature.prepared, "feature-capability");
    const candidate = await feature.architect.save(env.root, feature.workflow.workflowId, {...feature.input, output: acceptedAssessment});
    assert.equal(candidate.review.disposition.state, "none");
    assert.equal((await env.store.listEntities(env.projectId, "Finding")).filter(record => record.body.category === "feature-assessment").length, 7);
    assert.equal((await featurePlanner.get(env.root, feature.workflow.workflowId)).acceptedAssessment.length, 0);
    await assert.rejects(featurePlanner.prepare(env.root, feature.workflow.workflowId, "plan"), /current Feature assessment/);
    const secondFeature = await architectFixture(env, "feature-capability", "Architect fixture");
    await assert.rejects(feature.architect.save(env.root, secondFeature.workflow.workflowId, {...feature.input, output: acceptedAssessment}), /approved Intake/);
    const projectionPath = path.join(env.root, candidate.review.relativePath); fs.writeFileSync(projectionPath, "Fake approval");
    assert.equal((await feature.architect.get(env.root, feature.workflow.workflowId)).review.disposition.state, "none");
    await feature.architect.review(env.root, feature.workflow.workflowId, candidate.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"});
    assert.equal((await featurePlanner.get(env.root, feature.workflow.workflowId)).acceptedAssessment.length, 7);
    await featurePlanner.prepare(env.root, feature.workflow.workflowId, "plan");
    const revised = await feature.architect.save(env.root, feature.workflow.workflowId, {...feature.input, expectedCycleVersion: 1, output: {...acceptedAssessment, compatibilityRollout: "Revised rollout"}});
    assert.equal(revised.review.recordVersion, 2); assert.equal(revised.review.disposition.state, "none");
    await assert.rejects(featurePlanner.prepare(env.root, feature.workflow.workflowId, "plan"), /current Feature assessment/);
    const issue = await architectFixture(env, "issue-resolution"), issues = createIssuePlanningService();
    const evidence = await issues.addEvidence(env.root, issue.workflow.workflowId, [{name: "failure.txt", mediaType: "text/plain", base64: Buffer.from("Observed failure log").toString("base64"), description: "Failure evidence"}]);
    const evidenceId = evidence.evidence[0].id;
    const handoffOutput = assertArchitectHandoff(await issue.architect.get(env.root, issue.workflow.workflowId), "issue-resolution");
    const output = {rootCauses: [{title: "State shape", statement: "Missing field causes the observed crash", rationale: "Supported by the supplied log", confidence: 0.8, findingIds: [], evidenceIds: [evidenceId]}]};
    const countBefore = (await env.store.listEntities(env.projectId, "RootCause")).length;
    await assert.rejects(issue.architect.save(env.root, issue.workflow.workflowId, {...issue.input, output: {rootCauses: [...output.rootCauses, {...output.rootCauses[0], evidenceIds: [candidate.review.sources[0].entityId]}]}}), /exact Issue/);
    assert.equal((await env.store.listEntities(env.projectId, "RootCause")).length, countBefore, "Candidate transaction rolls back every partial record");
    const rca = await issue.architect.save(env.root, issue.workflow.workflowId, {...issue.input, output: handoffOutput});
    assert.equal(rca.review.disposition.state, "none");
    const root = (await env.store.listEntities(env.projectId, "RootCause")).find(record => rca.review.sources.some(source => source.entityId === record.id));
    assert.equal(root.body.rootCauseState, "proposed");
    const links = await env.store.listRelationships(env.projectId);
    assert.ok(links.some(edge => edge.relationshipType === "derived_from" && edge.fromEntityId === root.id && edge.toEntityId === issue.input.intakeId));
    assert.ok(links.some(edge => edge.relationshipType === "supports" && edge.fromEntityId === evidenceId && edge.toEntityId === root.id));
    await assert.rejects(issues.prepare(env.root, issue.workflow.workflowId, "plan"), /current Issue RCA/);
    await issue.architect.review(env.root, issue.workflow.workflowId, rca.review.cycleId, {expectedRecordVersion: 1, outcome: "revision_requested", notes: "Explain the boundary"});
    assert.equal((await issues.get(env.root, issue.workflow.workflowId)).rcaState, "revision-requested");
    await issue.architect.review(env.root, issue.workflow.workflowId, rca.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"});
    const correction = await issues.prepare(env.root, issue.workflow.workflowId, "plan");
    assert.equal(correction.rootCauses[0].id, root.id);
    await issues.addEvidence(env.root, issue.workflow.workflowId, [{name: "more.txt", mediaType: "text/plain", base64: Buffer.from("Additional observed evidence").toString("base64"), description: "Additional evidence"}]);
    const changed = await issue.architect.get(env.root, issue.workflow.workflowId);
    assert.equal(changed.review.recordVersion, 2); assert.equal(changed.review.disposition.state, "none");
    await assert.rejects(issue.architect.review(env.root, issue.workflow.workflowId, rca.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"}), /stale/);
    assert.equal((await issues.get(env.root, issue.workflow.workflowId)).rootCauses.length, 0);
  } finally {env.store.close();}
});

test("legacy accepted Feature and Issue SQL sets adopt idempotently while conflicting ownership or duplicate sets block", async context => {
  const env = await setup(context);
  try {
    const feature = await architectFixture(env, "feature-capability"), before = await env.state.acceptFeatureAssessment(env.projectId, {workflowId: feature.workflow.workflowId, rationale: "Legacy issued approval", assessment: acceptedAssessment});
    const adopted = await feature.architect.get(env.root, feature.workflow.workflowId);
    assert.equal(adopted.review.disposition.state, "approved");
    assert.ok(before.findings.every(record => adopted.review.sources.some(source => source.entityId === record.id)));
    assert.equal((await feature.architect.get(env.root, feature.workflow.workflowId)).review.cycleId, adopted.review.cycleId);
    const issue = await architectFixture(env, "issue-resolution");
    const supplied = await createIssuePlanningService().addEvidence(env.root, issue.workflow.workflowId, [{name: "old.txt", mediaType: "text/plain", base64: Buffer.from("Legacy supplied log").toString("base64"), description: "Legacy log"}]);
    const accepted = await env.state.acceptIssueRca(env.projectId, {workflowId: issue.workflow.workflowId, rationale: "Legacy issued RCA approval", rootCauses: [{title: "Legacy cause", statement: "Observed defect", rationale: "Supplied log", findingIds: [], evidenceIds: [supplied.evidence[0].id]}]});
    const rca = await issue.architect.get(env.root, issue.workflow.workflowId);
    assert.equal(rca.review.disposition.state, "approved"); assert.ok(rca.review.sources.some(source => source.entityId === accepted.rootCauses[0].id));
    assert.equal((await issue.architect.get(env.root, issue.workflow.workflowId)).review.cycleId, rca.review.cycleId);
    const ambiguous = await architectFixture(env, "feature-capability");
    await env.state.acceptFeatureAssessment(env.projectId, {workflowId: ambiguous.workflow.workflowId, rationale: "Legacy approval", assessment: acceptedAssessment});
    const duplicate = await env.state.createRecord(env.projectId, "Finding", {title: "Duplicate dimension", statement: "Unreviewed conflicting set", category: "feature-assessment", impact: "Conflict", observedAt: new Date().toISOString(), findingState: "current"});
    await env.state.createRelationship(env.projectId, duplicate.id, "workflow_member", ambiguous.workflow.workflowId);
    await assert.rejects(ambiguous.architect.get(env.root, ambiguous.workflow.workflowId), /ambiguous|incomplete/);
    assert.equal(await env.state.getCurrentArchitectReviewCycle(env.projectId, ambiguous.workflow.workflowId, "feature-assessment"), null);
  } finally {env.store.close();}
});

for (const [type, workspace] of [["refactor-migration", "refactor-assessment"], ["integration-composition", "integration-assessment"], ["infrastructure-platform", "infrastructure-assessment"], ["research-prototype", "research-assessment"]]) {
  test(`${type} explicitly prepares its bounded SQL Architect assessment and gates Planning on current approved semantics`, async context => {
    const env = await setup(context);
    const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
    const intake = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
    const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
    const {ASSESSMENT_SECTIONS} = require("../../dist/shared/architectWorkspaceContracts.js");
    try {
      const {workflow} = await createWorkflowApplicationService().startDirectWorkflow(env.root, {workflowType: type, title: "Assessment fixture"});
      await assert.rejects(architect.prepare(env.root, workflow.workflowId), /Approve current/);
      const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS[type].fields.filter(field => field.required).map(field => [field.key, `${field.key} fixture`]));
      const savedIntake = await intake.saveWorkflowIntake(env.root, workflow.workflowId, {workflowType: type, values});
      await approveIntake(env.root, workflow.workflowId);
      assert.equal((await env.store.getEntity(env.projectId, workflow.workflowId)).body.currentWorkspace, workspace);
      const prepared = await architect.prepare(env.root, workflow.workflowId);
      assert.equal((await env.store.getEntity(env.projectId, workflow.workflowId)).body.currentWorkspace, workspace);
      assertArchitectHandoff(prepared, type);
      assert.ok(prepared.handoff.includes(env.projectId)); assert.ok(prepared.handoff.includes(type)); assert.ok(prepared.handoff.includes(`${savedIntake.intakeId}@1`));
      if (type === "research-prototype") {
        await env.state.recordEvidence(env.projectId, savedIntake.intakeId, {evidenceType: "experiment-supplied", description: "Actual supplied experiment observation", mediaType: "text/plain", payloadRef: "project-evidence:experiment.txt", digest: "a".repeat(64), size: 1});
        assert.equal((await architect.get(env.root, workflow.workflowId)).supportRecords.length, 1);
      }
      const output = Object.fromEntries(Object.keys(ASSESSMENT_SECTIONS[type]).map(key => [key, `${key} substantive direction`]));
      if (type === "research-prototype") output.researchOutcome = {outcome: "research-plan-required", prototypeDisposition: "disposable", productionFollowUp: "none", evidence: ["Bounded research evidence"], decisionEnabled: "Select experiment", successFailureResult: "Observed result", closureCondition: "Question answered"};
      const input = {intakeId: savedIntake.intakeId, intakeVersion: 1, output};
      await assert.rejects(architect.save(env.root, workflow.workflowId, {...input, output: {...output, extra: "unbounded"}}), /bounded/);
      const candidate = await architect.save(env.root, workflow.workflowId, input);
      const ids = new Set(candidate.review.sources.map(source => source.entityId));
      const members = (await env.store.listEntities(env.projectId)).filter(record => ids.has(record.id));
      assert.ok(members.some(record => record.entityType === "BoundedSolution")); assert.ok(members.some(record => record.entityType === "Criterion"));
      if (type === "research-prototype") assert.ok(members.some(record => record.entityType === "Evidence" && record.body.evidenceType === "experiment-supplied"));
      for (const [key, title] of Object.entries(ASSESSMENT_SECTIONS[type])) {assert.ok(members.some(record => record.entityType === "Finding" && record.body.title === title)); assert.ok(candidate.review.markdown.includes(output[key]));}
      assert.equal(candidate.review.disposition.state, "none");
      const projection = path.join(env.root, candidate.review.relativePath); fs.writeFileSync(projection, "Manual approval fiction");
      assert.equal((await architect.get(env.root, workflow.workflowId)).review.disposition.state, "none");
      assert.ok(!fs.readFileSync(projection, "utf8").includes("Manual approval fiction"));
      await assert.rejects(architect.review(env.root, workflow.workflowId, candidate.review.cycleId, {expectedRecordVersion: 0, outcome: "approved"}));
      const approved = await architect.review(env.root, workflow.workflowId, candidate.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"});
      assert.equal(approved.railStatus, "Completed"); assert.equal(approved.nextStageReady, true);
      fs.unlinkSync(projection); assert.equal((await architect.get(env.root, workflow.workflowId)).review.disposition.state, "approved");
      const planning = require("../../dist/main/workPlanning/exactWorkflowPlanningService.js").createExactWorkflowPlanningService();
      const planningModel = await planning.prepare(env.root, workflow.workflowId);
      assert.equal((await env.store.getEntity(env.projectId, workflow.workflowId)).body.currentWorkspace, "planning");
      if (type === "research-prototype") assert.equal(planningModel.researchOutcome.outcome, "research-plan-required");
      const revised = await architect.save(env.root, workflow.workflowId, {...input, expectedCycleVersion: 1, output: {...output, risks: "Revised material risks"}});
      assert.equal(revised.review.recordVersion, 2); assert.equal(revised.review.disposition.state, "none"); assert.equal(revised.nextStageReady, false);
      await assert.rejects(architect.review(env.root, workflow.workflowId, revised.review.cycleId, {expectedRecordVersion: 1, outcome: "approved"}));
    } finally {env.store.close();}
  });
}

test("Greenfield Architect persists typed SQL candidates, rematerializes review and bridges Planning without canonical Interview authority", async context => {
  const {GREENFIELD_ARCHITECT_SECTIONS} = require("../../dist/shared/architectWorkspaceContracts.js");
  const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
  const intakeService = require("../../dist/main/workflow/workflowIntakeService.js").createWorkflowIntakeService();
  const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
  const {resolveProjectPlanningContext} = require("../../dist/main/projectPlanning/projectPlanningContext.js");
  const {createGreenfieldNavigationService} = require("../../dist/main/workflow/greenfieldNavigationService.js");
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
    assertArchitectHandoff(prepared, "project-creation");
    assert.equal(prepared.ready, true); assert.ok(prepared.handoff.includes(`${intake.intakeId}@1`));
    assert.throws(() => require("../../dist/main/documents/firstNonApprovedResolver.js").resolveFirstNonApprovedDocument(env.root), /fenced after Structured Project State authority selection/);
    assert.equal((await createGreenfieldNavigationService().get(env.root, workflow.id)).currentWorkspace, "architect-interview");
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
    assert.equal(planning.interview.logicalDocumentId, cycle.id); assert.equal(fs.readFileSync(historical, "utf8"), "Historical prose: must not import as architecture.");
    const structuredPlanning = require("../../dist/main/projectPlanning/structuredProjectPlanningService.js").createStructuredProjectPlanningService();
    const planningModel = await structuredPlanning.get(env.root, workflow.id);
    const oldProfile = path.join(env.root, "planning/project/PROJECT_PROFILE.md"), oldRoadmap = path.join(env.root, "planning/project/Project_Roadmap/PROJECT_ROADMAP_old.md");
    fs.mkdirSync(path.dirname(oldRoadmap), {recursive:true});
    fs.writeFileSync(oldProfile, "Old free-form Profile must remain historical."); fs.writeFileSync(oldRoadmap, "Old free-form Roadmap must remain historical.");
    const planInput = {workflowId:workflow.id, facts:[{title:"Verified product",statement:"Desktop application serves the approved purpose",impact:"Constrains delivery"}], direction:{title:"Project direction",objective:"Deliver approved outcome",scopeIn:["Approved scope"],scopeOut:["Excluded scope"],constraints:["Approved constraint"],assumptions:[],risks:["Known risk"]}, criteria:[{statement:"Outcome is observable",criticality:"required",verificationIntent:"Operator verifies outcome",validationPolicy:"operator_decision"}], sources:planningModel.sources};
    const listeners = new Map(); require("../../dist/main/workflow/workflowApplicationIpc.js").registerWorkflowApplicationIpc({handle:(channel,listener)=>listeners.set(channel,listener)},()=>env.root);
    assert.throws(()=>listeners.get("workflow:projectPlanningGet")({},workflow.id,"surplus"),/Exact bounded/);
    await assert.rejects(structuredPlanning.save(env.root, workflow.id, {...planInput,workflowId:"other"}),/mismatch/);
    const planned = await listeners.get("workflow:projectPlanningSave")({},workflow.id,planInput);
    assert.match(planned.review.profileMarkdown,/Verified product/); assert.match(planned.review.roadmapMarkdown,/Deliver approved outcome/);
    assert.equal(planned.review.disposition.state,"none");
    const completion = require("../../dist/main/projectPlanning/projectPlanningService.js").getProjectPlanningCompletion;
    assert.equal(completion(env.root).complete,false);
    await assert.rejects(structuredPlanning.review(env.root,workflow.id,planned.review.cycleId,{expectedRecordVersion:2,outcome:"approved"}),/stale/);
    const approvedPlan = await listeners.get("workflow:projectPlanningReview")({},workflow.id,planned.review.cycleId,{expectedRecordVersion:1,outcome:"approved"});
    assert.equal(approvedPlan.review.disposition.state,"approved"); assert.equal(completion(env.root).complete,true);
    assert.throws(()=>require("../../dist/main/projectPlanning/projectPlanningService.js").setProjectPlanningBundleDisposition(env.root,"Rejected"),/structured SQL review/);
    fs.writeFileSync(oldProfile,"Manually changed approval and scope");
    assert.equal((await structuredPlanning.get(env.root,workflow.id)).review.markdown,approvedPlan.review.markdown);
    assert.equal(completion(env.root).complete,true); assert.equal(fs.readFileSync(oldRoadmap,"utf8"),"Old free-form Roadmap must remain historical.");
    const changedPlan = await structuredPlanning.save(env.root,workflow.id,{...planInput,expectedRecordVersion:1,direction:{...planInput.direction,objective:"Revised approved outcome"}});
    assert.equal(changedPlan.review.recordVersion,2); assert.equal(changedPlan.review.disposition.state,"none"); assert.equal(completion(env.root).complete,false);
    await assert.rejects(structuredPlanning.review(env.root,workflow.id,planned.review.cycleId,{expectedRecordVersion:1,outcome:"approved"}),/stale/);
    assert.equal((await env.store.listEntities(env.projectId,"WorkItem")).length,0);
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

test("Workflow inventory, open and direct start leave Project authority generation unchanged", async context => {
  const env = await setup(context);
  try {
    const application = createWorkflowApplicationService();
    const created = await application.startDirectWorkflow(env.root, { workflowType: "feature-capability", title: "Fresh structured work" });
    const before = await env.store.getProviderGeneration(env.projectId);
    assert.equal(before.authority, "structured");
    await application.listCurrentProjectWorkflows(env.root);
    await application.getCurrentProjectWorkflow(env.root, created.workflow.workflowId);
    assert.deepEqual(await env.store.getProviderGeneration(env.projectId), before);
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
    await reviewFeatureCandidate(env.root, completed.targetWorkflowId, "accept", "Accept routed assessment.", acceptedAssessment);
    const routedGraph = { workflowId: completed.targetWorkflowId, topology: "phased", solution: { title: "Routed capability", objective: "Deliver routed result", scopeIn: ["bounded addition"], scopeOut: ["unrelated changes"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [{ statement: "Preserve existing behavior", criticality: "required", verificationIntent: "Run the preserved behavior suite", validationPolicy: "semantic_ai" }], phases: [{ key: "routed-phase", title: "Capability phase", objective: "Deliver capability", sequence: 1 }], workItems: [{ key: "routed-work", kind: "feature", title: "Implement routed addition", objective: "Deliver the addition", phaseKey: "routed-phase", dependencyKeys: [], criteria: [] }] };
    await targetPlanner.prepare(env.root, completed.targetWorkflowId, "plan");
    await targetPlanner.act(env.root, completed.targetWorkflowId, { type: "save-draft", content: "Reviewed routed Feature graph." });
    await assert.rejects(reviewSqlGraph(env, completed.targetWorkflowId, routedGraph), /single Phase/);
    routedGraph.topology = "direct"; delete routedGraph.phases; delete routedGraph.workItems[0].phaseKey;
    const routedPlan = await reviewSqlGraph(env, completed.targetWorkflowId, routedGraph);
    assert.equal(routedPlan.stage, "work-item-map");
    assert.equal(routedPlan.workflow.workflowId, completed.targetWorkflowId);
    assert.equal(routedPlan.workflow.currentWorkspace, "work-item-map");
    assert.equal(routedPlan.provenance, "routed");
    assert.equal(routedPlan.acceptedPlan.workflow.id, completed.targetWorkflowId);
    assert.equal(routedPlan.acceptedPlan.phases.length, 0); assert.equal(routedPlan.acceptedPlan.directWorkItems.length, 1);
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
    await reviewFeatureCandidate(env.root, direct.workflow.workflowId, "revision", "Clarify rollout.", acceptedAssessment);
    assert.equal((await env.state.getWorkflowExecutionPlan(env.projectId, direct.workflow.workflowId)).directWorkItems.length, 0);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-assessment");
    assert.equal((await feature.get(env.root, direct.workflow.workflowId)).assessmentState, "revision-requested");
    await approveIntake(env.root, direct.workflow.workflowId);
    await feature.prepare(env.root, direct.workflow.workflowId, "assessment");
    await reviewFeatureCandidate(env.root, direct.workflow.workflowId, "accept", "Assessment approved.", acceptedAssessment);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, direct.workflow.workflowId)).workflow.currentWorkspace, "feature-planning");
    const reopened = await createFeaturePlanningService().get(env.root, direct.workflow.workflowId);
    assert.equal(reopened.stage, "plan");
    assert.equal(reopened.acceptedAssessment.length, 7);
    const acceptedAssessmentOwnership = await env.store.listRelationships(env.projectId, "workflow_member");
    assert.ok(reopened.acceptedAssessment.every(record => acceptedAssessmentOwnership.some(edge => edge.fromEntityId === record.id && edge.toEntityId === direct.workflow.workflowId && !edge.endedAt)));
    const planningHandoff = await feature.prepare(env.root, direct.workflow.workflowId, "plan");
    assert.match(planningHandoff.draft.instruction, /Accepted semantic records/);
    assert.match(planningHandoff.draft.instruction, /Current Product Baseline/);
    assert.match(planningHandoff.draft.instruction, /Source-neutral: required deterministic validation is unavailable/i);
    await feature.act(env.root, direct.workflow.workflowId, { type: "save-draft", content: "plan draft placeholder" });
    const graph = { workflowId: direct.workflow.workflowId, topology: "direct", solution: { title: "CSV export", objective: "Export reports", scopeIn: ["CSV"], scopeOut: ["PDF"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], workItems: [{ key: "export", kind: "feature", title: "Implement CSV export", objective: "Deliver export", dependencyKeys: [], criteria: [] }] };
    const accepted = await reviewSqlGraph(env, direct.workflow.workflowId, graph);
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
    await assert.rejects(feature.act(env.root, direct.workflow.workflowId, { type: "decide", stage: "plan", outcome: "accept", rationale: "Duplicate", graph }), /persisted exact Plan|non-empty Architect draft|Workflow is already planned|unavailable/);
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
      await reviewFeatureCandidate(env.root, workflow.workflowId, "accept", `${label} assessment accepted`, { ...acceptedAssessment, requestedCapabilityDelta: `${label} outcome` });
      const graph = { workflowId: workflow.workflowId, topology: "direct", solution: { title: `${label} solution`, objective: `${label} outcome`, scopeIn: [`${label} scope`], scopeOut: [], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [{ statement: `${label} criterion`, criticality: "required", verificationIntent: `Verify ${label}`, validationPolicy: "semantic_ai" }], workItems: [{ key: `${label}-work`, kind: "feature", title: `${label} work`, objective: `${label} result`, dependencyKeys: [], criteria: [] }] };
      await planner.prepare(env.root, workflow.workflowId, "plan");
      await planner.act(env.root, workflow.workflowId, { type: "save-draft", content: `${label} reviewed graph` });
      return reviewSqlGraph(env, workflow.workflowId, graph);
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
    await reviewIssueCandidate(env.root, second.workflow.workflowId, {type: "decide-rca", outcome: "revision", rationale: "Clarify the independent reproduction." });
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
    await reviewIssueCandidate(env.root, first.workflow.workflowId, {type: "decide-rca", outcome: "revision", rationale: "Cite the reproduction log." });
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses.length, 0);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    const current = await issues.get(env.root, first.workflow.workflowId);
    const finding = await env.state.createRecord(env.projectId, "Finding", {title: "Observed behavior", statement: "Independent RCA observation", category: "issue-rca", impact: "Issue context", observedAt: new Date().toISOString(), findingState: "current"});
    await env.state.createRelationship(env.projectId, finding.id, "workflow_member", first.workflow.workflowId);
    const rootCauseCountBeforeFailure = (await env.store.listEntities(env.projectId, "RootCause")).length;
    const decisionCountBeforeFailure = (await env.store.listEntities(env.projectId, "Decision")).length;
    await assert.rejects(reviewIssueCandidate(env.root, first.workflow.workflowId, {type: "decide-rca", outcome: "accept", rationale: "Should remain atomic.", rootCauses: [
      { title: "Valid first candidate", statement: "Would be written first in a non-atomic path.", rationale: "Supported.", findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] },
      { title: "Foreign finding candidate", statement: "Cannot cross Issue owners.", rationale: "Rejected in preflight.", findingIds: [secondEvidence.intakeAuthority.intakeId], evidenceIds: [secondEvidence.evidence[0].id] },
    ] }), /exact Issue/);
    assert.equal((await env.store.listEntities(env.projectId, "RootCause")).length, rootCauseCountBeforeFailure);
    assert.equal((await env.store.listEntities(env.projectId, "Decision")).length, decisionCountBeforeFailure);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-rca");
    const afterRca = await reviewIssueCandidate(env.root, first.workflow.workflowId, {type: "decide-rca", outcome: "accept", rationale: "Evidence supports the cause.", rootCauses: [{ title: "Export state exception", statement: "Export crashes when search state is populated.", rationale: "The reproduced state transition omits the export data shape.", confidence: 0.9, findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] }] });
    assert.equal(afterRca.stage, "plan");
    assert.match(afterRca.draft.instruction, /Source-neutral: required deterministic validation is unavailable/i);
    assert.equal((await workflows.getCurrentProjectWorkflow(env.root, first.workflow.workflowId)).workflow.currentWorkspace, "issue-planning");
    assert.equal((await createIssuePlanningService().get(env.root, first.workflow.workflowId)).stage, "plan");
    assert.equal(afterRca.rootCauses.length, 1);
    const links = await env.store.listRelationships(env.projectId);
    assert.ok(links.some(edge => edge.relationshipType === "workflow_member" && edge.fromEntityId === afterRca.rootCauses[0].id && edge.toEntityId === first.workflow.workflowId));
    const cycle = (await require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService().get(env.root, first.workflow.workflowId)).review;
    const firstRcaDecision = await env.store.getEntity(env.projectId, cycle.disposition.decisionId);
    assert.ok(firstRcaDecision);
    assert.ok(links.some(edge => edge.relationshipType === "governs" && edge.fromEntityId === firstRcaDecision.id && edge.toEntityId === cycle.cycleId));
    assert.ok(links.some(edge => edge.relationshipType === "review_member" && edge.fromEntityId === afterRca.rootCauses[0].id && edge.toEntityId === cycle.cycleId));
    assert.doesNotMatch(firstRcaDecision.body.rationale, /canonical-root-causes/i);
    assert.ok(links.some(edge => edge.relationshipType === "explains" && edge.fromEntityId === afterRca.rootCauses[0].id && edge.toEntityId === finding.id));
    assert.ok(links.some(edge => edge.relationshipType === "supports" && edge.fromEntityId === evidence.evidence[0].id && edge.toEntityId === afterRca.rootCauses[0].id));
    await approveIntake(env.root, first.workflow.workflowId);
    await issues.prepare(env.root, first.workflow.workflowId, "rca");
    await reviewIssueCandidate(env.root, first.workflow.workflowId, {type: "decide-rca", outcome: "revision", rationale: "Clarify the regression trigger." });
    const unchangedRca = await issues.get(env.root, first.workflow.workflowId);
    assert.equal(unchangedRca.rootCauses.length, 0);
    assert.ok(await env.store.getEntity(env.projectId, afterRca.rootCauses[0].id));
    await assert.rejects(issues.prepare(env.root, first.workflow.workflowId, "plan"), /Accept the current Issue RCA/);
    const revisedRoot = { title: "Search-dependent export mapping", statement: "Export crashes when search state is populated.", rationale: "The reproduction confirms the missing search state mapping.", confidence: 0.95, findingIds: [finding.id], evidenceIds: [evidence.evidence[0].id] };
    const reviewedAgain = await reviewIssueCandidate(env.root, first.workflow.workflowId, {type: "decide-rca", outcome: "accept", rationale: "Accept clarified cause.", rootCauses: [revisedRoot] });
    assert.equal(reviewedAgain.rootCauses.length, 1);
    assert.notEqual(reviewedAgain.rootCauses[0].id, afterRca.rootCauses[0].id);
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses.length, 1);
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rootCauses[0].id, reviewedAgain.rootCauses[0].id);
    await issues.prepare(env.root, first.workflow.workflowId, "plan");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Proposed correction plan draft." });
    await reviewSqlGraph(env, first.workflow.workflowId, undefined, "revision_requested", "Add deterministic regression coverage.");
    assert.equal((await env.state.getWorkflowExecutionPlan(env.projectId, first.workflow.workflowId)).directWorkItems.length, 0);
    const lateEvidence = await issues.addEvidence(env.root, first.workflow.workflowId, [{ name: "late.txt", mediaType: "text/plain", base64: Buffer.from("new RCA evidence").toString("base64"), description: "Evidence added after RCA acceptance" }]);
    const latestEvidence = lateEvidence.evidence.find(record => record.body.description === "Evidence added after RCA acceptance");
    const reproductionEvidence = evidence.evidence.find(record => record.body.description === "Reproduction log");
    assert.ok(latestEvidence && reproductionEvidence);
    assert.equal((await issues.get(env.root, first.workflow.workflowId)).rcaState, "not-reviewed");
    await assert.rejects(issues.act(env.root, first.workflow.workflowId, { type: "decide-plan", outcome: "accept" }), /persisted exact Plan/);
    assert.equal((await env.state.getWorkflowExecutionPlan(env.projectId, first.workflow.workflowId)).directWorkItems.length, 0);
    await approveIntake(env.root, first.workflow.workflowId);
    await issues.prepare(env.root, first.workflow.workflowId, "rca");
    const refreshedRca = await reviewIssueCandidate(env.root, first.workflow.workflowId, {type: "decide-rca", outcome: "accept", rationale: "Accept RCA with current evidence.", rootCauses: [{ title: "Search-dependent export mapping", statement: "Export crashes when search state is populated.", rationale: "The reproduction and newly added evidence confirm the missing state mapping.", findingIds: [finding.id], evidenceIds: [reproductionEvidence.id, latestEvidence.id] }] });
    assert.equal(refreshedRca.stage, "plan");
    const graph = { workflowId: first.workflow.workflowId, topology: "direct", solution: { title: "Restore Export", objective: "Export from populated search state", scopeIn: ["export state shape"], scopeOut: ["new formats"], constraints: [], assumptions: [], risks: [] }, solutionCriteria: [], workItems: [{ key: "correct", kind: "fix", title: "Correct export state mapping", objective: "Prevent crash", dependencyKeys: [], criteria: [] }] };
    await issues.prepare(env.root, first.workflow.workflowId, "plan");
    await issues.act(env.root, first.workflow.workflowId, { type: "save-draft", content: "Reviewed correction graph." });
    const accepted = await reviewSqlGraph(env, first.workflow.workflowId, graph);
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


test("historical Intake Markdown and Findings stay inert until a fresh SQL Intake is submitted", async context => {
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const {WORKFLOW_INTAKE_DEFINITIONS} = require("../../dist/shared/workflowIntakeContracts.js");
  const env = await setup(context), intake = createWorkflowIntakeService(), app = createWorkflowApplicationService();
  try {
    const projectCreation = (await env.state.createProjectCreationWorkflow(env.projectId, {title: "Fresh Project"})).workflow;
    const feature = (await app.startDirectWorkflow(env.root, {workflowType: "feature-capability", title: "Fresh feature"})).workflow;
    const relativePath = "planning/project/Project_Intake/PROJECT_INTAKE_legacy.md";
    fs.mkdirSync(path.dirname(path.join(env.root, relativePath)), {recursive: true});
    fs.writeFileSync(path.join(env.root, relativePath), "Historical Intake evidence with an apparent Approved disposition.");
    const historicBytes = fs.readFileSync(path.join(env.root, relativePath));
    const finding = await env.state.createRecord(env.projectId, "Finding", {title: "Requested Capability Delta", statement: "Historical request", category: "feature-intake",
      impact: "Historic", observedAt: "2026-01-01T00:00:00.000Z", findingState: "current"});
    await env.state.createRelationship(env.projectId, finding.id, "workflow_member", feature.workflowId);
    const projectIntake = await intake.ensureWorkflowIntake(env.root, projectCreation.id);
    const featureIntake = await intake.getWorkflowIntake(env.root, feature.workflowId);
    assert.equal(projectIntake.values, null);
    assert.equal(featureIntake.values, null);
    assert.equal((await env.store.listEntities(env.projectId, "WorkflowIntake")).length, 0);
    assert.deepEqual(fs.readFileSync(path.join(env.root, relativePath)), historicBytes);
    assert.equal((await env.store.getEntity(env.projectId, finding.id)).body.statement, "Historical request");

    const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS["feature-capability"].fields
      .filter(field => field.required).map(field => [field.key, `Fresh ${field.key}`]));
    const saved = await intake.saveWorkflowIntake(env.root, feature.workflowId, {workflowType: "feature-capability", values});
    assert.equal(saved.values.requestedCapability, "Fresh requestedCapability");
    assert.equal((await env.store.listEntities(env.projectId, "WorkflowIntake")).length, 1);
    assert.deepEqual(fs.readFileSync(path.join(env.root, relativePath)), historicBytes);
  } finally { env.store.close(); }
});
test("new Issue RCA can cite structured Intake Evidence without creating Intake Findings", async context => {
  const env = await setup(context), app = createWorkflowApplicationService(), issue = createIssuePlanningService();
  try {
    const id = (await app.startDirectWorkflow(env.root, {workflowType: "issue-resolution", title: "Structured RCA"})).workflow.workflowId;
    await issue.saveIntake(env.root, id, {title: "Failure", observed: "Observed failure", expected: "Success", reproduction: "Run fixture", environment: "Test", impact: "Blocked", constraints: "Preserve behavior"});
    const model = await issue.addEvidence(env.root, id, [{name: "proof.txt", mediaType: "text/plain", base64: Buffer.from("Failure proof").toString("base64"), description: "Failure proof"}]);
    await approveIntake(env.root, id);
    await issue.prepare(env.root, id, "rca");
    const result = await reviewIssueCandidate(env.root, id, {type: "decide-rca", outcome: "accept", rationale: "Exact Intake and Evidence support this cause", rootCauses: [{title: "Cause", statement: "Cause explains failure", rationale: "Evidence reproduces the failure", findingIds: [], evidenceIds: [model.evidence[0].id]}]});
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
    assert.throws(() => listPlanningDocuments(env.root), /fenced after Structured Project State authority selection/);
    const unrelated = path.join(env.root, "planning/unrelated-notes.md");
    fs.mkdirSync(path.dirname(unrelated), {recursive: true});
    fs.writeFileSync(unrelated, "Historical notes are inert and legacy inventory remains fenced.");
    assert.throws(() => listPlanningDocuments(env.root), /fenced after Structured Project State authority selection/);
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
    await assert.rejects(Promise.resolve().then(() => handlers.get("workflow:reviewIntake")({}, id, {expectedIntakeRecordVersion: 1, outcome: "approved", legacyReviewedAt: "2000-01-01"})), /Bounded/);
    const revised = await handlers.get("workflow:saveIntake")({}, id, {...payload, values: {...payload.values, transformationObjective: "New objective"}}, 1);
    assert.equal(revised.recordVersion, 2); assert.equal(revised.reviewDocument.effectiveDisposition, "Pending");
    await assert.rejects(handlers.get("workflow:reviewIntake")({}, id, {expectedIntakeRecordVersion: 1, outcome: "approved"}), /stale/);
    fs.unlinkSync(file); fs.mkdirSync(file);
    const failed = await service.saveWorkflowIntake(env.root, id, payload, 2);
    assert.match(failed.materializationError, /SQL Intake is committed/);
    assert.equal((await env.store.getEntity(env.projectId, saved.intakeId)).recordVersion, 3);
    fs.rmdirSync(file);
    const structured = await service.ensureWorkflowIntake(env.root, id);
    assert.equal(structured.materializationError, undefined); assert.equal(fs.readFileSync(file, "utf8"), structured.reviewDocument.bodyMarkdown);
    const approved = await handlers.get("workflow:reviewIntake")({}, id, {expectedIntakeRecordVersion: 3, outcome: "approved", notes: "Reviewed"});
    assert.equal(approved.reviewDocument.effectiveDisposition, "Approved");
    assert.match(fs.readFileSync(file, "utf8"), /"disposition":"Approved"/);
    assert.equal((await env.store.getEntity(env.projectId,id)).body.currentWorkspace,"refactor-assessment");
    await assert.rejects(service.saveWorkflowIntake(env.root,id,payload,3),/entry workspace/);
    assert.throws(() => writeCanonicalMarkdownDocument({workspaceRoot: env.root, relativePath: "planning/unrelated.md", metadata: {}, bodyMarkdown: "Legacy authority"}), /structured|legacy|authority/i);
  } finally {env.store.close();}
});


test("Greenfield SQL Intake preserves its generated path and prepares Interview from current approval", async context => {
  const env = await setup(context);
  const {createWorkflowIntakeService} = require("../../dist/main/workflow/workflowIntakeService.js");
  const architect = require("../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js").createStructuredArchitectWorkspaceService();
  const {createGreenfieldNavigationService} = require("../../dist/main/workflow/greenfieldNavigationService.js");
  const {resolveProjectPlanningContext} = require("../../dist/main/projectPlanning/projectPlanningContext.js");
  try {
    const workflow = (await env.state.createProjectCreationWorkflow(env.projectId,{title:"Greenfield fixture"})).workflow;
    const service = createWorkflowIntakeService();
    const payload = {workflowType:"project-creation",values:{projectName:"My Greenfield",projectPurpose:"Create",desiredOutcome:"Deliver",projectType:"Desktop application",projectRepository:"untrusted renderer repository",hasExistingSourceOrPlanning:false}};
    let saved = await service.saveWorkflowIntake(env.root,workflow.id,payload);
    assert.equal(saved.values.projectRepository,fs.realpathSync(env.root));
    assert.equal(saved.reviewDocument.markdownPath,"planning/project/Project_Intake/PROJECT_INTAKE_my_greenfield.md");
    await assert.rejects(architect.prepare(env.root, workflow.id),/Approve/i);
    await service.reviewWorkflowIntake(env.root,workflow.id,{expectedIntakeRecordVersion:saved.recordVersion,outcome:"approved"});
    const prepared = await architect.prepare(env.root, workflow.id);
    assert.equal(prepared.ready,true);
    assert.throws(() => require("../../dist/main/documents/firstNonApprovedResolver.js").resolveFirstNonApprovedDocument(env.root), /fenced after Structured Project State authority selection/);
    assert.equal((await createGreenfieldNavigationService().get(env.root, workflow.id)).currentWorkspace,"architect-interview");
    const generated = path.join(env.root,saved.reviewDocument.markdownPath);
    fs.writeFileSync(generated,"A manual file edit cannot remove SQL approval.");
    assert.throws(() => require("../../dist/main/documents/firstNonApprovedResolver.js").resolveFirstNonApprovedDocument(env.root), /fenced after Structured Project State authority selection/);
    assert.equal((await createGreenfieldNavigationService().get(env.root, workflow.id)).currentWorkspace,"architect-interview");
    assert.match(resolveProjectPlanningContext(env.root).reason,/Architect Interview output/);
    saved = await service.saveWorkflowIntake(env.root,workflow.id,{...payload,values:{...payload.values,projectName:"Renamed project"}},saved.recordVersion);
    assert.equal(saved.reviewDocument.markdownPath,"planning/project/Project_Intake/PROJECT_INTAKE_my_greenfield.md");
    assert.equal(saved.reviewDocument.effectiveDisposition,"Pending");
    assert.equal((await createGreenfieldNavigationService().get(env.root, workflow.id)).currentWorkspace,"project-intake-capture");
    await service.reviewWorkflowIntake(env.root,workflow.id,{expectedIntakeRecordVersion:saved.recordVersion,outcome:"approved"});
    assert.equal((await architect.prepare(env.root, workflow.id)).ready,true);
    const refreshed = await architect.get(env.root, workflow.id);
    assert.equal(refreshed.intakeVersion, saved.recordVersion); assert.ok(refreshed.handoff.includes(`${saved.intakeId}@${saved.recordVersion}`));
  } finally {env.store.close();}
});
