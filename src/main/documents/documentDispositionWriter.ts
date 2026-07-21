import fs from "node:fs";
import path from "node:path";
import {
  type DocumentDispositionStatus,
  isDocumentDispositionStatus,
} from "../../shared/documents/documentDisposition";

export interface ParsedFileDisposition {
  status?: DocumentDispositionStatus;
  valid: boolean;
  needsInitialization: boolean;
  readError?: string;
}

export interface WritePlan {
  absolutePath: string;
  content: string;
  expectedStatus: DocumentDispositionStatus;
  workspaceRoot?: string;
}

export interface RollbackWriteOptions {
  failAfterWrites?: number;
  failFinalVerification?: boolean;
}

const dispositionHeading = "## Document Disposition";
const markdownStatusPrefix = "Document.Status=";

export function parseMarkdownDisposition(content: string): ParsedFileDisposition {
  const lines = splitMarkdownLines(content);
  const headings = findDispositionHeadingLineIndexes(lines);

  if (headings.length !== 1) {
    return {
      valid: false,
      needsInitialization: true,
    };
  }

  const dispositionSection = lines
    .slice(headings[0])
    .map((line) => line.raw)
    .join("")
    .trimEnd();
  const match = dispositionSection.match(
    /^## Document Disposition(?:\r?\n|\r)+(?:\s*(?:\r?\n|\r))*Document\.Status=([A-Za-z]+)$/,
  );

  if (!match || !isDocumentDispositionStatus(match[1])) {
    return {
      valid: false,
      needsInitialization: true,
    };
  }

  return {
    status: match[1],
    valid: true,
    needsInitialization: false,
  };
}

export function parseJsonDisposition(content: string): ParsedFileDisposition {
  const rootFieldMatches = content.match(/"documentDisposition"\s*:/g) ?? [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return {
      valid: false,
      needsInitialization: true,
      readError: error instanceof Error ? error.message : "Malformed JSON.",
    };
  }

  if (
    rootFieldMatches.length !== 1 ||
    !parsed ||
    typeof parsed !== "object" ||
    !Object.prototype.hasOwnProperty.call(parsed, "documentDisposition")
  ) {
    return {
      valid: false,
      needsInitialization: true,
    };
  }

  const candidate = (parsed as { documentDisposition?: unknown }).documentDisposition;
  if (!candidate || typeof candidate !== "object") {
    return {
      valid: false,
      needsInitialization: true,
    };
  }

  const status = (candidate as { status?: unknown }).status;
  if (!isDocumentDispositionStatus(status)) {
    return {
      valid: false,
      needsInitialization: true,
    };
  }

  return {
    status,
    valid: true,
    needsInitialization: false,
  };
}

export function writeMarkdownDisposition(
  content: string,
  status: DocumentDispositionStatus,
): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = splitMarkdownLines(content);
  const stripped = stripDispositionSyntax(lines);
  const body = stripTrailingLineEndings(stripped);
  const section = `${dispositionHeading}${eol}${eol}${markdownStatusPrefix}${status}${eol}`;

  return body.length > 0 ? `${body}${eol}${eol}${section}` : section;
}

export function writeJsonDisposition(
  content: string,
  status: DocumentDispositionStatus,
): string {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  parsed.documentDisposition = { status };
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

export function assertRegularWritableFile(absolutePath: string, workspaceRoot?: string): void {
  const resolvedPath = path.resolve(absolutePath);
  if (workspaceRoot && !isInside(path.resolve(workspaceRoot), resolvedPath)) {
    throw new Error("Document path escapes selected workspace.");
  }

  const stats = fs.lstatSync(absolutePath);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`Path is not a writable regular file: ${path.basename(absolutePath)}`);
  }
}

export function writePlansWithRollback(
  plans: WritePlan[],
  options: RollbackWriteOptions = {},
): void {
  const originals = new Map<string, Buffer>();
  const stagedPaths: string[] = [];
  const backupPaths: string[] = [];
  let writeCount = 0;

  for (const plan of plans) {
    assertRegularWritableFile(plan.absolutePath, plan.workspaceRoot);
    originals.set(plan.absolutePath, fs.readFileSync(plan.absolutePath));
  }

  for (const plan of plans) {
    verifyDispositionContent(plan.absolutePath, plan.content, plan.expectedStatus);
  }

  try {
    for (const plan of plans) {
      const stagedPath = createSiblingPath(plan.absolutePath, "tmp", stagedPaths.length);
      stagedPaths.push(stagedPath);
      writeStagedFile(stagedPath, plan.content);
      verifyDispositionContent(plan.absolutePath, fs.readFileSync(stagedPath, "utf8"), plan.expectedStatus);
    }

    for (const [index, plan] of plans.entries()) {
      const backupPath = createSiblingPath(plan.absolutePath, "bak", backupPaths.length);
      backupPaths.push(backupPath);
      fs.renameSync(plan.absolutePath, backupPath);
      fs.renameSync(stagedPaths[index], plan.absolutePath);
      writeCount += 1;

      if (
        typeof options.failAfterWrites === "number" &&
        writeCount >= options.failAfterWrites
      ) {
        throw new Error("Injected write failure.");
      }
    }

    if (options.failFinalVerification) {
      throw new Error("Injected final verification failure.");
    }

    for (const plan of plans) {
      verifyDispositionContent(
        plan.absolutePath,
        fs.readFileSync(plan.absolutePath, "utf8"),
        plan.expectedStatus,
      );
    }
  } catch (error) {
    restoreOriginals(originals, backupPaths);
    cleanupFiles([...stagedPaths, ...backupPaths]);
    throw error;
  }

  cleanupFiles([...stagedPaths, ...backupPaths]);
}

