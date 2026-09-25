# WRB01-R01-02 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Repair Card WRB01-R01-02 — Preserve Branch Semantics During Managed Repository Adoption.
- Starting checkpoint: `9fbb404`; branch `dev`; remote status: `origin/dev`, 102 commits ahead before this checkpoint.

## Implementation

Managed adoption now inspects the exact conventional repository's current branch during preflight. It accepts only `main` and `dev`; detached HEAD and all other branches fail before Project source or Git metadata is moved. The no-checkout/mixed-reset receiver and source destination follow that current branch, while the other checkout is materialized cleanly from its own branch.

When `main` is current and `dev` is absent, adoption adds `refs/heads/dev` at the exact Main revision in the copied managed metadata before checkout creation. Main remains required, and any other missing-Dev case fails before source movement. Post-adoption verification accepts only this one expected ref addition and otherwise requires original refs, remotes, and tags to remain unchanged. Existing rollback handles source movement from either receiver.

## Files changed

- Modified `src/main/sourceControl/managedProjectSourceService.ts`.
- Modified `test/source-control/managed-project-source.test.cjs` with Main-current, Dev-current, main-only, and unsupported-branch coverage; retained conflict, redirect, and idempotent-reopen proofs.
- Modified `validation/capability-map.json` for the six-test suite and expanded adoption behavior proof.
- Created this report.
- Deleted: none.
- Intentionally not created: arbitrary feature-branch adoption, Git source movement in the original repository before successful adoption, Workflow checkouts, schema changes, or dependencies.

## Validation

- `npm run build` — restricted Windows lane, exit 1 at Vite/esbuild with `spawn EPERM`; TypeScript had completed. Per the validation lane, rerun once in the normal Windows lane.
- `npm run build` — normal Windows lane, exit 0; TypeScript and Vite build passed. Existing Vite chunk-size advisory remains.
- `node --test test/source-control/managed-project-source.test.cjs test/validation/capability-map.test.cjs` — restricted lane, exit 1 because the Node test runner received `spawn EPERM`; equivalent normal-lane command followed.
- `node --test test/source-control/managed-project-source.test.cjs test/validation/capability-map.test.cjs` — normal Windows lane, final run exit 0, 11 passed, 0 failed. Includes all four branch-state acceptance cases and preserves managed-path conflict, redirect, registration, and idempotent-reopen coverage.
- `npm run validate:plan -- --profile repair --changes tmp/changes.json` — normal Windows lane, exit 0; preview used the exact three changed paths and managed-project-source-topology capability.
- `npm run test:repair -- --changes tmp/changes.json` — normal Windows lane, exit 1 after 273,931 ms. The production build passed. The focused managed-source test and other selected proofs passed; the sole failure evidence is `test/source-control/source-lifecycle-package.test.cjs`, whose generic legacy Work Intake fixture uses an old `selected-repository` Project without a Current Project SPS registration and expects its source state to be `ready` (actual `unprepared`). This path is outside R01-02 and the active card forbids changing Current Project identity. It is recorded for the owning workflow rather than folded into this adoption repair.
- `git diff --check` — normal Windows lane, exit 0.
- Skipped: Electron launch, packaging, and external integration; outside this repair card.

## Git, safety, and remaining review

- Git actions: one attributable R01-02 checkpoint commit is required by the Repair01 bundle; commit hash will be reported after creation.
- Security/local-path scan: changed durable content contains no credentials, tokens, concrete machine paths, or generated output. Adoption preflight and rollback remain bound to the exact selected Project root. No unrelated working-tree changes were present before this card.
- Remaining Operator manual validation: none for deterministic branch/ref/source preservation criteria.
- Residual validation item: the generic legacy Work Intake fixture failure described above is unrelated to managed adoption and needs its owning workflow to update or disposition the fixture.
- Recommended next task: WRB01-R01-03 — Restore checkout-aware Source Graph, close legacy Hub reachability, and requalify WRB01.
