<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC12"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC12",
    "phaseId": "phase-08",
    "title": "Work Card Repair Subsystem",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "high",
    "dependsOn": [
      "WC11"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "workspace": {
      "id": "work-card-repair",
      "level": "workCard",
      "stage": "building",
      "order": 20
    },
    "handoff": {
      "path": "planning/phases/<phase-id>/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_<repair-id>.*",
      "participationRole": "nonReviewHandoff",
      "status": "Approved"
    },
    "repairIdPattern": "<parent-id>-REPAIR<nn>",
    "parentageRule": "Every repair references the original parent; failed repair reports create the next sibling.",
    "acceptanceSplit": {
      "preValidation": "production manual acceptance in WC12",
      "postValidation": "contract/unit tests in WC12; production end-to-end acceptance in WC13"
    },
    "freshnessRule": "Later repair implementation invalidates prior passing validation for close purposes.",
    "browserSecurity": "Preserve accepted WC03 security contract.",
    "prohibitedScope": [
      "new lifecycle level",
      "nested repair parents",
      "automatic dispatch",
      "separate repair approval",
      "pre-validation Validation Record",
      "automatic validation pass",
      "parent close",
      "hidden counter",
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
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC12_work_card_repair_subsystem.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC12 Work Card Repair Subsystem

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC11
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC12_work_card_repair_subsystem.md`

## Purpose

Implement `work-card-repair`, the bounded sibling-repair subsystem for pre-validation report-review defects and the document contract later used by WC13 for post-validation failures.

## Controlling Designs

- `WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

## Workspace

```text
id: work-card-repair
level: workCard
stage: building
order: 20
layout: Embedded Architect browser | Repair Work Card preview
```

It follows `work-card-building-review` at order 10. Preserve the accepted WC03 browser-security contract.

## Repair IDs and Parentage

```text
WCxx-REPAIR01
WCxx-REPAIR02
```

Derive the next suffix from existing sibling repairs for the original parent. Every repair references the original parent Work Card; failed repair reports create the next sibling, not a nested repair parent.

## Repair Handoff

```text
planning/phases/<phase-id>/Architect_Handoffs/REPAIR_ARCHITECT_HANDOFF_<repair-id>.*
```

The handoff is Approved `nonReviewHandoff`, records current parent/evidence source revisions, and names:

```text
planning/phases/<phase-id>/Work_Cards/<parent-id>-REPAIR<nn>_<slug>.*
```

## Repair Pair

The repair begins Pending and includes repair/original parent IDs, origin, exact evidence path and revision, bounded defect, scope/non-scope, affected acceptance criteria, validation or re-review expectations, return target, expected report path, artifact/source revisions, and disposition.

Only an Approved repair is eligible for the WC11 handoff/report-review path.

## Repair Origins

### Production acceptance in WC12

Fully implement and manually validate:

```text
RevisionRequested Implementer Report
→ pre-validation repair
→ repair report
→ Architect review
→ parent Work Card Building review
```

No Validation Record is created.

### Contract implementation only in WC12

Implement and unit-test the trigger/return contract for:

```text
RevisionRequested Validation Record
→ post-validation repair
→ parent Work Card Validation
```

WC12 must not claim the real production post-validation loop is proven. WC13 owns end-to-end acceptance after the production Validation Record workflow exists.

## Freshness

Repair and report revisions participate in WC01B. A new repair implementation invalidates any prior passing validation for close purposes while preserving the historical attempt.

## Explicit Non-Goals

No new lifecycle level, repair-of-repair parent chain, automatic dispatch, separate repair approval artifact, pre-validation Validation Record, automatic validation pass, parent close, Phase Validation, hidden counter/queue, provider API, DOM automation, new dependency, or Git operation.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Manual acceptance in WC12 covers the real pre-validation path only. Automated tests cover both origin contracts, numbering, parentage, return targets, freshness, and recursive-nesting prevention.

## Acceptance Criteria

1. `work-card-repair` exists at Work Card / Building order 20.
2. Repair creation requires valid RevisionRequested evidence.
3. IDs and original-parent references are deterministic.
4. Handoff is Approved non-review at the canonical path.
5. Repairs have bounded scope and explicit return target.
6. The real pre-validation loop is manually proven.
7. Post-validation trigger/return behavior is unit-tested but not claimed as production-proven.
8. Failed repair reports create sibling repairs.
9. Parent remains open and no recursive lifecycle is created.
10. WC03 security remains intact.
11. Typecheck, build, and tests pass.
12. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, workspace order, handoff and repair contracts, pre-validation production evidence, post-validation contract tests, freshness, recursive prevention, WC03 regression, and validation results. State explicitly that WC13 owns real post-validation acceptance. End with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should complete a real report-review repair cycle and confirm no Validation Record exists. Post-validation manual acceptance is deferred to WC13.
