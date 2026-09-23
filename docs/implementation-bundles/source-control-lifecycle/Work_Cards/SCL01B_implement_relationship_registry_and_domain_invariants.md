# SCL01B — Implement Relationship Registry and Domain Invariants

**Depends on:** SCL01A  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01B_IMPLEMENTER_REPORT.md`

## Objective

Make canonical relationship direction, endpoint types, lifecycle and cross-record invariants application-enforced rather than inferred from prose or filenames.

## Required Changes

1. Implement the registered relationship vocabulary from the domain model, including Work Intake, source, integration and regression-proof relationships.
2. Validate endpoint existence/type/project ownership before relationship creation.
3. Encode immutable provenance and relationship-ending rules.
4. Implement core invariants for revision, supersession, lineage, lifecycle, immutable Decisions/Validations/relied-upon Evidence and hard-deletion prohibition.
5. Return typed domain errors rather than storage/provider error strings.

## Constraints

- No persistence adapter.
- Models may not invent new relationship predicates at runtime.
- No generic “allow unknown relationship” fallback.

## Acceptance Criteria

Invalid relationship direction/type/project ownership fails deterministically; valid relationships and supersession/lineage rules pass without infrastructure dependencies.

## Validation

Focused invariant/relationship tests plus work-item validation profile.

## Post-Implementation

Report + checkpoint; continue to SCL01C.
