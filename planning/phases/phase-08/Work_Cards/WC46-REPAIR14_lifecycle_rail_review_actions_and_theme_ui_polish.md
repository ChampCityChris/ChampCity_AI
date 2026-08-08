<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR14",
    "repairId": "WC46-REPAIR14",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR13_project_intake_repository_persistence.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR13_project_intake_repository_persistence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Lifecycle Rail, Review Action, and Theme UI Polish",
    "status": "approved_for_implementation",
    "executionMode": "one bounded UI repair after WC46-REPAIR13 Operator validation",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "Operator validation after WC46-REPAIR13 confirmed several UI presentation defects: Project Planning rail status changes from Complete to Needs Attention when viewed; native dropdowns are unreadable in dark theme; Work Card Review & Validation Copy Advisory Prompt appears disabled and is in the wrong pane; Phase and Work Card loop rails do not highlight the currently viewed workspace; the Phases top rail shows Complete while the phase loop is still in progress; and light-theme navigation rail colors are over-saturated and low contrast.",
    "rootCause": "Renderer presentation state mixes required-workspace authority with currently viewed workspace selection, some project rail status derivation is overwritten by active Architect-output workspace model state, Work Card Review & Validation places a browser-adjacent action inside the left validation panel, and theme CSS does not fully style native select/options or light-theme rail contrast.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR14_lifecycle_rail_review_actions_and_theme_ui_polish.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Bounded UI repair only. Fix rail presentation, dropdown contrast, Copy Advisory Prompt placement/visual state, and light-theme rail readability. Do not change workflow authority or document disposition behavior.",
    "reviewedAt": "2026-08-06"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR14 — Lifecycle Rail, Review Action, and Theme UI Polish

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Operator validation after WC46-REPAIR13 passed the repair but exposed UI presentation defects that should be cleared before the beta-validation project:

1. The top Project Planning rail item displays `Completed`, but clicking Project Planning changes it to `Needs Attention` even though the stage is complete.
2. Dropdown selection boxes in dark theme are unreadable because native options render as light/white with low-contrast gray text.
3. In Work Card Review & Validation, `Copy Advisory Prompt` appears unavailable even though it works, and it is placed in the left validation controls rather than in a browser action pane below the embedded browser.
4. Phase Loop and Work Card Loop rails do not reliably highlight the currently viewed workspace.
5. When the top `Phases` rail item is the active in-progress project stage, it can display `Completed` while a phase is still in progress.
6. Light-theme navigation rails use over-saturated/low-contrast colors and are difficult to read.

## Source Evidence

Operator screenshots show the visual failures directly.

Relevant repository source facts:

```text
src/renderer/app/App.tsx
- projectRailStatuses can be overwritten from architectOutputModel.railStatus for project-planning-review and related Architect-output workspaces.
- NestedWorkflowRail receives both activeWorkspaceId and requiredWorkspaceId.
```

```text
src/renderer/app/NestedWorkflowRail.tsx
- authorityWorkspaceId replaces activeWorkspaceId when requiredWorkspaceId is inside the phase/work-card loop.
- ContextLoopBar receives authorityWorkspaceId as activeWorkspaceId, so required workflow authority can override currently viewed workspace selection.
- The Phases top rail uses descendant workspace logic but may still display completed status while a phase/work-card loop remains active.
```

```text
src/renderer/app/WorkCardReportReviewWorkspace.tsx
- Copy Advisory Prompt is rendered inside architect-review-panel / validation controls.
- It uses generic command button styling and disabled styling tied to report readiness, making it look unavailable even when the action is functional.
```

```text
src/renderer/styles.css
- figma-browser-actions-panel / figma-browser-actions-row already exist and should be reused for browser-adjacent actions.
- Native select/option and light-theme rail contrast require targeted CSS corrections.
```

## Objective

Fix the six Operator-visible UI defects without changing workflow authority, document disposition semantics, MCP prompt behavior, repair routing, validation records, or Codex behavior.

## Runtime Sequence

```text
Operator views completed Project Planning
→ top rail still shows Project Planning as Completed
→ viewing it does not downgrade the rail to Needs Attention
```

```text
Operator opens a select dropdown in dark theme
→ dropdown button and options remain readable
```

```text
Operator enters Work Card Review & Validation
→ embedded browser appears on the right
→ browser action pane appears below browser
→ Copy Advisory Prompt appears in that browser action pane and is visually available when functional
→ validation decision controls remain in the left validation panel
```

```text
Operator navigates between Phase Loop / Work Card Loop workspaces
→ selected/highlighted loop pill follows the currently viewed workspace
→ required/current workflow step may still be indicated, but it must not replace the viewed-workspace highlight
```

```text
Phase loop is still active
→ top Phases rail displays In Progress, not Completed
→ after phases are actually complete, top Phases rail may display Completed
```

```text
Operator switches to light theme
→ project, phase, and work-card navigation rails remain readable with restrained contrast
```

## Required Changes

### 1. Stabilize completed Project Planning rail status

Do not let merely viewing `project-planning-review` convert a completed Project Planning top rail item to `Needs Attention`.

Required behavior:

```text
Approved Project Profile + Approved Project Roadmap
→ Project Planning top rail status remains Completed
→ active selection may highlight Project Planning
→ status does not downgrade unless repository evidence identifies a genuine current Project Planning problem
```

If `architectOutputModel.railStatus` is still used for active Architect-output workspaces, it must not override document-derived completion for already-approved Project Planning outputs with a transient `Needs Attention`/in-progress workspace state.

### 2. Fix native dropdown readability

Add targeted CSS so `select` controls and native `option` rows are readable in both themes.

Required behavior:

