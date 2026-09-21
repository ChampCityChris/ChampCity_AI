import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { AgentHarnessError } from "../core/errors";
import { runBoundedGit } from "./boundedGit";
import { replaceGitBranchRef, advanceGitBranchRef, assertNoGitOperation, inspectGitBranchState, inspectGitHistory, inspectGitOperationState, inspectGitCheckout, resolveGitTransformCommit } from "./gitMutations";
import { commonGitDirectory, createManagedWorktree, managedGit, managedWorkspaceId, resolveManagedCheckout, type ManagedWorkspaceStore } from "./managedWorktrees";

export type IsolatedOperationKind = "merge" | "cherry-pick" | "revert" | "rebase";
interface OperationRecord {
  operationId: string; operation: IsolatedOperationKind; targetBranch: string; targetCommit: string; sourceCommit: string;
  workspaceId: string; temporaryBranch: string; checkoutName: string; mainline?: number;
  state: "active" | "ready" | "conflicted" | "failed" | "aborted" | "advanced";
  candidateCommit: string | null;
}
const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
async function recordPath(root: string, operationId: string) {
  if (!/^[a-f0-9]{32}$/.test(operationId)) throw fail("Invalid isolated operation identity.");
  const base = path.join(await commonGitDirectory(root), "champcity-mcp-operations");
  for (const entry of [base, path.join(base, `${operationId}.md`)]) {
    try { if (fs.lstatSync(entry).isSymbolicLink()) throw fail("Operation storage must not be redirected."); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return path.join(base, `${operationId}.md`);
}
async function saveRecord(root: string, record: OperationRecord) {
  const target = await recordPath(root, record.operationId);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temporary, `# Managed Git operation\n\n\`\`\`json\n${JSON.stringify(record)}\n\`\`\`\n`, { flag: "wx" });
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
async function loadRecord(root: string, operationId: string): Promise<OperationRecord> {
  const target = await recordPath(root, operationId);
  if (!fs.existsSync(target) || fs.statSync(target).size > 16_384) throw fail("Isolated operation record is unavailable.");
  const text = fs.readFileSync(target, "utf8");
  const match = /^# Managed Git operation\n\n```json\n([^\n]+)\n```\n$/.exec(text);
  if (!match) throw fail("Isolated operation record is invalid.");
  const record = JSON.parse(match[1]) as OperationRecord;
  const common = await commonGitDirectory(root);
  if (record.operationId !== operationId || !["merge", "cherry-pick", "revert", "rebase"].includes(record.operation)
    || record.checkoutName !== `op-${operationId}` || record.temporaryBranch !== `champcity-mcp/op-${operationId}`
    || record.workspaceId !== managedWorkspaceId(common, record.checkoutName)
    || !/^[a-f0-9]{40,64}$/.test(record.targetCommit) || !/^[a-f0-9]{40,64}$/.test(record.sourceCommit)
    || !["active", "ready", "conflicted", "failed", "aborted", "advanced"].includes(record.state)
    || (record.candidateCommit !== null && !/^[a-f0-9]{40,64}$/.test(record.candidateCommit))
    || typeof record.targetBranch !== "string" || record.targetBranch === record.temporaryBranch) throw fail("Isolated operation identity is invalid.");
  return record;
}
async function ownedCheckout(root: string, record: OperationRecord, store: ManagedWorkspaceStore) {
  const checkout = await resolveManagedCheckout(root, record.workspaceId, store);
  if (checkout.checkoutName !== record.checkoutName) throw fail("Operation checkout ownership changed.");
  if (checkout.branchName !== record.temporaryBranch) {
    if (record.operation !== "rebase" || checkout.branchName !== null) throw fail("Operation branch ownership changed.");
    await verifyRebaseState(checkout.root, record);
  }
  return checkout;
}
async function verifyRebaseState(checkoutRoot: string, record: OperationRecord) {
  const directory = path.resolve(checkoutRoot, (await managedGit(checkoutRoot, ["rev-parse", "--git-path", "rebase-merge"])).trim());
  if (!fs.existsSync(directory) || fs.lstatSync(directory).isSymbolicLink() || !fs.lstatSync(directory).isDirectory()) throw fail("Expected managed rebase state is unavailable.");
  const field = (name: string) => {
    const target = path.join(directory, name);
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) throw fail("Invalid rebase ownership metadata.");
    return fs.readFileSync(target, "utf8").trim();
  };
  if (field("head-name") !== "refs/heads/" + record.temporaryBranch || field("orig-head") !== record.targetCommit || field("onto") !== record.sourceCommit) throw fail("Rebase endpoints or ownership changed.");
}
function expectedMarker(record: OperationRecord) {
  return record.operation === "rebase" ? "rebase-merge" : record.operation === "merge" ? "MERGE_HEAD" : record.operation === "revert" ? "REVERT_HEAD" : "CHERRY_PICK_HEAD";
}
async function inspectRecord(root: string, record: OperationRecord, store: ManagedWorkspaceStore) {
  if (record.state === "aborted") return { ...record, headCommit: record.candidateCommit, clean: true, conflictingPaths: [] as string[], operationActive: false, sequencerState: [] as string[] };
  const checkout = await ownedCheckout(root, record, store);
  const state = await inspectGitCheckout(checkout.root);
  const sequencerState = await inspectGitOperationState(checkout.root);
  const ready = ["ready", "advanced"].includes(record.state) && state.clean && sequencerState.length === 0 && state.commit === record.candidateCommit;
  return { ...record, state: state.conflictingPaths.length ? "conflicted" as const : ready ? record.state : sequencerState.length ? "active" as const : "failed" as const,
    headCommit: state.commit, clean: state.clean, conflictingPaths: state.conflictingPaths, operationActive: sequencerState.length > 0, sequencerState };
}
export async function inspectIsolatedOperation(root: string, operationId: string, store: ManagedWorkspaceStore) {
  return inspectRecord(root, await loadRecord(root, operationId), store);
}
async function finishStep(root: string, record: OperationRecord, checkoutRoot: string, succeeded: boolean, store: ManagedWorkspaceStore) {
  const state = await inspectGitCheckout(checkoutRoot);
  const active = await inspectGitOperationState(checkoutRoot);
  record.state = state.conflictingPaths.length ? "conflicted" : succeeded && state.clean && !active.length ? "ready" : "failed";
  record.candidateCommit = record.state === "ready" ? state.commit : null;
  await saveRecord(root, record);
  return inspectRecord(root, record, store);
}
export async function beginIsolatedOperation(root: string, input: { operation: IsolatedOperationKind; targetBranch: string; sourceRef: string; expectedTargetCommit: string; mainline?: number }, store: ManagedWorkspaceStore) {
  if (!["merge", "cherry-pick", "revert", "rebase"].includes(input.operation)) throw fail("Unsupported isolated operation.");
  const target = await inspectGitBranchState(root, input.targetBranch);
  if (!/^[a-f0-9]{40,64}$/.test(input.expectedTargetCommit) || target.selectedBranch?.commit !== input.expectedTargetCommit) throw fail("Target branch changed before operation creation.");
  if ((input.operation === "merge" || input.operation === "rebase") && input.mainline !== undefined) throw fail("Merge does not accept a mainline parent.");
  const sourceCommit = (input.operation === "merge" || input.operation === "rebase") ? (await inspectGitHistory(root, { ref: input.sourceRef, maxCount: 1 })).resolvedCommit : (await resolveGitTransformCommit(root, { commit: input.sourceRef, mainline: input.mainline })).commit;
  const operationId = randomBytes(16).toString("hex");
  const checkoutName = `op-${operationId}`;
  const temporaryBranch = `champcity-mcp/${checkoutName}`;
  const created = await createManagedWorktree(root, { checkoutName, branchName: temporaryBranch, sourceRef: input.expectedTargetCommit }, store);
  const record: OperationRecord = { operationId, operation: input.operation, targetBranch: input.targetBranch, targetCommit: input.expectedTargetCommit, sourceCommit, workspaceId: created.workspaceId, temporaryBranch, checkoutName, mainline: input.mainline, state: "active", candidateCommit: null };
  try { await saveRecord(root, record); }
  catch { await cleanupOperation(root, record, store); throw fail("Operation record could not be persisted; candidate cleaned up."); }
  const checkout = await ownedCheckout(root, record, store);
  const args = input.operation === "rebase" ? ["rebase", "--merge", "--no-autosquash", "--no-autostash", "--no-update-refs", "--no-rebase-merges", "--no-fork-point", "--no-gpg-sign", sourceCommit]
    : input.operation === "merge" ? ["merge", "--no-edit", "--no-stat", "--no-gpg-sign", sourceCommit]
    : [input.operation, "--no-edit", "--no-gpg-sign", ...(input.mainline === undefined ? [] : ["--mainline", String(input.mainline)]), sourceCommit];
  let succeeded = false;
  try { await managedGit(checkout.root, ["-c", "rerere.enabled=false", "-c", "core.editor=true", "-c", "sequence.editor=true", ...args]); succeeded = true; } catch { /* Preserve inspectable operation evidence. */ }
  return finishStep(root, record, checkout.root, succeeded, store);
}
async function continueIsolatedOperationImpl(root: string, operationId: string, store: ManagedWorkspaceStore) {
  const record = await loadRecord(root, operationId);
  if (["aborted", "advanced", "ready"].includes(record.state)) throw fail("Operation is not awaiting continuation.");
  const checkout = await ownedCheckout(root, record, store);
  const state = await inspectGitCheckout(checkout.root);
  if (state.conflictingPaths.length) throw fail("Stage every conflict resolution before continuing.");
  const markers = await inspectGitOperationState(checkout.root);
  if (!markers.includes(expectedMarker(record)) || markers.some((entry) => ![expectedMarker(record), "sequencer", ...(record.operation === "rebase" ? ["CHERRY_PICK_HEAD"] : [])].includes(entry))) throw fail("Unexpected Git operation state; continuation refused.");
  if (record.operation === "rebase") await verifyRebaseState(checkout.root, record);
  else if (state.commit !== record.targetCommit || (await managedGit(checkout.root, ["rev-parse", "--verify", expectedMarker(record) + "^{commit}"])).trim() !== record.sourceCommit) throw fail("Operation endpoints changed before continuation.");
  let succeeded = false;
  try {
    await managedGit(checkout.root, ["-c", "core.editor=true", "-c", "commit.gpgSign=false", record.operation, "--continue"]);
    succeeded = true;
  } catch { /* Keep staged resolution and operation evidence. */ }
  return finishStep(root, record, checkout.root, succeeded, store);
}
async function cleanupOperation(root: string, record: OperationRecord, store: ManagedWorkspaceStore) {
  const checkout = await ownedCheckout(root, record, store);
  if (path.resolve(root) === checkout.root) throw fail("Clean up an operation from its parent workspace.");
  const head = checkout.headCommit;
  if (!head) throw fail("Operation branch endpoint is unavailable.");
  store.unregister(record.workspaceId);
  try { await managedGit(root, ["worktree", "remove", "--force", checkout.root]); }
  catch (error) { await store.registerManaged(checkout.root, checkout.commonDirectory, checkout.checkoutName); throw error; }
  await managedGit(root, ["update-ref", "--no-deref", "-d", `refs/heads/${record.temporaryBranch}`, head]);
}
async function abortIsolatedOperationImpl(root: string, operationId: string, store: ManagedWorkspaceStore) {
  const record = await loadRecord(root, operationId);
  if (record.state === "aborted") return { operationId, state: "aborted" as const, cleaned: true };
  if (record.state === "advanced") throw fail("The completed target advancement cannot be aborted.");
  const checkout = await ownedCheckout(root, record, store);
  const markers = await inspectGitOperationState(checkout.root);
  if (markers.length) {
    if (!markers.includes(expectedMarker(record))) throw fail("Unexpected operation state; abort refused.");
    await managedGit(checkout.root, [record.operation, "--abort"]);
  }
  await cleanupOperation(root, record, store);
  record.state = "aborted";
  record.candidateCommit = null;
  await saveRecord(root, record);
  return { operationId, state: "aborted" as const, cleaned: true };
}
async function advanceIsolatedOperationImpl(root: string, input: { operationId: string; expectedTargetCommit: string; expectedCandidateCommit: string }, store: ManagedWorkspaceStore) {
  const record = await loadRecord(root, input.operationId);
  const state = await inspectRecord(root, record, store);
  if (state.state !== "ready" || input.expectedTargetCommit !== record.targetCommit || input.expectedCandidateCommit !== record.candidateCommit || state.headCommit !== record.candidateCommit) throw fail("Operation endpoints changed or candidate is not clean and complete.");
  const checkout = await ownedCheckout(root, record, store);
  await assertNoGitOperation(checkout.root);
  if (record.operation === "merge" || record.operation === "rebase") {
    const ancestry = await runBoundedGit({ cwd: root, args: ["merge-base", "--is-ancestor", record.sourceCommit, input.expectedCandidateCommit], rejectNonZero: false });
    if (ancestry.exitCode !== 0) throw fail("Merge candidate does not preserve source history.");
  } else {
    const parents = (await managedGit(root, ["show", "--no-patch", "--format=%P", input.expectedCandidateCommit])).trim();
    if (parents !== record.targetCommit) throw fail("Commit-transform candidate must be one commit after the captured target.");
  }
  const advanced = await (record.operation === "rebase" ? replaceGitBranchRef : advanceGitBranchRef)(root, { branchName: record.targetBranch, sourceRef: input.expectedCandidateCommit, expectedCurrentCommit: input.expectedTargetCommit });
  // Retain the clean candidate for evidence; explicit managed cleanup remains available.
  record.state = "advanced";
  await saveRecord(root, record);
  return { operationId: record.operationId, workspaceId: record.workspaceId, state: "advanced" as const, targetBranch: record.targetBranch, commit: advanced.commit };
}

async function skipIsolatedOperationStepImpl(root: string, operationId: string, store: ManagedWorkspaceStore) {
  const record = await loadRecord(root, operationId);
  if (record.operation !== "rebase" || ["ready", "advanced", "aborted"].includes(record.state)) throw fail("Skip requires an active isolated rebase.");
  const checkout = await ownedCheckout(root, record, store);
  await verifyRebaseState(checkout.root, record);
  let succeeded = false;
  try { await managedGit(checkout.root, ["-c", "core.editor=true", "-c", "commit.gpgSign=false", "rebase", "--skip"]); succeeded = true; } catch { /* Retain next conflict or recovery evidence. */ }
  return finishStep(root, record, checkout.root, succeeded, store);
}

const operationLocks = new Map<string, Promise<unknown>>();
async function withOperationLock<T>(root: string, operationId: string, action: () => Promise<T>): Promise<T> {
  const key = (await commonGitDirectory(root)) + ":" + operationId;
  const pending = (operationLocks.get(key) ?? Promise.resolve()).catch(() => {}).then(action);
  operationLocks.set(key, pending);
  try { return await pending; } finally { if (operationLocks.get(key) === pending) operationLocks.delete(key); }
}
export const continueIsolatedOperation = (root: string, operationId: string, store: ManagedWorkspaceStore) => withOperationLock(root, operationId, () => continueIsolatedOperationImpl(root, operationId, store));
export const abortIsolatedOperation = (root: string, operationId: string, store: ManagedWorkspaceStore) => withOperationLock(root, operationId, () => abortIsolatedOperationImpl(root, operationId, store));
export const skipIsolatedOperationStep = (root: string, operationId: string, store: ManagedWorkspaceStore) => withOperationLock(root, operationId, () => skipIsolatedOperationStepImpl(root, operationId, store));
export const advanceIsolatedOperation = (root: string, input: Parameters<typeof advanceIsolatedOperationImpl>[1], store: ManagedWorkspaceStore) => withOperationLock(root, input.operationId, () => advanceIsolatedOperationImpl(root, input, store));
