import { createHash } from "node:crypto";

import {
  type ArtifactRegistry,
  type ArtifactRegistryEntry,
  type CanonicalArtifact,
  type JsonValue,
} from "../../shared/artifacts";
import {
  computeOperatorDecisionTargetSetHash,
  normalizeOperatorDecisionTargets,
  normalizeOperatorReason,
  operatorDecisionOutcomeEquals,
  stableOperatorDecisionTargetSetPayload,
  validateOperatorDecisionIntentShape,
  type OperatorDecisionEvent,
  type OperatorDecisionIntent,
  type OperatorDecisionLookupState,
  type OperatorDecisionOutcome,
  type OperatorDecisionRecordV1,
  type OperatorDecisionStage,
  type OperatorDecisionTargetBinding,
  type OperatorLegacyDecisionEvidence,
} from "../../shared/operatorDecisionContract";
import type {
  ConfiguredProject,
  GovernanceApprovalDecisionIntent,
  GovernanceApprovalDecisionResult,
  GovernanceApprovalQueueItem,
  GovernanceApprovalQueueResult,
  GovernanceApprovalTargetKind,
} from "../../shared/projects";
import {
  ArtifactPairService,
  locationFromPairPaths,
} from "./artifactPairService";
import type { CanonicalArtifactCommitRequest } from "./artifactPairContracts";

type ApprovalStatus = GovernanceApprovalQueueItem["approvalStatus"];
type ApprovalClassification = GovernanceApprovalQueueItem["approvalClassification"];

interface TargetIdentity {
  targetKind: GovernanceApprovalTargetKind;
  classification: ApprovalClassification;
  stage: OperatorDecisionStage;
  approvalArtifactId: string;
  location: { directoryPath: string; fileStem: string };
}

interface VerifiedDecisionTarget {
  entry: ArtifactRegistryEntry;
  artifact: CanonicalArtifact;
  binding: OperatorDecisionTargetBinding;
}

interface ResolvedPhasePlanningBundle {
  phasePlanning: VerifiedDecisionTarget;
  workCardPlan: VerifiedDecisionTarget;
  bindings: OperatorDecisionTargetBinding[];
}

interface TargetState {
  status: ApprovalStatus;
  reason: string;
  title: string;
  contentMarkdown: string;
  implementationAuthorizationAvailable: boolean;
  decisionTimeline: OperatorDecisionEvent[];
  targetBindings: OperatorDecisionTargetBinding[];
  targetSetHash: string;
  legacyEvidence: OperatorLegacyDecisionEvidence[];
  existingApprovalArtifactId?: string;
}

export class GovernanceApprovalService {
  constructor(
    private readonly project: ConfiguredProject,
    private readonly artifactPairs: ArtifactPairService,
  ) {}

  async listQueue(): Promise<GovernanceApprovalQueueResult> {
    try {
      const registry = await this.requireRegistry();
      const items: GovernanceApprovalQueueItem[] = [];
      for (const entry of registry.entries.filter(isApprovalQueueEntry).sort(compareEntries)) {
        if (!this.isVisibleGovernanceEntry(entry)) continue;
        const bundle = isPhasePlanningBundleEntry(entry)
          ? await this.resolvePhasePlanningBundle(registry, entry)
          : undefined;
        const identity = bundle ? targetIdentity(bundle.phasePlanning.entry) : targetIdentity(entry);
        const state = await this.targetStateFor(registry, entry, identity, bundle);
        const canonicalPhaseAuthority = canonicalPhaseAuthorityFor(registry, entry, identity);
        items.push({
          targetArtifactId: entry.artifactId,
          artifactType: entry.artifactType,
          ...(entry.phaseId === undefined ? {} : { phaseId: entry.phaseId }),
          ...(entry.workCardId === undefined ? {} : { workCardId: entry.workCardId }),
          title: state.title,
          contentMarkdown: state.contentMarkdown,
          revision: entry.revision,
          payloadHash: entry.payloadHash,
          jsonPath: entry.jsonPath,
          markdownPath: entry.markdownPath,
          registryStatus: "registered",
          status: entry.status,
          approvalStatus: state.status,
          approvalArtifactId: identity.approvalArtifactId,
          ...(state.existingApprovalArtifactId
            ? { existingApprovalArtifactId: state.existingApprovalArtifactId }
            : {}),
          reason: state.reason,
          targetKind: identity.targetKind,
          approvalClassification: identity.classification,
          decisionStage: identity.stage,
          targetBindings: state.targetBindings,
          targetSetHash: state.targetSetHash,
          legacyEvidence: state.legacyEvidence,
          authorizationBoundary: authorizationBoundaryFor(identity.classification, state.implementationAuthorizationAvailable),
          decisionWorkspaceScreenId: decisionWorkspaceScreenIdFor(identity.classification),
          decisionWorkspaceLabel: decisionWorkspaceLabelFor(identity.classification),
          decisionEffect: decisionEffectFor(identity.classification, state.implementationAuthorizationAvailable),
          implementationAuthorizationAvailable: state.implementationAuthorizationAvailable,
          decisionTimeline: state.decisionTimeline,
          ...canonicalPhaseAuthority,
        });
      }
      return { ok: true, items: items.sort(compareApprovalItems) };
    } catch (error) {
      return { ok: false, items: [], errorMessages: [plainError(error)] };
    }
  }

