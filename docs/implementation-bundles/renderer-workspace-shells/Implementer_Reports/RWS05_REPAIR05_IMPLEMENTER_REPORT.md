# RWS05-REPAIR05 Implementer Report

## Scope and source context

- Card: RWS05-REPAIR05, bounded renderer composition/layout repair.
- Repository root verified as the `Main` application checkout; implementation performed in the `dev` worktree. The `dev` worktree was already broadly dirty before this repair. Those unrelated changes, including unrelated portions of `App.tsx` and the RWS06J work, were preserved.
- The card’s cited runtime screenshot evidence was supplied in the card. I did not launch the desktop app or independently reproduce that screenshot. Source inspection confirmed the stale browser grid allocation, inconsistent review JSX, loose Architect output controls, and Greenfield caller passing the entire browser-column wrapper.

## Implementation

- Browser-column ownership is now in `ArchitectWorkspaceShell` via the shared `.figma-browser-column` contract. Its companion is expected to be the browser panel itself, and Browser Actions render as the following sibling in that same flex column.
- Greenfield Architect, Planning, Phase Map, Phase Loop, and Work Item Planning now pass the unwrapped `FigmaBrowserPanel` to shells that own their browser column. Other legacy routes retain their existing browser-column composition.
- `FigmaBrowserPanel` already had the fake tab and address chrome removed in this worktree. Its CSS grid is now three rows: toolbar, flexible native host, and status. The native host/ref and reload/retry/status attachment behavior remain intact.
- Added `ReviewDecisionPanel`, now shared by `StructuredArchitectWorkspace` and `PlanReviewShell`. It owns only presentation and emits typed inputs. Parents continue supplying exact `expectedRecordVersion`; Revision Requested remains disabled for empty notes. No acknowledgement prerequisite was introduced.
- Architect Review output is contained in an Architect Output panel with a bounded 100,000-character JSON textarea and styled Save button. Existing candidate validation and SQL intake/cycle identity payload are unchanged.
- The Greenfield `Continue to Project Planning` action is in a named Workflow action panel, styled as a button, and remains gated by `nextStageReady`.
- Added explicit button affordance, hover, focus, and disabled styles for the shared decision panel, with specificity that overrides generic disposition button rules.

## Files changed

- `src/renderer/app/App.tsx` (task-scope browser panel extraction/call normalization mixed with pre-existing unrelated changes; only the task hunks are attributable to this repair)
- `src/renderer/app/ArchitectWorkspaceShell.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/PlanReviewShell.tsx`
- `src/renderer/app/ReviewDecisionPanel.tsx` (new)
- `src/renderer/styles.css`
- `test/renderer/figma-redesign-shell.test.cjs` (updated existing assertion for the shared component)
- `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR05_IMPLEMENTER_REPORT.md` (this report)

No main/preload/export IPC, schemas, workflow state, or browser attachment orchestration was changed. The existing document-review test includes focused Markdown Export proof; no new test file was necessary.

## Validation

- `npm run test:repair -- --changes .tmp/rws05-repair05-changes.json` — failed before test selection/execution because the validation catalog does not exactly cover executable tests. The planner listed pre-existing coverage gaps including `issue-close-workspace`, `issue-fix-card-workspaces`, `issue-planning-workspace`, `issue-resolution-shell`, `issue-screenshot-intake`, `issue-validation-workspace`, and `issue-screenshot-submission-wiring`.
- Restricted-lane focused Node tests and `npm run build` encountered `spawn EPERM`; per the validation lane instructions these were retried once in the normal Windows lane.
- Normal Windows lane: `node --test test/renderer/figma-redesign-shell.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/renderer/architect-browser-attachment-coordinator.test.cjs test/renderer/document-review-surface-source.test.cjs` — PASS, 35 tests, 0 failures. Includes browser attachment coordinator proof, browser chrome proof, exact-current-review decision proof, document review and Markdown Export proof.
- Normal Windows lane: `npm run build` — PASS; TypeScript and Vite production renderer build completed.
- `git diff --check` — PASS (only pre-existing CRLF normalization warnings were printed).

## Review and remaining validation

The exact visible runtime arrangement to inspect is: document/review/output panels in the left column; the embedded ChatGPT native host filling the remaining height in the right column; Browser Actions below that host; Review Decision with contained notes and three buttons; and Architect Output with its bounded structured JSON textarea and Save button. Automated source/render proof and build passed, but an Electron runtime visual check remains for the screenshot-specific layout.

The card requires checkpoint commit `RWS05-R05 restore architect browser and review composition`. The checkout has extensive unrelated dirty work and `App.tsx` itself contains unrelated staged-candidate changes. No checkpoint commit was created in this pass to avoid capturing unrelated Operator work. The report and task changes remain uncommitted for a safe task-only checkpoint after the mixed-file staging boundary is reviewed.

