import type {ComponentProps, ReactNode, Ref} from "react";

import {FigmaDocumentCard} from "./FigmaDocumentCard";

export interface WorkCardPlanningShellProps {
  document: ComponentProps<typeof FigmaDocumentCard>;
  reviewControls?: ReactNode; browserCompanion: ReactNode; browserVisible: boolean; label: string;
  surfaceRef?: Ref<HTMLElement>;
}
/** 965536de Work Card Planning composition; callers supply all authority and browser content. */
export function WorkCardPlanningShell(props: WorkCardPlanningShellProps): JSX.Element {
  return <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
    aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-doc-review-column"><FigmaDocumentCard {...props.document} />{props.reviewControls}</div>
    {props.browserCompanion}
  </section>;
}

export {WorkflowCandidateBrowserActions as WorkCardPlanningBrowserActions} from "./WorkflowCandidateBrowserActions";
export type {WorkflowCandidateBrowserActionsProps as WorkCardPlanningActionsProps} from "./WorkflowCandidateBrowserActions";
