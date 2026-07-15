import type { WorkCard, WorkCardRiskLevel } from "./workCardSchema";
import {
  validateSafePhaseFolder,
  validateSafeWorkCardId,
} from "./workCardFileNames";
import { validateWorkCard } from "./validateWorkCard";

export interface WorkCardDraftInput {
  workCardId: string;
  title: string;
  phase: string;
  riskLevel: WorkCardRiskLevel;
  problem: string;
  importance: string;
  userOutcome: string;
  scope: string;
  outOfScope: string;
  knownSystems: string;
  evidence: string;
  risks: string;
  operatorNotes: string;
}

export interface WorkCardPreviewResult {
  ok: boolean;
  markdown?: string;
  workCard?: WorkCard;
  errorMessages?: string[];
}

export interface WorkCardSaveResult extends WorkCardPreviewResult {
  markdownPath?: string;
  jsonPath?: string;
}

export interface NextWorkCardIdResult {
  ok: boolean;
  workCardId?: string;
  errorMessages?: string[];
}

export function validateDraftInput(input: WorkCardDraftInput): string[] {
  const errors: string[] = [];

  errors.push(...validateSafeWorkCardId(input.workCardId));
  errors.push(...validateSafePhaseFolder(input.phase));

  if (input.title.trim().length === 0) {
    errors.push("Please enter a Work Card title.");
  }

  if (input.problem.trim().length === 0) {
    errors.push("Please describe what you are trying to build or fix.");
  }

  if (input.userOutcome.trim().length === 0) {
    errors.push("Please describe what the user should be able to do.");
  }

  return errors;
}

export function buildDraftWorkCard(
  input: WorkCardDraftInput,
  timestamp: string,
): WorkCard {
  const errors = validateDraftInput(input);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const knownSystems = parseLineList(input.knownSystems);
  const evidence = parseLineList(input.evidence);
  const operatorNotes = parseLineList(input.operatorNotes);
  const scope = parseLineList(input.scope);
  const userOutcome = input.userOutcome.trim();
  const problem = input.problem.trim();
  const importance = input.importance.trim();
  const conciseGoal =
    importance.length > 0
      ? importance
      : "Capture Operator intent as a draft Work Card for Architect review.";

  const workCard: WorkCard = {
    workCardId: input.workCardId.trim(),
    title: input.title.trim(),
    phase: input.phase.trim(),
    status: "ready_for_architect",
    createdAt: timestamp,
    updatedAt: timestamp,
    problem,
    goal: conciseGoal,
    userOutcome,
    scope,
    outOfScope: parseLineList(input.outOfScope),
    requirements: buildRequirements(knownSystems),
    acceptanceCriteria: buildAcceptanceCriteria(userOutcome, scope),
    validationPlan: [
      "Preview the rendered Markdown before saving.",
      "Save both structured JSON and durable Markdown Work Card artifacts.",
      "Run `npm run typecheck`.",
      "Run `npm run build`.",
      "Run `npm test`.",
      "Run `npm run test:work-cards`.",
    ],
    riskLevel: input.riskLevel,
    risks: parseLineList(input.risks),
    implementerInstructions: [
      "This Work Card is a draft captured from Operator intent.",
      "Architect review is required before any Implementer uses this Work Card.",
      "Do not treat this draft as Implementer-ready until the Architect reframes and approves it. The canonical workflow status for that later state is `ready_for_implementer`.",
    ],
    operatorNotes: buildOperatorNotes(operatorNotes, evidence),
  };

  const validation = validateWorkCard(workCard);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return workCard;
}

export function parseLineList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function buildRequirements(knownSystems: string[]): string[] {
  return [
    "Keep the Work Card status as `ready_for_architect` until Architect review is complete.",
    "Use the existing WC01 Work Card schema and Markdown renderer.",
    "Do not add Implementer-ready instructions beyond the draft handoff prompt.",
    ...knownSystems.map((item) => `Known file, screen, or system: ${item}`),
  ];
}

function buildAcceptanceCriteria(userOutcome: string, scope: string[]): string[] {
  return [
    `A user can: ${userOutcome}`,
    "The saved Markdown includes the canonical `## Implementer Handoff Prompt` section.",
    "The saved Work Card clearly states that Architect review is required.",
    ...scope.map((item) => `Included scope is represented: ${item}`),
  ];
}

function buildOperatorNotes(notes: string[], evidence: string[]): string[] {
  return [
    ...notes,
    ...evidence.map((item) => `Evidence or example: ${item}`),
  ];
}
