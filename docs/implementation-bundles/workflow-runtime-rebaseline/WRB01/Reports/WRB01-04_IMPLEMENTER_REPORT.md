# WRB01-04 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Work Card WRB01-04 — Converge Landing Project Entry onto Current Project Runtime.
- Starting checkpoint: `d2eeb8b`; branch `dev`; remote status: `origin/dev`, 97 commits ahead.

## Implementation

Added a constrained `project:registerCurrent` IPC and typed preload method. Its main-process handler uses the selected Project root only, registers/opens the SPS Project, registers the root with Agent Harness, and then establishes or verifies managed source topology. Greenfield registration rejects nonempty source containers before persisting Project State and bootstraps deterministic Main/Dev checkouts. Existing non-Git Markdown Projects register as SPS without importing legacy Workflow state; conventional or already-managed Git Projects go through managed-topology adoption/verification.

The landing actions now retain the returned exact Project ID, name, source identity, root, and mode in renderer state. Existing Project enters Workflow Hub. Start New Project enters the existing Project Intake capture surface; it no longer opens Work Intake. The Project identity is exposed on the Current Project banner.

## Files changed

- Modified `src/main/main.ts`, `src/preload/index.ts`, `src/shared/workspaceContracts.ts`, and `src/renderer/app/App.tsx`.
- Created `test/project-state/current-project-entry.test.cjs` with main/preload and renderer-entry boundary proof.
- Modified `validation/capability-map.json` with the entry runtime capability and focused proof mapping.
- Created this report.
- Deleted: none.
- Intentionally not created: Workflow or WorkIntake records on either landing entry; legacy Markdown import; Workflow Hub redesign; final Greenfield planning normalization.

## Validation

- `npm run build` — normal Windows lane, exit 0; TypeScript and renderer build passed with the existing Vite chunk-size advisory.
- `node --test test/project-state/current-project-entry.test.cjs` — normal Windows lane, 3 passed, 0 failed. Covers Greenfield registration and checkout calls through preload, Existing historical Project registration without Workflow reconstruction, and landing destination/no-WorkIntake routing.
- `node --test test/validation/capability-map.test.cjs` — normal Windows lane, 5 passed, 0 failed after sorting the new capability and test records.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` — normal Windows lane, exit 0 for the exact final changed-path manifest and `current-project-entry-runtime` scope.
- `npm run test:affected -- --changes tmp/changes.json` — normal Windows lane, exit 1 after 144,966 ms. The production build passed and the only failure evidence is `test/work-intake/greenfield-source-bootstrap.test.cjs`: its retained legacy incompatible-dev scenario tries to run `git commit-tree` at the now non-Git Project container root. Other selected proofs, including the new entry boundary and Current Project registration, passed. The root-Git expectation is superseded by WRB01-03 and remaining Work Intake retirement is scheduled for WRB01-05.
- `git diff --check` — pending checkpoint review.
- Skipped: broad historical full suite, Electron launch, and external integrations; not required by this card.

## Git, safety, and remaining review

- Git actions: one WRB01-04 checkpoint commit is required; hash will be reported after the commit.
- Security/local-path safety: main-process registration is bound to the selected root; renderer receives a fixed typed method and no filesystem access. No credentials or concrete machine paths were added. Generated `dist/` output and `tmp/changes.json` are excluded from the checkpoint.
- Remaining Operator manual validation: none for the entry and registration contracts covered by the card's deterministic criteria.
- Residual risk: the selected Project Intake capture surface still contains the established planning UI and is not the final Greenfield planning normalization; that behavior is explicitly outside this card.
- Recommended next task: WRB01-05 after checkpoint.
