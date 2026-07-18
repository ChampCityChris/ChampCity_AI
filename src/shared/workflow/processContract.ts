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

function runtimeActionsFor(
  processId: CanonicalWorkflowSpineStep,
): readonly WorkflowActionTemplate[] {
  return workflowActionTemplates.filter((action) => action.processId === processId);
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
    runtimeActions: runtimeActionsFor("project_intake"),
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
    runtimeActions: runtimeActionsFor("project_interview"),
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
    runtimeActions: runtimeActionsFor("reconciliation_review"),
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
    runtimeActions: runtimeActionsFor("project_mapping"),
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
    runtimeActions: runtimeActionsFor("operator_project_approval"),
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
    runtimeActions: runtimeActionsFor("phase_mapping"),
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
    runtimeActions: runtimeActionsFor("operator_phase_approval"),
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
    runtimeActions: runtimeActionsFor("work_card_loop"),
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
    runtimeActions: runtimeActionsFor("phase_closeout"),
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
    runtimeActions: runtimeActionsFor("operator_phase_closeout_approval"),
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
    runtimeActions: runtimeActionsFor("roadmap_update"),
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
    runtimeActions: runtimeActionsFor("next_phase_activation"),
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
    runtimeActions: runtimeActionsFor("repeat_phase_mapping_and_work_card_loop"),
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
