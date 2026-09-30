import { codexRuntimeManager, type CodexRuntimeManager } from "./codexRuntimeManager";
import type { CodexModelSelection } from "../../shared/codexRuntimeContracts";
import crypto from "node:crypto";
import { captureWorkItemCheckpoint, observeCheckpointChanges, type WorkItemCheckpointCapture } from "../planExecution/workItemCheckpointService";
import { completePlanWorkItemSource } from "../planExecution/planExecutor";
import { resolveRoutedImplementerContext } from "../planExecution/routedImplementerContext";
import type { IntegrationRepairExecutionContext } from "../planExecution/integrationRepairImplementerService";
import type { WorkItemCheckpointResult } from "../../shared/workItemCheckpointContracts";
import fs from "node:fs";
import path from "node:path";
import type {
  CodexImplementerExecutionModel,
  CodexImplementerExecutionKind,
  CodexImplementerExecutionState,
  CodexApprovalTelemetryModel,
  CodexApprovalResponse,
  CodexMcpElicitationResponse,
  CodexPendingApprovalModel,
  CodexPendingUserInputModel,
  CodexPendingMcpElicitationModel,
  CodexRuntimeStateModel,
} from "../../shared/workspaceContracts";
import type {
  DevelopmentEnvironmentPreflightResult,
} from "../../shared/developmentEnvironmentContracts";
import {
  type CodexAppServerAdapterFactory,
  type CodexAppServerThreadAdapter,
  type CodexAppServerThreadEvent,
  type CodexAppServerThreadItem,
  type CodexAppServerThreadOptions,
  type CodexAppServerTurnOptions,
} from "./codexAppServerTransport";
import {
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { getCurrentWorkspaceModel } from "../currentWorkflow/currentWorkflowService";
import {
  issueFixCardReportReadinessBlocker,
  resolveIssueFixCardCodexExecutionContext,
} from "../issueResolution/issueResolutionService";
import {
  type CodexImplementerExecutionPolicy,
  type CodexImplementerExecutionPolicyResolver,
  resolveDefaultCodexImplementerExecutionPolicy,
  threadOptionsFromCodexImplementerPolicy,
} from "./codexImplementerExecutionPolicy";
import {
  developmentEnvironmentPreflightService,
  type DevelopmentEnvironmentPreflightService,
} from "../developmentEnvironment/developmentEnvironmentPreflightService";
import {
  refreshWindowsProcessEnvironment,
  type WindowsEnvironmentRefreshResult,
} from "../developmentEnvironment/windowsEnvironmentRefresh";
import { createWorkflowExecutionApplicationService } from "../workflow/workflowExecutionApplicationService";
import { acquireWorkflowExecutionLease, workflowExecutionLeaseKey } from "./workflowExecutionLease";
import type { WorkItemExecutionContract } from "../../shared/workflowApplicationContracts";
import { createWorkflowSourceMaterializationService } from "../sourceControl/workflowSourceMaterializationService";
import { publishRepositoryCheckoutAccess, type RepositoryCheckoutAccessProjectionPort } from "../agentHarness/modelAccess/repositoryCheckoutAccessProjectionService";
import { createImplementationCheckpoint } from "../sourceControl/semanticCheckpointService";
import { resolveManagedProjectSourceTopology, resolveManagedWorkflowCheckoutPath } from "../sourceControl/projectSourceTopology";
import { workflowSourceLineName } from "../sourceControl/workSourceNaming";
import { runBoundedGit } from "../agentHarness/repository/boundedGit";
import { workflowRepositoryCheckoutId } from "../sourceControl/projectSourceTopology";

export const CODEX_RUNTIME_UNAVAILABLE_MESSAGE =
  "Codex App Server or local Codex runtime is not available from this application environment. Install Codex locally, authenticate it, then refresh.";
export const CODEX_AUTH_UNAVAILABLE_MESSAGE =
  "Codex is not authenticated in this local environment. Run codex login in a terminal, sign in with ChatGPT or your chosen Codex authentication method, then refresh.";

const maxTailItems = 24;
const maxTailTextLength = 1200;
const finalReportReadAttempts = 6;
const finalReportReadDelayMs = 25;

export interface CodexThreadAdapter {
  readonly id: string | null;
  runStreamed(input: string, options?: CodexAppServerTurnOptions): Promise<{ events: AsyncIterable<CodexAppServerThreadEvent> }>;
  respondToApproval?(requestId: string, decision: Omit<CodexApprovalResponse, "requestId">): Promise<void>;
  respondToUserInput?(requestId: string, answers: Record<string, string[]>): Promise<void>;
  respondToMcpElicitation?(requestId: string, response: Omit<CodexMcpElicitationResponse, "requestId">): Promise<void>;
  interrupt?(): Promise<void>;
  dispose?(): Promise<void>;
}

export interface CodexAppServerExecutionAdapter {
  startThread(options?: CodexAppServerThreadOptions): CodexThreadAdapter;
  getRuntimeState?(): CodexRuntimeStateModel;
  dispose?(): Promise<void>;
}

export type CodexAppServerExecutionAdapterFactory = CodexAppServerAdapterFactory;

interface WorkflowWorkItemExecutionData {
  workflowId: string;
  workItemId: string;
  contract: WorkItemExecutionContract;
  executionRef?: string;
  workerDirectory?: string;
  evidencePacketPath?: string;
  resultOutcome?: "implemented" | "partial" | "blocked" | "failed" | "abandoned";
  sourceBacked?: { checkoutRoot: string; repositoryCheckoutId: string; sourceLineId: string; expectedRevisionId: string; attributablePaths: string[]; attributionFailure?: string };
}
interface ExecutionContextFields {
  ownerKind?: "development" | "issue" | "routed-development" | "workflow-work-item";
  intakeId?: string;
  planId?: string;
  planRevision?: number;
  rootWorkItemId?: string;
  issueId?: string;
  rootFixCardId?: string;
  currentImplementationId?: string;
  repairId?: string;
  workflowId?: string;
  workItemId?: string;
  workItemVersion?: number;
  executionContract?: WorkItemExecutionContract;
  executionContractDigest?: string;
  sourceMode?: "source-backed" | "source-neutral";
  phaseId: string | null;
  workCardId: string;
  workCardTitle: string;
  projectRoot: string;
  formalWorkCardPath?: string;
  formalWorkCardRevision?: number;
  formalWorkCardSha256?: string;
  implementationContractType?: "formal-work-card" | "repair-work-card" | "fix-card";
  implementationContractLabel?: string;
  implementerReportPath?: string;
  implementerReportRevision?: number;
  implementerReportSha256?: string;
  developmentEnvironmentPreflight: DevelopmentEnvironmentPreflightResult | null;
  workflowWorkItem?: WorkflowWorkItemExecutionData;
}
interface LegacyWorkCardExecutionContext extends ExecutionContextFields {
  ownerKind?: "development" | "issue" | "routed-development";
  formalWorkCardPath: string; formalWorkCardRevision: number; formalWorkCardSha256: string;
  implementationContractType: "formal-work-card" | "repair-work-card" | "fix-card"; implementationContractLabel: string;
  implementerReportPath: string; implementerReportRevision: number; implementerReportSha256: string;
  workflowWorkItem?: never;
}
interface WorkflowWorkItemExecutionContext extends ExecutionContextFields {
  ownerKind: "workflow-work-item";
  currentProjectRoot: string;
  executionRoot: string;
  projectId: string;
  workflowId: string;
  workItemId: string;
  workItemVersion: number;
  executionContract: WorkItemExecutionContract;
  executionContractDigest: string;
  sourceMode: "source-backed" | "source-neutral";
  attemptEvidenceIdentity?: string;
  formalWorkCardPath?: never; formalWorkCardRevision?: never; formalWorkCardSha256?: never;
  implementationContractType?: never; implementationContractLabel?: never;
  implementerReportPath?: never; implementerReportRevision?: never; implementerReportSha256?: never;
  workflowWorkItem: WorkflowWorkItemExecutionData;
}
type WorkCardExecutionContext = LegacyWorkCardExecutionContext | WorkflowWorkItemExecutionContext;
/** The Integration Repair owner carries source scope instead of a Work Card and Implementer Report. */
export type CodexExecutionContext = WorkCardExecutionContext | IntegrationRepairExecutionContext;
type ExecutionContext = WorkCardExecutionContext;

interface IssueExecutionSelector {
  ownerKind: "issue";
  issueId: string;
  fixCardId: string;
  currentImplementationId?: string;
}
export type CodexExecutionSelector = IssueExecutionSelector | { ownerKind: "workflow-work-item"; workflowId: string; workItemId: string }
  | { ownerKind: "routed-development"; intakeId: string; workItemId: string }
  | { ownerKind: "integration-repair"; intakeId: string; candidateId: string; repairId: string };

interface SessionFields {
  checkpointCapture?: WorkItemCheckpointCapture;
  checkpoint?: WorkItemCheckpointResult;
  selection?: CodexModelSelection;
  executionKind: CodexImplementerExecutionKind;
  executionPolicy: CodexImplementerExecutionPolicy;
  state: CodexImplementerExecutionState;
  startedAt: number | null;
  completedAt: number | null;
  eventTail: string[];
  stderrTail: string[];
  finalResponseTail: string[];
  approvalTail: CodexApprovalTelemetryModel[];
  runtimeDenialTail: string[];
  runtimeState: CodexRuntimeStateModel | null;
  pendingApproval: CodexPendingApprovalModel | null;
  pendingUserInput: CodexPendingUserInputModel | null;
  pendingMcpElicitation: CodexPendingMcpElicitationModel | null;
  failureReason: string | null;
  reportUpdated: boolean;
  reportSha256After: string | null;
  abortController: AbortController | null;
  threadAdapter: CodexThreadAdapter | null;
  appServerAdapter: CodexAppServerExecutionAdapter | null;
  executionPromise: Promise<void> | null;
  cancellationRequested: boolean;
}
type SessionRecord = ExecutionContext & SessionFields;

type TerminalCodexImplementerExecutionState = Exclude<
  CodexImplementerExecutionState,
  "unavailable" | "ready" | "running"
>;

interface RetryReadiness {
  canRunAgain: boolean;
  retryBlocker: string | null;
}

interface FinalReportEvidence {
  exists: boolean;
  sha256: string | null;
  canonicalRevision: number | null;
  readError: string | null;
}

export class CodexImplementerExecutionService {
  private readonly sessionsByWorkspaceRoot = new Map<string, SessionRecord>();
  private readonly exactSessionsByOwner = new Map<string, SessionRecord>();
  private readonly preflightByWorkspaceRoot = new Map<string, DevelopmentEnvironmentPreflightResult>();
  private shutdownPromise: Promise<void> | null = null;
  private sourceCheckoutProjection: ((projectRoot: string, projectId: string) => Promise<{ workspaceId: string; projection: RepositoryCheckoutAccessProjectionPort }>) | null = null;

  configureSourceCheckoutProjection(factory: (projectRoot: string, projectId: string) => Promise<{ workspaceId: string; projection: RepositoryCheckoutAccessProjectionPort }>): void {
    this.sourceCheckoutProjection = factory;
  }

  private workflowKernel(projectRoot?: string, projectId?: string) {
    const materializeWorkflowSource = this.sourceCheckoutProjection && projectRoot && projectId
      ? async (root: string, exactProjectId: string, workflowId: string) => {
          if (root !== projectRoot || exactProjectId !== projectId) throw Error("Selected Current Project changed during source preparation.");
          const materializer = createWorkflowSourceMaterializationService({ projectContainerRoot: root, projectId: exactProjectId });
          const materialized = await materializer.materialize(workflowId);
          const access = await this.sourceCheckoutProjection!(root, exactProjectId);
          await publishRepositoryCheckoutAccess(access.workspaceId, [materialized.checkout], access.projection);
          return materialized;
        }
      : undefined;
    return this.workflowExecutionServiceFactory({ ...(materializeWorkflowSource ? { materializeWorkflowSource } : {}) });
  }

  constructor(
    private readonly appServerFactory: CodexAppServerExecutionAdapterFactory = loadCodexAppServerExecutionAdapter,
    private readonly now: () => number = () => Date.now(),
    private readonly policyResolver: CodexImplementerExecutionPolicyResolver =
      resolveDefaultCodexImplementerExecutionPolicy,
    private readonly preflightService: DevelopmentEnvironmentPreflightService =
      developmentEnvironmentPreflightService,
    private readonly parentEnvironmentRefresh: () => Promise<WindowsEnvironmentRefreshResult> =
      refreshWindowsProcessEnvironment,
    private readonly runtimeManager: CodexRuntimeManager = codexRuntimeManager,
    private readonly workflowExecutionServiceFactory: typeof createWorkflowExecutionApplicationService = createWorkflowExecutionApplicationService,
  ) {}

  getRunningRoutedSession(workspaceRoot: string, intakeId: string) {
    const session = this.sessionsByWorkspaceRoot.get(workspaceKey(workspaceRoot));
    if (!session || session.state !== "running" || session.ownerKind !== "routed-development" || session.intakeId !== intakeId || !session.rootWorkItemId) return undefined;
    return { workItemId: session.rootWorkItemId, status: modelFromSession(session, this.now(), { canRunAgain: false, retryBlocker: "Codex execution is already running for this workspace." }) };
  }

  async getStatus(workspaceRoot: string, selector?: CodexExecutionSelector): Promise<CodexImplementerExecutionModel> {
    if (selector?.ownerKind === "workflow-work-item") return this.getWorkflowWorkItemStatus(workspaceRoot, selector);
    const key = workspaceKey(workspaceRoot);
    const runningOrCompleted = this.sessionsByWorkspaceRoot.get(key);
    if (runningOrCompleted) {
      if (selector) {
        const requestedContext = await this.resolvePreflightContext(workspaceRoot, selector);
        if (requestedContext instanceof Error) {
          return unavailableFromPreflight(requestedContext);
        }
        if (!sameExecutionContext(runningOrCompleted, requestedContext)) {
          if (runningOrCompleted.state === "running") {
            return busyModelForDifferentContext(requestedContext, runningOrCompleted);
          }
        } else {
          if (runningOrCompleted.state === "running") {
            return modelFromSession(runningOrCompleted, this.now(), {
              canRunAgain: false,
              retryBlocker: "Codex execution is already running for this workspace.",
            });
          }
          const readiness = await this.resolveRetryReadiness(workspaceRoot, runningOrCompleted);
          return modelFromSession(runningOrCompleted, this.now(), readiness);
        }
      } else {
      if (runningOrCompleted.state === "running") {
        return modelFromSession(runningOrCompleted, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        });
      }
      const readiness = await this.resolveRetryReadiness(workspaceRoot, runningOrCompleted);
      return modelFromSession(runningOrCompleted, this.now(), readiness);
      }
    }

    const context = await this.resolvePreflightContext(workspaceRoot, selector);
    if (context instanceof Error) {
      return unavailableFromPreflight(context);
    }
    context.developmentEnvironmentPreflight = this.preflightByWorkspaceRoot.get(preflightKey(context)) ?? null;
    const cachedPreflight = context.developmentEnvironmentPreflight;
    if (
      cachedPreflight &&
      cachedPreflight.state !== "ready" &&
      cachedPreflight.state !== "not-required"
    ) {
      return unavailableModelFromPreflightResult(context, cachedPreflight);
    }

    return readyModel(context);
  }

  async start(workspaceRoot: string, selector?: CodexExecutionSelector, selection?: CodexModelSelection): Promise<CodexImplementerExecutionModel> {
    return this.startWithSelection(workspaceRoot, selector, selection, false);
  }

  private async startWithSelection(workspaceRoot: string, selector: CodexExecutionSelector | undefined, selection: CodexModelSelection | undefined, environment: boolean): Promise<CodexImplementerExecutionModel> {
    const exact = selector?.ownerKind === "workflow-work-item";
    if (exact && environment) return { ...await this.getStatus(workspaceRoot, selector), failureReason: "Environment resolution is not available in exact Workflow WorkItem execution." };
    const sessionKey = exact ? exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId) : workspaceKey(workspaceRoot);
    const active = (exact ? this.exactSessionsByOwner : this.sessionsByWorkspaceRoot).get(sessionKey);
    if (active?.state === "running") {
      const context = await this.resolvePreflightContext(workspaceRoot, selector);
      if (!(context instanceof Error) && !sameExecutionContext(active, context)) return busyModelForDifferentContext(context, active);
      return { ...await this.getStatus(workspaceRoot, selector), failureReason: "Codex execution is already running for this workspace.", canRunAgain: false, retryBlocker: "Codex execution is already running for this workspace." };
    }
    let lease;
    try { lease = exact ? this.runtimeManager.acquireConcurrentExact(selection) : this.runtimeManager.acquire(selection); }
    catch (error) { return unavailableFromPreflight(error instanceof Error ? error : new Error(String(error))); }
    try {
      const result = environment
        ? await this.startEnvironmentSelected(workspaceRoot, selector, lease.selection)
        : await this.startSelected(workspaceRoot, selector, lease.selection);
      const session = (exact ? this.exactSessionsByOwner : this.sessionsByWorkspaceRoot).get(sessionKey);
      if (session?.state === "running" && session.executionPromise) {
        void session.executionPromise.then(lease.release, lease.release);
      } else lease.release();
      return result;
    } catch (error) { lease.release(); throw error; }
  }

  private async startSelected(workspaceRoot: string, selector: CodexExecutionSelector | undefined, selection: CodexModelSelection): Promise<CodexImplementerExecutionModel> {
    if (selector?.ownerKind === "workflow-work-item") return this.startWorkflowWorkItemSelected(workspaceRoot, selector, selection);
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    const context = await this.resolvePreflightContext(workspaceRoot, selector);
    if (context instanceof Error) {
      if (active) {
        return modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: context.message,
        });
      }
      return unavailableFromPreflight(context);
    }
    if (active?.state === "running") {
      if (sameExecutionContext(active, context)) {
        active.failureReason = "Codex execution is already running for this workspace.";
        return modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        });
      }
      return busyModelForDifferentContext(context, active);
    }

    const preflightCacheKey = preflightKey(context);
    const checkingPreflight: DevelopmentEnvironmentPreflightResult = {
      state: "checking",
      summary: "Preparing development environment...",
      retryAllowed: false,
      requirements: [],
      evidenceMarkdown: "Development environment preflight evidence:\n- Final state: checking",
    };
    this.preflightByWorkspaceRoot.set(preflightCacheKey, checkingPreflight);
    let developmentEnvironmentPreflight: DevelopmentEnvironmentPreflightResult;
    try {
      const provisioningPreflight: DevelopmentEnvironmentPreflightResult = {
        state: "provisioning",
        summary: "Installing required development tools...",
        retryAllowed: false,
        requirements: [],
        evidenceMarkdown: "Development environment preflight evidence:\n- Final state: provisioning",
      };
      this.preflightByWorkspaceRoot.set(preflightCacheKey, provisioningPreflight);
      developmentEnvironmentPreflight = await this.preflightService.runPreflight({
        workspaceRoot: context.projectRoot,
        formalWorkCardPath: context.formalWorkCardPath!,
      });
      this.preflightByWorkspaceRoot.set(preflightCacheKey, developmentEnvironmentPreflight);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const blockedPreflight: DevelopmentEnvironmentPreflightResult = {
        state: "blocked",
        summary: message,
        retryAllowed: false,
        requirements: [],
        evidenceMarkdown: [
          "Development environment preflight evidence:",
          "- Final state: blocked",
          `- Summary: ${message}`,
        ].join("\n"),
      };
      this.preflightByWorkspaceRoot.set(preflightCacheKey, blockedPreflight);
      return unavailableModelFromContext(
        { ...context, developmentEnvironmentPreflight: blockedPreflight },
        blockedPreflight.summary,
      );
    }
    if (
      developmentEnvironmentPreflight.state !== "ready" &&
      developmentEnvironmentPreflight.state !== "not-required"
    ) {
      return unavailableModelFromPreflightResult(
        { ...context, developmentEnvironmentPreflight },
        developmentEnvironmentPreflight,
      );
    }

    if (context.ownerKind === "routed-development") {
      const current = await this.resolvePreflightContext(workspaceRoot, selector);
      if (current instanceof Error || !sameExecutionContext(context, current)) return unavailableFromPreflight(current instanceof Error ? current : Error("Routed implementation context changed during preflight."));
    }
    let appServer: CodexAppServerExecutionAdapter;
    try {
      appServer = await this.appServerFactory();
    } catch (error) {
      const retryBlocker = messageForCodexFailure(error);
      if (active) {
        return modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker,
        });
      }
      return unavailableModelFromContext(
        { ...context, developmentEnvironmentPreflight },
        retryBlocker,
      );
    }

    const executionPolicy = this.policyResolver({
      executionKind: "work-card-implementation",
      workspaceRoot: context.projectRoot,
    });
    const abortController = new AbortController();
    const session: SessionRecord = {
      ...context,
      selection,
      developmentEnvironmentPreflight,
      executionKind: "work-card-implementation",
      executionPolicy,
      state: "running",
      startedAt: this.now(),
      completedAt: null,
      eventTail: [],
      stderrTail: [],
      finalResponseTail: [],
      approvalTail: [],
      runtimeDenialTail: [],
      runtimeState: appServer.getRuntimeState?.() ?? null,
      pendingApproval: null,
      pendingUserInput: null,
      pendingMcpElicitation: null,
      failureReason: null,
      reportUpdated: false,
      reportSha256After: null,
      abortController,
      threadAdapter: null,
      appServerAdapter: appServer,
      executionPromise: null,
      cancellationRequested: false,
    };
    this.sessionsByWorkspaceRoot.set(key, session);
    try { if (session.ownerKind !== "workflow-work-item") session.checkpointCapture = await captureWorkItemCheckpoint(session.projectRoot, session); }
    catch { session.checkpoint = { status: "blocked", message: "Source checkpoint capture failed; implementation may continue, but Git state will be preserved for inspection.", remote: "not-requested", receipts: [] }; }
    if (session.ownerKind === "routed-development" && (!session.checkpointCapture || session.checkpointCapture.contractSha256 !== session.formalWorkCardSha256)) {
      session.state = "failed"; session.completedAt = this.now(); session.failureReason = "Current routed source checkpoint context could not be captured; refresh the Work Item before implementation.";
      await session.appServerAdapter?.dispose?.();
      return modelFromSession(session, this.now(), { canRunAgain: false, retryBlocker: session.failureReason });
    }
    session.executionPromise = this.executeWithAppServer(session, appServer);
    void session.executionPromise;
    return modelFromSession(session, this.now(), {
      canRunAgain: false,
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  private async resolveWorkflowWorkItemContext(workspaceRoot: string, selector: Extract<CodexExecutionSelector, { ownerKind: "workflow-work-item" }>, prepareSource = false): Promise<ExecutionContext | Error> {
    try {
      if (!selector || Object.keys(selector).sort().join("|") !== ["ownerKind", "workflowId", "workItemId"].sort().join("|") ||
        typeof selector.workflowId !== "string" || typeof selector.workItemId !== "string" || !selector.workflowId.trim() || !selector.workItemId.trim())
        throw Error("Exact workflowId and workItemId are required; source mutation options are not accepted by this execution mode.");
      const projectRoot = fs.realpathSync(path.resolve(workspaceRoot));
      const initialKernel = this.workflowExecutionServiceFactory();
      const projection = await initialKernel.getExecutionProjection(projectRoot, selector.workflowId);
      let contract: WorkItemExecutionContract;
      let sourceBacked: NonNullable<NonNullable<ExecutionContext["workflowWorkItem"]>["sourceBacked"]> | undefined;
      if (projection.source.state === "non-source") {
        contract = await initialKernel.createSourceNeutralWorkItemExecutionContract(projectRoot, selector.workflowId, selector.workItemId,
          { affectedPaths: [], proofIntent: ["Return semantic completion for the exact accepted WorkItem contract."] });
      } else {
        const projectId = projection.projectId;
        const kernel = this.workflowKernel(projectRoot, projectId);
        const preparation = prepareSource
          ? await kernel.prepareExecution(projectRoot, selector.workflowId, { sourceMutating: true })
          : { state: projection.source.state, currentRevisionId: projection.source.currentRevisionId };
        if (preparation.state !== "ready" || !preparation.sourceBinding || !preparation.repositoryCheckout)
          throw Error(preparation.failureCode ?? "Source-backed Workflow checkout is not prepared and verified.");
        contract = await kernel.createWorkItemExecutionContract(projectRoot, selector.workflowId, selector.workItemId,
          { sourceMutation: "required", affectedPaths: [], proofIntent: ["Return semantic completion for the exact accepted WorkItem contract."] });
        const binding = preparation.sourceBinding;
        const checkout = preparation.repositoryCheckout;
        const managed = resolveManagedWorkflowCheckoutPath(projectRoot, checkout.workflowId ?? selector.workflowId);
        const checkoutRoot = fs.realpathSync(managed.checkoutRoot);
        const gitTop = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "--show-toplevel"] })).stdout.trim();
        const actualGitRoot = fs.realpathSync(gitTop);
        const branch = (await runBoundedGit({ cwd: checkoutRoot, args: ["branch", "--show-current"] })).stdout.trim();
        const head = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "HEAD"] })).stdout.trim();
        const common = (await runBoundedGit({ cwd: checkoutRoot, args: ["rev-parse", "--git-common-dir"] })).stdout.trim();
        const devRoot = path.resolve(projectRoot, "Dev");
        const devCommon = (await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--git-common-dir"] })).stdout.trim();
        const dirty = (await runBoundedGit({ cwd: checkoutRoot, args: ["status", "--porcelain", "--untracked-files=all"] })).stdout;
        const checkoutMismatches = [
          checkout.role !== "workflow" && "checkout-role",
          checkout.repositoryCheckoutId !== binding.body.repositoryCheckoutId && "checkout-id-binding",
          checkout.sourceLineId !== binding.body.workSourceLineId && "source-line-binding",
          checkout.sourceLineId !== workflowSourceLineName(checkout.workflowId ?? selector.workflowId) && "source-line-workflow",
          checkout.repositoryCheckoutId !== workflowRepositoryCheckoutId(checkout.workflowId ?? selector.workflowId) && "checkout-id-workflow",
          checkout.projectRelativePath !== managed.projectRelativePath && "managed-path",
          binding.body.preparationState !== "ready" && "binding-state",
          binding.body.currentRevisionId !== contract.sourceRevisionId && "binding-revision",
          preparation.currentRevisionId !== contract.sourceRevisionId && "contract-revision",
          actualGitRoot !== checkoutRoot && "git-root",
          branch !== checkout.sourceLineId && "branch",
          head !== contract.sourceRevisionId && "head",
          path.resolve(checkoutRoot, common) !== path.resolve(devRoot, devCommon) && "repository",
          Boolean(dirty) && "dirty-checkout",
        ].filter((value): value is string => typeof value === "string");
        if (checkoutMismatches.length) throw Error(`Prepared Workflow checkout failed exact binding verification (${checkoutMismatches.join(", ")}).`);
        sourceBacked = { checkoutRoot, repositoryCheckoutId: checkout.repositoryCheckoutId, sourceLineId: checkout.sourceLineId,
          expectedRevisionId: contract.sourceRevisionId!, attributablePaths: [] };
      }
      if (contract.sourceMutation === "not-required" && contract.sourceRevisionId !== null || contract.sourceMutation === "required" && !contract.sourceRevisionId)
        throw Error("Exact Codex WorkItem source contract is inconsistent with its Workflow source state.");
      return {
        ownerKind: "workflow-work-item", phaseId: contract.phase?.id ?? null, workCardId: contract.workItemId, workCardTitle: contract.objective,
        projectRoot, currentProjectRoot: projectRoot, executionRoot: sourceBacked?.checkoutRoot ?? projectRoot,
        projectId: contract.projectId, workflowId: contract.workflowId, workItemId: contract.workItemId,
        workItemVersion: contract.workItemVersion, executionContract: contract, executionContractDigest: contract.digest,
        sourceMode: sourceBacked ? "source-backed" : "source-neutral",
        developmentEnvironmentPreflight: null,
        workflowWorkItem: { workflowId: contract.workflowId, workItemId: contract.workItemId, contract, ...(sourceBacked ? { sourceBacked } : {}) },
      };
    } catch (error) { return error instanceof Error ? error : Error(String(error)); }
  }

  private async getWorkflowWorkItemStatus(workspaceRoot: string, selector: Extract<CodexExecutionSelector, { ownerKind: "workflow-work-item" }>): Promise<CodexImplementerExecutionModel> {
    const active = this.exactSessionsByOwner.get(exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId));
    if (active?.workflowWorkItem?.workflowId === selector.workflowId && active.workflowWorkItem.workItemId === selector.workItemId) {
      const recovery = await this.workflowExecutionServiceFactory().getCheckpointRecoveryProjection(workspaceRoot, selector.workflowId, selector.workItemId).catch(() => null);
      const checkpointRecoveryRequired = recovery?.implementation.retryable === true || recovery?.implementation.state === "blocked" || recovery?.implementation.state === "inspection-required" || recovery?.implementation.state === "pending";
      const canRunAgain = !checkpointRecoveryRequired && (active.state === "failed" || active.state === "cancelled" || active.workflowWorkItem.resultOutcome === "partial" || active.workflowWorkItem.resultOutcome === "failed");
      return modelFromSession(active, this.now(), { canRunAgain, retryBlocker: checkpointRecoveryRequired
        ? "Semantic implementation attempt is complete; recover its exact durable SourceCheckpoint instead of rerunning Implementer."
        : canRunAgain ? null : "Refresh the exact WorkItem state before another implementation attempt." });
    }
    const context = await this.resolveWorkflowWorkItemContext(workspaceRoot, selector);
    if (context instanceof Error) {
      const recovery = await this.workflowExecutionServiceFactory().getCheckpointRecoveryProjection(workspaceRoot, selector.workflowId, selector.workItemId).catch(() => null);
      if (recovery?.implementation.state === "pending" || recovery?.implementation.state === "blocked" || recovery?.implementation.state === "inspection-required")
        return { ...unavailableFromPreflight(new Error("Semantic implementation attempt is complete; recover its exact durable SourceCheckpoint instead of rerunning Implementer.")),
          canRunAgain: false, retryBlocker: recovery.implementation.reason ?? "Exact SourceCheckpoint recovery is required.", lastRunState: "completed",
          workflowId: selector.workflowId, workItemId: selector.workItemId, sourceMode: recovery.sourceMode };
      return unavailableFromPreflight(context);
    }
    return readyModel(context);
  }

  private async startWorkflowWorkItemSelected(workspaceRoot: string, selector: Extract<CodexExecutionSelector, { ownerKind: "workflow-work-item" }>, selection: CodexModelSelection): Promise<CodexImplementerExecutionModel> {
    const key = exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId);
    const active = this.exactSessionsByOwner.get(key);
    if (active?.state === "running") {
      if (active.workflowWorkItem?.workflowId === selector.workflowId && active.workflowWorkItem.workItemId === selector.workItemId) {
        return modelFromSession(active, this.now(), { canRunAgain: false, retryBlocker: "Codex execution is already running for this WorkItem." });
      }
      const requested = await this.resolveWorkflowWorkItemContext(workspaceRoot, selector);
      return requested instanceof Error ? unavailableFromPreflight(requested) : busyModelForDifferentContext(requested, active);
    }
    const context = await this.resolveWorkflowWorkItemContext(workspaceRoot, selector, true);
    if (context instanceof Error) return unavailableFromPreflight(context);
    const exact = context.workflowWorkItem!;
    const executionRef = crypto.randomUUID();
    const runtimeDirectory = path.join(context.projectRoot, ".champcity", "runtime");
    const workerDirectory = exact.sourceBacked?.checkoutRoot ?? path.join(runtimeDirectory, "work-item-workers", executionRef);
    const leaseResource = workflowExecutionLeaseKey(exact.sourceBacked ? "source-backed" : "source-neutral", exact.sourceBacked?.checkoutRoot ?? workerDirectory);
    const executionLease = acquireWorkflowExecutionLease(leaseResource, `implementer:${exact.workflowId}:${exact.workItemId}`, this.now());
    if (!executionLease) return unavailableModelFromContext(context, "Another source-mutating role owns this exact Workflow checkout.");
    const evidenceDirectory = path.join(runtimeDirectory, "work-item-attempts");
    const evidencePacketPath = path.join(evidenceDirectory, `${executionRef}.json`);
    const startedAt = this.now();
    const kernel = this.workflowExecutionServiceFactory();
    try {
      await kernel.beginWorkItemAttempt(context.projectRoot, exact.workflowId, exact.workItemId, exact.contract.workItemVersion, executionRef);
    } catch (error) { executionLease.release(); return unavailableModelFromContext(context, error instanceof Error ? error.message : String(error)); }
    exact.executionRef = executionRef;
    exact.workerDirectory = workerDirectory;
    exact.evidencePacketPath = evidencePacketPath;
    if (context.ownerKind === "workflow-work-item") {
      context.executionRoot = workerDirectory;
      context.attemptEvidenceIdentity = executionRef;
    }
    try {
      ensureRuntimeDirectory(context.projectRoot, runtimeDirectory, exact.sourceBacked ? undefined : workerDirectory);
      let appServer: CodexAppServerExecutionAdapter;
      try { appServer = await this.appServerFactory(); }
      catch (error) {
        const message = messageForCodexFailure(error);
        await this.persistAndFinishWorkflowAttempt(context, selection, startedAt, { summary: "Codex App Server could not start.", deviations: [], blockers: [message], residualRisks: [], outcome: "failed" });
        executionLease.release();
        return unavailableModelFromContext(context, message);
      }
      const executionPolicy = this.policyResolver({ executionKind: "workflow-work-item-implementation", workspaceRoot: workerDirectory });
      const session: SessionRecord = {
        ...context, selection, executionKind: "workflow-work-item-implementation", executionPolicy, state: "running", startedAt, completedAt: null,
        eventTail: [], stderrTail: [], finalResponseTail: [], approvalTail: [], runtimeDenialTail: [],
        runtimeState: appServer.getRuntimeState?.() ?? null, pendingApproval: null, pendingUserInput: null, pendingMcpElicitation: null,
        failureReason: null, reportUpdated: false, reportSha256After: null, abortController: new AbortController(), threadAdapter: null,
        appServerAdapter: appServer, executionPromise: null, cancellationRequested: false,
        checkpoint: exact.sourceBacked
          ? { status: "blocked", message: "Source-backed checkpoint is pending validated completion.", remote: "not-requested", receipts: [] }
          : { status: "not-required", message: "Source-neutral WorkItem execution does not create a SourceCheckpoint.", remote: "not-requested", receipts: [] },
      };
      this.exactSessionsByOwner.set(key, session);
      session.executionPromise = this.executeWithAppServer(session, appServer);
      const renewLease = setInterval(executionLease.renew, 60_000); renewLease.unref?.();
      void session.executionPromise.finally(() => { clearInterval(renewLease); executionLease.release(); });
      void session.executionPromise;
      return modelFromSession(session, this.now(), { canRunAgain: false, retryBlocker: "Codex execution is already running for this WorkItem." });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.persistAndFinishWorkflowAttempt(context, selection, startedAt, { summary: "Source-neutral Codex setup failed.", deviations: [], blockers: [message], residualRisks: [], outcome: "failed" }).catch(() => undefined);
      executionLease.release();
      return unavailableModelFromContext(context, message);
    }
  }

  private async persistAndFinishWorkflowAttempt(context: ExecutionContext, selection: CodexModelSelection | undefined, startedAt: number,
    result: { summary: string; deviations: string[]; blockers: string[]; residualRisks: string[]; outcome: "implemented" | "partial" | "blocked" | "failed" | "abandoned" }): Promise<import("../../shared/projectState/domainContracts").ProjectStateRecord<"ImplementationRecord">> {
    const exact = context.workflowWorkItem;
    if (!exact?.executionRef || !exact.evidencePacketPath || !exact.workerDirectory) throw Error("Exact WorkItem attempt evidence identity is incomplete.");
    const boundedAttributablePaths = exact.sourceBacked ? [...new Set(exact.sourceBacked.attributablePaths)].sort() : [];
    const sourceCheckpointAttempt = exact.sourceBacked && result.outcome === "implemented" && boundedAttributablePaths.length > 0 && boundedAttributablePaths.length <= 256
      ? { repositoryCheckoutId: exact.sourceBacked.repositoryCheckoutId, sourceLineId: exact.sourceBacked.sourceLineId,
        expectedRevisionId: exact.sourceBacked.expectedRevisionId, attributablePaths: boundedAttributablePaths }
      : undefined;
    const packet = { schemaVersion: 1, projectId: exact.contract.projectId, workflowId: exact.workflowId, workItemId: exact.workItemId,
      executionRef: exact.executionRef, contractDigest: exact.contract.digest, startedAt: new Date(startedAt).toISOString(), completedAt: new Date(this.now()).toISOString(),
      model: selection?.model ?? null, reasoningEffort: selection?.reasoningEffort ?? null, result, ...(sourceCheckpointAttempt ? { sourceCheckpointAttempt } : {}) };
    const bytes = Buffer.from(JSON.stringify(packet));
    if (bytes.length > 48 * 1024) throw Error("Source-neutral WorkItem attempt evidence exceeds its bounded size.");
    const runtimeRoot = fs.realpathSync(path.join(context.projectRoot, ".champcity", "runtime"));
    const packetParent = path.dirname(exact.evidencePacketPath);
    fs.mkdirSync(packetParent, { recursive: true });
    const packetDirectory = fs.realpathSync(path.dirname(exact.evidencePacketPath));
    if (!packetDirectory.toLowerCase().startsWith(`${runtimeRoot.toLowerCase()}${path.sep.toLowerCase()}`)) throw Error("Attempt evidence escaped the Current Project runtime directory.");
    fs.writeFileSync(exact.evidencePacketPath, bytes, { flag: "wx" });
    return this.workflowExecutionServiceFactory().finishWorkItemAttempt(context.projectRoot, exact.workflowId, exact.workItemId, exact.executionRef, result);
  }

  async startEnvironmentResolution(workspaceRoot: string, selector?: CodexExecutionSelector): Promise<CodexImplementerExecutionModel> {
    return this.startWithSelection(workspaceRoot, selector, this.runtimeManager.getStatus().selection ?? undefined, true);
  }

  private async startEnvironmentSelected(workspaceRoot: string, selector: CodexExecutionSelector | undefined, selection: CodexModelSelection): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    const context = await this.resolvePreflightContext(workspaceRoot, selector);
    if (context instanceof Error) {
      return unavailableFromPreflight(context);
    }
    if (active?.state === "running") {
      if (sameExecutionContext(active, context)) {
        active.failureReason = "Codex execution is already running for this workspace.";
        return modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        });
      }
      return busyModelForDifferentContext(context, active);
    }

    const preflightCacheKey = preflightKey(context);
    let preflight = this.preflightByWorkspaceRoot.get(preflightCacheKey) ?? null;
    if (!preflight || preflight.state !== "resolution-required") {
      preflight = await this.preflightService.runPreflight({
        workspaceRoot: context.projectRoot,
        formalWorkCardPath: context.formalWorkCardPath!,
      });
      this.preflightByWorkspaceRoot.set(preflightCacheKey, preflight);
    }
    if (preflight.state !== "resolution-required") {
      return unavailableModelFromPreflightResult(
        { ...context, developmentEnvironmentPreflight: preflight },
        preflight,
      );
    }

    let appServer: CodexAppServerExecutionAdapter;
    try {
      appServer = await this.appServerFactory();
    } catch (error) {
      return unavailableModelFromContext(
        { ...context, developmentEnvironmentPreflight: preflight },
        messageForCodexFailure(error),
      );
    }

    const executionPolicy = this.policyResolver({
      executionKind: "environment-resolution",
      workspaceRoot: context.projectRoot,
    });
    const abortController = new AbortController();
    const session: SessionRecord = {
      ...context,
      selection,
      developmentEnvironmentPreflight: preflight,
      executionKind: "environment-resolution",
      executionPolicy,
      state: "running",
      startedAt: this.now(),
      completedAt: null,
      eventTail: [],
      stderrTail: [],
      finalResponseTail: [],
      approvalTail: [],
      runtimeDenialTail: [],
      runtimeState: appServer.getRuntimeState?.() ?? null,
      pendingApproval: null,
      pendingUserInput: null,
      pendingMcpElicitation: null,
      failureReason: null,
      reportUpdated: false,
      reportSha256After: null,
      abortController,
      threadAdapter: null,
      appServerAdapter: appServer,
      executionPromise: null,
      cancellationRequested: false,
    };
    this.sessionsByWorkspaceRoot.set(key, session);
    session.executionPromise = this.executeWithAppServer(session, appServer);
    void session.executionPromise;
    return modelFromSession(session, this.now(), {
      canRunAgain: false,
      retryBlocker: "Environment resolution is already running for this workspace.",
    });
  }

  async respondToUserInput(
    workspaceRoot: string,
    requestId: string,
    answers: Record<string, string[]>,
    selector?: CodexExecutionSelector,
  ): Promise<CodexImplementerExecutionModel> {
    const exact = selector?.ownerKind === "workflow-work-item";
    const key = exact ? exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId) : workspaceKey(workspaceRoot);
    const active = (exact ? this.exactSessionsByOwner : this.sessionsByWorkspaceRoot).get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot, selector);
      return {
        ...status,
        failureReason: "No Codex execution is waiting for user input in the selected workspace.",
      };
    }
    if (!active.pendingUserInput || active.pendingUserInput.requestId !== requestId) {
      return {
        ...modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        }),
        failureReason: "The Codex user input request is no longer pending for this run.",
      };
    }
    const responder = active.threadAdapter?.respondToUserInput;
    if (!responder) {
      active.failureReason = "Current Codex runtime does not support responding to request_user_input.";
      return modelFromSession(active, this.now(), {
        canRunAgain: false,
        retryBlocker: "Codex execution is already running for this workspace.",
      });
    }
    await responder.call(active.threadAdapter, requestId, answers);
    appendTail(active.eventTail, `request_user_input.answered ${requestId}`);
    active.pendingUserInput = null;
    return modelFromSession(active, this.now(), {
      canRunAgain: false,
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  async respondToApproval(
    workspaceRoot: string,
    requestId: string,
    decision: CodexApprovalResponse["decision"],
    selector?: CodexExecutionSelector,
  ): Promise<CodexImplementerExecutionModel> {
    const exact = selector?.ownerKind === "workflow-work-item";
    const key = exact ? exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId) : workspaceKey(workspaceRoot);
    const active = (exact ? this.exactSessionsByOwner : this.sessionsByWorkspaceRoot).get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot, selector);
      return {
        ...status,
        failureReason: "No Codex execution is waiting for approval in the selected workspace.",
      };
    }
    if (!active.pendingApproval || active.pendingApproval.requestId !== requestId) {
      return {
        ...modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        }),
        failureReason: "The Codex approval request is no longer pending for this run.",
      };
    }
    const responder = active.threadAdapter?.respondToApproval;
    if (!responder) {
      active.failureReason = "Current Codex runtime does not support responding to approval requests.";
      return modelFromSession(active, this.now(), {
        canRunAgain: false,
        retryBlocker: "Codex execution is already running for this workspace.",
      });
    }
    await responder.call(active.threadAdapter, requestId, { decision });
    appendTail(active.eventTail, `approval.${decision}.answered ${requestId}`);
    active.pendingApproval = null;
    return modelFromSession(active, this.now(), {
      canRunAgain: false,
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  async respondToMcpElicitation(
    workspaceRoot: string,
    requestId: string,
    response: Omit<CodexMcpElicitationResponse, "requestId">,
    selector?: CodexExecutionSelector,
  ): Promise<CodexImplementerExecutionModel> {
    const exact = selector?.ownerKind === "workflow-work-item";
    const key = exact ? exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId) : workspaceKey(workspaceRoot);
    const active = (exact ? this.exactSessionsByOwner : this.sessionsByWorkspaceRoot).get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot, selector);
      return {
        ...status,
        failureReason: "No Codex execution is waiting for MCP elicitation input in the selected workspace.",
      };
    }
    if (!active.pendingMcpElicitation || active.pendingMcpElicitation.requestId !== requestId) {
      return {
        ...modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        }),
        failureReason: "The Codex MCP elicitation request is no longer pending for this run.",
      };
    }
    const responder = active.threadAdapter?.respondToMcpElicitation;
    if (!responder) {
      active.failureReason = "Current Codex runtime does not support responding to MCP elicitation input.";
      return modelFromSession(active, this.now(), {
        canRunAgain: false,
        retryBlocker: "Codex execution is already running for this workspace.",
      });
    }
    await responder.call(active.threadAdapter, requestId, response);
    appendTail(active.eventTail, `mcp_elicitation.answered ${requestId}`);
    active.pendingMcpElicitation = null;
    return modelFromSession(active, this.now(), {
      canRunAgain: false,
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  async cancel(workspaceRoot: string, selector?: CodexExecutionSelector): Promise<CodexImplementerExecutionModel> {
    const exact = selector?.ownerKind === "workflow-work-item";
    const key = exact ? exactExecutionOwnerKey(workspaceRoot, selector.workflowId, selector.workItemId) : workspaceKey(workspaceRoot);
    const active = (exact ? this.exactSessionsByOwner : this.sessionsByWorkspaceRoot).get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot, selector);
      return {
        ...status,
        failureReason: "No Codex execution is running for the selected workspace.",
      };
    }

    active.cancellationRequested = true;
    active.failureReason = "Codex cancellation requested.";
    active.abortController?.abort();
    void active.threadAdapter?.interrupt?.().catch(() => undefined);
    appendTail(active.eventTail, "cancel.requested");
    return modelFromSession(active, this.now(), {
      canRunAgain: false,
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  async shutdownActiveExecutions(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }
    this.shutdownPromise = this.shutdownActiveExecutionsOnce().finally(() => {
      this.shutdownPromise = null;
    });
    return this.shutdownPromise;
  }

  private async shutdownActiveExecutionsOnce(): Promise<void> {
    const runningSessions = [...this.sessionsByWorkspaceRoot.values(), ...this.exactSessionsByOwner.values()]
      .filter((session) => session.state === "running");
    await Promise.all(runningSessions.map(async (session) => {
      session.cancellationRequested = true;
      session.failureReason = "Codex execution was cancelled by application shutdown.";
      session.abortController?.abort();
      appendTail(session.eventTail, "app-server.shutdown requested");
      await session.threadAdapter?.interrupt?.().catch(() => undefined);
      await session.appServerAdapter?.dispose?.().catch((error) => {
        appendTail(session.stderrTail, messageForCodexFailure(error));
      });
    }));
    await Promise.all(runningSessions.map((session) =>
      waitForSessionCompletion(session.executionPromise, 500),
    ));
  }

  private async executeWithAppServer(session: SessionRecord, appServer: CodexAppServerExecutionAdapter): Promise<void> {
    const prompt = session.workflowWorkItem
      ? buildWorkflowWorkItemCodexPrompt(session.workflowWorkItem.contract, session.workflowWorkItem.executionRef!, session.workflowWorkItem.sourceBacked?.checkoutRoot)
      : session.executionKind === "environment-resolution"
      ? buildCodexEnvironmentResolutionPrompt(session)
      : buildCodexImplementerPrompt(session);
    let terminalState: CodexImplementerExecutionState = "failed";
    let terminalFailureReason: string | null = "Codex execution failed.";
    let thread: CodexThreadAdapter | null = null;
    try {
      thread = appServer.startThread({
        workingDirectory: session.workflowWorkItem?.workerDirectory ?? session.projectRoot,
        model: session.selection?.model,
        reasoningEffort: session.selection?.reasoningEffort,
        skipGitRepoCheck: true,
        ...threadOptionsFromCodexImplementerPolicy(session.executionPolicy),
        writableRoots: session.executionPolicy.sandboxMode === "workspace-write"
          ? [session.workflowWorkItem?.workerDirectory ?? session.projectRoot]
          : undefined,
      });
      session.threadAdapter = thread;
      session.runtimeState = appServer.getRuntimeState?.() ?? session.runtimeState;
      appendTail(session.eventTail, "app-server.thread.start requested");
      const streamed = await thread.runStreamed(prompt, {
        signal: session.abortController?.signal,
      });
      session.runtimeState = appServer.getRuntimeState?.() ?? session.runtimeState;
      for await (const event of streamed.events) {
        appendTail(session.eventTail, summarizeEvent(event));
        if (event.type === "item.completed" && event.item.type === "file_change" && session.workflowWorkItem?.sourceBacked) {
          try {
            observeExactWorkflowCheckoutChanges(session.workflowWorkItem.sourceBacked, event.item.changes);
            const allowed = session.workflowWorkItem.contract.affectedPaths;
            for (const changed of session.workflowWorkItem.sourceBacked.attributablePaths) {
              const normalized = changed.replace(/\\/g, "/").replace(/^\.\//, "");
              if (!allowed.some(scope => normalized === scope || normalized.startsWith(`${scope.replace(/\/$/, "")}/`))) throw Error(`Observed path is outside the accepted Architect scope: ${normalized}`);
            }
          }
          catch (error) { session.workflowWorkItem.sourceBacked.attributionFailure ??= messageForCodexFailure(error); }
        }
        if (event.type === "item.completed" && event.item.type === "file_change" && session.checkpointCapture) {
          try {
            if (!Array.isArray(event.item.changes)) throw Error("Missing change evidence.");
            observeCheckpointChanges(session.projectRoot, session.checkpointCapture, event.item.changes);
          }
          catch { session.checkpoint = { status: "blocked", message: "Worker file-change attribution is incomplete; source checkpoint requires inspection.", remote: "not-requested", receipts: [] }; }
        }
        if (event.type === "item.completed" && event.item.type === "agent_message") {
          appendTail(session.finalResponseTail, String(event.item.text));
        }
        if (event.type === "approval.completed" || event.type === "approval.requested") {
          if (event.type === "approval.completed") {
            session.approvalTail.push(event.approval);
            while (session.approvalTail.length > maxTailItems) {
              session.approvalTail.shift();
            }
            if (session.pendingApproval?.requestId === event.approval.requestId) {
              session.pendingApproval = null;
            }
          } else {
            session.pendingApproval = event.approval;
          }
        }
        if (event.type === "runtime.denial") {
          appendTail(session.runtimeDenialTail, event.message);
        }
        if (event.type === "runtime.stderr") {
          appendTail(session.stderrTail, event.message);
        }
        if (event.type === "user_input.requested") {
          session.pendingUserInput = event.request;
        }
        if (event.type === "mcp_elicitation.requested") {
          session.pendingMcpElicitation = event.request;
        }
        if (event.type === "turn.failed") {
          throw new Error(event.error.message);
        }
        if (event.type === "error") {
          throw new Error(event.message);
        }
      }
      if (session.cancellationRequested || session.abortController?.signal.aborted) {
        terminalState = "cancelled";
        terminalFailureReason = "Codex execution was cancelled.";
      } else {
        terminalState = "completed";
        terminalFailureReason = null;
      }
    } catch (error) {
      if (session.cancellationRequested || session.abortController?.signal.aborted) {
        terminalState = "cancelled";
        terminalFailureReason = "Codex execution was cancelled.";
      } else {
        terminalState = "failed";
        const message = messageForCodexFailure(error);
        terminalFailureReason = message;
        appendTail(session.stderrTail, message);
      }
    } finally {
      session.abortController = null;
      session.pendingApproval = null;
      session.pendingUserInput = null;
      session.pendingMcpElicitation = null;
      session.runtimeState = appServer.getRuntimeState?.() ?? session.runtimeState;
      session.threadAdapter = null;
      session.appServerAdapter = null;
      await thread?.dispose?.();
      await appServer.dispose?.();
      session.failureReason = terminalFailureReason;
      if (session.executionKind === "environment-resolution" && terminalState === "completed") {
        try {
          appendTail(session.eventTail, "environment-resolution.parent-environment-refresh requested");
          const refresh = await this.parentEnvironmentRefresh();
          appendTail(
            session.eventTail,
            `environment-resolution.parent-environment-refresh.${refresh.refreshed ? "succeeded" : "not-required"} ${refresh.summary}`,
          );
          appendTail(session.eventTail, "environment-resolution.preflight.rerun requested");
          const rerun = await this.preflightService.runPreflight({
            workspaceRoot: session.projectRoot,
            formalWorkCardPath: session.formalWorkCardPath!,
          });
          this.preflightByWorkspaceRoot.set(preflightKey(session), rerun);
          session.developmentEnvironmentPreflight = rerun;
          appendTail(session.eventTail, `environment-resolution.preflight.${rerun.state}`);
        } catch (error) {
          const message = `Parent process environment refresh failed before deterministic preflight rerun: ${messageForCodexFailure(error)}`;
          terminalState = "failed";
          session.failureReason = message;
          terminalFailureReason = message;
          appendTail(session.stderrTail, message);
          appendTail(session.eventTail, "environment-resolution.parent-environment-refresh.failed");
          const failedRefreshPreflight = environmentRefreshFailurePreflight(
            session.developmentEnvironmentPreflight,
            message,
          );
          this.preflightByWorkspaceRoot.set(preflightKey(session), failedRefreshPreflight);
          session.developmentEnvironmentPreflight = failedRefreshPreflight;
        }
      }
      if (session.workflowWorkItem) {
        const parsed = terminalState === "completed" ? parseWorkflowWorkItemCompletion(session.finalResponseTail.at(-1) ?? "") : null;
        const result = parsed ?? (terminalState === "cancelled"
          ? { summary: "Codex execution was cancelled.", deviations: [], blockers: ["Execution cancelled before a semantic result was returned."], residualRisks: [], outcome: "abandoned" as const }
          : { summary: "Codex execution did not produce a valid semantic completion.", deviations: [], blockers: [terminalFailureReason ?? "Codex execution failed."], residualRisks: [], outcome: "failed" as const });
        let finalizedResult = result;
        const sourceAttempt = session.workflowWorkItem.sourceBacked;
        const scopeViolated = Boolean(sourceAttempt?.attributionFailure || (sourceAttempt && sourceAttempt.attributablePaths.some(file =>
          !session.workflowWorkItem!.contract.affectedPaths.some(allowed => file === allowed || file.startsWith(`${allowed.replace(/\/$/, "")}/`)))));
        let scopeRestored = false;
        if (scopeViolated && sourceAttempt) {
          try {
            const checkout = fs.realpathSync(sourceAttempt.checkoutRoot);
            const top = path.resolve((await runBoundedGit({ cwd: checkout, args: ["rev-parse", "--show-toplevel"] })).stdout.trim());
            const head = (await runBoundedGit({ cwd: checkout, args: ["rev-parse", "HEAD"] })).stdout.trim();
            const managed = resolveManagedWorkflowCheckoutPath(session.projectRoot, session.workflowWorkItem.workflowId);
            const devRoot = resolveManagedProjectSourceTopology(session.projectRoot).devCheckoutRoot;
            const common = path.resolve(checkout, (await runBoundedGit({ cwd: checkout, args: ["rev-parse", "--git-common-dir"] })).stdout.trim());
            const devCommon = path.resolve(devRoot, (await runBoundedGit({ cwd: devRoot, args: ["rev-parse", "--git-common-dir"] })).stdout.trim());
            const branch = (await runBoundedGit({ cwd: checkout, args: ["branch", "--show-current"] })).stdout.trim();
            if (top !== checkout || checkout !== fs.realpathSync(managed.checkoutRoot) || head !== sourceAttempt.expectedRevisionId || branch !== sourceAttempt.sourceLineId || common !== devCommon)
              throw Error("Exact Workflow checkout identity changed before restore.");
            const paths = [...new Set(sourceAttempt.attributablePaths)].sort();
            for (const relative of paths) {
              if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => !part || part === "." || part === "..")) throw Error("Observed source path is unsafe for bounded recovery.");
              const absolute = path.resolve(checkout, relative);
              if (!absolute.startsWith(`${checkout}${path.sep}`)) throw Error("Observed source path escaped the exact checkout.");
            }
            const tracked: string[] = [];
            for (const relative of paths) if ((await runBoundedGit({ cwd: checkout, args: ["ls-files", "--error-unmatch", "--", relative], rejectNonZero: false })).exitCode === 0) tracked.push(relative);
            if (tracked.length) await runBoundedGit({ cwd: checkout, args: ["restore", "--source", sourceAttempt.expectedRevisionId, "--staged", "--worktree", "--", ...tracked] });
            for (const relative of paths.filter(value => !tracked.includes(value))) {
              const absolute = path.resolve(checkout, relative);
              if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) fs.unlinkSync(absolute);
            }
            const finalHead = (await runBoundedGit({ cwd: checkout, args: ["rev-parse", "HEAD"] })).stdout.trim();
            const finalStatus = (await runBoundedGit({ cwd: checkout, args: ["status", "--porcelain", "--untracked-files=all"] })).stdout;
            if (finalHead !== sourceAttempt.expectedRevisionId || finalStatus) throw Error("Bounded restore did not return the exact checkout to its clean expected revision.");
            scopeRestored = true;
          } catch (error) {
            sourceAttempt.attributionFailure = `Out-of-scope source recovery could not be proven: ${messageForCodexFailure(error)}`;
          }
          finalizedResult = { ...result, outcome: scopeRestored ? "failed" : "blocked", blockers: [...result.blockers, scopeRestored
            ? "Application rejected source changes outside the accepted Architect path scope; exact checkout restored."
            : sourceAttempt.attributionFailure ?? "Out-of-scope source changes require inspection."] };
          session.failureReason = finalizedResult.blockers.at(-1)!;
          terminalState = "failed";
        }
        session.workflowWorkItem.resultOutcome = finalizedResult.outcome;
        try {
          const implementation = await this.persistAndFinishWorkflowAttempt(session, session.selection, session.startedAt ?? this.now(), finalizedResult);
          if (terminalState === "completed" && !parsed) {
            terminalState = "failed";
            session.failureReason = "Codex returned invalid or missing exact WorkItem semantic completion JSON.";
          }
          if (session.workflowWorkItem.sourceBacked) {
            const source = session.workflowWorkItem.sourceBacked;
            if (scopeViolated && scopeRestored) {
              session.checkpoint = { status: "not-required", message: "Scope-violating attempt was rejected and the exact checkout restored; no SourceCheckpoint was created.", remote: "not-requested", receipts: [] };
            } else if (result.outcome !== "implemented" || source.attributionFailure || source.attributablePaths.length === 0) {
              session.checkpoint = { status: "blocked", message: source.attributionFailure ?? (result.outcome !== "implemented"
                ? "Implementation did not produce a successful validated result; source changes require inspection."
                : "No attributable source changes were reported; a structured implementation checkpoint cannot be created."), remote: "not-requested", receipts: [] };
              if (terminalState === "completed") {
                terminalState = "failed";
                session.failureReason = session.checkpoint.message;
              }
            } else {
              const checkpoint = await createImplementationCheckpoint(session.projectRoot, session.workflowWorkItem.contract.projectId, {
                boundaryId: session.workflowWorkItem.executionRef!, workflowId: session.workflowWorkItem.workflowId,
                targetEntityId: implementation.id, sourceLineId: source.sourceLineId, expectedRevisionId: source.expectedRevisionId,
                repositoryCheckoutId: source.repositoryCheckoutId, attributablePaths: [...source.attributablePaths].sort(),
              });
              session.checkpoint = checkpoint.state === "committed"
                ? { status: "committed", message: checkpoint.message, ...(checkpoint.checkpointId ? { checkpointId: checkpoint.checkpointId } : {}),
                  ...(checkpoint.revision ? { commit: checkpoint.revision.revisionId } : {}), remote: "not-requested", receipts: [] }
                : { status: "blocked", message: checkpoint.message, ...(checkpoint.checkpointId ? { checkpointId: checkpoint.checkpointId } : {}), remote: "not-requested", receipts: [] };
              if (checkpoint.state !== "committed") {
                terminalState = "failed";
                session.failureReason = checkpoint.message || "Structured implementation checkpoint requires inspection.";
              }
            }
          }
        } catch (error) {
          terminalState = "failed";
          session.failureReason = `Typed WorkItem attempt finalization failed: ${messageForCodexFailure(error)}`;
          if (session.workflowWorkItem.sourceBacked) session.checkpoint = { status: "blocked", message: `Structured source checkpoint requires inspection: ${messageForCodexFailure(error)}`, remote: "not-requested", receipts: [] };
        }
      } else if (session.executionKind === "work-card-implementation") {
        await refreshReportEvidence(session, terminalState);
      }
      if (!session.workflowWorkItem && session.executionKind === "work-card-implementation" && terminalState === "completed" && !session.reportUpdated) {
        session.failureReason = "Codex completed, but the Implementer Report was not updated.";
      }
      if (!session.workflowWorkItem && session.executionKind === "work-card-implementation" && session.checkpointCapture && !session.checkpoint) {
        session.checkpoint = await completePlanWorkItemSource(session.projectRoot, { capture: session.checkpointCapture,
          implementationSucceeded: terminalState === "completed", reportReady: session.reportUpdated && !session.failureReason,
          synchronize: Boolean(session.checkpointCapture.binding.remote) });
      }
      session.completedAt = this.now();
      session.state = terminalState;
      appendTail(session.eventTail, `execution.${session.state}`);
    }
  }

  private async resolvePreflightContext(workspaceRoot: string, selector?: CodexExecutionSelector): Promise<ExecutionContext | Error> {
    try {
      const projectRoot = path.resolve(workspaceRoot);
      if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        throw new Error("Selected workspace root is not a readable directory.");
      }
      if (selector?.ownerKind === "integration-repair") throw new Error("Integration Repair uses its bounded isolated execution owner.");
      if (selector?.ownerKind === "workflow-work-item") return await this.resolveWorkflowWorkItemContext(projectRoot, selector);
      if (selector?.ownerKind === "issue") {
        const issueContext = resolveIssueFixCardCodexExecutionContext(
          projectRoot,
          selector.issueId,
          selector.fixCardId,
          selector.currentImplementationId,
        );
        return {
          ...issueContext,
          rootFixCardId: issueContext.fixCardId,
          currentImplementationId: issueContext.currentImplementationId,
          phaseId: null,
          workCardId: issueContext.currentImplementationId,
          ownerKind: "issue",
          developmentEnvironmentPreflight: null,
        };
      }

      const routed = selector?.ownerKind === "routed-development" ? await resolveRoutedImplementerContext(projectRoot, selector.intakeId, selector.workItemId) : undefined;
      const current = routed ? undefined : getCurrentWorkspaceModel(projectRoot);
      if (!routed && (
        current?.activeWorkspaceId !== "work-card-building-review" &&
        current?.activeWorkspaceId !== "work-card-report-review"
      )) {
        throw new Error("Run Codex Implementer is available only in the Implement workspace.");
      }
      const projection = routed?.projection ?? current?.workCardBuildingReview;
      if (!projection) {
        throw new Error("Current Implement projection does not resolve an Approved Work Card Contract.");
      }

      const documents = listPlanningDocuments(projectRoot);
      const formal = documents.find((document) => document.markdownPath === projection.formalWorkCardPath);
      if (!formal || formal.documentReadState !== "readable" || formal.readError) {
        throw new Error("Current Approved Work Card Contract is missing or unreadable.");
      }
      if (formal.effectiveDisposition !== "Approved") {
        throw new Error("Current Work Card Contract must be Approved before Codex execution.");
      }

      const report = documents.find((document) => document.markdownPath === projection.implementerReportPath);
      if (!report || projection.reportMissing) {
        throw new Error("Existing Pending Implementer Report is required before Codex execution.");
      }
      if (projection.reportReadiness === "invalid" || projection.reportReadiness === "conflict") {
        throw new Error(projection.reportReadinessReason);
      }
      if (report.documentReadState !== "readable" || report.readError) {
        throw new Error(report.readError ?? "Existing Implementer Report is unreadable.");
      }
      if (report.effectiveDisposition !== "Pending") {
        throw new Error("Existing Implementer Report must be Pending before Codex execution.");
      }
      if (evaluateDocumentFreshness(projectRoot, report.logicalDocumentId).state !== "fresh") {
        throw new Error("Existing Implementer Report must be fresh before Codex execution.");
      }

      const formalMetadata = readCanonicalMetadata(projectRoot, projection.formalWorkCardPath);
      const reportMetadata = readCanonicalMetadata(projectRoot, projection.implementerReportPath);
      return {
        ownerKind: routed ? "routed-development" : "development",
        ...(routed ? { intakeId: routed.state.binding.identity.intakeId, planId: routed.state.binding.identity.planId, planRevision: routed.state.binding.planRevision,
          rootWorkItemId: routed.entry.candidate.workItemId, currentImplementationId: routed.entry.executionWorkCardId } : {}),
        phaseId: projection.phaseId ?? null,
        workCardId: projection.workCardId,
        workCardTitle: projection.workCardTitle,
        projectRoot,
        formalWorkCardPath: projection.formalWorkCardPath,
        formalWorkCardRevision: formalMetadata.artifactRevision,
        formalWorkCardSha256: sha256ForRelativePath(projectRoot, projection.formalWorkCardPath),
        implementationContractType: projection.implementationContractType ?? "formal-work-card",
        implementationContractLabel: projection.implementationContractLabel ?? "Approved Work Card Contract",
        implementerReportPath: projection.implementerReportPath,
        implementerReportRevision: reportMetadata.artifactRevision,
        implementerReportSha256: sha256ForRelativePath(projectRoot, projection.implementerReportPath),
        developmentEnvironmentPreflight: null,
      };
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  private async resolveRetryReadiness(
    workspaceRoot: string,
    session: SessionRecord,
  ): Promise<RetryReadiness> {
    let selector: CodexExecutionSelector | undefined;
    if (session.ownerKind === "routed-development" && session.intakeId && session.rootWorkItemId) {
      selector = { ownerKind: "routed-development", intakeId: session.intakeId, workItemId: session.rootWorkItemId };
    }
    if (session.ownerKind === "issue" && session.issueId) {
      if (!session.rootFixCardId || !session.currentImplementationId) {
        return {
          canRunAgain: false,
          retryBlocker: "Issue Codex execution identity is incomplete; refresh the current Fix Card implementation.",
        };
      }
      selector = {
        ownerKind: "issue",
        issueId: session.issueId,
        fixCardId: session.rootFixCardId,
        currentImplementationId: session.currentImplementationId,
      };
    }
    const context = await this.resolvePreflightContext(workspaceRoot, selector);
    if (context instanceof Error) {
      return {
        canRunAgain: false,
        retryBlocker: context.message,
      };
    }
    if (!sameExecutionContext(session, context)) {
      this.sessionsByWorkspaceRoot.delete(workspaceKey(workspaceRoot));
      return {
        canRunAgain: false,
        retryBlocker: "Workspace context changed; refresh Codex execution status for the current Work Card.",
      };
    }
    return {
      canRunAgain: true,
      retryBlocker: null,
    };
  }
}

