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

export interface CurrentStepPlainLanguageExplanation {
  evidenceOnRecord: string[];
  acceptedEvidence: string[];
  pendingEvidence: string[];
  missingEvidence: string[];
  nonControllingEvidence: string[];
  ambiguityWarnings: string[];
  priorityReason: string;
  advancementBlock: string;
}

export interface CurrentStepNextActionExplanation {
  responsibleParty: string;
  requiredAction: string;
  expectedOutput: string;
  afterCompletion: string;
}

export interface CurrentStepRouteChangeCondition {
  id: string;
  description: string;
}

export interface CurrentStepRouteCorrectionGuidance {
  recordsToReview: string[];
  controllingIssue: string;
  currentRoute: string;
  expectedControllingEvidence: string[];
  pendingOrMissingEvidence: string[];
  ambiguityWarnings: string[];
  durableAction: string;
  governanceSummary: string;
}

export interface CurrentStepContextInspectorModel {
  readOnly: true;
  explanation: CurrentStepPlainLanguageExplanation;
  nextAction: CurrentStepNextActionExplanation;
  routeChangeConditions: CurrentStepRouteChangeCondition[];
  correctionGuidance: CurrentStepRouteCorrectionGuidance;
  route: {
    actionId: string;
    title: string;
    reason: string;
    responsibleRole: string;
    workflowStep: string;
    status: string;
    phaseId?: string;
    phaseLabel: string;
    workCardId?: string;
    workCardTitle?: string;
    workCardLabel: string;
    expectedOutput?: string;
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
  const repairIsCurrent =
    normalizeValue(action.id).startsWith("repair_") ||
    Boolean(
      action.workCardId &&
        workCard?.repair?.repairId &&
        normalizeValue(action.workCardId) ===
          normalizeValue(workCard.repair.repairId),
    );
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
      buildWorkCardCategory(action, workCard, repairIsCurrent),
      buildImplementerReportCategory(action, workCard, repairIsCurrent),
      buildArchitectReviewCategory(action, workCard, repairIsCurrent),
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
  const stateCategories =
    routeContext?.categories ?? buildFallbackStateCategories(action);
  const missingRecords = buildMissingRecords(action);

  return {
    readOnly: true,
    explanation: buildPlainLanguageExplanation(
      action,
      stateCategories,
      missingRecords,
    ),
    nextAction: buildNextActionExplanation(action),
    routeChangeConditions: buildRouteChangeConditions(action, missingRecords),
    correctionGuidance: buildCorrectionGuidance(
      action,
      stateCategories,
      missingRecords,
    ),
      route: {
      actionId: action.id,
      title: action.title,
      reason: action.reason,
      responsibleRole: action.responsibleRole,
      workflowStep: action.workflowStep,
        status: action.status,
        phaseId: action.phaseId,
      phaseLabel: action.phaseId
        ? `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""}`
        : "Not reported by current app state",
        workCardLabel: action.workCardId
        ? `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""}`
          : "Not reported by current app state",
        workCardId: action.workCardId,
        workCardTitle: action.workCardTitle,
        expectedOutput: action.expectedOutput
          ? `${action.expectedOutput.artifactType}: ${ensureSentence(action.expectedOutput.description)}`
          : undefined,
      outcomes: buildRouteOutcomes(action),
    },
    stateCategories,
    missingRecords,
    evidenceHealth: buildEvidenceHealth(action),
    capabilities: buildCapabilities(action, capabilityInput),
    artifactGuidance:
      "Use the Artifacts tab to browse or preview source documents. This inspector summarizes route evidence without creating a second artifact list.",
  };
}

function buildMissingRecords(
  action: CurrentRequiredAction,
): CurrentStepMissingRecord[] {
  return action.missingArtifacts.map((missing) => {
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
  });
}

function buildPlainLanguageExplanation(
  action: CurrentRequiredAction,
  categories: CurrentStepStateCategory[],
  missingRecords: CurrentStepMissingRecord[],
): CurrentStepPlainLanguageExplanation {
  const categoryPriority: CurrentStepStateCategoryId[] = [
    "repair",
    "operator_validation",
    "architect_review",
    "implementer_report",
    "work_card",
    "phase",
    "project",
    "phase_closeout",
    "roadmap",
    "next_phase",
  ];
  const explicitEvidence = action.evidenceClassifications ?? [];
  const acceptedEvidence = explicitEvidence
    .filter((item) => item.classification === "accepted_controlling")
    .map((item) => `${item.label}: ${ensureSentence(item.summary)}`);

  if (acceptedEvidence.length === 0) {
    acceptedEvidence.push(
      ...categories
        .filter(
          (state) =>
            state.evidenceCount > 0 &&
            state.authority !== "historical" &&
            state.authority !== "not_reported",
        )
        .sort(
          (left, right) =>
            categoryPriority.indexOf(left.id) -
            categoryPriority.indexOf(right.id),
        )
        .slice(0, 5)
        .map(
          (state) =>
            `${state.label}: ${plainContextValue(state.status)}. ${state.summary}`,
        ),
    );
  }

  if (acceptedEvidence.length === 0) {
    const sourceRoles = uniqueStrings(
      action.sourceArtifacts
        .filter((artifact) => !isHistoricalStatus(artifact.status))
        .map((artifact) => artifact.role),
    );

    acceptedEvidence.push(
      ...sourceRoles
        .slice(0, 5)
        .map((role) => `${role} evidence is available to the route evaluator.`),
    );
  }

  if (acceptedEvidence.length === 0) {
    acceptedEvidence.push(
      "The current-action evaluator returned this route, but it did not report a supporting record summary.",
    );
  }

  const pendingEvidence = explicitEvidence
    .filter(
      (item) => item.classification === "present_pending_disposition",
    )
    .map((item) => `${item.label}: ${ensureSentence(item.summary)}`);
  const missingEvidence = missingRecords
    .map(
      (record) =>
        `${record.recordType} is still required. ${ensureSentence(record.reason)}`,
    );
  const nonControllingEvidence = explicitEvidence
    .filter(
      (item) => item.classification === "stale_historical_superseded",
    )
    .map((item) => `${item.label}: ${ensureSentence(item.summary)}`);
  const ambiguityWarnings = explicitEvidence
    .filter((item) => item.classification === "duplicate_ambiguous")
    .map((item) => `${item.label}: ${ensureSentence(item.summary)}`);

  if (
    pendingEvidence.length === 0 &&
    missingEvidence.length === 0 &&
    action.expectedOutput
  ) {
    pendingEvidence.push(
      `${action.expectedOutput.artifactType} is still pending. ${ensureSentence(action.expectedOutput.description)}`,
    );
  }

  if (pendingEvidence.length === 0 && missingEvidence.length === 0) {
    const pendingCategory = categories.find(
      (state) =>
        state.authority === "controlling" &&
        /pending|required next|blocked/i.test(state.status),
    );

    pendingEvidence.push(
      pendingCategory
        ? `${pendingCategory.label} remains unresolved. ${pendingCategory.summary}`
        : action.status === "complete"
          ? "No additional evidence is pending for this completed route."
          : `The route is waiting for ${plainRoleLabel(action.responsibleRole)} to complete the current action.`,
    );
  }

  const routeTarget = action.workCardId
    ? `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""}`
    : action.phaseId
      ? `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""}`
      : action.workflowStep;
  const unresolvedObligation =
    action.expectedOutput?.artifactType ?? action.title;
  const priorityReason =
    action.status === "complete"
      ? `The durable evidence for ${routeTarget} is resolved, so no later action is being held behind this completed route.`
      : action.status === "blocked"
        ? `The recorded blocker for ${routeTarget} takes priority over later work. ${ensureSentence(action.reason)}`
        : `This action has priority over later work because ${routeTarget} still has an unresolved ${unresolvedObligation.toLowerCase()} obligation. ${ensureSentence(action.reason)}`;
  const advancementBlock =
    action.status === "complete"
      ? "The app may select a later action the next time durable state is evaluated."
      : action.expectedOutput
        ? `The app has not advanced because ${action.expectedOutput.artifactType.toLowerCase()} is not yet recorded as resolved. ${ensureSentence(action.expectedOutput.description)}`
        : missingRecords.length > 0
          ? `The app has not advanced because ${missingRecords[0].recordType.toLowerCase()} is still unresolved. ${ensureSentence(missingRecords[0].reason)}`
          : `The app has not advanced because ${plainRoleLabel(action.responsibleRole)} has not yet completed this action in durable workflow evidence.`;

  return {
    evidenceOnRecord: acceptedEvidence,
    acceptedEvidence,
    pendingEvidence,
    missingEvidence,
    nonControllingEvidence,
    ambiguityWarnings,
    priorityReason,
    advancementBlock,
  };
}

function buildNextActionExplanation(
  action: CurrentRequiredAction,
): CurrentStepNextActionExplanation {
  return {
    responsibleParty: plainRoleLabel(action.responsibleRole),
    requiredAction: ensureSentence(action.summary || action.title),
    expectedOutput: action.expectedOutput
      ? `${action.expectedOutput.artifactType}: ${ensureSentence(action.expectedOutput.description)}`
      : action.status === "complete"
        ? "No new durable output is expected for this completed route."
        : "No separate durable output was reported; completing the current action is the required evidence.",
    afterCompletion: action.successRoute
      ? `After the required evidence is complete, the workflow can continue to ${ensureSentence(action.successRoute)}`
      : "After the action is complete, ChampCity A/I will evaluate the durable records again and select the next unresolved action.",
  };
}

function buildRouteChangeConditions(
  action: CurrentRequiredAction,
  missingRecords: CurrentStepMissingRecord[],
): CurrentStepRouteChangeCondition[] {
  const conditions: CurrentStepRouteChangeCondition[] = [];

  if (action.expectedOutput) {
    conditions.push({
      id: "expected-output",
      description: action.successRoute
        ? `Recording a resolved ${action.expectedOutput.artifactType} would let the app evaluate the route toward ${ensureSentence(action.successRoute)}`
        : `Recording a resolved ${action.expectedOutput.artifactType} would let the app evaluate the next durable action.`,
    });
  } else if (action.successRoute) {
    conditions.push({
      id: "success",
      description: `Evidence that the current action is complete would let the workflow continue to ${ensureSentence(action.successRoute)}`,
    });
  }

  for (const record of missingRecords.filter(
    (item) =>
      item.impact === "blocking" &&
      normalizeValue(item.recordType) !==
        normalizeValue(action.expectedOutput?.artifactType),
  )) {
    conditions.push({
      id: `missing-${record.key}`,
      description: `Providing or correcting the required ${record.recordType} would remove this recorded route blocker.`,
    });
  }

  if (action.failureRoute) {
    conditions.push({
      id: "failure",
      description: `Evidence that the action failed or needs revision would select this path: ${ensureSentence(action.failureRoute)}`,
    });
  }

  if (action.repairRoute) {
    conditions.push({
      id: "repair",
      description: `An Architect disposition requiring repair would select this path: ${ensureSentence(action.repairRoute)}`,
    });
  }

  if (conditions.length === 0) {
    conditions.push({
      id: "reevaluate",
      description:
        "A change to the controlling durable evidence would cause ChampCity A/I to evaluate the route again.",
    });
  }

  return conditions;
}

function buildCorrectionGuidance(
  action: CurrentRequiredAction,
  categories: CurrentStepStateCategory[],
  missingRecords: CurrentStepMissingRecord[],
): CurrentStepRouteCorrectionGuidance {
  const classifiedEvidence = action.evidenceClassifications ?? [];
  const recordsToReview = uniqueStrings(
    classifiedEvidence.map((item) => item.label),
  ).slice(0, 8);

  if (recordsToReview.length === 0) {
    recordsToReview.push(
      ...categories
        .filter(
          (state) =>
            state.evidenceCount > 0 && state.authority !== "historical",
        )
        .map((state) => state.label)
        .slice(0, 6),
    );
  }

  const target = action.workCardId
    ? `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""}`
    : action.phaseId
      ? `${action.phaseId}${action.phaseTitle ? ` - ${action.phaseTitle}` : ""}`
      : action.workflowStep;
  const controllingIssue = action.expectedOutput
    ? `The route is waiting for ${action.expectedOutput.artifactType}. ${ensureSentence(action.expectedOutput.description)}`
    : missingRecords[0]
      ? `${missingRecords[0].recordType} is unresolved. ${ensureSentence(missingRecords[0].reason)}`
      : ensureSentence(action.reason);
  const expectedControllingEvidence = classifiedEvidence
    .filter((item) => item.classification === "accepted_controlling")
    .map((item) => `${item.label}: ${ensureSentence(item.summary)}`);
  const pendingOrMissingEvidence = [
    ...classifiedEvidence
      .filter(
        (item) => item.classification === "present_pending_disposition",
      )
      .map((item) => `${item.label}: ${ensureSentence(item.summary)}`),
    ...missingRecords.map(
      (record) =>
        `${record.recordType}: ${ensureSentence(record.reason)}`,
    ),
  ];
  const ambiguityWarnings = classifiedEvidence
    .filter((item) => item.classification === "duplicate_ambiguous")
    .map((item) => `${item.label}: ${ensureSentence(item.summary)}`);

  return {
    recordsToReview,
    controllingIssue,
    currentRoute: `${target}: ${action.title}. ${ensureSentence(action.reason)}`,
    expectedControllingEvidence:
      expectedControllingEvidence.length > 0
        ? expectedControllingEvidence
        : ["Review the controlling records shown in the existing Artifacts tab."],
    pendingOrMissingEvidence:
      pendingOrMissingEvidence.length > 0
        ? pendingOrMissingEvidence
        : ["No separate missing or pending record was reported by the evaluator."],
    ambiguityWarnings,
    durableAction:
      "Save a Route Review Request inside ChampCity A/I. The request records the concern for Architect disposition without changing the selected route.",
    governanceSummary:
      "The Operator reports the concern. The Architect decides which evidence controls. The Implementer repairs the evaluator or artifact model only when assigned. Saving a request cannot approve, validate, complete, skip, or advance work.",
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

function buildWorkCardCategory(
  action: CurrentRequiredAction,
  workCard: CurrentActionWorkCardState | undefined,
  repairIsCurrent: boolean,
): CurrentStepStateCategory {
  const repair = repairIsCurrent ? workCard?.repair : undefined;

  if (repair?.repairWorkCard) {
    return category(
      "work_card",
      repair.status || repair.repairWorkCard.status || action.status,
      `${repair.repairId ?? action.workCardId ?? "Repair"}${repair.title ? ` - ${repair.title}` : ""} is the controlling Repair Work Card matched to the current route.`,
      "controlling",
      1,
    );
  }

  if (workCard) {
    return category(
      "work_card",
      workCard.status || action.status,
      `${workCard.workCardId} - ${workCard.title} is the Work Card state matched to the current route.`,
      "controlling",
      countAvailable(workCard.sourceArtifacts),
    );
  }

  if (action.workCardId) {
    return category(
      "work_card",
      action.status,
      `${action.workCardId}${action.workCardTitle ? ` - ${action.workCardTitle}` : ""} is named by the route. Its detailed Work Card state was not included in the evaluated phase state.`,
      "controlling",
      0,
    );
  }

  return notReported(
    "work_card",
    "This route does not report a current Work Card.",
  );
}

function buildImplementerReportCategory(
  action: CurrentRequiredAction,
  workCard: CurrentActionWorkCardState | undefined,
  repairIsCurrent: boolean,
): CurrentStepStateCategory {
  const implementerReport = repairIsCurrent
    ? workCard?.repair?.implementerReport
    : workCard?.implementerReport;

  if (artifactIsAvailable(implementerReport)) {
    return category(
      "implementer_report",
      implementerReport?.status || "Available",
      repairIsCurrent
        ? "A repair Implementer Report is available and contributes to the selected repair route."
        : "An Implementer Report is available and contributes to the selected route.",
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
  repairIsCurrent: boolean,
): CurrentStepStateCategory {
  const architectReview = repairIsCurrent
    ? workCard?.repair?.architectReview
    : workCard?.architectReview;

  if (artifactIsAvailable(architectReview?.sourceArtifact)) {
    return category(
      "architect_review",
      architectReview?.status ||
        architectReview?.sourceArtifact.status ||
        "Available",
      repairIsCurrent
        ? "A repair Architect Review is available and contributes to the selected repair route."
        : "An Architect Review is available and contributes to the selected route.",
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
  const validation = repairIsCurrent
    ? workCard?.repair?.validation
    : workCard?.validation;

  if (validation) {
    return category(
      "operator_validation",
      validationStatus(validation),
      repairIsCurrent
        ? validation.architectDispositionPending
          ? "Repair validation evidence is present, but Architect disposition remains pending."
          : "Repair validation evidence is present for the selected repair route."
        : validation.architectDispositionPending
          ? "The Operator supplied validation evidence. Architect disposition is pending and controls the next workflow decision."
          : "The latest Operator Validation state contributes to the selected route.",
      "controlling",
      countAvailable(validation.sourceArtifacts),
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
      repair.architectReview?.sourceArtifact,
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

function plainRoleLabel(
  role: CurrentRequiredAction["responsibleRole"],
): string {
  return {
    operator: "Operator",
    architect: "Architect",
    implementer: "Implementer",
    app_system: "ChampCity A/I",
  }[role];
}

function plainContextValue(value: string): string {
  return value.replace(/_/g, " ");
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || /[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = normalizeValue(value);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isHistoricalStatus(status: string | undefined): boolean {
  return /stale|superseded|historical/.test(normalizeValue(status));
}

function joinHumanList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "the controlling route records";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
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
