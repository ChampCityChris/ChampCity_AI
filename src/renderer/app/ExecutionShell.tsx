import type {ReactNode} from "react";
import type {WorkflowExecutionProjection, WorkflowExecutionItem, WorkflowCheckpointRecoveryProjection, WorkflowInstanceSummary} from "../../shared/workflowApplicationContracts";
import type {ChampCityApi, CodexImplementerExecutionModel, CodexTesterExecutionModel, CodexPendingApprovalModel, CodexPendingUserInputModel, CodexPendingMcpElicitationModel} from "../../shared/workspaceContracts";
import {WORKFLOW_TYPE_REGISTRY} from "../../shared/projectState/workflowTypeRegistry";
import {WorkMapShell, type WorkMapNode} from "./WorkMapShell";
import {CodexBoundedUserInputPanel, CodexBoundedMcpElicitationPanel} from "./CodexBoundedInteractionPanels";

/** Presentation receives projections and exact adapter-bound actions; it has no persistence bridge. */
export function ExecutionShell(props: {workflow: WorkflowInstanceSummary; projection: WorkflowExecutionProjection | null; selectedId: string; error: string; feedback: string; onReturn: () => void; onSelect: (id: string) => void; browserPanel: ReactNode; children: ReactNode}) {
  return <section className="workflow-instance-workspace workflow-execution-workspace" aria-labelledby="workspace-heading">
    <header className="workflow-instance-shell-header"><div><p>{WORKFLOW_TYPE_REGISTRY[props.workflow.workflowType].label} · Shared Execution Workspace</p><h1 id="workspace-heading">{props.workflow.title}</h1></div><button type="button" className="workflow-instance-back" onClick={props.onReturn}>Back to Workflows</button></header>
    <p>Exact Workflow <code>{props.workflow.workflowId}</code> · stage: {props.projection?.plan.workflow.body.currentWorkspace ?? "Loading"}</p>
    {props.error ? <p role="alert">{props.error}</p> : null}{props.feedback ? <p role="status">{props.feedback}</p> : null}
    {!props.projection && !props.error && !props.feedback ? <p role="status">Loading exact Workflow execution state…</p> : null}
    <h2>Work Item Map and readiness</h2>{props.projection ? <ExecutionWorkMapPanel projection={props.projection} selectedId={props.selectedId} onSelect={props.onSelect} /> : null}
    {props.children}<aside aria-label="Embedded Architect">{props.browserPanel}</aside>
  </section>;
}

export function ExecutionWorkMapPanel(props: {projection: WorkflowExecutionProjection; selectedId: string; onSelect: (id: string) => void}) {
  const {plan, items, source} = props.projection;
  const nodes: WorkMapNode[] = [...plan.phases.map(phase => ({id: phase.phaseId, title: phase.record.body.title, objective: phase.record.body.objective, kind: "phase" as const, sequence: phase.sequence * 1000, state: phase.record.body.phaseState, complete: phase.record.body.phaseState === "closed", criteria: plan.criteria.filter(entry => entry.ownerId === phase.phaseId).map(entry => entry.record.body.statement)})), ...items.map((item, index) => ({id: item.record.id, title: item.record.body.title, objective: item.record.body.objective, kind: "work-item" as const, parentId: item.phaseId ?? undefined, sequence: index+1, state: item.record.body.workState, complete: item.record.body.workState === "closed", active: props.projection.activeWorkItemIds.includes(item.record.id), eligible: item.eligibility.eligible, readiness: item.eligibility.eligible ? "ready" : item.eligibility.blockers.join(", "), criteria: plan.criteria.filter(entry => entry.ownerId === item.record.id).map(entry => entry.record.body.statement)}))];
  return <WorkMapShell label="Source and Work Item Map" nodes={nodes} dependencies={plan.dependencyIds} accepted={true} selectedId={props.selectedId} onSelect={id => {if (items.some(item => item.record.id === id)) props.onSelect(id);}} context={<>
    <p>Source: <strong>{source.state === "non-source" ? "Source-neutral" : "Source-backed"}</strong>{source.baselineId ? <> · baseline <code>{source.baselineId}</code></> : null}{source.currentRevisionId ? <> · current revision <code>{source.currentRevisionId}</code></> : null}{source.workSourceLineId ? <> · checkout line <code>{source.workSourceLineId}</code></> : null}{source.repositoryCheckoutId ? <> · checkout <code>{source.repositoryCheckoutId}</code></> : null}</p>
    {source.state === "unprepared" ? <p>Source checkout is prepared on the first exact Implementer run.</p> : null}{source.failureCode ? <p role="alert">{source.failureCode}</p> : null}{!items.length ? <p role="status">No accepted Work Items are available for this Workflow.</p> : null}
  </>} />;
}

export function ExecutionSelectedWorkItemPanel(props: {item: WorkflowExecutionItem; children: ReactNode}) {
  return <section aria-label="Exact Work Item execution"><h2>{props.item.record.body.title}</h2><p>{props.item.record.body.objective}</p><p>WorkItem <code>{props.item.record.id}</code> · {props.item.record.body.workState} · contract from accepted plan</p>{props.children}</section>;
}

