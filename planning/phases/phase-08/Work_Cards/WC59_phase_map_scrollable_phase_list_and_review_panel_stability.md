<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC59"
  },
  "sourceRevisions": [],
  "workflowData": {
    "title": "Phase Map Scrollable Phase List and Review Panel Stability",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Phase Map workspace layout repair",
    "confirmedDefect": "The Phase Map workspace renders a long phase list inside a card whose overflow is hidden while vertical scrolling is assigned to the containing left column. In the current review layout, a 15-phase map is visibly clipped after the first several phases and no usable scrollbar is exposed for the phase list, preventing the Operator from reviewing every phase before disposition.",
    "rootCause": "The Phase Map workspace does not establish a bounded flex/grid height chain from workspace to card to phase list. .figma-phase-map-column scrolls as a whole, .figma-phase-map-card hides overflow, and .figma-phase-map-list has no flex/min-height/overflow contract. The long list therefore cannot become the dedicated scroll region. The repository already contains the correct bounded-list pattern in the Work Card Map list: flex growth, min-height: 0, overflow-y: auto, and a visible thin scrollbar.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC59_phase_map_scrollable_phase_list_and_review_panel_stability.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair only the Phase Map review layout so every phase is reachable through an internal vertical scroll region while the Phase Map header and disposition controls remain stable. Preserve Phase Map data, accordion behavior, review/disposition behavior, Architect pane behavior, and all other workspaces.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC59 — Phase Map Scrollable Phase List and Review Panel Stability

Status: Approved for Implementer execution  
Phase: `phase-08`  
Git mutation: prohibited

## Operator-Observed Defect

In the Phase Map `Review & Validation` workspace, a project Phase Map containing 15 phases shows only the first several phases within the visible card. The phase list has no usable vertical scrollbar, so later phases cannot be reviewed.

Observed layout:

```text
Phase Map card
  header
  phase 00 expanded
  phase 01
  phase 02
  phase 03
  phase 04
  phase 05 partially visible
  remaining phases unreachable

Document Disposition panel remains below the card
```

The Operator must be able to review all phases before applying a disposition.

## Verified Repository Evidence

Current Phase Map presentation is implemented in:

```text
src/renderer/app/phaseMapPresentation.tsx
src/renderer/app/App.tsx
src/renderer/styles.css
```

Current production structure in `App.tsx`:

```text
.figma-phase-map-workspace
  .figma-phase-map-column
    FigmaPhaseMapWorkspace
      .figma-phase-map-card
        .figma-phase-map-card-header
        .figma-phase-map-list
    FigmaArchitectReviewPanel
  architect browser column
```

Confirmed current CSS:

```text
.figma-phase-map-workspace
  height: 100%
  min-height: 0
  overflow: hidden

.figma-phase-map-column
  display: grid
  align-content: start
  min-height: 0
  overflow: auto

.figma-phase-map-card
  overflow: hidden

.figma-phase-map-list
  display: grid
  no flex growth
  no min-height: 0
  no overflow-y contract
  no scrollbar contract
```

The repository already uses the desired bounded-list pattern for the Work Card Map:

```text
.figma-work-card-map-list
  flex: 1 1 auto
  min-height: 0
  overflow-y: auto
  scrollbar-width: thin
```

The Phase Map component already renders every canonical phase through:

```tsx
phases.map(...)
```

No data truncation or phase-count defect is present in `phaseMapPresentation.tsx`. This is a layout/overflow defect.

Existing Phase Map tests:

```text
test/renderer/phase-map-presentation.test.cjs
```

already prove canonical phase ordering, active-phase accordion rendering, metadata-driven phase content, and work-card counts. They do not currently prove the bounded scroll layout.

## Objective

Make the Phase Map phase list the dedicated vertical scroll region so every phase in a long Phase Map is reachable without moving or obscuring the document disposition controls.

Required layout behavior:

```text
Phase Map workspace fills available viewport height
        ↓
left Phase Map column fills available height
        ↓
Phase Map card flexes into remaining space above review panel
        ↓
Phase Map header remains fixed within card
        ↓
phase list receives remaining card height
        ↓
phase list scrolls vertically
        ↓
Document Disposition panel remains below card and usable
```

A 15-phase map must permit scrolling from phase 00 through phase 14.

## Required Changes

### 1. Make the Phase Map left column a bounded vertical layout

Update `.figma-phase-map-column` so it does not use whole-column scrolling as the primary mechanism for long phase maps.

Required semantics:

```text
display: flex
flex-direction: column
min-width: 0
min-height: 0
overflow: hidden
```

Preserve the existing gap between the Phase Map card and disposition panel.

The disposition panel must remain an auto-sized sibling below the Phase Map card.

### 2. Make the Phase Map card consume the available phase-review region

Update `.figma-phase-map-card` so it participates in the bounded height chain.

Required semantics:

```text
display: flex
flex-direction: column
flex: 1 1 auto
min-height: 0
overflow: hidden
```

The card header must not shrink when the phase list grows.

If needed, explicitly set the header to `flex: 0 0 auto`.

Existing error/feedback/empty-state content must remain readable and must not cause the Phase Map list to escape the card boundary.

### 3. Make `.figma-phase-map-list` the dedicated vertical scroll region

Update `.figma-phase-map-list` with the bounded-list semantics already used elsewhere in the repository:

```text
flex: 1 1 auto
min-height: 0
overflow-y: auto
scrollbar-width: thin
```

Preserve its existing grid layout, phase spacing, margins, padding, active-row expansion, and list-style behavior.

A visible native/WebView scrollbar must be allowed. Do not hide the scrollbar with `scrollbar-width: none` or `::-webkit-scrollbar { display: none; }`.

The list may use the browser/Electron native scrollbar appearance; no custom scrollbar component is required.

### 4. Preserve review controls outside the scrolling phase list

Do not move `FigmaArchitectReviewPanel` inside `.figma-phase-map-card` or `.figma-phase-map-list`.

The review/disposition panel must remain visible below the Phase Map card at the normal workspace size while the user scrolls through phases.

The Operator must not have to scroll past phase 14 merely to reach `Select disposition`, review notes, or `Apply Review`.

### 5. Preserve compact/hidden Architect-pane behavior

`.figma-phase-map-workspace.chat-hidden` currently collapses to one column.

Preserve that behavior.

Do not reintroduce whole-workspace vertical scrolling as a substitute for the dedicated phase-list scroll region.

The Phase Map phase list must remain scrollable whether the Architect/browser pane is visible or hidden.

### 6. Add regression proof

Extend `test/renderer/phase-map-presentation.test.cjs` or add one narrowly scoped Phase Map workspace style test.

Automated proof must inspect the production CSS and assert:

- `.figma-phase-map-column` is a bounded vertical flex container with `min-height: 0` and does not use `overflow: auto` as the long-list solution;
- `.figma-phase-map-card` is a flex column with `flex: 1 1 auto`, `min-height: 0`, and `overflow: hidden`;
- `.figma-phase-map-list` has `flex: 1 1 auto`, `min-height: 0`, `overflow-y: auto`, and a visible/thin scrollbar contract;
- `.figma-phase-map-list` is not configured to hide its scrollbar;
- the existing component still renders every phase from metadata rather than slicing/truncating the phase array;
- the disposition panel remains a sibling after `FigmaPhaseMapWorkspace` in `.figma-phase-map-column`, not nested inside the scrolling list.

Add a representative 15-phase fixture/render assertion proving the presentation component renders all 15 phase IDs into markup. This distinguishes layout reachability from data truncation.

## Preserved Behavior

Preserve unchanged:

- canonical Phase Map metadata parsing;
- phase ordering by `order`;
- all phase titles, IDs, purposes, source references, and work-card counts;
- active/current phase selection;
- accordion row behavior and `aria-expanded` semantics;
- Phase Map Copy/Open actions and current Open-disabled behavior;
- Phase Map error and Needs Attention behavior;
- Project/Phase workflow navigation;
- Architect/browser pane visibility toggle;
- Phase Map document disposition logic, status choices, review notes, and Apply Review behavior;
- all Project Planning, Phase Planning, Work Card, Codex, MCP, and development-environment behavior;
- all other Figma document/work-card-map workspace layouts;
- no Git mutation.

## Authorized Surface

Primary production file:

```text
src/renderer/styles.css
```

`src/renderer/app/phaseMapPresentation.tsx` may be changed only if a narrowly necessary wrapper/class hook is proven required for the scroll layout. Do not change Phase Map data/projection semantics.

`src/renderer/app/App.tsx` may be changed only if a narrowly necessary layout wrapper/class hook is required. Do not change disposition or workflow logic.

Tests authorized:

```text
test/renderer/phase-map-presentation.test.cjs
```

A narrowly scoped additional renderer/style test file may be added under `test/renderer/` if useful.

Required Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC59_phase_map_scrollable_phase_list_and_review_panel_stability.md
```

## Acceptance Criteria

1. A Phase Map containing 15 phases renders all 15 phase rows from canonical metadata.
2. The Phase Map phase-list region has an independently usable vertical scrollbar whenever its content exceeds available height.
3. The user can reach the final phase without scrolling the Document Disposition panel offscreen.
4. `.figma-phase-map-column` provides a bounded full-height vertical layout rather than using whole-column scrolling for the long phase list.
5. `.figma-phase-map-card` flexes to the available height above the review panel and cannot grow beyond the workspace height chain.
6. `.figma-phase-map-list` uses `flex: 1 1 auto`, `min-height: 0`, and `overflow-y: auto` or an exactly equivalent bounded-scroll implementation.
7. The Phase Map scrollbar is not intentionally hidden.
8. The Phase Map card header remains visible while the phase list scrolls.
9. The Document Disposition panel remains visible and usable below the card at normal application viewport sizes.
10. Expanded/current phase accordion behavior remains unchanged.
11. Selecting another phase continues to expand that phase normally, including phases reached by scrolling.
12. Architect/browser pane visible and hidden modes both retain a usable Phase Map list scroll region.
13. No Phase Map data is sliced, truncated, paginated, or omitted to make the UI fit.
14. No unrelated workspace layout changes are introduced.
15. Existing Phase Map presentation tests remain green.
16. New regression tests prove the bounded scroll CSS/layout contract and a 15-phase render.
17. `npm run typecheck`, `npm run build`, and `npm test` pass through the normal ChampCity validation lanes.
18. No Git mutation is performed.

## Negative Constraints

Do not:

- limit the number of rendered phases;
- add pagination as a substitute for scrolling;
- collapse later phases solely to make all rows fit;
- move the Document Disposition panel inside the phase-list scroll region;
- make the entire application/body scroll to compensate for this defect;
- hide the Phase Map scrollbar;
- add a custom scrollbar library;
- redesign the Phase Map card visual language;
- change Phase Map generation, canonical metadata, phase ordering, workflow authority, or disposition semantics;
- change Architect browser sizing except for a narrowly necessary consequence of the bounded Phase Map column;
- change Work Card Map behavior while copying its established scroll pattern;
- alter WC57/WC58 implementation or Codex behavior;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Manual Validation

Use a real project Phase Map containing at least 15 phases.

1. Open the Phase Map `Review & Validation` workspace with the Architect/browser pane visible.
2. Confirm the Phase Map card header and Document Disposition panel are both visible.
3. Confirm a visible vertical scrollbar appears for the phase-list region when the list exceeds the available card height.
4. Scroll from phase 00 to the final phase.
5. Confirm every intermediate phase is reachable and the final phase is fully visible.
6. Select a later phase and confirm it expands normally.
7. Confirm the Document Disposition panel remains available below the Phase Map card without requiring scrolling through the phase list to reach it.
8. Hide the Architect/browser pane and repeat the phase-list scroll check.
9. Restore the Architect/browser pane and confirm the list remains usable.
10. Apply no disposition unless separately performing the normal Phase Map review workflow.

## Return Target

```text
WC59 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC59_phase_map_scrollable_phase_list_and_review_panel_stability.md
→ Architect code review
→ Operator UI validation with 15-phase Phase Map
```

## Implementer Report Requirements

The Implementer Report must remain `Pending` and include:

- exact files changed;
- before/after CSS/layout chain;
- confirmation that no phase data was truncated or paginated;
- exact scroll container chosen;
- confirmation that the disposition panel remains outside the scrolling list;
- automated test additions and results;
- typecheck/build/full-test commands, working directory, and exit results;
- manual validation still required;
- any residual risk or skipped validation;
- confirmation that no Git mutation occurred.
