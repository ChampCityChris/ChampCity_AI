import { getArtifactDisplayName } from "./artifactReviewWorkspace";
import type {
  CurrentActionArtifactReference,
  CurrentActionPhaseState,
  CurrentActionValidationState,
  CurrentActionWorkCardState,
  CurrentRequiredAction,
  CurrentRequiredActionState,
  CurrentRequiredActionWarning,
  CurrentRequiredActionWarningSeverity,
} from "./currentRequiredAction";

export type CurrentStepStateCategoryId =
  | "project"
  | "phase"
  | "work_card"
  | "implementer_report"
  | "architect_review"
  | "operator_validation"
  | "repair"
  | "phase_closeout"
  | "roadmap"
  | "next_phase";

export type CurrentStepStateAuthority =
  | "controlling"
  | "supporting"
  | "historical"
  | "not_reported";

export interface CurrentStepStateCategory {
  id: CurrentStepStateCategoryId;
  label: string;
  status: string;
  summary: string;
  authority: CurrentStepStateAuthority;
  evidenceCount: number;
}

export interface CurrentStepRouteContext {
  projectName?: string;
  categories: CurrentStepStateCategory[];
}

export type CurrentStepCapabilityState =
  | "available"
  | "loading"
  | "degraded"
  | "unavailable"
  | "not_reported";

export interface CurrentStepCapabilityInput {
  currentActionIpcState: Exclude<
    CurrentStepCapabilityState,
    "degraded" | "not_reported"
  >;
  planningArtifactPreviewState: Exclude<
    CurrentStepCapabilityState,
    "loading" | "degraded" | "not_reported"
  >;
  directAppWriteState?: CurrentStepCapabilityState;
  mcpDirectWriteState?: CurrentStepCapabilityState;
}

export interface CurrentStepCapabilityItem {
  id:
    | "current_action_ipc"
    | "planning_artifact_preview"
    | "durable_state_write"
    | "mcp_direct_write"
    | "manual_fallback";
  label: string;
  state: CurrentStepCapabilityState;
  statusLabel: string;
  summary: string;
  technicalDetail?: string;
}

export interface CurrentStepMissingRecord {
  key: string;
  displayName: string;
  recordType: string;
  reason: string;
  path: string;
  impact: "blocking" | "warning" | "expected_next";
  impactLabel: string;
}

export type CurrentStepEvidenceClassification =
  | "stale"
  | "superseded"
  | "historical"
  | "malformed"
  | "unreadable"
  | "other";

export interface CurrentStepEvidenceHealthItem {
  key: string;
  label: string;
  summary: string;
  severity: CurrentRequiredActionWarningSeverity;
  classification: CurrentStepEvidenceClassification;
  authority: "blocking" | "supporting" | "historical";
  technicalCode: string;
  technicalMessage: string;
  sourceArtifactPath?: string;
}

export interface CurrentStepRouteOutcome {
  id: "success" | "failure" | "repair";
  label: string;
  description: string;
}

export interface CurrentStepContextInspectorModel {
  readOnly: true;
  route: {
    actionId: string;
    title: string;
    reason: string;
    responsibleRole: string;
    workflowStep: string;
    status: string;
    phaseLabel: string;
    workCardLabel: string;
    outcomes: CurrentStepRouteOutcome[];
  };
  stateCategories: CurrentStepStateCategory[];
  missingRecords: CurrentStepMissingRecord[];
  evidenceHealth: CurrentStepEvidenceHealthItem[];
  capabilities: CurrentStepCapabilityItem[];
  artifactGuidance: string;
}

const stateCategoryLabels: Record<CurrentStepStateCategoryId, string> = {
  project: "Project",
  phase: "Phase",
  work_card: "Work Card",
  implementer_report: "Implementer Report",
  architect_review: "Architect Review",
  operator_validation: "Operator Validation",
  repair: "Repair",
  phase_closeout: "Phase Closeout",
  roadmap: "Roadmap",
  next_phase: "Next Phase",
};

