# Work Card — Phase 08 WC06 Project Building Phase Map Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Depends on: WC05
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC06_project_building_phase_map_workspace.md`

## Purpose

Implement `project-phase-map`, generate the Approved non-review Phase Map Architect handoff, receive and disposition the paired `Phase_Map`, and derive the first incomplete phase from current closeout evidence without persisting duplicate completion state.

## Controlling Designs

- `PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- `EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`

## Workspace

```text
id: project-phase-map
level: project
stage: building
order: 10
layout: Embedded Architect browser | Phase_Map preview and disposition
```

Preserve the WC03 browser-security contract.

## Required Current Inputs

Current Approved `Project_Profile` and `Project_Roadmap`, an existing current Phase Map when revising, and current Phase Closeout evidence as context.

## Generated Handoff

```text
planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_<project-slug>.*
```

The pair is an Approved `nonReviewHandoff`, records source revisions, and names:

```text
planning/project/Phase_Map/PHASE_MAP_<project-slug>.*
```

## Phase Map Contract

Persist only:

- stable phase ID;
- title;
- ordered position;
- purpose/outcome;
- dependencies or predecessor relationships;
- repository-relative project-planning source references.

Do **not** persist whether a phase has Approved close evidence. Completion is projected at read time from current `Phase_Closeout` documents.

The Phase Map pair begins Pending, contains artifact/source revisions, and supports synchronized Approve, Reject, and RevisionRequested actions.

## First-Incomplete Phase

After the map is current and Approved, WC01A derives the earliest mapped phase lacking a current Approved `Close` Phase Closeout. All-phase-complete is a semantic result that leads toward Project Validation.

Phase Map revision invalidates affected phase and Work Card evidence through WC01B.

## Explicit Non-Goals

No persisted completion indicator, Phase Interview, Phase Planning, Formal Work Card, phase activation artifact, hidden active-phase state, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover stable ID, handoff role/path, map schema, absence of persisted completion, computed closeout projection, source freshness, revision invalidation, WC03 security regression, and malformed evidence.

## Acceptance Criteria

1. `project-phase-map` is registry-backed at Project / Building order 10.
2. Handoff is an Approved non-review document at the canonical path.
3. Phase Map persists identity/order/purpose/dependency data only.
4. Phase completion is computed from current closeout evidence.
5. First-incomplete and all-complete results are deterministic.
6. Revision invalidates dependent phase evidence.
7. WC03 security remains intact.
8. No hidden state or activation artifact is created.
9. Typecheck, build, and tests pass.
10. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, workspace ID, paths, Phase Map schema, proof that completion is not persisted, resolver evidence, invalidation, WC03 regression, and validation results. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should approve a Phase Map, add and revise Phase Closeouts, confirm completion indicators update without rewriting the map, and verify map revision invalidates affected phase work.

## Document Disposition

Document.Status=Approved
