import type { WorkspaceId } from "../workspaceContracts";
import type { ProjectIntakeRailStatus } from "../projectIntake/projectIntakeCorpus";
import type {
  ArchitectInterviewRailStatus,
  ArchitectInterviewSelectedDocumentRole,
  ArchitectInterviewWorkspaceModel,
} from "../workspaceContracts";

export interface ProjectRailPresentationInput {
  activeWorkspaceId: WorkspaceId;
  requiredWorkspaceId: WorkspaceId | null;
  destinationWorkspaceId: WorkspaceId;
  descendantWorkspaceIds?: readonly WorkspaceId[];
  statusLabel?: ProjectIntakeRailStatus;
  architectInterviewStatus?: ArchitectInterviewRailStatus;
}

export interface ProjectRailPresentation {
  isSelected: boolean;
  isParentSelected: boolean;
  isRequired: boolean;
  statusLabel: ProjectIntakeRailStatus | ArchitectInterviewRailStatus | "CONTEXT" | "OPEN";
}

export function deriveProjectRailPresentation({
  activeWorkspaceId,
  descendantWorkspaceIds = [],
  destinationWorkspaceId,
  requiredWorkspaceId,
  architectInterviewStatus,
  statusLabel,
}: ProjectRailPresentationInput): ProjectRailPresentation {
  const isSelected = activeWorkspaceId === destinationWorkspaceId;
  const isParentSelected =
    !isSelected && descendantWorkspaceIds.includes(activeWorkspaceId);
  const isRequired =
    requiredWorkspaceId === destinationWorkspaceId ||
    Boolean(requiredWorkspaceId && descendantWorkspaceIds.includes(requiredWorkspaceId));

  return {
    isSelected,
    isParentSelected,
    isRequired,
    statusLabel: architectInterviewStatus ?? statusLabel ?? (isParentSelected ? "CONTEXT" : "OPEN"),
  };
}

export function shouldRenderInlineProjectIntakeDisposition(
  activeWorkspaceId: WorkspaceId,
  selectedDocumentId: string | null,
  documentLogicalDocumentId: string,
): boolean {
  return (
    activeWorkspaceId === "project-intake-capture" &&
    selectedDocumentId === documentLogicalDocumentId
  );
}

export function shouldRenderGenericPreviewDispositionControls(
  activeWorkspaceId: WorkspaceId,
  isSpecializedDispositionWorkspace: boolean,
): boolean {
  return (
    activeWorkspaceId !== "project-intake-capture" &&
    !isSpecializedDispositionWorkspace
  );
}

export function deriveArchitectInterviewRailStatus(
  model: ArchitectInterviewWorkspaceModel | null,
): ArchitectInterviewRailStatus {
  return model?.railStatus ?? "Open";
}

export function shouldRenderArchitectInterviewDispositionControls({
  canApplyDisposition,
  selectedRole,
}: {
  selectedRole: ArchitectInterviewSelectedDocumentRole;
  canApplyDisposition: boolean;
}): boolean {
  return selectedRole === "interview" && canApplyDisposition;
}

export function isArchitectInterviewDualPaneWorkspace(activeWorkspaceId: WorkspaceId): boolean {
  return activeWorkspaceId === "architect-interview";
}
