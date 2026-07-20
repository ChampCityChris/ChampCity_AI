import type { JsonValue } from "../../shared/artifacts";
import type { ConfiguredProject } from "../../shared/projects";
import {
  isWorkflowWorkCardKind,
  uniqueNonEmpty,
  workflowBlocker,
  type WorkflowApprovalState,
  type WorkflowArtifactState,
  type WorkflowCandidateIdentity,
  type WorkflowDomain,
  type WorkflowPhaseIdentity,
  type WorkflowRepairIdentity,
  type WorkflowReplacementIdentity,
  type WorkflowTypedRelationship,
  type WorkflowWorkCardKind,
} from "../../shared/workflow";
import type { VerifiedArtifactGraph, VerifiedArtifactNode } from "../repository";

const terminalPlanStatuses: Readonly<Record<string, WorkflowCandidateIdentity["resolutionStatus"]>> = {
  resolved: "completed",
  completed: "completed",
  completed_via_repair: "completed_via_repair",
  superseded_by_replacement_candidate: "superseded_by_replacement_candidate",
  carried_forward: "carried_forward",
  deferred: "deferred",
  cancelled: "cancelled",
};

export function normalizeWorkflowDomain(
  project: ConfiguredProject,
  graph: VerifiedArtifactGraph,
): WorkflowDomain {
  const blockers = graph.blockers.map((blocker) =>
    workflowBlocker(
      blocker.code === "duplicate_authority"
        ? "duplicate_artifact_id"
        : blocker.code === "incomplete_pair"
          ? "unsynchronized_artifact_pair"
        : blocker.code === "invalid_pair"
          ? "unsynchronized_artifact_pair"
          : "manual_intervention_required",
      blocker.message,
      "application",
      blocker.artifactIds,
    ),
  );
  const artifacts = new Map<string, WorkflowArtifactState>();
  const controlling = graph.nodes.filter((node) => node.classification === "controlling");
  for (const node of controlling) {
    artifacts.set(node.artifact.artifactId, artifactState(node));
  }

  const relationships: WorkflowTypedRelationship[] = [];
  for (const node of controlling) {
    relationships.push(...typedRelationshipsFor(node));
  }

  const phases = normalizePhases(graph, relationships);
  const lifecycleActivePhaseId = selectActivePhase(phases, blockers);
  const activePhaseId = blockers.length === 0
    ? lifecycleActivePhaseId
    : null;
  const phasePlans = activePhaseId
    ? graph.byType("work_card_plan", activePhaseId)
    : [];
  const plan = selectSingle(phasePlans);
  if (activePhaseId && phasePlans.length !== 1) {
    blockers.push(workflowBlocker(
      phasePlans.length === 0 ? "work_card_plan_missing" : "candidate_authority_ambiguous",
      "The active phase requires exactly one controlling Work Card Plan.",
      "architect",
      phasePlans.map((node) => node.artifact.artifactId),
    ));
  }

  const candidates = plan
    ? normalizeCandidates(graph, plan, relationships, blockers)
    : [];
  const repairs = normalizeRepairs(graph, relationships, blockers, activePhaseId);
  const replacements = normalizeReplacements(graph, plan, candidates, relationships, blockers);
  const approvals = normalizeApprovals(graph);

  return {
    project: {
      projectId: project.projectId,
      repositoryBindingId: project.projectId,
      repositoryRootIdentity: project.projectId,
      projectStatus: blockers.length === 0 ? "active" : "blocked",
    },
    phases,
    lifecycleActivePhaseId,
    activePhaseId,
    planArtifactId: plan?.artifact.artifactId ?? null,
    candidates,
    repairs,
    replacements,
    approvals,
    artifacts,
    relationships,
    blockers,
    scannedAt: graph.scannedAt,
  };
}

function normalizePhases(
  graph: VerifiedArtifactGraph,
  relationships: WorkflowTypedRelationship[],
): WorkflowPhaseIdentity[] {
  const activations = graph.byType("phase_activation");
  const closeouts = graph.byType("phase_closeout");
  return activations
    .map((activation) => {
      const data = recordData(activation);
      const phaseId = text(data.phaseId) || activation.artifact.phaseId || "";
      const closeoutMatches = closeouts.filter((closeout) => closeout.artifact.phaseId === phaseId);
      const closeout = onlyValue(closeoutMatches);
      const sequence = number(data.phaseSequence) ?? number(data.sequence) ?? 0;
      relationships.push({
        kind: "belongs_to_phase",
        fromArtifactId: activation.artifact.artifactId,
        toArtifactId: activation.artifact.artifactId,
      });
      return {
        phaseId,
        projectId: activation.artifact.projectId,
        phaseSequence: sequence,
        predecessorPhaseId: text(data.predecessorPhaseId) || null,
        successorPhaseId: text(data.successorPhaseId) || text(recordData(closeout).successorPhaseId) || null,
        phaseStatus: closeout ? "closed" as const : "active" as const,
        activationArtifactId: activation.artifact.artifactId,
        closeoutArtifactId: closeout?.artifact.artifactId ?? null,
      };
    })
    .filter((phase) => phase.phaseId.length > 0);
}

