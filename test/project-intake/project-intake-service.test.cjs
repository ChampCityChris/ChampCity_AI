const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  submitProjectIntake,
} = require("../../dist/main/projectIntake/projectIntakeService.js");

function createRepository() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-project-intake-"));
}

function baseSubmission(root, overrides = {}) {
  return {
    projectName: "My Test Project",
    projectPurpose: "Create a focused planning workflow.",
    desiredOutcome: "The Operator can capture intake and generate an Architect prompt.",
    projectType: "Desktop application",
    projectRepository: root,
    hasExistingSourceOrPlanning: false,
    knownConstraints: "Keep scope bounded.",
    repositoryReviewContext: "",
    ...overrides,
  };
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolutePath).split(path.sep).join("/"));
      }
    }
  }
  visit(root);
  return files.sort();
}

test("empty repository receives minimal Project Intake planning initialization", () => {
  const root = createRepository();

  const result = submitProjectIntake(baseSubmission(root));

  assert.equal(result.projectSlug, "my_test_project");
  assert.equal(fs.existsSync(path.join(root, "planning/project/Project_Intake")), true);
  assert.equal(fs.existsSync(path.join(root, "planning/project/Project_Architect_Interview_Prompts")), true);
  assert.equal(fs.existsSync(path.join(root, "planning/phases")), false);
  assert.deepEqual(listFiles(root), [
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_my_test_project.json",
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_my_test_project.md",
    "planning/project/Project_Intake/PROJECT_INTAKE_my_test_project.json",
    "planning/project/Project_Intake/PROJECT_INTAKE_my_test_project.md",
  ]);
});

test("Project Intake output uses fixed fields approved disposition and redacted repository path", () => {
  const root = createRepository();
  const result = submitProjectIntake(baseSubmission(root));
  const intake = readJson(root, result.projectIntakeJsonPath);
  const intakeMarkdown = readText(root, result.projectIntakeMarkdownPath);

  assert.equal(intake.artifactRevision, 1);
  assert.equal(intake.participationRole, "gatingReview");
  assert.equal(intake.documentDisposition.status, "Approved");
  assert.equal(intake.projectRepository, "<PROJECT_REPO>");
  assert.equal(intake.hasExistingSourceOrPlanning, false);
  assert.equal(intakeMarkdown.includes(root), false);
  assert.equal(intakeMarkdown.includes("Project Repository: <PROJECT_REPO>"), true);
});

test("existing repository answer keeps repository review context optional", () => {
  const root = createRepository();

  const result = submitProjectIntake(
    baseSubmission(root, { hasExistingSourceOrPlanning: true }),
  );
  const intake = readJson(root, result.projectIntakeJsonPath);

  assert.equal(intake.hasExistingSourceOrPlanning, true);
  assert.equal(intake.repositoryReviewContext, "");
});

test("existing repository prompt requires ChampCity MCP repository review", () => {
  const root = createRepository();
  const result = submitProjectIntake(
    baseSubmission(root, {
      hasExistingSourceOrPlanning: true,
      repositoryReviewContext: "Previous planning files exist under planning/.",
    }),
  );
  const prompt = readJson(root, result.architectPromptJsonPath);
  const promptMarkdown = readText(root, result.architectPromptMarkdownPath);

  assert.equal(prompt.participationRole, "nonReviewHandoff");
  assert.equal(prompt.documentDisposition.status, "Approved");
  assert.equal(prompt.requiresRepositoryReview, true);
  assert.deepEqual(prompt.sourceRevisions, [
    { path: result.projectIntakeJsonPath, revision: 1 },
  ]);
  assert.equal(prompt.architectOutputTargets.markdown, result.architectInterviewTargetMarkdownPath);
  assert.equal(prompt.architectOutputTargets.json, result.architectInterviewTargetJsonPath);
  assert.match(promptMarkdown, /Inspect the selected repository through ChampCity MCP/);
});

test("intake edit increments revision regenerates prompt and invalidates interview", () => {
  const root = createRepository();
  const first = submitProjectIntake(baseSubmission(root));
  fs.writeFileSync(
    path.join(root, first.architectInterviewTargetJsonPath),
    JSON.stringify(
      {
        artifactRevision: 1,
        sourceRevisions: [{ path: first.projectIntakeJsonPath, revision: 1 }],
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
    "utf8",
  );

  const second = submitProjectIntake(
    baseSubmission(root, {
      projectPurpose: "Create a revised focused planning workflow.",
    }),
  );
  const intake = readJson(root, second.projectIntakeJsonPath);
  const prompt = readJson(root, second.architectPromptJsonPath);
  const interview = readJson(root, second.architectInterviewTargetJsonPath);

  assert.equal(intake.artifactRevision, 2);
  assert.equal(prompt.artifactRevision, 2);
  assert.deepEqual(prompt.sourceRevisions, [
    { path: second.projectIntakeJsonPath, revision: 2 },
  ]);
  assert.equal(interview.documentDisposition.status, "Pending");
  assert.deepEqual(second.invalidatedPaths, [second.architectInterviewTargetJsonPath]);
});

test("invalid project type fails before writing planning files", () => {
  const root = createRepository();

  assert.throws(
    () => submitProjectIntake(baseSubmission(root, { projectType: "Spreadsheet" })),
    /Project Type/,
  );
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
});
