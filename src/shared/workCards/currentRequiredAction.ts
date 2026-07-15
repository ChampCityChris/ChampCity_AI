import {
  buildCurrentStepRouteContext,
  type CurrentStepRouteContext,
} from "./currentStepContextInspector";
import type { RoutedActionContract } from "../workflow";

export const lockedWorkflowSteps = [
  "Project Intake",
  "Project Interview",
  "Reconciliation Review",
  "Project Mapping",
  "Operator Project Approval",
  "Phase Mapping",
  "Operator Phase Approval",
  "Work Card Loop",
  "Phase Closeout",
  "Operator Phase Closeout Approval",
  "Roadmap Update",
  "Next Phase Activation",
  "Repeat Phase Mapping / Work Card Loop",
] as const;

export type LockedWorkflowStep = (typeof lockedWorkflowSteps)[number];

export type CurrentRequiredActionRole =
  | "operator"
  | "architect"
  | "implementer"
  | "app_system";

export type CurrentRequiredActionStatus =
  | "available"
  | "blocked"
  | "needs_review"
  | "needs_approval"
  | "needs_validation"
  | "needs_repair"
  | "complete";

export type CurrentRequiredActionWarningSeverity =
  | "info"
  | "warning"
  | "blocking";

export interface CurrentActionArtifactReference {
  path: string;
  role: string;
  status?: string;
  exists?: boolean;
}

export const authoritativeCurrentActionImplementerReportStatus =
  "authoritative_current_action_implementer_report" as const;

export interface CurrentActionMissingArtifact {
  path: string;
  reason: string;
}

export interface CurrentActionExpectedOutput {
  path?: string;
  artifactType: string;
  description: string;
}

export type CurrentActionEvidenceClassificationKind =
  | "accepted_controlling"
  | "present_pending_disposition"
  | "missing_required"
  | "stale_historical_superseded"
  | "duplicate_ambiguous";

export interface CurrentActionEvidenceClassification {
  id: string;
  label: string;
  summary: string;
  classification: CurrentActionEvidenceClassificationKind;
  sourceArtifacts?: CurrentActionArtifactReference[];
}

export interface CurrentActionManualFallback {
  available: boolean;
  instructions: string;
  artifactPath?: string;
}

export interface CurrentRequiredActionWarning {
  code: string;
  message: string;
  severity: CurrentRequiredActionWarningSeverity;
  sourceArtifactPath?: string;
}

export interface CurrentRequiredAction {
  id: string;
  workflowStep: LockedWorkflowStep | string;
  title: string;
  summary: string;
  responsibleRole: CurrentRequiredActionRole;
  phaseId?: string;
  phaseTitle?: string;
  workCardId?: string;
  workCardTitle?: string;
  status: CurrentRequiredActionStatus;
  reason: string;
  sourceArtifacts: CurrentActionArtifactReference[];
  missingArtifacts: CurrentActionMissingArtifact[];
  expectedOutput?: CurrentActionExpectedOutput;
  successRoute?: string;
  failureRoute?: string;
  repairRoute?: string;
  manualFallback?: CurrentActionManualFallback;
  evidenceClassifications?: CurrentActionEvidenceClassification[];
  warnings: CurrentRequiredActionWarning[];
  /** Canonical authority contract; reference navigation cannot mutate it. */
  routedAction?: RoutedActionContract;
}

export interface CurrentActionProjectState {
  projectName?: string;
  projectIntake?: CurrentActionArtifactReference;
  projectInterview?: CurrentActionArtifactReference;
  reconciliationReview?: CurrentActionArtifactReference;
  projectRoadmap?: CurrentActionArtifactReference;
  phaseMap?: CurrentActionArtifactReference;
  operatorProjectApproval?: CurrentActionArtifactReference;
  projectApprovalSatisfiedByPhaseActivation?: boolean;
  roadmapCurrentExecutableWorkCardId?: string;
  isComplete?: boolean;
  blockedReason?: string;
}

export interface CurrentActionWorkCardCandidate {
  workCardId: string;
  title: string;
  order: number;
  status?: string;
  sourceArtifact?: CurrentActionArtifactReference;
}

export interface CurrentActionValidationState {
  result?: string;
  decision?: string;
  architectDispositionPending?: boolean;
  architectDispositionMissing?: boolean;
  legacyOperatorDecision?: string;
  repairRequired?: boolean;
  routeBlocked?: boolean;
  authority?: "single" | "duplicate_ambiguous";
  duplicateCount?: number;
  conflictingResults?: string[];
  sourceArtifacts: CurrentActionArtifactReference[];
}

export interface CurrentActionArchitectReviewState {
  status?: string;
  sourceArtifact: CurrentActionArtifactReference;
}

export interface CurrentActionRepairState {
  repairId?: string;
  title?: string;
  status?: string;
  repairPrompt?: CurrentActionArtifactReference;
  repairWorkCard?: CurrentActionArtifactReference;
  implementerReport?: CurrentActionArtifactReference;
  architectReview?: CurrentActionArchitectReviewState;
  validation?: CurrentActionValidationState;
  triggerArtifacts?: CurrentActionArtifactReference[];
  supersedesRepairIds?: string[];
  routeEvidenceArtifacts?: CurrentActionArtifactReference[];
  evidenceClassifications?: CurrentActionEvidenceClassification[];
  authorityAmbiguous?: boolean;
  authorityAmbiguityReason?: string;
}

export interface CurrentActionWorkCardState {
  workCardId: string;
  title: string;
  phaseId: string;
  status?: string;
  sourceJsonFile?: string;
  sourceMarkdownFile?: string;
  sourceArtifacts: CurrentActionArtifactReference[];
  implementerReport?: CurrentActionArtifactReference;
  architectReview?: CurrentActionArchitectReviewState;
  validation?: CurrentActionValidationState;
  repair?: CurrentActionRepairState;
}

export interface CurrentActionPhaseCloseoutState {
  sourceArtifact?: CurrentActionArtifactReference;
  decision?: string;
  nextPhaseActivationDecision?: string;
  operatorApproved?: boolean;
}

export interface CurrentActionPhaseState {
  phaseId: string;
  phaseTitle: string;
  status?: string;
  sourceArtifacts: CurrentActionArtifactReference[];
  operatorPhaseApproval?: CurrentActionArtifactReference;
  workCardCandidates: CurrentActionWorkCardCandidate[];
  workCards: CurrentActionWorkCardState[];
  closeout?: CurrentActionPhaseCloseoutState;
  roadmapUpdatedAfterCloseout?: boolean;
  nextPhaseActivated?: boolean;
}

