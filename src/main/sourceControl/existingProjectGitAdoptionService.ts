import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import type {
  ExistingProjectActiveBranchAction,
  ExistingProjectGitAdoptionJournal,
  ExistingProjectGitAdoptionJournalStage,
  ExistingProjectGitAdoptionPlan,
} from "../../shared/sourceControlContracts";
import { resolveManagedProjectSourceTopology } from "./projectSourceTopology";

export const EXISTING_PROJECT_GIT_ADOPTION_JOURNAL = ".champcity/migrations/existing-project-git-adoption-v1.json";
const journalResourcePattern = /^(?:\.champcity\/(?:repository\.git|original-git-[a-zA-Z0-9._-]+)|Main|Dev)$/;

interface GitSnapshot {
  currentBranch: string | null;
  currentRevision: string;
  mainRevision: string | null;
  devRevision: string | null;
  baselineSourceRef: string | null;
  refs: string;
  refsDigest: string;
  remotes: string;
  remotesDigest: string;
  refCount: number;
  remoteCount: number;
  worktrees: string;
  worktreesDigest: string;
  workingStateDigest: string;
  workingState: ExistingProjectGitAdoptionPlan["workingState"];
  activeBranchAction: ExistingProjectActiveBranchAction;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function boundedIdentity(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value);
}

function fail(message: string): never {
  throw new AgentHarnessError("STALE_SOURCE", message);
}

