import type {
  CodexManagedRuntimeStatus,
  CodexModelCatalogEntry,
  CodexModelSelection,
} from "../../shared/codexRuntimeContracts";
import { selectionBlocker } from "../../shared/codexRuntimeContracts";

export interface ManagedCodexRuntime {
  version: string;
  executable: string;
  directory: string;
}

export interface CodexRuntimeMaintenanceOperations {
  loadCurrent(): Promise<ManagedCodexRuntime | null>;
  bootstrap(): Promise<ManagedCodexRuntime>;
  latestVersion(): Promise<string>;
  stage(version: string): Promise<ManagedCodexRuntime>;
  probe(runtime: ManagedCodexRuntime): Promise<CodexModelCatalogEntry[]>;
  promote(runtime: ManagedCodexRuntime): Promise<void>;
  readSelection(): Promise<CodexModelSelection | null>;
  shutdown?(): Promise<void>;
}

export interface CodexRuntimeInitializationResult {
  runtime: ManagedCodexRuntime | null;
  status: CodexManagedRuntimeStatus;
}

export async function initializeManagedCodexRuntime(
  operations: CodexRuntimeMaintenanceOperations,
): Promise<CodexRuntimeInitializationResult> {
  let runtime: ManagedCodexRuntime | null = null;
  let preferenceBroken = false;
  const status: CodexManagedRuntimeStatus = {
    version: null,
    updateState: "initializing",
    catalog: [],
    selection: null,
    selectionBlocker: "Codex runtime initialization is pending.",
    message: "Initializing managed Codex runtime…",
    busy: false,
  };

  try {
    status.selection = await operations.readSelection();
  } catch {
    preferenceBroken = true;
  }

  try {
    status.updateState = "checking";
    try {
      const prior = await operations.loadCurrent();
      if (prior) {
        status.catalog = await operations.probe(prior);
        runtime = prior;
        status.version = prior.version;
      }
    } catch {
      // An unreadable/unstartable prior runtime does not prevent staging a fresh stable candidate.
    }

    try {
      const latest = await operations.latestVersion();
      if (!/^\d+\.\d+\.\d+$/.test(latest)) {
        throw new Error("Stable runtime version is invalid.");
      }
      if (!runtime || newerVersion(latest, runtime.version)) {
        const candidate = await operations.stage(latest);
        const catalog = await operations.probe(candidate);
        await operations.promote(candidate);
        runtime = candidate;
        status.catalog = catalog;
        status.version = candidate.version;
        status.updateState = "updated";
      } else {
        status.updateState = "current";
      }
      status.message = "Managed Codex runtime is ready.";
    } catch {
      if (!runtime) {
        const bootstrap = await operations.bootstrap();
        const catalog = await operations.probe(bootstrap);
        await operations.promote(bootstrap);
        runtime = bootstrap;
        status.catalog = catalog;
        status.version = bootstrap.version;
      }
      status.updateState = "degraded";
      status.message = "Codex update failed. Using the last verified runtime; runtime currency is not confirmed.";
    }
  } catch {
    runtime = null;
    status.version = null;
    status.updateState = "unavailable";
    status.message = "Managed Codex runtime could not be initialized. Restart to retry the runtime check.";
    status.catalog = [];
  }

  if (!status.selection && !preferenceBroken) {
    const preferred = { model: "gpt-5.6-sol", reasoningEffort: "high" };
    if (!selectionBlocker(status.catalog, preferred)) {
      status.selection = preferred;
    }
  }
  status.selectionBlocker = preferenceBroken
    ? "Saved Codex selection could not be read. Choose a model and reasoning effort again."
    : selectionBlocker(status.catalog, status.selection);

  return {
    runtime: runtime ? { ...runtime } : null,
    status: structuredClone(status),
  };
}

function newerVersion(candidate: string, current: string): boolean {
  const candidateParts = candidate.split(".").map(Number);
  const currentParts = current.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (candidateParts[index] !== currentParts[index]) {
      return candidateParts[index] > currentParts[index];
    }
  }
  return false;
}
