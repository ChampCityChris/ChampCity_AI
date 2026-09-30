import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit, type GitExecutionResult } from "../agentHarness/repository/boundedGit";
import type { ExistingProjectGitAdoptionPlan } from "../../shared/sourceControlContracts";
import { INTEGRATION_POLICY_PATH } from "../../shared/integrationPolicyContracts";
import {
  establishManagedProjectSource,
  type ManagedProjectSourceResult,
} from "./managedProjectSourceService";
import { writeManagedRepositoryIntegrationPolicy } from "./managedRepositoryIntegrationPolicy";

export const EXISTING_PROJECT_GIT_ADOPTION_JOURNAL = ".champcity/migrations/existing-project-git-adoption-v1.json";
export const EXISTING_PROJECT_GIT_ADOPTION_RECEIPT = ".champcity/migrations/existing-project-git-adoption-v1.receipt.json";
const baselineSubject = "ChampCity existing project canonical baseline";
const maximumBaselineParents = 32;
const warningFacts = [
  "Prior Git was detected.",
  "The current source state will become the ChampCity baseline.",
  "The prior branch and worktree layout may stop functioning.",
  "Readable Git history, refs, and remotes will be retained where practical.",
  "Git metadata may be replaced or relocated.",
  "Source files are preserved before normalization.",
] as const;

interface GitRefEvidence { ref: string; revision: string }
interface GitRemoteEvidence { name: string; urls: string[] }
interface GitEvidence {
  refs: GitRefEvidence[];
  branchTips: string[];
  remotes: GitRemoteEvidence[];
  refsDigest: string;
  remotesDigest: string;
  workingStateDigest: string;
}

interface SourceInventory {
  sourcePaths: string[];
  localStatePaths: string[];
}

interface RelocatedLocalState {
  relativePath: string;
  source: string;
  destination: string;
}

interface SnapshotEntries {
  ordinaryFiles: string[];
  links: Array<{ relativePath: string; target: string }>;
}

interface ConversionJournal {
  schemaVersion: 3;
  migrationId: string;
  repositoryId: string;
  planId: string;
  stage: "source-preserved" | "candidate-prepared" | "metadata-cutover" |
    "root-git-relocated" | "worktrees-created" | "verified" | "completed" | "failed";
  migrationRelativePath: string;
  sourceSnapshotRelativePath: string;
  baselineRevision: string | null;
  importedRefCount: number;
  baselineParentCount: number;
  failureReason: string | null;
  failurePhase: string | null;
  originalRootGitAuthoritative: boolean;
  cleanupWarnings: string[];
  retainedRecoveryPaths: string[];
  completedAt: string | null;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message: string): never {
  throw new AgentHarnessError("STALE_SOURCE", message);
}

function existsEntry(target: string): boolean {
  try { fs.lstatSync(target); return true; } catch { return false; }
}

function boundedIdentity(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value);
}

async function git(cwd: string, args: string[], options: {
  optional?: boolean; gitDir?: string; workTree?: string;
} = {}): Promise<string | null> {
  const globals = [
    ...(options.gitDir ? ["--git-dir", options.gitDir] : []),
    ...(options.workTree ? ["--work-tree", options.workTree] : []),
  ];
  try {
    const result = await runBoundedGit({ cwd, args: [...globals, ...args], rejectNonZero: !options.optional });
    return result.exitCode === 0 ? result.stdout.trim() : null;
  } catch (error) {
    if (options.optional) return null;
    throw error;
  }
}

function splitZero(value: string | null): string[] {
  return value ? value.split("\0").filter(Boolean) : [];
}

function canonicalRoot(projectRoot: string): string {
  try {
    const root = fs.realpathSync(projectRoot);
    if (!fs.statSync(root).isDirectory()) throw new Error("not-directory");
    return root;
  } catch {
    fail("Selected Project source directory cannot be safely read.");
  }
}

function applicationRoot(root: string): string {
  const target = path.join(root, ".champcity");
  if (!existsEntry(target)) return target;
  const stat = fs.lstatSync(target);
  if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(fs.realpathSync(target)) !== path.resolve(target)) {
    fail("ChampCity migration storage is redirected or unavailable; no source conversion was attempted.");
  }
  return target;
}

function writeJsonAtomic(target: string, value: unknown): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, target);
  } finally {
    if (existsEntry(temporary)) fs.rmSync(temporary, { force: true });
  }
}

function journalPath(root: string): string {
  return path.join(root, ...EXISTING_PROJECT_GIT_ADOPTION_JOURNAL.split("/"));
}

function receiptPath(root: string): string {
  return path.join(root, ...EXISTING_PROJECT_GIT_ADOPTION_RECEIPT.split("/"));
}

function topology(root: string): ExistingProjectGitAdoptionPlan["topology"] {
  const migrations = path.join(root, ".champcity", "migrations");
  let recoveryStaging = false;
  try {
    recoveryStaging = fs.statSync(migrations).isDirectory() && fs.readdirSync(migrations)
      .some(name => name.startsWith("existing-project-normalization-"));
  } catch { /* absent or unreadable migration storage is handled by source qualification */ }
  return {
    conventionalGit: existsEntry(path.join(root, ".git")),
    managedMetadata: existsEntry(path.join(root, ".champcity", "repository.git")),
    mainCheckout: existsEntry(path.join(root, "Main")),
    devCheckout: existsEntry(path.join(root, "Dev")),
    recoveryStaging,
  };
}

