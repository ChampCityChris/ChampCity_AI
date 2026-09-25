# WRB01-02 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Work Card WRB01-02 — Materialize Managed Project/Main/Dev Source Topology.
- Starting checkpoint: `c827a3a`; branch `dev`; remote status: `origin/dev`, 96 commits ahead.
- Working tree was clean after WRB01-01.

## Implementation

Added an application-owned service that adopts conventional Git Projects into a non-Git Project container with bare common metadata at `.champcity/repository.git` and sibling Main/Dev linked checkouts. It preserves existing refs, remotes, and working file bytes by copying Git metadata and moving the existing Project source entries into a no-checkout Main worktree. The exact adoption rule requires already-existing `main` and `dev` refs; no new branch history is inferred. Dirty tracked and untracked content moves with the original files into Main. `.champcity` Project State remains in the container.

Adoption fails before mutation for managed-path collisions, missing branch refs, additional linked worktrees, submodules, external object alternates, active Git metadata locks, and unsafe redirects. The service verifies the resulting common Git directory and exact Main/Dev roots, confirms refs and remotes are unchanged, then registers deterministic Main/Dev RepositoryCheckout descriptors through the WRB02D Agent Harness application API. Reopening an already managed Project validates and re-registers idempotently. It does not create a Workflow checkout.

## Files changed

- Created `src/main/sourceControl/managedProjectSourceService.ts`.
- Created `test/source-control/managed-project-source.test.cjs` (four scenarios).
- Modified `validation/capability-map.json` to add the managed-topology proof and repair one pre-existing missing capability identity in the Phase Close proof map; the omission prevented the required planner from validating the map.
- Created this report.
- Deleted: none.
- Tests reused unchanged: existing Agent Harness and topology contract tests were not changed.
- Tests modified or extended: none.
- New permanent tests: four scenarios cover conventional adoption with history/remotes/dirty/untracked preservation, exact registered Main/Dev roots, managed reopen, absent refs, path conflicts, and a Windows junction redirect. Existing tests did not prove physical topology adoption; the new test is the required capability gap.
- Intentionally not created: Greenfield baseline commit or `.gitignore` policy, new branch refs, Workflow checkout creation, Project-entry wiring, or source lifecycle migration; later WRB01 cards own those behaviors.

## Validation

- `npm run build` — one initial attempt failed TypeScript due internal input-name mismatches; corrected, then normal Windows build passed with the existing Vite chunk-size advisory.
- `node --test test/source-control/managed-project-source.test.cjs` — normal Windows lane, 4 passed, 0 failed, 0 skipped. Git emitted expected LF-to-CRLF notices in temporary fixture files.
- `node --test test/validation/capability-map.test.cjs` — normal Windows lane, 5 passed, 0 failed after correcting the pre-existing missing Phase Close capability identity.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` — normal Windows lane, passed for the exact final changed-path manifest.
- `npm run test:affected -- --changes tmp/changes.json` — normal Windows lane, exit 1 after 256,114 ms. The owned production build passed; selected Agent Harness/registry proof passed; the only failure evidence was `test/source-control/source-lifecycle-package.test.cjs`, whose legacy Work Intake source-preparation assertion expected `ready` and received `unprepared`. This test exercises the deferred Work Intake-owned source lifecycle, outside WRB01-02's Project topology service. Preserve the failure for WRB01-05/current Work Intake retirement review; no old behavior was restored for it.
- `git diff --check` — pending checkpoint review.
- Initial focused attempts exposed and corrected an adoption move-set self-collision and Windows path-separator assertion; no fixture source was lost.
- Skipped: broad historical full suite, Electron launch, and external integrations; not required by this card.

## Git, safety, and remaining review

- Git actions: one WRB01-02 checkpoint commit is required; hash will be reported after the commit.
- Security/local-path safety: no credentials, concrete local-machine paths, or source contents were added to durable files. The service copies `.git` metadata only after preflight, rejects symbolic redirects and unsafe repository mechanics, and retains the original metadata for rollback until exact topology verification succeeds. Generated `dist/` output and `tmp/changes.json` are excluded from the checkpoint.
- Remaining Operator manual validation: none for these deterministic source-topology criteria.
- Residual risk: repositories with submodules, external object alternates, missing `main`/`dev`, active worktrees, active locks, or any collision are deliberately rejected for separate safe adoption handling.
- Recommended next task: WRB01-03 after checkpoint.
