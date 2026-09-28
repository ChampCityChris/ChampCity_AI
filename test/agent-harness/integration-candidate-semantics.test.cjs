require("../support/integration-scenarios.cjs").registerIntegrationScenarios("isolated integration candidates gate target advancement on current Plan and post-merge proof", ["unchanged","advanced-clean","validation-mutates","stale-target","remote-target","repair-many","repair-empty"], { sourceFixture: true });

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const test=require('node:test');
const {createIntegrationCandidateService}=require('../../dist/main/planExecution/integrationCandidateService.js');
const {integrationPaths}=require('../../dist/main/agentHarness/repository/integrationGit.js');

test('exact Workflow candidate integrates from a managed linked Dev checkout without WorkIntake identity',async t=>{
 require('../support/execution-metrics.cjs').measureExecution(t,'workflow-exact-integration-linked-dev');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'champcity-wf-integration-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const primary=path.join(temp,'repository'),dev=path.join(temp,'Dev'),incomingRoot=path.join(temp,'workflow');fs.mkdirSync(primary);
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 git(primary,'init','-b','main');git(primary,'config','user.email','fixture@example.invalid');git(primary,'config','user.name','Fixture');
 fs.writeFileSync(path.join(primary,'README.md'),'baseline\n');git(primary,'add','README.md');git(primary,'commit','-m','baseline');
 const base=git(primary,'rev-parse','HEAD');git(primary,'branch','dev',base);git(primary,'worktree','add',dev,'dev');
 const workflowId='11111111-1111-4111-8111-111111111111',branch=`workflow/${workflowId}`;
 git(primary,'worktree','add','-b',branch,incomingRoot,base);fs.writeFileSync(path.join(incomingRoot,'feature.txt'),'accepted workflow source\n');
 git(incomingRoot,'add','feature.txt');git(incomingRoot,'commit','-m','workflow change');
 const currentHead=git(incomingRoot,'rev-parse','HEAD');
 const binding={workflowId,repositoryId:'fixture-repository',baseBranch:'dev',baseCommit:base,workBranch:branch,currentHead};
 const service=createIntegrationCandidateService({repositoryRoot:dev,repositoryId:binding.repositoryId,requiredTargetBranch:'dev',
  load:async()=>({binding,completion:{kind:'workflow',workflowId,completionId:workflowId,revision:3,fingerprint:'a'.repeat(64)}}),
  verifyWorkflowBinding:async value=>value,
  checks:[{checkId:'fixture-source',run:async candidateRoot=>({exitCode:fs.readFileSync(path.join(candidateRoot,'feature.txt'),'utf8').includes('accepted')?0:1,summary:'Workflow candidate source check'})}]});
 const candidate=await service.create();
 assert.equal(candidate.status,'validated');assert.equal(candidate.workflowId,workflowId);assert.equal('intakeId' in candidate,false);
 const common=(await require('../../dist/main/agentHarness/repository/integrationGit.js').integrationCommonDirectory(dev));
 assert.equal(path.dirname(path.dirname(integrationPaths(dev,candidate.candidateId).base)),common);
 const integrated=await service.advance(candidate.candidateId);
 assert.equal(integrated.status,'integrated');assert.equal(git(dev,'rev-parse','refs/heads/dev'),integrated.targetAfterRevisionId);
 assert.equal(git(dev,'rev-parse','HEAD'),integrated.targetAfterRevisionId);
});
