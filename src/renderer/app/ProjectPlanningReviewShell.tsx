import {useState, type ComponentProps, type ReactNode, type Ref} from "react";

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
  return <div className="workspace-shell-frame"><ProjectPlanningBlockerBanner blocker={props.blocker} />
    <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
      aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
      <div className="figma-doc-review-column"><FigmaDocumentCard {...props.document} /><FigmaDocumentDispositionPanel {...props.review} /></div>
      {props.browserCompanion}
    </section></div>;
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

export {WorkflowCandidateBrowserActions as ProjectPlanningBrowserActions} from "./WorkflowCandidateBrowserActions";
export type {WorkflowCandidateBrowserActionsProps as ProjectPlanningActionsProps} from "./WorkflowCandidateBrowserActions";
