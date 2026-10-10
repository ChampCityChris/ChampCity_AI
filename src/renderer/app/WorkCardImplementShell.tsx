import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import type {ReactNode} from "react";
import { useState } from "react";
import { Play, Square, Wrench } from "lucide-react";
import type {
  CodexImplementerExecutionModel,
} from "../../shared/workspaceContracts";
import {
  codexImplementerAvailabilityLabel,
} from "../../shared/workspaceContracts";
import { CodexBoundedMcpElicitationPanel, CodexBoundedUserInputPanel } from "./CodexBoundedInteractionPanels";



/** Presentation vocabulary retains the historical environment-result display without adding a runtime execution kind. */
export type ImplementExecutionPresentation = Omit<CodexImplementerExecutionModel, "executionKind"> & {executionKind: CodexImplementerExecutionModel["executionKind"] | "environment-resolution"};
export interface ImplementModelSelection {controls: ReactNode; selection: CodexModelSelection | null; canRun: boolean}
export interface WorkCardImplementContext {
  workCardId: string; workCardTitle: string; implementationContractLabel: string; implementationContractType: string;
  formalWorkCardPath: string; formalWorkCardRevision: number; parentWorkCardId?: string;
  implementerReportPath: string; report: {disposition: string; artifactRevision: number} | null;
  reportMissing: boolean; reportReadiness: string; reportReadinessReason: string; reportReadError?: string; canExecute: boolean;
}

export interface CodexExecutionContextSummary {
  contractLabel: string;
  contractPath: string;
  contractRevision: number | string;
  reportPath: string;
  reportRevision: number | string;
}

