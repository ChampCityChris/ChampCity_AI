import {PRIMARY_MCP_RESOURCE_SCOPE} from "../runtime/oauthStore";
import { MAX_RELEASE_ARTIFACT_SIZE } from "../../externalProviders/releaseAssetTransport";
import {createWorkflowCandidateIngressService} from "../../workflow/workflowCandidateIngressService";
import {WORKFLOW_CANDIDATE_STAGES, WORKFLOW_CANDIDATE_MAX_BYTES} from "../../../shared/workflowCandidateContracts";
import { skipIsolatedOperationStep, beginIsolatedOperation, inspectIsolatedOperation, continueIsolatedOperation, abortIsolatedOperation, advanceIsolatedOperation, type IsolatedOperationKind } from "../../repository/isolatedGitOperations";
import { discardManagedWorktree, createManagedWorktree, listManagedWorktrees, inspectManagedWorktree, removeManagedWorktree, type ManagedWorkspaceStore } from "../../repository/managedWorktrees";
import { AgentHarnessError, toBoundedError } from "../../core/applicationErrors";
import {
  createProjectSourceOperationCoordinator,
  type ProjectSourceOperationCoordinator,
  type ProjectSourceOperationLease,
} from "../../core/projectSourceOperationCoordinator";
import { writeAttachedImage } from "../../repository/attachedImages";
import { replaceControlledMarkdownBody } from "../../repository/controlledMarkdownDrafts";
import { readIssueScreenshotEvidence } from "../../repository/issueScreenshotEvidence";
import { copyRepositoryFile, moveRepositoryFile } from "../../repository/fileOperations";
import { createVisualAssetPreview } from "../../repository/visualAssetPreview";
import {
  compareVisualAssetImages,
  inspectVisualAssetImage,
  readVisualAssetImage,
} from "../../repository/visualAssetReview";
import {
  gitDiff,
  gitStatus,
  inspectRepositoryTextFile,
  listRepositoryFiles,
  preCommitSafetyScan,
  readRepositoryFile,
  readRepositoryMarkdownSection,
  readRepositoryTextChunk,
  readRepositoryTextLines,
  searchRepositoryFiles,
  writeTextArtifact,
} from "../../repository/repositoryOperations";
import {
  inspectGitReflog, replaceGitBranchRef, pushGitWithLease, deleteGitUntrackedPaths,
  inspectGitChangedFiles, inspectGitCommit, compareGitRefs, listGitTags, inspectGitRemotes, unstageGitChanges, restoreGitFiles,
  createGitBranchFromRef,
  advanceGitBranchRef,
  renameGitBranch,
  setGitBranchUpstream,
  unsetGitBranchUpstream,
  deleteGitRemoteBranch,
  amendGitCommit, revertGitCommit, cherryPickGitCommit,
  commitGitChanges,
  createGitTag,
  deleteGitBranch,
  deleteGitTag,
  deleteLocalGitTag,
  fastForwardGitBranch,
  fetchGitRemote,
  inspectGitBranchState,
  inspectGitHistory,
  integrateGitBranchToDev,
  mergeGitBranch,
  prepareGitBranch,
  pushGitBranch,
  pushGitTag,
  stageGitChanges,
  switchGitBranch,
  verifyGitTag,
} from "../../repository/gitMutations";
import {
  applyApprovedPatch,
  registerPatchProposal,
} from "../../repository/patches";
import { createReleaseToolbox, type ReleaseToolbox } from "../release/releaseToolbox";
import { executeTestToolbox, type TestToolboxAction } from "../test/testToolbox";
import { runRepositoryProcess, REPOSITORY_PROCESS_PROGRAMS, MAX_REPOSITORY_PROCESS_TIMEOUT } from "../development/repositoryProcess";
import { INTEGRATION_VALIDATION_LANES, INTEGRATION_VALIDATION_PROFILES } from "../../../shared/integrationPolicyContracts";
import {
  type AgentHarnessWorkspaceAccessProvider,
  type AgentHarnessWorkspaceContext,
  assertActionAccess,
  type HarnessActionKind,
} from "../workspace/workspaceAccess";
import * as z from "zod/v4";
import { LocalGitRepositoryAccessService, redactLocalGitResult } from "../workspace/localGitRepositoryAccessService";
import { RepositoryTargetResolver } from "../workspace/repositoryTargetResolver";
import { inspectGitRemote, inspectGitRemoteRefs, removeConfiguredGitRemote } from "../../repository/gitRemoteManagement";
import { pullGitBranch } from "../../repository/pullGitBranch";
import { mutateProviderOwnedRemote } from "../../repository/gitRemoteManagement";
import { RepositoryHostingFacade } from "../../externalProviders/repositoryHostingFacade";
import { readRepositoryHostingSettings } from "../../externalProviders/repositoryHostingSettings";
import { WindowsRepositoryHostingCredentialStore } from "../../externalProviders/repositoryHostingCredentials";
import { GithubHostingAdapter } from "../../externalProviders/githubHostingAdapter";
import { GithubProviderService } from "../../externalProviders/githubProviderService";
import { createGithubRuntimeOperations } from "../../externalProviders/githubRuntime";
import { withGitHttpAuthentication, withGitExecutionCancellation } from "../../core/gitExecution";
import * as extendedGit from "../../repository/gitExtendedOperations";
import { ENTITY_TYPE_REGISTRY } from "../../../shared/projectState/entityTypeRegistry";
import { inspectRegisteredProjectState } from "../../projectState/projectStateInspectionService";

export type PublicToolName =
  | "repo_toolbox"
  | "visual_asset_toolbox"
  | "git_toolbox"
  | "artifact_toolbox"
  | "diagnostics_toolbox"
  | "integration_toolbox"
  | "release_toolbox"
  | "browser_toolbox"
  | "knowledge_toolbox"
  | "workspace_toolbox"
  | "project_toolbox"
  | "intake_toolbox"
  | "planning_toolbox"
  | "workflow_toolbox"
  | "issue_toolbox"
  | "agent_toolbox"
  | "model_toolbox"
  | "skill_toolbox"
  | "memory_toolbox"
  | "validation_toolbox"
  | "test_toolbox"
  | "development_toolbox"
  | "system_toolbox"
  | "network_toolbox"
  | "data_toolbox"
  | "security_toolbox"
  | "observability_toolbox"
  | "ui_toolbox"
  | "deployment_toolbox"
  | "automation_toolbox"
  | "document_toolbox"
  | "media_asset_toolbox"
  | "model_asset_toolbox"
  | "archive_toolbox"
  | "workspace_write_attached_image";

const HOTFIX10_RESERVED_TOOLBOX_NAMES = [
  "workspace_toolbox",
  "project_toolbox",
  "intake_toolbox",
  "planning_toolbox",
  "issue_toolbox",
  "agent_toolbox",
  "model_toolbox",
  "skill_toolbox",
  "memory_toolbox",
  "validation_toolbox",
  "system_toolbox",
  "network_toolbox",
  "security_toolbox",
  "observability_toolbox",
  "ui_toolbox",
  "deployment_toolbox",
  "automation_toolbox",
  "document_toolbox",
  "media_asset_toolbox",
  "model_asset_toolbox",
  "archive_toolbox",
] as const satisfies readonly PublicToolName[];

type RequiredScope = "files.read" | "files.write";
type ParamType = "string" | "number" | "boolean" | "string-array";
type GitMutationAction =
  | "pull_branch"
  | "replace_branch_ref" | "push_with_lease" | "delete_untracked_paths" | "discard_managed_worktree" | "skip_isolated_operation_step"
  | "begin_isolated_operation" | "continue_isolated_operation" | "abort_isolated_operation" | "advance_isolated_operation"
  | "amend_commit" | "revert_commit" | "cherry_pick_commit"
  | "create_worktree_from_ref"
  | "create_worktree_for_branch"
  | "remove_worktree"
  | "unstage_changes"
  | "restore_files"
  | "create_branch_from_ref"
  | "advance_branch_ref"
  | "rename_branch"
  | "set_branch_upstream"
  | "unset_branch_upstream"
  | "delete_remote_branch"
  | "prepare_branch"
  | "switch_branch"
  | "fetch_remote"
  | "fast_forward_branch"
  | "merge_branch"
  | "create_tag"
  | "push_tag"
  | "delete_tag"
  | "delete_branch"
  | "stage_changes"
  | "commit"
  | "push"
  | "integrate_to_dev";

interface ParamSpec {
  type: ParamType;
  required?: boolean;
  allowedValues?: readonly string[];
  constant?: boolean;
  allowEmpty?: boolean;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  integer?: boolean;
  minimum?: number;
  maximum?: number;
}

interface ToolActionContract {
  name: string;
  kind: HarnessActionKind;
  requiredScope: RequiredScope;
  params: Record<string, ParamSpec>;
  paramForms?: Record<string, ParamSpec>[];
  localOnly?: boolean;
  globalOnly?: boolean;
  repositoryTarget?: boolean;
  dispatchGlobal?: (input: { params: Record<string, unknown>; signal?: AbortSignal; session?: object; principal?: string }) => unknown | Promise<unknown>;
  dispatch: (input: DispatchInput) => unknown | Promise<unknown>;
}

interface ToolProvider {
  name: PublicToolName;
  title: string;
  description: string;
  actions: ToolActionContract[];
}

interface DispatchInput {
  scope?: string;
  signal?: AbortSignal;
  managedWorkspaces?: ManagedWorkspaceStore;
  context: AgentHarnessWorkspaceContext;
  params: Record<string, unknown>;
  userDataRoot: string;
  workspaceSummaries: AgentHarnessWorkspaceAccessProvider["listWorkspaceSummaries"];
  repositoryCheckoutSummaries: AgentHarnessWorkspaceAccessProvider["listRepositoryCheckoutSummaries"];
  runtimeDiagnostics?: () => Record<string, unknown>;
}

export interface AgentHarnessToolDefinition {
  name: PublicToolName;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  inputZodSchema: z.ZodType<Record<string, unknown>>;
  readOnly: boolean;
  actions: string[];
}

export interface AgentHarnessToolCall {
  name: string;
  arguments: Record<string, unknown>;
  scope?: string;
  signal?: AbortSignal;
  session?: object;
  principal?: string;
}

export interface AgentHarnessToolResult {
  ok: boolean;
  toolName: string;
  action: string;
  workspaceId?: string;
  payload?: unknown;
  repositoryContext?: unknown;
  imageContent?: AgentHarnessToolImageContent[];
  error?: ReturnType<typeof toBoundedError>;
  attemptId: string;
  timestamp: string;
}

export interface AgentHarnessToolImageContent {
  data: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
}

export interface AgentHarnessToolRegistry {
  shutdownProviders?: () => Promise<void>;
  releaseSession?: (session: object) => void;
  listTools: (scope?: string) => AgentHarnessToolDefinition[];
  callTool: (call: AgentHarnessToolCall) => Promise<AgentHarnessToolResult>;
}

interface RegistryOptions {
  repositoryHosting?: RepositoryHostingFacade;
  localGitAccess?: LocalGitRepositoryAccessService;
  managedWorkspaces?: ManagedWorkspaceStore;
  workspaceAccess: AgentHarnessWorkspaceAccessProvider;
  userDataRoot: string;
  runtimeDiagnostics?: () => Record<string, unknown>;
  releaseToolbox?: ReleaseToolbox;
  sourceOperationCoordinator?: ProjectSourceOperationCoordinator;
}

const IMAGE_BEARING_DISPATCH_RESULT = Symbol("image-bearing-dispatch-result");

interface ImageBearingDispatchResult {
  [IMAGE_BEARING_DISPATCH_RESULT]: true;
  payload: unknown;
  imageContent: AgentHarnessToolImageContent[];
}