export const codexImplementerExecutionService = new CodexImplementerExecutionService();

export function buildWorkflowWorkItemCodexPrompt(contract: WorkItemExecutionContract, executionRef: string, sourceCheckoutRoot?: string): string {
  if (sourceCheckoutRoot) return `You are the Implementer for one exact ChampCity source-backed Workflow WorkItem.

Authority and identity:
- The human Operator is the only authority. Use only this exact application-owned execution contract; do not infer identity from titles or discover legacy Work Cards, Issue Fix Cards, Markdown plans, or report files.
- Follow implementationBoundaries, affectedPaths, and proofIntent in the accepted contract. Never expand path scope based on model output.
- Workflow ID: ${contract.workflowId}
- WorkItem ID: ${contract.workItemId}
- WorkItem record version: ${contract.workItemVersion}
- Execution reference: ${executionRef}
- Contract digest: ${contract.digest}
- Accepted contract:
${JSON.stringify(contract, null, 2)}

Execution boundary:
- Your working directory is the exact registered Workflow checkout at ${sourceCheckoutRoot}; make only the accepted bounded source changes there, within scopeIn and outside scopeOut.
- Do not modify files outside that checkout, the Project container, or application-owned evidence. Do not use another repository or checkout.
- Do not run Git commands or stage, commit, push, or otherwise mutate Git state. ChampCity captures App Server file-change evidence and performs the structured checkpoint after your result.
- Do not edit generated output, dependencies, credentials, or application state. Do not claim checkpoint or permanent validation.
- Return exactly one JSON object as your final response, with only these fields: summary (string), deviations (string array), blockers (string array), residualRisks (string array), outcome (implemented|partial|blocked|failed).
- Keep the result concise and report only semantic work actually performed. Do not claim ValidationCatalog or Tester proof; implementation-local evidence does not replace independent validation.
- If the objective cannot be completed within this bounded source checkout, use partial, blocked, or failed and explain why in blockers.
`;
  return `You are the Implementer for one exact ChampCity Workflow WorkItem.

Authority and identity:
- The human Operator is the only authority. Use only this exact application-owned execution contract; do not infer identity from titles or discover legacy Work Cards, Issue Fix Cards, Markdown plans, or report files.
- Follow implementationBoundaries, affectedPaths, and proofIntent in the accepted contract. Never expand path scope based on model output.
- Workflow ID: ${contract.workflowId}
- WorkItem ID: ${contract.workItemId}
- WorkItem record version: ${contract.workItemVersion}
- Execution reference: ${executionRef}
- Contract digest: ${contract.digest}
- Accepted contract:
${JSON.stringify(contract, null, 2)}

Execution boundary:
- The Current Project container is application state and evidence storage. Your working directory is a separate empty runtime worker directory and is not a source repository.
- This contract is explicitly source-neutral. Do not read or modify project source, create a Git repository, run Git commands, or claim source changes, commits, checkpoints, or permanent validation.
- Do not create or modify files. Return exactly one JSON object as your final response, with only these fields: summary (string), deviations (string array), blockers (string array), residualRisks (string array), outcome (implemented|partial|blocked|failed).
- Keep the result concise and report only semantic work actually performed. Do not claim ValidationCatalog or Tester proof; implementation-local evidence does not replace independent validation.
- If the objective cannot be completed within this source-neutral boundary, use partial, blocked, or failed and explain why in blockers.
`;
}

