<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC13"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC13",
    "phaseId": "phase-08",
    "title": "Work Card Validation, Close, and Next-Candidate Return",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "high",
    "dependsOn": [
      "WC09",
      "WC11",
      "WC12"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "workspaces": [
      {
        "id": "work-card-validation",
        "level": "workCard",
        "stage": "validation",
        "order": 10,
        "replaces": "Operator Validation"
      },
      {
        "id": "work-card-close",
        "level": "workCard",
        "stage": "close",
        "order": 10
      }
    ],
    "validationRecordPath": "planning/phases/<phase-id>/Validation_Records/VALIDATION_RECORD_<work-card-id>_ATTEMPT<nn>.*",
    "postValidationAcceptance": "Real RevisionRequested validation → repair → approved repair report → new validation → Approved sequence.",
    "closeEvidence": "Current Approved Validation Record referencing current Approved Work Card and implementation evidence.",
    "freshnessRule": "Later Work Card, report, or repair revision makes prior passing validation stale for close purposes.",
    "returnTarget": "phase-work-card-selection through evidence-derived resolver",
    "prohibitedScope": [
      "automatic validation",
      "record before Operator action",
      "duplicate repair generator",
      "Phase Validation",
      "phase activation",
      "route tokens",
      "execution runs",
      "provider API",
      "DOM automation",
      "dependencies",
      "Git operations"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "real post-validation repair integration lane"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC13_work_card_validation_close_and_next_candidate_return.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC13 Work Card Validation, Close, and Next-Candidate Return

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC09, WC11, WC12
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC13_work_card_validation_close_and_next_candidate_return.md`

## Purpose

Implement `work-card-validation` and `work-card-close`, create repository-backed Validation Records only after Operator action, prove the real post-validation repair loop, derive Work Card Close from current Approved validation evidence, and return to Phase Building candidate selection.

## Controlling Designs

- `WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- accepted WC12 repair contract

## Workspaces and Migration

```text
id: work-card-validation
level: workCard
stage: validation
order: 10
replaces: Operator Validation

id: work-card-close
level: workCard
stage: close
order: 10
```

Retire the provisional `Operator Validation` entry after acceptance.

## Validation Entry

Require a current Approved Formal Work Card, current Approved implementation or repair report, no unresolved current report, and current source-revision consistency. No hidden validation-ready flag is authorized.

## Validation Record

Each Operator-started attempt creates:

```text
planning/phases/<phase-id>/Validation_Records/VALIDATION_RECORD_<work-card-id>_ATTEMPT<nn>.md
planning/phases/<phase-id>/Validation_Records/VALIDATION_RECORD_<work-card-id>_ATTEMPT<nn>.json
```

Number attempts from existing sibling records, not timestamps or hidden counters.

Each pair records parent Work Card path/revision, current implementation or repair report path/revision, attempt number, guidance, steps performed, observations, evidence, issues, Operator notes, artifact/source revisions, and disposition.

No Validation Record exists before Operator action. Prior attempts remain immutable evidence.

## Outcomes

- `Approved`: validation passed.
- `RevisionRequested`: expose WC12 post-validation repair.
- `Rejected`: parent remains unresolved.
- `Pending`: attempt incomplete.

## Real Post-Validation Integration Acceptance

WC13 must prove the production sequence:

```text
RevisionRequested Validation Record
→ WC12 post-validation repair
→ Approved repair Implementer Report
→ return to work-card-validation
→ new validation attempt
→ Approved Validation Record
```

This is the end-to-end acceptance deferred from WC12. Fixtures alone are insufficient.

## Work Card Close

Close requires:

- current Approved Formal Work Card;
- current Approved implementation or latest repair report;
- latest applicable Validation Record referencing those current revisions;
- Validation Record Approved.

The Approved current Validation Record is the close evidence. No separate closeout or hidden completed flag is created.

The `work-card-close` view shows completion evidence and a visible Return to Phase Building action. WC01A re-evaluates repository evidence and enters `phase-work-card-selection`.

## Freshness

Any later Formal Work Card, implementation report, or repair revision makes earlier passing validation stale for close purposes without deleting it.

## Explicit Non-Goals

No automatic validation, pre-action record, duplicate repair generator, Phase Validation, phase activation, route token, execution run, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Manual validation must include one direct passing attempt and the real failed-validation → repair → new passing attempt sequence.

## Acceptance Criteria

1. `work-card-validation` replaces the provisional Operator Validation workspace.
2. `work-card-close` exists at Work Card / Close.
3. Validation begins only from current Approved implementation evidence.
4. No record is created before Operator action.
5. Attempts are sequential and earlier attempts remain unchanged.
6. Records reference current source revisions.
7. The real post-validation repair loop is proven end to end.
8. Approved current validation closes the Work Card.
9. Later implementation changes invalidate older passing validation.
10. Return re-enters WC09 evidence-derived selection.
11. No separate closeout or hidden state is created.
12. Typecheck, build, and tests pass.
13. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, migration, workspace IDs, validation schema, attempt preservation, freshness, real post-validation repair evidence, close projection, next-candidate return, and validation results. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should complete both required validation lanes and confirm that only the current passing attempt closes the Work Card and returns to the correct candidate-selection workspace.
