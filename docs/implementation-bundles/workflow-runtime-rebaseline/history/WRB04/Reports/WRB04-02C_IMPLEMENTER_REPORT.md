# WRB04-02C Implementer Report

## Repository and card

- Verified the approved ChampCity_AI repository root and worked on `dev`.
- Card: WRB04-02C, Exact Source-Neutral Codex WorkItem Runtime.
- Branch/upstream before commit: `dev`, tracking `origin/dev`, 136 commits ahead; no push performed.

## Implementation

- Added the exact `{ ownerKind: "workflow-work-item", workflowId, workItemId }` selector to the Codex execution service and dedicated main/preload methods for exact status and start. Feature and Issue use the same path.
- The exact path resolves its eligibility and immutable execution contract through the shared Workflow execution application service. It rejects extra/source-mutation selector fields, ineligible WorkItems, and Workflows with any source binding before constructing the App Server adapter.
- The Current Project container remains the owner of Project State and evidence. Each execution receives a distinct `.champcity/runtime/work-item-workers/<executionRef>` working directory; the App Server can write only inside that worker directory. The application writes one bounded JSON result packet under `.champcity/runtime/work-item-attempts/` and finalizes through typed begin/finish WorkItem attempt commands.
- Added strict semantic completion parsing. Implemented results transition to `validation_pending`; partial, blocked, failed, and abandoned results stay in their typed historical attempt outcomes. The exact mode returns checkpoint status `not-required` and creates no SourceCheckpoint or Git state.
- Added the `not-required` checkpoint status to the shared checkpoint result contract. Classified that shared contract under the existing Codex runtime capability in `validation/capability-map.json` so the required exact-path planner can select proof for it.
- Files changed: `src/main/main.ts`, `src/main/workCardBuilding/codexImplementerExecutionService.ts`, `src/main/workflow/workflowExecutionApplicationService.ts`, `src/preload/index.ts`, `src/shared/workItemCheckpointContracts.ts`, `src/shared/workspaceContracts.ts`, `test/work-card-building/codex-implementer-execution-service.test.cjs`, `validation/capability-map.json`, and this report. No files were deleted. No dependency, migration, or permanent-validation promotion was added.

## Test reuse and coverage

- Reused unchanged Project State typed-attempt, Workflow projection, and source-neutral preparation tests.
- Added one permanent test inside the existing Codex Implementer execution-service test boundary. This closes the previously uncovered exact canonical Workflow/WorkItem selector path: same-title Feature/Issue resolution, prompt identity, policy and root separation, legacy resolver bypass, pre-start rejection, typed result finalization, packet bounds/identity, partial/failed history, and no SourceCheckpoint. No separate suite or test capability was needed because the existing Codex runtime test boundary owns this behavior.
- During the first broad focused invocation, the new fixture used a stale item version and had cleanup ordering issues; two existing renderer-facing cases also failed in that combined parallel run. The fixture was corrected; the exact test and both renderer-facing legacy cases then passed in the focused rerun.

## Evidence and validation

- `npm run build` — restricted attempt returned `spawn EPERM`; normal Windows lane passed. Final build also passed in the work-item profile. Vite emitted its existing 500 kB chunk-size advisory.
- `node --test --test-name-pattern="exact source-neutral Feature and Issue WorkItem selectors|renderer-facing preload/main start reaches" test/work-card-building/codex-implementer-execution-service.test.cjs` — normal Windows lane passed, 3 tests, 0 failures.
- `node --test test/workflow/workflow-execution-application-service.test.cjs test/project-state/execution-completion.test.cjs` — normal Windows lane passed, 21 tests, 0 failures.
- `npm run validate:plan -- --profile work-item --changes tmp/wrb04-02c-changes.json` — final exact changed-path preview passed, including the capability-map classification and report path.
- `npm run test:affected -- --changes tmp/wrb04-02c-changes.json` — normal Windows lane, run `938ea5a9-6aab-47ea-b03a-9378d372c7bb`, profile status `failed`, duration 259,963 ms. The profile-owned production build passed. Its sole failure was the existing unrelated React server-rendering hook failure in `test/project-intake/post-submit-review-state.test.cjs` (`WorkIntakeWorkspace` fixture). This result is not reported as a pass; the run also exceeded the ordinary affected-profile time budget.
- `git diff --cached --check` — passed on the final staged changes.
- No live model call, launch smoke, source checkout, Git checkpoint, external integration, or manual visual validation was required or claimed.

## Safety and Git

- No runtime import was added from tests, planning, archives, or generated output. Exact execution bypasses legacy Current Workspace, routed Implementer, Issue Fix Card, Markdown discovery/freshness, and source checkpoint paths.
- Worker write access is restricted to a per-execution runtime directory; evidence writes remain application-owned and contained under the Current Project `.champcity` runtime directory. Bounded staged-content scans found no concrete machine paths, credential patterns, or generated artifacts.
- Card-required checkpoint commit: pending at report creation; actual commit hash will be reported after commit without amending this report.
- Remaining residual risk: the unrelated React SSR profile failure above. Recommended next task after this checkpoint is WRB04-02D.
