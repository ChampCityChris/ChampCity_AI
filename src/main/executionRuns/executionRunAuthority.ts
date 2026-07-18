import {
  advanceExecutionRun,
  compileImplementerPassJob,
  compileIndependentVerificationJob,
  createExecutionRun,
  validateExecutionPassPlan,
  type ExecutionAgentJob,
  type EligibleExecutionRunWorkCard,
  type EligibleExecutionRunWorkCardsResult,
  type ExecutionJobPreviewResult,
  type ExecutionPacketSourceSummary,
  type ExecutionPassPlan,
  type ExecutionPassResultSummary,
  type ExecutionRepositoryFacts,
  type ExecutionRun,
  type ExecutionRunArtifactPaths,
  type ExecutionRunLookupRequest,
  type ExecutionRunOperationResult,
  type ExecutionRunStartRequest,
  type ExecutionRunStatusPreviewResult,
  type TrustedExecutionRunInitializeRequest,
  type WorkCardAcceptanceContract,
} from "../../shared/executionRuns";
import { compileExecutionRunDefinitionV1 } from "../../shared/executionRuns";
import type { CanonicalArtifact, JsonValue } from "../../shared/artifacts";
import {
  ArtifactPairService,
  ArtifactPairServiceError,
  locationFromPairPaths,
} from "../artifacts";

