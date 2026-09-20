# WIR22-REPAIR06 — Wire Routed Completion to Machine-Owned Git and Integration Services

**Repair order:** 6 of 7  
**Parent / failed workflow:** WIR19–WIR21 plus WIR22-REPAIR01–05  
**Failed/Operator evidence:** `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`  
**Repair Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06_IMPLEMENTER_REPORT.md`

## Verified Evidence

- Failed review evidence: `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22_IMPLEMENTER_REPORT.md`.
- Repair evidence summary: `docs/implementation-bundles/work-intake-routing/REPAIR_EVIDENCE_2026-09-20.md`.
- Governing architecture: `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`.
- Repair standard: `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`.
- Last passing implementation checkpoint before repairs is WIR21 at `45c04027705fb9beeffc8f78e5ce2887e63645c2`; WIR22 has no passing checkpoint.

At repair start, re-inspect the named production surfaces and the latest passing repair report. Stop on material mismatch rather than widening scope.

## Confirmed Defect

Machine-owned Work Item checkpoint and integration/Integration Repair services exist, but the routed non-Issue Development lifecycle has no complete production orchestration path that supplies routed context and invokes integration after true Plan completion.

## Root Cause

WIR19 partially wired source checkpointing into the existing Implementer execution service, while WIR20/WIR21 delivered service factories with no production caller. The missing routed Development lifecycle prevented safe orchestration from being added earlier.

## Repair Objective

Connect the repaired routed Development lifecycle to existing machine-owned source checkpoint, integration-candidate, and Integration Repair services without changing their established mechanics or transferring Git authority to the renderer/agent.

## Required Correction

1. Ensure routed Work Item implementation sessions carry the exact Intake/Plan/Work Item artifact scope and branch-binding context required by the existing WIR19 checkpoint capture; reuse `completePlanWorkItemSource` rather than creating another commit path.
2. Verify checkpoint receipts remain linked to the routed Work Item and current Plan revision while validation/Repair truth remains separate from source checkpoint truth.
3. Create the production application adapter/caller for `createIntegrationCandidateService` using current Work Intake target branch, work branch, approved Plan identity, and REPAIR05 complete/fresh Plan evidence.
4. Expose integration state through a service-owned projection: not-ready, ready, candidate-validating, repair-required, operator-decision-required, integration-complete, or bounded failure as supported by current contracts.
5. Route mechanical conflicts/post-merge validation failures into existing WIR21 Integration Repair; do not duplicate semantic repair logic.
6. Prevent target advancement when Plan is incomplete/stale, checkpoint evidence is inconsistent, integration candidate fails, or Integration Repair requires an Operator decision.
7. Keep all actual Git state transitions in existing source-control/integration services and disposable-fixture proof.

## Preserved Behavior

- WIR19 checkpoint semantics and existing Codex implementer behavior.
- WIR20 isolated integration candidate safety.
- WIR21 semantic repair/Git ownership boundary.
- Issue routed execution/integration behavior remains unchanged unless shared adapters require compatibility fixes.

## In-Scope Surface to Inspect

- `src/main/planExecution/workItemCheckpointService.ts`
- `src/main/planExecution/planExecutor.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/planExecution/integrationCandidateService.ts`
- `src/main/planExecution/integrationRepairService.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `routed Development execution service/projections`
- `test/agent-harness/git-mutation-boundary.test.cjs`
- `test/characterization/desktop-development-lifecycle.test.cjs`

Only modify files required for this repair.

## Negative Constraints

- No new Git shell path.
- No direct renderer source-control actions.
- No merge/tag/release of the implementation branch.
- No rewriting WIR19–WIR21 mechanics unless a proven compatibility defect requires a narrow change.

## Acceptance Criteria

1. Routed Work Item source completion produces the same bounded machine-owned checkpoint behavior as established WIR19.
2. Checkpoint result cannot falsely mark validation/close complete.
3. Only a current complete routed Plan can create/finalize an integration candidate.
4. Clean integration path and Integration Repair path are reachable through production application service calls, not test-only factories.
5. Failed/conflicted/requires-decision candidate never advances/pushes the target.
6. WIR22 can query integration readiness/state without renderer Git logic.

## Regression Proof

Inspect existing tests and `validation/capability-map.json` before adding proof. Prefer reuse/extension; every new permanent test needs a distinct uncovered contract/failure-mode justification.

Required commands:

- `npm run typecheck`
- `npm run build`
- `node --test --test-concurrency=1 test/agent-harness/git-mutation-boundary.test.cjs test/characterization/desktop-development-lifecycle.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs`

Do not run the full suite; WIR23 owns bundle-wide regression.

## Repair Implementer Report

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR06_IMPLEMENTER_REPORT.md` with starting checkpoint/dependency reports, confirmed defect/root cause, files changed, exact proof, commands/results, test categories, deviations/blockers, and remaining human validation.

## Source-Control Checkpoint

After this repair and required validation pass, create exactly one harness-managed checkpoint commit:

`WIR22-REPAIR06: Wire Routed Completion to Machine-Owned Git and Integration Services`

Do not merge, tag, release, or publish.

## Manual Validation

None; final integration presentation/Operator flow remains WIR23.

## Return to Workflow

After a verified passing checkpoint, read `WIR04-REPAIR01` only. Do not preload later repair cards.
