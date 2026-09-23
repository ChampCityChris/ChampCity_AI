# SCL01I — Implement StateChange Audit and Transactional Outbox

**Depends on:** SCL01H  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01I_IMPLEMENTER_REPORT.md`

## Objective

Guarantee every canonical mutation has immutable audit evidence and a reliable committed-event feed.

## Required Changes

1. Generate StateChange rows with entity/version/operation/principal/time/changed-fields/reason/causation/correlation.
2. Append outbox events in the same transaction as canonical mutations.
3. Implement ordered outbox consumption/acknowledgment with idempotent event IDs.
4. Never publish an event for a rolled-back transaction.
5. Expose service events defined by ProjectStateService through an adapter-neutral dispatcher.

## Constraints

- Outbox is delivery infrastructure, not an event-sourced canonical model.
- Consumers cannot mutate state by editing audit/outbox rows.

## Acceptance Criteria

Committed mutations produce exact audit + event evidence; rollback produces neither; replay is idempotent.

## Validation

Atomicity/outbox/audit tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01J.
