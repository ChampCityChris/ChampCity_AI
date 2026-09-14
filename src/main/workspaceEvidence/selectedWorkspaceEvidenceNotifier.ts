import fs from "node:fs";
import path from "node:path";
import type {
  WorkspaceEvidenceChangeNotification,
  WorkspaceEvidenceDomain,
} from "../../shared/workspaceContracts";

interface EvidenceWatcher {
  close(): void;
  on(event: "error", listener: (error: Error) => void): this;
}

type WatchFactory = (
  root: string,
  options: { recursive: boolean },
  listener: (eventType: string, filename: string | Buffer | null) => void,
) => EvidenceWatcher;

export interface SelectedWorkspaceEvidenceNotifierOptions {
  debounceMs?: number;
  watch?: WatchFactory;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancelSchedule?: (handle: ReturnType<typeof setTimeout>) => void;
}

const evidenceDomains = ["planning", "issues"] as const;

export class SelectedWorkspaceEvidenceNotifier {
  private readonly debounceMs: number;
  private readonly watch: WatchFactory;
  private readonly schedule: NonNullable<SelectedWorkspaceEvidenceNotifierOptions["schedule"]>;
  private readonly cancelSchedule: NonNullable<SelectedWorkspaceEvidenceNotifierOptions["cancelSchedule"]>;
  private readonly emit: (notification: WorkspaceEvidenceChangeNotification) => void;
  private rootWatcher: EvidenceWatcher | null = null;
  private domainWatchers = new Map<WorkspaceEvidenceDomain, EvidenceWatcher>();
  private pendingDomains = new Set<WorkspaceEvidenceDomain>();
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingTimerGeneration: number | null = null;
  private activeRoot: string | null = null;
  private generation = 0;
  private sequence = 0;

  constructor(
    emit: (notification: WorkspaceEvidenceChangeNotification) => void,
    options: SelectedWorkspaceEvidenceNotifierOptions = {},
  ) {
    this.emit = emit;
    this.debounceMs = options.debounceMs ?? 80;
    this.watch = options.watch ?? ((root, watchOptions, listener) =>
      fs.watch(root, watchOptions, listener) as EvidenceWatcher);
    this.schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.cancelSchedule = options.cancelSchedule ?? ((handle) => clearTimeout(handle));
  }

  selectWorkspace(workspaceRoot: string): number {
    this.stopWatchers();
    this.generation += 1;
    const selectedGeneration = this.generation;
    this.activeRoot = path.resolve(workspaceRoot);
    this.rootWatcher = this.tryWatch(
      this.activeRoot,
      false,
      (_eventType, filename) => this.handleWorkspaceRootChange(selectedGeneration, filename),
    );
    evidenceDomains.forEach((domain) => this.ensureDomainWatcher(domain, selectedGeneration));
    return selectedGeneration;
  }

  clear(): void {
    this.stopWatchers();
    this.generation += 1;
    this.activeRoot = null;
  }

  currentGeneration(): number {
    return this.generation;
  }

  notifyForTest(domain: WorkspaceEvidenceDomain, generation = this.generation): void {
    this.queueDomain(domain, generation);
  }

  private handleWorkspaceRootChange(
    generation: number,
    filename: string | Buffer | null,
  ): void {
    if (!this.isCurrent(generation) || filename === null) {
      return;
    }
    const firstSegment = filename.toString().replace(/\\/g, "/").split("/")[0]?.toLowerCase();
    if (firstSegment !== "planning" && firstSegment !== "issues") {
      return;
    }
    const domain = firstSegment as WorkspaceEvidenceDomain;
    this.ensureDomainWatcher(domain, generation);
    this.queueDomain(domain, generation);
  }

  private ensureDomainWatcher(domain: WorkspaceEvidenceDomain, generation: number): void {
    if (!this.isCurrent(generation) || this.domainWatchers.has(domain) || !this.activeRoot) {
      return;
    }
    const domainRoot = path.join(this.activeRoot, domain);
    if (!directoryExists(domainRoot)) {
      return;
    }
    const listener = (): void => this.queueDomain(domain, generation);
    const watcher = this.tryWatch(domainRoot, true, listener) ?? this.tryWatch(domainRoot, false, listener);
    if (watcher) {
      this.domainWatchers.set(domain, watcher);
    }
  }

  private tryWatch(
    root: string,
    recursive: boolean,
    listener: (eventType: string, filename: string | Buffer | null) => void,
  ): EvidenceWatcher | null {
    try {
      const watcher = this.watch(root, { recursive }, listener);
      watcher.on("error", () => {
        try {
          watcher.close();
        } catch {
          // A failed watcher is only a lost optimization hint.
        }
        if (watcher === this.rootWatcher) {
          this.rootWatcher = null;
        }
        evidenceDomains.forEach((domain) => {
          if (this.domainWatchers.get(domain) === watcher) {
            this.domainWatchers.delete(domain);
          }
        });
      });
      return watcher;
    } catch {
      return null;
    }
  }

  private queueDomain(domain: WorkspaceEvidenceDomain, generation: number): void {
    if (!this.isCurrent(generation)) {
      return;
    }
    this.pendingDomains.add(domain);
    if (this.pendingTimer !== null) {
      return;
    }
    this.pendingTimerGeneration = generation;
    this.pendingTimer = this.schedule(() => {
      if (this.pendingTimerGeneration !== generation) {
        return;
      }
      this.pendingTimer = null;
      this.pendingTimerGeneration = null;
      if (!this.isCurrent(generation) || this.pendingDomains.size === 0) {
        this.pendingDomains.clear();
        return;
      }
      const domains = evidenceDomains.filter((candidate) => this.pendingDomains.has(candidate));
      this.pendingDomains.clear();
      this.sequence += 1;
      this.emit({ domains, sequence: this.sequence, generation });
    }, this.debounceMs);
  }

  private isCurrent(generation: number): boolean {
    return this.activeRoot !== null && generation === this.generation;
  }

  private stopWatchers(): void {
    if (this.pendingTimer !== null) {
      this.cancelSchedule(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingTimerGeneration = null;
    this.pendingDomains.clear();
    const watchers = [this.rootWatcher, ...this.domainWatchers.values()];
    this.rootWatcher = null;
    this.domainWatchers.clear();
    watchers.forEach((watcher) => {
      if (!watcher) {
        return;
      }
      try {
        watcher.close();
      } catch {
        // Closing an already-failed watcher must not affect workspace selection.
      }
    });
  }
}

function directoryExists(candidate: string): boolean {
  try {
    return fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}