function selectActivePhase(
  phases: readonly WorkflowPhaseIdentity[],
  blockers: WorkflowDomain["blockers"],
): string | null {
  const active = phases.filter((phase) => phase.phaseStatus === "active");
  if (active.length === 0) return null;
  const single = onlyValue(active);
  if (single) return single.phaseId;
  let selected: WorkflowPhaseIdentity | null = null;
  let duplicateTopSequence = false;
  for (const phase of active) {
    if (!selected || phase.phaseSequence > selected.phaseSequence) {
      selected = phase;
      duplicateTopSequence = false;
    } else if (phase.phaseSequence === selected.phaseSequence) {
      duplicateTopSequence = true;
    }
  }
  if (selected && !duplicateTopSequence) return selected.phaseId;
  blockers.push(workflowBlocker(
    "ambiguous_current_action",
    "Conflicting phase lifecycle evidence exists without explicit unique phase succession.",
    "application",
    active.map((phase) => phase.activationArtifactId),
  ));
  return null;
}

function normalizeCandidates(
  graph: VerifiedArtifactGraph,
  plan: VerifiedArtifactNode,
  relationships: WorkflowTypedRelationship[],
  blockers: WorkflowDomain["blockers"],
): WorkflowCandidateIdentity[] {
  const data = recordData(plan);
  const rawCandidates = Array.isArray(data.candidates)
    ? data.candidates.filter(isRecord)
    : [];
  const candidates = rawCandidates.map((candidate) => {
    const planCandidateId = text(candidate.id);
    const planOrder = number(candidate.order) ?? Number.MAX_SAFE_INTEGER;
    const workCard = selectSingle(
      graph.byType("work_card", plan.artifact.phaseId).filter((node) => {
        const workCardData = recordData(node);
        return (
          text(workCardData.planCandidateId) === planCandidateId ||
          node.artifact.workCardId === planCandidateId ||
          node.artifact.artifactId === text(candidate.artifactId)
        );
      }),
    );
    const workCardData = recordData(workCard);
    const workCardKind = normalizeWorkCardKind(
      candidate.kind,
      workCardData.workCardKind,
      workCardData.kind,
    ) ?? "planned_candidate";
    const expectedReportId =
      text(workCardData.expectedImplementerReportArtifactId) ||
      exactExpectedOutputId(workCard, "implementer_report");
    const rootCandidateArtifactId =
      text(workCardData.rootCandidateArtifactId) ||
      workCard?.artifact.artifactId ||
      text(candidate.artifactId) ||
      "";
    if (!planCandidateId || !Number.isInteger(planOrder) || planOrder < 1) {
      blockers.push(workflowBlocker(
        "candidate_authority_ambiguous",
        "Every Work Card Plan candidate requires an exact typed ID and positive plan order.",
        "architect",
        [plan.artifact.artifactId],
      ));
    }
    if (workCard) {
      relationships.push({
        kind: "declared_by_plan",
        fromArtifactId: workCard.artifact.artifactId,
        toArtifactId: plan.artifact.artifactId,
      });
      relationships.push({
        kind: "implements_candidate",
        fromArtifactId: workCard.artifact.artifactId,
        toArtifactId: plan.artifact.artifactId,
      });
    }
    const validationMatches = plan.artifact.phaseId
      ? graph.forWorkCard("operator_validation", plan.artifact.phaseId, planCandidateId)
      : [];
    if (validationMatches.length > 1) {
      blockers.push(workflowBlocker(
        "candidate_validation_ambiguous",
        "Candidate validation evidence is ambiguous and cannot select current action.",
        "architect",
        validationMatches.map((node) => node.artifact.artifactId),
      ));
    }
    return {
      planCandidateId,
      workCardArtifactId: workCard?.artifact.artifactId ?? null,
      workCardId: text(workCardData.workCardId) || workCard?.artifact.workCardId || planCandidateId,
      workCardKind,
      projectId: plan.artifact.projectId,
      phaseId: plan.artifact.phaseId ?? "",
      planArtifactId: plan.artifact.artifactId,
      planOrder,
      rootCandidateArtifactId,
      parentWorkCardArtifactId: text(workCardData.parentWorkCardArtifactId) || workCard?.artifact.parentArtifactId || null,
      workCardStatus: text(workCardData.workCardStatus) || text(workCardData.status) || text(candidate.status) || workCard?.artifact.status || "active",
      expectedImplementerReportArtifactId: expectedReportId,
      resolutionStatus: resolutionStatusFor(graph, plan, candidate, workCard),
    };
  });
  const orders = new Set<number>();
  for (const candidate of candidates) {
    if (orders.has(candidate.planOrder)) {
      blockers.push(workflowBlocker(
        "candidate_authority_ambiguous",
        "Work Card Plan candidates must have unique explicit plan order values.",
        "architect",
        [plan.artifact.artifactId],
      ));
    }
    orders.add(candidate.planOrder);
  }
  return candidates.sort((left, right) =>
    left.planOrder - right.planOrder || left.planCandidateId.localeCompare(right.planCandidateId),
  );
}

