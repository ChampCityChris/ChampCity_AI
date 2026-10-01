import type { ComponentProps, ReactNode, Ref } from "react";
import { ArchitectWorkspaceShell } from "./ArchitectWorkspaceShell";
import { FigmaDocumentCard } from "./FigmaDocumentCard";

export function GreenfieldArchitectWorkspace(props: {
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

export async function readArchitectReviewDocument(
  id: string,
  model: import("../../shared/workspaceContracts").ArchitectOutputWorkspaceModel | null | undefined,
  readRepositoryDocument: (id: string) => Promise<import("../../shared/documents/planningDocument").PlanningDocumentDetail>,
): Promise<import("../../shared/documents/planningDocument").PlanningDocumentDetail> {
  const detail = model?.workspaceId === "architect-interview"
    ? (model.domain as import("../../shared/workspaceContracts").ArchitectInterviewWorkspaceModel | undefined)?.intakeRecoveryDetail
    : undefined;
  return detail?.logicalDocumentId === id ? detail : readRepositoryDocument(id);
}
