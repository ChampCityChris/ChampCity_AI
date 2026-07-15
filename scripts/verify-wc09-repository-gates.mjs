import { execFile } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import {
  isCanonicalArtifact,
  normalizeRepoPath,
  resolveInsideRoot,
  sha256Tagged,
  stableStringify,
  verifyCanonicalPair,
} from "./migration/wc09/canonical-artifact.mjs";

const execFileAsync = promisify(execFile);

const DEFAULT_BASE =
  "feature/phase-03-wc08-repair06-current-action-architect-review-binding";
const REGISTRY_STEM = "planning/system/Artifact_Registry/ARTIFACT_REGISTRY";
const MIGRATION_MANIFEST_STEM =
  "planning/phases/phase-03/Migration_Manifests/MIGRATION_MANIFEST_WC09_cross_process_workflow_authority";
const MIGRATION_MANIFEST_PATHS = new Set([
  `${MIGRATION_MANIFEST_STEM}.json`,
  `${MIGRATION_MANIFEST_STEM}.md`,
]);
const ACTIVE_PLANNING_PREFIXES = [
  "planning/project/",
  "planning/phases/phase-03/",
  "planning/system/",
  "planning/work/",
];
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".drawio",
  ".html",
  ".ini",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".rules",
  ".scss",
  ".sh",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const MAX_REPORTED_FAILURES = 100;
const LIFECYCLE_TYPE_RANK = new Map([
  ["work_card", 0],
  ["implementer_report", 1],
  ["architect_review", 2],
  ["validation_report", 3],
]);

function parseArguments(argv) {
  let base = process.env.WC09_BASE || DEFAULT_BASE;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base") {
      base = argv[index + 1];
      index += 1;
    } else if (argument.startsWith("--base=")) {
      base = argument.slice("--base=".length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }

  if (!base || base.startsWith("-") || /[\r\n\0]/.test(base)) {
    throw new Error("--base must identify a non-option Git revision.");
  }
  return { base };
}

async function runGit(root, args, { allowExitCodes = [] } = {}) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    return { exitCode: 0, stdout };
  } catch (error) {
    const exitCode = typeof error?.code === "number" ? error.code : 1;
    if (allowExitCodes.includes(exitCode)) {
      return { exitCode, stdout: String(error?.stdout ?? "") };
    }
    const message = String(error?.stderr ?? error?.message ?? error).trim();
    throw new Error(`git ${args[0]} failed${message ? `: ${message}` : "."}`);
  }
}

function splitNul(value) {
  return value.split("\0").filter(Boolean).map(normalizeRepoPath);
}

async function existingFile(root, repoPath) {
  try {
    return (await stat(resolveInsideRoot(root, repoPath))).isFile();
  } catch {
    return false;
  }
}

function isTextPath(repoPath) {
  return TEXT_EXTENSIONS.has(path.posix.extname(repoPath).toLowerCase());
}

async function readText(root, repoPath) {
  if (!isTextPath(repoPath)) return null;
  return readFile(resolveInsideRoot(root, repoPath), "utf8");
}

function makeGate(name) {
  return { name, checked: 0, failures: [] };
}

function fail(gate, rule, file, detail) {
  gate.failures.push({
    rule,
    ...(file ? { file: normalizeRepoPath(file) } : {}),
    ...(detail ? { detail } : {}),
  });
}

function finishGate(gate) {
  const failureCount = gate.failures.length;
  return {
    name: gate.name,
    ok: failureCount === 0,
    checked: gate.checked,
    failureCount,
    failures: gate.failures.slice(0, MAX_REPORTED_FAILURES),
    ...(failureCount > MAX_REPORTED_FAILURES
      ? { omittedFailures: failureCount - MAX_REPORTED_FAILURES }
      : {}),
  };
}

async function collectRepositoryFiles(root) {
  const { stdout } = await runGit(root, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]);
  const files = splitNul(stdout);
  const present = [];
  for (const file of files) {
    if (await existingFile(root, file)) present.push(file);
  }
  return [...new Set(present)].sort();
}

