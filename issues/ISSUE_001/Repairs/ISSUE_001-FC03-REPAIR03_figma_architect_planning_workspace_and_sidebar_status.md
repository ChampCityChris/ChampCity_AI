# ISSUE_001-FC03-REPAIR03 — Figma Architect Planning Workspace and Sidebar Status

## Failed Evidence

Parent Fix Card: `ISSUE_001-FC03`.

Operator validation after FC03 and REPAIR01 confirmed that the browser pane is now usable, but the overall Architect Planning workspace still does not match ChampCity's retained Figma Architect interaction pattern:

- FC03 uses a bespoke `issue-architect-layout` containing stacked status/evidence cards instead of the established document/review + browser/action split pane;
- no document disposition panel is present;
- Prepare/Copy/Promote actions are placed in the left status stack rather than the established browser-actions area;
- the left sidebar reports only Issue ID/title and gives no current stage/state;
- the result is visually dense and lacks the clear two-pane hierarchy already present in the Project Architect workspace.

The REPAIR01 browser sizing correction is passed and must be preserved.

REPAIR02 owns the Issue Architect recommendation/disposition/status authority consumed by this UI repair.

## Confirmed Root Cause

Repository inspection confirms:

- `IssueArchitectPlanningWorkspace.tsx` created a new `.issue-architect-layout` and `.issue-architect-main` presentation instead of reusing the retained `.figma-doc-chat-workspace`, `.figma-doc-review-column`, `.figma-browser-column`, and `.figma-disposition-panel` visual grammar;
- Issue Architect actions are embedded in `.issue-architect-status-panel`;
- `FigmaSidebar` accepts `currentIssue` but no Issue workflow status projection;
- the retained Project Architect surface already demonstrates the approved layout: document pane plus disposition below on the left, embedded ChatGPT plus browser actions on the right.

## Objective

Recompose Issue Architect Planning into the established Figma Architect workspace pattern and present the selected Issue's current stage/state in the left sidebar. Do not change Issue Architect decision authority, prompt semantics, or persistence beyond consuming REPAIR02's projection/actions.

## Required Changes

### 1. Use the retained Figma split-pane composition

At normal desktop width, Issue Architect Planning must use the existing visual structure:

```text
Left document/review column          Right Architect column
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Issue / Investigation doc    │    │ Embedded ChatGPT            │
│                              │    │                              │
│ scrollable document body     │    │ full usable browser pane    │
│                              │    │                              │
├──────────────────────────────┤    ├──────────────────────────────┤
│ Document Disposition         │    │ Browser / Handoff Actions    │
└──────────────────────────────┘    └──────────────────────────────┘
```

Use/reuse the retained Figma CSS/component grammar wherever semantics match:

- `.figma-doc-chat-workspace`;
- `.figma-doc-review-column`;
- `.figma-browser-column`;
- `FigmaBrowserPanel`;
- `.figma-disposition-panel` visual treatment;
- existing browser-action row/panel visual treatment.

Do not create another generic dashboard/card-stack layout.

### 2. Left document pane

The left pane must present Issue Architect evidence as a document workspace, not a status dashboard.

Required behavior:

- before a final investigation exists, show the selected `ISSUE_RECORD.md` as the active source document;
- after a final investigation exists, make `ARCHITECT_INVESTIGATION.md` the review document while retaining an obvious way to view the source Issue Record;
- document content is independently scrollable within the pane;
- path/title/status presentation follows the existing Figma document-card visual hierarchy;
- remove the large four-cell Issue Record / Final Investigation / Status / Temporary Draft fact grid from the primary workspace body.

A compact non-authoritative status line is acceptable; lifecycle authority comes from the Issue projection, not renderer-local inference.

### 3. Disposition panel

When an Architect Investigation is awaiting Operator review, render an Issue-specific disposition panel directly below the document pane using the established `figma-disposition-panel` pattern.

It must expose the REPAIR02 review actions and show at minimum:

