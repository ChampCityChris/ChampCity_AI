import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDispositions,
} from "../documents/planningDocumentService";
import type { RollbackWriteOptions } from "../documents/documentDispositionWriter";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

export interface ProjectPlanningHandoffResult {
  handoffMarkdownPath: string;
  handoffJsonPath: string;
  profileMarkdownPath: string;
  profileJsonPath: string;
  roadmapMarkdownPath: string;
  roadmapJsonPath: string;
}

export interface ProjectPlanningCompletion {
  complete: boolean;
  reason: string;
}

export function generateProjectPlanningHandoff(workspaceRoot: string): ProjectPlanningHandoffResult {
  const intake = requiredApproved(workspaceRoot, "planning/project/Project_Intake/", ".json");
  const prompt = requiredApproved(workspaceRoot, "planning/project/Project_Architect_Interview_Prompts/", ".json");
  const interview = requiredApproved(workspaceRoot, "planning/project/Project_Architect_Interviews/", ".json");
  const projectSlug = slugFromIntake(intake.displayFilename);
  const handoffMarkdownPath = `planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_${projectSlug}.md`;
  const handoffJsonPath = `planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_${projectSlug}.json`;
  const profileMarkdownPath = "planning/project/PROJECT_PROFILE.md";
  const profileJsonPath = "planning/project/PROJECT_PROFILE.json";
  const roadmapMarkdownPath = `planning/project/Project_Roadmap/PROJECT_ROADMAP_${projectSlug}.md`;
  const roadmapJsonPath = `planning/project/Project_Roadmap/PROJECT_ROADMAP_${projectSlug}.json`;
  const sourceRevisions = [
    { path: intake.jsonPath!, revision: intake.metadata.artifactRevision ?? 1 },
    { path: prompt.jsonPath!, revision: prompt.metadata.artifactRevision ?? 1 },
    { path: interview.jsonPath!, revision: interview.metadata.artifactRevision ?? 1 },
  ];

  writeFiles(workspaceRoot, [
    [
      handoffMarkdownPath,
      renderHandoffMarkdown(sourceRevisions, profileMarkdownPath, profileJsonPath, roadmapMarkdownPath, roadmapJsonPath),
    ],
    [
      handoffJsonPath,
      json({
        artifactType: "project-planning-handoff",
        artifactRevision: 1,
        participationRole: "nonReviewHandoff",
        sourceRevisions,
        outputTargets: {
          projectProfile: { markdown: profileMarkdownPath, json: profileJsonPath },
          projectRoadmap: { markdown: roadmapMarkdownPath, json: roadmapJsonPath },
        },
        documentDisposition: { status: "Approved" },
      }),
    ],
  ]);

  return {
    handoffMarkdownPath,
    handoffJsonPath,
    profileMarkdownPath,
    profileJsonPath,
    roadmapMarkdownPath,
    roadmapJsonPath,
  };
}

export function setProjectPlanningBundleDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions = {},
): void {
  const profile = requiredAny(workspaceRoot, "planning/project/PROJECT_PROFILE", ".json");
  const roadmap = requiredAny(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".json");
  setDocumentDispositions(workspaceRoot, [profile.logicalDocumentId, roadmap.logicalDocumentId], status, options);
}

export function getProjectPlanningCompletion(workspaceRoot: string): ProjectPlanningCompletion {
  const profile = findByPrefix(workspaceRoot, "planning/project/PROJECT_PROFILE", ".json");
  const roadmap = findByPrefix(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".json");
  if (!profile || !roadmap) {
    return { complete: false, reason: "Project Profile and Project Roadmap are both required." };
  }
  const profileFreshness = evaluateDocumentFreshness(workspaceRoot, profile.logicalDocumentId);
  const roadmapFreshness = evaluateDocumentFreshness(workspaceRoot, roadmap.logicalDocumentId);
  const complete =
    profile.effectiveDisposition === "Approved" &&
    roadmap.effectiveDisposition === "Approved" &&
    profile.synchronizationState === "synchronized" &&
    roadmap.synchronizationState === "synchronized" &&
    profileFreshness.state === "fresh" &&
    roadmapFreshness.state === "fresh";

  return {
    complete,
    reason: complete
      ? "Project Planning is complete because Project Profile and Project Roadmap are synchronized, fresh, and Approved."
      : "Project Planning remains incomplete until both Project Profile and Project Roadmap are synchronized, fresh, and Approved.",
  };
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document || document.effectiveDisposition !== "Approved") {
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
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Project Planning document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".json") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").startsWith(prefix))
    .filter((document) => (document.jsonPath ?? document.markdownPath ?? "").endsWith(extension))
    .at(-1);
}

function renderHandoffMarkdown(
  sourceRevisions: Array<{ path: string; revision: number }>,
  profileMarkdownPath: string,
  profileJsonPath: string,
  roadmapMarkdownPath: string,
  roadmapJsonPath: string,
): string {
  return [
    "# Project Planning Documents Handoff",
    "Artifact.Revision=1",
    "participationRole=nonReviewHandoff",
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Output Targets",
    profileMarkdownPath,
    profileJsonPath,
    roadmapMarkdownPath,
    roadmapJsonPath,
    "",
    "## Document Disposition",
    "",
    "Document.Status=Approved",
    "",
  ].join("\n");
}

function renderPlanningMarkdown(
  title: string,
  sourceRevisions: Array<{ path: string; revision: number }>,
): string {
  return [
    `# ${title}`,
    "Artifact.Revision=1",
    "participationRole=compoundGatingReview",
    "",
    "## Source Revisions",
    ...sourceRevisions.map((source) => `- path: ${source.path} revision: ${source.revision}`),
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
}

function writeFiles(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function slugFromIntake(displayFilename: string): string {
  return displayFilename.replace(/^PROJECT_INTAKE_/, "") || "project";
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
