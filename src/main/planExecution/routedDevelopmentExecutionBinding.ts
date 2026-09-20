import { createHash } from "node:crypto";
import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { RoutedDevelopmentExecutionBinding } from "../../shared/routedDevelopmentExecutionContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { writeCanonicalMarkdownDocumentOnce } from "../documents/canonicalMarkdownDocumentWriter";
import { listPlanningDocuments } from "../documents/planningDocumentService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { workPlanningKernel } from "../workPlanning/workPlanningKernel";
import { workPlanStructureFromBody } from "../workPlanning/workPlanStructure";

export function routedDevelopmentExecutionBindingPath(intakeId: string): string {
  if (!/^intake-[a-f0-9-]{36}$/.test(intakeId)) throw Error("Invalid routed execution Intake identity.");
  // One binding per Intake: rerouting/revision cannot silently replace execution already begun.
  return `planning/work-intake/execution/${intakeId}/EXECUTION_PLAN.md`;
}

function bytes(root: string, relativePath: string): string | null {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Execution evidence must not be redirected.");
  if (!fs.existsSync(resolved.resolvedPath)) return null;
  const stat = fs.statSync(resolved.resolvedPath);
  if (!stat.isFile() || stat.size > 1_000_000) throw Error("Execution evidence must be bounded Markdown.");
  return fs.readFileSync(resolved.resolvedPath, "utf8");
}
const digest = (content: string | null) => content === null ? "missing" : createHash("sha256").update(content).digest("hex");

function assertCurrentSources(root: string, relativePath: string, visited = new Set<string>()) {
  if (visited.has(relativePath)) return;
  if (visited.size >= 250) throw Error("Execution Plan source graph exceeds its bound.");
  visited.add(relativePath);
  const content = bytes(root, relativePath);
  if (content === null) throw Error("Execution Plan source is missing.");
  const { metadata } = parseCanonicalMarkdownDocument(content);
  if (metadata.participationRole === "historical" || ["Rejected", "RevisionRequested"].includes(metadata.documentDisposition.status)) {
    throw Error("Execution Plan source is superseded or requires revision.");
  }
  const digests = metadata.workflowData.sourceDigests;
  if (digests !== undefined) {
    if (!digests || typeof digests !== "object" || Array.isArray(digests)) throw Error("Execution Plan source digests are invalid.");
    for (const [source, expected] of Object.entries(digests)) {
      if (typeof expected !== "string" || digest(bytes(root, source)) !== expected) throw Error("Execution Plan source content is stale.");
    }
  }
  for (const source of metadata.sourceRevisions) {
    const sourceBytes = bytes(root, source.path);
    if (!sourceBytes || parseCanonicalMarkdownDocument(sourceBytes).metadata.artifactRevision !== source.revision) throw Error("Execution Plan source revision is stale.");
    assertCurrentSources(root, source.path, visited);
  }
}

async function currentPlan(root: string, intakeId: string) {
  const model = await workPlanningKernel.get(root, intakeId, "plan");
  const plan = model.artifact;
  if (model.routeId === "issue-resolution") throw Error("Issue route retains its Issue execution binding.");
  if (!plan || plan.stale || plan.disposition !== "Approved" || !plan.structure || !plan.identity.planId) {
    throw Error("Execution requires a current approved non-Issue Work Plan.");
  }
  const planBytes = bytes(root, plan.relativePath);
  if (!planBytes) throw Error("Approved execution Plan is missing.");
  const document = parseCanonicalMarkdownDocument(planBytes);
  if (!isDeepStrictEqual(document.metadata.identity, plan.identity) || document.metadata.artifactRevision !== plan.artifactRevision ||
    document.metadata.documentDisposition.status !== "Approved" || document.bodyMarkdown !== plan.bodyMarkdown) throw Error("Execution Plan changed during activation.");
  const intake = readWorkIntake(root, intakeId);
  const branchBinding = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId: intake.branchBinding.repositoryId }).verify(intake.branchBinding);
  // Recheck bytes after asynchronous Git inspection; the final checks and write are synchronous.
  if (bytes(root, plan.relativePath) !== planBytes) throw Error("Execution Plan changed during branch verification.");
  assertCurrentSources(root, plan.relativePath);
  return { identity: { ...plan.identity, planId: plan.identity.planId }, planPath: plan.relativePath, planRevision: plan.artifactRevision,
    planDigest: digest(planBytes), branchBinding, structure: workPlanStructureFromBody(document.bodyMarkdown), planBody: document.bodyMarkdown };
}

