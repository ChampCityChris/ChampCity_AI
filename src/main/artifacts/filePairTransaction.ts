import { randomUUID } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export type PairFailurePoint =
  | "before_stage"
  | "after_json_stage"
  | "after_markdown_stage"
  | "after_stage_verify"
  | "after_backup"
  | "after_json_commit"
  | "after_markdown_commit"
  | "after_final_verify"
  | "before_finalize";

export interface PairFailureContext {
  transactionId: string;
  jsonPath: string;
  markdownPath: string;
}

export type PairFailureInjector = (
  point: PairFailurePoint,
  context: PairFailureContext,
) => void | Promise<void>;

export interface FilePairTransactionOptions {
  projectRoot: string;
  failureInjector?: PairFailureInjector;
  transactionIdFactory?: () => string;
}

export interface WriteVerifiedPairInput {
  jsonPath: string;
  markdownPath: string;
  jsonContent: string;
  markdownContent: string;
  verify: (jsonContent: string, markdownContent: string) => void | Promise<void>;
}

export interface PairCommitHandle {
  transactionId: string;
  jsonPath: string;
  markdownPath: string;
  replacedExistingPair: boolean;
  rollback(): Promise<void>;
  finalize(): Promise<void>;
}

export class ArtifactPartialWriteError extends Error {
  readonly code = "partial_write" as const;

  constructor(
    message: string,
    readonly transactionId: string,
    readonly jsonPath: string,
    readonly markdownPath: string,
    readonly rollbackStatus: "not_required" | "succeeded" | "failed",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArtifactPartialWriteError";
  }
}

/**
 * Same-directory staged pair transaction. Temporary and backup names are never
 * authoritative artifact names and are removed on finalize or rollback.
 */
export class FilePairTransaction {
  readonly projectRoot: string;
  private readonly failureInjector?: PairFailureInjector;
  private readonly transactionIdFactory: () => string;

  constructor(options: FilePairTransactionOptions) {
    if (!path.isAbsolute(options.projectRoot)) {
      throw new TypeError("FilePairTransaction requires an absolute project root.");
    }
    this.projectRoot = path.resolve(options.projectRoot);
    this.failureInjector = options.failureInjector;
    this.transactionIdFactory = options.transactionIdFactory ?? randomUUID;
  }

  async writeVerifiedPair(input: WriteVerifiedPairInput): Promise<PairCommitHandle> {
    const jsonPath = normalizePairPath(input.jsonPath, ".json");
    const markdownPath = normalizePairPath(input.markdownPath, ".md");
    assertMatchingFixedStem(jsonPath, markdownPath);

    const jsonAbsolutePath = this.resolveInsideRoot(jsonPath);
    const markdownAbsolutePath = this.resolveInsideRoot(markdownPath);
    if (path.dirname(jsonAbsolutePath) !== path.dirname(markdownAbsolutePath)) {
      throw new TypeError("Canonical JSON and Markdown files must share one directory.");
    }

    const transactionId = sanitizeTransactionId(this.transactionIdFactory());
    const context: PairFailureContext = { transactionId, jsonPath, markdownPath };
    const directory = path.dirname(jsonAbsolutePath);
    const jsonStagePath = path.join(directory, `.${path.basename(jsonAbsolutePath)}.${transactionId}.stage`);
    const markdownStagePath = path.join(directory, `.${path.basename(markdownAbsolutePath)}.${transactionId}.stage`);
    const jsonBackupPath = path.join(directory, `.${path.basename(jsonAbsolutePath)}.${transactionId}.backup`);
    const markdownBackupPath = path.join(directory, `.${path.basename(markdownAbsolutePath)}.${transactionId}.backup`);
    let existingPair = false;
    let commitStarted = false;

    await mkdir(directory, { recursive: true });
    const jsonExists = await exists(jsonAbsolutePath);
    const markdownExists = await exists(markdownAbsolutePath);
    if (jsonExists !== markdownExists) {
      throw new ArtifactPartialWriteError(
        "The existing canonical artifact is already a partial pair.",
        transactionId,
        jsonPath,
        markdownPath,
        "not_required",
      );
    }
    existingPair = jsonExists;

    try {
      await this.inject("before_stage", context);
      await writeFile(jsonStagePath, input.jsonContent, { encoding: "utf8", flag: "wx" });
      await this.inject("after_json_stage", context);
      await writeFile(markdownStagePath, input.markdownContent, { encoding: "utf8", flag: "wx" });
      await this.inject("after_markdown_stage", context);

      const [stagedJson, stagedMarkdown] = await Promise.all([
        readFile(jsonStagePath, "utf8"),
        readFile(markdownStagePath, "utf8"),
      ]);
      await input.verify(stagedJson, stagedMarkdown);
      await this.inject("after_stage_verify", context);

      if (existingPair) {
        await Promise.all([
          copyFile(jsonAbsolutePath, jsonBackupPath),
          copyFile(markdownAbsolutePath, markdownBackupPath),
        ]);
      }
      await this.inject("after_backup", context);

      commitStarted = true;
      await replaceWithStage(jsonStagePath, jsonAbsolutePath);
      await this.inject("after_json_commit", context);
      await replaceWithStage(markdownStagePath, markdownAbsolutePath);
      await this.inject("after_markdown_commit", context);

      const [committedJson, committedMarkdown] = await Promise.all([
        readFile(jsonAbsolutePath, "utf8"),
        readFile(markdownAbsolutePath, "utf8"),
      ]);
      await input.verify(committedJson, committedMarkdown);
      await this.inject("after_final_verify", context);

      let closed = false;
      const rollback = async (): Promise<void> => {
        if (closed) return;
        closed = true;
        await restorePair(
          existingPair,
          jsonAbsolutePath,
          markdownAbsolutePath,
          jsonBackupPath,
          markdownBackupPath,
        );
        await cleanupPaths([jsonStagePath, markdownStagePath, jsonBackupPath, markdownBackupPath]);
      };
      const finalize = async (): Promise<void> => {
        if (closed) return;
        await this.inject("before_finalize", context);
        closed = true;
        await cleanupPathsBestEffort([
          jsonStagePath,
          markdownStagePath,
          jsonBackupPath,
          markdownBackupPath,
        ]);
      };

      return {
        transactionId,
        jsonPath,
        markdownPath,
        replacedExistingPair: existingPair,
        rollback,
        finalize,
      };
    } catch (error) {
      let rollbackStatus: ArtifactPartialWriteError["rollbackStatus"] = commitStarted
        ? "succeeded"
        : "not_required";
      try {
        if (commitStarted) {
          await restorePair(
            existingPair,
            jsonAbsolutePath,
            markdownAbsolutePath,
            jsonBackupPath,
            markdownBackupPath,
          );
        }
        await cleanupPaths([jsonStagePath, markdownStagePath, jsonBackupPath, markdownBackupPath]);
      } catch (rollbackError) {
        rollbackStatus = "failed";
        throw new ArtifactPartialWriteError(
          `Canonical pair write failed and rollback also failed: ${errorMessage(rollbackError)}`,
          transactionId,
          jsonPath,
          markdownPath,
          rollbackStatus,
          { cause: error },
        );
      }
      throw new ArtifactPartialWriteError(
        `Canonical pair write failed: ${errorMessage(error)}`,
        transactionId,
        jsonPath,
        markdownPath,
        rollbackStatus,
        { cause: error },
      );
    }
  }

