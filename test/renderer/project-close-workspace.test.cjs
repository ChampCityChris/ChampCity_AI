const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadRendererSourceModule}=require('./renderer-source-loader.cjs');
const {ProjectCloseShell}=loadRendererSourceModule('src/renderer/app/ProjectCloseShell.tsx');
const {ProjectCloseWorkspace}=loadRendererSourceModule('src/renderer/app/ProjectCloseWorkspace.tsx');
const document={logicalDocumentId:'cycle',displayFilename:'PROJECT_CLOSEOUT.md',markdownPath:'project-state:cycle',metadata:{artifactType:'generated-closeout-review',artifactRevision:3},effectiveDisposition:'Pending',documentReadState:'readable',initializationNeeded:false,bodyMarkdown:'# Project Closeout\n\nExact SQL evidence',preview:'',previewTruncated:false};
const inputs={closureDecision:'Close',rationale:'Current outcome verified',status:'Approved'};
const nodes=e=>!e||typeof e!=='object'?[]:[e,...React.Children.toArray(e.props?.children).flatMap(nodes)];
test('Project Close shell preserves recovered evidence geometry and ordered independent controls',()=>{
 let created=0,reviewed=0,changed;
 const props={presentation:{currentRequiredWorkflowStep:'Project Close',currentTarget:'Project exact',eligibility:'Current',requiredAction:'Review Closeout',expectedOutput:'Reviewed Closeout',expectedNextState:'Project Close',actionContext:'Current Project Closeout',actionPath:'project / close / exact'},inputs,onChange:v=>{changed=v;},onCreateCloseout:()=>created++,onApplyDisposition:()=>reviewed++,onSelectDocument(){},canCreate:true,canReview:true,documentStep:'project-close',selectedDocument:document,selectedDocumentId:'cycle',workspaceGroups:[{group:'Closeout',documents:[document]}],feedback:'Refreshed',documentError:'',emptyMessage:'No documents',navigation:React.createElement('nav',{'aria-label':'Project lifecycle'},'Rail')};
 const markup=renderToStaticMarkup(React.createElement(ProjectCloseShell,props));
 for(const value of ['max-w-2xl space-y-3','grid grid-cols-2 gap-x-6 gap-y-2.5','max-h-80 overflow-auto','overflow-y-auto px-4 py-4','Current Required Workflow Step','Current Document','Effective Disposition','Document 1 of 1','Exact SQL evidence','Project lifecycle'])assert.ok(markup.includes(value),value);
 assert.ok(markup.indexOf('Apply Current Disposition')<markup.indexOf('Closure Decision'));assert.ok(markup.indexOf('Rationale')<markup.indexOf('Create Current Project Closeout'));assert.ok(markup.indexOf('Action Context')<markup.indexOf('Select a document'));
 const tree=nodes(ProjectCloseShell(props));tree.find(n=>n.type==='button'&&n.props.children==='Create Current Project Closeout').props.onClick();assert.equal(created,1);assert.equal(reviewed,0);
 tree.find(n=>n.type==='button'&&n.props.children==='Apply Current Disposition').props.onClick();assert.equal(reviewed,1);
 tree.find(n=>n.type==='select'&&n.props['aria-label']==='Closure Decision').props.onChange({target:{value:'DoNotClose'}});assert.equal(changed.closureDecision,'DoNotClose');
 const blocked=nodes(ProjectCloseShell({...props,canCreate:false,canReview:false}));assert.ok(blocked.filter(n=>n.type==='button').every(n=>n.props.disabled));
});
test('Project Close adapter uses exact SQL candidate and review ports without direct closure',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;
 const view={workflowId:'workflow',entityId:'workflow',scope:'workflow',expectedVersion:9,label:'Project',closed:false,eligible:true,blockers:[],sourceMode:'source-neutral',criteria:[],next:{workspaceId:'workflow-hub',label:'Workflows'}};
 const review={workflowId:'workflow',targetEntityId:'workflow',scope:'project',cycleId:'cycle',recordVersion:3,current:true,closed:false,document,markdown:document.bodyMarkdown,disposition:{state:'none'}};
 let values=[view,review,inputs,'cycle','','',false],index=0;const calls=[];
 React.useState=initial=>{const slot=index++;return [values[slot]??initial,value=>{values[slot]=typeof value==='function'?value(values[slot]):value;}];};React.useEffect=()=>{};React.useRef=()=>({current:0});
 global.window={champcity:{getCloseAdvance:async(...args)=>{calls.push(['get',...args]);return view;},getCloseoutReview:async(...args)=>{calls.push(['getReview',...args]);return review;},saveCloseoutCandidate:async input=>{calls.push(['save',input]);return review;},recordCloseoutReview:async(...args)=>{calls.push(['review',...args]);return review;},closeAndAdvance:()=>{throw Error('Direct closure is forbidden');}}};
 const render=(workflowId='workflow')=>{index=0;return ProjectCloseWorkspace({workflowId,onNext(){calls.push(["return"]);}}).props;};
 try{
  let props=render();props.onCreateCloseout();await new Promise(setImmediate);
  assert.deepEqual(calls[0],['save',{workflowId:'workflow',targetEntityId:'workflow',scope:'project',expectedTargetVersion:9,expectedRecordVersion:3,closureDecision:'Close',rationale:inputs.rationale}]);assert.equal(calls.some(c=>c[0]==='review'),false);
  calls.length=0;props=render();props.onApplyDisposition();await new Promise(setImmediate);
  assert.deepEqual(calls[0],['review','workflow','cycle',{expectedRecordVersion:3,outcome:'approved',notes:inputs.rationale}]);assert.deepEqual(calls.slice(1).map(c=>c[0]),['get','getReview']);
  props=render('peer');assert.equal(props.canCreate,false);assert.equal(props.canReview,false);const before=calls.length;props.onCreateCloseout();props.onApplyDisposition();assert.equal(calls.length,before);
  values[1]={...review,current:false};props=render();assert.equal(props.canReview,false);assert.match(props.documentError,/evidence changed/);
  values[0]={...view,closed:true,eligible:false};values[1]={...review,closed:true};props=render();assert.equal(props.canCreate,false);assert.equal(props.canReview,false);const finish=nodes(props.contextualActions).find(n=>n.type==="button"&&n.props.children==="Return to Workflows");assert.equal(finish.props.disabled,false);finish.props.onClick();assert.deepEqual(calls.at(-1),["return"]);
 }finally{Object.assign(React,original);global.window=oldWindow;}
});
