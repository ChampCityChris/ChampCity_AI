import type { WorkspaceId } from "../workspaceContracts";
import type { PlanningDocumentSummary } from "../documents/planningDocument";
import type { ProjectIntakeRailStatus } from "../projectIntake/projectIntakeCorpus";
import type {
  ArchitectInterviewRailStatus,
  ArchitectInterviewSelectedDocumentRole,
  ArchitectInterviewWorkspaceModel,
  ProjectLifecycleRailStatus,
} from "../workspaceContracts";

export interface ProjectRailPresentationInput {
  activeWorkspaceId: WorkspaceId;
  requiredWorkspaceId: WorkspaceId | null;
  destinationWorkspaceId: WorkspaceId;
  descendantWorkspaceIds?: readonly WorkspaceId[];
  statusLabel?: ProjectLifecycleRailStatus | ProjectIntakeRailStatus | ArchitectInterviewRailStatus;
  architectInterviewStatus?: ArchitectInterviewRailStatus;
}

export interface ProjectRailPresentation {
  isSelected: boolean;
  isParentSelected: boolean;
  isRequired: boolean;
  statusLabel: ProjectLifecycleRailStatus | ProjectIntakeRailStatus | ArchitectInterviewRailStatus;
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
    statusLabel: architectInterviewStatus ?? statusLabel ?? "Open",
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

export function shouldRenderPhaseMapDispositionControls(
  selectedDocument: Pick<
    PlanningDocumentSummary,
    "documentReadState" | "effectiveDisposition" | "metadata" | "readError"
  > | null,
): boolean {
  if (!selectedDocument) {
    return false;
  }
  if (
    selectedDocument.readError ||
    (selectedDocument.documentReadState && selectedDocument.documentReadState !== "readable")
  ) {
    return false;
  }
  return (
    selectedDocument.metadata.artifactType === "phase-map" &&
    selectedDocument.metadata.participationRole !== "nonReviewHandoff" &&
    (
      selectedDocument.effectiveDisposition === "Pending" ||
      selectedDocument.effectiveDisposition === "Rejected" ||
      selectedDocument.effectiveDisposition === "RevisionRequested"
    )
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
  return activeWorkspaceId === "architect-interview" ||
    activeWorkspaceId === "project-planning-review" ||
    activeWorkspaceId === "phase-interview" ||
    activeWorkspaceId === "project-phase-map";
}
