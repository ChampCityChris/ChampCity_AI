import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {createWorkflowExecutionApplicationService} from "../workflow/workflowExecutionApplicationService";
import type {StructuredWorkItemReview} from "../../shared/structuredWorkItemReviewContracts";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";
const operator={principalId:"local-operator",principalType:"human" as const,role:"Operator"};
export function createStructuredWorkItemReviewService() {
  async function withStore<T>(root:string,work:(store:ReturnType<typeof createSQLiteProjectStateStore>,projectId:string)=>Promise<T>) {
    const canonical=fs.realpathSync(root),projectId=selectedCurrentProjectId(canonical);if(!projectId)throw Error("Selected SQL Project required.");
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
      const markdown=["# Generated SQL Review / Validation report",JSON.stringify({workflowId,workItem,implementations,testers,validations,evidence,decisions,checkpoints,repairs,current:validation},null,2),"Generated projection only. Editing or deleting this report cannot change SQL authority."].join("\n\n");
      return {workflowId,workItem,implementations,testers,validations,evidence,decisions,checkpoints,repairs,validation,markdown};
    });
  }
  return {get};
}
