# ISSUE_001-FC03-REPAIR01 — Embedded ChatGPT Pane Layout Collapse

## Parent Contract and Failed Evidence

Parent Fix Card:

`issues/ISSUE_001/Fix_Cards/ISSUE_001-FC03_issue_architect_planning.md`

Parent Implementer Report:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03_issue_architect_planning.md`

Operator validation failed because the embedded ChatGPT surface in Issue Architect Planning renders only as a shallow browser chrome strip instead of a usable right-hand Architect pane. This blocks full validation of FC03.

Failed parent requirements:

- Acceptance Criterion 4: the workspace must show the existing embedded ChatGPT surface as a usable Architect Planning surface.
- Operator Live Validation item 2: an Issue without an investigation must show Prepare/Copy Handoff and the embedded ChatGPT surface.

## Confirmed Defect and Root Cause

Repository inspection confirms the existing browser attachment/service path is reused correctly. The defect is in the new FC03 renderer layout.

`IssueArchitectPlanningWorkspace.tsx` places the browser inside:

```text
figma-browser-column issue-architect-browser-column
```

FC03 adds an intended minimum height:

```css
.issue-architect-browser-column .figma-browser-panel {
  min-height: 640px;
}
```

but a later existing rule of equal specificity wins the CSS cascade:

```css
.figma-browser-column .figma-browser-panel {
  flex: 1 1 auto;
  min-height: 0;
}
```

The result is a tall browser column whose actual `FigmaBrowserPanel` collapses to its tab/toolbar content. The native browser host therefore receives an unusably shallow rendered area, matching Operator evidence.

## Objective

Restore the FC03 Issue Architect Planning browser pane so the existing embedded ChatGPT surface occupies the intended right-hand Architect column at normal desktop widths and provides a stable, non-collapsed host area for native browser attachment.

## Authorized Surface

Inspect and modify only as necessary:

- `src/renderer/styles.css`
- `src/renderer/app/IssueArchitectPlanningWorkspace.tsx` only if a small layout-class correction is required
- `test/renderer/issue-architect-planning-workspace.test.cjs`
- one narrowly scoped browser-layout regression test if useful

The confirmed root cause is CSS/layout. Do not modify main-process browser services, preload IPC, attachment coordinator logic, Issue Architect service/promotion logic, or shared browser provider/session infrastructure unless new evidence disproves the confirmed root cause.

## Required Correction

Ensure the Issue Architect browser column and `FigmaBrowserPanel` have an effective usable height after the complete stylesheet cascade is applied.

At normal desktop widths:

- the browser pane must occupy the right-hand Architect column rather than collapse to browser chrome;
- the `architect-browser-host` must receive a substantial non-zero height suitable for ChatGPT interaction;
- the panel should remain approximately the intended 640px minimum or otherwise fill the available Architect column height cleanly;
- existing responsive single-column behavior may remain for narrower widths;
- the correction must not change shared browser behavior in Development workspaces.

Use the smallest CSS/layout correction that makes the Issue-specific rule effective. Do not redesign the Browser panel.

## Preservation Requirements

Preserve all FC03 behavior that passed code/evidence review:

- Issue Intake and Architect Planning navigation;
- Issue-specific sidebar and rail;
- current Issue evidence and Architect status/actions;
- Prepare/Copy Handoff behavior;
- temporary-draft and promotion model;
- read-only existing `ARCHITECT_INVESTIGATION.md` behavior;
- MCP workspace binding and `artifact_toolbox.write_markdown_artifact` contract;
- existing embedded browser service/session/attachment coordinator;
- Development browser behavior;
- FC01/FC02 behavior;
- Settings/Workflows state preservation.

## Forbidden Changes

Do not:

- create a second browser/WebContentsView/provider/session path;
- alter browser authentication or MCP behavior;
- change Issue Architect prompt or promotion semantics;
- implement FC04 or later Issue stages;
- broadly refactor shared renderer layout;
- repair unrelated stale tests;
- add dependencies;
- terminate active ChampCity for validation;
- perform Git mutation.

## Acceptance Criteria

1. At normal desktop width, Issue Architect Planning renders the embedded ChatGPT panel as a full usable right-hand pane rather than a shallow strip.
2. The rendered browser host has a stable substantial height and the native ChatGPT content occupies that host area.
3. Prepare/Copy/Promote controls and Issue Evidence remain laid out correctly beside the browser pane.
4. Narrow-width responsive behavior remains usable and does not introduce horizontal overflow or browser overlap.
5. Development embedded-browser layouts are unchanged.
6. No browser-service, provider/session, MCP, Issue Architect service, or later Issue lifecycle behavior is redesigned.

## Tests and Validation

Add focused regression proof that the final stylesheet ordering/effective Issue-specific layout cannot be overridden back to the collapsing `min-height: 0` behavior. Treat this as supporting proof; live Electron validation is required for the actual native browser bounds.

Run and report:

```text
npm run build
node --test test/renderer/issue-architect-planning-workspace.test.cjs
node --test test/browser/architect-browser-handoff.test.cjs
```

Run any new focused layout regression test added for this repair.

Do not make the unrelated stale `Select Project` source-string assertion in `architect-browser-attachment-coordinator.test.cjs` a repair requirement.

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03-REPAIR01_embedded_chatgpt_pane_layout_collapse.md`

Report:

- confirmed CSS/root-cause path;
- exact files changed;
- resulting effective browser-pane sizing rule;
- focused test/build results;
- proof Development browser presentation was preserved;
- remaining Operator live-validation step.

## Return Path

Return this repair for Architect review and Operator validation of the corrected Issue Architect Planning browser pane. If the pane is usable and the remaining FC03 validation passes, return to the parent FC03 workflow and complete FC03 before proceeding to FC04.
