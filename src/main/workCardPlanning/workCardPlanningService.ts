import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataWithSubstantiveRevision,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { ArchitectDraftSubmission, ArchitectOutputDefinition } from "../../shared/architectOutputs/architectOutputContracts";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  savePlanningDocumentRevision,
} from "../documents/planningDocumentService";
import { updateCanonicalMarkdownDisposition } from "../documents/canonicalMarkdownDocumentWriter";
import {
  approveFormalWorkCardAndRegisterReport,
  resolveWorkCardImplementerReportContext,
} from "../workCardBuilding/workCardBuildingReviewService";
import {
  getActiveArchitectOutputRuntimeSubmission,
  getArchitectOutputRuntimeStatus,
  prepareArchitectOutputRuntimeSubmission,
  type ActiveArchitectOutputRuntimeSubmission,
} from "../architectOutputs/architectOutputRuntimeService";
import { buildDeterministicArchitectDraftSubmissionId } from "../architectOutputs/architectDraftPaths";
import { getPhaseMapProjection } from "../phaseMap/phaseMapService";
import { getPhasePlanningCompletion } from "../phasePlanning/phasePlanningService";
import { selectNextWorkCardCandidate } from "../workCardIntake/workCardIntakeService";

export interface FormalWorkCardResult {
  phaseId: string;
  workCardId: string;
  formalWorkCardMarkdownPath: string;
}

export interface WorkCardBuildingEligibility {
  eligible: boolean;
  reason: string;
}

const outputKind = "formal-work-card";
const owningWorkspaceId = "work-card-planning";
const slotId = "formal-work-card";

interface FormalWorkCardContext {
  handoff: PlanningDocumentSummary;
  phaseId: string;
  workCardId: string;
  candidateId: string;
  candidate: Record<string, unknown>;
  targetPath: string;
  implementerReportPath: string;
  sourceRevisions: SourceRevision[];
  existing?: PlanningDocumentSummary;
}

export const formalWorkCardArchitectOutputDefinition: ArchitectOutputDefinition<
  typeof slotId,
  FormalWorkCardResult,
  FormalWorkCardContext
