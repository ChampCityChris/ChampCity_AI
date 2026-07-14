import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  coerceWorkCardValidationTargetFields,
  getCurrentRequiredAction,
  listSavedWorkCards,
  previewArchitectReviewRecord,
} from "../dist/main/workCards/workCardFileStore.js";

const phase = "phase-03";
const targetId = "WC08-REPAIR04";
const workCardFileName =
  "WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json";
const builderReportFileName =
  "BUILDER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const architectReviewFileName =
  "ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";

const currentActionResult = await getCurrentRequiredAction();
assert.equal(currentActionResult.ok, true, currentActionResult.errorMessages?.join(" "));
assert.equal(currentActionResult.currentAction?.workCardId, targetId);
assert.equal(
  currentActionResult.currentAction?.id,
  "architect_review_of_implementer_report_required",
);
assert.equal(currentActionResult.currentAction?.phaseId, phase);
assert.equal(
  currentActionResult.currentAction?.expectedOutput?.artifactType,
  "Repair Architect Review",
);
assert.ok(
  currentActionResult.currentAction?.sourceArtifacts.some((artifact) =>
    artifact.path.endsWith(builderReportFileName),
  ),
  "The current action must expose the associated REPAIR04 Implementer Report.",
);
assert.notEqual(currentActionResult.currentAction?.workCardId, "WC01");
assert.notEqual(currentActionResult.currentAction?.workCardId, "WC09");

const workCardList = await listSavedWorkCards(phase);
assert.equal(workCardList.ok, true, workCardList.errorMessages?.join(" "));
const repair04 = workCardList.workCards?.find(
  (workCard) => workCard.workCardId === targetId,
);
assert.ok(repair04, "Repair Work Cards must be available for association.");
assert.equal(repair04.fileName, workCardFileName);
assert.equal(repair04.kind, "repair");
assert.equal(repair04.parentWorkCardId, "WC08");
assert.ok(
  !(workCardList.invalidFiles ?? []).some(
    (file) => file.fileName === workCardFileName,
  ),
  "The current REPAIR04 JSON must not be relegated to skipped-file diagnostics.",
);

assert.deepEqual(
  coerceWorkCardValidationTargetFields(
    {
      id: "WC99-REPAIR01",
      title: "Legacy repair association",
      phaseId: phase,
      parentWorkCardId: "WC99",
      status: "ready_for_implementer",
    },
    phase,
  ),
  {
    workCardId: "WC99-REPAIR01",
    title: "Legacy repair association",
    phase,
    status: "ready_for_implementer",
    riskLevel: undefined,
    parentWorkCardId: "WC99",
  },
  "id plus phaseId must be accepted for historical repair association.",
);
assert.equal(
  coerceWorkCardValidationTargetFields(
    {
      repairId: "WC99-REPAIR02",
      title: "Repair-specific identifier",
      phase,
      parent_work_card_id: "WC99",
    },
    phase,
  )?.workCardId,
  "WC99-REPAIR02",
  "repairId must be accepted as a repair Work Card identifier.",
);

const preview = await previewArchitectReviewRecord({
  phase,
  workCardFileName,
  builderReportFileName,
  decision: "Ready for Operator validation",
  workCardCompliance: "The implementation remains within WC08-REPAIR04 scope.",
  changedFilesReviewed: "Reviewed the reported source and focused fixture changes.",
  acceptanceCriteriaAssessment: "The reported acceptance criteria are addressed.",
  validationClaimsAssessment: "The approved automated validation claims are adequate for Architect review.",
  skippedChecksAssessment: "Operator validation remains intentionally unperformed.",
  observationRegisterImpact: "No observation status is changed by this review preview.",
  operatorValidationSteps: "1. Confirm the routed Architect Review workspace and bound REPAIR04 evidence.",
  requiredRepair: "None identified by this deterministic preview fixture.",
});

assert.equal(preview.ok, true, preview.errorMessages?.join(" "));
assert.equal(preview.reviewMode, "repair");
assert.equal(preview.workCardId, targetId);
assert.equal(preview.builderReportFileName, builderReportFileName);
assert.equal(preview.savedFileName, architectReviewFileName);
assert.equal(preview.validation?.valid, true, preview.validation?.errors.join(" "));
assert.match(
  preview.reviewMarkdown ?? "",
  /Architect Review of Repair Implementer Report/,
);
assert.match(preview.reviewMarkdown ?? "", new RegExp(builderReportFileName));

const routerSource = await readFile(
  new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
  "utf8",
);
assert.match(
  routerSource,
  /architect_review_of_implementer_report_required:\s*"architect-review"/,
  "Architect review actions must route to the dedicated Architect Review workspace.",
);
assert.doesNotMatch(
  routerSource,
  /architect_review_of_implementer_report_required:\s*"builder-report-capture"/,
);

const appSource = await readFile(
  new URL("../src/renderer/app/App.tsx", import.meta.url),
  "utf8",
);
assert.match(appSource, /"architect-review":\s*\(\s*<ArchitectReviewScreen/);
assert.match(appSource, /Architect Review of Repair Implementer Report/);
assert.match(appSource, /routedAction\.workCardId/);
assert.match(appSource, /routedReportFileName/);
assert.match(appSource, /This workflow does not create or replace an/);
assert.match(appSource, /Compatibility diagnostics:/);
assert.match(appSource, /<details className=/);
assert.doesNotMatch(appSource, /<strong>Skipped Work Card files<\/strong>/);

console.log(
  "WC08-REPAIR05 focused fixture passed: repair Architect Review routing, current-action binding, repair-schema association, non-blocking diagnostics, and WC08 route authority verified.",
);
