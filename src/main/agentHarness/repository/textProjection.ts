import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import { AgentHarnessError } from "../core/errors";
import { resolveRepositoryPath } from "./pathPolicy";

export const TEXT_INLINE_THRESHOLD_BYTES = 16_384;
const DEFAULT_CHUNK_BYTES = 8_192;
const HARD_CHUNK_BYTES = 16_384;
const DEFAULT_MAX_LINES = 240;
const HARD_MAX_LINES = 1_000;
const MAX_SOURCE_BYTES = 500_000;

export interface TextSource {
  workspaceId: string;
  root: string;
  relativePath: string;
  resolvedPath: string;
  sizeBytes: number;
  modifiedAt: string;
  sourceSha256: string;
  text: string;
  buffer: Buffer;
  lineStarts: number[];
  lineCount: number;
  markdownDetected: boolean;
}

export interface MarkdownHeading {
  sectionId: string;
  level: number;
  text: string;
  startLine: number;
  endLine: number;
}

export interface TextChunk {
  workspaceId: string;
  relativePath: string;
  sourceSha256: string;
  chunkSha256: string;
  range: {
    startLine: number;
    endLine: number;
    startByteOffset: number;
    endByteOffset: number;
  };
  text: string;
  complete: boolean;
  nextCursor: string | null;
  chunkIndex: number;
  staleSource: boolean;
  retryAction: "read_text_chunk" | "read_text_lines" | "read_markdown_section" | null;
}

interface CursorPayload {
  v: 1;
  mode: "full_text" | "line_range" | "markdown_section";
  workspaceId: string;
  relativePath: string;
  sourceSha256: string;
  offset: number;
  hardEndOffset: number;
  chunkIndex: number;
  sectionId?: string;
  expiresAt: number;
}

function sha256(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function cursorKey(root: string): Buffer {
  return createHash("sha256").update("champcity-ai-agent-harness-text-cursor-v1").update(path.resolve(root)).digest();
}

function signCursor(root: string, encoded: string): string {
  return createHmac("sha256", cursorKey(root)).update(encoded).digest("base64url");
}

function createCursor(root: string, payload: Omit<CursorPayload, "v" | "expiresAt">): string {
  const fullPayload = { v: 1 as const, ...payload, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  return `ccai-tp1.${encoded}.${signCursor(root, encoded)}`;
}

function decodeCursor(root: string, cursor: string): CursorPayload {
  const parts = cursor.split(".");
  if (parts.length !== 3 || parts[0] !== "ccai-tp1") {
    throw new AgentHarnessError("INVALID_INPUT", "Text projection cursor is malformed.");
  }
  const expected = Buffer.from(signCursor(root, parts[1]));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AgentHarnessError("INVALID_INPUT", "Text projection cursor failed integrity validation.");
  }
  const parsed = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Partial<CursorPayload>;
  if (
    parsed.v !== 1 ||
    !["full_text", "line_range", "markdown_section"].includes(String(parsed.mode)) ||
    typeof parsed.workspaceId !== "string" ||
    typeof parsed.relativePath !== "string" ||
    typeof parsed.sourceSha256 !== "string" ||
    typeof parsed.offset !== "number" ||
    typeof parsed.hardEndOffset !== "number" ||
    typeof parsed.chunkIndex !== "number" ||
    typeof parsed.expiresAt !== "number"
  ) {
    throw new AgentHarnessError("INVALID_INPUT", "Text projection cursor payload is invalid.");
  }
  if (parsed.expiresAt < Date.now()) {
    throw new AgentHarnessError("INVALID_INPUT", "Text projection cursor expired; inspect the source again.");
  }
  return parsed as CursorPayload;
}

function validateTextBuffer(buffer: Buffer, relativePath: string, maxBytes: number): void {
  if (buffer.length > maxBytes) {
    throw new AgentHarnessError("FILE_DENIED", "File exceeds the configured text read limit.", { relativePath, maxBytes });
  }
  if (buffer.includes(0)) {
    throw new AgentHarnessError("FILE_DENIED", "Binary files are denied for text projection.", { relativePath });
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new AgentHarnessError("FILE_DENIED", "Text projection requires valid UTF-8 input.", { relativePath });
  }
}

function lineStarts(buffer: Buffer): number[] {
  if (buffer.length === 0) {
    return [];
  }
  const starts = [0];
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] === 13 && buffer[index + 1] === 10) {
      starts.push(index + 2);
      index += 1;
    } else if (buffer[index] === 10 || buffer[index] === 13) {
      starts.push(index + 1);
    }
  }
  return starts;
}

function lineForOffset(source: TextSource, offset: number): number {
  if (source.lineStarts.length === 0) {
    return 0;
  }
  let line = 1;
  for (let index = 0; index < source.lineStarts.length; index += 1) {
    if (source.lineStarts[index] <= offset) {
      line = index + 1;
    } else {
      break;
    }
  }
  return line;
}

