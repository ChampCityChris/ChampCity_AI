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