export function buildCurrentStepRouteContext(
  state: CurrentRequiredActionState,
  action: CurrentRequiredAction,
): CurrentStepRouteContext {
  const phase = state.activePhase;
  const workCard = findCurrentWorkCard(phase, action.workCardId);
  const repairIsCurrent = normalizeValue(action.id).startsWith("repair_");
  const projectArtifacts = [
    state.project.projectIntake,
    state.project.projectInterview,
    state.project.reconciliationReview,
    state.project.projectRoadmap,
    state.project.phaseMap,
    state.project.operatorProjectApproval,
  ];
  const projectStatus = state.project.blockedReason
    ? "Blocked"
    : state.project.isComplete
      ? "Complete"
      : phase
        ? "Active workflow"
        : "Current route available";
  const projectSummary = state.project.blockedReason
    ? state.project.blockedReason
    : state.project.isComplete
      ? "Durable project state is marked complete."
      : phase
        ? `Durable project records route work into ${phase.phaseId} - ${phase.phaseTitle}.`
        : "The current-action evaluator returned a project-level route, but no active phase state was reported.";

  return {
    projectName: state.project.projectName,
    categories: [
      category(
        "project",
        projectStatus,
        projectSummary,
        "controlling",
        countAvailable(projectArtifacts),
      ),
      phase
        ? category(
            "phase",
            phase.status || "Active",
            `${phase.phaseId} - ${phase.phaseTitle} is the phase reported by the durable route evaluator.`,
            "controlling",
            countAvailable([
              ...phase.sourceArtifacts,
              phase.operatorPhaseApproval,
            ]),
          )
        : notReported(
            "phase",
            "No active phase state was reported for this route.",
          ),
      workCard
        ? category(
            "work_card",
            workCard.status || action.status,
            `${workCard.workCardId} - ${workCard.title} is the Work Card state matched to the current route.`,
            "controlling",
            countAvailable(workCard.sourceArtifacts),
          )
        : action.workCardId
          ? category(
              "work_card",
              action.status,
              `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""} is named by the route. Its detailed Work Card state was not included in the evaluated phase state.`,
              "controlling",
              0,
            )
          : notReported(
              "work_card",
              "This route does not report a current Work Card.",
            ),
      buildImplementerReportCategory(action, workCard),
      buildArchitectReviewCategory(action, workCard),
      buildValidationCategory(action, workCard, repairIsCurrent),
      buildRepairCategory(action, workCard, repairIsCurrent),
      buildCloseoutCategory(action, phase),
      buildRoadmapCategory(action, state, phase),
      buildNextPhaseCategory(action, phase),
    ],
  };
}

export function buildCurrentStepContextInspector(
  action: CurrentRequiredAction,
  routeContext: CurrentStepRouteContext | undefined,
  capabilityInput: CurrentStepCapabilityInput,
): CurrentStepContextInspectorModel {
  return {
    readOnly: true,
    route: {
      actionId: action.id,
      title: action.title,
      reason: action.reason,
      responsibleRole: action.responsibleRole,
      workflowStep: action.workflowStep,
      status: action.status,
      phaseLabel: action.phaseId
        ? `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""}`
        : "Not reported by current app state",
      workCardLabel: action.workCardId
        ? `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""}`
        : "Not reported by current app state",
      outcomes: buildRouteOutcomes(action),
    },
    stateCategories:
      routeContext?.categories ?? buildFallbackStateCategories(action),
    missingRecords: action.missingArtifacts.map((missing) => {
      const isExpectedNext =
        normalizePath(missing.path) ===
        normalizePath(action.expectedOutput?.path ?? "");
      const impact =
        action.status === "blocked"
          ? "blocking"
          : isExpectedNext
            ? "expected_next"
            : "warning";

      return {
        key: `${missing.path}|${missing.reason}`,
        displayName: getArtifactDisplayName(missing.path),
        recordType: inferRecordType(missing.path),
        reason: missing.reason,
        path: missing.path,
        impact,
        impactLabel:
          impact === "blocking"
            ? "Blocks current route"
            : impact === "expected_next"
              ? "Expected next record"
              : "Route warning",
      };
    }),
    evidenceHealth: buildEvidenceHealth(action),
    capabilities: buildCapabilities(action, capabilityInput),
    artifactGuidance:
      "Use the Artifacts tab to browse or preview source documents. This inspector summarizes route evidence without creating a second artifact list.",
  };
}

