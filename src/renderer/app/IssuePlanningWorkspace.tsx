import { useEffect, useState, type ReactNode } from "react";
import { Clipboard, FileText, FolderOpen, GitBranch, RefreshCw } from "lucide-react";

import type {
  IssueArchitectReviewDisposition,
  IssueArchitectReviewInput,
  IssueFixCardPlanCandidate,
  IssuePlanningProjection,
  IssueRecordProjection,
} from "../../shared/issueResolutionContracts";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";
import { IssueDocumentChatWorkspaceShell } from "./IssueDocumentChatWorkspaceShell";

type IssuePlanningDocumentRole = "issue-resolution-plan" | "fix-card-plan";

const planningReviewDispositionOptions: Array<{
  label: string;
  value: IssueArchitectReviewDisposition;
}> = [
  { label: "Approve", value: "Approved" },
  { label: "Request Revision", value: "RevisionRequested" },
  { label: "Reject", value: "Rejected" },
];

export function IssuePlanningWorkspace({
  actionError,
  actionFeedback,
  browserPanel,
  currentIssue,
  isActionPending,
  onApplyReview,
  onCopyHandoff,
  onPrepareHandoff,
  onRefresh,
  onReloadBrowser,
  projection,
  projectName,
}: {
  actionError: string;
  actionFeedback: string;
  browserPanel: ReactNode;
  currentIssue: IssueRecordProjection | null;
  isActionPending: boolean;
  onApplyReview: (input: IssueArchitectReviewInput) => Promise<void>;
  onCopyHandoff: () => void;
  onPrepareHandoff: () => void;
  onRefresh: () => void;
  onReloadBrowser: () => void;
  projection: IssuePlanningProjection | null;
  projectName: string;
}): JSX.Element {
  const [selectedDocumentRole, setSelectedDocumentRole] =
    useState<IssuePlanningDocumentRole>("issue-resolution-plan");
  const [reviewDisposition, setReviewDisposition] =
    useState<IssueArchitectReviewDisposition | "">("");
  const [reviewNotes, setReviewNotes] = useState("");
  const selectedIssueLabel = currentIssue
    ? `${currentIssue.issueId}: ${currentIssue.title}`
    : "No issue selected";
  const hasBundle = projection?.issueResolutionPlanState === "readable" &&
    projection.fixCardPlanState === "readable";
  const isAwaitingReview = projection?.status === "awaiting-operator-review";
  const isAggregateCorrectivePlanning = projection?.revisionSource === "issue-validation";
  const showHandoffActions = Boolean(
    !hasBundle ||
    projection?.canPrepareHandoff ||
    projection?.canCopyHandoff,
  );
  const selectedDocument = documentProjectionForRole(selectedDocumentRole, projection);

  useEffect(() => {
    setSelectedDocumentRole("issue-resolution-plan");
  }, [projection?.issueId, projection?.issueResolutionPlanState, projection?.fixCardPlanState]);

  async function applyReview(): Promise<void> {
    if (!reviewDisposition) {
      return;
    }
    await onApplyReview({
      disposition: reviewDisposition,
      operatorNotes: reviewNotes,
    });
    setReviewDisposition("");
    setReviewNotes("");
  }

  return (
    <IssueDocumentChatWorkspaceShell
      bodyClassName="issue-planning-doc-chat-workspace"
      browserActions={(
        <section className="figma-browser-actions-panel issue-planning-browser-actions-panel" aria-label="Browser actions">
          <header>
            <span>Browser Actions</span>
          </header>
          <div className="figma-browser-actions-row">
            <button className="primary-action" onClick={onReloadBrowser} type="button">
              <RefreshCw aria-hidden="true" size={14} />
              Reload ChatGPT
            </button>
            {showHandoffActions ? (
              <>
                <i aria-hidden="true" />
                <button
                  disabled={!projection?.canPrepareHandoff || isActionPending}
                  onClick={onPrepareHandoff}
                  type="button"
                >
                  <FolderOpen aria-hidden="true" size={14} />
                  {isAggregateCorrectivePlanning
                    ? "Prepare Corrective Planning Handoff"
                    : "Prepare Handoff"}
                </button>
                <button
                  disabled={!projection?.canCopyHandoff || isActionPending}
                  onClick={onCopyHandoff}
                  type="button"
                >
                  <Clipboard aria-hidden="true" size={14} />
                  {isAggregateCorrectivePlanning
                    ? "Copy Corrective Planning Handoff"
                    : "Copy Handoff"}
                </button>
              </>
            ) : null}
            <button disabled={isActionPending} onClick={onRefresh} type="button">
              <RefreshCw aria-hidden="true" size={14} />
              Refresh
            </button>
          </div>
          {actionError ? (
            <div className="figma-browser-action-message error" role="status">{actionError}</div>
          ) : actionFeedback ? (
            <div className="figma-browser-action-message success" role="status">{actionFeedback}</div>
          ) : null}
        </section>
      )}
      browserColumnClassName="issue-planning-browser-column"
      browserPanel={browserPanel}
      className="issue-planning-workspace"
      documentColumn={(
        <>
          {isAggregateCorrectivePlanning ? (
            <section
              aria-label="Aggregate Issue Validation corrective planning basis"
              className="figma-disposition-panel issue-corrective-planning-state-panel"
            >
              <header>
                <span>Corrective Issue Planning Required</span>
              </header>
              <dl>
                <div>
                  <dt>Governing Issue Validation Record</dt>
                  <dd>{projection?.issueValidationRevisionRecordPath ?? "Unavailable"}</dd>
                </div>
                <div>
                  <dt>Bounded corrective work</dt>
                  <dd>{projection?.issueValidationBoundedCorrectiveWork ?? "Unavailable"}</dd>
                </div>
              </dl>
              <p>Existing closed Fix Cards remain completed and cannot be repurposed.</p>
              <p>
                This path revises Issue Planning and must append one or more new bounded Fix Card candidates.
              </p>
              <p>This is not Fix Card Repair genealogy.</p>
            </section>
          ) : null}

          <article className="figma-document-card issue-planning-document-card" aria-label="Issue Planning document">
            {hasBundle ? (
              <div className="figma-document-tabs" role="tablist" aria-label="Issue Planning documents">
                <button
                  aria-selected={selectedDocumentRole === "issue-resolution-plan"}
                  className={selectedDocumentRole === "issue-resolution-plan" ? "active" : ""}
                  onClick={() => setSelectedDocumentRole("issue-resolution-plan")}
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                  Issue Resolution Plan
                </button>
                <button
                  aria-selected={selectedDocumentRole === "fix-card-plan"}
                  className={selectedDocumentRole === "fix-card-plan" ? "active" : ""}
                  onClick={() => setSelectedDocumentRole("fix-card-plan")}
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                  Fix Card Plan
                </button>
              </div>
            ) : null}
            <header className="figma-document-card-header">
              <div className="figma-document-title-row">
                <FileText aria-hidden="true" size={14} />
                <strong>{selectedDocument.title}</strong>
              </div>
              <div className="figma-document-card-actions">
                <span className="figma-document-status">{projection?.workflowStatus.stateLabel ?? "Loading"}</span>
              </div>
            </header>
            <div className="figma-document-path-row">
              <FileText aria-hidden="true" size={12} />
              <span>{selectedDocument.path}</span>
            </div>
            {selectedDocument.error ? (
              <div className="document-error" role="status">{selectedDocument.error}</div>
            ) : null}
            <div className="issue-architect-compact-status">
              <strong>{selectedIssueLabel}</strong>
              <span>{projection?.statusMessage ?? "Loading Issue Planning status."}</span>
            </div>
            <div className="figma-document-card-body">
              {selectedDocument.markdown ? (
                <FigmaMarkdownBody markdown={selectedDocument.markdown} />
              ) : (
                <div className="figma-empty-document">
                  <strong>{hasBundle ? "Document unavailable" : "No planning bundle yet"}</strong>
                  <span>
                    Browser GPT writes two temporary drafts; ChampCity validates and promotes them as one bundle.
                  </span>
                </div>
              )}
            </div>
            <footer className="figma-document-card-footer">
              <span>{selectedDocument.path}</span>
            </footer>
          </article>

          <IssueFixCardMapPanel projection={projection} />

          {isAwaitingReview ? (
            <section className="figma-disposition-panel issue-planning-disposition-panel" aria-label="Issue Planning review">
              <header>
                <span>Bundle Disposition</span>
              </header>
              <div className="figma-disposition-row">
                <label>
                  <span>Disposition</span>
                  <select
                    disabled={isActionPending}
                    onChange={(event) => {
                      setReviewDisposition(event.target.value as IssueArchitectReviewDisposition | "");
                    }}
                    value={reviewDisposition}
                  >
                    <option value="">Select disposition</option>
                    {planningReviewDispositionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="figma-review-notes">
                  <span>Review notes</span>
                  <input
                    disabled={isActionPending}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    value={reviewNotes}
                  />
                </label>
                <button
                  className="apply-button"
                  disabled={!reviewDisposition || isActionPending}
                  onClick={() => void applyReview()}
                  type="button"
                >
                  Apply Review
                </button>
              </div>
              <dl>
                <div>
                  <dt>Workflow Step</dt>
                  <dd>{projection?.workflowStatus.stageLabel ?? "Issue Planning"}</dd>
                </div>
                <div>
                  <dt>Effective Disposition</dt>
                  <dd>{projection?.operatorDisposition ?? "Awaiting Operator Review"}</dd>
                </div>
                <div>
                  <dt>Resolution Plan</dt>
                  <dd>{projection?.issueResolutionPlanPath ?? "issues/ISSUE_NNN/ISSUE_RESOLUTION_PLAN.md"}</dd>
                </div>
                <div>
                  <dt>Fix Card Plan</dt>
                  <dd>{projection?.fixCardPlanPath ?? "issues/ISSUE_NNN/FIX_CARD_PLAN.md"}</dd>
                </div>
                <div>
                  <dt>Review</dt>
                  <dd>{projection?.reviewPath ?? "issues/ISSUE_NNN/ISSUE_PLANNING_REVIEW.md"}</dd>
                </div>
                <div>
                  <dt>Fix Cards</dt>
                  <dd>{projection?.fixCardsEligible ? "Eligible" : "Not eligible"}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </>
      )}
      documentColumnClassName="issue-planning-review-column"
      headerAction={(
        <button className="icon-button text-button" disabled={isActionPending} onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          Refresh
        </button>
      )}
      heading="Issue Planning"
      summary={`Plan the accepted correction architecture for ${projectName}.`}
    />
  );
}

export function IssueFixCardMapPanel({
  actionMessage,
  candidates,
  isSelectionPending = false,
  onSelectCandidate,
  projection,
  selectedFixCardId,
}: {
  actionMessage?: ReactNode;
  candidates?: IssueFixCardPlanCandidate[];
  isSelectionPending?: boolean;
  onSelectCandidate?: (fixCardId: string) => void;
  projection: IssuePlanningProjection | null;
  selectedFixCardId?: string;
}): JSX.Element {
  const isSelectable = Boolean(onSelectCandidate);
  const visibleCandidates = candidates ?? projection?.fixCardCandidates ?? [];
  return (
    <section
      className={`issue-fix-card-map-panel${isSelectable ? " selectable" : ""}`}
      aria-label={isSelectable ? "Fix Card Map candidate selection" : "Fix Card Map"}
    >
      <header>
        <div className="figma-document-title-row">
          <GitBranch aria-hidden="true" size={14} />
          <strong>Fix Card Map</strong>
        </div>
        <span>{projection?.fixCardsEligible ? "Eligible" : "Derived"}</span>
      </header>
      {projection?.fixCardPlanValidationFindings.length ? (
        <div className="document-error" role="status">
          {projection.fixCardPlanValidationFindings.join("; ")}
        </div>
      ) : null}
      {actionMessage}
      {visibleCandidates.length ? (
        <div className="issue-fix-card-candidate-scroll-region">
          <ol>
            {visibleCandidates.map((candidate) => {
              const candidateSelectable = candidate.lifecycle?.selectable ?? true;
              const selectionLabel = selectedFixCardId === candidate.fixCardId
                ? "Selected"
                : candidateSelectable
                ? "Select Fix Card"
                : "Legacy";
              return (
              <li
                className={selectedFixCardId === candidate.fixCardId ? "selected" : ""}
                key={candidate.fixCardId}
              >
                {isSelectable && candidateSelectable ? (
                  <button
                    aria-pressed={selectedFixCardId === candidate.fixCardId}
                    className="issue-fix-card-candidate-card"
                    disabled={isSelectionPending}
                    onClick={() => onSelectCandidate?.(candidate.fixCardId)}
                    type="button"
                  >
                    <IssueFixCardCandidateContent
                      candidate={candidate}
                      selectionLabel={selectionLabel}
                    />
                  </button>
                ) : (
                  <div className="issue-fix-card-candidate-card read-only">
                    <IssueFixCardCandidateContent
                      candidate={candidate}
                      selectionLabel={isSelectable ? selectionLabel : undefined}
                    />
                  </div>
                )}
              </li>
            );})}
          </ol>
        </div>
      ) : (
        <div className="figma-empty-document">
          <strong>No validated Fix Card Map</strong>
          <span>The map is derived only from the champcity-fix-card-plan domain block.</span>
        </div>
      )}
    </section>
  );
}

function IssueFixCardCandidateContent({
  candidate,
  selectionLabel,
}: {
  candidate: IssueFixCardPlanCandidate;
  selectionLabel?: string;
}): JSX.Element {
  return (
    <>
      <div>
        <strong>{candidate.fixCardId}</strong>
        <span>{candidate.title}</span>
        {selectionLabel ? <em>{selectionLabel}</em> : null}
      </div>
      <p>{candidate.purpose}</p>
      <small>
        {candidate.dependsOn.length
          ? `Depends on ${candidate.dependsOn.join(", ")}`
          : "No dependencies"}
      </small>
      {candidate.lifecycle ? (
        <div className="issue-fix-card-lifecycle-row">
          <em>{candidate.lifecycle.label}</em>
          <p>{candidate.lifecycle.reason}</p>
        </div>
      ) : null}
    </>
  );
}

function documentProjectionForRole(
  selectedDocumentRole: IssuePlanningDocumentRole,
  projection: IssuePlanningProjection | null,
): {
  error: string;
  markdown: string;
  path: string;
  title: string;
} {
  if (selectedDocumentRole === "fix-card-plan") {
    return {
      error: projection?.fixCardPlanReadError ?? "",
      markdown: projection?.fixCardPlanMarkdown ?? "",
      path: projection?.fixCardPlanPath ?? "issues/ISSUE_NNN/FIX_CARD_PLAN.md",
      title: "FIX_CARD_PLAN.md",
    };
  }
  return {
    error: projection?.issueResolutionPlanReadError ?? "",
    markdown: projection?.issueResolutionPlanMarkdown ?? "",
    path: projection?.issueResolutionPlanPath ?? "issues/ISSUE_NNN/ISSUE_RESOLUTION_PLAN.md",
    title: "ISSUE_RESOLUTION_PLAN.md",
  };
}