function chunkEnd(source: TextSource, start: number, hardEnd: number, maximumBytes: number, maximumLines: number): number {
  const byteEnd = Math.min(hardEnd, start + maximumBytes);
  const startLine = lineForOffset(source, start);
  const maxLineEnd = source.lineStarts[Math.min(source.lineStarts.length, startLine - 1 + maximumLines)] ?? hardEnd;
  let end = Math.min(byteEnd, maxLineEnd, hardEnd);
  while (end > start && (source.buffer[end] & 0b1100_0000) === 0b1000_0000) {
    end -= 1;
  }
  return Math.max(start, end);
}

export function loadTextSource(input: {
  workspaceId: string;
  root: string;
  relativePath: string;
  maxBytes?: number;
}): TextSource {
  const resolved = resolveRepositoryPath(input.root, input.relativePath);
  const stats = fs.statSync(resolved.resolvedPath);
  if (!stats.isFile()) {
    throw new AgentHarnessError("FILE_DENIED", "Only regular files can be read.", { relativePath: resolved.relativePath });
  }
  const buffer = fs.readFileSync(resolved.resolvedPath);
  validateTextBuffer(buffer, resolved.relativePath, Math.min(input.maxBytes ?? MAX_SOURCE_BYTES, MAX_SOURCE_BYTES));
  const starts = lineStarts(buffer);
  return {
    workspaceId: input.workspaceId,
    root: resolved.rootRealPath,
    relativePath: resolved.relativePath,
    resolvedPath: resolved.resolvedPath,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    sourceSha256: sha256(buffer),
    text: buffer.toString("utf8"),
    buffer,
    lineStarts: starts,
    lineCount: starts.length,
    markdownDetected: path.extname(resolved.relativePath).toLowerCase() === ".md",
  };
}

export function markdownHeadings(source: TextSource): MarkdownHeading[] {
  if (!source.markdownDetected) {
    return [];
  }
  const headingLines: Array<Omit<MarkdownHeading, "endLine">> = [];
  const lines = source.text.split(/\r\n|\n|\r/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(lines[index]);
    if (match) {
      headingLines.push({
        sectionId: `sec-${source.sourceSha256.slice(0, 16)}-${index + 1}-${match[1].length}`,
        level: match[1].length,
        text: match[2].trim().slice(0, 240),
        startLine: index + 1,
      });
    }
  }
  return headingLines.map((heading, index) => {
    const nextPeer = headingLines.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    return {
      ...heading,
      endLine: nextPeer ? nextPeer.startLine - 1 : Math.max(source.lineCount, heading.startLine),
    };
  });
}

export function inspectTextFile(input: { workspaceId: string; root: string; relativePath: string }): {
  workspaceId: string;
  relativePath: string;
  sizeBytes: number;
  sourceSha256: string;
  lineCount: number;
  markdownDetected: boolean;
  headingIndex: MarkdownHeading[];
  recommendedFirstCursor: string | null;
  contentOmitted: true;
} {
  const source = loadTextSource(input);
  return {
    workspaceId: source.workspaceId,
    relativePath: source.relativePath,
    sizeBytes: source.sizeBytes,
    sourceSha256: source.sourceSha256,
    lineCount: source.lineCount,
    markdownDetected: source.markdownDetected,
    headingIndex: markdownHeadings(source),
    recommendedFirstCursor: source.sizeBytes
      ? createCursor(source.root, {
          mode: "full_text",
          workspaceId: source.workspaceId,
          relativePath: source.relativePath,
          sourceSha256: source.sourceSha256,
          offset: 0,
          hardEndOffset: source.buffer.length,
          chunkIndex: 0,
        })
      : null,
    contentOmitted: true,
  };
}

export function inlineOrInspect(input: { workspaceId: string; root: string; relativePath: string }): unknown {
  const source = loadTextSource(input);
  if (source.sizeBytes <= TEXT_INLINE_THRESHOLD_BYTES) {
    return {
      workspaceId: source.workspaceId,
      relativePath: source.relativePath,
      sizeBytes: source.sizeBytes,
      sourceSha256: source.sourceSha256,
      content: source.text,
      contentComplete: true,
    };
  }
  return inspectTextFile(input);
}

