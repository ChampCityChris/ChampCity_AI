# Implementer Report: WC43-REPAIR01B Unified Work Card Planning And Executable-Contract Prompt

## Pass Type

Numbered repair Work Card: `WC43-REPAIR01B`

## Repository Path Inspected

Verified approved repo root.

## Git Branch And Remote Status

- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Upstream: `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`
- Work Card Git mutation authority: prohibited
- Git mutation performed: none
- Commit created: no
- Commit hash: not applicable; no commit was authorized or created
- Tag: none

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md`

## Files Modified Or Extended By This Pass

- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/renderer/app/WorkCardIntakeWorkspace.tsx`
- `src/renderer/styles.css`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/renderer/architect-browser-attachment-coordinator.test.cjs`
- `test/renderer/architect-output-workspace-source.test.cjs`
- `test/renderer/document-review-surface-source.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- `test/renderer/work-card-intake-workspace.test.cjs`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/workflow/current-execution-context.test.cjs`

## Files Intentionally Not Created

- No IPC or preload route.
- No new persistence service, canonical writer, metadata schema, migration utility, or review document.
- No second handoff, second prompt definition, compatibility wrapper, or fallback authority.
- No final Formal Work Card write path outside the existing Architect-output promotion flow.

## Files Intentionally Not Modified

- `src/shared/workspaceContracts.ts`: no contract change was required because `work-card-planning` and the historical `work-card-intake` workspace IDs already exist.
- `src/shared/workspaces/projectRailPresentation.ts`: no shared presentation contract change was required; the visible loop repair is local to the nested rail rendering.
- `test/work-card-intake/work-card-intake-service.test.cjs`: the canonical WC43 handoff behavior remains covered by existing service tests plus new production-route assertions in the current workflow tests.

## Implementation Summary

The current workflow now presents pre-handoff Work Card intake as a substate of the visible `work-card-planning` workspace. Eligible candidates resolve to `activeWorkspaceId=work-card-planning` with the existing `workCardIntake` projection, `loopStep=Planning`, and Planning-facing copy. The historical `work-card-intake` ID remains available for compatibility and handoff classification, and legacy navigation redirects to the Planning surface.

The Planning pre-handoff renderer reuses `WorkCardIntakeWorkspace`, relabeled as `Prepare Work Card Planning`. Its action still calls `window.champcity.generateCurrentHandoff()`. On success, the same Planning workspace refreshes into the existing Formal Work Card Architect-output model and displays the normal Prepare/Copy and review surface without visiting a second Operator workspace.

The Work Card loop rail now shows one visible `Planning` item and no separate `Work Card Intake` item. Formal Work Card Planning and Work Card Repair use a dedicated `work-card-architect-workspace` dual-pane layout with a 56 percent document side and 44 percent browser side, plus constrained-width stacking. Other Architect workspace layouts were left unchanged.

`src/main/workCardPlanning/workCardPlanningService.ts` now installs the approved executable-contract Formal Work Card Architect prompt. Dynamic substitutions are limited to source handoff path and revision, candidate ID/title/context JSON, final target path, temporary draft path, evidence path/revision lines, and exact Operator revision notes when the current Formal Work Card is `RevisionRequested`. The generated prompt contains exactly one `artifact_toolbox.create_markdown_artifact` JSON action targeting the temporary draft with `overwrite=false`.

Generated initial prompt digest for the standard seeded `phase-01` / `WC01` fixture after dynamic substitution: `2faef8777a68ffebcd8d7d1fce603e10c9e0b80b604743e52faef3ac40e89468`.

## Acceptance Criteria Proof

1. Pre-handoff current workflow resolves to `work-card-planning` with the WC43 intake projection: covered by `test/workflow/current-execution-context.test.cjs`.
2. Visible Work Card rail has one `Planning` item and no separate `Work Card Intake` item: covered by `test/renderer/project-rail-presentation.test.cjs`.
3. Pre-handoff Planning renders selected candidate and `Prepare Work Card Planning` without document review, disposition controls, or embedded browser: covered by `test/renderer/work-card-intake-workspace.test.cjs` and source assertions in `test/renderer/document-review-surface-source.test.cjs`.
4. The action uses existing `generateCurrentHandoff` and creates the same Approved non-review handoff metadata and Formal Work Card target semantics as WC43: covered by the production-route handoff test in `test/workflow/current-execution-context.test.cjs`.
5. After success, the same visible Planning workspace refreshes into Formal Work Card Architect-output state: covered by `App.tsx` source-path assertions and current workflow tests.
6. Ineligible candidate selection creates no handoff or draft submission: covered by the new blocked-candidate test in `test/workflow/current-execution-context.test.cjs`.
7. Generation failure keeps the pre-handoff Planning state and displays the route error: covered by existing in-flight/error rendering in `WorkCardIntakeWorkspace` and updated App transition guards.
8. Formal Work Card Planning uses the specified 56/44 layout and stacks when constrained: covered by CSS/source assertions in `test/renderer/project-rail-presentation.test.cjs`.
9. Other Architect workspace layouts remain unchanged: covered by the same presentation test, including the preserved Architect interview grid rule.
10. The active generated prompt matches the approved template except dynamic substitutions: covered by `test/architect-outputs/architect-output-prompt-contracts.test.cjs`.
11. Prompt proof includes full-path inspection, Architect decision ownership, conditional Operator questions, one bounded outcome, positive and negative production proof, preserved behavior, authorized surface, negative constraints, auditable report requirements, and Operator-only manual validation: covered by the prompt contract test.
12. The prompt contains exactly one temporary-draft invocation with `overwrite=false`, includes exact revision notes when applicable, and contains no final-path write: covered by prompt contract tests and `test/work-card-planning/work-card-planning-service.test.cjs`.
13. Existing Pending Formal Work Cards remain byte-identical and block new draft preparation: covered by `pending Formal Work Card remains byte-identical and blocks new draft preparation`.
14. Production-path tests cover pre-handoff Planning, successful handoff generation, same-workspace transition, failure/no-mutation behavior, rail presentation, prompt output, and unchanged downstream Formal Work Card eligibility: covered by focused workflow, work-card-planning, renderer, and prompt tests plus the full Node suite.
15. Typecheck, TypeScript build, Vite build, focused tests, and complete Node test lane passed in the approved normal Windows validation lane where child-process tooling required it.
16. No Git mutation occurred: confirmed by read-only `git status` checks; no stage, commit, push, checkout, merge, reset, or tag command was run.

## Commands Run And Results

- `pwd`: passed from approved repo root.
- `git status --short --branch`: passed; showed current feature branch and a pre-existing dirty worktree from earlier phase-08 work.
- `git remote -v`: passed; confirmed public origin URL.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: passed.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`: passed.
- `Get-Content docs/governance/EXECUTION_PASS_PROTOCOL.md`: failed because the removed legacy protocol file is absent; the current validation lane states this is not a blocker.
- `Get-Content docs/governance/IMPLEMENTER_LITERAL_COMPLIANCE_PROTOCOL.md`: failed because the removed legacy protocol file is absent; the current validation lane states this is not a blocker.
- `Get-Content docs/governance/INDEPENDENT_VALIDATION_PROTOCOL.md`: failed because the removed legacy protocol file is absent; the current validation lane states this is not a blocker.
- `npx tsc --noEmit`: passed in sandbox lane.
- `npx tsc`: passed in sandbox lane.
- Focused WC43-REPAIR01B test lane: sandbox lane hit documented `spawn EPERM`; approved normal Windows lane passed, 46 tests passed.
- `npx vite build`: sandbox lane hit documented `spawn EPERM`; approved normal Windows lane passed.
- `npx tsc`: rerun after Vite build in sandbox lane; passed.
- Complete `node --test --test-concurrency=1`: sandbox lane hit documented `spawn EPERM`.
- Complete `node --test --test-concurrency=1 --test-reporter=dot`: approved normal Windows lane passed.
- Generated-prompt digest command: passed and produced `2faef8777a68ffebcd8d7d1fce603e10c9e0b80b604743e52faef3ac40e89468`.
- `git diff --check -- ...scoped files...`: passed with only line-ending normalization warnings.
- Scoped sensitive-value and concrete local path scan with `rg`: passed; no matches.
- Final `git status --short --branch`: passed; no Git mutation performed.

