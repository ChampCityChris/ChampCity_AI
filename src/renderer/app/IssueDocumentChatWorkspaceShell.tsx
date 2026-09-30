import { DocumentChatWorkspaceShell, type DocumentChatWorkspaceShellProps } from "./DocumentChatWorkspaceShell";

export function IssueDocumentChatWorkspaceShell(props: Omit<DocumentChatWorkspaceShellProps, "eyebrow">): JSX.Element {
  return <DocumentChatWorkspaceShell {...props} eyebrow="Issue Resolution" />;
}
