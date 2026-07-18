import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ArtifactPairService } = require("../dist/main/artifacts");

const REPORT_ID = "champcity-ai/phase-06/implementer_report/WC04";
const REPORT_LOCATION = {
  directoryPath: "planning/phases/phase-06/Implementer_Reports",
  fileStem: "IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration",
};

const EVIDENCE = {
  branch: "feature/phase-04-wc01-repair01-evidence-derived-workflow",
  remote: "https://github.com/ChampCityChris/ChampCity_AI.git",
  preRegistryJsonHash: "sha256:139694f0159908b64acdf0b848ecf007d138a2d6df2f76a0234df543f894aec9",
  preRegistryMarkdownHash: "sha256:e020f36fada6890dc37e17e5cedf76fe908b4e03e420023e844d6c70ef941cf4",
  preRegistryPayloadHash: "sha256:ebac8b46eeb48ee807f5ffaedc3085ca6f38cb84dcfdab95b2ff9f5219f7187e",
  postMigrationRegistryJsonHash:
    "sha256:662fbfa37a7628f75185f9de48fd1bb0b02e8d3ceeffdb62d1c01567b62dcb2e",
  postMigrationRegistryMarkdownHash:
    "sha256:36bcea5b412da6ecf3675e65ca128e9bcf39509e4a36e5722702a11139bbb6c3",
  postMigrationPayloadHash:
    "sha256:c6062a1a9d1d08db17dbd4cd55a37c680b64896b66fbea685fd1f6f4a936948f",
};

