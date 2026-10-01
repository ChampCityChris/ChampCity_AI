import type { ArchitectHandoffManifest } from "../../shared/workspaceContracts";
import { resolveStructuredArchitectInterviewIntake } from "../architectInterview/architectInterviewContextResolver";
import { createStructuredArchitectWorkspaceService } from "../architectOutputs/structuredArchitectWorkspaceService";
import { resolveMcpWorkspaceBindingForPrompt } from "./mcpWorkspacePromptContract";

export async function buildArchitectHandoffManifest(workspaceRoot: string): Promise<ArchitectHandoffManifest> {
  try {
    const intake = await resolveStructuredArchitectInterviewIntake(workspaceRoot);
    const model = await createStructuredArchitectWorkspaceService().get(workspaceRoot, intake.workflowId);
    if (!model.ready || !model.handoff) return {state: "handoff-unavailable", reason: model.reason};
    const binding = resolveMcpWorkspaceBindingForPrompt(workspaceRoot);
    return {state: "handoff-ready", handoffInstruction: model.handoff, workflowId: model.workflowId, intakeId: model.intakeId, intakeVersion: model.intakeVersion,
      mcpWorkspaceBinding: {mcpWorkspaceId: binding.workspaceId, label: binding.label, repositoryName: binding.repositoryName, branch: binding.branch, gitBacked: binding.gitBacked}};
  } catch (error) {return {state: "handoff-unavailable", reason: error instanceof Error ? error.message : "Architect handoff unavailable."};}
}
