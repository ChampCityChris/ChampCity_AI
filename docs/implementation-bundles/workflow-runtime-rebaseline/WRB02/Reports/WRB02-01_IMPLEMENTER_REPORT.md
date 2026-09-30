# WRB02-01 Implementer Report

**Card:** WRB02-01 — Establish Workflow Application Service and Exact Instance/Source-Baseline Semantics
**Card type:** Work Card
**Repository verification:** Work completed in the Operator-selected `ChampCity_AI` repository root; the checkout's Git root matched the approved repository.
**Branch and remote:** `dev`, tracking `origin/dev`; ahead by 111 commits before this checkpoint and 112 after it. No push performed.
**Checkpoint:** Pending card-local commit (`WRB02-01 establish Workflow application service`).

## Implementation

- Extended the canonical Workflow registry with entry workspace, direct-start eligibility, Hub order, and exact start labels. Added the reviewed Existing-Project WIR route mapping; `greenfield` and unknown values have no mapping.
- Added an atomic Project State substantive Workflow command. It validates registry-owned workspace metadata, rejects Project Creation and WIR, and creates an optional immutable SourceBaseline plus `unprepared` SourceBinding in the same transaction. The unit-of-work primitive is exposed for the later compound WIR handoff.
- Added bounded application DTOs and a main-process service to list grouped Current Project Workflow instances, open by exact Workflow ID, and directly start repeatable substantive Workflows.
- Source-backed starts resolve the registered Repository and exact managed local `dev` checkout, capture its exact commit, and do not create a SourceLine, branch, worktree, or checkout. Non-source Projects create no source records.
- Inventory includes current active and closed instances, excludes superseded and voided records, and resolves WorkIntake and routing provenance. It fails closed when a WIR or routed source lacks exactly one WorkIntake. Direct and routed summaries retain the same core identity fields.

## Files

**Created:**

- `src/main/workflow/workflowApplicationService.ts`
- `src/shared/workflowApplicationContracts.ts`
- `test/workflow/workflow-application-service.test.cjs`
- This Implementer Report

**Modified:**

- `src/shared/projectState/projectStateService.ts`
- `src/shared/projectState/workflowTypeRegistry.ts`
- `test/project-state/workflow-type-registry.test.cjs`
- `validation/capability-map.json`

**Deleted:** None.

**Intentionally not created or changed:** Workflow Hub UI, renderer/IPC wiring, WIR routing assessment or handoff behavior, planning workspaces, source materialization, legacy Issue/Development retirement, schema changes, and dependencies. These are outside WRB02-01.

## Test disposition and evidence

- **Existing tests extended:** `test/project-state/workflow-type-registry.test.cjs` now checks the exact application-entry metadata and WIR mapping in the existing registry proof.
- **New permanent test added:** `test/workflow/workflow-application-service.test.cjs`. Existing coverage did not prove the new production application boundary across Current Project registration, exact Workflow identity, routed provenance, atomic source records, managed Dev source inspection, and lazy materialization.
- **Tests reused unchanged:** Current Project registration, Project Workflow facade, and existing source semantic suites listed below.
- **Tests consolidated or retired:** None.
- **Evidence:** Same-title Feature instances retain distinct IDs; Feature, Issue, Migration, Research, and WIR records coexist; direct Project Creation/WIR starts are rejected; routed and direct inventory records expose shared core fields; source-backed starts capture the exact managed Dev commit despite an untracked file and create only SourceBaseline/SourceBinding records; failed Dev inspection creates no Workflow; a non-source Project creates no source records; a rejected compound command leaves no partial Workflow.

## Validation

Commands ran from the verified repository root on Windows with Node `v24.18.1`.

| Command | Lane and result |
| --- | --- |
| `npm run build` | Restricted lane exited 1 at Vite/esbuild with the documented `spawn EPERM`; TypeScript completed before that failure. Per `VALIDATION_COMMAND_LANES.md`, rerun once in the normal Windows lane passed (exit 0). The build emitted the existing >500 kB renderer chunk warning. |
| `node --test test/project-state/workflow-type-registry.test.cjs test/workflow/workflow-application-service.test.cjs` | Focused Windows lane passed, 7 tests / 7 passed. The first run exposed a Windows path-separator assertion in the new test; the assertion was normalized and the final run passed. |
| `node --test test/project-state/workflow-type-registry.test.cjs test/workflow/workflow-application-service.test.cjs test/project-state/project-workflow-facade.test.cjs test/project-state/current-project-registration.test.cjs` | Focused Project State and service lane passed, 16 tests / 16 passed (before the final additional atomic rollback assertion; the final focused run above includes that assertion). |
| `node --test test/project-state/workflow-type-registry.test.cjs test/workflow/workflow-application-service.test.cjs test/project-state/current-project-registration.test.cjs test/source-control/workflow-source-materialization.test.cjs` | Diagnostic command exited 1: 15 passed, 4 failed. Three source-materialization scenarios reject the test fixture because it has no registered Current Project; the remaining retry assertion failed in that same legacy fixture suite. The file is outside WRB02-01's implementation path and was not modified. |
| `npm run validate:plan -- --profile work-item --changes tmp/wrb02-01-changes.json` | Planner preview passed after capability/test catalog ordering was corrected. Selected 38 files, static step `production-build`, estimated test duration 49,010 ms. The change-set and preview output were temporary files and are removed before commit. |
| `npm run test:affected -- --changes tmp/wrb02-01-changes.json` | First normal Windows work-item run: build passed and 37 of 38 selected test files passed; `test/project-state/current-project-entry.test.cjs` had one checkout-ID ordering assertion (`main`, `dev` expected; `dev`, `main` observed). After the isolated rerun below, the final profile rerun passed with no failures (38 selected files; total run 36,309 ms, owned build 12,418 ms). Focused Project State source-semantic tests passed in both runs. |
| `node --test test/project-state/current-project-entry.test.cjs` | Isolated diagnostic passed, 10 tests / 10 passed. The first affected-lane ordering mismatch is classified as an intermittent collection-order assertion and is not attributable to WRB02-01 paths; the final affected profile also passed. |
| `node -e "JSON.parse(require('node:fs').readFileSync('validation/capability-map.json','utf8')); console.log('capability map JSON valid')"` | Passed. |
| `git diff --check` | Passed. |

No full/release profile or Electron launch smoke was requested by this bounded card. No external integration evidence is claimed. Routine deterministic criteria leave no remaining Operator manual validation for this card.

## Git and safety

- **Git scope:** The bundle requires an attributable checkpoint commit after each card. This commit is the only planned Git mutation; no push, merge, rebase, reset, clean, restore, or stash is in scope.
- **Commit:** Pending at report creation. Record the resulting hash in the task completion message; do not amend this report-only checkpoint.
- **Security and path review:** The staged diff will be limited to the files above and reviewed for secrets, concrete local paths, generated output, and whitespace before commit. Durable report paths are repository-relative; no credentials or machine-specific paths are stored.

## Remaining issues and next task

- The existing source-materialization diagnostics use a fixture without Current Project registration and have four failures; the adjacent suite owner should update or disposition those fixtures.
- One affected-profile checkout-order assertion failed once, passed in isolation, and passed on the final affected-profile rerun. Keep it as intermittent ordering evidence for its owning capability.
- After the WRB02-01 checkpoint, proceed to WRB02-02 under the released bundle sequence.
