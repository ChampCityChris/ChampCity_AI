import {
  defaultLifecycleActionTemplates,
  createPhaseExecutionState,
  createWorkflowStateIndex,
  materializeActionCatalog,
  projectRoutedAction,
  type CandidateResolutionStatus,
  type WorkflowActionBinding,
  type WorkflowBlocker,
  type WorkflowStateIndex,
} from "../../shared/workflow";
import type { JsonValue } from "../../shared/artifacts";
import type { ConfiguredProject } from "../../shared/projects";
import type { VerifiedArtifactGraph, VerifiedArtifactNode } from "../repository";

interface ProjectedStep {
  actionId: string;
  targetArtifactId: string | null;
  sourceArtifactIds: string[];
  expectedOutputArtifactId: string;
  evidenceArtifactIds: string[];
  activeWorkCard: VerifiedArtifactNode | null;
}

export interface EvidenceWorkflowProjection {
  state: WorkflowStateIndex;
  graph: VerifiedArtifactGraph;
  evidenceArtifactIds: string[];
}

export class EvidenceDerivedWorkflowProjector {
  project(
    project: ConfiguredProject,
    graph: VerifiedArtifactGraph,
    projectionRevision: number,
  ): EvidenceWorkflowProjection {
    const activePhaseId = selectActivePhaseId(graph);
    const plan = activePhaseId
      ? selectSingle(graph.byType("work_card_plan", activePhaseId))
      : null;
    const candidates = readCandidates(plan);
    const candidateStates = candidates.map((candidate) => {
      const workCard = graph.controlling(
        `${project.projectId}/${activePhaseId}/work_card/${candidate.id}`,
      );
      const resolution = candidateResolution(graph, activePhaseId ?? "", candidate.id);
      return {
        candidateId: candidate.id,
        title: candidate.title,
        order: candidate.order,
        fullWorkCardArtifactId: workCard?.artifact.artifactId ?? null,
        fullWorkCardStatus: workCard ? "active" as const : "missing" as const,
        resolutionStatus: resolution.status,
        resolutionEvidenceArtifactIds: resolution.evidenceArtifactIds,
      };
    });
    const activeCandidate = candidateStates.find(
      (candidate) => candidate.resolutionStatus === "unresolved",
    );
    const baseWorkCard = activeCandidate?.fullWorkCardArtifactId
      ? graph.controlling(activeCandidate.fullWorkCardArtifactId)
      : null;
    const step = deriveStep(project, graph, activePhaseId, plan, baseWorkCard, activeCandidate?.candidateId ?? null);
    const bindings = buildBindings(project.projectId, activePhaseId, plan, step);
    const actions = materializeActionCatalog(defaultLifecycleActionTemplates, bindings);
    const createdAt = graph.scannedAt;
    const state = createWorkflowStateIndex({
      workflowStateArtifactId: `${project.projectId}/system/evidence_projection`,
      projectId: project.projectId,
      activePhaseId,
      createdAt,
      initialActionId: step.actionId,
      actions,
      phaseExecution: createPhaseExecutionState({
        workCardPlanArtifactId: plan?.artifact.artifactId ?? null,
        workCardPlanAuthority: plan ? "authoritative" : "missing",
        approvedCandidates: candidateStates,
        activeCandidateId: activeCandidate?.candidateId ?? null,
        activeWorkCardArtifactId: step.activeWorkCard?.artifact.artifactId ?? baseWorkCard?.artifact.artifactId ?? null,
        activeRepairArtifactId:
          step.activeWorkCard?.artifact.parentArtifactId &&
          step.activeWorkCard.artifact.workCardId?.includes("-REPAIR")
            ? step.activeWorkCard.artifact.artifactId
            : null,
      }),
    });
    const blockers = toWorkflowBlockers(graph);
    const activeRecord = state.actionCatalog[step.actionId];
    state.stateRevision = Math.max(1, projectionRevision);
    state.updatedAt = graph.scannedAt;
    state.blockingConditions = blockers;
    state.currentAction = projectRoutedAction(
      state.workflowStateArtifactId,
      state.stateRevision,
      activeRecord,
      blockers,
    );
    state.currentAction.bindingSource = {
      kind: "evidence_projection",
      workflowStateArtifactId: state.workflowStateArtifactId,
      stateRevision: state.stateRevision,
      projectId: project.projectId,
      evidenceArtifactIds: [...step.evidenceArtifactIds],
    };
    state.currentActionId = step.actionId;
    state.currentStage = activeRecord.stage;
    state.responsibleRole = activeRecord.role;
    state.authoritativeTargetArtifactId = activeRecord.targetArtifactId;
    state.requiredSourceArtifactIds = [...activeRecord.sourceArtifactIds];
    state.expectedOutput = { ...activeRecord.expectedOutput };
    state.routes = { ...activeRecord.routes };
    return { state, graph, evidenceArtifactIds: [...step.evidenceArtifactIds] };
  }
}

