import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getCurrentRequiredAction,
  listHumanValidationTargets,
} from "../dist/main/workCards/workCardFileStore.js";
import { evaluateCurrentRequiredAction } from "../dist/shared/workCards/currentRequiredAction.js";
import { resolveValidationTargetFileName } from "../dist/shared/workCards/validationTarget.js";
import { resolveWorkflowVisibility } from "../dist/shared/workCards/workflowVisibility.js";

function artifact(path, role) {
  return { path, role, exists: true };
}

const currentAction = evaluateCurrentRequiredAction({
  project: {
    projectName: "Pending repair fixture",
    projectIntake: artifact("planning/project/intake.json", "Project Intake"),
    projectInterview: artifact("planning/project/interview.json", "Project Interview"),
    reconciliationReview: artifact("planning/project/reconciliation.json", "Reconciliation Review"),
    projectRoadmap: artifact("planning/project/roadmap.json", "Roadmap"),
    phaseMap: artifact("planning/project/phase-map.json", "Phase Map"),
    operatorProjectApproval: artifact("planning/project/approval.md", "Operator Project Approval"),
  },
  activePhase: {
    phaseId: "phase-03",
    phaseTitle: "Pending repair routing fixture",
    status: "active",
    sourceArtifacts: [
      artifact("planning/phases/phase-03/Phase_Interview.md", "Phase Interview"),
      artifact("planning/phases/phase-03/Phase_Planning.md", "Phase Planning"),
      artifact("planning/phases/phase-03/Work_Card_Plan.md", "Work Card Plan"),
    ],
    operatorPhaseApproval: artifact(
      "planning/phases/phase-03/Operator_Phase_Approval.md",
      "Operator Phase Approval",
    ),
    workCardCandidates: [
      { workCardId: "WC08", title: "Current Step Context Inspector", order: 8 },
      { workCardId: "WC09", title: "Later mapped candidate", order: 9 },
    ],
    workCards: [
      {
        workCardId: "WC08",
        title: "Current Step Context Inspector",
        phaseId: "phase-03",
        status: "repair_required",
        sourceArtifacts: [
          artifact(
            "planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md",
            "Work Card Markdown",
          ),
        ],
        implementerReport: artifact(
          "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md",
          "Implementer Report",
        ),
        architectReview: {
          status: "Ready for Operator validation",
          sourceArtifact: artifact(
            "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08_current_step_context_inspector.md",
            "Architect Review",
          ),
        },
        validation: {
          result: "Pass",
          decision: "passed",
          sourceArtifacts: [
            artifact(
              "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.md",
              "Validation Report Markdown",
            ),
          ],
        },
        repair: {
          repairId: "WC08-REPAIR02",
          title: "Report Review Protocol and Validation Disposition Governance",
          repairWorkCard: artifact(
            "planning/phases/phase-03/Work_Cards/WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md",
            "Repair Work Card",
          ),
          implementerReport: artifact(
            "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md",
            "Repair Implementer Report",
          ),
          architectReview: {
            status: "Ready for Operator validation",
            sourceArtifact: artifact(
              "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md",
              "Architect Review",
            ),
          },
        },
      },
    ],
    roadmapUpdatedAfterCloseout: false,
    nextPhaseActivated: false,
  },
});

assert.equal(currentAction.id, "repair_validation_required");
assert.equal(currentAction.workCardId, "WC08-REPAIR02");
assert.equal(currentAction.responsibleRole, "operator");
assert.equal(currentAction.status, "needs_validation");
assert.notEqual(currentAction.workCardId, "WC09");
assert.notEqual(currentAction.id, "full_work_card_creation_required");
assert.match(
  currentAction.expectedOutput?.path ?? "",
  /Validation_Reports\/VALIDATION_REPORT_WC08-REPAIR02_/,
);
assert.equal(
  currentAction.sourceArtifacts.some((source) =>
    source.path.includes(
      "Architect_Reviews/ARCHITECT_REVIEW_WC08-REPAIR02_",
    ),
  ),
  true,
  "The ready Architect Review must remain source evidence for the routed repair validation.",
);

const currentActionResult = await getCurrentRequiredAction();
assert.equal(
  currentActionResult.ok,
  true,
  currentActionResult.errorMessages?.join(" "),
);
assert.ok(
  currentActionResult.currentAction,
  "The live current-action evaluator must return an action.",
);
assert.notEqual(currentActionResult.currentAction.workCardId, "WC09");
assert.ok(
  [
    "repair_implementer_handoff_required",
    "architect_review_of_implementer_report_required",
    "repair_validation_required",
    "architect_review_of_validation_report_required",
  ].includes(currentActionResult.currentAction.id),
  "Any unresolved WC08 repair obligation must continue to block the later WC09 candidate.",
);
assert.equal(
  currentActionResult.currentAction.workCardId,
  "WC08-REPAIR04",
  "The explicit REPAIR04 follow-up must control the live route without invalidating the REPAIR02 regression fixture.",
);

const targetResult = await listHumanValidationTargets("phase-03");
assert.equal(targetResult.ok, true, targetResult.errorMessages?.join(" "));
const targets = targetResult.targets ?? [];
const repairTarget = targets.find((target) => target.id === "WC08-REPAIR02");
assert.ok(repairTarget, "WC08-REPAIR02 must be available as a Human Validation target.");
assert.equal(
  resolveValidationTargetFileName(targets, "", "WC08-REPAIR02", true),
  "WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.json",
);

const workflowGuide = resolveWorkflowVisibility(currentAction);
assert.equal(workflowGuide.activeStepLabel, "Work Card Loop");
assert.equal(
  workflowGuide.workCardLoopStages.find(
    (stage) => stage.id === "validation-again",
  )?.state,
  "repair",
);

const routerSource = await readFile(
  new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
  "utf8",
);
assert.match(
  routerSource,
  /repair_validation_required:\s*"human-validation"/,
  "Repair validation must route to Human Validation.",
);
assert.match(
  routerSource,
  /full_work_card_creation_required:\s*"new-work-card"/,
  "The regression fixture must distinguish Human Validation from Ad Hoc Work Card Capture.",
);

console.log(
  "WC08-REPAIR03 focused fixture passed: synthetic REPAIR02 validation routing remains correct, while live REPAIR04 continues to block WC09.",
);