export interface CurrentRequiredActionState {
  project: CurrentActionProjectState;
  activePhase?: CurrentActionPhaseState;
  warnings?: CurrentRequiredActionWarning[];
}

export interface CurrentRequiredActionResult {
  ok: boolean;
  currentAction?: CurrentRequiredAction;
  routeContext?: CurrentStepRouteContext;
  workflowSteps: readonly LockedWorkflowStep[];
  errorMessages?: string[];
}

interface CurrentActionTemplate
  extends Omit<
    CurrentRequiredAction,
    "sourceArtifacts" | "missingArtifacts" | "warnings"
  > {
  sourceArtifacts?: CurrentActionArtifactReference[];
  missingArtifacts?: CurrentActionMissingArtifact[];
}

const resolvedCandidateStatuses = new Set([
  "already_satisfied",
  "cancelled",
  "carried_forward",
  "closed",
  "complete",
  "completed",
  "completed_via_repair",
  "deferred",
  "superseded",
  "validated",
]);

const operatorReviewStatuses = new Set([
  "draft",
  "ready_for_operator_review",
  "ready_for_review",
  "work_card_review_required",
]);

const implementerHandoffStatuses = new Set([
  "approved_for_implementer_handoff",
  "implementer_handoff_required",
  "ready_for_handoff",
]);

const implementerReportStatuses = new Set([
  "in_implementer_pass",
  "in_implementer_pass",
  "ready_for_implementer",
  "ready_for_implementer",
]);

const reportReceivedStatuses = new Set([
  "implementer_report_received",
  "implementer_report_received",
  "ready_for_architect_review",
]);

