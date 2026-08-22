import { useState } from "react";
import { Play, Square, Wrench } from "lucide-react";
import type {
  CodexImplementerExecutionModel,
  CurrentWorkspaceModel,
  RuntimeActionResult,
} from "../../shared/workspaceContracts";
import {
  codexImplementerAvailabilityLabel,
} from "../../shared/workspaceContracts";

export function WorkCardBuildingReviewWorkspace({
  codexExecution,
  documentError,
  feedback,
  isCodexActionRunning,
  model,
  onCancelCodex,
  onCreateReport,
  onRespondToCodexMcpElicitation,
  onRespondToCodexUserInput,
  onResolveEnvironment,
  onRunCodex,
}: {
  codexExecution: CodexImplementerExecutionModel | null;
  documentError: string;
  feedback: string;
  isCodexActionRunning: boolean;
  model: CurrentWorkspaceModel | null;
  onCancelCodex: () => void;
  onCreateReport: () => Promise<RuntimeActionResult | void>;
  onRespondToCodexMcpElicitation: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
  onRespondToCodexUserInput: (requestId: string, answers: Record<string, string[]>) => void;
  onResolveEnvironment: () => void;
  onRunCodex: () => void;
}): JSX.Element {
  const projection = model?.workCardBuildingReview;
  const reportIsPending = projection?.report?.disposition === "Pending";
  const contractLabel = projection?.implementationContractLabel ?? "Approved Work Card Contract";
  const revisionLabel = projection?.implementationContractType === "repair-work-card" ? "Repair Revision" : "Formal Revision";

  return (
    <section className="work-card-building-workspace" aria-label="Work Card Implement and Codex Execution">
      <section className="work-card-building-context" aria-label="Implement context and controls">
        <header>
          <div>
            <span>Current Work Card</span>
            <h2>{projection?.workCardId ?? model?.currentWorkCardId ?? "Work Card"}</h2>
          </div>
          <strong>{projection?.workCardTitle ?? model?.currentTarget ?? "Implement"}</strong>
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
        {projection?.reportMissing ? (
          <button className="apply-button" onClick={() => void onCreateReport()} type="button">
            Create Implementer Report
          </button>
        ) : null}
        {!projection?.reportMissing && reportIsPending ? (
          <CodexExecutionActions
            execution={codexExecution}
            isActionRunning={isCodexActionRunning}
            onCancel={onCancelCodex}
            onResolveEnvironment={onResolveEnvironment}
            onRun={onRunCodex}
          />
        ) : null}
        {feedback ? <div className="document-feedback" role="status">{feedback}</div> : null}
        {documentError ? <div className="document-error" role="status">{documentError}</div> : null}
      </section>

      <CodexExecutionConsole
        execution={codexExecution}
        isActionRunning={isCodexActionRunning}
        onRespondToCodexMcpElicitation={onRespondToCodexMcpElicitation}
        onRespondToCodexUserInput={onRespondToCodexUserInput}
        projection={projection}
      />
    </section>
  );
}

