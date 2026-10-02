import type { ReactNode, Ref } from "react";

export interface ArchitectWorkspaceShellProps {
  heading?: ReactNode;
  context?: ReactNode;
  headerActions?: ReactNode;
  navigation?: ReactNode;
  reviewContent: ReactNode;
  reviewControls?: ReactNode;
  browserCompanion: ReactNode;
  browserActions?: ReactNode;
  feedback?: ReactNode;
  browserVisible: boolean;
  label: string;
  surfaceRef?: Ref<HTMLElement>;
}

export function ArchitectWorkspaceShell(props: ArchitectWorkspaceShellProps): JSX.Element {
  return <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
    aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-doc-review-column">
      {props.navigation ? <nav className="architect-workspace-navigation">{props.navigation}</nav> : null}
      {props.heading}{props.context}{props.headerActions}{props.feedback}
      {props.reviewContent}{props.reviewControls}
    </div>
    <div className="figma-browser-column">{props.browserCompanion}{props.browserActions}</div>
  </section>;
}
