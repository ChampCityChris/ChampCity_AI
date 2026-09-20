const assert = require("node:assert/strict");
const test = require("node:test");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadRendererSourceModule } = require("../renderer/renderer-source-loader.cjs");

const {
  applySuccessfulProjectIntakeSubmission,
  clearProjectIntakePostSubmitReviewState,
  createProjectIntakeConfirmation,
  findCreatedProjectIntakeDocumentId,
} = require("../../dist/shared/projectIntake/postSubmitReviewState.js");

function submissionResult() {
  return {
    ok: true,
    projectSlug: "demo_project",
    projectRoot: "<PROJECT_REPO>",
    projectIntakeMarkdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    architectPromptMarkdownPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
    architectInterviewTargetMarkdownPath:
      "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo_project.md",
    artifactRevision: 1,
    promptRevision: 1,
    invalidatedPaths: [],
  };
}

function documents() {
  return [
    {
      logicalDocumentId: "prompt",
      markdownPath:
        "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
    },
    {
      logicalDocumentId: "created-intake",
      markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    },
  ];
}

function pendingIntakeResolverResult() {
  return {
    status: "current",
    totalDocumentCount: 2,
    document: {
      logicalDocumentId: "created-intake",
      owningWorkspaceId: "project-intake-capture",
      owningWorkspace: "Project Intake Capture",
      lifecycleLocation: { level: "project", stage: "intake" },
      participationRole: "gatingReview",
      artifactType: "project-intake",
      reason: "Project Intake is Pending.",
      evidencePaths: [
        "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
      ],
      freshnessState: "fresh",
      staleSources: [],
      markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
      displayTitle: "PROJECT_INTAKE_demo_project",
      effectiveDisposition: "Pending",
      orderPosition: 1,
      totalDocumentCount: 2,
    },
  };
}

test("created Intake path resolves to the loaded logical document", () => {
  assert.equal(
    findCreatedProjectIntakeDocumentId(documents(), submissionResult()),
    "created-intake",
  );
});

test("Markdown-only confirmation payload is created from successful submission result", () => {
  assert.deepEqual(createProjectIntakeConfirmation(submissionResult()), {
    projectIntakeMarkdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    architectPromptMarkdownPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
  });
});

test("post-submit review preserves Project Intake view while resolver requires Pending Intake review", () => {
  const nextState = applySuccessfulProjectIntakeSubmission(
    {
      confirmation: null,
      viewedWorkspaceId: "project-planning-review",
      selectedDocumentId: null,
      resolverResult: null,
    },
    submissionResult(),
    documents(),
    pendingIntakeResolverResult(),
  );

  assert.equal(nextState.viewedWorkspaceId, "project-intake-capture");
  assert.equal(nextState.selectedDocumentId, "created-intake");
  assert.equal(nextState.resolverResult.document.owningWorkspaceId, "project-intake-capture");
  assert.equal(nextState.confirmation.projectIntakeMarkdownPath, submissionResult().projectIntakeMarkdownPath);
});

test("repository change clears Project Intake confirmation without inventing navigation", () => {
  const state = applySuccessfulProjectIntakeSubmission(
    {
      confirmation: null,
      viewedWorkspaceId: "project-intake-capture",
      selectedDocumentId: null,
      resolverResult: null,
    },
    submissionResult(),
    documents(),
    pendingIntakeResolverResult(),
  );

  assert.deepEqual(clearProjectIntakePostSubmitReviewState(state), {
    ...state,
    confirmation: null,
  });
});

test("Work Intake capture asks for bounded work and a base branch without route selection", () => {
  const { WorkIntakeWorkspace } = loadRendererSourceModule("src/renderer/app/WorkIntakeWorkspace.tsx");
  const markup = renderToStaticMarkup(React.createElement(WorkIntakeWorkspace, {
    projection: {
      project: null, suggestedProjectName: "New Product", branches: [{ name: "integration-target", commit: "a".repeat(40) }],
      currentBranch: "integration-target", currentIntake: null, intakes: [], blockedReason: null,
    },
    onReturn() {}, onRefresh: async () => {},
  }));
  assert.match(markup, /Work request, problem, or change/);
  assert.match(markup, /Desired outcome/);
  assert.match(markup, /Non-negotiable constraints/);
  assert.match(markup, /Integrate into branch/);
  assert.match(markup, /integration-target/);
  assert.match(markup, /Save Work Intake/);
  assert.doesNotMatch(markup, /Project Type|Select.*route|greenfield|refactor-migration|Submit Project Intake/);
});