export function shouldShowCurrentStepContextInspector(input: {
  hasAction: boolean;
  isViewingRoutedScreen: boolean;
  isViewingSupportingScreen: boolean;
}): boolean {
  return (
    input.hasAction &&
    input.isViewingRoutedScreen &&
    !input.isViewingSupportingScreen
  );
}

export function getPlainLanguageWarning(
  warning: CurrentRequiredActionWarning,
): string {
  if (warning.code === "stale_current_executable_work_card") {
    return "The roadmap's current Work Card label is behind newer planning evidence. The app is following the newer Work Card records.";
  }

  if (warning.code === "superseded_phase_artifact") {
    return "An older planning file is available for reference only. It does not control the current workflow.";
  }

  if (warning.code === "missing_stale_validation_target") {
    return "An older validation report points to a file that is no longer present. This is historical context and does not block the current action.";
  }

  if (warning.code.endsWith("_read_warning")) {
    return "The app could not read one supporting file, so some route context may be incomplete.";
  }

  if (warning.code.endsWith("_json_invalid")) {
    return "A supporting planning file is not valid JSON, so some route context may be incomplete.";
  }

  return warning.message;
}

function category(
  id: CurrentStepStateCategoryId,
  status: string,
  summary: string,
  authority: CurrentStepStateAuthority,
  evidenceCount: number,
): CurrentStepStateCategory {
  return {
    id,
    label: stateCategoryLabels[id],
    status: status || "Not reported by current app state",
    summary,
    authority,
    evidenceCount,
  };
}

function notReported(
  id: CurrentStepStateCategoryId,
  summary: string,
): CurrentStepStateCategory {
  return category(
    id,
    "Not reported by current app state",
    summary,
    "not_reported",
    0,
  );
}

function buildImplementerReportCategory(
  action: CurrentRequiredAction,
  workCard: CurrentActionWorkCardState | undefined,
): CurrentStepStateCategory {
  if (artifactIsAvailable(workCard?.implementerReport)) {
    return category(
      "implementer_report",
      workCard?.implementerReport?.status || "Available",
      "An Implementer Report is available and contributes to the selected route.",
      action.id === "implementer_report_required"
        ? "supporting"
        : "controlling",
      1,
    );
  }

  if (expectedTypeIncludes(action, "implementer report")) {
    return category(
      "implementer_report",
      "Required next",
      "The missing Implementer Report is the expected output for the current action.",
      "controlling",
      0,
    );
  }

  return notReported(
    "implementer_report",
    "No Implementer Report state was reported for this route.",
  );
}

function buildArchitectReviewCategory(
  action: CurrentRequiredAction,
  workCard: CurrentActionWorkCardState | undefined,
): CurrentStepStateCategory {
  if (artifactIsAvailable(workCard?.architectReview?.sourceArtifact)) {
    return category(
      "architect_review",
      workCard?.architectReview?.status ||
        workCard?.architectReview?.sourceArtifact.status ||
        "Available",
      "An Architect Review is available and contributes to the selected route.",
      "controlling",
      1,
    );
  }

  if (expectedTypeIncludes(action, "architect review")) {
    return category(
      "architect_review",
      "Required next",
      "The missing Architect Review is the expected output for the current action.",
      "controlling",
      0,
    );
  }

  return notReported(
    "architect_review",
    "No Architect Review state was reported for this route.",
  );
}

