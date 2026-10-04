import type {ComponentProps, ReactNode, Ref} from "react";

import {FigmaDocumentCard} from "./FigmaDocumentCard";

export interface ArchitectInterviewShellProps {
  document: ComponentProps<typeof FigmaDocumentCard>;
  reviewControls?: ReactNode; browserCompanion: ReactNode; browserVisible: boolean; label: string;
  surfaceRef?: Ref<HTMLElement>;
}
/** Working RWS05A Greenfield composition; callers supply all authority and browser content. */
export function ArchitectInterviewShell(props: ArchitectInterviewShellProps): JSX.Element {
  return <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
    aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-doc-review-column"><FigmaDocumentCard {...props.document} />{props.reviewControls}</div>
    {props.browserCompanion}
  </section>;
}

export {WorkflowCandidateBrowserActions as ArchitectInterviewBrowserActions} from "./WorkflowCandidateBrowserActions";
export type {WorkflowCandidateBrowserActionsProps as ArchitectInterviewActionsProps} from "./WorkflowCandidateBrowserActions";
