import { createHash } from "node:crypto";
import fs from "node:fs";
import type { ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import { metadataOpenDelimiter, parseCanonicalMarkdownDocument } from "../../shared/documents/canonicalMarkdown";
import type { SourceRevision } from "../../shared/documents/planningDocument";
import type { WorkIntakeRecord } from "../../shared/workIntakeContracts";
import { isWorkRouteId, workRouteProfiles, workRouteTraitIds, type WorkRouteTrait } from "../../shared/workIntakeRoutingContracts";
import type { WorkRoutingAssessmentModel, WorkRoutingAssessmentRecord } from "../../shared/workRoutingAssessmentContracts";
import { resolveRepositoryPath } from "../agentHarness/repository/pathPolicy";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import { createArchitectOutputRegistry } from "../architectOutputs/architectOutputRegistry";
import { getActiveArchitectOutputRuntimeSubmission, getArchitectOutputRuntimeStatus, prepareArchitectOutputRuntimeSubmission } from "../architectOutputs/architectOutputRuntimeService";
import { buildMcpWorkspaceBindingPromptBlock, buildWriteMarkdownArtifactJsonBlock } from "../integrations/mcpWorkspacePromptContract";
import { createWorkIntakeBranchService } from "./workIntakeBranchService";
import { readWorkIntake } from "./workIntakeService";

const outputKind = "work-routing-assessment";
const owner = (intakeId: string) => `routing-${intakeId}`;
const target = (intakeId: string) => `planning/work-intake/routing/${intakeId}.md`;
interface RoutingContext { intake: WorkIntakeRecord; sourceDigests: Record<string, string>; priorAssessment?: { revision: number; status: string; notes: string } }

function boundedPath(root: string, relativePath: string): string {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (resolved.relativePath !== relativePath) throw Error("Routing artifact paths must not be redirected.");
  return resolved.resolvedPath;
}

function readBounded(root: string, relativePath: string): string {
  const file = boundedPath(root, relativePath);
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 1_000_000) throw Error("Routing evidence exceeds the supported file bound.");
  return fs.readFileSync(file, "utf8");
}

function digest(root: string, relativePath: string): string {
  return createHash("sha256").update(readBounded(root, relativePath)).digest("hex");
}

function context(root: string, intakeId: string): RoutingContext {
  const intake = readWorkIntake(root, intakeId);
  const existingPath = target(intakeId);
  const prior = fs.existsSync(boundedPath(root, existingPath)) ? parseCanonicalMarkdownDocument(readBounded(root, existingPath)).metadata : null;
  return { intake, sourceDigests: Object.fromEntries([intake.relativePath, ...intake.sourceRevisions.map(({ path }) => path)]
    .map((relativePath) => [relativePath, digest(root, relativePath)])),
    ...(prior ? { priorAssessment: { revision: prior.artifactRevision, status: prior.documentDisposition.status, notes: prior.documentDisposition.notes } } : {}) };
}

function assertCurrent(root: string, original: RoutingContext): RoutingContext {
  const current = context(root, original.intake.intakeId);
  if (JSON.stringify(current) !== JSON.stringify(original)) throw Error("Routing sources changed; prepare a fresh routing assessment.");
  return current;
}

async function verifyBranch(root: string, intakeId: string): Promise<void> {
  const intake = readWorkIntake(root, intakeId);
  await createWorkIntakeBranchService({ repositoryId: intake.branchBinding.repositoryId, repositoryRoot: root }).verify(intake.branchBinding);
}

