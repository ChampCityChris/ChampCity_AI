import type { ProjectArchitectInterviewPrompt } from "./projectArchitectInterviewPrompt";
import {
  slugifyProjectIntakeName,
  type ProjectIntake,
} from "./projectIntake";

export const projectPlanningDocumentFileNames = [
  "PROJECT_PROFILE.md",
  "PROJECT_STATE.md",
  "WORK_CARD_BACKLOG.md",
  "OPEN_QUESTIONS.md",
  "RISKS.md",
  "DECISIONS.md",
] as const;

export type ProjectPlanningDocumentFileName =
  (typeof projectPlanningDocumentFileNames)[number];

export interface ProjectPlanningDocumentsRequest {
  projectIntakeFileName?: string;
  projectArchitectInterviewPromptFileName?: string;
  architectInterviewOutput: string;
}

export interface ProjectPlanningDocumentArtifact {
  fileName: ProjectPlanningDocumentFileName;
  title: string;
  markdown: string;
}

export interface ProjectPlanningDocumentsRecord {
  recordId: string;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  sourceProjectArchitectInterviewPromptMarkdownFileName?: string;
  architectInterviewOutput: string;
  extracted: ProjectPlanningDocumentsExtraction;
  documents: ProjectPlanningDocumentArtifact[];
}

export interface ProjectPlanningDocumentsExtraction {
  confirmedFacts: string[];
  safeAssumptions: string[];
  openQuestions: string[];
  recommendedProfileValues: string[];
  initialPhaseCandidates: string[];
  risksAndWarnings: string[];
  decisions: string[];
}

export interface ProjectPlanningDocumentsArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface ProjectPlanningDocumentsPreviewResult {
  ok: boolean;
  record?: ProjectPlanningDocumentsRecord;
  documents?: ProjectPlanningDocumentArtifact[];
  combinedMarkdown?: string;
  suggestedFileNames?: ProjectPlanningDocumentsArtifactFileNames;
  errorMessages?: string[];
}

export interface ProjectPlanningDocumentsSaveResult
  extends ProjectPlanningDocumentsPreviewResult {
  savedJsonFileName?: string;
  savedMarkdownFileName?: string;
  jsonPath?: string;
  markdownPath?: string;
  projectMarkdownPaths?: string[];
}

export interface SavedProjectArchitectInterviewPromptSummary {
  fileName: string;
  promptId: string;
  projectIntakeId: string;
  projectName: string;
  architectSurface: string;
  updatedAt: string;
}

export interface InvalidSavedProjectArchitectInterviewPromptFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedProjectArchitectInterviewPromptsResult {
  ok: boolean;
  prompts?: SavedProjectArchitectInterviewPromptSummary[];
  invalidFiles?: InvalidSavedProjectArchitectInterviewPromptFile[];
  errorMessages?: string[];
}

interface BuildProjectPlanningDocumentsInput {
  projectIntake?: ProjectIntake;
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  projectArchitectInterviewPrompt?: ProjectArchitectInterviewPrompt;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  sourceProjectArchitectInterviewPromptMarkdownFileName?: string;
  architectInterviewOutput: string;
  timestamp: string;
}

const reconciledPhase02Sequence = [
  "WC01: Add Project Intake capture",
  "WC02: Add Project Architect Interview prompt generator",
  "WC03: Repair validation and evidence UI",
  "WC04: Generate Project Planning Documents",
  "WC05: Add Phase Intake and Phase Interview prompt generator",
  "WC06: Generate Phase Planning Documents and initial Work Card plan",
] as const;

