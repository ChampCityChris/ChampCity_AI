import fs from "node:fs";
import { createHash } from "node:crypto";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { LifecycleEvidenceBoundary, LifecycleEvidenceCheckpointArtifact, LifecycleEvidenceCheckpointEvidence, LifecycleEvidenceCheckpointResult } from "../../shared/lifecycleEvidenceCheckpointContracts";
import type { SourceControlReceipt, SourceControlResult } from "../../shared/sourceControlContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";
import { resolveRepositoryPath } from "../repository/pathPolicy";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { getWorkRouteDecision } from "../workIntake/workRouteDecisionService";
import { workItemArtifactScopeFromIdentity } from "../workCardLoop/workItemArtifactScope";
import { readApplicationCheckpointReceipt } from "./applicationCheckpointReceipt";
import { lifecycleCheckpointIdFor, lifecycleCheckpointSubject } from "./lifecycleEvidenceCheckpointReceipt";

export type LifecycleEvidenceCheckpointInput =
  | { binding: WorkIntakeBranchBinding; boundary: Extract<LifecycleEvidenceBoundary, { kind: "work-item" }>; artifacts: { contractPath: string; reportPath: string; validationPath: string; closePath: string }; synchronize?: boolean }
  | { binding: WorkIntakeBranchBinding; boundary: Extract<LifecycleEvidenceBoundary, { kind: "phase" | "plan" }>; artifacts: { closeoutPath: string }; synchronize?: boolean }
  | { binding: WorkIntakeBranchBinding; boundary: Extract<LifecycleEvidenceBoundary, { kind: "research" }>; artifacts: { assessmentPath: string; routeDecisionPath: string }; synchronize?: boolean }
  | { binding: WorkIntakeBranchBinding; boundary: Extract<LifecycleEvidenceBoundary, { kind: "operator-disposition" }>; artifacts: { paths: string[] }; synchronize?: boolean };

interface CanonicalArtifact extends LifecycleEvidenceCheckpointArtifact { metadata: CanonicalDocumentMetadata }
const locks = new Set<string>();
const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");

function unwrap<T>(result: SourceControlResult<T>, receipts: SourceControlReceipt[]): T {
  receipts.push(result.receipt);
  if (!result.ok) throw Error(result.error.message);
  return result.result;
}

function artifact(root: string, relativePath: string, allowHistorical = false): CanonicalArtifact {
  if (typeof relativePath !== "string" || !relativePath.endsWith(".md") || relativePath === "." ||
    /(^|\/)(?:\.git|node_modules|dist|build|out|release|coverage|\.env(?:\..*)?)(\/|$)/i.test(relativePath)) throw Error("Lifecycle checkpoint path is not eligible canonical evidence.");
  const resolved = resolveRepositoryPath(root, relativePath);
  if (resolved.relativePath !== relativePath) throw Error("Lifecycle checkpoint paths must be exact repository-relative files.");
  const stat = fs.lstatSync(resolved.resolvedPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4_000_000) throw Error("Lifecycle checkpoint evidence must be a bounded ordinary Markdown file.");
  const bytes = fs.readFileSync(resolved.resolvedPath);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b/.test(bytes.toString("utf8"))) throw Error("Lifecycle checkpoint evidence contains credential-like material; no files were committed.");
  const document = parseCanonicalMarkdownDocument(bytes.toString("utf8"));
  if (!allowHistorical && document.metadata.participationRole === "historical") throw Error("Historical documents are not lifecycle checkpoint evidence.");
  return { path: relativePath, sha256: sha(bytes), artifactType: document.metadata.artifactType, artifactRevision: document.metadata.artifactRevision, metadata: document.metadata };
}

function dispositionArtifact(root: string, relativePath: string, binding: WorkIntakeBranchBinding,
  issueId?: string): CanonicalArtifact {
  if (!relativePath.startsWith("issues/")) return artifact(root, relativePath, true);
  const issuePrefix = issueId && /^ISSUE_\d+$/.test(issueId) ? `issues/${issueId}/` : "";
  const issueLeaf = issuePrefix && relativePath.startsWith(issuePrefix) ? relativePath.slice(issuePrefix.length) : "";
  const rootEvidence = /^(?:ISSUE_RECORD|ARCHITECT_INVESTIGATION|ARCHITECT_REVIEW|ISSUE_RESOLUTION_PLAN|FIX_CARD_PLAN|ISSUE_PLANNING_REVIEW|EXECUTION_PLAN)\.md$/.test(issueLeaf);
  const ownedEvidence = /^(?:Fix_Cards|Repairs|Implementer_Reports|Architect_Reviews|Close_Records|Phase_Acceptance|Validation_Records|Issue_Planning_History|Architect_History)\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.md$/.test(issueLeaf);
  if (!issuePrefix || !(rootEvidence || ownedEvidence))
    throw Error("Issue disposition path is outside the exact routed Issue evidence.");
  const resolved = resolveRepositoryPath(root, relativePath);
  if (resolved.relativePath !== relativePath) throw Error("Issue evidence path must be exact and repository-relative.");
  const stat = fs.lstatSync(resolved.resolvedPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4_000_000) throw Error("Issue evidence must be a bounded ordinary Markdown file.");
  const bytes = fs.readFileSync(resolved.resolvedPath);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b/.test(bytes.toString("utf8")))
    throw Error("Issue evidence contains credential-like material; no files were committed.");
  return { path: relativePath, sha256: sha(bytes), artifactType: "issue-evidence", artifactRevision: 1,
    metadata: { schemaVersion: 1, artifactType: "issue-evidence", artifactRevision: 1, participationRole: "contextOnly",
      identity: { intakeId: binding.intakeId, issueId }, sourceRevisions: [], workflowData: {},
      documentDisposition: { status: "Pending", notes: "", reviewedAt: null } } };
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