function normalizeRepairs(
  graph: VerifiedArtifactGraph,
  relationships: WorkflowTypedRelationship[],
  blockers: WorkflowDomain["blockers"],
  activePhaseId: string | null,
): WorkflowRepairIdentity[] {
  const repairs = graph.byType("work_card").flatMap((node) => {
    const data = recordData(node);
    const hasExplicitRepairFields = number(data.repairSequence) !== null ||
      text(data.parentWorkCardArtifactId).length > 0 ||
      text(data.priorRepairArtifactId).length > 0 ||
      text(data.priorRepairWorkCardArtifactId).length > 0;
    const kind = normalizeWorkCardKind(data.workCardKind, data.kind) ??
      (hasExplicitRepairFields ? "repair" : null);
    const repairWorkCardArtifactId = text(data.repairWorkCardArtifactId) || node.artifact.artifactId;
    const parentWorkCardArtifactId = text(data.parentWorkCardArtifactId) || node.artifact.parentArtifactId || "";
    const repairSequence = number(data.repairSequence);
    const triggerArtifactId = text(data.triggerArtifactId);
    const authorizingArtifactId = text(data.authorizingArtifactId) || text(data.authorizingDispositionArtifactId);
    const expectedImplementerReportArtifactId =
      text(data.expectedImplementerReportArtifactId) ||
      exactExpectedOutputId(node, "implementer_report") ||
      "";
    if (kind !== "repair") return [];
    if (!parentWorkCardArtifactId || !repairSequence || !triggerArtifactId || !authorizingArtifactId || !expectedImplementerReportArtifactId) {
      if (node.artifact.phaseId !== activePhaseId) return [];
      blockers.push(workflowBlocker(
        "repair_lineage_ambiguous",
        "Repair Work Cards require explicit parent, sequence, trigger, authorizer, and Implementer Report identity.",
        "architect",
        [node.artifact.artifactId],
      ));
      return [];
    }
    relationships.push({
      kind: "repairs_work_card",
      fromArtifactId: repairWorkCardArtifactId,
      toArtifactId: parentWorkCardArtifactId,
    });
    const priorRepairArtifactId = text(data.priorRepairArtifactId) || text(data.priorRepairWorkCardArtifactId) || null;
    if (priorRepairArtifactId) {
      relationships.push({
        kind: "follows_repair",
        fromArtifactId: repairWorkCardArtifactId,
        toArtifactId: priorRepairArtifactId,
      });
    }
    return [{
      rootCandidateArtifactId: text(data.rootCandidateArtifactId) || parentWorkCardArtifactId,
      parentWorkCardArtifactId,
      repairSequence,
      priorRepairArtifactId,
      triggerArtifactId,
      authorizingArtifactId,
      repairWorkCardArtifactId,
      expectedImplementerReportArtifactId,
    }];
  });
  return repairs.sort((left, right) =>
    left.parentWorkCardArtifactId.localeCompare(right.parentWorkCardArtifactId) ||
    left.repairSequence - right.repairSequence,
  );
}