  async decide(
    intent: GovernanceApprovalDecisionIntent,
  ): Promise<GovernanceApprovalDecisionResult> {
    try {
      const registry = await this.requireRegistry();
      const normalizedIntent = normalizeDecisionIntent(intent);
      validateOperatorDecisionIntentShape(normalizedIntent);
      const verifiedTargets = await this.verifyTargets(registry, normalizedIntent.targets);
      await this.verifyDecisionTargetSet(registry, normalizedIntent.stage, verifiedTargets);
      const targetSetHash = computeOperatorDecisionTargetSetHash({
        stage: normalizedIntent.stage,
        targets: normalizedIntent.targets,
      });
      const initialIdentityAnchor = identityAnchorForStage(normalizedIntent.stage, verifiedTargets);
      const bundle = normalizedIntent.stage === "phase_planning"
        ? await this.resolvePhasePlanningBundle(registry, initialIdentityAnchor.entry)
        : null;
      const identityAnchor = bundle?.phasePlanning ?? initialIdentityAnchor;
      const targetArtifacts = bundle
        ? [bundle.phasePlanning.artifact, bundle.workCardPlan.artifact]
        : verifiedTargets.map((target) => target.artifact);
      const identity = targetIdentity(identityAnchor.entry);
      if (identity.stage !== normalizedIntent.stage) {
        throw new Error("Decision stage does not match the selected target.");
      }
      if (normalizedIntent.targets.length > 1 && identity.classification !== "phase_planning") {
        throw new Error("Only phase planning decisions may bind a stage bundle in this workspace.");
      }
      const approvalEntry = findDecisionArtifactEntry(registry, identity.approvalArtifactId);
      const existingApproval = approvalEntry
        ? (
            await this.artifactPairs.readArtifactByPaths(
              approvalEntry.jsonPath,
              approvalEntry.markdownPath,
            )
          ).artifact
        : null;
      const lookup = lookupDecisionInArtifact(
        existingApproval,
        normalizedIntent.stage,
        targetSetHash,
        normalizedIntent.targets,
        legacyEvidenceFor(existingApproval),
      );
      if (lookup.state === "decided") {
        const existing = lookup.event;
        const sameOutcome = operatorDecisionOutcomeEquals(existing.outcome, normalizedIntent.outcome);
        const sameReason =
          normalizeOperatorReason(existing.operatorReason) ===
          normalizeOperatorReason(normalizedIntent.operatorReason);
        if (sameOutcome && sameReason) {
          return {
            ok: true,
            selectedProjectId: this.project.projectId,
            currentAction: null,
            maintenance: emptyMaintenance(await this.listQueue()),
            decisionArtifactId: existingApproval?.artifactId ?? identity.approvalArtifactId,
            ...(existingApproval ? { decisionRevision: existingApproval.revision } : {}),
            decisionEvent: existing,
            lookupState: lookup,
            idempotent: true,
          };
        }
        throw new Error("This exact target set already has a durable Operator decision.");
      }
      const event: OperatorDecisionEvent = {
        schemaVersion: "operator-decision-event.v1",
        stage: normalizedIntent.stage,
        targets: normalizeOperatorDecisionTargets(normalizedIntent.targets),
        targetSetHash,
        outcome: normalizedIntent.outcome,
        ...(normalizeOperatorReason(normalizedIntent.operatorReason)
          ? { operatorReason: normalizeOperatorReason(normalizedIntent.operatorReason) }
          : {}),
        decidedAt: new Date().toISOString(),
      };
      const request = this.buildDecisionRequest(
        targetArtifacts,
        identityAnchor.artifact,
        identity,
        event,
        existingApproval,
        approvalEntry,
      );
      const commit = await this.artifactPairs.commitArtifact(request);
      const decidedLookup: OperatorDecisionLookupState = {
        state: "decided",
        record: recordForEvent(event, [
          ...decisionTimelineFrom(existingApproval),
          event,
        ], legacyEvidenceFor(existingApproval)),
        event,
        evidence: legacyEvidenceFor(existingApproval),
      };
      return {
        ok: true,
        selectedProjectId: this.project.projectId,
        currentAction: null,
        maintenance: emptyMaintenance(await this.listQueue()),
        decisionArtifactId: commit.artifact.artifactId,
        decisionRevision: commit.artifact.revision,
        decisionEvent: event,
        lookupState: decidedLookup,
        idempotent: false,
        registryRevision: commit.registryRevision,
      };
    } catch (error) {
      return {
        ok: false,
        selectedProjectId: this.project.projectId,
        currentAction: null,
        maintenance: emptyMaintenance({ ok: false, items: [], errorMessages: [plainError(error)] }),
        errorMessages: [plainError(error)],
      };
    }
  }

