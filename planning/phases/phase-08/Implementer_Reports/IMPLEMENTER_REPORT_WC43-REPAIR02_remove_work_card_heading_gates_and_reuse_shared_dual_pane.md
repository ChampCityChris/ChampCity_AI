# Implementer Report: WC43-REPAIR02 Remove Work Card Heading Gates And Reuse Shared Dual-Pane Layout

## Pass Type

Numbered repair Work Card: `WC43-REPAIR02`

## Repository Path Inspected

Verified approved repo root.

## Git Branch And Remote Status

- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Upstream: `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`
- Work Card Git mutation authority: prohibited
- Read-only Git inspection performed: yes, to verify branch, remote, status, and scoped diff
- Git mutation performed: none
- Commit created: no
- Commit hash: not applicable; no commit was authorized or created
- Tag: none

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md`

## Files Modified

- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`
- `src/shared/workspaces/projectRailPresentation.ts`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- `test/renderer/architect-output-workspace-source.test.cjs`

## Files Intentionally Not Created

- No Markdown parser, fence-aware heading counter, warning-only gate, compatibility validator, alternate heading validator, migration utility, or fallback reader.
- No Work Card-specific renderer layout helper, class, media query, or duplicate width ratio.
- No IPC, preload, metadata schema, prompt route, persistence authority, retry automation, or MCP behavior change.

## Implementation Summary

Formal Work Card promotion now validates only the retained substantive Markdown and application metadata delimiter rules. The removed production checks were `validateOneH1Prefix()` and `validateExactH2s()` plus their calls from `validateFormalWorkCardBody()`.

Repair Work Card promotion now validates substantive Markdown, application metadata delimiter rejection, and the existing exact `returnTarget` agreement. The removed production checks were `validateOneH1Prefix()` and `validateExactH2s()` plus their calls from `validateRepairWorkCardBody()`.

The Formal and Repair prompt heading templates remain in place as writing guidance. No runtime validator treats those H1/H2 headings as authority.

`work-card-planning` and `work-card-repair` are now included in the shared `isArchitectInterviewDualPaneWorkspace()` selection. `App.tsx` no longer has `workCardArchitectLayoutWorkspaceIds`, and `styles.css` no longer defines `.work-card-architect-workspace` or its dedicated media rules.

## Acceptance Criteria Proof

1. Substantive Formal Work Card with additional H1/H2 examples inside a fenced block promotes through the real prepare/draft-detect/promotion service to `planning/phases/phase-01/Work_Cards/WC01_first_work_card.md` with Pending canonical metadata: covered by `formal Work Card promotion accepts substantive bodies with embedded heading examples`.
2. Substantive Formal Work Card without the former exact H1/H2 shape promotes to Pending: covered by `formal Work Card promotion accepts substantive bodies without the former heading shape`.
3. Empty Formal body and caller metadata delimiter body fail before final mutation; the absent final target remains absent and an existing RevisionRequested target remains byte-identical: covered by `formal Work Card retained validators reject empty and metadata drafts without final mutation`.
4. Substantive Repair Work Card with extra fenced H1/H2 examples and the exact authorized return target promotes to Pending: covered by `repair Work Card promotion accepts embedded heading examples when return target is present`.
5. Substantive Repair Work Card without former title or section shape promotes when the exact return target is present: covered by `repair Work Card promotion accepts substantive bodies without former title or section shape`.
6. Empty Repair body, caller metadata delimiter body, and missing-return-target body fail without mutating the existing final Repair Work Card bytes: covered by `repair Work Card retained validators reject empty metadata and missing return target without mutation`.
7. Formal and Repair prompts still include their approved section templates and exact temporary-draft invocation; no production validator treats those headings as authority: covered by prompt contract tests and source removal scans.
8. Byte-equivalent problematic structures with embedded literal H1/H2 examples pass through production promotion, not only helper validation: covered by the new Formal and Repair embedded-heading promotion tests.
9. After successful promotion, the workspace model exposes the Pending document with a logical document id and `canApplyDisposition=true`: covered by new Formal and Repair promotion assertions.
10. `work-card-planning` and `work-card-repair` use the shared `architect-interview-workspace` layout path: covered by `embedded Architect workspaces use dual-pane mode without changing other workspaces` and `Work Card Architect workspaces reuse the shared dual-pane layout`.
11. The Work Card-specific layout set, class, and media rules are absent: covered by renderer source assertions and scoped `rg` scans.
12. Pre-handoff Planning remains browser-free and still uses the existing intake handoff surface: preserved by no changes to `isWorkCardPlanningPreparation`; existing source tests still pass.
13. Single-output review activation, bundle viewing, revision, retry, metadata, disposition, and downstream Work Card Building behavior remain passing: covered by focused tests and complete Node test lane.
14. Positive and negative proof exercises real preparation, draft detection, slot validation, canonical promotion, no-mutation failure, workspace projection, and renderer layout paths: covered by focused service and renderer tests.
15. Typecheck, TypeScript build, Vite build, focused tests, and complete Node lane passed, with documented sandbox `spawn EPERM` reruns in the normal Windows lane where required.
16. No Git mutation occurred: no stage, commit, push, checkout, merge, rebase, reset, clean, or tag command was run. Read-only branch, remote, status, and scoped diff inspection was performed to satisfy repository execution rules.

