import type {
  ArchitectBrowserFoundationStatus,
  BrowserViewBounds,
} from "../workspaceContracts";

export interface ArchitectHostMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArchitectAttachmentCoordinatorRuntime {
  measureHost: () => ArchitectHostMeasurement | null;
  nextSequence: () => number;
  onError: (message: string) => void;
  onStatus: (status: ArchitectBrowserFoundationStatus) => void;
  setBounds: (bounds: BrowserViewBounds) => Promise<ArchitectBrowserFoundationStatus>;
  showBrowser: (attachmentGeneration: number) => Promise<ArchitectBrowserFoundationStatus>;
  hideBrowser: (attachmentGeneration: number) => Promise<ArchitectBrowserFoundationStatus>;
  waitForNextFrame: () => Promise<void>;
  maxLayoutFrames?: number;
}

export interface ArchitectAttachmentAttemptResult {
  generation: number;
  status: "attached-visible" | "failed" | "stale";
  message?: string;
}

export interface ArchitectAttachmentCoordinator {
  attach: () => Promise<ArchitectAttachmentAttemptResult>;
  retry: () => Promise<ArchitectAttachmentAttemptResult>;
  detach: () => Promise<ArchitectBrowserFoundationStatus>;
  invalidate: () => number;
  getGeneration: () => number;
}

const defaultMaxLayoutFrames = 8;
let globalAttachmentGeneration = 0;

export function hasPositiveArchitectHostMeasurement(
  measurement: ArchitectHostMeasurement | null,
): measurement is ArchitectHostMeasurement {
  return Boolean(measurement && measurement.width > 0 && measurement.height > 0);
}

export function architectAttachmentLayoutError(
  measurement: ArchitectHostMeasurement | null,
): string {
  if (!measurement) {
    return "Embedded browser host is not mounted yet.";
  }
  return `Embedded browser host has zero layout (${Math.round(measurement.width)} x ${Math.round(measurement.height)}).`;
}

export function shouldShowArchitectBrowserRetry(
  status: ArchitectBrowserFoundationStatus | null,
  attachmentError = "",
): boolean {
  const state = status?.attachment.state ?? "detached";
  return state === "attach-failed" || Boolean(attachmentError);
}

export function createArchitectAttachmentCoordinator(
  runtime: ArchitectAttachmentCoordinatorRuntime,
): ArchitectAttachmentCoordinator {
  let generation = globalAttachmentGeneration;
  const claimGeneration = (): number => {
    globalAttachmentGeneration += 1;
    generation = globalAttachmentGeneration;
    return generation;
  };
  const isCurrentGeneration = (candidate: number): boolean =>
    generation === candidate && globalAttachmentGeneration === candidate;

  const runAttempt = async (): Promise<ArchitectAttachmentAttemptResult> => {
    const attemptGeneration = claimGeneration();

    try {
      const measurement = await waitForPositiveMeasurement(runtime, () => isCurrentGeneration(attemptGeneration));
      if (!isCurrentGeneration(attemptGeneration)) {
        return { generation: attemptGeneration, status: "stale" };
      }

      const showStatus = await runtime.showBrowser(attemptGeneration);
      if (!isCurrentGeneration(attemptGeneration)) {
        return { generation: attemptGeneration, status: "stale" };
      }
      runtime.onStatus(showStatus);

      const boundsStatus = await runtime.setBounds({
        ...measurement,
        sequence: runtime.nextSequence(),
        attachmentGeneration: attemptGeneration,
      });
      if (!isCurrentGeneration(attemptGeneration)) {
        return { generation: attemptGeneration, status: "stale" };
      }
      runtime.onStatus(boundsStatus);

      if (boundsStatus.attachment.state !== "attached-visible") {
        const message = `Embedded browser attachment did not become visible (${boundsStatus.attachment.state}).`;
        runtime.onError(message);
        return { generation: attemptGeneration, status: "failed", message };
      }

      runtime.onError("");
      return { generation: attemptGeneration, status: "attached-visible" };
    } catch (error) {
      if (!isCurrentGeneration(attemptGeneration)) {
        return { generation: attemptGeneration, status: "stale" };
      }
      const message = error instanceof Error ? error.message : "Embedded browser attachment failed.";
      runtime.onError(message);
      return { generation: attemptGeneration, status: "failed", message };
    }
  };

  return {
    attach: runAttempt,
    retry: runAttempt,
    detach: async () => {
      const detachGeneration = claimGeneration();
      const boundsStatus = await runtime.setBounds({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        sequence: runtime.nextSequence(),
        attachmentGeneration: detachGeneration,
      });
      if (isCurrentGeneration(detachGeneration)) {
        runtime.onStatus(boundsStatus);
      }
      const detachStatus = await runtime.hideBrowser(detachGeneration);
      if (isCurrentGeneration(detachGeneration)) {
        runtime.onStatus(detachStatus);
      }
      return detachStatus;
    },
    invalidate: () => {
      generation = claimGeneration();
      return generation;
    },
    getGeneration: () => generation,
  };
}

export function resetArchitectAttachmentGenerationForTest(): void {
  globalAttachmentGeneration = 0;
}

async function waitForPositiveMeasurement(
  runtime: ArchitectAttachmentCoordinatorRuntime,
  isCurrentGeneration: () => boolean,
): Promise<ArchitectHostMeasurement> {
  const maxLayoutFrames = runtime.maxLayoutFrames ?? defaultMaxLayoutFrames;
  let lastMeasurement: ArchitectHostMeasurement | null = null;

  for (let attempt = 0; attempt <= maxLayoutFrames; attempt += 1) {
    if (!isCurrentGeneration()) {
      throw new Error("Embedded browser attachment was superseded.");
    }
    lastMeasurement = runtime.measureHost();
    if (hasPositiveArchitectHostMeasurement(lastMeasurement)) {
      return lastMeasurement;
    }
    if (attempt < maxLayoutFrames) {
      await runtime.waitForNextFrame();
    }
  }

  throw new Error(architectAttachmentLayoutError(lastMeasurement));
}
