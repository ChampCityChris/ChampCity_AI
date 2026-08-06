import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Clipboard, RefreshCw, Wrench } from "lucide-react";
import type {
  ArchitectOutputDocumentSlotModel,
  ArchitectOutputWorkspaceModel,
  CurrentWorkspaceModel,
  WorkCardRepairEvidenceDocument,
  WorkCardRepairProjection,
} from "../../shared/workspaceContracts";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";
import { FigmaDocumentCard } from "./FigmaDocumentCard";

const unresolvedEvidenceDocuments: WorkCardRepairEvidenceDocument[] = [
  {
    role: "primary-validation-record",
    label: "Validation Record",
    markdownPath: "<unresolved Validation Record path>",
    documentReadState: "missing",
  },
  {
    role: "supporting-implementer-report",
    label: "Implementer Report",
    markdownPath: "<unresolved Implementer Report path>",
    documentReadState: "missing",
  },
  {
    role: "supporting-formal-work-card",
    label: "Formal Work Card",
    markdownPath: "<unresolved Formal Work Card path>",
    documentReadState: "missing",
  },
];

export function WorkCardRepairWorkspace({
  actionError,
  actionFeedback,
  architectOutputModel,
  browserPanel,
  isCreating,
  isPreparing,
  isArchitectPaneVisible,
  model,
  onCopyHandoff,
  onReloadBrowser,
  onPrepareHandoff,
  onRefresh,
  onSelectRepairWorkCard,
  projection,
  repairReviewPanel,
  repairWorkCardDocument,
}: {
  actionError: string;
  actionFeedback: string;
  architectOutputModel: ArchitectOutputWorkspaceModel | null;
  browserPanel: ReactNode;
  isCreating: boolean;
  isPreparing: boolean;
  isArchitectPaneVisible: boolean;
  model: CurrentWorkspaceModel | null;
  onCopyHandoff: () => void;
  onReloadBrowser: () => void;
  onPrepareHandoff: () => void;
  onRefresh: () => void;
  onSelectRepairWorkCard: () => void;
  projection: WorkCardRepairProjection | null;
  repairReviewPanel?: ReactNode;
  repairWorkCardDocument: PlanningDocumentDetail | null;
}): JSX.Element {
  const state = projection?.state ?? "needs-attention";
  const evidenceDocuments = useMemo(
    () => {
      const projectedDocuments = [
        projection?.primaryEvidenceDocument,
        ...(projection?.supportingEvidenceDocuments ?? []),
      ].filter((document): document is WorkCardRepairEvidenceDocument => Boolean(document));
      return projectedDocuments.length > 0 ? projectedDocuments : unresolvedEvidenceDocuments;
    },
    [projection],
  );
  const repairSlot = architectOutputModel?.documentSlots.find((slot) => slot.slotId === "repair-work-card");
  const repairWorkCardNeedsDisposition =
    Boolean(repairSlot?.logicalDocumentId) &&
    (repairSlot?.disposition === "Pending" || repairSlot?.disposition === "RevisionRequested");
  const repairTabId = repairSlot?.slotId ?? "repair-work-card";
  const evidenceSlotEntries = useMemo(
    () => evidenceDocuments.map((document, index) => ({
      document,
      slotId: evidenceSlotId(document, index),
    })),
    [evidenceDocuments],
  );
  const documentSlots = useMemo(
    () => {
      const evidenceSlots = evidenceSlotEntries.map(({ document, slotId }) =>
        evidenceSlotFromRepairDocument(document, slotId)
      );
      return repairSlot ? [...evidenceSlots, repairSlot] : evidenceSlots;
    },
    [evidenceSlotEntries, repairSlot],
  );
  const [selectedTabId, setSelectedTabId] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  const lastAutoSelectedDefault = useRef<string>("");
  useEffect(() => {
    const primaryEvidenceSlotId = evidenceSlotEntries[0]?.slotId ?? "";
    const tabIds = documentSlots.map((slot) => slot.slotId);
    const defaultSelectionKey = [
      primaryEvidenceSlotId,
      repairSlot?.targetPath ?? "",
      repairSlot?.artifactRevision ?? "",
      repairSlot?.disposition ?? "",
    ].join(":");
    if (tabIds.length === 0) {
      setSelectedTabId("");
      return;
    }
    if (lastAutoSelectedDefault.current !== defaultSelectionKey) {
      lastAutoSelectedDefault.current = defaultSelectionKey;
      setSelectedTabId(repairWorkCardNeedsDisposition ? repairTabId : primaryEvidenceSlotId || tabIds[0]);
      return;
    }
    if (!tabIds.includes(selectedTabId)) {
      setSelectedTabId(primaryEvidenceSlotId || tabIds[0]);
    }
  }, [
    documentSlots,
    evidenceSlotEntries,
    repairSlot?.artifactRevision,
    repairSlot?.disposition,
    repairSlot?.targetPath,
    repairTabId,
    repairWorkCardNeedsDisposition,
    selectedTabId,
  ]);
  useEffect(() => {
    if (selectedTabId === repairTabId && repairSlot?.logicalDocumentId) {
      onSelectRepairWorkCard();
    }
  }, [onSelectRepairWorkCard, repairSlot?.logicalDocumentId, repairTabId, selectedTabId]);
  const selectedEvidenceEntry = evidenceSlotEntries.find((entry) => entry.slotId === selectedTabId);
  const selectedIsRepairWorkCard = selectedTabId === repairTabId && Boolean(repairSlot);
  const selectedDocumentForViewer = selectedIsRepairWorkCard
    ? repairWorkCardDocument ?? (repairSlot ? detailFromRepairSlot(repairSlot) : null)
    : selectedEvidenceEntry
      ? detailFromEvidenceDocument(selectedEvidenceEntry.document)
      : null;
  const prepareEnabled = Boolean(
    projection &&
    !isPreparing &&
    !isCreating &&
    (
      (projection.state === "handoff-needed" && projection.canCreateRepairHandoff) ||
      (projection.canPrepareArchitectHandoff && architectOutputModel?.canPrepareHandoff)
    ),
  );
  const copyEnabled = Boolean(
    architectOutputModel?.canCopyHandoff ||
    projection?.canCopyArchitectHandoff,
  );
  async function copySelectedRepairDocumentBody(): Promise<void> {
    if (!selectedDocumentForViewer) {
      return;
    }
    await window.navigator.clipboard.writeText(
      selectedDocumentForViewer.bodyMarkdown ?? selectedDocumentForViewer.preview ?? "",
    );
    setCopyFeedback("Selected repair document copied.");
  }

  return (
    <section
      aria-label="Work Card Repair workspace"
      className={[
        "figma-doc-chat-workspace",
        "work-card-repair-workspace",
        !isArchitectPaneVisible ? "chat-hidden" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="work-card-repair-column">
        <FigmaDocumentCard
          documentError={selectedDocumentForViewer?.readError ?? ""}
          feedback={copyFeedback}
          onCopy={() => void copySelectedRepairDocumentBody()}
          onSelectSlot={(slotId) => {
            setCopyFeedback("");
            setSelectedTabId(slotId);
          }}
          selectedDocument={selectedDocumentForViewer}
          selectedSlotId={selectedTabId}
          slots={documentSlots}
        />
        {selectedIsRepairWorkCard && repairReviewPanel ? (
          <div className="work-card-repair-disposition-slot">
            {repairReviewPanel}
          </div>
        ) : null}
        <div className="work-card-repair-status-strip" aria-label="Repair status details">
          <span>{repairStateLabel(state)}</span>
          <strong>{projection?.repairId ?? model?.executionContext.workCard.repairId ?? "Repair not resolved"}</strong>
          <small>{projection?.reason ?? "Current repair authority is not resolved."}</small>
          {projection?.repairDefectText ? <small>Repair defect: {projection.repairDefectText}</small> : null}
          {projection?.repairWorkCardTarget ? <small>Repair target: {projection.repairWorkCardTarget}</small> : null}
        </div>
      </div>
      {isArchitectPaneVisible ? (
        <div className="figma-browser-column work-card-repair-architect-column" aria-label="Repair Work Card Architect">
          <section className="work-card-repair-actions" aria-label="Repair Work Card Architect actions">
            <div>
              <span>Repair Work Card Architect</span>
              <strong>{repairStateLabel(state)}</strong>
              <p>{repairStatusText(state)}</p>
            </div>
            <button
              className="work-card-repair-primary"
              disabled={!prepareEnabled}
              onClick={onPrepareHandoff}
              type="button"
            >
              <Wrench aria-hidden="true" size={16} />
              {isPreparing || isCreating ? "Preparing..." : "Prepare Repair Work Card Prompt"}
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
          {browserPanel}
        </div>
      ) : null}
    </section>
  );
}

function repairStateLabel(state: WorkCardRepairProjection["state"]): string {
  switch (state) {
    case "handoff-needed":
      return "Evidence Ready";
    case "handoff-ready":
      return "Prompt Ready";
    case "draft-pending":
      return "Draft Pending";
    case "repair-card-reviewable":
      return "Repair Card Reviewable";
    default:
      return "Needs Attention";
  }
}

function evidenceSlotId(document: WorkCardRepairEvidenceDocument, index: number): string {
  return `repair-evidence-${document.role}-${index}`;
}

function evidenceSlotFromRepairDocument(
  document: WorkCardRepairEvidenceDocument,
  slotId: string,
): ArchitectOutputDocumentSlotModel {
  return {
    slotId,
    displayLabel: document.label,
    targetPath: document.markdownPath,
    logicalDocumentId: document.logicalDocumentId ?? slotId,
    artifactRevision: document.artifactRevision,
    disposition: document.disposition,
    documentReadState: document.documentReadState,
    readError: document.readError,
  };
}

function detailFromEvidenceDocument(document: WorkCardRepairEvidenceDocument): PlanningDocumentDetail {
  const bodyMarkdown = document.bodyMarkdown ?? fallbackBodyForDocument(document.label, document.markdownPath, document.readError);
  return {
    logicalDocumentId: document.logicalDocumentId ?? `repair-evidence:${document.role}:${document.markdownPath}`,
    markdownPath: document.markdownPath,
    displayFilename: displayFilenameFromPath(document.markdownPath),
    metadata: {
      artifactRevision: document.artifactRevision,
    },
    effectiveDisposition: document.disposition ?? "Pending",
    documentReadState: document.documentReadState,
    initializationNeeded: false,
    readError: document.readError,
    bodyMarkdown,
    preview: bodyMarkdown,
    previewTruncated: false,
  };
}

function detailFromRepairSlot(slot: ArchitectOutputDocumentSlotModel): PlanningDocumentDetail {
  const bodyMarkdown = fallbackBodyForDocument(slot.displayLabel, slot.targetPath, slot.readError);
  return {
    logicalDocumentId: slot.logicalDocumentId ?? slot.slotId,
    markdownPath: slot.targetPath,
    displayFilename: displayFilenameFromPath(slot.targetPath),
    metadata: {
      artifactRevision: slot.artifactRevision,
    },
    effectiveDisposition: slot.disposition ?? "Pending",
    documentReadState: normalizeReadState(slot.documentReadState),
    initializationNeeded: false,
    readError: slot.readError,
    bodyMarkdown,
    preview: bodyMarkdown,
    previewTruncated: false,
  };
}

function fallbackBodyForDocument(label: string, markdownPath: string, readError?: string): string {
  return [
    `# ${label}`,
    "",
    readError ?? `Document body is not available for ${markdownPath}.`,
  ].join("\n");
}

function displayFilenameFromPath(markdownPath: string): string {
  return markdownPath.split(/[\\/]/).filter(Boolean).at(-1) ?? markdownPath;
}

function normalizeReadState(value: string): PlanningDocumentDetail["documentReadState"] {
  return value === "readable" || value === "missing" || value === "invalid" || value === "read-error"
    ? value
    : "read-error";
}

function repairStatusText(state: WorkCardRepairProjection["state"]): string {
  switch (state) {
    case "handoff-needed":
      return "Evidence is ready. Preparing the prompt will create the internal handoff.";
    case "handoff-ready":
      return "Repair evidence is bound to the handoff and ready for prompt preparation.";
    case "draft-pending":
      return "Prompt is ready to copy into embedded ChatGPT.";
    case "repair-card-reviewable":
      return "Repair Work Card draft is ready for review.";
    default:
      return "Repair evidence needs attention before prompt preparation.";
  }
}
