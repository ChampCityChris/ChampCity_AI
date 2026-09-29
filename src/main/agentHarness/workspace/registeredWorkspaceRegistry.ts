import { managedWorkspaceId, verifyManagedCheckout } from "../repository/managedWorktrees";
import fs from "node:fs";
import path from "node:path";
import { runBoundedGit } from "../repository/boundedGit";
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

interface RepositoryCheckoutRuntimeState {
  state: "available" | "retiring";
  activeOperations: number;
  drainWaiters: Set<() => void>;
}

export function getRegisteredWorkspaceRegistryPath(userDataRoot: string): string {
  return path.join(userDataRoot, registryDirectoryName, registryFileName);
}

export class RegisteredWorkspaceRegistry {
  private readonly targetPath: string;
  private entries = new Map<string, StoredRegisteredWorkspace>();
  private contexts = new Map<string, AgentHarnessWorkspaceContext>();
  private checkoutRuntime = new Map<string, RepositoryCheckoutRuntimeState>();
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
      if (this.runtimeState(workspaceId, checkout.repositoryCheckoutId).state !== "available") throw new AgentHarnessError("REPOSITORY_CHECKOUT_RETIRING", "RepositoryCheckout is retiring and cannot accept new operations.");
      try { await this.validateCheckoutRoot(this.deriveCheckoutRoot(entry.canonicalRoot, checkout)); }
      catch { throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered checkout is unavailable or does not identify an exact Git working tree."); }
      return this.checkoutSummary(checkout, true, null);
    }
    if (registered.some(item => item.projectRelativePath === checkout.projectRelativePath)) throw new AgentHarnessError("WORKSPACE_REGISTRY_CONFLICT", "A checkout path is already registered under a different identity.");
    try { await this.validateCheckoutRoot(this.deriveCheckoutRoot(entry.canonicalRoot, checkout)); }
    catch { throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered checkout is unavailable or does not identify an exact Git working tree."); }
    const next = new Map(this.entries);
    const updated = { ...entry, repositoryCheckouts: [...registered, { ...checkout }].sort((a,b) => a.repositoryCheckoutId.localeCompare(b.repositoryCheckoutId)) };
    next.set(workspaceId, updated); this.persist(next); this.entries = next;
    this.checkoutRuntime.set(checkoutRuntimeKey(workspaceId, checkout.repositoryCheckoutId), { state: "available", activeOperations: 0, drainWaiters: new Set() });
    return this.checkoutSummary(checkout, true, null);
  }

  /** Application-only view used to reconcile source-control authority after startup. */
  registeredWorkspaceRoots(): Array<{ workspaceId: string; workspaceRoot: string }> {
    this.assertReady();
    return [...this.entries.values()]
      .filter((entry) => !entry.managed && this.contexts.has(entry.workspaceId))
      .sort((left, right) => left.workspaceId.localeCompare(right.workspaceId))
      .map((entry) => ({ workspaceId: entry.workspaceId, workspaceRoot: entry.canonicalRoot }));
  }

