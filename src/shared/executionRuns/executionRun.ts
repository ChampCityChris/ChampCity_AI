import { estimateContextTokens } from "../contextPackets/contextPacket";

export type ExecutionRunStatus =
  | "planned"
  | "running"
  | "changes_required"
  | "operator_attention_required"
  | "blocked_by_governance_contradiction"
  | "failed"
  | "complete";

export type ExecutionPassStatus =
  | "planned"
  | "packet_compiled"
  | "implementer_running"
  | "implementer_complete"
  | "verifier_running"
  | "verified"
  | "changes_required"
  | "governance_contradiction"
  | "execution_failure";

export interface WorkCardAcceptanceRequirement {
  requirementId: string;
  type: "required_behavior" | "prohibition" | "required_test" | "required_evidence";
  statement: string;
  passIds: string[];
  noncompliantSubstitutions: string[];
  requiredBehavioralTests: string[];
}

export interface WorkCardAcceptanceContract {
  contractId: string;
  workCardArtifactId: string;
  workCardRevision: number;
  globalInvariants: Array<{ invariantId: string; statement: string }>;
  requirements: WorkCardAcceptanceRequirement[];
}

export interface ExecutionPassDefinition {
  passId: string;
  title: string;
  objective: string;
  requirementIds: string[];
  globalInvariantIds: string[];
  allowedRepositoryPaths: string[];
  requiredTests: string[];
  prerequisitePassIds: string[];
  expectedOutputs: string[];
}

export interface ExecutionPassPlan {
  planId: string;
  workCardArtifactId: string;
  workCardRevision: number;
  approvalArtifactId: string;
  acceptanceContractId: string;
  implementationBranch: string;
  passTokenBudget: number;
  passes: ExecutionPassDefinition[];
}

export interface ExecutionPassAttempt {
  attempt: number;
  packetId: string;
  packetFingerprint: string;
  compiledAt: string;
  implementerResultArtifactId: string | null;
  verificationResultArtifactId: string | null;
  verificationDecision:
    | "verified_for_next_pass"
    | "changes_required_in_current_pass"
    | "governance_contradiction"
    | null;
  findings: string[];
}

export interface ExecutionPassLedgerEntry {
  passId: string;
  title: string;
  status: ExecutionPassStatus;
  attempts: ExecutionPassAttempt[];
  verifiedAt: string | null;
}

export interface ExecutionRun {
  runId: string;
  workCardArtifactId: string;
  workCardRevision: number;
  approvalArtifactId: string;
  acceptanceContractId: string;
  planId: string;
  implementationBranch: string;
  status: ExecutionRunStatus;
  currentPassId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  operatorAttentionReasons: string[];
  passes: ExecutionPassLedgerEntry[];
}

export interface ExecutionRepositoryFacts {
  repository: "<PROJECT_REPO>";
  remote: string;
  branch: string;
  initialStatusSummary: string;
}

export interface ExecutionPacketSourceSummary {
  sourceId: string;
  title: string;
  summary: string;
}

export interface ExecutionPassResultSummary {
  passId: string;
  resultArtifactId: string;
  summary: string;
}

export interface ExecutionAgentJob {
  jobId: string;
  role: "implementer" | "independent_verifier";
  workCardArtifactId: string;
  workCardRevision: number;
  passId: string;
  attempt: number;
  packetFingerprint: string;
  markdown: string;
  estimatedTokens: number;
  budgetTokens: number;
  overBudget: boolean;
  includedRequirementIds: string[];
  includedSourceIds: string[];
}

export interface ExecutionRunArtifactPaths {
  acceptanceContractJsonPath: string;
  acceptanceContractMarkdownPath: string;
  passPlanJsonPath: string;
  passPlanMarkdownPath: string;
  runJsonPath: string;
  runMarkdownPath: string;
}

