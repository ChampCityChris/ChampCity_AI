# RWS05-REPAIR05 — Restore Architect Browser Host and Review Panel Composition

**Status:** IMPLEMENTER_READY  
**Parent:** RWS05-REPAIR03 / RWS05-REPAIR04  
**Failed source checkpoints:** RWS05-REPAIR03 effective source as present through `2dc7906db4b06d34f0eb42918fa8f22d29eb87d1`; RWS05-REPAIR04 `5c1d133b91687e4ab6af6a905a261348470684c4`  
**Repair type:** bounded shared renderer composition/layout repair

## Failed review evidence

Architect source review plus Operator runtime screenshots proved three remaining defects after RWS05-REPAIR03/04:

1. The right-side embedded ChatGPT pane no longer occupies the browser column. The runtime shows only the browser status toolbar and Browser Actions, followed by an empty column.
2. The Architect Review disposition surface is visually/layout-wise inconsistent with the existing Planning review disposition and does not present the decision actions with the same clear button treatment.
3. The lower Architect review column still contains loose actions/content:
   - `Continue to Project Planning`
   - `Architect structured JSON`
   - raw textarea
   - `Save Architect output`

   These appear as unowned page content instead of deliberate panels/actions.

Operator direction: the Architect Review decision surface should use the same presentation model as the existing Planning review disposition.

## Confirmed source facts

### Browser host

`ArchitectWorkspaceShell.tsx` currently renders:

```text
figma-doc-chat-workspace
├─ figma-doc-review-column
└─ architect-browser-column
   ├─ browserCompanion
   └─ browserActions
```

The new `architect-browser-column` class has no layout contract in `styles.css`.

The actual shared browser sizing rules belong to `.figma-browser-column`, including flex-column ownership and:

```css
.figma-browser-column .figma-browser-panel {
  flex: 1 1 auto;
  min-height: 0;
}
```

Current call sites are inconsistent:

- exact structured workflows pass an unwrapped `FigmaBrowserPanel`;
- the Greenfield Architect surface currently passes `architectBrowserColumn`, which is already wrapped in `.figma-browser-column`.

This creates either a missing shared column contract or nested browser-column ownership.

### FigmaBrowserPanel

RWS05-REPAIR04 removed the decorative tab row but left the old four-row grid:

```css
grid-template-rows: auto auto minmax(0, 1fr) auto;
```

The component now has only three children:

1. real toolbar;
2. native browser host;
3. status.

Therefore the native browser host is no longer assigned the flexible `minmax(0, 1fr)` row.

### Review decision

`StructuredArchitectWorkspace.tsx` and `PlanReviewShell.tsx` each hand-build nearly identical exact-version review disposition JSX instead of sharing one presentation owner.

The Planning surface is the visual reference requested by the Operator.

### Architect output controls

`StructuredArchitectWorkspace.tsx` appends the JSON textarea, Save action, and Greenfield next-stage action directly into `reviewContent` after the document/disposition content, with no panel/action ownership.

## Confirmed defect

RWS05-REPAIR03/04 fixed the semantic actions but left the visual composition incomplete:

- the browser host has lost its usable layout rectangle;
- equivalent review decisions have diverged into duplicate presentation code;
- Architect output/navigation actions can still read visually as loose text instead of deliberate controls.

## Objective

Restore one stable shared Architect workspace composition:

```text
LEFT COLUMN
┌────────────────────────────────────┐
│ tabbed document review             │
├────────────────────────────────────┤
│ Review Decision (review tab only)  │
├────────────────────────────────────┤
│ Architect Output                   │
│ [structured JSON textarea]         │
│ [Save Architect Output]            │
├────────────────────────────────────┤
│ next-stage action when applicable  │
└────────────────────────────────────┘

RIGHT COLUMN
┌────────────────────────────────────┐
│                                    │
│          Embedded ChatGPT          │
│                                    │
│                                    │
├────────────────────────────────────┤
│ BROWSER ACTIONS                    │
│ [Reload] [Prepare] [Copy Handoff]  │
└────────────────────────────────────┘
```

Use the same shared Review Decision component for Architect Review and Planning review.

