import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildDraftWorkCard,
  type NextWorkCardIdResult,
  type WorkCardDraftInput,
  type WorkCardPreviewResult,
  type WorkCardSaveResult,
} from "../../shared/workCards/workCardDraft";
import {
  buildWorkCardFileStem,
  validateSafePhaseFolder,
} from "../../shared/workCards/workCardFileNames";
import {
  buildArchitectPromptFileName,
  type ArchitectPromptRequest,
  type ArchitectPromptPreviewResult,
  type ArchitectPromptSaveResult,
  type InvalidSavedWorkCardFile,
  type ListSavedWorkCardsResult,
  renderArchitectFramingPrompt,
  type SavedWorkCardSummary,
} from "../../shared/workCards/renderArchitectFramingPrompt";
import {
  buildRiskReviewFileName,
  type RiskReviewPreviewResult,
  type RiskReviewRequest,
  type RiskReviewSaveResult,
  renderRiskReviewMarkdown,
} from "../../shared/workCards/renderRiskReviewMarkdown";
import { renderWorkCardMarkdown } from "../../shared/workCards/renderWorkCardMarkdown";
import { routeWorkCardRisk } from "../../shared/workCards/riskRouter";
import type { WorkCard } from "../../shared/workCards/workCardSchema";
import { validateWorkCard } from "../../shared/workCards/validateWorkCard";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const planningPhasesRoot = path.join(repositoryRoot, "planning", "phases");

