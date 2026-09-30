# WRB04-03C — Test-Only Source Checkpoint

**Depends on:** WRB04-03B committed checkpoint (`b8af636`)
**Implementer:** GPT 6.0 Luna Medium

## Objective

When a TesterResult says permanent test paths changed, create one application-owned Git checkpoint containing exactly those test-owned paths. Advance that TesterResult to the exact candidate source revision only after the checkpoint and SourceBinding revision update are durably verified. No production path may enter the checkpoint.

## Current evidence and architecture

The adopted rule is in `ARCHITECT_BASELINE_2026-09-26.md`, section 6: Tester edits start at the exact Implementer checkpoint; a test-only source checkpoint yields the candidate revision for Validator; production edits by Tester are prohibited. WRB04-03B added `TesterResult` with `checkpointState: pending`, `permanentTestPaths`, exact Workflow/WorkItem/ImplementationRecord identities, and the Implementer revision. The existing `semanticCheckpointService.ts` owns Git staging/commit, receipt verification, and SourceBinding advancement, but currently accepts only implementation/disposition checkpoints and does not enforce a test-owned path boundary. The typed SourceCheckpoint record and generic lifecycle API likewise have no TesterResult transition.

Inspect the 03B implementation and current checkpoint contracts before editing. Reuse the existing managed Workflow checkout and source-line identity; do not add a second Git mechanism or persistence store.

## Scope and decisions

- Add a narrow main-process Tester checkpoint operation keyed by the exact TesterResult. Require an active exact substantive Workflow, its active WorkItem, the result's exact successful ImplementationRecord, the exact ready SourceBinding/managed checkout, and `binding.currentRevisionId === TesterResult.implementerRevisionId` before the first checkpoint attempt.
- Permit only the exact unique `TesterResult.permanentTestPaths` set. Revalidate each path at the checkpoint boundary as repository-relative, normalized, unique, bounded, and inside the repository's current test-owned surfaces. Reject production/source paths, catalog/configuration paths, generated/dependency output, unsafe links, missing/out-of-bound attribution, and any extra changed path. Do not infer or widen the path set from Git status.
- Checkpoint only a result in `pending` state with no candidate revision or prior checkpoint ID. Empty path lists must use 03B's `not-required` state and must not create a commit. A retry with the same durable checkpoint identity may reconcile its exact prior receipt; conflicting or ambiguous evidence returns blocked/inspection-required without inventing a revision.
- Extend the existing structured SourceCheckpoint semantic kind only as narrowly as required to represent a Tester checkpoint targeting the exact TesterResult. Preserve implementation/disposition semantics and records. Persist expected/resulting revisions and receipt evidence using the existing Project State entity/store; no physical migration or sidecar.
- Stage and commit only the exact TesterResult path set using the existing application-owned bounded Git service. Verify a single-parent commit from the Implementer revision whose changed-file set exactly equals that set; then advance SourceBinding and atomically/consistently advance TesterResult to `committed`, with `candidateRevisionId` and `sourceCheckpointId` bound to the verified checkpoint. Failures retain pending/blocked/inspection evidence for safe reconciliation.
- Keep filesystem checkout paths in main-process execution context. Do not let Renderer, Tester, or model code invoke Git or receive unrestricted local paths.

## Required areas

Inspect and modify only the existing checkpoint boundary as needed:

- `src/shared/projectState/domainContracts.ts`, `entityTypeRegistry.ts`, and `projectStateService.ts` for typed checkpoint/result linkage and constrained state transition.
- `src/shared/sourceLifecycleContracts.ts` for a typed Tester checkpoint request/result if needed.
- `src/main/sourceControl/semanticCheckpointService.ts` and, only if needed for composition, `structuredWorkflowCheckpointService.ts` for exact test-only commit mechanics.
- Existing Project State checkpoint/result tests, source checkpoint service tests, and capability-map proof ownership. Extend an existing test boundary where it owns this contract; add a permanent test only for a materially distinct uncovered failure mode and document the gap.

Do not edit permanent tests or catalog content as implementation proof in this card; checkpoint behavior itself is the subject.

## Acceptance

1. A pending TesterResult can checkpoint its exact test-owned path set from the exact Implementer revision and receives a verified candidate revision and SourceCheckpoint identity.
2. Cross-Workflow/result/binding identities, stale base revisions, non-pending or duplicate results, empty/duplicate/unsafe/over-bound paths, production paths, and any extra changed file fail closed without a clean committed result.
3. The checkpoint commit has the exact expected parent and exact changed-file set; SourceBinding advances to that commit, and TesterResult and SourceCheckpoint agree on the same candidate/checkpoint identities.
4. Retry after an uncertain commit reconciles only a commit matching the durable receipt, base revision, exact path set, and semantic identities; otherwise it returns inspection-required and preserves evidence.
5. Existing implementation and disposition checkpoint behavior remains unchanged. Generic record APIs cannot forge the TesterResult checkpoint transition.
6. No database, sidecar, dependency, Renderer Git route, Tester-owned Git command, or production-source change is introduced.

## Non-scope

Tester session/workspace orchestration, editing permanent proof/catalog files, determination changes, Validator execution, Validation creation, Repair, WorkItem completion, Phase/Workflow completion, UI, broad lifecycle review, schema migration, and changes to implementation/disposition checkpoint policy. Do not open WRB04-03D until this card is complete and committed.

## Validation and report

Read `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before runtime changes. Inspect existing checkpoint tests and `validation/capability-map.json` before changing proof. Run build, focused semantic-checkpoint and Project State tests, capability-map integrity, exact-path work-item validation-plan preview and work-item profile, and `git diff --check`. Report exact commands, execution lanes/results, reused/modified/new tests and any specific coverage gap, failure evidence, files changed, security/local-path scan, branch/remote state, and remaining human validation in `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-03C_IMPLEMENTER_REPORT.md`.

Commit this card before opening WRB04-03D. Suggested commit: `WRB04-03C checkpoint Tester test changes`.
