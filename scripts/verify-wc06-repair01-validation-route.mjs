import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getCurrentRequiredAction } from "../dist/main/workCards/workCardFileStore.js";
import { resolveSupportNavigationState } from "../dist/shared/workCards/supportNavigation.js";
import { resolveWorkflowVisibility } from "../dist/shared/workCards/workflowVisibility.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const readRepositoryFile = (repoPath) =>
  readFileSync(resolve(repositoryRoot, repoPath), "utf8");

const workCard = JSON.parse(
  readRepositoryFile(
    "planning/phases/phase-03/Work_Cards/WC06_left_to_right_workflow_visibility.json",
  ),
);
assert.equal(workCard.id, "WC06");
assert.equal(workCard.phaseId, "phase-03");
assert.equal(
  Object.hasOwn(workCard, "workCardId"),
  false,
  "The fixture must preserve the alternate WC06 id/phaseId artifact shape that triggered the defect.",
);

const failedValidation = JSON.parse(
  readRepositoryFile(
    "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06_left_to_right_workflow_visibility.json",
  ),
);
assert.equal(failedValidation.validationResult, "Fail");
assert.match(
  `${failedValidation.failedItems} ${failedValidation.observedErrors}`,
  /Ad Hoc Work Card Capture|validation cannot be reached/i,
  "The fixture must exercise the route-blocked WC06 validation attempt.",
);

const passingRepairValidation = JSON.parse(
  readRepositoryFile(
    "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.json",
  ),
);
assert.equal(passingRepairValidation.validationResult, "Pass");
assert.equal(passingRepairValidation.operatorDecision, "Passed - proceed");

const currentActionResult = await getCurrentRequiredAction();
assert.equal(
  currentActionResult.ok,
  true,
  currentActionResult.errorMessages?.join(" "),
);

const currentAction = currentActionResult.currentAction;
assert.equal(currentAction?.workCardId, "WC08-REPAIR02");
assert.ok(
  [
    "repair_validation_required",
    "architect_review_of_validation_report_required",
  ].includes(currentAction?.id ?? ""),
);
assert.notEqual(currentAction?.id, "full_work_card_creation_required");
const repairValidationPending = currentAction?.id === "repair_validation_required";
assert.equal(
  currentAction?.responsibleRole,
  repairValidationPending ? "operator" : "architect",
);
assert.equal(
  currentAction?.status,
  repairValidationPending ? "needs_validation" : "needs_review",
);

const architectReview = readRepositoryFile(
  "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC06_left_to_right_workflow_visibility.md",
);
assert.match(
  architectReview,
  /ready for operator validation/i,
  "The WC06 Architect Review must retain its ready-for-validation decision.",
);

const workflowGuide = resolveWorkflowVisibility(currentAction);
assert.equal(workflowGuide.activeStepLabel, "Work Card Loop");
assert.equal(
  workflowGuide.workCardLoopStages.find(
    (stage) =>
      stage.id ===
      (repairValidationPending ? "validation-again" : "architect-review"),
  )?.state,
  repairValidationPending ? "repair" : "current",
);

const navigationItems = Object.freeze([
  Object.freeze({
    id: "new-work-card",
    label: "Ad Hoc Work Card",
    screenTitle: "Ad Hoc Work Card Capture",
    shortDesc: "Create an unplanned draft",
  }),
  Object.freeze({
    id: "human-validation",
    label: "Validate",
    screenTitle: "Human Validation",
    shortDesc: "Validate the routed Work Card",
  }),
]);
const navigation = resolveSupportNavigationState(
  navigationItems,
  "human-validation",
  "human-validation",
);
assert.equal(navigation.routedScreen?.screenTitle, "Human Validation");
assert.equal(navigation.isViewingRoutedScreen, true);
assert.notEqual(navigation.routedScreen?.screenTitle, "Ad Hoc Work Card Capture");

const workflowRouterSource = readRepositoryFile(
  "src/renderer/app/WorkflowRouterShell.tsx",
);
assert.match(
  workflowRouterSource,
  /operator_validation_required:\s*"human-validation"/,
  "Operator validation must map to the Human Validation workspace.",
);
assert.match(
  workflowRouterSource,
  /repair_validation_required:\s*"human-validation"/,
  "Repair validation must map to the Human Validation workspace.",
);
assert.match(
  workflowRouterSource,
  /full_work_card_creation_required:\s*"new-work-card"/,
  "The fixture must distinguish Human Validation from Ad Hoc Work Card Capture.",
);

console.log("WC06-REPAIR01 validation-route focused fixture passed.");