  async lookupDecisionState(
    intent: OperatorDecisionIntent,
  ): Promise<OperatorDecisionLookupState> {
    const registry = await this.requireRegistry();
    const normalizedIntent = normalizeDecisionIntent(intent);
    validateOperatorDecisionIntentShape(normalizedIntent);
    const verifiedTargets = await this.verifyTargets(registry, normalizedIntent.targets);
    await this.verifyDecisionTargetSet(registry, normalizedIntent.stage, verifiedTargets);
    const targetSetHash = computeOperatorDecisionTargetSetHash({
      stage: normalizedIntent.stage,
      targets: normalizedIntent.targets,
    });
    const initialIdentityAnchor = identityAnchorForStage(normalizedIntent.stage, verifiedTargets);
    const bundle = normalizedIntent.stage === "phase_planning"
      ? await this.resolvePhasePlanningBundle(registry, initialIdentityAnchor.entry)
      : null;
    const identityAnchor = bundle?.phasePlanning ?? initialIdentityAnchor;
    const identity = targetIdentity(identityAnchor.entry);
    const approvalEntry = findApprovalEntryForTarget(registry, identityAnchor.entry, identity);
    const approval = approvalEntry
      ? (
          await this.artifactPairs.readArtifactByPaths(
            approvalEntry.jsonPath,
            approvalEntry.markdownPath,
          )
        ).artifact
      : null;
    return lookupDecisionInArtifact(
      approval,
      normalizedIntent.stage,
      targetSetHash,
      normalizedIntent.targets,
      legacyEvidenceFor(approval),
    );
  }

  private async requireRegistry(): Promise<ArtifactRegistry> {
    const registry = await this.artifactPairs.loadRegistry();
    if (!registry) throw new Error("Canonical Artifact Registry is unavailable.");
    return registry;
  }

  private isVisibleGovernanceEntry(entry: ArtifactRegistryEntry): boolean {
    return (
      entry.projectId === this.project.projectId &&
      entry.status !== "archived" &&
      !entry.jsonPath.includes("/archive/") &&
      !entry.markdownPath.includes("/archive/")
    );
  }

  private async targetStateFor(
    registry: ArtifactRegistry,
    target: ArtifactRegistryEntry,
    identity: TargetIdentity,
    resolvedBundle?: ResolvedPhasePlanningBundle,
  ): Promise<TargetState> {
    const targetArtifact = (
      await this.artifactPairs.readArtifactByPaths(target.jsonPath, target.markdownPath)
    ).artifact;
    const targetBindings = resolvedBundle
      ? resolvedBundle.bindings
      : identity.stage === "phase_planning" && target.phaseId
        ? (await this.resolvePhasePlanningBundle(registry, target)).bindings
      : [await bindingFromEntry(target, this.artifactPairs)];
    const targetSetHash = computeOperatorDecisionTargetSetHash({
      stage: identity.stage,
      targets: targetBindings,
    });
    const base = {
      title: targetArtifact.payload.title,
      contentMarkdown: targetArtifact.payload.contentMarkdown,
      implementationAuthorizationAvailable: workCardRequiresImplementer(targetArtifact.payload.data),
      targetBindings,
      targetSetHash,
    };
    if (
      target.artifactType === "work_card" &&
      !base.implementationAuthorizationAvailable &&
      await this.hasApprovedReconciliationDisposition(registry, target)
    ) {
      return {
        ...base,
        status: "exact",
        reason: "This Architect-owned Work Card is already dispositioned through its approved Reconciliation Review.",
        decisionTimeline: [],
        legacyEvidence: [],
      };
    }
    const approvalTarget = resolvedBundle?.phasePlanning.entry ?? target;
    const approvalEntry = findApprovalEntryForTarget(registry, approvalTarget, identity);
    if (!approvalEntry) {
      return {
        ...base,
        status: "pending_operator_disposition",
        reason: "No new-system Operator decision exists for this exact target set.",
        decisionTimeline: [],
        legacyEvidence: [],
      };
    }
    try {
      const approval = (
        await this.artifactPairs.readArtifactByPaths(
          approvalEntry.jsonPath,
          approvalEntry.markdownPath,
        )
      ).artifact;
      const evidence = legacyEvidenceFor(approval);
      const lookup = lookupDecisionInArtifact(
        approval,
        identity.stage,
        targetSetHash,
        targetBindings,
        evidence,
      );
      if (lookup.state === "decided") {
        return {
          ...base,
          status: "exact",
          reason: "A durable new-system Operator decision matches this exact target set.",
          decisionTimeline: decisionTimelineFrom(approval),
          legacyEvidence: evidence,
          existingApprovalArtifactId: approvalEntry.artifactId,
        };
      }
      const staleTimeline = decisionTimelineFrom(approval);
      const staleForSameArtifacts = staleTimeline.some((event) =>
        event.stage === identity.stage &&
        event.targets.some((binding) => targetBindings.some((targetBinding) =>
          targetBinding.artifactId === binding.artifactId &&
          (targetBinding.revision !== binding.revision ||
            targetBinding.payloadHash !== binding.payloadHash),
        )),
      );
      return {
        ...base,
        status: staleForSameArtifacts ? "stale" : "pending_operator_disposition",
        reason: staleForSameArtifacts
          ? "Existing new-system decision targets an older exact revision or hash."
          : "Existing legacy approval is evidence only; this exact target set is pending Operator disposition.",
        decisionTimeline: staleTimeline,
        legacyEvidence: evidence,
        existingApprovalArtifactId: approvalEntry.artifactId,
      };
    } catch (error) {
      return {
        ...base,
        status: "invalid",
        reason: `Existing approval cannot be verified: ${plainError(error)}`,
        decisionTimeline: [],
        legacyEvidence: [],
        existingApprovalArtifactId: approvalEntry.artifactId,
      };
    }
  }