## Validation Performed

- TypeScript no-emit check: passed.
- TypeScript compile: passed.
- Vite renderer build: passed in approved normal Windows lane after documented sandbox failure.
- Focused WC43-REPAIR01B tests: passed, 46 tests.
- Complete Node test lane: passed in approved normal Windows lane.
- Prompt digest produced from the active built service using a seeded Work Card Planning fixture.
- Scoped whitespace check: passed with line-ending warnings only.
- Scoped sensitive-value and concrete local path scan: passed.

## Validation Skipped And Reason

- Electron launch smoke: not performed. The Work Card did not authorize Implementer manual acceptance, and the required proof is covered by automated workflow, renderer source, service, prompt, and full-suite validation.
- Operator manual validation: not performed by Implementer; remains Operator-owned.

## Manual Validation Required

Operator should confirm the Work Card loop shows one Planning step, Planning first displays the selected candidate and prepares the intake handoff without leaving the workspace, the same workspace then exposes Prepare/Copy and Embedded ChatGPT, the document pane is wider than the browser and readable at normal desktop width, the copied prompt follows the executable-contract method, and a newly generated or revised Formal Work Card is concise, bounded, implementation-ready, and aligned with the approved standard.

## Security And Sensitive-Value Notes

No sensitive authentication material, provider keys, environment files, concrete local machine paths, backend persistence, or filesystem authority changes were introduced. Renderer filesystem access was not broadened.

## Scope Expansion

One adjacent source assertion file, `test/renderer/document-review-surface-source.test.cjs`, was updated because its existing generic document-review assertion directly covered the now-unified Planning pre-handoff surface. One adjacent renderer coordinator assertion, `test/renderer/architect-browser-attachment-coordinator.test.cjs`, was updated to match the new `isVisibleArchitectOutputWorkspace` gating used to keep the browser hidden during pre-handoff Planning.

## Residual Risks

Automated tests verify the workflow state, generated handoff bytes, prompt contract, layout source, and full suite. Final confidence in the embedded browser proportions and copied prompt usability still requires Operator visual validation in the running Electron app.

## Blocking Questions

None.

## Recommended Next Implementer Task

Run Operator validation for WC43-REPAIR01B, then continue with the next approved phase-08 Work Card or repair identified by Architect review.
