const assert = require("node:assert/strict");
const test = require("node:test");

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
    projectIntakeJsonPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.json",
    architectPromptMarkdownPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
    architectPromptJsonPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.json",
    architectInterviewTargetMarkdownPath:
      "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo_project.md",
    architectInterviewTargetJsonPath:
      "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_demo_project.json",
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
      jsonPath:
        "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.json",
    },
    {
      logicalDocumentId: "created-intake",
      markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
      jsonPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.json",
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
        "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.json",
      ],
      freshnessState: "fresh",
      staleSources: [],
      markdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
      jsonPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.json",
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

test("four-path confirmation payload is created from successful submission result", () => {
  assert.deepEqual(createProjectIntakeConfirmation(submissionResult()), {
    projectIntakeMarkdownPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.md",
    projectIntakeJsonPath: "planning/project/Project_Intake/PROJECT_INTAKE_demo_project.json",
    architectPromptMarkdownPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.md",
    architectPromptJsonPath:
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_demo_project.json",
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
