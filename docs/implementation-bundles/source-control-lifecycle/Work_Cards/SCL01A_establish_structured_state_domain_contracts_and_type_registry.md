# SCL01A — Establish Structured Project State Domain Contracts and Type Registry

**Depends on:** SCL01  
**Architecture:** `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`, `CHAMPCITY_STRUCTURED_PROJECT_STATE_SQLITE_PERSISTENCE_ARCHITECTURE.md`  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01A_IMPLEMENTER_REPORT.md`

## Verified Evidence

The adopted domain model now includes WorkIntake, RouteAssessment, SourceBinding, SourceCheckpoint, IntegrationRecord and RegressionObligation. No ProjectStateService implementation exists under `src/**`.

## Objective

Create the provider-neutral Project State domain package/types and centrally registered canonical entity-type definitions without persistence implementation.

## Required Changes

1. Define canonical opaque IDs, common record envelope, PrincipalRef and provenance contracts.
2. Define typed records for Project, WorkIntake, RouteAssessment, Workflow, Phase, Finding, RootCause, BoundedSolution, Criterion, WorkItem, ImplementationRecord, Validation, Evidence, Decision, RegressionObligation, SourceBinding, SourceCheckpoint and IntegrationRecord.
3. Define revision/supersession/lifecycle semantics in code.
4. Create a central entity-type registry with schema-version metadata and bounded validators.
5. Reject unknown/unregistered entity types and unsupported fields at the Product Core boundary.

## Constraints

- No SQLite or filesystem dependency.
- No Markdown parsing.
- No workflow UI changes.
- No model-generated IDs/versions/timestamps.

## Acceptance Criteria

- Every adopted canonical record type has a provider-neutral contract.
- Registry validation is deterministic and bounded.
- Domain package imports no Electron/Git/database implementation.

## Validation

Use focused domain contract tests and the validation planner work-item profile for exact changed paths. Reuse/extend existing proof where applicable.

## Post-Implementation

Write report, checkpoint commit, continue to SCL01B.
