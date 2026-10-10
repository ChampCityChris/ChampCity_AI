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
  // A source binding can be unreadable to aggregate validation while the approved plan
  // and execution remain readable. This is the live map-load regression boundary.
  const source = require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(f.store,{principalId:'source-state',principalType:'system',role:'System'});
  const baseline = await source.createWorkflowSourceBaseline(f.projectId,f.workflow.id,{repositoryId:'map-source',integrationTargetSourceLineId:'dev',baseRevisionId:'R0'});
  const binding = await source.createWorkflowSourceBinding(f.projectId,f.workflow.id,baseline.id);
  await source.updateSourceBinding(f.projectId,binding.id,{preparationState:'preparing'},1);
  await assert.rejects(kernel.getPhaseValidationProjection(f.root,f.workflow.id,initial.phase.id),/Phase aggregate evidence source candidate is not current/);
  const readablePlanning = await loop.get(f.root,f.workflow.id,initial.phase.id,'planning');
  assert.equal(readablePlanning.review.disposition.state,'approved');
  const {workCardMapFromSql} = require('../renderer/renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/WorkCardMapWorkspace.tsx');
  const view = workCardMapFromSql(readablePlanning,await kernel.getExecutionProjection(f.root,f.workflow.id));
  assert.deepEqual(view.candidates.map(item=>item.candidateId).sort(),[...ids].sort());
  assert.equal(view.state,'ready');
  const {WorkCardMapShell} = require('../renderer/renderer-source-loader.cjs').loadRendererSourceModule('src/renderer/app/WorkCardMapShell.tsx');
  const markup = require('react-dom/server').renderToStaticMarkup(require('react').createElement(WorkCardMapShell,{projection:view,actionError:'',actionFeedback:'',isBeginningPlanning:false,onCopy(){},onBeginPlanning(){},onOpenPhaseValidation(){}}));
  assert.match(markup,/First work/); assert.match(markup,/Second work/); assert.doesNotMatch(markup,/No Work Card candidates found/);
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
   const reviewService=require('../../dist/main/workCardValidation/structuredWorkItemReviewService.js').createStructuredWorkItemReviewService();
   const beforeReview=await reviewService.get(f.root,f.workflow.id,work.id),report=await kernel.getImplementationAttempt(f.root,f.workflow.id,work.id);
   assert.ok(beforeReview.handoff.includes(report.markdown),'exact SQL report projection');assert.match(beforeReview.handoff,/workflow_toolbox.submit_stage_candidate/);assert.match(beforeReview.handoff,/press Refresh/);assert.doesNotMatch(beforeReview.handoff,/"entityType": "WorkItem"|"implementations":|"projectId":/);assert.ok(beforeReview.handoff.length<60000);
   assert.match(beforeReview.markdown,/## Criterion proof summary/);assert.match(beforeReview.markdown,/## Tester recommendation and evidence/);assert.doesNotMatch(beforeReview.markdown,/"workflowId":/);assert.equal(beforeReview.advisoryMarkdown,undefined);
   const decisionsBefore=await f.store.listEntities(f.projectId,'Decision');
   const advisory={advisorySummary:'Exact advisory',advisoryBlockingFindings:['Observed finding'],advisoryRecommendation:'Inconclusive',advisoryRepairDefectText:'Suggested exact defect'};
   const submitted=await ingress.submit(f.root,{workflowId:f.workflow.id,stage:'work-item-review-advisory',scopeEntityId:work.id,candidateJson:JSON.stringify(advisory)});
   const afterReview=await reviewService.get(f.root,f.workflow.id,work.id);assert.equal(afterReview.cycle.cycle.id,cycle.id);assert.equal(submitted.reviewId,cycle.id);assert.equal(afterReview.cycle.cycle.recordVersion,cycle.recordVersion+1);
   for(const [key,value] of Object.entries(advisory))assert.deepEqual(afterReview.cycle.cycle.body[key],value);
   assert.deepEqual(await f.store.listEntities(f.projectId,'Decision'),decisionsBefore);for(const text of ['## Summary','Exact advisory','## Recommendation','Inconclusive','## Blocking findings','Observed finding','## Suggested repair defect','Suggested exact defect','## Review basis',report.attempt.id,report.attempt.body.implementationRecordId])assert.ok(afterReview.advisoryMarkdown.includes(text),text);await at('work-card-report-review',work.id);
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


test('Greenfield stranded parent checkpoint recovers before a stale prepared Repair starts', async suite => {
 for (const interruption of ['pre-materialization','dirty-blocked','git-committed','sql-committed','sql-committed-old-binding']) await suite.test(interruption, async context => {
 const f=await structuredPhaseLoopFixture(context,true);
 const {execFileSync}=require('node:child_process');
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 const kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
 const loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
 const revision=git(path.join(f.root,'Dev'),'rev-parse','HEAD');
 const baseline=await f.state.createWorkflowSourceBaseline(f.projectId,f.workflow.id,{repositoryId:'selected-project-source',integrationTargetSourceLineId:'dev',baseRevisionId:revision});
 const originalBinding=await f.state.createWorkflowSourceBinding(f.projectId,f.workflow.id,baseline.id);
 const materializer=require('../../dist/main/sourceControl/workflowSourceMaterializationService.js').createWorkflowSourceMaterializationService({projectContainerRoot:f.root,projectId:f.projectId});
 let materialized=interruption==='pre-materialization'?null:await materializer.materialize(f.workflow.id);
 const direction={title:'Exact source',objective:'Recover stranded implementation',scopeIn:['Evidence'],scopeOut:[],constraints:[],assumptions:[],risks:[]};
 let model=await loop.get(f.root,f.workflow.id,'phase_one','interview');
 model=await loop.save(f.root,f.workflow.id,'phase_one','interview',{workflowId:f.workflow.id,phaseId:model.phase.id,stageKind:'interview',facts:[],direction,criteria:[],sources:model.sources});
 await loop.review(f.root,f.workflow.id,'phase_one','interview',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
 model=await loop.get(f.root,f.workflow.id,'phase_one','planning');
 model=await loop.save(f.root,f.workflow.id,'phase_one','planning',{workflowId:f.workflow.id,phaseId:model.phase.id,stageKind:'planning',facts:[],direction,criteria:[],candidates:[{candidateId:'stranded',order:1,title:'Stranded parent',purpose:'Approved source evidence',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[]}],sources:model.sources});
 await loop.review(f.root,f.workflow.id,'phase_one','planning',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
 const parent=await f.store.getEntity(f.projectId,model.review.workItems[0].id),relative='conformance/phase-1/work-card-01.txt';
 await kernel.acceptWorkItemExecutionPlan(f.root,{workflowId:f.workflow.id,workItemId:parent.id,expectedVersion:parent.recordVersion,plan:{implementationBoundaries:['Exact approved file'],affectedPaths:[relative],proofIntent:['Check source evidence']}});
 const attempt=await kernel.prepareImplementationAttempt(f.root,f.workflow.id,parent.id);
 const reservedBinding=attempt.body.layout.sources.find(source=>source.entityId===originalBinding.id);
 assert.ok(reservedBinding);
 const savedBinding=await f.store.getEntityVersion(f.projectId,originalBinding.id,reservedBinding.recordVersion);
 assert.equal(savedBinding.body.preparationState,interruption==='pre-materialization'?'unprepared':'ready');
 if(!materialized)materialized=await materializer.materialize(f.workflow.id);
 const checkout=path.join(f.root,materialized.checkout.projectRelativePath);
 const executionContract=await kernel.createWorkItemExecutionContract(f.root,f.workflow.id,parent.id,{sourceMutation:'required',affectedPaths:[relative],proofIntent:['Check source evidence']});
 assert.notEqual(executionContract.digest,attempt.body.contractDigest);
 await kernel.beginWorkItemAttempt(f.root,f.workflow.id,parent.id,attempt.body.workItemVersion,attempt.id);
 const chronology=await f.store.listOutbox(f.projectId);
 const readyEvent=chronology.find(event=>event.entityId===originalBinding.id&&event.payload.operation==='revise'&&event.payload.toRecordVersion===materialized.binding.recordVersion);
 const runningEvent=chronology.find(event=>event.entityId===attempt.id&&event.payload.operation==='revise'&&event.payload.toRecordVersion===2);
 assert.ok(readyEvent.sequence<runningEvent.sequence);
 assert.equal((await f.store.getEntityVersion(f.projectId,attempt.id,2)).body.attemptState,'running');
 const result={summary:'Implemented parent',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'};
 const implementation=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,parent.id,attempt.id,result);
 const packetPath=path.join(f.root,'.champcity','runtime','work-item-attempts',attempt.id+'.json');
 fs.mkdirSync(path.dirname(packetPath),{recursive:true});
 fs.writeFileSync(packetPath,JSON.stringify({schemaVersion:1,projectId:f.projectId,workflowId:f.workflow.id,workItemId:parent.id,executionRef:attempt.id,contractDigest:executionContract.digest,result}));
 const packet=JSON.parse(fs.readFileSync(packetPath,'utf8'));
 for(const key of ['summary','deviations','blockers','residualRisks','outcome'])assert.deepEqual(packet.result[key],implementation.body[key]);
 const packetBytes=fs.readFileSync(packetPath),parentAttempt=await f.store.getEntity(f.projectId,attempt.id);
 fs.mkdirSync(path.dirname(path.join(checkout,relative)),{recursive:true});fs.writeFileSync(path.join(checkout,relative),'Stranded parent evidence');
 const cycle=await f.state.prepareWorkItemValidationCycle(f.projectId,f.workflow.id,parent.id);
 const decision=await f.state.reviewWorkItemValidationCycle(f.projectId,f.workflow.id,parent.id,{cycleId:cycle.id,expectedRecordVersion:cycle.recordVersion,outcome:'RequestRepair',repairDefectText:'Extend parent evidence'});
 const {repair}=await kernel.createWorkflowRepair(f.root,f.workflow.id,parent.id,decision.id);
 await kernel.acceptWorkItemExecutionPlan(f.root,{workflowId:f.workflow.id,workItemId:repair.id,expectedVersion:repair.recordVersion,plan:{implementationBoundaries:['Exact repair evidence'],affectedPaths:['repair.txt'],proofIntent:['Check repair file']}});
 const stale=await kernel.prepareImplementationAttempt(f.root,f.workflow.id,repair.id);assert.equal(stale.body.sourceRevisionId,revision);
 const retry=require('../../dist/main/sourceControl/structuredWorkflowCheckpointService.js').retryStructuredImplementationCheckpoint;
 // On a failing baseline, reach the production Start path so neither provenance predicate is hidden by a later guard assertion.
 const initialRecovery=await kernel.getCheckpointRecoveryProjection(f.root,f.workflow.id,parent.id);
 if(!initialRecovery.implementation.retryable){
  const {runtimeFixture,selection}=require('../support/codex-runtime.cjs'),runtime=runtimeFixture();await runtime.ready;
  const {CodexImplementerExecutionService}=require('../../dist/main/workCardBuilding/codexImplementerExecutionService.js');
  const probe=new CodexImplementerExecutionService(async()=>{throw Error('Unsafe provenance must not reach Codex');},undefined,undefined,undefined,runtime.manager);
  probe.configureSourceCheckoutProjection(async()=>({workspaceId:'stranded-greenfield',projection:{registerRepositoryCheckout:async(_id,value)=>({...value,availability:'available',validationError:null})}}));
  const start=await probe.start(f.root,{ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:repair.id},selection);
  assert.equal(start.state,'running',start.failureReason);
 }
 // Legacy failures retain every byte and create no checkpoint.
 fs.writeFileSync(path.join(checkout,'outside.txt'),'Unapproved');
 await assert.rejects(retry(f.root,f.projectId,f.workflow.id,parent.id,implementation.id),/outside.*scope/i);
 const rejected=await kernel.getCheckpointRecoveryProjection(f.root,f.workflow.id,parent.id);assert.equal(rejected.implementation.retryable,false);assert.match(rejected.implementation.reason,/inspection required/i);
 assert.equal(fs.readFileSync(path.join(checkout,relative),'utf8'),'Stranded parent evidence');fs.unlinkSync(path.join(checkout,'outside.txt'));
 git(checkout,'checkout','-b','inspection-fixture');
 await assert.rejects(retry(f.root,f.projectId,f.workflow.id,parent.id,implementation.id),/branch or HEAD changed/i);
 git(checkout,'checkout',materialized.binding.body.workSourceLineId);
 const {acquireWorkflowExecutionLease,workflowExecutionLeaseKey}=require('../../dist/main/workCardBuilding/workflowExecutionLease.js');
 const competing=acquireWorkflowExecutionLease(workflowExecutionLeaseKey('source-backed',checkout),'fixture-tester');
 await assert.rejects(retry(f.root,f.projectId,f.workflow.id,parent.id,implementation.id),/another execution/i);competing.release();
 assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
 const recoverable=await kernel.getCheckpointRecoveryProjection(f.root,f.workflow.id,parent.id);assert.equal(recoverable.implementation.retryable,true);
 // Inject only synthetic interrupted-finalization states; no real project is touched.
 if(interruption==='git-committed'){
  const sourceModule=require('../../dist/main/sourceControl/sourceControlService.js'),original=sourceModule.createSourceControlService;
  sourceModule.createSourceControlService=(...args)=>{const source=original(...args),commit=source.checkpointCommit;return {...source,async checkpointCommit(...values){const committed=await commit(...values);assert.equal(committed.ok,true);throw Error('Synthetic interruption after Git commit');}};};
  try {const interrupted=await retry(f.root,f.projectId,f.workflow.id,parent.id,implementation.id);assert.equal(interrupted.checkpoint.state,'inspection-required');}
  finally {sourceModule.createSourceControlService=original;}
  assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint'))[0].body.checkpointState,'inspection-required');
 }else if(interruption.startsWith('sql-committed')){
  const committed=await retry(f.root,f.projectId,f.workflow.id,parent.id,implementation.id);assert.equal(committed.checkpoint.state,'committed');
  const current=await f.store.getEntity(f.projectId,materialized.binding.id);
  await f.state.updateSourceBinding(f.projectId,current.id,{preparationState:'blocked',failureCode:'REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED',...(interruption==='sql-committed-old-binding'?{currentRevisionId:revision}:{})},current.recordVersion);
 }
 // Reproduce the durable failure that stranded the real parent before Repair Start.
 if(!interruption.startsWith('sql-committed')) await assert.rejects(materializer.materialize(f.workflow.id),error=>error.materializationCode==='REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED');
 const blockedBinding=await f.store.getEntity(f.projectId,materialized.binding.id);
 const beforeStart=(await f.store.listStateChanges(f.projectId)).length;await kernel.getExecutionProjection(f.root,f.workflow.id);await kernel.getCheckpointRecoveryProjection(f.root,f.workflow.id,parent.id);assert.equal((await f.store.listStateChanges(f.projectId)).length,beforeStart);
 assert.equal(blockedBinding.body.preparationState,'blocked');assert.equal(blockedBinding.body.failureCode,'REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED');
 const {runtimeFixture,selection}=require('../support/codex-runtime.cjs'),runtime=runtimeFixture();await runtime.ready;
 let calls=0,release;const finish=new Promise(resolve=>release=resolve);
 const {CodexImplementerExecutionService}=require('../../dist/main/workCardBuilding/codexImplementerExecutionService.js');
 const service=new CodexImplementerExecutionService(async()=>({startThread(options){calls++;assert.equal(git(checkout,'status','--porcelain','--untracked-files=all'),'');assert.notEqual(git(checkout,'rev-parse','HEAD'),revision);return {id:'repair-after-recovery',async runStreamed(){await finish;fs.writeFileSync(path.join(options.workingDirectory,'repair.txt'),'Approved repair');return {events:(async function*(){yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify({...result,summary:'Implemented repair without file telemetry'})}};yield {type:'turn.completed'};})()};}};}}),undefined,undefined,undefined,runtime.manager);
 service.configureSourceCheckoutProjection(async()=>({workspaceId:'stranded-greenfield',projection:{registerRepositoryCheckout:async(_id,value)=>({...value,availability:'available',validationError:null})}}));
 const selector={ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:repair.id};
 const beforePoll=await f.store.listStateChanges(f.projectId);await service.getStatus(f.root,selector);assert.deepEqual(await f.store.listStateChanges(f.projectId),beforePoll);
 const running=await service.start(f.root,selector,selection);assert.equal(running.state,'running',running.failureReason);assert.equal(calls,1);
 assert.equal((await service.start(f.root,selector,selection)).state,'running');assert.equal(calls,1);
 const recoveredCheckpoints=await f.store.listEntities(f.projectId,'SourceCheckpoint');assert.equal(recoveredCheckpoints.length,1);assert.equal(recoveredCheckpoints[0].body.checkpointState,'committed');
 assert.equal(recoveredCheckpoints[0].body.expectedRevisionId,revision);assert.equal(git(checkout,'rev-list','--count',revision+'..HEAD'),'1');
 assert.ok((await f.store.listRelationships(f.projectId,'checkpoints')).some(e=>e.fromEntityId===recoveredCheckpoints[0].id&&e.toEntityId===implementation.id));
 const binding=await f.store.getEntity(f.projectId,materialized.binding.id);assert.equal(binding.body.currentRevisionId,recoveredCheckpoints[0].body.resultingRevisionId);assert.equal(git(checkout,'status','--porcelain','--untracked-files=all'),'');
 assert.equal(binding.body.preparationState,'ready');assert.equal(binding.body.failureCode,undefined);
 assert.deepEqual(await f.store.getEntity(f.projectId,implementation.id),implementation);assert.deepEqual(fs.readFileSync(packetPath),packetBytes);
 const parentAttempts=(await f.store.listEntities(f.projectId,'ImplementationAttempt')).filter(a=>a.body.workItemId===parent.id);assert.equal(parentAttempts.length,1);assert.deepEqual(parentAttempts[0],parentAttempt);assert.equal(parentAttempts[0].body.attemptState,'completed');
 assert.equal((await f.store.getEntity(f.projectId,stale.id)).body.attemptState,'abandoned');
 const repairAttempts=(await f.store.listEntities(f.projectId,'ImplementationAttempt')).filter(a=>a.body.workItemId===repair.id&&['prepared','running'].includes(a.body.attemptState));assert.equal(repairAttempts.length,1);assert.equal(repairAttempts[0].body.sourceRevisionId,binding.body.currentRevisionId);
 release();let completed;for(let i=0;i<400;i++){completed=await service.getStatus(f.root,selector);if(completed.state!=='running')break;await new Promise(resolve=>setTimeout(resolve,20));}
 assert.equal(completed.state,'completed',completed.failureReason);assert.equal(completed.checkpoint.status,'committed');assert.equal(git(checkout,'status','--porcelain','--untracked-files=all'),'');
 const records=await f.store.listEntities(f.projectId,'ImplementationRecord');assert.equal(records.length,2);assert.equal(records.filter(r=>r.body.workItemId===parent.id).length,1);
 assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,2);
 const repaired=records.find(r=>r.body.workItemId===repair.id);const repairPacket=JSON.parse(fs.readFileSync(path.join(path.dirname(packetPath),repaired.body.executionRef+'.json'),'utf8'));assert.deepEqual(repairPacket.sourceCheckpointAttempt.attributablePaths,['repair.txt']);
 });
});

