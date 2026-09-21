import fs from "node:fs";
import { createHash } from "node:crypto";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { LifecycleEvidenceBoundary, LifecycleEvidenceCheckpointArtifact, LifecycleEvidenceCheckpointEvidence, LifecycleEvidenceCheckpointResult } from "../../shared/lifecycleEvidenceCheckpointContracts";
import type { SourceControlReceipt, SourceControlResult } from "../../shared/sourceControlContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { workItemArtifactScopeFromIdentity } from "../workCardLoop/workItemArtifactScope";
import { lifecycleCheckpointIdFor, lifecycleCheckpointSubject } from "./lifecycleEvidenceCheckpointReceipt";

export type LifecycleEvidenceCheckpointInput =
  | { binding: WorkIntakeBranchBinding; boundary: Extract<LifecycleEvidenceBoundary, { kind: "work-item" }>; artifacts: { contractPath: string; reportPath: string; validationPath: string; closePath: string }; synchronize?: boolean }
  | { binding: WorkIntakeBranchBinding; boundary: Extract<LifecycleEvidenceBoundary, { kind: "phase" | "plan" }>; artifacts: { closeoutPath: string }; synchronize?: boolean };

interface CanonicalArtifact extends LifecycleEvidenceCheckpointArtifact { metadata: CanonicalDocumentMetadata }
const locks = new Set<string>();
const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

function unwrap<T>(result: SourceControlResult<T>, receipts: SourceControlReceipt[]): T {
  receipts.push(result.receipt);
  if (!result.ok) throw Error(result.error.message);
  return result.result;
}

function artifact(root: string, relativePath: string): CanonicalArtifact {
  if (typeof relativePath !== "string" || !relativePath.endsWith(".md") || relativePath === "." ||
    /(^|\/)(?:\.git|node_modules|dist|build|out|release|coverage|\.env(?:\..*)?)(\/|$)/i.test(relativePath)) throw Error("Lifecycle checkpoint path is not eligible canonical evidence.");
  const resolved = resolveRepositoryPath(root, relativePath);
  if (resolved.relativePath !== relativePath) throw Error("Lifecycle checkpoint paths must be exact repository-relative files.");
  const stat = fs.lstatSync(resolved.resolvedPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4_000_000) throw Error("Lifecycle checkpoint evidence must be a bounded ordinary Markdown file.");
  const bytes = fs.readFileSync(resolved.resolvedPath);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b/.test(bytes.toString("utf8"))) throw Error("Lifecycle checkpoint evidence contains credential-like material; no files were committed.");
  const document = parseCanonicalMarkdownDocument(bytes.toString("utf8"));
  if (document.metadata.participationRole === "historical") throw Error("Historical documents are not lifecycle checkpoint evidence.");
  return { path: relativePath, sha256: sha(bytes), artifactType: document.metadata.artifactType, artifactRevision: document.metadata.artifactRevision, metadata: document.metadata };
}

function hasSource(document: CanonicalArtifact, relativePath: string): boolean {
  return document.metadata.sourceRevisions.some((source) => source.path === relativePath);
}

function assertRoutedScope(identity: Record<string, unknown>, binding: WorkIntakeBranchBinding, boundary: Extract<LifecycleEvidenceBoundary, { kind: "work-item" }>) {
  const scope = workItemArtifactScopeFromIdentity(identity);
  const expectedKind = boundary.phaseId ? "routed-phase" : "routed-direct-plan";
  if (scope.kind !== expectedKind || scope.intakeId !== binding.intakeId || scope.planId !== boundary.planId ||
    scope.routeDecisionId !== boundary.routeDecisionId || (scope.kind === "routed-phase" && scope.phaseId !== boundary.phaseId)) {
    throw Error("Lifecycle evidence has ambiguous or cross-Intake Work Item scope.");
  }
}

