import path from "node:path";
import { workspaceIdFromProjectRepository } from "../../integrations/mcpWorkspacePromptContract";
import type {
  AgentHarnessSettings,
  AgentHarnessSettingsInput,
  LegacyOAuthClientImportResult,
  AgentHarnessStatus,
} from "../../../shared/workspaceContracts";
import type { AgentHarnessToolDefinition } from "../tools/toolRegistry";
import { createAgentHarnessToolRegistry, type AgentHarnessToolRegistry } from "../tools/toolRegistry";
import { createSelectedProjectAuthorityProvider, type AgentHarnessAuthorityProvider } from "../workspace/workspaceAuthority";
import {
  readAgentHarnessSettings,
  validateAgentHarnessSettingsInput,
  writeAgentHarnessSettings,
} from "./agentHarnessSettings";
import { startAgentHarnessHttpRuntime, type AgentHarnessHttpRuntimeHandle } from "./httpRuntime";
import { importLegacyOAuthClientRegistry, readOAuthStoreDiagnostics } from "./oauthStore";

export type AgentHarnessRuntimeState = "stopped" | "starting" | "running" | "stopping" | "failed";

export interface AgentHarnessServiceOptions {
  userDataRoot: string;
  getSelectedProjectRoot: () => string;
  enabled?: boolean;
  host?: string;
  port?: number;
  publicBaseUrl?: string;
  allowUnauthenticatedLocal?: boolean;
  gitMutationAuthorized?: () => boolean;
}

export class AgentHarnessService {
  private readonly authority: AgentHarnessAuthorityProvider;
  private readonly registry: AgentHarnessToolRegistry;
  private readonly userDataRoot: string;
  private configuration: AgentHarnessSettings;
  private handle: AgentHarnessHttpRuntimeHandle | null = null;
  private state: AgentHarnessRuntimeState = "stopped";
  private lastError: string | null = null;
  private recentActivity: string[] = [];

  constructor(options: AgentHarnessServiceOptions) {
    this.userDataRoot = options.userDataRoot;
    this.configuration = readAgentHarnessSettings(options.userDataRoot, serviceOptionsToSettingsInput(options));
    this.authority = createSelectedProjectAuthorityProvider({
      getSelectedProjectRoot: options.getSelectedProjectRoot,
      isGitMutationAuthorized: options.gitMutationAuthorized,
    });
    this.registry = createAgentHarnessToolRegistry({
      authority: this.authority,
      userDataRoot: options.userDataRoot,
      runtimeDiagnostics: () => this.status() as unknown as Record<string, unknown>,
    });
  }

  tools(): AgentHarnessToolDefinition[] {
    return this.registry.listTools("files.read files.write");
  }

  toolRegistry(): AgentHarnessToolRegistry {
    return this.registry;
  }

  async start(): Promise<AgentHarnessStatus> {
    if (!this.configuration.enabled) {
      this.recordActivity("Start skipped because Agent Harness startup is disabled.");
      return this.status();
    }
    if (this.handle) {
      return this.status();
    }
    this.state = "starting";
    this.lastError = null;
    this.recordActivity(`Starting Agent Harness on ${this.configuration.host}:${this.configuration.port || "auto"}.`);
    try {
      this.handle = await this.openRuntime(this.configuration);
      this.state = "running";
      this.recordActivity(`Agent Harness running at ${this.handle.url}.`);
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : String(error);
      this.recordActivity(`Agent Harness startup failed: ${this.lastError}`);
    }
    return this.status();
  }

  async stop(): Promise<AgentHarnessStatus> {
    if (!this.handle) {
      this.state = "stopped";
      this.recordActivity("Stop requested while Agent Harness was already stopped.");
      return this.status();
    }
    this.state = "stopping";
    this.recordActivity("Stopping Agent Harness.");
    try {
      await this.handle.close();
      this.handle = null;
      this.state = "stopped";
      this.recordActivity("Agent Harness stopped.");
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : String(error);
      this.recordActivity(`Agent Harness shutdown failed: ${this.lastError}`);
    }
    return this.status();
  }

