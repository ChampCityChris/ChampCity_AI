import type {
  WorkflowRole,
  WorkflowScreenId,
} from "../workflow";

export interface CurrentActionSurfaceRoute {
  actionId: string;
  responsibleRole: WorkflowRole;
  uiSurface: WorkflowScreenId | "architect-bridge";
  manualScreenId: string;
  authorizedOperations: readonly string[];
  targetArtifact: string;
  sourceArtifactBundle: string;
  expectedOutputArtifactType: string;
}

export const currentActionSurfaceRoutes = [
  route("project_intake_required", "operator", "project-intake", "project-intake", ["projectIntake:preview", "projectIntake:save"], "project", "operator intake notes", "project_intake"),
  route("project_interview_required", "architect", "project-architect-interview", "project-architect-interview", ["projectArchitectInterview:previewPrompt", "projectArchitectInterview:savePrompt"], "project_intake", "project_intake", "architect_interview"),
  route("project_architect_interview_required", "architect", "project-architect-interview", "project-architect-interview", ["projectArchitectInterview:previewPrompt", "projectArchitectInterview:savePrompt"], "project_intake", "project_intake", "architect_interview"),
  route("repository_reconciliation_required", "architect", "repository-reconciliation", "repository-reconciliation", ["repositoryReconciliation:previewPrompt", "repositoryReconciliation:preview", "repositoryReconciliation:save"], "project", "project planning bundle", "repository_reconciliation"),
  route("reconciliation_review_required", "architect", "repository-reconciliation", "repository-reconciliation", ["repositoryReconciliation:previewPrompt", "repositoryReconciliation:preview", "repositoryReconciliation:save"], "project", "project planning bundle", "repository_reconciliation"),
  route("project_mapping_required", "architect", "project-mapping", "project-roadmap", ["projectRoadmap:preview", "projectRoadmap:save"], "project", "project intake/interview/reconciliation", "roadmap"),
  route("project_planning_required", "architect", "project-planning", "project-planning-documents", ["projectPlanningDocuments:preview", "projectPlanningDocuments:save"], "project", "project intake/interview/reconciliation", "project_planning"),
  route("project_roadmap_required", "architect", "project-mapping", "project-roadmap", ["projectRoadmap:preview", "projectRoadmap:save"], "project", "project planning bundle", "roadmap"),
  route("operator_project_approval_required", "operator", "operator-project-approval", "project-planning-documents", [], "project planning", "project planning bundle", "project_approval"),
  route("phase_mapping_required", "architect", "phase-mapping", "phase-map", ["phaseMap:preview", "phaseMap:save"], "phase", "approved project roadmap", "phase_map"),
  route("phase_intake_required", "architect", "phase-intake", "phase-intake", ["phaseIntake:preview", "phaseIntake:save"], "phase", "phase planning bundle", "phase_intake"),
  route("phase_architect_interview_required", "architect", "phase-architect-interview", "phase-architect-interview", ["phaseArchitectInterview:previewPrompt", "phaseArchitectInterview:savePrompt"], "phase", "phase intake", "phase_interview"),
  route("phase_planning_required", "architect", "phase-planning", "phase-planning-documents", ["phasePlanning:preview", "phasePlanning:save"], "phase", "phase map/intake/interview", "phase_planning"),
  route("work_card_plan_review_required", "operator", "work-card-plan-review", "work-card-plan-review", [], "work_card_plan", "phase planning documents", "work_card_plan_approval"),
  route("operator_phase_approval_required", "operator", "operator-phase-approval", "phase-planning-documents", [], "phase planning", "phase map/planning/work-card plan", "phase_approval"),
  route("work_card_authoring_required", "architect", "work-card-authoring", "new-work-card", ["workCards:previewDraft", "workCards:saveDraft"], "work_card_plan candidate", "phase approval and work-card plan", "work_card"),
  route("full_work_card_creation_required", "architect", "work-card-authoring", "new-work-card", ["workCards:previewDraft", "workCards:saveDraft"], "work_card_plan candidate", "phase approval and work-card plan", "work_card"),
  route("operator_work_card_approval_required", "operator", "operator-work-card-approval", "work-card-plan-review", [], "work_card", "work_card", "work_card_approval"),
  route("operator_work_card_review_required", "operator", "operator-work-card-approval", "work-card-plan-review", [], "work_card", "work_card", "work_card_approval"),
  route("implementer_handoff_required", "architect", "implementer-handoff", "implementer-execution-packet", ["workCards:previewImplementerExecutionPacket", "workCards:saveImplementerExecutionPacket"], "work_card", "work_card support bundle", "implementer_prompt"),
  route("implementer_execution_required", "implementer", "implementer-execution", "implementer-report-capture", ["workCards:previewImplementerReportCapture", "workCards:saveImplementerReportCapture"], "work_card", "work_card", "implementer_report"),
  route("implementer_report_required", "implementer", "implementer-execution", "implementer-report-capture", ["workCards:previewImplementerReportCapture", "workCards:saveImplementerReportCapture"], "work_card", "work_card", "implementer_report"),
  route("architect_review_of_implementer_report_required", "architect", "architect-review", "architect-review", ["workCards:previewArchitectReviewRecord", "workCards:saveArchitectReviewRecord", "workCards:ensureArchitectTaskPacket"], "work_card", "work_card and implementer_report", "architect_review"),
  route("architect_review_of_validation_report_required", "architect", "architect-bridge", "architect-bridge", ["workCards:ensureArchitectTaskPacket"], "work_card", "validation_report", "architect_task"),
  route("operator_validation_required", "operator", "operator-validation", "human-validation", ["workCards:previewHumanValidationRecord", "workCards:saveHumanValidationRecord", "workCards:attachValidationEvidenceFile"], "work_card", "architect_review and implementation evidence", "validation_report"),
  route("architect_disposition_required", "architect", "architect-bridge", "architect-bridge", ["workCards:ensureArchitectTaskPacket"], "work_card", "validation report and repair evidence bundle", "architect_task"),
  route("repair_work_card_required", "architect", "repair-work-card-authoring", "new-work-card", ["workCards:previewDraft", "workCards:saveDraft"], "parent work_card", "architect disposition and validation evidence", "work_card"),
  route("repair_sub_card_creation_required", "architect", "repair-work-card-authoring", "architect-prompt-composer", ["workCards:previewArchitectPrompt", "workCards:saveArchitectPrompt"], "parent work_card", "validation and review evidence", "work_card"),
  route("repair_implementer_handoff_required", "architect", "implementer-handoff", "implementer-execution-packet", ["workCards:previewImplementerExecutionPacket", "workCards:saveImplementerExecutionPacket"], "repair work_card", "repair work_card support bundle", "implementer_prompt"),
  route("repair_validation_required", "operator", "operator-validation", "human-validation", ["workCards:previewHumanValidationRecord", "workCards:saveHumanValidationRecord", "workCards:attachValidationEvidenceFile"], "repair work_card", "repair architect review and evidence", "validation_report"),
  route("candidate_disposition_required", "operator", "candidate-disposition", "candidate-disposition", ["workCards:saveCompletedViaRepairDisposition"], "parent work_card", "parent validation and repair chain evidence", "candidate_disposition"),
  route("phase_closeout_required", "architect", "phase-closeout", "phase-closeout", ["workCards:previewPhaseCloseoutRecord", "workCards:savePhaseCloseoutRecord"], "phase", "candidate disposition evidence", "phase_closeout"),
  route("operator_phase_closeout_approval_required", "operator", "operator-closeout-approval", "phase-closeout", [], "phase_closeout", "phase_closeout", "phase_closeout_approval"),
  route("operator_closeout_approval_required", "operator", "operator-closeout-approval", "phase-closeout", [], "phase_closeout", "phase_closeout", "phase_closeout_approval"),
  route("roadmap_update_required", "architect", "roadmap-update", "project-planning-documents", ["projectRoadmap:preview", "projectRoadmap:save"], "roadmap", "phase closeout approval", "roadmap"),
  route("next_phase_activation_required", "operator", "next-phase-activation", "phase-map", [], "next phase", "updated roadmap", "phase_activation"),
  route("repeat_phase_mapping_and_work_card_loop_required", "application", "workflow-complete", "phase-map", [], "workflow iteration", "phase activation", "workflow_iteration"),
  route("workflow_complete", "application", "workflow-complete", "phase-map", [], "project", "workflow evidence", "workflow_completion"),
] as const satisfies readonly CurrentActionSurfaceRoute[];

export const currentActionSurfaceRouteById: Readonly<Record<string, CurrentActionSurfaceRoute>> =
  Object.fromEntries(currentActionSurfaceRoutes.map((entry) => [entry.actionId, entry]));

export function getCurrentActionSurfaceRoute(
  actionId: string | undefined,
): CurrentActionSurfaceRoute | undefined {
  return actionId ? currentActionSurfaceRouteById[normalizeActionId(actionId)] : undefined;
}

function route(
  actionId: string,
  responsibleRole: WorkflowRole,
  uiSurface: WorkflowScreenId | "architect-bridge",
  manualScreenId: string,
  authorizedOperations: readonly string[],
  targetArtifact: string,
  sourceArtifactBundle: string,
  expectedOutputArtifactType: string,
): CurrentActionSurfaceRoute {
  return {
    actionId,
    responsibleRole,
    uiSurface,
    manualScreenId,
    authorizedOperations,
    targetArtifact,
    sourceArtifactBundle,
    expectedOutputArtifactType,
  };
}

function normalizeActionId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
