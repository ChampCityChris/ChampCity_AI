import { randomUUID } from "node:crypto";
import type { ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import { metadataWithDisposition, parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { WorkItemDecompositionModel, WorkItemDecompositionReview } from "../../shared/workItemDecompositionContracts";
import type { WorkPlanningArtifact } from "../../shared/workPlanningContracts";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import { createArchitectOutputRegistry } from "../architectOutputs/architectOutputRegistry";
import { getActiveArchitectOutputRuntimeSubmission, getArchitectOutputRuntimeStatus, prepareArchitectOutputRuntimeSubmission } from "../architectOutputs/architectOutputRuntimeService";
import { writeCanonicalMarkdownDocument, writeCanonicalMarkdownDocuments } from "../documents/canonicalMarkdownDocumentWriter";
import { buildMcpWorkspaceBindingPromptBlock, buildWriteMarkdownArtifactJsonBlock } from "../integrations/mcpWorkspacePromptContract";
import { issueEvidenceBytes, issueEvidenceDigest } from "../workPlanning/workIssueContext";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { applyWorkItemDecomposition, decompositionFromBody, decompositionGuidance } from "./workItemDecomposition";

const outputKind = "work-item-decomposition";
interface Context { plan: WorkPlanningArtifact; workItemId: string; target: string; planDigest: string; priorContent: string | null; supersededIds: string[] }
function targetFor(plan: WorkPlanningArtifact, workItemId: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(workItemId)) throw Error("Invalid Work Item identity.");
  return plan.relativePath.replace(/PLAN\.md$/, `Decompositions/${workItemId}.md`);
}
const read = (root: string, relativePath: string) => { const content = issueEvidenceBytes(root, relativePath); return content ? parseCanonicalMarkdownDocument(content) : null; };
function proposed(context: Context, body: string) {
  const proposal = decompositionFromBody(body);
  if (proposal.replacements.some((item) => item && context.supersededIds.includes(item.workItemId))) throw Error("Superseded Work Item identities cannot be reused.");
  return { proposal, ...applyWorkItemDecomposition(context.plan.structure!, context.workItemId, proposal) };
}
function definition(root: string, context: Context): ArchitectOutputDefinition<string, { proposalPath: string }, Context> {
  const owningWorkspaceId = `decompose-${context.plan.identity.routeDecisionId}-${context.workItemId}`;
  return { outputKind, owningWorkspaceId, bundleMode: "single-output",
    buildSubmissionId: (input) => buildDeterministicArchitectDraftSubmissionId({ outputKind, owningWorkspaceId, ...input }),
    buildPromotionGroupId: (input) => buildDeterministicArchitectDraftSubmissionId({ outputKind, owningWorkspaceId, ...input }),
    resolvePreparation: () => ({ sourceHandoff: { path: context.plan.relativePath, revision: context.plan.artifactRevision }, domainContext: context }),
    resolvePromotionContext({ preparedContext }) {
      if (JSON.stringify(preparedContext) !== JSON.stringify(context)) throw Error("Plan or proposal review changed; prepare decomposition again.");
      return context;
    },
    slots: [{ slotId: outputKind, displayLabel: "Work Item decomposition proposal", draftPathComponent: "decomposition.md",
      validateBody: (body, current) => { proposed(current, body); },
      buildCanonicalDocument({ bodyMarkdown, domainContext: current }) {
        const prior = current.priorContent ? parseCanonicalMarkdownDocument(current.priorContent) : null;
        const proposal = proposed(current, bodyMarkdown).proposal;
        return { relativePath: current.target, metadata: { schemaVersion: 1, artifactType: outputKind, artifactRevision: (prior?.metadata.artifactRevision ?? 0) + 1,
          participationRole: "gatingReview", identity: { ...current.plan.identity, workItemId: current.workItemId, proposalId: prior?.metadata.identity.proposalId ?? `decomposition-${randomUUID()}` },
          sourceRevisions: [{ path: current.plan.relativePath, revision: current.plan.artifactRevision }], workflowData: { kind: "decomposition-proposal", proposal, planDigest: current.planDigest },
          documentDisposition: { status: "Pending", notes: "", reviewedAt: null } } };
      } }],
    buildPreparedInstruction({ workspaceRoot, submission }) {
      const prior = context.priorContent ? parseCanonicalMarkdownDocument(context.priorContent) : null;
      return [...buildMcpWorkspaceBindingPromptBlock(workspaceRoot), "", decompositionGuidance,
        `Original Work Item: ${context.workItemId}. Approved Plan: ${context.plan.relativePath}, revision ${context.plan.artifactRevision}.`,
        "Return a decomposition proposal, not an implementation disposition or replacement Formal Work Cards. Preserve the Intake, route, all unrelated candidates, Plan acceptance criteria, and original prerequisites.",
        "Write one champcity-work-item-decomposition JSON domain block with kind (siblings or direct-to-phased), rationale, evidence (nonempty string array), and replacements (at least two new Work Item candidates with workItemId, title, purpose, dependsOn, acceptanceCriteria).",
        "For siblings, retain the current topology and Phase membership. Replacement dependencies may name siblings and original prerequisites only; the application preserves original prerequisites and rewires downstream dependencies to replacement terminal items.",
        "For direct-to-phased, add phases (phaseId, title, purpose, dependsOn, acceptanceCriteria), topologyRationale, phaseId on each replacement, and phaseAssignments mapping every unchanged Work Item ID to its Phase. Justify real Phase boundaries from evidence; do not add unrelated work.",
        `Original candidate: ${JSON.stringify(context.plan.structure!.workItems.find((item) => item.workItemId === context.workItemId))}`,
        `Current structure: ${JSON.stringify(context.plan.structure)}`,
        ...(prior?.metadata.documentDisposition.status === "RevisionRequested" ? [`Operator revision instructions: ${prior.metadata.documentDisposition.notes}`] : []),
        "The proposal is advisory. Only explicit Operator acceptance updates the Plan. Do not mutate Git, implement replacements, write final artifacts, or change application-owned identity/review metadata.",
        "```json", ...buildWriteMarkdownArtifactJsonBlock(workspaceRoot, submission.expectedDraftSlots[0].draftRelativePath, "<complete body-only decomposition proposal>"), "```",
      ].join("\n");
    }, buildPostPromotionSelection: ({ promotedDocuments }) => ({ proposalPath: promotedDocuments[0].relativePath }) };
}
async function contextFor(root: string, intakeId: string, workItemId: string): Promise<Context> {
  const model = await workPlanningKernel.get(root, intakeId, "plan");
  const plan = model.artifact;
  if (!plan || plan.stale || plan.disposition !== "Approved" || !plan.structure) throw Error("Decomposition requires the current approved Plan.");
  const target = targetFor(plan, workItemId);
  const content = issueEvidenceBytes(root, plan.relativePath)!;
  const history = parseCanonicalMarkdownDocument(content).metadata.workflowData.decompositions;
  const supersededIds = Array.isArray(history) ? history.map((entry) => (entry as { workItemId: string }).workItemId) : [];
  return { plan, workItemId, target, planDigest: issueEvidenceDigest(content), priorContent: issueEvidenceBytes(root, target), supersededIds };
}
function project(context: Context): WorkItemDecompositionModel {
  const prior = context.priorContent ? parseCanonicalMarkdownDocument(context.priorContent) : null;
  if (prior && (prior.metadata.artifactType !== outputKind || prior.metadata.identity.planId !== context.plan.identity.planId || prior.metadata.identity.workItemId !== context.workItemId || prior.metadata.participationRole === "historical")) throw Error("Decomposition identity is invalid or superseded.");
  const accepted = prior?.metadata.documentDisposition.status === "Approved";
  const stale = !!prior && !accepted && prior.metadata.workflowData.planDigest !== context.planDigest;
  const proposal = prior ? decompositionFromBody(prior.bodyMarkdown) : null;
  const result = proposal && !stale && !accepted ? proposed(context, prior!.bodyMarkdown) : null;
  return { kind: "decomposition-proposal", intakeId: context.plan.identity.intakeId, workItemId: context.workItemId, relativePath: context.target,
    revision: prior?.metadata.artifactRevision ?? 0, planRevision: context.plan.artifactRevision,
    state: accepted ? "accepted" : stale ? "stale" : prior?.metadata.documentDisposition.status === "RevisionRequested" ? "revision-requested" : prior ? "pending" : "not-proposed",
    proposal, resultingStructure: result?.structure, resumeWorkItemId: result?.resumeWorkItemId ?? (accepted ? prior!.metadata.workflowData.resumeWorkItemId as string : undefined),
    notes: prior?.metadata.documentDisposition.notes ?? "", canPrepare: !accepted && (!prior || stale || prior.metadata.documentDisposition.status === "RevisionRequested") };
}
export const workItemDecompositionService = {
  async get(root: string, intakeId: string, workItemId: string): Promise<WorkItemDecompositionModel> {
    let context = await contextFor(root, intakeId, workItemId);
    const model = project(context);
    if (model.state === "accepted") return model;
    if (!context.plan.structure!.workItems.some((item) => item.workItemId === workItemId)) throw Error("Work Item is absent or superseded.");
    const entry = definition(root, context);
    const active = getActiveArchitectOutputRuntimeSubmission(root, entry.owningWorkspaceId);
    if (active && active.submission.state !== "promoted" && JSON.stringify(active.preparedContext) !== JSON.stringify(context)) active.submission = { ...active.submission, state: "superseded" };
    const status = getArchitectOutputRuntimeStatus(root, outputKind, entry.owningWorkspaceId, createArchitectOutputRegistry([entry]));
    context = { ...context, priorContent: issueEvidenceBytes(root, context.target) };
    return { ...project(context), submission: status?.submission, preparedInstruction: status && ["waiting-for-drafts", "partial-draft-set"].includes(status.submission.state) ? status.preparedInstruction : undefined, error: status?.promotionError };
  },
  async prepare(root: string, intakeId: string, workItemId: string) {
    const model = await this.get(root, intakeId, workItemId);
    if (!model.canPrepare) throw Error("Request proposal revision before preparing another decomposition.");
    const entry = definition(root, await contextFor(root, intakeId, workItemId));
    prepareArchitectOutputRuntimeSubmission(root, outputKind, entry.owningWorkspaceId, createArchitectOutputRegistry([entry]));
    return this.get(root, intakeId, workItemId);
  },
  async copy(root: string, intakeId: string, workItemId: string) {
    const context = await contextFor(root, intakeId, workItemId); const entry = definition(root, context);
    const active = getActiveArchitectOutputRuntimeSubmission(root, entry.owningWorkspaceId);
    if (!active || !["waiting-for-drafts", "partial-draft-set"].includes(active.submission.state) || JSON.stringify(active.preparedContext) !== JSON.stringify(context)) throw Error("Prepare a current decomposition handoff before copying.");
    return active.preparedInstruction;
  },
  async review(root: string, intakeId: string, workItemId: string, input: WorkItemDecompositionReview) {
    if (!input || Object.keys(input).some((key) => !["disposition", "expectedProposalRevision", "expectedPlanRevision", "notes"].includes(key)) || !["accept", "request-revision"].includes(input.disposition) || typeof input.notes !== "string" || input.notes.length > 4000 || input.disposition === "request-revision" && !input.notes.trim()) throw Error("Decomposition requires explicit acceptance or revision instructions.");
    const context = await contextFor(root, intakeId, workItemId); const model = project(context); const prior = read(root, context.target);
    if (!prior || model.state !== "pending" || model.revision !== input.expectedProposalRevision || model.planRevision !== input.expectedPlanRevision) throw Error("Presented decomposition or Plan is stale or not pending.");
    if (input.disposition === "request-revision") {
      writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath: context.target, bodyMarkdown: prior.bodyMarkdown, metadata: metadataWithDisposition(prior.metadata, "RevisionRequested", input.notes, new Date().toISOString()) });
    } else {
      const result = proposed(context, prior.bodyMarkdown); const plan = read(root, context.plan.relativePath)!;
      const original = context.plan.structure!.workItems.find((item) => item.workItemId === workItemId)!;
      const history = [...((plan.metadata.workflowData.decompositions ?? []) as unknown[]), { kind: "superseded-by-decomposition", workItemId, originalCandidate: original,
        proposalPath: context.target, proposalRevision: model.revision, priorPlanRevision: context.plan.artifactRevision, replacementIds: result.proposal.replacements.map((item) => item.workItemId), resumeWorkItemId: result.resumeWorkItemId }];
      if (history.length > 100) throw Error("Plan decomposition history exceeds its supported bound.");
      const archivePath = context.target.replace(/\.md$/, `/PLAN_REVISION_${context.plan.artifactRevision}.md`);
      if (issueEvidenceBytes(root, archivePath)) throw Error("Prior Plan history target already exists.");
      writeCanonicalMarkdownDocuments([
        { workspaceRoot: root, relativePath: archivePath, bodyMarkdown: plan.bodyMarkdown, metadata: { ...plan.metadata, participationRole: "historical" } },
        { workspaceRoot: root, relativePath: context.target, bodyMarkdown: prior.bodyMarkdown, metadata: { ...metadataWithDisposition(prior.metadata, "Approved", input.notes, new Date().toISOString()), workflowData: { ...prior.metadata.workflowData, resumeWorkItemId: result.resumeWorkItemId, acceptedPlanRevision: context.plan.artifactRevision + 1 } } },
        { workspaceRoot: root, relativePath: context.plan.relativePath, bodyMarkdown: plan.bodyMarkdown.replace(/^```champcity-work-plan[ \t]*\r?\n[\s\S]*?\r?\n```[ \t]*$/m, () => "```champcity-work-plan\n" + JSON.stringify(result.structure, null, 2) + "\n```"),
          metadata: { ...plan.metadata, artifactRevision: plan.metadata.artifactRevision + 1, workflowData: { ...plan.metadata.workflowData, structure: result.structure, decompositions: history, resumeWorkItemId: result.resumeWorkItemId }, documentDisposition: { status: "Approved", notes: input.notes, reviewedAt: new Date().toISOString() } } },
      ]);
    }
    return this.get(root, intakeId, workItemId);
  },
};
