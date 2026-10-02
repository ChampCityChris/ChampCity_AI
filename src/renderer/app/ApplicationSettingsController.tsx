import {useEffect, useState, type ComponentProps} from "react";
import {AgentHarnessSettingsWorkspace} from "./ApplicationSettingsWorkspace";
import {startAgentHarnessSettingsPolling} from "./rendererPollingPolicy";
type Props = ComponentProps<typeof AgentHarnessSettingsWorkspace>;
export function ApplicationSettingsController({projectName, onReturn}: {projectName: string; onReturn: () => void}) {
  const [status, setStatus] = useState<Props["status"]>(null), [lifecycle, setLifecycle] = useState<Props["lifecycleStatus"]>(null);
  const [registry, setRegistry] = useState<Props["workspaceRegistry"]>(null), [pending, setPending] = useState<Props["actionPending"]>(null);
  const [error, setError] = useState(""), [feedback, setFeedback] = useState(""), [saving, setSaving] = useState(false), [savingLifecycle, setSavingLifecycle] = useState(false);
  const refresh = async () => {
    const next = await window.champcity.getAgentHarnessServiceHostLifecycleStatus(); setLifecycle(next);
    if (next.explicitlyStopped) setStatus(null); else setStatus(await window.champcity.getAgentHarnessStatus());
    setRegistry(await window.champcity.listAgentHarnessRegisteredWorkspaces());
  };
  useEffect(() => startAgentHarnessSettingsPolling({refresh: () => {void refresh().catch(reason => setError(String(reason)));},
    setInterval: (callback, ms) => window.setInterval(callback, ms), clearInterval: handle => window.clearInterval(handle)}), []);
  const run = async (action: Props["actionPending"], operation: () => Promise<unknown>) => {
    setPending(action); setError(""); setFeedback("");
    try {await operation(); await refresh(); setFeedback("Settings action completed.");}
    catch (reason) {setError(String(reason));} finally {setPending(null);}
  };
  return <AgentHarnessSettingsWorkspace status={status} lifecycleStatus={lifecycle} workspaceRegistry={registry}
    selectedProjectName={projectName} actionError={error} actionFeedback={feedback} actionPending={pending}
    savePending={saving} lifecycleSavePending={savingLifecycle} onReturn={onReturn}
    onRefresh={() => void refresh().catch(reason => setError(String(reason)))}
    onStart={() => void run("start", window.champcity.startAgentHarness)} onStop={() => void run("stop", window.champcity.stopAgentHarness)}
    onRestart={() => void run("restart", window.champcity.restartAgentHarness)}
    onStartBackgroundAgent={() => void run("startBackgroundAgent", window.champcity.startBackgroundAgent)}
    onExitBackgroundAgent={() => void run("exitBackgroundAgent", window.champcity.exitBackgroundAgent)}
    onRestartServiceHost={() => void run("restartServiceHost", window.champcity.restartAgentHarnessServiceHost)}
    onImportLegacyOAuthClients={() => void run("importLegacyOAuthClients", window.champcity.importLegacyOAuthClients)}
    onRegisterWorkspace={() => void run("registerWorkspace", window.champcity.chooseAndRegisterAgentHarnessWorkspace)}
    onUnregisterWorkspace={id => void run("unregisterWorkspace", () => window.champcity.unregisterAgentHarnessWorkspace(id))}
    onSaveConfiguration={settings => {setSaving(true); void run(null, () => window.champcity.saveAgentHarnessSettings(settings)).finally(() => setSaving(false));}}
    onSaveServiceHostLifecycleSettings={settings => {setSavingLifecycle(true); void run(null, () => window.champcity.saveAgentHarnessServiceHostLifecycleSettings(settings)).finally(() => setSavingLifecycle(false));}} />;
}
