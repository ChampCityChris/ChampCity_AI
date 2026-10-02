# RWS06J-C Implementer Report — Retire Obsolete Legacy Workflow Services

## Repository and task

- Repository root verified from the active Git worktree; branch: `dev`.
- Card: `RWS06J-C`; checkpoint commit required: `RWS06J-C retire obsolete legacy workflow services`.
- Remote state: no push performed; repository changes remain local.

## Implementation

Removed the unreachable migrated Issue Resolution/current-workspace services, legacy renderer-only workflow workspaces and orchestration helpers, obsolete generic Codex execution compatibility, dead routed integration repair services, and their retired IPC/preload/shared-contract methods. Greenfield Phase selection now uses the exact SQL navigation WorkItem identity and structured phase intake preparation. Removed tests that proved only the deleted behavior and removed their capability-map proofs; retained SQL workflow, generated projection, and Markdown export coverage.

Deleted production modules include `issueResolutionService`, `currentWorkflowService`, `workCardApplicationContext`, legacy development-environment repair, routed integration repair, and the legacy Issue/Work Card renderer workspace components. The exact file list is present in the checkpoint diff.

## Remaining Markdown callsite classification

- **Active workflow authority — defect/remove:** no canonical Markdown read or write surface remains on the selected structured Workflow routing, Intake, Architect, Planning, WorkItem, execution, validation, repair, or close IPC path. Public legacy navigation/disposition routes and contracts were removed.
- **Generated readability projection/export — keep:** structured Intake, Architect/review, and routing projections are generated from SQL; Markdown Export remains an explicit export operation.
- **Historical/evidence-only — keep:** bounded document inventory/revision helpers remain for historical evidence and compatibility code paths outside selected structured Project authority. They do not select current SQL Workflow/WorkItem state.
- **Dead migrated workflow code — delete:** the renderer-only legacy workflows, old Issue/current-workspace services, their IPC/preload/contracts, and their retired tests were deleted.
- **Unrelated functionality — leave:** Source Control and non-workflow application features were not changed.

## Validation

- `npm run build` — passed in the normal Windows lane (TypeScript, Vite renderer build, branding assets).
- `npm run validate:static` — passed in the normal Windows lane; production build and 3 static tests passed.
- Focused retained workflow/API suite (`runtime-wiring-source`, `workflow-hub-shell`, `phase-planning-service`, `phase-map-service`) — 56 tests passed in the normal Windows lane.
- Focused Codex WorkItem lifecycle suite — 5 tests passed in the normal Windows lane.
- `git diff --check` — passed after cleanup.
- Initial sandbox build/test invocations returned `spawn EPERM`; the equivalent commands were rerun in the normal Windows lane. An early focused run exposed obsolete test assertions and a removed helper; those were corrected, then the retained suites passed.

## Git and safety

- No push or external service action performed.
- Before checkpoint commit: staged diff reviewed for secrets, concrete local paths, and generated output; none found.
- Commit hash is reported in the final completion summary; this report is committed with the checkpoint and therefore does not embed its own hash.
- Remaining manual validation: none required by this card. Residual risk: legacy compatibility code still contains non-authoritative Markdown reads in bounded helper branches; RWS06J-D activates the structured Project fence.
