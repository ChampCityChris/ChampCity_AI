const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  generatePhasePlanningHandoff,
  getPhasePlanningCompletion,
  getPhasePlanningWorkspaceModel,
  preparePhasePlanningHandoff,
  reviewPhasePlanningBundle,
} = require("../../dist/main/phasePlanning/phasePlanningService.js");
const {
  parseCanonicalMarkdownDocument,
} = require("../../dist/shared/documents/canonicalMarkdown.js");
const {
  listPlanningDocuments,
  seedApprovedPhaseInterview,
  seedApprovedProjectPlanning,
  seedPhaseMap,
  tempWorkspace,
} = require("../support/canonical-markdown-fixtures.cjs");

const candidate = {
  candidateId: "WC37A",
  order: 1,
  title: "Phase Planning Bundle",
  purpose: "Implement the phase planning cutover.",
  dependsOn: [],
  resolutionStatus: "planned",
  resolutionReason: "",
  evidencePaths: [],
};

function validPhasePlanningBody() {
  return [
    "# Phase Planning",
    "",
    "## Phase Objective",
    "Objective.",
    "## Scope",
    "Scope.",
    "## Non-Scope",
    "Non-scope.",
    "## Inherited Constraints",
    "Constraints.",
    "## Architecture and Implementation Direction",
    "Direction.",
    "## Major Deliverables",
    "Deliverables.",
    "## Dependencies",
    "Dependencies.",
    "## Risks and Mitigations",
    "Risks.",
    "## Validation Strategy",
    "Validation.",
    "## Acceptance Criteria",
    "Acceptance.",
    "## Sequencing Direction",
    "Sequence.",
    "## Deferred Items",
    "Deferred.",
    "## Unresolved Questions",
    "Questions.",
  ].join("\n");
}

function validWorkCardPlanBody() {
  return [
    "# Work Card Plan",
    "",
    "```champcity-work-card-plan",
    JSON.stringify([candidate], null, 2),
    "```",
  ].join("\n");
}

function writeDraft(root, relativePath, body) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, body, "utf8");
}

function seedReadyRoot(prefix) {
  const root = tempWorkspace("champcity-phase-planning-");
  seedApprovedProjectPlanning(root);
  seedPhaseMap(root, "phase-01");
  seedApprovedPhaseInterview(root, "phase-01");
  return root;
}

function draftPathsFromInstruction(instruction) {
  return [...instruction.matchAll(/"relativePath": "([^"]+)"/g)].map((match) => match[1]);
}

function readCanonical(root, relativePath) {
  return parseCanonicalMarkdownDocument(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function promoteValidBundle(root) {
  const result = generatePhasePlanningHandoff(root);
  let model = getPhasePlanningWorkspaceModel(root);
  const draftPaths = draftPathsFromInstruction(model.handoffInstruction);
  writeDraft(root, draftPaths[0], validPhasePlanningBody());
  writeDraft(root, draftPaths[1], validWorkCardPlanBody());
  model = getPhasePlanningWorkspaceModel(root);
  return { result, model, draftPaths };
}

test("phase planning handoff uses one atomic draft bundle and promotes both outputs", () => {
  const root = seedReadyRoot("happy");

  const result = generatePhasePlanningHandoff(root);
  assert.equal(result.phasePlanningMarkdownPath, "planning/phases/phase-01/Phase_Planning.md");
  assert.equal(result.workCardPlanMarkdownPath, "planning/phases/phase-01/Work_Card_Plan.md");
  assert.equal(["workCardPlan", "Json", "Path"].join("") in result, false);

  let model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "waiting-for-drafts");
  assert.doesNotMatch(model.handoffInstruction, /Initial Work Card/);
  assert.match(model.handoffInstruction, /"overwrite": false/);
  assert.equal((model.handoffInstruction.match(/"action": "write_markdown_artifact"/g) ?? []).length, 2);
  assert.doesNotMatch(model.handoffInstruction, /create_markdown_artifact/);
  assert.match(model.handoffInstruction, /host environment and repository foundation/);
  assert.match(model.handoffInstruction, /managed capability means ChampCity provisions and verifies it/i);
  assert.match(model.handoffInstruction, /external capability means approved evidence establishes outside ownership/i);
  assert.match(model.handoffInstruction, /human-interaction boundary means ChampCity prepares the action/i);
  assert.match(model.handoffInstruction, /Do not use phrases like prerequisite problem or Operator must install/i);
  assert.match(model.handoffInstruction, /establish and verify missing or unverified managed development capabilities before candidates that depend on them/i);
  const draftPaths = draftPathsFromInstruction(model.handoffInstruction);
  assert.equal(draftPaths.length, 2);

  writeDraft(root, draftPaths[0], validPhasePlanningBody());
  model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "partial-draft-set");
  assert.equal(fs.existsSync(path.join(root, result.phasePlanningMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, result.workCardPlanMarkdownPath)), false);

  writeDraft(root, draftPaths[1], validWorkCardPlanBody());
  model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "promoted");
  assert.equal(model.phasePlanningDocument.disposition, "Pending");
  assert.equal(model.workCardPlanDocument.disposition, "Pending");
  assert.deepEqual(
    model.workCardPlanDocument && listPlanningDocuments(root)
      .find((document) => document.markdownPath === result.workCardPlanMarkdownPath)
      .metadata.canonical.workflowData.candidates,
    [candidate],
  );

  model = reviewPhasePlanningBundle(root, "Approved", "");
  assert.equal(model.phasePlanningDocument.disposition, "Approved");
  assert.equal(model.workCardPlanDocument.disposition, "Approved");
  assert.equal(getPhasePlanningCompletion(root, "phase-01").complete, true);
});

test("phase planning malformed draft retains drafts and explicit retry uses fresh paths", () => {
  const root = seedReadyRoot("malformed");
  const result = generatePhasePlanningHandoff(root);
  let model = getPhasePlanningWorkspaceModel(root);
  const firstDraftPaths = draftPathsFromInstruction(model.handoffInstruction);
  writeDraft(root, firstDraftPaths[0], validPhasePlanningBody());
  writeDraft(root, firstDraftPaths[1], "# Work Card Plan\n\n```champcity-work-card-plan\n{\"candidates\": []}\n```");

  model = getPhasePlanningWorkspaceModel(root);
  assert.equal(model.draftSubmissionState, "promotion-failed");
  assert.match(model.draftPromotionError, /candidates must be an array/);
  assert.equal(fs.existsSync(path.join(root, result.phasePlanningMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, result.workCardPlanMarkdownPath)), false);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[0])), true);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[1])), true);

  model = preparePhasePlanningHandoff(root);
  const retryDraftPaths = draftPathsFromInstruction(model.handoffInstruction);
  assert.equal(retryDraftPaths.length, 2);
  assert.notDeepEqual(retryDraftPaths, firstDraftPaths);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[0])), true);
  assert.equal(fs.existsSync(path.join(root, firstDraftPaths[1])), true);
});

test("phase planning RevisionRequested bundle revises both documents once and resets review state", () => {
  const root = seedReadyRoot("revision");
  const { result } = promoteValidBundle(root);
  reviewPhasePlanningBundle(root, "RevisionRequested", "Tighten the sequencing and split the bundle work.");

  let model = preparePhasePlanningHandoff(root);
  const draftPaths = draftPathsFromInstruction(model.handoffInstruction);
  writeDraft(root, draftPaths[0], `${validPhasePlanningBody()}\n\nRevision pass.`);
  writeDraft(root, draftPaths[1], validWorkCardPlanBody());
  model = getPhasePlanningWorkspaceModel(root);

  assert.equal(model.draftSubmissionState, "promoted");
  const phasePlanning = readCanonical(root, result.phasePlanningMarkdownPath);
  const workCardPlan = readCanonical(root, result.workCardPlanMarkdownPath);
  assert.equal(phasePlanning.metadata.artifactRevision, 2);
  assert.equal(workCardPlan.metadata.artifactRevision, 2);
  assert.equal(phasePlanning.metadata.documentDisposition.status, "Pending");
  assert.equal(workCardPlan.metadata.documentDisposition.status, "Pending");
  assert.equal(phasePlanning.metadata.documentDisposition.notes, "");
  assert.equal(workCardPlan.metadata.documentDisposition.notes, "");
  assert.equal(phasePlanning.metadata.documentDisposition.reviewedAt, null);
  assert.equal(workCardPlan.metadata.documentDisposition.reviewedAt, null);
});

