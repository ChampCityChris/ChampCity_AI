import fs from "node:fs";
import path from "node:path";
import type {
  ArchitectDraftSubmission,
  ArchitectOutputDefinition,
} from "../../shared/architectOutputs/architectOutputContracts";
import type { CanonicalDocumentMetadata } from "../../shared/documents/canonicalMarkdown";
import {
  metadataWithSubstantiveRevision,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getArchitectOutputRuntimeStatus,
  prepareArchitectOutputRuntimeSubmission,
  type ActiveArchitectOutputRuntimeSubmission,
} from "../architectOutputs/architectOutputRuntimeService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
} from "../documents/planningDocumentService";
import {
  buildWriteMarkdownArtifactJsonBlock,
  buildMcpWorkspaceBindingPromptBlock,
} from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export interface PhaseMapPhase {
  phaseId: string;
  title: string;
  order: number;
  purpose: string;
  dependsOn: string[];
  sourceReferences: string[];
}

interface PhaseMapReadyContext {
  handoff: PlanningDocumentSummary;
  phaseMapMarkdownPath: string;
  projectSlug: string;
  expectedProjectIdentity: Record<string, unknown>;
  sourceRevisions: SourceRevision[];
  phaseMap?: PlanningDocumentSummary;
  invalidPhaseMapReason?: string;
}

interface PhaseMapSelection {
  selectedRole: "phase-map";
  markdownPath: string;
}

type ActivePhaseMapSubmission = ActiveArchitectOutputRuntimeSubmission<"phase-map", PhaseMapSelection>;

const outputKind = "phase-map";
const owningWorkspaceId = "project-phase-map";
const slotId = "phase-map";
const phaseMapDomainBlock = "champcity-phase-map";
const phaseMapRequiredTitle = "Phase Map";
const phaseMapAllowedFields = new Set([
  "phaseId",
  "title",
  "order",
  "purpose",
  "dependsOn",
  "sourceReferences",
]);
const persistedCompletionFields = new Set([
  "complete",
  "completed",
  "isComplete",
  "completion",
  "completionStatus",
  "closeoutApproved",
]);

export const phaseMapArchitectOutputDefinition: ArchitectOutputDefinition<
  "phase-map",
  PhaseMapSelection,
  PhaseMapReadyContext
> = {
  outputKind,
  owningWorkspaceId,
  bundleMode: "single-output",
  slots: [{
    slotId,
    displayLabel: "Phase Map",
    draftPathComponent: "phase-map.md",
    validateBody(bodyMarkdown) {
      parsePhaseMapBody(bodyMarkdown);
    },
    buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
      const phases = parsePhaseMapBody(bodyMarkdown).phases;
      const existing = context.phaseMap
        ? readExistingCanonical(workspaceRoot, context.phaseMapMarkdownPath)
        : null;
      const metadata: CanonicalDocumentMetadata = existing
        ? {
            ...metadataWithSubstantiveRevision(existing.metadata, context.sourceRevisions),
            workflowData: mergeRepositoryAuthorityIntoWorkflowData(
              { phases },
              inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
            ),
          }
        : {
            schemaVersion: 1,
            artifactType: outputKind,
            artifactRevision: 1,
            participationRole: "gatingReview",
            identity: context.expectedProjectIdentity,
            sourceRevisions: context.sourceRevisions,
            workflowData: mergeRepositoryAuthorityIntoWorkflowData(
              { phases },
              inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
            ),
            documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
          };
      return { relativePath: context.phaseMapMarkdownPath, metadata };
    },
  }],
  buildSubmissionId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind,
      owningWorkspaceId,
      ...context,
    });
  },
  buildPromotionGroupId(context) {
    return buildDeterministicArchitectDraftSubmissionId({
      outputKind,
      owningWorkspaceId,
      ...context,
    });
  },
  resolvePreparation(workspaceRoot) {
    const context = resolvePhaseMapDraftContext(workspaceRoot);
    assertCanPromotePhaseMap(context);
    return {
      sourceHandoff: { path: context.handoff.markdownPath, revision: context.handoff.metadata.artifactRevision ?? 1 },
      domainContext: context,
    };
  },
  resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
    return requireCurrentPromotionContext(
      workspaceRoot,
      submission,
      preparedContext as PhaseMapReadyContext,
    );
  },
  buildPreparedInstruction({ workspaceRoot, submission, sourceHandoff, domainContext: context }) {
    return buildPhaseMapPreparedInstruction(workspaceRoot, context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments }) {
    return { selectedRole: "phase-map", markdownPath: promotedDocuments[0].relativePath };
  },
};

