const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const {seedCompletedRoutedPlan}=require('../support/completed-routed-plan.cjs');
const {installSemanticSourceFixture}=require('../support/integration-semantics.cjs');
const {createRoutedIntegrationService}=require('../../dist/main/planExecution/routedIntegrationService.js');
const policyProvider=require('../../dist/main/planExecution/integrationPolicyProvider.js');

test('routed clean and conflict integration preserves completed checkpoint and Plan lineage from the nearest durable boundary',async t=>{
 require('../support/execution-metrics.cjs').measureExecution(t,'routed-integration-focus');
 for(const conflicted of [false,true])await t.test(conflicted?'conflicted target':'clean target',async t=>{
  const f=seedCompletedRoutedPlan(t),{root,git}=f;
  installSemanticSourceFixture(t,{allowCheckpointChain:true});
  t.mock.method(policyProvider,'createIntegrationPolicyProvider',()=>({checks:[{checkId:'accepted-source',run:async candidateRoot=>{
   const values=fs.readFileSync(path.join(candidateRoot,'source.js'),'utf8');
   return{exitCode:values.includes('incoming')&&(!fs.existsSync(path.join(candidateRoot,'target.accepted'))||values.includes('target'))?0:1,summary:'Deterministic source-preservation fixture'};
  }}]}));
  const integration=createRoutedIntegrationService(root,f.intakeId);
  const ready=await integration.query();assert.equal(ready.status,'ready',ready.reasons.join('\n'));assert.deepEqual(ready.checkpointCommits,[f.checkpointCommit]);
  const planPath=path.join(root,f.planPath),original=fs.readFileSync(planPath);fs.appendFileSync(planPath,'\nChanged accepted intent\n');
  assert.equal((await integration.query()).status,'not-ready');await assert.rejects(integration.integrate({expectedFingerprint:ready.completionFingerprint}),/stale|changed|superseded/i);fs.writeFileSync(planPath,original);
  if(conflicted){git('switch','main');fs.writeFileSync(path.join(root,'source.js'),"module.exports = ['target'];\n");fs.writeFileSync(path.join(root,'target.accepted'),'accepted\n');git('add','source.js','target.accepted');git('commit','-m','target advances');git('switch',f.workBranch);}
  const targetBefore=git('rev-parse','main');let result=await integration.integrate({expectedFingerprint:ready.completionFingerprint});
  if(conflicted){assert.equal(result.status,'repair-required',result.reasons.join('\n'));assert.equal(git('rev-parse','main'),targetBefore);
   const request={expectedFingerprint:result.completionFingerprint,candidateId:result.candidate.candidateId};const repair=await integration.prepareRepair(request);assert.deepEqual(repair.policy.editablePaths,['source.js']);
   await assert.rejects(integration.applyRepair({...request,repairId:repair.repairId,patches:[{path:'unapproved.js',beforeSha256:'deleted',content:'outside'}]}),/source scope/);
   await integration.applyRepair({...request,repairId:repair.repairId,patches:[{path:'source.js',beforeSha256:repair.snapshot.editable['source.js'],content:"module.exports = ['incoming', 'target'];\n"}]});
   result=await integration.completeRepair({...request,repairId:repair.repairId});
  }
  assert.equal(result.status,'integration-complete',result.reasons.join('\n'));assert.equal(git('rev-parse','main'),result.candidate.candidateCommit);assert.equal(git('branch','--show-current'),f.workBranch);assert.equal(git('status','--porcelain'),'');
  assert.equal((await createRoutedIntegrationService(root,f.intakeId).query()).status,'integration-complete');assert.equal(fs.existsSync(path.join(root,'planning/phases')),false);
 });
});

