import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  CodexImplementerExecutionModel,
  CodexImplementerExecutionKind,
  CodexImplementerExecutionState,
  CodexApprovalTelemetryModel,
  CodexMcpElicitationResponse,
  CodexPendingUserInputModel,
  CodexPendingMcpElicitationModel,
  CodexRuntimeStateModel,
} from "../../shared/workspaceContracts";
import type {
  DevelopmentEnvironmentPreflightResult,
} from "../../shared/developmentEnvironmentContracts";
import {
  loadCodexAppServerAdapter,
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

interface ExecutionContext {
  phaseId: string;
  workCardId: string;
  workCardTitle: string;
  projectRoot: string;
  formalWorkCardPath: string;
  formalWorkCardRevision: number;
  formalWorkCardSha256: string;
  implementationContractType: "formal-work-card" | "repair-work-card";
  implementationContractLabel: string;
  implementerReportPath: string;
  implementerReportRevision: number;
  implementerReportSha256: string;
  developmentEnvironmentPreflight: DevelopmentEnvironmentPreflightResult | null;
}

interface SessionRecord extends ExecutionContext {
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
  private readonly preflightByWorkspaceRoot = new Map<string, DevelopmentEnvironmentPreflightResult>();
  private shutdownPromise: Promise<void> | null = null;

  constructor(
    private readonly appServerFactory: CodexAppServerExecutionAdapterFactory = loadCodexAppServerExecutionAdapter,
    private readonly now: () => number = () => Date.now(),
    private readonly policyResolver: CodexImplementerExecutionPolicyResolver =
      resolveDefaultCodexImplementerExecutionPolicy,
    private readonly preflightService: DevelopmentEnvironmentPreflightService =
      developmentEnvironmentPreflightService,
    private readonly parentEnvironmentRefresh: () => Promise<WindowsEnvironmentRefreshResult> =
      refreshWindowsProcessEnvironment,
  ) {}

  async getStatus(workspaceRoot: string): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const runningOrCompleted = this.sessionsByWorkspaceRoot.get(key);
    if (runningOrCompleted) {
      if (runningOrCompleted.state === "running") {
        return modelFromSession(runningOrCompleted, this.now(), {
          canRunAgain: false,
          retryBlocker: "Codex execution is already running for this workspace.",
        });
      }
      const readiness = await this.resolveRetryReadiness(workspaceRoot, runningOrCompleted);
      return modelFromSession(runningOrCompleted, this.now(), readiness);
    }

    const context = this.resolvePreflightContext(workspaceRoot);
    if (context instanceof Error) {
      return unavailableFromPreflight(context);
    }
    context.developmentEnvironmentPreflight = this.preflightByWorkspaceRoot.get(key) ?? null;
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

  async start(workspaceRoot: string): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    if (active?.state === "running") {
      active.failureReason = "Codex execution is already running for this workspace.";
      return modelFromSession(active, this.now(), {
        canRunAgain: false,
        retryBlocker: "Codex execution is already running for this workspace.",
      });
    }

    const context = this.resolvePreflightContext(workspaceRoot);
    if (context instanceof Error) {
      if (active) {
        return modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker: context.message,
        });
      }
      return unavailableFromPreflight(context);
    }

    const checkingPreflight: DevelopmentEnvironmentPreflightResult = {
      state: "checking",
      summary: "Preparing development environment...",
      retryAllowed: false,
      requirements: [],
      evidenceMarkdown: "Development environment preflight evidence:\n- Final state: checking",
    };
    this.preflightByWorkspaceRoot.set(key, checkingPreflight);
    let developmentEnvironmentPreflight: DevelopmentEnvironmentPreflightResult;
    try {
      const provisioningPreflight: DevelopmentEnvironmentPreflightResult = {
        state: "provisioning",
        summary: "Installing required development tools...",
        retryAllowed: false,
        requirements: [],
        evidenceMarkdown: "Development environment preflight evidence:\n- Final state: provisioning",
      };
      this.preflightByWorkspaceRoot.set(key, provisioningPreflight);
      developmentEnvironmentPreflight = await this.preflightService.runPreflight({
        workspaceRoot: context.projectRoot,
        formalWorkCardPath: context.formalWorkCardPath,
      });
      this.preflightByWorkspaceRoot.set(key, developmentEnvironmentPreflight);
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
      this.preflightByWorkspaceRoot.set(key, blockedPreflight);
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

    const executionPolicy = this.policyResolver();
    const abortController = new AbortController();
    const session: SessionRecord = {
      ...context,
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
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  async startEnvironmentResolution(workspaceRoot: string): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    if (active?.state === "running") {
      active.failureReason = "Codex execution is already running for this workspace.";
      return modelFromSession(active, this.now(), {
        canRunAgain: false,
        retryBlocker: "Codex execution is already running for this workspace.",
      });
    }

    const context = this.resolvePreflightContext(workspaceRoot);
    if (context instanceof Error) {
      return unavailableFromPreflight(context);
    }

    let preflight = this.preflightByWorkspaceRoot.get(key) ?? null;
    if (!preflight || preflight.state !== "resolution-required") {
      preflight = await this.preflightService.runPreflight({
        workspaceRoot: context.projectRoot,
        formalWorkCardPath: context.formalWorkCardPath,
      });
      this.preflightByWorkspaceRoot.set(key, preflight);
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

    const executionPolicy = this.policyResolver();
    const abortController = new AbortController();
    const session: SessionRecord = {
      ...context,
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
  ): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot);
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

  async respondToMcpElicitation(
    workspaceRoot: string,
    requestId: string,
    response: Omit<CodexMcpElicitationResponse, "requestId">,
  ): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot);
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

  async cancel(workspaceRoot: string): Promise<CodexImplementerExecutionModel> {
    const key = workspaceKey(workspaceRoot);
    const active = this.sessionsByWorkspaceRoot.get(key);
    if (!active || active.state !== "running") {
      const status = await this.getStatus(workspaceRoot);
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
    const runningSessions = [...this.sessionsByWorkspaceRoot.values()]
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
    const prompt = session.executionKind === "environment-resolution"
      ? buildCodexEnvironmentResolutionPrompt(session)
      : buildCodexImplementerPrompt(session);
    let terminalState: CodexImplementerExecutionState = "failed";
    let terminalFailureReason: string | null = "Codex execution failed.";
    let thread: CodexThreadAdapter | null = null;
    try {
      thread = appServer.startThread({
        workingDirectory: session.projectRoot,
        skipGitRepoCheck: true,
        ...threadOptionsFromCodexImplementerPolicy(session.executionPolicy),
      });
      session.threadAdapter = thread;
      session.runtimeState = appServer.getRuntimeState?.() ?? session.runtimeState;
      appendTail(session.eventTail, "app-server.thread.start requested");
      const streamed = await thread.runStreamed(prompt, {
        signal: session.abortController?.signal,
      });
      for await (const event of streamed.events) {
        appendTail(session.eventTail, summarizeEvent(event));
        if (event.type === "item.completed" && event.item.type === "agent_message") {
          appendTail(session.finalResponseTail, String(event.item.text));
        }
        if (event.type === "approval.completed" || event.type === "approval.requested") {
          session.approvalTail.push(event.approval);
          while (session.approvalTail.length > maxTailItems) {
            session.approvalTail.shift();
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
            formalWorkCardPath: session.formalWorkCardPath,
          });
          this.preflightByWorkspaceRoot.set(workspaceKey(session.projectRoot), rerun);
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
          this.preflightByWorkspaceRoot.set(workspaceKey(session.projectRoot), failedRefreshPreflight);
          session.developmentEnvironmentPreflight = failedRefreshPreflight;
        }
      }
      if (session.executionKind === "work-card-implementation") {
        await refreshReportEvidence(session, terminalState);
      }
      if (session.executionKind === "work-card-implementation" && terminalState === "completed" && !session.reportUpdated) {
        session.failureReason = "Codex completed, but the Implementer Report was not updated.";
      }
      session.completedAt = this.now();
      session.state = terminalState;
      appendTail(session.eventTail, `execution.${session.state}`);
    }
  }

  private resolvePreflightContext(workspaceRoot: string): ExecutionContext | Error {
    try {
      const projectRoot = path.resolve(workspaceRoot);
      if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
        throw new Error("Selected workspace root is not a readable directory.");
      }

      const current = getCurrentWorkspaceModel(projectRoot);
      if (
        current.activeWorkspaceId !== "work-card-building-review" &&
        current.activeWorkspaceId !== "work-card-report-review"
      ) {
        throw new Error("Run Codex Implementer is available only in the Implement workspace.");
      }
      const projection = current.workCardBuildingReview;
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
        phaseId: projection.phaseId,
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
    const context = this.resolvePreflightContext(workspaceRoot);
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

export function buildCodexImplementerPrompt(context: ExecutionContext): string {
  const contractDocumentLabel = context.implementationContractType === "formal-work-card"
    ? "Formal Work Card"
    : "Work Card Contract";
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
- Use filesystem and tooling access only as authorized by the Approved Work Card and project-local instructions.

Authority:
- The ${context.implementationContractLabel} is the sole implementation contract.
- Read it before changing files.
- ${contractDocumentLabel} path: ${context.formalWorkCardPath}
- ${contractDocumentLabel} artifact revision: ${context.formalWorkCardRevision}
- ${contractDocumentLabel} SHA-256: ${context.formalWorkCardSha256}

Required report:
- Use the existing application-owned Implementer Report.
- Implementer Report path: ${context.implementerReportPath}
- Implementer Report artifact revision before execution: ${context.implementerReportRevision}
- Implementer Report SHA-256 before execution: ${context.implementerReportSha256}
- The application owns canonical identity, source revisions, repository authority, and disposition authority in the report metadata. Do not rewrite those authority fields.
- Do not create an alternate report, sidecar, summary, execution packet, or completion marker.
- Implementation is incomplete until this exact report contains the complete auditable evidence required by the Approved Work Card and remains Pending for review.
${developmentEnvironmentEvidence}

Project instructions:
- Discover and follow project-local instructions, including AGENTS.md, README files, validation documents, package scripts, and repository-specific conventions.
- If project instructions conflict with the Approved Work Card, follow the Approved Work Card and document the conflict in the report.

Execution rules:
- Implement only the approved Work Card.
- Preserve all negative constraints in the Work Card.
- Do not stage, commit, push, tag, reset, clean, stash, or perform Git mutation unless the Work Card explicitly authorizes it.
- Do not disclose or commit secrets, credentials, authentication tokens, API/provider keys, or private environment-file contents unless the Approved Work Card explicitly requires handling them through an authorized secure mechanism.
- A missing development capability required by the Approved Work Card is not by itself a blocker when its champcity-development-environment contract marks it managed. Use the application-owned development-environment provisioning path when available, verify the capability, then continue the Work Card. Report a blocker only when provisioning itself fails after the authorized remediation path is attempted or when the requirement is explicitly external.
- Repository-native dependency installation or restoration is implementation work when required by the Work Card or project-local instructions. Package or dependency absence alone is not a reason to return the task to a nontechnical Operator.
- Do not install unrelated tools because they might be useful. Provisioning authority is bounded by the Approved Work Card's required capabilities and project-local instructions.
- A human interaction such as UAC approval, authentication, license acceptance, purchase, or hardware attachment is a resumable interaction boundary. Prepare the required action, request only the necessary human interaction, and resume afterward instead of transferring technical environment setup responsibility to the Operator.
- Run the validation required by the Approved Work Card when possible.
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
  return `You are running ChampCity A/I Environment Resolution, not normal Work Card implementation.

Use the current working directory as the selected project repository root. Read the current Approved Work Card and project-local instructions before taking action.

Approved Work Card evidence:
- Approved Work Card path: ${context.formalWorkCardPath}
- Approved Work Card artifact revision: ${context.formalWorkCardRevision}
- Approved Work Card SHA-256: ${context.formalWorkCardSha256}
${unresolvedEvidence}

Authority:
- Establish only unresolved managed development-environment capabilities required by the Approved Work Card.
- Do not substitute project architecture, platform, compiler family, target architecture, package ecosystem, or approved capability identity because setup is difficult.
- Prefer authoritative vendor, Windows Package Manager, WinGet Configuration/DSC, and project-native ecosystem sources.
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
  return loadCodexAppServerAdapter();
}

function readyModel(context: ExecutionContext): CodexImplementerExecutionModel {
  return {
    ...baseModel(context.projectRoot),
    state: "ready",
    canRunAgain: true,
    phaseId: context.phaseId,
    workCardId: context.workCardId,
    workCardTitle: context.workCardTitle,
    formalWorkCardPath: context.formalWorkCardPath,
    formalWorkCardRevision: context.formalWorkCardRevision,
    formalWorkCardSha256: context.formalWorkCardSha256,
    implementerReportPath: context.implementerReportPath,
    implementerReportRevision: context.implementerReportRevision,
    implementerReportSha256: context.implementerReportSha256,
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
    executionKind: session.executionKind,
    lastRunState,
    canRunAgain: session.executionKind === "work-card-implementation"
      ? retryReadiness.canRunAgain
      : retryReadiness.canRunAgain && environmentReady,
    canResolveEnvironment,
    retryBlocker: environmentReady ? retryReadiness.retryBlocker : null,
    integrationMode: "app-server-stdio",
    phaseId: session.phaseId,
    workCardId: session.workCardId,
    workCardTitle: session.workCardTitle,
    projectRoot: session.projectRoot,
    formalWorkCardPath: session.formalWorkCardPath,
    formalWorkCardRevision: session.formalWorkCardRevision,
    formalWorkCardSha256: session.formalWorkCardSha256,
    implementerReportPath: session.implementerReportPath,
    implementerReportRevision: session.implementerReportRevision,
    implementerReportSha256: session.implementerReportSha256,
    startedAt: session.startedAt ? new Date(session.startedAt).toISOString() : null,
    completedAt,
    elapsedMs: session.startedAt ? Math.max(0, elapsedEnd - session.startedAt) : null,
    eventTail: [...session.eventTail],
    stderrTail: [...session.stderrTail],
    finalResponseTail: [...session.finalResponseTail],
    approvalTail: [...session.approvalTail],
    runtimeDenialTail: [...session.runtimeDenialTail],
    runtimeState: session.runtimeState,
    pendingUserInput: session.pendingUserInput,
    pendingMcpElicitation: session.pendingMcpElicitation,
    failureReason: session.failureReason,
    reportUpdated: session.reportUpdated,
    reportSha256After: session.reportSha256After,
    developmentEnvironmentPreflight: session.developmentEnvironmentPreflight,
  };
}

function isTerminalState(
  state: CodexImplementerExecutionState,
): state is TerminalCodexImplementerExecutionState {
  return state === "completed" || state === "failed" || state === "cancelled";
}

function sameExecutionContext(left: SessionRecord, right: ExecutionContext): boolean {
  return (
    left.phaseId === right.phaseId &&
    left.workCardId === right.workCardId &&
    left.formalWorkCardPath === right.formalWorkCardPath &&
    left.implementerReportPath === right.implementerReportPath
  );
}

async function refreshReportEvidence(
  session: SessionRecord,
  terminalState: CodexImplementerExecutionState,
): Promise<void> {
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

  const readinessBlocker = finalReportReadinessBlocker(session);
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

function finalReportReadinessBlocker(session: SessionRecord): string | null {
  try {
    const projection = getCurrentWorkspaceModel(session.projectRoot).workCardBuildingReview;
    if (
      !projection ||
      projection.phaseId !== session.phaseId ||
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
      return `approval.${event.approval.type}.${event.approval.decision}.pending ${event.approval.requestId}`;
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
