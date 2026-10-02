import fs from "node:fs";
import path from "node:path";
import {createSQLiteProjectStateStore} from "../projectState/sqliteProjectStateStore";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {createProjectStateService} from "../../shared/projectState/projectStateService";
import {intakeOperator} from "./workflowIntakeState";
import {exactVersionReviewDisposition, workflowIntakeDisposition} from "../../shared/projectState/workflowIntakeDisposition";
import type {GreenfieldNavigationProjection, GreenfieldStage} from "../../shared/greenfieldNavigationContracts";
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
      if (closed) return {workflowId, currentWorkspace: "workflow-hub", currentPhaseId: null, currentWorkItemId: null, nextEligibleWorkspace: null, closed: true, reason: "Project Creation Workflow is closed in Structured Project State."};
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
      let reason: string | null = null;
      if (!intake || workflowIntakeDisposition(intake, records, relationships, outbox).state !== "approved") {
        reason = "Fresh structured Intake must be approved before Greenfield planning.";
      } else {
        const architect = current(architectCycles).filter(item => item.entityType === "ArchitectReviewCycle" && item.body.stageKind === "project-interview").at(-1);
        if (!architect || exactVersionReviewDisposition(architect, records, relationships, outbox, "architect-review", "architect-review").state !== "approved") {
          currentWorkspace = "architect-interview"; reason = "Current structured Architect Interview requires approval.";
        } else {
          const planningCycle = current(planningCycles).at(-1);
          const planningReview = planningCycle && planningCycle.entityType === "ProjectPlanningReviewCycle" ? await state.getProjectPlanningReview(projectId, planningCycle.id) : null;
          if (!planningReview || planningReview.disposition.state !== "approved") {
            currentWorkspace = "project-planning-review"; reason = "Current structured Project Planning requires approval.";
          } else {
            const mapCycle = current(mapCycles).at(-1);
            const mapReview = mapCycle && mapCycle.entityType === "PhaseMapReviewCycle" ? await state.getGreenfieldPhaseMap(projectId, mapCycle.id) : null;
            if (!mapReview || mapReview.disposition.state !== "approved") {
              currentWorkspace = "project-phase-map"; reason = "Current structured Phase Map requires approval.";
            } else {
              const plan = await state.getWorkflowExecutionPlan(projectId, workflowId);
              const phase = [...plan.phases].sort((a,b) => a.record.body.sequence - b.record.body.sequence).find(item => !["closed", "cancelled"].includes(item.record.body.phaseState));
              if (!phase) {currentWorkspace = "workflow-execution"; reason = "All SQL Greenfield Phases are complete; close the Project Creation Workflow.";}
              else {
                phaseId = phase.phaseId;
                const phaseCycles = records.filter(record => record.entityType === "PhaseReviewCycle" && record.body.workflowId === workflowId && record.body.phaseId === phase.phaseId && record.lifecycleState === "active");
                const interview = phaseCycles.find(record => record.entityType === "PhaseReviewCycle" && record.body.stageKind === "interview");
                if (!interview || exactVersionReviewDisposition(interview, records, relationships, outbox, "phase-loop-review", "phase-loop-review").state !== "approved") {
                  currentWorkspace = "phase-interview"; reason = phase.record.body.phaseState === "blocked" ? "The current Phase is blocked and requires Operator attention." : "Current Phase Interview requires approval.";
                } else {
                  const phasePlanning = phaseCycles.find(record => record.entityType === "PhaseReviewCycle" && record.body.stageKind === "planning");
                  if (!phasePlanning || exactVersionReviewDisposition(phasePlanning, records, relationships, outbox, "phase-loop-review", "phase-loop-review").state !== "approved") {
                    currentWorkspace = "phase-planning-bundle"; reason = "Current Phase Planning requires approval.";
                  } else {
                    currentWorkspace = "workflow-execution";
                    reason = "Approved Phase WorkItems use the shared execution pipeline.";
                  }
                }
              }
            }
          }
        }
      }
      return {workflowId, currentWorkspace, currentPhaseId: phaseId, currentWorkItemId: workItemId, nextEligibleWorkspace: currentWorkspace, closed: false, reason};
    } finally {store.close();}
  }
  return {get};
}