function parseWorkflowWorkItemCompletion(text: string): { summary: string; deviations: string[]; blockers: string[]; residualRisks: string[]; outcome: "implemented" | "partial" | "blocked" | "failed" } | null {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > 32 * 1024) return null;
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    const keys = ["summary", "deviations", "blockers", "residualRisks", "outcome"].sort();
    if (!value || typeof value !== "object" || Object.keys(value).sort().join("|") !== keys.join("|") ||
      typeof value.summary !== "string" || !value.summary.trim() || value.summary.length > 4096 ||
      !["implemented", "partial", "blocked", "failed"].includes(String(value.outcome))) return null;
    for (const name of ["deviations", "blockers", "residualRisks"] as const) {
      const list = value[name];
      if (!Array.isArray(list) || list.length > 32 || list.some(item => typeof item !== "string" || !item.trim() || item.length > 2000)) return null;
    }
    return { summary: value.summary.trim(), deviations: value.deviations as string[], blockers: value.blockers as string[],
      residualRisks: value.residualRisks as string[], outcome: value.outcome as "implemented" | "partial" | "blocked" | "failed" };
  } catch { return null; }
}

function ensureRuntimeDirectory(projectRoot: string, runtimeDirectory: string, workerDirectory?: string): void {
  const canonicalRoot = fs.realpathSync(projectRoot);
  const isWithin = (parent: string, child: string) => child.toLowerCase().startsWith(`${parent.toLowerCase()}${path.sep.toLowerCase()}`);
  const stateDirectory = path.join(canonicalRoot, ".champcity");
  fs.mkdirSync(stateDirectory, { recursive: true });
  const canonicalState = fs.realpathSync(stateDirectory);
  if (!isWithin(canonicalRoot, canonicalState)) throw Error("Current Project application state escaped its container.");
  fs.mkdirSync(runtimeDirectory, { recursive: true });
  const runtimeRoot = fs.realpathSync(runtimeDirectory);
  if (!isWithin(canonicalState, runtimeRoot)) throw Error("Current Project runtime directory escaped its application state.");
  if (!isWithin(canonicalRoot, runtimeRoot)) throw Error("Current Project runtime directory escaped its container.");
  if (workerDirectory) {
    fs.mkdirSync(workerDirectory, { recursive: true });
    const workerRoot = fs.realpathSync(workerDirectory);
    if (!isWithin(runtimeRoot, workerRoot)) throw Error("Source-neutral worker directory escaped its Current Project runtime directory.");
  }
}

