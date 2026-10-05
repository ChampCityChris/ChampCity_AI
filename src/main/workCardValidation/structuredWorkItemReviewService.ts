import {workflowCandidateHandoff} from "../integrations/workflowCandidateHandoff";
import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {createWorkflowExecutionApplicationService} from "../workflow/workflowExecutionApplicationService";
import type {StructuredWorkItemReview} from "../../shared/structuredWorkItemReviewContracts";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";
const operator={principalId:"local-operator",principalType:"human" as const,role:"Operator"};
const label = (key:string) => key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,value=>value.toUpperCase());
/** Lossless semantic detail for inspection; no raw record JSON in generated documents. */
function facts(value:unknown, indent=""):string {
  if(value===null||value===undefined)return "None";
  if(Array.isArray(value))return value.length?value.map((entry,index)=>typeof entry==="object"&&entry!==null?`${indent}- Item ${index+1}:\n${facts(entry,indent+"  ")}`:`${indent}- ${facts(entry)}`).join("\n"):"None";
  if(typeof value==="object")return Object.entries(value).map(([key,entry])=>`${indent}- ${label(key)}:${typeof entry==="object"&&entry!==null&&Object.keys(entry).length?"\n"+facts(entry,indent+"  "):" "+facts(entry)}`).join("\n");
  return String(value);
}
const section=(title:string,value:unknown)=>`## ${title}\n\n${facts(value)}`;
const recommendation=(value:string)=>value==="ValidatePassed"?"Validate Passed":value==="RequestRepair"?"Request Repair":value;
export function createStructuredWorkItemReviewService() {
  async function withStore<T>(root:string,work:(store:ReturnType<typeof createSQLiteProjectStateStore>,projectId:string)=>Promise<T>) {
    const canonical=fs.realpathSync(root),projectId=selectedCurrentProjectId(canonical, {includeClosed: true});if(!projectId)throw Error("Selected SQL Project required.");
    const store=createSQLiteProjectStateStore(path.join(canonical,".champcity","project-state.sqlite"));try{return await work(store,projectId);}finally{store.close();}
  }
  async function get(root:string,workflowId:string,workItemId:string):Promise<StructuredWorkItemReview> {
    const validation=await createWorkflowExecutionApplicationService().getWorkItemValidationProjection(root,workflowId,workItemId);
    return withStore(root,async(store,projectId)=>{
      const workItem=await store.getEntity(projectId,workItemId);if(workItem?.entityType!=="WorkItem")throw Error("Exact SQL WorkItem required.");
      const state=createProjectStateService(store,operator),implementations=await state.getImplementationAttempts(projectId,workItemId),edges=(await store.listRelationships(projectId)).filter(edge=>!edge.endedAt);
      const implementationIds=new Set(implementations.map(record=>record.id)),criterionIds=new Set(validation.criteria.map(entry=>entry.criterion.id)),targets=new Set([workItemId,...implementationIds,...criterionIds]);
      const testers=(await store.listEntities(projectId,"TesterResult")).filter((record):record is ProjectStateRecord<"TesterResult">=>record.entityType==="TesterResult"&&record.body.workflowId===workflowId&&record.body.workItemId===workItemId&&implementationIds.has(record.body.implementationRecordId));testers.forEach(record=>targets.add(record.id));
      const validations=(await store.listEntities(projectId,"Validation")).filter((record):record is ProjectStateRecord<"Validation">=>record.entityType==="Validation"&&criterionIds.has(record.body.targetEntityId)&&!!record.body.implementationRecordId&&implementationIds.has(record.body.implementationRecordId));validations.forEach(record=>targets.add(record.id));
      const linked=(type:string,id:string)=>edges.some(edge=>edge.relationshipType===type&&edge.fromEntityId===id&&targets.has(edge.toEntityId));
      const evidence=(await store.listEntities(projectId,"Evidence")).filter((record):record is ProjectStateRecord<"Evidence">=>record.entityType==="Evidence"&&linked("supports",record.id));
      const decisions=(await store.listEntities(projectId,"Decision")).filter((record):record is ProjectStateRecord<"Decision">=>record.entityType==="Decision"&&linked("governs",record.id));
      const checkpoints=(await store.listEntities(projectId,"SourceCheckpoint")).filter((record):record is ProjectStateRecord<"SourceCheckpoint">=>record.entityType==="SourceCheckpoint"&&record.body.workflowId===workflowId&&linked("checkpoints",record.id));
      const repairs=edges.filter(edge=>edge.relationshipType==="repairs"&&(edge.toEntityId===workItemId||edge.fromEntityId===workItemId)).map(edge=>({repairId:edge.fromEntityId,parentId:edge.toEntityId}));
      const cycle = await state.getWorkItemValidationCycle(projectId, workflowId, workItemId);
      const attempt = await state.getImplementationAttempt(projectId,workflowId,workItemId);
      const report = attempt ? await state.getImplementationAttemptReport(projectId,attempt.id) : null;
      const currentResult=implementations.find(record=>record.id===validation.implementationRecordId);
      const currentTester=testers.find(record=>record.id===validation.testerResultId);
      const repairLineage=await Promise.all(repairs.map(async lineage=>{
        const repair=await store.getEntity(projectId,lineage.repairId);
        return {...lineage,revision:repair?.recordVersion,...(repair?.entityType==="WorkItem"?{title:repair.body.title,state:repair.body.workState,objective:repair.body.objective}:{})};
      }));
      const criterionSummary={...validation,criteria:validation.criteria.map(({criterion,...proof})=>({...proof,criterionId:criterion.id,criterionRevision:criterion.recordVersion,statement:criterion.body.statement,criticality:criterion.body.criticality}))};
      const currentCheckpoints=checkpoints.filter(record=>edges.some(edge=>edge.relationshipType==="checkpoints"&&edge.fromEntityId===record.id&&(edge.toEntityId===currentResult?.id||edge.toEntityId===currentTester?.id)));
      const contract=[`# Approved Work Card: ${workItem.body.title}`,`Workflow: ${workflowId}; WorkItem: ${workItem.id}@${workItem.recordVersion}`,workItem.body.objective,
        section("Execution contract",{implementationBoundaries:workItem.body.implementationBoundaries,affectedPaths:workItem.body.affectedPaths,proofIntent:workItem.body.proofIntent}),
        section("Criteria",validation.criteria.map(entry=>({id:entry.criterion.id,revision:entry.criterion.recordVersion,...entry.criterion.body})))].join("\n\n");
      const basis=cycle?{workflowId,workItemId,implementationAttemptId:cycle.cycle.body.implementationAttemptId,implementationRecordId:cycle.cycle.body.implementationRecordId,cycleId:cycle.cycle.id,cycleRevision:cycle.cycle.recordVersion,current:cycle.current}:null;
      const advisoryMarkdown=cycle?.cycle.body.advisorySummary ? ["# Architect Advisory Review",section("Summary",cycle.cycle.body.advisorySummary),
        section("Recommendation",recommendation(cycle.cycle.body.advisoryRecommendation??"Inconclusive")),section("Blocking findings",cycle.cycle.body.advisoryBlockingFindings??[]),
        ...(cycle.cycle.body.advisoryRepairDefectText?[section("Suggested repair defect",cycle.cycle.body.advisoryRepairDefectText)]:[]),section("Review basis",basis),
        "Generated from SQL; non-authoritative advisory. Only the Operator can record disposition."].join("\n\n"):undefined;
      const reviewedSources = cycle ? await Promise.all(cycle.cycle.body.layout.sources.map(source => store.getEntityVersion(projectId,source.entityId,source.recordVersion))) : [];
      const handoff = [...workflowCandidateHandoff(fs.realpathSync(root),workflowId,"work-item-review-advisory",workItemId),
        "Review the exact current evidence below. Ask only materially unresolved questions if needed. Submit advisorySummary, advisoryBlockingFindings[], advisoryRecommendation (ValidatePassed | RequestRepair | Inconclusive), and optional advisoryRepairDefectText with workflow_toolbox.submit_stage_candidate, stage work-item-review-advisory, in the exact Workflow and WorkItem scope above. Advice never approves or completes work. Advice does not approve, close, validate, or create Repair authority. After submission tell the Operator to press Refresh.",
        contract,report?.markdown??"Implementer Report: not yet available",section("Current implementation",{attemptId:attempt?.id,attemptRevision:attempt?.recordVersion,resultId:currentResult?.id,resultRevision:currentResult?.recordVersion}),
        section("Current Tester",currentTester?{id:currentTester.id,revision:currentTester.recordVersion,...currentTester.body}:null),
        section("Criterion proof summary",criterionSummary),section("Source / checkpoints",currentCheckpoints.map(record=>({id:record.id,revision:record.recordVersion,...record.body}))),
        section("Repair lineage",repairLineage),section("Advisory cycle",basis),advisoryMarkdown??"Architect advisory: not yet submitted"].join("\n\n");
      const markdown=["# Work Card Validation Record",section("Work Card identity and state",{workflowId,workItemId,title:workItem.body.title,state:workItem.body.workState,revision:workItem.recordVersion}),
        section("Implementation attempt and result",{attemptId:attempt?.id,attemptRevision:attempt?.recordVersion,resultId:validation.implementationRecordId}),
        section("Tester recommendation and evidence",currentTester?.body??null),section("Criterion proof summary",criterionSummary),section("Source / checkpoint status",currentCheckpoints.map(record=>({id:record.id,revision:record.recordVersion,...record.body}))),
        advisoryMarkdown??section("Architect advisory","Not yet submitted"),section("Operator notes",cycle?.cycle.body.operatorNotes??null),section("Repair defect text",cycle?.cycle.body.repairDefectText??null),
        section("Aggregate disposition / currentness",cycle?{...basis,disposition:cycle.disposition}:"Not prepared"),section("Repair lineage",repairLineage),
        section("SQL review metadata and evidence",{workItem,implementations,testers,validations,evidence,decisions,checkpoints,cycle,reviewedSources,current:validation}),
        "Generated projection only. Editing or deleting this report cannot change SQL authority."].join("\n\n");
      return {workflowId,workItem,implementations,testers,validations,evidence,decisions,checkpoints,repairs,validation,cycle,handoff,markdown,advisoryMarkdown};
    });
  }
  async function prepare(root:string,workflowId:string,workItemId:string) {
    await withStore(root,async(store,projectId)=>createProjectStateService(store,operator).prepareWorkItemValidationCycle(projectId,workflowId,workItemId));
    return get(root,workflowId,workItemId);
  }
  async function advisory(root:string,workflowId:string,workItemId:string,input:import("../../shared/structuredWorkItemReviewContracts").WorkItemReviewAdvisory) {
    return withStore(root,async(store,projectId)=>createProjectStateService(store,{principalId:"architect-candidate",principalType:"agent",role:"Architect"}).prepareWorkItemValidationCycle(projectId,workflowId,workItemId,input));
  }
  async function review(root:string,workflowId:string,workItemId:string,input:import("../../shared/structuredWorkItemReviewContracts").WorkItemReviewDecisionInput) {
    return withStore(root,async(store,projectId)=>createProjectStateService(store,operator).reviewWorkItemValidationCycle(projectId,workflowId,workItemId,input));
  }
  return {get,prepare,advisory,review};
}
