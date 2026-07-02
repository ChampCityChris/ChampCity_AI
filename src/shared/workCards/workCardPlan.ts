import {
  slugifyPhaseIntakeName,
  validatePhaseIntakeSlug,
} from "./phaseIntake";
import type { WorkCardRiskLevel } from "./workCardSchema";
import { validateSafePhaseFolder } from "./workCardFileNames";

export interface WorkCardPlanItem {
  workCardIdProposal: string;
  title: string;
  problem: string;
  userOutcome: string;
  includedScope: string;
  outOfScope: string;
  dependencies: string;
  riskLevel: WorkCardRiskLevel;
  validationItems: string[];
  suggestedOrdering: number;
  notesForArchitectImplementer: string;
}

export interface WorkCardPlanRecord {
  workCardPlanId: string;
  projectName: string;
  phaseFolder: string;
  phaseName: string;
  sourcePhasePlanningDocumentsId: string;
  sourcePhasePlanningDocumentsJsonFileName?: string;
  sourcePhasePlanningDocumentsMarkdownFileName?: string;
  planPurpose: string;
  proposedWorkCards: WorkCardPlanItem[];
  operatorPlanAdjustments: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCardPlanArtifactFileNames {
  slug: string;
  jsonFileName: string;
  markdownFileName: string;
}

export interface WorkCardPlanBuildInput {
  projectName: string;
  phaseFolder: string;
  phaseName: string;
  sourcePhasePlanningDocumentsId: string;
  sourcePhasePlanningDocumentsJsonFileName?: string;
  sourcePhasePlanningDocumentsMarkdownFileName?: string;
  phaseGoal: string;
  phaseScope: string;
  phaseRisks: string[];
  dependencies: string[];
  validationExpectations: string[];
  recommendedImplementationSequence: string[];
  phaseArchitectInterviewOutput: string;
  operatorPlanAdjustments?: string;
}

export function buildWorkCardPlanRecord(
  input: WorkCardPlanBuildInput,
  timestamp: string,
): WorkCardPlanRecord {
  const phaseFolder = cleanText(input.phaseFolder);
  const phaseName = cleanText(input.phaseName);
  const phaseErrors = validateSafePhaseFolder(phaseFolder);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  const fileNames = buildWorkCardPlanFileNames(phaseName || phaseFolder);

  return {
    workCardPlanId: `WORK_CARD_PLAN_${fileNames.slug}`,
    projectName: cleanText(input.projectName) || "ChampCity A/I",
    phaseFolder,
    phaseName,
    sourcePhasePlanningDocumentsId: input.sourcePhasePlanningDocumentsId,
    sourcePhasePlanningDocumentsJsonFileName:
      input.sourcePhasePlanningDocumentsJsonFileName,
    sourcePhasePlanningDocumentsMarkdownFileName:
      input.sourcePhasePlanningDocumentsMarkdownFileName,
    planPurpose:
      "Initial planning proposal only. This artifact does not create formal app-selectable Work Card JSON files.",
    proposedWorkCards: buildWorkCardPlanItems(input),
    operatorPlanAdjustments: cleanText(input.operatorPlanAdjustments),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function renderWorkCardPlanMarkdown(record: WorkCardPlanRecord): string {
  return [
    `# Initial Work Card Plan: ${record.phaseName}`,
    section(
      "Source Context",
      [
        `Work Card Plan ID: ${record.workCardPlanId}`,
        `Project: ${record.projectName}`,
        `Phase folder: ${record.phaseFolder}`,
        `Phase name: ${record.phaseName}`,
        `Source Phase Planning Documents ID: ${record.sourcePhasePlanningDocumentsId}`,
        `Source Phase Planning Documents JSON: ${record.sourcePhasePlanningDocumentsJsonFileName ?? "Generated in same save operation."}`,
        `Source Phase Planning Documents Markdown: ${record.sourcePhasePlanningDocumentsMarkdownFileName ?? "Generated in same save operation."}`,
        `Created: ${record.createdAt}`,
        `Updated: ${record.updatedAt}`,
      ].join("\n"),
    ),
    section("Plan Purpose", record.planPurpose),
    section(
      "Operator Plan Adjustments",
      record.operatorPlanAdjustments || "None provided.",
    ),
    section(
      "Initial Work Card Plan",
      record.proposedWorkCards.map(renderWorkCardPlanItem).join("\n\n"),
    ),
    section(
      "Important Boundary",
      "These are planning proposals for Operator and Architect review. A later workflow must convert selected items into formal app-selectable Work Card JSON/Markdown artifacts.",
    ),
  ].join("\n\n") + "\n";
}

export function renderPhaseScopedBacklogMarkdown(
  record: WorkCardPlanRecord,
): string {
  return [
    `# Work Card Backlog: ${record.phaseName}`,
    section(
      "Phase",
      [
        `Project: ${record.projectName}`,
        `Phase folder: ${record.phaseFolder}`,
        `Phase name: ${record.phaseName}`,
        `Source plan: ${record.workCardPlanId}`,
        `Updated: ${record.updatedAt}`,
      ].join("\n"),
    ),
    section(
      "Initial Planning Proposals",
      record.proposedWorkCards
        .map(
          (item) =>
            `- ${item.workCardIdProposal}: ${item.title} (risk: ${item.riskLevel}, order: ${item.suggestedOrdering})`,
        )
        .join("\n"),
    ),
    section(
      "Backlog Notes",
      [
        "- This backlog is phase-scoped planning output.",
        "- It is not a set of formal app-selectable Work Card JSON files.",
        "- Operator review is required before selected proposals are converted into formal Work Cards.",
      ].join("\n"),
    ),
  ].join("\n\n") + "\n";
}

export function buildWorkCardPlanFileNames(
  phaseNameOrFolder: string,
): WorkCardPlanArtifactFileNames {
  const slug = slugifyPhaseIntakeName(phaseNameOrFolder);
  const slugErrors = validatePhaseIntakeSlug(slug);

  if (slugErrors.length > 0) {
    throw new Error(slugErrors.join(" "));
  }

  return {
    slug,
    jsonFileName: `WORK_CARD_PLAN_${slug}.json`,
    markdownFileName: `WORK_CARD_PLAN_${slug}.md`,
  };
}

export function validateWorkCardPlanArtifactFileName(
  fileName: string,
): string[] {
  const value = cleanText(fileName);

  if (value.length === 0) {
    return ["Work Card Plan filenames must not be blank."];
  }

  if (value.includes("..") || /[\\/:\s]/.test(value)) {
    return [
      "Work Card Plan filenames must not include folders or absolute paths.",
    ];
  }

  if (!/^WORK_CARD_PLAN_[a-z0-9][a-z0-9_]*\.(json|md)$/.test(value)) {
    return [
      "Work Card Plan artifacts must be named WORK_CARD_PLAN_<slug>.json or WORK_CARD_PLAN_<slug>.md.",
    ];
  }

  return [];
}

export function validateWorkCardPlanRecord(candidate: unknown): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) {
    return ["Work Card Plan JSON must be an object."];
  }

  for (const field of [
    "workCardPlanId",
    "projectName",
    "phaseFolder",
    "phaseName",
    "sourcePhasePlanningDocumentsId",
    "planPurpose",
    "operatorPlanAdjustments",
    "createdAt",
    "updatedAt",
  ] as const) {
    const value = candidate[field];

    if (typeof value !== "string") {
      errors.push(`${field} must be saved as text.`);
    }
  }

  if (typeof candidate.phaseFolder === "string") {
    errors.push(...validateSafePhaseFolder(candidate.phaseFolder));
  }

  if (!Array.isArray(candidate.proposedWorkCards)) {
    errors.push("proposedWorkCards must be saved as a list.");
  }

  return errors;
}

function buildWorkCardPlanItems(
  input: WorkCardPlanBuildInput,
): WorkCardPlanItem[] {
  const candidateTitles = uniqueNonEmpty([
    ...input.recommendedImplementationSequence.map(cleanSequenceTitle),
    ...extractLinesByPattern(
      input.phaseArchitectInterviewOutput,
      /\b(work card|wc\d+|implement|add|repair|generate|validate)\b/i,
    ).map(cleanSequenceTitle),
  ])
    .filter((title) => title.length > 0)
    .slice(0, 6);
  const titles =
    candidateTitles.length > 0
      ? candidateTitles
      : buildDefaultWorkCardTitles(input.phaseName);
  const riskLevel = inferRiskLevel(input.phaseRisks);
  const validationItems =
    input.validationExpectations.length > 0
      ? input.validationExpectations
      : [
          "Run available automated checks.",
          "Confirm changed workflow is reachable in the app.",
          "List remaining Operator manual validation steps.",
        ];
  const dependencies = formatListSentence(input.dependencies, "No known dependencies.");
  const outOfScope =
    "Do not perform Operator acceptance, phase closeout, release work, provider SDK integration, database/auth/cloud work, MCP work, connector work, or automatic formal Work Card creation.";

  return titles.map((title, index) => ({
    workCardIdProposal: `WC${String(index + 1).padStart(2, "0")}`,
    title,
    problem: buildProblem(title, input.phaseName, input.phaseGoal),
    userOutcome: buildUserOutcome(title, input.phaseName),
    includedScope: buildIncludedScope(title, input.phaseScope),
    outOfScope,
    dependencies,
    riskLevel,
    validationItems,
    suggestedOrdering: index + 1,
    notesForArchitectImplementer: buildNotes(input.operatorPlanAdjustments),
  }));
}

function renderWorkCardPlanItem(item: WorkCardPlanItem): string {
  return [
    `### ${item.workCardIdProposal}: ${item.title}`,
    "",
    `- Problem: ${item.problem}`,
    `- User outcome: ${item.userOutcome}`,
    `- Included scope: ${item.includedScope}`,
    `- Out of scope: ${item.outOfScope}`,
    `- Dependencies: ${item.dependencies}`,
    `- Risk level: ${item.riskLevel}`,
    `- Validation items: ${item.validationItems.join("; ")}`,
    `- Suggested ordering: ${item.suggestedOrdering}`,
    `- Notes for Architect/Implementer: ${item.notesForArchitectImplementer}`,
  ].join("\n");
}

function buildDefaultWorkCardTitles(phaseName: string): string[] {
  const phase = cleanText(phaseName) || "the selected phase";

  return [
    `Reconcile ${phase} source context`,
    `Implement bounded ${phase} workflow changes`,
    `Validate ${phase} workflow and artifacts`,
  ];
}

function inferRiskLevel(risks: string[]): WorkCardRiskLevel {
  if (
    risks.some((risk) =>
      /\b(security|secret|credential|data loss|unsafe|blocking|high)\b/i.test(
        risk,
      ),
    )
  ) {
    return "high";
  }

  return risks.length > 0 ? "medium" : "low";
}

function buildProblem(title: string, phaseName: string, phaseGoal: string): string {
  const goal = cleanText(phaseGoal);

  if (goal.length > 0) {
    return `${title} is needed to advance ${phaseName || "the selected phase"} toward: ${goal}`;
  }

  return `${title} is needed to advance ${phaseName || "the selected phase"} without broadening scope.`;
}

function buildUserOutcome(title: string, phaseName: string): string {
  return `The Operator can review ${title.toLowerCase()} as part of ${phaseName || "the selected phase"} progress.`;
}

function buildIncludedScope(title: string, phaseScope: string): string {
  const scope = cleanText(phaseScope);

  if (scope.length > 0) {
    return `${title}. Phase scope context: ${scope}`;
  }

  return title;
}

function buildNotes(operatorPlanAdjustments: string | undefined): string {
  const adjustments = cleanText(operatorPlanAdjustments);

  if (adjustments.length > 0) {
    return `Treat Operator adjustments as planning constraints: ${adjustments}`;
  }

  return "Review before conversion into a formal Work Card. Preserve Operator / Architect / Implementer terminology.";
}

function extractLinesByPattern(output: string, pattern: RegExp): string[] {
  return uniqueNonEmpty(
    output
      .split(/\r?\n/)
      .map((line) => cleanListLine(line.trim()))
      .filter((line) => line.length > 0 && pattern.test(line)),
  ).slice(0, 8);
}

function cleanSequenceTitle(value: string): string {
  return cleanListLine(value)
    .replace(/^work card\s*[:.-]\s*/i, "")
    .replace(/^wc\d+\s*[:.-]\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 96);
}

function cleanListLine(line: string): string {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^\*\*([^*]+)\*\*:\s*/, "$1: ")
    .trim();
}

function formatListSentence(items: string[], fallback: string): string {
  const values = uniqueNonEmpty(items);

  return values.length > 0 ? values.join("; ") : fallback;
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

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim().length > 0 ? body : "Not provided."}`;
}

function cleanText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
