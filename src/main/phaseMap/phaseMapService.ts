import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import { isSemanticallyComplete } from "../../shared/documents/lifecycleArtifact";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";
import {
  getActivePhaseMapDraftSubmission,
  getPhaseMapDraftStatus,
  preparePhaseMapDraftSubmission,
  validatePhaseMapData,
  type PhaseMapPhase,
} from "./phaseMapDraftOutput";
import {
  buildCreateMarkdownArtifactJsonBlock,
  buildMcpWorkspaceBindingPromptBlock,
} from "../integrations/mcpWorkspacePromptContract";
import {
  inheritRepositoryAuthorityFromSourceRevisions,
  mergeRepositoryAuthorityIntoWorkflowData,
} from "../documents/repositoryAuthority";

export type { PhaseMapPhase };

export interface PhaseMapHandoffResult {
  handoffMarkdownPath: string;
  phaseMapMarkdownPath: string;
  alreadyPrepared: boolean;
}

export type PhaseMapProjection =
  | { state: "missing"; reason: string }
  | { state: "not-approved"; reason: string }
  | { state: "stale"; reason: string; staleSources: Array<{ path: string; expectedRevision: number; currentRevision?: number; state: "missing" | "stale" }> }
  | { state: "malformed"; reason: string }
  | { state: "first-incomplete"; phase: PhaseMapPhase; completedPhaseIds: string[] }
  | { state: "all-complete"; completedPhaseIds: string[] };

const phaseMapSubmissionContractId = "phase-map-output-submission-v1";
const phaseMapDomainBlock = "champcity-phase-map";
const phaseMapRequiredTitle = "Phase Map";

interface PhaseMapFile {
  phases: PhaseMapPhase[];
}

export function generatePhaseMapHandoff(workspaceRoot: string): PhaseMapHandoffResult {
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  const projectSlug = slugFromRoadmap(roadmap.displayFilename);
  const handoffMarkdownPath = `planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_${projectSlug}.md`;
  const phaseMapMarkdownPath = `planning/project/Phase_Map/PHASE_MAP_${projectSlug}.md`;
  const sourceRevisions = [
    { path: profile.markdownPath, revision: profile.metadata.artifactRevision ?? 1 },
    { path: roadmap.markdownPath, revision: roadmap.metadata.artifactRevision ?? 1 },
  ];
  const existing = readExistingCanonical(workspaceRoot, handoffMarkdownPath);
  const metadata: CanonicalDocumentMetadata = {
    schemaVersion: 1,
    artifactType: "generated-handoff",
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "nonReviewHandoff",
    identity: { handoffKind: "phase-map", projectSlug },
    sourceRevisions,
    workflowData: mergeRepositoryAuthorityIntoWorkflowData(
      {
        handoffKind: "phase-map",
        contractId: phaseMapSubmissionContractId,
        phaseMapTarget: phaseMapMarkdownPath,
        requiredTitle: phaseMapRequiredTitle,
        requiredDomainBlocks: [phaseMapDomainBlock],
      },
      inheritRepositoryAuthorityFromSourceRevisions(workspaceRoot, sourceRevisions),
    ),
    documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
  };
  const bodyMarkdown = [
    "# Phase Map Architect Handoff",
    "",
    `Contract ID: ${phaseMapSubmissionContractId}`,
    `Approved Project Profile Markdown: ${profile.markdownPath}`,
    `Approved Project Profile Revision: ${profile.metadata.artifactRevision ?? 1}`,
    `Approved Project Roadmap Markdown: ${roadmap.markdownPath}`,
    `Approved Project Roadmap Revision: ${roadmap.metadata.artifactRevision ?? 1}`,
    `Exact Phase Map output target: ${phaseMapMarkdownPath}`,
    `Required Phase Map title: ${phaseMapRequiredTitle}`,
    `Project Identity: ${projectSlug}`,
    "",
    "The Architect must derive the substantive phase list from the approved full Project Roadmap and Project Profile.",
    "The application does not pre-author any phase entries.",
    "The Phase Map Markdown body must include exactly one champcity-phase-map fenced JSON block.",
    "The champcity-phase-map JSON block must be an object with one phases array.",
    "Each phase entry must contain phaseId, title, order, purpose, dependsOn, and sourceReferences.",
    "The phases array must be non-empty; phaseId values and order values must be unique.",
    "Every dependency must resolve to another phase in the same map; self-dependencies and dependency cycles are prohibited.",
    "sourceReferences must contain normalized repository-relative paths.",
    "Do not persist completion state in the Phase Map.",
    "Keep the output limited to project-level phase sequencing and repository evidence references.",
    "Browser chat is not durable authority. The Architect must create one temporary body-only Markdown draft through the generic artifact toolbox Markdown writer.",
    "",
  ].join("\n");
  if (existing && handoffMatchesCurrentEvidence(existing, metadata, bodyMarkdown)) {
    preparePhaseMapDraftSubmission(workspaceRoot);
    return {
      handoffMarkdownPath,
      phaseMapMarkdownPath,
      alreadyPrepared: true,
    };
  }

  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata,
    bodyMarkdown,
  });

  preparePhaseMapDraftSubmission(workspaceRoot);
  return {
    handoffMarkdownPath,
    phaseMapMarkdownPath,
    alreadyPrepared: false,
  };
}

