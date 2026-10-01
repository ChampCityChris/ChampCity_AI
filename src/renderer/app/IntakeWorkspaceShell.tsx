import type { ReactNode } from "react";

export interface IntakeWorkspaceShellProps {
  heading: string;
  headerActions?: ReactNode;
  intake: ReactNode;
  companion: ReactNode;
}

/** Presentation boundary for intake geometry; application actions arrive as content. */
export function IntakeWorkspaceShell({ heading, headerActions, intake, companion }: IntakeWorkspaceShellProps): JSX.Element {
  return (
    <>
      <header className="workspace-header">
        <div className="workspace-heading-copy"><h1 id="workspace-heading">{heading}</h1></div>
        {headerActions ? <div className="workspace-actions">{headerActions}</div> : null}
      </header>
      <section className="intake-workspace-shell" aria-label={heading}>
        <div className="intake-workspace-shell-intake" role="region" aria-label="Intake content">{intake}</div>
        <div className="intake-workspace-shell-companion" role="region" aria-label="Intake companion">{companion}</div>
      </section>
    </>
  );
}
