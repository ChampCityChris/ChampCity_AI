import { AgentHarnessError } from "../core/applicationErrors";
import type { RepositoryHostingSettingsInput } from "../../shared/repositoryHostingContracts";
import { readRepositoryHostingSettings, saveRepositoryHostingSettings } from "./repositoryHostingSettings";
import { RepositoryHostingFacade } from "./repositoryHostingFacade";
import { WindowsRepositoryHostingCredentialStore, type RepositoryHostingCredentialStore } from "./repositoryHostingCredentials";

export function registerRepositoryHostingIpc(
  ipc: { handle(channel: string, handler: (event: unknown, input?: unknown) => unknown): void },
  userDataRoot: () => string,
  credentials: RepositoryHostingCredentialStore = new WindowsRepositoryHostingCredentialStore(),
) {
  const facade = new RepositoryHostingFacade({ configurations: () => readRepositoryHostingSettings(userDataRoot()).providers, resolveCredential: reference => credentials.get(reference) });
  ipc.handle("repositoryHosting:settings", () => readRepositoryHostingSettings(userDataRoot()));
  ipc.handle("repositoryHosting:saveSettings", (_event, input) => saveRepositoryHostingSettings(userDataRoot(), input as RepositoryHostingSettingsInput));
  ipc.handle("repositoryHosting:providerStatus", (_event, input) => {
    if (typeof input !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(input)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded repository provider identity.");
    return facade.providerStatus(input);
  });
  const credentialInput = (input: unknown, storing: boolean) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AgentHarnessError("INVALID_INPUT", "Credential settings request is invalid.");
    const args = input as Record<string, unknown>;
    if (Object.keys(args).some(field => !["providerId", "expectedConfigurationId", ...(storing ? ["token"] : [])].includes(field)) || typeof args.providerId !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(args.providerId) || typeof args.expectedConfigurationId !== "string" || !/^[a-f0-9]{64}$/.test(args.expectedConfigurationId) || storing && (typeof args.token !== "string" || !/^[\x21-\x7e]{1,2048}$/.test(args.token))) throw new AgentHarnessError("INVALID_INPUT", "Credential settings request is invalid.");
    const current = readRepositoryHostingSettings(userDataRoot());
    if (current.configurationId !== args.expectedConfigurationId) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Provider connection changed; refresh before saving authentication.");
    const provider = current.providers.find(item => item.providerId === args.providerId);
    if (!provider) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Save the provider connection before configuring authentication.");
    return { reference: provider.credentialReference, token: args.token as string | undefined };
  };
  // Credentials have an application Settings route only. There is no MCP token argument.
  ipc.handle("repositoryHosting:saveCredential", async (_event, input) => {
    const selected = credentialInput(input, true); await credentials.set(selected.reference, selected.token!); return { stored: true };
  });
  ipc.handle("repositoryHosting:removeCredential", async (_event, input) => {
    const selected = credentialInput(input, false); await credentials.remove(selected.reference); return { removed: true };
  });
}
