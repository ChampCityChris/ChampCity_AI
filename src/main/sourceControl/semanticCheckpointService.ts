import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ProjectStateRecord } from "../../shared/projectState/domainContracts";
import { createProjectStateService } from "../../shared/projectState/projectStateService";
import type { CheckpointResult, DispositionCheckpointRequest, ImplementationCheckpointRequest } from "../../shared/sourceLifecycleContracts";
import { createSQLiteProjectStateStore } from "../projectState/sqliteProjectStateStore";
import { selectedStructuredProjectId } from "../workIntake/structuredWorkIntakeService";
import { createSourceControlService } from "./sourceControlService";

const principal = { principalId: "local-operator", principalType: "human" as const, role: "Operator" };
const activeRoots = new Set<string>();
type Kind = "implementation" | "disposition";
type Request = ImplementationCheckpointRequest | DispositionCheckpointRequest;
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
  if (activeRoots.has(selected)) return blocked("A source checkpoint is already running for this repository.");
  activeRoots.add(selected);
  let pendingId: string | null = null;
  try {
    if (selectedStructuredProjectId(selected) !== projectId) return blocked("Selected structured Project authority is unavailable.");
    if (![request.boundaryId, request.workIntakeId, request.targetEntityId, request.sourceLineId].every(validId) ||
      !/^[a-f0-9]{40,64}$/.test(request.expectedRevisionId) ||
      (kind === "disposition" && !validId((request as DispositionCheckpointRequest).dispositionId)) ||
      !Array.isArray(request.attributablePaths) || request.attributablePaths.length > 256 ||
      request.attributablePaths.some(item => !safePath(item)) ||
      (kind === "implementation" && request.attributablePaths.length === 0)) return blocked("Checkpoint request is invalid.");
    const paths = [...new Set(request.attributablePaths)].sort();
    if (paths.length !== request.attributablePaths.length) return blocked("Checkpoint paths must be unique.");
    const store = createSQLiteProjectStateStore(path.join(selected, ".champcity", "project-state.sqlite"));
    try {
      const state = createProjectStateService(store, principal);
      const intakeSummary = await state.getWorkIntakeSummary(projectId, request.workIntakeId);
      if (!intakeSummary.targetWorkflowId) return blocked("Work Intake has no target Workflow source binding.");
      const bindings = (await store.listEntities(projectId, "SourceBinding"))
        .filter((row): row is Binding => row.entityType === "SourceBinding" && row.body.workflowId === intakeSummary.targetWorkflowId && row.lifecycleState === "active");
      if (bindings.length !== 1) return blocked("Work Intake must have one active SourceBinding.");
      let binding = bindings[0];
      const baseline = await store.getEntity(projectId, binding.body.sourceBaselineId);
      if (baseline?.entityType !== "SourceBaseline" || baseline.body.workflowId !== binding.body.workflowId) return blocked("SourceBinding baseline and Workflow lineage mismatch.");
      if (binding.body.preparationState !== "ready" || binding.body.workSourceLineId !== request.sourceLineId ||
        binding.body.repositoryCheckoutId !== request.repositoryCheckoutId && request.repositoryCheckoutId !== undefined)
        return blocked("Work Intake source binding does not match the checkpoint request.");
      const target = await store.getEntity(projectId, request.targetEntityId);
      if (kind === "implementation") {
        if (target?.entityType !== "ImplementationRecord" || target.body.outcome !== "implemented")
          return blocked("Implementation checkpoint requires a completed ImplementationRecord.");
      } else {
        if (!target || !["WorkItem", "WorkIntake"].includes(target.entityType)) return blocked("Disposition target is invalid.");
        const decision = await store.getEntity(projectId, (request as DispositionCheckpointRequest).dispositionId);
        const governs = await store.listRelationships(projectId, "governs");
        if (decision?.entityType !== "Decision" || decision.body.decisionRole !== "Operator" ||
          !governs.some(edge => edge.fromEntityId === decision.id && edge.toEntityId === target.id && !edge.endedAt))
          return blocked("Operator disposition evidence is unavailable.");
      }
      const source = createSourceControlService({ repositoryId: baseline.body.repositoryId, repositoryRoot: selected });
      const branch = await source.branches(request.sourceLineId);
      if (!branch.ok || branch.result.currentBranch !== request.sourceLineId ||
        branch.result.selectedBranch?.commit !== branch.result.head)
        return blocked("Select the exact Work Intake source line before checkpointing.");
      const fileDigests = paths.map(item => ({ path: item, digest: fileDigest(selected, item) }));
      const receiptDigest = digest(JSON.stringify({ version: 1, kind, projectId, boundaryId: request.boundaryId,
        workIntakeId: request.workIntakeId, targetEntityId: request.targetEntityId,
        dispositionId: kind === "disposition" ? (request as DispositionCheckpointRequest).dispositionId : null,
        sourceLineId: request.sourceLineId, expectedRevisionId: request.expectedRevisionId, files: fileDigests }));
      const message = commitMessage(kind, receiptDigest);
      let saved = await exactCheckpoint(store, projectId, request.boundaryId);
      if (saved && (saved.body.receiptDigest !== receiptDigest || saved.body.checkpointKind !== kind ||
        saved.body.expectedRevisionId !== request.expectedRevisionId || saved.body.workIntakeId !== request.workIntakeId ||
        saved.body.sourceLineId !== request.sourceLineId)) return inspection("Checkpoint identity conflicts with saved evidence.", saved.id);
      if (saved?.body.checkpointState === "committed") return result(baseline.body.repositoryId, saved);
      if (!saved) {
        if (binding.body.currentRevisionId !== request.expectedRevisionId || branch.result.head !== request.expectedRevisionId)
          return blocked("Expected source revision is stale.");
        const created = await state.createSourceCheckpoint(projectId, binding.id, request.targetEntityId,
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
        return result(baseline.body.repositoryId, saved);
      }
      const changed = await source.changedFiles();
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
        fileDigests.some(item => fileDigest(selected, item.path) !== item.digest)) {
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
  } finally { activeRoots.delete(selected); }
}

/** Main-process semantic checkpoint operations. The caller supplies a selected Project root. */
export const createImplementationCheckpoint = (root: string, projectId: string, request: ImplementationCheckpointRequest) =>
  checkpoint(root, projectId, "implementation", request);
export const createDispositionCheckpoint = (root: string, projectId: string, request: DispositionCheckpointRequest) =>
  checkpoint(root, projectId, "disposition", request);
