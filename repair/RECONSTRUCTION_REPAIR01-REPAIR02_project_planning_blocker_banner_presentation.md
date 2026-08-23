# RECONSTRUCTION-REPAIR01-REPAIR02 — Project Planning Blocker Banner Presentation

## Repair Type

Narrow follow-up repair to `RECONSTRUCTION-REPAIR01-REPAIR01_delete_duplicate_project_planning_authority` after Architect review found one remaining acceptance defect.

This repair is presentation-only. The single Project Planning authority established by REPAIR01 is passed scope and must not be reopened.

## Governing Standard

Use:

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

This Repair Card is evidence-derived, tightly bounded, preserves passed behavior, forbids architectural redesign, and requires focused proof plus an Implementer Report.

## Parent Repair / Failed Review

Parent repair:

`repair/RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`

Parent Implementer Report:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`

Architect disposition:

`REVISION REQUIRED` only for the remaining blocker-presentation defect.

## Passed Scope That Must Be Preserved

REPAIR01 successfully established one Project Planning lifecycle authority. Preserve all of the following without redesign:

- `getProjectPlanningWorkspaceModel()` remains the sole Project Planning lifecycle authority;
- the duplicate renderer/shared Project Planning calculation remains deleted;
- `deriveProjectLifecycleRailStatuses()` consumes `projectPlanningStatus` rather than deriving Project Planning independently;
- the Project Planning active-workspace rail override remains removed;
- direct `projectPlanning:getWorkspaceModel` IPC/preload access remains intact;
- the Project Planning Architect-output workspace remains only a transparent projection of the authoritative model;
- semantic context/historical document projection and strict review eligibility from the parent repair remain intact;
- Project Planning handoff eligibility remains controlled by the existing authoritative model/projection;
- the clean reconstruction and true-blocker regression cases remain green.

Do not reintroduce any deleted Project Planning state resolver, compatibility calculation, fallback authority, or navigation-dependent status path.

## Confirmed Remaining Defect

The authoritative Project Planning model correctly carries:

```text
state
railStatus
canPrepareHandoff
reason
requiredAction
evidencePaths
```

The current renderer correctly uses that authority for the Project Planning top rail and handoff eligibility, but the Project Planning Figma workspace does not visibly render the authoritative blocker explanation when `state` is `not-ready` or `needs-attention`.

Current behavior can therefore still present:

```text
Project Planning — Needs Attention
Prepare Project Planning Handoff [disabled]
```

without visibly explaining the authoritative reason.

The model data exists; the missing behavior is UI presentation only.

## Root Cause

`FigmaBrowserActionsPanel` consumes `model.canPrepareHandoff` to disable the Project Planning handoff action but does not render the Project Planning `reason` or `requiredAction`.

The ordinary current-workspace banner is not rendered inside the Figma Architect-output workspace. Therefore the authoritative Project Planning blocker is available in renderer state but has no dedicated persistent presentation surface in the Project Planning workspace.

## Repair Objective

Add one persistent, compact Project Planning blocker banner that displays the exact authoritative reason in a fixed, prescribed location whenever Project Planning is genuinely blocked.

The banner must explain the existing authority decision. It must not calculate state, create a new gate, infer a different cause, or become a general governance framework.

## Exact UI Placement — Mandatory

The Implementer does not have discretion to relocate this warning.

When `activeWorkspaceId === "project-planning-review"` and the authoritative `projectPlanningModel.state` is `not-ready` or `needs-attention`, render one Project Planning blocker banner:

1. inside the main `workspace-surface`;
2. immediately **below** the existing `workspace-header` containing `Project Plan and Roadmap Review`;
3. immediately **above** the Project Planning `figma-doc-chat-workspace` split-pane containing the Project Profile/Roadmap document surface and embedded ChatGPT;
4. spanning the available workspace content width so the warning belongs to the workflow, not either split-pane column.

Required structural order:

```text
workspace-surface
  workspace-header
    Project Plan and Roadmap Review

  ProjectPlanningBlockerBanner   <-- REQUIRED LOCATION

  figma-doc-chat-workspace
    left: Project Profile / Project Roadmap document surface
    right: embedded ChatGPT

  Browser Actions remain in their existing lower location
