import fs from "node:fs";
import path from "node:path";
import type { IntegrationCandidateRecord } from "../../shared/integrationCandidateContracts";
import type { IntegrationRepairAttempt, IntegrationRepairPatch, IntegrationRepairPolicy } from "../../shared/integrationRepairContracts";
import type { SourceControlResult } from "../../shared/sourceControlContracts";
import { parseCanonicalMarkdownDocument, serializeCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { integrationPaths } from "../agentHarness/repository/integrationGit";
import { assertIntegrationSourceText, integrationSourceBytes, integrationSourceDigest, integrationSourceFile } from "../agentHarness/repository/integrationRepairGit";
import type { SourceControlService } from "../sourceControl/sourceControlService";

interface IntegrationRepairOwner {
  root: string;
  source: SourceControlService;
  read: (candidateId: string) => IntegrationCandidateRecord;
  persist: (record: IntegrationCandidateRecord) => void;
  current: (record: IntegrationCandidateRecord) => Promise<unknown>;
  validate: (record: IntegrationCandidateRecord) => Promise<IntegrationCandidateRecord>;
  exclusive: <T>(action: () => Promise<T>) => Promise<T>;
  policy?: (record: IntegrationCandidateRecord) => Promise<IntegrationRepairPolicy>;
}
const safeText = (value: string) => value.replaceAll("<!-- CHAMPCITY-METADATA", "[canonical metadata begins]").replaceAll("CHAMPCITY-METADATA -->", "[canonical metadata ends]");
export function createIntegrationRepairController(owner: IntegrationRepairOwner) {
  function unwrap<T>(result: SourceControlResult<T>, record: IntegrationCandidateRecord) {
    record.receipts.push(result.receipt); if (!result.ok) throw Error(result.error.message); return result.result;
  }
  function file(candidateId: string, repairId: string) {
    if (!/^REPAIR(?:0[1-9]|10)$/.test(repairId)) throw Error("Invalid Integration Repair identity.");
    const target = path.join(integrationPaths(owner.root, candidateId).base, `${repairId}.md`);
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Error("Integration Repair record must not be redirected.");
    return target;
  }
  function persist(attempt: IntegrationRepairAttempt) {
    const { prompt, ...record } = attempt;
    const content = serializeCanonicalMarkdownDocument({ schemaVersion: 1, artifactType: "integration-repair", artifactRevision: attempt.attempt, participationRole: "nonReviewHandoff",
      identity: { candidateId: attempt.candidateId, repairId: attempt.repairId }, sourceRevisions: [], workflowData: { record },
      documentDisposition: { status: "Pending", notes: "Source-edit scope only. ChampCity owns Git and validation.", reviewedAt: null } }, prompt);
    const target = file(attempt.candidateId, attempt.repairId);
    fs.writeFileSync(`${target}.tmp`, content, { flag: "wx" }); fs.renameSync(`${target}.tmp`, target);
  }
  function readRepair(candidateId: string, repairId: string): IntegrationRepairAttempt {
    const target = file(candidateId, repairId); const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.size > 500_000) throw Error("Integration Repair evidence exceeds its bound.");
    const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(target, "utf8"));
    const record = parsed.metadata.workflowData.record as Omit<IntegrationRepairAttempt, "prompt">;
    if (parsed.metadata.artifactType !== "integration-repair" || parsed.metadata.identity.candidateId !== candidateId || parsed.metadata.identity.repairId !== repairId || record?.candidateId !== candidateId || record.repairId !== repairId || !record.policy || !record.snapshot) throw Error("Integration Repair identity is invalid.");
    return { ...record, prompt: parsed.bodyMarkdown };
  }
  function sourceContext(record: IntegrationCandidateRecord, policy: IntegrationRepairPolicy) {
    if (!Array.isArray(policy.sources) || policy.sources.length < 2 || policy.sources.length > 16 || policy.sources.filter((entry) => entry.role === "intake").length !== 1 || policy.sources.filter((entry) => entry.role === "completion").length !== 1 || new Set(policy.sources.map((entry) => entry.path)).size !== policy.sources.length) throw Error("Integration Repair requires exact Intake, completion evidence and bounded relevant contracts.");
    const sourceDigests: Record<string, string> = {}; const context: string[] = [];
    for (const source of policy.sources) {
      if (!["intake", "completion", "architecture", "contract"].includes(source.role)) throw Error("Unknown Integration Repair evidence role.");
      const bytes = integrationSourceBytes(owner.root, source.path);
      if (bytes === null) throw Error("Integration Repair governing evidence is missing.");
      sourceDigests[source.path] = integrationSourceDigest(bytes);
      let body = bytes;
      if (source.role === "intake" || source.role === "completion") {
        const parsed = parseCanonicalMarkdownDocument(bytes);
        if (parsed.metadata.participationRole === "historical" || parsed.metadata.identity.intakeId !== record.intakeId) throw Error("Integration Repair intent belongs to stale or different work.");
        if (source.role === "completion") {
          const completion = record.completion;
          const metadata = parsed.metadata;
          const sharedInvalid = metadata.identity.routeDecisionId !== completion.routeDecisionId || metadata.artifactRevision !== completion.revision || metadata.documentDisposition.status !== "Approved";
          const planInvalid = completion.kind === "plan" && (metadata.artifactType !== "work-planning-plan" || metadata.identity.planId !== completion.completionId);
          const researchOutcome = metadata.workflowData.researchOutcome as Record<string, unknown> | undefined;
          const researchInvalid = completion.kind === "research" && (metadata.artifactType !== "work-planning-assessment" || metadata.identity.assessmentId !== completion.completionId ||
            metadata.identity.routeId !== "research-prototype" || researchOutcome?.outcome !== "no-implementation-plan-required");
          if (sharedInvalid || planInvalid || researchInvalid) throw Error("Integration Repair requires the current approved completion evidence.");
        }
        if (source.role === "intake" && parsed.metadata.artifactType !== "work-intake") throw Error("Integration Repair requires canonical Intake intent.");
        body = parsed.bodyMarkdown;
      }
      context.push(`### ${source.role}: ${source.path}\n\n${safeText(body)}`);
    }
    if (context.join("\n").length > 80_000) throw Error("Integration Repair governing context exceeds its bound.");
    return { sourceDigests, context: context.join("\n\n") };
  }
  async function active(candidateId: string, repairId: string) {
    const record = owner.read(candidateId); await owner.current(record);
    if (record.activeRepairId !== repairId || !["conflicted", "validation-failed"].includes(record.status)) throw Error("Integration Repair is not the current failed candidate's active attempt.");
    const attempt = readRepair(candidateId, repairId);
    if (attempt.status !== "prepared") throw Error("Integration Repair is no longer awaiting source resolution.");
    if (attempt.policy.policySha256) {
      const resolved = await owner.policy?.(record);
      if (JSON.stringify(resolved) !== JSON.stringify(attempt.policy)) throw Error("Integration Repair scope policy changed; Operator/replanning is required.");
    }
    const current = sourceContext(record, attempt.policy);
    if (JSON.stringify(current.sourceDigests) !== JSON.stringify(attempt.sourceDigests)) throw Error("Integration Repair governing intent changed; no Git continuation is allowed.");
    return { record, attempt };
  }
  return {
    readRepair,
    prepareRepair: (candidateId: string) => owner.exclusive(async () => {
      const record = owner.read(candidateId); await owner.current(record);
      if (!["conflicted", "validation-failed"].includes(record.status)) throw Error("Integration Repair requires a conflicted or validation-failed candidate.");
      if (record.activeRepairId) { const current = readRepair(candidateId, record.activeRepairId); if (current.status === "prepared") { await active(candidateId, current.repairId); return current; } }
      if (!owner.policy) throw Error("Application integration policy has not supplied bounded repair source evidence.");
      const policy = await owner.policy(record); const attemptNumber = (record.repairAttemptCount ?? 0) + 1;
      if (attemptNumber > 10) throw Error("Integration Repair attempt bound reached; Operator disposition is required.");
      const { sourceDigests, context } = sourceContext(record, policy);
      if (policy.editablePaths.some((entry) => Object.hasOwn(sourceDigests, entry))) throw Error("Integration Repair may not edit its governing intent or contracts.");
      const snapshot = unwrap(await owner.source.snapshotIntegrationRepair(candidateId, policy.editablePaths), record);
      if (snapshot.head !== record.candidateCommit || snapshot.unmerged.some((entry) => !policy.editablePaths.includes(entry))) throw Error("Integration Repair source/head is outside the bounded candidate context.");
      const diffs = unwrap(await owner.source.integrationRepairDiffs({ candidateId, mergeBase: record.mergeBase, targetCommit: record.targetCommit, incomingCommit: record.incomingCommit }), record);
      const regions = snapshot.unmerged.map((entry) => `### ${entry}\n\n${safeText(integrationSourceBytes(integrationPaths(owner.root, candidateId).checkout, entry) ?? "Deleted conflict source")}`).join("\n\n");
      const sourceBodies = policy.editablePaths.map((entry) => `### ${entry}\n\n${safeText(integrationSourceBytes(integrationPaths(owner.root, candidateId).checkout, entry) ?? "Source is absent; creation is allowed only within the accepted scope.")}`).join("\n\n");
      const repairId = `REPAIR${String(attemptNumber).padStart(2, "0")}`;
      const prompt = `# Integration Repair ${repairId}\n\nResolve only source in <INTEGRATION_CANDIDATE>. Preserve the accepted behavior and intent of both histories.\n\nDo not run Git merge, add, commit, checkout-ours/theirs, merge-continue, push, reset, rebase, tag, or target-branch switching. Do not alter Git administration, receipts, planning intent, or files outside the explicit editable set. ChampCity owns every Git transition and validation retry. Return a bounded source patch with each path, current SHA-256 and replacement content (null only for explicit deletion).\n\nIf reconciliation changes approved scope or architecture, or requires choosing between incompatible accepted intents, stop and report an Operator decision with the conflicting intents. Do not select a semantic winner.\n\nCandidate: ${candidateId}\nMerge base: ${record.mergeBase}\nTarget: ${record.targetBranch} at ${record.targetCommit}\nIncoming: ${record.incomingBranch} at ${record.incomingCommit}\n\n## Editable source and starting hashes\n\n${JSON.stringify(snapshot.editable, null, 2)}\n\n${sourceBodies}\n\n## Governing intent and contracts\n\n${context}\n\n## Target diff\n\n${safeText(diffs.targetDiff)}\n\n## Incoming diff\n\n${safeText(diffs.incomingDiff)}\n\n## Conflicted regions\n\n${regions || "No textual conflicts; repair the failed semantic validation."}\n\n## Failed validation evidence\n\n${JSON.stringify(record.validation, null, 2)}\n`;
      if (prompt.length > 350_000) throw Error("Integration Repair handoff exceeds its bounded context.");
      const attempt: IntegrationRepairAttempt = { repairId, candidateId, attempt: attemptNumber, status: "prepared", snapshot, sourceDigests, policy, validation: [], message: "Bounded source resolution prepared.", prompt };
      persist(attempt); record.repairAttemptCount = attemptNumber; record.activeRepairId = repairId; owner.persist(record); return attempt;
    }),
    applyRepairPatch: (candidateId: string, repairId: string, patches: IntegrationRepairPatch[]) => owner.exclusive(async () => {
      const { record, attempt } = await active(candidateId, repairId);
      if (!Array.isArray(patches) || !patches.length || patches.length > 32 || new Set(patches.map((patch) => patch.path)).size !== patches.length) throw Error("Integration Repair patch must contain bounded distinct source paths.");
      const checkout = integrationPaths(owner.root, candidateId).checkout;
      const snapshot = unwrap(await owner.source.snapshotIntegrationRepair(candidateId, attempt.policy.editablePaths), record);
      if (snapshot.head !== attempt.snapshot.head || snapshot.mergeHead !== attempt.snapshot.mergeHead || snapshot.indexDigest !== attempt.snapshot.indexDigest) throw Error("Integration Repair Git state changed before patch application.");
      for (const patch of patches) {
        if (!attempt.policy.editablePaths.includes(patch.path) || snapshot.editable[patch.path] !== patch.beforeSha256 || patch.content !== null && (typeof patch.content !== "string" || patch.content.length > 250_000 || patch.content.includes("\0"))) throw Error("Integration Repair patch exceeds its source scope or has stale bytes.");
        if (patch.content !== null) assertIntegrationSourceText(patch.content);
      }
      for (const patch of patches) {
        const target = integrationSourceFile(checkout, patch.path);
        if (patch.content === null) { if (fs.existsSync(target)) fs.unlinkSync(target); }
        else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, patch.content); }
      }
      owner.persist(record); return { appliedPaths: patches.map((patch) => patch.path) };
    }),
    completeRepair: (candidateId: string, repairId: string) => owner.exclusive(async () => {
      const { record, attempt } = await active(candidateId, repairId);
      const result = await owner.source.commitIntegrationRepair({ candidateId, repairId, incomingCommit: record.incomingCommit, snapshot: attempt.snapshot, editablePaths: attempt.policy.editablePaths });
      record.receipts.push(result.receipt);
      if (!result.ok) { attempt.message = result.error.message; persist(attempt); owner.persist(record); return { attempt, candidate: record }; }
      attempt.commit = result.result.commit; record.candidateCommit = result.result.commit; record.conflictingPaths = [];
      attempt.status = "failed"; attempt.message = "Source committed; required validation is pending."; persist(attempt); owner.persist(record);
      try {
        await owner.validate(record); attempt.validation = record.validation; attempt.status = record.status === "validated" ? "validated" : "validation-failed"; attempt.message = record.message;
      } catch { attempt.status = "failed"; record.status = "failed"; attempt.message = "Integration Repair validation could not complete; candidate retained for inspection."; owner.persist(record); }
      persist(attempt); return { attempt, candidate: record };
    }),
    requestOperatorDecision: (candidateId: string, repairId: string, reason: string) => owner.exclusive(async () => {
      const { record, attempt } = await active(candidateId, repairId);
      if (typeof reason !== "string" || !reason.trim() || reason.length > 4000 || /(?:[A-Za-z]:[\\/]|-----BEGIN .*PRIVATE KEY)/.test(reason)) throw Error("Operator decision requires bounded scope/architecture reasoning without machine paths or credentials.");
      assertIntegrationSourceText(reason);
      attempt.status = "operator-decision"; attempt.message = reason.trim(); record.status = "operator-decision"; record.message = "Integration stopped for an Operator decision on incompatible accepted scope or architecture.";
      persist(attempt); owner.persist(record); return { attempt, candidate: record };
    }),
  };
}
