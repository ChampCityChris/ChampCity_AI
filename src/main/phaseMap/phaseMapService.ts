import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import { isSemanticallyComplete } from "../../shared/documents/lifecycleArtifact";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDisposition,
} from "../documents/planningDocumentService";

export interface PhaseMapPhase {
  phaseId: string;
  title: string;
  order: number;
  purpose: string;
  dependsOn: string[];
  sourceReferences: string[];
}

export interface PhaseMapHandoffResult {
  handoffMarkdownPath: string;
  handoffJsonPath: string;
  phaseMapMarkdownPath: string;
  phaseMapJsonPath: string;
}

export type PhaseMapProjection =
  | { state: "missing"; reason: string }
  | { state: "not-approved"; reason: string }
  | { state: "stale"; reason: string; staleSources: Array<{ path: string; expectedRevision: number; currentRevision?: number; state: "missing" | "stale" }> }
  | { state: "malformed"; reason: string }
  | { state: "first-incomplete"; phase: PhaseMapPhase; completedPhaseIds: string[] }
  | { state: "all-complete"; completedPhaseIds: string[] };

interface PhaseMapFile {
  phases: PhaseMapPhase[];
}

const persistedCompletionFields = new Set([
  "complete",
  "completed",
  "isComplete",
  "completion",
  "completionStatus",
  "closeoutApproved",
]);

export function generatePhaseMapHandoff(
  workspaceRoot: string,
  phases: PhaseMapPhase[] = [defaultPhase()],
): PhaseMapHandoffResult {
  const profile = requiredApproved(workspaceRoot, "planning/project/PROJECT_PROFILE", ".json");
  const roadmap = requiredApproved(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".json");
  const projectSlug = slugFromRoadmap(roadmap.displayFilename);
  const handoffMarkdownPath = `planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_${projectSlug}.md`;
  const handoffJsonPath = `planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_${projectSlug}.json`;
  const phaseMapMarkdownPath = `planning/project/Phase_Map/PHASE_MAP_${projectSlug}.md`;
  const phaseMapJsonPath = `planning/project/Phase_Map/PHASE_MAP_${projectSlug}.json`;
  const sourceRevisions = [
    { path: profile.jsonPath!, revision: profile.metadata.artifactRevision ?? 1 },
    { path: roadmap.jsonPath!, revision: roadmap.metadata.artifactRevision ?? 1 },
  ];
  const normalizedPhases = validatePhaseMap({ phases });

  writeFiles(workspaceRoot, [
    [
      handoffMarkdownPath,
      renderHandoffMarkdown(sourceRevisions, phaseMapMarkdownPath, phaseMapJsonPath),
    ],
    [
      handoffJsonPath,
      json({
        artifactType: "phase-map-architect-handoff",
        artifactRevision: 1,
        participationRole: "nonReviewHandoff",
        sourceRevisions,
        outputTargets: {
          phaseMap: { markdown: phaseMapMarkdownPath, json: phaseMapJsonPath },
        },
        documentDisposition: { status: "Approved" },
      }),
    ],
    [phaseMapMarkdownPath, renderPhaseMapMarkdown(normalizedPhases, sourceRevisions)],
    [
      phaseMapJsonPath,
      json({
        artifactType: "phase-map",
        artifactRevision: 1,
        participationRole: "gatingReview",
        sourceRevisions,
        phases: normalizedPhases,
        documentDisposition: { status: "Pending" },
      }),
    ],
  ]);

  return {
    handoffMarkdownPath,
    handoffJsonPath,
    phaseMapMarkdownPath,
    phaseMapJsonPath,
  };
}

export function setPhaseMapDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
): void {
  const phaseMap = requiredAny(workspaceRoot, "planning/project/Phase_Map/PHASE_MAP", ".json");
  setDocumentDisposition(workspaceRoot, phaseMap.logicalDocumentId, status);
}

export function getPhaseMapProjection(workspaceRoot: string): PhaseMapProjection {
  const documents = listPlanningDocuments(workspaceRoot);
  const phaseMap = documents
    .filter((document) => (document.jsonPath ?? "").startsWith("planning/project/Phase_Map/PHASE_MAP"))
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
  if (!phaseMap.jsonPath) {
    throw new Error("Phase Map JSON pair is required.");
  }
  const absolutePath = path.join(workspaceRoot, phaseMap.jsonPath);
  return { phases: validatePhaseMap(JSON.parse(fs.readFileSync(absolutePath, "utf8"))) };
}

function validatePhaseMap(value: unknown): PhaseMapPhase[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { phases?: unknown }).phases)) {
    throw new Error("Phase Map must contain a phases array.");
  }

  return (value as { phases: unknown[] }).phases.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Each Phase Map entry must be an object.");
    }
    for (const field of Object.keys(entry)) {
      if (persistedCompletionFields.has(field)) {
        throw new Error("Phase Map must not persist completion state.");
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

    return {
      phaseId: phase.phaseId,
      title: phase.title,
      order: phase.order,
      purpose: phase.purpose,
      dependsOn: phase.dependsOn,
      sourceReferences: phase.sourceReferences,
    };
  });
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

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = requiredAny(workspaceRoot, prefix, extension);
  if (document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  if (!document.jsonPath) {
    throw new Error(`JSON input is required: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => (candidate.jsonPath ?? candidate.markdownPath ?? "").startsWith(prefix))
    .filter((candidate) => (candidate.jsonPath ?? candidate.markdownPath ?? "").endsWith(extension))
    .at(-1);
  if (!document) {
    throw new Error(`Phase Map document is missing: ${prefix}`);
  }
  return document;
}

function renderHandoffMarkdown(
  sourceRevisions: SourceRevision[],
  phaseMapMarkdownPath: string,
  phaseMapJsonPath: string,
): string {
  return [
    "# Phase Map Architect Handoff",
    "Artifact.Revision=1",
    "participationRole=nonReviewHandoff",
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Output Targets",
    phaseMapMarkdownPath,
    phaseMapJsonPath,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function renderPhaseMapMarkdown(phases: PhaseMapPhase[], sourceRevisions: SourceRevision[]): string {
  return [
    "# Phase Map",
    "Artifact.Revision=1",
    "participationRole=gatingReview",
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Phases",
    ...phases.map((phase) =>
      [
        `- phaseId: ${phase.phaseId}`,
        `  title: ${phase.title}`,
        `  order: ${phase.order}`,
        `  purpose: ${phase.purpose}`,
        `  dependsOn: ${phase.dependsOn.join(", ")}`,
        `  sourceReferences: ${phase.sourceReferences.join(", ")}`,
      ].join("\n"),
    ),
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function defaultPhase(): PhaseMapPhase {
  return {
    phaseId: "phase-01",
    title: "Phase 01",
    order: 1,
    purpose: "Initial project building phase.",
    dependsOn: [],
    sourceReferences: [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap",
    ],
  };
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  const originals = new Map<string, Buffer | null>();
  try {
    for (const [relativePath] of entries) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      originals.set(absolutePath, fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath) : null);
    }
    for (const [relativePath, content] of entries) {
      const absolutePath = path.join(workspaceRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content, "utf8");
    }
  } catch (error) {
    for (const [absolutePath, content] of originals) {
      if (content === null) {
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
      } else {
        fs.writeFileSync(absolutePath, content);
      }
    }
    throw error;
  }
}

function slugFromRoadmap(displayFilename: string): string {
  return displayFilename.replace(/^PROJECT_ROADMAP_/, "") || "project";
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
