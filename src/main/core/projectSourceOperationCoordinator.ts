import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ProjectSourceOperationLease {
  release(): Promise<void>;
}

export interface ProjectSourceOperationCoordinator {
  acquireShared(projectRoot: string, owner: string): Promise<ProjectSourceOperationLease>;
  acquireExclusive(projectRoot: string, owner: string): Promise<ProjectSourceOperationLease>;
}

export interface ProjectSourceOperationCoordinatorOptions {
  userDataRoot: string;
  acquisitionTimeoutMs?: number;
  staleLeaseMs?: number;
  retryIntervalMs?: number;
  now?: () => number;
}

interface LeaseOwnerRecord {
  pid: number;
  token: string;
  owner: string;
  heartbeatAt: number;
}

const DEFAULT_ACQUISITION_TIMEOUT_MS = 5_000;
const DEFAULT_STALE_LEASE_MS = 30_000;
const DEFAULT_RETRY_INTERVAL_MS = 20;
const OWNER_FILE = "owner.json";

export class ProjectSourceBusyError extends Error {
  readonly code = "PROJECT_SOURCE_BUSY";

  constructor() {
    super("Project source is busy. Wait for the active source operation to finish and retry.");
    this.name = "ProjectSourceBusyError";
  }
}

function canonicalProjectIdentity(projectRoot: string): string {
  const resolved = fs.realpathSync.native(path.resolve(projectRoot)).replace(/\\/g, "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

/** Returns a path containing only a stable project-root digest, never the raw project path. */
export function projectSourceOperationLeaseDirectory(userDataRoot: string, projectRoot: string): string {
  const digest = crypto.createHash("sha256").update(canonicalProjectIdentity(projectRoot)).digest("hex");
  return path.join(path.resolve(userDataRoot), "source-operation-leases", digest);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function boundedOwner(owner: string): string {
  return owner.replace(/[\r\n]+/g, " ").slice(0, 160) || "application-operation";
}

function ownerRecord(directory: string): LeaseOwnerRecord | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(directory, OWNER_FILE), "utf8")) as Partial<LeaseOwnerRecord>;
    if (!Number.isInteger(parsed.pid) || typeof parsed.token !== "string" || typeof parsed.owner !== "string" ||
      !Number.isFinite(parsed.heartbeatAt)) return null;
    return parsed as LeaseOwnerRecord;
  } catch {
    return null;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function removeLeaseDirectory(directory: string): void {
  fs.rmSync(directory, { recursive: true, force: true });
}

export function createProjectSourceOperationCoordinator(
  options: ProjectSourceOperationCoordinatorOptions,
): ProjectSourceOperationCoordinator {
  const acquisitionTimeoutMs = options.acquisitionTimeoutMs ?? DEFAULT_ACQUISITION_TIMEOUT_MS;
  const staleLeaseMs = options.staleLeaseMs ?? DEFAULT_STALE_LEASE_MS;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const now = options.now ?? Date.now;
  if (acquisitionTimeoutMs < 1 || staleLeaseMs < 10 || retryIntervalMs < 1)
    throw new Error("Project source-operation coordinator timing must be positive and bounded.");

  function writeOwner(directory: string, record: LeaseOwnerRecord): void {
    const heartbeat = new Date(record.heartbeatAt);
    fs.utimesSync(directory, heartbeat, heartbeat);
    fs.writeFileSync(path.join(directory, OWNER_FILE), JSON.stringify(record), { encoding: "utf8", flag: "w" });
  }

  function stale(directory: string): boolean {
    const record = ownerRecord(directory);
    if (record) return !processIsAlive(record.pid) || now() - record.heartbeatAt > staleLeaseMs;
    try {
      return now() - fs.statSync(directory).mtimeMs > staleLeaseMs;
    } catch {
      return true;
    }
  }

  function cleanupStale(directory: string): void {
    if (fs.existsSync(directory) && stale(directory)) removeLeaseDirectory(directory);
  }

  function createOwnedDirectory(directory: string, owner: string, token: string): boolean {
    try {
      fs.mkdirSync(directory);
      writeOwner(directory, { pid: process.pid, token, owner: boundedOwner(owner), heartbeatAt: now() });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      removeLeaseDirectory(directory);
      throw error;
    }
  }

  function startHeartbeat(directory: string, token: string): () => void {
    const timer = setInterval(() => {
      const current = ownerRecord(directory);
      if (!current || current.token !== token) return;
      try { writeOwner(directory, { ...current, heartbeatAt: now() }); } catch { /* acquisition observes loss */ }
    }, Math.max(5, Math.floor(staleLeaseMs / 3)));
    timer.unref();
    return () => clearInterval(timer);
  }

  async function withGate<T>(leaseRoot: string, deadline: number, operation: () => T): Promise<T> {
    const gate = path.join(leaseRoot, "gate");
    const token = crypto.randomUUID();
    while (now() <= deadline) {
      cleanupStale(gate);
      if (createOwnedDirectory(gate, "source-operation-gate", token)) {
        try {
          return operation();
        } finally {
          const current = ownerRecord(gate);
          if (current?.token === token) removeLeaseDirectory(gate);
        }
      }
      await delay(retryIntervalMs);
    }
    throw new ProjectSourceBusyError();
  }

  function cleanupProjectState(leaseRoot: string): void {
    for (const name of ["exclusive-intent", "exclusive"] as const) cleanupStale(path.join(leaseRoot, name));
    const sharedRoot = path.join(leaseRoot, "shared");
    if (!fs.existsSync(sharedRoot)) return;
    for (const entry of fs.readdirSync(sharedRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) cleanupStale(path.join(sharedRoot, entry.name));
    }
  }

  function sharedLeaseCount(leaseRoot: string): number {
    const sharedRoot = path.join(leaseRoot, "shared");
    try { return fs.readdirSync(sharedRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).length; }
    catch { return 0; }
  }

  function lease(directory: string, token: string): ProjectSourceOperationLease {
    const stopHeartbeat = startHeartbeat(directory, token);
    let released = false;
    return {
      async release(): Promise<void> {
        if (released) return;
        released = true;
        stopHeartbeat();
        const current = ownerRecord(directory);
        if (current?.token === token) removeLeaseDirectory(directory);
      },
    };
  }

  async function acquireShared(projectRoot: string, owner: string): Promise<ProjectSourceOperationLease> {
    const leaseRoot = projectSourceOperationLeaseDirectory(options.userDataRoot, projectRoot);
    const sharedRoot = path.join(leaseRoot, "shared");
    fs.mkdirSync(sharedRoot, { recursive: true });
    const deadline = now() + acquisitionTimeoutMs;
    const token = crypto.randomUUID();
    const directory = path.join(sharedRoot, token);
    while (now() <= deadline) {
      const acquired = await withGate(leaseRoot, deadline, () => {
        cleanupProjectState(leaseRoot);
        if (fs.existsSync(path.join(leaseRoot, "exclusive-intent")) || fs.existsSync(path.join(leaseRoot, "exclusive"))) return false;
        return createOwnedDirectory(directory, owner, token);
      });
      if (acquired) return lease(directory, token);
      await delay(retryIntervalMs);
    }
    throw new ProjectSourceBusyError();
  }

  async function acquireExclusive(projectRoot: string, owner: string): Promise<ProjectSourceOperationLease> {
    const leaseRoot = projectSourceOperationLeaseDirectory(options.userDataRoot, projectRoot);
    fs.mkdirSync(path.join(leaseRoot, "shared"), { recursive: true });
    const deadline = now() + acquisitionTimeoutMs;
    const token = crypto.randomUUID();
    const intent = path.join(leaseRoot, "exclusive-intent");
    const exclusive = path.join(leaseRoot, "exclusive");
    let ownsIntent = false;
    let stopIntentHeartbeat: (() => void) | undefined;
    try {
      while (now() <= deadline) {
        const acquired = await withGate(leaseRoot, deadline, () => {
          cleanupProjectState(leaseRoot);
          if (!ownsIntent) {
            if (fs.existsSync(intent) || fs.existsSync(exclusive)) return false;
            ownsIntent = createOwnedDirectory(intent, owner, token);
            if (!ownsIntent) return false;
            stopIntentHeartbeat = startHeartbeat(intent, token);
          } else if (ownerRecord(intent)?.token !== token) {
            throw new ProjectSourceBusyError();
          }
          if (sharedLeaseCount(leaseRoot) > 0) return false;
          if (!createOwnedDirectory(exclusive, owner, token)) return false;
          stopIntentHeartbeat?.();
          stopIntentHeartbeat = undefined;
          removeLeaseDirectory(intent);
          ownsIntent = false;
          return true;
        });
        if (acquired) return lease(exclusive, token);
        await delay(retryIntervalMs);
      }
      throw new ProjectSourceBusyError();
    } finally {
      stopIntentHeartbeat?.();
      if (ownsIntent) {
        try {
          await withGate(leaseRoot, now() + Math.max(100, retryIntervalMs * 2), () => {
            if (ownerRecord(intent)?.token === token) removeLeaseDirectory(intent);
          });
        } catch { /* stale recovery owns abandoned intent cleanup */ }
      }
    }
  }

  return { acquireShared, acquireExclusive };
}
