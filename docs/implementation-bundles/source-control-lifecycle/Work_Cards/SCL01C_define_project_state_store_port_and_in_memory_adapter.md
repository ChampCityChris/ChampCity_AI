# SCL01C — Define ProjectStateStore Port and In-Memory Adapter

**Depends on:** SCL01B  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01C_IMPLEMENTER_REPORT.md`

## Objective

Define the persistence-neutral store contract and a deterministic in-memory conformance adapter before implementing SQLite.

## Required Changes

1. Define async ProjectStateStore operations for Projects, entities/versions, relationships, audit rows, outbox rows and provider-generation metadata.
2. Define transaction/unit-of-work semantics and optimistic expected-version inputs.
3. Implement an in-memory adapter that obeys the same atomicity/invariant contract.
4. Add reusable store conformance tests intended to run against both in-memory and SQLite adapters.
5. Ensure store APIs use domain identities/records rather than SQL-shaped concepts.

## Constraints

- No SQLite yet.
- No workflow service migration.
- In-memory adapter is test/conformance infrastructure, not production authority.

## Acceptance Criteria

The same conformance contract can exercise future durable adapters without knowing their engine.

## Validation

Store-contract/conformance tests plus work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01D.
