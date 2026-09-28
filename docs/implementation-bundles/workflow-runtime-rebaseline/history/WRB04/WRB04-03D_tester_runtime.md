# WRB04-03D — Tester Role Execution and Restricted Test Workspace

**Depends on:** WRB04-03C committed checkpoint (`3476b7f`)
**Implementer:** GPT 6.0 Luna Medium

## Objective

Run one independent Tester assessment for an exact implemented WorkItem through the shared Workflow execution path. Tester reads the exact Implementer checkpoint, may edit only permanent test files in the managed Workflow checkout, and produces the typed TesterResult from 03B. When test files changed, hand that result to the committed 03C checkpoint operation; never let the Tester process write a Git checkpoint.

## Evidence and architecture

The adopted role boundary is in `ARCHITECT_BASELINE_2026-09-26.md`, sections 6–7. The current exact WorkItem Codex path and App Server adapter are in `src/main/workCardBuilding/codexImplementerExecutionService.ts`; its `workflow-work-item` selector derives IDs and checkout context in the main process. `testLifecycleDeterminationService.ts` provides bounded advisory evidence. 03B owns typed TesterResult creation, and 03C owns the managed Git checkpoint. Keep the Tester a distinct actor after the Implementer; it is not an Operator gate.

The current TesterResult contract requires an immutable source revision and 03C requires a ready SourceBinding. The exact execution path transitions a successful WorkItem attempt to `validation_pending` until downstream validation/completion in 03F; Tester must run at this boundary. This card therefore includes two narrow lifecycle alignments: (1) `createTesterResult` may accept an active `validation_pending` WorkItem only when the supplied ImplementationRecord is that WorkItem's latest successful attempt; (2) the shared execution application service exposes a Tester-only read-only contract projection for that `validation_pending` WorkItem. Preserve existing Implementer contract eligibility, the existing `implemented` TesterResult case, and all current identity, ownership, current-source, uniqueness, and checkpoint guards. The Tester projection must not begin or complete a WorkItem attempt. This card supports source-backed Workflows only. For a source-neutral Workflow, return a clear unavailable result before starting App Server; do not fabricate a source revision or silently fall back to the Implementer runtime. A broader source-neutral Tester evidence contract requires an Architect decision outside this card.

## Scope and decisions

- Add a dedicated Tester execution owner/API keyed only by exact `workflowId`, `workItemId`, and the latest successful `implementationRecordId`; derive all paths, revisions, principal identity, and persistence from Project State and the registered Workflow checkout. Renderer input may select model/reasoning but cannot supply source paths, revisions, TesterResult fields, filesystem roots, or Git actions.
- Before starting a session, verify the current substantive Workflow, exact active WorkItem in the current implementation lifecycle (`validation_pending` with a latest successful ImplementationRecord, or legacy/current `implemented`), exact ownership, its committed implementation SourceCheckpoint, and the unique ready SourceBinding at that checkpoint's resulting revision. Require a clean exact managed checkout and reject stale, dirty, redirected, or mismatched context before App Server starts.
- Run the bounded 03A determination against changed paths from that exact implementation checkpoint and supplied current capability-map, obligation, and lifecycle evidence. Give the resulting evidence and exact WorkItem contract to a distinct Tester principal/session. Keep determination advisory and preserve explicit unknowns.
- Use the existing Codex App Server adapter in `workspace-write` mode with network access disabled and `writableRoots` restricted to the managed checkout's `test/` directory. The checkout and Project root stay in main-process state. `.git`, production source, catalog/configuration, and all paths outside `test/` remain outside the writable roots. Do not grant the Tester a Git/checkpoint command or route.
- Attribute only completed App Server `file_change` events and require their unique eligible path set to equal the managed checkout's exact post-run Git change set. Accept only repository-relative `test/...*.test|spec.(c|m)?(js|ts)` paths. Any missing attribution, unsafe path, non-test change, pre-existing dirty state, or out-of-scope file change fails closed, retains bounded session evidence, and creates neither a successful TesterResult nor a checkpoint.
- On successful semantic output, verify exact schema, bounds, recommendation, rationale, determination evidence, and equality between reported permanent test paths and attributed edits. Create one TesterResult with the distinct Tester principal. If no permanent test path changed, retain 03B's `not-required` Implementer revision. If test paths changed, call `checkpointStructuredTesterResult` from 03C and expose its exact committed/blocked/inspection-required result. Do not report success or a candidate revision until Project State confirms the matching result and checkpoint.
- A `production-defect-suspected` recommendation returns the exact result and stops. Repair creation/re-entry remains owned by 03F. Cancellation, tool failure, malformed result, or uncertain checkpoint remains visibly incomplete and cannot create clean validation/completion state.
- Expose bounded main/preload Tester status, start, input/approval response, and cancel operations by exact IDs, reusing the existing execution adapter contracts where safe. Do not add a broad UI redesign or create a second runtime/session manager.