async function git(cwd: string, args: string[], options: { optional?: boolean; gitDir?: string } = {}): Promise<string | null> {
  const command = options.gitDir ? ["--git-dir", options.gitDir, ...args] : args;
  const result = await runBoundedGit({ cwd, args: command, rejectNonZero: !options.optional });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

function splitZero(value: string | null): string[] {
  return value ? value.split("\0").filter(Boolean).sort() : [];
}

function topologyBits(plan: ExistingProjectGitAdoptionPlan["topology"]): string {
  return [plan.conventionalGit, plan.managedMetadata, plan.mainCheckout, plan.devCheckout, plan.recoveryStaging]
    .map(value => value ? "1" : "0").join("");
}

function journalPath(projectRoot: string): string {
  return path.join(projectRoot, ...EXISTING_PROJECT_GIT_ADOPTION_JOURNAL.split("/"));
}

function assertJournal(value: unknown, repositoryId?: string): ExistingProjectGitAdoptionJournal {
  if (!value || typeof value !== "object") fail("Existing Project adoption journal is malformed.");
  const journal = value as Partial<ExistingProjectGitAdoptionJournal>;
  const stages: ExistingProjectGitAdoptionJournalStage[] = ["planned", "metadata-created", "refs-normalized", "snapshot-created",
    "checkouts-created", "source-moved", "root-metadata-staged", "verified", "completed", "rolled-back"];
  if (journal.schemaVersion !== 1 || typeof journal.migrationId !== "string" || !boundedIdentity(journal.repositoryId ?? "") ||
    typeof journal.planId !== "string" || !stages.includes(journal.stage as ExistingProjectGitAdoptionJournalStage) ||
    !Array.isArray(journal.resources) || journal.resources.some(resource => typeof resource !== "string" || !journalResourcePattern.test(resource)))
    fail("Existing Project adoption journal is malformed or contains an unbounded resource.");
  if (repositoryId && journal.repositoryId !== repositoryId) fail("Existing Project adoption journal belongs to a different Repository identity.");
  return journal as ExistingProjectGitAdoptionJournal;
}

function writeJsonAtomic(target: string, value: unknown): void {
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

export function loadExistingProjectGitAdoptionJournal(projectRoot: string, repositoryId?: string,
  expectedPlanId?: string): ExistingProjectGitAdoptionJournal | null {
  const target = journalPath(fs.realpathSync(projectRoot));
  if (!fs.existsSync(target)) return null;
  try {
    const journal = assertJournal(JSON.parse(fs.readFileSync(target, "utf8")), repositoryId);
    if (expectedPlanId && journal.planId !== expectedPlanId) fail("Existing Project adoption journal was created from a stale inspection plan.");
    return journal;
  } catch (error) {
    if (error instanceof AgentHarnessError) throw error;
    fail("Existing Project adoption journal is unreadable or malformed.");
  }
}

export function createExistingProjectGitAdoptionJournal(projectRoot: string, journal: ExistingProjectGitAdoptionJournal): void {
  const target = journalPath(fs.realpathSync(projectRoot));
  if (fs.existsSync(target)) fail("An Existing Project adoption journal is already active.");
  writeJsonAtomic(target, assertJournal(journal, journal.repositoryId));
}

export function advanceExistingProjectGitAdoptionJournal(projectRoot: string, repositoryId: string,
  stage: ExistingProjectGitAdoptionJournalStage, changes: Partial<Pick<ExistingProjectGitAdoptionJournal,
    "resources" | "failureReason" | "finalRefsDigest" | "finalRemotesDigest" | "completedAt">> = {}): ExistingProjectGitAdoptionJournal {
  const journal = loadExistingProjectGitAdoptionJournal(projectRoot, repositoryId);
  if (!journal) fail("No active Existing Project adoption journal was found.");
  const order: ExistingProjectGitAdoptionJournalStage[] = ["planned", "metadata-created", "refs-normalized", "snapshot-created",
    "checkouts-created", "source-moved", "root-metadata-staged", "verified", "completed"];
  if (stage !== "rolled-back" && order.indexOf(stage) < order.indexOf(journal.stage)) fail("Existing Project adoption journal cannot move backward.");
  const next = assertJournal({ ...journal, ...changes, stage }, repositoryId);
  writeJsonAtomic(journalPath(fs.realpathSync(projectRoot)), next);
  return next;
}

export function markExistingProjectGitAdoptionComplete(projectRoot: string, repositoryId: string,
  finalRefsDigest: string, finalRemotesDigest: string): ExistingProjectGitAdoptionJournal {
  return advanceExistingProjectGitAdoptionJournal(projectRoot, repositoryId, "completed", {
    finalRefsDigest, finalRemotesDigest, completedAt: new Date().toISOString(), failureReason: null,
  });
}

export function newExistingProjectGitAdoptionJournal(input: {
  repositoryId: string;
  plan: ExistingProjectGitAdoptionPlan;
  refsDigest: string;
  remotesDigest: string;
  workingStateDigest: string;
}): ExistingProjectGitAdoptionJournal {
  if (!boundedIdentity(input.repositoryId)) fail("Existing Project adoption requires a bounded Repository identity.");
  return {
    schemaVersion: 1,
    migrationId: randomUUID(),
    repositoryId: input.repositoryId,
    planId: input.plan.planId,
    stage: "planned",
    originalCurrentBranch: input.plan.currentBranch,
    originalCurrentRevision: input.plan.currentRevision,
    originalRefsDigest: input.refsDigest,
    originalRemotesDigest: input.remotesDigest,
    workingStateDigest: input.workingStateDigest,
    mainRevision: input.plan.mainRevision,
    devRevision: input.plan.devRevision,
    baselineSourceRef: input.plan.baselineSourceRef,
    activeBranchAction: input.plan.activeBranchAction,
    captureSnapshotRequired: input.plan.workingState.captureSnapshotRequired,
    resources: [],
    failureReason: null,
    finalRefsDigest: null,
    finalRemotesDigest: null,
    completedAt: null,
  };
}

function noWorkingState(): ExistingProjectGitAdoptionPlan["workingState"] {
  return { stagedCount: 0, unstagedCount: 0, untrackedCount: 0, ignoredCount: 0, captureSnapshotRequired: false };
}

async function inspectGit(root: string, gitDir?: string): Promise<GitSnapshot> {
  const [currentBranchRaw, currentRevision, mainRevision, devRevision, defaultRef, refsRaw, remotesRaw, remoteNamesRaw,
    worktreesRaw, stagedRaw, unstagedRaw, untrackedRaw, ignoredRaw] = await Promise.all([
    git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"], { optional: true, gitDir }),
    git(root, ["rev-parse", "HEAD"], { gitDir }),
    git(root, ["show-ref", "--verify", "--hash", "refs/heads/main"], { optional: true, gitDir }),
    git(root, ["show-ref", "--verify", "--hash", "refs/heads/dev"], { optional: true, gitDir }),
    git(root, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], { optional: true, gitDir }),
    git(root, ["for-each-ref", "--sort=refname", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"], { gitDir }),
    git(root, ["remote", "-v"], { gitDir }),
    git(root, ["remote"], { gitDir }),
    git(root, ["worktree", "list", "--porcelain"], { gitDir }),
    git(root, ["diff", "--cached", "--name-only", "-z"], { gitDir }),
    git(root, ["diff", "--name-only", "-z"], { gitDir }),
    git(root, ["ls-files", "--others", "--exclude-standard", "-z"], { gitDir }),
    git(root, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"], { gitDir }),
  ]);
  if (!currentRevision || refsRaw === null || remotesRaw === null || worktreesRaw === null) fail("Git repository state could not be inspected.");
  const currentBranch = currentBranchRaw || null;
  let baselineSourceRef: string | null = mainRevision ? "main" : null;
  if (!mainRevision) {
    const normalizedDefault = defaultRef?.replace(/^origin\//, "") ?? null;
    baselineSourceRef = normalizedDefault && await git(root, ["rev-parse", `refs/heads/${normalizedDefault}`], { optional: true, gitDir })
      ? normalizedDefault : currentBranch;
  }
  const staged = splitZero(stagedRaw);
  const unstaged = splitZero(unstagedRaw);
  const untracked = splitZero(untrackedRaw);
  const ignored = splitZero(ignoredRaw);
  const workingState = { stagedCount: staged.length, unstagedCount: unstaged.length, untrackedCount: untracked.length,
    ignoredCount: ignored.length, captureSnapshotRequired: staged.length + unstaged.length + untracked.length > 0 };
  const proposedDev = devRevision ?? mainRevision ?? (baselineSourceRef
    ? await git(root, ["rev-parse", `refs/heads/${baselineSourceRef}`], { optional: true, gitDir }) : null);
  let activeBranchAction: ExistingProjectActiveBranchAction = "none";
  if (currentBranch && currentBranch !== "main" && currentBranch !== "dev" && proposedDev) {
    const activeAlreadyInDev = await git(root, ["merge-base", "--is-ancestor", currentRevision, proposedDev], { optional: true, gitDir }) !== null;
    const devInActive = await git(root, ["merge-base", "--is-ancestor", proposedDev, currentRevision], { optional: true, gitDir }) !== null;
    activeBranchAction = activeAlreadyInDev ? "already-contained" : devInActive ? "fast-forward-dev" : "merge-into-dev";
  }
  const refs = refsRaw.split(/\r?\n/).filter(Boolean).sort().join("\n");
  const remotes = remotesRaw.split(/\r?\n/).filter(Boolean).sort().join("\n");
  const worktrees = worktreesRaw.split(/\r?\n/).filter(Boolean).join("\n");
  return {
    currentBranch,
    currentRevision,
    mainRevision,
    devRevision,
    baselineSourceRef,
    refs,
    refsDigest: digest(refs),
    remotes,
    remotesDigest: digest(remotes),
    refCount: refs ? refs.split("\n").length : 0,
    remoteCount: remoteNamesRaw ? remoteNamesRaw.split(/\r?\n/).filter(Boolean).length : 0,
    worktrees,
    worktreesDigest: digest(worktrees),
    workingStateDigest: digest(JSON.stringify({ staged, unstaged, untracked, ignored })),
    workingState,
    activeBranchAction,
  };
}

function findUnsafeGitMetadata(gitDir: string): string | null {
  const operations = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG", "rebase-apply", "rebase-merge", "sequencer"];
  if (operations.some(name => fs.existsSync(path.join(gitDir, name)))) return "Git has an active operation; complete or abort it before migration.";
  const pending = [gitDir];
  while (pending.length) {
    const current = pending.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) return "Git metadata contains a redirected path that cannot be adopted safely.";
      if (entry.name.endsWith(".lock")) return "Git metadata contains an active lock; retry after Git activity completes.";
      if (entry.isDirectory()) pending.push(path.join(current, entry.name));
    }
  }
  return null;
}

function planWithId(plan: Omit<ExistingProjectGitAdoptionPlan, "planId">, evidence: unknown): ExistingProjectGitAdoptionPlan {
  return { ...plan, planId: digest(JSON.stringify({ plan, evidence })) };
}

function manualPlan(repositoryId: string, topology: ExistingProjectGitAdoptionPlan["topology"], reason: string,
  snapshot?: GitSnapshot, journalDigest = "none"): ExistingProjectGitAdoptionPlan {
  const workingState = snapshot?.workingState ?? noWorkingState();
  return planWithId({ state: "manual-intervention-required", repositoryId, currentBranch: snapshot?.currentBranch ?? null,
    currentRevision: snapshot?.currentRevision ?? null, mainRevision: snapshot?.mainRevision ?? null,
    devRevision: snapshot?.devRevision ?? null, baselineSourceRef: snapshot?.baselineSourceRef ?? null,
    mainAction: "none", devAction: "none", activeBranchAction: "manual", workingState, topology,
    preservedRefCount: snapshot?.refCount ?? 0, preservedRemoteCount: snapshot?.remoteCount ?? 0,
    requiresConsent: false, warnings: [], manualReason: reason }, {
      refs: snapshot?.refsDigest ?? "none", remotes: snapshot?.remotesDigest ?? "none",
      worktrees: snapshot?.worktreesDigest ?? "none", working: snapshot?.workingStateDigest ?? "none", journalDigest,
    });
}

async function validManagedCheckout(checkout: string, role: "main" | "dev", metadataRoot: string): Promise<boolean> {
  if (!fs.existsSync(checkout) || fs.lstatSync(checkout).isSymbolicLink() || !fs.lstatSync(checkout).isDirectory()) return false;
  const [top, branch, common] = await Promise.all([
    git(checkout, ["rev-parse", "--show-toplevel"], { optional: true }),
    git(checkout, ["branch", "--show-current"], { optional: true }),
    git(checkout, ["rev-parse", "--git-common-dir"], { optional: true }),
  ]);
  return Boolean(top && branch === role && common && path.resolve(top) === path.resolve(checkout)
    && path.resolve(checkout, common) === path.resolve(metadataRoot));
}

/** Inspects Existing Project source state without creating files, refs, checkouts, or registrations. */
export async function inspectExistingProjectGitAdoption(projectRoot: string, repositoryId: string): Promise<ExistingProjectGitAdoptionPlan> {
  if (!boundedIdentity(repositoryId)) fail("Existing Project adoption requires a bounded Repository identity.");
  const topologyPaths = resolveManagedProjectSourceTopology(projectRoot);
  const root = topologyPaths.projectContainerRoot;
  const rootGitPath = path.join(root, ".git");
  const conventionalGit = fs.existsSync(rootGitPath);
  const managedMetadata = fs.existsSync(topologyPaths.repositoryMetadataRoot);
  const mainCheckout = fs.existsSync(topologyPaths.mainCheckoutRoot);
  const devCheckout = fs.existsSync(topologyPaths.devCheckoutRoot);
  const migrationsRoot = path.join(root, ".champcity", "migrations");
  const recoveryStaging = fs.existsSync(path.join(root, ".champcity")) && fs.readdirSync(path.join(root, ".champcity"))
    .some(name => name.startsWith("original-git-"));
  const topology = { conventionalGit, managedMetadata, mainCheckout, devCheckout, recoveryStaging };
  let journal: ExistingProjectGitAdoptionJournal | null = null;
  let journalDigest = "none";
  try {
    journal = loadExistingProjectGitAdoptionJournal(root, repositoryId);
    if (journal) journalDigest = digest(JSON.stringify(journal));
  } catch (error) {
    return manualPlan(repositoryId, topology, error instanceof Error ? error.message : "Migration journal is invalid.");
  }
  if (!conventionalGit && !managedMetadata && !mainCheckout && !devCheckout && !recoveryStaging) {
    return planWithId({ state: "source-neutral", repositoryId: null, currentBranch: null, currentRevision: null,
      mainRevision: null, devRevision: null, baselineSourceRef: null, mainAction: "none", devAction: "none",
      activeBranchAction: "none", workingState: noWorkingState(), topology, preservedRefCount: 0, preservedRemoteCount: 0,
      requiresConsent: false, warnings: [], manualReason: null }, { topology: topologyBits(topology), journalDigest });
  }
  if (conventionalGit && (fs.lstatSync(rootGitPath).isSymbolicLink() || !fs.lstatSync(rootGitPath).isDirectory()))
    return manualPlan(repositoryId, topology, "Conventional Git metadata is redirected or is not an owned directory.", undefined, journalDigest);

  let snapshot: GitSnapshot | undefined;
  try {
    if (conventionalGit) {
      const exactGitDir = await git(root, ["rev-parse", "--absolute-git-dir"]);
      const exactTop = await git(root, ["rev-parse", "--show-toplevel"]);
      if (!exactGitDir || !exactTop || path.resolve(exactGitDir) !== path.resolve(rootGitPath) || path.resolve(exactTop) !== root)
        return manualPlan(repositoryId, topology, "Selected Project is not the exact root of an owned conventional Git repository.", undefined, journalDigest);
      const unsafe = findUnsafeGitMetadata(rootGitPath);
      if (unsafe) return manualPlan(repositoryId, topology, unsafe, undefined, journalDigest);
      if (fs.existsSync(path.join(root, ".gitmodules")) || fs.existsSync(path.join(rootGitPath, "objects", "info", "alternates")))
        return manualPlan(repositoryId, topology, "Submodules or external object alternates require manual repository normalization.", undefined, journalDigest);
      snapshot = await inspectGit(root);
      const worktreeRoots = snapshot.worktrees.split("\n").filter(line => line.startsWith("worktree "))
        .map(line => path.resolve(line.slice("worktree ".length)));
      if (worktreeRoots.some(worktree => worktree !== root))
        return manualPlan(repositoryId, topology, "Additional linked worktrees must be normalized manually before migration.", snapshot, journalDigest);
      if (!snapshot.currentBranch)
        return manualPlan(repositoryId, topology, "Detached HEAD has no deterministic attached source branch for migration.", snapshot, journalDigest);
    }
  } catch {
    return manualPlan(repositoryId, topology, "Conventional Git metadata is malformed or could not be inspected.", snapshot, journalDigest);
  }

  if (!conventionalGit && managedMetadata && mainCheckout && devCheckout) {
    try {
      const bare = await git(topologyPaths.repositoryMetadataRoot, ["rev-parse", "--is-bare-repository"], { optional: true });
      const [validMain, validDev] = await Promise.all([
        validManagedCheckout(topologyPaths.mainCheckoutRoot, "main", topologyPaths.repositoryMetadataRoot),
        validManagedCheckout(topologyPaths.devCheckoutRoot, "dev", topologyPaths.repositoryMetadataRoot),
      ]);
      if (bare !== "true" || !validMain || !validDev)
        return manualPlan(repositoryId, topology, "Managed Repository or Main/Dev checkout identity is invalid.", undefined, journalDigest);
      const managed = await inspectGit(topologyPaths.devCheckoutRoot);
      return planWithId({ state: "managed-ready", repositoryId, currentBranch: managed.currentBranch,
        currentRevision: managed.currentRevision, mainRevision: managed.mainRevision, devRevision: managed.devRevision,
        baselineSourceRef: "main", mainAction: "none", devAction: "none", activeBranchAction: "none",
        workingState: managed.workingState, topology, preservedRefCount: managed.refCount, preservedRemoteCount: managed.remoteCount,
        requiresConsent: false, warnings: [], manualReason: null }, { refs: managed.refsDigest, remotes: managed.remotesDigest,
          worktrees: managed.worktreesDigest, working: managed.workingStateDigest, topology: topologyBits(topology), journalDigest });
    } catch {
      return manualPlan(repositoryId, topology, "Managed Repository or Main/Dev checkout identity is malformed.", undefined, journalDigest);
    }
  }

  if (managedMetadata || mainCheckout || devCheckout || recoveryStaging) {
    if (!journal && !(conventionalGit && managedMetadata))
      return manualPlan(repositoryId, topology, "Partial managed topology has no valid ChampCity migration journal.", snapshot, journalDigest);
    if (conventionalGit && managedMetadata) {
      const bare = await git(topologyPaths.repositoryMetadataRoot, ["rev-parse", "--is-bare-repository"], { optional: true });
      const managedRefs = bare === "true" ? await git(root, ["for-each-ref", "--sort=refname", "--format=%(refname)%00%(objectname)",
        "refs/heads", "refs/remotes", "refs/tags"], { optional: true, gitDir: topologyPaths.repositoryMetadataRoot }) : null;
      if (!snapshot || bare !== "true" || managedRefs?.split(/\r?\n/).filter(Boolean).sort().join("\n") !== snapshot.refs)
        return manualPlan(repositoryId, topology, "Conventional and managed Repository identities diverge.", snapshot, journalDigest);
    }
    const requiresConsent = Boolean(journal && (journal.captureSnapshotRequired || journal.activeBranchAction === "fast-forward-dev"
      || journal.activeBranchAction === "merge-into-dev" || !journal.mainRevision));
    return planWithId({ state: "resumable-partial", repositoryId, currentBranch: snapshot?.currentBranch ?? journal?.originalCurrentBranch ?? null,
      currentRevision: snapshot?.currentRevision ?? journal?.originalCurrentRevision ?? null, mainRevision: snapshot?.mainRevision ?? journal?.mainRevision ?? null,
      devRevision: snapshot?.devRevision ?? journal?.devRevision ?? null, baselineSourceRef: snapshot?.baselineSourceRef ?? journal?.baselineSourceRef ?? null,
      mainAction: snapshot?.mainRevision || journal?.mainRevision ? "none" : "create-from-source",
      devAction: snapshot?.devRevision || journal?.devRevision ? "none" : "create-from-main",
      activeBranchAction: snapshot?.activeBranchAction ?? journal?.activeBranchAction ?? "none",
      workingState: snapshot?.workingState ?? noWorkingState(), topology,
      preservedRefCount: snapshot?.refCount ?? 0, preservedRemoteCount: snapshot?.remoteCount ?? 0, requiresConsent,
      warnings: requiresConsent ? ["Resuming this migration still requires the previously planned source normalization."] : [], manualReason: null },
    { refs: snapshot?.refsDigest ?? journal?.originalRefsDigest, remotes: snapshot?.remotesDigest ?? journal?.originalRemotesDigest,
      worktrees: snapshot?.worktreesDigest ?? "managed-partial", working: snapshot?.workingStateDigest ?? journal?.workingStateDigest,
      topology: topologyBits(topology), journalDigest });
  }

  if (!snapshot) return manualPlan(repositoryId, topology, "Git repository state could not be inspected.", undefined, journalDigest);
  const mainRevision = snapshot.mainRevision ?? (snapshot.baselineSourceRef
    ? await git(root, ["rev-parse", `refs/heads/${snapshot.baselineSourceRef}`], { optional: true }) : null);
  if (!mainRevision) return manualPlan(repositoryId, topology, "No deterministic main baseline source could be resolved.", snapshot, journalDigest);
  const semanticBranchChange = snapshot.activeBranchAction === "fast-forward-dev" || snapshot.activeBranchAction === "merge-into-dev";
  const requiresConsent = !snapshot.mainRevision || semanticBranchChange || snapshot.workingState.captureSnapshotRequired;
  const warnings = [
    ...(!snapshot.mainRevision ? [`main will be created from ${snapshot.baselineSourceRef}.`] : []),
    ...(semanticBranchChange ? [`${snapshot.currentBranch} will be integrated into dev.`] : []),
    ...(snapshot.workingState.captureSnapshotRequired ? ["Non-ignored working changes will be captured in an adoption snapshot."] : []),
  ];
  return planWithId({ state: requiresConsent ? "migration-consent-required" : "conventional-auto", repositoryId,
    currentBranch: snapshot.currentBranch, currentRevision: snapshot.currentRevision, mainRevision,
    devRevision: snapshot.devRevision, baselineSourceRef: snapshot.baselineSourceRef,
    mainAction: snapshot.mainRevision ? "none" : "create-from-source",
    devAction: semanticBranchChange ? (snapshot.activeBranchAction === "fast-forward-dev" ? "fast-forward" : "merge")
      : snapshot.devRevision ? "none" : "create-from-main",
    activeBranchAction: snapshot.activeBranchAction, workingState: snapshot.workingState, topology,
    preservedRefCount: snapshot.refCount, preservedRemoteCount: snapshot.remoteCount, requiresConsent,
    warnings, manualReason: null }, { refs: snapshot.refsDigest, remotes: snapshot.remotesDigest,
      worktrees: snapshot.worktreesDigest, working: snapshot.workingStateDigest, topology: topologyBits(topology), journalDigest });
}

export async function inspectExistingProjectGitAdoptionEvidence(projectRoot: string): Promise<{
  refsDigest: string; remotesDigest: string; workingStateDigest: string;
}> {
  const snapshot = await inspectGit(fs.realpathSync(projectRoot));
  return { refsDigest: snapshot.refsDigest, remotesDigest: snapshot.remotesDigest, workingStateDigest: snapshot.workingStateDigest };
}
