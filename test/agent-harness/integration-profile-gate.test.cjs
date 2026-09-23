const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),test=require('node:test');
const {applyValidationLaneFixtureContract,validationFixture}=require('../support/validation-fixture.cjs');
const {createIntegrationPolicyProvider}=require('../../dist/main/planExecution/integrationPolicyProvider.js');
const {integrationPaths}=require('../../dist/main/agentHarness/repository/integrationGit.js');
const {parseIntegrationPolicy}=require('../../dist/shared/integrationPolicyContracts.js');

test('candidate profile uses immutable target toolkit ownership and revisions through repair revalidation',async t=>{
 const configured=require('../../.champcity/integration-policy.json');assert.equal(configured.checks.length,1);assert.equal(configured.checks[0].runner.kind,'validation-profile');
 const {root,catalog,save}=validationFixture(t,{'test/source.test.cjs':{source:"require('node:test')('accepted source',()=>require('node:assert/strict').equal(require('../dist/value.js'),1));",requiresBuild:true,lane:'integration'}});
 catalog.capabilities[0].sourcePatterns=['.champcity/**','scripts/**','src/**','test/**','validation/**'];save();
 const profiles=require('../../validation/profiles.json');const fixtureProfiles=structuredClone(profiles);for(const profile of Object.values(fixtureProfiles.profiles))profile.requiredCapabilities=['fixture'];fs.writeFileSync(path.join(root,'validation/profiles.json'),JSON.stringify(fixtureProfiles));
 fs.mkdirSync(path.join(root,'scripts/validation'),{recursive:true});for(const name of ['affected','authority','build','catalog-schema','catalog','child-cleanup','executor','environment','planner','process','profile-runner','scheduler','telemetry'])fs.copyFileSync(path.join(__dirname,'../../scripts/validation',name+'.cjs'),path.join(root,'scripts/validation',name+'.cjs'));
 fs.mkdirSync(path.join(root,'src'));fs.writeFileSync(path.join(root,'src/value.js'),'module.exports=0;');
 fs.writeFileSync(path.join(root,'.gitignore'),'/dist/\n/build-count.txt\n');
 fs.writeFileSync(path.join(root,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('src/value.js','dist/value.js');fs.appendFileSync('build-count.txt','x');");
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({private:true,scripts:{build:'node build.cjs',typecheck:'node -e "process.exit(77)"'}}));
 fs.mkdirSync(path.join(root,'.champcity'));const policy={schemaVersion:1,checks:[{checkId:'gate',lane:'integration',runner:{kind:'validation-profile',profile:'integration-gate',timeoutMs:30000}}],requiredIntegrationChecks:['gate']};
 assert.deepEqual(parseIntegrationPolicy(policy),policy);for(const runner of [{kind:'validation-profile',profile:'unknown',timeoutMs:20},{kind:'validation-profile',profile:'integration-gate',timeoutMs:20,files:['test/source.test.cjs']},{kind:'validation-profile',profile:'integration-gate',timeoutMs:20,command:'node injected'}])assert.throws(()=>parseIntegrationPolicy({...policy,checks:[{...policy.checks[0],runner}]}));
 fs.writeFileSync(path.join(root,'.champcity/integration-policy.json'),JSON.stringify(policy));
 const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');git('add','.');git('commit','-m','target authority');const target=git('rev-parse','HEAD');
 git('switch','-c','incoming');fs.writeFileSync(path.join(root,'src/value.js'),'module.exports=1;');git('add','.');git('commit','-m','incoming source');const incoming=git('rev-parse','HEAD');
 const candidateId='e'.repeat(64),paths=integrationPaths(root,candidateId);fs.mkdirSync(paths.base,{recursive:true});git('worktree','add','-b',paths.branch,paths.checkout,incoming);
 const candidateGit=(...args)=>cp.execFileSync('git',args,{cwd:paths.checkout,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 const context=()=>Object.freeze({repositoryId:'fixture',targetCommit:target,incomingCommit:incoming,candidateCommit:candidateGit('rev-parse','HEAD'),candidateId,targetBranch:'main',platform:process.platform});
 const resolved=await createIntegrationPolicyProvider(root).validationPolicy.resolve(target);
 const run=()=>resolved.checks[0].run(paths.checkout,context());
 const first=await run();assert.equal(first.exitCode,0,first.summary);assert.deepEqual(first.profileEvidence.selectedTests,['test/source.test.cjs']);assert.equal(first.profileEvidence.candidateCommit,incoming);for(const lane of ['performance-soak','desktop-platform','packaging'])assert.ok(first.profileEvidence.excludedLanes.includes(lane));assert.deepEqual(first.profileEvidence.telemetry.selectedLanes,['integration']);assert.equal(first.profileEvidence.telemetry.counts.pass,1);assert.equal(first.profileEvidence.telemetry.budget.status,'within-target');assert.equal(fs.readFileSync(path.join(paths.checkout,'build-count.txt'),'utf8'),'x');
 // Incoming edits can propose future policy/catalog changes but cannot replace their current judge.
 fs.writeFileSync(path.join(paths.checkout,'scripts/validation/profile-runner.cjs'),"throw Error('incoming runner must never execute');");
 const futureProfiles=structuredClone(fixtureProfiles);futureProfiles.profiles['integration-gate'].lanes=['static'];futureProfiles.profiles['integration-gate'].requiresBuild=false;fs.writeFileSync(path.join(paths.checkout,'validation/profiles.json'),JSON.stringify(futureProfiles));
 const weakened=structuredClone(catalog);applyValidationLaneFixtureContract(weakened.tests[0],'performance-soak');weakened.tests[0].execution.requiresBuild=false;fs.writeFileSync(path.join(paths.checkout,'validation/capability-map.json'),JSON.stringify(weakened));
 candidateGit('add','.');candidateGit('commit','-m','proposed weaker future configuration');
 const still=await run();assert.equal(still.exitCode,0,still.summary);assert.deepEqual(still.profileEvidence.selectedTests,first.profileEvidence.selectedTests);assert.equal(still.profileEvidence.authoritySha256,first.profileEvidence.authoritySha256);assert.equal(fs.readFileSync(path.join(paths.checkout,'build-count.txt'),'utf8'),'xx');
 fs.writeFileSync(path.join(paths.checkout,'src/value.js'),'module.exports=2;');candidateGit('add','.');candidateGit('commit','-m','invalid repair source');
 const failed=await run();assert.equal(failed.exitCode,1);assert.equal(failed.profileEvidence.status,'failed');
 const previous=context();fs.writeFileSync(path.join(paths.checkout,'src/value.js'),'module.exports=1;');candidateGit('add','.');candidateGit('commit','-m','bounded repair source');
 await assert.rejects(resolved.checks[0].run(paths.checkout,previous),/revision changed/);
 const repaired=await run();assert.equal(repaired.exitCode,0,repaired.summary);assert.equal(repaired.profileEvidence.incomingCommit,incoming);assert.notEqual(repaired.profileEvidence.candidateCommit,failed.profileEvidence.candidateCommit);assert.equal(repaired.profileEvidence.authoritySha256,first.profileEvidence.authoritySha256);
 fs.mkdirSync(path.join(paths.checkout,'unmapped'));fs.writeFileSync(path.join(paths.checkout,'unmapped/source.js'),'module.exports=1;');candidateGit('add','.');candidateGit('commit','-m','unclassified source');
 const unknown=await run();assert.notEqual(unknown.exitCode,0);assert.match(unknown.summary,/Unclassified/);
 assert.equal(git('rev-parse','main'),target);assert.ok(!fs.readdirSync(paths.base).some(name=>name.startsWith('validation-runtime-')));
 t.diagnostic(JSON.stringify({firstGateMs:first.profileEvidence.durationMs,repairGateMs:repaired.profileEvidence.durationMs,selectedTests:first.profileEvidence.selectedTests}));
});
require('../support/integration-scenarios.cjs').registerIntegrationScenarios('candidate orchestration supplies frozen exact runner context',['unchanged','validation-mutates'],{sourceFixture:true});

require('../support/integration-scenarios.cjs').registerIntegrationScenarios('actual candidate profile receipts control target eligibility',['unchanged','validation-profile-fails'],{
 sourceFixture:true,
 prepareProfile(root,scenario){
  const {loadCatalog}=require('../../scripts/validation/catalog.cjs');
  const template=loadCatalog().tests.find(t=>t.testPath==='test/validation/capability-map.test.cjs');
  const files=[['integration','test/gate.test.cjs'],['desktop-platform','test/desktop.test.cjs'],['packaging','test/packaging.test.cjs'],['performance-soak','test/performance.test.cjs']];
  fs.mkdirSync(path.join(root,'test'));fs.mkdirSync(path.join(root,'validation'));fs.mkdirSync(path.join(root,'scripts/validation'),{recursive:true});
  const tests=files.map(([lane,testPath],index)=>{fs.writeFileSync(path.join(root,testPath),"require('node:test')('candidate bytes',()=>{const assert=require('node:assert/strict');assert.match(require('node:fs').readFileSync('dist/source.txt','utf8'),/accepted/);"+(scenario==='validation-profile-fails'?"assert.fail('fixture regression');":"")+"});");const record={...structuredClone(template),testPath,behaviorCoverage:[{capabilityId:'fixture',behaviorId:'case-'+index,proofRole:'primary',proofLocator:'candidate bytes'}]};applyValidationLaneFixtureContract(record,lane);record.execution.requiresBuild=true;return record;}).sort((a,b)=>a.testPath.localeCompare(b.testPath));
  const catalog={schemaVersion:4,capabilities:[{capabilityId:'fixture',description:'candidate fixture',sourcePatterns:['*.txt'],dependsOn:[],behaviors:files.map((_,i)=>({behaviorId:'case-'+i,description:'owned fixture proof'}))}],tests};
  fs.writeFileSync(path.join(root,'validation/capability-map.json'),JSON.stringify(catalog));
  const profiles=structuredClone(require('../../validation/profiles.json'));for(const profile of Object.values(profiles.profiles))profile.requiredCapabilities=['fixture'];fs.writeFileSync(path.join(root,'validation/profiles.json'),JSON.stringify(profiles));
  for(const name of ['affected','authority','build','catalog-schema','catalog','child-cleanup','executor','environment','planner','process','profile-runner','scheduler','telemetry'])fs.copyFileSync(path.join(__dirname,'../../scripts/validation',name+'.cjs'),path.join(root,'scripts/validation',name+'.cjs'));
  fs.writeFileSync(path.join(root,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('incoming.txt','dist/source.txt');fs.appendFileSync('build-count.txt','x');");
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({private:true,scripts:{build:'node build.cjs',typecheck:'node -e "process.exit(77)"'}}));
  fs.appendFileSync(path.join(root,'.gitignore'),'/dist/\n/build-count.txt\n');
  fs.writeFileSync(path.join(root,'.champcity/integration-policy.json'),JSON.stringify({schemaVersion:1,checks:[{checkId:'gate',lane:'integration',runner:{kind:'validation-profile',profile:'integration-gate',timeoutMs:30000}}],requiredIntegrationChecks:['gate']}));
 },
 assertProfile(candidate,scenario){
  assert.deepEqual(candidate.requiredChecks,['gate']);assert.equal(candidate.validation.length,1);
  const proof=candidate.validation[0].profileEvidence;assert.equal(proof.profileId,'integration-gate');assert.deepEqual(proof.selectedTests,['test/gate.test.cjs']);
  for(const lane of ['desktop-platform','packaging','performance-soak'])assert.ok(proof.excludedLanes.includes(lane));
  assert.equal(proof.status,scenario==='unchanged'?'passed':'failed');assert.equal(proof.telemetry.counts[scenario==='unchanged'?'pass':'fail'],1);
 }
});
