import type {
  WorkflowRole,
  WorkflowScreenId,
  WorkflowTransitionRoute,
} from "../../shared/workflow";

export type ProcessIpcOperation =
  | "preview"
  | "save"
  | "supporting-write"
  | "reference-read"
  | "corrective-write"
  | "context-utility";

export interface RoutedProcessVariant {
  actionId: string;
  role: WorkflowRole;
  screenId: WorkflowScreenId;
  expectedOutputArtifactType: string;
}

export interface RoutedProcessIpcPolicy {
  kind: "routed";
  channel: string;
  operation: ProcessIpcOperation;
  variants: readonly RoutedProcessVariant[];
  allowedAuxiliaryArtifactTypes: readonly string[];
  transition:
    | { mode: "none" }
    | { mode: "success" }
    | { mode: "human-validation-result" }
    | { mode: "handled-by-writer" };
}

export interface NonRoutedProcessIpcPolicy {
  kind: "non-routed";
  channel: string;
  operation: ProcessIpcOperation;
  classification:
    | "reference-navigation"
    | "route-correction"
    | "context-packet"
    | "supporting-preparation";
  allow: true;
  reason: string;
}

export type ProcessIpcPolicy =
  | RoutedProcessIpcPolicy
  | NonRoutedProcessIpcPolicy;

const route = (
  actionId: string,
  role: WorkflowRole,
  screenId: WorkflowScreenId,
  expectedOutputArtifactType: string,
): RoutedProcessVariant => ({
  actionId,
  role,
  screenId,
  expectedOutputArtifactType,
});

const routedPair = (
  prefix: string,
  variant: RoutedProcessVariant,
  options: {
    previewSuffix?: string;
    saveSuffix?: string;
    auxiliary?: readonly string[];
    transition?: RoutedProcessIpcPolicy["transition"];
  } = {},
): RoutedProcessIpcPolicy[] => [
  {
    kind: "routed",
    channel: `${prefix}${options.previewSuffix ?? ":preview"}`,
    operation: "preview",
    variants: [variant],
    allowedAuxiliaryArtifactTypes: [],
    transition: { mode: "none" },
  },
  {
    kind: "routed",
    channel: `${prefix}${options.saveSuffix ?? ":save"}`,
    operation: "save",
    variants: [variant],
    allowedAuxiliaryArtifactTypes: options.auxiliary ?? [],
    transition: options.transition ?? { mode: "success" },
  },
];

const routedSupportingPair = (
  prefix: string,
  variant: RoutedProcessVariant,
  auxiliaryArtifactTypes: readonly string[],
  options: { previewSuffix?: string; saveSuffix?: string } = {},
): RoutedProcessIpcPolicy[] => [
  {
    kind: "routed",
    channel: `${prefix}${options.previewSuffix ?? ":preview"}`,
    operation: "preview",
    variants: [variant],
    allowedAuxiliaryArtifactTypes: [],
    transition: { mode: "none" },
  },
  {
    kind: "routed",
    channel: `${prefix}${options.saveSuffix ?? ":save"}`,
    operation: "supporting-write",
    variants: [variant],
    allowedAuxiliaryArtifactTypes: auxiliaryArtifactTypes,
    transition: { mode: "none" },
  },
];

const workCardAuthoringVariants = [
  route("work_card_authoring_required", "architect", "work-card-authoring", "work_card"),
  route("repair_work_card_required", "architect", "repair-work-card-authoring", "work_card"),
] as const;

const phaseMappingVariant = route(
  "phase_mapping_required",
  "architect",
  "phase-mapping",
  "phase_map",
);

/**
 * Complete inventory for IPC operations that preview or write process data.
 * Registering one of these handlers without a policy is a startup error.
 */