export function preparePhaseMapDraftSubmission(
  workspaceRoot: string,
): ArchitectDraftSubmission<"phase-map", PhaseMapSelection> {
  return prepareArchitectOutputRuntimeSubmission(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getPhaseMapDraftStatus(workspaceRoot: string): ActivePhaseMapSubmission | undefined {
  return getArchitectOutputRuntimeStatus(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getActivePhaseMapDraftSubmission(
  workspaceRoot: string,
): ActivePhaseMapSubmission | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, owningWorkspaceId);
}

export function parsePhaseMapBody(bodyMarkdown: string): { phases: PhaseMapPhase[] } {
  if (!hasHeading(bodyMarkdown, 1, phaseMapRequiredTitle)) {
    throw new Error("Phase Map draft requires # Phase Map.");
  }
  const block = exactPhaseMapBlock(bodyMarkdown);
  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch (error) {
    throw new Error(`Phase Map champcity-phase-map block is malformed JSON: ${errorMessage(error)}`);
  }
  return { phases: validatePhaseMapData(parsed) };
}

export function validatePhaseMapData(value: unknown): PhaseMapPhase[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Phase Map must contain an object root.");
  }
  const phasesValue = (value as { phases?: unknown }).phases;
  if (!Array.isArray(phasesValue)) {
    throw new Error("Phase Map must contain a phases array.");
  }

  if (phasesValue.length === 0) {
    throw new Error("Phase Map phases array must not be empty.");
  }
  const phases = phasesValue.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Each Phase Map entry must be an object.");
    }
    for (const field of Object.keys(entry)) {
      if (persistedCompletionFields.has(field)) {
        throw new Error("Phase Map must not persist completion state.");
      }
      if (!phaseMapAllowedFields.has(field)) {
        throw new Error("Phase Map entries must contain only phaseId, title, order, purpose, dependsOn, and sourceReferences.");
      }
    }
    const phase = entry as Record<string, unknown>;
    if (
      typeof phase.phaseId !== "string" ||
      typeof phase.title !== "string" ||
      typeof phase.order !== "number" ||
      !Number.isInteger(phase.order) ||
      typeof phase.purpose !== "string" ||
      !Array.isArray(phase.dependsOn) ||
      !phase.dependsOn.every((item) => typeof item === "string") ||
      !Array.isArray(phase.sourceReferences) ||
      !phase.sourceReferences.every((item) => typeof item === "string")
    ) {
      throw new Error("Phase Map entries must contain phaseId, title, order, purpose, dependsOn, and sourceReferences.");
    }
    for (const sourceReference of phase.sourceReferences) {
      if (!isNormalizedRepositoryRelativePath(sourceReference)) {
        throw new Error("Phase Map sourceReferences must contain normalized repository-relative paths.");
      }
    }

    return {
      phaseId: phase.phaseId,
      title: phase.title,
      order: phase.order,
      purpose: phase.purpose,
      dependsOn: phase.dependsOn,
      sourceReferences: phase.sourceReferences,
    };
  });

  validateUniquePhases(phases);
  validatePhaseDependencies(phases);
  return phases;
}

