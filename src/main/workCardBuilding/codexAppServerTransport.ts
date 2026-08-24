import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createRequire } from "node:module";
import readline from "node:readline";
import {
  codexAppServerMethods,
  type CodexAppServerCommandApprovalResponse,
  type CodexAppServerFileChangeApprovalResponse,
  type CodexAppServerInitializeParams,
  type CodexAppServerInitializeResponse,
  type CodexAppServerLegacyApprovalResponse,
  type CodexAppServerMcpElicitationAction,
  type CodexAppServerMcpElicitationRequestResponse,
  type CodexAppServerPermissionsApprovalResponse,
  type CodexAppServerSandboxPolicy,
  type CodexAppServerThreadStartParams,
  type CodexAppServerThreadStartResponse,
  type CodexAppServerToolRequestUserInputResponse,
  type CodexAppServerTurnInterruptParams,
  type CodexAppServerTurnStartParams,
  type CodexAppServerTurnStartResponse,
} from "./codexAppServerProtocol";

export type CodexAppServerThreadEvent =
  | { type: "thread.started"; thread_id: string }
  | { type: "turn.started" }
  | { type: "turn.completed" }
  | { type: "turn.failed"; error: { message: string } }
  | { type: "error"; message: string }
  | { type: "item.completed"; item: CodexAppServerThreadItem }
  | { type: "approval.requested"; approval: CodexAppServerPendingApproval }
  | { type: "approval.completed"; approval: CodexAppServerApprovalTelemetry }
  | { type: "user_input.requested"; request: CodexAppServerPendingUserInput }
  | { type: "mcp_elicitation.requested"; request: CodexAppServerPendingMcpElicitation }
  | { type: "runtime.stderr"; message: string }
  | { type: "runtime.denial"; message: string };

export type CodexAppServerThreadItem =
  | { type: "agent_message"; text: string }
  | { type: "command_execution"; command: string; status?: string }
  | { type: "file_change"; changes: unknown[]; status?: string }
  | { type: "mcp_tool_call"; status?: string }
  | { type: string; status?: string; [key: string]: unknown };

export interface CodexAppServerThreadOptions {
  workingDirectory: string;
  skipGitRepoCheck?: boolean;
  sandboxMode?: "danger-full-access" | "workspace-write";
  approvalPolicy?: "on-request";
  approvalsReviewer?: "user";
  networkAccessEnabled?: boolean;
  writableRoots?: string[];
}

export interface CodexAppServerTurnOptions {
  signal?: AbortSignal;
}

export interface CodexAppServerThreadAdapter {
  readonly id: string | null;
  runStreamed(
    input: string,
    options?: CodexAppServerTurnOptions,
  ): Promise<{ events: AsyncIterable<CodexAppServerThreadEvent> }>;
  respondToUserInput?(requestId: string, answers: Record<string, string[]>): Promise<void>;
  respondToApproval?(requestId: string, decision: CodexAppServerApprovalDecision): Promise<void>;
  respondToMcpElicitation?(requestId: string, response: CodexAppServerMcpElicitationResponse): Promise<void>;
  interrupt?(): Promise<void>;
  dispose?(): Promise<void>;
}

export interface CodexAppServerAdapter {
  startThread(options?: CodexAppServerThreadOptions): CodexAppServerThreadAdapter;
  getRuntimeState?(): CodexAppServerRuntimeState;
  dispose?(): Promise<void>;
}

export type CodexAppServerAdapterFactory = () => Promise<CodexAppServerAdapter>;

export interface CodexAppServerRuntimeState {
  userAgent: string | null;
  codexHome: string | null;
  cwd: string | null;
  model: string | null;
  reasoningEffort: string | null;
  approvalPolicy: string | null;
  approvalsReviewer: string | null;
  sandbox: string | null;
  capabilitySummary: CodexAppServerCapabilitySummary;
}

export interface CodexAppServerCapabilitySummary {
  configRead: CodexAppServerCapabilityReadState;
  mcpServers: CodexAppServerCapabilityReadState;
  skills: CodexAppServerCapabilityReadState;
  apps: CodexAppServerCapabilityReadState;
  plugins: CodexAppServerCapabilityReadState;
}

export interface CodexAppServerCapabilityReadState {
  state: "not-read" | "read" | "unavailable";
  count: number | null;
  summary: string;
  details: string[];
}

export interface CodexAppServerApprovalTelemetry {
  requestId: string;
  type: "command" | "file-change" | "permission";
  threadId: string | null;
  turnId: string | null;
  itemId: string | null;
  decision: string;
  completed: boolean;
}

export interface CodexAppServerPendingApproval {
  requestId: string;
  type: "command" | "file-change" | "permission";
  threadId: string | null;
  turnId: string | null;
  itemId: string | null;
  commandDisplay: string | null;
  fileChangeSummary: string | null;
  permissionSummary: string | null;
  impactSummary: string;
}

export interface CodexAppServerApprovalDecision {
  decision: "approve" | "deny";
}

export interface CodexAppServerPendingUserInput {
  requestId: string;
  threadId: string;
  turnId: string;
  itemId: string;
  questions: Array<{
    id: string;
    header: string;
    question: string;
    options: Array<{ label: string; description: string }>;
  }>;
}

export interface CodexAppServerMcpElicitationField {
  id: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  options: Array<{ value: string; label: string }>;
}

export interface CodexAppServerPendingMcpElicitation {
  requestId: string;
  threadId: string;
  turnId: string | null;
  serverName: string;
  mode: string;
  message: string;
  responseSupported: boolean;
  unsupportedReason: string | null;
  elicitationId: string | null;
  url: string | null;
  requestedSchemaSummary: string;
  fields: CodexAppServerMcpElicitationField[];
}

export interface CodexAppServerMcpElicitationResponse {
  action: CodexAppServerMcpElicitationAction;
  content: unknown | null;
}

type JsonRpcId = string | number;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  id: JsonRpcId;
  result?: unknown;
  error?: { message?: string };
}

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

interface PendingMcpElicitationRequest {
  rpcId: JsonRpcId;
  request: CodexAppServerPendingMcpElicitation;
}

interface PendingApprovalRequest {
  rpcId: JsonRpcId;
  method: string;
  params: Record<string, unknown>;
  pending: CodexAppServerPendingApproval;
}

type CodexAppServerApprovalResponse =
  | CodexAppServerCommandApprovalResponse
  | CodexAppServerFileChangeApprovalResponse
  | CodexAppServerLegacyApprovalResponse
  | CodexAppServerPermissionsApprovalResponse;

type CatastrophicCommandDenial =
  | "protected-process"
  | "machine-session"
  | "windows-service";

interface ProtectedProcessIdentity {
  pid: number;
  execPath: string;
}

interface JsonlCodexAppServerTransportOptions {
  protectedProcess?: ProtectedProcessIdentity;
}

export async function loadCodexAppServerAdapter(
  spawnRuntime?: () => ChildProcessWithoutNullStreams,
): Promise<CodexAppServerAdapter> {
  const transport = new JsonlCodexAppServerTransport(spawnRuntime);
  try {
    await transport.initialize();
    return transport;
  } catch (error) {
    await transport.dispose().catch(() => undefined);
    throw error;
  }
}