function normalizeReplacements(
  graph: VerifiedArtifactGraph,
  plan: VerifiedArtifactNode | null,
  candidates: readonly WorkflowCandidateIdentity[],
  relationships: WorkflowTypedRelationship[],
  blockers: WorkflowDomain["blockers"],
): WorkflowReplacementIdentity[] {
  const replacements = candidates.flatMap((candidate) => {
    if (candidate.workCardKind !== "replacement_candidate" || !candidate.workCardArtifactId) return [];
    const node = graph.controlling(candidate.workCardArtifactId);
    const data = recordData(node);
    const replacesWorkCardArtifactId =
      text(data.replacesWorkCardArtifactId) ||
      text(candidateRecord(plan, candidate.planCandidateId).replacesArtifactId);
    const authorizingDispositionArtifactId =
      text(data.authorizingDispositionArtifactId) ||
      text(data.authorizingCandidateDispositionArtifactId);
    const replacementReasonArtifactId = text(data.replacementReasonArtifactId);
    const expectedImplementerReportArtifactId = candidate.expectedImplementerReportArtifactId;
    if (!replacesWorkCardArtifactId || !authorizingDispositionArtifactId || !replacementReasonArtifactId || !expectedImplementerReportArtifactId) {
      blockers.push(workflowBlocker(
        "candidate_authority_ambiguous",
        "Replacement candidates require explicit replaced candidate, authorizing disposition, reason, plan, order, and output identities.",
        "architect",
        [candidate.workCardArtifactId],
      ));
      return [];
    }
    relationships.push({
      kind: "replaces_work_card",
      fromArtifactId: candidate.workCardArtifactId,
      toArtifactId: replacesWorkCardArtifactId,
    });
    return [{
      replacementWorkCardArtifactId: candidate.workCardArtifactId,
      replacesWorkCardArtifactId,
      authorizingDispositionArtifactId,
      replacementReasonArtifactId,
      planArtifactId: candidate.planArtifactId,
      planOrder: candidate.planOrder,
      expectedImplementerReportArtifactId,
    }];
  });
  return replacements.sort((left, right) => left.planOrder - right.planOrder);
}

function normalizeApprovals(graph: VerifiedArtifactGraph): WorkflowApprovalState[] {
  return graph.byType("operator_approval").flatMap((node) => {
    const data = recordData(node);
    const bindings = exactApprovalBindings(data);
    return bindings.map((binding) => ({
      artifactId: node.artifact.artifactId,
      approvedArtifactId: binding.approvedArtifactId,
      approvalScope: text(data.stage),
      phaseId: node.artifact.phaseId ?? null,
      decision: binding.decision,
      approvedRevision: binding.approvedRevision,
      approvedPayloadHash: binding.approvedPayloadHash,
      sourceArtifactIds: [...node.artifact.relationships.sources],
      expectedOutputArtifactIds: [...node.artifact.relationships.expectedOutputs],
      implementationAuthorized:
        data.stage === "work_card" &&
        binding.decision === "approved" &&
        node.artifact.relationships.expectedOutputs.some((artifactId) =>
          artifactId.includes("/implementer_report/"),
        ),
      phaseProgressionAuthorized:
        data.stage === "phase_planning" &&
        binding.decision === "approved",
    }));
  });
}

