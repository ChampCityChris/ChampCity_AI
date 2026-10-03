const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server'),{loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
const {PhaseValidationShell}=load('src/renderer/app/PhaseValidationShell.tsx'),{PhaseValidationWorkspace}=load('src/renderer/app/PhaseValidationWorkspace.tsx');
const nodes=e=>!e||typeof e!=='object'?[]:[e,...React.Children.toArray(e.props?.children).flatMap(nodes)];
const inputs={closureDecision:'Close',rationale:'Observed current Phase evidence',status:'Approved'};
test('Phase Validation shell restores separate create review and completed action states',()=>{
 const props={presentation:{currentRequiredWorkflowStep:'Phase Validation',currentTarget:'Current phase p',eligibility:'Current',requiredAction:'Create',expectedOutput:'Closeout',expectedNextState:'Phase Close',actionContext:'Phase Validation — p',actionPath:'phase / validation / p'},inputs,onChange(){},onApplyDisposition(){},onCreateCloseout(){},onSelectDocument(){},canCreate:true,canReview:true,documentStep:'phase-validation',selectedDocument:null,selectedDocumentId:null,workspaceGroups:[],feedback:'',documentError:'',emptyMessage:'No documents in this workflow step.'};
 for(const [showCreate,showReview] of [[true,false],[false,true],[false,false]]){
  const markup=render(React.createElement(PhaseValidationShell,{...props,showCreate,showReview}));assert.equal(markup.includes('Create Current Phase Closeout'),showCreate);assert.equal(markup.includes('Apply Current Disposition'),showReview);assert.match(markup,/max-w-2xl space-y-3/);assert.match(markup,/Phase Validation — p/);assert.match(markup,/grid grid-cols-2/);assert.doesNotMatch(markup,/Work Card Map mutation/);
 }
});
test('Phase Validation adapter sequences exact candidate review and evidence refresh without direct Phase closure',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;let values,index,calls=[];
 React.useState=initial=>{const slot=index++;return [values[slot]??initial,value=>{values[slot]=typeof value==='function'?value(values[slot]):value;}];};React.useEffect=()=>{};React.useRef=()=>({current:0});
 try{for(const phaseId of ['p-one','p-two']){
  const view={workflowId:'wf',entityId:phaseId,requestPhaseId:phaseId,expectedVersion:8,eligible:true,closed:false,blockers:[]};
  const review={workflowId:'wf',targetEntityId:phaseId,cycleId:'close-'+phaseId,recordVersion:2,current:true,closed:false,disposition:{state:'none'},document:{logicalDocumentId:'close-'+phaseId}};
  const evidence={workflowId:'wf',phaseId,phaseVersion:8,workItemsClosed:true,criteria:[]};
  values=[view,null,evidence,inputs,null,'','',false,'pass'];calls=[];
  global.window={champcity:{getCloseAdvance:async(...a)=>{calls.push(['get',...a]);return view;},getCloseoutReview:async(...a)=>{calls.push(['closeout',...a]);return review;},getWorkflowPhaseValidation:async(...a)=>{calls.push(['evidence',...a]);return evidence;},saveCloseoutCandidate:async a=>{calls.push(['save',a]);return review;},recordCloseoutReview:async(...a)=>{calls.push(['review',...a]);return review;},completeWorkflowPhase(){throw Error('Forbidden direct closure');}}};
  const draw=(id=phaseId)=>{index=0;return PhaseValidationWorkspace({workflowId:'wf',phaseId:id,onNext(){}}).props;};
  let p=draw();assert.equal(p.showCreate,true);assert.equal(p.showReview,false);p.onCreateCloseout();await new Promise(setImmediate);
  assert.deepEqual(calls[0],['save',{workflowId:'wf',targetEntityId:phaseId,scope:'phase',expectedTargetVersion:8,closureDecision:'Close',rationale:inputs.rationale}]);assert.deepEqual(calls.slice(1).map(c=>c[0]),['get','closeout','evidence']);
  p=draw();assert.equal(p.showCreate,false);assert.equal(p.showReview,true);calls=[];p.onApplyDisposition();await new Promise(setImmediate);assert.deepEqual(calls[0],['review','wf','close-'+phaseId,{expectedRecordVersion:2,outcome:'approved',notes:inputs.rationale}]);
  values[1]={...review,current:false};p=draw();assert.equal(p.showCreate,true);assert.equal(p.canReview,false);p=draw('foreign');assert.equal(p.canCreate,false);assert.equal(p.canReview,false);
  values[0]={...view,closed:true,eligible:false};values[1]={...review,closed:true};p=draw();assert.equal(p.showCreate,false);assert.equal(p.showReview,false);assert.equal(nodes(p.contextualActions).find(n=>n.type==='button'&&n.props.children==='Continue to Phase Close').props.disabled,false);
 }}finally{Object.assign(React,original);global.window=oldWindow;}
});