async function collectChangedFiles(root, base) {
  await runGit(root, ["rev-parse", "--verify", `${base}^{commit}`]);
  const ancestry = await runGit(root, ["merge-base", "--is-ancestor", base, "HEAD"], {
    allowExitCodes: [1],
  });
  const sources = await Promise.all([
    runGit(root, ["diff", "--name-only", "-z", `${base}...HEAD`, "--"]),
    runGit(root, ["diff", "--name-only", "-z", "--"]),
    runGit(root, ["diff", "--cached", "--name-only", "-z", "--"]),
    runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  return {
    baseIsAncestor: ancestry.exitCode === 0,
    files: [
      ...new Set(sources.flatMap(({ stdout }) => splitNul(stdout))),
    ].sort(),
  };
}

async function canonicalRegistryGate(root) {
  const gate = makeGate("canonical_registry_pairs");
  const registryJsonPath = `${REGISTRY_STEM}.json`;
  const registryMarkdownPath = `${REGISTRY_STEM}.md`;

  try {
    const [json, markdown] = await Promise.all([
      readFile(resolveInsideRoot(root, registryJsonPath), "utf8"),
      readFile(resolveInsideRoot(root, registryMarkdownPath), "utf8"),
    ]);
    const registry = JSON.parse(json);
    gate.checked += 1;
    if (!isCanonicalArtifact(registry)) {
      throw new Error("Registry JSON is not a migration-canonical artifact.");
    }
    verifyCanonicalPair({
      artifact: registry,
      markdown,
      expectedJsonPath: registryJsonPath,
      expectedMarkdownPath: registryMarkdownPath,
    });

    const entries = registry?.payload?.data?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("Registry contains no canonical entries.");
    }
    const seenIds = new Set();
    const authoritativeIds = new Set();
    const jsonPaths = new Set();
    const markdownPaths = new Set();
    const artifactsById = new Map();
    const comparableFields = [
      "artifactId",
      "artifactType",
      "revision",
      "status",
      "projectId",
      "phaseId",
      "workCardId",
      "parentArtifactId",
      "markdownPath",
      "jsonPath",
      "payloadHash",
      "relationships",
    ];

    for (const entry of entries) {
      gate.checked += 1;
      const entryId = String(entry?.artifactId ?? "<missing-artifact-id>");
      if (
        [entryId, entry?.workCardId, entry?.jsonPath, entry?.markdownPath].some((value) =>
          /WC08-REPAIR07/i.test(String(value ?? "")),
        )
      ) {
        fail(gate, "forbidden-wc08-repair07", registryJsonPath, entryId);
      }
      if (seenIds.has(entryId)) {
        fail(gate, "duplicate-registry-entry", registryJsonPath, entryId);
      }
      seenIds.add(entryId);
      if (entry?.authoritative) {
        if (authoritativeIds.has(entryId)) {
          fail(gate, "duplicate-authoritative-entry", registryJsonPath, entryId);
        }
        authoritativeIds.add(entryId);
      }
      const shouldBeAuthoritative = ["active", "pending", "blocked"].includes(entry?.status);
      if (entry?.authoritative !== shouldBeAuthoritative) {
        fail(gate, "registry-authority-status-mismatch", registryJsonPath, entryId);
      }
      if (entry?.synchronized !== true) {
        fail(gate, "registry-entry-not-synchronized", registryJsonPath, entryId);
      }
      for (const [field, values] of [
        ["jsonPath", jsonPaths],
        ["markdownPath", markdownPaths],
      ]) {
        const value = normalizeRepoPath(entry?.[field]);
        if (!value) {
          fail(gate, `registry-${field}-missing`, registryJsonPath, entryId);
        } else if (values.has(value)) {
          fail(gate, `duplicate-registry-${field}`, registryJsonPath, value);
        } else {
          values.add(value);
        }
      }

      try {
        const [artifactJson, artifactMarkdown] = await Promise.all([
          readFile(resolveInsideRoot(root, entry.jsonPath), "utf8"),
          readFile(resolveInsideRoot(root, entry.markdownPath), "utf8"),
        ]);
        const artifact = JSON.parse(artifactJson);
        if (!isCanonicalArtifact(artifact)) {
          throw new Error("Registry target is not a migration-canonical artifact.");
        }
        artifactsById.set(artifact.artifactId, artifact);
        verifyCanonicalPair({
          artifact,
          markdown: artifactMarkdown,
          expectedJsonPath: entry.jsonPath,
          expectedMarkdownPath: entry.markdownPath,
        });
        if (
          artifact.artifactType === "workflow_state" &&
          stableStringify(artifact.payload?.data, 0).includes("/workflow/expected/")
        ) {
          fail(gate, "workflow-placeholder-artifact-id", entry.jsonPath, entryId);
        }
        for (const field of comparableFields) {
          if (stableStringify(entry[field], 0) !== stableStringify(artifact[field], 0)) {
            fail(gate, "registry-pair-metadata-mismatch", entry.jsonPath, `${entryId}:${field}`);
          }
        }
      } catch (error) {
        fail(gate, "canonical-pair-verification", entry?.jsonPath, String(error?.message ?? error));
      }
    }

    const synchronizationFailures = registry?.payload?.data?.synchronizationFailures;
    if (Array.isArray(synchronizationFailures) && synchronizationFailures.length > 0) {
      fail(
        gate,
        "registry-synchronization-failures-present",
        registryJsonPath,
        String(synchronizationFailures.length),
      );
    }
    validateCanonicalRelationshipSemantics(gate, artifactsById);
  } catch (error) {
    fail(gate, "canonical-registry-verification", registryJsonPath, String(error?.message ?? error));
  }
  return finishGate(gate);
}

function validateCanonicalRelationshipSemantics(gate, artifactsById) {
  const byWorkCard = new Map();
  for (const artifact of artifactsById.values()) {
    if (!artifact.workCardId) continue;
    const key = `${artifact.phaseId}:${artifact.workCardId}`;
    const group = byWorkCard.get(key) ?? {};
    group[artifact.artifactType] = artifact;
    byWorkCard.set(key, group);
  }

  for (const artifact of artifactsById.values()) {
    for (const sourceId of artifact.relationships?.sources ?? []) {
      if (sourceId === artifact.artifactId) {
        fail(gate, "relationship-self-cycle", artifact.jsonPath, artifact.artifactId);
        continue;
      }
      const source = artifactsById.get(sourceId);
      if (
        source &&
        source.phaseId === artifact.phaseId &&
        source.workCardId &&
        source.workCardId === artifact.workCardId
      ) {
        const sourceRank = LIFECYCLE_TYPE_RANK.get(source.artifactType);
        const targetRank = LIFECYCLE_TYPE_RANK.get(artifact.artifactType);
        if (sourceRank !== undefined && targetRank !== undefined && sourceRank >= targetRank) {
          fail(
            gate,
            "downstream-same-work-card-source",
            artifact.jsonPath,
            `${artifact.artifactId}<-${source.artifactId}`,
          );
        }
      }
    }
  }

  for (const cycle of findRelationshipCycles(artifactsById)) {
    fail(gate, "relationship-source-cycle", REGISTRY_STEM, cycle.join(" -> "));
  }

  for (const [key, group] of byWorkCard) {
    assertLifecycleEdge(gate, key, group.work_card, group.implementer_report);
    assertLifecycleEdge(gate, key, group.implementer_report, group.architect_review);
    assertLifecycleEdge(gate, key, group.architect_review, group.validation_report);
  }
}

function assertLifecycleEdge(gate, key, source, output) {
  if (!source || !output) return;
  if (!(source.relationships?.expectedOutputs ?? []).includes(output.artifactId)) {
    fail(gate, "lifecycle-expected-output-missing", source.jsonPath, `${key}:${output.artifactId}`);
  }
  if (!(output.relationships?.sources ?? []).includes(source.artifactId)) {
    fail(gate, "lifecycle-source-missing", output.jsonPath, `${key}:${source.artifactId}`);
  }
  if (!(source.relationships?.children ?? []).includes(output.artifactId)) {
    fail(gate, "lifecycle-child-missing", source.jsonPath, `${key}:${output.artifactId}`);
  }
}

function findRelationshipCycles(artifactsById) {
  const cycles = [];
  const state = new Map();
  const stack = [];
  const positions = new Map();
  const visit = (artifact) => {
    state.set(artifact.artifactId, 1);
    positions.set(artifact.artifactId, stack.length);
    stack.push(artifact.artifactId);
    for (const sourceId of artifact.relationships?.sources ?? []) {
      const source = artifactsById.get(sourceId);
      if (!source) continue;
      if ((state.get(sourceId) ?? 0) === 0) {
        visit(source);
      } else if (state.get(sourceId) === 1) {
        cycles.push([...stack.slice(positions.get(sourceId) ?? 0), sourceId]);
      }
    }
    stack.pop();
    positions.delete(artifact.artifactId);
    state.set(artifact.artifactId, 2);
  };
  for (const artifact of artifactsById.values()) {
    if ((state.get(artifact.artifactId) ?? 0) === 0) visit(artifact);
  }
  return cycles;
}

async function migrationManifestDurabilityGate(root) {
  const gate = makeGate("migration_manifest_durability");
  const jsonPath = `${MIGRATION_MANIFEST_STEM}.json`;
  const markdownPath = `${MIGRATION_MANIFEST_STEM}.md`;
  try {
    const artifact = JSON.parse(await readFile(resolveInsideRoot(root, jsonPath), "utf8"));
    verifyCanonicalPair({
      artifact,
      markdown: await readFile(resolveInsideRoot(root, markdownPath), "utf8"),
      expectedJsonPath: jsonPath,
      expectedMarkdownPath: markdownPath,
    });
    const entries = artifact.payload?.data?.entries;
    const archiveOperations = artifact.payload?.data?.archiveOperations;
    gate.checked += 1;
    if (!Array.isArray(entries) || entries.length === 0) {
      fail(gate, "manifest-entries-missing", jsonPath);
      return finishGate(gate);
    }
    if (!Array.isArray(archiveOperations) || archiveOperations.length < 16) {
      fail(
        gate,
        "manifest-archive-operations-incomplete",
        jsonPath,
        String(archiveOperations?.length ?? 0),
      );
      return finishGate(gate);
    }
    const requiredRuleIds = new Set([
      "project-architect-interview-duplicate",
      "wc04-repair01-validation-revision",
      "wc08-repair02-validation-conflict",
      "wc08-repair06-implementer-report-revision",
    ]);
    const representedRuleIds = new Set();
    for (const operation of archiveOperations) {
      gate.checked += 1;
      for (const field of ["ruleId", "sourcePath", "archivePath", "sourceHash", "reason"]) {
        if (typeof operation?.[field] !== "string" || !operation[field]) {
          fail(gate, `manifest-archive-${field}-missing`, jsonPath, operation?.sourcePath);
        }
      }
      representedRuleIds.add(operation.ruleId);
      try {
        const bytes = await readFile(resolveInsideRoot(root, operation.archivePath));
        if (sha256Tagged(bytes) !== operation.sourceHash) {
          fail(gate, "manifest-archive-hash-mismatch", operation.archivePath);
        }
      } catch (error) {
        fail(
          gate,
          "manifest-archive-file-missing",
          operation.archivePath,
          String(error?.message ?? error),
        );
      }
      const represented = entries.some(
        (entry) =>
          entry.originalPath === operation.sourcePath &&
          (entry.archivePath === operation.archivePath ||
            entry.archivePaths?.includes(operation.archivePath)),
      );
      if (!represented) {
        fail(gate, "manifest-archive-entry-missing", jsonPath, operation.sourcePath);
      }
    }
    for (const ruleId of requiredRuleIds) {
      if (!representedRuleIds.has(ruleId)) {
        fail(gate, "manifest-curated-rule-missing", jsonPath, ruleId);
      }
    }
    if (!entries.some((entry) => entry.rename === true)) {
      fail(gate, "manifest-rename-provenance-missing", jsonPath);
    }
    if (!entries.some((entry) => String(entry.provenanceSource ?? "").startsWith("git:"))) {
      fail(gate, "manifest-baseline-provenance-missing", jsonPath);
    }
  } catch (error) {
    fail(gate, "migration-manifest-verification", jsonPath, String(error?.message ?? error));
  }
  return finishGate(gate);
}

function sourceImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /(?:from\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

async function runtimeBoundaryGate(root, repoFiles) {
  const gate = makeGate("runtime_legacy_and_migration_boundary");
  const sourceFiles = repoFiles.filter(
    (file) => file.startsWith("src/") && /\.(?:c|m)?(?:j|t)sx?$/.test(file),
  );
  const forbiddenRuntimePattern =
    /\b(?:allowLegacy|legacy(?:Schema|Parser|Reader|Fallback|Artifact)|parseLegacy|compatibility(?:Schema|Parser|Reader|Fallback)|fallbackLegacy)\w*/i;

  for (const file of sourceFiles) {
    const source = await readText(root, file);
    if (source === null) continue;
    gate.checked += 1;
    if (forbiddenRuntimePattern.test(source)) {
      fail(gate, "runtime-legacy-schema-support", file);
    }
    for (const specifier of sourceImportSpecifiers(source)) {
      const resolved = specifier.startsWith(".")
        ? normalizeRepoPath(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)))
        : normalizeRepoPath(specifier);
      if (
        resolved.startsWith("scripts/migration/") ||
        resolved.includes("/scripts/migration/") ||
        /(?:^|\/)migration\/wc09(?:\/|$)/i.test(resolved)
      ) {
        fail(gate, "src-imports-migration-only-module", file);
      }
      if (/(?:^|\/)(?:legacy|compatibility)[^/]*(?:schema|parser|reader|fallback)/i.test(resolved)) {
        fail(gate, "runtime-imports-legacy-schema", file);
      }
    }
  }
  return finishGate(gate);
}