export interface TrustedExecutionRunInitializeRequest {
  projectId: string;
  phaseId: string;
  workCardId: string;
  contract: WorkCardAcceptanceContract;
  plan: ExecutionPassPlan;
}

export interface ExecutionRunLookupRequest {
  phaseId: string;
  workCardId: string;
}

export type ExecutionJobPreviewRequest =
  | (ExecutionRunLookupRequest & {
      role: "implementer";
      repositoryFacts: ExecutionRepositoryFacts;
      sourceSummaries: ExecutionPacketSourceSummary[];
      priorPassResults: ExecutionPassResultSummary[];
      correctionFindings?: string[];
    })
  | (ExecutionRunLookupRequest & {
      role: "independent_verifier";
      repositoryFacts: ExecutionRepositoryFacts;
      implementerResultArtifactId: string;
      changedRepositoryPaths: string[];
      validationResults: string[];
    });

export interface ExecutionRunOperationResult {
  ok: boolean;
  run?: ExecutionRun;
  contract?: WorkCardAcceptanceContract;
  plan?: ExecutionPassPlan;
  paths?: ExecutionRunArtifactPaths;
  errorMessages?: string[];
}

export interface ExecutionJobPreviewResult extends ExecutionRunOperationResult {
  job?: ExecutionAgentJob;
}

export interface ExecutionRunStatusPreviewResult extends ExecutionRunOperationResult {
  job?: ExecutionAgentJob;
}

export class ExecutionRunTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionRunTransitionError";
  }
}

