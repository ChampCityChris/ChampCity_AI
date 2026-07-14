import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildCurrentStepContextInspector,
  buildCurrentStepRouteContext,
  shouldShowCurrentStepContextInspector,
} from "../dist/shared/workCards/currentStepContextInspector.js";
import { getCurrentRequiredAction } from "../dist/main/workCards/workCardFileStore.js";

function artifact(path, role, extras = {}) {
  return { path, role, exists: true, ...extras };
}

function action(overrides = {}) {
  return {
    id: "repair_validation_required",
    workflowStep: "Work Card Loop",
    title: "Repair validation required",
    summary: "Validate the completed repair.",
    responsibleRole: "operator",
    phaseId: "phase-03",
    phaseTitle: "Workflow Router Screen Correction",
    workCardId: "WC08-REPAIR01",
    workCardTitle: "Current Step Context Inspector repair",
    status: "needs_validation",
    reason:
      "The parent validation required repair and the repair Implementer Report is available.",
    sourceArtifacts: [],
    missingArtifacts: [],
    expectedOutput: {
      path: "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_current_step_context_inspector.md",
      artifactType: "Repair Validation Record",
      description: "Operator validation of the repair.",
    },
    successRoute: "Resume the Work Card loop.",
    failureRoute: "Create another repair Work Card.",
    repairRoute: "Return to repair implementation.",
    manualFallback: {
      available: true,
      instructions: "Use the expected repo-relative planning record.",
      artifactPath:
        "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_current_step_context_inspector.md",
    },
    warnings: [],
    ...overrides,
  };
}

function fixtureState() {
  const workCardPath =
    "planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md";
  const reportPath =
    "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08_current_step_context_inspector.md";
  const reviewPath =
    "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08_current_step_context_inspector.md";
  const failedValidationPath =
    "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.md";
  const repairPath =
    "planning/phases/phase-03/Work_Cards/WC08-REPAIR01_current_step_context_inspector.md";
  const repairReportPath =
    "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08-REPAIR01_current_step_context_inspector.md";

  return {
    project: {
      projectName: "ChampCity A/I",
      projectIntake: artifact(
        "planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.json",
        "Project Intake",
      ),
      projectInterview: artifact(
        "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json",
        "Project Interview",
      ),
      reconciliationReview: artifact(
        "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_champcity_a_i.json",
        "Reconciliation Review",
      ),
      projectRoadmap: artifact(
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.json",
        "Living Roadmap",
        { status: "active" },
      ),
      phaseMap: artifact(
        "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.json",
        "Phase Map",
        { status: "active" },
      ),
    },
    activePhase: {
      phaseId: "phase-03",
      phaseTitle: "Workflow Router Screen Correction",
      status: "active",
      sourceArtifacts: [
        artifact(
          "planning/phases/phase-03/Phase_Planning.md",
          "Phase Planning",
        ),
        artifact(
          "planning/phases/phase-03/Work_Card_Plan.md",
          "Work Card Plan",
        ),
      ],
      workCardCandidates: [],
      workCards: [
        {
          workCardId: "WC08",
          title: "Current Step Context Inspector",
          phaseId: "phase-03",
          status: "repair_required",
          sourceArtifacts: [artifact(workCardPath, "Work Card Markdown")],
          implementerReport: artifact(reportPath, "Implementer Report"),
          architectReview: {
            status: "Ready for Operator validation",
            sourceArtifact: artifact(reviewPath, "Architect Review"),
          },
          validation: {
            result: "Fail",
            decision: "Repair required",
            repairRequired: true,
            sourceArtifacts: [
              artifact(failedValidationPath, "Validation Report Markdown"),
            ],
          },
          repair: {
            repairId: "WC08-REPAIR01",
            repairWorkCard: artifact(repairPath, "Repair Work Card"),
            implementerReport: artifact(
              repairReportPath,
              "Repair Implementer Report",
            ),
          },
        },
      ],
      closeout: {
        decision: "Pending later Work Cards",
        sourceArtifact: artifact(
          "planning/phases/phase-03/Closeout_Reports/PHASE_CLOSEOUT_phase_03.json",
          "Phase Closeout",
        ),
      },
      roadmapUpdatedAfterCloseout: false,
      nextPhaseActivated: false,
    },
  };
}

