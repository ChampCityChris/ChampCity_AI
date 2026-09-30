import type { ReactNode } from "react";

export interface DocumentChatWorkspaceShellProps {
  bodyClassName: string;
  browserActions: ReactNode;
  browserColumnClassName: string;
  browserPanel: ReactNode;
  className: string;
  documentColumn: ReactNode;
  documentColumnClassName: string;
  eyebrow: string;
  headerAction?: ReactNode;
  heading: string;
  headingId?: string;
  summary: ReactNode;
}

export function DocumentChatWorkspaceShell({
  bodyClassName, browserActions, browserColumnClassName, browserPanel, className,
  documentColumn, documentColumnClassName, eyebrow, headerAction, heading,
  headingId = "workspace-heading", summary,
}: DocumentChatWorkspaceShellProps): JSX.Element {
  return <section className={`issue-document-chat-workspace-shell ${className}`} aria-labelledby={headingId}>
    <header className="issue-resolution-header">
      <div>
        <span>{eyebrow}</span>
        <h1 id={headingId}>{heading}</h1>
        {typeof summary === "string" ? <p>{summary}</p> : summary}
      </div>
      {headerAction}
    </header>
    <div className={`figma-doc-chat-workspace ${bodyClassName}`}>
      <div className={`figma-doc-review-column ${documentColumnClassName}`}>{documentColumn}</div>
      <div className={`figma-browser-column ${browserColumnClassName}`}>{browserPanel}{browserActions}</div>
    </div>
  </section>;
}