function resolvePhaseMapDraftContext(workspaceRoot: string): PhaseMapReadyContext {
  const handoff = requiredApprovedPhaseMapHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const phaseMapMarkdownPath = requiredMarkdownTarget(workflowData.phaseMapTarget, "phaseMapTarget");
  const projectSlug = requiredString(handoff.metadata.canonical?.identity.projectSlug, "projectSlug");
  const expectedProjectIdentity = {
    projectSlug,
    "Project.ArtifactKey": projectSlug,
  };
  const sourceRevisions = [
    ...(handoff.metadata.sourceRevisions ?? []),
    { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
  ];
  const documents = listPlanningDocuments(workspaceRoot);
  const phaseMap = documents.find((document) => document.markdownPath === phaseMapMarkdownPath);
  const invalidPhaseMapReason = phaseMap
    ? validateExistingPhaseMapForRevision(workspaceRoot, phaseMap, expectedProjectIdentity)
    : undefined;
  return {
    handoff,
    phaseMapMarkdownPath,
    projectSlug,
    expectedProjectIdentity,
    sourceRevisions,
    phaseMap,
    invalidPhaseMapReason,
  };
}

function validateExistingPhaseMapForRevision(
  workspaceRoot: string,
  phaseMap: PlanningDocumentSummary,
  expectedProjectIdentity: Record<string, unknown>,
): string | undefined {
  const canonical = phaseMap.metadata.canonical;
  if (phaseMap.documentReadState !== "readable" || !canonical) {
    return phaseMap.readError ?? "Existing Phase Map target is not readable canonical Markdown.";
  }
  if (canonical.artifactType !== outputKind) {
    return "Existing Phase Map target has the wrong artifact type.";
  }
  if (canonical.participationRole !== "gatingReview") {
    return "Existing Phase Map target has the wrong participation role.";
  }
  if (JSON.stringify(canonical.identity) !== JSON.stringify(expectedProjectIdentity)) {
    return "Existing Phase Map target identity does not match the current project.";
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, phaseMap.logicalDocumentId);
  if (freshness.state === "stale") {
    return "Existing Phase Map target is stale.";
  }
  try {
    validatePhaseMapData({ phases: canonical.workflowData.phases });
  } catch (error) {
    return `Existing Phase Map target is malformed: ${errorMessage(error)}`;
  }
  return undefined;
}

function assertCanPromotePhaseMap(context: PhaseMapReadyContext): void {
  if (context.invalidPhaseMapReason) {
    throw new Error(context.invalidPhaseMapReason);
  }
  if (!context.phaseMap) {
    return;
  }
  if (context.phaseMap.effectiveDisposition !== "RevisionRequested") {
    throw new Error("Phase Map draft submission can only replace an existing RevisionRequested Phase Map.");
  }
}

function requireCurrentPromotionContext(
  workspaceRoot: string,
  submission: ArchitectDraftSubmission,
  original: PhaseMapReadyContext,
): PhaseMapReadyContext {
  if (!original) throw new Error("Phase Map draft submission context is unavailable.");
  const current = resolvePhaseMapDraftContext(workspaceRoot);
  if (
    current.handoff.markdownPath !== submission.sourceHandoff.path ||
    (current.handoff.metadata.artifactRevision ?? 1) !== submission.sourceHandoff.revision
  ) {
    throw new Error("Phase Map draft submission no longer matches the current handoff revision.");
  }
  if (
    current.phaseMapMarkdownPath !== original.phaseMapMarkdownPath ||
    current.projectSlug !== original.projectSlug ||
    JSON.stringify(current.expectedProjectIdentity) !== JSON.stringify(original.expectedProjectIdentity) ||
    JSON.stringify(current.sourceRevisions) !== JSON.stringify(original.sourceRevisions)
  ) {
    throw new Error("Phase Map draft submission no longer matches the current Phase Map evidence.");
  }
  assertCanPromotePhaseMap(current);
  return current;
}

function requiredApprovedPhaseMapHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "phase-map")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Phase Map handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Phase Map handoff is stale.");
  }
  return handoff;
}