/** A bounded body grammar makes the primary recommendation singular and rejects control fields. */
export function parseRoutingAssessmentBody(body: string) {
  body = body.replace(/\r\n/g, "\n");
  if (body.length > 12000 || !body.startsWith("# Work Intake Routing Assessment\n")) throw Error("Use the bounded Work Intake Routing Assessment format.");
  const sections = new Map<string, string>();
  const parts = body.replace(/\r\n/g, "\n").split(/^## /m);
  if (parts[0].trim() !== "# Work Intake Routing Assessment") throw Error("Unexpected routing preamble.");
  for (const part of parts.slice(1)) {
    const index = part.indexOf("\n");
    const name = part.slice(0, index).trim();
    if (index < 0 || sections.has(name) || !["Recommended Route", "Traits", "Evidence", "Rationale", "Alternate Route", "Ambiguity"].includes(name)) throw Error("Unexpected or duplicate routing section.");
    sections.set(name, part.slice(index + 1).trim());
  }
  const recommendedRouteId = sections.get("Recommended Route");
  if (!isWorkRouteId(recommendedRouteId)) throw Error("Recommend exactly one supported Work Route.");
  const traitText = sections.get("Traits");
  const traits = traitText === "None" ? [] : (traitText ?? "").split("\n").map((line) => line.replace(/^- /, "").trim());
  if (traits.some((trait) => !workRouteTraitIds.some((known) => known === trait)) || new Set(traits).size !== traits.length) throw Error("Use supported, unique routing traits or None.");
  const rationale = sections.get("Rationale");
  if (!rationale || rationale.length > 3000) throw Error("A concise evidence-based routing rationale is required.");
  const evidencePaths = (sections.get("Evidence") ?? "").split("\n").map((line) => line.replace(/^- /, "").trim());
  if (!evidencePaths.length || evidencePaths.length > 20 || evidencePaths.some((value) =>
    !/^(?:(?:src|docs|planning)\/[a-zA-Z0-9_./ -]+\.(?:md|ts|tsx|js|cjs|json)|README\.md|package\.json)$/.test(value) || value.split("/").some((part) => part === ".." || part.startsWith(".")))) throw Error("List bounded current repository evidence paths, one per bullet.");
  const alternateRouteId = sections.get("Alternate Route");
  const ambiguity = sections.get("Ambiguity");
  if (alternateRouteId && alternateRouteId !== "None" && (!isWorkRouteId(alternateRouteId) || alternateRouteId === recommendedRouteId || !ambiguity || ambiguity.length > 1500)) throw Error("An alternate requires a distinct supported route and genuine ambiguity rationale.");
  if ((!alternateRouteId || alternateRouteId === "None") && ambiguity) throw Error("Ambiguity requires an alternate route.");
  return { recommendedRouteId, traits: traits as WorkRouteTrait[], rationale, evidencePaths: [...new Set(evidencePaths)],
    ...(isWorkRouteId(alternateRouteId) ? { alternate: { routeId: alternateRouteId, rationale: ambiguity! } } : {}) };
}

export function createRoutingAssessmentDefinition(intakeId: string): ArchitectOutputDefinition<"routing-assessment", { markdownPath: string }, RoutingContext> {
  const owningWorkspaceId = owner(intakeId);
  const submissionId = (input: Parameters<typeof buildDeterministicArchitectDraftSubmissionId>[0]) => buildDeterministicArchitectDraftSubmissionId(input);
  return {
    outputKind, owningWorkspaceId, bundleMode: "single-output",
    buildSubmissionId: (input) => submissionId({ outputKind, owningWorkspaceId, ...input }),
    buildPromotionGroupId: (input) => submissionId({ outputKind, owningWorkspaceId, ...input }),
    resolvePreparation(root) {
      const current = context(root, intakeId);
      return { sourceHandoff: { path: current.intake.relativePath, revision: current.intake.artifactRevision }, domainContext: current };
    },
    resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
      const current = assertCurrent(workspaceRoot, preparedContext);
      if (submission.sourceHandoff.path !== current.intake.relativePath || submission.sourceHandoff.revision !== current.intake.artifactRevision) throw Error("Routing draft references a stale Intake revision.");
      return current;
    },
    slots: [{ slotId: "routing-assessment", displayLabel: "Advisory Routing Assessment", draftPathComponent: "routing.md",
      validateBody: (body) => { parseRoutingAssessmentBody(body); },
      buildCanonicalDocument({ workspaceRoot, submission, domainContext, bodyMarkdown }) {
        const parsed = parseRoutingAssessmentBody(bodyMarkdown);
        if (!parsed.evidencePaths.includes(domainContext.intake.relativePath)) throw Error("Routing evidence must include the current Work Intake.");
        const relativePath = target(intakeId);
        const file = boundedPath(workspaceRoot, relativePath);
        const prior = fs.existsSync(file) ? parseCanonicalMarkdownDocument(readBounded(workspaceRoot, relativePath)) : null;
        if (prior && (prior.metadata.artifactType !== outputKind || prior.metadata.identity.intakeId !== intakeId)) throw Error("Routing assessment target identity is invalid.");
        const sourceRevisions: SourceRevision[] = [{ path: domainContext.intake.relativePath, revision: domainContext.intake.artifactRevision }, ...domainContext.intake.sourceRevisions];
        const evidenceDigests = { ...domainContext.sourceDigests };
        for (const evidencePath of parsed.evidencePaths) {
          if (evidencePath === relativePath || evidencePath.startsWith("planning/Architect_Drafts/")) throw Error("Routing output cannot be its own source evidence.");
          const evidence = readBounded(workspaceRoot, evidencePath);
          evidenceDigests[evidencePath] = digest(workspaceRoot, evidencePath);
          if (evidence.startsWith(metadataOpenDelimiter)) {
            const metadata = parseCanonicalMarkdownDocument(evidence).metadata;
            if (!sourceRevisions.some(({ path }) => path === evidencePath)) sourceRevisions.push({ path: evidencePath, revision: metadata.artifactRevision });
          }
        }
        return { relativePath, metadata: {
          schemaVersion: 1, artifactType: outputKind, artifactRevision: (prior?.metadata.artifactRevision ?? 0) + 1,
          participationRole: "contextOnly", identity: { intakeId, projectId: domainContext.intake.projectId, assessmentId: submission.submissionId },
          sourceRevisions, workflowData: { ...parsed, evidenceDigests },
          documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
        } };
      },
    }],
    buildPreparedInstruction({ workspaceRoot, submission, domainContext: { intake, priorAssessment }, sourceHandoff }) {
      return [
        ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, undefined, { includeDiagnosticsToolboxHint: false }), "",
        "Perform only an advisory Work Intake routing assessment. Do not activate a route or perform Git mutations.",
        `Read ${sourceHandoff.path} at revision ${sourceHandoff.revision} and its Project source evidence.`,
        "Inspect materially relevant current repository source, planning, and architecture before recommending a route. Respect established architecture and distinguish current evidence from historical records and assumptions.",
        `Work request: ${intake.workRequest}`, `Desired outcome: ${intake.desiredOutcome}`, `Constraints: ${intake.knownConstraints || "None supplied."}`,
        `Existing source/planning: ${intake.hasExistingSourceOrPlanning ? "Yes" : "No"}. Repository review context: ${intake.repositoryReviewContext || "None supplied."}`,
        ...(priorAssessment?.status === "RevisionRequested" ? [`Operator requested a revised routing assessment: ${priorAssessment.notes}`] : []),
        "Recommend exactly one primary route with relevant traits and concise evidence/rationale. Include one alternate only when genuine ambiguity remains; explain that ambiguity.",
        "Do not conduct the full Greenfield, Feature, Refactor/Migration, Integration, Infrastructure, Research, or Issue architecture discussion during routing. Do not generate a roadmap, Phase, Plan, Work Card, or implementation. Operator selection is a separate subsequent decision.",
        "Supported routes:", ...workRouteProfiles.map((profile) => `- ${profile.routeId}: ${profile.description}`),
        `Supported traits: ${workRouteTraitIds.join(", ")}.`,
        "Return a body-only Markdown draft with these exact sections (at most 12000 characters):",
        "# Work Intake Routing Assessment", "## Recommended Route", "<one supported route ID>", "## Traits", "<one supported trait per bullet, or None>",
        "## Evidence", "<one inspected current repository-relative file path per bullet; include the Intake; use src/, docs/, planning/, README.md, or package.json>",
        "## Rationale", "<concise evidence-based explanation>", "## Alternate Route", "<one distinct route ID or None>",
        "Include ## Ambiguity only when an alternate exists, with its material unresolved distinction.",
        "Never supply application metadata, selected-route fields, or canonical output writes. Create only the temporary draft using artifact_toolbox:",
        "```json", ...buildWriteMarkdownArtifactJsonBlock(workspaceRoot, submission.expectedDraftSlots[0].draftRelativePath, "<complete body-only routing assessment>"), "```",
        "ChampCity promotes the draft after source freshness checks. Promotion records advice; it does not select a route or start planning.",
      ].join("\n");
    },
    buildPostPromotionSelection: ({ promotedDocuments }) => ({ markdownPath: promotedDocuments[0].relativePath }),
  };
}

