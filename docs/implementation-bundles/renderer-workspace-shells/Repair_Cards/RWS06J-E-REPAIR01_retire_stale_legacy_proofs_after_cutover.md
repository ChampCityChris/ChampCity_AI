# RWS06J-E-REPAIR01 — Retire Stale Legacy Proofs After Cutover

**Status:** IMPLEMENTER_READY
**Parent:** RWS06J-E; governing checkpoints RWS06J-C (`7cac22b`) and RWS06J-D (`057932e`)
**Sequence:** immediately after RWS06J-REPAIR02
**Execution mode:** CONTINUOUS_BUNDLE_REPAIR — complete this repair and checkpoint, then immediately execute RWS06J-E. Do not return for review between repair and qualification.

## Failed validation evidence

The source-stable RWS06J-E affected receipt `93b160b0-8738-4acc-996e-3542061d1bb6` ran 930 tests and failed 42.

Architect review confirms a bounded set of A-D-attributable proof/catalog defects:

- tests still import renderer modules deleted by RWS06J-C;
- a document-review source assertion still expects deleted `App.refreshDocuments`;
- Project Planning proof still expects retired `workPlanning:status`;
- Work Intake capture proof omits the now-required selected Current Project context;
- Phase Map historical fixtures call canonical Markdown writers after RWS06J-D correctly activated the strict fence;
- current Project registration proof still expected no provider generation instead of generation 1 / structured;
- Codex execution presentation ownership proof targets the deleted legacy Issue/Development presentation reducer;
- validation catalog entries/source patterns still retain owners or paths whose only production subject was retired by C.

RWS06J-REPAIR01/02 may delete additional obsolete Greenfield Work Card tests/catalog ownership. Include those exact paths in this repair's final validation manifest rather than preserving stale proof.

The remaining reproduced Agent Harness, source-control administration, Project State ValidationCatalog, and equivalent pre-existing failures remain outside this repair unless direct current-tree reproduction proves they are attributable to RWS06J.

## Objective

Bring retained tests and validation ownership into line with the final production architecture after:

- App shell cutover;
- legacy workflow service retirement;
- Project-wide structured authority;
- Greenfield convergence on the shared WorkItem pipeline;
- retirement of Greenfield Work Card compatibility state.

This repair is test/catalog cleanup only. It must not redesign production workflow behavior.

## Confirmed repair surface

At minimum inspect/correct:

- `test/renderer/evidence-driven-refresh-coordinator.test.cjs`
- `test/renderer/execution-context-dashboard.test.cjs`
- `test/renderer/project-planning-blocker-banner.test.cjs`
- `test/renderer/work-card-intake-workspace.test.cjs`
- `test/renderer/work-card-repair-workspace.test.cjs`
- `test/renderer/work-card-report-review-workspace.test.cjs`
- `test/renderer/codex-execution-presentation-ownership.test.cjs`
- `test/renderer/document-review-surface-source.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/project-intake/post-submit-review-state.test.cjs`
- `test/phase-map/phase-map-service.test.cjs`
- `test/project-state/current-project-registration.test.cjs`
- Greenfield/Work Card compatibility tests made obsolete by RWS06J-REPAIR01/02;
- `validation/capability-map.json`.

## Required repair

- Delete tests whose only subject is a production renderer/helper retired by RWS06J. Do not preserve dead proof for archaeology.
- Remove the matching capability-map test owners and behavior entries.
- Remove stale capability source patterns for deleted production modules when no current source can own that capability. Do not retain a deleted path solely so a future validator can classify an old deletion.
- In document-review proof, retain current generated-document display/copy/export behavior; remove only assertions targeting deleted App document-refresh ownership.
- Update Project Planning proof to the active SQL planning boundary.
- Supply the exact selected Current Project context required by current Work Intake capture.
- Seed historical Phase Map Markdown directly as inert fixture data; retain proof that the canonical API is fenced and SQL state is unaffected.
- Update Current Project registration proof to the D contract: first registration produces generation 1 with structured authority and repeated registration does not advance it.
- Update Greenfield proof ownership to the shared WorkItem pipeline. Do not retain tests requiring `planningPreparedAt`, Phase WorkItem prepare IPC, derived Work Card Intake, or a Greenfield-only Work Card state machine after RWS06J-REPAIR02 removes them.
- Keep `test/renderer/project-rail-presentation.test.cjs` and other reproduced unrelated failures outside this repair unless direct source review shows an RWS06J-owned behavior actually changed.

## Preserve / forbid

Preserve:

- production legacy read/write fence;
- Structured Project State workflow behavior;
- shared WorkItem execution pipeline;
- generated readability projections and Markdown Export;
- browser attachment;
- Settings;
- Source Control;
- current shared Implementer/Tester proof.

Do not:

- restore deleted renderer/service modules;
- restore retired IPC/preload methods;
- add migration/adoption fallbacks;
- weaken the authority fence;
- change production source merely to satisfy stale tests;
- fix unrelated Agent Harness/Source Control/Project State failures.

## Acceptance

1. No retained test imports an RWS06J-retired renderer/helper or asserts retired IPC/App ownership.
2. Capability map contains no owner/behavior whose sole proof was a deleted test and no unnecessary source pattern for a deleted production module.
3. Historical Phase Map fixtures are inert files and strict-fence assertions still pass.
4. Current Project registration proof matches generation 1 / structured and idempotent re-registration.
5. Greenfield test ownership proves the common WorkItem pipeline rather than removed special Work Card stages.
6. Updated current renderer, SQL Planning, Phase Map, Work Intake, authority/fence, shared execution, and capability-map proofs pass.
7. Repair planner uses the exact changed-path manifest.
8. Matching `npm run test:repair` receipt is reported truthfully.
9. `git diff --check` passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06J-E-REPAIR01_IMPLEMENTER_REPORT.md`

Distinguish tests deleted as obsolete from retained tests updated to current behavior.

## Checkpoint / continuation

Commit:

`RWS06J-E-R01 retire stale post-cutover proofs`

After the checkpoint, **do not stop**. Immediately execute RWS06J-E qualification from the repaired tree. Keep unrelated affected-profile failures separately attributed.