function buildValidationCategory(
  action: CurrentRequiredAction,
  workCard: CurrentActionWorkCardState | undefined,
  repairIsCurrent: boolean,
): CurrentStepStateCategory {
  if (workCard?.validation) {
    return category(
      "operator_validation",
      validationStatus(workCard.validation),
      repairIsCurrent
        ? "The prior Operator Validation outcome initiated the repair route. The active repair state, not this prior record alone, controls the current step."
        : workCard.validation.architectDispositionPending
          ? "The Operator supplied validation evidence. Architect disposition is pending and controls the next workflow decision."
          : "The latest Operator Validation state contributes to the selected route.",
      repairIsCurrent ? "supporting" : "controlling",
      countAvailable(workCard.validation.sourceArtifacts),
    );
  }

  if (
    expectedTypeIncludes(action, "validation") ||
    normalizeValue(action.id).includes("validation_required")
  ) {
    return category(
      "operator_validation",
      "Required next",
      "The current action expects an Operator Validation record.",
      "controlling",
      0,
    );
  }

  return notReported(
    "operator_validation",
    "No Operator Validation state was reported for this route.",
  );
}

function buildRepairCategory(
  action: CurrentRequiredAction,
  workCard: CurrentActionWorkCardState | undefined,
  repairIsCurrent: boolean,
): CurrentStepStateCategory {
  const repair = workCard?.repair;

  if (repair) {
    const status = repair.validation
      ? validationStatus(repair.validation)
      : artifactIsAvailable(repair.implementerReport)
        ? "Implementer Report available"
        : artifactIsAvailable(repair.repairWorkCard) ||
            artifactIsAvailable(repair.repairPrompt)
          ? "Repair route available"
          : "Repair state reported";
    const evidenceCount = countAvailable([
      repair.repairPrompt,
      repair.repairWorkCard,
      repair.implementerReport,
      ...(repair.validation?.sourceArtifacts ?? []),
    ]);

    return category(
      "repair",
      status,
      `${repair.repairId ?? "A repair record"} is ${repairIsCurrent ? "the active route" : "available as supporting workflow history"}.`,
      repairIsCurrent ? "controlling" : "supporting",
      evidenceCount,
    );
  }

  if (repairIsCurrent || expectedTypeIncludes(action, "repair")) {
    return category(
      "repair",
      "Required next",
      "The current action requires repair state, but no detailed repair record was reported.",
      "controlling",
      0,
    );
  }

  return notReported(
    "repair",
    "No repair state was reported for this route.",
  );
}

function buildCloseoutCategory(
  action: CurrentRequiredAction,
  phase: CurrentActionPhaseState | undefined,
): CurrentStepStateCategory {
  if (phase?.closeout) {
    return category(
      "phase_closeout",
      phase.closeout.decision ||
        (phase.closeout.operatorApproved ? "Operator approved" : "Reported"),
      "A Phase Closeout record is available in durable phase state.",
      normalizeValue(action.id).includes("closeout")
        ? "controlling"
        : "supporting",
      countAvailable([phase.closeout.sourceArtifact]),
    );
  }

  if (
    normalizeValue(action.id).includes("closeout") ||
    expectedTypeIncludes(action, "closeout")
  ) {
    return category(
      "phase_closeout",
      "Required next",
      "The current action requires a Phase Closeout record or decision.",
      "controlling",
      0,
    );
  }

  return notReported(
    "phase_closeout",
    "No Phase Closeout state was reported for this route.",
  );
}

