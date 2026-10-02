import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {createWorkflowExecutionApplicationService} from "../workflow/workflowExecutionApplicationService";
import {listPlanningDocuments,evaluateDocumentFreshness} from "../documents/planningDocumentService";
import {createStructuredWorkItemPlanningService} from "../workCardPlanning/structuredWorkItemPlanningService";
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
  /** Controlled metadata adopts exact existing SQL identities; prose cannot mint pass/fail or repair scope. */
  async function migrate(root:string,workflowId:string,workItemId:string) {
    const current=await get(root,workflowId,workItemId),documents=listPlanningDocuments(root).filter(document=>["validation-record","repair-work-card","implementer-report"].includes(document.metadata.artifactType ?? "")&&document.metadata.canonical?.identity.workItemId===workItemId&&document.documentReadState==="readable"&&evaluateDocumentFreshness(root,document.logicalDocumentId).state==="fresh"&&document.metadata.canonical?.workflowData.structuredReviewIdentity);
    if(documents.length>1)throw Error("Ambiguous controlled review metadata; submit fresh SQL evidence.");
    const document=documents[0];if(!document)return current;
    const supplied=document.metadata.canonical!.workflowData.structuredReviewIdentity as Record<string,unknown>;
    if(!supplied||typeof supplied!=="object"||Array.isArray(supplied)||Object.keys(supplied).some(key=>!["workflowId","workItemId","implementationRecordId","testerResultId","validationId","repairParentId","failureEvidenceId","workItemContract"].includes(key))||supplied.workflowId!==workflowId||supplied.workItemId!==workItemId||supplied.implementationRecordId!==current.validation.implementationRecordId||supplied.testerResultId!==current.validation.testerResultId)throw Error("Controlled review metadata does not match the exact current SQL attempt/Tester.");
    if(supplied.validationId!==undefined&&!current.validations.some(record=>record.id===supplied.validationId&&current.validation.criteria.some(entry=>entry.validationIds.at(-1)===record.id)))throw Error("Controlled Validation identity is missing or stale.");
    if(document.metadata.artifactType==="repair-work-card") {
      if(!current.repairs.some(edge=>edge.repairId===workItemId&&edge.parentId===supplied.repairParentId)||typeof supplied.failureEvidenceId!=="string"||!current.workItem.body.objective.includes(supplied.failureEvidenceId))throw Error("Controlled Repair lineage/evidence is not exact.");
      if(supplied.workItemContract&&!current.workItem.body.contractRevision) {
        const planning=createStructuredWorkItemPlanningService();const saved=await planning.save(root,workflowId,workItemId,JSON.stringify(supplied.workItemContract));
        if(document.effectiveDisposition==="Approved")await planning.review(root,workflowId,workItemId,{expectedRecordVersion:saved.workItem.recordVersion,outcome:"approved",notes:"Adopt exact controlled Repair contract metadata."});
      }
    }
    const digest=createHash("sha256").update(JSON.stringify(document.metadata.canonical)).digest("hex");
    await withStore(root,async(store,projectId)=>{const edges=await store.listRelationships(projectId,"supports"),evidence=await store.listEntities(projectId,"Evidence");if(evidence.some(record=>record.entityType==="Evidence"&&record.body.evidenceType==="controlled-review-import"&&record.body.digest===digest&&edges.some(edge=>!edge.endedAt&&edge.fromEntityId===record.id&&edge.toEntityId===workItemId)))return;
      await createProjectStateService(store,operator).recordEvidence(projectId,workItemId,{evidenceType:"controlled-review-import",description:"Adopt exact controlled SQL review identities; historical prose remains projection-only",mediaType:"text/markdown",payloadRef:`repository:${encodeURIComponent(document.markdownPath)}`,digest});});
    return get(root,workflowId,workItemId);
  }
  return {get,migrate};
}