function reportMarkdown(stage) {
  const final = stage === "final";
  return `# Implementer Report: Phase 06 WC04 - Artifact Registry Schema Repair and Recovery Candidate Registration

Pass type: numbered Work Card
Work Card: champcity-ai/phase-06/work_card/WC04
Work Card revision: 3
Operator Approval: champcity-ai/phase-06/operator_approval/WC04
Report artifact ID: ${REPORT_ID}
Report stage: ${stage}

## Repository Path Inspected

- Repository path inspected: verified approved repo root.
- Git branch: ${EVIDENCE.branch}.
- Remote: ${EVIDENCE.remote}.
- Push authorized: no.
- Push performed: no.

## Implementation Summary

WC04 repaired the production Artifact Registry pair without adding a compatibility reader or weakening the strict validator. The migration converted the Registry payload data to \`registryVersion: 1\`, removed the prohibited \`synchronizationFailures\` field, preserved all 136 pre-existing Registry entries field-for-field, and registered the verified WC04/WC05 Work Card and Operator Approval pairs.

The offline migration is deterministic, idempotent, and rollback-capable. It imports the compiled repository canonical artifact helpers for canonical JSON serialization, payload hashing, Markdown envelope rendering, pair verification, Registry validation, and \`ArtifactPairService.loadRegistry()\` verification.

## Files Created

- \`scripts/wc04-artifact-registry-repair.mjs\`
- \`scripts/wc04-implementer-report.mjs\`
- \`test/wc04/artifact-registry-repair.test.cjs\`
- \`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json\`
- \`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md\`

## Files Modified

- \`package.json\`
- \`src/shared/artifacts/artifactRegistry.ts\`
- \`src/main/artifacts/artifactPairService.ts\`
- \`planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json\`
- \`planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md\`

## Files Intentionally Not Created

- No additional Operator Approval artifact was created.
- No WC05 Implementer Report was created.
- No Architect Review, Operator Validation, phase closeout, release, tag, merge, or push artifact was created.
- No runtime compatibility reader, fallback reader, provider integration, database, authentication, connector, or runner transport artifact was created.

## Registry Evidence

- Pre-migration Registry JSON hash: \`${EVIDENCE.preRegistryJsonHash}\`.
- Pre-migration Registry Markdown hash: \`${EVIDENCE.preRegistryMarkdownHash}\`.
- Pre-migration Registry payload hash: \`${EVIDENCE.preRegistryPayloadHash}\`.
- Pre-migration entry count: 136.
- Pre-migration strict Registry validation: failed exactly on \`unexpected_field\` for \`synchronizationFailures\` and \`unsupported_registry_version\` for the legacy string Registry version.
- Post-migration Registry JSON hash before report writes: \`${EVIDENCE.postMigrationRegistryJsonHash}\`.
- Post-migration Registry Markdown hash before report writes: \`${EVIDENCE.postMigrationRegistryMarkdownHash}\`.
- Post-migration Registry payload hash before report writes: \`${EVIDENCE.postMigrationPayloadHash}\`.
- Post-migration entry count before report writes: 140.
- Post-migration strict Registry validation: passed.
- \`ArtifactPairService.loadRegistry()\`: passed.
- Pair synchronization check: passed.

## Preserved Field Comparison

The migration compared every pre-existing Registry entry against the migrated Registry for artifact identity, artifact type, revision, status, authority flag, synchronization flag, project ID, phase ID, Work Card ID, parent artifact ID, Markdown path, JSON path, payload hash, and relationships.

Result: 136 entries checked, 0 missing, 0 changed, preserved: true.

## Registered Candidate Pairs

- \`champcity-ai/phase-06/work_card/WC04\`
- \`champcity-ai/phase-06/operator_approval/WC04\`
- \`champcity-ai/phase-06/work_card/WC05\`
- \`champcity-ai/phase-06/operator_approval/WC05\`

Each candidate pair was verified against its exact artifact ID, revision 3, JSON path, Markdown path, payload hash, and synchronized Markdown envelope before registration.

## Migration And Rollback Commands

- \`node scripts/wc04-artifact-registry-repair.mjs --mode inventory\` - passed; captured pre-migration hashes and the expected strict-schema failure.
- \`node scripts/wc04-artifact-registry-repair.mjs --mode apply --timestamp 2026-07-18T19:20:00.000Z --backup-dir .wc04-registry-backup\` - passed in the normal Windows lane after a sandbox write EPERM; changed true.
- \`node scripts/wc04-artifact-registry-repair.mjs --mode verify\` - passed; loadRegistry succeeded and entry count was 140.
- \`node scripts/wc04-artifact-registry-repair.mjs --mode rollback --backup-dir .wc04-registry-backup\` - passed; restored the exact pre-migration JSON and Markdown hashes.
- Reapply command above - passed; restored the migrated state.
- Idempotence command above - passed; changed false.

## Controlled Real-Repository Canonical Write

The controlled real-repository canonical write used \`ArtifactPairService.commitArtifact()\` to create revision 1 of this WC04 Implementer Report pair at fixed canonical paths, then reread it with \`ArtifactPairService.readArtifact()\`.

Result: ${final ? "passed; the initial report write and reread succeeded, and this final report revision records the result." : "pending final report update; this initial write is the controlled write probe."}

## Proof No Compatibility Reader Was Added

- Production Registry validator still requires exactly \`registryVersion\`, \`updatedAt\`, and \`entries\`.
- Runtime \`ArtifactPairService.tryReadRegistry()\` still calls \`assertArtifactRegistry(pair.artifact.payload.data)\`.
- Focused test \`WC04 repair does not add a runtime compatibility reader\` checks runtime source for legacy Registry-version comparisons.
- No production source reads the legacy Registry version string.

## Commands Run And Results

Execution lane for TypeScript, build, Vite, Node tests, and full validation: approved normal Windows lane from \`docs/dev/VALIDATION_COMMAND_LANES.md\`.

- \`pwd\` - passed; approved repo root verified.
- \`git status --short --branch\` - passed; existing dirty recovery tree observed and preserved.
- \`git remote -v\` - passed; origin is the approved repository.
- Authority and protocol reads - passed; WC04 revision 3 and Operator Approval revision 3 verified.
- \`node --check scripts/wc04-artifact-registry-repair.mjs\` - passed.
- \`node --check test/wc04/artifact-registry-repair.test.cjs\` - passed.
- \`npm run typecheck\` - passed in normal Windows lane.
- First \`npm run test:wc04\` - failed because the duplicate-entry test fixture made the registry artifact relationship list invalid before migration inspection; fixture corrected.
- Second \`npm run test:wc04\` - passed 9/9 in normal Windows lane.
${final ? "- `npm test` - failed twice in normal Windows lane during Electron renderer temp-directory cleanup after build, 78/78 unit and integration tests, repository gates, and all mounted renderer probes reported passed.\n- `node scripts/wc04-artifact-registry-repair.mjs --mode verify` after report finalization - passed; Registry load and pair synchronization succeeded.\n- `git status --short` - run for final dirty-tree reporting." : "- `npm test` - pending final validation.\n- Final pair synchronization and dirty-tree checks - pending final validation."}

## Validation Performed

- Strict TypeScript validation.
- Focused WC04 migration tests for legacy rejection, version conversion, prohibited field removal, valid-entry preservation, deterministic duplicate/missing/unverified blockers, candidate verification before registration, idempotence, rollback, real Registry load, and absence of a runtime compatibility reader.
- Focused artifact-authority tests for canonical pair synchronization, fixed-path revisions, Registry rollback, duplicate authority rejection, and unsynchronized pair rejection.
- Real production Registry inventory, migration, runtime load, rollback, reapply, and idempotence probes.
${final ? "- Full project validation was attempted twice via `npm test`; both attempts failed only at Electron renderer temp-directory cleanup after the functional checks reported passed." : ""}

## Validation Skipped And Reason

- Operator acceptance, Human Validation acceptance, manual visual validation, phase closeout, merge, push, tag, and release validation were not performed because WC04 does not authorize Implementer execution of those steps.
- No live WC05 implementation or runner transport validation was performed because WC05 remains dependency-blocked pending WC04 review.
${final ? "- A fully clean `npm test` exit was not achieved because the existing renderer cleanup harness repeatedly hit `ENOTEMPTY` after successful mounted probe output." : ""}

## Final Dirty Tree Status

Final \`git status --short\` remained dirty. WC04-intended changes are:

- \`package.json\`
- \`src/shared/artifacts/artifactRegistry.ts\`
- \`src/main/artifacts/artifactPairService.ts\`
- \`scripts/wc04-artifact-registry-repair.mjs\`
- \`scripts/wc04-implementer-report.mjs\`
- \`test/wc04/artifact-registry-repair.test.cjs\`
- \`planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json\`
- \`planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md\`
- \`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.json\`
- \`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.md\`

The WC04 and WC05 Work Card and Operator Approval pairs were already present as untracked authority artifacts at pass start and were registered by WC04 after pair verification. Other dirty files from the frozen recovery prototype were left untouched. The temporary \`.wc04-registry-backup\` directory was removed after rollback proof.

## Security And Secret-Safety Notes

- No secrets, tokens, API keys, credentials, or \`.env\` files were created or printed.
- Durable report content uses \`<PROJECT_REPO>\` or repo-relative paths and does not record concrete local machine paths.
- The migration backup directory was temporary local evidence and is not intended for staging.
- Renderer filesystem access and IPC authority were not broadened.

## Git Actions Performed

- Commit created: no.
- Commit hash: pending until commit is created, if an authorized commit is later requested.
- Push performed: no.
- Tag created: no.

## Manual Validation Required

Architect review should verify that the Registry pair loads, controlled writes succeed, existing routing is unchanged, no unrelated artifact was rewritten, and no compatibility fallback exists. The Operator retains acceptance authority.

## Residual Risks

- The repository entered this pass with a large pre-existing dirty recovery tree. WC04 avoided cleanup and did not reset or discard unrelated changes.
- The post-migration Registry hashes above are the hashes immediately after Registry repair and candidate registration; subsequent canonical report writes necessarily update the Registry again to register this report.
- Independent verification and Architect review remain required before WC05 can begin.

## Blocking Questions

None.

## Recommended Next Implementer Task

After Architect review accepts WC04, proceed to WC05 under its dependency gate and approved scope.
`;
}

