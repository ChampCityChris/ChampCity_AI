import {buildMcpWorkspaceBindingPromptBlock} from "./mcpWorkspacePromptContract";
import type {WorkflowCandidateStage} from "../../shared/workflowCandidateContracts";

export function workflowCandidateHandoff(root: string, workflowId: string, stage: WorkflowCandidateStage, scopeEntityId?: string): string[] {
  return [
    ...buildMcpWorkspaceBindingPromptBlock(root),
    `Completed semantic candidate submission: workflow_toolbox.submit_stage_candidate.`,
    `Call workflow_toolbox with action "submit_stage_candidate" and params ${JSON.stringify({workflowId, stage, ...(scopeEntityId ? {scopeEntityId} : {}), candidateJson: "JSON.stringify(the semantic candidate)"})}.`,
    "Construct only the semantic contract fields described in this handoff. ChampCity resolves the current Workflow/Intake/Phase/WorkItem identities, source revisions and expected review versions. Do not invent or copy mechanical revision values.",
    "For Architect Interview, candidateJson contains the fifteen-section semantic output directly. For other stages it contains their semantic facts/direction/criteria, phases, candidates or execution contract fields as described in this handoff.",
    "The semantic candidate is not the chat response. Ask only materially unresolved questions and continue the conversation as needed. When sufficient information exists, construct the exact semantic candidate and call workflow_toolbox.submit_stage_candidate through MCP, passing JSON.stringify(candidate) in the tool candidateJson argument. Never print the candidate or raw transport JSON in chat. Never require the Operator to manually transfer JSON. Never emit canonical Markdown or promote draft files; review documents are generated from SQL only.",
    "Submission proposes a review candidate only. Approval, revision requests and rejection remain human Operator actions. After successful tool submission, respond only with a short confirmation that the candidate is ready and direct the Operator to press Refresh to inspect the generated review.",
  ];
}