```

The banner must appear before the Operator encounters the document review surface or disabled Browser Actions.

## Explicitly Forbidden UI Placements

Do **not** render the authoritative Project Planning blocker:

- inside the Project Profile/Roadmap document card;
- inside the Document Disposition panel;
- inside `FigmaBrowserActionsPanel` beside or beneath the disabled handoff button;
- inside the embedded ChatGPT column;
- only in the top project rail;
- as a transient toast;
- as temporary action feedback that disappears;
- as a modal or blocking dialog;
- in the left project sidebar;
- in Settings;
- behind a diagnostics drawer that the Operator must open manually.

Those placements misrepresent the blocker as a document, disposition, browser, or transient-action problem. This is a workflow-level Project Planning condition and must be presented at workflow level.

## Required Banner Presentation

Implement a dedicated Project Planning blocker banner/presentation component. `ProjectPlanningBlockerBanner` is the preferred component identity so placement and behavior are directly testable. It may live in `App.tsx` or a small dedicated renderer file; do not create a generic policy/governance banner framework for this repair.

Visual treatment:

- compact persistent warning banner;
- amber / warning treatment consistent with the existing `Needs Attention` product language;
- not red/critical unless an existing product token already maps `Needs Attention` to that treatment;
- full available workspace content width;
- no excessive height;
- no modal behavior;
- no animation required;
- use existing theme variables/tokens where practical rather than introducing a new theme subsystem.

Accessibility/presentation:

- use a persistent status/warning semantic such as `role="status"`;
- heading text must be exactly: `Project Planning Needs Attention`;
- do not label the banner as an approval request, validation request, or disposition requirement.

## Required Data Source — No Reinterpretation

The banner must consume the existing authoritative `projectPlanningModel` directly.

Required condition:

```text
activeWorkspaceId === "project-planning-review"
AND projectPlanningModel is available
AND projectPlanningModel.state is "not-ready" or "needs-attention"
```

The banner must not:

- call another lifecycle resolver;
- derive Project Planning state from documents;
- inspect filenames to determine the blocker;
- read `selectedDocument` to determine the blocker;
- infer a cause from disabled controls;
- create a second Project Planning model;
- use `architectOutputModel` as an independent source of Project Planning lifecycle truth.

## Exact Banner Content Rules

### Heading

Always render:

```text
Project Planning Needs Attention
```

### Reason

Render the exact authoritative:

```text
projectPlanningModel.reason
```

Do not summarize, paraphrase, classify, rewrite, soften, or replace the reason with generic language.

### Required Action

If both values are non-empty and their trimmed string values are different:

```text
projectPlanningModel.requiredAction.trim() !== projectPlanningModel.reason.trim()
```

render:

```text
Required action: {projectPlanningModel.requiredAction}
```

If they are the same after trimming, render the reason once and do not duplicate it.

### Evidence Paths

When `projectPlanningModel.evidencePaths` contains non-empty entries:

- render an `Evidence` label below the reason/action;
- display paths as secondary monospaced text;
- display at most the first three paths initially;
- if more than three paths exist, render a compact control labeled exactly `Show N more`, where `N` is the number of hidden paths;
- activating that control reveals the remaining evidence paths in the same banner;
- after expansion, the control may change to `Show less`;
- the evidence disclosure controls presentation only and must not affect workflow state.

When no evidence paths exist, render no empty Evidence section.

## Non-Blocked State

When Project Planning is not `not-ready` or `needs-attention`:

- the blocker banner must not render;
- it must consume no layout space;
- no empty warning container or placeholder may remain.

A normal `ready-for-handoff`, waiting/output, review, revision, or completed state must retain the existing Project Planning layout unless another existing component already governs that state.

## Handoff Button Behavior

Do not change the authority controlling `Prepare Project Planning Handoff`.

The existing button must remain enabled/disabled from the current Project Planning Architect-output projection backed by `getProjectPlanningWorkspaceModel()`.

The banner explains why a genuine blocker disables the action. It does not authorize, override, bypass, or independently control the button.

## Authorized Production Scope

Primary authorized surfaces:

- `src/renderer/app/App.tsx`;
- `src/renderer/styles.css`;
- one small dedicated renderer component file only if the Implementer chooses not to keep `ProjectPlanningBlockerBanner` local to `App.tsx`.

Tests:

- existing Project Planning/rail/reconstruction renderer tests as directly relevant;
- one focused renderer test for blocker-banner placement/content behavior.

Do not modify main-process Project Planning authority code unless a compile-only type/interface correction is strictly necessary. Any main-process behavior change requires stopping and reporting the unexpected need rather than expanding this repair.

## Required Acceptance Criteria

### AC1 — Exact placement

For blocked Project Planning, source/runtime presentation order is:

```text
workspace-header
ProjectPlanningBlockerBanner
figma-doc-chat-workspace
```

The banner is below `Project Plan and Roadmap Review` and above the two-column Project Planning document/ChatGPT workspace.

A renderer regression must verify this placement order, not merely that blocker text exists somewhere in `App.tsx`.

### AC2 — Exact authority source

The banner consumes `projectPlanningModel` directly.

No second Project Planning state calculation, document-derived inference, selected-document inference, or new resolver is introduced.

### AC3 — Correct blocked-state condition

The banner renders only when Project Planning is the active workspace and authoritative state is:

```text
not-ready
or
needs-attention
```

### AC4 — Exact reason is visible

A genuine greenfield/source mismatch must visibly render the exact authoritative `projectPlanningModel.reason` in the banner.

Generic `Needs Attention` text alone is insufficient.

### AC5 — Required action de-duplicates correctly

If `requiredAction` differs from `reason`, the banner renders:

```text
Required action: <exact requiredAction>
```

If they are equal after trimming, the text is not duplicated.

### AC6 — Evidence paths are bounded and inspectable

For 1–3 evidence paths, all are shown directly.

For more than three paths:

- first three are shown initially;
- `Show N more` is shown with correct count;
- disclosure reveals the remaining paths;
- disclosure does not change lifecycle state or handoff eligibility.

### AC7 — No banner in valid state

With the existing clean reconstruction fixture where Project Planning is `ready-for-handoff`, no blocker banner renders and no warning-layout space remains.

### AC8 — Forbidden placements absent

The authoritative reason is not implemented as:

- Browser Actions feedback;
- document-card warning;
- disposition-panel warning;
- toast;
- modal;
- embedded ChatGPT content.

### AC9 — Existing authority repair remains intact

Production source still contains no duplicate Project Planning lifecycle calculation deleted by REPAIR01.

The direct authoritative Project Planning IPC path, Project Planning rail input, and removed active-workspace override remain unchanged.

### AC10 — Existing handoff workflow remains intact

For clean reconstruction:

- Project Planning remains `Ready`;
- `Prepare Project Planning Handoff` remains enabled;
- preparing the handoff continues through the existing application-owned Project Planning handoff/draft-bundle path.

For a genuine blocker:

- Project Planning remains `Needs Attention` before and after workspace entry;
- the banner explains the exact reason;
- Prepare Handoff remains disabled from the existing authority.

## Required Renderer Regression

Add one focused renderer regression file or extend the most directly relevant existing renderer test.

The regression must verify all of the following source/presentation contract points:

1. `ProjectPlanningBlockerBanner` or equivalent dedicated presentation exists;
2. it consumes `projectPlanningModel.reason` directly;
3. the structural source/render order places it after the `workspace-header` and before the `figma-doc-chat-workspace` Project Planning body;
4. it is conditioned on active Project Planning plus `not-ready` / `needs-attention`;
5. the banner does not render in `ready-for-handoff` fixture/state;
6. exact reason text is rendered;
7. duplicate reason/required-action text is suppressed;
8. evidence paths are capped at three before disclosure;
9. the Project Planning rail source still lacks the deleted duplicate authority helpers.

Do not satisfy the test by matching comments, dead code, or strings that are not in the live render path.

## Preserved Behavior

Preserve without modification:

- Project Intake;
- Architect Interview;
- Project Planning authority and reconciliation logic;
- Project Profile/Roadmap atomic promotion;
- compound Project Planning review;
- Phase Map gating;
- context/historical document classification;
- strict workflow review-document eligibility;
- Browser ChatGPT attachment/layout behavior;
- Agent Harness/MCP/OAuth behavior;
- Codex harness;
- development-environment behavior;
- all other lifecycle workspaces.

## Forbidden Changes

Do not:

- reintroduce any deleted Project Planning authority code;
- modify `getProjectPlanningWorkspaceModel()` behavior for presentation convenience;
- make the banner another authority or gate;
- move the banner to a different UI region;
- redesign Project Planning layout;
- modify Project Profile/Roadmap tabs or document card behavior;
- modify disposition semantics;
- make context/historical documents actionable;
- add a generic governance/approval/risk banner framework;
- add modal confirmations;
- add new persistence;
- add a new workflow state;
- rewrite Intake/Interview/design documents;
- create planning artifacts during this repair;
- run Git stage/commit/push/branch mutation unless separately authorized by the Operator.

## Focused Validation

Do not run the full historical suite by default.

Required:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/renderer/project-rail-presentation.test.cjs test/renderer/document-review-surface-source.test.cjs test/renderer/architect-output-workspace-source.test.cjs test/reconstruction/reconstruction-repair01.test.cjs <new-or-updated-blocker-banner-renderer-test>
```

