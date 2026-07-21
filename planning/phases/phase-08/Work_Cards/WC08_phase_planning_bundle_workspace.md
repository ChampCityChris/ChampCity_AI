# Work Card — Phase 08 WC08 Phase Planning Bundle Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC08_phase_planning_bundle_workspace.md`

## Purpose

Implement the Phase / Planning workspace that provides the approved phase context to the embedded Architect, produces the repository-backed `Phase_Planning` and `Work_Card_Plan` documents, and applies one synchronized Phase Planning disposition to both documents.

The Work Card Plan remains a plan of candidate Work Cards. It does not create executable Formal Work Cards or bypass the Work Card lifecycle.

## Execution Boundary

This Work Card is approved as the eighth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC08 until WC07 is accepted and the Operator explicitly releases WC08.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- accepted WC03 embedded browser and MCP integration evidence

The required lifecycle location is:

```text
Phase / Planning
└── Phase Planning Bundle Workspace
```

## Required Planning Context

The workspace must use repository-backed sources for the selected phase:

- Approved `Project_Profile`.
- Approved `Project_Roadmap`.
- Approved `Phase_Map` and selected phase record.
- Approved `Phase_Interview`.
- Approved prior phase closeout, when one exists.
- Relevant current repository evidence, risks, constraints, and decisions.
- A generated Phase Planning Architect handoff saved in the repository.

The Architect must not draft the phase plan from browser chat memory alone.

## Required Workspace Experience

Implement a Phase / Planning workspace with the embedded Architect and two separate document previews:

```text
Embedded Architect browser
|
├── Phase_Planning preview
└── Work_Card_Plan preview
```

The workspace must:

1. generate or refresh a phase-specific planning handoff from approved context;
2. use the embedded browser and MCP handoff accepted in WC03;
3. load and display both repository-backed Markdown documents independently;
4. refresh either preview after the Architect revises one or both artifact pairs;
5. require the Operator to review both documents before disposition;
6. provide one shared `Approved`, `Rejected`, or `RevisionRequested` action;
7. write the same explicit disposition to both logical documents as one coordinated operation;
8. prevent a lasting mixed-disposition state;
9. contain a local read, parse, or write failure without crashing the application.

## Phase Planning Artifact Contract

The canonical outputs are:

```text
planning/phases/<phase-id>/Phase_Planning.md
planning/phases/<phase-id>/Phase_Planning.json

planning/phases/<phase-id>/Work_Card_Plan.md
planning/phases/<phase-id>/Work_Card_Plan.json
```

Each Markdown/JSON pair represents one logical document. The two logical documents remain separate and independently reviewable.

## Phase Planning Content Boundary

`Phase_Planning` must provide the phase-level planning information needed to guide bounded Work Card design, including:

- phase identity, purpose, and intended outcome;
- scope and explicit non-scope;
- project and roadmap alignment;
- inputs, dependencies, and predecessor context;
- constraints, risks, and decisions;
- acceptance goals and validation approach;
- recommended implementation strategy;
- repository-relative evidence references where useful.

The application may validate the presence of required sections, but it must not fabricate planning content outside the Architect session.

## Work Card Plan Content Boundary

`Work_Card_Plan` contains mapped candidate Work Cards only. Candidate entries may include:

- candidate Work Card ID;
- title;
- concise purpose;
- intended sequence;
- dependencies;
- expected outcome;
- notes indicating whether a candidate may require later split, merge, deferment, or refinement.

Candidate entries are not executable Formal Work Cards.

Approval of `Work_Card_Plan` must not:

- write files under `planning/phases/<phase-id>/Work_Cards/`;
- authorize implementation;
- generate Implementer handoffs or execution packets;
- create execution runs;
- bypass Work Card Intake, Planning, Building, Validation, or Close.

## Shared Bundle Disposition

The Operator reviews `Phase_Planning` and `Work_Card_Plan` independently but makes one Phase Planning disposition decision.

Applying the disposition must update both document pairs together using staged writes and rollback or another bounded all-or-nothing strategy consistent with the accepted document writer.

