# SCL01W — Migrate Project, Architect/Planning, and Work Intake State Access

**Depends on:** SCL01V  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01W_IMPLEMENTER_REPORT.md`

## Objective

Move the first major workflow family from direct Markdown reconstruction to ProjectStateService behind compatibility façades while legacy authority remains active until cutover.

## Required Changes

1. Migrate Project identity/resource reads and active Project projections.
2. Migrate Project Intake/Architect Interview/Architect Outputs/Project Planning semantic reads/writes to ProjectStateService operations/projections.
3. Migrate current WIR Work Intake/routing/planning semantic access to WorkIntake/RouteAssessment/Decision/Workflow records.
4. Keep required V1 UI/IPC contracts working through façades during transition.
5. Stop introducing new canonical Markdown writes in migrated paths; pre-cutover legacy write compatibility must remain explicitly fenced/temporary.
6. Preserve architecture/governance Markdown as normal documents.

## Constraints

- Do not implement SCL02 source-preparation behavior yet.
- No web-client migration.

## Acceptance Criteria

These workflow semantics can execute against structured-state adapters without scanning Markdown for current truth.

## Validation

Affected Project/Architect/Planning/WIR focused tests + migration/work-item profiles.

## Post-Implementation

Report + checkpoint; continue to SCL01X.
