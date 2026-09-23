# SCL01P — Implement Project State Queries and Derived Views

**Depends on:** SCL01O  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01P_IMPLEMENTER_REPORT.md`

## Objective

Provide deterministic current-state/read models needed by UI, workflows and agents.

## Required Changes

1. Implement bounded queryRecords filters for type/lifecycle/workflow/work item/decision/time/relationship/current/superseded state.
2. Implement CurrentProjectStateView.
3. Implement current Work Intake/route/workflow/phase/work-item/repair/validation/source/integration summaries.
4. Add common SQLite indexes for Project/type/lifecycle/lineage/version/time/relationship queries.
5. Add explicit bounds/pagination/truncation metadata.
6. Avoid prose parsing or FTS for workflow truth.

## Acceptance Criteria

Core “what is current?” questions are answered directly from canonical records/relationships with bounded queries.

## Validation

Query/read-model tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01Q.
