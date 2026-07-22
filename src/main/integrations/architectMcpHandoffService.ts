import path from "node:path";
import type { ArchitectHandoffManifest } from "../../shared/workspaceContracts";
import { listPlanningDocuments } from "../documents/planningDocumentService";

export function buildArchitectHandoffManifest(workspaceRoot: string): ArchitectHandoffManifest {
  try {
    const documents = listPlanningDocuments(workspaceRoot);
    const promptMarkdown = latestPath(documents, "planning/project/Project_Architect_Interview_Prompts/", ".md");
    const promptJson = latestPath(documents, "planning/project/Project_Architect_Interview_Prompts/", ".json");
    const intakeMarkdown = latestPath(documents, "planning/project/Project_Intake/", ".md");
    const intakeJson = latestPath(documents, "planning/project/Project_Intake/", ".json");

    if (!promptMarkdown || !promptJson || !intakeMarkdown || !intakeJson) {
      return {
        state: "handoff-unavailable",
        reason: "Project Intake and Architect Interview Prompt pairs are required before handoff.",
      };
    }

    for (const relativePath of [promptMarkdown, promptJson, intakeMarkdown, intakeJson]) {
      assertRepoRelative(relativePath);
    }

    return {
      state: "handoff-ready",
      promptMarkdownPath: promptMarkdown,
      promptJsonPath: promptJson,
      projectIntakeMarkdownPath: intakeMarkdown,
      projectIntakeJsonPath: intakeJson,
      repositoryReference: "<PROJECT_REPO>",
    };
  } catch (error) {
    return {
      state: "handoff-failed",
      reason: error instanceof Error ? error.message : "Architect handoff manifest failed.",
    };
  }
}

function latestPath(
  documents: ReturnType<typeof listPlanningDocuments>,
  prefix: string,
  extension: ".md" | ".json",
): string | undefined {
  return documents
    .flatMap((document) => [document.markdownPath, document.jsonPath])
    .filter((value): value is string => Boolean(value))
    .filter((value) => value.startsWith(prefix) && value.endsWith(extension))
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }))
    .at(-1);
}

function assertRepoRelative(relativePath: string): void {
  if (
    path.isAbsolute(relativePath) ||
    relativePath.includes("..") ||
    relativePath.includes("\\")
  ) {
    throw new Error("Architect handoff path must be repository-relative.");
  }
}