export function buildProjectPlanningDocuments(
  input: BuildProjectPlanningDocumentsInput,
): ProjectPlanningDocumentsRecord {
  const architectInterviewOutput = input.architectInterviewOutput.trim();

  if (architectInterviewOutput.length === 0) {
    throw new Error("Paste the completed Architect interview output first.");
  }

  if (!input.projectIntake && !input.projectArchitectInterviewPrompt) {
    throw new Error(
      "Select a saved Project Intake or Project Architect Interview Prompt.",
    );
  }

  const projectName = resolveProjectName(input);
  const fileNames = buildProjectPlanningDocumentsFileNames(projectName);
  const extracted = extractProjectPlanningSections(architectInterviewOutput);
  const context = {
    projectName,
    projectIntake: input.projectIntake,
    projectArchitectInterviewPrompt: input.projectArchitectInterviewPrompt,
    sourceProjectIntakeJsonFileName: input.sourceProjectIntakeJsonFileName,
    sourceProjectIntakeMarkdownFileName:
      input.sourceProjectIntakeMarkdownFileName,
    sourceProjectArchitectInterviewPromptJsonFileName:
      input.sourceProjectArchitectInterviewPromptJsonFileName,
    sourceProjectArchitectInterviewPromptMarkdownFileName:
      input.sourceProjectArchitectInterviewPromptMarkdownFileName,
    architectInterviewOutput,
    extracted,
  };
  const documents = buildProjectPlanningDocumentArtifacts(context);

  return {
    recordId: `PROJECT_PLANNING_DOCUMENTS_${fileNames.slug}`,
    projectName,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    sourceProjectIntakeJsonFileName: input.sourceProjectIntakeJsonFileName,
    sourceProjectIntakeMarkdownFileName:
      input.sourceProjectIntakeMarkdownFileName,
    sourceProjectArchitectInterviewPromptJsonFileName:
      input.sourceProjectArchitectInterviewPromptJsonFileName,
    sourceProjectArchitectInterviewPromptMarkdownFileName:
      input.sourceProjectArchitectInterviewPromptMarkdownFileName,
    architectInterviewOutput,
    extracted,
    documents,
  };
}

export function renderProjectPlanningDocumentsRecordMarkdown(
  record: ProjectPlanningDocumentsRecord,
): string {
  const sourceLines = [
    `Project: ${record.projectName}`,
    `Record ID: ${record.recordId}`,
    `Created: ${record.createdAt}`,
    `Updated: ${record.updatedAt}`,
    `Source Project Intake JSON: ${record.sourceProjectIntakeJsonFileName ?? "Not selected."}`,
    `Source Project Intake Markdown: ${record.sourceProjectIntakeMarkdownFileName ?? "Not found."}`,
    `Source Project Architect Interview Prompt JSON: ${record.sourceProjectArchitectInterviewPromptJsonFileName ?? "Not selected."}`,
    `Source Project Architect Interview Prompt Markdown: ${record.sourceProjectArchitectInterviewPromptMarkdownFileName ?? "Not found."}`,
  ];

  return [
    `# Project Planning Documents Generation: ${record.projectName}`,
    section("Source Context", sourceLines.join("\n")),
    section(
      "Written Project Documents",
      record.documents.map((document) => `- ${document.fileName}`).join("\n"),
    ),
    section("Architect Interview Output", record.architectInterviewOutput),
    ...record.documents.map((document) =>
      section(document.fileName, document.markdown.trim()),
    ),
  ].join("\n\n") + "\n";
}

export function renderProjectPlanningDocumentsPreview(
  documents: ProjectPlanningDocumentArtifact[],
): string {
  return documents
    .map((document) =>
      [
        `<!-- ${document.fileName} -->`,
        document.markdown.trim(),
      ].join("\n\n"),
    )
    .join("\n\n---\n\n") + "\n";
}

export function buildProjectPlanningDocumentsFileNames(
  projectName: string,
): ProjectPlanningDocumentsArtifactFileNames {
  const slug = slugifyProjectIntakeName(projectName);
  const slugErrors = validateProjectPlanningDocumentsSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `PROJECT_PLANNING_DOCUMENTS_${slug}.json`,
    markdownFileName: `PROJECT_PLANNING_DOCUMENTS_${slug}.md`,
  };
}

export function validateProjectPlanningDocumentsSlug(slug: string): string[] {
  const value = slug.trim();

  if (value.length === 0) {
    return ["Project Planning Documents filenames need a project name."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Planning Documents filenames must stay inside the approved folder.",
    ];
  }

  if (!/^[a-z0-9][a-z0-9_]*$/.test(value)) {
    return [
      "Project Planning Documents filenames may use only lowercase letters, numbers, and underscores.",
    ];
  }

  return [];
}

export function validateProjectPlanningDocumentsArtifactFileName(
  fileName: string,
): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Project Planning Documents filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Project Planning Documents filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^PROJECT_PLANNING_DOCUMENTS_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Project Planning Documents artifacts must be named PROJECT_PLANNING_DOCUMENTS_<slug>.json or PROJECT_PLANNING_DOCUMENTS_<slug>.md.",
    ];
  }

  return [];
}

