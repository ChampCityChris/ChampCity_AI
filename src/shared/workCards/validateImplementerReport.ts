import { buildWorkCardFileStem, validateSafeWorkCardId } from "./workCardFileNames";

export const implementerReportTypes = [
  "Work Card",
  "Fix",
  "Repair",
  "Other",
] as const;

export type ImplementerReportType = (typeof implementerReportTypes)[number];

export interface ImplementerReportValidationResult {
  validEnoughToSave: boolean;
  warnings: string[];
  detected: {
    hasRepositoryPath: boolean;
    hasGitStatus: boolean;
    hasFilesCreated: boolean;
    hasFilesModified: boolean;
    hasFilesIntentionallyNotCreated: boolean;
    hasCommandsRun: boolean;
    hasValidationPerformed: boolean;
    hasValidationSkipped: boolean;
    hasGitActions: boolean;
    hasSecurityNotes: boolean;
    hasBlockingQuestions: boolean;
    hasRecommendedNextTask: boolean;
    hasArchitectReviewInstructions: boolean;
    hasCommitHash: boolean;
    hasValidationResults: boolean;
    hasBlockers: boolean;
  };
}

export interface ImplementerReportFileNameInput {
  reportType: ImplementerReportType;
  workCardId?: string;
  workCardTitle?: string;
  topic: string;
}

export interface ImplementerReportCaptureRequest {
  phase: string;
  reportType: ImplementerReportType;
  workCardFileName?: string;
  topic: string;
  reportText: string;
}

export interface ImplementerReportCapturePreviewResult {
  ok: boolean;
  savedFileName?: string;
  validation?: ImplementerReportValidationResult;
  errorMessages?: string[];
}

export interface ImplementerReportCaptureSaveResult
  extends ImplementerReportCapturePreviewResult {
  markdownPath?: string;
}

const requiredReportSignals = [
  {
    key: "hasRepositoryPath",
    label: "Repository path inspected.",
  },
  {
    key: "hasGitStatus",
    label: "Git branch and remote status.",
  },
  {
    key: "hasFilesCreated",
    label: "Files created.",
  },
  {
    key: "hasFilesModified",
    label: "Files modified.",
  },
  {
    key: "hasFilesIntentionallyNotCreated",
    label: "Files intentionally not created.",
  },
  {
    key: "hasCommandsRun",
    label: "Commands run and results.",
  },
  {
    key: "hasValidationPerformed",
    label: "Validation performed.",
  },
  {
    key: "hasValidationSkipped",
    label: "Validation skipped and reason.",
  },
  {
    key: "hasGitActions",
    label: "Git actions performed.",
  },
  {
    key: "hasSecurityNotes",
    label: "Security/secret-safety notes.",
  },
  {
    key: "hasBlockingQuestions",
    label: "Blocking questions, if any.",
  },
  {
    key: "hasRecommendedNextTask",
    label: "Recommended next Implementer task.",
  },
  {
    key: "hasArchitectReviewInstructions",
    label: "Architect Review Instructions.",
  },
] as const satisfies readonly {
  key: keyof ImplementerReportValidationResult["detected"];
  label: string;
}[];

export function validateImplementerReport(
  reportText: string,
): ImplementerReportValidationResult {
  const normalized = normalizeForMatching(reportText);
  const trimmed = reportText.trim();
  const detected = {
    hasRepositoryPath:
      /repository path inspected|requested repository path|current working directory inspected|git repository root inspected|c:\\users\\chapm\\projects\\champcity_ai/i.test(
        normalized,
      ),
    hasGitStatus:
      /git branch.*remote status|branch.*remote|git status|git remote|current branch|remote status/i.test(
        normalized,
      ),
    hasFilesCreated: /files created|created files/i.test(normalized),
    hasFilesModified: /files modified|modified files/i.test(normalized),
    hasFilesIntentionallyNotCreated:
      /files intentionally not created|intentionally not created|not created/i.test(
        normalized,
      ),
    hasCommandsRun:
      /commands run|commands executed|command results|run and results|commands.*results/i.test(
        normalized,
      ),
    hasValidationPerformed:
      /validation performed|checks run|validation ran|validation commands|npm run typecheck|npm run build|npm test/i.test(
        normalized,
      ),
    hasValidationSkipped:
      /validation skipped|checks skipped|skipped and reason|skipped validation/i.test(
        normalized,
      ),
    hasGitActions:
      /git actions|commit hash|release tag|push:|git commit|git add|staged/i.test(
        normalized,
      ),
    hasSecurityNotes:
      /security\/secret-safety|security notes|secret-safety|secrets?|api keys?|tokens?|credentials?/i.test(
        normalized,
      ),
    hasBlockingQuestions:
      /blocking questions|blocking question|blockers?|blocked/i.test(
        normalized,
      ),
    hasRecommendedNextTask:
      /recommended next implementer task|next implementer task|recommended next implementer task|next implementer task|recommended next task/i.test(
        normalized,
      ),
    hasArchitectReviewInstructions:
      /^##\s+architect review instructions\s*$/im.test(normalized) &&
      /ready for operator validation/i.test(normalized) &&
      /operator validation steps/i.test(normalized) &&
      /observation register/i.test(normalized),
    hasCommitHash: /\b[0-9a-f]{7,40}\b/i.test(normalized),
    hasValidationResults:
      /passed|failed|completed successfully|reported .*passed|validation .*passed|npm run .* - passed|npm run .* passed/i.test(
        normalized,
      ),
    hasBlockers: /blockers?|blocking questions?|blocked/i.test(normalized),
  };
  const warnings: string[] = [];

  if (trimmed.length === 0) {
    warnings.push("Report text is empty.");
  }

  if (!/implementer report/i.test(normalized)) {
    warnings.push(
      "Report text does not include an obvious Implementer Report heading.",
    );
  }

  for (const signal of requiredReportSignals) {
    if (!detected[signal.key]) {
      warnings.push(`Missing or unclear section: ${signal.label}`);
    }
  }

  if (!detected.hasCommitHash) {
    warnings.push("No commit hash was detected.");
  }

  if (!detected.hasValidationResults) {
    warnings.push("Validation command results were not clearly detected.");
  }

  return {
    validEnoughToSave: trimmed.length > 0,
    warnings,
    detected,
  };
}

