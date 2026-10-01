import { useEffect, useState } from "react";
import type { ManagedCodexConnectionsStatus } from "../../shared/codexConnectionContracts";

export function CodexConnectionsView({ status, busy, error, onRefresh, onToggle }: {
  status: ManagedCodexConnectionsStatus | null; busy: boolean; error: string;
  onRefresh: () => void; onToggle: (name: string, enabled: boolean) => void;
}) {
  return <section className="settings-panel settings-panel-wide" aria-label="Codex Connections">
    <h3>Codex Connections</h3>
    <p>Outbound connections for ChampCity-managed Codex. Agent Harness public connector credentials are managed separately.</p>
    <button type="button" disabled={busy} onClick={onRefresh}>Refresh Status</button>
    {error ? <p role="status">{error}</p> : null}
    {status?.blocker ? <p role="status">{status.blocker}</p> : null}
    {status && !status.connections.length ? <p>No approved external connections. Ambient personal MCP servers are excluded.</p> : null}
    {status?.connections.map(connection => <div key={connection.name}>
      <strong>{connection.name}</strong> · {connection.enabled ? "Enabled" : "Disabled"} · {connection.requirement} · {connection.status}
      <p>{connection.diagnostic}</p>
      <button type="button" disabled={busy} onClick={() => onToggle(connection.name, !connection.enabled)}>{connection.enabled ? "Disable" : "Enable"}</button>
    </div>)}
    <p>Optional connections are checked separately and excluded from implementation in this recovery version. Connector authentication and reconnect are unavailable.</p>
  </section>;
}

export function CodexConnectionsPanel() {
  const [status, setStatus] = useState<ManagedCodexConnectionsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { let alive = true; void window.champcity.getCodexManagedRuntimeStatus().then(runtime => {
    if (alive) setStatus(runtime.connections ?? null);
  }).catch(() => { if (alive) setError("Could not read Codex connections."); }); return () => { alive = false; }; }, []);
  async function act(name?: string, enabled?: boolean) {
    setBusy(true); setError("");
    try { setStatus(name === undefined ? await window.champcity.refreshCodexConnections() : await window.champcity.setCodexConnectionEnabled(name, Boolean(enabled))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update Codex connections."); }
    finally { setBusy(false); }
  }
  return <CodexConnectionsView status={status} busy={busy} error={error} onRefresh={() => void act()} onToggle={(name, enabled) => void act(name, enabled)} />;
}
