# WSF20-REPAIR11 Implementer Report

Repair Card: WSF20-REPAIR11; parent WSF20; defect WSF20-D29.

## Repository and scope

Verified the approved `Dev` repository root using `git rev-parse --show-toplevel`; read its AGENTS.md, repository boundary and validation-lane contracts. Branch `dev`, starting HEAD `87299bece2aba79892d7cda257a62b1a2c52bb7e`. Origin is the configured ChampCityChris/ChampCity_AI remote. Before checkpoint, the local tracking comparison was 0 behind / 321 ahead of origin/dev; no network fetch or push was performed. Pre-existing untracked bundle documents were preserved and excluded from staging.

## Result

Implement now exposes model/reasoning controls and one primary **Implement** action for the exact approved WorkItem. The action calls only `startWorkflowWorkItemCodexExecution`; the renderer never prepares an attempt. The existing execution service continues to prepare or recover the durable reservation, materialize source at Run, and use that exact attempt ID as executionRef.

Removed the separate Create Implementer Report shell contract/callback/button, the report-dependent control gate, and the unused Implement-stage full report viewer. Attempt identity/status remain bounded context. The full completed SQL report, Copy/Export and review evidence remain available in Review & Validation through its unchanged owner.

Context and console fill one two-column primary row. Explicit navigation footer spans both columns in an intrinsic row. A synchronous in-flight ref prevents duplicate starts before React rerenders. Read-only, unapproved, stale/error, running and unavailable contexts fail closed; Cancel, environment refresh and approval/input/MCP callbacks remain.

## Files

Modified:

- `src/renderer/app/WorkCardImplementShell.tsx`
- `src/renderer/app/WorkCardImplementWorkspace.tsx`
- `src/renderer/styles.css`
- `test/renderer/work-card-implement-workspace.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/renderer/greenfield-application-viewport.test.cjs`
- `test/fixtures/greenfield-application-viewport/renderer.tsx`
- `test/fixtures/greenfield-application-viewport/electron.cjs`
- `validation/capability-map.json` (replace obsolete separate-create behavior attribution)

Created this report. Deleted no files. Intentionally created no dependencies, schema/migrations, renderer attempt IDs, source materialization on load, or live-project state changes. Application/domain APIs, durable attempt lifecycle, ImplementationRecord/attempt_result linkage, checkpoints, interrupted-run recovery and downstream Tester/Review services were not changed.

## Proof and validation

All commands ran from the approved repository root. Normal Windows executions used the installed toolchain; test data were synthetic/temporary.