function observeExactWorkflowCheckoutChanges(source: { attributablePaths: string[] }, changes: unknown): void {
  if (!Array.isArray(changes) || changes.length === 0) throw Error("App Server file-change event omitted attributable path evidence.");
  const observed: string[] = [];
  for (const change of changes) {
    if (!change || typeof change !== "object" || Array.isArray(change) || typeof (change as { path?: unknown }).path !== "string")
      throw Error("App Server file-change event contains an invalid path record.");
    const value = (change as { path: string }).path;
    if (!value || value.length > 512 || path.isAbsolute(value) || /^[a-zA-Z]:/.test(value) || value.includes("\\") || value.includes(":") ||
      value.trim() !== value || value.includes("\0") || value.includes("\r") || value.includes("\n"))
      throw Error("App Server file-change path is absolute, ambiguous, or outside the exact checkout.");
    const segments = value.split("/");
    if (segments.some(part => !part || part === "." || part === "..") || value === ".git" || value.startsWith(".git/") ||
      value === ".champcity" || value.startsWith(".champcity/") || /(^|\/)(\.env(?:\.|$)|node_modules|dist|build|coverage|tmp)(\/|$)/i.test(value) ||
      /(^|\/)[^/]*(?:token|secret|credential)[^/]*(\/|$)/i.test(value) || /\.(?:pem|key|p12|pfx)$/i.test(value))
      throw Error("App Server file-change path is not eligible for a structured source checkpoint.");
    observed.push(value);
  }
  source.attributablePaths.push(...observed);
}

