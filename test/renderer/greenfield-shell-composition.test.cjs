const assert=require('node:assert/strict'),test=require('node:test'),React=require('react'),fs=require('node:fs'),path=require('node:path');const {loadRendererSourceModule:load}=require('./renderer-source-loader.cjs');const {composeGreenfieldStage}=load('src/renderer/app/GreenfieldStageComposition.tsx'),{GreenfieldWorkspace}=load('src/renderer/app/GreenfieldWorkspace.tsx');
function nodes(x){return !x||typeof x!=='object'?[]:[x,...React.Children.toArray(x.props?.children).flatMap(nodes)];}
const mapping={'project-intake-capture':'ProjectIntakeWorkspace','architect-interview':'GreenfieldArchitectWorkspace','project-planning-review':'StructuredProjectPlanningWorkspace','project-phase-map':'StructuredPhaseMapWorkspace','phase-interview':'PhaseInterviewWorkspace','phase-planning-bundle':'PhasePlanningWorkspace','phase-work-card-selection':'WorkCardMapWorkspace','work-card-intake':'WorkCardIntakeWorkspace','work-card-planning':'WorkCardPlanningWorkspace','work-card-building-review':'WorkCardImplementWorkspace','work-card-report-review':'WorkCardReviewValidationWorkspace','work-card-validation':'WorkCardValidationWorkspace','work-card-repair':'WorkCardRepairWorkspace','work-card-close':'WorkCardCloseWorkspace','phase-validation':'PhaseValidationWorkspace','phase-close':'PhaseCloseWorkspace','project-validation':'ProjectValidationWorkspace','project-close':'ProjectCloseWorkspace'};
const base=stage=>({workflowId:'wf',selection:{stage,phaseId:'phase',workItemId:'work',repairId:'repair'},repositoryIdentity:'Selected Project',browserPanel:React.createElement('aside',null,'Browser'),intake:{},onIntakeChange(){},resume(){},open(){},terminal(){},repair(){},onReturn(){},onRepositoryChange(){}});
test('Greenfield composes all eighteen recovered adapters with exact identities and no generic execution fallback',()=>{
 for(const [stage,name] of Object.entries(mapping)){const element=composeGreenfieldStage(base(stage));assert.equal(element.type.name,name,stage);assert.equal(element.props.workflowId,'wf');assert.equal(composeGreenfieldStage({...base(stage),readOnly:true}).props.readOnly,true);if(stage.startsWith('work-card-')&&stage!=='work-card-repair')assert.equal(element.props.workItemId,'work');if(stage==='work-card-repair')assert.equal(element.props.repairId,'repair');}
 for(const loop of [1,2,3]){const props=base('work-card-building-review');props.selection={...props.selection,phaseId:'phase-'+loop,workItemId:'work-'+loop};assert.equal(composeGreenfieldStage(props).props.workItemId,'work-'+loop);}
 assert.equal(composeGreenfieldStage({...base('work-card-building-review'),selection:{stage:'work-card-building-review',phaseId:null,workItemId:null,repairId:null}}).type,'p');
});
test('Greenfield shared review alternate Repair and terminal callbacks preserve authorized routing',()=>{const calls=[],p=base('work-card-report-review');p.open=(...args)=>calls.push(['open',...args]);p.terminal=stage=>calls.push(['terminal',stage]);p.repair=id=>calls.push(['repair',id]);p.resume=()=>calls.push(['resume']);let element=composeGreenfieldStage(p);element.props.onValidation();element.props.onClosed();element.props.onRepair('repair-exact');assert.deepEqual(calls,[['open','work-card-validation'],['terminal','work-card-close'],['repair','repair-exact']]);p.selection.stage='work-card-validation';element=composeGreenfieldStage(p);element.props.onValidation();assert.deepEqual(calls.at(-1),['open','work-card-report-review']);p.selection.stage='work-card-repair';element=composeGreenfieldStage(p);element.props.onImplement();element.props.onReview();assert.deepEqual(calls.slice(-2),[['resume'],['resume']]);p.selection.stage='phase-validation';composeGreenfieldStage(p).props.onNext();assert.deepEqual(calls.at(-1),['terminal','phase-close']);p.selection.stage='project-validation';composeGreenfieldStage(p).props.onNext();assert.deepEqual(calls.at(-1),['terminal','project-close']);});
test('Greenfield resume uses sole SQL resolver and inspection is read-only ephemeral presentation',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},old=global.window;let index=0,calls=[],effects=[],sidebarAction=null,cleanup;
 const nav={workflowId:'wf',currentWorkspace:'work-card-report-review',currentPhaseId:'phase',currentWorkItemId:'work',currentRepairId:null,parentWorkItemId:null,closed:false,reason:'Exact current review',blockers:[],completedWorkspaces:['project-intake-capture'],executionContext:{phase:{state:'active',phaseId:'phase',dependsOn:[],reason:'',loopStep:'Work Cards'},workCard:{state:'active',workCardId:'work',dispositionOrState:'validation_pending',reason:'',loopStep:'Review & Validation'}},phaseStates:[{phaseId:'phase',title:'First',state:'active'},{phaseId:'next',title:'Second',state:'planned'}],workItemStates:[{workItemId:'work',phaseId:'phase',title:'Exact',state:'validation_pending',planningEligible:false,parentWorkItemId:null}]};
 const values=[nav,{stage:'work-card-report-review',phaseId:'phase',workItemId:'work',repairId:null},'',{}],ref={current:0};React.useState=x=>{const i=index++;return[values[i]??x,v=>values[i]=typeof v==='function'?v(values[i]):v];};React.useEffect=effect=>effects.push(effect);React.useRef=()=>ref;global.window={champcity:{getGreenfieldNavigation:async id=>{calls.push(id);return nav;}}};const props={workflow:{workflowId:'wf',title:'Exact Greenfield'},repositoryIdentity:'Selected Project',browserPanel:React.createElement('aside',null,'Browser'),onReturn(){},onWorkflowContextAction:action=>sidebarAction=action};const draw=()=>{index=0;effects=[];const element=GreenfieldWorkspace(props);cleanup?.();cleanup=effects[1]();return element;};
 const {FigmaSidebar}=load('src/renderer/app/figma/FigmaSidebar.tsx');const sidebar=()=>FigmaSidebar({activeWorkspaceId:'app',isChoosing:false,projectName:'Selected Project',themeMode:'dark',workspace:{ok:false},workflowContextAction:sidebarAction});const clickResume=()=>nodes(sidebar()).find(x=>x.type==='button'&&x.props.children==='Resume current stage').props.onClick();
 try{let element=draw();assert.equal(sidebarAction,null);assert.ok(!nodes(element).some(x=>x.type==='button'&&['Resume current stage','Workflows'].includes(x.props.children)));assert.equal(nodes(element).find(x=>x.props?.className==='greenfield-shell-host').props['data-inspection'],false);const rail=nodes(element).find(x=>typeof x.type==='function'&&x.type.name==='GreenfieldNestedWorkflowRail');assert.equal(rail.props.requiredWorkspaceId,'work-card-report-review');rail.props.onWorkspaceChange('work-card-validation');element=draw();assert.equal(sidebarAction,null);assert.equal(nodes(element).find(x=>x.props?.className==='greenfield-shell-host').props['data-inspection'],false);assert.equal(nodes(element).filter(x=>x.type==='select').length,1);rail.props.onWorkspaceChange('architect-interview');element=draw();assert.equal(nodes(element).filter(x=>x.type==='select').length,0);assert.equal(nodes(element).filter(x=>x.type==='fieldset').length,0);assert.equal(nodes(element).find(x=>x.props?.className==='greenfield-shell-host').props['data-inspection'],true);assert.equal(nodes(element).find(x=>x.type?.name==='GreenfieldArchitectWorkspace').props.browserCompanion,props.browserPanel);assert.deepEqual(calls,[]);nodes(element).find(x=>x.type?.name==='GreenfieldNestedWorkflowRail').props.onWorkspaceChange('work-card-report-review');element=draw();assert.equal(nodes(element).find(x=>x.props?.className==='greenfield-shell-host').props['data-inspection'],false);assert.equal(values[1].inspection,false);assert.equal(sidebarAction,null);
 const selectRail=stage=>{nodes(draw()).find(x=>x.type?.name==='GreenfieldNestedWorkflowRail').props.onWorkspaceChange(stage);return draw();};
 const assertInspection=expected=>{assert.equal(nodes(draw()).find(x=>x.props?.className==='greenfield-shell-host').props['data-inspection'],expected);assert.equal(!!sidebarAction,expected);};
 // Same-stage historical identities remain inspection; only exact SQL identity escapes it.
 nav.currentWorkspace='phase-planning-bundle';nav.currentWorkItemId=null;
 values[1]={stage:'phase-interview',phaseId:'next',workItemId:null,repairId:null,inspection:true};
 selectRail('phase-planning-bundle');assertInspection(true);
 nodes(draw()).find(x=>x.props?.['aria-label']==='Inspect Phase').props.onChange({target:{value:'phase'}});
 selectRail('phase-planning-bundle');assertInspection(false);assert.equal(values[1].inspection,false);
 nav.currentWorkspace='work-card-report-review';nav.currentWorkItemId='work';
 nav.workItemStates.push({...nav.workItemStates[0],workItemId:'historical',state:'closed'});
 values[1]={stage:'work-card-close',phaseId:'phase',workItemId:'historical',repairId:null,inspection:true};
 selectRail('work-card-report-review');assertInspection(true);
 nodes(draw()).find(x=>x.props?.['aria-label']==='Inspect Work Card').props.onChange({target:{value:'work'}});
 selectRail('work-card-report-review');assertInspection(false);
 nav.currentWorkspace='work-card-repair';nav.currentRepairId='repair';nav.currentWorkItemId='work';
 values[1]={stage:'work-card-repair',phaseId:'phase',workItemId:'work',repairId:'historical-repair',inspection:true};
 selectRail('work-card-repair');assertInspection(true);
 values[1].repairId='repair';selectRail('work-card-repair');assertInspection(false);
 nav.currentWorkspace='project-phase-map';nav.currentPhaseId=null;nav.currentWorkItemId=null;nav.currentRepairId=null;
 // Project stages ignore retained historical Phase/WorkItem presentation context.
 values[1]={stage:'project-phase-map',phaseId:'next',workItemId:'historical',repairId:null};assertInspection(false);
 selectRail('project-planning-review');assertInspection(true);
 selectRail('architect-interview');assertInspection(true);
 selectRail('project-phase-map');assertInspection(false);assert.equal(values[1].inspection,false);
 assert.deepEqual(calls,[],'rail/context selection performs no SQL calls');
 nav.currentWorkspace='work-card-report-review';nav.currentPhaseId='phase';nav.currentWorkItemId='work';nav.workItemStates.pop();
 for(const stage of ['project-intake-capture','architect-interview','project-planning-review','project-phase-map']){values[1]={...values[1],stage};assert.equal(nodes(draw()).filter(x=>x.type==='select').length,0,stage+' omits global inventory');}
 nav.workItemStates.push({...nav.workItemStates[0],workItemId:'prior',title:'Prior',state:'closed'});values[1]={stage:'phase-planning-bundle',phaseId:'phase',workItemId:null,repairId:null};element=draw();const selectors=nodes(element).filter(x=>x.type==='select');assert.equal(selectors.length,2);const workSelector=selectors.find(x=>x.props['aria-label']==='Inspect Work Card');assert.equal(React.Children.toArray(workSelector.props.children).filter(x=>x.props.value).length,2);workSelector.props.onChange({target:{value:'prior'}});assert.equal(values[1].workItemId,'prior');assert.equal(values[1].inspection,true);assert.deepEqual(calls,[]);nav.workItemStates.pop();values[1]={stage:'architect-interview',phaseId:'phase',workItemId:'work',repairId:null};draw();assert.match(nodes(sidebar()).find(x=>x.type==='button'&&x.props.children==='Resume current stage').props.className,/figma-sidebar-action/);clickResume();await new Promise(setImmediate);assert.deepEqual(calls,['wf']);assert.equal(values[1].stage,'work-card-report-review');element=draw();assert.equal(sidebarAction,null);const host=nodes(element).find(x=>x.props?.className==='greenfield-shell-host');host.props.children.props.children.props.onClosed();await new Promise(setImmediate);assert.match(values[2],/Terminal presentation requires/);nav.currentWorkspace='phase-work-card-selection';nav.currentWorkItemId=null;nav.workItemStates[0].state='closed';host.props.children.props.children.props.onClosed();await new Promise(setImmediate);assert.equal(values[1].stage,'work-card-close');assert.equal(values[1].workItemId,'work');draw();clickResume();await new Promise(setImmediate);assert.equal(values[1].stage,'phase-work-card-selection');draw();assert.equal(sidebarAction,null);for(let repeat=0;repeat<3;repeat++){values[1]={...values[1],stage:'architect-interview'};element=draw();assert.equal(nodes(element).find(x=>x.type?.name==='GreenfieldArchitectWorkspace').props.browserCompanion,props.browserPanel);clickResume();await new Promise(setImmediate);assert.equal(values[1].stage,nav.currentWorkspace);draw();assert.equal(sidebarAction,null);}values[1]={...values[1],stage:'architect-interview'};draw();assert.ok(sidebarAction);cleanup();assert.equal(sidebarAction,null);props.workflow={...props.workflow,workflowId:'other'};draw();assert.equal(sidebarAction,null);values[0]=null;draw();assert.equal(sidebarAction,null);}finally{Object.assign(React,original);global.window=old;}
});
test('recovered shells contain no service calls and composition contains no copied workspace chrome',()=>{for(const file of ['ProjectIntakeShell','ArchitectWorkspaceShell','ProjectPlanningReviewShell','ProjectPhaseMapShell','PhaseInterviewShell','PhasePlanningShell','WorkCardMapShell','WorkCardIntakeShell','WorkCardPlanningShell','WorkCardImplementShell','WorkCardReviewValidationShell','WorkCardValidationShell','WorkCardRepairShell','WorkCardCloseShell','PhaseValidationShell','PhaseCloseShell','ProjectValidationShell','ProjectCloseShell','NestedWorkflowRailShell']){const source=fs.readFileSync(path.resolve('src/renderer/app/'+file+'.tsx'),'utf8');assert.doesNotMatch(source,/window\.champcity|from ["'][^"']*(?:main\/|projectStateService|sqlite)/,file);}for(const file of ['GreenfieldWorkspace','GreenfieldStageComposition']){const source=fs.readFileSync(path.resolve('src/renderer/app/'+file+'.tsx'),'utf8');assert.doesNotMatch(source,/WorkflowExecutionWorkspace|StructuredPhaseLoopWorkspace|CloseAdvanceShell|workflow-execution|figma-doc-chat-workspace|FigmaDocumentCard/,file);}});

test('closed Greenfield entry stays on the SQL resolver while other terminal family dispatch is preserved',()=>{const {StructuredWorkflowWorkspace}=load('src/renderer/app/StructuredWorkflowWorkspace.tsx');const original=React.useState;React.useState=x=>[x,()=>{}];try{const props={workflow:{workflowId:'wf',workflowType:'project-creation',lifecycleState:'closed',workflowState:'closed',currentWorkspace:'workflow-hub'},repositoryIdentity:'Selected Project',browserPanel:null,onReturn(){},onOpen(){},onProgressed:async()=>{}};assert.equal(StructuredWorkflowWorkspace(props).type.name,'GreenfieldWorkspace');assert.ok(nodes(StructuredWorkflowWorkspace({...props,workflow:{...props.workflow,workflowType:'feature-capability'}})).some(element=>element.type?.name==='WorkflowInstanceWorkspace'));}finally{React.useState=original;}});

test("Greenfield cannot import the obsolete raw JSON Architect adapter",()=>{const source=fs.readFileSync(path.resolve("src/renderer/app/GreenfieldStageComposition.tsx"),"utf8");assert.doesNotMatch(source,/StructuredArchitectWorkspace/);});

// Exercise every gating adapter with delayed persistence and delayed parent resolution.
test('canonical Phase Map rail return enables disposition and persists approval before SQL progression',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef},old=global.window;
 const nav={workflowId:'wf',currentWorkspace:'project-phase-map',currentPhaseId:null,currentWorkItemId:null,currentRepairId:null,closed:false,reason:'Review Phase Map',blockers:[],completedWorkspaces:['project-planning-review','architect-interview'],executionContext:{phase:{state:'none'},workCard:{state:'none'}},phaseStates:[],workItemStates:[]};
 const model={review:{cycle:{id:'cycle',recordVersion:4},disposition:{state:'none'},markdown:'# Map',livePhases:[],phases:[]}};
 const shellValues=[nav,{stage:nav.currentWorkspace,phaseId:null,workItemId:null,repairId:null},'',{}],shellRefs=[],mapValues=[model,'','notes','',false,'',null],mapRefs=[];
 let values=shellValues,refs=shellRefs,index=0,refIndex=0,effects=[],sidebarAction=null,resolveWrite;const calls=[];
 React.useState=initial=>{const i=index++,owner=values;return[i<owner.length?owner[i]:initial,value=>owner[i]=typeof value==='function'?value(owner[i]):value];};
 React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});React.useEffect=effect=>effects.push(effect);
 global.window={champcity:{reviewStructuredPhaseMap:(...args)=>{calls.push(['persist',...args]);return new Promise(resolve=>resolveWrite=resolve);},getGreenfieldNavigation:async id=>{calls.push(['resolve',id]);return {...nav,currentWorkspace:'phase-interview',currentPhaseId:'next'};}}};
 const props={workflow:{workflowId:'wf',title:'Greenfield'},repositoryIdentity:'Selected Project',browserPanel:null,onReturn(){},onWorkflowContextAction:action=>sidebarAction=action};
 const drawShell=()=>{values=shellValues;refs=shellRefs;index=refIndex=0;effects=[];const element=GreenfieldWorkspace(props);effects[1]();return element;};
 const {StructuredPhaseMapWorkspace}=load('src/renderer/app/StructuredPhaseMapWorkspace.tsx'),{FigmaDocumentDispositionPanel}=load('src/renderer/app/FigmaDocumentDispositionPanel.tsx');
 const drawPanel=component=>{values=mapValues;refs=mapRefs;index=refIndex=0;effects=[];const shell=StructuredPhaseMapWorkspace(component.props);return FigmaDocumentDispositionPanel(shell.props.review);};
 try{
  let tree=drawShell();nodes(tree).find(n=>n.type?.name==='GreenfieldNestedWorkflowRail').props.onWorkspaceChange('project-planning-review');
  tree=drawShell();assert.ok(sidebarAction);assert.equal(nodes(tree).find(n=>n.type?.name==='StructuredProjectPlanningWorkspace').props.readOnly,true);
  nodes(tree).find(n=>n.type?.name==='GreenfieldNestedWorkflowRail').props.onWorkspaceChange('project-phase-map');
  tree=drawShell();assert.equal(sidebarAction,null);const component=nodes(tree).find(n=>n.type?.name==='StructuredPhaseMapWorkspace');assert.equal(component.props.readOnly,false);
  let panel=drawPanel(component);assert.equal(nodes(panel).find(n=>n.type==='select').props.disabled,false);assert.equal(nodes(panel).find(n=>n.type==='button').props.disabled,true,'no selection cannot apply');
  assert.deepEqual(nodes(panel).filter(n=>n.type==='option').map(n=>n.props.value),['','Approved','RevisionRequested','Rejected']);
  for(const status of ['RevisionRequested','Rejected','Approved']){nodes(panel).find(n=>n.type==='select').props.onChange({target:{value:status}});panel=drawPanel(component);assert.equal(nodes(panel).find(n=>n.type==='select').props.value,status);assert.equal(nodes(panel).find(n=>n.type==='button').props.disabled,false);}
  const apply=nodes(panel).find(n=>n.type==='button').props.onClick;apply();apply();assert.deepEqual(calls,[['persist','wf','cycle',{expectedRecordVersion:4,outcome:'approved',notes:'notes'}]]);
  panel=drawPanel(component);assert.equal(nodes(panel).find(n=>n.type==='select').props.disabled,true);assert.equal(nodes(panel).find(n=>n.type==='button').props.disabled,true);
  resolveWrite(model);await new Promise(setImmediate);assert.equal(calls.length,2);assert.deepEqual(calls[1],['resolve','wf']);assert.equal(shellValues[1].stage,'phase-interview');assert.equal(shellValues[1].phaseId,'next');assert.equal(mapValues[4],false);
 }finally{Object.assign(React,original);global.window=old;}
});

// The hook harness preserves refs across renders so same-tick double clicks are realistic.
test('Greenfield gating approvals persist then await canonical progression exactly once',async()=>{
 const original={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef,useMemo:React.useMemo},old=global.window;
 const cycle={id:'cycle',recordVersion:4},doc={logicalDocumentId:'doc',displayFilename:'REVIEW.md',metadata:{},bodyMarkdown:'# Review'};
 const phase={workflowId:'wf',phase:{id:'phase',body:{phaseKey:'P1'}},handoff:'handoff',review:{cycle,disposition:{state:'none'},markdown:'# Plan\n\n# Work Card Plan\n\nCard'}};
 const work={workflowId:'wf',workflowType:'project-creation',workItem:{id:'work',recordVersion:4,body:{contractRevision:1,workState:'planned'}},review:{disposition:{state:'none'}},markdown:'# Card',handoff:'handoff'};
 const repair={workflowId:'wf',repair:work.workItem,parent:{id:'parent',body:{objective:'Fix'}},failure:{id:'failure',entityType:'TesterResult'},planning:work,review:{markdown:'# Evidence'},markdown:'# Repair',handoff:'handoff'};
 const cases=[
  {name:'GreenfieldArchitectWorkspace',method:'reviewStructuredArchitectOutput',model:{workflowId:'wf',review:{cycleId:'cycle',recordVersion:4,disposition:{state:'none'}},reviewDocument:doc},values:m=>[m,'notes','Approved','','',false,'architect-review'],status:2,busy:5,error:3},
  {name:'StructuredProjectPlanningWorkspace',method:'reviewStructuredProjectPlanning',model:{sources:[],review:{cycleId:'cycle',recordVersion:4,disposition:{state:'none'},profileMarkdown:'# Profile',roadmapMarkdown:'# Roadmap'}},values:m=>[m,'','notes','Approved',false,'','profile',['cycle@4:profile','cycle@4:roadmap']],status:3,busy:4,error:1},
  {name:'StructuredPhaseMapWorkspace',method:'reviewStructuredPhaseMap',model:{review:{cycle,disposition:{state:'none'},markdown:'# Map',livePhases:[],phases:[]}},values:m=>[m,'','notes','Approved',false,'',null],status:3,busy:4,error:1},
  {name:'PhaseInterviewWorkspace',method:'reviewStructuredPhaseLoop',model:{...phase,stageKind:'interview'},values:m=>[m,'','notes','Approved',false,''],status:3,busy:4,error:1},
  {name:'PhasePlanningWorkspace',method:'reviewStructuredPhaseLoop',model:{...phase,stageKind:'planning'},values:m=>[m,'','notes','Approved',false,'','planning',['cycle@4:planning','cycle@4:cards']],status:3,busy:4,error:1},
  {name:'WorkCardPlanningWorkspace',method:'reviewStructuredWorkItemPlanning',model:work,values:m=>[m,'','notes','Approved',false,''],status:3,busy:4,error:1},
  {name:'WorkCardRepairWorkspace',method:'reviewStructuredWorkItemPlanning',model:repair,values:m=>[m,'repair',false,'','','notes','Approved','Parent report'],status:6,busy:2,error:3},
 ];
 const tick=()=>new Promise(setImmediate);
 try{for(const c of cases){
  const Component=load('src/renderer/app/'+c.name+'.tsx')[c.name];
  for(const outcome of ['Approved','RevisionRequested','Rejected','persist-failure','resolver-failure']){
   const values=c.values(c.model),refs=[];let index=0,refIndex=0,writes=0,advances=0,resolveWrite,rejectWrite,resolveNext;
   values[c.status]=outcome.endsWith('failure')?'Approved':outcome;
   React.useState=initial=>{const i=index++;return[i<values.length?values[i]:initial,value=>values[i]=typeof value==='function'?value(values[i]):value];};
   React.useEffect=()=>{};React.useMemo=f=>f();React.useRef=initial=>refs[refIndex++]??(refs[refIndex-1]={current:initial});
   global.window={champcity:{[c.method]:()=>{writes++;return new Promise((resolve,reject)=>{resolveWrite=resolve;rejectWrite=reject;});},getStructuredRepairWorkspace:async()=>repair,getImplementationAttempt:async()=>({markdown:'Parent report'})}};
   const advance=async()=>{advances++;if(outcome==='resolver-failure')throw Error('Canonical refresh failed');await new Promise(resolve=>resolveNext=resolve);};
   const props={workflowId:'wf',phaseId:'phase',workItemId:'work',repairId:'work',browserVisible:true,browserPanel:React.createElement('aside',null,'Browser'),browserCompanion:React.createElement('aside',null,'Browser'),onNext:advance,onImplement:advance,onReview(){},onParent(){}};
   const draw=extra=>{index=0;refIndex=0;return Component({...props,...extra});};
   const element=draw();
   const review=element.props.review??nodes(element.props.reviewControls??element.props.repairReviewPanel).find(n=>n.type?.name==='FigmaDocumentDispositionPanel')?.props;
   assert.ok(review?.canApply,c.name);
   const inspected=draw({readOnly:true});
   const inspectionReview=inspected.props.review??nodes(inspected.props.reviewControls??inspected.props.repairReviewPanel).find(n=>n.type?.name==='FigmaDocumentDispositionPanel')?.props;
   assert.equal(inspectionReview.canApply,false,c.name+' inspection blocks disposition');
   inspectionReview.onApply();assert.equal(writes,0,c.name+' callback blocks persistence');
   if(inspected.props.document?.onSelectSlot){const slot=c.name==='StructuredProjectPlanningWorkspace'?'roadmap':c.name==='PhasePlanningWorkspace'?'cards':'intake';inspected.props.document.onSelectSlot(slot);const selected=draw({readOnly:true});assert.equal(selected.props.document.selectedSlotId,slot,c.name+' inspection selects documents');}
   const inspectionMarkup=require('react-dom/server').renderToStaticMarkup(inspected);
   assert.match(inspectionMarkup,/<button(?![^>]*disabled)[^>]*>[\s\S]*?Copy/,c.name+' Copy remains available');
   const browserActions=nodes(inspected.props.browserCompanion).find(n=>n.props?.canPrepareHandoff!==undefined);
   if(browserActions){assert.equal(browserActions.props.canPrepareHandoff,false);assert.equal(browserActions.props.canCopyHandoff,!!c.model.handoff);}
   review.onApply();review.onApply();
   assert.equal(writes,1,c.name+' locks same-tick duplicates');assert.equal(advances,0,c.name+' waits for persistence');assert.equal(values[c.busy],true);
   if(outcome==='persist-failure')rejectWrite(Error('Persistence failed'));else resolveWrite(c.model);
   await tick();
   if(outcome==='Approved'){
    assert.equal(advances,1,c.name);assert.equal(values[c.busy],true,c.name+' waits for resolver');
    review.onApply();assert.equal(writes,1);resolveNext();await tick();
   }else if(outcome==='resolver-failure'){assert.equal(advances,1);assert.match(values[c.error],/Canonical refresh failed/);}
   else {assert.equal(advances,0,c.name+' never advances rejection/revision/failed write');if(outcome==='persist-failure')assert.match(values[c.error],/Persistence failed/);}
   assert.equal(values[c.busy],false,c.name);
   const hidden=draw({browserVisible:false});
   if(c.name!=='WorkCardRepairWorkspace')assert.equal(hidden.props.browserCompanion,null,c.name+' no orphan Browser Actions');
   const markup=require('react-dom/server').renderToStaticMarkup(draw());
   assert.doesNotMatch(markup,/Continue to (?:Project Planning|Phase Map|next Phase|Phase Planning|Work Card Map|Work Card Implement|Repair Implement)/,c.name);
  }
 }}finally{Object.assign(React,original);global.window=old;}
});

test('Greenfield shell geometry has one fill owner and intrinsic recovered header regions',()=>{
 const {IntakeWorkspaceShell}=load('src/renderer/app/IntakeWorkspaceShell.tsx');
 const {ProjectPlanningReviewShell}=load('src/renderer/app/ProjectPlanningReviewShell.tsx');
 const intake=IntakeWorkspaceShell({heading:'Intake',intake:null,companion:null});
 assert.equal(intake.props.className,'workspace-shell-frame');
 assert.deepEqual(React.Children.toArray(intake.props.children).map(n=>n.type),['header','section']);
 for(const blocker of [null,{reason:'Stale source',requiredAction:'Refresh',evidencePaths:[]}])for(const selectedDocument of [null,{displayFilename:'PROFILE.md'}]){
  const shell=ProjectPlanningReviewShell({label:'Planning',blocker,browserVisible:true,document:{selectedDocument},review:{},browserCompanion:null});
  assert.equal(shell.props.className,'workspace-shell-frame');
  assert.equal(React.Children.toArray(shell.props.children)[1].props.className,'figma-doc-chat-workspace');
 }
 const css=fs.readFileSync('src/renderer/styles.css','utf8');
 assert.doesNotMatch(css,/\.greenfield-shell-host\s*>\s*\*/);
 assert.match(css,/\.greenfield-shell-content\s*\{[^}]*grid-template-rows:minmax\(0, 1fr\)/);
 assert.match(css,/\.workspace-shell-frame > \.project-planning-blocker-banner\s*\{[^}]*flex:0 0 auto/);
 assert.match(css,/\.workspace-shell-frame > \.figma-doc-chat-workspace\s*\{[^}]*flex:1; height:auto/);
});

test('App grants the viewport contract only to Project Creation workflow instances',()=>{
 const {App}=load('src/renderer/app/App.tsx');
 const original={useState:React.useState,useRef:React.useRef,useEffect:React.useEffect};const old=global.window;
 try{
  global.window={localStorage:{getItem:()=>null}};React.useRef=initial=>({current:initial});React.useEffect=()=>{};
  for(const [view,workflowType,expected] of [['workflow-instance','project-creation',true],['workflow-instance','feature-capability',false],['workflow-hub','project-creation',false],['workflow-instance',null,false]]){
   let index=0;React.useState=initial=>{const i=index++;return[i===1?view:i===13?(workflowType?{workflowId:'wf',workflowType,lifecycleState:'closed'}:null):typeof initial==='function'?initial():initial,()=>{}];};
   const tree=App(),surface=nodes(tree).find(n=>n.props.className?.split(' ').includes('workspace-surface'));
   assert.equal(surface.props.className.includes('greenfield-workflow-surface'),expected,view+':'+workflowType);
   if(view==='workflow-instance'&&workflowType){assert.equal(surface.props.children.type.name,'StructuredWorkflowWorkspace');assert.equal(surface.props.children.props.workflow.workflowType,workflowType);}
  }
 }finally{Object.assign(React,original);global.window=old;}
});
