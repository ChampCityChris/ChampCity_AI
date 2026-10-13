import { AgentHarnessError } from "../../core/applicationErrors";
import type { LocalGitRepositoryAccessService } from "./localGitRepositoryAccessService";
import type { AgentHarnessWorkspaceAccessProvider, AgentHarnessWorkspaceContext, AgentHarnessLocalGitContext } from "./workspaceAccess";

export type RepositoryTarget = { localCheckoutHandle: string; repositoryContextHandle?: string; workspaceId?: never; repositoryCheckoutId?: never }
  | { workspaceId: string; repositoryCheckoutId: string; repositoryContextHandle?: never; localCheckoutHandle?: never };
export interface ResolvedRepositoryTarget {
  context: AgentHarnessWorkspaceContext;
  repositoryIdentity: string;
  local?: AgentHarnessLocalGitContext;
  repositoryContext?: unknown;
}

/** Checkout paths are internal only. Callbacks keep leases and local hardening alive. */
export class RepositoryTargetResolver {
  constructor(private readonly registered: AgentHarnessWorkspaceAccessProvider, private readonly local?: LocalGitRepositoryAccessService) {}

  async withTarget<T>(target: RepositoryTarget, operation: (resolved: ResolvedRepositoryTarget) => Promise<T>, session?: object, principal?: string): Promise<T> {
    if (target.localCheckoutHandle !== undefined) {
      if (target.workspaceId !== undefined || target.repositoryCheckoutId !== undefined) throw new AgentHarnessError("INVALID_INPUT", "Repository target forms are mutually exclusive.");
      if (!this.local) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Local Git access is unavailable in this host.");
      const dispatch = (local: AgentHarnessLocalGitContext, repositoryContext?: unknown) => operation({ local, repositoryContext, repositoryIdentity: local.repositoryHandle,
        context: { workspaceId: "", root: local.root, repositoryName: "local-repository", gitBacked: true,
          capabilities: { filesystemRead: true, artifactWrite: true, patchWorkflow: true, gitInspection: true } } });
      return this.local.inContext(session, target.repositoryContextHandle, principal, context => this.local!.withContext(context, target.localCheckoutHandle!, dispatch));
    }
    if (!target.workspaceId || !target.repositoryCheckoutId) throw new AgentHarnessError("REPOSITORY_CHECKOUT_REQUIRED", "An exact registered repository target is required.");
    const workspace = await this.registered.resolveWorkspaceContext(target.workspaceId);
    const checkout = await this.registered.resolveRepositoryCheckoutContext(target.workspaceId, target.repositoryCheckoutId);
    try {
      return await operation({ repositoryIdentity: checkout.checkout.repositoryId,
        context: { ...workspace, root: checkout.root, gitBacked: true, capabilities: { ...workspace.capabilities, gitInspection: true } } });
    } finally { checkout.release(); }
  }
}