async function structuredPhaseLoopFixture(context, sourceBacked = false, observe = async()=>{}) {
  const os = require('node:os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(),sourceBacked?'cc-r02-':'champcity-sql-phase-map-'));
  const registration = await require('../../dist/main/projectState/currentProjectRegistrationService.js').registerCurrentProject(root,'existing',{projectName:'Map fixture',...(sourceBacked?{sourceRepositoryId:'selected-project-source'}:{})});
  if(sourceBacked){
    await require('../../dist/main/sourceControl/projectSourceBootstrap.js').bootstrapProjectSource(root,'selected-project-source');
    const dev=path.join(root,'Dev');
    const git=(...args)=>require('node:child_process').execFileSync('git',args,{cwd:dev,encoding:'utf8'}).trim();
    git('config','core.longpaths','true');git('config','user.name','Greenfield Test');git('config','user.email','greenfield@example.invalid');
    fs.writeFileSync(path.join(dev,'package.json'),JSON.stringify({scripts:{verify:'node -e "process.exit(0)"'}}));
    fs.writeFileSync(path.join(dev,'.champcity','integration-policy.json'),JSON.stringify({schemaVersion:1,checks:[{checkId:'greenfield-source',lane:'integration',runner:{kind:'npm-script',script:'verify',timeoutMs:15000}}],requiredIntegrationChecks:['greenfield-source']}));
    git('add','.');git('commit','-m','Synthetic integration policy');
  }
  const store = require('../../dist/main/projectState/sqliteProjectStateStore.js').createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));
  context.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  const state = require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(store,{principalId:'operator',principalType:'human',role:'Operator'}), projectId=registration.project.id;
  const workflow = (await state.createProjectCreationWorkflow(projectId,{title:'Map Greenfield'})).workflow;
  await observe({root,store,state,projectId,workflow},'project-intake-capture');
  const {WORKFLOW_INTAKE_DEFINITIONS}=require('../../dist/shared/workflowIntakeContracts.js');
  const values=Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS['project-creation'].fields.filter(field=>field.required).map(field=>[field.key,field.key==='hasExistingSourceOrPlanning'?false:field.key==='projectRepository'?root:field.key==='projectName'?'map_fixture':field.key+' scope']));
  const intake=await state.saveWorkflowIntake(projectId,{workflowId:workflow.id,workflowType:'project-creation',values});
  await state.recordWorkflowIntakeDecision(projectId,intake.id,{expectedIntakeRecordVersion:1,outcome:'approved'});
  await observe({root,store,state,projectId,workflow},'architect-interview');
  const {GREENFIELD_ARCHITECT_SECTIONS}=require('../../dist/shared/architectWorkspaceContracts.js');
  const interview=await state.saveArchitectCandidate(projectId,{workflowId:workflow.id,workflowType:'project-creation',intakeId:intake.id,intakeVersion:1,output:Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key=>[key,[key+' direction']]))});
  await state.recordArchitectReview(projectId,interview.id,{expectedRecordVersion:1,outcome:'approved'});
  await observe({root,store,state,projectId,workflow},'project-planning-review');
  const planning=require('../../dist/main/projectPlanning/structuredProjectPlanningService.js').createStructuredProjectPlanningService(), model=await planning.get(root,workflow.id);
  const candidate=await planning.save(root,workflow.id,{workflowId:workflow.id,facts:[{title:'Verified product',statement:'Observed bounded purpose',impact:'Constrains map'}],direction:{title:'Direction',objective:'Deliver result',scopeIn:['Outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Verify outcome',criticality:'required',verificationIntent:'Review result',validationPolicy:'operator_decision'}],sources:model.sources});
  await planning.review(root,workflow.id,candidate.review.cycleId,{expectedRecordVersion:1,outcome:'approved'});
  await observe({root,store,state,projectId,workflow},'project-phase-map');
  const mapService = require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService();
  const mapContext = await mapService.get(root,workflow.id);
  const mapSaved = await mapService.save(root,workflow.id,{workflowId:workflow.id,phases:sourceBacked?typedMapPhases.slice(0,1):typedMapPhases,sources:mapContext.sources});
  await mapService.review(root,workflow.id,mapSaved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  await observe({root,store,state,projectId,workflow},'phase-interview');
  return {root,store,state,projectId,workflow,service:require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService()};
}

test('Greenfield navigation derives the current Phase from SQL while historical Markdown remains inert', async context => {
  const f=await structuredPhaseLoopFixture(context),navigation=require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService();
  const file=path.join(f.root,'planning','phases','phase_one','Phase_Planning.md');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'# Historical approved planning prose');
  const result=await navigation.get(f.root,f.workflow.id);
  assert.equal(result.workflowId,f.workflow.id);assert.equal(result.closed,false);assert.equal(result.currentPhaseId,(await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id)).phases[0].phaseId);
  assert.equal(result.currentWorkItemId,null);assert.equal(result.currentWorkspace,'phase-interview');assert.equal(result.currentPhaseId,(await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id)).phases[0].phaseId);assert.equal(fs.readFileSync(file,'utf8'),'# Historical approved planning prose');
});
const typedMapPhases=[{phaseId:'phase_one',title:'First outcome',order:1,purpose:'Deliver first independently useful outcome',dependsOn:[],sourceReferences:['planning/project/PROJECT_PROFILE.md']},{phaseId:'phase_two',title:'Second outcome',order:2,purpose:'Consume first accepted outcome',dependsOn:['phase_one'],sourceReferences:['planning/project/PROJECT_PROFILE.md']}];

