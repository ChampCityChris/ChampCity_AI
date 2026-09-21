import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { metadataWithSubstantiveRevision, parseCanonicalMarkdownDocument, type CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import type { SourceRevision } from "../../shared/documents/planningDocument";
import { isWorkRouteId, type OperatorRouteDecision, type OperatorRouteSelection, type WorkRouteRerouteRecommendation, type WorkRouteSupersession } from "../../shared/workIntakeRoutingContracts";
import type { WorkRouteDecisionEntry, WorkRouteDecisionInput, WorkRouteDecisionModel, WorkRouteRerouteInput } from "../../shared/workRouteDecisionContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { writeCanonicalMarkdownDocuments, type WriteCanonicalMarkdownDocumentInput } from "../documents/canonicalMarkdownDocumentWriter";
import { listPlanningDocuments } from "../documents/planningDocumentService";
import { createWorkIntakeBranchService } from "./workIntakeBranchService";
import { readWorkIntake } from "./workIntakeService";
import { readRoutingAssessment } from "./workRoutingAssessmentService";
import { issueEvidenceBytes, issueEvidenceDigest } from "../workPlanning/workIssueContext";

export const workRouteDecisionPath = (intakeId: string) => `planning/work-intake/routes/${intakeId}.md`;
const reroutePath = (intakeId: string) => `planning/work-intake/reroutes/${intakeId}.md`;
function read(root: string, relativePath: string) {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Route evidence path must not be redirected.");
  if (!fs.existsSync(resolved.resolvedPath)) return null;
  if (!fs.statSync(resolved.resolvedPath).isFile() || fs.statSync(resolved.resolvedPath).size > 1_000_000) throw Error("Route evidence must be bounded canonical Markdown.");
  return parseCanonicalMarkdownDocument(fs.readFileSync(resolved.resolvedPath, "utf8"));
}
async function verify(root: string, intakeId: string) {
  const intake = readWorkIntake(root, intakeId);
  await createWorkIntakeBranchService({ repositoryRoot: root, repositoryId: intake.branchBinding.repositoryId }).verify(intake.branchBinding);
  return intake;
}
function assertSources(root: string, sources: readonly SourceRevision[]) {
  for (const source of sources) {
    const document = read(root, source.path);
    if (document?.metadata.artifactRevision !== source.revision) throw Error("Route evidence is stale; refresh before deciding.");
    const digests = document.metadata.workflowData.sourceDigests;
    if (digests !== undefined && (!digests || typeof digests !== "object" || Array.isArray(digests) ||
      Object.entries(digests).some(([filePath, digest]) => typeof digest !== "string" || issueEvidenceDigest(issueEvidenceBytes(root, filePath)) !== digest))) throw Error("Route evidence content changed; refresh before deciding.");
  }
}
function metadata(artifactType: string, intakeId: string, revision: number, sources: SourceRevision[], data: Record<string, unknown>): CanonicalDocumentMetadata {
  return { schemaVersion: 1, artifactType, artifactRevision: revision, participationRole: "contextOnly", identity: { intakeId },
    sourceRevisions: sources, workflowData: data, documentDisposition: { status: "Pending", notes: "", reviewedAt: null } };
}

export async function getWorkRouteDecision(root: string, intakeId: string): Promise<WorkRouteDecisionModel> {
  const intake = await verify(root, intakeId);
  const relativePath = workRouteDecisionPath(intakeId);
  const document = read(root, relativePath);
  if (document && (document.metadata.artifactType !== "operator-route-decision" || document.metadata.identity.intakeId !== intakeId)) throw Error("Route decision identity is invalid.");
  const history = (document?.metadata.workflowData.history ?? []) as WorkRouteDecisionEntry[];
  const supersessions = (document?.metadata.workflowData.supersessions ?? []) as WorkRouteSupersession[];
  if (!Array.isArray(history) || !Array.isArray(supersessions) || history.some((entry) => entry.decision?.kind !== "operator-route-decision" || entry.decision.intakeId !== intakeId ||
    !["accept", "override", "request-revision"].includes(entry.decision.disposition) ||
    (entry.decision.disposition !== "request-revision" && !isWorkRouteId(entry.decision.selectedRouteId)))) throw Error("Route decision history is invalid.");
  const latest = history.at(-1);
  let selection: OperatorRouteSelection | undefined;
  for (const entry of history) if (entry.decision.disposition !== "request-revision" &&
    (!selection || entry.decision.selectedRouteId !== selection.selectedRouteId)) selection = entry.decision;
  const assessment = readRoutingAssessment(root, intakeId);
  let recommendation: WorkRouteDecisionModel["recommendation"] = assessment.assessment;
  let sourceAssessment = assessment.assessment ? { path: assessment.assessment.relativePath, revision: assessment.assessment.artifactRevision } : null;
  let state: WorkRouteDecisionModel["state"] = selection ? "selected" : assessment.assessment ? "awaiting-decision" : "awaiting-assessment";
  let error: string | undefined;
  const reroute = read(root, reroutePath(intakeId));
  const pending = reroute?.metadata.workflowData.recommendation as WorkRouteRerouteRecommendation | undefined;
  if (pending && pending.priorDecisionId === selection?.decisionId) {
    if (reroute!.metadata.artifactType !== "work-route-reroute" || reroute!.metadata.identity.intakeId !== intakeId || pending.kind !== "architect-reroute-recommendation" || !isWorkRouteId(pending.replacementRouteId)) throw Error("Reroute recommendation identity is invalid.");
    const pendingSource = { path: reroutePath(intakeId), revision: reroute!.metadata.artifactRevision };
    const disposition = [...history].reverse().find((entry) => entry.decision.assessmentId === pending.recommendationId &&
      entry.decision.sourceAssessment.path === pendingSource.path && entry.decision.sourceAssessment.revision === pendingSource.revision);
    if (!disposition) {
      recommendation = pending; sourceAssessment = pendingSource; state = "reroute-required";
      try { assertSources(root, reroute!.metadata.sourceRevisions); } catch { state = "stale"; error = "Reroute evidence changed; request a current recommendation."; }
    } else if (disposition.decision.disposition === "request-revision") {
      recommendation = pending; sourceAssessment = pendingSource; state = "revision-requested";
    }
  } else if (assessment.stale && !selection) { state = "stale"; error = "Routing assessment is stale."; }
  if (!selection && latest?.decision.disposition === "request-revision" && latest.decision.sourceAssessment.path === sourceAssessment?.path &&
    latest.decision.sourceAssessment.revision === sourceAssessment.revision) state = "revision-requested";
  if (latest && latest.sourceIntake.revision !== intake.artifactRevision) { state = "stale"; error = "Work Intake changed; a current route decision is required."; }
  return { intakeId, relativePath, artifactRevision: document?.metadata.artifactRevision ?? 0, state, selection: selection ?? null, history, supersessions, recommendation, sourceAssessment, error };
}

function validateDecision(input: WorkRouteDecisionInput) {
  if (!input || Object.keys(input).some((key) => !["expectedDecisionRevision", "sourceAssessment", "disposition", "selectedRouteId", "rationale"].includes(key)) ||
    !Number.isInteger(input.expectedDecisionRevision) || input.expectedDecisionRevision < 0 ||
    !["accept", "override", "request-revision"].includes(input.disposition) || typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.length > 4000 ||
    (input.disposition === "override" ? !isWorkRouteId(input.selectedRouteId) : input.selectedRouteId !== undefined)) throw Error("Invalid Operator route decision. Supply a rationale and a supported override only when overriding.");
}

/** Downstream lineage is explicit; no route is inferred from filenames or legacy workflow IDs. */
function downstream(root: string, intakeId: string, routePath: string): SourceRevision[] {
  const documents = listPlanningDocuments(root).filter((item) => item.metadata.canonical?.identity.intakeId === intakeId &&
    item.markdownPath !== routePath && item.metadata.artifactType !== "work-route-reroute" && item.metadata.participationRole !== "historical");
  const affected = new Map<string, number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of documents) if (!affected.has(item.markdownPath) && item.metadata.sourceRevisions?.some((source) => source.path === routePath || affected.has(source.path))) {
      affected.set(item.markdownPath, item.metadata.artifactRevision!); changed = true;
    }
  }
  return [...affected].map(([path, revision]) => ({ path, revision }));
}

