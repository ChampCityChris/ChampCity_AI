# Work Card — Phase 08 WC21 Project Intake Required-Step Highlight and Inline Disposition Repair

Status: draft for Operator review
Owner: Implementer upon Operator approval
Phase: phase-08
Risk: medium
Depends on: completed WC20 Canonical Project Intake Identity, Explicit Approval, and Rail Status Repair
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md`

Upon Operator approval, this Work Card itself is the Implementer instruction. No separate activation artifact or Implementer handoff is required.

## Purpose

Complete the Project Intake workspace with exactly two UI corrections identified during WC20 Operator validation:

1. the left sidebar visually marks the current required workspace, but the corresponding top-rail card does not receive the same progress border when a different workspace remains selected;
2. Project Intake disposition controls are attached to the bottom of the document preview rather than to the selected Project Intake document card in the document selector.

This card changes presentation and component placement only. It does not change Project Intake artifact identity, dispositions, resolver rules, current-workspace calculation, rail lifecycle labels, prompt generation, repository selection, or any later lifecycle workspace.

## Operator Evidence

Observed state:

```text
Viewed workspace: Project Intake
Current required workspace: Architect Interview
Project Intake rail status: Completed
```

The left sidebar correctly shows Architect Interview with the required-step border while Project Intake remains the selected workspace. The top rail highlights Project Intake as selected but leaves Architect Interview visually indistinguishable from an ordinary available step.

The Project Intake document card appears in the left selector, while its disposition dropdown and Apply button are rendered at the bottom-right of the preview panel. The controls are visually separated from the document they operate on and consume preview height.

## Verified Code Ownership

### Viewed workspace and required workspace state

Owned by:

`src/renderer/app/App.tsx`

Existing state:

```ts
activeWorkspaceId
currentModel?.activeWorkspaceId
```

The sidebar already derives:

```ts
const isCurrentRequired = currentModel?.activeWorkspaceId === definition.id;
```

and applies the `required` class independently of the `active` viewed-workspace class.

The top rail currently receives only:

```tsx
<NestedWorkflowRail
  activeWorkspaceId={activeWorkspaceId}
  onWorkspaceChange={setActiveWorkspaceId}
  projectIntakeStatus={projectIntakeRailStatus}
  workspaceCounts={workspaceCounts}
/>
```

### Top-rail card presentation

Owned by:

`src/renderer/app/NestedWorkflowRail.tsx`

The top rail derives selection exclusively from `activeWorkspaceId`. It has no required-workspace input and therefore cannot render a second independent progress border.

### Project Intake document selector and disposition controls

Owned by:

- `src/renderer/app/App.tsx`
- `src/renderer/styles.css`

Current document selector rows are single `<button>` elements. The generic disposition controls are rendered inside `document-preview` after the preview body.

Interactive disposition controls cannot be placed inside the existing document-row `<button>` without invalid nested interactive markup. The selected Project Intake row must therefore be restructured into a container with a dedicated selection button and a sibling inline disposition region.

## Root Cause Analysis

### Defect 1 — Top rail represents view selection but not required progress

#### Failure chain

```text
Resolver/current model identifies Architect Interview as required
→ App applies required class to the matching sidebar button
→ App passes only activeWorkspaceId to NestedWorkflowRail
→ top rail derives state only from viewed workspace
→ Project Intake remains selected and highlighted
→ Architect Interview receives no required-step border
→ two navigation surfaces communicate different workflow progress
```

#### Primary root cause

The top rail has only one presentation dimension: viewed-workspace selection. The application already maintains a separate required-workspace state but does not pass it into the rail.

#### Correct model

```text
Viewed workspace
→ selected fill/highlight and aria-current

Current required workspace
→ independent progress border

Lifecycle status
→ existing card label such as Completed, Awaiting Approval, or Open
```

All three states may coexist. For example:

```text
Project Intake
- selected visually
- status Completed

Architect Interview
- not selected
- required border
- existing status Open
```

### Defect 2 — Disposition controls are detached from the selected document

#### Failure chain

```text
Operator selects Project Intake document in left selector
→ document preview opens on the right
→ disposition controls remain fixed at bottom of preview panel
→ controls are separated from selector card and document status badge
→ long preview requires attention at two distant locations
→ controls consume preview height and appear unrelated to the selector
```

#### Primary root cause

The shared document-preview layout treats disposition as a preview footer for all generic-disposition workspaces. Project Intake requires a document-selector-centered review interaction, but no Project Intake-specific placement exists.

#### Contributing cause

The selector row is implemented as one `<button>`, so adding a `<select>` and Apply button directly would create invalid nested interactive elements. A semantic row-shell refactor is required.

## Required Outcome

```text
Project Intake selected and complete
→ Project Intake top card remains visually selected and reads Completed
→ Architect Interview top card receives the required-step border
→ left sidebar and top rail indicate the same required workspace

