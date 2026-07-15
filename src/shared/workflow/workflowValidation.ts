import {
  ROUTED_ACTION_SCHEMA_VERSION,
  WORKFLOW_STATE_SCHEMA_VERSION,
  candidateResolutionStatuses,
  workflowRoles,
  workflowStages,
  type RoutedActionContract,
  type WorkflowActionRecord,
  type WorkflowStateIndex,
} from "./workflowContracts";

export interface WorkflowStateValidationResult {
  valid: boolean;
  errors: string[];
}

export class WorkflowStateValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(`Invalid canonical workflow state: ${errors.join("; ")}`);
    this.name = "WorkflowStateValidationError";
  }
}

export function validateWorkflowStateIndex(value: unknown): WorkflowStateValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["Workflow state must be an object."] };

  requireEqual(value.schemaVersion, WORKFLOW_STATE_SCHEMA_VERSION, "schemaVersion", errors);
  requireNonEmptyString(value.workflowStateArtifactId, "workflowStateArtifactId", errors);
  requireNonEmptyString(value.projectId, "projectId", errors);
  requirePositiveInteger(value.stateRevision, "stateRevision", errors);
  requireIsoDate(value.createdAt, "createdAt", errors);
  requireIsoDate(value.updatedAt, "updatedAt", errors);
  if (!workflowStages.includes(value.currentStage as (typeof workflowStages)[number])) {
    errors.push("currentStage must be a canonical workflow stage.");
  }
  if (value.activePhaseId !== null) {
    requireNonEmptyString(value.activePhaseId, "activePhaseId", errors);
  }

  if (!isRecord(value.actionCatalog)) {
    errors.push("actionCatalog must be an object.");
  } else {
    for (const [key, item] of Object.entries(value.actionCatalog)) {
      validateActionRecord(key, item, errors);
    }
  }

  if (!isRecord(value.stageStates)) {
    errors.push("stageStates must be an object.");
  } else {
    for (const stage of workflowStages) {
      const stageState = value.stageStates[stage];
      if (!isRecord(stageState) || stageState.stage !== stage) {
        errors.push(`stageStates.${stage} must identify stage ${stage}.`);
      }
    }
  }

  if (value.currentActionId === null) {
    if (value.currentAction !== null) {
      errors.push("currentAction must be null when currentActionId is null.");
    }
  } else {
    requireNonEmptyString(value.currentActionId, "currentActionId", errors);
    if (!isRecord(value.actionCatalog) || !isRecord(value.actionCatalog[value.currentActionId as string])) {
      errors.push("currentActionId must identify an action in actionCatalog.");
    }
    validateRoutedAction(value.currentAction, value, errors);
  }

  for (const field of ["requiredSourceArtifactIds", "blockingConditions", "transitionHistory"] as const) {
    if (!Array.isArray(value[field])) errors.push(`${field} must be an array.`);
  }
  validatePhaseExecution(value.phaseExecution, errors);
  for (const field of ["openRepairChain", "closeout", "roadmap", "nextPhase"] as const) {
    if (!isRecord(value[field])) errors.push(`${field} must be an object.`);
  }
  return { valid: errors.length === 0, errors };
}

function validatePhaseExecution(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("phaseExecution must be an object.");
    return;
  }
  if (
    !["authoritative", "missing", "unsynchronized", "ambiguous"].includes(
      String(value.workCardPlanAuthority),
    )
  ) {
    errors.push("phaseExecution.workCardPlanAuthority is invalid.");
  }
  if (value.workCardPlanArtifactId !== null) {
    requireNonEmptyString(
      value.workCardPlanArtifactId,
      "phaseExecution.workCardPlanArtifactId",
      errors,
    );
  }
  if (!Array.isArray(value.approvedCandidates)) {
    errors.push("phaseExecution.approvedCandidates must be an array.");
  } else {
    const ids = new Set<string>();
    const orders = new Set<number>();
    for (const [index, candidate] of value.approvedCandidates.entries()) {
      const field = `phaseExecution.approvedCandidates[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${field} must be an object.`);
        continue;
      }
      requireNonEmptyString(candidate.candidateId, `${field}.candidateId`, errors);
      requirePositiveInteger(candidate.order, `${field}.order`, errors);
      requireNonEmptyString(candidate.title, `${field}.title`, errors);
      if (candidate.fullWorkCardArtifactId !== null) {
        requireNonEmptyString(
          candidate.fullWorkCardArtifactId,
          `${field}.fullWorkCardArtifactId`,
          errors,
        );
      }
      if (
        !["missing", "available", "active", "resolved"].includes(
          String(candidate.fullWorkCardStatus),
        )
      ) {
        errors.push(`${field}.fullWorkCardStatus is invalid.`);
      }
      if (
        !candidateResolutionStatuses.includes(
          candidate.resolutionStatus as (typeof candidateResolutionStatuses)[number],
        )
      ) {
        errors.push(`${field}.resolutionStatus is invalid.`);
      }
      requireStringArray(
        candidate.resolutionEvidenceArtifactIds,
        `${field}.resolutionEvidenceArtifactIds`,
        errors,
      );
      if (typeof candidate.candidateId === "string") {
        if (ids.has(candidate.candidateId)) errors.push(`${field}.candidateId must be unique.`);
        ids.add(candidate.candidateId);
      }
      if (typeof candidate.order === "number") {
        if (orders.has(candidate.order)) errors.push(`${field}.order must be unique.`);
        orders.add(candidate.order);
      }
    }
  }
  for (const field of [
    "activeCandidateId",
    "activeWorkCardArtifactId",
    "activeRepairArtifactId",
    "earliestUnresolvedCandidateId",
  ] as const) {
    if (value[field] !== null) {
      requireNonEmptyString(value[field], `phaseExecution.${field}`, errors);
    }
  }
  if (!isRecord(value.closeoutEligibility)) {
    errors.push("phaseExecution.closeoutEligibility must be an object.");
  } else {
    if (typeof value.closeoutEligibility.eligible !== "boolean") {
      errors.push("phaseExecution.closeoutEligibility.eligible must be boolean.");
    }
    if (!Array.isArray(value.closeoutEligibility.blockers)) {
      errors.push("phaseExecution.closeoutEligibility.blockers must be an array.");
    }
  }
}