export function WorkCardImplementShell({
  codexExecution,
  documentError,
  feedback,
  isCodexActionRunning,
  context,
  modelSelection,
  navigation,
  onCancelCodex,
  onRespondToCodexApproval,
  onRespondToCodexMcpElicitation,
  onRespondToCodexUserInput,
  onResolveEnvironment,
  onRunCodex,
}: {
  codexExecution: ImplementExecutionPresentation | null;
  documentError: string;
  feedback: string;
  isCodexActionRunning: boolean;
  context: WorkCardImplementContext | null;
  modelSelection: ImplementModelSelection;
  navigation?: ReactNode;
  onCancelCodex: () => void;
  onRespondToCodexApproval: (requestId: string, decision: "approve" | "deny") => void;
  onRespondToCodexMcpElicitation: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
  onRespondToCodexUserInput: (requestId: string, answers: Record<string, string[]>) => void;
  onResolveEnvironment: () => void;
  onRunCodex: (selection: CodexModelSelection) => void;
}): JSX.Element {
  const projection = context;
  const contractLabel = projection?.implementationContractLabel ?? "Approved Work Card Contract";
  const revisionLabel = projection?.implementationContractType === "repair-work-card" ? "Repair Revision" : "Formal Revision";
  const codexContext = projection
    ? {
        contractLabel,
        contractPath: projection.formalWorkCardPath,
        contractRevision: projection.formalWorkCardRevision,
        reportPath: projection.implementerReportPath,
        reportRevision: projection.report?.artifactRevision ?? "Pending",
      }
    : undefined;
  const terminalFeedback = codexTerminalFeedback(codexExecution);
  const identity = `${projection?.formalWorkCardPath}:${projection?.implementerReportPath}`;
  const [tab, selectTab] = usePresentationTab(identity, "Implement");

  return (
    <section className="work-card-building-workspace" aria-label="Work Card Implement and Codex Execution">
      <section className="work-card-building-context" aria-label="Implement context and controls">
        <PresentationTabs label="Implement pane" tabs={["Implement", "Context"]} selected={tab} onSelect={selectTab} />
        <div className="implement-tab-body" role="tabpanel" aria-label={tab}>
        {tab === "Context" ? <>
        <header>
          <div>
            <span>Current Work Card</span>
            <h2>{projection?.workCardId ?? "Work Card"}</h2>
          </div>
          <strong>{projection?.workCardTitle ?? "Implement"}</strong>
        </header>
        <dl>
          <div>
            <dt>{contractLabel}</dt>
            <dd>{projection?.formalWorkCardPath ?? "Resolve current Approved Work Card Contract."}</dd>
          </div>
          <div>
            <dt>{revisionLabel}</dt>
            <dd>{projection?.formalWorkCardRevision ?? "Waiting"}</dd>
          </div>
          {projection?.parentWorkCardId ? (
            <div>
              <dt>Parent Work Card</dt>
              <dd>{projection.parentWorkCardId}</dd>
            </div>
          ) : null}
          <div>
            <dt>Implementer Report Target</dt>
            <dd>{projection?.implementerReportPath ?? "Resolve report target."}</dd>
          </div>
          <div>
            <dt>Report Status</dt>
            <dd>{projection?.report?.disposition ?? (projection?.reportMissing ? "Missing" : "Waiting")}</dd>
          </div>
          <div>
            <dt>Report Revision</dt>
            <dd>{projection?.report?.artifactRevision ?? "Waiting"}</dd>
          </div>
        </dl>
        <dl>
          <div><dt>Source Mode</dt><dd>{codexExecution?.sourceMode ?? "Waiting"}</dd></div>
          <div><dt>Checkpoint</dt><dd>{codexExecution?.checkpoint?.status ?? "Waiting"}</dd></div>
        </dl>
        </> : <>
        <dl>
          <div>
            <dt>Report Readiness</dt>
            <dd>{projection?.reportReadiness ?? "Waiting"}</dd>
          </div>
          <div>
            <dt>Readiness Reason</dt>
            <dd>{projection?.reportReadinessReason ?? "Waiting"}</dd>
          </div>
        </dl>
        <DevelopmentEnvironmentStatus execution={codexExecution} />
        <LastRunSummary execution={codexExecution} />
        {projection?.reportReadError ? (
          <div className="document-error" role="status">{projection.reportReadError}</div>
        ) : null}
        {projection ? (
          <CodexExecutionActions
            modelSelection={modelSelection}
            canRunOverride={projection.canExecute}
            runLabel="Implement"
            execution={codexExecution}
            isActionRunning={isCodexActionRunning}
            onCancel={onCancelCodex}
            onResolveEnvironment={onResolveEnvironment}
            onRun={onRunCodex}
          />
        ) : null}
        </>}
        {feedback ? <div className={`document-feedback${feedback === terminalFeedback?.message ? ` ${terminalFeedback.tone}` : ""}`} role="status">{feedback}</div> : null}
        {documentError ? <div className="document-error" role="status">{documentError}</div> : null}
        </div>
      </section>

      <CodexExecutionConsole
        presentationIdentity={identity}
        modelSelection={modelSelection}
        contextSummary={codexContext}
        execution={codexExecution}
        isActionRunning={isCodexActionRunning}
        onRespondToCodexApproval={onRespondToCodexApproval}
        onRespondToCodexMcpElicitation={onRespondToCodexMcpElicitation}
        onRespondToCodexUserInput={onRespondToCodexUserInput}
        postRunFeedback={terminalFeedback}
      />
      {navigation ? <footer className="work-card-implement-footer">{navigation}</footer> : null}
    </section>
  );
}

