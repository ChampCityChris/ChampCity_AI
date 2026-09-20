# WIR22-REPAIR01 — Establish Routed Development Execution Binding

**Repair order:** 1 of 7  
**Parent / failed workflow:** WIR17 / blocked WIR22 dependency verification  
**Failed review evidence:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR01_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. If current code materially differs from this evidence, stop rather than broadening the repair.

## Confirmed Defect

Approved non-Issue routed Work Plans exist but have no durable production execution binding analogous to the Issue routed execution binding. Without that binding, Feature/Refactor/Greenfield/Integration/Infrastructure Plans cannot enter real implementation.

## Root Cause

WIR17 adapted the legacy Development lifecycle to the generic executor but still starts from legacy Phase/Work Card planning artifacts. The routed planning kernel and Development lifecycle remain separate source graphs.

## Repair Objective

Create a bounded V1 execution-binding service for current approved non-Issue routed Plans. The binding must preserve exact Plan identity/revision/digest, Intake/route/branch lineage, direct/phased structure, and freshness without creating any legacy Phase_Planning or Work_Card_Plan artifacts.

## Required Correction

1. Add a deterministic execution-binding artifact/path and reader for approved current routed Plans except `issue-resolution`; research outcomes with no implementation Plan remain closed and cannot activate.
2. Bind exact intakeId, routeDecisionId, routeId, planId, Plan revision/content digest, branch binding, Work Item identities, and genuine Phase identities when topology is phased.
3. Require current approved/fresh Plan sources and current Work Intake branch binding; stale/superseded/rejected Plans fail closed.
4. Make activation idempotent for the same current Plan and refuse to silently replace an existing incompatible legacy or routed execution binding.
5. Expose a service projection that later repairs can use without requiring renderer state or route-specific execution logic.

## Preserved Behavior

- Issue Resolution keeps `issueExecutionPlan.ts` and its current mapping.
- Legacy Development artifacts/workflows are unchanged.
- Direct Plans remain phase-less; phased Plans preserve only declared genuine Phases.

## In-Scope Surface to Inspect

- `src/main/workPlanning/workPlanningKernel.ts`
- `src/main/planExecution/issueExecutionPlan.ts (pattern only)`
- `src/shared/workPlanningContracts.ts`
- `Work Intake branch-binding services`
- `new routed Development execution-binding service/contracts`
- `test/project-planning/project-planning-service.test.cjs`

Only modify files required for this repair. Do not absorb later repair scope.

## Negative Constraints

- No Work Card intake/planning changes yet.
- No validation/Repair/close changes.
- No renderer changes.
- No Git integration/merge behavior.

## Acceptance Criteria

1. Approved current non-Issue Plan can activate one durable execution binding.
2. Binding round-trip reproduces exact Plan topology/Work Items/Phases and Plan source identity.
3. Direct activation creates no Phase artifact or Phase identity.
4. Stale/revised/superseded Plan or wrong branch fails closed.
5. Issue route and research-no-plan route are rejected by this binding.

## Regression Proof

Before adding permanent tests, inspect existing proof and `validation/capability-map.json`. Prefer reuse/extension at the same behavior boundary. Add a new permanent test only for a distinct uncovered contract/failure mode and document the gap.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/project-planning/project-planning-service.test.cjs test/characterization/desktop-project-repository-binding.test.cjs`

Do not run the full suite; WIR23 retains bundle-wide full regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR01_IMPLEMENTER_REPORT.md` with: starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact acceptance proof, command results, deviations/blockers, test reuse/change categories, and remaining human validation.

## Source-Control Checkpoint

After the repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR22-REPAIR01: Establish Routed Development Execution Binding`

Do not merge, tag, release, or publish.

## Manual Validation

None.

## Return to Workflow

After a verified passing checkpoint, read `WIR22-REPAIR02` only. Do not preload later repair cards.
