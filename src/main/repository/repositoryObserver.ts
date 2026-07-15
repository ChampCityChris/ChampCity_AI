import { watch, type FSWatcher } from "node:fs";
import path from "node:path";

import type { ConfiguredProject } from "../../shared/projects";
import type { ProjectWorkspaceRegistry } from "../projects";
import type { RepositoryRefreshService } from "./repositoryRefreshService";

export interface RepositoryObserverOptions {
  debounceMs?: number;
}
export class RepositoryObserver {
  private watchers: FSWatcher[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private stopped = true;
  private readonly debounceMs: number;

  constructor(
    private readonly project: ConfiguredProject,
    private readonly workspaces: ProjectWorkspaceRegistry,
    private readonly refreshService: RepositoryRefreshService,
    options: RepositoryObserverOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? 250;
  }

  async start(): Promise<void> {
    if (!this.stopped) return;
    this.stopped = false;
    await this.workspaces.updateObserverStatus(this.project.projectId, "starting");
    this.watchers.push(
      watch(this.project.planningRoot, { recursive: true }, (_event, filename) => {
        if (filename && isTemporaryPath(filename.toString())) return;
        this.schedule("planning-change");
      }),
    );
    const gitHead = path.join(this.project.repositoryRoot, ".git", "HEAD");
    try {
      this.watchers.push(watch(gitHead, () => this.schedule("branch-change")));
    } catch {
      // A supported repository may be exported without .git; refresh still works manually.
    }
    await this.refreshService.refresh("observer-start");
    await this.workspaces.updateObserverStatus(
      this.project.projectId,
      (await this.refreshService.getProjectionSnapshot()).scanResult.blockers.length > 0
        ? "blocked"
        : "watching",
    );
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
    await this.workspaces.updateObserverStatus(this.project.projectId, "stopped");
  }

  schedule(reason: string): void {
    if (this.stopped) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.refreshService.refresh(reason).catch(async () => {
        await this.workspaces.updateObserverStatus(this.project.projectId, "error");
      });
    }, this.debounceMs);
  }
}
function isTemporaryPath(value: string): boolean {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .some(
      (segment) =>
        segment.startsWith(".") ||
        segment.includes(".tmp-") ||
        segment.endsWith(".tmp") ||
        segment.endsWith(".bak") ||
        segment.endsWith("~"),
    );
}