## Required implementation

### 1. Establish exactly one shared browser-column owner

`ArchitectWorkspaceShell` must own the browser column.

Use the existing shared `figma-browser-column` layout contract or an equivalent shared class with the same semantics.

Required behavior:

- one column wrapper only;
- flex column;
- `min-width: 0`;
- `min-height: 0`;
- browser panel consumes remaining available height;
- Browser Actions remains fixed below the browser panel;
- no nested `.figma-browser-column` wrappers.

Normalize callers so `browserCompanion` means the browser panel/content, not a pre-wrapped complete browser column.

For the current Greenfield Architect call path, pass the unwrapped browser panel rather than `architectBrowserColumn`.

Do not move browser attachment orchestration into `StructuredArchitectWorkspace`.

### 2. Correct FigmaBrowserPanel grid geometry

The shared browser panel now has three actual regions and must use a three-row grid:

```text
toolbar           auto
native host       minmax(0, 1fr)
status            auto
```

Remove the obsolete row allocation left behind by the deleted fake browser tab.

Preserve:

- native host ref;
- Reload;
- Retry;
- status text;
- attachment/bounds/detach behavior;
- RWS05-REPAIR04 removal of fake `chatgpt.com` and decorative tab chrome.

Do not restore fake browser chrome.

### 3. Extract one shared Review Decision presentation

Create one shared renderer component/presentation owner for exact-version review decisions and use it from both:

- `StructuredArchitectWorkspace`;
- `PlanReviewShell`.

It must own only presentation and typed callbacks/inputs, not workflow semantics.

Required inputs/capabilities:

- label/header, default **Review Decision**;
- Operator notes;
- current revision availability;
- busy state;
- Approve callback;
- Revision Requested callback;
- Reject callback;
- Revision Requested requires nonempty notes;
- exact current revision is supplied by each parent workflow.

Required visual behavior:

- same layout in Architect Review and Planning;
- explicit panel border/header;
- notes field contained within the panel;
- three visually obvious buttons;
- hover/focus/disabled treatments remain recognizable as controls;
- enabled buttons must not visually collapse into ordinary text;
- no `I have reviewed this revision` prerequisite returns.

Preserve exact `expectedRecordVersion` semantics in the parent review commands.

Do not move domain review logic into the shared component.

### 4. Repair button styling specificity

Inspect the current stylesheet cascade.

The generic disposition button rule currently has greater/later specificity than `.apply-button` and can override the intended primary button treatment.

Adjust the shared decision CSS so the actual decision buttons retain clear button affordance and the desired Planning-style presentation.

Do not solve this with inline styles.

### 5. Give Architect structured output a deliberate panel

The existing structured JSON transport remains required and authoritative only as transport into SQL.

Wrap it in an explicit Architect Output panel, for example:

```text
ARCHITECT OUTPUT
Structured JSON
[ textarea ]

[ Save Architect Output ]
```

Requirements:

- textarea remains bounded at the existing 100,000-character limit;
- existing workflow-specific `validateArchitectCandidateOutput(...)` remains unchanged;
- Save still uses the exact SQL Intake/cycle identities;
- Save action must be a visibly styled button;
- the panel must not masquerade as a Markdown editor/document authority.

Reuse existing panel/card visual primitives where practical; do not create a separate design system.

### 6. Remove floating next-stage action

`Continue to Project Planning` must not remain as a bare button/text element between the document viewer and JSON editor.

If the explicit next-stage action is still required by the current Greenfield route, place it in a deliberate workflow-action/footer region and style it as a real button.

Preserve its existing readiness condition:

- unavailable until `nextStageReady`;
- no new approval gate;
- no change to Project Planning eligibility.

Do not redesign workflow navigation as part of this repair.

## Preserve

Do not change:

- SQL semantic authority;
- Intake/Architect Review identity/version semantics;
- Architect candidate schemas or validation;
- exact review Decision semantics;
- RWS06B Planning persistence;
- Markdown Export IPC/API from RWS05-REPAIR04;
- Copy behavior;
- removal of fake Open;
- removal of fake ChatGPT browser tab/address;
- browser attachment generation/bounds/detach mechanics;
- optional WIR;
- topology/execution/validation/close behavior;
- global `project_state_authority`;
- unrelated RWS06J preparation or dirty files.

