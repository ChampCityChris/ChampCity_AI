import { useEffect, useMemo, useState } from "react";
import { FolderOpen, RefreshCw, RotateCcw } from "lucide-react";
import logoUrl from "../assets/champcity_ai_ui_branding.png";
import {
  projectTypeOptions,
  workspaceDefinitions,
  type ArchitectBrowserFoundationStatus,
  type ProjectIntakeSubmission,
  type WorkspaceId,
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

const emptyProjectIntake: ProjectIntakeSubmission = {
  projectName: "",
  projectPurpose: "",
  desiredOutcome: "",
  projectType: "Desktop application",
  projectRepository: "",
  hasExistingSourceOrPlanning: false,
  knownConstraints: "",
  repositoryReviewContext: "",
};

export function App(): JSX.Element {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<WorkspaceId>(
    workspaceDefinitions[0].id,
  );
  const [workspace, setWorkspace] = useState<WorkspaceSelection>(fallbackWorkspace);
  const [documents, setDocuments] = useState<PlanningDocumentSummary[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PlanningDocumentDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DocumentDispositionStatus | "">("");
  const [feedback, setFeedback] = useState<string>("");
  const [documentError, setDocumentError] = useState<string>("");
  const [resolverResult, setResolverResult] = useState<FirstNonApprovedResult | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [isChoosingProjectRepository, setIsChoosingProjectRepository] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [projectIntake, setProjectIntake] =
    useState<ProjectIntakeSubmission>(emptyProjectIntake);
  const [architectStatus, setArchitectStatus] =
    useState<ArchitectBrowserFoundationStatus | null>(null);

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

  useEffect(() => {
    if (activeWorkspaceId === "architect-interview" && workspace.ok) {
      void refreshArchitectStatus();
    }
  }, [activeWorkspaceId, workspace.ok]);

  const workspaceGroups = useMemo(
    () => getWorkspaceGroups(documents, activeWorkspaceId),
    [activeWorkspaceId, documents],
  );
  const workspaceCounts = useMemo(() => getWorkspaceDocumentCounts(documents), [documents]);
  const currentResolvedWorkspace =
    resolverResult?.status === "current" &&
    resolverResult.document.owningWorkspaceId === activeWorkspaceId
      ? {
          id: resolverResult.document.owningWorkspaceId,
          label: `${resolverResult.document.owningWorkspace} (not yet implemented)`,
        }
      : null;
  const activeWorkspace =
    workspaceDefinitions.find((definition) => definition.id === activeWorkspaceId) ??
    currentResolvedWorkspace ??
    workspaceDefinitions[0];
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

  async function chooseProjectRepository(): Promise<void> {
    setIsChoosingProjectRepository(true);
    setDocumentError("");
    try {
      const selection = await window.champcity.chooseProjectRepositoryFolder();
      if (selection.ok && "repositoryPath" in selection) {
        setProjectIntake((current) => ({
          ...current,
          projectRepository: selection.repositoryPath,
        }));
      } else if (!selection.ok) {
        setDocumentError(selection.reason);
      }
    } finally {
      setIsChoosingProjectRepository(false);
    }
  }

  async function submitProjectIntake(): Promise<void> {
    setIsSubmittingIntake(true);
    setDocumentError("");
    setFeedback("");
    try {
      const result = await window.champcity.submitProjectIntake(projectIntake);
      setFeedback(
        `Project Intake saved: ${result.projectIntakeMarkdownPath}; prompt saved: ${result.architectPromptMarkdownPath}.`,
      );
      const nextDocuments = await window.champcity.listDocuments();
      setDocuments(nextDocuments);
      const nextResolverResult = await window.champcity.resolveCurrentDocument();
      setResolverResult(nextResolverResult);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Project Intake could not be saved.");
    } finally {
      setIsSubmittingIntake(false);
    }
  }

  async function refreshArchitectStatus(): Promise<void> {
    setDocumentError("");
    try {
      setArchitectStatus(await window.champcity.getArchitectBrowserFoundationStatus());
    } catch (error) {
      setArchitectStatus(null);
      setDocumentError(error instanceof Error ? error.message : "Architect browser status could not be loaded.");
    }
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
      setActiveWorkspaceId(result.document.owningWorkspaceId);
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
        setActiveWorkspaceId(nextResolverResult.document.owningWorkspaceId);
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
          {workspaceDefinitions.map((definition) => (
            <button
              className={
                definition.id === activeWorkspaceId
                  ? "workspace-tab active"
                  : "workspace-tab"
              }
              key={definition.id}
              onClick={() => setActiveWorkspaceId(definition.id)}
              type="button"
            >
              <span>{definition.label}</span>
              <small>{workspaceCounts[definition.id] ?? 0}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace-surface" aria-labelledby="workspace-heading">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">ChampCity A/I</p>
            <h1 id="workspace-heading">{activeWorkspace.label}</h1>
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

        {activeWorkspaceId === "project-intake-capture" ? (
          <ProjectIntakeCapture
            isChoosingProjectRepository={isChoosingProjectRepository}
            isSubmittingIntake={isSubmittingIntake}
            onChange={setProjectIntake}
            onChooseProjectRepository={chooseProjectRepository}
            onSubmit={submitProjectIntake}
            value={projectIntake}
          />
        ) : null}

        {activeWorkspaceId === "architect-interview" ? (
          <ArchitectInterviewFoundation
            onRefresh={refreshArchitectStatus}
            status={architectStatus}
          />
        ) : null}

        <section className="document-workspace" aria-label={activeWorkspace.label}>
          <div className="document-list" aria-label={`${activeWorkspace.label} documents`}>
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

function ArchitectInterviewFoundation({
  onRefresh,
  status,
}: {
  onRefresh: () => void;
  status: ArchitectBrowserFoundationStatus | null;
}): JSX.Element {
  return (
    <section className="architect-foundation" aria-label="Architect Interview Browser Foundation">
      <div>
        <span>Browser state</span>
        <strong>{status?.browserState ?? "browser-unavailable"}</strong>
      </div>
      <div>
        <span>Handoff state</span>
        <strong>{status?.handoff.state ?? "handoff-unavailable"}</strong>
      </div>
      <div>
        <span>Session partition</span>
        <strong>{status?.sessionPartition ?? "persist:champcity-architect"}</strong>
      </div>
      <div>
        <span>Surface</span>
        <strong>{status?.surfaceUrl ?? "Not loaded"}</strong>
      </div>
      <button className="icon-button text-button" onClick={onRefresh} type="button">
        <RefreshCw aria-hidden="true" size={18} />
        Refresh
      </button>
      {status?.handoff.state === "handoff-ready" ? (
        <pre className="handoff-manifest">
{[
  status.handoff.promptMarkdownPath,
  status.handoff.promptJsonPath,
  status.handoff.projectIntakeMarkdownPath,
  status.handoff.projectIntakeJsonPath,
].join("\n")}
        </pre>
      ) : (
        <p>{status?.handoff.reason ?? "Project Intake and prompt artifacts are required."}</p>
      )}
    </section>
  );
}

function ProjectIntakeCapture({
  isChoosingProjectRepository,
  isSubmittingIntake,
  onChange,
  onChooseProjectRepository,
  onSubmit,
  value,
}: {
  isChoosingProjectRepository: boolean;
  isSubmittingIntake: boolean;
  onChange: (value: ProjectIntakeSubmission) => void;
  onChooseProjectRepository: () => void;
  onSubmit: () => void;
  value: ProjectIntakeSubmission;
}): JSX.Element {
  const update = <Key extends keyof ProjectIntakeSubmission>(
    key: Key,
    nextValue: ProjectIntakeSubmission[Key],
  ): void => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <section className="intake-form" aria-label="Project Intake Capture">
      <label>
        <span>Project Name</span>
        <input
          onChange={(event) => update("projectName", event.target.value)}
          value={value.projectName}
        />
      </label>
      <label>
        <span>Project Purpose</span>
        <textarea
          onChange={(event) => update("projectPurpose", event.target.value)}
          value={value.projectPurpose}
        />
      </label>
      <label>
        <span>Desired Outcome</span>
        <textarea
          onChange={(event) => update("desiredOutcome", event.target.value)}
          value={value.desiredOutcome}
        />
      </label>
      <label>
        <span>Project Type</span>
        <select
          onChange={(event) =>
            update("projectType", event.target.value as ProjectIntakeSubmission["projectType"])
          }
          value={value.projectType}
        >
          {projectTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="intake-repository-row">
        <label>
          <span>Project Repository</span>
          <input readOnly value={value.projectRepository} />
        </label>
        <button
          className="icon-button text-button"
          disabled={isChoosingProjectRepository}
          onClick={onChooseProjectRepository}
          type="button"
        >
          <FolderOpen aria-hidden="true" size={18} />
          {isChoosingProjectRepository ? "Choosing..." : "Choose"}
        </button>
      </div>
      <label className="checkbox-row">
        <input
          checked={value.hasExistingSourceOrPlanning}
          onChange={(event) => update("hasExistingSourceOrPlanning", event.target.checked)}
          type="checkbox"
        />
        <span>Existing source code or project-planning documents</span>
      </label>
      <label>
        <span>Known Constraints or Non-Negotiables</span>
        <textarea
          onChange={(event) => update("knownConstraints", event.target.value)}
          value={value.knownConstraints ?? ""}
        />
      </label>
      {value.hasExistingSourceOrPlanning ? (
        <label>
          <span>Repository Review Context</span>
          <textarea
            onChange={(event) => update("repositoryReviewContext", event.target.value)}
            value={value.repositoryReviewContext ?? ""}
          />
        </label>
      ) : null}
      <button
        className="apply-button"
        disabled={isSubmittingIntake}
        onClick={onSubmit}
        type="button"
      >
        {isSubmittingIntake ? "Saving..." : "Submit Project Intake"}
      </button>
    </section>
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
