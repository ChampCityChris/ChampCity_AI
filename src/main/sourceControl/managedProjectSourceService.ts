import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import { MANAGED_PROJECT_SOURCE_PATHS, type RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import type { AgentHarnessRegisteredRepositoryCheckoutSummary } from "../../shared/workspaceContracts";
import { resolveManagedProjectSourceTopology, validateRepositoryCheckoutContract } from "./projectSourceTopology";

export interface ManagedProjectCheckoutRegistration {
  registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
  unregisterRepositoryCheckout?(workspaceId: string, repositoryCheckoutId: string): Promise<unknown>;
}

export interface ManagedProjectSourceResult {
  projectContainerRoot: string;
  repositoryMetadataRoot: string;
  mainCheckoutRoot: string;
  devCheckoutRoot: string;
  repositoryId: string;
  main: AgentHarnessRegisteredRepositoryCheckoutSummary;
  dev: AgentHarnessRegisteredRepositoryCheckoutSummary;
  materialized: boolean;
}

async function git(cwd: string, args: string[], options: { optional?: boolean; gitDir?: string } = {}): Promise<string | null> {
  const command = options.gitDir ? ["--git-dir", options.gitDir, ...args] : args;
  const result = await runBoundedGit({ cwd, args: command, rejectNonZero: !options.optional });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

function fail(code: "WORKSPACE_ACCESS_DENIED" | "STALE_SOURCE" | "WORKSPACE_REGISTRY_CONFLICT", message: string): never {
  throw new AgentHarnessError(code, message);
}

function checkoutId(role: "main" | "dev", repositoryId: string): string {
  return `${role}-${createHash("sha256").update(repositoryId).digest("hex").slice(0, 32)}`;
}

function gitDirectory(projectRoot: string): string {
  const candidate = path.join(projectRoot, ".git");
  if (!fs.existsSync(candidate) || fs.lstatSync(candidate).isSymbolicLink() || !fs.lstatSync(candidate).isDirectory())
    fail("STALE_SOURCE", "Existing Project adoption requires a conventional repository with an owned .git directory.");
  return candidate;
}

function assertNoGitLocks(directory: string): void {
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.name.endsWith(".lock")) fail("STALE_SOURCE", "Git metadata contains an active lock; retry after Git activity completes.");
      if (entry.isSymbolicLink()) fail("WORKSPACE_ACCESS_DENIED", "Git metadata contains a redirect that cannot be safely adopted.");
      if (entry.isDirectory()) pending.push(absolute);
    }
  }
}

async function verifyExactCheckout(root: string, role: "main" | "dev", metadataRoot: string): Promise<void> {
  const resolved = fs.realpathSync(root);
  if (path.resolve(resolved) !== path.resolve(root) || !fs.statSync(resolved).isDirectory())
    fail("WORKSPACE_ACCESS_DENIED", `The ${role} checkout path is redirected or unavailable.`);
  const [top, branch, common] = await Promise.all([
    git(resolved, ["rev-parse", "--show-toplevel"]),
    git(resolved, ["branch", "--show-current"]),
    git(resolved, ["rev-parse", "--git-common-dir"]),
  ]);
  if (!top || path.resolve(top) !== path.resolve(resolved) || branch !== role ||
    !common || path.resolve(resolved, common) !== path.resolve(metadataRoot))
    fail("STALE_SOURCE", `The ${role} path is not an exact ${role} checkout of the managed Repository.`);
}

async function registerCheckouts(input: {
  root: string; repositoryId: string; workspaceId: string; registration: ManagedProjectCheckoutRegistration; materialized: boolean;
}): Promise<ManagedProjectSourceResult> {
  const topology = resolveManagedProjectSourceTopology(input.root);
  const mainCheckout: RepositoryCheckout = { repositoryCheckoutId: checkoutId("main", input.repositoryId), repositoryId: input.repositoryId,
    sourceLineId: "main", role: "main", projectRelativePath: MANAGED_PROJECT_SOURCE_PATHS.mainCheckoutRelativePath };
  const devCheckout: RepositoryCheckout = { repositoryCheckoutId: checkoutId("dev", input.repositoryId), repositoryId: input.repositoryId,
    sourceLineId: "dev", role: "dev", projectRelativePath: MANAGED_PROJECT_SOURCE_PATHS.devCheckoutRelativePath };
  for (const descriptor of [mainCheckout, devCheckout]) {
    if (!validateRepositoryCheckoutContract(descriptor).valid) fail("WORKSPACE_REGISTRY_CONFLICT", "Managed checkout descriptor failed contract validation.");
  }
  const [main, dev] = await Promise.all([
    input.registration.registerRepositoryCheckout(input.workspaceId, mainCheckout),
    input.registration.registerRepositoryCheckout(input.workspaceId, devCheckout),
  ]);
  return { projectContainerRoot: topology.projectContainerRoot, repositoryMetadataRoot: topology.repositoryMetadataRoot,
    mainCheckoutRoot: topology.mainCheckoutRoot, devCheckoutRoot: topology.devCheckoutRoot, repositoryId: input.repositoryId,
    main, dev, materialized: input.materialized };
}

