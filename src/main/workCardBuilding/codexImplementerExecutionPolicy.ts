import type { CodexImplementerExecutionKind } from "../../shared/workspaceContracts";

export type CodexImplementerSandboxMode = "danger-full-access" | "workspace-write";
export type CodexImplementerApprovalPolicy = "on-request";
export type CodexImplementerApprovalsReviewer = "user";

export interface CodexImplementerExecutionPolicy {
  sandboxMode: CodexImplementerSandboxMode;
  approvalPolicy: CodexImplementerApprovalPolicy;
  approvalsReviewer: CodexImplementerApprovalsReviewer;
  networkAccessEnabled: boolean;
}

export type CodexImplementerExecutionPolicyResolver = (input: {
  executionKind: CodexImplementerExecutionKind;
  workspaceRoot: string;
}) => CodexImplementerExecutionPolicy;

export function resolveDefaultCodexImplementerExecutionPolicy(input: {
  executionKind: CodexImplementerExecutionKind;
  workspaceRoot: string;
}): CodexImplementerExecutionPolicy {
  return {
    sandboxMode: input.executionKind === "environment-resolution"
      ? "danger-full-access"
      : "workspace-write",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    networkAccessEnabled: true,
  };
}

export function threadOptionsFromCodexImplementerPolicy(
  policy: CodexImplementerExecutionPolicy,
): Pick<CodexImplementerExecutionPolicy, "sandboxMode" | "approvalPolicy" | "approvalsReviewer" | "networkAccessEnabled"> {
  return {
    sandboxMode: policy.sandboxMode,
    approvalPolicy: policy.approvalPolicy,
    approvalsReviewer: policy.approvalsReviewer,
    networkAccessEnabled: policy.networkAccessEnabled,
  };
}