  private async resolvePhasePlanningBundle(
    registry: ArtifactRegistry,
    target: ArtifactRegistryEntry,
  ): Promise<ResolvedPhasePlanningBundle> {
    if (!target.projectId || !target.phaseId) {
      throw new Error("Phase planning bundle targets require non-empty project and phase IDs.");
    }
    const historicalMode = target.status === "historical";
    const entries = registry.entries
      .filter((entry) =>
        entry.projectId === target.projectId &&
        entry.phaseId === target.phaseId &&
        (entry.artifactType === "phase_planning" || entry.artifactType === "work_card_plan") &&
        (entry.status === "historical") === historicalMode &&
        this.isVisibleGovernanceEntry(entry),
      )
      .sort(compareEntries);
    const phasePlanning = entries.filter((entry) => entry.artifactType === "phase_planning");
    const workCardPlan = entries.filter((entry) => entry.artifactType === "work_card_plan");
    if (phasePlanning.length !== 1) {
      throw new Error("Phase planning bundle must contain exactly one Phase Planning record.");
    }
    if (workCardPlan.length !== 1) {
      throw new Error("Phase planning bundle must contain exactly one Work Card Plan record.");
    }
    const verified = await Promise.all(
      [phasePlanning[0], workCardPlan[0]].map(async (entry) => {
        const artifact = (
          await this.artifactPairs.readArtifactByPaths(entry.jsonPath, entry.markdownPath)
        ).artifact;
        return {
          entry,
          artifact,
          binding: {
            artifactId: artifact.artifactId,
            artifactType: artifact.artifactType,
            revision: artifact.revision,
            payloadHash: artifact.payloadHash,
          },
        };
      }),
    );
    const resolved = {
      phasePlanning: verified[0],
      workCardPlan: verified[1],
    };
    return {
      ...resolved,
      bindings: normalizeOperatorDecisionTargets([
        resolved.phasePlanning.binding,
        resolved.workCardPlan.binding,
      ]),
    };
  }

  private async verifyTargets(
    registry: ArtifactRegistry,
    bindings: readonly OperatorDecisionTargetBinding[],
  ): Promise<VerifiedDecisionTarget[]> {
    const verified: VerifiedDecisionTarget[] = [];
    for (const binding of bindings) {
      const entry = registry.entries.find((candidate) => candidate.artifactId === binding.artifactId);
      if (!entry) throw new Error("Decision target is not registered.");
      if (entry.artifactType !== binding.artifactType) {
        throw new Error("Decision target type does not match the registered target.");
      }
      if (!isApprovalTargetEntry(entry)) {
        throw new Error("Decision target is not an app-owned governance approval target.");
      }
      if (!this.isVisibleGovernanceEntry(entry)) {
        throw new Error("Decision target is not in the visible governance corpus.");
      }
      const artifact = (
        await this.artifactPairs.readArtifactByPaths(entry.jsonPath, entry.markdownPath)
      ).artifact;
      if (artifact.revision !== binding.revision || artifact.payloadHash !== binding.payloadHash) {
        throw new Error("Decision target is stale; refresh governance state before deciding.");
      }
      verified.push({
        entry,
        artifact,
        binding: {
          artifactId: artifact.artifactId,
          artifactType: artifact.artifactType,
          revision: artifact.revision,
          payloadHash: artifact.payloadHash,
        },
      });
    }
    return verified;
  }

