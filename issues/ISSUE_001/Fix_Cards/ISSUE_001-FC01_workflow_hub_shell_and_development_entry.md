# ISSUE_001-FC01 — Workflow Hub Shell and Development Entry

## Governing Evidence

This Fix Card implements the first bounded correction under `ISSUE_001`.

Read and preserve:

- `issues/ISSUE_001/ISSUE_RECORD.md`
- `issues/ISSUE_001/ARCHITECT_INVESTIGATION.md`
- `issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md`
- `issues/ISSUE_001/FIX_CARD_PLAN.md`
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md`
- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Verified Current State

Current repository inspection confirms:

- `src/renderer/app/App.tsx` initializes navigation from the existing Development `workspaceDefinitions` registry;
- project selection currently calls `activateWorkspaceSelection(...)`, which refreshes documents through the Development resolver and can immediately foreground a Development workspace;
- `src/renderer/app/figma/FigmaSidebar.tsx` currently combines project selection/current project with Development-specific Current Phase and Current Work Card status;
- `src/renderer/app/NestedWorkflowRail.tsx` is the existing **Development-owned** project/phase/Work Card navigation rail and is rendered by the current application shell;
- Settings already behaves as shell-level navigation outside the Development registry and retains a return target;
- the existing Development `workspaceDefinitions` / current-workflow resolver are lifecycle authority for Development and are not the correct authority layer for the new Workflow Hub.

## Objective

Establish a shell-level Workflow Hub above Development so ChampCity A/I opens into project/workflow selection rather than automatically treating Development as the application itself.

After this card, Development must remain functionally unchanged beneath the new Hub and must be entered explicitly from one functional Development workflow card.

The shell architecture must establish workflow-specific navigation ownership: Hub mode has no workflow-specific lifecycle rail; Development mode renders the existing Development rail; future peer workflows may render their own workflow-specific rails without inheriting Development Phase/Work Card navigation.

## Authorized Scope

Implement only the top-level shell and Development entry/return behavior.

Expected production surfaces to inspect and modify as required:

- `src/renderer/app/App.tsx`
- `src/renderer/app/figma/FigmaSidebar.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx` only as needed to preserve it as Development-owned navigation and render it when Development is foregrounded
- `src/renderer/styles.css`
- a bounded new Workflow Hub renderer component, e.g. `src/renderer/app/WorkflowHubWorkspace.tsx`
- a small shared workflow-definition contract/registry if needed for workflow card presentation
- focused renderer/shell tests

Do not redesign `currentWorkflowService.ts` or the existing Development lifecycle to implement this card.

## Required Behavior

### 1. Top-level Hub state and workflow-specific rail ownership

The application shell must distinguish Workflow Hub foreground navigation from Development `WorkspaceId` lifecycle state.

Do **not** register `workflow-hub` as another Development `workspaceDefinitions` lifecycle workspace merely to make routing convenient.

Hub navigation is presentation/navigation state, not project/phase/Work Card lifecycle authority.

Navigation rail ownership must be explicit at the shell boundary:

```text
Workflow Hub      → no workflow-specific lifecycle rail
Development       → existing Development NestedWorkflowRail
Issue Resolution  → Issue-specific rail [implemented by FC02 and later Issue cards]
Future workflow   → that workflow's own rail when required
```

FC01 implements only the first two states. It must not build the Issue Resolution rail, but it must not hard-code the Development rail as universal application navigation that is merely hidden on selected screens.

### 2. No-project presentation

When no project is selected:

- show the top-level shell rather than Project Intake as the automatic application destination;
- the left sidebar contains only the project/open control, Settings, and Dark/Light theme control;
- do not render Current Phase, Current Work Card, Development loop state, or any workflow-specific lifecycle rail;
- the main surface clearly tells the Operator to select a project before choosing a workflow.

### 3. Selected-project Workflow Hub

After a project is selected or restored:

- foreground the Workflow Hub;
- do not automatically enter Development through the repository resolver;
- show the heading `Workflows`;
- show secondary copy `Choose how you want to work with <Project Name>.`;
- do not render the generic Development lifecycle status strip;
- Hub sidebar project area shows the selected project name plus Open/Change Project and Clear Project controls, with Settings and Theme retained near the bottom;
- Hub sidebar does not show Current Phase or Current Work Card;
- no workflow-specific lifecycle rail is rendered while the Hub is foregrounded.

### 4. Development workflow card

Render exactly one functional workflow card in this card: `Development`.

The card must follow `WORKFLOW_HUB_ARCHITECTURE.md`:

- entire card is clickable and keyboard focusable;
- approximately 220–260 px minimum desktop height;
- visually dominant code/development Lucide icon and `Development` title;
- description: `Plan, implement, review, and validate planned software development.`;
- short context tags may use `Plan`, `Build`, `Prove`;
- bottom action strip uses an explicit entry verb such as `Continue Development` or `Open Development` plus a right-arrow affordance;
- responsive grid behavior works at normal and narrow widths;
- Dark and Light themes both remain usable.

Do not render placeholder Issue Resolution, Feature, UI, Graphics, or Brainstorm cards in FC01.

### 5. Enter Development

Selecting the Development card must:

- set/resolve the foreground workflow as Development at the shell level;
- invoke the existing Development resolver/current-state authority;
- navigate to the Development workspace that is currently required by existing repository state;
- render the existing Development `NestedWorkflowRail` as the navigation rail owned by Development;
- restore the existing Development sidebar/status presentation;
- preserve existing Project → Phase → Work Card lifecycle semantics.

The Hub must not manufacture a Development destination or duplicate resolver authority.

### 6. Return to Workflows

While Development is foregrounded, add one persistent workflow-level navigation control near the top of the existing left sidebar:

```text
← Workflows
```

An equivalent home/grid icon plus the `Workflows` label is acceptable.

Activating it must return to the Workflow Hub as navigation only. The Development-owned rail must cease rendering because Development is no longer foregrounded; this is shell navigation, not a hide/show mutation of Development lifecycle state.

Returning to Hub must not close, suspend, validate, revise, or otherwise mutate the current Development lifecycle.

### 7. Project and Settings navigation

- Selecting/changing a project returns to that project's Workflow Hub rather than immediately entering Development.
- Clearing the selected project returns to the no-project Hub shell rather than forcing Project Intake.
- Settings opened from Hub returns to Hub.
- Existing Settings return behavior from Development remains intact.
- Existing theme selection remains intact in Hub and Development modes.

## Preservation Requirements

Preserve without redesign:

- current Development repository-derived resolver authority;
- all current Project, Phase, Work Card, Repair, validation, and close semantics;
- Development `NestedWorkflowRail` behavior and presentation whenever Development is foregrounded;
- the architectural ability for future peer workflows to own different workflow-specific navigation rails;
- selected-project persistence and repository binding;
- current Settings and theme behavior;
- current Agent Harness, MCP, Codex App Server, and execution behavior;
- existing planning artifact paths and contents;
- current Work Card/Repair Card causality.

## Forbidden Changes

FC01 does not authorize:

- Issue Resolution workflow internals, Issue discovery, or an Issue-specific navigation rail;
- treating the Development `NestedWorkflowRail` as universal navigation for all workflows;
- a second workflow/lifecycle authority inside the Hub;
- adding the Hub as a fake Development lifecycle `WorkspaceId`;
- generic workflow-engine/BPMN infrastructure;
- modification of `planning/` structure or migration of existing artifacts;
- modification of Issue artifacts other than the required Implementer Report;
- Feature, UI, Graphic Design, Brainstorm, or Figma workflow implementation;
- new repository, Git, execution, evidence, or agent-session subsystems;
- broad rewrite of `currentWorkflowService.ts`;
- unrelated UI redesign outside the Hub/sidebar/return-control surfaces;
- new package dependencies unless separately approved;
- `npm ci` or other dependency restoration when the existing dependency tree is already usable;
- terminating the active ChampCity A/I control process for implementation or validation;
- Git stage/commit/push/branch mutation.

## Acceptance Criteria

1. With no selected project, ChampCity displays the simplified shell/sidebar and no workflow-specific lifecycle rail, Phase status, or Work Card status.
2. Selecting or restoring a project lands on the Workflow Hub, not directly inside a Development lifecycle workspace.
3. Hub mode visibly contains only project controls, Settings, and Theme in the left sidebar and renders no workflow-specific lifecycle rail.
4. The Hub main surface shows `Workflows`, the selected-project explanatory copy, and exactly one functional Development card conforming to the approved large-card interaction model.
5. Clicking anywhere on the Development card resolves and opens the same current Development workspace that the existing resolver identifies for that repository.
6. Development mode renders the existing Development `NestedWorkflowRail` and existing Development sidebar behavior and exposes a persistent `Workflows` return control near the top of the left sidebar.
7. Returning to Workflows removes the Development-specific rail from the foreground shell because Hub owns no workflow rail; re-entering Development restores the same Development rail and does not alter the current Phase, Work Card, lifecycle step, or repository-derived required workspace.
8. The shell implementation does not encode `NestedWorkflowRail` as universal navigation for future workflows; workflow-specific rail selection remains a top-level workflow concern.
9. Changing/clearing project selection routes through the Hub shell and does not automatically foreground Development.
10. Settings round-trips correctly from Hub, while existing Settings round-trip behavior from Development remains intact.
11. Hub and Development navigation remain usable in both existing Dark and Light themes and at normal/narrow renderer widths.
12. Existing Development lifecycle artifacts are not rewritten merely by entering/leaving the Hub.
13. No Issue Resolution placeholder, Issue-specific rail, or Issue workflow internals are implemented by this card.

## Required Tests and Validation

Add focused automated coverage for the owned shell behavior, preferably in a dedicated test such as:

`test/renderer/workflow-hub-shell.test.cjs`

Run and report the exact results of:

```text
node --test test/renderer/workflow-hub-shell.test.cjs
node --test test/renderer/figma-redesign-shell.test.cjs
node --test test/renderer/agent-harness-settings-workspace.test.cjs
node --test test/lifecycle/nested-lifecycle.test.cjs
npm run build
```

Focused Hub tests must prove the rail-ownership boundary: Hub renders no workflow-specific lifecycle rail; entering Development renders the existing Development rail; returning to Hub removes only the foreground Development navigation without mutating Development lifecycle state.

If an existing shared test contains unrelated assertions, treat its result as evidence and classify any failure by causal relevance to FC01. Do not expand FC01 to repair unrelated/pre-existing failures merely to obtain mechanical suite cleanliness.

The Implementer should provide automated proof for shell routing/presentation and preserve the remaining visible behavior for Architect/Operator live validation. Do not terminate the active ChampCity process to manufacture runtime proof.

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC01_workflow_hub_shell_and_development_entry.md`

The report must include:

- repository state inspected before implementation;
- files changed;
- implementation summary;
- explanation of the shell-level Hub state and why it is not Development lifecycle authority;
- explanation of workflow-specific rail ownership and proof that `NestedWorkflowRail` remains Development-owned rather than universal shell navigation;
- proof that project selection no longer automatically enters Development;
- proof that Development entry still uses existing resolver authority;
- proof that Workflows return does not mutate Development state;
- focused test/build commands and exact results;
- any deviations or blockers;
- any unrelated failures discovered, with causal classification;
- remaining Operator live-validation steps.

## Return Path

After implementation, return FC01 for Architect code/evidence review and then Operator live validation.

If FC01 passes, proceed to `ISSUE_001-FC02` through the manual Issue bootstrap path. Do not implement FC02 opportunistically inside this card.