> = {
  outputKind,
  owningWorkspaceId,
  bundleMode: "single-output",
  slots: [{
    slotId,
    displayLabel: "Formal Work Card",
    draftPathComponent: "formal-work-card.md",
    validateBody(bodyMarkdown, context) {
      validateFormalWorkCardBody(bodyMarkdown, context.workCardId);
    },
    buildCanonicalDocument({ workspaceRoot, domainContext: context, bodyMarkdown }) {
      const existing = context.existing
        ? readExistingCanonical(workspaceRoot, context.targetPath)
        : null;
      const metadata = existing
        ? {
            ...metadataWithSubstantiveRevision(existing.metadata, context.sourceRevisions),
            identity: {
              phaseId: context.phaseId,
              workCardId: context.workCardId,
              candidateId: context.candidateId,
            },
            workflowData: {
              phaseId: context.phaseId,
              workCardId: context.workCardId,
              candidateId: context.candidateId,
              candidate: context.candidate,
              returnToPhasePlanningOnRejected: true,
            },
          }
        : outputMetadata({
            workspaceRoot,
            relativePath: context.targetPath,
            phaseId: context.phaseId,
            workCardId: context.workCardId,
            candidateId: context.candidateId,
            candidate: context.candidate,
            sourceRevisions: context.sourceRevisions,
          });
      return { relativePath: context.targetPath, metadata, bodyMarkdown };
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
    const context = requireFormalWorkCardContext(workspaceRoot);
    assertFormalWorkCardEligible(workspaceRoot, context);
    return {
      sourceHandoff: { path: context.handoff.markdownPath, revision: context.handoff.metadata.artifactRevision ?? 1 },
      domainContext: context,
    };
  },
  resolvePromotionContext({ workspaceRoot, submission, preparedContext }) {
    const context = requireFormalWorkCardContext(workspaceRoot);
    const original = preparedContext as FormalWorkCardContext;
    if (
      context.handoff.markdownPath !== submission.sourceHandoff.path ||
      (context.handoff.metadata.artifactRevision ?? 1) !== submission.sourceHandoff.revision ||
      context.targetPath !== original.targetPath ||
      JSON.stringify(context.sourceRevisions) !== JSON.stringify(original.sourceRevisions)
    ) {
      throw new Error("Formal Work Card draft no longer matches the current Work Card Intake handoff.");
    }
    assertFormalWorkCardEligible(workspaceRoot, context);
    return context;
  },
  buildPreparedInstruction({ submission, sourceHandoff, domainContext: context }) {
    return buildFormalWorkCardPreparedInstruction(context, submission, sourceHandoff);
  },
  buildPostPromotionSelection({ promotedDocuments, domainContext: context }) {
    return {
      phaseId: context.phaseId,
      workCardId: context.workCardId,
      formalWorkCardMarkdownPath: promotedDocuments[0].relativePath,
    };
  },
};

export function prepareFormalWorkCardDraftSubmission(
  workspaceRoot: string,
): ArchitectDraftSubmission<typeof slotId, FormalWorkCardResult> {
  return prepareArchitectOutputRuntimeSubmission(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getFormalWorkCardDraftStatus(
  workspaceRoot: string,
): ActiveArchitectOutputRuntimeSubmission<typeof slotId, FormalWorkCardResult> | undefined {
  return getArchitectOutputRuntimeStatus(workspaceRoot, outputKind, owningWorkspaceId);
}

export function getActiveFormalWorkCardDraftSubmission(
  workspaceRoot: string,
): ActiveArchitectOutputRuntimeSubmission<typeof slotId, FormalWorkCardResult> | undefined {
  return getActiveArchitectOutputRuntimeSubmission(workspaceRoot, owningWorkspaceId);
}

export function setFormalWorkCardDisposition(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
  status: DocumentDispositionStatus,
): PlanningDocumentSummary {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  if (status === "Approved") {
    approveFormalWorkCardAndRegisterReport({
      workspaceRoot,
      formalWorkCardPath: formal.markdownPath,
    });
  } else {
    updateCanonicalMarkdownDisposition({
      workspaceRoot,
      relativePath: formal.markdownPath,
      status,
      reviewedAt: new Date().toISOString(),
    });
  }
  return requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
}

export function getWorkCardBuildingEligibility(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): WorkCardBuildingEligibility {
  const formal = findByPrefix(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  if (!formal) {
    return { eligible: false, reason: "Formal Work Card is required." };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, formal.logicalDocumentId);
  const eligible =
    formal.effectiveDisposition === "Approved" &&
    formal.documentReadState === "readable" &&
    freshness.state === "fresh";
  if (eligible) {
    return { eligible: true, reason: "Approved Formal Work Card is the Work Card Building instruction." };
  }
  if (formal.effectiveDisposition === "Rejected") {
    return { eligible: false, reason: "Rejected Formal Work Card must return to Phase Planning bundle revision." };
  }
  return { eligible: false, reason: "Work Card Building requires a readable, fresh, Approved Formal Work Card." };
}

export function reviseFormalWorkCard(
  workspaceRoot: string,
  phaseId: string,
  workCardId: string,
): void {
  const formal = requiredAny(workspaceRoot, `planning/phases/${phaseId}/Work_Cards/${workCardId}`, ".md");
  savePlanningDocumentRevision(workspaceRoot, formal.logicalDocumentId);
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.markdownPath) {
    throw new Error(`Canonical Markdown input is required: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Formal Work Card document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".md") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(prefix))
    .filter((document) => document.markdownPath.endsWith(extension))
    .at(-1);
}

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const current = resolveCurrentFormalWorkCardSelection(workspaceRoot);
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "work-card-intake-handoff")
    .filter((document) => document.metadata.phaseId === current.phaseId || document.metadata.canonical?.identity.phaseId === current.phaseId)
    .filter((document) => document.metadata.workCardId === current.workCardId || document.metadata.canonical?.identity.workCardId === current.workCardId)
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Work Card Intake handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Work Card Intake handoff is stale.");
  }
  return handoff;
}

function requireFormalWorkCardContext(workspaceRoot: string): FormalWorkCardContext {
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const candidate = candidateFromHandoff(workflowData.candidate);
  const phaseId = candidate.phaseId;
  const candidateId = candidate.candidateId;
  const workCardId = typeof handoff.metadata.canonical?.identity.workCardId === "string"
    ? handoff.metadata.canonical.identity.workCardId
    : candidateId;
  const targetPath = formalWorkCardTargetFromHandoff(handoff);
  const existing = listPlanningDocuments(workspaceRoot).find((document) => document.markdownPath === targetPath);
  const implementerReportPath = resolveWorkCardImplementerReportContext(workspaceRoot, {
    phaseId,
    workCardId,
    formalWorkCardPath: targetPath,
    formalWorkCardRevision: existing?.metadata.artifactRevision ?? 1,
    workCardTitle: typeof candidate.title === "string" ? candidate.title : undefined,
  }).implementerReportPath;
  const context = {
    handoff,
    phaseId,
    workCardId,
    candidateId,
    candidate,
    targetPath,
    implementerReportPath,
    sourceRevisions: sourceRevisionsFromHandoff(handoff),
    existing,
  };
  return context;
}

function assertFormalWorkCardEligible(workspaceRoot: string, context: FormalWorkCardContext): void {
  if (!context.existing) return;
  if (context.existing.documentReadState !== "readable") {
    throw new Error(context.existing.readError ?? "Existing Formal Work Card is not readable.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, context.existing.logicalDocumentId).state === "stale") {
    throw new Error("Existing Formal Work Card is stale.");
  }
  if (context.existing.effectiveDisposition !== "RevisionRequested") {
    throw new Error("Formal Work Card draft can only replace an absent target or a current RevisionRequested Formal Work Card.");
  }
}

function formalWorkCardTargetFromHandoff(handoff: PlanningDocumentSummary): string {
  const target = handoff.metadata.canonical?.workflowData.formalWorkCardTarget;
  if (typeof target !== "string" || !target.trim() || path.isAbsolute(target) || target.includes("..") || !target.endsWith(".md")) {
    throw new Error("Work Card Intake handoff is missing formalWorkCardTarget.");
  }
  return target;
}

function resolveCurrentFormalWorkCardSelection(workspaceRoot: string): {
  phaseId: string;
  workCardId: string;
} {
  const projection = getPhaseMapProjection(workspaceRoot);
  if (projection.state !== "first-incomplete") {
    throw new Error("Current Phase Map must select an incomplete phase before Formal Work Card planning.");
  }
  const phaseId = projection.phase.phaseId;
  const phasePlanning = getPhasePlanningCompletion(workspaceRoot, phaseId);
  if (!phasePlanning.complete) {
    throw new Error("Current Approved Phase Planning bundle is required before Formal Work Card planning.");
  }
  const selection = selectNextWorkCardCandidate(workspaceRoot, phaseId);
  if (selection.state !== "selected") {
    throw new Error(`No eligible current Work Card candidate is available: ${selection.state}.`);
  }
  return {
    phaseId,
    workCardId: selection.selectedCandidate.candidateId,
  };
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  phaseId: string;
  workCardId: string;
  candidateId: string;
  candidate: Record<string, unknown>;
  sourceRevisions: SourceRevision[];
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: "formal-work-card",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "gatingReview",
    identity: {
      phaseId: input.phaseId,
      workCardId: input.workCardId,
      candidateId: input.candidateId,
    },
    sourceRevisions: input.sourceRevisions,
    workflowData: {
      phaseId: input.phaseId,
      workCardId: input.workCardId,
      candidateId: input.candidateId,
      candidate: input.candidate,
      returnToPhasePlanningOnRejected: true,
    },
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function candidateFromHandoff(value: unknown): Record<string, unknown> & { phaseId: string; candidateId: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Work Card Intake handoff is missing candidate data.");
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.phaseId !== "string" || !candidate.phaseId.trim()) {
    throw new Error("Work Card Intake handoff candidate is missing phaseId.");
  }
  if (typeof candidate.candidateId !== "string" || !candidate.candidateId.trim()) {
    throw new Error("Work Card Intake handoff candidate is missing candidateId.");
  }
  return candidate as Record<string, unknown> & { phaseId: string; candidateId: string };
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}

function sourceRevisionsFromHandoff(handoff: PlanningDocumentSummary): SourceRevision[] {
  return [
    ...(handoff.metadata.sourceRevisions ?? []),
    { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
  ];
}

function buildFormalWorkCardPreparedInstruction(
  context: FormalWorkCardContext,
  submission: ArchitectDraftSubmission<typeof slotId>,
  sourceHandoff: SourceRevision,
): string {
  const draftPath = submission.expectedDraftSlots[0].draftRelativePath;
  const candidateTitle = typeof context.candidate.title === "string" && context.candidate.title.trim()
    ? context.candidate.title.trim()
    : context.workCardId;
  const revisionInstructionLines = currentOperatorRevisionInstructionLines(context.existing);
  const evidenceLines = context.sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`);
  return [
    "Use ChampCity MCP with repository reference <PROJECT_REPO>.",
    "Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.",
    "",
    "This is the Formal Work Card Architect session.",
    "",
    "Read the exact current Approved Work Card Intake handoff:",
    `- path: ${sourceHandoff.path}`,
    `- revision: ${sourceHandoff.revision}`,
    "",
    "Selected Work Card:",
    `- ID: ${context.workCardId}`,
    `- title: ${candidateTitle}`,
    `- candidate context: ${JSON.stringify(context.candidate)}`,
    "",
    "Application-owned outputs:",
    `- final Formal Work Card target: ${context.targetPath}`,
    `- Implementer Report target: ${context.implementerReportPath}`,
    `- temporary body-only draft path: ${draftPath}`,
    "",
    "Application-owned Implementer Report target:",
    `- ${context.implementerReportPath}`,
    "",
    "Evidence inputs:",
    ...evidenceLines,
    "",
    ...revisionInstructionLines,
    "Your job is to create the Architect's executable implementation contract. The Implementer will be responsible for faithful coding and proof, not for deciding what the system should become.",
    "",
    "Before drafting:",
    "",
    "1. Inspect the complete production path relevant to this candidate, including service or domain logic, main-process IPC exposure, preload exposure, shared contracts, renderer wiring, persistence or canonical writers, downstream consumers, and relevant tests. A layer may be omitted only when repository inspection confirms it is absent or irrelevant; state that limitation in Verified Repository Evidence. Do not claim a complete review when only an obvious surface was inspected.",
    "",
    "2. Distinguish:",
    "- verified repository behavior;",
    "- approved planning direction that is not yet implemented;",
    "- unresolved assumptions or Operator-owned choices.",
    "",
    "3. Make all Architect-owned decisions needed for this Work Card. Do not ask the Implementer to determine the source of authority, persistence mechanism, output structure, workflow state model, atomicity, retry behavior, review semantics, UI interaction pattern, schema, invocation object, or existing mechanism to reuse.",
    "",
    "4. When a material Operator-owned choice remains, ask one primary question at a time in plain language. Provide the recommended answer first with a brief rationale. The Operator may answer `use your recommendation` or `unsure`; treat either as permission to proceed with the best evidence-grounded recommendation. Do not ask questions already resolved by repository evidence or normal architectural judgment. Do not create the draft until material questions are resolved.",
    "",
    "5. When no material Operator-owned choice remains, proceed without asking a question.",
    "",
    "6. Define the smallest complete buildable outcome and the exact runtime sequence:",
    "existing authoritative evidence",
    "\u2192 authorized application action",
    "\u2192 required state transition",
    "\u2192 persistence or rendering result",
    "\u2192 Operator-visible outcome",
    "",
    "Do not restate the Phase Plan except where a specific constraint directly governs this Work Card.",
    "",
    "Create one complete Formal Work Card body with exactly this structure:",
    "",
    `# ${context.workCardId} \u2014 ${candidateTitle}`,
    ...formalWorkCardHeadings.map((heading) => `## ${heading}`),
    "",
    "Apply these section rules:",
    "",
    "- Verified Repository Evidence identifies the actual files, functions, routes, persistence, downstream consumers, and tests inspected. It separates confirmed behavior from planning intent and assumptions.",
    "- Objective defines one bounded outcome.",
    "- Runtime Sequence states the exact production path and state transition.",
    "- Required Changes embeds exact approved prompt text, schemas, invocation objects, metadata shapes, or required sequences when practical. The Implementer installs the decision rather than inventing it.",
    "- Preserved Behavior states accepted authorities and invariants that must not be reopened.",
    "- Authorized Surface lists expected production and test files. Permit only a narrowly necessary adjacent correction that preserves the architecture, is documented, and is fully tested.",
    "- Acceptance Criteria prove the actual production path. Require positive and negative proof, state before and after the action, final repository bytes or rendered projection, failure handling, retry behavior when relevant, and downstream readiness. Source-string checks may support wiring but cannot be primary runtime proof.",
    "- Negative Constraints prohibit alternate persistence, retired fallbacks, duplicate authority, unauthorized compatibility wrappers, duplicate schemas, manual imports, unnecessary migration, unrelated workspace changes, and Git operations unless explicitly authorized.",
    "- Implementer Report Requirements must name the exact application-owned Implementer Report target above and state that the Implementer updates that existing canonical report rather than creating an alternate report. Implementation is incomplete until the report at that exact path contains the complete auditable evidence required by the Work Card and remains Pending for Architect review.",
    "- Implementer Report Requirements map every acceptance criterion to concrete evidence, list all changed files and adjacent corrections, identify production paths exercised, commands and results, Operator validation remaining, scope expansion, and residual risk.",
    "- Manual Validation contains only visual, interactive, timing-sensitive, or embedded-browser checks that require the running product.",
    "",
    "Before writing the draft, verify:",
    "",
    "exact requested production behavior",
    "+ preserved behavior intact",
    "+ safe failure paths",
    "+ no unauthorized parallel mechanism",
    "+ auditable automated proof",
    "= ready for Operator review",
    "",
    "Do not include application metadata delimiters, canonical metadata, source revisions, final-write metadata, route selectors, fallback fields, hidden authority values, or placeholder content in the body.",
    "ChampCity A/I owns validation, canonical metadata, promotion, final writes, review state, and cleanup.",
    "",
    "When the complete body is ready, call artifact_toolbox.create_markdown_artifact exactly once:",
    "",
    "```json",
    "{",
    '  "action": "create_markdown_artifact",',
    '  "workspaceId": "<resolved workspace ID>",',
    '  "params": {',
    `    "relativePath": "${draftPath}",`,
    '    "content": "<complete body-only Formal Work Card Markdown>",',
    '    "overwrite": false',
    "  }",
    "}",
    "```",
    "",
    "After the draft is created, respond with a concise draft-created confirmation. If the action fails, report the exact failure and remain incomplete.",
  ].join("\n");
}

function currentOperatorRevisionInstructionLines(existing?: PlanningDocumentSummary): string[] {
  if (existing?.effectiveDisposition !== "RevisionRequested") {
    return [];
  }
  const notes = existing.metadata.canonical?.documentDisposition.notes?.trim();
  if (!notes) {
    throw new Error("RevisionRequested Formal Work Card requires current Operator revision instructions.");
  }
  return ["Current Operator revision instructions:", notes, ""];
}

function substantiveMarkdown(value: string, label: string): string {
  const body = value.trim();
  if (!body) {
    throw new Error(`${label} output requires substantive Markdown.`);
  }
  if (body.includes(metadataOpenDelimiter) || body.includes(metadataCloseDelimiter)) {
    throw new Error(`${label} output must not contain application metadata delimiters.`);
  }
  return body;
}

const formalWorkCardHeadings = [
  "Verified Repository Evidence",
  "Objective",
  "Runtime Sequence",
  "Required Changes",
  "Preserved Behavior",
  "Authorized Surface",
  "Risks and Constraints",
  "Acceptance Criteria",
  "Negative Constraints",
  "Implementer Report Requirements",
  "Manual Validation",
] as const;

function validateFormalWorkCardBody(bodyMarkdown: string, _workCardId: string): void {
  substantiveMarkdown(bodyMarkdown, "Formal Work Card");
}
