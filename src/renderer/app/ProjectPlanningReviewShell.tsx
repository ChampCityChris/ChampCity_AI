import {useState, type ComponentProps, type ReactNode, type Ref} from "react";
import {Bot, FileText, FolderOpen, Clipboard, RefreshCw, RotateCcw} from "lucide-react";
import {FigmaDocumentCard} from "./FigmaDocumentCard";
import {FigmaDocumentDispositionPanel} from "./FigmaDocumentDispositionPanel";

export interface ProjectPlanningReviewShellProps {
  label: string; browserVisible: boolean; browserCompanion: ReactNode; surfaceRef?: Ref<HTMLElement>;
  blocker: ProjectPlanningBlocker | null;
  document: ComponentProps<typeof FigmaDocumentCard>;
  review: ComponentProps<typeof FigmaDocumentDispositionPanel>;
}
/** Exact 965536de Project Planning document/browser composition; all authority supplied. */
export function ProjectPlanningReviewShell(props: ProjectPlanningReviewShellProps): JSX.Element {
  return <><ProjectPlanningBlockerBanner blocker={props.blocker} />
    <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
      aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
      <div className="figma-doc-review-column"><FigmaDocumentCard {...props.document} /><FigmaDocumentDispositionPanel {...props.review} /></div>
      {props.browserCompanion}
    </section></>;
}

export interface ProjectPlanningBlocker {reason: string; requiredAction: string; evidencePaths: string[]}
export function ProjectPlanningBlockerBanner({blocker}: {blocker: ProjectPlanningBlocker | null}): JSX.Element | null {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  if (!blocker) return null;
  const reason = blocker.reason;
  const requiredAction = blocker.requiredAction;
  const shouldRenderRequiredAction =
    requiredAction.trim() !== "" && requiredAction.trim() !== reason.trim();
  const evidencePaths = blocker.evidencePaths
    .map((evidencePath) => evidencePath.trim())
    .filter(Boolean);
  const visibleEvidencePaths = evidenceExpanded ? evidencePaths : evidencePaths.slice(0, 3);
  const hiddenEvidencePathCount = evidencePaths.length - visibleEvidencePaths.length;

  return (
    <section className="project-planning-blocker-banner" role="status" aria-live="polite">
      <div className="project-planning-blocker-copy">
        <h2>Project Planning Needs Attention</h2>
        <p>{reason}</p>
        {shouldRenderRequiredAction ? (
          <p>
            <strong>Required action:</strong> {requiredAction}
          </p>
        ) : null}
      </div>
      {evidencePaths.length > 0 ? (
        <div className="project-planning-blocker-evidence">
          <span>Evidence</span>
          <ul>
            {visibleEvidencePaths.map((evidencePath) => (
              <li key={evidencePath}>{evidencePath}</li>
            ))}
          </ul>
          {evidencePaths.length > 3 ? (
            <button
              className="project-planning-blocker-disclosure"
              onClick={() => setEvidenceExpanded((current) => !current)}
              type="button"
            >
              {evidenceExpanded ? "Show less" : `Show ${hiddenEvidencePathCount} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export interface ProjectPlanningActionsProps {
  copyHandoffLabel?: string; prepareHandoffLabel?: string; contextualActions?: JSX.Element;
  handoffActionsVisible?: boolean; canRegeneratePrompt?: boolean; canPrepareHandoff: boolean; canCopyHandoff: boolean;
  canPrepareFinalDraftHandoff?: boolean; canCopyFinalDraftHandoff?: boolean;
  onCopyHandoff: () => void; onPrepareHandoff: () => void; onRefresh: () => void; onReloadBrowser: () => void;
  onRetryBrowser: () => void; onRegeneratePrompt?: () => void; onCopyFinalDraftHandoff?: () => void; onPrepareFinalDraftHandoff?: () => void;
  showRetryButton?: boolean; isRevisionRequest?: boolean; actionMessage?: {kind: "error" | "success"; message: string} | null;
}
export function ProjectPlanningBrowserActions({copyHandoffLabel = "Copy Handoff", contextualActions, handoffActionsVisible = true, canRegeneratePrompt, canPrepareHandoff, canCopyHandoff, canPrepareFinalDraftHandoff, canCopyFinalDraftHandoff, onCopyHandoff, onCopyFinalDraftHandoff, onPrepareHandoff, onPrepareFinalDraftHandoff, onRegeneratePrompt, onRefresh, onReloadBrowser, onRetryBrowser, prepareHandoffLabel = "Prepare Handoff", showRetryButton, isRevisionRequest, actionMessage}: ProjectPlanningActionsProps): JSX.Element {
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