function deriveStep(
  project: ConfiguredProject,
  graph: VerifiedArtifactGraph,
  phaseId: string | null,
  plan: VerifiedArtifactNode | null,
  baseWorkCard: VerifiedArtifactNode | null,
  candidateId: string | null,
): ProjectedStep {
  if (!phaseId) {
    const intake = first(graph.byType("project_intake"));
    return intake
      ? step("project_interview_required", intake.artifact.artifactId, [intake.artifact.artifactId], `${project.projectId}/project/architect_interview/current`, [intake], null)
      : step("project_intake_required", null, [], `${project.projectId}/project/project_intake/current`, [], null);
  }
  const phaseApproval = first(graph.byType("phase_approval", phaseId));
  if (!plan || !phaseApproval) {
    const sources = graph.byType("phase_planning", phaseId);
    return step(
      phaseApproval ? "work_card_authoring_required" : "operator_phase_approval_required",
      plan?.artifact.artifactId ?? sources[0]?.artifact.artifactId ?? null,
      unique(sources.map((node) => node.artifact.artifactId)),
      phaseApproval
        ? `${project.projectId}/${phaseId}/work_card/${candidateId ?? "WC01"}`
        : `${project.projectId}/${phaseId}/approval/Operator_Phase_Approval`,
      [...sources, ...(plan ? [plan] : [])],
      null,
    );
  }
  if (!baseWorkCard) {
    return step(
      "work_card_authoring_required",
      plan.artifact.artifactId,
      [phaseApproval.artifact.artifactId, plan.artifact.artifactId],
      `${project.projectId}/${phaseId}/work_card/${candidateId ?? "WC01"}`,
      [phaseApproval, plan],
      null,
    );
  }
  return deriveWorkCardStep(project.projectId, phaseId, graph, baseWorkCard, new Set());
}

function deriveWorkCardStep(
  projectId: string,
  phaseId: string,
  graph: VerifiedArtifactGraph,
  workCard: VerifiedArtifactNode,
  visited: Set<string>,
): ProjectedStep {
  if (visited.has(workCard.artifact.artifactId)) {
    return step(
      "architect_disposition_required",
      workCard.artifact.artifactId,
      [workCard.artifact.artifactId],
      `${projectId}/${phaseId}/architect_disposition/${workCard.artifact.workCardId ?? "unknown"}`,
      [workCard],
      workCard,
    );
  }
  visited.add(workCard.artifact.artifactId);
  const expectedReportId = exactExpectedOutput(workCard, "implementer_report") ??
    `${projectId}/${phaseId}/implementer_report/${workCard.artifact.workCardId ?? "unknown"}`;
  const report = activeEvidence(graph.controlling(expectedReportId));
  if (!report) {
    return step(
      "implementer_execution_required",
      workCard.artifact.artifactId,
      [workCard.artifact.artifactId],
      expectedReportId,
      [workCard],
      workCard,
    );
  }
  const expectedReviewId = exactExpectedOutput(report, "architect_review") ??
    `${projectId}/${phaseId}/architect_review/${workCard.artifact.workCardId ?? "unknown"}`;
  const review = activeEvidence(graph.controlling(expectedReviewId));
  if (!review) {
    return step(
      "architect_review_of_implementer_report_required",
      workCard.artifact.artifactId,
      [report.artifact.artifactId],
      expectedReviewId,
      [workCard, report],
      workCard,
    );
  }
  const reviewData = recordData(review);
  const decision = text(reviewData.decision).toLowerCase();
  const authorized = reviewData.operatorValidationAuthorized === true || decision.includes("ready for operator validation");
  if (authorized) {
    const expectedValidationId = exactExpectedOutput(review, "validation_report") ??
      `${projectId}/${phaseId}/validation_report/${workCard.artifact.workCardId ?? "unknown"}`;
    const validation = activeEvidence(graph.controlling(expectedValidationId));
    if (!validation) {
      return step(
        "operator_validation_required",
        workCard.artifact.artifactId,
        [review.artifact.artifactId],
        expectedValidationId,
        [workCard, report, review],
        workCard,
      );
    }
    const validationResult = text(recordData(validation).result).toLowerCase();
    if (["pass", "passed", "success", "completed"].includes(validationResult)) {
      return step(
        "work_card_authoring_required",
        workCard.artifact.artifactId,
        [validation.artifact.artifactId],
        `${projectId}/${phaseId}/work_card/next`,
        [workCard, report, review, validation],
        workCard,
      );
    }
    return step(
      "architect_disposition_required",
      workCard.artifact.artifactId,
      [validation.artifact.artifactId],
      `${projectId}/${phaseId}/architect_disposition/${workCard.artifact.workCardId ?? "unknown"}`,
      [workCard, report, review, validation],
      workCard,
    );
  }
  if (decision.includes("repair")) {
    if (repairLimitReached(workCard)) {
      return step(
        "architect_disposition_required",
        workCard.artifact.artifactId,
        [review.artifact.artifactId],
        `${projectId}/${phaseId}/architect_disposition/${workCard.artifact.workCardId ?? "unknown"}`,
        [workCard, report, review],
        workCard,
      );
    }
    const expectedRepairId = exactExpectedOutput(review, "work_card") ??
      `${projectId}/${phaseId}/work_card/${requiredRepairId(review) ?? `${workCard.artifact.workCardId}-REPAIR01`}`;
    const repair = activeEvidence(graph.controlling(expectedRepairId));
    if (!repair) {
      return step(
        "repair_work_card_required",
        workCard.artifact.artifactId,
        [review.artifact.artifactId],
        expectedRepairId,
        [workCard, report, review],
        workCard,
      );
    }
    return deriveWorkCardStep(projectId, phaseId, graph, repair, visited);
  }
  return step(
    "architect_review_of_implementer_report_required",
    workCard.artifact.artifactId,
    [report.artifact.artifactId],
    expectedReviewId,
    [workCard, report, review],
    workCard,
  );
}

