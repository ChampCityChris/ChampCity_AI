import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDispositions,
} from "../documents/planningDocumentService";
import type { RollbackWriteOptions } from "../documents/documentDispositionWriter";
import { writeCanonicalMarkdownDocument } from "../documents/canonicalMarkdownDocumentWriter";

export interface ProjectPlanningHandoffResult {
  handoffMarkdownPath: string;
  profileMarkdownPath: string;
  roadmapMarkdownPath: string;
}

export interface ProjectPlanningCompletion {
  complete: boolean;
  reason: string;
}

export function generateProjectPlanningHandoff(workspaceRoot: string): ProjectPlanningHandoffResult {
  const intake = requiredApproved(workspaceRoot, "planning/project/Project_Intake/", ".md");
  const prompt = requiredApproved(workspaceRoot, "planning/project/Project_Architect_Interview_Prompts/", ".md");
  const interview = requiredApproved(workspaceRoot, "planning/project/Project_Architect_Interviews/", ".md");
  const projectSlug = slugFromIntake(intake.displayFilename);
  const handoffMarkdownPath = `planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_${projectSlug}.md`;
  const profileMarkdownPath = "planning/project/PROJECT_PROFILE.md";
  const roadmapMarkdownPath = `planning/project/Project_Roadmap/PROJECT_ROADMAP_${projectSlug}.md`;
  writeCanonicalMarkdownDocument({
    workspaceRoot,
    relativePath: handoffMarkdownPath,
    metadata: {
      schemaVersion: 1,
      artifactType: "generated-handoff",
      artifactRevision: 1,
      participationRole: "nonReviewHandoff",
      identity: { handoffKind: "project-planning" },
      sourceRevisions: [
        { path: intake.markdownPath, revision: intake.metadata.artifactRevision ?? 1 },
        { path: prompt.markdownPath, revision: prompt.metadata.artifactRevision ?? 1 },
        { path: interview.markdownPath, revision: interview.metadata.artifactRevision ?? 1 },
      ],
      workflowData: {
        handoffKind: "project-planning",
        projectProfileTarget: profileMarkdownPath,
        projectRoadmapTarget: roadmapMarkdownPath,
      },
      documentDisposition: { status: "Approved", notes: "", reviewedAt: null },
    },
    bodyMarkdown: `# Project Planning Handoff\n\nProject Profile Markdown: ${profileMarkdownPath}\nProject Roadmap Markdown: ${roadmapMarkdownPath}\n`,
  });

  return {
    handoffMarkdownPath,
    profileMarkdownPath,
    roadmapMarkdownPath,
  };
}

export function setProjectPlanningBundleDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
  options: RollbackWriteOptions = {},
): void {
  const profile = requiredAny(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = requiredAny(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  setDocumentDispositions(workspaceRoot, [profile.logicalDocumentId, roadmap.logicalDocumentId], status, options);
}

export function getProjectPlanningCompletion(workspaceRoot: string): ProjectPlanningCompletion {
  const profile = findByPrefix(workspaceRoot, "planning/project/PROJECT_PROFILE", ".md");
  const roadmap = findByPrefix(workspaceRoot, "planning/project/Project_Roadmap/PROJECT_ROADMAP", ".md");
  if (!profile || !roadmap) {
    return { complete: false, reason: "Project Profile and Project Roadmap are both required." };
  }
  const profileFreshness = evaluateDocumentFreshness(workspaceRoot, profile.logicalDocumentId);
  const roadmapFreshness = evaluateDocumentFreshness(workspaceRoot, roadmap.logicalDocumentId);
  const complete =
    profile.effectiveDisposition === "Approved" &&
    roadmap.effectiveDisposition === "Approved" &&
    profile.documentReadState === "readable" &&
    roadmap.documentReadState === "readable" &&
    profileFreshness.state === "fresh" &&
    roadmapFreshness.state === "fresh";

  return {
    complete,
    reason: complete
      ? "Project Planning is complete because Project Profile and Project Roadmap are readable, fresh, and Approved."
      : "Project Planning remains incomplete until both Project Profile and Project Roadmap are readable, fresh, and Approved.",
  };
}

function requiredApproved(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document || document.effectiveDisposition !== "Approved") {
    throw new Error(`Current Approved input is required: ${prefix}`);
  }
  if (evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId).state === "stale") {
    throw new Error(`Current input is stale: ${prefix}`);
  }
  return document;
}

function requiredAny(workspaceRoot: string, prefix: string, extension: ".md") {
  const document = findByPrefix(workspaceRoot, prefix, extension);
  if (!document) {
    throw new Error(`Project Planning document is missing: ${prefix}`);
  }
  return document;
}

function findByPrefix(workspaceRoot: string, prefix: string, extension: ".md") {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) => document.markdownPath.startsWith(prefix))
    .filter((document) => document.markdownPath.endsWith(extension))
    .at(-1);
}

function slugFromIntake(displayFilename: string): string {
  return displayFilename.replace(/^PROJECT_INTAKE_/, "") || "project";
}