export function validateExecutionPassPlan(
  plan: ExecutionPassPlan,
  contract: WorkCardAcceptanceContract,
): string[] {
  const issues: string[] = [];
  if (!plan.planId.trim()) issues.push("Execution Pass Plan requires a plan ID.");
  if (!plan.workCardArtifactId.trim()) issues.push("Execution Pass Plan requires a Work Card artifact ID.");
  if (!Number.isInteger(plan.workCardRevision) || plan.workCardRevision < 1) {
    issues.push("Execution Pass Plan requires a positive Work Card revision.");
  }
  if (!plan.approvalArtifactId.trim()) issues.push("Execution Pass Plan requires an approval artifact ID.");
  if (!plan.acceptanceContractId.trim()) issues.push("Execution Pass Plan requires an Acceptance Contract ID.");
  if (!Number.isInteger(plan.passTokenBudget) || plan.passTokenBudget < 1) {
    issues.push("Execution Pass Plan requires a positive token budget.");
  }
  if (!plan.implementationBranch.trim()) {
    issues.push("Execution Pass Plan requires an implementation branch.");
  }
  if (plan.passes.length === 0) {
    issues.push("Execution Pass Plan requires at least one pass.");
  }
  if (!contract.contractId.trim() || !contract.workCardArtifactId.trim()) {
    issues.push("Acceptance Contract requires exact contract and Work Card identities.");
  }
  if (!Number.isInteger(contract.workCardRevision) || contract.workCardRevision < 1) {
    issues.push("Acceptance Contract requires a positive Work Card revision.");
  }
  if (contract.requirements.length === 0) {
    issues.push("Acceptance Contract requires at least one requirement.");
  }
  if (
    plan.workCardArtifactId !== contract.workCardArtifactId ||
    plan.workCardRevision !== contract.workCardRevision ||
    plan.acceptanceContractId !== contract.contractId
  ) {
    issues.push("Execution Pass Plan does not match its Acceptance Contract.");
  }

  const passIds = new Set<string>();
  const requirementIds = new Set<string>();
  for (const requirement of contract.requirements) {
    if (!requirement.requirementId.trim() || !requirement.statement.trim()) {
      issues.push("Every Acceptance Contract requirement requires an ID and statement.");
    }
    if (requirementIds.has(requirement.requirementId)) {
      issues.push(`Duplicate Acceptance Contract requirement ${requirement.requirementId}.`);
    }
    requirementIds.add(requirement.requirementId);
    if (requirement.passIds.length === 0) {
      issues.push(`Acceptance requirement ${requirement.requirementId} is not assigned to an authorized pass.`);
    }
  }
  const invariantIds = new Set<string>();
  for (const invariant of contract.globalInvariants) {
    if (!invariant.invariantId.trim() || !invariant.statement.trim()) {
      issues.push("Every global invariant requires an ID and statement.");
    }
    if (invariantIds.has(invariant.invariantId)) {
      issues.push(`Duplicate global invariant ${invariant.invariantId}.`);
    }
    invariantIds.add(invariant.invariantId);
  }
  for (const pass of plan.passes) {
    if (!pass.passId.trim() || !pass.title.trim() || !pass.objective.trim()) {
      issues.push("Every Execution Pass requires an ID, title, and objective.");
    }
    if (passIds.has(pass.passId)) issues.push(`Duplicate Execution Pass ${pass.passId}.`);
    passIds.add(pass.passId);
    if (pass.requirementIds.length === 0) issues.push(`Execution Pass ${pass.passId} has no requirements.`);
    if (pass.allowedRepositoryPaths.length === 0) issues.push(`Execution Pass ${pass.passId} has no allowed repository paths.`);
    if (pass.requiredTests.length === 0) issues.push(`Execution Pass ${pass.passId} has no required tests.`);
    for (const requirementId of pass.requirementIds) {
      if (!requirementIds.has(requirementId)) {
        issues.push(`Execution Pass ${pass.passId} references unknown requirement ${requirementId}.`);
        continue;
      }
      const requirement = contract.requirements.filter(
        (candidate) => candidate.requirementId === requirementId,
      );
      if (requirement.length === 1 && !requirement[0].passIds.includes(pass.passId)) {
        issues.push(
          `Acceptance requirement ${requirementId} does not authorize Execution Pass ${pass.passId}.`,
        );
      }
    }
    for (const invariantId of pass.globalInvariantIds) {
      if (!invariantIds.has(invariantId)) {
        issues.push(`Execution Pass ${pass.passId} references unknown invariant ${invariantId}.`);
      }
    }
  }
  for (const [passIndex, pass] of plan.passes.entries()) {
    for (const prerequisite of pass.prerequisitePassIds) {
      const prerequisiteIndex = plan.passes.findIndex(
        (candidate) => candidate.passId === prerequisite,
      );
      if (
        !passIds.has(prerequisite) ||
        prerequisite === pass.passId ||
        prerequisiteIndex < 0 ||
        prerequisiteIndex >= passIndex
      ) {
        issues.push(`Execution Pass ${pass.passId} has invalid prerequisite ${prerequisite}.`);
      }
    }
  }
  for (const requirement of contract.requirements) {
    if (!plan.passes.some((pass) => pass.requirementIds.includes(requirement.requirementId))) {
      issues.push(`Acceptance requirement ${requirement.requirementId} is not assigned to a pass.`);
    }
  }
  return Array.from(new Set(issues));
}

