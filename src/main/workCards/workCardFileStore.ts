import { access, mkdir, readdir, writeFile } from "node:fs/promises";
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
import { renderWorkCardMarkdown } from "../../shared/workCards/renderWorkCardMarkdown";

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

    await failIfExists(markdownPath);
    await failIfExists(jsonPath);
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

export function resolveWorkCardsDirectory(phase: string): string {
  const phaseErrors = validateSafePhaseFolder(phase);

  if (phaseErrors.length > 0) {
    throw new Error(phaseErrors.join(" "));
  }

  return resolveInside(planningPhasesRoot, phase.trim(), "Work_Cards");
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

async function failIfExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return;
    }

    throw error;
  }

  throw new Error("A Work Card file with this ID and title already exists.");
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
