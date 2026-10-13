import path from "node:path";
import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";

const owned = new WeakSet<object>();
export interface RemoteDestinationIdentity {
  transport: "https" | "http" | "ssh" | "local";
  host?: string;
  port?: number;
  repository?: string;
  identity: string;
}
export interface ProviderOwnedRemote {
  readonly providerId: string;
  readonly destination: string;
  readonly identity: RemoteDestinationIdentity;
  readonly hostedRepositoryId?: string;
  readonly hostedRepositoryState?: string;
}
const invalid = () => new AgentHarnessError("INVALID_INPUT", "Remote destination must be a bounded credential-free Git transport identity.");

/** Structural HTTP parsing only. Userinfo is private metadata until a provider verifies it. */
export function parseGitHttpDestination(destination: string): URL {
  const reject = (reason: string): never => { throw new AgentHarnessError("INVALID_INPUT", "Git HTTP destination has an unsupported structure.", { transportReason: reason }); };
  if (typeof destination !== "string" || !destination || destination.length > 2048 || /[\s\x00-\x1f\x7f\\]/.test(destination)) reject("unsafe-path-encoding");
  if (!/^https?:\/\//i.test(destination)) reject("unsupported-transport");
  if (/[?#]/.test(destination)) reject("query-or-fragment");
  // Check before WHATWG URL parsing erases dot segments or repairs ambiguous slashes.
  const rawPath = /^https?:\/\/[^/]+(\/.*)$/i.exec(destination)?.[1];
  if (!rawPath || /%|\/\/|\/(?:\.|\.\.)(?:\/|$)/.test(rawPath)) reject("unsafe-path-encoding");
  let url: URL;
  try { url = new URL(destination); } catch { return reject("unsupported-transport"); }
  const authority = /^https?:\/\/([^/]+)/i.exec(destination)![1];
  if (url.password || /%|:/.test(url.username) || authority.includes("@") && (!url.username || authority.split("@").length !== 2 || authority.slice(0, authority.indexOf("@")).includes(":"))) reject("unsupported-userinfo");
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname || url.port && (+url.port < 1 || +url.port > 65535)) reject("unexpected-host");
  const repository = url.pathname.replace(/^\//, "").replace(/\/$/, "").replace(/\.git$/, "");
  if (!/^[a-z0-9][a-z0-9_.-]*(?:\/[a-z0-9][a-z0-9_.-]*)+$/i.test(repository) || repository.split("/").some(part => part === "." || part === "..")) reject("unexpected-repository-path");
  return url;
}

/** Inspection permits harmless spelling variants; HTTP username requires provider proof. */
export function inspectedRemoteDestinationIdentity(destination: string, verifiedUsername?: string): RemoteDestinationIdentity {
  if (!/^https?:\/\//i.test(destination)) return remoteDestinationIdentity(destination);
  const url = parseGitHttpDestination(destination);
  if (url.username && (!verifiedUsername || url.username !== verifiedUsername)) throw invalid();
  url.username = "";
  url.pathname = `${url.pathname.replace(/\/$/, "").replace(/\.git$/, "")}.git`;
  return remoteDestinationIdentity(url.toString());
}

/** Reject credentials rather than accidentally including them in diagnostics or hashes. */
export function remoteDestinationIdentity(destination: string): RemoteDestinationIdentity {
  if (typeof destination !== "string" || !destination || destination.length > 2048 || /[\s\x00-\x1f]/.test(destination) || destination.startsWith("-")) throw invalid();
  let identity = createHash("sha256").update(destination).digest("hex");
  if (/^https?:\/\//i.test(destination)) {
    const http = parseGitHttpDestination(destination);
    if (http.username || http.pathname.endsWith("/")) throw invalid();
    http.pathname = `${http.pathname.replace(/\.git$/, "")}.git`;
    identity = createHash("sha256").update(http.toString()).digest("hex");
  }
  if (destination.startsWith("file://")) {
    let local: URL;
    try { local = new URL(destination); } catch { throw invalid(); }
    if (local.username || local.password || local.search || local.hash || local.hostname && local.hostname !== "localhost") throw invalid();
    return { transport: "local", identity };
  }
  if (path.isAbsolute(destination)) return { transport: "local", identity };
  if (/(?:\/|:)(?:\.|%2e){1,2}(?:\/|$)/i.test(destination)) throw invalid();
  // URL schemes must be recognized before SCP's host:path grammar. In particular,
  // ordinary HTTPS without an explicit port also matches the old SCP expression.
  const scp = destination.includes("://") ? null : /^(?:git@)?([a-z0-9.-]+):([a-z0-9_.\/-]+)$/i.exec(destination);
  const url = scp ? new URL(`ssh://git@${scp[1]}/${scp[2]}`) : (() => { try { return new URL(destination); } catch { throw invalid(); } })();
  const transport = url.protocol.slice(0, -1);
  if (!["https", "http", "ssh"].includes(transport) || url.password || url.search || url.hash || (url.username && !(transport === "ssh" && url.username === "git"))) throw invalid();
  const repository = url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  if (!/^[a-z0-9][a-z0-9_.-]*(?:\/[a-z0-9][a-z0-9_.-]*)+$/i.test(repository) || repository.split("/").some(part => part === "." || part === "..")) throw invalid();
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname || url.port && (+url.port < 1 || +url.port > 65535)) throw invalid();
  return { transport: transport as "https" | "http" | "ssh", host: url.hostname.toLowerCase(), port: url.port ? +url.port : undefined, repository, identity };
}

/** Hosting adapters mint these after resolving application-owned provider configuration. Never an MCP argument. */
export function createProviderOwnedRemote(input: { providerId: string; destination: string; allowInsecureHttp?: boolean; allowLocalTransport?: boolean; hostedRepositoryId?: string; hostedRepositoryState?: string }): ProviderOwnedRemote {
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(input.providerId)) throw invalid();
  const identity = remoteDestinationIdentity(input.destination);
  if (input.hostedRepositoryId !== undefined && !/^[a-z0-9_.:-]{1,128}$/i.test(input.hostedRepositoryId) || input.hostedRepositoryState !== undefined && !/^[a-f0-9]{64}$/.test(input.hostedRepositoryState)) throw invalid();
  if (identity.transport === "http" && !input.allowInsecureHttp || identity.transport === "local" && !input.allowLocalTransport) throw invalid();
  const remote = Object.freeze({ providerId: input.providerId, destination: input.destination, identity: Object.freeze(identity), ...(input.hostedRepositoryId ? { hostedRepositoryId: input.hostedRepositoryId } : {}), ...(input.hostedRepositoryState ? { hostedRepositoryState: input.hostedRepositoryState } : {}) });
  owned.add(remote);
  return remote;
}
export function assertProviderOwnedRemote(remote: ProviderOwnedRemote): void {
  if (!remote || !owned.has(remote)) throw new AgentHarnessError("INVALID_INPUT", "A hosting-provider-owned remote is required.");
}
