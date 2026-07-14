import assert from "node:assert/strict";

import { getCurrentRequiredAction } from "../dist/main/workCards/workCardFileStore.js";
import { resolveSupportNavigationState } from "../dist/shared/workCards/supportNavigation.js";

const navigationItems = Object.freeze([
  Object.freeze({
    id: "builder-report-capture",
    label: "Report",
    screenTitle: "Implementer Report Capture",
    shortDesc: "Capture evidence",
  }),
  Object.freeze({
    id: "human-validation",
    label: "Validate",
    screenTitle: "Human Validation",
    shortDesc: "Confirm it worked",
  }),
]);

const routedState = resolveSupportNavigationState(
  navigationItems,
  "human-validation",
  "human-validation",
);
assert.equal(routedState.routedScreenResolved, true);
assert.equal(routedState.isViewingRoutedScreen, true);
assert.equal(routedState.isViewingSupportingScreen, false);

const supportState = resolveSupportNavigationState(
  navigationItems,
  "human-validation",
  "builder-report-capture",
);
assert.equal(supportState.routedScreen?.id, "human-validation");
assert.equal(supportState.activeScreen?.id, "builder-report-capture");
assert.equal(supportState.isViewingRoutedScreen, false);
assert.equal(supportState.isViewingSupportingScreen, true);

const unresolvedState = resolveSupportNavigationState(
  navigationItems,
  "missing-routed-screen",
  "builder-report-capture",
);
assert.equal(unresolvedState.routedScreenResolved, false);
assert.equal(unresolvedState.isViewingSupportingScreen, true);
assert.equal(unresolvedState.routedScreenId, "missing-routed-screen");

assert.deepEqual(
  navigationItems.map((item) => item.id),
  ["builder-report-capture", "human-validation"],
  "Resolving support navigation must not mutate the available screens.",
);

const currentActionResult = await getCurrentRequiredAction();
assert.equal(currentActionResult.ok, true);
assert.equal(
  currentActionResult.currentAction?.workCardId,
  "WC08-REPAIR04",
  "Accepted prior work must allow the explicit active repair route without changing support-navigation semantics.",
);
assert.ok(
  [
    "repair_implementer_handoff_required",
    "architect_review_of_implementer_report_required",
  ].includes(currentActionResult.currentAction?.id ?? ""),
  "WC08-REPAIR04 must remain unresolved while implementation or Architect review is pending.",
);

console.log("WC05 support-navigation focused fixture passed.");
