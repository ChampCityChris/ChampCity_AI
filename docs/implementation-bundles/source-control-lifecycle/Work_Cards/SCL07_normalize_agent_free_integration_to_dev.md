# SCL07 — Normalize Agent-Free Integration into `dev`

**Depends on:** SCL06  
**Report:** `docs/implementation-bundles/source-control-lifecycle/Implementer_Reports/SCL07_IMPLEMENTER_REPORT.md`

## Objective

Make Work Intake completion integrate exact completed revisions into the current `dev` IntegrationTarget through deterministic application-owned mechanics.

## Required Changes

1. Use exact completed Work Intake revision plus exact current `dev` target revision to prepare an IntegrationCandidate.
2. Reuse existing isolated integration mechanics/validation policy where applicable.
3. Advance `dev` only from an exact validated candidate.
4. Record integration receipts and resulting target revision.
5. Route mechanical conflicts/failed validation into the existing bounded Integration Repair model.
6. Keep Git commands/staging/commits under application control even when an agent supplies semantic source conflict resolution.
7. Retire normal workflow dependency on legacy checkout-switching `integrate_to_dev`.

## Constraints

- No automatic promotion from `dev` to `main` in this card.
- No force update.
- No agent-run merge commands.
- No requirement for remote hosting.

## Acceptance Criteria

- Clean completion integrates without agent involvement.
- Target movement is exact and validated.
- Conflicts preserve inspectable candidate state and route correctly.
- Primary pending work is never silently destroyed.

## Validation

Focused integration candidate/repair policy fixtures plus planner work-item validation.

## Post-Implementation

Report + checkpoint commit; continue to SCL08.