for (const failedRevision of [false,true]) test('Greenfield fresh source-backed Implement and Repair start from read-only readiness and preserve no-mutation Review'+(failedRevision?' through failed Implement governed revision':''), async context => {
 const f=await structuredPhaseLoopFixture(context,true);
 const loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
 const kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
 const nav=require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService();
 const revision=require('node:child_process').execFileSync('git',['rev-parse','dev'],{cwd:path.join(f.root,'Dev'),encoding:'utf8'}).trim();
 const baseline=await f.state.createWorkflowSourceBaseline(f.projectId,f.workflow.id,{repositoryId:'selected-project-source',integrationTargetSourceLineId:'dev',baseRevisionId:revision});
 // Match source-seeded Workflow creation: reserve binding identity, but leave the checkout unprepared.
 await f.state.createWorkflowSourceBinding(f.projectId,f.workflow.id,baseline.id);
 const {CodexImplementerExecutionService}=require('../../dist/main/workCardBuilding/codexImplementerExecutionService.js');
 const {runtimeFixture,selection}=require('../support/codex-runtime.cjs');const runtime=runtimeFixture();await runtime.ready;
 let preparations=0,failRepair=failedRevision,releaseFailure;const executions=[];
 const service=new CodexImplementerExecutionService(async()=>({startThread(options){return {id:'greenfield-start',async runStreamed(prompt){
  executions.push({options,prompt});if(!failRepair&&prompt.includes('"repair.txt"'))fs.writeFileSync(path.join(options.workingDirectory,'repair.txt'),'Approved repair');
  return {events:(async function*(){if(failRepair&&prompt.includes('Exact repair evidence'))await new Promise(resolve=>releaseFailure=resolve);if(prompt.includes('"repair.txt"'))yield {type:'item.completed',item:{type:'file_change',changes:[{path:'repair.txt'}],status:'completed'}};yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify({summary:'Exact source assessment',deviations:[],blockers:[],residualRisks:[],outcome:failRepair&&prompt.includes('Exact repair evidence')?'partial':'implemented'})}};yield {type:'turn.completed'};})()};
 }};}}),undefined,undefined,undefined,runtime.manager);
 service.configureSourceCheckoutProjection(async()=>{preparations++;return {workspaceId:'greenfield-readiness',projection:{registerRepositoryCheckout:async(_id,checkout)=>({...checkout,availability:'available',validationError:null})}};});
 async function clickImplement(id,expectedPreparations,rerun=false){
  const selector={ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:id};
  if(!rerun)assert.equal(await kernel.getImplementationAttempt(f.root,f.workflow.id,id),null);
  const before=await f.store.listStateChanges(f.projectId),execution=await service.getStatus(f.root,selector);
  assert.equal(execution.state,rerun?'failed':'ready',execution.failureReason);assert.equal(execution.canRunAgain,true);assert.equal(execution.sourceMode,'source-backed');
  assert.equal(execution.workflowId,f.workflow.id);assert.equal(execution.workItemId,id);if(!rerun)assert.equal(execution.workItemVersion,(await f.store.getEntity(f.projectId,id)).recordVersion);
  if(!rerun){assert.equal(execution.executionContractDigest,null);assert.equal(execution.failureReason,null);}assert.equal(execution.retryBlocker,null);
  assert.deepEqual(await f.store.listStateChanges(f.projectId),before);assert.equal(preparations,expectedPreparations);
  if(!rerun)assert.equal(await kernel.getImplementationAttempt(f.root,f.workflow.id,id),null);
  const React=require('react'),{loadRendererSourceModule:load}=require('../renderer/renderer-source-loader.cjs');
  const {WorkCardImplementWorkspace}=load('src/renderer/app/WorkCardImplementWorkspace.tsx'),{CodexExecutionActions}=load('src/renderer/app/WorkCardImplementShell.tsx');
  const planning=await require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService().get(f.root,f.workflow.id,id);
  const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},old=global.window;
  const values=[planning,null,execution,false,'',{...runtime.manager.getStatus(),selection},null,false,''];let index=0,started;
  React.useState=initial=>{const slot=index++;return [slot in values?values[slot]:initial,value=>values[slot]=value];};React.useEffect=()=>{};React.useRef=initial=>({current:initial});
  global.window={champcity:{startWorkflowWorkItemCodexExecution:(workflowId,workItemId,model)=>started=service.start(f.root,{ownerKind:'workflow-work-item',workflowId,workItemId},model),getStructuredWorkItemPlanning:async()=>planning,getImplementationAttempt:()=>kernel.getImplementationAttempt(f.root,f.workflow.id,id),getWorkflowWorkItemCodexExecutionStatus:()=>service.getStatus(f.root,selector),getWorkflowExecutionProjection:()=>kernel.getExecutionProjection(f.root,f.workflow.id),getGreenfieldNavigation:()=>nav.get(f.root,f.workflow.id)}};
  try {
   const props=WorkCardImplementWorkspace({workflowId:f.workflow.id,workItemId:id,onNext(){}}).props;
   assert.equal(props.context.canExecute,true);assert.equal(props.modelSelection.canRun,true);
   const tree=CodexExecutionActions({execution:props.codexExecution,modelSelection:props.modelSelection,isActionRunning:false,onRun:props.onRunCodex,onCancel(){}});
   const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
   const button=nodes(tree).find(n=>n.type==='button'&&n.props.className==='apply-button codex-command');assert.equal(button.props.disabled,false);button.props.onClick();
   const running=await started;assert.equal(running.state,'running',running.failureReason);await new Promise(setImmediate);
  } finally {Object.assign(React,original);global.window=old;}
  if(failRepair&&executions.at(-1)?.prompt.includes('Exact repair evidence')){
   const current=await f.store.getEntity(f.projectId,id);
   await assert.rejects(require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService().review(f.root,f.workflow.id,id,{expectedRecordVersion:current.recordVersion,outcome:'revision_requested',notes:'Cannot revise a running attempt'}),/live implementation attempt/);
   await assert.rejects(kernel.acceptWorkItemExecutionPlan(f.root,{workflowId:f.workflow.id,workItemId:id,expectedVersion:current.recordVersion,plan:{implementationBoundaries:['Do not revise live execution'],affectedPaths:[],proofIntent:['Inspect']} }),/planned\/ready|live implementation/);
   releaseFailure();
  }
  let completed;for(let i=0;i<300;i++){completed=await service.getStatus(f.root,selector);if(completed.state!=='running')break;await new Promise(resolve=>setTimeout(resolve,20));}
  assert.equal(completed.state,failRepair&&executions.at(-1).prompt.includes('Exact repair evidence')?'failed':'completed',completed.failureReason);assert.equal(preparations,expectedPreparations+1);
  const attempts=(await f.store.listEntities(f.projectId,'ImplementationAttempt')).filter(a=>a.body.workItemId===id);assert.equal(attempts.length,rerun?2:1);
  const attempt=(await kernel.getImplementationAttempt(f.root,f.workflow.id,id)).attempt,implementation=await f.store.getEntity(f.projectId,attempt.body.implementationRecordId);
  assert.equal(implementation.body.executionRef,attempt.id);assert.equal(implementation.body.workItemId,id);assert.ok(executions.at(-1).prompt.includes(id));
  return {attempt,implementation,completed};
 }
 const direction={title:'Assess current source',objective:'Complete without edits',scopeIn:['Read source context'],scopeOut:['Source edits'],constraints:[],assumptions:[],risks:[]};
 let model=await loop.get(f.root,f.workflow.id,'phase_one','interview');model=await loop.save(f.root,f.workflow.id,'phase_one','interview',{workflowId:f.workflow.id,phaseId:model.phase.id,stageKind:'interview',facts:[],direction,criteria:[],sources:model.sources});await loop.review(f.root,f.workflow.id,'phase_one','interview',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
 model=await loop.get(f.root,f.workflow.id,'phase_one','planning');model=await loop.save(f.root,f.workflow.id,'phase_one','planning',{workflowId:f.workflow.id,phaseId:model.phase.id,stageKind:'planning',facts:[],direction,criteria:[],candidates:[{candidateId:'read_work',order:1,title:'Read source',purpose:'Assess context',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[]}],sources:model.sources});model=await loop.review(f.root,f.workflow.id,'phase_one','planning',model.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
 const item=model.review.workItems[0];await kernel.acceptWorkItemExecutionPlan(f.root,{workflowId:f.workflow.id,workItemId:item.id,expectedVersion:item.recordVersion,plan:{implementationBoundaries:['Read exact source'],affectedPaths:[],proofIntent:['Review context assessment']}});
 assert.equal((await kernel.getExecutionProjection(f.root,f.workflow.id)).source.state,'unprepared');
 const {attempt,implementation,completed}=await clickImplement(item.id,0);assert.equal(completed.checkpoint.status,'not-required');assert.equal(executions[0].options.readOnly,true);assert.deepEqual(executions[0].options.writableRoots,[]);
 const reopened=await new CodexImplementerExecutionService().getStatus(f.root,{ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:item.id});assert.equal(reopened.state,'completed');assert.equal(reopened.checkpoint.status,'not-required');
 const before=(await f.store.listStateChanges(f.projectId)).length;
 assert.equal((await require('../../dist/main/workflow/greenfieldNavigationService.js').createGreenfieldNavigationService().get(f.root,f.workflow.id)).currentWorkspace,'work-card-report-review');
 assert.equal((await kernel.getCheckpointRecoveryProjection(f.root,f.workflow.id,item.id)).implementation.state,'not-required');assert.equal((await f.store.listStateChanges(f.projectId)).length,before);
 const tester=require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(f.store,{principalId:'independent-read-tester',principalType:'agent',role:'Tester'});
 const result=await tester.createTesterResult(f.projectId,f.workflow.id,item.id,implementation.id,{sourceMode:'source-backed',implementerRevisionId:revision,recommendation:'no-permanent-test-required',affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Independent unchanged-source assessment'],unknowns:[],rationale:'No permanent proof edits required'});
 assert.equal(result.body.checkpointState,'not-required');assert.equal(result.body.candidateRevisionId,revision);assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
 assert.equal((await f.state.getImplementationAttempt(f.projectId,f.workflow.id,item.id)).id,attempt.id);assert.deepEqual(await f.store.getEntity(f.projectId,implementation.id),implementation);
 assert.equal((await nav.get(f.root,f.workflow.id)).currentWorkspace,'work-card-report-review');
 const view=await kernel.getPhaseValidationProjection(f.root,f.workflow.id,model.phase.id);assert.equal(view.sourceRevisionId,revision);assert.equal(view.workItemsClosed,false);assert.ok(!view.completion.blockers.some(value=>value.includes("tester")));
 const cycle=await f.state.prepareWorkItemValidationCycle(f.projectId,f.workflow.id,item.id);
 const decision=await f.state.reviewWorkItemValidationCycle(f.projectId,f.workflow.id,item.id,{cycleId:cycle.id,expectedRecordVersion:cycle.recordVersion,outcome:'RequestRepair',repairDefectText:'Add approved repair evidence'});
 const {repair}=await kernel.createWorkflowRepair(f.root,f.workflow.id,item.id,decision.id);
 assert.equal((await nav.get(f.root,f.workflow.id)).currentWorkspace,'work-card-repair');
 await require('../../dist/main/workflow/workflowCandidateIngressService.js').createWorkflowCandidateIngressService().submit(f.root,{workflowId:f.workflow.id,stage:'work-item-planning',scopeEntityId:repair.id,candidateJson:JSON.stringify({implementationBoundaries:['Exact repair evidence; preserve file if already correct'],affectedPaths:failedRevision?['package.json']:['repair.txt'],proofIntent:['Inspect correct file; downstream champcity-source-integrity belongs to application integration']})});
 assert.equal((await service.getStatus(f.root,{ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:repair.id})).state,'unavailable','Unapproved Repair planning blocks Start');
 await f.state.recordWorkItemPlanningReview(f.projectId,f.workflow.id,repair.id,{expectedRecordVersion:(await f.store.getEntity(f.projectId,repair.id)).recordVersion,outcome:'approved'});
 const current=await nav.get(f.root,f.workflow.id);assert.equal(current.currentWorkspace,'work-card-building-review');assert.equal(current.currentWorkItemId,repair.id);
 if(failedRevision){
  const failed=await clickImplement(repair.id,1);assert.equal(failed.implementation.body.outcome,'partial');assert.equal((await f.store.getEntity(f.projectId,repair.id)).body.workState,'ready');
  assert.equal((await nav.get(f.root,f.workflow.id)).currentWorkspace,'work-card-building-review');assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
  const packetPath=path.join(f.root,'.champcity','runtime','work-item-attempts',failed.attempt.id+'.json'),packetBytes=fs.readFileSync(packetPath),attemptBytes=JSON.stringify(await f.store.getEntity(f.projectId,failed.attempt.id)),resultBytes=JSON.stringify(failed.implementation);
  const planning=require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService();
  const git=(...args)=>require('node:child_process').execFileSync('git',args,{cwd:executions.at(-1).options.workingDirectory,encoding:'utf8'}).trim();
  const cleanHead=git('rev-parse','HEAD');assert.equal(cleanHead,revision);assert.equal(git('status','--porcelain'),'');
  let exact=await planning.get(f.root,f.workflow.id,repair.id);assert.equal(exact.revisionEligibility.eligible,true);
  const input={expectedRecordVersion:exact.workItem.recordVersion,outcome:'revision_requested',notes:'File already conforms; preserve it with an approved no-mutation contract'};
  const before=(await f.store.listStateChanges(f.projectId)).length;await nav.get(f.root,f.workflow.id);await planning.get(f.root,f.workflow.id,repair.id);assert.equal((await f.store.listStateChanges(f.projectId)).length,before);
  await assert.rejects(planning.review(f.root,f.workflow.id,repair.id,{...input,expectedRecordVersion:input.expectedRecordVersion-1}),/stale/);
  const outside=path.join(executions.at(-1).options.workingDirectory,'unapproved.txt');fs.writeFileSync(outside,'Synthetic dirty checkout');
  assert.equal((await planning.get(f.root,f.workflow.id,repair.id)).revisionEligibility.eligible,false);
  await assert.rejects(planning.review(f.root,f.workflow.id,repair.id,input),/restored clean/);
  await assert.rejects(planning.save(f.root,f.workflow.id,repair.id,JSON.stringify({workflowId:f.workflow.id,workItemId:repair.id,expectedVersion:input.expectedRecordVersion,implementationBoundaries:['Exact repair evidence'],affectedPaths:[],proofIntent:['Inspect conforming source']})),/restored clean/);fs.unlinkSync(outside);
  // Drive the actual failed SQL projection through the existing renderer and typed preload-shaped API.
  const React=require('react'),{loadRendererSourceModule:load}=require('../renderer/renderer-source-loader.cjs');
  const {WorkCardImplementWorkspace}=load('src/renderer/app/WorkCardImplementWorkspace.tsx');
  const {renderToStaticMarkup}=require('react-dom/server');
  const values=[exact,await kernel.getImplementationAttempt(f.root,f.workflow.id,repair.id),failed.completed,false,'',runtime.manager.getStatus(),null,false,'',item.id,await nav.get(f.root,f.workflow.id),failed.implementation,'',''],refs=[];
  const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},old=global.window;
  let index=0,refIndex=0,reconciled;
  React.useState=initial=>{const slot=index++;return [slot in values?values[slot]:initial,value=>values[slot]=typeof value==='function'?value(values[slot]):value];};React.useEffect=()=>{};React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});
  global.window={champcity:{getStructuredWorkItemPlanning:()=>planning.get(f.root,f.workflow.id,repair.id),getImplementationAttempt:()=>kernel.getImplementationAttempt(f.root,f.workflow.id,repair.id),getWorkflowWorkItemCodexExecutionStatus:()=>service.getStatus(f.root,{ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:repair.id}),getWorkflowExecutionProjection:()=>kernel.getExecutionProjection(f.root,f.workflow.id),getGreenfieldNavigation:()=>nav.get(f.root,f.workflow.id),reviewStructuredWorkItemPlanning:(workflowId,workItemId,decision)=>planning.review(f.root,workflowId,workItemId,decision)}};
  const reconcile=async()=>reconciled=await nav.get(f.root,f.workflow.id);
  const draw=()=>{index=refIndex=0;return WorkCardImplementWorkspace({workflowId:f.workflow.id,workItemId:repair.id,onNext:reconcile,onRefreshNavigation:reconcile}).props;};
  const nodes=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];
  const button=(p,label)=>nodes(p.navigation).find(n=>n.type==='button'&&n.props.children===label);
  const settle=async()=>{for(let i=0;i<300&&values[3];i++)await new Promise(resolve=>setTimeout(resolve,10));assert.equal(values[3],false);assert.equal(values[4],'');};
  try{
   let surface=draw();assert.equal(button(surface,'Continue to Review & Validation').props.disabled,true);assert.match(renderToStaticMarkup(surface.navigation),/latest Implement result is partial/);assert.equal(surface.codexExecution.checkpoint.status,'blocked');
   const readsBefore=(await f.store.listStateChanges(f.projectId)).length;button(surface,'Refresh').props.onClick();await settle();surface=draw();assert.match(surface.feedback,/refreshed/);assert.equal(reconciled.currentWorkspace,'work-card-building-review');assert.equal((await f.store.listStateChanges(f.projectId)).length,readsBefore);
   nodes(surface.navigation).find(n=>n.type==='textarea').props.onChange({target:{value:input.notes}});surface=draw();button(surface,'Request Work Card Revision').props.onClick();await settle();assert.equal(reconciled.currentWorkspace,'work-card-repair');
  }finally{Object.assign(React,original);global.window=old;}
  const canonical=await nav.get(f.root,f.workflow.id);assert.equal(canonical.currentWorkspace,'work-card-repair');assert.equal(canonical.currentWorkItemId,repair.id);assert.equal(canonical.currentRepairId,repair.id);
  await require('../../dist/main/workflow/workflowCandidateIngressService.js').createWorkflowCandidateIngressService().submit(f.root,{workflowId:f.workflow.id,stage:'work-item-planning',scopeEntityId:repair.id,candidateJson:JSON.stringify({implementationBoundaries:['Exact repair evidence; preserve file if already correct'],affectedPaths:[],proofIntent:['Inspect correct source; application-owned downstream integration proof remains outstanding']})});
  assert.equal((await nav.get(f.root,f.workflow.id)).currentWorkspace,'work-card-repair');
  assert.equal((await service.start(f.root,{ownerKind:'workflow-work-item',workflowId:f.workflow.id,workItemId:repair.id},selection)).state,'unavailable','replacement still requires Operator approval');
  exact=await planning.get(f.root,f.workflow.id,repair.id);await planning.review(f.root,f.workflow.id,repair.id,{expectedRecordVersion:exact.workItem.recordVersion,outcome:'approved',notes:'Approve exact inspection contract'});
  failRepair=false;const revised=await clickImplement(repair.id,2,true);assert.notEqual(revised.attempt.id,failed.attempt.id);assert.equal(revised.implementation.body.outcome,'implemented');assert.equal(revised.completed.checkpoint.status,'not-required');assert.equal(executions.at(-1).options.readOnly,true);
  assert.match(executions.at(-1).prompt,/"sourceMutation": "not-required"/);assert.equal(git('rev-parse','HEAD'),cleanHead);assert.equal(git('status','--porcelain'),'');
  assert.equal((await nav.get(f.root,f.workflow.id)).currentWorkspace,'work-card-report-review');assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
  assert.equal(JSON.stringify(await f.store.getEntity(f.projectId,failed.attempt.id)),attemptBytes);assert.equal(JSON.stringify(await f.store.getEntity(f.projectId,failed.implementation.id)),resultBytes);assert.deepEqual(fs.readFileSync(packetPath),packetBytes);
  assert.equal((await kernel.createTesterWorkItemExecutionContract(f.root,f.workflow.id,repair.id,{sourceMutation:'not-required',affectedPaths:[],proofIntent:['Independent exact assessment']})).sourceRevisionId,cleanHead);
  await tester.createTesterResult(f.projectId,f.workflow.id,repair.id,revised.implementation.id,{sourceMode:'source-backed',implementerRevisionId:cleanHead,recommendation:'no-permanent-test-required',affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Independent unchanged-source inspection'],unknowns:[],rationale:'Conforming source preserved'});
  await assert.rejects(planning.review(f.root,f.workflow.id,repair.id,{expectedRecordVersion:(await f.store.getEntity(f.projectId,repair.id)).recordVersion,outcome:'revision_requested',notes:'Successful attempts cannot replan'}),/planned\/ready|successful|unavailable/);
  return;
 }
 const repaired=await clickImplement(repair.id,1);assert.equal(repaired.completed.checkpoint.status,'committed');assert.notEqual(executions[1].options.readOnly,true);assert.ok(executions[1].options.writableRoots.includes(executions[1].options.workingDirectory));
 assert.deepEqual((await kernel.getExecutionProjection(f.root,f.workflow.id)).items.find(i=>i.record.id===repair.id).record.body.affectedPaths,['repair.txt']);
 assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,1);
});