export function readRoutingAssessment(root: string, intakeId: string): { assessment: WorkRoutingAssessmentRecord | null; stale: boolean } {
  const intake = readWorkIntake(root, intakeId);
  const relativePath = target(intakeId);
  if (!fs.existsSync(boundedPath(root, relativePath))) return { assessment: null, stale: false };
  const document = parseCanonicalMarkdownDocument(readBounded(root, relativePath));
  const parsed = parseRoutingAssessmentBody(document.bodyMarkdown);
  const metadata = document.metadata;
  if (metadata.artifactType !== outputKind || metadata.identity.intakeId !== intakeId || metadata.identity.projectId !== intake.projectId || typeof metadata.identity.assessmentId !== "string") throw Error("Routing assessment identity is invalid.");
  const sourceIntake = metadata.sourceRevisions.find(({ path }) => path === intake.relativePath);
  if (!sourceIntake) throw Error("Routing assessment Intake lineage is missing.");
  const digests = metadata.workflowData.evidenceDigests as Record<string, string> | undefined;
  let stale = !digests || sourceIntake.revision !== intake.artifactRevision;
  try { stale ||= Object.entries(digests ?? {}).some(([source, hash]) => digest(root, source) !== hash); } catch { stale = true; }
  return { stale, assessment: { kind: "architect-route-assessment", intakeId, assessmentId: metadata.identity.assessmentId,
    ...parsed, sourceIntake, sourceEvidence: metadata.sourceRevisions, relativePath, artifactRevision: metadata.artifactRevision } };
}