export function getPhaseMapHandoffInstruction(workspaceRoot: string): string {
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const contractId = requiredString(workflowData.contractId, "contractId");
  if (contractId !== phaseMapSubmissionContractId) {
    throw new Error("Phase Map handoff contract is not current.");
  }
  const phaseMapMarkdownPath = requiredMarkdownTarget(workflowData.phaseMapTarget, "phaseMapTarget");
  const activeDraft = reusableOrFreshDraftSubmission(workspaceRoot);
  if ("preparedInstruction" in activeDraft && activeDraft.preparedInstruction) {
    return activeDraft.preparedInstruction;
  }
  const phaseMapDraftPath = draftPathForPhaseMap(activeDraft.submission);
  const promptWorkflowData = handoff.metadata.canonical?.workflowData ?? {};
  return [
    ...buildMcpWorkspaceBindingPromptBlock(workspaceRoot, promptWorkflowData, {
      includeDiagnosticsToolboxHint: false,
    }),
    "This handoff is for the embedded Phase Map Architect chat.",
    "",
    "Read these exact current inputs:",
    `- Current Approved Project Profile: ${profile.markdownPath}`,
    `- Current Approved Project Roadmap: ${roadmap.markdownPath}`,
    `- Generated Phase Map handoff: ${handoff.markdownPath}`,
    `- Stable Phase Map submission contract: ${contractId}`,
    "",
    "Produce one complete Phase Map Markdown body for this exact output target:",
    `- Exact Phase Map output target: ${phaseMapMarkdownPath}`,
    "",
    "MCP creates only this temporary body-only draft:",
    `- Temporary draft Markdown: ${phaseMapDraftPath}`,
    "ChampCity A/I owns the final target, canonical metadata, validation, revision, promotion, cleanup, and review state.",
    "The workflow remains incomplete until this temporary draft is created and ChampCity A/I promotes it.",
    "",
    `Required Phase Map title: ${phaseMapRequiredTitle}`,
    "Derive the substantive phase list from the approved full Project Roadmap and Project Profile.",
    "Do not use, retain, or submit placeholder phase text.",
    "All substantive phases must be derived from the Approved Project Profile and Approved Project Roadmap.",
    "The Phase Map Markdown body must include exactly one champcity-phase-map fenced JSON block.",
    "The champcity-phase-map JSON block must be an object with this non-authoritative structural shape:",
    "```json",
    "{",
    '  "phases": [',
    "    {",
    '      "phaseId": "<roadmap-derived phase ID>",',
    '      "title": "<roadmap-derived title>",',
    '      "order": 1,',
    '      "purpose": "<roadmap-derived purpose>",',
    '      "dependsOn": [],',
    '      "sourceReferences": ["<repository-relative source path>"]',
    "    }",
    "  ]",
    "}",
    "```",
    "Each phase entry must contain only phaseId, title, order, purpose, dependsOn, and sourceReferences.",
    "The phases array must be non-empty; phaseId values and order values must be unique.",
    "Every dependency must resolve to another phase in the same map; self-dependencies and dependency cycles are prohibited.",
    "sourceReferences must contain normalized repository-relative paths.",
    "Do not persist completion state in the Phase Map.",
    "The fenced JSON root must be an object, never an array.",
    "Do not include application metadata delimiters in the body.",
    "",
    "When the complete body is ready, call artifact_toolbox.create_markdown_artifact with this invocation shape:",
    "```json",
    ...buildCreateMarkdownArtifactJsonBlock(
      workspaceRoot,
      phaseMapDraftPath,
      "<complete body-only Phase Map Markdown>",
      promptWorkflowData,
    ),
    "```",
    "Do not supply canonical metadata, metadata delimiters, final canonical output paths, source revisions, route selectors, fallback fields, hidden authorization values, or any other authority fields as params.",
    "Do not call retired Phase Map submission actions, retired save actions, old-action aliases, dual-write routes, manual imports, local import fields, or manual file-copy fallbacks.",
    "After the draft is created, respond with a concise draft-created confirmation.",
    "If the action is unavailable, denied, or fails, report the exact tool failure and remain incomplete.",
    "",
    "Current source revisions:",
    ...sourceRevisionsFromHandoff(handoff).map((source) => `- path: ${source.path} revision: ${source.revision}`),
  ].join("\n");
}

