# ChampCity A/I Workflow Hub Architecture

## Purpose

This document defines the top-level Workflow Hub that sits above ChampCity A/I's individual project workflows.

The Workflow Hub is the application-level answer to a simple Operator question:

> What kind of work are we doing to the selected project?

The Hub must not become another Development lifecycle step. It sits above Development, Defect, and future workflow types. Project selection establishes **which project** ChampCity is operating against; workflow selection establishes **what kind of work** ChampCity is doing to that project.

This design is intentionally limited to the Workflow Hub and shell boundary. It does not design the internal Defect Workflow.

Governing related design:

- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md`
- `planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md`
- `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`

## Verified Current Application Shape

Current renderer architecture already contains most of the visual shell that should be preserved and reused:

- `src/renderer/app/figma/FigmaSidebar.tsx` owns the current left-side project/navigation/status column.
- `src/renderer/app/NestedWorkflowRail.tsx` owns the current Development project/phase/Work Card navigation rail.
- `src/renderer/app/App.tsx` currently renders `NestedWorkflowRail` above the workspace surface and `FigmaSidebar` beside it.
- `src/shared/workspaceContracts.ts` currently defines the visible Development lifecycle workspace registry.
- `src/main/currentWorkflow/currentWorkflowService.ts` resolves the current Development lifecycle step and is deeply coupled to Development project/phase/Work Card authority.
- Settings are currently represented in renderer navigation by the synthetic `settingsWorkspaceId = "settings" as WorkspaceId` rather than by a true top-level shell route.
- Project selection is already application-owned and persistent through the existing workspace-selection service.

The Hub must be added **above** those Development concepts rather than inserted into them.

## Core Architecture Decision

Do **not** add `workflow-hub` to the existing Development `WorkspaceId` registry.

The current workspace registry expresses lifecycle locations such as:

```text
Project Intake
Architect Interview
Project Planning
Phase Map
Phase Planning
Work Card Planning
Implement
Review & Validation
Repair
Close
```

Those are Development workflow locations. The Workflow Hub is not one of them.

The new application layering is:

```text
Application Shell
│
├── Project Selection
├── Workflow Hub
├── Settings
│
└── Active Workflow
    │
    ├── Development Workflow
    │   └── existing WorkspaceId / lifecycle system
    │
    ├── Defect Workflow
    │   └── future Defect workflow workspace system
    │
    └── future workflow types
```

This separation prevents the Hub from becoming a second lifecycle authority or from forcing non-Development workflows into project/phase/Work Card semantics.

## Top-Level Application State

The shell needs one small routing concept above workflow workspaces.

Conceptually:

```text
ShellView
- workflow-hub
- workflow
- settings
```

Project selection is a prerequisite/context rather than a workflow.

The shell also tracks the foreground workflow when `ShellView = workflow`:

```text
activeWorkflowId
```

Initial workflow identities:

```text
development
```

`defect` is added when the Defect Workflow is implemented. Do not create a nonfunctional Defect placeholder solely to make the initial Hub look populated.

Future identities may include:

```text
feature
brainstorm-design
ui-design
graphic-design
validation
```

The Hub must be registry-driven enough that adding those workflows does not require redesigning the shell.

## Startup and Project Selection Behavior

### Application launch

On every application launch, the top-level destination is the Workflow Hub shell rather than an automatically foregrounded Development lifecycle workspace.

If a previously selected project is still valid:

```text
Open App
→ selected project restored
→ Workflow Hub displayed
```

Do not automatically resume the prior Development screen merely because Development has an active lifecycle state.

If no project is selected:

```text
Open App
→ no project selected
→ shell remains at the Workflow Hub/project-selection state
→ workflow cards are not available
→ primary workspace asks the Operator to select a project
```

### Selecting a project

Selecting a project must:

1. update the existing application-owned selected-project context;
2. clear repository-derived renderer state belonging to the previously selected project;
3. load only the bounded information necessary to present the Hub;
4. leave the shell on the Workflow Hub;
5. **not** automatically invoke the Development resolver and navigate into Development.

Current `activateWorkspaceSelection()` immediately refreshes documents using the Development resolver. The Hub implementation must separate **project activation** from **Development workflow entry** so project selection no longer implies workflow selection.

### Clearing a project

Clearing the project returns the application to the no-project Hub state.

It must not manufacture a Development lifecycle transition such as `project-intake-capture`. No workflow exists until a project is selected and the Operator explicitly chooses one.

## Workflow Hub Left Sidebar

When the shell is showing the Workflow Hub, the left pane is deliberately simpler than the current Development sidebar.

It contains exactly three functional areas:

### 1. Project

At the top:

```text
PROJECT
<selected project name or No project selected>

