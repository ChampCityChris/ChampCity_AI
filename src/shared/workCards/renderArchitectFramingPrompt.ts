import { buildWorkCardFileStem } from "./workCardFileNames";
import type { WorkCard } from "./workCardSchema";
import { validateWorkCard } from "./validateWorkCard";

export interface SavedWorkCardSummary {
  fileName: string;
  workCardId: string;
  title: string;
  status: string;
  phase: string;
}

export interface InvalidSavedWorkCardFile {
  fileName: string;
  errorMessages: string[];
}

export interface ListSavedWorkCardsResult {
  ok: boolean;
  workCards?: SavedWorkCardSummary[];
  invalidFiles?: InvalidSavedWorkCardFile[];
  errorMessages?: string[];
}

export interface ArchitectPromptRequest {
  phase: string;
  fileName: string;
}

export interface ArchitectPromptPreviewResult {
  ok: boolean;
  prompt?: string;
  workCard?: WorkCard;
  sourceFileName?: string;
  errorMessages?: string[];
}

export interface ArchitectPromptSaveResult
  extends ArchitectPromptPreviewResult {
  markdownPath?: string;
  savedFileName?: string;
}

export const finalBuilderPromptBoundary =
  "Do not produce the final Builder prompt until the Operator confirms or corrects the Architect framing decisions.";

export function renderArchitectFramingPrompt(workCard: WorkCard): string {
  const validation = validateWorkCard(workCard);

  if (!validation.valid) {
    throw new Error(
      `Cannot render Architect prompt for invalid Work Card: ${validation.errors.join("; ")}`,
    );
  }

  return [
    "# Architect Framing Prompt",
    "",
    "You are acting as Architect for ChampCity A/I.",
    "",
    "Review the selected draft Work Card and frame the next Builder-ready Work Card. Preserve the manual MVP workflow: this prompt is for Architect framing only, and it must not call an LLM API, edit files, or produce implementation work.",
    "",
    "Core product rule:",
    "- A Work Card is the smallest buildable unit of work that can be handed to a Builder.",
    "- A Work Card should never be authored by the Operator alone.",
    "- The Architect is responsible for translating the Operator's words into a structured Work Card.",
    "",
    "Architect task:",
    "- Review the selected draft Work Card.",
    "- Preserve the rule that the Operator does not author Builder-ready Work Cards alone.",
    "- Translate the Operator's plain-language intent into a Builder-ready Work Card.",
    "- Ask only clarifying questions that are necessary to convert this draft into a Builder-ready Work Card.",
    "- Avoid asking questions already answered by the draft Work Card.",
    "- Provide recommended defaults for any decision the Operator may not care about.",
    "- Explain options in plain language for a non-developer Operator.",
    "- Push back on scope creep, unsafe assumptions, or premature implementation.",
    "- Keep the future Builder task narrow and testable.",
    "- Do not implement, call tools, edit files, run commands, or call APIs directly in this Architect prompt.",
    "",
    "Return one of these:",
    "- A small set of clarifying questions with suggested answers, if clarification is needed.",
    "- A proposed Builder-ready Work Card, if no clarification is needed.",
    "",
    finalBuilderPromptBoundary,
    "",
    "## Selected Draft Work Card",
    "",
    renderStructuredWorkCard(workCard),
  ].join("\n");
}

export function buildArchitectPromptFileName(workCard: WorkCard): string {
  return `ARCHITECT_PROMPT_${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.md`;
}

function renderStructuredWorkCard(workCard: WorkCard): string {
  return [
    `Work Card ID: ${workCard.workCardId}`,
    `Title: ${workCard.title}`,
    `Phase: ${workCard.phase}`,
    `Status: ${workCard.status}`,
    `Created: ${workCard.createdAt}`,
    `Updated: ${workCard.updatedAt}`,
    "",
    section("What Problem Are We Solving?", workCard.problem),
    section("What Should This Accomplish?", workCard.goal),
    section("What Should the User Be Able To Do?", workCard.userOutcome),
    section("What Is Included?", formatList(workCard.scope)),
    section("What Is Not Included?", formatList(workCard.outOfScope)),
    section("Requirements", formatList(workCard.requirements)),
    section("How We Know This Is Done", formatList(workCard.acceptanceCriteria)),
    section("How This Should Be Validated", formatList(workCard.validationPlan)),
    section("Risk Level", workCard.riskLevel),
    section("Risks and Watch Items", formatList(workCard.risks)),
    section("Builder Instructions", formatList(workCard.builderInstructions)),
    section("Operator Notes", formatList(workCard.operatorNotes)),
  ].join("\n\n");
}

function section(title: string, body: string): string {
  return `### ${title}\n\n${body}`;
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- None.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}