export function evaluateCurrentRequiredAction(
  state: CurrentRequiredActionState,
): CurrentRequiredAction {
  const warnings = state.warnings ?? [];
  const projectSources = getProjectSources(state.project);

  if (state.project.blockedReason) {
    return action(warnings, {
      id: "blocked",
      workflowStep: "Repeat Phase Mapping / Work Card Loop",
      title: "Workflow blocked",
      summary: state.project.blockedReason,
      responsibleRole: "operator",
      status: "blocked",
      reason:
        "The durable project state records a blocker that must be resolved before routing can continue.",
      sourceArtifacts: projectSources,
      missingArtifacts: [],
      manualFallback: {
        available: true,
        instructions:
          "Resolve the blocking project note in durable planning artifacts, then rerun current-action evaluation.",
      },
    });
  }

  if (state.project.isComplete) {
    return action(warnings, {
      id: "project_complete",
      workflowStep: "Repeat Phase Mapping / Work Card Loop",
      title: "No current action",
      summary: "The durable project state indicates that the project is complete.",
      responsibleRole: "app_system",
      status: "complete",
      reason:
        "All mapped phases and project-level workflow states are resolved.",
      sourceArtifacts: projectSources,
      missingArtifacts: [],
    });
  }

  if (!artifactExists(state.project.projectIntake)) {
    return projectArtifactAction(warnings, {
      id: "project_intake_required",
      workflowStep: "Project Intake",
      title: "Project Intake required",
      summary:
        "Capture the project intake before project interview or mapping can proceed.",
      expectedPath:
        "planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md",
      expectedType: "Project Intake",
      missingReason: "No durable Project Intake artifact is available.",
      successRoute: "Project Interview",
    });
  }

  if (!artifactExists(state.project.projectInterview)) {
    return projectArtifactAction(warnings, {
      id: "project_interview_required",
      workflowStep: "Project Interview",
      title: "Project Interview required",
      summary:
        "Complete the Architect project interview after Project Intake.",
      expectedPath:
        "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
      expectedType: "Project Interview",
      missingReason:
        "Project Intake exists, but no durable Project Interview artifact is available.",
      successRoute: "Reconciliation Review",
    });
  }

  if (!artifactExists(state.project.reconciliationReview)) {
    return projectArtifactAction(warnings, {
      id: "reconciliation_review_required",
      workflowStep: "Reconciliation Review",
      title: "Reconciliation Review required",
      summary:
        "Review the repository and durable planning records before project mapping.",
      expectedPath:
        "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i.md",
      expectedType: "Repository Reconciliation",
      missingReason:
        "Project intake/interview artifacts exist, but no reconciliation review is available.",
      successRoute: "Project Mapping",
    });
  }

  if (
    !artifactExists(state.project.projectRoadmap) ||
    !artifactExists(state.project.phaseMap)
  ) {
    return action(warnings, {
      id: "project_mapping_required",
      workflowStep: "Project Mapping",
      title: "Project Mapping required",
      summary:
        "Create or refresh the Roadmap and Phase Map from durable project evidence.",
      responsibleRole: "architect",
      status: "available",
      reason:
        "The locked workflow requires project mapping before phase-level approval and execution.",
      sourceArtifacts: projectSources,
      missingArtifacts: [
        missingIfAbsent(
          state.project.projectRoadmap,
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          "The living Roadmap is required for project mapping.",
        ),
        missingIfAbsent(
          state.project.phaseMap,
          "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
          "The Phase Map is required for phase selection.",
        ),
      ].filter((item): item is CurrentActionMissingArtifact => item !== undefined),
      expectedOutput: {
        artifactType: "Project Roadmap and Phase Map",
        description:
          "Durable Roadmap and Phase Map artifacts that identify the first incomplete phase.",
      },
      successRoute: "Operator Project Approval",
      manualFallback: fallback(
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      ),
    });
  }

  if (
    !artifactExists(state.project.operatorProjectApproval) &&
    !state.project.projectApprovalSatisfiedByPhaseActivation
  ) {
    return action(warnings, {
      id: "operator_project_approval_required",
      workflowStep: "Operator Project Approval",
      title: "Operator Project Approval required",
      summary:
        "The Operator must approve the project map before phase mapping proceeds.",
      responsibleRole: "operator",
      status: "needs_approval",
      reason:
        "Roadmap and Phase Map exist, but no durable Operator project approval or equivalent activation evidence is available.",
      sourceArtifacts: projectSources,
      missingArtifacts: [
        {
          path: "planning/project/OPERATOR_PROJECT_APPROVAL.md",
          reason:
            "A durable project approval or equivalent manual activation record is required.",
        },
      ],
      expectedOutput: {
        path: "planning/project/OPERATOR_PROJECT_APPROVAL.md",
        artifactType: "Operator Project Approval",
        description: "Approval record authorizing phase mapping.",
      },
      successRoute: "Phase Mapping",
      manualFallback: fallback("planning/project/OPERATOR_PROJECT_APPROVAL.md"),
    });
  }

  const phase = state.activePhase;

  if (!phase) {
    return action(warnings, {
      id: "phase_mapping_required",
      workflowStep: "Phase Mapping",
      title: "Phase Mapping required",
      summary:
        "Select and map the first incomplete phase from the approved Roadmap.",
      responsibleRole: "architect",
      status: "available",
      reason:
        "Project mapping is available, but no active phase state was found.",
      sourceArtifacts: projectSources,
      missingArtifacts: [
        {
          path: "planning/phases/<phase-folder>/Phase_Interview.md",
          reason: "Phase Mapping requires a phase interview artifact.",
        },
      ],
      expectedOutput: {
        artifactType: "Phase Mapping bundle",
        description:
          "Phase_Interview.md, Phase_Planning.md, and Work_Card_Plan.md for the selected phase.",
      },
      successRoute: "Operator Phase Approval",
      manualFallback: fallback("planning/phases/<phase-folder>/Phase_Interview.md"),
    });
  }

  const phaseSources = uniqueArtifacts([...projectSources, ...phase.sourceArtifacts]);

  const missingPhaseMapping = phase.sourceArtifacts.filter(
    (artifactRef) => !artifactExists(artifactRef),
  );

  if (missingPhaseMapping.length > 0) {
    return action(warnings, {
      id: "phase_mapping_required",
      workflowStep: "Phase Mapping",
      title: "Phase Mapping required",
      summary:
        "Complete the phase mapping bundle for the active phase.",
      responsibleRole: "architect",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: "available",
      reason:
        "The active phase is known, but one or more phase mapping authority artifacts are missing.",
      sourceArtifacts: phaseSources,
      missingArtifacts: missingPhaseMapping.map((artifactRef) => ({
        path: artifactRef.path,
        reason: `${artifactRef.role} is required for Phase Mapping.`,
      })),
      expectedOutput: {
        artifactType: "Phase Mapping bundle",
        description:
          "Durable phase interview, phase planning, and Work Card candidate plan artifacts.",
      },
      successRoute: "Operator Phase Approval",
      manualFallback: fallback(
        `planning/phases/${phase.phaseId}/Phase_Planning.md`,
      ),
    });
  }

  if (!artifactExists(phase.operatorPhaseApproval)) {
    return action(warnings, {
      id: "operator_phase_approval_required",
      workflowStep: "Operator Phase Approval",
      title: "Operator Phase Approval required",
      summary:
        "The Operator must approve the phase bundle before Work Card execution.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: "needs_approval",
      reason:
        "Phase Mapping artifacts exist, but no Operator Phase Approval record is available.",
      sourceArtifacts: phaseSources,
      missingArtifacts: [
        {
          path: `planning/phases/${phase.phaseId}/Operator_Phase_Approval.md`,
          reason: "Operator Phase Approval is required before Work Cards execute.",
        },
      ],
      expectedOutput: {
        path: `planning/phases/${phase.phaseId}/Operator_Phase_Approval.md`,
        artifactType: "Operator Phase Approval",
        description: "Approval record authorizing just-in-time Work Cards.",
      },
      successRoute: "Work Card Loop",
      manualFallback: fallback(
        `planning/phases/${phase.phaseId}/Operator_Phase_Approval.md`,
      ),
    });
  }

  const workCardAction = evaluateWorkCardLoop(phase, phaseSources, warnings);

  if (workCardAction) {
    return workCardAction;
  }

  if (!phase.closeout?.sourceArtifact) {
    return action(warnings, {
      id: "phase_closeout_required",
      workflowStep: "Phase Closeout",
      title: "Phase Closeout required",
      summary:
        "All mapped Work Card candidates are resolved; create the phase closeout record.",
      responsibleRole: "architect",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: "available",
      reason:
        "Every mapped candidate is completed, repaired, deferred, carried forward, cancelled, or superseded.",
      sourceArtifacts: phaseSources,
      missingArtifacts: [
        {
          path: `planning/phases/${phase.phaseId}/Closeout_Reports/CLOSEOUT_REPORT_${phase.phaseId}_phase_closeout.md`,
          reason: "A durable Phase Closeout record is required.",
        },
      ],
      expectedOutput: {
        path: `planning/phases/${phase.phaseId}/Closeout_Reports/`,
        artifactType: "Phase Closeout",
        description:
          "Closeout report summarizing resolved Work Cards and next-phase readiness.",
      },
      successRoute: "Operator Phase Closeout Approval",
      failureRoute: "Repair sub-card creation if closeout finds unresolved work.",
      manualFallback: fallback(
        `planning/phases/${phase.phaseId}/Closeout_Reports/`,
      ),
    });
  }

  const closeoutSources = uniqueArtifacts([
    ...phaseSources,
    phase.closeout.sourceArtifact,
  ]);

  if (!phase.closeout.operatorApproved) {
    return action(warnings, {
      id: "operator_phase_closeout_approval_required",
      workflowStep: "Operator Phase Closeout Approval",
      title: "Operator Phase Closeout Approval required",
      summary:
        "The Operator must approve closeout before roadmap update and next-phase activation.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: "needs_approval",
      reason:
        "A Phase Closeout record exists, but its Operator approval boundary is not satisfied.",
      sourceArtifacts: closeoutSources,
      missingArtifacts: [
        {
          path: phase.closeout.sourceArtifact.path,
          reason:
            "Closeout record must include an Operator closeout approval decision.",
        },
      ],
      expectedOutput: {
        path: phase.closeout.sourceArtifact.path,
        artifactType: "Operator Phase Closeout Approval",
        description:
          "Closeout approval decision authorizing roadmap update and next-phase activation.",
      },
      successRoute: "Roadmap Update",
      failureRoute: "Return to Work Card Loop or repair if closeout is rejected.",
      manualFallback: fallback(phase.closeout.sourceArtifact.path),
    });
  }

  if (!phase.roadmapUpdatedAfterCloseout) {
    return action(warnings, {
      id: "roadmap_update_required",
      workflowStep: "Roadmap Update",
      title: "Roadmap Update required",
      summary:
        "Update the living Roadmap with closeout results before activating the next phase.",
      responsibleRole: "architect",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: "available",
      reason:
        "Closeout is approved, but the living Roadmap has not been updated for the phase transition.",
      sourceArtifacts: closeoutSources,
      missingArtifacts: [
        {
          path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          reason:
            "Roadmap must reflect closeout result and the next incomplete phase.",
        },
      ],
      expectedOutput: {
        path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
        artifactType: "Roadmap Update",
        description: "Updated living Roadmap after phase closeout.",
      },
      successRoute: "Next Phase Activation",
      manualFallback: fallback(
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      ),
    });
  }

  if (!phase.nextPhaseActivated) {
    return action(warnings, {
      id: "next_phase_activation_required",
      workflowStep: "Next Phase Activation",
      title: "Next Phase Activation required",
      summary:
        "Record the next-phase activation decision and return to phase mapping.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      status: "needs_approval",
      reason:
        "The Roadmap is updated, but durable state has not activated or deferred the next phase.",
      sourceArtifacts: closeoutSources,
      missingArtifacts: [
        {
          path: "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          reason:
            "A next-phase activation, deferral, or no-next-phase decision is required.",
        },
      ],
      expectedOutput: {
        artifactType: "Next Phase Activation",
        description:
          "Operator decision activating the next phase or closing without activation.",
      },
      successRoute: "Repeat Phase Mapping / Work Card Loop",
      failureRoute: "Revise Roadmap first if the next phase is not ready.",
      manualFallback: fallback(
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      ),
    });
  }

  return action(warnings, {
    id: "no_current_action",
    workflowStep: "Repeat Phase Mapping / Work Card Loop",
    title: "No current action",
    summary:
      "The current phase is closed and next-phase activation is resolved.",
    responsibleRole: "app_system",
    phaseId: phase.phaseId,
    phaseTitle: phase.phaseTitle,
    status: "complete",
    reason:
      "Durable phase closeout, roadmap update, and next-phase activation state are complete.",
    sourceArtifacts: closeoutSources,
    missingArtifacts: [],
  });
}

