import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { IntegrationRepairSnapshot } from "../../../shared/integrationRepairContracts";
import { AgentHarnessError } from "../core/errors";
import { runBoundedGit } from "./boundedGit";
import { inspectIntegrationCheckout, registeredIntegrationCheckout } from "./integrationGit";
import { resolveRepositoryPath } from "./pathPolicy";

const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
export const integrationSourceDigest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
export function assertIntegrationSourceText(bytes: string) {
  if (bytes.includes("\0") || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b/.test(bytes)) throw fail("Integration Repair evidence contains binary or credential-like material.");
}
export function integrationSourceFile(root: string, relativePath: string) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.length > 4096 || /(^|\/)(\.git|node_modules|dist|\.env(?:\..*)?)(\/|$)/i.test(relativePath)) throw fail("Integration Repair path is not eligible source.");
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath || relativePath === ".") throw fail("Integration Repair requires exact contained source paths.");
  const segments = relativePath.split("/");
  for (let index = 1; index <= segments.length; index++) {
    const entry = path.join(root, ...segments.slice(0, index));
    if (fs.existsSync(entry) && fs.lstatSync(entry).isSymbolicLink()) throw fail("Integration Repair source must not be redirected.");
  }
  return resolved.resolvedPath;
}
export function integrationSourceBytes(root: string, relativePath: string): string | null {
  const file = integrationSourceFile(root, relativePath);
  if (!fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.size > 250_000) throw fail("Integration Repair source exceeds its ordinary-text bound.");
  const bytes = fs.readFileSync(file, "utf8");
  assertIntegrationSourceText(bytes);
  return bytes;
}
const hashFile = (root: string, relativePath: string) => { const bytes = integrationSourceBytes(root, relativePath); return bytes === null ? "deleted" : integrationSourceDigest(bytes); };
async function mergeHead(root: string) {
  const result = await runBoundedGit({ cwd: root, args: ["rev-parse", "--verify", "--quiet", "MERGE_HEAD"], rejectNonZero: false });
  if (result.exitCode === 1) return null;
  if (result.exitCode !== 0 || !/^[a-f0-9]{40,64}$/.test(result.stdout.trim())) throw fail("Integration Repair merge state is ambiguous.");
  return result.stdout.trim();
}
export async function snapshotIntegrationRepair(root: string, candidateId: string, editablePaths: string[]): Promise<IntegrationRepairSnapshot> {
  const paths = await registeredIntegrationCheckout(root, candidateId);
  if (!editablePaths.length || editablePaths.length > 32 || new Set(editablePaths).size !== editablePaths.length) throw fail("Integration Repair requires 1–32 distinct bounded source paths.");
  const state = await inspectIntegrationCheckout(root, candidateId);
  const records = (await runBoundedGit({ cwd: paths.checkout, args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"] })).stdout.split("\0").filter(Boolean);
  if (records.length > 256 || records.some((entry) => entry.length < 4 || entry[2] !== " " || /[RC]/.test(entry.slice(0, 2)))) throw fail("Integration Repair changed-file evidence is ambiguous or exceeds its bound.");
  const changed = Object.fromEntries(records.map((entry) => [entry.slice(3), hashFile(paths.checkout, entry.slice(3))]));
  const index = (await runBoundedGit({ cwd: paths.checkout, args: ["ls-files", "--stage", "-z"] })).stdout;
  return { head: state.commit, mergeHead: await mergeHead(paths.checkout), indexDigest: integrationSourceDigest(index), changed,
    editable: Object.fromEntries(editablePaths.map((entry) => [entry, hashFile(paths.checkout, entry)])), unmerged: state.conflictingPaths };
}
export async function integrationRepairDiffs(root: string, input: { candidateId: string; mergeBase: string; incomingCommit: string; targetCommit: string }) {
  await registeredIntegrationCheckout(root, input.candidateId);
  for (const commit of [input.mergeBase, input.incomingCommit, input.targetCommit]) if (!/^[a-f0-9]{40,64}$/.test(commit)) throw fail("Integration Repair diff requires exact refs.");
  const diff = async (ref: string) => (await runBoundedGit({ cwd: root, args: ["diff", "--no-ext-diff", "--no-textconv", "--unified=3", input.mergeBase, ref, "--"], stdoutLimitBytes: 100_000 })).stdout;
  const targetDiff = await diff(input.targetCommit); const incomingDiff = await diff(input.incomingCommit);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{24,})\b|(?:^|\/)\.env(?:[.\s/]|$)/m.test(targetDiff + incomingDiff)) throw fail("Integration Repair diff contains protected evidence.");
  return { targetDiff, incomingDiff };
}
export async function commitIntegrationRepair(root: string, input: { candidateId: string; repairId: string; incomingCommit: string; snapshot: IntegrationRepairSnapshot; editablePaths: string[] }) {
  if (!/^REPAIR\d{2}$/.test(input.repairId)) throw fail("Integration Repair identity is invalid.");
  const paths = await registeredIntegrationCheckout(root, input.candidateId);
  const now = await snapshotIntegrationRepair(root, input.candidateId, input.editablePaths);
  if (now.head !== input.snapshot.head || now.mergeHead !== input.snapshot.mergeHead || now.indexDigest !== input.snapshot.indexDigest || JSON.stringify(now.unmerged) !== JSON.stringify(input.snapshot.unmerged)) throw fail("Integration Repair worker changed Git state; machine continuation is blocked.");
  if (now.mergeHead && now.mergeHead !== input.incomingCommit) throw fail("Integration Repair merge head differs from accepted incoming source.");
  if (now.unmerged.some((entry) => !input.editablePaths.includes(entry))) throw fail("Unmerged entries exist outside bounded repair scope.");
  for (const entry of new Set([...Object.keys(now.changed), ...Object.keys(input.snapshot.changed)])) {
    if (!input.editablePaths.includes(entry) && now.changed[entry] !== input.snapshot.changed[entry]) throw fail("Integration Repair changed source outside its bounded scope.");
  }
  for (const entry of input.editablePaths) {
    const bytes = integrationSourceBytes(paths.checkout, entry);
    if (bytes !== null && /^(?:<{7,}|={7,}|>{7,}|\|{7,})(?: |$)/m.test(bytes)) throw fail("Integration Repair still contains conflict markers.");
  }
  if (input.editablePaths.every((entry) => now.editable[entry] === input.snapshot.editable[entry])) throw fail("Integration Repair has no observed source resolution.");
  await runBoundedGit({ cwd: paths.checkout, args: ["--literal-pathspecs", "add", "--all", "--", ...input.editablePaths] });
  if ((await inspectIntegrationCheckout(root, input.candidateId)).conflictingPaths.length) throw fail("Integration Repair still has unmerged index entries.");
  await runBoundedGit({ cwd: paths.checkout, args: ["diff", "--cached", "--check"] });
  await runBoundedGit({ cwd: paths.checkout, args: ["commit", "--no-gpg-sign", "--message", `Integration ${input.candidateId}: ${input.repairId}`] });
  const after = await inspectIntegrationCheckout(root, input.candidateId);
  if (!after.clean || await mergeHead(paths.checkout)) throw fail("Integration Repair commit did not leave a clean candidate.");
  return { commit: after.commit };
}
