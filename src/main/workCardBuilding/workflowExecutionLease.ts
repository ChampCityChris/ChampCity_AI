import fs from "node:fs";
import path from "node:path";

type Lease = { token: string; owner: string; acquiredAt: number };
export interface WorkflowExecutionLease { release(): void; renew(): void }
const leases = new Map<string, Lease>();
const staleAfterMs = 30 * 60 * 1000;

/** One process-wide mutation lease shared by exact Implementer and Tester owners. */
export function acquireWorkflowExecutionLease(resource: string, owner: string, now = Date.now()): WorkflowExecutionLease | null {
  const separator = resource.indexOf(":");
  const namespace = separator > 0 ? resource.slice(0, separator) : "resource";
  const identity = separator > 0 ? resource.slice(separator + 1) : resource;
  let canonical: string;
  try { canonical = `${namespace}:${fs.realpathSync(path.resolve(identity)).toLowerCase()}`; }
  catch { canonical = `${namespace}:${path.resolve(identity).toLowerCase()}`; }
  const prior = leases.get(canonical);
  if (prior && now - prior.acquiredAt <= staleAfterMs) return null;
  const token = `${owner}:${now}:${Math.random()}`;
  leases.set(canonical, { token, owner, acquiredAt: now });
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    if (leases.get(canonical)?.token === token) leases.delete(canonical);
  };
  return { release, renew: () => {
    if (!released && leases.get(canonical)?.token === token) leases.set(canonical, { token, owner, acquiredAt: Date.now() });
  } };
}

export function workflowExecutionLeaseKey(kind: "source-backed" | "source-neutral", identity: string): string {
  return `${kind}:${identity}`;
}
