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

async function structuredPhaseLoopFixture(context) {
  const os = require('node:os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'champcity-sql-phase-map-'));
  const registration = await require('../../dist/main/projectState/currentProjectRegistrationService.js').registerCurrentProject(root,'existing',{projectName:'Map fixture'});
  const store = require('../../dist/main/projectState/sqliteProjectStateStore.js').createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));
  context.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  const state = require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(store,{principalId:'operator',principalType:'human',role:'Operator'}), projectId=registration.project.id;
  const workflow = (await state.createProjectCreationWorkflow(projectId,{title:'Map Greenfield'})).workflow;
  const {WORKFLOW_INTAKE_DEFINITIONS}=require('../../dist/shared/workflowIntakeContracts.js');
  const values=Object.fromEntries(WORKFLOW_INTAKE_DEFINITIONS['project-creation'].fields.filter(field=>field.required).map(field=>[field.key,field.key==='hasExistingSourceOrPlanning'?false:field.key==='projectRepository'?root:field.key==='projectName'?'map_fixture':field.key+' scope']));
  const intake=await state.saveWorkflowIntake(projectId,{workflowId:workflow.id,workflowType:'project-creation',values});
  await state.recordWorkflowIntakeDecision(projectId,intake.id,{expectedIntakeRecordVersion:1,outcome:'approved'});
  const {GREENFIELD_ARCHITECT_SECTIONS}=require('../../dist/shared/architectWorkspaceContracts.js');
  const interview=await state.saveArchitectCandidate(projectId,{workflowId:workflow.id,workflowType:'project-creation',intakeId:intake.id,intakeVersion:1,output:Object.fromEntries(Object.keys(GREENFIELD_ARCHITECT_SECTIONS).map(key=>[key,[key+' direction']]))});
  await state.recordArchitectReview(projectId,interview.id,{expectedRecordVersion:1,outcome:'approved'});
  const planning=require('../../dist/main/projectPlanning/structuredProjectPlanningService.js').createStructuredProjectPlanningService(), model=await planning.get(root,workflow.id);
  const candidate=await planning.save(root,workflow.id,{workflowId:workflow.id,facts:[{title:'Verified product',statement:'Observed bounded purpose',impact:'Constrains map'}],direction:{title:'Direction',objective:'Deliver result',scopeIn:['Outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Verify outcome',criticality:'required',verificationIntent:'Review result',validationPolicy:'operator_decision'}],sources:model.sources});
  await planning.review(root,workflow.id,candidate.review.cycleId,{expectedRecordVersion:1,outcome:'approved'});
  const mapService = require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService();
  const mapContext = await mapService.get(root,workflow.id);
  const mapSaved = await mapService.save(root,workflow.id,{workflowId:workflow.id,phases:typedMapPhases,sources:mapContext.sources});
  await mapService.review(root,workflow.id,mapSaved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  return {root,store,state,projectId,workflow,service:require('../../dist/main/phaseMap/structuredPhaseMapService.js').createStructuredPhaseMapService()};
}
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
  assert.equal(require('../../dist/main/workCardIntake/workCardIntakeService.js').getWorkCardMapProjection(f.root,'phase_one').state,'needs-attention');
  await listeners.get('workflow:phaseLoopReview')({},f.workflow.id,'phase_one','planning',saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const accepted = await loop.get(f.root,f.workflow.id,'phase_one','planning'); assert.deepEqual(accepted.review.workItems.map(work=>work.id),ids);
  const execution = await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id);
  const phaseObligation = execution.criteria.find(entry=>entry.ownerId===initial.phase.id && entry.record.body.statement==='Observable first outcome'); assert.ok(phaseObligation);
  assert.ok((await f.state.getPhaseCompletionEligibility(f.projectId,initial.phase.id)).blockers.includes('operator-decision:'+phaseObligation.record.id));
  assert.equal((await f.service.get(f.root,f.workflow.id)).review.disposition.state,'approved');
  assert.equal(require('../../dist/main/phasePlanning/phasePlanningService.js').getPhasePlanningCompletion(f.root,'phase_one').complete,true);
  await assert.rejects(f.state.recordDecision(f.projectId,saved.review.cycle.id,{decisionType:'phase-loop-review',outcome:'approved',decisionScope:'raw'}),/typed/);
  const service = require('../../dist/main/workCardIntake/workCardIntakeService.js'); let map = service.getWorkCardMapProjection(f.root,'phase_one');
  assert.deepEqual(map.candidates.map(candidate=>candidate.status),['Eligible','Ineligible']);
  await assert.rejects(loop.prepareWorkItem(f.root,saved.review.cycle.id,ids[1]),/dependency/);
  const intake = await listeners.get('workflow:phaseWorkIntakeGet')({},'phase_one',ids[0]); assert.equal(intake.workItemId,ids[0]); assert.match(intake.handoffInstruction,/existing WorkItem/);
  const prepared = await listeners.get('workflow:phaseWorkPrepare')({},saved.review.cycle.id,ids[0]); const again = await loop.prepareWorkItem(f.root,saved.review.cycle.id,ids[0]); assert.equal(again.id,prepared.id); assert.equal(again.recordVersion,prepared.recordVersion);
  assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,2); assert.equal(fs.existsSync(path.join(f.root,intake.handoffMarkdownPath)),false);
  assert.throws(()=>service.generateWorkCardIntakeHandoff(f.root,'phase_one',ids[0]),/canonical Intake is retired/);
  assert.equal(service.getWorkCardMapProjection(f.root,'phase_one').candidates[0].isActive,true);
  fs.writeFileSync(path.join(f.root,historical),'Changed historical prose'); assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','interview')).review.disposition.state,'approved');
  const stable = accepted.review.markdown, work = await f.store.getEntity(f.projectId,ids[0]);
  await f.store.transaction(f.projectId,unit=>unit.saveEntity({...work,recordVersion:work.recordVersion+1,updatedAt:new Date().toISOString(),body:{...work.body,workState:'closed'}},work.recordVersion));
  map = service.getWorkCardMapProjection(f.root,'phase_one'); assert.deepEqual(map.candidates.map(candidate=>candidate.status),['Complete','Eligible']); assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.markdown,stable);
  const current = require('../../dist/main/currentWorkflow/currentWorkflowService.js').getCurrentWorkspaceModel(f.root); assert.equal(current.activeWorkspaceId,'phase-work-card-selection');
});

