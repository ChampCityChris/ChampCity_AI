import { createHash } from "node:crypto";
import { AgentHarnessError } from "../core/applicationErrors";
import type { ForgejoHostingConfiguration, RepositoryHostingStatus } from "../../shared/repositoryHostingContracts";
import { ForgejoHostingAdapter } from "./forgejoHostingAdapter";
import type { RepositoryHostingAdapter } from "./repositoryHostingAdapter";
import { gitCommandIndex, runBoundedGit, type GitHttpAuthentication } from "../core/gitExecution";
import type { GithubHostingAdapter } from "./githubHostingAdapter";

export interface RepositoryHostingFacadeOptions {
  configurations: () => readonly ForgejoHostingConfiguration[];
  resolveCredential(reference: string): Promise<string | null>;
  adapters?: readonly RepositoryHostingAdapter[];
  github?: GithubHostingAdapter;
}

/** Routes provider metadata and provider-owned destinations. Local Git remains independently owned. */
export class RepositoryHostingFacade {
  private readonly cached = new Map<string, { configurationId: string; adapter: RepositoryHostingAdapter }>();
  constructor(private readonly options: RepositoryHostingFacadeOptions) {}
  private configurationId(cfg: ForgejoHostingConfiguration) { return createHash("sha256").update(JSON.stringify(cfg)).digest("hex"); }
  adapter(providerId: string): RepositoryHostingAdapter {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(providerId)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded provider identity.");
    const supplied = this.options.adapters?.find(adapter => adapter.providerId === providerId);
    if (supplied) return supplied;
    if (providerId === "github" && this.options.github) return this.options.github;
    const configurations = this.options.configurations();
    for (const cachedId of this.cached.keys()) if (!configurations.some(configuration => configuration.providerId === cachedId)) this.cached.delete(cachedId);
    const cfg = configurations.find(configuration => configuration.providerId === providerId);
    if (!cfg) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Repository provider is not configured.");
    const configurationId = this.configurationId(cfg), cached = this.cached.get(providerId);
    if (cached?.configurationId === configurationId) return cached.adapter;
    const adapter = new ForgejoHostingAdapter({ configuration: cfg, resolveCredential: this.options.resolveCredential,
      configurationStillCurrent: () => {
        const current = this.options.configurations().find(configuration => configuration.providerId === providerId);
        return Boolean(current && this.configurationId(current) === configurationId);
      } });
    this.cached.set(providerId, { configurationId, adapter });
    return adapter;
  }
  githubAdapter(providerId: string): GithubHostingAdapter {
    if (providerId !== "github" || !this.options.github) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "This operation requires the configured official GitHub provider.");
    return this.options.github;
  }
  async connectProvider(providerId: string) { return this.githubAdapter(providerId).connect(); }
  async disconnectProvider(providerId: string) { return this.githubAdapter(providerId).disconnect(); }
  async shutdown() { await this.options.github?.disconnect(); }
  async providerStatus(providerId: string, signal?: AbortSignal): Promise<RepositoryHostingStatus> {
    try { return await this.adapter(providerId).providerStatus(signal); }
    catch (error) {
      if (error instanceof AgentHarnessError && error.code === "INVALID_INPUT") throw error;
      if (providerId === "github" && this.options.github) return { providerId, readiness: "unreachable", configuration: "configured", implementation: "official-mcp", settingsConcurrency: "unavailable", identity: null, capabilities: [], capabilityEvidence: "discovered-official-tools", diagnostic: "Official GitHub authentication or connection could not be verified." };
      return { providerId, readiness: "not-configured", configuration: "not-configured", implementation: "bounded-compatibility", settingsConcurrency: "unavailable", identity: null, capabilities: [], diagnostic: "Repository provider configuration is unavailable." };
    }
  }

  async gitHttpAuthentication(cwd: string, args: string[]): Promise<GitHttpAuthentication | null> {
    const command = args[gitCommandIndex(args)];
    if (!["clone", "fetch", "push", "ls-remote"].includes(command) && !(command === "remote" && args[gitCommandIndex(args) + 1] === "prune")) return null;
    const separator = args.indexOf("--", gitCommandIndex(args) + 1);
    if (separator < 0 || !args[separator + 1]) return null;
    let destination = args[separator + 1];
    if (command !== "clone") {
      const inspected = await runBoundedGit({ cwd, args: ["remote", "get-url", ...(command === "push" ? ["--push"] : []), "--all", destination] });
      const destinations = inspected.stdout.split(/\r?\n/).filter(Boolean);
      if (destinations.length !== 1) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Git authentication requires an exact configured destination.");
      const raw = await runBoundedGit({ cwd, args: ["config", "--get-all", `remote.${destination}.${command === "push" ? "pushurl" : "url"}`], rejectNonZero: false });
      const configured = raw.exitCode === 1 && command === "push" ? await runBoundedGit({ cwd, args: ["config", "--get-all", `remote.${destination}.url`] }) : raw;
      if (configured.exitCode !== 0 || configured.stdout.split(/\r?\n/).filter(Boolean).length !== 1 || configured.stdout.trim() !== destinations[0]) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Git authentication rejects rewritten or ambiguous destinations.");
      destination = destinations[0];
    }
    if (!/^https?:\/\//i.test(destination)) return null;
    const matches: GitHttpAuthentication[] = [];
    const githubAuthentication = await this.options.github?.gitHttpAuthentication(destination);
    if (githubAuthentication) matches.push(githubAuthentication);
    for (const configuration of this.options.configurations()) {
      const provider = this.adapter(configuration.providerId);
      if (provider instanceof ForgejoHostingAdapter) {
        const authentication = await provider.gitHttpAuthentication(destination);
        if (authentication) matches.push(authentication);
      }
    }
    if (matches.length > 1) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "More than one configured connection owns this Git destination; select a unique connection policy.");
    return matches[0] ?? null;
  }
}