function buildProjectPlanningDocumentArtifacts(context: {
  projectName: string;
  projectIntake?: ProjectIntake;
  projectArchitectInterviewPrompt?: ProjectArchitectInterviewPrompt;
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectIntakeMarkdownFileName?: string;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  sourceProjectArchitectInterviewPromptMarkdownFileName?: string;
  architectInterviewOutput: string;
  extracted: ProjectPlanningDocumentsExtraction;
}): ProjectPlanningDocumentArtifact[] {
  const documents: ProjectPlanningDocumentArtifact[] = [
    {
      fileName: "PROJECT_PROFILE.md",
      title: "Project Profile",
      markdown: renderProjectProfile(context),
    },
    {
      fileName: "PROJECT_STATE.md",
      title: "Project State",
      markdown: renderProjectState(context),
    },
    {
      fileName: "WORK_CARD_BACKLOG.md",
      title: "Work Card Backlog",
      markdown: renderWorkCardBacklog(),
    },
    {
      fileName: "OPEN_QUESTIONS.md",
      title: "Open Questions",
      markdown: renderOpenQuestions(context),
    },
    {
      fileName: "RISKS.md",
      title: "Risks",
      markdown: renderRisks(context),
    },
    {
      fileName: "DECISIONS.md",
      title: "Decisions",
      markdown: renderDecisions(context),
    },
  ];

  return documents;
}

function renderProjectProfile(context: {
  projectName: string;
  projectIntake?: ProjectIntake;
  projectArchitectInterviewPrompt?: ProjectArchitectInterviewPrompt;
  sourceProjectIntakeJsonFileName?: string;
  sourceProjectArchitectInterviewPromptJsonFileName?: string;
  architectInterviewOutput: string;
  extracted: ProjectPlanningDocumentsExtraction;
}): string {
  const projectIntake = context.projectIntake;
  const sourceLines = [
    projectIntake
      ? `- Project Intake: ${context.sourceProjectIntakeJsonFileName ?? "Selected."}`
      : "- Project Intake: Not selected.",
    context.projectArchitectInterviewPrompt
      ? `- Project Architect Interview Prompt: ${context.sourceProjectArchitectInterviewPromptJsonFileName ?? "Selected."}`
      : "- Project Architect Interview Prompt: Not selected.",
    "- Completed Architect interview output: pasted by Operator.",
  ];
  const thesis =
    firstUseful([
      projectIntake?.productSummary,
      findProfileValue(context.extracted.recommendedProfileValues, [
        "product",
        "summary",
        "thesis",
      ]),
      firstUseful(context.extracted.confirmedFacts),
    ]) ??
    "ChampCity A/I turns Operator intent into durable planning and implementation artifacts.";

  return [
    "# Project Profile",
    section("Project Name", context.projectName),
    section("Product Thesis", thesis),
    section(
      "User Type",
      firstUseful([
        projectIntake?.targetUsers,
        findProfileValue(context.extracted.recommendedProfileValues, [
          "user",
          "operator",
        ]),
        "Operator using Architect and Implementer assistance.",
      ]) ?? "Operator using Architect and Implementer assistance.",
    ),
    section("Core Loop", "Capture -> Frame -> Plan -> Build -> Prove"),
    section(
      "Source of Truth",
      firstUseful([
        projectIntake?.sourceOfTruthLocation,
        findProfileValue(context.extracted.recommendedProfileValues, [
          "source",
          "truth",
        ]),
        "Repository files and planning artifacts are the durable source of truth.",
      ]) ??
        "Repository files and planning artifacts are the durable source of truth.",
    ),
    section(
      "Roles",
      [
        `- Operator: owns priority, approval, credentials, business judgment, and final acceptance.`,
        `- Architect: ${projectIntake?.architectSurface || "ChatGPT"} or another planning surface that frames work before implementation.`,
        `- Implementer: ${projectIntake?.preferredImplementerTool || "Codex"} or another coding/build agent that executes bounded Work Cards.`,
      ].join("\n"),
    ),
    section(
      "Approved Technical Shape",
      [
        "- Target surface: Electron desktop app.",
        "- Language: TypeScript.",
        "- Frontend direction: React for post-foundation UI work.",
        "- Persistence: file-backed Markdown and JSON planning artifacts.",
        "- LLM providers: provider abstraction may be designed later, but no provider SDK is part of this planning generation step.",
      ].join("\n"),
    ),
    section("Source Context", sourceLines.join("\n")),
    section(
      "Confirmed Facts",
      formatListOrFallback(
        context.extracted.confirmedFacts,
        "No separate confirmed facts were detected in the pasted Architect output.",
      ),
    ),
    section(
      "Safe Assumptions",
      formatListOrFallback(
        context.extracted.safeAssumptions,
        "No separate safe assumptions were detected in the pasted Architect output.",
      ),
    ),
  ].join("\n\n") + "\n";
}