export const processIpcPolicies: readonly ProcessIpcPolicy[] = [
  ...routedPair(
    "projectIntake",
    route("project_intake_required", "operator", "project-intake", "project_intake"),
  ),
  ...routedPair(
    "projectArchitectInterview",
    route(
      "project_interview_required",
      "architect",
      "project-architect-interview",
      "architect_interview",
    ),
    { previewSuffix: ":previewPrompt", saveSuffix: ":savePrompt" },
  ),
  ...routedSupportingPair(
    "projectPlanningDocuments",
    route("project_mapping_required", "architect", "project-mapping", "roadmap"),
    ["project_planning", "supporting_document"],
  ),
  ...routedSupportingPair(
    "phaseIntake",
    phaseMappingVariant,
    ["phase_intake"],
  ),
  ...routedSupportingPair(
    "phaseArchitectInterview",
    phaseMappingVariant,
    ["architect_interview"],
    { previewSuffix: ":previewPrompt", saveSuffix: ":savePrompt" },
  ),
  {
    kind: "routed",
    channel: "repositoryReconciliation:previewPrompt",
    operation: "preview",
    variants: [
      route(
        "reconciliation_review_required",
        "architect",
        "repository-reconciliation",
        "repository_reconciliation",
      ),
    ],
    allowedAuxiliaryArtifactTypes: [],
    transition: { mode: "none" },
  },
  ...routedPair(
    "repositoryReconciliation",
    route(
      "reconciliation_review_required",
      "architect",
      "repository-reconciliation",
      "repository_reconciliation",
    ),
  ),
  ...routedPair(
    "projectRoadmap",
    route("project_mapping_required", "architect", "project-mapping", "roadmap"),
    { auxiliary: ["phase_readiness_review", "work_card_plan", "phase_intake"] },
  ),
  ...routedPair(
    "phaseMap",
    route("phase_mapping_required", "architect", "phase-mapping", "phase_map"),
  ),
  ...routedSupportingPair(
    "phasePlanning",
    phaseMappingVariant,
    ["phase_planning", "work_card_plan", "backlog"],
  ),
  {
    kind: "routed",
    channel: "workCards:previewDraft",
    operation: "preview",
    variants: workCardAuthoringVariants,
    allowedAuxiliaryArtifactTypes: [],
    transition: { mode: "none" },
  },
  {
    kind: "routed",
    channel: "workCards:saveDraft",
    operation: "save",
    variants: workCardAuthoringVariants,
    allowedAuxiliaryArtifactTypes: [],
    transition: { mode: "success" },
  },
  ...["workCards:previewImplementerExecutionPacket", "workCards:saveImplementerExecutionPacket"].map(
    (channel): NonRoutedProcessIpcPolicy => ({
      kind: "non-routed",
      channel,
      operation: channel.includes(":preview") ? "preview" : "supporting-write",
      classification: "supporting-preparation",
      allow: true,
      reason:
        "The approved Work Card is the Implementer handoff; an execution packet is optional non-authoritative context and cannot advance workflow state.",
    }),
  ),
  ...routedPair(
    "workCards",
    route(
      "implementer_execution_required",
      "implementer",
      "implementer-execution",
      "implementer_report",
    ),
    {
      previewSuffix: ":previewImplementerReportCapture",
      saveSuffix: ":saveImplementerReportCapture",
    },
  ),
  ...routedPair(
    "workCards",
    route(
      "architect_review_of_implementer_report_required",
      "architect",
      "architect-review",
      "architect_review",
    ),
    {
      previewSuffix: ":previewArchitectReviewRecord",
      saveSuffix: ":saveArchitectReviewRecord",
      transition: { mode: "handled-by-writer" },
    },
  ),
  ...routedPair(
    "workCards",
    route(
      "operator_validation_required",
      "operator",
      "operator-validation",
      "validation_report",
    ),
    {
      previewSuffix: ":previewHumanValidationRecord",
      saveSuffix: ":saveHumanValidationRecord",
      auxiliary: ["repair_record"],
      transition: { mode: "human-validation-result" },
    },
  ),
  ...routedPair(
    "workCards",
    route("phase_closeout_required", "architect", "phase-closeout", "phase_closeout"),
    {
      previewSuffix: ":previewPhaseCloseoutRecord",
      saveSuffix: ":savePhaseCloseoutRecord",
    },
  ),
  {
    kind: "routed",
    channel: "workCards:attachValidationEvidenceFile",
    operation: "supporting-write",
    variants: [
      route(
        "operator_validation_required",
        "operator",
        "operator-validation",
        "validation_report",
      ),
    ],
    allowedAuxiliaryArtifactTypes: [],
    transition: { mode: "none" },
  },
  ...["workCards:previewArchitectPrompt", "workCards:previewRiskReview"].map(
    (channel): NonRoutedProcessIpcPolicy => ({
      kind: "non-routed",
      channel,
      operation: "preview",
      classification: "supporting-preparation",
      allow: true,
      reason:
        "This is a non-authoritative preparation preview; it cannot select or advance routed authority.",
    }),
  ),
  ...["workCards:saveArchitectPrompt", "workCards:saveRiskReview"].map(
    (channel): NonRoutedProcessIpcPolicy => ({
      kind: "non-routed",
      channel,
      operation: "supporting-write",
      classification: "supporting-preparation",
      allow: true,
      reason:
        "Architect prompts and risk reviews are optional preparation artifacts; they cannot become a primary Implementer handoff gate.",
    }),
  ),
  {
    kind: "non-routed",
    channel: "workCards:saveRouteReviewRequest",
    operation: "corrective-write",
    classification: "route-correction",
    allow: true,
    reason:
      "A correction request must remain available when routed authority itself is blocked or disputed.",
  },
  {
    kind: "non-routed",
    channel: "workCards:previewPlanningArtifact",
    operation: "reference-read",
    classification: "reference-navigation",
    allow: true,
    reason:
      "Artifact preview is read-only reference navigation and cannot grant write authority.",
  },
  ...["contextPackets:previewCurrent", "contextPackets:exportCurrent"].map(
    (channel): NonRoutedProcessIpcPolicy => ({
      kind: "non-routed",
      channel,
      operation: "context-utility",
      classification: "context-packet",
      allow: true,
      reason:
        "Context packets summarize current authority but do not create lifecycle transition evidence.",
    }),
  ),
] as const;

const policyByChannel = new Map(
  processIpcPolicies.map((policy) => [policy.channel, policy]),
);

if (policyByChannel.size !== processIpcPolicies.length) {
  throw new Error("Process IPC policy channels must be unique.");
}

export function requireProcessIpcPolicy(channel: string): ProcessIpcPolicy {
  const policy = policyByChannel.get(channel);
  if (!policy) {
    throw new Error(`Process IPC channel ${channel} has no explicit authority policy.`);
  }
  return policy;
}

export function resolveTransitionRoute(
  policy: RoutedProcessIpcPolicy,
  input: unknown,
): WorkflowTransitionRoute | null {
  if (policy.transition.mode === "success") return "success";
  if (policy.transition.mode !== "human-validation-result") return null;
  if (
    typeof input === "object" &&
    input !== null &&
    "validationResult" in input &&
    input.validationResult === "Pass"
  ) {
    return "success";
  }
  return "failure";
}
