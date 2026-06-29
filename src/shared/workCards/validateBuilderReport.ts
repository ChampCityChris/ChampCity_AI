import { buildWorkCardFileStem, validateSafeWorkCardId } from "./workCardFileNames";

export const builderReportTypes = [
  "Work Card",
  "Fix",
  "Repair",
  "Other",
] as const;

export type BuilderReportType = (typeof builderReportTypes)[number];

export interface BuilderReportValidationResult {
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
    hasCommitHash: boolean;
    hasValidationResults: boolean;
    hasBlockers: boolean;
  };
}

export interface BuilderReportFileNameInput {
  reportType: BuilderReportType;
  workCardId?: string;
  workCardTitle?: string;
  topic: string;
}

export interface BuilderReportCaptureRequest {
  phase: string;
  reportType: BuilderReportType;
  workCardFileName?: string;
  topic: string;
  reportText: string;
}

export interface BuilderReportCapturePreviewResult {
  ok: boolean;
  savedFileName?: string;
  validation?: BuilderReportValidationResult;
  errorMessages?: string[];
}

export interface BuilderReportCaptureSaveResult
  extends BuilderReportCapturePreviewResult {
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
    label: "Recommended next Builder task.",
  },
] as const satisfies readonly {
  key: keyof BuilderReportValidationResult["detected"];
  label: string;
}[];

export function validateBuilderReport(
  reportText: string,
): BuilderReportValidationResult {
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
      /recommended next builder task|next builder task|recommended next task/i.test(
        normalized,
      ),
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

  if (!/builder report/i.test(normalized)) {
    warnings.push(
      "Report text does not include an obvious Builder Report heading.",
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

export function buildBuilderReportFileName(
  input: BuilderReportFileNameInput,
): string {
  const reportType = validateBuilderReportType(input.reportType);
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
      const topicErrors = validateBuilderReportTopic(topic);

      if (topicErrors.length > 0) {
        throw new Error(topicErrors.join(" "));
      }
    }

    const slugSource = topic || workCardTitle || workCardId;

    return validateBuilderReportMarkdownFileName(
      `BUILDER_REPORT_${buildWorkCardFileStem(workCardId, slugSource)}.md`,
    );
  }

  if (reportType === "Repair") {
    const slugSource = requireSafeTopic(topic, "Enter a repair topic.");
    const slug = slugifyBuilderReportTopic(slugSource);

    if (workCardId) {
      return validateBuilderReportMarkdownFileName(
        `BUILDER_REPORT_REPAIR_${workCardId}_${slug}.md`,
      );
    }

    return validateBuilderReportMarkdownFileName(
      `BUILDER_REPORT_REPAIR_${slug}.md`,
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

      return validateBuilderReportMarkdownFileName(
        `BUILDER_REPORT_${fixId}_${slugifyBuilderReportTopic(slugSource)}.md`,
      );
    }

    return validateBuilderReportMarkdownFileName(
      `BUILDER_REPORT_FIX_${slugifyBuilderReportTopic(topicSource)}.md`,
    );
  }

  const otherTopic = requireSafeTopic(topic, "Enter a short report topic.");

  return validateBuilderReportMarkdownFileName(
    `BUILDER_REPORT_OTHER_${slugifyBuilderReportTopic(otherTopic)}.md`,
  );
}

export function validateBuilderReportMarkdownFileName(
  fileName: string,
): string {
  const value = fileName.trim();

  if (value.length === 0) {
    throw new Error("Builder Report filename must not be blank.");
  }

  if (/[\\/]/.test(value) || value.includes("..")) {
    throw new Error("Builder Report filename must not include folders.");
  }

  if (!value.endsWith(".md")) {
    throw new Error("Builder Report filename must use the .md extension.");
  }

  if (!/^BUILDER_REPORT_[A-Za-z0-9][A-Za-z0-9_-]*\.md$/.test(value)) {
    throw new Error(
      "Builder Report filename must use only letters, numbers, hyphens, underscores, and the .md extension.",
    );
  }

  return value;
}

export function slugifyBuilderReportTopic(topic: string): string {
  const errors = validateBuilderReportTopic(topic);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const slug = topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "builder_report";
}

export function validateBuilderReportTopic(topic: string): string[] {
  const value = topic.trim();

  if (value.includes("..") || /^[\\/]/.test(value) || /^[A-Za-z]:/.test(value)) {
    return ["Report topic must not include path traversal or absolute paths."];
  }

  if (/\.md$|\.txt$/i.test(value)) {
    return ["Enter a short topic, not a full filename."];
  }

  return [];
}

export function isBuilderReportType(
  value: string,
): value is BuilderReportType {
  return (builderReportTypes as readonly string[]).includes(value);
}

function validateBuilderReportType(value: BuilderReportType): BuilderReportType {
  if (!isBuilderReportType(value)) {
    throw new Error("Choose a valid Builder Report type.");
  }

  return value;
}

function requireSafeTopic(topic: string, message: string): string {
  const value = topic.trim();

  if (value.length === 0) {
    throw new Error(message);
  }

  const errors = validateBuilderReportTopic(value);

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
