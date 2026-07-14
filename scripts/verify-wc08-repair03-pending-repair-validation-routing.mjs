import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getCurrentRequiredAction,
  listHumanValidationTargets,
} from "../dist/main/workCards/workCardFileStore.js";
import { resolveValidationTargetFileName } from "../dist/shared/workCards/validationTarget.js";
import { resolveWorkflowVisibility } from "../dist/shared/workCards/workflowVisibility.js";

const currentActionResult = await getCurrentRequiredAction();
assert.equal(
  currentActionResult.ok,
  true,
  currentActionResult.errorMessages?.join(" "),
);

const currentAction = currentActionResult.currentAction;
assert.ok(currentAction, "The current-action evaluator must return an action.");
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
  "WC08-REPAIR03 focused fixture passed: pending WC08-REPAIR02 validation blocks WC09 and routes to Human Validation.",
);
