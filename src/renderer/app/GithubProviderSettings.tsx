import { useEffect, useState } from "react";
import type { GithubProviderStatus } from "../../shared/githubProviderContracts";

export function GithubProviderSettings(): JSX.Element {
  const [status, setStatus] = useState<GithubProviderStatus | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => { void window.champcity.getGithubProviderStatus().then((value) => { if (active) setStatus(value); }).catch(() => { if (active) setMessage("GitHub provider status is unavailable."); }); };
    refresh();
    const timer = setInterval(refresh, 2_000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  async function action(kind: "connect" | "restart" | "disconnect" | "repository"): Promise<void> {
    setPending(true);
    setMessage("");
    try {
      if (kind === "repository") {
        const evidence = await window.champcity.readGithubEvidence({ kind: "repository" });
        setMessage(`Verified GitHub repository: ${evidence.repository}`);
      } else {
        const method = kind === "connect" ? window.champcity.connectGithubProvider : kind === "restart" ? window.champcity.restartGithubProvider : window.champcity.disconnectGithubProvider;
        setStatus(await method());
      }
    } catch { setMessage("GitHub operation could not complete. Check provider status and try again."); }
    finally { setPending(false); }
  }
  return <GithubProviderStatusPanel status={status} message={message} pending={pending} onAction={(kind) => { void action(kind); }} />;
}

export function GithubProviderStatusPanel({ status, message, pending, onAction }: {
  status: GithubProviderStatus | null; message: string; pending: boolean;
  onAction: (kind: "connect" | "restart" | "disconnect" | "repository") => void;
}): JSX.Element {
  const busy = pending || status?.busy;
  const labels = { disconnected: "Disconnected", acquiring: "Acquiring official runtime", connecting: "Connecting", ready: "Ready", unavailable: "Unavailable" };
  return <section className="settings-panel settings-panel-wide" aria-label="GitHub provider">
    <header><span>GitHub</span><strong>{status ? labels[status.runtime] : "Loading"}</strong></header>
    <p>Authentication: {status?.authentication === "authenticated" ? "Authenticated" : status?.authentication === "pending" ? "Authentication Required — finish the GitHub browser login" : "Authentication Required"}</p>
    <p>Version: {status?.version ?? "Not acquired"}</p>
    <p>Enabled toolsets: {status?.enabledToolsets.join(", ") ?? "context, repos, issues, pull_requests, actions"}</p>
    <p>Release writes: bounded GitHub CLI compatibility adapter. GitHub MCP reads are available when connected.</p>
    <div className="settings-workspace-actions">
      <button type="button" disabled={busy || status?.runtime === "ready"} onClick={() => onAction("connect")}>Connect GitHub</button>
      <button type="button" disabled={busy} onClick={() => onAction("restart")}>Restart GitHub</button>
      <button type="button" disabled={pending || status?.runtime === "disconnected"} onClick={() => onAction("disconnect")}>Disconnect GitHub</button>
      <button type="button" disabled={busy || status?.runtime !== "ready"} onClick={() => onAction("repository")}>Inspect selected repository</button>
    </div>
    <p role="status">{message || status?.lastDiagnostic || "Connect to sign in using GitHub's official provider."}</p>
    {status?.recovery === "last-known-good" ? <p>Recovery: using the last verified runtime.</p> : null}
    <details><summary>Capabilities · generation {status?.capabilityGeneration ?? 0}</summary>
      <ul>{status?.capabilities.map((entry) => <li key={entry.capabilityId}>{entry.capabilityId}: {entry.availability}</li>)}</ul>
    </details>
  </section>;
}