async function existingManaged(input: {
  root: string; repositoryId: string; workspaceId: string; registration: ManagedProjectCheckoutRegistration;
}): Promise<ManagedProjectSourceResult> {
  const topology = resolveManagedProjectSourceTopology(input.root);
  if (fs.existsSync(path.join(topology.projectContainerRoot, ".git")))
    fail("WORKSPACE_ACCESS_DENIED", "Project root still contains Git metadata; managed topology is incomplete.");
  const bare = await git(topology.repositoryMetadataRoot, ["rev-parse", "--is-bare-repository"], { optional: true });
  if (bare !== "true" || !fs.existsSync(topology.mainCheckoutRoot) || !fs.existsSync(topology.devCheckoutRoot))
    fail("STALE_SOURCE", "Existing Project has a partial or conflicting managed topology; no source was changed.");
  await verifyExactCheckout(topology.mainCheckoutRoot, "main", topology.repositoryMetadataRoot);
  await verifyExactCheckout(topology.devCheckoutRoot, "dev", topology.repositoryMetadataRoot);
  return registerCheckouts({ ...input, materialized: false });
}

/** Safely moves a conventional Git Project into the adopted non-Git container plus Main/Dev topology. */
export async function establishManagedProjectSource(input: {
  projectRoot: string;
  repositoryId: string;
  workspaceId: string;
  checkoutRegistration: ManagedProjectCheckoutRegistration;
}): Promise<ManagedProjectSourceResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(input.repositoryId) || !input.workspaceId.trim())
    fail("WORKSPACE_REGISTRY_CONFLICT", "Exact bounded Repository and Project workspace identities are required.");
  const topology = resolveManagedProjectSourceTopology(input.projectRoot);
  const root = topology.projectContainerRoot;
  const metadataRoot = topology.repositoryMetadataRoot;
  if (!fs.existsSync(path.join(root, ".git"))) {
    if (fs.existsSync(metadataRoot)) return existingManaged({ root, repositoryId: input.repositoryId,
      workspaceId: input.workspaceId, registration: input.checkoutRegistration });
    fail("STALE_SOURCE", "No existing Git Repository was found; Greenfield bootstrap belongs to WRB01-03.");
  }
  const gitDir = gitDirectory(root);
  if (fs.existsSync(metadataRoot) || fs.existsSync(topology.mainCheckoutRoot) || fs.existsSync(topology.devCheckoutRoot))
    fail("WORKSPACE_ACCESS_DENIED", "Existing managed source paths conflict with the conventional Project; no source was changed.");
  assertNoGitLocks(gitDir);
  if (fs.existsSync(path.join(root, ".gitmodules")) || fs.existsSync(path.join(gitDir, "objects", "info", "alternates")))
    fail("STALE_SOURCE", "Repositories with submodules or external object alternates require manual topology adoption.");

  const [top, resolvedGitDir, mainRef, devRef, worktrees, refs, remotes] = await Promise.all([
    git(root, ["rev-parse", "--show-toplevel"]), git(root, ["rev-parse", "--absolute-git-dir"]),
    git(root, ["show-ref", "--verify", "--hash", "refs/heads/main"], { optional: true }),
    git(root, ["show-ref", "--verify", "--hash", "refs/heads/dev"], { optional: true }),
    git(root, ["worktree", "list", "--porcelain"]),
    git(root, ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"]),
    git(root, ["remote", "-v"]),
  ]);
  if (!top || path.resolve(top) !== path.resolve(root) || !resolvedGitDir || path.resolve(resolvedGitDir) !== path.resolve(gitDir))
    fail("WORKSPACE_ACCESS_DENIED", "Selected Project is not the exact root of its conventional Git Repository.");
  if (!mainRef || !devRef) fail("STALE_SOURCE", "Existing Project must already contain both main and dev refs; no branch history will be invented.");
  if (worktrees?.split(/\r?\n/).filter(line => line.startsWith("worktree ")).length !== 1)
    fail("STALE_SOURCE", "Repository has additional linked worktrees; normalize them before Project topology adoption.");
  for (const reserved of ["Main", "Dev", ".champcity/repository.git"]) {
    if (fs.existsSync(path.join(root, reserved))) fail("WORKSPACE_ACCESS_DENIED", `Source entry conflicts with managed path '${reserved}'; no source was changed.`);
  }
  const appRoot = path.join(root, ".champcity");
  const appExisted = fs.existsSync(appRoot);
  if (!appExisted) fs.mkdirSync(appRoot);
  if (fs.lstatSync(appRoot).isSymbolicLink() || !fs.lstatSync(appRoot).isDirectory() || path.dirname(fs.realpathSync(appRoot)) !== root)
    fail("WORKSPACE_ACCESS_DENIED", "Project State storage is redirected or unavailable.");
  const moved: string[] = [];
  let originalMetadataMoved = false;
  let devCreated = false;
  let mainCreated = false;
  const stagingOriginal = path.join(appRoot, `original-git-${createHash("sha256").update(input.repositoryId).digest("hex").slice(0, 12)}`);
  const sourceEntries = fs.readdirSync(root).filter(name => name !== ".git" && name !== ".champcity");
  let stage = "copy Repository metadata";
  try {
    fs.cpSync(gitDir, metadataRoot, { recursive: true, preserveTimestamps: true, errorOnExist: true, force: false });
    stage = "prepare bare Repository metadata";
    const bare = await git(root, ["config", "core.bare", "true"], { optional: true, gitDir: metadataRoot });
    if (bare !== "") fail("STALE_SOURCE", "Repository common metadata could not be prepared as a bare Git directory.");
    stage = "create Main checkout";
    await git(root, ["worktree", "add", "--no-checkout", topology.mainCheckoutRoot, "main"], { gitDir: metadataRoot });
    mainCreated = true;
    await git(topology.mainCheckoutRoot, ["reset", "--mixed", "main"]);
    stage = "create Dev checkout";
    await git(root, ["worktree", "add", topology.devCheckoutRoot, "dev"], { gitDir: metadataRoot });
    devCreated = true;
    stage = "move Project source entries into Main";
    for (const name of sourceEntries) {
      const source = path.join(root, name);
      const destination = path.join(topology.mainCheckoutRoot, name);
      if (fs.existsSync(destination)) fail("WORKSPACE_ACCESS_DENIED", `Main checkout conflicts with existing source entry '${name}'.`);
      fs.renameSync(source, destination);
      moved.push(name);
    }
    if (fs.existsSync(stagingOriginal)) fail("STALE_SOURCE", "Original Git metadata recovery path already exists.");
    stage = "move original Git metadata into recovery staging";
    fs.renameSync(gitDir, stagingOriginal);
    originalMetadataMoved = true;

    stage = "verify managed checkouts and retained Git metadata";
    await verifyExactCheckout(topology.mainCheckoutRoot, "main", metadataRoot);
    await verifyExactCheckout(topology.devCheckoutRoot, "dev", metadataRoot);
    const [afterRefs, afterRemotes] = await Promise.all([
      git(topology.mainCheckoutRoot, ["for-each-ref", "--format=%(refname)%00%(objectname)", "refs/heads", "refs/remotes", "refs/tags"]),
      git(topology.mainCheckoutRoot, ["remote", "-v"]),
    ]);
    if (refs !== afterRefs || remotes !== afterRemotes)
      fail("STALE_SOURCE", "Repository refs or remote configuration changed during adoption; inspect the recovery metadata.");
    const rootGit = await git(root, ["rev-parse", "--show-toplevel"], { optional: true });
    if (rootGit && path.resolve(rootGit) === path.resolve(root))
      fail("STALE_SOURCE", "Project root remains Git-backed after managed source preparation.");

  } catch (error) {
    for (const name of moved.reverse()) {
      const source = path.join(topology.mainCheckoutRoot, name);
      const destination = path.join(root, name);
      if (fs.existsSync(source) && !fs.existsSync(destination)) fs.renameSync(source, destination);
    }
    if (originalMetadataMoved) {
      if (fs.existsSync(stagingOriginal) && !fs.existsSync(gitDir)) fs.renameSync(stagingOriginal, gitDir);
    }
    if (devCreated) await git(root, ["worktree", "remove", "--force", topology.devCheckoutRoot], { optional: true, gitDir: metadataRoot }).catch(() => undefined);
    if (mainCreated) await git(root, ["worktree", "remove", "--force", topology.mainCheckoutRoot], { optional: true, gitDir: metadataRoot }).catch(() => undefined);
    if (fs.existsSync(metadataRoot)) fs.rmSync(metadataRoot, { recursive: true, force: true });
    if (!appExisted && fs.existsSync(appRoot) && fs.readdirSync(appRoot).length === 0) fs.rmdirSync(appRoot);
    if (error instanceof AgentHarnessError) throw error;
    const failureCode = String((error as NodeJS.ErrnoException)?.code ?? (error instanceof Error ? error.name : "unknown"))
      .replace(/[^A-Z0-9_-]/gi, "_").slice(0, 40);
    fail("STALE_SOURCE", `Managed Project topology failed during ${stage} (${failureCode}); the original Project source was restored where safe.`);
  }
  fs.rmSync(stagingOriginal, { recursive: true, force: true });
  return registerCheckouts({ root, repositoryId: input.repositoryId, workspaceId: input.workspaceId,
    registration: input.checkoutRegistration, materialized: true });
}
