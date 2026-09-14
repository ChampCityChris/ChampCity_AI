import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  metadataCloseDelimiter,
  metadataOpenDelimiter,
  parseCanonicalMarkdownDocument,
} from "../../../shared/documents/canonicalMarkdown";
import { replaceCanonicalMarkdownBodyPreservingMetadata } from "../../documents/canonicalMarkdownDocumentWriter";
import { AgentHarnessError } from "../core/errors";
import { resolveRepositoryPath } from "./pathPolicy";

export const MAX_CONTROLLED_MARKDOWN_BODY_BYTES = 500_000;

export interface ControlledMarkdownDraftInspection {
  relativePath: string;
  metadataSha256: string;
  bodySha256: string;
  fileSha256: string;
  bytes: number;
  metadata: ReturnType<typeof parseCanonicalMarkdownDocument>["metadata"];
  bodyMarkdown: string;
}

export interface ReplaceControlledMarkdownBodyInput {
  relativePath: string;
  submissionId: string;
  expectedMetadataSha256: string;
  expectedBodySha256: string;
  bodyMarkdown: string;
}

export interface ReplaceControlledMarkdownBodyResult {
  relativePath: string;
  submissionId: string;
  issueId: string;
  fixCardId: string;
  metadataSha256: string;
  bodySha256: string;
  fileSha256: string;
  bytes: number;
}

export function inspectControlledMarkdownDraft(
  root: string,
  relativePath: string,
): ControlledMarkdownDraftInspection {
  const resolved = requireRegularControlledDraft(root, relativePath);
  const content = fs.readFileSync(resolved.requestedPath, "utf8");
  const { envelope, parsed } = parseControlledDraftContent(content);
  assertControlledDraftMetadata(parsed.metadata, resolved.relativePath);
  return {
    relativePath: resolved.relativePath,
    metadataSha256: sha256(envelope),
    bodySha256: sha256(parsed.bodyMarkdown),
    fileSha256: sha256(content),
    bytes: Buffer.byteLength(content, "utf8"),
    metadata: parsed.metadata,
    bodyMarkdown: parsed.bodyMarkdown,
  };
}

export function replaceControlledMarkdownBody(
  root: string,
  input: ReplaceControlledMarkdownBodyInput,
): ReplaceControlledMarkdownBodyResult {
  const bodyBytes = Buffer.byteLength(input.bodyMarkdown, "utf8");
  if (bodyBytes === 0 || !input.bodyMarkdown.trim()) {
    throw new AgentHarnessError("INVALID_INPUT", "Controlled Markdown draft body must not be empty.");
  }
  if (bodyBytes > MAX_CONTROLLED_MARKDOWN_BODY_BYTES) {
    throw new AgentHarnessError("FILE_DENIED", "Controlled Markdown draft body exceeds the supported write limit.", {
      maximumBytes: MAX_CONTROLLED_MARKDOWN_BODY_BYTES,
      suppliedBytes: bodyBytes,
    });
  }

  const resolved = requireRegularControlledDraft(root, input.relativePath);
  const beforeContent = fs.readFileSync(resolved.requestedPath, "utf8");
  const beforeFileSha256 = sha256(beforeContent);
  const { envelope, parsed } = parseControlledDraftContent(beforeContent);
  assertControlledDraftMetadata(parsed.metadata, resolved.relativePath);
  const submissionId = requiredMetadataString(parsed.metadata.identity.submissionId, "identity.submissionId");
  if (input.submissionId !== submissionId) {
    throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", "Controlled draft submission identity does not match the active write request.", {
      relativePath: resolved.relativePath,
      suppliedSubmissionId: input.submissionId,
    });
  }
  const metadataSha256 = sha256(envelope);
  if (input.expectedMetadataSha256 !== metadataSha256) {
    throw new AgentHarnessError("STALE_SOURCE", "Controlled draft metadata changed after the handoff was prepared.", {
      relativePath: resolved.relativePath,
      expectedMetadataSha256: input.expectedMetadataSha256,
      actualMetadataSha256: metadataSha256,
    });
  }
  const bodySha256 = sha256(parsed.bodyMarkdown);
  if (input.expectedBodySha256 !== bodySha256) {
    throw new AgentHarnessError("STALE_SOURCE", "Controlled draft body changed after the handoff or write request was prepared.", {
      relativePath: resolved.relativePath,
      expectedBodySha256: input.expectedBodySha256,
      actualBodySha256: bodySha256,
    });
  }

  const normalizedBody = `${input.bodyMarkdown.replace(/\r\n?/g, "\n").replace(/\n*$/, "")}\n`;
  if (sha256(fs.readFileSync(resolved.requestedPath, "utf8")) !== beforeFileSha256) {
    throw new AgentHarnessError("STALE_SOURCE", "Controlled draft changed during the body-only write.", {
      relativePath: resolved.relativePath,
    });
  }

  replaceCanonicalMarkdownBodyPreservingMetadata({
    workspaceRoot: root,
    relativePath: resolved.relativePath,
    metadataEnvelope: envelope,
    expectedMetadata: parsed.metadata,
    bodyMarkdown: normalizedBody,
  });

  const installed = inspectControlledMarkdownDraft(root, resolved.relativePath);
  return {
    relativePath: installed.relativePath,
    submissionId,
    issueId: requiredMetadataString(installed.metadata.identity.issueId, "identity.issueId"),
    fixCardId: requiredMetadataString(installed.metadata.identity.fixCardId, "identity.fixCardId"),
    metadataSha256: installed.metadataSha256,
    bodySha256: installed.bodySha256,
    fileSha256: installed.fileSha256,
    bytes: installed.bytes,
  };
}

