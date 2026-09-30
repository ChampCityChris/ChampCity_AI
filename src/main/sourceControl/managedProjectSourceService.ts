import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import type { RepositoryCheckout } from "../../shared/sourceLifecycleContracts";
import { resolveManagedProjectSourceTopology, validateRepositoryCheckoutContract } from "./projectSourceTopology";
import { managedRepositoryCheckouts } from "./repositoryCheckoutDescriptors";

export interface ManagedProjectSourceResult {
  projectContainerRoot: string;
  repositoryMetadataRoot: string;
  mainCheckoutRoot: string;
  devCheckoutRoot: string;
  repositoryId: string;
  mainCheckout: RepositoryCheckout;
  devCheckout: RepositoryCheckout;
  materialized: boolean;
}

async function git(cwd: string, args: string[], optional = false): Promise<string | null> {
  const result = await runBoundedGit({ cwd, args, rejectNonZero: !optional });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

function fail(code: "WORKSPACE_ACCESS_DENIED" | "STALE_SOURCE" | "WORKSPACE_REGISTRY_CONFLICT", message: string): never {
  throw new AgentHarnessError(code, message);
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

function managedSourceResult(root: string, repositoryId: string): ManagedProjectSourceResult {
  const topology = resolveManagedProjectSourceTopology(root);
  const { mainCheckout, devCheckout } = managedRepositoryCheckouts(repositoryId);
  for (const descriptor of [mainCheckout, devCheckout]) {
    if (!validateRepositoryCheckoutContract(descriptor).valid) fail("WORKSPACE_REGISTRY_CONFLICT", "Managed checkout descriptor failed contract validation.");
  }
  return { projectContainerRoot: topology.projectContainerRoot, repositoryMetadataRoot: topology.repositoryMetadataRoot,
    mainCheckoutRoot: topology.mainCheckoutRoot, devCheckoutRoot: topology.devCheckoutRoot, repositoryId,
    mainCheckout, devCheckout, materialized: false };
}

/** Verifies application-owned topology and returns its deterministic checkout descriptors. */
export async function establishManagedProjectSource(input: {
  projectRoot: string;
  repositoryId: string;
}): Promise<ManagedProjectSourceResult> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(input.repositoryId)) {
    fail("WORKSPACE_REGISTRY_CONFLICT", "An exact bounded Repository identity is required.");
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
  return managedSourceResult(topology.projectContainerRoot, input.repositoryId);
}
