import { slugifyProjectIntakeName } from "./projectIntake";
import { validateSafePhaseFolder } from "./workCardFileNames";

export interface RepositoryReconciliationPromptRequest {
  projectName?: string;
  projectPlanningDocumentFileName?: string;
  sourcePhaseFolder?: string;
}

export interface RepositoryReconciliationRequest
  extends RepositoryReconciliationPromptRequest {
  architectReconciliationOutput: string;
}

export interface RepositoryReconciliationPromptContext {
  projectPlanningDocumentsSummary: string;
  selectedProjectPlanningDocumentsSummary: string;
  phaseArtifactSummary: string;
  repositoryStructureSummary: string;
  appWorkflowSummary: string;
}

export interface RepositoryReconciliationRecord {
  reconciliationId: string;
  projectName: string;
  sourceProjectPlanningDocument: string;
  sourceProjectPlanningSidecarJsonFileName?: string;
  sourceProjectPlanningSidecarMarkdownFileName?: string;
  sourcePhaseFolder?: string;
  reviewedArtifactSummary: string;
  implementedStateSummary: string;
  partiallyImplementedItems: string[];
  missingItems: string[];
  stalePlanningItems: string[];
  designDriftNotes: string;
  currentRisks: string[];
  recommendedRoadmap: string;
  recommendedMilestones: string[];
  recommendedPhases: string[];
  recommendedNextPhase: string;
  architectNotes: string;
  architectReconciliationOutput: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryReconciliationArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface RepositoryReconciliationPromptPreviewResult {
  ok: boolean;
  promptText?: string;
  errorMessages?: string[];
}

export interface RepositoryReconciliationPreviewResult {
  ok: boolean;
  reconciliation?: RepositoryReconciliationRecord;
  markdown?: string;
  suggestedFileNames?: RepositoryReconciliationArtifactFileNames;
  errorMessages?: string[];
}

export interface RepositoryReconciliationSaveResult
  extends RepositoryReconciliationPreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
}

export interface SavedRepositoryReconciliationSummary {
  fileName: string;
  reconciliationId: string;
  projectName: string;
  sourcePhaseFolder?: string;
  recommendedNextPhase: string;
  updatedAt: string;
}

export interface InvalidSavedRepositoryReconciliationFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedRepositoryReconciliationsResult {
  ok: boolean;
  reconciliations?: SavedRepositoryReconciliationSummary[];
  invalidFiles?: InvalidSavedRepositoryReconciliationFile[];
  errorMessages?: string[];
}

export function buildRepositoryReconciliationPromptText(
  input: RepositoryReconciliationPromptRequest,
  context: RepositoryReconciliationPromptContext,
): string {
  const projectName = cleanText(input.projectName) || "ChampCity A/I";
  const sourceProjectPlanningDocument = formatSourceProjectPlanningDocument(
    input.projectPlanningDocumentFileName,
  );
  const sourcePhaseFolder = cleanText(input.sourcePhaseFolder);

  if (sourcePhaseFolder.length > 0) {
    const phaseErrors = validateSafePhaseFolder(sourcePhaseFolder);

    if (phaseErrors.length > 0) {
      throw new Error(phaseErrors.join(" "));
    }
  }

  return [
    "Act as Architect for repository and project-state reconciliation.",
    "",
    `Project: ${projectName}`,
    `Source Project Planning Document: ${sourceProjectPlanningDocument}`,
    `Source Phase Folder: ${sourcePhaseFolder || "Not selected."}`,
    "",
    "Purpose:",
    "Review the current repo/project state before roadmap, milestone, phase, or Work Card planning continues. This is a reusable product workflow for partially completed projects.",
    "",
    "Safe project context available to review:",
    context.projectPlanningDocumentsSummary,
    "",
    "Selected Project Planning Documents sidecar:",
    context.selectedProjectPlanningDocumentsSummary,
    "",
    "Current phase/work-card artifact summary:",
    context.phaseArtifactSummary,
    "",
    "Current app workflow surface:",
    context.appWorkflowSummary,
    "",
    "Safe repository structure summary:",
    context.repositoryStructureSummary,
    "",
    "Review instructions:",
    "1. Review current project planning documents.",
    "2. Review current phase and Work Card artifacts.",
    "3. Review existing validation reports and Implementer reports when relevant.",
    "4. Review the current app workflow surface.",
    "5. Review the repo structure and implementation state only through the safe summaries above.",
    "6. Identify gaps between the intended planning sequence and the actual implemented state.",
    "7. Call out stale wording, stale assumptions, design drift, and partially completed work.",
    "8. Recommend a roadmap from current state to product release.",
    "",
    "Return a structured reconciliation using these exact headings:",
    "## Reviewed Artifact Summary",
    "## Implemented State Summary",
    "## Partially Implemented Items",
    "## Missing Items",
    "## Stale Planning Items",
    "## Design Drift Notes",
    "## Current Risks",
    "## Recommended Roadmap",
    "## Recommended Milestones",
    "## Recommended Phases",
    "## Recommended Next Phase",
    "## Architect Notes",
    "",
    "Important constraints:",
    "- Preserve Operator / Architect / Implementer terminology.",
    "- Preserve the Capture -> Frame -> Plan -> Build -> Prove mental model.",
    "- Do not write implementation code.",
    "- Do not create formal Work Card JSON artifacts.",
    "- Do not perform validation acceptance, phase closeout, release work, or product-owner approval.",
  ].join("\n");
}

