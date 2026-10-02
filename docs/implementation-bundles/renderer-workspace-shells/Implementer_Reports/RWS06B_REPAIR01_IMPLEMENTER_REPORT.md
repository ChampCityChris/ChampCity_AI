# RWS06B-REPAIR01 Implementer Report

## Summary

- Card: RWS06B-REPAIR01 — Persist Exact Planning Workspace Identity.
- Repository root was verified as the active `Dev` checkout; branch: `dev`; `git branch -vv` shows no upstream tracking ref for this branch.
- Root cause: Prepare Planning was an alias for `get`, while renderer-local React state selected Planning. The SQL Workflow remained at its Architect stage.
- Added a bounded Structured Project State transition that validates current approved Intake and current approved Architect review, checks Research's typed outcome, and revises only `Workflow.body.currentWorkspace` with normal mutation evidence.
- Exact Planning stage mapping: Feature → `feature-planning`; Issue → `issue-planning`; Migration, Integration, Infrastructure, and Research → shared `planning`.
- Renderer dispatch now reconstructs the shared Planning surface from persisted SQL stage. Accepted `work-item-map` remains in execution and Prepare returns its accepted Plan without moving the Workflow backward.
- Research no-Plan enters `planning` without PlanReviewCycle, WorkItem, or SourceCheckpoint creation; execution remains rejected and typed Research closure remains available.

## Files changed

- `src/shared/projectState/projectStateService.ts`
- `src/main/workPlanning/exactWorkflowPlanningService.ts`
- `src/renderer/app/workflowPlanningDispatch.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/ExactWorkflowPlanningWorkspace.tsx`
- `test/workflow/workflow-planning-ipc.test.cjs`
- `test/workflow/workflow-application-service.test.cjs`
- `test/renderer/workflow-hub-shell.test.cjs`
- This report.

No schema, IPC, preload, or contract changes were needed. Greenfield and unrelated RWS06J work were not changed.

## Proof and validation

- `node --test --test-name-pattern="exact Planning uses profile|Research exact approved typed|Exact Planning refuses|Direct and WIR-linked" test/workflow/workflow-planning-ipc.test.cjs` — normal Windows lane, **9 passed**. Covers all six workflow families from normal workflow start, approved Intake, Architect preparation/review, persisted Planning, idempotence, reopen dispatch, accepted Plan remaining at `work-item-map`, Research no-Plan, and stale/unapproved Architect rejection.
- `node --test --test-name-pattern="refactor-migration explicitly prepares|integration-composition explicitly prepares|infrastructure-platform explicitly prepares|research-prototype explicitly prepares" test/workflow/workflow-application-service.test.cjs` — normal Windows lane, **4 passed**. Covers the four shared-workspace flows through application workflow start and Architect lifecycle; Research uses its typed no-Plan result.
- `node --test --test-name-pattern="exact planning dispatch follows supported type|four remaining Architect stages" test/renderer/workflow-hub-shell.test.cjs` — normal Windows lane, **2 passed**.
- `git diff --check` — passed (Git emitted line-ending advisories for existing dirty files).
- `npm run validate:plan -- --profile repair --changes tmp/changes-rws06b-repair01.json` — blocked before planning: validation catalog does not exactly cover executable tests; it lists the already modified `test/renderer/architect-interview-refresh-state.test.cjs` as an unowned executable test.
- `npm run test:repair -- --changes tmp/changes-rws06b-repair01.json` — same pre-existing catalog mismatch; no repair profile execution occurred.
- `npm run build` — failed at the already modified `src/main/main.ts:574` TypeScript error (`BrowserWindow | undefined` passed where `BaseWindow` is required). No changes were made to that unrelated file.
- The restricted-lane focused Node run returned `spawn EPERM` once; the equivalent focused tests were rerun in the normal Windows lane as documented by repository validation guidance.
- The complete renderer owner file has unrelated pre-existing assertion failures in the direct Feature/Issue workspace tests; the focused dispatch tests pass. The full Planning IPC owner file has one pre-existing Plan Review shell assertion failure; the lifecycle tests pass.

## Safety, Git, and remaining evidence

- Repair edits were limited to the files listed above. The post-commit index-scope correction below records the pre-existing staged files that were also captured by the checkpoint.
- No secrets or concrete machine paths were added to this durable report. No dependencies, generated artifacts, or schema changes were included.
- Required checkpoint commit: `RWS06B-R01 persist exact planning workspace identity` — `d209f60`.
- The focused behavior is verified; composed repair-profile and production build receipts remain blocked by the unrelated catalog and TypeScript baseline issues described above.
- Remaining operator validation: none for this bounded code path; return to the existing RWS06 bundle/J qualification workflow after this checkpoint.

## Post-commit index-scope correction

After `d209f60` was created, commit inspection showed that the Git index already contained staged RWS05 Architect-workspace changes before this repair's staging. The commit therefore also captured those pre-existing staged changes. This was discovered after commit creation; they were not reverted because they were already part of the user's index state. The extra committed paths were:

- `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR03_IMPLEMENTER_REPORT.md`
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`
- `src/renderer/app/ArchitectWorkspaceShell.tsx`
- `src/renderer/app/FigmaDocumentCard.tsx`
- `src/renderer/app/PlanReviewShell.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/styles.css`
- `src/shared/architectWorkspaceContracts.ts`
- `src/shared/structuredArchitectReviewState.ts` (deleted)
- `test/renderer/architect-interview-refresh-state.test.cjs` (deleted)
- `test/renderer/figma-redesign-shell.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`

The remaining staged and unstaged worktree changes were preserved. Commit `a2ef184` for RWS06I used an explicit path-limited commit and contains only that repair's two sources and report.
