import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import net, { type Server, type Socket } from "node:net";
import path from "node:path";

export const desktopLifecycleLeaseSchemaVersion = 1 as const;
export const desktopLifecycleLeaseFileName = "desktop-lifecycle-lease.json";
const maximumOwnerIdentityBytes = 4 * 1024;

export type DesktopLifecycleLeaseOwner = "desktop" | "uninstall-maintenance";

export interface DesktopLifecycleLease {
  schemaVersion: typeof desktopLifecycleLeaseSchemaVersion;
  owner: DesktopLifecycleLeaseOwner;
  processId: number;
  leaseId: string;
  acquiredAt: string;
}

export type DesktopLifecycleLeaseAcquisition =
  | { acquired: true; lease: DesktopLifecycleLease; address: string }
  | {
    acquired: false;
    reason: "live-owner" | "unverifiable-owner" | "contention";
    existingLease: DesktopLifecycleLease | null;
    address: string;
  };

interface DesktopLifecycleLeaseDependencies {
  processId: number;
  createLeaseId: () => string;
  now: () => Date;
  platform: NodeJS.Platform;
  ownerQueryTimeoutMs: number;
}

const defaultDependencies: DesktopLifecycleLeaseDependencies = {
  processId: process.pid,
  createLeaseId: randomUUID,
  now: () => new Date(),
  platform: process.platform,
  ownerQueryTimeoutMs: 1_000,
};

const ownedExclusionServers = new WeakMap<DesktopLifecycleLease, Server>();

export function getDesktopLifecycleLeasePath(userDataRoot: string): string {
  return path.join(userDataRoot, desktopLifecycleLeaseFileName);
}

export function getDesktopLifecycleExclusionAddress(
  userDataRoot: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const resolvedRoot = path.resolve(userDataRoot);
  const normalizedRoot = platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot;
  const rootIdentity = createHash("sha256").update(normalizedRoot).digest("hex").slice(0, 24);
  return platform === "win32"
    ? `\\\\.\\pipe\\champcity-desktop-lifecycle-${rootIdentity}`
    : path.join(userDataRoot, `.desktop-lifecycle-${rootIdentity}.sock`);
}

export async function acquireDesktopLifecycleLease(
  userDataRoot: string,
  owner: DesktopLifecycleLeaseOwner,
  dependencyOverrides: Partial<DesktopLifecycleLeaseDependencies> = {},
): Promise<DesktopLifecycleLeaseAcquisition> {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  const address = getDesktopLifecycleExclusionAddress(userDataRoot, dependencies.platform);
  const lease: DesktopLifecycleLease = {
    schemaVersion: desktopLifecycleLeaseSchemaVersion,
    owner,
    processId: dependencies.processId,
    leaseId: dependencies.createLeaseId(),
    acquiredAt: dependencies.now().toISOString(),
  };

  const firstAttempt = await tryOwnExclusionAddress(address, lease);
  if (firstAttempt.acquired) {
    return completeAcquisition(userDataRoot, address, lease, firstAttempt.server);
  }
  if (!isAddressInUseError(firstAttempt.error)) {
    return { acquired: false, reason: "unverifiable-owner", existingLease: null, address };
  }

  const observedOwner = await queryDesktopLifecycleOwner(address, dependencies.ownerQueryTimeoutMs);
  if (observedOwner.state === "present") {
    return {
      acquired: false,
      reason: "live-owner",
      existingLease: observedOwner.lease,
      address,
    };
  }
  if (observedOwner.state === "unverifiable") {
    return { acquired: false, reason: "unverifiable-owner", existingLease: null, address };
  }

  // The owner can exit between EADDRINUSE and identity query. One immediate
  // rebind is safe because the OS endpoint, never diagnostic JSON, arbitrates it.
  const retry = await tryOwnExclusionAddress(address, lease);
  if (retry.acquired) {
    return completeAcquisition(userDataRoot, address, lease, retry.server);
  }
  if (!isAddressInUseError(retry.error)) {
    return { acquired: false, reason: "unverifiable-owner", existingLease: null, address };
  }
  const retryOwner = await queryDesktopLifecycleOwner(address, dependencies.ownerQueryTimeoutMs);
  return retryOwner.state === "present"
    ? { acquired: false, reason: "live-owner", existingLease: retryOwner.lease, address }
    : {
      acquired: false,
      reason: retryOwner.state === "unverifiable" ? "unverifiable-owner" : "contention",
      existingLease: null,
      address,
    };
}

export async function releaseDesktopLifecycleLease(
  userDataRoot: string,
  lease: DesktopLifecycleLease,
): Promise<boolean> {
  const server = ownedExclusionServers.get(lease);
  if (!server) {
    return false;
  }
  removeDiagnosticLeaseIfExact(userDataRoot, lease);
  ownedExclusionServers.delete(lease);
  await closeServer(server);
  return true;
}

export function isLocalProcessRunningWithoutTermination(processId: number): boolean {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ESRCH")) return false;
    if (hasErrorCode(error, "EPERM")) return true;
    throw error;
  }
}

