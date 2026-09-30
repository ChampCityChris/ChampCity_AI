# WTR01D Implementer Report

## Repository and scope

- Verified repository root and branch: approved ChampCity_AI checkout, `dev`.
- Starting SHA: `e323222b6b52fb11431a880a5997e055768e6447` (remote `origin/dev`; branch was 63 commits ahead at start).
- Card: WTR01D — Enforce Workflow Repeatability and Multiplicity.
- Dependencies verified: WTR01C `dbcc1e6fdaa0677b1de1ee650a40c5efe42e1162`; WTR01C Repair01 `bda5a5812310860adb1e2ef599c25ed7271314db`.

## Implementation

- `createWorkflow()` consumes `getWorkflowTypeDefinition()` and checks for any existing same-type Workflow only when registry metadata marks the type non-repeatable. Existing records count regardless of lifecycle state; this is performed inside the creation transaction, so rejected attempts persist neither record nor event.
- All seven repeatable registry types continue to allow unrestricted concurrent instances. Workflow revision rejects a changed `workflowType`; supersession requires its successor to retain the predecessor type.
- Work Intake's internal WIR creation path is unchanged and still creates independent Workflow IDs. The Project Planning façade continues to call `createWorkflow()`, so it inherits the one-time rule.
- No application service, UI, source-control, SourceBaseline, schema, or migration behavior was implemented.

## Files

- Modified: `src/shared/projectState/projectStateService.ts`; `test/project-state/execution-completion.test.cjs`; `test/project-state/work-intake-routing.test.cjs`; `test/project-state/project-workflow-facade.test.cjs`.
- Created: this report.
- Deleted: none. Intentionally not created: additional test files and registry changes.
- Permanent proof: extended existing suites; no permanent test-file count change. Existing tests were modified/extended; none consolidated or retired.

## Evidence and validation

- Repeatability proof loops over all seven registry entries marked repeatable, creates two same-title/same-workspace instances of each in one Project, and checks independent IDs, query results, and current-state visibility.
- Project Creation proof covers one-time enforcement, separate-Project independence, rejection atomicity, and same-type supersession retaining the one-time lineage restriction. Revision and supersession type changes are rejected. Work Intake proof checks two distinct routing IDs. Façade proof checks its second Project Creation plan is rejected.
- `npm run build`: restricted lane returned `spawn EPERM`; rerun in normal Windows lane passed (TypeScript, Vite, branding assets; Vite emitted a large-chunk advisory).
- `node --test test/project-state/execution-completion.test.cjs test/project-state/work-intake-routing.test.cjs test/project-state/project-workflow-facade.test.cjs`: restricted lane returned `spawn EPERM`; normal Windows rerun passed, 16 tests, 0 failed.
- `npm run validate:plan -- --profile work-item --changes tmp/wtr01d-changes.json`: passed preview; exact manifest included the four implementation/test paths and this report. It selected work-item build, fast, affected, and applicable integration proof.
- `npm run test:affected -- --changes tmp/wtr01d-changes.json`: restricted lane build launch returned `spawn EPERM`; normal Windows rerun passed, including its production build; receipt run ID `6cc2db7d-a915-41f4-9c64-18af13f521e1`, failure evidence empty.
- Inherited WTR02 ownership failures: not observed; the affected receipt contained no failures.
- `git diff --check`: passed before staging. Safety scan found no credentials, concrete machine paths, or generated output among durable changed files. Build output is ignored under `dist/` and is not staged.

## Git, safety, and return path

- Git mutations are authorized by the card. Exact card paths are staged for one checkpoint; commit hash will be reported after commit and will remain pending here to avoid amending the commit.
- Secret/local-path/generated-artifact scan: passed; no secret values or concrete local paths are present; generated `dist/` output remains ignored and unstaged.
- Remaining validation or blockers: none identified. No separate Operator manual validation is required by this deterministic domain/service card.
- Next task: stop for Architect review; do not begin WTR02.
