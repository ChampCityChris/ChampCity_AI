import {
  getWorkflowActionCatalogEntry,
  type WorkflowActionId,
  type WorkflowActionCatalogEntry,
} from "./workflowActionCatalog";
import {
  actionIdentityFromCatalog,
  uniqueNonEmpty,
  workflowBlocker,
  type WorkflowArtifactState,
  type WorkflowCandidateIdentity,
  type WorkflowCurrentActionIdentity,
  type WorkflowDomain,
  type WorkflowImplementerAssignment,
  type WorkflowKernelResult,
  type WorkflowReplacementIdentity,
  type WorkflowWorkCardKind,
} from "./workflowDomain";
import type { WorkflowBlocker } from "./workflowContracts";

const terminalCandidateStatuses = new Set<WorkflowCandidateIdentity["resolutionStatus"]>([
  "completed",
  "completed_via_repair",
  "superseded_by_replacement_candidate",
  "carried_forward",
  "deferred",
  "cancelled",
]);

export function resolveWorkflowKernel(
  domain: WorkflowDomain,
  stateRevision: number,
): WorkflowKernelResult {
  if (domain.blockers.length > 0) {
    return {
      kind: "blocked",
      action: null,
      assignment: null,
      blockers: copyBlockers(domain.blockers),
    };
  }

  if (!domain.activePhaseId || !domain.planArtifactId) {
    return blocked(
      null,
      workflowBlocker(
        "missing_authority",
        "The normalized workflow domain does not contain one active phase with an approved Work Card Plan.",
        "application",
        [],
      ),
    );
  }

  const phaseApproval = exactPhasePlanApproval(domain);
  if (phaseApproval?.decision === "revision_requested" || phaseApproval?.decision === "rejected") {
    const action = actionFor("phase_mapping_required", {
      domain,
      stateRevision,
      targetArtifactId: domain.planArtifactId,
      targetWorkCardArtifactId: null,
      sourceArtifactIds: [phaseApproval.artifactId, domain.planArtifactId],
      expectedOutputArtifactId: domain.planArtifactId,
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, unknownActionBlocker("phase_mapping_required", [phaseApproval.artifactId]));
  }

  if (!phaseApproval?.phaseProgressionAuthorized) {
    const plan = domain.planArtifactId ? domain.artifacts.get(domain.planArtifactId) ?? null : null;
    const action = actionFor("operator_phase_approval_required", {
      domain,
      stateRevision,
      targetArtifactId: domain.planArtifactId,
      targetWorkCardArtifactId: null,
      sourceArtifactIds: domain.planArtifactId ? [domain.planArtifactId] : [],
      expectedOutputArtifactId: plan ? exactExpectedOutput(plan, "operator_approval") : null,
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, workflowBlocker(
          "missing_expected_output_binding",
          "The active Work Card Plan is missing an exact Operator Approval output.",
          "operator",
          domain.planArtifactId ? [domain.planArtifactId] : [],
        ));
  }

  const activeCandidate = nextExecutableCandidate(domain);
  if (!activeCandidate) {
    const closeout = actionFor("phase_closeout_required", {
      domain,
      stateRevision,
      targetArtifactId: domain.planArtifactId,
      targetWorkCardArtifactId: null,
      sourceArtifactIds: domain.candidates.flatMap((candidate) =>
        candidate.workCardArtifactId ? [candidate.workCardArtifactId] : [],
      ),
      expectedOutputArtifactId: exactPhaseCloseoutOutput(domain),
    });
    return closeout
      ? { kind: "current_action", action: closeout, assignment: null, blockers: [] }
      : blocked(null, workflowBlocker(
          "missing_expected_output_binding",
          "Phase closeout cannot proceed without an exact expected phase closeout output.",
          "architect",
          domain.planArtifactId ? [domain.planArtifactId] : [],
        ));
  }

  const workCard = activeCandidate.workCardArtifactId
    ? domain.artifacts.get(activeCandidate.workCardArtifactId) ?? null
    : null;
  if (!workCard) {
    return blocked(
      actionFor("work_card_authoring_required", {
        domain,
        stateRevision,
        targetArtifactId: domain.planArtifactId,
        targetWorkCardArtifactId: null,
        sourceArtifactIds: [domain.planArtifactId],
        expectedOutputArtifactId: activeCandidate.rootCandidateArtifactId,
      }),
      workflowBlocker(
        "missing_authority",
        "The active plan candidate does not have an exact controlling Work Card artifact.",
        "architect",
        [domain.planArtifactId, activeCandidate.rootCandidateArtifactId],
      ),
    );
  }

  const reportId = activeCandidate.expectedImplementerReportArtifactId;
  if (!reportId) {
    return blocked(
      null,
      workflowBlocker(
        "missing_expected_output_binding",
        "The active Work Card does not declare an exact Implementer Report output.",
        "architect",
        [workCard.artifactId],
      ),
    );
  }

  const approval = exactImplementationApproval(domain, workCard, reportId);
  if (approval?.decision === "revision_requested") {
    const action = actionFor("work_card_authoring_required", {
      domain,
      stateRevision,
      targetArtifactId: workCard.artifactId,
      targetWorkCardArtifactId: workCard.artifactId,
      sourceArtifactIds: [workCard.artifactId, approval.artifactId],
      expectedOutputArtifactId: workCard.artifactId,
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, unknownActionBlocker("work_card_authoring_required", [workCard.artifactId]));
  }
  if (approval?.decision === "rejected") {
    const action = workCardRejectionAction(domain, stateRevision, workCard, approval.artifactId);
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(
          null,
          workflowBlocker(
            "missing_expected_output_binding",
            "A rejected Work Card approval requires an exact Candidate Disposition output.",
            "operator",
            [workCard.artifactId, approval.artifactId],
          ),
        );
  }

  if (!approval?.implementationAuthorized) {
    const action = actionFor("operator_work_card_approval_required", {
      domain,
      stateRevision,
      targetArtifactId: workCard.artifactId,
      targetWorkCardArtifactId: workCard.artifactId,
      sourceArtifactIds: [workCard.artifactId, ...approvalSourcesFor(domain, workCard.artifactId)],
      expectedOutputArtifactId: expectedWorkCardApprovalId(domain, workCard),
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, unknownActionBlocker("operator_work_card_approval_required", [workCard.artifactId]));
  }

  const report = domain.artifacts.get(reportId) ?? null;
  if (!report) {
    const action = actionFor("implementer_execution_required", {
      domain,
      stateRevision,
      targetArtifactId: workCard.artifactId,
      targetWorkCardArtifactId: workCard.artifactId,
      sourceArtifactIds: [workCard.artifactId, ...approvalSourcesFor(domain, workCard.artifactId)],
      expectedOutputArtifactId: reportId,
    });
    if (!action) {
      return blocked(null, unknownActionBlocker("implementer_execution_required", [workCard.artifactId]));
    }
    return {
      kind: "current_action",
      action,
      assignment: implementerAssignment(domain, activeCandidate, action, approval.artifactId),
      blockers: [],
    };
  }

  const reviewId = exactExpectedOutput(report, "architect_review");
  if (!reviewId) {
    return blocked(
      null,
      workflowBlocker(
        "missing_expected_output_binding",
        "The Implementer Report does not declare an exact Architect Review output.",
        "architect",
        [report.artifactId],
      ),
    );
  }
  const review = domain.artifacts.get(reviewId) ?? null;
  if (!review) {
    const action = actionFor("architect_review_of_implementer_report_required", {
      domain,
      stateRevision,
      targetArtifactId: workCard.artifactId,
      targetWorkCardArtifactId: workCard.artifactId,
      sourceArtifactIds: [report.artifactId],
      expectedOutputArtifactId: reviewId,
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, unknownActionBlocker("architect_review_of_implementer_report_required", [report.artifactId]));
  }

  const repairWorkCardId = exactExpectedOutput(review, "work_card");
  if (repairWorkCardId) {
    const repairWorkCard = domain.artifacts.get(repairWorkCardId) ?? null;
    if (!repairWorkCard) {
      const action = actionFor("repair_work_card_required", {
        domain,
        stateRevision,
        targetArtifactId: workCard.artifactId,
        targetWorkCardArtifactId: workCard.artifactId,
        sourceArtifactIds: [review.artifactId],
        expectedOutputArtifactId: repairWorkCardId,
      });
      return action
        ? { kind: "current_action", action, assignment: null, blockers: [] }
        : blocked(null, unknownActionBlocker("repair_work_card_required", [review.artifactId]));
    }
    const repairReportId = exactExpectedOutput(repairWorkCard, "implementer_report");
    if (!repairReportId) {
      return blocked(
        null,
        workflowBlocker(
          "missing_expected_output_binding",
          "The repair Work Card does not declare an exact Implementer Report output.",
          "architect",
          [repairWorkCard.artifactId],
        ),
      );
    }
    const repairApproval = exactImplementationApproval(domain, repairWorkCard, repairReportId);
    if (repairApproval?.decision === "revision_requested") {
      const action = actionFor("work_card_authoring_required", {
        domain,
        stateRevision,
        targetArtifactId: repairWorkCard.artifactId,
        targetWorkCardArtifactId: repairWorkCard.artifactId,
        sourceArtifactIds: [repairWorkCard.artifactId, repairApproval.artifactId],
        expectedOutputArtifactId: repairWorkCard.artifactId,
      });
      return action
        ? { kind: "current_action", action, assignment: null, blockers: [] }
        : blocked(null, unknownActionBlocker("work_card_authoring_required", [repairWorkCard.artifactId]));
    }
    if (repairApproval?.decision === "rejected") {
      const action = workCardRejectionAction(domain, stateRevision, repairWorkCard, repairApproval.artifactId);
      return action
        ? { kind: "current_action", action, assignment: null, blockers: [] }
        : blocked(
            null,
            workflowBlocker(
              "missing_expected_output_binding",
              "A rejected repair Work Card approval requires an exact Candidate Disposition output.",
              "operator",
              [repairWorkCard.artifactId, repairApproval.artifactId],
            ),
          );
    }
    if (!repairApproval?.implementationAuthorized) {
      const action = actionFor("operator_work_card_approval_required", {
        domain,
        stateRevision,
        targetArtifactId: repairWorkCard.artifactId,
        targetWorkCardArtifactId: repairWorkCard.artifactId,
        sourceArtifactIds: [repairWorkCard.artifactId, ...approvalSourcesFor(domain, repairWorkCard.artifactId)],
        expectedOutputArtifactId: expectedWorkCardApprovalId(domain, repairWorkCard),
      });
      return action
        ? { kind: "current_action", action, assignment: null, blockers: [] }
        : blocked(null, unknownActionBlocker("operator_work_card_approval_required", [repairWorkCard.artifactId]));
    }
    const repairReport = domain.artifacts.get(repairReportId) ?? null;
    if (!repairReport) {
      const action = actionFor("implementer_execution_required", {
        domain,
        stateRevision,
        targetArtifactId: repairWorkCard.artifactId,
        targetWorkCardArtifactId: repairWorkCard.artifactId,
        sourceArtifactIds: [repairWorkCard.artifactId, repairApproval.artifactId, review.artifactId],
        expectedOutputArtifactId: repairReportId,
      });
      return action
        ? { kind: "current_action", action, assignment: null, blockers: [] }
        : blocked(null, unknownActionBlocker("implementer_execution_required", [repairWorkCard.artifactId]));
    }
    const parentReviewId = exactExpectedOutput(repairReport, "architect_review");
    if (!parentReviewId) {
      return blocked(
        null,
        workflowBlocker(
          "missing_expected_output_binding",
          "The repair Implementer Report does not declare an exact Architect Review output.",
          "architect",
          [repairReport.artifactId],
        ),
      );
    }
    const newerParentReview = domain.artifacts.get(parentReviewId) ?? null;
    if (!newerParentReview || newerParentReview.revision <= review.revision) {
      const action = actionFor("architect_review_of_implementer_report_required", {
        domain,
        stateRevision,
        targetArtifactId: workCard.artifactId,
        targetWorkCardArtifactId: workCard.artifactId,
        sourceArtifactIds: uniqueNonEmpty([
          report.artifactId,
          repairReport.artifactId,
          review.artifactId,
          repairWorkCard.artifactId,
        ]),
        expectedOutputArtifactId: parentReviewId,
      });
      return action
        ? { kind: "current_action", action, assignment: null, blockers: [] }
        : blocked(null, unknownActionBlocker("architect_review_of_implementer_report_required", [repairReport.artifactId]));
    }
  }

  const validationId = exactExpectedOutput(review, "operator_validation");
  if (!validationId) {
    return blocked(
      null,
      workflowBlocker(
        "missing_expected_output_binding",
        "The Architect Review does not declare an exact Operator Validation output.",
        "architect",
        [review.artifactId],
      ),
    );
  }
  const validation = domain.artifacts.get(validationId) ?? null;
  if (!validation) {
    const action = actionFor("operator_validation_required", {
      domain,
      stateRevision,
      targetArtifactId: workCard.artifactId,
      targetWorkCardArtifactId: workCard.artifactId,
      sourceArtifactIds: [review.artifactId],
      expectedOutputArtifactId: validationId,
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, unknownActionBlocker("operator_validation_required", [review.artifactId]));
  }

  const dispositionId = exactExpectedOutput(validation, "candidate_disposition");
  if (!dispositionId) {
    return blocked(
      null,
      workflowBlocker(
        "missing_expected_output_binding",
        "The Operator Validation does not declare an exact Candidate Disposition output.",
        "architect",
        [validation.artifactId],
      ),
    );
  }
  const disposition = domain.artifacts.get(dispositionId) ?? null;
  if (!disposition) {
    const action = actionFor("architect_disposition_required", {
      domain,
      stateRevision,
      targetArtifactId: workCard.artifactId,
      targetWorkCardArtifactId: workCard.artifactId,
      sourceArtifactIds: dispositionSourceIds(domain, {
        workCardArtifactId: workCard.artifactId,
        implementerReportArtifactId: report.artifactId,
        architectReviewArtifactId: review.artifactId,
        operatorValidationArtifactId: validation.artifactId,
      }),
      expectedOutputArtifactId: dispositionId,
    });
    return action
      ? { kind: "current_action", action, assignment: null, blockers: [] }
      : blocked(null, unknownActionBlocker("architect_disposition_required", [validation.artifactId]));
  }

  return blocked(
    null,
    workflowBlocker(
      "candidate_unresolved",
      "The active candidate has terminal-looking evidence but no normalized terminal candidate resolution.",
      "architect",
      [activeCandidate.rootCandidateArtifactId, disposition.artifactId],
    ),
  );
}

function workCardRejectionAction(
  domain: WorkflowDomain,
  stateRevision: number,
  workCard: WorkflowArtifactState,
  approvalArtifactId: string,
): WorkflowCurrentActionIdentity | null {
  return actionFor("candidate_disposition_required", {
    domain,
    stateRevision,
    targetArtifactId: workCard.artifactId,
    targetWorkCardArtifactId: workCard.artifactId,
    sourceArtifactIds: [workCard.artifactId, approvalArtifactId],
    expectedOutputArtifactId: exactExpectedOutput(workCard, "candidate_disposition"),
  });
}

function nextExecutableCandidate(domain: WorkflowDomain): WorkflowCandidateIdentity | null {
  const unresolved = domain.candidates.filter(
    (candidate) => !terminalCandidateStatuses.has(candidate.resolutionStatus),
  );
  if (unresolved.length === 0) return null;
  let selected: WorkflowCandidateIdentity | null = null;
  let duplicateSelectedOrder = false;
  for (const candidate of unresolved) {
    if (!selected || candidate.planOrder < selected.planOrder) {
      selected = candidate;
      duplicateSelectedOrder = false;
    } else if (candidate.planOrder === selected.planOrder) {
      duplicateSelectedOrder = true;
    }
  }
  return selected && !duplicateSelectedOrder ? selected : null;
}

function actionFor(
  actionId: WorkflowActionId,
  input: {
    domain: WorkflowDomain;
    stateRevision: number;
    targetArtifactId: string | null;
    targetWorkCardArtifactId: string | null;
    sourceArtifactIds: readonly string[];
    expectedOutputArtifactId: string | null;
  },
): WorkflowCurrentActionIdentity | null {
  const catalogEntry = getWorkflowActionCatalogEntry(actionId);
  if (!catalogEntry || !input.expectedOutputArtifactId) return null;
  return actionIdentityFromCatalog(catalogEntry, {
    projectId: input.domain.project.projectId,
    phaseId: input.domain.activePhaseId,
    targetArtifactId: input.targetArtifactId,
    targetWorkCardArtifactId: input.targetWorkCardArtifactId,
    sourceArtifactIds: input.sourceArtifactIds,
    expectedOutputArtifactId: input.expectedOutputArtifactId,
    stateRevision: input.stateRevision,
  });
}

function implementerAssignment(
  domain: WorkflowDomain,
  candidate: WorkflowCandidateIdentity,
  action: WorkflowCurrentActionIdentity,
  operatorApprovalArtifactId: string,
): WorkflowImplementerAssignment {
  const replacement = replacementFor(domain, candidate.workCardArtifactId);
  const repairMatches = domain.repairs.filter(
    (item) => item.repairWorkCardArtifactId === candidate.workCardArtifactId,
  );
  const repair = onlyValue(repairMatches);
  return {
    repositoryBindingId: domain.project.repositoryBindingId,
    projectId: domain.project.projectId,
    phaseId: candidate.phaseId,
    actionId: "implementer_execution_required",
    targetWorkCardArtifactId: candidate.workCardArtifactId ?? candidate.rootCandidateArtifactId,
    workCardKind: candidate.workCardKind,
    planOrder: candidate.planOrder,
    replacedCandidateArtifactId: replacement?.replacesWorkCardArtifactId ?? null,
    parentWorkCardArtifactId: candidate.parentWorkCardArtifactId,
    priorRepairArtifactId: repair?.priorRepairArtifactId ?? null,
    operatorApprovalArtifactId,
    sourceArtifactIds: uniqueNonEmpty(action.sourceArtifactIds),
    expectedImplementerReportArtifactId: action.expectedOutputArtifactId,
    authorizedProductionSurface: [
      "src/shared/workflow",
      "src/main/workflow",
      "src/main/repository",
      "src/main/workCards/canonicalWorkflowAuthority.ts",
      "src/shared/workCards",
      "src/preload",
      "src/renderer/app",
      "test",
      "scripts",
      "planning/phases/phase-06",
    ],
    stateRevision: action.stateRevision,
  };
}

function replacementFor(
  domain: WorkflowDomain,
  workCardArtifactId: string | null,
): WorkflowReplacementIdentity | null {
  if (!workCardArtifactId) return null;
  const matches = domain.replacements.filter(
    (replacement) => replacement.replacementWorkCardArtifactId === workCardArtifactId,
  );
  return onlyValue(matches);
}

function exactImplementationApproval(
  domain: WorkflowDomain,
  workCard: WorkflowArtifactState,
  expectedReportId: string,
): { artifactId: string; decision: string | null; implementationAuthorized: boolean } | null {
  const approvals = domain.approvals.filter(
    (approval) =>
      approval.approvedArtifactId === workCard.artifactId &&
      approval.approvedRevision === workCard.revision &&
      approval.approvedPayloadHash === workCard.payloadHash &&
      approval.decision === "approved" &&
      approval.implementationAuthorized &&
      approval.expectedOutputArtifactIds.includes(expectedReportId),
  );
  const approval = onlyValue(approvals);
  if (approval) {
    return {
      artifactId: approval.artifactId,
      decision: approval.decision,
      implementationAuthorized: approval.implementationAuthorized,
    };
  }
  const dispositions = domain.approvals.filter(
    (candidate) =>
      candidate.approvedArtifactId === workCard.artifactId &&
      candidate.approvedRevision === workCard.revision &&
      candidate.approvedPayloadHash === workCard.payloadHash &&
      (candidate.decision === "revision_requested" || candidate.decision === "rejected"),
  );
  const disposition = onlyValue(dispositions);
  return disposition
    ? {
        artifactId: disposition.artifactId,
        decision: disposition.decision,
        implementationAuthorized: disposition.implementationAuthorized,
      }
    : null;
}

function exactPhasePlanApproval(domain: WorkflowDomain): {
  artifactId: string;
  decision: string | null;
  phaseProgressionAuthorized: boolean;
} | null {
  if (!domain.planArtifactId) return null;
  const plan = domain.artifacts.get(domain.planArtifactId) ?? null;
  if (!plan) return null;
  const approvals = domain.approvals.filter(
    (approval) =>
      approval.approvedArtifactId === plan.artifactId &&
      approval.approvedRevision === plan.revision &&
      approval.approvedPayloadHash === plan.payloadHash,
  );
  const approval = onlyValue(approvals);
  return approval
    ? {
        artifactId: approval.artifactId,
        decision: approval.decision,
        phaseProgressionAuthorized:
          approval.decision === "approved" && approval.phaseProgressionAuthorized,
      }
    : null;
}

function approvalSourcesFor(domain: WorkflowDomain, workCardArtifactId: string): string[] {
  return domain.approvals
    .filter((approval) => approval.approvedArtifactId === workCardArtifactId)
    .map((approval) => approval.artifactId);
}

function expectedWorkCardApprovalId(
  domain: WorkflowDomain,
  workCard: WorkflowArtifactState,
): string | null {
  if (!workCard.phaseId || !workCard.workCardId) return null;
  return `${domain.project.projectId}/${workCard.phaseId}/operator_approval/${workCard.workCardId}`;
}

function exactExpectedOutput(
  artifact: { expectedOutputArtifactIds: readonly string[] },
  artifactType: string,
): string | null {
  const matches = artifact.expectedOutputArtifactIds.filter((artifactId) =>
    artifactId.includes(`/${artifactType}/`),
  );
  return onlyValue(matches);
}

function exactPhaseCloseoutOutput(domain: WorkflowDomain): string | null {
  const plan = domain.planArtifactId ? domain.artifacts.get(domain.planArtifactId) ?? null : null;
  return plan ? exactExpectedOutput(plan, "phase_closeout") : null;
}

function dispositionSourceIds(
  domain: WorkflowDomain,
  input: {
    workCardArtifactId: string;
    implementerReportArtifactId: string;
    architectReviewArtifactId: string;
    operatorValidationArtifactId: string;
  },
): string[] {
  const review = domain.artifacts.get(input.architectReviewArtifactId) ?? null;
  const reviewSources = review?.sourceArtifactIds ?? [];
  const repairWorkCards = reviewSources.filter((artifactId) =>
    domain.artifacts.get(artifactId)?.artifactType === "work_card" &&
    artifactId !== input.workCardArtifactId,
  );
  const repairReports = reviewSources.filter((artifactId) =>
    domain.artifacts.get(artifactId)?.artifactType === "implementer_report" &&
    artifactId !== input.implementerReportArtifactId,
  );
  return uniqueNonEmpty([
    input.operatorValidationArtifactId,
    input.architectReviewArtifactId,
    input.workCardArtifactId,
    input.implementerReportArtifactId,
    ...repairWorkCards,
    ...repairReports,
  ]);
}

function blocked(
  action: WorkflowCurrentActionIdentity | null,
  blocker: WorkflowBlocker,
): WorkflowKernelResult {
  return {
    kind: "blocked",
    action,
    assignment: null,
    blockers: [blocker],
  };
}

function unknownActionBlocker(actionId: string, artifactIds: readonly string[]): WorkflowBlocker {
  return workflowBlocker(
    "unknown_transition_rule",
    `Workflow action ${actionId} is not present in the executable action catalog.`,
    "application",
    artifactIds,
  );
}

function copyBlockers(blockers: readonly WorkflowBlocker[]): WorkflowBlocker[] {
  return blockers.map((blocker) => ({ ...blocker, artifactIds: [...blocker.artifactIds] }));
}

function onlyValue<T>(values: readonly T[]): T | null {
  if (values.length !== 1) return null;
  let selected: T | null = null;
  for (const value of values) selected = value;
  return selected;
}