export function buildCodexImplementerPrompt(context: ExecutionContext): string {
  const contractDocumentLabel = context.implementationContractType === "formal-work-card"
    ? "Formal Work Card"
    : context.implementationContractType === "fix-card"
    ? "Fix Card"
    : "Repair Contract";
  const approvedContractLabel = context.implementationContractType === "fix-card"
    ? "Approved Fix Card Contract"
    : context.implementationContractType === "repair-work-card"
    ? "Approved Repair Contract"
    : "Approved Work Card";
  const developmentEnvironmentEvidence = context.developmentEnvironmentPreflight &&
    context.developmentEnvironmentPreflight.state !== "not-required"
    ? [
        "",
        "Application-verified development environment:",
        context.developmentEnvironmentPreflight.evidenceMarkdown,
        "- Do not rewrite application-owned capability identity, provisioning state, or verification results.",
        "- Include this evidence in the Implementer Report when the Approved Work Card requires environment proof.",
      ].join("\n")
    : "";
  return `You are the Implementer for ChampCity A/I.

Working directory:
- The current process working directory is the selected project repository root.
- Use filesystem and tooling access only within the Operator's current direction, the ${approvedContractLabel}'s bounded scope, and project-local instructions.

Operator authority and task scope:
- The human Operator is the only authority.
- The ${context.implementationContractLabel} is the sole bounded implementation contract for this run. It defines task scope and instructions; it does not grant authority, which remains with the human Operator.
- Read it before changing files.
- ${contractDocumentLabel} path: ${context.formalWorkCardPath}
- ${contractDocumentLabel} artifact revision: ${context.formalWorkCardRevision}
- ${contractDocumentLabel} SHA-256: ${context.formalWorkCardSha256}

Required report:
- Use the existing application-owned Implementer Report.
- Implementer Report path: ${context.implementerReportPath}
- Implementer Report artifact revision before execution: ${context.implementerReportRevision}
- Implementer Report SHA-256 before execution: ${context.implementerReportSha256}
- The application owns canonical identity, source revisions, repository binding evidence, and disposition metadata in the report. Do not rewrite those fields.
- Do not create an alternate report, sidecar, summary, execution packet, or completion marker.
- Implementation is incomplete until this exact report contains the complete auditable evidence required by the ${approvedContractLabel} and remains Pending for review.
${developmentEnvironmentEvidence}

Project instructions:
- Discover and follow project-local instructions, including AGENTS.md, README files, validation documents, package scripts, and repository-specific conventions.
- If project instructions conflict with the ${approvedContractLabel}, follow the ${approvedContractLabel} and document the conflict in the report.

Execution rules:
- Implement only the approved implementation contract.
- ChampCity owns routine source-control checkpoints. Do not stage, commit, push, merge, tag, switch branches, or script Git mutations during this implementation run.
- Preserve all negative constraints in the implementation contract.
- Preserve the selected Work Intake branch and report unexpected repository state to ChampCity. Follow every explicit Git constraint supplied for this turn.
- Do not disclose or commit secrets, credentials, authentication tokens, API/provider keys, or private environment-file contents unless the ${approvedContractLabel} explicitly requires handling them through an established secure mechanism.
- A missing development capability required by the ${approvedContractLabel} is not by itself a blocker when its champcity-development-environment contract marks it managed. Use the application-owned development-environment provisioning path when available, verify the capability, then continue the implementation contract. Report a blocker only when provisioning itself fails after the application-owned remediation path is attempted or when the requirement is explicitly external.
- Repository-native dependency installation or restoration is implementation work when required by the implementation contract or project-local instructions. Package or dependency absence alone is not a reason to return the task to a nontechnical Operator.
- Do not install unrelated tools because they might be useful. Provisioning scope is bounded by the Approved Work Card's required capabilities and project-local instructions.
- A human interaction such as UAC approval, authentication, license acceptance, purchase, or hardware attachment is a resumable interaction boundary. Prepare the required action, request only the necessary human interaction, and resume afterward instead of transferring technical environment setup responsibility to the Operator.
- Run the validation required by the ${approvedContractLabel} when possible.
- Record exact commands, working directory, exit codes, and result summaries in the Implementer Report.
- Map each acceptance criterion to evidence in the Implementer Report.
- Distinguish automated validation completed from Operator validation remaining.
- State any skipped validation, scope expansion, residual risk, or blocker.

Completion:
- No generic security scan, safety scan, path-sanitization scan, or secret-like-string scan is required for Implementer completion unless the Approved Work Card or project validation instructions require it.
- A voluntarily run auxiliary scan is supporting evidence only and must not replace or override the Work Card acceptance criteria.
- When implementation and validation are complete, update only the existing Implementer Report at the required path.
- Leave the report disposition as Pending.
- End your final response with the report path and whether implementation is complete, blocked, or incomplete.
`;
}