export function compileImplementerPassJob(input: {
  run: ExecutionRun;
  plan: ExecutionPassPlan;
  contract: WorkCardAcceptanceContract;
  repositoryFacts: ExecutionRepositoryFacts;
  sourceSummaries: ExecutionPacketSourceSummary[];
  priorPassResults: ExecutionPassResultSummary[];
  correctionFindings?: string[];
}): ExecutionAgentJob {
  const pass = requireExecutionPass(input.run, input.plan, input.contract);
  const requirements = pass.requirementIds.map((requirementId) =>
    requireAcceptanceRequirement(input.contract, requirementId),
  );
  const invariants = pass.globalInvariantIds.map((invariantId) =>
    requireGlobalInvariant(input.contract, invariantId),
  );
  const attempt = requireExecutionLedger(input.run, pass.passId).attempts.length + 1;
  const sections = [
    `# Execution Pass Packet — ${pass.passId} ${pass.title}`,
    "",
    "## Exact Authority",
    "",
    `- Work Card: ${input.run.workCardArtifactId}`,
    `- Work Card revision: ${input.run.workCardRevision}`,
    `- Operator Approval: ${input.run.approvalArtifactId}`,
    `- Acceptance Contract: ${input.run.acceptanceContractId}`,
    `- Execution Pass Plan: ${input.run.planId}`,
    `- Pass: ${pass.passId}`,
    `- Attempt: ${attempt}`,
    "",
    "## Pass Objective",
    "",
    pass.objective,
    "",
    "## Requirements For This Pass Only",
    "",
    ...requirements.flatMap(renderExecutionRequirement),
    "",
    "## Global Invariants",
    "",
    ...executionBullets(invariants.map((item) => `${item.invariantId}: ${item.statement}`)),
    "",
    "## Allowed Repository Scope",
    "",
    ...executionBullets(pass.allowedRepositoryPaths),
    "",
    "## Required Tests",
    "",
    ...executionBullets(pass.requiredTests),
    "",
    "## Expected Pass Outputs",
    "",
    ...executionBullets(pass.expectedOutputs),
    "",
    "## Repository Facts",
    "",
    `- Repository: ${input.repositoryFacts.repository}`,
    `- Remote: ${input.repositoryFacts.remote}`,
    `- Branch: ${input.repositoryFacts.branch}`,
    `- Initial state: ${input.repositoryFacts.initialStatusSummary}`,
    "",
    "## Exact Included Sources",
    "",
    ...renderExecutionSources(input.sourceSummaries),
    "",
    "## Previously Verified Pass Results",
    "",
    ...renderExecutionResults(input.priorPassResults),
    ...(input.correctionFindings?.length
      ? [
          "",
          "## Independent Verifier Findings To Correct",
          "",
          ...executionBullets(uniqueExecutionStrings(input.correctionFindings)),
        ]
      : []),
    "",
    "## Permanent Protocol References",
    "",
    "- `AGENTS.md`",
    "- `docs/governance/EXECUTION_PASS_PROTOCOL.md`",
    "- `docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`",
    "- `docs/dev/VALIDATION_COMMAND_LANES.md`",
    "",
    "## Completion Boundary",
    "",
    "Complete only this pass. Do not broaden scope, perform later passes, claim Work Card acceptance, or perform Operator validation.",
  ];
  return finalizeExecutionJob({
    role: "implementer",
    run: input.run,
    pass,
    attempt,
    sections,
    requirementIds: requirements.map((item) => item.requirementId),
    sourceIds: input.sourceSummaries.map((item) => item.sourceId),
    budgetTokens: input.plan.passTokenBudget,
  });
}

