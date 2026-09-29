import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import type { ExistingProjectGitAdoptionPlan } from "../../shared/sourceControlContracts";
import { INTEGRATION_POLICY_PATH } from "../../shared/integrationPolicyContracts";
import {
  establishManagedProjectSource,
  type ManagedProjectCheckoutRegistration,
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
  tracked: string[];
  ignored: string[];
  refsDigest: string;
  remotesDigest: string;
  workingStateDigest: string;
}

interface ConversionJournal {
  schemaVersion: 2;
  migrationId: string;
  repositoryId: string;
  planId: string;
  stage: "source-preserved" | "normalizing" | "verified" | "completed" | "failed";
  migrationRelativePath: string;
  sourceSnapshotRelativePath: string;
  baselineRevision: string | null;
  importedRefCount: number;
  baselineParentCount: number;
  failureReason: string | null;
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
  const [refsRaw, remoteNamesRaw, trackedRaw, ignoredRaw, statusRaw] = await Promise.all([
    git(root, ["for-each-ref", "--sort=refname", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"], { optional: true }),
    git(root, ["remote"], { optional: true }),
    git(root, ["ls-files", "-z"], { optional: true }),
    git(root, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"], { optional: true }),
    git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { optional: true }),
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
  const tracked = splitZero(trackedRaw).filter(safeRelativeSourcePath);
  const ignored = splitZero(ignoredRaw).filter(safeRelativeSourcePath);
  const refLines = refs.map(item => `${item.ref}\0${item.revision}`).sort();
  const remoteLines = remotes.flatMap(remote => remote.urls.map(url => `${remote.name}\0${url}`)).sort();
  return {
    refs,
    branchTips: [...new Set(refs.filter(item => item.ref.startsWith("refs/heads/")).map(item => item.revision))].sort(),
    remotes,
    tracked,
    ignored,
    refsDigest: digest(refLines.join("\n")),
    remotesDigest: digest(remoteLines.join("\n")),
    workingStateDigest: digest(statusRaw ?? "unreadable"),
  };
}

function safeRelativeSourcePath(value: string): boolean {
  if (!value || path.isAbsolute(value) || value.includes("\0")) return false;
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").some(segment => segment === "" || segment === "." || segment === ".." || segment === ".git")
    && normalized !== ".champcity" && !normalized.startsWith(".champcity/");
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
    try { if (fs.statSync(candidate).isDirectory()) return candidate; } catch { /* continue */ }
  }
  return root;
}

function inspectReadableTree(root: string, top = true): string[] {
  const facts: string[] = [];
  const excluded = top ? new Set([".git", ".champcity", "Main", "Dev"]) : new Set([".git"]);
  for (const name of fs.readdirSync(root).sort()) {
    if (excluded.has(name)) continue;
    const absolute = path.join(root, name);
    const stat = fs.lstatSync(absolute);
    facts.push(`${name}\0${stat.mode}\0${stat.size}\0${Math.trunc(stat.mtimeMs)}`);
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      for (const child of inspectReadableTree(absolute, false)) facts.push(`${name}/${child}`);
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
    const sourceFacts = inspectReadableTree(candidate, candidate === root);
    const evidence = shape.conventionalGit ? await readGitEvidence(root) : await readGitEvidence(candidate);
    return plan({ state: "conversion-required", repositoryId, priorGitDetected: true, topology: shape,
      preservedRefCount: evidence.refs.length, preservedRemoteCount: evidence.remotes.length,
      requiresConsent: true, warnings: [...warningFacts], failureReason: null }, {
        sourceFacts, refs: evidence.refsDigest, remotes: evidence.remotesDigest, working: evidence.workingStateDigest, shape,
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

function copySourceContents(source: string, destination: string, sourceIsProjectRoot: boolean): void {
  const excluded = sourceIsProjectRoot ? new Set([".git", ".champcity", "Main", "Dev"]) : new Set([".git"]);
  fs.mkdirSync(destination, { recursive: true });
  for (const name of fs.readdirSync(source)) {
    if (excluded.has(name)) continue;
    fs.cpSync(path.join(source, name), path.join(destination, name), {
      recursive: true, force: true, preserveTimestamps: true, dereference: false,
      filter: candidate => path.basename(candidate) !== ".git",
    });
  }
}

function copySnapshotToCheckout(snapshot: string, checkout: string): void {
  for (const name of fs.readdirSync(snapshot)) {
    fs.cpSync(path.join(snapshot, name), path.join(checkout, name), {
      recursive: true, force: true, preserveTimestamps: true, dereference: false,
    });
  }
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

async function updateIndexPaths(snapshot: string, metadata: string, command: "--force-remove" | "add-force", paths: string[]): Promise<void> {
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    if (command === "--force-remove") {
      await git(snapshot, ["update-index", "--force-remove", "--", ...batch], { optional: true, gitDir: metadata, workTree: snapshot });
    } else {
      const existing = batch.filter(relative => existsEntry(path.join(snapshot, ...relative.replace(/\\/g, "/").split("/"))));
      if (existing.length) await git(snapshot, ["add", "-f", "--", ...existing], { gitDir: metadata, workTree: snapshot });
    }
  }
}

async function createCanonicalBaseline(snapshot: string, metadata: string, evidence: GitEvidence): Promise<{ revision: string; parentCount: number }> {
  await git(snapshot, ["read-tree", "--empty"], { gitDir: metadata, workTree: snapshot });
  await git(snapshot, ["add", "-A", "--", "."], { gitDir: metadata, workTree: snapshot });
  const tracked = new Set(evidence.tracked);
  await updateIndexPaths(snapshot, metadata, "--force-remove", evidence.ignored.filter(relative => !tracked.has(relative)));
  await updateIndexPaths(snapshot, metadata, "add-force", evidence.tracked);
  await updateIndexPaths(snapshot, metadata, "add-force", [INTEGRATION_POLICY_PATH]);
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

async function removeManagedCandidate(root: string, metadata: string, checkout: string): Promise<void> {
  if (!existsEntry(checkout)) return;
  await git(root, ["worktree", "remove", "--force", checkout], { optional: true, gitDir: metadata });
  if (existsEntry(checkout)) fs.rmSync(checkout, { recursive: true, force: true });
}

async function normalizeExistingProject(input: {
  root: string; repositoryId: string; workspaceId: string; checkoutRegistration: ManagedProjectCheckoutRegistration; planId: string;
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
  const candidate = sourceCandidate(root);
  fs.mkdirSync(migrationRoot);
  try {
    copySourceContents(candidate, snapshot, candidate === root);
    fs.rmSync(path.join(snapshot, ".champcity"), { recursive: true, force: true });
    writeManagedRepositoryIntegrationPolicy(snapshot);
    inspectReadableTree(snapshot, false);
  } catch (error) {
    fail(`Source preservation staging failed before Git normalization: ${error instanceof Error ? error.message : "filesystem copy failed"}`);
  }
  const evidence = existsEntry(path.join(root, ".git")) ? await readGitEvidence(root) : await readGitEvidence(candidate);
  let journal: ConversionJournal = {
    schemaVersion: 2, migrationId, repositoryId: input.repositoryId, planId: input.planId, stage: "source-preserved",
    migrationRelativePath: path.relative(root, migrationRoot).replace(/\\/g, "/"),
    sourceSnapshotRelativePath: path.relative(root, snapshot).replace(/\\/g, "/"),
    baselineRevision: null, importedRefCount: 0, baselineParentCount: 0, failureReason: null, completedAt: null,
  };
  writeJsonAtomic(journalPath(root), journal);

  const metadata = path.join(appRoot, "repository.git");
  const main = path.join(root, "Main");
  const dev = path.join(root, "Dev");
  const legacyGit = path.join(migrationRoot, "legacy-git-entry");
  const relocatedMain = path.join(migrationRoot, "preexisting-Main");
  const relocatedDev = path.join(migrationRoot, "preexisting-Dev");
  const relocatedMetadata = path.join(migrationRoot, "preexisting-repository.git");
  let gitRelocated = false;
  let mainRelocated = false;
  let devRelocated = false;
  let metadataRelocated = false;
  journal = { ...journal, stage: "normalizing" };
  writeJsonAtomic(journalPath(root), journal);
  try {
    if (existsEntry(main)) { fs.renameSync(main, relocatedMain); mainRelocated = true; }
    if (existsEntry(dev)) { fs.renameSync(dev, relocatedDev); devRelocated = true; }
    if (existsEntry(metadata)) { fs.renameSync(metadata, relocatedMetadata); metadataRelocated = true; }
    await git(root, ["init", "--bare", metadata]);
    await git(root, ["config", "core.autocrlf", "false"], { gitDir: metadata });
    const importedRefCount = await importReadableGit(root, metadata, evidence);
    const baseline = await createCanonicalBaseline(snapshot, metadata, evidence);
    if (existsEntry(path.join(root, ".git"))) { fs.renameSync(path.join(root, ".git"), legacyGit); gitRelocated = true; }
    await git(root, ["worktree", "add", "--force", main, "main"], { gitDir: metadata });
    await git(root, ["worktree", "add", "--force", dev, "dev"], { gitDir: metadata });
    copySnapshotToCheckout(snapshot, dev);
    const [mainValid, devValid, mainRevision, devRevision] = await Promise.all([
      validManagedCheckout(main, "main", metadata), validManagedCheckout(dev, "dev", metadata),
      git(main, ["rev-parse", "HEAD"]), git(dev, ["rev-parse", "HEAD"]),
    ]);
    if (!mainValid || !devValid || mainRevision !== baseline.revision || devRevision !== baseline.revision) {
      fail("Managed Main/Dev checkout verification failed; preserved Project source remains recoverable.");
    }
    journal = { ...journal, stage: "verified", baselineRevision: baseline.revision, importedRefCount,
      baselineParentCount: baseline.parentCount };
    writeJsonAtomic(journalPath(root), journal);
    for (const name of fs.readdirSync(root)) {
      if ([".git", ".champcity", "Main", "Dev"].includes(name)) continue;
      fs.rmSync(path.join(root, name), { recursive: true, force: true });
    }
    const registered = await establishManagedProjectSource({ projectRoot: root, repositoryId: input.repositoryId,
      workspaceId: input.workspaceId, checkoutRegistration: input.checkoutRegistration });
    journal = { ...journal, stage: "completed", completedAt: new Date().toISOString() };
    writeJsonAtomic(journalPath(root), journal);
    writeJsonAtomic(receiptPath(root), journal);
    return { ...registered, materialized: true };
  } catch (error) {
    await removeManagedCandidate(root, metadata, dev).catch(() => undefined);
    await removeManagedCandidate(root, metadata, main).catch(() => undefined);
    if (existsEntry(metadata)) fs.rmSync(metadata, { recursive: true, force: true });
    if (metadataRelocated && !existsEntry(metadata) && existsEntry(relocatedMetadata)) fs.renameSync(relocatedMetadata, metadata);
    if (gitRelocated && !existsEntry(path.join(root, ".git")) && existsEntry(legacyGit)) fs.renameSync(legacyGit, path.join(root, ".git"));
    if (mainRelocated && !existsEntry(main) && existsEntry(relocatedMain)) fs.renameSync(relocatedMain, main);
    if (devRelocated && !existsEntry(dev) && existsEntry(relocatedDev)) fs.renameSync(relocatedDev, dev);
    try { copySourceContents(snapshot, root, true); } catch { /* preserved snapshot remains authoritative recovery evidence */ }
    const reason = error instanceof Error ? error.message.slice(0, 500) : "Existing Project conversion failed.";
    journal = { ...journal, stage: "failed", failureReason: reason };
    writeJsonAtomic(journalPath(root), journal);
    throw error;
  }
}

/** Revalidates and applies one inspected forced-normalization plan. */
export async function applyExistingProjectGitAdoption(input: {
  projectRoot: string;
  repositoryId: string;
  workspaceId: string;
  checkoutRegistration: ManagedProjectCheckoutRegistration;
  planId: string;
  consent: boolean;
}): Promise<ExistingProjectGitAdoptionApplyResult> {
  const root = canonicalRoot(input.projectRoot);
  const inspected = await inspectExistingProjectGitAdoption(root, input.repositoryId);
  if (inspected.planId !== input.planId) fail("Existing Project conversion plan is stale; inspect again before converting.");
  if (inspected.state === "conversion-failed") fail(inspected.failureReason ?? "Existing Project source cannot be safely converted.");
  if (inspected.state === "source-neutral") return { plan: inspected, source: null, applied: false };
  if (inspected.state === "managed-ready") {
    const source = await establishManagedProjectSource({ projectRoot: root, repositoryId: input.repositoryId,
      workspaceId: input.workspaceId, checkoutRegistration: input.checkoutRegistration });
    return { plan: inspected, source, applied: false };
  }
  if (!input.consent) fail("Existing Project conversion requires explicit consent.");
  const source = await normalizeExistingProject({ root, repositoryId: input.repositoryId, workspaceId: input.workspaceId,
    checkoutRegistration: input.checkoutRegistration, planId: input.planId });
  return { plan: await inspectExistingProjectGitAdoption(root, input.repositoryId), source, applied: true };
}
