# WRB01-01 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Work Card WRB01-01 — Establish Current Project Registration and Fresh SPS Runtime.
- Branch: `dev`; remote status at start: `origin/dev`, 95 commits ahead.
- Starting working tree was clean.

## Implementation

Added a main-process Current Project registration service for explicit existing and greenfield modes. It creates or reopens the unique Project record and its source ProjectResource in `.champcity/project-state.sqlite`, rejects ambiguous Project identity and unsafe `.champcity` or database redirection, and repairs an interrupted Project-only registration. Registration does not initialize Git, create Work Intake or Workflow records, or scan legacy Markdown.

Current Project discovery now recognizes the registration resource directly without requiring a provider-generation row. The old provider-generation lookup remains only for the unreplaced legacy Work Intake route, as WRB01-05 owns its retirement. Existing Project State records with no registration marker continue through that legacy discovery branch.

## Files changed

- Created `src/main/projectState/currentProjectRegistrationService.ts`.
- Modified `src/main/workIntake/structuredWorkIntakeService.ts`.
- Created `test/project-state/current-project-registration.test.cjs` (three scenarios).
- Modified `validation/capability-map.json` to register the behavior and focused proof.
- Created this report.
- Deleted: none.
- Tests reused unchanged: existing tests were not modified or retired.
- Tests modified or extended: none.
- New permanent tests: three scenarios cover fresh non-Git registration, idempotent reopen, no WorkIntake/Workflow creation, Markdown non-import, direct discovery, ambiguous identities, and interrupted-registration recovery. This is a new production boundary with no existing focused proof.
- Intentionally not created: IPC/preload/renderer wiring, Git bootstrap, Main/Dev topology, Workflow creation, migration/cutover, or WIR behavior; these are outside WRB01-01.

## Validation

- `npm run build` — restricted lane failed once with `spawn EPERM` during Vite/esbuild startup; rerun in the normal Windows lane passed (TypeScript, Vite renderer, branding assets). Existing Vite chunk-size warning remains.
- `node --test test/project-state/current-project-registration.test.cjs` — normal Windows lane, 3 passed, 0 failed.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` — passed; planner selected dependent project-planning and legacy Greenfield capabilities in addition to this card’s direct proof.
- `npm run test:affected -- --changes tmp/changes.json` — normal Windows lane, build passed; composed work-item profile failed in `test/work-intake/greenfield-source-bootstrap.test.cjs` where existing source-bootstrap scenarios expected `ready`/`blocked` and received `unprepared`. These scenarios exercise the unreplaced Greenfield Work Intake/source-bootstrap route, outside WRB01-01’s registration boundary; prior local qualification logs show these same scenarios passing before this run. No change was made to Greenfield source preparation in this card. This residual should be reassessed when WRB01-03 owns Greenfield bootstrap.
- First focused test attempt caught an incorrect expected diagnostic regex; corrected it and the final focused run passed.
- Git diff whitespace check: `git diff --check` passed.
- Skipped: broad historical full suite, Electron launch, and external integration checks; none are required by this card.

## Git, safety, and remaining review

- Git actions: one WRB01-01 checkpoint commit is required; commit hash is pending at report creation and will be returned after commit.
- Security/local-path scan: no credentials or concrete local-machine paths are included in durable files; `.champcity` and database path containment checks are in place. Generated `dist/` output and `tmp/changes.json` remain untracked/ignored validation state and are not part of the checkpoint.
- Remaining Operator manual validation: none for this service-only card.
- Residual risk: Greenfield source-bootstrap qualification has an observed unrelated failure in the affected profile and remains for WRB01-03 follow-up.
- Recommended next task: WRB01-02, after checkpoint.