export function buildCodexEnvironmentResolutionPrompt(context: ExecutionContext): string {
  const unresolvedEvidence = environmentResolutionEvidence(context);
  const approvedContractLabel = context.implementationContractType === "fix-card"
    ? "Approved Fix Card"
    : context.implementationContractType === "repair-work-card"
    ? "Approved Repair"
    : "Approved Work Card";
  const contractDocumentLabel = context.implementationContractType === "fix-card"
    ? "Fix Card"
    : context.implementationContractType === "repair-work-card"
    ? "Repair Contract"
    : "Approved Work Card";
  return `You are running ChampCity A/I Environment Resolution, not normal Work Card implementation.

Use the current working directory as the selected project repository root. Read the current ${approvedContractLabel} and project-local instructions before taking action.

${approvedContractLabel} evidence:
- ${contractDocumentLabel} path: ${context.formalWorkCardPath}
- ${contractDocumentLabel} artifact revision: ${context.formalWorkCardRevision}
- ${contractDocumentLabel} SHA-256: ${context.formalWorkCardSha256}
${unresolvedEvidence}

Scope:
- Establish only unresolved managed development-environment capabilities required by the ${approvedContractLabel}.
- Do not substitute project architecture, platform, compiler family, target architecture, package ecosystem, or approved capability identity because setup is difficult.
- Prefer official vendor, Windows Package Manager, WinGet Configuration/DSC, and project-native ecosystem sources.
- Stop only for a genuine human or external boundary such as UAC approval, restart, account authentication, license/purchase acceptance, host policy, or demonstrable inability to provision.

Output requirements:
- Label all work as Environment Resolution.
- Record exact commands, working directory, exit codes, and concise results in your final response.
- Do not update the Implementer Report as if Work Card implementation ran.
- After your turn completes, ChampCity A/I will rerun deterministic preflight; do not claim readiness without verification.
`;
}