function completeAcquisition(
  userDataRoot: string,
  address: string,
  lease: DesktopLifecycleLease,
  server: Server,
): DesktopLifecycleLeaseAcquisition {
  ownedExclusionServers.set(lease, server);
  writeDiagnosticLease(userDataRoot, lease);
  return { acquired: true, lease, address };
}

function tryOwnExclusionAddress(
  address: string,
  lease: DesktopLifecycleLease,
): Promise<{ acquired: true; server: Server } | { acquired: false; error: unknown }> {
  const server = net.createServer((socket) => publishOwnerIdentity(socket, lease));
  return new Promise((resolve) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      resolve({ acquired: false, error });
    };
    const onListening = (): void => {
      server.off("error", onError);
      server.on("error", () => {
        // The bound handle remains the ownership proof; later connection errors do not
        // transfer ownership or admit another claimant.
      });
      resolve({ acquired: true, server });
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(address);
  });
}

function publishOwnerIdentity(socket: Socket, lease: DesktopLifecycleLease): void {
  socket.end(`${JSON.stringify(lease)}\n`);
}

function queryDesktopLifecycleOwner(
  address: string,
  timeoutMs: number,
): Promise<
  | { state: "present"; lease: DesktopLifecycleLease }
  | { state: "absent" }
  | { state: "unverifiable" }
> {
  return new Promise((resolve) => {
    const socket = net.createConnection(address);
    let settled = false;
    let buffered = "";
    const finish = (
      result:
        | { state: "present"; lease: DesktopLifecycleLease }
        | { state: "absent" }
        | { state: "unverifiable" },
    ): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(result);
    };
    const timeout = setTimeout(() => finish({ state: "unverifiable" }), timeoutMs);
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      buffered += chunk;
      if (Buffer.byteLength(buffered, "utf8") > maximumOwnerIdentityBytes) {
        finish({ state: "unverifiable" });
        return;
      }
      const newlineIndex = buffered.indexOf("\n");
      if (newlineIndex < 0) return;
      try {
        const parsed: unknown = JSON.parse(buffered.slice(0, newlineIndex));
        finish(isDesktopLifecycleLease(parsed)
          ? { state: "present", lease: parsed }
          : { state: "unverifiable" });
      } catch {
        finish({ state: "unverifiable" });
      }
    });
    socket.once("error", (error) => {
      finish(isEndpointDefinitelyAbsent(error) ? { state: "absent" } : { state: "unverifiable" });
    });
    socket.once("close", () => {
      if (!settled) finish({ state: "unverifiable" });
    });
  });
}

function writeDiagnosticLease(userDataRoot: string, lease: DesktopLifecycleLease): void {
  const leasePath = getDesktopLifecycleLeasePath(userDataRoot);
  const temporaryPath = `${leasePath}.tmp-${lease.leaseId}`;
  try {
    fs.mkdirSync(userDataRoot, { recursive: true });
    fs.writeFileSync(temporaryPath, `${JSON.stringify(lease, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, leasePath);
  } catch {
    removeFileIfPresent(temporaryPath);
    // Diagnostic metadata is deliberately non-controlling. Failure to project
    // it cannot weaken or replace the already-owned OS exclusion endpoint.
  }
}

function removeDiagnosticLeaseIfExact(userDataRoot: string, expectedLease: DesktopLifecycleLease): void {
  const leasePath = getDesktopLifecycleLeasePath(userDataRoot);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(leasePath, "utf8"));
  } catch {
    return;
  }
  if (!isDesktopLifecycleLease(parsed) || !sameLease(parsed, expectedLease)) {
    return;
  }
  removeFileIfPresent(leasePath);
}

function removeFileIfPresent(targetPath: string): void {
  try {
    fs.unlinkSync(targetPath);
  } catch {
    // Diagnostic cleanup cannot affect endpoint ownership.
  }
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
}

function isDesktopLifecycleLease(value: unknown): value is DesktopLifecycleLease {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<DesktopLifecycleLease>;
  return candidate.schemaVersion === desktopLifecycleLeaseSchemaVersion &&
    (candidate.owner === "desktop" || candidate.owner === "uninstall-maintenance") &&
    Number.isSafeInteger(candidate.processId) &&
    (candidate.processId ?? 0) > 0 &&
    typeof candidate.leaseId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.leaseId) &&
    typeof candidate.acquiredAt === "string" &&
    Number.isFinite(Date.parse(candidate.acquiredAt));
}

function sameLease(left: DesktopLifecycleLease, right: DesktopLifecycleLease): boolean {
  return left.schemaVersion === right.schemaVersion &&
    left.owner === right.owner &&
    left.processId === right.processId &&
    left.leaseId === right.leaseId &&
    left.acquiredAt === right.acquiredAt;
}

function isAddressInUseError(error: unknown): boolean {
  return hasErrorCode(error, "EADDRINUSE");
}

function isEndpointDefinitelyAbsent(error: unknown): boolean {
  return hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ECONNREFUSED");
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === expectedCode;
}