export function buildCurrentRequiredActionResult(
  state: CurrentRequiredActionState,
): CurrentRequiredActionResult {
  try {
    const currentAction = evaluateCurrentRequiredAction(state);

    return {
      ok: true,
      currentAction,
      routeContext: buildCurrentStepRouteContext(state, currentAction),
      workflowSteps: lockedWorkflowSteps,
    };
  } catch (error) {
    return {
      ok: false,
      workflowSteps: lockedWorkflowSteps,
      errorMessages: [
        error instanceof Error
          ? error.message
          : "Current required action evaluation failed.",
      ],
    };
  }
}

function evaluateWorkCardLoop(
  phase: CurrentActionPhaseState,
  phaseSources: CurrentActionArtifactReference[],
  warnings: CurrentRequiredActionWarning[],
): CurrentRequiredAction | undefined {
  const candidates = [...phase.workCardCandidates].sort(
    (left, right) => left.order - right.order,
  );

  const workCardsById = new Map(
    phase.workCards.map((workCard) => [
      normalizeComparable(workCard.workCardId),
      workCard,
    ]),
  );

  for (const candidate of candidates) {
    const workCard = workCardsById.get(normalizeComparable(candidate.workCardId));

    if (isCandidateResolved(candidate, workCard)) {
      continue;
    }

    if (!workCard) {
      const expectedPath = `planning/phases/${phase.phaseId}/Work_Cards/${candidate.workCardId}_${slugifyForPath(candidate.title)}.md`;

      return action(warnings, {
        id: "full_work_card_creation_required",
        workflowStep: "Work Card Loop",
        title: "Full Work Card creation required",
        summary:
          "Create the next just-in-time full Work Card from the mapped candidate.",
        responsibleRole: "architect",
        phaseId: phase.phaseId,
        phaseTitle: phase.phaseTitle,
        workCardId: candidate.workCardId,
        workCardTitle: candidate.title,
        status: "available",
        reason:
          "The approved Work_Card_Plan candidate has no matching full Work Card artifact.",
        sourceArtifacts: uniqueArtifacts([
          ...phaseSources,
          candidate.sourceArtifact,
        ]),
        missingArtifacts: [
          {
            path: expectedPath,
            reason:
              "A full Markdown/JSON Work Card pair is required before Operator review and Implementer handoff.",
          },
        ],
        expectedOutput: {
          path: expectedPath,
          artifactType: "Full Work Card",
          description:
            "Just-in-time executable Work Card created by the Architect.",
        },
        successRoute: "Operator Work Card review",
        failureRoute: "Revise or defer the mapped candidate.",
        manualFallback: fallback(expectedPath),
      });
    }

    return evaluateWorkCardState(phase, workCard, phaseSources, warnings);
  }

  return undefined;
}

