import { createHash } from "node:crypto";

export const operatorDecisionStages = [
  "project_planning",
  "phase_planning",
  "work_card",
  "operator_validation",
  "phase_closeout",
] as const;

export type OperatorDecisionStage = (typeof operatorDecisionStages)[number];

export const operatorStageDecisionValues = [
  "approved",
  "revision_requested",
  "rejected",
] as const;

export const operatorRecordDispositionValues = [
  "accepted_as_current",
  "accepted_as_historical_evidence",
  "superseded",
  "merged",
  "deferred",
  "cancelled",
  "invalid",
  "revision_required",
] as const;

export interface OperatorDecisionTargetBinding {
  artifactId: string;
  artifactType: string;
  revision: number;
  payloadHash: string;
}

export type OperatorStageDecisionValue = (typeof operatorStageDecisionValues)[number];

export interface OperatorStageDecision {
  kind: "stage_decision";
  decision: OperatorStageDecisionValue;
}

export type OperatorRecordDispositionValue = (typeof operatorRecordDispositionValues)[number];

export interface OperatorRecordDisposition {
  kind: "record_disposition";
  disposition: OperatorRecordDispositionValue;
  canonicalSurvivingArtifactId?: string;
  supersedingArtifactId?: string;
}

export type OperatorDecisionOutcome =
  | OperatorStageDecision
  | OperatorRecordDisposition;

export type OperatorDispositionReviewState = "pending_operator_disposition";

export interface OperatorDecisionPendingLookupState {
  state: OperatorDispositionReviewState;
  stage: OperatorDecisionStage;
  targetSetHash: string;
  targets: OperatorDecisionTargetBinding[];
  evidence: OperatorLegacyDecisionEvidence[];
}

export interface OperatorDecisionDecidedLookupState {
  state: "decided";
  record: OperatorDecisionRecordV1;
  event: OperatorDecisionEvent;
  evidence: OperatorLegacyDecisionEvidence[];
}

export type OperatorDecisionLookupState =
  | OperatorDecisionPendingLookupState
  | OperatorDecisionDecidedLookupState;

export interface OperatorDecisionIntent {
  stage: OperatorDecisionStage;
  targets: OperatorDecisionTargetBinding[];
  outcome: OperatorDecisionOutcome;
  operatorReason?: string;
}

export interface OperatorDecisionEvent {
  schemaVersion: "operator-decision-event.v1";
  stage: OperatorDecisionStage;
  targets: OperatorDecisionTargetBinding[];
  targetSetHash: string;
  outcome: OperatorDecisionOutcome;
  operatorReason?: string;
  decidedAt: string;
}

export interface OperatorLegacyDecisionEvidence {
  artifactId: string;
  revision: number;
  decision?: string;
  reason: string;
}

export interface OperatorDecisionRecordV1 {
  schemaVersion: "operator-decision-record.v1";
  stage: OperatorDecisionStage;
  targets: OperatorDecisionTargetBinding[];
  targetSetHash: string;
  outcome: OperatorDecisionOutcome;
  operatorReason?: string;
  decidedAt: string;
  decisionTimeline: OperatorDecisionEvent[];
  legacyEvidence?: OperatorLegacyDecisionEvidence[];
}

export interface OperatorDecisionResult {
  decisionArtifactId?: string;
  decisionRevision?: number;
  decisionEvent?: OperatorDecisionEvent;
  lookupState?: OperatorDecisionLookupState;
  idempotent?: boolean;
  registryRevision?: number;
}

export function normalizeOperatorDecisionTargets(
  targets: readonly OperatorDecisionTargetBinding[],
): OperatorDecisionTargetBinding[] {
  return targets
    .map((target) => ({
      artifactId: target.artifactId.trim(),
      artifactType: target.artifactType.trim(),
      revision: target.revision,
      payloadHash: target.payloadHash.trim(),
    }))
    .sort((left, right) => left.artifactId.localeCompare(right.artifactId));
}

export function stableOperatorDecisionTargetSetPayload(input: {
  stage: OperatorDecisionStage;
  targets: readonly OperatorDecisionTargetBinding[];
}): string {
  return JSON.stringify({
    stage: input.stage,
    targets: normalizeOperatorDecisionTargets(input.targets),
  });
}

