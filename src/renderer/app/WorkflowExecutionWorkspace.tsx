import { useEffect, useState } from "react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import type { WorkflowExecutionProjection, WorkItemValidationProjection } from "../../shared/workflowApplicationContracts";
import type { CodexImplementerExecutionModel, CodexTesterExecutionModel } from "../../shared/workspaceContracts";
import type { CodexManagedRuntimeStatus } from "../../shared/codexRuntimeContracts";
import type { IntegrationRepairAttempt, IntegrationRepairPatch } from "../../shared/integrationRepairContracts";

type Props = { workflow: WorkflowInstanceSummary; onReturn: () => void };

export function WorkflowExecutionWorkspace({ workflow, onReturn }: Props): JSX.Element {
  const [projection, setProjection] = useState<WorkflowExecutionProjection | null>(null);
  const [validation, setValidation] = useState<WorkItemValidationProjection | null>(null);
  const [runtime, setRuntime] = useState<CodexManagedRuntimeStatus | null>(null);
  const [implementer, setImplementer] = useState<CodexImplementerExecutionModel | null>(null);
  const [tester, setTester] = useState<CodexTesterExecutionModel | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [integration, setIntegration] = useState<Awaited<ReturnType<typeof window.champcity.getWorkflowIntegration>> | null>(null);
  const [repairAttempt, setRepairAttempt] = useState<IntegrationRepairAttempt | null>(null);
  const [repairPatches, setRepairPatches] = useState("[]");
  const [operatorRationale, setOperatorRationale] = useState("");

  const refresh = async () => {
    try {
      const [next, models] = await Promise.all([window.champcity.getWorkflowExecutionProjection(workflow.workflowId), window.champcity.getCodexManagedRuntimeStatus()]);
      setProjection(next); setRuntime(models);
      const selected = next.items.find(item => item.record.id === selectedId) ?? next.items.find(item => !["closed", "cancelled"].includes(item.record.body.workState)) ?? next.items[0];
      setSelectedId(selected?.record.id ?? "");
      if (selected) {
        const last = selected.implementationAttempts.at(-1);
        setValidation(await window.champcity.getWorkItemValidation(workflow.workflowId, selected.record.id));
        setImplementer(await window.champcity.getWorkflowWorkItemCodexExecutionStatus(workflow.workflowId, selected.record.id));
        if (last) setTester(await window.champcity.getWorkflowWorkItemTesterStatus(workflow.workflowId, selected.record.id, last.id));
        else setTester(null);
      }
      if (["execution-complete", "integration-ready"].includes(next.plan.workflow.body.currentWorkspace)) {
        try { setIntegration(await window.champcity.getWorkflowIntegration(workflow.workflowId)); } catch { setIntegration(null); }
      }
      setError("");
    } catch (reason) {
      try {
        const current = await window.champcity.getWorkflow(workflow.workflowId);
        if (current.workflow.lifecycleState === "closed" || current.workflow.workflowState === "closed") {
          setProjection(null); setError(""); setFeedback("Workflow is integrated and closed. Its final state is available from the Workflows Hub."); return;
        }
      } catch { /* Keep the original exact Workflow service error visible. */ }
      setError(String(reason));
    }
  };
  useEffect(() => { void refresh(); }, [workflow.workflowId]);
  useEffect(() => {
    if (implementer?.state !== "running" && tester?.state !== "running") return;
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [implementer?.state, tester?.state, selectedId, workflow.workflowId]);

  const item = projection?.items.find(candidate => candidate.record.id === selectedId);
  const latest = item?.implementationAttempts.at(-1);
  const selectedModel = runtime?.selection ?? (runtime?.catalog[0] ? { model: runtime.catalog[0].model, reasoningEffort: runtime.catalog[0].defaultReasoningEffort } : null);
  const act = async (operation: () => Promise<unknown>, message: string) => {
    try { await operation(); setFeedback(message); setError(""); await refresh(); } catch (reason) { setError(String(reason)); }
  };
  const runValidation = async (criterionId: string, policy: string) => act(async () => {
    if (policy === "semantic_ai") {
      if (!selectedModel) throw Error("Choose an available Validator model first.");
      return window.champcity.validateSemanticWorkflowCriterion(workflow.workflowId, selectedId, criterionId, selectedModel);
    }
    return window.champcity.validateDeterministicWorkflowCriterion(workflow.workflowId, selectedId, criterionId);
  }, "Validator result saved to the exact Workflow.");
  const refreshCompletion = async () => act(async () => {
    const completion = await window.champcity.getWorkflowExecutionCompletion(workflow.workflowId);
    if (!completion.eligible) throw Error(`Workflow completion is blocked: ${completion.blockers.join(", ")}`);
    return window.champcity.completeWorkflowExecution(workflow.workflowId, completion.workflowVersion);
  }, "Workflow execution completed.");

  return <section className="workflow-instance-workspace workflow-execution-workspace" aria-labelledby="workspace-heading">
    <header className="workflow-instance-shell-header"><div><p>{workflow.workflowType === "issue-resolution" ? "Issue Resolution" : "Feature / Capability"} · Shared Execution Workspace</p><h1 id="workspace-heading">{workflow.title}</h1></div>
      <button type="button" className="workflow-instance-back" onClick={onReturn}>Back to Workflows</button></header>
    <p>Exact Workflow <code>{workflow.workflowId}</code> · stage: {projection?.plan.workflow.body.currentWorkspace ?? "Loading"}</p>
    {error && <p role="alert">{error}</p>}{feedback && <p role="status">{feedback}</p>}
    {!projection && !error && <p role="status">Loading exact Workflow execution state…</p>}
    <h2>Work Item Map and readiness</h2>
    {projection && <>
      <section aria-label="Source and Work Item Map">
        <p>Source: <strong>{projection.source.state === "non-source" ? "Source-neutral" : "Source-backed"}</strong>
          {projection.source.baselineId && <> · baseline <code>{projection.source.baselineId}</code></>}
          {projection.source.currentRevisionId && <> · current revision <code>{projection.source.currentRevisionId}</code></>}
          {projection.source.workSourceLineId && <> · checkout line <code>{projection.source.workSourceLineId}</code></>}
          {projection.source.repositoryCheckoutId && <> · checkout <code>{projection.source.repositoryCheckoutId}</code></>}
        </p>
        {projection.source.state === "unprepared" && <p>Source checkout is prepared on the first exact Implementer run.</p>}
        {projection.items.length === 0 ? <p role="status">No accepted Work Items are available for this Workflow.</p> : <ol>{projection.items.map(entry => <li key={entry.record.id}>
          <button type="button" onClick={() => { setSelectedId(entry.record.id); setValidation(null); setImplementer(null); setTester(null); void Promise.all([
            window.champcity.getWorkItemValidation(workflow.workflowId, entry.record.id), window.champcity.getWorkflowWorkItemCodexExecutionStatus(workflow.workflowId, entry.record.id),
          ]).then(([nextValidation, nextImplementer]) => { setValidation(nextValidation); setImplementer(nextImplementer); const implementation = entry.implementationAttempts.at(-1); return implementation
            ? window.champcity.getWorkflowWorkItemTesterStatus(workflow.workflowId, entry.record.id, implementation.id).then(setTester) : undefined; }).catch(reason => setError(String(reason))); }}>{entry.record.body.title}</button> — {entry.record.body.workState} · {entry.eligibility.eligible ? "ready" : entry.eligibility.blockers.join(", ")}
          <small> · exact WorkItem <code>{entry.record.id}</code></small>
        </li>)}</ol>}
      </section>
      {item && <section aria-label="Exact Work Item execution"><h2>{item.record.body.title}</h2><p>{item.record.body.objective}</p><p>WorkItem <code>{item.record.id}</code> · {item.record.body.workState} · contract from accepted plan</p>
        <details><summary>Execution contract</summary><p>Scope in: {projection.plan.solutions[0]?.body.scopeIn.join("; ")}</p><p>Scope out: {projection.plan.solutions[0]?.body.scopeOut.join("; ")}</p><p>Constraints: {projection.plan.solutions[0]?.body.constraints.join("; ")}</p><p>Contract digest is generated from exact Workflow, WorkItem, accepted solution, phase, dependencies, Criteria, and source revision when execution starts.</p></details>
        <h3>Implementer</h3><p>{latest ? `Implementation ${latest.id}: ${latest.body.outcome} · ${latest.body.summary}` : "No implementation attempt yet."}{implementer?.executionContractDigest && <> · contract <code>{implementer.executionContractDigest}</code></>}</p>
        {runtime?.catalog.length ? <label>Codex model <select value={selectedModel?.model ?? ""} onChange={async event => {
          const entry = runtime.catalog.find(candidate => candidate.model === event.target.value); if (!entry) return;
          try { setRuntime(await window.champcity.setCodexModelSelection({ model: entry.model, reasoningEffort: entry.defaultReasoningEffort })); } catch (reason) { setError(String(reason)); }
        }}>{runtime.catalog.map(entry => <option key={entry.model} value={entry.model}>{entry.displayName}</option>)}</select>
          <select aria-label="Reasoning effort" value={selectedModel?.reasoningEffort ?? ""} onChange={async event => {
            if (!selectedModel) return; try { setRuntime(await window.champcity.setCodexModelSelection({ ...selectedModel, reasoningEffort: event.target.value })); } catch (reason) { setError(String(reason)); }
          }}>{(runtime.catalog.find(entry => entry.model === selectedModel?.model)?.supportedReasoningEfforts ?? []).map(effort => <option key={effort} value={effort}>{effort}</option>)}</select></label> : <p role="status">Codex model catalog is unavailable.</p>}
        {item.eligibility.eligible && ["planned", "ready"].includes(item.record.body.workState) && <button disabled={!selectedModel || runtime?.busy} onClick={() => selectedModel && void act(() => window.champcity.startWorkflowWorkItemCodexExecution(workflow.workflowId, item.record.id, selectedModel), "Implementer run started.")}>Run Implementer</button>}
        {runtime?.selectionBlocker && <p role="status">{runtime.selectionBlocker}</p>}
        <h3>Tester</h3><p>{tester?.testerResultId ? `TesterResult ${tester.testerResultId} · checkpoint ${tester.checkpointState}` : tester?.failureReason ?? "Tester has not completed for the latest implementation."}</p>
        {latest?.body.outcome === "implemented" && selectedModel && <button disabled={tester?.state === "running"} onClick={() => void act(() => window.champcity.startWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id, selectedModel), "Tester run started.")}>Run Tester</button>}
        {validation && <><h3>Validator</h3><p>{validation.sourceMode} · {validation.completion.eligible ? "completion eligible" : validation.completion.blockers.join(", ")}</p><ul>{validation.criteria.map(entry => <li key={entry.criterion.id}>
          {entry.criterion.body.statement} — {entry.outcome} · {entry.policy === "semantic_ai" ? "semantic Validator" : entry.policy === "deterministic" ? "deterministic Validator" : entry.policy === "deferred_visual_phase" ? "human visual evidence at Phase close" : "human Operator decision"}{entry.reason ? ` (${entry.reason})` : ""}
          {entry.outcome === "pending" && entry.policy !== "operator_decision" && entry.policy !== "deferred_visual_phase" && <button onClick={() => void runValidation(entry.criterion.id, entry.policy)}>Validate</button>}
          {entry.outcome === "fail" && entry.validationIds[0] && <button onClick={() => void act(() => window.champcity.createWorkflowRepair(workflow.workflowId, item.record.id, entry.validationIds.at(-1)!), "Canonical Repair WorkItem created.")}>Create Repair</button>}
        </li>)}</ul></>}
        {item.record.body.workState === "validation_pending" && <button disabled={!validation?.completion.eligible} onClick={() => void act(() => window.champcity.completeWorkflowWorkItem(workflow.workflowId, item.record.id, item.record.recordVersion), "WorkItem completed.")}>Complete Work Item</button>}
        {item.phaseId && <p>Phase <code>{item.phaseId}</code>{projection.plan.phases.find(phase => phase.phaseId === item.phaseId)?.record.body.phaseState !== "closed" &&
          (projection.plan.workItemsByPhase[item.phaseId] ?? []).every(phaseItem => phaseItem.body.workState === "closed") && <button onClick={() => { const phase = projection.plan.phases.find(candidate => candidate.phaseId === item.phaseId)?.record; if (phase) void act(() => window.champcity.completeWorkflowPhase(workflow.workflowId, phase.id, phase.recordVersion), "Phase completed."); }}>Complete Phase</button>}</p>}
      </section>}
      {projection.items.every(entry => entry.record.body.workState === "closed") && <section aria-label="Workflow completion and integration"><h2>Workflow completion and integration</h2><button onClick={() => void refreshCompletion()}>Complete Workflow execution</button>
        {integration && <><p>Integration candidates: {integration.candidates.map(candidate => `${candidate.candidateId} · ${candidate.status}${candidate.conflictingPaths.length ? ` · conflicts: ${candidate.conflictingPaths.join(", ")}` : ""}`).join("; ") || "none"}</p>
          <button onClick={() => void act(() => window.champcity.integrateWorkflow(workflow.workflowId), "Workflow integration was advanced.")}>Create / resume integration</button>
          {integration.candidates.filter(candidate => ["conflicted", "validation-failed", "operator-decision"].includes(candidate.status)).map(candidate => <div key={candidate.candidateId}>
            <button onClick={async () => { try { setRepairAttempt(await window.champcity.prepareWorkflowIntegrationRepair(workflow.workflowId, candidate.candidateId)); setError(""); } catch (reason) { setError(String(reason)); } }}>Prepare Integration Repair for {candidate.candidateId}</button>
            <ul>{candidate.validation.map((proof, index) => <li key={`${proof.checkId}-${index}`}>{proof.checkId}: {proof.summary}</li>)}</ul>
          </div>)}
        </>}
        {repairAttempt && <section aria-label="Integration Repair"><h3>Integration Repair {repairAttempt.repairId}</h3><p>{repairAttempt.status}: {repairAttempt.message}</p>
          <p>Editable paths: {repairAttempt.policy.editablePaths.join(", ")}</p><pre>{repairAttempt.prompt}</pre>
          <label>Bounded repair patches as JSON<textarea value={repairPatches} onChange={event => setRepairPatches(event.target.value)} /></label>
          <button onClick={async () => { try { const patches = JSON.parse(repairPatches) as IntegrationRepairPatch[]; setRepairAttempt(await window.champcity.applyWorkflowIntegrationRepair(workflow.workflowId, repairAttempt.candidateId, repairAttempt.repairId, patches)); setError(""); } catch (reason) { setError(String(reason)); } }}>Apply Repair patches</button>
          {repairAttempt.status === "validated" && <button onClick={() => void act(() => window.champcity.completeWorkflowIntegrationRepair(workflow.workflowId, repairAttempt.candidateId, repairAttempt.repairId), "Integration Repair completed.")}>Complete Integration Repair</button>}
          {repairAttempt.status === "operator-decision" && <><label>Operator decision rationale<textarea value={operatorRationale} onChange={event => setOperatorRationale(event.target.value)} /></label>
            <button disabled={!operatorRationale.trim()} onClick={() => void act(() => window.champcity.requestWorkflowIntegrationDecision(workflow.workflowId, repairAttempt.candidateId, repairAttempt.repairId, operatorRationale), "Operator decision recorded for this candidate.")}>Record declared Operator decision</button></>}
        </section>}
      </section>}
    </>}
  </section>;
}
