const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server'),{loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
const {PhaseCloseShell}=load('src/renderer/app/PhaseCloseShell.tsx'),{PhaseCloseWorkspace}=load('src/renderer/app/PhaseCloseWorkspace.tsx');
const nodes=e=>!e||typeof e!=='object'?[]:[e,...React.Children.toArray(e.props?.children).flatMap(nodes)];
test('Phase Close preserves historical completion evidence without retained validation mutation controls',()=>{
 const props={presentation:{currentRequiredWorkflowStep:'Phase Close',currentTarget:'Current phase p',eligibility:'Closed',requiredAction:'No Phase Validation mutation required',expectedOutput:'Completed',expectedNextState:'Next Phase',actionContext:'Phase Validation — p',actionPath:'phase / validation / p'},inputs:{closureDecision:'Close',rationale:'Verified',status:'Approved'},showCreate:false,showReview:false,canCreate:false,canReview:false,onChange(){},onCreateCloseout(){},onApplyDisposition(){},onSelectDocument(){},documentStep:'phase-close',selectedDocument:null,selectedDocumentId:null,workspaceGroups:[],emptyMessage:'No documents in this workflow step.',feedback:'',documentError:''};
 const markup=render(React.createElement(PhaseCloseShell,props));assert.match(markup,/max-w-2xl space-y-3/);assert.match(markup,/Phase Close/);assert.match(markup,/Current phase p/);assert.match(markup,/Select a document/);assert.doesNotMatch(markup,/Apply Current Disposition|Create Current Phase Closeout/);
});
test('Phase Close adapter requires reviewed exact closure and returns authoritative next context',()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef};let values,index=0,calls=[];
 React.useState=initial=>[values[index++]??initial,()=>{}];React.useEffect=()=>{};React.useRef=()=>({current:0});
 try{for(const phaseId of ['p1','p2']){
  const next={workspaceId:phaseId==='p1'?'phase-interview':'workflow-execution',entityId:phaseId==='p1'?'p2':'wf',label:phaseId==='p1'?'Next Phase':'Project validation'},view={workflowId:'wf',entityId:phaseId,requestPhaseId:phaseId,closed:true,blockers:[],next};
  const review={workflowId:'wf',targetEntityId:phaseId,cycleId:'cycle',recordVersion:1,current:true,closed:true,closureDecision:'Close',rationale:'Complete',disposition:{state:'approved'},document:{logicalDocumentId:'cycle',effectiveDisposition:'Approved'}};values=[view,review,'cycle','',false];
  const draw=(id=phaseId)=>{index=0;return PhaseCloseWorkspace({workflowId:'wf',phaseId:id,onValidation(){calls.push('validation');},onNext:n=>calls.push(n)}).props;};
  let p=draw(),buttons=nodes(p.contextualActions).filter(n=>n.type==='button');assert.equal(p.showCreate,false);assert.equal(p.showReview,false);assert.equal(buttons[2].props.disabled,false);buttons[2].props.onClick();assert.deepEqual(calls.at(-1),next);
  for(const invalid of [{...review,current:false},{...review,closureDecision:'DoNotClose'},{...review,disposition:{state:'rejected'}}]){values[1]=invalid;p=draw();assert.equal(nodes(p.contextualActions).filter(n=>n.type==='button')[2].props.disabled,true);}
  values[1]=review;p=draw('peer');assert.equal(p.selectedDocument,null);assert.equal(nodes(p.contextualActions).filter(n=>n.type==='button')[2].props.disabled,true);
  values[0]={...view,closed:false};p=draw();buttons=nodes(p.contextualActions).filter(n=>n.type==='button');assert.equal(buttons[1].props.disabled,false);assert.equal(buttons[2].props.disabled,true);
 }}finally{Object.assign(React,original);}
});
