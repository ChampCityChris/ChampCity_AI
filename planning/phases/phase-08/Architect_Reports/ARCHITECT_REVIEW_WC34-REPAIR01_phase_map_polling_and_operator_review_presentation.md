<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC34-REPAIR01",
    "repairId": "WC34-REPAIR01",
    "parentWorkCardId": "WC34"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC34-REPAIR01_phase_map_polling_and_operator_review_presentation.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC34-REPAIR01 Phase Map Polling and Operator Review Presentation",
    "reviewResult": "Approved",
    "validation": {
      "typecheck": "passed",
      "build": "passed",
      "tests": "176/176 passed"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "The renderer quiet-poll path now invokes promotion-capable status before document fingerprinting, and the Phase Map review defaults to an Operator-readable projection derived from canonical workflowData.phases with raw source available secondarily.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC34-REPAIR01

Disposition: `Approved`

## Findings

The implementation corrects both Operator-observed production defects.

### Automatic Phase Map promotion

The renderer now executes the production quiet-poll sequence as:

```text
getCurrentWorkspaceModel()
→ existing Phase Map promotion-capable status path
→ listDocuments()
→ calculate refreshed evidence fingerprint
→ update resolver, current model, selected output, and preview
```

This removes the prior early return that prevented promotion until the Operator pressed Refresh Phase Map.

The implementation preserves request ordering and stale-response guards. Quiet polling does not prepare a handoff, create a submission, advance the request ordinal, or introduce a second promotion path.

### Operator-readable Phase Map review

The default Phase Map preview now projects the canonical `metadata.workflowData.phases` into ordered phase entries showing:

- order and phase ID;
- title;
- purpose;
- dependencies;
- source references.

The renderer does not parse the Markdown body as domain authority. Raw canonical Markdown remains available through `View Source` and `Hide Source`. Missing or malformed phase metadata displays `Needs Attention` without fabricating phase content.

## Production-Path Proof

The focused tests exercise the extracted function used by `App.tsx`, not an unused helper:

- promotion-capable status is called before repository listing;
- a promoted Phase Map is automatically selected and loaded;
- malformed-draft promotion failure is surfaced without a final output;
- stale poll responses cannot overwrite newer state;
- the default projection renders ordered canonical phase metadata;
- source view exposes the canonical body only when selected;
- malformed metadata renders `Needs Attention`.

## Independent Validation

```text
npm run typecheck  → passed
npm run build      → passed; 1,613 modules transformed
npm test           → passed; 176/176 tests
HEAD before/after  → unchanged
```

## Preserved Behavior

The repair does not alter WC30 identity, temporary draft paths, Phase Map persistence, promotion services, schema validation, canonical metadata, disposition, downstream phase selection, Architect Interview, or Project Planning.

## Remaining Validation

Operator running-product validation remains pending. Confirm that a valid temporary Phase Map draft promotes and appears automatically without pressing Refresh Phase Map, and that the default review presents readable phase entries with a functioning source toggle.