function workItemArtifacts(root: string, input: Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "work-item" } }>): CanonicalArtifact[] {
  const { boundary, binding } = input;
  const contract = artifact(root, input.artifacts.contractPath);
  const report = artifact(root, input.artifacts.reportPath);
  const validation = artifact(root, input.artifacts.validationPath);
  const close = artifact(root, input.artifacts.closePath);
  const artifacts = [contract, report, validation, close];
  if (new Set(artifacts.map((entry) => entry.path)).size !== artifacts.length) throw Error("Lifecycle checkpoint artifact roles must resolve to distinct files.");
  for (const entry of artifacts) {
    if (entry.metadata.identity.intakeId !== binding.intakeId || entry.metadata.identity.planId !== boundary.planId) throw Error("Lifecycle evidence belongs to a different Intake or Plan.");
    assertRoutedScope(entry.metadata.identity, binding, boundary);
  }
  if (!['formal-work-card', 'repair-work-card'].includes(contract.artifactType) || contract.metadata.identity.workCardId !== boundary.implementationId || contract.metadata.documentDisposition.status !== "Approved") throw Error("Lifecycle checkpoint requires the exact approved implementation contract.");
  if (report.artifactType !== "implementer-report" || report.metadata.identity.workCardId !== boundary.implementationId || !hasSource(report, contract.path)) throw Error("Lifecycle checkpoint requires the current implementation report and contract lineage.");
  if (validation.artifactType !== "validation-record" || validation.metadata.identity.workCardId !== boundary.implementationId || validation.metadata.documentDisposition.status !== "Approved" || !hasSource(validation, report.path)) throw Error("Lifecycle checkpoint requires the exact current approved validation record.");
  if (close.artifactType !== "work-card-close-return-record" || close.metadata.identity.workCardId !== boundary.workItemId ||
    close.metadata.identity.parentWorkCardId !== boundary.workItemId || close.metadata.identity.executionWorkCardId !== boundary.implementationId ||
    close.metadata.documentDisposition.status !== "Approved" || close.metadata.workflowData.transition !== "close-return-consumed" || !hasSource(close, validation.path)) {
    throw Error("Lifecycle checkpoint requires the exact current Work Item close-return evidence.");
  }
  return artifacts;
}

function acceptanceArtifacts(root: string, input: Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "phase" | "plan" } }>): CanonicalArtifact[] {
  const closeout = artifact(root, input.artifacts.closeoutPath);
  const { boundary, binding } = input;
  const identity = closeout.metadata.identity;
  if (closeout.artifactType !== `${boundary.kind}-closeout` || closeout.metadata.participationRole !== "compoundGatingReview" ||
    closeout.metadata.documentDisposition.status !== "Approved" || closeout.metadata.workflowData.closureDecision !== "Close" ||
    closeout.metadata.workflowData.planRevision !== boundary.planRevision || identity.intakeId !== binding.intakeId || identity.planId !== boundary.planId ||
    identity.routeDecisionId !== boundary.routeDecisionId || identity.executionBoundary !== boundary.kind ||
    (boundary.kind === "phase" ? identity.phaseId !== boundary.phaseId : identity.phaseId !== undefined)) {
    throw Error("Lifecycle checkpoint requires the exact current approved acceptance closeout.");
  }
  return [closeout];
}

function validatedArtifacts(root: string, input: LifecycleEvidenceCheckpointInput): CanonicalArtifact[] {
  if (input.boundary.planRevision < 1 || !Number.isSafeInteger(input.boundary.planRevision)) throw Error("Lifecycle checkpoint requires an exact positive Plan revision.");
  return input.boundary.kind === "work-item"
    ? workItemArtifacts(root, input as Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "work-item" } }>)
    : acceptanceArtifacts(root, input as Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "phase" | "plan" } }>);
}

