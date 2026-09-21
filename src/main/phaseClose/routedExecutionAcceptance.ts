import fs from "node:fs";
import { resolvePlanningProjectionContext, type PlanningProjectionContext } from "../documents/planningProjectionContext";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import type { ExecutionBoundaryEvidence, ExecutionCriterionEvidence, PlanExecutionInput } from "../../shared/planExecutionContracts";
import type { RoutedAcceptanceBoundary, RoutedAcceptanceInput, RoutedAcceptanceProjection, RoutedDevelopmentExecutionBinding } from "../../shared/routedDevelopmentExecutionContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { listPlanningDocuments, evaluateDocumentFreshness } from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument, updateCanonicalMarkdownDisposition } from "../documents/canonicalMarkdownDocumentWriter";
import { inheritRepositoryBindingFromSourceRevisions, mergeRepositoryBindingIntoWorkflowData } from "../documents/repositoryBinding";
import { projectPlanExecution } from "../planExecution/planExecutor";
import { isAcceptedCloseout } from "./phaseCloseService";

export function routedAcceptanceBoundaries(binding: RoutedDevelopmentExecutionBinding): RoutedAcceptanceBoundary[] {
  return [...(binding.structure.topology === "phased" ? binding.structure.phases.map((phase) => ({ kind: "phase" as const, phaseId: phase.phaseId })) : []), { kind: "plan" }];
}
export function routedAcceptancePath(binding: RoutedDevelopmentExecutionBinding, boundary: RoutedAcceptanceBoundary): string {
  if (!routedAcceptanceBoundaries(binding).some((entry) => isDeepStrictEqual(entry, boundary))) throw Error("Unknown execution acceptance boundary; direct Plans have no Phase.");
  const base = `planning/work-intake/execution/${binding.identity.intakeId}/${binding.identity.routeDecisionId}/${binding.identity.planId}`;
  return boundary.kind === "plan" ? `${base}/Acceptance/PLAN_CLOSEOUT.md` : `${base}/phases/${boundary.phaseId}/Acceptance/PHASE_CLOSEOUT.md`;
}
function criteriaFor(binding: RoutedDevelopmentExecutionBinding, boundary: RoutedAcceptanceBoundary): string[] {
  return boundary.kind === "plan" ? binding.structure.acceptanceCriteria : binding.structure.topology === "phased" ? binding.structure.phases.find((phase) => phase.phaseId === boundary.phaseId)!.acceptanceCriteria : [];
}
function identityFor(binding: RoutedDevelopmentExecutionBinding, boundary: RoutedAcceptanceBoundary) {
  return { ...binding.identity, executionBoundary: boundary.kind, ...(boundary.kind === "phase" ? { phaseId: boundary.phaseId } : {}) };
}
function currentDigest(root: string, relative: string): string {
  const resolved = resolveRepositoryPath(root, relative);
  if (relative !== resolved.relativePath || !fs.statSync(resolved.resolvedPath).isFile() || fs.statSync(resolved.resolvedPath).size > 1_000_000) throw Error("Acceptance evidence must be bounded and repository-contained.");
  return createHash("sha256").update(fs.readFileSync(resolved.resolvedPath)).digest("hex");
}
function validateCriteria(value: unknown, declared: string[]): asserts value is ExecutionCriterionEvidence[] {
  if (!Array.isArray(value) || value.length !== declared.length || new Set(value.map((entry) => entry?.criterion)).size !== declared.length || value.some((entry) =>
    !entry || !declared.includes(entry.criterion) || !["pending", "passed", "failed"].includes(entry.status) || !Array.isArray(entry.evidencePaths) || entry.evidencePaths.length > 100 ||
    entry.evidencePaths.some((relative: unknown) => typeof relative !== "string" || !relative || relative.length > 1000) || (entry.status === "passed" && !entry.evidencePaths.length))) throw Error("Every declared acceptance criterion requires an explicit status and passing evidence.");
}
/** Snapshot only this boundary's children and predecessor boundaries, never its own record. */
function basis(binding: RoutedDevelopmentExecutionBinding, input: PlanExecutionInput, boundary: RoutedAcceptanceBoundary): string[] {
  const items = binding.structure.workItems.filter((item) => boundary.kind === "plan" || item.phaseId === boundary.phaseId);
  const phaseIds = boundary.kind === "plan" ? input.phases.map((phase) => phase.phaseId) : binding.structure.topology === "phased" ? binding.structure.phases.find((phase) => phase.phaseId === boundary.phaseId)!.dependsOn : [];
  return [...new Set([binding.planPath, binding.relativePath,
    ...items.flatMap((item) => input.workItems.find((entry) => entry.workItemId === item.workItemId)?.evidencePaths ?? []),
    ...phaseIds.map((phaseId) => routedAcceptancePath(binding, { kind: "phase", phaseId })),
  ])].sort();
}
function eligible(input: PlanExecutionInput, boundary: RoutedAcceptanceBoundary): boolean {
  // Its own prior rejection/staleness must not prevent a corrected acceptance revision.
  const projection = projectPlanExecution({ ...input, planEvidence: undefined, phases: boundary.kind === "phase" ? input.phases.filter((phase) => phase.phaseId !== boundary.phaseId) : input.phases });
  if (projection.blockers.length) return false;
  if (boundary.kind === "plan") return projection.workItemsComplete && projection.phasesComplete;
  const phase = projection.phases.find((entry) => entry.phaseId === boundary.phaseId);
  return Boolean(phase?.eligible && phase.workItemsComplete);
}
function readAcceptance(root: string, binding: RoutedDevelopmentExecutionBinding, input: PlanExecutionInput, boundary: RoutedAcceptanceBoundary, planningContext?: PlanningProjectionContext) {
  const relativePath = routedAcceptancePath(binding, boundary);
  const document = listPlanningDocuments(planningContext ?? root).find((entry) => entry.markdownPath === relativePath);
  const declared = criteriaFor(binding, boundary);
  const projection: RoutedAcceptanceProjection = { boundary, relativePath, acceptanceCriteria: declared, eligible: eligible(input, boundary), fresh: false, reasons: [], criteria: [] };
  if (!document) return { projection, evidence: undefined };
  const evidence: ExecutionBoundaryEvidence = { planRevision: binding.planRevision, fresh: false, blockers: [], evidencePaths: [relativePath], criteria: [] };
  try {
    const meta = document.metadata.canonical;
    if (document.documentReadState !== "readable" || !meta || meta.artifactType !== `${boundary.kind}-closeout` || meta.participationRole !== "compoundGatingReview" || !isDeepStrictEqual(meta.identity, identityFor(binding, boundary))) throw Error("Acceptance record has incompatible boundary identity.");
    projection.artifactRevision = meta.artifactRevision;
    projection.disposition = document.effectiveDisposition;
    validateCriteria(meta.workflowData.criteria, declared);
    projection.criteria = meta.workflowData.criteria;
    const expectedBasis = basis(binding, input, boundary);
    const expectedSources = [...new Set([...expectedBasis, ...projection.criteria.flatMap((entry) => entry.evidencePaths)])].sort();
    const digests = meta.workflowData.sourceDigests as Record<string, unknown> | undefined;
    if (meta.workflowData.planRevision !== binding.planRevision || meta.workflowData.planDigest !== binding.planDigest || !isDeepStrictEqual(meta.workflowData.completionBasis, expectedBasis) ||
      !isDeepStrictEqual(meta.sourceRevisions.map((source) => source.path).sort(), expectedSources) || !digests || !isDeepStrictEqual(Object.keys(digests).sort(), expectedSources) ||
      !meta.sourceRevisions.every((source) => currentDigest(root, source.path) === digests[source.path]) || evaluateDocumentFreshness(planningContext ?? root, document.logicalDocumentId).state !== "fresh") throw Error("Acceptance evidence is stale; record a new revision against current completion evidence.");
    projection.fresh = evidence.fresh = true;
    evidence.criteria = projection.criteria.map((entry) => ({ ...entry, status: isAcceptedCloseout(document.effectiveDisposition, meta.workflowData.closureDecision, true) ? entry.status : "pending", evidencePaths: [...entry.evidencePaths, relativePath] }));
  } catch (error) {
    projection.reasons.push((error as Error).message);
    evidence.blockers.push((error as Error).message);
  }
  return { projection, evidence };
}

