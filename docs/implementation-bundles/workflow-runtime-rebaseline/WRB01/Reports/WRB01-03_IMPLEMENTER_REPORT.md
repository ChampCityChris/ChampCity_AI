# WRB01-03 Implementer Report

## Repository and card

- Approved repository root verified: `ChampCity_AI` repository root.
- Card: Work Card WRB01-03 — Establish Greenfield Source Bootstrap and Gitignore Baseline.
- Starting checkpoint: `09cc5fe`; branch `dev`; remote status: `origin/dev`, 97 commits ahead.
- Prior card WRB01-02 was checkpointed before this implementation began.

## Implementation

Greenfield source bootstrap now initializes bare common Git metadata at `.champcity/repository.git`, creates sibling `Main` and `Dev` linked worktrees, and keeps the selected Project root outside Git. The tracked `.gitignore` baseline excludes `.champcity/`, `node_modules/`, `dist/`, `build/`, `out/`, `release/`, and `coverage/`. The deterministic initial commit is shared by Main and Dev. Compatible reopening validates the existing root topology and rejects redirected metadata/checkouts, and registers both checkout descriptors through the optional WTR02D registration port; conflicting source and incompatible history fail closed.

The bootstrap request flows from Source Control service to `projectSourceBootstrap`. The service supports registration calls when a workspace identity and registration port are supplied. The current Greenfield Work Intake caller does not yet supply that port; card WRB01-05 owns the Work Intake runtime retirement and registration wiring decision if Architect review determines an app entrypoint is required.

## Files changed

- Modified `src/main/sourceControl/projectSourceBootstrap.ts`.
- Modified `src/main/sourceControl/sourceControlService.ts`.
- Modified `test/work-intake/greenfield-source-bootstrap.test.cjs`: retained the two existing Work Intake scenarios and updated only the bootstrap scenario for managed topology.
- Modified `validation/capability-map.json` to map the new managed Greenfield behavior to existing focused proof.
- Created this report.
- Deleted: none.
- Intentionally not created: Greenfield UI, Workflow SourceLines, Workflow checkouts, provider-generation migration, and Gitignore language templates.

## Validation

- Initial restricted `npm run build` — exit 1, `spawn EPERM` during Vite/esbuild startup. Per Validation Command Lanes, reran once in the normal Windows lane.
- `npm run build` — normal Windows lane, exit 0; TypeScript and renderer build passed, with the existing Vite chunk-size advisory.
- `node --test --test-name-pattern="semantic greenfield bootstrap" test/work-intake/greenfield-source-bootstrap.test.cjs` — normal Windows lane, 1 passed, 0 failed. Proved deterministic shared baseline, sibling Main/Dev roots, non-Git Project root, tracked ignore file, ignored and visible files, idempotent reopen, and checkout descriptor registration calls.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` — normal Windows lane, exit 0 for the exact changed-path manifest plus `managed-project-source-topology` scope.
- `npm run test:affected -- --changes tmp/changes.json` — final normal Windows lane, exit 1 after 261,205 ms. The production build passed. Failure evidence: (1) two retained legacy greenfield Work Intake scenarios still assume Git metadata directly at the Project root (one attempts `git commit-tree` there); (2) `test/source-control/source-lifecycle-package.test.cjs` expects legacy Work Intake source preparation `ready`, received `unprepared`. These failures concern the Work Intake-owned lifecycle paths scheduled for WRB01-05; no legacy project-root Git behavior was reintroduced.
- `git diff --check` — passed; Git reported the test file's expected CRLF-to-LF normalization notice.
- Skipped: broad historical full suite, Electron launch, and external integrations; not required by this card.

## Git, safety, and remaining review

- Git actions: one WRB01-03 checkpoint commit is required; hash will be reported after the commit.
- Security/local-path safety: no credentials or concrete machine paths were added to durable files. The bootstrap only mutates an empty Project or validates a matching managed topology; `.champcity` redirects and conflicting entries are rejected. Generated `dist/` output and `tmp/changes.json` are excluded from the checkpoint.
- Remaining Operator manual validation: none for deterministic bootstrap criteria.
- Residual risk: current Work Intake paths still expect the prior Project-root Git lifecycle. The bundle schedules their replacement in WRB01-05; affected-profile evidence is retained above.
- Recommended next task: WRB01-04 after checkpoint.
