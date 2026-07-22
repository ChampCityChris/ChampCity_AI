import fs from "node:fs";
import path from "node:path";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import {
  evaluateDocumentFreshness,
  listPlanningDocuments,
  readPlanningDocument,
  setDocumentDisposition,
} from "../documents/planningDocumentService";
import { writeArtifactTransaction } from "../documents/artifactTransaction";

export type ArchitectInterviewWorkspaceState =
  | "missing"
  | "waiting"
  | "ready"
  | "RevisionRequested"
  | "Approved"
  | "Rejected"
  | "local-error";

export interface ArchitectInterviewWorkspaceModel {
  state: ArchitectInterviewWorkspaceState;
  markdownPath?: string;
  jsonPath?: string;
  preview?: string;
  freshnessState?: "fresh" | "stale";
  projectIntakeComplete: boolean;
  reason: string;
}

export function getArchitectInterviewWorkspaceModel(
  workspaceRoot: string,
): ArchitectInterviewWorkspaceModel {
  const target = getInterviewTarget(workspaceRoot);
  if (!target) {
    return {
      state: "waiting",
      projectIntakeComplete: false,
      reason: "Project Architect Interview Prompt target is not available yet.",
    };
  }

  const document = findByPath(workspaceRoot, target.jsonPath) ?? findByPath(workspaceRoot, target.markdownPath);
  if (!document) {
    return {
      state: "missing",
      markdownPath: target.markdownPath,
      jsonPath: target.jsonPath,
      projectIntakeComplete: false,
      reason: "Waiting for Architect Interview document at the canonical target.",
    };
  }

  const freshness = evaluateDocumentFreshness(workspaceRoot, document.logicalDocumentId);
  const state = document.readError || document.synchronizationState === "mismatched"
    ? "local-error"
    : document.effectiveDisposition === "Pending"
      ? "ready"
      : document.effectiveDisposition;
  const detail = readPlanningDocument(workspaceRoot, document.logicalDocumentId);
  const projectIntakeComplete =
    document.effectiveDisposition === "Approved" &&
    document.synchronizationState === "synchronized" &&
    freshness.state === "fresh";

  return {
    state,
    markdownPath: target.markdownPath,
    jsonPath: target.jsonPath,
    preview: detail.preview,
    freshnessState: freshness.state,
    projectIntakeComplete,
    reason: projectIntakeComplete
      ? "Project Intake is complete because the current Architect Interview is synchronized, fresh, and Approved."
      : "Project Intake remains incomplete until the current Architect Interview pair is synchronized, fresh, and Approved.",
  };
}

export function saveArchitectInterviewDraft(
  workspaceRoot: string,
  markdownBody: string,
): ArchitectInterviewWorkspaceModel {
  const target = getInterviewTarget(workspaceRoot);
  if (!target) {
    throw new Error("Cannot save Architect Interview before the WC02 prompt target exists.");
  }

  const intake = requiredDocument(workspaceRoot, "planning/project/Project_Intake/", ".json");
  const prompt = requiredDocument(
    workspaceRoot,
    "planning/project/Project_Architect_Interview_Prompts/",
    ".json",
  );
  const previousRevision = readArtifactRevision(workspaceRoot, target.jsonPath);
  const artifactRevision = previousRevision + 1;
  const markdown = [
    "# Project Architect Interview",
    `Artifact.Revision=${artifactRevision}`,
    "participationRole=gatingReview",
    "",
    "## Source Revisions",
    `- path: ${intake.jsonPath} revision: ${intake.metadata.artifactRevision ?? 1}`,
    `- path: ${prompt.jsonPath} revision: ${prompt.metadata.artifactRevision ?? 1}`,
    "",
    markdownBody.trim(),
    "",
    "## Document Disposition",
    "",
    "Document.Status=Pending",
    "",
  ].join("\n");
  const json = `${JSON.stringify(
    {
      artifactType: "project-architect-interview",
      artifactRevision,
      participationRole: "gatingReview",
      sourceRevisions: [
        { path: intake.jsonPath, revision: intake.metadata.artifactRevision ?? 1 },
        { path: prompt.jsonPath, revision: prompt.metadata.artifactRevision ?? 1 },
      ],
      interviewSummary: markdownBody.trim(),
      documentDisposition: { status: "Pending" },
    },
    null,
    2,
  )}\n`;

  writePair(workspaceRoot, [
    [target.markdownPath, markdown],
    [target.jsonPath, json],
  ]);

  return getArchitectInterviewWorkspaceModel(workspaceRoot);
}

export function setArchitectInterviewDisposition(
  workspaceRoot: string,
  status: DocumentDispositionStatus,
): ArchitectInterviewWorkspaceModel {
  const target = getInterviewTarget(workspaceRoot);
  if (!target) {
    throw new Error("Architect Interview target is not available.");
  }
  const document = findByPath(workspaceRoot, target.jsonPath) ?? findByPath(workspaceRoot, target.markdownPath);
  if (!document) {
    throw new Error("Architect Interview document is not available.");
  }

  setDocumentDisposition(workspaceRoot, document.logicalDocumentId, status);
  return getArchitectInterviewWorkspaceModel(workspaceRoot);
}

function getInterviewTarget(workspaceRoot: string): { markdownPath: string; jsonPath: string } | null {
  const prompt = latestPrompt(workspaceRoot);
  const targets = prompt?.jsonPath ? readPromptTargets(workspaceRoot, prompt.jsonPath) : null;
  return targets;
}

function latestPrompt(workspaceRoot: string) {
  return listPlanningDocuments(workspaceRoot)
    .filter((document) =>
      (document.jsonPath ?? document.markdownPath ?? "").startsWith(
        "planning/project/Project_Architect_Interview_Prompts/",
      ),
    )
    .sort((left, right) => left.displayFilename.localeCompare(right.displayFilename))
    .at(-1);
}

function readPromptTargets(
  workspaceRoot: string,
  jsonPath: string,
): { markdownPath: string; jsonPath: string } | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(workspaceRoot, jsonPath), "utf8")) as {
      architectOutputTargets?: { markdown?: unknown; json?: unknown };
    };
    const targetMarkdownPath = parsed.architectOutputTargets?.markdown;
    const targetJsonPath = parsed.architectOutputTargets?.json;
    return typeof targetMarkdownPath === "string" && typeof targetJsonPath === "string"
      ? { markdownPath: targetMarkdownPath, jsonPath: targetJsonPath }
      : null;
  } catch {
    return null;
  }
}

function requiredDocument(workspaceRoot: string, prefix: string, extension: ".json") {
  const document = listPlanningDocuments(workspaceRoot)
    .filter((candidate) => (candidate.jsonPath ?? "").startsWith(prefix))
    .filter((candidate) => (candidate.jsonPath ?? "").endsWith(extension))
    .at(-1);
  if (!document?.jsonPath) {
    throw new Error(`Required Architect Interview source is missing: ${prefix}`);
  }
  return document;
}

function findByPath(workspaceRoot: string, relativePath: string) {
  return listPlanningDocuments(workspaceRoot).find(
    (document) => document.markdownPath === relativePath || document.jsonPath === relativePath,
  );
}

function writePair(workspaceRoot: string, entries: Array<[relativePath: string, content: string]>): void {
  writeArtifactTransaction(
    workspaceRoot,
    entries.map(([relativePath, content]) => ({ relativePath, content })),
  );
}

function readArtifactRevision(workspaceRoot: string, relativePath: string): number {
  const absolutePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return 0;
  }
  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as {
    artifactRevision?: unknown;
  };
  return typeof parsed.artifactRevision === "number" ? parsed.artifactRevision : 0;
}
