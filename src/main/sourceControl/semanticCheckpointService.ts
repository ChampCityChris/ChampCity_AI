import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { isTesterOwnedPath } from "../../shared/projectState/testerOwnedPathPolicy";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { CheckpointResult, DispositionCheckpointRequest, ImplementationCheckpointRequest, TesterCheckpointRequest } from "../../shared/sourceLifecycleContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedCurrentProjectId } from "../projectState/currentProjectRegistrationService";
import { createSourceControlService } from "./sourceControlService";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath, workflowRepositoryCheckoutId } from "./projectSourceTopology";
import { workflowSourceLineName } from "./workSourceNaming";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";

const principal = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const activeRoots = new Set<string>();
type Kind = "implementation" | "disposition" | "tester";
type Request = ImplementationCheckpointRequest | DispositionCheckpointRequest | TesterCheckpointRequest;
type Store = ReturnType<typeof createSQLiteProjectStateStore>;
type Checkpoint = ProjectStateRecord<"SourceCheckpoint">;
type Binding = ProjectStateRecord<"SourceBinding">;

function blocked(message: string, checkpointId: string | null = null): CheckpointResult {
  return { state: "blocked", checkpointId, revision: null, message };
}
function inspection(message: string, checkpointId: string | null): CheckpointResult {
  return { state: "inspection-required", checkpointId, revision: null, message };
}
function validId(value: string): boolean { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(value) && !value.includes(".."); }
function safePath(value: string): boolean {
  return typeof value === "string" && value.length <= 512 && !path.isAbsolute(value) &&
    !value.includes("\\") && !value.includes("\0") && !value.includes("\r") && !value.includes("\n") &&
    value.split("/").every(part => part !== "" && part !== "." && part !== "..") &&
    !value.startsWith(".git/") && value !== ".git" && !value.startsWith(".champcity/") && value !== ".champcity" &&
    !/(^|\/)(\.env(?:\.|$)|node_modules|dist|build|coverage|tmp)(\/|$)/i.test(value) &&
    !/(^|\/)[^/]*(?:token|secret|credential)[^/]*(\/|$)/i.test(value) &&
    !/\.(?:pem|key|p12|pfx)$/i.test(value);
}
function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function fileDigest(root: string, relative: string): string {
  const full = path.join(root, ...relative.split("/"));
  if (!fs.existsSync(full)) return "deleted";
  const stat = fs.lstatSync(full);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024 ||
    path.dirname(fs.realpathSync(full)).startsWith(path.join(root, ".git"))) throw Error("Checkpoint path is not a bounded ordinary file.");
  // Parent links must also remain inside the selected repository.
  const resolved = fs.realpathSync(full);
  if (!resolved.startsWith(root + path.sep) || resolved.startsWith(path.join(root, ".git") + path.sep) ||
    resolved.startsWith(path.join(root, ".champcity") + path.sep)) throw Error("Checkpoint path leaves the selected source boundary.");
  return digest(fs.readFileSync(full).toString("base64"));
}
function commitMessage(kind: Kind, receiptDigest: string): string {
  return `ChampCity ${kind} checkpoint ${receiptDigest}\n\nCheckpoint-Receipt: ${receiptDigest}\nCheckpoint-Kind: ${kind}`;
}
function isAppState(file: string): boolean { return file === ".champcity" || file.startsWith(".champcity/"); }
function result(repositoryId: string, checkpoint: Checkpoint): CheckpointResult {
  return { state: "committed", checkpointId: checkpoint.id,
    revision: { repositoryId, revisionId: checkpoint.body.resultingRevisionId! }, message: "Checkpoint committed." };
}
async function exactCheckpoint(store: Store, projectId: string, boundaryId: string): Promise<Checkpoint | null> {
  const records = (await store.listEntities(projectId, "SourceCheckpoint"))
    .filter((row): row is Checkpoint => row.entityType === "SourceCheckpoint" && row.body.boundaryId === boundaryId);
  if (records.length > 1) throw Error("Ambiguous checkpoint boundary.");
  return records[0] ?? null;
}

