<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC09"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC09",
    "phaseId": "phase-08",
    "title": "Phase Building Work Card Candidate Selection and Intake Context",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "medium-high",
    "dependsOn": [
      "WC08"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "workspaces": [
      {
        "id": "phase-work-card-selection",
        "level": "phase",
        "stage": "building",
        "order": 10
      },
      {
        "id": "work-card-intake",
        "level": "workCard",
        "stage": "intake",
        "order": 10
      }
    ],
    "candidateContract": "planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md",
    "handoff": {
      "path": "planning/phases/<phase-id>/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_<work-card-id>.*",
      "participationRole": "nonReviewHandoff",
      "status": "Approved",
      "outputTarget": "planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.*"
    },
    "selectionAuthority": "Current Approved Work_Card_Plan plus repository evidence",
    "completedDerived": true,
    "freshnessRule": "Stop and regenerate after upstream source revision.",
    "prohibitedScope": [
      "Formal Work Card creation",
      "Implementer handoff",
      "report review",
      "repair generation",
      "Operator validation",
      "hidden candidate queue",
      "active-card state",
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
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC09_phase_building_work_card_candidate_selection_and_intake_context.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC09 Phase Building Work Card Candidate Selection and Intake Context

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium-high
Depends on: WC08
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC09_phase_building_work_card_candidate_selection_and_intake_context.md`

## Purpose

Implement two distinct registry-backed workspaces: Phase / Building candidate selection and Work Card / Intake context/handoff preparation. Select the first eligible candidate from the current Approved Work Card Plan and create an Approved non-review Work Card Intake handoff without creating a Formal Work Card.

## Controlling Designs

- `WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `WORK_CARD_CANDIDATE_CONTRACT.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspaces

```text
id: phase-work-card-selection
level: phase
stage: building
order: 10

id: work-card-intake
level: workCard
stage: intake
order: 10
```

These are separate lifecycle surfaces. Continue from candidate selection enters `work-card-intake`; Continue from Intake enters Work Card Planning.

## Candidate Selection

The current Approved `Work_Card_Plan` is the only normal ordering authority.

Use the canonical candidate fields and resolution values. Candidate completion is derived from current Approved Formal Work Card, current Approved implementation evidence, and current Approved Validation Record after the latest repair.

The first candidate is eligible when it is planned/incomplete and all declared predecessors are derived complete or explicitly resolved in a manner that permits continuation.

The Operator must see why every candidate is complete, eligible, dependency-blocked, deferred, superseded, already satisfied, or carried forward.

No eligible candidate produces a plain-language state distinguishing all-complete, dependency-blocked, invalid plan, or explicitly resolved remaining work.

## Work Card Intake Handoff

```text
planning/phases/<phase-id>/Architect_Handoffs/WORK_CARD_INTAKE_ARCHITECT_HANDOFF_<work-card-id>.*
```

The pair uses:

```text
Document.Status=Approved
```

It records current source revisions and names the expected Formal Work Card pair:

```text
planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.*
```

The handoff cannot become a resolver gate.

## Intake Context

Include current candidate data, project planning, Phase Map/Interview/Planning bundle, relevant predecessor validation/repair evidence, and material repository facts, constraints, risks, decisions, and protected boundaries.

The handoff instructs the Architect to create one Formal Work Card, not implementation code.

## Freshness

A Work Card Plan or upstream phase revision makes the handoff stale and requires regeneration. Candidate selection stops until the Phase Planning bundle is current and Approved.

## Explicit Non-Goals

No Formal Work Card creation, Implementer handoff, report review, repair generation, Operator validation, hidden candidate queue, active-card state, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover both registry entries, candidate schema/status/evidence, dependency rules, completion derivation, explanations, canonical Approved non-review handoff, stale regeneration, and no-gate behavior.

## Acceptance Criteria

1. Both `phase-work-card-selection` and `work-card-intake` exist at their distinct lifecycle locations.
2. Selection uses the current Approved candidate contract and repository evidence.
3. Completed remains derived; persisted resolution states are enforced.
4. Candidate explanations are plain language and evidence-backed.
5. Handoff is Approved non-review at the canonical path and cannot trap the resolver.
6. Handoff names one canonical Formal Work Card target.
7. Upstream revisions stop selection and require regeneration.
8. No Formal Work Card or implementation authority is created.
9. Typecheck, build, and tests pass.
10. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, both workspace IDs, candidate parser/evidence rules, selection examples, handoff path/status/source references, stale handling, validation results, and remaining Operator validation. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should inspect mixed candidate states and dependencies, confirm the correct candidate is selected, verify the separate Intake workspace, and confirm the Approved handoff does not become the current review target.