test('SQL Phase Planning deterministically adopts typed exact candidates once and ignores subsequent Markdown changes', async context => {
  const f = await structuredPhaseLoopFixture(context), loop = require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService();
  const initial = await loop.get(f.root,f.workflow.id,'phase_one','interview');
  const direction = {title:'Approved direction',objective:'Implement accepted first Phase',scopeIn:['First Phase'],scopeOut:[],constraints:[],assumptions:[],risks:[]};
  const interview = await loop.save(f.root,f.workflow.id,'phase_one','interview',{workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'interview',facts:[],direction,criteria:[],sources:initial.sources});
  await loop.review(f.root,f.workflow.id,'phase_one','interview',interview.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const candidates = [{candidateId:'legacy_first',order:1,title:'Legacy first candidate',purpose:'Deterministic typed purpose',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[]},{candidateId:'legacy_second',order:2,title:'Legacy second candidate',purpose:'Dependent typed purpose',dependsOn:['legacy_first'],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[]}];
  const writer = require('../../dist/main/documents/canonicalMarkdownDocumentWriter.js').writeCanonicalMarkdownDocument;
  const paths = ['planning/phases/phase_one/Phase_Planning.md','planning/phases/phase_one/Work_Card_Plan.md'];
  for (let i=0;i<paths.length;i++) writer({workspaceRoot:f.root,relativePath:paths[i],metadata:{schemaVersion:1,artifactType:i?'work-card-plan':'phase-planning',artifactRevision:1,participationRole:'gatingReview',identity:{phaseId:'phase_one'},sourceRevisions:[],workflowData:i?{candidates}:{direction,criteria:[{statement:'Typed legacy obligation',criticality:'required',verificationIntent:'Review legacy result',validationPolicy:'operator_decision'}]},documentDisposition:{status:'Approved',notes:'Reviewed exact bundle',reviewedAt:new Date().toISOString()}},bodyMarkdown:'# Historical narrative\nThis prose is not migration input.'});
  const original = paths.map(file=>fs.readFileSync(path.join(f.root,file),'utf8'));
  const migrated = await loop.get(f.root,f.workflow.id,'phase_one','planning'); assert.equal(migrated.review.disposition.state,'approved'); assert.equal(migrated.review.workItems.length,2); assert.match(migrated.review.markdown,/Typed legacy obligation/);
  assert.deepEqual(paths.map(file=>fs.readFileSync(path.join(f.root,file),'utf8')),original);
  const again = await loop.get(f.root,f.workflow.id,'phase_one','planning'); assert.equal(again.review.cycle.id,migrated.review.cycle.id); assert.equal((await f.store.listEntities(f.projectId,'WorkItem')).length,2);
  for (const file of paths) fs.unlinkSync(path.join(f.root,file)); assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.markdown,migrated.review.markdown);
  const map = require('../../dist/main/workCardIntake/workCardIntakeService.js').getWorkCardMapProjection(f.root,'phase_one'); assert.deepEqual(map.candidates.map(candidate=>candidate.dependsOn),[[],[migrated.review.workItems[0].id]]);
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
  const eligibility=require('../../dist/main/workCardPlanning/workCardPlanningService.js').getWorkCardBuildingEligibility;
  assert.equal(eligibility(f.root,'phase_one',id).eligible,true);
  const generated=path.join(f.root,'planning/work-items',id,'Work_Card.md'); fs.mkdirSync(path.dirname(generated),{recursive:true}); fs.writeFileSync(generated,'# Rejected forged generated projection');
  assert.equal(eligibility(f.root,'phase_one',id).eligible,true); assert.equal((await service.get(f.root,f.workflow.id,id)).review.disposition.state,'approved');
  assert.equal((await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id)).criteria.filter(entry=>entry.ownerId===id && entry.record.body.statement==='Detailed observable outcome').length,1);
  await assert.rejects(f.state.reviseRecord(f.projectId,id,{proofIntent:['Bypass review']},3),/typed/);
  current=await service.save(f.root,f.workflow.id,id,JSON.stringify({...contract,expectedVersion:3,criteria:contract.criteria.slice(1),proofIntent:['Revised focused proof']})); assert.equal(current.review.disposition.state,'none'); assert.equal(eligibility(f.root,'phase_one',id).eligible,false);
  const livePlan=await f.state.getWorkflowExecutionPlan(f.projectId,f.workflow.id); assert.equal(livePlan.criteria.filter(entry=>entry.ownerId===id && entry.record.body.statement==='Inherited accepted obligation').length,1);
  const result=await service.decompose(f.root,f.workflow.id,id,JSON.stringify({...contract,expectedVersion:4,decomposition:{replacements:[{key:'bounded_a',kind:'feature',title:'First',objective:'First bounded outcome',dependencyWorkItemIds:[],dependencyReplacementKeys:[]},{key:'bounded_b',kind:'feature',title:'Second',objective:'Second bounded outcome',dependencyWorkItemIds:[],dependencyReplacementKeys:['bounded_a']}],criterionDispositions:livePlan.criteria.filter(entry=>entry.ownerId===id).map(entry=>({criterionId:entry.record.id,disposition:'transfer',replacementKey:'bounded_a'})),incomingDependentMappings:[]}}));
  assert.equal(result.replacements.length,2); assert.equal(require('../../dist/main/phasePlanning/structuredPhaseLoopReadProjection.js').structuredWorkCardMap(f.root,'phase_one').candidates.length,2);
  assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.disposition.state,'approved');
});


