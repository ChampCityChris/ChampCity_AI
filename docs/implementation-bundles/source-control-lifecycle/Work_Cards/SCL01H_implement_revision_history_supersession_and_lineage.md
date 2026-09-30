# SCL01H — Implement Revision, History, Supersession, and Lineage

**Depends on:** SCL01G  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01H_IMPLEMENTER_REPORT.md`

## Objective

Make historical state directly queryable without Markdown revision files.

## Required Changes

1. Persist immutable record versions and current-version pointers.
2. Implement record-history retrieval.
3. Implement supersession as new identity + shared lineage + explicit relationship.
4. Mark predecessors superseded without erasing history.
5. Implement current-record/lineage resolution.
6. Enforce immutable-type correction rules.

## Constraints

- No historical row rewrites.
- Revision is not supersession; repair is not supersession.

## Acceptance Criteria

History, current resolution and lineage are deterministic across revisions and semantic replacements.

## Validation

Revision/supersession/history tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01I.
