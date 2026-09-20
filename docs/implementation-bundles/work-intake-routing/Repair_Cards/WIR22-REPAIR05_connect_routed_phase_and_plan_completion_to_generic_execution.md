# WIR22-REPAIR05 — Connect Routed Phase and Plan Completion to Generic Execution

**Repair order:** 5 of 7  
**Parent / failed workflow:** WIR16/WIR17 plus WIR22-REPAIR01–04  
**Failed/Operator evidence:** `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR05_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. Stop on material mismatch rather than widening scope.

## Confirmed Defect

After individual routed Work Items can complete, the generic executor still requires explicit current Phase acceptance evidence for phased Plans and explicit Plan acceptance evidence for every Plan. No production service currently supplies those routed boundary criteria.

## Root Cause

WIR16 deliberately made Phase/Plan criteria independent execution evidence, while current Phase validation/close mechanics are legacy-phase scoped and no routed Plan-level validation boundary exists.

## Repair Objective

Produce truthful routed Phase and Plan completion evidence and wire it into the generic executor so Work Item completion alone can never falsely complete a Phase or Plan.

## Required Correction

1. Build the routed `PlanExecutionInput` loader from the current execution binding plus current Work Item lifecycle evidence established by prior repairs.
2. For direct Plans, supply zero Phase evidence and keep Plan completion blocked after all Work Items close until every declared Plan acceptance criterion has current passing evidence.
3. For phased Plans, generalize/reuse the existing Phase validation semantics so each genuine routed Phase can record current acceptance evidence sourced from the approved Plan rather than legacy Phase_Planning.
4. Provide a routed Plan validation/completion boundary for Plan-level acceptance criteria; reuse existing validation document mechanics where practical instead of creating an unrelated approval engine.
5. Require exact Plan revision/freshness on Work Item, Phase, and Plan evidence; decomposition/Plan revision invalidates stale boundary evidence.
6. Expose a service-owned execution projection with current topology, Work Item/Phase state, blockers, awaiting-criteria state, and complete state for WIR22.
7. Preserve dependency barriers: successor Phases and Work Items cannot become eligible until predecessor completion includes their required criteria.

## Preserved Behavior

- Generic executor remains topology authority and route-agnostic.
- Existing legacy Phase validation remains compatible.
- Work Item validation/Repair/close evidence from REPAIR04 remains authoritative at Work Item level.
- No Git/integration side effects in this card.

## In-Scope Surface to Inspect

- `src/shared/planExecutionContracts.ts`
- `src/main/planExecution/planExecutor.ts`
- `routed Development execution service from prior repairs`
- `src/main/phaseClose/*`
- `src/main/phaseValidation or current phase validation services`
- `validation/canonical document helpers`
- `test/phase-close/phase-close-service.test.cjs`
- `test/phase-close/phase-validation-state.test.cjs`
- `test/work-card-loop/work-card-loop-state-service.test.cjs`

Only modify files required for this repair.

## Negative Constraints

- Do not derive Phase/Plan acceptance solely from Work Item count.
- Do not fabricate a Phase for direct Plans.
- Do not add renderer approval logic.
- Do not wire integration candidate creation yet.

## Acceptance Criteria

1. Direct Plan with all Work Items complete but missing Plan criteria reports `awaiting-criteria`, not complete.
2. Direct Plan completes only with current passing Plan-level criteria evidence.
3. Phased Plan requires each Phase's Work Items, dependencies, and explicit Phase criteria before Phase completion.
4. Plan completion additionally requires Plan-level acceptance criteria after all Work Items/Phases complete.
5. Revised/stale Plan invalidates old Phase/Plan acceptance evidence.
6. Service projection accurately exposes the state WIR22 will present.

## Regression Proof

Inspect existing tests and `validation/capability-map.json` before adding proof. Prefer reuse/extension; every new permanent test needs a distinct uncovered contract/failure-mode justification.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/phase-close/phase-close-service.test.cjs test/phase-close/phase-validation-state.test.cjs test/work-card-loop/work-card-loop-state-service.test.cjs test/project-planning/project-planning-service.test.cjs`

Do not run the full suite; WIR23 owns bundle-wide regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR05_IMPLEMENTER_REPORT.md` with starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact proof, commands/results, test categories, deviations/blockers, and remaining human validation.

## Source-Control Checkpoint

After this repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR22-REPAIR05: Connect Routed Phase and Plan Completion to Generic Execution`

Do not merge, tag, release, or publish.

## Manual Validation

None; final human Plan/Hub experience remains WIR23.

## Return to Workflow

After a verified passing checkpoint, read `WIR22-REPAIR06` only. Do not preload later repair cards.