- disposition selector;
- Apply Review action;
- review notes;
- current investigation identity;
- effective/current disposition;
- workflow step `Architect Planning`;
- Architect Recommendation.

`RevisionRequested` notes requirement and all progression logic remain service-owned.

Do not route Issue review through Development `reviewArchitectOutput()` or Development planning-document disposition authority.

### 4. Right Architect pane and actions

Keep the repaired full-height embedded ChatGPT pane.

Move Issue Architect operational actions into the right-side browser action area, following the established Architect workspace pattern. Include only actions relevant to current state, such as:

- Reload ChatGPT;
- Prepare Handoff;
- Copy Handoff;
- Promote Draft;
- Refresh.

Disabled/available state comes from the Issue Architect projection. Do not duplicate the same primary actions in the left document pane.

### 5. Sidebar current Issue status

Extend Issue Resolution sidebar presentation to consume the selected-Issue workflow status projection from REPAIR02.

Under `Current Issue`, show:

```text
ISSUE_NNN
<title>

Stage
Architect Planning

State
<current projected state>
```

The top Issue rail remains navigation/availability for the workflow and does not need to pretend the Intake stage is globally complete while multiple Issues may be open. The left pane gives the Operator the selected Issue's actual work status.

Do not calculate stage/state from renderer guesses or merely from the currently clicked rail button.

### 6. Responsive behavior

Preserve the existing desktop two-column Figma experience. At narrow widths, stack the two major columns using the same responsive principle as retained Figma workspaces; do not collapse the native browser host back to a shallow strip.

## Preservation

Preserve:

- REPAIR01 browser sizing and attachment behavior;
- REPAIR02 decision/disposition/status authority;
- FC02 multiple-Issue discovery/selection;
- Issue/Development workflow isolation;
- all existing Development Figma workspaces and disposition behavior;
- Settings/theme behavior.

## Forbidden Changes

Do not:

- redesign the browser service/attachment coordinator;
- change MCP prompt semantics or review persistence owned by REPAIR02;
- implement FC04+ lifecycle stages;
- reuse Development lifecycle authority merely to obtain the Figma appearance;
- add new packages;
- perform broad application restyling;
- mutate Git.

## Acceptance Criteria

1. Issue Architect Planning uses the retained Figma two-pane document/chat composition at normal desktop width.
2. The left side is a scrollable document/review column rather than the FC03 stacked status-card dashboard.
3. Before investigation, Issue Record is presented as source evidence; after investigation, the investigation is the review document with source evidence still accessible.
4. Awaiting-review state renders a Figma-style disposition panel below the document pane with disposition, notes, recommendation, and Architect Planning status.
5. Prepare/Copy/Promote/Reload/Refresh controls are presented in the right Architect action area and are not duplicated as primary left-pane actions.
6. Embedded ChatGPT remains a substantial usable pane and REPAIR01 sizing does not regress.
7. Issue sidebar shows selected Issue ID/title plus service-projected Stage and State.
8. Multiple open Issues retain independent selected status when switched; sidebar changes with the selected Issue.
9. Development Figma Architect surfaces remain unchanged.
10. Dark/Light and normal/narrow layouts remain usable.

## Tests

Add focused renderer proof that checks the actual Figma composition classes/components, disposition placement, right-side action placement, sidebar Stage/State, and preservation of the REPAIR01 browser sizing override.

Run at minimum:

```text
npm run build
node --test test/renderer/issue-architect-planning-workspace.test.cjs
node --test test/renderer/issue-resolution-shell.test.cjs
node --test test/renderer/figma-redesign-shell.test.cjs
node --test test/browser/architect-browser-handoff.test.cjs
```

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03-REPAIR03_figma_architect_planning_workspace_and_sidebar_status.md`

Report root cause, files changed, Figma composition reuse, disposition/sidebar wiring, REPAIR01 preservation, commands/results, deviations, and remaining visual validation.

## Return Path

Return to parent FC03 review. After REPAIR02 and REPAIR03 are implemented, rerun the remaining FC03 Operator validation before proceeding to FC04.
