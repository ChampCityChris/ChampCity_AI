import { managedWorkspaceId, verifyManagedCheckout } from "../repository/managedWorktrees";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type {
  AgentHarnessRegisteredWorkspaceSummary,
  AgentHarnessWorkspaceRegistrySnapshot,
  AgentHarnessRegisteredRepositoryCheckoutSummary,
} from "../../../shared/workspaceContracts";
import type { RepositoryCheckout } from "../../../shared/sourceLifecycleContracts";
import { validateRepositoryCheckoutContract, resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath } from "../../sourceControl/projectSourceTopology";
import { AgentHarnessError } from "../core/errors";
import {
  resolveWorkspaceRootContextAsync,
  type AgentHarnessWorkspaceContext,
} from "./workspaceAccess";

const registrySchemaVersion = 1 as const;
const registryDirectoryName = "agent-harness";
const registryFileName = "registered-workspaces.json";

interface StoredRegisteredWorkspace {
  workspaceId: string;
  canonicalRoot: string;
  managed?: { commonDirectory: string; checkoutName: string };
  repositoryCheckouts?: RepositoryCheckout[];
}

interface StoredRegisteredWorkspaceRegistry {
  schemaVersion: typeof registrySchemaVersion;
  workspaces: StoredRegisteredWorkspace[];
}

export function getRegisteredWorkspaceRegistryPath(userDataRoot: string): string {
  return path.join(userDataRoot, registryDirectoryName, registryFileName);
}

export class RegisteredWorkspaceRegistry {
  private readonly targetPath: string;
  private entries = new Map<string, StoredRegisteredWorkspace>();
  private contexts = new Map<string, AgentHarnessWorkspaceContext>();
  private loadError: string | null = null;

  constructor(options: {
    userDataRoot: string;
  }) {
    this.targetPath = getRegisteredWorkspaceRegistryPath(options.userDataRoot);
    this.load();
  }

  async initialize(): Promise<void> {
    if (this.loadError) {
      return;
    }
    for (const entry of this.entries.values()) {
      try {
        const context = await this.resolveStoredEntry(entry);
        this.contexts.set(entry.workspaceId, context);
      } catch {
        this.contexts.delete(entry.workspaceId);
      }
    }
  }