function evaluateWorkCardState(
  phase: CurrentActionPhaseState,
  workCard: CurrentActionWorkCardState,
  phaseSources: CurrentActionArtifactReference[],
  warnings: CurrentRequiredActionWarning[],
): CurrentRequiredAction {
  const status = normalizeStatus(workCard.status);
  const workCardSources = uniqueArtifacts([
    ...phaseSources,
    ...workCard.sourceArtifacts,
  ]);

  if (workCard.repair?.authorityAmbiguous) {
    return architectRepairAuthorityAction(
      phase,
      workCard,
      workCardSources,
      warnings,
    );
  }

  if (hasUnresolvedRepairObligation(workCard.repair)) {
    return evaluateRepairRoute(
      phase,
      workCard,
      uniqueArtifacts([
        ...workCardSources,
        workCard.implementerReport,
        workCard.architectReview?.sourceArtifact,
        ...(workCard.validation?.sourceArtifacts ?? []),
      ]),
      warnings,
    );
  }

  if (workCard.validation?.authority === "duplicate_ambiguous") {
    return architectValidationEvidenceAuthorityAction(
      phase,
      workCard.workCardId,
      workCard.title,
      workCard.validation,
      uniqueArtifacts([
        ...workCardSources,
        workCard.implementerReport,
        workCard.architectReview?.sourceArtifact,
        ...workCard.validation.sourceArtifacts,
      ]),
      warnings,
    );
  }

  if (workCard.validation?.architectDispositionPending) {
    return architectValidationDispositionAction(
      phase,
      workCard.workCardId,
      workCard.title,
      workCard.validation,
      uniqueArtifacts([
        ...workCardSources,
        workCard.implementerReport,
        workCard.architectReview?.sourceArtifact,
        ...workCard.validation.sourceArtifacts,
      ]),
      warnings,
    );
  }

  if (isFailingValidation(workCard.validation)) {
    return evaluateRepairRoute(
      phase,
      workCard,
      uniqueArtifacts([
        ...workCardSources,
        workCard.implementerReport,
        workCard.architectReview?.sourceArtifact,
        ...(workCard.validation?.sourceArtifacts ?? []),
      ]),
      warnings,
    );
  }

  if (operatorReviewStatuses.has(status)) {
    return action(warnings, {
      id: "operator_work_card_review_required",
      workflowStep: "Work Card Loop",
      title: "Operator Work Card review required",
      summary:
        "The full Work Card exists and needs Operator review before handoff.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      status: "needs_review",
      reason:
        "Work Card status indicates it is waiting for Operator review.",
      sourceArtifacts: workCardSources,
      missingArtifacts: [],
      expectedOutput: {
        artifactType: "Operator Work Card review decision",
        description:
          "Operator approves, revises, defers, carries forward, or cancels the Work Card.",
      },
      successRoute: "Implementer handoff",
      failureRoute: "Revise the Work Card before handoff.",
      manualFallback: fallback(
        workCard.sourceMarkdownFile ??
          `planning/phases/${phase.phaseId}/Work_Cards/${workCard.workCardId}_${slugifyForPath(workCard.title)}.md`,
      ),
    });
  }

  if (implementerHandoffStatuses.has(status)) {
    return action(warnings, {
      id: "implementer_handoff_required",
      workflowStep: "Work Card Loop",
      title: "Implementer handoff required",
      summary:
        "The reviewed Work Card is ready to be handed to the Implementer.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      status: "available",
      reason:
        "Durable state indicates the Work Card has not yet entered the Implementer pass.",
      sourceArtifacts: workCardSources,
      missingArtifacts: [],
      expectedOutput: {
        artifactType: "Implementer handoff",
        description:
          "The Work Card is provided to the Implementer as the implementation prompt.",
      },
      successRoute: "Implementer Report required",
      manualFallback: fallback(
        workCard.sourceMarkdownFile ??
          `planning/phases/${phase.phaseId}/Work_Cards/${workCard.workCardId}_${slugifyForPath(workCard.title)}.md`,
      ),
    });
  }

  if (!artifactExists(workCard.implementerReport)) {
    const expectedPath = `planning/phases/${phase.phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${workCard.workCardId}_${slugifyForPath(workCard.title)}.md`;

    return action(warnings, {
      id: "implementer_report_required",
      workflowStep: "Work Card Loop",
      title: "Implementer Report required",
      summary:
        "The active Work Card is ready for implementation and needs an Implementer Report.",
      responsibleRole: "implementer",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      status: implementerReportStatuses.has(status) ? "available" : "blocked",
      reason:
        "The Work Card is the Implementer handoff, but no matching Implementer Report is available yet.",
      sourceArtifacts: workCardSources,
      missingArtifacts: [
        {
          path: expectedPath,
          reason:
            "The Architect cannot review implementation until an Implementer Report exists.",
        },
      ],
      expectedOutput: {
        path: expectedPath,
        artifactType: "Implementer Report",
        description:
          "Report with implementation summary, checks, skipped checks, manual validation required, and residual risks.",
      },
      successRoute: "Architect review of Implementer Report",
      failureRoute: "Return to Work Card if implementation is blocked.",
      manualFallback: fallback(expectedPath),
    });
  }

  const reportSources = withAuthoritativeCurrentActionImplementerReport(
    workCardSources,
    workCard.implementerReport,
  );

  const architectReviewIncomplete = isArchitectReviewIncomplete(
    workCard.architectReview,
  );

  if (
    !workCard.architectReview ||
    reportReceivedStatuses.has(status) ||
    architectReviewIncomplete
  ) {
    const expectedPath = `planning/phases/${phase.phaseId}/Architect_Reviews/ARCHITECT_REVIEW_${workCard.workCardId}_${slugifyForPath(workCard.title)}.md`;

    return action(warnings, {
      id: "architect_review_of_implementer_report_required",
      workflowStep: "Work Card Loop",
      title: "Architect review of Implementer Report required",
      summary:
        "The Implementer Report exists and must be reviewed before Operator validation.",
      responsibleRole: "architect",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      status: "needs_review",
      reason:
        architectReviewIncomplete
          ? "The Architect Review uses the standard output shape but is incomplete. A Ready for Operator validation decision requires substantive Operator Validation Steps."
          : "The locked workflow routes Implementer Reports to Architect review before validation.",
      sourceArtifacts: reportSources,
      missingArtifacts: [
        {
          path: expectedPath,
          reason: "Architect review is required before Operator validation.",
        },
      ],
      expectedOutput: {
        path: expectedPath,
        artifactType: "Architect Review",
        description:
          "Standard Architect Review with decision, compliance, evidence assessment, Observation Register impact, Operator Validation Steps, and required repair scope.",
      },
      successRoute: "Operator validation",
      repairRoute: "Repair sub-card creation if Architect review finds defects.",
      manualFallback: fallback(expectedPath),
    });
  }

  const reviewSources = uniqueArtifacts([
    ...reportSources,
    workCard.architectReview.sourceArtifact,
  ]);

  if (architectReviewRequiresRepair(workCard.architectReview)) {
    return evaluateRepairRoute(phase, workCard, reviewSources, warnings);
  }

  const validationNeedsRetry = workCard.validation?.routeBlocked === true;

  if (!workCard.validation || validationNeedsRetry) {
    const expectedPath = `planning/phases/${phase.phaseId}/Validation_Reports/VALIDATION_REPORT_${workCard.workCardId}_${slugifyForPath(workCard.title)}.md`;
    const validationSources = validationNeedsRetry
      ? workCard.validation?.sourceArtifacts ?? []
      : [];

    return action(warnings, {
      id: "operator_validation_required",
      workflowStep: "Work Card Loop",
      title: "Operator validation required",
      summary:
        "The Architect review is ready; the Operator must validate and create a Validation Record.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      status: "needs_validation",
      reason: validationNeedsRetry
        ? "Architect review evidence is ready, but the prior validation attempt was blocked by incorrect current-action routing and did not validate the Work Card."
        : "Architect review evidence exists, but no Operator Validation Report is available.",
      sourceArtifacts: uniqueArtifacts([
        ...reviewSources,
        ...validationSources,
      ]),
      missingArtifacts: [
        {
          path: expectedPath,
          reason: validationNeedsRetry
            ? "A new Operator validation attempt is required because no passing Validation Record exists."
            : "Operator validation creates the durable Validation Record.",
        },
      ],
      expectedOutput: {
        path: expectedPath,
        artifactType: "Operator Validation Record",
        description:
          "Validation report recording pass/fail/partial/blocking outcome.",
      },
      successRoute: "Next Work Card candidate or Phase Closeout",
      repairRoute: "Repair sub-card creation if validation fails.",
      manualFallback: fallback(expectedPath),
    });
  }

  return evaluateRepairRoute(
    phase,
    workCard,
    uniqueArtifacts([
      ...reviewSources,
      ...(workCard.validation?.sourceArtifacts ?? []),
    ]),
    warnings,
  );
}