export function compileIndependentVerificationJob(input: {
  run: ExecutionRun;
  plan: ExecutionPassPlan;
  contract: WorkCardAcceptanceContract;
  repositoryFacts: ExecutionRepositoryFacts;
  implementerResultArtifactId: string;
  changedRepositoryPaths: string[];
  validationResults: string[];
}): ExecutionAgentJob {
  const pass = requireExecutionPass(input.run, input.plan, input.contract);
  const ledger = requireExecutionLedger(input.run, pass.passId);
  const attempt = latestExecutionAttempt(ledger);
  if (ledger.status !== "implementer_complete") {
    throw new ExecutionRunTransitionError(
      `Independent verification requires implementer_complete, not ${ledger.status}.`,
    );
  }
  if (attempt.implementerResultArtifactId !== input.implementerResultArtifactId) {
    throw new ExecutionRunTransitionError(
      "Independent verification must target the exact recorded Implementer result.",
    );
  }
  const requirements = pass.requirementIds.map((requirementId) =>
    requireAcceptanceRequirement(input.contract, requirementId),
  );
  const sections = [
    `# Independent Verification Packet — ${pass.passId} ${pass.title}`,
    "",
    "## Verification Role",
    "",
    "Review the implementation adversarially. Do not modify production code. Do not treat a green Implementer suite or Implementer narrative as proof of architectural compliance.",
    "",
    "## Exact Authority",
    "",
    `- Work Card: ${input.run.workCardArtifactId}`,
    `- Work Card revision: ${input.run.workCardRevision}`,
    `- Acceptance Contract: ${input.run.acceptanceContractId}`,
    `- Pass: ${pass.passId}`,
    `- Attempt: ${attempt.attempt}`,
    `- Implementer result: ${input.implementerResultArtifactId}`,
    "",
    "## Requirements To Verify",
    "",
    ...requirements.flatMap(renderExecutionRequirement),
    "",
    "## Changed Repository Paths",
    "",
    ...executionBullets(uniqueExecutionStrings(input.changedRepositoryPaths)),
    "",
    "## Implementer Validation Results",
    "",
    ...executionBullets(input.validationResults),
    "",
    "## Required Independent Actions",
    "",
    "- Inspect production code before relying on the Implementer narrative.",
    "- Run direct layer tests and contradiction tests required by the Acceptance Contract.",
    "- Verify prohibitions behaviorally, not only through syntax search.",
    "- Verify report claims against exact files, symbols, tests, and command results.",
    "- Return exactly one decision: verified_for_next_pass, changes_required_in_current_pass, or governance_contradiction.",
    "- End with one final JSON object and no approval by omission:",
    '{ "verificationDecision": "verified_for_next_pass | changes_required_in_current_pass | governance_contradiction", "findings": ["..."], "summary": "..." }',
    "",
    "## Repository Facts",
    "",
    `- Repository: ${input.repositoryFacts.repository}`,
    `- Remote: ${input.repositoryFacts.remote}`,
    `- Branch: ${input.repositoryFacts.branch}`,
  ];
  return finalizeExecutionJob({
    role: "independent_verifier",
    run: input.run,
    pass,
    attempt: attempt.attempt,
    sections,
    requirementIds: requirements.map((item) => item.requirementId),
    sourceIds: [input.implementerResultArtifactId],
    budgetTokens: input.plan.passTokenBudget,
  });
}

export type ExecutionRunEvent =
  | {
      type: "packet_compiled";
      passId: string;
      packetId: string;
      packetFingerprint: string;
      occurredAt: string;
    }
  | {
      type: "implementer_started" | "verifier_started";
      passId: string;
      occurredAt: string;
    }
  | {
      type: "implementer_completed";
      passId: string;
      resultArtifactId: string;
      occurredAt: string;
    }
  | {
      type: "verifier_completed";
      passId: string;
      decision:
        | "verified_for_next_pass"
        | "changes_required_in_current_pass"
        | "governance_contradiction";
      resultArtifactId: string;
      findings: string[];
      occurredAt: string;
    }
  | {
      type: "execution_failed";
      passId: string;
      reason: string;
      occurredAt: string;
    }
  | {
      type: "operator_attention_required";
      reason: string;
      occurredAt: string;
    };