/** Populate real Phase and Plan acceptance, then let the generic executor decide completion. */
export function loadRoutedAcceptance(root: string, binding: RoutedDevelopmentExecutionBinding, input: PlanExecutionInput, planningContext?: PlanningProjectionContext): RoutedAcceptanceProjection[] {
  planningContext = resolvePlanningProjectionContext(root, planningContext);
  const boundaries = routedAcceptanceBoundaries(binding);
  // Basis uses deterministic Phase paths, so record loading does not depend on array order.
  const phaseResults = boundaries.filter((boundary) => boundary.kind === "phase").map((boundary) => ({ boundary, ...readAcceptance(root, binding, input, boundary, planningContext) }));
  input.phases = phaseResults.flatMap(({ boundary, evidence }) => evidence && boundary.kind === "phase" ? [{ ...evidence, phaseId: boundary.phaseId }] : []);
  const plan = readAcceptance(root, binding, input, { kind: "plan" }, planningContext);
  input.planEvidence = plan.evidence;
  return [...phaseResults.map(({ boundary, projection }) => ({ ...projection, eligible: eligible(input, boundary) })), plan.projection];
}

export function saveRoutedAcceptance(root: string, binding: RoutedDevelopmentExecutionBinding, input: PlanExecutionInput, request: RoutedAcceptanceInput, planningContext?: PlanningProjectionContext) {
  planningContext = resolvePlanningProjectionContext(root, planningContext);
  const relativePath = routedAcceptancePath(binding, request.boundary);
  if (!eligible(input, request.boundary)) throw Error("Acceptance requires current completed children and prerequisite boundaries.");
  validateCriteria(request.criteria, criteriaFor(binding, request.boundary));
  if (!["Close", "DoNotClose"].includes(request.closureDecision) || typeof request.rationale !== "string" || !request.rationale.trim() || request.rationale.length > 10000) throw Error("Acceptance requires a bounded rationale and closure decision.");
  const documents = listPlanningDocuments(planningContext ?? root);
  const existing = documents.find((entry) => entry.markdownPath === relativePath);
  if (existing && (!existing.metadata.canonical || !isDeepStrictEqual(existing.metadata.canonical.identity, identityFor(binding, request.boundary)) || existing.metadata.artifactType !== `${request.boundary.kind}-closeout`)) throw Error("Acceptance target conflicts with an existing artifact.");
  const completionBasis = basis(binding, input, request.boundary);
  const paths = [...new Set([...completionBasis, ...request.criteria.flatMap((entry) => entry.evidencePaths)])].sort();
  const sourceRevisions = paths.map((relative) => {
    const document = documents.find((entry) => entry.markdownPath === relative);
    if (relative === relativePath || !document?.metadata.canonical || document.documentReadState !== "readable" || document.metadata.participationRole === "historical" || evaluateDocumentFreshness(planningContext ?? root, document.logicalDocumentId).state !== "fresh") throw Error("Acceptance evidence requires current canonical documents, without self-reference.");
    return { path: relative, revision: document.metadata.artifactRevision ?? 1 };
  });
  const metadata: CanonicalDocumentMetadata = { schemaVersion: 1, artifactType: `${request.boundary.kind}-closeout`, artifactRevision: (existing?.metadata.artifactRevision ?? 0) + 1,
    participationRole: "compoundGatingReview", identity: identityFor(binding, request.boundary), sourceRevisions,
    workflowData: mergeRepositoryBindingIntoWorkflowData({ closureDecision: request.closureDecision, rationale: request.rationale.trim(), criteria: request.criteria, completionBasis,
      planRevision: binding.planRevision, planDigest: binding.planDigest, sourceDigests: Object.fromEntries(paths.map((relative) => [relative, currentDigest(root, relative)])) }, inheritRepositoryBindingFromSourceRevisions(root, sourceRevisions)),
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null } };
  writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath, metadata, bodyMarkdown: `# ${request.boundary.kind === "plan" ? "Plan" : "Phase"} Acceptance\n\n${request.rationale.trim()}\n\n` + request.criteria.map((entry) => `- ${entry.criterion}: ${entry.status}\n  Evidence: ${entry.evidencePaths.join(", ")}`).join("\n") + "\n" });
  return { relativePath, artifactRevision: metadata.artifactRevision };
}