## Required areas

- `src/main/workCardBuilding/` for the dedicated exact Workflow Tester runtime and its attribution/session boundary; reuse `codexImplementerExecutionService.ts` App Server protocol/adapters without widening Implementer authority.
- `src/shared/projectState/projectStateService.ts` only for the narrow 03B lifecycle guard alignment described above; extend `test/project-state/tester-state-mapping.test.cjs` rather than duplicating TesterResult persistence logic.
- `src/main/workflow/workflowExecutionApplicationService.ts` only for the Tester-only read-only exact WorkItem contract projection; extend `test/workflow/workflow-execution-application-service.test.cjs`. Existing Implementer contract eligibility and attempt transitions remain unchanged.
- `src/main/main.ts`, `src/preload/`, and `src/shared/workspaceContracts.ts` only for constrained Tester IPC/preload methods carrying exact IDs and model selection.
- `src/main/validation/testLifecycleDeterminationService.ts`, `src/main/sourceControl/structuredWorkflowCheckpointService.ts`, and Project State services only to call their existing bounded 03A/03B/03C operations; no duplicate determination, result, or Git persistence logic.
- Existing `test/work-card-building/codex-implementer-execution-service.test.cjs`, applicable Workflow/Project State/checkpoint tests, and `validation/capability-map.json`. Reuse/extend established suites when they own the behavior; justify any new permanent test by a specific uncovered role-isolation or write-boundary failure mode.

## Acceptance

1. The Tester starts only for the exact current source-backed Workflow/active WorkItem and latest successful committed implementation revision, including the exact runtime's `validation_pending` state before 03F completion; same-title/different-ID, stale, dirty, and non-source requests fail before App Server.
2. The Tester is a distinct role/session, not an Operator disposition/acceptance gate; it has no network access or Git mutation route, and its writable root is limited to the exact checkout's `test/` directory. Existing bounded App Server tool-approval behavior remains in force.
3. Only fully attributed eligible test-file edits can enter TesterResult. Production/catalog/path escape, incomplete attribution, malformed output, cancellation, and runtime/checkpoint uncertainty never produce a clean TesterResult or candidate revision.
4. No-change results use the Implementer revision and 03B's `not-required` state. Changed-test results complete through 03C and expose the exact candidate revision linked by TesterResult, SourceCheckpoint, and SourceBinding.
5. Determination evidence/unknowns are retained, production-defect recommendations return for later Repair handling, and existing Implementer behavior remains unchanged.
6. `createTesterResult` accepts an active `validation_pending` WorkItem only with its latest successful ImplementationRecord; it does not transition WorkItem state. Existing `implemented` behavior remains covered.
7. The Tester-only contract projection includes the exact accepted WorkItem context at `validation_pending` without making the WorkItem eligible for another Implementer attempt.
8. No Renderer filesystem access, model-supplied identity/path/revision, Tester-owned Git operation, database migration, sidecar, dependency, or broader source-neutral revision scheme is added.

## Non-scope

Independent Validator/Validation record, Repair creation/re-entry, WorkItem/Phase/Workflow completion, permanent test/catalog edits outside the Tester session, source-neutral revision architecture, UI redesign, new Git service, and broad lifecycle audit. Do not open WRB04-03E until this card is complete and committed.

## Validation and report

Read `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before runtime edits. Inspect current exact WorkItem execution tests and capability-map ownership before changing proof. Run build, focused Tester/Implementer no-regression tests, Project State/checkpoint tests, capability-map integrity, exact-path work-item validation-plan preview and work-item profile, and `git diff --check`. Report test reuse/modification/addition and each new-test coverage gap, exact commands/lanes/results, source-neutral unavailability, failure evidence, security/path scan, branch/remote state, remaining manual judgment, and residual risks in `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-03D_IMPLEMENTER_REPORT.md`.

Commit this card before opening WRB04-03E. Suggested commit: `WRB04-03D add restricted Tester execution`.
