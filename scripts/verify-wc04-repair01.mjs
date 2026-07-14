import assert from "node:assert/strict";

import {
  readHumanValidationDraft,
  storeHumanValidationDraft,
} from "../dist/shared/workCards/humanValidationDrafts.js";
import { previewHumanValidationRecord } from "../dist/main/workCards/workCardFileStore.js";

const emptyDraft = {
  validationResult: "Not tested",
  testedItems: "",
  passedItems: "",
  failedItems: "",
  evidenceReferences: "",
  screenshotOrFileReferences: "",
  commandsRun: "",
  observedErrors: "",
  additionalOperatorObservations: "",
  recommendedNextAction: "",
};

const wc04Draft = {
  ...emptyDraft,
  testedItems: "Draft survives supporting-screen navigation.",
};
const wc03Draft = {
  ...emptyDraft,
  testedItems: "A separate target keeps separate text.",
};

let drafts = storeHumanValidationDraft(
  {},
  "phase-03",
  "WC04_primary_current_action_panel.json",
  wc04Draft,
);
drafts = storeHumanValidationDraft(
  drafts,
  "phase-03",
  "WC03_workflow_router_shell.json",
  wc03Draft,
);

assert.equal(
  readHumanValidationDraft(
    drafts,
    "phase-03",
    "WC04_primary_current_action_panel.json",
    emptyDraft,
  ).testedItems,
  wc04Draft.testedItems,
);
assert.equal(
  readHumanValidationDraft(
    drafts,
    "phase-03",
    "WC03_workflow_router_shell.json",
    emptyDraft,
  ).testedItems,
  wc03Draft.testedItems,
);
assert.equal(
  readHumanValidationDraft(
    drafts,
    "phase-02",
    "WC04_primary_current_action_panel.json",
    emptyDraft,
  ).testedItems,
  "",
);

const preview = await previewHumanValidationRecord({
  phase: "phase-03",
  workCardFileName: "WC04_primary_current_action_panel.json",
  validationTargetFileName: "WC04_primary_current_action_panel.json",
  builderReportFileName: "BUILDER_REPORT_WC04_primary_current_action_panel.md",
  ...emptyDraft,
});

assert.equal(preview.ok, true, preview.errorMessages?.join(" "));
assert.equal(
  preview.manualValidationChecklist?.sourceLabel,
  "Architect Review",
);
assert.equal(
  preview.manualValidationChecklist?.sourceFileName,
  "ARCHITECT_REVIEW_WC04_primary_current_action_panel.md",
);
assert.match(
  preview.manualValidationChecklist?.text ?? "",
  /Operator Validation Guidance/,
);

console.log("WC04-REPAIR01 focused fixture passed.");
