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
  blockers: WorkflowBlocker[];
}

export interface RepairLineageProjection {
  repairWorkCardArtifactId: string;
  repairedParentWorkCardArtifactId: string;
  repairImplementerReportArtifactId: string;
  logicalRepairReportArtifactId: string;
  originalParentImplementerReportArtifactId: string;
  authorizingArchitectReviewArtifactId: string;
  authorizingArchitectReviewRevision: number;
  finalNumberedRepair: boolean;
  maximumRepairCount: number;
  finalParentAcceptanceTargetArtifactId: string;
}

export interface EvidenceWorkflowProjection {
  state: WorkflowStateIndex;
  graph: VerifiedArtifactGraph;
  evidenceArtifactIds: string[];
  repairLineage: RepairLineageProjection | null;
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
    const candidateResults = candidates.map((candidate) => {
      const workCard = graph.controlling(
        `${project.projectId}/${activePhaseId}/work_card/${candidate.id}`,
      );
      const resolution = candidateResolution(graph, activePhaseId ?? "", candidate.id);
      return { state: {
        candidateId: candidate.id,
        title: candidate.title,
        order: candidate.order,
        fullWorkCardArtifactId: workCard?.artifact.artifactId ?? null,
        fullWorkCardStatus: workCard ? "active" as const : "missing" as const,
        resolutionStatus: resolution.status,
        resolutionEvidenceArtifactIds: resolution.evidenceArtifactIds,
      }, blockers: resolution.blockers };
    });
    const candidateStates = candidateResults.map((result) => result.state);
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
    const blockers = [
      ...toWorkflowBlockers(graph),
      ...candidateResults.flatMap((result) => result.blockers),
      ...step.blockers,
    ];
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
    return {
      state,
      graph,
      evidenceArtifactIds: [...step.evidenceArtifactIds],
      repairLineage: repairLineageForStep(graph, step),
    };
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
      `${projectId}/${phaseId}/candidate_disposition/${workCard.artifact.workCardId ?? "unknown"}`,
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
  const repairResolution = resolveRepairLineage(
    projectId,
    phaseId,
    graph,
    workCard,
    report,
    review,
  );
  if (repairResolution.detected) {
    return deriveRepairedParentStep(
      projectId,
      phaseId,
      graph,
      workCard,
      report,
      review,
      repairResolution,
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
    const validationResult = validationResultFor(validation);
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
      `${projectId}/${phaseId}/candidate_disposition/${workCard.artifact.workCardId ?? "unknown"}`,
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
        `${projectId}/${phaseId}/candidate_disposition/${workCard.artifact.workCardId ?? "unknown"}`,
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

interface RepairLineageResolution {
  detected: boolean;
  lineage: RepairLineageProjection | null;
  repairWorkCard: VerifiedArtifactNode | null;
  repairReport: VerifiedArtifactNode | null;
  blockers: WorkflowBlocker[];
}

function resolveRepairLineage(
  projectId: string,
  phaseId: string,
  graph: VerifiedArtifactGraph,
  parentWorkCard: VerifiedArtifactNode,
  parentReport: VerifiedArtifactNode,
  parentReview: VerifiedArtifactNode,
): RepairLineageResolution {
  const parentId = parentWorkCard.artifact.artifactId;
  const reviewData = recordData(parentReview);
  const requestedRepairId = requiredRepairId(parentReview);
  const childRepairs = graph.byType("work_card", phaseId).filter((node) => {
    if (!node.artifact.workCardId?.match(/-REPAIR\d+$/i)) return false;
    if (node.artifact.parentArtifactId) return node.artifact.parentArtifactId === parentId;
    return text(recordData(node).parentWorkCardArtifactId) === parentId;
  });
  const reviewRequestsRepair = text(reviewData.decision).toLowerCase().includes("repair");
  if (childRepairs.length === 0 && !reviewRequestsRepair) {
    return { detected: false, lineage: null, repairWorkCard: null, repairReport: null, blockers: [] };
  }
  const blockers: WorkflowBlocker[] = [];
  if (childRepairs.length !== 1) {
    blockers.push(lineageBlocker(
      "repair_lineage_ambiguous",
      `Parent ${parentId} must have exactly one controlling repair Work Card; found ${childRepairs.length}.`,
      [parentId, ...childRepairs.map((node) => node.artifact.artifactId)],
    ));
  }
  const repairWorkCard = childRepairs[0] ?? (requestedRepairId
    ? graph.controlling(`${projectId}/${phaseId}/work_card/${requestedRepairId}`)
    : null);
  if (!repairWorkCard) {
    return { detected: true, lineage: null, repairWorkCard: null, repairReport: null, blockers };
  }
  if (repairWorkCard.artifact.parentArtifactId !== parentId) {
    blockers.push(lineageBlocker(
      "repair_parent_invalid",
      `Repair ${repairWorkCard.artifact.artifactId} lacks the exact canonical parent ${parentId}.`,
      [repairWorkCard.artifact.artifactId, parentId],
    ));
  }
  const repairData = recordData(repairWorkCard);
  const repairId = repairWorkCard.artifact.workCardId ?? "";
  if (requestedRepairId && requestedRepairId !== repairId) {
    blockers.push(lineageBlocker(
      "repair_authorization_mismatch",
      `Architect Review requested ${requestedRepairId}, but ${repairId} claims controlling repair authority.`,
      [parentReview.artifact.artifactId, repairWorkCard.artifact.artifactId],
    ));
  }
  const expectedRepairId = exactExpectedOutput(parentReview, "work_card");
  if (reviewRequestsRepair && expectedRepairId && expectedRepairId !== repairWorkCard.artifact.artifactId) {
    blockers.push(lineageBlocker(
      "repair_authorization_mismatch",
      "The parent Architect Review expected a different repair Work Card.",
      [parentReview.artifact.artifactId, repairWorkCard.artifact.artifactId, expectedRepairId],
    ));
  }
  if (!repairWorkCard.artifact.relationships.sources.includes(parentReview.artifact.artifactId)) {
    blockers.push(lineageBlocker(
      "repair_authorization_missing",
      "The repair Work Card does not cite the parent Architect Review that authorized it.",
      [repairWorkCard.artifact.artifactId, parentReview.artifact.artifactId],
    ));
  }
  const maximumRepairCount = numericRepairLimit(parentWorkCard) ?? 1;
  const repairNumber = Number(repairId.match(/-REPAIR(\d+)$/i)?.[1] ?? 0);
  const finalNumberedRepair =
    repairData.finalNumberedRepair === true ||
    text(repairData.repairLimit).toLowerCase() === "only_and_final" ||
    (repairNumber > 0 && repairNumber === maximumRepairCount);
  if (!finalNumberedRepair || repairNumber < 1 || repairNumber > maximumRepairCount) {
    blockers.push(lineageBlocker(
      "repair_limit_invalid",
      `Repair ${repairId} must be the final permitted repair within maximum count ${maximumRepairCount}.`,
      [repairWorkCard.artifact.artifactId, parentId],
    ));
  }
  const physicalReportId =
    text(repairData.controllingRepairReportArtifactId) ||
    exactExpectedOutput(repairWorkCard, "implementer_report") ||
    `${projectId}/${phaseId}/implementer_report/${repairId}`;
  const logicalReportId =
    text(repairData.logicalRepairReportArtifactId) ||
    `${projectId}/${phaseId}/implementer_report/${repairId}`;
  const repairReport = activeEvidence(graph.controlling(physicalReportId));
  if (repairReport && (
    repairReport.artifact.workCardId !== repairId ||
    repairReport.artifact.parentArtifactId !== parentId ||
    !repairReport.artifact.relationships.sources.includes(repairWorkCard.artifact.artifactId)
  )) {
    blockers.push(lineageBlocker(
      "repair_report_invalid",
      `The controlling repair report does not correspond exactly to ${repairId} and ${parentId}.`,
      [physicalReportId, repairWorkCard.artifact.artifactId, parentId],
    ));
  }
  const authorizingRevision = typeof repairData.authorizingArchitectReviewRevision === "number"
    ? repairData.authorizingArchitectReviewRevision
    : reviewRequestsRepair
      ? parentReview.artifact.revision
      : 1;
  const lineage: RepairLineageProjection = {
    repairWorkCardArtifactId: repairWorkCard.artifact.artifactId,
    repairedParentWorkCardArtifactId: parentId,
    repairImplementerReportArtifactId: physicalReportId,
    logicalRepairReportArtifactId: logicalReportId,
    originalParentImplementerReportArtifactId: parentReport.artifact.artifactId,
    authorizingArchitectReviewArtifactId: parentReview.artifact.artifactId,
    authorizingArchitectReviewRevision: authorizingRevision,
    finalNumberedRepair,
    maximumRepairCount,
    finalParentAcceptanceTargetArtifactId: parentId,
  };
  return { detected: true, lineage, repairWorkCard, repairReport, blockers };
}

function deriveRepairedParentStep(
  projectId: string,
  phaseId: string,
  graph: VerifiedArtifactGraph,
  parentWorkCard: VerifiedArtifactNode,
  parentReport: VerifiedArtifactNode,
  parentReview: VerifiedArtifactNode,
  resolution: RepairLineageResolution,
): ProjectedStep {
  const { lineage, repairWorkCard, repairReport } = resolution;
  if (!lineage || !repairWorkCard) {
    return step(
      "architect_disposition_required",
      parentWorkCard.artifact.artifactId,
      [parentReview.artifact.artifactId],
      `${projectId}/${phaseId}/candidate_disposition/${parentWorkCard.artifact.workCardId ?? "unknown"}`,
      [parentWorkCard, parentReport, parentReview],
      parentWorkCard,
      resolution.blockers,
    );
  }
  if (!repairReport) {
    return step(
      "implementer_execution_required",
      repairWorkCard.artifact.artifactId,
      [repairWorkCard.artifact.artifactId],
      lineage.repairImplementerReportArtifactId,
      [parentWorkCard, parentReport, parentReview, repairWorkCard],
      repairWorkCard,
      resolution.blockers,
    );
  }
  const combinedSources = [
    parentReport.artifact.artifactId,
    repairReport.artifact.artifactId,
    parentReview.artifact.artifactId,
    repairWorkCard.artifact.artifactId,
  ];
  if (!isCombinedParentReview(parentReview, lineage, combinedSources)) {
    return step(
      "architect_review_of_implementer_report_required",
      parentWorkCard.artifact.artifactId,
      combinedSources,
      `${projectId}/${phaseId}/architect_review/${parentWorkCard.artifact.workCardId ?? "unknown"}`,
      [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport],
      parentWorkCard,
      resolution.blockers,
    );
  }
  const reviewData = recordData(parentReview);
  const decision = text(reviewData.decision).toLowerCase();
  const authorized = reviewData.operatorValidationAuthorized === true ||
    decision.includes("ready for operator validation");
  if (!authorized) {
    return step(
      "architect_disposition_required",
      parentWorkCard.artifact.artifactId,
      [parentReview.artifact.artifactId],
      `${projectId}/${phaseId}/candidate_disposition/${parentWorkCard.artifact.workCardId ?? "unknown"}`,
      [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport],
      parentWorkCard,
      resolution.blockers,
    );
  }
  const validations = graph.forWorkCard(
    "validation_report",
    phaseId,
    parentWorkCard.artifact.workCardId ?? "",
  );
  const validationBlockers = validations.length > 1
    ? [lineageBlocker(
        "parent_validation_ambiguous",
        "Multiple parent Validation Reports claim controlling authority.",
        validations.map((node) => node.artifact.artifactId),
      )]
    : [];
  const validation = validations[0] ?? null;
  if (!validation) {
    return step(
      "operator_validation_required",
      parentWorkCard.artifact.artifactId,
      [parentReview.artifact.artifactId],
      `${projectId}/${phaseId}/validation_report/${parentWorkCard.artifact.workCardId ?? "unknown"}`,
      [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport],
      parentWorkCard,
      [...resolution.blockers, ...validationBlockers],
    );
  }
  const result = validationResultFor(validation);
  if (["pass", "passed", "success", "completed"].includes(result)) {
    const dispositions = graph.forWorkCard(
      "candidate_disposition",
      phaseId,
      parentWorkCard.artifact.workCardId ?? "",
    );
    if (dispositions.length === 0) {
      return step(
        "architect_disposition_required",
        parentWorkCard.artifact.artifactId,
        [
          validation.artifact.artifactId,
          parentReview.artifact.artifactId,
          parentWorkCard.artifact.artifactId,
          parentReport.artifact.artifactId,
          repairWorkCard.artifact.artifactId,
          repairReport.artifact.artifactId,
        ],
        `${projectId}/${phaseId}/candidate_disposition/${parentWorkCard.artifact.workCardId ?? "unknown"}`,
        [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport, validation],
        parentWorkCard,
        [...resolution.blockers, ...validationBlockers],
      );
    }
    if (dispositions.length > 1) {
      validationBlockers.push(lineageBlocker(
        "parent_disposition_ambiguous",
        "Multiple parent dispositions claim controlling authority.",
        dispositions.map((node) => node.artifact.artifactId),
      ));
    }
  }
  return step(
    "architect_disposition_required",
    parentWorkCard.artifact.artifactId,
    [
      validation.artifact.artifactId,
      parentReview.artifact.artifactId,
      parentWorkCard.artifact.artifactId,
      parentReport.artifact.artifactId,
      repairWorkCard.artifact.artifactId,
      repairReport.artifact.artifactId,
    ],
    `${projectId}/${phaseId}/candidate_disposition/${parentWorkCard.artifact.workCardId ?? "unknown"}`,
    [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport, validation],
    parentWorkCard,
    [...resolution.blockers, ...validationBlockers],
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
  blockers: WorkflowBlocker[] = [],
): ProjectedStep {
  return {
    actionId,
    targetArtifactId,
    sourceArtifactIds: unique(sourceArtifactIds),
    expectedOutputArtifactId,
    evidenceArtifactIds: unique(evidence.map((node) => node.artifact.artifactId)),
    activeWorkCard,
    blockers,
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
): { status: CandidateResolutionStatus; evidenceArtifactIds: string[]; blockers: WorkflowBlocker[] } {
  const blockers: WorkflowBlocker[] = [];
  const dispositions = graph.forWorkCard("candidate_disposition", phaseId, candidateId);
  if (dispositions.length > 1) {
    blockers.push(lineageBlocker(
      "candidate_disposition_ambiguous",
      `Candidate ${candidateId} has multiple controlling dispositions.`,
      dispositions.map((node) => node.artifact.artifactId),
    ));
  }
  const disposition = dispositions[0];
  const dispositionStatus = text(recordData(disposition).status) as CandidateResolutionStatus;
  if (["carried_forward", "deferred", "cancelled"].includes(dispositionStatus)) {
    return { status: dispositionStatus, evidenceArtifactIds: [disposition.artifact.artifactId], blockers };
  }
  const validations = graph.forWorkCard("validation_report", phaseId, candidateId);
  if (validations.length > 1) {
    blockers.push(lineageBlocker(
      "candidate_validation_ambiguous",
      `Candidate ${candidateId} has multiple controlling Validation Reports.`,
      validations.map((node) => node.artifact.artifactId),
    ));
  }
  const passing = validations.filter((node) => {
    const result = validationResultFor(node);
    return ["pass", "passed", "success", "completed"].includes(result);
  })[0];
  const parentId = `${graph.projectId}/${phaseId}/work_card/${candidateId}`;
  const hasRepair = graph.byType("work_card", phaseId).some(
    (node) => node.artifact.parentArtifactId === parentId && node.artifact.workCardId?.match(/-REPAIR\d+$/i),
  );
  if (dispositionStatus === "completed_via_repair") {
    if (!passing || !hasRepair) {
      blockers.push(lineageBlocker(
        "completed_via_repair_evidence_missing",
        `Candidate ${candidateId} cannot resolve completed_via_repair without a parent Validation Report pass and a valid repair lineage.`,
        [disposition.artifact.artifactId, ...(passing ? [passing.artifact.artifactId] : [])],
      ));
      return { status: "unresolved", evidenceArtifactIds: [], blockers };
    }
    const repairWorkCard = graph.byType("work_card", phaseId).find(
      (node) => node.artifact.parentArtifactId === parentId && node.artifact.workCardId?.match(/-REPAIR\d+$/i),
    );
    const repairReportId = repairWorkCard
      ? text(recordData(repairWorkCard).controllingRepairReportArtifactId) ||
        exactExpectedOutput(repairWorkCard, "implementer_report")
      : null;
    const requiredEvidenceIds = [
      parentId,
      `${graph.projectId}/${phaseId}/implementer_report/${candidateId}`,
      `${graph.projectId}/${phaseId}/architect_review/${candidateId}`,
      repairWorkCard?.artifact.artifactId,
      repairReportId,
      passing.artifact.artifactId,
    ].filter((value): value is string => Boolean(value));
    const missingEvidence = requiredEvidenceIds.filter(
      (artifactId) => !disposition.artifact.relationships.sources.includes(artifactId),
    );
    if (missingEvidence.length > 0) {
      blockers.push(lineageBlocker(
        "completed_via_repair_evidence_missing",
        `Candidate ${candidateId} disposition omits required parent or repair evidence.`,
        [disposition.artifact.artifactId, ...missingEvidence],
      ));
      return { status: "unresolved", evidenceArtifactIds: [], blockers };
    }
    return {
      status: "completed_via_repair",
      evidenceArtifactIds: [passing.artifact.artifactId, disposition.artifact.artifactId],
      blockers,
    };
  }
  if (passing && !hasRepair) {
    return { status: "completed", evidenceArtifactIds: [passing.artifact.artifactId], blockers };
  }
  return { status: "unresolved", evidenceArtifactIds: [], blockers };
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

function isCombinedParentReview(
  review: VerifiedArtifactNode,
  lineage: RepairLineageProjection,
  requiredSources: string[],
): boolean {
  const data = recordData(review);
  const scope = text(data.reviewScope);
  return (
    review.artifact.revision > lineage.authorizingArchitectReviewRevision &&
    (scope === "combined_parent_and_final_repair" || data.combinedParentReview === true) &&
    text(data.repairedParentWorkCardArtifactId) === lineage.repairedParentWorkCardArtifactId &&
    text(data.repairWorkCardArtifactId) === lineage.repairWorkCardArtifactId &&
    text(data.authorizingArchitectReviewArtifactId) === lineage.authorizingArchitectReviewArtifactId &&
    requiredSources
      .filter((artifactId) => artifactId !== review.artifact.artifactId)
      .every((artifactId) => review.artifact.relationships.sources.includes(artifactId))
  );
}

function numericRepairLimit(workCard: VerifiedArtifactNode): number | null {
  const data = recordData(workCard);
  for (const value of [data.maxRepairCount, data.maximumRepairCount, data.repairLimit]) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  }
  return null;
}

function lineageBlocker(code: WorkflowBlocker["code"], message: string, artifactIds: string[]): WorkflowBlocker {
  return {
    code,
    message,
    ownerRole: "architect",
    artifactIds: unique(artifactIds),
    blocking: true,
  };
}

function repairLineageForStep(
  graph: VerifiedArtifactGraph,
  stepValue: ProjectedStep,
): RepairLineageProjection | null {
  const parent = stepValue.evidenceArtifactIds
    .map((artifactId) => graph.controlling(artifactId))
    .find((node) => node?.artifact.artifactType === "work_card" && !node.artifact.workCardId?.match(/-REPAIR\d+$/i));
  if (!parent) return null;
  const parentReport = graph.controlling(
    `${parent.artifact.projectId}/${parent.artifact.phaseId}/implementer_report/${parent.artifact.workCardId}`,
  );
  const parentReview = graph.controlling(
    `${parent.artifact.projectId}/${parent.artifact.phaseId}/architect_review/${parent.artifact.workCardId}`,
  );
  if (!parentReport || !parentReview || !parent.artifact.phaseId) return null;
  return resolveRepairLineage(
    parent.artifact.projectId,
    parent.artifact.phaseId,
    graph,
    parent,
    parentReport,
    parentReview,
  ).lineage;
}

function repairLimitReached(workCard: VerifiedArtifactNode): boolean {
  const data = recordData(workCard);
  if (data.finalNumberedRepair === true) return true;
  const workCardId = workCard.artifact.workCardId ?? "";
  const currentRepairNumber = Number(workCardId.match(/-REPAIR(\d+)$/i)?.[1] ?? 0);
  const maximum = numericRepairLimit(workCard);
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

function validationResultFor(node: VerifiedArtifactNode): string {
  const data = recordData(node);
  return (
    text(data.result) ||
    text(data.validationResult) ||
    text(data.status)
  ).toLowerCase();
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