async function researchArtifacts(root: string, input: Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "research" } }>): Promise<CanonicalArtifact[]> {
  const { binding, boundary } = input;
  const intake = readWorkIntake(root, binding.intakeId);
  const route = await getWorkRouteDecision(root, binding.intakeId);
  if (route.state !== "selected" || route.selection?.selectedRouteId !== "research-prototype" || route.selection.decisionId !== boundary.routeDecisionId ||
    route.relativePath !== input.artifacts.routeDecisionPath) throw Error("Research lifecycle checkpoint requires the exact current Research route.");
  const assessment = artifact(root, input.artifacts.assessmentPath);
  const identity = assessment.metadata.identity;
  const outcome = assessment.metadata.workflowData.researchOutcome as Record<string, unknown> | undefined;
  if (assessment.artifactType !== "work-planning-assessment" || assessment.artifactRevision !== boundary.assessmentRevision ||
    assessment.metadata.documentDisposition.status !== "Approved" || identity.intakeId !== binding.intakeId ||
    identity.routeDecisionId !== boundary.routeDecisionId || identity.routeId !== "research-prototype" || identity.assessmentId !== boundary.assessmentId ||
    outcome?.outcome !== "no-implementation-plan-required") throw Error("Research lifecycle checkpoint requires the exact approved no-Plan Assessment.");

  const routeSourcePath = route.selection.sourceAssessment.path;
  const rootPaths = [intake.relativePath, input.artifacts.routeDecisionPath, routeSourcePath, input.artifacts.assessmentPath];
  const collected = new Map<string, CanonicalArtifact>();
  const queue = [...new Set(rootPaths)];
  while (queue.length) {
    const relativePath = queue.shift()!;
    if (collected.has(relativePath)) continue;
    if (collected.size >= 20) throw Error("Research lifecycle checkpoint source graph exceeds its 20-file bound.");
    const current = artifact(root, relativePath);
    if (current.metadata.identity.intakeId !== undefined && current.metadata.identity.intakeId !== binding.intakeId) {
      throw Error("Research lifecycle checkpoint evidence belongs to a different Intake.");
    }
    collected.set(relativePath, current);
    for (const source of current.metadata.sourceRevisions) {
      const ancestor = artifact(root, source.path);
      const routeProvenance = relativePath === assessment.path && source.path === input.artifacts.routeDecisionPath;
      if (ancestor.artifactRevision !== source.revision && !routeProvenance) throw Error("Research lifecycle checkpoint source evidence is stale.");
      if (routeProvenance && (route.selection.decisionId !== identity.routeDecisionId || route.selection.selectedRouteId !== identity.routeId)) {
        throw Error("Research route provenance no longer matches the approved Assessment.");
      }
      queue.push(source.path);
    }
  }
  for (const required of rootPaths) if (!collected.has(required)) throw Error("Research lifecycle checkpoint source graph is incomplete.");
  return [...collected.values()];
}

