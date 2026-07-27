<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC10"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC10",
    "phaseId": "phase-08",
    "title": "Formal Work Card Planning Workspace",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "medium-high",
    "dependsOn": [
      "WC09",
      "WC03"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "workspace": {
      "id": "work-card-planning",
      "level": "workCard",
      "stage": "planning",
      "order": 10,
      "replaces": "Work Card"
    },
    "input": "Current Approved nonReview Work Card Intake handoff",
    "artifactPath": "planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.*",
    "reviewOutcomes": {
      "Approved": "Work Card Building eligible",
      "RevisionRequested": "revise same card",
      "Rejected": "return to Phase Planning bundle revision"
    },
    "implementerInstruction": "Approved Formal Work Card",
    "freshnessRules": [
      "upstream revisions invalidate Formal Work Card",
      "Formal Work Card revision invalidates reports, repairs, and Validation Records"
    ],
    "browserSecurity": "Preserve accepted WC03 security contract.",
    "prohibitedScope": [
      "implementation execution",
      "report review",
      "repairs",
      "Operator validation",
      "execution packet",
      "hidden active card",
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
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC10_formal_work_card_planning_workspace.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC10 Formal Work Card Planning Workspace

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium-high
Depends on: WC09, WC03
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC10_formal_work_card_planning_workspace.md`

## Purpose

Implement `work-card-planning`, convert the current Approved Work Card Intake handoff into one complete Formal Work Card, and support Operator review, revision, approval, rejection, and return to Phase Planning when the candidate itself must change.

## Controlling Designs

- `WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `WORK_CARD_CANDIDATE_CONTRACT.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace and Migration

```text
id: work-card-planning
level: workCard
stage: planning
order: 10
replaces: Work Card
layout: Embedded Architect browser | Formal Work Card preview and disposition
```

Retire the provisional `Work Card` workspace. Preserve the accepted WC03 browser-security contract.

## Required Current Input

The current Approved non-review Work Card Intake handoff and all source revisions it references must be current.

## Formal Work Card Pair

```text
planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.md
planning/phases/<phase-id>/Work_Cards/<work-card-id>_<slug>.json
```

The stable Work Card ID matches the candidate ID. The pair begins Pending, contains artifact/source revisions, and includes the complete implementation contract, scope/non-scope, risks, authorized files/tests, acceptance criteria, validation expectations, Implementer instructions, required report contract, manual validation, and terminal disposition.

The Approved Formal Work Card is the complete Implementer instruction. No separate execution packet is created.

## Review Outcomes

- `Approved`: eligible for Work Card Building.
- `RevisionRequested`: revise the same Formal Work Card in the embedded Architect workspace.
- `Rejected`: expose a visible return to the Phase Planning bundle. The candidate remains unresolved until the bundle is revised and synchronously approved with a valid resolution status.

Rejected must not leave an indefinite candidate with no correction action.

## Freshness

A substantive Formal Work Card revision increments its revision and invalidates prior Implementer Reports, repairs, and Validation Records for close purposes.

An upstream candidate, Work Card Plan, Phase Planning, or other recorded source revision invalidates the Formal Work Card and returns it to Pending/stale review.

## Explicit Non-Goals

No implementation execution, report capture/review, repairs, Operator validation, next-candidate progression, execution packet, hidden active card, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Cover provisional migration, stable ID/path, source freshness, required sections, pair writes, Approved-only Building eligibility, Rejected return to Phase Planning, downstream invalidation after amendment, and WC03 security regression.

## Acceptance Criteria

1. `work-card-planning` replaces the provisional Work Card workspace.
2. The current Approved Intake handoff reaches the embedded Architect.
3. One candidate-scoped Formal Work Card pair is created.
4. Required structure is validated without fabricating content.
5. Approved is the sole Implementer instruction and Building gate.
6. Rejected provides a visible return to Phase Planning bundle revision.
7. Upstream or Work Card revisions invalidate stale reports and validation.
8. WC03 browser security remains intact.
9. No execution packet or hidden state is created.
10. Typecheck, build, and tests pass.
11. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, migration, artifact contract, candidate/path consistency, review outcomes, Phase Planning return, freshness/invalidation evidence, WC03 regression, and validation results. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should approve, revise, and reject controlled Work Cards, confirm rejection returns to Phase Planning, and confirm a post-implementation Work Card amendment invalidates older report and validation approval.
