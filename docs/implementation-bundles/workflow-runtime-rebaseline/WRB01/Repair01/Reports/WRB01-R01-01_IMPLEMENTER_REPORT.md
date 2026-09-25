# WRB01-R01-01 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Repair Card WRB01-R01-01 — Correct Current Project Identity and Greenfield Entry Semantics.
- Starting checkpoint: `f6038d0`; branch `dev`; remote status: `origin/dev`, 101 commits ahead before this checkpoint.

## Implementation

Current Project identity now comes only from exactly one active `ProjectResource` with `resourceType: source-repository` and locator `selected-project`. Historical Project rows, Workflows, and `selected-repository` resources remain attached to their old Project IDs and do not make the store ambiguous. Registration creates a fresh Project alongside those records when no current registration exists; duplicate current registrations still fail closed. The canonical selected-project source repository ID is exported and reused by registration and Greenfield bootstrap.

Greenfield entry rejects a Project that is already current, registers the Project container with Agent Harness, bootstraps or verifies managed source, then creates the Current Project SPS registration. A compatible managed baseline without a current SPS registration can finish entry. Existing Project entry keeps registration before managed adoption.

## Files changed

- Modified `src/main/main.ts` and `src/main/projectState/currentProjectRegistrationService.ts`.
- Modified `test/project-state/current-project-entry.test.cjs` and `test/project-state/current-project-registration.test.cjs`.
- Modified `validation/capability-map.json` to reflect the expanded proof and test count.
- Created this report.
- Deleted: none.
- Intentionally not created: migrations or conversions for old Project/Workflow state, Work Intake or Workflow records on the new Current Project, JSON workflow sidecars, schema changes, and dependencies.

## Validation

- `npm run build` — restricted Windows lane, exit 1 at Vite/esbuild with `spawn EPERM`; TypeScript had completed. Per the validation lane, rerun once in the normal Windows lane.
- `npm run build` — normal Windows lane, exit 0; TypeScript and Vite build passed. Existing Vite chunk-size advisory remains.
- `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` — restricted lane, exit 1 because the Node test runner received `spawn EPERM`; equivalent normal-lane command followed.
- `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs test/validation/capability-map.test.cjs` — normal Windows lane, final run exit 0, 13 passed, 0 failed. Covers abandoned Project/Workflow and selected-repository preservation, fresh identity, duplicate current-registration rejection, no current WorkIntake/Workflow, already-current Greenfield rejection, compatible managed-baseline retry, existing adoption preservation, and capability-map integrity.
- `npm run validate:plan -- --profile repair --changes tmp/changes.json` — normal Windows lane, exit 0; preview resolved the exact five changed paths and Current Project/project-state scope.
- `npm run test:repair -- --changes tmp/changes.json` — normal Windows lane, exit 0; composed repair receipt status `passed`, 257,020 ms, production build passed, and no failure evidence. The composed profile selected dependent integration proofs beyond the focused suites.
- `git diff --check` — normal Windows lane, exit 0.
- Skipped: Electron launch, packaging, and external integration; outside this repair card.

## Git, safety, and remaining review

- Git actions: one attributable R01-01 checkpoint commit is required by the Repair01 bundle; commit hash will be reported after creation.
- Security/local-path scan: changed durable content contains no credentials, tokens, concrete machine paths, or generated output. Source writes remain main-process operations bound to the selected Project root. No unrelated working-tree changes were present before the card.
- Remaining Operator manual validation: none for the deterministic identity and entry criteria in this card.
- Residual risks/blockers: none identified in the card scope. Existing Vite chunk-size advisory is unchanged.
- Recommended next task: WRB01-R01-02 — Preserve adoption branch semantics.
