import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getCurrentRequiredAction } from "../dist/main/workCards/workCardFileStore.js";
import { evaluateCurrentRequiredAction } from "../dist/shared/workCards/currentRequiredAction.js";
import {
  buildCurrentStepContextInspector,
  buildCurrentStepRouteContext,
} from "../dist/shared/workCards/currentStepContextInspector.js";
import {
  buildRouteReviewRequest,
  renderRouteReviewRequestMarkdown,
  validateRouteReviewRequestInput,
} from "../dist/shared/workCards/routeReviewRequest.js";

function artifact(path, role, extras = {}) {
  return { path, role, exists: true, ...extras };
}

function projectState() {
  return {
    projectName: "Controlled route recovery fixture",
    projectIntake: artifact("planning/project/intake.json", "Project Intake"),
    projectInterview: artifact(
      "planning/project/interview.json",
      "Project Interview",
    ),
    reconciliationReview: artifact(
      "planning/project/reconciliation.json",
      "Reconciliation Review",
    ),
    projectRoadmap: artifact("planning/project/roadmap.json", "Roadmap"),
    phaseMap: artifact("planning/project/phase-map.json", "Phase Map"),
    operatorProjectApproval: artifact(
      "planning/project/approval.md",
      "Operator Project Approval",
    ),
  };
}

function phaseSources() {
  return [
    artifact("planning/phases/phase-03/Phase_Interview.md", "Phase Interview"),
    artifact("planning/phases/phase-03/Phase_Planning.md", "Phase Planning"),
    artifact("planning/phases/phase-03/Work_Card_Plan.md", "Work Card Plan"),
  ];
}

const repair04WorkCard = artifact(
  "planning/phases/phase-03/Work_Cards/WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md",
  "Repair Work Card",
  { status: "approved_for_implementer_handoff" },
);
const repair01Validation = artifact(
  "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_route_context_explanation_and_correction_affordance.md",
  "Repair trigger validation evidence",
  { status: "controlling_trigger" },
);

const repair04State = {
  project: projectState(),
  activePhase: {
    phaseId: "phase-03",
    phaseTitle: "Workflow Router Screen Correction",
    status: "active",
    sourceArtifacts: phaseSources(),
    operatorPhaseApproval: artifact(
      "planning/phases/phase-03/Operator_Phase_Approval.md",
      "Operator Phase Approval",
    ),
    workCardCandidates: [
      { workCardId: "WC01", title: "Earlier resolved work", order: 1 },
      { workCardId: "WC08", title: "Current Step Context Inspector", order: 8 },
      { workCardId: "WC09", title: "Later mapped candidate", order: 9 },
    ],
    workCards: [
      {
        workCardId: "WC01",
        title: "Earlier resolved work",
        phaseId: "phase-03",
        status: "complete",
        sourceArtifacts: [artifact("planning/wc01.md", "Work Card")],
        validation: {
          result: "Pass",
          decision: "passed",
          authority: "single",
          sourceArtifacts: [artifact("planning/wc01-validation.md", "Validation")],
        },
      },
      {
        workCardId: "WC08",
        title: "Current Step Context Inspector",
        phaseId: "phase-03",
        status: "completed_via_repair",
        sourceArtifacts: [artifact("planning/wc08.md", "Work Card")],
        implementerReport: artifact("planning/wc08-report.md", "Implementer Report"),
        architectReview: {
          status: "Ready for Operator validation",
          sourceArtifact: artifact("planning/wc08-review.md", "Architect Review"),
        },
        validation: {
          result: "Pass",
          decision: "passed",
          authority: "single",
          sourceArtifacts: [artifact("planning/wc08-validation.md", "Validation")],
        },
        repair: {
          repairId: "WC08-REPAIR04",
          title: "Controlled Route Recovery and Accurate Route Evidence Authority",
          status: "approved_for_implementer_handoff",
          repairWorkCard: repair04WorkCard,
          triggerArtifacts: [repair01Validation],
          supersedesRepairIds: ["WC08-REPAIR01"],
          routeEvidenceArtifacts: [repair04WorkCard, repair01Validation],
          evidenceClassifications: [
            {
              id: "repair04-control",
              label: "WC08-REPAIR04 Work Card",
              summary: "The explicitly linked unresolved repair controls this route.",
              classification: "accepted_controlling",
              sourceArtifacts: [repair04WorkCard],
            },
            {
              id: "repair04-trigger",
              label: "Controlling repair trigger",
              summary: "The Repair Work Card explicitly cites this validation evidence.",
              classification: "accepted_controlling",
              sourceArtifacts: [repair01Validation],
            },
            {
              id: "repair01-pending",
              label: "WC08-REPAIR01 validation disposition",
              summary: "The validation artifact is present but its own disposition is pending.",
              classification: "present_pending_disposition",
              sourceArtifacts: [repair01Validation],
            },
            {
              id: "repair01-history",
              label: "WC08-REPAIR01 prior repair state",
              summary: "The prior repair remains historical and does not select the current route.",
              classification: "stale_historical_superseded",
              sourceArtifacts: [repair01Validation],
            },
          ],
        },
      },
    ],
    roadmapUpdatedAfterCloseout: false,
    nextPhaseActivated: false,
  },
};

