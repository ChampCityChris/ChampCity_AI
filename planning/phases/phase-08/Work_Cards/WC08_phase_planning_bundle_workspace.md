<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC08"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC08",
    "phaseId": "phase-08",
    "title": "Phase Planning Bundle Workspace",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "medium-high",
    "dependsOn": [
      "WC07",
      "WC03"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "workspace": {
      "id": "phase-planning-bundle",
      "level": "phase",
      "stage": "planning",
      "order": 10,
      "replaces": "Phase Planning"
    },
    "handoff": {
      "path": "planning/phases/<phase-id>/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_<phase-id>.*",
      "participationRole": "nonReviewHandoff",
      "status": "Approved"
    },
    "outputs": [
      "planning/phases/<phase-id>/Phase_Planning.*",
      "planning/phases/<phase-id>/Work_Card_Plan.*"
    ],
    "candidateFields": [
      "candidateId",
      "order",
      "title",
      "purpose",
      "dependsOn",
      "resolutionStatus",
      "resolutionReason",
      "evidencePaths"
    ],
    "candidateResolutionValues": [
      "planned",
      "deferred",
      "superseded",
      "alreadySatisfied",
      "carriedForward"
    ],
    "completedDerived": true,
    "planRevisionEffects": [
      "both bundle documents Pending",
      "revision increment",
      "downstream invalidation",
      "reapproval required"
    ],
    "browserSecurity": "Preserve accepted WC03 security contract.",
    "prohibitedScope": [
      "Formal Work Cards",
      "candidate selection",
      "Implementer handoff",
      "hidden active phase",
      "independent approval",
      "provider API",
      "DOM automation",
      "dependencies",
      "Git operations"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC08_phase_planning_bundle_workspace.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC08 Phase Planning Bundle Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium-high
Depends on: WC07, WC03
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC08_phase_planning_bundle_workspace.md`

## Purpose

Implement `phase-planning-bundle`, generate the Approved non-review Phase Planning handoff, receive `Phase_Planning` and `Work_Card_Plan`, enforce the canonical candidate contract, and apply one synchronized planning-bundle disposition.

## Controlling Designs

- `PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md`
- `WORK_CARD_CANDIDATE_CONTRACT.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace and Migration

```text
id: phase-planning-bundle
level: phase
stage: planning
order: 10
replaces: Phase Planning
```

Retire the provisional `Phase Planning` entry after acceptance. Preserve the WC03 browser-security contract.

## Generated Handoff

```text
planning/phases/<phase-id>/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_<phase-id>.*
```

The pair is an Approved `nonReviewHandoff`, records current source revisions, and names:

```text
planning/phases/<phase-id>/Phase_Planning.*
planning/phases/<phase-id>/Work_Card_Plan.*
```

## Planning Outputs

Both pairs begin Pending, have artifact/source revisions, and are independently previewed. One shared Approve, Reject, or Request Revision action updates all four files through a staged operation.

## Candidate Contract

Every Work Card Plan candidate must include:

```text
candidateId
order
title
purpose
dependsOn[]
resolutionStatus
resolutionReason
evidencePaths[]
```

Persisted resolution values:

```text
planned
deferred
superseded
alreadySatisfied
carriedForward
```

`completed` is derived from current Work Card evidence and is not manually assigned.

Non-planned resolutions require the evidence defined in `WORK_CARD_CANDIDATE_CONTRACT.md`.

## Plan Revision

Any change to candidate identity, order, dependency, purpose, resolution status, reason, or evidence is a substantive Work Card Plan revision. Both planning documents return to a coherent Pending state, source revisions update, downstream candidate/Formal Work Card evidence is invalidated, and synchronized approval is required again.

## Completion

Phase Planning completes only when both current pairs are valid, synchronized, fresh, reviewed, and Approved.

Approval creates candidate planning authority only. It does not create Formal Work Cards, Implementer handoffs, or execution authority.

## Explicit Non-Goals

No Formal Work Card materialization, candidate selection, Implementer handoff, hidden active-phase state, independent one-document approval, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover provisional migration, handoff role/path, candidate schema and evidence, shared four-file transactions, mixed-state recovery, plan revision, downstream invalidation, current completion, and WC03 security regression.

## Acceptance Criteria

1. `phase-planning-bundle` replaces the provisional Phase Planning workspace.
2. Handoff is Approved non-review at the canonical path.
3. Both planning outputs are independently readable but synchronously dispositioned.
4. Candidate records use the canonical fields and resolution enum.
5. `completed` remains derived.
6. Candidate changes reset the bundle and invalidate downstream evidence.
7. Phase Planning requires both current Approved documents.
8. No Formal Work Card or execution authority is created.
9. WC03 security remains intact.
10. Typecheck, build, and tests pass.
11. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, migration, handoff and output paths, candidate parser/schema, resolution evidence, transaction and invalidation behavior, WC03 regression, validation results, and remaining Operator validation. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should approve a planning bundle, change a candidate state or dependency, and confirm the bundle and affected downstream work return to review before selection resumes.
