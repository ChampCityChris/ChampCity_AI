import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getCurrentRequiredAction,
  listHumanValidationBuilderReports,
  listSavedWorkCards,
  previewArchitectReviewRecord,
} from "../dist/main/workCards/workCardFileStore.js";
import {
  findCurrentActionArchitectReviewWorkCardFileName,
  resolveCurrentActionArchitectReviewBinding,
} from "../dist/shared/workCards/architectReviewRecord.js";

const phase = "phase-03";
const targetId = "WC08-REPAIR04";
const targetTitle =
  "Controlled Route Recovery and Accurate Route Evidence Authority";
const targetWorkCardFileName =
  "WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json";
const targetBuilderReportFileName =
  "BUILDER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const parentBuilderReportFileName =
  "BUILDER_REPORT_WC08_current_step_context_inspector.md";
const referenceWorkCardFileName =
  "WC08-REPAIR05_architect_review_route_and_repair_work_card_association.json";
const referenceBuilderReportFileName =
  "BUILDER_REPORT_WC08-REPAIR05_architect_review_route_and_repair_work_card_association.md";
const expectedOutputFileName =
  "ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";

const syntheticAction = {
  id: "architect_review_of_implementer_report_required",
  workflowStep: "Work Card Loop",
  title: "Architect review of repair Implementer Report required",
  summary: "Synthetic routed binding authority fixture.",
  responsibleRole: "architect",
  phaseId: phase,
  phaseTitle: "Workflow Router Screen Correction",
  workCardId: targetId,
  workCardTitle: targetTitle,
  status: "needs_review",
  reason: "The current action controls the Architect Review target.",
  sourceArtifacts: [
    {
      path: `planning/phases/${phase}/Builder_Reports/${parentBuilderReportFileName}`,
      role: "Historical parent Implementer Report",
      exists: true,
    },
    {
      path: `planning/phases/${phase}/Builder_Reports/${referenceBuilderReportFileName}`,
      role: "Reference-card Implementer Report",
      exists: true,
    },
    {
      path: `planning/phases/${phase}/Builder_Reports/${targetBuilderReportFileName}`,
      role: "Repair Implementer Report",
      exists: true,
    },
  ],
  missingArtifacts: [],
  expectedOutput: {
    path: `planning/phases/${phase}/Architect_Reviews/${expectedOutputFileName}`,
    artifactType: "Repair Architect Review",
    description: "Architect decision for the current repair target.",
  },
  warnings: [],
};

const syntheticResolution =
  resolveCurrentActionArchitectReviewBinding(syntheticAction);
assert.deepEqual(syntheticResolution.errors, []);
assert.equal(syntheticResolution.binding?.phaseId, phase);
assert.equal(syntheticResolution.binding?.workCardId, targetId);
assert.equal(
  syntheticResolution.binding?.builderReportFileName,
  targetBuilderReportFileName,
  "The exact REPAIR04 report must win over stale parent and REPAIR05 reports.",
);
assert.equal(
  syntheticResolution.binding?.expectedOutputFileName,
  expectedOutputFileName,
);

const syntheticBoundWorkCard =
  findCurrentActionArchitectReviewWorkCardFileName(
    syntheticResolution.binding,
    [
      { fileName: referenceWorkCardFileName, workCardId: "WC08-REPAIR05" },
      { fileName: targetWorkCardFileName, workCardId: targetId },
    ],
  );
assert.equal(syntheticBoundWorkCard, targetWorkCardFileName);
assert.notEqual(
  syntheticBoundWorkCard,
  referenceWorkCardFileName,
  "A REPAIR05 reference-card selection must not override the REPAIR04 routed target.",
);

const currentActionResult = await getCurrentRequiredAction();
assert.equal(currentActionResult.ok, true, currentActionResult.errorMessages?.join(" "));
assert.equal(currentActionResult.currentAction?.id, syntheticAction.id);
assert.equal(currentActionResult.currentAction?.workCardId, targetId);
assert.notEqual(currentActionResult.currentAction?.workCardId, "WC01");
assert.notEqual(currentActionResult.currentAction?.workCardId, "WC09");

const liveResolution = resolveCurrentActionArchitectReviewBinding(
  currentActionResult.currentAction,
);
assert.deepEqual(liveResolution.errors, []);
assert.equal(liveResolution.binding?.phaseId, phase);
assert.equal(liveResolution.binding?.workCardId, targetId);
assert.equal(
  liveResolution.binding?.builderReportFileName,
  targetBuilderReportFileName,
);
assert.equal(
  liveResolution.binding?.expectedOutputFileName,
  expectedOutputFileName,
);

const workCardList = await listSavedWorkCards(phase);
assert.equal(workCardList.ok, true, workCardList.errorMessages?.join(" "));
const liveBoundWorkCard = findCurrentActionArchitectReviewWorkCardFileName(
  liveResolution.binding,
  workCardList.workCards ?? [],
);
assert.equal(liveBoundWorkCard, targetWorkCardFileName);

