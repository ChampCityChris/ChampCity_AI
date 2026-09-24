# WTR02A Repair01 Implementer Report

## Scope and repository state

- Repository root verified from the approved checkout; durable paths below are repository-relative.
- Card: `WTR02A_REPAIR01_enforce_baseline_lineage_uniqueness.md`.
- Starting SHA: `d2ac17771914c779b104e5ac5c19f147ae5cdf31`.
- Branch: `dev`; starting status was clean and `dev` was ahead of `origin/dev` by 67 commits.
- Production files changed: `src/shared/projectState/projectStateService.ts`.
- Test files modified: `test/project-state/source-semantic-references.test.cjs`.
- Report created: `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02A_REPAIR01_IMPLEMENTER_REPORT.md`.
- No files deleted; no new permanent test file or dependency created.

## Implementation

`createWorkflowSourceBaseline()` now collects the IDs of all Workflow records sharing the requested Workflow’s application-owned `lineageId`. It rejects creation if any existing SourceBaseline references one of those IDs. The error remains `Workflow already has a SourceBaseline.` The test captures a baseline, supersedes its Workflow with a same-type successor, and proves that a second baseline is rejected without persisting a record or state-change/outbox event. It also proves that the historical `baselines_source` edge still points to the original Workflow and that a different lineage can capture its own baseline.

No SourceBinding or later-WTR02 behavior was changed. SourceBaseline body shape, `baselines_source`, Workflow supersession semantics, and source-control behavior remain unchanged.

## Validation

| Command | Lane and result |
| --- | --- |
| `npm run build` | Restricted execution hit `spawn EPERM` in Vite/esbuild. Reran in the normal Windows lane; passed. Vite emitted its existing large-chunk advisory. |
| `node --test test/project-state/source-semantic-references.test.cjs` | Restricted execution hit `spawn EPERM` in Node’s test runner. Reran in the normal Windows lane; passed 8/8 tests (in-memory and SQLite variants). |
| `npm run validate:plan -- --profile work-item --changes tmp/wtr02a-repair01-changes.json` | Passed; exact three changed paths classified. Preview selected static/build, fast, affected-capability and integration proof. |
| `npm run test:affected -- --changes tmp/wtr02a-repair01-changes.json` | Restricted execution hit `spawn EPERM` at the owned production-build step; reran in normal Windows lane and passed (receipt `3f4b54e6-1c11-4212-9481-034907c7f551`, exit 0, source stable, no failure evidence). |
| `git diff --check` | Passed; no whitespace errors. |

## Git and safety

The card authorizes one attributable checkpoint commit after validation. Commit hash: pending (recorded here before commit; actual hash will be reported after commit). The exact staged diff was reviewed and scanned; no secret-like assignments, concrete local paths, or generated/dependency artifacts were found. Only the three card-owned files are staged.

No SourceBinding, SourceCheckpoint, IntegrationRecord, source-control service, Source Graph, Git/MCP/worktree behavior, or WTR02B work was changed. No remaining Operator visual or experiential validation is identified; the scoped proof is deterministic.
