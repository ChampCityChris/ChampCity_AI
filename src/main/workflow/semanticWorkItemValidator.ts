import crypto from "node:crypto";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import type { EntityId, ProjectStateRecord } from "../../shared/projectState/domainContracts";
import type { CodexAppServerAdapter, CodexAppServerThreadAdapter } from "../workCardBuilding/codexAppServerTransport";
import { loadCodexAppServerAdapter } from "../workCardBuilding/codexAppServerTransport";

export interface SemanticValidationContext {
  workingDirectory: string;
  workflowId: EntityId;
  workItemId: EntityId;
  workItemTitle: string;
  criterion: ProjectStateRecord<"Criterion">;
  implementation: ProjectStateRecord<"ImplementationRecord">;
  testerResult: ProjectStateRecord<"TesterResult">;
  deterministicEvidence: string[];
  sourceMode: "source-backed" | "source-neutral";
  sourceRevisionId: string | null;
}

export async function reviewWorkItemCriterion(context: SemanticValidationContext, selection: CodexModelSelection,
  createAdapter: () => Promise<CodexAppServerAdapter> = loadCodexAppServerAdapter): Promise<{ outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string; principalId: string }> {
  const adapter = await createAdapter();
  let thread: CodexAppServerThreadAdapter | null = null;
  const principalId = `validator-${crypto.randomUUID()}`;
  try {
    thread = adapter.startThread({ workingDirectory: context.workingDirectory, model: selection.model, reasoningEffort: selection.reasoningEffort,
      skipGitRepoCheck: true, sandboxMode: "workspace-write", readOnly: true, approvalPolicy: "on-request", approvalsReviewer: "user", networkAccessEnabled: false, writableRoots: [] });
    const events = await thread.runStreamed(buildPrompt(context));
    let finalText = "";
    for await (const event of events.events) {
      if (event.type === "item.completed" && event.item.type === "agent_message") finalText = String(event.item.text).slice(0, 12000);
      else if (event.type === "approval.requested") {
        await thread.respondToApproval?.(event.approval.requestId, { decision: "deny" });
        throw Error("Semantic Validator requested a capability outside its read-only review boundary.");
      } else if (event.type === "user_input.requested" || event.type === "mcp_elicitation.requested" ||
        event.type === "item.completed" && ["file_change", "mcp_tool_call", "command_execution"].includes(event.item.type)) {
        throw Error("Semantic Validator attempted an interactive or mutating action.");
      }
    }
    return { ...parseResult(finalText), principalId };
  } finally {
    try { await thread?.dispose?.(); } catch { /* result persistence remains authoritative */ }
    try { await adapter.dispose?.(); } catch { /* result persistence remains authoritative */ }
  }
}

function buildPrompt(context: SemanticValidationContext): string {
  return [
    "You are the independent Validator for one exact ChampCity WorkItem Criterion.",
    "Review only the evidence below. Do not edit files, run commands, use Git, access the network, or request tools.",
    "Return exactly one JSON object with keys outcome and summary. outcome must be pass, fail, blocked, or inconclusive.",
    "A pass requires evidence that directly satisfies the Criterion; do not treat implementation claims or Tester conclusions alone as proof.",
    `Workflow: ${context.workflowId}`,
    `WorkItem: ${context.workItemId} — ${context.workItemTitle}`,
    `Source mode: ${context.sourceMode}`,
    `Candidate revision: ${context.sourceRevisionId ?? "none (source-neutral attempt identity)"}`,
    `Candidate checkout: ${context.workingDirectory}`,
    `Criterion: ${context.criterion.body.statement}`,
    `Verification intent: ${context.criterion.body.verificationIntent}`,
    `Implementation summary: ${context.implementation.body.summary}`,
    `Implementation deviations: ${context.implementation.body.deviations.join("; ") || "none"}`,
    `Implementation blockers: ${context.implementation.body.blockers.join("; ") || "none"}`,
    `Implementation residual risks: ${context.implementation.body.residualRisks.join("; ") || "none"}`,
    `Tester recommendation: ${context.testerResult.body.recommendation}`,
    `Tester rationale: ${context.testerResult.body.rationale}`,
    `Tester determination evidence: ${context.testerResult.body.determinationEvidence.join("; ")}`,
    `Tester unknowns: ${context.testerResult.body.unknowns.join("; ") || "none"}`,
    `Applicable deterministic receipts: ${context.deterministicEvidence.slice(0, 12).map(value => value.slice(0, 1200)).join("\n") || "none"}`,
  ].join("\n");
}

function parseResult(value: string): { outcome: "pass" | "fail" | "blocked" | "inconclusive"; summary: string } {
  const text = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text) as Record<string, unknown>; } catch { throw Error("Semantic Validator returned invalid structured evidence."); }
  if (!parsed || Array.isArray(parsed) || Object.keys(parsed).sort().join("|") !== "outcome|summary" ||
    !["pass", "fail", "blocked", "inconclusive"].includes(String(parsed.outcome)) ||
    typeof parsed.summary !== "string" || !parsed.summary.trim() || parsed.summary.length > 8000)
    throw Error("Semantic Validator result does not match the bounded outcome schema.");
  return { outcome: parsed.outcome as "pass" | "fail" | "blocked" | "inconclusive", summary: parsed.summary.trim() };
}
