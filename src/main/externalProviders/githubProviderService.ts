import { setTimeout as delay } from "node:timers/promises";
import type { GithubEvidence, GithubEvidenceRequest, GithubProviderStatus } from "../../shared/githubProviderContracts";
import { ExternalProviderGateway } from "./externalProviderGateway";
import { ExternalProviderAuthenticationRegistry, SdkExternalMcpSessionFactory } from "./externalMcpTransport";
import { githubCapabilityIds, githubMinimumCapabilities, githubProviderDefinition, githubResultData, githubToolsets } from "./githubProviderAdapter";
import { githubProviderEnvironment, type GithubRuntime, type GithubRuntimeOperations } from "./githubRuntime";
import { runFixedReleaseCommand } from "../agentHarness/release/releaseCommandAdapter";
import { ExternalProviderError } from "./externalProviderErrors";

export interface GithubProviderServiceOptions {
  runtime: GithubRuntimeOperations;
  createGateway?: (runtime: GithubRuntime) => ExternalProviderGateway;
  readOrigin?: (root: string) => Promise<string>;
  authenticationTimeoutMs?: number;
  authenticationRetryMs?: number;
}

export class GithubProviderService {
  private active: ExternalProviderGateway | null = null;
  private candidate: ExternalProviderGateway | null = null;
  private operation: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private state: GithubProviderStatus = {
    providerId: "github", displayName: "GitHub", runtime: "disconnected",
    authentication: "authentication-required", version: null, enabledToolsets: [...githubToolsets],
    capabilityGeneration: 0, capabilities: unknownCapabilities(), lastDiagnostic: null,
    recovery: "none", busy: false, releaseWrites: "gh-compatibility",
  };

  constructor(private readonly options: GithubProviderServiceOptions) {}

  async restore(): Promise<void> {
    // Restart restores only the verified runtime identity, never authentication.
    try { this.state.version = (await this.options.runtime.loadCurrent())?.version ?? null; }
    catch { this.state.lastDiagnostic = "Saved GitHub runtime could not be verified. Connect to acquire the configured official release."; }
  }

  getStatus(): GithubProviderStatus {
    if (!this.state.busy && this.state.runtime === "ready" && this.active && this.active.getStatus("github").transport !== "connected") {
      this.invalidate("GitHub connection closed. Connect again to authenticate.");
    }
    return structuredClone(this.state);
  }

  connect(): Promise<void> {
    if (this.operation) return this.operation;
    this.controller = new AbortController();
    this.state.busy = true;
    const signal = this.controller.signal;
    this.operation = this.connectRuntime(signal).finally(() => {
      this.operation = null;
      this.controller = null;
      this.state.busy = false;
    });
    return this.operation;
  }

  async disconnect(): Promise<void> {
    this.controller?.abort();
    await this.operation;
    await Promise.all([this.active?.shutdown(), this.candidate?.shutdown()]).catch(() => undefined);
    this.active = null;
    this.candidate = null;
    this.state.runtime = "disconnected";
    this.state.authentication = "authentication-required";
    this.state.capabilities = unknownCapabilities();
    this.state.capabilityGeneration++;
    this.state.lastDiagnostic = "Disconnected. GitHub OAuth must be completed again after restart.";
    this.state.recovery = "none";
  }

  async restart(): Promise<void> { await this.disconnect(); await this.connect(); }

  async read(root: string | null, request: GithubEvidenceRequest): Promise<GithubEvidence> {
    validateRequest(request);
    if (this.getStatus().runtime !== "ready" || this.state.busy || !this.active) throw new Error("Connect the GitHub provider before reading GitHub evidence.");
    const gateway = this.active;
    const generation = this.state.capabilityGeneration;
    const binding = request.kind === "context" ? null : parseGithubBinding(await this.origin(root));
    const capabilities: Record<GithubEvidenceRequest["kind"], string> = {
      context: "github.context.read", repository: "github.repository.read", releases: "github.release.list",
      release: "github.release.read", tag: "github.tag.read", issue: "github.issue.read", "pull-request": "github.pull_request.read",
    };
    try {
      const receipt = await gateway.invokeCapability("github", capabilities[request.kind], {
        ...binding, ...("tag" in request ? { tag: request.tag } : {}), ...("number" in request ? { number: request.number } : {}),
      });
      if (gateway !== this.active || generation !== this.state.capabilityGeneration || this.state.busy) throw new Error("GitHub session changed during the read.");
      const raw = githubResultData(receipt.result);
      const data = projectEvidence(request, raw, binding);
      return { providerId: "github", capabilityId: receipt.capabilityId, toolName: receipt.toolName, capabilityGeneration: generation, repository: binding ? `${binding.owner}/${binding.repo}` : null, data };
    } catch (error) {
      // Provider OAuth fallback messages, URLs, codes, stderr and arbitrary errors
      // never cross the Settings/preload/model evidence boundary.
      if (gateway === this.active && generation === this.state.capabilityGeneration && !this.state.busy) {
        if (gateway.getStatus("github").transport !== "connected" || (error instanceof ExternalProviderError && (error.kind === "authentication-required" || /\b(?:401|403)\b|authentication required|bad credentials/i.test(error.message)))) {
          this.invalidate("GitHub authentication or connection was lost. Reconnect to refresh capabilities.");
        } else {
          this.state.lastDiagnostic = "The requested GitHub record could not be read or verified. Check that it exists and is accessible; draft releases may not support lookup by tag.";
        }
      }
      throw new Error("GitHub evidence is unavailable; inspect GitHub provider status in Settings.");
    }
  }

