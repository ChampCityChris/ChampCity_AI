import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDir, "..");
const checkedInWorkCardsDirectory = resolve(
  repositoryRoot,
  "planning/phases/phase-01/Work_Cards",
);
const phase02WorkCardsDirectory = resolve(
  repositoryRoot,
  "planning/phases/phase-02/Work_Cards",
);
const uiDesignHandoffDirectory = resolve(
  repositoryRoot,
  "planning/phases/phase-01/UI_Design_Handoff",
);
const packageJsonPath = resolve(repositoryRoot, "package.json");
const rendererAppPath = resolve(repositoryRoot, "src/renderer/app/App.tsx");
const rendererEntryPath = resolve(repositoryRoot, "src/renderer/main.tsx");
const preloadPath = resolve(repositoryRoot, "src/preload/index.ts");
const mainWorkCardFileStorePath = resolve(
  repositoryRoot,
  "src/main/workCards/workCardFileStore.ts",
);
const rendererTailwindPath = resolve(
  repositoryRoot,
  "src/renderer/styles/tailwind.css",
);
const rendererThemePath = resolve(
  repositoryRoot,
  "src/renderer/styles/theme.css",
);
const figmaImplementationMapPath = resolve(
  uiDesignHandoffDirectory,
  "FIGMA_IMPLEMENTATION_MAP.md",
);
const rendererIconPath = resolve(
  repositoryRoot,
  "src/renderer/assets/champcity_ai_icon_clean_no_shadow_TRANSPARENT.png",
);
const rendererBrandingPath = resolve(
  repositoryRoot,
  "src/renderer/assets/champcity_ai_ui_branding.png",
);
const figmaSourcePackagePath = resolve(
  uiDesignHandoffDirectory,
  "figma_source/Design Dark UI for ChampCity.zip",
);
const currentUiScreens = [
  "New Work Card",
  "Architect Prompt Composer",
  "Risk Router",
  "Builder Prompt Generator",
  "Builder Report Capture",
  "Human Validation",
  "Phase Closeout",
];
const wc10PipelineLabels = [
  "Capture",
  "Architect",
  "Risk",
  "Implement",
  "Report",
  "Validate",
  "Closeout",
];

const { workCardFixture } = require("../dist/shared/workCards/fixtures/workCardFixture.js");
const { workCardCaptureFixture } = require("../dist/shared/workCards/fixtures/workCardCaptureFixture.js");
const {
  workCardArchitectPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardArchitectPromptFixture.js");
const {
  workCardRiskRouterFixture,
} = require("../dist/shared/workCards/fixtures/workCardRiskRouterFixture.js");
const {
  workCardBuilderPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardBuilderPromptFixture.js");
const {
  workCardBuilderReportFixture,
} = require("../dist/shared/workCards/fixtures/workCardBuilderReportFixture.js");
const {
  workCardHumanValidationFixture,
} = require("../dist/shared/workCards/fixtures/workCardHumanValidationFixture.js");
const {
  workCardPhaseCloseoutFixture,
} = require("../dist/shared/workCards/fixtures/workCardPhaseCloseoutFixture.js");
const {
  workCardProjectIntakeFixture,
} = require("../dist/shared/workCards/fixtures/workCardProjectIntakeFixture.js");
const {
  workCardProjectArchitectInterviewPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardProjectArchitectInterviewPromptFixture.js");
const {
  projectIntakeFixture,
} = require("../dist/shared/workCards/fixtures/projectIntakeFixture.js");
const {
  buildDraftWorkCard,
} = require("../dist/shared/workCards/workCardDraft.js");
const {
  buildProjectIntake,
  buildProjectIntakeFileNames,
  validateProjectIntakeArtifactFileName,
  validateProjectIntakeSlug,
} = require("../dist/shared/workCards/projectIntake.js");
const {
  projectIntakeMarkdownHeadings,
  projectIntakeNextStepText,
  renderProjectIntakeMarkdown,
} = require("../dist/shared/workCards/renderProjectIntakeMarkdown.js");
const {
  validateProjectIntake,
} = require("../dist/shared/workCards/validateProjectIntake.js");
const {
  buildProjectArchitectInterviewPrompt,
  buildProjectArchitectInterviewPromptFileNames,
  projectArchitectInterviewOperatorInstruction,
  projectArchitectInterviewPromptPurpose,
  validateProjectArchitectInterviewPrompt,
  validateProjectArchitectInterviewPromptArtifactFileName,
  validateProjectArchitectInterviewPromptSlug,
} = require("../dist/shared/workCards/projectArchitectInterviewPrompt.js");
const {
  projectArchitectInterviewPromptMarkdownHeadings,
  projectArchitectInterviewPromptNextStepText,
  renderProjectArchitectInterviewPromptMarkdown,
} = require("../dist/shared/workCards/renderProjectArchitectInterviewPromptMarkdown.js");
const {
  finalBuilderPromptBoundary,
  renderArchitectFramingPrompt,
} = require("../dist/shared/workCards/renderArchitectFramingPrompt.js");
const {
  renderWorkCardMarkdown,
  workCardMarkdownHeadings,
} = require("../dist/shared/workCards/renderWorkCardMarkdown.js");
const {
  buildRiskReviewFileName,
  renderRiskReviewMarkdown,
  riskReviewNoApprovalNote,
} = require("../dist/shared/workCards/renderRiskReviewMarkdown.js");
const {
  buildBuilderPromptFileName,
  builderPromptHighRiskWarning,
  builderPromptNoRiskReviewWarning,
  renderBuilderPrompt,
  standardBuilderValidationCommands,
} = require("../dist/shared/workCards/renderBuilderPrompt.js");
const {
  buildBuilderReportFileName,
  validateBuilderReport,
  validateBuilderReportMarkdownFileName,
  validateBuilderReportTopic,
} = require("../dist/shared/workCards/validateBuilderReport.js");
const {
  buildRepairPromptFileName,
  repairPromptScopeGuard,
  renderRepairPrompt,
  validateRepairPromptFileName,
} = require("../dist/shared/workCards/renderRepairPrompt.js");
const {
  renderValidationRecordMarkdown,
  validationRecordNonMutatingNote,
} = require("../dist/shared/workCards/renderValidationRecordMarkdown.js");
const {
  createEmptyPhaseArtifactFiles,
  getAllowedPhaseArtifactExtensions,
  phaseArtifactFolderNames,
  summarizePhaseArtifacts,
  validatePhaseArtifactFileName,
} = require("../dist/shared/workCards/phaseCloseout.js");
const {
  buildPhaseCloseoutJsonFileName,
  buildPhaseCloseoutMarkdownFileName,
  buildPhaseCloseoutRecord,
  validatePhaseCloseoutRecord,
  validatePhaseCloseoutReportFileName,
} = require("../dist/shared/workCards/phaseCloseoutRecord.js");
const {
  phaseCloseoutNonMutatingNote,
  renderPhaseCloseoutMarkdown,
} = require("../dist/shared/workCards/renderPhaseCloseoutMarkdown.js");
const {
  buildHumanValidationRecord,
  buildValidationReportJsonFileName,
  buildValidationReportMarkdownFileName,
  differentProblemFoundGuidance,
  extractManualValidationChecklist,
  noBuilderReportSelectedWarning,
  shouldGenerateRepairPrompt,
  validateHumanValidationRecord,
  validateValidationReportFileName,
} = require("../dist/shared/workCards/validationRecord.js");
const {
  routeWorkCardRisk,
} = require("../dist/shared/workCards/riskRouter.js");
const { validateWorkCard } = require("../dist/shared/workCards/validateWorkCard.js");
const {
  validateSafePhaseFolder,
} = require("../dist/shared/workCards/workCardFileNames.js");
const {
  listSavedWorkCards,
  previewHumanValidationRecord,
  resolveBuilderPromptsDirectory,
  resolveBuilderReportsDirectory,
  resolveCloseoutReportsDirectory,
  resolveProjectArchitectInterviewPromptsDirectory,
  resolveProjectIntakeDirectory,
  resolveInside,
  resolveRepairPromptsDirectory,
  resolveRiskReviewsDirectory,
  resolveValidationReportsDirectory,
  validateMarkdownArtifactFileName,
  validateSavedProjectIntakeJsonFileName,
  validateSavedWorkCardJsonFileName,
} = require("../dist/main/workCards/workCardFileStore.js");

const renderedArtifacts = [
  {
    fixture: workCardFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC01_define_work_card_schema_and_markdown_renderer.md",
    ),
  },
  {
    fixture: workCardCaptureFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC02_build_new_work_card_capture_form.md",
    ),
  },
  {
    fixture: workCardArchitectPromptFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC03_add_architect_framing_prompt_composer.md",
    ),
  },
  {
    fixture: workCardRiskRouterFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC04_add_risk_router.md",
    ),
  },
  {
    fixture: workCardBuilderPromptFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC05_generate_builder_prompt.md",
    ),
  },
  {
    fixture: workCardBuilderReportFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.md",
    ),
  },
  {
    fixture: workCardHumanValidationFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC07_human_validation_and_repair_loop.md",
    ),
  },
  {
    fixture: workCardPhaseCloseoutFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-01/Work_Cards/WC08_phase_1_closeout_and_status_management.md",
    ),
  },
  {
    fixture: workCardProjectIntakeFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-02/Work_Cards/WC01_add_project_intake_capture.md",
    ),
  },
  {
    fixture: workCardProjectArchitectInterviewPromptFixture,
    path: resolve(
      repositoryRoot,
      "planning/phases/phase-02/Work_Cards/WC02_add_project_architect_interview_prompt_generator.md",
    ),
  },
];