function isLegacyScanScope(file) {
  return (
    file === "README.md" ||
    file === "AGENTS.md" ||
    file === "planning/phases/README.md" ||
    file.startsWith("src/") ||
    file.startsWith("scripts/") ||
    file.startsWith("test/") ||
    file.startsWith("docs/") ||
    ACTIVE_PLANNING_PREFIXES.some((prefix) => file.startsWith(prefix))
  );
}

function isLegacyAllowlisted(file) {
  return (
    file.startsWith("scripts/migration/") ||
    MIGRATION_MANIFEST_PATHS.has(file) ||
    file.startsWith("planning/archive/wc09/")
  );
}

async function legacyTerminologyGate(root, repoFiles) {
  const gate = makeGate("strict_legacy_role_terms_and_paths");
  // Keep the verifier itself inside the same strict boundary it enforces.
  const legacyRoleStem = ["buil", "der"].join("");
  const implementerStem = ["Imple", "menter"].join("");
  const reportDirectory = `${implementerStem}_Reports`;
  const reportPrefix = `${implementerStem.toUpperCase()}_REPORT`;
  const rules = [
    {
      id: "legacy-role-term",
      pattern: new RegExp(String.raw`\b${legacyRoleStem}(?:s)?\b`, "i"),
    },
    {
      id: "legacy-role-alias",
      pattern: new RegExp(`${legacyRoleStem}(?:Report|Prompt|_(?:REPORT|PROMPT))`, "i"),
    },
    {
      id: "legacy-role-path",
      pattern: new RegExp(`${legacyRoleStem}_(?:Reports|Prompts|REPORT|PROMPT)`, "i"),
    },
    {
      id: "semantic-implementer-is-legacy",
      pattern: new RegExp(
        `(?:\\x60)?${implementerStem}(?:\\x60)?\\s+is\\s+(?:a\\s+)?legacy\\b`,
        "i",
      ),
    },
    {
      id: "semantic-implementer-terminology",
      pattern: new RegExp(
        `(?:\\bno\\s+${implementerStem}\\s+terminology\\b|\\b${implementerStem}\\s+aliases\\b|\\b${implementerStem}(?:-facing\\s+role)?\\s+terminology\\s+aliases\\b)`,
        "i",
      ),
    },
    {
      id: "semantic-legacy-implementer-report",
      pattern: new RegExp(`\\blegacy\\s+${implementerStem}\\s+Reports?\\b`, "i"),
    },
    {
      id: "semantic-legacy-implementer-path",
      pattern: new RegExp(`\\blegacy\\s+${implementerStem}\\s+(?:artifact\\s+names?|paths?)\\b`, "i"),
    },
    {
      id: "semantic-legacy-canonical-report-directory",
      pattern: new RegExp(`\\b(?:legacy|compatibility)\\s+(?:\\x60)?${reportDirectory}(?:\\x60)?`, "i"),
    },
    {
      id: "semantic-implementer-duplication",
      pattern: new RegExp(`\\b${implementerStem}\\s*\\/\\s*${implementerStem}\\b`, "i"),
    },
    {
      id: "semantic-implementer-article",
      pattern: new RegExp(`\\ba\\s+${implementerStem}\\b`),
    },
    {
      id: "semantic-no-op-report-directory-migration",
      pattern: new RegExp(
        `(?:\\x60|\")?${reportDirectory}\\/?(?:\\x60|\")?\\s*(?:\\u2192|->|\\bto\\b)\\s*(?:\\x60|\")?${reportDirectory}\\/?(?:\\x60|\")?`,
      ),
    },
    {
      id: "semantic-no-op-report-prefix-migration",
      pattern: new RegExp(
        `(?:\\x60|\")?${reportPrefix}_?(?:\\.\\.\\.)?(?:\\x60|\")?\\s*(?:\\u2192|->|\\bto\\b)\\s*(?:\\x60|\")?${reportPrefix}_?(?:\\.\\.\\.)?(?:\\x60|\")?`,
      ),
    },
  ];

  for (const file of repoFiles.filter(isLegacyScanScope)) {
    if (isLegacyAllowlisted(file)) continue;
    gate.checked += 1;
    for (const rule of rules) {
      if (rule.pattern.test(file)) fail(gate, rule.id, file);
    }
    const source = await readText(root, file);
    if (source === null) continue;
    for (const rule of rules) {
      if (rule.pattern.test(source)) fail(gate, rule.id, file);
    }
  }
  return finishGate(gate);
}

