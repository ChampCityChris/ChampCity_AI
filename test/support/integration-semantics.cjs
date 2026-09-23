// Semantic scenario fixture: real isolated Git data, without the separately tested source-control receipt stack.
const fs=require('node:fs');
const cp=require('node:child_process');
const sourceModule=require('../../dist/main/sourceControl/sourceControlService.js');
const branchModule=require('../../dist/main/workIntake/workIntakeBranchService.js');
const integration=require('../../dist/main/agentHarness/repository/integrationGit.js');
const repair=require('../../dist/main/agentHarness/repository/integrationRepairGit.js');
function installSemanticSourceFixture(t, { verifyCheckpoints = false, allowCheckpointChain = false } = {}){
 const git=(root,...args)=>cp.execFileSync('git',['-c','core.longpaths=true',...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 const branchHeads=new Map(),histories=new Map(),statuses=new Map();
 if (!verifyCheckpoints) t.mock.method(branchModule,'createWorkIntakeBranchService',({repositoryRoot:root})=>({verify:async binding=>{
  if(!allowCheckpointChain){if(git(root,'branch','--show-current')!==binding.workBranch||git(root,'rev-parse','HEAD')!==binding.currentHead)throw Error('Fixture branch changed');return binding;}
  if(!branchHeads.has(root))branchHeads.set(root,git(root,'rev-parse',binding.workBranch));
  return{...binding,currentHead:branchHeads.get(root)};
 }}));
 t.mock.method(sourceModule,'createSourceControlService',({repositoryRoot:root,repositoryId})=>{
  const run=async(operation,fn)=>{const receipt={repositoryId,operation,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),before:null,after:null};try{return{ok:true,result:await fn(),receipt}}catch(error){return{ok:false,error:{message:error.message},receipt}}};
  const result={status:()=>run('status',()=>{if(!allowCheckpointChain)return{clean:git(root,'status','--porcelain')===''};if(!statuses.has(root))statuses.set(root,git(root,'status','--porcelain')==='');return{clean:statuses.get(root)}}),fetch:remote=>run('fetch',()=>git(root,'fetch',remote))};
  result.changedFiles=()=>run('changed-files',()=>{const output=cp.execFileSync('git',['-c','core.longpaths=true','status','--porcelain=v1','-z','--untracked-files=all'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});return output.split('\0').filter(Boolean).map(entry=>({path:entry.slice(3),indexStatus:entry[0],worktreeStatus:entry[1]}))});
  result.stage=(paths,options)=>run('stage',()=>{git(root,'add',...(options?.includeIgnored?['--force']:[]),'--',...paths);return{stagedPaths:paths}});
  result.diff=()=>run('diff',()=>({unstaged:git(root,'diff','--no-ext-diff','--','.'),staged:git(root,'diff','--cached','--no-ext-diff','--','.')}));
  result.commit=message=>{const startedAt=new Date().toISOString(),before={branch:git(root,'branch','--show-current'),commit:git(root,'rev-parse','HEAD')};cp.execFileSync('git',['-c','core.longpaths=true','commit','--file','-'],{cwd:root,input:message,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true});const commit=git(root,'rev-parse','HEAD');branchHeads.set(root,commit);statuses.set(root,true);return Promise.resolve({ok:true,result:{commit},receipt:{repositoryId,operation:'commit',startedAt,completedAt:new Date().toISOString(),before,after:{branch:git(root,'branch','--show-current'),commit}}})};
  for(const [method,fn] of Object.entries({integrationTarget:integration.inspectIntegrationTarget,createIntegration:integration.createIntegrationCheckout,inspectIntegration:integration.inspectIntegrationCheckout,mergeIntegration:integration.mergeIntegrationCheckout,advanceIntegration:integration.advanceIntegrationTarget,abortIntegration:integration.abortIntegrationCheckout,integrationRepairDiffs:repair.integrationRepairDiffs,integrationRepairChangedPaths:repair.integrationRepairChangedPaths,commitIntegrationRepair:repair.commitIntegrationRepair}))result[method]=input=>run(method,()=>fn(root,input));
  result.snapshotIntegrationRepair=(id,paths)=>run('snapshot',()=>repair.snapshotIntegrationRepair(root,id,paths));
  // These fixture mechanics supply real candidate bytes. Production Git safety has separate conformance proof.
  const inspect=id=>{const checkout=integration.integrationPaths(root,id).checkout;const conflicts=git(checkout,'diff','--name-only','--diff-filter=U');return{commit:git(checkout,'rev-parse','HEAD'),conflictingPaths:conflicts?conflicts.split(/\r?\n/):[],clean:git(checkout,'status','--porcelain')===''}};
  result.integrationTarget=input=>run('target',()=>{const incomingCommit=git(root,'rev-parse',input.incomingBranch),localTargetCommit=git(root,'rev-parse',input.targetBranch),targetCommit=input.remote?git(root,'rev-parse',input.remote+'/'+input.targetBranch):localTargetCommit;return{incomingCommit,targetCommit,localTargetCommit,mergeBase:git(root,'merge-base',incomingCommit,targetCommit)}});
  result.createIntegration=input=>run('create',()=>{const paths=integration.integrationPaths(root,input.candidateId);fs.mkdirSync(paths.base,{recursive:true});git(root,'worktree','add','-b',paths.branch,paths.checkout,input.targetCommit);return{branch:paths.branch,commit:input.targetCommit}});
  result.inspectIntegration=id=>run('inspect',()=>inspect(id));
  result.mergeIntegration=input=>run('merge',()=>{const checkout=integration.integrationPaths(root,input.candidateId).checkout;try{git(checkout,'merge','--no-edit',input.incomingCommit)}catch(error){if(!inspect(input.candidateId).conflictingPaths.length)throw error}return inspect(input.candidateId)});
  result.advanceIntegration=input=>run('advance',()=>{if(git(root,'rev-parse',input.targetBranch)!==input.localTargetCommit||git(root,'rev-parse',input.incomingBranch)!==input.incomingCommit)throw Error('Integration refs changed');git(root,'update-ref','refs/heads/'+input.targetBranch,input.candidateCommit,input.localTargetCommit);return{commit:input.candidateCommit}});
  result.abortIntegration=id=>run('abort',()=>{const paths=integration.integrationPaths(root,id);if(fs.existsSync(paths.checkout))git(root,'worktree','remove','--force',paths.checkout);const branch=git(root,'branch','--list',paths.branch);if(branch)git(root,'branch','-D',paths.branch);return{cleaned:true}});
  result.branches=()=>run('branches',()=>({currentBranch:git(root,'branch','--show-current'),head:git(root,'rev-parse','HEAD')}));
  result.history=(input={})=>run('history',()=>{const key=JSON.stringify([root,input]);if(allowCheckpointChain&&histories.has(key))return histories.get(key);const commits=git(root,'log','-'+(input.maxCount??100),'--format=%H%x09%P%x09%s',input.ref??'HEAD').split('\n').map(line=>{const [commit,parents,subject]=line.split('\t');return{commit,parents:parents?parents.split(' '):[],subject}});let ancestry;if(input.ancestor){let isAncestor=true;try{git(root,'merge-base','--is-ancestor',input.ancestor,input.descendant)}catch{isAncestor=false}ancestry={isAncestor}}const value={commits,ancestry};if(allowCheckpointChain)histories.set(key,value);return value});
  result.historyWithMessages=(input={})=>run('history-with-messages',()=>{const key=JSON.stringify(['messages',root,input]);if(allowCheckpointChain&&histories.has(key))return histories.get(key);const fields=git(root,'log','-'+(input.maxCount??100),'-z','--format=%H%x00%P%x00%s%x00%B',input.ref??'HEAD').split('\0');if(fields.at(-1)==='')fields.pop();const commits=[];for(let index=0;index<fields.length;index+=4)commits.push({commit:fields[index],parents:fields[index+1]?fields[index+1].split(' '):[],subject:fields[index+2],message:fields[index+3]});const value={commits};if(allowCheckpointChain)histories.set(key,value);return value});
  result.push=input=>run('push',()=>{git(root,'push',input.remote,input.branch);return{pushed:true}});
  result.readCommitMessage=commit=>run('commit-message',()=>git(root,'show','--no-patch','--format=%B',commit));
  return result;
 });
}
module.exports={installSemanticSourceFixture};
