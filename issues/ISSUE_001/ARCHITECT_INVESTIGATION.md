# ISSUE_001 — Architect Investigation

## Purpose

This document is the Architect Investigation for `ISSUE_001`. It is intentionally a plain Markdown issue-domain artifact for the first manual validation of the Issue Resolution workflow concept.

Source issue:

`issues/ISSUE_001/ISSUE_RECORD.md`

## Issue Confirmed

The issue is confirmed.

ChampCity A/I currently has no first-class project-owned workflow for correcting an existing project problem that is discovered while Development is active but is not causally owned by the current Phase or Work Card.

The existing corrective path is Work Card Repair. That path is correctly subordinate to failed Work Card implementation or validation evidence and should remain so. It is not an appropriate owner for unrelated project-baseline problems.

The missing capability is therefore not another Repair variant inside Development. The missing capability is a peer top-level Issue Resolution workflow beneath the selected project.

## Repository Evidence Inspected

The investigation reviewed the current shell, workflow routing, repair evidence model, implementation-card machinery, and the newly approved multi-workflow design direction, including:

- `issues/ISSUE_001/ISSUE_RECORD.md`
- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md`
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md`
- `src/renderer/app/App.tsx`
- `src/renderer/app/figma/FigmaSidebar.tsx`
- `src/renderer/app/NestedWorkflowRail.tsx`
- `src/shared/workspaceContracts.ts`
- `src/main/currentWorkflow/currentWorkflowService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`

## Confirmed Current Architecture

### Development lifecycle is currently the application foreground model

The renderer holds one `activeWorkspaceId`, backed by the existing Development workspace registry. The current visible workspace registry is made of Project, Phase, and Work Card lifecycle workspaces.

The existing `NestedWorkflowRail` projects that Development lifecycle and exposes Phase and Work Card loops when the active Development workspace requires them.

The current sidebar similarly projects Development-specific current Phase and current Work Card status.

This is appropriate inside Development but cannot be the global application shell once multiple peer workflows exist.

### Repair is explicitly Work Card-relative

The current Repair evidence model accepts only `RevisionRequested` evidence originating from:

- an Implementer Report before validation; or
- a Validation Record after validation.

The repair service resolves a `phaseId` and `workCardId` from that evidence and creates a Repair Work Card subordinate to that Work Card.

This confirms that the current Repair mechanism should not be broadened to represent independent project issues.

### The downstream Work Card implementation loop is reusable but currently typed for Development contracts

Current implementation/reporting services support:

- `formal-work-card`; and
- `repair-work-card`.

The implementation execution path, Implementer Report lifecycle, Architect review, Operator validation, Repair handling, and close behavior provide substantial reusable machinery.

The useful architecture is therefore to generalize the bounded implementation-contract seam sufficiently to support an Issue-domain Fix Card, rather than create a second coding/review/validation engine.

## Root Cause

The original application model assumes that meaningful corrective work occurs inside the planned Development hierarchy:

```text
Project
→ Phase
→ Work Card
→ Repair when that implementation fails
```

That assumption was sufficient while ChampCity had only one top-level workflow.

Dogfooding exposed the missing abstraction: project work has multiple independent workflow types. A baseline problem can be discovered while Development is active without being caused by Development.

Because project context and workflow context were previously conflated, ChampCity has no legitimate top-level owner for such work.

## Required Architecture

The selected project must become the stable top-level context, and the Workflow Hub must select which workflow is foregrounded.

Initial model:

```text
Selected Project
      ↓
Workflow Hub
   ├── Development
   └── Issue Resolution
```

Development remains the current implementation beneath the Hub.

Issue Resolution becomes a peer workflow whose artifacts live under the project-level `issues/` directory and do not require Phase or Work Card parentage from Development.

## Issue Resolution Workflow Model

The proposed workflow is validated as proportionate:

```text
Issue Intake
→ Architect Investigation / Planning
→ Issue Resolution Planning
→ Fix Card Plan
→ Fix Card Loop
→ Issue Validation
→ Issue Close
```

The Issue itself is the phase-sized planning container. Do not add another Issue Phase hierarchy.

A small Issue may have one Fix Card. A normal Issue may have several Fix Cards. An Issue that requires multiple major planning phases should be reconsidered as Feature or Development work instead of indefinitely expanding Issue Resolution.

## Artifact Model for the Bootstrap Run

For this first manual workflow validation, the issue-domain artifacts are intentionally plain Markdown under:

`issues/ISSUE_001/`

Initial structure:

```text
issues/ISSUE_001/
├── ISSUE_RECORD.md
├── ARCHITECT_INVESTIGATION.md
├── ISSUE_RESOLUTION_PLAN.md
├── FIX_CARD_PLAN.md
├── Fix_Cards/
├── Implementer_Reports/
├── Validation_Records/
└── Repairs/
```

The application-owned metadata/lifecycle representation for future Issue workflow artifacts should be designed only as needed by implementation. This bootstrap run does not create a new schema merely for documentation.

## Preservation Rules

The Issue Resolution implementation must preserve:

- existing Development lifecycle semantics and repository-derived current state;
- current Phase and Work Card loops;
- Work Card Repair as causally subordinate to failed implementation;
- selected-project persistence;
- Settings and theme behavior;
- existing Codex/App Server implementation capability;
- existing Implementer Report, Architect review, Operator validation, and Repair machinery where reusable;
- Development artifacts under the current `planning/` structure until a separate migration/rename is intentionally designed.

Entering or leaving the Workflow Hub or Issue Resolution must not close, reset, revise, or manufacture Development lifecycle state.

## Key Implementation Boundary

Do not solve ISSUE_001 by building a generic workflow engine.

The smallest sufficient architecture is:

1. a shell-level Workflow Hub above the Development workspace registry;
2. one new Issue Resolution workflow with project-owned issue state;
3. issue planning surfaces and Fix Card decomposition;
4. reuse/generalization of the existing implementation/review/validation card loop for `fix-card` contracts;
5. issue-level validation and close.

## Bootstrap Constraint

ISSUE_001 is itself building the workflow that should eventually own ISSUE_001.

Therefore the first Fix Cards may be executed manually from this `issues/ISSUE_001` directory while the Issue workflow does not yet exist.

Once the Issue Resolution shell and Fix Card loop are functional, remaining ISSUE_001 work should be routed through the new application workflow. That transition is the primary dogfood validation of the architecture.

## Architect Recommendation

Proceed in Issue Resolution

## Architect Conclusion

ISSUE_001 is confirmed as a genuine top-level orchestration gap.

The correction warrants multiple bounded Fix Cards under one Issue Resolution Plan. It does not warrant insertion into the active Development Phase, false Work Card Repair parentage, or a second multi-phase planning hierarchy.

Proceed to Issue Resolution Planning and Fix Card decomposition.
