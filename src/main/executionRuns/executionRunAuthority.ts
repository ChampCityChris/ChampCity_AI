import {
  advanceExecutionRun,
  compileImplementerPassJob,
  compileIndependentVerificationJob,
  createExecutionRun,
  validateExecutionPassPlan,
  type ExecutionAgentJob,
  type ExecutionJobPreviewResult,
  type ExecutionPacketSourceSummary,
  type ExecutionPassPlan,
  type ExecutionPassResultSummary,
  type ExecutionRepositoryFacts,
  type ExecutionRun,
  type ExecutionRunArtifactPaths,
  type ExecutionRunLookupRequest,
  type ExecutionRunOperationResult,
  type ExecutionRunStatusPreviewResult,
  type TrustedExecutionRunInitializeRequest,
  type WorkCardAcceptanceContract,
} from "../../shared/executionRuns";
import type { CanonicalArtifact, JsonValue } from "../../shared/artifacts";
import {
  ArtifactPairService,
  locationFromPairPaths,
} from "../artifacts";

const WC04_WORK_CARD_ARTIFACT_ID = "champcity-ai/phase-06/work_card/WC04";
const WC04_ARCHITECT_REVIEW_ARTIFACT_ID = "champcity-ai/phase-06/architect_review/WC04";

export interface TrustedImplementerResultRequest extends ExecutionRunLookupRequest {
  passId: string;
  packetId: string;
  packetFingerprint: string;
  implementerResultArtifactId: string;
}

export interface TrustedVerificationResultRequest extends ExecutionRunLookupRequest {
  passId: string;
  implementerResultArtifactId: string;
  verificationResultArtifactId: string;
  verificationDecision:
    | "verified_for_next_pass"
    | "changes_required_in_current_pass"
    | "governance_contradiction";
  findings: string[];
}

