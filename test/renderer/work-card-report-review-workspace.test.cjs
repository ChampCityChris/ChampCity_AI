const assert=require('node:assert/strict'),test=require('node:test'),React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');
const {WorkCardReviewValidationShell}=load('src/renderer/app/WorkCardReviewValidationShell.tsx');
const {useWorkItemReviewContext}=load('src/renderer/app/WorkCardReviewValidationWorkspace.tsx');
const decision=()=>({ariaLabel:'Review & Validation documents and decision',decisionAriaLabel:'Operator validation controls',canRequestRepair:false,canValidatePassed:true,isApplying:false,documentChoices:[{id:'formal',label:'Approved Work Card',available:true},{id:'report',label:'Implementer Report',available:true}],selectedDocumentId:'report',selectedDocumentBody:'# Implementer Report\nImplementation evidence is visible.',selectedDocumentFilename:'IMPLEMENTER_REPORT.md',selectedDocumentLabel:'Implementer Report',selectedDocumentPath:'project-state:report',selectedDocumentStatus:'completed / current',operatorNotes:'',repairDefectText:'',onOperatorNotesChange(){},onRepairDefectTextChange(){},onRequestRepair(){},onValidatePassed(){},onSelectDocument(){}});
const props=()=>({identity:'WC44 - Exact Review',contractPath:'project-state:work',reportStatus:'revision 1 | completed',reportPath:'project-state:report',decision:decision()});
test('Review & Validation renders Implementer Report by default in a compact document pane',()=>{
 const markup=render(React.createElement(WorkCardReviewValidationShell,props()));
 for(const text of ['work-card-report-evidence-strip','WC44 - Exact Review','Decision ownership','Architect review advisory; Operator decision creates validation basis.','Read / Freshness','# Implementer Report','Documents','Tester','Criteria','Decision'])assert.ok(markup.includes(text),text);
 assert.match(markup,/aria-selected="true" class="document-choice selected"[^>]*><span>Implementer Report<\/span>/);
 assert.doesNotMatch(markup,/Operator validation notes|Validate Passed|Request Repair/);
 assert.ok(markup.indexOf('>Documents<')<markup.indexOf('>Tester<')&&markup.indexOf('>Criteria<')<markup.indexOf('>Decision<'));
});
test('Review & Validation renders Approved Work Card tab content and missing document errors inline',()=>{
 const p=props();p.decision={...p.decision,selectedDocumentId:'formal',selectedDocumentLabel:'Approved Work Card',selectedDocumentBody:'# Approved Work Card',documentError:'Exact report unavailable',canValidatePassed:false};
 const markup=render(React.createElement(WorkCardReviewValidationShell,p));assert.match(markup,/# Approved Work Card/);assert.match(markup,/class="document-error"/);assert.doesNotMatch(markup,/Validate Passed|Request Repair/);
});
test('Review & Validation controls preserve advisory read-only and browser proof slot placement',()=>{
 const p=props();p.decision.advisoryField={label:'Advisory Architect summary',value:'SQL advice',readOnly:true};p.browserPanel=React.createElement('div',{className:'figma-browser-column'},'ChatGPT');p.proofActions=React.createElement('section',null,'Independent Tester');
 const markup=render(React.createElement(WorkCardReviewValidationShell,p));assert.doesNotMatch(markup,/SQL advice|Independent Tester/);assert.ok(markup.indexOf('work-card-report-review-workspace')<markup.indexOf('figma-browser-column'));assert.doesNotMatch(markup,/Select disposition|Run Codex Implementer/);
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
  let context=draw('work',true);assert.equal(context.decision.canValidatePassed,false);assert.equal(context.decision.canRequestRepair,false);context.decision.onValidatePassed();context.decision.onRequestRepair();context.prepare();await new Promise(setImmediate);assert.equal(calls.length,0);for(const slot of ['formal','advisory','validation','report']){context.decision.onSelectDocument(slot);assert.equal(values[8],slot);}assert.equal(context.proofActions.props.busy,true);let ran=false;await context.proofActions.props.action(async()=>{ran=true});assert.equal(ran,false);const actions=React.Children.toArray(context.documentActions.props.children);assert.ok(actions.every(button=>!button.props.disabled));
  context=draw();assert.equal(context.decision.canValidatePassed,true);context.decision.onRequestRepair();await new Promise(setImmediate);
  assert.deepEqual(calls,[['prepare','wf','work'],['review','wf','work',{cycleId:'cycle',expectedRecordVersion:7,outcome:'RequestRepair',operatorNotes:'Operator notes',repairDefectText:'Defect'}],['repair','wf','work','decision']]);assert.deepEqual(repairs,['repair-exact']);assert.equal(closed,0);
  calls=[];values[0]={...review,validation:{...review.validation,completion:{eligible:false,blockers:['criterion-missing']}}};context=draw();assert.equal(context.decision.canValidatePassed,false);context.decision.onValidatePassed();await new Promise(setImmediate);assert.equal(calls.length,0);
  values[0]=review;values[7]='';context=draw();assert.equal(context.decision.canRequestRepair,false);context.decision.onValidatePassed();await new Promise(setImmediate);assert.equal(closed,1);assert.equal(calls[1][3].outcome,'ValidatePassed');
  context=draw('peer');assert.equal(context.decision.canValidatePassed,false);assert.equal(context.decision.canRequestRepair,false);
 }finally{Object.assign(React,original);global.window=oldWindow;}
});

