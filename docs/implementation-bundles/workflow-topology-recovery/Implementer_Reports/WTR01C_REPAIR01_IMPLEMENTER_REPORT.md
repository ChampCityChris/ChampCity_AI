# WTR01C Repair01 Implementer Report

## Scope and starting state

- Card: `WTR01C_REPAIR01_align_permanent_workflow_provenance_tests.md`.
- Starting `dev` SHA: `3e1fb9c3952adba1446964b7f26feef9c50db6b9`.
- Branch and remote status: `dev`, 61 commits ahead of `origin/dev` at start.
- Repository root was verified as the approved ChampCity_AI checkout.
- Exactly the three card-specified tests were modified; this report is the only created file. No production file, validation metadata, or compatibility alias was added.

## Fixture changes

- `test/migration/structured-state-qualification.test.cjs`: left the legacy-import and cutover fixture intact; now resolves the WIR through `summary.routingWorkflowId`, creates an independent canonical `feature-capability` target Workflow, links it with `linkWorkflowRouteTarget()`, and attaches Phase/Work Items to the target. The summary is asserted to expose the target as `targetWorkflowId`.
- `test/source-control/source-lifecycle-package.test.cjs`: `routeAndWork(...)` now creates a target after routing (`feature-change` → `feature-capability` in `development`; `issue-resolution` → `issue-resolution` in `issue`), links the routing Workflow to it, asserts `targetWorkflowId`, and attaches the synthetic Work Item to the target.
- `test/source-control/structured-workflow-checkpoint.test.cjs`: now creates and links an independent `feature-capability` target after the Feature route, asserts `targetWorkflowId`, and attaches the Work Item to that target.
- No test under `test/` references `summary.workflowId` after these edits. The permanent test count is unchanged.

## Validation

| Command | Lane / result |
| --- | --- |
| `npm run build` | Restricted lane exited 1 with documented Vite/esbuild `spawn EPERM`; rerun in normal Windows lane exited 0. TypeScript and Vite build completed; Vite emitted its existing large-chunk advisory. |
| `node --test test/migration/structured-state-qualification.test.cjs test/source-control/source-lifecycle-package.test.cjs test/source-control/structured-workflow-checkpoint.test.cjs` | Restricted lane exited 1 because Node test-runner child processes hit `spawn EPERM`. Normal Windows rerun: migration test passed; both source-control tests failed at existing production validation with `Work Item is not owned by the selected Work Intake workflow.` |
| `npm run validate:plan -- --profile work-item --changes tmp/wtr01c-repair01-changes.json` | Normal Windows planner preview exited 0 for the exact three test paths plus this report; planner selected the work-item proof profile. The manifest is temporary and ignored. |
| `npm run test:affected -- --changes tmp/wtr01c-repair01-changes.json` | Restricted lane exited 1 at production build with `spawn EPERM`; normal Windows rerun built successfully, executed 247,831 ms, and exited 1. It failed only the two scoped source-control tests with the same existing owner assertion; the remaining selected proof completed. |
| `git diff --check` | Normal Windows, exit 0. |

## Blocker and disposition

The card requires target-Workflow ownership in both source-control fixtures while also prohibiting source-control production changes. The current `recordStructuredImplementation()` and disposition path call `assertWorkOwner()`, which traverses `part_of` relationships only until the Workflow directly initiated by the Work Intake. Once the Work Item is correctly attached to the independent `routes_to` target Workflow, that existing production assertion rejects it. Making these two tests pass therefore requires the source-control ownership behavior explicitly reserved for WTR02; weakening the fixtures or changing production here would violate this card.

No compatibility field was restored, and no production file was changed. Acceptance remains incomplete because the two required focused tests fail. No checkpoint commit has been created while the card acceptance is blocked. Recommended next task: WTR02 source-control ownership correction, then rerun this repair's acceptance validations.