| Command | Lane | Result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/wsf20-r11-changes.json --preview` | restricted, read-only planning | Exit 0 after correcting an initially unknown explicit capability name. |
| `npm run test:repair -- --changes tmp/wsf20-r11-changes.json` | restricted | Exit 1: production build could not spawn (`EPERM`); not counted as source failure or pass. |
| Same repair command | normal Windows | Interrupted after prolonged selected-suite stalls; no completed receipt. Only identified runner/test descendants were stopped. |
| `node tmp/wsf20-r11-bounded-validation.cjs` | normal Windows, standard repair planner/executor with `timeoutMs:60000` | Completed receipt status **failed**: production build passed; 84/94 files passed, 1 failed, 9 execution-failed. About 336 seconds. Retained runner handles were stopped after the receipt was written. |
| `npm run validate:static` | normal Windows, final source | Exit 0: final production build and all 11 static tests passed. Existing Vite chunk-size warning only. |
| `node --test test/renderer/work-card-implement-workspace.test.cjs test/renderer/greenfield-shell-composition.test.cjs test/renderer/greenfield-application-viewport.test.cjs test/renderer/work-card-report-review-workspace.test.cjs` | normal Windows, final renderer/geometry | Exit 0: 21/21 tests passed, no skips. |

Repair run ID: `dfb704ac-ff82-4f3c-855d-dcf29c6b73e6`. Final static run ID: `d419f993-9e5d-4d85-bbfb-d887062ebd58`. Temporary receipts/logs/change-set inputs remain ignored under `tmp/`; they are not shipped runtime or governed workflow authority.

The bounded repair plan used the changed renderer/CSS/test/catalog paths and explicitly preserved `renderer-navigation-and-presentation`, `codex-implementation-runtime` and `workflow-application-service`. It did not omit selected files. Required owners passed: Implement renderer 6/6; Codex Implementer execution service 7/7; workflow execution application service 35/35; Greenfield composition/navigation 10/10; downstream report review 4/4. Subsequent final edits removed unused Implement report rendering and corrected geometry fixture assertions; the final build/static and 21 renderer/geometry checks were rerun successfully.

Renderer proof covers missing and existing prepared attempts, direct exact execution calls, double-click/in-flight protection, read-only inspection, mismatched WorkItem, unapproved and stale contexts, running/unavailable state, model locking, Cancel, approval/input/MCP response routing, and ordinary/Repair WorkItems. The renderer preparation API stub throws if invoked. Service proof exercises real durable SQL attempts in both auto-prepare and prepared-reuse cases, one attempt/one thread, exact executionRef on the immutable result, and completed SQL report projection.

Real hidden Electron App geometry checks cover before Run, prepared reservation, running and completed states. Both context and console exceed 400 pixels high, have matching row bounds and separate columns, and end above a footer below 60 pixels high; the workspace fills its available host. No full report/pending-report row appears. Running locks model/reasoning and shows Cancel. Existing Phase Map, resize, Planning inspection, native synthetic interaction and generic-workflow checks remain.

Initial focused diagnostic runs failed on two new assertion mistakes (navigation rail button selected instead of the primary button, and executionRef looked up on WorkItem instead of ImplementationRecord); corrected and rerun. The expanded runtime fixture exposed an obsolete under-10-pixel historical collapse expectation: the actual collapsed browser host was about 129 pixels. The test now compares collapsed versus restored height (less than half), while retaining the restored fill checks. No production browser/runtime behavior changed.

## Broad repair failures and limits

The broad receipt is not green:

- `test/agent-harness/repository-io-hardening.test.cjs`: execution-failed (temporary-resource-cleanup-failed).
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`: execution-failed.
- `test/characterization/desktop-development-lifecycle.test.cjs`: execution-failed.
- `test/phase-planning/phase-planning-service.test.cjs`: execution-failed.
- `test/project-state/current-project-entry.test.cjs`: execution-failed.
- `test/project-state/execution-completion.test.cjs`: failed.
- `test/source-control/managed-project-source.test.cjs`: execution-failed.
- `test/source-control/semantic-checkpoint-service.test.cjs`: execution-failed.
- `test/source-control/workflow-integration-service.test.cjs`: execution-failed.
- `test/work-card-intake/work-card-intake-service.test.cjs`: execution-failed.

`execution-completion` reported 6 failures of 25 tests, including source-neutral deterministic ValidationCatalog requirements. Managed-source/integration output also contains Git preparation or expected-integration failures. Other execution failures exhausted the 60-second per-file bound, with one temporary-resource cleanup failure. These files/production owners were not changed by this repair; no clean-baseline replay was performed, so this report does not assert a verified pre-existing cause. Investigating or fixing them would broaden REPAIR11 scope. The repair receipt remains failed despite all required focused owners passing.

Live Operator acceptance was not performed: no selected live WorkItem was executed and no live attempt was created or replaced. Synthetic proof establishes prepared-ID reuse; actual live-project continuity and visual/experiential acceptance remain for the Operator.

## Git, safety and next step

Checkpoint scope: only the nine attributable modified files above and this report. Required checkpoint message: `WSF20-R11 restore single-action Work Card Implement workspace`. Commit hash pending at report creation; report actual hash after checkpoint without amending solely to insert it here. No push, merge, release, or unrelated Git mutation.

Pre-checkpoint exact staged-diff review and `git diff --cached --check` passed. The bounded added-line credential/private-key and concrete-local-path scan passed; generated-artifact and exact-file-count checks passed for the ten attributable staged files. No credentials, local-machine paths, build output or temporary receipts were staged.

Stop after checkpoint for Operator audit. Reopen canonical Implement for the existing live WorkItem, verify controls and two-column geometry, click Implement and confirm the exact existing prepared attempt is reused, then inspect its completed report in Review & Validation. Separately triage the broad-profile failures before wider qualification; this checkpoint is not release acceptance.
