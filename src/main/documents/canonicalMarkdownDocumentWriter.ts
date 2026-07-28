import fs from "node:fs";
import path from "node:path";
import {
  type CanonicalDocumentMetadata,
  metadataWithDisposition,
  metadataWithSubstantiveRevision,
  parseCanonicalMarkdownDocument,
  serializeCanonicalMarkdownDocument,
} from "../../shared/documents/canonicalMarkdown";
import type { DocumentDispositionStatus } from "../../shared/documents/documentDisposition";
import type { SourceRevision } from "../../shared/documents/planningDocument";
import { writeArtifactTransaction } from "./artifactTransaction";

interface CanonicalMarkdownWriterTestHooks {
  failInstalledVerification?: (relativePath: string) => Error | string | undefined;
}

let testHooks: CanonicalMarkdownWriterTestHooks = {};

export function __setCanonicalMarkdownWriterTestHooks(
  hooks: CanonicalMarkdownWriterTestHooks = {},
): void {
  testHooks = hooks;
}

export interface WriteCanonicalMarkdownDocumentInput {
  workspaceRoot: string;
  relativePath: string;
  metadata: CanonicalDocumentMetadata;
  bodyMarkdown: string;
}

export function writeCanonicalMarkdownDocument(
  input: WriteCanonicalMarkdownDocumentInput,
): void {
  writeCanonicalMarkdownDocuments([input]);
}

export function writeCanonicalMarkdownDocuments(
  inputs: WriteCanonicalMarkdownDocumentInput[],
): void {
  if (inputs.length === 0) {
    throw new Error("Canonical document transaction requires at least one document.");
  }
  const workspaceRoot = path.resolve(inputs[0].workspaceRoot);
  const seenRelativePaths = new Set<string>();
  const documents = inputs.map((input) => {
    if (path.resolve(input.workspaceRoot) !== workspaceRoot) {
      throw new Error("Canonical document transaction requires one workspace root.");
    }
    const relativePath = validateMarkdownRelativePath(input.relativePath);
    if (seenRelativePaths.has(relativePath)) {
      throw new Error("Canonical document transaction contains duplicate relative paths.");
    }
    seenRelativePaths.add(relativePath);
    const content = serializeCanonicalMarkdownDocument(input.metadata, input.bodyMarkdown);
    const expectedBody = parseCanonicalMarkdownDocument(content).bodyMarkdown;
    return {
      relativePath,
      metadata: input.metadata,
      content,
      expectedBody,
    };
  });

  writeArtifactTransaction(
    workspaceRoot,
    documents.map((document) => ({
      relativePath: document.relativePath,
      content: document.content,
    })),
    () => {
      for (const document of documents) {
        const injectedError = testHooks.failInstalledVerification?.(document.relativePath);
        if (injectedError) {
          throw injectedError instanceof Error ? injectedError : new Error(injectedError);
        }
        const installed = fs.readFileSync(path.join(workspaceRoot, document.relativePath), "utf8");
        const parsed = parseCanonicalMarkdownDocument(installed);
        if (JSON.stringify(parsed.metadata) !== JSON.stringify(document.metadata)) {
          throw new Error("Installed canonical metadata verification failed.");
        }
        if (parsed.bodyMarkdown !== document.expectedBody) {
          throw new Error("Installed canonical body verification failed.");
        }
      }
    },
  );
}

export function updateCanonicalMarkdownDisposition(input: {
  workspaceRoot: string;
  relativePath: string;
  status: DocumentDispositionStatus;
  notes?: string;
  reviewedAt?: string | null;
}): void {
  const relativePath = validateMarkdownRelativePath(input.relativePath);
  const existing = readCanonical(input.workspaceRoot, relativePath);
  if (input.status === "RevisionRequested" && !(input.notes ?? "").trim()) {
    throw new Error("RevisionRequested disposition requires non-empty review notes.");
  }
  writeCanonicalMarkdownDocument({
    workspaceRoot: input.workspaceRoot,
    relativePath,
    metadata: metadataWithDisposition(
      existing.metadata,
      input.status,
      input.notes ?? existing.metadata.documentDisposition.notes,
      input.reviewedAt ?? new Date().toISOString(),
    ),
    bodyMarkdown: existing.bodyMarkdown,
  });
}

export function updateCanonicalMarkdownSubstantiveRevision(input: {
  workspaceRoot: string;
  relativePath: string;
  bodyMarkdown: string;
  sourceRevisions?: SourceRevision[];
}): void {
  const relativePath = validateMarkdownRelativePath(input.relativePath);
  const existing = readCanonical(input.workspaceRoot, relativePath);
  writeCanonicalMarkdownDocument({
    workspaceRoot: input.workspaceRoot,
    relativePath,
    metadata: metadataWithSubstantiveRevision(existing.metadata, input.sourceRevisions),
    bodyMarkdown: input.bodyMarkdown,
  });
}

function readCanonical(workspaceRoot: string, relativePath: string) {
  return parseCanonicalMarkdownDocument(
    fs.readFileSync(path.join(path.resolve(workspaceRoot), relativePath), "utf8"),
  );
}

function validateMarkdownRelativePath(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  if (
    !normalized.trim() ||
    path.isAbsolute(normalized) ||
    normalized.includes("..") ||
    normalized.includes("\\") ||
    path.extname(normalized).toLowerCase() !== ".md"
  ) {
    throw new Error("Canonical document target must be a repository-relative Markdown path.");
  }
  return normalized;
}
