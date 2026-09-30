# EPGA-R01-01 Implementer Report

## Scope and repository verification

- Card: Repair Card `EPGA-R01-01 — Force Normalize Existing Git into ChampCity Topology`.
- Approved repository root: verified as `<PROJECT_REPO>` before mutation.
- Branch: `dev`.
- Remote: `origin` is configured; the local branch was 176 commits ahead of `origin/dev` before this card.
- Starting worktree: clean.

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair01/Reports/EPGA-R01-01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `src/main/sourceControl/managedProjectSourceService.ts`
- `src/shared/sourceControlContracts.ts`
- `src/renderer/app/existingProjectEntryController.ts`
- `src/renderer/app/LandingWorkspace.tsx`
- `src/renderer/app/App.tsx`
- `test/source-control/managed-project-source.test.cjs`
- `test/project-state/current-project-entry.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created:

- no dependency, schema, Workflow, WorkItem, migration sidecar, or unrestricted renderer filesystem API;
- no compatibility route for the superseded manual-intervention admission states;
- no workspace-convergence or WRB05 changes.

## Implementation

The Existing Project inspection contract now has only `source-neutral`, `managed-ready`, `conversion-required`, and `conversion-failed` product states. Ordinary Git irregularities no longer become admission blockers.

Accepted conversion now:

1. resolves and reads the selected Project source;
2. creates an application-owned recovery directory under `.champcity/migrations/` and copies source before Git mutation;
3. reads refs, local branch tips, remotes, tracked paths, ignored paths, and working state on a best-effort basis;
4. initializes a fresh managed bare Repository and imports each readable ref independently;
5. creates one synthetic canonical baseline tree from current tracked, staged/unstaged, and non-ignored untracked source, with up to 32 unique readable local branch tips as parents;
6. force-points `main` and `dev` to that baseline without ordinary merges or conflict resolution;
7. relocates legacy Git administration and partial managed residue into the migration recovery area;
8. creates and verifies exact `Main` and `Dev` worktrees sharing `.champcity/repository.git`;
9. restores ignored/local bytes to `Dev` without committing them;
10. retires root Git authority only after managed verification and registers exact RepositoryCheckout descriptors.

The managed registration service now verifies and registers only application-owned topology. Conventional conversion is exclusively owned by the adoption service, removing its duplicate conservative branch, worktree, submodule, alternate, and metadata blockers.

The focused fixture set proves a ChampCity-style `dev` repository with accumulated history; feature and detached states; missing `main` or `dev`; divergent branches; dirty, untracked, and ignored files; linked worktrees; submodule/alternate metadata; partly and fully unreadable Git; partial migration residue; pre-mutation staging failure; exact Main/Dev identity; and idempotent reopen.

## Validation evidence

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | restricted sandbox | Incomplete: exact documented `spawn EPERM` from esbuild; recorded once. |
| `npm run build` | normal Windows | PASS, exit 0; TypeScript, renderer production bundle, and branding assets completed. |
| `node --test test/source-control/managed-project-source.test.cjs` | normal Windows focused integration | Initial run found one CRLF-induced dirty-checkout assertion; repository-local `core.autocrlf=false` was added. Final run PASS, 10/10, exit 0. |
| `node --test --test-name-pattern="dirty tracked" test/source-control/managed-project-source.test.cjs` | normal Windows focused diagnostic | PASS, 1/1 after the line-ending correction. |
| `node --test test/project-state/current-project-entry.test.cjs` | normal Windows focused integration | Initial run exposed three obsolete expectation strings; corrected to the four-state contract. Final run PASS, 13/13, exit 0. |
| `node --test test/renderer/workflow-hub-shell.test.cjs` | restricted sandbox | Incomplete: exact documented `spawn EPERM`; not counted as product failure. |
| `node --test test/renderer/workflow-hub-shell.test.cjs` | normal Windows capability | PASS, 23/23, exit 0. |
| `node --test test/source-control/source-topology-path-contracts.test.cjs` | normal Windows capability | PASS, 7/7, exit 0. |
| `node --test test/validation/capability-map.test.cjs` | restricted sandbox | Incomplete: exact documented `spawn EPERM`; not counted as product failure. |
| `node --test test/validation/capability-map.test.cjs` | normal Windows integrity | PASS, 5/5, exit 0. |
| `npm run test:migration -- --preview` | normal Windows validation-plan preview | PASS, exit 0; migration lane, production build ownership, and selected migration test resolved. |
| `git diff --check` | read-only Git validation | PASS, exit 0. |

No broad unrelated regression was used as the completion gate.

## Git and safety

- Card-required checkpoint commit: pending at report creation. The actual hash is reported after commit and is intentionally not amended into this same checkpoint.
- Push, merge, rebase, tag, reset, clean, restore, and stash: not performed.
- Secret scan: no credentials, tokens, private keys, cookies, `.env` contents, or secret-shaped additions found in the attributable diff.
- Local-path scan: no concrete local-machine path is persisted in committed artifacts; `<PROJECT_REPO>` is used in this report.
- Generated output and dependency state remain outside the source baseline.

## Remaining validation and risk

- No Operator visual acceptance is claimed. The warning interaction and busy state still require the Repair02 product-level qualification and supported desktop smoke.
- A real inability to read/copy Project source or create/write the managed destination remains a hard conversion failure by design.
- Readable history import is best effort. A malformed ref can be omitted while the current source still becomes a recoverable fresh canonical baseline.

Recommended next task: proceed directly to `EPGA-R01-02` after this checkpoint, qualify the exact warning and complete entry/reopen sequence, then stop for Architect review.