export function readTextChunk(input: {
  workspaceId: string;
  root: string;
  relativePath?: string;
  cursor?: string;
  maximumBytes?: number;
  maximumLines?: number;
  expectedSourceSha256?: string;
}): TextChunk {
  const cursor = input.cursor ? decodeCursor(input.root, input.cursor) : null;
  const relativePath = input.relativePath ?? cursor?.relativePath;
  if (!relativePath) {
    throw new AgentHarnessError("INVALID_INPUT", "relativePath is required for the first text chunk read.");
  }
  const source = loadTextSource({ workspaceId: input.workspaceId, root: input.root, relativePath });
  if (cursor && (cursor.workspaceId !== input.workspaceId || cursor.relativePath !== source.relativePath)) {
    throw new AgentHarnessError("INVALID_INPUT", "Text projection cursor conflicts with the request.");
  }
  if (cursor && cursor.sourceSha256 !== source.sourceSha256) {
    throw new AgentHarnessError("INVALID_INPUT", "Text projection cursor is stale; inspect the source again.");
  }
  const start = cursor?.offset ?? 0;
  const hardEnd = cursor?.hardEndOffset ?? source.buffer.length;
  return buildChunk(source, {
    mode: cursor?.mode ?? "full_text",
    start,
    hardEnd,
    chunkIndex: cursor?.chunkIndex ?? 0,
    sectionId: cursor?.sectionId,
    maximumBytes: input.maximumBytes,
    maximumLines: input.maximumLines,
    expectedSourceSha256: input.expectedSourceSha256,
  });
}

export function readTextLines(input: {
  workspaceId: string;
  root: string;
  relativePath: string;
  startLine: number;
  maximumLines: number;
  maximumBytes?: number;
}): TextChunk {
  const source = loadTextSource(input);
  if (!Number.isInteger(input.startLine) || input.startLine < 1 || input.startLine > source.lineCount) {
    throw new AgentHarnessError("INVALID_INPUT", "startLine is outside the source line range.");
  }
  const start = source.lineStarts[input.startLine - 1] ?? source.buffer.length;
  const hardEnd = source.lineStarts[Math.min(source.lineStarts.length, input.startLine - 1 + input.maximumLines)] ?? source.buffer.length;
  return buildChunk(source, {
    mode: "line_range",
    start,
    hardEnd,
    chunkIndex: 0,
    maximumBytes: input.maximumBytes,
    maximumLines: input.maximumLines,
  });
}

export function readMarkdownSection(input: {
  workspaceId: string;
  root: string;
  relativePath: string;
  sectionId: string;
  maximumBytes?: number;
  maximumLines?: number;
}): TextChunk {
  const source = loadTextSource(input);
  const heading = markdownHeadings(source).find((entry) => entry.sectionId === input.sectionId);
  if (!heading) {
    throw new AgentHarnessError("INVALID_INPUT", "Unknown or stale sectionId; inspect the source again.");
  }
  const start = source.lineStarts[heading.startLine - 1] ?? 0;
  const hardEnd = source.lineStarts[heading.endLine] ?? source.buffer.length;
  return buildChunk(source, {
    mode: "markdown_section",
    start,
    hardEnd,
    chunkIndex: 0,
    sectionId: input.sectionId,
    maximumBytes: input.maximumBytes,
    maximumLines: input.maximumLines,
  });
}

function buildChunk(source: TextSource, input: {
  mode: CursorPayload["mode"];
  start: number;
  hardEnd: number;
  chunkIndex: number;
  sectionId?: string;
  maximumBytes?: number;
  maximumLines?: number;
  expectedSourceSha256?: string;
}): TextChunk {
  const maximumBytes = Math.min(Math.max(1, input.maximumBytes ?? DEFAULT_CHUNK_BYTES), HARD_CHUNK_BYTES);
  const maximumLines = Math.min(Math.max(1, input.maximumLines ?? DEFAULT_MAX_LINES), HARD_MAX_LINES);
  const end = chunkEnd(source, input.start, input.hardEnd, maximumBytes, maximumLines);
  const buffer = source.buffer.subarray(input.start, end);
  const complete = end >= input.hardEnd;
  return {
    workspaceId: source.workspaceId,
    relativePath: source.relativePath,
    sourceSha256: source.sourceSha256,
    chunkSha256: sha256(buffer),
    range: {
      startLine: lineForOffset(source, input.start),
      endLine: lineForOffset(source, Math.max(input.start, end - 1)),
      startByteOffset: input.start,
      endByteOffset: end,
    },
    text: buffer.toString("utf8"),
    complete,
    nextCursor: complete
      ? null
      : createCursor(source.root, {
          mode: input.mode,
          workspaceId: source.workspaceId,
          relativePath: source.relativePath,
          sourceSha256: source.sourceSha256,
          offset: end,
          hardEndOffset: input.hardEnd,
          chunkIndex: input.chunkIndex + 1,
          ...(input.sectionId ? { sectionId: input.sectionId } : {}),
        }),
    chunkIndex: input.chunkIndex,
    staleSource: Boolean(input.expectedSourceSha256 && input.expectedSourceSha256 !== source.sourceSha256),
    retryAction: complete
      ? null
      : input.mode === "line_range"
        ? "read_text_lines"
        : input.mode === "markdown_section"
          ? "read_markdown_section"
          : "read_text_chunk",
  };
}
