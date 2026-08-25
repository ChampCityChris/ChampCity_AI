import { useEffect, useState, type ReactNode } from "react";
import { Clipboard, FileText, FolderOpen, RefreshCw } from "lucide-react";

import type {
  IssueArchitectPlanningProjection,
  IssueArchitectReviewDisposition,
  IssueArchitectReviewInput,
  IssueRecordProjection,
} from "../../shared/issueResolutionContracts";
import { FigmaMarkdownBody } from "./FigmaDocumentCard";

type IssueArchitectDocumentRole = "issue-record" | "investigation";

const issueReviewDispositionOptions: Array<{
  label: string;
  value: IssueArchitectReviewDisposition;
}> = [
  { label: "Approve", value: "Approved" },
  { label: "Request Revision", value: "RevisionRequested" },
  { label: "Reject", value: "Rejected" },
];

export function IssueArchitectPlanningWorkspace({
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
  projection: IssueArchitectPlanningProjection | null;
  projectName: string;
}): JSX.Element {
  const [selectedDocumentRole, setSelectedDocumentRole] =
    useState<IssueArchitectDocumentRole>("investigation");
  const [reviewDisposition, setReviewDisposition] =
    useState<IssueArchitectReviewDisposition | "">("");
  const [reviewNotes, setReviewNotes] = useState("");
  const selectedIssueLabel = currentIssue
    ? `${currentIssue.issueId}: ${currentIssue.title}`
    : "No issue selected";
  const hasInvestigation = projection?.finalInvestigationState === "readable";
  const isAwaitingReview = projection?.status === "awaiting-operator-review";
  const showHandoffActions = Boolean(
    !hasInvestigation ||
    projection?.canPrepareHandoff ||
    projection?.canCopyHandoff,
  );
  const issueRecordMarkdown = projection?.issueRecordMarkdown ?? currentIssue?.bodyMarkdown ?? "";
  const issueRecordPath = projection?.issueRecordPath ?? currentIssue?.recordPath ?? "issues/ISSUE_NNN/ISSUE_RECORD.md";
  const selectedDocument = documentProjectionForRole(
    selectedDocumentRole,
    issueRecordMarkdown,
    issueRecordPath,
    projection,
  );

  useEffect(() => {
    setSelectedDocumentRole(projection?.finalInvestigationState === "readable" ? "investigation" : "issue-record");
  }, [projection?.issueId, projection?.finalInvestigationState]);

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
    <section className="issue-architect-workspace" aria-labelledby="workspace-heading">
      <header className="issue-resolution-header">
        <div>
          <span>Issue Resolution</span>
          <h1 id="workspace-heading">Architect Planning</h1>
          <p>{`Investigate the selected Issue for ${projectName}.`}</p>
        </div>
        <button className="icon-button text-button" disabled={isActionPending} onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          Refresh
        </button>
      </header>

      <div className="figma-doc-chat-workspace issue-architect-doc-chat-workspace">
        <div className="figma-doc-review-column issue-architect-review-column">
          <article className="figma-document-card issue-architect-document-card" aria-label="Issue Architect document">
            {hasInvestigation ? (
              <div className="figma-document-tabs" role="tablist" aria-label="Issue Architect documents">
                <button
                  aria-selected={selectedDocumentRole === "investigation"}
                  className={selectedDocumentRole === "investigation" ? "active" : ""}
                  onClick={() => setSelectedDocumentRole("investigation")}
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                  Architect Investigation
                </button>
                <button
                  aria-selected={selectedDocumentRole === "issue-record"}
                  className={selectedDocumentRole === "issue-record" ? "active" : ""}
                  onClick={() => setSelectedDocumentRole("issue-record")}
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                  Issue Record
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
              <span>{projection?.statusMessage ?? "Loading Architect Planning status."}</span>
            </div>
            <div className="figma-document-card-body">
              {selectedDocument.markdown ? (
                <FigmaMarkdownBody markdown={selectedDocument.markdown} />
              ) : (
                <div className="figma-empty-document">
                  <strong>{hasInvestigation ? "Document unavailable" : "No Architect Investigation yet"}</strong>
                  <span>
                    {hasInvestigation
                      ? "Refresh Architect Planning to reload the selected document."
                      : "Browser GPT writes only the temporary draft; ChampCity promotes a valid draft here."}
                  </span>
                </div>
              )}
            </div>
            <footer className="figma-document-card-footer">
              <span>{selectedDocument.path}</span>
            </footer>
          </article>

          {isAwaitingReview ? (
            <section className="figma-disposition-panel issue-architect-disposition-panel" aria-label="Issue Architect review">
              <header>
                <span>Document Disposition</span>
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
                    {issueReviewDispositionOptions.map((option) => (
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
                  <dd>{projection?.workflowStatus.stageLabel ?? "Architect Planning"}</dd>
                </div>
                <div>
                  <dt>Effective Disposition</dt>
                  <dd>{projection?.operatorDisposition ?? "Awaiting Operator Review"}</dd>
                </div>
                <div>
                  <dt>Recommendation</dt>
                  <dd>{projection?.architectRecommendation ?? "Pending"}</dd>
                </div>
                <div>
                  <dt>Investigation</dt>
                  <dd>{projection?.finalInvestigationPath ?? "Repository-relative path"}</dd>
                </div>
                <div>
                  <dt>Review</dt>
                  <dd>{projection?.reviewPath ?? "issues/ISSUE_NNN/ARCHITECT_REVIEW.md"}</dd>
                </div>
                <div>
                  <dt>Issue Planning</dt>
                  <dd>{projection?.issuePlanningEligible ? "Eligible" : "Not eligible"}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>

        <div className="figma-browser-column issue-architect-browser-column">
          {browserPanel}
          <section className="figma-browser-actions-panel issue-architect-browser-actions-panel" aria-label="Browser actions">
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
                    Prepare Handoff
                  </button>
                  <button
                    disabled={!projection?.canCopyHandoff || isActionPending}
                    onClick={onCopyHandoff}
                    type="button"
                  >
                    <Clipboard aria-hidden="true" size={14} />
                    Copy Handoff
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
        </div>
      </div>
    </section>
  );
}

function documentProjectionForRole(
  selectedDocumentRole: IssueArchitectDocumentRole,
  issueRecordMarkdown: string,
  issueRecordPath: string,
  projection: IssueArchitectPlanningProjection | null,
): {
  error: string;
  markdown: string;
  path: string;
  title: string;
} {
  if (selectedDocumentRole === "investigation" && projection?.finalInvestigationState === "readable") {
    return {
      error: "",
      markdown: projection.finalInvestigationMarkdown ?? "",
      path: projection.finalInvestigationPath,
      title: "ARCHITECT_INVESTIGATION.md",
    };
  }
  if (selectedDocumentRole === "investigation" && projection?.finalInvestigationState === "read-error") {
    return {
      error: projection.finalInvestigationReadError ?? "Architect Investigation could not be read.",
      markdown: "",
      path: projection.finalInvestigationPath,
      title: "ARCHITECT_INVESTIGATION.md",
    };
  }
  return {
    error: projection?.issueRecordReadError ?? "",
    markdown: issueRecordMarkdown,
    path: issueRecordPath,
    title: "ISSUE_RECORD.md",
  };
}
