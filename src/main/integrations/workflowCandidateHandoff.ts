import {buildMcpWorkspaceBindingPromptBlock} from "./mcpWorkspacePromptContract";
import type {WorkflowCandidateStage} from "../../shared/workflowCandidateContracts";

export function workflowCandidateHandoff(root: string, workflowId: string, stage: WorkflowCandidateStage, scopeEntityId?: string): string[] {
  return [
    ...buildMcpWorkspaceBindingPromptBlock(root),
    `Completed semantic candidate submission: workflow_toolbox.submit_stage_candidate.`,
    `Call workflow_toolbox with action "submit_stage_candidate" and params ${JSON.stringify({workflowId, stage, ...(scopeEntityId ? {scopeEntityId} : {}), candidateJson: "JSON.stringify(the semantic candidate)"})}.`,
    "Supply only the semantic contract fields described above. ChampCity resolves the current Workflow/Intake/Phase/WorkItem identities, source revisions and expected review versions. Do not invent or copy mechanical revision values.",
    "For Architect Interview, candidateJson contains the fifteen-section semantic output directly. For other stages it contains their semantic facts/direction/criteria, phases, candidates or execution contract fields as described above.",
    "Submit through MCP; do not ask the Operator to paste JSON, write canonical Markdown or promote draft files. Markdown review documents are generated from SQL only.",
    "Submission proposes a review candidate only. Approval, revision requests and rejection remain human Operator actions. On success, ask the Operator to press the existing Refresh control to inspect the generated review.",
  ];
}