function environmentResolutionEvidence(context: ExecutionContext): string {
  const preflight = context.developmentEnvironmentPreflight;
  if (!preflight) {
    return [
      "",
      "Current development-environment preflight evidence:",
      "- No preflight evidence is currently attached to this Environment Resolution run.",
    ].join("\n");
  }
  const unresolved = preflight.requirements.filter((requirement) =>
    requirement.provisioning === "managed" &&
    (
      requirement.afterState !== "satisfied" ||
      Boolean(requirement.blocker) ||
      Boolean(requirement.humanInteractionKind)
    )
  );
  const lines = [
    "",
    "Current development-environment preflight evidence:",
    `- Preflight state: ${preflight.state}`,
    `- Summary: ${preflight.summary}`,
    `- Retry allowed: ${preflight.retryAllowed ? "yes" : "no"}`,
  ];
  if (unresolved.length === 0) {
    lines.push("- Unresolved managed requirements: none");
    return lines.join("\n");
  }
  lines.push("- Unresolved managed requirements:");
  for (const requirement of unresolved) {
    lines.push(
      `  - capabilityId: ${requirement.capabilityId}`,
      `    versionConstraint: ${requirement.requestedVersionConstraint ?? "not declared"}`,
      `    profile: ${requirement.requestedProfile ?? "not declared"}`,
      `    state: ${requirement.beforeState} -> ${requirement.afterState}`,
      `    actionTaken: ${requirement.actionTaken}`,
      `    blockerKind: ${requirement.blockerKind ?? "none"}`,
      `    blocker: ${truncatePromptEvidence(requirement.blocker ?? "none")}`,
    );
    if (requirement.providerAttempts?.length) {
      lines.push("    providerAttempts:");
      for (const attempt of requirement.providerAttempts) {
        lines.push(
          `      - provider: ${attempt.provider}`,
          `        stage: ${attempt.stage}`,
          `        outcome: ${attempt.outcome}`,
          `        query: ${attempt.query ?? "not declared"}`,
          `        summary: ${truncatePromptEvidence(attempt.summary)}`,
        );
        if (attempt.candidates?.length) {
          lines.push("        candidates:");
          for (const candidate of attempt.candidates) {
            lines.push(
              `          - packageId: ${candidate.packageId ?? "not declared"}; ` +
                `packageName: ${candidate.packageName ?? "not declared"}; ` +
                `source: ${candidate.source ?? "not declared"}; ` +
                `version: ${candidate.version ?? "not declared"}`,
            );
          }
        }
      }
    }
    if (requirement.commandSummaries.length) {
      lines.push("    commandSummaries:");
      for (const command of requirement.commandSummaries) {
        lines.push(
          `      - command: ${truncatePromptEvidence(command.command)}`,
          `        exitCode: ${command.exitCode ?? "none"}`,
          `        stdout: ${truncatePromptEvidence(command.stdout || "none")}`,
          `        stderr/error: ${truncatePromptEvidence(command.stderr || "none")}`,
        );
      }
    }
  }
  return lines.join("\n");
}

function truncatePromptEvidence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized;
}

async function loadCodexAppServerExecutionAdapter(): Promise<CodexAppServerExecutionAdapter> {
  return codexRuntimeManager.launch();
}

function readyModel(context: ExecutionContext): CodexImplementerExecutionModel {
  const exactWorkflowWorkItem = context.ownerKind === "workflow-work-item";
  return {
    ...baseModel(context.projectRoot),
    state: "ready",
    canRunAgain: true,
    phaseId: context.phaseId,
    workflowId: exactWorkflowWorkItem ? context.workflowId ?? null : null,
    workItemId: exactWorkflowWorkItem ? context.workItemId ?? null : null,
    workItemVersion: exactWorkflowWorkItem ? context.workItemVersion ?? null : null,
    executionContractDigest: exactWorkflowWorkItem ? context.executionContractDigest ?? null : null,
    sourceMode: exactWorkflowWorkItem ? context.sourceMode ?? null : null,
    workCardId: context.workCardId,
    workCardTitle: context.workCardTitle,
    formalWorkCardPath: exactWorkflowWorkItem ? null : context.formalWorkCardPath,
    formalWorkCardRevision: exactWorkflowWorkItem ? null : context.formalWorkCardRevision,
    formalWorkCardSha256: exactWorkflowWorkItem ? null : context.formalWorkCardSha256,
    implementerReportPath: exactWorkflowWorkItem ? null : context.implementerReportPath,
    implementerReportRevision: exactWorkflowWorkItem ? null : context.implementerReportRevision,
    implementerReportSha256: exactWorkflowWorkItem ? null : context.implementerReportSha256,
    developmentEnvironmentPreflight: context.developmentEnvironmentPreflight,
  };
}

function unavailableFromPreflight(context: Error): CodexImplementerExecutionModel {
  return {
    ...baseModel(null),
    state: "unavailable",
    failureReason: context.message,
    retryBlocker: context.message,
    developmentEnvironmentPreflight: null,
  };
}

function unavailableModel(workspaceRoot: string, failureReason: string): CodexImplementerExecutionModel {
  return {
    ...baseModel(path.resolve(workspaceRoot)),
    state: "unavailable",
    failureReason,
    retryBlocker: failureReason,
    developmentEnvironmentPreflight: null,
  };
}

function unavailableModelFromContext(
  context: ExecutionContext,
  failureReason: string,
): CodexImplementerExecutionModel {
  return {
    ...readyModel(context),
    state: "unavailable",
    canRunAgain: false,
    retryBlocker: failureReason,
    failureReason,
    developmentEnvironmentPreflight: context.developmentEnvironmentPreflight,
  };
}

function unavailableModelFromPreflightResult(
  context: ExecutionContext,
  preflight: DevelopmentEnvironmentPreflightResult,
): CodexImplementerExecutionModel {
  const retryable = preflight.retryAllowed === true ||
    (preflight.retryAllowed === undefined && preflight.state === "waiting-for-operator");
  const canResolveEnvironment = preflight.state === "resolution-required";
  return {
    ...readyModel(context),
    state: "unavailable",
    canRunAgain: retryable && !canResolveEnvironment,
    canResolveEnvironment,
    retryBlocker: retryable || canResolveEnvironment ? null : preflight.summary,
    failureReason: preflight.summary,
    developmentEnvironmentPreflight: preflight,
  };
}

function environmentRefreshFailurePreflight(
  previous: DevelopmentEnvironmentPreflightResult | null,
  message: string,
): DevelopmentEnvironmentPreflightResult {
  const requirements = previous?.requirements ?? [];
  const evidence = [
    "Development environment preflight evidence:",
    "- Final state: resolution-required",
    `- Summary: ${message}`,
    "- Retry allowed: yes",
    "- Parent process environment refresh failed before deterministic verification commands were launched.",
    previous?.evidenceMarkdown ? "" : null,
    previous?.evidenceMarkdown ? "Previous preflight evidence:" : null,
    previous?.evidenceMarkdown ?? null,
  ].filter((line): line is string => line !== null);
  return {
    state: "resolution-required",
    summary: message,
    retryAllowed: true,
    requirements,
    evidenceMarkdown: evidence.join("\n"),
  };
}

function baseModel(projectRoot: string | null): CodexImplementerExecutionModel {
  return {
    state: "unavailable",
    executionKind: null,
    lastRunState: null,
    canRunAgain: false,
    canResolveEnvironment: false,
    retryBlocker: null,
    integrationMode: "app-server-stdio",
    phaseId: null,
    workflowId: null,
    workItemId: null,
    workItemVersion: null,
    executionContractDigest: null,
    sourceMode: null,
    workCardId: null,
    workCardTitle: null,
    projectRoot,
    formalWorkCardPath: null,
    formalWorkCardRevision: null,
    formalWorkCardSha256: null,
    implementerReportPath: null,
    implementerReportRevision: null,
    implementerReportSha256: null,
    startedAt: null,
    completedAt: null,
    elapsedMs: null,
    eventTail: [],
    stderrTail: [],
    finalResponseTail: [],
    failureReason: null,
    approvalTail: [],
    runtimeDenialTail: [],
    runtimeState: null,
    pendingUserInput: null,
    pendingMcpElicitation: null,
    pendingApproval: null,
    reportUpdated: false,
    reportSha256After: null,
    developmentEnvironmentPreflight: null,
  };
}

