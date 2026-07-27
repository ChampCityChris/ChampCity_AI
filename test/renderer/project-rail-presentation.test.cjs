const assert = require("node:assert/strict");
const test = require("node:test");

const {
  deriveArchitectInterviewRailStatus,
  deriveProjectRailPresentation,
  isArchitectInterviewDualPaneWorkspace,
  shouldRenderArchitectInterviewDispositionControls,
  shouldRenderGenericPreviewDispositionControls,
  shouldRenderInlineProjectIntakeDisposition,
} = require("../../dist/shared/workspaces/projectRailPresentation.js");

test("top rail separates viewed workspace from current required workspace", () => {
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "project-intake-capture",
    statusLabel: "Completed",
  });
  const architectInterview = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "architect-interview",
  });

  assert.equal(projectIntake.isSelected, true);
  assert.equal(projectIntake.isRequired, false);
  assert.equal(architectInterview.isSelected, false);
  assert.equal(architectInterview.isRequired, true);
});

test("top rail allows the viewed workspace to also be required", () => {
  const architectInterview = deriveProjectRailPresentation({
    activeWorkspaceId: "architect-interview",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "architect-interview",
  });
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "project-intake-capture",
    destinationWorkspaceId: "project-intake-capture",
    statusLabel: "Awaiting Approval",
  });

  assert.equal(architectInterview.isSelected, true);
  assert.equal(architectInterview.isRequired, true);
  assert.equal(projectIntake.isSelected, true);
  assert.equal(projectIntake.isRequired, true);
});

test("required state does not alter Project Intake lifecycle status text", () => {
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: "project-intake-capture",
    destinationWorkspaceId: "project-intake-capture",
    statusLabel: "Completed",
  });

  assert.equal(projectIntake.statusLabel, "Completed");
});

test("top rail has no required card when no required workspace is supplied", () => {
  const projectIntake = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: null,
    destinationWorkspaceId: "project-intake-capture",
  });
  const architectInterview = deriveProjectRailPresentation({
    activeWorkspaceId: "project-intake-capture",
    requiredWorkspaceId: null,
    destinationWorkspaceId: "architect-interview",
  });

  assert.equal(projectIntake.isRequired, false);
  assert.equal(architectInterview.isRequired, false);
});

test("Project Intake disposition controls render inline only for the selected intake document", () => {
  assert.equal(
    shouldRenderInlineProjectIntakeDisposition(
      "project-intake-capture",
      "project-intake",
      "project-intake",
    ),
    true,
  );
  assert.equal(
    shouldRenderInlineProjectIntakeDisposition(
      "project-intake-capture",
      "project-intake",
      "architect-prompt",
    ),
    false,
  );
  assert.equal(
    shouldRenderInlineProjectIntakeDisposition(
      "architect-interview",
      "project-intake",
      "project-intake",
    ),
    false,
  );
});

test("generic preview disposition footer is suppressed only for Project Intake and specialized workspaces", () => {
  assert.equal(shouldRenderGenericPreviewDispositionControls("project-intake-capture", false), false);
  assert.equal(shouldRenderGenericPreviewDispositionControls("architect-interview", true), false);
  assert.equal(shouldRenderGenericPreviewDispositionControls("work-card-intake", false), true);
});

test("Architect Interview rail status is evidence-derived and independent from selected state", () => {
  const presentation = deriveProjectRailPresentation({
    activeWorkspaceId: "architect-interview",
    requiredWorkspaceId: "architect-interview",
    destinationWorkspaceId: "architect-interview",
    architectInterviewStatus: "Waiting for Output",
  });

  assert.equal(presentation.isSelected, true);
  assert.equal(presentation.isRequired, true);
  assert.equal(presentation.statusLabel, "Waiting for Output");
  assert.equal(deriveArchitectInterviewRailStatus({ railStatus: "Completed" }), "Completed");
  assert.equal(deriveArchitectInterviewRailStatus(null), "Open");
});

test("Architect Interview prompt selection hides disposition controls", () => {
  assert.equal(
    shouldRenderArchitectInterviewDispositionControls({
      selectedRole: "prompt",
      canApplyDisposition: true,
    }),
    false,
  );
  assert.equal(
    shouldRenderArchitectInterviewDispositionControls({
      selectedRole: "interview",
      canApplyDisposition: true,
    }),
    true,
  );
  assert.equal(
    shouldRenderArchitectInterviewDispositionControls({
      selectedRole: "interview",
      canApplyDisposition: false,
    }),
    false,
  );
});

test("Architect Interview uses dual-pane mode without changing other workspaces", () => {
  assert.equal(isArchitectInterviewDualPaneWorkspace("architect-interview"), true);
  assert.equal(isArchitectInterviewDualPaneWorkspace("project-planning-review"), false);
  assert.equal(isArchitectInterviewDualPaneWorkspace("project-intake-capture"), false);
});
