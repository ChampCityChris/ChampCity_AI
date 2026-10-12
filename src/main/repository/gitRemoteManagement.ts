import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";
import { runBoundedGit } from "../core/gitExecution";
import { inspectGitRemotes } from "./gitMutations";
import { assertProviderOwnedRemote, remoteDestinationIdentity, type ProviderOwnedRemote } from "./providerOwnedRemote";

const fail = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
export function boundedRemoteName(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded remote name.");
  return value;
}
async function values(root: string, args: string[]): Promise<string[]> {
  const result = await runBoundedGit({ cwd: root, args, rejectNonZero: false });
  if (result.exitCode !== 0 && result.exitCode !== 1) throw fail("Remote configuration could not be inspected.");
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

export async function inspectGitRemote(root: string, remoteInput: string) {
  const remote = boundedRemoteName(remoteInput);
  const names = await values(root, ["remote"]);
  if (!names.includes(remote)) throw fail("The selected remote is not configured.");
  // get-url accounts for Git's insteadOf/pushInsteadOf rewrites.
  const fetch = await values(root, ["remote", "get-url", "--all", remote]);
  const push = await values(root, ["remote", "get-url", "--push", "--all", remote]);
  const fetchDestinations = fetch.map(remoteDestinationIdentity), pushDestinations = push.map(remoteDestinationIdentity);
  const mirrorValues = await values(root, ["config", "--get-all", "--bool", `remote.${remote}.mirror`]);
  const mirror = mirrorValues.includes("true");
  const destinationsEqual = fetch.length === 1 && push.length === 1 && fetch[0] === push[0];
  const binding = createHash("sha256").update(JSON.stringify({ fetch, push, mirrorValues })).digest("hex");
  return { remote, fetchDestinations, pushDestinations, destinationsEqual, mirror, binding, tracking: await inspectGitRemotes(root) };
}

export async function inspectGitRemoteRefs(root: string, input: { remote: string; refClass?: "branches" | "tags" | "all"; pattern?: string }) {
  const remote = await inspectGitRemote(root, input.remote);
  if (!remote.destinationsEqual || remote.mirror) throw fail("Exact ref inspection requires one matching non-mirroring destination.");
  if (input.refClass !== undefined && !["branches", "tags", "all"].includes(input.refClass)) throw fail("Unsupported remote ref class.");
  if (input.pattern !== undefined && (!/^refs\/(heads|tags)\/[a-zA-Z0-9_./*+-]+$/.test(input.pattern) || input.pattern.length > 240 || input.pattern.includes(".."))) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded heads/tags ref pattern.");
  const args = ["ls-remote", ...(input.refClass === "branches" ? ["--heads"] : input.refClass === "tags" ? ["--tags"] : []), "--", remote.remote];
  if (input.pattern) args.push(input.pattern);
  else if (!input.refClass || input.refClass === "all") args.push("refs/heads/*", "refs/tags/*");
  const result = await runBoundedGit({ cwd: root, args, stdoutLimitBytes: 262144 });
  const entries = result.stdout.split(/\r?\n/).filter(Boolean).map(line => {
    const match = /^([a-f0-9]{40}|[a-f0-9]{64})\t(refs\/(?:heads|tags)\/[^\s]+)$/.exec(line);
    if (!match) { if (/\tHEAD$/.test(line)) return null; throw fail("Remote returned invalid ref metadata."); }
    return { ref: match[2], objectId: match[1], peeled: match[2].endsWith("^{}") };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  if (entries.length > 1000 || new Set(entries.map(entry => entry.ref)).size !== entries.length) throw fail("Remote ref inventory exceeds its bound or is ambiguous.");
  return { remote: remote.remote, binding: remote.binding, refs: entries };
}

/** Hold Git's config lock through CAS and replacement; preserve unrelated configuration. */
export async function mutateProviderOwnedRemote(root: string, input: { remoteName: string; operation: "add" | "replace" | "remove"; remote: ProviderOwnedRemote; expectedBinding?: string }) {
  assertProviderOwnedRemote(input.remote);
  const name = boundedRemoteName(input.remoteName);
  if (!["add", "replace", "remove"].includes(input.operation)) throw fail("Unsupported remote mutation.");
  const common = path.resolve(root, (await runBoundedGit({ cwd: root, args: ["rev-parse", "--git-common-dir"] })).stdout.trim());
  const config = path.join(common, "config"), lock = `${config}.lock`;
  const stat = fs.lstatSync(config);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink > 1 || stat.size > 65536) throw fail("Remote configuration must be an ordinary bounded file.");
  let descriptor: number;
  try { descriptor = fs.openSync(lock, "wx", stat.mode); } catch { throw fail("Repository configuration is busy; no remote mutation was attempted."); }
  let ownsLock = true;
  try {
    const original = fs.readFileSync(config);
    fs.writeFileSync(descriptor, original); fs.closeSync(descriptor); descriptor = -1;
    const names = await values(root, ["remote"]);
    for (const field of ["url", "pushurl", "mirror", "fetch"]) {
      const effective = await runBoundedGit({ cwd: root, args: ["config", "--null", "--get-all", `remote.${name}.${field}`], rejectNonZero: false });
      const local = await runBoundedGit({ cwd: root, args: ["config", "--file", config, "--null", "--get-all", `remote.${name}.${field}`], rejectNonZero: false });
      if (![0, 1].includes(effective.exitCode ?? -1) || ![0, 1].includes(local.exitCode ?? -1) || effective.stdout !== local.stdout) throw fail("Inherited or worktree-specific remote configuration prevents bounded mutation.");
    }
    if (input.operation === "add") {
      if (input.expectedBinding !== undefined || names.includes(name)) throw fail("Remote add requires an absent remote.");
    } else {
      if (!input.expectedBinding || !names.includes(name)) throw fail("Remote replacement/removal requires an exact current binding.");
      const current = await inspectGitRemote(root, name);
      if (current.binding !== input.expectedBinding || !current.destinationsEqual || current.mirror) throw fail("Remote binding changed or is ambiguous; no mutation was attempted.");
      if (input.operation === "remove" && current.fetchDestinations[0].identity !== input.remote.identity.identity) throw fail("Removal requires the expected provider destination.");
    }
    if (input.operation !== "add") await runBoundedGit({ cwd: root, args: ["config", "--file", lock, "--remove-section", `remote.${name}`] });
    if (input.operation !== "remove") {
      await runBoundedGit({ cwd: root, args: ["config", "--file", lock, "--add", `remote.${name}.url`, input.remote.destination] });
      await runBoundedGit({ cwd: root, args: ["config", "--file", lock, "--add", `remote.${name}.fetch`, `+refs/heads/*:refs/remotes/${name}/*`] });
      // Effective rewrites or worktree-specific overrides must not change the provider-owned destination.
      const rewrites = await runBoundedGit({ cwd: root, args: ["config", "--null", "--get-regexp", "^url\\..*\\.(insteadof|pushinsteadof)$"], rejectNonZero: false });
      if (rewrites.exitCode !== 0 && rewrites.exitCode !== 1 || rewrites.stdout.split("\0").filter(Boolean).some(entry => {
        const separator = entry.indexOf("\n");
        return separator < 0 || input.remote.destination.startsWith(entry.slice(separator + 1));
      })) throw fail("Git destination rewrites conflict with provider ownership.");
    }
    if (!fs.readFileSync(config).equals(original)) throw fail("Repository configuration changed during remote mutation.");
    fs.renameSync(lock, config);
    ownsLock = false;
    if (input.operation === "remove") return { remote: name, removed: true };
    const verified = await inspectGitRemote(root, name);
    if (!verified.destinationsEqual || verified.mirror || verified.fetchDestinations[0].identity !== input.remote.identity.identity) throw fail("Remote verification failed; inspect configuration before retrying.");
    return verified;
  } finally {
    if (descriptor! >= 0) fs.closeSync(descriptor!);
    if (ownsLock && fs.existsSync(lock)) fs.unlinkSync(lock);
  }
}
