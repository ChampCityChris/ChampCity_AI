import { skipIsolatedOperationStep, beginIsolatedOperation, inspectIsolatedOperation, continueIsolatedOperation, abortIsolatedOperation, advanceIsolatedOperation, type IsolatedOperationKind } from "../repository/isolatedGitOperations";
import { discardManagedWorktree, createManagedWorktree, listManagedWorktrees, inspectManagedWorktree, removeManagedWorktree, type ManagedWorkspaceStore } from "../repository/managedWorktrees";
import { AgentHarnessError, toBoundedError } from "../core/errors";
import { writeAttachedImage } from "../repository/attachedImages";
import { replaceControlledMarkdownBody } from "../repository/controlledMarkdownDrafts";
import { readIssueScreenshotEvidence } from "../repository/issueScreenshotEvidence";
import { copyRepositoryFile, moveRepositoryFile } from "../repository/fileOperations";
import { createVisualAssetPreview } from "../repository/visualAssetPreview";
import {
  compareVisualAssetImages,
  inspectVisualAssetImage,
  readVisualAssetImage,
} from "../repository/visualAssetReview";
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
} from "../repository/repositoryOperations";
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
} from "../repository/gitMutations";
import {
  applyApprovedPatch,
  registerPatchProposal,
} from "../repository/patches";
import { createReleaseToolbox, type ReleaseToolbox } from "../release/releaseToolbox";
import { executeTestToolbox, type TestToolboxAction } from "../test/testToolbox";
import { INTEGRATION_VALIDATION_LANES, INTEGRATION_VALIDATION_PROFILES } from "../../../shared/integrationPolicyContracts";
import {
  type AgentHarnessWorkspaceAccessProvider,
  type AgentHarnessWorkspaceContext,
  assertActionAccess,
  type HarnessActionKind,
} from "../workspace/workspaceAccess";
import * as z from "zod/v4";

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
  "workflow_toolbox",
  "issue_toolbox",
  "agent_toolbox",
  "model_toolbox",
  "skill_toolbox",
  "memory_toolbox",
  "validation_toolbox",
  "development_toolbox",
  "system_toolbox",
  "network_toolbox",
  "data_toolbox",
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
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
}

interface ToolActionContract {
  name: string;
  kind: HarnessActionKind;
  requiredScope: RequiredScope;
  params: Record<string, ParamSpec>;
  dispatch: (input: DispatchInput) => unknown | Promise<unknown>;
}

interface ToolProvider {
  name: PublicToolName;
  title: string;
  description: string;
  actions: ToolActionContract[];
}

interface DispatchInput {
  signal?: AbortSignal;
  managedWorkspaces?: ManagedWorkspaceStore;
  context: AgentHarnessWorkspaceContext;
  params: Record<string, unknown>;
  userDataRoot: string;
  workspaceSummaries: AgentHarnessWorkspaceAccessProvider["listWorkspaceSummaries"];
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
}

export interface AgentHarnessToolResult {
  ok: boolean;
  toolName: string;
  action: string;
  workspaceId?: string;
  payload?: unknown;
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
  listTools: (scope?: string) => AgentHarnessToolDefinition[];
  callTool: (call: AgentHarnessToolCall) => Promise<AgentHarnessToolResult>;
}

interface RegistryOptions {
  managedWorkspaces?: ManagedWorkspaceStore;
  workspaceAccess: AgentHarnessWorkspaceAccessProvider;
  userDataRoot: string;
  runtimeDiagnostics?: () => Record<string, unknown>;
  releaseToolbox?: ReleaseToolbox;
}

const IMAGE_BEARING_DISPATCH_RESULT = Symbol("image-bearing-dispatch-result");

interface ImageBearingDispatchResult {
  [IMAGE_BEARING_DISPATCH_RESULT]: true;
  payload: unknown;
  imageContent: AgentHarnessToolImageContent[];
}

