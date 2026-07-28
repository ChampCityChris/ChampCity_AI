import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { PlanningDocumentSummary, SourceRevision } from "../../shared/documents/planningDocument";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  setDocumentDispositions,
} from "../documents/planningDocumentService";
import type { RollbackWriteOptions } from "../documents/documentDispositionWriter";
import {
  writeCanonicalMarkdownDocument,
  writeCanonicalMarkdownDocuments,
} from "../documents/canonicalMarkdownDocumentWriter";

export interface ProjectPlanningHandoffResult {
  handoffMarkdownPath: string;
  profileMarkdownPath: string;
  roadmapMarkdownPath: string;
}

export interface ProjectPlanningCompletion {
  complete: boolean;
  reason: string;
}

export interface ProjectPlanningOutputInput {
  projectProfileMarkdown: string;
  projectRoadmapMarkdown: string;
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

export function saveProjectPlanningOutputs(
  workspaceRoot: string,
  input: ProjectPlanningOutputInput,
): {
  projectProfileMarkdownPath: string;
  projectRoadmapMarkdownPath: string;
} {
  const projectProfileMarkdown = substantiveMarkdown(input.projectProfileMarkdown, "Project Profile");
  const projectRoadmapMarkdown = substantiveMarkdown(input.projectRoadmapMarkdown, "Project Roadmap");
  const handoff = requiredApprovedHandoff(workspaceRoot);
  const workflowData = handoff.metadata.canonical?.workflowData ?? {};
  const projectProfileMarkdownPath = requiredMarkdownTarget(workflowData.projectProfileTarget, "projectProfileTarget");
  const projectRoadmapMarkdownPath = requiredMarkdownTarget(workflowData.projectRoadmapTarget, "projectRoadmapTarget");
  const projectSlug = projectSlugFromCurrentIntake(workspaceRoot);
  const sourceRevisions = sourceRevisionsFromHandoff(handoff);

  writeCanonicalMarkdownDocuments([
    {
      workspaceRoot,
      relativePath: projectProfileMarkdownPath,
      metadata: outputMetadata({
        workspaceRoot,
        relativePath: projectProfileMarkdownPath,
        artifactType: "project-profile",
        identity: { projectSlug },
        sourceRevisions,
      }),
      bodyMarkdown: projectProfileMarkdown,
    },
    {
      workspaceRoot,
      relativePath: projectRoadmapMarkdownPath,
      metadata: outputMetadata({
        workspaceRoot,
        relativePath: projectRoadmapMarkdownPath,
        artifactType: "project-roadmap",
        identity: { projectSlug },
        sourceRevisions,
      }),
      bodyMarkdown: projectRoadmapMarkdown,
    },
  ]);

  return {
    projectProfileMarkdownPath,
    projectRoadmapMarkdownPath,
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

function requiredApprovedHandoff(workspaceRoot: string): PlanningDocumentSummary {
  const handoff = listPlanningDocuments(workspaceRoot)
    .filter((document) => document.metadata.artifactType === "generated-handoff")
    .filter((document) => document.metadata.canonical?.workflowData.handoffKind === "project-planning")
    .filter((document) => document.effectiveDisposition === "Approved")
    .at(-1);
  if (!handoff) {
    throw new Error("Current Approved Project Planning handoff is required.");
  }
  if (evaluateDocumentFreshness(workspaceRoot, handoff.logicalDocumentId).state === "stale") {
    throw new Error("Current Project Planning handoff is stale.");
  }
  return handoff;
}

function sourceRevisionsFromHandoff(handoff: PlanningDocumentSummary): SourceRevision[] {
  return [
    ...(handoff.metadata.sourceRevisions ?? []),
    { path: handoff.markdownPath, revision: handoff.metadata.artifactRevision ?? 1 },
  ];
}

function outputMetadata(input: {
  workspaceRoot: string;
  relativePath: string;
  artifactType: "project-profile" | "project-roadmap";
  identity: Record<string, unknown>;
  sourceRevisions: SourceRevision[];
}): CanonicalDocumentMetadata {
  const existing = readExistingCanonical(input.workspaceRoot, input.relativePath);
  return {
    schemaVersion: 1,
    artifactType: input.artifactType,
    artifactRevision: existing ? existing.metadata.artifactRevision + 1 : 1,
    participationRole: "compoundGatingReview",
    identity: input.identity,
    sourceRevisions: input.sourceRevisions,
    workflowData: {},
    documentDisposition: { status: "Pending", notes: "", reviewedAt: null },
  };
}

function readExistingCanonical(workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return parseCanonicalMarkdownDocument(fs.readFileSync(absolutePath, "utf8"));
}

function projectSlugFromCurrentIntake(workspaceRoot: string): string {
  const intake = requiredApproved(workspaceRoot, "planning/project/Project_Intake/", ".md");
  const identity = intake.metadata.canonical?.identity ?? {};
  const value = identity.projectSlug ?? identity["Project.ArtifactKey"] ?? slugFromIntake(intake.displayFilename);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Current Project Intake evidence does not provide projectSlug.");
  }
  return value.trim();
}

function requiredMarkdownTarget(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || value.includes("..") || !value.endsWith(".md")) {
    throw new Error(`Project Planning handoff is missing ${field}.`);
  }
  return value;
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

function slugFromIntake(displayFilename: string): string {
  return displayFilename.replace(/^PROJECT_INTAKE_/, "") || "project";
}
