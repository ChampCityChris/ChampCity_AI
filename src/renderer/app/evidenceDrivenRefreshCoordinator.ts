import type {
  WorkspaceEvidenceChangeNotification,
  WorkspaceEvidenceDomain,
} from "../../shared/workspaceContracts";

export interface EvidenceDrivenRefreshTarget {
  ownerKey: string;
  domain: WorkspaceEvidenceDomain;
  waitForIdle?: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface EvidenceDrivenRefreshCoordinatorOptions {
  getForegroundTarget: () => EvidenceDrivenRefreshTarget | null;
  debounceMs?: number;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelSchedule?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface EvidenceDrivenRefreshCoordinator {
  setWorkspaceGeneration(generation: number | null): void;
  notify(notification: WorkspaceEvidenceChangeNotification): void;
  refreshBoundary(): void;
  dispose(): void;
}

interface OwnerRefreshState {
  inFlight: boolean;
  followUp: boolean;
}

export function createEvidenceDrivenRefreshCoordinator(
  options: EvidenceDrivenRefreshCoordinatorOptions,
): EvidenceDrivenRefreshCoordinator {
  const debounceMs = options.debounceMs ?? 60;
  const schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const cancelSchedule = options.cancelSchedule ?? ((handle) => clearTimeout(handle));
  const ownerStates = new Map<string, OwnerRefreshState>();
  const pendingDomains = new Set<WorkspaceEvidenceDomain>();
  let pendingBoundary = false;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let latestSequence = 0;
  let activeWorkspaceGeneration: number | null = null;
  let disposed = false;

  const execute = (
    target: EvidenceDrivenRefreshTarget,
    workspaceGeneration: number,
  ): void => {
    const stateKey = `${workspaceGeneration}:${target.ownerKey}`;
    const state = ownerStates.get(stateKey) ?? { inFlight: false, followUp: false };
    ownerStates.set(stateKey, state);
    if (state.inFlight) {
      state.followUp = true;
      return;
    }
    state.inFlight = true;
    void (async () => {
      await target.waitForIdle?.();
      if (
        disposed ||
        activeWorkspaceGeneration !== workspaceGeneration ||
        options.getForegroundTarget()?.ownerKey !== target.ownerKey
      ) {
        return;
      }
      await target.refresh();
    })().catch(() => undefined).finally(() => {
      state.inFlight = false;
      if (
        disposed ||
        activeWorkspaceGeneration !== workspaceGeneration ||
        !state.followUp
      ) {
        ownerStates.delete(stateKey);
        return;
      }
      state.followUp = false;
      const currentTarget = options.getForegroundTarget();
      if (currentTarget?.ownerKey === target.ownerKey) {
        execute(currentTarget, workspaceGeneration);
      } else {
        ownerStates.delete(stateKey);
      }
    });
  };

  const flush = (): void => {
    pendingTimer = null;
    if (disposed) {
      return;
    }
    const target = options.getForegroundTarget();
    const shouldRefresh = Boolean(
      target && (pendingBoundary || pendingDomains.has(target.domain)),
    );
    pendingBoundary = false;
    pendingDomains.clear();
    if (target && shouldRefresh && activeWorkspaceGeneration !== null) {
      execute(target, activeWorkspaceGeneration);
    }
  };

  const scheduleFlush = (): void => {
    if (pendingTimer === null) {
      pendingTimer = schedule(flush, debounceMs);
    }
  };

  return {
    setWorkspaceGeneration(generation) {
      if (generation === activeWorkspaceGeneration) {
        return;
      }
      activeWorkspaceGeneration = generation;
      latestSequence = 0;
      pendingBoundary = false;
      pendingDomains.clear();
      if (pendingTimer !== null) {
        cancelSchedule(pendingTimer);
        pendingTimer = null;
      }
      ownerStates.clear();
    },
    notify(notification) {
      if (disposed) {
        return;
      }
      if (
        activeWorkspaceGeneration === null ||
        notification.generation !== activeWorkspaceGeneration
      ) {
        return;
      }
      if (notification.sequence <= latestSequence) {
        return;
      }
      latestSequence = notification.sequence;
      notification.domains.forEach((domain) => pendingDomains.add(domain));
      scheduleFlush();
    },
    refreshBoundary() {
      if (disposed) {
        return;
      }
      pendingBoundary = true;
      scheduleFlush();
    },
    dispose() {
      disposed = true;
      pendingBoundary = false;
      pendingDomains.clear();
      if (pendingTimer !== null) {
        cancelSchedule(pendingTimer);
        pendingTimer = null;
      }
      ownerStates.clear();
    },
  };
}
