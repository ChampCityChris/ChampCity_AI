import type {
  RoutedActionRoutes,
  WorkflowActionRecord,
  WorkflowRole,
  WorkflowScreenId,
  WorkflowStage,
} from "./workflowContracts";
import { workflowActionTemplates } from "./workflowActionCatalog";

export const processClassifications = ["top_level", "subordinate"] as const;
export type ProcessClassification = (typeof processClassifications)[number];

export const canonicalWorkflowSpine = [
  "project_intake",
  "project_interview",
  "reconciliation_review",
  "project_mapping",
  "operator_project_approval",
  "phase_mapping",
  "operator_phase_approval",
  "work_card_loop",
  "phase_closeout",
  "operator_phase_closeout_approval",
  "roadmap_update",
  "next_phase_activation",
  "repeat_phase_mapping_and_work_card_loop",
] as const;
export type CanonicalWorkflowSpineStep = (typeof canonicalWorkflowSpine)[number];

export type ProcessContractId =
  | CanonicalWorkflowSpineStep
  | "project_planning"
  | "project_roadmap"
  | "phase_intake"
  | "phase_interview"
  | "phase_planning"
  | "work_card_plan_review"
  | "implementer_handoff"
  | "implementer_execution_packet"
  | "route_review_request"
  | "workflow_completion";

export interface ProcessSourceAuthority {
  artifactType: string;
  authority: "canonical_registered_pair";
}

export interface ConditionalProcessSourceRequirement
  extends ProcessSourceAuthority {
  conditionKey: string;
  conditionValue: true;
}

export interface ProcessExpectedOutput {
  artifactType: string;
  authority: "canonical_registered_pair" | "none";
}

export interface WorkflowActionTemplate {
  actionId: string;
  processId: CanonicalWorkflowSpineStep;
  processClassification: ProcessClassification;
  advancesWorkflowState: boolean;
  stage: WorkflowStage;
  role: WorkflowRole;
  screenId: WorkflowScreenId;
  expectedOutputArtifactType: string;
  routes: RoutedActionRoutes;
}

export interface ProcessContractItem {
  processId: ProcessContractId;
  displayName: string;
  classification: ProcessClassification;
  parentProcessId: CanonicalWorkflowSpineStep | null;
  owner: WorkflowRole;
  requiredSourceAuthority: readonly ProcessSourceAuthority[];
  conditionalSourceRequirements: readonly ConditionalProcessSourceRequirement[];
  expectedOutput: ProcessExpectedOutput;
  routes: {
    success: ProcessContractId | null;
    failure: ProcessContractId | null;
    repair: ProcessContractId | null;
  };
  advancesWorkflowState: boolean;
  runtimeActions: readonly WorkflowActionTemplate[];
}

const pair = (artifactType: string): ProcessSourceAuthority => ({
  artifactType,
  authority: "canonical_registered_pair",
});

const conditionalPair = (
  artifactType: string,
  conditionKey: string,
): ConditionalProcessSourceRequirement => ({
  ...pair(artifactType),
  conditionKey,
  conditionValue: true,
});

const output = (artifactType: string): ProcessExpectedOutput => ({
  artifactType,
  authority: "canonical_registered_pair",
});

function runtimeAction(
  processId: CanonicalWorkflowSpineStep,
  actionId: string,
  stage: WorkflowStage,
  role: WorkflowRole,
  screenId: WorkflowScreenId,
  expectedOutputArtifactType: string,
  success: string | null,
  failure: string | null = null,
  repair: string | null = null,
  processClassification: ProcessClassification = "top_level",
  advancesWorkflowState = true,
): WorkflowActionTemplate {
  return {
    actionId,
    processId,
    processClassification,
    advancesWorkflowState,
    stage,
    role,
    screenId,
    expectedOutputArtifactType,
    routes: { success, failure, repair },
  };
}

