import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  CodexImplementerExecutionModel,
  CodexImplementerExecutionState,
} from "../../shared/workspaceContracts";
import type { ThreadEvent, ThreadItem, ThreadOptions, TurnOptions } from "@openai/codex-sdk";
import {
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import { evaluateDocumentFreshness, listPlanningDocuments } from "../documents/planningDocumentService";
import { getCurrentWorkspaceModel } from "../currentWorkflow/currentWorkflowService";

export const CODEX_RUNTIME_UNAVAILABLE_MESSAGE =
  "Codex SDK or local Codex runtime is not available from this application environment. Install Codex locally, authenticate it, then refresh.";
export const CODEX_AUTH_UNAVAILABLE_MESSAGE =
  "Codex is not authenticated in this local environment. Run codex login in a terminal, sign in with ChatGPT or your chosen Codex authentication method, then refresh.";

const maxTailItems = 24;
const maxTailTextLength = 1200;
const finalReportReadAttempts = 6;
const finalReportReadDelayMs = 25;

export interface CodexThreadAdapter {
  readonly id: string | null;
  runStreamed(input: string, options?: TurnOptions): Promise<{ events: AsyncIterable<ThreadEvent> }>;
}

export interface CodexSdkAdapter {
  startThread(options?: ThreadOptions): CodexThreadAdapter;
}

export type CodexSdkAdapterFactory = () => Promise<CodexSdkAdapter>;

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
}

interface SessionRecord extends ExecutionContext {
  state: CodexImplementerExecutionState;
  startedAt: number | null;
  completedAt: number | null;
  eventTail: string[];
  stderrTail: string[];
  finalResponseTail: string[];
  failureReason: string | null;
  reportUpdated: boolean;
  reportSha256After: string | null;
  abortController: AbortController | null;
  cancellationRequested: boolean;
}

