import fs from "node:fs";
import path from "node:path";
import type { IntegrationCandidateHooks } from "./integrationCandidateService";
import type { IntegrationRepairPolicy } from "../../shared/integrationRepairContracts";
import { INTEGRATION_POLICY_PATH, integrationPolicyPath } from "../../shared/integrationPolicyContracts";
import { parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import { createSourceControlService } from "../sourceControl/sourceControlService";
import { createWorkIntakeBranchService } from "../workIntake/workIntakeBranchService";
import { integrationPaths, readIntegrationCommitFile } from "../agentHarness/repository/integrationGit";
import { integrationSourceBytes, integrationSourceDigest } from "../agentHarness/repository/integrationRepairGit";
import { readIntegrationPolicyFile } from "./integrationPolicyFiles";
import { loadIntegrationPolicy, loadIntegrationPolicyAtCommit } from "./integrationPolicyProvider";

function stop(reason: string): never { throw Error(`Integration Repair requires Operator/replanning: ${reason}`); }
const within = (file: string, root: string) => file.toLowerCase() === root.toLowerCase() || file.toLowerCase().startsWith(`${root.toLowerCase()}/`);
const reserved = (entry: string) => /(^|\/)(?:\.git|\.champcity|node_modules|dist|build|out|release|coverage|archive|\.env(?:\.[^/]*)?)(\/|$)/i.test(entry);

/** Check every existing path component, including junctions; missing edit leaves are permitted for additions/deletions. */
function contained(root: string, relative: string, allowMissing: boolean) {
  integrationPolicyPath(relative);
  let target = root;
  for (const part of relative.split("/")) {
    target = path.join(target, part);
    try {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || fs.realpathSync(target) !== target) stop("a configured path is redirected.");
    } catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }
}

