import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import type {
  IssueRecordProjection,
  IssueValidationDecisionInput,
  IssueValidationProjection,
} from "../../shared/issueResolutionContracts";
import { OperatorValidationPresentation } from "./OperatorValidationPresentation";

const currentRecordId = "current-issue-validation-record";

export function IssueValidationWorkspace({
  actionError,
  actionFeedback,
  actionPending,
  currentIssue,
  onApplyDecision,
  onRefresh,
  projection,
}: {
  actionError: string;
  actionFeedback: string;
  actionPending: boolean;
  currentIssue: IssueRecordProjection | null;
  onApplyDecision: (input: IssueValidationDecisionInput) => void;
  onRefresh: () => void;
  projection: IssueValidationProjection | null;
}): JSX.Element {
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [boundedCorrectiveWork, setBoundedCorrectiveWork] = useState("");
  const sourceChoices = projection?.sourceEvidence ?? [];

  useEffect(() => {
    const preferred = projection?.currentRecordPath
      ? currentRecordId
      : projection?.sourceEvidence[0]?.path ?? "";
    setSelectedDocumentId(preferred);
    setOperatorNotes("");
    setBoundedCorrectiveWork("");
  }, [projection?.issueId, projection?.currentAttemptNumber, projection?.currentRecordPath]);

  const selectedSource = sourceChoices.find((source) => source.path === selectedDocumentId);
  const selectedIsRecord = selectedDocumentId === currentRecordId;
  const selectedBody = selectedIsRecord
    ? projection?.currentRecordMarkdown
    : selectedSource?.bodyMarkdown;
  const selectedPath = selectedIsRecord
    ? projection?.currentRecordPath
    : selectedSource?.path;
  const selectedLabel = selectedIsRecord
    ? "Current Issue Validation Record"
    : selectedSource?.label ?? "Aggregate Issue Evidence";
  const selectedStatus = selectedIsRecord
    ? `${projection?.currentRecordState ?? "missing"} / ${projection?.currentDisposition ?? "No current decision"}`
    : selectedSource
    ? `${selectedSource.state} / revision ${selectedSource.revision} / sha256 ${selectedSource.sha256.slice(0, 12)}...`
    : "missing";
  const canDecide = Boolean(projection?.eligible && projection.evidenceSha256) && !actionPending;

  return (
    <section className="issue-validation-workspace" aria-labelledby="workspace-heading">
      <header className="issue-resolution-header">
        <div>
          <span>Issue Resolution</span>
          <h1 id="workspace-heading">Issue Validation</h1>
          <p>Aggregate Issue Validation asks whether the combined closed Fix Cards resolve the original Issue. It is distinct from Fix Card Validation and does not close the Issue.</p>
        </div>
        <button className="icon-button text-button" disabled={actionPending} onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          Refresh
        </button>
      </header>

      <section className="issue-validation-basis-summary" aria-label="Aggregate Issue Validation basis">
        <div>
          <span>Issue</span>
          <strong>{currentIssue ? `${currentIssue.issueId}: ${currentIssue.title}` : "No Issue selected"}</strong>
        </div>
        <div>
          <span>Eligibility / Result</span>
          <strong>{projection?.workflowStatus.stateLabel ?? "Loading"}</strong>
        </div>
        <div>
          <span>Planning Disposition</span>
          <strong>{projection?.planningDisposition ?? "Unavailable"}</strong>
        </div>
        <div>
          <span>Next Aggregate Attempt</span>
          <strong>{`ATTEMPT${String(projection?.nextAttemptNumber ?? 1).padStart(2, "0")}`}</strong>
        </div>
        <p>{projection?.statusMessage ?? "Loading repository-derived aggregate evidence."}</p>
      </section>

      <section className="issue-validation-close-summary" aria-label="Completed Fix Card close record summary">
        <header>
          <strong>Ordered Completed Fix Card Close Records</strong>
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
                  <div><dt>Current implementation</dt><dd>{entry.currentImplementationId}</dd></div>
                  {entry.repairId ? <div><dt>Repair</dt><dd>{entry.repairId}</dd></div> : null}
                </dl>
              </li>
            ))}
          </ol>
        ) : (
          <p>No complete current close-record set is available.</p>
        )}
      </section>

      <OperatorValidationPresentation
        ariaLabel="Aggregate Issue Validation evidence and decision"
        canRequestRepair={canDecide && Boolean(projection?.canRequestCorrectiveWork) && Boolean(boundedCorrectiveWork.trim())}
        canValidatePassed={canDecide && Boolean(projection?.canValidateResolved)}
        decisionAriaLabel="Operator aggregate Issue Validation decision"
        documentChoices={[
          ...sourceChoices.map((source) => ({ id: source.path, label: source.label, available: source.state === "readable" })),
          {
            id: currentRecordId,
            label: "Issue Validation Record",
            available: Boolean(projection?.currentRecordPath),
          },
        ]}
        documentError={actionError || projection?.currentRecordReadError}
        feedback={actionFeedback}
        isApplying={actionPending}
        onOperatorNotesChange={setOperatorNotes}
        onRepairDefectTextChange={setBoundedCorrectiveWork}
        onRequestRepair={() => onApplyDecision({
          decision: "RequestCorrectiveWork",
          operatorNotes,
          boundedCorrectiveWork,
          expectedEvidenceSha256: projection?.evidenceSha256 ?? "",
        })}
        onSelectDocument={setSelectedDocumentId}
        onValidatePassed={() => onApplyDecision({
          decision: "ValidateResolved",
          operatorNotes,
          expectedEvidenceSha256: projection?.evidenceSha256 ?? "",
        })}
        operatorNotes={operatorNotes}
        operatorNotesLabel="Operator notes about the aggregate outcome"
        outcomeMessage={projection?.currentDisposition === "Approved"
          ? "Issue Validation is Approved for the exact current evidence. Issue Close remains a separate later stage."
          : projection?.currentDisposition === "RevisionRequested"
          ? "Further bounded corrective work was requested. Continue through Issue Planning; no Repair was created."
          : undefined}
        repairDefectLabel="Bounded unresolved outcome / corrective-work requirement"
        repairDefectText={boundedCorrectiveWork}
        requestRepairLabel="Request Further Corrective Work"
        selectedDocumentBody={selectedBody ?? `Evidence unavailable.\n\n${projection?.statusMessage ?? "Refresh repository evidence."}`}
        selectedDocumentFilename={selectedPath?.split("/").at(-1) ?? selectedLabel}
        selectedDocumentId={selectedDocumentId}
        selectedDocumentLabel={selectedLabel}
        selectedDocumentPath={selectedPath ?? "Repository-relative evidence path unavailable."}
        selectedDocumentStatus={selectedStatus}
        validatePassedLabel="Validate Issue Resolved"
      />
    </section>
  );
}
