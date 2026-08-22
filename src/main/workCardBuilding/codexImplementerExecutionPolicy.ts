export type CodexImplementerSandboxMode = "danger-full-access";
export type CodexImplementerApprovalPolicy = "on-request";
export type CodexImplementerApprovalsReviewer = "user";

export interface CodexImplementerExecutionPolicy {
  sandboxMode: CodexImplementerSandboxMode;
  approvalPolicy: CodexImplementerApprovalPolicy;
  approvalsReviewer: CodexImplementerApprovalsReviewer;
  networkAccessEnabled: boolean;
}

export type CodexImplementerExecutionPolicyResolver = () => CodexImplementerExecutionPolicy;

export function resolveDefaultCodexImplementerExecutionPolicy(): CodexImplementerExecutionPolicy {
  return {
    sandboxMode: "danger-full-access",
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
