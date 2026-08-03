import type {
  ArchitectOutputDocumentSlotModel,
  ArchitectOutputPresentedSlotRevision,
  ArchitectOutputWorkspaceModel,
} from "../../shared/workspaceContracts";
import type { PlanningDocumentDetail } from "../../shared/documents/planningDocument";

export function buildArchitectOutputEvidenceFingerprint(
  workspaceRoot: string,
  model: ArchitectOutputWorkspaceModel,
): string {
  return JSON.stringify({
    workspaceRoot,
    workspaceId: model.workspaceId,
    outputKind: model.outputKind,
    state: model.state,
    handoff: model.handoff,
    submission: model.submission,
    slots: model.documentSlots.map((slot) => ({
      slotId: slot.slotId,
      targetPath: slot.targetPath,
      logicalDocumentId: slot.logicalDocumentId,
      artifactRevision: slot.artifactRevision,
      disposition: slot.disposition,
      documentReadState: slot.documentReadState,
      freshnessState: slot.freshnessState,
      readError: slot.readError ?? "",
    })),
  });
}

export function selectArchitectOutputSlot(
  model: ArchitectOutputWorkspaceModel,
  selectedSlotId: string | null,
): ArchitectOutputDocumentSlotModel | undefined {
  return model.documentSlots.find((slot) => slot.slotId === selectedSlotId) ??
    model.documentSlots.find((slot) => slot.logicalDocumentId) ??
    model.documentSlots[0];
}

export function revisionKeyForArchitectOutputSlot(
  slot: ArchitectOutputDocumentSlotModel,
): string | null {
  return slot.logicalDocumentId && slot.targetPath && slot.artifactRevision
    ? `${slot.slotId}:${slot.targetPath}:${slot.artifactRevision}`
    : null;
}

export function presentedRevisionsForArchitectOutputModel(
  model: ArchitectOutputWorkspaceModel,
): ArchitectOutputPresentedSlotRevision[] {
  return model.documentSlots
    .filter((slot) => slot.logicalDocumentId && slot.targetPath && slot.artifactRevision)
    .map((slot) => ({
      slotId: slot.slotId,
      targetPath: slot.targetPath,
      artifactRevision: slot.artifactRevision!,
    }));
}

export function markSingleDisplayedArchitectOutputRevisionViewed(
  model: ArchitectOutputWorkspaceModel | null,
  detail: PlanningDocumentDetail,
  viewedRevisionKeys: string[],
): string[] {
  if (!model || model.documentSlots.length !== 1) {
    return viewedRevisionKeys;
  }

  const [slot] = model.documentSlots;
  const revisionKey = revisionKeyForArchitectOutputSlot(slot);
  if (!revisionKey || !slot.logicalDocumentId || !slot.artifactRevision) {
    return viewedRevisionKeys;
  }

  if (
    detail.readError ||
    detail.documentReadState !== "readable" ||
    detail.logicalDocumentId !== slot.logicalDocumentId ||
    detail.markdownPath !== slot.targetPath ||
    detail.metadata.artifactRevision !== slot.artifactRevision
  ) {
    return viewedRevisionKeys;
  }

  return viewedRevisionKeys.includes(revisionKey)
    ? viewedRevisionKeys
    : [...viewedRevisionKeys, revisionKey];
}