  private async origin(root: string | null): Promise<string> {
    if (!root) throw new Error("Select a Repository before reading GitHub evidence.");
    if (this.options.readOrigin) return this.options.readOrigin(root);
    const result = await runFixedReleaseCommand({ root, id: "git-origin-url" });
    if (result.status !== "succeeded" || result.stdoutTruncated) throw new Error("The selected Repository has no readable GitHub origin.");
    return result.stdout;
  }

  private async connectRuntime(signal: AbortSignal): Promise<void> {
    const previous = this.active;
    const priorState = structuredClone(this.state);
    this.state.lastDiagnostic = null;
    this.state.recovery = "none";
    this.state.runtime = "acquiring";
    this.state.authentication = "authentication-required";
    this.state.capabilities = unknownCapabilities();
    let prior: GithubRuntime | null = null;
    try {
      try { prior = await this.options.runtime.loadCurrent(); } catch { /* Reacquire only from the official pin. */ }
      let runtime: GithubRuntime | null = null;
      try {
        runtime = prior?.version === this.options.runtime.version ? prior : await this.options.runtime.stage(signal);
        await this.probeAndAuthenticate(runtime, signal);
        signal.throwIfAborted();
        await this.options.runtime.promote(runtime);
      } catch (error) {
        await this.candidate?.shutdown().catch(() => undefined);
        this.candidate = null;
        if (signal.aborted || previous || !prior || prior.directory === runtime?.directory) throw error;
        runtime = prior;
        await this.probeAndAuthenticate(runtime, signal);
        this.state.recovery = "last-known-good";
        this.state.lastDiagnostic = "Configured GitHub update failed. Using the last verified runtime.";
      }
      signal.throwIfAborted();
      const discovered = this.candidate!.getStatus("github");
      this.active = this.candidate;
      this.candidate = null;
      this.state.version = runtime!.version;
      this.state.capabilities = discovered.capabilities;
      this.state.capabilityGeneration++;
      this.state.runtime = "ready";
      this.state.authentication = "authenticated";
      await previous?.shutdown().catch(() => undefined);
    } catch {
      await this.candidate?.shutdown().catch(() => undefined);
      this.candidate = null;
      if (previous && !signal.aborted && previous.getStatus("github").transport === "connected") {
        this.state = { ...priorState, recovery: "last-known-good", lastDiagnostic: "GitHub candidate validation failed. The previous authenticated runtime remains active." };
      } else {
        this.invalidate(signal.aborted ? "GitHub connection cancelled." : "GitHub runtime or authentication could not be verified. Connect to retry the official provider login.");
      }
    }
  }

  private async probeAndAuthenticate(runtime: GithubRuntime, signal: AbortSignal): Promise<void> {
    await this.options.runtime.probe(runtime, signal);
    signal.throwIfAborted();
    this.candidate = (this.options.createGateway ?? createGithubGateway)(runtime);
    const gateway = this.candidate;
    this.state.runtime = "connecting";
    this.state.authentication = "pending";
    const authSignal = AbortSignal.any([signal, AbortSignal.timeout(this.options.authenticationTimeoutMs ?? 120_000)]);
    await gateway.discover("github", authSignal);
    // OAuth is lazy in the official provider: tools/list alone is not proof of login.
    while (true) {
      authSignal.throwIfAborted();
      try { await gateway.invokeCapability("github", "github.context.read", {}, authSignal); break; }
      catch { await delay(this.options.authenticationRetryMs ?? 1_000, undefined, { signal: authSignal }); }
    }
    const status = await gateway.discover("github", authSignal);
    if (!githubMinimumCapabilities.every((id) => status.capabilities.some((entry) => entry.capabilityId === id && entry.availability === "available"))) throw new Error("GitHub minimum capability probe failed.");
  }

  private invalidate(message: string): void {
    this.state.runtime = "unavailable";
    this.state.authentication = "authentication-required";
    this.state.capabilities = unknownCapabilities();
    this.state.capabilityGeneration++;
    this.state.lastDiagnostic = message;
  }
}

