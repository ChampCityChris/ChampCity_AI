import type { ComponentProps, ReactNode, Ref } from "react";
import { ArchitectWorkspaceShell } from "./ArchitectWorkspaceShell";
import { FigmaDocumentCard } from "./FigmaDocumentCard";

export function LegacyArchitectOutputWorkspace(props: {
  document: ComponentProps<typeof FigmaDocumentCard>;
  reviewControls: ReactNode;
  browserCompanion: ReactNode;
  browserVisible: boolean;
  label: string;
  surfaceRef?: Ref<HTMLElement>;
}): JSX.Element {
  return <ArchitectWorkspaceShell
    browserVisible={props.browserVisible} label={props.label} surfaceRef={props.surfaceRef}
    reviewContent={<FigmaDocumentCard {...props.document} />}
    reviewControls={props.reviewControls} browserCompanion={props.browserCompanion} />;
}
