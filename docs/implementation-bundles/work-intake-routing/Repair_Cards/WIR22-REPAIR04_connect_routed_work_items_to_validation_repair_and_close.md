# WIR22-REPAIR04 — Connect Routed Work Items to Validation, Repair, and Close

**Repair order:** 4 of 7  
**Parent / failed workflow:** WIR17 plus WIR22-REPAIR01/02/03  
**Failed review evidence:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR04_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. If current code materially differs from this evidence, stop rather than broadening the repair.

## Confirmed Defect

Routed Work Items would still stop after Build Review because validation records, Repair creation, effective completion, and close-return are phase-scoped legacy mechanics.

## Root Cause

Downstream Work Card lifecycle services resolve contracts/evidence by mandatory phaseId and hard-coded `planning/phases/...` paths rather than by the Work Item's artifact scope.

## Repair Objective

Generalize the existing validation, Repair, effective-completion, and close-return mechanics to routed Work Item scopes while preserving their semantics and legacy compatibility.

## Required Correction

1. Make validation attempt creation/advisory review/current-record lookup resolve the current Work Item artifact scope and retain exact Formal Work Card/report source revisions.
2. Make Repair evidence discovery, Repair handoff/Repair Work Card paths, parent lineage, and return target work under routed scope without fake Phase identity.
3. Generalize effective Work Card completion and close-return consumption to the routed scope so current approved validation and Repair chains remain the completion authority.
4. Preserve `RevisionRequested` repair semantics, multiple sequential Repairs, current evidence freshness, and single active repair rules.
5. Feed resulting Work Item lifecycle stage/criteria evidence back to the routed Development adapter for generic executor projection.

## Preserved Behavior

- Legacy Work Card validation/Repair/close behavior.
- Issue-specific RCA and Fix/Repair projections.
- Operator validation semantics currently retained by V1.
- No Plan/Phase completion claim until REPAIR05.

## In-Scope Surface to Inspect

- `src/main/workCardValidation/workCardValidationService.ts`
- `src/main/workCardRepair/workCardRepairService.ts`
- `src/main/workCardLoop/effectiveWorkCardCompletion.ts`
- `src/main/workCardLoop/workCardCloseReturnLifecycle.ts`
- `src/main/workCardLoop/workCardLoopStateService.ts`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`
- `routed Development adapter/service`

Only modify files required for this repair. Do not absorb later repair scope.

## Negative Constraints

- No Phase/Plan acceptance aggregation yet.
- No integration candidate wiring yet.
- No renderer Hub changes.
- No broad rewrite of validation governance.

## Acceptance Criteria

1. Routed direct Work Item can progress Formal Card → Report → Validation → Repair if required → Approved close → durable complete.
2. Routed phased Work Item uses the same lifecycle under its genuine Phase scope.
3. Multiple Repairs retain parent/original lineage and current effective validation semantics.
4. Generic executor receives current Work Item acceptance criteria evidence only after valid close/completion.
5. Legacy and Issue regression suites remain green.

## Regression Proof

Before adding permanent tests, inspect existing proof and `validation/capability-map.json`. Prefer reuse/extension at the same behavior boundary. Add a new permanent test only for a distinct uncovered contract/failure mode and document the gap.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-validation/work-card-validation-service.test.cjs test/work-card-repair/work-card-repair-service.test.cjs test/work-card-loop/work-card-loop-state-service.test.cjs test/characterization/desktop-development-lifecycle.test.cjs`

Do not run the full suite; WIR23 retains bundle-wide full regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR04_IMPLEMENTER_REPORT.md` with: starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact acceptance proof, command results, deviations/blockers, test reuse/change categories, and remaining human validation.

## Source-Control Checkpoint

After the repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR22-REPAIR04: Connect Routed Work Items to Validation, Repair, and Close`

Do not merge, tag, release, or publish.

## Manual Validation

None.

## Return to Workflow

After a verified passing checkpoint, read `WIR22-REPAIR05` only. Do not preload later repair cards.
