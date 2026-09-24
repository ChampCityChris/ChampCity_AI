import fs from "node:fs";
import path from "node:path";
import { AgentHarnessError } from "../agentHarness/core/errors";
import {
  MANAGED_PROJECT_SOURCE_PATHS,
  type RepositoryCheckout,
} from "../../shared/sourceLifecycleContracts";

const opaqueIdentity = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const canonicalWorkflowId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ManagedProjectSourceTopology {
  projectContainerRoot: string;
  repositoryMetadataRoot: string;
  mainCheckoutRoot: string;
  devCheckoutRoot: string;
  workflowCheckoutRoot: string;
}

export interface ManagedWorkflowCheckoutPath {
  projectContainerRoot: string;
  workflowCheckoutRoot: string;
  checkoutRoot: string;
  projectRelativePath: string;
}

function contained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function canonicalProjectRoot(projectContainerRoot: string): string {
  if (!projectContainerRoot || typeof projectContainerRoot !== "string") {
    throw new AgentHarnessError("INVALID_INPUT", "An existing Project container directory is required.");
  }
  let canonical: string;
  try {
    canonical = fs.realpathSync(projectContainerRoot);
    if (!fs.statSync(canonical).isDirectory()) throw new Error("not a directory");
  } catch {
    throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Project container must be an existing directory.");
  }
  return canonical;
}

/** Reject existing redirects and non-directory ancestors while allowing not-yet-created topology. */
function assertManagedPathIsSafe(projectRoot: string, relativePath: string): string {
  const segments = relativePath.split("/");
  let current = projectRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!contained(projectRoot, current)) {
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Managed source path escapes the Project container.");
    }
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error("redirect");
      const resolved = fs.realpathSync(current);
      if (path.resolve(resolved) !== path.resolve(current) || !contained(projectRoot, resolved)) throw new Error("redirect");
      if (!stat.isDirectory()) throw new Error("not a directory");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") break;
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Managed source topology contains a redirect or non-directory path.");
    }
  }
  return path.resolve(projectRoot, ...segments);
}

/** Resolve canonical absolute locations without requiring Git or creating topology. */
export function resolveManagedProjectSourceTopology(projectContainerRoot: string): ManagedProjectSourceTopology {
  const projectRoot = canonicalProjectRoot(projectContainerRoot);
  const paths = MANAGED_PROJECT_SOURCE_PATHS;
  return {
    projectContainerRoot: projectRoot,
    repositoryMetadataRoot: assertManagedPathIsSafe(projectRoot, paths.repositoryMetadataRelativePath),
    mainCheckoutRoot: assertManagedPathIsSafe(projectRoot, paths.mainCheckoutRelativePath),
    devCheckoutRoot: assertManagedPathIsSafe(projectRoot, paths.devCheckoutRelativePath),
    workflowCheckoutRoot: assertManagedPathIsSafe(projectRoot, paths.workflowCheckoutRootRelativePath),
  };
}

export function resolveManagedWorkflowCheckoutPath(projectContainerRoot: string, workflowId: string): ManagedWorkflowCheckoutPath {
  if (typeof workflowId !== "string" || !canonicalWorkflowId.test(workflowId)) {
    throw new AgentHarnessError("INVALID_INPUT", "Workflow ID must be a canonical lowercase UUID.");
  }
  const topology = resolveManagedProjectSourceTopology(projectContainerRoot);
  const projectRelativePath = `${MANAGED_PROJECT_SOURCE_PATHS.workflowCheckoutRootRelativePath}/${workflowId}`;
  const checkoutRoot = assertManagedPathIsSafe(topology.projectContainerRoot, projectRelativePath);
  return { projectContainerRoot: topology.projectContainerRoot, workflowCheckoutRoot: topology.workflowCheckoutRoot,
    checkoutRoot, projectRelativePath };
}

function canonicalRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.startsWith("/") || value.endsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(value) || value.includes(":") || value.trim() !== value) return false;
  const segments = value.split("/");
  return segments.every(segment => segment.length > 0 && segment !== "." && segment !== ".." && !/[\s]/.test(segment));
}

export function validateRepositoryCheckoutContract(checkout: RepositoryCheckout): { valid: boolean; reason?: string } {
  if (!checkout || typeof checkout !== "object") return { valid: false, reason: "checkout must be an object" };
  if (![checkout.repositoryCheckoutId, checkout.repositoryId, checkout.sourceLineId].every(value => typeof value === "string" && opaqueIdentity.test(value))) {
    return { valid: false, reason: "checkout, repository, and source line identities must be bounded opaque identities" };
  }
  if (!canonicalRelativePath(checkout.projectRelativePath)) return { valid: false, reason: "path must be canonical Project-relative forward-slash form" };
  const paths = MANAGED_PROJECT_SOURCE_PATHS;
  if ([".", ".champcity", paths.repositoryMetadataRelativePath, paths.workflowCheckoutRootRelativePath].includes(checkout.projectRelativePath)) {
    return { valid: false, reason: "path cannot identify the Project root or shared repository metadata" };
  }
  if (checkout.role === "main") {
    return checkout.sourceLineId === "main" && checkout.projectRelativePath === paths.mainCheckoutRelativePath && checkout.workflowId === undefined
      ? { valid: true } : { valid: false, reason: "main checkout role, source line, path, or workflow ID is inconsistent" };
  }
  if (checkout.role === "dev") {
    return checkout.sourceLineId === "dev" && checkout.projectRelativePath === paths.devCheckoutRelativePath && checkout.workflowId === undefined
      ? { valid: true } : { valid: false, reason: "dev checkout role, source line, path, or workflow ID is inconsistent" };
  }
  if (checkout.role === "workflow") {
    if (typeof checkout.workflowId !== "string" || !canonicalWorkflowId.test(checkout.workflowId)) return { valid: false, reason: "Workflow checkout requires a canonical Workflow ID" };
    return checkout.projectRelativePath === `${paths.workflowCheckoutRootRelativePath}/${checkout.workflowId}`
      ? { valid: true } : { valid: false, reason: "Workflow checkout path must be derived exactly from its Workflow ID" };
  }
  return { valid: false, reason: "checkout role is unsupported" };
}