  private async verifyDecisionTargetSet(
    registry: ArtifactRegistry,
    stage: OperatorDecisionStage,
    targets: readonly VerifiedDecisionTarget[],
  ): Promise<void> {
    if (targets.length === 0) {
      throw new Error("Operator decision requires at least one verified target.");
    }
    for (const target of targets) {
      if (target.artifact.projectId !== this.project.projectId || target.entry.projectId !== this.project.projectId) {
        throw new Error("Decision target belongs to another configured project.");
      }
      if (stageForTarget(target.entry) !== stage) {
        throw new Error("Decision target artifact type does not belong to the supplied stage.");
      }
      if (!this.isVisibleGovernanceEntry(target.entry)) {
        throw new Error("Decision target is not visible, registered, and non-archived.");
      }
    }

    if (stage !== "phase_planning") {
      if (targets.length !== 1) {
        throw new Error("This decision stage requires exactly one target.");
      }
      return;
    }

    if (targets.length !== 2) {
      throw new Error("Phase planning decisions require exactly two targets.");
    }
    const phasePlanning = targets.filter((target) => target.entry.artifactType === "phase_planning");
    const workCardPlan = targets.filter((target) => target.entry.artifactType === "work_card_plan");
    if (phasePlanning.length !== 1 || workCardPlan.length !== 1) {
      throw new Error("Phase planning decisions require one Phase Planning target and one Work Card Plan target.");
    }
    const projectIds = new Set(targets.map((target) => target.entry.projectId));
    const phaseIds = new Set(targets.map((target) => target.entry.phaseId ?? ""));
    const historicalModes = new Set(targets.map((target) => target.entry.status === "historical"));
    if (projectIds.size !== 1 || !projectIds.has(this.project.projectId)) {
      throw new Error("Phase planning bundle targets must belong to one configured project.");
    }
    if (phaseIds.size !== 1 || phaseIds.has("")) {
      throw new Error("Phase planning bundle targets must belong to one non-empty phase.");
    }
    if (historicalModes.size !== 1) {
      throw new Error("Phase planning bundle cannot mix historical and current records.");
    }

    const resolved = await this.resolvePhasePlanningBundle(registry, phasePlanning[0].entry);
    if (stableOperatorDecisionTargetSetPayload({ stage, targets: targets.map((target) => target.binding) }) !==
      stableOperatorDecisionTargetSetPayload({ stage, targets: resolved.bindings })) {
      throw new Error("Submitted phase planning target set does not exactly match the canonical bundle.");
    }
  }

  private async hasApprovedReconciliationDisposition(
    registry: ArtifactRegistry,
    target: ArtifactRegistryEntry,
  ): Promise<boolean> {
    const reviews = registry.entries.filter(
      (entry) =>
        entry.artifactType === "reconciliation_review" &&
        (entry.parentArtifactId === target.artifactId ||
          entry.workCardId === target.workCardId ||
          entry.artifactId.includes(`/${target.workCardId ?? ""}`)),
    );
    for (const review of reviews) {
      const approvalEntries = registry.entries.filter(
        (entry) =>
          entry.artifactType === "operator_approval" &&
          (entry.parentArtifactId === review.artifactId ||
            entry.relationships.sources.includes(review.artifactId)),
      );
      for (const approvalEntry of approvalEntries) {
        try {
          const approval = (
            await this.artifactPairs.readArtifactByPaths(
              approvalEntry.jsonPath,
              approvalEntry.markdownPath,
            )
          ).artifact;
          const data = approval.payload.data;
          if (
            isPlainObject(data) &&
            data.schemaVersion === "operator-decision-record.v1" &&
            isApprovedStageDecision(data)
          ) {
            return true;
          }
        } catch {
          // A broken review approval should not hide a normal approval issue.
        }
      }
    }
    return false;
  }

  private buildDecisionRequest(
    targets: readonly CanonicalArtifact[],
    primaryTarget: CanonicalArtifact,
    identity: TargetIdentity,
    event: OperatorDecisionEvent,
    existingApproval: CanonicalArtifact | null,
    approvalEntry: ArtifactRegistryEntry | undefined,
  ): CanonicalArtifactCommitRequest<string, JsonValue> {
    const previousTimeline = decisionTimelineFrom(existingApproval);
    const decisionTimeline = [...previousTimeline, event];
    const record = recordForEvent(event, decisionTimeline, legacyEvidenceFor(existingApproval));
    const implementationOutputIds = event.outcome.kind === "stage_decision" &&
      event.outcome.decision === "approved" &&
      identity.classification === "work_card" &&
      workCardRequiresImplementer(primaryTarget.payload.data)
        ? primaryTarget.relationships.expectedOutputs.filter((artifactId) =>
            artifactId.includes("/implementer_report/"),
          )
        : [];
    return {
      artifactId: identity.approvalArtifactId,
      artifactType: "operator_approval",
      status: "active",
      projectId: primaryTarget.projectId,
      ...(primaryTarget.phaseId ? { phaseId: primaryTarget.phaseId } : {}),
      ...(primaryTarget.workCardId ? { workCardId: primaryTarget.workCardId } : {}),
      parentArtifactId: primaryTarget.artifactId,
      relationships: {
        sources: targets.map((target) => target.artifactId),
        expectedOutputs: implementationOutputIds,
        supersedes: [],
        children: [],
      },
      payload: {
        title: `${decisionWorkspaceLabelFor(identity.classification)}: ${event.targetSetHash}`,
        contentMarkdown: renderDecisionMarkdown(record),
        data: record as unknown as JsonValue,
      },
      location: approvalEntry
        ? locationFromPairPaths(approvalEntry.jsonPath, approvalEntry.markdownPath)
        : identity.location,
      expectedRevision: existingApproval?.revision ?? null,
    };
  }
}

