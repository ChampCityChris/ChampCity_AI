import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getCurrentRequiredAction } from "../dist/main/workCards/workCardFileStore.js";
import { buildCurrentStepContextInspector } from "../dist/shared/workCards/currentStepContextInspector.js";

function artifact(path, role) {
  return { path, role, exists: true };
}

function routeAction(overrides = {}) {
  return {
    id: "architect_review_of_validation_report_required",
    workflowStep: "Work Card Loop",
    title: "Architect review of Validation Report required",
    summary:
      "Review the Operator validation evidence and record the workflow disposition.",
    responsibleRole: "architect",
    phaseId: "phase-example",
    phaseTitle: "Example Workflow Phase",
    workCardId: "WC42-REPAIR07",
    workCardTitle: "Generic route explanation fixture",
    status: "needs_review",
    reason:
      "Operator validation evidence is available, but Architect disposition is still pending.",
    sourceArtifacts: [
      artifact(
        "planning/phases/phase-example/Work_Cards/WC42-REPAIR07_generic.json",
        "Repair Work Card JSON",
      ),
      artifact(
        "planning/phases/phase-example/Implementer_Reports/IMPLEMENTER_REPORT_WC42-REPAIR07_generic.md",
        "Repair Implementer Report",
      ),
      artifact(
        "planning/phases/phase-example/Validation_Reports/VALIDATION_REPORT_WC42-REPAIR07_generic.md",
        "Validation Report Markdown",
      ),
    ],
    missingArtifacts: [],
    expectedOutput: {
      path: "planning/phases/phase-example/Validation_Reports/VALIDATION_REPORT_WC42-REPAIR07_generic.md",
      artifactType: "Architect validation disposition",
      description:
        "Complete the pending disposition using the recorded validation evidence.",
    },
    successRoute: "the next unresolved Work Card obligation",
    repairRoute: "an exact-scope repair Work Card",
    evidenceClassifications: [
      {
        id: "accepted-repair-card",
        label: "WC42-REPAIR07 Work Card",
        summary: "The Repair Work Card controls the current route.",
        classification: "accepted_controlling",
      },
      {
        id: "pending-validation",
        label: "WC42-REPAIR07 Validation Report",
        summary: "Validation evidence exists and Architect disposition is pending.",
        classification: "present_pending_disposition",
      },
    ],
    warnings: [],
    ...overrides,
  };
}

function routeContext() {
  return {
    projectName: "Fixture Project",
    categories: [
      {
        id: "project",
        label: "Project",
        status: "Active workflow",
        summary: "Durable project records identify the active phase.",
        authority: "controlling",
        evidenceCount: 2,
      },
      {
        id: "phase",
        label: "Phase",
        status: "Active",
        summary: "The current phase is active.",
        authority: "controlling",
        evidenceCount: 2,
      },
      {
        id: "work_card",
        label: "Work Card",
        status: "Repair validation recorded",
        summary: "The repair Work Card is the active workflow obligation.",
        authority: "controlling",
        evidenceCount: 1,
      },
      {
        id: "implementer_report",
        label: "Implementer Report",
        status: "Available",
        summary: "An Implementer Report records the completed repair pass.",
        authority: "controlling",
        evidenceCount: 1,
      },
      {
        id: "architect_review",
        label: "Architect Review",
        status: "Ready for Operator validation",
        summary: "Architect review authorized Operator validation.",
        authority: "controlling",
        evidenceCount: 1,
      },
      {
        id: "operator_validation",
        label: "Operator Validation",
        status: "Pass - Architect disposition pending",
        summary:
          "Operator evidence exists, but Architect disposition controls what happens next.",
        authority: "controlling",
        evidenceCount: 1,
      },
      {
        id: "repair",
        label: "Repair",
        status: "Pass - Architect disposition pending",
        summary: "The repair remains active until its disposition is resolved.",
        authority: "controlling",
        evidenceCount: 4,
      },
    ],
  };
}

const action = routeAction();
const model = buildCurrentStepContextInspector(action, routeContext(), {
  currentActionIpcState: "available",
  planningArtifactPreviewState: "available",
});

assert.equal(model.readOnly, true);
assert.equal(model.nextAction.responsibleParty, "Architect");
assert.match(model.nextAction.requiredAction, /Operator validation evidence/i);
assert.match(model.nextAction.expectedOutput, /Architect validation disposition/i);
assert.match(model.nextAction.afterCompletion, /next unresolved Work Card obligation/i);
assert.equal(
  model.explanation.acceptedEvidence.some((item) =>
    /WC42-REPAIR07 Work Card/i.test(item),
  ),
  true,
  "The plain-language explanation must identify accepted controlling evidence.",
);
assert.match(model.explanation.pendingEvidence.join(" "), /disposition.*pending/i);
assert.doesNotMatch(
  model.explanation.acceptedEvidence.join(" "),
  /disposition.*pending/i,
  "Pending evidence must not be labeled accepted or controlling.",
);
assert.match(model.explanation.priorityReason, /WC42-REPAIR07/i);
assert.match(model.explanation.priorityReason, /priority over later work/i);
assert.match(model.explanation.advancementBlock, /has not advanced/i);
assert.match(model.explanation.advancementBlock, /architect validation disposition/i);
assert.equal(
  model.routeChangeConditions.some((condition) =>
    /Architect validation disposition/i.test(condition.description),
  ),
  true,
);
assert.equal(
  model.correctionGuidance.recordsToReview.includes(
    "WC42-REPAIR07 Validation Report",
  ),
  true,
);
assert.match(model.correctionGuidance.currentRoute, /WC42-REPAIR07/i);
assert.match(model.correctionGuidance.durableAction, /Route Review Request/i);
assert.match(model.correctionGuidance.governanceSummary, /cannot approve/i);

