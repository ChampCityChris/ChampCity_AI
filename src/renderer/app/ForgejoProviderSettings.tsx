import { useEffect, useState, type FormEvent } from "react";
import type { ForgejoHostingConfiguration, ForgejoHostingConfigurationInput, RepositoryHostingSettings, RepositoryHostingStatus } from "../../shared/repositoryHostingContracts";

const fresh = (): ForgejoHostingConfigurationInput => ({ providerId: "forgejo", kind: "forgejo", apiBaseUrl: "", namespace: "", namespaceType: "user", preferredTransport: "ssh", allowInsecureHttp: false, allowInsecureGitHttp: false });
const form = (configuration: ForgejoHostingConfiguration): ForgejoHostingConfigurationInput => {
  const { credentialReference: _reference, ...fields } = configuration;
  return fields;
};

export function ForgejoProviderSettings(): JSX.Element {
  const [settings, setSettings] = useState<RepositoryHostingSettings | null>(null), [draft, setDraft] = useState(fresh);
  const [editingId, setEditingId] = useState<string | null>(null), [token, setToken] = useState("");
  const [status, setStatus] = useState<RepositoryHostingStatus | null>(null), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    void window.champcity.getRepositoryHostingSettings().then(value => {
      if (!active) return; setSettings(value);
      if (value.providers[0]) { setDraft(form(value.providers[0])); setEditingId(value.providers[0].providerId); }
    }).catch(() => { if (active) setMessage("Repository hosting settings are unavailable."); });
    return () => { active = false; };
  }, []);
  const saved = settings?.providers.find(provider => provider.providerId === editingId);
  const savedSelection = Boolean(saved && JSON.stringify(form(saved)) === JSON.stringify(draft));
  const select = (id: string) => {
    const provider = settings?.providers.find(item => item.providerId === id);
    setDraft(provider ? form(provider) : fresh()); setEditingId(provider?.providerId ?? null); setToken(""); setStatus(null); setMessage("");
  };
  async function save(event: FormEvent) {
    event.preventDefault(); if (!settings) return;
    setPending(true); setMessage("");
    try {
      const next = { ...draft, providerId: draft.providerId.trim(), apiBaseUrl: draft.apiBaseUrl.trim(), namespace: draft.namespace.trim() };
      const providers = settings.providers.filter(provider => provider.providerId !== editingId);
      if (providers.some(provider => provider.providerId === next.providerId)) { setMessage("Another connection already uses this provider ID."); return; }
      const result = await window.champcity.saveRepositoryHostingSettings({ configurationId: settings.configurationId, providers: [...providers, next] });
      setSettings(result); setEditingId(next.providerId); setDraft(form(result.providers.find(provider => provider.providerId === next.providerId)!)); setToken(""); setStatus(null); setMessage("Connection saved. Authentication stays in secure application storage.");
    } catch { setMessage("Connection could not be saved. Refresh settings and check the fields."); }
    finally { setPending(false); }
  }
  async function action(kind: "status" | "authenticate" | "clear-authentication") {
    if (!settings || !editingId || !savedSelection) return;
    setPending(true); setMessage("");
    try {
      if (kind === "authenticate") await window.champcity.saveRepositoryHostingCredential({ providerId: editingId, expectedConfigurationId: settings.configurationId, token });
      if (kind === "clear-authentication") await window.champcity.removeRepositoryHostingCredential({ providerId: editingId, expectedConfigurationId: settings.configurationId });
      setStatus(await window.champcity.getRepositoryHostingProviderStatus(editingId));
    } catch { setMessage("Authentication or connection verification could not complete. Refresh the connection settings before retrying."); }
    finally { setToken(""); setPending(false); }
  }
  return <section className="settings-panel settings-panel-wide" aria-label="Forgejo repository hosting">
    <header><span>Forgejo repository hosting</span><strong>{status?.readiness ?? (settings ? "Configure connection" : "Loading")}</strong></header>
    <p>Repository hosting is available independently of Project and workflow registration.</p>
    <label>Connection<select disabled={pending || !settings} value={editingId ?? ""} onChange={event => select(event.target.value)}>
      <option value="">New Forgejo connection</option>{settings?.providers.map(provider => <option key={provider.providerId} value={provider.providerId}>{provider.providerId}</option>)}
    </select></label>
    <form onSubmit={event => { void save(event); }}>
      <label>Provider ID<input required maxLength={64} disabled={pending} value={draft.providerId} onChange={event => setDraft({ ...draft, providerId: event.target.value })} /></label>
      <label>API base URL<input required maxLength={2048} disabled={pending} placeholder="https://forgejo.example.org/api/v1" value={draft.apiBaseUrl} onChange={event => setDraft({ ...draft, apiBaseUrl: event.target.value })} /></label>
      <label>Namespace<input required maxLength={100} disabled={pending} value={draft.namespace} onChange={event => setDraft({ ...draft, namespace: event.target.value })} /></label>
      <label>Namespace type<select disabled={pending} value={draft.namespaceType} onChange={event => setDraft({ ...draft, namespaceType: event.target.value as "user" | "organization" })}><option value="user">User</option><option value="organization">Organization</option></select></label>
      <label>Preferred Git transport<select disabled={pending} value={draft.preferredTransport} onChange={event => setDraft({ ...draft, preferredTransport: event.target.value as "ssh" | "https" })}><option value="ssh">SSH</option><option value="https">HTTPS</option></select></label>
      <label>Expected SSH host<input maxLength={253} disabled={pending} value={draft.expectedSshHost ?? ""} onChange={event => setDraft({ ...draft, expectedSshHost: event.target.value.trim() || undefined })} /></label>
      <label>Expected SSH port<input type="number" min={1} max={65535} disabled={pending} value={draft.expectedSshPort ?? ""} onChange={event => setDraft({ ...draft, expectedSshPort: event.target.value ? Number(event.target.value) : undefined })} /></label>
      <label><input type="checkbox" disabled={pending} checked={draft.allowInsecureHttp} onChange={event => setDraft({ ...draft, allowInsecureHttp: event.target.checked })} />Allow HTTP API for this connection</label>
      <label><input type="checkbox" disabled={pending} checked={draft.allowInsecureGitHttp} onChange={event => setDraft({ ...draft, allowInsecureGitHttp: event.target.checked })} />Allow HTTP Git transport for this connection</label>
      <button type="submit" disabled={pending || !settings}>Save connection</button>
    </form>
    <label>Forgejo API token<input type="password" autoComplete="new-password" maxLength={2048} disabled={pending || !savedSelection} value={token} onChange={event => setToken(event.target.value)} /></label>
    <div className="settings-workspace-actions">
      <button type="button" disabled={pending || !savedSelection || !token} onClick={() => { void action("authenticate"); }}>Save authentication</button>
      <button type="button" disabled={pending || !savedSelection} onClick={() => { void action("status"); }}>Check connection</button>
      <button type="button" disabled={pending || !savedSelection} onClick={() => { void action("clear-authentication"); }}>Clear authentication</button>
    </div>
    <p role="status">{message || status?.diagnostic || (status?.identity ? `Authenticated as ${status.identity.login}` : "Save a connection before configuring its authentication.")}</p>
  </section>;
}
