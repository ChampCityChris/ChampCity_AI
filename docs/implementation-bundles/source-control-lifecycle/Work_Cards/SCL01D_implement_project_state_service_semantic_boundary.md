# SCL01D — Implement ProjectStateService Semantic Boundary

**Depends on:** SCL01C  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01D_IMPLEMENTER_REPORT.md`

## Objective

Implement the authoritative semantic service over ProjectStateStore.

## Required Changes

1. Implement service queries defined by the client-service contract: record/current/history/relationships/lineage/summary/evidence.
2. Implement create/revise/supersede/relationship/Decision/Validation/Evidence commands.
3. Apply Product Core validators/invariants before storage.
4. Generate IDs, versions, timestamps, provenance and system PrincipalRef data mechanically.
5. Require expected revision for mutable updates.
6. Keep service API async and deployment-neutral.

## Constraints

- No renderer/IPC migration yet.
- No direct SQL.
- Service does not own RepositoryService source objects or Runtime sessions.

## Acceptance Criteria

ProjectStateService passes against the in-memory adapter and cannot bypass the domain registry/invariant engine.

## Validation

Focused service tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01E.