export function createAgentHarnessToolRegistry(options: RegistryOptions): AgentHarnessToolRegistry {
  const repositoryTargets = new RepositoryTargetResolver(options.workspaceAccess, options.localGitAccess);
  const releaseToolbox = options.releaseToolbox ?? createReleaseToolbox();
  const credentials = new WindowsRepositoryHostingCredentialStore();
  const repositoryHosting = options.repositoryHosting ?? new RepositoryHostingFacade({
    configurations: () => readRepositoryHostingSettings(options.userDataRoot).providers,
    resolveCredential: reference => credentials.get(reference),
    github: new GithubHostingAdapter(new GithubProviderService({ runtime: createGithubRuntimeOperations(options.userDataRoot) })),
  });
  const sourceOperationCoordinator = options.sourceOperationCoordinator ??
    createProjectSourceOperationCoordinator({ userDataRoot: options.userDataRoot });
  const providers = createToolProviders(releaseToolbox, repositoryHosting, options.localGitAccess, repositoryTargets);
  const providerByName = new Map(providers.map((provider) => [provider.name, provider]));
  return {
    shutdownProviders: () => repositoryHosting.shutdown(),
    releaseSession: session => options.localGitAccess?.releaseSession(session),
    listTools: (scope = PRIMARY_MCP_RESOURCE_SCOPE) => providers
      .map((provider) => buildToolDefinition(provider, scope))
      .filter((definition): definition is AgentHarnessToolDefinition => Boolean(definition)),
    callTool: (call) => withGitExecutionCancellation(async () => {
      const attemptId = `ahr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();
      let action = "unknown";
      let localMode = false;
      try {
        const args = recordArgumentValue(call.arguments);
        rejectUnknownKeys(args, ["workspaceId", "action", "params"], "tool arguments");
        const provider = providerByName.get(call.name as PublicToolName);
        if (!provider) {
          throw new AgentHarnessError("INVALID_INPUT", "Unknown Agent Harness tool.");
        }
        action = requiredString(args.action, "action");
        const contract = provider.actions.find((entry) => entry.name === action);
        if (!contract) {
          throw new AgentHarnessError("INVALID_INPUT", "Unsupported or missing toolbox action.", {
            toolName: call.name,
            action,
          });
        }
        if (!scopeIncludes(call.scope, contract.requiredScope)) {
          throw new AgentHarnessError("OAUTH_SCOPE_DENIED", `${contract.requiredScope} scope is required for this action.`, {
            requiredScope: contract.requiredScope,
            toolName: provider.name,
            action,
          });
        }
        if (contract.kind === "test-execution" && (typeof args.workspaceId !== "string" || !args.workspaceId.trim() || args.workspaceId.length > 160)) {
          throw new AgentHarnessError("INVALID_INPUT", "workspaceId must be a bounded workspace identity.");
        }
        const supplied = args.params && typeof args.params === "object" && !Array.isArray(args.params) ? args.params as Record<string, unknown> : {};
        if (contract.globalOnly) {
          if (args.workspaceId !== undefined || !contract.dispatchGlobal) throw new AgentHarnessError("INVALID_INPUT", "This provider action is independent of workspace registration.");
          const params = validateParams(args.params, contract);
          const dispatch = () => Promise.resolve(contract.dispatchGlobal!({ params, signal: call.signal, session: call.session, principal: call.principal }));
          const payload = provider.name === "development_toolbox" ? await dispatch() : await withGitHttpAuthentication(dispatch, (cwd, argv) => repositoryHosting.gitHttpAuthentication(cwd, argv));
          return { ok: true, toolName: provider.name, action, payload: redactLocalGitResult(payload), attemptId, timestamp };
        }
        localMode = (provider.name === "git_toolbox" || contract.repositoryTarget === true) && (contract.localOnly === true || supplied.localCheckoutHandle !== undefined);
        if (localMode) {
          if (args.workspaceId !== undefined || supplied.repositoryCheckoutId !== undefined) throw new AgentHarnessError("INVALID_INPUT", "Local Git targets and registered workspace targets are mutually exclusive.");
          const service = options.localGitAccess;
          if (!service) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Local Git access is unavailable in this host.");
          const params = validateParams(args.params, localVariant(contract));
          let payload: unknown;
          let repositoryContext: unknown;
          if (action === "inspect_local_git_access") payload = service.accessConfiguration();
          else if (action === "configure_local_git_access") payload = await service.configureAccess({ operation: requiredString(params.operation, "operation") as "add" | "remove", directories: requiredStringArray(params.directories, "directories"), expectedConfigurationId: requiredString(params.expectedConfigurationId, "expectedConfigurationId") });
          else if (action === "discover_local_repositories") {
            const input = { directory: requiredString(params.directory, "directory"), maxDepth: numberValue(params.maxDepth), maxRepositories: numberValue(params.maxRepositories) };
            payload = call.session ? await service.inSession(call.session, session => service.discover(input, session)) : await service.discover(input);
          }
          else if (action === "init_local_repository") payload = await service.init({ directory: requiredString(params.directory, "directory"), initialBranch: requiredString(params.initialBranch, "initialBranch") });
          else if (action === "select_repository_context") payload = await service.inSession(call.session ?? {}, session => service.selectContext(session, { repositoryHandle: requiredString(params.repositoryHandle, "repositoryHandle"), localCheckoutHandle: stringValue(params.localCheckoutHandle), branchName: stringValue(params.branchName) }, call.principal));
          else if (action === "inspect_repository_context") payload = await service.inContext(call.session, stringValue(params.repositoryContextHandle), call.principal, session => service.withContext(session, service.selectedHandle(session), async checkout => ({ ...(await service.verifyContext(session, checkout)), availableWorktrees: await service.listWorktrees(checkout) })));
          else payload = await withGitHttpAuthentication(() => repositoryTargets.withTarget({ localCheckoutHandle: requiredString(params.localCheckoutHandle, "localCheckoutHandle"), repositoryContextHandle: stringValue(params.repositoryContextHandle) }, async ({ local: checkout, context, repositoryContext: receipt }) => {
            repositoryContext = receipt;
            if (!checkout) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Local checkout resolution failed.");
            if (isManagedOnlyGitAction(action)) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "This action requires an application-managed checkout; use the typed local worktree lifecycle actions for local targets.");
            if (action === "create_local_worktree") return service.createWorktree(checkout, { destinationDirectory: requiredString(params.destinationDirectory, "destinationDirectory"), branchName: requiredString(params.branchName, "branchName"), sourceRef: stringValue(params.sourceRef) });
            if (action === "clone_local_repository") return service.cloneSelected(checkout, { destinationDirectory: requiredString(params.destinationDirectory, "destinationDirectory"), branch: requiredString(params.branch, "branch"), expectedSourceCommit: requiredString(params.expectedSourceCommit, "expectedSourceCommit") });
            if (action === "bind_local_repository_remote") return service.bindLocalRemote(checkout, { sourceCheckoutHandle: requiredString(params.sourceCheckoutHandle, "sourceCheckoutHandle"), remoteName: requiredString(params.remoteName, "remoteName"), expectedBinding: stringValue(params.expectedBinding) });
            if (action === "set_local_worktree_lock") return service.setWorktreeLock(checkout, { locked: params.locked as boolean, expectedLocked: params.expectedLocked as boolean, expectedHead: requiredString(params.expectedHead, "expectedHead"), expectedBranch: requiredString(params.expectedBranch, "expectedBranch"), reason: stringValue(params.reason) });
            if (action === "remove_local_worktree") return service.removeWorktree(checkout, requiredString(params.expectedBranch, "expectedBranch"));
            if (action === "list_worktrees") return service.listWorktrees(checkout);
            if (action === "delete_tag" && params.remote === undefined) return deleteLocalGitTag(checkout.root, requiredString(params.tagName, "tagName"));
            if (action === "inspect_worktree") return (await service.listWorktrees(checkout)).find(item => item.localCheckoutHandle === checkout.localCheckoutHandle);
            const result = await contract.dispatch({ scope: call.scope, context, params, signal: call.signal, userDataRoot: options.userDataRoot,
              managedWorkspaces: service.isolatedStore(checkout),
              workspaceSummaries: options.workspaceAccess.listWorkspaceSummaries, repositoryCheckoutSummaries: options.workspaceAccess.listRepositoryCheckoutSummaries });
            if (action === "status") return { ...(result as object), ...(await service.listWorktrees(checkout)).find(item => item.localCheckoutHandle === checkout.localCheckoutHandle) };
            if (/isolated_operation/.test(action) || action === "pull_branch") {
              const record = result as { workspaceId?: string };
              if (record.workspaceId) {
                const candidate = await service.isolatedCheckoutSummary(checkout, record.workspaceId);
                return { ...(result as object), candidateLocalCheckoutHandle: candidate.localCheckoutHandle };
              }
            }
            return result;
          }, call.session, call.principal), (cwd, argv) => repositoryHosting.gitHttpAuthentication(cwd, argv));
          return { ok: true, toolName: provider.name, action, payload: redactLocalGitResult(payload), ...(repositoryContext ? { repositoryContext: redactLocalGitResult(repositoryContext) } : {}), attemptId, timestamp };
        }
        let context = await options.workspaceAccess.resolveWorkspaceContext(args.workspaceId);
        const projectRoot = context.root;
        let sourceOperationLease: ProjectSourceOperationLease | undefined;
        const checkoutBound = isCheckoutBoundAction(contract.kind);
        const suppliedParams = args.params && typeof args.params === "object" && !Array.isArray(args.params)
          ? args.params as Record<string, unknown> : {};
        if (checkoutBound && (typeof suppliedParams.repositoryCheckoutId !== "string" || !suppliedParams.repositoryCheckoutId.trim())) {
          throw new AgentHarnessError("REPOSITORY_CHECKOUT_REQUIRED", "This operation requires an exact registered repositoryCheckoutId.");
        }
        const params = validateParams(args.params, contract);
        try {
          sourceOperationLease = await sourceOperationCoordinator.acquireShared(projectRoot, `${provider.name}:${action}`);
          const dispatch = async (context: AgentHarnessWorkspaceContext) => {
          assertActionAccess(context, contract.kind);
          const dispatchResult = await contract.dispatch({
            scope: call.scope,
            context,
            params,
            signal: call.signal,
            managedWorkspaces: options.managedWorkspaces,
            userDataRoot: options.userDataRoot,
            workspaceSummaries: options.workspaceAccess.listWorkspaceSummaries,
            repositoryCheckoutSummaries: options.workspaceAccess.listRepositoryCheckoutSummaries,
            runtimeDiagnostics: options.runtimeDiagnostics,
          });
          if (isImageBearingDispatchResult(dispatchResult)) {
            return {
              ok: true, toolName: provider.name, action, workspaceId: context.workspaceId,
              payload: dispatchResult.payload, imageContent: dispatchResult.imageContent, attemptId, timestamp,
            };
          }
          return { ok: true, toolName: provider.name, action, workspaceId: context.workspaceId,
            payload: dispatchResult, attemptId, timestamp };
          };
          return checkoutBound ? await withGitHttpAuthentication(() => repositoryTargets.withTarget({ workspaceId: requiredString(args.workspaceId, "workspaceId"), repositoryCheckoutId: requiredString(params.repositoryCheckoutId, "repositoryCheckoutId") }, resolved => dispatch(resolved.context)), (cwd, argv) => repositoryHosting.gitHttpAuthentication(cwd, argv)) : await dispatch(context);
        } finally {
          await sourceOperationLease?.release();
        }
      } catch (error) {
        return {
          ok: false,
          toolName: call.name,
          action,
          error: localMode || call.name === "integration_toolbox" || call.name === "development_toolbox" ? redactLocalGitResult(toBoundedError(error)) as ReturnType<typeof toBoundedError> : call.name === "data_toolbox"
            ? { code: error instanceof AgentHarnessError ? error.code : "RUNTIME_ERROR",
                message: "Project State inspection request was rejected; verify workspace registration, read scope and bounded parameters." }
            : call.name === "test_toolbox" && !(error instanceof AgentHarnessError)
            ? { code: "RUNTIME_ERROR", message: "Bound validation execution is unavailable; inspect the repository toolkit and runtime." }
            : call.name === "git_toolbox" && /worktree|isolated_operation|reflog|delete_untracked_paths/.test(action) && !(error instanceof AgentHarnessError)
            ? { code: "GIT_EXECUTION_FAILED", message: "Managed Git operation is unavailable or its filesystem state changed; inspect before retrying." }
            : toBoundedError(error),
          attemptId,
          timestamp,
        };
      }
    // Other toolboxes own cancellation/cleanup results (notably repository processes).
    }, providerNamesWithGitCancellation.has(call.name) ? call.signal : undefined),
  };
}

const providerNamesWithGitCancellation = new Set(["git_toolbox", "integration_toolbox"]);

function createToolProviders(releaseToolbox: ReleaseToolbox, repositoryHosting: RepositoryHostingFacade, localGitAccess: LocalGitRepositoryAccessService | undefined, repositoryTargets: RepositoryTargetResolver): ToolProvider[] {
  return [
    {
      name: "development_toolbox", title: "development_toolbox",
      description: "Execute an explicit trusted repository process independently of Project registration. Approved toolchains, fixed verified checkout, bounded output and timeout; no shell or caller environment.",
      actions: [
        readAction("status", {}, () => ({ toolbox: "development_toolbox", state: "implemented", implemented: true, programs: REPOSITORY_PROCESS_PROGRAMS })),
        {
          name: "run_repository_process", kind: "artifact-write", requiredScope: "files.write", globalOnly: true,
          params: {
            repositoryContextHandle: { ...portableContextParam, required: true },
            localCheckoutHandle: { type: "string", required: true, minLength: 1, maxLength: 128 },
            program: { type: "string", required: true, allowedValues: REPOSITORY_PROCESS_PROGRAMS },
            arguments: { type: "string-array", required: true, minItems: 0, maxItems: 128, minLength: 1, maxLength: 4096 },
            expectedHead: { type: "string", minLength: 40, maxLength: 64 },
            timeoutMs: { type: "number", integer: true, minimum: 100, maximum: MAX_REPOSITORY_PROCESS_TIMEOUT },
          },
          dispatch: () => { throw new AgentHarnessError("INVALID_INPUT", "Repository process requires a portable local target."); },
          dispatchGlobal: async ({ params, signal, session, principal }) => {
            if (!localGitAccess) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Local repository access is unavailable in this host.");
            return repositoryTargets.withTarget({
              repositoryContextHandle: requiredString(params.repositoryContextHandle, "repositoryContextHandle"),
              localCheckoutHandle: requiredString(params.localCheckoutHandle, "localCheckoutHandle"),
            }, async ({ context }) => runRepositoryProcess(context.root, {
              program: requiredString(params.program, "program"), arguments: params.arguments as string[],
              expectedHead: stringValue(params.expectedHead), timeoutMs: numberValue(params.timeoutMs),
            }, signal), session, principal);
          },
        },
      ],
    },
    {
      name: "repo_toolbox",
      title: "repo_toolbox",
      description: "ChampCity A/I Agent Harness repo_toolbox.",
      actions: [
        readAction("status", {}, async ({ context }) => ({
          workspace: context,
          repository: await gitStatus(context.root, context.gitBacked),
        })),
        readAction("list_files", optionalParams({ directory: "string", maxFiles: "number" }), async ({ context, params }) => (
          normalizeRepositoryListOutput(await listRepositoryFiles(context.root, {
            directory: stringValue(params.directory),
            maxFiles: numberValue(params.maxFiles),
            gitBacked: context.gitBacked,
          }))
        )),
        readAction("read_file", requiredParams({ relativePath: "string" }), ({ context, params }) => (
          readRepositoryFile(context.root, context.workspaceId, requiredString(params.relativePath, "relativePath"))
        )),
        readAction("read_issue_screenshot", requiredParams({ relativePath: "string" }), ({ context, params }) => {
          const result = readIssueScreenshotEvidence(
            context.root,
            requiredString(params.relativePath, "relativePath"),
          );
          const { imageBase64, ...metadata } = result;
          return imageBearingResult(metadata, [{ data: imageBase64, mimeType: metadata.mimeType }]);
        }),
        readAction("inspect_text_file", requiredParams({ relativePath: "string" }), ({ context, params }) => (
          inspectRepositoryTextFile(context.root, context.workspaceId, requiredString(params.relativePath, "relativePath"))
        )),
        readAction(
          "read_text_chunk",
          {
            ...optionalParams({
              relativePath: "string",
              cursor: "string",
              maximumBytes: "number",
              maximumLines: "number",
              expectedSourceSha256: "string",
            }),
          },
          ({ context, params }) => readRepositoryTextChunk(context.root, context.workspaceId, params),
        ),
        readAction(
          "read_text_lines",
          {
            ...requiredParams({ relativePath: "string", startLine: "number", maximumLines: "number" }),
            ...optionalParams({ maximumBytes: "number" }),
          },
          ({ context, params }) => readRepositoryTextLines(context.root, context.workspaceId, params),
        ),
        readAction(
          "read_markdown_section",
          {
            ...requiredParams({ relativePath: "string", sectionId: "string" }),
            ...optionalParams({ maximumBytes: "number", maximumLines: "number" }),
          },
          ({ context, params }) => readRepositoryMarkdownSection(context.root, context.workspaceId, params),
        ),
        readAction(
          "search_files",
          { ...requiredParams({ query: "string" }), ...optionalParams({ directory: "string", maxResults: "number" }) },
          ({ context, params }) => searchRepositoryFiles(context.root, requiredString(params.query, "query"), {
            directory: stringValue(params.directory),
            maxResults: numberValue(params.maxResults),
            gitBacked: context.gitBacked,
          }),
        ),
        writeAction("copy_file", "artifact-write", requiredParams({
          sourceRelativePath: "string",
          destinationRelativePath: "string",
        }), ({ context, params }) => copyRepositoryFile(
          context.root,
          requiredString(params.sourceRelativePath, "sourceRelativePath"),
          requiredString(params.destinationRelativePath, "destinationRelativePath"),
        )),
        writeAction("move_file", "artifact-write", requiredParams({
          sourceRelativePath: "string",
          destinationRelativePath: "string",
        }), ({ context, params }) => moveRepositoryFile(
          context.root,
          requiredString(params.sourceRelativePath, "sourceRelativePath"),
          requiredString(params.destinationRelativePath, "destinationRelativePath"),
        )),
        writeAction("write_markdown_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".md" },
        )),
        writeAction("write_json_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".json" },
        )),
        writeAction("propose_patch", "patch-write", requiredParams({ patch: "string" }), ({ context, params, userDataRoot }) => (
          registerPatchProposal(userDataRoot, context.root, requiredString(params.patch, "patch"))
        )),
        writeAction("apply_approved_patch", "patch-write", requiredParams({
          patch: "string",
          proposalId: "string",
          patchHash: "string",
        }), ({ context, params, userDataRoot }) => applyApprovedPatch(
          userDataRoot,
          context.root,
          requiredString(params.patch, "patch"),
          requiredString(params.proposalId, "proposalId"),
          requiredString(params.patchHash, "patchHash"),
        )),
      ],
    },
    {
      name: "visual_asset_toolbox",
      title: "visual_asset_toolbox",
      description: "ChampCity A/I bounded read-only repository visual asset review toolbox.",
      actions: [
        readAction("read_image", requiredParams({ relativePath: "string" }), ({ context, params }) => {
          const result = readVisualAssetImage(
            context.root,
            requiredString(params.relativePath, "relativePath"),
          );
          return imageBearingResult(result.metadata, [{
            data: result.imageBase64,
            mimeType: result.metadata.mimeType,
          }]);
        }),
        readAction("inspect_image", requiredParams({ relativePath: "string" }), ({ context, params }) => (
          inspectVisualAssetImage(context.root, requiredString(params.relativePath, "relativePath"))
        )),
        readAction(
          "compare_images",
          {
            relativePaths: {
              type: "string-array",
              required: true,
              minItems: 2,
              maxItems: 6,
            },
          },
          ({ context, params }) => {
            const result = compareVisualAssetImages(
              context.root,
              requiredStringArray(params.relativePaths, "relativePaths", 2, 6),
            );
            return imageBearingResult({ images: result.images }, result.imageContents);
          },
        ),
        readAction("create_image_preview", {
          ...requiredParams({ relativePath: "string" }),
          ...optionalParams({ cropX: "number", cropY: "number", cropWidth: "number", cropHeight: "number" }),
        }, async ({ context, params }) => {
          const result = await createVisualAssetPreview(
            context.root,
            requiredString(params.relativePath, "relativePath"),
            {
              cropX: numberValue(params.cropX), cropY: numberValue(params.cropY),
              cropWidth: numberValue(params.cropWidth), cropHeight: numberValue(params.cropHeight),
            },
          );
          return imageBearingResult(result.metadata, [{
            data: result.imageBase64, mimeType: result.metadata.preview.mimeType,
          }]);
        }),
      ],
    },
    {
      name: "git_toolbox",
      title: "git_toolbox",
      description: "ChampCity A/I Agent Harness git_toolbox.",
      actions: [
        localGitAction("inspect_local_git_access", "files.read", {}),
        localGitAction("select_repository_context", "files.read", {
          repositoryHandle: { type: "string", required: true, minLength: 1, maxLength: 128 },
          localCheckoutHandle: { type: "string", minLength: 1, maxLength: 128 },
          branchName: { type: "string", minLength: 1, maxLength: 240 },
        }),
        localGitAction("inspect_repository_context", "files.read", {}),
        localGitAction("configure_local_git_access", "files.write", { operation: { type: "string", required: true, allowedValues: ["add", "remove"] }, directories: { type: "string-array", required: true, minItems: 1, maxItems: 32, minLength: 1, maxLength: 4096 }, expectedConfigurationId: { type: "string", required: true, minLength: 64, maxLength: 64 } }),
        localGitAction("discover_local_repositories", "files.read", { ...requiredParams({ directory: "string" }), maxDepth: { type: "number", integer: true, minimum: 0, maximum: 6 }, maxRepositories: { type: "number", integer: true, minimum: 1, maximum: 50 } }),
        localGitAction("init_local_repository", "files.write", requiredParams({ directory: "string", initialBranch: "string" })),
        localGitAction("create_local_worktree", "files.write", { ...requiredParams({ localCheckoutHandle: "string", destinationDirectory: "string", branchName: "string" }), ...optionalParams({ sourceRef: "string" }) }),
        localGitAction("remove_local_worktree", "files.write", requiredParams({ localCheckoutHandle: "string", expectedBranch: "string" })),
        localGitAction("clone_local_repository", "files.write", requiredParams({ localCheckoutHandle: "string", destinationDirectory: "string", branch: "string", expectedSourceCommit: "string" })),
        localGitAction("bind_local_repository_remote", "files.write", { ...requiredParams({ localCheckoutHandle: "string", sourceCheckoutHandle: "string", remoteName: "string" }), expectedBinding: { type: "string", minLength: 64, maxLength: 64 } }),
        localGitAction("set_local_worktree_lock", "files.write", { ...requiredParams({ localCheckoutHandle: "string", locked: "boolean", expectedLocked: "boolean", expectedHead: "string", expectedBranch: "string" }), reason: { type: "string", minLength: 1, maxLength: 2000 } }),
        readAction("list_repository_checkouts", {}, ({ context, repositoryCheckoutSummaries }) => repositoryCheckoutSummaries(context.workspaceId)),
        gitInspectionAction("status", {}, ({ context }) => gitStatus(context.root, context.gitBacked)),
        gitInspectionAction("diff", {
          view: { type: "string", allowedValues: ["unstaged", "staged", "between_refs"] },
          ...optionalParams({ baseRef: "string", targetRef: "string", paths: "string-array" }),
        }, ({ context, params }) => gitDiff(context.root, context.gitBacked, {
          view: stringValue(params.view) as "unstaged" | "staged" | "between_refs" | undefined,
          baseRef: stringValue(params.baseRef), targetRef: stringValue(params.targetRef),
          paths: params.paths === undefined ? undefined : requiredStringArray(params.paths, "paths"),
        })),
        gitInspectionAction("changed_files", {}, ({ context }) => inspectGitChangedFiles(context.root)),
        gitInspectionAction("inspect_commit", { ...requiredParams({ ref: "string" }), ...optionalParams({ includePatch: "boolean" }) }, ({ context, params }) => inspectGitCommit(context.root, { ref: requiredString(params.ref, "ref"), includePatch: booleanValue(params.includePatch) })),
        gitInspectionAction("compare_refs", requiredParams({ leftRef: "string", rightRef: "string" }), ({ context, params }) => compareGitRefs(context.root, { leftRef: requiredString(params.leftRef, "leftRef"), rightRef: requiredString(params.rightRef, "rightRef") })),
        gitInspectionAction("inspect_reflog", optionalParams({ ref: "string", maxCount: "number" }), ({ context, params }) => inspectGitReflog(context.root, { ref: stringValue(params.ref), maxCount: numberValue(params.maxCount) })),
        gitInspectionAction("inspect_isolated_operation", requiredParams({ operationId: "string" }), ({ context, params, managedWorkspaces }) => inspectIsolatedOperation(context.root, requiredString(params.operationId, "operationId"), requiredManagedStore(managedWorkspaces))),
        gitInspectionAction("list_worktrees", {}, ({ context, managedWorkspaces }) => listManagedWorktrees(context.root, requiredManagedStore(managedWorkspaces))),
        gitInspectionAction("inspect_worktree", requiredParams({ workspaceId: "string" }), ({ context, params, managedWorkspaces }) => inspectManagedWorktree(context.root, requiredString(params.workspaceId, "workspaceId"), requiredManagedStore(managedWorkspaces))),
        gitInspectionAction("list_tags", {}, ({ context }) => listGitTags(context.root)),
        gitInspectionAction("inspect_remotes", {}, ({ context }) => inspectGitRemotes(context.root)),
        gitInspectionAction("inspect_remote", requiredParams({ remote: "string" }), ({ context, params }) => inspectGitRemote(context.root, requiredString(params.remote, "remote"))),
        gitInspectionAction("inspect_remote_refs", { ...requiredParams({ remote: "string" }), refClass: { type: "string", allowedValues: ["branches", "tags", "all"] }, ...optionalParams({ pattern: "string" }) }, ({ context, params }) => inspectGitRemoteRefs(context.root, { remote: requiredString(params.remote, "remote"), refClass: stringValue(params.refClass) as "branches" | "tags" | "all" | undefined, pattern: stringValue(params.pattern) })),
        gitInspectionAction("pre_commit_scan", {}, ({ context }) => preCommitSafetyScan(context.root, context.gitBacked)),
        gitInspectionAction("readiness_summary", {}, ({ context }) => preCommitSafetyScan(context.root, context.gitBacked)),
        gitInspectionAction("inspect_branch_state", optionalParams({ branchName: "string" }), ({ context, params }) => (
          inspectGitBranchState(context.root, stringValue(params.branchName))
        )),
        gitInspectionAction("inspect_history", optionalParams({
          ref: "string",
          maxCount: "number",
          ancestor: "string",
          descendant: "string",
        }), ({ context, params }) => inspectGitHistory(context.root, {
          ref: stringValue(params.ref),
          maxCount: numberValue(params.maxCount),
          ancestor: stringValue(params.ancestor),
          descendant: stringValue(params.descendant),
        })),
        gitInspectionAction("verify_tag", requiredParams({ tagName: "string" }), ({ context, params }) => (
          verifyGitTag(context.root, requiredString(params.tagName, "tagName"))
        )),
        gitMutationAction("create_branch_from_ref", requiredParams({ branchName: "string", sourceRef: "string" })),
        gitMutationAction("advance_branch_ref", requiredParams({ branchName: "string", sourceRef: "string", expectedCurrentCommit: "string" })),
        gitMutationAction("rename_branch", requiredParams({ branchName: "string", newBranchName: "string" })),
        gitMutationAction("set_branch_upstream", requiredParams({ branchName: "string", remote: "string", remoteBranch: "string" })),
        gitMutationAction("unset_branch_upstream", requiredParams({ branchName: "string" })),
        gitMutationAction("delete_remote_branch", requiredParams({ remote: "string", remoteBranch: "string", expectedRemoteCommit: "string" })),
        gitMutationAction("prepare_branch", requiredParams({ branchName: "string" })),
        gitMutationAction("switch_branch", requiredParams({ branchName: "string" })),
        gitMutationAction("fetch_remote", optionalParams({ remote: "string" })),
        gitMutationAction("pull_branch", { ...requiredParams({ branchName: "string", remote: "string", remoteBranch: "string", expectedLocalCommit: "string" }), ...optionalParams({ expectedRemoteCommit: "string" }), strategy: { type: "string", required: true, allowedValues: ["ff-only", "merge", "rebase"] } }),
        gitMutationAction("fast_forward_branch", optionalParams({
          branchName: "string",
          remote: "string",
          remoteBranch: "string",
        })),
        gitMutationAction("merge_branch", {
          ...requiredParams({ sourceBranch: "string" }),
          ...optionalParams({ targetBranch: "string" }),
          mode: { type: "string", allowedValues: ["ff-only", "merge"] },
        }),
        gitMutationAction("create_tag", {
          ...requiredParams({ tagName: "string" }),
          tagType: { type: "string", required: true, allowedValues: ["annotated", "lightweight"] },
          ...optionalParams({ target: "string", message: "string" }),
        }),
        gitMutationAction("push_tag", {
          ...requiredParams({ tagName: "string" }),
          ...optionalParams({ remote: "string" }),
        }),
        gitMutationAction("delete_tag", {
          ...requiredParams({ tagName: "string" }),
          ...optionalParams({ remote: "string" }),
        }),
        gitMutationAction("delete_branch", requiredParams({ branchName: "string" })),
        gitMutationAction("replace_branch_ref", requiredParams({ branchName: "string", expectedCurrentCommit: "string", sourceRef: "string" })),
        gitMutationAction("push_with_lease", { ...requiredParams({ remote: "string", localBranch: "string", remoteBranch: "string", expectedLocalCommit: "string", expectedRemoteCommit: "string" }), ...optionalParams({ setUpstream: "boolean" }) }),
        gitMutationAction("delete_untracked_paths", requiredParams({ paths: "string-array" })),
        gitMutationAction("discard_managed_worktree", requiredParams({ workspaceId: "string", expectedBranch: "string", confirmDiscard: "boolean" })),
        gitMutationAction("skip_isolated_operation_step", requiredParams({ operationId: "string" })),
        gitMutationAction("begin_isolated_operation", { ...requiredParams({ targetBranch: "string", sourceRef: "string", expectedTargetCommit: "string" }), operation: { type: "string", required: true, allowedValues: ["merge", "cherry-pick", "revert", "rebase"] }, ...optionalParams({ mainline: "number" }) }),
        gitMutationAction("continue_isolated_operation", requiredParams({ operationId: "string" })),
        gitMutationAction("abort_isolated_operation", requiredParams({ operationId: "string" })),
        gitMutationAction("advance_isolated_operation", requiredParams({ operationId: "string", expectedTargetCommit: "string", expectedCandidateCommit: "string" })),
        gitMutationAction("create_worktree_from_ref", requiredParams({ checkoutName: "string", branchName: "string", sourceRef: "string" })),
        gitMutationAction("create_worktree_for_branch", requiredParams({ checkoutName: "string", branchName: "string" })),
        gitMutationAction("remove_worktree", requiredParams({ workspaceId: "string", expectedBranch: "string" })),
        gitMutationAction("unstage_changes", requiredParams({ paths: "string-array" })),
        gitMutationAction("restore_files", { ...requiredParams({ paths: "string-array" }), ...optionalParams({ sourceRef: "string" }) }),
        gitMutationAction("stage_changes", requiredParams({ paths: "string-array" })),
        gitMutationAction("amend_commit", { ...requiredParams({ expectedHead: "string" }), ...optionalParams({ message: "string" }) }),
        gitMutationAction("revert_commit", { ...requiredParams({ commit: "string", expectedHead: "string" }), ...optionalParams({ mainline: "number" }) }),
        gitMutationAction("cherry_pick_commit", { ...requiredParams({ commit: "string", expectedHead: "string" }), ...optionalParams({ mainline: "number" }) }),
        gitMutationAction("commit", { ...requiredParams({ message: "string" }), ...optionalParams({ expectedHead: "string" }) }),
        gitMutationAction("push", optionalParams({ remote: "string", branch: "string", expectedCommit: "string", remoteBranch: "string", setUpstream: "boolean" })),
        gitMutationAction("integrate_to_dev", {}),
        ...extendedGitActions(),
      ],
    },
    {
      name: "artifact_toolbox",
      title: "artifact_toolbox",
      description: "ChampCity A/I Agent Harness artifact_toolbox.",
      actions: [
        readAction("status", {}, () => ({
          canonicalSource: "ChampCity A/I planning document services",
          genericPersistenceOnly: true,
        })),
        writeAction("replace_markdown_body", "artifact-write", requiredParams({
          relativePath: "string",
          submissionId: "string",
          expectedMetadataSha256: "string",
          expectedBodySha256: "string",
          bodyMarkdown: "string",
        }), ({ context, params }) => replaceControlledMarkdownBody(context.root, {
          relativePath: requiredString(params.relativePath, "relativePath"),
          submissionId: requiredString(params.submissionId, "submissionId"),
          expectedMetadataSha256: requiredString(params.expectedMetadataSha256, "expectedMetadataSha256"),
          expectedBodySha256: requiredString(params.expectedBodySha256, "expectedBodySha256"),
          bodyMarkdown: requiredString(params.bodyMarkdown, "bodyMarkdown"),
        })),
        writeAction("write_markdown_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".md" },
        )),
        writeAction("write_json_artifact", "artifact-write", {
          ...requiredParams({ relativePath: "string", content: "string" }),
          ...optionalParams({ overwrite: "boolean" }),
        }, ({ context, params }) => writeTextArtifact(
          context.root,
          requiredString(params.relativePath, "relativePath"),
          requiredString(params.content, "content"),
          { overwrite: booleanValue(params.overwrite), expectedExtension: ".json" },
        )),
      ],
    },
    {
      name: "diagnostics_toolbox",
      title: "diagnostics_toolbox",
      description: "ChampCity A/I Agent Harness diagnostics_toolbox.",
      actions: [
        readAction("status", {}, ({ context, runtimeDiagnostics }) => {
          const runtime = runtimeDiagnostics?.() ?? {};
          return {
            workspace: {
              workspaceId: context.workspaceId,
              repositoryName: context.repositoryName,
              gitBacked: context.gitBacked,
            },
            operational: runtime.operationalDiagnostics ?? {},
          };
        }),
        readAction("list_workspaces", {}, ({ workspaceSummaries }) => ({ workspaces: workspaceSummaries() })),
        readAction("tool_inventory", {}, ({ runtimeDiagnostics }) => {
          const runtime = runtimeDiagnostics?.() ?? {};
          const toolContractDiagnostics = runtime.toolContractDiagnostics;
          if (toolContractDiagnostics && typeof toolContractDiagnostics === "object") {
            return toolContractDiagnostics;
          }
          return {
            registry: {
              state: "registry-only",
              fingerprint: null,
              tools: createToolProviders(releaseToolbox, repositoryHosting, localGitAccess, repositoryTargets).map((provider) => ({
                name: provider.name,
                actions: provider.actions.map((action) => action.name),
              })),
            },
            published: {
              state: "none",
              activeSessionCount: 0,
              staleSessionCount: 0,
              contracts: [],
            },
          };
        }),
      ],
    },
    {
      name: "release_toolbox",
      title: "release_toolbox",
      description: "ChampCity Desktop legacy release compatibility operations. Requires a registered ChampCity RepositoryCheckout. For project-independent Forgejo/GitHub repository, pull-request, release, and asset operations use integration_toolbox.",
      actions: [
        releaseInspectionAction("status", {}, ({ context }) => (
          releaseToolbox.status(context.root, context.gitBacked)
        )),
        releaseMutationAction("set_version", requiredParams({ version: "string" }), ({ context, params }) => (
          releaseToolbox.setVersion(context.root, requiredString(params.version, "version"))
        )),
        releaseMutationAction("validate_candidate", {}, ({ context }) => (
          releaseToolbox.validateCandidate(context.root)
        )),
        releaseMutationAction("build_windows_release", {}, ({ context }) => (
          releaseToolbox.buildWindowsRelease(context.root)
        )),
        releaseInspectionAction("inspect_release_artifact", {}, ({ context }) => (
          releaseToolbox.inspectReleaseArtifact(context.root)
        )),
        releaseMutationAction("publish_github_release", requiredParams({ tagName: "string" }), ({ context, params }) => (
          releaseToolbox.publishGithubRelease(
            context.root,
            context.gitBacked,
            requiredString(params.tagName, "tagName"),
          )
        )),
        releaseMutationAction("abandon_github_draft_release", requiredParams({ tagName: "string" }), ({ context, params }) => (
          releaseToolbox.abandonGithubDraftRelease(
            context.root,
            context.gitBacked,
            requiredString(params.tagName, "tagName"),
          )
        )),
        releaseInspectionAction("verify_github_release", requiredParams({ tagName: "string" }), ({ context, params }) => (
          releaseToolbox.verifyGithubRelease(
            context.root,
            context.gitBacked,
            requiredString(params.tagName, "tagName"),
          )
        )),
      ],
    },
    {
      name: "test_toolbox",
      title: "test_toolbox",
      description: "Bound repository validation through its authoritative catalog, planner and executor. Execution requires files.write and returns bounded per-file evidence; no shell, executable, environment or working-directory inputs.",
      actions: [
        readAction("status", {}, () => ({ toolbox: "test_toolbox", state: "implemented", implemented: true,
          executionScope: "files.write", maximumCatalogFiles: 512, perStepTimeoutMs: 900_000 })),
        testExecutionAction("run_test_file", { testPath: { type: "string", required: true, minLength: 1, maxLength: 4096 } }),
        testExecutionAction("run_test_pattern", {
          testPath: { type: "string", required: true, minLength: 1, maxLength: 4096 },
          testNamePattern: { type: "string", required: true, minLength: 1, maxLength: 256 },
        }),
        testExecutionAction("run_validation_profile", {
          profile: { type: "string", required: true, allowedValues: INTEGRATION_VALIDATION_PROFILES, minLength: 1, maxLength: 80 },
          changedPaths: { type: "string-array", minItems: 0, maxItems: 256, minLength: 1, maxLength: 4096 },
          capabilityIds: { type: "string-array", minItems: 0, maxItems: 256, minLength: 1, maxLength: 160 },
        }),
        testExecutionAction("run_validation_lane", {
          lane: { type: "string", required: true, allowedValues: INTEGRATION_VALIDATION_LANES, minLength: 1, maxLength: 80 },
        }),
        testExecutionAction("audit_test_corpus", {}),
      ],
    },
    { ...statusOnlyProvider("integration_toolbox"), description: "Project-independent Forgejo and GitHub hosting operations, including repositories, settings, branches, tags, files, pull requests, releases, and release assets. No workflow Project registration is required.", actions: [
      ...statusOnlyProvider("integration_toolbox").actions,
      ...repositoryHostingActions(repositoryHosting, localGitAccess),
    ] },
    statusOnlyProvider("browser_toolbox"),
    statusOnlyProvider("knowledge_toolbox"),
    {
      name:"workflow_toolbox", title:"workflow_toolbox", description:"Bounded Greenfield semantic candidate ingress; Operator disposition is separate.",
      actions:[
        readAction("status", {}, ({scope}) => ({implemented:true, supportedStages:WORKFLOW_CANDIDATE_STAGES, stages:WORKFLOW_CANDIDATE_STAGES, candidateMaxBytes:WORKFLOW_CANDIDATE_MAX_BYTES, operatorDisposition:false,
          submissionAvailable:scopeIncludes(scope,"files.write"), requiredWriteScope:"files.write",
          availableActions:scopeIncludes(scope,"files.write") ? ["status","submit_stage_candidate"] : ["status"],
          submissionRequirement:scopeIncludes(scope,"files.write") ? null : "Candidate submission requires reauthorization with files.write scope."})),
        writeAction("submit_stage_candidate", "workflow-write", {
          workflowId:{type:"string",required:true,minLength:1,maxLength:128},
          stage:{type:"string",required:true,allowedValues:WORKFLOW_CANDIDATE_STAGES},
          scopeEntityId:{type:"string",minLength:1,maxLength:128},
          candidateJson:{type:"string",required:true,minLength:2,maxLength:WORKFLOW_CANDIDATE_MAX_BYTES},
        }, ({context,params}) => createWorkflowCandidateIngressService().submit(context.root, {
          workflowId:requiredString(params.workflowId,"workflowId"), stage:params.stage as typeof WORKFLOW_CANDIDATE_STAGES[number],
          ...(params.scopeEntityId ? {scopeEntityId:requiredString(params.scopeEntityId,"scopeEntityId")} : {}), candidateJson:requiredString(params.candidateJson,"candidateJson"),
        })),
      ],
    },
    {
      name: "data_toolbox", title: "Project State inspection", description: "Bounded read-only structured state of the registered Current Project. No SQL or path selectors; continuations expire on runtime restart. inspect_entity bodyFields explicitly selects top-level fields for oversized bodies.",
      actions: projectStateInspectionActions(),
    },
    ...HOTFIX10_RESERVED_TOOLBOX_NAMES.map(reservedToolboxProvider),
    {
      name: "workspace_write_attached_image",
      title: "workspace_write_attached_image",
      description: "ChampCity A/I Agent Harness workspace_write_attached_image.",
      actions: [
        writeAction("write_attached_image", "artifact-write", requiredParams({
          relativePath: "string",
          base64: "string",
          mimeType: "string",
        }), ({ context, params }) => writeAttachedImage(context.root, {
          relativePath: requiredString(params.relativePath, "relativePath"),
          base64: requiredString(params.base64, "base64"),
          mimeType: requiredString(params.mimeType, "mimeType"),
        })),
      ],
    },
  ];
}

function buildToolDefinition(provider: ToolProvider, scope: string): AgentHarnessToolDefinition | null {
  const actions = provider.actions.filter((action) => scopeIncludes(scope, action.requiredScope));
  if (actions.length === 0) {
    return null;
  }
  return {
    name: provider.name,
    title: provider.title,
    description: provider.description,
    inputSchema: buildInputSchema(actions),
    inputZodSchema: buildInputZodSchema(actions),
    readOnly: actions.every((action) => action.requiredScope === "files.read"),
    actions: actions.map((action) => action.name),
  };
}

function extendedGitActions(): ToolActionContract[] {
  const text = (required = true, maxLength = 240): ParamSpec => ({ type: "string", required, minLength: 1, maxLength });
  const state = { expectedState: text(true, 64) }, file = { filePath: text(true, 4096) };
  const count = (minimum: number, maximum: number, required = false): ParamSpec => ({ type: "number", integer: true, minimum, maximum, required });
  const mutation = (name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract => ({ name, params: withRepositoryCheckoutId(params), dispatch, kind: "git-mutation", requiredScope: "files.write" });
  return [
    gitInspectionAction("inspect_git_state", {}, ({ context }) => extendedGit.inspectExtendedGitState(context.root)),
    gitInspectionAction("inspect_conflicts", {}, ({ context }) => extendedGit.inspectExtendedGitState(context.root)),
    gitInspectionAction("inspect_git_file", file, ({ context, params }) => extendedGit.inspectExtendedGitFile(context.root, { filePath: requiredString(params.filePath, "filePath") })),
    ...["write_git_file_cas", "resolve_conflict_file"].map(name => mutation(name, { ...file, content: { type: "string", required: true, allowEmpty: true, maxLength: 262144 }, expectedFileState: text(true, 64), expectedIndexState: text(true, 64), stage: { type: "boolean" } }, async ({ context, params }) => {
      if (name === "resolve_conflict_file" && !(await extendedGit.inspectExtendedGitState(context.root)).conflictingPaths.includes(requiredString(params.filePath, "filePath"))) throw new AgentHarnessError("INVALID_INPUT", "Select a file in the current conflict inventory.");
      return extendedGit.writeExtendedGitFile(context.root, { filePath: requiredString(params.filePath, "filePath"), content: params.content as string, expectedFileState: requiredString(params.expectedFileState, "expectedFileState"), expectedIndexState: requiredString(params.expectedIndexState, "expectedIndexState"), stage: name === "resolve_conflict_file" || booleanValue(params.stage) });
    })),
    gitInspectionAction("blame", { ...file, ref: text(false), startLine: count(1, 10000000), endLine: count(1, 10000000) }, ({ context, params }) => extendedGit.blameExtendedGitFile(context.root, { filePath: requiredString(params.filePath, "filePath"), ref: stringValue(params.ref), startLine: numberValue(params.startLine), endLine: numberValue(params.endLine) })),
    gitInspectionAction("grep", { query: text(true, 2000), ref: text(false), paths: { type: "string-array", maxItems: 256, maxLength: 4096 } }, ({ context, params }) => extendedGit.grepExtendedGit(context.root, { query: requiredString(params.query, "query"), ref: stringValue(params.ref), paths: params.paths === undefined ? undefined : requiredStringArray(params.paths, "paths") })),
    mutation("remove_file", { ...file, ...state, cached: { type: "boolean" } }, ({ context, params }) => extendedGit.mutateExtendedGitFile(context.root, "remove", { filePath: requiredString(params.filePath, "filePath"), expectedState: requiredString(params.expectedState, "expectedState"), cached: booleanValue(params.cached) })),
    mutation("move_file", { ...file, ...state, destinationPath: text(true, 4096) }, ({ context, params }) => extendedGit.mutateExtendedGitFile(context.root, "move", { filePath: requiredString(params.filePath, "filePath"), expectedState: requiredString(params.expectedState, "expectedState"), destinationPath: requiredString(params.destinationPath, "destinationPath") })),
    mutation("checkout_ref", { ref: text(), ...state }, ({ context, params }) => extendedGit.checkoutExtendedGitRef(context.root, { ref: requiredString(params.ref, "ref"), expectedState: requiredString(params.expectedState, "expectedState") })),
    mutation("reset_ref", { ...state, sourceRef: text(), mode: { type: "string", required: true, allowedValues: ["soft", "mixed"] } }, ({ context, params }) => extendedGit.resetExtendedGit(context.root, { sourceRef: requiredString(params.sourceRef, "sourceRef"), mode: params.mode as "soft" | "mixed", expectedState: requiredString(params.expectedState, "expectedState") })),
    gitInspectionAction("stash_list", {}, ({ context }) => extendedGit.listExtendedGitStashes(context.root)),
    ...(["create", "apply", "pop", "drop"] as const).map(action => mutation(`stash_${action}`, { ...state, ...(action === "create" ? { paths: { type: "string-array", required: true, maxItems: 256, maxLength: 4096 } as ParamSpec, message: text(false, 2000), includeUntracked: { type: "boolean" } as ParamSpec } : { stashIndex: count(0, 99, true), expectedStashCommit: text(true, 64), ...(action === "drop" ? {} : { restoreIndex: { type: "boolean" } as ParamSpec }) }) }, ({ context, params }) => extendedGit.mutateExtendedGitStash(context.root, action, { expectedState: requiredString(params.expectedState, "expectedState"), paths: params.paths === undefined ? undefined : requiredStringArray(params.paths, "paths"), message: stringValue(params.message), stashIndex: numberValue(params.stashIndex), expectedStashCommit: stringValue(params.expectedStashCommit), restoreIndex: booleanValue(params.restoreIndex), includeUntracked: booleanValue(params.includeUntracked) }))),
    gitInspectionAction("inspect_notes", { namespace: text(false, 100), ref: text(false) }, ({ context, params }) => extendedGit.inspectExtendedGitNotes(context.root, { namespace: stringValue(params.namespace), ref: stringValue(params.ref) })),
    ...(["write", "remove"] as const).map(action => mutation(`${action}_note`, { namespace: text(false, 100), ref: text(), expectedNotesCommit: text(true, 64), ...(action === "write" ? { content: text(true, 65536) } : {}) }, ({ context, params }) => extendedGit.mutateExtendedGitNotes(context.root, action, { namespace: stringValue(params.namespace), ref: requiredString(params.ref, "ref"), expectedNotesCommit: requiredString(params.expectedNotesCommit, "expectedNotesCommit"), content: stringValue(params.content) }))),
    mutation("begin_git_operation", { ...state, sourceRef: text(), operation: { type: "string", required: true, allowedValues: ["merge", "rebase", "cherry-pick", "revert"] }, mainline: count(1, 100) }, ({ context, params }) => extendedGit.beginExtendedGitOperation(context.root, { expectedState: requiredString(params.expectedState, "expectedState"), sourceRef: requiredString(params.sourceRef, "sourceRef"), operation: params.operation as "merge" | "rebase" | "cherry-pick" | "revert", mainline: numberValue(params.mainline) })),
    mutation("recover_git_operation", { ...state, operation: { type: "string", required: true, allowedValues: ["merge", "rebase", "cherry-pick", "revert"] }, step: { type: "string", required: true, allowedValues: ["continue", "abort", "skip"] } }, ({ context, params }) => extendedGit.recoverExtendedGitOperation(context.root, { expectedState: requiredString(params.expectedState, "expectedState"), operation: params.operation as "merge" | "rebase" | "cherry-pick" | "revert", step: params.step as "continue" | "abort" | "skip" })),
    gitInspectionAction("inspect_prune", { remote: text(true, 64) }, ({ context, params }) => extendedGit.inspectExtendedGitPrune(context.root, requiredString(params.remote, "remote"))),
    mutation("prune_remote", { remote: text(true, 64), expectedBinding: text(true, 64), expectedTrackingState: text(true, 64) }, ({ context, params }) => extendedGit.pruneExtendedGitRemote(context.root, { remote: requiredString(params.remote, "remote"), expectedBinding: requiredString(params.expectedBinding, "expectedBinding"), expectedTrackingState: requiredString(params.expectedTrackingState, "expectedTrackingState") })),
    gitInspectionAction("diagnose_repository", {}, ({ context }) => extendedGit.diagnoseExtendedGit(context.root)),
    mutation("delete_untracked_file", { ...file, ...state }, ({ context, params }) => extendedGit.deleteExtendedGitUntrackedFile(context.root, { filePath: requiredString(params.filePath, "filePath"), expectedState: requiredString(params.expectedState, "expectedState") })),
    gitInspectionAction("inspect_git_identity", {}, ({ context }) => extendedGit.inspectExtendedGitIdentity(context.root)),
    mutation("configure_git_identity", { name: text(true, 200), email: text(true, 251), expectedConfigurationState: text(true, 64) }, ({ context, params }) => extendedGit.configureExtendedGitIdentity(context.root, { name: requiredString(params.name, "name"), email: requiredString(params.email, "email"), expectedConfigurationState: requiredString(params.expectedConfigurationState, "expectedConfigurationState") })),
    mutation("checkout_branch", { ...state, branchName: text(), expectedBranchCommit: text(true, 64) }, ({ context, params }) => extendedGit.checkoutExtendedGitBranch(context.root, { branchName: requiredString(params.branchName, "branchName"), expectedBranchCommit: requiredString(params.expectedBranchCommit, "expectedBranchCommit"), expectedState: requiredString(params.expectedState, "expectedState") })),
    mutation("restore_file_cas", { ...file, ...state, sourceRef: text(false), index: { type: "boolean", required: true }, worktree: { type: "boolean", required: true } }, ({ context, params }) => extendedGit.restoreExtendedGitFile(context.root, { filePath: requiredString(params.filePath, "filePath"), expectedState: requiredString(params.expectedState, "expectedState"), sourceRef: stringValue(params.sourceRef), index: params.index as boolean, worktree: params.worktree as boolean })),
    gitInspectionAction("inspect_tag_object", { tagName: text() }, ({ context, params }) => extendedGit.inspectExtendedGitTagObject(context.root, requiredString(params.tagName, "tagName"))),
    mutation("delete_tag_cas", { tagName: text(), expectedObjectId: text(true, 64) }, ({ context, params }) => extendedGit.deleteExtendedGitTagObject(context.root, { tagName: requiredString(params.tagName, "tagName"), expectedObjectId: requiredString(params.expectedObjectId, "expectedObjectId") })),
    mutation("rename_remote", { remote: text(true, 64), newName: text(true, 64), expectedBinding: text(true, 64) }, ({ context, params }) => extendedGit.renameExtendedGitRemote(context.root, { remote: requiredString(params.remote, "remote"), newName: requiredString(params.newName, "newName"), expectedBinding: requiredString(params.expectedBinding, "expectedBinding") })),
    mutation("configure_remote_tracking", { remote: text(true, 64), sourceBranch: text(), trackingBranch: text(), expectedBinding: text(true, 64) }, ({ context, params }) => extendedGit.configureExtendedGitTracking(context.root, { remote: requiredString(params.remote, "remote"), sourceBranch: requiredString(params.sourceBranch, "sourceBranch"), trackingBranch: requiredString(params.trackingBranch, "trackingBranch"), expectedBinding: requiredString(params.expectedBinding, "expectedBinding") })),
    mutation("remove_remote", { remoteName: text(true, 64), expectedBinding: text(true, 64) }, ({ context, params }) => removeConfiguredGitRemote(context.root, { remoteName: requiredString(params.remoteName, "remoteName"), expectedBinding: requiredString(params.expectedBinding, "expectedBinding") })),
  ];
}

function repositoryHostingActions(hosting: RepositoryHostingFacade, localGitAccess?: LocalGitRepositoryAccessService): ToolActionContract[] {
  const identity: Record<string, ParamSpec> = {
    providerId: { type: "string", required: true, minLength: 1, maxLength: 64 },
    repository: { type: "string", required: true, minLength: 1, maxLength: 100 },
    owner: { type: "string", minLength: 1, maxLength: 100 },
  };
  const locator = (params: Record<string, unknown>) => ({ repository: requiredString(params.repository, "repository"), ...(params.owner === undefined ? {} : { owner: requiredString(params.owner, "owner") }) });
  const adapter = (params: Record<string, unknown>) => hosting.adapter(requiredString(params.providerId, "providerId"));
  const global = (name: string, requiredScope: RequiredScope, params: Record<string, ParamSpec>, dispatchGlobal: NonNullable<ToolActionContract["dispatchGlobal"]>): ToolActionContract => ({
    name, requiredScope, params, globalOnly: true, kind: requiredScope === "files.read" ? "read" : "artifact-write", dispatchGlobal,
    dispatch: () => { throw new AgentHarnessError("INVALID_INPUT", "Global provider action requires independent dispatch."); },
  });
  const transport: ParamSpec = { type: "string", allowedValues: ["https", "ssh"] };
  const remoteName: ParamSpec = { type: "string", required: true, minLength: 1, maxLength: 64 };
  return [
    global("provider_status", "files.read", { providerId: identity.providerId }, ({ params, signal }) => hosting.providerStatus(requiredString(params.providerId, "providerId"), signal)),
    global("connect_hosted_provider", "files.write", { providerId: identity.providerId }, ({ params }) => hosting.connectProvider(requiredString(params.providerId, "providerId"))),
    global("disconnect_hosted_provider", "files.write", { providerId: identity.providerId }, ({ params }) => hosting.disconnectProvider(requiredString(params.providerId, "providerId"))),
    ...githubReleaseActions(identity, global, hosting, locator, localGitAccess),
    ...extendedHostingActions(identity, global, adapter, locator),
    global("inspect_hosted_repository", "files.read", identity, ({ params, signal }) => adapter(params).inspectRepository(locator(params), signal)),
    global("create_hosted_repository", "files.write", { ...identity, visibility: { type: "string", required: true, allowedValues: ["private", "public"] }, description: { type: "string", allowEmpty: true, maxLength: 2000 }, initialize: { type: "boolean", constant: false } }, ({ params, signal }) => adapter(params).createRepository({ ...locator(params), visibility: requiredString(params.visibility, "visibility") as "private" | "public", ...(params.description !== undefined ? { description: params.description as string } : {}), initialize: false }, signal)),
    global("update_hosted_repository_settings", "files.write", { ...identity, expectedState: { type: "string", required: true, minLength: 64, maxLength: 64 }, visibility: { type: "string", allowedValues: ["private", "public"] }, description: { type: "string", allowEmpty: true, maxLength: 2000 } }, ({ params, signal }) => adapter(params).updateRepositorySettings(locator(params), requiredString(params.expectedState, "expectedState"), {
      ...(params.visibility !== undefined ? { visibility: requiredString(params.visibility, "visibility") as "private" | "public" } : {}),
      ...(params.description !== undefined ? { description: params.description as string } : {}),
    }, signal)),
    { name: "bind_repository_remote", kind: "git-mutation", requiredScope: "files.write", repositoryTarget: true,
      params: withRepositoryCheckoutId({ ...identity, remoteName, transport, expectedCurrentBinding: { type: "string", minLength: 64, maxLength: 64 }, expectedRepositoryState: { type: "string", minLength: 64, maxLength: 64 } }),
      dispatch: async ({ context, params, signal }) => {
        const provider = adapter(params), hosted = await provider.inspectRepository(locator(params), signal);
        if (params.expectedRepositoryState !== undefined && params.expectedRepositoryState !== hosted.state) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Hosted repository changed before remote binding; inspect before retrying.");
        const remote = await provider.resolveGitRemote(locator(params), stringValue(params.transport) as "https" | "ssh" | undefined, signal);
        if (remote.providerId !== provider.providerId || remote.hostedRepositoryId !== hosted.repositoryId || remote.hostedRepositoryState !== hosted.state) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Provider repository identity changed during destination resolution; no Git mutation was attempted.");
        const binding = await mutateProviderOwnedRemote(context.root, { remoteName: requiredString(params.remoteName, "remoteName"), operation: params.expectedCurrentBinding === undefined ? "add" : "replace", remote, expectedBinding: stringValue(params.expectedCurrentBinding) });
        return { providerId: provider.providerId, hostedRepository: hosted, binding };
      } },
    { name: "remove_repository_remote", kind: "git-mutation", requiredScope: "files.write", repositoryTarget: true,
      params: withRepositoryCheckoutId({ ...identity, remoteName, transport, expectedCurrentBinding: { type: "string", required: true, minLength: 64, maxLength: 64 } }),
      dispatch: async ({ context, params, signal }) => {
        const provider = adapter(params), remote = await provider.resolveGitRemote(locator(params), stringValue(params.transport) as "https" | "ssh" | undefined, signal);
        return mutateProviderOwnedRemote(context.root, { remoteName: requiredString(params.remoteName, "remoteName"), operation: "remove", remote, expectedBinding: requiredString(params.expectedCurrentBinding, "expectedCurrentBinding") });
      } },
    global("clone_hosted_repository", "files.write", { ...identity, transport, destinationDirectory: { type: "string", required: true, minLength: 1, maxLength: 4096 }, branch: { type: "string", minLength: 1, maxLength: 240 } }, async ({ params, signal }) => {
      if (!localGitAccess) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Local repository access is unavailable in this host.");
      const provider = adapter(params), remote = await provider.resolveGitRemote(locator(params), stringValue(params.transport) as "https" | "ssh" | undefined, signal);
      if (remote.providerId !== provider.providerId || !remote.hostedRepositoryId || !remote.hostedRepositoryState) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Provider-owned clone identity could not be verified.");
      const checkout = await localGitAccess.clone(remote, { destinationDirectory: requiredString(params.destinationDirectory, "destinationDirectory"), branch: stringValue(params.branch) });
      return { ...checkout, providerId: remote.providerId, hostedRepositoryId: remote.hostedRepositoryId, requiresRepositorySelection: true };
    }),
    { name: "verify_hosted_repository", kind: "git-inspection", requiredScope: "files.read", repositoryTarget: true,
      params: withRepositoryCheckoutId({ ...identity, remoteName, transport, expectedRefs: { type: "string-array", minItems: 1, maxItems: 1000, minLength: 1, maxLength: 320 } }),
      dispatch: async ({ context, params, signal }) => {
        const provider = adapter(params), hosted = await provider.verifyRepository(locator(params), signal);
        const destination = await provider.resolveGitRemote(locator(params), stringValue(params.transport) as "https" | "ssh" | undefined, signal);
        if (destination.providerId !== provider.providerId || destination.hostedRepositoryId !== hosted.repositoryId || destination.hostedRepositoryState !== hosted.state) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Hosted repository changed during verification.");
        const remote = await inspectGitRemote(context.root, requiredString(params.remoteName, "remoteName"));
        if (!remote.destinationsEqual || remote.mirror || remote.fetchDestinations[0].identity !== destination.identity.identity) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Selected Git remote differs from the configured provider-owned repository destination.");
        let refs: Awaited<ReturnType<typeof inspectGitRemoteRefs>> | undefined;
        if (params.expectedRefs !== undefined) {
          const expected = requiredStringArray(params.expectedRefs, "expectedRefs").map(entry => {
            const parsed = /^(refs\/(?:heads|tags)\/[^\s\0]+)=([a-f0-9]{40}|[a-f0-9]{64})$/.exec(entry);
            if (!parsed) throw new AgentHarnessError("INVALID_INPUT", "Expected refs require exact heads/tags names and commit or tag object IDs.");
            return { ref: parsed[1], objectId: parsed[2] };
          });
          if (new Set(expected.map(entry => entry.ref)).size !== expected.length) throw new AgentHarnessError("INVALID_INPUT", "Expected refs must be unique.");
          refs = await inspectGitRemoteRefs(context.root, { remote: remote.remote, refClass: "all" });
          if (expected.some(entry => !refs!.refs.some(actual => actual.ref === entry.ref && actual.objectId === entry.objectId))) throw new AgentHarnessError("REPOSITORY_PROVIDER_STATE_CHANGED", "Provider Git refs differ from the expected exact object IDs.");
        }
        return { verified: true, providerId: provider.providerId, hostedRepository: hosted, remote, ...(refs ? { refs: refs.refs } : {}) };
      } },
  ];
}

function githubReleaseActions(
  identity: Record<string, ParamSpec>,
  global: (name: string, scope: RequiredScope, params: Record<string, ParamSpec>, dispatch: NonNullable<ToolActionContract["dispatchGlobal"]>) => ToolActionContract,
  hosting: RepositoryHostingFacade,
  locator: (params: Record<string, unknown>) => { repository: string; owner?: string },
  localGitAccess?: LocalGitRepositoryAccessService,
): ToolActionContract[] {
  const selected = { ...identity, providerId: { ...identity.providerId, allowedValues: ["github"] }, owner: { ...identity.owner, required: true } };
  const id: ParamSpec = { type: "number", integer: true, minimum: 1, maximum: Number.MAX_SAFE_INTEGER, required: true };
  const release = { ...selected, releaseId: id };
  const expected = { ...release, expectedState: { type: "string" as const, required: true, minLength: 64, maxLength: 64 } };
  const write = { tagName: { type: "string" as const, required: true, minLength: 1, maxLength: 240 }, name: { type: "string" as const, required: true, allowEmpty: true, maxLength: 2000 }, body: { type: "string" as const, required: true, allowEmpty: true, maxLength: 65536 }, draft: { type: "boolean" as const, required: true }, prerelease: { type: "boolean" as const, required: true } };
  const adapter = (params: Record<string, unknown>) => hosting.githubAdapter(requiredString(params.providerId, "providerId"));
  const content = (params: Record<string, unknown>) => ({ tagName: requiredString(params.tagName, "tagName"), name: params.name as string, body: params.body as string, draft: params.draft as boolean, prerelease: params.prerelease as boolean });
  const upload = { ...expected, name: { type: "string" as const, required: true, minLength: 1, maxLength: 160 } };
  const inline = { contentBase64: { type: "string" as const, required: true, minLength: 1, maxLength: 699052 } };
  const local = { repositoryContextHandle: portableContextParam, localCheckoutHandle: { type: "string" as const, required: true, minLength: 1, maxLength: 128 }, relativePath: { type: "string" as const, required: true, minLength: 1, maxLength: 4096 }, expectedSha256: { type: "string" as const, required: true, minLength: 64, maxLength: 64 }, expectedSize: { type: "number" as const, required: true, integer: true, minimum: 1, maximum: MAX_RELEASE_ARTIFACT_SIZE } };
  return [
    global("list_hosted_releases", "files.read", selected, ({ params, signal }) => adapter(params).listReleases(locator(params), signal)),
    global("inspect_hosted_release", "files.read", release, ({ params, signal }) => adapter(params).inspectRelease(locator(params), numberValue(params.releaseId)!, signal)),
    global("create_hosted_release", "files.write", { ...selected, ...write }, ({ params, signal }) => adapter(params).writeRelease(locator(params), content(params), undefined, undefined, signal)),
    global("update_hosted_release", "files.write", { ...expected, ...write }, ({ params, signal }) => adapter(params).writeRelease(locator(params), content(params), numberValue(params.releaseId)!, requiredString(params.expectedState, "expectedState"), signal)),
    global("delete_hosted_release", "files.write", expected, ({ params, signal }) => adapter(params).deleteRelease(locator(params), numberValue(params.releaseId)!, requiredString(params.expectedState, "expectedState"), signal)),
    { ...global("upload_hosted_release_asset", "files.write", { ...upload, ...inline, ...local }, async ({ params, signal, session, principal }) => {
      const provider = adapter(params), releaseId = numberValue(params.releaseId)!, expectedState = requiredString(params.expectedState, "expectedState"), name = requiredString(params.name, "name");
      if (params.contentBase64 !== undefined) return provider.mutateAsset(locator(params), releaseId, expectedState, { name, contentBase64: requiredString(params.contentBase64, "contentBase64") }, signal);
      if (!localGitAccess) throw new AgentHarnessError("WORKSPACE_ACCESS_DENIED", "Local repository access is unavailable in this host.");
      return localGitAccess.inContext(session, stringValue(params.repositoryContextHandle), principal, selected => localGitAccess.withContext(selected, requiredString(params.localCheckoutHandle, "localCheckoutHandle"), checkout =>
        provider.artifacts.withCheckoutSource(checkout, { relativePath: requiredString(params.relativePath, "relativePath"), expectedSha256: requiredString(params.expectedSha256, "expectedSha256"), expectedSize: numberValue(params.expectedSize)! },
          async source => { await localGitAccess.verifyContext(selected, checkout); return provider.mutateAsset(locator(params), releaseId, expectedState, { name, source }, signal); }, signal)));
    }), paramForms: [{ ...upload, ...inline }, { ...upload, ...local }] },
    global("download_hosted_release_asset", "files.read", { ...expected, assetId: id }, ({ params, signal }) => adapter(params).downloadAsset(locator(params), numberValue(params.releaseId)!, requiredString(params.expectedState, "expectedState"), numberValue(params.assetId)!, signal)),
    global("delete_hosted_release_asset", "files.write", { ...expected, assetId: id }, ({ params, signal }) => adapter(params).mutateAsset(locator(params), numberValue(params.releaseId)!, requiredString(params.expectedState, "expectedState"), { assetId: numberValue(params.assetId)! }, signal)),
  ];
}

function extendedHostingActions(
  identity: Record<string, ParamSpec>,
  global: (name: string, scope: RequiredScope, params: Record<string, ParamSpec>, dispatch: NonNullable<ToolActionContract["dispatchGlobal"]>) => ToolActionContract,
  adapter: (params: Record<string, unknown>) => ReturnType<RepositoryHostingFacade["adapter"]>,
  locator: (params: Record<string, unknown>) => { repository: string; owner?: string },
): ToolActionContract[] {
  const text = (required = true, maxLength = 240): ParamSpec => ({ type: "string", required, minLength: 1, maxLength });
  const page: Record<string, ParamSpec> = { page: { type: "number", integer: true, minimum: 1, maximum: 10000 }, limit: { type: "number", integer: true, minimum: 1, maximum: 50 } };
  const paging = (params: Record<string, unknown>) => ({ page: numberValue(params.page), limit: numberValue(params.limit) });
  const pullNumber: ParamSpec = { type: "number", required: true, integer: true, minimum: 1, maximum: 2147483647 };
  const pull = { ...identity, pullNumber };
  const file = { ...identity, filePath: text(true, 4096) };
  const fileMutation = { ...file, branch: text(), expectedSha: text(true, 64), message: text(true, 2000) };
  return [
    global("list_hosted_repositories", "files.read", { providerId: identity.providerId, ...page }, ({ params, signal }) => adapter(params).listRepositories(paging(params), signal)),
    ...(["branches", "tags"] as const).flatMap(kind => {
      const singular = kind === "branches" ? "branch" : "tag";
      return [
        global(`list_hosted_${kind}`, "files.read", { ...identity, ...page }, ({ params, signal }) => adapter(params).listRefs(locator(params), kind, paging(params), signal)),
        global(`inspect_hosted_${singular}`, "files.read", { ...identity, name: text() }, ({ params, signal }) => adapter(params).inspectRef(locator(params), kind, requiredString(params.name, "name"), signal)),
        global(`create_hosted_${singular}`, "files.write", { ...identity, name: text(), sourceCommit: text(true, 64) }, ({ params, signal }) => adapter(params).createRef(locator(params), kind, requiredString(params.name, "name"), requiredString(params.sourceCommit, "sourceCommit"), signal)),
        global(`delete_hosted_${singular}`, "files.write", { ...identity, name: text(), expectedCommit: text(true, 64) }, ({ params, signal }) => adapter(params).deleteRef(locator(params), kind, requiredString(params.name, "name"), requiredString(params.expectedCommit, "expectedCommit"), signal)),
      ];
    }),
    global("inspect_hosted_file", "files.read", { ...file, ref: text() }, ({ params, signal }) => adapter(params).inspectFile(locator(params), requiredString(params.filePath, "filePath"), requiredString(params.ref, "ref"), signal)),
    global("write_hosted_file_cas", "files.write", { ...fileMutation, content: { type: "string", required: true, allowEmpty: true, maxLength: 131072 } }, ({ params, signal }) => adapter(params).writeFile(locator(params), { filePath: requiredString(params.filePath, "filePath"), branch: requiredString(params.branch, "branch"), expectedSha: requiredString(params.expectedSha, "expectedSha"), message: requiredString(params.message, "message"), content: params.content as string }, signal)),
    global("delete_hosted_file_cas", "files.write", fileMutation, ({ params, signal }) => adapter(params).deleteFile(locator(params), { filePath: requiredString(params.filePath, "filePath"), branch: requiredString(params.branch, "branch"), expectedSha: requiredString(params.expectedSha, "expectedSha"), message: requiredString(params.message, "message") }, signal)),
    global("list_pull_requests", "files.read", { ...identity, ...page, state: { type: "string", allowedValues: ["open", "closed", "all"] } }, ({ params, signal }) => adapter(params).listPullRequests(locator(params), { ...paging(params), state: stringValue(params.state) as "open" | "closed" | "all" | undefined }, signal)),
    global("inspect_pull_request", "files.read", pull, ({ params, signal }) => adapter(params).inspectPullRequest(locator(params), numberValue(params.pullNumber)!, signal)),
    global("create_pull_request", "files.write", { ...identity, title: text(true, 2000), body: { type: "string", allowEmpty: true, maxLength: 65536 }, head: text(), base: text() }, ({ params, signal }) => adapter(params).createPullRequest(locator(params), { title: requiredString(params.title, "title"), body: params.body as string | undefined, head: requiredString(params.head, "head"), base: requiredString(params.base, "base") }, signal)),
    global("update_pull_request", "files.write", { ...pull, expectedState: text(true, 64), title: text(false, 2000), body: { type: "string", allowEmpty: true, maxLength: 65536 }, state: { type: "string", allowedValues: ["open", "closed"] }, base: text(false) }, ({ params, signal }) => adapter(params).updatePullRequest(locator(params), numberValue(params.pullNumber)!, requiredString(params.expectedState, "expectedState"), {
      ...(params.title === undefined ? {} : { title: requiredString(params.title, "title") }), ...(params.body === undefined ? {} : { body: params.body as string }), ...(params.state === undefined ? {} : { state: params.state as "open" | "closed" }), ...(params.base === undefined ? {} : { base: requiredString(params.base, "base") }),
    }, signal)),
    global("merge_pull_request", "files.write", { ...pull, expectedHead: text(true, 64), method: { type: "string", required: true, allowedValues: ["merge", "rebase", "squash"] } }, ({ params, signal }) => adapter(params).mergePullRequest(locator(params), numberValue(params.pullNumber)!, requiredString(params.expectedHead, "expectedHead"), params.method as "merge" | "rebase" | "squash", signal)),
    global("list_pull_request_reviews", "files.read", { ...pull, ...page }, ({ params, signal }) => adapter(params).listReviews(locator(params), numberValue(params.pullNumber)!, paging(params), signal)),
    global("create_pull_request_review", "files.write", { ...pull, expectedHead: text(true, 64), event: { type: "string", required: true, allowedValues: ["APPROVED", "REQUEST_CHANGES", "COMMENT"] }, body: { type: "string", required: true, allowEmpty: true, maxLength: 65536 } }, ({ params, signal }) => adapter(params).createReview(locator(params), numberValue(params.pullNumber)!, requiredString(params.expectedHead, "expectedHead"), params.event as "APPROVED" | "REQUEST_CHANGES" | "COMMENT", params.body as string, signal)),
  ];
}

function buildInputSchema(actions: ToolActionContract[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: actions.some(action => action.localOnly || action.globalOnly || isGitCheckoutAction(action)) ? ["action"] : ["workspaceId", "action"],
    properties: {
      workspaceId: { type: "string" },
      action: { type: "string", enum: actions.map((action) => action.name) },
      params: { type: "object" },
    },
    oneOf: actions.flatMap(actionVariants).map((action) => buildActionInputSchema(action)),
  };
}

function buildActionInputSchema(action: ToolActionContract): Record<string, unknown> {
  const required = action.localOnly || action.globalOnly ? ["action"] : ["workspaceId", "action"];
  if (requiredParamNames(action.params).length > 0) {
    required.push("params");
  }
  return {
    title: action.name,
    type: "object",
    additionalProperties: false,
    required,
    properties: {
      ...(action.localOnly || action.globalOnly ? {} : { workspaceId: { type: "string", ...(action.kind === "test-execution" ? { minLength: 1, maxLength: 160 } : {}) } }),
      action: { type: "string", const: action.name },
      params: buildParamsInputSchema(action.params),
    },
  };
}

function buildParamsInputSchema(params: Record<string, ParamSpec>): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: requiredParamNames(params),
    properties: Object.fromEntries(Object.entries(params).map(([name, spec]) => [
      name,
      spec.type === "string-array"
        ? {
            type: "array",
            minItems: spec.minItems ?? 1,
            maxItems: spec.maxItems ?? 256,
            items: { type: "string", minLength: spec.minLength ?? 1, maxLength: spec.maxLength ?? 4_096 },
          }
        : { type: spec.integer ? "integer" : spec.type, ...(spec.allowedValues ? { enum: spec.allowedValues } : {}),
            ...(spec.constant === undefined ? {} : { const: spec.constant }),
            ...(spec.minimum === undefined ? {} : { minimum: spec.minimum }),
            ...(spec.maximum === undefined ? {} : { maximum: spec.maximum }),
            ...(spec.minLength === undefined ? {} : { minLength: spec.minLength }),
            ...(spec.maxLength === undefined ? {} : { maxLength: spec.maxLength }) },
    ])),
  };
}

function buildInputZodSchema(actions: ToolActionContract[]): z.ZodType<Record<string, unknown>> {
  const actionSchemas = actions.flatMap(actionVariants).map((action) => z.object({
    ...(action.localOnly || action.globalOnly ? {} : { workspaceId: action.kind === "test-execution" ? z.string().min(1).max(160) : z.string() }),
    action: z.literal(action.name),
    params: buildParamsZodSchema(action.params),
  }).strict());
  if (actionSchemas.length === 1) {
    return actionSchemas[0] as z.ZodType<Record<string, unknown>>;
  }
  return z.union(actionSchemas as unknown as [
    z.ZodObject<Record<string, z.ZodType<unknown>>>,
    z.ZodObject<Record<string, z.ZodType<unknown>>>,
    ...z.ZodObject<Record<string, z.ZodType<unknown>>>[],
  ]) as z.ZodType<Record<string, unknown>>;
}

function buildParamsZodSchema(params: Record<string, ParamSpec>): z.ZodType<Record<string, unknown> | undefined> {
  const shape = Object.fromEntries(Object.entries(params).map(([name, spec]) => {
    const schema = zodParamSchema(spec);
    return [name, spec.required ? schema : schema.optional()];
  })) as Record<string, z.ZodType<unknown>>;
  const paramsSchema = z.object(shape).strict();
  if (requiredParamNames(params).length > 0) {
    return paramsSchema as z.ZodType<Record<string, unknown>>;
  }
  return paramsSchema.optional() as z.ZodType<Record<string, unknown> | undefined>;
}

function zodParamSchema(spec: ParamSpec): z.ZodType<unknown> {
  if (spec.type === "string-array") {
    return z.array(z.string().min(spec.minLength ?? 1).max(spec.maxLength ?? 4_096)).min(spec.minItems ?? 1).max(spec.maxItems ?? 256);
  }
  if (spec.type === "number") {
    return z.number().refine((value) => Number.isFinite(value) && (!spec.integer || Number.isSafeInteger(value)) &&
      (spec.minimum === undefined || value >= spec.minimum) && (spec.maximum === undefined || value <= spec.maximum), "number exceeds its bounds");
  }
  if (spec.type === "boolean") {
    return spec.constant === undefined ? z.boolean() : z.literal(spec.constant);
  }
  let schema = z.string();
  if (spec.minLength !== undefined) schema = schema.min(spec.minLength);
  if (spec.maxLength !== undefined) schema = schema.max(spec.maxLength);
  return spec.allowedValues ? schema.refine((value) => spec.allowedValues?.includes(value) === true, "unsupported value") : schema;
}

function testExecutionAction(name: TestToolboxAction, params: Record<string, ParamSpec>): ToolActionContract {
  return { name, kind: "test-execution", requiredScope: "files.write", params: withRepositoryCheckoutId(params),
    dispatch: ({ context, params: values, signal }) => {
      const { repositoryCheckoutId: _resolvedCheckout, ...executionParams } = values;
      return executeTestToolbox(context, name, executionParams, signal);
    } };
}

function readAction(name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract {
  return { name, kind: "read", requiredScope: "files.read", params, dispatch };
}

function projectStateInspectionActions(): ToolActionContract[] {
  const entityId: ParamSpec = {type: "string", required: true, minLength: 1, maxLength: 128};
  const page: Record<string, ParamSpec> = {
    limit: {type: "number", integer: true, minimum: 1, maximum: 50},
    cursor: {type: "string", minLength: 1, maxLength: 2048},
  };
  const action = (name: string, params: Record<string, ParamSpec>) => readAction(name, params,
    ({context, params: values}) => inspectRegisteredProjectState(context.root, context.workspaceId, name, values));
  return [
    action("status", {}),
    action("inspect_entity", {entityId, recordVersion: {type: "number", integer: true, minimum: 1, maximum: Number.MAX_SAFE_INTEGER},
      bodyFields: {type: "string-array", minItems: 1, maxItems: 32, minLength: 1, maxLength: 80}}),
    action("list_entities", {entityType: {type: "string", required: true, allowedValues: Object.keys(ENTITY_TYPE_REGISTRY)}, ...page}),
    action("list_entity_versions", {entityId, ...page}),
    action("list_entity_relationships", {entityId, direction: {type: "string", allowedValues: ["inbound", "outbound", "both"]},
      selection: {type: "string", allowedValues: ["active", "ended", "both"]}, ...page}),
    action("list_entity_changes", {entityId, ...page}),
  ];
}

function gitInspectionAction(name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract {
  return { name, kind: "git-inspection", requiredScope: "files.read", params: withRepositoryCheckoutId(params), dispatch };
}

function isGitCheckoutAction(action: ToolActionContract): boolean {
  return !action.localOnly && (action.kind === "git-inspection" || action.kind === "git-mutation");
}
function isManagedOnlyGitAction(name: string): boolean {
  return ["create_worktree_from_ref", "create_worktree_for_branch", "remove_worktree", "discard_managed_worktree", "delete_untracked_paths"].includes(name);
}
const portableContextParam: ParamSpec = { type: "string", minLength: 1, maxLength: 128 };

function localVariant(action: ToolActionContract): ToolActionContract {
  if (action.localOnly) return action;
  const { repositoryCheckoutId: _checkout, ...params } = action.params;
  if (action.name === "inspect_worktree") delete params.workspaceId;
  return { ...action, localOnly: true, params: { ...params, repositoryContextHandle: portableContextParam, localCheckoutHandle: { type: "string", required: true, minLength: 1, maxLength: 128 } } };
}
function actionVariants(action: ToolActionContract): ToolActionContract[] {
  if (action.paramForms) return action.paramForms.map(params => ({ ...action, params, paramForms: undefined }));
  return isGitCheckoutAction(action) && !isManagedOnlyGitAction(action.name) ? [action, localVariant(action)] : [action];
}
function localGitAction(name: string, requiredScope: RequiredScope, params: Record<string, ParamSpec>): ToolActionContract {
  return { name, kind: requiredScope === "files.read" ? "git-inspection" : "git-mutation", requiredScope, params: params.localCheckoutHandle?.required || name === "inspect_repository_context" ? { ...params, repositoryContextHandle: portableContextParam } : params, localOnly: true,
    dispatch: () => { throw new AgentHarnessError("INVALID_INPUT", "Local Git action requires local target resolution."); } };
}

function withRepositoryCheckoutId(params: Record<string, ParamSpec>): Record<string, ParamSpec> {
  if (Object.prototype.hasOwnProperty.call(params, "repositoryCheckoutId")) throw new Error("Git target is centrally defined.");
  return { ...params, repositoryCheckoutId: { type: "string", required: true, minLength: 1, maxLength: 128 } };
}

function releaseInspectionAction(
  name: string,
  params: Record<string, ParamSpec>,
  dispatch: ToolActionContract["dispatch"],
): ToolActionContract {
  return { name, kind: "release-inspection", requiredScope: "files.read", params: withRepositoryCheckoutId(params), dispatch };
}

function releaseMutationAction(
  name: string,
  params: Record<string, ParamSpec>,
  dispatch: ToolActionContract["dispatch"],
): ToolActionContract {
  return { name, kind: "release-mutation", requiredScope: "files.write", params: withRepositoryCheckoutId(params), dispatch };
}

function isCheckoutBoundAction(kind: HarnessActionKind): boolean {
  return kind === "git-inspection" || kind === "git-mutation" || kind === "test-execution" ||
    kind === "release-inspection" || kind === "release-mutation";
}

function writeAction(
  name: string,
  kind: Extract<HarnessActionKind, "artifact-write" | "patch-write" | "workflow-write">,
  params: Record<string, ParamSpec>,
  dispatch: ToolActionContract["dispatch"],
): ToolActionContract {
  return { name, kind, requiredScope: "files.write", params, dispatch };
}

function gitMutationAction(
  name: GitMutationAction,
  params: Record<string, ParamSpec>,
): ToolActionContract {
  return {
    name,
    kind: "git-mutation",
    requiredScope: "files.write",
    params: withRepositoryCheckoutId(params),
    dispatch: async ({ context, params: values, managedWorkspaces }) => {
      switch (name) {
        case "pull_branch":
          return pullGitBranch(context.root, { branchName: requiredString(values.branchName, "branchName"), remote: requiredString(values.remote, "remote"), remoteBranch: requiredString(values.remoteBranch, "remoteBranch"), expectedLocalCommit: requiredString(values.expectedLocalCommit, "expectedLocalCommit"), expectedRemoteCommit: stringValue(values.expectedRemoteCommit), strategy: requiredString(values.strategy, "strategy") as "ff-only" | "merge" | "rebase" }, managedWorkspaces);
        case "replace_branch_ref":
          return replaceGitBranchRef(context.root, { branchName: requiredString(values.branchName, "branchName"), expectedCurrentCommit: requiredString(values.expectedCurrentCommit, "expectedCurrentCommit"), sourceRef: requiredString(values.sourceRef, "sourceRef") });
        case "push_with_lease":
          return pushGitWithLease(context.root, { remote: requiredString(values.remote, "remote"), localBranch: requiredString(values.localBranch, "localBranch"), remoteBranch: requiredString(values.remoteBranch, "remoteBranch"), expectedLocalCommit: requiredString(values.expectedLocalCommit, "expectedLocalCommit"), expectedRemoteCommit: requiredString(values.expectedRemoteCommit, "expectedRemoteCommit"), setUpstream: booleanValue(values.setUpstream) });
        case "delete_untracked_paths":
          return deleteGitUntrackedPaths(context.root, requiredStringArray(values.paths, "paths"));
        case "discard_managed_worktree":
          return discardManagedWorktree(context.root, { workspaceId: requiredString(values.workspaceId, "workspaceId"), expectedBranch: requiredString(values.expectedBranch, "expectedBranch"), confirmDiscard: values.confirmDiscard === true }, requiredManagedStore(managedWorkspaces));
        case "skip_isolated_operation_step":
          return skipIsolatedOperationStep(context.root, requiredString(values.operationId, "operationId"), requiredManagedStore(managedWorkspaces));
        case "begin_isolated_operation":
          return beginIsolatedOperation(context.root, { operation: requiredString(values.operation, "operation") as IsolatedOperationKind, targetBranch: requiredString(values.targetBranch, "targetBranch"), sourceRef: requiredString(values.sourceRef, "sourceRef"), expectedTargetCommit: requiredString(values.expectedTargetCommit, "expectedTargetCommit"), mainline: numberValue(values.mainline) }, requiredManagedStore(managedWorkspaces));
        case "continue_isolated_operation":
          return continueIsolatedOperation(context.root, requiredString(values.operationId, "operationId"), requiredManagedStore(managedWorkspaces));
        case "abort_isolated_operation":
          return abortIsolatedOperation(context.root, requiredString(values.operationId, "operationId"), requiredManagedStore(managedWorkspaces));
        case "advance_isolated_operation":
          return advanceIsolatedOperation(context.root, { operationId: requiredString(values.operationId, "operationId"), expectedTargetCommit: requiredString(values.expectedTargetCommit, "expectedTargetCommit"), expectedCandidateCommit: requiredString(values.expectedCandidateCommit, "expectedCandidateCommit") }, requiredManagedStore(managedWorkspaces));
        case "create_worktree_from_ref":
        case "create_worktree_for_branch":
          return createManagedWorktree(context.root, { checkoutName: requiredString(values.checkoutName, "checkoutName"), branchName: requiredString(values.branchName, "branchName"), sourceRef: name === "create_worktree_from_ref" ? requiredString(values.sourceRef, "sourceRef") : undefined }, requiredManagedStore(managedWorkspaces));
        case "remove_worktree":
          return removeManagedWorktree(context.root, { workspaceId: requiredString(values.workspaceId, "workspaceId"), expectedBranch: requiredString(values.expectedBranch, "expectedBranch") }, requiredManagedStore(managedWorkspaces));
        case "create_branch_from_ref":
          return createGitBranchFromRef(context.root, { branchName: requiredString(values.branchName, "branchName"), sourceRef: requiredString(values.sourceRef, "sourceRef") });
        case "advance_branch_ref":
          return advanceGitBranchRef(context.root, { branchName: requiredString(values.branchName, "branchName"), sourceRef: requiredString(values.sourceRef, "sourceRef"), expectedCurrentCommit: requiredString(values.expectedCurrentCommit, "expectedCurrentCommit") });
        case "rename_branch":
          return renameGitBranch(context.root, { branchName: requiredString(values.branchName, "branchName"), newBranchName: requiredString(values.newBranchName, "newBranchName") });
        case "set_branch_upstream":
          return setGitBranchUpstream(context.root, { branchName: requiredString(values.branchName, "branchName"), remote: requiredString(values.remote, "remote"), remoteBranch: requiredString(values.remoteBranch, "remoteBranch") });
        case "unset_branch_upstream":
          return unsetGitBranchUpstream(context.root, { branchName: requiredString(values.branchName, "branchName") });
        case "delete_remote_branch":
          return deleteGitRemoteBranch(context.root, { remote: requiredString(values.remote, "remote"), remoteBranch: requiredString(values.remoteBranch, "remoteBranch"), expectedRemoteCommit: requiredString(values.expectedRemoteCommit, "expectedRemoteCommit") });
        case "prepare_branch":
          return prepareGitBranch(context.root, requiredString(values.branchName, "branchName"));
        case "switch_branch":
          return switchGitBranch(context.root, requiredString(values.branchName, "branchName"));
        case "fetch_remote":
          return fetchGitRemote(context.root, stringValue(values.remote));
        case "fast_forward_branch":
          return fastForwardGitBranch(context.root, {
            branch: stringValue(values.branchName),
            remote: stringValue(values.remote),
            remoteBranch: stringValue(values.remoteBranch),
          });
        case "merge_branch":
          return mergeGitBranch(context.root, {
            sourceBranch: requiredString(values.sourceBranch, "sourceBranch"),
            targetBranch: stringValue(values.targetBranch),
            mode: stringValue(values.mode),
          });
        case "create_tag":
          return createGitTag(context.root, {
            tagName: requiredString(values.tagName, "tagName"),
            tagType: requiredString(values.tagType, "tagType"),
            target: stringValue(values.target),
            message: stringValue(values.message),
          });
        case "push_tag":
          return pushGitTag(context.root, {
            tagName: requiredString(values.tagName, "tagName"),
            remote: stringValue(values.remote),
          });
        case "delete_tag":
          return deleteGitTag(context.root, {
            tagName: requiredString(values.tagName, "tagName"),
            remote: stringValue(values.remote),
          });
        case "delete_branch":
          return deleteGitBranch(context.root, requiredString(values.branchName, "branchName"));
        case "unstage_changes":
          return unstageGitChanges(context.root, requiredStringArray(values.paths, "paths"));
        case "restore_files":
          return restoreGitFiles(context.root, { paths: requiredStringArray(values.paths, "paths"), sourceRef: stringValue(values.sourceRef) });
        case "stage_changes":
          return stageGitChanges(context.root, requiredStringArray(values.paths, "paths"));
        case "amend_commit":
          return amendGitCommit(context.root, { expectedHead: requiredString(values.expectedHead, "expectedHead"), message: stringValue(values.message) });
        case "revert_commit":
        case "cherry_pick_commit":
          return (name === "revert_commit" ? revertGitCommit : cherryPickGitCommit)(context.root, { commit: requiredString(values.commit, "commit"), expectedHead: requiredString(values.expectedHead, "expectedHead"), mainline: numberValue(values.mainline) });
        case "commit":
          return commitGitChanges(context.root, requiredString(values.message, "message"), stringValue(values.expectedHead));
        case "push":
          return pushGitBranch(context.root, {
            remote: stringValue(values.remote),
            branch: stringValue(values.branch),
            expectedCommit: stringValue(values.expectedCommit),
            remoteBranch: stringValue(values.remoteBranch),
            setUpstream: booleanValue(values.setUpstream),
          });
        case "integrate_to_dev":
          return integrateGitBranchToDev(context.root);
      }
    },
  };
}

function statusOnlyProvider(name: PublicToolName): ToolProvider {
  return {
    name,
    title: name,
    description: `ChampCity A/I Agent Harness ${name}.`,
    actions: [
      readAction("status", {}, () => ({
        available: false,
        reason: `${name}.status is a compatibility foundation surface only in WC60.`,
      })),
    ],
  };
}

function reservedToolboxProvider(name: PublicToolName): ToolProvider {
  return {
    name,
    title: name,
    description: `ChampCity A/I reserved public MCP namespace ${name}.`,
    actions: [
      readAction("status", {}, () => ({
        toolbox: name,
        state: "reserved",
        implemented: false,
      })),
    ],
  };
}

function requiredParams(params: Record<string, ParamType>): Record<string, ParamSpec> {
  return Object.fromEntries(Object.entries(params).map(([name, type]) => [name, { type, required: true }]));
}

function optionalParams(params: Record<string, ParamType>): Record<string, ParamSpec> {
  return Object.fromEntries(Object.entries(params).map(([name, type]) => [name, { type }]));
}

function validateParams(value: unknown, contract: ToolActionContract): Record<string, unknown> {
  if (contract.paramForms) {
    for (const params of contract.paramForms) { try { return validateParams(value, { ...contract, params, paramForms: undefined }); } catch { /* Try the other exclusive source form. */ } }
    throw new AgentHarnessError("INVALID_INPUT", "Select exactly one complete inline or trusted local artifact source.");
  }
  const params = value === undefined ? {} : recordArgumentValue(value, "params");
  rejectUnknownKeys(params, Object.keys(contract.params), `${contract.name} params`);
  for (const [name, spec] of Object.entries(contract.params)) {
    const paramValue = params[name];
    if (paramValue === undefined) {
      if (spec.required) {
        throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
      }
      continue;
    }
    if (!paramMatchesType(paramValue, spec)) {
      throw new AgentHarnessError("INVALID_INPUT", `${name} must be a ${spec.type}.`);
    }
    if (spec.constant !== undefined && paramValue !== spec.constant) throw new AgentHarnessError("INVALID_INPUT", `${name} has an unsupported value.`);
    if (spec.type === "string" && typeof paramValue === "string" && !paramValue.trim() && !spec.allowEmpty) {
      throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
    }
    if (typeof paramValue === "string" && ((spec.minLength !== undefined && paramValue.length < spec.minLength)
      || (spec.maxLength !== undefined && paramValue.length > spec.maxLength))) {
      throw new AgentHarnessError("INVALID_INPUT", `${name} exceeds its string bounds.`);
    }
    if (spec.allowedValues && typeof paramValue === "string" && !spec.allowedValues.includes(paramValue)) {
      throw new AgentHarnessError("INVALID_INPUT", `${name} has an unsupported value.`);
    }
  }
  return params;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new AgentHarnessError("INVALID_INPUT", `Unknown ${label}: ${unknown.join(", ")}.`);
  }
}

function requiredParamNames(params: Record<string, ParamSpec>): string[] {
  return Object.entries(params)
    .filter(([, spec]) => spec.required)
    .map(([name]) => name);
}

function paramMatchesType(value: unknown, spec: ParamSpec): boolean {
  if (spec.type === "string-array") {
    return Array.isArray(value) && value.length >= (spec.minItems ?? 1) && value.length <= (spec.maxItems ?? 256) &&
      value.every((entry) => typeof entry === "string" && entry.trim() && entry.length >= (spec.minLength ?? 1)
        && entry.length <= (spec.maxLength ?? 4_096) && Buffer.byteLength(entry, "utf8") <= 4_096);
  }
  if (spec.type === "number") {
    return typeof value === "number" && Number.isFinite(value) && (!spec.integer || Number.isSafeInteger(value)) &&
      (spec.minimum === undefined || value >= spec.minimum) && (spec.maximum === undefined || value <= spec.maximum);
  }
  return typeof value === spec.type;
}

function scopeIncludes(scope: string | undefined, required: string): boolean {
  return (scope ?? PRIMARY_MCP_RESOURCE_SCOPE).split(/\s+/).includes(required);
}

function recordArgumentValue(value: unknown, label = "tool arguments"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentHarnessError("INVALID_INPUT", `${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeRepositoryListOutput(result: Awaited<ReturnType<typeof listRepositoryFiles>>): Omit<typeof result, "root"> {
  const { root: _localRoot, ...publicResult } = result;
  return publicResult;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} is required.`);
  }
  return value;
}

function requiredStringArray(
  value: unknown,
  name: string,
  minimumItems = 1,
  maximumItems = 256,
): string[] {
  if (
    !Array.isArray(value) ||
    value.length < minimumItems ||
    value.length > maximumItems ||
    value.some((entry) => typeof entry !== "string" || !entry.trim() || Buffer.byteLength(entry, "utf8") > 4_096)
  ) {
    throw new AgentHarnessError("INVALID_INPUT", `${name} must be a non-empty string array.`);
  }
  return value as string[];
}

function imageBearingResult(
  payload: unknown,
  imageContent: AgentHarnessToolImageContent[],
): ImageBearingDispatchResult {
  return {
    [IMAGE_BEARING_DISPATCH_RESULT]: true,
    payload,
    imageContent,
  };
}

function isImageBearingDispatchResult(value: unknown): value is ImageBearingDispatchResult {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as Partial<ImageBearingDispatchResult>)[IMAGE_BEARING_DISPATCH_RESULT] === true,
  );
}

function requiredManagedStore(store: ManagedWorkspaceStore | undefined): ManagedWorkspaceStore {
  if (!store) throw new AgentHarnessError("WORKSPACE_UNAVAILABLE", "Managed workspace registration is unavailable.");
  return store;
}