function evaluateRepairRoute(
  phase: CurrentActionPhaseState,
  workCard: CurrentActionWorkCardState,
  sourceArtifacts: CurrentActionArtifactReference[],
  warnings: CurrentRequiredActionWarning[],
): CurrentRequiredAction {
  const repair = workCard.repair;
  const repairId = repair?.repairId ?? `${workCard.workCardId}-REPAIR01`;
  const repairTitle = repair?.title ?? `Repair: ${workCard.title}`;
  const repairWorkCardPath = `planning/phases/${phase.phaseId}/Work_Cards/${repairId}_${slugifyForPath(repairTitle)}.md`;

  if (!repair?.repairPrompt && !repair?.repairWorkCard) {
    return action(warnings, {
      id: "repair_sub_card_creation_required",
      workflowStep: "Work Card Loop",
      title: "Repair sub-card creation required",
      summary:
        "Validation or review indicates repair is required before the Work Card can be resolved.",
      responsibleRole: "architect",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: workCard.workCardId,
      workCardTitle: workCard.title,
      status: "needs_repair",
      reason:
        "The latest validation/review outcome requires repair and no repair route artifact exists.",
      sourceArtifacts,
      missingArtifacts: [
        {
          path: repairWorkCardPath,
          reason:
            "A WCxx-REPAIRxx sub-card is required for failed validation or repair routing.",
        },
      ],
      expectedOutput: {
        path: repairWorkCardPath,
        artifactType: "Repair sub-card",
        description:
          "Repair route artifact that preserves the parent Work Card evidence chain.",
      },
      successRoute: "Repair Implementer handoff",
      manualFallback: fallback(repairWorkCardPath),
    });
  }

  const repairSources = uniqueArtifacts([
    ...sourceArtifacts,
    repair.repairWorkCard,
    repair.repairPrompt,
    repair.architectReview?.sourceArtifact,
    ...(repair.triggerArtifacts ?? []),
    ...(repair.routeEvidenceArtifacts ?? []),
  ]);
  const repairEvidenceClassifications = repair.evidenceClassifications;

  if (!artifactExists(repair.implementerReport)) {
    const expectedPath = `planning/phases/${phase.phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_${repairId}_${slugifyForPath(repairTitle)}.md`;

    return action(warnings, {
      id: "repair_implementer_handoff_required",
      workflowStep: "Work Card Loop",
      title: "Repair Implementer handoff required",
      summary:
        "A repair route exists and needs an Implementer repair pass.",
      responsibleRole: "implementer",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: repairId,
      workCardTitle: repairTitle,
      status: "available",
      reason:
        "Repair was requested, but no repair Implementer Report is available.",
      sourceArtifacts: repairSources,
      missingArtifacts: [
        {
          path: expectedPath,
          reason:
            "Architect review cannot proceed until the repair Implementer Report exists.",
        },
      ],
      expectedOutput: {
        path: expectedPath,
        artifactType: "Repair Implementer Report",
        description: "Report from the repair implementation pass.",
      },
      successRoute: "Architect review of repair Implementer Report",
      manualFallback: fallback(expectedPath),
      evidenceClassifications: repairEvidenceClassifications,
    });
  }

  const repairReviewIncomplete = isArchitectReviewIncomplete(
    repair.architectReview,
  );

  if (
    !repair.architectReview ||
    repairReviewIncomplete ||
    (!isArchitectReviewReadyForOperatorValidation(repair.architectReview) &&
      !architectReviewRequiresRepair(repair.architectReview))
  ) {
    const expectedPath = `planning/phases/${phase.phaseId}/Architect_Reviews/ARCHITECT_REVIEW_${repairId}_${slugifyForPath(repairTitle)}.md`;

    return action(warnings, {
      id: "architect_review_of_implementer_report_required",
      workflowStep: "Work Card Loop",
      title: "Architect review of repair Implementer Report required",
      summary:
        "The repair Implementer Report exists and must be reviewed before Operator validation.",
      responsibleRole: "architect",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: repairId,
      workCardTitle: repairTitle,
      status: "needs_review",
      reason: repairReviewIncomplete
        ? "The repair Architect Review is incomplete and must provide substantive Operator validation steps before validation."
        : "The locked workflow routes repair Implementer Reports to Architect review before Operator validation.",
      sourceArtifacts: withAuthoritativeCurrentActionImplementerReport(
        repairSources,
        repair.implementerReport,
      ),
      missingArtifacts: [
        {
          path: expectedPath,
          reason:
            "Architect review is required before the Operator validates this repair.",
        },
      ],
      expectedOutput: {
        path: expectedPath,
        artifactType: "Repair Architect Review",
        description:
          "Architect decision and item-level Operator validation steps for the repair implementation.",
      },
      successRoute: "Repair Operator validation",
      repairRoute:
        "Create another exact-scope repair Work Card if Architect review finds blocking defects.",
      manualFallback: fallback(expectedPath),
      evidenceClassifications: repairEvidenceClassifications,
    });
  }

  if (repair.validation?.authority === "duplicate_ambiguous") {
    return architectValidationEvidenceAuthorityAction(
      phase,
      repairId,
      repairTitle,
      repair.validation,
      uniqueArtifacts([
        ...repairSources,
        repair.implementerReport,
        ...repair.validation.sourceArtifacts,
      ]),
      warnings,
      repairEvidenceClassifications,
    );
  }

  if (repair.validation?.architectDispositionPending) {
    return architectValidationDispositionAction(
      phase,
      repairId,
      repairTitle,
      repair.validation,
      uniqueArtifacts([
        ...repairSources,
        repair.implementerReport,
        ...repair.validation.sourceArtifacts,
      ]),
      warnings,
      repairEvidenceClassifications,
    );
  }

  if (!isPassingValidation(repair.validation)) {
    const expectedPath = `planning/phases/${phase.phaseId}/Validation_Reports/VALIDATION_REPORT_${repairId}_${slugifyForPath(repairTitle)}.md`;

    return action(warnings, {
      id: "repair_validation_required",
      workflowStep: "Work Card Loop",
      title: "Repair validation required",
      summary:
        "The repair Implementer Report exists and must be validated by the Operator.",
      responsibleRole: "operator",
      phaseId: phase.phaseId,
      phaseTitle: phase.phaseTitle,
      workCardId: repairId,
      workCardTitle: repairTitle,
      status: "needs_validation",
      reason:
        "Repair implementation evidence exists, but no passing repair Validation Record is available.",
      sourceArtifacts: uniqueArtifacts([
        ...repairSources,
        repair.implementerReport,
        ...(repair.validation?.sourceArtifacts ?? []),
      ]),
      missingArtifacts: [
        {
          path: expectedPath,
          reason:
            "Operator validation is required to resolve the repair route.",
        },
      ],
      expectedOutput: {
        path: expectedPath,
        artifactType: "Repair Validation Record",
        description: "Validation record for the repair pass.",
      },
      successRoute: "Next Work Card candidate or Phase Closeout",
      failureRoute: "Create another repair sub-card if validation fails again.",
      manualFallback: fallback(expectedPath),
      evidenceClassifications: repairEvidenceClassifications,
    });
  }

  return action(warnings, {
    id: "no_current_action",
    workflowStep: "Work Card Loop",
    title: "No current Work Card action",
    summary:
      "The selected Work Card and repair route appear resolved.",
    responsibleRole: "app_system",
    phaseId: phase.phaseId,
    phaseTitle: phase.phaseTitle,
    workCardId: workCard.workCardId,
    workCardTitle: workCard.title,
    status: "complete",
    reason:
      "Durable validation evidence shows the Work Card or repair route has passed.",
    sourceArtifacts,
    missingArtifacts: [],
    evidenceClassifications: repairEvidenceClassifications,
  });
}

