import fs from "node:fs";
import path from "node:path";

export interface ArtifactWriteEntry {
  relativePath: string;
  content: string;
}

export interface ArtifactTransactionResult {
  writtenPaths: string[];
  rollbackGuaranteed: boolean;
  rollbackErrors: string[];
}

export function writeArtifactTransaction(
  workspaceRoot: string,
  entries: ArtifactWriteEntry[],
  verifyInstalled?: () => void,
): ArtifactTransactionResult {
  const resolvedRoot = path.resolve(workspaceRoot);
  const absoluteEntries = entries.map((entry) => {
    validateRelativePath(entry.relativePath);
    const absolutePath = path.resolve(resolvedRoot, entry.relativePath);
    if (!isInside(resolvedRoot, absolutePath)) {
      throw new Error("Artifact transaction target escapes selected repository.");
    }
    return { ...entry, absolutePath };
  });

  const duplicate = firstDuplicate(absoluteEntries.map((entry) => entry.absolutePath));
  if (duplicate) {
    throw new Error(`Artifact transaction target is duplicated: ${path.basename(duplicate)}`);
  }

  const originals = new Map<string, Buffer | null>();
  const stagedPaths: string[] = [];
  const backupPaths: string[] = [];
  const rollbackErrors: string[] = [];

  try {
    for (const entry of absoluteEntries) {
      originals.set(
        entry.absolutePath,
        fs.existsSync(entry.absolutePath) ? fs.readFileSync(entry.absolutePath) : null,
      );
    }

    for (const [index, entry] of absoluteEntries.entries()) {
      fs.mkdirSync(path.dirname(entry.absolutePath), { recursive: true });
      const stagedPath = createSiblingPath(entry.absolutePath, "tmp", index);
      stagedPaths.push(stagedPath);
      const fd = fs.openSync(stagedPath, "wx");
      try {
        fs.writeFileSync(fd, entry.content, "utf8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      verifyStagedBytes(stagedPath, entry.content);
    }

    for (const [index, entry] of absoluteEntries.entries()) {
      if (fs.existsSync(entry.absolutePath)) {
        const backupPath = createSiblingPath(entry.absolutePath, "bak", index);
        backupPaths.push(backupPath);
        fs.renameSync(entry.absolutePath, backupPath);
      }
      fs.renameSync(stagedPaths[index], entry.absolutePath);
    }

    for (const entry of absoluteEntries) {
      verifyStagedBytes(entry.absolutePath, entry.content);
    }

    verifyInstalled?.();
  } catch (error) {
    rollbackErrors.push(...restoreOriginals(originals, backupPaths));
    rollbackErrors.push(...cleanupFiles([...stagedPaths, ...backupPaths]));
    throw error;
  }

  rollbackErrors.push(...cleanupFiles([...stagedPaths, ...backupPaths]));
  return {
    writtenPaths: absoluteEntries.map((entry) => entry.relativePath),
    rollbackGuaranteed: rollbackErrors.length === 0,
    rollbackErrors,
  };
}

function validateRelativePath(relativePath: string): void {
  if (
    relativePath.trim().length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("..") ||
    relativePath.includes("\\")
  ) {
    throw new Error("Artifact transaction paths must be repository-relative.");
  }
}

function verifyStagedBytes(absolutePath: string, expectedContent: string): void {
  const actual = fs.readFileSync(absolutePath, "utf8");
  if (actual !== expectedContent) {
    throw new Error(`Artifact transaction verification failed: ${path.basename(absolutePath)}`);
  }
}

function restoreOriginals(originals: Map<string, Buffer | null>, backupPaths: string[]): string[] {
  const errors: string[] = [];
  for (const [absolutePath, original] of originals) {
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }

      const backupPath = backupPaths.find((candidate) =>
        candidate.startsWith(path.join(path.dirname(absolutePath), `.${path.basename(absolutePath)}.`)),
      );
      if (backupPath && fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, absolutePath);
        continue;
      }

      if (original !== null) {
        fs.writeFileSync(absolutePath, original);
      }
    } catch (error) {
      errors.push(
        `Rollback failed for ${path.basename(absolutePath)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return errors;
}

function cleanupFiles(absolutePaths: string[]): string[] {
  const errors: string[] = [];
  for (const absolutePath of absolutePaths) {
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      errors.push(
        `Cleanup failed for ${path.basename(absolutePath)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return errors;
}

function firstDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      return value;
    }
    seen.add(normalized);
  }
  return null;
}

function createSiblingPath(absolutePath: string, kind: "tmp" | "bak", index: number): string {
  return path.join(
    path.dirname(absolutePath),
    `.${path.basename(absolutePath)}.champcity-artifact-${process.pid}-${Date.now()}-${index}.${kind}`,
  );
}

function isInside(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}
