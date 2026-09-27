import type { TesterRecommendation } from "../../shared/projectState/domainContracts";

export type TestLifecycleRecommendation = TesterRecommendation;

export interface TestLifecycleCatalogProof {
  testPath: string;
  behaviorCoverage: Array<{ capabilityId: string; behaviorId: string }>;
  proofRole?: string;
  validationLane?: string;
  durationMs?: number;
  ownedResources?: string[];
}

export interface TestLifecycleDeterminationInput {
  workItemId: string;
  implementerRevision: string;
  changedPaths: string[];
  affectedCapabilityIds: string[];
  catalogProof: TestLifecycleCatalogProof[];
  regressionObligations?: Array<{ id: string; capabilityId: string; state: string }>;
  priorLifecycleStatuses?: string[];
  evidenceComplete?: boolean;
  noPermanentTestRationale?: string;
  productionDefectEvidence?: string;
}

export interface TestLifecycleDeterminationResult {
  workItemId: string;
  implementerRevision: string;
  changedPaths: string[];
  affectedCapabilityIds: string[];
  consideredProof: Array<{ testPath: string; behaviorIds: string[]; proofRole?: string; validationLane?: string; durationMs?: number; ownedResources?: string[] }>;
  consideredObligations: Array<{ id: string; capabilityId: string; state: string }>;
  priorLifecycleStatuses: string[];
  recommendation: TestLifecycleRecommendation;
  evidence: string[];
  unknowns: string[];
}

function requiredText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
}

function uniqueSorted(values: string[], label: string): string[] {
  if (!Array.isArray(values) || values.some(value => typeof value !== "string" || !value.trim())) {
    throw new Error(`${label} must contain nonempty strings.`);
  }
  return [...new Set(values)].sort();
}

function safeRepoPath(value: string): boolean {
  return value.length > 0 && !value.includes("\\") && !value.startsWith("/")
    && !/^[a-z][a-z0-9+.-]*:/i.test(value)
    && value.split("/").every(part => part !== "" && part !== "." && part !== "..");
}

/** Produce bounded advisory lifecycle evidence; this function never reads or mutates repository state. */
export function determineTestLifecycle(input: TestLifecycleDeterminationInput): TestLifecycleDeterminationResult {
  requiredText(input?.workItemId, "WorkItem ID");
  requiredText(input?.implementerRevision, "Implementer revision");
  const changedPaths = uniqueSorted(input.changedPaths, "Changed paths");
  if (changedPaths.some(path => !safeRepoPath(path))) throw new Error("Changed paths must be safe repository-relative paths.");
  const affectedCapabilityIds = uniqueSorted(input.affectedCapabilityIds, "Affected capability IDs");
  if (!Array.isArray(input.catalogProof)) throw new Error("Catalog proof must be supplied as a bounded array.");
  for (const proof of input.catalogProof) {
    requiredText(proof?.testPath, "Catalog test path");
    if (!safeRepoPath(proof.testPath)) throw new Error("Catalog test paths must be safe repository-relative paths.");
    if (!Array.isArray(proof.behaviorCoverage) || proof.behaviorCoverage.some(item =>
      !item || !affectedCapabilityIds.includes(item.capabilityId) || !item.behaviorId?.trim())) {
      throw new Error("Catalog proof must identify valid behavior coverage for an affected capability.");
    }
    if (proof.validationLane !== undefined) requiredText(proof.validationLane, "Catalog validation lane");
    if (proof.durationMs !== undefined && (!Number.isSafeInteger(proof.durationMs) || proof.durationMs < 0)) {
      throw new Error("Catalog duration must be a nonnegative integer.");
    }
    if (proof.ownedResources !== undefined) uniqueSorted(proof.ownedResources, "Catalog owned resources");
  }
  const obligations = input.regressionObligations ?? [];
  if (!Array.isArray(obligations) || obligations.some(item => !item?.id?.trim()
    || !item.capabilityId?.trim() || !item.state?.trim())) throw new Error("Regression obligations are malformed.");
  const priorLifecycleStatuses = uniqueSorted(input.priorLifecycleStatuses ?? [], "Prior lifecycle statuses");
  const matchingProof = input.catalogProof.flatMap(proof => {
    const behaviors = proof.behaviorCoverage.filter(item => affectedCapabilityIds.includes(item.capabilityId));
    return behaviors.length ? [{ testPath: proof.testPath, behaviorIds: [...new Set(behaviors.map(item => item.behaviorId))].sort(),
      ...(proof.proofRole ? { proofRole: proof.proofRole } : {}),
      ...(proof.validationLane ? { validationLane: proof.validationLane } : {}),
      ...(proof.durationMs !== undefined ? { durationMs: proof.durationMs } : {}),
      ...(proof.ownedResources ? { ownedResources: uniqueSorted(proof.ownedResources, "Catalog owned resources") } : {}) }] : [];
  }).sort((a, b) => a.testPath < b.testPath ? -1 : a.testPath > b.testPath ? 1 : 0);
  const matchingObligations = obligations.filter(item => affectedCapabilityIds.includes(item.capabilityId))
    .map(item => ({ ...item })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const evidence: string[] = [];
  const unknowns: string[] = [];
  let recommendation: TestLifecycleRecommendation;
  if (input.productionDefectEvidence?.trim()) {
    recommendation = "production-defect-suspected";
    evidence.push(input.productionDefectEvidence.trim());
  } else if (input.noPermanentTestRationale?.trim() && input.evidenceComplete === true && affectedCapabilityIds.length > 0) {
    recommendation = "no-permanent-test-required";
    evidence.push(input.noPermanentTestRationale.trim());
  } else if (matchingProof.length > 0) {
    recommendation = "reuse-existing-proof";
    evidence.push(`ValidationCatalog proof covers affected capabilities: ${matchingProof.map(item => item.testPath).join(", ")}.`);
  } else if (affectedCapabilityIds.length > 0 && input.evidenceComplete === true) {
    recommendation = "permanent-proof-change-warranted";
    evidence.push("No supplied ValidationCatalog proof covers the affected capabilities.");
  } else {
    recommendation = "lifecycle-review-candidate";
    unknowns.push("Evidence is incomplete or no affected capability was identified.");
  }
  if (input.evidenceComplete !== true) unknowns.push("The caller did not establish that the bounded evidence set is complete.");
  if (affectedCapabilityIds.length === 0) unknowns.push("Affected capability ownership is unknown.");
  if (matchingObligations.length === 0) unknowns.push("No current RegressionObligation was supplied for the affected capabilities.");
  if (priorLifecycleStatuses.length > 0) evidence.push(`Prior lifecycle assessments supplied: ${priorLifecycleStatuses.join(", ")}.`);
  return { workItemId: input.workItemId, implementerRevision: input.implementerRevision, changedPaths,
    affectedCapabilityIds, consideredProof: matchingProof, consideredObligations: matchingObligations,
    priorLifecycleStatuses, recommendation, evidence, unknowns };
}