export class JsonlCodexAppServerTransport implements CodexAppServerAdapter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private lineReader: readline.Interface | null = null;
  private childExit: Promise<void> | null = null;
  private requestSequence = 0;
  private disposed = false;
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private readonly threads = new Map<string, JsonlCodexAppServerThread>();
  private runtimeState: CodexAppServerRuntimeState = emptyRuntimeState();

  constructor(
    private readonly spawnRuntime: () => ChildProcessWithoutNullStreams = spawnPackagedCodexAppServer,
    private readonly options: JsonlCodexAppServerTransportOptions = {},
  ) {}

  async initialize(): Promise<void> {
    if (this.child) {
      return;
    }
    const child = this.spawnRuntime();
    this.child = child;
    this.lineReader = readline.createInterface({ input: child.stdout });
    this.lineReader.on("line", (line) => this.handleLine(line));
    child.stderr.on("data", (chunk) => this.broadcastErrorTail(String(chunk)));
    this.childExit = new Promise((resolve) => {
      child.once("exit", (code, signal) => {
        this.failAllPending(
          new Error(`Codex App Server exited (${signal ?? code ?? "unknown"}).`),
        );
        resolve();
      });
    });
    child.once("error", (error) => this.failAllPending(error));

    const initializeParams: CodexAppServerInitializeParams = {
      clientInfo: { name: "champcity-ai", title: "ChampCity A/I", version: "0.1.0" },
      capabilities: null,
    };
    const initialized = asRecord(
      await this.request(codexAppServerMethods.initialize, initializeParams),
    ) as unknown as Partial<CodexAppServerInitializeResponse>;
    this.runtimeState = {
      ...this.runtimeState,
      userAgent: stringOrNull(initialized.userAgent),
      codexHome: stringOrNull(initialized.codexHome),
    };
    this.notify(codexAppServerMethods.initialized);
  }

  startThread(options: CodexAppServerThreadOptions = { workingDirectory: process.cwd() }): CodexAppServerThreadAdapter {
    const thread = new JsonlCodexAppServerThread(options, this);
    return thread;
  }

  async startAppThread(thread: JsonlCodexAppServerThread): Promise<string> {
    const params: CodexAppServerThreadStartParams = {
      cwd: thread.options.workingDirectory,
      approvalPolicy: thread.options.approvalPolicy ?? "on-request",
      approvalsReviewer: thread.options.approvalsReviewer ?? "user",
      sandbox: thread.options.sandboxMode ?? "danger-full-access",
      serviceName: "ChampCity A/I",
      ephemeral: true,
    };
    const result = asRecord(
      await this.request(codexAppServerMethods.threadStart, params),
    ) as unknown as Partial<CodexAppServerThreadStartResponse>;
    const threadRecord = asRecord(result.thread);
    const threadId = String(threadRecord.id ?? "");
    if (!threadId) {
      throw new Error("Codex App Server did not return a thread id.");
    }
    this.threads.set(threadId, thread);
    this.runtimeState = {
      ...this.runtimeState,
      cwd: stringOrNull(result.cwd) ?? thread.options.workingDirectory,
      model: stringOrNull(result.model),
      reasoningEffort: stringOrNull(result.reasoningEffort),
      approvalPolicy: stringOrNull(result.approvalPolicy),
      approvalsReviewer: stringOrNull(result.approvalsReviewer),
      sandbox: summarizeSandbox(result.sandbox),
    };
    await this.refreshCapabilitySummary(threadId, thread.options.workingDirectory);
    return threadId;
  }

  async runTurn(
    thread: JsonlCodexAppServerThread,
    input: string,
    options?: CodexAppServerTurnOptions,
  ): Promise<{ events: AsyncIterable<CodexAppServerThreadEvent> }> {
    const threadId = thread.id ?? await this.startAppThread(thread);
    thread.id = threadId;
    const queue = new AsyncEventQueue<CodexAppServerThreadEvent>();
    const abort = () => {
      void this.interruptActiveTurn(thread).catch(() => undefined);
    };
    const cleanup = options?.signal
      ? () => options.signal?.removeEventListener("abort", abort)
      : undefined;
    thread.activeTurn = { threadId, turnId: null, queue, cleanup, interruptRequested: false };
    options?.signal?.addEventListener("abort", abort, { once: true });
    try {
      const params: CodexAppServerTurnStartParams = {
        threadId,
        input: [{ type: "text", text: input, text_elements: [] }],
        cwd: thread.options.workingDirectory,
        approvalPolicy: thread.options.approvalPolicy ?? "on-request",
        approvalsReviewer: thread.options.approvalsReviewer ?? "user",
        sandboxPolicy: sandboxPolicyFromThreadOptions(thread.options),
      };
      const result = asRecord(
        await this.request(codexAppServerMethods.turnStart, params),
      ) as unknown as Partial<CodexAppServerTurnStartResponse>;
      const turn = asRecord(result.turn);
      thread.activeTurn.turnId = stringOrNull(turn.id);
      if (options?.signal?.aborted || thread.activeTurn.interruptRequested) {
        await this.interruptActiveTurn(thread);
      }
      queue.push({ type: "turn.started" });
      if (turn.status === "completed") {
        queue.push({ type: "turn.completed" });
        this.finishActiveTurn(thread);
      }
    } catch (error) {
      queue.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return { events: queue.iterate() };
  }

  async respondToUserInput(thread: JsonlCodexAppServerThread, requestId: string, answers: Record<string, string[]>): Promise<void> {
    if (!thread.pendingUserInputs.has(requestId)) {
      throw new Error("No matching Codex user input request is pending.");
    }
    const response: CodexAppServerToolRequestUserInputResponse = {
      answers: Object.fromEntries(
        Object.entries(answers).map(([questionId, values]) => [questionId, { answers: values }]),
      ),
    };
    this.respond(requestId, response);
    thread.pendingUserInputs.delete(requestId);
    this.markServerRequestResolved(thread, requestId);
  }

  async respondToMcpElicitation(thread: JsonlCodexAppServerThread, requestId: string, response: CodexAppServerMcpElicitationResponse): Promise<void> {
    const pending = thread.pendingMcpElicitations.get(requestId);
    if (!pending) {
      throw new Error("No matching Codex MCP elicitation request is pending.");
    }
    if (!pending.request.responseSupported) {
      throw new Error(pending.request.unsupportedReason ?? "Current Codex runtime does not support responding to this MCP elicitation request.");
    }
    const payload: CodexAppServerMcpElicitationRequestResponse = {
      action: normalizeMcpElicitationAction(response.action),
      content: response.action === "accept" ? response.content ?? {} : null,
      _meta: null,
    };
    this.respond(pending.rpcId, payload);
    thread.pendingMcpElicitations.delete(requestId);
    this.markServerRequestResolved(thread, pending.rpcId);
  }

  async respondToApproval(
    thread: JsonlCodexAppServerThread,
    requestId: string,
    decision: CodexAppServerApprovalDecision,
  ): Promise<void> {
    const pending = thread.pendingApprovals.get(requestId);
    if (!pending) {
      throw new Error("No matching Codex approval request is pending.");
    }
    const response = approvalResponseForMethod(pending.method, pending.params, decision.decision);
    const completed: CodexAppServerApprovalTelemetry = {
      requestId: pending.pending.requestId,
      type: pending.pending.type,
      threadId: pending.pending.threadId,
      turnId: pending.pending.turnId,
      itemId: pending.pending.itemId,
      decision: approvalDecisionLabel(response),
      completed: true,
    };
    thread.activeTurn?.queue.push({ type: "approval.completed", approval: completed });
    this.respond(pending.rpcId, response);
    thread.pendingApprovals.delete(requestId);
    this.markServerRequestResolved(thread, pending.rpcId);
  }

  async interruptThread(threadId: string, turnId: string | null): Promise<void> {
    if (!turnId) {
      const thread = this.threads.get(threadId);
      if (thread?.activeTurn) {
        thread.activeTurn.interruptRequested = true;
      }
      return;
    }
    const params: CodexAppServerTurnInterruptParams = { threadId, turnId };
    await this.request(codexAppServerMethods.turnInterrupt, params);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.lineReader?.close();
    this.failAllPending(new Error("Codex App Server adapter disposed."));
    const child = this.child;
    this.child = null;
    if (child && !child.killed) {
      child.kill("SIGTERM");
      const exited = await waitForChildExit(this.childExit, 250);
      if (!exited) {
        child.kill("SIGKILL");
        await waitForChildExit(this.childExit, 250);
      }
    }
    this.childExit = null;
  }

  getRuntimeState(): CodexAppServerRuntimeState {
    return JSON.parse(JSON.stringify(this.runtimeState)) as CodexAppServerRuntimeState;
  }

  private async refreshCapabilitySummary(threadId: string, cwd: string): Promise<void> {
    const [configRead, mcpServers, skills, apps, plugins] = await Promise.all([
      this.readCapability(codexAppServerMethods.configRead, { includeLayers: true, cwd }),
      this.readCapability(codexAppServerMethods.mcpServerStatusList, { threadId }),
      this.readCapability(codexAppServerMethods.skillsList, { cwds: [cwd] }),
      this.readCapability(codexAppServerMethods.appsInstalled, { threadId }),
      this.readCapability(codexAppServerMethods.pluginsInstalled, { cwds: [cwd] }),
    ]);
    this.runtimeState = {
      ...this.runtimeState,
      capabilitySummary: { configRead, mcpServers, skills, apps, plugins },
    };
  }

  private async readCapability(method: string, params: Record<string, unknown>): Promise<CodexAppServerCapabilityReadState> {
    try {
      const result = await this.request(method, params);
      const normalized = normalizeCapabilityRead(method, result);
      return {
        state: "read",
        count: countTopLevelItems(result),
        summary: normalized.summary,
        details: normalized.details,
      };
    } catch (error) {
      return {
        state: "unavailable",
        count: null,
        summary: error instanceof Error ? error.message : String(error),
        details: [],
      };
    }
  }

  private request(method: string, params?: unknown): Promise<unknown> {
    const child = this.child;
    if (!child || this.disposed) {
      return Promise.reject(new Error("Codex App Server is not running."));
    }
    const id = `champcity-${++this.requestSequence}`;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", id, method };
    if (params !== undefined) {
      payload.params = params;
    }
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  private notify(method: string, params?: unknown): void {
    const child = this.child;
    if (!child || this.disposed) {
      return;
    }
    const payload: JsonRpcNotification = { jsonrpc: "2.0", method };
    if (params !== undefined) {
      payload.params = params;
    }
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private respond(id: JsonRpcId, result: unknown): void {
    this.child?.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
  }

  private respondError(id: JsonRpcId, message: string): void {
    this.child?.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message } })}\n`);
  }

  private handleLine(line: string): void {
    if (!line.trim()) {
      return;
    }
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    const record = asRecord(message);
    if ("id" in record && ("result" in record || "error" in record) && !("method" in record)) {
      this.handleResponse(record as unknown as JsonRpcResponse);
      return;
    }
    if ("id" in record && typeof record.method === "string") {
      this.handleServerRequest(record as unknown as JsonRpcRequest);
      return;
    }
    if (typeof record.method === "string") {
      this.handleNotification(record.method, asNullableRecord(record.params));
    }
  }

  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(response.id);
    if (response.error) {
      pending.reject(new Error(response.error.message ?? `Codex App Server request ${response.id} failed.`));
      return;
    }
    pending.resolve(response.result);
  }

  private handleNotification(method: string, params: Record<string, unknown> | null): void {
    const threadId = stringOrNull(params?.threadId) ?? stringOrNull(asNullableRecord(params?.thread)?.id);
    const thread = threadId ? this.threads.get(threadId) : null;
    const active = thread?.activeTurn ?? null;
    if (!active) {
      return;
    }
    if (method === codexAppServerMethods.threadStarted && threadId) {
      active.queue.push({ type: "thread.started", thread_id: threadId });
      return;
    }
    if (method === codexAppServerMethods.turnStarted) {
      active.turnId = stringOrNull(asNullableRecord(params?.turn)?.id) ?? active.turnId;
      active.queue.push({ type: "turn.started" });
      return;
    }
    if (method === codexAppServerMethods.itemCompleted && params) {
      active.queue.push({
        type: "item.completed",
        item: normalizeItem(asRecord(params.item)),
      });
      return;
    }
    if (method === codexAppServerMethods.turnCompleted) {
      active.queue.push({ type: "turn.completed" });
      this.finishActiveTurn(thread);
      return;
    }
    if (method === codexAppServerMethods.error) {
      active.queue.push({
        type: "turn.failed",
        error: { message: stringOrNull(asNullableRecord(params?.error)?.message) ?? "Codex App Server turn failed." },
      });
      this.finishActiveTurn(thread);
    }
  }

  private handleServerRequest(request: JsonRpcRequest): void {
    const params = asRecord(request.params);
    const ownership = normalizeServerRequestOwnership(request, params);
    const thread = this.findOwnedThread(ownership.threadId, ownership.turnId);
    const active = thread?.activeTurn ?? null;
    if (!thread || !active || (ownership.turnId && active.turnId && active.turnId !== ownership.turnId)) {
      this.respondError(request.id, "Codex approval request is not owned by the active ChampCity Work Card session.");
      return;
    }
    if (thread?.resolvedServerRequestIds.has(String(request.id))) {
      this.respondError(request.id, "Codex approval request was already resolved for this active Work Card turn.");
      return;
    }

    if (request.method === codexAppServerMethods.commandApprovalRequest ||
      request.method === codexAppServerMethods.legacyExecCommandApproval) {
      this.queueApprovalRequest(request, thread, ownership, "command");
      return;
    }
    if (request.method === codexAppServerMethods.fileChangeApprovalRequest ||
      request.method === codexAppServerMethods.legacyApplyPatchApproval) {
      this.queueApprovalRequest(request, thread, ownership, "file-change");
      return;
    }
    if (request.method === codexAppServerMethods.permissionsApprovalRequest) {
      this.queueApprovalRequest(request, thread, ownership, "permission");
      return;
    }
    if (request.method === codexAppServerMethods.mcpElicitationRequest) {
      const requestId = String(request.id);
      if (thread.pendingMcpElicitations.has(requestId)) {
        this.respondError(request.id, "Codex MCP elicitation request is already pending for this active Work Card turn.");
        return;
      }
      const pending = normalizeMcpElicitationRequest(requestId, params);
      thread.pendingMcpElicitations.set(requestId, { rpcId: request.id, request: pending });
      active?.queue.push({ type: "mcp_elicitation.requested", request: pending });
      return;
    }
    if (request.method === codexAppServerMethods.toolRequestUserInput) {
      if (thread?.pendingUserInputs.has(String(request.id))) {
        this.respondError(request.id, "Codex user input request is already pending for this active Work Card turn.");
        return;
      }
      const pending = normalizeUserInputRequest(String(request.id), params);
      thread?.pendingUserInputs.set(String(request.id), pending);
      active?.queue.push({ type: "user_input.requested", request: pending });
      return;
    }
    const message = `Codex App Server requested unsupported client method ${request.method}.`;
    active?.queue.push({ type: "runtime.denial", message });
    this.markServerRequestResolved(thread, request.id);
    this.respondError(request.id, message);
  }

  private findOwnedThread(threadId: string | null, turnId: string | null): JsonlCodexAppServerThread | null {
    if (threadId) {
      return this.threads.get(threadId) ?? null;
    }
    const candidates = [...this.threads.values()].filter((thread) => {
      const active = thread.activeTurn;
      return active && (!turnId || !active.turnId || active.turnId === turnId);
    });
    return candidates.length === 1 ? candidates[0] : null;
  }

  private queueApprovalRequest(
    request: JsonRpcRequest,
    thread: JsonlCodexAppServerThread,
    ownership: NormalizedServerRequestOwnership,
    type: CodexAppServerApprovalTelemetry["type"],
  ): void {
    const params = asRecord(request.params);
    const active = thread.activeTurn;
    const pending = normalizeApprovalRequest(
      String(request.id),
      params,
      ownership,
      thread,
      type,
    );
    const catastrophicDenial = type === "command"
      ? catastrophicCommandDenial(params, this.protectedProcess())
      : null;
    const response = approvalResponseForMethod(
      request.method,
      params,
      catastrophicDenial ? "deny" : "approve",
    );
    if (catastrophicDenial) {
      const denial = catastrophicCommandDenialMessage(catastrophicDenial);
      active?.queue.push({ type: "runtime.denial", message: denial });
      active?.queue.push({
        type: "approval.completed",
        approval: {
          requestId: pending.requestId,
          type,
          threadId: pending.threadId,
          turnId: pending.turnId,
          itemId: pending.itemId,
          decision: approvalDecisionLabel(response),
          completed: true,
        },
      });
      this.markServerRequestResolved(thread, request.id);
      this.respond(request.id, response);
      return;
    }
    active?.queue.push({
      type: "approval.completed",
      approval: {
        requestId: pending.requestId,
        type,
        threadId: pending.threadId,
        turnId: pending.turnId,
        itemId: pending.itemId,
        decision: approvalDecisionLabel(response),
        completed: true,
      },
    });
    this.markServerRequestResolved(thread, request.id);
    this.respond(request.id, response);
  }

  private protectedProcess(): ProtectedProcessIdentity {
    return this.options.protectedProcess ?? {
      pid: process.pid,
      execPath: process.execPath,
    };
  }

  private markServerRequestResolved(thread: JsonlCodexAppServerThread | null | undefined, requestId: JsonRpcId): void {
    thread?.resolvedServerRequestIds.add(String(requestId));
  }

  private broadcastErrorTail(text: string): void {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return;
    }
    for (const thread of this.threads.values()) {
      thread.activeTurn?.queue.push({ type: "runtime.stderr", message: trimmed });
    }
  }

  private failAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
    for (const thread of this.threads.values()) {
      thread.activeTurn?.queue.fail(error);
      thread.activeTurn?.cleanup?.();
      thread.activeTurn = null;
    }
  }

  private async interruptActiveTurn(thread: JsonlCodexAppServerThread): Promise<void> {
    const active = thread.activeTurn;
    if (!active) {
      return;
    }
    active.interruptRequested = true;
    await this.interruptThread(active.threadId, active.turnId);
  }

  private finishActiveTurn(thread: JsonlCodexAppServerThread | null | undefined): void {
    if (!thread?.activeTurn) {
      return;
    }
    thread.activeTurn.cleanup?.();
    thread.activeTurn.queue.close();
    thread.activeTurn = null;
  }
}

class JsonlCodexAppServerThread implements CodexAppServerThreadAdapter {
  id: string | null = null;
  activeTurn: {
    threadId: string;
    turnId: string | null;
    queue: AsyncEventQueue<CodexAppServerThreadEvent>;
    cleanup?: () => void;
    interruptRequested: boolean;
  } | null = null;
  readonly pendingUserInputs = new Map<string, CodexAppServerPendingUserInput>();
  readonly pendingMcpElicitations = new Map<string, PendingMcpElicitationRequest>();
  readonly pendingApprovals = new Map<string, PendingApprovalRequest>();
  readonly resolvedServerRequestIds = new Set<string>();

  constructor(
    readonly options: CodexAppServerThreadOptions,
    private readonly transport: JsonlCodexAppServerTransport,
  ) {}

  runStreamed(input: string, options?: CodexAppServerTurnOptions): Promise<{ events: AsyncIterable<CodexAppServerThreadEvent> }> {
    return this.transport.runTurn(this, input, options);
  }

  respondToUserInput(requestId: string, answers: Record<string, string[]>): Promise<void> {
    return this.transport.respondToUserInput(this, requestId, answers);
  }

  respondToMcpElicitation(requestId: string, response: CodexAppServerMcpElicitationResponse): Promise<void> {
    return this.transport.respondToMcpElicitation(this, requestId, response);
  }

  respondToApproval(requestId: string, decision: CodexAppServerApprovalDecision): Promise<void> {
    return this.transport.respondToApproval(this, requestId, decision);
  }

  interrupt(): Promise<void> {
    return this.id ? this.transport.interruptThread(this.id, this.activeTurn?.turnId ?? null) : Promise.resolve();
  }

  dispose(): Promise<void> {
    return this.transport.dispose();
  }
}

class AsyncEventQueue<T> {
  private values: T[] = [];
  private waiters: Array<(value: IteratorResult<T>) => void> = [];
  private closed = false;
  private failure: Error | null = null;

  push(value: T): void {
    if (this.closed) {
      return;
    }
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter({ value, done: false });
      return;
    }
    this.values.push(value);
  }

  close(): void {
    this.closed = true;
    while (this.waiters.length) {
      this.waiters.shift()?.({ value: undefined, done: true });
    }
  }

  fail(error: Error): void {
    this.failure = error;
    this.close();
  }

  async *iterate(): AsyncIterable<T> {
    while (true) {
      if (this.values.length) {
        yield this.values.shift() as T;
        continue;
      }
      if (this.failure) {
        throw this.failure;
      }
      if (this.closed) {
        return;
      }
      const next = await new Promise<IteratorResult<T>>((resolve) => this.waiters.push(resolve));
      if (next.done) {
        if (this.failure) {
          throw this.failure;
        }
        return;
      }
      yield next.value;
    }
  }
}

export function spawnPackagedCodexAppServer(): ChildProcessWithoutNullStreams {
  const require = createRequire(__filename);
  const codexEntrypoint = require.resolve("@openai/codex/bin/codex.js");
  return spawn(process.execPath, [codexEntrypoint, "app-server", "--listen", "stdio://"], {
    env: buildCodexAppServerEnvironment(process.env),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
}

export function buildCodexAppServerEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...source };
}

function emptyRuntimeState(): CodexAppServerRuntimeState {
  const unread = { state: "not-read" as const, count: null, summary: "Not queried yet.", details: [] };
  return {
    userAgent: null,
    codexHome: null,
    cwd: null,
    model: null,
    reasoningEffort: null,
    approvalPolicy: null,
    approvalsReviewer: null,
    sandbox: null,
    capabilitySummary: {
      configRead: unread,
      mcpServers: unread,
      skills: unread,
      apps: unread,
      plugins: unread,
    },
  };
}

function normalizeItem(item: Record<string, unknown>): CodexAppServerThreadItem {
  if (item.type === "agentMessage") {
    return { type: "agent_message", text: String(item.text ?? "") };
  }
  if (item.type === "commandExecution") {
    return { ...item, type: "command_execution", command: String(item.command ?? ""), status: stringOrNull(item.status) ?? undefined };
  }
  if (item.type === "fileChange") {
    return { ...item, type: "file_change", changes: Array.isArray(item.changes) ? item.changes : [], status: stringOrNull(item.status) ?? undefined };
  }
  if (item.type === "mcpToolCall") {
    return { ...item, type: "mcp_tool_call", status: stringOrNull(item.status) ?? undefined };
  }
  return { ...item, type: String(item.type ?? "unknown"), status: stringOrNull(item.status) ?? undefined };
}

function normalizeUserInputRequest(requestId: string, params: Record<string, unknown>): CodexAppServerPendingUserInput {
  const questions = Array.isArray(params.questions) ? params.questions : [];
  return {
    requestId,
    threadId: String(params.threadId ?? ""),
    turnId: String(params.turnId ?? ""),
    itemId: String(params.itemId ?? ""),
    questions: questions.map((question, index) => {
      const record = asRecord(question);
      const options = Array.isArray(record.options) ? record.options : [];
      return {
        id: String(record.id ?? `question_${index + 1}`),
        header: String(record.header ?? record.id ?? `Question ${index + 1}`),
        question: String(record.question ?? record.prompt ?? ""),
        options: options.map((option) => {
          const optionRecord = asRecord(option);
          return {
            label: String(optionRecord.label ?? ""),
            description: String(optionRecord.description ?? ""),
          };
        }),
      };
    }),
  };
}

function normalizeMcpElicitationRequest(requestId: string, params: Record<string, unknown>): CodexAppServerPendingMcpElicitation {
  const mode = stringOrNull(params.mode) ?? "unsupported";
  const supportedModes = new Set(["form", "openai/form", "url"]);
  const responseSupported = supportedModes.has(mode);
  const requestedSchema = params.requestedSchema;
  return {
    requestId,
    threadId: String(params.threadId ?? ""),
    turnId: stringOrNull(params.turnId),
    serverName: String(params.serverName ?? "unknown-mcp-server"),
    mode,
    message: sanitizeDetail(String(params.message ?? "MCP server requested operator input.")),
    responseSupported,
    unsupportedReason: responseSupported
      ? null
      : `Codex App Server MCP elicitation mode ${mode} is not supported by the pinned runtime response adapter.`,
    elicitationId: stringOrNull(params.elicitationId),
    url: mode === "url" ? stringOrNull(params.url) : null,
    requestedSchemaSummary: summarizeMcpElicitationSchema(mode, requestedSchema),
    fields: mode === "form" ? normalizeMcpElicitationFields(requestedSchema) : [],
  };
}

function normalizeMcpElicitationFields(schema: unknown): CodexAppServerMcpElicitationField[] {
  const record = asNullableRecord(schema);
  const properties = asNullableRecord(record?.properties);
  if (!properties) {
    return [];
  }
  const required = new Set(Array.isArray(record?.required) ? record.required.map(String) : []);
  return Object.entries(properties).slice(0, 12).map(([id, value]) => {
    const property = asRecord(value);
    return {
      id,
      title: sanitizeDetail(String(property.title ?? id)),
      description: sanitizeDetail(String(property.description ?? "")),
      type: summarizeMcpElicitationFieldType(property),
      required: required.has(id),
      options: normalizeMcpElicitationOptions(property),
    };
  });
}

function summarizeMcpElicitationFieldType(property: Record<string, unknown>): string {
  const type = stringOrNull(property.type) ?? "unknown";
  if (Array.isArray(property.enum) || Array.isArray(property.oneOf)) {
    return `${type} enum`;
  }
  const items = asNullableRecord(property.items);
  if (items && (Array.isArray(items.enum) || Array.isArray(items.anyOf))) {
    return `${type} enum`;
  }
  return type;
}

function normalizeMcpElicitationOptions(property: Record<string, unknown>): Array<{ value: string; label: string }> {
  if (Array.isArray(property.enum)) {
    const names = Array.isArray(property.enumNames) ? property.enumNames : [];
    return property.enum.slice(0, 12).map((value, index) => ({
      value: String(value),
      label: sanitizeDetail(String(names[index] ?? value)),
    }));
  }
  if (Array.isArray(property.oneOf)) {
    return property.oneOf.slice(0, 12).map((option) => {
      const record = asRecord(option);
      const value = String(record.const ?? "");
      return { value, label: sanitizeDetail(String(record.title ?? value)) };
    });
  }
  const items = asNullableRecord(property.items);
  if (Array.isArray(items?.enum)) {
    return items.enum.slice(0, 12).map((value) => ({
      value: String(value),
      label: sanitizeDetail(String(value)),
    }));
  }
  if (Array.isArray(items?.anyOf)) {
    return items.anyOf.slice(0, 12).map((option) => {
      const record = asRecord(option);
      const value = String(record.const ?? "");
      return { value, label: sanitizeDetail(String(record.title ?? value)) };
    });
  }
  return [];
}

function summarizeMcpElicitationSchema(mode: string, schema: unknown): string {
  if (mode === "url") {
    return "URL-mode MCP elicitation.";
  }
  const record = asNullableRecord(schema);
  if (!record) {
    return "No structured schema was provided.";
  }
  const properties = asNullableRecord(record.properties);
  if (properties) {
    const fieldNames = Object.keys(properties).slice(0, 12);
    return fieldNames.length
      ? `Fields: ${fieldNames.join(", ")}`
      : "Structured schema contains no fields.";
  }
  const keys = Object.keys(record).filter((key) => !isSensitiveConfigKey(key)).slice(0, 12);
  return keys.length ? `Schema keys: ${keys.join(", ")}` : "Structured schema contains no observable keys.";
}

function normalizeMcpElicitationAction(action: CodexAppServerMcpElicitationAction): CodexAppServerMcpElicitationAction {
  return action === "decline" || action === "cancel" ? action : "accept";
}

function sandboxPolicyFromThreadOptions(options: CodexAppServerThreadOptions): CodexAppServerSandboxPolicy {
  if (options.sandboxMode === "workspace-write") {
    return {
      type: "workspaceWrite",
      writableRoots: options.writableRoots?.length ? options.writableRoots : [options.workingDirectory],
      networkAccess: options.networkAccessEnabled ?? true,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false,
    };
  }
  return { type: "dangerFullAccess" };
}

function approvalResponseForMethod(
  method: string,
  params: Record<string, unknown>,
  decision: CodexAppServerApprovalDecision["decision"],
): CodexAppServerApprovalResponse {
  if (
    method === codexAppServerMethods.legacyExecCommandApproval ||
    method === codexAppServerMethods.legacyApplyPatchApproval
  ) {
    return { decision: decision === "approve" ? "approved" : "denied" };
  }
  if (method === codexAppServerMethods.permissionsApprovalRequest) {
    return decision === "approve"
      ? permissionApprovalResponse(params)
      : { permissions: {}, scope: "turn" };
  }
  return { decision: decision === "approve" ? "accept" : "reject" };
}

function permissionApprovalResponse(params: Record<string, unknown>): CodexAppServerPermissionsApprovalResponse {
  const requested = asRecord(params.permissions);
  const permissions: CodexAppServerPermissionsApprovalResponse["permissions"] = {};
  if (requested.network !== null && requested.network !== undefined) {
    permissions.network = requested.network;
  }
  if (requested.fileSystem !== null && requested.fileSystem !== undefined) {
    permissions.fileSystem = requested.fileSystem;
  }
  return { permissions, scope: "turn" };
}

function normalizeApprovalRequest(
  requestId: string,
  params: Record<string, unknown>,
  ownership: NormalizedServerRequestOwnership,
  thread: JsonlCodexAppServerThread,
  type: CodexAppServerPendingApproval["type"],
): CodexAppServerPendingApproval {
  const active = thread.activeTurn;
  const commandDisplay = type === "command" ? commandDisplayFromParams(params) : null;
  const fileChangeSummary = type === "file-change" ? fileChangeSummaryFromParams(params) : null;
  const permissionSummary = type === "permission" ? permissionSummaryFromParams(params) : null;
  return {
    requestId,
    type,
    threadId: ownership.threadId ?? thread.id ?? active?.threadId ?? null,
    turnId: ownership.turnId ?? active?.turnId ?? null,
    itemId: stringOrNull(params.itemId) ?? stringOrNull(params.callId) ?? stringOrNull(params.approvalId),
    commandDisplay,
    fileChangeSummary,
    permissionSummary,
    impactSummary: impactSummaryForApproval(type, params, commandDisplay, fileChangeSummary, permissionSummary),
  };
}

function impactSummaryForApproval(
  type: CodexAppServerPendingApproval["type"],
  params: Record<string, unknown>,
  commandDisplay: string | null,
  fileChangeSummary: string | null,
  permissionSummary: string | null,
): string {
  if (type === "command") {
    return commandImpactSummaryFromParams(params, commandDisplay);
  }
  if (type === "file-change") {
    return fileChangeImpactSummaryFromParams(params, fileChangeSummary);
  }
  return permissionImpactSummaryFromParams(params, permissionSummary);
}

function commandImpactSummaryFromParams(params: Record<string, unknown>, commandDisplay: string | null): string {
  const tokens = commandTokens(params);
  const terminationSummary = processTerminationImpactSummary(tokens, commandDisplay);
  if (terminationSummary) {
    return terminationSummary;
  }
  const dependencySummary = dependencyCommandImpactSummary(tokens);
  if (dependencySummary) {
    return dependencySummary;
  }
  return "Codex wants permission to run a command in the selected project workspace. Review the exact command below before deciding.";
}

function processTerminationImpactSummary(tokens: string[], commandDisplay: string | null): string | null {
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  const commandText = commandDisplay ?? tokens.join(" ");
  if (lowerTokens.includes("taskkill") || /(\b|\\)taskkill(\.exe)?\b/i.test(commandText)) {
    const pid = optionValue(tokens, ["/pid", "-pid"]);
    if (pid) {
      return `Codex wants to stop a running process. This may close an application that is currently running. Target process ID: ${pid}.`;
    }
    const image = optionValue(tokens, ["/im", "-im"]);
    if (image) {
      return `Codex wants to stop a running application or process named ${image}. If it is currently open, it will be closed.`;
    }
    return "Codex wants to stop one or more running processes. This may close applications that are currently open.";
  }
  if (lowerTokens.includes("stop-process") || /\bstop-process\b/i.test(commandText)) {
    const pid = optionValue(tokens, ["-id", "id"]);
    if (pid) {
      return `Codex wants to stop a running process. This may close an application that is currently running. Target process ID: ${pid}.`;
    }
    const name = optionValue(tokens, ["-name", "name"]);
    if (name) {
      return `Codex wants to stop a running application or process named ${name}. If it is currently open, it will be closed.`;
    }
    return "Codex wants to stop one or more running processes. This may close applications that are currently open.";
  }
  return null;
}

function dependencyCommandImpactSummary(tokens: string[]): string | null {
  const command = normalizedCommandName(tokens[0] ?? "");
  const subcommand = (tokens[1] ?? "").toLowerCase();
  if (command === "npm" && (subcommand === "ci" || subcommand === "install")) {
    return "Codex wants to install or replace dependencies for the selected project. This may change the project's dependency tree and files used by a running project.";
  }
  if ((command === "pnpm" || command === "yarn") && subcommand === "install") {
    return "Codex wants to install or replace dependencies for the selected project. This may change the project's dependency tree and files used by a running project.";
  }
  if (command === "winget" && (subcommand === "install" || subcommand === "configure")) {
    return "Codex wants to install or configure software on Windows. This may change machine-level applications or development tools, not just project files.";
  }
  return null;
}

function fileChangeImpactSummaryFromParams(
  params: Record<string, unknown>,
  fileChangeSummary: string | null,
): string {
  const paths = fileChangePathsFromParams(params);
  if (paths.length) {
    return `Codex wants to modify project files. Targets: ${compactList(paths, 5)}.`;
  }
  const count = fileChangeCountFromParams(params);
  if (count !== null) {
    return `Codex wants to modify ${count} project ${count === 1 ? "file" : "files"}.`;
  }
  return fileChangeSummary
    ? `Codex wants permission to modify project files. Details: ${fileChangeSummary}`
    : "Codex wants permission to modify project files.";
}

function permissionImpactSummaryFromParams(
  params: Record<string, unknown>,
  permissionSummary: string | null,
): string {
  const permissions = asRecord(params.permissions);
  const parts: string[] = [];
  if (permissions.network !== null && permissions.network !== undefined) {
    const targets = permissionTargets(permissions.network, ["targets", "target", "hosts", "host", "domains", "domain", "urls", "url", "origins", "origin"]);
    parts.push(targets.length
      ? `Codex wants temporary network access for this turn. Requested targets: ${compactList(targets, 5)}.`
      : "Codex wants temporary network access for this turn.");
  }
  if (permissions.fileSystem !== null && permissions.fileSystem !== undefined) {
    const entries = permissionTargets(permissions.fileSystem, ["entries", "entry", "paths", "path", "roots", "root", "writableRoots", "read", "write"]);
    parts.push(entries.length
      ? `Codex wants temporary filesystem access for this turn. Requested entries: ${compactList(entries, 5)}.`
      : "Codex wants temporary filesystem access for this turn.");
  }
  if (parts.length) {
    return parts.join(" ");
  }
  return permissionSummary
    ? "Codex wants a temporary permission grant for this turn. Review the requested permission detail below before deciding."
    : "Codex wants a temporary permission grant for this turn.";
}

function commandDisplayFromParams(params: Record<string, unknown>): string | null {
  const command = params.command;
  if (Array.isArray(command)) {
    return command.map(String).join(" ");
  }
  if (typeof command === "string") {
    return command;
  }
  return firstString(params, ["cmd", "commandLine", "displayCommand"]);
}

function fileChangeSummaryFromParams(params: Record<string, unknown>): string {
  const changes = Array.isArray(params.changes) ? params.changes : null;
  if (changes) {
    const paths = fileChangePathsFromChanges(changes);
    return paths.length
      ? `${changes.length} file change(s) requested: ${compactList(paths, 6)}`
      : `${changes.length} file change(s) requested.`;
  }
  const fileChanges = asNullableRecord(params.fileChanges);
  if (fileChanges) {
    const paths = Object.keys(fileChanges).slice(0, 6);
    return paths.length
      ? `${paths.length} file change target(s): ${paths.join(", ")}`
      : "File changes requested.";
  }
  return "File changes requested.";
}

function permissionSummaryFromParams(params: Record<string, unknown>): string {
  const permissions = asRecord(params.permissions);
  const parts: string[] = [];
  if (permissions.network !== null && permissions.network !== undefined) {
    parts.push(`network ${compactJsonSummary(permissions.network)}`);
  }
  if (permissions.fileSystem !== null && permissions.fileSystem !== undefined) {
    parts.push(`file system ${compactJsonSummary(permissions.fileSystem)}`);
  }
  return parts.length ? parts.join("; ") : "Permission details were not provided.";
}

function compactJsonSummary(value: unknown): string {
  try {
    const text = JSON.stringify(redactSensitiveFields(value));
    return text.length > 180 ? `${text.slice(0, 180)}...` : text;
  } catch {
    return String(value);
  }
}

function fileChangePathsFromParams(params: Record<string, unknown>): string[] {
  const changes = Array.isArray(params.changes) ? params.changes : null;
  if (changes) {
    return fileChangePathsFromChanges(changes);
  }
  const fileChanges = asNullableRecord(params.fileChanges);
  if (fileChanges) {
    return Object.keys(fileChanges);
  }
  return [];
}

function fileChangePathsFromChanges(changes: unknown[]): string[] {
  return uniqueStrings(changes.flatMap((change) => {
    if (typeof change === "string") {
      return [change];
    }
    const record = asNullableRecord(change);
    if (!record) {
      return [];
    }
    const path = firstString(record, ["path", "filePath", "targetPath", "target", "relativePath", "destinationPath"]);
    return path ? [path] : [];
  }));
}

function fileChangeCountFromParams(params: Record<string, unknown>): number | null {
  if (Array.isArray(params.changes)) {
    return params.changes.length;
  }
  const fileChanges = asNullableRecord(params.fileChanges);
  if (fileChanges) {
    return Object.keys(fileChanges).length;
  }
  return null;
}

function permissionTargets(value: unknown, keys: string[]): string[] {
  const collected: string[] = [];
  collectPermissionTargets(value, new Set(keys.map((key) => key.toLowerCase())), collected);
  return uniqueStrings(collected);
}

function collectPermissionTargets(value: unknown, keys: Set<string>, collected: string[]): void {
  if (typeof value === "string") {
    collected.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPermissionTargets(item, keys, collected);
    }
    return;
  }
  const record = asNullableRecord(value);
  if (!record) {
    return;
  }
  for (const [key, entry] of Object.entries(record)) {
    if (!keys.has(key.toLowerCase())) {
      continue;
    }
    collectPermissionTargets(entry, keys, collected);
  }
}

function compactList(values: string[], limit: number): string {
  const visible = values.slice(0, limit);
  const remaining = values.length - visible.length;
  return remaining > 0 ? `${visible.join(", ")} (+${remaining} more)` : visible.join(", ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))];
}

function optionValue(tokens: string[], optionNames: string[]): string | null {
  const options = new Set(optionNames.map((option) => option.toLowerCase()));
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const lower = token.toLowerCase();
    if (options.has(lower)) {
      return tokens[index + 1] ?? null;
    }
    for (const option of options) {
      if (lower.startsWith(`${option}:`) || lower.startsWith(`${option}=`)) {
        return token.slice(option.length + 1);
      }
    }
  }
  return null;
}

function normalizedCommandName(value: string): string {
  return pathBasenameLower(value).replace(/\.(cmd|exe|ps1|bat)$/i, "");
}

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }
  const record = asNullableRecord(value);
  if (!record) {
    return value;
  }
  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [
    key,
    /token|secret|password|authorization|credential|api[-_]?key/i.test(key)
      ? "[redacted]"
      : redactSensitiveFields(entry),
  ]));
}

function approvalDecisionLabel(response: CodexAppServerApprovalResponse): string {
  if ("scope" in response) {
    const granted = Object.keys(response.permissions).length > 0;
    return granted
      ? response.scope === "turn" ? "grant-turn" : String(response.scope)
      : "deny";
  }
  return response.decision;
}

function catastrophicCommandDenial(
  params: Record<string, unknown>,
  protectedProcess: ProtectedProcessIdentity,
): CatastrophicCommandDenial | null {
  const commandText = commandDisplayFromParams(params);
  if (!commandText) {
    return null;
  }
  const tokenCandidates = commandTokenCandidates(params);
  if (tokenCandidates.some((tokens) => targetsProtectedProcess(tokens, protectedProcess))) {
    return "protected-process";
  }
  if (tokenCandidates.some(targetsMachineSessionTermination)) {
    return "machine-session";
  }
  if (tokenCandidates.some(targetsWindowsServiceControl)) {
    return "windows-service";
  }
  return null;
}

function catastrophicCommandDenialMessage(denial: CatastrophicCommandDenial): string {
  if (denial === "protected-process") {
    return "ChampCity denied a command that would terminate the active ChampCity A/I application.";
  }
  if (denial === "machine-session") {
    return "ChampCity denied a command that would restart, shut down, or log off the local machine.";
  }
  return "ChampCity denied a command that would stop, restart, or disable a Windows service.";
}

function targetsProtectedProcess(
  tokens: string[],
  protectedProcess: ProtectedProcessIdentity,
): boolean {
  const commandText = tokens.join(" ");
  return targetsProtectedTaskkill(tokens, commandText, protectedProcess) ||
    targetsProtectedStopProcess(tokens, commandText, protectedProcess);
}

function targetsMachineSessionTermination(tokens: string[]): boolean {
  const command = normalizedCommandName(tokens[0] ?? "");
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  if (command === "restart-computer" || command === "stop-computer" || command === "logoff") {
    return true;
  }
  if (command !== "shutdown") {
    return false;
  }
  return lowerTokens.some((token) => token === "/s" || token === "-s" ||
    token === "/r" || token === "-r" ||
    token === "/g" || token === "-g" ||
    token === "/l" || token === "-l" ||
    token === "/p" || token === "-p");
}

function targetsWindowsServiceControl(tokens: string[]): boolean {
  const command = normalizedCommandName(tokens[0] ?? "");
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  if (command === "stop-service" || command === "restart-service") {
    return true;
  }
  if (command === "set-service") {
    const startupType = optionValue(tokens, ["-startuptype", "startuptype"]);
    const status = optionValue(tokens, ["-status", "status"]);
    return startupType?.toLowerCase() === "disabled" ||
      status?.toLowerCase() === "stopped";
  }
  if (command === "sc") {
    const subcommand = lowerTokens[1] ?? "";
    if (subcommand === "stop") {
      return true;
    }
    if (subcommand === "config") {
      return lowerTokens.some((token, index) => {
        if (token === "start=") {
          return lowerTokens[index + 1] === "disabled";
        }
        return token === "start=disabled";
      });
    }
  }
  return command === "net" && lowerTokens[1] === "stop";
}

function commandTokenCandidates(params: Record<string, unknown>): string[][] {
  const tokens = commandTokens(params);
  const candidates = [tokens];
  const unwrapped = unwrapSimpleShellCommand(tokens);
  if (unwrapped.length) {
    candidates.push(unwrapped);
  }
  return candidates;
}

function unwrapSimpleShellCommand(tokens: string[]): string[] {
  const command = normalizedCommandName(tokens[0] ?? "");
  if (command === "powershell" || command === "pwsh") {
    const index = tokens.findIndex((token) => {
      const lower = token.toLowerCase();
      return lower === "-command" || lower === "-commandstring" || lower === "-c";
    });
    if (index >= 0 && tokens[index + 1]) {
      return tokenizeCommandText(tokens.slice(index + 1).join(" "));
    }
  }
  if (command === "cmd") {
    const index = tokens.findIndex((token) => token.toLowerCase() === "/c");
    if (index >= 0 && tokens[index + 1]) {
      return tokenizeCommandText(tokens.slice(index + 1).join(" "));
    }
  }
  return [];
}

function tokenizeCommandText(text: string): string[] {
  return text.match(/"[^"]+"|'[^']+'|\S+/g)?.map((token) => token.replace(/^['"]|['"]$/g, "")) ?? [];
}

function commandTokens(params: Record<string, unknown>): string[] {
  const command = params.command;
  if (Array.isArray(command)) {
    return command.map(String);
  }
  const text = commandDisplayFromParams(params) ?? "";
  return tokenizeCommandText(text);
}

function targetsProtectedTaskkill(
  tokens: string[],
  commandText: string,
  protectedProcess: ProtectedProcessIdentity,
): boolean {
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  if (!lowerTokens.includes("taskkill") && !/(\b|\\)taskkill(\.exe)?\b/i.test(commandText)) {
    return false;
  }
  const protectedPid = String(protectedProcess.pid);
  const protectedImage = pathBasenameLower(protectedProcess.execPath);
  for (let index = 0; index < lowerTokens.length; index += 1) {
    const token = lowerTokens[index];
    const next = lowerTokens[index + 1] ?? "";
    if ((token === "/pid" || token === "-pid") && next === protectedPid) {
      return true;
    }
    if ((token === "/im" || token === "-im") && normalizeProcessName(next) === normalizeProcessName(protectedImage)) {
      return true;
    }
  }
  return new RegExp(`(?:/pid|-pid)\\s+${escapeRegExp(protectedPid)}\\b`, "i").test(commandText) ||
    new RegExp(`(?:/im|-im)\\s+["']?${escapeRegExp(protectedImage)}["']?\\b`, "i").test(commandText);
}

