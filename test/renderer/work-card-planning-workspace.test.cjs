const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
const {WorkCardPlanningShell,WorkCardPlanningBrowserActions}=load('src/renderer/app/WorkCardPlanningShell.tsx');
const {WorkCardPlanningWorkspace}=load('src/renderer/app/WorkCardPlanningWorkspace.tsx');
const {FigmaDocumentCard}=load('src/renderer/app/FigmaDocumentCard.tsx');
test('Work Card Planning shell preserves historical document review browser composition and handoff order',()=>{
 const document={selectedDocument:null,documentError:'',feedback:'',onCopy(){}};
 for(const browserVisible of [true,false]){
  const review=React.createElement('button',null,'Apply Review'),browser=browserVisible?React.createElement('div',{className:'figma-browser-column'},'ChatGPT'):null;
  const recovered=render(React.createElement(WorkCardPlanningShell,{label:'Work Card Planning WC07 Figma document workspace',browserVisible,document,reviewControls:review,browserCompanion:browser}));
  // App@965536de work-card-planning branch: exact section, focus target and pane order.
  const baseline=render(React.createElement('section',{className:'figma-doc-chat-workspace'+(browserVisible?'':' chat-hidden'),'aria-label':'Work Card Planning WC07 Figma document workspace',tabIndex:-1},React.createElement('div',{className:'figma-doc-review-column'},React.createElement(FigmaDocumentCard,document),review),browser));
  assert.equal(recovered,baseline);
 }
 const actions={canPrepareHandoff:false,canCopyHandoff:false,onPrepareHandoff(){},onCopyHandoff(){},onRefresh(){},onReloadBrowser(){},onRetryBrowser(){},prepareHandoffLabel:'Prepare Handoff',copyHandoffLabel:'Copy Handoff'};
 const markup=render(React.createElement(WorkCardPlanningBrowserActions,actions));let last=-1;
 for(const label of ['Reload ChatGPT','Prepare Handoff','Copy Handoff','Refresh']){const i=markup.indexOf(label);assert.ok(i>last,label);last=i;}
 assert.match(markup,/disabled=""/);assert.match(render(React.createElement(WorkCardPlanningBrowserActions,{...actions,isRevisionRequest:true})),/Prepare Revision Request/);
});
test('Work Card Planning adapter reviews exact current contracts and refreshes typed model output',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;let values,index,calls=[];
 React.useState=initial=>{const slot=index++;return [values[slot]??initial,value=>values[slot]=value];};React.useEffect=()=>{};React.useRef=()=>({current:0});
 try{for(const workItemId of ['work-a','work-b']){
  let model={workflowId:'wf',workflowType:'project-creation',workItem:{id:workItemId,recordVersion:5,body:{candidateKey:workItemId,workState:'planned',contractRevision:4}},review:{disposition:{state:'none'}},markdown:'# Formal Work Card\nBounded contract '+workItemId,handoff:'workflow_toolbox.submit_stage_candidate '+workItemId};values=[model,'','Review notes','Approved',false,''];calls=[];
  global.window={champcity:{getStructuredWorkItemPlanning:async(...args)=>{calls.push(['get',...args]);return model;},reviewStructuredWorkItemPlanning:async(...args)=>{calls.push(['review',...args]);return model;}}};
  const draw=(id=workItemId)=>{index=0;return WorkCardPlanningWorkspace({workflowId:'wf',workItemId:id,browserPanel:null,onNext(){}}).props;};
  let p=draw();assert.match(p.document.selectedDocument.bodyMarkdown,new RegExp(workItemId));assert.equal(p.reviewControls.props.canApply,true);p.reviewControls.props.onApply();await new Promise(setImmediate);assert.deepEqual(calls[0],['review','wf',workItemId,{expectedRecordVersion:5,outcome:'approved',notes:'Review notes'}]);
  model={...model,workItem:{...model.workItem,recordVersion:6,body:{...model.workItem.body,contractRevision:6}},markdown:'# Revised exact contract'};p.browserCompanion.props.children[1].props.onRefresh();await new Promise(setImmediate);assert.deepEqual(calls[1],['get','wf',workItemId]);p=draw();assert.match(p.document.selectedDocument.bodyMarkdown,/Revised exact/);assert.equal(p.reviewControls.props.canApply,false);
  p=draw('peer');assert.equal(p.document.selectedDocument,null);assert.equal(p.reviewControls.props.canApply,false);const count=calls.length;p.reviewControls.props.onApply();assert.equal(calls.length,count);
  values[0]={...model,workflowType:'feature'};p=draw();assert.equal(p.document.selectedDocument,null);assert.equal(p.browserCompanion.props.children[1].props.canCopyHandoff,false);
 }}finally{Object.assign(React,original);global.window=oldWindow;}
});