## Commands Run And Results

- `pwd`: passed; verified approved repo root.
- `git status --short --branch`: passed; showed current feature branch and dirty/untracked files including the provided Work Card.
- `git remote -v`: passed; confirmed public `origin`.
- Scoped `git diff -- ...`: passed; reviewed source/test changes before report creation.
- `Get-Content planning/phases/phase-08/Work_Cards/WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md`: passed.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: passed.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`: passed.
- Scoped `rg` inspection for validators, layout selectors, and tests: passed.
- `npx tsc --noEmit`: passed in sandbox lane.
- `npx tsc`: passed in sandbox lane.
- `npx vite build`: sandbox lane failed with documented `spawn EPERM`; approved normal Windows lane passed.
- Focused `node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/architect-outputs/architect-output-workspace-repair.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/architect-output-workspace-source.test.cjs`: sandbox lane failed with documented `spawn EPERM`; approved normal Windows lane passed, 45 tests passed.
- Complete `node --test --test-concurrency=1`: first approved normal Windows attempt after Vite failed because Vite `emptyOutDir` removed compiled renderer test helper output under `dist/renderer/app`; this is a validation-artifact ordering issue outside the authorized source surface.
- `npx tsc`: rerun after Vite to restore TypeScript `dist` outputs; passed in sandbox lane.
- Complete `node --test --test-concurrency=1`: approved normal Windows lane passed, 222 tests passed.
- Scoped sensitive-value and local-path scan with `rg`: passed with no matches after report prose was worded to avoid scanner terms.

## Validation Performed

- TypeScript no-emit check: passed.
- TypeScript compile: passed.
- Vite renderer build: passed in approved normal Windows lane after documented sandbox failure.
- Focused production-path and renderer tests: passed, 45 tests.
- Complete Node test lane: passed, 222 tests, after restoring TypeScript `dist` outputs removed by Vite's renderer build cleanup.
- Scoped source scan confirmed removed production heading validators and removed Work Card-specific renderer layout class.
- Scoped safety scan found no sensitive credential material, environment-file references, archives/images, or concrete local machine paths in touched scope.

## Validation Skipped And Reason

- Electron launch smoke: not performed. This repair changes automated promotion validation and shared layout source selection; Operator visual acceptance remains the appropriate embedded browser and layout confirmation.
- Operator manual validation: not performed by Implementer; remains Operator-owned.

## Manual Validation Required

Operator should prepare a fresh Work Card Planning handoff after the retained failed draft, create a substantive draft with embedded heading examples, confirm promotion succeeds, confirm the Pending Work Card appears in the document pane, compare the Work Card Planning and Repair panes against the shared Architect dual-pane proportions, confirm pre-handoff Planning remains browser-free, and review/disposition the document normally.

## Security And Sensitive-Value Notes

No sensitive credential material, environment-file content, concrete local machine paths, broad filesystem authority, backend services, provider SDKs, or external integrations were introduced.

## Scope Expansion

No production scope expansion was introduced. Test updates were limited to the authorized capability tests and renderer source assertions required to prove the removed heading gates and shared layout reuse.

## Residual Risks

Removing heading gates intentionally allows poorly organized but substantive drafts to reach Pending review. That is the approved behavior, but it increases the importance of Operator and Architect review. The Vite build currently removes compiled renderer helper files needed by one Node test, so the complete test lane required a post-Vite `npx tsc` rerun to restore test artifacts.

## Blocking Questions

None.

## Recommended Next Implementer Task

Operator manual validation for WC43-REPAIR02, followed by Architect review of the validation-lane artifact ordering issue if the project wants the documented command sequence to run without the post-Vite TypeScript compile.
