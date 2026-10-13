import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { AgentHarnessError } from "../../core/applicationErrors";
import { runBoundedGit, withLocalGitExecution, gitCommandIndex } from "../../core/gitExecution";
import { assertValidLocalBranchName, inspectGitHistory, assertNoGitOperation } from "../../repository/gitMutations";
import type { AgentHarnessLocalGitContext } from "./workspaceAccess";
import { assertProviderOwnedRemote, createProviderOwnedRemote, type ProviderOwnedRemote } from "../../repository/providerOwnedRemote";
import { mutateProviderOwnedRemote } from "../../repository/gitRemoteManagement";
import { managedWorkspaceId, verifyManagedCheckout, type ManagedWorkspaceStore } from "../../repository/managedWorktrees";

const denied = (message: string) => new AgentHarnessError("WORKSPACE_ACCESS_DENIED", message);
const precondition = (message: string) => new AgentHarnessError("GIT_EXECUTION_FAILED", message);
const key = (value: string) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
const equal = (left: string, right: string) => key(left) === key(right);
const component = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
const contains = (root: string, target: string) => { const relative = path.relative(key(root), key(target)); return !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`); };
const opaque = (prefix: string) => `${prefix}_${randomBytes(24).toString("hex")}`;
const entryExists = (target: string) => { try { fs.lstatSync(target); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; } };
const sourceDirectory = (value: string) => {
  if (value.split(/[\\/]/).some(segment => segment.toLowerCase() === ".git")) throw denied("Git control directories are not local source targets.");
  return value;
};

/** Application-owned policy, configured through Settings or Operator-delegated typed MCP writes. */
export function canonicalTrustedLocalGitRoots(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 32 || value.some(root => typeof root !== "string")) throw denied("Trusted Local Git Roots must be an array of at most 32 existing directories.");
  return [...new Map(value.map(root => {
    const canonical = ordinaryPath(root);
    if (!fs.statSync(canonical).isDirectory()) throw denied("Trusted Local Git Roots must be existing directories.");
    return [key(canonical), canonical];
  })).values()];
}

function ordinaryPath(value: string): string {
  try {
    if (typeof value !== "string" || !path.isAbsolute(value) || value.startsWith("\\\\") || value.startsWith("//") || value.length > 4096 || /[\0\r\n]/.test(value) || value.split(/[\\/]/).includes("..")) throw new Error();
    const absolute = path.resolve(value);
    let current = path.parse(absolute).root;
    for (const segment of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
      if (process.platform === "win32" && /:|[. ]$/.test(segment)) throw new Error();
      current = path.join(current, segment);
      if (fs.lstatSync(current).isSymbolicLink() || !equal(fs.realpathSync.native(current), current)) throw new Error();
    }
    return fs.realpathSync.native(absolute);
  } catch { throw denied("Local Git path must be canonical, existing and free of redirects or traversal."); }
}

function stamp(target: string): string {
  const stat = fs.lstatSync(target);
  return `${stat.dev}:${stat.ino}:${stat.birthtimeMs}:${stat.isDirectory() ? "directory" : "file"}`;
}
function boundedText(target: string): string {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.nlink !== 1 || stat.size > 65536) throw denied("Git control file must be ordinary, without hardlinks, and within its bounds.");
  return fs.readFileSync(target, "utf8");
}
async function localBranchName(root: string, branchName: string): Promise<void> {
  if (branchName === "HEAD" || branchName.length > 240) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded ordinary local branch name.");
  await assertValidLocalBranchName(root, branchName);
}

interface Identity { root: string; gitDirectory: string; commonDirectory: string; primary: boolean; fingerprint: string }
interface Handle { identity: Identity; expires: number; repositoryHandle: string }
interface RepositorySelection { handle: string; entry: Handle; stale: boolean; contextHandle: string; principal: string; trustedRoots: string[]; configurationId: string }
interface WorktreeRecord { root: string; primary: boolean; branchName: string | null; locked: boolean }
export interface LocalGitCheckoutSummary {
  localCheckoutHandle: string; repositoryHandle: string; primary: boolean; linked: boolean;
  branchName: string | null; detached: boolean; headCommit: string | null; unborn: boolean; clean: boolean; noRemote: boolean;
  locked?: boolean;
}

/** A target adapter. All normal operations remain the existing repository Git primitives. */
export class LocalGitRepositoryAccessService {
  private readonly handles = new Map<string, Handle>();
  private readonly groups = new Map<string, string>();
  private readonly locks = new Map<string, Promise<void>>();
  private readonly contexts = new Map<string, RepositorySelection>();
  private readonly selections = new WeakMap<object, RepositorySelection>();
  private readonly rediscoveryRequired = new WeakMap<object, Set<string>>();
  private readonly sessionLocks = new WeakMap<object, Promise<void>>();
  constructor(private readonly trustedRoots: () => readonly string[], private readonly now: () => number = Date.now,
    private readonly saveTrustedRoots?: (roots: string[]) => void | Promise<void>) {}

  accessConfiguration() {
    const roots = [...this.trustedRoots()];
    const configurationId = createHash("sha256").update(JSON.stringify(roots.map(key).sort())).digest("hex");
    let valid = true;
    try { canonicalTrustedLocalGitRoots(roots); } catch { valid = false; }
    return { configurationId, trustedRootCount: roots.length, available: valid && roots.length > 0,
      configurationMutable: Boolean(this.saveTrustedRoots), maximumRoots: 32 };
  }

  /** Operator-delegated MCP write scope can configure access; it never supplies credentials or shell commands. */
  async configureAccess(input: { operation: "add" | "remove"; directories: string[]; expectedConfigurationId: string }) {
    return this.locked("local-access-configuration", async () => {
      if (!this.saveTrustedRoots) throw denied("Local access configuration is unavailable in this host.");
      const current = this.accessConfiguration();
      if (!/^[a-f0-9]{64}$/.test(input.expectedConfigurationId) || input.expectedConfigurationId !== current.configurationId) throw denied("Local access configuration changed; inspect its current identity before retrying.");
      if (!["add", "remove"].includes(input.operation) || !Array.isArray(input.directories) || !input.directories.length || input.directories.length > 32 ||
        input.directories.some(directory => typeof directory !== "string" || !path.isAbsolute(directory) || directory.length > 4096 || /[\0\r\n]/.test(directory) || directory.split(/[\\/]/).includes(".."))) throw denied("Select at most 32 explicit ordinary access directories.");
      const roots = [...this.trustedRoots()];
      let next: string[];
      if (input.operation === "add") next = canonicalTrustedLocalGitRoots([...new Map([...roots, ...canonicalTrustedLocalGitRoots(input.directories)].map(root => [key(root), root])).values()]);
      else {
        const removing = new Set(input.directories.map(key));
        if ([...removing].some(directory => !roots.some(root => key(root) === directory))) throw denied("Removal requires an exact currently configured access directory.");
        next = canonicalTrustedLocalGitRoots(roots.filter(root => !removing.has(key(root))));
      }
      await this.saveTrustedRoots(next);
      this.revokeRemovedTrustedRoots(next);
      return this.accessConfiguration();
    });
  }


  /** Apply every successful policy update, including Settings writes between MCP calls. */
  revokeRemovedTrustedRoots(next: readonly string[]): void {
    for (const context of this.contexts.values()) if (context.trustedRoots.some(root => !next.some(current => equal(root, current)))) context.stale = true;
  }

  private permitted(value: string): string {
    const roots = canonicalTrustedLocalGitRoots([...this.trustedRoots()]);
    if (!roots.length) throw denied("Local Git access requires configured access roots; inspect_local_git_access and configure_local_git_access manage this policy.");
    const canonical = ordinaryPath(value);
    if (!roots.some(root => contains(root, canonical))) throw denied("Local Git target is outside Trusted Local Git Roots.");
    return canonical;
  }

  private metadataSafe(directory: string, deadline = Date.now() + 10000): void {
    let count = 0;
    const visit = (current: string, depth: number) => {
      if (++count > 50000 || depth > 32) throw denied("Git control metadata exceeds the validation bound.");
      if (Date.now() >= deadline) throw new AgentHarnessError("GIT_TIMEOUT", "Local Git metadata validation deadline reached.");
      ordinaryPath(current);
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() && !stat.isFile() || stat.isFile() && stat.nlink > 1) throw denied("Git control metadata must contain ordinary files and directories without external hardlinks.");
      if (stat.isDirectory()) {
        const directory = fs.opendirSync(current);
        try { for (let child = directory.readSync(); child; child = directory.readSync()) visit(path.join(current, child.name), depth + 1); }
        finally { directory.closeSync(); }
      }
      else if (/^(config|config\.worktree)$/i.test(path.basename(current)) && /^\s*\[\s*include(?:If)?(?:\s|\])/im.test(boundedText(current))) throw denied("Local Git repository configuration must not include external configuration files.");
      else if (["alternates", "http-alternates", "grafts"].includes(component(path.basename(current)))) throw denied("Redirected Git object storage is not permitted for local targets.");
    };
    visit(directory, 0);
  }

  private filesystemIdentity(root: string): Identity {
    root = this.permitted(root);
    if (!fs.statSync(root).isDirectory()) throw denied("Local checkout must be a directory.");
    const metadata = this.permitted(path.join(root, ".git"));
    const pointerFile = fs.statSync(metadata).isFile();
    let primary = !pointerFile;
    let gitDirectory = metadata, commonDirectory = metadata;
    if (!primary) {
      const pointer = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(boundedText(metadata));
      if (!pointer) throw denied("Linked checkout has invalid Git metadata.");
      gitDirectory = this.permitted(path.resolve(root, pointer[1]));
      if (entryExists(path.join(gitDirectory, "commondir"))) {
        const common = boundedText(this.permitted(path.join(gitDirectory, "commondir"))).trim();
        if (!common) throw denied("Linked Git common-directory pointer is empty.");
        commonDirectory = this.permitted(path.resolve(gitDirectory, common));
        if (!equal(path.dirname(path.dirname(gitDirectory)), commonDirectory) || component(path.basename(path.dirname(gitDirectory))) !== "worktrees") throw denied("Linked Git directory has an invalid common-directory relationship.");
        const backlink = this.permitted(path.resolve(gitDirectory, boundedText(this.permitted(path.join(gitDirectory, "gitdir"))).trim()));
        if (!equal(backlink, metadata)) throw denied("Linked Git metadata points to a different checkout.");
      } else { commonDirectory = gitDirectory; primary = true; }
    }
    if (!fs.statSync(commonDirectory).isDirectory() ||
      !fs.statSync(this.permitted(path.join(commonDirectory, "objects"))).isDirectory() ||
      !fs.statSync(this.permitted(path.join(commonDirectory, "refs"))).isDirectory()) throw denied("Local repository requires ordinary trusted Git control metadata.");
    boundedText(this.permitted(path.join(commonDirectory, "HEAD")));
    const fingerprint = [root, gitDirectory, commonDirectory].map(key).join("\0") + "\0" +
      [root, metadata, gitDirectory, commonDirectory].map(stamp).join("\0") + (pointerFile ? "\0" + boundedText(metadata) : "") + (primary ? "" : "\0" + boundedText(path.join(gitDirectory, "commondir")) + boundedText(path.join(gitDirectory, "gitdir")));
    return { root, gitDirectory, commonDirectory, primary, fingerprint };
  }

  private async records(root: string): Promise<WorktreeRecord[]> {
    const output = (await runBoundedGit({ cwd: root, args: ["worktree", "list", "--porcelain", "-z"] })).stdout;
    const records = output.split("\0\0").filter(Boolean).map((record, index) => {
      const fields = record.split("\0");
      if (fields.some(field => field.startsWith("prunable"))) throw denied("Dangling worktree metadata is not a usable local target.");
      return { root: fields.find(field => field.startsWith("worktree "))?.slice(9) ?? "", primary: index === 0 && !fields.includes("bare"), bare: fields.includes("bare"),
        branchName: fields.find(field => field.startsWith("branch refs/heads/"))?.slice(18) ?? null,
        locked: fields.some(field => field.startsWith("locked")) };
    });
    if (!records.length || records.length > 50) throw denied("Local worktree inventory exceeds its bound.");
    const identity = this.filesystemIdentity(root);
    // Git lists a --separate-git-dir primary by its metadata path. The requested
    // checkout must still agree with show-toplevel/absolute-git-dir below.
    if (identity.primary && records[0]?.primary && equal(records[0].root, identity.commonDirectory)) records[0].root = identity.root;
    for (const [index, record] of records.entries()) if (record.bare &&
      (index !== 0 || !equal(this.permitted(record.root), identity.commonDirectory))) throw denied("Bare inventory entry does not identify the trusted common directory.");
    return records.filter(record => !record.bare);
  }

  private async verified(root: string, deadline?: number): Promise<Identity> {
    const identity = this.filesystemIdentity(root);
    this.metadataSafe(identity.commonDirectory, deadline);
    const records = await this.records(identity.root);
    const seen = new Set<string>();
    for (const record of records) {
      const sibling = this.filesystemIdentity(record.root);
      if (seen.has(key(sibling.root)) || !equal(sibling.commonDirectory, identity.commonDirectory) || sibling.primary !== record.primary ||
        (record.primary && !equal(sibling.gitDirectory, identity.commonDirectory))) throw denied("Worktree inventory does not match local repository identity.");
      seen.add(key(sibling.root));
      const top = (await runBoundedGit({ cwd: sibling.root, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
      const gitDir = (await runBoundedGit({ cwd: sibling.root, args: ["rev-parse", "--absolute-git-dir"] })).stdout.trim();
      const common = (await runBoundedGit({ cwd: sibling.root, args: ["rev-parse", "--git-common-dir"] })).stdout.trim();
      if (!equal(this.permitted(top), sibling.root) || !equal(this.permitted(gitDir), sibling.gitDirectory) ||
        !equal(this.permitted(path.resolve(sibling.root, common)), identity.commonDirectory)) throw denied("Git resolved a different local repository or checkout.");
    }
    if (!seen.has(key(identity.root))) throw denied("Local checkout is absent from its repository worktree inventory.");
    return identity;
  }

  private async helperPolicy(root: string): Promise<string[]> {
    const names = (await runBoundedGit({ cwd: root, args: ["config", "--null", "--list", "--name-only"] })).stdout.split("\0").filter(Boolean);
    if (names.some(name => /^merge\..*\.driver$|^remote\..*\.(vcs|uploadpack|receivepack)$|^core\.gitproxy$/i.test(name))) throw denied("Configured external merge or transport helpers are not permitted for local Git targets.");
    const filters = new Set(names.filter(name => /^filter\..*\.(clean|smudge|process|required)$/i.test(name)).map(name => name.slice(0, name.lastIndexOf("."))));
    return [...filters].flatMap(name => [`${name}.clean=`, `${name}.smudge=`, `${name}.process=`, `${name}.required=false`]);
  }

  private issue(identity: Identity): { handle: string; repositoryHandle: string } {
    for (const [handle, entry] of this.handles) if (entry.expires <= this.now()) this.handles.delete(handle);
    const activeGroups = new Set([...this.handles.values()].map(entry => entry.repositoryHandle));
    for (const [group, handle] of this.groups) if (!activeGroups.has(handle)) this.groups.delete(group);
    for (const [handle, entry] of this.handles) if (entry.identity.fingerprint === identity.fingerprint) return { handle, repositoryHandle: entry.repositoryHandle };
    if (this.handles.size >= 1000) throw denied("Local Git handle capacity reached; restart the worker or wait for expiry.");
    const commonKey = key(identity.commonDirectory) + "\0" + stamp(identity.commonDirectory);
    let repositoryHandle = this.groups.get(commonKey);
    if (!repositoryHandle) { repositoryHandle = opaque("local_repo"); this.groups.set(commonKey, repositoryHandle); }
    const handle = opaque("local_checkout");
    this.handles.set(handle, { identity, repositoryHandle, expires: this.now() + 30 * 60_000 });
    return { handle, repositoryHandle };
  }

  private async headSummary(identity: Identity) {
    const { handle, repositoryHandle } = this.issue(identity);
    const branch = await runBoundedGit({ cwd: identity.root, args: ["symbolic-ref", "--quiet", "--short", "HEAD"], rejectNonZero: false });
    const head = await runBoundedGit({ cwd: identity.root, args: ["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], rejectNonZero: false });
    if (branch.exitCode !== 0 && branch.exitCode !== 1 || head.exitCode !== 0 && head.exitCode !== 1) throw precondition("Local HEAD could not be inspected.");
    const headCommit = head.exitCode === 0 ? head.stdout.trim() : null;
    if (headCommit && !/^[a-f0-9]{40,64}$/.test(headCommit) || !headCommit && branch.exitCode !== 0) throw precondition("Local HEAD is neither a commit nor an unborn branch.");
    return { localCheckoutHandle: handle, repositoryHandle, primary: identity.primary, linked: !identity.primary,
      branchName: branch.exitCode === 0 ? branch.stdout.trim() : null, detached: branch.exitCode === 1, headCommit, unborn: !headCommit };
  }

  private async summary(identity: Identity): Promise<LocalGitCheckoutSummary> {
    const head = await this.headSummary(identity);
    const status = await runBoundedGit({ cwd: identity.root, args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"] });
    const remotes = await runBoundedGit({ cwd: identity.root, args: ["remote"] });
    return { ...head, clean: !status.stdout, noRemote: !remotes.stdout.trim() };
  }

  async discover(input: { directory: string; maxDepth?: number; maxRepositories?: number }, session?: object) {
    const selected = this.permitted(sourceDirectory(input.directory));
    if (!fs.statSync(selected).isDirectory()) throw denied("Discovery requires an existing directory.");
    const maxDepth = input.maxDepth ?? 6, maxRepositories = input.maxRepositories ?? 50;
    if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 6 || !Number.isInteger(maxRepositories) || maxRepositories < 1 || maxRepositories > 50) throw new AgentHarnessError("INVALID_INPUT", "Discovery limits exceed their bounds.");
    const deadline = Date.now() + 10000;
    const result = await withLocalGitExecution(async () => {
      const repositories = new Map<string, { repositoryHandle: string; checkouts: LocalGitCheckoutSummary[] }>();
      const queue = [{ root: selected, depth: 0 }]; let visitedEntries = 0, checkouts = 0;
      const reasons = new Set<string>();
      while (queue.length) {
        if (Date.now() >= deadline) { reasons.add("deadline"); break; }
        const current = queue.shift()!;
        if (entryExists(path.join(current.root, ".git"))) {
          try {
            const identity = await this.verified(current.root, deadline);
            const groupKey = key(identity.commonDirectory);
            if (!repositories.has(groupKey)) {
              if (repositories.size >= maxRepositories) { reasons.add("repository-limit"); break; }
              const records = await this.records(identity.root);
              if (checkouts + records.length > 50) { reasons.add("checkout-limit"); break; }
              const summaries: LocalGitCheckoutSummary[] = [];
              const config = await this.helperPolicy(identity.root);
              for (const record of records) summaries.push(await withLocalGitExecution(() => this.summary(this.filesystemIdentity(record.root)), { config, deadline }));
              repositories.set(groupKey, { repositoryHandle: summaries[0].repositoryHandle, checkouts: summaries });
              checkouts += summaries.length;
            }
          } catch (error) {
            if (equal(current.root, selected)) throw error;
            reasons.add(error instanceof AgentHarnessError && error.code === "GIT_TIMEOUT" ? "deadline" : "invalid-repository");
          }
        }
        const entries: fs.Dirent[] = [];
        const directory = fs.opendirSync(current.root);
        try {
          for (let entry = directory.readSync(); entry; entry = directory.readSync()) {
            if (Date.now() >= deadline) { reasons.add("deadline"); queue.length = 0; break; }
            if (++visitedEntries > 2000) { reasons.add("entry-limit"); queue.length = 0; break; }
            entries.push(entry);
          }
        } finally { directory.closeSync(); }
        entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
        if (current.depth >= maxDepth) { if (entries.some(entry => entry.isDirectory() && entry.name !== ".git")) reasons.add("depth-limit"); continue; }
        for (const entry of entries) {
          if (visitedEntries > 2000 || Date.now() >= deadline) break;
          if (!entry.isDirectory() || entry.isSymbolicLink() || /^(\.git|node_modules|vendor|dist|build|out|coverage|Downloads|\.cache|\.venv)$/i.test(entry.name)) continue;
          const child = path.join(current.root, entry.name);
          try { queue.push({ root: this.permitted(child), depth: current.depth + 1 }); } catch { reasons.add("redirect-skipped"); }
        }
      }
      return { repositories: [...repositories.values()], partial: reasons.size > 0, reasons: [...reasons].sort(), visitedEntries: Math.min(visitedEntries, 2000) };
    }, { deadline });
    if (session) for (const repository of result.repositories) this.rediscoveryRequired.get(session)?.delete(repository.repositoryHandle);
    return result;
  }

  private async locked<T>(identity: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(identity) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    const tail = previous.then(() => next);
    this.locks.set(identity, tail);
    await previous;
    try { return await operation(); } finally { release(); if (this.locks.get(identity) === tail) this.locks.delete(identity); }
  }

  releaseSession(session: object): void { this.selections.delete(session); this.rediscoveryRequired.delete(session); }

  private invalidateSelection(selection: RepositorySelection, session: object): void {
    selection.stale = true;
    // Retire only the stale selected checkout. Other sessions may use intact siblings.
    this.handles.delete(selection.handle);
    const required = this.rediscoveryRequired.get(session) ?? new Set<string>();
    if (required.size >= 1000 && !required.has(selection.entry.repositoryHandle)) throw denied("Session rediscovery capacity reached; reconnect before selecting another repository.");
    required.add(selection.entry.repositoryHandle);
    this.rediscoveryRequired.set(session, required);
  }

  /** Session identities are supplied by the transport, never by model arguments. */
  async inSession<T>(session: object | undefined, operation: (session: object) => Promise<T>): Promise<T> {
    if (!session) throw new AgentHarnessError("REPOSITORY_CONTEXT_REQUIRED", "This MCP session must select_repository_context before routine local Git operations.");
    const previous = this.sessionLocks.get(session) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => { release = resolve; });
    const tail = previous.then(() => next);
    this.sessionLocks.set(session, tail);
    await previous;
    try { return await operation(session); } finally { release(); if (this.sessionLocks.get(session) === tail) this.sessionLocks.delete(session); }
  }

  /** Portable capabilities belong to this host service, not to a transport. */
  async inContext<T>(session: object | undefined, contextHandle: string | undefined, principal: string | undefined,
    operation: (context: object) => Promise<T>): Promise<T> {
    if (contextHandle !== undefined) {
      const context = this.contexts.get(contextHandle);
      if (!context || context.principal !== (principal ?? "host-local")) throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Repository context is unavailable; rediscover and reselect.");
      return this.inSession(context, async identity => { this.selectedHandle(identity); return operation(identity); });
    }
    return this.inSession(session, async identity => {
      this.selectedHandle(identity);
      if (this.selections.get(identity)!.principal !== (principal ?? "host-local")) throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Repository context is unavailable; rediscover and reselect.");
      return operation(identity);
    });
  }

  async selectContext(session: object, input: { repositoryHandle: string; localCheckoutHandle?: string; branchName?: string }, principal = "host-local") {
    this.selections.delete(session); // A failed switch cannot leave an unrelated selection active.
    if (this.rediscoveryRequired.get(session)?.has(input.repositoryHandle)) throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "This session must rediscover the repository before selecting it again.");
    const candidates = [...this.handles.entries()].filter(([, entry]) => entry.repositoryHandle === input.repositoryHandle && entry.expires > this.now());
    const candidate = input.localCheckoutHandle ? candidates.find(([handle]) => handle === input.localCheckoutHandle)
      : candidates.find(([, entry]) => entry.identity.primary) ?? candidates[0];
    if (!candidate) throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Repository identity or checkout is unavailable; rediscover before selecting context.");
    try {
      return await this.withCheckout(candidate[0], async checkout => {
        const availableWorktrees = await this.listWorktrees(checkout);
        const selected = input.localCheckoutHandle ? availableWorktrees.find(item => item.localCheckoutHandle === input.localCheckoutHandle)
          : input.branchName ? availableWorktrees.find(item => item.branchName === input.branchName) : availableWorktrees.find(item => item.primary) ?? availableWorktrees[0];
        if (!selected || input.branchName && selected.branchName !== input.branchName) throw new AgentHarnessError("INVALID_INPUT", "Select an available checkout with the requested active branch; selection does not change branches.");
        const entry = this.handles.get(selected.localCheckoutHandle)!;
        for (const [handle, context] of this.contexts) if (context.entry.expires <= this.now() || context.stale) this.contexts.delete(handle);
        if (this.contexts.size >= 1000) throw denied("Repository context capacity reached; wait for expiry.");
        const repositoryContextHandle = opaque("local_context");
        const trustedRoots = [...this.trustedRoots()].filter(root => [entry.identity.root, entry.identity.gitDirectory, entry.identity.commonDirectory].some(target => contains(root, target)));
        const selection: RepositorySelection = { handle: selected.localCheckoutHandle, entry, stale: false, contextHandle: repositoryContextHandle, principal, trustedRoots, configurationId: this.accessConfiguration().configurationId };
        this.contexts.set(repositoryContextHandle, selection);
        this.selections.set(selection, selection);
        this.selections.set(session, selection);
        return { repositoryContextHandle, repositoryHandle: input.repositoryHandle, availableWorktrees, selectedCheckout: selected, activeBranch: selected.branchName, headCommit: selected.headCommit };
      });
    } catch (error) {
      if (error instanceof AgentHarnessError && error.code === "INVALID_INPUT") throw error;
      this.invalidateSelection({ handle: candidate[0], entry: candidate[1], stale: true, contextHandle: "", principal, trustedRoots: [], configurationId: "" }, session);
      throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Repository verification failed; rediscover before selecting context.");
    }
  }

  selectedHandle(session: object): string {
    const selection = this.selections.get(session);
    if (!selection) throw new AgentHarnessError("REPOSITORY_CONTEXT_REQUIRED", "Select_repository_context is required in this MCP session.");
    if (selection.stale || selection.trustedRoots.some(root => !this.trustedRoots().some(current => equal(root, current))) || selection.entry.expires <= this.now() || this.handles.get(selection.handle) !== selection.entry) {
      this.invalidateSelection(selection, session);
      throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Selected repository context is stale; rediscover and select_repository_context again.");
    }
    return selection.handle;
  }

  async verifyContext(session: object, checkout: AgentHarnessLocalGitContext) {
    const selection = this.selections.get(session)!;
    this.selectedHandle(session);
    try {
      // withCheckout already verifies every checkout against Git's worktree inventory.
      const identity = this.filesystemIdentity(selection.entry.identity.root);
      if (identity.fingerprint !== selection.entry.identity.fingerprint) throw denied("Selected identity changed.");
    } catch {
      this.invalidateSelection(selection, session);
      throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Selected repository is inaccessible or its identity changed; rediscover and reselect.");
    }
    if (checkout.repositoryHandle !== selection.entry.repositoryHandle) throw new AgentHarnessError("REPOSITORY_CONTEXT_MISMATCH", "Explicit checkout belongs to another repository; select_repository_context to switch repositories.");
    const selectedCheckout = await this.headSummary(selection.entry.identity);
    return { repositoryContextHandle: selection.contextHandle, repositoryHandle: checkout.repositoryHandle, selectedCheckout, targetCheckout: checkout.localCheckoutHandle === selection.handle ? selectedCheckout : await this.headSummary(this.filesystemIdentity(checkout.root)) };
  }

  async withContext<T>(session: object, handle: string, operation: (checkout: AgentHarnessLocalGitContext, receipt: unknown) => Promise<T>): Promise<T> {
    this.selectedHandle(session);
    const requested = this.handles.get(handle);
    const selected = this.selections.get(session)!;
    if (requested && requested.repositoryHandle !== selected.entry.repositoryHandle) {
      // Verify the selected context before reporting a different target.
      try { await this.withCheckout(selected.handle, checkout => this.verifyContext(session, checkout)); }
      catch { this.invalidateSelection(selected, session); throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Selected repository context is stale; rediscover and reselect."); }
      throw new AgentHarnessError("REPOSITORY_CONTEXT_MISMATCH", "Explicit checkout belongs to another repository; select_repository_context to switch repositories.");
    }
    try {
      return await this.withCheckout(handle, async checkout => {
        const receipt = await this.verifyContext(session, checkout);
        const result = await operation(checkout, receipt);
        if (!this.handles.has(selected.handle)) {
          this.invalidateSelection(selected, session);
          Object.assign(receipt, { stale: true, requiresRediscovery: true });
        } else if (!this.handles.has(handle)) {
          // Removing another checkout does not change the selected checkout's HEAD.
          // The removed target's execution guard is no longer usable for further Git reads.
          Object.assign(receipt, { targetCheckout: null });
        } else {
          const selectedCheckout = await this.headSummary(selected.entry.identity);
          Object.assign(receipt, { selectedCheckout, targetCheckout: handle === selected.handle ? selectedCheckout : await this.headSummary(this.filesystemIdentity(checkout.root)) });
        }
        return result;
      }, () => {
        this.selectedHandle(session);
        if (this.filesystemIdentity(selected.entry.identity.root).fingerprint !== selected.entry.identity.fingerprint) throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Selected repository identity changed during execution; rediscover and reselect.");
      });
    } catch (error) {
      try { if (this.filesystemIdentity(selected.entry.identity.root).fingerprint !== selected.entry.identity.fingerprint) this.invalidateSelection(selected, session); } catch { this.invalidateSelection(selected, session); }
      if (!selected.stale && error instanceof AgentHarnessError && error.code === "WORKSPACE_ACCESS_DENIED" && requested) {
        try { await this.withCheckout(selected.handle, checkout => this.verifyContext(session, checkout)); }
        catch { this.invalidateSelection(selected, session); }
      }
      if (selected.stale) throw new AgentHarnessError("REPOSITORY_CONTEXT_STALE", "Selected repository context is stale; rediscover and reselect before retrying.");
      throw error;
    }
  }

  async withCheckout<T>(handle: string, operation: (context: AgentHarnessLocalGitContext) => Promise<T>, verifySelection?: () => void): Promise<T> {
    const entry = this.handles.get(handle);
    if (!entry || entry.expires <= this.now()) throw denied("Local checkout handle is unknown or expired; rediscover the permitted directory.");
    return this.locked(key(entry.identity.commonDirectory), () => withLocalGitExecution(async () => {
      if (entry.expires <= this.now()) throw denied("Local checkout handle expired while waiting; rediscover the permitted directory.");
      const identity = await this.verified(entry.identity.root);
      if (identity.fingerprint !== entry.identity.fingerprint) { this.handles.delete(handle); throw denied("Local checkout metadata was replaced; rediscovery is required."); }
      const config = await this.helperPolicy(identity.root);
      const verify = (cwd: string, args: string[]) => {
        verifySelection?.();
        if (this.filesystemIdentity(identity.root).fingerprint !== identity.fingerprint) throw denied("Local checkout identity changed during execution.");
        this.metadataSafe(identity.commonDirectory);
        if (args[gitCommandIndex(args)] === "add") this.validateStagingDirectories(cwd, args.slice(args.indexOf("--") + 1));
      };
      return withLocalGitExecution(() => operation({ ...identity, localCheckoutHandle: handle, repositoryHandle: entry.repositoryHandle }), { config, verify });
    }));
  }

  private validateStagingDirectories(root: string, selections: string[]): void {
    let count = 0;
    const visit = (target: string, depth: number) => {
      if (++count > 20000 || depth > 32) throw denied("Selected staging directories exceed their validation bound.");
      if (!entryExists(target)) return;
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) return; // Git records the symlink itself; it never follows it.
      if (!stat.isDirectory()) return;
      this.permitted(target);
      if (!equal(target, root) && entryExists(path.join(target, ".git"))) throw denied("Stage source files within their own checkout; nested repository metadata is not a staging target.");
      const directory = fs.opendirSync(target);
      try { for (let child = directory.readSync(); child; child = directory.readSync()) if (child.name !== ".git") visit(path.join(target, child.name), depth + 1); }
      finally { directory.closeSync(); }
    };
    for (const selection of selections) visit(path.resolve(root, selection), 0);
  }

  async init(input: { directory: string; initialBranch: string }) {
    const root = this.permitted(sourceDirectory(input.directory));
    return this.locked(key(root), () => withLocalGitExecution(async () => {
      this.permitted(root);
      if (!fs.statSync(root).isDirectory() || entryExists(path.join(root, ".git"))) throw precondition("Initialization requires an existing unversioned directory without Git metadata.");
      for (let parent = path.dirname(root); ; parent = path.dirname(parent)) {
        if (entryExists(path.join(parent, ".git"))) throw precondition("Initialization refuses a directory nested beneath Git metadata.");
        if (path.dirname(parent) === parent) break;
      }
      const existing = await runBoundedGit({ cwd: root, args: ["rev-parse", "--git-dir"], rejectNonZero: false });
      if (existing.exitCode === 0) throw precondition("Initialization refuses an existing repository or a directory nested beneath one.");
      await localBranchName(root, input.initialBranch);
      if (entryExists(path.join(root, ".git"))) throw precondition("Git metadata appeared before initialization; no initialization was attempted.");
      try {
        this.permitted(root);
        await runBoundedGit({ cwd: root, args: ["init", "--template=", `--initial-branch=${input.initialBranch}`] });
        return await this.summary(await this.verified(root));
      } catch {
        throw precondition(fs.existsSync(path.join(root, ".git")) ? "Initialization left Git metadata; source was preserved. Inspect this partial initialization before retrying." : "Initialization failed; source was preserved.");
      }
    }));
  }

  async listWorktrees(context: AgentHarnessLocalGitContext): Promise<LocalGitCheckoutSummary[]> {
    const summaries: LocalGitCheckoutSummary[] = [];
    for (const record of await this.records(context.root)) summaries.push({ ...await this.summary(this.filesystemIdentity(record.root)), locked: record.locked });
    return summaries;
  }

  /** Reuse isolated Git operations while keeping their candidates out of workflow registration. */
  async isolatedCheckoutSummary(context: AgentHarnessLocalGitContext, candidateId: string) {
    const candidate = await this.isolatedStore(context).resolve(candidateId);
    await verifyManagedCheckout(candidate.root, context.commonDirectory, path.basename(candidate.root));
    return this.summary(this.filesystemIdentity(candidate.root));
  }

  isolatedStore(context: AgentHarnessLocalGitContext): ManagedWorkspaceStore {
    return {
      cleanOnly: true,
      advanceCurrentTarget: true,
      registerManaged: async (root, common, checkoutName) => {
        const identity = this.filesystemIdentity(root);
        if (!equal(common, context.commonDirectory) || !equal(identity.commonDirectory, common)) throw denied("Isolated checkout belongs to another repository.");
        // createManagedWorktree has already verified exact managed location and endpoints.
        return { candidateId: managedWorkspaceId(common, checkoutName) };
      },
      unregister: () => undefined,
      resolve: async id => {
        const records = await this.records(context.root);
        const record = records.find(item => id === managedWorkspaceId(context.commonDirectory, path.basename(item.root)));
        if (!record) throw denied("Isolated checkout identity is unavailable.");
        const identity = this.filesystemIdentity(record.root);
        if (!equal(identity.commonDirectory, context.commonDirectory)) throw denied("Isolated checkout belongs to another repository.");
        // resolveManagedCheckout verifies the exact managed location after this adapter resolves it.
        return { workspaceId: String(id), root: identity.root, repositoryName: "local-repository", gitBacked: true,
          capabilities: { filesystemRead: true, artifactWrite: true, patchWorkflow: true, gitInspection: true } };
      },
    };
  }

  async clone(remote: ProviderOwnedRemote, input: { destinationDirectory: string; branch?: string }) {
    assertProviderOwnedRemote(remote);
    const destination = path.resolve(sourceDirectory(input.destinationDirectory));
    if (!path.isAbsolute(input.destinationDirectory) || input.destinationDirectory.split(/[\\/]/).includes("..") ||
      !/^[^<>:"|?*\x00-\x1f]+$/.test(path.basename(destination)) || /[. ]$|^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(path.basename(destination))) throw denied("Clone destination must be an explicit ordinary missing directory.");
    const parent = this.permitted(path.dirname(destination));
    return this.locked(key(destination), () => withLocalGitExecution(async () => {
      this.permitted(parent);
      if (entryExists(destination)) throw precondition("Clone never overwrites an existing destination.");
      for (let ancestor = parent; ; ancestor = path.dirname(ancestor)) {
        if (entryExists(path.join(ancestor, ".git"))) throw denied("Clone refuses a destination nested beneath a checkout.");
        if (path.dirname(ancestor) === ancestor) break;
      }
      if (input.branch !== undefined) await localBranchName(parent, input.branch);
      try {
        await runBoundedGit({ cwd: parent, args: ["clone", "--no-local", "--no-hardlinks", "--no-recurse-submodules", "--template=",
          ...(input.branch ? ["--branch", input.branch] : []), "--", remote.destination, destination] });
        return await this.summary(await this.verified(destination));
      } catch { throw precondition("Clone failed or left a partial destination; inspect it before retrying. No cleanup was attempted."); }
    }, { config: remote.identity.transport === "local" ? ["protocol.file.allow=always"] : [] }));
  }

  async cloneSelected(context: AgentHarnessLocalGitContext, input: { destinationDirectory: string; branch: string; expectedSourceCommit: string }) {
    await localBranchName(context.root, input.branch);
    const commit = (await inspectGitHistory(context.root, { ref: `refs/heads/${input.branch}`, maxCount: 1 })).resolvedCommit;
    if (commit !== input.expectedSourceCommit) throw precondition("Source branch changed; no clone was attempted.");
    const remote = createProviderOwnedRemote({ providerId: "trusted-local", destination: context.root, allowLocalTransport: true });
    const created = await this.clone(remote, { destinationDirectory: input.destinationDirectory, branch: input.branch });
    if (created.headCommit !== commit) throw precondition("Clone source changed; inspect the created destination before retrying. No cleanup was attempted.");
    return { ...created, requiresRepositorySelection: true };
  }

  async bindLocalRemote(context: AgentHarnessLocalGitContext, input: { sourceCheckoutHandle: string; remoteName: string; expectedBinding?: string }) {
    const entry = this.handles.get(input.sourceCheckoutHandle);
    if (!entry || entry.expires <= this.now()) throw denied("Source checkout handle is unknown or expired.");
    const identity = await this.verified(entry.identity.root);
    if (identity.fingerprint !== entry.identity.fingerprint || equal(identity.commonDirectory, context.commonDirectory)) throw denied("Remote source requires an independent currently authorized repository.");
    const remote = createProviderOwnedRemote({ providerId: "trusted-local", destination: identity.root, allowLocalTransport: true });
    const result = await mutateProviderOwnedRemote(context.root, { remoteName: input.remoteName, operation: input.expectedBinding ? "replace" : "add", expectedBinding: input.expectedBinding, remote });
    if (this.filesystemIdentity(identity.root).fingerprint !== identity.fingerprint) throw denied("Local remote source changed; inspect the binding before retrying.");
    return result;
  }

  async setWorktreeLock(context: AgentHarnessLocalGitContext, input: { locked: boolean; expectedLocked: boolean; expectedHead: string; expectedBranch: string; reason?: string }) {
    const before = (await this.records(context.root)).find(record => equal(record.root, context.root));
    const head = (await inspectGitHistory(context.root, { maxCount: 1 })).resolvedCommit;
    if (!before || context.primary || before.locked !== input.expectedLocked || head !== input.expectedHead || before.branchName !== input.expectedBranch) throw precondition("Worktree state changed or is not a linked branch checkout.");
    if (input.reason !== undefined && (!input.reason.trim() || input.reason.length > 2000 || /[\x00-\x1f]/.test(input.reason))) throw denied("Select a bounded worktree lock reason.");
    if (input.locked === before.locked) return { ...await this.summary(this.filesystemIdentity(context.root)), locked: before.locked };
    await runBoundedGit({ cwd: context.root, args: ["worktree", input.locked ? "lock" : "unlock", ...(input.locked && input.reason ? ["--reason", input.reason] : []), "--", context.root] });
    const after = (await this.records(context.root)).find(record => equal(record.root, context.root)); if (!after || after.locked !== input.locked) throw precondition("Worktree lock did not verify; inspect before retrying.");
    return { ...await this.summary(this.filesystemIdentity(context.root)), locked: after.locked };
  }

  async createWorktree(context: AgentHarnessLocalGitContext, input: { destinationDirectory: string; branchName: string; sourceRef?: string }) {
    const destination = path.resolve(sourceDirectory(input.destinationDirectory));
    if (!path.isAbsolute(input.destinationDirectory) || input.destinationDirectory.split(/[\\/]/).includes("..") || entryExists(destination)) throw precondition("Worktree destination must be an explicit nonexisting directory.");
    this.permitted(path.dirname(destination));
    // Validate the missing child lexically, including Windows device names/streams.
    if (!/^[^<>:"|?*\x00-\x1f]+$/.test(path.basename(destination)) || /[. ]$|^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(path.basename(destination))) throw precondition("Worktree destination name is invalid.");
    await localBranchName(context.root, input.branchName);
    await assertNoGitOperation(context.root);
    const head = await runBoundedGit({ cwd: context.root, args: ["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], rejectNonZero: false });
    if (head.exitCode !== 0) throw precondition("Create the first commit before creating a linked worktree.");
    if ((await this.records(context.root)).some(record => record.branchName === input.branchName)) throw precondition("Branch is already checked out in a worktree.");
    const exists = await runBoundedGit({ cwd: context.root, args: ["show-ref", "--verify", "--quiet", `refs/heads/${input.branchName}`], rejectNonZero: false });
    if (input.sourceRef === undefined ? exists.exitCode !== 0 : exists.exitCode !== 1) throw precondition("Select an existing branch, or a new branch with an explicit sourceRef.");
    const commit = (await inspectGitHistory(context.root, { ref: input.sourceRef ?? `refs/heads/${input.branchName}`, maxCount: 1 })).resolvedCommit;
    this.permitted(path.dirname(destination));
    if (entryExists(destination)) throw precondition("Worktree destination appeared during creation.");
    try {
      await runBoundedGit({ cwd: context.root, args: ["worktree", "add", ...(input.sourceRef === undefined ? [] : ["--no-track", "-b", input.branchName]), "--", destination, input.sourceRef === undefined ? input.branchName : commit] });
    } catch {
      throw precondition(entryExists(destination) ? "Worktree creation left a destination or metadata; inspect the partial state. No force cleanup or branch deletion was attempted." : "Worktree creation failed; inspect the branch and worktree inventory before retrying.");
    }
    const identity = await this.verified(destination);
    if (!equal(identity.commonDirectory, context.commonDirectory) || identity.primary) throw denied("Created worktree belongs to another repository.");
    return this.summary(identity);
  }

  async removeWorktree(context: AgentHarnessLocalGitContext, expectedBranch: string) {
    const record = (await this.records(context.root)).find(item => equal(item.root, context.root));
    if (!record || context.primary || record.locked || record.branchName !== expectedBranch) throw precondition("Removal requires an unlocked linked checkout on the exact expected branch.");
    await assertNoGitOperation(context.root);
    const status = await runBoundedGit({ cwd: context.root, args: ["status", "--porcelain=v1", "-z", "--untracked-files=all"] });
    const ignored = await runBoundedGit({ cwd: context.root, args: ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"] });
    if (status.stdout || ignored.stdout) throw precondition("Dirty, untracked or ignored worktree content prevents clean-only removal.");
    const primary = (await this.records(context.root))[0].root;
    await runBoundedGit({ cwd: primary, args: ["worktree", "remove", "--", context.root] });
    this.handles.delete(context.localCheckoutHandle);
    return { localCheckoutHandle: context.localCheckoutHandle, removed: true, branchName: expectedBranch };
  }
}

/** Redact paths even when they originate in repository-controlled diagnostic/message text. */
export function redactLocalGitResult(value: unknown): unknown {
  if (typeof value === "string") return value
    .replace(/\b(?:https?|ssh):\/\/[^\s"<>]*@[^\s"<>]+/gi, "<REDACTED_REMOTE>")
    .replace(/\b(?:https?):\/\/[^\s"<>]*[?][^\s"<>]+/gi, "<REDACTED_REMOTE>")
    .replace(/\b[A-Z]:[\\/][^\s"<>]+|\\\\[^\s"<>]+|(?:^|\s)\/[^\s"<>]+/gi, "<LOCAL_PATH>");
  if (Array.isArray(value)) return value.map(redactLocalGitResult);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, redactLocalGitResult(entry)]));
  return value;
}