function projectArtifactAction(
  warnings: CurrentRequiredActionWarning[],
  input: {
    id: string;
    workflowStep: LockedWorkflowStep;
    title: string;
    summary: string;
    expectedPath: string;
    expectedType: string;
    missingReason: string;
    successRoute: string;
  },
): CurrentRequiredAction {
  return action(warnings, {
    id: input.id,
    workflowStep: input.workflowStep,
    title: input.title,
    summary: input.summary,
    responsibleRole: "operator",
    status: "available",
    reason: input.missingReason,
    sourceArtifacts: [],
    missingArtifacts: [
      {
        path: input.expectedPath,
        reason: input.missingReason,
      },
    ],
    expectedOutput: {
      path: input.expectedPath,
      artifactType: input.expectedType,
      description: input.summary,
    },
    successRoute: input.successRoute,
    manualFallback: fallback(input.expectedPath),
  });
}

function action(
  warnings: CurrentRequiredActionWarning[],
  template: CurrentActionTemplate,
): CurrentRequiredAction {
  return {
    ...template,
    sourceArtifacts: uniqueArtifacts(template.sourceArtifacts ?? []),
    missingArtifacts: uniqueMissingArtifacts(template.missingArtifacts ?? []),
    warnings: uniqueWarnings(warnings),
  };
}

function getProjectSources(
  project: CurrentActionProjectState,
): CurrentActionArtifactReference[] {
  return uniqueArtifacts([
    project.projectIntake,
    project.projectInterview,
    project.reconciliationReview,
    project.projectRoadmap,
    project.phaseMap,
    project.operatorProjectApproval,
  ]);
}

function artifactExists(
  artifactRef: CurrentActionArtifactReference | undefined,
): boolean {
  return artifactRef?.exists !== false && !!artifactRef?.path;
}

function missingIfAbsent(
  artifactRef: CurrentActionArtifactReference | undefined,
  path: string,
  reason: string,
): CurrentActionMissingArtifact | undefined {
  return artifactExists(artifactRef) ? undefined : { path, reason };
}

function fallback(path: string): CurrentActionManualFallback {
  return {
    available: true,
    artifactPath: path,
    instructions:
      "If direct app write/read is unavailable, create or update this repo-relative artifact manually and rerun current-action evaluation.",
  };
}

function isCandidateResolved(
  candidate: CurrentActionWorkCardCandidate,
  workCard: CurrentActionWorkCardState | undefined,
): boolean {
  if (!workCard) {
    return resolvedCandidateStatuses.has(normalizeStatus(candidate.status));
  }

  if (hasUnresolvedRepairObligation(workCard.repair)) {
    return false;
  }

  if (
    isPassingValidation(workCard.validation) ||
    isPassingValidation(workCard.repair?.validation)
  ) {
    return true;
  }

  if (workCard.validation || workCard.repair) {
    return false;
  }

  if (resolvedCandidateStatuses.has(normalizeStatus(candidate.status))) {
    return true;
  }

  if (resolvedCandidateStatuses.has(normalizeStatus(workCard.status))) {
    return true;
  }

  return false;
}

function hasUnresolvedRepairObligation(
  repair: CurrentActionRepairState | undefined,
): boolean {
  if (
    !repair ||
    !artifactExists(repair.repairWorkCard)
  ) {
    return false;
  }

  return !isPassingValidation(repair.validation);
}

function isFailingValidation(
  validation: CurrentActionValidationState | undefined,
): boolean {
  if (
    !validation ||
    validation.authority === "duplicate_ambiguous" ||
    validation.routeBlocked ||
    validation.architectDispositionPending ||
    validation.architectDispositionMissing
  ) {
    return false;
  }

  if (validation.repairRequired) {
    return true;
  }

  const result = normalizeStatus(validation.result);
  const decision = normalizeStatus(validation.decision);

  if (decision.length > 0) {
    return /defer|not_validated|fail|block|partial|repair|reject/.test(decision);
  }

  return ["fail", "failed", "partial", "blocked", "rejected"].includes(result) ||
    /repair/.test(result);
}

function architectReviewRequiresRepair(
  review: CurrentActionArchitectReviewState,
): boolean {
  const status = normalizeStatus(review.status);

  return /repair.*required|changes.*required|not.*ready.*validation/.test(
    status,
  );
}

function isArchitectReviewReadyForOperatorValidation(
  review: CurrentActionArchitectReviewState | undefined,
): boolean {
  return /ready_for_operator_(?:visual_)?validation/.test(
    normalizeStatus(review?.status),
  );
}

function isArchitectReviewIncomplete(
  review: CurrentActionArchitectReviewState | undefined,
): boolean {
  return /architect.*review.*incomplete|operator.*validation.*steps.*required/.test(
    normalizeStatus(review?.status),
  );
}

function isPassingValidation(
  validation: CurrentActionValidationState | undefined,
): boolean {
  if (
    !validation ||
    validation.authority === "duplicate_ambiguous" ||
    validation.architectDispositionPending ||
    validation.architectDispositionMissing ||
    isFailingValidation(validation)
  ) {
    return false;
  }

  const result = normalizeStatus(validation.result);
  const decision = normalizeStatus(validation.decision);

  if (decision.length > 0) {
    return [
      "passed_proceed",
      "passed",
      "mergeable",
      "ready_to_merge",
      "no_action_required",
      "pass_with_observation",
      "pass_with_observations",
      "carry_forward_observation",
      "future_scope_product_backlog",
    ].includes(decision);
  }

  return ["pass", "passed", "pass_with_concerns"].includes(result);
}

