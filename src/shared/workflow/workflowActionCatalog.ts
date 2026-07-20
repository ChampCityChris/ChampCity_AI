import type {
  ProcessClassification,
  WorkflowActionTemplate,
  WorkflowProcessStep,
} from "./processContract";
import type {
  RoutedActionRoutes,
  WorkflowRole,
  WorkflowScreenId,
  WorkflowStage,
} from "./workflowContracts";

export type WorkflowActionId =
  | "project_intake_required"
  | "project_interview_required"
  | "reconciliation_review_required"
  | "project_mapping_required"
  | "operator_project_approval_required"
  | "phase_mapping_required"
  | "operator_phase_approval_required"
  | "work_card_authoring_required"
  | "operator_work_card_approval_required"
  | "implementer_execution_required"
  | "architect_review_of_implementer_report_required"
  | "operator_validation_required"
  | "architect_disposition_required"
  | "repair_work_card_required"
  | "candidate_disposition_required"
  | "governance_integrity_repair_required"
  | "governance_repair_specification_required"
  | "operator_governance_approval_required"
  | "route_review_request_required"
  | "phase_closeout_required"
  | "operator_phase_closeout_approval_required"
  | "roadmap_update_required"
  | "next_phase_activation_required"
  | "repeat_phase_mapping_and_work_card_loop_required"
  | "workflow_complete";

export type WorkflowActionTargetRule =
  | "project"
  | "project_intake"
  | "project_planning_bundle"
  | "phase"
  | "phase_planning"
  | "work_card_plan_candidate"
  | "work_card"
  | "repair_work_card"
  | "parent_work_card"
  | "phase_closeout"
  | "project_roadmap"
  | "governance_maintenance"
  | "workflow_iteration";

export type WorkflowActionSourceRule =
  | "none"
  | "project_intake"
  | "project_planning_bundle"
  | "approved_project_roadmap"
  | "phase_planning_bundle"
  | "phase_approval_and_work_card_plan"
  | "work_card"
  | "implementer_report"
  | "architect_review"
  | "operator_validation"
  | "architect_disposition_and_validation"
  | "candidate_disposition_evidence"
  | "governance_maintenance"
  | "phase_closeout"
  | "roadmap_update";

export type WorkflowExpectedOutputIdentityRule =
  | "source_expected_output_exact"
  | "target_expected_output_exact"
  | "kernel_bound_exact"
  | "none";

export interface WorkflowActionCatalogEntry extends WorkflowActionTemplate {
  actionId: WorkflowActionId;
  processId: WorkflowProcessStep;
  processClassification: ProcessClassification;
  targetRule: WorkflowActionTargetRule;
  requiredSourceRule: WorkflowActionSourceRule;
  expectedOutputArtifactType: string;
  expectedOutputIdentityRule: WorkflowExpectedOutputIdentityRule;
  authorizedOperations: readonly string[];
  transitions: {
    success: string | null;
    failure: string | null;
    repair: string | null;
    architectDisposition: string | null;
  };
  manualScreenId: string;
}

function action(
  actionId: WorkflowActionId,
  processId: WorkflowProcessStep,
  stage: WorkflowStage,
  role: WorkflowRole,
  screenId: WorkflowScreenId,
  expectedOutputArtifactType: string,
  options: {
    targetRule: WorkflowActionTargetRule;
    requiredSourceRule: WorkflowActionSourceRule;
    expectedOutputIdentityRule?: WorkflowExpectedOutputIdentityRule;
    authorizedOperations?: readonly string[];
    success?: string | null;
    failure?: string | null;
    repair?: string | null;
    architectDisposition?: string | null;
    processClassification?: ProcessClassification;
    advancesWorkflowState?: boolean;
    manualScreenId?: string;
  },
): WorkflowActionCatalogEntry {
  const routes: RoutedActionRoutes = {
    success: options.success ?? null,
    failure: options.failure ?? null,
    repair: options.repair ?? null,
  };
  return {
    actionId,
    processId,
    processClassification: options.processClassification ?? "top_level",
    advancesWorkflowState: options.advancesWorkflowState ?? true,
    stage,
    role,
    screenId,
    targetRule: options.targetRule,
    requiredSourceRule: options.requiredSourceRule,
    expectedOutputArtifactType,
    expectedOutputIdentityRule:
      options.expectedOutputIdentityRule ?? "source_expected_output_exact",
    authorizedOperations: options.authorizedOperations ?? [],
    routes,
    transitions: {
      ...routes,
      architectDisposition: options.architectDisposition ?? null,
    },
    manualScreenId: options.manualScreenId ?? screenId,
  };
}

