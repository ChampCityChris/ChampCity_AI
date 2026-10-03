const assert = require("node:assert/strict");
const test = require("node:test");

const { registerFeaturePlanningIpc } = require("../../dist/main/featurePlanning/featurePlanningIpc.js");
const { registerIssuePlanningIpc } = require("../../dist/main/issuePlanning/issuePlanningIpc.js");

function capture(register, service, copied = []) {
  const handlers = new Map();
  register({ handle: (channel, listener) => handlers.set(channel, listener) }, () => "<PROJECT_REPO>", text => copied.push(text), service);
  return handlers;
}
function rejectsSync(action, pattern) { assert.throws(action, pattern); }

test("Feature planning IPC accepts preload argument shapes and rejects missing or surplus arguments", async () => {
  const calls = [];
  const service = {
    get: async (...args) => { calls.push(["get", ...args]); return { draft: { instruction: "feature handoff" } }; },
    saveIntake: async (...args) => calls.push(["saveIntake", ...args]),
    prepare: async (...args) => calls.push(["prepare", ...args]),
    act: async (...args) => calls.push(["act", ...args]),
  };
  const handlers = capture(registerFeaturePlanningIpc, service);
  const id = "feature-exact-workflow-123";
  const intake = { requestedCapability: "x" };
  const action = { type: "decide", stage: "assessment", outcome: "accept", rationale: "accepted" };
  await handlers.get("featurePlanning:get")({}, id);
  await handlers.get("featurePlanning:copy")({}, id);
  await handlers.get("featurePlanning:saveIntake")({}, id, intake);
  await handlers.get("featurePlanning:prepare")({}, id, "assessment");
  await handlers.get("featurePlanning:act")({}, id, action);
  assert.deepEqual(calls.map(call => call[0]), ["get", "get", "saveIntake", "prepare", "act"]);
  assert.deepEqual(calls[0], ["get", "<PROJECT_REPO>", id]);
  assert.deepEqual(calls[2], ["saveIntake", "<PROJECT_REPO>", id, intake]);
  assert.deepEqual(calls[3], ["prepare", "<PROJECT_REPO>", id, "assessment"]);
  assert.deepEqual(calls[4], ["act", "<PROJECT_REPO>", id, action]);
  for (const channel of ["featurePlanning:get", "featurePlanning:copy"]) {
    rejectsSync(() => handlers.get(channel)({}), /exactly 1 argument/);
    rejectsSync(() => handlers.get(channel)({}, id, "surplus"), /exactly 1 argument/);
  }
  for (const channel of ["featurePlanning:saveIntake", "featurePlanning:prepare", "featurePlanning:act"]) {
    rejectsSync(() => handlers.get(channel)({}, id), /exactly 2 arguments/);
    rejectsSync(() => handlers.get(channel)({}, id, channel === "featurePlanning:prepare" ? "plan" : {}, "surplus"), /exactly 2 arguments/);
  }
  rejectsSync(() => handlers.get("featurePlanning:act")({}, id, { type: "unknown" }), /action type is invalid/);
  rejectsSync(() => handlers.get("featurePlanning:act")({}, id, { type: "decide", outcome: "maybe" }), /outcome is invalid/);
});