export async function getNextWorkCardId(
  phase: string,
): Promise<NextWorkCardIdResult> {
  try {
    const directory = resolveWorkCardsDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const nextNumber = entries.reduce((highest, fileName) => {
      const match = /^WC(\d+)/i.exec(fileName);

      if (!match) {
        return highest;
      }

      const value = Number.parseInt(match[1], 10);
      return Number.isNaN(value) ? highest : Math.max(highest, value);
    }, 0) + 1;

    return {
      ok: true,
      workCardId: `WC${String(nextNumber).padStart(2, "0")}`,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export function previewDraftWorkCard(
  input: WorkCardDraftInput,
): WorkCardPreviewResult {
  try {
    const workCard = buildDraftWorkCard(input, new Date().toISOString());
    const markdown = renderWorkCardMarkdown(workCard);

    return {
      ok: true,
      markdown,
      workCard,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveDraftWorkCard(
  input: WorkCardDraftInput,
): Promise<WorkCardSaveResult> {
  try {
    const workCard = buildDraftWorkCard(input, new Date().toISOString());
    const markdown = renderWorkCardMarkdown(workCard);
    const directory = resolveWorkCardsDirectory(workCard.phase);
    const fileStem = buildWorkCardFileStem(workCard.workCardId, workCard.title);
    const markdownPath = resolveInside(directory, `${fileStem}.md`);
    const jsonPath = resolveInside(directory, `${fileStem}.json`);

    await failIfExists(
      markdownPath,
      "A Work Card file with this ID and title already exists.",
    );
    await failIfExists(
      jsonPath,
      "A Work Card file with this ID and title already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(workCard, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await writeFile(markdownPath, markdown, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      markdown,
      workCard,
      markdownPath,
      jsonPath,
    };
  } catch (error) {
    console.error("Failed to save Work Card draft.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function listSavedWorkCards(
  phase: string,
): Promise<ListSavedWorkCardsResult> {
  try {
    const directory = resolveWorkCardsDirectory(phase);

    let entries: string[] = [];

    try {
      entries = await readdir(directory);
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) {
        throw error;
      }
    }

    const workCards: SavedWorkCardSummary[] = [];
    const invalidFiles: InvalidSavedWorkCardFile[] = [];

    for (const fileName of entries.filter((entry) =>
      entry.toLowerCase().endsWith(".json"),
    )) {
      const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

      if (fileNameErrors.length > 0) {
        invalidFiles.push({ fileName, errorMessages: fileNameErrors });
        continue;
      }

      try {
        const workCard = await readSavedWorkCardFile(phase, fileName);
        workCards.push(toSavedWorkCardSummary(fileName, workCard));
      } catch (error) {
        invalidFiles.push({
          fileName,
          errorMessages: [toPlainSaveError(error)],
        });
      }
    }

    workCards.sort((left, right) =>
      `${left.workCardId} ${left.title}`.localeCompare(
        `${right.workCardId} ${right.title}`,
      ),
    );

    return {
      ok: true,
      workCards,
      invalidFiles,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewArchitectPrompt(
  input: ArchitectPromptRequest,
): Promise<ArchitectPromptPreviewResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const prompt = renderArchitectFramingPrompt(workCard);

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveArchitectPrompt(
  input: ArchitectPromptRequest,
): Promise<ArchitectPromptSaveResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const prompt = renderArchitectFramingPrompt(workCard);
    const directory = resolveArchitectPromptsDirectory(workCard.phase);
    const savedFileName = buildArchitectPromptFileName(workCard);
    const markdownPath = resolveInside(directory, savedFileName);

    await failIfExists(
      markdownPath,
      "An Architect prompt artifact for this Work Card already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(markdownPath, `${prompt}\n`, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      prompt,
      workCard,
      sourceFileName: input.fileName,
      markdownPath,
      savedFileName,
    };
  } catch (error) {
    console.error("Failed to save Architect prompt.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function previewRiskReview(
  input: RiskReviewRequest,
): Promise<RiskReviewPreviewResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const review = routeWorkCardRisk(workCard);
    const markdown = renderRiskReviewMarkdown(
      workCard,
      review,
      new Date().toISOString(),
    );

    return {
      ok: true,
      review,
      markdown,
      workCard,
      sourceFileName: input.fileName,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export async function saveRiskReview(
  input: RiskReviewRequest,
): Promise<RiskReviewSaveResult> {
  try {
    const workCard = await readSavedWorkCardFile(input.phase, input.fileName);
    const review = routeWorkCardRisk(workCard);
    const markdown = renderRiskReviewMarkdown(
      workCard,
      review,
      new Date().toISOString(),
    );
    const directory = resolveRiskReviewsDirectory(workCard.phase);
    const savedFileName = buildRiskReviewFileName(workCard);
    const markdownPath = resolveInside(directory, savedFileName);

    await failIfExists(
      markdownPath,
      "A Risk Review artifact for this Work Card already exists.",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(markdownPath, markdown, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      ok: true,
      review,
      markdown,
      workCard,
      sourceFileName: input.fileName,
      markdownPath,
      savedFileName,
    };
  } catch (error) {
    console.error("Failed to save risk review.", error);

    return {
      ok: false,
      errorMessages: [toPlainSaveError(error)],
    };
  }
}

export function resolveWorkCardsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Work_Cards");
}

export function resolveArchitectPromptsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Architect_Prompts");
}

export function resolveRiskReviewsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Risk_Reviews");
}

export function resolveInside(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Work Card files must stay inside the approved planning folder.");
  }

  return resolvedPath;
}

export function validateSavedWorkCardJsonFileName(fileName: string): string[] {
  const value = fileName.trim();

  if (value.length === 0) {
    return ["Choose a saved Work Card JSON file."];
  }

  if (value !== path.basename(value)) {
    return ["Saved Work Card file names must not include folders."];
  }

  if (!value.toLowerCase().endsWith(".json")) {
    return ["Saved Work Card files must be JSON files."];
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*\.json$/.test(value)) {
    return [
      "Saved Work Card file names must use only letters, numbers, hyphens, underscores, and the .json extension.",
    ];
  }

  return [];
}

async function readSavedWorkCardFile(
  phase: string,
  fileName: string,
): Promise<WorkCard> {
  const fileNameErrors = validateSavedWorkCardJsonFileName(fileName);

  if (fileNameErrors.length > 0) {
    throw new Error(fileNameErrors.join(" "));
  }

  const directory = resolveWorkCardsDirectory(phase);
  const filePath = resolveInside(directory, fileName.trim());
  const rawJson = await readFile(filePath, "utf8");
  const parsed = JSON.parse(rawJson) as unknown;
  const validation = validateWorkCard(parsed);

  if (!validation.valid) {
    throw new Error(
      `Saved Work Card JSON is not valid: ${validation.errors.join(" ")}`,
    );
  }

  const workCard = parsed as WorkCard;

  if (workCard.phase !== phase.trim()) {
    throw new Error("Saved Work Card phase must match the selected phase folder.");
  }

  return workCard;
}

function toSavedWorkCardSummary(
  fileName: string,
  workCard: WorkCard,
): SavedWorkCardSummary {
  return {
    fileName,
    workCardId: workCard.workCardId,
    title: workCard.title,
    status: workCard.status,
    phase: workCard.phase,
    riskLevel: workCard.riskLevel,
  };
}

async function failIfExists(
  filePath: string,
  message: string,
): Promise<void> {
  try {
    await access(filePath);
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }

    throw error;
  }

  throw new Error(message);
}

function toPlainSaveError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The Work Card could not be saved. Please check the form and try again.";
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}
