import {CloseAdvanceWorkspace} from "./CloseAdvanceWorkspace";
import {ReviewValidationShell} from "./ReviewValidationShell";
import type {StructuredWorkItemReview} from "../../shared/structuredWorkItemReviewContracts";
import {WorkItemPlanningWorkspace} from "./WorkItemPlanningWorkspace";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import type { PhaseValidationProjection, WorkflowExecutionProjection, WorkItemValidationProjection } from "../../shared/workflowApplicationContracts";
import type { CodexImplementerExecutionModel, CodexTesterExecutionModel } from "../../shared/workspaceContracts";
import type { CodexManagedRuntimeStatus } from "../../shared/codexRuntimeContracts";
import type { IntegrationRepairAttempt, IntegrationRepairPatch } from "../../shared/integrationRepairContracts";
import type { WorkflowCheckpointRecoveryProjection } from "../../shared/workflowApplicationContracts";
import {ExecutionShell, ExecutionSelectedWorkItemPanel, ExecutionRuntimePanel, ExecutionInteractionsPanel, ExecutionCheckpointPanel, ExecutionIntegrationPanel} from "./ExecutionShell";

type Props = { workflow: WorkflowInstanceSummary; onReturn: () => void; browserPanel: ReactNode; initialWorkItemId?: string };