async function checkpoint(root: string, projectId: string, kind: Kind, request: Request): Promise<CheckpointResult> {
  let selected: string;
  try { selected = fs.realpathSync(root); } catch { return blocked("Selected repository is unavailable."); }
  let lockKey = selected;
  let lockAcquired = false;
  let pendingId: string | null = null;
  try {
    if (selectedCurrentProjectId(selected) !== projectId) return blocked("Selected Current Project registration is unavailable.");
    if (![request.boundaryId, request.workflowId, request.targetEntityId, request.sourceLineId, request.repositoryCheckoutId].every(validId) ||
      !/^[a-f0-9]{40,64}$/.test(request.expectedRevisionId) ||
      (kind === "disposition" && !validId((request as DispositionCheckpointRequest).dispositionId)) ||
      !Array.isArray(request.attributablePaths) || request.attributablePaths.length > 256 ||
      request.attributablePaths.some(item => !safePath(item)) ||
      (kind !== "disposition" && request.attributablePaths.length === 0) ||
      (kind === "tester" && request.attributablePaths.some(item => !isTesterOwnedPath(item)))) return blocked("Checkpoint request is invalid.");
    const paths = [...new Set(request.attributablePaths)].sort();
    if (paths.length !== request.attributablePaths.length) return blocked("Checkpoint paths must be unique.");
    const store = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
    try {
      const state = createProjectStateService(store, principal);
      const targetWorkflow = await store.getEntity(projectId, request.workflowId);
      if (targetWorkflow?.entityType !== "Workflow" || targetWorkflow.body.workflowType === "work-intake-routing") return blocked("Checkpoint requires a substantive Workflow owner.");
      const workflows = (await store.listEntities(projectId, "Workflow")).filter((row): row is ProjectStateRecord<"Workflow"> => row.entityType === "Workflow" && row.lineageId === targetWorkflow.lineageId);
      const currentOwners = workflows.filter(row => row.lifecycleState === "active" && row.body.workflowType !== "work-intake-routing" &&
        !["closed", "cancelled"].includes(row.body.workflowState));
      if (currentOwners.length !== 1 || currentOwners[0].id !== request.workflowId)
        return blocked("Checkpoint requires the unique current active nonterminal substantive Workflow owner.");
      const lineageIds = new Set(workflows.map(row => row.id));
      const bindings = (await store.listEntities(projectId, "SourceBinding"))
        .filter((row): row is Binding => row.entityType === "SourceBinding" && lineageIds.has(row.body.workflowId) && row.lifecycleState === "active");
      if (bindings.length !== 1) return blocked("Workflow lineage must have one active SourceBinding.");
      let binding = bindings[0];
      const baseline = await store.getEntity(projectId, binding.body.sourceBaselineId);
      const bindingWorkflow = await store.getEntity(projectId, binding.body.workflowId);
      const baselineWorkflow = baseline?.entityType === "SourceBaseline" ? await store.getEntity(projectId, baseline.body.workflowId) : null;
      if (baseline?.entityType !== "SourceBaseline" || bindingWorkflow?.entityType !== "Workflow" || baselineWorkflow?.entityType !== "Workflow" || bindingWorkflow.lineageId !== baselineWorkflow.lineageId) return blocked("SourceBinding baseline and Workflow lineage mismatch.");
      if (binding.body.preparationState !== "ready" || !binding.body.currentRevisionId || !binding.body.workSourceLineId || !binding.body.repositoryCheckoutId || binding.body.workSourceLineId !== request.sourceLineId || binding.body.repositoryCheckoutId !== request.repositoryCheckoutId)
        return blocked("Workflow SourceBinding does not match the checkpoint request.");
      if (request.repositoryCheckoutId !== workflowRepositoryCheckoutId(baseline.body.workflowId) || binding.body.workSourceLineId !== workflowSourceLineName(baseline.body.workflowId)) return blocked("Workflow checkout identity differs from its immutable SourceBaseline anchor.");
      const checkout = resolveManagedWorkflowCheckoutPath(selected, baseline.body.workflowId).checkoutRoot;
      const checkoutStat = fs.lstatSync(checkout);
      if (!checkoutStat.isDirectory() || checkoutStat.isSymbolicLink() || fs.realpathSync(checkout) !== checkout) return blocked("Managed Workflow checkout is unavailable or redirected.");
      lockKey = checkout;
      if (activeRoots.has(lockKey)) return blocked("A source checkpoint is already running for this Workflow checkout.");
      activeRoots.add(lockKey);
      lockAcquired = true;
      const topology = resolveManagedProjectSourceTopology(selected);
      const gitTop = (await runBoundedGit({ cwd: checkout, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
      const common = (await runBoundedGit({ cwd: checkout, args: ["rev-parse", "--git-common-dir"] })).stdout.trim();
      const devCommon = (await runBoundedGit({ cwd: topology.devCheckoutRoot, args: ["rev-parse", "--git-common-dir"] })).stdout.trim();
      const commonPath = path.resolve(checkout, common); const devCommonPath = path.resolve(topology.devCheckoutRoot, devCommon);
      if (fs.realpathSync(gitTop) !== checkout || fs.realpathSync(commonPath) !== fs.realpathSync(devCommonPath)) return blocked("Workflow checkout Git identity differs from managed Project topology.");
      const target = await store.getEntity(projectId, request.targetEntityId);
      const allEdges = await store.listRelationships(projectId);
      const belongsToWorkflow = (entityId: string) => {
        const seen = new Set<string>(); let current = entityId;
        while (!seen.has(current)) { if (lineageIds.has(current)) return true; seen.add(current);
          const parents = allEdges.filter(edge => edge.relationshipType === "part_of" && edge.fromEntityId === current && !edge.endedAt);
          if (parents.length !== 1) break; current = parents[0].toEntityId; }
        return false;
      };
      if (kind === "implementation") {
        if (target?.entityType !== "ImplementationRecord" || target.body.outcome !== "implemented")
          return blocked("Implementation checkpoint requires a completed ImplementationRecord.");
        if (!belongsToWorkflow(target.body.workItemId)) return blocked("Implementation target is outside the requested Workflow lineage.");
      } else if (kind === "disposition") {
        if (!target || !["WorkItem", "Workflow"].includes(target.entityType)) return blocked("Disposition target is invalid.");
        if (target.entityType === "Workflow" ? !lineageIds.has(target.id) : !belongsToWorkflow(target.id)) return blocked("Disposition target is outside the requested Workflow lineage.");
        const decision = await store.getEntity(projectId, (request as DispositionCheckpointRequest).dispositionId);
        const governs = await store.listRelationships(projectId, "governs");
        if (decision?.entityType !== "Decision" || decision.body.decisionRole !== "Operator" ||
          !governs.some(edge => edge.fromEntityId === decision.id && edge.toEntityId === target.id && !edge.endedAt))
          return blocked("Operator disposition evidence is unavailable.");
      } else {
        if (target?.entityType !== "TesterResult" || target.body.workflowId !== request.workflowId || target.body.checkpointState !== "pending" ||
          target.body.candidateRevisionId || target.body.sourceCheckpointId || target.body.permanentTestPaths.length === 0 ||
          target.body.implementerRevisionId !== request.expectedRevisionId || !belongsToWorkflow(target.body.workItemId) ||
          target.body.permanentTestPaths.length !== paths.length || target.body.permanentTestPaths.slice().sort().join("\0") !== paths.join("\0"))
          return blocked("Tester checkpoint requires the exact pending TesterResult path set and Implementer revision.");
      }
      const source = createSourceControlService({ repositoryId: baseline.body.repositoryId, repositoryRoot: checkout });
      const branch = await source.branches(request.sourceLineId);
      if (!branch.ok || branch.result.currentBranch !== request.sourceLineId ||
        branch.result.selectedBranch?.commit !== branch.result.head)
        return blocked("Workflow checkout is not on the exact requested source revision.");
      let saved = await exactCheckpoint(store, projectId, request.boundaryId);
      const fileDigests = paths.map(item => ({ path: item, digest: fileDigest(checkout, item) }));
      const receiptDigest = digest(JSON.stringify({ version: 1, kind, projectId, boundaryId: request.boundaryId,
        workflowId: request.workflowId, repositoryCheckoutId: request.repositoryCheckoutId, targetEntityId: request.targetEntityId,
        dispositionId: kind === "disposition" ? (request as DispositionCheckpointRequest).dispositionId : null,
        sourceLineId: request.sourceLineId, expectedRevisionId: request.expectedRevisionId, files: fileDigests }));
      const message = commitMessage(kind, receiptDigest);
      if (saved && (saved.body.workflowId !== request.workflowId || saved.body.expectedRevisionId !== request.expectedRevisionId ||
        saved.body.sourceLineId !== request.sourceLineId || saved.body.checkpointKind !== kind || saved.body.receiptDigest !== receiptDigest))
        return inspection("Checkpoint identity conflicts with saved evidence.", saved.id);
      if (saved?.body.checkpointState === "committed") {
        if (!saved.body.resultingRevisionId || branch.result.head !== saved.body.resultingRevisionId || binding.body.currentRevisionId !== saved.body.resultingRevisionId)
          return inspection("Committed checkpoint no longer matches the current exact source boundary.", saved.id);
        const committed = await source.inspectCommit({ ref: saved.body.resultingRevisionId });
        const changed = await source.changedFiles();
        const relevantChanges = changed.ok ? changed.result.filter(item => !isAppState(item.path)) : [];
        if (!committed.ok || committed.result.parents.length !== 1 || committed.result.parents[0] !== request.expectedRevisionId ||
          committed.result.message.trim() !== message || committed.result.changedFiles.map(file => file.path).sort().join("\0") !== paths.join("\0") ||
          !changed.ok || relevantChanges.length > 0)
          return inspection("Committed checkpoint source evidence has changed and requires inspection.", saved.id);
        if (kind === "tester") await state.completeTesterResultCheckpoint(projectId, target.id, saved.id, target.recordVersion);
        return result(baseline.body.repositoryId, saved);
      }
      if (branch.result.head !== request.expectedRevisionId) {
        if (!saved || saved.body.workflowId !== request.workflowId || saved.body.expectedRevisionId !== request.expectedRevisionId ||
          saved.body.sourceLineId !== request.sourceLineId || saved.body.checkpointKind !== kind || !saved.body.receiptDigest)
          return blocked("Expected source revision is stale.", saved?.id ?? null);
        const priorCommit = await source.inspectCommit({ ref: branch.result.head });
        if (!priorCommit.ok || priorCommit.result.parents.length !== 1 || priorCommit.result.parents[0] !== request.expectedRevisionId ||
          priorCommit.result.message.trim() !== commitMessage(kind, saved.body.receiptDigest) ||
          priorCommit.result.changedFiles.map(file => file.path).sort().join("\0") !== paths.join("\0"))
          return inspection("Source advanced without matching checkpoint evidence.", saved.id);
      }
      if (!saved) {
        if (binding.body.currentRevisionId !== request.expectedRevisionId)
          return blocked("Expected source revision is stale.");
        const created = await state.createSourceCheckpoint(projectId, binding.id, request.workflowId, request.targetEntityId,
          { boundaryId: request.boundaryId, expectedRevisionId: request.expectedRevisionId, checkpointKind: kind,
            checkpointState: "pending", receiptDigest });
        if (created.entityType !== "SourceCheckpoint") throw Error("Checkpoint record type changed.");
        saved = created;
      }
      pendingId = saved.id;
      // A prior attempt may have committed before the process saved its result.
      if (branch.result.head !== request.expectedRevisionId) {
        const inspected = await source.inspectCommit({ ref: branch.result.head });
        if (!inspected.ok || inspected.result.parents.length !== 1 ||
          inspected.result.parents[0] !== request.expectedRevisionId || inspected.result.message.trim() !== message ||
          inspected.result.changedFiles.map(file => file.path).sort().join("\0") !== paths.join("\0")) {
          if (saved.body.checkpointState !== "inspection-required") saved = await state.advanceSourceCheckpoint(projectId, saved.id,
            { checkpointState: "inspection-required" }, saved.recordVersion) as Checkpoint;
          return inspection("Source advanced without matching checkpoint evidence.", saved.id);
        }
        if (binding.body.currentRevisionId === request.expectedRevisionId) binding = await state.updateSourceBinding(projectId, binding.id,
          { currentRevisionId: inspected.result.commit }, binding.recordVersion) as Binding;
        if (binding.body.currentRevisionId !== inspected.result.commit) return inspection("Source binding requires inspection.", saved.id);
        saved = await state.advanceSourceCheckpoint(projectId, saved.id,
          { checkpointState: "committed", resultingRevisionId: inspected.result.commit }, saved.recordVersion) as Checkpoint;
        if (kind === "tester") await state.completeTesterResultCheckpoint(projectId, target.id, saved.id, target.recordVersion);
        return result(baseline.body.repositoryId, saved);
      }
      const changed = await source.changedFiles();
      if (branch.result.head !== request.expectedRevisionId) return blocked("Expected source revision is stale.", saved.id);
      const relevant = changed.ok ? changed.result.filter(item => !isAppState(item.path)) : [];
      const blockReason = !changed.ok ? "Source change inventory is unavailable." :
        changed.result.some(item => item.indexStatus !== " " && item.indexStatus !== "?") ?
          "Pre-staged changes require inspection before checkpointing." :
        relevant.some(item => !paths.includes(item.path) || item.originalPath && !paths.includes(item.originalPath)) ||
          paths.some(item => !relevant.some(file => file.path === item)) ?
          "Source changes do not match attributable checkpoint paths." : null;
      if (blockReason) {
        if (saved.body.checkpointState === "pending") saved = await state.advanceSourceCheckpoint(projectId, saved.id,
          { checkpointState: "blocked" }, saved.recordVersion) as Checkpoint;
        return saved.body.checkpointState === "inspection-required" ? inspection(blockReason, saved.id) : blocked(blockReason, saved.id);
      }
      if (binding.body.currentRevisionId !== request.expectedRevisionId) return inspection("Source binding requires inspection.", saved.id);
      if (saved.body.checkpointState !== "pending") saved = await state.advanceSourceCheckpoint(projectId, saved.id,
        { checkpointState: "pending" }, saved.recordVersion) as Checkpoint;
      if (paths.length) {
        const staged = await source.stage(paths);
        if (!staged.ok) {
          saved = await state.advanceSourceCheckpoint(projectId, saved.id,
            { checkpointState: "inspection-required" }, saved.recordVersion) as Checkpoint;
          return inspection("Staging outcome requires inspection.", saved.id);
        }
      }
      const stagedInventory = await source.changedFiles();
      if (!stagedInventory.ok || stagedInventory.result.filter(item => !isAppState(item.path))
        .some(item => !paths.includes(item.path) || item.worktreeStatus !== " ") ||
          paths.some(item => !stagedInventory.ok || !stagedInventory.result.some(file => file.path === item && file.indexStatus !== " ")) ||
        fileDigests.some(item => fileDigest(checkout, item.path) !== item.digest)) {
        saved = await state.advanceSourceCheckpoint(projectId, saved.id,
          { checkpointState: "inspection-required" }, saved.recordVersion) as Checkpoint;
        return inspection("Staged source evidence requires inspection.", saved.id);
      }
      const committed = await source.checkpointCommit(message, request.expectedRevisionId, paths.length === 0);
      if (!committed.ok) {
        saved = await state.advanceSourceCheckpoint(projectId, saved.id,
          { checkpointState: "inspection-required" }, saved.recordVersion) as Checkpoint;
        return inspection("Commit outcome requires inspection and retry reconciliation.", saved.id);
      }
      const inspected = await source.inspectCommit({ ref: committed.result.commit });
      if (!inspected.ok || inspected.result.parents.length !== 1 || inspected.result.parents[0] !== request.expectedRevisionId ||
        inspected.result.message.trim() !== message || inspected.result.changedFiles.map(file => file.path).sort().join("\0") !== paths.join("\0")) {
        saved = await state.advanceSourceCheckpoint(projectId, saved.id,
          { checkpointState: "inspection-required" }, saved.recordVersion) as Checkpoint;
        return inspection("Committed source evidence requires inspection.", saved.id);
      }
      binding = await state.updateSourceBinding(projectId, binding.id,
        { currentRevisionId: inspected.result.commit }, binding.recordVersion) as Binding;
      saved = await state.advanceSourceCheckpoint(projectId, saved.id,
        { checkpointState: "committed", resultingRevisionId: inspected.result.commit }, saved.recordVersion) as Checkpoint;
      if (kind === "tester") await state.completeTesterResultCheckpoint(projectId, target.id, saved.id, target.recordVersion);
      return result(baseline.body.repositoryId, saved);
    } finally { store.close(); }
  } catch {
    if (pendingId) {
      try {
        const recovery = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
        try {
          const saved = await recovery.getEntity(projectId, pendingId);
          if (saved?.entityType === "SourceCheckpoint" && ["pending", "blocked"].includes(saved.body.checkpointState))
            await createProjectStateService(recovery, principal).advanceSourceCheckpoint(projectId, pendingId,
              { checkpointState: "inspection-required" }, saved.recordVersion);
        } finally { recovery.close(); }
      } catch { /* Preserve the pending record for explicit retry reconciliation. */ }
    }
    return inspection("Checkpoint outcome is uncertain; inspect source and saved evidence before retrying.", pendingId);
  } finally { if (lockAcquired) activeRoots.delete(lockKey); }
}

/** Main-process semantic checkpoint operations. The caller supplies a selected Project root. */
export const createImplementationCheckpoint = (root: string, projectId: string, request: ImplementationCheckpointRequest) =>
  checkpoint(root, projectId, "implementation", request);
export const createDispositionCheckpoint = (root: string, projectId: string, request: DispositionCheckpointRequest) =>
  checkpoint(root, projectId, "disposition", request);
export const createTesterCheckpoint = (root: string, projectId: string, request: TesterCheckpointRequest) =>
  checkpoint(root, projectId, "tester", request);