function renderProjectState(context: {
  projectName: string;
  projectIntake?: ProjectIntake;
  extracted: ProjectPlanningDocumentsExtraction;
}): string {
  return [
    "# Project State",
    section("Current Stage", "Alpha app development."),
    section("Current Milestone", "Phase 02 upstream project planning workflow."),
    section(
      "Next Intended Milestone",
      "PH02 WC05: Add Phase Intake and Phase Interview prompt generator.",
    ),
    section(
      "Known Unresolved Decisions",
      "See `planning/project/OPEN_QUESTIONS.md` and `planning/project/DECISIONS.md`.",
    ),
    section(
      "Current Notes",
      [
        "- MVP foundation is complete; current work should be described as Alpha app development.",
        "- Phase 02 sequence has been reconciled after WC03 was used for validation and evidence UI repair.",
        "- Project planning documents are generated deterministically from selected source artifacts and pasted Architect interview output.",
        `- Project: ${context.projectName}.`,
        context.projectIntake
          ? `- Latest selected intake stage: ${context.projectIntake.currentStage}.`
          : "- No Project Intake was selected for this generation.",
      ].join("\n"),
    ),
    section(
      "Recommended Initial Phase Candidates",
      formatListOrFallback(
        context.extracted.initialPhaseCandidates,
        "No separate phase candidates were detected in the pasted Architect output.",
      ),
    ),
  ].join("\n\n") + "\n";
}

function renderWorkCardBacklog(): string {
  return [
    "# Work Card Backlog",
    section(
      "Reconciled Phase 02 Sequence",
      reconciledPhase02Sequence.map((item) => `- ${item}`).join("\n"),
    ),
    section(
      "Next Recommended Implementer Task",
      "PH02 WC05: Add Phase Intake and Phase Interview prompt generator.",
    ),
    section(
      "Notes",
      [
        "- WC03 is the validation and evidence UI repair that replaced the original WC03 planning slot.",
        "- WC04 is this Project Planning Documents generation workflow.",
        "- Do not generate initial Work Cards beyond this backlog correction until the dedicated Phase Planning Documents Work Card.",
      ].join("\n"),
    ),
  ].join("\n\n") + "\n";
}

function renderOpenQuestions(context: {
  projectIntake?: ProjectIntake;
  extracted: ProjectPlanningDocumentsExtraction;
}): string {
  const questions = uniqueNonEmpty([
    ...context.extracted.openQuestions,
    ...(context.projectIntake?.operatorUncertainties
      ? [`Operator uncertainty: ${context.projectIntake.operatorUncertainties}`]
      : []),
  ]);

  return [
    "# Open Questions",
    section(
      "Questions",
      formatListOrFallback(
        questions,
        "No open questions were captured by the selected sources.",
      ),
    ),
    section(
      "Owner",
      "The Operator owns final answers. The Architect may help frame options before implementation.",
    ),
  ].join("\n\n") + "\n";
}

function renderRisks(context: {
  projectIntake?: ProjectIntake;
  extracted: ProjectPlanningDocumentsExtraction;
}): string {
  const risks = uniqueNonEmpty([
    ...context.extracted.risksAndWarnings,
    ...(context.projectIntake?.securityOrDataConcerns
      ? [`Security or data concern: ${context.projectIntake.securityOrDataConcerns}`]
      : []),
    ...(context.projectIntake?.knownConstraints
      ? [`Known constraint: ${context.projectIntake.knownConstraints}`]
      : []),
  ]);

  return [
    "# Risks",
    section(
      "Known Risks And Drift Warnings",
      formatListOrFallback(
        risks,
        "No risks or drift warnings were captured by the selected sources.",
      ),
    ),
    section(
      "Risk Handling Notes",
      [
        "- Keep renderer filesystem access mediated through Electron main/preload IPC.",
        "- Do not add provider SDKs, auth, databases, cloud services, MCP, or connector integrations without a dedicated approved Work Card.",
        "- Operator manual validation remains required for acceptance and closeout decisions.",
      ].join("\n"),
    ),
  ].join("\n\n") + "\n";
}