async function main() {
  const fixtureAction = action({
    sourceArtifacts: [
      artifact(
        "planning/phases/phase-03/Work_Cards/WC08_current_step_context_inspector.md",
        "Work Card Markdown",
      ),
      artifact(
        "planning/phases/phase-03/Legacy/OLD_PHASE_PLAN.md",
        "Historical Phase Plan",
        { status: "historical" },
      ),
    ],
    missingArtifacts: [
      {
        path: "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_current_step_context_inspector.md",
        reason: "Operator validation creates the durable repair decision.",
      },
    ],
    warnings: [
      {
        code: "stale_current_executable_work_card",
        message: "The roadmap points to WC07 while durable evidence routes to WC08.",
        severity: "warning",
        sourceArtifactPath:
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.json",
      },
      {
        code: "superseded_phase_artifact",
        message: "An older Phase Planning file is superseded.",
        severity: "info",
        sourceArtifactPath:
          "planning/phases/phase-03/Legacy/SUPERSEDED_PHASE_PLAN.md",
      },
      {
        code: "phase_map_json_invalid",
        message: "The supporting Phase Map is not valid JSON.",
        severity: "blocking",
        sourceArtifactPath:
          "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.json",
      },
    ],
  });
  const routeContext = buildCurrentStepRouteContext(
    fixtureState(),
    fixtureAction,
  );
  const categoryIds = new Set(
    routeContext.categories.map((category) => category.id),
  );

  for (const requiredCategory of [
    "project",
    "phase",
    "work_card",
    "implementer_report",
    "architect_review",
    "operator_validation",
    "repair",
    "phase_closeout",
    "roadmap",
    "next_phase",
  ]) {
    assert.ok(
      categoryIds.has(requiredCategory),
      `Route context should include ${requiredCategory}.`,
    );
  }

  const repairCategory = routeContext.categories.find(
    (category) => category.id === "repair",
  );
  const validationCategory = routeContext.categories.find(
    (category) => category.id === "operator_validation",
  );

  assert.equal(repairCategory?.authority, "controlling");
  assert.equal(validationCategory?.authority, "controlling");
  assert.match(validationCategory?.summary ?? "", /expects an Operator Validation record/i);

  const model = buildCurrentStepContextInspector(
    fixtureAction,
    routeContext,
    {
      currentActionIpcState: "available",
      planningArtifactPreviewState: "available",
    },
  );

  assert.equal(model.readOnly, true);
  assert.match(model.explanation.priorityReason, /priority over later work/i);
  assert.match(model.explanation.advancementBlock, /has not advanced/i);
  assert.equal(model.nextAction.responsibleParty, "Operator");
  assert.match(model.nextAction.expectedOutput, /Repair Validation Record/i);
  assert.equal(model.routeChangeConditions.length > 0, true);
  assert.match(model.correctionGuidance.durableAction, /Route Review Request/i);
  assert.match(model.correctionGuidance.governanceSummary, /cannot approve/i);
  assert.equal(model.route.reason, fixtureAction.reason);
  assert.deepEqual(
    model.route.outcomes.map((outcome) => outcome.id),
    ["success", "failure", "repair"],
  );
  assert.equal(model.missingRecords.length, 1);
  assert.equal(model.missingRecords[0].recordType, "Repair Validation Report");
  assert.equal(model.missingRecords[0].impact, "expected_next");
  assert.match(model.missingRecords[0].reason, /durable repair decision/i);

  const classifications = new Set(
    model.evidenceHealth.map((warning) => warning.classification),
  );
  assert.ok(classifications.has("stale"));
  assert.ok(classifications.has("superseded"));
  assert.ok(classifications.has("malformed"));
  assert.ok(classifications.has("historical"));
  assert.equal(
    model.evidenceHealth
      .filter((warning) =>
        ["stale", "superseded", "historical"].includes(
          warning.classification,
        ),
      )
      .every((warning) => warning.authority === "historical"),
    true,
    "Stale, superseded, and historical evidence must not be controlling authority.",
  );

  assert.equal(
    model.capabilities.find(
      (capability) => capability.id === "current_action_ipc",
    )?.state,
    "available",
  );
  assert.equal(
    model.capabilities.find(
      (capability) => capability.id === "planning_artifact_preview",
    )?.state,
    "available",
  );
  assert.equal(
    model.capabilities.find(
      (capability) => capability.id === "durable_state_write",
    )?.state,
    "not_reported",
  );
  assert.equal(
    model.capabilities.find(
      (capability) => capability.id === "mcp_direct_write",
    )?.state,
    "not_reported",
  );
  assert.match(model.artifactGuidance, /Artifacts tab/i);

  assert.equal(
    shouldShowCurrentStepContextInspector({
      hasAction: true,
      isViewingRoutedScreen: true,
      isViewingSupportingScreen: false,
    }),
    true,
  );
  assert.equal(
    shouldShowCurrentStepContextInspector({
      hasAction: true,
      isViewingRoutedScreen: false,
      isViewingSupportingScreen: true,
    }),
    false,
    "Supporting-screen mode must suppress the full route context inspector.",
  );

  const liveResult = await getCurrentRequiredAction();
  assert.equal(liveResult.ok, true, liveResult.errorMessages?.join(" "));
  assert.ok(liveResult.currentAction, "Live current action should load.");
  assert.ok(liveResult.routeContext, "Live route context should load.");
  assert.equal(
    liveResult.routeContext?.categories.some(
      (category) => category.id === "implementer_report",
    ),
    true,
  );

  const liveModel = buildCurrentStepContextInspector(
    liveResult.currentAction,
    liveResult.routeContext,
    {
      currentActionIpcState: "available",
      planningArtifactPreviewState: "available",
    },
  );
  assert.equal(
    [
      "repair_implementer_handoff_required",
      "architect_review_of_implementer_report_required",
      "repair_validation_required",
      "architect_review_of_validation_report_required",
    ].includes(liveModel.route.actionId),
    true,
  );
  assert.equal(liveModel.route.workCardLabel.startsWith("WC08-REPAIR04"), true);

  const rendererSource = await readFile(
    new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
    "utf8",
  );
  const artifactListMarkers =
    rendererSource.match(/aria-label="Current action artifact list"/g) ?? [];

  assert.equal(
    artifactListMarkers.length,
    1,
    "WC08 must not duplicate the WC07 artifact list.",
  );
  assert.match(rendererSource, />\s*Why this step\?\s*</);
  assert.match(rendererSource, /aria-label="Why this step\? Route context"/);
  assert.match(rendererSource, /Why this is the current action/);
  assert.match(rendererSource, /What happens next/);
  assert.match(rendererSource, /What would change this route/);
  assert.match(rendererSource, /This route looks wrong/);
  assert.match(rendererSource, /Detailed route diagnostics/);
  assert.match(rendererSource, />\s*Artifacts\s*/);
  assert.match(rendererSource, /Complete current action/);
  assert.doesNotMatch(
    rendererSource,
    /function ContextInspector\(/,
    "The obsolete always-visible right inspector must not remain.",
  );

  const leftPanelStart = rendererSource.indexOf(
    "function CurrentRequiredActionPanel(",
  );
  const leftPanelEnd = rendererSource.indexOf(
    "function CurrentActionStatePanel(",
  );
  const leftPanelSource = rendererSource.slice(leftPanelStart, leftPanelEnd);

  assert.doesNotMatch(
    leftPanelSource,
    /<EvidenceList|<MissingEvidenceList|<RouteOutcomes|<WarningGroups|<CurrentStepContextInspector/,
    "The compact left panel must not regain inspector, artifact, missing, route, or warning stacks.",
  );

  const inspectorStart = rendererSource.indexOf(
    "function CurrentStepContextInspector(",
  );
  const inspectorEnd = rendererSource.indexOf("function ActivityLog(");
  const inspectorSource = rendererSource.slice(inspectorStart, inspectorEnd);

  assert.doesNotMatch(
    inspectorSource,
    /CurrentActionArtifactReview|sourceArtifacts\.map|previewPlanningArtifact|onSave|onApprove|onValidate|onRepair|onAdvance/,
    "The route context inspector must remain a read-only summary, not another artifact browser or mutation surface.",
  );

  console.log(
    "WC08 current-step context inspector fixture passed: route explanation, state categories, missing records, warning authority, capability reporting, read-only behavior, layout ownership, and support-mode suppression verified.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