function isApprovalTargetEntry(entry: ArtifactRegistryEntry): boolean {
  return (
    entry.artifactType === "project_planning" ||
    entry.artifactType === "phase_planning" ||
    entry.artifactType === "work_card_plan" ||
    entry.artifactType === "work_card" ||
    entry.artifactType === "operator_validation" ||
    entry.artifactType === "phase_closeout"
  );
}

function isApprovalQueueEntry(entry: ArtifactRegistryEntry): boolean {
  return (
    entry.artifactType === "project_planning" ||
    entry.artifactType === "phase_planning" ||
    entry.artifactType === "work_card_plan" ||
    entry.artifactType === "work_card"
  );
}

function isPhasePlanningBundleEntry(entry: ArtifactRegistryEntry): boolean {
  return entry.artifactType === "phase_planning" || entry.artifactType === "work_card_plan";
}

function targetIdentity(target: ArtifactRegistryEntry | CanonicalArtifact): TargetIdentity {
  const targetKind = target.artifactType === "work_card" ? "work_card" : "phase";
  const stage = stageForTarget(target);
  const targetStatus = String(target.status);
  if (targetStatus === "historical") {
    const phaseId = target.phaseId ?? "project";
    const targetKey = stableTargetKey(target.artifactId);
    return {
      targetKind,
      classification: target.artifactType === "work_card" ? "work_card" : "phase_planning",
      stage,
      approvalArtifactId: `${target.projectId}/${phaseId}/operator_approval/${targetKey}`,
      location: {
        directoryPath: `planning/phases/${phaseId}/Operator_Approvals`,
        fileStem: `OPERATOR_DISPOSITION_${targetKey}`,
      },
    };
  }
  if (target.artifactType === "work_card") {
    const phaseId = target.phaseId ?? "project";
    const workCardId = target.workCardId ?? stableTargetKey(target.artifactId);
    return {
      targetKind,
      classification: "work_card",
      stage,
      approvalArtifactId: `${target.projectId}/${phaseId}/operator_approval/${workCardId}`,
      location: {
        directoryPath: `planning/phases/${phaseId}/Operator_Approvals`,
        fileStem: buildWorkCardApprovalFileStem(target),
      },
    };
  }
  const phaseId = target.phaseId ?? "project";
  return {
    targetKind,
    classification: "phase_planning",
    stage,
    approvalArtifactId: `${target.projectId}/${phaseId}/operator_approval/${operatorApprovalStemForStage(stage)}`,
    location: {
      directoryPath: phaseId === "project" ? "planning/project" : `planning/phases/${phaseId}`,
      fileStem: operatorApprovalStemForStage(stage),
    },
  };
}

function stageForTarget(target: ArtifactRegistryEntry | CanonicalArtifact): OperatorDecisionStage {
  if (target.artifactType === "project_planning") return "project_planning";
  if (target.artifactType === "work_card") return "work_card";
  if (target.artifactType === "operator_validation") return "operator_validation";
  if (target.artifactType === "phase_closeout") return "phase_closeout";
  return "phase_planning";
}

function identityAnchorForStage(
  stage: OperatorDecisionStage,
  targets: readonly VerifiedDecisionTarget[],
): VerifiedDecisionTarget {
  if (stage === "phase_planning") {
    const match = targets.find((target) => target.entry.artifactType === "phase_planning");
    if (!match) throw new Error("Phase planning decisions require a Phase Planning identity anchor.");
    return match;
  }
  return targets[0];
}

async function bindingFromEntry(
  entry: ArtifactRegistryEntry,
  artifactPairs: ArtifactPairService,
): Promise<OperatorDecisionTargetBinding> {
  const artifact = (
    await artifactPairs.readArtifactByPaths(entry.jsonPath, entry.markdownPath)
  ).artifact;
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    revision: artifact.revision,
    payloadHash: artifact.payloadHash,
  };
}

function normalizeDecisionIntent(intent: GovernanceApprovalDecisionIntent | OperatorDecisionIntent): OperatorDecisionIntent {
  return {
    stage: intent.stage,
    targets: normalizeOperatorDecisionTargets(intent.targets),
    outcome: intent.outcome,
    ...(normalizeOperatorReason(intent.operatorReason)
      ? { operatorReason: normalizeOperatorReason(intent.operatorReason) }
      : {}),
  };
}

function findDecisionArtifactEntry(
  registry: ArtifactRegistry,
  artifactId: string,
): ArtifactRegistryEntry | undefined {
  return registry.entries.find(
    (entry) => entry.artifactType === "operator_approval" && entry.artifactId === artifactId,
  );
}

function findApprovalEntryForTarget(
  registry: ArtifactRegistry,
  target: ArtifactRegistryEntry,
  identity: TargetIdentity,
): ArtifactRegistryEntry | undefined {
  return findDecisionArtifactEntry(registry, identity.approvalArtifactId) ??
    registry.entries.find(
      (entry) =>
        entry.artifactType === "operator_approval" &&
        entry.parentArtifactId === target.artifactId,
    );
}