function buildRoadmapCategory(
  action: CurrentRequiredAction,
  state: CurrentRequiredActionState,
  phase: CurrentActionPhaseState | undefined,
): CurrentStepStateCategory {
  if (artifactIsAvailable(state.project.projectRoadmap)) {
    return category(
      "roadmap",
      phase?.roadmapUpdatedAfterCloseout
        ? "Updated after closeout"
        : state.project.projectRoadmap?.status || "Available",
      "The living roadmap is available as project-level route evidence.",
      normalizeValue(action.id).includes("roadmap")
        ? "controlling"
        : "supporting",
      1,
    );
  }

  if (normalizeValue(action.id).includes("roadmap")) {
    return category(
      "roadmap",
      "Required next",
      "The current action requires a roadmap record or update.",
      "controlling",
      0,
    );
  }

  return notReported(
    "roadmap",
    "No roadmap capability state was reported for this route.",
  );
}

function buildNextPhaseCategory(
  action: CurrentRequiredAction,
  phase: CurrentActionPhaseState | undefined,
): CurrentStepStateCategory {
  if (phase?.nextPhaseActivated) {
    return category(
      "next_phase",
      "Activated",
      "Durable phase state reports that the next phase is activated.",
      "controlling",
      0,
    );
  }

  if (normalizeValue(action.id).includes("next_phase")) {
    return category(
      "next_phase",
      "Required next",
      "The current action requires a next-phase activation decision.",
      "controlling",
      0,
    );
  }

  return notReported(
    "next_phase",
    "No next-phase activation state was reported for this route.",
  );
}

function buildFallbackStateCategories(
  action: CurrentRequiredAction,
): CurrentStepStateCategory[] {
  return [
    category(
      "project",
      "Current route available",
      "The current-action result loaded, but detailed project state was not reported to the inspector.",
      "controlling",
      0,
    ),
    action.phaseId
      ? category(
          "phase",
          action.status,
          `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""} is named by the current route.`,
          "controlling",
          0,
        )
      : notReported("phase", "No phase state was reported for this route."),
    action.workCardId
      ? category(
          "work_card",
          action.status,
          `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""} is named by the current route.`,
          "controlling",
          0,
        )
      : notReported(
          "work_card",
          "No Work Card state was reported for this route.",
        ),
    ...(
      [
        "implementer_report",
        "architect_review",
        "operator_validation",
        "repair",
        "phase_closeout",
        "roadmap",
        "next_phase",
      ] as const
    ).map((id) =>
      notReported(
        id,
        `${stateCategoryLabels[id]} state was not reported by the current app state.`,
      ),
    ),
  ];
}

function buildRouteOutcomes(
  action: CurrentRequiredAction,
): CurrentStepRouteOutcome[] {
  return [
    action.successRoute
      ? {
          id: "success" as const,
          label: "After success",
          description: action.successRoute,
        }
      : undefined,
    action.failureRoute
      ? {
          id: "failure" as const,
          label: "After failure or revision",
          description: action.failureRoute,
        }
      : undefined,
    action.repairRoute
      ? {
          id: "repair" as const,
          label: "Repair route",
          description: action.repairRoute,
        }
      : undefined,
  ].filter(
    (outcome): outcome is CurrentStepRouteOutcome => outcome !== undefined,
  );
}

function buildEvidenceHealth(
  action: CurrentRequiredAction,
): CurrentStepEvidenceHealthItem[] {
  const warnings = action.warnings.map(toEvidenceHealthItem);
  const warningPaths = new Set(
    warnings
      .map((warning) => normalizePath(warning.sourceArtifactPath ?? ""))
      .filter(Boolean),
  );
  const statusItems = action.sourceArtifacts
    .filter((artifact) => {
      const normalizedStatus = normalizeValue(artifact.status);

      return (
        (normalizedStatus.includes("stale") ||
          normalizedStatus.includes("superseded") ||
          normalizedStatus.includes("historical")) &&
        !warningPaths.has(normalizePath(artifact.path))
      );
    })
    .map((artifact) => {
      const classification = classifyEvidenceStatus(artifact.status ?? "");

      return {
        key: `artifact-status|${artifact.path}|${artifact.status}`,
        label: `${artifact.role} marked ${classification}`,
        summary: `This ${artifact.role.toLowerCase()} is reference context only and is not presented as controlling workflow authority.`,
        severity: "info" as const,
        classification,
        authority: "historical" as const,
        technicalCode: `artifact_status_${classification}`,
        technicalMessage: artifact.status ?? classification,
        sourceArtifactPath: artifact.path,
      };
    });

  return [...warnings, ...statusItems].sort(
    (left, right) => severityRank(left.severity) - severityRank(right.severity),
  );
}