export function advanceExecutionRun(
  run: ExecutionRun,
  plan: ExecutionPassPlan,
  contract: WorkCardAcceptanceContract,
  event: ExecutionRunEvent,
): ExecutionRun {
  const issues = validateExecutionPassPlan(plan, contract);
  if (issues.length > 0) throw new ExecutionRunTransitionError(issues.join(" "));
  assertExecutionRunMatches(run, plan, contract);
  const next = copyExecutionRun(run);
  next.updatedAt = event.occurredAt;

  if (event.type === "operator_attention_required") {
    next.status = "operator_attention_required";
    next.operatorAttentionReasons = uniqueExecutionStrings([
      ...next.operatorAttentionReasons,
      event.reason,
    ]);
    return next;
  }

  const ledger = requireExecutionLedger(next, event.passId);
  if (next.currentPassId !== event.passId) {
    throw new ExecutionRunTransitionError(
      `Event targets ${event.passId}, but current pass is ${next.currentPassId ?? "none"}.`,
    );
  }

  if (event.type === "packet_compiled") {
    if (!["planned", "changes_required"].includes(ledger.status)) {
      throw invalidExecutionTransition(ledger, event.type);
    }
    ledger.attempts.push({
      attempt: ledger.attempts.length + 1,
      packetId: event.packetId,
      packetFingerprint: event.packetFingerprint,
      compiledAt: event.occurredAt,
      implementerResultArtifactId: null,
      verificationResultArtifactId: null,
      verificationDecision: null,
      findings: [],
    });
    ledger.status = "packet_compiled";
    next.status = "running";
    return next;
  }

  const attempt = latestExecutionAttempt(ledger);
  if (event.type === "implementer_started") {
    if (ledger.status !== "packet_compiled") {
      throw invalidExecutionTransition(ledger, event.type);
    }
    ledger.status = "implementer_running";
    next.status = "running";
    return next;
  }
  if (event.type === "implementer_completed") {
    if (ledger.status !== "implementer_running") {
      throw invalidExecutionTransition(ledger, event.type);
    }
    attempt.implementerResultArtifactId = requireExecutionIdentity(
      event.resultArtifactId,
      "Implementer result",
    );
    ledger.status = "implementer_complete";
    next.status = "running";
    return next;
  }
  if (event.type === "verifier_started") {
    if (ledger.status !== "implementer_complete") {
      throw invalidExecutionTransition(ledger, event.type);
    }
    ledger.status = "verifier_running";
    next.status = "running";
    return next;
  }
  if (event.type === "verifier_completed") {
    if (ledger.status !== "verifier_running") {
      throw invalidExecutionTransition(ledger, event.type);
    }
    attempt.verificationResultArtifactId = requireExecutionIdentity(
      event.resultArtifactId,
      "Verification result",
    );
    attempt.verificationDecision = event.decision;
    attempt.findings = uniqueExecutionStrings(event.findings);
    if (event.decision === "changes_required_in_current_pass") {
      ledger.status = "changes_required";
      next.status = "changes_required";
      return next;
    }
    if (event.decision === "governance_contradiction") {
      ledger.status = "governance_contradiction";
      next.status = "blocked_by_governance_contradiction";
      next.operatorAttentionReasons = uniqueExecutionStrings([
        ...next.operatorAttentionReasons,
        ...attempt.findings,
      ]);
      return next;
    }
    ledger.status = "verified";
    ledger.verifiedAt = event.occurredAt;
    const following = nextExecutionPass(next, plan, ledger.passId);
    if (!following) {
      next.currentPassId = null;
      next.status = "complete";
      next.completedAt = event.occurredAt;
      return next;
    }
    next.currentPassId = following.passId;
    next.status = "running";
    return next;
  }
  if (event.type === "execution_failed") {
    ledger.status = "execution_failure";
    attempt.findings = uniqueExecutionStrings([...attempt.findings, event.reason]);
    next.status = "failed";
    next.operatorAttentionReasons = uniqueExecutionStrings([
      ...next.operatorAttentionReasons,
      event.reason,
    ]);
    return next;
  }
  return next;
}

function requireExecutionPass(
  run: ExecutionRun,
  plan: ExecutionPassPlan,
  contract: WorkCardAcceptanceContract,
): ExecutionPassDefinition {
  const issues = validateExecutionPassPlan(plan, contract);
  if (issues.length > 0) throw new ExecutionRunTransitionError(issues.join(" "));
  assertExecutionRunMatches(run, plan, contract);
  if (!run.currentPassId) {
    throw new ExecutionRunTransitionError("Execution Run has no current pass.");
  }
  const matches = plan.passes.filter((pass) => pass.passId === run.currentPassId);
  if (matches.length !== 1) {
    throw new ExecutionRunTransitionError(
      `Execution Run does not resolve exactly one current pass ${run.currentPassId}.`,
    );
  }
  return matches[0];
}