async function activeArtifactNamingGate(repoFiles) {
  const gate = makeGate("active_artifact_naming");
  const activeFiles = repoFiles.filter(
    (file) =>
      ACTIVE_PLANNING_PREFIXES.some((prefix) => file.startsWith(prefix)) &&
      !file.startsWith("planning/archive/wc09/"),
  );
  for (const file of activeFiles) {
    gate.checked += 1;
    if (/_\d+\.(?:md|json)$/i.test(file)) {
      fail(gate, "active-numbered-revision", file);
    }
    if (/WC08-REPAIR07/i.test(file)) {
      fail(gate, "forbidden-wc08-repair07", file);
    }
  }
  return finishGate(gate);
}

async function secretAssignmentGate(root, files) {
  const gate = makeGate("secret_assignments");
  const value = String.raw`(?:"(?!\s*(?:<|redacted|placeholder|example|dummy|test))[^"\r\n]{8,}"|'(?!\s*(?:<|redacted|placeholder|example|dummy|test))[^'\r\n]{8,}'|[A-Za-z0-9_./+=-]{16,})`;
  const rules = [
    {
      id: "provider-secret-assignment",
      pattern: new RegExp(
        String.raw`\b(?:OPENAI|ANTHROPIC|COHERE|MISTRAL|GROQ|REPLICATE|TOGETHER|GOOGLE|AZURE)[_A-Z0-9]*(?:API[_-]?KEY|TOKEN|SECRET)\b\s*[:=]\s*${value}`,
        "i",
      ),
    },
    {
      id: "generic-secret-assignment",
      pattern: new RegExp(
        String.raw`\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd|private[_-]?key)\b\s*[:=]\s*${value}`,
        "i",
      ),
    },
    {
      id: "private-key-material",
      pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    },
  ];

  for (const file of files) {
    const source = await readText(root, file);
    if (source === null) continue;
    gate.checked += 1;
    for (const rule of rules) {
      if (rule.pattern.test(source)) {
        // Intentionally omit the matching line and value from all output.
        fail(gate, rule.id, file);
      }
    }
  }
  return finishGate(gate);
}