function nodes(x){return !x||typeof x!=='object'?[]:[x,...React.Children.toArray(x.props?.children).flatMap(nodes)];}
test('local workspace tabs mount only the active body and leave document selection inside Documents',()=>{
 const old=React.useState;let state={key:undefined,tab:'Documents'};React.useState=()=>[state,value=>state=value];
 const p=props();p.testerActions=React.createElement('section',null,'Independent Tester');p.criteriaActions=React.createElement('section',null,'Criterion proof');p.decision.advisoryField={label:'Architect advice',value:'RequestRepair: SQL advice',readOnly:true};
 try{
  const draw=()=>WorkCardReviewValidationShell(p);
  const choose=tab=>nodes(draw()).find(n=>n.props?.role==='tab'&&n.props.children===tab).props.onClick();
  for(const [tab,expected] of [['Tester','Independent Tester'],['Criteria','Criterion proof'],['Decision','Operator validation notes'],['Documents','# Implementer Report']]){
   choose(tab);const element=draw(),markup=render(element);assert.equal(nodes(element).filter(n=>n.props?.role==='tabpanel').length,1);assert.ok(markup.includes(expected));
   if(tab==='Decision'){assert.match(markup,/readonly=""/);assert.match(markup,/Validate Passed/);assert.match(markup,/Request Repair/);assert.doesNotMatch(markup,/document-preview/);}
   else assert.doesNotMatch(markup,/Validate Passed|Request Repair/);
   assert.equal(markup.includes('architect-document-selector" role="tablist"'),tab==='Documents');
  }
  choose('Decision');p.contextKey='another-work-item';assert.ok(render(draw()).includes('# Implementer Report'));
 }finally{React.useState=old;}
});
test('shared review browser bar presents advisory actions with refresh and recovery',()=>{
 const {WorkflowCandidateBrowserActions}=load('src/renderer/app/WorkflowCandidateBrowserActions.tsx');const calls=[];
 const element=WorkflowCandidateBrowserActions({prepareHandoffLabel:'Prepare Advisory Handoff',copyHandoffLabel:'Copy Advisory Handoff',canPrepareHandoff:false,canCopyHandoff:true,showRetryButton:true,onPrepareHandoff:()=>calls.push('prepare'),onCopyHandoff:()=>calls.push('copy'),onRefresh:()=>calls.push('refresh'),onReloadBrowser:()=>calls.push('reload'),onRetryBrowser:()=>calls.push('retry')});
 const markup=render(element);for(const label of ['Reload ChatGPT','Prepare Advisory Handoff','Copy Advisory Handoff','Refresh','Retry Browser'])assert.ok(markup.includes(label));assert.match(markup,/figma-browser-actions-panel/);
 const buttons=nodes(element).filter(n=>n.type==='button');assert.equal(buttons[1].props.disabled,true);buttons[2].props.onClick();buttons[3].props.onClick();assert.deepEqual(calls,['copy','refresh']);
});

