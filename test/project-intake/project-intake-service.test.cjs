const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  listPlanningDocuments,
  setDocumentDisposition,
} = require("../../dist/main/documents/planningDocumentService.js");
const {
  resolveFirstNonApprovedDocument,
} = require("../../dist/main/documents/firstNonApprovedResolver.js");
const {
  submitProjectIntake,
  submitProjectIntakeForRepository,
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

test("active repository root controls Project Intake writes over submitted path", () => {
  const activeRoot = createRepository();
  const forgedRoot = createRepository();

  const result = submitProjectIntakeForRepository(
    activeRoot,
    baseSubmission(forgedRoot, { projectName: "Active Root Wins" }),
  );

  assert.equal(result.projectRoot, path.resolve(activeRoot));
  assert.deepEqual(listFiles(activeRoot), [
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_active_root_wins.json",
    "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_active_root_wins.md",
    "planning/project/Project_Intake/PROJECT_INTAKE_active_root_wins.json",
    "planning/project/Project_Intake/PROJECT_INTAKE_active_root_wins.md",
  ]);
  assert.equal(fs.existsSync(path.join(forgedRoot, "planning")), false);
});

test("Project Intake output uses fixed fields pending disposition and redacted repository path", () => {
  const root = createRepository();
  const result = submitProjectIntake(baseSubmission(root));
  const intake = readJson(root, result.projectIntakeJsonPath);
  const intakeMarkdown = readText(root, result.projectIntakeMarkdownPath);

  assert.equal(intake.artifactRevision, 1);
  assert.equal(intake.participationRole, "gatingReview");
  assert.equal(intake.projectArtifactKey, "my_test_project");
  assert.equal(intake.documentDisposition.status, "Pending");
  assert.match(intakeMarkdown, /Document\.Status=Pending/);
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
  assert.equal(prompt.projectIdentity.projectName, "My Test Project");
  assert.equal(prompt.projectIdentity.projectRepository, "<PROJECT_REPO>");
  assert.equal(prompt.intakeContext.knownConstraints, "Keep scope bounded.");
  assert.equal(prompt.canonicalProjectIntake.markdown, result.projectIntakeMarkdownPath);
  assert.equal(prompt.canonicalProjectIntake.json, result.projectIntakeJsonPath);
  assert.equal(prompt.generatedPromptRevision, 1);
  assert.equal(prompt.requiredOutputContract.json.artifactType, "project-architect-interview");
  assert.equal(prompt.requiredOutputContract.json.requiredDocumentDispositionStatus, "Pending");
  assert.equal(prompt.interviewMethod.conversationTextIsNotDurableRecord, true);
  assert.equal(prompt.repositoryReviewBehavior.mode, "existing-repository");
  assert.match(promptMarkdown, /Project Purpose: Create a focused planning workflow\./);
  assert.match(promptMarkdown, /Desired Outcome: The Operator can capture intake and generate an Architect prompt\./);
  assert.match(promptMarkdown, /Known Constraints or Non-Negotiables: Keep scope bounded\./);
  assert.match(promptMarkdown, /Optional Repository Review Context: Previous planning files exist under planning\//);
  assert.match(promptMarkdown, /inspect the selected repository through ChampCity MCP/);
  assert.match(promptMarkdown, /Distinguish verified repository facts from Operator statements/);
  assert.match(promptMarkdown, /Markdown: planning\/project\/Project_Architect_Interviews\/PROJECT_ARCHITECT_INTERVIEW_my_test_project\.md/);
  assert.match(promptMarkdown, /JSON: planning\/project\/Project_Architect_Interviews\/PROJECT_ARCHITECT_INTERVIEW_my_test_project\.json/);
  assert.match(promptMarkdown, /Canonical Project Intake Markdown: planning\/project\/Project_Intake\/PROJECT_INTAKE_my_test_project\.md/);
  assert.match(promptMarkdown, /Canonical Project Intake JSON: planning\/project\/Project_Intake\/PROJECT_INTAKE_my_test_project\.json/);
  assert.match(promptMarkdown, /artifactType: project-architect-interview/);
  assert.match(promptMarkdown, /documentDisposition\.status: Pending/);
  assert.equal(promptMarkdown.includes(root), false);
});

test("greenfield prompt preserves adaptive interview contract without repository-review requirement", () => {
  const root = createRepository();
  const result = submitProjectIntake(baseSubmission(root));
  const prompt = readJson(root, result.architectPromptJsonPath);
  const promptMarkdown = readText(root, result.architectPromptMarkdownPath);

  assert.equal(prompt.requiresRepositoryReview, false);
  assert.equal(prompt.repositoryReviewBehavior.mode, "greenfield");
  assert.match(promptMarkdown, /Treat this as a greenfield project unless repository evidence establishes otherwise\./);
  assert.match(promptMarkdown, /Do not use a rigid interrogation of irrelevant questions\./);
  assert.match(promptMarkdown, /Required Interview Coverage/);
  assert.match(promptMarkdown, /## Required Markdown Output Structure/);
  assert.match(promptMarkdown, /Document.Status=Pending/);
});

test("intake edit increments revision regenerates prompt and invalidates interview", () => {
  const root = createRepository();
  const first = submitProjectIntake(baseSubmission(root));
  setDocumentDisposition(
    root,
    listPlanningDocuments(root).find((document) => document.jsonPath === first.projectIntakeJsonPath).logicalDocumentId,
    "Approved",
  );
  fs.mkdirSync(path.dirname(path.join(root, first.architectInterviewTargetJsonPath)), { recursive: true });
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
  assert.equal(intake.documentDisposition.status, "Pending");
  assert.equal(prompt.artifactRevision, 2);
  assert.deepEqual(prompt.sourceRevisions, [
    { path: second.projectIntakeJsonPath, revision: 2 },
  ]);
  assert.equal(interview.documentDisposition.status, "Pending");
  assert.deepEqual(second.invalidatedPaths, [second.architectInterviewTargetJsonPath]);
});

test("Project Name changes revise the same Intake prompt and Interview target paths", () => {
  const root = createRepository();
  const first = submitProjectIntake(baseSubmission(root, { projectName: "Revisionary" }));
  const second = submitProjectIntake(
    baseSubmission(root, {
      projectName: "Test",
      projectPurpose: "Changed content must stay in the first artifact family.",
    }),
  );

  assert.equal(second.projectSlug, "revisionary");
  assert.equal(second.projectIntakeMarkdownPath, first.projectIntakeMarkdownPath);
  assert.equal(second.projectIntakeJsonPath, first.projectIntakeJsonPath);
  assert.equal(second.architectPromptMarkdownPath, first.architectPromptMarkdownPath);
  assert.equal(second.architectPromptJsonPath, first.architectPromptJsonPath);
  assert.equal(second.architectInterviewTargetMarkdownPath, first.architectInterviewTargetMarkdownPath);
  assert.equal(second.architectInterviewTargetJsonPath, first.architectInterviewTargetJsonPath);
  assert.equal(readJson(root, second.projectIntakeJsonPath).projectName, "Test");
  assert.match(readText(root, second.projectIntakeMarkdownPath), /Project Name: Test/);
  assert.deepEqual(
    listFiles(root).filter((file) => file.includes("PROJECT_INTAKE_")),
    [
      "planning/project/Project_Intake/PROJECT_INTAKE_revisionary.json",
      "planning/project/Project_Intake/PROJECT_INTAKE_revisionary.md",
    ],
  );
  assert.deepEqual(
    listFiles(root).filter((file) => file.includes("PROJECT_ARCHITECT_INTERVIEW_PROMPT_")),
    [
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_revisionary.json",
      "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_revisionary.md",
    ],
  );
  assert.equal(readJson(root, second.architectPromptJsonPath).architectOutputTargets.markdown, first.architectInterviewTargetMarkdownPath);
});

test("existing alternate canonical Intake path is preserved in prompt source references", () => {
  const root = createRepository();
  const intakeMarkdownPath = "planning/project/project-intake/CANONICAL_PROJECT_INTAKE.md";
  const intakeJsonPath = "planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json";
  const promptMarkdownPath = "planning/project/Project_Architect_Interview_Prompts/CANONICAL_PROMPT.md";
  const promptJsonPath = "planning/project/Project_Architect_Interview_Prompts/CANONICAL_PROMPT.json";
  const interviewMarkdownPath = "planning/project/Project_Architect_Interviews/CANONICAL_INTERVIEW.md";
  const interviewJsonPath = "planning/project/Project_Architect_Interviews/CANONICAL_INTERVIEW.json";
  fs.mkdirSync(path.join(root, "planning/project/project-intake"), { recursive: true });
  fs.mkdirSync(path.join(root, "planning/project/Project_Architect_Interview_Prompts"), { recursive: true });
  fs.writeFileSync(
    path.join(root, intakeMarkdownPath),
    "# Project Intake - Original Alternate\nArtifact.Revision=7\nparticipationRole=gatingReview\nProject.ArtifactKey=stable_alternate\n\n## Document Disposition\n\nDocument.Status=Approved\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, intakeJsonPath),
    JSON.stringify(
      {
        artifactType: "project-intake",
        artifactRevision: 7,
        participationRole: "gatingReview",
        projectArtifactKey: "stable_alternate",
        projectName: "Original Alternate",
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, promptMarkdownPath),
    "# Project Architect Interview Prompt - Original Alternate\nArtifact.Revision=3\nparticipationRole=nonReviewHandoff\n\n## Source Revisions\n- path: planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json revision: 7\nCanonical Project Intake Markdown: planning/project/project-intake/CANONICAL_PROJECT_INTAKE.md\nCanonical Project Intake JSON: planning/project/project-intake/CANONICAL_PROJECT_INTAKE.json\n\n## Document Disposition\n\nDocument.Status=Approved\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, promptJsonPath),
    JSON.stringify(
      {
        artifactType: "project-architect-interview-prompt",
        artifactRevision: 3,
        participationRole: "nonReviewHandoff",
        projectArtifactKey: "stable_alternate",
        sourceRevisions: [{ path: intakeJsonPath, revision: 7 }],
        canonicalProjectIntake: {
          markdown: intakeMarkdownPath,
          json: intakeJsonPath,
          revision: 7,
        },
        architectOutputTargets: {
          markdown: interviewMarkdownPath,
          json: interviewJsonPath,
        },
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
    "utf8",
  );

  const result = submitProjectIntake(
    baseSubmission(root, {
      projectName: "Changed Alternate Name",
      projectPurpose: "Updated content remains on alternate canonical paths.",
    }),
  );
  const prompt = readJson(root, result.architectPromptJsonPath);
  const promptMarkdown = readText(root, result.architectPromptMarkdownPath);
  const reconstructedMarkdownPath =
    "planning/project/Project_Intake/PROJECT_INTAKE_changed_alternate_name.md";

  assert.equal(result.projectSlug, "stable_alternate");
  assert.equal(result.projectIntakeMarkdownPath, intakeMarkdownPath);
  assert.equal(result.projectIntakeJsonPath, intakeJsonPath);
  assert.equal(result.architectPromptMarkdownPath, promptMarkdownPath);
  assert.equal(result.architectPromptJsonPath, promptJsonPath);
  assert.equal(result.architectInterviewTargetMarkdownPath, interviewMarkdownPath);
  assert.equal(result.architectInterviewTargetJsonPath, interviewJsonPath);
  assert.equal(readJson(root, intakeJsonPath).projectName, "Changed Alternate Name");
  assert.match(readText(root, intakeMarkdownPath), /Project Name: Changed Alternate Name/);
  assert.match(promptMarkdown, new RegExp(`Canonical Project Intake Markdown: ${intakeMarkdownPath}`));
  assert.match(promptMarkdown, new RegExp(`Canonical Project Intake JSON: ${intakeJsonPath}`));
  assert.equal(prompt.canonicalProjectIntake.markdown, intakeMarkdownPath);
  assert.equal(prompt.canonicalProjectIntake.json, intakeJsonPath);
  assert.deepEqual(prompt.sourceRevisions, [
    { path: intakeJsonPath, revision: result.artifactRevision },
  ]);
  assert.equal(promptMarkdown.includes(reconstructedMarkdownPath), false);
  assert.equal(JSON.stringify(prompt).includes(reconstructedMarkdownPath), false);
  assert.deepEqual(
    listFiles(root).filter((file) => file.includes("PROJECT_INTAKE") || file.includes("CANONICAL_PROJECT_INTAKE")),
    [intakeJsonPath, intakeMarkdownPath],
  );
  assert.deepEqual(
    listFiles(root).filter((file) => file.includes("PROMPT")),
    [promptJsonPath, promptMarkdownPath],
  );
});

test("singleton slugged Intake family without stable metadata is reused without migration", () => {
  const root = createRepository();
  fs.mkdirSync(path.join(root, "planning/project/Project_Intake"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE_existing_slug.md"),
    "# Project Intake - Existing\nArtifact.Revision=1\nparticipationRole=gatingReview\n\n## Document Disposition\n\nDocument.Status=Approved\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE_existing_slug.json"),
    JSON.stringify(
      {
        artifactType: "project-intake",
        artifactRevision: 1,
        participationRole: "gatingReview",
        projectName: "Existing",
        documentDisposition: { status: "Approved" },
      },
      null,
      2,
    ),
    "utf8",
  );

  const result = submitProjectIntake(baseSubmission(root, { projectName: "Changed Name" }));

  assert.equal(result.projectSlug, "existing_slug");
  assert.equal(result.projectIntakeJsonPath, "planning/project/Project_Intake/PROJECT_INTAKE_existing_slug.json");
  assert.equal(readJson(root, result.projectIntakeJsonPath).projectArtifactKey, "existing_slug");
  assert.equal(readJson(root, result.projectIntakeJsonPath).projectName, "Changed Name");
});

test("multiple canonical Intake families cause actionable conflict and no writes", () => {
  const root = createRepository();
  const first = submitProjectIntake(baseSubmission(root, { projectName: "One" }));
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE_two.md"),
    "# Project Intake - Two\nArtifact.Revision=1\nparticipationRole=gatingReview\n\n## Document Disposition\n\nDocument.Status=Pending\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(root, "planning/project/Project_Intake/PROJECT_INTAKE_two.json"),
    JSON.stringify(
      {
        artifactType: "project-intake",
        artifactRevision: 1,
        participationRole: "gatingReview",
        projectName: "Two",
        documentDisposition: { status: "Pending" },
      },
      null,
      2,
    ),
    "utf8",
  );
  const before = listFiles(root);

  assert.throws(
    () => submitProjectIntake(baseSubmission(root, { projectName: "Three" })),
    /Project Intake conflict: multiple canonical Project Intake documents exist: .*PROJECT_INTAKE_one.*PROJECT_INTAKE_two/s,
  );
  assert.deepEqual(listFiles(root), before);
  assert.equal(fs.existsSync(path.join(root, first.architectPromptJsonPath)), true);
});

test("explicit approval is required before Architect Interview waiting projection", () => {
  const root = createRepository();
  const result = submitProjectIntake(baseSubmission(root));

  const pending = resolveFirstNonApprovedDocument(root);
  assert.equal(pending.status, "current");
  assert.equal(pending.document.owningWorkspaceId, "project-intake-capture");
  assert.equal(pending.document.effectiveDisposition, "Pending");

  setDocumentDisposition(root, pending.document.logicalDocumentId, "Approved");
  const approved = resolveFirstNonApprovedDocument(root);
  assert.equal(approved.status, "waiting-for-architect-interview");
  assert.deepEqual(approved.expectedOutputPaths, {
    markdown: result.architectInterviewTargetMarkdownPath,
    json: result.architectInterviewTargetJsonPath,
  });

  const revised = submitProjectIntake(baseSubmission(root, { projectPurpose: "Requires reapproval." }));
  const afterRevision = resolveFirstNonApprovedDocument(root);
  assert.equal(afterRevision.status, "current");
  assert.equal(afterRevision.document.owningWorkspaceId, "project-intake-capture");
  assert.equal(readJson(root, revised.projectIntakeJsonPath).documentDisposition.status, "Pending");
});

test("invalid project type fails before writing planning files", () => {
  const root = createRepository();

  assert.throws(
    () => submitProjectIntake(baseSubmission(root, { projectType: "Spreadsheet" })),
    /Project Type/,
  );
  assert.equal(fs.existsSync(path.join(root, "planning")), false);
});