function buildBindings(
  projectId: string,
  phaseId: string | null,
  plan: VerifiedArtifactNode | null,
  active: ProjectedStep,
): Record<string, WorkflowActionBinding> {
  const phase = phaseId ?? "phase-unmapped";
  const workCardId = active.activeWorkCard?.artifact.workCardId ?? "WC01";
  const workCardIdPath = `${projectId}/${phase}/work_card/${workCardId}`;
  const defaults: Record<string, WorkflowActionBinding> = {};
  for (const template of defaultLifecycleActionTemplates) {
    defaults[template.actionId] = {
      targetArtifactId: workCardIdPath,
      sourceArtifactIds: [],
      expectedOutputArtifactId: `${projectId}/${phase}/${template.expectedOutputArtifactType}/${workCardId}`,
    };
  }
  Object.assign(defaults, {
    project_intake_required: binding(null, [], `${projectId}/project/project_intake/current`),
    project_interview_required: binding(`${projectId}/project/project_intake/current`, [], `${projectId}/project/architect_interview/current`),
    reconciliation_review_required: binding(`${projectId}/project/architect_interview/current`, [], `${projectId}/project/repository_reconciliation/current`),
    project_mapping_required: binding(`${projectId}/project/repository_reconciliation/current`, [], `${projectId}/project/roadmap/current`),
    operator_project_approval_required: binding(`${projectId}/project/roadmap/current`, [], `${projectId}/project/project_approval/current`),
    phase_mapping_required: binding(`${projectId}/project/roadmap/current`, [], `${projectId}/${phase}/phase_map/current`),
    operator_phase_approval_required: binding(plan?.artifact.artifactId ?? `${projectId}/${phase}/work_card_plan/current`, [], `${projectId}/${phase}/approval/Operator_Phase_Approval`),
  });
  defaults[active.actionId] = binding(
    active.targetArtifactId,
    active.sourceArtifactIds,
    active.expectedOutputArtifactId,
  );
  return defaults;
}

function binding(
  targetArtifactId: string | null,
  sourceArtifactIds: string[],
  expectedOutputArtifactId: string,
): WorkflowActionBinding {
  return { targetArtifactId, sourceArtifactIds, expectedOutputArtifactId };
}

function step(
  actionId: string,
  targetArtifactId: string | null,
  sourceArtifactIds: string[],
  expectedOutputArtifactId: string,
  evidence: VerifiedArtifactNode[],
  activeWorkCard: VerifiedArtifactNode | null,
): ProjectedStep {
  return {
    actionId,
    targetArtifactId,
    sourceArtifactIds: unique(sourceArtifactIds),
    expectedOutputArtifactId,
    evidenceArtifactIds: unique(evidence.map((node) => node.artifact.artifactId)),
    activeWorkCard,
  };
}

function selectActivePhaseId(graph: VerifiedArtifactGraph): string | null {
  const activations = graph.byType("phase_activation").filter((node) => {
    const status = text(recordData(node).status).toLowerCase();
    return node.artifact.status === "active" && (!status || status === "active");
  });
  const phaseIds = unique(
    activations.map((node) => node.artifact.phaseId).filter((value): value is string => Boolean(value)),
  );
  if (phaseIds.length === 0) {
    const plans = graph.byType("work_card_plan");
    return plans.length === 1 ? plans[0].artifact.phaseId ?? null : null;
  }
  const sourcedByLater = new Set<string>();
  for (const activation of activations) {
    for (const sourceId of activation.artifact.relationships.sources) {
      const source = graph.controlling(sourceId);
      if (source?.artifact.phaseId && source.artifact.phaseId !== activation.artifact.phaseId) {
        sourcedByLater.add(source.artifact.phaseId);
      }
    }
  }
  const terminal = phaseIds.filter((phaseId) => !sourcedByLater.has(phaseId));
  if (terminal.length === 1) return terminal[0];
  return [...(terminal.length > 0 ? terminal : phaseIds)].sort(comparePhaseIds).at(-1) ?? null;
}

