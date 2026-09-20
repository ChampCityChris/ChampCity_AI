import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { IssueFixCardPlanCandidate } from "../../shared/issueResolutionContracts";
import type { WorkPlanStructure } from "../../shared/workPlanningContracts";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { issueEvidenceBytes, issueEvidenceDigest, workIssueContext } from "../workPlanning/workIssueContext";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { workPlanStructureFromBody } from "../workPlanning/workPlanStructure";

export interface RoutedIssueExecutionPlan {
  issueId: string; relativePath: string; planPath: string; planRevision: number; planDigest: string;
  structure: WorkPlanStructure; candidates: IssueFixCardPlanCandidate[]; workItemToFixCard: Record<string, string>;
  metadata: CanonicalDocumentMetadata; planBody: string; bindingBody: string;
}
export function issueExecutionPlanPath(issueId: string) {
  if (!/^ISSUE_\d+$/.test(issueId)) throw Error("Invalid Issue identity.");
  return `issues/${issueId}/EXECUTION_PLAN.md`;
}
function assertCurrentSources(root: string, relativePath: string, visited = new Set<string>()) {
  if (visited.has(relativePath)) return;
  if (visited.size > 250) throw Error("Correction Plan source graph exceeds its bound.");
  visited.add(relativePath);
  const content = issueEvidenceBytes(root, relativePath);
  if (!content) throw Error("Correction Plan source is missing.");
  const document = parseCanonicalMarkdownDocument(content);
  if (document.metadata.participationRole === "historical") throw Error("Correction Plan source is superseded.");
  const digests = document.metadata.workflowData.sourceDigests;
  if (digests && typeof digests === "object") for (const [source, digest] of Object.entries(digests)) {
    if (issueEvidenceDigest(issueEvidenceBytes(root, source)) !== digest) throw Error("Correction Plan source content is stale.");
  }
  for (const source of document.metadata.sourceRevisions) {
    const bytes = issueEvidenceBytes(root, source.path);
    if (!bytes || parseCanonicalMarkdownDocument(bytes).metadata.artifactRevision !== source.revision) throw Error("Correction Plan source revision is stale.");
    assertCurrentSources(root, source.path, visited);
  }
}
export function readRoutedIssueExecutionPlan(root: string, issueId: string): RoutedIssueExecutionPlan | null {
  const relativePath = issueExecutionPlanPath(issueId);
  const content = issueEvidenceBytes(root, relativePath);
  if (!content) return null;
  const binding = parseCanonicalMarkdownDocument(content);
  if (binding.metadata.artifactType !== "issue-execution-plan" || binding.metadata.identity.issueId !== issueId || binding.metadata.participationRole === "historical") throw Error("Issue execution binding is invalid or superseded.");
  const planPath = binding.metadata.sourceRevisions[0]?.path;
  if (!planPath) throw Error("Issue execution binding has no approved source Plan.");
  const planBytes = issueEvidenceBytes(root, planPath);
  if (!planBytes || issueEvidenceDigest(planBytes) !== binding.metadata.workflowData.planDigest) throw Error("Correction Plan changed; its execution binding is stale.");
  const plan = parseCanonicalMarkdownDocument(planBytes);
  if (plan.metadata.artifactType !== "work-planning-plan" || plan.metadata.documentDisposition.status !== "Approved" || plan.metadata.identity.planId !== binding.metadata.identity.planId || plan.metadata.identity.intakeId !== binding.metadata.identity.intakeId || plan.metadata.identity.routeDecisionId !== binding.metadata.identity.routeDecisionId || plan.metadata.identity.routeId !== "issue-resolution" || binding.metadata.sourceRevisions[0].revision !== plan.metadata.artifactRevision) throw Error("Current approved correction Plan is required.");
  assertCurrentSources(root, planPath);
  const structure = workPlanStructureFromBody(plan.bodyMarkdown);
  const mapping = binding.metadata.workflowData.workItemToFixCard as Record<string, string>;
  if (!mapping || typeof mapping !== "object" || Object.keys(mapping).length !== structure.workItems.length || new Set(Object.values(mapping)).size !== structure.workItems.length ||
    structure.workItems.some((item) => !new RegExp(`^${issueId}-FC\\d{2,}$`).test(mapping[item.workItemId] ?? ""))) throw Error("Issue execution identities do not match the Plan.");
  const candidates = structure.workItems.map((item, index) => ({ fixCardId: mapping[item.workItemId], order: index + 1, title: item.title, purpose: item.purpose,
    dependsOn: item.dependsOn.map((id) => mapping[id]), evidencePaths: [planPath, relativePath] }));
  return { issueId, relativePath, planPath, planRevision: plan.metadata.artifactRevision, planDigest: issueEvidenceDigest(planBytes), structure, candidates, workItemToFixCard: mapping,
    metadata: binding.metadata, planBody: plan.bodyMarkdown, bindingBody: binding.bodyMarkdown };
}
export async function activateRoutedIssueExecutionPlan(root: string, intakeId: string) {
  const model = await workPlanningKernel.get(root, intakeId, "plan");
  const plan = model.artifact;
  if (!plan || plan.stale || plan.disposition !== "Approved" || !plan.structure || model.routeId !== "issue-resolution") throw Error("Approve the current RCA correction Plan before execution.");
  const issue = workIssueContext(root, intakeId, plan.identity.routeDecisionId);
  if (!issue) throw Error("Current routed Issue identity is required.");
  const relativePath = issueExecutionPlanPath(issue.issueId);
  if (issueEvidenceBytes(root, relativePath)) return readRoutedIssueExecutionPlan(root, issue.issueId)!;
  if (["FIX_CARD_PLAN.md", "ISSUE_RESOLUTION_PLAN.md"].some((name) => issueEvidenceBytes(root, `issues/${issue.issueId}/${name}`))) throw Error("Existing legacy correction planning must not be silently replaced by a routed Plan.");
  const workItemToFixCard = Object.fromEntries(plan.structure.workItems.map((item, index) => [item.workItemId, `${issue.issueId}-FC${String(index + 1).padStart(2, "0")}`]));
  writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath, metadata: {
    schemaVersion: 1, artifactType: "issue-execution-plan", artifactRevision: 1, participationRole: "contextOnly", identity: { ...plan.identity, issueId: issue.issueId },
    sourceRevisions: [{ path: plan.relativePath, revision: plan.artifactRevision }], workflowData: { planDigest: issueEvidenceDigest(issueEvidenceBytes(root, plan.relativePath)), workItemToFixCard },
    documentDisposition: { status: "Approved", notes: "Execution binding derives from the Operator-approved correction Plan.", reviewedAt: new Date().toISOString() },
  }, bodyMarkdown: `# Issue Correction Execution\n\nApproved Plan: ${plan.relativePath}\nTopology: ${plan.structure.topology}\n\n${plan.structure.workItems.map((item) => `- ${item.workItemId} → ${workItemToFixCard[item.workItemId]}: ${item.title}`).join("\n")}\n\nFix Card and Repair artifacts retain Issue identity. Phase membership and acceptance come from the approved Plan; RCA remains separate.\n` });
  return readRoutedIssueExecutionPlan(root, issue.issueId)!;
}