export function assertWorkflowStateIndex(value: unknown): asserts value is WorkflowStateIndex {
  const result = validateWorkflowStateIndex(value);
  if (!result.valid) throw new WorkflowStateValidationError(result.errors);
}

function validateActionRecord(key: string, value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`actionCatalog.${key} must be an object.`);
    return;
  }
  requireEqual(value.actionId, key, `actionCatalog.${key}.actionId`, errors);
  if (!workflowStages.includes(value.stage as (typeof workflowStages)[number])) {
    errors.push(`actionCatalog.${key}.stage is invalid.`);
  }
  if (!workflowRoles.includes(value.role as (typeof workflowRoles)[number])) {
    errors.push(`actionCatalog.${key}.role is invalid.`);
  }
  requireNonEmptyString(value.screenId, `actionCatalog.${key}.screenId`, errors);
  if (value.targetArtifactId !== null) {
    requireNonEmptyString(value.targetArtifactId, `actionCatalog.${key}.targetArtifactId`, errors);
  }
  requireStringArray(value.sourceArtifactIds, `actionCatalog.${key}.sourceArtifactIds`, errors);
  validateArtifactIdentity(value.expectedOutput, `actionCatalog.${key}.expectedOutput`, errors);
  if (!isRecord(value.routes)) {
    errors.push(`actionCatalog.${key}.routes must be an object.`);
    return;
  }
  for (const route of ["success", "failure", "repair"] as const) {
    if (value.routes[route] !== null && typeof value.routes[route] !== "string") {
      errors.push(`actionCatalog.${key}.routes.${route} must be a string or null.`);
    }
  }
}

function validateRoutedAction(
  value: unknown,
  state: Record<string, unknown>,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push("currentAction must be an object while a current action exists.");
    return;
  }
  requireEqual(value.schemaVersion, ROUTED_ACTION_SCHEMA_VERSION, "currentAction.schemaVersion", errors);
  requireEqual(value.actionId, state.currentActionId, "currentAction.actionId", errors);
  requireEqual(value.stateRevision, state.stateRevision, "currentAction.stateRevision", errors);
  if (!isRecord(value.bindingSource)) {
    errors.push("currentAction.bindingSource must be an object.");
  } else {
    requireEqual(value.bindingSource.kind, "workflow_state_index", "currentAction.bindingSource.kind", errors);
    requireEqual(
      value.bindingSource.workflowStateArtifactId,
      state.workflowStateArtifactId,
      "currentAction.bindingSource.workflowStateArtifactId",
      errors,
    );
    requireEqual(
      value.bindingSource.stateRevision,
      state.stateRevision,
      "currentAction.bindingSource.stateRevision",
      errors,
    );
  }
  if (!Array.isArray(value.blockers)) errors.push("currentAction.blockers must be an array.");
  if (value.authorityStatus !== "ready" && value.authorityStatus !== "blocked") {
    errors.push("currentAction.authorityStatus is invalid.");
  }
  const currentActionId = state.currentActionId;
  const catalog = state.actionCatalog;
  if (typeof currentActionId === "string" && isRecord(catalog)) {
    const record = catalog[currentActionId] as WorkflowActionRecord | undefined;
    const routed = value as unknown as RoutedActionContract;
    if (record && JSON.stringify(record.expectedOutput) !== JSON.stringify(routed.expectedOutput)) {
      errors.push("currentAction.expectedOutput must match the persisted action catalog.");
    }
  }
}

function validateArtifactIdentity(value: unknown, field: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${field} must be an object.`);
    return;
  }
  requireNonEmptyString(value.artifactId, `${field}.artifactId`, errors);
  requireNonEmptyString(value.artifactType, `${field}.artifactType`, errors);
  if (
    typeof value.artifactId === "string" &&
    value.artifactId.includes("/workflow/expected/")
  ) {
    errors.push(
      `${field}.artifactId must be an exact persisted artifact identity, not a workflow placeholder.`,
    );
  }
}

function requireStringArray(value: unknown, field: string, errors: string[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    errors.push(`${field} must be an array of non-empty strings.`);
  }
}

function requireNonEmptyString(value: unknown, field: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string.`);
  }
}

function requirePositiveInteger(value: unknown, field: string, errors: string[]): void {
  if (!Number.isInteger(value) || (value as number) < 1) {
    errors.push(`${field} must be a positive integer.`);
  }
}

function requireIsoDate(value: unknown, field: string, errors: string[]): void {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    errors.push(`${field} must be an ISO timestamp.`);
  }
}

function requireEqual(value: unknown, expected: unknown, field: string, errors: string[]): void {
  if (value !== expected) errors.push(`${field} must equal ${String(expected)}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