[Open / Change Project]
[Clear Project]   when a project is selected
```

The selected repository path may appear as quiet secondary text when useful, but the Hub must not display Development Phase or Work Card state in the left sidebar.

The project section replaces the current separate `Select Project`, `Current Project`, `Current Phase`, and `Current Work Card` sections while the Hub is foregrounded.

### 2. Settings

Near the bottom:

```text
[Settings]
```

Settings remain shell-level and are not part of any workflow lifecycle.

### 3. Theme

At the bottom, retain the existing Dark / Light theme control.

### Explicit omissions in Hub mode

The Hub sidebar must not show:

- Current Phase;
- Current Work Card;
- Development loop step;
- workflow-specific validation state;
- Defect IDs;
- Harness diagnostics;
- Git state;
- agent-session state.

Those belong to workflow-specific workspaces or Settings/diagnostics surfaces, not the top-level selector.

## Top Navigation in Hub Mode

The existing `NestedWorkflowRail` is Development navigation and must **not render** while the Workflow Hub is foregrounded.

Navigation rail ownership is workflow-specific, not global. The application shell selects the navigation rail owned by the foregrounded workflow:

```text
Workflow Hub      → no workflow-specific lifecycle rail
Development       → existing Development `NestedWorkflowRail`
Issue Resolution  → Issue-specific navigation rail
Future workflow   → that workflow's own rail when required
```

The Development rail is therefore not a universal application rail that is merely hidden on certain screens. It belongs to Development and appears when Development is foregrounded. Peer workflows may own different navigation structures appropriate to their own lifecycle without inheriting Development Phase/Work Card semantics.

Hub mode should therefore visually present:

```text
App chrome
↓
Left Hub Sidebar | Workflow Hub workspace
```

not:

```text
Development project rail
↓
Workflow Hub
```

The current project/phase/Work Card pipeline only returns after the Operator enters Development.

## Workflow Hub Workspace

Once a project is selected, the main workspace becomes a large workflow-card selection surface.

The visual reference is a grid of substantial service/category cards rather than a list of small navigation buttons.

### Workspace heading

Use:

```text
Workflows
```

with secondary copy:

```text
Choose how you want to work with <Project Name>.
```

Do not show the current generic Development lifecycle status strip in this workspace.

### Card grid

On normal desktop widths:

```text
┌──────────────────────────────┐  ┌──────────────────────────────┐
│                              │  │                              │
│  [icon]                      │  │  [icon]                      │
│  Development                 │  │  Defect                      │
│                              │  │                              │
│  Plan, implement, review,    │  │  Investigate and correct    │
│  and validate planned work.  │  │  project baseline defects.  │
│                              │  │                              │
│  [workflow tags / context]   │  │  [workflow tags / context]   │
│                              │  │                              │
├──────────────────────────────┤  ├──────────────────────────────┤
│  Continue / Open          →  │  │  Open / Start            →  │
└──────────────────────────────┘  └──────────────────────────────┘
```

The initial Hub implementation renders only registered functional workflows. Before Defect is implemented, only Development is rendered.

### Card dimensions and interaction

A workflow card is a **large button**, not a decorative panel containing a small nested button.

Requirements:

- the entire card is clickable;
- minimum desktop height should be approximately 220–260 px;
- cards use a responsive two-column grid when width allows and one column when narrow;
- the icon and title are visually dominant;
- the description is plain-language and limited to a few lines;
- a bottom action strip provides the explicit entry verb plus a right-arrow affordance;
- keyboard focus applies to the entire card;
- hover/focus treatment must make the whole-card interaction obvious;
- cards must work in both existing Dark and Light themes.

Do not implement tiny dashboard tiles or a dense enterprise launcher.

## Workflow Card Content Contract

The shell should render workflow cards from a small workflow definition rather than hard-coding each layout independently.

Conceptually:

```text
WorkflowDefinition
- workflowId
- label
- description
- iconKey
- order
- optional short capability tags
```

Renderer code maps `iconKey` to the existing icon library.

Initial Development presentation:

```text
workflowId: development
label: Development
description: Plan, implement, review, and validate planned software development.
icon: development/code-oriented Lucide icon
suggested tags:
- Plan
- Build
- Prove
```

When Defect is implemented:

```text
workflowId: defect
label: Defect
description: Investigate and correct defects in the current project baseline.
icon: Bug
suggested tags:
- Investigate
- Fix
- Verify
```

Future workflow presentation can use the same contract without modifying Hub layout.

## Workflow Status on Cards

The Hub may show a concise workflow status, but it must not independently calculate lifecycle state from repository files.

Dynamic status belongs to a workflow-specific projection/adapter.

Examples:

```text
Development
In Progress · Phase 00 · WC01 · Review & Validation

