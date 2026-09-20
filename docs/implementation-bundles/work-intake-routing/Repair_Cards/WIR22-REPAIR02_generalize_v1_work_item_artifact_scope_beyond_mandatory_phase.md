# WIR22-REPAIR02 — Generalize V1 Work Item Artifact Scope Beyond Mandatory Phase

**Repair order:** 2 of 7  
**Parent / failed workflow:** WIR17 / blocked WIR22 dependency verification  
**Failed review evidence:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR02_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. If current code materially differs from this evidence, stop rather than broadening the repair.

## Confirmed Defect

The established Work Card lifecycle encodes `phaseId` as mandatory identity and path ownership even though direct routed Plans intentionally have no Phase layer.

## Root Cause

V1 Work Card intake, Formal Work Card metadata, report/validation/Repair paths, and loop target helpers were designed before direct Plan topology existed and use `planning/phases/<phaseId>/...` as both storage and identity.

## Repair Objective

Introduce one V1 compatibility artifact-scope abstraction that can address legacy Phase work, routed direct-Plan work, and routed genuine-Phase work without changing the target domain model or fabricating a Phase.

## Required Correction

1. Define a bounded Work Item artifact-scope reference with three supported forms: legacy Phase scope, routed direct-Plan scope, and routed Phase scope.
2. Centralize deterministic artifact-root/path resolution for Work Card handoffs, Formal Work Cards, Implementer Reports, Validation Records, and Repair artifacts.
3. Preserve existing legacy `planning/phases/<phaseId>/...` paths byte-for-byte for legacy calls.
4. Define routed artifact roots under the current Work Intake execution lineage; direct scope carries Plan identity and no `phaseId`, routed Phase scope carries the declared Plan Phase identity.
5. Extend shared projections/metadata helpers so phaseId is no longer semantically mandatory for routed direct work, while compatibility consumers can still project legacy phase identity.
6. Do not yet change lifecycle eligibility/action behavior; this card establishes safe addressing/identity only.

## Preserved Behavior

- All existing phase-scoped path contracts for legacy Development/Issue remain valid.
- Existing canonical Markdown semantics and repository binding inheritance.
- No new canonical product entity is introduced; this is V1 persistence compatibility.

## In-Scope Surface to Inspect

- `src/shared/workspaceContracts.ts`
- `src/main/workCardLoop/workCardLoopStateService.ts path helpers`
- `src/main/workCardIntake/workCardIntakeService.ts contracts/helpers`
- `src/main/workCardPlanning/workCardPlanningService.ts metadata/path context`
- `src/main/workCardBuilding/workCardBuildingReviewService.ts path helper boundaries`
- `src/main/workCardValidation/workCardValidationService.ts path helper boundaries`
- `src/main/workCardRepair/workCardRepairService.ts path helper boundaries`

Only modify files required for this repair. Do not absorb later repair scope.

## Negative Constraints

- No routed Work Item selection or action wiring yet.
- No duplicate lifecycle implementation.
- No migration/rewrite of historical artifacts.
- No renderer/UI changes.

## Acceptance Criteria

1. Legacy phase path resolution is unchanged.
2. Routed direct Work Item paths can be resolved without any Phase ID.
3. Routed phased Work Item paths include only the genuine declared Phase.
4. Metadata/identity can distinguish legacy phase, routed direct, and routed phase without ambiguity.
5. No caller can pass an arbitrary fake Phase merely to satisfy the compatibility API.

## Regression Proof

Before adding permanent tests, inspect existing proof and `validation/capability-map.json`. Prefer reuse/extension at the same behavior boundary. Add a new permanent test only for a distinct uncovered contract/failure mode and document the gap.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/work-card-intake/work-card-intake-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-building/work-card-building-review-service.test.cjs test/work-card-validation/work-card-validation-service.test.cjs test/work-card-repair/work-card-repair-service.test.cjs`

Do not run the full suite; WIR23 retains bundle-wide full regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR02_IMPLEMENTER_REPORT.md` with: starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact acceptance proof, command results, deviations/blockers, test reuse/change categories, and remaining human validation.

## Source-Control Checkpoint

After the repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR22-REPAIR02: Generalize V1 Work Item Artifact Scope Beyond Mandatory Phase`

Do not merge, tag, release, or publish.

## Manual Validation

None.

## Return to Workflow

After a verified passing checkpoint, read `WIR22-REPAIR03` only. Do not preload later repair cards.