test('Greenfield SQL review and Repair preserve current Tester, human Criteria and exact return lineage', async context => {
  const f=await structuredPhaseLoopFixture(context),loop=require('../../dist/main/phasePlanning/structuredPhaseLoopService.js').createStructuredPhaseLoopService(),kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService(),reviewService=require('../../dist/main/workCardValidation/structuredWorkItemReviewService.js').createStructuredWorkItemReviewService();
  const principal=(id,role)=>require('../../dist/shared/projectState/projectStateService.js').createProjectStateService(f.store,{principalId:id,principalType:'agent',role}),tester=principal('independent-tester','Tester'),validator=principal('independent-validator','Validator');
  let initial=await loop.get(f.root,f.workflow.id,'phase_one','interview');
  const base={workflowId:f.workflow.id,phaseId:initial.phase.id,stageKind:'interview',facts:[{title:'Bounded result',statement:'Observed scope',impact:'Acceptance'}],direction:{title:'Phase outcome',objective:'Deliver independently useful outcome',scopeIn:['Outcome'],scopeOut:[],constraints:[],assumptions:[],risks:[]},criteria:[{statement:'Outcome verified independently',criticality:'required',verificationIntent:'Review exact result',validationPolicy:'semantic_ai'}],sources:initial.sources};
  let saved=await loop.save(f.root,f.workflow.id,'phase_one','interview',base);await loop.review(f.root,f.workflow.id,'phase_one','interview',saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  initial=await loop.get(f.root,f.workflow.id,'phase_one','planning');saved=await loop.save(f.root,f.workflow.id,'phase_one','planning',{...base,stageKind:'planning',sources:initial.sources,candidates:[{candidateId:'review_work',order:1,title:'Review work',purpose:'Exact bounded result',dependsOn:[],resolutionStatus:'planned',resolutionReason:'',evidencePaths:[],criteria:[{statement:'Visual result is usable',criticality:'required',verificationIntent:'Operator views the result',validationPolicy:'visual_human'}]}]});await loop.review(f.root,f.workflow.id,'phase_one','planning',saved.review.cycle.id,{expectedRecordVersion:1,outcome:'approved'});
  const id=saved.review.workItems[0].id;await loop.prepareWorkItem(f.root,saved.review.cycle.id,id);
  const planning=require('../../dist/main/workCardPlanning/structuredWorkItemPlanningService.js').createStructuredWorkItemPlanningService();
  async function approveContract(workId){const work=await f.store.getEntity(f.projectId,workId);let model=await planning.save(f.root,f.workflow.id,workId,JSON.stringify({workflowId:f.workflow.id,workItemId:workId,expectedVersion:work.recordVersion,implementationBoundaries:['Only exact accepted repair/outcome'],affectedPaths:[],proofIntent:['Independent exact proof']}));await planning.review(f.root,f.workflow.id,workId,{expectedRecordVersion:model.workItem.recordVersion,outcome:'approved'});}
  async function attempt(workId,ref,recommendation='reuse-existing-proof'){const work=await f.store.getEntity(f.projectId,workId);await kernel.beginWorkItemAttempt(f.root,f.workflow.id,workId,work.recordVersion,ref);const implementation=await kernel.finishWorkItemAttempt(f.root,f.workflow.id,workId,ref,{summary:'Implemented exact outcome',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'});const waiting=await reviewService.get(f.root,f.workflow.id,workId);assert.equal(waiting.validation.testerResultId,null);assert.ok(waiting.validation.completion.blockers.includes('tester-result-missing-or-stale'));const result=await tester.createTesterResult(f.projectId,f.workflow.id,workId,implementation.id,{sourceMode:'source-neutral',recommendation,affectedCapabilityIds:[],permanentTestPaths:[],determinationEvidence:['Independently examined outcome'],unknowns:[],rationale:'Exact outcome reviewed'});return {implementation,result};}
  await approveContract(id);assert.equal(require('../../dist/main/currentWorkflow/currentWorkflowService.js').getCurrentWorkspaceModel(f.root).activeWorkspaceId,'work-card-building-review');const first=await attempt(id,'greenfield-first','production-defect-suspected');
  const created=await kernel.createWorkflowRepair(f.root,f.workflow.id,id,first.result.id),repairId=created.repair.id;assert.equal((await reviewService.get(f.root,f.workflow.id,id)).repairs[0].parentId,id);
  assert.equal(require('../../dist/main/workCardIntake/workCardIntakeService.js').getWorkCardMapProjection(f.root,'phase_one').candidates.find(row=>row.isActive).candidateId,repairId);assert.equal(require('../../dist/main/currentWorkflow/currentWorkflowService.js').getCurrentWorkspaceModel(f.root).activeWorkspaceId,'work-card-repair');
  await assert.rejects(kernel.createWorkflowRepair(f.root,f.workflow.id,id,first.result.id),/already exists/);
  const repairFile='planning/work-items/'+repairId+'/Repair_Work_Card.md',repairWriter=require('../../dist/main/documents/canonicalMarkdownDocumentWriter.js').writeCanonicalMarkdownDocument;
  repairWriter({workspaceRoot:f.root,relativePath:repairFile,metadata:{schemaVersion:1,artifactType:'repair-work-card',artifactRevision:1,participationRole:'gatingReview',identity:{workItemId:repairId},sourceRevisions:[],workflowData:{structuredReviewIdentity:{workflowId:f.workflow.id,workItemId:repairId,implementationRecordId:null,testerResultId:null,repairParentId:id,failureEvidenceId:first.result.id,workItemContract:{workflowId:f.workflow.id,workItemId:repairId,expectedVersion:1,implementationBoundaries:['Only the exact failed outcome'],affectedPaths:[],proofIntent:['Independent repair proof']}}},documentDisposition:{status:'Approved',notes:'Controlled reviewed repair contract',reviewedAt:new Date().toISOString()}},bodyMarkdown:'# Arbitrary repair prose has no authority'});
  await reviewService.migrate(f.root,f.workflow.id,repairId);await reviewService.migrate(f.root,f.workflow.id,repairId);assert.equal((await planning.get(f.root,f.workflow.id,repairId)).review.disposition.state,'approved');fs.unlinkSync(path.join(f.root,repairFile));
  const repairAttempt=await attempt(repairId,'greenfield-repair');let repairReview=await reviewService.get(f.root,f.workflow.id,repairId);
  for(const entry of repairReview.validation.criteria.filter(entry=>entry.criterion.body.criticality==='required'))await validator.recordValidation(f.projectId,entry.criterion.id,{validationType:'work-item-criterion',method:'Independent exact proof',validationMode:'semantic_ai',outcome:'pass',summary:'Repair outcome holds',targetRecordVersion:entry.criterion.recordVersion,implementationRecordId:repairAttempt.implementation.id});
  await kernel.completeWorkItem(f.root,f.workflow.id,repairId,(await f.store.getEntity(f.projectId,repairId)).recordVersion);assert.equal((await f.store.getEntity(f.projectId,id)).body.workState,'ready');assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.disposition.state,'approved');
  const second=await attempt(id,'greenfield-second');await assert.rejects(kernel.createWorkflowRepair(f.root,f.workflow.id,id,first.result.id),/stale/);
  let current=await reviewService.get(f.root,f.workflow.id,id);const human=current.validation.criteria.find(entry=>entry.policy==='visual_human');assert.equal(human.humanEvidenceRequired,true);assert.equal(human.outcome,'pending');
  await assert.rejects(kernel.recordWorkItemVisualCriterion(f.root,{workflowId:f.workflow.id,workItemId:id,criterionId:human.criterion.id,expectedCriterionVersion:99,outcome:'pass',summary:'Wrong revision'}),/exact|current|stale/);
  const visual=await kernel.recordWorkItemVisualCriterion(f.root,{workflowId:f.workflow.id,workItemId:id,criterionId:human.criterion.id,expectedCriterionVersion:human.criterion.recordVersion,outcome:'pass',summary:'Operator observed usable result'});
  for(const entry of current.validation.criteria.filter(entry=>entry.policy==='semantic_ai'))await validator.recordValidation(f.projectId,entry.criterion.id,{validationType:'work-item-criterion',method:'Independent exact proof',validationMode:'semantic_ai',outcome:'pass',summary:'Current result holds',targetRecordVersion:entry.criterion.recordVersion,implementationRecordId:second.implementation.id});
  current=await reviewService.get(f.root,f.workflow.id,id);assert.equal(current.validation.completion.eligible,true,current.validation.completion.blockers.join(','));
  const historical='planning/work-items/'+id+'/Validation_Record.md',writer=require('../../dist/main/documents/canonicalMarkdownDocumentWriter.js').writeCanonicalMarkdownDocument;
  writer({workspaceRoot:f.root,relativePath:historical,metadata:{schemaVersion:1,artifactType:'validation-record',artifactRevision:1,participationRole:'gatingReview',identity:{workItemId:id},sourceRevisions:[],workflowData:{structuredReviewIdentity:{workflowId:f.workflow.id,workItemId:id,implementationRecordId:second.implementation.id,testerResultId:second.result.id,validationId:visual.validation.id}},documentDisposition:{status:'Approved',notes:'Controlled exact identity',reviewedAt:new Date().toISOString()}},bodyMarkdown:'# Arbitrary prose: reject everything'});
  const before=(await f.store.listEntities(f.projectId,'Validation')).length;await reviewService.migrate(f.root,f.workflow.id,id);await reviewService.migrate(f.root,f.workflow.id,id);assert.equal((await f.store.listEntities(f.projectId,'Evidence')).filter(record=>record.body.evidenceType==='controlled-review-import').length,2);assert.equal((await f.store.listEntities(f.projectId,'Validation')).length,before);
  fs.unlinkSync(path.join(f.root,historical));const generated=path.join(f.root,'planning','Generated_Review.md');fs.writeFileSync(generated,current.markdown);fs.writeFileSync(generated,'# Forged pass/fail or repair prose');assert.equal((await reviewService.get(f.root,f.workflow.id,id)).validation.completion.eligible,true);
  assert.throws(()=>require('../../dist/main/workCardValidation/workCardValidationService.js').applyOperatorValidationDecision(f.root,'phase_one',id,{decision:'ValidatePassed',operatorNotes:'Bypass'}),/SQL/);assert.throws(()=>require('../../dist/main/workCardRepair/workCardRepairService.js').createRepairWorkCard(f.root,'phase_one',id,historical,'postValidationRecord','Bypass'),/SQL/);
  await kernel.completeWorkItem(f.root,f.workflow.id,id,(await f.store.getEntity(f.projectId,id)).recordVersion);assert.equal((await f.store.getEntity(f.projectId,id)).body.workState,'closed');assert.equal(require('../../dist/main/workCardIntake/workCardIntakeService.js').getWorkCardMapProjection(f.root,'phase_one').state,'all-complete');assert.equal((await loop.get(f.root,f.workflow.id,'phase_one','planning')).review.disposition.state,'approved');assert.equal((await f.store.listEntities(f.projectId,'SourceCheckpoint')).length,0);
});
