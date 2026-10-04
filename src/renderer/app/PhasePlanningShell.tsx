import type {ComponentProps, ReactNode, Ref} from "react";

import {FigmaDocumentCard} from "./FigmaDocumentCard";

export interface PhasePlanningShellProps {
  document: ComponentProps<typeof FigmaDocumentCard>;
  reviewControls?: ReactNode; browserCompanion: ReactNode; browserVisible: boolean; label: string;
  surfaceRef?: Ref<HTMLElement>;
}
/** 965536de Phase Planning composition; callers supply all authority and browser content. */
export function PhasePlanningShell(props: PhasePlanningShellProps): JSX.Element {
  return <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
    aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-doc-review-column"><FigmaDocumentCard {...props.document} />{props.reviewControls}</div>
    {props.browserCompanion}
  </section>;
}

export {WorkflowCandidateBrowserActions as PhasePlanningBrowserActions} from "./WorkflowCandidateBrowserActions";
export type {WorkflowCandidateBrowserActionsProps as PhasePlanningActionsProps} from "./WorkflowCandidateBrowserActions";
