const assert = require("node:assert/strict");
const test = require("node:test");
const { runPlanningDraftAction } = require("../renderer/renderer-source-loader.cjs").loadRendererSourceModule("src/renderer/app/planningDraftAction.ts");

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

test("planning renderer reports invalid JSON and never invokes disposition", async () => {
  let visibleError = "";
  let dispositions = 0;
  await runPlanningDraftAction(() => JSON.parse("{"), async () => { dispositions++; }, message => { visibleError = message; });
  assert.match(visibleError, /JSON/);
  assert.equal(dispositions, 0);
});
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {registerCurrentProject} = require('../../dist/main/projectState/currentProjectRegistrationService.js');
const {createSQLiteProjectStateStore} = require('../../dist/main/projectState/sqliteProjectStateStore.js');
const {createProjectStateService} = require('../../dist/shared/projectState/projectStateService.js');
const {createExactWorkflowPlanningService} = require('../../dist/main/workPlanning/exactWorkflowPlanningService.js');
const {WORKFLOW_INTAKE_DEFINITIONS} = require('../../dist/shared/workflowIntakeContracts.js');
const {FEATURE_ARCHITECT_SECTIONS, ASSESSMENT_SECTIONS} = require('../../dist/shared/architectWorkspaceContracts.js');
const {resolveWorkPlanningProfile} = require('../../dist/main/workPlanning/workPlanningProfiles.js');
const operator = {principalId:'operator', principalType:'human', role:'Operator'};
async function exactPlanningFixture(context, type, noPlan = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'champcity-exact-plan-'));
  const registration = await registerCurrentProject(root, 'existing', {projectName:'Exact planning fixture'});
  const store = createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));
  context.after(() => {store.close(); fs.rmSync(root,{recursive:true,force:true});});
  const projectId = registration.project.id, state = createProjectStateService(store,operator), app = createExactWorkflowPlanningService();
  const workflow = await state.createWorkflow(projectId,{workflowType:type,title:type,currentWorkspace:'planning'});
  const values = Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS[type].fields.filter(field => field.required).map(field => [field.key,`${field.key} scope`]));
  const intake = await state.saveWorkflowIntake(projectId,{workflowId:workflow.id,workflowType:type,values});
  await state.recordWorkflowIntakeDecision(projectId,intake.id,{expectedIntakeRecordVersion:intake.recordVersion,outcome:'approved'});
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
  return {root,projectId,store,state,app,workflow,cycle};
}
for (const type of ['feature-capability','issue-resolution','refactor-migration','integration-composition','infrastructure-platform','research-prototype']) {
  test(`${type}: exact Planning uses profile evidence and approved SQL revisions through acceptance`, async context => {
    const f=await exactPlanningFixture(context,type), prepared=await f.app.prepare(f.root,f.workflow.id);
    const profile=resolveWorkPlanningProfile(type==='feature-capability'?'feature-change':type);
    for (const text of [...profile.requiredEvidence,...profile.discoveryQuestions,...profile.planSections]) assert.ok(prepared.handoff.includes(text));
    assert.ok(prepared.handoff.includes(f.workflow.id)); assert.ok(prepared.handoff.includes(f.cycle.id));
    assert.ok(prepared.handoff.includes('Do not supply topology'));
    const all=await f.store.listEntities(f.projectId), sources=all.filter(record=>record.entityType!=='Project' && record.entityType!=='Decision').map(record=>({entityId:record.id,recordVersion:record.recordVersion}));
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
    assert.equal((await f.app.get(f.root,f.workflow.id)).acceptedPlan.directWorkItems[0].id,accepted.acceptedPlan.directWorkItems[0].id);
  });
}
test('Research exact approved typed no-Plan outcome closes with SQL evidence and Decision',async context=>{
  const f=await exactPlanningFixture(context,'research-prototype',true), model=await f.app.get(f.root,f.workflow.id);
  assert.equal(model.handoff,null); assert.equal(model.researchOutcome.outcome,'no-implementation-plan-required');
  const closed=await f.app.closeResearch(f.root,f.workflow.id); assert.equal(closed.workflow.body.workflowState,'closed'); assert.equal(closed.decision.body.decisionType,'research-completion');
  assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,0);
});
test('Exact Planning refuses ambiguous legacy Markdown and missing approved Assessment',async context=>{
  const f=await exactPlanningFixture(context,'feature-capability');
  await assert.rejects(f.app.save(f.root,f.workflow.id,'```champcity-work-plan\n{}\n```'),/exact Workflow/);
  const peer=await f.state.createWorkflow(f.projectId,{workflowType:'feature-capability',title:'Peer',currentWorkspace:'feature-planning'});
  await assert.rejects(f.app.prepare(f.root,peer.id),/current exact SQL Intake/);
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
