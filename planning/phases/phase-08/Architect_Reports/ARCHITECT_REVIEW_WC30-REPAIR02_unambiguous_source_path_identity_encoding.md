<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC30-REPAIR02",
    "repairId": "WC30-REPAIR02"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30-REPAIR02_unambiguous_source_path_identity_encoding.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC30-REPAIR02 Unambiguous Source Path Identity Encoding",
    "reviewResult": "Approved",
    "deterministicValidation": {
      "typecheck": "passed",
      "build": "passed",
      "tests": "151/151 passed"
    },
    "productionAdoptionAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "The source-path identity encoding is now injective by construction, adversarial collision cases pass, accepted cleanup behavior remains intact, and no production workflow adoption occurred.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC30-REPAIR02

Disposition: `Approved`  
Production adoption: not authorized by this review  
Git mutation: none

## Review Result

WC30-REPAIR02 satisfies its bounded repair scope.

The source handoff path encoder now:

- normalizes and validates one repository-relative path;
- splits it into original path segments;
- converts every UTF-8 byte of every segment into exactly two lowercase hexadecimal characters;
- prefixes each encoded segment with its original UTF-8 byte length;
- joins framed segments with a separator that cannot occur inside the hexadecimal payload;
- preserves source revision as a separate identity component;
- retains the established submission-ID and draft-path bounds.

This representation removes the prior mixed literal/escape ambiguity. Distinct permitted normalized source paths cannot collapse because their segment count, byte lengths, or exact byte sequences must differ.

## Accepted Proof

The focused tests cover:

- `planning/-/handoff.md` versus `planning/x2d/handoff.md`;
- `planning/x/handoff.md` versus `planning/x78/handoff.md`;
- `planning/a-b/c.md` versus `planning/a/b-c.md`;
- deterministic identical input;
- distinct source revisions;
- near-bound success;
- over-bound failure before mutation;
- absolute and traversal rejection before mutation.

The accepted WC30-REPAIR01 cleanup behavior remains passing for single and atomic-bundle promotion.

## Independent Validation

```text
npm run typecheck  → passed
npm run build      → passed; 1,610 modules transformed
npm test           → passed; 151/151 tests
HEAD before/after  → 30cf9b0c224459d73bc0eb0d0cab5107754558fd
```

## Scope Confirmation

No production Architect-output definition, renderer integration, IPC, preload change, workflow cutover, migration, compatibility reader, fallback, dual write, hash, token, marker file, sidecar, or persistent identity store was added.

WC30-REPAIR02 is complete. WC30A remains the next infrastructure card before the WC31 production pilot.
