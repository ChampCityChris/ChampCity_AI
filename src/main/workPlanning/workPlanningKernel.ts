import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import type { ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import { metadataWithDisposition, parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { SourceRevision } from "../../shared/documents/planningDocument";
import type { WorkPlanningArtifact, WorkPlanningIdentity, WorkPlanningModel, WorkPlanningProfile, WorkPlanningReviewInput, WorkPlanningStage } from "../../shared/workPlanningContracts";
import type { WorkRouteDecisionModel } from "../../shared/workRouteDecisionContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import { createArchitectOutputRegistry } from "../architectOutputs/architectOutputRegistry";
import { getActiveArchitectOutputRuntimeSubmission, getArchitectOutputRuntimeStatus, prepareArchitectOutputRuntimeSubmission } from "../architectOutputs/architectOutputRuntimeService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import { buildMcpWorkspaceBindingPromptBlock, buildWriteMarkdownArtifactJsonBlock } from "../integrations/mcpWorkspacePromptContract";
import { readWorkIntake } from "../workIntake/workIntakeService";
import { getWorkRouteDecision } from "../workIntake/workRouteDecisionService";
import { resolveWorkPlanningProfile, workPlanningProfiles } from "./workPlanningProfiles";
import { workPlanStructureFromBody } from "./workPlanStructure";
import { researchOutcomeFromBody, researchOutcomeInstruction } from "./profiles/researchPrototypeProfile";
import { workIssueContext } from "./workIssueContext";

const outputKind = (stage: WorkPlanningStage) => `work-planning-${stage}`;
const owner = (decisionId: string, stage: WorkPlanningStage) => `${stage}-${decisionId}`;
export function workPlanningArtifactPath(intakeId: string, decisionId: string, stage: WorkPlanningStage): string {
  if (!/^intake-[a-f0-9-]{36}$/.test(intakeId) || !/^decision-[a-f0-9-]{36}$/.test(decisionId) || !["assessment", "plan"].includes(stage)) throw Error("Invalid route-scoped planning identity.");
  return `planning/work-intake/planning/${intakeId}/${decisionId}/${stage.toUpperCase()}.md`;
}
function file(root: string, relativePath: string): string {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Planning path must not be redirected.");
  return resolved.resolvedPath;
}
function bytes(root: string, relativePath: string): string | null {
  const absolutePath = file(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  if (!fs.statSync(absolutePath).isFile() || fs.statSync(absolutePath).size > 1_000_000) throw Error("Planning artifact exceeds the supported bound.");
  return fs.readFileSync(absolutePath, "utf8");
}
function read(root: string, relativePath: string) {
  const content = bytes(root, relativePath);
  return content === null ? null : parseCanonicalMarkdownDocument(content);
}
function hash(content: string | null) { return content === null ? "missing" : createHash("sha256").update(content).digest("hex"); }
export function sourceDigests(root: string, sources: SourceRevision[]) { return Object.fromEntries(sources.map((source) => [source.path, hash(bytes(root, source.path))])); }

interface PlanningContext {
  identity: WorkPlanningIdentity;
  stage: WorkPlanningStage;
  profile: WorkPlanningProfile;
  targetPath: string;
  sourceHandoff: SourceRevision;
  sourceRevisions: SourceRevision[];
  provenanceOnlySourcePaths: string[];
  digests: Record<string, string>;
  targetDigest: string;
  prior: ReturnType<typeof read>;
}
function sourcesCurrent(root: string, sources: SourceRevision[], digests: Record<string, string>): boolean {
  try { return sources.every((source) => read(root, source.path)?.metadata.artifactRevision === source.revision && hash(bytes(root, source.path)) === digests[source.path]) && Object.entries(digests).every(([filePath, digest]) => hash(bytes(root, filePath)) === digest); }
  catch { return false; }
}
function semanticSourcesCurrent(root: string, sources: SourceRevision[], digests: Record<string, string>, context: PlanningContext): boolean {
  const provenanceOnly = new Set(context.provenanceOnlySourcePaths);
  const semanticSources = sources.filter((source) => !provenanceOnly.has(source.path));
  const semanticContextSources = context.sourceRevisions.filter((source) => !provenanceOnly.has(source.path));
  const semanticDigests = Object.fromEntries(Object.entries(digests).filter(([filePath]) => !provenanceOnly.has(filePath)));
  const semanticContextDigests = Object.fromEntries(Object.entries(context.digests).filter(([filePath]) => !provenanceOnly.has(filePath)));
  return sourcesCurrent(root, semanticSources, semanticDigests) &&
    JSON.stringify(semanticSources) === JSON.stringify(semanticContextSources) &&
    JSON.stringify(semanticDigests) === JSON.stringify(semanticContextDigests);
}
function readArtifact(root: string, context: PlanningContext): WorkPlanningArtifact | null {
  const document = read(root, context.targetPath);
  if (!document) return null;
  const identity = document.metadata.identity as unknown as WorkPlanningIdentity;
  if (document.metadata.artifactType !== outputKind(context.stage) || identity.intakeId !== context.identity.intakeId ||
    identity.routeId !== context.identity.routeId || identity.routeDecisionId !== context.identity.routeDecisionId || identity.projectId !== context.identity.projectId ||
    typeof (context.stage === "assessment" ? identity.assessmentId : identity.planId) !== "string") throw Error("Planning artifact identity conflicts with the selected route.");
  const digests = document.metadata.workflowData.sourceDigests as Record<string, string> | undefined;
  const stale = !digests || document.metadata.participationRole === "historical" ||
    !semanticSourcesCurrent(root, document.metadata.sourceRevisions, digests, context);
  return { identity, relativePath: context.targetPath, artifactRevision: document.metadata.artifactRevision, sourceRevisions: document.metadata.sourceRevisions,
    disposition: document.metadata.documentDisposition.status, reviewNotes: document.metadata.documentDisposition.notes, stale, bodyMarkdown: document.bodyMarkdown,
    ...(context.stage === "plan" ? { structure: workPlanStructureFromBody(document.bodyMarkdown) } : {}),
    ...(context.stage === "assessment" && identity.routeId === "research-prototype" ? { researchOutcome: researchOutcomeFromBody(document.bodyMarkdown) } : {}) };
}
function contextFor(root: string, route: WorkRouteDecisionModel, stage: WorkPlanningStage, profile: WorkPlanningProfile): PlanningContext {
  if (!route.selection || route.state !== "selected") throw Error("Planning requires a current Operator-selected route without a pending reroute or revision.");
  const intake = readWorkIntake(root, route.intakeId);
  const identity: WorkPlanningIdentity = { intakeId: intake.intakeId, projectId: intake.projectId, routeDecisionId: route.selection.decisionId, routeId: route.selection.selectedRouteId };
  const routeSource = { path: route.relativePath, revision: route.artifactRevision };
  const targetPath = workPlanningArtifactPath(intake.intakeId, identity.routeDecisionId, stage);
  const sourceRevisions: SourceRevision[] = [{ path: intake.relativePath, revision: intake.artifactRevision }, routeSource];
  const issueContext = identity.routeId === "issue-resolution" ? workIssueContext(root, intake.intakeId, identity.routeDecisionId) : null;
  if (issueContext) sourceRevisions.push(issueContext.source);
  let sourceHandoff = routeSource;
  if (stage === "plan") {
    const assessmentContext = contextFor(root, route, "assessment", profile);
    const assessment = readArtifact(root, assessmentContext);
    if (!assessment || assessment.stale || assessment.disposition !== "Approved") throw Error("Plan drafting requires the current approved route-specific assessment.");
    if (assessment.researchOutcome?.outcome === "no-implementation-plan-required") throw Error("Approved research outcome requires no implementation Plan. Production follow-up requires a new Work Intake and explicit planning.");
    sourceHandoff = { path: assessment.relativePath, revision: assessment.artifactRevision };
    sourceRevisions.push(sourceHandoff);
  }
  return { identity, profile, stage, targetPath, sourceHandoff, sourceRevisions, provenanceOnlySourcePaths: [route.relativePath],
    digests: { ...sourceDigests(root, sourceRevisions), ...issueContext?.evidenceDigests },
    targetDigest: hash(bytes(root, targetPath)), prior: read(root, targetPath) };
}
function sameContext(left: PlanningContext, right: PlanningContext) { return JSON.stringify(left) === JSON.stringify(right); }
function canPrepare(root: string, context: PlanningContext): boolean {
  if (context.identity.routeId === "issue-resolution" && context.stage === "assessment") return false;
  const artifact = readArtifact(root, context);
  return !artifact || artifact.stale || artifact.disposition === "RevisionRequested";
}
function validateBody(body: string, context: PlanningContext) {
  const title = context.stage === "assessment" ? "Route Architect Assessment" : "Work Plan";
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  if (!lines.includes(`# ${title}`)) throw Error(`Planning draft requires # ${title}.`);
  for (const heading of context.stage === "assessment" ? context.profile.assessmentSections : context.profile.planSections) {
    const index = lines.indexOf(`## ${heading}`);
    if (index < 0 || !lines.slice(index + 1, lines.findIndex((line, next) => next > index && /^##? /.test(line)) < 0 ? undefined : lines.findIndex((line, next) => next > index && /^##? /.test(line))).join("\n").trim()) throw Error(`Planning draft requires substantive ${heading}.`);
  }
  if (context.stage === "plan") workPlanStructureFromBody(body);
  if (context.stage === "assessment" && context.identity.routeId === "research-prototype") researchOutcomeFromBody(body);
}

function definitionFor(root: string, route: WorkRouteDecisionModel, stage: WorkPlanningStage, profile: WorkPlanningProfile): ArchitectOutputDefinition<string, { markdownPath: string }, PlanningContext> {
  const owningWorkspaceId = owner(route.selection!.decisionId, stage);
  const kind = outputKind(stage);
  const context = () => contextFor(root, route, stage, profile);
  return {
    outputKind: kind, owningWorkspaceId, bundleMode: "single-output",
    buildSubmissionId: (input) => buildDeterministicArchitectDraftSubmissionId({ outputKind: kind, owningWorkspaceId, ...input }),
    buildPromotionGroupId: (input) => buildDeterministicArchitectDraftSubmissionId({ outputKind: kind, owningWorkspaceId, ...input }),
    resolvePreparation() {
      const current = context();
      if (!canPrepare(root, current)) throw Error("Request revision before replacing an existing planning artifact.");
      return { sourceHandoff: current.sourceHandoff, domainContext: current };
    },
    resolvePromotionContext({ preparedContext }) {
      const current = context();
      if (!sameContext(current, preparedContext) || !sourcesCurrent(root, current.sourceRevisions, current.digests) || !canPrepare(root, current)) throw Error("Planning sources or review state changed; prepare a fresh draft.");
      return current;
    },
    slots: [{ slotId: kind, displayLabel: stage === "assessment" ? "Route Architect Assessment" : "Work Plan", draftPathComponent: `${stage}.md`,
      validateBody,
      buildCanonicalDocument({ bodyMarkdown, domainContext: current }) {
        const identity = { ...current.identity, [stage === "assessment" ? "assessmentId" : "planId"]:
          current.prior?.metadata.identity[stage === "assessment" ? "assessmentId" : "planId"] ?? `${stage}-${randomUUID()}` };
        return { relativePath: current.targetPath, metadata: {
          schemaVersion: 1, artifactType: kind, artifactRevision: (current.prior?.metadata.artifactRevision ?? 0) + 1,
          participationRole: "gatingReview", identity, sourceRevisions: current.sourceRevisions,
          workflowData: { sourceDigests: current.digests, ...(stage === "plan" ? { structure: workPlanStructureFromBody(bodyMarkdown) } : {}),
            ...(stage === "assessment" && current.identity.routeId === "research-prototype" ? { researchOutcome: researchOutcomeFromBody(bodyMarkdown) } : {}) },
          documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
        } };
      },
    }],
    buildPreparedInstruction({ workspaceRoot, submission, domainContext: current }) {
      const planExample = { topology: "direct", topologyRationale: "Explain the chosen topology from evidence.", acceptanceCriteria: ["Plan outcome"],
        workItems: [{ workItemId: "WI01", title: "Bounded outcome", purpose: "Explain the outcome", dependsOn: [], acceptanceCriteria: ["Observable proof"] }] };
      return [
        ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, undefined, { includeDiagnosticsToolboxHint: false }), "",
        `Selected Work Route: ${current.identity.routeId}. Operator decision: ${current.identity.routeDecisionId}.`,
        `Prepare the ${stage === "assessment" ? "route-specific Architect assessment" : "Work Plan"} from these exact current sources:`,
        ...current.sourceRevisions.map((source) => `- ${source.path} revision ${source.revision}`),
        "Inspect material current repository evidence before asking unresolved Operator-owned questions. Preserve the bounded Intake and adopted architecture. Do not infer additional future work or assume MVP semantics.",
        ...profile.requiredEvidence.map((value) => `Required evidence: ${value}`),
        ...profile.discoveryQuestions.map((value) => `Discovery priority: ${value}`),
        ...(stage === "assessment" && current.identity.routeId === "research-prototype" ? [researchOutcomeInstruction] : []),
        "Use the existing Architect conversation to resolve material decisions. Ask only questions not resolved by current evidence; confirm material Operator decisions before finalizing the draft.",
        "If the selected route is wrong, stop and return a bounded reroute recommendation for Operator decision. Do not silently select another route.",
        ...profile.topologyCriteria,
        `# ${stage === "assessment" ? "Route Architect Assessment" : "Work Plan"}`,
        ...(stage === "assessment" ? profile.assessmentSections : profile.planSections).map((section) => `## ${section}`),
        ...(stage === "plan" ? [
          "Include exactly one champcity-work-plan JSON domain block as reviewed Plan content. No application metadata or execution state belongs in the draft.",
          "```champcity-work-plan", JSON.stringify(planExample, null, 2), "```",
          "For phased topology, add phases with phaseId, title, purpose, dependsOn and acceptanceCriteria; every Work Item must name its phaseId. Phases must be nonempty; all dependencies must exist and be acyclic.",
          "For direct topology, omit phases and each Work Item's phaseId. Work Items are ordered by the array and explicit dependencies. Both topologies use the same later execution lifecycle.",
        ] : ["This assessment establishes planning evidence and decisions; do not begin implementation or generate a Plan before assessment review."]),
        ...(current.prior?.metadata.documentDisposition.status === "RevisionRequested" ? [`Operator revision instructions: ${current.prior.metadata.documentDisposition.notes}`] : []),
        "Write only the complete body-only Markdown to this exact temporary draft. ChampCity owns canonical identity, revisions, review, and Git. Do not mutate Git or start implementation.",
        "```json", ...buildWriteMarkdownArtifactJsonBlock(workspaceRoot, submission.expectedDraftSlots[0].draftRelativePath, "<complete body-only planning output>"), "```",
      ].join("\n");
    },
    buildPostPromotionSelection: ({ promotedDocuments }) => ({ markdownPath: promotedDocuments[0].relativePath }),
  };
}

/** One kernel instance resolves profiles as data; it never chooses an execution engine. */
export function createWorkPlanningKernel(profiles: readonly WorkPlanningProfile[] = workPlanningProfiles) {
  async function resolve(root: string, intakeId: string, stage: WorkPlanningStage) {
    if (!["assessment", "plan"].includes(stage)) throw Error("Unknown planning stage.");
    const route = await getWorkRouteDecision(root, intakeId);
    if (!route.selection || route.state !== "selected") throw Error("Planning requires a current Operator-selected route.");
    const profile = resolveWorkPlanningProfile(route.selection.selectedRouteId, profiles);
    const current = contextFor(root, route, stage, profile);
    const definition = definitionFor(root, route, stage, profile);
    return { current, definition, registry: createArchitectOutputRegistry([definition]) };
  }
  async function get(root: string, intakeId: string, stage: WorkPlanningStage): Promise<WorkPlanningModel> {
    const { current, definition, registry } = await resolve(root, intakeId, stage);
    const active = getActiveArchitectOutputRuntimeSubmission(root, definition.owningWorkspaceId);
    if (active && active.submission.state !== "promoted" && !sameContext(current, active.preparedContext as PlanningContext)) active.submission = { ...active.submission, state: "superseded" };
    for (const slot of active?.submission.expectedDraftSlots ?? []) file(root, slot.draftRelativePath);
    const status = getArchitectOutputRuntimeStatus(root, definition.outputKind, definition.owningWorkspaceId, registry);
    const artifact = readArtifact(root, current);
    return { intakeId, routeId: current.identity.routeId, stage, artifact, submission: status?.submission,
      preparedInstruction: status && ["waiting-for-drafts", "partial-draft-set"].includes(status.submission.state) ? status.preparedInstruction : undefined,
      canPrepare: canPrepare(root, current),
      ...(current.identity.routeId === "research-prototype" && stage === "assessment" ? { researchClosed: !!artifact && !artifact.stale && artifact.disposition === "Approved" && artifact.researchOutcome?.outcome === "no-implementation-plan-required" } : {}),
      error: status?.promotionError ?? (status?.submission.state === "superseded" ? "Planning evidence changed; prepare a fresh draft." : undefined) };
  }
  return {
    get,
    async prepare(root: string, intakeId: string, stage: WorkPlanningStage) {
      await get(root, intakeId, stage);
      const { current, definition, registry } = await resolve(root, intakeId, stage);
      if (stage === "assessment" && current.identity.routeId === "issue-resolution") throw Error("Routed Issue assessment uses the existing RCA workflow.");
      prepareArchitectOutputRuntimeSubmission(root, definition.outputKind, definition.owningWorkspaceId, registry);
      return get(root, intakeId, stage);
    },
    async copy(root: string, intakeId: string, stage: WorkPlanningStage): Promise<string> {
      const { current, definition } = await resolve(root, intakeId, stage);
      const active = getActiveArchitectOutputRuntimeSubmission(root, definition.owningWorkspaceId);
      if (!active || !["waiting-for-drafts", "partial-draft-set"].includes(active.submission.state) || !sameContext(current, active.preparedContext as PlanningContext)) throw Error("Prepare a current planning handoff before copying.");
      return active.preparedInstruction;
    },
    async review(root: string, intakeId: string, stage: WorkPlanningStage, input: WorkPlanningReviewInput) {
      if (!input || Object.keys(input).some((key) => !["expectedRevision", "disposition", "notes"].includes(key)) || !["Approved", "RevisionRequested", "Rejected"].includes(input.disposition) ||
        !Number.isInteger(input.expectedRevision) || typeof input.notes !== "string" || input.notes.length > 4000 || input.disposition !== "Approved" && !input.notes.trim()) throw Error("Planning review requires an explicit disposition and revision/rejection notes.");
      const { current } = await resolve(root, intakeId, stage);
      if (stage === "assessment" && current.identity.routeId === "issue-resolution") throw Error("Review the original Issue RCA through its routed handoff.");
      const artifact = readArtifact(root, current);
      if (!artifact || artifact.stale || artifact.artifactRevision !== input.expectedRevision) throw Error("Presented planning revision or its source evidence is stale.");
      validateBody(artifact.bodyMarkdown, current);
      const document = read(root, current.targetPath)!;
      writeCanonicalMarkdownDocument({ workspaceRoot: root, relativePath: current.targetPath, bodyMarkdown: document.bodyMarkdown,
        metadata: metadataWithDisposition(document.metadata, input.disposition, input.notes.trim(), new Date().toISOString()) });
      return get(root, intakeId, stage);
    },
  };
}
export const workPlanningKernel = createWorkPlanningKernel();
