import fs from "node:fs";
import { createHash } from "node:crypto";
import type { IntegrationCandidateRecord, IntegrationValidationEvidence } from "../../shared/integrationCandidateContracts";
import type { PlanExecutionInput } from "../../shared/planExecutionContracts";
import type { WorkIntakeBranchBinding } from "../../shared/workIntakeBranchContracts";
import type { SourceControlResult } from "../../shared/sourceControlContracts";
import { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { integrationPaths } from "../agentHarness/repository/integrationGit";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { projectPlanExecution } from "./planExecutor";

/** Main-process adapters supply current durable Plan evidence and the required validation policy, never renderer commands. */
export interface IntegrationCandidateHooks {
  repositoryRoot: string;
  repositoryId: string;
  load: () => Promise<{ binding: WorkIntakeBranchBinding; plan: PlanExecutionInput }>;
  checks: Array<{ checkId: string; run: (candidateRoot: string) => Promise<Omit<IntegrationValidationEvidence, "checkId">> }>;
}
const locks = new Set<string>();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function createIntegrationCandidateService(hooks: IntegrationCandidateHooks) {
  const root = fs.realpathSync(hooks.repositoryRoot);
  const source = createSourceControlService({ repositoryRoot: root, repositoryId: hooks.repositoryId });
  const checks = [...hooks.checks];
  if (!checks.length || checks.length > 32 || checks.some((check) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(check.checkId)) || new Set(checks.map((check) => check.checkId)).size !== checks.length) throw Error("Integration requires a bounded nonempty set of distinct application validation checks.");
  function unwrap<T>(result: SourceControlResult<T>, record?: IntegrationCandidateRecord): T {
    record?.receipts.push(result.receipt);
    if (!result.ok) throw Error(result.error.message);
    return result.result;
  }
  function persist(record: IntegrationCandidateRecord) {
    const paths = integrationPaths(root, record.candidateId);
    fs.mkdirSync(paths.base, { recursive: true });
    const text = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: "integration-candidate", artifactRevision: 1, participationRole: "contextOnly",
      identity: { candidateId: record.candidateId, intakeId: record.intakeId, planId: record.planId, repositoryId: record.repositoryId }, sourceRevisions: [], workflowData: { record },
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
      digest(JSON.stringify([record.repositoryId, record.intakeId, record.planId, record.planRevision, record.planFingerprint, record.baseCommit, record.incomingCommit, record.targetCommit, record.localTargetCommit, record.targetBranch])) !== candidateId) throw Error("Integration receipt identity is invalid.");
    return record;
  }
  async function exclusive<T>(action: () => Promise<T>) {
    if (locks.has(root)) throw Error("Integration is already changing this repository.");
    locks.add(root);
    try { return await action(); } finally { locks.delete(root); }
  }
  async function current(record?: IntegrationCandidateRecord) {
    const loaded = await hooks.load();
    if (loaded.binding.repositoryId !== hooks.repositoryId) throw Error("Plan completion belongs to another repository.");
    const binding = await createWorkIntakeBranchService({ repositoryId: hooks.repositoryId, repositoryRoot: root }).verify(loaded.binding);
    const plan = projectPlanExecution(loaded.plan);
    if (!plan.complete) throw Error("Integration requires current Plan completion, including all required criteria.");
    if (record && (binding.intakeId !== record.intakeId || binding.currentHead !== record.incomingCommit || binding.workBranch !== record.incomingBranch || binding.baseBranch !== record.targetBranch || binding.baseCommit !== record.baseCommit ||
      plan.planId !== record.planId || plan.planRevision !== record.planRevision || plan.fingerprint !== record.planFingerprint)) throw Error("Plan or Intake evidence changed; construct a fresh candidate.");
    if (!unwrap(await source.status(), record).clean) throw Error("Integration requires a clean incoming checkout.");
    return { binding, plan };
  }
  async function validate(record: IntegrationCandidateRecord) {
    const before = unwrap(await source.inspectIntegration(record.candidateId), record);
    if (!before.clean || before.conflictingPaths.length) throw Error("Integration validation requires a clean committed candidate.");
    record.candidateCommit = before.commit;
    record.validation = [];
    for (const check of checks) {
      try {
        const proof = await check.run(integrationPaths(root, record.candidateId).checkout);
        // Persist controlled summaries only; adapter output must not expose machine paths or credentials.
        const passed = Number.isInteger(proof.exitCode) && proof.exitCode === 0;
        record.validation.push({ checkId: check.checkId, exitCode: Number.isInteger(proof.exitCode) ? proof.exitCode : null, summary: passed ? "Required check passed." : "Required check failed; inspect the configured validation adapter evidence." });
      } catch { record.validation.push({ checkId: check.checkId, exitCode: null, summary: "Required check could not complete." }); }
    }
    const after = unwrap(await source.inspectIntegration(record.candidateId), record);
    const passed = after.clean && after.commit === before.commit && record.validation.every((proof) => proof.exitCode === 0);
    record.status = passed ? "validated" : "validation-failed";
    record.message = passed ? "Candidate passed every required integration check; target has not advanced." : "Post-merge validation failed or changed candidate source; target remains unchanged.";
    persist(record);
    return record;
  }
  return {
    read,
    create: () => exclusive(async () => {
      const { binding, plan } = await current();
      if (binding.remote) unwrap(await source.fetch(binding.remote.name));
      const refs = unwrap(await source.integrationTarget({ baseCommit: binding.baseCommit, incomingBranch: binding.workBranch, targetBranch: binding.baseBranch, remote: binding.remote?.name }));
      if (refs.incomingCommit !== binding.currentHead) throw Error("Incoming source changed before candidate creation.");
      const candidateId = digest(JSON.stringify([hooks.repositoryId, binding.intakeId, plan.planId, plan.planRevision, plan.fingerprint, binding.baseCommit, refs.incomingCommit, refs.targetCommit, refs.localTargetCommit, binding.baseBranch]));
      const paths = integrationPaths(root, candidateId);
      if (fs.existsSync(paths.record)) throw Error("This exact candidate already has a receipt; inspect or abort it before creating another candidate.");
      const record: IntegrationCandidateRecord = { candidateId, repositoryId: hooks.repositoryId, intakeId: binding.intakeId, planId: plan.planId, planRevision: plan.planRevision, planFingerprint: plan.fingerprint,
        baseCommit: binding.baseCommit, incomingBranch: binding.workBranch, targetBranch: binding.baseBranch, ...refs, candidateBranch: paths.branch, ...(binding.remote ? { remote: binding.remote.name } : {}),
        status: "constructing", conflictingPaths: [], validation: [], requiredChecks: checks.map((check) => check.checkId), remoteSync: "not-requested", message: "Constructing isolated integration candidate.", receipts: [] };
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
      if (record.status !== "validated" || !record.candidateCommit || JSON.stringify(record.requiredChecks) !== JSON.stringify(checks.map((check) => check.checkId)) || record.validation.length !== checks.length || record.validation.some((proof, index) => proof.exitCode !== 0 || proof.checkId !== checks[index].checkId)) throw Error("Target advance requires a candidate with all current required checks passing.");
      await current(record);
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