function targetsProtectedStopProcess(
  tokens: string[],
  commandText: string,
  protectedProcess: ProtectedProcessIdentity,
): boolean {
  const lowerTokens = tokens.map((token) => token.toLowerCase());
  if (!lowerTokens.includes("stop-process") && !/\bstop-process\b/i.test(commandText)) {
    return false;
  }
  const protectedPid = String(protectedProcess.pid);
  const protectedImage = pathBasenameLower(protectedProcess.execPath);
  const protectedName = normalizeProcessName(protectedImage);
  for (let index = 0; index < lowerTokens.length; index += 1) {
    const token = lowerTokens[index];
    const next = lowerTokens[index + 1] ?? "";
    if ((token === "-id" || token === "id") && next === protectedPid) {
      return true;
    }
    if ((token === "-name" || token === "name") && normalizeProcessName(next) === protectedName) {
      return true;
    }
  }
  return new RegExp(`(?:-id|\\bid\\b)\\s+${escapeRegExp(protectedPid)}\\b`, "i").test(commandText) ||
    new RegExp(`(?:-name|\\bname\\b)\\s+["']?${escapeRegExp(protectedName)}(?:\\.exe)?["']?\\b`, "i").test(commandText);
}

function pathBasenameLower(value: string): string {
  return value.split(/[\\/]/).pop()?.toLowerCase() ?? value.toLowerCase();
}