  async unregisterRepositoryCheckout(workspaceId: string, repositoryCheckoutId: string, drainTimeoutMs = 5_000): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
    this.assertReady();
    const entry = this.requireProjectEntry(workspaceId);
    const checkout = (entry.repositoryCheckouts ?? []).find(item => item.repositoryCheckoutId === repositoryCheckoutId);
    if (!checkout) return await this.listRepositoryCheckoutSummaries(workspaceId);
    const runtime = this.runtimeState(workspaceId, repositoryCheckoutId);
    if (runtime.state !== "available") throw new AgentHarnessError("REPOSITORY_CHECKOUT_RETIRING", "RepositoryCheckout is already retiring.");
    runtime.state = "retiring";
    if (runtime.activeOperations > 0) {
      const drained = await new Promise<boolean>(resolve => {
        const onDrain = () => { runtime.drainWaiters.delete(onDrain); clearTimeout(timer); resolve(true); };
        const timer = setTimeout(() => { runtime.drainWaiters.delete(onDrain); resolve(false); }, Math.max(1, Math.min(drainTimeoutMs, 30_000)));
        runtime.drainWaiters.add(onDrain);
      });
      if (!drained) {
        runtime.state = "available";
        throw new AgentHarnessError("REPOSITORY_CHECKOUT_RETIRING", "RepositoryCheckout did not drain within the bounded retirement deadline.");
      }
    }
    try {
      const currentEntry = this.requireProjectEntry(workspaceId);
      const currentCheckout = (currentEntry.repositoryCheckouts ?? []).find(item => item.repositoryCheckoutId === repositoryCheckoutId);
      if (!currentCheckout || !sameCheckoutContract(currentCheckout, checkout)) {
        throw new AgentHarnessError("WORKSPACE_REGISTRY_CONFLICT", "RepositoryCheckout registration changed during retirement.");
      }
      const next = new Map(this.entries);
      next.set(workspaceId, { ...currentEntry,
        repositoryCheckouts: (currentEntry.repositoryCheckouts ?? []).filter(item => item.repositoryCheckoutId !== repositoryCheckoutId) });
      this.persist(next);
      this.entries = next;
    } catch (error) {
      runtime.state = "available";
      throw error;
    }
    this.checkoutRuntime.delete(checkoutRuntimeKey(workspaceId, repositoryCheckoutId));
    return await this.listRepositoryCheckoutSummaries(workspaceId);
  }

  async listRepositoryCheckoutSummaries(workspaceId: unknown): Promise<AgentHarnessRegisteredRepositoryCheckoutSummary[]> {
    const entry = this.requireWorkspaceEntry(workspaceId);
    const summaries: AgentHarnessRegisteredRepositoryCheckoutSummary[] = [];
    for (const checkout of entry.repositoryCheckouts ?? []) {
      try {
        if (this.runtimeState(entry.workspaceId, checkout.repositoryCheckoutId).state !== "available") throw new Error("retiring");
        if (!validateRepositoryCheckoutContract(checkout).valid) throw new Error("invalid descriptor");
        await this.validateCheckoutRoot(this.deriveCheckoutRoot(entry.canonicalRoot, checkout));
        summaries.push(this.checkoutSummary(checkout, true, null));
      } catch { summaries.push(this.checkoutSummary(checkout, false, "Registered checkout is unavailable or no longer validates.")); }
    }
    return summaries;
  }

  async resolveRepositoryCheckoutContext(workspaceId: unknown, repositoryCheckoutId: unknown) {
    const entry = this.requireProjectEntry(workspaceId);
    if (typeof repositoryCheckoutId !== "string" || !repositoryCheckoutId.trim()) throw new AgentHarnessError("INVALID_INPUT", "repositoryCheckoutId is required.");
    const checkout = (entry.repositoryCheckouts ?? []).find(item => item.repositoryCheckoutId === repositoryCheckoutId);
    if (!checkout) throw new AgentHarnessError("REPOSITORY_CHECKOUT_REQUIRED", "The exact repositoryCheckoutId is not registered under this Project workspace.");
    const runtime = this.runtimeState(entry.workspaceId, checkout.repositoryCheckoutId);
    if (runtime.state !== "available") throw new AgentHarnessError("REPOSITORY_CHECKOUT_RETIRING", "RepositoryCheckout is retiring and cannot accept new operations.");
    runtime.activeOperations += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      runtime.activeOperations = Math.max(0, runtime.activeOperations - 1);
      if (runtime.activeOperations === 0) {
        for (const waiter of [...runtime.drainWaiters]) waiter();
        runtime.drainWaiters.clear();
      }
    };
    try {
      if (!validateRepositoryCheckoutContract(checkout).valid) throw new Error("invalid descriptor");
      await this.resolve(entry.workspaceId);
      const root = this.deriveCheckoutRoot(entry.canonicalRoot, checkout); await this.validateCheckoutRoot(root);
      return { workspaceId: entry.workspaceId, root, checkout, release };
    } catch {
      release();
      throw new AgentHarnessError("GIT_CAPABILITY_UNAVAILABLE", "The registered repository checkout is unavailable or no longer validates.");
    }
  }

  private requireWorkspaceEntry(workspaceId: unknown): StoredRegisteredWorkspace {
    if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Tool call requires an exact registered workspaceId.");
    const entry = this.entries.get(workspaceId);
    if (!entry) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "The workspace is not registered for RepositoryCheckout routing.");
    return entry;
  }
  private requireProjectEntry(workspaceId: unknown): StoredRegisteredWorkspace {
    const entry = this.requireWorkspaceEntry(workspaceId);
    if (entry.managed) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "The Project workspace is not registered for RepositoryCheckout routing.");
    return entry;
  }
  private deriveCheckoutRoot(projectRoot: string, checkout: RepositoryCheckout): string {
    if (checkout.role === "conventional") return projectRoot;
    const topology = resolveManagedProjectSourceTopology(projectRoot);
    return checkout.role === "main" ? topology.mainCheckoutRoot : checkout.role === "dev" ? topology.devCheckoutRoot : resolveManagedWorkflowCheckoutPath(projectRoot, checkout.workflowId!).checkoutRoot;
  }
  private runtimeState(workspaceId: string, repositoryCheckoutId: string): RepositoryCheckoutRuntimeState {
    const key = checkoutRuntimeKey(workspaceId, repositoryCheckoutId);
    let state = this.checkoutRuntime.get(key);
    if (!state) {
      state = { state: "available", activeOperations: 0, drainWaiters: new Set() };
      this.checkoutRuntime.set(key, state);
    }
    return state;
  }
  private async validateCheckoutRoot(root: string): Promise<void> {
    const resolved = fs.realpathSync(root);
    if (path.resolve(resolved) !== path.resolve(root) || !fs.statSync(resolved).isDirectory()) throw new Error("redirect");
    const result = await runBoundedGit({ cwd: resolved, args: ["rev-parse", "--show-toplevel"] });
    const top = result.stdout.trim();
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
      return { root: entry.canonicalRoot, workspaceId: entry.workspaceId, repositoryName: checkoutName, gitBacked: false,
        capabilities: { filesystemRead: true, artifactWrite: true, patchWorkflow: true, gitInspection: false } };
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

function checkoutRuntimeKey(workspaceId: string, repositoryCheckoutId: string): string {
  return `${workspaceId}\0${repositoryCheckoutId}`;
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
