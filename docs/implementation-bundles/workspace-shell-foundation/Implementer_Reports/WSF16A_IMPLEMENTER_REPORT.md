# WSF16A Implementer Report

Approved Dev repository root and primary dev checkout verified. Origin retained; no fetch, push, release or Main changes. Active Operator-approved Work Card WSF16A executed sequentially under the remaining-boundary audit. Checkpoint hash pending creation.

WSF16A adds the exact SQL Repair read/create-or-recover adapter and bounded IPC/preload ports. Validation, rejected Operator Criterion, failed Tester and WSF15A report-review Decision resolve to the exact Repair, parent, owner, failure Criterion and source mode. Repeated application requests recover the same active identity without creating duplicate lineage; peer identities are rejected. No new entity or schema. Existing duplicate application test was updated to assert authorized idempotent recovery; domain duplicate protection remains. Focused four-source adapter proof passed. Initial composed owner result was 34/35 with only the obsolete duplicate-rejection assertion failing; corrected full owner rerun is recorded below. Current Repair completion honestly resumes parent ready for fresh Implementer/Tester proof. Normal Windows corrected owner command node --test --test-concurrency=1 test/workflow/workflow-execution-application-service.test.cjs exited 0: all 35 passed (20629 ms). Receipt broader failures remain disclosed; source correction postdates that receipt.


## Files

- src/main/workCardRepair/structuredRepairWorkspaceService.ts
- src/main/workflow/workflowApplicationIpc.ts
- src/main/workflow/workflowExecutionApplicationService.ts
- src/preload/index.ts
- src/shared/structuredRepairWorkspaceContracts.ts
- src/shared/workspaceContracts.ts
- test/workflow/workflow-execution-application-service.test.cjs
- validation/capability-map.json

Retained active supplied card and wrote this report. Deleted nothing. Pre-existing untracked bundle inputs preserved. No new dependency, Markdown authority, schema migration, other-family renderer work or generated artifact committed.

## Validation

Normal Windows composed work-item profile: node tmp/wsf-validate.cjs tmp/wsf16a-changes.json tmp/wsf16a-receipt.json; per-file timeout 60000 ms. Exit 1; receipt 277b1ea8-48cc-42f4-8055-2cdf99eab360; status failed; 279692 ms. Build steps: [('production-build', 'passed')].

- test/agent-harness/repository-io-hardening.test.cjs: failed; {'tests': 11, 'pass': 10, 'fail': 1, 'skipped': 0, 'cancelled': 0}
- test/architect-outputs/architect-output-prompt-contracts.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/characterization/desktop-development-lifecycle.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/phase-planning/phase-planning-service.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/project-state/current-project-entry.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/project-state/execution-completion.test.cjs: failed; {'tests': 25, 'pass': 19, 'fail': 6, 'skipped': 0, 'cancelled': 0}
- test/source-control/managed-project-source.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/source-control/workflow-integration-service.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/work-card-intake/work-card-intake-service.test.cjs: execution-failed (timeout); {'tests': None, 'pass': None, 'fail': None, 'skipped': None, 'cancelled': None}
- test/workflow/workflow-execution-application-service.test.cjs: failed; {'tests': 35, 'pass': 34, 'fail': 1, 'skipped': 0, 'cancelled': 0}

Machine receipt retained locally; incomplete/failed proof is not counted as green qualification. Existing wider-suite failures are disclosed rather than fixed outside this card.

Exact staged diff reviewed; bounded secret, concrete-local-path and generated-artifact scan performed before checkpoint. No external integration, Electron launch or Operator visual acceptance claimed. Remaining Operator visual/experiential audit belongs to WSF20; no other workflow-family rebuilding authorized.