The application must not leave one document `Approved` while the other is `Pending`, `Rejected`, or `RevisionRequested`.

A revision request may identify an issue in one document. The Architect may revise either or both documents to preserve consistency. Both return for review together.

No `Operator_Phase_Approval` artifact or bundle-approval record is permitted.

## Completion Rule

Phase Planning is complete only when:

1. the selected phase has an Approved `Phase_Interview`;
2. both phase planning document pairs exist and are readable;
3. the Operator has reviewed both documents;
4. both carry `Document.Status=Approved` from the same shared disposition action.

After approval, the workspace may expose a visible `Continue to Phase Building` action. WC08 must not create the first Formal Work Card or implement the Work Card lifecycle.

## Registry and Navigation Integration

Register the workspace through the WC01 extensible registry at:

```text
level: phase
stage: planning
```

The selected phase identity must be supplied from approved document evidence. Do not add a hidden global active-phase state.

## Authorized Production Scope

Create or modify only the files needed for:

- phase-planning context assembly;
- Architect handoff generation;
- loading and parsing both planning documents;
- registry-backed Phase / Planning workspace registration;
- embedded browser and dual-document review UI;
- paired staged disposition writes through main/preload IPC;
- prevention and recovery of mixed disposition writes.

Expected areas may include:

```text
src/shared/workspaces/
src/shared/documents/
src/main/documents/
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
```

A narrower implementation is acceptable. Do not restore legacy approval or routing subsystems.

## Authorized Test Scope

Add or modify capability-oriented tests for:

- planning-context assembly;
- required source validation;
- independent loading of the two planning documents;
- shared disposition application;
- staged write rollback on sibling failure;
- mixed-disposition detection and repair handling;
- review-both-before-disposition behavior;
- registry entry;
- local error containment;
- unchanged earlier workspace behavior.

## Explicit Non-Goals

Do not implement:

- Formal Work Card materialization;
- Work Card Intake, Planning, Building, Validation, or Close;
- Implementer handoff or execution packet generation;
- Phase Building work-card selection behavior;
- Phase Validation or Phase Close;
- Project Validation or Project Close;
- `Operator_Phase_Approval` artifacts;
- independent one-document approval;
- hidden active-phase or current-stage state;
- route tokens, role gates, approval queues, hashes, or execution runs;
- provider APIs, DOM automation, or credential extraction;
- dependency changes;
- Git operations.

## Required Validation

When execution is authorized, run:

```text
npm run typecheck
npm run build
npm test
```

Manual validation must use the real embedded Architect and MCP path accepted in WC03. Do not use Playwright.

## Acceptance Criteria

WC08 is acceptable only when:

1. a registry-backed Phase / Planning workspace exists;
2. the selected phase has an Approved Phase Interview before planning begins;
3. the phase-planning handoff is saved in the repository and contains the approved context;
4. the accepted embedded Architect/MCP path can receive the handoff;
5. the Architect can write or revise both planning document pairs;
6. the Operator can preview the two documents independently in one workspace;
7. the Operator must review both before applying a disposition;
8. one disposition action writes the same status to both documents;
9. staged writes prevent or recover from a partial mixed-disposition result;
10. revision may update either or both documents and returns both for review;
11. Phase Planning completes only when both documents are Approved;
12. no separate phase approval artifact or hidden phase state is introduced;
13. no Formal Work Card, handoff, execution packet, or Work Card lifecycle behavior is created;
14. earlier workspaces remain behaviorally unchanged;
15. typecheck, build, and tests pass;
16. the Implementer Report accurately records the evidence;
17. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final planning-context and handoff contract;
- final Phase Planning and Work Card Plan artifact contracts;
- shared disposition and staged-write behavior;
- mixed-disposition failure and recovery evidence;
- real MCP handoff and write-back evidence;
- validation commands and results;
- confirmation that no Formal Work Card, approval artifact, hidden state, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the approved phase context reaches the embedded Architect, both planning documents are displayed independently, revision can affect either or both, and one shared approval updates both without creating Formal Work Cards.

## Document Disposition

Document.Status=Approved