Defect
2 open defects
```

The Hub consumes those summaries; it does not derive them.

If a workflow does not yet expose a meaningful summary, the card can simply use:

```text
Open Development
```

or:

```text
Start Development
```

Do not block initial Hub implementation on rich workflow status summaries.

## Entering Development

Selecting the Development card is the first point at which the existing Development lifecycle resolver becomes navigation authority.

Required sequence:

```text
Workflow Hub
→ Operator selects Development
→ activeWorkflowId = development
→ resolve existing current Development workflow state
→ enter the currently required Development WorkspaceId
→ render existing NestedWorkflowRail
→ render existing Development sidebar/status surfaces
```

For an existing project with active work, Development resumes at the existing current required step.

For a project with no Development artifacts, Development resolves to its normal first Development step.

The Hub must not create, revise, close, or reset Development artifacts merely by entering or leaving Development.

## Returning to the Workflow Hub

Every workflow must provide an obvious path back to the top-level Workflow Hub.

For the current Development shell, add a persistent workflow-level navigation control near the top of the left sidebar:

```text
← Workflows
```

or an equivalent grid/home-style icon plus `Workflows` label.

Activating it:

```text
Development workspace
→ shell view = workflow-hub
→ Development state remains untouched
```

Do not model this as Development Close, cancellation, suspension, or lifecycle transition.

Returning to the Hub is navigation only.

## Settings Behavior

Settings are shell-level and should preserve the caller's return location.

Examples:

```text
Workflow Hub
→ Settings
→ Back
→ Workflow Hub
```

and:

```text
Development
→ Settings
→ Back
→ same Development workspace
```

As part of the top-layer architecture, Settings should no longer need to conceptually masquerade as a Development `WorkspaceId`. The implementation may stage that cleanup if needed, but the authority model must treat Settings as shell navigation.

## Project Switching While a Workflow Is Active

Project selection is top-level authority.

The preferred interaction is:

```text
Current Workflow
→ Workflows
→ Change Project
→ new project's Workflow Hub
```

The first Hub implementation should avoid adding new project-switch semantics deep inside every workflow. Existing Development project-selection controls may remain temporarily if removing them would unnecessarily broaden the first pass, but the long-term ownership is the shell-level project section.

Changing project must clear foreground workflow renderer state from the prior project and return to the Hub rather than automatically entering a workflow in the new project.

## Workflow Registry and Entry Adapters

The Hub requires a small workflow registry, not a generic workflow engine.

Conceptually:

```text
WorkflowRegistry
├── development
└── defect       [added with Defect implementation]
```

Each registered workflow provides:

```text
identity / display definition
availability for selected project
optional status summary
entry behavior
```

Development entry behavior delegates to the existing Development current-workflow resolver.

Defect entry behavior will delegate to the future Defect workflow resolver.

The shell does not know Phase, Work Card, Defect, Feature, Figma, or other domain rules beyond what the workflow adapter returns.

This is the extensibility boundary for future workflow types.

## Relationship to Callable Sub-Workflows

The Workflow Hub selects **peer top-level workflows**.

Future specialist workflows such as UI, Graphic Design, Validation, or Research may later be:

- top-level peer workflows available directly from the Hub;
- callable sub-workflows launched from another workflow;
- or both.

The Hub architecture must therefore avoid assuming that every workflow is Development-shaped or project/phase/Work-Card-shaped.

A future Figma-backed UI workflow, for example, can register its own workflow definition and entry adapter without changing Development's resolver.

## UI Ownership Rule

The Hub owns only:

- selected project presentation;
- top-level workflow selection;
- shell-level Settings navigation;
- theme selection;
- top-level workflow-card status projection;
- entering and leaving workflow foreground context;
- selecting which workflow-specific navigation surface is rendered for the foreground workflow.

It does **not** own:

- Development lifecycle decisions;
- Defect lifecycle decisions;
- Phase or Work Card state;
- workflow artifact dispositions;
- workflow-specific validation;
- workflow-specific rail contents or lifecycle semantics;
- execution authority;
- Git authority;
- agent-session authority.

Those remain in the appropriate underlying services.

## Initial Implementation Boundary

The first implementation should establish only the top-layer architecture and prove Development survives beneath it.

Expected functional result:

```text
Open App
→ Workflow Hub shell