  snapshot(): AgentHarnessWorkspaceRegistrySnapshot {
    if (this.loadError) {
      return {
        schemaVersion: registrySchemaVersion,
        state: "failed",
        workspaces: [],
        error: this.loadError,
      };
    }
    return {
      schemaVersion: registrySchemaVersion,
      state: "ready",
      workspaces: [...this.entries.values()]
        .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId))
        .map((entry) => this.summarize(entry)),
      error: null,
    };
  }

  async register(callerOwnedRoot: string): Promise<AgentHarnessRegisteredWorkspaceSummary> {
    this.assertReady();
    if (typeof callerOwnedRoot !== "string" || !callerOwnedRoot.trim()) {
      throw new AgentHarnessError("INVALID_INPUT", "Workspace registration requires a non-empty project root.");
    }

    let context: AgentHarnessWorkspaceContext;
    try {
      context = await resolveWorkspaceRootContextAsync(callerOwnedRoot);
      fs.accessSync(context.root, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      throw new AgentHarnessError(
        "WORKSPACE_UNAVAILABLE",
        "The selected project must exist and be a readable, writable directory before registration.",
      );
    }

    const existing = this.entries.get(context.workspaceId);
    if (existing) {
      if (rootKey(existing.canonicalRoot) !== rootKey(context.root)) {
        throw new AgentHarnessError(
          "WORKSPACE_REGISTRY_CONFLICT",
          `Workspace ID ${context.workspaceId} is already registered to a different project.`,
          { workspaceId: context.workspaceId },
        );
      }
      this.contexts.set(existing.workspaceId, context);
      return this.summarize(existing);
    }

    const entry = {
      workspaceId: context.workspaceId,
      canonicalRoot: context.root,
    } satisfies StoredRegisteredWorkspace;
    const next = new Map(this.entries);
    next.set(entry.workspaceId, entry);
    this.persist(next);
    this.entries = next;
    this.contexts.set(entry.workspaceId, context);
    return summaryFromContext(context);
  }

  async registerManaged(root: string, commonDirectory: string, checkoutName: string): Promise<AgentHarnessRegisteredWorkspaceSummary> {
    this.assertReady();
    const entry: StoredRegisteredWorkspace = { workspaceId: managedWorkspaceId(commonDirectory, checkoutName), canonicalRoot: root, managed: { commonDirectory, checkoutName } };
    const context = await this.resolveStoredEntry(entry);
    const existing = this.entries.get(entry.workspaceId);
    if (existing && (existing.canonicalRoot !== root || !existing.managed)) throw new AgentHarnessError("WORKSPACE_REGISTRY_CONFLICT", "Managed workspace identity is already registered.");
    const next = new Map(this.entries);
    next.set(entry.workspaceId, entry);
    this.persist(next);
    this.entries = next;
    this.contexts.set(entry.workspaceId, context);
    return summaryFromContext(context);
  }

  unregister(workspaceId: string): AgentHarnessWorkspaceRegistrySnapshot {
    this.assertReady();
    const normalized = requiredWorkspaceId(workspaceId);
    if (!this.entries.has(normalized)) {
      return this.snapshot();
    }
    const next = new Map(this.entries);
    next.delete(normalized);
    this.persist(next);
    this.entries = next;
    this.contexts.delete(normalized);
    return this.snapshot();
  }

  async resolve(workspaceId: unknown): Promise<AgentHarnessWorkspaceContext> {
    this.assertReady();
    if (typeof workspaceId !== "string" || !workspaceId.trim()) {
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call requires an exact registered workspaceId.");
    }
    const entry = this.entries.get(workspaceId);
    if (!entry) {
      throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call workspaceId is not registered.", {
        suppliedWorkspaceId: workspaceId,
      });
    }
    try {
      const context = await this.resolveStoredEntry(entry);
      this.contexts.set(entry.workspaceId, context);
      return context;
    } catch {
      this.contexts.delete(entry.workspaceId);
      throw new AgentHarnessError(
        "WORKSPACE_UNAVAILABLE",
        "The registered workspace is currently unavailable or no longer validates.",
        { workspaceId: entry.workspaceId },
      );
    }
  }

  async registerRepositoryCheckout(workspaceId: string, checkout: RepositoryCheckout): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary> {
    this.assertReady();
    const entry = this.requireProjectEntry(workspaceId);
    const valid = validateRepositoryCheckoutContract(checkout);
    if (!valid.valid) throw new AgentHarnessError("INVALID_INPUT", "RepositoryCheckout descriptor is invalid.");
    const registered = entry.repositoryCheckouts ?? [];
    const sameId = registered.find(item => item.repositoryCheckoutId === checkout.repositoryCheckoutId);
    if (sameId) {
      if (!sameCheckoutContract(sameId, checkout)) throw new AgentHarnessError("WORKSPACE_REGISTRY_CONFLICT", "RepositoryCheckout ID is already registered with a different contract.");
      try { this.validateCheckoutRoot(this.deriveCheckoutRoot(entry.canonicalRoot, checkout)); }
      catch { throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered checkout is unavailable or does not identify an exact Git working tree."); }
      return this.checkoutSummary(checkout, true, null);
    }
    if (registered.some(item => item.projectRelativePath === checkout.projectRelativePath)) throw new AgentHarnessError("WORKSPACE_REGISTRY_CONFLICT", "A checkout path is already registered under a different identity.");
    try { this.validateCheckoutRoot(this.deriveCheckoutRoot(entry.canonicalRoot, checkout)); }
    catch { throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered checkout is unavailable or does not identify an exact Git working tree."); }
    const next = new Map(this.entries);
    const updated = { ...entry, repositoryCheckouts: [...registered, { ...checkout }].sort((a,b) => a.repositoryCheckoutId.localeCompare(b.repositoryCheckoutId)) };
    next.set(workspaceId, updated); this.persist(next); this.entries = next;
    return this.checkoutSummary(checkout, true, null);
  }

  async unregisterRepositoryCheckout(workspaceId: string, repositoryCheckoutId: string): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
    this.assertReady();
    const entry = this.requireProjectEntry(workspaceId);
    const next = new Map(this.entries);
    next.set(workspaceId, { ...entry, repositoryCheckouts: (entry.repositoryCheckouts ?? []).filter(item => item.repositoryCheckoutId !== repositoryCheckoutId) });
    this.persist(next); this.entries = next;
    return await this.listRepositoryCheckoutSummaries(workspaceId);
  }

  async listRepositoryCheckoutSummaries(workspaceId: unknown): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
    const entry = this.requireProjectEntry(workspaceId);
    return (entry.repositoryCheckouts ?? []).map(checkout => {
      try { this.validateCheckoutRoot(this.deriveCheckoutRoot(entry.canonicalRoot, checkout)); return this.checkoutSummary(checkout, true, null); }
      catch { return this.checkoutSummary(checkout, false, "Registered checkout is unavailable or no longer validates."); }
    });
  }

  async resolveRepositoryCheckoutContext(workspaceId: unknown, repositoryCheckoutId: unknown) {
    const entry = this.requireProjectEntry(workspaceId);
    if (typeof repositoryCheckoutId !== "string" || !repositoryCheckoutId.trim()) throw new AgentHarnessError("INVALID_INPUT", "repositoryCheckoutId is required.");
    const checkout = (entry.repositoryCheckouts ?? []).find(item => item.repositoryCheckoutId === repositoryCheckoutId);
    if (!checkout) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "The repositoryCheckoutId is not registered under this Project workspace.");
    try {
      await this.resolve(entry.workspaceId);
      const root = this.deriveCheckoutRoot(entry.canonicalRoot, checkout); this.validateCheckoutRoot(root);
      return { workspaceId: entry.workspaceId, root, checkout };
    } catch { throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered repository checkout is unavailable or no longer validates."); }
  }

  private requireProjectEntry(workspaceId: unknown): StoredRegisteredWorkspace {
    if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call requires an exact registered workspaceId.");
    const entry = this.entries.get(workspaceId);
    if (!entry || entry.managed) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "The Project workspace is not registered for RepositoryCheckout routing.");
    return entry;
  }
  private deriveCheckoutRoot(projectRoot: string, checkout: RepositoryCheckout): string {
    const topology = resolveManagedProjectSourceTopology(projectRoot);
    return checkout.role === "main" ? topology.mainCheckoutRoot : checkout.role === "dev" ? topology.devCheckoutRoot : resolveManagedWorkflowCheckoutPath(projectRoot, checkout.workflowId!).checkoutRoot;
  }
  private validateCheckoutRoot(root: string): void {
    const resolved = fs.realpathSync(root);
    if (path.resolve(resolved) !== path.resolve(root) || !fs.statSync(resolved).isDirectory()) throw new Error("redirect");
    const top = execFileSync("git", ["-C", resolved, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (path.resolve(top) !== path.resolve(resolved)) throw new Error("not exact root");
  }
  private checkoutSummary(checkout: RepositoryCheckout, available: boolean, validationError: string | null): AgentHarnessRegisteredRepositoryCheckoutSummary {
    return { ...checkout, availability: available ? "available" : "unavailable", validationError };
  }

  private load(): void {
    if (!fs.existsSync(this.targetPath)) {
      return;
    }
    try {
      const value = JSON.parse(fs.readFileSync(this.targetPath, "utf8")) as unknown;
      if (!isStoredRegistry(value)) {
        throw new Error("Registered workspace registry schema is invalid.");
      }
      const next = new Map<string, StoredRegisteredWorkspace>();
      const roots = new Set<string>();
      for (const entry of value.workspaces) {
        if (next.has(entry.workspaceId) || roots.has(rootKey(entry.canonicalRoot))) {
          throw new Error("Registered workspace registry contains duplicate workspace entries.");
        }
        next.set(entry.workspaceId, { ...entry });
        roots.add(rootKey(entry.canonicalRoot));
      }
      this.entries = next;
    } catch {
      this.entries.clear();
      this.loadError = "Registered workspace registry could not be validated.";
    }
  }

  private summarize(entry: StoredRegisteredWorkspace): AgentHarnessRegisteredWorkspaceSummary {
    const context = this.contexts.get(entry.workspaceId);
    if (context) {
      return summaryFromContext(context);
    }
    return {
      workspaceId: entry.workspaceId,
      repositoryName: path.basename(entry.canonicalRoot),
      gitBacked: false,
      availability: "unavailable",
      validationError: "Registered project is unavailable or no longer validates.",
    };
  }

  private async resolveStoredEntry(entry: StoredRegisteredWorkspace): Promise<AgentHarnessWorkspaceContext> {
    if (entry.managed) {
      const { commonDirectory, checkoutName } = entry.managed;
      await verifyManagedCheckout(entry.canonicalRoot, commonDirectory, checkoutName);
      if (entry.workspaceId !== managedWorkspaceId(commonDirectory, checkoutName)) throw new Error("Managed workspace identity changed.");
      return { root: entry.canonicalRoot, workspaceId: entry.workspaceId, repositoryName: checkoutName, gitBacked: true,
        capabilities: { filesystemRead: true, artifactWrite: true, patchWorkflow: true, gitInspection: true } };
    }
    const context = await resolveWorkspaceRootContextAsync(entry.canonicalRoot);
    if (context.workspaceId !== entry.workspaceId || rootKey(context.root) !== rootKey(entry.canonicalRoot)) {
      throw new Error("Registered workspace identity changed.");
    }
    return context;
  }

  private assertReady(): void {
    if (this.loadError) {
      throw new AgentHarnessError("WORKSPACE_REGISTRY_INVALID", this.loadError);
    }
  }

  private persist(entries: Map<string, StoredRegisteredWorkspace>): void {
    const directory = path.dirname(this.targetPath);
    fs.mkdirSync(directory, { recursive: true });
    const tempPath = `${this.targetPath}.tmp-${process.pid}-${Date.now()}`;
    const stored: StoredRegisteredWorkspaceRegistry = {
      schemaVersion: registrySchemaVersion,
      workspaces: [...entries.values()]
        .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId))
        .map((entry) => ({ ...entry })),
    };
    try {
      fs.writeFileSync(tempPath, JSON.stringify(stored, null, 2), { encoding: "utf8", flag: "wx" });
      fs.renameSync(tempPath, this.targetPath);
    } catch {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Preserve the original registry if the atomic replacement failed.
      }
      throw new AgentHarnessError(
        "WORKSPACE_UNAVAILABLE",
        "Registered workspace inventory could not be saved atomically.",
      );
    }
  }
}