type CodexSdkModule = typeof import("@openai/codex-sdk");
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

  constructor(
    private readonly sdkFactory: CodexSdkAdapterFactory = loadCodexSdkAdapter,
    private readonly now: () => number = () => Date.now(),
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

    try {
      await this.sdkFactory();
    } catch (error) {
      return unavailableModelFromContext(context, messageForCodexFailure(error));
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

    let sdk: CodexSdkAdapter;
    try {
      sdk = await this.sdkFactory();
    } catch (error) {
      const retryBlocker = messageForCodexFailure(error);
      if (active) {
        return modelFromSession(active, this.now(), {
          canRunAgain: false,
          retryBlocker,
        });
      }
      return unavailableModelFromContext(context, retryBlocker);
    }

    const abortController = new AbortController();
    const session: SessionRecord = {
      ...context,
      state: "running",
      startedAt: this.now(),
      completedAt: null,
      eventTail: [],
      stderrTail: [],
      finalResponseTail: [],
      failureReason: null,
      reportUpdated: false,
      reportSha256After: null,
      abortController,
      cancellationRequested: false,
    };
    this.sessionsByWorkspaceRoot.set(key, session);
    void this.executeWithSdk(session, sdk);
    return modelFromSession(session, this.now(), {
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
    appendTail(active.eventTail, "cancel.requested");
    return modelFromSession(active, this.now(), {
      canRunAgain: false,
      retryBlocker: "Codex execution is already running for this workspace.",
    });
  }

  private async executeWithSdk(session: SessionRecord, sdk: CodexSdkAdapter): Promise<void> {
    const prompt = buildCodexImplementerPrompt(session);
    let terminalState: CodexImplementerExecutionState = "failed";
    let terminalFailureReason: string | null = "Codex execution failed.";
    try {
      const thread = sdk.startThread({
        workingDirectory: session.projectRoot,
        skipGitRepoCheck: true,
      });
      appendTail(session.eventTail, "sdk.thread.start requested");
      const streamed = await thread.runStreamed(prompt, {
        signal: session.abortController?.signal,
      });
      for await (const event of streamed.events) {
        appendTail(session.eventTail, summarizeEvent(event));
        if (event.type === "item.completed" && event.item.type === "agent_message") {
          appendTail(session.finalResponseTail, event.item.text);
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
      session.failureReason = terminalFailureReason;
      await refreshReportEvidence(session, terminalState);
      if (terminalState === "completed" && !session.reportUpdated) {
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
    try {
      await this.sdkFactory();
    } catch (error) {
      return {
        canRunAgain: false,
        retryBlocker: messageForCodexFailure(error),
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
  return `You are the Implementer for ChampCity A/I.

Working directory:
- The current process working directory is the selected project repository root.
- Do not modify files outside this repository root.
- Do not write absolute local machine paths into repository artifacts.

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
- Do not create an alternate report, sidecar, summary, execution packet, or completion marker.
- Implementation is incomplete until this exact report contains the complete auditable evidence required by the Approved Work Card and remains Pending for review.

Project instructions:
- Discover and follow project-local instructions, including AGENTS.md, README files, validation documents, package scripts, and repository-specific conventions.
- If project instructions conflict with the Approved Work Card, follow the Approved Work Card and document the conflict in the report.

Execution rules:
- Implement only the approved Work Card.
- Preserve all negative constraints in the Work Card.
- Do not stage, commit, push, tag, reset, clean, stash, or perform Git mutation unless the Work Card explicitly authorizes it.
- Do not introduce secrets, credentials, provider keys, environment-file contents, production endpoints, screenshots, archives, build outputs, or unrelated generated artifacts.
- Run the validation required by the Approved Work Card when possible.
- Record exact commands, working directory, exit codes, and result summaries in the Implementer Report.
- Map each acceptance criterion to evidence in the Implementer Report.
- Distinguish automated validation completed from Operator validation remaining.
- State any skipped validation, scope expansion, residual risk, or blocker.

Completion:
- When implementation and validation are complete, update only the existing Implementer Report at the required path.
- Leave the report disposition as Pending.
- End your final response with the report path and whether implementation is complete, blocked, or incomplete.
`;
}

async function loadCodexSdkAdapter(): Promise<CodexSdkAdapter> {
  const sdk = await importCodexSdkModule();
  return new sdk.Codex({
    env: buildCodexRuntimeEnvironment(process.env),
  });
}

async function importCodexSdkModule(): Promise<CodexSdkModule> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as
    (specifier: string) => Promise<CodexSdkModule>;
  return dynamicImport("@openai/codex-sdk");
}

function buildCodexRuntimeEnvironment(source: NodeJS.ProcessEnv): Record<string, string> {
  const allowedKeys = [
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "HOME",
    "APPDATA",
    "LOCALAPPDATA",
    "ComSpec",
    "PROCESSOR_ARCHITECTURE",
    "ProgramFiles",
    "ProgramFiles(x86)",
    "ProgramW6432",
  ];
  const env: Record<string, string> = {};
  for (const key of allowedKeys) {
    const value = source[key];
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
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
  };
}

function unavailableFromPreflight(context: Error): CodexImplementerExecutionModel {
  return {
    ...baseModel(null),
    state: "unavailable",
    failureReason: context.message,
    retryBlocker: context.message,
  };
}

function unavailableModel(workspaceRoot: string, failureReason: string): CodexImplementerExecutionModel {
  return {
    ...baseModel(path.resolve(workspaceRoot)),
    state: "unavailable",
    failureReason,
    retryBlocker: failureReason,
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
  };
}

function baseModel(projectRoot: string | null): CodexImplementerExecutionModel {
  return {
    state: "unavailable",
    lastRunState: null,
    canRunAgain: false,
    retryBlocker: null,
    integrationMode: "sdk",
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
    reportUpdated: false,
    reportSha256After: null,
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
  return {
    state: session.state,
    lastRunState,
    canRunAgain: retryReadiness.canRunAgain,
    retryBlocker: retryReadiness.retryBlocker,
    integrationMode: "sdk",
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
    failureReason: session.failureReason,
    reportUpdated: session.reportUpdated,
    reportSha256After: session.reportSha256After,
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

function summarizeEvent(event: ThreadEvent): string {
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
    case "item.started":
    case "item.updated":
    case "item.completed":
      return `${event.type} ${summarizeItem(event.item)}`;
  }
}

function summarizeItem(item: ThreadItem): string {
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
