const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {tempWorkspace}=require('./canonical-markdown-fixtures.cjs');
const {parseCanonicalMarkdownDocument:parse,serializeCanonicalMarkdownDocument:serialize}=require('../../dist/shared/documents/canonicalMarkdown.js');
const {checkpointIdFor}=require('../../dist/main/planExecution/workItemCheckpointReceipt.js');
const boundary=require('../fixtures/routed-completed/boundary.cjs');
function seedCompletedRoutedPlan(t){
 const root=tempWorkspace('champcity-completed-route-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');
 fs.writeFileSync(path.join(root,'.gitignore'),'/planning/\n');fs.writeFileSync(path.join(root,'source.js'),"module.exports = ['base'];\n");
 fs.writeFileSync(path.join(root,'verify.cjs'),"const fs=require('node:fs');const values=require('./source.js');if(!values.includes('incoming')||(fs.existsSync('target.accepted')&&!values.includes('target')))process.exit(1);\n");
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({private:true,scripts:{verify:'node verify.cjs'}}));
 fs.writeFileSync(path.join(root,'.champcity/integration-policy.json'),JSON.stringify({schemaVersion:1,checks:[{checkId:'accepted-source',lane:'integration',runner:{kind:'npm-script',script:'verify',timeoutMs:15000}}],requiredIntegrationChecks:['accepted-source'],repair:{allowedEditableRoots:['source.js'],sources:[]}}));
 git('add','.');git('commit','-m','fixture baseline');const base=git('rev-parse','HEAD');
 const documents=new Map();
 const hydrate=value=>typeof value==='string'?value.replaceAll('<PROJECT_REPO>',root).replaceAll('<BASE_COMMIT>',base):Array.isArray(value)?value.map(hydrate):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,hydrate(v)])):value;
 for(const {fixtureFile,documentPath} of boundary.documents)documents.set(documentPath,hydrate(parse(fs.readFileSync(path.join(__dirname,'../fixtures/routed-completed',fixtureFile),'utf8'))));
 const written=new Set(),active=new Set();const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 function write(relative){if(written.has(relative))return;if(active.has(relative))throw Error('Fixture source cycle');active.add(relative);const doc=documents.get(relative);if(!doc)throw Error('Fixture source missing: '+relative);
  const data=doc.metadata.workflowData;
  for(const source of doc.metadata.sourceRevisions)write(source.path);
  for(const field of ['sourceDigests','evidenceDigests'])if(data[field])for(const source of Object.keys(data[field])){write(source);data[field][source]=sha(source);}
  if(data.planDigest){write(boundary.planPath);data.planDigest=sha(boundary.planPath);}
  if(data.completionValidationDigest){write(data.completionValidationRecordPath);data.completionValidationDigest=sha(data.completionValidationRecordPath);}
  const target=path.join(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,serialize(doc.metadata,doc.bodyMarkdown));written.add(relative);active.delete(relative);
 }
 for(const relative of documents.keys())write(relative);
 const intake=parse(fs.readFileSync(path.join(root,boundary.intakePath),'utf8')).metadata.workflowData;
 git('switch','-c',intake.branchBinding.workBranch);
 fs.writeFileSync(path.join(root,'source.js'),"module.exports = ['incoming'];\n");
 const evidence=hydrate(structuredClone(boundary.checkpoint));evidence.beforeHead=base;evidence.contractSha256=sha(evidence.contractPath);evidence.reportSha256=sha(evidence.reportPath);evidence.files=[{path:'source.js',sha256:sha('source.js')}];
 const checkpointId=checkpointIdFor(evidence),receipt=serialize({schemaVersion:1,artifactType:'work-item-checkpoint',artifactRevision:1,participationRole:'contextOnly',identity:{intakeId:boundary.intakeId,workItemId:'WI01',implementationId:'WI01',checkpointId},sourceRevisions:[],workflowData:{evidence,resultingCommit:'containing-commit'},documentDisposition:{status:'Pending',notes:'Synthetic checkpoint at a completed durable boundary.',reviewedAt:null}},'# Source checkpoint\n');
 git('add','source.js');const message=path.join(root,'.git','fixture-message');fs.writeFileSync(message,'WI01: source checkpoint '+checkpointId+'\n\n'+receipt);git('commit','-F',message);fs.unlinkSync(message);
 return{root,git,intakeId:boundary.intakeId,workBranch:intake.branchBinding.workBranch,planPath:boundary.planPath,checkpointCommit:git('rev-parse','HEAD')};
}
module.exports={seedCompletedRoutedPlan};
