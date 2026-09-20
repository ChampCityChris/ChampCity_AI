import type { IssueFixCardPlanCandidate } from "../../shared/issueResolutionContracts";
import type { PhaseExecutionEvidence, WorkItemExecutionStage } from "../../shared/planExecutionContracts";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { issueEvidenceBytes, issueEvidenceDigest } from "../workPlanning/workIssueContext";
import { readRoutedIssueExecutionPlan, type RoutedIssueExecutionPlan } from "./issueExecutionPlan";
import { projectPlanExecution } from "./planExecutor";

const closePath = (issueId: string, id: string) => `issues/${issueId}/Close_Records/FIX_CARD_CLOSE_RECORD_${id}.md`;
export const issuePhaseAcceptancePath = (issueId: string, phaseId: string) => {
  if (!/^ISSUE_\d+$/.test(issueId) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(phaseId)) throw Error("Invalid correction Phase identity.");
  return `issues/${issueId}/Phase_Acceptance/${phaseId}.md`;
};
function stage(candidate: IssueFixCardPlanCandidate): WorkItemExecutionStage {
  switch (candidate.lifecycle?.state) {
    case "complete": return "complete";
    case "eligible": case "blocked-by-dependencies": case undefined: return "ready";
    case "validated-awaiting-close": return "close";
    case "repair-required": case "in-repair": return "repair";
    case "review-validation": case "implementation-evidence-ready": return "review-validate";
    default: return "implement";
  }
}
function phaseSources(root: string, plan: RoutedIssueExecutionPlan, phaseId: string) {
  const dependencies = plan.structure.topology === "phased" ? plan.structure.phases.find((phase) => phase.phaseId === phaseId)!.dependsOn : [];
  return Object.fromEntries([plan.planPath, plan.relativePath, ...dependencies.map((id) => issuePhaseAcceptancePath(plan.issueId, id)), ...plan.structure.workItems.filter((item) => item.phaseId === phaseId).map((item) => closePath(plan.issueId, plan.workItemToFixCard[item.workItemId]))]
    .map((source) => [source, issueEvidenceDigest(issueEvidenceBytes(root, source))]));
}
/** Artifact classification stays in Issue services; all dependency/Phase progression is generic. */
export function projectIssueExecution(root: string, issueId: string, candidates: IssueFixCardPlanCandidate[], acceptedPlanPath?: string) {
  if (!candidates.length) return undefined;
  const plan = readRoutedIssueExecutionPlan(root, issueId);
  const structure = plan?.structure ?? { topology: "direct" as const, topologyRationale: "Existing Fix Card Map declares a direct correction sequence.", acceptanceCriteria: ["Aggregate Issue validation accepted"], workItems: candidates.map((candidate) => ({
    workItemId: candidate.fixCardId, title: candidate.title, purpose: candidate.purpose, dependsOn: candidate.dependsOn, acceptanceCriteria: ["Validated correction has a durable close record"],
  })) };
  const revision = plan?.planRevision ?? 1;
  const mapping = plan?.workItemToFixCard ?? Object.fromEntries(candidates.map((candidate) => [candidate.fixCardId, candidate.fixCardId]));
  const phases: PhaseExecutionEvidence[] = structure.topology === "phased" ? structure.phases.flatMap((phase) => {
    const relativePath = issuePhaseAcceptancePath(issueId, phase.phaseId); const bytes = issueEvidenceBytes(root, relativePath);
    if (!bytes) return [];
    const record = parseCanonicalMarkdownDocument(bytes);
    const fresh = record.metadata.artifactType === "issue-phase-acceptance" && record.metadata.identity.issueId === issueId && record.metadata.identity.phaseId === phase.phaseId &&
      record.metadata.identity.planId === plan!.metadata.identity.planId && record.metadata.documentDisposition.status === "Approved" &&
      JSON.stringify(record.metadata.workflowData.sourceDigests) === JSON.stringify(phaseSources(root, plan!, phase.phaseId));
    return [{ phaseId: phase.phaseId, planRevision: revision, fresh, blockers: [], evidencePaths: [relativePath],
      criteria: phase.acceptanceCriteria.map((criterion) => ({ criterion, status: "passed" as const, evidencePaths: [relativePath] })) }];
  }) : [];
  const projection = projectPlanExecution({ planId: String(plan?.metadata.identity.planId ?? issueId), planRevision: revision, approved: true, fresh: true, structure, blockers: [], phases,
    planEvidence: acceptedPlanPath ? { planRevision: revision, fresh: true, blockers: [], evidencePaths: [acceptedPlanPath],
      criteria: structure.acceptanceCriteria.map((criterion) => ({ criterion, status: "passed", evidencePaths: [acceptedPlanPath] })) } : undefined,
    workItems: structure.workItems.map((item) => {
      const candidate = candidates.find((entry) => entry.fixCardId === mapping[item.workItemId]);
      if (!candidate) throw Error("Correction candidate is missing from the approved Plan.");
      const complete = candidate.lifecycle?.state === "complete";
      const evidencePaths = complete ? [closePath(issueId, candidate.fixCardId)] : [];
      return { workItemId: item.workItemId, stage: stage(candidate), planRevision: revision, fresh: true,
        blockers: candidate.lifecycle?.state === "needs-attention" && !candidate.lifecycle.selectable ? [candidate.lifecycle.reason] : [], evidencePaths,
        criteria: complete ? item.acceptanceCriteria.map((criterion) => ({ criterion, status: "passed" as const, evidencePaths })) : [] };
    }),
  });
  // Include exact approval/close bytes in the review token, including edits that retain metadata revisions.
  projection.fingerprint = issueEvidenceDigest(JSON.stringify({ fingerprint: projection.fingerprint, plan: plan?.planDigest,
    closes: candidates.map((candidate) => issueEvidenceDigest(issueEvidenceBytes(root, closePath(issueId, candidate.fixCardId)))),
    phases: phases.map((phase) => issueEvidenceDigest(issueEvidenceBytes(root, phase.evidencePaths[0]))), acceptedPlan: acceptedPlanPath ? issueEvidenceDigest(issueEvidenceBytes(root, acceptedPlanPath)) : null }));
  return { projection, mapping, plan };
}
export function acceptIssueExecutionPhase(root: string, issueId: string, candidates: IssueFixCardPlanCandidate[], input: { phaseId: string; expectedFingerprint: string; notes: string }) {
  const state = projectIssueExecution(root, issueId, candidates);
  if (!state?.plan || state.plan.structure.topology !== "phased" || input.expectedFingerprint !== state.projection.fingerprint) throw Error("Refresh the current phased correction evidence before acceptance.");
  const phase = state.projection.phases.find((entry) => entry.phaseId === input.phaseId);
  if (!phase?.workItemsComplete || phase.reasons.some((reason) => reason !== "Phase evidence is stale.") || phase.complete) throw Error("Phase acceptance requires all corrections closed and accepted prerequisite Phases.");
  if (typeof input.notes !== "string" || !input.notes.trim() || input.notes.length > 4000) throw Error("Record bounded Phase acceptance evidence in Operator notes.");
  const relativePath = issuePhaseAcceptancePath(issueId, input.phaseId);
  const prior = issueEvidenceBytes(root, relativePath);
  writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath, metadata: { schemaVersion: 1, artifactType: "issue-phase-acceptance",
    artifactRevision: prior ? parseCanonicalMarkdownDocument(prior).metadata.artifactRevision + 1 : 1, participationRole: "gatingReview",
    identity: { ...state.plan.metadata.identity, phaseId: input.phaseId }, sourceRevisions: [{ path: state.plan.planPath, revision: state.plan.planRevision }],
    workflowData: { sourceDigests: phaseSources(root, state.plan, input.phaseId) },
    documentDisposition: { status: "Approved", notes: input.notes.trim(), reviewedAt: new Date().toISOString() } },
    bodyMarkdown: `# Correction Phase Acceptance\n\n${state.plan.structure.phases.find((entry) => entry.phaseId === input.phaseId)!.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")}\n\n${input.notes.trim()}\n` });
}
