import { Play, Square } from "lucide-react";
import type {
  CodexImplementerExecutionModel,
  CurrentWorkspaceModel,
  RuntimeActionResult,
} from "../../shared/workspaceContracts";

export function WorkCardBuildingReviewWorkspace({
  codexExecution,
  documentError,
  feedback,
  isCodexActionRunning,
  model,
  onCancelCodex,
  onCreateReport,
  onRunCodex,
}: {
  codexExecution: CodexImplementerExecutionModel | null;
  documentError: string;
  feedback: string;
  isCodexActionRunning: boolean;
  model: CurrentWorkspaceModel | null;
  onCancelCodex: () => void;
  onCreateReport: () => Promise<RuntimeActionResult | void>;
  onRunCodex: () => void;
}): JSX.Element {
  const projection = model?.workCardBuildingReview;
  const reportIsPending = projection?.report?.disposition === "Pending";

  return (
    <section className="work-card-building-workspace" aria-label="Work Card Build and Codex Execution">
      <section className="work-card-building-context" aria-label="Build context and controls">
        <header>
          <div>
            <span>Current Work Card</span>
            <h2>{projection?.workCardId ?? model?.currentWorkCardId ?? "Work Card"}</h2>
          </div>
          <strong>{projection?.workCardTitle ?? model?.currentTarget ?? "Implementer Build"}</strong>
        </header>
        <dl>
          <div>
            <dt>Approved Formal Work Card</dt>
            <dd>{projection?.formalWorkCardPath ?? "Resolve current Approved Formal Work Card."}</dd>
          </div>
          <div>
            <dt>Formal Revision</dt>
            <dd>{projection?.formalWorkCardRevision ?? "Waiting"}</dd>
          </div>
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
            <dd>
              {[projection?.reportDocumentReadState, projection?.reportFreshnessState]
                .filter(Boolean)
                .join(" / ") || "Waiting"}
            </dd>
          </div>
        </dl>
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
            onRun={onRunCodex}
          />
        ) : null}
        {feedback ? <div className="document-feedback" role="status">{feedback}</div> : null}
        {documentError ? <div className="document-error" role="status">{documentError}</div> : null}
      </section>

      <CodexExecutionConsole execution={codexExecution} projection={projection} />
    </section>
  );
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
  onRun,
}: {
  execution: CodexImplementerExecutionModel | null;
  isActionRunning: boolean;
  onCancel: () => void;
  onRun: () => void;
}): JSX.Element {
  const state = execution?.state ?? "unavailable";
  const canRun = Boolean(execution?.canRunAgain) && !isActionRunning;
  const isRunning = state === "running";

  return (
    <div className="codex-execution-actions" aria-label="Codex execution controls">
      <button
        className="apply-button codex-command"
        disabled={!canRun}
        onClick={onRun}
        type="button"
      >
        <Play aria-hidden="true" size={16} />
        Run Codex Implementer
      </button>
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
  );
}

function CodexExecutionConsole({
  execution,
  projection,
}: {
  execution: CodexImplementerExecutionModel | null;
  projection: CurrentWorkspaceModel["workCardBuildingReview"] | undefined;
}): JSX.Element {
  const state = execution?.state ?? "unavailable";
  const availability =
    execution?.canRunAgain || state === "running" || state === "completed"
      ? "Ready"
      : "Unavailable";
  const reportUpdated = execution?.reportUpdated ? "Updated" : "Not updated";
  const postRunMessage =
    state === "completed" || state === "failed" || state === "cancelled"
      ? "Review the existing Implementer Report in Review & Validation."
      : null;

  return (
    <section className="codex-execution-panel" aria-label="Codex execution console">
      <header>
        <div>
          <span>Codex Availability</span>
          <strong>{availability}</strong>
        </div>
        <div>
          <span>Integration</span>
          <strong>{execution?.integrationMode ?? "sdk"}</strong>
        </div>
      </header>
      <dl>
        <div>
          <dt>Formal Work Card</dt>
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
      {execution?.failureReason ? (
        <div className="codex-execution-message error" role="status">{execution.failureReason}</div>
      ) : null}
      {execution?.retryBlocker && !execution.canRunAgain ? (
        <div className="codex-execution-message error" role="status">{execution.retryBlocker}</div>
      ) : null}
      {postRunMessage ? (
        <div className="codex-execution-message" role="status">{postRunMessage}</div>
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
