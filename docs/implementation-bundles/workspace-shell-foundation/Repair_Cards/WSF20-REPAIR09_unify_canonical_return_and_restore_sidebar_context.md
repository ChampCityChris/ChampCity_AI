# WSF20-REPAIR09 — Unify canonical return and restore workflow sidebar context

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D26, WSF20-D27  
**Starting baseline:** `29cd604156d9c7643bb4e53725d9c3d489e64224`

## Objective

Correct two remaining navigation/presentation regressions:

1. returning to the exact current stage from the rail must use the same fresh SQL resolver path as **Resume current stage**;
2. the left sidebar must again show the canonical workflow context: current Stage, Phase and Work Card state.

No SQL/domain redesign.

# D26 — one canonical return path

## Governing rule

`getGreenfieldNavigation()` is the sole authority for the current required Greenfield stage and identities.

Do not maintain a second renderer-only implementation of 'return to current stage'.

## Required correction

### 1. Canonical rail click uses the same resolver path as Resume

When a rail click targets the current required stage rather than an explicitly selected historical Phase/WorkItem context:

- call the same `refresh()` / canonical resume function used by **Resume current stage**;
- await/read a fresh `GreenfieldNavigationProjection` from SQL;
- replace selection with `selectionFromSql(result)`;
- clear inspection;
- clear stale local navigation error on success.

Do not merely copy identities from the renderer's cached `navigation` object.

### 2. Preserve inspection navigation

Do not call the resolver for ordinary historical inspection navigation.

Required behavior:

- completed Project Planning → completed Architect Interview remains inspection-only and does not read SQL;
- historical Phase/Work Card switching remains presentation-only;
- clicking the exact current required rail destination performs the canonical refresh and exits inspection;
- sidebar **Resume current stage** invokes the same canonical refresh function;
- both paths land on the same stage/Phase/WorkItem/Repair identities.

### 3. Phase Intake live regression

Add a regression around the actual current `PhaseInterviewWorkspace`:

1. SQL resolver says current workspace is `phase-interview` for Phase A;
2. a Phase Interview review candidate exists and is pending Operator disposition;
3. Operator navigates to a prior Project/Phase stage;
4. Operator clicks Phase Intake/Phases rail destination;
5. fresh resolver is called;
6. composed `PhaseInterviewWorkspace` receives exact Phase A and `readOnly=false`;
7. actual `FigmaDocumentDispositionPanel` select is enabled;
8. Approve / Request Revision / Reject can be selected under existing readiness rules;
9. Apply Review persists the exact current Phase Interview review;
10. approval advances through the existing canonical resolver.

Do not weaken Phase Interview's `readOnly` or disposition checks. Fix navigation state.

# D27 — restore canonical workflow status in the left sidebar

## Historical behavior to restore

The pre-RWS sidebar displayed workflow context including current Phase and current Work Card information. RWS removed that presentation while collapsing App state.

Restore the information, but source it from current SQL navigation rather than legacy `CurrentWorkspaceModel`.

## Required data contract

Introduce a bounded renderer presentation contract, e.g. `WorkflowSidebarContext`, carrying:

- `workflowId`;
- canonical Stage label / workspace ID;
- canonical stage reason or concise state;
- Phase context derived from `navigation.executionContext.phase` and current `phaseStates`;
- Work Card context derived from `navigation.executionContext.workCard` and current `workItemStates`;
- optional current Repair identity where applicable.

Greenfield registers this context with App whenever its SQL `navigation` projection changes and clears it on Workflow change/unmount.

App passes it to `FigmaSidebar` only when it belongs to the currently open Workflow.

Do not make the sidebar query SQL directly.

## Sidebar presentation

While a Greenfield Workflow is open, render a scrollable current-workflow context section between Workflows/Resume and Settings.

At minimum show:

### Current Stage

- human-facing stage label from the registered workspace definitions, not raw internal ID as the primary label;
- concise canonical reason/state;

### Current Phase

When active:

- Phase title;
- Phase ID in bounded/secondary text;
- Phase position (`Phase N of M`) when available;
- Phase state from current SQL `phaseStates`;
- Phase loop step.

When no active Phase:

- `No active Phase`;
- canonical project-stage reason/state.

### Current Work Card

When active:

- Work Card title;
- Work Card ID in bounded/secondary text;
- Work Card state/disposition;
- Work Card loop step;
- Repair/parent context when present.

When no active Work Card:

- `No active Work Card`;
- relevant current Phase/project state.

### Inspection behavior

The sidebar always shows **canonical SQL workflow context**, not the stage currently being inspected.

Example:

```text
canonical: Phase 1 / Phase Intake
inspection: Project Planning

sidebar still shows:
  Current Stage: Phase Interview
  Current Phase: Phase 1
  Current Work Card: No active Work Card

plus Resume current stage
```

This makes the difference between canonical state and inspection explicit.

## Presentation reuse

The old CSS classes for `.figma-sidebar-scroll`, `.figma-sidebar-field`, `.figma-sidebar-id`, etc. still exist. Reuse the recovered visual language where appropriate rather than adding another unrelated sidebar style system.

Do not restore the entire legacy `CurrentWorkspaceModel` dependency.

## Focused proof

### Canonical return

1. rail return to current Phase Intake invokes exactly one fresh `getGreenfieldNavigation` read;
2. Resume invokes the same function/path;
3. both produce identical exact selection;
4. non-canonical inspection rail navigation performs zero resolver calls;
5. pending Phase Interview disposition select is enabled after manual canonical rail return;
6. R08/R08-R01 historical Phase/WorkItem identity tests remain green.

### Sidebar

7. canonical Project stage shows Stage + No active Phase + No active Work Card;
8. Phase Interview/Planning shows current Phase ID/title/state/position/loop step;
9. Work Card Planning/Implement/Review/Repair shows current Work Card ID/title/state/loop step and repair context where present;
10. inspection of a prior stage does not replace canonical sidebar status;
11. Resume action may appear alongside status during inspection;
12. Workflow change/unmount clears stale sidebar context;
13. sidebar context for one Workflow is never shown for another;
14. no sidebar status is reconstructed from Markdown.

Run the Greenfield composition/navigation owner, Phase Interview renderer owner, sidebar presentation owner, Phase Planning/navigation service owner, and static/build validation selected by the repair profile.

## Operator acceptance

Continue the existing Greenfield test:

1. on current Phase Intake, navigate to a prior stage;
2. click the Phase Intake/Phases rail destination;
3. confirm Resume disappears without needing to press it;
4. confirm the Phase Intake disposition dropdown is enabled and usable;
5. inspect another stage and confirm the left sidebar still shows the canonical current Stage and Phase;
6. confirm Phase/Work Card status updates as the workflow progresses.

## Forbidden changes

- no SQL/domain/schema migration;
- no legacy `CurrentWorkspaceModel` resurrection as authority;
- no Markdown-derived workflow state;
- no sidebar SQL calls;
- no second persisted current-stage field;
- no browser/MCP/prompt changes;
- no layout redesign outside the sidebar context block;
- no unrelated D05–D08 work.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR09_IMPLEMENTER_REPORT.md`

Report D26 and D27 separately, including the single canonical-return implementation and the SQL-derived sidebar context matrix.

## Checkpoint

`WSF20-R09 unify canonical return and restore sidebar context`

After checkpoint, stop for Operator audit.
