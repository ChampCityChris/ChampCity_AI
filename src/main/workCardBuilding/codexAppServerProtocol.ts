// Method names and payload shapes are copied from the pinned @openai/codex
// 0.146.0 output of `codex app-server generate-ts`.

export const codexAppServerMethods = {
  initialize: "initialize",
  initialized: "initialized",
  threadStart: "thread/start",
  threadStarted: "thread/started",
  turnStart: "turn/start",
  turnStarted: "turn/started",
  turnCompleted: "turn/completed",
  turnInterrupt: "turn/interrupt",
  itemCompleted: "item/completed",
  error: "error",
  configRead: "config/read",
  mcpServerStatusList: "mcpServerStatus/list",
  skillsList: "skills/list",
  appsInstalled: "app/installed",
  pluginsInstalled: "plugin/installed",
  commandApprovalRequest: "item/commandExecution/requestApproval",
  fileChangeApprovalRequest: "item/fileChange/requestApproval",
  permissionsApprovalRequest: "item/permissions/requestApproval",
  mcpElicitationRequest: "mcpServer/elicitation/request",
  toolRequestUserInput: "item/tool/requestUserInput",
  legacyExecCommandApproval: "execCommandApproval",
  legacyApplyPatchApproval: "applyPatchApproval",
} as const;

export type CodexAppServerMethod =
  (typeof codexAppServerMethods)[keyof typeof codexAppServerMethods];

export interface CodexAppServerInitializeParams {
  clientInfo: {
    name: string;
    title?: string;
    version?: string;
  };
  capabilities: Record<string, unknown> | null;
}

export interface CodexAppServerInitializeResponse {
  userAgent: string;
  codexHome: string;
  platformFamily?: string;
  platformOs?: string;
}

export interface CodexAppServerThreadStartParams {
  cwd?: string | null;
  approvalPolicy?: "on-request" | null;
  approvalsReviewer?: "user" | null;
  sandbox?: "danger-full-access" | "workspace-write" | null;
  serviceName?: string | null;
  ephemeral?: boolean | null;
}

export interface CodexAppServerThreadStartResponse {
  thread: { id: string };
  model: string;
  modelProvider?: string;
  serviceTier?: string | null;
  cwd: string;
  instructionSources?: string[];
  approvalPolicy: string;
  approvalsReviewer: string;
  sandbox: unknown;
  reasoningEffort: string | null;
}

export type CodexAppServerSandboxPolicy =
  | { type: "dangerFullAccess" }
  | { type: "readOnly"; networkAccess: boolean }
  | { type: "workspaceWrite"; writableRoots: string[]; networkAccess: boolean; excludeTmpdirEnvVar: boolean; excludeSlashTmp: boolean };

export type CodexAppServerUserInput =
  | { type: "text"; text: string; text_elements: unknown[] }
  | { type: "image"; detail?: string; url: string }
  | { type: "localImage"; detail?: string; path: string }
  | { type: "audio"; url: string }
  | { type: "localAudio"; path: string }
  | { type: "skill"; name: string; path: string }
  | { type: "mention"; name: string; path: string };

export interface CodexAppServerTurnStartParams {
  threadId: string;
  input: CodexAppServerUserInput[];
  cwd?: string | null;
  approvalPolicy?: "on-request" | null;
  approvalsReviewer?: "user" | null;
  sandboxPolicy?: CodexAppServerSandboxPolicy | null;
}

export interface CodexAppServerTurnStartResponse {
  turn: { id: string; status?: string };
}

export interface CodexAppServerTurnInterruptParams {
  threadId: string;
  turnId: string;
}

export interface CodexAppServerToolRequestUserInputResponse {
  answers: Record<string, { answers: string[] }>;
}

export type CodexAppServerMcpElicitationAction = "accept" | "decline" | "cancel";

export interface CodexAppServerMcpElicitationRequestResponse {
  action: CodexAppServerMcpElicitationAction;
  content: unknown | null;
  _meta: unknown | null;
}

export type CodexAppServerLegacyApprovalResponse = {
  decision: "approved" | "denied";
};

export type CodexAppServerCommandApprovalResponse = {
  decision: "accept" | "reject";
};

export type CodexAppServerFileChangeApprovalResponse = {
  decision: "accept" | "reject";
};

export type CodexAppServerPermissionsApprovalResponse = {
  permissions: {
    network?: unknown;
    fileSystem?: unknown;
  };
  scope: "turn";
};