test('approved no-plan Research checkpoints before candidate validation and advances through routed integration',async t=>{
 const {seedPreparedRoutedWorkIntake}=require('../support/work-intake-fixtures.cjs');
 const {root,intake,route,git}=seedPreparedRoutedWorkIntake(t,'research-prototype',{workRequest:'Compare bounded approaches',desiredOutcome:'Integrate accepted evidence only',knownConstraints:'No implementation Plan'});
 const {workPlanningKernel,workPlanningArtifactPath}=require('../../dist/main/workPlanning/workPlanningKernel.js');
 const {resolveWorkPlanningProfile}=require('../../dist/main/workPlanning/workPlanningProfiles.js');
 const {routedDevelopmentExecutionBindingPath}=require('../../dist/main/planExecution/routedDevelopmentExecutionBinding.js');
 const outcome={outcome:'no-implementation-plan-required',prototypeDisposition:'disposable',productionFollowUp:'none',evidence:['Bounded comparison complete'],decisionEnabled:'Stop investigation',successFailureResult:'Evidence threshold met',closureCondition:'Comparison complete'};
 const block='\n```champcity-research-outcome\n'+JSON.stringify(outcome)+'\n```\n';
 const sections={Evidence:outcome.evidence[0],Decisions:outcome.decisionEnabled,'Risks and Unresolved Questions':'Prototype remains non-production.','Question Hypothesis and Decision':'Which bounded approach is viable?',Alternatives:'Compare A and B.','Bounded Prototype and Evidence':'Disposable comparison only.','Success Failure and Findings':outcome.successFailureResult,'Output Classification':'Disposable prototype evidence.','Expiration and Closure':outcome.closureCondition,'Research Outcome':block};
 assert.deepEqual(Object.keys(sections),resolveWorkPlanningProfile('research-prototype').assessmentSections);
 let model=await workPlanningKernel.prepare(root,intake.intakeId,'assessment');const draft=path.join(root,model.submission.expectedDraftSlots[0].draftRelativePath);fs.mkdirSync(path.dirname(draft),{recursive:true});fs.writeFileSync(draft,'# Route Architect Assessment\n\n'+Object.entries(sections).map(([heading,value])=>`## ${heading}\n${value}`).join('\n\n'));
 model=await workPlanningKernel.get(root,intake.intakeId,'assessment');model=await workPlanningKernel.review(root,intake.intakeId,'assessment',{expectedRevision:model.artifact.artifactRevision,disposition:'Approved',notes:'Evidence accepted'});
 const targetBefore=git('rev-parse','main');let validationObserved=false;
 t.mock.method(policyProvider,'createIntegrationPolicyProvider',()=>({checks:[{checkId:'research-evidence',run:async()=>{validationObserved=true;assert.equal(git('rev-parse','main'),targetBefore,'target remains unchanged until validation passes');return{exitCode:0,summary:'Approved Research evidence retained'};}}]}));
 const integration=createRoutedIntegrationService(root,intake.intakeId),ready=await integration.query();
 assert.equal(ready.status,'ready',ready.reasons.join('\n'));assert.equal(ready.completionKind,'research');assert.match(ready.completionFingerprint,/^[a-f0-9]{64}$/);assert.deepEqual(ready.checkpointCommits,[]);assert.equal(ready.candidate,undefined);assert.equal(git('rev-parse','main'),targetBefore);
 const result=await integration.integrate({expectedFingerprint:ready.completionFingerprint});
 assert.equal(validationObserved,true);assert.equal(result.status,'integration-complete',result.reasons.join('\n'));assert.equal(result.completionKind,'research');assert.equal(result.candidate.completion.kind,'research');assert.equal(result.candidate.completion.completionId,model.artifact.identity.assessmentId);assert.equal(result.candidate.completion.revision,model.artifact.artifactRevision);assert.equal(result.candidate.completion.fingerprint,ready.completionFingerprint);assert.deepEqual(result.checkpointCommits,[result.candidate.incomingCommit]);
 assert.equal(git('rev-parse','main'),result.candidate.candidateCommit);assert.equal(git('branch','--show-current'),intake.branchBinding.workBranch);assert.equal(git('status','--porcelain'),'');assert.equal((await createRoutedIntegrationService(root,intake.intakeId).query()).status,'integration-complete');
 assert.equal(fs.existsSync(path.join(root,workPlanningArtifactPath(intake.intakeId,route.selection.decisionId,'plan'))),false);assert.equal(fs.existsSync(path.join(root,routedDevelopmentExecutionBindingPath(intake.intakeId))),false);assert.equal(fs.existsSync(path.join(root,'planning/phases')),false);assert.equal(fs.existsSync(path.join(root,'planning/work-intake/execution',intake.intakeId)),false);
});

