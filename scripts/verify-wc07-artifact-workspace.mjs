import assert from "node:assert/strict";

import {
  buildArtifactReviewWorkspace,
  getArtifactDisplayName,
  isPlanningMarkdownPreviewable,
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
          "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC07_artifact_review_workspace.md",
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
  assert.equal(operatorModel.missingArtifacts.length, 1);
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
          "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC07_artifact_review_workspace.md",
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
          "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC06-REPAIR01_current_action_validation_route_after_architect_review.md",
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

  assert.equal(
    getArtifactDisplayName(
      "planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC07_artifact_review_workspace.md",
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

  console.log(
    "WC07 artifact workspace fixture passed: role grouping, readable labels, expected/missing separation, constrained preview, and live non-blank context verified.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