test('tabbed Tester and Criteria controls retain exact service calls and disable mutations during inspection',async()=>{
 const {WorkItemProofActions}=load('src/renderer/app/WorkCardReviewValidationWorkspace.tsx');const old={useState:React.useState,useEffect:React.useEffect},oldWindow=global.window;let index=0,calls=[],repairs=[];
 const selection={model:'fixture-model',reasoningEffort:'high'},runtime={selection,catalog:[{id:'fixture',model:'fixture-model',displayName:'Fixture',supportedReasoningEfforts:['high']}],busy:false,updateState:'up-to-date'};
 React.useEffect=()=>{};React.useState=initial=>{const values=[runtime,null,false,'','Observed exact proof','pass','approved',{}];return[values[index++]??initial,()=>{}];};
 const names=['startWorkflowWorkItemTester','cancelWorkflowWorkItemTester','validateDeterministicWorkflowCriterion','validateSemanticWorkflowCriterion','recordWorkflowWorkItemVisualCriterion','recordWorkflowWorkItemCriterionDecision','createWorkflowRepair'];global.window={champcity:Object.fromEntries(names.map(name=>[name,async(...args)=>{calls.push([name,...args]);return{repair:{id:'criterion-repair'}};}]))};
 const review={validation:{implementationRecordId:'result',testerResultId:'tester',completion:{eligible:false,blockers:['proof required']},criteria:['deterministic','semantic_ai','visual_human','operator_decision'].map((policy,i)=>({criterion:{id:'c'+i,recordVersion:2,body:{statement:policy}},policy,outcome:i===0?'fail':'pending',repairable:i===0,validationIds:i===0?['failed-proof']:[]}))},testers:[{id:'tester',body:{recommendation:'pass',rationale:'Independent check',determinationEvidence:['Observed test result']}}]};
 const draw=(mode,busy=false,running=false)=>{index=0;return WorkItemProofActions({mode,busy,workflowId:'wf',workItemId:'work',review,tester:{state:running?'running':'ready',eventTail:['Tester event']},action:async work=>{if(!busy)await work();},onRepair:id=>repairs.push(id)});};
 const click=(element,label)=>nodes(element).find(n=>n.type==='button'&&n.props.children===label).props.onClick();
 try{
  let element=draw('tester');assert.match(render(element),/Observed test result/);assert.doesNotMatch(render(element),/<h3>Criterion proof/);click(element,'Run Tester');click(draw('tester',false,true),'Cancel Tester');
  element=draw('criteria');assert.doesNotMatch(render(element),/Run Tester|Tester event/);for(const label of ['Run deterministic Validator','Run semantic Validator','Record Operator visual Validation','Record Operator Decision','Create Repair'])click(element,label);await new Promise(setImmediate);
  assert.deepEqual(calls[0],['startWorkflowWorkItemTester','wf','work','result',selection]);assert.deepEqual(calls[1],['cancelWorkflowWorkItemTester','wf','work','result']);assert.deepEqual(calls[2],['validateDeterministicWorkflowCriterion','wf','work','c0']);assert.deepEqual(calls[3],['validateSemanticWorkflowCriterion','wf','work','c1',selection]);assert.equal(calls[4][1].criterionId,'c2');assert.equal(calls[5][1].criterionId,'c3');assert.deepEqual(calls[6],['createWorkflowRepair','wf','work','failed-proof']);assert.deepEqual(repairs,['criterion-repair']);
  for(const mode of ['tester','criteria'])assert.ok(nodes(draw(mode,true)).filter(n=>n.type==='button').every(n=>n.props.disabled));
 }finally{Object.assign(React,old);global.window=oldWindow;}
});