function summaryFromContext(context: AgentHarnessWorkspaceContext): AgentHarnessRegisteredWorkspaceSummary {
  return {
    workspaceId: context.workspaceId,
    repositoryName: context.repositoryName,
    gitBacked: context.gitBacked,
    availability: "available",
    validationError: null,
  };
}

function requiredWorkspaceId(value: string): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", "Workspace unregistration requires an exact workspaceId.");
  }
  return value;
}

function rootKey(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function sameCheckoutContract(left: RepositoryCheckout, right: RepositoryCheckout): boolean {
  return left.repositoryCheckoutId === right.repositoryCheckoutId && left.repositoryId === right.repositoryId &&
    left.sourceLineId === right.sourceLineId && left.role === right.role &&
    left.projectRelativePath === right.projectRelativePath && left.workflowId === right.workflowId;
}

function isStoredRegistry(value: unknown): value is StoredRegisteredWorkspaceRegistry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record).every((key) => ["schemaVersion", "workspaces"].includes(key)) &&
    record.schemaVersion === registrySchemaVersion &&
    Array.isArray(record.workspaces) &&
    record.workspaces.every((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return false;
      }
      const candidate = entry as Record<string, unknown>;
      return Object.keys(candidate).every((key) => ["workspaceId", "canonicalRoot", "managed", "repositoryCheckouts"].includes(key)) &&
        typeof candidate.workspaceId === "string" &&
        /^[a-z0-9_]+$/.test(candidate.workspaceId) &&
        typeof candidate.canonicalRoot === "string" &&
        path.isAbsolute(candidate.canonicalRoot) && (candidate.repositoryCheckouts === undefined || (
          Array.isArray(candidate.repositoryCheckouts) && candidate.repositoryCheckouts.every(item => {
            const result = validateRepositoryCheckoutContract(item as RepositoryCheckout);
            return result.valid;
          }) && new Set(candidate.repositoryCheckouts.map(item => (item as RepositoryCheckout).repositoryCheckoutId)).size === candidate.repositoryCheckouts.length &&
          new Set(candidate.repositoryCheckouts.map(item => (item as RepositoryCheckout).projectRelativePath)).size === candidate.repositoryCheckouts.length
        )) && (candidate.managed === undefined || (
          candidate.managed !== null && typeof candidate.managed === "object" && !Array.isArray(candidate.managed) &&
          candidate.repositoryCheckouts === undefined && Object.keys(candidate.managed).every((key) => ["commonDirectory", "checkoutName"].includes(key)) &&
          typeof (candidate.managed as Record<string, unknown>).commonDirectory === "string" &&
          path.isAbsolute((candidate.managed as { commonDirectory: string }).commonDirectory) &&
          typeof (candidate.managed as Record<string, unknown>).checkoutName === "string"
        ));
    });
}
