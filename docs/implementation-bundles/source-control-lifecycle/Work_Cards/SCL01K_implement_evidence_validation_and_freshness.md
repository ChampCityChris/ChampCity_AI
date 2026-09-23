# SCL01K — Implement Evidence, Validation, and Freshness

**Depends on:** SCL01J  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01K_IMPLEMENTER_REPORT.md`

## Objective

Implement immutable proof records and version/source-baseline-aware validation freshness.

## Required Changes

1. Implement Evidence records with digest, payloadRef, media type, size and provenance.
2. Implement immutable Validation records with type/method/outcome/performer/time/summary.
3. Bind Validation to target entity ID + exact target record version and optional source baseline.
4. Compute current/stale validation mechanically.
5. Enforce validation policy classes and completion-relevant freshness.
6. Keep large evidence payload bytes outside ordinary Project State rows.

## Acceptance Criteria

Changing a target semantic version/source baseline makes prior proof historical but stale without deleting it.

## Validation

Evidence/validation/freshness tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01L.
