import path from "node:path";
import type { ArchitectHandoffManifest } from "../../shared/workspaceContracts";
import { getArchitectInterviewWorkspaceModel, prepareArchitectInterviewHandoff } from "../architectInterview/architectInterviewService";
import { resolveMcpWorkspaceBindingForPrompt } from "./mcpWorkspacePromptContract";

export function buildArchitectHandoffManifest(workspaceRoot: string): ArchitectHandoffManifest {
  try {
    const current = getArchitectInterviewWorkspaceModel(workspaceRoot);
    const model = current.handoffInstruction ? current : prepareArchitectInterviewHandoff(workspaceRoot);
    if (!model.canCopyHandoff || !model.promptDocument || !model.interviewTargets || !model.handoffInstruction) {
      return {
        state: model.state === "needs-attention" ? "handoff-failed" : "handoff-unavailable",
        reason: model.reason,
      };
    }

    for (const relativePath of [
      model.promptDocument.markdownPath,
      model.interviewTargets.markdownPath,
    ]) {
      assertRepoRelative(relativePath);
    }

    const binding = resolveMcpWorkspaceBindingForPrompt(workspaceRoot);
    return {
      state: "handoff-ready",
      promptMarkdownPath: model.promptDocument.markdownPath,
      projectIntakeMarkdownPath: projectIntakePath(model.evidencePaths, ".md"),
      interviewMarkdownTargetPath: model.interviewTargets.markdownPath,
      handoffInstruction: model.handoffInstruction,
      mcpWorkspaceBinding: {
        mcpWorkspaceId: binding.workspaceId,
        label: binding.label,
        repositoryName: binding.repositoryName,
        branch: binding.branch,
        gitBacked: binding.gitBacked,
      },
    };
  } catch (error) {
    return {
      state: "handoff-failed",
      reason: error instanceof Error ? error.message : "Architect handoff manifest failed.",
    };
  }
}

function projectIntakePath(paths: string[], extension: ".md"): string | undefined {
  return paths.find((value) =>
    (
      value.toLowerCase().includes("planning/project/project_intake/") ||
      value.toLowerCase().includes("planning/project/project-intake/")
    ) && value.endsWith(extension),
  );
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