/** Commit only the exact canonical evidence that establishes one successful execution boundary. */
export async function checkpointLifecycleEvidence(root: string, input: LifecycleEvidenceCheckpointInput): Promise<LifecycleEvidenceCheckpointResult> {
  const receipts: SourceControlReceipt[] = [];
  let staged = false;
  let commit: string | undefined;
  let checkpointId: string | undefined;
  const lock = fs.realpathSync.native(root).toLowerCase();
  if (locks.has(lock)) return { status: "blocked", message: "Another lifecycle-evidence checkpoint is running in this repository.", remote: "not-requested", receipts };
  locks.add(lock);
  try {
    const { binding } = input;
    const branch = createWorkIntakeBranchService({ repositoryId: binding.repositoryId, repositoryRoot: root });
    const source = createSourceControlService({ repositoryId: binding.repositoryId, repositoryRoot: root });
    const current = await branch.verify(binding);
    const candidates = validatedArtifacts(root, input).sort((a, b) => a.path.localeCompare(b.path));
    const candidatePaths = candidates.map((entry) => entry.path);
    const before = unwrap(await source.changedFiles(), receipts);
    if (before.length > 500 || before.some((entry) => entry.originalPath || entry.indexStatus !== " " && entry.indexStatus !== "?" || !candidatePaths.includes(entry.path))) {
      throw Error("Unrelated, ambiguous, or unexpectedly staged repository changes block the lifecycle checkpoint.");
    }
    staged = true;
    unwrap(await source.stage(candidatePaths, { includeIgnored: true }), receipts);
    const changes = unwrap(await source.changedFiles(), receipts);
    const unexpected = changes.filter((entry) => entry.originalPath || !candidatePaths.includes(entry.path) || entry.worktreeStatus !== " " || entry.indexStatus === "?" || entry.indexStatus === " ");
    if (unexpected.length) {
      const summary = unexpected.slice(0, 8).map((entry) => `${entry.indexStatus}${entry.worktreeStatus} ${entry.path}`).join(", ");
      throw Error(`The staged change set differs from the attributable canonical lifecycle evidence: ${summary}.`);
    }
    if (!changes.length) return { status: "not-applicable", message: "Lifecycle evidence is already durable at the verified Work Intake head.", remote: "not-requested", receipts };
    const byPath = new Map(candidates.map((entry) => [entry.path, entry]));
    const files = changes.map((entry) => {
      const expected = byPath.get(entry.path)!;
      const currentArtifact = artifact(root, entry.path);
      if (currentArtifact.sha256 !== expected.sha256 || currentArtifact.artifactType !== expected.artifactType || currentArtifact.artifactRevision !== expected.artifactRevision) throw Error("Lifecycle evidence changed while staging the checkpoint.");
      return { path: expected.path, sha256: expected.sha256, artifactType: expected.artifactType, artifactRevision: expected.artifactRevision };
    }).sort((a, b) => a.path.localeCompare(b.path));
    const diff = unwrap(await source.diff(), receipts);
    if (!diff.staged.trim() || diff.unstaged.trim()) throw Error("The exact staged lifecycle evidence is unavailable or changed.");
    const evidence: LifecycleEvidenceCheckpointEvidence = { intakeId: binding.intakeId, repositoryId: binding.repositoryId, workBranch: binding.workBranch,
      beforeHead: current.currentHead, boundary: input.boundary, files };
    checkpointId = lifecycleCheckpointIdFor(evidence);
    const receipt = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: "lifecycle-evidence-checkpoint", artifactRevision: 1, participationRole: "contextOnly",
      identity: { intakeId: binding.intakeId, boundaryKind: input.boundary.kind, checkpointId },
      sourceRevisions: files.map((entry) => ({ path: entry.path, revision: entry.artifactRevision })), workflowData: { evidence, resultingCommit: "containing-commit" },
      documentDisposition: { status: "Approved", notes: "Machine-owned canonical lifecycle-evidence checkpoint.", reviewedAt: null } },
      `# Lifecycle Evidence Checkpoint\n\nBoundary: ${input.boundary.kind}\nPrior source baseline: ${current.currentHead}\n\nThe containing commit is the resulting lifecycle-evidence baseline.\n` + files.map((entry) => `- ${entry.path}: ${entry.sha256}`).join("\n") + "\n");
    const message = `${lifecycleCheckpointSubject(input.boundary, checkpointId)}\n\n${receipt}`;
    if (Buffer.byteLength(message, "utf8") > 30_000) throw Error("Lifecycle checkpoint receipt exceeds its bounded commit-message size.");
    const reverified = await branch.verify(binding);
    if (reverified.currentHead !== current.currentHead) throw Error("Work Intake head changed while preparing lifecycle evidence.");
    const committed = await source.commit(message);
    receipts.push(committed.receipt);
    commit = committed.ok ? committed.result.commit : committed.completedResult?.commit;
    if (!committed.ok) throw Error(committed.error.message);
    if (committed.receipt.after?.branch !== binding.workBranch || committed.receipt.after.commit !== commit) throw Error("Lifecycle checkpoint commit requires source-state inspection.");
    const verified = await branch.verify(binding);
    if (verified.currentHead !== commit) throw Error("Lifecycle checkpoint did not become the verified Work Intake head.");
    let remote: LifecycleEvidenceCheckpointResult["remote"] = "not-requested";
    if (input.synchronize && binding.remote) {
      const pushed = await source.push({ remote: binding.remote.name, branch: binding.workBranch, expectedCommit: commit });
      receipts.push(pushed.receipt);
      remote = pushed.ok ? "synced" : "failed";
    }
    return { status: "committed", message: remote === "failed" ? "Local lifecycle-evidence checkpoint succeeded; optional remote synchronization failed." : "Lifecycle evidence committed at the successful execution boundary.", checkpointId, commit, remote, receipts };
  } catch (error) {
    return { status: staged || commit ? "failed" : "blocked", message: error instanceof Error ? error.message : "Lifecycle-evidence checkpoint failed; inspect retained state.", checkpointId, commit, remote: "not-requested", receipts };
  } finally { locks.delete(lock); }
}