function readBinding(root: string, intakeId: string, current: Awaited<ReturnType<typeof currentPlan>>): RoutedDevelopmentExecutionBinding | null {
  const relativePath = routedDevelopmentExecutionBindingPath(intakeId);
  const content = bytes(root, relativePath);
  if (content === null) return null;
  const { metadata } = parseCanonicalMarkdownDocument(content);
  const data = metadata.workflowData;
  if (metadata.artifactType !== "routed-development-execution-binding" || metadata.participationRole !== "contextOnly" ||
    metadata.documentDisposition.status !== "Approved" || !isDeepStrictEqual(metadata.identity, current.identity) ||
    !isDeepStrictEqual(metadata.sourceRevisions, [{ path: current.planPath, revision: current.planRevision }]) ||
    data.planDigest !== current.planDigest || !isDeepStrictEqual(data.structure, current.structure)) {
    throw Error("Existing execution binding is incompatible, stale, or superseded; it cannot be replaced silently.");
  }
  const branch = data.branchBinding as RoutedDevelopmentExecutionBinding["branchBinding"] | undefined;
  if (!branch || !/^[a-f0-9]{40,64}$/.test(branch.currentHead) ||
    branch.remote?.name !== current.branchBinding.remote?.name ||
    !isDeepStrictEqual({ ...branch, currentHead: current.branchBinding.currentHead, remote: current.branchBinding.remote },
      { ...current.branchBinding, remote: current.branchBinding.remote })) throw Error("Execution branch binding conflicts with the current Intake.");
  return { ...current, relativePath, artifactRevision: metadata.artifactRevision, branchBinding: branch };
}

export async function readRoutedDevelopmentExecutionBinding(root: string, intakeId: string): Promise<RoutedDevelopmentExecutionBinding | null> {
  const content = bytes(root, routedDevelopmentExecutionBindingPath(intakeId));
  if (content === null) return null;
  const current = await currentPlan(root, intakeId);
  const binding = readBinding(root, intakeId, current)!;
  const bindingBytes = bytes(root, binding.relativePath);
  // The frozen activation head must also belong to the application's verified checkpoint chain.
  await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId: binding.branchBinding.repositoryId }).verify(binding.branchBinding);
  if (bytes(root, binding.relativePath) !== bindingBytes) throw Error("Execution binding changed during branch verification.");
  if (digest(bytes(root, current.planPath)) !== current.planDigest) throw Error("Execution Plan changed while reading its binding.");
  assertCurrentSources(root, current.planPath);
  return readBinding(root, intakeId, current);
}

export async function activateRoutedDevelopmentExecutionBinding(root: string, intakeId: string): Promise<RoutedDevelopmentExecutionBinding> {
  const current = await currentPlan(root, intakeId);
  const existing = readBinding(root, intakeId, current);
  if (existing) return (await readRoutedDevelopmentExecutionBinding(root, intakeId))!;
  // Unrelated legacy Project Phases remain usable. Only competing execution for this Intake conflicts.
  const incompatible = listPlanningDocuments(root).some((document) => {
    const identity = document.metadata.canonical?.identity;
    return identity?.intakeId === intakeId && (document.markdownPath.startsWith("planning/phases/") ||
      document.metadata.artifactType === "issue-execution-plan" || document.metadata.artifactType === "routed-development-execution-binding");
  });
  if (incompatible) throw Error("Existing legacy or routed execution for this Intake cannot be replaced silently.");
  const relativePath = routedDevelopmentExecutionBindingPath(intakeId);
  writeCanonicalMarkdownDocumentOnce({ workspaceRoot: root, relativePath, metadata: {
    schemaVersion: 1, artifactType: "routed-development-execution-binding", artifactRevision: 1, participationRole: "contextOnly",
    identity: current.identity, sourceRevisions: [{ path: current.planPath, revision: current.planRevision }],
    workflowData: { planDigest: current.planDigest, branchBinding: current.branchBinding, structure: current.structure },
    documentDisposition: { status: "Approved", notes: "Execution binding derives from the current Operator-approved Work Plan.", reviewedAt: new Date().toISOString() },
  }, bodyMarkdown: `# Routed Development Execution\n\nApproved Plan: ${current.planPath}\nPlan revision: ${current.planRevision}\nTopology: ${current.structure.topology}\nWork branch: ${current.branchBinding.workBranch}\n\n${current.structure.workItems.map((item) => `- ${item.workItemId}${item.phaseId ? ` (Phase ${item.phaseId})` : ""}: ${item.title}`).join("\n")}\n` });
  return readBinding(root, intakeId, current)!;
}
