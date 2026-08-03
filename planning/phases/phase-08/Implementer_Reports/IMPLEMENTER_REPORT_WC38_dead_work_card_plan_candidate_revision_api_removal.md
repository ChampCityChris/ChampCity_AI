# IMPLEMENTER REPORT WC38 - Dead Work Card Plan Candidate Revision API Removal

## Pass Type

Numbered Work Card implementation pass for WC38.

## Repository Path Inspected

Verified approved repo root. Durable report uses repo-relative paths only.

## Branch And Remote Status

- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote: `https://github.com/ChampCityChris/ChampCity_AI.git`
- Worktree status before and after this pass contained many pre-existing modified and untracked files from prior Phase 08 work. WC38 changes were kept to the authorized source deletion and this report.
- Git mutation: not performed. WC38 prohibits Git mutation.

## Files Created

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC38_dead_work_card_plan_candidate_revision_api_removal.md`

## Files Modified

- `src/main/phasePlanning/phasePlanningService.ts`

## Files Intentionally Not Created

- No production replacement API file.
- No compatibility wrapper, alias, IPC route, preload method, renderer action, migration, sidecar, or cleanup utility.
- No new test file. A focused compiled-service proof command was used instead of adding test count for its own sake.

## Implementation Summary

Deleted the exported `reviseWorkCardPlanCandidates()` API from `src/main/phasePlanning/phasePlanningService.ts`.

Exact deleted source range from the pre-change file:

- `src/main/phasePlanning/phasePlanningService.ts:294` through `src/main/phasePlanning/phasePlanningService.ts:316`

The preserved Phase Planning path remains:

- `candidatesFromWorkCardPlanBody()` parses the `champcity-work-card-plan` fenced body block.
- `validateCandidates()` validates the parsed array.
- atomic Phase Planning bundle promotion writes the same validated candidate array to `metadata.workflowData.candidates`.
- downstream Work Card selection reads canonical metadata through `selectNextWorkCardCandidate()`.

No imports were removed because `validateCandidates` and `WorkCardCandidate` remain used by the preserved canonical metadata read path in `getPhasePlanningCompletion()`.

## Acceptance Criteria Evidence

1. Removed API absent from source and compiled output:
   - `rg -n "reviseWorkCardPlanCandidates" src test dist` returned no matches after `npx tsc`.
2. No replacement mutation path added:
   - `rg -n "setWorkCardPlanCandidates|updateWorkCardPlanCandidates|rewriteWorkCardPlanCandidates|candidate[- ]revision|candidateMutation|metadata-only" src test dist/main` found no WC38 replacement path. The only match was an unrelated existing governance repair stale-selection error in compiled output.
3. Atomic promotion still parses body and projects the exact validated candidate array:
   - Existing test `phase planning handoff uses one atomic draft bundle and promotes both outputs` passed in the full suite and verifies `metadata.canonical.workflowData.candidates` equals the body-authored candidate array.
4. Downstream Work Card selection still reads canonical metadata:
   - Existing test `work card intake selects eligible candidate and writes Markdown-only handoff` passed in the full suite.
   - Additional compiled-service proof promoted a real Phase Planning bundle, approved it, and called `selectNextWorkCardCandidate()`. Result:
     - `{"draftSubmissionState":"promoted","selectionState":"selected","selectedCandidate":"WC38PROOF"}`
5. Work Card Plan body and metadata cannot be independently changed through the deleted application API:
   - The only independent mutation API was removed, and no source/test/compiled export remains for `reviseWorkCardPlanCandidates`.
6. Candidate schema, resolution status, ordering, dependency, evidence, completion, and selection rules unchanged:
   - No candidate validator, parser, atomic bundle definition, selection service, completion logic, renderer behavior, or IPC/preload code was edited by this pass.
7. Validation lane:
   - Typecheck passed.
   - TypeScript build passed.
   - Vite build passed in the approved normal Windows lane after sandbox `spawn EPERM`.
   - Full Node test suite passed in the approved normal Windows lane after sandbox `spawn EPERM`.
8. Git operation:
   - No staging, commit, push, merge, rebase, tag, reset, clean, restore, or stash was performed.

## Commands Run And Results

- `pwd`
  - Result: confirmed approved repo root.
- `git status --short --branch`
  - Result: read-only status showed current feature branch and extensive pre-existing dirty state.
- `Get-Content planning/phases/phase-08/Work_Cards/WC38_dead_work_card_plan_candidate_revision_api_removal.md`
  - Result: read WC38.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`
  - Result: read repository boundary.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`
  - Result: read validation lane guidance.
- `rg -n "reviseWorkCardPlanCandidates|candidatesFromWorkCardPlanBody|selectNextWorkCardCandidate|validateCandidates|metadata\\.workflowData\\.candidates" src test planning/phases/phase-08/Work_Cards/WC38_dead_work_card_plan_candidate_revision_api_removal.md`
  - Result: found the deleted API only in `src/main/phasePlanning/phasePlanningService.ts` among production source.
- `rg -n "reviseWorkCardPlanCandidates" src test dist`
  - Result before rebuild: stale compiled `dist` still contained the export.
  - Result after rebuild: no matches.
- `npx tsc --noEmit`
  - Lane: Direct Clean-Room Automated Validation.
  - Result: passed.
- `npx tsc`
  - Lane: Direct Clean-Room Automated Validation.
  - Result: passed.
- `npx vite build`
  - Lane: sandbox attempt.
  - Result: failed with documented `spawn EPERM`.
- `npx vite build`
  - Lane: approved normal Windows rerun.
  - Result: passed; 1617 modules transformed; renderer bundle written.
- `node --test --test-concurrency=1`
  - Lane: sandbox attempt.
  - Result: failed with documented `spawn EPERM` before assertions; 48 file-level spawn failures.
- `node --test --test-concurrency=1`
  - Lane: approved normal Windows rerun.
  - Result: passed; 200 tests passed, 0 failed.
- Compiled-service proof through Node stdin:
  - Result: passed after correcting the expected selection state label to `selected`.
  - Output: `{"draftSubmissionState":"promoted","selectionState":"selected","selectedCandidate":"WC38PROOF"}`
- `rg -n "setWorkCardPlanCandidates|updateWorkCardPlanCandidates|rewriteWorkCardPlanCandidates|candidate[- ]revision|candidateMutation|metadata-only" src test dist/main`
  - Result: no replacement WC38 mutation API. One unrelated existing compiled governance repair stale-selection string matched `candidate revision`.
- `rg -n "[secret-value-and-local-machine-path-patterns]" src/main/phasePlanning/phasePlanningService.ts`
  - Result: no matches.

## Validation Performed

- TypeScript typecheck.
- Electron/main/preload/shared TypeScript build.
- Vite renderer production build.
- Complete compiled Node test suite.
- Source/test/compiled absence search for removed symbol.
- Focused compiled-service promotion-to-selection proof.

## Validation Skipped And Reason

- Operator manual validation: not performed. WC38 has no new Operator-facing behavior and the Implementer is not authorized to claim Operator acceptance.
- Electron launch smoke: not performed. WC38 removed dead production API surface and did not change UI/runtime reachability.

## Git Actions Performed

No Git mutation performed.

- Commit created: no.
- Commit hash: not applicable because WC38 prohibits Git mutation.
- Tag: none.

## Security And Secret-Safety Notes

- No secrets, tokens, credentials, API keys, `.env` files, or private key material were added.
- No concrete local machine paths were written into this durable report.
- Renderer filesystem access was not changed.

## Manual Validation Required

None for WC38 beyond Operator review of this report and source diff. No running-product acceptance was claimed.

## Residual Risks

- The working tree contains extensive pre-existing unrelated dirty state, so final review should isolate the WC38 source deletion and this report from other pending Phase 08 changes.
- `dist` was refreshed by validation, but Git mutation remains prohibited and no staging decision was made.

## Blocking Questions

None.

## Recommended Next Implementer Task

Proceed to the next approved Phase 08 Work Card after Operator or Architect review confirms WC38 source deletion and validation evidence.