const alternateModel = buildCurrentStepContextInspector(
  routeAction({
    id: "operator_validation_required",
    title: "Operator validation required",
    summary: "Validate the reviewed implementation.",
    responsibleRole: "operator",
    workCardId: "WC77",
    workCardTitle: "Alternate generic fixture",
    reason:
      "Architect review evidence exists, but Operator validation evidence is missing.",
    missingArtifacts: [
      {
        path: "planning/phases/phase-example/Validation_Reports/VALIDATION_REPORT_WC77_alternate.md",
        reason: "Operator validation creates the required durable record.",
      },
    ],
    expectedOutput: {
      path: "planning/phases/phase-example/Validation_Reports/VALIDATION_REPORT_WC77_alternate.md",
      artifactType: "Operator Validation Record",
      description: "Record the functional validation result and evidence.",
    },
    successRoute: "Architect disposition",
    repairRoute: "repair review if validation fails",
  }),
  routeContext(),
  {
    currentActionIpcState: "available",
    planningArtifactPreviewState: "available",
  },
);

assert.match(alternateModel.explanation.priorityReason, /WC77/i);
assert.doesNotMatch(alternateModel.explanation.priorityReason, /WC42/i);
assert.match(alternateModel.nextAction.expectedOutput, /Operator Validation Record/i);
assert.equal(alternateModel.nextAction.responsibleParty, "Operator");

const modelSource = await readFile(
  new URL("../src/shared/workCards/currentStepContextInspector.ts", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  modelSource,
  /WC08|WC09|WC42|WC77/,
  "Route explanation source must not hard-code example-specific Work Card IDs.",
);

const rendererSource = await readFile(
  new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
  "utf8",
);
const tabListStart = rendererSource.indexOf('aria-label="Current action workspace"');
const tabListEnd = rendererSource.indexOf("</div>", tabListStart);
const tabListSource = rendererSource.slice(tabListStart, tabListEnd);
const actionTabIndex = tabListSource.indexOf("Complete current action");
const artifactsTabIndex = tabListSource.indexOf("Artifacts");
const explanationTabIndex = tabListSource.indexOf("Why this step?");

assert.ok(actionTabIndex >= 0 && artifactsTabIndex >= 0 && explanationTabIndex >= 0);
assert.ok(
  actionTabIndex < artifactsTabIndex && artifactsTabIndex < explanationTabIndex,
  "Workspace tabs must follow Complete current action, Artifacts, Why this step?.",
);
assert.match(rendererSource, /useState<[\s\S]*?>\("action"\)/);
assert.match(rendererSource, /aria-label="Why this step\? Route context"/);

const inspectorStart = rendererSource.indexOf(
  "function CurrentStepContextInspector(",
);
const inspectorEnd = rendererSource.indexOf("function ActivityLog(");
const inspectorSource = rendererSource.slice(inspectorStart, inspectorEnd);
const whyIndex = inspectorSource.indexOf("Why this is the current action");
const nextIndex = inspectorSource.indexOf("What happens next");
const changeIndex = inspectorSource.indexOf("What would change this route");
const correctionIndex = inspectorSource.indexOf("This route looks wrong");
const diagnosticsIndex = inspectorSource.indexOf("Detailed route diagnostics");

assert.ok(
  whyIndex < nextIndex &&
    nextIndex < changeIndex &&
    changeIndex < correctionIndex &&
    correctionIndex < diagnosticsIndex,
  "Plain-language explanation, next step, route changes, correction guidance, and diagnostics must appear in that order.",
);
assert.match(
  inspectorSource,
  /<details className="group rounded-xl border border-border bg-card\/15">[\s\S]*Detailed route diagnostics/,
  "Technical diagnostics must remain available inside a secondary collapsed details control.",
);

const correctionSource = inspectorSource.slice(correctionIndex, diagnosticsIndex);
assert.doesNotMatch(
  correctionSource,
  /saveHumanValidationRecord|saveArchitectPrompt|saveImplementerReportCapture|previewPlanningArtifact/,
  "The route-correction affordance must not approve, validate, mutate workflow state, or become an artifact browser.",
);
assert.match(inspectorSource, /saveRouteReviewRequest/);
assert.doesNotMatch(correctionSource, /Handoff summary|select and copy/);
assert.doesNotMatch(
  inspectorSource,
  /CurrentActionArtifactReview|sourceArtifacts\.map|previewPlanningArtifact/,
  "Why this step must remain a summary, not a second artifact list or preview surface.",
);

const currentActionSource = await readFile(
  new URL("../src/shared/workCards/currentRequiredAction.ts", import.meta.url),
  "utf8",
);
assert.match(currentActionSource, /repair\.validation\?\.architectDispositionPending/);
assert.match(currentActionSource, /id: "repair_validation_required"/);
assert.match(currentActionSource, /id: "architect_review_of_validation_report_required"/);

const liveResult = await getCurrentRequiredAction();
assert.equal(liveResult.ok, true, liveResult.errorMessages?.join(" "));
assert.ok(liveResult.currentAction, "Live current action must load.");
assert.notEqual(
  liveResult.currentAction.workCardId,
  "WC09",
  "Pending WC08 repair obligations must continue to block premature WC09 routing.",
);
assert.ok(
  [
    "repair_implementer_handoff_required",
    "architect_review_of_implementer_report_required",
    "repair_validation_required",
    "architect_review_of_validation_report_required",
  ].includes(liveResult.currentAction.id),
  `Expected an unresolved repair validation route, received ${liveResult.currentAction.id}.`,
);

console.log(
  "WC08-REPAIR01 focused fixture passed: generic route explanation, evidence authority labels, governed correction guidance, secondary diagnostics, human tab order, and repair-routing preservation verified.",
);
