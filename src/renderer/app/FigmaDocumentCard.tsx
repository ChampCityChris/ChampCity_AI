import { Clipboard, FileText } from "lucide-react";
import { useState } from "react";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";
import {
  PhaseMapDocumentPreview,
  shouldRenderPhaseMapDocumentPreview,
} from "./phaseMapPresentation";
import {
  shouldRenderWorkCardPlanDocumentPreview,
  WorkCardPlanDocumentPreview,
} from "./workCardPlanPresentation";

const defaultNeutralMessage = "Document workflow not yet implemented";

export function FigmaDocumentCard({
  documentError,
  feedback,
  neutralMessage = defaultNeutralMessage,
  onCopy,
  onExport,
  onSelectSlot,
  selectedDocument,
  selectedSlotId,
  slots = [],
}: {
  documentError: string;
  feedback: string;
  neutralMessage?: string;
  onCopy: () => void;
  onExport?: (request: import("../../shared/workspaceContracts").MarkdownExportRequest) => void;
  onSelectSlot?: (slotId: string, logicalDocumentId?: string) => void;
  selectedDocument: PlanningDocumentDetail | null;
  selectedSlotId?: string | null;
  slots?: Array<{slotId: string; displayLabel: string; logicalDocumentId?: string}>;
}): JSX.Element {
  const [exportFeedback, setExportFeedback] = useState("");
  const hasTabs = slots.length > 1 && Boolean(onSelectSlot);
  const selectedStatus = selectedDocument?.effectiveDisposition ?? "Pending";
  const displayMarkdown = selectedDocument?.bodyMarkdown ?? selectedDocument?.preview ?? "";

  return (
    <article className="figma-document-card" aria-label="Current document">
      {hasTabs ? (
        <div className="figma-document-tabs" role="tablist" aria-label="Current output documents">
          {slots.map((slot) => {
            const isActive = selectedSlotId === slot.slotId ||
              Boolean(slot.logicalDocumentId && slot.logicalDocumentId === selectedDocument?.logicalDocumentId);
            return (
              <button
                aria-selected={isActive}
                className={isActive ? "active" : ""}
                disabled={!slot.logicalDocumentId}
                key={slot.slotId}
                onClick={() => onSelectSlot?.(slot.slotId, slot.logicalDocumentId)}
                type="button"
              >
                <FileText aria-hidden="true" size={14} />
                {slot.displayLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      <header className="figma-document-card-header">
        <div className="figma-document-title-row">
          <FileText aria-hidden="true" size={14} />
          <strong>{selectedDocument?.displayFilename ?? "No document selected"}</strong>
        </div>
        <div className="figma-document-card-actions">
          {selectedDocument ? (
            <span className={`figma-document-status ${selectedStatus.toLowerCase()}`}>
              {selectedStatus}
            </span>
          ) : null}
          <button disabled={!selectedDocument} onClick={onCopy} type="button">
            <Clipboard aria-hidden="true" size={13} />
            Copy
          </button>
          {selectedDocument && (selectedDocument.bodyMarkdown !== undefined || selectedDocument.preview !== undefined) ? <button onClick={() => {
            const request = {suggestedFilename: markdownFilename(selectedDocument.displayFilename), markdown: displayMarkdown};
            if (onExport) onExport(request);
            else void window.champcity.exportMarkdownDocument(request).then(result => setExportFeedback(result.status === "saved" ? `Markdown exported to ${result.path}` : "Markdown export cancelled.")).catch(reason => setExportFeedback(`Markdown export failed: ${reason instanceof Error ? reason.message : String(reason)}`));
          }} type="button">Export Markdown…</button> : null}
        </div>
      </header>

      <div className="figma-document-path-row">
        <FileText aria-hidden="true" size={12} />
        <span>{selectedDocument?.markdownPath ?? "Repository-relative path"}</span>
      </div>

      {selectedDocumentHasError(selectedDocument, documentError) ? (
        <div className="document-error" role="status">
          {documentError || selectedDocument?.readError || "Document must be readable as canonical Markdown before applying a disposition."}
        </div>
      ) : null}

      {feedback || exportFeedback ? <div className="document-feedback" role="status">{exportFeedback || feedback}</div> : null}

      <div className="figma-document-card-body">
        {selectedDocument && shouldRenderPhaseMapDocumentPreview(selectedDocument) ? (
          <PhaseMapDocumentPreview document={selectedDocument} />
        ) : selectedDocument && shouldRenderWorkCardPlanDocumentPreview(selectedDocument) ? (
          <WorkCardPlanDocumentPreview document={selectedDocument} />
        ) : selectedDocument ? (
          <FigmaMarkdownBody markdown={selectedDocument.bodyMarkdown ?? selectedDocument.preview ?? ""} />
        ) : (
          <div className="figma-empty-document">
            <strong>No document yet</strong>
            <span>{neutralMessage}</span>
          </div>
        )}
      </div>

      <footer className="figma-document-card-footer">
        <span>{selectedDocument?.markdownPath ?? "Repository-relative path"}</span>
      </footer>
    </article>
  );
}

function markdownFilename(suggestion?: string): string {
  const safe = (suggestion ?? "document.md").split(/[\\/]/).at(-1)!.replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || "document";
  return `${safe.replace(/\.md$/i, "")}.md`;
}

export function FigmaMarkdownBody({ markdown }: { markdown: string }): JSX.Element {
  const lines = markdown.split(/\r?\n/);
  return (
    <div className="figma-markdown-body">
      {lines.map((line, index) => {
        const key = `${index}-${line.slice(0, 16)}`;
        const trimmed = line.trim();
        if (!trimmed) {
          return <div className="figma-markdown-space" key={key} />;
        }
        if (trimmed.startsWith("### ")) {
          return <h4 key={key}>{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={key}>{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={key}>{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <p className="figma-markdown-list-item" key={key}>
              <span aria-hidden="true">-</span>
              {trimmed.slice(2)}
            </p>
          );
        }
        return <p key={key}>{trimmed}</p>;
      })}
    </div>
  );
}

function selectedDocumentHasError(
  selectedDocument: PlanningDocumentDetail | null,
  documentError: string,
): boolean {
  return Boolean(documentError || selectedDocument?.readError);
}
