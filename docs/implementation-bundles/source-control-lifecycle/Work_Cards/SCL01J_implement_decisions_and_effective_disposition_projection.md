# SCL01J — Implement Decisions and Effective Disposition Projection

**Depends on:** SCL01I  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01J_IMPLEMENTER_REPORT.md`

## Objective

Move discretionary decisions/dispositions from mutable Markdown status fields into immutable Decision records and deterministic effective-state projection.

## Required Changes

1. Implement Decision creation with actor/role/scope/outcome/rationale/effective time.
2. Enforce immutability; correction uses a new superseding Decision.
3. Implement `governs` relationships.
4. Compute effective disposition from applicable Decisions rather than direct mutable fields.
5. Distinguish normal later Decisions from corrective supersession.
6. Expose required-Operator-decision queries without inventing decisions where policy does not require one.

## Acceptance Criteria

A validation or model recommendation alone cannot create an Operator disposition; historical Decisions remain queryable and current state is deterministic. A simple Operator acceptance is not blocked merely because no free-text rationale was entered.

## Validation

Decision/disposition/governance tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01K.
