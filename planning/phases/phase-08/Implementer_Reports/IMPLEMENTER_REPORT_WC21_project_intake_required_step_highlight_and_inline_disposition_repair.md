# Implementer Report - WC21 Project Intake Required-Step Highlight and Inline Disposition Repair

Pass type: numbered Work Card implementation

## Repository And Starting State

- Repository path inspected: verified approved repo root (`<PROJECT_REPO>`).
- Remote: `origin https://github.com/ChampCityChris/ChampCity_AI.git`.
- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
- Starting dirty-tree inventory:
  - Modified before this pass: `planning/phases/phase-08/Work_Cards/WC21_project_intake_required_step_highlight_and_inline_disposition_repair.json`
  - Modified before this pass: `planning/phases/phase-08/Work_Cards/WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md`
- Work Card scope: presentation and placement repair only.

## Files Created

- `src/shared/workspaces/projectRailPresentation.ts`
- `test/renderer/project-rail-presentation.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md`

## Files Modified

- `src/renderer/app/App.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/renderer/styles.css`

## Files Deleted

- None.

## Files Intentionally Not Created

- No new renderer test framework, Playwright tests, provider SDK, database, cloud service, migration, IPC channel, preload method, or main-process service was created.
- No new Project Intake disposition API, approval authority, or workflow state store was created.

## Implementation Summary

`App.tsx` now passes the current required workspace into the top rail with:

```tsx
requiredWorkspaceId={currentModel?.activeWorkspaceId ?? null}
```

`NestedWorkflowRail.tsx` separates primary-card presentation into selected, required, and status dimensions. Selection still comes from `activeWorkspaceId` and retains `aria-current="page"` only for the viewed workspace. Required state comes from `requiredWorkspaceId` and adds `Current required step` to the accessible label without replacing lifecycle status text.

The final selected-versus-required rail model is:

- Project Intake viewed and Architect Interview required: Project Intake is selected and can read `Completed`; Architect Interview is not selected but is required.
- Architect Interview viewed and required: Architect Interview is both selected and required.
- Project Intake viewed and required: Project Intake is both selected and required and retains its Project Intake lifecycle label.
- No required workspace: no top-rail card receives required presentation.

Project Intake document selector rows now use this structure:

```text
document-row-shell
document-selection-button
inline-disposition-controls
```

The inline controls appear only when:

```ts
activeWorkspaceId === "project-intake-capture" &&
selectedDocumentId === document.logicalDocumentId
```

The generic preview-footer disposition controls are suppressed when:

```ts
activeWorkspaceId === "project-intake-capture"
```

Generic preview-footer controls remain available for non-specialized, non-Project-Intake workspaces. Specialized workspaces still show the existing specialized-authority message.

## Required Border Visual Classes

Top-rail required state adds:

```text
ring-2 ring-inset ring-[#8ab4a7]/90
```

This is independent of the selected cyan fill/highlight and does not add card height or layout shift.

## Accessibility Behavior

- `aria-current="page"` remains tied only to the selected/viewed workspace.
- Required state is exposed in the button accessible name with `Current required step`.
- Required state is not represented by color alone.
- No top-rail card displays `CURRENT`.

## Project Intake Selector And Disposition Behavior

- The selected Project Intake document card contains the disposition dropdown and Apply button.
- The document-selection region remains a button.
- The dropdown and Apply button are siblings of the selection button, so no interactive element is nested inside another interactive element.
- The dropdown uses the existing `selectedStatus` state and existing disposition options.
- Apply uses the existing `applyDisposition()` path and `window.champcity.setDocumentDisposition(...)`.
- Disabled behavior remains tied to no selected document, no selected disposition, local pair/read error, and in-progress apply.
- Applying Project Intake approval refreshes documents, resolver result, and current model while preserving the viewed Project Intake workspace so the top rail can show Project Intake selected and Architect Interview required.

## Tests Added Or Changed

- Added `test/renderer/project-rail-presentation.test.cjs`.
- Added pure helper coverage for selected-versus-required rail state, required-plus-selected combinations, Project Intake status preservation, no-required behavior, Project Intake inline-control predicate, and preview-footer suppression.
- Existing Project Intake service, corpus, resolver, and post-submit review tests remained green.

## Commands Run And Results

- `pwd` - passed; verified approved repo root.
- `git status --short --branch` - passed; recorded branch and dirty-tree state.
- `git remote -v` - passed; recorded `origin`.
- `Get-Content -Raw docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` - passed.
- `Get-Content -Raw docs/dev/VALIDATION_COMMAND_LANES.md` - passed.
- `Get-Content -Raw planning/phases/phase-08/Work_Cards/WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md` - passed.
- `npm run typecheck` - passed in sandbox lane.
- `npm run build` - failed in sandbox lane with documented `spawn EPERM`; rerun in normal Windows lane passed.
- `npm test` - failed in sandbox lane with documented `spawn EPERM` during build; rerun in normal Windows lane passed with 257 passing tests.
- Electron launch smoke - passed in normal Windows lane; the built app process stayed alive for 8 seconds and was shut down.