function localPathAllowlisted(file) {
  return (
    file.startsWith("scripts/migration/") ||
    MIGRATION_MANIFEST_PATHS.has(file) ||
    file.startsWith("planning/archive/wc09/")
  );
}

async function concreteLocalPathGate(root, files) {
  const gate = makeGate("concrete_local_paths");
  const rules = [
    {
      id: "windows-user-path",
      pattern: new RegExp(String.raw`\b[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s<>"']+`, "i"),
    },
    {
      id: "posix-user-path",
      pattern: new RegExp(String.raw`(?:^|[\s"'(])/(?:Users|home)/[^/\s<>{}"']+/[^\s<>{}"']+`, "m"),
    },
    {
      id: "unc-local-path",
      pattern: new RegExp(String.raw`(?:^|[\s"'(])\\\\[^\\\s<>"']+\\[^\s<>"']+`, "m"),
    },
  ];

  for (const file of files) {
    if (localPathAllowlisted(file)) continue;
    const source = await readText(root, file);
    if (source === null) continue;
    gate.checked += 1;
    for (const rule of rules) {
      if (rule.pattern.test(source)) fail(gate, rule.id, file);
    }
  }
  return finishGate(gate);
}

async function changedJunkGate(root, changedFiles) {
  const gate = makeGate("changed_or_untracked_generated_junk");
  const rules = [
    { id: "environment-file", pattern: /(?:^|\/)\.env(?:\..+)?$/i },
    { id: "archive-file", pattern: /\.(?:7z|gz|rar|tar|tgz|zip)$/i },
    { id: "build-output", pattern: /(?:^|\/)(?:build|coverage|dist|out|release|test-results|playwright-report|\.nyc_output|\.vite)(?:\/|$)/i },
    { id: "build-output", pattern: /\.(?:map|tsbuildinfo)$/i },
    { id: "screenshot", pattern: /(?:^|\/)(?:screen[-_ ]?shot|screenshot|screen_capture)[^/]*\.(?:gif|jpe?g|png|webp)$/i },
    { id: "generated-junk", pattern: /(?:^|\/)(?:\.DS_Store|Thumbs\.db|desktop\.ini|npm-debug\.log|yarn-error\.log)$/i },
    { id: "generated-junk", pattern: /\.(?:bak|log|orig|rej|swp|swo|temp|tmp)$/i },
  ];

  for (const file of changedFiles) {
    if (!(await existingFile(root, file))) continue;
    gate.checked += 1;
    for (const rule of rules) {
      if (rule.pattern.test(file)) fail(gate, rule.id, file);
    }
  }
  return finishGate(gate);
}