for (const artifact of renderedArtifacts) {
  assertFixtureArtifact(artifact.fixture, artifact.path);
}

assertCheckedInJsonArtifacts(checkedInWorkCardsDirectory);
assertCheckedInJsonArtifacts(phase02WorkCardsDirectory);
assertUiDesignHandoffPackage();
assertWc10UiAndTerminology();
assertProjectIntake();
assertProjectArchitectInterviewPrompt();

const draft = buildDraftWorkCard(
  {
    workCardId: "WC99",
    title: "Capture a draft Work Card",
    phase: "phase-01",
    riskLevel: "medium",
    problem: "The Operator needs to capture an idea without writing Builder instructions.",
    importance: "The Architect needs structured source material.",
    userOutcome: "The Operator can save a draft that waits for Architect review.",
    scope: "Capture intent\nPreview Markdown",
    outOfScope: "Architect automation",
    knownSystems: "New Work Card screen",
    evidence: "Example report text",
    risks: "Draft could be mistaken for Builder-ready work",
    operatorNotes: "Keep the workflow human-reviewed",
  },
  "2026-06-28T00:00:00.000Z",
);

if (draft.status !== "ready_for_architect") {
  console.error("Draft Work Card construction did not preserve ready_for_architect status.");
  process.exit(1);
}

const draftMarkdown = renderWorkCardMarkdown(draft);

if (!draftMarkdown.includes("## Builder Handoff Prompt")) {
  console.error("Draft Work Card Markdown is missing the Builder Handoff Prompt heading.");
  process.exit(1);
}

if (!draftMarkdown.includes("Architect review is required")) {
  console.error("Draft Work Card Markdown does not state that Architect review is required.");
  process.exit(1);
}

if (validateSafePhaseFolder("../bad").length === 0) {
  console.error("Safe phase folder validation failed to reject traversal input.");
  process.exit(1);
}

if (validateSavedWorkCardJsonFileName("../bad").length === 0) {
  console.error("Saved Work Card JSON file validation failed to reject traversal input.");
  process.exit(1);
}

if (validateMarkdownArtifactFileName("../bad").length === 0) {
  console.error("Markdown artifact file validation failed to reject traversal input.");
  process.exit(1);
}

