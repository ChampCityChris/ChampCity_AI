import { RefreshCw } from "lucide-react";

import type {
  IssueCloseActionInput,
  IssueCloseProjection,
  IssueRecordProjection,
} from "../../shared/issueResolutionContracts";

export function IssueCloseWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  currentIssue,
  isLoading,
  onClose,
  onRefresh,
  projection,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  currentIssue: IssueRecordProjection | null;
  isLoading: boolean;
  onClose: (input: IssueCloseActionInput) => void;
  onRefresh: () => void;
  projection: IssueCloseProjection | null;
}): JSX.Element {
  const validation = projection?.validationBasis;
  const canClose = Boolean(projection?.canCloseIssue && projection.validationBasisSha256) && !actionPending;
  const repositoryError = actionError || projection?.closeRecord.readError || projection?.issueRecordReadError;

  return (
    <section className="issue-close-workspace" aria-labelledby="workspace-heading">
      <header className="issue-resolution-header">
        <div>
          <span>Issue Resolution</span>
          <h1 id="workspace-heading">Issue Close</h1>
          <p>Review the exact current Issue and Approved aggregate validation basis before creating final Issue-level closure.</p>
        </div>
        <button className="icon-button text-button" disabled={actionPending || isLoading} onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          {isLoading ? "Refreshing" : "Refresh"}
        </button>
      </header>

      <section className="issue-validation-basis-summary" aria-label="Issue Close record">
        <div>
          <span>Issue</span>
          <strong>{currentIssue ? `${currentIssue.issueId}: ${currentIssue.title}` : "No Issue selected"}</strong>
        </div>
        <div>
          <span>Closure State</span>
          <strong>{projection?.workflowStatus.stateLabel ?? (isLoading ? "Loading" : "Unavailable")}</strong>
        </div>
        <div>
          <span>Approved Validation</span>
          <strong>{validation ? `ATTEMPT${String(validation.attemptNumber).padStart(2, "0")} / ${validation.decision}` : "Unavailable"}</strong>
        </div>
        <div>
          <span>Close Record</span>
          <strong>{`${projection?.closeRecord.state ?? "missing"} / revision ${projection?.closeRecord.revision ?? "-"}`}</strong>
        </div>
        <p>{projection?.statusMessage ?? "Loading repository-derived Issue Close record."}</p>
      </section>

      {repositoryError ? <p className="inline-error" role="alert">{repositoryError}</p> : null}
      {actionFeedback ? <p className="inline-feedback" role="status">{actionFeedback}</p> : null}

      <section className="issue-close-evidence-grid" aria-label="Issue closure evidence">
        <article className="issue-close-evidence-card">
          <header>
            <strong>Original Issue Problem and Record</strong>
            <span>{projection?.issueRecordPath ?? currentIssue?.recordPath ?? "Unavailable"}</span>
          </header>
          <pre>{projection?.issueRecordMarkdown ?? currentIssue?.bodyMarkdown ?? "Issue evidence is unavailable."}</pre>
        </article>

        <article className="issue-close-evidence-card">
          <header>
            <strong>Approved Aggregate Issue Validation</strong>
            <span>{validation?.recordPath ?? "Unavailable"}</span>
          </header>
          {validation ? (
            <dl>
              <div><dt>Result</dt><dd>{validation.decision}</dd></div>
              <div><dt>Disposition</dt><dd>{validation.disposition}</dd></div>
              <div><dt>Attempt</dt><dd>{validation.attemptNumber}</dd></div>
              <div><dt>Revision</dt><dd>{validation.recordRevision}</dd></div>
              <div><dt>Operator outcome / notes</dt><dd>{validation.operatorNotes ?? "No additional Operator notes."}</dd></div>
            </dl>
          ) : <p>No current Approved ValidateResolved validation basis is available.</p>}
          <pre>{validation?.recordMarkdown ?? "Approved aggregate validation evidence is unavailable."}</pre>
        </article>
      </section>

      <section className="issue-validation-close-summary" aria-label="Ordered completed Fix Card close record summary">
        <header>
          <strong>Ordered Completed Fix Card Summary</strong>
          <span>{`${projection?.completedFixCards.length ?? 0} current close records`}</span>
        </header>
        {projection?.completedFixCards.length ? (
          <ol>
            {projection.completedFixCards.map((entry) => (
              <li key={entry.fixCardId}>
                <div>
                  <strong>{`${String(entry.order).padStart(2, "0")} ${entry.fixCardId}`}</strong>
                  <span>{entry.title}</span>
                </div>
                <dl>
                  <div><dt>Close record</dt><dd>{entry.closeRecordPath}</dd></div>
                  <div><dt>Origin</dt><dd>{entry.closeRecordOrigin}</dd></div>
                  <div><dt>Implementation evidence</dt><dd>{entry.currentImplementationId}</dd></div>
                  {entry.repairId ? <div><dt>Repair evidence</dt><dd>{entry.repairId}</dd></div> : null}
                </dl>
              </li>
            ))}
          </ol>
        ) : <p>No complete current Fix Card close-record summary is available.</p>}
      </section>

      <section className="issue-close-final-action" aria-label="Final Issue close action">
        <div>
          <strong>Final Issue-level close record</strong>
          <p>Closing this Issue returns to the Workflow Hub. It does not close, advance, reset, snapshot, restore, or otherwise alter Development state; any later Development entry uses the existing repository resolver.</p>
          <span>{projection?.closeRecord.path ?? "issues/<ISSUE_ID>/Close_Records/ISSUE_CLOSE_RECORD_<ISSUE_ID>.md"}</span>
        </div>
        {projection?.canCloseIssue && projection.validationBasisSha256 ? (
          <button
            className="apply-button"
            disabled={!canClose}
            onClick={() => onClose({ expectedValidationBasisSha256: projection.validationBasisSha256 ?? "" })}
            type="button"
          >
            {actionPending ? "Closing Issue..." : "Close Issue"}
          </button>
        ) : null}
      </section>
    </section>
  );
}