async function readGitEvidence(root: string): Promise<GitEvidence> {
  const [refsRaw, remoteNamesRaw, workTreeRaw, indexRaw] = await Promise.all([
    git(root, ["for-each-ref", "--sort=refname", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"], { optional: true }),
    git(root, ["remote"], { optional: true }),
    git(root, ["--no-pager", "diff-files", "--no-ext-diff", "--raw", "-z"], { optional: true }),
    git(root, ["--no-pager", "diff-index", "--cached", "--no-ext-diff", "--raw", "-z", "HEAD"], { optional: true }),
  ]);
  const refs = (refsRaw ?? "").split(/\r?\n/).map(line => {
    const separator = line.indexOf("\0");
    return separator > 0 ? { ref: line.slice(0, separator), revision: line.slice(separator + 1) } : null;
  }).filter((value): value is GitRefEvidence => Boolean(value && /^refs\/(?:heads|remotes|tags)\//.test(value.ref)
    && /^[0-9a-f]{40,64}$/.test(value.revision)));
  const remoteNames = (remoteNamesRaw ?? "").split(/\r?\n/).filter(name => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(name));
  const remotes: GitRemoteEvidence[] = [];
  for (const name of remoteNames) {
    const urls = (await git(root, ["remote", "get-url", "--all", name], { optional: true }) ?? "")
      .split(/\r?\n/).filter(Boolean).slice(0, 8);
    remotes.push({ name, urls });
  }
  const refLines = refs.map(item => `${item.ref}\0${item.revision}`).sort();
  const remoteLines = remotes.flatMap(remote => remote.urls.map(url => `${remote.name}\0${url}`)).sort();
  return {
    refs,
    branchTips: [...new Set(refs.filter(item => item.ref.startsWith("refs/heads/")).map(item => item.revision))].sort(),
    remotes,
    refsDigest: digest(refLines.join("\n")),
    remotesDigest: digest(remoteLines.join("\n")),
    workingStateDigest: digest(`${workTreeRaw ?? "unreadable"}\0${indexRaw ?? "unreadable"}`),
  };
}

function safeRelativeSourcePath(value: string): boolean {
  if (!value || path.isAbsolute(value) || value.includes("\0")) return false;
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").some(segment => segment === "" || segment === "." || segment === ".." || segment === ".git")
    && normalized !== ".champcity" && !normalized.startsWith(".champcity/");
}

function includedSourcePath(value: string, sourceIsProjectRoot: boolean): boolean {
  if (!safeRelativeSourcePath(value)) return false;
  const first = value.replace(/\\/g, "/").split("/", 1)[0];
  return !sourceIsProjectRoot || (first !== "Main" && first !== "Dev");
}

async function gitSourceInventory(source: string, sourceIsProjectRoot: boolean): Promise<SourceInventory | null> {
  let workTree: GitExecutionResult;
  try { workTree = await runBoundedGit({ cwd: source, args: ["rev-parse", "--is-inside-work-tree"], rejectNonZero: false }); }
  catch { return null; }
  if (workTree.exitCode !== 0 || workTree.stdout.trim() !== "true") return null;
  let trackedResult: GitExecutionResult;
  try {
    trackedResult = await runBoundedGit({ cwd: source, args: ["--no-pager", "ls-files", "-z", "--cached", "--"], rejectNonZero: false });
  } catch { return null; }
  if (trackedResult.exitCode !== 0) return null;
  const trackedPaths = splitZero(trackedResult.stdout).filter(value => includedSourcePath(value, sourceIsProjectRoot));
  const tracked = new Set(trackedPaths);
  const trackedAncestors = new Set<string>();
  for (const trackedPath of trackedPaths) {
    const segments = trackedPath.split("/");
    for (let index = 1; index < segments.length; index += 1) trackedAncestors.add(segments.slice(0, index).join("/"));
  }
  const sourcePaths = new Set<string>();
  const localStatePaths: string[] = [];

  const walk = async (relativeDirectory = ""): Promise<boolean> => {
    const directory = relativeDirectory ? path.join(source, ...relativeDirectory.split("/")) : source;
    let names: string[];
    try { names = fs.readdirSync(directory).sort(); } catch { throw sourcePhaseError("canonical source manifest/materialization", relativeDirectory || "."); }
    const entries = names.map(name => relativeDirectory ? `${relativeDirectory}/${name}` : name)
      .filter(relative => includedSourcePath(relative, sourceIsProjectRoot));
    const candidates = entries.filter(relative => !tracked.has(relative) && !trackedAncestors.has(relative));
    const ignored = new Set<string>();
    for (let offset = 0; offset < candidates.length; offset += 32) {
      const batch = candidates.slice(offset, offset + 32);
      let result: GitExecutionResult;
      try {
        result = await runBoundedGit({ cwd: source, args: ["check-ignore", "--no-index", "-z", "--stdin"],
          stdin: Buffer.from(`${batch.join("\0")}\0`), rejectNonZero: false });
      } catch { return false; }
      if (result.exitCode !== 0 && result.exitCode !== 1) return false;
      for (const value of splitZero(result.stdout)) ignored.add(value.replace(/\\/g, "/"));
    }
    for (const relative of entries) {
      const absolute = path.join(source, ...relative.split("/"));
      let stat: fs.Stats;
      try { stat = fs.lstatSync(absolute); } catch { throw sourcePhaseError("canonical source manifest/materialization", relative); }
      if (tracked.has(relative)) {
        sourcePaths.add(relative);
        continue;
      }
      if (trackedAncestors.has(relative)) {
        if (!stat.isDirectory() || stat.isSymbolicLink()) throw sourcePhaseError("canonical source manifest/materialization", relative);
        if (!(await walk(relative))) return false;
        continue;
      }
      if (ignored.has(relative)) {
        localStatePaths.push(relative);
      } else if (stat.isDirectory() && !stat.isSymbolicLink()) {
        if (!(await walk(relative))) return false;
      } else {
        sourcePaths.add(relative);
      }
    }
    return true;
  };
  if (!(await walk())) return null;
  for (const trackedPath of trackedPaths) sourcePaths.add(trackedPath);
  return { sourcePaths: [...sourcePaths].sort(), localStatePaths: collapseRelativeRoots(localStatePaths) };
}

function collapseRelativeRoots(values: string[]): string[] {
  const accepted: string[] = [];
  for (const value of [...new Set(values.map(item => item.replace(/\\/g, "/")))].sort((left, right) => {
    const depth = left.split("/").length - right.split("/").length;
    return depth || left.localeCompare(right);
  })) {
    if (!accepted.some(parent => value === parent || value.startsWith(`${parent}/`))) accepted.push(value);
  }
  return accepted;
}

async function validManagedCheckout(checkout: string, role: "main" | "dev", metadataRoot: string): Promise<boolean> {
  try {
    const stat = fs.lstatSync(checkout);
    if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(fs.realpathSync(checkout)) !== path.resolve(checkout)) return false;
  } catch { return false; }
  const [top, branch, common, revision] = await Promise.all([
    git(checkout, ["rev-parse", "--show-toplevel"], { optional: true }),
    git(checkout, ["branch", "--show-current"], { optional: true }),
    git(checkout, ["rev-parse", "--git-common-dir"], { optional: true }),
    git(checkout, ["rev-parse", "HEAD"], { optional: true }),
  ]);
  return Boolean(top && branch === role && common && revision && path.resolve(top) === path.resolve(checkout)
    && path.resolve(checkout, common) === path.resolve(metadataRoot));
}

function sourceCandidate(root: string): string {
  const reserved = new Set([".git", ".champcity", "Main", "Dev"]);
  const ordinary = fs.readdirSync(root).filter(name => !reserved.has(name));
  if (ordinary.length > 0) return root;
  for (const name of ["Dev", "Main"]) {
    const candidate = path.join(root, name);
    try {
      const stat = fs.lstatSync(candidate);
      if (stat.isDirectory() && !stat.isSymbolicLink()) return candidate;
    } catch { /* continue */ }
  }
  return root;
}

function boundedRelativePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/[\r\n\0]/g, "?");
  return normalized.length <= 240 ? normalized : `${normalized.slice(0, 237)}...`;
}