  resolveInsideRoot(repoRelativePath: string): string {
    const absoluteTarget = path.resolve(this.projectRoot, repoRelativePath.replaceAll("/", path.sep));
    const relative = path.relative(this.projectRoot, absoluteTarget);
    if (relative === "" || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
      throw new TypeError(`Path must stay inside the injected project root: ${repoRelativePath}`);
    }
    return absoluteTarget;
  }

  private async inject(point: PairFailurePoint, context: PairFailureContext): Promise<void> {
    await this.failureInjector?.(point, context);
  }
}

async function replaceWithStage(stagePath: string, finalPath: string): Promise<void> {
  await rm(finalPath, { force: true });
  await rename(stagePath, finalPath);
}

async function restorePair(
  existingPair: boolean,
  jsonPath: string,
  markdownPath: string,
  jsonBackupPath: string,
  markdownBackupPath: string,
): Promise<void> {
  if (!existingPair) {
    await Promise.all([rm(jsonPath, { force: true }), rm(markdownPath, { force: true })]);
    return;
  }
  if (!(await exists(jsonBackupPath)) || !(await exists(markdownBackupPath))) {
    throw new Error("A required canonical-pair rollback backup is missing.");
  }
  await Promise.all([
    copyFile(jsonBackupPath, jsonPath),
    copyFile(markdownBackupPath, markdownPath),
  ]);
}

async function cleanupPaths(paths: readonly string[]): Promise<void> {
  await Promise.all(paths.map((item) => rm(item, { force: true })));
}

async function cleanupPathsBestEffort(paths: readonly string[]): Promise<void> {
  await Promise.allSettled(paths.map((item) => rm(item, { force: true })));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizePairPath(value: string, extension: ".json" | ".md"): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    throw new TypeError("Canonical artifact paths must be repository-relative.");
  }
  if (normalized.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new TypeError("Canonical artifact paths cannot contain empty, dot, or parent segments.");
  }
  if (!normalized.endsWith(extension)) {
    throw new TypeError(`Canonical artifact path must end in ${extension}.`);
  }
  return normalized;
}

function assertMatchingFixedStem(jsonPath: string, markdownPath: string): void {
  const jsonStem = jsonPath.slice(0, -".json".length);
  const markdownStem = markdownPath.slice(0, -".md".length);
  if (jsonStem !== markdownStem) {
    throw new TypeError("Canonical artifact JSON and Markdown paths must share an exact stem.");
  }
  if (/_\d+$/.test(path.posix.basename(jsonStem))) {
    throw new TypeError("Numbered artifact filename suffixes are not canonical revisions.");
  }
}

function sanitizeTransactionId(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9-]/g, "");
  if (!sanitized) throw new TypeError("Transaction ID factory returned an invalid identifier.");
  return sanitized;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