export class ExecutionRunPersistenceService {
  constructor(
    private readonly artifactPairs: ArtifactPairService,
    private readonly projectId: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async initializeTrusted(
    request: TrustedExecutionRunInitializeRequest,
  ): Promise<ExecutionRunOperationResult> {
    try {
      this.assertProject(request.projectId);
      const issues = validateExecutionPassPlan(request.plan, request.contract);
      if (issues.length > 0) throw new Error(issues.join(" "));
      const workCard = await this.readExactAuthoritativeArtifact(
        request.contract.workCardArtifactId,
      );
      const approval = await this.readExactAuthoritativeArtifact(
        request.plan.approvalArtifactId,
      );
      if (workCard.revision !== request.contract.workCardRevision) {
        throw new Error("Execution Run Work Card revision does not match canonical authority.");
      }
      if (approval.artifactId !== request.plan.approvalArtifactId) {
        throw new Error("Execution Run Operator Approval identity does not match canonical authority.");
      }
      await this.validateOperatorApprovalAuthority(approval, request.contract);
      const paths = executionRunArtifactPaths(request.phaseId, request.workCardId);
      const run = createExecutionRun(request.plan, request.contract, this.now());
      await this.artifactPairs.commitArtifactsBatch([
        acceptanceContractCommitRequest(request, paths),
        passPlanCommitRequest(request, paths, run),
        executionRunCommitRequest({
          projectId: request.projectId,
          phaseId: request.phaseId,
          workCardId: request.workCardId,
          run,
          contract: request.contract,
          plan: request.plan,
          paths,
        }),
      ]);
      return { ok: true, run, contract: request.contract, plan: request.plan, paths };
    } catch (error) {
      return executionOperationFailure(error);
    }
  }

  async load(
    request: ExecutionRunLookupRequest,
  ): Promise<ExecutionRunOperationResult> {
    try {
      const bundle = await this.readBundle(request);
      return { ok: true, ...bundle };
    } catch (error) {
      return executionOperationFailure(error);
    }
  }

  async saveRun(
    request: ExecutionRunLookupRequest,
    run: ExecutionRun,
    contract: WorkCardAcceptanceContract,
    plan: ExecutionPassPlan,
    paths: ExecutionRunArtifactPaths,
  ): Promise<ExecutionRunOperationResult> {
    try {
      await this.artifactPairs.commitArtifactsBatch([
        executionRunCommitRequest({
          projectId: this.projectId,
          phaseId: request.phaseId,
          workCardId: request.workCardId,
          run,
          contract,
          plan,
          paths,
        }),
      ]);
      return { ok: true, run, contract, plan, paths };
    } catch (error) {
      return executionOperationFailure(error);
    }
  }

  async readExactAuthoritativeArtifact(
    artifactId: string,
  ): Promise<CanonicalArtifact> {
    const registry = await this.artifactPairs.loadRegistry();
    if (!registry) throw new Error("Canonical Artifact Registry is unavailable.");
    const matches = registry.entries.filter(
      (entry) =>
        entry.artifactId === artifactId &&
        entry.authoritative &&
        entry.synchronized,
    );
    if (matches.length !== 1) {
      throw new Error(`Canonical authority does not resolve exactly one artifact ${artifactId}.`);
    }
    const pair = await this.artifactPairs.readArtifactByPaths(
      matches[0].jsonPath,
      matches[0].markdownPath,
    );
    if (!pair.verification.synchronized) {
      throw new Error(`Canonical artifact ${artifactId} is not synchronized.`);
    }
    if (pair.artifact.artifactId !== artifactId) {
      throw new Error(`Canonical artifact ${artifactId} path resolved conflicting identity.`);
    }
    if (pair.artifact.projectId !== this.projectId) {
      throw new Error(`Artifact ${artifactId} belongs to another project.`);
    }
    return pair.artifact;
  }

  private async readBundle(request: ExecutionRunLookupRequest): Promise<{
    run: ExecutionRun;
    contract: WorkCardAcceptanceContract;
    plan: ExecutionPassPlan;
    paths: ExecutionRunArtifactPaths;
  }> {
    const paths = executionRunArtifactPaths(request.phaseId, request.workCardId);
    const [contractPair, planPair, runPair] = await Promise.all([
      this.artifactPairs.readArtifactByPaths(
        paths.acceptanceContractJsonPath,
        paths.acceptanceContractMarkdownPath,
      ),
      this.artifactPairs.readArtifactByPaths(
        paths.passPlanJsonPath,
        paths.passPlanMarkdownPath,
      ),
      this.artifactPairs.readArtifactByPaths(
        paths.runJsonPath,
        paths.runMarkdownPath,
      ),
    ]);
    const contract = storedExecutionData<WorkCardAcceptanceContract>(
      contractPair,
      "acceptance_contract",
    );
    const plan = storedExecutionData<ExecutionPassPlan>(
      planPair,
      "execution_pass_plan",
    );
    const run = storedExecutionData<ExecutionRun>(runPair, "execution_run");
    const issues = validateExecutionPassPlan(plan, contract);
    if (issues.length > 0) throw new Error(issues.join(" "));
    if (
      contractPair.artifact.projectId !== this.projectId ||
      planPair.artifact.projectId !== this.projectId ||
      runPair.artifact.projectId !== this.projectId ||
      contractPair.artifact.phaseId !== request.phaseId ||
      planPair.artifact.phaseId !== request.phaseId ||
      runPair.artifact.phaseId !== request.phaseId ||
      contractPair.artifact.workCardId !== request.workCardId ||
      planPair.artifact.workCardId !== request.workCardId ||
      runPair.artifact.workCardId !== request.workCardId
    ) {
      throw new Error("Execution Run bundle identity does not match the selected project, phase, and Work Card.");
    }
    if (
      contractPair.artifact.artifactId !== contract.contractId ||
      planPair.artifact.artifactId !== plan.planId ||
      runPair.artifact.artifactId !== run.runId ||
      run.workCardArtifactId !== plan.workCardArtifactId ||
      run.workCardRevision !== plan.workCardRevision ||
      run.approvalArtifactId !== plan.approvalArtifactId ||
      run.acceptanceContractId !== contract.contractId ||
      run.planId !== plan.planId
    ) {
      throw new Error("Execution Run bundle contains conflicting exact identities.");
    }
    return { run, contract, plan, paths };
  }

  private assertProject(projectId: string): void {
    if (projectId !== this.projectId) {
      throw new Error("Execution Run project identity does not match the selected project.");
    }
  }

  private async validateOperatorApprovalAuthority(
    approval: CanonicalArtifact,
    contract: WorkCardAcceptanceContract,
  ): Promise<void> {
    if (approval.artifactType !== "operator_approval") {
      throw new Error("Execution Run authority must resolve an Operator Approval artifact.");
    }
    const data = executionRecord(approval.payload.data);
    if (data.authorizationGranted !== true) {
      throw new Error("Execution Run Operator Approval does not explicitly grant authorization.");
    }
    if (data.sourceCodeChangesAuthorized !== true) {
      throw new Error("Execution Run Operator Approval does not explicitly authorize source-code changes.");
    }
    if (data.authorizedWorkCardArtifactId !== contract.workCardArtifactId) {
      throw new Error("Execution Run Operator Approval authorizes a different Work Card.");
    }
    if (data.authorizedRevision !== contract.workCardRevision) {
      throw new Error("Execution Run Operator Approval authorizes a different Work Card revision.");
    }
    if (approval.parentArtifactId !== contract.workCardArtifactId) {
      throw new Error("Execution Run Operator Approval parent does not bind to the approved Work Card.");
    }
    if (!approval.relationships.sources.includes(contract.workCardArtifactId)) {
      throw new Error("Execution Run Operator Approval source relationship does not bind to the approved Work Card.");
    }
    const executionCondition = typeof data.executionCondition === "string"
      ? data.executionCondition.trim()
      : "";
    if (executionCondition.length > 0) {
      await this.validateExecutionCondition(executionCondition, contract);
    }
  }

  private async validateExecutionCondition(
    executionCondition: string,
    contract: WorkCardAcceptanceContract,
  ): Promise<void> {
    if (!executionCondition.includes(WC04_WORK_CARD_ARTIFACT_ID)) {
      throw new Error("Execution Run Operator Approval declares an unsupported execution condition.");
    }
    const wc04Review = await this.readExactAuthoritativeArtifact(WC04_ARCHITECT_REVIEW_ARTIFACT_ID);
    if (wc04Review.artifactType !== "architect_review") {
      throw new Error("Execution Run condition authority is not an Architect Review.");
    }
    if (!wc04Review.relationships.sources.includes(WC04_WORK_CARD_ARTIFACT_ID)) {
      throw new Error("Execution Run condition authority does not source the exact WC04 Work Card.");
    }
    const data = executionRecord(wc04Review.payload.data);
    if (data.reviewedWorkCardArtifactId !== WC04_WORK_CARD_ARTIFACT_ID) {
      throw new Error("Execution Run condition authority reviews a different Work Card.");
    }
    if (data.dependencySatisfiedWorkCardArtifactId !== contract.workCardArtifactId) {
      throw new Error("Execution Run condition authority does not satisfy the WC05 dependency.");
    }
    if (
      data.decision !== "accepted_for_dependency_completion" ||
      typeof data.acceptanceResult !== "string" ||
      !data.acceptanceResult.startsWith("accepted")
    ) {
      throw new Error("Execution Run condition authority has not accepted WC04 for dependency completion.");
    }
  }
}

export class ExecutionRunAuthorityService {
  constructor(
    private readonly persistence: ExecutionRunPersistenceService,
    private readonly projectId: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  initializeFromTrustedAuthority(
    request: TrustedExecutionRunInitializeRequest,
  ): Promise<ExecutionRunOperationResult> {
    return this.persistence.initializeTrusted(request);
  }

  loadStatus(
    request: ExecutionRunLookupRequest,
  ): Promise<ExecutionRunStatusPreviewResult> {
    return this.persistence.load(request);
  }

  async previewNextPacket(
    request: ExecutionRunLookupRequest,
  ): Promise<ExecutionJobPreviewResult> {
    try {
      const loaded = await this.persistence.load(request);
      if (!loaded.ok || !loaded.run || !loaded.contract || !loaded.plan) return loaded;
      const job = await this.compileNextJob(request, loaded.run, loaded.contract, loaded.plan);
      return { ...loaded, job };
    } catch (error) {
      return executionOperationFailure(error);
    }
  }

  async recordImplementerResult(
    request: TrustedImplementerResultRequest,
  ): Promise<ExecutionRunOperationResult> {
    try {
      const loaded = await this.persistence.load(request);
      const bundle = requireCompleteBundle(loaded);
      await this.persistence.readExactAuthoritativeArtifact(request.implementerResultArtifactId);
      let run = advanceExecutionRun(bundle.run, bundle.plan, bundle.contract, {
        type: "packet_compiled",
        passId: request.passId,
        packetId: request.packetId,
        packetFingerprint: request.packetFingerprint,
        occurredAt: this.now(),
      });
      run = advanceExecutionRun(run, bundle.plan, bundle.contract, {
        type: "implementer_started",
        passId: request.passId,
        occurredAt: this.now(),
      });
      run = advanceExecutionRun(run, bundle.plan, bundle.contract, {
        type: "implementer_completed",
        passId: request.passId,
        resultArtifactId: request.implementerResultArtifactId,
        occurredAt: this.now(),
      });
      return this.persistence.saveRun(request, run, bundle.contract, bundle.plan, bundle.paths);
    } catch (error) {
      return executionOperationFailure(error);
    }
  }

  async recordVerificationResult(
    request: TrustedVerificationResultRequest,
  ): Promise<ExecutionRunOperationResult> {
    try {
      const loaded = await this.persistence.load(request);
      const bundle = requireCompleteBundle(loaded);
      const ledger = currentLedger(bundle.run);
      const attempt = latestAttempt(ledger);
      if (attempt.implementerResultArtifactId !== request.implementerResultArtifactId) {
        throw new Error("Independent verification must target the exact recorded Implementer result.");
      }
      await this.persistence.readExactAuthoritativeArtifact(request.implementerResultArtifactId);
      await this.persistence.readExactAuthoritativeArtifact(request.verificationResultArtifactId);
      let run = advanceExecutionRun(bundle.run, bundle.plan, bundle.contract, {
        type: "verifier_started",
        passId: request.passId,
        occurredAt: this.now(),
      });
      run = advanceExecutionRun(run, bundle.plan, bundle.contract, {
        type: "verifier_completed",
        passId: request.passId,
        decision: request.verificationDecision,
        resultArtifactId: request.verificationResultArtifactId,
        findings: request.findings,
        occurredAt: this.now(),
      });
      return this.persistence.saveRun(request, run, bundle.contract, bundle.plan, bundle.paths);
    } catch (error) {
      return executionOperationFailure(error);
    }
  }

  private async compileNextJob(
    request: ExecutionRunLookupRequest,
    run: ExecutionRun,
    contract: WorkCardAcceptanceContract,
    plan: ExecutionPassPlan,
  ): Promise<ExecutionAgentJob> {
    const ledger = currentLedger(run);
    const repositoryFacts: ExecutionRepositoryFacts = {
      repository: "<PROJECT_REPO>",
      remote: "configured project repository",
      branch: plan.implementationBranch,
      initialStatusSummary: "Loaded from synchronized canonical Execution Run authority.",
    };

    if (ledger.status === "planned" || ledger.status === "changes_required") {
      return compileImplementerPassJob({
        run,
        plan,
        contract,
        repositoryFacts,
        sourceSummaries: await this.implementerSources(contract, plan, run.currentPassId ?? ""),
        priorPassResults: priorVerifiedPassResults(run),
        ...(ledger.status === "changes_required"
          ? { correctionFindings: latestAttempt(ledger).findings }
          : {}),
      });
    }

    if (ledger.status === "implementer_complete") {
      const attempt = latestAttempt(ledger);
      if (!attempt.implementerResultArtifactId) {
        throw new Error("Current pass does not declare an exact Implementer result.");
      }
      const evidence = await this.implementerEvidence(attempt.implementerResultArtifactId);
      return compileIndependentVerificationJob({
        run,
        plan,
        contract,
        repositoryFacts,
        implementerResultArtifactId: attempt.implementerResultArtifactId,
        changedRepositoryPaths: evidence.changedRepositoryPaths,
        validationResults: evidence.validationResults,
      });
    }

    throw new Error(
      `Execution Pass ${ledger.passId} is ${ledger.status}; no packet preview is available.`,
    );
  }

  private async implementerSources(
    contract: WorkCardAcceptanceContract,
    plan: ExecutionPassPlan,
    passId: string,
  ): Promise<ExecutionPacketSourceSummary[]> {
    const workCard = await this.persistence.readExactAuthoritativeArtifact(contract.workCardArtifactId);
    const pass = plan.passes.filter((candidate) => candidate.passId === passId);
    if (pass.length !== 1) {
      throw new Error(`Execution Pass Plan does not resolve exactly one pass ${passId}.`);
    }
    return [
      {
        sourceId: contract.workCardArtifactId,
        title: workCard.payload.title,
        summary: boundedExecutionSummary(workCard.payload.contentMarkdown),
      },
      {
        sourceId: contract.contractId,
        title: "Acceptance Contract",
        summary: pass[0].requirementIds.join(", "),
      },
      {
        sourceId: plan.planId,
        title: `Execution Pass ${pass[0].passId}`,
        summary: pass[0].objective,
      },
    ];
  }

  private async implementerEvidence(artifactId: string): Promise<{
    changedRepositoryPaths: string[];
    validationResults: string[];
  }> {
    const artifact = await this.persistence.readExactAuthoritativeArtifact(artifactId);
    const data = executionRecord(artifact.payload.data);
    return {
      changedRepositoryPaths: collectExecutionStringArrays(data, [
        "changedFiles",
        "filesChanged",
        "filesCreated",
        "filesModified",
      ]),
      validationResults: collectExecutionStringArrays(data, [
        "validationResults",
        "checksRun",
        "commandsRun",
      ]),
    };
  }
}

export function executionRunArtifactPaths(
  phaseId: string,
  workCardId: string,
): ExecutionRunArtifactPaths {
  const phase = safeExecutionPathSegment(phaseId, "phaseId");
  const workCard = safeExecutionPathSegment(workCardId, "workCardId");
  const folder = `planning/phases/${phase}/Execution_Runs/${workCard}`;
  return {
    acceptanceContractJsonPath: `${folder}/ACCEPTANCE_CONTRACT.json`,
    acceptanceContractMarkdownPath: `${folder}/ACCEPTANCE_CONTRACT.md`,
    passPlanJsonPath: `${folder}/EXECUTION_PASS_PLAN.json`,
    passPlanMarkdownPath: `${folder}/EXECUTION_PASS_PLAN.md`,
    runJsonPath: `${folder}/EXECUTION_RUN.json`,
    runMarkdownPath: `${folder}/EXECUTION_RUN.md`,
  };
}

function acceptanceContractCommitRequest(
  request: TrustedExecutionRunInitializeRequest,
  paths: ExecutionRunArtifactPaths,
) {
  return {
    artifactId: request.contract.contractId,
    artifactType: "acceptance_contract",
    status: "active" as const,
    projectId: request.projectId,
    phaseId: request.phaseId,
    workCardId: request.workCardId,
    parentArtifactId: request.contract.workCardArtifactId,
    relationships: {
      sources: [request.contract.workCardArtifactId],
      expectedOutputs: [request.plan.planId],
      supersedes: [],
      children: [request.plan.planId],
    },
    payload: {
      title: `Acceptance Contract - ${request.workCardId}`,
      contentMarkdown: renderAcceptanceContractMarkdown(request.contract),
      data: request.contract as unknown as JsonValue,
    },
    location: locationFromPairPaths(
      paths.acceptanceContractJsonPath,
      paths.acceptanceContractMarkdownPath,
    ),
  };
}

function passPlanCommitRequest(
  request: TrustedExecutionRunInitializeRequest,
  paths: ExecutionRunArtifactPaths,
  run: ExecutionRun,
) {
  return {
    artifactId: request.plan.planId,
    artifactType: "execution_pass_plan",
    status: "active" as const,
    projectId: request.projectId,
    phaseId: request.phaseId,
    workCardId: request.workCardId,
    parentArtifactId: request.contract.workCardArtifactId,
    relationships: {
      sources: [
        request.contract.workCardArtifactId,
        request.plan.approvalArtifactId,
        request.contract.contractId,
      ],
      expectedOutputs: [run.runId],
      supersedes: [],
      children: [run.runId],
    },
    payload: {
      title: `Execution Pass Plan - ${request.workCardId}`,
      contentMarkdown: renderExecutionPassPlanMarkdown(request.plan),
      data: request.plan as unknown as JsonValue,
    },
    location: locationFromPairPaths(
      paths.passPlanJsonPath,
      paths.passPlanMarkdownPath,
    ),
  };
}

function executionRunCommitRequest(input: {
  projectId: string;
  phaseId: string;
  workCardId: string;
  run: ExecutionRun;
  contract: WorkCardAcceptanceContract;
  plan: ExecutionPassPlan;
  paths: ExecutionRunArtifactPaths;
}) {
  return {
    artifactId: input.run.runId,
    artifactType: "execution_run",
    status: "active" as const,
    projectId: input.projectId,
    phaseId: input.phaseId,
    workCardId: input.workCardId,
    parentArtifactId: input.contract.workCardArtifactId,
    relationships: {
      sources: [
        input.contract.workCardArtifactId,
        input.plan.approvalArtifactId,
        input.contract.contractId,
        input.plan.planId,
      ],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      title: `Execution Run - ${input.workCardId}`,
      contentMarkdown: renderExecutionRunMarkdown(input.run),
      data: input.run as unknown as JsonValue,
    },
    location: locationFromPairPaths(
      input.paths.runJsonPath,
      input.paths.runMarkdownPath,
    ),
  };
}

function storedExecutionData<T>(
  pair: Awaited<ReturnType<ArtifactPairService["readArtifactByPaths"]>>,
  artifactType: string,
): T {
  if (!pair.verification.synchronized) {
    throw new Error(`Stored ${artifactType} pair is not synchronized.`);
  }
  if (pair.artifact.artifactType !== artifactType) {
    throw new Error(
      `Stored artifact ${pair.artifact.artifactId} has type ${pair.artifact.artifactType}, not ${artifactType}.`,
    );
  }
  const data = pair.artifact.payload.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(`Stored ${artifactType} data is not an object.`);
  }
  return data as unknown as T;
}

function renderAcceptanceContractMarkdown(
  contract: WorkCardAcceptanceContract,
): string {
  return [
    `# Acceptance Contract - ${contract.workCardArtifactId}`,
    "",
    `- Contract ID: ${contract.contractId}`,
    `- Work Card revision: ${contract.workCardRevision}`,
    "",
    "## Global Invariants",
    "",
    ...contract.globalInvariants.map(
      (invariant) => `- ${invariant.invariantId}: ${invariant.statement}`,
    ),
    "",
    "## Requirements",
    "",
    ...contract.requirements.flatMap((requirement) => [
      `### ${requirement.requirementId} - ${requirement.type}`,
      "",
      requirement.statement,
      "",
      `- Authorized passes: ${requirement.passIds.join(", ")}`,
      `- Noncompliant substitutions: ${requirement.noncompliantSubstitutions.join("; ") || "none"}`,
      `- Required behavioral tests: ${requirement.requiredBehavioralTests.join("; ") || "none"}`,
      "",
    ]),
  ].join("\n");
}

function renderExecutionPassPlanMarkdown(plan: ExecutionPassPlan): string {
  return [
    `# Execution Pass Plan - ${plan.workCardArtifactId}`,
    "",
    `- Plan ID: ${plan.planId}`,
    `- Work Card revision: ${plan.workCardRevision}`,
    `- Approval: ${plan.approvalArtifactId}`,
    `- Acceptance Contract: ${plan.acceptanceContractId}`,
    `- Implementation branch: ${plan.implementationBranch}`,
    `- Pass token budget: ${plan.passTokenBudget}`,
    "",
    "## Passes",
    "",
    ...plan.passes.flatMap((pass) => [
      `### ${pass.passId} - ${pass.title}`,
      "",
      pass.objective,
      "",
      `- Requirements: ${pass.requirementIds.join(", ")}`,
      `- Global invariants: ${pass.globalInvariantIds.join(", ") || "none"}`,
      `- Prerequisites: ${pass.prerequisitePassIds.join(", ") || "none"}`,
      `- Allowed paths: ${pass.allowedRepositoryPaths.join(", ")}`,
      `- Required tests: ${pass.requiredTests.join("; ")}`,
      `- Expected outputs: ${pass.expectedOutputs.join("; ") || "none"}`,
      "",
    ]),
  ].join("\n");
}

function renderExecutionRunMarkdown(run: ExecutionRun): string {
  return [
    `# Execution Run - ${run.workCardArtifactId}`,
    "",
    `- Run ID: ${run.runId}`,
    `- Work Card revision: ${run.workCardRevision}`,
    `- Status: ${run.status}`,
    `- Current pass: ${run.currentPassId ?? "none"}`,
    `- Implementation branch: ${run.implementationBranch}`,
    `- Created: ${run.createdAt}`,
    `- Updated: ${run.updatedAt}`,
    `- Completed: ${run.completedAt ?? "no"}`,
    "",
    "## Pass Ledger",
    "",
    ...run.passes.flatMap((pass) => [
      `### ${pass.passId} - ${pass.title}`,
      "",
      `- Status: ${pass.status}`,
      `- Attempts: ${pass.attempts.length}`,
      `- Verified: ${pass.verifiedAt ?? "no"}`,
      ...pass.attempts.map(
        (attempt) =>
          `- Attempt ${attempt.attempt}: ${attempt.verificationDecision ?? "pending"}; packet ${attempt.packetFingerprint}; findings ${attempt.findings.join("; ") || "none"}`,
      ),
      "",
    ]),
    "## Operator Attention",
    "",
    ...(run.operatorAttentionReasons.length === 0
      ? ["- None."]
      : run.operatorAttentionReasons.map((reason) => `- ${reason}`)),
    "",
  ].join("\n");
}

function executionOperationFailure(
  error: unknown,
): ExecutionRunOperationResult & ExecutionJobPreviewResult {
  return {
    ok: false,
    errorMessages: [error instanceof Error ? error.message : String(error)],
  };
}

function requireCompleteBundle(result: ExecutionRunOperationResult): {
  run: ExecutionRun;
  contract: WorkCardAcceptanceContract;
  plan: ExecutionPassPlan;
  paths: ExecutionRunArtifactPaths;
} {
  if (!result.ok || !result.run || !result.contract || !result.plan || !result.paths) {
    throw new Error(result.errorMessages?.join(" ") || "Execution Run bundle is incomplete.");
  }
  return {
    run: result.run,
    contract: result.contract,
    plan: result.plan,
    paths: result.paths,
  };
}

function currentLedger(run: ExecutionRun): ExecutionRun["passes"][number] {
  if (!run.currentPassId) throw new Error("Execution Run has no current pass.");
  const matches = run.passes.filter((pass) => pass.passId === run.currentPassId);
  if (matches.length !== 1) {
    throw new Error(`Execution Run does not resolve exactly one current pass ${run.currentPassId}.`);
  }
  return matches[0];
}

function latestAttempt(
  ledger: ExecutionRun["passes"][number],
): ExecutionRun["passes"][number]["attempts"][number] {
  const attempt = ledger.attempts[ledger.attempts.length - 1];
  if (!attempt) throw new Error(`Execution Pass ${ledger.passId} has no attempt.`);
  return attempt;
}

function priorVerifiedPassResults(run: ExecutionRun): ExecutionPassResultSummary[] {
  return run.passes.flatMap((pass) => {
    if (pass.status !== "verified" || pass.attempts.length === 0) return [];
    const attempt = latestAttempt(pass);
    const resultArtifactId =
      attempt.verificationResultArtifactId ?? attempt.implementerResultArtifactId;
    if (!resultArtifactId) return [];
    return [
      {
        passId: pass.passId,
        resultArtifactId,
        summary: `${pass.title} independently verified.`,
      },
    ];
  });
}

function boundedExecutionSummary(value: string, maximumCharacters = 4_000): string {
  const normalized = value.trim();
  if (normalized.length <= maximumCharacters) return normalized;
  return `${normalized.slice(0, maximumCharacters).trimEnd()}\n\n[Bounded execution source excerpt.]`;
}

function executionRecord(value: JsonValue): Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, JsonValue>
    : {};
}

function collectExecutionStringArrays(
  data: Record<string, JsonValue>,
  keys: readonly string[],
): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const candidate = data[key];
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      if (typeof item === "string" && item.trim()) values.push(item.trim());
    }
  }
  return Array.from(new Set(values));
}

function safeExecutionPathSegment(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) {
    throw new Error(`${label} is not a valid fixed execution path segment.`);
  }
  return value;
}