No project:
→ Select Project prompt

Select project:
→ Workflow Hub
→ Development card visible

Click Development:
→ existing Development lifecycle resumes correctly
→ Development rail appears

Click Workflows:
→ Hub returns
→ no workflow-specific lifecycle rail is shown
→ Development lifecycle state unchanged

Open Settings from Hub:
→ Settings
→ return to Hub
```

Do not implement Defect workflow internals in this pass.

When Defect is implemented later, registering its card and workflow-specific navigation should be a bounded extension rather than a Hub redesign.

## Likely Production Surfaces

The exact implementation must be based on current repository inspection, but the expected surfaces are narrow:

- `src/renderer/app/App.tsx` — shell routing and conditional top-level render, including selection of the foreground workflow's navigation surface.
- `src/renderer/app/figma/FigmaSidebar.tsx` — either add an explicit Hub presentation mode or extract a small shell sidebar while preserving current Development mode.
- `src/renderer/app/NestedWorkflowRail.tsx` — preserve as Development-owned navigation; render it when Development is foregrounded, not as universal application navigation.
- new bounded renderer component such as `WorkflowHubWorkspace.tsx` — workflow card grid.
- shared workflow definition/projection contract in the existing shared-contract area rather than embedding domain state in renderer-only constants.
- a small main/shared workflow-hub service only if dynamic workflow availability/status needs application-owned projection.
- focused renderer and shell-navigation tests.

Do not rewrite `currentWorkflowService.ts` into a generic workflow engine in order to create the Hub.

## Explicit Non-Goals

The Workflow Hub first pass must not:

- implement the Defect Workflow;
- redesign the current Development lifecycle;
- rewrite Development workspace identity;
- migrate existing planning artifacts;
- create a generic BPMN/workflow-definition language;
- create drag-and-drop workflow construction;
- create user-defined workflows;
- add Feature/UI/Graphic Design/Brainstorm placeholders;
- integrate Figma;
- create workflow queues, team assignment, ticketing, or enterprise approvals;
- infer the desired workflow automatically;
- automatically enter Development after project selection;
- duplicate Development lifecycle state in the Hub;
- treat the Development `NestedWorkflowRail` as universal navigation for peer workflows;
- make the Hub a second source of project/phase/Work Card authority.

## Acceptance Direction

The Hub architecture is successful when all of the following are true:

1. Application launch foregrounds the top-level Hub rather than assuming Development.
2. Project selection and workflow selection are visibly and architecturally separate actions.
3. The Hub sidebar contains Project, Settings, and Theme only.
4. No workflow-specific lifecycle rail is shown while the Hub is foregrounded.
5. Functional workflows appear as large whole-card buttons with icon, title, description, and explicit entry affordance.
6. Only implemented/registered workflows are rendered.
7. Development enters through its existing resolver, resumes the correct current lifecycle state, and renders its existing Development rail.
8. Returning to the Hub removes the Development navigation surface from the foreground shell without altering Development artifacts or lifecycle state.
9. Settings can be entered from the Hub and returns to the correct prior shell/workflow location.
10. Selecting another project returns to that project's Hub instead of implicitly entering Development.
11. The design allows Issue Resolution and future workflow types to register their own navigation/lifecycle surfaces without making them conform to Development's Phase/Work Card model.
12. No duplicate lifecycle authority or hidden cross-workflow state is introduced.

## Final Design Principle

The Workflow Hub is **navigation and orchestration selection, not lifecycle authority**.

The top-level application sequence is:

```text
Select the project
→ choose the kind of work
→ enter that workflow's own lifecycle
→ render that workflow's own navigation
```

Development is the first workflow beneath that boundary, not the boundary itself.