```text
Dark theme select closed state → readable text/background
Dark theme open options → readable text/background
Light theme select closed state → readable text/background
Light theme open options → readable text/background
Disabled select/options → visibly disabled but still legible
```

Do not rely on browser default white option backgrounds with low-contrast gray text.

### 3. Move Copy Advisory Prompt to browser actions pane

Move the Work Card Review & Validation `Copy Advisory Prompt` action out of the left validation panel.

Use the existing browser-action visual model rather than inventing a new action style:

```text
FigmaBrowserActionsPanel / figma-browser-actions-panel / figma-browser-actions-row pattern
```

Accepted implementation approaches:

- extend the existing browser actions panel to accept contextual extra actions; or
- create a narrowly scoped Work Card Review browser actions panel using the same CSS/classes/pattern.

Required behavior:

```text
Right pane:
embedded browser
→ Browser Actions panel
   - Reload ChatGPT
   - Copy Advisory Prompt
   - Refresh
   - retry/browser actions when applicable
```

The button must look enabled when the advisory prompt can be copied. It may be disabled only when the prompt is actually unavailable. The left validation panel must keep Operator notes, advisory summary, repair defect text, Validate Passed, and Request Repair controls.

### 4. Separate viewed workspace highlight from required workflow authority

Fix Phase Loop and Work Card Loop rail selection so the visual active/highlighted pill follows the workspace the Operator is currently viewing.

Required behavior:

```text
activeWorkspaceId controls selected/highlighted loop pill
requiredWorkspaceId/executionContext controls required/current workflow status guidance
requiredWorkspaceId must not replace the selected viewed workspace
```

The UI may still show required/current workflow state, but it must not make a different loop pill look selected when the Operator has clicked another workspace.

### 5. Correct top Phases rail in-progress display

When the Phase loop is still active, the top `Phases` rail item must display `In Progress`, not `Completed`.

Required behavior:

```text
executionContext.phase.state === active
or activeWorkspaceId is a phase/work-card descendant before final phase completion
→ top Phases rail status is In Progress
```

Once phase completion is actually durable and there is no active phase work remaining, the top rail may display `Completed`.

### 6. Reduce light-theme rail saturation and improve contrast

Adjust light-theme navigation rail colors so labels, status text, icons, and active/in-progress/completed states are readable.

Required behavior:

```text
Light theme project rail readable
Light theme phase loop readable
Light theme work-card loop readable
Active/in-progress/completed states distinguishable without neon/washed-out low contrast
```

Do not degrade dark theme readability while fixing light theme.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR11 and WC46-REPAIR12 MCP workspace binding behavior;
- WC46-REPAIR13 Project Intake repository persistence;
- workflow resolver authority and required workspace computation;
- Work Card validation decision creation;
- Advisory prompt generation content and copy behavior;
- repair creation and validation record behavior;
- document disposition semantics;
- Codex implementer behavior;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
src/shared/workspaces/projectRailPresentation.ts
```

Shared contract or main-process files are authorized only if a type needs to carry existing rail/action presentation data without changing workflow authority:

```text
src/shared/workspaceContracts.ts
src/main/currentWorkflow/currentWorkflowService.ts
```

Do not change main-process workflow decisions unless a type-only or projection-only adjustment is strictly required for this UI presentation repair.

Tests authorized:

```text
test/renderer/figma-redesign-shell.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/workflow/current-execution-context.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR14_lifecycle_rail_review_actions_and_theme_ui_polish.md
```

## Acceptance Criteria

1. Project Planning top rail remains `Completed` when Project Planning outputs are approved, including while the Operator is viewing Project Planning.
2. Dark-theme select dropdowns and options are readable in closed and open states.
3. Work Card Review & Validation places `Copy Advisory Prompt` in a browser actions pane below the embedded browser, not in the left validation controls.
4. `Copy Advisory Prompt` visually appears enabled whenever it is functionally available.
5. Phase Loop and Work Card Loop selected/highlighted pill follows the currently viewed workspace.
6. Required/current workflow authority remains available but does not override viewed-workspace highlighting.
7. Top `Phases` rail displays `In Progress` while a phase/work-card loop remains active.
8. Light-theme project/phase/work-card rails are readable and less saturated.
9. Existing validation, repair, close, MCP prompt, and Codex behavior remain unchanged.
10. Tests cover the rail selection/status changes and the Work Card Review & Validation advisory action placement.
11. No Git mutation is performed.

## Negative Constraints

Do not:

- rewrite workflow resolver authority to solve a renderer highlight problem;
- create new rail status concepts unless existing presentation data cannot express the needed state;
- move Validate Passed or Request Repair into the browser pane;
- remove the embedded browser or handoff browser action model;
- invent a second browser-action visual language;
- make all rail items active just because they are complete;
- use inaccessible low-contrast colors in either theme;
- change MCP workspace binding, Project Intake persistence, Work Card loop authority, validation record creation, repair routing, or Codex execution;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC46-REPAIR14 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR14_lifecycle_rail_review_actions_and_theme_ui_polish.md
→ Architect review
→ Operator validation
→ return to the active WC46 repair/work-card loop according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include exact files changed, before/after behavior for each of the six UI fixes, validation commands with working directory and exit codes, acceptance-criteria mapping, and any skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

1. View completed Project Planning and confirm the top rail still shows `Completed`.
2. Open disposition/dropdown controls in dark theme and confirm the menu is readable.
3. Open Work Card Review & Validation and confirm `Copy Advisory Prompt` is below the embedded browser in Browser Actions and appears enabled when usable.
4. Click through Phase Loop and Work Card Loop workspaces and confirm the highlighted pill follows the viewed workspace.
5. While phase work remains active, confirm the top `Phases` rail shows `In Progress`.
6. Switch to light theme and confirm navigation rail text/status/icon contrast is readable.