export function WorkflowExecutionWorkspace({ workflow, onReturn, browserPanel, initialWorkItemId }: Props): JSX.Element {
  const loadGeneration = useRef(0), selectedIdentity = useRef(initialWorkItemId ?? "");
  const [projection, setProjection] = useState<WorkflowExecutionProjection | null>(null);
  const [review,setReview]=useState<StructuredWorkItemReview|null>(null);
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
    const request = ++loadGeneration.current;
    try {
      const [next, models] = await Promise.all([window.champcity.getWorkflowExecutionProjection(workflow.workflowId), window.champcity.getCodexManagedRuntimeStatus()]);
      const selected = next.items.find(item => item.record.id === selectedIdentity.current) ?? next.items.find(item => !["closed", "cancelled"].includes(item.record.body.workState)) ?? next.items[0];
      const phaseEntries = await Promise.all(next.plan.phases.map(async phase => {try {return [phase.phaseId, await window.champcity.getWorkflowPhaseValidation(workflow.workflowId, phase.phaseId)] as const;} catch {return null;}}));
      const [nextValidation, nextRecovery, nextImplementer, nextTester] = selected ? await Promise.all([
        window.champcity.getStructuredWorkItemReview(workflow.workflowId, selected.record.id), window.champcity.getWorkflowCheckpointRecovery(workflow.workflowId, selected.record.id), window.champcity.getWorkflowWorkItemCodexExecutionStatus(workflow.workflowId, selected.record.id),
        selected.implementationAttempts.at(-1) ? window.champcity.getWorkflowWorkItemTesterStatus(workflow.workflowId, selected.record.id, selected.implementationAttempts.at(-1)!.id) : Promise.resolve(null),
      ]) : [null,null,null,null];
      let nextIntegration: typeof integration = null;
      if (["execution-complete", "integration-ready"].includes(next.plan.workflow.body.currentWorkspace)) try {nextIntegration = await window.champcity.getWorkflowIntegration(workflow.workflowId);} catch { /* Exact integration state may still be preparing. */ }
      if (request !== loadGeneration.current) return;
      selectedIdentity.current = selected?.record.id ?? ""; setSelectedId(selectedIdentity.current); setProjection(next); setRuntime(models); setReview(nextValidation); setValidation(nextValidation?.validation ?? null); setCheckpointRecovery(nextRecovery);
      if (preserveRuntimeRole !== "implementer") setImplementer(nextImplementer);
      if (preserveRuntimeRole !== "tester") setTester(nextTester);
      setPhaseValidation(Object.fromEntries(phaseEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null))); setIntegration(nextIntegration);
      if (!preserveOperationFeedback) setError("");
    } catch (reason) {
      if (request !== loadGeneration.current) return;
      try {const current = await window.champcity.getWorkflow(workflow.workflowId); if (request !== loadGeneration.current) return; if (current.workflow.lifecycleState === "closed" || current.workflow.workflowState === "closed") {setProjection(null); setError(""); setFeedback("Workflow is closed. Its final state is available from the Workflows Hub."); return;}} catch { /* Retain the exact Workflow service error. */ }
      if (!preserveOperationFeedback && request === loadGeneration.current) setError(String(reason));
    }
  };
  useEffect(() => { void refresh(); return () => {loadGeneration.current++;}; }, [workflow.workflowId]);
  useEffect(() => {
    if (implementer?.state !== "running" && tester?.state !== "running" && !implementer?.pendingApproval && !implementer?.pendingUserInput && !implementer?.pendingMcpElicitation && !tester?.pendingApproval && !tester?.pendingUserInput) return;
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(timer);
  }, [implementer?.state, tester?.state, selectedId, workflow.workflowId]);

  const item = projection?.items.find(candidate => candidate.record.id === selectedId);
  const latest = item?.implementationAttempts.at(-1);
  const selectedModel = runtime?.selection ?? (runtime?.catalog[0] ? { model: runtime.catalog[0].model, reasoningEffort: runtime.catalog[0].defaultReasoningEffort } : null);
  const act = async (operation: () => Promise<unknown>, message: string, role?: "implementer" | "tester") => {
    const selectedContext = selectedIdentity.current;
    try { const result = await operation();
      if (role && selectedContext !== selectedIdentity.current) {await refresh(true); return;}
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
  const selectWorkItem = async (id: string) => {
    const request = ++loadGeneration.current; selectedIdentity.current = id;
    setSelectedId(id); setReview(null); setValidation(null); setCheckpointRecovery(null); setImplementer(null); setTester(null);
    const selected = projection?.items.find(entry => entry.record.id === id); if (!selected) return;
    try {const [nextValidation, nextRecovery, nextImplementer, nextTester] = await Promise.all([
      window.champcity.getStructuredWorkItemReview(workflow.workflowId, id), window.champcity.getWorkflowCheckpointRecovery(workflow.workflowId, id), window.champcity.getWorkflowWorkItemCodexExecutionStatus(workflow.workflowId, id),
      selected.implementationAttempts.at(-1) ? window.champcity.getWorkflowWorkItemTesterStatus(workflow.workflowId, id, selected.implementationAttempts.at(-1)!.id) : Promise.resolve(null),
    ]); if (request !== loadGeneration.current) return; setReview(nextValidation); setValidation(nextValidation?.validation ?? null); setCheckpointRecovery(nextRecovery); setImplementer(nextImplementer); setTester(nextTester);} catch (reason) {if (request === loadGeneration.current) setError(String(reason));}
  };
  return <ExecutionShell workflow={workflow} projection={projection} selectedId={selectedId} error={error} feedback={feedback} onReturn={onReturn} onSelect={id => void selectWorkItem(id)} browserPanel={browserPanel}>
    {projection && <><CloseAdvanceWorkspace key={workflow.workflowId+projection.plan.workflow.recordVersion} workflowId={workflow.workflowId} scope="workflow" entityId={workflow.workflowId} onNext={next=>{if(next.workspaceId==="workflow-hub")onReturn();else void refresh();}} />{item && <ExecutionSelectedWorkItemPanel item={item}>
        {["planned", "ready"].includes(item.record.body.workState) && <WorkItemPlanningWorkspace workflowId={workflow.workflowId} workItemId={item.record.id} browserPanel={null} onChanged={refresh} />}
        <details><summary>Execution contract</summary><p>Scope in: {projection.plan.solutions[0]?.body.scopeIn.join("; ")}</p><p>Scope out: {projection.plan.solutions[0]?.body.scopeOut.join("; ")}</p><p>Constraints: {projection.plan.solutions[0]?.body.constraints.join("; ")}</p><p>Contract digest is generated from exact Workflow, WorkItem, accepted solution, phase, dependencies, Criteria, and source revision when execution starts.</p></details>
        <ExecutionRuntimePanel role="Implementer" model={implementer}><p>{latest ? `Implementation ${latest.id}: ${latest.body.outcome} · ${latest.body.summary}` : "No implementation attempt yet."}{implementer?.executionContractDigest && <> · contract <code>{implementer.executionContractDigest}</code></>}</p>
        {runtime?.catalog.length ? <label>Codex model <select value={selectedModel?.model ?? ""} onChange={async event => {
          const entry = runtime.catalog.find(candidate => candidate.model === event.target.value); if (!entry) return;
          try { setRuntime(await window.champcity.setCodexModelSelection({ model: entry.model, reasoningEffort: entry.defaultReasoningEffort })); } catch (reason) { setError(String(reason)); }
        }}>{runtime.catalog.map(entry => <option key={entry.model} value={entry.model}>{entry.displayName}</option>)}</select>
          <select aria-label="Reasoning effort" value={selectedModel?.reasoningEffort ?? ""} onChange={async event => {
            if (!selectedModel) return; try { setRuntime(await window.champcity.setCodexModelSelection({ ...selectedModel, reasoningEffort: event.target.value })); } catch (reason) { setError(String(reason)); }
          }}>{(runtime.catalog.find(entry => entry.model === selectedModel?.model)?.supportedReasoningEfforts ?? []).map(effort => <option key={effort} value={effort}>{effort}</option>)}</select></label> : <p role="status">Codex model catalog is unavailable.</p>}
        {item.eligibility.eligible && item.record.body.implementationBoundaries?.length && ["planned", "ready"].includes(item.record.body.workState) && <button disabled={!selectedModel || implementer?.state === "running" || tester?.state === "running"} onClick={() => selectedModel && void act(() => window.champcity.startWorkflowWorkItemCodexExecution(workflow.workflowId, item.record.id, selectedModel), "Implementer run started.", "implementer")}>Run Implementer</button>}
        {runtime?.selectionBlocker && <p role="status">{runtime.selectionBlocker}</p>}
        <ExecutionInteractionsPanel role="Implementer" approval={implementer?.pendingApproval} input={implementer?.pendingUserInput} elicitation={implementer?.pendingMcpElicitation}
          onApproval={(requestId, decision) => void act(() => window.champcity.respondToCodexApproval({requestId, decision, workflowId: workflow.workflowId, workItemId: item.record.id}), "Implementer approval answered.", "implementer")}
          onInput={(requestId, answers) => void act(() => window.champcity.respondToCodexUserInput({requestId, answers, workflowId: workflow.workflowId, workItemId: item.record.id}), "Implementer input sent to the exact session.", "implementer")}
          onElicitation={(requestId, action, content) => void act(() => window.champcity.respondToCodexMcpElicitation({requestId, action, content, workflowId: workflow.workflowId, workItemId: item.record.id}), "MCP elicitation answered.", "implementer")} />
        {implementer?.state === "running" && <button onClick={() => void act(() => window.champcity.cancelCodexImplementerExecution({ workflowId: workflow.workflowId, workItemId: item.record.id }), "Exact Implementer session cancelled.", "implementer")}>Cancel Implementer</button>}
        </ExecutionRuntimePanel>
        <ExecutionRuntimePanel role="Tester" model={tester}><p>{tester?.testerResultId ? `TesterResult ${tester.testerResultId} · checkpoint ${tester.checkpointState}` : tester?.failureReason ?? "Tester has not completed for the latest implementation."}</p>
        {checkpointRecovery && <ExecutionCheckpointPanel projection={checkpointRecovery} onRetryImplementation={id => void act(() => window.champcity.retryWorkflowImplementationCheckpoint(workflow.workflowId, item.record.id, id), "Implementation checkpoint reconciled.")} onRetryTester={(implementationId, testerId) => void act(() => window.champcity.retryWorkflowTesterCheckpoint(workflow.workflowId, item.record.id, implementationId, testerId), "Tester checkpoint reconciled.")} />}
        {latest?.body.outcome === "implemented" && selectedModel && <button disabled={tester?.state === "running"} onClick={() => void act(() => window.champcity.startWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id, selectedModel), "Tester run started.", "tester")}>Run Tester</button>}
        <ExecutionInteractionsPanel role="Tester" approval={tester?.pendingApproval} input={tester?.pendingUserInput}
          onApproval={(requestId, decision) => {if (latest) void act(() => window.champcity.respondToWorkflowWorkItemTesterApproval(workflow.workflowId, item.record.id, latest.id, requestId, decision), "Tester approval answered.", "tester");}}
          onInput={(requestId, answers) => {if (latest) void act(() => window.champcity.respondToWorkflowWorkItemTesterInput(workflow.workflowId, item.record.id, latest.id, requestId, answers), "Tester input sent to the exact session.", "tester");}} />
        {tester?.state === "running" && latest && <button onClick={() => void act(() => window.champcity.cancelWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id), "Exact Tester session cancelled.", "tester")}>Cancel Tester</button>}
        </ExecutionRuntimePanel>
        <ReviewValidationShell review={review}>{validation && <><h3>Validator</h3><p>{validation.sourceMode} · {validation.completion.eligible ? "completion eligible" : validation.completion.blockers.join(", ")}</p><ul>{validation.criteria.map(entry => <li key={entry.criterion.id}>
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
        {item.record.body.workState === "validation_pending" && <CloseAdvanceWorkspace key={item.record.id+item.record.recordVersion} workflowId={workflow.workflowId} scope="work-item" entityId={item.record.id} onNext={next=>{void refresh();if(next.entityId&&projection.items.some(entry=>entry.record.id===next.entityId))void selectWorkItem(next.entityId!);}} />}
      </ReviewValidationShell></ExecutionSelectedWorkItemPanel>}
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
          {!isClosed && review.workItemsClosed && <CloseAdvanceWorkspace key={phase.phaseId+review.phaseVersion} workflowId={workflow.workflowId} scope="phase" entityId={phase.phaseId} onNext={()=>void refresh()} />}
        </article>;
      })}</section>}
      {projection.items.length > 0 && projection.items.every(entry => entry.record.body.workState === "closed") && <ExecutionIntegrationPanel projection={integration} onIntegrate={() => void act(() => window.champcity.integrateWorkflow(workflow.workflowId), "Workflow integration was advanced.")} onPrepareRepair={candidateId => void window.champcity.prepareWorkflowIntegrationRepair(workflow.workflowId, candidateId).then(setRepairAttempt).catch(reason => setError(String(reason)))}>
        {repairAttempt && <section aria-label="Integration Repair"><h3>Integration Repair {repairAttempt.repairId}</h3><p>{repairAttempt.status}: {repairAttempt.message}</p>
          <p>Editable paths: {repairAttempt.policy.editablePaths.join(", ")}</p><pre>{repairAttempt.prompt}</pre>
          <label>Bounded repair patches as JSON<textarea value={repairPatches} onChange={event => setRepairPatches(event.target.value)} /></label>
          <button onClick={async () => { try { const patches = JSON.parse(repairPatches) as IntegrationRepairPatch[]; setRepairAttempt(await window.champcity.applyWorkflowIntegrationRepair(workflow.workflowId, repairAttempt.candidateId, repairAttempt.repairId, patches)); setError(""); } catch (reason) { setError(String(reason)); } }}>Apply Repair patches</button>
          {repairAttempt.status === "validated" && <button onClick={() => void act(() => window.champcity.completeWorkflowIntegrationRepair(workflow.workflowId, repairAttempt.candidateId, repairAttempt.repairId), "Integration Repair completed.")}>Complete Integration Repair</button>}
          {repairAttempt.status === "operator-decision" && <><label>Operator decision rationale<textarea value={operatorRationale} onChange={event => setOperatorRationale(event.target.value)} /></label>
            <button disabled={!operatorRationale.trim()} onClick={() => void act(() => window.champcity.requestWorkflowIntegrationDecision(workflow.workflowId, repairAttempt.candidateId, repairAttempt.repairId, operatorRationale), "Operator decision recorded for this candidate.")}>Record declared Operator decision</button></>}
        </section>}
      </ExecutionIntegrationPanel>}
    </>}
  </ExecutionShell>;
}