function toEvidenceHealthItem(
  warning: CurrentRequiredActionWarning,
): CurrentStepEvidenceHealthItem {
  const classification = classifyWarning(warning);
  const historical =
    classification === "stale" ||
    classification === "superseded" ||
    classification === "historical";

  return {
    key: `${warning.code}|${warning.sourceArtifactPath ?? warning.message}`,
    label: evidenceClassificationLabel(classification),
    summary: getPlainLanguageWarning(warning),
    severity: warning.severity,
    classification,
    authority: historical
      ? "historical"
      : warning.severity === "blocking"
        ? "blocking"
        : "supporting",
    technicalCode: warning.code,
    technicalMessage: warning.message,
    sourceArtifactPath: warning.sourceArtifactPath,
  };
}

function buildCapabilities(
  action: CurrentRequiredAction,
  input: CurrentStepCapabilityInput,
): CurrentStepCapabilityItem[] {
  const items: CurrentStepCapabilityItem[] = [
    capability(
      "current_action_ipc",
      "Current-action IPC read",
      input.currentActionIpcState,
      input.currentActionIpcState === "available"
        ? "The renderer received the durable current-action result."
        : input.currentActionIpcState === "loading"
          ? "The current-action result is still loading."
          : "The current-action IPC result is unavailable.",
    ),
    capability(
      "planning_artifact_preview",
      "Planning artifact preview",
      input.planningArtifactPreviewState,
      input.planningArtifactPreviewState === "available"
        ? "Read-only planning Markdown preview is available in the Artifacts tab."
        : "Read-only planning artifact preview is unavailable in this app state.",
    ),
    capability(
      "durable_state_write",
      "Durable-state write capability",
      input.directAppWriteState ?? "not_reported",
      input.directAppWriteState
        ? "The current app state reports a durable-state write capability status."
        : "Not reported by current app state. This inspector does not infer whether a route-specific form can write.",
    ),
    capability(
      "mcp_direct_write",
      "MCP / direct-write fallback",
      input.mcpDirectWriteState ?? "not_reported",
      input.mcpDirectWriteState
        ? "The current app state reports an MCP or direct-write fallback status."
        : "Not reported by current app state. No external connectivity is assumed.",
    ),
  ];

  if (action.manualFallback) {
    items.push({
      ...capability(
        "manual_fallback",
        "Manual fallback",
        action.manualFallback.available ? "available" : "unavailable",
        action.manualFallback.instructions,
      ),
      technicalDetail: action.manualFallback.artifactPath,
    });
  } else {
    items.push(
      capability(
        "manual_fallback",
        "Manual fallback",
        "not_reported",
        "Not reported by current app state for this route.",
      ),
    );
  }

  return items;
}

function capability(
  id: CurrentStepCapabilityItem["id"],
  label: string,
  state: CurrentStepCapabilityState,
  summary: string,
): CurrentStepCapabilityItem {
  const statusLabels: Record<CurrentStepCapabilityState, string> = {
    available: "Available",
    loading: "Loading",
    degraded: "Degraded",
    unavailable: "Unavailable",
    not_reported: "Not reported by current app state",
  };

  return { id, label, state, statusLabel: statusLabels[state], summary };
}