const WC04_WORK_CARD_ARTIFACT_ID = "champcity-ai/phase-06/work_card/WC04";
const WC04_ARCHITECT_REVIEW_ARTIFACT_ID = "champcity-ai/phase-06/architect_review/WC04";
const WC05_WORK_CARD_ARTIFACT_ID = "champcity-ai/phase-06/work_card/WC05";
const WC05_ARCHITECT_REVIEW_ARTIFACT_ID = "champcity-ai/phase-06/architect_review/WC05";

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
      const existing = await this.tryLoadExistingRun(request);
      if (existing) return existing;
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

  async listExactAuthoritativeArtifactsByType(
    artifactType: string,
  ): Promise<CanonicalArtifact[]> {
    const registry = await this.artifactPairs.loadRegistry();
    if (!registry) throw new Error("Canonical Artifact Registry is unavailable.");
    const artifacts: CanonicalArtifact[] = [];
    for (const entry of registry.entries) {
      if (
        entry.artifactType !== artifactType ||
        !entry.authoritative ||
        !entry.synchronized
      ) {
        continue;
      }
      const pair = await this.artifactPairs.readArtifactByPaths(
        entry.jsonPath,
        entry.markdownPath,
      );
      if (!pair.verification.synchronized) {
        throw new Error(`Canonical artifact ${entry.artifactId} is not synchronized.`);
      }
      if (pair.artifact.artifactId !== entry.artifactId) {
        throw new Error(`Canonical artifact ${entry.artifactId} path resolved conflicting identity.`);
      }
      artifacts.push(pair.artifact);
    }
    return artifacts;
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

  private async tryLoadExistingRun(
    request: TrustedExecutionRunInitializeRequest,
  ): Promise<ExecutionRunOperationResult | null> {
    try {
      const existing = await this.readBundle(request);
      if (
        stableExecutionJson(existing.contract) !== stableExecutionJson(request.contract) ||
        stableExecutionJson(existing.plan) !== stableExecutionJson(request.plan)
      ) {
        throw new Error("A conflicting Execution Run bundle already exists for this Work Card.");
      }
      return { ok: true, ...existing };
    } catch (error) {
      if (isExecutionPairNotFound(error)) return null;
      throw error;
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

  async listEligibleWorkCards(): Promise<EligibleExecutionRunWorkCardsResult> {
    try {
      const workCards = await this.persistence.listExactAuthoritativeArtifactsByType("work_card");
      const eligible: EligibleExecutionRunWorkCard[] = [];
      for (const workCard of workCards) {
        const candidate = await this.eligibleWorkCard(workCard);
        if (candidate.eligible) eligible.push(candidate);
      }
      eligible.sort((left, right) =>
        `${left.phaseId}/${left.workCardId}`.localeCompare(`${right.phaseId}/${right.workCardId}`),
      );
      return { ok: true, workCards: eligible };
    } catch (error) {
      return { ok: false, workCards: [], errorMessages: [plainExecutionError(error)] };
    }
  }

  async startFromWorkCardAuthority(
    request: ExecutionRunStartRequest,
  ): Promise<ExecutionRunOperationResult> {
    try {
      const workCard = await this.persistence.readExactAuthoritativeArtifact(
        request.workCardArtifactId,
      );
      if (workCard.revision !== request.workCardRevision) {
        throw new Error("Selected Work Card revision does not match canonical authority.");
      }
      const compiled = await this.compileTrustedStart(workCard);
      return this.persistence.initializeTrusted(compiled);
    } catch (error) {
      return executionOperationFailure(error);
    }
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

  private async eligibleWorkCard(
    workCard: CanonicalArtifact,
  ): Promise<EligibleExecutionRunWorkCard> {
    const reasons: string[] = [];
    let approvalArtifactId = "";
    let approvedRevision = 0;
    let run: ExecutionRun | undefined;
    try {
      const data = executionRecord(workCard.payload.data);
      approvalArtifactId = requiredExecutionString(data.approvedBy, "approvedBy");
      approvedRevision = requiredExecutionNumber(data.approvedRevision, "approvedRevision");
      await this.compileTrustedStart(workCard);
      if (workCard.phaseId && workCard.workCardId) {
        const loaded = await this.persistence.load({
          phaseId: workCard.phaseId,
          workCardId: workCard.workCardId,
        });
        if (loaded.ok && loaded.run) run = loaded.run;
      }
    } catch (error) {
      reasons.push(plainExecutionError(error));
    }
    return {
      workCardArtifactId: workCard.artifactId,
      workCardRevision: workCard.revision,
      phaseId: workCard.phaseId ?? "",
      workCardId: workCard.workCardId ?? "",
      title: workCard.payload.title,
      status: String(executionRecord(workCard.payload.data).status ?? workCard.status),
      approvalArtifactId,
      approvedRevision,
      eligible: reasons.length === 0,
      reasons,
      ...(run ? { run } : {}),
    };
  }

  private async compileTrustedStart(
    workCard: CanonicalArtifact,
  ): Promise<TrustedExecutionRunInitializeRequest> {
    if (workCard.artifactType !== "work_card") {
      throw new Error("Execution Run start requires a Work Card artifact.");
    }
    if (!workCard.phaseId || !workCard.workCardId) {
      throw new Error("Execution Run Work Card must declare phase and Work Card IDs.");
    }
    if (workCard.projectId !== this.projectId) {
      throw new Error("Execution Run Work Card belongs to another project.");
    }
    const data = executionRecord(workCard.payload.data);
    if (data.status !== "approved_for_implementer_execution") {
      throw new Error("Work Card is not approved for Implementer execution.");
    }
    if (data.sourceCodeChangesAuthorized !== true) {
      throw new Error("Work Card does not authorize source-code changes.");
    }
    if (data.pushAuthorized !== false) {
      throw new Error("Work Card must explicitly keep push unauthorized for this run.");
    }
    if (data.expectedImplementerReportArtifactId !== `champcity-ai/${workCard.phaseId}/implementer_report/${workCard.workCardId}`) {
      throw new Error("Work Card expected Implementer Report identity is not exact.");
    }
    const approvalArtifactId = requiredExecutionString(data.approvedBy, "approvedBy");
    const approvalRevision = requiredExecutionNumber(data.approvedRevision, "approvedRevision");
    const approval = await this.persistence.readExactAuthoritativeArtifact(approvalArtifactId);
    if (approval.revision !== approvalRevision) {
      throw new Error("Operator Approval revision does not match Work Card authority.");
    }
    await this.validateWc05AcceptedDependency(workCard);
    const { contract, plan } = compileExecutionRunDefinitionV1({
      definition: data.executionRunDefinition,
      workCardArtifactId: workCard.artifactId,
      workCardRevision: workCard.revision,
      approvalArtifactId,
      implementationBranch: requiredExecutionString(
        data.implementationBranch,
        "implementationBranch",
      ),
      passTokenBudget: 5_000,
    });
    await this.validateCompiledApproval(approval, workCard, contract, plan);
    return {
      projectId: workCard.projectId,
      phaseId: workCard.phaseId,
      workCardId: workCard.workCardId,
      contract,
      plan,
    };
  }

  private async validateCompiledApproval(
    approval: CanonicalArtifact,
    workCard: CanonicalArtifact,
    contract: WorkCardAcceptanceContract,
    plan: ExecutionPassPlan,
  ): Promise<void> {
    const data = executionRecord(approval.payload.data);
    if (approval.artifactType !== "operator_approval") {
      throw new Error("Execution Run authority must resolve an Operator Approval artifact.");
    }
    if (approval.parentArtifactId !== workCard.artifactId) {
      throw new Error("Operator Approval parent does not bind to the selected Work Card.");
    }
    if (!approval.relationships.sources.includes(workCard.artifactId)) {
      throw new Error("Operator Approval source relationship does not bind to the selected Work Card.");
    }
    if (data.authorizationGranted !== true || data.sourceCodeChangesAuthorized !== true) {
      throw new Error("Operator Approval does not explicitly authorize source-code execution.");
    }
    if (data.authorizedWorkCardArtifactId !== workCard.artifactId) {
      throw new Error("Operator Approval authorizes a different Work Card.");
    }
    if (data.authorizedRevision !== workCard.revision) {
      throw new Error("Operator Approval authorizes a different Work Card revision.");
    }
    if (data.pushAuthorized !== false) {
      throw new Error("Operator Approval must explicitly keep push unauthorized.");
    }
    const authorizedPasses = data.executionPassesAuthorized;
    if (!Array.isArray(authorizedPasses)) {
      throw new Error("Operator Approval must declare authorized execution passes.");
    }
    const planPasses = plan.passes.map((pass) => pass.passId);
    if (stableExecutionJson(authorizedPasses) !== stableExecutionJson(planPasses)) {
      throw new Error("Operator Approval authorized passes do not match the compiled Execution Pass Plan.");
    }
    if (
      contract.workCardArtifactId !== workCard.artifactId ||
      contract.workCardRevision !== workCard.revision
    ) {
      throw new Error("Compiled Acceptance Contract does not bind to the selected Work Card.");
    }
  }

  private async validateWc05AcceptedDependency(workCard: CanonicalArtifact): Promise<void> {
    if (workCard.artifactId !== "champcity-ai/phase-06/work_card/WC06") return;
    const review = await this.persistence.readExactAuthoritativeArtifact(
      WC05_ARCHITECT_REVIEW_ARTIFACT_ID,
    );
    if (review.artifactType !== "architect_review") {
      throw new Error("WC06 dependency authority is not an Architect Review.");
    }
    if (!review.relationships.sources.includes(WC05_WORK_CARD_ARTIFACT_ID)) {
      throw new Error("WC06 dependency authority does not source the exact WC05 Work Card.");
    }
    const data = executionRecord(review.payload.data);
    if (
      data.reviewedWorkCardArtifactId !== WC05_WORK_CARD_ARTIFACT_ID ||
      data.decision !== "accepted_for_operator_validation" ||
      data.foundationAccepted !== true
    ) {
      throw new Error("WC05 Architect Review has not accepted the execution-run foundation.");
    }
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

function requiredExecutionString(value: JsonValue, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Execution Run authority requires ${label}.`);
  }
  return value;
}

function requiredExecutionNumber(value: JsonValue, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new Error(`Execution Run authority requires positive integer ${label}.`);
  }
  return value as number;
}

function plainExecutionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isExecutionPairNotFound(error: unknown): boolean {
  if (error instanceof ArtifactPairServiceError && error.code === "not_found") {
    return true;
  }
  if (error instanceof Error && /Canonical artifact pair does not exist/.test(error.message)) {
    return true;
  }
  return false;
}

function stableExecutionJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableExecutionJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableExecutionJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