## Explicitly out of scope

- App.tsx structural cleanup planned by revised RWS06J, except the narrow current Greenfield browser-companion call normalization needed by this repair;
- new workflow navigation model;
- new domain state;
- schema changes;
- Markdown authority changes;
- redesigning Planning review semantics;
- changing Export behavior;
- historical Markdown cleanup.

## Expected production scope

Primary:

- `src/renderer/app/ArchitectWorkspaceShell.tsx`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/PlanReviewShell.tsx`
- `src/renderer/app/figma/FigmaBrowserPanel.tsx`
- `src/renderer/styles.css`

Narrow supporting:

- a new shared review-decision presentation component if extracted;
- `src/renderer/app/App.tsx` only for the current Greenfield browserCompanion normalization;
- existing renderer tests that own these surfaces.

Do not alter main/preload/export IPC unless a regression is found; Export is already accepted in concept and is not part of this repair.

## Regression proof

Inspect existing tests and capability map first. Prefer extending existing renderer owners.

Prove at minimum:

1. `ArchitectWorkspaceShell` renders exactly one shared browser-column wrapper.
2. Greenfield and exact structured Architect paths pass an unwrapped browser panel into that shell.
3. the browser panel has a three-row layout with the native host as the flexible row.
4. Browser Actions renders after/below the browser panel in the same right column.
5. the native `architect-browser-host` remains present and receives usable flexible-height ownership.
6. no decorative browser tab/address chrome returns.
7. Architect Review and Planning render the same shared Review Decision component/presentation.
8. Approve and Reject are visibly enabled buttons for a current revision.
9. Revision Requested is visibly a button and remains disabled without notes.
10. no production source contains the acknowledgement prerequisite.
11. Architect JSON transport appears inside a deliberate Architect Output panel with a styled Save button.
12. the Greenfield next-stage action is not loose review-content text and remains gated by `nextStageReady`.
13. exact `expectedRecordVersion` is still submitted by both Architect and Planning review paths.
14. RWS05-REPAIR04 Markdown Export focused proof remains green.
15. browser attachment coordinator proof remains green.

A screenshot alone is not sufficient proof, but the Implementer Report must identify the exact visual structure that should be manually observable.

## Validation

Run:

- focused renderer shell/browser/review tests;
- focused structured Architect tests;
- focused PlanReviewShell test;
- existing browser attachment coordinator test;
- existing Markdown Export/document review tests;
- repair profile with the exact changed-path set;
- `git diff --check`.

Use the repository validation planner/profile rather than duplicate full build/typecheck commands unless selected by the profile.

Report unrelated failures separately.

## Acceptance criteria

RWS05-REPAIR05 passes when:

1. the embedded ChatGPT browser visibly occupies the flexible right-column area in both Greenfield and exact structured Architect workflows;
2. Browser Actions is below the browser and does not consume/collapse the native host area;
3. no nested/missing browser-column ownership remains;
4. Architect Review and Planning use one shared Review Decision presentation;
5. review actions are visually obvious buttons with correct disabled/hover/focus behavior;
6. Architect structured JSON and Save are contained in a deliberate panel;
7. any explicit next-stage action is deliberately placed/styled and remains readiness-gated;
8. all semantic behavior accepted from RWS05-REPAIR03/04 remains intact;
9. focused regression proof passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR05_IMPLEMENTER_REPORT.md`

Include:

- screenshot/runtime defect reproduced;
- source root cause;
- exact files changed;
- browser-column ownership before/after;
- browser grid before/after;
- shared Review Decision component/presentation;
- Architect Output panel composition;
- next-stage action placement;
- tests reused/extended/new with coverage-gap justification;
- repair-profile results;
- unrelated failures;
- remaining visual validation, if any.

## Checkpoint and return path

Commit:

`RWS05-R05 restore architect browser and review composition`

Then return RWS05-REPAIR03/04/05 together for Architect source review.

This card creates no new Operator approval or execution gate.