const reportList = await listHumanValidationBuilderReports({
  phase,
  workCardFileName: liveBoundWorkCard,
});
assert.equal(reportList.ok, true, reportList.errorMessages?.join(" "));
assert.equal(reportList.defaultFileName, targetBuilderReportFileName);
assert.ok(
  reportList.options?.some(
    (option) =>
      option.fileName === targetBuilderReportFileName && option.isDefaultMatch,
  ),
  "The exact REPAIR04 Implementer Report must be the default association.",
);

const completeReviewInput = {
  phase,
  workCardFileName: targetWorkCardFileName,
  builderReportFileName: targetBuilderReportFileName,
  currentActionBinding: liveResolution.binding,
  decision: "Ready for Operator validation",
  workCardCompliance: "The implementation remains within WC08-REPAIR04 scope.",
  changedFilesReviewed: "Reviewed the reported source and focused fixture changes.",
  acceptanceCriteriaAssessment: "The acceptance criteria are addressed.",
  validationClaimsAssessment: "The automated validation claims are adequate.",
  skippedChecksAssessment: "Operator validation remains intentionally unperformed.",
  observationRegisterImpact: "No observation status is changed by this preview.",
  operatorValidationSteps: "1. Confirm the routed REPAIR04 target and exact report.",
  requiredRepair: "None identified by this deterministic fixture.",
};

const preview = await previewArchitectReviewRecord(completeReviewInput);
assert.equal(preview.ok, true, preview.errorMessages?.join(" "));
assert.equal(preview.workCardId, targetId);
assert.equal(preview.workCardFileName, targetWorkCardFileName);
assert.equal(preview.builderReportFileName, targetBuilderReportFileName);
assert.equal(preview.savedFileName, expectedOutputFileName);
assert.equal(preview.validation?.valid, true, preview.validation?.errors.join(" "));

for (const mismatchedReport of [
  parentBuilderReportFileName,
  referenceBuilderReportFileName,
]) {
  const mismatch = await previewArchitectReviewRecord({
    ...completeReviewInput,
    builderReportFileName: mismatchedReport,
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.errorMessages?.join(" ") ?? "", /WC08-REPAIR04/);
  assert.match(
    mismatch.errorMessages?.join(" ") ?? "",
    new RegExp(mismatchedReport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}

const referencePairMismatch = await previewArchitectReviewRecord({
  ...completeReviewInput,
  workCardFileName: referenceWorkCardFileName,
  builderReportFileName: referenceBuilderReportFileName,
});
assert.equal(referencePairMismatch.ok, false);
assert.match(
  referencePairMismatch.errorMessages?.join(" ") ?? "",
  /Current action targets WC08-REPAIR04/,
);
assert.match(
  referencePairMismatch.errorMessages?.join(" ") ?? "",
  /selected Work Card is WC08-REPAIR05/,
);
assert.match(
  referencePairMismatch.errorMessages?.join(" ") ?? "",
  /Reference card does not control this routed review/,
);

const appSource = await readFile(
  new URL("../src/renderer/app/App.tsx", import.meta.url),
  "utf8",
);
const architectReviewScreenSource = appSource.slice(
  appSource.indexOf("function ArchitectReviewScreen"),
  appSource.indexOf("function ArchitectReviewTextArea"),
);
assert.match(architectReviewScreenSource, /Bound from current action:/);
assert.match(
  architectReviewScreenSource,
  /Reference card is optional navigation context and does not/,
);
assert.match(
  architectReviewScreenSource,
  /disabled=\{Boolean\(routedAction\)\}/,
);
assert.match(architectReviewScreenSource, /setDraft\(\{ \.\.\.initialArchitectReviewDraft \}\)/);
assert.match(architectReviewScreenSource, /setPreviewResult\(null\)/);
assert.match(architectReviewScreenSource, /setSaveResult\(null\)/);
assert.doesNotMatch(
  architectReviewScreenSource.slice(
    0,
    architectReviewScreenSource.indexOf("return ("),
  ),
  /activeCard|onActiveCardChange/,
  "The routed Architect Review form must not consume or update Reference-card state.",
);

const storeSource = await readFile(
  new URL("../src/main/workCards/workCardFileStore.ts", import.meta.url),
  "utf8",
);
assert.match(storeSource, /validateArchitectReviewAssociation/);
assert.match(
  storeSource,
  /const preview = await previewArchitectReviewRecord\(input\)/,
  "Save must reuse the same routed association validation as preview.",
);

const routerSource = await readFile(
  new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
  "utf8",
);
assert.match(
  routerSource,
  /architect_review_of_implementer_report_required:\s*"architect-review"/,
);
assert.doesNotMatch(
  routerSource,
  /architect_review_of_implementer_report_required:\s*"builder-report-capture"/,
);

console.log(
  "WC08-REPAIR06 focused fixture passed: current-action target authority, exact REPAIR04 report binding, reference-card independence, mismatch rejection, reset behavior, output targeting, and route preservation verified.",
);
