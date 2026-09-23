# SCL01M — Implement Work Intake and Route Assessment State

**Depends on:** SCL01L  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL01M_IMPLEMENTER_REPORT.md`

## Objective

Make WIR intent and routing history first-class Project State before SCL02 changes source preparation behavior.

## Required Changes

1. Implement canonical WorkIntake creation/revision/lifecycle operations.
2. Implement immutable RouteAssessment with recommendation, traits, rationale, alternate and evidence refs.
3. Link WorkIntake to its Workflow with `initiates`.
4. Represent selected/rerouted route through immutable Decision records, not a mutable route field.
5. Provide current route projection and full reroute history.
6. Implement generated Work Intake summary projection data.

## Constraints

- Do not remove the current dirty-tree gate yet; SCL02 owns behavior change.
- No source-line creation in this card.

## Acceptance Criteria

Current Work Intake and route are queryable without reading Markdown; rerouting preserves prior assessments/Decisions.

## Validation

Work Intake/routing state tests + work-item profile.

## Post-Implementation

Report + checkpoint; continue to SCL01N.