## Validation Performed

- Typecheck: passed.
- Build: passed in normal Windows lane after documented sandbox `spawn EPERM`.
- Full tests: passed in normal Windows lane, 257 passing tests.
- Non-acceptance launch smoke: passed for immediate process startup/no early crash.
- Scoped code review: confirmed no nested interactive Project Intake controls and no `CURRENT` rail label restoration.

## Validation Skipped And Reason

- Operator visual acceptance was not performed by the Implementer.
- Border visibility, selected-plus-required visual combination, inline control placement, selector-card expansion, narrow-width stacking, and preview height recovery remain Operator visual checks.
- No Playwright validation was run because WC21 did not authorize Playwright or a new renderer-testing dependency.
- Disposition application was not manually exercised in the launched Electron UI; automated tests cover the existing disposition services and the new renderer placement predicates, while Operator validation remains controlling for live UI acceptance.

## Launch Smoke Result And Limitations

Result: passed for process startup. The app launched from the built output and did not crash immediately.

Limitations: this smoke does not establish visual acceptance, responsive layout acceptance, or live Operator workflow acceptance.

## Security And Safety Notes

- No secrets, credentials, API keys, password values, token values, `.env` contents, cookies, session storage, concrete local machine paths, archives, screenshots, or build artifacts were added to source or durable report content.
- Renderer filesystem authority was not broadened.
- No dependency was added.
- No IPC, preload, or main-process service authority was changed.

## Git Actions Performed

- No staging, commit, branch switch, push, merge, rebase, tag, reset, clean, restore, or stash was performed.
- Commit hash: pending; no commit was created because WC21 says Git mutation is not authorized.

## Final Repository Status

Expected remaining dirty files after this pass:

- Pre-existing modified Work Card JSON and Markdown files:
  - `planning/phases/phase-08/Work_Cards/WC21_project_intake_required_step_highlight_and_inline_disposition_repair.json`
  - `planning/phases/phase-08/Work_Cards/WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md`
- WC21 implementation/report files:
  - `src/renderer/app/App.tsx`
  - `src/renderer/app/NestedWorkflowRail.tsx`
  - `src/renderer/styles.css`
  - `src/shared/workspaces/projectRailPresentation.ts`
  - `test/renderer/project-rail-presentation.test.cjs`
  - `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md`

## Manual Validation Required

Operator validation remains required for:

1. Project Intake selected and complete while Architect Interview receives the top-rail required border.
2. Left sidebar and top rail identifying the same required workspace.
3. Architect Interview showing both selected and required when viewed.
4. Project Intake selected document card containing filename, path, badge, dropdown, and Apply button.
5. No Project Intake preview-footer disposition controls.
6. Unselected cards remaining compact.
7. Inline controls stacking without horizontal overflow at supported window sizes.
8. Applying RevisionRequested, Rejected, and Approved in a disposable fixture and confirming badge, rail status, current model, and required border refresh.
9. Other generic-disposition workspaces retaining preview-footer controls.

## Residual Risks

- Visual polish and responsive behavior require Operator inspection.
- Project Intake live UI disposition application was not manually exercised by the Implementer.
- The working tree includes pre-existing Work Card JSON/Markdown modifications outside this implementation pass.

## Blocking Questions

- None.

## Architect Review Disposition

Disposition: Approved for Operator validation.

Source review confirms:

- `App.tsx` passes `currentModel?.activeWorkspaceId ?? null` to the top rail independently from the viewed `activeWorkspaceId`;
- primary top-rail cards can be selected, required, both, or neither without replacing lifecycle status text;
- required state is exposed in the accessible label while `aria-current` remains selection-only;
- Project Intake selector rows use a noninteractive shell with sibling document-selection and disposition controls;
- no `<select>` or Apply button is nested inside the document-selection button;
- inline disposition controls render only for the selected document in Project Intake Capture;
- the generic preview-footer disposition controls are suppressed only for Project Intake and specialized workspaces;
- Project Intake approval preserves the viewed Project Intake workspace when the resolver advances to Architect Interview waiting, allowing the rail to show Project Intake selected and Architect Interview required.

The Implementer-reported typecheck, normal-Windows build, and full test result of 257 passing tests are accepted as reported evidence. The Architect did not independently execute those commands.

Operator visual and live-workflow validation remains controlling for final WC21 acceptance.

## Recommended Next Task

Perform the WC21 Operator validation checklist. Do not begin another Project Intake repair unless validation identifies a concrete defect.

## Document Disposition

Document.Status=Approved