export function reviewRoutedAcceptance(root: string, binding: RoutedDevelopmentExecutionBinding, input: PlanExecutionInput, request: { boundary: RoutedAcceptanceBoundary; expectedRevision: number; disposition: "Approved" | "RevisionRequested" | "Rejected"; notes?: string }, planningContext?: PlanningProjectionContext) {
  planningContext = resolvePlanningProjectionContext(root, planningContext);
  const { projection } = readAcceptance(root, binding, input, request.boundary, planningContext);
  if (!projection.eligible || !projection.fresh || projection.artifactRevision !== request.expectedRevision || !["Approved", "RevisionRequested", "Rejected"].includes(request.disposition)) throw Error("Current eligible acceptance revision is required for review.");
  if (request.disposition === "Approved") {
    const document = listPlanningDocuments(planningContext ?? root).find((entry) => entry.markdownPath === projection.relativePath)!;
    if (!isAcceptedCloseout("Approved", document.metadata.canonical?.workflowData.closureDecision, true) || projection.criteria.some((entry) => entry.status !== "passed")) throw Error("Approval requires Close and passing evidence for every declared acceptance criterion.");
  }
  updateCanonicalMarkdownDisposition({ workspaceRoot: root, relativePath: projection.relativePath, status: request.disposition, notes: request.notes });
  return { relativePath: projection.relativePath, artifactRevision: projection.artifactRevision };
}
