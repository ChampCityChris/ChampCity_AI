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

async function git(cwd: string, args: string[], optional = false): Promise<string | null> {
  const result = await runBoundedGit({ cwd, args, rejectNonZero: !optional });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

function fail(code: "WORKSPACE_ACCESS_DENIED" | "STALE_SOURCE" | "WORKSPACE_REGISTRY_CONFLICT", message: string): never {
  throw new AgentHarnessError(code, message);
}

function checkoutId(role: "main" | "dev", repositoryId: string): string {
  return `${role}-${createHash("sha256").update(repositoryId).digest("hex").slice(0, 32)}`;
}

async function verifyExactCheckout(root: string, role: "main" | "dev", metadataRoot: string): Promise<void> {
  let resolved: string;
  try {
    resolved = fs.realpathSync(root);
    if (path.resolve(resolved) !== path.resolve(root) || !fs.statSync(resolved).isDirectory()) throw new Error("redirect");
  } catch {
    fail("WORKSPACE_ACCESS_DENIED", `The ${role} checkout path is redirected or unavailable.`);
  }
  const [top, branch, common] = await Promise.all([
    git(resolved!, ["rev-parse", "--show-toplevel"]),
    git(resolved!, ["branch", "--show-current"]),
    git(resolved!, ["rev-parse", "--git-common-dir"]),
  ]);
  if (!top || path.resolve(top) !== path.resolve(resolved!) || branch !== role ||
    !common || path.resolve(resolved!, common) !== path.resolve(metadataRoot)) {
    fail("STALE_SOURCE", `The ${role} path is not an exact ${role} checkout of the managed Repository.`);
  }
}

/** Resolves only the durable managed Dev checkout; Project-container Git fallback is forbidden. */
export async function resolveManagedDevRepositoryCheckout(projectRoot: string): Promise<string> {
  const topology = resolveManagedProjectSourceTopology(projectRoot);
  if (fs.existsSync(path.join(topology.projectContainerRoot, ".git")) ||
    !fs.existsSync(topology.repositoryMetadataRoot) || !fs.existsSync(topology.devCheckoutRoot)) {
    fail("STALE_SOURCE", "Managed Dev RepositoryCheckout is unavailable; establish managed Project source first.");
  }
  const bare = await git(topology.repositoryMetadataRoot, ["rev-parse", "--is-bare-repository"], true);
  if (bare !== "true") fail("STALE_SOURCE", "Managed Repository metadata is not available.");
  await verifyExactCheckout(topology.devCheckoutRoot, "dev", topology.repositoryMetadataRoot);
  return topology.devCheckoutRoot;
}

async function registerCheckouts(input: {
  root: string; repositoryId: string; workspaceId: string; registration: ManagedProjectCheckoutRegistration;
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
    main, dev, materialized: false };
}

/** Verifies and registers application-owned topology. Conventional Git conversion is owned by the adoption service. */
export async function establishManagedProjectSource(input: {
  projectRoot: string;
  repositoryId: string;
  workspaceId: string;
  checkoutRegistration: ManagedProjectCheckoutRegistration;
}): Promise<ManagedProjectSourceResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(input.repositoryId) || !input.workspaceId.trim()) {
    fail("WORKSPACE_REGISTRY_CONFLICT", "Exact bounded Repository and Project workspace identities are required.");
  }
  const topology = resolveManagedProjectSourceTopology(input.projectRoot);
  if (fs.existsSync(path.join(topology.projectContainerRoot, ".git"))) {
    fail("STALE_SOURCE", "Conventional Git must be converted before managed source registration.");
  }
  const bare = await git(topology.repositoryMetadataRoot, ["rev-parse", "--is-bare-repository"], true);
  if (bare !== "true" || !fs.existsSync(topology.mainCheckoutRoot) || !fs.existsSync(topology.devCheckoutRoot)) {
    fail("STALE_SOURCE", "Existing Project has no complete managed source topology.");
  }
  await verifyExactCheckout(topology.mainCheckoutRoot, "main", topology.repositoryMetadataRoot);
  await verifyExactCheckout(topology.devCheckoutRoot, "dev", topology.repositoryMetadataRoot);
  return registerCheckouts({ root: topology.projectContainerRoot, repositoryId: input.repositoryId,
    workspaceId: input.workspaceId, registration: input.checkoutRegistration });
}
