# SCL01G — Implement SQLite Store Transactions and Concurrency

**Depends on:** SCL01F  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01G_IMPLEMENTER_REPORT.md`

## Objective

Implement ProjectStateStore on SQLite with atomic semantic transactions and optimistic concurrency.

## Required Changes

1. Implement the SCL01C store port using the qualified SQLite binding.
2. Serialize canonical mutation transactions through one service-owned writer path.
3. Enforce expected current versions inside the transaction.
4. Persist entity/version/relationship/audit/outbox changes atomically.
5. Map engine failures to typed persistence/service errors.
6. Provide bounded read/query transactions without exposing SQLite handles upward.

## Constraints

- No workflow-specific SQL.
- No retry logic based on parsing SQLite messages.
- No network-filesystem support.

## Acceptance Criteria

SQLite adapter passes the same conformance suite as the in-memory adapter; concurrent stale updates fail deterministically without partial mutations.

## Validation

Store conformance + concurrency/rollback fixtures + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01H.
