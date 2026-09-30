# SCL01N — Implement Source Binding, Checkpoint, and Integration State

**Depends on:** SCL01M  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01N_IMPLEMENTER_REPORT.md`

## Objective

Persist semantic references to RepositoryService source state without duplicating Git/provider ownership.

## Required Changes

1. Implement SourceBinding records referencing repository, integration target SourceLine, base SourceRevision, work SourceLine, optional checkout/current revision and preparation state.
2. Implement SourceCheckpoint records for implementation and lifecycle/disposition revisions.
3. Implement IntegrationRecord references/outcome/validation/repair/result revision.
4. Validate IDs as opaque RepositoryService references; do not introspect Git in ProjectStateService.
5. Add relationships to Work Intake/Work Item/ImplementationRecord.
6. Expose data required by future Source Graph semantic enrichment.

## Acceptance Criteria

Project State can answer which exact source revisions back work/review/integration while RepositoryService remains source-mechanics owner.

## Validation

Source-reference semantic tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01O.