If the banner test is incorporated into one of the named renderer files, report the exact command actually used without duplicating the same test file argument.

Full `npm test` is not required for this bounded presentation repair unless implementation unexpectedly expands beyond authorized renderer scope.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`

Report must include:

- repository/branch/status verification;
- confirmation that REPAIR01 single-authority code remains intact;
- exact files changed;
- exact banner component/presentation location;
- exact structural render order proving header → blocker banner → split pane;
- exact authoritative data fields consumed;
- blocked-state condition;
- reason/required-action de-duplication behavior;
- evidence disclosure behavior;
- focused validation commands and exact results;
- confirmation that no main-process Project Planning authority behavior was changed;
- deviations/blockers;
- remaining Operator live validation;
- confirmation of no Git mutation unless separately authorized.

## Required Operator Live Validation

After Architect review passes:

1. Launch ChampCity A/I with the clean reconstruction corpus.
2. Confirm Project Planning remains `Ready` and no blocker banner is visible.
3. Confirm the Project Planning layout has no empty banner gap.
4. Confirm `Prepare Project Planning Handoff` remains enabled.
5. Separately exercise or use a controlled fixture/repository state that creates a genuine Project Planning blocker.
6. Confirm the top rail already shows `Needs Attention` before entering Project Planning.
7. Enter Project Planning.
8. Confirm one amber blocker banner appears directly beneath `Project Plan and Roadmap Review` and directly above the Project Profile/Roadmap + ChatGPT split pane.
9. Confirm the banner displays the exact blocker reason.
10. Confirm a distinct required action is shown only when different from the reason.
11. Confirm evidence paths are readable and additional paths disclose correctly when applicable.
12. Confirm `Prepare Project Planning Handoff` remains disabled from the existing authority.
13. Confirm no context/historical document is presented as the blocker merely because it is visible in the repository.

## Return Path

Return this repair for Architect code review, then Operator live validation.

If this repair passes, RECONSTRUCTION-REPAIR01 and its follow-up repairs are complete. The Operator may then archive/remove the temporary `repair/` artifacts and continue the clean ChampCity A/I Project Planning workflow toward Harness expansion.