function requireAcceptanceRequirement(
  contract: WorkCardAcceptanceContract,
  requirementId: string,
): WorkCardAcceptanceRequirement {
  const matches = contract.requirements.filter(
    (requirement) => requirement.requirementId === requirementId,
  );
  if (matches.length !== 1) {
    throw new ExecutionRunTransitionError(
      `Acceptance Contract does not resolve exactly one requirement ${requirementId}.`,
    );
  }
  return matches[0];
}

function requireGlobalInvariant(
  contract: WorkCardAcceptanceContract,
  invariantId: string,
): WorkCardAcceptanceContract["globalInvariants"][number] {
  const matches = contract.globalInvariants.filter(
    (invariant) => invariant.invariantId === invariantId,
  );
  if (matches.length !== 1) {
    throw new ExecutionRunTransitionError(
      `Acceptance Contract does not resolve exactly one invariant ${invariantId}.`,
    );
  }
  return matches[0];
}

function requireExecutionLedger(
  run: ExecutionRun,
  passId: string,
): ExecutionPassLedgerEntry {
  const matches = run.passes.filter((pass) => pass.passId === passId);
  if (matches.length !== 1) {
    throw new ExecutionRunTransitionError(
      `Execution Run does not contain exactly one ledger entry ${passId}.`,
    );
  }
  return matches[0];
}

function latestExecutionAttempt(
  ledger: ExecutionPassLedgerEntry,
): ExecutionPassAttempt {
  const attempt = ledger.attempts[ledger.attempts.length - 1];
  if (!attempt) {
    throw new ExecutionRunTransitionError(
      `Execution Pass ${ledger.passId} has no compiled attempt.`,
    );
  }
  return attempt;
}

function assertExecutionRunMatches(
  run: ExecutionRun,
  plan: ExecutionPassPlan,
  contract: WorkCardAcceptanceContract,
): void {
  if (
    run.workCardArtifactId !== plan.workCardArtifactId ||
    run.workCardRevision !== plan.workCardRevision ||
    run.approvalArtifactId !== plan.approvalArtifactId ||
    run.acceptanceContractId !== contract.contractId ||
    run.planId !== plan.planId ||
    run.implementationBranch !== plan.implementationBranch
  ) {
    throw new ExecutionRunTransitionError(
      "Execution Run does not match the exact approved Work Card, Acceptance Contract, and Execution Pass Plan.",
    );
  }
}

function nextExecutionPass(
  run: ExecutionRun,
  plan: ExecutionPassPlan,
  completedPassId: string,
): ExecutionPassDefinition | null {
  const completedIndex = plan.passes.findIndex(
    (pass) => pass.passId === completedPassId,
  );
  for (const pass of plan.passes.slice(completedIndex + 1)) {
    const ledger = requireExecutionLedger(run, pass.passId);
    const ready = pass.prerequisitePassIds.every(
      (prerequisite) =>
        requireExecutionLedger(run, prerequisite).status === "verified",
    );
    if (ledger.status === "planned" && ready) return pass;
  }
  return null;
}

function invalidExecutionTransition(
  ledger: ExecutionPassLedgerEntry,
  eventType: ExecutionRunEvent["type"],
): ExecutionRunTransitionError {
  return new ExecutionRunTransitionError(
    `Execution Pass ${ledger.passId} cannot accept ${eventType} while ${ledger.status}.`,
  );
}

function requireExecutionIdentity(value: string, label: string): string {
  if (!value.trim()) {
    throw new ExecutionRunTransitionError(`${label} requires an exact artifact ID.`);
  }
  return value;
}

