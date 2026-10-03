import type {ComponentProps, ReactNode, Ref} from "react";
import {Bot, FileText, FolderOpen, Clipboard, RefreshCw, RotateCcw} from "lucide-react";
import {FigmaDocumentCard} from "./FigmaDocumentCard";

export interface PhaseInterviewActionsProps {
  copyHandoffLabel?: string; prepareHandoffLabel?: string; contextualActions?: JSX.Element;
  handoffActionsVisible?: boolean; canRegeneratePrompt?: boolean; canPrepareHandoff: boolean; canCopyHandoff: boolean;
  canPrepareFinalDraftHandoff?: boolean; canCopyFinalDraftHandoff?: boolean;
  onCopyHandoff: () => void; onPrepareHandoff: () => void; onRefresh: () => void; onReloadBrowser: () => void;
  onRetryBrowser: () => void; onRegeneratePrompt?: () => void; onCopyFinalDraftHandoff?: () => void; onPrepareFinalDraftHandoff?: () => void;
  showRetryButton?: boolean; isRevisionRequest?: boolean; actionMessage?: {kind: "error" | "success"; message: string} | null;
}
export interface PhaseInterviewShellProps {
  document: ComponentProps<typeof FigmaDocumentCard>;
  reviewControls?: ReactNode; browserCompanion: ReactNode; browserVisible: boolean; label: string;
  surfaceRef?: Ref<HTMLElement>;
}
/** 965536de Phase Interview composition; callers supply all authority and browser content. */
export function PhaseInterviewShell(props: PhaseInterviewShellProps): JSX.Element {
  return <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
    aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-doc-review-column"><FigmaDocumentCard {...props.document} />{props.reviewControls}</div>
    {props.browserCompanion}
  </section>;
}

export function PhaseInterviewBrowserActions({copyHandoffLabel = "Copy Handoff", contextualActions, handoffActionsVisible = true, canRegeneratePrompt, canPrepareHandoff, canCopyHandoff, canPrepareFinalDraftHandoff, canCopyFinalDraftHandoff, onCopyHandoff, onCopyFinalDraftHandoff, onPrepareHandoff, onPrepareFinalDraftHandoff, onRegeneratePrompt, onRefresh, onReloadBrowser, onRetryBrowser, prepareHandoffLabel = "Prepare Handoff", showRetryButton, isRevisionRequest, actionMessage}: PhaseInterviewActionsProps): JSX.Element {
  return (
    <section className="figma-browser-actions-panel" aria-label="Browser actions">
      <header>
        <span>Browser Actions</span>
      </header>
      <div className="figma-browser-actions-row">
        <button className="primary-action" onClick={onReloadBrowser} type="button">
          <Bot aria-hidden="true" size={14} />
          Reload ChatGPT
        </button>
        {handoffActionsVisible ? (
          <>
            <i aria-hidden="true" />
            {canRegeneratePrompt && onRegeneratePrompt ? (
              <button onClick={onRegeneratePrompt} type="button">
                <FileText aria-hidden="true" size={14} />
                Regenerate Interview Prompt
              </button>
            ) : null}
            <button disabled={!canPrepareHandoff} onClick={onPrepareHandoff} type="button">
              <FolderOpen aria-hidden="true" size={14} />
              {isRevisionRequest ? "Prepare Revision Request" : prepareHandoffLabel}
            </button>
            <button disabled={!canCopyHandoff} onClick={onCopyHandoff} type="button">
              <Clipboard aria-hidden="true" size={14} />
              {isRevisionRequest ? "Copy Revision Request" : copyHandoffLabel}
            </button>
            {onPrepareFinalDraftHandoff && onCopyFinalDraftHandoff ? (
              <>
                <button
                  disabled={!canPrepareFinalDraftHandoff}
                  onClick={onPrepareFinalDraftHandoff}
                  type="button"
                >
                  <FileText aria-hidden="true" size={14} />
                  Prepare Final Draft Handoff
                </button>
                <button
                  disabled={!canCopyFinalDraftHandoff}
                  onClick={onCopyFinalDraftHandoff}
                  type="button"
                >
                  <Clipboard aria-hidden="true" size={14} />
                  Copy Final Draft Handoff
                </button>
              </>
            ) : null}
          </>
        ) : null}
        {contextualActions ? (
          <>
            <i aria-hidden="true" />
            {contextualActions}
          </>
        ) : null}
        <button onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={14} />
          Refresh
        </button>
        {showRetryButton ? (
          <button onClick={onRetryBrowser} type="button">
            <RotateCcw aria-hidden="true" size={14} />
            Retry Browser
          </button>
        ) : null}
      </div>
      {actionMessage ? (
        <div className={`figma-browser-action-message ${actionMessage.kind}`} role="status">
          {actionMessage.message}
        </div>
      ) : null}
    </section>
  );
}

