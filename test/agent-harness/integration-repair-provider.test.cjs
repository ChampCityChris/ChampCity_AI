const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),test=require('node:test');
const {createIntegrationRepairPolicyProvider,deriveIntegrationRepairEditablePaths:derive}=require('../../dist/main/planExecution/integrationRepairPolicyProvider.js');
const {workIntakeBranchName}=require('../../dist/main/workIntake/workIntakeBranchService.js');
const {projectPlanExecution}=require('../../dist/main/planExecution/planExecutor.js');
const {integrationPaths}=require('../../dist/main/agentHarness/repository/integrationGit.js');
const {writeDoc}=require('../support/canonical-markdown-fixtures.cjs');

test('real Integration Repair provider binds immutable policy changed paths ownership and governing bytes',async t=>{
 require('../support/execution-metrics.cjs').measureExecution(t,'repair-provider');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'champcity-repair-provider-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');
 fs.mkdirSync(path.join(root,'.champcity'));fs.mkdirSync(path.join(root,'src'));
 fs.writeFileSync(path.join(root,'.gitignore'),'/planning/\n');fs.writeFileSync(path.join(root,'src/source.txt'),'base\n');fs.writeFileSync(path.join(root,'architecture.md'),'# Accepted architecture\n');
 const policy={schemaVersion:1,checks:[{checkId:'source',lane:'integration',runner:{kind:'npm-script',script:'verify',timeoutMs:10000}}],requiredIntegrationChecks:['source'],repair:{allowedEditableRoots:['src'],protectedPaths:['src/protected'],sources:[{role:'architecture',path:'architecture.md'}]}};
 fs.writeFileSync(path.join(root,'.champcity/integration-policy.json'),JSON.stringify(policy));git('add','.');git('commit','-m','base');const base=git('rev-parse','HEAD');
 const branch=workIntakeBranchName('fixture');git('switch','-c',branch);fs.writeFileSync(path.join(root,'src/source.txt'),'incoming\n');git('add','.');git('commit','-m','incoming');const incoming=git('rev-parse','HEAD');
 const candidateId='d'.repeat(64),paths=integrationPaths(root,candidateId);fs.mkdirSync(paths.base,{recursive:true});git('worktree','add','-b',paths.branch,paths.checkout,incoming);
 const binding={repositoryId:'fixture',intakeId:'fixture',baseBranch:'main',baseCommit:base,workBranch:branch,currentHead:incoming};
 const evidence={planRevision:1,fresh:true,blockers:[],evidencePaths:['accepted.md'],criteria:[{criterion:'Accepted',status:'passed',evidencePaths:['accepted.md']}]};
 const plan={planId:'PLAN01',planRevision:1,approved:true,fresh:true,blockers:[],structure:{topology:'direct',topologyRationale:'Bounded fixture',acceptanceCriteria:['Accepted'],workItems:[{workItemId:'WI01',title:'Source',purpose:'Bounded',dependsOn:[],acceptanceCriteria:['Accepted']}]},workItems:[{...evidence,workItemId:'WI01',stage:'complete'}],phases:[],planEvidence:evidence};
 writeDoc(root,'planning/intake.md','work-intake','Pending',{identity:{intakeId:'fixture'}});writeDoc(root,'planning/plan.md','work-planning-plan','Approved',{identity:{intakeId:'fixture',planId:'PLAN01'}});
 const record={repositoryId:'fixture',intakeId:'fixture',incomingCommit:incoming,incomingBranch:branch,targetBranch:'main',baseCommit:base,planId:'PLAN01',planRevision:1,planFingerprint:projectPlanExecution(plan).fingerprint,targetCommit:base,mergeBase:base,candidateId,conflictingPaths:[]};
 const provider=createIntegrationRepairPolicyProvider({repositoryRoot:root,repositoryId:'fixture',load:async()=>({binding,plan,intakePath:'planning/intake.md',planPath:'planning/plan.md'})}).repairPolicy;
 const resolved=await provider(record);assert.deepEqual(resolved.editablePaths,['src/source.txt']);assert.match(resolved.policySha256,/^[a-f0-9]{64}$/);
 const sources=resolved.sources;
 for(const conflict of ['outside.txt','src/protected/file.txt','architecture.md','planning/intake.md','.champcity/integration-policy.json','src/dist/output.js'])assert.throws(()=>derive(policy.repair,sources,[conflict],[],['src/source.txt']),/outside.*boundary/);
 assert.throws(()=>derive(policy.repair,sources,[],[],[]),/1–32 paths/);assert.throws(()=>derive(policy.repair,sources,[],[],Array.from({length:33},(_,i)=>'src/'+i+'.txt')),/1–32 paths/);
 const governing=path.join(paths.checkout,'architecture.md'),bytes=fs.readFileSync(governing);fs.appendFileSync(governing,'changed');await assert.rejects(provider(record),/evidence changed/);fs.writeFileSync(governing,bytes);
 const config=path.join(paths.checkout,'.champcity/integration-policy.json'),policyBytes=fs.readFileSync(config);fs.appendFileSync(config,'\n');await assert.rejects(provider(record),/policy changed/);fs.writeFileSync(config,policyBytes);
 const recreated=createIntegrationRepairPolicyProvider({repositoryRoot:root,repositoryId:'fixture',load:async()=>({binding,plan,intakePath:'planning/intake.md',planPath:'planning/plan.md'})}).repairPolicy;
 assert.deepEqual(await recreated(record),resolved);
 // Ownership is verified by the real changed-path/inspection adapters, independently of the supplied record ID.
 git('worktree','remove','--force',paths.checkout);fs.mkdirSync(paths.checkout,{recursive:true});fs.cpSync(path.join(root,'.champcity'),path.join(paths.checkout,'.champcity'),{recursive:true});fs.copyFileSync(path.join(root,'architecture.md'),path.join(paths.checkout,'architecture.md'));
 await assert.rejects(provider(record),/diff\/conflict evidence|ownership|checkout/);
});