test('changed Research completion retains a failed candidate until explicit abort',async t=>{
 const {seedPreparedRoutedWorkIntake}=require('../support/work-intake-fixtures.cjs');
 const {root,intake,git}=seedPreparedRoutedWorkIntake(t,'research-prototype',{workRequest:'Compare bounded approaches',desiredOutcome:'Retain failed integration evidence until explicit abort',knownConstraints:'No implementation Plan'});
 const {workPlanningKernel}=require('../../dist/main/workPlanning/workPlanningKernel.js');
 const {resolveWorkPlanningProfile}=require('../../dist/main/workPlanning/workPlanningProfiles.js');
 const {parseCanonicalMarkdownDocument,serializeCanonicalMarkdownDocument}=require('../../dist/shared/documents/canonicalMarkdown.js');
 const outcome={outcome:'no-implementation-plan-required',prototypeDisposition:'disposable',productionFollowUp:'none',evidence:['Bounded comparison complete'],decisionEnabled:'Stop investigation',successFailureResult:'Evidence threshold met',closureCondition:'Comparison complete'};
 const block='\n```champcity-research-outcome\n'+JSON.stringify(outcome)+'\n```\n';
 const sections={Evidence:outcome.evidence[0],Decisions:outcome.decisionEnabled,'Risks and Unresolved Questions':'Prototype remains non-production.','Question Hypothesis and Decision':'Which bounded approach is viable?',Alternatives:'Compare A and B.','Bounded Prototype and Evidence':'Disposable comparison only.','Success Failure and Findings':outcome.successFailureResult,'Output Classification':'Disposable prototype evidence.','Expiration and Closure':outcome.closureCondition,'Research Outcome':block};
 assert.deepEqual(Object.keys(sections),resolveWorkPlanningProfile('research-prototype').assessmentSections);
 let model=await workPlanningKernel.prepare(root,intake.intakeId,'assessment');
 const draft=path.join(root,model.submission.expectedDraftSlots[0].draftRelativePath);
 fs.mkdirSync(path.dirname(draft),{recursive:true});
 fs.writeFileSync(draft,'# Route Architect Assessment\n\n'+Object.entries(sections).map(([heading,value])=>`## ${heading}\n${value}`).join('\n\n'));
 model=await workPlanningKernel.get(root,intake.intakeId,'assessment');
 model=await workPlanningKernel.review(root,intake.intakeId,'assessment',{expectedRevision:model.artifact.artifactRevision,disposition:'Approved',notes:'Evidence accepted'});
 const assessmentPath=path.join(root,model.artifact.relativePath);
 const targetBefore=git('rev-parse','main');
 t.mock.method(policyProvider,'createIntegrationPolicyProvider',()=>({checks:[{checkId:'research-evidence',run:async()=>({exitCode:1,summary:'Deterministic retained-candidate validation failure'})}]}));
 const integration=createRoutedIntegrationService(root,intake.intakeId);
 const ready=await integration.query();
 const retained=await integration.integrate({expectedFingerprint:ready.completionFingerprint});
 assert.equal(retained.status,'repair-required',retained.reasons.join('\n'));
 assert.equal(retained.candidate.status,'validation-failed');
 assert.equal(git('rev-parse','main'),targetBefore,'failed validation leaves the target unchanged');
 const retainedCandidateId=retained.candidate.candidateId;
 const oldCompletion={...retained.candidate.completion};
 const assessment=parseCanonicalMarkdownDocument(fs.readFileSync(assessmentPath,'utf8'));
 fs.writeFileSync(assessmentPath,serializeCanonicalMarkdownDocument({...assessment.metadata,artifactRevision:assessment.metadata.artifactRevision+1},assessment.bodyMarkdown+'\nAdditional accepted comparison evidence.\n'));
 const changedAssessment=parseCanonicalMarkdownDocument(fs.readFileSync(assessmentPath,'utf8'));
 const changed=await integration.query();
 assert.equal(changedAssessment.metadata.artifactRevision,oldCompletion.revision+1);
 assert.notEqual(changed.completionFingerprint,oldCompletion.fingerprint);
 assert.equal(changed.status,'not-ready',changed.reasons.join('\n'));
 assert.equal(changed.candidate.candidateId,retainedCandidateId);
 assert.match(changed.reasons[0],/abort it before constructing a fresh candidate/i);
 assert.equal(git('rev-parse','main'),targetBefore,'changed completion and retained candidate leave the target unchanged');
 await assert.rejects(integration.integrate({expectedFingerprint:changed.completionFingerprint}),/abort it before constructing a fresh candidate/i);
 const afterAbort=await integration.abort({expectedFingerprint:changed.completionFingerprint,candidateId:retainedCandidateId});
 assert.equal(afterAbort.status,'ready',afterAbort.reasons.join('\n'));
 assert.equal(afterAbort.completionKind,'research');
 assert.equal(afterAbort.completionFingerprint,changed.completionFingerprint);
 assert.deepEqual(afterAbort.checkpointCommits,[]);
 assert.equal(afterAbort.candidate,undefined);
 assert.equal(git('rev-parse','main'),targetBefore,'abort preserves the target while the changed completion becomes eligible');
});
