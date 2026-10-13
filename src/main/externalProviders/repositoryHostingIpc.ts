import { AgentHarnessError } from "../core/applicationErrors";
import { repositoryHostingSettingsErrors, type RepositoryHostingSettingsErrorCode, type RepositoryHostingSettingsResult, type RepositoryHostingSettingsInput } from "../../shared/repositoryHostingContracts";
import { readRepositoryHostingSettings, saveRepositoryHostingSettings } from "./repositoryHostingSettings";
import { RepositoryHostingFacade } from "./repositoryHostingFacade";
import { WindowsRepositoryHostingCredentialStore, type RepositoryHostingCredentialStore } from "./repositoryHostingCredentials";

export function registerRepositoryHostingIpc(
  ipc: { handle(channel: string, handler: (event: unknown, input?: unknown) => unknown): void },
  userDataRoot: () => string,
  credentials: RepositoryHostingCredentialStore = new WindowsRepositoryHostingCredentialStore(),
) {
  // Catch before Electron serializes an exception; never project its message or details.
  const handle = <T>(channel: string, operation: (input?: unknown) => T | Promise<T>) => ipc.handle(channel, async (_event, input): Promise<RepositoryHostingSettingsResult<T>> => {
    try { return { ok: true, value: await operation(input) }; }
    catch (error) {
      let code: RepositoryHostingSettingsErrorCode = "settings-unavailable";
      if (error instanceof AgentHarnessError) {
        const selected = error.details?.settingsError;
        if (typeof selected === "string" && Object.prototype.hasOwnProperty.call(repositoryHostingSettingsErrors, selected)) code = selected as RepositoryHostingSettingsErrorCode;
        else if (error.code === "REPOSITORY_PROVIDER_STATE_CHANGED") code = "stale-configuration";
        else if (error.code === "REPOSITORY_PROVIDER_NOT_READY") code = "authentication-required";
        else if (error.code === "INVALID_INPUT") code = "invalid-configuration";
      }
      return { ok: false, error: { code } };
    }
  });
  const facade = new RepositoryHostingFacade({ configurations: () => readRepositoryHostingSettings(userDataRoot()).providers, resolveCredential: reference => credentials.get(reference) });
  handle("repositoryHosting:settings", () => readRepositoryHostingSettings(userDataRoot()));
  handle("repositoryHosting:saveSettings", input => saveRepositoryHostingSettings(userDataRoot(), input as RepositoryHostingSettingsInput));
  handle("repositoryHosting:providerStatus", input => {
    if (typeof input !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(input)) throw new AgentHarnessError("INVALID_INPUT", "Select a bounded repository provider identity.");
    return facade.providerStatus(input);
  });
  const credentialInput = (input: unknown, storing: boolean) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AgentHarnessError("INVALID_INPUT", "Credential settings request is invalid.");
    const args = input as Record<string, unknown>;
    if (Object.keys(args).some(field => !["providerId", "expectedConfigurationId", ...(storing ? ["token"] : [])].includes(field)) || typeof args.providerId !== "string" || !/^[a-z][a-z0-9_-]{0,63}$/.test(args.providerId) || typeof args.expectedConfigurationId !== "string" || !/^[a-f0-9]{64}$/.test(args.expectedConfigurationId)) throw new AgentHarnessError("INVALID_INPUT", "Credential settings request is invalid.");
    if (storing && (typeof args.token !== "string" || !/^[\x21-\x7e]{1,2048}$/.test(args.token))) throw new AgentHarnessError("INVALID_INPUT", "Authentication token is required.", { settingsError: "invalid-token" });
    const current = readRepositoryHostingSettings(userDataRoot());
    if (current.configurationId !== args.expectedConfigurationId) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Provider connection changed; refresh before saving authentication.");
    const provider = current.providers.find(item => item.providerId === args.providerId);
    if (!provider) throw new AgentHarnessError("REPOSITORY_PROVIDER_NOT_READY", "Save the provider connection before configuring authentication.");
    return { reference: provider.credentialReference, token: args.token as string | undefined };
  };
  // Credentials have an application Settings route only. There is no MCP token argument.
  handle("repositoryHosting:saveCredential", async input => {
    const selected = credentialInput(input, true); await credentials.set(selected.reference, selected.token!); return { stored: true };
  });
  handle("repositoryHosting:removeCredential", async input => {
    const selected = credentialInput(input, false); await credentials.remove(selected.reference); return { removed: true };
  });
}
