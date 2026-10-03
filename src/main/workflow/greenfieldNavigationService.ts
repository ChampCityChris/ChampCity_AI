import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {createWorkflowExecutionApplicationService} from "./workflowExecutionApplicationService";
import {intakeOperator} from "./workflowIntakeState";
import {exactVersionReviewDisposition, workflowIntakeDisposition} from "../../shared/projectState/workflowIntakeDisposition";
import type {GreenfieldNavigationProjection, GreenfieldStage} from "../../shared/greenfieldNavigationContracts";
import type {ExecutionContextProjection} from "../../shared/workspaceContracts";
import type {ProjectStateRecord} from "../../shared/projectState/domainContracts";

export function createGreenfieldNavigationService() {
  async function get(root: string, workflowId: string): Promise<GreenfieldNavigationProjection> {
    const canonical = fs.realpathSync(root), projectId = selectedCurrentProjectId(canonical, {includeClosed: true});
    if (!projectId) throw Error("Selected SQL Project required.");
    const store = createSQLiteProjectStateStore(path.join(canonical, ".champcity", "project-state.sqlite"));
    try {
      const workflow = await store.getEntity(projectId, workflowId);
      if (workflow?.entityType !== "Workflow" || workflow.body.workflowType !== "project-creation") throw Error("Exact Project Creation Workflow required.");
      const closed = workflow.lifecycleState !== "active" || ["closed", "cancelled"].includes(workflow.body.workflowState);
      if(closed){
        const records=await store.listEntities(projectId),edges=(await store.listRelationships(projectId)).filter(edge=>!edge.endedAt);
        const phases=records.filter((record):record is ProjectStateRecord<"Phase">=>record.entityType==="Phase"&&["active","closed"].includes(record.lifecycleState)&&edges.some(edge=>edge.relationshipType==="part_of"&&edge.fromEntityId===record.id&&edge.toEntityId===workflowId)).sort((a,b)=>a.body.sequence-b.body.sequence);
        const works=records.filter((record):record is ProjectStateRecord<"WorkItem">=>record.entityType==="WorkItem"&&["active","closed"].includes(record.lifecycleState)&&edges.some(edge=>edge.relationshipType==="part_of"&&edge.fromEntityId===record.id&&(edge.toEntityId===workflowId||phases.some(phase=>phase.id===edge.toEntityId))));
        return {workflowId,currentWorkspace:"workflow-hub",currentPhaseId:null,currentWorkItemId:null,currentRepairId:null,parentWorkItemId:null,nextEligibleWorkspace:null,closed:true,reason:"Project Creation Workflow is closed in Structured Project State.",blockers:[],completedWorkspaces:workflow.lifecycleState==="closed"?["project-intake-capture","architect-interview","project-planning-review","project-phase-map","phase-interview","phase-planning-bundle","phase-work-card-selection","phase-validation","project-validation","project-close"]:[],phaseStates:phases.map(phase=>({phaseId:phase.id,title:phase.body.title,state:phase.body.phaseState})),workItemStates:works.map(item=>({workItemId:item.id,phaseId:edges.find(edge=>edge.relationshipType==="part_of"&&edge.fromEntityId===item.id&&phases.some(phase=>phase.id===edge.toEntityId))?.toEntityId??null,title:item.body.title,state:item.body.workState,planningEligible:false,parentWorkItemId:edges.find(edge=>edge.relationshipType==="repairs"&&edge.fromEntityId===item.id)?.toEntityId??null})),executionContext:{phase:{state:"none",dependsOn:[],reason:"Closed"},workCard:{state:"none",dispositionOrState:"closed",reason:"Closed"}}};
      }
      const state = createProjectStateService(store, intakeOperator);
      const [records, relationships, outbox, intakeRecords, architectCycles, planningCycles, mapCycles] = await Promise.all([
        store.listEntities(projectId), store.listRelationships(projectId), store.listOutbox(projectId),
        store.listEntities(projectId, "WorkflowIntake"), store.listEntities(projectId, "ArchitectReviewCycle"),
        store.listEntities(projectId, "ProjectPlanningReviewCycle"), store.listEntities(projectId, "PhaseMapReviewCycle"),
      ]);
      const current = <T extends {lifecycleState: string; body: object}>(items: T[]): T[] => items.filter(item =>
        item.lifecycleState === "active" && "workflowId" in item.body && (item.body as {workflowId?: string}).workflowId === workflowId);
      const intake = current(intakeRecords).filter((record): record is ProjectStateRecord<"WorkflowIntake"> => record.entityType === "WorkflowIntake").at(-1);
      let currentWorkspace: GreenfieldStage = "project-intake-capture", phaseId: string | null = null, workItemId: string | null = null;
      let reason: string | null = null,repairId:string|null=null,parentId:string|null=null;
      const blockers:string[]=[],completedWorkspaces:GreenfieldStage[]=[],phaseStates:GreenfieldNavigationProjection["phaseStates"]=[],workItemStates:GreenfieldNavigationProjection["workItemStates"]=[];
      const executionContext:ExecutionContextProjection={phase:{state:"none",dependsOn:[],reason:""},workCard:{state:"none",dispositionOrState:"",reason:""}};
      async function readCurrent<T>(read:()=>Promise<T>):Promise<T|null>{try{return await read();}catch(error){blockers.push(String(error));return null;}}
      async function approvedPhase(cycle:ProjectStateRecord<"PhaseReviewCycle">|undefined) {if(!cycle)return false;try{return (await state.getPhaseLoopReview(projectId!,cycle.id)).disposition.state==="approved";}catch(error){blockers.push(String(error));return false;}}

      if (!intake || workflowIntakeDisposition(intake, records, relationships, outbox).state !== "approved") {
        reason = "Fresh structured Intake must be approved before Greenfield planning.";
      } else {
        completedWorkspaces.push("project-intake-capture");
        const architect = current(architectCycles).filter(item => item.entityType === "ArchitectReviewCycle" && item.body.stageKind === "project-interview").at(-1);
        if (!architect || exactVersionReviewDisposition(architect, records, relationships, outbox, "architect-review", "architect-review").state !== "approved") {
          currentWorkspace = "architect-interview"; reason = "Current structured Architect Interview requires approval.";
        } else {
          completedWorkspaces.push("architect-interview");
          const planningCycle = current(planningCycles).at(-1);
          const planningReview = planningCycle && planningCycle.entityType === "ProjectPlanningReviewCycle" ? await readCurrent(()=>state.getProjectPlanningReview(projectId, planningCycle.id)) : null;
          if (!planningReview || planningReview.disposition.state !== "approved") {
            currentWorkspace = "project-planning-review"; reason = "Current structured Project Planning requires approval.";
          } else {
            completedWorkspaces.push("project-planning-review");
            const mapCycle = current(mapCycles).at(-1);
            const mapReview = mapCycle && mapCycle.entityType === "PhaseMapReviewCycle" ? await readCurrent(()=>state.getGreenfieldPhaseMap(projectId, mapCycle.id)) : null;
            if (!mapReview || mapReview.disposition.state !== "approved") {
              currentWorkspace = "project-phase-map"; reason = "Current structured Phase Map requires approval.";
            } else {
              completedWorkspaces.push("project-phase-map");
              const plan=await state.getWorkflowExecutionPlan(projectId,workflowId),edges=relationships.filter(edge=>!edge.endedAt);
              const phases=[...plan.phases].sort((a,b)=>a.sequence-b.sequence),members=Object.values(plan.workItemsByPhase).flat();
              phaseStates.push(...phases.map(entry=>({phaseId:entry.phaseId,title:entry.record.body.title,state:entry.record.body.phaseState})));
              workItemStates.push(...members.map(item=>({workItemId:item.id,phaseId:phases.find(entry=>entry.workItemIds.includes(item.id))?.phaseId??null,title:item.body.title,state:item.body.workState,planningEligible:false,parentWorkItemId:edges.find(edge=>edge.relationshipType==="repairs"&&edge.fromEntityId===item.id)?.toEntityId??null})));
              const phase=phases.find(entry=>!["closed","cancelled"].includes(entry.record.body.phaseState));
              if(!phase) {currentWorkspace="project-validation";reason="All SQL Phases are complete. Project Validation owns integration and Project Closeout.";completedWorkspaces.push("phase-interview","phase-planning-bundle","phase-work-card-selection","phase-validation");}
              else {
                phaseId=phase.phaseId;
                executionContext.phase={state:"active",phaseId,title:phase.record.body.title,order:phase.sequence,totalPhaseCount:phases.length,purpose:phase.record.body.objective,dependsOn:edges.filter(edge=>edge.relationshipType==="depends_on"&&edge.fromEntityId===phaseId).map(edge=>edge.toEntityId),reason:""};
                const cycles=records.filter((record):record is ProjectStateRecord<"PhaseReviewCycle">=>record.entityType==="PhaseReviewCycle"&&record.body.workflowId===workflowId&&record.body.phaseId===phaseId&&record.lifecycleState==="active");
                const interview=cycles.find(record=>record.body.stageKind==="interview");
                if(!await approvedPhase(interview)) {currentWorkspace="phase-interview";reason=phase.record.body.phaseState==="blocked"?"Current Phase is blocked and requires Operator attention.":"Current Phase Interview requires approval.";}
                else {
                  completedWorkspaces.push("phase-interview");
                  if(!await approvedPhase(cycles.find(record=>record.body.stageKind==="planning"))) {currentWorkspace="phase-planning-bundle";reason="Current Phase Planning requires approval.";}
                  else {
                    completedWorkspaces.push("phase-planning-bundle");
                    const execution=await createWorkflowExecutionApplicationService().getExecutionProjection(canonical,workflowId);
                    for(const fact of workItemStates){const projected=execution.items.find(item=>item.record.id===fact.workItemId);fact.planningEligible=fact.phaseId===phaseId&&!!projected&&["planned","ready"].includes(fact.state)&&projected.eligibility.blockers.every(blocker=>blocker==="work-item-contract-review-required")&&!execution.activeWorkItemIds.some(id=>id!==fact.workItemId&&execution.items.some(item=>item.record.id===id&&item.phaseId===phaseId));}
                    const works=plan.workItemsByPhase[phaseId]??[],open=works.filter(item=>item.lifecycleState==="active"&&!["closed","cancelled"].includes(item.body.workState));
                    if(!open.length){currentWorkspace="phase-validation";reason="All exact Phase WorkItems are complete; current Phase proof and Closeout are required.";completedWorkspaces.push("phase-work-card-selection");}
                    else {
                      const repairEdges=edges.filter(edge=>edge.relationshipType==="repairs"&&works.some(item=>item.id===edge.fromEntityId)&&works.some(item=>item.id===edge.toEntityId));
                      const activeRepairs=open.filter(item=>repairEdges.some(edge=>edge.fromEntityId===item.id));
                      const repair=activeRepairs.find(item=>!activeRepairs.some(child=>repairEdges.some(edge=>edge.fromEntityId===child.id&&edge.toEntityId===item.id)));
                      const durable=open.filter(item=>!repairEdges.some(edge=>edge.fromEntityId===item.id)&&!!item.body.contractRevision);
                      const item=repair??durable.find(item=>!edges.some(edge=>edge.relationshipType==="depends_on"&&edge.fromEntityId===item.id&&works.some(prior=>prior.id===edge.toEntityId&&prior.body.workState!=="closed")));
                      if(!item){currentWorkspace="phase-work-card-selection";reason="Select an eligible SQL Work Card candidate. Selection is presentation only.";}
                      else {
                        workItemId=item.id;repairId=repair?.id??null;parentId=repair?repairEdges.find(edge=>edge.fromEntityId===repair.id)!.toEntityId:null;
                        const review=await state.getWorkItemPlanningReview(projectId,item.id);
                        const attempts=records.filter((record):record is ProjectStateRecord<"ImplementationAttempt">=>record.entityType==="ImplementationAttempt"&&record.body.workflowId===workflowId&&record.body.workItemId===item.id&&record.lifecycleState==="active"&&record.body.attemptState!=="abandoned");
                        const attempt=attempts.at(-1);
                        if(!item.body.contractRevision||review.disposition.state!=="approved") {currentWorkspace=repair?"work-card-repair":"work-card-planning";reason="Exact current Work Card planning requires approval.";}
                        else if(item.body.workState==="ready"||!attempt||["prepared","running"].includes(attempt.body.attemptState)) {currentWorkspace="work-card-building-review";reason=parentId?"Implement exact Repair with the shared execution contract.":"Current SQL WorkItem requires a fresh Implementer attempt.";}
                        else if(item.body.workState==="validation_pending"&&attempt.body.attemptState==="completed"&&!!attempt.body.implementationRecordId) {currentWorkspace="work-card-report-review";reason="Review exact completed Implementer result with current Tester and Criterion proof. Manual Validation is an alternate surface.";}
                        else {currentWorkspace="work-card-building-review";reason="Current ImplementationAttempt requires recovery or implementation attention.";}
                        executionContext.workCard={state:"active",workCardId:item.id,title:item.body.title,dispositionOrState:item.body.workState,repairId:repairId??undefined,parentWorkCardId:parentId??undefined,loopStep:currentWorkspace==="work-card-repair"?"Repair":currentWorkspace==="work-card-planning"?"Planning":currentWorkspace==="work-card-report-review"?"Review & Validation":"Implement",reason:reason??""};
                      }
                    }
                  }
                }
                executionContext.phase.loopStep=currentWorkspace==="phase-interview"?"Phase Intake":currentWorkspace==="phase-planning-bundle"?"Phase Planning":currentWorkspace==="phase-validation"?"Phase Validation":"Work Cards";
                executionContext.phase.reason=reason??"";
              }
            }
          }
        }
      }
      if(currentWorkspace==="project-validation")blockers.push(...(await state.getCloseoutEligibility(projectId,workflowId,"project",workflowId)).blockers);
      else if(currentWorkspace==="phase-validation"&&phaseId)blockers.push(...(await state.getCloseoutEligibility(projectId,workflowId,"phase",phaseId)).blockers);
      else if(currentWorkspace==="work-card-report-review"&&workItemId)blockers.push(...(await createWorkflowExecutionApplicationService().getWorkItemValidationProjection(canonical,workflowId,workItemId)).completion.blockers);
      return {workflowId,currentWorkspace,currentPhaseId:phaseId,currentWorkItemId:workItemId,currentRepairId:repairId,parentWorkItemId:parentId,nextEligibleWorkspace:currentWorkspace,closed:false,reason,blockers,completedWorkspaces,phaseStates,workItemStates,executionContext};
    } finally {store.close();}
  }
  return {get};
}