function copyExecutionRun(run: ExecutionRun): ExecutionRun {
  return {
    ...run,
    operatorAttentionReasons: [...run.operatorAttentionReasons],
    passes: run.passes.map((pass) => ({
      ...pass,
      attempts: pass.attempts.map((attempt) => ({
        ...attempt,
        findings: [...attempt.findings],
      })),
    })),
  };
}

function finalizeExecutionJob(input: {
  role: ExecutionAgentJob["role"];
  run: ExecutionRun;
  pass: ExecutionPassDefinition;
  attempt: number;
  sections: string[];
  requirementIds: string[];
  sourceIds: string[];
  budgetTokens: number;
}): ExecutionAgentJob {
  const markdown = `${input.sections.join("\n")}\n`;
  const estimatedTokens = estimateContextTokens(markdown);
  const packetFingerprint = executionPacketFingerprint(markdown);
  return {
    jobId: `${input.run.runId}/${input.pass.passId}/${input.role}/attempt-${input.attempt}`,
    role: input.role,
    workCardArtifactId: input.run.workCardArtifactId,
    workCardRevision: input.run.workCardRevision,
    passId: input.pass.passId,
    attempt: input.attempt,
    packetFingerprint,
    markdown,
    estimatedTokens,
    budgetTokens: input.budgetTokens,
    overBudget: estimatedTokens > input.budgetTokens,
    includedRequirementIds: [...input.requirementIds],
    includedSourceIds: uniqueExecutionStrings(input.sourceIds),
  };
}

function renderExecutionRequirement(
  requirement: WorkCardAcceptanceRequirement,
): string[] {
  return [
    `### ${requirement.requirementId} — ${requirement.type}`,
    "",
    requirement.statement,
    ...(requirement.noncompliantSubstitutions.length
      ? [
          "",
          "Noncompliant substitutions:",
          ...requirement.noncompliantSubstitutions.map((item) => `- ${item}`),
        ]
      : []),
    ...(requirement.requiredBehavioralTests.length
      ? [
          "",
          "Required behavioral tests:",
          ...requirement.requiredBehavioralTests.map((item) => `- ${item}`),
        ]
      : []),
  ];
}

function renderExecutionSources(sources: ExecutionPacketSourceSummary[]): string[] {
  return sources.length === 0
    ? ["- No source content was included."]
    : sources.flatMap((source) => [
        `### ${source.title}`,
        "",
        `- Source ID: ${source.sourceId}`,
        "",
        source.summary,
        "",
      ]);
}

function renderExecutionResults(results: ExecutionPassResultSummary[]): string[] {
  return results.length === 0
    ? ["- No prior verified pass result is required."]
    : results.map(
        (result) =>
          `- ${result.passId}: ${result.resultArtifactId} — ${result.summary}`,
      );
}

function executionBullets(values: string[]): string[] {
  return values.length === 0 ? ["- None."] : values.map((value) => `- ${value}`);
}

function executionPacketFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function uniqueExecutionStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

export function createExecutionRun(
  plan: ExecutionPassPlan,
  contract: WorkCardAcceptanceContract,
  createdAt: string,
): ExecutionRun {
  const issues = validateExecutionPassPlan(plan, contract);
  if (issues.length > 0) throw new ExecutionRunTransitionError(issues.join(" "));
  return {
    runId: `${plan.workCardArtifactId}/execution_run/revision-${plan.workCardRevision}`,
    workCardArtifactId: plan.workCardArtifactId,
    workCardRevision: plan.workCardRevision,
    approvalArtifactId: plan.approvalArtifactId,
    acceptanceContractId: plan.acceptanceContractId,
    planId: plan.planId,
    implementationBranch: plan.implementationBranch,
    status: "planned",
    currentPassId: plan.passes[0]?.passId ?? null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    operatorAttentionReasons: [],
    passes: plan.passes.map((pass) => ({
      passId: pass.passId,
      title: pass.title,
      status: "planned",
      attempts: [],
      verifiedAt: null,
    })),
  };
}
