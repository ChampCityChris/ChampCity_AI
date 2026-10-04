const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
const {WorkCardReviewValidationShell}=load('src/renderer/app/WorkCardReviewValidationShell.tsx');
const {useWorkItemReviewContext}=load('src/renderer/app/WorkCardReviewValidationWorkspace.tsx');
const decision=()=>({ariaLabel:'Review & Validation documents and decision',decisionAriaLabel:'Operator validation controls',canRequestRepair:false,canValidatePassed:true,isApplying:false,documentChoices:[{id:'formal',label:'Approved Work Card',available:true},{id:'report',label:'Implementer Report',available:true}],selectedDocumentId:'report',selectedDocumentBody:'# Implementer Report\nImplementation evidence is visible.',selectedDocumentFilename:'IMPLEMENTER_REPORT.md',selectedDocumentLabel:'Implementer Report',selectedDocumentPath:'project-state:report',selectedDocumentStatus:'completed / current',operatorNotes:'',repairDefectText:'',onOperatorNotesChange(){},onRepairDefectTextChange(){},onRequestRepair(){},onValidatePassed(){},onSelectDocument(){}});
const props=()=>({identity:'WC44 - Exact Review',contractPath:'project-state:work',reportStatus:'revision 1 | completed',reportPath:'project-state:report',decision:decision()});
test('Review & Validation renders Implementer Report by default in a compact document pane',()=>{
 const markup=render(React.createElement(WorkCardReviewValidationShell,props()));
 for(const text of ['work-card-report-evidence-strip','WC44 - Exact Review','Decision ownership','Architect review advisory; Operator decision creates validation basis.','Read / Freshness','# Implementer Report','Operator validation notes','Validate Passed','Request Repair'])assert.ok(markup.includes(text),text);
 assert.match(markup,/aria-selected="true" class="document-choice selected"[^>]*><span>Implementer Report<\/span>/);
 assert.ok(markup.indexOf('Validate Passed')<markup.indexOf('Request Repair'));
});
test('Review & Validation renders Approved Work Card tab content and missing document errors inline',()=>{
 const p=props();p.decision={...p.decision,selectedDocumentId:'formal',selectedDocumentLabel:'Approved Work Card',selectedDocumentBody:'# Approved Work Card',documentError:'Exact report unavailable',canValidatePassed:false};
 const markup=render(React.createElement(WorkCardReviewValidationShell,p));assert.match(markup,/# Approved Work Card/);assert.match(markup,/class="document-error"/);assert.match(markup,/disabled=""/);
});
test('Review & Validation controls preserve advisory read-only and browser proof slot placement',()=>{
 const p=props();p.decision.advisoryField={label:'Advisory Architect summary',value:'SQL advice',readOnly:true};p.browserPanel=React.createElement('div',{className:'figma-browser-column'},'ChatGPT');p.proofActions=React.createElement('section',null,'Independent Tester');
 const markup=render(React.createElement(WorkCardReviewValidationShell,p));assert.match(markup,/readonly=""/);assert.ok(markup.indexOf('work-card-report-review-workspace')<markup.indexOf('figma-browser-column'));assert.ok(markup.indexOf('Request Repair')<markup.indexOf('Independent Tester'));assert.doesNotMatch(markup,/Select disposition|Run Codex Implementer/);
});
test('Review adapter prepares exact cycle then records SQL review and routes exact Repair without criterion substitution',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},oldWindow=global.window;
 let index=0,values,calls=[],closed=0,repairs=[];
 React.useState=initial=>{const i=index++;return[values[i]??initial,value=>values[i]=value];};React.useEffect=()=>{};React.useRef=()=>({current:0});
 const review={workflowId:'wf',workItem:{id:'work',body:{workState:'validation_pending',title:'Exact',candidateKey:'WC01'}},validation:{implementationRecordId:'result',testerResultId:'tester',completion:{eligible:true,blockers:[]},criteria:[]},cycle:{cycle:{id:'cycle',recordVersion:7,body:{}},current:true,disposition:{state:'none'}},markdown:'# Validation',handoff:'Exact handoff'};
 const planning={workflowId:'wf',workflowType:'project-creation',workItem:{id:'work'},review:{disposition:{state:'approved'}},markdown:'# Approved Work Card'},report={attempt:{id:'attempt',recordVersion:3,body:{workflowId:'wf',workItemId:'work',attemptState:'completed',implementationRecordId:'result'}},markdown:'# Implementer Report'};
 values=[review,planning,report,null,false,'','Operator notes','Defect','report',''];
 global.window={champcity:{prepareWorkItemValidationCycle:async(...args)=>{calls.push(['prepare',...args]);return review;},reviewWorkItemValidationCycle:async(...args)=>{calls.push(['review',...args]);return{id:'decision'};},createWorkflowRepair:async(...args)=>{calls.push(['repair',...args]);return{repair:{id:'repair-exact'}};},getStructuredWorkItemReview:async()=>review,getStructuredWorkItemPlanning:async()=>planning,getImplementationAttempt:async()=>report,getWorkflowWorkItemTesterStatus:async()=>null}};
 const draw=(id='work',readOnly=false)=>{index=0;return useWorkItemReviewContext({workflowId:'wf',workItemId:id,readOnly,onClosed:()=>closed++,onRepair:id=>repairs.push(id)});};
 try{
  let context=draw('work',true);assert.equal(context.decision.canValidatePassed,false);assert.equal(context.decision.canRequestRepair,false);context.decision.onValidatePassed();context.decision.onRequestRepair();context.prepare();await new Promise(setImmediate);assert.equal(calls.length,0);for(const slot of ['formal','validation','report']){context.decision.onSelectDocument(slot);assert.equal(values[8],slot);}assert.equal(context.proofActions.props.busy,true);let ran=false;await context.proofActions.props.action(async()=>{ran=true});assert.equal(ran,false);const actions=React.Children.toArray(context.documentActions.props.children);assert.ok(actions.every(button=>!button.props.disabled));
  context=draw();assert.equal(context.decision.canValidatePassed,true);context.decision.onRequestRepair();await new Promise(setImmediate);
  assert.deepEqual(calls,[['prepare','wf','work'],['review','wf','work',{cycleId:'cycle',expectedRecordVersion:7,outcome:'RequestRepair',operatorNotes:'Operator notes',repairDefectText:'Defect'}],['repair','wf','work','decision']]);assert.deepEqual(repairs,['repair-exact']);assert.equal(closed,0);
  calls=[];values[0]={...review,validation:{...review.validation,completion:{eligible:false,blockers:['criterion-missing']}}};context=draw();assert.equal(context.decision.canValidatePassed,false);context.decision.onValidatePassed();await new Promise(setImmediate);assert.equal(calls.length,0);
  values[0]=review;values[7]='';context=draw();assert.equal(context.decision.canRequestRepair,false);context.decision.onValidatePassed();await new Promise(setImmediate);assert.equal(closed,1);assert.equal(calls[1][3].outcome,'ValidatePassed');
  context=draw('peer');assert.equal(context.decision.canValidatePassed,false);assert.equal(context.decision.canRequestRepair,false);
 }finally{Object.assign(React,original);global.window=oldWindow;}
});