export async function getWorkRoutingAssessment(root: string, intakeId: string): Promise<WorkRoutingAssessmentModel> {
  await verifyBranch(root, intakeId);
  const active = getActiveArchitectOutputRuntimeSubmission(root, owner(intakeId));
  if (active && active.submission.state !== "promoted") {
    try { assertCurrent(root, active.preparedContext as RoutingContext); }
    catch { active.submission = { ...active.submission, state: "superseded" }; }
    for (const slot of active.submission.expectedDraftSlots) boundedPath(root, slot.draftRelativePath);
  }
  const definition = createRoutingAssessmentDefinition(intakeId);
  const status = getArchitectOutputRuntimeStatus(root, outputKind, owner(intakeId), createArchitectOutputRegistry([definition]));
  const persisted = readRoutingAssessment(root, intakeId);
  return { intakeId, state: persisted.stale ? "stale" : status?.submission.state ?? (persisted.assessment ? "promoted" : "not-prepared"),
    assessment: persisted.assessment, submission: status?.submission,
    preparedInstruction: status && ["waiting-for-drafts", "partial-draft-set"].includes(status.submission.state) ? status.preparedInstruction : undefined,
    error: status?.promotionError ?? (persisted.stale || status?.submission.state === "superseded" ? "Routing sources changed; prepare a fresh assessment." : undefined) };
}

export async function prepareWorkRoutingAssessment(root: string, intakeId: string): Promise<WorkRoutingAssessmentModel> {
  await getWorkRoutingAssessment(root, intakeId);
  const definition = createRoutingAssessmentDefinition(intakeId);
  prepareArchitectOutputRuntimeSubmission(root, outputKind, owner(intakeId), createArchitectOutputRegistry([definition]));
  return getWorkRoutingAssessment(root, intakeId);
}

export async function copyWorkRoutingAssessment(root: string, intakeId: string): Promise<string> {
  const model = await getWorkRoutingAssessment(root, intakeId);
  if (!model.preparedInstruction) throw Error("Prepare a current routing assessment before copying its handoff.");
  return model.preparedInstruction;
}
