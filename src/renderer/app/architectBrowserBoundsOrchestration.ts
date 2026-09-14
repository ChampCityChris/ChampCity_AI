import type { ArchitectBrowserBoundsAck } from "../../shared/workspaceContracts";

export interface ArchitectBrowserBoundsExpectation {
  attachmentGeneration: number;
  latestRequestedSequence: number;
}

export type ArchitectBrowserBoundsAckApplication =
  | { applied: false }
  | { applied: true; error: string };

export function reconcileArchitectBrowserBoundsAck(
  ack: ArchitectBrowserBoundsAck,
  expectation: ArchitectBrowserBoundsExpectation,
): ArchitectBrowserBoundsAckApplication {
  if (
    ack.attachmentGeneration !== expectation.attachmentGeneration ||
    ack.boundsSequence !== expectation.latestRequestedSequence ||
    ack.disposition === "stale-generation" ||
    ack.disposition === "stale-sequence"
  ) {
    return { applied: false };
  }
  if (ack.disposition === "failed") {
    return { applied: true, error: ack.lastError ?? "Architect browser bounds could not be applied." };
  }
  return { applied: true, error: "" };
}