test("Issue planning IPC accepts preload argument shapes and rejects missing or surplus arguments", async () => {
  const calls = [];
  const service = {
    get: async (...args) => { calls.push(["get", ...args]); return { draft: { instruction: "issue handoff" } }; },
    saveIntake: async (...args) => calls.push(["saveIntake", ...args]),
    addEvidence: async (...args) => calls.push(["addEvidence", ...args]),
    prepare: async (...args) => calls.push(["prepare", ...args]),
    act: async (...args) => calls.push(["act", ...args]),
  };
  const handlers = capture(registerIssuePlanningIpc, service);
  const id = "issue-exact-workflow-123";
  const intake = { title: "failure" };
  const files = [{ name: "log.txt", base64: "AA==" }];
  const action = { type: "decide-rca", outcome: "accept", rationale: "accepted" };
  await handlers.get("issuePlanning:get")({}, id);
  await handlers.get("issuePlanning:copy")({}, id);
  await handlers.get("issuePlanning:saveIntake")({}, id, intake);
  await handlers.get("issuePlanning:addEvidence")({}, id, files);
  await handlers.get("issuePlanning:prepare")({}, id, "rca");
  await handlers.get("issuePlanning:act")({}, id, action);
  assert.deepEqual(calls.map(call => call[0]), ["get", "get", "saveIntake", "addEvidence", "prepare", "act"]);
  assert.deepEqual(calls[0], ["get", "<PROJECT_REPO>", id]);
  assert.deepEqual(calls[2], ["saveIntake", "<PROJECT_REPO>", id, intake]);
  assert.deepEqual(calls[3], ["addEvidence", "<PROJECT_REPO>", id, files]);
  assert.deepEqual(calls[4], ["prepare", "<PROJECT_REPO>", id, "rca"]);
  assert.deepEqual(calls[5], ["act", "<PROJECT_REPO>", id, action]);
  for (const channel of ["issuePlanning:get", "issuePlanning:copy"]) {
    rejectsSync(() => handlers.get(channel)({}), /exactly 1 argument/);
    rejectsSync(() => handlers.get(channel)({}, id, "surplus"), /exactly 1 argument/);
  }
  for (const channel of ["issuePlanning:saveIntake", "issuePlanning:addEvidence", "issuePlanning:prepare", "issuePlanning:act"]) {
    rejectsSync(() => handlers.get(channel)({}, id), /exactly 2 arguments/);
    rejectsSync(() => handlers.get(channel)({}, id, channel === "issuePlanning:prepare" ? "plan" : [], "surplus"), /exactly 2 arguments/);
  }
  rejectsSync(() => handlers.get("issuePlanning:act")({}, id, { type: "unknown" }), /action type is invalid/);
  rejectsSync(() => handlers.get("issuePlanning:act")({}, id, { type: "decide-plan", outcome: "maybe" }), /outcome is invalid/);
});