  async restart(): Promise<AgentHarnessStatus> {
    this.recordActivity("Restart requested from ChampCity A/I Settings.");
    await this.stop();
    return this.start();
  }

  async saveConfiguration(input: AgentHarnessSettingsInput): Promise<AgentHarnessStatus> {
    const nextConfiguration = validateAgentHarnessSettingsInput(input, this.configuration);

    if (!nextConfiguration.enabled) {
      return this.saveDisabledConfiguration(nextConfiguration);
    }

    return this.saveEnabledConfiguration(nextConfiguration);
  }

  importLegacyOAuthClientRegistry(source: unknown): LegacyOAuthClientImportResult {
    const result = importLegacyOAuthClientRegistry(this.userDataRoot, source);
    this.recordActivity(`Imported legacy OAuth clients: ${result.importedCount} imported, ${result.alreadyPresentCount} already present.`);
    return { canceled: false, ...result };
  }

  status(): AgentHarnessStatus {
    let workspaceId: string | null = null;
    let expectedWorkspaceId: string | null = null;
    let rootSummary: string | null = null;
    try {
      const context = this.authority.resolveWorkspaceContext();
      workspaceId = context.workspaceId;
      rootSummary = path.basename(context.root);
      expectedWorkspaceId = workspaceIdFromProjectRepository(context.root);
    } catch {
      workspaceId = null;
      expectedWorkspaceId = null;
      rootSummary = null;
    }
    const tools = this.tools();
    const oauth = readOAuthStoreDiagnostics(this.userDataRoot);
    const localUnauthenticated = this.configuration.localAuthenticationMode === "local-unauthenticated";
    return {
      state: this.state,
      enabled: this.configuration.enabled,
      host: this.configuration.host,
      configuredPort: this.configuration.port,
      port: this.handle?.port ?? null,
      healthEndpoint: this.handle?.healthUrl ?? null,
      mcpEndpoint: this.handle?.url ?? null,
      publicBaseUrl: this.configuration.publicBaseUrl,
      publicBaseUrlConfigured: Boolean(this.configuration.publicBaseUrl),
      oauthConfigured: !localUnauthenticated,
      localAuthenticationMode: localUnauthenticated ? "local-unauthenticated" : "oauth-required",
      filesReadTransportAuthorized: localUnauthenticated || oauth.activeFilesReadAuthorizationCount > 0,
      filesWriteTransportAuthorized: localUnauthenticated || oauth.activeFilesWriteAuthorizationCount > 0,
      registeredClientCount: oauth.clientCount,
      activeOAuthTokenCount: oauth.activeTokenCount,
      activeFilesReadAuthorizationCount: oauth.activeFilesReadAuthorizationCount,
      activeFilesWriteAuthorizationCount: oauth.activeFilesWriteAuthorizationCount,
      publicToolCount: tools.length,
      publicToolNames: tools.map((tool) => tool.name),
      activeWorkspaceId: workspaceId,
      expectedWorkspaceId,
      selectedProjectRootSummary: rootSummary,
      routingState: workspaceId && expectedWorkspaceId
        ? workspaceId === expectedWorkspaceId
          ? "matched"
          : "mismatched"
        : "unavailable",
      lastError: this.lastError,
      recentActivity: [...this.recentActivity],
    };
  }

  private recordActivity(message: string): void {
    this.recentActivity = [
      `${new Date().toISOString()} ${message}`,
      ...this.recentActivity,
    ].slice(0, 8);
  }

  private async saveDisabledConfiguration(nextConfiguration: AgentHarnessSettings): Promise<AgentHarnessStatus> {
    if (this.handle) {
      await this.stopRuntimeForConfigurationApply();
    } else {
      this.state = "stopped";
    }
    writeAgentHarnessSettings(this.userDataRoot, nextConfiguration);
    this.configuration = nextConfiguration;
    this.lastError = null;
    this.recordActivity("Agent Harness settings saved.");
    return this.status();
  }

