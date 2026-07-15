import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getCurrentRequiredAction,
  listHumanValidationImplementerReports,
  listSavedWorkCards,
  previewArchitectReviewRecord,
} from "../dist/main/workCards/workCardFileStore.js";
import {
  findCurrentActionArchitectReviewWorkCardFileName,
  resolveCurrentActionArchitectReviewBinding,
} from "../dist/shared/workCards/architectReviewRecord.js";
import { authoritativeCurrentActionImplementerReportStatus } from "../dist/shared/workCards/currentRequiredAction.js";

const phase = "phase-03";
const targetId = "WC08-REPAIR04";
const targetTitle =
  "Controlled Route Recovery and Accurate Route Evidence Authority";
const targetWorkCardFileName =
  "WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json";
const targetImplementerReportFileName =
  "IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md";
const parentImplementerReportFileName =
  "IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md";
const referenceWorkCardFileName =
  "WC08-REPAIR05_architect_review_route_and_repair_work_card_association.json";
const referenceImplementerReportFileName =
  "IMPLEMENTER_REPORT_WC08-REPAIR05_architect_review_route_and_repair_work_card_association.md";
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
      path: `planning/phases/${phase}/Implementer_Reports/${parentImplementerReportFileName}`,
      role: "Historical parent Implementer Report",
      exists: true,
    },
    {
      path: `planning/phases/${phase}/Implementer_Reports/${referenceImplementerReportFileName}`,
      role: "Reference-card Implementer Report",
      exists: true,
    },
    {
      path: `planning/phases/${phase}/Implementer_Reports/${targetImplementerReportFileName}`,
      role: "Repair Implementer Report",
      status: authoritativeCurrentActionImplementerReportStatus,
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
assert.equal(syntheticResolution.binding?.bindingSource, "current_action");
assert.equal(
  syntheticResolution.binding?.currentActionId,
  "architect_review_of_implementer_report_required",
);
assert.equal(syntheticResolution.binding?.phaseId, phase);
assert.equal(syntheticResolution.binding?.workCardId, targetId);
assert.equal(
  syntheticResolution.binding?.implementerReportPath,
  `planning/phases/${phase}/Implementer_Reports/${targetImplementerReportFileName}`,
);
assert.equal(
  syntheticResolution.binding?.implementerReportFileName,
  targetImplementerReportFileName,
  "The exact REPAIR04 report must win over stale parent and REPAIR05 reports.",
);
assert.equal(
  syntheticResolution.binding?.expectedOutputFileName,
  expectedOutputFileName,
);
assert.equal(
  syntheticResolution.binding?.expectedOutputPath,
  `planning/phases/${phase}/Architect_Reviews/${expectedOutputFileName}`,
);
assert.deepEqual(syntheticResolution.binding?.blockingState, {
  blocked: false,
  issues: [],
});

const ambiguousResolution = resolveCurrentActionArchitectReviewBinding({
  ...syntheticAction,
  sourceArtifacts: syntheticAction.sourceArtifacts.map((artifact) => ({
    ...artifact,
    status: authoritativeCurrentActionImplementerReportStatus,
  })),
});
assert.equal(ambiguousResolution.binding?.blockingState.blocked, true);
assert.ok(
  ambiguousResolution.binding?.blockingState.issues.some(
    (issue) => issue.kind === "ambiguity",
  ),
  "Multiple marked source reports must produce a blocking ambiguity state.",
);

const mismatchedResolution = resolveCurrentActionArchitectReviewBinding({
  ...syntheticAction,
  sourceArtifacts: [
    {
      path: `planning/phases/${phase}/Implementer_Reports/${referenceImplementerReportFileName}`,
      role: "Incorrect authoritative report",
      status: authoritativeCurrentActionImplementerReportStatus,
      exists: true,
    },
  ],
});
assert.equal(mismatchedResolution.binding?.blockingState.blocked, true);
assert.ok(
  mismatchedResolution.binding?.blockingState.issues.some(
    (issue) => issue.kind === "mismatch",
  ),
  "A marked report for a different repair must produce a blocking mismatch state.",
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
assert.equal(liveResolution.binding?.bindingSource, "current_action");
assert.equal(liveResolution.binding?.phaseId, phase);
assert.equal(liveResolution.binding?.workCardId, targetId);
assert.equal(
  liveResolution.binding?.implementerReportFileName,
  targetImplementerReportFileName,
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

const reportList = await listHumanValidationImplementerReports({
  phase,
  workCardFileName: liveBoundWorkCard,
});
assert.equal(reportList.ok, true, reportList.errorMessages?.join(" "));
assert.equal(reportList.defaultFileName, targetImplementerReportFileName);
assert.ok(
  reportList.options?.some(
    (option) =>
      option.fileName === targetImplementerReportFileName && option.isDefaultMatch,
  ),
  "The exact REPAIR04 Implementer Report must be the default association.",
);

const completeReviewInput = {
  phase,
  workCardFileName: targetWorkCardFileName,
  implementerReportFileName: targetImplementerReportFileName,
  routedReviewBinding: liveResolution.binding,
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
assert.equal(preview.implementerReportFileName, targetImplementerReportFileName);
assert.equal(preview.savedFileName, expectedOutputFileName);
assert.equal(preview.validation?.valid, true, preview.validation?.errors.join(" "));

for (const mismatchedReport of [
  parentImplementerReportFileName,
  referenceImplementerReportFileName,
]) {
  const mismatch = await previewArchitectReviewRecord({
    ...completeReviewInput,
    implementerReportFileName: mismatchedReport,
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
  implementerReportFileName: referenceImplementerReportFileName,
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
  /disabled=\{Boolean\(routedReviewBinding\)\}/,
);
assert.match(architectReviewScreenSource, /routedReviewBinding\?\.blockingState\.blocked/);
assert.match(architectReviewScreenSource, /routedReviewBinding\.implementerReportPath/);
assert.match(architectReviewScreenSource, /routedReviewBinding\.expectedOutputPath/);
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
  /architect_review_of_implementer_report_required:\s*"implementer-report-capture"/,
);

console.log(
  "WC08-REPAIR06 focused fixture passed: typed current-action contract authority, exact REPAIR04 report binding, blocking-state propagation, reference-card independence, mismatch rejection, output targeting, and route preservation verified.",
);
