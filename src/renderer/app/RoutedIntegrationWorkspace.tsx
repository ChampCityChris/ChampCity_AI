import { useEffect, useState } from "react";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import { CodexExecutionActions, CodexExecutionConsole } from "./WorkCardBuildingReviewWorkspace";

const statusLabels: Record<string, string> = {
  "not-ready": "Waiting for completion evidence", ready: "Ready to integrate", "candidate-validating": "Validating candidate",
  "repair-required": "Integration Repair required", "operator-decision-required": "Operator decision required",
  "integration-complete": "Integration complete", failed: "Integration needs attention",
};

export function RoutedIntegrationWorkspace({ intakeId }: { intakeId: string }): JSX.Element {
  const [model, setModel] = useState<RoutedWorkflowModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  useEffect(() => {
    let current = true;
    void window.champcity.runRoutedWorkflow(intakeId, "status").then((next) => { if (current) setModel(next); })
      .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Integration could not be loaded."); });
    return () => { current = false; };
  }, [intakeId]);
  useEffect(() => {
    if (model?.integrationRepairImplementer?.state !== "running" || busy) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void window.champcity.runRoutedWorkflow(intakeId, "status").then((next) => { if (current) setModel(next); })
        .catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Integration Repair status could not be loaded."); });
    }, 2000);
    return () => { current = false; window.clearTimeout(timer); };
  }, [intakeId, model, busy]);
  async function run(action: RoutedWorkflowAction, input: RoutedWorkflowInput = {}): Promise<void> {
    setBusy(true); setError("");
    try {
      const next = await window.champcity.runRoutedWorkflow(intakeId, action, {
        expectedFingerprint: model?.integration?.completionFingerprint,
        candidateId: model?.integration?.candidate?.candidateId,
        repairId: model?.repair?.repairId,
        ...input,
      });
      setModel(next);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Integration action failed."); }
    finally { setBusy(false); }
  }
  const available = (action: RoutedWorkflowAction) => Boolean(model?.actions.includes(action));
  const integration = model?.integration;
  const candidate = integration?.candidate;
  const research = integration?.completionKind === "research";
  const repair = model?.repair;
  const execution = model?.integrationRepairImplementer ?? null;
  return <section className="routed-integration-workspace" aria-label={research ? "Research completion integration" : "Plan integration"}>
    <header className="issue-resolution-header"><div><span>Work Intake · Integration</span>
      <h1>{research ? "Research Integration" : "Plan Integration"}</h1>
      <p>{research ? "Integrate accepted Research completion evidence." : "Integrate the completed Plan after Work Item close and acceptance."}</p></div></header>
    {error ? <p role="alert">{error}</p> : null}{model?.feedback ? <p role="status">{model.feedback}</p> : null}
    <section className="figma-document-card" aria-label="Integration candidate">
      <header className="figma-document-card-header"><strong>{statusLabels[integration?.status ?? "not-ready"]}</strong></header>
      <div className="figma-document-card-body"><dl>
        <div><dt>Target branch</dt><dd>{candidate?.targetBranch ?? model?.targetBranch ?? "Waiting"}</dd></div>
        <div><dt>Incoming Work Intake branch</dt><dd>{candidate?.incomingBranch ?? model?.workBranch ?? "Waiting"}</dd></div>
        <div><dt>Completion</dt><dd>{research ? "Research" : "Plan"}</dd></div>
      </dl>
        {integration?.reasons.map((reason) => <p role="status" key={reason}>{reason}</p>)}
        {model?.reasons.map((reason) => <p role="status" key={reason}>{reason}</p>)}
        <details><summary>Source checkpoints</summary>{integration?.checkpointCommits.length
          ? integration.checkpointCommits.map((commit) => <p key={commit}>{commit}</p>) : <p>No source checkpoints are recorded yet.</p>}</details>
      </div>
    </section>
    {candidate?.validation.length ? <section className="figma-document-card" aria-label="Required integration validation">
      <header className="figma-document-card-header"><strong>Required validation</strong></header>
      <div className="figma-document-card-body">{candidate.validation.map((check) => <p key={check.checkId}>
        {check.checkId}: {check.exitCode === 0 ? "Passed" : "Failed"} · {check.summary}</p>)}</div>
    </section> : null}
    <div className="figma-disposition-row" aria-label="Integration actions">
      <button type="button" onClick={() => void run("status")} disabled={busy}>Refresh Integration</button>
      {available("integrate") ? <button type="button" className="primary-action" disabled={busy} onClick={() => void run("integrate")}>
        {research ? "Integrate completed Research" : "Integrate completed Plan"}</button> : null}
      {available("retry-integration-validation") ? <button type="button" disabled={busy} onClick={() => void run("retry-integration-validation")}>Retry Validation</button> : null}
      {available("abort-integration") ? <button type="button" disabled={busy} onClick={() => void run("abort-integration")}>Abort Candidate</button> : null}
      {available("prepare-integration-repair") && repair?.status !== "prepared" ? <button type="button" disabled={busy} onClick={() => void run("prepare-integration-repair")}>Prepare Integration Repair</button> : null}
      {repair && integration?.status === "repair-required" ? <button type="button" className="primary-action"
        onClick={() => document.getElementById("integration-repair-execution")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        Continue to Integration Repair</button> : null}
    </div>
    {integration?.status === "operator-decision-required" ? <section className="figma-document-card" aria-label="Operator decision required">
      <div className="figma-document-card-body"><h2>Operator decision required</h2><p>{candidate?.message}</p>
        <p>Resolve the incompatible accepted intent before another integration attempt.</p></div></section> : null}
    {repair && integration?.status === "repair-required" ? <section id="integration-repair-execution" className="routed-integration-repair" aria-label="Integration Repair Implementer">
      <header><h2>Integration Repair</h2><p>{repair.message}</p><p>Attempt {repair.repairId}</p>
        <p>Editable source: {repair.policy.editablePaths.length} declared {repair.policy.editablePaths.length === 1 ? "file" : "files"}.</p></header>
      <CodexExecutionActions execution={execution} isActionRunning={busy} canRunOverride={available("run-integration-repair")}
        runLabel="Run Integration Repair" onRun={(selection) => void run("run-integration-repair", { selection })}
        onCancel={() => void run("cancel-integration-repair")} />
      <CodexExecutionConsole execution={execution} isActionRunning={busy}
        onRespondToCodexApproval={(requestId, decision) => void run("respond-integration-repair-approval", { approval: { requestId, decision } })}
        onRespondToCodexUserInput={(requestId, answers) => void run("respond-integration-repair-input", { userInput: { requestId, answers } })}
        onRespondToCodexMcpElicitation={(requestId, action, content) => void run("respond-integration-repair-elicitation", { elicitation: { requestId, action, content } })} />
      {available("integration-decision") ? <section className="figma-disposition-panel" aria-label="Incompatible intent decision">
        <header><span>Operator decision</span></header>
        <label>Incompatible accepted intent or architecture<textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></label>
        <button type="button" disabled={busy || !decisionReason.trim()} onClick={() => void run("integration-decision", { notes: decisionReason })}>Record required Operator decision</button>
      </section> : null}
      <details><summary>Repair scope and governing evidence</summary><p>{repair.policy.editablePaths.join(", ")}</p><pre>{repair.prompt}</pre></details>
    </section> : null}
  </section>;
}
