# EPGA-R04-R03-R06 Implementer Report

## Scope and repository state

- Card: Repair Card `EPGA-R04-R03-R06` — Classify Local State and Remove Regenerable Filesystem State from Conversion Authority.
- Approved repository root: verified as `<PROJECT_REPO>` before changes.
- Branch: `dev`.
- Starting revision: `2827265eedfae3e66fbfebd4a2a1b43e9d6d1395` (the current repository baseline, newer than the card's stated baseline).
- Remote status: local `dev` tracked `origin/dev` and was 206 commits ahead at the start of the pass; no fetch, pull, or push was performed.

## Implementation

Existing Project Git adoption now inventories three semantic classes:

1. `sourcePaths` — tracked current working bytes and non-ignored untracked source;
2. `durableLocalStatePaths` — unknown or sensitive Git-ignored state that must survive conversion but must not enter the baseline;
3. `regenerableStatePaths` — Git-ignored state matching the bounded built-in classifier.

The exact regenerable basename classifier is:

```text
node_modules
dist
build
out
release
coverage
tmp
temp
.cache
.parcel-cache
.vite
.turbo
.next
.pytest_cache
.mypy_cache
.ruff_cache
__pycache__
```

The classifier runs only after `git check-ignore` identifies an entry as ignored. A tracked or non-ignored path remains source even when its basename is in the list. Every unknown ignored entry defaults to durable local state, including environment files and operator-owned directories.

Before destructive Git cutover, durable roots are copied with non-following semantics into the attempt-local `local-state-snapshot/`. The snapshot is verified against the original by a recursive digest covering relative tree membership, entry kind, ordinary file bytes, and link target text. Timestamps are not authority. The snapshot remains separate from canonical source and is retained in journal/receipt recovery paths.

After Main and Dev worktrees and their baseline revisions are verified, only the durable snapshot is copied into Dev and verified with the same digest. Durable state remains ignored and uncommitted. Regenerable state is neither snapshotted nor materialized into Dev.

The former `relocateLocalState` / `restoreRelocatedLocalState` transaction was removed. No raw local-state `fs.renameSync()` is used as a preservation mechanism.

Project-root cleanup is manifest-driven:

- canonical source entries are removed authoritatively with bounded mutation retries;
- verified durable originals are removed after Dev materialization, with any removal failure recorded as non-authoritative residue;
- regenerable originals receive bounded best-effort cleanup, and failure records a cleanup warning without invalidating conversion;
- empty manifest parents are pruned without recursively deleting mixed source/durable/cache trees.

Rollback retains failed managed checkouts, restores conventional Git authority from the verified Repair05 recovery copy, restores canonical source, and restores/verifies durable bytes from `local-state-snapshot/`. Regenerable state is not rollback authority.

## Permanent proof

The existing managed-source owner was extended rather than adding a redundant owner:

- a ChampCity-shaped ignored inventory proves `node_modules`, `release`, and `tmp` are regenerable while `planning`, `work_cards`, `.env.local`, and unknown `operator-scratch` are durable;
- tracked ignored `build/important-source.txt` and non-ignored untracked `build/untracked-source.txt` remain canonical source;
- a Windows injected lock on root `node_modules` proves five bounded cleanup attempts, successful managed conversion, no Dev/baseline dependency copy, completed receipt, and non-authoritative residue reporting;
- a nested `src/app.ts` + ignored `src/local-notes/` + ignored locked `src/.cache/` fixture proves source, durable, and regenerable behavior within one tree;
- a post-materialization authoritative-cleanup failure proves conventional Git restoration, durable root restoration, retained durable snapshot, and retained failed Dev evidence;
- the pre-existing ignored-tree junction proof now also verifies attempt-local durable recovery without following the external target;
- the Current Project watcher proof protects cleanup of empty non-ignored source directories;
- Repair05 forced Windows root-Git retirement and partial-delete exact restore remain passing.

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair04/Repair03/Repair03/Repair06/Reports/EPGA-R04-R03-R06_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `test/source-control/managed-project-source.test.cjs`

Deleted: none.

Intentionally not created or changed: no dependency, schema version, migration sidecar, capability-map entry, Agent Harness/MCP/model behavior, renderer filesystem access, compatibility path, or real ChampCity conversion artifact.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | restricted static diagnostic | PASS, exit 0; run before and after the primary implementation edits. |
| `npm run build` | restricted build diagnostic | INCOMPLETE; TypeScript completed, then Vite/esbuild hit the documented `spawn EPERM`. Not counted as a product failure or pass. |
| `npm run build` | approved normal Windows production build | PASS, exit 0; TypeScript, Vite production bundle (1,666 modules), and branding asset copy completed. Repeated after the empty-source-directory correction and passed. |
| `node --test test/source-control/managed-project-source.test.cjs` | restricted focused diagnostic | INCOMPLETE with `spawn EPERM`; rerun in the normal Windows lane. |
| same managed-source owner | approved normal Windows capability/integration/production-path | First run: 22/23 passed; one new fixture incorrectly attempted an ordinary add after ignoring tracked `build/`. Fixture corrected to force-add the intentionally tracked file. Final run: PASS, exit 0, 23/23 passed. |
| `node --test --test-name-pattern="Git-ignored local state" test/source-control/managed-project-source.test.cjs` | approved normal Windows focused diagnostic | PASS, exit 0, 1/1 passed after fixture correction. |
| `node --test test/project-state/current-project-entry.test.cjs test/source-control/source-topology-path-contracts.test.cjs test/validation/capability-map.test.cjs` | approved normal Windows production-path/boundary/integrity | First run: 31/32 passed and exposed unpruned empty source directories; implementation corrected with non-recursive empty-directory manifest cleanup. Final run: PASS, exit 0, 32/32 passed. |
| `node --test --test-name-pattern="pauses and resumes active evidence watchers" test/project-state/current-project-entry.test.cjs` | approved normal Windows focused diagnostic | PASS, exit 0, 1/1 passed after the cleanup correction. |
| `npm run test:repair -- --changes tmp/epga-r04-r03-r06-changes.json --preview` | restricted repair validation-plan preview | PASS, exit 0; resolved all three changed paths plus explicit `managed-project-source-topology` and `current-project-entry-runtime` capability scope. Preview only; no broad profile execution was run. |
| `git diff --check` and `git diff --cached --check` | repository/staged static safety | PASS, exit 0. |

The broad/full regression suite was not run because the card explicitly requires focused validation only. The real ChampCity_AI conversion was not retried.

## Git, safety, and remaining work

- Git actions before the checkpoint: staged exactly the two implementation/proof files and this report; no reset, restore, clean, stash, fetch, pull, push, rebase, or tag.
- Checkpoint commit: pending at report creation; the actual hash is reported after commit rather than amended into this artifact.
- Secret safety: tests use a synthetic `.env.local` value and production code never logs durable bytes. The exact staged diff was inspected; bounded secret and concrete local-path scans returned no matches, and staged names contain no generated/dependency artifacts.
- Concrete local-machine paths are not persisted in this report; durable paths are repository-relative or use `<PROJECT_REPO>`.
- Remaining Operator/Architect action: review the checkpoint. No manual experiential validation is required for the deterministic filesystem classification behavior.
- Residual risk: a best-effort cleanup warning can leave verified durable duplication or regenerable residue at the Project container root by design; managed Main/Dev and managed metadata remain authoritative.
- Recommended next task: Architect review and acceptance of Repair06, followed only then by a separately authorized real conversion retry.