export function createAgentHarnessToolRegistry(options: RegistryOptions): AgentHarnessToolRegistry {
  const releaseToolbox = options.releaseToolbox ?? createReleaseToolbox();
  const providers = createToolProviders(releaseToolbox);
  const providerByName = new Map(providers.map((provider) => [provider.name, provider]));
  return {
    listTools: (scope = "files.read files.write") => providers
      .map((provider) => buildToolDefinition(provider, scope))
      .filter((definition): definition is AgentHarnessToolDefinition => Boolean(definition)),
    callTool: async (call) => {
      const attemptId = `ahr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const timestamp = new Date().toISOString();
      let action = "unknown";
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
        const context = await options.workspaceAccess.resolveWorkspaceContext(args.workspaceId);
        const params = validateParams(args.params, contract);
        assertActionAccess(context, contract.kind);
        const dispatchResult = await contract.dispatch({
          context,
          params,
          signal: call.signal,
          managedWorkspaces: options.managedWorkspaces,
          userDataRoot: options.userDataRoot,
          workspaceSummaries: options.workspaceAccess.listWorkspaceSummaries,
          runtimeDiagnostics: options.runtimeDiagnostics,
        });
        if (isImageBearingDispatchResult(dispatchResult)) {
          return {
            ok: true,
            toolName: provider.name,
            action,
            workspaceId: context.workspaceId,
            payload: dispatchResult.payload,
            imageContent: dispatchResult.imageContent,
            attemptId,
            timestamp,
          };
        }
        return {
          ok: true,
          toolName: provider.name,
          action,
          workspaceId: context.workspaceId,
          payload: dispatchResult,
          attemptId,
          timestamp,
        };
      } catch (error) {
        return {
          ok: false,
          toolName: call.name,
          action,
          error: call.name === "test_toolbox" && !(error instanceof AgentHarnessError)
            ? { code: "RUNTIME_ERROR", message: "Bound validation execution is unavailable; inspect the repository toolkit and runtime." }
            : call.name === "git_toolbox" && /worktree|isolated_operation|reflog|delete_untracked_paths/.test(action) && !(error instanceof AgentHarnessError)
            ? { code: "GIT_EXECUTION_FAILED", message: "Managed Git operation is unavailable or its filesystem state changed; inspect before retrying." }
            : toBoundedError(error),
          attemptId,
          timestamp,
        };
      }
    },
  };
}

function createToolProviders(releaseToolbox: ReleaseToolbox): ToolProvider[] {
  return [
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
              tools: createToolProviders(releaseToolbox).map((provider) => ({
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
      description: "ChampCity A/I bounded Desktop release mechanics and GitHub Release provider.",
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
    statusOnlyProvider("integration_toolbox"),
    statusOnlyProvider("browser_toolbox"),
    statusOnlyProvider("knowledge_toolbox"),
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

function buildInputSchema(actions: ToolActionContract[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "action"],
    properties: {
      workspaceId: { type: "string" },
      action: { type: "string", enum: actions.map((action) => action.name) },
      params: { type: "object" },
    },
    oneOf: actions.map((action) => buildActionInputSchema(action)),
  };
}

function buildActionInputSchema(action: ToolActionContract): Record<string, unknown> {
  const required = ["workspaceId", "action"];
  if (requiredParamNames(action.params).length > 0) {
    required.push("params");
  }
  return {
    title: action.name,
    type: "object",
    additionalProperties: false,
    required,
    properties: {
      workspaceId: { type: "string", ...(action.kind === "test-execution" ? { minLength: 1, maxLength: 160 } : {}) },
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
        : { type: spec.type, ...(spec.allowedValues ? { enum: spec.allowedValues } : {}),
            ...(spec.minLength === undefined ? {} : { minLength: spec.minLength }),
            ...(spec.maxLength === undefined ? {} : { maxLength: spec.maxLength }) },
    ])),
  };
}

function buildInputZodSchema(actions: ToolActionContract[]): z.ZodType<Record<string, unknown>> {
  const actionSchemas = actions.map((action) => z.object({
    workspaceId: action.kind === "test-execution" ? z.string().min(1).max(160) : z.string(),
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
    return z.number().refine((value) => Number.isFinite(value), "number must be finite");
  }
  if (spec.type === "boolean") {
    return z.boolean();
  }
  let schema = z.string();
  if (spec.minLength !== undefined) schema = schema.min(spec.minLength);
  if (spec.maxLength !== undefined) schema = schema.max(spec.maxLength);
  return spec.allowedValues ? schema.refine((value) => spec.allowedValues?.includes(value) === true, "unsupported value") : schema;
}

function testExecutionAction(name: TestToolboxAction, params: Record<string, ParamSpec>): ToolActionContract {
  return { name, kind: "test-execution", requiredScope: "files.write", params,
    dispatch: ({ context, params: values, signal }) => executeTestToolbox(context, name, values, signal) };
}

function readAction(name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract {
  return { name, kind: "read", requiredScope: "files.read", params, dispatch };
}

function gitInspectionAction(name: string, params: Record<string, ParamSpec>, dispatch: ToolActionContract["dispatch"]): ToolActionContract {
  return { name, kind: "git-inspection", requiredScope: "files.read", params, dispatch };
}

function releaseInspectionAction(
  name: string,
  params: Record<string, ParamSpec>,
  dispatch: ToolActionContract["dispatch"],
): ToolActionContract {
  return { name, kind: "release-inspection", requiredScope: "files.read", params, dispatch };
}

function releaseMutationAction(
  name: string,
  params: Record<string, ParamSpec>,
  dispatch: ToolActionContract["dispatch"],
): ToolActionContract {
  return { name, kind: "release-mutation", requiredScope: "files.write", params, dispatch };
}

function writeAction(
  name: string,
  kind: Extract<HarnessActionKind, "artifact-write" | "patch-write">,
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
    params,
    dispatch: async ({ context, params: values, managedWorkspaces }) => {
      switch (name) {
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
    if (spec.type === "string" && typeof paramValue === "string" && !paramValue.trim()) {
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
    return typeof value === "number" && Number.isFinite(value);
  }
  return typeof value === spec.type;
}

function scopeIncludes(scope: string | undefined, required: string): boolean {
  return (scope ?? "files.read files.write").split(/\s+/).includes(required);
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