function renderDecisions(context: {
  projectIntake?: ProjectIntake;
  extracted: ProjectPlanningDocumentsExtraction;
}): string {
  const decisions = uniqueNonEmpty([
    ...context.extracted.decisions,
    "Durable planning artifacts are stored as Markdown and JSON in the repository.",
    "Product-facing terminology uses Operator, Architect, and Implementer.",
    "The core loop remains Capture -> Frame -> Plan -> Build -> Prove.",
    ...(context.projectIntake?.preferredImplementerTool
      ? [`Preferred Implementer tool: ${context.projectIntake.preferredImplementerTool}.`]
      : []),
    ...(context.projectIntake?.architectSurface
      ? [`Architect surface: ${context.projectIntake.architectSurface}.`]
      : []),
  ]);

  return [
    "# Decisions",
    section("Current Decisions", formatListOrFallback(decisions, "No decisions captured yet.")),
    section(
      "Decision Notes",
      "Historical Builder artifact paths remain compatibility storage names until a dedicated migration Work Card changes them safely.",
    ),
  ].join("\n\n") + "\n";
}

function extractProjectPlanningSections(
  output: string,
): ProjectPlanningDocumentsExtraction {
  return {
    confirmedFacts: extractNamedSection(output, ["confirmed fact", "fact"]),
    safeAssumptions: extractNamedSection(output, ["safe assumption", "assumption"]),
    openQuestions: uniqueNonEmpty([
      ...extractNamedSection(output, ["open question", "question"]),
      ...extractLinesByPattern(output, /\?/),
    ]),
    recommendedProfileValues: extractNamedSection(output, [
      "recommended project-profile value",
      "recommended profile value",
      "project-profile",
      "profile value",
    ]),
    initialPhaseCandidates: extractNamedSection(output, [
      "recommended initial phase candidate",
      "initial phase candidate",
      "phase candidate",
    ]),
    risksAndWarnings: uniqueNonEmpty([
      ...extractNamedSection(output, [
        "risk",
        "drift warning",
        "warning",
        "constraint",
      ]),
      ...extractLinesByPattern(output, /\b(risk|warning|drift|constraint|security)\b/i),
    ]),
    decisions: uniqueNonEmpty([
      ...extractNamedSection(output, ["decision"]),
      ...extractLinesByPattern(output, /\b(decided|decision|approved)\b/i),
    ]),
  };
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
        const inlineValue = line.replace(/^#+\s*/, "").replace(/^[\d.)\s-]+/, "");
        const [, value] = inlineValue.split(/:\s+/, 2);

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

function isLikelyHeading(line: string): boolean {
  if (/^#{1,6}\s+\S/.test(line)) {
    return true;
  }

  if (/^\*{0,2}\d+[.)]\s+[^:]+:?/.test(line)) {
    return true;
  }

  if (/^[A-Z][A-Za-z /-]{2,80}:$/.test(line)) {
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
    .slice(0, 320);
}

function limitItems(items: string[]): string[] {
  return items.slice(0, 12);
}

function resolveProjectName(input: BuildProjectPlanningDocumentsInput): string {
  return (
    firstUseful([
      input.projectIntake?.projectName,
      input.projectArchitectInterviewPrompt?.projectName,
      inferProjectNameFromOutput(input.architectInterviewOutput),
      "ChampCity A/I",
    ]) ?? "ChampCity A/I"
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

function findProfileValue(lines: string[], keys: string[]): string | undefined {
  return lines.find((line) => {
    const normalized = line.toLowerCase();
    return keys.some((key) => normalized.includes(key));
  });
}

function firstUseful(values: Array<string | undefined>): string | undefined {
  return values
    .map((value) => value?.trim() ?? "")
    .find((value) => value.length > 0);
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
  return `## ${title}\n\n${body}`;
}