export function buildRepositoryReconciliationRecord(
  input: RepositoryReconciliationRequest,
  context: RepositoryReconciliationPromptContext,
  timestamp: string,
): RepositoryReconciliationRecord {
  const architectReconciliationOutput = cleanText(
    input.architectReconciliationOutput,
  );

  if (architectReconciliationOutput.length === 0) {
    throw new Error("Paste the completed Architect reconciliation output first.");
  }

  const projectName =
    cleanText(input.projectName) ||
    inferProjectNameFromOutput(architectReconciliationOutput) ||
    "ChampCity A/I";
  const sourcePhaseFolder = cleanText(input.sourcePhaseFolder);

  if (sourcePhaseFolder.length > 0) {
    const phaseErrors = validateSafePhaseFolder(sourcePhaseFolder);

    if (phaseErrors.length > 0) {
      throw new Error(phaseErrors.join(" "));
    }
  }

  const fileNames = buildRepositoryReconciliationFileNames(projectName);
  const reviewedArtifactSummary =
    formatExtractedText(
      architectReconciliationOutput,
      ["reviewed artifact", "artifact summary", "source summary"],
      context.projectPlanningDocumentsSummary,
    ) || "Not provided.";
  const implementedStateSummary =
    formatExtractedText(
      architectReconciliationOutput,
      ["implemented state", "already implemented", "implemented"],
      "",
    ) || "Not provided.";
  const partiallyImplementedItems = extractNamedSection(
    architectReconciliationOutput,
    ["partially implemented", "partial"],
  );
  const missingItems = extractNamedSection(architectReconciliationOutput, [
    "missing item",
    "missing",
  ]);
  const stalePlanningItems = extractNamedSection(
    architectReconciliationOutput,
    ["stale planning", "stale assumption", "stale"],
  );
  const designDriftNotes =
    formatExtractedText(architectReconciliationOutput, [
      "design drift",
      "drift",
    ]) || "Not provided.";
  const currentRisks = uniqueNonEmpty([
    ...extractNamedSection(architectReconciliationOutput, [
      "current risk",
      "risk",
      "warning",
    ]),
    ...extractLinesByPattern(
      architectReconciliationOutput,
      /\b(risk|warning|drift|security|unsafe|blocker)\b/i,
    ),
  ]);
  const recommendedRoadmap =
    formatExtractedText(architectReconciliationOutput, [
      "recommended roadmap",
      "roadmap",
    ]) || "Not provided.";
  const recommendedMilestones = extractNamedSection(
    architectReconciliationOutput,
    ["recommended milestone", "milestone"],
  );
  const recommendedPhases = extractNamedSection(
    architectReconciliationOutput,
    ["recommended phase", "phase sequence", "phase"],
  );
  const recommendedNextPhase =
    firstUseful(
      extractNamedSection(architectReconciliationOutput, [
        "recommended next phase",
        "next phase",
      ]),
    ) || "Not provided.";
  const architectNotes =
    formatExtractedText(architectReconciliationOutput, [
      "architect note",
      "notes",
    ]) || "Not provided.";

  return {
    reconciliationId: `REPOSITORY_RECONCILIATION_${fileNames.slug}`,
    projectName,
    sourceProjectPlanningDocument: formatSourceProjectPlanningDocument(
      input.projectPlanningDocumentFileName,
    ),
    sourceProjectPlanningSidecarJsonFileName:
      cleanText(input.projectPlanningDocumentFileName) || undefined,
    sourceProjectPlanningSidecarMarkdownFileName:
      cleanText(input.projectPlanningDocumentFileName).length > 0
        ? cleanText(input.projectPlanningDocumentFileName).replace(
            /\.json$/i,
            ".md",
          )
        : undefined,
    sourcePhaseFolder: sourcePhaseFolder || undefined,
    reviewedArtifactSummary,
    implementedStateSummary,
    partiallyImplementedItems,
    missingItems,
    stalePlanningItems,
    designDriftNotes,
    currentRisks,
    recommendedRoadmap,
    recommendedMilestones,
    recommendedPhases,
    recommendedNextPhase,
    architectNotes,
    architectReconciliationOutput,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renderRepositoryReconciliationMarkdown(
  record: RepositoryReconciliationRecord,
): string {
  return [
    `# Repository Reconciliation: ${record.projectName}`,
    section(
      "Source Context",
      [
        `Reconciliation ID: ${record.reconciliationId}`,
        `Project: ${record.projectName}`,
        `Source Project Planning Document: ${record.sourceProjectPlanningDocument}`,
        `Source sidecar JSON: ${record.sourceProjectPlanningSidecarJsonFileName ?? "Not selected."}`,
        `Source sidecar Markdown: ${record.sourceProjectPlanningSidecarMarkdownFileName ?? "Not found."}`,
        `Source phase folder: ${record.sourcePhaseFolder ?? "Not selected."}`,
        `Created: ${record.createdAt}`,
        `Updated: ${record.updatedAt}`,
      ].join("\n"),
    ),
    section("Reviewed Artifact Summary", record.reviewedArtifactSummary),
    section("Implemented State Summary", record.implementedStateSummary),
    section(
      "Partially Implemented Items",
      formatListOrFallback(record.partiallyImplementedItems, "Not provided."),
    ),
    section(
      "Missing Items",
      formatListOrFallback(record.missingItems, "Not provided."),
    ),
    section(
      "Stale Planning Items",
      formatListOrFallback(record.stalePlanningItems, "Not provided."),
    ),
    section("Design Drift Notes", record.designDriftNotes),
    section(
      "Current Risks",
      formatListOrFallback(record.currentRisks, "Not provided."),
    ),
    section("Recommended Roadmap", record.recommendedRoadmap),
    section(
      "Recommended Milestones",
      formatListOrFallback(record.recommendedMilestones, "Not provided."),
    ),
    section(
      "Recommended Phases",
      formatListOrFallback(record.recommendedPhases, "Not provided."),
    ),
    section("Recommended Next Phase", record.recommendedNextPhase),
    section("Architect Notes", record.architectNotes),
    section("Completed Architect Reconciliation Output", record.architectReconciliationOutput),
  ].join("\n\n") + "\n";
}

export function buildRepositoryReconciliationFileNames(
  projectName: string,
): RepositoryReconciliationArtifactFileNames {
  const slug = slugifyProjectIntakeName(projectName);
  const slugErrors = validateRepositoryReconciliationSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `REPOSITORY_RECONCILIATION_${slug}.json`,
    markdownFileName: `REPOSITORY_RECONCILIATION_${slug}.md`,
  };
}

export function validateRepositoryReconciliationSlug(slug: string): string[] {
  const value = cleanText(slug);

  if (value.length === 0) {
    return ["Repository Reconciliation filenames need a project name."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Repository Reconciliation filenames must stay inside the approved folder.",
    ];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Repository Reconciliation filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validateRepositoryReconciliationArtifactFileName(
  fileName: string,
): string[] {
  const value = cleanText(fileName);

  if (value.length === 0) {
    return ["Repository Reconciliation filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Repository Reconciliation filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^REPOSITORY_RECONCILIATION_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Repository Reconciliation artifacts must be named REPOSITORY_RECONCILIATION_<slug>.json or REPOSITORY_RECONCILIATION_<slug>.md.",
    ];
  }

  return [];
}

export function validateRepositoryReconciliationRecord(
  candidate: unknown,
): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return ["Repository Reconciliation JSON must be an object."];
  }

  const requiredStringFields = [
    "reconciliationId",
    "projectName",
    "sourceProjectPlanningDocument",
    "reviewedArtifactSummary",
    "implementedStateSummary",
    "designDriftNotes",
    "recommendedRoadmap",
    "recommendedNextPhase",
    "architectNotes",
    "architectReconciliationOutput",
    "createdAt",
    "updatedAt",
  ] as const;

  for (const field of requiredStringFields) {
    const value = candidate[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${field} must be saved as text.`);
    }
  }

  for (const field of [
    "partiallyImplementedItems",
    "missingItems",
    "stalePlanningItems",
    "currentRisks",
    "recommendedMilestones",
    "recommendedPhases",
  ] as const) {
    if (!Array.isArray(candidate[field])) {
      errors.push(`${field} must be saved as a list.`);
    }
  }

  if (
    "sourcePhaseFolder" in candidate &&
    candidate.sourcePhaseFolder !== undefined
  ) {
    if (typeof candidate.sourcePhaseFolder !== "string") {
      errors.push("sourcePhaseFolder must be saved as text.");
    } else {
      errors.push(...validateSafePhaseFolder(candidate.sourcePhaseFolder));
    }
  }

  return errors;
}

function formatSourceProjectPlanningDocument(
  fileName: string | undefined,
): string {
  const value = cleanText(fileName);

  return value.length > 0
    ? `planning/project/Project_Planning_Documents/${value}`
    : "Current project planning documents under planning/project/.";
}

function formatExtractedText(
  output: string,
  keys: string[],
  fallback = "",
): string {
  return firstUseful(extractNamedSection(output, keys)) || fallback;
}

function extractNamedSection(output: string, keys: string[]): string[] {
  const lines = output.split(/\r?\n/);
  const collected: string[] = [];
  let active = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    if (isLikelyHeading(line)) {
      const heading = normalizeHeading(line);
      active = keys.some((key) => heading.includes(key));

      if (active && headingHasInlineValue(line)) {
        const [, value] = line.replace(/^#+\s*/, "").split(/:\s+/, 2);

        if (value) {
          collected.push(cleanListLine(value));
        }
      }

      continue;
    }

    if (active) {
      collected.push(cleanListLine(line));
    }
  }

  return limitItems(uniqueNonEmpty(collected));
}

function extractLinesByPattern(output: string, pattern: RegExp): string[] {
  return limitItems(
    uniqueNonEmpty(
      output
        .split(/\r?\n/)
        .map((line) => cleanListLine(line.trim()))
        .filter((line) => line.length > 0 && pattern.test(line)),
    ),
  );
}

function inferProjectNameFromOutput(output: string): string | undefined {
  const projectNameLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^[-*]?\s*(project name|project):/i.test(line));

  if (!projectNameLine) {
    return undefined;
  }

  return projectNameLine.replace(/^[-*]?\s*(project name|project):/i, "").trim();
}

function isLikelyHeading(line: string): boolean {
  if (/^#{1,6}\s+\S/.test(line)) {
    return true;
  }

  if (/^\*{0,2}\d+[.)]\s+[^:]+:?/.test(line)) {
    return true;
  }

  if (/^[A-Z][A-Za-z /-]{2,100}:$/.test(line)) {
    return true;
  }

  return /^[*-]\s+\*\*[^*]+:\*\*/.test(line);
}

function headingHasInlineValue(line: string): boolean {
  return /:\s+\S/.test(line);
}

function normalizeHeading(line: string): string {
  return line
    .toLowerCase()
    .replace(/^#+\s*/, "")
    .replace(/^[*-]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/:.*$/, "")
    .trim();
}

function cleanListLine(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\*\*([^*]+)\*\*:\s*/, "$1: ")
    .trim()
    .slice(0, 420);
}

function limitItems(items: string[]): string[] {
  return items.slice(0, 16);
}

function firstUseful(values: string[]): string | undefined {
  return values.find((value) => value.trim().length > 0);
}

function uniqueNonEmpty(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = trimmed.toLowerCase();

    if (trimmed.length === 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function formatListOrFallback(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `- ${fallback}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim().length > 0 ? body : "Not provided."}`;
}

function cleanText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