export function assertGenericMarkdownMutationAllowed(root: string, relativePath: string): void {
  const resolved = resolveRepositoryPath(root, relativePath, { allowMissingLeaf: true });
  if (!fs.existsSync(resolved.resolvedPath)) {
    return;
  }
  const stats = fs.lstatSync(resolved.resolvedPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return;
  }
  const content = fs.readFileSync(resolved.resolvedPath, "utf8");
  const withoutBom = content.startsWith("\uFEFF") ? content.slice(1) : content;
  if (!withoutBom.startsWith(metadataOpenDelimiter)) {
    return;
  }
  let artifactType: unknown;
  try {
    artifactType = parseCanonicalMarkdownDocument(content).metadata.artifactType;
  } catch {
    const closeIndex = withoutBom.indexOf(metadataCloseDelimiter);
    const envelope = closeIndex >= 0 ? withoutBom.slice(0, closeIndex) : withoutBom.slice(0, 16_384);
    artifactType = envelope.match(/"artifactType"\s*:\s*"(fix-card-draft|repair-work-card-draft)"/)?.[1];
  }
  if (artifactType === "fix-card-draft" || artifactType === "repair-work-card-draft") {
    throw new AgentHarnessError(
      "CONTROLLED_DRAFT_DENIED",
      "Application-controlled Fix Card and Repair drafts can be modified only through replace_markdown_body.",
      { relativePath: resolved.relativePath },
    );
  }
}

function requireRegularControlledDraft(root: string, relativePath: string) {
  if (path.extname(relativePath).toLowerCase() !== ".md") {
    throw new AgentHarnessError("INVALID_INPUT", "Controlled draft path must end in .md.");
  }
  const resolved = resolveRepositoryPath(root, relativePath);
  const stats = fs.lstatSync(resolved.requestedPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new AgentHarnessError("FILE_DENIED", "Controlled draft must be an existing regular file.", {
      relativePath: resolved.relativePath,
    });
  }
  const realPath = fs.realpathSync.native(resolved.requestedPath);
  if (realPath !== resolved.resolvedPath) {
    throw new AgentHarnessError("PATH_DENIED", "Controlled draft path does not resolve to the requested repository file.", {
      relativePath: resolved.relativePath,
    });
  }
  return resolved;
}

function parseControlledDraftContent(content: string) {
  const withoutBom = content.startsWith("\uFEFF") ? content.slice(1) : content;
  if (!withoutBom.startsWith(metadataOpenDelimiter)) {
    throw new AgentHarnessError("FILE_DENIED", "Controlled draft metadata envelope is missing.");
  }
  const closeIndex = withoutBom.indexOf(metadataCloseDelimiter);
  if (closeIndex < 0) {
    throw new AgentHarnessError("FILE_DENIED", "Controlled draft metadata envelope is malformed.");
  }
  const envelopeEnd = closeIndex + metadataCloseDelimiter.length;
  const bom = content.startsWith("\uFEFF") ? "\uFEFF" : "";
  const envelope = `${bom}${withoutBom.slice(0, envelopeEnd)}`;
  try {
    return { envelope, parsed: parseCanonicalMarkdownDocument(content) };
  } catch (error) {
    throw new AgentHarnessError(
      "FILE_DENIED",
      `Controlled draft metadata envelope is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function assertControlledDraftMetadata(
  metadata: ControlledMarkdownDraftInspection["metadata"],
  relativePath: string,
): void {
  if (metadata.artifactType !== "fix-card-draft" && metadata.artifactType !== "repair-work-card-draft") {
    throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", "Body-only replacement is limited to application-created Fix Card and Repair drafts.", {
      relativePath,
      artifactType: metadata.artifactType,
    });
  }
  requiredMetadataString(metadata.identity.issueId, "identity.issueId");
  requiredMetadataString(metadata.identity.fixCardId, "identity.fixCardId");
  requiredMetadataString(metadata.identity.candidateId, "identity.candidateId");
  requiredMetadataString(metadata.identity.submissionId, "identity.submissionId");
  if (metadata.workflowData.ownerKind !== "issue") {
    throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", "Controlled Fix Card draft owner identity is invalid.");
  }
  if (metadata.workflowData.draftPath !== relativePath) {
    throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", "Controlled draft metadata path does not match the requested file.", {
      relativePath,
    });
  }
  if (metadata.artifactType === "repair-work-card-draft") {
    for (const field of ["repairId", "parentImplementationId"]) {
      requiredMetadataString(metadata.identity[field], `identity.${field}`);
    }
    for (const field of ["finalRepairTarget", "parentImplementationPath", "validationRecordPath", "boundedDefect"]) {
      requiredMetadataString(metadata.workflowData[field], `workflowData.${field}`);
    }
    if (metadata.documentDisposition.status !== "Pending" || metadata.workflowData.returnTarget !== "review-validation" ||
        [metadata.identity, metadata.workflowData].some((record) =>
          ["phaseId", "workCardId", "parentWorkCardId"].some((field) => field in record))) {
      throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", "Controlled Repair draft disposition or parentage is invalid.");
    }
  } else {
    requiredMetadataString(metadata.workflowData.finalFixCardTarget, "workflowData.finalFixCardTarget");
  }
  requiredMetadataString(metadata.workflowData.implementerReportTarget, "workflowData.implementerReportTarget");
  if (!Number.isInteger(metadata.workflowData.draftRevision) || Number(metadata.workflowData.draftRevision) < 1) {
    throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", "Controlled draft metadata requires a positive draft revision.");
  }
}

function requiredMetadataString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AgentHarnessError("CONTROLLED_DRAFT_DENIED", `Controlled draft metadata requires ${field}.`);
  }
  return value;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
