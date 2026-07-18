# Implementer Handoff — Phase 06 WC04 Artifact Registry Schema Repair

## Recommended Codex Configuration

- Model: strongest available GPT-5.x Codex coding model
- Reasoning: high
- Execution environment: normal Windows repository environment

## Exact Authority

Implementation is authorized by:

- Work Card: `champcity-ai/phase-06/work_card/WC04`
- Work Card revision: 3
- Operator Approval: `champcity-ai/phase-06/operator_approval/WC04`
- Expected Implementer Report: `champcity-ai/phase-06/implementer_report/WC04`

This handoff is not independent authority. Abort if the exact active Work Card and approval pair cannot be verified.

## Repository Verification

Verify:

- Git top-level is the approved ChampCity_AI repository.
- Remote is `ChampCityChris/ChampCity_AI`.
- Branch is `feature/phase-04-wc01-repair01-evidence-derived-workflow` unless later approved authority changes it.
- Read `AGENTS.md`.
- Read `docs/dev/VALIDATION_COMMAND_LANES.md`.
- Read `planning/phases/phase-06/Work_Cards/WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.{json,md}`.
- Read `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.{json,md}`.
- Read the current Registry pair and current Registry schema.

Abort on the wrong repository, remote, branch, Work Card identity, revision, or approval.

## Dirty-Tree Rule

The repository contains the frozen recovery prototype. Do not reset, clean, discard, or overwrite unrelated changes.

WC04 may touch only its authorized Registry-repair surface. Do not begin WC05 cleanup or transport removal in this pass.

## Exact Assignment

Implement WC04 literally.

Primary objective:

Repair the real production Artifact Registry pair so the current `ArtifactRegistry` validator and `ArtifactPairService` can read and write canonical pairs without compatibility readers or weakened validation.

Required sequence:

1. Capture the exact pre-migration Registry JSON and Markdown hashes.
2. Confirm the current failure from `registryVersion` and `synchronizationFailures`.
3. Add a deterministic offline migration using the canonical serializer, hash, Markdown envelope, and Registry validator.
4. Convert Registry payload data to `registryVersion: 1`.
5. Remove the prohibited `synchronizationFailures` field.
6. Preserve every valid entry field and semantic value.
7. Verify the migrated pair is synchronized.
8. Verify `ArtifactPairService.loadRegistry()` succeeds.
9. Register the verified WC04 and WC05 Work Card and Operator Approval pairs.
10. Perform one controlled real-repository canonical artifact write and reread.
11. Prove migration idempotence and rollback.
12. Create the synchronized WC04 Implementer Report pair.

Do not hand-edit payload hashes. Do not add a legacy runtime reader. Do not weaken the validator. Do not create any additional approval artifact.

## Required Evidence

The Implementer Report must include:

- exact pre- and post-migration Registry hashes;
- entry count before and after;
- preserved-field comparison;
- migration and rollback commands;
- exact tests and results;
- real-repository controlled-write result;
- proof that no compatibility reader was added;
- final dirty-tree status.

## Validation

Use the approved normal Windows lane.

Run:

- `npm run typecheck`;
- focused Registry migration tests;
- focused artifact-authority tests;
- `npm test`;
- real Registry load and controlled-write probe;
- pair synchronization check;
- `git status --short`.

Do not perform Operator acceptance. Do not push or merge.

## Required Output

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC04_artifact_registry_schema_repair_and_recovery_candidate_registration.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC04`

## Manual Validation After Codex

Architect review should verify that the Registry pair loads, controlled writes succeed, existing routing is unchanged, no unrelated artifact was rewritten, and no compatibility fallback exists.

## Remaining Passes

After WC04 is independently reviewed and accepted:

- WC05 — Execution Pass and Independent Verification Foundation Recovery.
- Independent Verifier Agent integration.
- Operator Validation Agent execution.
- Runner Transport adapter.
