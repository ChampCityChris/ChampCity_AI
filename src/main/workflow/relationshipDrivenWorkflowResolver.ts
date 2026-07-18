import {
  defaultLifecycleActionTemplates,
  createPhaseExecutionState,
  createWorkflowStateIndex,
  materializeActionCatalog,
  projectRoutedAction,
  requireExecutableTransitionRule,
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
  expectedOutputArtifactId: string | null;
  evidenceArtifactIds: string[];
  activeWorkCard: VerifiedArtifactNode | null;
  blockers: WorkflowBlocker[];
}

interface PhaseLifecycleSelection {
  phaseId: string | null;
  evidenceArtifactIds: string[];
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

export interface RelationshipResolverExpectedOutput {
  artifactId: string;
  artifactType: string;
  jsonPath: string | null;
  markdownPath: string | null;
}

export type RelationshipWorkflowResolverResult =
  | {
      kind: "current_action";
      actionId: string;
      role: string;
      targetArtifactId: string | null;
      sourceArtifactIds: string[];
      expectedOutput: RelationshipResolverExpectedOutput;
      blockers: [];
      routeHint: string;
      screenHint: string;
    }
  | {
      kind: "blocked";
      actionId: string;
      role: string;
      targetArtifactId: string | null;
      sourceArtifactIds: string[];
      expectedOutput: RelationshipResolverExpectedOutput | null;
      blockers: WorkflowBlocker[];
      routeHint: string;
      screenHint: string;
    };

export interface RelationshipWorkflowProjection {
  state: WorkflowStateIndex;
  graph: VerifiedArtifactGraph;
  evidenceArtifactIds: string[];
  repairLineage: RepairLineageProjection | null;
  resolverResult: RelationshipWorkflowResolverResult;
}

export class RelationshipDrivenWorkflowResolver {
  resolve(
    project: ConfiguredProject,
    graph: VerifiedArtifactGraph,
    projectionRevision: number,
  ): RelationshipWorkflowProjection {
    const lifecycle = selectPhaseLifecycle(graph);
    const activePhaseId = lifecycle.phaseId;
    const plan = activePhaseId
      ? selectSingle(graph.byType("work_card_plan", activePhaseId))
      : null;
    const candidates = readCandidates(plan);
    const candidateResults = candidates.map((candidate) => {
      const workCard = activePhaseId
        ? selectSingle(graph.forWorkCard("work_card", activePhaseId, candidate.id))
        : null;
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
    const bindings = buildBindings(step);
    const actions = materializeActionCatalog(defaultLifecycleActionTemplates, bindings);
    const createdAt = graph.scannedAt;
    const state = createWorkflowStateIndex({
      workflowStateArtifactId: `${project.projectId}/system/relationship_resolver`,
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
    const evidenceArtifactIds = unique([
      ...lifecycle.evidenceArtifactIds,
      ...step.evidenceArtifactIds,
    ]);
    const blockers = [
      ...toWorkflowBlockers(graph),
      ...lifecycle.blockers,
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
      kind: "relationship_resolver",
      workflowStateArtifactId: state.workflowStateArtifactId,
      stateRevision: state.stateRevision,
      projectId: project.projectId,
      evidenceArtifactIds,
    };
    state.currentActionId = step.actionId;
    state.currentStage = activeRecord.stage;
    state.responsibleRole = activeRecord.role;
    state.authoritativeTargetArtifactId = activeRecord.targetArtifactId;
    state.requiredSourceArtifactIds = [...activeRecord.sourceArtifactIds];
    state.expectedOutput = { ...activeRecord.expectedOutput };
    state.routes = { ...activeRecord.routes };
    const resolverResult = buildResolverResult(graph, activeRecord, blockers);
    return {
      state,
      graph,
      evidenceArtifactIds,
      repairLineage: repairLineageForStep(graph, step),
      resolverResult,
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
      ? step(
          "project_interview_required",
          intake.artifact.artifactId,
          [intake.artifact.artifactId],
          exactExpectedOutput(intake, "architect_interview"),
          [intake],
          null,
        )
      : step("project_intake_required", null, [], null, [], null);
  }
  const phaseApproval = first(
    scopedOperatorApprovals(graph, phaseId, "phase_work_card_plan"),
  );
  if (!plan || !phaseApproval) {
    const sources = graph.byType("phase_planning", phaseId);
    const source = plan ?? sources[0] ?? null;
    const actionId = phaseApproval ? "work_card_authoring_required" : "operator_phase_approval_required";
    return step(
      actionId,
      source?.artifact.artifactId ?? null,
      unique(sources.map((node) => node.artifact.artifactId)),
      source ? exactExpectedOutput(source, expectedOutputTypeForAction(actionId)) : null,
      [...sources, ...(plan ? [plan] : [])],
      null,
    );
  }
  if (!baseWorkCard) {
    return step(
      "work_card_authoring_required",
      plan.artifact.artifactId,
      [phaseApproval.artifact.artifactId, plan.artifact.artifactId],
      candidateId ? exactExpectedOutput(plan, "work_card", candidateId) : null,
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
      exactExpectedOutput(workCard, "candidate_disposition"),
      [workCard],
      workCard,
    );
  }
  visited.add(workCard.artifact.artifactId);
  const expectedReportId = exactExpectedOutput(workCard, "implementer_report");
  const report = expectedReportId ? activeEvidence(graph.controlling(expectedReportId)) : null;
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
  const expectedReviewId = exactExpectedOutput(report, "architect_review");
  const review = expectedReviewId ? activeEvidence(graph.controlling(expectedReviewId)) : null;
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
    const expectedValidationId = exactExpectedOutput(review, "operator_validation");
    const validation = expectedValidationId ? activeEvidence(graph.controlling(expectedValidationId)) : null;
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
    const combinedEvidence = combinedParentReviewEvidence(graph, workCard, report, review);
    if (combinedEvidence.length > 0) {
      return step(
        "architect_disposition_required",
        workCard.artifact.artifactId,
        [
          validation.artifact.artifactId,
          review.artifact.artifactId,
          workCard.artifact.artifactId,
          report.artifact.artifactId,
          ...combinedEvidence.map((node) => node.artifact.artifactId),
        ],
        exactExpectedOutput(validation, "candidate_disposition"),
        [workCard, report, review, validation, ...combinedEvidence],
        workCard,
      );
    }
    const validationResult = validationResultFor(validation);
    const expectedDispositionId = exactExpectedOutput(validation, "candidate_disposition");
    const disposition = expectedDispositionId ? activeEvidence(graph.controlling(expectedDispositionId)) : null;
    if (disposition) {
      return deriveDispositionStep(
        projectId,
        phaseId,
        graph,
        workCard,
        report,
        review,
        validation,
        disposition,
        visited,
      );
    }
    if (["pass", "passed", "success", "completed"].includes(validationResult)) {
      return step(
        "architect_disposition_required",
        workCard.artifact.artifactId,
        [validation.artifact.artifactId],
        expectedDispositionId,
        [workCard, report, review, validation],
        workCard,
      );
    }
    const expectedRepairId = exactExpectedOutput(validation, "work_card");
    if (expectedRepairId) {
      const repair = activeEvidence(graph.controlling(expectedRepairId));
      if (!repair) {
        return step(
          "repair_work_card_required",
          workCard.artifact.artifactId,
          [validation.artifact.artifactId],
          expectedRepairId,
          [workCard, report, review, validation],
          workCard,
        );
      }
      return deriveWorkCardStep(projectId, phaseId, graph, repair, visited);
    }
    return step(
      "architect_disposition_required",
      workCard.artifact.artifactId,
      [validation.artifact.artifactId],
      expectedDispositionId,
      [workCard, report, review, validation],
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
  if (decision.includes("repair")) {
    const expectedRepairId = exactExpectedOutput(review, "work_card");
    const repair = expectedRepairId ? activeEvidence(graph.controlling(expectedRepairId)) : null;
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

function deriveDispositionStep(
  projectId: string,
  phaseId: string,
  graph: VerifiedArtifactGraph,
  parentWorkCard: VerifiedArtifactNode,
  parentReport: VerifiedArtifactNode,
  parentReview: VerifiedArtifactNode,
  validation: VerifiedArtifactNode,
  disposition: VerifiedArtifactNode,
  visited: Set<string>,
): ProjectedStep {
  const dispositionData = recordData(disposition);
  const decision = text(dispositionData.decision).toLowerCase();
  const status = text(dispositionData.status).toLowerCase();
  const authorizesRepair =
    decision === "authorize_repair" ||
    decision.includes("repair") ||
    status === "repair_required";
  if (!authorizesRepair) {
    return step(
      "architect_disposition_required",
      parentWorkCard.artifact.artifactId,
      [validation.artifact.artifactId],
      exactExpectedOutput(validation, "candidate_disposition"),
      [parentWorkCard, parentReport, parentReview, validation, disposition],
      parentWorkCard,
    );
  }

  const expectedRepairId =
    text(dispositionData.authorizedRepairWorkCardArtifactId) ||
    exactExpectedOutput(disposition, "work_card");
  const repair = expectedRepairId ? activeEvidence(graph.controlling(expectedRepairId)) : null;
  const blockers = validateDispositionRepairAuthority(
    parentWorkCard,
    validation,
    disposition,
    repair,
    expectedRepairId,
  );
  if (!repair) {
    return step(
      "repair_work_card_required",
      parentWorkCard.artifact.artifactId,
      [disposition.artifact.artifactId, validation.artifact.artifactId],
      expectedRepairId,
      [parentWorkCard, parentReport, parentReview, validation, disposition],
      parentWorkCard,
      blockers,
    );
  }
  if (blockers.length > 0) {
    return step(
      "architect_disposition_required",
      parentWorkCard.artifact.artifactId,
      [disposition.artifact.artifactId, validation.artifact.artifactId],
      exactExpectedOutput(validation, "candidate_disposition"),
      [parentWorkCard, parentReport, parentReview, validation, disposition, repair],
      parentWorkCard,
      blockers,
    );
  }
  return deriveWorkCardStep(projectId, phaseId, graph, repair, visited);
}

function validateDispositionRepairAuthority(
  parentWorkCard: VerifiedArtifactNode,
  validation: VerifiedArtifactNode,
  disposition: VerifiedArtifactNode,
  repair: VerifiedArtifactNode | null,
  expectedRepairId: string | null,
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];
  const data = recordData(disposition);
  if (!expectedRepairId) {
    blockers.push(lineageBlocker(
      "missing_expected_output_binding",
      "The Architect disposition authorizes repair but does not name the exact expected repair Work Card artifact.",
      [disposition.artifact.artifactId],
    ));
    return blockers;
  }
  if (!disposition.artifact.relationships.expectedOutputs.includes(expectedRepairId)) {
    blockers.push(lineageBlocker(
      "repair_authorization_mismatch",
      "The authorized repair Work Card must be listed as an exact disposition expected output.",
      [disposition.artifact.artifactId, expectedRepairId],
    ));
  }
  if (!disposition.artifact.relationships.sources.includes(validation.artifact.artifactId)) {
    blockers.push(lineageBlocker(
      "repair_authorization_missing",
      "The disposition must cite the validation or observation that triggered the repair.",
      [disposition.artifact.artifactId, validation.artifact.artifactId],
    ));
  }
  if (repair && repair.artifact.parentArtifactId !== parentWorkCard.artifact.artifactId) {
    blockers.push(lineageBlocker(
      "repair_parent_invalid",
      "The repair Work Card must name the exact parent Work Card artifact.",
      [repair.artifact.artifactId, parentWorkCard.artifact.artifactId],
    ));
  }
  if (repair && repair.artifact.artifactId !== expectedRepairId) {
    blockers.push(lineageBlocker(
      "repair_authorization_mismatch",
      "The located repair Work Card does not match the exact disposition expected output.",
      [repair.artifact.artifactId, expectedRepairId],
    ));
  }
  if (repair) {
    const repairData = recordData(repair);
    const sequence = typeof repairData.repairSequence === "number"
      ? repairData.repairSequence
      : typeof data.repairSequence === "number"
        ? data.repairSequence
        : null;
    const priorRepairId = text(repairData.priorRepairWorkCardArtifactId) ||
      text(data.priorRepairWorkCardArtifactId);
    if (sequence !== null && sequence > 1 && !priorRepairId) {
      blockers.push(lineageBlocker(
        "repair_lineage_ambiguous",
        "Sequential repairs after the first must name the previous repair artifact explicitly.",
        [repair.artifact.artifactId],
      ));
    }
    if (sequence !== null && sequence < 1) {
      blockers.push(lineageBlocker(
        "repair_lineage_ambiguous",
        "Repair sequence must be a positive integer.",
        [repair.artifact.artifactId],
      ));
    }
  }
  return blockers;
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
  const dispositionRepairId = authorizedRepairIdFromDispositions(graph, phaseId, parentWorkCard);
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
  const expectedRepairArtifactId =
    dispositionRepairId ||
    (requestedRepairId
      ? `${projectId}/${phaseId}/work_card/${requestedRepairId}`
      : exactExpectedOutput(parentReview, "work_card"));
  const explicitlyAuthorizedRepairs = expectedRepairArtifactId
    ? childRepairs.filter((node) => node.artifact.artifactId === expectedRepairArtifactId)
    : [];
  const unlinkedActiveRepairs = childRepairs.filter((node) => {
    if (expectedRepairArtifactId && node.artifact.artifactId === expectedRepairArtifactId) return false;
    const data = recordData(node);
    return (
      !text(data.authorizingDispositionArtifactId) &&
      !text(data.priorRepairWorkCardArtifactId) &&
      !node.artifact.relationships.sources.some((artifactId) => artifactId.includes("/candidate_disposition/"))
    );
  });
  if (childRepairs.length > 1 && explicitlyAuthorizedRepairs.length !== 1) {
    blockers.push(lineageBlocker(
      "repair_lineage_ambiguous",
      `Parent ${parentId} has multiple repairs, but none is identified by exact active disposition authority.`,
      [parentId, ...childRepairs.map((node) => node.artifact.artifactId)],
    ));
  }
  if (unlinkedActiveRepairs.length > 0) {
    blockers.push(lineageBlocker(
      "repair_lineage_ambiguous",
      "One or more active repair Work Cards are not linked by explicit disposition or prior-repair lineage.",
      unlinkedActiveRepairs.map((node) => node.artifact.artifactId),
    ));
  }
  const repairWorkCard = explicitlyAuthorizedRepairs[0] ?? childRepairs[0] ?? null;
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
  if (
    reviewRequestsRepair &&
    !repairWorkCard.artifact.relationships.sources.includes(parentReview.artifact.artifactId)
  ) {
    blockers.push(lineageBlocker(
      "repair_authorization_missing",
      "The repair Work Card does not cite the parent Architect Review that authorized it.",
      [repairWorkCard.artifact.artifactId, parentReview.artifact.artifactId],
    ));
  }
  const maximumRepairCount = numericRepairLimit(parentWorkCard) ?? Number.POSITIVE_INFINITY;
  const repairNumber = Number(repairId.match(/-REPAIR(\d+)$/i)?.[1] ?? 0);
  const finalNumberedRepair =
    repairData.finalNumberedRepair === true ||
    text(repairData.repairLimit).toLowerCase() === "only_and_final" ||
    (repairNumber > 0 && repairNumber === maximumRepairCount);
  if (repairNumber < 1 || repairNumber > maximumRepairCount) {
    blockers.push(lineageBlocker(
      "repair_limit_invalid",
      `Repair ${repairId} has an invalid repair sequence for parent ${parentId}.`,
      [repairWorkCard.artifact.artifactId, parentId],
    ));
  }
  const explicitSequence = typeof repairData.repairSequence === "number" ? repairData.repairSequence : repairNumber;
  const previousRepairId = text(repairData.priorRepairWorkCardArtifactId);
  if (explicitSequence > 1 && !previousRepairId) {
    blockers.push(lineageBlocker(
      "repair_lineage_ambiguous",
      "Sequential repair lineage must name the previous repair artifact.",
      [repairWorkCard.artifact.artifactId],
    ));
  }
  const physicalReportId =
    text(repairData.controllingRepairReportArtifactId) ||
    exactExpectedOutput(repairWorkCard, "implementer_report");
  const logicalReportId = text(repairData.logicalRepairReportArtifactId) || physicalReportId;
  const repairReport = physicalReportId ? activeEvidence(graph.controlling(physicalReportId)) : null;
  if (repairReport && (
    repairReport.artifact.workCardId !== repairId ||
    repairReport.artifact.parentArtifactId !== parentId ||
    !repairReport.artifact.relationships.sources.includes(repairWorkCard.artifact.artifactId)
  )) {
    blockers.push(lineageBlocker(
      "repair_report_invalid",
      `The controlling repair report does not correspond exactly to ${repairId} and ${parentId}.`,
      [physicalReportId, repairWorkCard.artifact.artifactId, parentId].filter((value): value is string => Boolean(value)),
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
    repairImplementerReportArtifactId: physicalReportId ?? "",
    logicalRepairReportArtifactId: logicalReportId ?? "",
    originalParentImplementerReportArtifactId: parentReport.artifact.artifactId,
    authorizingArchitectReviewArtifactId: parentReview.artifact.artifactId,
    authorizingArchitectReviewRevision: authorizingRevision,
    finalNumberedRepair,
    maximumRepairCount: Number.isFinite(maximumRepairCount) ? maximumRepairCount : repairNumber,
    finalParentAcceptanceTargetArtifactId: parentId,
  };
  return { detected: true, lineage, repairWorkCard, repairReport, blockers };
}

function authorizedRepairIdFromDispositions(
  graph: VerifiedArtifactGraph,
  phaseId: string,
  parentWorkCard: VerifiedArtifactNode,
): string | null {
  const dispositions = graph.forWorkCard(
    "candidate_disposition",
    phaseId,
    parentWorkCard.artifact.workCardId ?? "",
  );
  const repairIds = dispositions
    .map((disposition) => {
      const data = recordData(disposition);
      return text(data.authorizedRepairWorkCardArtifactId) ||
        exactExpectedOutput(disposition, "work_card");
    })
    .filter((value): value is string => Boolean(value));
  return repairIds.length === 1 ? repairIds[0] : null;
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
      exactExpectedOutput(parentReview, "candidate_disposition"),
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
      exactExpectedOutput(repairReport, "architect_review") ?? exactExpectedOutput(parentReport, "architect_review"),
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
      exactExpectedOutput(parentReview, "candidate_disposition"),
      [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport],
      parentWorkCard,
      resolution.blockers,
    );
  }
  const validations = graph.forWorkCard(
    "operator_validation",
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
      exactExpectedOutput(parentReview, "operator_validation"),
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
        exactExpectedOutput(validation, "candidate_disposition"),
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
    exactExpectedOutput(validation, "candidate_disposition"),
    [parentWorkCard, parentReport, parentReview, repairWorkCard, repairReport, validation],
    parentWorkCard,
    [...resolution.blockers, ...validationBlockers],
  );
}

function buildBindings(active: ProjectedStep): Record<string, WorkflowActionBinding> {
  const defaults: Record<string, WorkflowActionBinding> = {};
  for (const template of defaultLifecycleActionTemplates) {
    defaults[template.actionId] = {
      targetArtifactId: null,
      sourceArtifactIds: [],
      expectedOutputArtifactId: nonAuthoritativeBlockedOutputId(template.actionId),
    };
  }
  defaults[active.actionId] = binding(
    active.targetArtifactId,
    active.sourceArtifactIds,
    active.expectedOutputArtifactId ?? nonAuthoritativeBlockedOutputId(active.actionId),
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
  expectedOutputArtifactId: string | null,
  evidence: VerifiedArtifactNode[],
  activeWorkCard: VerifiedArtifactNode | null,
  blockers: WorkflowBlocker[] = [],
): ProjectedStep {
  requireExecutableTransitionRule(actionId);
  const expectedOutputBlockers = expectedOutputArtifactId
    ? []
    : [relationshipBlocker(
        "missing_expected_output_binding",
        `Action ${actionId} is blocked because its controlling source artifact does not name an exact expected output.`,
        unique([
          ...(targetArtifactId ? [targetArtifactId] : []),
          ...sourceArtifactIds,
          ...evidence.map((node) => node.artifact.artifactId),
        ]),
      )];
  return {
    actionId,
    targetArtifactId,
    sourceArtifactIds: unique(sourceArtifactIds),
    expectedOutputArtifactId,
    evidenceArtifactIds: unique(evidence.map((node) => node.artifact.artifactId)),
    activeWorkCard,
    blockers: [...blockers, ...expectedOutputBlockers],
  };
}

function selectPhaseLifecycle(graph: VerifiedArtifactGraph): PhaseLifecycleSelection {
  const closeoutsByPhase = new Map<string, VerifiedArtifactNode[]>();
  for (const closeout of graph.byType("phase_closeout")) {
    const phaseId = closeout.artifact.phaseId;
    if (!phaseId) continue;
    closeoutsByPhase.set(phaseId, [...(closeoutsByPhase.get(phaseId) ?? []), closeout]);
  }
  const activations = graph.byType("phase_activation").filter((node) => {
    const status = text(recordData(node).status).toLowerCase();
    return (
      node.artifact.status === "active" &&
      (!status || status === "active" || status === "active_for_planning")
    );
  });
  const invalidLifecycleArtifactIds = invalidLifecycleIds(graph);
  const invalidLifecyclePhaseIds = unique(
    invalidLifecycleArtifactIds
      .map(lifecyclePhaseIdFromArtifactId)
      .filter((value): value is string => Boolean(value)),
  );
  const lifecycleEvidenceIds = unique([
    ...activations.map((node) => node.artifact.artifactId),
    ...[...closeoutsByPhase.values()].flat().map((node) => node.artifact.artifactId),
    ...invalidLifecycleArtifactIds,
  ]);
  const blockers: WorkflowBlocker[] = [];
  const phaseIds = unique(
    activations.map((node) => node.artifact.phaseId).filter((value): value is string => Boolean(value)),
  );
  if (phaseIds.length === 0) {
    if (invalidLifecyclePhaseIds.length > 0) {
      blockers.push(invalidLifecycleBlocker(invalidLifecycleArtifactIds));
      return {
        phaseId: latestPhaseId(invalidLifecyclePhaseIds),
        evidenceArtifactIds: lifecycleEvidenceIds,
        blockers,
      };
    }
    const plans = graph.byType("work_card_plan").filter(
      (plan) => !plan.artifact.phaseId || !closeoutsByPhase.has(plan.artifact.phaseId),
    );
    return {
      phaseId: plans.length === 1 ? plans[0].artifact.phaseId ?? null : null,
      evidenceArtifactIds: lifecycleEvidenceIds,
      blockers,
    };
  }

  for (const phaseId of phaseIds) {
    const matches = activations.filter((node) => node.artifact.phaseId === phaseId);
    if (matches.length > 1) {
      blockers.push(relationshipBlocker(
        "duplicate_active_authority",
        `Phase ${phaseId} has multiple controlling activation artifacts. Resolve the duplicate lifecycle evidence before continuing.`,
        matches.map((node) => node.artifact.artifactId),
      ));
    }
  }

  const retiredClosedPhaseIds = new Set<string>();
  for (const [closedPhaseId, closeouts] of closeoutsByPhase) {
    const laterActivations = activations.filter((activation) => {
      const activationPhaseId = activation.artifact.phaseId;
      if (!activationPhaseId || activationPhaseId === closedPhaseId) return false;
      return (
        comparePhaseIds(closedPhaseId, activationPhaseId) < 0 ||
        closeouts.some((closeout) =>
          closeout.artifact.relationships.expectedOutputs.includes(activation.artifact.artifactId) ||
          activation.artifact.relationships.sources.includes(closeout.artifact.artifactId),
        )
      );
    });
    if (laterActivations.length > 0) retiredClosedPhaseIds.add(closedPhaseId);
  }

  const liveActivations = activations.filter(
    (activation) => !activation.artifact.phaseId || !retiredClosedPhaseIds.has(activation.artifact.phaseId),
  );
  const livePhaseIds = unique(
    liveActivations.map((node) => node.artifact.phaseId).filter((value): value is string => Boolean(value)),
  );
  if (livePhaseIds.length === 0) {
    blockers.push(relationshipBlocker(
      "ambiguous_current_action",
      "All active phase activations belong to phases that already have controlling closeout evidence. A later active phase activation is required before routing the current action.",
      lifecycleEvidenceIds,
    ));
    return applyInvalidLifecycleBlocker(
      latestPhaseId(phaseIds),
      invalidLifecyclePhaseIds,
      invalidLifecycleArtifactIds,
      lifecycleEvidenceIds,
      blockers,
    );
  }

  const sourcedByLater = new Set<string>();
  for (const activation of liveActivations) {
    for (const sourceId of activation.artifact.relationships.sources) {
      const source = graph.controlling(sourceId);
      if (source?.artifact.phaseId && source.artifact.phaseId !== activation.artifact.phaseId) {
        sourcedByLater.add(source.artifact.phaseId);
      }
    }
    for (const [closedPhaseId, closeouts] of closeoutsByPhase) {
      if (
        activation.artifact.phaseId !== closedPhaseId &&
        closeouts.some((closeout) => closeout.artifact.relationships.expectedOutputs.includes(activation.artifact.artifactId))
      ) {
        sourcedByLater.add(closedPhaseId);
      }
    }
  }
  const terminal = livePhaseIds.filter((phaseId) => !sourcedByLater.has(phaseId));
  if (terminal.length === 1) {
    return applyInvalidLifecycleBlocker(
      terminal[0],
      invalidLifecyclePhaseIds,
      invalidLifecycleArtifactIds,
      lifecycleEvidenceIds,
      blockers,
    );
  }
  const candidates = terminal.length > 0 ? terminal : livePhaseIds;
  blockers.push(relationshipBlocker(
    "ambiguous_current_action",
    `Conflicting phase lifecycle evidence leaves ${candidates.length} possible active phases: ${candidates.join(", ")}. Resolve the activation/closeout chain before continuing.`,
    lifecycleEvidenceIds,
  ));
  return applyInvalidLifecycleBlocker(
    latestPhaseId(candidates),
    invalidLifecyclePhaseIds,
    invalidLifecycleArtifactIds,
    lifecycleEvidenceIds,
    blockers,
  );
}

function applyInvalidLifecycleBlocker(
  selectedPhaseId: string | null,
  invalidPhaseIds: string[],
  invalidArtifactIds: string[],
  evidenceArtifactIds: string[],
  blockers: WorkflowBlocker[],
): PhaseLifecycleSelection {
  const latestInvalidPhaseId = latestPhaseId(invalidPhaseIds);
  if (
    latestInvalidPhaseId &&
    (!selectedPhaseId || comparePhaseIds(selectedPhaseId, latestInvalidPhaseId) <= 0)
  ) {
    blockers.push(invalidLifecycleBlocker(invalidArtifactIds));
    return {
      phaseId:
        selectedPhaseId && comparePhaseIds(selectedPhaseId, latestInvalidPhaseId) > 0
          ? selectedPhaseId
          : latestInvalidPhaseId,
      evidenceArtifactIds,
      blockers,
    };
  }
  return { phaseId: selectedPhaseId, evidenceArtifactIds, blockers };
}

function invalidLifecycleIds(graph: VerifiedArtifactGraph): string[] {
  return unique(
    graph.blockers.flatMap((blocker) =>
      blocker.artifactIds.filter((artifactId) => lifecyclePhaseIdFromArtifactId(artifactId)),
    ),
  );
}

function invalidLifecycleBlocker(artifactIds: string[]): WorkflowBlocker {
  return relationshipBlocker(
    "ambiguous_current_action",
    "Later phase lifecycle evidence is present but its canonical pair is invalid or unsynchronized. The app cannot safely route to an older closed-phase plan until the lifecycle artifacts verify.",
    artifactIds,
  );
}

function lifecyclePhaseIdFromArtifactId(artifactId: string): string | null {
  return artifactId.match(/\/(phase-\d+)\/(?:phase_activation|phase_closeout)\//i)?.[1] ?? null;
}

function latestPhaseId(phaseIds: string[]): string | null {
  return [...phaseIds].sort(comparePhaseIds).at(-1) ?? null;
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
  const validations = graph.forWorkCard("operator_validation", phaseId, candidateId);
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
  const parentWorkCard = selectSingle(graph.forWorkCard("work_card", phaseId, candidateId));
  const parentId = parentWorkCard?.artifact.artifactId ?? null;
  const hasRepair = graph.byType("work_card", phaseId).some(
    (node) => parentId !== null && node.artifact.parentArtifactId === parentId && node.artifact.workCardId?.match(/-REPAIR\d+$/i),
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
    const parentReport = selectSingle(graph.forWorkCard("implementer_report", phaseId, candidateId));
    const parentReview = selectSingle(graph.forWorkCard("architect_review", phaseId, candidateId));
    const requiredEvidenceIds = [
      parentId,
      parentReport?.artifact.artifactId,
      parentReview?.artifact.artifactId,
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

function scopedOperatorApprovals(
  graph: VerifiedArtifactGraph,
  phaseId: string,
  scope: string,
): VerifiedArtifactNode[] {
  return graph.byType("operator_approval", phaseId).filter((node) => {
    const data = recordData(node);
    return (
      text(data.approvalScope) === scope ||
      (scope === "phase_work_card_plan" &&
        text(data.approvalScope) === "phase")
    );
  });
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

function exactExpectedOutput(
  node: VerifiedArtifactNode | null,
  artifactType: string,
  logicalId?: string,
): string | null {
  if (!node) return null;
  const expected = node.artifact.relationships.expectedOutputs.filter((artifactId) => {
    if (!artifactId.includes(`/${artifactType}/`)) return false;
    return logicalId ? artifactId.endsWith(`/${logicalId}`) : true;
  });
  return expected.length === 1 ? expected[0] : null;
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

function combinedParentReviewEvidence(
  graph: VerifiedArtifactGraph,
  parentWorkCard: VerifiedArtifactNode,
  parentReport: VerifiedArtifactNode,
  review: VerifiedArtifactNode,
): VerifiedArtifactNode[] {
  const data = recordData(review);
  const scope = text(data.reviewScope);
  if (scope !== "combined_parent_and_final_repair" && data.combinedParentReview !== true) {
    return [];
  }
  if (text(data.repairedParentWorkCardArtifactId) !== parentWorkCard.artifact.artifactId) {
    return [];
  }
  const repairWorkCardId = text(data.repairWorkCardArtifactId);
  const repairWorkCard = repairWorkCardId ? graph.controlling(repairWorkCardId) : null;
  const repairReportId =
    text(data.repairImplementerReportArtifactId) ||
    review.artifact.relationships.sources.find(
      (artifactId) =>
        artifactId.includes("/implementer_report/") &&
        artifactId !== parentReport.artifact.artifactId,
    ) ||
    null;
  const repairReport = repairReportId ? graph.controlling(repairReportId) : null;
  return [repairWorkCard, repairReport].filter(
    (node): node is VerifiedArtifactNode => Boolean(node),
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
  return relationshipBlocker(code, message, artifactIds, "architect");
}

function relationshipBlocker(
  code: WorkflowBlocker["code"],
  message: string,
  artifactIds: string[],
  ownerRole: WorkflowBlocker["ownerRole"] = "application",
): WorkflowBlocker {
  return {
    code,
    message,
    ownerRole,
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
  if (!parent.artifact.phaseId || !parent.artifact.workCardId) return null;
  const parentReport = selectSingle(graph.forWorkCard(
    "implementer_report",
    parent.artifact.phaseId,
    parent.artifact.workCardId,
  ));
  const parentReview = selectSingle(graph.forWorkCard(
    "architect_review",
    parent.artifact.phaseId,
    parent.artifact.workCardId,
  ));
  if (!parentReport || !parentReview) return null;
  return resolveRepairLineage(
    parent.artifact.projectId,
    parent.artifact.phaseId,
    graph,
    parent,
    parentReport,
    parentReview,
  ).lineage;
}

function activeEvidence(node: VerifiedArtifactNode | null): VerifiedArtifactNode | null {
  return node && ["active", "blocked"].includes(node.artifact.status) ? node : null;
}

function toWorkflowBlockers(graph: VerifiedArtifactGraph): WorkflowBlocker[] {
  return graph.blockers.map((blocker) => ({
    code:
      blocker.code === "duplicate_authority"
        ? "duplicate_artifact_id"
      : blocker.code === "incomplete_pair"
          ? "unsynchronized_artifact_pair"
        : blocker.code === "invalid_pair"
            ? blocker.message.toLowerCase().includes("payloadhash") ||
              blocker.message.toLowerCase().includes("payload hash")
              ? "payload_hash_mismatch"
              : "unsynchronized_artifact_pair"
          : "manual_intervention_required",
    message: blocker.message,
    ownerRole: "application",
    artifactIds: [...blocker.artifactIds],
    blocking: true,
  }));
}

function expectedOutputTypeForAction(actionId: string): string {
  return requireExecutableTransitionRule(actionId).expectedOutputArtifactType;
}

function nonAuthoritativeBlockedOutputId(actionId: string): string {
  return `relationship_resolver_blocked/${actionId}`;
}

function buildResolverResult(
  graph: VerifiedArtifactGraph,
  action: WorkflowStateIndex["actionCatalog"][string],
  blockers: WorkflowBlocker[],
): RelationshipWorkflowResolverResult {
  const expected =
    action.expectedOutput.artifactId.startsWith("relationship_resolver_blocked/")
      ? null
      : expectedOutputView(graph, action.expectedOutput.artifactId, action.expectedOutput.artifactType);
  const base = {
    actionId: action.actionId,
    role: action.role,
    targetArtifactId: action.targetArtifactId,
    sourceArtifactIds: [...action.sourceArtifactIds],
    expectedOutput: expected,
    routeHint: action.routes.success ?? action.routes.failure ?? action.routes.repair ?? "",
    screenHint: action.screenId,
  };
  if (blockers.length > 0 || !expected) {
    return {
      ...base,
      kind: "blocked",
      expectedOutput: expected,
      blockers: blockers.length > 0
        ? blockers.map((blocker) => ({ ...blocker, artifactIds: [...blocker.artifactIds] }))
        : [relationshipBlocker(
            "missing_expected_output_binding",
            `Action ${action.actionId} has no exact expected-output binding.`,
            unique([...(action.targetArtifactId ? [action.targetArtifactId] : []), ...action.sourceArtifactIds]),
          )],
    };
  }
  return {
    ...base,
    kind: "current_action",
    expectedOutput: expected,
    blockers: [],
  };
}

function expectedOutputView(
  graph: VerifiedArtifactGraph,
  artifactId: string,
  artifactType: string,
): RelationshipResolverExpectedOutput {
  const existing = graph.controlling(artifactId);
  return {
    artifactId,
    artifactType,
    jsonPath: existing?.jsonPath ?? null,
    markdownPath: existing?.markdownPath ?? null,
  };
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
