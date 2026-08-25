# ISSUE_001 — Issue Resolution Plan

## Resolution Objective

Establish Issue Resolution as a first-class project workflow in ChampCity A/I so an existing project problem can be investigated, planned, implemented, reviewed, validated, and closed independently of the Development Phase/Work Card that happened to expose it.

The resolution must introduce the new top-level workflow boundary without redesigning the existing Development lifecycle.

## Governing Architecture

The Issue is resolved through the top-level model already defined in:

- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md`
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md`
- `issues/ISSUE_001/ARCHITECT_INVESTIGATION.md`

Target application shape:

```text
Application Shell
│
├── Project Selection
├── Workflow Hub
├── Settings
│
└── Active Workflow
    ├── Development
    └── Issue Resolution
```

Project context and workflow context are separate.

Development remains exactly where it is in its own repository-derived lifecycle when the Operator leaves Development for the Hub or Issue Resolution.

## Issue Resolution Lifecycle

The initial Issue Resolution workflow should remain small:

```text
Issue Intake
    ↓
Architect Planning
    ↓
Issue Planning
    ↓
Fix Cards
    ↓
Issue Validation
    ↓
Issue Close
```

`Fix Cards` is a parent stage with its own nested implementation loop. The Issue rail and Fix Card rail represent different levels of authority rather than compressing all corrective work into one flat sequence.

### Issue Intake

Purpose:

- record the observed problem;
- capture discovery context without asserting false causality;
- capture available runtime/repository evidence;
- establish that the Issue belongs directly to the selected project.

Primary artifact:

`ISSUE_RECORD.md`

### Architect Planning

Purpose:

- inspect the actual repository/runtime path;
- determine whether the reported project problem is supported by evidence;
- establish root cause;
- identify the existing architecture to preserve;
- decide the required correction architecture;
- recommend whether the bounded correction should proceed in Issue Resolution, be reframed to another workflow because it is genuinely broader/new planned product work, or stop because the reported problem is unsupported;
- obtain the Operator's disposition of the Architect Investigation before Issue Planning becomes eligible.

Issue Resolution is not synonymous with software-defect repair. A supported Issue may be a code defect, UX/design deficiency, configuration/environment problem, documentation problem, or a missing bounded capability that corrects an observed project problem. The absence of a pre-existing defective code path is **not** by itself a reason to reframe the Issue into Development or Feature work.

Reframe to Development/Feature only when the evidence shows that the requested work is primarily new planned product expansion or is too broad/multi-phase for the bounded Issue workflow.

Primary artifact for the bootstrap model:

`ARCHITECT_INVESTIGATION.md`

The Architect Investigation is an advisory Architect output and must receive an Operator disposition before the selected Issue advances. `Approved` makes Issue Planning eligible only when the accepted recommendation is to proceed in Issue Resolution. `RevisionRequested` keeps the Issue in Architect Planning and returns the current review notes to the Architect. A supported reframe recommendation may be approved without falsely treating the Issue as an implementation defect.

This stage replaces the need for a separate long-form issue interview when evidence and normal architectural judgment are sufficient. Conversational Architect questions are appropriate only when a material Operator choice remains.

### Issue Planning / Fix Card Map

Purpose:

- translate the confirmed correction architecture into a bounded implementation plan;
- determine ordering and dependencies;
- split oversized or multi-domain corrections into concise Fix Cards;
- provide the equivalent of one Development Phase planning layer without creating Issue phases.

Primary artifacts for the bootstrap model:

- `ISSUE_RESOLUTION_PLAN.md`
- `FIX_CARD_PLAN.md`

### Fix Card Loop

Each Fix Card is one bounded implementation contract beneath the Issue.

Target loop:

```text
Fix Card Map
→ Fix Card Planning
→ Implement
→ Architect Review
→ Fix Card Validation
→ Close / Next
```

`Fix Card Validation` is the Operator validation point for the individual Fix Card implementation. It is distinct from later `Issue Validation`, which evaluates the aggregate correction after all planned Fix Cards close.

If Fix Card Validation or earlier review proves the implementation defective, the nested loop exposes a Repair workspace:

```text
Fix Card
→ Repair Card
→ Implement / Review / Fix Card Validation
→ return to Fix Card
```

Repair therefore retains its current causal meaning. An unrelated problem discovered during Issue Resolution becomes a separate `ISSUE_xxx`, not an artificial child repair of the current Issue or Fix Card.

The intended navigation shape is:

```text
Issue Resolution rail
  Intake
  Architect Planning
  Issue Planning
  Fix Cards
  Issue Validation
  Issue Close

When Fix Cards is active:
  Fix Card Map
  Planning
  Implement
  Architect Review
  Fix Card Validation
  Repair
  Close / Next
```

### Issue Validation

