# SCL01F — Implement SQLite Schema and Migration Ledger

**Depends on:** SCL01E  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01F_IMPLEMENTER_REPORT.md`

## Objective

Create the first durable SQLite schema and deterministic application-owned migration mechanism.

## Required Changes

1. Implement tables for schema migrations, Projects/project versions, entity identities/entity versions, relationships, StateChanges, outbox events and project-state authority generation.
2. Store common indexed envelope fields relationally and type-specific version payload as validated canonical JSON.
3. Enforce foreign keys/uniqueness/check constraints needed by the logical model.
4. Implement ordered migration IDs with unsupported-future-version rejection.
5. Initialize required SQLite pragmas: foreign keys, WAL, synchronous FULL and bounded busy timeout.
6. Keep extension loading disabled.

## Constraints

- No workflow data migration.
- No ORM that leaks database models into Product Core.

## Acceptance Criteria

Fresh DB creation and forward migration are deterministic; schema version and required pragmas are verified at open.

## Validation

Temporary-file SQLite migration/schema tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01G.
