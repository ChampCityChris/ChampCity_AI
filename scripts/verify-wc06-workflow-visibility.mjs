import assert from "node:assert/strict";

import { getCurrentRequiredAction } from "../dist/main/workCards/workCardFileStore.js";
import { lockedWorkflowSteps } from "../dist/shared/workCards/currentRequiredAction.js";
import {
  resolveWorkflowVisibility,
  workflowGuideGroups,
  workflowGuideSteps,
  workflowLoopGuides,
} from "../dist/shared/workCards/workflowVisibility.js";

const action = (overrides) => ({
  id: "operator_validation_required",
  workflowStep: "Work Card Loop",
  status: "needs_validation",
  warnings: [],
  ...overrides,
});

assert.deepEqual(
  workflowGuideSteps.map((step) => step.label),
  [...lockedWorkflowSteps],
  "The visible guide must preserve the complete locked workflow sequence.",
);
assert.deepEqual(
  workflowGuideGroups.map((group) => group.label),
  ["Capture", "Frame", "Plan", "Build", "Prove"],
  "Plain-language groups must remain subordinate grouping aids.",
);
assert.equal(
  new Set(workflowGuideSteps.map((step) => step.supportScreenId)).has(""),
  false,
  "Every process-step click must resolve to an explicit support screen.",
);
assert.deepEqual(
  workflowLoopGuides.map((loop) => loop.id),
  ["approval-revision", "work-card", "phase"],
  "Approval/revision, Work Card, and phase loops must all remain visible.",
);
assert.deepEqual(
  workflowLoopGuides.find((loop) => loop.id === "work-card")?.stages,
  [
    "Work Card",
    "Implementer",
    "Architect Review",
    "Operator Validation",
    "Repair if needed",
    "Validation again",
    "Next Work Card",
  ],
);

const currentGuide = resolveWorkflowVisibility(action({}));
assert.equal(currentGuide.positionKnown, true);
assert.equal(currentGuide.activeStepLabel, "Work Card Loop");
assert.equal(
  currentGuide.steps.find((step) => step.label === "Work Card Loop")?.state,
  "current",
);
assert.equal(
  currentGuide.steps.find((step) => step.label === "Operator Phase Approval")
    ?.state,
  "completed",
);
assert.equal(
  currentGuide.steps.find((step) => step.label === "Phase Closeout")?.state,
  "upcoming",
);
assert.equal(
  currentGuide.workCardLoopStages.find(
    (stage) => stage.id === "operator-validation",
  )?.state,
  "current",
);

const blockedGuide = resolveWorkflowVisibility(
  action({
    id: "implementer_report_required",
    status: "blocked",
  }),
);
assert.equal(
  blockedGuide.steps.find((step) => step.label === "Work Card Loop")?.state,
  "blocked",
);
assert.equal(
  blockedGuide.workCardLoopStages.find((stage) => stage.id === "implementer")
    ?.state,
  "blocked",
);

const repairGuide = resolveWorkflowVisibility(
  action({
    id: "repair_validation_required",
  }),
);
assert.equal(
  repairGuide.steps.find((step) => step.label === "Work Card Loop")?.state,
  "repair",
);
assert.equal(
  repairGuide.workCardLoopStages.find(
    (stage) => stage.id === "validation-again",
  )?.state,
  "repair",
);
assert.equal(
  repairGuide.workCardLoopStages.find((stage) => stage.id === "repair")?.state,
  "completed",
);

const unknownGuide = resolveWorkflowVisibility(
  action({
    id: "future_action_not_in_locked_workflow",
    workflowStep: "Future workflow step",
    status: "available",
  }),
);
assert.equal(unknownGuide.positionKnown, false);
assert.equal(
  unknownGuide.steps.every((step) => step.state === "unknown"),
  true,
  "Unknown durable state must not invent completed or upcoming evidence.",
);

const genericBlockedGuide = resolveWorkflowVisibility(
  action({
    id: "blocked",
    workflowStep: "Repeat Phase Mapping / Work Card Loop",
    status: "blocked",
  }),
);
assert.equal(genericBlockedGuide.positionKnown, false);
assert.equal(
  genericBlockedGuide.steps.find(
    (step) => step.label === "Repeat Phase Mapping / Work Card Loop",
  )?.state,
  "blocked",
);
assert.equal(
  genericBlockedGuide.steps
    .filter((step) => step.label !== "Repeat Phase Mapping / Work Card Loop")
    .every((step) => step.state === "unknown"),
  true,
);

const completeGuide = resolveWorkflowVisibility(
  action({
    id: "project_complete",
    workflowStep: "Repeat Phase Mapping / Work Card Loop",
    status: "complete",
  }),
);
assert.equal(completeGuide.activeStepIndex, undefined);
assert.equal(
  completeGuide.steps.every((step) => step.state === "completed"),
  true,
);

const liveCurrentAction = await getCurrentRequiredAction();
assert.equal(liveCurrentAction.ok, true, liveCurrentAction.errorMessages?.join(" "));
assert.equal(
  liveCurrentAction.currentAction?.workCardId,
  "WC06",
  "The router must remain on WC06 until WC06 receives passing validation.",
);
assert.notEqual(
  liveCurrentAction.currentAction?.workCardId,
  "WC07",
  "WC06 must not advance the router to WC07 prematurely.",
);
assert.equal(
  liveCurrentAction.currentAction?.id,
  "operator_validation_required",
  "Architect-reviewed WC06 must route to Operator validation.",
);
assert.equal(liveCurrentAction.currentAction?.responsibleRole, "operator");
assert.equal(liveCurrentAction.currentAction?.status, "needs_validation");

const liveGuide = resolveWorkflowVisibility(liveCurrentAction.currentAction);
assert.equal(liveGuide.positionKnown, true);
assert.equal(liveGuide.activeStepLabel, "Work Card Loop");
assert.equal(
  liveGuide.workCardLoopStages.find(
    (stage) => stage.id === "operator-validation",
  )?.state,
  "current",
  "The visible WC06 workflow guide must agree with the validation route.",
);

console.log("WC06 workflow-visibility focused fixture passed.");