After all planned Fix Cards close, validate the aggregate result against the original Issue and Resolution Plan.

Issue Validation answers:

- Is the original problem resolved?
- Do the Fix Cards together satisfy the approved resolution architecture?
- Did the correction preserve Development and other protected behavior?
- Are there unresolved observations that belong to a new Issue rather than this one?

Issue Validation is not a rerun of every Fix Card's validation. It is end-to-end confirmation that the Issue itself is resolved.

### Issue Close

Close the Issue only after aggregate validation passes.

Closing ISSUE_001 must not close, advance, revise, or otherwise alter the Development workflow.

## Target Issue Directory

Initial project-owned structure:

```text
issues/
└── ISSUE_001/
    ├── ISSUE_RECORD.md
    ├── ARCHITECT_INVESTIGATION.md
    ├── ISSUE_RESOLUTION_PLAN.md
    ├── FIX_CARD_PLAN.md
    ├── Fix_Cards/
    ├── Implementer_Reports/
    ├── Validation_Records/
    └── Repairs/
```

An Issue close artifact may be added when the close workflow is implemented. Do not invent additional folders or schema unless the application lifecycle requires them.

## Shared Services to Reuse

Issue Resolution should reuse existing application-owned infrastructure wherever the semantics match:

- selected project/workspace authority;
- repository and MCP services;
- local development-environment verification;
- Codex App Server implementation path;
- future Browser GPT implementation capabilities;
- Implementer execution telemetry;
- canonical document writers where lifecycle metadata is actually required;
- Implementer Report presentation;
- advisory Architect review;
- Operator validation;
- Repair implementation behavior;
- Settings/theme shell;
- future Git and evidence services.

Do not create a separate Issue-specific execution engine, Codex integration, repository service, Git service, or evidence subsystem.

## Required New Boundaries

The Issue cannot be implemented solely by renderer navigation. Several current contracts assume Development-specific identity.

The resolution must establish bounded Issue-domain equivalents for:

1. top-level workflow selection independent of Development `WorkspaceId`;
2. Issue discovery/current-Issue projection under `issues/`;
3. Issue workflow navigation/state;
4. Issue planning and Fix Card selection;
5. implementation contract identity that can represent a `fix-card` without requiring `phaseId`/Development parentage;
6. Fix Card-level validation, Repair, and close/next behavior beneath the Issue;
7. Issue-level validation and close.

These should be introduced at the smallest existing seams rather than by rewriting `currentWorkflowService.ts` into a universal workflow engine.

## Bootstrap Strategy for ISSUE_001

ISSUE_001 must bootstrap the workflow that will eventually own it.

Execution sequence:

```text
Manual issue-domain artifacts
→ implement Workflow Hub
→ implement Issue workflow shell/planning
→ implement reusable Fix Card loop
→ move remaining ISSUE_001 work into the new application workflow
→ perform Issue-level validation there
```

Until the relevant application surface exists, artifacts for this Issue remain under `issues/ISSUE_001` and are handled manually.

Once the application can represent the current Issue and Fix Card loop, continued out-of-band handling should stop except for emergency recovery.

## Preservation Requirements

The aggregate implementation must preserve:

- all current Development project, phase, Work Card, Repair, validation, and close semantics;
- repository-derived Development current-state authority;
- active Development state while another workflow is foregrounded;
- selected-project behavior;
- Settings and theme behavior;
- current MCP workspace binding behavior;
- current Codex/App Server execution behavior;
- Work Card Repair causality;
- existing planning artifacts and paths until a separately authorized migration/rename occurs.

## Explicit Non-Goals

ISSUE_001 does not authorize:

- renaming `planning/` to `development/`;
- implementing Feature Workflow;
- implementing Brainstorm / Design Workflow;
- implementing UI or Graphic Design workflows;
- integrating Figma;
- building a generic BPMN/workflow editor;
- automatically selecting workflows through AI inference;
- team assignment, queues, ticketing, SLA, or enterprise issue-management features;
- migration of historical out-of-band repair artifacts into Issues;
- broad rewrite of the Development resolver or workspace registry;
- duplicate execution/repository/Git/evidence services.

## Completion Direction

ISSUE_001 is resolved when the Operator can:

```text
Select ChampCity_AI
→ open Workflow Hub
→ enter Development and observe the existing current Development state
→ return to Workflow Hub without changing Development state
→ enter Issue Resolution
→ open/create a project-owned Issue
→ complete Architect Planning and Issue Planning
→ create and execute one or more Fix Cards through the shared implementation loop
→ review / Fix Card Validate / Repair / Close each Fix Card when required
→ validate and close the Issue
→ return to the Hub or Development with Development state intact
```

The detailed implementation decomposition is owned by `FIX_CARD_PLAN.md`.