  private async saveEnabledConfiguration(nextConfiguration: AgentHarnessSettings): Promise<AgentHarnessStatus> {
    const previousConfiguration = this.configuration;
    const previousState = this.state;
    const hadRunningRuntime = Boolean(this.handle);
    if (hadRunningRuntime) {
      this.recordActivity("Applying Agent Harness settings through last-known-good restart transaction.");
    }

    try {
      if (this.handle) {
        await this.stopRuntimeForConfigurationApply();
      }
      this.configuration = nextConfiguration;
      this.state = "starting";
      this.lastError = null;
      this.recordActivity(`Starting Agent Harness on ${nextConfiguration.host}:${nextConfiguration.port || "auto"}.`);
      this.handle = await this.openRuntime(nextConfiguration);
      this.state = "running";
      writeAgentHarnessSettings(this.userDataRoot, nextConfiguration);
      this.recordActivity("Agent Harness settings saved.");
      this.recordActivity(`Agent Harness running at ${this.handle.url}.`);
      return this.status();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.configuration = previousConfiguration;
      this.lastError = `Rejected Agent Harness settings: ${message}`;
      this.recordActivity(this.lastError);
      if (!this.handle && hadRunningRuntime && previousConfiguration.enabled) {
        await this.recoverPreviousRuntime(previousConfiguration);
      } else if (!this.handle) {
        this.state = previousState;
      }
      throw new Error(this.lastError);
    }
  }

  private async stopRuntimeForConfigurationApply(): Promise<void> {
    if (!this.handle) {
      this.state = "stopped";
      return;
    }
    this.state = "stopping";
    this.recordActivity("Stopping Agent Harness.");
    try {
      await this.handle.close();
      this.handle = null;
      this.state = "stopped";
      this.recordActivity("Agent Harness stopped.");
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : String(error);
      this.recordActivity(`Agent Harness shutdown failed: ${this.lastError}`);
      throw error;
    }
  }

  private async recoverPreviousRuntime(previousConfiguration: AgentHarnessSettings): Promise<void> {
    this.state = "starting";
    this.recordActivity("Recovering previous Agent Harness runtime after rejected settings.");
    try {
      this.handle = await this.openRuntime(previousConfiguration);
      this.state = "running";
      this.recordActivity(`Agent Harness running at ${this.handle.url}.`);
    } catch (error) {
      const recoveryMessage = error instanceof Error ? error.message : String(error);
      this.state = "failed";
      this.lastError = `Rejected Agent Harness settings and failed to recover previous runtime: ${recoveryMessage}`;
      this.recordActivity(this.lastError);
    }
  }

  private openRuntime(configuration: AgentHarnessSettings): Promise<AgentHarnessHttpRuntimeHandle> {
    return startAgentHarnessHttpRuntime({
      host: configuration.host,
      port: configuration.port,
      publicBaseUrl: configuration.publicBaseUrl ?? undefined,
      userDataRoot: this.userDataRoot,
      registry: this.registry,
      allowUnauthenticatedLocal: configuration.localAuthenticationMode === "local-unauthenticated",
    });
  }
}

function serviceOptionsToSettingsInput(options: AgentHarnessServiceOptions): AgentHarnessSettingsInput {
  return {
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options.host !== undefined ? { host: options.host } : {}),
    ...(options.port !== undefined ? { port: options.port } : {}),
    ...(options.publicBaseUrl !== undefined ? { publicBaseUrl: options.publicBaseUrl } : {}),
    ...(options.allowUnauthenticatedLocal !== undefined
      ? {
          localAuthenticationMode: options.allowUnauthenticatedLocal
            ? "local-unauthenticated"
            : "oauth-required",
        }
      : {}),
  };
}