export function createGithubGateway(runtime: GithubRuntime): ExternalProviderGateway {
  const authentication = new ExternalProviderAuthenticationRegistry();
  authentication.register({ reference: "github-provider-oauth", async resolve() { return { environment: githubProviderEnvironment() }; } });
  const gateway = new ExternalProviderGateway({ sessionFactory: new SdkExternalMcpSessionFactory(authentication) });
  gateway.register(githubProviderDefinition(runtime.executable, runtime.directory));
  return gateway;
}

function unknownCapabilities(): GithubProviderStatus["capabilities"] {
  return githubCapabilityIds.map((capabilityId) => ({ capabilityId, availability: "unknown" }));
}

export function parseGithubBinding(remote: string): { owner: string; repo: string } {
  const value = remote.trim();
  let coordinates: string;
  if (/^git@github\.com:/.test(value)) coordinates = value.slice("git@github.com:".length);
  else {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("The selected Repository is not bound to github.com."); }
    if (!["https:", "ssh:"].includes(url.protocol) || url.hostname !== "github.com" || url.password || url.search || url.hash || url.port || (url.username && !(url.protocol === "ssh:" && url.username === "git"))) throw new Error("The selected Repository is not bound to github.com.");
    coordinates = url.pathname.replace(/^\//, "");
  }
  const match = /^([A-Za-z0-9_-][A-Za-z0-9_.-]{0,99})\/([A-Za-z0-9_-][A-Za-z0-9_.-]{0,99})$/.exec(coordinates.replace(/\.git$/, ""));
  if (!match) throw new Error("Invalid GitHub Repository binding.");
  return { owner: match[1], repo: match[2] };
}

export function validateRequest(input: unknown): asserts input is GithubEvidenceRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid GitHub evidence request.");
  const value = input as Record<string, unknown>;
  const keys = value.kind === "release" || value.kind === "tag" ? ["kind", "tag"] : value.kind === "issue" || value.kind === "pull-request" ? ["kind", "number"] : ["kind"];
  if (!["context", "repository", "releases", "release", "tag", "issue", "pull-request"].includes(String(value.kind)) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unsupported GitHub evidence request.");
  if (keys.includes("number") && (!Number.isSafeInteger(value.number) || (value.number as number) < 1)) throw new Error("Invalid GitHub Issue or Pull Request number.");
  if (keys.includes("tag") && (typeof value.tag !== "string" || !value.tag || value.tag.length > 200 || /[\x00-\x20]/.test(value.tag))) throw new Error("Invalid GitHub tag.");
}

function projectEvidence(request: GithubEvidenceRequest, raw: unknown, binding: { owner: string; repo: string } | null): unknown {
  let data = raw;
  if (request.kind === "repository") {
    const items = (raw as { items?: unknown[] })?.items;
    data = items?.find((item) => (item as { full_name?: string })?.full_name?.toLowerCase() === `${binding!.owner}/${binding!.repo}`.toLowerCase());
  }
  if (request.kind === "releases") {
    if (!Array.isArray(data)) throw new Error("Invalid release list.");
    return data.slice(0, 20).map((entry) => metadata(entry, ["id", "tag_name", "name", "draft", "prerelease", "html_url", "published_at"]));
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid GitHub metadata.");
  const value = data as Record<string, unknown>;
  if ((request.kind === "issue" || request.kind === "pull-request") && value.number !== request.number) throw new Error("GitHub record identity mismatch.");
  if (request.kind === "release" && value.tag_name !== request.tag) throw new Error("GitHub release identity mismatch.");
  if (request.kind === "tag" && value.name !== request.tag && value.ref !== `refs/tags/${request.tag}`) throw new Error("GitHub tag identity mismatch.");
  if (request.kind === "context") return metadata(data, ["login", "id", "name", "html_url"]);
  if (request.kind === "repository") return metadata(data, ["id", "name", "full_name", "private", "default_branch", "html_url"]);
  if (request.kind === "tag") return metadata(data, ["name", "sha", "ref", "url", "commit"]);
  if (request.kind === "release") return metadata(data, ["id", "tag_name", "name", "draft", "prerelease", "html_url", "published_at", "assets"]);
  return metadata(data, ["id", "number", "title", "state", "html_url", "merged", "draft"]);
}

function metadata(data: unknown, fields: string[]): Record<string, unknown> {
  const input = data as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of fields) {
    const value = input[key];
    if (typeof value === "string") output[key] = value.slice(0, 500).replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|https?:\/\/\S*\b(?:code|token|state)=\S*|\b[A-Z0-9]{4}-[A-Z0-9]{4}\b)/g, "[REDACTED]");
    else if (typeof value === "number" || typeof value === "boolean" || value === null) output[key] = value;
    else if (key === "assets" && Array.isArray(value)) output[key] = value.slice(0, 40).map((asset) => metadata(asset, ["id", "name", "size", "digest"]));
    else if (key === "commit" && value && typeof value === "object") output[key] = metadata(value, ["sha", "url"]);
  }
  return output;
}
