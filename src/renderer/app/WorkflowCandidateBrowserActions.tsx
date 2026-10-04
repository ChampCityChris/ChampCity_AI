import {Bot, FolderOpen, Clipboard, RefreshCw, RotateCcw} from "lucide-react";

/** Presentation slots only; callers own browser, handoff and SQL actions. */
export interface WorkflowCandidateBrowserActionsProps {
  copyHandoffLabel?: string; prepareHandoffLabel?: string; contextualActions?: JSX.Element;
  handoffActionsVisible?: boolean; canPrepareHandoff: boolean; canCopyHandoff: boolean;
  onCopyHandoff: () => void; onPrepareHandoff: () => void; onRefresh: () => void; onReloadBrowser: () => void;
  onRetryBrowser: () => void;
  showRetryButton?: boolean; isRevisionRequest?: boolean; actionMessage?: {kind: "error" | "success"; message: string} | null;
}

export function WorkflowCandidateBrowserActions({copyHandoffLabel = "Copy Handoff", contextualActions, handoffActionsVisible = true, canPrepareHandoff, canCopyHandoff, onCopyHandoff, onPrepareHandoff, onRefresh, onReloadBrowser, onRetryBrowser, prepareHandoffLabel = "Prepare Handoff", showRetryButton, isRevisionRequest, actionMessage}: WorkflowCandidateBrowserActionsProps): JSX.Element {
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
            <button disabled={!canPrepareHandoff} onClick={onPrepareHandoff} type="button">
              <FolderOpen aria-hidden="true" size={14} />
              {isRevisionRequest ? "Prepare Revision Request" : prepareHandoffLabel}
            </button>
            <button disabled={!canCopyHandoff} onClick={onCopyHandoff} type="button">
              <Clipboard aria-hidden="true" size={14} />
              {isRevisionRequest ? "Copy Revision Request" : copyHandoffLabel}
            </button>
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
