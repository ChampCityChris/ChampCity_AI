import { useEffect, useState, type FormEvent } from "react";
import { repositoryHostingSettingsErrors, type RepositoryHostingSettingsErrorCode, type RepositoryHostingSettingsResult, type ForgejoHostingConfiguration, type ForgejoHostingConfigurationInput, type RepositoryHostingSettings, type RepositoryHostingStatus } from "../../shared/repositoryHostingContracts";

function unwrap<T>(result: RepositoryHostingSettingsResult<T>): T {
  if (!result.ok) throw { settingsCode: result.error.code };
  return result.value;
}

const fresh = (): ForgejoHostingConfigurationInput => ({ providerId: "forgejo", kind: "forgejo", apiBaseUrl: "", namespace: "", namespaceType: "user", preferredTransport: "ssh", allowInsecureHttp: false, allowInsecureGitHttp: false });
const form = (configuration: ForgejoHostingConfiguration): ForgejoHostingConfigurationInput => {
  const { credentialReference: _reference, ...fields } = configuration;
  return fields;
};

export function ForgejoProviderSettings(): JSX.Element {
  const [settings, setSettings] = useState<RepositoryHostingSettings | null>(null), [draft, setDraft] = useState(fresh);
  const [editingId, setEditingId] = useState<string | null>(null), [token, setToken] = useState("");
  const [status, setStatus] = useState<RepositoryHostingStatus | null>(null), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<RepositoryHostingSettingsErrorCode | null>(null);
  const showError = (error: unknown) => {
    const code = error && typeof error === "object" && "settingsCode" in error ? error.settingsCode : null;
    const bounded = typeof code === "string" && Object.prototype.hasOwnProperty.call(repositoryHostingSettingsErrors, code) ? code as RepositoryHostingSettingsErrorCode : "settings-unavailable";
    setErrorCode(bounded); setMessage(repositoryHostingSettingsErrors[bounded].message);
  };
  const fieldError = (field: string) => errorCode && repositoryHostingSettingsErrors[errorCode].field === field;
  useEffect(() => {
    let active = true;
    void window.champcity.getRepositoryHostingSettings().then(result => {
      const value = unwrap(result);
      if (!active) return; setSettings(value);
      if (value.providers[0]) { setDraft(form(value.providers[0])); setEditingId(value.providers[0].providerId); }
    }).catch(error => { if (active) showError(error); });
    return () => { active = false; };
  }, []);
  const saved = settings?.providers.find(provider => provider.providerId === editingId);
  const savedSelection = Boolean(saved && JSON.stringify(form(saved)) === JSON.stringify(draft));
  const select = (id: string) => {
    const provider = settings?.providers.find(item => item.providerId === id);
    setDraft(provider ? form(provider) : fresh()); setEditingId(provider?.providerId ?? null); setToken(""); setStatus(null); setMessage(""); setErrorCode(null);
  };
  async function save(event: FormEvent) {
    event.preventDefault(); if (!settings) return;
    setPending(true); setMessage(""); setErrorCode(null);
    try {
      const next = { ...draft, providerId: draft.providerId.trim().toLowerCase(), apiBaseUrl: draft.apiBaseUrl.trim(), namespace: draft.namespace.trim() };
      const providers = settings.providers.filter(provider => provider.providerId !== editingId);
      if (providers.some(provider => provider.providerId === next.providerId)) { setMessage("Another connection already uses this provider ID."); return; }
      const result = unwrap(await window.champcity.saveRepositoryHostingSettings({ configurationId: settings.configurationId, providers: [...providers, next] }));
      setSettings(result); setEditingId(next.providerId); setDraft(form(result.providers.find(provider => provider.providerId === next.providerId)!)); setToken(""); setStatus(null); setMessage("Connection saved — authentication required.");
    } catch (error) { showError(error); }
    finally { setToken(""); setPending(false); }
  }
  async function action(kind: "status" | "authenticate" | "clear-authentication") {
    if (!settings || !editingId || !savedSelection) return;
    setPending(true); setMessage(""); setErrorCode(null); setStatus(null);
    try {
      if (kind === "authenticate") {
        const credential = token; setToken("");
        unwrap(await window.champcity.saveRepositoryHostingCredential({ providerId: editingId, expectedConfigurationId: settings.configurationId, token: credential }));
      }
      if (kind === "clear-authentication") unwrap(await window.champcity.removeRepositoryHostingCredential({ providerId: editingId, expectedConfigurationId: settings.configurationId }));
      setStatus(unwrap(await window.champcity.getRepositoryHostingProviderStatus(editingId)));
    } catch (error) { showError(error); }
    finally { setToken(""); setPending(false); }
  }
  async function refresh() {
    setPending(true); setToken(""); setStatus(null); setMessage(""); setErrorCode(null);
    try { const value = unwrap(await window.champcity.getRepositoryHostingSettings()); setSettings(value); const provider = value.providers.find(item => item.providerId === editingId); setEditingId(provider?.providerId ?? null); setDraft(provider ? form(provider) : fresh()); }
    catch (error) { showError(error); } finally { setPending(false); }
  }
  return <section className="settings-panel settings-panel-wide repository-hosting-settings" aria-label="Forgejo repository hosting">
    <header><span>Forgejo repository hosting</span><strong>{status?.readiness ?? (settings ? "Configure connection" : "Loading")}</strong></header>
    <p>Repository hosting is available independently of Project and workflow registration.</p>
    <label className="repository-hosting-field"><span>Connection</span><select disabled={pending || !settings} value={editingId ?? ""} onChange={event => select(event.target.value)}>
      <option value="">New Forgejo connection</option>{settings?.providers.map(provider => <option key={provider.providerId} value={provider.providerId}>{provider.providerId}</option>)}
    </select></label>
    <form className="repository-hosting-form" aria-label="Forgejo connection" onSubmit={event => { void save(event); }}>
      <label><span>Provider ID</span><input required maxLength={64} disabled={pending} aria-invalid={Boolean(fieldError("providerId"))} aria-describedby={fieldError("providerId") ? "forgejo-settings-message" : undefined} value={draft.providerId} onChange={event => setDraft({ ...draft, providerId: event.target.value })} /></label>
      <label><span>Forgejo API base URL</span><input required maxLength={2048} disabled={pending} placeholder="https://forgejo.example.org/api/v1" aria-invalid={Boolean(fieldError("apiBaseUrl"))} aria-describedby="forgejo-api-help forgejo-settings-message" value={draft.apiBaseUrl} onChange={event => setDraft({ ...draft, apiBaseUrl: event.target.value })} /><small id="forgejo-api-help">Use the Forgejo API endpoint, for example https://forgejo.example.com/api/v1</small></label>
      <label><span>Namespace</span><input required maxLength={100} disabled={pending} aria-invalid={Boolean(fieldError("namespace"))} aria-describedby={fieldError("namespace") ? "forgejo-settings-message" : undefined} value={draft.namespace} onChange={event => setDraft({ ...draft, namespace: event.target.value })} /></label>
      <label><span>Namespace type</span><select disabled={pending} value={draft.namespaceType} onChange={event => setDraft({ ...draft, namespaceType: event.target.value as "user" | "organization" })}><option value="user">User</option><option value="organization">Organization</option></select></label>
      <label><span>Preferred Git transport</span><select disabled={pending} value={draft.preferredTransport} onChange={event => setDraft({ ...draft, preferredTransport: event.target.value as "ssh" | "https" })}><option value="ssh">SSH</option><option value="https">HTTPS</option></select></label>
      <label><span>Expected SSH host</span><input maxLength={253} disabled={pending} value={draft.expectedSshHost ?? ""} onChange={event => setDraft({ ...draft, expectedSshHost: event.target.value.trim() || undefined })} /></label>
      <label><span>Expected SSH port</span><input type="number" min={1} max={65535} disabled={pending} value={draft.expectedSshPort ?? ""} onChange={event => setDraft({ ...draft, expectedSshPort: event.target.value ? Number(event.target.value) : undefined })} /></label>
      <label className="repository-hosting-checkbox"><span>HTTP API policy</span><input type="checkbox" disabled={pending} checked={draft.allowInsecureHttp} onChange={event => setDraft({ ...draft, allowInsecureHttp: event.target.checked })} /><span>Allow HTTP API for this connection</span></label>
      <label className="repository-hosting-checkbox"><span>HTTP Git policy</span><input type="checkbox" disabled={pending} checked={draft.allowInsecureGitHttp} onChange={event => setDraft({ ...draft, allowInsecureGitHttp: event.target.checked })} /><span>Allow HTTP Git transport for this connection</span></label>
      <button type="submit" disabled={pending || !settings}>{pending ? "Saving / checking…" : "Save connection"}</button>
    </form>
    <label className="repository-hosting-field"><span>Forgejo API token</span><input aria-describedby="forgejo-token-help" type="password" autoComplete="new-password" maxLength={2048} disabled={pending || !savedSelection} aria-invalid={Boolean(fieldError("token"))} value={token} onChange={event => setToken(event.target.value)} /><small id="forgejo-token-help">{!savedSelection ? "Save the connection before adding authentication." : !token ? "Enter a token to enable Save authentication." : "Authentication is stored in secure application storage."}</small></label>
    <div className="settings-workspace-actions">
      <button type="button" disabled={pending || !savedSelection || !token.trim()} onClick={() => { void action("authenticate"); }}>Save authentication</button>
      <button type="button" disabled={pending || !savedSelection} onClick={() => { void action("status"); }}>Check connection</button>
      <button type="button" disabled={pending || !savedSelection} onClick={() => { void action("clear-authentication"); }}>Clear authentication</button>
    </div>
    <div className="settings-workspace-actions"><button type="button" disabled={pending} onClick={() => { void refresh(); }}>Refresh settings</button></div>
    <p id="forgejo-settings-message" role={errorCode ? "alert" : "status"}>{message || status?.diagnostic || (status?.identity ? `Ready — authenticated as ${status.identity.login}` : savedSelection ? "Authentication required." : "Save a connection before configuring its authentication.")}</p>
  </section>;
}
