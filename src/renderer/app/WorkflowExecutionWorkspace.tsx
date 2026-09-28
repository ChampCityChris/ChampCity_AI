import { useEffect, useState } from "react";
import type { WorkflowInstanceSummary } from "../../shared/workflowApplicationContracts";
import type { PhaseValidationProjection, WorkflowExecutionProjection, WorkItemValidationProjection } from "../../shared/workflowApplicationContracts";
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
  const [humanSummary, setHumanSummary] = useState("");
  const [criterionDecisionOutcome, setCriterionDecisionOutcome] = useState<"approved" | "rejected">("approved");
  const [decompositionJson, setDecompositionJson] = useState("");
  const [executionPlanDraft, setExecutionPlanDraft] = useState({ implementationBoundaries: "", affectedPaths: "", proofIntent: "" });
  const [phaseValidation, setPhaseValidation] = useState<Record<string, PhaseValidationProjection>>({});
  const [userInputAnswers, setUserInputAnswers] = useState<Record<string, string>>({});
  const [testerInputAnswers, setTesterInputAnswers] = useState<Record<string, string>>({});
  const [elicitationContent, setElicitationContent] = useState("{}");

  const refresh = async () => {
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
  const decompositionDraft = (entry: NonNullable<typeof item>) => {
    const firstKey = "replacement-a", secondKey = "replacement-b";
    return JSON.stringify({
      replacements: [
        { key: firstKey, kind: workflow.workflowType === "issue-resolution" ? "fix" : entry.record.body.workItemKind, title: `${entry.record.body.title} — part A`, objective: `Complete the first bounded part of: ${entry.record.body.objective}`, solutionId: projection?.plan.solutions[0]?.id, dependencyWorkItemIds: entry.dependencyIds, dependencyReplacementKeys: [] },
        { key: secondKey, kind: workflow.workflowType === "issue-resolution" ? "fix" : entry.record.body.workItemKind, title: `${entry.record.body.title} — part B`, objective: `Complete the second bounded part of: ${entry.record.body.objective}`, solutionId: projection?.plan.solutions[0]?.id, dependencyWorkItemIds: [], dependencyReplacementKeys: [firstKey] },
      ],
      criterionDispositions: projection?.plan.criteria.filter(candidate => candidate.ownerId === entry.record.id).map(candidate => ({ criterionId: candidate.record.id, disposition: "transfer", replacementKey: firstKey })) ?? [],
      incomingDependentMappings: projection?.items.filter(candidate => candidate.dependencyIds.includes(entry.record.id)).map(candidate => ({ dependentWorkItemId: candidate.record.id, replacementKeys: [firstKey, secondKey] })) ?? [],
    }, null, 2);
  };
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
  const answerImplementationInput = () => act(async () => {
    if (!implementer?.pendingUserInput || !item) throw Error("No exact Implementer input request is pending.");
    const answers = Object.fromEntries(implementer.pendingUserInput.questions.map(question => {
      const answer = userInputAnswers[question.id]; if (!answer) throw Error(`Answer required: ${question.header}`); return [question.id, [answer]];
    }));
    return window.champcity.respondToCodexUserInput({ requestId: implementer.pendingUserInput.requestId, answers, workflowId: workflow.workflowId, workItemId: item.record.id });
  }, "Implementer input sent to the exact session.");
  const answerTesterInput = () => act(async () => {
    if (!tester?.pendingUserInput || !item || !latest) throw Error("No exact Tester input request is pending.");
    const answers = Object.fromEntries(tester.pendingUserInput.questions.map(question => {
      const answer = testerInputAnswers[question.id]; if (!answer) throw Error(`Answer required: ${question.header}`); return [question.id, [answer]];
    }));
    return window.champcity.respondToWorkflowWorkItemTesterInput(workflow.workflowId, item.record.id, latest.id, tester.pendingUserInput.requestId, answers);
  }, "Tester input sent to the exact session.");

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
          <button type="button" onClick={() => { setSelectedId(entry.record.id); setValidation(null); setImplementer(null); setTester(null); setDecompositionJson(decompositionDraft(entry)); void Promise.all([
            window.champcity.getWorkItemValidation(workflow.workflowId, entry.record.id), window.champcity.getWorkflowWorkItemCodexExecutionStatus(workflow.workflowId, entry.record.id),
          ]).then(([nextValidation, nextImplementer]) => { setValidation(nextValidation); setImplementer(nextImplementer); const implementation = entry.implementationAttempts.at(-1); return implementation
            ? window.champcity.getWorkflowWorkItemTesterStatus(workflow.workflowId, entry.record.id, implementation.id).then(setTester) : undefined; }).catch(reason => setError(String(reason))); }}>{entry.record.body.title}</button> — {entry.record.body.workState} · {entry.eligibility.eligible ? "ready" : entry.eligibility.blockers.join(", ")}
          <small> · exact WorkItem <code>{entry.record.id}</code></small>
        </li>)}</ol>}
      </section>
        {item && <section aria-label="Exact Work Item execution"><h2>{item.record.body.title}</h2><p>{item.record.body.objective}</p><p>WorkItem <code>{item.record.id}</code> · {item.record.body.workState} · contract from accepted plan</p>
        { ["planned", "ready"].includes(item.record.body.workState) && !item.record.body.implementationBoundaries?.length && <section aria-label="Architect WorkItem execution planning"><h3>Architect execution plan required</h3>
          <p>Prepare the exact Architect handoff, then accept its bounded execution contract before decomposition or Implementer execution.</p>
          <button onClick={() => void act(async () => {
            const solution = projection.plan.solutions[0]; const phase = projection.plan.phases.find(candidate => candidate.phaseId === item.phaseId);
            const handoff = `Architect WorkItem execution plan\nWorkflow ID: ${workflow.workflowId}\nWorkItem ID/version: ${item.record.id}/${item.record.recordVersion}\nObjective: ${item.record.body.objective}\nAccepted BoundedSolution: ${JSON.stringify(solution)}\nWorkItem Criteria: ${JSON.stringify(projection.plan.criteria.filter(candidate => candidate.ownerId === item.record.id).map(candidate => candidate.record))}\nSolution Criteria: ${JSON.stringify(projection.plan.criteria.filter(candidate => candidate.ownerId === solution?.id).map(candidate => candidate.record))}\nPhase context: ${JSON.stringify(phase ?? null)}\nDependencies: ${JSON.stringify(item.dependencyIds)}\nScope/constraints: ${JSON.stringify({ scopeIn: solution?.body.scopeIn, scopeOut: solution?.body.scopeOut, constraints: solution?.body.constraints })}\nSource mode/context: ${JSON.stringify({ mode: projection.source.state === "non-source" ? "source-neutral" : "source-backed", currentRevisionId: projection.source.currentRevisionId, workSourceLineId: projection.source.workSourceLineId, repositoryCheckoutId: projection.source.repositoryCheckoutId })}\nReturn implementationBoundaries (1..32), affectedPaths (0..128 normalized repo-relative paths; empty for source-neutral), proofIntent (1..32), whether decomposition is required, and bounded current repository context relevant to this exact scope. Do not return raw transcript or Markdown as authority.`;
            await navigator.clipboard.writeText(handoff); return { copied: true };
          }, "Exact Architect handoff copied.")}>Prepare Architect handoff</button>
          <label>Implementation boundaries<textarea value={executionPlanDraft.implementationBoundaries} onChange={event => setExecutionPlanDraft(current => ({ ...current, implementationBoundaries: event.target.value }))} /></label>
          <label>Affected repository paths<textarea value={executionPlanDraft.affectedPaths} onChange={event => setExecutionPlanDraft(current => ({ ...current, affectedPaths: event.target.value }))} /></label>
          <label>Focused proof intent<textarea value={executionPlanDraft.proofIntent} onChange={event => setExecutionPlanDraft(current => ({ ...current, proofIntent: event.target.value }))} /></label>
          <button onClick={() => void act(() => window.champcity.acceptWorkflowWorkItemExecutionPlan({ workflowId: workflow.workflowId, workItemId: item.record.id, expectedVersion: item.record.recordVersion, plan: {
            implementationBoundaries: executionPlanDraft.implementationBoundaries.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
            affectedPaths: executionPlanDraft.affectedPaths.split(/\r?\n/).map(value => value.trim()).filter(Boolean), proofIntent: executionPlanDraft.proofIntent.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
          } }), "Architect execution plan accepted.")}>Accept Architect execution plan</button>
        </section>}
        <details><summary>Execution contract</summary><p>Scope in: {projection.plan.solutions[0]?.body.scopeIn.join("; ")}</p><p>Scope out: {projection.plan.solutions[0]?.body.scopeOut.join("; ")}</p><p>Constraints: {projection.plan.solutions[0]?.body.constraints.join("; ")}</p><p>Contract digest is generated from exact Workflow, WorkItem, accepted solution, phase, dependencies, Criteria, and source revision when execution starts.</p></details>
        {["planned", "ready"].includes(item.record.body.workState) && item.implementationAttempts.length === 0 && <details><summary>Decompose WorkItem before execution</summary>
          <p>Expected WorkItem version: <code>{item.record.recordVersion}</code>. Edit each replacement, transfer/elevate/split every Criterion, and map all incoming/outgoing dependencies. The typed action is atomic.</p>
          <label>Typed decomposition JSON<textarea value={decompositionJson || decompositionDraft(item)} onChange={event => setDecompositionJson(event.target.value)} /></label>
          <button onClick={() => void act(async () => {
            const draft = JSON.parse(decompositionJson || decompositionDraft(item)) as Record<string, unknown>;
            if (Object.keys(draft).sort().join("|") !== "criterionDispositions|incomingDependentMappings|replacements") throw Error("Decomposition JSON must contain only replacements, criterionDispositions, and incomingDependentMappings.");
            return window.champcity.decomposeWorkflowWorkItem({ workflowId: workflow.workflowId, workItemId: item.record.id, expectedWorkItemVersion: item.record.recordVersion,
              replacements: draft.replacements as import("../../shared/projectState/projectStateService").WorkItemDecompositionCandidate[],
              criterionDispositions: draft.criterionDispositions as import("../../shared/projectState/projectStateService").WorkItemCriterionDisposition[],
              incomingDependentMappings: draft.incomingDependentMappings as import("../../shared/projectState/projectStateService").WorkItemDecompositionInput["incomingDependentMappings"] });
          }, "Typed decomposition accepted; current plan refreshed.")}>Accept typed decomposition</button>
        </details>}
        <h3>Implementer</h3><p>{latest ? `Implementation ${latest.id}: ${latest.body.outcome} · ${latest.body.summary}` : "No implementation attempt yet."}{implementer?.executionContractDigest && <> · contract <code>{implementer.executionContractDigest}</code></>}</p>
        {runtime?.catalog.length ? <label>Codex model <select value={selectedModel?.model ?? ""} onChange={async event => {
          const entry = runtime.catalog.find(candidate => candidate.model === event.target.value); if (!entry) return;
          try { setRuntime(await window.champcity.setCodexModelSelection({ model: entry.model, reasoningEffort: entry.defaultReasoningEffort })); } catch (reason) { setError(String(reason)); }
        }}>{runtime.catalog.map(entry => <option key={entry.model} value={entry.model}>{entry.displayName}</option>)}</select>
          <select aria-label="Reasoning effort" value={selectedModel?.reasoningEffort ?? ""} onChange={async event => {
            if (!selectedModel) return; try { setRuntime(await window.champcity.setCodexModelSelection({ ...selectedModel, reasoningEffort: event.target.value })); } catch (reason) { setError(String(reason)); }
          }}>{(runtime.catalog.find(entry => entry.model === selectedModel?.model)?.supportedReasoningEfforts ?? []).map(effort => <option key={effort} value={effort}>{effort}</option>)}</select></label> : <p role="status">Codex model catalog is unavailable.</p>}
        {item.eligibility.eligible && item.record.body.implementationBoundaries?.length && ["planned", "ready"].includes(item.record.body.workState) && <button disabled={!selectedModel || runtime?.busy} onClick={() => selectedModel && void act(() => window.champcity.startWorkflowWorkItemCodexExecution(workflow.workflowId, item.record.id, selectedModel), "Implementer run started.")}>Run Implementer</button>}
        {runtime?.selectionBlocker && <p role="status">{runtime.selectionBlocker}</p>}
        {implementer?.pendingApproval && <section aria-label="Implementer approval request"><h4>Implementer approval</h4><p>{implementer.pendingApproval.impactSummary}</p>
          {implementer.pendingApproval.commandDisplay && <pre>{implementer.pendingApproval.commandDisplay}</pre>}{implementer.pendingApproval.fileChangeSummary && <p>{implementer.pendingApproval.fileChangeSummary}</p>}
          {implementer.pendingApproval.permissionSummary && <p>{implementer.pendingApproval.permissionSummary}</p>}
          <button onClick={() => void act(() => window.champcity.respondToCodexApproval({ requestId: implementer.pendingApproval!.requestId, decision: "approve", workflowId: workflow.workflowId, workItemId: item.record.id }), "Implementer approval answered.")}>Approve exact request</button>
          <button onClick={() => void act(() => window.champcity.respondToCodexApproval({ requestId: implementer.pendingApproval!.requestId, decision: "deny", workflowId: workflow.workflowId, workItemId: item.record.id }), "Implementer request denied.")}>Deny exact request</button></section>}
        {implementer?.pendingUserInput && <section aria-label="Implementer input request"><h4>Implementer needs input</h4>{implementer.pendingUserInput.questions.map(question => <label key={question.id}>{question.header}: {question.question}
          <select value={userInputAnswers[question.id] ?? ""} onChange={event => setUserInputAnswers(current => ({ ...current, [question.id]: event.target.value }))}><option value="">Choose an answer</option>{question.options.map(option => <option key={option.label} value={option.label}>{option.label} — {option.description}</option>)}</select></label>)}
          <button disabled={implementer.pendingUserInput.questions.some(question => !userInputAnswers[question.id])} onClick={() => void answerImplementationInput()}>Send exact Implementer answers</button></section>}
        {implementer?.pendingMcpElicitation && <section aria-label="Implementer MCP elicitation"><h4>MCP input · {implementer.pendingMcpElicitation.serverName}</h4><p>{implementer.pendingMcpElicitation.message}</p><p>{implementer.pendingMcpElicitation.requestedSchemaSummary}</p>
          {implementer.pendingMcpElicitation.fields.map(field => <p key={field.id}>{field.title}{field.required ? " (required)" : ""}: {field.description}{field.options.length ? ` · ${field.options.map(option => option.label).join(", ")}` : ""}</p>)}
          {implementer.pendingMcpElicitation.responseSupported && <><label>Bounded elicitation response JSON<textarea value={elicitationContent} onChange={event => setElicitationContent(event.target.value)} /></label>
            <button onClick={() => void act(() => window.champcity.respondToCodexMcpElicitation({ requestId: implementer.pendingMcpElicitation!.requestId, action: "accept", content: JSON.parse(elicitationContent), workflowId: workflow.workflowId, workItemId: item.record.id }), "MCP elicitation answered.")}>Send elicitation response</button></>}
          <button onClick={() => void act(() => window.champcity.respondToCodexMcpElicitation({ requestId: implementer.pendingMcpElicitation!.requestId, action: "decline", content: null, workflowId: workflow.workflowId, workItemId: item.record.id }), "MCP elicitation declined.")}>Decline elicitation</button></section>}
        {implementer?.state === "running" && <button onClick={() => void act(() => window.champcity.cancelCodexImplementerExecution({ workflowId: workflow.workflowId, workItemId: item.record.id }), "Exact Implementer session cancelled.")}>Cancel Implementer</button>}
        <h3>Tester</h3><p>{tester?.testerResultId ? `TesterResult ${tester.testerResultId} · checkpoint ${tester.checkpointState}` : tester?.failureReason ?? "Tester has not completed for the latest implementation."}</p>
        {latest?.body.outcome === "implemented" && selectedModel && <button disabled={tester?.state === "running"} onClick={() => void act(() => window.champcity.startWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id, selectedModel), "Tester run started.")}>Run Tester</button>}
        {tester?.pendingApproval && <section aria-label="Tester approval request"><h4>Tester approval</h4><p>{tester.pendingApproval.impactSummary}</p>
          {tester.pendingApproval.commandDisplay && <pre>{tester.pendingApproval.commandDisplay}</pre>}
          <button onClick={() => void act(() => window.champcity.respondToWorkflowWorkItemTesterApproval(workflow.workflowId, item.record.id, latest!.id, tester.pendingApproval!.requestId, "approve"), "Tester approval answered.")}>Approve exact Tester request</button>
          <button onClick={() => void act(() => window.champcity.respondToWorkflowWorkItemTesterApproval(workflow.workflowId, item.record.id, latest!.id, tester.pendingApproval!.requestId, "deny"), "Tester request denied.")}>Deny exact Tester request</button></section>}
        {tester?.pendingUserInput && <section aria-label="Tester input request"><h4>Tester needs input</h4>{tester.pendingUserInput.questions.map(question => <label key={question.id}>{question.header}: {question.question}
          <select value={testerInputAnswers[question.id] ?? ""} onChange={event => setTesterInputAnswers(current => ({ ...current, [question.id]: event.target.value }))}><option value="">Choose an answer</option>{question.options.map(option => <option key={option.label} value={option.label}>{option.label} — {option.description}</option>)}</select></label>)}
          <button disabled={tester.pendingUserInput.questions.some(question => !testerInputAnswers[question.id])} onClick={() => void answerTesterInput()}>Send exact Tester answers</button></section>}
        {tester?.state === "running" && latest && <button onClick={() => void act(() => window.champcity.cancelWorkflowWorkItemTester(workflow.workflowId, item.record.id, latest.id), "Exact Tester session cancelled.")}>Cancel Tester</button>}
        {validation && <><h3>Validator</h3><p>{validation.sourceMode} · {validation.completion.eligible ? "completion eligible" : validation.completion.blockers.join(", ")}</p><ul>{validation.criteria.map(entry => <li key={entry.criterion.id}>
          {entry.criterion.body.statement} — {entry.outcome} · {entry.policy === "semantic_ai" ? "semantic Validator" : entry.policy === "deterministic" ? "deterministic Validator" : entry.policy === "deferred_visual_phase" ? "human visual evidence at Phase close" : "human Operator decision"}{entry.reason ? ` (${entry.reason})` : ""}
          {entry.outcome === "pending" && entry.policy !== "operator_decision" && entry.policy !== "deferred_visual_phase" && <button onClick={() => void runValidation(entry.criterion.id, entry.policy)}>Validate</button>}
          {entry.criterion.body.criticality === "required" && entry.outcome === "pending" && entry.policy === "visual_human" && latest?.body.outcome === "implemented" && tester?.testerResultId && <><label>Visual evidence summary<textarea value={humanSummary} onChange={event => setHumanSummary(event.target.value)} /></label>
            <button disabled={!humanSummary.trim()} onClick={() => void act(() => window.champcity.recordWorkflowWorkItemVisualCriterion({ workflowId: workflow.workflowId, workItemId: item.record.id, criterionId: entry.criterion.id,
              expectedCriterionVersion: entry.criterion.recordVersion, implementationRecordId: latest.id, sourceRevisionId: validation.sourceRevisionId, summary: humanSummary }), "Visual Criterion evidence recorded.")}>Record Operator visual Validation</button></>}
          {entry.criterion.body.criticality === "required" && entry.outcome === "pending" && entry.policy === "operator_decision" && latest?.body.outcome === "implemented" && tester?.testerResultId && <><label>Operator rationale for {entry.criterion.id}<textarea value={operatorRationale} onChange={event => setOperatorRationale(event.target.value)} /></label>
            <select aria-label="Criterion decision" value={criterionDecisionOutcome} onChange={event => setCriterionDecisionOutcome(event.target.value as "approved" | "rejected")}><option value="approved">Approve</option><option value="rejected">Reject</option></select>
            <button disabled={!operatorRationale.trim()} onClick={() => void act(() => window.champcity.recordWorkflowWorkItemCriterionDecision({ workflowId: workflow.workflowId, workItemId: item.record.id, criterionId: entry.criterion.id,
              expectedCriterionVersion: entry.criterion.recordVersion, implementationRecordId: latest.id, sourceRevisionId: validation.sourceRevisionId,
              outcome: criterionDecisionOutcome, rationale: operatorRationale }), "Operator Criterion Decision recorded.")}>Record Operator Decision</button></>}
          {entry.outcome === "fail" && entry.validationIds[0] && <button onClick={() => void act(() => window.champcity.createWorkflowRepair(workflow.workflowId, item.record.id, entry.validationIds.at(-1)!), "Canonical Repair WorkItem created.")}>Create Repair</button>}
        </li>)}</ul></>}
        {item.record.body.workState === "validation_pending" && <button disabled={!validation?.completion.eligible} onClick={() => void act(() => window.champcity.completeWorkflowWorkItem(workflow.workflowId, item.record.id, item.record.recordVersion), "WorkItem completed.")}>Complete Work Item</button>}
      </section>}
      {projection.plan.phases.length > 0 && <section aria-label="Phase validation and completion"><h2>Phase validation and completion</h2>{projection.plan.phases.map(phase => {
        const review = phaseValidation[phase.phaseId]; if (!review) return <p key={phase.phaseId} role="status">Loading Phase {phase.record.body.sequence} validation state…</p>;
        const isClosed = phase.record.body.phaseState === "closed";
        return <article key={phase.phaseId} aria-label={`Phase ${phase.record.body.sequence}: ${phase.record.body.title}`}><h3>Phase {phase.record.body.sequence}: {phase.record.body.title}</h3>
          <p>Phase <code>{phase.phaseId}</code> · {review.workItemsClosed ? "all member WorkItems closed" : "member WorkItems remain open"} · {review.completion.eligible ? "completion eligible" : review.completion.blockers.join(", ")}</p>
          {review.criteria.map(entry => <div key={entry.criterion.id}><p>{entry.criterion.body.statement} — {entry.policy} · {entry.outcome}{entry.decisionState ? ` · decision ${entry.decisionState}` : ""}{entry.reason ? ` · ${entry.reason}` : ""}{entry.validationId ? <> · Validation <code>{entry.validationId}</code></> : null}</p>
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "deterministic" && <button onClick={() => void act(() => window.champcity.validateWorkflowPhaseDeterministicCriterion(workflow.workflowId, phase.phaseId, entry.criterion.id), "Deterministic Phase Validation recorded.")}>Run Phase deterministic Validator</button>}
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "semantic_ai" && selectedModel && <button onClick={() => void act(() => window.champcity.validateWorkflowPhaseSemanticCriterion(workflow.workflowId, phase.phaseId, entry.criterion.id, selectedModel), "Semantic Phase Validation recorded.")}>Run Phase semantic Validator</button>}
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "visual_human" && <><label>Phase visual evidence summary<textarea value={humanSummary} onChange={event => setHumanSummary(event.target.value)} /></label>
              <button disabled={!humanSummary.trim()} onClick={() => void act(() => window.champcity.recordWorkflowPhaseVisualCriterion({ workflowId: workflow.workflowId, phaseId: phase.phaseId,
                criterionId: entry.criterion.id, expectedCriterionVersion: entry.criterion.recordVersion, expectedPhaseVersion: review.phaseVersion,
                sourceRevisionId: review.sourceRevisionId, summary: humanSummary }), "Phase visual Validation recorded.")}>Record Phase visual Validation</button></>}
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "deferred_visual_phase" && <><label>Deferred Phase visual evidence summary<textarea value={humanSummary} onChange={event => setHumanSummary(event.target.value)} /></label>
              <button disabled={!humanSummary.trim()} onClick={() => void act(() => window.champcity.recordWorkflowPhaseVisualCriterion({ workflowId: workflow.workflowId, phaseId: phase.phaseId,
                criterionId: entry.criterion.id, expectedCriterionVersion: entry.criterion.recordVersion, expectedPhaseVersion: review.phaseVersion,
                sourceRevisionId: review.sourceRevisionId, summary: humanSummary }), "Deferred Phase visual Validation recorded.")}>Record deferred visual Phase Validation</button></>}
            {review.workItemsClosed && entry.outcome !== "pass" && entry.policy === "operator_decision" && <><label>Phase Operator rationale<textarea value={operatorRationale} onChange={event => setOperatorRationale(event.target.value)} /></label>
              <select aria-label={`Phase ${phase.phaseId} decision`} value={criterionDecisionOutcome} onChange={event => setCriterionDecisionOutcome(event.target.value as "approved" | "rejected")}><option value="approved">Approve</option><option value="rejected">Reject</option></select>
              <button disabled={!operatorRationale.trim()} onClick={() => void act(() => window.champcity.recordWorkflowPhaseCriterionDecision({ workflowId: workflow.workflowId, phaseId: phase.phaseId,
                criterionId: entry.criterion.id, expectedCriterionVersion: entry.criterion.recordVersion, expectedPhaseVersion: review.phaseVersion,
                outcome: criterionDecisionOutcome, rationale: operatorRationale }), "Phase Operator Decision recorded.")}>Record Phase Operator Decision</button></>}
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
  </section>;
}
