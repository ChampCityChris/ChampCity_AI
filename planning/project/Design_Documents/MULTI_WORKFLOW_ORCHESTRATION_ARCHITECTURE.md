# Multi-Workflow Orchestration Architecture

## Purpose

ChampCity A/I should not treat planned software development as the only valid project workflow. The application should treat the selected project as durable context and allow the Operator to choose among multiple first-class workflows appropriate to the work being performed.

The immediate need is a first-class **Issue Resolution Workflow** that sits outside the current Development Workflow. The broader architectural purpose is to establish a reusable top layer that can later support additional peer workflows and specialist sub-workflows without forcing every activity into the phase / Work Card / validation loop.

This design note defines that top layer and the shared orchestration model beneath it. It does not authorize implementation by itself.

## Core Architectural Principle

Separate **Project Context** from **Workflow Context**.

```text
PROJECT CONTEXT
What are we working on?

ChampCity_AI


WORKFLOW CONTEXT
What kind of work are we doing to it?

Development
Issue Resolution
Feature
Brainstorm / Design
UI
Graphic Design
...
```

A project is selected first. A workflow is then selected for that project.

Changing workflow must not rewrite, close, or manufacture lifecycle state in another workflow. Each workflow retains its own current state and may be resumed later.

## Top-Level Application Model

The intended application entry flow is:

```text
Open App
   ↓
Select Project
   ↓
Workflow Hub
   ├── Development Workflow
   ├── Issue Resolution Workflow
   ├── Feature Workflow              [future]
   ├── Brainstorm / Design Workflow  [future]
   ├── UI Workflow                   [future / callable]
   └── Graphic Design Workflow       [future / callable]
```

The selected project remains the resource and artifact context. The selected workflow determines the active lifecycle, artifacts, tools, workers, and completion rules.

The Workflow Hub should eventually answer a simple Operator question:

> What kind of work are we doing to this project right now?

## Development Workflow Remains Intact

The existing Development Workflow remains the planned forward-development lane:

```text
Project Planning
→ Phase Planning
→ Work Card
→ Implement
→ Architect Review
→ Operator Validation
→ Close
```

A Repair Card remains valid when the implementation currently under review is defective.

```text
Formal Work Card
→ defective implementation attributable to that Work Card
→ Repair Work Card
→ implement / review / validate
→ return to parent Work Card lifecycle
```

Repair therefore remains **causally subordinate** to the implementation contract immediately above it.

The new workflow architecture must not redefine unrelated baseline defects as Work Card repairs merely because they were discovered during a Development Workflow run.

## Issue Resolution Workflow as a Peer Workflow

The Issue Resolution Workflow is not inserted into the Work Card Plan and is not a child of whichever Work Card happened to expose the problem.

Its ownership is:

```text
Project
  ↓
Issue Resolution Workflow
```

not:

```text
Project
  ↓
Phase
  ↓
Current Work Card
  ↓
Repair
```

A defect discovered while another workflow is active may record discovery context, but discovery context is not parentage or causal attribution.

Example:

```text
Discovered while:
  workflow: Development
  phase: phase-00
  workCard: WC01

Attributed to WC01 implementation:
  No

Correct owner:
  Project Issue Resolution Workflow
```

This prevents unrelated defects from contaminating Work Card validation evidence and prevents false Repair genealogies.

## Initial Issue Resolution Workflow Shape

The initial Issue Resolution Workflow should remain small:

```text
Issue Intake
   ↓
Architect Planning / Root Cause
   ↓
Issue Resolution Planning / Fix Card Map
   ↓
Fix Card Loop
   ↓
Issue Validation
   ↓
Issue Close
```

A likely artifact model is:

```text
issue-record
  evidence and problem definition

      ↓

architect-investigation
  confirmed issue, root cause, preservation, correction direction

      ↓

issue-resolution-plan / fix-card-plan
  one issue-level planning layer and bounded implementation decomposition

      ↓

fix-card
  bounded corrective implementation contract

      ↓

implementer-report

      ↓

validation / close evidence
```

If a Fix Card implementation itself is defective, the existing Repair concept can still apply:

```text
ISSUE_004-FC01
   ↓
ISSUE_004-FC01-REPAIR01
```

This preserves a universal semantic:

> Repair means correction of the implementation contract immediately above it.

## Workflow Registry

ChampCity should eventually represent available workflows through an application-owned registry rather than hard-coding the entire product around Development.

Conceptually:

```text
WorkflowRegistry
├── development
├── issue-resolution
├── feature
├── brainstorm-design
├── ui
├── graphic-design
└── future workflow types
```

Each workflow definition should identify at minimum:

