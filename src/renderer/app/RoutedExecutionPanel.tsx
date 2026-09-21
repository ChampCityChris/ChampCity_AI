import { useEffect, useState } from "react";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import type { RoutedAcceptanceProjection } from "../../shared/routedDevelopmentExecutionContracts";
import type { ExecutionCriterionEvidence } from "../../shared/planExecutionContracts";
import { workRouteProfileRegistry, type WorkRouteId } from "../../shared/workIntakeRoutingContracts";
import { CodexExecutionActions, CodexExecutionConsole, DevelopmentEnvironmentStatus } from "./WorkCardBuildingReviewWorkspace";

export function RoutedExecutionPanel({ intakeId }: { intakeId: string }) {
  const [model, setModel] = useState<RoutedWorkflowModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [patch, setPatch] = useState("");
  useEffect(() => {
    let alive = true;
    void window.champcity.runRoutedWorkflow(intakeId, "status").then((next) => { if (alive) setModel(next); }).catch((failure: unknown) => { if (alive) setError(String(failure)); });
    return () => { alive = false; };
  }, [intakeId]);
  useEffect(() => {
    if (model?.implementer?.state !== "running" || busy) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      void window.champcity.runRoutedWorkflow(intakeId, "status").then((next) => { if (alive) setModel(next); }).catch((failure: unknown) => { if (alive) setError(String(failure)); });
    }, 2000);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [intakeId, model, busy]);
  async function act(action: RoutedWorkflowAction, input: RoutedWorkflowInput = {}) {
    setBusy(true); setError("");
    try {
      setModel(await window.champcity.runRoutedWorkflow(intakeId, action, { expectedFingerprint: model?.execution?.fingerprint,
        workItemId: model?.current?.workItemId, candidateId: model?.integration?.candidate?.candidateId, repairId: model?.repair?.repairId, notes, ...input }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Workflow action failed."); }
    finally { setBusy(false); }
  }
  const available = (action: RoutedWorkflowAction) => Boolean(model?.actions.includes(action));
  const button = (action: RoutedWorkflowAction, label: string, input?: RoutedWorkflowInput) => available(action)
    ? <button type="button" disabled={busy} onClick={() => void act(action, input)}>{label}</button> : null;
  const current = model?.current;
  return <section className="routed-execution-panel" aria-label="Approved Plan execution" aria-busy={busy}>
    <h3>Plan execution</h3>
    {error ? <p role="alert">{error}</p> : null}
    {model?.feedback ? <p role="status">{model.feedback}</p> : null}
    {busy ? <p role="status">Updating workflow…</p> : null}
    <button type="button" disabled={busy} onClick={() => void act("status")}>Refresh execution</button>
    {model ? <>
      <p>Route: {workRouteProfileRegistry[model.route as WorkRouteId]?.label ?? model.route}</p>
      <p>Work branch: {model.workBranch} · Integration target: {model.targetBranch}</p>
      {model.planPath ? <p>Plan: {model.planPath}</p> : null}
      {model.reasons.map((message) => <p key={message} role="status">{message}</p>)}
      {button("activate", "Begin approved Plan")}
      {model.execution ? <>
        <p>{model.execution.planId} · {model.execution.topology} · {model.execution.status}</p>
        <ol>{model.execution.workItems.map((item) => <li key={item.candidate.workItemId}>
          <strong>{item.candidate.workItemId}: {item.candidate.title}</strong> — {item.stage}
          {item.candidate.phaseId ? ` · Phase ${item.candidate.phaseId}` : ""}
          {item.reasons.length ? <p>{item.reasons.join(" ")}</p> : null}
          {item.evidencePaths.length ? <details><summary>Work Item evidence</summary>{item.evidencePaths.map((entry) => <p key={entry}>{entry}</p>)}</details> : null}
        </li>)}</ol>
      </> : null}
      {current ? <section aria-label="Current Work Item">
        <h4>{current.implementationId}{current.phaseId ? ` · Phase ${current.phaseId}` : ""}</h4>
        {button("begin", "Begin Work Item")}
        {button("prepare", "Prepare and copy Work Card handoff")}
        {button("check-draft", "Check submitted Work Card")}
        {current.contract ? <details open><summary>Work Card · {current.contract.disposition} · revision {current.contract.revision}</summary><p>{current.contract.path}</p><pre>{current.contract.body}</pre></details> : null}
        <label>Review notes or Repair defect<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {button("review-contract", "Approve Work Card", { disposition: "Approved", expectedRevision: current.contract?.revision })}
        {button("review-contract", "Request Work Card revision", { disposition: "RevisionRequested", expectedRevision: current.contract?.revision })}
        {button("review-contract", "Reject Work Card", { disposition: "Rejected", expectedRevision: current.contract?.revision })}
        {model.implementer ? <>
          <DevelopmentEnvironmentStatus execution={model.implementer} />
          <CodexExecutionActions execution={model.implementer} isActionRunning={busy} canRunOverride={available("implement")}
            onRun={(selection) => void act("implement", { selection })} onCancel={() => void act("cancel")}
            onResolveEnvironment={available("resolve-environment") ? () => void act("resolve-environment") : undefined} />
          <CodexExecutionConsole execution={model.implementer} isActionRunning={busy}
            onRespondToCodexApproval={(requestId, decision) => void act("respond-approval", { approval: { requestId, decision } })}
            onRespondToCodexUserInput={(requestId, answers) => void act("respond-input", { userInput: { requestId, answers } })}
            onRespondToCodexMcpElicitation={(requestId, action, content) => void act("respond-elicitation", { elicitation: { requestId, action, content } })} />
          {model.implementer.checkpoint ? <p>Source checkpoint: {model.implementer.checkpoint.status} · {model.implementer.checkpoint.message} {model.implementer.checkpoint.commit}</p> : null}
        </> : null}
        {current.report ? <details open><summary>Implementer Report · {current.report.disposition}</summary><p>{current.report.path}</p><pre>{current.report.body}</pre></details> : null}
        {button("review-report", "Approve report", { disposition: "Approved", expectedRevision: current.report?.revision })}
        {button("review-report", "Request report Repair", { disposition: "RevisionRequested", expectedRevision: current.report?.revision })}
        {button("advisory-review", "Copy advisory review handoff")}
        {button("validate", "Record validation passed", { validation: "ValidatePassed" })}
        {button("validate", "Request validation Repair", { validation: "RequestRepair" })}
        {button("create-repair", "Create bounded Repair")}
        {button("close", "Close Work Item")}
      </section> : null}
      {model.execution?.acceptance.map((boundary) => <AcceptancePanel key={`${boundary.relativePath}:${boundary.artifactRevision ?? 0}:${boundary.disposition ?? ""}`}
        boundary={boundary} fingerprint={model.execution!.fingerprint} busy={busy} onAction={act} />)}
      {model.integration ? <section aria-label="Integration">
        <h4>Integration: {model.integration.status}</h4>
        {model.integration.reasons.map((message) => <p key={message}>{message}</p>)}
        {model.integration.checkpointCommits.length ? <details><summary>Source checkpoints</summary>{model.integration.checkpointCommits.map((commit) => <p key={commit}>{commit}</p>)}</details> : null}
        {model.integration.candidate?.validation.map((check) => <p key={check.checkId}>{check.checkId}: {check.exitCode === 0 ? "Passed" : "Failed"} — {check.summary}</p>)}
        {button("integrate", "Integrate completed Plan")}
        {button("prepare-integration-repair", "Prepare and copy Integration Repair handoff")}
        {model.repair ? <>
          <p>{model.repair.repairId}: {model.repair.status} · {model.repair.message}</p>
          <details><summary>Integration Repair scope and evidence</summary><pre>{model.repair.prompt}</pre></details>
          {available("apply-integration-repair") ? <>
            <label>Integration Repair patch response<textarea value={patch} onChange={(event) => setPatch(event.target.value)} placeholder="Paste the bounded JSON patch array returned by the Implementer." /></label>
            <button type="button" disabled={busy || !patch.trim()} onClick={() => {
              try { const patches: unknown = JSON.parse(patch); if (!Array.isArray(patches)) throw Error("The patch response must be an array."); void act("apply-integration-repair", { patches }); }
              catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid patch response."); }
            }}>Apply source patch</button>
          </> : null}
          {button("complete-integration-repair", "Validate repaired candidate and integrate")}
          {available("integration-decision") ? <label>Incompatible accepted intent or architecture<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label> : null}
          {button("integration-decision", "Record required Operator decision")}
        </> : null}
        {button("retry-integration-validation", "Retry candidate validation")}
        {button("abort-integration", "Abort retained integration candidate")}
      </section> : null}
    </> : <p role="status">Loading execution…</p>}
  </section>;
}

function AcceptancePanel({ boundary, fingerprint, busy, onAction }: { boundary: RoutedAcceptanceProjection; fingerprint: string; busy: boolean;
  onAction: (action: RoutedWorkflowAction, input: RoutedWorkflowInput) => Promise<void> }) {
  const [rationale, setRationale] = useState("");
  const [criteria, setCriteria] = useState<ExecutionCriterionEvidence[]>(() => boundary.acceptanceCriteria.map((criterion) => boundary.criteria.find((entry) => entry.criterion === criterion) ?? { criterion, status: "pending", evidencePaths: [] }));
  const label = boundary.boundary.kind === "phase" ? `Phase ${boundary.boundary.phaseId}` : "Plan";
  return <section aria-label={`${label} acceptance`}>
    <h4>{label} acceptance · {boundary.disposition ?? "Not recorded"}</h4>
    {boundary.reasons.map((message) => <p key={message}>{message}</p>)}
    {boundary.eligible ? <>
      {criteria.map((criterion, index) => <div key={criterion.criterion}>
        <label>{criterion.criterion}<select disabled={busy} value={criterion.status} onChange={(event) => setCriteria((current) => current.map((entry, i) => i === index ? { ...entry, status: event.target.value as ExecutionCriterionEvidence["status"] } : entry))}>
          <option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option>
        </select></label>
        <label>Evidence paths (one repository-relative path per line)<textarea value={criterion.evidencePaths.join("\n")} onChange={(event) => setCriteria((current) => current.map((entry, i) => i === index ? { ...entry, evidencePaths: event.target.value.split("\n") } : entry))} /></label>
      </div>)}
      <label>Acceptance rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
      <button type="button" disabled={busy || !rationale.trim()} onClick={() => void onAction("save-acceptance", { acceptance: { boundary: boundary.boundary, expectedFingerprint: fingerprint, closureDecision: "Close", rationale,
        criteria: criteria.map((entry) => ({ ...entry, evidencePaths: entry.evidencePaths.map((value) => value.trim()).filter(Boolean) })) } })}>Save {label} acceptance evidence</button>
      {boundary.artifactRevision ? <>
        <button type="button" disabled={busy || !boundary.fresh} onClick={() => void onAction("review-acceptance", { acceptanceReview: { boundary: boundary.boundary, expectedFingerprint: fingerprint, expectedRevision: boundary.artifactRevision!, disposition: "Approved", notes: rationale } })}>Approve {label} acceptance</button>
        <button type="button" disabled={busy || !boundary.fresh || !rationale.trim()} onClick={() => void onAction("review-acceptance", { acceptanceReview: { boundary: boundary.boundary, expectedFingerprint: fingerprint, expectedRevision: boundary.artifactRevision!, disposition: "RevisionRequested", notes: rationale } })}>Request acceptance revision</button>
      </> : null}
    </> : null}
  </section>;
}