export function DevelopmentEnvironmentStatus({
  execution,
}: {
  execution: ImplementExecutionPresentation | null;
}): JSX.Element | null {
  const preflight = execution?.developmentEnvironmentPreflight;
  if (!preflight) {
    return null;
  }
  const label = developmentEnvironmentStatusLabel(preflight);
  return (
    <section className="development-environment-status" aria-label="Development environment preflight status">
      <div>
        <span>Development Environment</span>
        <strong>{label}</strong>
      </div>
      <small>{preflight.summary}</small>
      {preflight.state !== "ready" && preflight.state !== "not-required" ? (
        <strong className="development-environment-implementation-note">
          Work Card implementation has not started. Development environment preparation must complete first.
        </strong>
      ) : null}
      {preflight.requirements.length ? (
        <ul className="development-environment-requirements">
          {preflight.requirements.map((requirement) => (
            <li key={`${requirement.capabilityId}-${requirement.requestedProfile ?? "default"}`}>
              <div>
                <strong>{requirement.capabilityId}</strong>
                <span>{[
                  requirement.requestedVersionConstraint,
                  requirement.requestedProfile,
                ].filter(Boolean).join(" / ") || "default request"}</span>
              </div>
              <div>
                <span>{`state: ${requirement.beforeState} -> ${requirement.afterState}`}</span>
                <span>{`last stage: ${stageForRequirement(requirement)}`}</span>
                <span>{recoveryLabelForRequirement(requirement)}</span>
              </div>
              {requirement.detectedVersion || requirement.detectedProfile || requirement.blocker || requirement.humanInteractionReason ? (
                <p>
                  {[
                    requirement.detectedVersion ? `version ${requirement.detectedVersion}` : null,
                    requirement.detectedProfile ? `profile ${requirement.detectedProfile}` : null,
                    requirement.humanInteractionReason,
                    requirement.blocker,
                  ].filter(Boolean).join(" | ")}
                </p>
              ) : null}
              {requirement.commandSummaries.length ? (
                <details>
                  <summary>Command evidence</summary>
                  <ul>
                    {requirement.commandSummaries.slice(-3).map((command, index) => (
                      <li key={`${command.command}-${index}`}>
                        <span>{command.command}</span>
                        <span>{`exit: ${command.exitCode ?? "none"}`}</span>
                        {command.stderr ? <code>{command.stderr}</code> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function stageForRequirement(
  requirement: NonNullable<ImplementExecutionPresentation["developmentEnvironmentPreflight"]>["requirements"][number],
): string {
  if (requirement.humanInteractionKind === "windows-permission") {
    return "elevation";
  }
  if (requirement.actionTaken === "install" || requirement.actionTaken === "configure") {
    return requirement.afterState === "satisfied" ? "verification" : "provisioning";
  }
  const latestProviderStage = requirement.providerAttempts?.at(-1)?.stage;
  if (latestProviderStage) {
    return latestProviderStage;
  }
  if (requirement.actionTaken === "repair-winget") {
    return "refresh";
  }
  return "discovery";
}

function recoveryLabelForRequirement(
  requirement: NonNullable<ImplementExecutionPresentation["developmentEnvironmentPreflight"]>["requirements"][number],
): string {
  if (requirement.afterState === "satisfied" && !requirement.blocker && !requirement.humanInteractionKind) {
    return "verified";
  }
  if (requirement.humanInteractionKind === "restart-required") {
    return "restart required";
  }
  if (requirement.humanInteractionKind === "windows-permission") {
    return "Windows permission required";
  }
  if (requirement.retryAllowed) {
    return requirement.blockerKind === "ambiguous-package" || requirement.blockerKind === "provider-resolution-required"
      ? "Resolve Environment available"
      : "retry available";
  }
  return "blocked";
}

function developmentEnvironmentStatusLabel(
  preflight: NonNullable<ImplementExecutionPresentation["developmentEnvironmentPreflight"]>,
): string {
  switch (preflight.state) {
    case "not-required":
      return "Not required";
    case "checking":
      return "Preparing development environment...";
    case "provisioning":
      return "Installing required development tools...";
    case "resolution-required":
      return "Environment resolution required";
    case "ready":
      return "Development environment ready.";
    case "waiting-for-operator":
      return waitingDevelopmentEnvironmentStatusLabel(preflight);
    case "blocked":
      return "Development environment blocked";
  }
}

function waitingDevelopmentEnvironmentStatusLabel(
  preflight: NonNullable<ImplementExecutionPresentation["developmentEnvironmentPreflight"]>,
): string {
  const kinds = new Set(preflight.requirements.map((requirement) => requirement.humanInteractionKind).filter(Boolean));
  const hasPermission = kinds.has("windows-permission");
  const hasRestart = kinds.has("restart-required");
  if (hasPermission && hasRestart) {
    return "Windows permission and restart required.";
  }
  if (hasRestart) {
    return "Windows restart required.";
  }
  return "Windows permission required.";
}

export function LastRunSummary({
  execution,
}: {
  execution: ImplementExecutionPresentation | null;
}): JSX.Element {
  const lastRunState = execution?.lastRunState ?? null;
  const preflight = execution?.developmentEnvironmentPreflight;
  const retryState = execution?.executionKind === "environment-resolution" && lastRunState
    ? preflight?.state === "ready" || preflight?.state === "not-required"
      ? "Ready to run Work Card implementation"
      : preflight?.summary ?? execution.retryBlocker ?? "Development environment preparation is incomplete."
    : execution?.canRunAgain
      ? "Ready to run again"
      : execution?.retryBlocker ?? "Waiting for Codex preflight.";
  return (
    <section className="codex-last-run-summary" aria-label="Last Codex run summary">
      <span>Last Run</span>
      <strong>{lastRunState ?? "No terminal run yet"}</strong>
      <small>{retryState}</small>
    </section>
  );
}

export function CodexExecutionActions({
  modelSelection,
  canRunOverride = true,
  execution,
  isActionRunning,
  onCancel,
  onResolveEnvironment,
  onRun,
  runLabel = "Run Codex Implementer",
}: {
  modelSelection: ImplementModelSelection;
  canRunOverride?: boolean;
  execution: ImplementExecutionPresentation | null;
  isActionRunning: boolean;
  onCancel: () => void;
  onResolveEnvironment?: () => void;
  onRun: (selection: CodexModelSelection) => void;
  runLabel?: string;
}): JSX.Element {

  const state = execution?.state ?? "unavailable";
  const canRun = Boolean(execution?.canRunAgain) && canRunOverride && !isActionRunning && state !== "running" && state !== "unavailable";
  const canResolveEnvironment = Boolean(onResolveEnvironment && execution?.canResolveEnvironment) && !isActionRunning;
  const isRunning = state === "running";

  return (
    <div className="codex-execution-controls" aria-label="Codex execution controls">
      {modelSelection.controls}
      <div className="codex-execution-actions">
        <button
          className="apply-button codex-command"
          disabled={!canRun || !modelSelection.canRun}
          onClick={() => { if (canRun && modelSelection.canRun && modelSelection.selection) onRun({ ...modelSelection.selection }); }}
          type="button"
        >
          <Play aria-hidden="true" size={16} />
          {runLabel}
        </button>
        {onResolveEnvironment && execution?.developmentEnvironmentPreflight?.state === "resolution-required" ? (
          <button
            className="apply-button codex-command secondary"
            disabled={!canResolveEnvironment}
            onClick={onResolveEnvironment}
            type="button"
          >
            <Wrench aria-hidden="true" size={16} />
            Resolve Environment
          </button>
        ) : null}
        {isRunning ? (
        <button
          className="apply-button codex-command secondary"
          disabled={isActionRunning}
          onClick={onCancel}
          type="button"
        >
          <Square aria-hidden="true" size={16} />
          Cancel Codex Run
        </button>
        ) : null}
      </div>
    </div>
  );
}

export function CodexExecutionConsole({
  presentationIdentity,
  contextSummary,
  modelSelection,
  execution,
  isActionRunning,
  onRespondToCodexMcpElicitation,
  onRespondToCodexApproval,
  onRespondToCodexUserInput,
  postRunFeedback,
  postRunMessage,
}: {
  presentationIdentity?: string;
  contextSummary?: CodexExecutionContextSummary;
  modelSelection: ImplementModelSelection;
  execution: ImplementExecutionPresentation | null;
  isActionRunning: boolean;
  onRespondToCodexMcpElicitation: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
  onRespondToCodexApproval: (requestId: string, decision: "approve" | "deny") => void;
  onRespondToCodexUserInput: (requestId: string, answers: Record<string, string[]>) => void;
  postRunFeedback?: ReturnType<typeof codexTerminalFeedback>;
  postRunMessage?: string | null;
}): JSX.Element {

  const state = execution?.state ?? "unavailable";
  const availability = codexImplementerAvailabilityLabel(execution);
  const integrationRepair = execution?.executionKind === "integration-repair";
  const executionLabel = integrationRepair ? "Integration Repair" : execution?.executionKind === "environment-resolution"
    ? "Environment Resolution" : "Work Card Implementation";
  const reportUpdated = execution?.reportUpdated ? "Updated" : "Not updated";
  const pending = Boolean(execution?.pendingApproval || execution?.pendingUserInput || execution?.pendingMcpElicitation);
  const identity = `${presentationIdentity ?? contextSummary?.reportPath ?? ""}:${execution?.workflowId}:${execution?.workItemId}:${execution?.startedAt}`;
  const [tab, selectTab] = usePresentationTab(identity, pending ? "Interaction" : "Status");

  return (
    <section className="codex-execution-panel" aria-label="Codex execution console">
      <PresentationTabs label="Execution pane" tabs={["Status", "Interaction", "Diagnostics"]} selected={tab} onSelect={selectTab} pending={pending ? "Interaction" : undefined} />
      <div className="implement-tab-body" role="tabpanel" aria-label={tab}>
      {tab === "Status" ? <>
      <header>
        <div>
          <span>Codex Availability</span>
          <strong>{availability}</strong>
        </div>
        <div>
          <span>Run Type</span>
          <strong>{executionLabel}</strong>
        </div>
      </header>
      <dl>
        <div>
          <dt>State</dt>
          <dd>{state}</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{formatElapsed(execution?.elapsedMs)}</dd>
        </div>
        {!integrationRepair && execution?.executionKind !== "environment-resolution" ? <div>
          <dt>Report Update</dt>
          <dd>{reportUpdated}</dd>
        </div> : null}
      </dl>
      {execution?.failureReason && !postRunFeedback ? (
        <div className="codex-execution-message error" role="status">{execution.failureReason}</div>
      ) : null}
      {execution?.checkpoint ? <div className={`codex-execution-message ${execution.checkpoint.status === "committed" ? "success" : execution.checkpoint.status === "blocked" ? "error" : execution.checkpoint.status === "not-required" ? "neutral" : "warning"}`} role="status">
        Source checkpoint: {execution.checkpoint.status}. {execution.checkpoint.message}
        {execution.checkpoint.commit ? <p>Commit: <code>{execution.checkpoint.commit}</code></p> : null}
      </div> : null}
      {execution?.retryBlocker && !execution.canRunAgain ? (
        <div className="codex-execution-message error" role="status">{execution.retryBlocker}</div>
      ) : null}
      {postRunFeedback ? (
        <div className={`codex-execution-message ${postRunFeedback.tone}`} role="status">{postRunFeedback.message}</div>
      ) : null}
      {postRunMessage ? (
        <div className="codex-execution-message" role="status">{postRunMessage}</div>
      ) : null}
      </> : tab === "Interaction" ? <>
      {!pending ? <p>No interaction pending.</p> : null}
      {execution?.pendingApproval ? (
        <CodexApprovalPanel
          disabled={isActionRunning}
          onSubmit={onRespondToCodexApproval}
          pending={execution.pendingApproval}
        />
      ) : null}
      {execution?.pendingUserInput ? (
        <CodexUserInputPanel
          disabled={isActionRunning}
          pending={execution.pendingUserInput}
          onSubmit={onRespondToCodexUserInput}
        />
      ) : null}
      {execution?.pendingMcpElicitation ? (
        <CodexMcpElicitationPanel
          disabled={isActionRunning}
          onSubmit={onRespondToCodexMcpElicitation}
          pending={execution.pendingMcpElicitation}
        />
      ) : null}
      </> : <>
      {execution?.runtimeState ? (
        <RuntimeDiagnostics runtimeState={execution.runtimeState} approvalCount={execution.approvalTail.length} />
      ) : null}
      {execution?.approvalTail.length ? (
        <TailBlock
          label="Approval Tail"
          values={execution.approvalTail.map((approval) =>
            `${approval.type} ${approval.decision} ${approval.completed ? "completed" : "pending"} ${approval.requestId}`
          )}
        />
      ) : null}
      {execution?.runtimeDenialTail.length ? (
        <TailBlock label="Runtime Denial Tail" values={execution.runtimeDenialTail} />
      ) : null}
      {execution?.eventTail.length ? (
        <TailBlock label="Event Tail" values={execution.eventTail} />
      ) : null}
      {execution?.stderrTail.length ? (
        <TailBlock label="Error Tail" values={execution.stderrTail} />
      ) : null}
      {execution?.finalResponseTail.length ? (
        <TailBlock label="Final Response Tail" values={execution.finalResponseTail} />
      ) : null}
      </>}
      </div>
    </section>
  );
}

function CodexApprovalPanel({
  disabled,
  onSubmit,
  pending,
}: {
  disabled: boolean;
  onSubmit: (requestId: string, decision: "approve" | "deny") => void;
  pending: NonNullable<ImplementExecutionPresentation["pendingApproval"]>;
}): JSX.Element {
  return (
    <section className="codex-user-input-panel codex-approval-panel" aria-label="Codex approval request">
      <header>
        <span>Codex Approval Required</span>
        <strong>{approvalTypeLabel(pending.type)}</strong>
      </header>
      <p>{pending.impactSummary}</p>
      <dl>
        <div>
          <dt>Request</dt>
          <dd>{pending.requestId}</dd>
        </div>
        <div>
          <dt>Turn</dt>
          <dd>{pending.turnId ?? "Uncorrelated"}</dd>
        </div>
      </dl>
      {pending.commandDisplay ? (
        <div className="codex-approval-detail">
          <span>Proposed Command</span>
          <code>{pending.commandDisplay}</code>
        </div>
      ) : null}
      {pending.fileChangeSummary ? (
        <div className="codex-approval-detail">
          <span>Affected Files</span>
          <code>{pending.fileChangeSummary}</code>
        </div>
      ) : null}
      {pending.permissionSummary ? (
        <div className="codex-approval-detail">
          <span>Requested Permission</span>
          <code>{pending.permissionSummary}</code>
        </div>
      ) : null}
      <div className="codex-approval-actions">
        <button
          className="apply-button codex-command"
          disabled={disabled}
          onClick={() => onSubmit(pending.requestId, "approve")}
          type="button"
        >
          Approve Once
        </button>
        <button
          className="apply-button codex-command secondary"
          disabled={disabled}
          onClick={() => onSubmit(pending.requestId, "deny")}
          type="button"
        >
          Deny
        </button>
      </div>
    </section>
  );
}

function approvalTypeLabel(type: NonNullable<ImplementExecutionPresentation["pendingApproval"]>["type"]): string {
  switch (type) {
    case "command":
      return "Command";
    case "file-change":
      return "File Change";
    case "permission":
      return "Permission";
  }
}

function CodexUserInputPanel({
  disabled,
  pending,
  onSubmit,
}: {
  disabled: boolean;
  pending: NonNullable<ImplementExecutionPresentation["pendingUserInput"]>;
  onSubmit: (requestId: string, answers: Record<string, string[]>) => void;
}): JSX.Element {
  return <CodexBoundedUserInputPanel disabled={disabled} label="Codex" pending={pending} onSubmit={onSubmit} />;
}

function CodexMcpElicitationPanel({
  disabled,
  pending,
  onSubmit,
}: {
  disabled: boolean;
  pending: NonNullable<ImplementExecutionPresentation["pendingMcpElicitation"]>;
  onSubmit: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
}): JSX.Element {
  return <CodexBoundedMcpElicitationPanel disabled={disabled} pending={pending} onSubmit={onSubmit} />;
}

function RuntimeDiagnostics({
  approvalCount,
  runtimeState,
}: {
  approvalCount: number;
  runtimeState: NonNullable<ImplementExecutionPresentation["runtimeState"]>;
}): JSX.Element {
  const capabilities = runtimeState.capabilitySummary;
  return (
    <section className="codex-runtime-diagnostics" aria-label="Codex runtime diagnostics">
      <dl>
        <div>
          <dt>Runtime</dt>
          <dd>{runtimeState.userAgent ?? "Waiting"}</dd>
        </div>
        <div>
          <dt>Codex Home</dt>
          <dd>{runtimeState.codexHome ?? "Waiting"}</dd>
        </div>
        <div>
          <dt>CWD</dt>
          <dd>{runtimeState.cwd ?? "Waiting"}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{[runtimeState.model, runtimeState.reasoningEffort].filter(Boolean).join(" / ") || "Waiting"}</dd>
        </div>
        <div>
          <dt>Policy</dt>
          <dd>{[runtimeState.sandbox, runtimeState.approvalPolicy, runtimeState.approvalsReviewer].filter(Boolean).join(" / ") || "Waiting"}</dd>
        </div>
        <div>
          <dt>Approvals</dt>
          <dd>{approvalCount}</dd>
        </div>
        <div>
          <dt>Capabilities</dt>
          <dd>
            {[
              capabilityLabel("config", capabilities.configRead),
              capabilityLabel("mcp", capabilities.mcpServers),
              capabilityLabel("skills", capabilities.skills),
              capabilityLabel("apps", capabilities.apps),
              capabilityLabel("plugins", capabilities.plugins),
            ].join(" | ")}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function capabilityLabel(
  label: string,
  capability: NonNullable<ImplementExecutionPresentation["runtimeState"]>["capabilitySummary"]["configRead"],
): string {
  const count = typeof capability.count === "number" ? ` ${capability.count}` : "";
  const detail = capability.details.length
    ? ` ${capability.details.join(", ")}`
    : capability.summary && capability.summary !== "Observed through Codex App Server."
      ? ` ${capability.summary}`
      : "";
  return `${label}: ${capability.state}${count}${detail}`;
}

function TailBlock({
  label,
  values,
}: {
  label: string;
  values: string[];
}): JSX.Element {
  return (
    <div className="codex-tail">
      <span>{label}</span>
      <pre>{values.join("\n")}</pre>
    </div>
  );
}

function formatElapsed(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "Waiting";
  }
  const seconds = Math.floor(value / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export interface CodexTerminalFeedback {
  message: string;
  tone: "success" | "warning" | "error";
}

export function codexTerminalFeedback(
  execution: ImplementExecutionPresentation | null,
): CodexTerminalFeedback | null {
  if (!execution || !["completed", "failed", "cancelled"].includes(execution.state)) {
    return null;
  }
  if (execution.state === "failed") {
    return { message: execution.failureReason ?? "Codex execution failed.", tone: "error" };
  }
  if (execution.state === "cancelled") {
    return { message: execution.failureReason ?? "Codex execution was cancelled.", tone: "warning" };
  }
  if (execution.executionKind === "environment-resolution") {
    const preflight = execution.developmentEnvironmentPreflight;
    if (preflight?.state === "ready" || preflight?.state === "not-required") {
      return {
        message: "Environment Resolution completed. Development environment is ready. Work Card implementation can now start.",
        tone: "success",
      };
    }
    return {
      message: `Environment Resolution completed, but development environment preparation is still incomplete: ${preflight?.summary ?? "Deterministic preflight has not confirmed readiness."}`,
      tone: "warning",
    };
  }
  if (execution.failureReason) {
    return { message: execution.failureReason, tone: "warning" };
  }
  return execution.reportUpdated
    ? { message: "Codex execution finished. Review the existing Implementer Report.", tone: "success" }
    : { message: "Codex completed, but the Implementer Report was not updated.", tone: "warning" };
}

/** Local presentation state is reset synchronously when the inspected identity changes. */
function usePresentationTab(identity: string, defaultTab: string): [string, (tab: string) => void] {
  const [selection, setSelection] = useState({ identity, tab: defaultTab });
  if (selection.identity !== identity) setSelection({ identity, tab: defaultTab });
  return [selection.identity === identity ? selection.tab : defaultTab, tab => setSelection({ identity, tab })];
}

function PresentationTabs({label, tabs, selected, onSelect, pending}: {
  label: string; tabs: string[]; selected: string; onSelect: (tab: string) => void; pending?: string;
}): JSX.Element {
  return <div className="figma-document-tabs implement-tabs" role="tablist" aria-label={label}>
    {tabs.map(tab => <button key={tab} type="button" role="tab" aria-selected={selected === tab}
      className={selected === tab ? "active" : ""} onClick={() => onSelect(tab)}>
      {tab}{pending === tab ? <strong className="implement-interaction-pending">Action required</strong> : null}
    </button>)}
  </div>;
}