- stable workflow ID;
- display label;
- project applicability;
- whether it is a peer top-level workflow or callable specialist workflow;
- entry conditions;
- workflow-specific lifecycle states;
- workflow-owned artifact types;
- required context packs;
- permitted capabilities;
- preferred or required worker/provider types;
- completion / close conditions;
- optional handoff targets to other workflows.

This should be a workflow-definition layer, not a second application framework. Workflows must reuse shared ChampCity services wherever possible.

## Peer Workflows vs Specialist Sub-Workflows

Not every workflow type needs the same placement.

### Peer top-level workflows

Peer workflows represent different classes of project work and should be selectable directly from the Workflow Hub.

Likely examples:

```text
Development
Issue Resolution
Feature
Brainstorm / Design
```

These workflows can exist independently and retain their own lifecycle state.

### Specialist / callable workflows

Some workflows may be launched from another workflow or used independently depending on context.

Likely examples:

```text
UI
Graphic Design
Validation
Documentation
Refactor
```

A Development Work Card may discover that a meaningful UI design pass is needed. Instead of embedding an ad hoc UI-design activity inside the Work Card, Development could launch or hand off to a UI Workflow and consume its approved output.

The same UI Workflow may also be callable independently for an existing application that needs a design overhaul outside a larger Development phase.

The architecture should therefore support both:

```text
Project → UI Workflow
```

and:

```text
Development Workflow
   ↓
UI specialist workflow
   ↓
approved UI artifacts / implementation guidance
   ↓
return to Development
```

## Shared Platform Beneath All Workflows

Workflow types must not each recreate repository, execution, validation, evidence, or agent infrastructure.

The shared platform should provide:

```text
Project / Workspace Registry
Repository Service
Filesystem Service
Git Service
Local Execution Service
Development Environment Service
Agent Session Service
Context / Skills Service
Worker Delegation
Evidence / Observability
Browser / UI Validation
Canonical Artifact Services
Review / Disposition Services
```

The architecture is therefore:

```text
                         Selected Project
                               │
                         Workflow Hub
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   Development        Issue Resolution           Feature
    Workflow               Workflow              Workflow
        │                      │                      │
        └───────────────┬──────┴──────┬───────────────┘
                        │             │
                Specialist Workflows │
                 UI / Graphics /     │
                 Validation / etc.   │
                        │             │
                        └──────┬──────┘
                               │
                    Shared ChampCity Services
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
 Browser ChatGPT        Codex App Server        Local Model
```

## Provider and Tool Specialization

Different workflows may make different providers or external systems valuable without changing the shared authority model.

### Development

Likely workers and tools:

- Browser GPT for architecture, implementation reasoning, and orchestration;
- Codex App Server for difficult local coding/debugging work;
- local models for bounded mechanical tasks;
- repository, execution, environment, Git, browser-validation services.

### UI Workflow

Potential workers and tools:

```text
Browser GPT
  design reasoning / interaction review

Figma / Figma AI through MCP
  layout, components, mockups, design artifacts

Codex or Browser GPT implementation
  repo changes

Playwright / screenshots
  rendered validation
```

A UI Workflow can therefore coordinate design-system work, mockups, source implementation, and visual validation without forcing all those activities into a generic coding Work Card.

### Graphic Design Workflow

Potential outputs include:

- logos;
- icons;
- splash screens;
- application artwork;
- branding primitives;
- marketing / project imagery;
- export-ready project assets.

Potential flow:

```text
Creative Brief
→ Concepts
→ Selection
→ Revision
→ Approved Asset
→ Optional repository integration handoff
```

The workflow can use image-generation/editing providers, Figma, or other creative tooling while still using ChampCity artifact, evidence, review, and repository services.

### Brainstorm / Design Workflow

This workflow may perform no code mutation at all.

Potential flow:

```text
Idea / Problem
→ Guided discussion
→ Research
→ Alternatives
→ Decision
→ Architecture / Design Artifact
→ Optional handoff to Feature or Development
```

This gives conceptual work a legitimate lifecycle rather than forcing every useful project discussion to become Phase Planning prematurely.

## Workflow-to-Workflow Handoffs

Workflow transitions should be explicit and artifact-based rather than hidden lifecycle mutation.

Examples:

```text
Brainstorm / Design
→ approved architecture note
→ Feature Workflow
```

```text
Feature Workflow
→ approved feature contract
→ Development Workflow
```

```text
Development Workflow
→ UI specialist request
→ UI Workflow
→ approved UI design / implementation guidance
→ Development resumes
```

```text
Issue Resolution Workflow
→ validated baseline fix
→ close
→ Operator returns to whatever workflow they choose
```

A workflow handoff may include a suggested return target, but switching workflows must not imply that another workflow failed, closed, or was superseded.