function isProviderSdk(packageName) {
  const exact = new Set([
    "@anthropic-ai/sdk",
    "@azure/openai",
    "@aws-sdk/client-bedrock-runtime",
    "@google/generative-ai",
    "@google/genai",
    "ai",
    "anthropic",
    "cohere-ai",
    "fireworks-ai",
    "groq-sdk",
    "langchain",
    "mistralai",
    "ollama",
    "openai",
    "replicate",
    "together-ai",
  ]);
  return exact.has(packageName) || packageName.startsWith("@ai-sdk/") || packageName.startsWith("@langchain/");
}

async function providerDependencyGate(root, repoFiles) {
  const gate = makeGate("provider_sdk_dependencies");
  const dependencyFields = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];
  for (const file of repoFiles.filter((candidate) => path.posix.basename(candidate) === "package.json")) {
    gate.checked += 1;
    try {
      const manifest = JSON.parse(await readFile(resolveInsideRoot(root, file), "utf8"));
      for (const field of dependencyFields) {
        for (const packageName of Object.keys(manifest?.[field] ?? {})) {
          if (isProviderSdk(packageName)) {
            fail(gate, "provider-sdk-dependency", file, `${field}:${packageName}`);
          }
        }
      }
    } catch (error) {
      fail(gate, "package-manifest-read", file, String(error?.message ?? error));
    }
  }
  return finishGate(gate);
}

