import type { CodexManagedRuntimeStatus, CodexModelSelection } from "../../shared/codexRuntimeContracts";
import { selectionBlocker } from "../../shared/codexRuntimeContracts";
import type { CodexAppServerAdapter } from "./codexAppServerTransport";
import type { ManagedCodexConnectionsStatus } from "../../shared/codexConnectionContracts";
import type {
  CodexRuntimeInitializationResult,
  ManagedCodexRuntime,
} from "./codexRuntimeInitialization";

export interface CodexRuntimeExecutionOperations {
  getConnectionsStatus?(): ManagedCodexConnectionsStatus;
  refreshConnections?(runtime: ManagedCodexRuntime): Promise<ManagedCodexConnectionsStatus>;
  setConnectionEnabled?(name: unknown, enabled: unknown): Promise<void>;
  writeSelection(selection: CodexModelSelection): Promise<void>;
  launch(runtime: ManagedCodexRuntime): Promise<CodexAppServerAdapter>;
  shutdown?(): Promise<void>;
}

export interface CodexRuntimeInitializer {
  initialize(): Promise<CodexRuntimeInitializationResult>;
  shutdown(): Promise<void>;
}

export class CodexRuntimeManager {
  private operations: CodexRuntimeExecutionOperations | null = null;
  private initializer: CodexRuntimeInitializer | null = null;
  private initialization: Promise<void> | null = null;
  private runtime: ManagedCodexRuntime | null = null;
  private locked = false;
  private concurrentExactRuns = 0;
  private readonly maxConcurrentExactRuns = 4;
  private saving = false;
  private state: CodexManagedRuntimeStatus = {
    version: null, updateState: "initializing", catalog: [], selection: null,
    selectionBlocker: "Codex runtime initialization is pending.", message: "Initializing managed Codex runtime…", busy: false,
  };

  initialize(
    initializer: CodexRuntimeInitializer,
    operations: CodexRuntimeExecutionOperations,
  ): Promise<void> {
    if (!this.initialization) {
      this.initializer = initializer;
      this.operations = operations;
      this.initialization = initializer.initialize()
        .then((result) => this.adoptInitializationResult(result))
        .catch(() => this.adoptInitializationFailure());
    }
    return this.initialization;
  }

  getStatus(): CodexManagedRuntimeStatus {
    const connections = this.operations?.getConnectionsStatus?.();
    return structuredClone({ ...this.state, ...(connections ? { connections } : {}), busy: this.locked || this.concurrentExactRuns > 0 || this.saving });
  }

  async refreshConnections(): Promise<ManagedCodexConnectionsStatus> {
    if (!this.runtime || !this.operations?.refreshConnections) throw new Error("Managed Codex runtime is unavailable.");
    if (this.locked || this.concurrentExactRuns || this.saving) throw new Error("Codex connections cannot change during an active run.");
    this.saving = true;
    try { return await this.operations.refreshConnections(this.runtime); }
    finally { this.saving = false; }
  }

  async setConnectionEnabled(name: unknown, enabled: unknown): Promise<ManagedCodexConnectionsStatus> {
    if (this.locked || this.concurrentExactRuns || this.saving) throw new Error("Codex connections cannot change during an active run.");
    if (!this.runtime || !this.operations?.setConnectionEnabled || !this.operations.refreshConnections) throw new Error("Managed Codex connections are unavailable.");
    this.saving = true;
    try {
      await this.operations.setConnectionEnabled(name, enabled);
      return await this.operations.refreshConnections(this.runtime);
    } finally { this.saving = false; }
  }

  private adoptInitializationResult(result: CodexRuntimeInitializationResult): void {
    this.runtime = result.runtime ? { ...result.runtime } : null;
    this.state = structuredClone({ ...result.status, busy: false });
  }

  private adoptInitializationFailure(): void {
    this.runtime = null;
    this.state = {
      version: null,
      updateState: "unavailable",
      catalog: [],
      selection: null,
      selectionBlocker: "The managed Codex runtime is unavailable.",
      message: "Managed Codex runtime initialization failed in its utility worker. Restart to retry.",
      busy: false,
    };
  }

  async setSelection(value: unknown): Promise<CodexManagedRuntimeStatus> {
    if (this.locked || this.saving) throw new Error("Codex selection cannot change while a run or selection save is active.");
    if (!this.isReady()) throw new Error("Wait for Codex startup initialization to finish.");
    const blocker = selectionBlocker(this.state.catalog, value);
    if (blocker || !this.operations || !this.runtime) throw new Error(blocker ?? "Codex runtime is not ready.");
    const input = value as CodexModelSelection;
    const selection = { model: input.model, reasoningEffort: input.reasoningEffort };
    this.saving = true;
    try {
      await this.operations.writeSelection(selection);
      this.state.selection = selection;
      this.state.selectionBlocker = null;
    } finally { this.saving = false; }
    return this.getStatus();
  }

  acquire(value: unknown): { selection: CodexModelSelection; release: () => void } {
    if (this.locked || this.concurrentExactRuns > 0 || this.saving) throw new Error("A Codex run or selection save is already active.");
    if (!this.isReady()) throw new Error("Codex runtime is not ready. Wait for startup initialization.");
    const blocker = selectionBlocker(this.state.catalog, value);
    if (blocker) throw new Error(blocker);
    const input = value as CodexModelSelection;
    this.locked = true;
    let released = false;
    return { selection: { model: input.model, reasoningEffort: input.reasoningEffort }, release: () => {
      if (!released) { released = true; this.locked = false; }
    } };
  }

  /** Exact Workflow/WorkItem owners may run concurrently up to the shared process capacity. */
  acquireConcurrentExact(value: unknown): { selection: CodexModelSelection; release: () => void } {
    if (this.locked || this.saving || this.concurrentExactRuns >= this.maxConcurrentExactRuns) throw new Error("The shared Codex execution capacity is busy.");
    if (!this.isReady()) throw new Error("Codex runtime is not ready. Wait for startup initialization.");
    const blocker = selectionBlocker(this.state.catalog, value);
    if (blocker) throw new Error(blocker);
    const input = value as CodexModelSelection;
    this.concurrentExactRuns++;
    let released = false;
    return { selection: { model: input.model, reasoningEffort: input.reasoningEffort }, release: () => {
      if (!released) { released = true; this.concurrentExactRuns = Math.max(0, this.concurrentExactRuns - 1); }
    } };
  }

  private isReady(): boolean {
    return Boolean(this.runtime && ["current", "updated", "degraded"].includes(this.state.updateState));
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.initializer?.shutdown(),
      this.operations?.shutdown?.(),
    ]);
  }

  async launch(): Promise<CodexAppServerAdapter> {
    if (!this.isReady() || !this.runtime || !this.operations) throw new Error("Managed Codex runtime is unavailable.");
    return this.operations.launch(this.runtime);
  }
}

export const codexRuntimeManager = new CodexRuntimeManager();
