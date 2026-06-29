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

const { workCardFixture } = require("../dist/shared/workCards/fixtures/workCardFixture.js");
const { workCardCaptureFixture } = require("../dist/shared/workCards/fixtures/workCardCaptureFixture.js");
const {
  workCardArchitectPromptFixture,
} = require("../dist/shared/workCards/fixtures/workCardArchitectPromptFixture.js");
const {
  workCardRiskRouterFixture,
} = require("../dist/shared/workCards/fixtures/workCardRiskRouterFixture.js");
const {
  buildDraftWorkCard,
} = require("../dist/shared/workCards/workCardDraft.js");
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
  routeWorkCardRisk,
} = require("../dist/shared/workCards/riskRouter.js");
const { validateWorkCard } = require("../dist/shared/workCards/validateWorkCard.js");
const {
  validateSafePhaseFolder,
} = require("../dist/shared/workCards/workCardFileNames.js");
const {
  listSavedWorkCards,
  resolveInside,
  resolveRiskReviewsDirectory,
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
];

for (const artifact of renderedArtifacts) {
  assertFixtureArtifact(artifact.fixture, artifact.path);
}

assertCheckedInJsonArtifacts();

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

assertArchitectPrompt(workCardArchitectPromptFixture);
assertRiskRouter();
assertRiskReviewMarkdown();
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

function assertCheckedInJsonArtifacts() {
  const jsonFileNames = readdirSync(checkedInWorkCardsDirectory)
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
    .sort();

  if (jsonFileNames.length === 0) {
    console.error("No checked-in Work Card JSON artifacts were found.");
    process.exit(1);
  }

  for (const fileName of jsonFileNames) {
    const jsonPath = resolve(checkedInWorkCardsDirectory, fileName);
    const markdownPath = resolve(
      checkedInWorkCardsDirectory,
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

  if (/auto-approve|automatically approved|approved for Builder/i.test(lowRiskMarkdown)) {
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
  const expectedWorkCardIds = ["WC01", "WC02", "WC03", "WC04"];
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