test('SQL Phase Interview and Phase Planning preserve exact stage review and activate the same WorkItems', async context => {
  const f = await structuredPhaseLoopFixture(context), loop = require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
  const historical = 'planning/phases/phase_one/Phase_Interview.md';
  fs.mkdirSync(path.dirname(path.join(f.root, historical)), {recursive:true}); fs.writeFileSync(path.join(f.root,historical),'# Historical Phase Interview\nApproved prose and invented completed work');
  const initial = await loop.get(f.root,f.workflow.id,'phase_one','interview'); assert.equal(initial.review,null);
  assert.equal(require('../../dist/main/phaseInterview/phaseInterviewService.js').getPhaseIntakeCompletion(f.root,'phase_one').complete,false);
  const input = {workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'interview',facts:[{title:'Verified Phase understanding',statement:'The outcome is independently useful',impact:'Bounded scope'}],direction:{title:'Phase direction',objective:'Deliver first outcome',scopeIn:['First outcome'],scopeOut:['Later outcome'],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Observable first outcome',criticality:'required',verificationIntent:'Review result',validationPolicy:'operator_decision'}],sources:initial.sources};
  const first = await loop.save(f.root,f.workflow.id,'phase_one','interview',input);
  await assert.rejects(loop.review(f.root,f.workflow.id,'phase_one','interview',first.review.cycle.id,{expectedRecordVersion:2,outcome:'approved'}),/stale/);
  await loop.review(f.root,f.workflow.id,'phase_one','interview',first.review.cycle.id,{expectedRecordVersion:1,outcome:'revision_requested',notes:'Clarify bounded outcome'});
  const revised = await loop.save(f.root,f.workflow.id,'phase_one','interview',{...input,expectedRecordVersion:1,direction:{...input.direction,objective:'Deliver clarified first outcome'}});
  assert.equal(revised.review.cycle.id,first.review.cycle.id); assert.equal(revised.review.cycle.recordVersion,2); assert.equal(revised.review.disposition.state,'none');
  const listeners = new Map(); require('../../dist/main/workflow/workflowApplicationIpc.js').registerWorkflowApplicationIpc({handle:(name,listener)=>listeners.set(name,listener)},()=>f.root);
  assert.throws(()=>listeners.get('workflow:phaseLoopGet')({},f.workflow.id,'phase_one','wrong-stage'),/Phase and stage/);
  await listeners.get('workflow:phaseLoopReview')({},f.workflow.id,'phase_one','interview',revised.review.cycle.id,{expectedRecordVersion:2,outcome:'approved'});
  assert.equal(require('../../dist/main/phaseInterview/phaseInterviewService.js').getPhaseIntakeCompletion(f.root,'phase_one').complete,true);
  assert.throws(()=>require('../../dist/main/phaseInterview/phaseInterviewService.js').reviewPhaseInterview(f.root,'Approved'),/structured SQL/);
  const planning = await loop.get(f.root,f.workflow.id,'phase_one','planning');
  const candidates = [{candidateId:'first',order:1,title:'First work',purpose:'Deliver first part',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[{statement:'Work outcome holds',criticality:'required',verificationIntent:'Review WorkItem',validationPolicy:'operator_decision'}]},{candidateId:'second',order:2,title:'Second work',purpose:'Consume first result',dependsOn:['first'],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[]}];
  const planInput = {...input,stageKind:'planning',sources:planning.sources,candidates};
  await assert.rejects(loop.save(f.root,f.workflow.id,'phase_one','planning',{...planInput,candidates:[{...candidates[0],dependsOn:['second']},candidates[1]]}),/dependency/);
  const saved = await listeners.get('workflow:phaseLoopSave')({},f.workflow.id,'phase_one','planning',planInput);
  const ids = saved.review.workItems.map(work=>work.id); assert.equal(ids.length,2);
  await assert.rejects(f.state.createRelationship(f.projectId,ids[0],'part_of',initial.phase.id),/typed planning/);
  const dependency = (await f.store.listRelationships(f.projectId)).find(edge=>edge.relationshipType==='depends_on' && edge.fromEntityId===ids[1]);
  await assert.rejects(f.state.endRelationship(f.projectId,dependency.id),/typed planning/);
  await assert.rejects(loop.get(f.root,f.workflow.id,'phase_two','interview'),/dependencies/);

  await listeners.get('workflow:phaseLoopReview')({},f.workflow.id,'phase_one','planning',saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const accepted = await loop.get(f.root,f.workflow.id,'phase_one','planning'); assert.deepEqual(accepted.review.workItems.map(work=>work.id),ids);
  const execution = await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id);
  const phaseObligation = execution.criteria.find(entry=>entry.ownerId===initial.phase.id && entry.record.body.statement==='Observable first outcome'); assert.ok(phaseObligation);
  assert.ok((await f.state.getPhaseCompletionEligibility(f.projectId,initial.phase.id)).blockers.includes('operator-decision:'+phaseObligation.record.id));
  assert.equal((await f.service.get(f.root,f.workflow.id)).review.disposition.state,'approved');
  assert.equal(require('../../dist/main/phasePlanning/phasePlanningService.js').getPhasePlanningCompletion(f.root,'phase_one').complete,true);
  await assert.rejects(f.state.recordDecision(f.projectId,saved.review.cycle.id,{decisionType:'phase-loop-review',outcome:'approved',decisionScope:'raw'}),/typed/);
  const kernel = require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
  const shared = await kernel.getExecutionProjection(f.root,f.workflow.id);
  assert.deepEqual(shared.items.filter(item=>ids.includes(item.record.id)).map(item=>item.record.id).sort(),[...ids].sort());
  assert.equal(shared.items.find(item=>item.record.id===ids[1]).eligibility.eligible,false);
  assert.equal(listeners.has('workflow:phaseWorkIntakeGet'),false); assert.equal(listeners.has('workflow:phaseWorkPrepare'),false);
  assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,2);
  fs.writeFileSync(path.join(f.root,historical),'Changed historical prose'); assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','interview')).review.disposition.state,'approved');
  const stable = accepted.review.markdown, work = await f.store.getEntity(f.projectId,ids[0]);
  await f.store.transaction(f.projectId,unit=>unit.saveEntity({...work,recordVersion:work.recordVersion+1,updatedAt:new Date().toISOString(),body:{...work.body,workState:'closed'}},work.recordVersion));
  assert.equal((await kernel.getExecutionProjection(f.root,f.workflow.id)).items.find(item=>item.record.id===ids[0]).record.body.workState,'closed'); assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.markdown,stable);
});

test('Historical Phase Planning metadata is inert and fresh structured planning is required', async context => {
  const f = await structuredPhaseLoopFixture(context), loop = require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
  const initial = await loop.get(f.root,f.workflow.id,'phase_one','interview');
  const direction = {title:'Approved direction',objective:'Implement accepted first Phase',scopeIn:['First Phase'],scopeOut:[],constraints:[],assumptions:[],risks:[]};
  const interview = await loop.save(f.root,f.workflow.id,'phase_one','interview',{workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'interview',facts:[],direction,criteria:[],sources:initial.sources});
  await loop.review(f.root,f.workflow.id,'phase_one','interview',interview.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const candidates = [{candidateId:'fresh_first',order:1,title:'Fresh first candidate',purpose:'Structured purpose',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[]},{candidateId:'fresh_second',order:2,title:'Fresh second candidate',purpose:'Dependent structured purpose',dependsOn:['fresh_first'],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[]}];
  const paths = ['planning/phases/phase_one/Phase_Planning.md','planning/phases/phase_one/Work_Card_Plan.md'];
  for (const file of paths) { fs.mkdirSync(path.dirname(path.join(f.root,file)),{recursive:true}); fs.writeFileSync(path.join(f.root,file),'# Historical narrative\nTyped legacy obligation; this prose is not migration input.'); }
  const original = paths.map(file=>fs.readFileSync(path.join(f.root,file),'utf8'));
  const historical = await loop.get(f.root,f.workflow.id,'phase_one','planning'); assert.equal(historical.review,null); assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,0);
  assert.deepEqual(paths.map(file=>fs.readFileSync(path.join(f.root,file),'utf8')),original);
  const freshInput=await loop.get(f.root,f.workflow.id,'phase_one','planning');
  const fresh=await loop.save(f.root,f.workflow.id,'phase_one','planning',{workflowId:f.workflow.id,phaseId:freshInput.phase.id,stageKind:'planning',facts:[],direction,criteria:[],candidates,sources:freshInput.sources});
  assert.equal(fresh.review.disposition.state,'none'); assert.equal(fresh.review.workItems.length,2); assert.doesNotMatch(fresh.review.markdown,/Typed legacy obligation/);
  const again = await loop.get(f.root,f.workflow.id,'phase_one','planning'); assert.equal(again.review.cycle.id,fresh.review.cycle.id); assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,2);
  for (const file of paths) fs.unlinkSync(path.join(f.root,file)); assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.markdown,fresh.review.markdown);
  assert.equal((await f.store.listEntities(f.projectId,'Evidence')).some(record=>record.entityType==='Evidence'&&record.body.evidenceType==='legacy-phase-plan-import'),false);
  const exact = await f.state.createWorkflow(f.projectId,{workflowType:'feature-capability',title:'Exact Feature',currentWorkspace:'feature-planning'}); await assert.rejects(loop.get(f.root,exact.id,'phase_one','interview'),/other Workflows/);
});
test('SQL WorkItem planning governs Greenfield contract revisions and ignores generated Formal Markdown', async context => {
  const f=await structuredPhaseLoopFixture(context), loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
  const direction={title:'Bounded direction',objective:'First outcome',scopeIn:['First'],scopeOut:[],constraints:[],assumptions:[],risks:[]};
  let initial=await loop.get(f.root,f.workflow.id,'phase_one','interview');
  let model=await loop.save(f.root,f.workflow.id,'phase_one','interview',{workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'interview',facts:[],direction,criteria:[],sources:initial.sources});
  await loop.review(f.root,f.workflow.id,'phase_one','interview',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  initial=await loop.get(f.root,f.workflow.id,'phase_one','planning');
  model=await loop.save(f.root,f.workflow.id,'phase_one','planning',{workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'planning',facts:[],direction,criteria:[],sources:initial.sources,candidates:[{candidateId:'contract_work',order:1,title:'Exact work',purpose:'Deliver bounded outcome',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[{statement:'Inherited accepted obligation',criticality:'required',verificationIntent:'Preserve inherited obligation',validationPolicy:'operator_decision'}]}]});
  await loop.review(f.root,f.workflow.id,'phase_one','planning',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const id=model.review.workItems[0].id, service=require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService();
  let current=await service.get(f.root,f.workflow.id,id); assert.equal(current.review.required,true);
  const contract={workflowId:f.workflow.id,workItemId:id,expectedVersion:current.workItem.recordVersion,implementationBoundaries:['Only accepted first outcome'],affectedPaths:[],proofIntent:['Operator verifies outcome'],criteria:[{statement:'Inherited accepted obligation',criticality:'required',verificationIntent:'Preserve inherited obligation',validationPolicy:'operator_decision'},{statement:'Detailed observable outcome',criticality:'required',verificationIntent:'Inspect result',validationPolicy:'operator_decision'}]};
  current=await service.save(f.root,f.workflow.id,id,JSON.stringify(contract)); assert.equal(current.workItem.recordVersion,3); assert.equal(current.review.disposition.state,'none');
  await assert.rejects(service.save(f.root,f.workflow.id,id,JSON.stringify(contract)),/stale/);
  await assert.rejects(service.review(f.root,f.workflow.id,id,{expectedRecordVersion:1,outcome:'approved'}),/stale/);
  current=await service.review(f.root,f.workflow.id,id,{expectedRecordVersion:3,outcome:'approved'}); assert.equal(current.review.disposition.state,'approved');
  const kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
  const eligibility=async()=> (await kernel.getExecutionProjection(f.root,f.workflow.id)).items.find(item=>item.record.id===id).eligibility;
  assert.equal((await eligibility()).eligible,true);
  const generated=path.join(f.root,'planning/work-items',id,'Work_Card.md'); fs.mkdirSync(path.dirname(generated),{recursive:true}); fs.writeFileSync(generated,'# Rejected forged generated projection');
  assert.equal((await eligibility()).eligible,true); assert.equal((await service.get(f.root,f.workflow.id,id)).review.disposition.state,'approved');
  assert.equal((await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id)).criteria.filter(entry=>entry.ownerId===id && entry.record.body.statement==='Detailed observable outcome').length,1);
  await assert.rejects(f.state.reviseRecord(f.projectId,id,{proofIntent:['Bypass review']},3),/typed/);
  current=await service.save(f.root,f.workflow.id,id,JSON.stringify({...contract,expectedVersion:3,criteria:contract.criteria.slice(1),proofIntent:['Revised focused proof']})); assert.equal(current.review.disposition.state,'none'); assert.equal((await eligibility()).eligible,false);
  const livePlan=await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id); assert.equal(livePlan.criteria.filter(entry=>entry.ownerId===id && entry.record.body.statement==='Inherited accepted obligation').length,1);
  const result=await service.decompose(f.root,f.workflow.id,id,JSON.stringify({...contract,expectedVersion:4,decomposition:{replacements:[{key:'bounded_a',kind:'feature',title:'First',objective:'First bounded outcome',dependencyWorkItemIds:[],dependencyReplacementKeys:[]},{key:'bounded_b',kind:'feature',title:'Second',objective:'Second bounded outcome',dependencyWorkItemIds:[],dependencyReplacementKeys:['bounded_a']}],criterionDispositions:livePlan.criteria.filter(entry=>entry.ownerId===id).map(entry=>({criterionId:entry.record.id,disposition:'transfer',replacementKey:'bounded_a'})),incomingDependentMappings:[]}}));
  assert.equal(result.replacements.length,2); assert.equal((await require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService().getExecutionProjection(f.root,f.workflow.id)).items.filter(item=>result.replacements.some(work=>work.id===item.record.id)).length,2);
  assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.disposition.state,'approved');
});