function isAllowedWc09Change(file) {
  const exact = new Set([
    "AGENTS.md",
    "README.md",
    "package.json",
  ]);
  if (exact.has(file)) return true;
  return [
    "docs/architecture/",
    "planning/archive/wc09/",
    "planning/phases/phase-03/",
    "planning/project/",
    "planning/system/",
    "planning/work/_template/",
    "scripts/",
    "src/",
    "test/",
  ].some((prefix) => file.startsWith(prefix));
}

function changedFileScopeGate(changed, base) {
  const gate = makeGate("git_changed_file_scope");
  gate.checked = changed.files.length;
  if (!changed.baseIsAncestor) {
    fail(gate, "base-is-not-head-ancestor", undefined, base);
  }
  for (const file of changed.files) {
    if (!isAllowedWc09Change(file)) fail(gate, "outside-wc09-scope", file);
  }
  return finishGate(gate);
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.log(
      JSON.stringify(
        { ok: false, base: null, gates: [], fatalError: String(error?.message ?? error) },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  try {
    const { stdout } = await runGit(process.cwd(), ["rev-parse", "--show-toplevel"]);
    const root = path.resolve(stdout.trim());
    await access(resolveInsideRoot(root, "scripts/migration/wc09/canonical-artifact.mjs"));
    const [repoFiles, changed] = await Promise.all([
      collectRepositoryFiles(root),
      collectChangedFiles(root, options.base),
    ]);
    const changedExisting = [];
    for (const file of changed.files) {
      if (await existingFile(root, file)) changedExisting.push(file);
    }

    const gates = [];
    gates.push(await canonicalRegistryGate(root));
    gates.push(await migrationManifestDurabilityGate(root));
    gates.push(await runtimeBoundaryGate(root, repoFiles));
    gates.push(await legacyTerminologyGate(root, repoFiles));
    gates.push(await activeArtifactNamingGate(repoFiles));
    gates.push(await secretAssignmentGate(root, changedExisting));
    gates.push(await concreteLocalPathGate(root, changedExisting));
    gates.push(await changedJunkGate(root, changed.files));
    gates.push(await providerDependencyGate(root, repoFiles));
    gates.push(changedFileScopeGate(changed, options.base));

    const summary = {
      ok: gates.every((gate) => gate.ok),
      base: options.base,
      changedFiles: changed.files.length,
      gates,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = summary.ok ? 0 : 1;
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          base: options.base,
          gates: [],
          fatalError: String(error?.message ?? error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

await main();
