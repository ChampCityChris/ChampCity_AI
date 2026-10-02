import fs from "node:fs";
import path from "node:path";
import type {CloseAdvanceProjection, CloseAdvanceRequest, CloseAdvanceScope} from "../../shared/closeAdvanceContracts";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createWorkflowExecutionApplicationService} from "./workflowExecutionApplicationService";
const operator = {principalId:"local-operator", principalType:"human" as const, role:"Operator"};
export function createStructuredCloseAdvanceService() {
  const execution = createWorkflowExecutionApplicationService();
  async function withState<T>(root:string, action:(store:ReturnType<typeof createSQLiteProjectStateStore>,projectId:string,state:ReturnType<typeof createProjectStateService>)=>Promise<T>) {
    const canonical=fs.realpathSync(root),projectId=selectedCurrentProjectId(canonical,{includeClosed:true});
    if(!projectId)throw Error("Registered SQL Project required.");
    const store=createSQLiteProjectStateStore(path.join(canonical,".champcity","project-state.sqlite"));
    try{return await action(store,projectId,createProjectStateService(store,operator));}finally{store.close();}
  }
  async function get(root:string,workflowId:string,scope:CloseAdvanceScope,entityId:string):Promise<CloseAdvanceProjection> {
    if(!["work-item","phase","workflow"].includes(scope))throw Error("Exact close scope required.");
    return withState(root,async(store,projectId,state)=>{
      const terminal=await store.getEntity(projectId,workflowId);
      if(scope==="workflow"&&terminal?.entityType==="Workflow"&&terminal.lifecycleState==="closed"&&entityId===workflowId){
        const project=await store.getProject(projectId);
        if(terminal.body.workflowType==="project-creation"&&project?.lifecycleState!=="closed")throw Error("Project lifecycle closure is missing.");
        return {workflowId,entityId,expectedVersion:terminal.recordVersion,scope,label:terminal.body.workflowType==="project-creation"?"Project":"Workflow",closed:true,eligible:false,blockers:[],sourceMode:(await store.listEntities(projectId,"SourceBinding")).some(binding=>binding.entityType==="SourceBinding"&&binding.body.workflowId===workflowId)?"source-backed":"source-neutral",next:{workspaceId:"workflow-hub",label:"Workflows Hub"},criteria:[]};
      }
      const plan=await state.getWorkflowExecutionPlan(projectId,workflowId),workflow=plan.workflow;
      const record=scope==="workflow"?workflow:scope==="phase"?plan.phases.find(phase=>phase.phaseId===entityId||phase.record.body.phaseKey===entityId)?.record:[...plan.directWorkItems,...Object.values(plan.workItemsByPhase).flat()].find(work=>work.id===entityId);
      if(!record||scope!=="phase"&&record.id!==entityId)throw Error("Exact SQL close target is not owned by this Workflow.");
      entityId=record.id;
      const closed=record.lifecycleState==="closed",projectCreation=workflow.body.workflowType==="project-creation";
      const project=await store.getProject(projectId);
      const bindings=(await store.listEntities(projectId,"SourceBinding")).filter(binding=>binding.entityType==="SourceBinding"&&binding.lifecycleState==="active"&&binding.body.workflowId===workflowId);
      const sourceMode=bindings.length?"source-backed" as const:"source-neutral" as const;
      let blockers:string[]=[],next:CloseAdvanceProjection["next"]={workspaceId:"workflow-hub",label:"Workflows Hub"};
      if(!closed){
        if(scope==="work-item")blockers=(await execution.getWorkItemValidationProjection(root,workflowId,entityId)).completion.blockers;
        else if(scope==="phase")blockers=(await execution.getPhaseValidationProjection(root,workflowId,entityId)).completion.blockers;
        else blockers=(await execution.getWorkflowExecutionCompletionProjection(root,workflowId)).blockers;
      }
      const works=[...plan.directWorkItems,...Object.values(plan.workItemsByPhase).flat()];
      const edges=(await store.listRelationships(projectId)).filter(edge=>!edge.endedAt);
      const currentPhase=scope==="phase"?plan.phases.find(phase=>phase.phaseId===entityId):plan.phases.find(phase=>phase.workItemIds.includes(entityId));
      if(scope==="work-item"){
        const sibling=(currentPhase?works.filter(work=>currentPhase.workItemIds.includes(work.id)):works).find(work=>work.id!==entityId&&!["closed","cancelled"].includes(work.body.workState)&&edges.filter(edge=>edge.relationshipType==="depends_on"&&edge.fromEntityId===work.id).every(edge=>edge.toEntityId===entityId||works.some(item=>item.id===edge.toEntityId&&item.body.workState==="closed")));
        next=sibling?{workspaceId:"workflow-execution",entityId:sibling.id,label:"Next WorkItem"}:currentPhase?{workspaceId:"phase-validation",entityId:currentPhase.phaseId,label:"Phase validation"}:{workspaceId:"workflow-execution",entityId:workflowId,label:"Workflow completion"};
      }else if(scope==="phase"){
        const phase=plan.phases.find(phase=>phase.phaseId!==entityId&&phase.record.body.phaseState!=="closed"&&edges.filter(edge=>edge.relationshipType==="depends_on"&&edge.fromEntityId===phase.phaseId).every(edge=>edge.toEntityId===entityId||plan.phases.some(item=>item.phaseId===edge.toEntityId&&item.record.body.phaseState==="closed")));
        next=phase?{workspaceId:projectCreation?"phase-interview":"workflow-execution",entityId:phase.phaseId,label:"Next Phase"}:{workspaceId:"workflow-execution",entityId:workflowId,label:projectCreation?"Project validation":"Workflow completion"};
      }else if(!closed&&sourceMode==="source-backed")next={workspaceId:"workflow-execution",entityId:workflowId,label:"Exact source integration"};
      const criteria:CloseAdvanceProjection["criteria"]=[];
      if(scope==="workflow"&&projectCreation&&!closed){
        const cycles=(await store.listEntities(projectId,"ProjectPlanningReviewCycle")).filter(cycle=>cycle.entityType==="ProjectPlanningReviewCycle"&&cycle.lifecycleState==="active"&&cycle.body.workflowId===workflowId);
        if(cycles.length!==1)throw Error("Exact Project Planning review required.");
        const review=await state.getProjectPlanningReview(projectId,cycles[0].id);
        const latestImplementationIds=new Set((await Promise.all(works.map(work=>state.getImplementationAttempts(projectId,work.id)))).map(attempts=>attempts.at(-1)?.id));
        const testerIds=(await store.listEntities(projectId,"TesterResult")).filter(tester=>tester.entityType==="TesterResult"&&tester.body.workflowId===workflowId&&latestImplementationIds.has(tester.body.implementationRecordId)&&["not-required","committed"].includes(tester.body.checkpointState)).map(tester=>tester.id);
        for(const criterion of (await store.listEntities(projectId)).filter(record=>cycles[0].entityType==="ProjectPlanningReviewCycle"&&cycles[0].body.layout.memberIds.includes(record.id))){if(criterion.entityType!=="Criterion"||criterion.body.criticality!=="required")continue;
          const decision=criterion.body.validationPolicy==="operator_decision"?await state.getCriterionOperatorDecisionStatus(projectId,criterion.id,testerIds):null;
          const satisfied=decision?decision.current&&["approved","accepted"].includes(decision.state):(await state.getCriterionValidationStatus(projectId,criterion.id,bindings[0]?.entityType==="SourceBinding"?bindings[0].body.currentRevisionId:undefined)).satisfied;
          criteria.push({id:criterion.id,recordVersion:criterion.recordVersion,statement:criterion.body.statement,policy:criterion.body.validationPolicy,satisfied});
        }
      }
      if(scope==="workflow"&&projectCreation&&closed&&project?.lifecycleState!=="closed")throw Error("Project lifecycle closure is missing.");
      return {workflowId,entityId,expectedVersion:record.recordVersion,scope,advanceReady:closed||scope==="workflow"&&workflow.body.currentWorkspace==="integration-ready",label:scope==="workflow"&&projectCreation?"Project":scope==="work-item"?"WorkItem":scope==="phase"?"Phase":"Workflow",closed,eligible:!closed&&blockers.length===0,blockers,sourceMode,next,criteria};
    });
  }
  async function close(root:string,input:CloseAdvanceRequest) {
    if(!input||!["Close","DoNotClose"].includes(input.outcome)||typeof input.rationale!=="string"||!input.rationale.trim()||input.rationale.length>4000)throw Error("Explicit close disposition and bounded rationale required.");
    const view=await get(root,input.workflowId,input.scope,input.entityId);
    if(view.closed||view.expectedVersion!==input.expectedVersion)throw Error("Close target revision is stale or already closed.");
    if(input.outcome==="Close"){
      if(!view.eligible)throw Error(`Close is blocked: ${view.blockers.join(", ")}.`);
      if(input.scope==="work-item")await execution.completeWorkItem(root,input.workflowId,input.entityId,input.expectedVersion);
      else if(input.scope==="phase")await execution.completePhase(root,input.workflowId,input.entityId,input.expectedVersion);
      else await execution.completeWorkflowExecution(root,input.workflowId,input.expectedVersion);
    }
    await withState(root,(_store,projectId,state)=>state.recordDecision(projectId,input.entityId,{decisionType:"lifecycle-close",outcome:input.outcome==="Close"?"accepted":"advisory",decisionScope:`lifecycle-close:${input.entityId}@${input.expectedVersion}`,rationale:input.rationale}));
    return get(root,input.workflowId,input.scope,input.entityId);
  }
  async function projectCriterion(root:string,input:{workflowId:string;criterionId:string;expectedCriterionVersion:number;expectedWorkflowVersion:number;outcome:"approved"|"rejected"|"pass"|"fail";rationale:string}){
    const view=await get(root,input.workflowId,"workflow",input.workflowId),criterion=view.criteria.find(entry=>entry.id===input.criterionId);
    if(!criterion||view.closed||view.expectedVersion!==input.expectedWorkflowVersion||criterion.recordVersion!==input.expectedCriterionVersion||view.blockers.some(blocker=>blocker.startsWith("phase-"))||!input.rationale?.trim()||input.rationale.length>4000)throw Error("Exact current Project Criterion after Phase closure required.");
    await withState(root,async(_store,projectId,state)=>{
      if(criterion.policy==="operator_decision"&&["approved","rejected"].includes(input.outcome))return state.recordCriterionOperatorDecision(projectId,criterion.id,{expectedCriterionVersion:criterion.recordVersion,outcome:input.outcome as "approved"|"rejected",rationale:input.rationale},{workflowId:input.workflowId,project:true});
      if(["visual_human","deferred_visual_phase"].includes(criterion.policy)&&["pass","fail"].includes(input.outcome))return state.recordValidation(projectId,criterion.id,{validationType:"project-criterion",method:"Explicit Operator visual observation",validationMode:"visual_human",outcome:input.outcome as "pass"|"fail",summary:input.rationale,targetRecordVersion:criterion.recordVersion,...(view.sourceMode==="source-backed"?{sourceBaselineRef:(await execution.getExecutionProjection(root,input.workflowId)).source.currentRevisionId!}:{})});
      throw Error("Project Criterion policy requires independent validation rather than this Operator action.");
    });return get(root,input.workflowId,"workflow",input.workflowId);
  }
  return {get,close,projectCriterion};
}