function modelFromSession(
  session: SessionRecord,
  now: number,
  retryReadiness: RetryReadiness,
): CodexImplementerExecutionModel {
  const exactWorkflowWorkItem = session.ownerKind === "workflow-work-item";
  const completedAt = session.completedAt ? new Date(session.completedAt).toISOString() : null;
  const elapsedEnd = session.completedAt ?? now;
  const lastRunState = isTerminalState(session.state) ? session.state : null;
  const preflight = session.developmentEnvironmentPreflight;
  const environmentReady = !preflight ||
    preflight.state === "ready" ||
    preflight.state === "not-required";
  const canResolveEnvironment = preflight?.state === "resolution-required" &&
    session.state !== "running";
  return {
    state: session.state,
    checkpoint: session.checkpoint,
    executionKind: session.executionKind,
    lastRunState,
    canRunAgain: exactWorkflowWorkItem
      ? retryReadiness.canRunAgain
      : session.executionKind === "work-card-implementation"
      ? retryReadiness.canRunAgain
      : retryReadiness.canRunAgain && environmentReady,
    canResolveEnvironment,
    retryBlocker: environmentReady ? retryReadiness.retryBlocker : null,
    integrationMode: "app-server-stdio",
    phaseId: session.phaseId,
    workflowId: exactWorkflowWorkItem ? session.workflowId ?? null : null,
    workItemId: exactWorkflowWorkItem ? session.workItemId ?? null : null,
    workItemVersion: exactWorkflowWorkItem ? session.workItemVersion ?? null : null,
    executionContractDigest: exactWorkflowWorkItem ? session.executionContractDigest ?? null : null,
    sourceMode: exactWorkflowWorkItem ? session.sourceMode ?? null : null,
    workCardId: session.workCardId,
    workCardTitle: session.workCardTitle,
    projectRoot: session.projectRoot,
    formalWorkCardPath: exactWorkflowWorkItem ? null : session.formalWorkCardPath,
    formalWorkCardRevision: exactWorkflowWorkItem ? null : session.formalWorkCardRevision,
    formalWorkCardSha256: exactWorkflowWorkItem ? null : session.formalWorkCardSha256,
    implementerReportPath: exactWorkflowWorkItem ? null : session.implementerReportPath,
    implementerReportRevision: exactWorkflowWorkItem ? null : session.implementerReportRevision,
    implementerReportSha256: exactWorkflowWorkItem ? null : session.implementerReportSha256,
    startedAt: session.startedAt ? new Date(session.startedAt).toISOString() : null,
    completedAt,
    elapsedMs: session.startedAt ? Math.max(0, elapsedEnd - session.startedAt) : null,
    eventTail: [...session.eventTail],
    stderrTail: [...session.stderrTail],
    finalResponseTail: [...session.finalResponseTail],
    approvalTail: [...session.approvalTail],
    runtimeDenialTail: [...session.runtimeDenialTail],
    runtimeState: session.runtimeState,
    pendingApproval: session.pendingApproval,
    pendingUserInput: session.pendingUserInput,
    pendingMcpElicitation: session.pendingMcpElicitation,
    failureReason: session.failureReason,
    reportUpdated: exactWorkflowWorkItem ? Boolean(session.workflowWorkItem?.evidencePacketPath && fs.existsSync(session.workflowWorkItem.evidencePacketPath)) : session.reportUpdated,
    reportSha256After: exactWorkflowWorkItem && session.workflowWorkItem?.evidencePacketPath && fs.existsSync(session.workflowWorkItem.evidencePacketPath)
      ? crypto.createHash("sha256").update(fs.readFileSync(session.workflowWorkItem.evidencePacketPath)).digest("hex") : session.reportSha256After,
    developmentEnvironmentPreflight: session.developmentEnvironmentPreflight,
  };
}

function isTerminalState(
  state: CodexImplementerExecutionState,
): state is TerminalCodexImplementerExecutionState {
  return state === "completed" || state === "failed" || state === "cancelled";
}

function sameExecutionContext(left: ExecutionContext, right: ExecutionContext): boolean {
  if (left.ownerKind === "workflow-work-item" || right.ownerKind === "workflow-work-item") {
    return left.ownerKind === "workflow-work-item" && right.ownerKind === "workflow-work-item" &&
      left.workflowId === right.workflowId && left.workItemId === right.workItemId &&
      left.executionContractDigest === right.executionContractDigest && left.sourceMode === right.sourceMode &&
      left.workflowWorkItem.sourceBacked?.repositoryCheckoutId === right.workflowWorkItem.sourceBacked?.repositoryCheckoutId &&
      left.workflowWorkItem.sourceBacked?.expectedRevisionId === right.workflowWorkItem.sourceBacked?.expectedRevisionId;
  }
  return (
    left.ownerKind === right.ownerKind &&
    left.issueId === right.issueId && left.intakeId === right.intakeId && left.planId === right.planId && left.planRevision === right.planRevision && left.rootWorkItemId === right.rootWorkItemId &&
    left.rootFixCardId === right.rootFixCardId &&
    left.currentImplementationId === right.currentImplementationId &&
    left.repairId === right.repairId &&
    left.phaseId === right.phaseId &&
    left.workCardId === right.workCardId &&
    left.formalWorkCardPath === right.formalWorkCardPath &&
    left.formalWorkCardRevision === right.formalWorkCardRevision &&
    left.formalWorkCardSha256 === right.formalWorkCardSha256 &&
    left.implementerReportPath === right.implementerReportPath
  );
}

function preflightKey(context: ExecutionContext): string {
  if (context.ownerKind === "workflow-work-item") return [workspaceKey(context.currentProjectRoot), context.ownerKind,
    context.workflowId, context.workItemId, context.executionContractDigest, context.sourceMode,
    context.workflowWorkItem.sourceBacked?.repositoryCheckoutId ?? "", context.workflowWorkItem.sourceBacked?.expectedRevisionId ?? ""].join("::");
  return [
    workspaceKey(context.projectRoot),
    context.ownerKind ?? "development",
    context.issueId ?? "",
    context.intakeId ?? "", context.planId ?? "", context.planRevision ?? "", context.rootWorkItemId ?? "",
    context.rootFixCardId ?? "",
    context.currentImplementationId ?? "",
    context.repairId ?? "",
    context.phaseId ?? "",
    context.workCardId,
    context.formalWorkCardPath,
    context.formalWorkCardRevision,
    context.formalWorkCardSha256,
  ].join("::");
}

function busyModelForDifferentContext(
  requestedContext: ExecutionContext,
  active: SessionRecord,
): CodexImplementerExecutionModel {
  const activeLabel = executionContextLabel(active);
  const requestedLabel = executionContextLabel(requestedContext);
  return unavailableModelFromContext(
    requestedContext,
    `Codex execution is already running for ${activeLabel}; ${requestedLabel} is blocked until that run finishes.`,
  );
}

function executionContextLabel(context: ExecutionContext): string {
  if (context.ownerKind === "workflow-work-item") return `Workflow ${context.workflowId} WorkItem ${context.workItemId}`;
  if (context.ownerKind === "issue" && context.issueId) {
    return `${context.issueId} ${context.workCardId}`;
  }
  return context.phaseId ? `${context.phaseId} ${context.workCardId}` : context.workCardId;
}

async function refreshReportEvidence(
  session: SessionRecord,
  terminalState: CodexImplementerExecutionState,
): Promise<void> {
  if (session.ownerKind === "workflow-work-item") return;
  const evidence = await readStableFinalReportEvidence(session.projectRoot, session.implementerReportPath);
  session.reportSha256After = evidence.sha256;
  session.reportUpdated = Boolean(
    evidence.exists &&
    (
      evidence.sha256 !== session.implementerReportSha256 ||
      (
        evidence.canonicalRevision !== null &&
        evidence.canonicalRevision !== session.implementerReportRevision
      )
    ),
  );

  if (terminalState !== "completed" || !session.reportUpdated) {
    return;
  }

  if (evidence.readError) {
    session.failureReason = evidence.readError;
    appendTail(session.stderrTail, evidence.readError);
    return;
  }

  const readinessBlocker = await finalReportReadinessBlocker(session);
  if (readinessBlocker) {
    session.failureReason = readinessBlocker;
    appendTail(session.stderrTail, readinessBlocker);
    return;
  }

  session.failureReason = null;
}

async function readStableFinalReportEvidence(
  workspaceRoot: string,
  relativePath: string,
): Promise<FinalReportEvidence> {
  let previous: FinalReportEvidence | null = null;
  let latest: FinalReportEvidence | null = null;
  for (let attempt = 0; attempt < finalReportReadAttempts; attempt += 1) {
    latest = readFinalReportEvidence(workspaceRoot, relativePath);
    if (previous && sameFinalReportEvidence(previous, latest)) {
      return latest;
    }
    previous = latest;
    if (attempt < finalReportReadAttempts - 1) {
      await delay(finalReportReadDelayMs);
    }
  }
  return latest ?? {
    exists: false,
    sha256: null,
    canonicalRevision: null,
    readError: "Implementer Report could not be read after Codex completion.",
  };
}

function readFinalReportEvidence(workspaceRoot: string, relativePath: string): FinalReportEvidence {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      exists: false,
      sha256: null,
      canonicalRevision: null,
      readError: null,
    };
  }

  const bytes = fs.readFileSync(absolutePath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  try {
    const parsed = parseCanonicalMarkdownDocument(bytes.toString("utf8"));
    return {
      exists: true,
      sha256,
      canonicalRevision: parsed.metadata.artifactRevision,
      readError: null,
    };
  } catch (error) {
    return {
      exists: true,
      sha256,
      canonicalRevision: null,
      readError: error instanceof Error ? error.message : String(error),
    };
  }
}

function sameFinalReportEvidence(left: FinalReportEvidence, right: FinalReportEvidence): boolean {
  return (
    left.exists === right.exists &&
    left.sha256 === right.sha256 &&
    left.canonicalRevision === right.canonicalRevision &&
    left.readError === right.readError
  );
}

async function finalReportReadinessBlocker(session: SessionRecord): Promise<string | null> {
  if (session.ownerKind === "workflow-work-item") {
    if (!session.workflowId || !session.workItemId || !session.workflowWorkItem?.executionRef || !session.executionContractDigest) {
      return "Exact Workflow WorkItem execution identity is incomplete; attempt finalization cannot be verified.";
    }
    return null;
  }
  if (session.ownerKind === "issue" && session.issueId) {
    if (!session.rootFixCardId || !session.currentImplementationId) {
      return "Issue Codex execution identity is incomplete; final report readiness cannot be resolved.";
    }
    return issueFixCardReportReadinessBlocker(
      session.projectRoot,
      session.issueId,
      session.rootFixCardId,
      session.currentImplementationId,
    );
  }
  try {
    const projection = session.ownerKind === "routed-development" && session.intakeId && session.rootWorkItemId
      ? (await resolveRoutedImplementerContext(session.projectRoot, session.intakeId, session.rootWorkItemId)).projection
      : getCurrentWorkspaceModel(session.projectRoot).workCardBuildingReview;
    if (
      !projection ||
      (projection.phaseId ?? null) !== session.phaseId ||
      projection.workCardId !== session.workCardId ||
      projection.implementerReportPath !== session.implementerReportPath
    ) {
      return "Final Implementer Report readiness could not be resolved for the completed Codex run.";
    }
    return projection.reportReadiness === "ready-for-review"
      ? null
      : projection.reportReadinessReason;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForSessionCompletion(
  executionPromise: Promise<void> | null,
  timeoutMs: number,
): Promise<void> {
  if (!executionPromise) {
    return;
  }
  let timeout: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      executionPromise.catch(() => undefined),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function readCanonicalMetadata(workspaceRoot: string, relativePath: string) {
  return parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"),
  ).metadata;
}

function sha256ForRelativePath(workspaceRoot: string, relativePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(workspaceRoot, relativePath)))
    .digest("hex");
}

function workspaceKey(workspaceRoot: string): string {
  return path.resolve(workspaceRoot).toLowerCase();
}

function exactExecutionOwnerKey(workspaceRoot: string, workflowId: string, workItemId: string): string {
  return `${workspaceKey(workspaceRoot)}::workflow-work-item::${workflowId}::${workItemId}`;
}

function appendTail(tail: string[], value: string): void {
  const normalized = value.replace(/\s+/g, " ").trim();
  tail.push(normalized.length > maxTailTextLength
    ? `${normalized.slice(0, maxTailTextLength)}...`
    : normalized);
  while (tail.length > maxTailItems) {
    tail.shift();
  }
}

function summarizeEvent(event: CodexAppServerThreadEvent): string {
  switch (event.type) {
    case "thread.started":
      return `thread.started ${event.thread_id}`;
    case "turn.started":
      return "turn.started";
    case "turn.completed":
      return "turn.completed";
    case "turn.failed":
      return `turn.failed ${event.error.message}`;
    case "error":
      return `error ${event.message}`;
    case "item.completed":
      return `${event.type} ${summarizeItem(event.item)}`;
    case "approval.requested":
      return `approval.${event.approval.type}.pending ${event.approval.requestId}`;
    case "approval.completed":
      return `approval.${event.approval.type}.${event.approval.decision}.${event.approval.completed ? "completed" : "pending"} ${event.approval.requestId}`;
    case "runtime.denial":
      return `runtime.denial ${event.message}`;
    case "runtime.stderr":
      return `app-server.stderr ${event.message}`;
    case "user_input.requested":
      return `request_user_input.pending ${event.request.requestId}`;
    case "mcp_elicitation.requested":
      return event.request.responseSupported
        ? `mcp_elicitation.pending ${event.request.requestId}`
        : `mcp_elicitation.unsupported ${event.request.requestId} ${event.request.unsupportedReason ?? ""}`;
  }
}

function summarizeItem(item: CodexAppServerThreadItem): string {
  if (!item || typeof item !== "object" || !("type" in item)) {
    return "unknown";
  }
  const record = item as Record<string, unknown>;
  const type = String(record.type);
  const status = typeof record.status === "string" ? ` ${record.status}` : "";
  if (type === "command_execution" && typeof record.command === "string") {
    return `${type}${status}: ${record.command}`;
  }
  if (type === "file_change" && Array.isArray(record.changes)) {
    return `${type}${status}: ${record.changes.length} change(s)`;
  }
  if (type === "mcp_tool_call") {
    return `${type}${status}`;
  }
  return `${type}${status}`;
}

function messageForCodexFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/auth|authenticated|authentication|login|sign in|api key/i.test(message)) {
    return CODEX_AUTH_UNAVAILABLE_MESSAGE;
  }
  if (/unable to locate codex cli|codex cli binaries|unsupported platform|cannot find module|not found|enoent/i.test(message)) {
    return CODEX_RUNTIME_UNAVAILABLE_MESSAGE;
  }
  return message || "Codex execution failed.";
}