export const lockedProcessContract: readonly ProcessContractItem[] = [
  {
    processId: "project_intake",
    displayName: "Project Intake",
    classification: "top_level",
    parentProcessId: null,
    owner: "operator",
    requiredSourceAuthority: [],
    conditionalSourceRequirements: [],
    expectedOutput: output("project_intake"),
    routes: { success: "project_interview", failure: null, repair: null },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("project_intake", "project_intake_required", "capture", "operator", "project-intake", "project_intake", "project_interview_required")],
  },
  {
    processId: "project_interview",
    displayName: "Project Interview",
    classification: "top_level",
    parentProcessId: null,
    owner: "architect",
    requiredSourceAuthority: [pair("project_intake")],
    conditionalSourceRequirements: [],
    expectedOutput: output("architect_interview"),
    routes: { success: "reconciliation_review", failure: "project_interview", repair: "project_interview" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("project_interview", "project_interview_required", "frame", "architect", "project-architect-interview", "architect_interview", "reconciliation_review_required", "project_interview_required", "project_interview_required")],
  },
  {
    processId: "reconciliation_review",
    displayName: "Reconciliation Review",
    classification: "top_level",
    parentProcessId: null,
    owner: "architect",
    requiredSourceAuthority: [pair("project_intake"), pair("architect_interview")],
    conditionalSourceRequirements: [],
    expectedOutput: output("reconciliation_review"),
    routes: { success: "project_mapping", failure: "project_interview", repair: "project_interview" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("reconciliation_review", "reconciliation_review_required", "plan", "architect", "repository-reconciliation", "reconciliation_review", "project_mapping_required", "project_interview_required", "project_interview_required")],
  },
  {
    processId: "project_mapping",
    displayName: "Project Mapping",
    classification: "top_level",
    parentProcessId: null,
    owner: "architect",
    requiredSourceAuthority: [pair("project_intake"), pair("architect_interview"), pair("reconciliation_review")],
    conditionalSourceRequirements: [],
    expectedOutput: output("project_roadmap"),
    routes: { success: "operator_project_approval", failure: "project_mapping", repair: "project_mapping" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("project_mapping", "project_mapping_required", "plan", "architect", "project-mapping", "project_roadmap", "operator_project_approval_required", "project_mapping_required", "project_mapping_required")],
  },
  {
    processId: "operator_project_approval",
    displayName: "Operator Project Approval",
    classification: "top_level",
    parentProcessId: null,
    owner: "operator",
    requiredSourceAuthority: [pair("project_planning"), pair("reconciliation_review"), pair("project_roadmap")],
    conditionalSourceRequirements: [],
    expectedOutput: output("operator_approval"),
    routes: { success: "phase_mapping", failure: "project_mapping", repair: "project_mapping" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("operator_project_approval", "operator_project_approval_required", "plan", "operator", "operator-project-approval", "operator_approval", "phase_mapping_required", "project_mapping_required", "project_mapping_required")],
  },
  {
    processId: "phase_mapping",
    displayName: "Phase Mapping",
    classification: "top_level",
    parentProcessId: null,
    owner: "architect",
    requiredSourceAuthority: [pair("operator_approval"), pair("project_roadmap")],
    conditionalSourceRequirements: [],
    expectedOutput: output("phase_map"),
    routes: { success: "operator_phase_approval", failure: "phase_mapping", repair: "phase_mapping" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("phase_mapping", "phase_mapping_required", "plan", "architect", "phase-mapping", "phase_map", "operator_phase_approval_required", "phase_mapping_required", "phase_mapping_required")],
  },
  {
    processId: "operator_phase_approval",
    displayName: "Operator Phase Approval",
    classification: "top_level",
    parentProcessId: null,
    owner: "operator",
    requiredSourceAuthority: [pair("phase_map"), pair("phase_planning"), pair("work_card_plan")],
    conditionalSourceRequirements: [conditionalPair("phase_interview", "phaseMappingDecision.phaseInterviewRequired")],
    expectedOutput: output("operator_approval"),
    routes: { success: "work_card_loop", failure: "phase_mapping", repair: "phase_mapping" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("operator_phase_approval", "operator_phase_approval_required", "plan", "operator", "operator-phase-approval", "operator_approval", "work_card_authoring_required", "phase_mapping_required", "phase_mapping_required")],
  },
  {
    processId: "work_card_loop",
    displayName: "Work Card Loop",
    classification: "top_level",
    parentProcessId: null,
    owner: "operator",
    requiredSourceAuthority: [pair("operator_approval"), pair("work_card_plan")],
    conditionalSourceRequirements: [],
    expectedOutput: output("candidate_resolution_evidence"),
    routes: { success: "phase_closeout", failure: "work_card_loop", repair: "work_card_loop" },
    advancesWorkflowState: true,
    runtimeActions: [
      runtimeAction("work_card_loop", "work_card_authoring_required", "plan", "architect", "work-card-authoring", "work_card", "operator_work_card_approval_required"),
      runtimeAction("work_card_loop", "operator_work_card_approval_required", "build", "operator", "operator-work-card-approval", "operator_approval", "implementer_execution_required", "candidate_disposition_required", "work_card_authoring_required"),
      runtimeAction("work_card_loop", "implementer_execution_required", "build", "implementer", "implementer-execution", "implementer_report", "architect_review_of_implementer_report_required"),
      runtimeAction("work_card_loop", "architect_review_of_implementer_report_required", "prove", "architect", "architect-review", "architect_review", "operator_validation_required", "architect_review_of_implementer_report_required", "architect_disposition_required"),
      runtimeAction("work_card_loop", "operator_validation_required", "prove", "operator", "operator-validation", "operator_validation", "work_card_authoring_required", "architect_disposition_required", "architect_disposition_required"),
      runtimeAction("work_card_loop", "architect_disposition_required", "prove", "architect", "architect-bridge", "candidate_disposition", "operator_validation_required", "repair_work_card_required", "repair_work_card_required"),
      runtimeAction("work_card_loop", "repair_work_card_required", "plan", "architect", "repair-work-card-authoring", "work_card", "operator_work_card_approval_required"),
      runtimeAction("work_card_loop", "candidate_disposition_required", "prove", "operator", "candidate-disposition", "candidate_disposition", "work_card_authoring_required", "work_card_authoring_required", "work_card_authoring_required"),
      runtimeAction("work_card_loop", "route_review_request_required", "prove", "operator", "route-review-request", "route_review_request", null, null, null, "subordinate", false),
    ],
  },
  {
    processId: "phase_closeout",
    displayName: "Phase Closeout",
    classification: "top_level",
    parentProcessId: null,
    owner: "architect",
    requiredSourceAuthority: [pair("candidate_resolution_evidence")],
    conditionalSourceRequirements: [],
    expectedOutput: output("phase_closeout"),
    routes: { success: "operator_phase_closeout_approval", failure: "phase_closeout", repair: "work_card_loop" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("phase_closeout", "phase_closeout_required", "prove", "architect", "phase-closeout", "phase_closeout", "operator_phase_closeout_approval_required", "phase_closeout_required", "work_card_authoring_required")],
  },
  {
    processId: "operator_phase_closeout_approval",
    displayName: "Operator Phase Closeout Approval",
    classification: "top_level",
    parentProcessId: null,
    owner: "operator",
    requiredSourceAuthority: [pair("phase_closeout")],
    conditionalSourceRequirements: [],
    expectedOutput: output("operator_approval"),
    routes: { success: "roadmap_update", failure: "phase_closeout", repair: "phase_closeout" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("operator_phase_closeout_approval", "operator_phase_closeout_approval_required", "prove", "operator", "operator-closeout-approval", "operator_approval", "roadmap_update_required", "phase_closeout_required", "phase_closeout_required")],
  },
  {
    processId: "roadmap_update",
    displayName: "Roadmap Update",
    classification: "top_level",
    parentProcessId: null,
    owner: "architect",
    requiredSourceAuthority: [pair("operator_approval"), pair("project_roadmap")],
    conditionalSourceRequirements: [],
    expectedOutput: output("project_roadmap"),
    routes: { success: "next_phase_activation", failure: "roadmap_update", repair: "roadmap_update" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("roadmap_update", "roadmap_update_required", "prove", "architect", "roadmap-update", "project_roadmap", "next_phase_activation_required", "roadmap_update_required", "roadmap_update_required")],
  },
  {
    processId: "next_phase_activation",
    displayName: "Next Phase Activation",
    classification: "top_level",
    parentProcessId: null,
    owner: "operator",
    requiredSourceAuthority: [pair("project_roadmap")],
    conditionalSourceRequirements: [],
    expectedOutput: output("phase_activation"),
    routes: { success: "repeat_phase_mapping_and_work_card_loop", failure: "next_phase_activation", repair: "roadmap_update" },
    advancesWorkflowState: true,
    runtimeActions: [runtimeAction("next_phase_activation", "next_phase_activation_required", "capture", "operator", "next-phase-activation", "phase_activation", "repeat_phase_mapping_and_work_card_loop_required", "next_phase_activation_required", "roadmap_update_required")],
  },
  {
    processId: "repeat_phase_mapping_and_work_card_loop",
    displayName: "Repeat Phase Mapping / Work Card Loop",
    classification: "top_level",
    parentProcessId: null,
    owner: "application",
    requiredSourceAuthority: [pair("phase_activation")],
    conditionalSourceRequirements: [],
    expectedOutput: output("workflow_iteration"),
    routes: { success: null, failure: "phase_mapping", repair: "phase_mapping" },
    advancesWorkflowState: true,
    runtimeActions: [
      runtimeAction("repeat_phase_mapping_and_work_card_loop", "repeat_phase_mapping_and_work_card_loop_required", "capture", "application", "workflow-complete", "workflow_iteration", "workflow_complete", "phase_mapping_required", "phase_mapping_required"),
      runtimeAction("repeat_phase_mapping_and_work_card_loop", "workflow_complete", "prove", "application", "workflow-complete", "workflow_completion", null, null, null, "subordinate", true),
    ],
  },
  ...([
    ["project_planning", "Project Planning", "project_mapping", "architect", "project_planning"],
    ["project_roadmap", "Project Roadmap", "project_mapping", "architect", "project_roadmap"],
    ["phase_intake", "Phase Intake", "phase_mapping", "architect", "phase_intake"],
    ["phase_interview", "Phase Interview", "phase_mapping", "architect", "phase_interview"],
    ["phase_planning", "Phase Planning", "phase_mapping", "architect", "phase_planning"],
    ["work_card_plan_review", "Work Card Plan Review", "phase_mapping", "operator", "work_card_plan_approval"],
    ["implementer_handoff", "Implementer Handoff", "work_card_loop", "architect", "implementer_prompt"],
    ["implementer_execution_packet", "Implementer Execution Packet", "work_card_loop", "architect", "implementer_execution_packet"],
    ["route_review_request", "Route Review Request", "work_card_loop", "operator", "route_review_request"],
    ["workflow_completion", "Workflow Completion", "repeat_phase_mapping_and_work_card_loop", "application", "workflow_completion"],
  ] as const).map(([processId, displayName, parentProcessId, owner, artifactType]) => ({
    processId,
    displayName,
    classification: "subordinate" as const,
    parentProcessId,
    owner,
    requiredSourceAuthority: [],
    conditionalSourceRequirements: [],
    expectedOutput: output(artifactType),
    routes: { success: null, failure: null, repair: null },
    advancesWorkflowState: false,
    runtimeActions: [],
  })),
] as const satisfies readonly ProcessContractItem[];

