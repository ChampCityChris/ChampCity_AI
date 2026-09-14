import fs from "node:fs";
import path from "node:path";
import type {
  AgentHarnessRegisteredWorkspaceSummary,
  AgentHarnessWorkspaceRegistrySnapshot,
} from "../../../shared/workspaceContracts";
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
      return Object.keys(candidate).every((key) => ["workspaceId", "canonicalRoot"].includes(key)) &&
        typeof candidate.workspaceId === "string" &&
        /^[a-z0-9_]+$/.test(candidate.workspaceId) &&
        typeof candidate.canonicalRoot === "string" &&
        path.isAbsolute(candidate.canonicalRoot);
    });
}