function lookupDecisionInArtifact(
  approval: CanonicalArtifact | null,
  stage: OperatorDecisionStage,
  targetSetHash: string,
  targets: readonly OperatorDecisionTargetBinding[],
  evidence: OperatorLegacyDecisionEvidence[],
): OperatorDecisionLookupState {
  const timeline = decisionTimelineFrom(approval);
  const event = timeline.find((item) => item.stage === stage && item.targetSetHash === targetSetHash);
  if (approval && event) {
    return {
      state: "decided",
      record: recordForEvent(event, timeline, evidence),
      event,
      evidence,
    };
  }
  return {
    state: "pending_operator_disposition",
    stage,
    targetSetHash,
    targets: normalizeOperatorDecisionTargets(targets),
    evidence,
  };
}

function recordForEvent(
  event: OperatorDecisionEvent,
  timeline: OperatorDecisionEvent[],
  evidence: OperatorLegacyDecisionEvidence[],
): OperatorDecisionRecordV1 {
  return {
    schemaVersion: "operator-decision-record.v1",
    stage: event.stage,
    targets: event.targets,
    targetSetHash: event.targetSetHash,
    outcome: event.outcome,
    ...(event.operatorReason ? { operatorReason: event.operatorReason } : {}),
    decidedAt: event.decidedAt,
    decisionTimeline: timeline,
    ...(evidence.length > 0 ? { legacyEvidence: evidence } : {}),
  };
}

function decisionTimelineFrom(artifact: CanonicalArtifact | null): OperatorDecisionEvent[] {
  const data = artifact?.payload.data;
  if (!isPlainObject(data)) return [];
  if (Array.isArray(data.decisionTimeline)) {
    return (data.decisionTimeline as unknown[]).filter(isDecisionEvent);
  }
  return [];
}

function legacyEvidenceFor(artifact: CanonicalArtifact | null): OperatorLegacyDecisionEvidence[] {
  const data = artifact?.payload.data;
  if (!artifact || !isPlainObject(data)) return [];
  if (data.schemaVersion === "operator-decision-record.v1") {
    const evidence = data.legacyEvidence;
    return Array.isArray(evidence) ? (evidence as unknown[]).filter(isLegacyEvidence) : [];
  }
  const decision = typeof data.decision === "string" ? data.decision : undefined;
  return [{
    artifactId: artifact.artifactId,
    revision: artifact.revision,
    ...(decision ? { decision } : {}),
    reason: "Legacy approval artifact retained as historical evidence; it is not a new-system exact decision.",
  }];
}

function isDecisionEvent(value: unknown): value is OperatorDecisionEvent {
  if (!isPlainObject(value)) return false;
  return (
    value.schemaVersion === "operator-decision-event.v1" &&
    typeof value.stage === "string" &&
    Array.isArray(value.targets) &&
    typeof value.targetSetHash === "string" &&
    isPlainObject(value.outcome) &&
    typeof value.decidedAt === "string"
  );
}

function isLegacyEvidence(value: unknown): value is OperatorLegacyDecisionEvidence {
  return (
    isPlainObject(value) &&
    typeof value.artifactId === "string" &&
    typeof value.revision === "number" &&
    typeof value.reason === "string"
  );
}

function isApprovedStageDecision(data: Record<string, unknown>): boolean {
  const outcome = data.outcome;
  return (
    isPlainObject(outcome) &&
    outcome.kind === "stage_decision" &&
    outcome.decision === "approved"
  );
}

function buildWorkCardApprovalFileStem(target: ArtifactRegistryEntry | CanonicalArtifact): string {
  const workCardId = target.workCardId ?? "WORK_CARD";
  const targetStem = target.jsonPath.split("/").pop()?.replace(/\.json$/i, "") ?? workCardId;
  const suffix = targetStem.startsWith(`${workCardId}_`)
    ? targetStem.slice(workCardId.length)
    : "";
  return `OPERATOR_APPROVAL_${workCardId}${suffix}`;
}

function stableTargetKey(artifactId: string): string {
  return `sha256_${createHash("sha256").update(artifactId, "utf8").digest("hex")}`;
}

function operatorApprovalStemForStage(stage: OperatorDecisionStage): string {
  if (stage === "project_planning") return "Operator_Project_Approval";
  if (stage === "operator_validation") return "Operator_Validation_Approval";
  if (stage === "phase_closeout") return "Operator_Phase_Closeout_Approval";
  return "Operator_Phase_Approval";
}

function compareEntries(left: ArtifactRegistryEntry, right: ArtifactRegistryEntry): number {
  return left.artifactId.localeCompare(right.artifactId);
}