export const workflowActionCatalog = [
  action("project_intake_required", "project_intake", "capture", "operator", "project-intake", "project_intake", {
    targetRule: "project",
    requiredSourceRule: "none",
    authorizedOperations: ["projectIntake:preview", "projectIntake:save"],
    success: "project_interview_required",
  }),
  action("project_interview_required", "project_interview", "frame", "architect", "project-architect-interview", "architect_interview", {
    targetRule: "project_intake",
    requiredSourceRule: "project_intake",
    authorizedOperations: ["projectArchitectInterview:previewPrompt", "projectArchitectInterview:savePrompt"],
    success: "reconciliation_review_required",
    failure: "project_interview_required",
    repair: "project_interview_required",
  }),
  action("reconciliation_review_required", "reconciliation_review", "plan", "architect", "repository-reconciliation", "reconciliation_review", {
    targetRule: "project",
    requiredSourceRule: "project_planning_bundle",
    authorizedOperations: ["repositoryReconciliation:previewPrompt", "repositoryReconciliation:preview", "repositoryReconciliation:save"],
    success: "project_mapping_required",
    failure: "project_interview_required",
    repair: "project_interview_required",
  }),
  action("project_mapping_required", "project_mapping", "plan", "architect", "project-mapping", "project_roadmap", {
    targetRule: "project",
    requiredSourceRule: "project_planning_bundle",
    authorizedOperations: ["projectPlanningDocuments:preview", "projectPlanningDocuments:save", "projectRoadmap:preview", "projectRoadmap:save"],
    success: "operator_project_approval_required",
    failure: "project_mapping_required",
    repair: "project_mapping_required",
    manualScreenId: "project-roadmap",
  }),
  action("operator_project_approval_required", "operator_project_approval", "plan", "operator", "operator-project-approval", "operator_approval", {
    targetRule: "project_planning_bundle",
    requiredSourceRule: "project_planning_bundle",
    success: "phase_mapping_required",
    failure: "project_mapping_required",
    repair: "project_mapping_required",
    manualScreenId: "project-planning-documents",
  }),
  action("phase_mapping_required", "phase_mapping", "plan", "architect", "phase-mapping", "phase_map", {
    targetRule: "phase",
    requiredSourceRule: "approved_project_roadmap",
    authorizedOperations: ["phaseMap:preview", "phaseMap:save", "phaseIntake:preview", "phaseIntake:save", "phaseArchitectInterview:previewPrompt", "phaseArchitectInterview:savePrompt", "phasePlanning:preview", "phasePlanning:save"],
    success: "operator_phase_approval_required",
    failure: "phase_mapping_required",
    repair: "phase_mapping_required",
    manualScreenId: "phase-map",
  }),
  action("operator_phase_approval_required", "operator_phase_approval", "plan", "operator", "operator-phase-approval", "operator_approval", {
    targetRule: "phase_planning",
    requiredSourceRule: "phase_planning_bundle",
    success: "work_card_authoring_required",
    failure: "phase_mapping_required",
    repair: "phase_mapping_required",
    manualScreenId: "phase-planning-documents",
  }),
  action("work_card_authoring_required", "work_card_loop", "plan", "architect", "work-card-authoring", "work_card", {
    targetRule: "work_card_plan_candidate",
    requiredSourceRule: "phase_approval_and_work_card_plan",
    authorizedOperations: ["workCards:previewDraft", "workCards:saveDraft"],
    success: "operator_work_card_approval_required",
    manualScreenId: "work-card-authoring",
  }),
  action("operator_work_card_approval_required", "work_card_loop", "build", "operator", "operator-work-card-approval", "operator_approval", {
    targetRule: "work_card",
    requiredSourceRule: "work_card",
    success: "implementer_execution_required",
    failure: "candidate_disposition_required",
    repair: "work_card_authoring_required",
    manualScreenId: "work-card-plan-review",
  }),
  action("implementer_execution_required", "work_card_loop", "build", "implementer", "implementer-execution", "implementer_report", {
    targetRule: "work_card",
    requiredSourceRule: "work_card",
    authorizedOperations: ["workCards:previewImplementerReportCapture", "workCards:saveImplementerReportCapture"],
    success: "architect_review_of_implementer_report_required",
    manualScreenId: "implementer-report-capture",
  }),
  action("architect_review_of_implementer_report_required", "work_card_loop", "prove", "architect", "architect-review", "architect_review", {
    targetRule: "work_card",
    requiredSourceRule: "implementer_report",
    authorizedOperations: ["workCards:previewArchitectReviewRecord", "workCards:saveArchitectReviewRecord", "workCards:ensureArchitectTaskPacket"],
    success: "operator_validation_required",
    failure: "architect_review_of_implementer_report_required",
    repair: "architect_disposition_required",
  }),
  action("operator_validation_required", "work_card_loop", "prove", "operator", "operator-validation", "operator_validation", {
    targetRule: "work_card",
    requiredSourceRule: "architect_review",
    authorizedOperations: ["workCards:previewHumanValidationRecord", "workCards:saveHumanValidationRecord", "workCards:attachValidationEvidenceFile"],
    success: "architect_disposition_required",
    failure: "architect_disposition_required",
    repair: "architect_disposition_required",
    architectDisposition: "architect_disposition_required",
    manualScreenId: "human-validation",
  }),
  action("architect_disposition_required", "work_card_loop", "prove", "architect", "architect-bridge", "candidate_disposition", {
    targetRule: "parent_work_card",
    requiredSourceRule: "operator_validation",
    authorizedOperations: ["workCards:ensureArchitectTaskPacket"],
    success: "operator_validation_required",
    failure: "repair_work_card_required",
    repair: "repair_work_card_required",
  }),
  action("repair_work_card_required", "work_card_loop", "plan", "architect", "repair-work-card-authoring", "work_card", {
    targetRule: "parent_work_card",
    requiredSourceRule: "architect_disposition_and_validation",
    authorizedOperations: ["workCards:previewDraft", "workCards:saveDraft"],
    success: "operator_work_card_approval_required",
    manualScreenId: "repair-work-card-authoring",
  }),
  action("candidate_disposition_required", "work_card_loop", "prove", "operator", "candidate-disposition", "candidate_disposition", {
    targetRule: "parent_work_card",
    requiredSourceRule: "candidate_disposition_evidence",
    authorizedOperations: ["workCards:saveCompletedViaRepairDisposition"],
    success: "work_card_authoring_required",
    failure: "work_card_authoring_required",
    repair: "work_card_authoring_required",
  }),
  action("governance_integrity_repair_required", "governance_maintenance", "maintenance", "operator", "governance-repair", "governance_repair", {
    targetRule: "governance_maintenance",
    requiredSourceRule: "governance_maintenance",
    expectedOutputIdentityRule: "kernel_bound_exact",
    authorizedOperations: [
      "governanceRepair:repairSelected",
      "governanceRepair:previewSpecificationRequest",
      "governanceRepair:createSpecificationRequest",
    ],
    processClassification: "subordinate",
    advancesWorkflowState: false,
    manualScreenId: "governance-repair",
  }),
  action("governance_repair_specification_required", "governance_maintenance", "maintenance", "architect", "architect-bridge", "work_card", {
    targetRule: "governance_maintenance",
    requiredSourceRule: "governance_maintenance",
    expectedOutputIdentityRule: "kernel_bound_exact",
    authorizedOperations: ["workCards:ensureArchitectTaskPacket"],
    processClassification: "subordinate",
    advancesWorkflowState: false,
    manualScreenId: "architect-bridge",
  }),
  action("operator_governance_approval_required", "governance_maintenance", "maintenance", "operator", "governance-approval", "operator_approval", {
    targetRule: "governance_maintenance",
    requiredSourceRule: "governance_maintenance",
    expectedOutputIdentityRule: "kernel_bound_exact",
    processClassification: "subordinate",
    advancesWorkflowState: false,
    manualScreenId: "governance-approval",
  }),
  action("route_review_request_required", "work_card_loop", "prove", "operator", "route-review-request", "route_review_request", {
    targetRule: "workflow_iteration",
    requiredSourceRule: "none",
    expectedOutputIdentityRule: "kernel_bound_exact",
    authorizedOperations: ["workCards:saveRouteReviewRequest"],
    processClassification: "subordinate",
    advancesWorkflowState: false,
    manualScreenId: "route-review-request",
  }),
  action("phase_closeout_required", "phase_closeout", "prove", "architect", "phase-closeout", "phase_closeout", {
    targetRule: "phase",
    requiredSourceRule: "candidate_disposition_evidence",
    authorizedOperations: ["workCards:previewPhaseCloseoutRecord", "workCards:savePhaseCloseoutRecord"],
    success: "operator_phase_closeout_approval_required",
    failure: "phase_closeout_required",
    repair: "work_card_authoring_required",
  }),
  action("operator_phase_closeout_approval_required", "operator_phase_closeout_approval", "prove", "operator", "operator-closeout-approval", "operator_approval", {
    targetRule: "phase_closeout",
    requiredSourceRule: "phase_closeout",
    success: "roadmap_update_required",
    failure: "phase_closeout_required",
    repair: "phase_closeout_required",
    manualScreenId: "phase-closeout",
  }),
  action("roadmap_update_required", "roadmap_update", "prove", "architect", "roadmap-update", "project_roadmap", {
    targetRule: "project_roadmap",
    requiredSourceRule: "phase_closeout",
    authorizedOperations: ["projectRoadmap:preview", "projectRoadmap:save"],
    success: "next_phase_activation_required",
    failure: "roadmap_update_required",
    repair: "roadmap_update_required",
    manualScreenId: "project-planning-documents",
  }),
  action("next_phase_activation_required", "next_phase_activation", "capture", "operator", "next-phase-activation", "phase_activation", {
    targetRule: "project_roadmap",
    requiredSourceRule: "roadmap_update",
    success: "repeat_phase_mapping_and_work_card_loop_required",
    failure: "next_phase_activation_required",
    repair: "roadmap_update_required",
    manualScreenId: "phase-map",
  }),
  action("repeat_phase_mapping_and_work_card_loop_required", "repeat_phase_mapping_and_work_card_loop", "capture", "application", "workflow-complete", "workflow_iteration", {
    targetRule: "workflow_iteration",
    requiredSourceRule: "roadmap_update",
    success: "workflow_complete",
    failure: "phase_mapping_required",
    repair: "phase_mapping_required",
    manualScreenId: "phase-map",
  }),
  action("workflow_complete", "repeat_phase_mapping_and_work_card_loop", "prove", "application", "workflow-complete", "workflow_completion", {
    targetRule: "workflow_iteration",
    requiredSourceRule: "none",
    processClassification: "subordinate",
    success: null,
    failure: null,
    repair: null,
    manualScreenId: "phase-map",
  }),
] as const satisfies readonly WorkflowActionCatalogEntry[];

