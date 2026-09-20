# WIR22-REPAIR03 — Connect Routed Work Items to Formal Work Card Planning and Build Review

**Repair order:** 3 of 7  
**Parent / failed workflow:** WIR17 plus WIR22-REPAIR01/02  
**Failed review evidence:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR03_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. If current code materially differs from this evidence, stop rather than broadening the repair.

## Confirmed Defect

Even with an approved routed Plan, no production path selects the eligible routed Work Item and enters the existing Formal Work Card/Implementer Report lifecycle.

## Root Cause

`workCardIntakeService` selects candidates only from legacy Work_Card_Plan/Phase_Planning, and Formal Work Card preparation/report creation resolve current context through phase-scoped legacy evidence.

## Repair Objective

Use the current routed execution binding plus generic Plan eligibility to enter the established Formal Work Card planning and Build Review lifecycle for direct and phased routed Work Items.

## Required Correction

1. Add a routed Development lifecycle adapter/service that loads the current execution binding, maps current Work Card evidence into `PlanExecutionInput`, and asks the generic executor for the active/next eligible Work Item.
2. Generate Work Card Intake handoff context directly from the approved routed Plan/binding and Work Item candidate; do not create legacy Phase Planning or Work Card Plan documents.
3. Use the artifact scope from REPAIR02 to prepare/promote Formal Work Cards with exact Plan/Work Item lineage and genuine phase membership only when declared.
4. Generalize Formal Work Card preparation/current-context resolution to accept routed scope while preserving the existing legacy phase path.
5. Generalize Implementer Report target/reservation/build-review context to routed scope, preserving existing Formal/Repair contract semantics.
6. Keep single-active-Work-Item and stale/freshness checks fail closed.

## Preserved Behavior

- Existing Formal Work Card Architect draft/promotion and decomposition safety valve.
- Existing legacy Development planning/build review.
- Issue Fix Card lifecycle remains unchanged.
- No validation/Repair/close behavior is claimed until REPAIR04.

## In-Scope Surface to Inspect

- `src/main/planExecution/planExecutor.ts`
- `src/main/planExecution/developmentExecutionAdapter.ts`
- `new routed Development execution service`
- `src/main/workCardIntake/workCardIntakeService.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
- `related shared projections/preload/main IPC only as required by service ownership`

Only modify files required for this repair. Do not absorb later repair scope.

## Negative Constraints

- Do not implement routed validation/Repair/close yet.
- Do not implement Hub cutover.
- Do not create a second Work Card execution engine.
- Do not manufacture legacy planning artifacts.

## Acceptance Criteria

1. Direct routed Plan selects its eligible Work Item without a Phase artifact and can prepare/promote its Formal Work Card.
2. Phased routed Plan selects only Work Items whose genuine Phase/dependencies are eligible.
3. Approved Formal Work Card creates/resolves the correct routed Implementer Report target.
4. Legacy Development and Issue flows continue to pass.
5. Stale binding/Plan, wrong Work Item, or concurrent active Work Item blocks action.

## Regression Proof

Before adding permanent tests, inspect existing proof and `validation/capability-map.json`. Prefer reuse/extension at the same behavior boundary. Add a new permanent test only for a distinct uncovered contract/failure mode and document the gap.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-intake/work-card-intake-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-building/work-card-building-review-service.test.cjs test/work-card-loop/work-card-loop-state-service.test.cjs`

Do not run the full suite; WIR23 retains bundle-wide full regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR03_IMPLEMENTER_REPORT.md` with: starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact acceptance proof, command results, deviations/blockers, test reuse/change categories, and remaining human validation.

## Source-Control Checkpoint

After the repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR22-REPAIR03: Connect Routed Work Items to Formal Work Card Planning and Build Review`

Do not merge, tag, release, or publish.

## Manual Validation

None.

## Return to Workflow

After a verified passing checkpoint, read `WIR22-REPAIR04` only. Do not preload later repair cards.