const repair04Action = evaluateCurrentRequiredAction(repair04State);
assert.equal(repair04Action.id, "repair_implementer_handoff_required");
assert.equal(repair04Action.workCardId, "WC08-REPAIR04");
assert.equal(repair04Action.responsibleRole, "implementer");
assert.notEqual(repair04Action.workCardId, "WC01");
assert.notEqual(repair04Action.workCardId, "WC09");
assert.match(
  repair04Action.successRoute ?? "",
  /Architect review of repair Implementer Report/i,
);

const routeContext = buildCurrentStepRouteContext(repair04State, repair04Action);
const workCardCategory = routeContext.categories.find(
  (category) => category.id === "work_card",
);
assert.match(workCardCategory?.summary ?? "", /WC08-REPAIR04/);
assert.doesNotMatch(workCardCategory?.summary ?? "", /WC08 - Current Step/);

const model = buildCurrentStepContextInspector(repair04Action, routeContext, {
  currentActionIpcState: "available",
  planningArtifactPreviewState: "available",
});
assert.match(model.explanation.acceptedEvidence.join(" "), /WC08-REPAIR04/i);
assert.match(model.explanation.pendingEvidence.join(" "), /disposition is pending/i);
assert.match(model.explanation.missingEvidence.join(" "), /Repair Implementer Report/i);
assert.match(model.explanation.nonControllingEvidence.join(" "), /historical/i);
assert.doesNotMatch(
  model.explanation.missingEvidence.join(" "),
  /disposition is pending/i,
  "Present evidence pending disposition must not be described as missing.",
);
assert.match(model.correctionGuidance.currentRoute, /WC08-REPAIR04/i);
assert.match(model.correctionGuidance.durableAction, /Route Review Request/i);
assert.match(model.correctionGuidance.governanceSummary, /cannot approve/i);

const duplicateValidationAction = evaluateCurrentRequiredAction({
  project: projectState(),
  activePhase: {
    phaseId: "phase-03",
    phaseTitle: "Duplicate validation authority fixture",
    status: "active",
    sourceArtifacts: phaseSources(),
    operatorPhaseApproval: artifact("planning/phase-approval.md", "Approval"),
    workCardCandidates: [{ workCardId: "WC50", title: "Authority target", order: 1 }],
    workCards: [
      {
        workCardId: "WC50",
        title: "Authority target",
        phaseId: "phase-03",
        status: "complete",
        sourceArtifacts: [artifact("planning/wc50.md", "Work Card")],
        validation: {
          result: "Conflicting validation results",
          authority: "duplicate_ambiguous",
          duplicateCount: 2,
          conflictingResults: ["Pass", "Fail"],
          sourceArtifacts: [
            artifact("planning/validation-a.md", "Validation Report"),
            artifact("planning/validation-b.md", "Validation Report"),
          ],
        },
      },
    ],
    roadmapUpdatedAfterCloseout: false,
    nextPhaseActivated: false,
  },
});
assert.equal(
  duplicateValidationAction.id,
  "architect_review_of_validation_report_required",
);
assert.equal(duplicateValidationAction.responsibleRole, "architect");
assert.match(duplicateValidationAction.title, /evidence authority review/i);
assert.match(duplicateValidationAction.reason, /will not infer authority/i);