async function validatedArtifacts(root: string, input: LifecycleEvidenceCheckpointInput): Promise<CanonicalArtifact[]> {
  if (input.boundary.kind === "operator-disposition") {
    const paths = (input as Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "operator-disposition" } }>).artifacts.paths;
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > 100 || new Set(paths).size !== paths.length)
      throw Error("Operator disposition requires bounded distinct changed artifacts.");
    const issueId = (input.boundary as Extract<LifecycleEvidenceBoundary, { kind: "operator-disposition" }>).issueId;
    const artifacts = paths.map(relativePath => dispositionArtifact(root, relativePath, input.binding, issueId));
    if (artifacts.some(item => item.metadata.identity.intakeId !== input.binding.intakeId &&
      !(item.path === "planning/work-intake/PROJECT.md" && item.artifactType === "work-project")))
      throw Error("Operator disposition artifact belongs to another Work Intake.");
    return artifacts;
  }
  if (input.boundary.kind === "research") {
    if (input.boundary.assessmentRevision < 1 || !Number.isSafeInteger(input.boundary.assessmentRevision)) throw Error("Lifecycle checkpoint requires an exact positive Assessment revision.");
    return researchArtifacts(root, input as Extract<LifecycleEvidenceCheckpointInput, { boundary: { kind: "research" } }>);
  }
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
    const selected = unwrap(await source.branches(binding.workBranch), receipts);
    if (selected.currentBranch !== binding.workBranch || selected.head !== current.currentHead)
      throw Error("Select the exact Work Intake source checkout before lifecycle checkpointing.");
    const candidates = (await validatedArtifacts(root, input)).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const candidatePaths = candidates.map((entry) => entry.path);
    const before = unwrap(await source.changedFiles(), receipts);
    const isDraft = (relativePath: string) => input.boundary.kind === "operator-disposition" && !candidatePaths.includes(relativePath) &&
      (relativePath.startsWith("planning/Architect_Drafts/") || /\/Decompositions\/[^/]+\.md$/.test(relativePath));
    const preflightConflicts = before.filter((entry) => !isDraft(entry.path) &&
      (entry.originalPath || entry.indexStatus !== " " && entry.indexStatus !== "?" || !candidatePaths.includes(entry.path)));
    if (before.length > 500 || preflightConflicts.length) throw Error(`Unrelated, ambiguous, or unexpectedly staged repository changes block the lifecycle checkpoint: ${preflightConflicts.slice(0, 8).map(entry => entry.path).join(", ")}.`);
    staged = true;
    unwrap(await source.stage(candidatePaths, { includeIgnored: true }), receipts);
    const changes = unwrap(await source.changedFiles(), receipts);
    const unexpected = changes.filter((entry) => !isDraft(entry.path) &&
      (entry.originalPath || !candidatePaths.includes(entry.path) || entry.worktreeStatus !== " " || entry.indexStatus === "?" || entry.indexStatus === " "));
    if (unexpected.length) {
      const summary = unexpected.slice(0, 8).map((entry) => `${entry.indexStatus}${entry.worktreeStatus} ${entry.path}`).join(", ");
      throw Error(`The staged change set differs from the attributable canonical lifecycle evidence: ${summary}.`);
    }
    const stagedChanges = changes.filter(entry => !isDraft(entry.path));
    let emptyLifecycle = false;
    if (!stagedChanges.length) {
      const head = unwrap(await source.inspectCommit({ ref: current.currentHead }), receipts);
      const subject = head.message.split(/\r?\n/, 1)[0];
      try {
        const prior = readApplicationCheckpointReceipt(subject, head.message);
        if (prior.kind === "lifecycle" && prior.evidence.intakeId === binding.intakeId &&
          JSON.stringify(prior.evidence.boundary) === JSON.stringify(input.boundary))
          return { status: "committed", message: "Lifecycle evidence already has the exact durable checkpoint.",
            checkpointId: prior.checkpointId, commit: head.commit, remote: "not-requested", receipts };
      } catch { /* Another commit may be current; no new source mutation is required. */ }
      if (["research", "phase", "plan"].includes(input.boundary.kind)) emptyLifecycle = true;
      else if (input.boundary.kind === "operator-disposition")
        return { status: "blocked", message: "Operator disposition has no attributable source change or matching checkpoint at the verified head.", remote: "not-requested", receipts };
      else return { status: "not-applicable", message: "Lifecycle evidence is already durable at the verified Work Intake head.", remote: "not-requested", receipts };
    }
    const byPath = new Map(candidates.map((entry) => [entry.path, entry]));
    const files = stagedChanges.map((entry) => {
      const expected = byPath.get(entry.path)!;
      const currentArtifact = input.boundary.kind === "operator-disposition"
        ? dispositionArtifact(root, entry.path, input.binding, input.boundary.issueId) : artifact(root, entry.path);
      if (currentArtifact.sha256 !== expected.sha256 || currentArtifact.artifactType !== expected.artifactType || currentArtifact.artifactRevision !== expected.artifactRevision) throw Error("Lifecycle evidence changed while staging the checkpoint.");
      return { path: expected.path, sha256: expected.sha256, artifactType: expected.artifactType, artifactRevision: expected.artifactRevision };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const diff = unwrap(await source.diff(), receipts);
    if ((emptyLifecycle ? !!diff.staged.trim() : !diff.staged.trim()) || diff.unstaged.trim())
      throw Error("The exact staged lifecycle evidence is unavailable or changed.");
    const evidence: LifecycleEvidenceCheckpointEvidence = { intakeId: binding.intakeId, repositoryId: binding.repositoryId, workBranch: binding.workBranch,
      beforeHead: current.currentHead, boundary: input.boundary, files,
      ...(emptyLifecycle ? { emptyLifecycleCheckpoint: true } : {}) };
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
    const committed = await source.checkpointCommit(message, current.currentHead, emptyLifecycle);
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
