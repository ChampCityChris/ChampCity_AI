import type {ArchitectAttachmentCoordinator} from "../../shared/architectInterview/architectBrowserAttachmentCoordinator";

let currentCoordinator: ArchitectAttachmentCoordinator | null = null;

export function registerArchitectBrowserRecovery(coordinator: ArchitectAttachmentCoordinator): () => void {
  currentCoordinator = coordinator;
  return () => {if (currentCoordinator === coordinator) currentCoordinator = null;};
}

/** Reload requires a visible, measured attachment before page recovery. */
export async function reloadArchitectBrowserWithRecovery() {
  const status = await window.champcity.getArchitectBrowserFoundationStatus();
  if (status.attachment.state !== "attached-visible") {
    const coordinator = currentCoordinator;
    if (!coordinator) throw new Error("Embedded browser host is not mounted yet.");
    const result = await coordinator.retry();
    if (result.status !== "attached-visible" || currentCoordinator !== coordinator || coordinator.getGeneration() !== result.generation) {
      throw new Error(result.message ?? "Embedded browser attachment recovery was superseded.");
    }
  }
  return window.champcity.reloadArchitectBrowser();
}