export function setPhaseMapDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
): void {
  const phaseMap = requiredAny(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".md");
  setDocumentDisposition(workspaceRoot, phaseMap.logicalDocumentId, status);
}

export function getPhaseMapDraftSubmissionStatus(workspaceRoot: string) {
  return getPhaseMapDraftStatus(workspaceRoot);
}

export function getPhaseMapProjection(workspaceRoot: string): PhaseMapProjection {
  const documents = listPlanningDocuments(workspaceRoot);
  const phaseMap = documents
    .filter((document) => document.markdownPath.startsWith("planning/project/Phase_Map/PHASE_MAP"))
    .at(-1);
  if (!phaseMap) {
    return { state: "missing", reason: "Phase Map is required." };
  }
  if (phaseMap.effectiveDisposition !== "Approved") {
    return { state: "not-approved", reason: "Phase Map must be Approved before phase selection." };
  }
  const freshness = evaluateDocumentFreshness(workspaceRoot, phaseMap.logicalDocumentId);
  if (freshness.state === "stale") {
    return {
      state: "stale",
      reason: "Phase Map source revisions are stale.",
      staleSources: freshness.staleSources,
    };
  }

  let parsed: PhaseMapFile;
  try {
    parsed = readPhaseMap(workspaceRoot, phaseMap);
  } catch (error) {
    return { state: "malformed", reason: error instanceof Error ? error.message : String(error) };
  }

  const completedPhaseIds = completedPhaseIdsFromCloseouts(documents);
  const firstIncomplete = parsed.phases
    .slice()
    .sort((left, right) => left.order - right.order)
    .find((phase) => !completedPhaseIds.includes(phase.phaseId));

  return firstIncomplete
    ? { state: "first-incomplete", phase: firstIncomplete, completedPhaseIds }
    : { state: "all-complete", completedPhaseIds };
}

function readPhaseMap(workspaceRoot: string, phaseMap: PlanningDocumentSummary): PhaseMapFile {
  const absolutePath = path.join(workspaceRoot, phaseMap.markdownPath);
  const parsed = parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
  const metadataPhases = parsed.metadata.workflowData.phases;
  if (!Array.isArray(metadataPhases)) {
    throw new Error("Phase Map metadata.workflowData.phases is required.");
  }
  return { phases: validatePhaseMapData({ phases: metadataPhases }) };
}

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
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

function reusableOrFreshDraftSubmission(workspaceRoot: string) {
  const active = getActivePhaseMapDraftSubmission(workspaceRoot);
  if (
    active &&
    active.submission.state !== "promotion-failed" &&
    active.submission.state !== "promoted" &&
    active.submission.state !== "superseded"
  ) {
    return active;
  }
  const submission = preparePhaseMapDraftSubmission(workspaceRoot);
  return { workspaceRoot: path.resolve(workspaceRoot), submission };
}

function draftPathForPhaseMap(
  submission: ReturnType<typeof preparePhaseMapDraftSubmission>,
): string {
  const slot = submission.expectedDraftSlots.find((candidate) => candidate.slotId === "phase-map");
  if (!slot) {
    throw new Error("Phase Map draft submission is missing the expected slot.");
  }
  return slot.draftRelativePath;
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

function completedPhaseIdsFromCloseouts(documents: PlanningDocumentSummary[]): string[] {
  return documents
    .filter((document) => {
      const filename = document.displayFilename.toLowerCase();
      return filename.includes("phase_closeout") || /^phase_\d+_closeout/.test(filename);
    })
    .filter(isSemanticallyComplete)
    .map((document) => document.metadata.phaseId)
    .filter((phaseId): phaseId is string => Boolean(phaseId))
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => candidate.markdownPath.startsWith(prefix))
    .filter((candidate) => candidate.markdownPath.endsWith(extension))
    .at(-1);
  if (!document) {
    throw new Error(`Phase Map document is missing: ${prefix}`);
  }
  return document;
}

function slugFromRoadmap(displayFilename: string): string {
  return displayFilename.replace(/^PROJECT_ROADMAP_/, "") || "project";
}

function handoffMatchesCurrentEvidence(
  existing: NonNullable<ReturnType<typeof readExistingCanonical>>,
  expectedMetadata: CanonicalDocumentMetadata,
  expectedBodyMarkdown: string,
): boolean {
  const metadataWithoutRevision = (metadata: CanonicalDocumentMetadata) => ({
    schemaVersion: metadata.schemaVersion,
    artifactType: metadata.artifactType,
    participationRole: metadata.participationRole,
    identity: metadata.identity,
    sourceRevisions: metadata.sourceRevisions,
    workflowData: metadata.workflowData,
    documentDisposition: metadata.documentDisposition,
  });
  return JSON.stringify(metadataWithoutRevision(existing.metadata)) ===
    JSON.stringify(metadataWithoutRevision(expectedMetadata)) &&
    existing.bodyMarkdown === expectedBodyMarkdown;
}