## Workflow State Isolation

Each workflow must own its own foreground state.

Example:

```text
Development
  phase-00 / WC03 / Implement

Issue Resolution
  ISSUE_007 / Architect Planning

UI
  no active item
```

If the Operator moves from Development to Issue Resolution and later returns to Development, Development should still be at:

```text
phase-00 / WC03 / Implement
```

No special Repair evidence, suspension record, or Validation Record should be manufactured merely because the Operator changed workflows.

This keeps workflow navigation simple and avoids false authority transitions.

## Workflow Context and Resource Context

A provider session should receive both workflow context and resource authority.

Conceptually:

```text
Project Context
  selected project / workspace

Workflow Context
  issue-resolution / development / UI / etc.

Item Context
  Work Card / Issue / Feature / design task

Resource Context
  registered workspaceIds
  filesystem rootIds
  execution authority
  Git mutation authority

Capability Context
  tools permitted for this workflow/task

Evidence Context
  prior findings / commands / artifacts / validation state
```

This allows the same worker provider to behave differently according to the active workflow without making the provider itself the authority.

## Design Goal: Add Workflows Without Rebuilding ChampCity

A successful workflow platform should make a new workflow primarily a matter of defining:

```text
intake
lifecycle
artifacts
worker/tool mix
acceptance / close conditions
handoffs
```

rather than rebuilding:

```text
repository access
execution
Git
agent sessions
MCP
canonical writers
review plumbing
observability
```

That reuse is the architectural payoff of creating the top layer now.

## Immediate Implementation Direction

The first implementation should remain deliberately narrow.

### Step 1 — Add Workflow Hub / top-level workflow selection

After project selection, provide a top-level workflow-selection surface.

Initial available workflows:

```text
Development
Issue Resolution
```

Development routes into the current application lifecycle without behavioral redesign.

Issue Resolution routes into the new Issue Resolution Workflow.

The architecture should permit later registry expansion, but this first implementation should not build placeholder workflows for Feature, UI, Graphics, or Brainstorm/Design.

### Step 2 — Preserve Development state independently

Introducing the Workflow Hub must not reset, recompute, or reinterpret current Development lifecycle state.

Development should remain the existing workflow beneath the new selector.

### Step 3 — Implement first-class Issue Resolution Workflow

Use the new top-level workflow boundary to create project-owned Issue intake, Architect Planning, Issue Resolution Planning, Fix Card implementation/review/validation, Issue Validation, and Issue Close behavior without requiring a Phase or current Work Card parent.

### Step 4 — Dogfood the Issue Resolution Workflow

Once available, further ChampCity baseline issues discovered during ongoing development should be routed through the new Issue Resolution Workflow instead of top-level `repair/` artifacts or unrelated Work Card validation evidence.

This is the first proof that ChampCity can support multiple workflow types against the same project.

## Explicit Non-Goals for the First Pass

Do not use the initial Workflow Hub implementation to:

- redesign the existing Development workflow;
- replace current Work Card / Repair Card lifecycle semantics;
- build a generic BPMN/workflow-engine product;
- add team assignment, enterprise approvals, queues, or ticket-management features;
- implement Feature Workflow;
- implement UI Workflow;
- integrate Figma yet;
- implement Graphic Design Workflow;
- implement Brainstorm / Design Workflow;
- create automatic workflow switching based on model inference;
- create hidden cross-workflow authority;
- create a second repository, execution, Git, evidence, or agent-session subsystem.

The first objective is simply to establish the correct top-level architectural boundary and use it for Development plus Issue Resolution.

## Future Acceptance Direction

The multi-workflow architecture is successful when:

1. A project can be selected independently of a workflow.
2. The Operator can choose among registered workflow types.
3. Development retains its current state when another workflow is entered.
4. A baseline defect can be captured and resolved without falsifying Work Card causality.
5. Workflows reuse shared ChampCity services rather than implementing provider-specific infrastructure.
6. Workflow-specific agents, MCP integrations, and artifact types can be added without rewriting core project authority.
7. Specialist workflows can eventually be launched directly or called from another workflow through explicit artifact-based handoffs.
8. Browser GPT, Codex App Server, local models, Figma, creative tools, browser-validation tools, and future providers can participate according to workflow need while ChampCity retains project, resource, and lifecycle authority.

## Final Architecture Principle

ChampCity A/I should evolve from a single development lifecycle into a project-centered orchestration platform.

The project answers:

> What are we working on?

The workflow answers:

> What kind of work are we doing?

The shared ChampCity platform answers:

> What resources, tools, agents, artifacts, evidence, and authority are available to do it safely and audibly?

Development is the first workflow, not the definition of the product.