export const workflowActionCatalogById: Readonly<Record<WorkflowActionId, WorkflowActionCatalogEntry>> =
  Object.freeze(
    Object.fromEntries(
      workflowActionCatalog.map((entry) => [entry.actionId, Object.freeze({
        ...entry,
        authorizedOperations: Object.freeze([...entry.authorizedOperations]),
        routes: Object.freeze({ ...entry.routes }),
        transitions: Object.freeze({ ...entry.transitions }),
      })]),
    ) as Record<WorkflowActionId, WorkflowActionCatalogEntry>,
  );

export const workflowActionTemplates: readonly WorkflowActionTemplate[] =
  workflowActionCatalog.map((entry) => ({
    actionId: entry.actionId,
    processId: entry.processId,
    processClassification: entry.processClassification,
    advancesWorkflowState: entry.advancesWorkflowState,
    stage: entry.stage,
    role: entry.role,
    screenId: entry.screenId,
    expectedOutputArtifactType: entry.expectedOutputArtifactType,
    routes: { ...entry.routes },
  }));

export function getWorkflowActionCatalogEntry(
  actionId: string | undefined,
): WorkflowActionCatalogEntry | undefined {
  if (!actionId) return undefined;
  return workflowActionCatalogById[actionId as WorkflowActionId];
}
