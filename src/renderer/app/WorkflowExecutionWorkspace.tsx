import {WorkItemPlanningWorkspace} from "./WorkItemPlanningWorkspace";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import type { PhaseValidationProjection, WorkflowExecutionProjection, WorkItemValidationProjection } from "../../shared/workflowApplicationContracts";
import type { CodexImplementerExecutionModel, CodexTesterExecutionModel } from "../../shared/workspaceContracts";
import type { CodexManagedRuntimeStatus } from "../../shared/codexRuntimeContracts";
import type { IntegrationRepairAttempt, IntegrationRepairPatch } from "../../shared/integrationRepairContracts";
import type { WorkflowCheckpointRecoveryProjection } from "../../shared/workflowApplicationContracts";
import { CodexBoundedMcpElicitationPanel, CodexBoundedUserInputPanel } from "./CodexBoundedInteractionPanels";

type Props = { workflow: WorkflowInstanceSummary; onReturn: () => void; browserPanel: ReactNode };

export function WorkflowExecutionWorkspace({ workflow, onReturn, browserPanel }: Props): JSX.Element {
  const [projection, setProjection] = useState<WorkflowExecutionProjection | null>(null);
  const [validation, setValidation] = useState<WorkItemValidationProjection | null>(null);
  const [runtime, setRuntime] = useState<CodexManagedRuntimeStatus | null>(null);
  const [implementer, setImplementer] = useState<CodexImplementerExecutionModel | null>(null);
  const [tester, setTester] = useState<CodexTesterExecutionModel | null>(null);
  const [checkpointRecovery, setCheckpointRecovery] = useState<WorkflowCheckpointRecoveryProjection | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [integration, setIntegration] = useState<Awaited<ReturnType<typeof window.champcity.getWorkflowIntegration>> | null>(null);
  const [repairAttempt, setRepairAttempt] = useState<IntegrationRepairAttempt | null>(null);
  const [repairPatches, setRepairPatches] = useState("[]");
  const [operatorRationale, setOperatorRationale] = useState("");
  const [humanSummary, setHumanSummary] = useState("");
  const [humanVisualOutcome, setHumanVisualOutcome] = useState<"pass" | "fail" | "inconclusive">("pass");
  const [criterionDecisionOutcome, setCriterionDecisionOutcome] = useState<"approved" | "rejected">("approved");
  const [phaseValidation, setPhaseValidation] = useState<Record<string, PhaseValidationProjection>>({});

  const refresh = async (preserveOperationFeedback = false, preserveRuntimeRole?: "implementer" | "tester") => {
    try {
      const [next, models] = await Promise.all([window.champcity.getWorkflowExecutionProjection(workflow.workflowId), window.champcity.getCodexManagedRuntimeStatus()]);
      setProjection(next); setRuntime(models);
      const phaseEntries = await Promise.all(next.plan.phases.map(async phase => {
        try { return [phase.phaseId, await window.champcity.getWorkflowPhaseValidation(workflow.workflowId, phase.phaseId)] as const; }
        catch { return null; }
      }));
      setPhaseValidation(Object.fromEntries(phaseEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)));
      const selected = next.items.find(item => item.record.id === selectedId) ?? next.items.find(item => !["closed", "cancelled"].includes(item.record.body.workState)) ?? next.items[0];
      setSelectedId(selected?.record.id ?? "");
      if (selected) {
        const last = selected.implementationAttempts.at(-1);
        setValidation(await window.champcity.getWorkItemValidation(workflow.workflowId, selected.record.id));
        setCheckpointRecovery(await window.champcity.getWorkflowCheckpointRecovery(workflow.workflowId, selected.record.id));
        if (preserveRuntimeRole !== "implementer") setImplementer(await window.champcity.getWorkflowWorkItemCodexExecutionStatus(workflow.workflowId, selected.record.id));
        if (last) { if (preserveRuntimeRole !== "tester") setTester(await window.champcity.getWorkflowWorkItemTesterStatus(workflow.workflowId, selected.record.id, last.id)); }
        else if (preserveRuntimeRole !== "tester") setTester(null);
      }
      if (["execution-complete", "integration-ready"].includes(next.plan.workflow.body.currentWorkspace)) {
        try { setIntegration(await window.champcity.getWorkflowIntegration(workflow.workflowId)); } catch { setIntegration(null); }
      }
      if (!preserveOperationFeedback) setError("");
    } catch (reason) {
      try {
        const current = await window.champcity.getWorkflow(workflow.workflowId);
        if (current.workflow.lifecycleState === "closed" || current.workflow.workflowState === "closed") {
          setProjection(null); setError(""); setFeedback("Workflow is integrated and closed. Its final state is available from the Workflows Hub."); return;
        }
      } catch { /* Keep the original exact Workflow service error visible. */ }
      if (!preserveOperationFeedback) setError(String(reason));
    }
  };
  useEffect(() => { void refresh(); }, [workflow.workflowId]);
  useEffect(() => {
    if (implementer?.state !== "running" && tester?.state !== "running" && !implementer?.pendingApproval && !implementer?.pendingUserInput && !implementer?.pendingMcpElicitation && !tester?.pendingApproval && !tester?.pendingUserInput) return;
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [implementer?.state, tester?.state, selectedId, workflow.workflowId]);

  const item = projection?.items.find(candidate => candidate.record.id === selectedId);
  const latest = item?.implementationAttempts.at(-1);
  const selectedModel = runtime?.selection ?? (runtime?.catalog[0] ? { model: runtime.catalog[0].model, reasoningEffort: runtime.catalog[0].defaultReasoningEffort } : null);
  const act = async (operation: () => Promise<unknown>, message: string, role?: "implementer" | "tester") => {
    try { const result = await operation();
      if (result && typeof result === "object" && "state" in result && (result.state === "unavailable" || result.state === "failed" || ("failureReason" in result && result.failureReason))) {
        if (role === "tester") setTester(result as CodexTesterExecutionModel);
        else if (role === "implementer") setImplementer(result as CodexImplementerExecutionModel);
        setFeedback(""); setError(String("failureReason" in result ? result.failureReason : "Execution could not start.")); await refresh(true, role); return;
      }
      if (role === "tester") setTester(result as CodexTesterExecutionModel);
      else if (role === "implementer") setImplementer(result as CodexImplementerExecutionModel);
      setFeedback(message); setError(""); await refresh(Boolean(role), role);
    } catch (reason) { setError(String(reason)); }
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
        {["planned", "ready"].includes(item.record.body.workState) && <WorkItemPlanningWorkspace workflowId={workflow.workflowId} workItemId={item.record.id} browserPanel={null} onChanged={refresh} />}
        <details><summary>Execution contract</summary><p>Scope in: {projection.plan.solutions[0]?.body.scopeIn.join("; ")}</p><p>Scope out: {projection.plan.solutions[0]?.body.scopeOut.join("; ")}</p><p>Constraints: {projection.plan.solutions[0]?.body.constraints.join("; ")}</p><p>Contract digest is generated from exact Workflow, WorkItem, accepted solution, phase, dependencies, Criteria, and source revision when execution starts.</p></details>
        <h3>Implementer</h3><p>{latest ? `Implementation ${latest.id}: ${latest.body.outcome} · ${latest.body.summary}` : "No implementation attempt yet."}{implementer?.executionContractDigest && <> · contract <code>{implementer.executionContractDigest}</code></>}</p>
        {runtime?.catalog.length ? <label>Codex model <select value={selectedModel?.model ?? ""} onChange={async event => {
          const entry = runtime.catalog.find(candidate => candidate.model === event.target.value); if (!entry) return;
          try { setRuntime(await window.champcity.setCodexModelSelection({ model: entry.model, reasoningEffort: entry.defaultReasoningEffort })); } catch (reason) { setError(String(reason)); }
        }}>{runtime.catalog.map(entry => <option key={entry.model} value={entry.model}>{entry.displayName}</option>)}</select>
          <select aria-label="Reasoning effort" value={selectedModel?.reasoningEffort ?? ""} onChange={async event => {
            if (!selectedModel) return; try { setRuntime(await window.champcity.setCodexModelSelection({ ...selectedModel, reasoningEffort: event.target.value })); } catch (reason) { setError(String(reason)); }
          }}>{(runtime.catalog.find(entry => entry.model === selectedModel?.model)?.supportedReasoningEfforts ?? []).map(effort => <option key={effort} value={effort}>{effort}</option>)}</select></label> : <p role="status">Codex model catalog is unavailable.</p>}
        {item.eligibility.eligible && item.record.body.implementationBoundaries?.length && ["planned", "ready"].includes(item.record.body.workState) && <button disabled={!selectedModel || implementer?.state === "running" || tester?.state === "running"} onClick={() => selectedModel && void act(() => window.champcity.startWorkflowWorkItemCodexExecution(workflow.workflowId, item.record.id, selectedModel), "Implementer run started.", "implementer")}>Run Implementer</button>}
        {implementer && <section aria-label="Implementer runtime status"><p>Exact Implementer state: {implementer.state}{implementer.failureReason ? ` · ${implementer.failureReason}` : ""}</p>{implementer.pendingApproval ? <p>Pending interaction: approval</p> : implementer.pendingUserInput ? <p>Pending interaction: user input</p> : implementer.pendingMcpElicitation ? <p>Pending interaction: MCP elicitation</p> : null}{implementer.eventTail.length > 0 && <details><summary>Recent Implementer events</summary><ul>{implementer.eventTail.slice(-8).map((entry, index) => <li key={index}>{entry}</li>)}</ul></details>}</section>}
        {runtime?.selectionBlocker && <p role="status">{runtime.selectionBlocker}</p>}
        {implementer?.pendingApproval && <section aria-label="Implementer approval request"><h4>Implementer approval</h4><p>{implementer.pendingApproval.impactSummary}</p>
          {implementer.pendingApproval.commandDisplay && <pre>{implementer.pendingApproval.commandDisplay}</pre>}{implementer.pendingApproval.fileChangeSummary && <p>{implementer.pendingApproval.fileChangeSummary}</p>}
          {implementer.pendingApproval.permissionSummary && <p>{implementer.pendingApproval.permissionSummary}</p>}
          <button onClick={() => void act(() => window.champcity.respondToCodexApproval({ requestId: implementer.pendingApproval!.requestId, decision: "approve", workflowId: workflow.workflowId, workItemId: item.record.id }), "Implementer approval answered.", "implementer")}>Approve exact request</button>
          <button onClick={() => void act(() => window.champcity.respondToCodexApproval({ requestId: implementer.pendingApproval!.requestId, decision: "deny", workflowId: workflow.workflowId, workItemId: item.record.id }), "Implementer request denied.", "implementer")}>Deny exact request</button></section>}
        {implementer?.pendingUserInput && <CodexBoundedUserInputPanel label="Implementer" pending={implementer.pendingUserInput} onSubmit={(requestId, answers) => void act(() => window.champcity.respondToCodexUserInput({ requestId, answers, workflowId: workflow.workflowId, workItemId: item.record.id }), "Implementer input sent to the exact session.", "implementer")} />}
        {implementer?.pendingMcpElicitation && <CodexBoundedMcpElicitationPanel pending={implementer.pendingMcpElicitation} onSubmit={(requestId, action, content) => void act(() => window.champcity.respondToCodexMcpElicitation({ requestId, action, content, workflowId: workflow.workflowId, workItemId: item.record.id }), action === "accept" ? "MCP elicitation answered." : `MCP elicitation ${action}ed.`, "implementer")} />}
        {implementer?.state === "running" && <button onClick={() => void act(() => window.champcity.cancelCodexImplementerExecution({ workflowId: workflow.workflowId, workItemId: item.record.id }), "Exact Implementer session cancelled.", "implementer")}>Cancel Implementer</button>}
        <h3>Tester</h3><p>{tester?.testerResultId ? `TesterResult ${tester.testerResultId} · checkpoint ${tester.checkpointState}` : tester?.failureReason ?? "Tester has not completed for the latest implementation."}</p>
        {tester && <section aria-label="Tester runtime status"><p>Exact Tester state: {tester.state}{tester.failureReason ? ` · ${tester.failureReason}` : ""}</p>{tester.pendingApproval ? <p>Pending interaction: approval</p> : tester.pendingUserInput ? <p>Pending interaction: user input</p> : null}{tester.eventTail.length > 0 && <details><summary>Recent Tester events</summary><ul>{tester.eventTail.slice(-8).map((entry, index) => <li key={index}>{entry}</li>)}</ul></details>}</section>}
        {checkpointRecovery && checkpointRecovery.sourceMode === "source-backed" && <section aria-label="Source Checkpoint Recovery"><h3>Source Checkpoint Recovery</h3>
          <p>Implementation checkpoint: {checkpointRecovery.implementation.state}{checkpointRecovery.implementation.implementationRecordId ? <> · ImplementationRecord <code>{checkpointRecovery.implementation.implementationRecordId}</code></> : null}{checkpointRecovery.implementation.checkpointId ? <> · checkpoint <code>{checkpointRecovery.implementation.checkpointId}</code></> : null}{checkpointRecovery.implementation.reason ? ` · ${checkpointRecovery.implementation.reason}` : ""}</p>
          {checkpointRecovery.implementation.retryable && checkpointRecovery.implementation.implementationRecordId && <button onClick={() => void act(() => window.champcity.retryWorkflowImplementationCheckpoint(workflow.workflowId, item.record.id, checkpointRecovery.implementation.implementationRecordId!), "Implementation checkpoint reconciled.")}>Retry / Reconcile implementation checkpoint</button>}
          <p>Tester checkpoint: {checkpointRecovery.tester.state}{checkpointRecovery.tester.testerResultId ? <> · TesterResult <code>{checkpointRecovery.tester.testerResultId}</code></> : null}{checkpointRecovery.tester.checkpointId ? <> · checkpoint <code>{checkpointRecovery.tester.checkpointId}</code></> : null}{checkpointRecovery.tester.reason ? ` · ${checkpointRecovery.tester.reason}` : ""}</p>
          {checkpointRecovery.tester.retryable && checkpointRecovery.tester.implementationRecordId && checkpointRecovery.tester.testerResultId && <button onClick={() => void act(() => window.champcity.retryWorkflowTesterCheckpoint(workflow.workflowId, item.record.id, checkpointRecovery.tester.implementationRecordId!, checkpointRecovery.tester.testerResultId!), "Tester checkpoint reconciled.")}>Retry / Reconcile Tester checkpoint</button>}
        </section>}
        {latest?.body.outcome === "implemented" && selectedModel && <button disabled={tester?.state === "running"} onClick={() => void act(() => window.champcity.startWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id, selectedModel), "Tester run started.", "tester")}>Run Tester</button>}
        {tester?.pendingApproval && <section aria-label="Tester approval request"><h4>Tester approval</h4><p>{tester.pendingApproval.impactSummary}</p>
          {tester.pendingApproval.commandDisplay && <pre>{tester.pendingApproval.commandDisplay}</pre>}
          <button onClick={() => void act(() => window.champcity.respondToWorkflowWorkItemTesterApproval(workflow.workflowId, item.record.id, latest!.id, tester.pendingApproval!.requestId, "approve"), "Tester approval answered.", "tester")}>Approve exact Tester request</button>
          <button onClick={() => void act(() => window.champcity.respondToWorkflowWorkItemTesterApproval(workflow.workflowId, item.record.id, latest!.id, tester.pendingApproval!.requestId, "deny"), "Tester request denied.", "tester")}>Deny exact Tester request</button></section>}
        {tester?.pendingUserInput && <CodexBoundedUserInputPanel label="Tester" pending={tester.pendingUserInput} onSubmit={(requestId, answers) => void act(() => window.champcity.respondToWorkflowWorkItemTesterInput(workflow.workflowId, item.record.id, latest!.id, requestId, answers), "Tester input sent to the exact session.", "tester")} />}
        {tester?.state === "running" && latest && <button onClick={() => void act(() => window.champcity.cancelWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id), "Exact Tester session cancelled.", "tester")}>Cancel Tester</button>}
        {validation && <><h3>Validator</h3><p>{validation.sourceMode} · {validation.completion.eligible ? "completion eligible" : validation.completion.blockers.join(", ")}</p><ul>{validation.criteria.map(entry => <li key={entry.criterion.id}>
          {entry.criterion.body.statement} — {entry.outcome} · {entry.policy === "semantic_ai" ? "semantic Validator" : entry.policy === "deterministic" ? "deterministic Validator" : entry.policy === "deferred_visual_phase" ? "human visual evidence at Phase close" : "human Operator decision"}{entry.reason ? ` (${entry.reason})` : ""}
          {entry.outcome === "pending" && entry.policy !== "operator_decision" && entry.policy !== "deferred_visual_phase" && <button onClick={() => void runValidation(entry.criterion.id, entry.policy)}>Validate</button>}
          {entry.criterion.body.criticality === "required" && entry.policy === "visual_human" && latest?.body.outcome === "implemented" && tester?.testerResultId && <><label>Visual outcome<select aria-label="Visual outcome" value={humanVisualOutcome} onChange={event => setHumanVisualOutcome(event.target.value as typeof humanVisualOutcome)}><option value="pass">Pass</option><option value="fail">Fail</option><option value="inconclusive">Inconclusive</option></select></label><label>Visual evidence summary<textarea value={humanSummary} onChange={event => setHumanSummary(event.target.value)} /></label>
            <button disabled={!humanSummary.trim()} onClick={() => void act(() => window.champcity.recordWorkflowWorkItemVisualCriterion({ workflowId: workflow.workflowId, workItemId: item.record.id, criterionId: entry.criterion.id,
              expectedCriterionVersion: entry.criterion.recordVersion, outcome: humanVisualOutcome, summary: humanSummary }), "Visual Criterion evidence recorded.")}>Record Operator visual Validation</button></>}
          {entry.criterion.body.criticality === "required" && entry.policy === "operator_decision" && latest?.body.outcome === "implemented" && tester?.testerResultId && <><p>Criterion Decision: {entry.decisionState}{entry.decisionId ? ` · ${entry.decisionId}` : ""}</p><label>Operator rationale for {entry.criterion.id}<textarea value={operatorRationale} onChange={event => setOperatorRationale(event.target.value)} /></label>
            <select aria-label="Criterion decision" value={criterionDecisionOutcome} onChange={event => setCriterionDecisionOutcome(event.target.value as "approved" | "rejected")}><option value="approved">Approve</option><option value="rejected">Reject</option></select>
            <button disabled={!operatorRationale.trim()} onClick={() => void act(() => window.champcity.recordWorkflowWorkItemCriterionDecision({ workflowId: workflow.workflowId, workItemId: item.record.id, criterionId: entry.criterion.id,
              expectedCriterionVersion: entry.criterion.recordVersion, outcome: criterionDecisionOutcome, rationale: operatorRationale }), "Operator Criterion Decision recorded.")}>{entry.decisionId ? "Correct Operator Decision" : "Record Operator Decision"}</button></>}
          {entry.outcome === "fail" && entry.repairable && (entry.policy === "operator_decision" ? entry.decisionId : entry.validationIds.at(-1)) && <button onClick={() => void act(() => window.champcity.createWorkflowRepair(workflow.workflowId, item.record.id, (entry.policy === "operator_decision" ? entry.decisionId : entry.validationIds.at(-1))!), "Canonical Repair WorkItem created.")}>Create Repair</button>}
        </li>)}</ul></>}
        {item.record.body.workState === "validation_pending" && <button disabled={!validation?.completion.eligible} onClick={() => void act(() => window.champcity.completeWorkflowWorkItem(workflow.workflowId, item.record.id, item.record.recordVersion), "WorkItem completed.")}>Complete Work Item</button>}
      </section>}
      {projection.plan.phases.length > 0 && <section aria-label="Phase validation and completion"><h2>Phase validation and completion</h2>{projection.plan.phases.map(phase => {
        const review = phaseValidation[phase.phaseId]; if (!review) return <p key={phase.phaseId} role="status">Loading Phase {phase.record.body.sequence} validation state…</p>;
        const isClosed = phase.record.body.phaseState === "closed";
        return <article key={phase.phaseId} aria-label={`Phase ${phase.record.body.sequence}: ${phase.record.body.title}`}><h3>Phase {phase.record.body.sequence}: {phase.record.body.title}</h3>
          <p>Phase <code>{phase.phaseId}</code> · {review.workItemsClosed ? "all member WorkItems closed" : "member WorkItems remain open"} · {review.completion.eligible ? "completion eligible" : review.completion.blockers.join(", ")}</p>
          {review.criteria.map(entry => <div key={entry.criterion.id}><p>{entry.criterion.body.statement} — {entry.policy} · {entry.outcome}{entry.decisionState ? ` · decision ${entry.decisionState}` : ""}{entry.reason ? ` · ${entry.reason}` : ""}{entry.validationId ? <> · Validation <code>{entry.validationId}</code></> : null}{entry.decisionId ? <> · Decision <code>{entry.decisionId}</code></> : null}</p>
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "deterministic" && <button onClick={() => void act(() => window.champcity.validateWorkflowPhaseDeterministicCriterion(workflow.workflowId, phase.phaseId, entry.criterion.id), "Deterministic Phase Validation recorded.")}>Run Phase deterministic Validator</button>}
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "semantic_ai" && selectedModel && <button onClick={() => void act(() => window.champcity.validateWorkflowPhaseSemanticCriterion(workflow.workflowId, phase.phaseId, entry.criterion.id, selectedModel), "Semantic Phase Validation recorded.")}>Run Phase semantic Validator</button>}
            {review.workItemsClosed && entry.policy === "visual_human" && <><label>Phase visual outcome<select aria-label="Phase visual outcome" value={humanVisualOutcome} onChange={event => setHumanVisualOutcome(event.target.value as typeof humanVisualOutcome)}><option value="pass">Pass</option><option value="fail">Fail</option><option value="inconclusive">Inconclusive</option></select></label><label>Phase visual evidence summary<textarea value={humanSummary} onChange={event => setHumanSummary(event.target.value)} /></label>
              <button disabled={!humanSummary.trim()} onClick={() => void act(() => window.champcity.recordWorkflowPhaseVisualCriterion({ workflowId: workflow.workflowId, phaseId: phase.phaseId,
                criterionId: entry.criterion.id, expectedCriterionVersion: entry.criterion.recordVersion, expectedPhaseVersion: review.phaseVersion,
                outcome: humanVisualOutcome, summary: humanSummary }), "Phase visual Validation recorded.")}>Record Phase visual Validation</button></>}
            {review.workItemsClosed && entry.policy === "deferred_visual_phase" && <><label>Deferred Phase visual outcome<select aria-label="Deferred visual outcome" value={humanVisualOutcome} onChange={event => setHumanVisualOutcome(event.target.value as typeof humanVisualOutcome)}><option value="pass">Pass</option><option value="fail">Fail</option><option value="inconclusive">Inconclusive</option></select></label><label>Deferred Phase visual evidence summary<textarea value={humanSummary} onChange={event => setHumanSummary(event.target.value)} /></label>
              <button disabled={!humanSummary.trim()} onClick={() => void act(() => window.champcity.recordWorkflowPhaseVisualCriterion({ workflowId: workflow.workflowId, phaseId: phase.phaseId,
                criterionId: entry.criterion.id, expectedCriterionVersion: entry.criterion.recordVersion, expectedPhaseVersion: review.phaseVersion,
                outcome: humanVisualOutcome, summary: humanSummary }), "Deferred Phase visual Validation recorded.")}>Record deferred visual Phase Validation</button></>}
            {review.workItemsClosed && entry.policy === "operator_decision" && <><p>Phase Criterion Decision: {entry.decisionState}{entry.decisionId ? ` · ${entry.decisionId}` : ""}</p><label>Phase Operator rationale<textarea value={operatorRationale} onChange={event => setOperatorRationale(event.target.value)} /></label>
              <select aria-label={`Phase ${phase.phaseId} decision`} value={criterionDecisionOutcome} onChange={event => setCriterionDecisionOutcome(event.target.value as "approved" | "rejected")}><option value="approved">Approve</option><option value="rejected">Reject</option></select>
              <button disabled={!operatorRationale.trim()} onClick={() => void act(() => window.champcity.recordWorkflowPhaseCriterionDecision({ workflowId: workflow.workflowId, phaseId: phase.phaseId,
                criterionId: entry.criterion.id, expectedCriterionVersion: entry.criterion.recordVersion, expectedPhaseVersion: review.phaseVersion,
                outcome: criterionDecisionOutcome, rationale: operatorRationale }), "Phase Operator Decision recorded.")}>{entry.decisionId ? "Correct Phase Operator Decision" : "Record Phase Operator Decision"}</button></>}
            {entry.outcome === "fail" && (entry.validationId || entry.decisionId) && <button onClick={() => void act(() => window.champcity.createWorkflowPhaseRepair(workflow.workflowId, phase.phaseId, (entry.decisionId ?? entry.validationId)!), "Canonical Phase Repair WorkItem created.")}>Create Phase Repair</button>}
          </div>)}
          {!isClosed && review.workItemsClosed && <button disabled={!review.completion.eligible} onClick={() => void act(() => window.champcity.completeWorkflowPhase(workflow.workflowId, phase.phaseId, review.phaseVersion), "Phase completed.")}>Complete Phase</button>}
        </article>;
      })}</section>}
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
    <aside aria-label="Embedded Architect">{browserPanel}</aside>
  </section>;
}
