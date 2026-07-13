import assert from "node:assert/strict";

import {
  getCurrentRequiredAction,
  listHumanValidationStatuses,
  listHumanValidationTargets,
  previewHumanValidationRecord,
} from "../dist/main/workCards/workCardFileStore.js";
import { resolveValidationTargetFileName } from "../dist/shared/workCards/validationTarget.js";

const targetResult = await listHumanValidationTargets("phase-03");
assert.equal(targetResult.ok, true, targetResult.errorMessages?.join(" "));

const targets = targetResult.targets ?? [];
const routedFileName = resolveValidationTargetFileName(
  targets,
  "WC01_superseded_phase_03_artifact_and_roadmap_state_reconciliation.json",
  "WC04-REPAIR01",
  true,
);

assert.equal(
  routedFileName,
  "WC04-REPAIR01_validation_flow_and_current_action_panel_usability.json",
);
assert.equal(
  resolveValidationTargetFileName(
    targets,
    "WC02_durable_current_required_action_model.json",
    "WC04-REPAIR01",
    false,
  ),
  "WC02_durable_current_required_action_model.json",
  "A manual target choice must remain selected after route alignment.",
);

const statusResult = await listHumanValidationStatuses("phase-03");
assert.equal(statusResult.ok, true, statusResult.errorMessages?.join(" "));

const statusesById = new Map(
  (statusResult.statuses ?? []).map((status) => [
    status.validationTargetId,
    status,
  ]),
);

assert.equal(statusesById.get("WC01")?.validationResult, "Pass");
assert.equal(statusesById.get("WC01")?.operatorDecision, "Passed - proceed");
assert.equal(statusesById.get("WC04")?.validationResult, "Pass");
assert.equal(
  statusesById.get("WC04")?.operatorDecision,
  "Deferred - not validated yet",
);
assert.equal(statusesById.get("WC04-REPAIR01")?.validationResult, "Pass");
assert.equal(
  statusesById.get("WC04-REPAIR01")?.operatorDecision,
  "Passed - proceed",
);
assert.match(
  statusesById.get("WC04-REPAIR01")?.validationReportMarkdownFile ?? "",
  /^VALIDATION_REPORT_WC04-REPAIR01_/,
);
assert.equal(statusesById.get("WC04-REPAIR02")?.validationResult, "Pass");
assert.equal(
  statusesById.get("WC04-REPAIR02")?.operatorDecision,
  "Passed - proceed",
);
assert.equal(statusesById.get("WC04-REPAIR03")?.validationResult, "Pass");
assert.equal(
  statusesById.get("WC04-REPAIR03")?.operatorDecision,
  "Passed - proceed",
);

const preview = await previewHumanValidationRecord({
  phase: "phase-03",
  workCardFileName:
    "WC04-REPAIR01_validation_flow_and_current_action_panel_usability.json",
  validationTargetFileName:
    "WC04-REPAIR01_validation_flow_and_current_action_panel_usability.json",
  builderReportFileName:
    "BUILDER_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md",
  validationResult: "Not Tested",
  testedItems: "",
  passedItems: "",
  failedItems: "",
  evidenceReferences: "",
  screenshotOrFileReferences: "",
  commandsRun: "",
  observedErrors: "",
  additionalOperatorObservations: "",
  operatorDecision: "Deferred - not validated yet",
  recommendedNextAction: "",
});

assert.equal(preview.ok, true, preview.errorMessages?.join(" "));
assert.equal(preview.manualValidationChecklist?.sourceLabel, "Architect Review");
assert.equal(
  preview.manualValidationChecklist?.sourceFileName,
  "ARCHITECT_REVIEW_WC04-REPAIR03_validation_target_context_and_panel_simplification.md",
);
assert.equal(preview.manualValidationChecklist?.isFallback, false);
assert.match(
  preview.manualValidationChecklist?.text ?? "",
  /Architect disposition: acceptable for validation/,
);

const fallbackPreview = await previewHumanValidationRecord({
  phase: "phase-03",
  workCardFileName:
    "WC04-REPAIR03_validation_target_context_and_panel_simplification.json",
  validationTargetFileName:
    "WC04-REPAIR03_validation_target_context_and_panel_simplification.json",
  validationResult: "Not Tested",
  testedItems: "",
  passedItems: "",
  failedItems: "",
  evidenceReferences: "",
  screenshotOrFileReferences: "",
  commandsRun: "",
  observedErrors: "",
  additionalOperatorObservations: "",
  operatorDecision: "Deferred - not validated yet",
  recommendedNextAction: "",
});

assert.equal(fallbackPreview.ok, true, fallbackPreview.errorMessages?.join(" "));
assert.equal(
  fallbackPreview.manualValidationChecklist?.sourceLabel,
  "Architect Review",
);
assert.equal(
  fallbackPreview.manualValidationChecklist?.sourceFileName,
  "ARCHITECT_REVIEW_WC04-REPAIR03_validation_target_context_and_panel_simplification.md",
);
assert.equal(fallbackPreview.manualValidationChecklist?.isFallback, false);

const currentActionResult = await getCurrentRequiredAction();
assert.equal(currentActionResult.ok, true);
assert.equal(currentActionResult.currentAction?.workCardId, "WC05");
assert.notEqual(currentActionResult.currentAction?.workCardId, "WC06");

console.log("WC04-REPAIR03 focused fixture passed.");
