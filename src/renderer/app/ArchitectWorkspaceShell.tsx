import type { ReactNode, Ref } from "react";

export interface ArchitectWorkspaceShellProps {
  heading?: ReactNode;
  context?: ReactNode;
  headerActions?: ReactNode;
  reviewContent: ReactNode;
  reviewControls?: ReactNode;
  browserCompanion: ReactNode;
  feedback?: ReactNode;
  browserVisible: boolean;
  label: string;
  surfaceRef?: Ref<HTMLElement>;
}

export function ArchitectWorkspaceShell(props: ArchitectWorkspaceShellProps): JSX.Element {
  return <section className={["figma-doc-chat-workspace", !props.browserVisible ? "chat-hidden" : ""].filter(Boolean).join(" ")}
    aria-label={props.label} ref={props.surfaceRef} tabIndex={-1}>
    <div className="figma-doc-review-column">
      {props.heading}{props.context}{props.headerActions}{props.feedback}
      {props.reviewContent}{props.reviewControls}
    </div>
    {props.browserCompanion}
  </section>;
}