function canonicalPhaseAuthorityFor(
  registry: ArtifactRegistry,
  target: ArtifactRegistryEntry,
  identity: TargetIdentity,
): Partial<GovernanceApprovalQueueItem> {
  if (identity.stage !== "phase_planning" || !target.phaseId) return {};
  const historicalMode = target.status === "historical";
  const phasePlanning = registry.entries.find(
    (entry) =>
      entry.projectId === target.projectId &&
      entry.phaseId === target.phaseId &&
      entry.artifactType === "phase_planning" &&
      (entry.status === "historical") === historicalMode,
  );
  const workCardPlan = registry.entries.find(
    (entry) =>
      entry.projectId === target.projectId &&
      entry.phaseId === target.phaseId &&
      entry.artifactType === "work_card_plan" &&
      (entry.status === "historical") === historicalMode,
  );
  return {
    ...(phasePlanning
      ? {
          canonicalPhasePlanningArtifactId: phasePlanning.artifactId,
          canonicalPhasePlanningRevision: phasePlanning.revision,
          canonicalPhasePlanningPayloadHash: phasePlanning.payloadHash,
        }
      : {}),
    ...(workCardPlan
      ? {
          canonicalWorkCardPlanArtifactId: workCardPlan.artifactId,
          canonicalWorkCardPlanRevision: workCardPlan.revision,
          canonicalWorkCardPlanPayloadHash: workCardPlan.payloadHash,
        }
      : {}),
  };
}

function authorizationBoundaryFor(
  classification: ApprovalClassification,
  implementationAuthorizationAvailable: boolean,
): string {
  if (classification === "work_card") {
    return implementationAuthorizationAvailable
      ? "An approved stage decision may be projected in memory as Implementer execution authority for this exact revision."
      : "This Work Card does not explicitly request Implementer execution; approval cannot authorize source implementation.";
  }
  return "A phase-planning stage decision binds the exact current phase bundle; no separate progression boolean is persisted.";
}

function decisionWorkspaceScreenIdFor(
  classification: ApprovalClassification,
): GovernanceApprovalQueueItem["decisionWorkspaceScreenId"] {
  if (classification === "work_card") return "operator-work-card-approval";
  return "operator-phase-approval";
}

function decisionWorkspaceLabelFor(classification: ApprovalClassification): string {
  if (classification === "work_card") return "Work Card Approval";
  return "Operator Phase Approval";
}

function decisionEffectFor(
  classification: ApprovalClassification,
  implementationAuthorizationAvailable: boolean,
): string {
  if (classification === "work_card") {
    return implementationAuthorizationAvailable
      ? "Approve, request revision, reject, or disposition this exact Work Card revision."
      : "Approve, request revision, reject, or disposition this exact Work Card revision without Implementer execution authority.";
  }
  return "Approve, request revision, or reject the exact phase-planning bundle.";
}

function workCardRequiresImplementer(data: unknown): boolean {
  if (!isPlainObject(data)) return false;
  return data.requiresImplementer === true;
}

function renderDecisionMarkdown(record: OperatorDecisionRecordV1): string {
  return [
    `# Operator Decision: ${record.targetSetHash}`,
    "",
    `Schema version: ${record.schemaVersion}`,
    `Stage: ${record.stage}`,
    `Target set hash: ${record.targetSetHash}`,
    `Outcome: ${outcomeLabel(record.outcome)}`,
    `Decided at: ${record.decidedAt}`,
    ...(record.operatorReason ? ["", "## Operator Reason", "", record.operatorReason] : []),
    "",
    "## Exact Targets",
    "",
    ...record.targets.map(
      (target) =>
        `- ${target.artifactId} (${target.artifactType}) revision ${target.revision} hash ${target.payloadHash}`,
    ),
    "",
    "## Decision Timeline",
    "",
    ...record.decisionTimeline.map(
      (item) => `- ${item.decidedAt} - ${outcomeLabel(item.outcome)} - ${item.targetSetHash}`,
    ),
    "",
  ].join("\n");
}

function outcomeLabel(outcome: OperatorDecisionOutcome): string {
  if (outcome.kind === "stage_decision") return outcome.decision;
  if (outcome.disposition === "merged") {
    return `merged -> ${outcome.canonicalSurvivingArtifactId ?? "missing survivor"}`;
  }
  if (outcome.disposition === "superseded" && outcome.supersedingArtifactId) {
    return `superseded -> ${outcome.supersedingArtifactId}`;
  }
  return outcome.disposition;
}

function compareApprovalItems(
  left: GovernanceApprovalQueueItem,
  right: GovernanceApprovalQueueItem,
): number {
  return approvalIssueRank(left.approvalStatus) - approvalIssueRank(right.approvalStatus) ||
    left.targetArtifactId.localeCompare(right.targetArtifactId) ||
    left.jsonPath.localeCompare(right.jsonPath);
}

function approvalIssueRank(status: ApprovalStatus): number {
  if (status === "invalid" || status === "stale" || status === "mismatched") return 4;
  if (status === "pending_operator_disposition") return 5;
  return 99;
}

function emptyMaintenance(approval: GovernanceApprovalQueueResult): GovernanceApprovalDecisionResult["maintenance"] {
  return {
    repair: {
      ok: true,
      blockedMessage: "Governance records require canonical repair.",
      candidates: [],
      repairableCount: 0,
      payloadContentSummary: "No governance repair preview was refreshed by this service call.",
    },
    approval,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function plainError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
