import type { IntegrationValidationContext } from "../../shared/integrationPolicyContracts";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { IntegrationCandidateRecord, IntegrationValidationEvidence } from "../../shared/integrationCandidateContracts";
import type { IntegrationCompletionEvidence } from "../../shared/integrationCompletionContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";
import type { SourceControlResult } from "../../shared/sourceControlContracts";
import { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { integrationPaths } from "../agentHarness/repository/integrationGit";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { createIntegrationRepairController } from "./integrationRepairService";
import type { IntegrationRepairPolicy } from "../../shared/integrationRepairContracts";
import { assertIntegrationSourceText } from "../agentHarness/repository/integrationRepairGit";

/** Main-process adapters supply current durable completion evidence and the required validation policy, never renderer commands. */
export interface IntegrationValidationCheck {
  checkId: string;
  run: (candidateRoot: string, context: Readonly<IntegrationValidationContext>) => Promise<Omit<IntegrationValidationEvidence, "checkId">>;
}
export interface ResolvedIntegrationValidationPolicy {
  sha256: string;
  checks: IntegrationValidationCheck[];
  assertCandidate: (candidateRoot: string) => Promise<void>;
}
export interface IntegrationCandidateHooks {
  repositoryRoot: string;
  repositoryId: string;
  load: () => Promise<{ binding: WorkIntakeBranchBinding; completion: IntegrationCompletionEvidence }>;
  /** Direct application hooks remain available for WIR20/WIR21 fixtures; production supplies validationPolicy instead. */
  checks?: IntegrationValidationCheck[];
  validationPolicy?: { resolve: (targetCommit: string) => Promise<ResolvedIntegrationValidationPolicy> };
  repairPolicy?: (record: IntegrationCandidateRecord) => Promise<IntegrationRepairPolicy>;
}
const locks = new Set<string>();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
function validCompletion(value: IntegrationCompletionEvidence): boolean {
  return !!value && ["plan", "research"].includes(value.kind) && identifierPattern.test(value.routeDecisionId) && identifierPattern.test(value.completionId) &&
    Number.isSafeInteger(value.revision) && value.revision >= 1 && /^[a-f0-9]{64}$/.test(value.fingerprint) &&
    typeof value.sourcePath === "string" && value.sourcePath.length > 0 && value.sourcePath.length <= 500 && !value.sourcePath.includes("\\") &&
    !value.sourcePath.startsWith("/") && path.posix.normalize(value.sourcePath) === value.sourcePath && value.sourcePath !== "." && !value.sourcePath.split("/").includes("..");
}
function sameCompletion(left: IntegrationCompletionEvidence, right: IntegrationCompletionEvidence): boolean {
  return left.kind === right.kind && left.routeDecisionId === right.routeDecisionId && left.completionId === right.completionId && left.revision === right.revision &&
    left.fingerprint === right.fingerprint && left.sourcePath === right.sourcePath;
}
const completionIdentity = (completion: IntegrationCompletionEvidence) => [completion.kind, completion.routeDecisionId, completion.completionId, completion.revision, completion.fingerprint, completion.sourcePath];
export function createIntegrationCandidateService(hooks: IntegrationCandidateHooks) {
  const root = fs.realpathSync(hooks.repositoryRoot);
  const source = createSourceControlService({ repositoryRoot: root, repositoryId: hooks.repositoryId });
  const directChecks = (hooks.checks ?? []).map((check) => ({ ...check }));
  const validationPolicy = hooks.validationPolicy && { ...hooks.validationPolicy };
  if (validationPolicy && directChecks.length) throw Error("Integration validation must use either target policy or direct application checks, not both.");
  function assertChecks(checks: IntegrationValidationCheck[]) {
    if (!checks.length || checks.length > 32 || checks.some((check) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(check.checkId)) || new Set(checks.map((check) => check.checkId)).size !== checks.length) throw Error("Integration requires a bounded nonempty set of distinct application validation checks.");
  }
  if (!validationPolicy) assertChecks(directChecks);
  function unwrap<T>(result: SourceControlResult<T>, record?: IntegrationCandidateRecord): T {
    record?.receipts.push(result.receipt);
    if (!result.ok) throw Error(result.error.message);
    return result.result;
  }
  function persist(record: IntegrationCandidateRecord) {
    const paths = integrationPaths(root, record.candidateId);
    fs.mkdirSync(paths.base, { recursive: true });
    const text = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: "integration-candidate", artifactRevision: 1, participationRole: "contextOnly",
      identity: { candidateId: record.candidateId, intakeId: record.intakeId, completionId: record.completion.completionId, completionKind: record.completion.kind, repositoryId: record.repositoryId }, sourceRevisions: [], workflowData: { record },
      documentDisposition: { status: "Pending", notes: "Machine-owned integration evidence; product acceptance remains separate.", reviewedAt: null } },
    `# Integration Candidate\n\nStatus: ${record.status}\n\n${record.message}\n\nBase: ${record.baseCommit}\nIncoming: ${record.incomingCommit}\nTarget: ${record.targetCommit}\nCandidate: ${record.candidateCommit ?? "pending"}\n`);
    // Same-directory replacement keeps one canonical Markdown receipt and preserves a prior readable state on write failure.
    const temporary = `${paths.record}.tmp`;
    fs.writeFileSync(temporary, text, { flag: "wx" });
    fs.renameSync(temporary, paths.record);
  }
  function read(candidateId: string): IntegrationCandidateRecord {
    const paths = integrationPaths(root, candidateId);
    const stat = fs.lstatSync(paths.record);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_000_000) throw Error("Integration receipt is not a bounded ordinary document.");
    const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(paths.record, "utf8"));
    const record = parsed.metadata.workflowData.record as IntegrationCandidateRecord;
    if (parsed.metadata.artifactType !== "integration-candidate" || parsed.metadata.identity.candidateId !== candidateId || !record || record.candidateId !== candidateId || record.repositoryId !== hooks.repositoryId || record.candidateBranch !== paths.branch ||
      !Array.isArray(record.receipts) || !Array.isArray(record.validation) || !Array.isArray(record.requiredChecks) ||
      !validCompletion(record.completion) || parsed.metadata.identity.completionId !== record.completion.completionId || parsed.metadata.identity.completionKind !== record.completion.kind ||
      (record.validationPolicySha256 !== undefined && !/^[a-f0-9]{64}$/.test(record.validationPolicySha256)) ||
      digest(JSON.stringify([record.repositoryId, record.intakeId, ...completionIdentity(record.completion), record.baseCommit, record.incomingCommit, record.targetCommit, record.localTargetCommit, record.targetBranch, ...(record.validationPolicySha256 ? [record.validationPolicySha256] : [])])) !== candidateId) throw Error("Integration receipt identity is invalid.");
    return record;
  }
  async function exclusive<T>(action: () => Promise<T>) {
    if (locks.has(root)) throw Error("Integration is already changing this repository.");
    locks.add(root);
    try { return await action(); } finally { locks.delete(root); }
  }
  async function current(record?: IntegrationCandidateRecord) {
    if (record) await resolveValidation(record.targetCommit, record);
    const loaded = await hooks.load();
    if (loaded.binding.repositoryId !== hooks.repositoryId) throw Error("Completion evidence belongs to another repository.");
    const binding = await createWorkIntakeBranchService({ repositoryId: hooks.repositoryId, repositoryRoot: root }).verify(loaded.binding);
    if (!validCompletion(loaded.completion)) throw Error("Integration requires bounded current completion evidence.");
    if (record && (binding.intakeId !== record.intakeId || binding.currentHead !== record.incomingCommit || binding.workBranch !== record.incomingBranch || binding.baseBranch !== record.targetBranch || binding.baseCommit !== record.baseCommit ||
      !sameCompletion(loaded.completion, record.completion))) throw Error("Completion or Intake evidence changed; construct a fresh candidate.");
    if (!unwrap(await source.status(), record).clean) throw Error("Integration requires a clean incoming checkout.");
    return { binding, completion: loaded.completion };
  }
  async function resolveValidation(targetCommit: string, record?: IntegrationCandidateRecord) {
    if (!validationPolicy) {
      if (record?.validationPolicySha256 !== undefined) throw Error("Integration validation policy changed; construct a fresh candidate.");
      return { sha256: undefined, checks: directChecks, assertCandidate: async () => undefined };
    }
    const resolved = await validationPolicy.resolve(targetCommit);
    if (!resolved || !/^[a-f0-9]{64}$/.test(resolved.sha256) || typeof resolved.assertCandidate !== "function") throw Error("Integration validation policy identity is invalid.");
    assertChecks(resolved.checks);
    if (record && record.validationPolicySha256 !== resolved.sha256) throw Error("Integration validation policy changed; construct a fresh candidate.");
    return { ...resolved, checks: resolved.checks.map((check) => ({ ...check })) };
  }
  async function validate(record: IntegrationCandidateRecord) {
    const checkout = integrationPaths(root, record.candidateId).checkout;
    const resolved = await resolveValidation(record.targetCommit, record);
    await resolved.assertCandidate(checkout);
    const before = unwrap(await source.inspectIntegration(record.candidateId), record);
    if (!before.clean || before.conflictingPaths.length) throw Error("Integration validation requires a clean committed candidate.");
    record.candidateCommit = before.commit;
    record.validation = [];
    for (const check of resolved.checks) {
      try {
        const context = Object.freeze({ repositoryId: record.repositoryId, targetCommit: record.targetCommit, incomingCommit: record.incomingCommit,
          candidateCommit: before.commit, candidateId: record.candidateId, targetBranch: record.targetBranch, platform: process.platform });
        const proof = await check.run(integrationPaths(root, record.candidateId).checkout, context);
        // Retain bounded semantic failure detail from the trusted adapter, never raw process diagnostics.
        const passed = Number.isInteger(proof.exitCode) && proof.exitCode === 0;
        let summary = passed ? "Required check passed." : "Required check failed; inspect the configured validation adapter evidence.";
        if (typeof proof.summary === "string" && proof.summary.trim() && proof.summary.length <= 4000 && !/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp|var\/tmp)\/|CHAMPCITY-METADATA)/.test(proof.summary)) {
          assertIntegrationSourceText(proof.summary); summary = proof.summary.trim();
        }
        record.validation.push({ checkId: check.checkId, exitCode: Number.isInteger(proof.exitCode) ? proof.exitCode : null, summary, ...(proof.profileEvidence ? { profileEvidence: proof.profileEvidence } : {}) });
      } catch { record.validation.push({ checkId: check.checkId, exitCode: null, summary: "Required check could not complete." }); }
    }
    const after = unwrap(await source.inspectIntegration(record.candidateId), record);
    await resolved.assertCandidate(checkout);
    const passed = after.clean && after.commit === before.commit && record.validation.every((proof) => proof.exitCode === 0);
    record.status = passed ? "validated" : "validation-failed";
    record.message = passed ? "Candidate passed every required integration check; target has not advanced." : "Post-merge validation failed or changed candidate source; target remains unchanged.";
    persist(record);
    return record;
  }
  return {
    ...createIntegrationRepairController({ root, source, read, persist, current, validate, exclusive, policy: hooks.repairPolicy }),
    read,
    list: (intakeId: string) => {
      const directory = path.dirname(integrationPaths(root, "0".repeat(64)).base);
      if (!fs.existsSync(directory)) return [];
      const ids = fs.readdirSync(directory);
      if (ids.length > 128 || ids.some((id) => !/^[a-f0-9]{64}$/.test(id))) throw Error("Integration candidate inventory exceeds its bounded identity set.");
      return ids.map(read).filter((record) => record.intakeId === intakeId).sort((a, b) =>
        (b.receipts[0]?.startedAt ?? "").localeCompare(a.receipts[0]?.startedAt ?? "") || b.candidateId.localeCompare(a.candidateId));
    },
    retryValidation: (candidateId: string) => exclusive(async () => {
      const record = read(candidateId);
      if (!["failed", "validation-failed"].includes(record.status)) throw Error("Only a retained failed candidate may retry validation.");
      await current(record);
      return validate(record);
    }),
    create: () => exclusive(async () => {
      const { binding, completion } = await current();
      if (binding.remote) unwrap(await source.fetch(binding.remote.name));
      const refs = unwrap(await source.integrationTarget({ baseCommit: binding.baseCommit, incomingBranch: binding.workBranch, targetBranch: binding.baseBranch, remote: binding.remote?.name }));
      if (refs.incomingCommit !== binding.currentHead) throw Error("Incoming source changed before candidate creation.");
      const resolved = await resolveValidation(refs.targetCommit);
      const candidateId = digest(JSON.stringify([hooks.repositoryId, binding.intakeId, ...completionIdentity(completion), binding.baseCommit, refs.incomingCommit, refs.targetCommit, refs.localTargetCommit, binding.baseBranch, ...(resolved.sha256 ? [resolved.sha256] : [])]));
      const paths = integrationPaths(root, candidateId);
      if (fs.existsSync(paths.record)) throw Error("This exact candidate already has a receipt; inspect or abort it before creating another candidate.");
      const record: IntegrationCandidateRecord = { candidateId, repositoryId: hooks.repositoryId, intakeId: binding.intakeId, completion,
        baseCommit: binding.baseCommit, incomingBranch: binding.workBranch, targetBranch: binding.baseBranch, ...refs, candidateBranch: paths.branch, ...(binding.remote ? { remote: binding.remote.name } : {}),
        status: "constructing", conflictingPaths: [], validation: [], requiredChecks: resolved.checks.map((check) => check.checkId), ...(resolved.sha256 ? { validationPolicySha256: resolved.sha256 } : {}), remoteSync: "not-requested", message: "Constructing isolated integration candidate.", receipts: [] };
      persist(record);
      try {
        unwrap(await source.createIntegration({ candidateId, targetCommit: record.targetCommit }), record);
        const merged = unwrap(await source.mergeIntegration({ candidateId, incomingCommit: record.incomingCommit, targetCommit: record.targetCommit }), record);
        record.conflictingPaths = merged.conflictingPaths;
        record.candidateCommit = merged.commit;
        if (merged.conflictingPaths.length) {
          record.status = "conflicted"; record.message = "Mechanical merge conflicts require bounded Integration Repair; target remains unchanged.";
          persist(record); return record;
        }
        return await validate(record);
      } catch {
        record.status = "failed"; record.message = "Candidate operation failed; retained checkout and source-control receipts must be inspected before retry.";
        persist(record); return record;
      }
    }),
    advance: (candidateId: string, synchronize = false) => exclusive(async () => {
      const record = read(candidateId);
      const resolved = await resolveValidation(record.targetCommit, record);
      if (record.status !== "validated" || !record.candidateCommit || JSON.stringify(record.requiredChecks) !== JSON.stringify(resolved.checks.map((check) => check.checkId)) || record.validation.length !== resolved.checks.length || record.validation.some((proof, index) => proof.exitCode !== 0 || proof.checkId !== resolved.checks[index].checkId)) throw Error("Target advance requires a candidate with all current required checks passing.");
      await current(record);
      await resolved.assertCandidate(integrationPaths(root, record.candidateId).checkout);
      const result = await source.advanceIntegration({ candidateId, candidateCommit: record.candidateCommit, targetBranch: record.targetBranch, localTargetCommit: record.localTargetCommit, incomingBranch: record.incomingBranch, incomingCommit: record.incomingCommit });
      record.receipts.push(result.receipt);
      if (!result.ok && !result.completedResult) { record.status = "failed"; record.message = `${result.error.message} Target advancement was not confirmed; inspect refs before retry.`; persist(record); return record; }
      record.status = "integrated"; record.message = "Validated candidate advanced the local target. Publication remains separate.";
      persist(record);
      if (synchronize && record.remote) {
        const pushed = await source.push({ remote: record.remote, branch: record.targetBranch, expectedCommit: record.candidateCommit }); record.receipts.push(pushed.receipt);
        record.remoteSync = pushed.ok ? "synced" : "failed";
        record.message = pushed.ok ? "Validated target integrated and synchronized." : "Local integration succeeded; optional target synchronization failed.";
        persist(record);
      }
      return record;
    }),
    abort: (candidateId: string) => exclusive(async () => {
      const record = read(candidateId);
      unwrap(await source.abortIntegration(candidateId), record);
      if (record.status !== "integrated") record.status = "aborted";
      record.message = "Temporary candidate checkout and branch removed; incoming and target branches preserved. Receipt retained.";
      persist(record); return record;
    }),
  };
}