export function ExecutionRuntimePanel(props: {role: "Implementer" | "Tester"; model: CodexImplementerExecutionModel | CodexTesterExecutionModel | null; children?: ReactNode}) {
  const model = props.model;
  return <section aria-label={`${props.role} runtime`}><h3>{props.role}</h3>{props.children}{model ? <section aria-label={`${props.role} runtime status`}><p>Exact {props.role} state: {model.state}{model.failureReason ? ` · ${model.failureReason}` : ""}</p>{model.pendingApproval ? <p>Pending interaction: approval</p> : model.pendingUserInput ? <p>Pending interaction: user input</p> : "pendingMcpElicitation" in model && model.pendingMcpElicitation ? <p>Pending interaction: MCP elicitation</p> : null}{model.eventTail.length ? <details><summary>Recent {props.role} events</summary><ul>{model.eventTail.slice(-8).map((entry, index) => <li key={index}>{entry}</li>)}</ul></details> : null}</section> : null}</section>;
}

export function ExecutionInteractionsPanel(props: {role: "Implementer" | "Tester"; approval?: CodexPendingApprovalModel | null; input?: CodexPendingUserInputModel | null; elicitation?: CodexPendingMcpElicitationModel | null; onApproval: (requestId: string, decision: "approve" | "deny") => void; onInput: (requestId: string, answers: Record<string,string[]>) => void; onElicitation?: (requestId: string, action: "accept" | "decline" | "cancel", content: unknown | null) => void}) {
  return <>{props.approval ? <section aria-label={`${props.role} approval request`}><h4>{props.role} approval</h4><p>{props.approval.impactSummary}</p>{props.approval.commandDisplay ? <pre>{props.approval.commandDisplay}</pre> : null}{props.approval.fileChangeSummary ? <p>{props.approval.fileChangeSummary}</p> : null}{props.approval.permissionSummary ? <p>{props.approval.permissionSummary}</p> : null}<button onClick={() => props.onApproval(props.approval!.requestId, "approve")}>Approve exact {props.role} request</button><button onClick={() => props.onApproval(props.approval!.requestId, "deny")}>Deny exact {props.role} request</button></section> : null}
    {props.input ? <CodexBoundedUserInputPanel key={props.input.requestId} label={props.role} pending={props.input} onSubmit={props.onInput} /> : null}{props.elicitation && props.onElicitation ? <CodexBoundedMcpElicitationPanel key={props.elicitation.requestId} pending={props.elicitation} onSubmit={props.onElicitation} /> : null}</>;
}

export function ExecutionCheckpointPanel(props: {projection: WorkflowCheckpointRecoveryProjection; onRetryImplementation: (id: string) => void; onRetryTester: (implementationId: string, testerId: string) => void}) {
  const {implementation, tester} = props.projection;
  if (props.projection.sourceMode !== "source-backed") return <p>Source-neutral checkpoints: not required.</p>;
  return <section aria-label="Source Checkpoint Recovery"><h3>Source Checkpoint Recovery</h3><p>Implementation checkpoint: {implementation.state}{implementation.implementationRecordId ? <> · ImplementationRecord <code>{implementation.implementationRecordId}</code></> : null}{implementation.checkpointId ? <> · checkpoint <code>{implementation.checkpointId}</code></> : null}{implementation.reason ? ` · ${implementation.reason}` : ""}</p>
    {implementation.retryable && implementation.implementationRecordId ? <button onClick={() => props.onRetryImplementation(implementation.implementationRecordId!)}>Retry / Reconcile implementation checkpoint</button> : null}
    <p>Tester checkpoint: {tester.state}{tester.testerResultId ? <> · TesterResult <code>{tester.testerResultId}</code></> : null}{tester.checkpointId ? <> · checkpoint <code>{tester.checkpointId}</code></> : null}{tester.reason ? ` · ${tester.reason}` : ""}</p>
    {tester.retryable && tester.implementationRecordId && tester.testerResultId ? <button onClick={() => props.onRetryTester(tester.implementationRecordId!, tester.testerResultId!)}>Retry / Reconcile Tester checkpoint</button> : null}</section>;
}

export function ExecutionIntegrationPanel(props: {projection: Awaited<ReturnType<ChampCityApi["getWorkflowIntegration"]>> | null; onCompleteExecution: () => void; onIntegrate: () => void; onPrepareRepair: (candidateId: string) => void; children?: ReactNode}) {
  return <section aria-label="Workflow completion and integration"><h2>Workflow completion and integration</h2><button onClick={props.onCompleteExecution}>Complete Workflow execution</button>{props.projection ? <><p>Integration candidates: {props.projection.candidates.map(candidate => `${candidate.candidateId} · ${candidate.status}${candidate.conflictingPaths.length ? ` · conflicts: ${candidate.conflictingPaths.join(", ")}` : ""}`).join("; ") || "none"}</p><button onClick={props.onIntegrate}>Create / resume integration</button>{props.projection.candidates.filter(candidate => ["conflicted", "validation-failed", "operator-decision"].includes(candidate.status)).map(candidate => <div key={candidate.candidateId}><button onClick={() => props.onPrepareRepair(candidate.candidateId)}>Prepare Integration Repair for {candidate.candidateId}</button><ul>{candidate.validation.map((proof,index) => <li key={`${proof.checkId}-${index}`}>{proof.checkId}: {proof.summary}</li>)}</ul></div>)}</> : null}{props.children}</section>;
}