export function computeOperatorDecisionTargetSetHash(input: {
  stage: OperatorDecisionStage;
  targets: readonly OperatorDecisionTargetBinding[];
}): string {
  return createHash("sha256")
    .update(stableOperatorDecisionTargetSetPayload(input), "utf8")
    .digest("hex");
}

export function operatorDecisionOutcomeEquals(
  left: OperatorDecisionOutcome,
  right: OperatorDecisionOutcome,
): boolean {
  return JSON.stringify(normalizeOutcome(left)) === JSON.stringify(normalizeOutcome(right));
}

export function normalizeOperatorReason(reason: string | undefined): string {
  return reason?.trim() ?? "";
}

export function requiresOperatorReason(outcome: OperatorDecisionOutcome): boolean {
  if (outcome.kind === "stage_decision") {
    return outcome.decision === "revision_requested" || outcome.decision === "rejected";
  }
  return (
    outcome.disposition === "revision_required" ||
    outcome.disposition === "invalid" ||
    outcome.disposition === "cancelled" ||
    outcome.disposition === "deferred" ||
    outcome.disposition === "merged" ||
    outcome.disposition === "superseded"
  );
}

export function validateOperatorDecisionIntentShape(intent: OperatorDecisionIntent): void {
  if (!operatorDecisionStages.includes(intent.stage)) {
    throw new Error("Operator decision stage is not supported.");
  }
  const normalizedTargets = normalizeOperatorDecisionTargets(intent.targets);
  if (normalizedTargets.length === 0) {
    throw new Error("Operator decision requires at least one exact target.");
  }
  const seen = new Set<string>();
  for (const target of normalizedTargets) {
    if (!target.artifactId || !target.artifactType || !target.payloadHash) {
      throw new Error("Operator decision target bindings require non-empty ID, type, and hash.");
    }
    if (!Number.isInteger(target.revision) || target.revision < 1) {
      throw new Error("Operator decision target revisions must be positive integers.");
    }
    if (seen.has(target.artifactId)) {
      throw new Error("Operator decision target list contains duplicate artifact IDs.");
    }
    seen.add(target.artifactId);
  }
  if (!isPlainObject(intent.outcome)) {
    throw new Error("Operator decision outcome is not supported.");
  }
  if (intent.outcome.kind !== "stage_decision" && intent.outcome.kind !== "record_disposition") {
    throw new Error("Operator decision outcome kind is not supported.");
  }
  if (intent.outcome.kind === "stage_decision") {
    if (!operatorStageDecisionValues.includes(intent.outcome.decision)) {
      throw new Error("Operator stage decision value is not supported.");
    }
  } else {
    if (!operatorRecordDispositionValues.includes(intent.outcome.disposition)) {
      throw new Error("Operator record disposition value is not supported.");
    }
    if (intent.outcome.disposition === "merged" && !intent.outcome.canonicalSurvivingArtifactId?.trim()) {
      throw new Error("Merged record dispositions require a canonical surviving artifact ID.");
    }
    if (intent.outcome.disposition === "superseded" && !intent.outcome.supersedingArtifactId?.trim()) {
      throw new Error("Superseded record dispositions require a superseding artifact ID.");
    }
  }
  if (requiresOperatorReason(intent.outcome) && !normalizeOperatorReason(intent.operatorReason)) {
    throw new Error("Operator reason is required for this decision outcome.");
  }
}

function normalizeOutcome(outcome: OperatorDecisionOutcome): OperatorDecisionOutcome {
  if (outcome.kind === "stage_decision") {
    return {
      kind: "stage_decision",
      decision: outcome.decision,
    };
  }
  return {
    kind: "record_disposition",
    disposition: outcome.disposition,
    ...(outcome.canonicalSurvivingArtifactId?.trim()
      ? { canonicalSurvivingArtifactId: outcome.canonicalSurvivingArtifactId.trim() }
      : {}),
    ...(outcome.supersedingArtifactId?.trim()
      ? { supersedingArtifactId: outcome.supersedingArtifactId.trim() }
      : {}),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