function exactPhaseMapBlock(bodyMarkdown: string): string {
  const normalized = bodyMarkdown.replace(/\r\n?/g, "\n");
  const matches = [...normalized.matchAll(/^```champcity-phase-map[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm)];
  if (matches.length !== 1) {
    throw new Error("Phase Map draft requires exactly one champcity-phase-map fenced block.");
  }
  return matches[0][1];
}

function hasHeading(bodyMarkdown: string, depth: 1, heading: string): boolean {
  const prefix = "#".repeat(depth);
  return bodyMarkdown
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .some((line) => line.trim() === `${prefix} ${heading}`);
}

function validateUniquePhases(phases: PhaseMapPhase[]): void {
  const phaseIds = new Set<string>();
  const orders = new Set<number>();
  for (const phase of phases) {
    if (phaseIds.has(phase.phaseId)) {
      throw new Error("Phase Map phaseId values must be unique.");
    }
    if (orders.has(phase.order)) {
      throw new Error("Phase Map order values must be unique.");
    }
    phaseIds.add(phase.phaseId);
    orders.add(phase.order);
  }
}

function validatePhaseDependencies(phases: PhaseMapPhase[]): void {
  const phaseIds = new Set(phases.map((phase) => phase.phaseId));
  for (const phase of phases) {
    for (const dependency of phase.dependsOn) {
      if (!phaseIds.has(dependency)) {
        throw new Error("Phase Map dependencies must resolve to phases in the same map.");
      }
      if (dependency === phase.phaseId) {
        throw new Error("Phase Map self-dependencies are prohibited.");
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(phases.map((phase) => [phase.phaseId, phase]));
  function visit(phaseId: string): void {
    if (visited.has(phaseId)) return;
    if (visiting.has(phaseId)) {
      throw new Error("Phase Map dependency cycles are prohibited.");
    }
    visiting.add(phaseId);
    for (const dependency of byId.get(phaseId)?.dependsOn ?? []) {
      visit(dependency);
    }
    visiting.delete(phaseId);
    visited.add(phaseId);
  }
  for (const phase of phases) {
    visit(phase.phaseId);
  }
}

function isNormalizedRepositoryRelativePath(value: string): boolean {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) return false;
  if (value.includes("\\") || path.win32.isAbsolute(value) || path.posix.isAbsolute(value)) return false;
  if (/[\0-\x1f\x7f]/.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => Boolean(segment) && segment !== "." && segment !== "..");
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.existsSync(absolutePath)
    ? parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"))
    : null;
}

function requiredMarkdownTarget(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || value.includes("..") || !value.endsWith(".md")) {
    throw new Error(`Phase Map handoff is missing ${field}.`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Phase Map handoff is missing ${field}.`);
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildPhaseMapPreparedInstruction(
  workspaceRoot: string,
  context: PhaseMapReadyContext,
  submission: ArchitectDraftSubmission<"phase-map">,
  sourceHandoff: ArchitectDraftSubmission["sourceHandoff"],
): string {
  const draftPath = submission.expectedDraftSlots[0].draftRelativePath;
  const revisionNotes = context.phaseMap?.effectiveDisposition === "RevisionRequested"
    ? context.phaseMap.metadata.canonical?.documentDisposition.notes?.trim()
    : undefined;
  const promptWorkflowData = context.handoff?.metadata?.canonical?.workflowData ??
    mergeRepositoryAuthorityIntoWorkflowData(
      {},
      inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, context.sourceRevisions),
    );
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData, {
      includeDiagnosticsToolboxHint: false,
    }),
    "",
    "Read these exact current inputs:",
    `- Approved Phase Map handoff: ${sourceHandoff.path} revision ${sourceHandoff.revision}`,
    `- Current Approved Project Profile: ${context.sourceRevisions[0]?.path ?? "planning/project/PROJECT_PROFILE.md"}`,
    `- Current Approved Project Roadmap: ${context.sourceRevisions[1]?.path ?? "planning/project/Project_Roadmap"}`,
    `- Generated Phase Map handoff: ${sourceHandoff.path}`,
    "- Stable Phase Map submission contract: phase-map-output-submission-v1",
    ...context.sourceRevisions.map((source) => `- source: ${source.path} revision ${source.revision}`),
    "",
    "Produce one complete Phase Map Markdown body for this exact final target:",
    `- Phase Map target: ${context.phaseMapMarkdownPath}`,
    `- Exact Phase Map output target: ${context.phaseMapMarkdownPath}`,
    `- Temporary draft Markdown: ${draftPath}`,
    `- Temporary Phase Map draft path: ${draftPath}`,
    "",
    "The Phase Map Markdown body must contain exactly this title:",
    `# ${phaseMapRequiredTitle}`,
    "",
    `Require exactly one ${phaseMapDomainBlock} fenced JSON block.`,
    "Derive the substantive phase list from the approved full Project Roadmap and Project Profile.",
    "The fenced JSON root must be an object with one non-empty phases array.",
    'The phases array property must be named "phases".',
    "Each phase entry must contain only phaseId, title, order, purpose, dependsOn, and sourceReferences.",
    "phaseId values and order values must be unique.",
    "Every dependency must resolve to another phase in the same map; self-dependencies and dependency cycles are prohibited.",
    "sourceReferences must contain normalized repository-relative paths.",
    "Do not persist completion state.",
    "",
    "When the complete Phase Map body is ready, call artifact_toolbox.write_markdown_artifact with this invocation shape:",
    "```json",
    ...buildWriteMarkdownArtifactJsonBlock(
      workspaceRoot,
      draftPath,
      "<complete body-only Phase Map Markdown>",
      promptWorkflowData,
    ),
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, fallback fields, hidden authorization values, or any other authority fields as params.",
    "After the draft is created, respond with a concise draft-created confirmation.",
    ...(revisionNotes ? ["", "Current Operator revision instructions:", revisionNotes] : []),
  ].join("\n");
}
