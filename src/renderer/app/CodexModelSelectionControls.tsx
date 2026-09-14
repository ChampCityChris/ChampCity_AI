import { useEffect, useState } from "react";
import { selectionBlocker, type CodexManagedRuntimeStatus, type CodexModelSelection } from "../../shared/codexRuntimeContracts";

export function useCodexModelSelection(disabled: boolean) {
  const [runtime, setRuntime] = useState<CodexManagedRuntimeStatus | null>(null);
  const [draft, setDraft] = useState<CodexModelSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void window.champcity.getCodexManagedRuntimeStatus().then((status) => { if (alive) setRuntime(status); })
        .catch(() => { if (alive) setError("Could not read Codex runtime status."); });
    };
    refresh();
    const timer = window.setInterval(refresh, 1500);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);
  const selection = draft ?? runtime?.selection ?? null;
  const locked = disabled || saving || Boolean(runtime?.busy) || !runtime || ["initializing", "checking", "unavailable"].includes(runtime.updateState);
  const blocker = selectionBlocker(runtime?.catalog ?? [], selection) ?? (draft ? null : runtime?.selectionBlocker);
  async function save(value: CodexModelSelection) {
    setDraft(value);
    setSaving(true);
    setError("");
    try { setRuntime(await window.champcity.setCodexModelSelection(value)); setDraft(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save Codex selection."); }
    finally { setSaving(false); }
  }
  const model = runtime?.catalog.find((entry) => entry.model === selection?.model);
  const controls = <div className="codex-model-selection" aria-label="Codex model selection">
    <label>Model <select aria-label="Model" disabled={locked || !runtime?.catalog.length} value={selection?.model ?? ""}
      onChange={(event) => { setDraft({ model: event.target.value, reasoningEffort: "" }); setError(""); }}>
      <option value="">Choose model</option>
      {selection?.model && !model ? <option value={selection.model}>{selection.model} (unavailable)</option> : null}
      {runtime?.catalog.map((entry) => <option key={entry.id} value={entry.model}>{entry.displayName}</option>)}
    </select></label>
    <label>Reasoning <select aria-label="Reasoning" disabled={locked || !model} value={selection?.reasoningEffort ?? ""}
      onChange={(event) => {
        if (!selection) return;
        const next = { model: selection.model, reasoningEffort: event.target.value };
        if (next.reasoningEffort) void save(next);
        else setDraft(next);
      }}>
      <option value="">Choose reasoning</option>
      {model?.supportedReasoningEfforts.map((effort) => <option key={effort} value={effort}>{effort.charAt(0).toUpperCase() + effort.slice(1)}</option>)}
    </select></label>
    <small>Codex {runtime?.version ?? "version pending"} · {runtime?.updateState ?? "initializing"} · {runtime?.message ?? "Checking runtime…"}</small>
    {error || blocker ? <p role="status">{error || blocker}</p> : null}
  </div>;
  return { controls, selection, canRun: Boolean(runtime && selection && !blocker && !locked && !draft && !error) };
}