const requestInput = {
  phase: "phase-03",
  currentActionId: repair04Action.id,
  currentActionTitle: repair04Action.title,
  currentActionReason: repair04Action.reason,
  workCardId: repair04Action.workCardId,
  workCardTitle: repair04Action.workCardTitle,
  expectedOutput: model.route.expectedOutput,
  operatorConcern: "The selected route appears to rely on the wrong validation authority.",
  operatorExpectedRoute: "Architect should confirm which Repair Work Card controls.",
  evidenceSnapshot: {
    acceptedOrControlling: model.explanation.acceptedEvidence,
    presentPendingDisposition: model.explanation.pendingEvidence,
    missingRequired: model.explanation.missingEvidence,
    nonControlling: model.explanation.nonControllingEvidence,
    ambiguityWarnings: model.explanation.ambiguityWarnings,
  },
};
assert.deepEqual(validateRouteReviewRequestInput(requestInput), []);
const request = buildRouteReviewRequest(requestInput, "2026-07-14T12:00:00.000Z");
const requestMarkdown = renderRouteReviewRequestMarkdown(request);
assert.equal(request.status, "pending_architect_review");
assert.equal(request.ownership.dispositionOwner, "Architect");
assert.equal(request.ownership.evaluatorRepairOwner, "Implementer");
assert.equal(request.governance.changesCurrentRoute, false);
assert.equal(request.governance.approvesEvidence, false);
assert.equal(request.governance.advancesWorkflow, false);
assert.match(requestMarkdown, /Pending Architect review/);
assert.match(requestMarkdown, /does not change the current route/i);
assert.doesNotMatch(requestMarkdown, /copy this prompt|paste into|LLM/i);

const rendererSource = await readFile(
  new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
  "utf8",
);
assert.match(rendererSource, /Accepted or controlling evidence/);
assert.match(rendererSource, /Present, pending Architect disposition/);
assert.match(rendererSource, /Missing and required next/);
assert.match(rendererSource, /Stale, historical, superseded, or non-controlling/);
assert.match(rendererSource, /Duplicate or ambiguous evidence/);
assert.match(rendererSource, /Request route review/);
assert.match(rendererSource, /saveRouteReviewRequest/);
assert.doesNotMatch(rendererSource, /Handoff summary|select and copy/);
assert.doesNotMatch(
  rendererSource,
  /window\.champCity\.(?:saveHumanValidationRecord|saveArchitectPrompt|saveImplementerReportCapture)[\s\S]{0,500}Route Review Request/,
  "The recovery control must not invoke approval, validation, or report mutation APIs.",
);

const liveResult = await getCurrentRequiredAction();
assert.equal(liveResult.ok, true, liveResult.errorMessages?.join(" "));
assert.ok(liveResult.currentAction, "The live current-action evaluator must return an action.");
assert.equal(liveResult.currentAction.workCardId, "WC08-REPAIR04");
assert.notEqual(liveResult.currentAction.workCardId, "WC01");
assert.notEqual(liveResult.currentAction.workCardId, "WC09");
assert.ok(
  [
    "repair_implementer_handoff_required",
    "architect_review_of_implementer_report_required",
  ].includes(liveResult.currentAction.id),
  `Expected the active REPAIR04 implementation/review route, received ${liveResult.currentAction.id}.`,
);

console.log(
  "WC08-REPAIR04 focused fixture passed: active repair authority, duplicate-validation blocking, accurate evidence classifications, governed Route Review Request, and WC01/WC09 route prevention verified.",
);
