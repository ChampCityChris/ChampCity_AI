import { useEffect, useMemo, useState } from "react";
import { FolderOpen, RefreshCw, RotateCcw } from "lucide-react";
import logoUrl from "../assets/champcity_ai_ui_branding.png";
import {
  workspaceLabels,
  type WorkspaceLabel,
  type WorkspaceSelection,
} from "../../shared/workspaceContracts";
import type {
  FirstNonApprovedResult,
  ResolvedCurrentDocument,
} from "../../shared/documents/documentOrder";
import type {
  PlanningDocumentDetail,
  PlanningDocumentSummary,
} from "../../shared/documents/planningDocument";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  getWorkspaceDocumentCounts,
  getWorkspaceGroups,
} from "../../shared/workspaces/documentWorkspace";

const neutralMessage = "Document workflow not yet implemented";
const dispositionOptions = [
  { label: "Approve", status: "Approved" },
  { label: "Reject", status: "Rejected" },
  { label: "Request Revision", status: "RevisionRequested" },
] as const;

const fallbackWorkspace: WorkspaceSelection = {
  ok: false,
  workspaceRoot: null,
  reason: "No workspace selected.",
};

export function App(): JSX.Element {
  const [activeLabel, setActiveLabel] = useState<WorkspaceLabel>(workspaceLabels[0]);
  const [workspace, setWorkspace] = useState<WorkspaceSelection>(fallbackWorkspace);
  const [documents, setDocuments] = useState<PlanningDocumentSummary[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PlanningDocumentDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DocumentDispositionStatus | "">("");
  const [feedback, setFeedback] = useState<string>("");
  const [documentError, setDocumentError] = useState<string>("");
  const [resolverResult, setResolverResult] = useState<FirstNonApprovedResult | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    void window.champcity.getSelectedWorkspace().then((selection) => {
      setWorkspace(selection);
      if (selection.ok) {
        void refreshDocuments({ useResolver: true });
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setSelectedDocument(null);
      setSelectedStatus("");
      return;
    }

    void loadDocument(selectedDocumentId);
  }, [selectedDocumentId]);

  const workspaceGroups = useMemo(
    () => getWorkspaceGroups(documents, activeLabel),
    [activeLabel, documents],
  );
  const workspaceCounts = useMemo(() => getWorkspaceDocumentCounts(documents), [documents]);
  const selectedSummary = useMemo(
    () =>
      documents.find((document) => document.logicalDocumentId === selectedDocumentId) ??
      null,
    [documents, selectedDocumentId],
  );
  const selectedDocumentHasLocalError =
    selectedSummary?.synchronizationState === "mismatched" || Boolean(selectedSummary?.readError);

  async function chooseWorkspace(): Promise<void> {
    setIsChoosing(true);
    try {
      setWorkspace(await window.champcity.chooseWorkspaceFolder());
      setSelectedDocumentId(null);
      await refreshDocuments({ useResolver: true });
    } finally {
      setIsChoosing(false);
    }
  }

  async function clearWorkspace(): Promise<void> {
    setWorkspace(await window.champcity.clearSelectedWorkspace());
    setDocuments([]);
    setSelectedDocumentId(null);
    setSelectedDocument(null);
    setFeedback("");
    setDocumentError("");
  }

  async function refreshDocuments(options: { useResolver?: boolean } = {}): Promise<void> {
    setIsLoadingDocuments(true);
    setDocumentError("");
    try {
      const nextDocuments = await window.champcity.listDocuments();
      setDocuments(nextDocuments);
      if (options.useResolver) {
        const nextResolverResult = await window.champcity.resolveCurrentDocument();
        selectResolverResult(nextResolverResult);
        setFeedback(getResolverFeedback(nextResolverResult));
      } else {
        setFeedback("Documents refreshed.");
      }
    } catch (error) {
      setDocuments([]);
      setResolverResult(null);
      setDocumentError(error instanceof Error ? error.message : "Documents could not be loaded.");
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  function selectResolverResult(result: FirstNonApprovedResult): void {
    setResolverResult(result);

    if (result.status === "current") {
      setActiveLabel(result.document.owningWorkspace);
      setSelectedDocumentId(result.document.logicalDocumentId);
      return;
    }

    setSelectedDocumentId(null);
    setSelectedDocument(null);
  }

  async function loadDocument(logicalDocumentId: string): Promise<void> {
    setDocumentError("");
    setFeedback("");
    try {
      const detail = await window.champcity.readDocument(logicalDocumentId);
      setSelectedDocument(detail);
      setSelectedStatus(
        detail.effectiveDisposition === "Pending" ? "" : detail.effectiveDisposition,
      );
      if (detail.synchronizationState === "mismatched") {
        setDocumentError("Document pair status is mismatched.");
      } else if (detail.readError) {
        setDocumentError(detail.readError);
      }
    } catch (error) {
      setSelectedDocument(null);
      setDocumentError(error instanceof Error ? error.message : "Document could not be loaded.");
    }
  }

  async function applyDisposition(): Promise<void> {
    if (!selectedDocumentId || !selectedStatus || selectedDocumentHasLocalError) {
      return;
    }

    setIsApplying(true);
    setDocumentError("");
    setFeedback("");
    try {
      await window.champcity.setDocumentDisposition(selectedDocumentId, selectedStatus);
      const nextDocuments = await window.champcity.listDocuments();
      setDocuments(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
      if (selectedStatus === "Approved" && nextResolverResult.status === "current") {
        setActiveLabel(nextResolverResult.document.owningWorkspace);
        setSelectedDocumentId(nextResolverResult.document.logicalDocumentId);
        setFeedback(getResolverFeedback(nextResolverResult));
      } else if (selectedStatus === "Approved" && nextResolverResult.status === "all-approved") {
        setSelectedDocumentId(null);
        setSelectedDocument(null);
        setFeedback(nextResolverResult.message);
      } else {
        await loadDocument(selectedDocumentId);
        setFeedback(`Disposition applied: ${selectedStatus}.`);
      }
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Disposition could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspaces">
        <div className="brand-lockup">
          <img src={logoUrl} alt="ChampCity A/I" />
        </div>
        <nav className="workspace-nav">
          {workspaceLabels.map((label) => (
            <button
              className={label === activeLabel ? "workspace-tab active" : "workspace-tab"}
              key={label}
              onClick={() => setActiveLabel(label)}
              type="button"
            >
              <span>{label}</span>
              <small>{workspaceCounts[label]}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace-surface" aria-labelledby="workspace-heading">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">ChampCity A/I</p>
            <h1 id="workspace-heading">{activeLabel}</h1>
          </div>
          <div className="workspace-actions">
            <button
              className="icon-button text-button"
              disabled={!workspace.ok || isLoadingDocuments}
              onClick={() => refreshDocuments({ useResolver: true })}
              title="Refresh documents"
              type="button"
            >
              <RefreshCw aria-hidden="true" size={18} />
              Refresh
            </button>
            <button
              className="icon-button text-button"
              disabled={isChoosing}
              onClick={chooseWorkspace}
              title="Choose workspace"
              type="button"
            >
              <FolderOpen aria-hidden="true" size={18} />
              {isChoosing ? "Choosing..." : "Choose Workspace"}
            </button>
            <button
              className="icon-button"
              onClick={clearWorkspace}
              title="Clear selected workspace"
              type="button"
            >
              <RotateCcw aria-hidden="true" size={18} />
            </button>
          </div>
        </header>

        <div className={workspace.ok ? "workspace-status ready" : "workspace-status"}>
          <span>Selected workspace</span>
          <strong>{workspace.ok ? workspace.workspaceRoot : workspace.reason}</strong>
        </div>

        <section className="document-workspace" aria-label={activeLabel}>
          <div className="document-list" aria-label={`${activeLabel} documents`}>
            {workspaceGroups.length === 0 ? (
              <div className="empty-list">
                <p>{workspace.ok ? "No documents in this workspace." : neutralMessage}</p>
              </div>
            ) : (
              workspaceGroups.map((group) => (
                <div className="document-group" key={group.group}>
                  <h2>{group.group}</h2>
                  {group.documents.map((document) => (
                    <button
                      className={
                        document.logicalDocumentId === selectedDocumentId
                          ? "document-row selected"
                          : "document-row"
                      }
                      key={document.logicalDocumentId}
                      onClick={() => setSelectedDocumentId(document.logicalDocumentId)}
                      type="button"
                    >
                      <span className="document-title">{document.displayFilename}</span>
                      <span className="document-path">
                        {document.markdownPath ?? document.jsonPath}
                      </span>
                      <span className={`status-pill ${document.effectiveDisposition.toLowerCase()}`}>
                        {document.effectiveDisposition}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          <article className="document-preview">
            <CurrentDocumentSummary
              resolverResult={resolverResult}
              selectedDocument={selectedDocument}
            />
            <header className="preview-header">
              <div>
                <h2>{selectedDocument?.displayFilename ?? "Select a document"}</h2>
                <p>{selectedDocument?.markdownPath ?? selectedDocument?.jsonPath ?? "Repository-relative path"}</p>
              </div>
              <div className="pair-status">
                <span>{selectedDocument?.pairStatus ?? "No document selected"}</span>
                <strong>{selectedDocument?.synchronizationState ?? "Waiting"}</strong>
              </div>
            </header>

            {selectedDocumentHasLocalError || documentError ? (
              <div className="document-error" role="status">
                {documentError || "Document pair status must be synchronized before applying a disposition."}
              </div>
            ) : null}

            {feedback ? (
              <div className="document-feedback" role="status">
                {feedback}
              </div>
            ) : null}

            <pre className="preview-body">
              {selectedDocument?.preview ?? neutralMessage}
            </pre>

            <div className="disposition-controls">
              <label>
                <span>Disposition</span>
                <select
                  disabled={!selectedDocument || selectedDocumentHasLocalError}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as DocumentDispositionStatus | "")
                  }
                  value={selectedStatus}
                >
                  <option value="">Select disposition</option>
                  {dispositionOptions.map((option) => (
                    <option key={option.status} value={option.status}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="apply-button"
                disabled={
                  !selectedDocument ||
                  !selectedStatus ||
                  selectedDocumentHasLocalError ||
                  isApplying
                }
                onClick={applyDisposition}
                type="button"
              >
                Apply Disposition
              </button>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function getResolverFeedback(result: FirstNonApprovedResult): string {
  if (result.status === "all-approved") {
    return result.message;
  }

  return `Document ${result.document.orderPosition} of ${result.document.totalDocumentCount}: ${result.document.displayTitle}`;
}

function CurrentDocumentSummary({
  resolverResult,
  selectedDocument,
}: {
  resolverResult: FirstNonApprovedResult | null;
  selectedDocument: PlanningDocumentDetail | null;
}): JSX.Element {
  if (resolverResult?.status === "all-approved") {
    return (
      <section className="current-document-summary">
        <span>Current workspace</span>
        <strong>All planning documents approved</strong>
      </section>
    );
  }

  const currentDocument: ResolvedCurrentDocument | null =
    resolverResult?.status === "current" ? resolverResult.document : null;

  return (
    <section className="current-document-summary">
      <span>Current workspace</span>
      <strong>{currentDocument?.owningWorkspace ?? "Manual review"}</strong>
      <span>Current document</span>
      <strong>{selectedDocument?.displayFilename ?? currentDocument?.displayTitle ?? "Select a document"}</strong>
      <span>Effective disposition</span>
      <strong>{selectedDocument?.effectiveDisposition ?? currentDocument?.effectiveDisposition ?? "Pending"}</strong>
      <span>Position</span>
      <strong>
        {currentDocument
          ? `Document ${currentDocument.orderPosition} of ${currentDocument.totalDocumentCount}`
          : "Document not resolved"}
      </strong>
    </section>
  );
}