function exactApprovalBindings(
  data: Record<string, unknown>,
): Array<{
  approvedArtifactId: string;
  approvedRevision: number | null;
  approvedPayloadHash: string | null;
  decision: string | null;
}> {
  if (data.schemaVersion !== "operator-decision-record.v1" || !isRecord(data.outcome)) return [];
  const decision =
    data.outcome.kind === "stage_decision"
      ? text(data.outcome.decision) || null
      : data.outcome.kind === "record_disposition"
        ? text(data.outcome.disposition) || null
        : null;
  const targets = Array.isArray(data.targets) ? data.targets.filter(isRecord) : [];
  const candidates = targets.map((target) => ({
    approvedArtifactId: text(target.artifactId),
    approvedRevision: number(target.revision),
    approvedPayloadHash: text(target.payloadHash) || null,
    decision,
  })).filter((binding) => binding.approvedArtifactId.length > 0);
  if (candidates.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  return candidates.filter((binding) => {
    const key = `${binding.approvedArtifactId}\0${binding.approvedRevision ?? ""}\0${binding.approvedPayloadHash ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolutionStatusFor(
  graph: VerifiedArtifactGraph,
  plan: VerifiedArtifactNode,
  candidate: Record<string, unknown>,
  workCard: VerifiedArtifactNode | null,
): WorkflowCandidateIdentity["resolutionStatus"] {
  const planStatus = text(candidate.status);
  const terminal = terminalPlanStatuses[planStatus];
  if (terminal) return terminal;
  const candidateArtifactId = workCard?.artifact.artifactId ?? text(candidate.artifactId);
  if (candidateArtifactId && plan.artifact.relationships.supersedes.includes(candidateArtifactId)) {
    return "superseded_by_replacement_candidate";
  }
  const disposition = singleForWorkCard(graph, "candidate_disposition", plan.artifact.phaseId, text(candidate.id));
  const dispositionStatus = text(recordData(disposition).status);
  const dispositionTerminal = terminalPlanStatuses[dispositionStatus];
  if (dispositionTerminal) return dispositionTerminal;
  return "unresolved";
}

function typedRelationshipsFor(node: VerifiedArtifactNode): WorkflowTypedRelationship[] {
  const artifact = node.artifact;
  const relationships: WorkflowTypedRelationship[] = [{
    kind: "belongs_to_project",
    fromArtifactId: artifact.artifactId,
    toArtifactId: artifact.projectId,
  }];
  if (artifact.phaseId) {
    relationships.push({
      kind: "belongs_to_phase",
      fromArtifactId: artifact.artifactId,
      toArtifactId: artifact.phaseId,
    });
  }
  for (const outputId of artifact.relationships.expectedOutputs) {
    const kind =
      outputId.includes("/implementer_report/")
        ? "produces_implementer_report"
        : outputId.includes("/architect_review/")
          ? "produces_architect_review"
          : outputId.includes("/operator_validation/")
            ? "produces_operator_validation"
            : null;
    if (kind) {
      relationships.push({
        kind,
        fromArtifactId: artifact.artifactId,
        toArtifactId: outputId,
      });
    }
  }
  for (const supersededId of artifact.relationships.supersedes) {
    relationships.push({
      kind: "supersedes_artifact",
      fromArtifactId: artifact.artifactId,
      toArtifactId: supersededId,
    });
  }
  return relationships;
}

function artifactState(node: VerifiedArtifactNode): WorkflowArtifactState {
  const artifact = node.artifact;
  return {
    artifactId: artifact.artifactId,
    artifactType: artifact.artifactType,
    projectId: artifact.projectId,
    phaseId: artifact.phaseId ?? null,
    workCardId: artifact.workCardId ?? null,
    parentArtifactId: artifact.parentArtifactId ?? null,
    status: artifact.status,
    revision: artifact.revision,
    payloadHash: artifact.payloadHash,
    title: artifact.payload.title,
    jsonPath: node.jsonPath,
    markdownPath: node.markdownPath,
    sourceArtifactIds: [...artifact.relationships.sources],
    expectedOutputArtifactIds: [...artifact.relationships.expectedOutputs],
    supersededArtifactIds: [...artifact.relationships.supersedes],
    data: recordData(node),
  };
}

function exactExpectedOutputId(
  node: VerifiedArtifactNode | null,
  artifactType: string,
): string | null {
  if (!node) return null;
  const matches = node.artifact.relationships.expectedOutputs.filter((artifactId) =>
    artifactId.includes(`/${artifactType}/`),
  );
  return onlyValue(matches);
}

function candidateRecord(
  plan: VerifiedArtifactNode | null,
  candidateId: string,
): Record<string, unknown> {
  const candidates = recordData(plan).candidates;
  if (!Array.isArray(candidates)) return {};
  const matches = candidates.filter((candidate) =>
    isRecord(candidate) && text(candidate.id) === candidateId,
  );
  const match = onlyValue(matches);
  return match && isRecord(match) ? match : {};
}

function selectSingle(nodes: readonly VerifiedArtifactNode[]): VerifiedArtifactNode | null {
  return onlyValue(nodes);
}

function singleForWorkCard(
  graph: VerifiedArtifactGraph,
  artifactType: string,
  phaseId: string | undefined,
  workCardId: string,
): VerifiedArtifactNode | null {
  if (!phaseId || !workCardId) return null;
  return selectSingle(graph.forWorkCard(artifactType, phaseId, workCardId));
}

function normalizeWorkCardKind(...values: unknown[]): WorkflowWorkCardKind | null {
  for (const value of values) {
    if (isWorkflowWorkCardKind(value)) return value;
  }
  return null;
}

function recordData(node: VerifiedArtifactNode | null): Record<string, unknown> {
  const data = node?.artifact.payload.data;
  return isRecord(data) ? data : {};
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function number(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function onlyValue<T>(values: readonly T[]): T | null {
  if (values.length !== 1) return null;
  let selected: T | null = null;
  for (const value of values) selected = value;
  return selected;
}