Project Intake document selected
→ disposition dropdown and Apply button appear inside that selected document card
→ controls act on that document
→ preview panel contains document summary, feedback, and content only
```

## Required Repair 1 — Independent Required-Step Border on Top Rail

### App contract

Update `App.tsx` to pass the current required workspace into the top rail:

```tsx
requiredWorkspaceId={currentModel?.activeWorkspaceId ?? null}
```

The exact prop name may differ but must be explicit and typed.

Do not derive required state from `resolverResult` inside the rail. `App.tsx` already owns the current model and must remain the source of the prop.

### Rail behavior

Update `NestedWorkflowRail.tsx` so every primary top-rail card can independently determine:

```text
isSelected
isRequired
statusLabel
```

Requirements:

1. `activeWorkspaceId` continues to control selected fill/highlight and `aria-current="page"`.
2. `requiredWorkspaceId` controls an independent required-step border.
3. A card may be both selected and required.
4. A card may be required while another card is selected.
5. Required state must not replace lifecycle status text.
6. Project Intake must continue to display `Completed`, `Awaiting Approval`, `Open`, or `Conflict` as derived by WC20.
7. Architect Interview and later primary cards retain their current text labels under WC21; do not invent new lifecycle status semantics.
8. Do not restore the word `CURRENT`.
9. Do not change the lower Phase or Work Card loop rails.
10. Do not make the rail call IPC or inspect repository evidence.

### Visual treatment

Use the same semantic visual language as the sidebar required state:

- distinct green/teal required border;
- visible on dark unselected cards;
- visible when combined with selected cyan fill;
- no text replacement;
- no layout shift when required state changes.

The exact Tailwind class may differ, but the required border must be visually distinct from:

- selected cyan border;
- ordinary available slate border;
- status text.

A small inset edge or ring is acceptable. Do not add badges, icons, animation, or additional card height.

### Accessibility

- Preserve `aria-current="page"` for selection only.
- Add an accessible indication of required state to the button label, for example `Current required step`.
- Do not use `aria-current` for both selected and required when they differ.
- Do not encode required state through color alone in the accessible name.

## Required Repair 2 — Inline Project Intake Disposition in Document Selector

### Scope boundary

Move disposition controls only for:

```text
activeWorkspaceId === project-intake-capture
```

Preserve the existing disposition placement and specialized action behavior for all other workspaces.

### Selector row structure

Refactor the Project Intake document selector row into semantically valid elements.

Required structure concept:

```text
document-row-shell
├── document selection button
│   ├── filename
│   ├── path
│   └── current disposition badge
└── inline disposition controls [selected Project Intake only]
    ├── disposition select
    └── Apply Disposition button