function findCurrentWorkCard(
  phase: CurrentActionPhaseState | undefined,
  workCardId: string | undefined,
): CurrentActionWorkCardState | undefined {
  if (!phase || !workCardId) {
    return undefined;
  }

  const normalizedId = normalizeWorkCardId(workCardId);

  return phase.workCards.find(
    (workCard) => normalizeWorkCardId(workCard.workCardId) === normalizedId,
  );
}

function normalizeWorkCardId(value: string): string {
  return normalizeValue(value).replace(/_repair_?\d+$/, "");
}

function artifactIsAvailable(
  artifact: CurrentActionArtifactReference | undefined,
): boolean {
  return Boolean(artifact?.path) && artifact?.exists !== false;
}

function countAvailable(
  artifacts: Array<CurrentActionArtifactReference | undefined>,
): number {
  return artifacts.filter(artifactIsAvailable).length;
}

function validationStatus(validation: CurrentActionValidationState): string {
  if (validation.architectDispositionPending) {
    return validation.result
      ? `${validation.result} - Architect disposition pending`
      : "Architect disposition pending";
  }

  if (validation.decision && validation.result) {
    return `${validation.result} - ${validation.decision}`;
  }

  return (
    validation.decision ||
    validation.result ||
    (validation.routeBlocked ? "Route blocked" : "Reported")
  );
}

function expectedTypeIncludes(
  action: CurrentRequiredAction,
  fragment: string,
): boolean {
  return normalizeValue(action.expectedOutput?.artifactType).includes(
    normalizeValue(fragment),
  );
}

function inferRecordType(path: string): string {
  const normalized = normalizePath(path).toLowerCase();

  if (normalized.includes("/builder_reports/")) {
    return normalized.includes("repair")
      ? "Repair Implementer Report"
      : "Implementer Report";
  }

  if (normalized.includes("/architect_reviews/")) {
    return "Architect Review";
  }

  if (normalized.includes("/validation_reports/")) {
    return normalized.includes("repair")
      ? "Repair Validation Report"
      : "Operator Validation Report";
  }

  if (normalized.includes("/work_cards/")) {
    return normalized.includes("repair") ? "Repair Work Card" : "Work Card";
  }

  if (normalized.includes("closeout")) {
    return "Phase Closeout Record";
  }

  if (normalized.includes("roadmap")) {
    return "Roadmap Record";
  }

  return "Planning record";
}

function classifyWarning(
  warning: CurrentRequiredActionWarning,
): CurrentStepEvidenceClassification {
  const code = normalizeValue(warning.code);
  const message = normalizeValue(warning.message);

  if (code.includes("superseded") || message.includes("superseded")) {
    return "superseded";
  }

  if (code === "missing_stale_validation_target") {
    return "historical";
  }

  if (code.includes("stale") || message.includes("stale")) {
    return "stale";
  }

  if (code.includes("json_invalid") || message.includes("not valid json")) {
    return "malformed";
  }

  if (code.includes("read_warning") || message.includes("could not read")) {
    return "unreadable";
  }

  return "other";
}

function classifyEvidenceStatus(
  status: string,
): Extract<
  CurrentStepEvidenceClassification,
  "stale" | "superseded" | "historical"
> {
  const normalized = normalizeValue(status);

  if (normalized.includes("superseded")) {
    return "superseded";
  }

  if (normalized.includes("historical")) {
    return "historical";
  }

  return "stale";
}

function evidenceClassificationLabel(
  classification: CurrentStepEvidenceClassification,
): string {
  const labels: Record<CurrentStepEvidenceClassification, string> = {
    stale: "Stale evidence",
    superseded: "Superseded evidence",
    historical: "Historical evidence",
    malformed: "Malformed supporting record",
    unreadable: "Unreadable supporting record",
    other: "Route warning",
  };

  return labels[classification];
}

function severityRank(severity: CurrentRequiredActionWarningSeverity): number {
  return { blocking: 0, warning: 1, info: 2 }[severity];
}

function normalizePath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizeValue(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
