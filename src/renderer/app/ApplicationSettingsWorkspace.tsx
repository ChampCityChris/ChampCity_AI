import {useState,useEffect,type FormEvent} from "react";
import {Bot,FileText,FolderOpen,Play,RefreshCw,RotateCcw,Settings as SettingsIcon,Square} from "lucide-react";
import type {AgentHarnessAuthenticationMode,AgentHarnessSettingsInput,AgentHarnessServiceHostLifecycleSettingsInput,AgentHarnessServiceHostLifecycleStatus,AgentHarnessStatus,AgentHarnessWorkspaceRegistrySnapshot} from "../../shared/workspaceContracts";
import {GithubProviderSettings} from "./GithubProviderSettings";
import {CodexConnectionsPanel} from "./CodexConnectionsPanel";
export interface AgentHarnessSettingsForm {
  trustedLocalGitRoots: string;
  enabled: boolean;
  host: string;
  port: string;
  publicBaseUrl: string;
  localAuthenticationMode: AgentHarnessAuthenticationMode;
}
export function agentHarnessSettingsFormFromStatus(
  status: AgentHarnessStatus | null,
): AgentHarnessSettingsForm {
  return {
    trustedLocalGitRoots: (status?.trustedLocalGitRoots ?? []).join("\n"),
    enabled: status?.enabled ?? true,
    host: status?.host ?? "127.0.0.1",
    port: status?.configuredPort.toString() ?? "0",
    publicBaseUrl: status?.publicBaseUrl ?? "",
    localAuthenticationMode: status?.localAuthenticationMode ?? "oauth-required",
  };
}
export function buildAgentHarnessSettingsInput(
  form: AgentHarnessSettingsForm,
): AgentHarnessSettingsInput {
  return {
    trustedLocalGitRoots: (form.trustedLocalGitRoots ?? "").split(/\r?\n/).map(root => root.trim()).filter(Boolean),
    enabled: form.enabled,
    host: form.host.trim(),
    port: form.port.trim() === "" ? "0" : form.port.trim(),
    publicBaseUrl: form.publicBaseUrl.trim() || null,
    localAuthenticationMode: form.localAuthenticationMode,
  };
}
export function ServiceHostRemediation({ lifecycleStatus, isBusy, onRestartServiceHost }: {
  lifecycleStatus: AgentHarnessServiceHostLifecycleStatus | null;
  isBusy: boolean;
  onRestartServiceHost: () => void;
}): JSX.Element | null {
  if (!lifecycleStatus?.restartRequired) return null;
  return (
    <section className="agent-harness-message error service-host-remediation" role="status" aria-label="Background Agent update required">
      <div className="service-host-remediation-message">
        <strong>Background Agent update required</strong>
        <p>The running Background Agent belongs to a different ChampCity build generation.</p>
        <p>MCP-dependent work may fail or use stale loaded runtime state until the Background Agent is replaced.</p>
      </div>
      <div className="service-host-remediation-actions">
        <button disabled={isBusy} onClick={onRestartServiceHost} type="button">Restart Background Agent</button>
      </div>
    </section>
  );
}
export function AgentHarnessSettingsWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  lifecycleSavePending,
  lifecycleStatus,
  onExitBackgroundAgent,
  onImportLegacyOAuthClients,
  onRegisterWorkspace,
  onRefresh,
  onRestart,
  onRestartServiceHost,
  onReturn,
  onSaveConfiguration,
  onSaveServiceHostLifecycleSettings,
  onStartBackgroundAgent,
  onStart,
  onStop,
  onUnregisterWorkspace,
  savePending,
  selectedProjectName,
  status,
  workspaceRegistry,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: "start" | "stop" | "restart" | "startBackgroundAgent" | "exitBackgroundAgent" | "restartServiceHost" | "importLegacyOAuthClients" | "registerWorkspace" | "unregisterWorkspace" | null;
  lifecycleSavePending: boolean;
  lifecycleStatus: AgentHarnessServiceHostLifecycleStatus | null;
  onExitBackgroundAgent: () => void;
  onImportLegacyOAuthClients: () => void;
  onRegisterWorkspace: () => void;
  onRefresh: () => void;
  onRestart: () => void;
  onRestartServiceHost: () => void;
  onReturn: () => void;
  onSaveConfiguration: (settings: AgentHarnessSettingsInput) => void;
  onSaveServiceHostLifecycleSettings: (settings: AgentHarnessServiceHostLifecycleSettingsInput) => void;
  onStartBackgroundAgent: () => void;
  onStart: () => void;
  onStop: () => void;
  onUnregisterWorkspace: (workspaceId: string) => void;
  savePending: boolean;
  selectedProjectName: string;
  status: AgentHarnessStatus | null;
  workspaceRegistry: AgentHarnessWorkspaceRegistrySnapshot | null;
}): JSX.Element {
  const [settingsForm, setSettingsForm] = useState<AgentHarnessSettingsForm>(() =>
    agentHarnessSettingsFormFromStatus(status),
  );
  const [settingsFormDirty, setSettingsFormDirty] = useState(false);
  const configuredPort = status?.configuredPort === 0
    ? "Auto"
    : status?.configuredPort?.toString() ?? "Unavailable";
  const isBusy = Boolean(actionPending) || savePending || lifecycleSavePending;
  const backgroundAgentStopped = lifecycleStatus?.explicitlyStopped === true;

  useEffect(() => {
    if (!settingsFormDirty) {
      setSettingsForm(agentHarnessSettingsFormFromStatus(status));
    }
  }, [
    settingsFormDirty,
    status?.configuredPort,
    status?.enabled,
    status?.host,
    status?.localAuthenticationMode,
    status?.publicBaseUrl,
    status?.trustedLocalGitRoots?.join("\n"),
  ]);

  function updateSettingsForm<K extends keyof AgentHarnessSettingsForm>(
    key: K,
    value: AgentHarnessSettingsForm[K],
  ): void {
    setSettingsFormDirty(true);
    setSettingsForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitSettings(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSettingsFormDirty(false);
    onSaveConfiguration(buildAgentHarnessSettingsInput(settingsForm));
  }

  return (
    <section className="settings-workspace" aria-label="Settings workspace">
      <header className="settings-workspace-header">
        <div>
          <span>Settings</span>
          <h2>Agent Harness</h2>
        </div>
        <div className="settings-workspace-actions">
          <button onClick={onReturn} type="button">
            <RotateCcw aria-hidden="true" size={14} />
            Return
          </button>
          <button onClick={onRefresh} type="button">
            <RefreshCw aria-hidden="true" size={14} />
            Refresh
          </button>
        </div>
      </header>

      <CodexConnectionsPanel />
      <div className="agent-harness-control-strip" aria-label="Agent Harness controls">
        <div className={`agent-harness-state ${status?.state ?? "unavailable"}`}>
          <span>MCP Runtime</span>
          <strong>{status?.state ?? "unavailable"}</strong>
        </div>
        <button disabled={isBusy || backgroundAgentStopped} onClick={onStart} type="button">
          <Play aria-hidden="true" size={14} />
          Start MCP Runtime
        </button>
        <button disabled={isBusy || backgroundAgentStopped} onClick={onStop} type="button">
          <Square aria-hidden="true" size={13} />
          Stop MCP Runtime
        </button>
        <button disabled={isBusy || backgroundAgentStopped} onClick={onRestart} type="button">
          <RotateCcw aria-hidden="true" size={14} />
          Restart MCP Runtime
        </button>
      </div>

      {actionFeedback ? (
        <div className="agent-harness-message success" role="status">{actionFeedback}</div>
      ) : null}
      {actionError || lifecycleStatus?.lastError || status?.lastError ? (
        <div className="agent-harness-message error" role="status">
          {actionError || lifecycleStatus?.lastError || status?.lastError}
        </div>
      ) : null}

      <section className="settings-panel settings-panel-wide" aria-label="Background Agent lifecycle">
        <header>
          <span>Background Agent</span>
          <strong>{backgroundAgentLifecycleLabel(lifecycleStatus)}</strong>
        </header>
        <div className="settings-workspace-actions">
          {backgroundAgentStopped ? (
            <button disabled={isBusy} onClick={onStartBackgroundAgent} type="button">Start Background Agent</button>
          ) : (
            <button disabled={isBusy || !lifecycleStatus?.serviceHostProcessId} onClick={onExitBackgroundAgent} type="button">Exit Background Agent</button>
          )}
        </div>
        <label className="agent-harness-checkbox-row">
          <input
            checked={lifecycleStatus?.launchAtLogin ?? true}
            disabled={isBusy || lifecycleStatus?.startupRegistrationSupported === false}
            onChange={(event) => onSaveServiceHostLifecycleSettings({
              launchAtLogin: event.currentTarget.checked,
            })}
            type="checkbox"
          />
          <span>Start Background Agent for my Windows user at sign-in</span>
        </label>
        <SettingsFacts
          facts={[
            ["Background Agent State", backgroundAgentLifecycleLabel(lifecycleStatus)],
            ["Service Host PID", lifecycleStatus?.serviceHostProcessId?.toString() ?? "Unavailable"],
            ["Worker PID", lifecycleStatus?.workerProcessId?.toString() ?? "Unavailable"],
            ["Worker Recovery", lifecycleStatus?.workerRecoveryState ?? "idle"],
            ["Power Epoch", lifecycleStatus?.powerEpoch?.toString() ?? "0"],
            ["Recovery Reason", lifecycleStatus?.reason ?? "None"],
            ["Heartbeat Misses", lifecycleStatus?.consecutiveHeartbeatMisses?.toString() ?? "0"],
            ["Runtime Build", lifecycleStatus?.runtimeBuildIdentity?.slice(0, 23) ?? "Unavailable"],
            ["Startup Trigger Scope", startupRegistrationScopeLabel(lifecycleStatus?.startupRegistrationScope)],
            ["Login Registration", lifecycleStatus?.loginItemRegistered ? "Exact trigger detected" : "Exact trigger not detected"],
            ["Executable Will Launch", yesNo(lifecycleStatus?.executableWillLaunchAtLogin)],
            ["Windows Registration Supported", yesNo(lifecycleStatus?.startupRegistrationSupported)],
          ]}
        />
        <ServiceHostRemediation
          lifecycleStatus={lifecycleStatus}
          isBusy={isBusy}
          onRestartServiceHost={onRestartServiceHost}
        />
      </section>

      <form className="agent-harness-settings-form" aria-label="Agent Harness configuration" onSubmit={submitSettings}>
        <label className="agent-harness-checkbox-row">
          <input
            checked={settingsForm.enabled}
            disabled={isBusy}
            onChange={(event) => updateSettingsForm("enabled", event.currentTarget.checked)}
            type="checkbox"
          />
          <span>Start MCP Runtime when Background Agent starts</span>
        </label>
        <label>
          <span>Host</span>
          <input
            disabled={isBusy}
            onChange={(event) => updateSettingsForm("host", event.currentTarget.value)}
            value={settingsForm.host}
          />
        </label>
        <label>
          <span>Port</span>
          <input
            disabled={isBusy}
            inputMode="numeric"
            min="0"
            max="65535"
            onChange={(event) => updateSettingsForm("port", event.currentTarget.value)}
            type="number"
            value={settingsForm.port}
          />
        </label>
        <label>
          <span>Public Base URL</span>
          <input
            disabled={isBusy}
            onChange={(event) => updateSettingsForm("publicBaseUrl", event.currentTarget.value)}
            placeholder="https://connector.example.test/champcity"
            value={settingsForm.publicBaseUrl}
          />
        </label>
        <label>
          <span>Authentication</span>
          <select
            disabled={isBusy}
            onChange={(event) =>
              updateSettingsForm(
                "localAuthenticationMode",
                event.currentTarget.value as AgentHarnessAuthenticationMode,
              )}
            value={settingsForm.localAuthenticationMode}
          >
            <option value="oauth-required">OAuth required</option>
            <option value="local-unauthenticated">Local unauthenticated</option>
          </select>
        </label>
        <button disabled={isBusy} type="submit">
          Save Settings
        </button>
        <label>
          <span>Trusted Local Git Roots</span>
          <textarea disabled={isBusy} rows={3} value={settingsForm.trustedLocalGitRoots}
            onChange={event => updateSettingsForm("trustedLocalGitRoots", event.currentTarget.value)} />
          <small>Enter one existing directory per line. Git repositories beneath these roots are available without project registration. An empty list disables local Git access.</small>
        </label>
      </form>

      <div className="settings-grid">
        <GithubProviderSettings />
        <section className="settings-panel settings-panel-wide" aria-label="Registered MCP Projects">
          <header>
            <span>Registered MCP Projects</span>
            <strong>{workspaceRegistry?.workspaces.length ?? 0} projects</strong>
          </header>
          <SettingsFacts
            facts={[
              ["Registry", workspaceRegistry?.state ?? "unavailable"],
              ["Desktop-selected project", selectedProjectName],
              ["MCP routing", "Exact registered workspaceId"],
            ]}
          />
          <button
            className="settings-inline-action"
            disabled={isBusy}
            onClick={onRegisterWorkspace}
            type="button"
          >
            <FolderOpen aria-hidden="true" size={14} />
            Add Project
          </button>
          <ul className="settings-tool-list" aria-label="Registered MCP project list">
            {(workspaceRegistry?.workspaces ?? []).map((registeredWorkspace) => (
              <li key={registeredWorkspace.workspaceId}>
                <span>
                  {registeredWorkspace.repositoryName} / {registeredWorkspace.workspaceId} / {registeredWorkspace.availability}
                </span>
                <button
                  disabled={isBusy}
                  onClick={() => onUnregisterWorkspace(registeredWorkspace.workspaceId)}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
            {workspaceRegistry?.state === "failed" ? <li>{workspaceRegistry.error}</li> : null}
            {workspaceRegistry?.state === "ready" && workspaceRegistry.workspaces.length === 0
              ? <li>No MCP projects registered</li>
              : null}
            {!workspaceRegistry ? <li>Registry unavailable</li> : null}
          </ul>
        </section>

        <section className="settings-panel" aria-label="Local service">
          <header>
            <span>Local Service</span>
          </header>
          <SettingsFacts
            facts={[
              ["MCP Endpoint", status?.mcpEndpoint ?? "Not running"],
              ["Health Endpoint", status?.healthEndpoint ?? "Not running"],
              ["Host", status?.host ?? "Unavailable"],
              ["Configured Port", configuredPort],
              ["Active Port", status?.port?.toString() ?? "Not running"],
            ]}
          />
        </section>

        <section className="settings-panel" aria-label="Public connector">
          <header>
            <span>Public Connector</span>
          </header>
          <button
            className="settings-inline-action"
            disabled={isBusy}
            onClick={onImportLegacyOAuthClients}
            type="button"
          >
            <FileText aria-hidden="true" size={14} />
            Import Legacy OAuth Clients
          </button>
          <SettingsFacts
            facts={[
              ["Public Base URL", status?.publicBaseUrl ?? "Not configured"],
              ["Public URL Configured", yesNo(status?.publicBaseUrlConfigured)],
              ["OAuth", status?.oauthConfigured ? "Configured" : "Not configured"],
              ["Auth Mode", status?.localAuthenticationMode ?? "Unavailable"],
              ["files.read Transport", accessGrantedLabel(status?.filesReadTransportAuthorized)],
              ["files.write Transport", accessGrantedLabel(status?.filesWriteTransportAuthorized)],
              ["Registered Clients", status?.registeredClientCount.toString() ?? "Unavailable"],
              ["Active Tokens", status?.activeOAuthTokenCount.toString() ?? "Unavailable"],
              ["Active files.read Grants", status?.activeFilesReadAuthorizationCount.toString() ?? "Unavailable"],
              ["Active files.write Grants", status?.activeFilesWriteAuthorizationCount.toString() ?? "Unavailable"],
            ]}
          />
        </section>

        <section className="settings-panel" aria-label="Tool exposure">
          <header>
            <span>Tool Exposure</span>
            <strong>{status?.publicToolCount ?? 0} tools</strong>
          </header>
          <ul className="settings-tool-list">
            {(status?.publicToolNames ?? []).map((toolName) => (
              <li key={toolName}>{toolName}</li>
            ))}
            {status && status.publicToolNames.length === 0 ? <li>No public tools exposed</li> : null}
            {!status ? <li>Unavailable</li> : null}
          </ul>
        </section>

        <section className="settings-panel settings-panel-wide" aria-label="Diagnostics">
          <header>
            <span>Diagnostics</span>
          </header>
          <ol className="settings-activity-list">
            {(status?.recentActivity ?? []).map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
            {status && status.recentActivity.length === 0 ? <li>No lifecycle activity recorded</li> : null}
            {!status ? <li>Status unavailable</li> : null}
          </ol>
        </section>
      </div>
    </section>
  );
}
function SettingsFacts({
  facts,
}: {
  facts: Array<[string, string]>;
}): JSX.Element {
  return (
    <dl className="settings-facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function backgroundAgentLifecycleLabel(
  lifecycleStatus: AgentHarnessServiceHostLifecycleStatus | null,
): string {
  if (lifecycleStatus?.explicitlyStopped) {
    return "Stopped by user";
  }
  return lifecycleStatus?.state ?? "unavailable";
}
export function startupRegistrationScopeLabel(
  scope: AgentHarnessServiceHostLifecycleStatus["startupRegistrationScope"] | undefined,
): string {
  if (scope === "machine") return "Machine managed for everyone";
  if (scope === "user") return "Current Windows user";
  return "Unavailable";
}
function yesNo(value: boolean | undefined): string {
  return value ? "Yes" : "No";
}
function accessGrantedLabel(value: boolean | undefined): string {
  return value ? "Access granted" : "No access grant";
}
