import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { SourceControlReceipt, SourceControlResult } from "../../shared/sourceControlContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";
import type { WorkItemCheckpointEvidence, WorkItemCheckpointResult } from "../../shared/workItemCheckpointContracts";
import { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { checkpointIdFor } from "./workItemCheckpointReceipt";

export interface WorkItemCheckpointContext {
  formalWorkCardPath: string; implementerReportPath: string; workCardId: string;
  rootFixCardId?: string; currentImplementationId?: string;
}
export interface WorkItemCheckpointCapture {
  binding: WorkIntakeBranchBinding; context: WorkItemCheckpointContext;
  contractSha256: string; reportBefore: string; governing: Record<string, string>;
  baseline: Record<string, string>; observed: Record<string, string>;
}
const locks = new Set<string>();
const digest = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
function file(root: string, relativePath: string) {
  if (typeof relativePath !== "string" || relativePath === "." || /(^|\/)(\.git|node_modules|dist|\.env(?:\..*)?)(\/|$)/i.test(relativePath)) throw Error("Checkpoint path is not an eligible source artifact.");
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Checkpoint paths must be exact repository-relative files.");
  return resolved.resolvedPath;
}
function snapshot(root: string, relativePath: string) {
  const target = file(root, relativePath);
  if (!fs.existsSync(target)) return "deleted";
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4_000_000) throw Error("Checkpoint file is not a bounded ordinary source file.");
  const bytes = fs.readFileSync(target);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b/.test(bytes.toString("utf8"))) throw Error("Checkpoint source contains credential-like material; no files were committed.");
  return digest(bytes);
}
function unwrap<T>(result: SourceControlResult<T>, receipts: SourceControlReceipt[] = []): T {
  receipts.push(result.receipt);
  if (!result.ok) throw Error(result.error.message);
  return result.result;
}
/** Traverse only the current contract's exact source graph, never unrelated workspace files. */
function governingEvidence(root: string, context: WorkItemCheckpointContext) {
  const governing: Record<string, string> = {}; const intakeIds = new Set<string>();
  function visit(relativePath: string, revision?: number) {
    if (Object.hasOwn(governing, relativePath)) return;
    if (Object.keys(governing).length >= 250) throw Error("Checkpoint evidence graph exceeds its bound.");
    governing[relativePath] = snapshot(root, relativePath);
    if (governing[relativePath] === "deleted") throw Error("Checkpoint governing evidence is missing.");
    const bytes = fs.readFileSync(file(root, relativePath), "utf8");
    let document;
    try { document = parseCanonicalMarkdownDocument(bytes); } catch {
      if (revision !== undefined && !(revision === 1 && /^issues\/ISSUE_\d+\/(ISSUE_RECORD|ARCHITECT_INVESTIGATION|ARCHITECT_REVIEW)\.md$/.test(relativePath) && bytes.startsWith("#"))) throw Error("Checkpoint canonical source is unreadable.");
      return;
    }
    if (document.metadata.participationRole === "historical" || revision !== undefined && revision !== document.metadata.artifactRevision) throw Error("Checkpoint governing evidence is stale.");
    if (typeof document.metadata.identity.intakeId === "string") intakeIds.add(document.metadata.identity.intakeId);
    for (const source of document.metadata.sourceRevisions) visit(source.path, source.revision);
    const sources = document.metadata.workflowData.sourceDigests;
    if (sources && typeof sources === "object") for (const [source, sha256] of Object.entries(sources)) {
      if (snapshot(root, source) !== sha256) throw Error("Checkpoint governing content changed.");
      visit(source);
    }
  }
  visit(context.formalWorkCardPath);
  return { governing, intakeIds };
}
/** Capture before the worker starts; absence of a routed Intake preserves legacy execution without inventing a branch. */
export async function captureWorkItemCheckpoint(root: string, context: WorkItemCheckpointContext): Promise<WorkItemCheckpointCapture | undefined> {
  if (!fs.existsSync(path.join(root, "planning", "work-intake", "PROJECT.md"))) return undefined;
  const { governing, intakeIds } = governingEvidence(root, context);
  if (!intakeIds.size) return undefined;
  if (intakeIds.size !== 1) throw Error("Checkpoint contract has ambiguous Work Intake ownership.");
  const intake = readWorkIntake(root, [...intakeIds][0]);
  const binding = await createWorkIntakeBranchService({ repositoryId: intake.branchBinding.repositoryId, repositoryRoot: root }).verify(intake.branchBinding);
  const contract = parseCanonicalMarkdownDocument(fs.readFileSync(file(root, context.formalWorkCardPath), "utf8"));
  if (contract.metadata.documentDisposition.status !== "Approved") throw Error("Checkpoint requires an approved implementation contract.");
  const sourceControl = createSourceControlService({ repositoryId: binding.repositoryId, repositoryRoot: root });
  const changes = unwrap(await sourceControl.changedFiles());
  if (changes.length > 500 || changes.some((entry) => entry.indexStatus !== " " && entry.indexStatus !== "?" || entry.originalPath)) throw Error("Checkpoint capture requires an empty index and unambiguous changed paths.");
  const baseline = Object.fromEntries(changes.map((entry) => [entry.path, snapshot(root, entry.path)]));
  return { binding, context: { ...context }, contractSha256: governing[context.formalWorkCardPath], reportBefore: snapshot(root, context.implementerReportPath), governing, baseline, observed: {} };
}
/** Only actual worker file-change events provide source attribution; report bytes are independently checked at completion. */
export function observeCheckpointChanges(root: string, capture: WorkItemCheckpointCapture, changes: unknown[]) {
  if (changes.length > 500) throw Error("Worker change evidence exceeds its bound.");
  for (const change of changes) {
    const entry = typeof change === "object" && change !== null ? change as Record<string, unknown> : {};
    const value = typeof change === "string" ? change : entry.path ?? entry.filePath ?? entry.targetPath ?? entry.relativePath;
    if (typeof value !== "string") throw Error("Worker change evidence has no exact file path.");
    const relativePath = path.isAbsolute(value) ? path.relative(root, value).split(path.sep).join("/") : value.replaceAll("\\", "/");
    capture.observed[relativePath] = snapshot(root, relativePath);
  }
}
/** Called only by the generic source-completion hook after a successful run and a current review-ready report. */
export async function checkpointWorkItemSource(root: string, capture: WorkItemCheckpointCapture, synchronize = false): Promise<WorkItemCheckpointResult> {
  const receipts: SourceControlReceipt[] = []; let staged = false; let commit: string | undefined; let receiptPath: string | undefined; let checkpointId: string | undefined;
  const lock = fs.realpathSync.native(root).toLowerCase();
  if (locks.has(lock)) return { status: "blocked", message: "Another source checkpoint is running in this repository.", remote: "not-requested", receipts };
  locks.add(lock);
  try {
    const { binding, context } = capture;
    const branch = createWorkIntakeBranchService({ repositoryId: binding.repositoryId, repositoryRoot: root });
    const sourceControl = createSourceControlService({ repositoryId: binding.repositoryId, repositoryRoot: root });
    const current = await branch.verify(binding);
    if (current.currentHead !== binding.currentHead) throw Error("Source baseline changed during implementation.");
    if (snapshot(root, context.formalWorkCardPath) !== capture.contractSha256) throw Error("Implementation contract changed during execution.");
    for (const [source, sha256] of Object.entries(capture.governing)) if (snapshot(root, source) !== sha256) throw Error("Governing evidence changed during implementation.");
    const reportSha256 = snapshot(root, context.implementerReportPath);
    const report = parseCanonicalMarkdownDocument(fs.readFileSync(file(root, context.implementerReportPath), "utf8"));
    if (reportSha256 === capture.reportBefore || reportSha256 === "deleted" || report.metadata.documentDisposition.status !== "Pending" || !report.bodyMarkdown.trim() ||
      !report.metadata.sourceRevisions.some((source) => source.path === context.formalWorkCardPath)) throw Error("A changed, current Pending implementation report is required for the source checkpoint.");
    const changes = unwrap(await sourceControl.changedFiles(), receipts);
    if (!changes.length || changes.length > 255 || changes.some((entry) => entry.indexStatus !== " " && entry.indexStatus !== "?" || entry.originalPath)) throw Error("Unexpected index or change-set state blocks checkpointing.");
    const files = changes.map((entry) => ({ path: entry.path, sha256: snapshot(root, entry.path) })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    for (const entry of files) {
      if (entry.path === context.implementerReportPath) continue;
      if (Object.hasOwn(capture.baseline, entry.path)) {
        if (capture.governing[entry.path] !== entry.sha256 || capture.baseline[entry.path] !== entry.sha256) throw Error("Pre-existing or unrelated changes block the Work Item checkpoint.");
      } else if (capture.observed[entry.path] !== entry.sha256) throw Error("Unattributed or subsequently changed files block the Work Item checkpoint.");
    }
    const evidence: WorkItemCheckpointEvidence = { intakeId: binding.intakeId, repositoryId: binding.repositoryId, workBranch: binding.workBranch, beforeHead: binding.currentHead,
      workItemId: context.rootFixCardId ?? context.workCardId, implementationId: context.currentImplementationId ?? context.workCardId,
      contractPath: context.formalWorkCardPath, contractSha256: capture.contractSha256, reportPath: context.implementerReportPath, reportSha256, files };
    checkpointId = checkpointIdFor(evidence);
    const receipt = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: "work-item-checkpoint", artifactRevision: 1, participationRole: "contextOnly",
      identity: { intakeId: binding.intakeId, workItemId: evidence.workItemId, implementationId: evidence.implementationId, checkpointId },
      sourceRevisions: [{ path: context.implementerReportPath, revision: report.metadata.artifactRevision }], workflowData: { evidence, resultingCommit: "containing-commit" },
      documentDisposition: { status: "Pending", notes: "Machine-owned source checkpoint; review and validation remain separate.", reviewedAt: null } },
      `# Work Item Source Checkpoint\n\nWork Item: ${evidence.workItemId}\nImplementation: ${evidence.implementationId}\nPrior source baseline: ${binding.currentHead}\n\nThe commit containing this receipt is the resulting source baseline.\nImplementation report: ${context.implementerReportPath}\nReport SHA-256: ${reportSha256}\n`);
    const message = `${evidence.workItemId}: source checkpoint ${checkpointId}\n\n${receipt}`;
    if (Buffer.byteLength(message, "utf8") > 20_000) throw Error("Checkpoint evidence exceeds the bounded commit receipt size.");
    const paths = files.map((entry) => entry.path);
    await branch.verify(binding);
    staged = true;
    unwrap(await sourceControl.stage(paths), receipts);
    const stagedChanges = unwrap(await sourceControl.changedFiles(), receipts);
    if (stagedChanges.length !== paths.length || stagedChanges.some((entry) => !paths.includes(entry.path) || entry.worktreeStatus !== " " || entry.indexStatus === "?")) throw Error("The staged change set differs from the attributed source set.");
    for (const entry of files) if (snapshot(root, entry.path) !== entry.sha256) throw Error("Source bytes changed while staging the checkpoint.");
    const diff = unwrap(await sourceControl.diff(), receipts);
    if (!diff.staged.trim() || diff.unstaged.trim()) throw Error("The exact staged source evidence is unavailable or changed.");
    await branch.verify(binding);
    if (snapshot(root, context.implementerReportPath) !== reportSha256) throw Error("Implementation report changed before the checkpoint.");
    const result = await sourceControl.commit(message);
    receipts.push(result.receipt);
    commit = result.ok ? result.result.commit : result.completedResult?.commit;
    if (!result.ok) throw Error(result.error.message);
    if (result.receipt.after?.branch !== binding.workBranch || result.receipt.after.commit !== commit) throw Error("Checkpoint commit requires source-state inspection.");
    let remote: WorkItemCheckpointResult["remote"] = "not-requested";
    if (synchronize && binding.remote) {
      const pushed = await sourceControl.push({ remote: binding.remote.name, branch: binding.workBranch }); receipts.push(pushed.receipt); remote = pushed.ok ? "synced" : "failed";
    }
    return { status: "committed", message: remote === "failed" ? "Local source checkpoint succeeded; optional remote synchronization failed." : "Source checkpoint committed; implementation review and validation remain separate.", checkpointId, receiptPath, commit, remote, receipts };
  } catch (error) {
    return { status: staged || commit ? "failed" : "blocked", message: error instanceof Error ? error.message : "Source checkpoint failed; inspect retained state.", checkpointId, receiptPath, commit, remote: "not-requested", receipts };
  } finally { locks.delete(lock); }
}