test('Greenfield SQL review and Repair preserve current Tester, human Criteria and exact return lineage', async context => {
  const f=await structuredPhaseLoopFixture(context),loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService(),kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService(),reviewService=require('../../dist/main/workCardValidation/structuredWorkItemReviewService.js').createStructuredWorkItemReviewService();
  const principal=(id,role)=>require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(f.store,{principalId:id,principalType:'agent',role}),tester=principal('independent-tester','Tester'),validator=principal('independent-validator','Validator');
  let initial=await loop.get(f.root,f.workflow.id,'phase_one','interview');
  const base={workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'interview',facts:[{title:'Bounded result',statement:'Observed scope',impact:'Acceptance'}],direction:{title:'Phase outcome',objective:'Deliver independently useful outcome',scopeIn:['Outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Outcome verified independently',criticality:'required',verificationIntent:'Review exact result',validationPolicy:'semantic_ai'}],sources:initial.sources};
  let saved=await loop.save(f.root,f.workflow.id,'phase_one','interview',base);await loop.review(f.root,f.workflow.id,'phase_one','interview',saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  initial=await loop.get(f.root,f.workflow.id,'phase_one','planning');saved=await loop.save(f.root,f.workflow.id,'phase_one','planning',{...base,stageKind:'planning',sources:initial.sources,candidates:[{candidateId:'review_work',order:1,title:'Review work',purpose:'Exact bounded result',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[{statement:'Visual result is usable',criticality:'required',verificationIntent:'Operator views the result',validationPolicy:'visual_human'}]}]});await loop.review(f.root,f.workflow.id,'phase_one','planning',saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const id=saved.review.workItems[0].id;
  const planning=require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService();
  async function approveContract(workId){const work=await f.store.getEntity(f.projectId,workId);let model=await planning.save(f.root,f.workflow.id,workId,JSON.stringify({workflowId:f.workflow.id,workItemId:workId,expectedVersion:work.recordVersion,implementationBoundaries:['Only exact accepted repair/outcome'],affectedPaths:[],proofIntent:['Independent exact proof']}));await planning.review(f.root,f.workflow.id,workId,{expectedRecordVersion:model.workItem.recordVersion,outcome:'approved'});}
  async function attempt(workId,ref,recommendation='reuse-existing-proof'){const work=await f.store.getEntity(f.projectId,workId);const attempt=await kernel.beginWorkItemAttempt(f.root,f.workflow.id,workId,work.recordVersion,ref);const implementation=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,workId,attempt.executionRef,{summary:'Implemented exact outcome',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'});const waiting=await reviewService.get(f.root,f.workflow.id,workId);assert.equal(waiting.validation.testerResultId,null);assert.ok(waiting.validation.completion.blockers.includes('tester-result-missing-or-stale'));const result=await tester.createTesterResult(f.projectId,f.workflow.id,workId,implementation.id,{sourceMode:'source-neutral',recommendation,affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Independently examined outcome'],unknowns:[],rationale:'Exact outcome reviewed'});return {implementation,result};}
  await approveContract(id);const first=await attempt(id,'greenfield-first','production-defect-suspected');
  const created=await kernel.createWorkflowRepair(f.root,f.workflow.id,id,first.result.id),repairId=created.repair.id;assert.equal((await reviewService.get(f.root,f.workflow.id,id)).repairs[0].parentId,id);

  assert.equal((await kernel.createWorkflowRepair(f.root,f.workflow.id,id,first.result.id)).repair.id,repairId);
  const repairFile='planning/work-items/'+repairId+'/Repair_Work_Card.md'; fs.mkdirSync(path.dirname(path.join(f.root,repairFile)),{recursive:true}); fs.writeFileSync(path.join(f.root,repairFile),'# Historical Repair Work Card\nApproved prose is not SQL authority.');
  assert.equal((await planning.get(f.root,f.workflow.id,repairId)).review.disposition.state,'none');
  let repairPlan=await planning.get(f.root,f.workflow.id,repairId);assert.equal(repairPlan.review.required,true);
  repairPlan=await planning.save(f.root,f.workflow.id,repairId,JSON.stringify({workflowId:f.workflow.id,workItemId:repairId,expectedVersion:repairPlan.workItem.recordVersion,implementationBoundaries:['Only the exact failed outcome'],affectedPaths:[],proofIntent:['Independent repair proof']}));
  repairPlan=await planning.review(f.root,f.workflow.id,repairId,{expectedRecordVersion:repairPlan.workItem.recordVersion,outcome:'approved'});assert.equal(repairPlan.review.disposition.state,'approved');fs.unlinkSync(path.join(f.root,repairFile));
  const repairAttempt=await attempt(repairId,'greenfield-repair');let repairReview=await reviewService.get(f.root,f.workflow.id,repairId);
  for(const entry of repairReview.validation.criteria.filter(entry=>entry.criterion.body.criticality==='required'))await validator.recordValidation(f.projectId,entry.criterion.id,{validationType:'work-item-criterion',method:'Independent exact proof',validationMode:'semantic_ai',outcome:'pass',summary:'Repair outcome holds',targetRecordVersion:entry.criterion.recordVersion,implementationRecordId:repairAttempt.implementation.id});
  await kernel.completeWorkItem(f.root,f.workflow.id,repairId,(await f.store.getEntity(f.projectId,repairId)).recordVersion);assert.equal((await f.store.getEntity(f.projectId,id)).body.workState,'ready');assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.disposition.state,'approved');
  const second=await attempt(id,'greenfield-second');await assert.rejects(kernel.createWorkflowRepair(f.root,f.workflow.id,id,first.result.id),/stale/);
  let current=await reviewService.get(f.root,f.workflow.id,id);const human=current.validation.criteria.find(entry=>entry.policy==='visual_human');assert.equal(human.humanEvidenceRequired,true);assert.equal(human.outcome,'pending');
  await assert.rejects(kernel.recordWorkItemVisualCriterion(f.root,{workflowId:f.workflow.id,workItemId:id,criterionId:human.criterion.id,expectedCriterionVersion:99,outcome:'pass',summary:'Wrong revision'}),/exact|current|stale/);
  const visual=await kernel.recordWorkItemVisualCriterion(f.root,{workflowId:f.workflow.id,workItemId:id,criterionId:human.criterion.id,expectedCriterionVersion:human.criterion.recordVersion,outcome:'pass',summary:'Operator observed usable result'});
  for(const entry of current.validation.criteria.filter(entry=>entry.policy==='semantic_ai'))await validator.recordValidation(f.projectId,entry.criterion.id,{validationType:'work-item-criterion',method:'Independent exact proof',validationMode:'semantic_ai',outcome:'pass',summary:'Current result holds',targetRecordVersion:entry.criterion.recordVersion,implementationRecordId:second.implementation.id});
  current=await reviewService.get(f.root,f.workflow.id,id);assert.equal(current.validation.completion.eligible,true,current.validation.completion.blockers.join(','));
  const historical='planning/work-items/'+id+'/Validation_Record.md'; fs.mkdirSync(path.dirname(path.join(f.root,historical)),{recursive:true}); fs.writeFileSync(path.join(f.root,historical),'# Historical Validation Record\nArbitrary prose: reject everything.');
  const before=(await f.store.listEntities(f.projectId,'Validation')).length;assert.equal((await reviewService.get(f.root,f.workflow.id,id)).validation.completion.eligible,true);assert.equal((await f.store.listEntities(f.projectId,'Evidence')).filter(record=>record.body.evidenceType==='controlled-review-import').length,0);assert.equal((await f.store.listEntities(f.projectId,'Validation')).length,before);
  fs.unlinkSync(path.join(f.root,historical));const generated=path.join(f.root,'planning','Generated_Review.md');fs.writeFileSync(generated,current.markdown);fs.writeFileSync(generated,'# Forged pass/fail or repair prose');assert.equal((await reviewService.get(f.root,f.workflow.id,id)).validation.completion.eligible,true);
  assert.throws(()=>require('../../dist/main/workCardValidation/workCardValidationService.js').applyOperatorValidationDecision(f.root,'phase_one',id,{decision:'ValidatePassed',operatorNotes:'Bypass'}),/SQL/);assert.throws(()=>require('../../dist/main/workCardRepair/workCardRepairService.js').createRepairWorkCard(f.root,'phase_one',id,historical,'postValidationRecord','Bypass'),/SQL/);
  await kernel.completeWorkItem(f.root,f.workflow.id,id,(await f.store.getEntity(f.projectId,id)).recordVersion);assert.equal((await f.store.getEntity(f.projectId,id)).body.workState,'closed');assert.equal((await kernel.getExecutionProjection(f.root,f.workflow.id)).items.find(item=>item.record.id===id).record.body.workState,'closed');assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.disposition.state,'approved');assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
});