const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {registerCurrentProject} = require('../../dist/main/projectState/currentProjectRegistrationService.js');
const {createSQLiteProjectStateStore} = require('../../dist/main/projectState/sqliteProjectStateStore.js');
const {createProjectStateService} = require('../../dist/shared/projectState/projectStateService.js');
const {createExactWorkflowPlanningService} = require('../../dist/main/workPlanning/exactWorkflowPlanningService.js');
const {createWorkflowApplicationService} = require('../../dist/main/workflow/workflowApplicationService.js');
const {WORKFLOW_INTAKE_DEFINITIONS} = require('../../dist/shared/workflowIntakeContracts.js');
const {FEATURE_ARCHITECT_SECTIONS, ASSESSMENT_SECTIONS} = require('../../dist/shared/architectWorkspaceContracts.js');
const {resolveWorkPlanningProfile} = require('../../dist/main/workPlanning/workPlanningProfiles.js');
const operator = {principalId:'operator', principalType:'human', role:'Operator'};
async function exactPlanningFixture(context, type, noPlan = false, routed = false, sourceBacked = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'champcity-exact-plan-'));
  const registration = await registerCurrentProject(root, 'existing', {projectName:'Exact planning fixture'});
  const store = createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));
  context.after(() => {store.close(); fs.rmSync(root,{recursive:true,force:true});});
  const projectId = registration.project.id, state = createProjectStateService(store,operator), app = createExactWorkflowPlanningService();
  const started = await createWorkflowApplicationService().startDirectWorkflow(root,{workflowType:type,title:type});
  const workflow = await store.getEntity(projectId,started.workflow.workflowId);
  const workflowApp = createWorkflowApplicationService();
  const {workflowPlanningSurface} = require('../renderer/renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/workflowPlanningDispatch.ts');
  const resolve = async () => (await workflowApp.getCurrentProjectWorkflow(root, workflow.id)).workflow;
  assert.equal(workflowPlanningSurface(await resolve()), 'intake');
  if (routed) {
    const routing = await state.createWorkIntake(projectId,{request:'Route request',desiredOutcome:'Outcome',constraints:[],evidenceContext:[],requestedIntegrationTarget:'dev'});
    await state.linkWorkflowRouteTarget(projectId,routing.workflow.id,workflow.id);
  }

  if (sourceBacked) {
    const baseline = await state.createWorkflowSourceBaseline(projectId, workflow.id, {repositoryId:'fixture-repository',integrationTargetSourceLineId:'dev',baseRevisionId:'fixture-base'});
    await state.createWorkflowSourceBinding(projectId, workflow.id, baseline.id);
  }
  const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS[type].fields.filter(field => field.required).map(field => [field.key,`${field.key} scope`]));
  const intake = await state.saveWorkflowIntake(projectId,{workflowId:workflow.id,workflowType:type,values});
  await state.recordWorkflowIntakeDecision(projectId,intake.id,{expectedIntakeRecordVersion:intake.recordVersion,outcome:'approved'});
  await require('../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js').createStructuredArchitectWorkspaceService().prepare(root, workflow.id);
  const refreshed = await resolve();
  assert.equal(refreshed.currentWorkspace, require('../../dist/shared/projectState/architectReviewContracts.js').ARCHITECT_WORKSPACE_BY_WORKFLOW[type]);
  assert.equal(workflowPlanningSurface(refreshed), type === 'feature-capability' ? 'feature' : type === 'issue-resolution' ? 'issue' : 'architect');

  let output;
  if (type==='issue-resolution') {
    const finding = await state.createRecord(projectId,'Finding',{title:'Failure',statement:'Wrong output',category:'issue-intake',impact:'Broken',observedAt:new Date().toISOString(),findingState:'current'});
    await state.createRelationship(projectId,finding.id,'workflow_member',workflow.id);
    output={rootCauses:[{title:'Cause',statement:'Evidenced cause',rationale:'Finding explains cause',findingIds:[finding.id],evidenceIds:[]}]};
  } else {
    const sections = type==='feature-capability' ? FEATURE_ARCHITECT_SECTIONS : ASSESSMENT_SECTIONS[type];
    output = Object.fromEntries(Object.keys(sections).map(key => [key,`${key} substantive assessment`]));
    if (type==='research-prototype') output.researchOutcome={outcome:noPlan?'no-implementation-plan-required':'research-plan-required',prototypeDisposition:'disposable',productionFollowUp:'none',evidence:['Observed comparison'],decisionEnabled:'Choose experiment',successFailureResult:'Observed bounded result',closureCondition:'Question answered'};
  }
  const cycle = await state.saveArchitectCandidate(projectId,{workflowId:workflow.id,workflowType:type,intakeId:intake.id,intakeVersion:intake.recordVersion,output});
  await state.recordArchitectReview(projectId,cycle.id,{expectedRecordVersion:cycle.recordVersion,outcome:'approved'});
  return {root,projectId,store,state,app,workflow,cycle,resolve,workflowPlanningSurface};
}
for (const type of ['feature-capability','issue-resolution','refactor-migration','integration-composition','infrastructure-platform','research-prototype']) {
  for (const routed of [false, true]) test(`${type} ${routed ? 'WIR-linked' : 'direct'}: exact Planning uses profile evidence and approved SQL revisions through acceptance`, async context => {
    const f=await exactPlanningFixture(context,type,false,routed), prepared=await f.app.prepare(f.root,f.workflow.id);
    const planningWorkspace = {'feature-capability':'feature-planning','issue-resolution':'issue-planning','refactor-migration':'planning','integration-composition':'planning','infrastructure-platform':'planning','research-prototype':'planning'}[type];
    assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,planningWorkspace);
    assert.equal(f.workflowPlanningSurface(await f.resolve()), type === 'feature-capability' ? 'feature' : type === 'issue-resolution' ? 'issue' : 'planning');
    for (const currentWorkspace of ['unknown', 'architect-interview', 'other-family-assessment']) assert.equal(f.workflowPlanningSurface({...await f.resolve(),currentWorkspace}), 'generic');
    const changes = (await f.store.listStateChanges(f.projectId)).filter(item=>item.entityId===f.workflow.id&&item.changedFields.includes('currentWorkspace'));
    assert.ok(changes.length, 'Prepare Planning records the durable Workflow stage change');
    const preparedVersion = (await f.store.getEntity(f.projectId,f.workflow.id)).recordVersion;
    await f.app.prepare(f.root,f.workflow.id);
    assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).recordVersion, preparedVersion, 'Prepare Planning is idempotent at the persisted stage');
    const profile=resolveWorkPlanningProfile(type==='feature-capability'?'feature-change':type);
    for (const text of [...profile.requiredEvidence,...profile.discoveryQuestions,...profile.planSections]) assert.ok(prepared.handoff.includes(text));
    assert.ok(prepared.handoff.includes(f.workflow.id)); assert.ok(prepared.handoff.includes(f.cycle.id));
    assert.ok(prepared.handoff.includes('Do not supply topology'));
    const all=await f.store.listEntities(f.projectId), sources=all.filter(record=>record.entityType!=='Project' && record.entityType!=='Decision' && record.entityType!=='WorkIntake' && (record.entityType!=='Workflow' || record.id===f.workflow.id)).map(record=>({entityId:record.id,recordVersion:record.recordVersion}));
    const candidate={workflowId:f.workflow.id,workflowType:type,solution:{title:'Plan',objective:'Deliver outcome',scopeIn:['bounded outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]},solutionCriteria:[],sources,workItems:[{key:'first',kind:type==='issue-resolution'?'fix':type==='refactor-migration'?'migration':'feature',title:'Work',objective:'Complete outcome',dependencyKeys:[],criteria:[]}]};
    await assert.rejects(f.app.save(f.root,f.workflow.id,{...candidate,workflowId:'different'}),/exact Workflow/);
    const saved=await f.app.save(f.root,f.workflow.id,candidate); assert.equal(saved.review.graph.topology,'direct');
    await assert.rejects(f.app.review(f.root,f.workflow.id,saved.review.cycleId,{expectedRecordVersion:2,outcome:'approved'}),/stale/);
    const handlers=new Map();
    require('../../dist/main/workflow/workflowApplicationIpc.js').registerWorkflowApplicationIpc({handle:(channel,listener)=>handlers.set(channel,listener)},()=>f.root);
    assert.throws(()=>handlers.get('workflow:planningGet')({}),/Exact bounded/);
    assert.equal((await handlers.get('workflow:planningGet')({},f.workflow.id)).review.cycleId,saved.review.cycleId);
  const accepted=await handlers.get('workflow:planningReview')({},f.workflow.id,saved.review.cycleId,{expectedRecordVersion:1,outcome:'approved'});
  assert.equal(accepted.acceptedPlan.directWorkItems.length,1); assert.equal(accepted.acceptedPlan.directWorkItems[0].body.workItemKind,candidate.workItems[0].kind);
  assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,'work-item-map');
  assert.equal(f.workflowPlanningSurface(await f.resolve()), 'execution');
  const execution = await require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService().getExecutionProjection(f.root,f.workflow.id);
  assert.equal(execution.items[0].record.id,accepted.acceptedPlan.directWorkItems[0].id);
  assert.equal(execution.plan.solutions.length,1,'Architect output must not masquerade as an accepted execution Plan');
  assert.equal(execution.plan.decisions.length,1);
  assert.ok(!execution.items[0].eligibility.blockers.includes('accepted-plan-missing-or-ambiguous'));
  assert.ok((await f.app.prepare(f.root,f.workflow.id)).acceptedPlan);
  assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,'work-item-map');
  assert.equal(f.workflowPlanningSurface(await f.resolve()), 'execution');
  assert.equal((await f.app.get(f.root,f.workflow.id)).acceptedPlan.directWorkItems[0].id,accepted.acceptedPlan.directWorkItems[0].id);
  });
}
test('Research exact approved typed no-Plan outcome reopens Planning and closes with SQL evidence and Decision',async context=>{
  const f=await exactPlanningFixture(context,'research-prototype',true), model=await f.app.prepare(f.root,f.workflow.id);
  assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,'planning');
  assert.equal(model.handoff,null); assert.equal(model.researchOutcome.outcome,'no-implementation-plan-required');
  assert.equal((await f.store.listEntities(f.projectId,'PlanReviewCycle')).filter(record=>record.lifecycleState==='active').length,0);
  assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,0);
  assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
  const execution=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
  await assert.rejects(execution.getExecutionProjection(f.root,f.workflow.id),/Research requires an accepted implementation Plan/);
  const closed=await f.app.closeResearch(f.root,f.workflow.id); assert.equal(closed.workflow.body.workflowState,'closed'); assert.equal(closed.decision.body.decisionType,'research-completion');
  assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,0);
  await assert.rejects(execution.getExecutionProjection(f.root,f.workflow.id),/current supported implementation Workflow/);
  await assert.rejects(execution.prepareExecution(f.root,f.workflow.id,{sourceMutating:true}),/current supported implementation Workflow/);
  assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
});
test('Exact Planning refuses ambiguous legacy Markdown and missing approved Assessment',async context=>{
  const f=await exactPlanningFixture(context,'feature-capability');
  await assert.rejects(f.app.save(f.root,f.workflow.id,'```champcity-work-plan\n{}\n```'),/exact Workflow/);
  const peer=await f.state.createWorkflow(f.projectId,{workflowType:'feature-capability',title:'Peer',currentWorkspace:'feature-planning'});
  await assert.rejects(f.app.prepare(f.root,peer.id),/current exact SQL Intake/);
  await f.state.recordArchitectReview(f.projectId,f.cycle.id,{expectedRecordVersion:f.cycle.recordVersion,outcome:'revision_requested',notes:'Revise the current assessment'});
  await assert.rejects(f.app.prepare(f.root,f.workflow.id),/Approve the current Architect/);
  assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,'feature-assessment');
});
test('Direct and WIR-linked exact target Workflows share the same Planning authority', async context => {
  const f=await exactPlanningFixture(context,'feature-capability');
  const direct=await f.app.prepare(f.root,f.workflow.id);
  const routing=await f.state.createWorkIntake(f.projectId,{request:'Route request',desiredOutcome:'Capability',constraints:[],evidenceContext:[],requestedIntegrationTarget:'dev'});
  await f.state.linkWorkflowRouteTarget(f.projectId,routing.workflow.id,f.workflow.id);
  const routed=await f.app.prepare(f.root,f.workflow.id);
  assert.equal(routed.handoff,direct.handoff); assert.equal(routed.workflowId,direct.workflowId);
  await assert.rejects(f.app.prepare(f.root,routing.workflow.id),/existing-project substantive Workflow/);
});