try {
  resolveInside(resolve(repositoryRoot, "planning", "phases"), "../bad");
  console.error("Path sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveRiskReviewsDirectory("../bad");
  console.error("Risk Review directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveBuilderPromptsDirectory("../bad");
  console.error("Builder Prompt directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveBuilderReportsDirectory("../bad");
  console.error("Builder Report directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveValidationReportsDirectory("../bad");
  console.error("Validation Reports directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveRepairPromptsDirectory("../bad");
  console.error("Repair Prompts directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

try {
  resolveCloseoutReportsDirectory("../bad");
  console.error("Closeout Reports directory sanitizer failed to reject traversal input.");
  process.exit(1);
} catch {
  // Expected.
}

assertArchitectPrompt(workCardArchitectPromptFixture);
assertRiskRouter();
assertRiskReviewMarkdown();
assertBuilderPrompt();
assertBuilderReportCapture();
await assertHumanValidationAndRepair();
assertPhaseCloseout();
await assertSavedWorkCardListing();

console.log("Work Card fixture validation passed.");

function assertFixtureArtifact(fixture, renderedFixturePath) {
  const validation = validateWorkCard(fixture);

  if (!validation.valid) {
    console.error(`Work Card fixture ${fixture.workCardId} validation failed:`);
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const markdown = renderWorkCardMarkdown(fixture);
  const requiredHeadings = [
    `# Work Card: ${fixture.title}`,
    ...workCardMarkdownHeadings,
  ];
  const missingHeadings = requiredHeadings.filter(
    (heading) => !markdown.includes(heading),
  );

  if (missingHeadings.length > 0) {
    console.error(
      `Rendered Work Card Markdown for ${fixture.workCardId} is missing required headings:`,
    );
    for (const heading of missingHeadings) {
      console.error(`- ${heading}`);
    }
    process.exit(1);
  }

  const checkedInMarkdown = readFileSync(renderedFixturePath, "utf8");

  if (checkedInMarkdown !== markdown) {
    console.error(
      `Checked-in ${fixture.workCardId} Markdown does not match the renderer output.`,
    );
    process.exit(1);
  }
}

function assertCheckedInJsonArtifacts(workCardsDirectory) {
  const jsonFileNames = readdirSync(workCardsDirectory)
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
    .sort();

  if (jsonFileNames.length === 0) {
    console.error("No checked-in Work Card JSON artifacts were found.");
    process.exit(1);
  }

  for (const fileName of jsonFileNames) {
    const jsonPath = resolve(workCardsDirectory, fileName);
    const markdownPath = resolve(
      workCardsDirectory,
      fileName.replace(/\.json$/i, ".md"),
    );

    let parsed;

    try {
      parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
    } catch (error) {
      console.error(`Checked-in Work Card JSON could not be parsed: ${fileName}`);
      console.error(error);
      process.exit(1);
    }

    const validation = validateWorkCard(parsed);

    if (!validation.valid) {
      console.error(`Checked-in Work Card JSON ${fileName} validation failed:`);
      for (const error of validation.errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    if (!existsSync(markdownPath)) {
      console.error(
        `Checked-in Work Card JSON ${fileName} does not have a matching Markdown artifact.`,
      );
      process.exit(1);
    }

    const markdown = renderWorkCardMarkdown(parsed);
    const requiredHeadings = [`# Work Card: ${parsed.title}`, ...workCardMarkdownHeadings];
    const missingHeadings = requiredHeadings.filter(
      (heading) => !markdown.includes(heading),
    );

    if (missingHeadings.length > 0) {
      console.error(
        `Rendered checked-in Work Card Markdown for ${fileName} is missing required headings:`,
      );
      for (const heading of missingHeadings) {
        console.error(`- ${heading}`);
      }
      process.exit(1);
    }

    const checkedInMarkdown = readFileSync(markdownPath, "utf8");

    if (checkedInMarkdown !== markdown) {
      console.error(
        `Checked-in Work Card JSON ${fileName} does not render to its matching Markdown artifact.`,
      );
      process.exit(1);
    }
  }
}

function assertArchitectPrompt(fixture) {
  const prompt = renderArchitectFramingPrompt(fixture);
  const requiredText = [
    fixture.workCardId,
    fixture.title,
    "Ask only clarifying questions that are necessary",
    "Provide recommended defaults",
    finalBuilderPromptBoundary,
  ];
  const missingText = requiredText.filter((text) => !prompt.includes(text));

  if (missingText.length > 0) {
    console.error("Architect framing prompt is missing required text:");
    for (const text of missingText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertRiskRouter() {
  const highRiskCases = [
    {
      category: "Secrets or credentials",
      text: "Use an API key, secret token, and credentials in the workflow.",
    },
    {
      category: "Authentication or authorization",
      text: "Add authentication, authorization, and login behavior.",
    },
    {
      category: "Filesystem writes outside approved planning paths",
      text: "Allow arbitrary filesystem writes outside approved planning folders.",
    },
    {
      category: "Database or migration changes",
      text: "Run a database migration that changes SQL tables.",
    },
    {
      category: "Cloud, deployment, or infrastructure changes",
      text: "Update cloud deployment, hosting, and infrastructure settings.",
    },
    {
      category: "External API/provider integration",
      text: "Add an OpenAI provider SDK and external API integration.",
    },
    {
      category: "MCP or connector integration",
      text: "Add MCP connector integration for saved Work Cards.",
    },
    {
      category: "Payment, billing, or account deletion",
      text: "Change Stripe payment, billing, refund, and account deletion behavior.",
    },
    {
      category: "Security policy changes",
      text: "Change the security policy and content security policy.",
    },
    {
      category: "Destructive Git/GitHub actions",
      text: "Run git reset --hard and force push the branch.",
    },
    {
      category: "Large dependency upgrades or audit fixes",
      text: "Run npm audit fix and upgrade dependencies across the app.",
    },
    {
      category: "Broad refactors",
      text: "Perform a broad refactor and rewrite the architecture.",
    },
  ];

  highRiskCases.forEach((riskCase, index) => {
    const review = routeWorkCardRisk(
      makeWorkCard({
        workCardId: `WCRISK${index + 1}`,
        title: riskCase.category,
        problem: riskCase.text,
        scope: [riskCase.text],
      }),
    );

    if (review.assessedRiskLevel !== "high") {
      console.error(`${riskCase.category} was not classified as high risk.`);
      process.exit(1);
    }

    if (
      !review.flaggedCategories.some(
        (flag) => flag.category === riskCase.category,
      )
    ) {
      console.error(`${riskCase.category} was not flagged by the risk router.`);
      process.exit(1);
    }
  });

  const scopeCreepReview = routeWorkCardRisk(
    makeWorkCard({
      workCardId: "WCSCOPE",
      title: "Scope creep sample",
      problem:
        "Combine a UI redesign with a database migration and cloud deployment work.",
      scope: [
        "UI redesign",
        "Database migration",
        "Cloud deployment",
      ],
    }),
  );

  if (scopeCreepReview.scopeCreepSignals.length === 0) {
    console.error("Risk router did not detect a simple scope-creep combination.");
    process.exit(1);
  }

  const lowRiskReview = routeWorkCardRisk(
    makeWorkCard({
      workCardId: "WCLOW",
      title: "Update planning note",
      riskLevel: "low",
      problem: "Make a documentation-only Markdown planning note update.",
      goal: "Tighten prompt wording in a report update.",
      userOutcome: "The Operator can read clearer documentation.",
      scope: ["Update Markdown wording."],
      requirements: ["Keep this to documentation-only copy edits."],
      acceptanceCriteria: ["The Markdown note is easier to read."],
      validationPlan: ["Read the Markdown note."],
      risks: ["Wording could still need Architect review."],
      builderInstructions: ["Keep the update documentation-only."],
      operatorNotes: ["Documentation-only note."],
    }),
  );

  if (lowRiskReview.assessedRiskLevel !== "low") {
    console.error("Documentation-only Work Card was not classified as low risk.");
    process.exit(1);
  }

  const lowRiskMarkdown = renderRiskReviewMarkdown(
    makeWorkCard({
      workCardId: "WCLOW",
      title: "Update planning note",
      riskLevel: "low",
      problem: "Make a documentation-only Markdown planning note update.",
      goal: "Tighten prompt wording in a report update.",
      userOutcome: "The Operator can read clearer documentation.",
      scope: ["Update Markdown wording."],
      requirements: ["Keep this to documentation-only copy edits."],
      acceptanceCriteria: ["The Markdown note is easier to read."],
      validationPlan: ["Read the Markdown note."],
      risks: ["Wording could still need Architect review."],
      builderInstructions: ["Keep the update documentation-only."],
      operatorNotes: ["Documentation-only note."],
    }),
    lowRiskReview,
    "2026-06-29T00:00:00.000Z",
  );

  if (!lowRiskMarkdown.includes("Normal Architect review is still required")) {
    console.error("Low-risk Markdown does not require normal Architect review.");
    process.exit(1);
  }

  if (/auto-approve|automatically approved|approved for (Builder|Implementer)/i.test(lowRiskMarkdown)) {
    console.error("Low-risk Markdown implies automatic approval.");
    process.exit(1);
  }
}

function assertRiskReviewMarkdown() {
  const highRiskWorkCard = makeWorkCard({
    workCardId: "WCREVIEW",
    title: "Review secrets",
    problem: "Handle an API key and secret token.",
    scope: ["Check credential handling."],
  });
  const review = routeWorkCardRisk(highRiskWorkCard);
  const markdown = renderRiskReviewMarkdown(
    highRiskWorkCard,
    review,
    "2026-06-29T00:00:00.000Z",
  );

  const requiredText = [
    "- Assessed risk level: high",
    "## Flagged Categories",
    "Secrets or credentials",
    "## Architect Review Questions",
    "Does this Work Card need access to secrets or credentials, and can that be avoided?",
    riskReviewNoApprovalNote,
    "does not modify or approve",
  ];
  const missingText = requiredText.filter((text) => !markdown.includes(text));

  if (missingText.length > 0) {
    console.error("Risk Review Markdown is missing required text:");
    for (const text of missingText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const expectedFileName = "RISK_REVIEW_WC04_add_risk_router.md";

  if (buildRiskReviewFileName(workCardRiskRouterFixture) !== expectedFileName) {
    console.error("Risk Review filename builder returned the wrong filename.");
    process.exit(1);
  }
}

function assertBuilderPrompt() {
  const noRiskReviewPrompt = renderBuilderPrompt(workCardBuilderPromptFixture);
  const requiredNoRiskText = [
    workCardBuilderPromptFixture.workCardId,
    workCardBuilderPromptFixture.title,
    "C:\\Users\\chapm\\Projects\\ChampCity_AI",
    "You are acting as Implementer for ChampCity A/I.",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent.",
    "git status --short --branch",
    "git remote -v",
    "Implementer Report Requirement",
    "BUILDER_REPORT_WC05_generate_builder_prompt.md",
    "Do not push unless explicitly instructed.",
    "Do not create a release tag unless explicitly instructed.",
    "Do not call an LLM API unless explicitly in scope.",
    "Do not broaden scope.",
    builderPromptNoRiskReviewWarning,
    ...standardBuilderValidationCommands,
  ];
  const missingNoRiskText = requiredNoRiskText.filter(
    (text) => !noRiskReviewPrompt.includes(text),
  );

  if (missingNoRiskText.length > 0) {
    console.error("Implementer prompt without Risk Review is missing required text:");
    for (const text of missingNoRiskText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const highRiskPrompt = renderBuilderPrompt(workCardBuilderPromptFixture, {
    riskReview: {
      fileName: "RISK_REVIEW_WC05_generate_builder_prompt.md",
      content:
        "- Assessed risk level: high\nThis Work Card appears high risk and needs Architect review.",
    },
  });
  const requiredHighRiskText = [
    builderPromptHighRiskWarning,
    "Selected Risk Review Context",
    "RISK_REVIEW_WC05_generate_builder_prompt.md",
  ];
  const missingHighRiskText = requiredHighRiskText.filter(
    (text) => !highRiskPrompt.includes(text),
  );

  if (missingHighRiskText.length > 0) {
    console.error("Implementer prompt with high-risk Risk Review is missing required text:");
    for (const text of missingHighRiskText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const expectedFileName = "BUILDER_PROMPT_WC05_generate_builder_prompt.md";

  if (buildBuilderPromptFileName(workCardBuilderPromptFixture) !== expectedFileName) {
    console.error("Builder Prompt filename builder returned the wrong filename.");
    process.exit(1);
  }
}

function assertBuilderReportCapture() {
  const completeReport = [
    "# Builder Report - WC06 Capture Builder Report",
    "",
    "## Repository Path Inspected",
    "Current working directory inspected: C:\\Users\\chapm\\Projects\\ChampCity_AI",
    "",
    "## Git Branch And Remote Status",
    "Current branch: master. git remote -v confirmed origin.",
    "",
    "## Files Created",
    "- planning/phases/phase-01/Work_Cards/WC06_capture_builder_report.json",
    "",
    "## Files Modified",
    "- src/renderer/app/App.tsx",
    "",
    "## Files Intentionally Not Created",
    "- No report index was created.",
    "",
    "## Commands Run And Results",
    "- npm run typecheck - passed",
    "",
    "## Validation Performed",
    "- npm run build - passed",
    "",
    "## Validation Skipped And Reason",
    "- Manual Electron UI validation was skipped because this is an automated script.",
    "",
    "## Git Actions Performed",
    "- Commit hash: abc1234",
    "",
    "## Security/Secret-Safety Notes",
    "- No secrets were stored.",
    "",
    "## Blocking Questions",
    "None.",
    "",
    "## Recommended Next Builder Task",
    "Operator should manually validate the screen.",
  ].join("\n");
  const completeValidation = validateBuilderReport(completeReport);

  if (!completeValidation.validEnoughToSave) {
    console.error("Complete Builder Report was not valid enough to save.");
    process.exit(1);
  }

  const completeMissingSignals = Object.entries(completeValidation.detected)
    .filter(([_key, value]) => !value)
    .map(([key]) => key);

  if (completeMissingSignals.length > 0) {
    console.error(
      `Complete Builder Report did not detect expected signals: ${completeMissingSignals.join(", ")}.`,
    );
    process.exit(1);
  }

  const imperfectReport = [
    "# Builder Report - quick note",
    "",
    "## Repository Path Inspected",
    "Checked C:\\Users\\chapm\\Projects\\ChampCity_AI.",
  ].join("\n");
  const imperfectValidation = validateBuilderReport(imperfectReport);

  if (!imperfectValidation.validEnoughToSave) {
    console.error("Imperfect non-empty Builder Report should still be valid enough to save.");
    process.exit(1);
  }

  if (imperfectValidation.warnings.length === 0) {
    console.error("Imperfect Builder Report did not return warnings.");
    process.exit(1);
  }

  if (validateBuilderReport("").validEnoughToSave) {
    console.error("Empty Builder Report text should not be valid enough to save.");
    process.exit(1);
  }

  const detectionReport = [
    "# Builder Report",
    "Commit hash: 1a2b3c4d",
    "npm run test:work-cards - passed",
    "## Blocking Questions",
    "No blockers.",
    "## Recommended Next Builder Task",
    "Manual validation.",
  ].join("\n");
  const detectionValidation = validateBuilderReport(detectionReport);

  if (!detectionValidation.detected.hasCommitHash) {
    console.error("Builder Report commit hash detection failed.");
    process.exit(1);
  }

  if (!detectionValidation.detected.hasValidationResults) {
    console.error("Builder Report validation results detection failed.");
    process.exit(1);
  }

  if (!detectionValidation.detected.hasBlockingQuestions) {
    console.error("Builder Report blocking question detection failed.");
    process.exit(1);
  }

  if (!detectionValidation.detected.hasRecommendedNextTask) {
    console.error("Builder Report recommended next task detection failed.");
    process.exit(1);
  }

  const expectedFileNames = [
    {
      input: {
        reportType: "Work Card",
        workCardId: "WC06",
        workCardTitle: "Capture Builder Report",
        topic: "Capture Builder Report",
      },
      fileName: "BUILDER_REPORT_WC06_capture_builder_report.md",
    },
    {
      input: {
        reportType: "Fix",
        topic: "FIX07 save button issue",
      },
      fileName: "BUILDER_REPORT_FIX07_save_button_issue.md",
    },
    {
      input: {
        reportType: "Fix",
        topic: "config issue",
      },
      fileName: "BUILDER_REPORT_FIX_config_issue.md",
    },
    {
      input: {
        reportType: "Repair",
        workCardId: "WC06",
        topic: "capture builder report save issue",
      },
      fileName: "BUILDER_REPORT_REPAIR_WC06_capture_builder_report_save_issue.md",
    },
    {
      input: {
        reportType: "Repair",
        topic: "artifact backfill",
      },
      fileName: "BUILDER_REPORT_REPAIR_artifact_backfill.md",
    },
    {
      input: {
        reportType: "Other",
        topic: "planning note",
      },
      fileName: "BUILDER_REPORT_OTHER_planning_note.md",
    },
  ];

  for (const expected of expectedFileNames) {
    const actual = buildBuilderReportFileName(expected.input);

    if (actual !== expected.fileName) {
      console.error(
        `Builder Report filename generation returned ${actual}; expected ${expected.fileName}.`,
      );
      process.exit(1);
    }
  }

  if (validateBuilderReportTopic("../bad").length === 0) {
    console.error("Builder Report topic sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    buildBuilderReportFileName({
      reportType: "Other",
      topic: "../bad",
    });
    console.error("Builder Report filename builder failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    buildBuilderReportFileName({
      reportType: "Work Card",
      workCardId: "WC06",
      topic: "../bad",
    });
    console.error("Work Card Builder Report filename builder failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    validateBuilderReportMarkdownFileName("../bad.md");
    console.error("Builder Report filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }
}

function assertPhaseCloseout() {
  const filesByFolder = createEmptyPhaseArtifactFiles();

  filesByFolder.Work_Cards = [
    "WC01_define_work_card_schema_and_markdown_renderer.json",
    "WC01_define_work_card_schema_and_markdown_renderer.md",
    "WC02_build_new_work_card_capture_form.json",
    "WC03_add_architect_framing_prompt_composer.md",
  ];
  filesByFolder.Builder_Reports = [
    "BUILDER_REPORT_WC01_work_card_schema_renderer.md",
  ];
  filesByFolder.Repair_Prompts = [
    "REPAIR_PROMPT_WC02_build_new_work_card_capture_form.md",
  ];

  const incompleteSummary = summarizePhaseArtifacts({
    phase: "phase-01",
    filesByFolder,
  });

  const missingFolders = phaseArtifactFolderNames.filter(
    (folder) => typeof incompleteSummary.artifactCounts[folder] !== "number",
  );

  if (
    incompleteSummary.folders.length !== phaseArtifactFolderNames.length ||
    missingFolders.length > 0
  ) {
    console.error("Phase artifact summary did not include expected folders.");
    process.exit(1);
  }

  if (incompleteSummary.artifactCounts.Work_Cards !== 4) {
    console.error("Phase artifact summary returned the wrong Work_Cards count.");
    process.exit(1);
  }

  if (incompleteSummary.workCardsWithBothJsonAndMarkdown.length !== 1) {
    console.error("Work Card pairing did not detect the paired WC01 artifacts.");
    process.exit(1);
  }

  if (!incompleteSummary.workCardsMissingMarkdown.some((pair) => pair.workCardId === "WC02")) {
    console.error("Work Card pairing did not detect missing Markdown.");
    process.exit(1);
  }

  if (!incompleteSummary.workCardsMissingJson.some((pair) => pair.workCardId === "WC03")) {
    console.error("Work Card pairing did not detect missing JSON.");
    process.exit(1);
  }

  if (
    !incompleteSummary.deterministicRecommendation.includes(
      "Phase has missing Work Card JSON/Markdown pairs. Repair before closeout.",
    )
  ) {
    console.error("Phase closeout recommendation did not warn about missing Work Card pairs.");
    process.exit(1);
  }

  if (
    !incompleteSummary.deterministicRecommendation.includes(
      "Phase has repair prompts. Review repairs before closing.",
    )
  ) {
    console.error("Phase closeout recommendation did not warn about repair prompts.");
    process.exit(1);
  }

  const completeFilesByFolder = createEmptyPhaseArtifactFiles();

  for (let index = 1; index <= 10; index += 1) {
    const workCardId = `WC${String(index).padStart(2, "0")}`;
    completeFilesByFolder.Work_Cards.push(`${workCardId}_sample.json`);
    completeFilesByFolder.Work_Cards.push(`${workCardId}_sample.md`);
    completeFilesByFolder.Builder_Reports.push(
      `BUILDER_REPORT_${workCardId}_sample.md`,
    );
  }

  completeFilesByFolder.Validation_Reports = [
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.json",
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.md",
  ];

  const completeSummary = summarizePhaseArtifacts({
    phase: "phase-01",
    filesByFolder: completeFilesByFolder,
  });
  const record = buildPhaseCloseoutRecord(
    {
      phase: "phase-01",
      decision: "Ready for release/package pass",
      closeoutSummary: "Phase 1 artifacts have been reviewed for closeout.",
      completedItems: "WC01 through WC08 foundation workflows.",
      remainingItems: "Manual UI validation and release/package readiness planning.",
      knownRisks: "Manual validation evidence still requires Operator review.",
      operatorNotes: "Closeout record is non-mutating.",
      recommendedNextAction: "Run manual validation, then plan release/package readiness.",
    },
    completeSummary,
    "2026-06-29T12:00:00.000Z",
  );
  const validation = validatePhaseCloseoutRecord(record);

  if (!validation.valid) {
    console.error("Phase Closeout record did not validate:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const markdown = renderPhaseCloseoutMarkdown(record);
  const requiredCloseoutText = [
    "# Phase Closeout Report - phase-01",
    "## Closeout Decision",
    "Ready for release/package pass",
    "## Deterministic Recommendation",
    "Phase may be ready for release/package readiness pass.",
    "## Artifact Summary",
    "## Missing Or Warning Observations",
    "## Recommended Next Action",
    phaseCloseoutNonMutatingNote,
  ];
  const missingCloseoutText = requiredCloseoutText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingCloseoutText.length > 0) {
    console.error("Phase Closeout Markdown is missing required text:");
    for (const text of missingCloseoutText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  if (
    buildPhaseCloseoutJsonFileName(record) !==
    "CLOSEOUT_REPORT_phase-01_phase_1_closeout.json"
  ) {
    console.error("Phase Closeout JSON filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (
    buildPhaseCloseoutMarkdownFileName(record) !==
    "CLOSEOUT_REPORT_phase-01_phase_1_closeout.md"
  ) {
    console.error("Phase Closeout Markdown filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (validatePhaseArtifactFileName("../bad", [".md"]).length === 0) {
    console.error("Phase artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validatePhaseArtifactFileName(
      "CLOSEOUT_REPORT_phase-01_phase_1_closeout.json",
      getAllowedPhaseArtifactExtensions("Closeout_Reports"),
    ).length > 0
  ) {
    console.error("Phase artifact filename sanitizer rejected a valid closeout filename.");
    process.exit(1);
  }

  try {
    validatePhaseCloseoutReportFileName("../bad.json");
    console.error("Phase Closeout filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }
}

async function assertHumanValidationAndRepair() {
  const baseInput = {
    phase: "phase-01",
    workCardFileName: "WC07_human_validation_and_repair_loop.json",
    validationResult: "Fail",
    testedItems: "Opened the Human Validation screen and attempted a failed save flow.",
    passedItems: "Navigation loaded and Work Card details displayed.",
    failedItems: "Repair prompt preview did not appear.",
    evidenceReferences: "Manual note: screenshot path C:\\Temp\\wc07-failure.png",
    screenshotOrFileReferences: "C:\\Temp\\wc07-failure.png",
    commandsRun: "npm start",
    observedErrors: "No repair prompt preview was visible.",
    additionalOperatorObservations: "The validation record should remain non-mutating.",
    operatorDecision: "Failed - repair needed",
    recommendedNextAction: "Repair the missing prompt preview.",
  };
  const record = buildHumanValidationRecord(
    workCardHumanValidationFixture,
    baseInput,
    "2026-06-29T12:00:00.000Z",
  );
  const validation = validateHumanValidationRecord(record);

  if (!validation.valid) {
    console.error("Human Validation record did not validate:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const validationMarkdown = renderValidationRecordMarkdown(record);
  const requiredValidationText = [
    "# Human Validation Report - WC07 Human validation and repair loop",
    "## Work Card",
    "## Validation Result",
    "## What Was Tested?",
    "## What Passed?",
    "## What Failed?",
    "## Evidence References Or Paths",
    "## Screenshots Or Files Referenced By Path",
    "## Manual Commands Run",
    "## Observed Errors",
    "## Additional Operator Observations",
    "## Operator Decision",
    "## Recommended Next Action",
    validationRecordNonMutatingNote,
  ];
  const missingValidationText = requiredValidationText.filter(
    (text) => !validationMarkdown.includes(text),
  );

  if (missingValidationText.length > 0) {
    console.error("Human Validation Markdown is missing required text:");
    for (const text of missingValidationText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const checklistReport = [
    "# Builder Report - sample",
    "",
    "## Manual Validation Required",
    "",
    "Manual validation should confirm:",
    "",
    "- The app opens.",
    "- Fail validation generates a draft Repair Prompt.",
    "",
    "## Git Actions Performed",
    "None.",
  ].join("\n");
  const checklist = extractManualValidationChecklist(checklistReport);

  if (!checklist.detected || !checklist.text.includes("draft Repair Prompt")) {
    console.error("Manual validation checklist extraction failed.");
    process.exit(1);
  }

  if (extractManualValidationChecklist("# Report\nNo checklist.").detected) {
    console.error("Checklist extraction should not detect unrelated text.");
    process.exit(1);
  }

  const noReportPreview = await previewHumanValidationRecord(baseInput);

  if (!noReportPreview.ok) {
    console.error("Human Validation preview without Builder Report failed.");
    process.exit(1);
  }

  if (noReportPreview.builderReportWarning !== noBuilderReportSelectedWarning) {
    console.error("Missing Builder Report warning was not returned.");
    process.exit(1);
  }

  const repairCases = [
    {
      validationResult: "Fail",
      operatorDecision: "Deferred - not validated yet",
    },
    {
      validationResult: "Partial",
      operatorDecision: "Deferred - not validated yet",
    },
    {
      validationResult: "Blocked",
      operatorDecision: "Deferred - not validated yet",
    },
    {
      validationResult: "Pass",
      operatorDecision: "Failed - repair needed",
    },
    {
      validationResult: "Pass",
      operatorDecision: "Partial - repair or follow-up needed",
    },
    {
      validationResult: "Pass",
      operatorDecision: "Blocked - operator/build environment issue",
    },
  ];

  for (const repairCase of repairCases) {
    const repairRecord = buildHumanValidationRecord(
      workCardHumanValidationFixture,
      {
        ...baseInput,
        validationResult: repairCase.validationResult,
        operatorDecision: repairCase.operatorDecision,
      },
      "2026-06-29T12:00:00.000Z",
    );

    if (!shouldGenerateRepairPrompt(repairRecord)) {
      console.error(
        `Repair prompt was not generated for ${repairCase.validationResult} / ${repairCase.operatorDecision}.`,
      );
      process.exit(1);
    }
  }

  const noRepairCases = [
    {
      validationResult: "Pass",
      operatorDecision: "Passed - proceed",
    },
    {
      validationResult: "Not Tested",
      operatorDecision: "Deferred - not validated yet",
    },
    {
      validationResult: "Fail",
      operatorDecision: "Different problem found - open new Work Card",
    },
  ];

  for (const noRepairCase of noRepairCases) {
    const noRepairRecord = buildHumanValidationRecord(
      workCardHumanValidationFixture,
      {
        ...baseInput,
        validationResult: noRepairCase.validationResult,
        operatorDecision: noRepairCase.operatorDecision,
      },
      "2026-06-29T12:00:00.000Z",
    );

    if (shouldGenerateRepairPrompt(noRepairRecord)) {
      console.error(
        `Repair prompt should not be generated for ${noRepairCase.validationResult} / ${noRepairCase.operatorDecision}.`,
      );
      process.exit(1);
    }
  }

  const differentProblemRecord = buildHumanValidationRecord(
    workCardHumanValidationFixture,
    {
      ...baseInput,
      operatorDecision: "Different problem found - open new Work Card",
    },
    "2026-06-29T12:00:00.000Z",
  );
  const differentProblemPreview = await previewHumanValidationRecord({
    ...baseInput,
    operatorDecision: "Different problem found - open new Work Card",
  });

  if (
    differentProblemPreview.differentProblemGuidance !==
    differentProblemFoundGuidance
  ) {
    console.error("Different problem guidance did not tell the Operator to open a new Work Card.");
    process.exit(1);
  }

  if (shouldGenerateRepairPrompt(differentProblemRecord)) {
    console.error("Different problem decisions must not generate repair prompts.");
    process.exit(1);
  }

  const repairPrompt = renderRepairPrompt(record, {
    validationRecordFileName: "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.json",
  });
  const requiredRepairPromptText = [
    "You are acting as Implementer for ChampCity A/I.",
    "The Implementer may be Codex, Claude Code, Cursor, or another coding agent.",
    "C:\\Users\\chapm\\Projects\\ChampCity_AI",
    "## Required Repo Checks",
    "git status --short --branch",
    "git remote -v",
    "Read `AGENTS.md`.",
    "Read the validation record",
    "## Validation Commands",
    "npm run typecheck",
    "npm run build",
    "npm test",
    "npm run test:work-cards",
    "git status --short",
    repairPromptScopeGuard,
    "Do not broaden implementation.",
    "Do not update Work Card status.",
    "Implementer Report Requirement",
    "BUILDER_REPORT_REPAIR_WC07_human_validation_and_repair_loop.md",
    "Do not create a release tag.",
    "Do not push unless explicitly instructed.",
  ];
  const missingRepairPromptText = requiredRepairPromptText.filter(
    (text) => !repairPrompt.includes(text),
  );

  if (missingRepairPromptText.length > 0) {
    console.error("Repair prompt is missing required text:");
    for (const text of missingRepairPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const expectedValidationJsonFileName =
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.json";
  const expectedValidationMarkdownFileName =
    "VALIDATION_REPORT_WC07_human_validation_and_repair_loop.md";
  const expectedRepairPromptFileName =
    "REPAIR_PROMPT_WC07_human_validation_and_repair_loop.md";

  if (buildValidationReportJsonFileName(record) !== expectedValidationJsonFileName) {
    console.error("Validation Report JSON filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (
    buildValidationReportMarkdownFileName(record) !==
    expectedValidationMarkdownFileName
  ) {
    console.error("Validation Report Markdown filename generation returned the wrong filename.");
    process.exit(1);
  }

  if (buildRepairPromptFileName(record) !== expectedRepairPromptFileName) {
    console.error("Repair Prompt filename generation returned the wrong filename.");
    process.exit(1);
  }

  try {
    validateValidationReportFileName("../bad.json");
    console.error("Validation Report filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  try {
    validateRepairPromptFileName("../bad.md");
    console.error("Repair Prompt filename sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }
}

async function assertSavedWorkCardListing() {
  const result = await listSavedWorkCards("phase-01");

  if (!result.ok) {
    console.error("Saved Work Card listing failed for phase-01:");
    for (const error of result.errorMessages ?? []) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const listedWorkCardIds = new Set(
    (result.workCards ?? []).map((workCard) => workCard.workCardId),
  );
  const expectedWorkCardIds = [
    "WC01",
    "WC02",
    "WC03",
    "WC04",
    "WC05",
    "WC06",
    "WC07",
    "WC08",
    "WC09",
    "WC10",
  ];
  const missingWorkCardIds = expectedWorkCardIds.filter(
    (workCardId) => !listedWorkCardIds.has(workCardId),
  );

  if (missingWorkCardIds.length > 0) {
    console.error(
      `Saved Work Card listing is missing expected Work Cards: ${missingWorkCardIds.join(", ")}.`,
    );
    process.exit(1);
  }
}

function assertUiDesignHandoffPackage() {
  const requiredFiles = [
    "README.md",
    "CURRENT_UI_INVENTORY.md",
    "UX_FLOW_MAP.md",
    "BRAND_AND_UI_DIRECTION.md",
    "FIGMA_PROMPT.md",
    "SOURCE_REFERENCES.md",
    "SCREENSHOT_CAPTURE_INSTRUCTIONS.md",
  ];

  for (const fileName of requiredFiles) {
    const filePath = resolve(uiDesignHandoffDirectory, fileName);

    if (!existsSync(filePath)) {
      console.error(`UI design handoff package is missing ${fileName}.`);
      process.exit(1);
    }
  }

  const figmaPrompt = readFileSync(
    resolve(uiDesignHandoffDirectory, "FIGMA_PROMPT.md"),
    "utf8",
  );
  const requiredPromptText = [
    "ChampCity A/I",
    "Architect / Implementer",
    "dark",
    "compact",
    "React",
  ];
  const missingPromptText = requiredPromptText.filter(
    (text) => !figmaPrompt.includes(text),
  );

  if (missingPromptText.length > 0) {
    console.error("Figma prompt is missing required text:");
    for (const text of missingPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const screenshotInstructions = readFileSync(
    resolve(uiDesignHandoffDirectory, "SCREENSHOT_CAPTURE_INSTRUCTIONS.md"),
    "utf8",
  );
  const missingScreens = currentUiScreens.filter(
    (screen) => !screenshotInstructions.includes(screen),
  );

  if (missingScreens.length > 0) {
    console.error("Screenshot capture instructions are missing screens:");
    for (const screen of missingScreens) {
      console.error(`- ${screen}`);
    }
    process.exit(1);
  }

  const zipPath = resolve(
    uiDesignHandoffDirectory,
    "ChampCity_AI_Figma_UI_Handoff.zip",
  );

  if (existsSync(zipPath)) {
    const zipText = readFileSync(zipPath).toString("latin1").replace(/\\/g, "/");
    const forbiddenEntries = ["node_modules/", ".git/"];
    const foundForbiddenEntry = forbiddenEntries.find((entry) =>
      zipText.includes(entry),
    );

    if (foundForbiddenEntry) {
      console.error(
        `UI handoff zip includes a forbidden folder: ${foundForbiddenEntry}`,
      );
      process.exit(1);
    }
  }
}

function assertWc10UiAndTerminology() {
  const requiredFiles = [
    rendererAppPath,
    rendererEntryPath,
    rendererTailwindPath,
    rendererThemePath,
    rendererIconPath,
    rendererBrandingPath,
    figmaSourcePackagePath,
    figmaImplementationMapPath,
    resolve(
      checkedInWorkCardsDirectory,
      "WC10_implement_figma_ui_and_terminology_alignment.json",
    ),
    resolve(
      checkedInWorkCardsDirectory,
      "WC10_implement_figma_ui_and_terminology_alignment.md",
    ),
  ];

  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      console.error(`WC10 required artifact is missing: ${filePath}`);
      process.exit(1);
    }
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const rendererSource = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(rendererEntryPath, "utf8"),
  ].join("\n");
  const rendererStyles = [
    readFileSync(rendererTailwindPath, "utf8"),
    readFileSync(rendererThemePath, "utf8"),
  ].join("\n");

  for (const label of wc10PipelineLabels) {
    if (!rendererSource.includes(`label: "${label}"`)) {
      console.error(`Renderer pipeline is missing step label: ${label}`);
      process.exit(1);
    }
  }

  const requiredRendererText = [
    "Architect / Implementer",
    "Implementer Prompt Generator",
    "Implementer Report Capture",
    "Save Implementer Prompt",
    "Save Implementer Report",
    "champcity_ai_ui_branding.png",
    "window.champCity",
    "listSavedWorkCards",
    "previewBuilderPrompt",
    "saveHumanValidationRecord",
    "PipelineStepper",
    "ArtifactPanel",
    "ScreenLayout",
  ];
  const missingRendererText = requiredRendererText.filter(
    (text) => !rendererSource.includes(text),
  );

  if (missingRendererText.length > 0) {
    console.error("Renderer is missing WC10 UI terminology or branding text:");
    for (const text of missingRendererText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const forbiddenRendererText = [
    'label: "Build"',
    '"Builder Prompt Generator"',
    '"Builder Report Capture"',
    "champcity_ai_icon_clean_no_shadow_TRANSPARENT.png",
    'className: "brand-mark"',
    'h("p", { className: "eyebrow" }, "Architect / Implementer")',
    "DEMO_CARDS",
    "ARTIFACT_SUMMARY",
    "src=\"./vendor/react.development.js\"",
  ];
  const foundForbiddenText = forbiddenRendererText.filter((text) =>
    rendererSource.includes(text),
  );

  if (foundForbiddenText.length > 0) {
    console.error("Renderer contains old visible labels or Figma demo data:");
    for (const text of foundForbiddenText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const requiredStyleText = [
    "color-scheme: dark",
    "#080a0d",
    "--primary: #00cce6",
    "@import \"tailwindcss\" source(none)",
    "@source \"../**/*.{js,ts,jsx,tsx}\"",
    "@theme inline",
  ];
  const missingStyleText = requiredStyleText.filter(
    (text) => !rendererStyles.includes(text),
  );

  if (missingStyleText.length > 0) {
    console.error("Renderer Tailwind styles are missing WC10 dark UI tokens:");
    for (const text of missingStyleText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const requiredAppStyleText = [
    "overflow-x-auto",
    "break-anywhere",
    "bg-background",
    "text-primary",
    "border-border",
  ];
  const missingAppStyleText = requiredAppStyleText.filter(
    (text) => !rendererSource.includes(text),
  );

  if (missingAppStyleText.length > 0) {
    console.error("Renderer source is missing expected Figma/Tailwind class usage:");
    for (const text of missingAppStyleText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const requiredDependencies = {
    dependencies: ["lucide-react", "react", "react-dom"],
    devDependencies: [
      "@tailwindcss/vite",
      "@vitejs/plugin-react",
      "@types/react",
      "@types/react-dom",
      "tailwindcss",
      "vite",
    ],
  };

  for (const [dependencyGroup, dependencyNames] of Object.entries(requiredDependencies)) {
    for (const dependencyName of dependencyNames) {
      if (!packageJson[dependencyGroup]?.[dependencyName]) {
        console.error(
          `Renderer package dependency is missing: ${dependencyGroup}.${dependencyName}`,
        );
        process.exit(1);
      }
    }
  }

  const implementerReport = [
    "# Implementer Report - sample",
    "",
    "## Repository Path Inspected",
    "C:\\Users\\chapm\\Projects\\ChampCity_AI",
    "",
    "## Git Branch And Remote Status",
    "git status and git remote were checked.",
    "",
    "## Files Created",
    "None.",
    "",
    "## Files Modified",
    "None.",
    "",
    "## Files Intentionally Not Created",
    "None.",
    "",
    "## Commands Run And Results",
    "npm run typecheck - passed",
    "",
    "## Validation Performed",
    "npm run build - passed",
    "",
    "## Validation Skipped And Reason",
    "Manual UI validation skipped in script.",
    "",
    "## Git Actions Performed",
    "Commit hash: abc1234",
    "",
    "## Security/Secret-Safety Notes",
    "No secrets.",
    "",
    "## Blocking Questions",
    "None.",
    "",
    "## Recommended Next Implementer Task",
    "Manual validation.",
  ].join("\n");
  const reportValidation = validateBuilderReport(implementerReport);

  if (!reportValidation.validEnoughToSave) {
    console.error("Implementer Report heading was not accepted by the report validator.");
    process.exit(1);
  }
}

function assertProjectIntake() {
  const validation = validateProjectIntake(projectIntakeFixture);

  if (!validation.valid) {
    console.error("Project Intake fixture validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.error("Project Intake fixture should include optional warning context.");
    for (const warning of validation.warnings) {
      console.error(`- ${warning}`);
    }
    process.exit(1);
  }

  const markdown = renderProjectIntakeMarkdown(projectIntakeFixture);
  const requiredMarkdownText = [
    `# Project Intake: ${projectIntakeFixture.projectName}`,
    ...projectIntakeMarkdownHeadings,
    projectIntakeNextStepText,
  ];
  const missingMarkdownText = requiredMarkdownText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingMarkdownText.length > 0) {
    console.error("Project Intake Markdown is missing required text:");
    for (const text of missingMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const missingRequired = validateProjectIntake({
    ...projectIntakeFixture,
    projectName: "",
    productSummary: "",
    targetUsers: "",
    userProblem: "",
    desiredUserOutcome: "",
    sourceOfTruthLocation: "",
  });

  if (missingRequired.valid || missingRequired.errors.length < 6) {
    console.error("Project Intake validation did not reject missing required fields.");
    process.exit(1);
  }

  const missingHelpfulContext = validateProjectIntake({
    ...projectIntakeFixture,
    knownConstraints: "",
    nonGoals: "",
    securityOrDataConcerns: "",
    operatorUncertainties: "",
  });

  if (!missingHelpfulContext.valid) {
    console.error("Project Intake warnings should not block save.");
    process.exit(1);
  }

  if (missingHelpfulContext.warnings.length < 4) {
    console.error("Project Intake did not warn for missing optional-but-important fields.");
    process.exit(1);
  }

  const builtProjectIntake = buildProjectIntake(
    {
      projectName: "ChampCity A/I",
      workingTitle: "Upstream intake",
      productSummary: "Capture the project idea.",
      targetUsers: "Operator",
      userProblem: "Project starts are hard to express.",
      desiredUserOutcome: "Operator can save intake.",
      businessOrPersonalGoal: "Improve planning.",
      currentStage: "mvp",
      sourceOfTruthLocation: "C:\\Users\\chapm\\Projects\\ChampCity_AI",
      preferredImplementerTool: "Codex",
      architectSurface: "ChatGPT",
      knownConstraints: "",
      nonGoals: "",
      securityOrDataConcerns: "",
      examplesOrReferences: "",
      operatorUncertainties: "",
      notesForArchitect: "",
    },
    "2026-06-30T15:00:00.000Z",
  );

  if (builtProjectIntake.projectIntakeId !== "PROJECT_INTAKE_champcity_a_i") {
    console.error("Project Intake builder did not create the expected intake ID.");
    process.exit(1);
  }

  const intakeFileNames = buildProjectIntakeFileNames("ChampCity A/I");

  if (
    intakeFileNames.jsonFileName !== "PROJECT_INTAKE_champcity_a_i.json" ||
    intakeFileNames.markdownFileName !== "PROJECT_INTAKE_champcity_a_i.md"
  ) {
    console.error("Project Intake filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validateProjectIntakeSlug("../bad").length === 0) {
    console.error("Project Intake slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateProjectIntakeArtifactFileName("../bad.json").length === 0) {
    console.error("Project Intake artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  try {
    resolveInside(resolveProjectIntakeDirectory(), "../bad");
    console.error("Project Intake path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const intakeSource = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Project Intake"',
    "What are you trying to build?",
    "previewProjectIntake",
    "saveProjectIntake",
    "Project Architect Interview",
    "Project Profile",
    "planningProjectRoot",
    "resolveProjectIntakeDirectory",
    "validateProjectIntakeArtifactFileName",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !intakeSource.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Project Intake source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function assertProjectArchitectInterviewPrompt() {
  const promptRecord = buildProjectArchitectInterviewPrompt(
    projectIntakeFixture,
    "PROJECT_INTAKE_champcity_a_i.json",
    "PROJECT_INTAKE_champcity_a_i.md",
    "2026-06-30T18:30:00.000Z",
  );
  const validation = validateProjectArchitectInterviewPrompt(promptRecord);

  if (!validation.valid) {
    console.error("Project Architect Interview Prompt validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  if (promptRecord.promptPurpose !== projectArchitectInterviewPromptPurpose) {
    console.error("Project Architect Interview Prompt purpose changed unexpectedly.");
    process.exit(1);
  }

  if (
    promptRecord.operatorInstruction !==
    projectArchitectInterviewOperatorInstruction
  ) {
    console.error("Project Architect Interview operator instruction changed unexpectedly.");
    process.exit(1);
  }

  const requiredPromptText = [
    "Act as Architect for the project described below.",
    "Project Intake:",
    projectIntakeFixture.projectName,
    projectIntakeFixture.productSummary,
    "Do not create the final Project Profile yet.",
    "Do not create a roadmap yet.",
    "Do not create Phase Plans yet.",
    "Do not create Work Cards yet.",
    "Do not write implementation code.",
    "Do not pretend you saved files.",
    "Your goal is not to create the final Project Profile yet.",
    "Ask only the questions that truly require Operator judgment.",
    "When a reasonable default is available, propose the default and mark it as an assumption",
    "For every question you ask, provide suggested answers in plain language.",
    "Preserve the Architect / Implementer mental model.",
    "Builder/Implementer tooling",
    "Required project-profile areas to complete:",
    "Source-of-truth location",
    "Initial phase candidates",
    "Key risks and drift warnings",
    "Produce a structured Project Architect Interview Completion Summary",
    "Suggested next step: generate Project Planning Documents.",
    "Do not generate the Project Planning Documents yet.",
  ];
  const missingPromptText = requiredPromptText.filter(
    (text) => !promptRecord.promptText.includes(text),
  );

  if (missingPromptText.length > 0) {
    console.error("Project Architect Interview prompt text is missing required text:");
    for (const text of missingPromptText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const markdown = renderProjectArchitectInterviewPromptMarkdown(promptRecord);
  const requiredMarkdownText = [
    `# Project Architect Interview Prompt: ${projectIntakeFixture.projectName}`,
    ...projectArchitectInterviewPromptMarkdownHeadings,
    promptRecord.promptText,
    projectArchitectInterviewPromptNextStepText,
  ];
  const missingMarkdownText = requiredMarkdownText.filter(
    (text) => !markdown.includes(text),
  );

  if (missingMarkdownText.length > 0) {
    console.error("Project Architect Interview Prompt Markdown is missing required text:");
    for (const text of missingMarkdownText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }

  const promptFileNames =
    buildProjectArchitectInterviewPromptFileNames("ChampCity A/I");

  if (
    promptFileNames.jsonFileName !==
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.json" ||
    promptFileNames.markdownFileName !==
      "PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md"
  ) {
    console.error("Project Architect Interview Prompt filename generation returned unexpected filenames.");
    process.exit(1);
  }

  if (validateProjectArchitectInterviewPromptSlug("../bad").length === 0) {
    console.error("Project Architect Interview Prompt slug sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateProjectArchitectInterviewPromptArtifactFileName("../bad.json")
      .length === 0
  ) {
    console.error("Project Architect Interview Prompt artifact filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (validateSavedProjectIntakeJsonFileName("../bad.json").length === 0) {
    console.error("Saved Project Intake JSON filename sanitizer failed to reject traversal input.");
    process.exit(1);
  }

  if (
    validateSavedProjectIntakeJsonFileName("PROJECT_INTAKE_bad.md").length ===
    0
  ) {
    console.error("Saved Project Intake JSON filename sanitizer failed to require JSON.");
    process.exit(1);
  }

  try {
    resolveInside(resolveProjectArchitectInterviewPromptsDirectory(), "../bad");
    console.error("Project Architect Interview Prompt path sanitizer failed to reject traversal input.");
    process.exit(1);
  } catch {
    // Expected.
  }

  const source = [
    readFileSync(rendererAppPath, "utf8"),
    readFileSync(preloadPath, "utf8"),
    readFileSync(mainWorkCardFileStorePath, "utf8"),
  ].join("\n");
  const requiredSourceText = [
    'label: "Project Architect"',
    "Project Architect Interview",
    "Saved Project Intake",
    "Generate Interview Prompt",
    "Copy Architect Prompt",
    "Save Architect Prompt",
    "Project_Architect_Interview_Prompts",
    "listSavedProjectIntakes",
    "previewProjectArchitectInterviewPrompt",
    "saveProjectArchitectInterviewPrompt",
    "validateSavedProjectIntakeJsonFileName",
    "validateProjectArchitectInterviewPromptArtifactFileName",
  ];
  const missingSourceText = requiredSourceText.filter(
    (text) => !source.includes(text),
  );

  if (missingSourceText.length > 0) {
    console.error("Project Architect Interview source wiring is missing required text:");
    for (const text of missingSourceText) {
      console.error(`- ${text}`);
    }
    process.exit(1);
  }
}

function makeWorkCard(overrides = {}) {
  return {
    workCardId: "WCTEST",
    title: "Risk router test card",
    phase: "phase-01",
    status: "ready_for_architect",
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
    problem: "Build a small UI validation change.",
    goal: "Make the workflow clearer.",
    userOutcome: "The Operator can review clearer guidance.",
    scope: ["Make a narrow change."],
    outOfScope: ["Avoid unrelated work."],
    requirements: ["Keep the change narrow."],
    acceptanceCriteria: ["The behavior is visible."],
    validationPlan: ["Run the lightweight validation script."],
    riskLevel: "medium",
    risks: ["Manual review is still required."],
    builderInstructions: ["Keep the Builder task narrow."],
    operatorNotes: ["This is a deterministic test card."],
    ...overrides,
  };
}