function architectValidationDispositionAction(
  phase: CurrentActionPhaseState,
  targetId: string,
  targetTitle: string,
  validation: CurrentActionValidationState,
  sourceArtifacts: CurrentActionArtifactReference[],
  warnings: CurrentRequiredActionWarning[],
  evidenceClassifications?: CurrentActionEvidenceClassification[],
): CurrentRequiredAction {
  const validationArtifact = validation.sourceArtifacts.find((artifactRef) =>
    /validation report/i.test(artifactRef.role),
  );

  return action(warnings, {
    id: "architect_review_of_validation_report_required",
    workflowStep: "Work Card Loop",
    title: "Architect review of Validation Report required",
    summary:
      "Operator validation evidence is recorded and awaits Architect disposition.",
    responsibleRole: "architect",
    phaseId: phase.phaseId,
    phaseTitle: phase.phaseTitle,
    workCardId: targetId,
    workCardTitle: targetTitle,
    status: "needs_review",
    reason:
      "Validation Result records the functional outcome, but merge, repair, deferral, backlog, and no-action routing remain pending until Architect review.",
    sourceArtifacts,
    missingArtifacts: [],
    expectedOutput: {
      path: validationArtifact?.path,
      artifactType: "Architect validation disposition",
      description:
        "Complete the pending Architect Disposition using the embedded review instructions and standard output shape.",
    },
    successRoute: "Next Work Card candidate or Phase Closeout",
    repairRoute: "Create an exact-scope repair Work Card if Architect review requires it.",
    manualFallback: validationArtifact
      ? fallback(validationArtifact.path)
      : undefined,
    evidenceClassifications,
  });
}

function architectValidationEvidenceAuthorityAction(
  phase: CurrentActionPhaseState,
  targetId: string,
  targetTitle: string,
  validation: CurrentActionValidationState,
  sourceArtifacts: CurrentActionArtifactReference[],
  warnings: CurrentRequiredActionWarning[],
  evidenceClassifications?: CurrentActionEvidenceClassification[],
): CurrentRequiredAction {
  const duplicateCount = validation.duplicateCount ?? 2;

  return action(warnings, {
    id: "architect_review_of_validation_report_required",
    workflowStep: "Work Card Loop",
    title: "Architect validation evidence authority review required",
    summary:
      "Multiple Validation Reports represent the same target and no explicit authoritative revision is recorded.",
    responsibleRole: "architect",
    phaseId: phase.phaseId,
    phaseTitle: phase.phaseTitle,
    workCardId: targetId,
    workCardTitle: targetTitle,
    status: "needs_review",
    reason: `${duplicateCount} Validation Reports exist for this target. ChampCity A/I will not infer authority from filename suffixes, timestamps, or directory order.`,
    sourceArtifacts,
    missingArtifacts: [],
    expectedOutput: {
      artifactType: "Architect evidence authority disposition",
      description:
        "Record which validation evidence controls, whether another repair is required, and which records are historical or superseded.",
    },
    successRoute: "Re-evaluate the earliest unresolved repair obligation",
    repairRoute:
      "Create an exact-scope repair Work Card only if Architect disposition requires implementation changes.",
    evidenceClassifications,
  });
}

function architectRepairAuthorityAction(
  phase: CurrentActionPhaseState,
  workCard: CurrentActionWorkCardState,
  sourceArtifacts: CurrentActionArtifactReference[],
  warnings: CurrentRequiredActionWarning[],
): CurrentRequiredAction {
  const repair = workCard.repair;

  return action(warnings, {
    id: "architect_review_of_validation_report_required",
    workflowStep: "Work Card Loop",
    title: "Architect repair-route authority review required",
    summary:
      "Competing unresolved repair obligations do not identify one controlling route.",
    responsibleRole: "architect",
    phaseId: phase.phaseId,
    phaseTitle: phase.phaseTitle,
    workCardId: workCard.workCardId,
    workCardTitle: workCard.title,
    status: "needs_review",
    reason:
      repair?.authorityAmbiguityReason ??
      "The repair chain is ambiguous and requires explicit Architect disposition.",
    sourceArtifacts: uniqueArtifacts([
      ...sourceArtifacts,
      ...(repair?.routeEvidenceArtifacts ?? []),
    ]),
    missingArtifacts: [],
    expectedOutput: {
      artifactType: "Architect route authority disposition",
      description:
        "Identify the controlling repair obligation and classify competing records as accepted, pending, superseded, or non-controlling.",
    },
    successRoute: "Re-evaluate the selected repair obligation",
    evidenceClassifications: repair?.evidenceClassifications,
  });
}

function normalizeStatus(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeComparable(value: string): string {
  return normalizeStatus(value);
}

function uniqueArtifacts(
  artifacts: Array<CurrentActionArtifactReference | undefined>,
): CurrentActionArtifactReference[] {
  const seen = new Set<string>();
  const result: CurrentActionArtifactReference[] = [];

  for (const artifactRef of artifacts) {
    if (!artifactRef?.path) {
      continue;
    }

    const key = `${artifactRef.path}|${artifactRef.role}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(artifactRef);
  }

  return result;
}

function withAuthoritativeCurrentActionImplementerReport(
  artifacts: Array<CurrentActionArtifactReference | undefined>,
  implementerReport: CurrentActionArtifactReference | undefined,
): CurrentActionArtifactReference[] {
  if (!implementerReport?.path) {
    return uniqueArtifacts(artifacts);
  }

  return uniqueArtifacts([
    ...artifacts.filter(
      (artifact) => artifact?.path !== implementerReport.path,
    ),
    {
      ...implementerReport,
      status: authoritativeCurrentActionImplementerReportStatus,
    },
  ]);
}

function uniqueMissingArtifacts(
  artifacts: CurrentActionMissingArtifact[],
): CurrentActionMissingArtifact[] {
  const seen = new Set<string>();
  const result: CurrentActionMissingArtifact[] = [];

  for (const artifactRef of artifacts) {
    const key = artifactRef.path;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(artifactRef);
  }

  return result;
}

function uniqueWarnings(
  warnings: CurrentRequiredActionWarning[],
): CurrentRequiredActionWarning[] {
  const seen = new Set<string>();
  const result: CurrentRequiredActionWarning[] = [];

  for (const warning of warnings) {
    const key = `${warning.code}|${warning.sourceArtifactPath ?? ""}|${warning.message}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(warning);
  }

  return result;
}

function slugifyForPath(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug || "current_action";
}