function sourcePhaseError(phase: "canonical source manifest/materialization" | "local-state preservation/relocation" |
  "generated policy materialization", relativePath?: string): Error {
  const location = relativePath ? ` at '${boundedRelativePath(relativePath)}'` : "";
  return new Error(`${phase} failed${location}.`);
}

function inspectReadableTree(root: string, top = true, prefix = ""): string[] {
  const facts: string[] = [];
  const excluded = top ? new Set([".git", ".champcity", "Main", "Dev"]) : new Set([".git"]);
  let names: string[];
  try { names = fs.readdirSync(root).sort(); } catch { throw sourcePhaseError("canonical source manifest/materialization", prefix || "."); }
  for (const name of names) {
    if (excluded.has(name)) continue;
    const absolute = path.join(root, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    let stat: fs.Stats;
    try { stat = fs.lstatSync(absolute); } catch { throw sourcePhaseError("canonical source manifest/materialization", relative); }
    facts.push(`${name}\0${stat.mode}\0${stat.size}\0${Math.trunc(stat.mtimeMs)}`);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      for (const child of inspectReadableTree(absolute, false, relative)) facts.push(`${name}/${child}`);
    }
  }
  return facts;
}

function inspectManifest(source: string, paths: string[]): string[] {
  const facts: string[] = [];
  for (const relative of paths) {
    const absolute = path.join(source, ...relative.split("/"));
    try {
      const stat = fs.lstatSync(absolute);
      facts.push(`${relative}\0${stat.mode}\0${stat.size}\0${Math.trunc(stat.mtimeMs)}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") facts.push(`${relative}\0missing`);
      else throw sourcePhaseError("canonical source manifest/materialization", relative);
    }
  }
  return facts;
}

function plan(input: Omit<ExistingProjectGitAdoptionPlan, "planId">, evidence: unknown): ExistingProjectGitAdoptionPlan {
  return { ...input, planId: digest(JSON.stringify({ input, evidence })) };
}

/** Read-only classification. Git irregularities are evidence, never admission states. */
export async function inspectExistingProjectGitAdoption(projectRoot: string, repositoryId: string): Promise<ExistingProjectGitAdoptionPlan> {
  if (!boundedIdentity(repositoryId)) fail("Existing Project adoption requires a bounded Repository identity.");
  const root = canonicalRoot(projectRoot);
  const shape = topology(root);
  const priorGitDetected = shape.conventionalGit || shape.managedMetadata || shape.mainCheckout || shape.devCheckout || shape.recoveryStaging;
  if (!priorGitDetected) {
    return plan({ state: "source-neutral", repositoryId: null, priorGitDetected: false, topology: shape,
      preservedRefCount: 0, preservedRemoteCount: 0, requiresConsent: false, warnings: [], failureReason: null }, shape);
  }
  if (!shape.conventionalGit && shape.managedMetadata && shape.mainCheckout && shape.devCheckout) {
    const metadata = path.join(root, ".champcity", "repository.git");
    const bare = await git(metadata, ["rev-parse", "--is-bare-repository"], { optional: true });
    const [mainValid, devValid] = await Promise.all([
      validManagedCheckout(path.join(root, "Main"), "main", metadata),
      validManagedCheckout(path.join(root, "Dev"), "dev", metadata),
    ]);
    if (bare === "true" && mainValid && devValid) {
      const evidence = await readGitEvidence(path.join(root, "Dev"));
      return plan({ state: "managed-ready", repositoryId, priorGitDetected: true, topology: shape,
        preservedRefCount: evidence.refs.length, preservedRemoteCount: evidence.remotes.length,
        requiresConsent: false, warnings: [], failureReason: null }, {
          refs: evidence.refsDigest, remotes: evidence.remotesDigest, working: evidence.workingStateDigest, shape,
        });
    }
  }
  try {
    applicationRoot(root);
    const candidate = sourceCandidate(root);
    const inventory = await gitSourceInventory(candidate, candidate === root);
    const sourceFacts = inventory ? inspectManifest(candidate, inventory.sourcePaths) : inspectReadableTree(candidate, candidate === root);
    const evidence = shape.conventionalGit ? await readGitEvidence(root) : await readGitEvidence(candidate);
    return plan({ state: "conversion-required", repositoryId, priorGitDetected: true, topology: shape,
      preservedRefCount: evidence.refs.length, preservedRemoteCount: evidence.remotes.length,
      requiresConsent: true, warnings: [...warningFacts], failureReason: null }, {
        sourceFacts, localStatePaths: inventory?.localStatePaths ?? null,
        refs: evidence.refsDigest, remotes: evidence.remotesDigest, working: evidence.workingStateDigest, shape,
      });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Selected Project source could not be preserved.";
    return plan({ state: "conversion-failed", repositoryId, priorGitDetected: true, topology: shape,
      preservedRefCount: 0, preservedRemoteCount: 0, requiresConsent: false, warnings: [], failureReason: reason }, shape);
  }
}

export async function inspectExistingProjectGitAdoptionEvidence(projectRoot: string): Promise<{
  refsDigest: string; remotesDigest: string; workingStateDigest: string;
}> {
  const root = canonicalRoot(projectRoot);
  const inspectionRoot = existsEntry(path.join(root, ".git")) ? root : path.join(root, "Dev");
  const evidence = await readGitEvidence(inspectionRoot);
  return { refsDigest: evidence.refsDigest, remotesDigest: evidence.remotesDigest, workingStateDigest: evidence.workingStateDigest };
}

export interface ExistingProjectGitAdoptionApplyResult {
  plan: ExistingProjectGitAdoptionPlan;
  source: ManagedProjectSourceResult | null;
  applied: boolean;
}

function verifyOrdinaryParents(source: string, relative: string): void {
  const segments = relative.replace(/\\/g, "/").split("/");
  let current = source;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw sourcePhaseError("canonical source manifest/materialization", relative);
  }
}

function copyEntryNonFollowing(source: string, destination: string, relative: string, recurse: boolean): void {
  let stat: fs.Stats;
  try { stat = fs.lstatSync(source); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw sourcePhaseError("canonical source manifest/materialization", relative);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try {
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(source);
      if (existsEntry(destination)) removeEntryNonFollowing(destination);
      try {
        fs.symlinkSync(target, destination);
      } catch (error) {
        if (process.platform !== "win32" || !["EPERM", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
        fs.symlinkSync(target, destination, "junction");
      }
      return;
    }
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      if (!recurse) return;
      for (const name of fs.readdirSync(source)) {
        if (name === ".git") continue;
        copyEntryNonFollowing(path.join(source, name), path.join(destination, name), `${relative}/${name}`, true);
      }
      return;
    }
    if (!stat.isFile()) throw sourcePhaseError("canonical source manifest/materialization", relative);
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, stat.mode);
    fs.utimesSync(destination, stat.atime, stat.mtime);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("canonical source manifest/materialization failed")) throw error;
    throw sourcePhaseError("canonical source manifest/materialization", relative);
  }
}

function materializeManifest(source: string, destination: string, sourcePaths: string[]): void {
  fs.mkdirSync(destination, { recursive: true });
  for (const relative of sourcePaths) {
    if (!safeRelativeSourcePath(relative)) throw sourcePhaseError("canonical source manifest/materialization", relative);
    try {
      verifyOrdinaryParents(source, relative);
      copyEntryNonFollowing(path.join(source, ...relative.split("/")), path.join(destination, ...relative.split("/")), relative, false);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
  }
}

function copySourceContents(source: string, destination: string, sourceIsProjectRoot: boolean): void {
  const excluded = sourceIsProjectRoot ? new Set([".git", ".champcity", "Main", "Dev"]) : new Set([".git"]);
  fs.mkdirSync(destination, { recursive: true });
  let names: string[];
  try { names = fs.readdirSync(source); } catch { throw sourcePhaseError("canonical source manifest/materialization", "."); }
  for (const name of names) {
    if (excluded.has(name)) continue;
    copyEntryNonFollowing(path.join(source, name), path.join(destination, name), name, true);
  }
}

function copySnapshotToCheckout(snapshot: string, checkout: string): void {
  copySourceContents(snapshot, checkout, false);
}

function relocateLocalState(source: string, checkout: string, relativePaths: string[]): RelocatedLocalState[] {
  const relocated: RelocatedLocalState[] = [];
  for (const relativePath of relativePaths) {
    const sourcePath = path.join(source, ...relativePath.split("/"));
    const destinationPath = path.join(checkout, ...relativePath.split("/"));
    try {
      verifyOrdinaryParents(source, relativePath);
      fs.lstatSync(sourcePath);
      if (existsEntry(destinationPath)) throw new Error("destination-exists");
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.renameSync(sourcePath, destinationPath);
      relocated.push({ relativePath, source: sourcePath, destination: destinationPath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw sourcePhaseError("local-state preservation/relocation", relativePath);
    }
  }
  return relocated;
}

function restoreRelocatedLocalState(relocated: RelocatedLocalState[]): void {
  for (const entry of [...relocated].reverse()) {
    if (!existsEntry(entry.destination)) continue;
    try {
      if (existsEntry(entry.source)) throw new Error("source-exists");
      fs.mkdirSync(path.dirname(entry.source), { recursive: true });
      fs.renameSync(entry.destination, entry.source);
    } catch {
      throw sourcePhaseError("local-state preservation/relocation", entry.relativePath);
    }
  }
}

function removeEntryNonFollowing(target: string): void {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) fs.unlinkSync(target);
  else fs.rmSync(target, { recursive: stat.isDirectory(), force: true });
}

async function importReadableGit(root: string, metadata: string, evidence: GitEvidence): Promise<number> {
  let imported = 0;
  for (const item of evidence.refs) {
    const fetched = await git(root, ["fetch", "--no-tags", root, `${item.revision}:${item.ref}`], { optional: true, gitDir: metadata });
    if (fetched !== null) imported += 1;
  }
  for (const remote of evidence.remotes) {
    if (remote.urls.length === 0) continue;
    await git(root, ["remote", "add", remote.name, remote.urls[0]], { optional: true, gitDir: metadata });
    for (const url of remote.urls.slice(1)) {
      await git(root, ["remote", "set-url", "--add", remote.name, url], { optional: true, gitDir: metadata });
    }
  }
  return imported;
}

async function updateIndexPaths(snapshot: string, metadata: string, paths: string[]): Promise<void> {
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const existing = batch.filter(relative => existsEntry(path.join(snapshot, ...relative.replace(/\\/g, "/").split("/"))));
    if (existing.length) await git(snapshot, ["add", "-f", "--", ...existing], { gitDir: metadata, workTree: snapshot });
  }
}

function snapshotEntries(root: string, relative = ""): SnapshotEntries {
  const result: SnapshotEntries = { ordinaryFiles: [], links: [] };
  let names: string[];
  const directory = relative ? path.join(root, ...relative.split("/")) : root;
  try { names = fs.readdirSync(directory).sort(); } catch { throw sourcePhaseError("canonical source manifest/materialization", relative || "."); }
  for (const name of names) {
    if (name === ".git") continue;
    const childRelative = relative ? `${relative}/${name}` : name;
    const child = path.join(directory, name);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(child); } catch { throw sourcePhaseError("canonical source manifest/materialization", childRelative); }
    if (stat.isSymbolicLink()) {
      try { result.links.push({ relativePath: childRelative, target: fs.readlinkSync(child) }); }
      catch { throw sourcePhaseError("canonical source manifest/materialization", childRelative); }
    } else if (stat.isDirectory()) {
      const nested = snapshotEntries(root, childRelative);
      result.ordinaryFiles.push(...nested.ordinaryFiles);
      result.links.push(...nested.links);
    } else if (stat.isFile()) {
      result.ordinaryFiles.push(childRelative);
    } else {
      throw sourcePhaseError("canonical source manifest/materialization", childRelative);
    }
  }
  return result;
}

async function indexSnapshotLink(snapshot: string, metadata: string, entry: SnapshotEntries["links"][number]): Promise<void> {
  const temporary = path.join(path.dirname(snapshot), `.link-target-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, entry.target, { encoding: "utf8", flag: "wx" });
    const object = await git(snapshot, ["hash-object", "-w", temporary], { gitDir: metadata, workTree: snapshot });
    if (!object || !/^[0-9a-f]{40,64}$/.test(object)) throw sourcePhaseError("canonical source manifest/materialization", entry.relativePath);
    await git(snapshot, ["update-index", "--add", "--cacheinfo", "120000", object, entry.relativePath],
      { gitDir: metadata, workTree: snapshot });
  } finally {
    if (existsEntry(temporary)) fs.rmSync(temporary, { force: true });
  }
}

async function createCanonicalBaseline(snapshot: string, metadata: string, evidence: GitEvidence): Promise<{ revision: string; parentCount: number }> {
  await git(snapshot, ["read-tree", "--empty"], { gitDir: metadata, workTree: snapshot });
  const entries = snapshotEntries(snapshot);
  await updateIndexPaths(snapshot, metadata, entries.ordinaryFiles);
  for (const entry of entries.links) await indexSnapshotLink(snapshot, metadata, entry);
  const tree = await git(snapshot, ["write-tree"], { gitDir: metadata, workTree: snapshot });
  if (!tree) fail("Canonical baseline tree could not be created from preserved Project source.");
  const parents: string[] = [];
  for (const revision of evidence.branchTips) {
    if (parents.length >= maximumBaselineParents) break;
    if (await git(snapshot, ["cat-file", "-e", `${revision}^{commit}`], { optional: true, gitDir: metadata }) !== null) parents.push(revision);
  }
  const revision = await git(snapshot, ["-c", "user.name=ChampCity Migration", "-c", "user.email=migration@champcity.invalid",
    "commit-tree", tree, ...parents.flatMap(parent => ["-p", parent]), "-m", baselineSubject], { gitDir: metadata });
  if (!revision) fail("Canonical baseline commit could not be created.");
  await git(snapshot, ["update-ref", "refs/heads/main", revision], { gitDir: metadata });
  await git(snapshot, ["update-ref", "refs/heads/dev", revision], { gitDir: metadata });
  return { revision, parentCount: parents.length };
}

const transientWindowsMutationCodes = new Set(["EPERM", "EACCES", "EBUSY", "ENOTEMPTY"]);

async function boundedMutation(operation: () => void): Promise<{ ok: true } | { ok: false; error: string }> {
  let last = "filesystem mutation failed";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { operation(); return { ok: true }; }
    catch (error) {
      last = error instanceof Error ? error.message : String(error);
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (!transientWindowsMutationCodes.has(code) || attempt === 4) break;
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
  return { ok: false, error: last.slice(0, 300) };
}

async function boundedRename(source: string, destination: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return boundedMutation(() => fs.renameSync(source, destination));
}

async function retainAttemptPath(source: string, destination: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!existsEntry(source)) return { ok: true };
  if (existsEntry(destination)) return { ok: false, error: "recovery destination already exists" };
  return boundedRename(source, destination);
}

async function normalizeExistingProject(input: {
  root: string; repositoryId: string; planId: string;
}): Promise<ManagedProjectSourceResult> {
  const root = input.root;
  const appRoot = applicationRoot(root);
  const migrationsRoot = path.join(appRoot, "migrations");
  fs.mkdirSync(migrationsRoot, { recursive: true });
  if (!fs.statSync(migrationsRoot).isDirectory() || fs.lstatSync(migrationsRoot).isSymbolicLink()) {
    fail("Source preservation staging cannot be created; no Git normalization was attempted.");
  }
  const migrationId = randomUUID();
  const migrationRoot = path.join(migrationsRoot, `existing-project-normalization-${migrationId}`);
  const snapshot = path.join(migrationRoot, "source-snapshot");
  const candidateMetadata = path.join(migrationRoot, "candidate-repository.git");
  const candidate = sourceCandidate(root);
  fs.mkdirSync(migrationRoot);
  let inventory: SourceInventory | null = null;
  try {
    inventory = await gitSourceInventory(candidate, candidate === root);
    if (inventory) materializeManifest(candidate, snapshot, inventory.sourcePaths);
    else copySourceContents(candidate, snapshot, candidate === root);
    fs.rmSync(path.join(snapshot, ".champcity"), { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(migrationRoot, { recursive: true, force: true });
    const detail = error instanceof Error && error.message.startsWith("canonical source manifest/materialization failed")
      ? error.message : sourcePhaseError("canonical source manifest/materialization").message;
    fail(`Source preservation staging failed before Git normalization: ${detail}`);
  }
  try {
    writeManagedRepositoryIntegrationPolicy(snapshot);
    inspectReadableTree(snapshot, false);
  } catch (error) {
    fs.rmSync(migrationRoot, { recursive: true, force: true });
    const detail = error instanceof Error && error.message.startsWith("canonical source manifest/materialization failed")
      ? error.message : sourcePhaseError("generated policy materialization", INTEGRATION_POLICY_PATH).message;
    fail(`Source preservation staging failed before Git normalization: ${detail}`);
  }
  const evidence = existsEntry(path.join(root, ".git")) ? await readGitEvidence(root) : await readGitEvidence(candidate);
  let journal: ConversionJournal = {
    schemaVersion: 3, migrationId, repositoryId: input.repositoryId, planId: input.planId, stage: "source-preserved",
    migrationRelativePath: path.relative(root, migrationRoot).replace(/\\/g, "/"),
    sourceSnapshotRelativePath: path.relative(root, snapshot).replace(/\\/g, "/"),
    baselineRevision: null, importedRefCount: 0, baselineParentCount: 0, failureReason: null, failurePhase: null,
    originalRootGitAuthoritative: existsEntry(path.join(root, ".git")), cleanupWarnings: [], retainedRecoveryPaths: [],
    completedAt: null,
  };
  writeJsonAtomic(journalPath(root), journal);

  const metadata = path.join(appRoot, "repository.git");
  const main = path.join(root, "Main");
  const dev = path.join(root, "Dev");
  const legacyGit = path.join(migrationRoot, "legacy-git-entry");
  const relocatedMain = path.join(migrationRoot, "preexisting-Main");
  const relocatedDev = path.join(migrationRoot, "preexisting-Dev");
  const relocatedMetadata = path.join(migrationRoot, "preexisting-repository.git");
  const rolledBackCandidate = path.join(migrationRoot, "rolled-back-candidate-repository.git");
  let gitRelocated = false;
  let mainRelocated = false;
  let devRelocated = false;
  let metadataRelocated = false;
  let candidatePrepared = false;
  let finalMetadataInstalled = false;
  let mainCreated = false;
  let devCreated = false;
  let relocatedLocalState: RelocatedLocalState[] = [];
  let phase = "candidate repository preparation";
  try {
    await git(root, ["init", "--bare", candidateMetadata]);
    candidatePrepared = true;
    await git(root, ["config", "core.autocrlf", "false"], { gitDir: candidateMetadata });
    const importedRefCount = await importReadableGit(root, candidateMetadata, evidence);
    const baseline = await createCanonicalBaseline(snapshot, candidateMetadata, evidence);
    journal = { ...journal, stage: "candidate-prepared", baselineRevision: baseline.revision, importedRefCount,
      baselineParentCount: baseline.parentCount };
    writeJsonAtomic(journalPath(root), journal);

    phase = "managed metadata cutover";
    if (existsEntry(metadata)) {
      const moved = await boundedRename(metadata, relocatedMetadata);
      if (!moved.ok) throw new Error(`pre-existing managed metadata could not be relocated: ${moved.error}`);
      metadataRelocated = true;
    }
    const installed = await boundedRename(candidateMetadata, metadata);
    if (!installed.ok) throw new Error(`candidate managed metadata could not be installed: ${installed.error}`);
    finalMetadataInstalled = true;
    journal = { ...journal, stage: "metadata-cutover" };
    writeJsonAtomic(journalPath(root), journal);

    phase = "root conventional Git cutover";
    if (existsEntry(path.join(root, ".git"))) {
      const moved = await boundedRename(path.join(root, ".git"), legacyGit);
      if (!moved.ok) throw new Error(`root conventional Git could not be relocated: ${moved.error}`);
      gitRelocated = true;
    }
    journal = { ...journal, stage: "root-git-relocated", originalRootGitAuthoritative: false };
    writeJsonAtomic(journalPath(root), journal);

    phase = "managed worktree creation";
    if (existsEntry(main)) {
      const moved = await boundedRename(main, relocatedMain);
      if (!moved.ok) throw new Error(`pre-existing Main could not be relocated: ${moved.error}`);
      mainRelocated = true;
    }
    if (existsEntry(dev)) {
      const moved = await boundedRename(dev, relocatedDev);
      if (!moved.ok) throw new Error(`pre-existing Dev could not be relocated: ${moved.error}`);
      devRelocated = true;
    }
    await git(root, ["worktree", "add", "--force", main, "main"], { gitDir: metadata });
    mainCreated = true;
    await git(root, ["worktree", "add", "--force", dev, "dev"], { gitDir: metadata });
    devCreated = true;
    copySnapshotToCheckout(snapshot, dev);
    const [mainValid, devValid, mainRevision, devRevision] = await Promise.all([
      validManagedCheckout(main, "main", metadata), validManagedCheckout(dev, "dev", metadata),
      git(main, ["rev-parse", "HEAD"]), git(dev, ["rev-parse", "HEAD"]),
    ]);
    if (!mainValid || !devValid || mainRevision !== baseline.revision || devRevision !== baseline.revision) {
      fail("Managed Main/Dev checkout verification failed; preserved Project source remains recoverable.");
    }
    journal = { ...journal, stage: "worktrees-created" };
    writeJsonAtomic(journalPath(root), journal);
    const localStateSource = candidate === dev && devRelocated ? relocatedDev
      : candidate === main && mainRelocated ? relocatedMain : candidate;
    relocatedLocalState = relocateLocalState(localStateSource, dev, inventory?.localStatePaths ?? []);
    journal = { ...journal, stage: "verified" };
    writeJsonAtomic(journalPath(root), journal);
    for (const name of fs.readdirSync(root)) {
      if ([".git", ".champcity", "Main", "Dev"].includes(name)) continue;
      removeEntryNonFollowing(path.join(root, name));
    }
    phase = "managed source verification";
    journal = { ...journal, stage: "verified" };
    writeJsonAtomic(journalPath(root), journal);
    const registered = await establishManagedProjectSource({ projectRoot: root, repositoryId: input.repositoryId });
    journal = { ...journal, stage: "completed", completedAt: new Date().toISOString() };
    writeJsonAtomic(journalPath(root), journal);
    writeJsonAtomic(receiptPath(root), journal);
    return { ...registered, materialized: true };
  } catch (error) {
    const primaryReason = error instanceof Error ? error.message.slice(0, 500) : "Existing Project conversion failed.";
    const cleanupWarnings: string[] = [];
    const retainedRecoveryPaths: string[] = [];
    const warn = (label: string, detail: string) => cleanupWarnings.push(`${label}: ${detail}`.slice(0, 500));
    try { restoreRelocatedLocalState(relocatedLocalState); relocatedLocalState = []; }
    catch (restoreError) { warn("local-state restore", restoreError instanceof Error ? restoreError.message : String(restoreError)); }

    for (const [created, checkout, recoveryName] of [[devCreated, dev, "failed-managed-Dev"], [mainCreated, main, "failed-managed-Main"]] as const) {
      if (!created || !existsEntry(checkout)) continue;
      const retained = path.join(migrationRoot, recoveryName);
      const result = await retainAttemptPath(checkout, retained);
      if (result.ok) retainedRecoveryPaths.push(path.relative(root, retained).replace(/\\/g, "/"));
      else warn(`${recoveryName} retain`, result.error);
    }
    if (gitRelocated && !existsEntry(path.join(root, ".git")) && existsEntry(legacyGit)) {
      const restored = await boundedRename(legacyGit, path.join(root, ".git"));
      if (!restored.ok) warn("root Git restore", restored.error);
      else gitRelocated = false;
    }
    if (finalMetadataInstalled && existsEntry(metadata)) {
      const retained = await retainAttemptPath(metadata, rolledBackCandidate);
      if (retained.ok) {
        finalMetadataInstalled = false;
        retainedRecoveryPaths.push(path.relative(root, rolledBackCandidate).replace(/\\/g, "/"));
      } else warn("candidate metadata retain", retained.error);
    } else if (candidatePrepared && existsEntry(candidateMetadata)) {
      retainedRecoveryPaths.push(path.relative(root, candidateMetadata).replace(/\\/g, "/"));
    }
    if (metadataRelocated && !existsEntry(metadata) && existsEntry(relocatedMetadata)) {
      const restored = await boundedRename(relocatedMetadata, metadata);
      if (!restored.ok) warn("pre-existing metadata restore", restored.error);
    }
    for (const [relocated, original, recovery, label] of [[mainRelocated, main, relocatedMain, "Main"], [devRelocated, dev, relocatedDev, "Dev"]] as const) {
      if (!relocated || existsEntry(original) || !existsEntry(recovery)) continue;
      const restored = await boundedRename(recovery, original);
      if (!restored.ok) warn(`${label} restore`, restored.error);
    }
    try { copySourceContents(snapshot, root, true); }
    catch (restoreError) { warn("source restore", restoreError instanceof Error ? restoreError.message : String(restoreError)); }

    journal = { ...journal, stage: "failed", failureReason: primaryReason, failurePhase: phase,
      originalRootGitAuthoritative: existsEntry(path.join(root, ".git")), cleanupWarnings, retainedRecoveryPaths };
    try { writeJsonAtomic(journalPath(root), journal); }
    catch (journalError) { cleanupWarnings.push(`failed journal write: ${journalError instanceof Error ? journalError.message : String(journalError)}`.slice(0, 500)); }
    const summary = cleanupWarnings.length ? ` Cleanup warnings: ${cleanupWarnings.join(" | ")}` : "";
    throw new AgentHarnessError("STALE_SOURCE", `${phase} failed: ${primaryReason}${summary}`);
  }
}

/** Revalidates and applies one inspected forced-normalization plan. */
export async function applyExistingProjectGitAdoption(input: {
  projectRoot: string;
  repositoryId: string;
  planId: string;
  consent: boolean;
}): Promise<ExistingProjectGitAdoptionApplyResult> {
  const root = canonicalRoot(input.projectRoot);
  const inspected = await inspectExistingProjectGitAdoption(root, input.repositoryId);
  if (inspected.planId !== input.planId) fail("Existing Project conversion plan is stale; inspect again before converting.");
  if (inspected.state === "conversion-failed") fail(inspected.failureReason ?? "Existing Project source cannot be safely converted.");
  if (inspected.state === "source-neutral") return { plan: inspected, source: null, applied: false };
  if (inspected.state === "managed-ready") {
    const source = await establishManagedProjectSource({ projectRoot: root, repositoryId: input.repositoryId });
    return { plan: inspected, source, applied: false };
  }
  if (!input.consent) fail("Existing Project conversion requires explicit consent.");
  const source = await normalizeExistingProject({ root, repositoryId: input.repositoryId, planId: input.planId });
  return { plan: await inspectExistingProjectGitAdoption(root, input.repositoryId), source, applied: true };
}