```

Requirements:

1. Do not nest `<select>` or Apply button inside the document selection `<button>`.
2. Clicking the document-selection region continues to select the document.
3. Inline controls appear only on the selected Project Intake document.
4. Unselected Project Intake cards remain compact selectors.
5. The current disposition badge remains visible.
6. The dropdown uses the existing `selectedStatus` state and existing disposition options.
7. Apply uses the existing `applyDisposition()` path and existing synchronized disposition service.
8. Preserve disabled behavior for no selection, local pair error, read error, no chosen disposition, and in-progress apply.
9. Do not create a new disposition API, action path, authority, or state store.
10. Do not automatically apply a disposition when the dropdown changes.
11. Do not allow controls for prompt evidence or documents outside Project Intake Capture.

### Preview placement

When `activeWorkspaceId === "project-intake-capture"`:

- do not render the generic bottom `disposition-controls` footer in `document-preview`;
- retain document summary, header, errors, feedback, confirmation context, and preview body;
- allow the preview body to use the reclaimed vertical space.

For all other non-specialized workspaces, preserve the existing generic preview-footer disposition controls.

### Visual layout

Inside the selected Project Intake card:

- controls should sit below the filename/path/status content;
- use a clear divider or spacing within the selected card;
- dropdown and Apply button must fit the selector width without horizontal overflow;
- stack vertically at narrow widths when necessary;
- maintain the dark theme;
- do not cover neighboring cards;
- do not expand every unselected card.

The selected card may grow in height while controls are shown.

### Status refresh

After Apply:

- the card badge must update from Pending to the resulting disposition;
- the rail must update from `Awaiting Approval` to `Completed` when Approved;
- current required workspace must update to Architect Interview when the resolver does so;
- the new Architect Interview required border must appear in the top rail;
- Project Intake may remain the viewed and selected workspace.

Use the existing post-disposition document and current-model refresh path. Do not force navigation solely to show progress.

## Required Repair 3 — Focused State and Regression Tests

No new renderer-testing dependency is authorized.

### Required-step presentation helper

Extract a narrowly scoped pure helper only if needed to make the distinction testable without React rendering. It may live under:

```text
src/shared/workspaces/
```

or another existing bounded shared location.

Test at minimum:

1. Project Intake viewed, Architect Interview required:
   - Project Intake selected true, required false;
   - Architect Interview selected false, required true.
2. Architect Interview viewed and required:
   - selected true and required true.
3. Project Intake viewed and required:
   - selected true and required true.
4. Required state does not alter Project Intake lifecycle status text.
5. No required workspace produces no required rail card.

Do not create a general workflow-presentation engine.

### Disposition behavior regression

Existing service and resolver tests must remain green for:

- Pending Intake creation;
- explicit approval;
- rail status changing to Completed;
- Architect Interview becoming required after approval;
- revised Intake returning to Pending.

A bounded pure layout predicate may be tested if introduced, for example:

```text
shouldRenderInlineProjectIntakeDisposition
```

but source-string assertions must not be reported as visual acceptance.

### Visual evidence boundary

Operator validation remains controlling for:

- required-border visibility;
- selected-plus-required combined styling;
- inline control placement;
- selector-card expansion;
- narrow-width stacking;
- preview height recovery.

No Playwright or new dependency is authorized.

## Authorized Files

Production changes are limited to:

```text
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/styles.css
```

One narrowly scoped pure presentation helper is authorized only when needed for behavioral tests.

Expected tests may include:

```text
test/renderer/project-rail-presentation.test.cjs
test/project-intake/post-submit-review-state.test.cjs   [only if behavior requires]
```

Do not modify main-process services, Project Intake artifact generation, resolver ordering, disposition persistence, prompt content, or shared document classification.

## Explicit Non-Goals

Do not:

- revise WC20 artifact identity or archive handling;
- change Project Intake Pending/Approved semantics;
- change Project Intake rail lifecycle labels;
- change resolver/current-model rules;
- change sidebar required highlighting;
- redesign the top rail;
- add progress text or new status labels to Architect Interview;
- change lower loop rails;
- move disposition controls for other workspaces;
- change disposition options or approval authority;
- change post-submit confirmation;
- change preview content or Markdown rendering;
- change repository selection;
- change embedded browser behavior;
- add dependencies;
- perform Git operations.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Perform a non-acceptance Electron launch smoke confirming only that:

- the app launches;
- top rail renders with the new required-workspace prop;
- Project Intake document selector renders without invalid-interaction crashes;
- disposition application does not crash;
- no immediate layout failure occurs.

Launch smoke does not establish visual acceptance.

## Acceptance Criteria

WC21 is acceptable for Operator validation only when:

1. `App.tsx` passes the current required workspace explicitly to the top rail;
2. top-rail selection and required-step presentation are independent;
3. Project Intake may remain selected while Architect Interview receives a required border;
4. a card may be both selected and required without losing either visual state;
5. Project Intake lifecycle status remains `Completed`, `Awaiting Approval`, `Open`, or `Conflict` as appropriate;
6. no top-rail card displays `CURRENT`;
7. required state is included in the accessible label;
8. the selected Project Intake document card contains the disposition dropdown and Apply button;
9. interactive controls are not nested inside the document-selection button;
10. unselected cards remain compact;
11. the generic preview-footer disposition controls are absent in Project Intake Capture;
12. generic or specialized disposition placement in other workspaces is unchanged;
13. applying a disposition uses the existing service path;
14. card badge, rail status, current model, and required border refresh after disposition;
15. Project Intake may remain viewed after approval while Architect Interview is marked required;
16. the preview gains the footer space formerly used by Project Intake disposition controls;
17. controls fit the selector at supported widths without overflow;
18. typecheck, build, and all tests pass;
19. the Implementer Report distinguishes automated evidence from Operator visual acceptance;
20. no unrelated subsystem, dependency, or Git mutation is introduced.

## Implementer Report Requirements

Create:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC21_project_intake_required_step_highlight_and_inline_disposition_repair.md`

The report must include:

- repository, remote, branch, and starting dirty-tree inventory;
- exact files created, modified, and deleted;
- final selected-versus-required rail state model;
- exact prop passed from App to the rail;
- final required-border visual classes;
- accessibility behavior;
- final Project Intake selector row structure;
- confirmation that no interactive element is nested inside another interactive element;
- exact condition controlling inline disposition rendering;
- exact condition suppressing the preview-footer disposition controls;
- disposition apply/refresh behavior;
- tests added or changed;
- typecheck, build, and full test results;
- launch-smoke result and limitations;
- remaining Operator visual checks;
- final repository status;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator will perform controlling validation after Architect review.

Required checks:

1. Open Project Intake after its Intake document is Approved and Architect Interview is required.
2. Confirm Project Intake remains visually selected and reads `Completed`.
3. Confirm Architect Interview receives the required-step border in the top rail.
4. Confirm the left sidebar and top rail identify the same required workspace.
5. Navigate to Architect Interview and confirm it can appear both selected and required.
6. Navigate back to Project Intake and select the Intake document.
7. Confirm disposition controls appear inside the selected document card.
8. Confirm no disposition controls remain at the bottom of the Project Intake preview.
9. Confirm unselected cards remain compact.
10. Confirm the selected card’s filename, path, badge, dropdown, and Apply button remain readable.
11. Apply `RevisionRequested` or `Rejected` in a disposable fixture and confirm the card badge updates.
12. Apply `Approved` and confirm the rail changes to `Completed` and Architect Interview becomes required.
13. Confirm Project Intake remains viewed unless manually changed.
14. Repeat at maximized, minimum, and intermediate window sizes.
15. Confirm the inline controls stack without horizontal overflow.
16. Navigate to another generic-disposition workspace and confirm its existing preview-footer controls remain unchanged.

## Document Disposition

Document.Status=Pending
