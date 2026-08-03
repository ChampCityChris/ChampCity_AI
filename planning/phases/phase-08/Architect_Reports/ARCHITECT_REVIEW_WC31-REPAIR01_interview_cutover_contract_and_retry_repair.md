<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC31-REPAIR01",
    "repairId": "WC31-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC31-REPAIR01_interview_cutover_contract_and_retry_repair.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC31-REPAIR01 Interview Cutover Contract, Revision, and Retry Repair",
    "reviewResult": "RevisionRequested",
    "deterministicValidation": {
      "typecheck": "passed",
      "build": "passed",
      "tests": "159/159 passed"
    },
    "functionalDefectsRepaired": true,
    "blockingFinding": "unauthorized WC30 identity algorithm replacement"
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The four WC31 defects are functionally repaired, but the implementation also replaced the approved WC30 framed hexadecimal identity encoding with a base32 algorithm. WC31-REPAIR01 expressly prohibited WC30 algorithm changes. The foundation change requires a separate bounded repair and proof before WC31 can be approved.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC31-REPAIR01

Disposition: `RevisionRequested`

## Accepted Functional Repair

The implementation now proves:

- the generated handoff contains the executable `artifact_toolbox` action/workspace/params structure;
- temporary drafts use `relativePath` and `overwrite:false`;
- Interview submission and promotion IDs call the shared deterministic identity builder;
- polling does not advance the request ordinal;
- explicit preparation creates a new request ordinal and draft path;
- absent targets promote as revision 1;
- eligible `RevisionRequested` Interviews promote at the same canonical path with revision +1 and reset to Pending;
- ineligible existing targets remain byte-identical and block promotion;
- failed drafts remain present and explicit retry creates a fresh draft path;
- the retired direct-save route remains absent.

These four WC31 repair objectives are not being rewritten as failures.

## Blocking Finding

`src/main/architectOutputs/architectDraftPaths.ts` was changed from the approved WC30-REPAIR02 framed hexadecimal representation to a new base32 representation, and the fixed submission prefix was also changed.

This is a functional replacement of the shared WC30 identity algorithm. WC31-REPAIR01 explicitly stated:

```text
Do not alter WC30 algorithms.
```

The Implementer report explains that normal production Prompt paths exceeded the existing identity bound. That establishes a real foundation integration defect, but it did not authorize silently repairing WC30 inside WC31-REPAIR01.

The base32 implementation appears deterministic and segment-unambiguous, and existing collision/boundary tests pass. Its technical merits do not remove the scope violation or substitute for a bounded foundation review.

## Independent Validation

```text
npm run typecheck  → passed
npm run build      → passed; 1,610 modules transformed
npm test           → passed; 159/159 tests
HEAD before/after  → 30cf9b0c224459d73bc0eb0d0cab5107754558fd
```

## Required Disposition

WC31 remains unresolved pending a separate bounded repair that either:

1. restores the approved WC30 identity algorithm and solves the production path-bound failure without replacing it; or
2. explicitly authorizes the compact identity representation as a WC30 foundation revision and proves injectivity, path bounds, deterministic behavior, and compatibility consequences.

Operator running-product validation must not begin until that foundation disposition is approved.
