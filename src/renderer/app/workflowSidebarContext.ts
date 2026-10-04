import {workspaceDefinitions} from "../../shared/workspaceContracts";
import type {GreenfieldNavigationProjection, GreenfieldStage} from "../../shared/greenfieldNavigationContracts";

/** Ephemeral presentation of canonical SQL navigation, independent of inspection. */
export interface WorkflowSidebarContext {
  workflowId: string;
  stage: {workspaceId: GreenfieldStage; label: string; reason: string};
  phase: {id: string; title: string; state: string; order?: number; total?: number; loopStep?: string} | null;
  phaseReason: string;
  workCard: {id: string; title: string; state: string; loopStep?: string; repairId?: string; parentId?: string} | null;
  workCardReason: string;
}

export function workflowSidebarContextFromSql(navigation: GreenfieldNavigationProjection): WorkflowSidebarContext {
  const {phase, workCard} = navigation.executionContext;
  const phaseState = navigation.phaseStates.find(item => item.phaseId === phase.phaseId);
  const workState = navigation.workItemStates.find(item => item.workItemId === workCard.workCardId);
  return {
    workflowId: navigation.workflowId,
    stage: {
      workspaceId: navigation.currentWorkspace,
      label: workspaceDefinitions.find(item => item.id === navigation.currentWorkspace)?.label ?? "Workflow",
      reason: navigation.reason ?? (navigation.closed ? "Closed" : "Current stage"),
    },
    phase: phase.state === "active" && phase.phaseId ? {
      id: phase.phaseId, title: phaseState?.title ?? phase.title ?? "Current Phase",
      state: phaseState?.state ?? phase.state, order: phase.order, total: phase.totalPhaseCount, loopStep: phase.loopStep,
    } : null,
    phaseReason: phase.reason || navigation.reason || "No active Phase",
    workCard: workCard.state === "active" && workCard.workCardId ? {
      id: workCard.workCardId, title: workState?.title ?? workCard.title ?? "Current Work Card",
      state: workState?.state ?? workCard.dispositionOrState, loopStep: workCard.loopStep,
      repairId: navigation.currentRepairId ?? workCard.repairId,
      parentId: navigation.parentWorkItemId ?? workState?.parentWorkItemId ?? workCard.parentWorkCardId,
    } : null,
    workCardReason: workCard.reason || phase.reason || navigation.reason || "No active Work Card",
  };
}
