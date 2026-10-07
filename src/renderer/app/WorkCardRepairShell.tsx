import type {ReactNode} from "react";
import {Clipboard,RefreshCw,Wrench} from "lucide-react";
import type {ArchitectOutputDocumentSlotModel} from "../../shared/workspaceContracts";
import type {PlanningDocumentDetail} from "../../shared/documents/planningDocument";
import {FigmaDocumentCard} from "./FigmaDocumentCard";
export function WorkCardRepairShell({
  actionError,
  actionFeedback,
  architectAriaLabel,
  architectHeading,
  architectStateLabel,
  architectStatusText,
  browserPanel,
  copyEnabled,
  documentFeedback,
  documentSlots,
  isArchitectPaneVisible,
  isPreparing,
  onCopyDocument,
  onExportDocument,
  navigation,
  onCopyHandoff,
  onPrepareHandoff,
  onRefresh,
  onReloadBrowser,
  onSelectDocument,
  prepareButtonLabel,
  prepareEnabled,
  repairReviewPanel,
  selectedDocument,
  selectedSlotId,
  showRepairReviewPanel,
  statusDefectText,
  statusIdentity,
  statusLabel,
  statusReason,
  statusTarget,
  workspaceAriaLabel,
}: {
  actionError: string;
  actionFeedback: string;
  architectAriaLabel: string;
  architectHeading: string;
  architectStateLabel: string;
  architectStatusText: string;
  browserPanel: ReactNode;
  copyEnabled: boolean;
  documentFeedback: string;
  documentSlots: ArchitectOutputDocumentSlotModel[];
  isArchitectPaneVisible: boolean;
  isPreparing: boolean;
  onCopyDocument: () => void;
  onExportDocument?: (request: import("../../shared/workspaceContracts").MarkdownExportRequest) => void;
  navigation?: ReactNode;
  onCopyHandoff: () => void;
  onPrepareHandoff: () => void;
  onRefresh: () => void;
  onReloadBrowser: () => void;
  onSelectDocument: (slotId: string) => void;
  prepareButtonLabel: string;
  prepareEnabled: boolean;
  repairReviewPanel?: ReactNode;
  selectedDocument: PlanningDocumentDetail | null;
  selectedSlotId: string;
  showRepairReviewPanel: boolean;
  statusDefectText?: string;
  statusIdentity: string;
  statusLabel: string;
  statusReason: string;
  statusTarget?: string;
  workspaceAriaLabel: string;
}): JSX.Element {
  return (
    <section
      aria-label={workspaceAriaLabel}
      className={[
        "figma-doc-chat-workspace",
        "work-card-repair-workspace",
        !isArchitectPaneVisible ? "chat-hidden" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="work-card-repair-column">
        <FigmaDocumentCard
          documentError={selectedDocument?.readError ?? ""}
          feedback={documentFeedback}
          onCopy={onCopyDocument}
          onExport={onExportDocument}
          onSelectSlot={onSelectDocument}
          selectedDocument={selectedDocument}
          selectedSlotId={selectedSlotId}
          slots={documentSlots}
        />
        {showRepairReviewPanel && repairReviewPanel ? (
          <div className="work-card-repair-disposition-slot">
            {repairReviewPanel}
          </div>
        ) : null}
        <div className="work-card-repair-status-strip" aria-label="Repair status details">
          <span>{statusLabel}</span>
          <strong>{statusIdentity}</strong>
          <small>{statusReason}</small>
          {statusDefectText ? <small>Repair defect: {statusDefectText}</small> : null}
          {statusTarget ? <small>Repair target: {statusTarget}</small> : null}
        </div>
        {navigation}
      </div>
      {isArchitectPaneVisible ? (
        <div className="figma-browser-column work-card-repair-architect-column" aria-label={architectAriaLabel}>
          <div className="work-card-repair-architect-status">
            <span>{architectHeading}</span>
            <strong>{architectStateLabel}</strong>
            <p>{architectStatusText}</p>
          </div>
          {browserPanel}
          <section className="work-card-repair-actions" aria-label="Repair Work Card Architect actions">
            <button
              className="work-card-repair-primary"
              disabled={!prepareEnabled}
              onClick={onPrepareHandoff}
              type="button"
            >
              <Wrench aria-hidden="true" size={16} />
              {isPreparing ? "Preparing..." : prepareButtonLabel}
            </button>
            <div className="work-card-repair-action-row">
              <button
                className="work-card-repair-secondary"
                disabled={!copyEnabled}
                onClick={onCopyHandoff}
                type="button"
              >
                <Clipboard aria-hidden="true" size={16} />
                Copy Handoff
              </button>
              <button
                className="work-card-repair-secondary"
                onClick={onReloadBrowser}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={16} />
                Reload ChatGPT
              </button>
              <button
                className="work-card-repair-secondary"
                onClick={onRefresh}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={16} />
                Refresh
              </button>
            </div>
            {actionFeedback ? <p className="work-card-repair-message success">{actionFeedback}</p> : null}
            {actionError ? <p className="work-card-repair-message error">{actionError}</p> : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
