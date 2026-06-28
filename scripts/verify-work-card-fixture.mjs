import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDir, "..");
const renderedFixturePath = resolve(
  repositoryRoot,
  "planning/phases/phase-01/Work_Cards/WC01_define_work_card_schema_and_markdown_renderer.md",
);

const { workCardFixture } = require("../dist/shared/workCards/fixtures/workCardFixture.js");
const { renderWorkCardMarkdown, workCardMarkdownHeadings } = require("../dist/shared/workCards/renderWorkCardMarkdown.js");
const { validateWorkCard } = require("../dist/shared/workCards/validateWorkCard.js");

const validation = validateWorkCard(workCardFixture);

if (!validation.valid) {
  console.error("Work Card fixture validation failed:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const markdown = renderWorkCardMarkdown(workCardFixture);
const requiredHeadings = [
  `# Work Card: ${workCardFixture.title}`,
  ...workCardMarkdownHeadings,
];
const missingHeadings = requiredHeadings.filter(
  (heading) => !markdown.includes(heading),
);

if (missingHeadings.length > 0) {
  console.error("Rendered Work Card Markdown is missing required headings:");
  for (const heading of missingHeadings) {
    console.error(`- ${heading}`);
  }
  process.exit(1);
}

const checkedInMarkdown = readFileSync(renderedFixturePath, "utf8");

if (checkedInMarkdown !== markdown) {
  console.error(
    "Checked-in WC01 Markdown does not match the renderer output.",
  );
  process.exit(1);
}

console.log("Work Card fixture validation passed.");