export function createIntegrationRepairPolicyProvider(hooks: {
  repositoryRoot: string;
  repositoryId: string;
  load: () => Promise<Awaited<ReturnType<IntegrationCandidateHooks["load"]>> & { intakePath: string }>;
}): Required<Pick<IntegrationCandidateHooks, "repairPolicy">> {
  const root = fs.realpathSync(hooks.repositoryRoot);
  if (fs.lstatSync(hooks.repositoryRoot).isSymbolicLink()) stop("repository root is redirected.");
  const source = createSourceControlService({ repositoryRoot: root, repositoryId: hooks.repositoryId });
  return { repairPolicy: async (record) => {
    const current = await hooks.load();
    const binding = await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId: hooks.repositoryId }).verify(current.binding);
    if (record.repositoryId !== hooks.repositoryId || record.intakeId !== binding.intakeId || record.incomingCommit !== binding.currentHead
      || record.incomingBranch !== binding.workBranch || record.targetBranch !== binding.baseBranch || record.baseCommit !== binding.baseCommit
      || JSON.stringify(record.completion) !== JSON.stringify(current.completion)) stop("current Intake/completion binding is stale.");
    const snapshot = await loadIntegrationPolicyAtCommit(root, record.targetCommit);
    const scope = snapshot.policy.repair;
    if (!scope) stop("target policy has no bounded repair section.");
    const checkout = integrationPaths(root, record.candidateId).checkout;
    if (loadIntegrationPolicy(root).textSha256 !== snapshot.textSha256 || loadIntegrationPolicy(checkout).textSha256 !== snapshot.textSha256
      || record.validationPolicySha256 && record.validationPolicySha256 !== snapshot.sha256) stop("policy changed; construct a fresh candidate under agreed policy.");
    for (const boundary of [...scope.allowedEditableRoots, ...(scope.protectedPaths ?? [])]) {
      contained(root, boundary, true); contained(checkout, boundary, true);
    }
    if (scope.allowedEditableRoots.some(reserved)) stop("editable roots include protected administration or generated output.");
    const sources: IntegrationRepairPolicy["sources"] = [
      { role: "intake", path: integrationPolicyPath(current.intakePath) },
      { role: "completion", path: integrationPolicyPath(current.completion.sourcePath) }, ...scope.sources,
    ];
    if (new Set(sources.map((entry) => entry.path.toLowerCase())).size !== sources.length) stop("governing evidence must be distinct.");
    let contextBytes = 0;
    for (const entry of sources) {
      if (reserved(entry.path)) stop("governing evidence is not current source.");
      const bytes = readIntegrationPolicyFile(root, entry.path, 250_000);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      integrationSourceBytes(root, entry.path);
      contextBytes += text.length;
      if (entry.role === "intake" || entry.role === "completion") {
        const parsed = parseCanonicalMarkdownDocument(text).metadata;
        if (parsed.participationRole === "historical" || parsed.identity.intakeId !== record.intakeId || entry.role === "intake" && parsed.artifactType !== "work-intake") stop("governing intent is stale.");
        if (entry.role === "completion") {
          const completion = record.completion;
          const sharedInvalid = parsed.identity.routeDecisionId !== completion.routeDecisionId || parsed.artifactRevision !== completion.revision || parsed.documentDisposition.status !== "Approved";
          const planInvalid = completion.kind === "plan" && (parsed.artifactType !== "work-planning-plan" || parsed.identity.planId !== completion.completionId);
          const researchOutcome = parsed.workflowData.researchOutcome as Record<string, unknown> | undefined;
          const researchInvalid = completion.kind === "research" && (parsed.artifactType !== "work-planning-assessment" || parsed.identity.assessmentId !== completion.completionId ||
            parsed.identity.routeId !== "research-prototype" || researchOutcome?.outcome !== "no-implementation-plan-required");
          if (sharedInvalid || planInvalid || researchInvalid) stop("approved completion evidence is stale.");
        }
      } else {
        const targetBytes = await readIntegrationCommitFile(root, record.targetCommit, entry.path, 250_000);
        const candidateBytes = readIntegrationPolicyFile(checkout, entry.path, 250_000);
        const normalize = (value: Buffer) => new TextDecoder("utf-8", { fatal: true }).decode(value).replaceAll("\r\n", "\n");
        if (normalize(bytes) !== normalize(targetBytes) || normalize(bytes) !== normalize(candidateBytes)) stop("governing architecture/contract evidence changed.");
      }
    }
    if (contextBytes > 80_000) stop("governing evidence exceeds its context bound.");
    const changed = await source.integrationRepairChangedPaths({ candidateId: record.candidateId, mergeBase: record.mergeBase, incomingCommit: record.incomingCommit });
    const inspected = await source.inspectIntegration(record.candidateId);
    if (!changed.ok || !inspected.ok) stop("candidate diff/conflict evidence is unavailable.");
    const editablePaths = deriveIntegrationRepairEditablePaths(scope, sources, record.conflictingPaths, inspected.result.conflictingPaths, changed.result);
    for (const entry of editablePaths) {
      contained(root, entry, true); contained(checkout, entry, true);
      integrationSourceBytes(checkout, entry);
    }
    // Stable identity survives service recreation and changes when policy or supplemental evidence changes.
    return { sources, editablePaths, policySha256: integrationSourceDigest(snapshot.sha256) };
  } };
}

/** Pure scope derivation, independently proved without repeating repository acquisition. */
export function deriveIntegrationRepairEditablePaths(scope: { allowedEditableRoots: string[]; protectedPaths?: string[] }, sources: IntegrationRepairPolicy["sources"], originalConflicts: string[], observedConflicts: string[], changedPaths: string[]): string[] {
  const protectedPaths = [INTEGRATION_POLICY_PATH, ...sources.map((entry) => entry.path), ...(scope.protectedPaths ?? [])];
  const allowed = (entry: string) => !reserved(entry) && !protectedPaths.some((boundary) => within(entry, boundary)) && scope.allowedEditableRoots.some((boundary) => within(entry, boundary));
  // The original conflict set remains fixed across repair attempts, even after conflicts are committed.
  const conflicts = [...new Set([...originalConflicts, ...observedConflicts])];
  if (conflicts.some((entry) => !allowed(entry))) stop("a conflict falls outside the protected repair boundary.");
  const editablePaths = [...new Set([...conflicts, ...changedPaths].map(integrationPolicyPath))].filter(allowed).sort();
  if (!editablePaths.length || editablePaths.length > 32) stop("the deterministic editable set must contain 1–32 paths.");

  return editablePaths;
}
