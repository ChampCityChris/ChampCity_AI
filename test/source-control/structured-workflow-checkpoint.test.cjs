const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createSQLiteProjectStateStore } = require("../../dist/main/projectState/sqliteProjectStateStore.js");
const { registerCurrentProject } = require("../../dist/main/projectState/currentProjectRegistrationService.js");
const { createProjectStateService } = require("../../dist/shared/projectState/projectStateService.js");
const { createWorkflowSourceMaterializationService } = require("../../dist/main/sourceControl/workflowSourceMaterializationService.js");
const { selectStructuredWorkRoute, recordStructuredImplementation, recordStructuredWorkDisposition, retryStructuredImplementationCheckpoint } = require("../../dist/main/sourceControl/structuredWorkflowCheckpointService.js");

const operator = { principalId: "operator", principalType: "human", role: "Operator" };
const repositoryId = "workflow-wrapper-repository";
function git(root, ...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); }
test("legacy checkpoint recovery requires exact current ownership, approval and reserved HEAD", async t => {
 for (const mode of [
  "missing-paths", "pre-materialization", "arbitrary-packet-digest", "ready-after-run",
  "historical-checkout-drift", "historical-revision-drift", "historical-post-run-revision-drift",
  "missing-binding-history", "missing-baseline-history", "missing-running-chronology",
  "pending-own-checkpoint", "blocked-dirty", "blocked-other-reason", "out-of-scope",
  "redirected-checkout", "redirected-packet", "changed-branch", "changed-binding", "competing-lease",
  "conflicting-receipt", "unproven-clean", "forged-committed-content", "committed-dirty",
  "unrelated-checkpoint", "newer-record", "newer-attempt", "newer-peer-owner",
  "malformed-packet-digest", "wrong-packet-project", "wrong-packet-attempt", "altered-packet-result",
  "forged-packet-paths", "stale-head", "unapproved",
 ]) await t.test(mode, async context => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'champcity-legacy-checkpoint-')),dev=path.join(root,'Dev');fs.mkdirSync(dev);
  git(dev,'init','-b','dev');git(dev,'config','user.name','Fixture');git(dev,'config','user.email','fixture@example.invalid');
  fs.writeFileSync(path.join(dev,'baseline.txt'),'Baseline');git(dev,'add','.');git(dev,'commit','-m','Synthetic baseline');const revision=git(dev,'rev-parse','HEAD');
  const registration=await registerCurrentProject(root,'existing',{projectName:'Legacy recovery',sourceRepositoryId:repositoryId}),projectId=registration.project.id;
  const store=createSQLiteProjectStateStore(path.join(root,'.champcity','project-state.sqlite'));context.after(()=>{store.close();fs.rmSync(root,{recursive:true,force:true});});
  const state=createProjectStateService(store,operator);
  const {workflow}=await state.createSubstantiveWorkflow(projectId,{workflowType:'feature-capability',title:'Exact legacy',entryWorkspace:'feature-intake',sourceSeed:{repositoryId,integrationTargetSourceLineId:'dev',baseRevisionId:revision}});
  const plan=await state.acceptWorkflowPlanningGraph(projectId,{workflowId:workflow.id,topology:'direct',solution:{title:'Exact source',objective:'Recover checkpoint',scopeIn:[],scopeOut:[],constraints:[],assumptions:[],risks:[]},solutionCriteria:[],phases:[],workItems:[{key:'parent',kind:'feature',title:'Parent',objective:'Approved evidence',dependencyKeys:[],criteria:[]},...(mode==='newer-peer-owner'?[{key:'peer',kind:'feature',title:'Peer',objective:'Newer source owner',dependencyKeys:[],criteria:[]}]:[])]});
  const materializer=createWorkflowSourceMaterializationService({projectContainerRoot:root,projectId});
  const preMaterialization=['pre-materialization','ready-after-run','historical-checkout-drift','historical-revision-drift'].includes(mode);
  let materialized=preMaterialization?null:await materializer.materialize(workflow.id);
  const kernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService();
  const work=plan.directWorkItems[0],relative='conformance/phase-1/work-card-01.txt';
  await kernel.acceptWorkItemExecutionPlan(root,{workflowId:workflow.id,workItemId:work.id,expectedVersion:work.recordVersion,plan:{implementationBoundaries:['Exact approved file'],affectedPaths:[relative],proofIntent:['Review source']}});
  const attempt=await kernel.prepareImplementationAttempt(root,workflow.id,work.id);
  if(mode!=='ready-after-run'&&!materialized)materialized=await materializer.materialize(workflow.id);
  let digest='a'.repeat(64);
  if(mode!=='ready-after-run')digest=(await kernel.createWorkItemExecutionContract(root,workflow.id,work.id,{sourceMutation:'allowed',affectedPaths:[relative],proofIntent:['Review source']})).digest;
  assert.notEqual(digest,attempt.body.contractDigest);
  if(['historical-checkout-drift','historical-revision-drift'].includes(mode)){
   const key=mode==='historical-checkout-drift'?'repositoryCheckoutId':'currentRevisionId';
   const changed=await state.updateSourceBinding(projectId,materialized.binding.id,{[key]:mode==='historical-checkout-drift'?'wrong-historical-checkout':'a'.repeat(40)},materialized.binding.recordVersion);
   await state.updateSourceBinding(projectId,changed.id,{[key]:materialized.binding.body[key]},changed.recordVersion);
  }
  await kernel.beginWorkItemAttempt(root,workflow.id,work.id,attempt.body.workItemVersion,attempt.id);
  if(!materialized)materialized=await materializer.materialize(workflow.id);
  const checkout=path.join(root,materialized.checkout.projectRelativePath);
  const result={summary:'Implemented',deviations:[],blockers:[],residualRisks:[],outcome:'implemented'};
  const implementation=await kernel.finishWorkItemAttempt(root,workflow.id,work.id,attempt.id,result);
  if(mode==='historical-post-run-revision-drift'){
   const changed=await state.updateSourceBinding(projectId,materialized.binding.id,{currentRevisionId:'a'.repeat(40)},materialized.binding.recordVersion);
   await state.updateSourceBinding(projectId,changed.id,{currentRevisionId:revision},changed.recordVersion);
  }
  const packetPath=path.join(root,'.champcity','runtime','work-item-attempts',attempt.id+'.json');fs.mkdirSync(path.dirname(packetPath),{recursive:true});
  fs.writeFileSync(packetPath,JSON.stringify({schemaVersion:1,projectId:mode==='wrong-packet-project'?'another-project':projectId,workflowId:workflow.id,workItemId:work.id,executionRef:mode==='wrong-packet-attempt'?'another-attempt':attempt.id,contractDigest:mode==='malformed-packet-digest'?'not-a-sha256':mode==='arbitrary-packet-digest'?'b'.repeat(64):digest,result:mode==='altered-packet-result'?{...result,summary:'Altered result'}:result,sourceCheckpointAttempt:mode==='forged-packet-paths'?{attributablePaths:['outside.txt']}:{}}));const bytes=fs.readFileSync(packetPath);
  if(mode==='redirected-packet'){const directory=path.dirname(packetPath);fs.renameSync(directory,directory+'-original');fs.symlinkSync(directory+'-original',directory,'junction');}
  fs.mkdirSync(path.dirname(path.join(checkout,relative)),{recursive:true});fs.writeFileSync(path.join(checkout,relative),'Legacy evidence');
  let pendingId;
  if(['pending-own-checkpoint','conflicting-receipt','forged-committed-content','committed-dirty'].includes(mode)){
   git(checkout,'add','--',relative);
   const pending=await require('../../dist/main/sourceControl/semanticCheckpointService.js').createImplementationCheckpoint(root,projectId,{boundaryId:attempt.id,workflowId:workflow.id,targetEntityId:implementation.id,sourceLineId:materialized.binding.body.workSourceLineId,expectedRevisionId:revision,repositoryCheckoutId:materialized.binding.body.repositoryCheckoutId,attributablePaths:[relative]});
   assert.equal(pending.state,'blocked');pendingId=pending.checkpointId;assert.ok(pendingId);
   git(checkout,'restore','--staged','--',relative);
  }
  if(mode==='unrelated-checkpoint')await state.createSourceCheckpoint(projectId,materialized.binding.id,workflow.id,implementation.id,{boundaryId:'unrelated-boundary',expectedRevisionId:revision,checkpointKind:'implementation',checkpointState:'pending',receiptDigest:'a'.repeat(64)});
  if(mode==='newer-record')await state.recordImplementation(projectId,work.id,{...result,summary:'Newer immutable owner',executionRef:'newer-owner'});
  if(mode==='newer-attempt'){
   let current=await store.getEntity(projectId,work.id);await state.reviseRecord(projectId,work.id,{workState:'ready'},current.recordVersion);
   await kernel.prepareImplementationAttempt(root,workflow.id,work.id);
   current=await store.getEntity(projectId,work.id);await state.reviseRecord(projectId,work.id,{workState:'validation_pending'},current.recordVersion);
  }
  if(mode==='newer-peer-owner'){
   const peer=plan.directWorkItems[1];await kernel.acceptWorkItemExecutionPlan(root,{workflowId:workflow.id,workItemId:peer.id,expectedVersion:peer.recordVersion,plan:{implementationBoundaries:['Overlapping source'],affectedPaths:[relative],proofIntent:['Review']}});
   const owner=await kernel.prepareImplementationAttempt(root,workflow.id,peer.id);await kernel.beginWorkItemAttempt(root,workflow.id,peer.id,owner.body.workItemVersion,owner.id);await kernel.finishWorkItemAttempt(root,workflow.id,peer.id,owner.id,{...result,summary:'Newer overlapping source owner'});
  }
  if(mode==='stale-head'){fs.writeFileSync(path.join(checkout,'baseline.txt'),'Changed identity');git(checkout,'add','baseline.txt');git(checkout,'commit','-m','Unrelated synthetic source advance');}
  if(mode==='unapproved'){
   let current=await store.getEntity(projectId,work.id);current=await state.reviseRecord(projectId,work.id,{workState:'ready'},current.recordVersion);
   current=await state.saveWorkItemPlanningContract(projectId,{workflowId:workflow.id,workItemId:work.id,expectedVersion:current.recordVersion,implementationBoundaries:['Changed contract without approval'],affectedPaths:[relative],proofIntent:['Review revised source']});
   await state.reviseRecord(projectId,work.id,{workState:'validation_pending'},current.recordVersion);
   assert.equal((await state.getWorkItemPlanningReview(projectId,work.id)).disposition.state,'none');
  }
  if(mode==='unproven-clean'){git(checkout,'add','--',relative);git(checkout,'commit','-m','Unproven clean implementation');}
  if(['forged-committed-content','committed-dirty'].includes(mode)){
   const saved=await store.getEntity(projectId,pendingId);
   if(mode==='forged-committed-content')fs.writeFileSync(path.join(checkout,relative),'Changed after saved receipt');
   git(checkout,'add','--',relative);git(checkout,'commit','-m',`ChampCity implementation checkpoint ${saved.body.receiptDigest}\n\nCheckpoint-Receipt: ${saved.body.receiptDigest}\nCheckpoint-Kind: implementation`);
   if(mode==='committed-dirty')fs.writeFileSync(path.join(checkout,'outside.txt'),'Preserved outside source');
  }
  if(mode!=='missing-paths'){
   await assert.rejects(createWorkflowSourceMaterializationService({projectContainerRoot:root,projectId}).materialize(workflow.id));
   const blocked=await store.getEntity(projectId,materialized.binding.id);assert.equal(blocked.body.preparationState,'blocked');assert.equal(blocked.body.failureCode,'REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED');
   // Ordinary semantic and domain checkpoint entry points must still reject this binding.
   const ordinary=await require('../../dist/main/sourceControl/semanticCheckpointService.js').createImplementationCheckpoint(root,projectId,{boundaryId:attempt.id,workflowId:workflow.id,targetEntityId:implementation.id,sourceLineId:blocked.body.workSourceLineId,expectedRevisionId:revision,repositoryCheckoutId:blocked.body.repositoryCheckoutId,attributablePaths:[relative]});
   assert.equal(ordinary.state,'blocked');
   await assert.rejects(state.createSourceCheckpoint(projectId,blocked.id,workflow.id,implementation.id,{boundaryId:'ordinary-blocked',expectedRevisionId:revision,checkpointKind:'implementation',checkpointState:'pending',receiptDigest:'a'.repeat(64)}),/ready SourceBinding/i);
   if(mode==='blocked-other-reason')await state.updateSourceBinding(projectId,blocked.id,{failureCode:'SOURCE_LINE_MATERIALIZATION_FAILED'},blocked.recordVersion);
   if(mode==='changed-binding')await state.updateSourceBinding(projectId,blocked.id,{workSourceLineId:'workflow/wrong'},blocked.recordVersion);
  }
  if(mode==='out-of-scope')fs.writeFileSync(path.join(checkout,'outside.txt'),'Preserved outside source');
  if(mode==='changed-branch')git(checkout,'checkout','-b','fixture-wrong-branch');
  if(mode==='redirected-checkout'){fs.renameSync(checkout,checkout+'-original');fs.symlinkSync(checkout+'-original',checkout,'junction');}
  if(['conflicting-receipt','forged-committed-content'].includes(mode))fs.writeFileSync(path.join(checkout,relative),'Changed after saved receipt');
  let competing;
  if(mode==='competing-lease'){const leases=require('../../dist/main/workCardBuilding/workflowExecutionLease.js');competing=leases.acquireWorkflowExecutionLease(leases.workflowExecutionLeaseKey('source-backed',checkout),'fixture-tester');context.after(()=>competing.release());}
  if(['missing-binding-history','missing-baseline-history','missing-running-chronology'].includes(mode)){
   const module=require('../../dist/main/projectState/sqliteProjectStateStore.js'),original=module.createSQLiteProjectStateStore;
   const baselineId=materialized.binding.body.sourceBaselineId;
   module.createSQLiteProjectStateStore=(...args)=>{const reader=original(...args);return {...reader,
    async getEntityVersion(project,id,version){if(mode==='missing-binding-history'&&id===materialized.binding.id||mode==='missing-baseline-history'&&id===baselineId)return null;return reader.getEntityVersion(project,id,version);},
    async listOutbox(project,...rest){const events=await reader.listOutbox(project,...rest);return mode==='missing-running-chronology'?events.filter(event=>event.entityId!==attempt.id||event.payload.toRecordVersion!==2):events;}
   };};
   context.after(()=>{module.createSQLiteProjectStateStore=original;});
  }
  const records=await store.listEntities(projectId,'ImplementationRecord'),attempts=await store.listEntities(projectId,'ImplementationAttempt');
  const sourceBefore={head:git(checkout,'rev-parse','HEAD'),status:git(checkout,'status','--porcelain','--untracked-files=all'),index:git(checkout,'ls-files','--stage')};
  if(['missing-paths','pre-materialization','arbitrary-packet-digest','pending-own-checkpoint','blocked-dirty'].includes(mode)){
   const recovery=await kernel.getCheckpointRecoveryProjection(root,workflow.id,work.id);assert.equal(recovery.implementation.retryable,true,recovery.implementation.reason);
   const recovered=await kernel.retryImplementationCheckpoint(root,workflow.id,work.id,implementation.id);assert.equal(recovered.checkpoint.state,'committed',recovered.checkpoint.message);
   if(pendingId)assert.equal(recovered.checkpoint.checkpointId,pendingId);
   assert.equal(git(checkout,'status','--porcelain','--untracked-files=all'),'');assert.notEqual(git(checkout,'rev-parse','HEAD'),revision);
   assert.equal((await store.getEntity(projectId,materialized.binding.id)).body.currentRevisionId,recovered.checkpoint.revision.revisionId);
   assert.equal((await store.listEntities(projectId,'SourceCheckpoint')).length,1);
   const ready=await store.getEntity(projectId,materialized.binding.id);assert.equal(ready.body.preparationState,'ready');assert.equal(ready.body.failureCode,undefined);
   const count=git(checkout,'rev-list','--count','HEAD');const repeat=await retryStructuredImplementationCheckpoint(root,projectId,workflow.id,work.id,implementation.id);assert.equal(repeat.checkpoint.checkpointId,recovered.checkpoint.checkpointId);assert.equal(git(checkout,'rev-list','--count','HEAD'),count);
  }else{
   if(['conflicting-receipt','forged-committed-content'].includes(mode)){
    const refused=await retryStructuredImplementationCheckpoint(root,projectId,workflow.id,work.id,implementation.id);assert.equal(refused.checkpoint.state,'inspection-required');assert.match(refused.checkpoint.message,/identity conflicts/i);
   }else await assert.rejects(retryStructuredImplementationCheckpoint(root,projectId,workflow.id,work.id,implementation.id),error=>{
    assert.match(error.message,/latest|ownership|reserved|approved|stale|inspection|invalid/i);
    if(mode==='ready-after-run')assert.match(error.message,/never became ready before/i);
    if(mode.startsWith('historical-'))assert.match(error.message,/historical SourceBinding.*changed/i);
    if(mode==='missing-running-chronology')assert.match(error.message,/state-change chronology/i);
    return true;
   });
   assert.equal((await store.listEntities(projectId,'SourceCheckpoint')).length,['unrelated-checkpoint','conflicting-receipt','forged-committed-content','committed-dirty'].includes(mode)?1:0);assert.equal(fs.readFileSync(path.join(checkout,relative),'utf8'),['conflicting-receipt','forged-committed-content'].includes(mode)?'Changed after saved receipt':'Legacy evidence');
   if(mode==='forged-packet-paths'){
    // A nonempty packet attribution uses the existing attributed-retry projection, not legacy discovery.
    await assert.rejects(require('../../dist/main/sourceControl/structuredWorkflowCheckpointService.js').inspectLegacyImplementationCheckpoint(root,projectId,workflow.id,work.id,implementation.id),/legacy packet does not match/i);
   }else{
    if(!['competing-lease','conflicting-receipt','forged-committed-content'].includes(mode))assert.equal((await kernel.getCheckpointRecoveryProjection(root,workflow.id,work.id)).implementation.retryable,false);
    const startKernel=require('../../dist/main/workflow/workflowExecutionApplicationService.js').createWorkflowExecutionApplicationService({materializeWorkflowSource:async()=>{throw Error('Recovery must refuse before materialization.');}});
    const prepared=await startKernel.prepareExecution(root,workflow.id,{sourceMutating:true});assert.equal(prepared.state,'blocked');assert.match(prepared.failureCode,/inspection|recovery/i);assert.notEqual(prepared.failureCode,'REPOSITORY_CHECKOUT_MATERIALIZATION_FAILED');
   }
   assert.equal(fs.readFileSync(path.join(checkout,relative),'utf8'),['conflicting-receipt','forged-committed-content'].includes(mode)?'Changed after saved receipt':'Legacy evidence');
   assert.deepEqual({head:git(checkout,'rev-parse','HEAD'),status:git(checkout,'status','--porcelain','--untracked-files=all'),index:git(checkout,'ls-files','--stage')},sourceBefore);
  }
  assert.deepEqual(await store.listEntities(projectId,'ImplementationRecord'),records);assert.deepEqual(await store.listEntities(projectId,'ImplementationAttempt'),attempts);assert.deepEqual(fs.readFileSync(packetPath),bytes);
 });
});
test("WIR route decisions do not checkpoint; implementation and disposition use Workflow-owned checkout", async context => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "champcity-structured-workflow-lineage-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dev = path.join(root, "Dev"); fs.mkdirSync(dev); git(dev, "init", "-b", "dev");
  git(dev, "config", "user.name", "Test Operator"); git(dev, "config", "user.email", "operator@example.invalid");
  fs.writeFileSync(path.join(dev, "feature.txt"), "baseline\n"); git(dev, "add", "feature.txt"); git(dev, "commit", "-m", "baseline");
  const baseRevision = git(dev, "rev-parse", "HEAD"); fs.mkdirSync(path.join(root, ".champcity"));
  const registration = await registerCurrentProject(root, "existing", { projectName: "Structured workflow", sourceRepositoryId: repositoryId });
  const store = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const state = createProjectStateService(store, operator);
  const project = registration.project;
  const { intake, workflow: routing } = await state.createWorkIntake(project.id, { request: "Implement", desiredOutcome: "Working", constraints: [], evidenceContext: [], requestedIntegrationTarget: "dev" });
  const assessment = await state.recordRouteAssessment(project.id, intake.id, { recommendation: "feature-change", traits: [], rationale: "Feature", evidenceIds: [] });
  const route = await selectStructuredWorkRoute(root, project.id, intake.id, { route: "feature-change", assessmentId: assessment.id, rationale: "Choose feature" });
  assert.equal(route.checkpoint.state, "not-required"); assert.equal(route.checkpoint.checkpointId, null); assert.equal(route.checkpoint.revision, null);
  assert.equal(route.checkpoint.message, "Routing decision does not own source.");
  assert.equal(git(dev, "branch", "--show-current"), "dev");

  const target = await state.createWorkflow(project.id, { workflowType: "feature-capability", title: "Feature", currentWorkspace: "development" });
  await state.linkWorkflowRouteTarget(project.id, routing.id, target.id);
  const work = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Owned", objective: "Implement", workState: "implemented" });
  await state.createRelationship(project.id, work.id, "part_of", target.id);
  const other = await state.createSubstantiveWorkflow(project.id, { workflowType: "issue-resolution", title: "Other", entryWorkspace: "issue-intake" });
  const wrong = await state.createRecord(project.id, "WorkItem", { workItemKind: "feature", title: "Wrong", objective: "Reject", workState: "implemented" });
  await state.createRelationship(project.id, wrong.id, "part_of", other.workflow.id);
  const baseline = await state.createWorkflowSourceBaseline(project.id, target.id, { repositoryId, integrationTargetSourceLineId: "dev", baseRevisionId: baseRevision });
  const successor = (await state.supersedeRecord(project.id, target.id, { ...target.body, title: "Feature successor" }, 1)).successor;
  const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: root, projectId: project.id });
  const materialized = await materializer.materialize(successor.id); store.close();
  assert.equal(materialized.binding.body.sourceBaselineId, baseline.id);
  const checkout = path.join(root, materialized.checkout.projectRelativePath);
  const sourceLineId = materialized.binding.body.workSourceLineId;
  const currentStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  const currentState = createProjectStateService(currentStore, operator);
  currentStore.close();

  const implementationInput = { summary: "Feature implemented", deviations: [], blockers: [], residualRisks: [], outcome: "implemented", executionRef: "execution-target" };
  await assert.rejects(recordStructuredImplementation(root, project.id, target.id, work.id, { ...implementationInput, executionRef: "historical-owner" }, "historical-implementation", ["feature.txt"]), /unique current Workflow owner/);
  await assert.rejects(recordStructuredImplementation(root, project.id, successor.id, wrong.id, { ...implementationInput, executionRef: "wrong" }, "wrong-owner", ["feature.txt"]), /not owned by the selected target Workflow lineage/);
  fs.writeFileSync(path.join(checkout, "feature.txt"), "implemented\n");
  const implementation = await recordStructuredImplementation(root, project.id, successor.id, work.id, implementationInput, implementationInput.executionRef, ["feature.txt"]);
  assert.equal(implementation.record.body.workItemId, work.id); assert.equal(implementation.checkpoint.state, "committed");
  assert.equal(git(dev, "branch", "--show-current"), "dev");
  const badDecision = { decisionType: "review", outcome: "accepted", rationale: "Wrong owner", decisionScope: "wrong-owner" };
  await assert.rejects(recordStructuredWorkDisposition(root, project.id, target.id, work.id, { ...badDecision, decisionScope: "historical-owner" }, "historical-disposition"), /unique current Workflow owner/);
  await assert.rejects(recordStructuredWorkDisposition(root, project.id, successor.id, wrong.id, badDecision, "wrong-disposition"), /not owned by the selected target Workflow lineage/);
  const verify = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  let verifyOpen = true;
  try {
    const currentWork = await verify.getEntity(project.id, work.id);
    await createProjectStateService(verify, operator).reviseRecord(project.id, work.id, { ...currentWork.body, workState: "validation_pending" }, currentWork.recordVersion);
    const savedCheckpoints = await verify.listEntities(project.id, "SourceCheckpoint");
    const implementationCheckpoint = savedCheckpoints.find(row => row.body.boundaryId === implementationInput.executionRef);
    assert.ok(implementationCheckpoint);
    fs.mkdirSync(path.join(root, ".champcity", "runtime", "work-item-attempts"), { recursive: true });
    fs.writeFileSync(path.join(root, ".champcity", "runtime", "work-item-attempts", `${implementationInput.executionRef}.json`), JSON.stringify({
      schemaVersion: 1, projectId: project.id, workflowId: successor.id, workItemId: work.id, executionRef: implementationInput.executionRef,
      contractDigest: "a".repeat(64), sourceCheckpointAttempt: { repositoryCheckoutId: materialized.binding.body.repositoryCheckoutId,
        sourceLineId, expectedRevisionId: implementationCheckpoint.body.expectedRevisionId, attributablePaths: ["feature.txt"] },
    }));
    const historyBeforeRetry = git(checkout, "rev-list", "--count", "HEAD");
    const bindingBeforeRetry = (await verify.listEntities(project.id, "SourceBinding")).find(row => row.body.workflowId === successor.id);
    assert.equal(git(checkout, "rev-parse", "HEAD"), implementationCheckpoint.body.resultingRevisionId);
    assert.equal(bindingBeforeRetry.body.currentRevisionId, implementationCheckpoint.body.resultingRevisionId);
    verify.close(); verifyOpen = false;
    const recovered = await retryStructuredImplementationCheckpoint(root, project.id, successor.id, work.id, implementation.record.id);
    assert.equal(recovered.checkpoint.state, "committed", recovered.checkpoint.message);
    assert.equal(recovered.checkpoint.checkpointId, implementation.checkpoint.checkpointId);
    assert.equal(git(checkout, "rev-list", "--count", "HEAD"), historyBeforeRetry, "retry reuses the durable checkpoint without a duplicate commit");
    const recoveredStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
    const checkpoints = await recoveredStore.listEntities(project.id, "SourceCheckpoint");
    assert.equal(checkpoints.filter(row => row.body.boundaryId === implementationInput.executionRef).length, 1);
    recoveredStore.close();
  } finally {
    if (verifyOpen) verify.close();
  }
  const finalStore = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try {
    const checkpoints = await finalStore.listEntities(project.id, "SourceCheckpoint"); assert.equal(checkpoints.length, 1);
    assert.ok(checkpoints.every(row => row.body.workflowId === successor.id && !Object.hasOwn(row.body, "workIntakeId")));
    assert.equal(git(checkout, "branch", "--show-current"), sourceLineId);
  } finally { finalStore.close(); }
  const disposition = await recordStructuredWorkDisposition(root, project.id, successor.id, work.id,
    { decisionType: "review", outcome: "accepted", rationale: "Accepted", decisionScope: "target-owner" }, "disposition-boundary");
  assert.equal(disposition.checkpoint.state, "committed");
  const afterDisposition = createSQLiteProjectStateStore(path.join(root, ".champcity", "project-state.sqlite"));
  try { assert.equal((await afterDisposition.listEntities(project.id, "SourceCheckpoint")).length, 2); } finally { afterDisposition.close(); }
});
