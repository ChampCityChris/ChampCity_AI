#!/usr/bin/env node

import {
  checkHistoricalCorpusInventoryOutputsV1,
  writeHistoricalCorpusInventoryOutputsV1,
} from "../../../dist/main/migrations/index.js";

function usage() {
  console.error("Usage: node scripts/migration/historical-corpus-v1/generate-manifest.mjs --write|--check");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || (args[0] !== "--write" && args[0] !== "--check")) {
    usage();
    process.exitCode = 2;
    return;
  }
  if (args[0] === "--write") {
    const result = await writeHistoricalCorpusInventoryOutputsV1({ repositoryRoot: process.cwd() });
    console.log(JSON.stringify({
      ok: true,
      mode: "write",
      jsonPath: result.jsonPath,
      markdownPath: result.markdownPath,
      jsonSha256: result.jsonSha256,
      markdownSha256: result.markdownSha256,
      changedPaths: result.changedPaths,
      sourceFingerprint: result.manifest.sourceFingerprintBefore,
      totalFiles: result.manifest.counts.totalFiles,
      totalLogicalRecords: result.manifest.counts.totalLogicalRecords,
    }));
    return;
  }
  const result = await checkHistoricalCorpusInventoryOutputsV1({ repositoryRoot: process.cwd() });
  console.log(JSON.stringify({
    ok: result.ok,
    mode: "check",
    jsonPath: result.jsonPath,
    markdownPath: result.markdownPath,
    expectedJsonSha256: result.expectedJsonSha256,
    expectedMarkdownSha256: result.expectedMarkdownSha256,
    actualJsonSha256: result.actualJsonSha256,
    actualMarkdownSha256: result.actualMarkdownSha256,
    sourceFingerprint: result.manifest.sourceFingerprintBefore,
    totalFiles: result.manifest.counts.totalFiles,
    totalLogicalRecords: result.manifest.counts.totalLogicalRecords,
    errorMessages: result.errorMessages,
  }));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
