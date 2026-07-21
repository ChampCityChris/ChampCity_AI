# Work Card — Phase 08 WC06 Project Building Phase Map Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC06_project_building_phase_map_workspace.md`

## Purpose

Implement the Project / Building Phase Map workspace that turns the approved `Project_Profile` and `Project_Roadmap` into a structured, reviewable, repository-backed `Phase_Map`.

The Phase Map becomes the operational phase-selection document. It identifies the ordered phases and allows the application to derive the first incomplete phase without introducing a hidden current-phase state store.

## Execution Boundary

This Work Card is approved as the sixth planned Phase 08 implementation unit, but it is not authorized for execution.

Do not execute WC06 until WC01 through WC05 are accepted and the Operator explicitly releases WC06.

## Source Design

Read and follow:

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md`

The required lifecycle location is:

```text
Project / Building
└── Phase Map Workspace
```

## Required Inputs

The workspace must use repository-backed inputs:

- Approved `planning/project/PROJECT_PROFILE.*`.
- Approved `planning/project/Project_Roadmap/PROJECT_ROADMAP_<project>.*`.
- Existing `planning/project/Phase_Map/PHASE_MAP_<project>.*`, when present.
- Approved phase closeout evidence, when completed phases already exist.
- A generated Phase Map Architect handoff prompt saved in the repository.

The renderer must not invent phase facts from chat state or hidden application memory.

## Required Workspace Experience

Implement a dual-pane Project / Building workspace:

```text
Embedded Architect browser | Phase_Map preview and disposition
```

The workspace must:

1. generate or refresh a deterministic Phase Map Architect handoff from the approved project planning documents;
2. use the embedded browser and MCP handoff capability accepted in WC03;
3. show the current repository-backed `Phase_Map` Markdown document;
4. refresh the preview after the Architect writes or revises the artifact pair;
5. support `Approved`, `Rejected`, and `RevisionRequested` dispositions;
6. preserve the existing Markdown/JSON paired-artifact contract;
7. display local read or parse errors without crashing the entire workspace.

No provider API, DOM automation, clipboard-only primary path, or browser credential extraction is authorized.

## Phase Map Artifact Contract

The canonical output remains:

```text
planning/project/Phase_Map/PHASE_MAP_<project>.md
planning/project/Phase_Map/PHASE_MAP_<project>.json
```

The pair must represent one logical document and remain disposition-synchronized.

The map must contain enough structured information to determine:

- stable phase identifier;
- phase title;
- ordered position;
- concise purpose or outcome;
- dependency or predecessor information when applicable;
- whether approved Phase Close evidence exists;
- repository-relative references to relevant project planning sources.

Do not require target hashes, route tokens, decision timelines, or approval records.

## First-Incomplete Phase Derivation

After `Phase_Map` is Approved, derive the first incomplete phase from the ordered phase records.

A mapped phase is complete only when its required Phase Close evidence is Approved. Missing, invalid, or non-Approved Phase Close evidence means the phase remains incomplete.

The derivation must:

- be deterministic;
- use document evidence rather than a persisted hidden current-phase flag;
- return the earliest incomplete phase by mapped order;
- return a clear terminal result when every mapped phase is complete;
- expose the derived phase to later Phase / Intake workspaces without automatically creating phase artifacts.

WC06 may expose a visible `Continue to Phase Intake` action for the derived phase, but it must not implement the Phase Interview workspace itself.

## Registry and Navigation Integration

Register the new workspace through the WC01 extensible registry at:

```text
level: project
stage: building
```

Do not replace the registry with a fixed workspace-name union.

The visible label should clearly identify the Phase Map function. Exact visual styling is not part of this card.

## Revision Behavior

A revision request applies to the `Phase_Map` document. The Operator may enter revision notes, return to the embedded Architect session, and refresh the saved document after correction.

The chat session is not the durable revision record. The `RevisionRequested` disposition and visible revision note must be stored with or alongside the repository-backed document using the existing document-write boundary.

## Authorized Production Scope

Create or modify only the files needed for:

- Phase Map handoff generation;
- Phase Map loading and parsing;
- first-incomplete phase derivation;
- registry-backed Project / Building workspace registration;
- dual-pane renderer UI;
- safe disposition writes through main/preload IPC.

Expected areas may include:

```text
src/shared/workspaces/
src/shared/documents/
src/main/documents/
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
```

Do not restore legacy workflow-router, current-action, approval-record, or artifact-envelope architecture.

## Authorized Test Scope

Add or modify capability-oriented tests for:

- Phase Map parsing and ordering;
- first-incomplete phase derivation;
- all-phases-complete behavior;
- missing or invalid closeout evidence;
- workspace registry entry;
- paired disposition writes;
- local error containment;
- unchanged earlier workspace behavior.

Do not create a broad isolated Phase-08 test framework.

## Explicit Non-Goals

Do not implement:

- Phase Interview behavior;
- Phase Planning behavior;
- Formal Work Card creation;
- Phase Building Work Card materialization;
- Phase Validation or Phase Close;
- Project Validation or Project Close;
- a hidden current-phase store;
- automatic phase activation records;
- `Operator_Phase_Approval` artifacts;
- approval queues, role gates, route tokens, hashes, or execution runs;
- dependency changes;
- Git operations.

## Required Validation

When execution is authorized, run:

```text
npm run typecheck
npm run build
npm test
```

Manual validation must use the real embedded Architect/MCP path already accepted in WC03. Do not use Playwright.

## Acceptance Criteria

WC06 is acceptable only when:

1. a registry-backed Project / Building Phase Map workspace exists;
2. approved Project Profile and Roadmap artifacts are the required sources;
3. the Phase Map handoff is saved in the repository;
4. the validated embedded Architect/MCP path can receive the handoff;
5. the Architect can write or revise the paired Phase Map artifacts;
6. the Operator can preview and disposition the Phase Map from the same workspace;
7. the paired artifacts remain synchronized;
8. the first incomplete phase is derived deterministically from mapped order and Approved Phase Close evidence;
9. no hidden current-phase state is introduced;
10. all-complete and malformed-evidence cases are handled clearly;
11. no Phase Interview or Phase Planning implementation is included;
12. earlier Project Intake and Project Planning behavior remains unchanged;
13. typecheck, build, and tests pass;
14. the Implementer Report accurately records the evidence;
15. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final Phase Map artifact schema or parsing contract;
- final first-incomplete derivation rule;
- registry entry and workspace label;
- real MCP handoff and write-back evidence;
- disposition and revision evidence;
- validation commands and results;
- confirmation that no hidden phase state, approval artifact, later workspace, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Manual Validation After Architect Review

The Operator should confirm that the Phase Map workspace can hand the project context to the embedded Architect, display the saved Phase Map, support revision and approval, and identify the correct first incomplete phase.

## Document Disposition

Document.Status=Approved