interface MarkdownLine {
  raw: string;
  text: string;
}

function splitMarkdownLines(content: string): MarkdownLine[] {
  const matches = content.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) ?? [];
  return matches
    .filter((line, index) => line.length > 0 || index === 0)
    .map((raw) => ({
      raw,
      text: raw.replace(/\r?\n|\r$/, ""),
    }));
}

function stripDispositionSyntax(lines: MarkdownLine[]): string {
  const remove = new Set<number>();
  const fenced = getFenceMap(lines);

  for (let index = 0; index < lines.length; index += 1) {
    if (fenced[index] || lines[index].text !== dispositionHeading) {
      continue;
    }

    remove.add(index);
    let cursor = index + 1;
    while (cursor < lines.length && !fenced[cursor] && isBlankLine(lines[cursor])) {
      remove.add(cursor);
      cursor += 1;
    }

    if (
      cursor < lines.length &&
      !fenced[cursor] &&
      new RegExp(`^${escapeRegExp(markdownStatusPrefix)}[A-Za-z]+$`).test(lines[cursor].text)
    ) {
      remove.add(cursor);
      cursor += 1;
      while (cursor < lines.length && !fenced[cursor] && isBlankLine(lines[cursor])) {
        remove.add(cursor);
        cursor += 1;
      }
    }
  }

  return lines
    .filter((_, index) => !remove.has(index))
    .map((line) => line.raw)
    .join("");
}

function findDispositionHeadingLineIndexes(lines: MarkdownLine[]): number[] {
  const indexes: number[] = [];
  const fenced = getFenceMap(lines);

  lines.forEach((line, index) => {
    if (!fenced[index] && line.text === dispositionHeading) {
      indexes.push(index);
    }
  });

  return indexes;
}

function getFenceMap(lines: MarkdownLine[]): boolean[] {
  const fenced: boolean[] = [];
  let inFence = false;
  let fenceMarker: "`" | "~" | null = null;

  lines.forEach((line, index) => {
    fenced[index] = inFence;
    const trimmed = line.text.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1].startsWith("`") ? "`" : "~";
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (fenceMarker === marker) {
        inFence = false;
        fenceMarker = null;
      }
    }
  });

  return fenced;
}

function isBlankLine(line: MarkdownLine): boolean {
  return line.text.trim().length === 0;
}

function stripTrailingLineEndings(content: string): string {
  return content.replace(/(?:\r\n|\n|\r)+$/, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeStagedFile(stagedPath: string, content: string): void {
  const fd = fs.openSync(stagedPath, "wx");
  try {
    fs.writeFileSync(fd, content, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function verifyDispositionContent(
  absolutePath: string,
  content: string,
  expectedStatus: DocumentDispositionStatus,
): void {
  const extension = path.extname(absolutePath).toLowerCase();
  const parsed =
    extension === ".json"
      ? parseJsonDisposition(content)
      : parseMarkdownDisposition(content);

  if (!parsed.valid || parsed.status !== expectedStatus) {
    throw new Error(`Staged disposition could not be verified: ${path.basename(absolutePath)}`);
  }
}

function createSiblingPath(absolutePath: string, kind: "tmp" | "bak", index: number): string {
  const directory = path.dirname(absolutePath);
  const basename = path.basename(absolutePath);
  return path.join(
    directory,
    `.${basename}.champcity-disposition-${process.pid}-${Date.now()}-${index}.${kind}`,
  );
}

function restoreOriginals(originals: Map<string, Buffer>, backupPaths: string[]): void {
  for (const [absolutePath, originalContent] of originals) {
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
      fs.writeFileSync(absolutePath, originalContent);
    } catch {
      try {
        const backupPath = backupPaths.find((candidate) => candidate.startsWith(
          path.join(path.dirname(absolutePath), `.${path.basename(absolutePath)}.`),
        ));
        if (backupPath && fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, absolutePath);
        }
      } catch {
        // Preserve the original operation failure; cleanup is best effort.
      }
    }
  }
}

function cleanupFiles(absolutePaths: string[]): void {
  for (const absolutePath of absolutePaths) {
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch {
      // Cleanup failures should not mask the original write result.
    }
  }
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}
