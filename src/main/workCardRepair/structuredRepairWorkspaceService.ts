import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {createStructuredWorkItemPlanningService} from "../workCardPlanning/structuredWorkItemPlanningService";
import {createStructuredWorkItemReviewService} from "../workCardValidation/structuredWorkItemReviewService";
import {createWorkflowExecutionApplicationService} from "../workflow/workflowExecutionApplicationService";
import type {StructuredRepairWorkspace} from "../../shared/structuredRepairWorkspaceContracts";

/** Exact Repair lineage read adapter, with no additional authority entity. */
export function createStructuredRepairWorkspaceService() {
 async function get(root:string,workflowId:string,repairId:string):Promise<StructuredRepairWorkspace> {
  if([workflowId,repairId].some(id=>typeof id!=="string"||!id.trim()||id.length>128))throw Error("Bounded exact Repair identities required.");
  const canonical=fs.realpathSync(root),projectId=selectedCurrentProjectId(canonical,{includeClosed:true});if(!projectId)throw Error("Selected SQL Project required.");
  const store=createSQLiteProjectStateStore(path.join(canonical,".champcity","project-state.sqlite"));
  try {
   const state=createProjectStateService(store,{principalId:"repair-reader",principalType:"system",role:"workflow-application"}),plan=await state.getWorkflowExecutionPlan(projectId,workflowId);
   const members=[...plan.directWorkItems,...Object.values(plan.workItemsByPhase).flat()];
   const repair=members.find(record=>record.id===repairId),edges=(await store.listRelationships(projectId)).filter(edge=>!edge.endedAt);
   const parents=edges.filter(edge=>edge.relationshipType==="repairs"&&edge.fromEntityId===repairId);
   const parent=parents.length===1?members.find(record=>record.id===parents[0].toEntityId):null;
   if(!repair||!parent||!["fix","repair"].includes(repair.body.workItemKind))throw Error("Exact Repair and same-Workflow parent required.");
   const owners=edges.filter(edge=>edge.relationshipType==="part_of"&&edge.fromEntityId===repairId);
   const owner=owners.length===1?await store.getEntity(projectId,owners[0].toEntityId):null;
   if(!owner||!(owner.entityType==="Workflow"&&owner.id===workflowId||owner.entityType==="Phase"&&plan.phases.some(phase=>phase.phaseId===owner.id)))throw Error("Exact Repair Phase/Workflow owner required.");
   const criterionIds=edges.filter(edge=>edge.relationshipType==="defines_criterion"&&edge.fromEntityId===repairId).map(edge=>edge.toEntityId);
   const provenance=edges.filter(edge=>edge.relationshipType==="derived_from"&&criterionIds.includes(edge.fromEntityId));
   if(provenance.length!==1)throw Error("One exact Repair failure provenance required.");
   const criterion=await store.getEntity(projectId,provenance[0].fromEntityId),failure=await store.getEntity(projectId,provenance[0].toEntityId);
   if(criterion?.entityType!=="Criterion"||!failure||!["Validation","Decision","TesterResult"].includes(failure.entityType))throw Error("Exact typed Repair Criterion/failure required.");
   let parentCycle:StructuredRepairWorkspace["parentCycle"]=null;
   if(failure.entityType==="Decision"&&failure.body.decisionType==="work-item-validation-review") {
    const governs=edges.filter(edge=>edge.relationshipType==="governs"&&edge.fromEntityId===failure.id);
    const cycle=governs.length===1?await store.getEntity(projectId,governs[0].toEntityId):null;
    if(cycle?.entityType!=="WorkItemValidationCycle"||cycle.body.workflowId!==workflowId||cycle.body.workItemId!==parent.id)throw Error("Exact parent review cycle required.");
    const version=Number(failure.body.decisionScope.split("@").at(-1));
    const reviewed=await store.getEntityVersion(projectId,cycle.id,version);
    if(reviewed?.entityType!=="WorkItemValidationCycle")throw Error("Exact reviewed parent cycle revision required.");parentCycle=reviewed;
   }
   const [planning,review]=await Promise.all([createStructuredWorkItemPlanningService().get(canonical,workflowId,repairId),createStructuredWorkItemReviewService().get(canonical,workflowId,repairId)]);
   const bindings=(await store.listEntities(projectId,"SourceBinding")).filter(record=>record.entityType==="SourceBinding"&&record.body.workflowId===workflowId&&record.lifecycleState==="active");if(bindings.length>1)throw Error("Ambiguous Repair source mode.");
   const sourceMode=bindings.length?"source-backed" as const:"source-neutral" as const;
   const markdown=["# Repair Work Card Context","SQL-derived; non-authoritative document.",JSON.stringify({workflowId,repair,parent,owner,criterion,failure,parentCycle,sourceMode},null,2),"## Current Repair Work Card",planning.markdown,"## Implementation / Tester / Validation",review.markdown,"Current SQL completion resumes an open parent at ready. Fresh parent Implementer/Tester evidence is required; Repair completion does not directly close its parent."].join("\n\n");
   const handoff=[planning.handoff,"## Exact Repair provenance",markdown].join("\n\n");
   return {workflowId,repair,parent,owner,criterion,failure,parentCycle,planning,review,sourceMode,markdown,handoff};
  } finally {store.close();}
 }
 async function createOrRecover(root:string,workflowId:string,parentId:string,failureId:string) {
  const result=await createWorkflowExecutionApplicationService().createWorkflowRepair(root,workflowId,parentId,failureId);
  return get(root,workflowId,result.repair.id);
 }
 return {get,createOrRecover};
}
