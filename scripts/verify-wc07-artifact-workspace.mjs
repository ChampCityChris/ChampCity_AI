import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildArtifactReviewWorkspace,
  getArtifactDisplayName,
  getArtifactSupportScreen,
  isPlanningMarkdownPreviewable,
  shouldShowCurrentActionArtifactWorkspace,
} from "../dist/shared/workCards/artifactReviewWorkspace.js";
import {
  getCurrentRequiredAction,
  previewPlanningArtifact,
} from "../dist/main/workCards/workCardFileStore.js";

function artifact(path, role, extras = {}) {
  return { path, role, exists: true, ...extras };
}

function action(overrides = {}) {
  return {
    id: "operator_validation_required",
    workflowStep: "Work Card Loop",
    title: "Operator validation required",
    summary: "Fixture action",
    responsibleRole: "operator",
    phaseId: "phase-03",
    phaseTitle: "Fixture phase",
    workCardId: "WC07",
    workCardTitle: "Artifact Review Workspace",
    status: "needs_validation",
    reason: "Fixture reason",
    sourceArtifacts: [],
    missingArtifacts: [],
    warnings: [],
    ...overrides,
  };
}

function groupIds(model) {
  return new Set(model.sourceGroups.map((group) => group.id));
}

async function main() {
  const operatorModel = buildArtifactReviewWorkspace(
    action({
      sourceArtifacts: [
        artifact(
          "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md",
          "Work Card Markdown",
        ),
        artifact(
          "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07_artifact_review_workspace.md",
          "Implementer Report",
        ),
        artifact(
          "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC07_artifact_review_workspace.md",
          "Architect Review",
        ),
      ],
      missingArtifacts: [
        {
          path: "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07_artifact_review_workspace.md",
          reason: "Operator validation creates the durable record.",
        },
      ],
      expectedOutput: {
        path: "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC07_artifact_review_workspace.md",
        artifactType: "Operator Validation Record",
        description: "Fixture expected output",
      },
    }),
  );

  assert.deepEqual(
    [...groupIds(operatorModel)],
    ["work_card", "implementer_report", "architect_review"],
    "Operator validation should group Work Card, Implementer Report, and Architect Review evidence.",
  );
  assert.equal(operatorModel.expectedOutput?.exists, false);
  assert.equal(operatorModel.expectedOutput?.interactionState, "missing");
  assert.equal(operatorModel.missingArtifacts.length, 1);
  assert.equal(operatorModel.missingArtifacts[0].interactionState, "missing");
  assert.notEqual(
    operatorModel.sourceGroups[0].artifacts[0].displayName,
    operatorModel.sourceGroups[0].artifacts[0].path,
    "Readable labels must be primary instead of raw paths.",
  );

  const architectModel = buildArtifactReviewWorkspace(
    action({
      id: "architect_review_of_implementer_report_required",
      responsibleRole: "architect",
      status: "needs_review",
      sourceArtifacts: [
        artifact(
          "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md",
          "Work Card Markdown",
        ),
        artifact(
          "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07_artifact_review_workspace.md",
          "Implementer Report",
        ),
      ],
      expectedOutput: {
        path: "planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC07_artifact_review_workspace.md",
        artifactType: "Architect Review",
        description: "Fixture expected review",
      },
    }),
  );

  assert.deepEqual(
    [...groupIds(architectModel)],
    ["work_card", "implementer_report"],
    "Architect review should expose the Work Card and Implementer Report.",
  );
  assert.equal(
    architectModel.expectedOutput?.artifactType,
    "Architect Review",
  );

  for (const group of operatorModel.sourceGroups) {
    for (const entry of group.artifacts) {
      assert.equal(
        entry.interactionState,
        "preview",
        `Available planning Markdown should expose Preview: ${entry.path}`,
      );
    }
  }

  const repairModel = buildArtifactReviewWorkspace(
    action({
      id: "repair_validation_required",
      workCardId: "WC06-REPAIR01",
      workCardTitle: "Repair: Left-to-Right Workflow Visibility",
      sourceArtifacts: [
        artifact(
          "planning/phases/phase-03/Work_Cards/WC06_left_to_right_workflow_visibility.md",
          "Work Card Markdown",
        ),
        artifact(
          "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06_left_to_right_workflow_visibility.md",
          "Validation Report Markdown",
        ),
        artifact(
          "planning/phases/phase-03/Work_Cards/WC06-REPAIR01_current_action_validation_route_after_architect_review.md",
          "Repair Work Card",
        ),
        artifact(
          "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md",
          "Repair Implementer Report",
        ),
        artifact(
          "planning/phases/phase-03/Validation_Evidence/WC06-REPAIR01_current_action_validation_route_after_architect_review/image.png",
          "Source Evidence",
        ),
      ],
      expectedOutput: {
        path: "planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md",
        artifactType: "Repair Validation Record",
        description: "Fixture expected repair validation",
      },
    }),
  );
  const repairGroups = groupIds(repairModel);

  for (const requiredGroup of [
    "work_card",
    "validation_report",
    "repair",
    "source_evidence",
  ]) {
    assert.ok(
      repairGroups.has(requiredGroup),
      `Repair validation should expose ${requiredGroup}.`,
    );
  }
  assert.equal(repairModel.expectedOutput?.artifactType, "Repair Validation Record");
  const sourceEvidence = repairModel.sourceGroups
    .flatMap((group) => group.artifacts)
    .find((entry) => entry.groupId === "source_evidence");
  assert.equal(
    sourceEvidence?.interactionState,
    "not_previewable",
    "Existing image evidence should explicitly report Not previewable.",
  );

  const supportModel = buildArtifactReviewWorkspace(
    action({
      sourceArtifacts: [
        artifact(
          "planning/project/Project_Intake/PROJECT_INTAKE_fixture.json",
          "Project Intake JSON",
        ),
      ],
    }),
  );
  const supportArtifact = supportModel.sourceGroups[0].artifacts[0];

  assert.equal(supportArtifact.interactionState, "open_support_screen");
  assert.equal(supportArtifact.supportScreenId, "project-intake");
  assert.equal(
    getArtifactSupportScreen(
      "planning/project/Repository_Reconciliation/REPOSITORY_RECONCILIATION_fixture.json",
    ),
    "repository-reconciliation",
  );

  assert.equal(
    shouldShowCurrentActionArtifactWorkspace({
      hasContext: true,
      isViewingRoutedScreen: true,
      isViewingSupportingScreen: false,
    }),
    true,
    "The routed current-action workspace should own artifact review.",
  );
  assert.equal(
    shouldShowCurrentActionArtifactWorkspace({
      hasContext: true,
      isViewingRoutedScreen: false,
      isViewingSupportingScreen: true,
    }),
    false,
    "Supporting-screen mode must suppress the current-action artifact workspace.",
  );

  assert.equal(
    getArtifactDisplayName(
      "planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC07_artifact_review_workspace.md",
    ),
    "WC07 - Artifact Review Workspace",
  );
  assert.equal(
    isPlanningMarkdownPreviewable(
      "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md",
    ),
    true,
  );
  assert.equal(isPlanningMarkdownPreviewable("../package.json"), false);
  assert.equal(isPlanningMarkdownPreviewable("planning/../package.md"), false);
  assert.equal(isPlanningMarkdownPreviewable("planning/file.json"), false);

  const safePreview = await previewPlanningArtifact({
    path: "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.md",
  });
  assert.equal(safePreview.ok, true);
  assert.match(safePreview.content ?? "", /Artifact Review Workspace/);

  for (const unsafePath of [
    "package.json",
    "../AGENTS.md",
    "planning/../AGENTS.md",
    "planning/phases/phase-03/Work_Cards/WC07_artifact_review_workspace.json",
  ]) {
    const unsafePreview = await previewPlanningArtifact({ path: unsafePath });
    assert.equal(
      unsafePreview.ok,
      false,
      `Unsafe or unsupported preview path should be rejected: ${unsafePath}`,
    );
  }

  const liveResult = await getCurrentRequiredAction();
  assert.equal(liveResult.ok, true);
  assert.ok(liveResult.currentAction, "Live current-action context should load.");
  const liveModel = buildArtifactReviewWorkspace(liveResult.currentAction);
  assert.equal(
    liveModel.hasContext,
    true,
    "A live current action with evidence or expected output must not produce a blank artifact workspace.",
  );

  const rendererSource = await readFile(
    new URL("../src/renderer/app/WorkflowRouterShell.tsx", import.meta.url),
    "utf8",
  );
  const artifactListMarkers =
    rendererSource.match(/aria-label="Current action artifact list"/g) ?? [];

  assert.equal(
    artifactListMarkers.length,
    1,
    "The renderer must expose exactly one current-action artifact list.",
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
    /<EvidenceList|<MissingEvidenceList|<RouteOutcomes|<WarningGroups/,
    "The left panel must not render artifact lists, route outcomes, or warning stacks.",
  );
  assert.match(
    leftPanelSource,
    /Current action artifact counts/,
    "The left panel should retain compact artifact counts.",
  );
  assert.match(
    rendererSource,
    /Complete current action/,
    "The routed action form must remain available through an explicit workspace tab.",
  );

  console.log(
    "WC07 repair artifact workspace fixture passed: strict layout ownership, one artifact list, explicit interaction states, large preview routing, and current-action access verified.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