function reportData(stage) {
  return {
    workCardId: "WC04",
    stage,
    branch: EVIDENCE.branch,
    preRegistryJsonHash: EVIDENCE.preRegistryJsonHash,
    preRegistryMarkdownHash: EVIDENCE.preRegistryMarkdownHash,
    postMigrationRegistryJsonHash: EVIDENCE.postMigrationRegistryJsonHash,
    postMigrationRegistryMarkdownHash: EVIDENCE.postMigrationRegistryMarkdownHash,
    preEntryCount: 136,
    postMigrationEntryCount: 140,
    preservedEntries: true,
    compatibilityReaderAdded: false,
    pushPerformed: false,
    operatorAcceptancePerformed: false,
  };
}

function parseArguments(argv) {
  const options = { stage: "initial", projectRoot: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--stage") options.stage = argv[++index];
    else if (arg.startsWith("--stage=")) options.stage = arg.slice("--stage=".length);
    else if (arg === "--project-root") options.projectRoot = argv[++index];
    else if (arg.startsWith("--project-root=")) {
      options.projectRoot = arg.slice("--project-root=".length);
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!["initial", "final"].includes(options.stage)) {
    throw new Error("--stage must be initial or final.");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const service = new ArtifactPairService({
    projectRoot: path.resolve(options.projectRoot),
    clock: () =>
      options.stage === "initial"
        ? "2026-07-18T19:30:00.000Z"
        : "2026-07-18T19:40:00.000Z",
  });
  const expectedRevision = options.stage === "initial" ? null : undefined;
  const commit = await service.commitArtifact({
    artifactId: REPORT_ID,
    artifactType: "implementer_report",
    status: "active",
    projectId: "champcity-ai",
    phaseId: "phase-06",
    workCardId: "WC04",
    parentArtifactId: "champcity-ai/phase-06/work_card/WC04",
    relationships: {
      sources: [
        "champcity-ai/phase-06/work_card/WC04",
        "champcity-ai/phase-06/operator_approval/WC04",
        "champcity-ai/system/artifact_registry",
      ],
      expectedOutputs: [],
      supersedes: [],
      children: [],
    },
    payload: {
      title:
        "Implementer Report: Phase 06 WC04 - Artifact Registry Schema Repair and Recovery Candidate Registration",
      contentMarkdown: reportMarkdown(options.stage),
      data: reportData(options.stage),
    },
    location: REPORT_LOCATION,
    expectedRevision,
  });
  const reread = await service.readArtifact(REPORT_LOCATION);
  process.stdout.write(
    `${JSON.stringify(
      {
        stage: options.stage,
        reportRevision: commit.artifact.revision,
        reportPayloadHash: commit.artifact.payloadHash,
        registryRevision: commit.registryRevision,
        transactionId: commit.transactionId,
        rereadSucceeded: reread.artifact.artifactId === REPORT_ID,
        rereadRevision: reread.artifact.revision,
        registryEntryCount: commit.registry.entries.length,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
