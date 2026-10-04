const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
const {PhaseInterviewShell,PhaseInterviewBrowserActions}=load('src/renderer/app/PhaseInterviewShell.tsx');
const {PhaseInterviewWorkspace}=load('src/renderer/app/PhaseInterviewWorkspace.tsx');
const {FigmaDocumentCard}=load('src/renderer/app/FigmaDocumentCard.tsx');
test('Phase Interview shell preserves historical document review browser composition and handoff order',()=>{
 const document={selectedDocument:null,documentError:'',feedback:'',onCopy(){}};
 for(const browserVisible of [true,false]){
  const review=React.createElement('button',null,'Apply Review'),browser=browserVisible?React.createElement('div',{className:'figma-browser-column'},'ChatGPT'):null;
  const recovered=render(React.createElement(PhaseInterviewShell,{label:'Phase Interview phase-07 Figma document workspace',browserVisible,document,reviewControls:review,browserCompanion:browser}));
  // App@965536de phase-interview branch: exact section, focus target and pane order.
  const baseline=render(React.createElement('section',{className:'figma-doc-chat-workspace'+(browserVisible?'':' chat-hidden'),'aria-label':'Phase Interview phase-07 Figma document workspace',tabIndex:-1},React.createElement('div',{className:'figma-doc-review-column'},React.createElement(FigmaDocumentCard,document),review),browser));
  assert.equal(recovered,baseline);
 }
 const actions={canPrepareHandoff:false,canCopyHandoff:false,onPrepareHandoff(){},onCopyHandoff(){},onRefresh(){},onReloadBrowser(){},onRetryBrowser(){},prepareHandoffLabel:'Prepare Phase Interview Handoff',copyHandoffLabel:'Copy Phase Interview Handoff'};
 const markup=render(React.createElement(PhaseInterviewBrowserActions,actions));let last=-1;
 for(const label of ['Reload ChatGPT','Prepare Phase Interview Handoff','Copy Phase Interview Handoff','Refresh']){const i=markup.indexOf(label);assert.ok(i>last,label);last=i;}
 assert.match(markup,/disabled=""/);assert.match(render(React.createElement(PhaseInterviewBrowserActions,{...actions,isRevisionRequest:true})),/Prepare Revision Request/);
});
test('Phase Interview adapter binds repeated exact Phase reviews and typed handoffs without candidate editors',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;let values,index,calls=[];
 React.useState=initial=>{const slot=index++;return [values[slot]??initial,value=>{values[slot]=typeof value==='function'?value(values[slot]):value;}];};React.useEffect=()=>{};React.useRef=()=>({current:0});
 try{for(const phaseId of ['phase-one','phase-two']){
  const model={workflowId:'workflow',phase:{id:phaseId,body:{phaseKey:phaseId}},stageKind:'interview',handoff:'workflow_toolbox.submit_stage_candidate exact '+phaseId,review:{cycle:{id:'cycle-'+phaseId,recordVersion:5},disposition:{state:'none'},markdown:'# Interview\n'+phaseId}};
  values=[model,'','Operator notes','Approved',false,'',''];calls=[];
  global.window={champcity:{getStructuredPhaseLoop:async(...args)=>{calls.push(['get',...args]);return model;},reviewStructuredPhaseLoop:async(...args)=>{calls.push(['review',...args]);return model;}}};
  const draw=(id=phaseId)=>{index=0;return PhaseInterviewWorkspace({workflowId:'workflow',phaseId:id,browserPanel:null,onNext(){}}).props;};
  let p=draw();assert.match(p.label,new RegExp(phaseId));assert.match(p.document.selectedDocument.bodyMarkdown,new RegExp(phaseId));assert.equal(p.reviewControls.props.canApply,true);
  p.reviewControls.props.onApply();await new Promise(setImmediate);assert.deepEqual(calls[0],['review','workflow',phaseId,'interview','cycle-'+phaseId,{expectedRecordVersion:5,outcome:'approved',notes:'Operator notes'}]);
  const actions=p.browserCompanion.props.children[1].props;actions.onPrepareHandoff();await new Promise(setImmediate);assert.deepEqual(calls[1],['get','workflow',phaseId,'interview']);assert.equal(actions.onPrepareFinalDraftHandoff,undefined);assert.equal(index,6);assert.doesNotMatch(require('node:fs').readFileSync('src/renderer/app/PhaseInterviewWorkspace.tsx','utf8'),/finalHandoff|FinalDraftHandoff/);
  p=draw('foreign');assert.equal(p.reviewControls.props.canApply,false);assert.equal(p.document.selectedDocument,null);assert.equal(p.browserCompanion.props.children[1].props.canCopyHandoff,false);
  values[0]={...model,staleReview:{reason:'Phase evidence changed'},review:null};p=draw();assert.equal(p.reviewControls.props.canApply,false);assert.match(p.document.documentError,/evidence changed/);
 }}finally{Object.assign(React,original);global.window=oldWindow;}
});
