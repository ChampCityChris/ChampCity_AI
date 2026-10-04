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
 await canonicalRailReview();
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


// Compose the real navigation owner, Phase Interview adapter and disposition panel.
async function canonicalRailReview(){
 const {GreenfieldWorkspace}=load('src/renderer/app/GreenfieldWorkspace.tsx');
 const {FigmaDocumentDispositionPanel}=load('src/renderer/app/FigmaDocumentDispositionPanel.tsx');
 const nodes=x=>!x||typeof x!=='object'?[]:[x,...React.Children.toArray(x.props?.children).flatMap(nodes)];
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},old=global.window;
 const nav={workflowId:'wf',currentWorkspace:'phase-interview',currentPhaseId:'phase-A',currentWorkItemId:null,currentRepairId:null,reason:'Pending Phase Interview',blockers:[],completedWorkspaces:['project-planning-review','architect-interview'],phaseStates:[{phaseId:'phase-A',title:'Phase A',state:'active'}],workItemStates:[],executionContext:{phase:{state:'active',phaseId:'phase-A',loopStep:'Phase Intake'},workCard:{state:'none'}}};
 const model={workflowId:'wf',phase:{id:'phase-A',body:{phaseKey:'A'}},stageKind:'interview',review:{cycle:{id:'interview-A',recordVersion:7},disposition:{state:'none'},markdown:'# Pending Interview'}};
 const shell=[nav,{stage:'phase-interview',phaseId:'stale-phase',workItemId:null,repairId:null},'Stale navigation error',{}],adapter=[model,'','Operator notes','',false,''];
 const shellRefs=[],adapterRefs=[],calls=[];let values,refs,index,refIndex,effects,sidebarAction,resolveWrite,fresh=nav;
 React.useState=initial=>{const i=index++,owner=values;return[i<owner.length?owner[i]:initial,value=>owner[i]=typeof value==='function'?value(owner[i]):value];};
 React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});React.useEffect=effect=>effects.push(effect);
 global.window={champcity:{getGreenfieldNavigation:async id=>{calls.push(['resolve',id]);return fresh;},reviewStructuredPhaseLoop:(...args)=>{calls.push(['persist',...args]);return new Promise(resolve=>resolveWrite=resolve);}}};
 const draw=()=>{values=shell;refs=shellRefs;index=refIndex=0;effects=[];const tree=GreenfieldWorkspace({workflow:{workflowId:'wf'},repositoryIdentity:'Selected Project',browserPanel:null,onReturn(){},onWorkflowContextAction:action=>sidebarAction=action});effects[1]();return tree;};
 const rail=()=>nodes(draw()).find(n=>n.type?.name==='GreenfieldNestedWorkflowRail').props;
 const panel=component=>{values=adapter;refs=adapterRefs;index=refIndex=0;effects=[];return FigmaDocumentDispositionPanel(PhaseInterviewWorkspace(component.props).props.reviewControls.props);};
 try{
  rail().onWorkspaceChange('project-planning-review');rail().onWorkspaceChange('architect-interview');assert.deepEqual(calls,[]);
  // A fresh object supplies exact identities; the rail must not copy cached identities.
  fresh={...nav,currentPhaseId:'phase-A'};shell[0]={...nav,currentPhaseId:'outdated-phase'};
  await rail().onWorkspaceChange('phase-interview');assert.deepEqual(calls,[['resolve','wf']]);assert.equal(shell[2],'');
  const exact={stage:'phase-interview',phaseId:'phase-A',workItemId:null,repairId:null};assert.deepEqual(shell[1],exact);
  let tree=draw();assert.equal(sidebarAction,null);const component=nodes(tree).find(n=>n.type?.name==='PhaseInterviewWorkspace');assert.equal(component.props.phaseId,'phase-A');assert.equal(component.props.readOnly,false);
  rail().onWorkspaceChange('project-planning-review');draw();await sidebarAction.onClick();assert.deepEqual(shell[1],exact);assert.deepEqual(calls,[['resolve','wf'],['resolve','wf']]);calls.length=0;
  let review=panel(component);assert.equal(nodes(review).find(n=>n.type==='select').props.disabled,false);assert.equal(nodes(review).find(n=>n.type==='button').props.disabled,true);
  for(const status of ['Approved','RevisionRequested','Rejected']){nodes(review).find(n=>n.type==='select').props.onChange({target:{value:status}});review=panel(component);assert.equal(nodes(review).find(n=>n.type==='select').props.value,status);assert.equal(nodes(review).find(n=>n.type==='button').props.disabled,false);}
  adapter[2]='';adapter[3]='RevisionRequested';assert.equal(nodes(panel(component)).find(n=>n.type==='button').props.disabled,true,'revision still requires notes');adapter[2]='Operator notes';adapter[3]='Approved';
  const apply=nodes(panel(component)).find(n=>n.type==='button').props.onClick;apply();apply();assert.deepEqual(calls,[['persist','wf','phase-A','interview','interview-A',{expectedRecordVersion:7,outcome:'approved',notes:'Operator notes'}]]);
  assert.equal(nodes(panel(component)).find(n=>n.type==='select').props.disabled,true);
  fresh={...nav,currentWorkspace:'phase-planning-bundle'};resolveWrite({...model,review:{...model.review,disposition:{state:'approved'}}});await new Promise(setImmediate);
  assert.deepEqual(calls[1],['resolve','wf']);assert.equal(calls.length,2);assert.equal(shell[1].stage,'phase-planning-bundle');assert.equal(shell[1].phaseId,'phase-A');
 }finally{Object.assign(React,original);global.window=old;}
}
