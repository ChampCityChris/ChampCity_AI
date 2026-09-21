const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const test=require('node:test');
const {createIntegrationRepairController}=require('../../dist/main/planExecution/integrationRepairService.js');
const {integrationPaths}=require('../../dist/main/agentHarness/repository/integrationGit.js');
const {integrationSourceDigest:digest}=require('../../dist/main/agentHarness/repository/integrationRepairGit.js');
const {writeDoc}=require('../support/canonical-markdown-fixtures.cjs');

test('Integration Repair controller preserves retry ownership patch disposition intent and Operator decisions without process setup',async t=>{
 require('../support/execution-metrics.cjs').measureExecution(t,'repair-controller');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'champcity-repair-controller-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'.git'));
 let sequence=0;
 function fixture(){
  const candidateId=(++sequence).toString(16).padStart(64,'0'),paths=integrationPaths(root,candidateId);
  fs.mkdirSync(paths.checkout,{recursive:true});fs.writeFileSync(path.join(paths.checkout,'source.txt'),'incoming accepted\ntarget accepted\n');
  writeDoc(root,'planning/intake.md','work-intake','Pending',{identity:{intakeId:'fixture'}});
  writeDoc(root,'planning/plan.md','work-planning-plan','Approved',{identity:{intakeId:'fixture',planId:'PLAN01'}});
  let candidate={candidateId,intakeId:'fixture',planId:'PLAN01',planRevision:1,status:'validation-failed',candidateCommit:'a'.repeat(40),baseCommit:'b'.repeat(40),targetCommit:'a'.repeat(40),incomingCommit:'c'.repeat(40),mergeBase:'b'.repeat(40),conflictingPaths:[],validation:[],receipts:[],message:'fixture validation failed'};
  let commits=0,pass=false,commitFailure=null;
  const policy={sources:[{role:'intake',path:'planning/intake.md'},{role:'plan',path:'planning/plan.md'}],editablePaths:['source.txt'],policySha256:'f'.repeat(64)};
  const ok=result=>({ok:true,result,receipt:{operation:'fixture',before:null,after:null}});
  const owner={root,read:id=>{assert.equal(id,candidateId);return candidate},persist:record=>{candidate=record},current:async()=>{},exclusive:async fn=>fn(),policy:async()=>structuredClone(policy),
   source:{snapshotIntegrationRepair:async()=>ok({head:candidate.candidateCommit,mergeHead:null,indexDigest:'index',changed:{},editable:{'source.txt':digest(fs.readFileSync(path.join(paths.checkout,'source.txt'),'utf8'))},unmerged:[]}),integrationRepairDiffs:async()=>ok({incomingDiff:'incoming accepted',targetDiff:'target accepted'}),commitIntegrationRepair:async()=>{commits++;return commitFailure?{ok:false,error:{message:commitFailure},receipt:{operation:'fixture'}}:ok({commit:String(commits).repeat(40)})}},
   validate:async record=>{record.status=pass?'validated':'validation-failed';record.validation=[{checkId:'source',exitCode:pass?0:1,summary:'deterministic fixture'}];return record}};
  return{controller:createIntegrationRepairController(owner),candidateId,paths,policy,get candidate(){return candidate},get commits(){return commits},setPass:()=>{pass=true},setFailure:value=>{commitFailure=value}};
 }
 const f=fixture(),api=f.controller,id=f.candidateId;
 const first=await api.prepareRepair(id);assert.equal(first.repairId,'REPAIR01');assert.equal((await api.prepareRepair(id)).repairId,'REPAIR01');
 await assert.rejects(api.applyRepairPatch(id,'REPAIR01',[{path:'unrelated.txt',beforeSha256:'deleted',content:'outside'}]),/source scope/);
 await assert.rejects(api.applyRepairPatch(id,'REPAIR01',[{path:'source.txt',beforeSha256:'bad',content:'wrong basis'}]),/changed|digest|source/i);
 const planFile=path.join(root,'planning/plan.md'),before=fs.readFileSync(planFile);fs.appendFileSync(planFile,'\nChanged intent\n');
 await assert.rejects(api.completeRepair(id,'REPAIR01'),/governing intent changed/);assert.equal(f.commits,0);fs.writeFileSync(planFile,before);
 f.policy.policySha256='e'.repeat(64);await assert.rejects(api.completeRepair(id,'REPAIR01'),/policy changed/);f.policy.policySha256='f'.repeat(64);
 await api.applyRepairPatch(id,'REPAIR01',[{path:'source.txt',beforeSha256:first.snapshot.editable['source.txt'],content:'incoming and target preserved\n'}]);
 f.setFailure('Worker changed Git state');let result=await api.completeRepair(id,'REPAIR01');assert.match(result.attempt.message,/Worker changed Git/);assert.equal(result.attempt.status,'prepared');
 f.setFailure(null);result=await api.completeRepair(id,'REPAIR01');assert.equal(result.attempt.status,'validation-failed');const firstCommit=result.attempt.commit;
 const second=await api.prepareRepair(id);assert.equal(second.repairId,'REPAIR02');assert.equal(api.readRepair(id,'REPAIR01').commit,firstCommit);
 await assert.rejects(api.completeRepair(id,'REPAIR01'),/active attempt/);f.setPass();result=await api.completeRepair(id,'REPAIR02');assert.equal(result.attempt.status,'validated');assert.equal(result.candidate.status,'validated');
 const decision=fixture(),attempt=await decision.controller.prepareRepair(decision.candidateId);
 const stopped=await decision.controller.requestOperatorDecision(decision.candidateId,attempt.repairId,'Accepted interfaces require incompatible semantics.');assert.equal(stopped.candidate.status,'operator-decision');
 await assert.rejects(decision.controller.completeRepair(decision.candidateId,attempt.repairId),/active attempt/);assert.equal(decision.commits,0);
 const bound=fixture();bound.candidate.repairAttemptCount=10;await assert.rejects(bound.controller.prepareRepair(bound.candidateId),/attempt bound/);
});
