# SCL01Q — Implement Markdown Projection and Structured Export

**Depends on:** SCL01P  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01Q_IMPLEMENTER_REPORT.md`

## Objective

Reverse the V1 state direction: render human-readable documents from Project State without reparsing them as authority.

## Required Changes

1. Implement renderView projections for Work Intake, Work Item/Card, Repair/Fix, validation, implementation report, route/decision history and project-state summary.
2. Include projection metadata: type/version/project/source entity IDs/generated time.
3. Implement structured export with canonical IDs/history/relationships/provenance.
4. Ensure formatting-only changes do not revise canonical state.
5. Keep architecture/governance/design Markdown conventional repository documents.
6. Make generated workflow Markdown explicitly non-authoritative.

## Acceptance Criteria

Equivalent human-readable workflow views can be regenerated from state; ordinary edits to generated projections do not mutate Project State.

## Validation

Projection golden/semantic equivalence tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01R.