export function buildImplementerReportFileName(
  input: ImplementerReportFileNameInput,
): string {
  const reportType = validateImplementerReportType(input.reportType);
  const topic = input.topic.trim();
  const workCardId = input.workCardId?.trim();
  const workCardTitle = input.workCardTitle?.trim();

  if (workCardId) {
    const workCardIdErrors = validateSafeWorkCardId(workCardId);

    if (workCardIdErrors.length > 0) {
      throw new Error(workCardIdErrors.join(" "));
    }
  }

  if (reportType === "Work Card") {
    if (!workCardId) {
      throw new Error("Select a Work Card before saving a Work Card report.");
    }

    if (topic.length > 0) {
      const topicErrors = validateImplementerReportTopic(topic);

      if (topicErrors.length > 0) {
        throw new Error(topicErrors.join(" "));
      }
    }

    const slugSource = topic || workCardTitle || workCardId;

    return validateImplementerReportMarkdownFileName(
      `IMPLEMENTER_REPORT_${buildWorkCardFileStem(workCardId, slugSource)}.md`,
    );
  }

  if (reportType === "Repair") {
    const slugSource = requireSafeTopic(topic, "Enter a repair topic.");
    const slug = slugifyImplementerReportTopic(slugSource);

    if (workCardId) {
      return validateImplementerReportMarkdownFileName(
        `IMPLEMENTER_REPORT_REPAIR_${workCardId}_${slug}.md`,
      );
    }

    return validateImplementerReportMarkdownFileName(
      `IMPLEMENTER_REPORT_REPAIR_${slug}.md`,
    );
  }

  if (reportType === "Fix") {
    const topicSource = requireSafeTopic(
      topic,
      "Enter a fix number or short fix topic.",
    );
    const fixMatch = /^(FIX\d+)\b[\s_-]*(.*)$/i.exec(topicSource);

    if (fixMatch) {
      const fixId = fixMatch[1].toUpperCase();
      const slugSource = fixMatch[2].trim() || "fix";

      return validateImplementerReportMarkdownFileName(
        `IMPLEMENTER_REPORT_${fixId}_${slugifyImplementerReportTopic(slugSource)}.md`,
      );
    }

    return validateImplementerReportMarkdownFileName(
      `IMPLEMENTER_REPORT_FIX_${slugifyImplementerReportTopic(topicSource)}.md`,
    );
  }

  const otherTopic = requireSafeTopic(topic, "Enter a short report topic.");

  return validateImplementerReportMarkdownFileName(
    `IMPLEMENTER_REPORT_OTHER_${slugifyImplementerReportTopic(otherTopic)}.md`,
  );
}

export function validateImplementerReportMarkdownFileName(
  fileName: string,
): string {
  const value = fileName.trim();

  if (value.length === 0) {
    throw new Error("Implementer Report filename must not be blank.");
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    throw new Error("Implementer Report filename must not include folders.");
  }

  if (!value.endsWith(".md")) {
    throw new Error("Implementer Report filename must use the .md extension.");
  }

  if (!/^IMPLEMENTER_REPORT_[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(value)) {
    throw new Error(
      "Implementer Report filename must use only letters, numbers, hyphens, underscores, and the .md extension. Canonical files use the IMPLEMENTER_REPORT_ prefix.",
    );
  }

  return value;
}

export function slugifyImplementerReportTopic(topic: string): string {
  const errors = validateImplementerReportTopic(topic);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const slug = topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "implementer_report";
}

export function validateImplementerReportTopic(topic: string): string[] {
  const value = topic.trim();

  if (value.includes("..") || /^[\\/]/.test(value) || /^[A-Za-z]:/.test(value)) {
    return ["Report topic must not include path traversal or absolute paths."];
  }

  if (/\.md$|\.txt$/i.test(value)) {
    return ["Enter a short topic, not a full filename."];
  }

  return [];
}

export function isImplementerReportType(
  value: string,
): value is ImplementerReportType {
  return (implementerReportTypes as readonly string[]).includes(value);
}

function validateImplementerReportType(value: ImplementerReportType): ImplementerReportType {
  if (!isImplementerReportType(value)) {
    throw new Error("Choose a valid Implementer Report type.");
  }

  return value;
}

function requireSafeTopic(topic: string, message: string): string {
  const value = topic.trim();

  if (value.length === 0) {
    throw new Error(message);
  }

  const errors = validateImplementerReportTopic(value);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  return value;
}

function normalizeForMatching(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .toLowerCase();
}