test('Shared Plan Review shell renders generated projection and keeps browser and exact revision controls', () => {
  const React = require('react'), {renderToStaticMarkup} = require('react-dom/server');
  const {PlanReviewShell} = require('../renderer/renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/PlanReviewShell.tsx');
  const markup = renderToStaticMarkup(React.createElement(PlanReviewShell,{title:'Project Planning',workflowId:'exact-workflow',browserPanel:React.createElement('aside',null,'Architect companion'),handoff:'SQL handoff',projection:'Generated SQL Profile and Roadmap',cycleId:'exact-cycle',revision:2,disposition:'revision_requested',onPrepare:async()=>{},onSave:async()=>{},onReview:async()=>{}}));
  assert.match(markup,/Generated SQL Profile and Roadmap/); assert.match(markup,/Architect companion/); assert.match(markup,/Revision requested/); assert.match(markup,/Review Decision/); assert.match(markup,/Revision Requested/); assert.match(markup,/Reject/); assert.doesNotMatch(markup,/I have reviewed this revision/); assert.match(markup,/class="apply-button">Approve/);
});

test('Shared Work Map shell renders direct and phased scopes with dependencies, readiness and no planning disposition',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{WorkMapShell}=require('../renderer/renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/WorkMapShell.tsx');
  const work={id:'work-one',title:'Ready outcome',objective:'Deliver outcome',kind:'work-item',sequence:1,state:'ready',complete:false,criteria:['Observable acceptance']};
  const direct=renderToStaticMarkup(React.createElement(WorkMapShell,{label:'Direct Work Map',nodes:[work],dependencies:[],accepted:true}));
  assert.match(direct,/Direct/); assert.match(direct,/Next executable scope: Ready outcome/); assert.doesNotMatch(direct,/Phase:|Approve|Revision Requested/);
  const phases=[{id:'phase-one',title:'First Phase',objective:'First outcome',kind:'phase',sequence:1,state:'closed',complete:true,criteria:[]},{id:'phase-two',title:'Second Phase',objective:'Second outcome',kind:'phase',sequence:2,state:'planned',complete:false,criteria:['Phase acceptance']}];
  const phased=renderToStaticMarkup(React.createElement(WorkMapShell,{label:'Phased Work Map',nodes:[...phases,{...work,parentId:'phase-two'}],dependencies:[{from:'phase-two',to:'phase-one'}],accepted:true}));
  assert.match(phased,/Phased/); assert.match(phased,/Depends on: First Phase/); assert.match(phased,/Phase acceptance/); assert.match(phased,/Next executable scope: Ready outcome/); assert.doesNotMatch(phased,/Approve|Revision Requested/);
});


test('SQL-native Migration approved Intake prepares Architect with an unprepared SourceBinding without recreating identities', async context => {
  const f = await exactPlanningFixture(context,'refactor-migration',false,false,true);
  const intake = (await f.store.listEntities(f.projectId,'WorkflowIntake'))[0];
  assert.equal(intake.recordVersion,1);
  assert.equal((await f.store.listEntities(f.projectId,'SourceBinding'))[0].body.preparationState,'unprepared');
  assert.equal((await f.resolve()).currentWorkspace,'refactor-assessment');
  const model = await require('../../dist/main/architectOutputs/structuredArchitectWorkspaceService.js').createStructuredArchitectWorkspaceService().prepare(f.root,f.workflow.id);
  assert.equal(model.intakeId,intake.id); assert.equal(model.intakeVersion,1);
  assert.equal((await f.store.listEntities(f.projectId,'WorkflowIntake')).length,1);
  assert.equal((await f.store.listEntities(f.projectId,'Workflow')).length,1);
});