export async function decideWorkRoute(root: string, intakeId: string, input: WorkRouteDecisionInput): Promise<WorkRouteDecisionModel> {
  validateDecision(input);
  const model = await getWorkRouteDecision(root, intakeId);
  const intake = readWorkIntake(root, intakeId);
  if (model.artifactRevision !== input.expectedDecisionRevision) throw Error("Route decision changed; refresh before deciding.");
  if (!model.recommendation || !model.sourceAssessment || model.sourceAssessment.path !== input.sourceAssessment?.path || model.sourceAssessment.revision !== input.sourceAssessment.revision) throw Error("Presented routing assessment is stale or missing.");
  if (model.state === "revision-requested") throw Error("A revised assessment is required before deciding.");
  const source = read(root, model.sourceAssessment.path)!;
  assertSources(root, source.metadata.sourceRevisions);
  if (model.recommendation.kind === "architect-route-assessment" && readRoutingAssessment(root, intakeId).stale) throw Error("Routing assessment is stale; prepare it again.");
  if (model.state !== "awaiting-decision" && model.state !== "reroute-required") throw Error("A route decision is not pending.");
  const recommended = model.recommendation.kind === "architect-route-assessment" ? model.recommendation.recommendedRouteId : model.recommendation.replacementRouteId;
  const decisionId = `decision-${randomUUID()}`;
  const common = { kind: "operator-route-decision" as const, decisionId, intakeId,
    assessmentId: model.recommendation.kind === "architect-route-assessment" ? model.recommendation.assessmentId : model.recommendation.recommendationId,
    sourceAssessment: model.sourceAssessment, rationale: input.rationale.trim() };
  const decision: OperatorRouteDecision = input.disposition === "request-revision" ? { ...common, disposition: input.disposition }
    : { ...common, disposition: input.disposition, selectedRouteId: input.disposition === "accept" ? recommended : input.selectedRouteId!,
      traits: model.recommendation.kind === "architect-route-assessment" ? model.recommendation.traits : model.selection?.traits ?? [] };
  const sourceIntake = { path: intake.relativePath, revision: intake.artifactRevision };
  const history = [...model.history, { decision, sourceIntake, advice: model.recommendation, recordedAt: new Date().toISOString() }];
  if (history.length > 100) throw Error("Route decision history exceeds its supported bound.");
  const supersessions = [...model.supersessions];
  const writes: WriteCanonicalMarkdownDocumentInput[] = [];
  if (model.selection && decision.disposition !== "request-revision" && decision.selectedRouteId !== model.selection.selectedRouteId) {
    const artifacts = downstream(root, intakeId, model.relativePath);
    supersessions.push({ intakeId, priorDecisionId: model.selection.decisionId, replacementDecisionId: decisionId,
      priorRouteId: model.selection.selectedRouteId, replacementRouteId: decision.selectedRouteId, supersededArtifacts: artifacts });
    for (const artifact of artifacts) {
      const prior = read(root, artifact.path)!;
      writes.push({ workspaceRoot: root, relativePath: artifact.path, bodyMarkdown: prior.bodyMarkdown,
        metadata: { ...metadataWithSubstantiveRevision(prior.metadata), participationRole: "historical",
          workflowData: { ...prior.metadata.workflowData, supersededByRouteDecision: decisionId } } });
    }
  }
  if (input.disposition === "request-revision") writes.push({ workspaceRoot: root, relativePath: model.sourceAssessment.path, bodyMarkdown: source.bodyMarkdown,
    metadata: { ...source.metadata, documentDisposition: { status: "RevisionRequested", notes: decision.rationale, reviewedAt: new Date().toISOString() } } });
  writes.push({ workspaceRoot: root, relativePath: model.relativePath,
    metadata: metadata("operator-route-decision", intakeId, model.artifactRevision + 1, [sourceIntake, model.sourceAssessment], { history, supersessions }),
    bodyMarkdown: `# Operator Route Decision\n\n${history.map((entry) => `## ${entry.decision.decisionId}\n\nDisposition: ${entry.decision.disposition}\nRoute: ${entry.decision.disposition === "request-revision" ? "Revision requested" : entry.decision.selectedRouteId}\n\n${entry.decision.rationale}\n`).join("\n")}` });
  writeCanonicalMarkdownDocuments(writes);
  return getWorkRouteDecision(root, intakeId);
}

export async function recommendWorkRouteReroute(root: string, intakeId: string, input: WorkRouteRerouteInput): Promise<WorkRouteDecisionModel> {
  const model = await getWorkRouteDecision(root, intakeId);
  if (!input || Object.keys(input).some((key) => !["priorDecisionId", "replacementRouteId", "rationale", "sourceEvidence"].includes(key)) ||
    !model.selection || model.selection.decisionId !== input.priorDecisionId || !isWorkRouteId(input.replacementRouteId) || input.replacementRouteId === model.selection.selectedRouteId ||
    typeof input.rationale !== "string" || !input.rationale.trim() || input.rationale.length > 4000 || !Array.isArray(input.sourceEvidence) || input.sourceEvidence.length > 20) throw Error("Reroute requires a current selection, a distinct supported route, and bounded evidence/rationale.");
  const intake = readWorkIntake(root, intakeId);
  const sourceIntake = { path: intake.relativePath, revision: intake.artifactRevision };
  const relativePath = reroutePath(intakeId);
  if (input.sourceEvidence.some((source) => source.path === relativePath)) throw Error("Reroute cannot cite itself.");
  assertSources(root, input.sourceEvidence);
  const prior = read(root, relativePath);
  if (prior && (prior.metadata.artifactType !== "work-route-reroute" || prior.metadata.identity.intakeId !== intakeId)) throw Error("Reroute target identity is invalid.");
  const recommendation: WorkRouteRerouteRecommendation = { kind: "architect-reroute-recommendation", recommendationId: `reroute-${randomUUID()}`,
    intakeId, sourceIntake, sourceEvidence: input.sourceEvidence, priorDecisionId: model.selection.decisionId,
    priorRouteId: model.selection.selectedRouteId, replacementRouteId: input.replacementRouteId, rationale: input.rationale.trim() };
  const history = [...((prior?.metadata.workflowData.history ?? []) as WorkRouteRerouteRecommendation[]), recommendation];
  if (history.length > 100) throw Error("Reroute history exceeds its supported bound.");
  writeCanonicalMarkdownDocuments([{ workspaceRoot: root, relativePath,
    metadata: metadata("work-route-reroute", intakeId, (prior?.metadata.artifactRevision ?? 0) + 1,
      [sourceIntake, { path: model.relativePath, revision: model.artifactRevision }, ...input.sourceEvidence], { recommendation, history }),
    bodyMarkdown: `# Advisory Reroute Recommendation\n\nFrom: ${recommendation.priorRouteId}\nRecommended: ${recommendation.replacementRouteId}\n\n${recommendation.rationale}\n\nOperator decision required. The current selection remains unchanged.\n` }]);
  return getWorkRouteDecision(root, intakeId);
}
