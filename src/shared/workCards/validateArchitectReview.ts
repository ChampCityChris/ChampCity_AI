import {
  architectReviewDecisionValues,
  architectReviewOutputHeadings,
} from "./reportReviewProtocol";

export interface ArchitectReviewValidationResult {
  usesStandardShape: boolean;
  decision?: (typeof architectReviewDecisionValues)[number];
  readyForOperatorValidation: boolean;
  hasOperatorValidationSteps: boolean;
  valid: boolean;
  errors: string[];
}

export function validateArchitectReview(
  reviewText: string,
): ArchitectReviewValidationResult {
  const normalized = reviewText.replace(/\r\n/g, "\n");
  const usesStandardShape = /^##\s+Architect Review Decision\s*$/im.test(
    normalized,
  );
  const errors: string[] = [];

  if (!usesStandardShape) {
    return {
      usesStandardShape: false,
      readyForOperatorValidation: false,
      hasOperatorValidationSteps: false,
      valid: true,
      errors,
    };
  }

  for (const heading of architectReviewOutputHeadings) {
    if (!new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im").test(normalized)) {
      errors.push(`Missing required Architect Review section: ${heading}.`);
    }
  }

  const decisionSection = extractSection(normalized, "Architect Review Decision");
  const matchingDecisions = architectReviewDecisionValues.filter((value) =>
    decisionSection.toLowerCase().includes(value.toLowerCase()),
  );
  const decision = matchingDecisions.length === 1 ? matchingDecisions[0] : undefined;

  if (!decision) {
    errors.push(
      "Architect Review Decision must select exactly one supported decision.",
    );
  }

  const readyForOperatorValidation =
    decision === "Ready for Operator validation";
  const validationSteps = extractSection(normalized, "Operator Validation Steps");
  const hasOperatorValidationSteps = hasSubstantiveContent(validationSteps);

  if (readyForOperatorValidation && !hasOperatorValidationSteps) {
    errors.push(
      "Ready for Operator validation requires substantive Operator Validation Steps.",
    );
  }

  return {
    usesStandardShape,
    decision,
    readyForOperatorValidation,
    hasOperatorValidationSteps,
    valid: errors.length === 0,
    errors,
  };
}

function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "i").test(line.trim()),
  );

  if (start === -1) {
    return "";
  }

  const content: string[] = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+\S/.test(lines[index])) {
      break;
    }

    content.push(lines[index]);
  }

  return content.join("\n").trim();
}

function hasSubstantiveContent(value: string): boolean {
  const normalized = value
    .replace(/^Decision:\s*$/gim, "")
    .replace(/^[-*]\s*/gm, "")
    .trim();

  return (
    normalized.length > 0 &&
    !/^(?:none|n\/a|not applicable|tbd|pending)[.!]?$/i.test(normalized)
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
