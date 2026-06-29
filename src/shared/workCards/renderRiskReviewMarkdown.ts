import { buildWorkCardFileStem } from "./workCardFileNames";
import type { WorkCard } from "./workCardSchema";
import type { RiskFlag, WorkCardRiskReview } from "./riskRouter";
import { validateWorkCard } from "./validateWorkCard";

export interface RiskReviewRequest {
  phase: string;
  fileName: string;
}

export interface RiskReviewPreviewResult {
  ok: boolean;
  review?: WorkCardRiskReview;
  markdown?: string;
  workCard?: WorkCard;
  sourceFileName?: string;
  errorMessages?: string[];
}

export interface RiskReviewSaveResult extends RiskReviewPreviewResult {
  markdownPath?: string;
  savedFileName?: string;
}

export const riskReviewNoApprovalNote =
  "This review does not modify or approve the Work Card. It does not change Work Card status, riskLevel, or Builder readiness.";

export function renderRiskReviewMarkdown(
  workCard: WorkCard,
  review: WorkCardRiskReview,
  generatedAt: string,
): string {
  const validation = validateWorkCard(workCard);

  if (!validation.valid) {
    throw new Error(
      `Cannot render risk review for invalid Work Card: ${validation.errors.join("; ")}`,
    );
  }

  if (
    review.workCardId !== workCard.workCardId ||
    review.title !== workCard.title ||
    review.phase !== workCard.phase
  ) {
    throw new Error("Risk review metadata must match the selected Work Card.");
  }

  return [
    `# Risk Review: ${workCard.workCardId} - ${workCard.title}`,
    "",
    "## Work Card",
    "",
    `- Work Card ID: ${workCard.workCardId}`,
    `- Work Card title: ${workCard.title}`,
    `- Phase: ${workCard.phase}`,
    `- Current Work Card risk level: ${workCard.riskLevel}`,
    `- Assessed risk level: ${review.assessedRiskLevel}`,
    "",
    "## Summary",
    "",
    review.summary,
    "",
    "## Flagged Categories",
    "",
    formatFlaggedCategories(review.flaggedCategories),
    "",
    "## Scope-Creep Signals",
    "",
    formatList(review.scopeCreepSignals),
    "",
    "## Architect Review Questions",
    "",
    formatList(review.architectReviewQuestions),
    "",
    "## Review Boundary",
    "",
    riskReviewNoApprovalNote,
    "",
    "## Generated",
    "",
    generatedAt,
    "",
  ].join("\n");
}

export function buildRiskReviewFileName(workCard: WorkCard): string {
  return `RISK_REVIEW_${buildWorkCardFileStem(workCard.workCardId, workCard.title)}.md`;
}

function formatFlaggedCategories(flags: RiskFlag[]): string {
  if (flags.length === 0) {
    return "- None.";
  }

  return flags
    .map((flag) =>
      [
        `- Category: ${flag.category}`,
        `  - Severity: ${flag.severity}`,
        `  - Matched terms: ${flag.matchedTerms.join(", ")}`,
        `  - Rationale: ${flag.rationale}`,
        `  - Suggested Architect question: ${flag.suggestedArchitectQuestion}`,
      ].join("\n"),
    )
    .join("\n");
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- None.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}