function normalizeProcessName(value: string): string {
  return value.toLowerCase().replace(/\.exe$/i, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface NormalizedServerRequestOwnership {
  requestId: string;
  threadId: string | null;
  turnId: string | null;
}

function normalizeServerRequestOwnership(
  request: JsonRpcRequest,
  params: Record<string, unknown>,
): NormalizedServerRequestOwnership {
  return {
    requestId: String(request.id),
    threadId: stringOrNull(params.threadId) ?? stringOrNull(params.conversationId),
    turnId: stringOrNull(params.turnId),
  };
}

function normalizeCapabilityRead(
  method: string,
  value: unknown,
): { summary: string; details: string[] } {
  const details = capabilityDetailsForMethod(method, value).slice(0, 12);
  if (details.length === 0) {
    return { summary: "Observed through Codex App Server.", details };
  }
  return {
    summary: details.join("; "),
    details,
  };
}

function capabilityDetailsForMethod(method: string, value: unknown): string[] {
  if (method === codexAppServerMethods.configRead) {
    return summarizeConfigRead(value);
  }
  if (method === codexAppServerMethods.mcpServerStatusList) {
    return summarizeNamedEntries(value, ["statuses", "servers", "items", "entries"], "mcp");
  }
  if (method === codexAppServerMethods.skillsList) {
    return summarizeNamedEntries(value, ["skills", "items", "entries"], "skill");
  }
  if (method === codexAppServerMethods.appsInstalled) {
    return summarizeNamedEntries(value, ["apps", "items", "entries"], "app");
  }
  if (method === codexAppServerMethods.pluginsInstalled) {
    return summarizeNamedEntries(value, ["plugins", "items", "entries"], "plugin");
  }
  return [];
}

function summarizeNamedEntries(value: unknown, arrayKeys: string[], fallbackLabel: string): string[] {
  const entries = arrayFromKnownKeys(value, arrayKeys);
  return entries.map((entry, index) => {
    const record = asRecord(entry);
    const identity = firstString(record, [
      "name",
      "id",
      "serverName",
      "pluginId",
      "appId",
      "skillName",
      "label",
      "title",
      "displayName",
      "packageName",
    ]) ?? `${fallbackLabel}-${index + 1}`;
    const status = firstString(record, ["status", "state", "availability", "enabled"]);
    return status ? `${identity} (${status})` : identity;
  });
}

function summarizeConfigRead(value: unknown): string[] {
  const details: string[] = [];
  collectConfigDetails(value, [], details);
  return details;
}

function collectConfigDetails(value: unknown, pathParts: string[], details: string[]): void {
  if (details.length >= 12 || pathParts.length > 4) {
    return;
  }
  if (Array.isArray(value)) {
    if (isConfigPathObservable(pathParts)) {
      const labels = value.map((item) => compactValueLabel(item)).filter(Boolean).slice(0, 8);
      if (labels.length) {
        details.push(`${pathParts.join(".")}: ${labels.join(", ")}`);
      }
    }
    for (const item of value) {
      collectConfigDetails(item, pathParts, details);
      if (details.length >= 12) {
        return;
      }
    }
    return;
  }
  const record = asNullableRecord(value);
  if (!record) {
    if (pathParts.length && isConfigPathObservable(pathParts)) {
      const label = compactValueLabel(value);
      if (label) {
        details.push(`${pathParts.join(".")}: ${label}`);
      }
    }
    return;
  }
  for (const [key, nested] of Object.entries(record)) {
    if (isSensitiveConfigKey(key)) {
      continue;
    }
    const nextPath = [...pathParts, key];
    if (isConfigPathObservable(nextPath)) {
      const label = compactValueLabel(nested);
      if (label) {
        details.push(`${nextPath.join(".")}: ${label}`);
      }
    }
    collectConfigDetails(nested, nextPath, details);
    if (details.length >= 12) {
      return;
    }
  }
}

function compactValueLabel(value: unknown): string | null {
  if (typeof value === "boolean") {
    return value ? "enabled" : "disabled";
  }
  if (typeof value === "string") {
    return sanitizeDetail(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const labels = value.map((item) => compactValueLabel(item)).filter(Boolean).slice(0, 8);
    return labels.length ? labels.join(", ") : null;
  }
  const record = asNullableRecord(value);
  if (!record) {
    return null;
  }
  const identity = firstString(record, ["name", "id", "type", "status", "state", "enabled"]);
  if (identity) {
    return sanitizeDetail(identity);
  }
  const keys = Object.keys(record).filter((key) => !isSensitiveConfigKey(key)).slice(0, 6);
  return keys.length ? `{${keys.join(",")}}` : null;
}

function arrayFromKnownKeys(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = asNullableRecord(value);
  if (!record) {
    return [];
  }
  for (const key of keys) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      return nested;
    }
  }
  return [];
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return sanitizeDetail(value);
    }
    if (typeof value === "boolean") {
      return value ? "enabled" : "disabled";
    }
  }
  return null;
}

function isConfigPathObservable(pathParts: string[]): boolean {
  const pathText = pathParts.join(".").toLowerCase();
  return /(^|\.)(web|websearch|web_search|tools|tool|builtin_tools|enabledtools|disabledtools|mcp|browser)(\.|$)/.test(pathText);
}

function isSensitiveConfigKey(key: string): boolean {
  return /secret|token|password|credential|apikey|api_key|auth|cookie/i.test(key);
}

function sanitizeDetail(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

function countTopLevelItems(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length;
  }
  const record = asNullableRecord(value);
  if (!record) {
    return null;
  }
  for (const key of ["items", "entries", "plugins", "apps", "skills", "servers", "statuses", "tools"]) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      return nested.length;
    }
  }
  return Object.keys(record).length;
}

function summarizeSandbox(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  return stringOrNull(asNullableRecord(value)?.type);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asNullableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForChildExit(childExit: Promise<void> | null, timeoutMs: number): Promise<boolean> {
  if (!childExit) {
    return true;
  }
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      childExit.then(() => true),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