export const defaultLifecycleActionTemplates: readonly WorkflowActionTemplate[] =
  workflowActionTemplates;

export interface ProcessConformanceResult {
  conforms: boolean;
  topLevelProcessIds: CanonicalWorkflowSpineStep[];
  issues: string[];
}

export function validateExecutableProcessConformance(
  catalog: readonly WorkflowActionRecord[] | Readonly<Record<string, WorkflowActionRecord>>,
): ProcessConformanceResult {
  const definitions = new Map(
    defaultLifecycleActionTemplates.map((item) => [item.actionId, item]),
  );
  const actions = Array.isArray(catalog)
    ? [...catalog]
    : orderedCatalogActions(
        catalog as Readonly<Record<string, WorkflowActionRecord>>,
        definitions,
      );
  const issues: string[] = [];
  const seenActionIds = new Set<string>();

  for (const action of actions) {
    if (seenActionIds.has(action.actionId)) {
      issues.push(`Duplicate runtime action ${action.actionId}.`);
      continue;
    }
    seenActionIds.add(action.actionId);
    const expected = definitions.get(action.actionId);
    if (!expected) {
      issues.push(`Runtime action ${action.actionId} is not defined by the locked process contract.`);
      continue;
    }
    if (action.processId !== expected.processId) {
      issues.push(`Runtime action ${action.actionId} has processId ${action.processId}; expected ${expected.processId}.`);
    }
    if (action.processClassification !== expected.processClassification) {
      issues.push(`Runtime action ${action.actionId} has classification ${action.processClassification}; expected ${expected.processClassification}.`);
    }
    if (action.advancesWorkflowState !== expected.advancesWorkflowState) {
      issues.push(`Runtime action ${action.actionId} has an unauthorized workflow-state advancement setting.`);
    }
  }

  for (const actionId of definitions.keys()) {
    if (!seenActionIds.has(actionId)) issues.push(`Locked runtime action ${actionId} is missing.`);
  }

  const actualTopLevelIds = Array.from(
    new Set(
      actions
        .filter(
          (action) =>
            action.processClassification === "top_level" &&
            action.advancesWorkflowState,
        )
        .map((action) => action.processId),
    ),
  );
  if (JSON.stringify(actualTopLevelIds) !== JSON.stringify(canonicalWorkflowSpine)) {
    issues.push(
      `Top-level runtime process set must exactly match: ${canonicalWorkflowSpine.join(" -> ")}.`,
    );
  }

  return {
    conforms: issues.length === 0,
    topLevelProcessIds: actualTopLevelIds.filter((processId): processId is CanonicalWorkflowSpineStep =>
      canonicalWorkflowSpine.includes(processId as CanonicalWorkflowSpineStep),
    ),
    issues,
  };
}

function orderedCatalogActions(
  catalog: Readonly<Record<string, WorkflowActionRecord>>,
  definitions: ReadonlyMap<string, WorkflowActionTemplate>,
): WorkflowActionRecord[] {
  return [
    ...defaultLifecycleActionTemplates
      .map((template) => catalog[template.actionId])
      .filter((action): action is WorkflowActionRecord => Boolean(action)),
    ...Object.values(catalog).filter(
      (action) => !definitions.has(action.actionId),
    ),
  ];
}

export function assertExecutableProcessConformance(
  catalog: readonly WorkflowActionRecord[] | Readonly<Record<string, WorkflowActionRecord>>,
): void {
  const result = validateExecutableProcessConformance(catalog);
  if (!result.conforms) {
    throw new Error(`Executable workflow violates the locked process contract: ${result.issues.join(" ")}`);
  }
}