function candidateResolution(
  graph: VerifiedArtifactGraph,
  phaseId: string,
  candidateId: string,
): { status: CandidateResolutionStatus; evidenceArtifactIds: string[] } {
  const validations = graph.forWorkCard("validation_report", phaseId, candidateId);
  const passing = validations.find((node) => {
    const result = text(recordData(node).result).toLowerCase();
    return ["pass", "passed", "success", "completed"].includes(result);
  });
  if (passing) return { status: "completed", evidenceArtifactIds: [passing.artifact.artifactId] };
  const dispositions = graph.forWorkCard("candidate_disposition", phaseId, candidateId);
  const disposition = dispositions[0];
  const status = text(recordData(disposition).status) as CandidateResolutionStatus;
  if (["carried_forward", "deferred", "cancelled", "completed_via_repair"].includes(status)) {
    return { status, evidenceArtifactIds: [disposition.artifact.artifactId] };
  }
  return { status: "unresolved", evidenceArtifactIds: [] };
}

function readCandidates(plan: VerifiedArtifactNode | null): Array<{ id: string; title: string; order: number }> {
  const candidates = recordData(plan).candidates;
  if (!Array.isArray(candidates)) return [];
  return candidates
    .filter(isRecord)
    .map((candidate) => ({
      id: text(candidate.id),
      title: text(candidate.title) || text(candidate.id),
      order: typeof candidate.order === "number" ? candidate.order : Number.MAX_SAFE_INTEGER,
    }))
    .filter((candidate) => Boolean(candidate.id))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function exactExpectedOutput(node: VerifiedArtifactNode, artifactType: string): string | null {
  return (
    node.artifact.relationships.expectedOutputs.find((artifactId) =>
      artifactId.includes(`/${artifactType}/`),
    ) ?? null
  );
}

function requiredRepairId(review: VerifiedArtifactNode): string | null {
  const value = recordData(review).requiredRepairId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function repairLimitReached(workCard: VerifiedArtifactNode): boolean {
  const data = recordData(workCard);
  if (data.finalNumberedRepair === true) return true;
  const workCardId = workCard.artifact.workCardId ?? "";
  const currentRepairNumber = Number(workCardId.match(/-REPAIR(\d+)$/i)?.[1] ?? 0);
  const maximum = typeof data.maximumRepairCount === "number"
    ? data.maximumRepairCount
    : typeof data.repairLimit === "number"
      ? data.repairLimit
      : null;
  return maximum !== null && currentRepairNumber >= maximum;
}

function activeEvidence(node: VerifiedArtifactNode | null): VerifiedArtifactNode | null {
  return node && ["active", "blocked"].includes(node.artifact.status) ? node : null;
}

function toWorkflowBlockers(graph: VerifiedArtifactGraph): WorkflowBlocker[] {
  return graph.blockers.map((blocker) => ({
    code:
      blocker.code === "duplicate_authority"
        ? "duplicate_active_authority"
        : blocker.code === "incomplete_pair"
          ? "missing_pair"
          : blocker.code === "invalid_pair"
            ? "pair_mismatch"
            : "manual_intervention_required",
    message: blocker.message,
    ownerRole: "application",
    artifactIds: [...blocker.artifactIds],
    blocking: true,
  }));
}

function selectSingle(nodes: VerifiedArtifactNode[]): VerifiedArtifactNode | null {
  return nodes.length === 1 ? nodes[0] : null;
}

function first(nodes: VerifiedArtifactNode[]): VerifiedArtifactNode | null {
  return nodes[0] ?? null;
}

function recordData(node: VerifiedArtifactNode | null): Record<string, JsonValue> {
  return node && isRecord(node.artifact.payload.data)
    ? (node.artifact.payload.data as Record<string, JsonValue>)
    : {};
}

function text(value: JsonValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function comparePhaseIds(left: string, right: string): number {
  const leftNumber = Number(left.match(/(\d+)(?!.*\d)/)?.[1] ?? Number.NaN);
  const rightNumber = Number(right.match(/(\d+)(?!.*\d)/)?.[1] ?? Number.NaN);
  return Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
    ? leftNumber - rightNumber
    : left.localeCompare(right);
}