function DevelopmentEnvironmentStatus({
  execution,
}: {
  execution: CodexImplementerExecutionModel | null;
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
  requirement: NonNullable<CodexImplementerExecutionModel["developmentEnvironmentPreflight"]>["requirements"][number],
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
  requirement: NonNullable<CodexImplementerExecutionModel["developmentEnvironmentPreflight"]>["requirements"][number],
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
  preflight: NonNullable<CodexImplementerExecutionModel["developmentEnvironmentPreflight"]>,
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
  preflight: NonNullable<CodexImplementerExecutionModel["developmentEnvironmentPreflight"]>,
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

function LastRunSummary({
  execution,
}: {
  execution: CodexImplementerExecutionModel | null;
}): JSX.Element {
  const lastRunState = execution?.lastRunState ?? null;
  const retryState = execution?.canRunAgain
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

function CodexExecutionActions({
  execution,
  isActionRunning,
  onCancel,
  onResolveEnvironment,
  onRun,
}: {
  execution: CodexImplementerExecutionModel | null;
  isActionRunning: boolean;
  onCancel: () => void;
  onResolveEnvironment: () => void;
  onRun: () => void;
}): JSX.Element {
  const state = execution?.state ?? "unavailable";
  const canRun = Boolean(execution?.canRunAgain) && !isActionRunning;
  const canResolveEnvironment = Boolean(execution?.canResolveEnvironment) && !isActionRunning;
  const isRunning = state === "running";

  return (
    <div className="codex-execution-controls" aria-label="Codex execution controls">
      <div className="codex-execution-actions">
        <button
          className="apply-button codex-command"
          disabled={!canRun}
          onClick={onRun}
          type="button"
        >
          <Play aria-hidden="true" size={16} />
          Run Codex Implementer
        </button>
        {execution?.developmentEnvironmentPreflight?.state === "resolution-required" ? (
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

function CodexExecutionConsole({
  execution,
  isActionRunning,
  onRespondToCodexMcpElicitation,
  onRespondToCodexUserInput,
  projection,
}: {
  execution: CodexImplementerExecutionModel | null;
  isActionRunning: boolean;
  onRespondToCodexMcpElicitation: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
  onRespondToCodexUserInput: (requestId: string, answers: Record<string, string[]>) => void;
  projection: CurrentWorkspaceModel["workCardBuildingReview"] | undefined;
}): JSX.Element {
  const state = execution?.state ?? "unavailable";
  const availability = codexImplementerAvailabilityLabel(execution);
  const executionLabel = execution?.executionKind === "environment-resolution"
    ? "Environment Resolution"
    : "Work Card Implementation";
  const reportUpdated = execution?.reportUpdated ? "Updated" : "Not updated";
  const postRunMessage = terminalPostRunMessage(execution, projection);

  return (
    <section className="codex-execution-panel" aria-label="Codex execution console">
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
          <dt>Work Card Contract</dt>
          <dd>{projection ? `${projection.formalWorkCardPath} revision ${projection.formalWorkCardRevision}` : "Waiting"}</dd>
        </div>
        <div>
          <dt>Implementer Report</dt>
          <dd>{projection ? `${projection.implementerReportPath} revision ${projection.report?.artifactRevision ?? "Pending"}` : "Waiting"}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{state}</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{formatElapsed(execution?.elapsedMs)}</dd>
        </div>
        <div>
          <dt>Report Update</dt>
          <dd>{reportUpdated}</dd>
        </div>
      </dl>
      {execution?.failureReason && !execution.developmentEnvironmentPreflight ? (
        <div className="codex-execution-message error" role="status">{execution.failureReason}</div>
      ) : null}
      {execution?.retryBlocker && !execution.canRunAgain ? (
        <div className="codex-execution-message error" role="status">{execution.retryBlocker}</div>
      ) : null}
      {postRunMessage ? (
        <div className="codex-execution-message" role="status">{postRunMessage}</div>
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
    </section>
  );
}

function CodexUserInputPanel({
  disabled,
  pending,
  onSubmit,
}: {
  disabled: boolean;
  pending: NonNullable<CodexImplementerExecutionModel["pendingUserInput"]>;
  onSubmit: (requestId: string, answers: Record<string, string[]>) => void;
}): JSX.Element {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const currentAnswers = Object.fromEntries(
    pending.questions.map((question) => [question.id, [answers[question.id] ?? ""]]),
  );
  const canSubmit = pending.questions.every((question) => (answers[question.id] ?? "").trim().length > 0);

  return (
    <section className="codex-user-input-panel" aria-label="Codex input request">
      <header>
        <span>Codex Input</span>
        <strong>{pending.questions.length} question(s)</strong>
      </header>
      {pending.questions.map((question) => (
        <label key={question.id}>
          <span>{question.header}</span>
          <strong>{question.question}</strong>
          {question.options.length ? (
            <select
              disabled={disabled}
              onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
              value={answers[question.id] ?? ""}
            >
              <option value="">Select</option>
              {question.options.map((option) => (
                <option key={`${question.id}-${option.label}`} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              disabled={disabled}
              onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
              value={answers[question.id] ?? ""}
            />
          )}
        </label>
      ))}
      <button
        className="apply-button codex-command"
        disabled={disabled || !canSubmit}
        onClick={() => onSubmit(pending.requestId, currentAnswers)}
        type="button"
      >
        Submit
      </button>
    </section>
  );
}

function CodexMcpElicitationPanel({
  disabled,
  pending,
  onSubmit,
}: {
  disabled: boolean;
  pending: NonNullable<CodexImplementerExecutionModel["pendingMcpElicitation"]>;
  onSubmit: (
    requestId: string,
    action: "accept" | "decline" | "cancel",
    content: unknown | null,
  ) => void;
}): JSX.Element {
  const [action, setAction] = useState<"accept" | "decline" | "cancel">("accept");
  const [contentText, setContentText] = useState("{}");
  const [parseError, setParseError] = useState("");
  const canSubmit = pending.responseSupported && !disabled;

  function submit(): void {
    setParseError("");
    if (action !== "accept") {
      onSubmit(pending.requestId, action, null);
      return;
    }
    try {
      onSubmit(pending.requestId, action, JSON.parse(contentText) as unknown);
    } catch {
      setParseError("Response content must be valid JSON.");
    }
  }

  return (
    <section className="codex-user-input-panel" aria-label="MCP elicitation input request">
      <header>
        <span>MCP Input</span>
        <strong>{pending.serverName}</strong>
      </header>
      <dl>
        <div>
          <dt>Request</dt>
          <dd>{pending.requestId}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{pending.mode}</dd>
        </div>
        <div>
          <dt>Turn</dt>
          <dd>{pending.turnId ?? "Uncorrelated"}</dd>
        </div>
      </dl>
      <p>{pending.message}</p>
      {pending.url ? <a href={pending.url}>{pending.url}</a> : null}
      <small>{pending.requestedSchemaSummary}</small>
      {pending.fields.length ? (
        <ul className="codex-mcp-fields">
          {pending.fields.map((field) => (
            <li key={field.id}>
              <strong>{field.title}</strong>
              <span>{[field.id, field.type, field.required ? "required" : "optional"].join(" / ")}</span>
              {field.description ? <small>{field.description}</small> : null}
              {field.options.length ? (
                <small>{field.options.map((option) => `${option.label}=${option.value}`).join(", ")}</small>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!pending.responseSupported ? (
        <div className="codex-execution-message error" role="status">
          {pending.unsupportedReason ?? "MCP elicitation response is unavailable for this request."}
        </div>
      ) : (
        <>
          <label>
            <span>Action</span>
            <select
              disabled={disabled}
              onChange={(event) => setAction(event.target.value as "accept" | "decline" | "cancel")}
              value={action}
            >
              <option value="accept">Accept</option>
              <option value="decline">Decline</option>
              <option value="cancel">Cancel</option>
            </select>
          </label>
          {action === "accept" ? (
            <label>
              <span>Content JSON</span>
              <textarea
                disabled={disabled}
                onChange={(event) => setContentText(event.target.value)}
                rows={5}
                value={contentText}
              />
            </label>
          ) : null}
          {parseError ? <div className="codex-execution-message error" role="status">{parseError}</div> : null}
          <button
            className="apply-button codex-command"
            disabled={!canSubmit}
            onClick={submit}
            type="button"
          >
            Submit MCP Input
          </button>
        </>
      )}
    </section>
  );
}

function RuntimeDiagnostics({
  approvalCount,
  runtimeState,
}: {
  approvalCount: number;
  runtimeState: NonNullable<CodexImplementerExecutionModel["runtimeState"]>;
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
  capability: NonNullable<CodexImplementerExecutionModel["runtimeState"]>["capabilitySummary"]["configRead"],
): string {
  const count = typeof capability.count === "number" ? ` ${capability.count}` : "";
  const detail = capability.details.length
    ? ` ${capability.details.join(", ")}`
    : capability.summary && capability.summary !== "Observed through Codex App Server."
      ? ` ${capability.summary}`
      : "";
  return `${label}: ${capability.state}${count}${detail}`;
}

function terminalPostRunMessage(
  execution: CodexImplementerExecutionModel | null,
  projection: CurrentWorkspaceModel["workCardBuildingReview"] | undefined,
): string | null {
  const state = execution?.state ?? "unavailable";
  if (state !== "completed" && state !== "failed" && state !== "cancelled") {
    return null;
  }
  if (execution?.executionKind === "environment-resolution") {
    const preflight = execution.developmentEnvironmentPreflight;
    if (!preflight) {
      return "Environment Resolution completed. Work Card implementation has not run yet.";
    }
    if (preflight.state === "ready" || preflight.state === "not-required") {
      return `Environment Resolution completed. Work Card implementation has not run yet. Post-resolution preflight is ${preflight.state}. Work Card implementation is now eligible to start.`;
    }
    return `Environment Resolution completed. Work Card implementation has not run yet. Environment preparation remains incomplete: ${preflight.summary}`;
  }
  return projection?.reportReadiness === "ready-for-review"
    ? "Review the existing Implementer Report in Review & Validation."
    : "Complete the reserved Implementer Report before Review & Validation.";
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
