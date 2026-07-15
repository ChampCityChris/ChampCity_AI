import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const apply = process.argv.includes("--apply");
const repositoryRoot = path.resolve(
  process.argv.find((value) => value.startsWith("--root="))?.slice(7) ?? ".",
);

const roots = ["src", "scripts"].map((directory) =>
  path.join(repositoryRoot, directory),
);
const excludedPathFragments = [
  `${path.sep}scripts${path.sep}migration${path.sep}`,
];
const supportedExtensions = new Set([".ts", ".tsx", ".mjs", ".cjs"]);

const replacements = [
  ["PhaseMapBuilderRequest", "PhaseMapRequest"],
  ["PhaseMapBuilderScreen", "PhaseMapScreen"],
  ["phase-map-builder", "phase-map"],
  ["Phase Map Builder", "Phase Map Composer"],
  ["phase map builder", "phase map composer"],
  ["builder-prompt-generator", "implementer-execution-packet"],
  ["builder-report-capture", "implementer-report-capture"],
  ["Builder_Reports", "Implementer_Reports"],
  ["BUILDER_REPORT", "IMPLEMENTER_REPORT"],
  ["BuilderReport", "ImplementerReport"],
  ["builderReport", "implementerReport"],
  ["Builder Reports", "Implementer Reports"],
  ["Builder Report", "Implementer Report"],
  ["builder reports", "implementer reports"],
  ["builder report", "implementer report"],
  ["Builder_Prompts", "Implementer_Execution_Packets"],
  ["BUILDER_PROMPT", "IMPLEMENTER_EXECUTION_PACKET"],
  ["BuilderPrompt", "ImplementerExecutionPacket"],
  ["builderPrompt", "implementerExecutionPacket"],
  ["Builder Prompts", "Implementer Execution Packets"],
  ["Builder Prompt", "Implementer Execution Packet"],
  ["builder prompts", "implementer execution packets"],
  ["builder prompt", "implementer execution packet"],
  ["ready_for_builder", "ready_for_implementer"],
  ["in_builder_pass", "in_implementer_pass"],
  ["builder_report_received", "implementer_report_received"],
  ["BUILDERS", "IMPLEMENTERS"],
  ["Builders", "Implementers"],
  ["builders", "implementers"],
  ["BUILDER", "IMPLEMENTER"],
  ["Builder", "Implementer"],
  ["builder", "implementer"],
];

const semanticRepairs = [
  [/\bPhase Map Implementer\b/g, "Phase Map Composer"],
  [/\bImplementer Prompts?\b/g, "Implementer Execution Packet"],
  [/\bimplementer prompts?\b/g, "implementer execution packet"],
  [/\bno Implementer terminology\b/gi, "no legacy role terminology"],
  [/\bImplementer terminology\b/g, "Implementer-facing role terminology"],
  [/\bimplementer terminology\b/g, "implementer-facing role terminology"],
  [/\bImplementer aliases\b/g, "legacy role aliases"],
  [/\bimplementer aliases\b/g, "legacy role aliases"],
  [/\bImplementer-named\b/g, "legacy-role-named"],
  [/\bimplementer-named\b/g, "legacy-role-named"],
  [/\bImplementer-name\b/g, "legacy-role-name"],
  [/\bimplementer-name\b/g, "legacy-role-name"],
  [/\blegacy Implementer role\b/gi, "legacy role"],
  [/\blegacy Implementer artifact names\b/gi, "legacy role artifact names"],
  [/\blegacy Implementer paths?\b/gi, "legacy role paths"],
  [/\bImplementer\/Implementer tooling\b/g, "Implementer tooling"],
  [/\bImplementer\/Implementer\b/g, "Implementer"],
  [/\ba Implementer\b/g, "an Implementer"],
  [
    /Rename active `Implementer_Reports\/` directories to `Implementer_Reports\/`\./g,
    "Rename active `<LEGACY_REPORT_STORAGE>/` directories to `Implementer_Reports/`.",
  ],
  [
    /Rename active `IMPLEMENTER_REPORT_\.\.\.` files to `IMPLEMENTER_REPORT_\.\.\.`\./g,
    "Rename active `<LEGACY_REPORT_PREFIX>...` files to `IMPLEMENTER_REPORT_...`.",
  ],
];

const fileRenames = new Map([
  [
    "src/shared/workCards/renderBuilderPrompt.ts",
    "src/shared/workCards/renderImplementerExecutionPacket.ts",
  ],
  [
    "src/shared/workCards/validateBuilderReport.ts",
    "src/shared/workCards/validateImplementerReport.ts",
  ],
  [
    "src/shared/workCards/fixtures/workCardBuilderPromptFixture.ts",
    "src/shared/workCards/fixtures/workCardImplementerExecutionPacketFixture.ts",
  ],
  [
    "src/shared/workCards/fixtures/workCardBuilderReportFixture.ts",
    "src/shared/workCards/fixtures/workCardImplementerReportFixture.ts",
  ],
]);

const files = [];
for (const root of roots) {
  await walk(root, files);
}

const changed = [];
for (const filePath of files.sort()) {
  if (
    excludedPathFragments.some((fragment) => filePath.includes(fragment)) ||
    !supportedExtensions.has(path.extname(filePath))
  ) {
    continue;
  }

  const before = await readFile(filePath, "utf8");
  const roleMigrated = replacements.reduce(
    (content, [from, to]) => content.split(from).join(to),
    before,
  );
  const after = semanticRepairs.reduce(
    (content, [pattern, replacement]) => content.replace(pattern, replacement),
    roleMigrated,
  );

  if (before !== after) {
    changed.push(path.relative(repositoryRoot, filePath).replaceAll("\\", "/"));
    if (apply) {
      await writeFile(filePath, after, "utf8");
    }
  }
}

const renamed = [];
for (const [fromRelative, toRelative] of fileRenames) {
  const from = path.join(repositoryRoot, fromRelative);
  const to = path.join(repositoryRoot, toRelative);
  try {
    await readFile(from);
  } catch {
    continue;
  }
  renamed.push(`${fromRelative} -> ${toRelative}`);
  if (apply) {
    await rename(from, to);
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      changedFiles: changed,
      renamedFiles: renamed,
    },
    null,
    2,
  )}\n`,
);

async function walk(directory, output) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(target, output);
    } else if (entry.isFile()) {
      output.push(target);
    }
  }
}