test('SQL Close Advance traverses WorkItems, dependent Phases and Project Creation closure while preserving the active Project',async context=>{
 for(const sourceBacked of [false,true])await qualifyProjectCreationCompletion(context,sourceBacked);
});
async function qualifyProjectCreationCompletion(context,sourceBacked){
 const f=await structuredPhaseLoopFixture(context,sourceBacked),loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService(),close=require('../../dist/main/workflow/structuredCloseAdvanceService.js').createStructuredCloseAdvanceService(),kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
 const originalProject=await f.store.getProject(f.projectId);
 async function reviewedClose(scope,targetEntityId,expectedTargetVersion){
   const input={workflowId:f.workflow.id,scope,targetEntityId,expectedTargetVersion,closureDecision:'DoNotClose',rationale:'Review the exact completed outcome'};
   let review=await close.saveCloseout(f.root,input);
   assert.equal((await f.store.getEntity(f.projectId,targetEntityId)).lifecycleState,'active');
   assert.equal(review.document.authoritative,false);assert.equal(review.document.bodyMarkdown,review.markdown);assert.equal(review.document.documentReadState,'readable');assert.match(review.document.displayFilename,/CLOSEOUT.md$/);assert.match(review.markdown,/Reviewed source revisions/);assert.match(review.markdown,new RegExp(targetEntityId+'@'+expectedTargetVersion));
   await assert.rejects(close.close(f.root,{workflowId:f.workflow.id,scope:scope==='project'?'workflow':'phase',entityId:targetEntityId,expectedVersion:expectedTargetVersion,outcome:'Close',rationale:'Bypass'}),/Closeout review/);
   if(scope==='phase')await assert.rejects(kernel.completePhase(f.root,f.workflow.id,targetEntityId,expectedTargetVersion),/Closeout review/);
   else if(!sourceBacked)await assert.rejects(kernel.completeWorkflowExecution(f.root,f.workflow.id,expectedTargetVersion),/Closeout review/);
   for(const outcome of ['approved','revision_requested','rejected']){
     review=await close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome,notes:'Explicit fixture Operator review'});
     assert.equal(review.disposition.state,outcome);assert.equal((await f.store.getEntity(f.projectId,targetEntityId)).lifecycleState,'active');
   }
   const oldVersion=review.recordVersion;
   review=await close.saveCloseout(f.root,{...input,expectedRecordVersion:oldVersion,closureDecision:'Close'});
   assert.equal(review.disposition.state,'none');assert.equal(review.recordVersion,oldVersion+1);
   await assert.rejects(close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:oldVersion,outcome:'approved'}),/stale/);
   const currentTarget=await f.store.getEntity(f.projectId,targetEntityId);
   await f.state.reviseRecord(f.projectId,targetEntityId,scope==='project'?{title:currentTarget.body.title+' reviewed'}:{phaseState:currentTarget.body.phaseState},expectedTargetVersion);
   await assert.rejects(close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'}),/stale/);
   input.expectedTargetVersion=++expectedTargetVersion;
   review=await close.saveCloseout(f.root,{...input,expectedRecordVersion:review.recordVersion,closureDecision:'Close'});
   await assert.rejects(f.state.recordDecision(f.projectId,review.cycleId,{decisionType:'closeout-review',outcome:'approved',decisionScope:'forged',rationale:'Bypass'}),/typed decision/);
   await assert.rejects(require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(f.store,{principalId:'agent',principalType:'agent',role:'Operator'}).recordCloseoutReview(f.projectId,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'}),/human Operator/);
   await f.state.recordDecision(f.projectId,targetEntityId,{decisionType:'closeout-evidence-observation',outcome:'advisory',decisionScope:'fixture',rationale:'New evidence after candidate'});
   assert.equal((await close.getCloseout(f.root,f.workflow.id,scope,targetEntityId)).current,false);
   await assert.rejects(close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'}),/stale/);
   review=await close.saveCloseout(f.root,{...input,expectedRecordVersion:review.recordVersion,closureDecision:'Close'});
   const peers=(await f.store.listEntities(f.projectId)).filter(record=>['Workflow','Phase'].includes(record.entityType)&&record.id!==targetEntityId);
   await assert.rejects(close.reviewCloseout(f.root,require('node:crypto').randomUUID(),review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'}),/Workflow/);
   const before=(await f.store.listEntities(f.projectId)).length;
   const failingStore=new Proxy(f.store,{get(target,key){if(key==='transaction')return (projectId,action)=>target.transaction(projectId,unit=>action(new Proxy(unit,{get(u,k){if(k==='saveEntity')return (record,...args)=>{if(record.id===targetEntityId&&record.lifecycleState==='closed')throw Error('injected close failure');return u.saveEntity(record,...args);};return typeof u[k]==='function'?u[k].bind(u):u[k];}})));return typeof target[key]==='function'?target[key].bind(target):target[key];}});
   await assert.rejects(require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(failingStore,{principalId:'fixture-operator',principalType:'human',role:'Operator'}).recordCloseoutReview(f.projectId,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'}),/injected close failure/);
   assert.equal((await f.store.listEntities(f.projectId)).length,before);assert.equal((await f.store.getEntity(f.projectId,targetEntityId)).lifecycleState,'active');
   review=await close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'});
   assert.equal(review.closed,true);assert.equal(review.current,true);assert.equal(review.disposition.state,'approved');
   for(const peer of peers)assert.deepEqual(await f.store.getEntity(f.projectId,peer.id),peer);
 }
 let materialized;
 if(sourceBacked){
   const revision=require('node:child_process').execFileSync('git',['rev-parse','dev'],{cwd:path.join(f.root,'Dev'),encoding:'utf8'}).trim();
   await f.state.createWorkflowSourceBaseline(f.projectId,f.workflow.id,{repositoryId:'selected-project-source',integrationTargetSourceLineId:'dev',baseRevisionId:revision});
   materialized=await require('../../dist/main/sourceControl/workflowSourceMaterializationService.js').createWorkflowSourceMaterializationService({projectContainerRoot:f.root,projectId:f.projectId}).materialize(f.workflow.id);
 }
 const core=require('../../dist/shared/projectState/projectStateService.js').createProjectStateService;
 const validator=core(f.store,{principalId:'independent-close-validator',principalType:'system',role:'Validator'}),tester=core(f.store,{principalId:'independent-close-tester',principalType:'system',role:'Tester'}),execution=core(f.store,{principalId:'close-implementation',principalType:'system',role:'WorkflowExecution'});
 async function recordTester(workItemId,implementation){
   let implementerRevisionId;
   if(sourceBacked){
     const binding=(await f.store.listEntities(f.projectId,'SourceBinding'))[0];
     fs.writeFileSync(path.join(f.root,materialized.checkout.projectRelativePath,'outcome.txt'),implementation.id+'\n');
     const checkpoint=await require('../../dist/main/sourceControl/semanticCheckpointService.js').createImplementationCheckpoint(f.root,f.projectId,{boundaryId:'greenfield-'+implementation.id,workflowId:f.workflow.id,targetEntityId:implementation.id,sourceLineId:binding.body.workSourceLineId,expectedRevisionId:binding.body.currentRevisionId,repositoryCheckoutId:binding.body.repositoryCheckoutId,attributablePaths:['outcome.txt']});
     assert.equal(checkpoint.state,'committed');implementerRevisionId=checkpoint.revision.revisionId;
   }
   await tester.createTesterResult(f.projectId,f.workflow.id,workItemId,implementation.id,{sourceMode:sourceBacked?'source-backed':'source-neutral',...(sourceBacked?{implementerRevisionId}:{}),recommendation:'no-permanent-test-required',affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Independent exact outcome observed'],unknowns:[],rationale:'Bounded fixture outcome checked independently'});
 }
 const direction={title:'Phase direction',objective:'Useful result',scopeIn:['Bounded outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]};
 const navigation=require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService();
 const workIds=[];
 for(const [index,key] of (sourceBacked?['phase_one']:['phase_one','phase_two']).entries()){
   assert.equal((await navigation.get(f.root,f.workflow.id)).currentWorkspace,'phase-interview');
   let model=await loop.get(f.root,f.workflow.id,key,'interview');model=await loop.save(f.root,f.workflow.id,key,'interview',{workflowId:f.workflow.id,phaseId:model.phase.id,stageKind:'interview',facts:[],direction,criteria:[],sources:model.sources});await loop.review(f.root,f.workflow.id,key,'interview',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
   let planning=await loop.get(f.root,f.workflow.id,key,'planning');const candidates=(index===0&&!sourceBacked?[1,2]:[1]).map(order=>({candidateId:'work_'+order,order,title:'Outcome '+order,purpose:'Bounded implementation',dependsOn:order===2?['work_1']:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[]}));
   planning=await loop.save(f.root,f.workflow.id,key,'planning',{workflowId:f.workflow.id,phaseId:planning.phase.id,stageKind:'planning',facts:[],direction,criteria:index===0&&!sourceBacked?[{statement:"Phase result remains usable",criticality:"required",verificationIntent:"Observe complete Phase",validationPolicy:"deferred_visual_phase"}]:[],candidates,sources:planning.sources});planning=await loop.review(f.root,f.workflow.id,key,'planning',planning.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
   assert.equal((await navigation.get(f.root,f.workflow.id)).currentWorkspace,'phase-work-card-selection');
   assert.deepEqual((await kernel.getExecutionProjection(f.root,f.workflow.id)).items.filter(item=>planning.review.workItems.some(work=>work.id===item.record.id)).map(item=>item.record.id).sort(),planning.review.workItems.map(work=>work.id).sort());
   for(const [workIndex,work] of planning.review.workItems.entries()){
     const record=await f.store.getEntity(f.projectId,work.id);await f.state.saveWorkItemPlanningContract(f.projectId,{workflowId:f.workflow.id,workItemId:work.id,expectedVersion:record.recordVersion,implementationBoundaries:['Only bounded outcome'],affectedPaths:sourceBacked?['outcome.txt']:[],proofIntent:['Independent exact evidence']});const contract=await f.state.getWorkItemPlanningReview(f.projectId,work.id);await f.state.recordWorkItemPlanningReview(f.projectId,f.workflow.id,work.id,{expectedRecordVersion:contract.workItem.body.contractRevision,outcome:'approved'});
     const current=await f.store.getEntity(f.projectId,work.id);const attempt=await kernel.beginWorkItemAttempt(f.root,f.workflow.id,work.id,current.recordVersion,'close-'+work.id);const implementation=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,work.id,attempt.executionRef,{outcome:'implemented',summary:'Useful bounded result',deviations:[],blockers:[],residualRisks:[]});
     await recordTester(work.id,implementation);
     const view=await close.get(f.root,f.workflow.id,'work-item',work.id);assert.equal(view.eligible,true,view.blockers.join(','));await assert.rejects(close.close(f.root,{workflowId:f.workflow.id,scope:'work-item',entityId:work.id,expectedVersion:view.expectedVersion-1,outcome:'Close',rationale:'Stale proof'}),/stale/);
     const closed=await close.close(f.root,{workflowId:f.workflow.id,scope:'work-item',entityId:work.id,expectedVersion:view.expectedVersion,outcome:'Close',rationale:'Current independent proof permits closure'});assert.equal(closed.closed,true);assert.equal(closed.next.workspaceId,index===0&&workIndex===0&&!sourceBacked?'phase-work-card-selection':'phase-validation');workIds.push(work.id);
   }
   if(index===0&&!sourceBacked){
     let boundary=await kernel.getPhaseValidationProjection(f.root,f.workflow.id,planning.phase.id);const criterion=boundary.criteria.find(entry=>entry.policy==="deferred_visual_phase").criterion;
     const failure=await kernel.recordPhaseVisualCriterion(f.root,{workflowId:f.workflow.id,phaseId:planning.phase.id,criterionId:criterion.id,expectedCriterionVersion:criterion.recordVersion,expectedPhaseVersion:boundary.phaseVersion,outcome:'fail',summary:'Operator observed an unusable Phase boundary'});
     assert.equal((await close.get(f.root,f.workflow.id,'phase',planning.phase.id)).eligible,false);
     const repaired=await kernel.createPhaseRepair(f.root,f.workflow.id,planning.phase.id,failure.validation.id),repairId=repaired.repair.id;
     assert.ok((await kernel.getExecutionProjection(f.root,f.workflow.id)).items.some(item=>item.record.id===repairId));
     const repair=await f.store.getEntity(f.projectId,repairId);await f.state.saveWorkItemPlanningContract(f.projectId,{workflowId:f.workflow.id,workItemId:repairId,expectedVersion:repair.recordVersion,implementationBoundaries:['Repair failed Phase usability'],affectedPaths:sourceBacked?['outcome.txt']:[],proofIntent:['Independent repair proof']});const contract=await f.state.getWorkItemPlanningReview(f.projectId,repairId);await f.state.recordWorkItemPlanningReview(f.projectId,f.workflow.id,repairId,{expectedRecordVersion:contract.workItem.body.contractRevision,outcome:'approved'});
     const current=await f.store.getEntity(f.projectId,repairId);const attempt=await kernel.beginWorkItemAttempt(f.root,f.workflow.id,repairId,current.recordVersion,'phase-repair');const implementation=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,repairId,attempt.executionRef,{outcome:'implemented',summary:'Repaired Phase usability',deviations:[],blockers:[],residualRisks:[]});await recordTester(repairId,implementation);
     const validation=await kernel.getWorkItemValidationProjection(f.root,f.workflow.id,repairId);for(const entry of validation.criteria.filter(entry=>entry.policy==='semantic_ai'))await validator.recordValidation(f.projectId,entry.criterion.id,{validationType:'work-item-criterion',method:'Independent repair review',validationMode:'semantic_ai',outcome:'pass',summary:'Repair objective holds',targetRecordVersion:entry.criterion.recordVersion,implementationRecordId:implementation.id});
     await kernel.completeWorkItem(f.root,f.workflow.id,repairId,(await f.store.getEntity(f.projectId,repairId)).recordVersion);
     boundary=await kernel.getPhaseValidationProjection(f.root,f.workflow.id,planning.phase.id);await kernel.recordPhaseVisualCriterion(f.root,{workflowId:f.workflow.id,phaseId:planning.phase.id,criterionId:criterion.id,expectedCriterionVersion:criterion.recordVersion,expectedPhaseVersion:boundary.phaseVersion,outcome:'pass',summary:'Operator observed usable current Phase including Repair'});
   }
   const phase=await close.get(f.root,f.workflow.id,'phase',key);assert.equal(phase.eligible,true,phase.blockers.join(','));await reviewedClose('phase',phase.entityId,phase.expectedVersion);const done=await close.get(f.root,f.workflow.id,'phase',phase.entityId);assert.equal(done.closed,true);assert.equal(done.next.workspaceId,index===0&&!sourceBacked?'phase-interview':'project-validation');
   assert.equal((await navigation.get(f.root,f.workflow.id)).currentWorkspace,index===0&&!sourceBacked?'phase-interview':'project-validation');
   assert.equal(require('../../dist/main/phaseClose/phaseCloseService.js').getPhaseCloseProjection(f.root,key).complete,true);assert.ok((await kernel.getExecutionProjection(f.root,f.workflow.id)).items.filter(item=>item.phaseId===planning.phase.id).every(item=>item.record.body.workState==='closed'));
 }
 let project=await close.get(f.root,f.workflow.id,'workflow',f.workflow.id);assert.equal(project.eligible,false);const criterion=project.criteria[0];assert.equal(criterion.policy,'operator_decision');
 await assert.rejects(close.projectCriterion(f.root,{workflowId:f.workflow.id,criterionId:criterion.id,expectedCriterionVersion:99,expectedWorkflowVersion:project.expectedVersion,outcome:'approved',rationale:'Wrong revision'}),/current/);
 project=await close.projectCriterion(f.root,{workflowId:f.workflow.id,criterionId:criterion.id,expectedCriterionVersion:criterion.recordVersion,expectedWorkflowVersion:project.expectedVersion,outcome:'approved',rationale:'Operator accepts the complete Project outcome'});assert.equal(project.eligible,!sourceBacked,project.blockers.join(','));
 if(sourceBacked){
   await assert.rejects(close.saveCloseout(f.root,{workflowId:f.workflow.id,scope:'project',targetEntityId:f.workflow.id,expectedTargetVersion:project.expectedVersion,closureDecision:'Close',rationale:'Premature'}),/integration-required/);
   await kernel.completeWorkflowExecution(f.root,f.workflow.id,project.expectedVersion);
   assert.equal((await f.store.getProject(f.projectId)).lifecycleState,'active');
   assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,'integration-ready');
   assert.equal((await navigation.get(f.root,f.workflow.id)).currentWorkspace,'project-validation');
   const integrated=await require('../../dist/main/sourceControl/workflowIntegrationService.js').createWorkflowIntegrationService(f.root,f.workflow.id).integrate();
   assert.equal(integrated.candidate.status,'integrated',JSON.stringify(integrated.candidate));assert.equal(integrated.integration.body.workflowId,f.workflow.id);
   assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).lifecycleState,'active');
   assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).body.currentWorkspace,'project-validation');
 }
 project=await close.get(f.root,f.workflow.id,'workflow',f.workflow.id);assert.equal(project.eligible,true,project.blockers.join(','));
 await reviewedClose('project',f.workflow.id,project.expectedVersion);
 assert.equal((await navigation.get(f.root,f.workflow.id)).currentWorkspace,'workflow-hub');
 assert.equal((await f.store.getProject(f.projectId)).lifecycleState,'active');assert.equal((await f.store.getEntity(f.projectId,f.workflow.id)).lifecycleState,'closed');assert.equal(require('../../dist/main/projectClose/projectCloseService.js').getProjectCloseProjection(f.root).complete,true);
 if(!sourceBacked)for(const type of ['SourceBinding','SourceCheckpoint','IntegrationRecord'])assert.equal((await f.store.listEntities(f.projectId,type)).length,0);
 assert.equal(fs.existsSync(path.join(f.root,'planning/project/Project_Closeouts')),false);assert.throws(()=>require('../../dist/main/projectClose/projectCloseService.js').createProjectCloseout(f.root,'Close','Bypass'),/SQL/);
 assert.deepEqual(await f.store.getProject(f.projectId),originalProject);
 assert.ok(!(await f.store.listStateChanges(f.projectId)).some(change=>change.entityId===f.projectId&&change.changedFields.includes('closedAt')));
 const registration=require('../../dist/main/projectState/currentProjectRegistrationService.js');
 assert.equal(registration.selectedCurrentProjectId(f.root),f.projectId);
 assert.equal((await f.store.getProviderGeneration(f.projectId)).authority,'structured');
 const fence=require('../../dist/main/documents/legacyCanonicalWriteFence.js');
 assert.throws(()=>fence.assertLegacyCanonicalReadAllowed(f.root),/fenced/);assert.throws(()=>fence.assertLegacyCanonicalWriteAllowed(f.root),/fenced/);
 const application=require('../../dist/main/workflow/workflowApplicationService.js').createWorkflowApplicationService();
 const inventory=await application.listCurrentProjectWorkflows(f.root);
 assert.ok(inventory.groups.flatMap(group=>group.workflows).some(item=>item.workflowId===f.workflow.id&&item.workflowState==='closed'));
 assert.equal((await application.getCurrentProjectWorkflow(f.root,f.workflow.id)).workflow.workflowState,'closed');
 assert.equal((await application.ensureProjectCreationWorkflow(f.root)).workflow.workflowId,f.workflow.id);
 await assert.rejects(f.state.createProjectCreationWorkflow(f.projectId,{title:'Duplicate'}),/non-repeatable/);
 const feature=await application.startDirectWorkflow(f.root,{workflowType:'feature-capability',title:'After Greenfield'});
 assert.equal((await f.store.getEntity(f.projectId,feature.workflow.workflowId)).projectId,f.projectId);
 const intake=await f.state.createWorkIntake(f.projectId,{request:'Optional routing',desiredOutcome:'Choose next work',constraints:[],evidenceContext:[],requestedIntegrationTarget:'dev'});
 assert.equal((await require('../../dist/main/workflow/structuredWorkRoutingService.js').createStructuredWorkRoutingService().get(f.root,intake.intake.id,intake.workflow.id)).projectId,f.projectId);
}


test('Greenfield full SQL navigation repeats exact Phase WorkItem and Repair boundaries without Markdown or mutation on read',async context=>{
 const nav=require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService();const observed=[];
 const f=await structuredPhaseLoopFixture(context,false,async(f,stage)=>{const value=await nav.get(f.root,f.workflow.id);assert.equal(value.currentWorkspace,stage);observed.push(stage);});
 const ingress=require('../../dist/main/workflow/workflowCandidateIngressService.js').createWorkflowCandidateIngressService(),loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService(),kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService(),close=require('../../dist/main/workflow/structuredCloseAdvanceService.js').createStructuredCloseAdvanceService();
 const core=require('../../dist/shared/projectState/projectStateService.js').createProjectStateService,tester=core(f.store,{principalId:'nav-tester',principalType:'agent',role:'Tester'}),validator=core(f.store,{principalId:'nav-validator',principalType:'agent',role:'Validator'});
 const direction={title:'Direction',objective:'Bounded outcome',scopeIn:['Outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]};
 async function at(stage,id){const before=(await f.store.listStateChanges(f.projectId)).length,value=await nav.get(f.root,f.workflow.id);assert.equal(value.currentWorkspace,stage,value.reason);if(id)assert.equal(value.currentWorkItemId,id);assert.equal((await f.store.listStateChanges(f.projectId)).length,before);assert.notEqual(value.currentWorkspace,'workflow-execution');return value;}
 async function contract(id){const receipt=await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'work-item-planning',scopeEntityId:id,candidateJson:JSON.stringify({implementationBoundaries:['Exact outcome'],affectedPaths:[],proofIntent:['Independent exact proof']})});return receipt;}
 async function approve(id){const record=await f.store.getEntity(f.projectId,id);await f.state.recordWorkItemPlanningReview(f.projectId,f.workflow.id,id,{expectedRecordVersion:record.recordVersion,outcome:'approved'});}
 async function finish(id){const attempt=await kernel.prepareImplementationAttempt(f.root,f.workflow.id,id);await at('work-card-building-review',id);await kernel.beginWorkItemAttempt(f.root,f.workflow.id,id,(await f.store.getEntity(f.projectId,id)).recordVersion,attempt.id);await at('work-card-building-review',id);const result=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,id,attempt.id,{summary:'Exact outcome',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'});await at('work-card-report-review',id);await tester.createTesterResult(f.projectId,f.workflow.id,id,result.id,{sourceMode:'source-neutral',recommendation:'reuse-existing-proof',affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Exact independent evidence'],unknowns:[],rationale:'Sufficient current proof'});const view=await kernel.getWorkItemValidationProjection(f.root,f.workflow.id,id);for(const entry of view.criteria.filter(entry=>entry.policy==='semantic_ai'))await validator.recordValidation(f.projectId,entry.criterion.id,{validationType:'work-item-criterion',method:'Independent exact review',validationMode:'semantic_ai',outcome:'pass',summary:'Satisfied',targetRecordVersion:entry.criterion.recordVersion,implementationRecordId:result.id});return result;}
 async function pass(id){const cycle=await f.state.prepareWorkItemValidationCycle(f.projectId,f.workflow.id,id);await f.state.reviewWorkItemValidationCycle(f.projectId,f.workflow.id,id,{cycleId:cycle.id,expectedRecordVersion:cycle.recordVersion,outcome:'ValidatePassed'});assert.equal((await f.store.getEntity(f.projectId,id)).body.workState,'closed');}
 for(const [phaseIndex,key] of ['phase_one','phase_two'].entries()){
  await at('phase-interview');let model=await loop.get(f.root,f.workflow.id,key,'interview');let receipt=await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'phase-interview',scopeEntityId:model.phase.id,candidateJson:JSON.stringify({facts:[],direction,criteria:[]})});await loop.review(f.root,f.workflow.id,key,'interview',receipt.reviewId,{expectedRecordVersion:receipt.recordVersion,outcome:'approved'});await at('phase-planning-bundle');
  model=await loop.get(f.root,f.workflow.id,key,'planning');receipt=await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'phase-planning',scopeEntityId:model.phase.id,candidateJson:JSON.stringify({facts:[],direction,criteria:[],candidates:[1,2].map(order=>({candidateId:key+'_work_'+order,order,title:'Work '+order,purpose:'Bounded outcome',dependsOn:order===1?[]:[key+'_work_1'],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[]}))})});await loop.review(f.root,f.workflow.id,key,'planning',receipt.reviewId,{expectedRecordVersion:receipt.recordVersion,outcome:'approved'});let current=await at('phase-work-card-selection');assert.equal(current.phaseStates.length,2);
  const works=(await loop.get(f.root,f.workflow.id,key,'planning')).review.workItems;
  for(const [workIndex,work] of works.entries()){
   await contract(work.id);await at('work-card-planning',work.id);await approve(work.id);await at('work-card-building-review',work.id);await finish(work.id);
   let cycle=await f.state.prepareWorkItemValidationCycle(f.projectId,f.workflow.id,work.id);await at('work-card-report-review',work.id);assert.equal((await nav.get(f.root,f.workflow.id)).executionContext.workCard.loopStep,'Review & Validation');
   await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'work-item-review-advisory',scopeEntityId:work.id,candidateJson:JSON.stringify({advisorySummary:'Exact advisory',advisoryBlockingFindings:[],advisoryRecommendation:'ValidatePassed'})});await at('work-card-report-review',work.id);
   if(phaseIndex===0&&workIndex===0)for(let repetition=0;repetition<2;repetition++){
    cycle=await f.state.prepareWorkItemValidationCycle(f.projectId,f.workflow.id,work.id);const decision=await f.state.reviewWorkItemValidationCycle(f.projectId,f.workflow.id,work.id,{cycleId:cycle.id,expectedRecordVersion:cycle.recordVersion,outcome:'RequestRepair',repairDefectText:'Exact observed defect '+repetition});const result=await kernel.createWorkflowRepair(f.root,f.workflow.id,work.id,decision.id),repairId=result.repair.id;
    current=await at('work-card-repair',repairId);assert.equal(current.currentRepairId,repairId);assert.equal(current.parentWorkItemId,work.id);await contract(repairId);await at('work-card-repair',repairId);await approve(repairId);await at('work-card-building-review',repairId);await finish(repairId);await pass(repairId);await at('work-card-building-review',work.id);assert.equal((await f.store.getEntity(f.projectId,work.id)).body.workState,'ready');await finish(work.id);
   }
   await pass(work.id);await at(workIndex===0?'phase-work-card-selection':'phase-validation');
  }
  const view=await close.get(f.root,f.workflow.id,'phase',model.phase.id);assert.equal(view.eligible,true,view.blockers.join(';'));let review=await close.saveCloseout(f.root,{workflowId:f.workflow.id,scope:'phase',targetEntityId:view.entityId,expectedTargetVersion:view.expectedVersion,closureDecision:'Close',rationale:'Exact current Phase completed'});await close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'});assert.equal((await close.get(f.root,f.workflow.id,'phase',view.entityId)).closed,true);await at(phaseIndex===0?'phase-interview':'project-validation');
 }
 let project=await close.get(f.root,f.workflow.id,'workflow',f.workflow.id);for(const criterion of project.criteria.filter(entry=>!entry.satisfied))project=await close.projectCriterion(f.root,{workflowId:f.workflow.id,criterionId:criterion.id,expectedCriterionVersion:criterion.recordVersion,expectedWorkflowVersion:project.expectedVersion,outcome:'approved',rationale:'Complete exact Project'});assert.equal(project.eligible,true,project.blockers.join(';'));const review=await close.saveCloseout(f.root,{workflowId:f.workflow.id,scope:'project',targetEntityId:f.workflow.id,expectedTargetVersion:project.expectedVersion,closureDecision:'Close',rationale:'Exact Project accepted'});await close.reviewCloseout(f.root,f.workflow.id,review.cycleId,{expectedRecordVersion:review.recordVersion,outcome:'approved'});assert.equal((await close.get(f.root,f.workflow.id,'workflow',f.workflow.id)).closed,true);const terminalNav=await at('workflow-hub');assert.equal(terminalNav.phaseStates.length,2);assert.equal(terminalNav.workItemStates.length,6);assert.ok(terminalNav.workItemStates.every(item=>item.state==='closed'&&!item.planningEligible));assert.deepEqual(observed,['project-intake-capture','architect-interview','project-planning-review','project-phase-map','phase-interview']);assert.equal(fs.existsSync(path.join(f.root,'planning')),false);
});
