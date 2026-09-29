import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import type { ProjectSourceBootstrap, RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import { MANAGED_PROJECT_SOURCE_PATHS } from "../../shared/sourceLifecycleContracts";
import type { AgentHarnessRegisteredRepositoryCheckoutSummary } from "../../shared/workspaceContracts";
import { INTEGRATION_POLICY_PATH } from "../../shared/integrationPolicyContracts";
import { writeManagedRepositoryIntegrationPolicy } from "./managedRepositoryIntegrationPolicy";

const initialSubject = "ChampCity initial source baseline";
const opaqueId = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const ignoreBaseline = [".champcity/", "node_modules/", "dist/", "build/", "out/", "release/", "coverage/", "",].join("\n");
export interface ProjectSourceCheckoutRegistration {
  workspaceId: string;
  registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary>;
}

async function git(root: string, args: string[], optional = false): Promise<string | null> {
  let result;
  try { result = await runBoundedGit({ cwd: root, args, rejectNonZero: !optional }); }
  catch (error) {
    if (error instanceof AgentHarnessError) {
      const diagnostic = typeof error.details?.stderr === "string" ? error.details.stderr.replaceAll(root, "<PROJECT_REPO>").replace(/[\r\n]+/g, " ").slice(0, 300) : "";
      throw new AgentHarnessError(error.code,
        `Managed bootstrap Git operation '${args.filter(value => !path.isAbsolute(value)).slice(0, 3).join(" ")}' failed.${diagnostic ? ` ${diagnostic}` : ""}`);
    }
    throw error;
  }
  return optional && result.exitCode !== 0 ? null : result.stdout.trim();
}

/** Creates an empty managed Project source topology with a deterministic tracked ignore baseline. */
export async function bootstrapProjectSource(root: string, repositoryId: string,
  registration?: ProjectSourceCheckoutRegistration): Promise<ProjectSourceBootstrap> {
  if (!opaqueId.test(repositoryId)) throw new AgentHarnessError("INVALID_INPUT", "A bounded repository identity is required.");
  const canonical = fs.realpathSync(root);
  if (!fs.statSync(canonical).isDirectory()) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Selected Project root is not a directory.");
  const paths = MANAGED_PROJECT_SOURCE_PATHS;
  const entries = fs.readdirSync(canonical);
  const appRoot = path.join(canonical, ".champcity");
  if (fs.existsSync(appRoot) && (!fs.lstatSync(appRoot).isDirectory() || fs.lstatSync(appRoot).isSymbolicLink() || path.dirname(fs.realpathSync(appRoot)) !== canonical))
    throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Greenfield source storage is not an owned directory.");
  const metadata = path.join(canonical, paths.repositoryMetadataRelativePath);
  const mainRoot = path.join(canonical, paths.mainCheckoutRelativePath);
  const devRoot = path.join(canonical, paths.devCheckoutRelativePath);
  const initialized = fs.existsSync(metadata);
  if (!initialized) {
    if (entries.some(entry => entry !== ".champcity")) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Greenfield source bootstrap requires an empty selected Project root.");
    if (fs.existsSync(mainRoot) || fs.existsSync(devRoot)) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Managed source paths already exist; bootstrap will not overwrite them.");
    fs.mkdirSync(appRoot, { recursive: true });
    await git(canonical, ["init", "--bare", metadata]);
    await git(canonical, ["--git-dir", metadata, "worktree", "add", "--orphan", "-b", "main", mainRoot]);
    fs.writeFileSync(path.join(mainRoot, ".gitignore"), ignoreBaseline, { flag: "wx" });
    writeManagedRepositoryIntegrationPolicy(mainRoot);
    await git(mainRoot, ["add", "--", ".gitignore"]);
    await git(mainRoot, ["add", "-f", "--", INTEGRATION_POLICY_PATH]);
    await runBoundedGit({ cwd: mainRoot,
      args: ["-c", "user.name=ChampCity", "-c", "user.email=champcity@invalid.local", "commit", "-m", initialSubject],
      commitDates: { author: "946684800 +0000", committer: "946684800 +0000" } });
    const main = await git(mainRoot, ["rev-parse", "HEAD"]);
    if (!main) throw new AgentHarnessError("GIT_EXECUTION_FAILED", "Initial source revision could not be created.");
    await git(canonical, ["--git-dir", metadata, "worktree", "add", "-b", "dev", devRoot, main]);
  }
  for (const [label, managedPath] of [["Repository metadata", metadata], ["Main checkout", mainRoot], ["Dev checkout", devRoot]] as const) {
    let stat: fs.Stats;
    try { stat = fs.lstatSync(managedPath); }
    catch { throw new AgentHarnessError("STALE_SOURCE", `${label} is missing from the managed Greenfield topology.`); }
    if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(fs.realpathSync(managedPath)) !== path.resolve(managedPath))
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", `${label} is redirected or unavailable.`);
  }
  if (fs.existsSync(path.join(canonical, ".git"))) throw new AgentHarnessError("STALE_SOURCE", "Project root must remain outside Git.");
  const top = await git(mainRoot, ["rev-parse", "--show-toplevel"], true);
  const bare = await git(metadata, ["rev-parse", "--is-bare-repository"], true);
  if (bare !== "true" || !top || path.resolve(top) !== path.resolve(mainRoot)) throw new AgentHarnessError("STALE_SOURCE", "Managed Greenfield topology is incompatible.");
  const [mainBranch, devBranch, main, dev, tree, subject, parents] = await Promise.all([
    git(mainRoot, ["branch", "--show-current"]), git(devRoot, ["branch", "--show-current"]), git(mainRoot, ["rev-parse", "HEAD"]),
    git(devRoot, ["rev-parse", "HEAD"]), git(mainRoot, ["rev-parse", "HEAD^{tree}"]), git(mainRoot, ["show", "-s", "--format=%s", "HEAD"]),
    git(mainRoot, ["show", "-s", "--format=%P", "HEAD"]),
  ]);
  if (mainBranch !== "main" || devBranch !== "dev" || main !== dev || !tree || subject !== initialSubject || parents)
    throw new AgentHarnessError("STALE_SOURCE", "Existing managed source history conflicts with the Greenfield baseline.");
  if (registration) {
    const make = (role: "main" | "dev"): RepositoryCheckout => ({ repositoryCheckoutId: `${role}-${createHash("sha256").update(repositoryId).digest("hex").slice(0, 32)}`,
      repositoryId, sourceLineId: role, role, projectRelativePath: role === "main" ? paths.mainCheckoutRelativePath : paths.devCheckoutRelativePath });
    await Promise.all([make("main"), make("dev")].map(checkout => registration.registerRepositoryCheckout(registration.workspaceId, checkout)));
  }
  const commitBytes = (await runBoundedGit({ cwd: mainRoot, args: ["cat-file", "commit", main!] })).stdoutBuffer;
  return { repositoryId, initialRevision: { repositoryId, revisionId: main! },
    initialCommitDigest: createHash("sha256").update(commitBytes).digest("hex"),
    stableLine: { repositoryId, sourceLineId: "main", providerBranchName: "main", headRevisionId: main! },
    integrationTarget: { repositoryId, sourceLineId: "dev", headRevisionId: dev! } };
}
