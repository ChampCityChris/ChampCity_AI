# WIR23-REPAIR03 — Complete Planning-Only Research Intakes Through Shared Integration

**Parent:** WIR13 / WIR20 / WIR21 / WIR23  
**Depends on:** WIR23-REPAIR02  
**Architect finding:** AR-WIR-03 in `ARCHITECT_CODE_REVIEW_2026-09-20.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03_IMPLEMENTER_REPORT.md`

## Confirmed Defect

Research correctly supports an approved `no-implementation-plan-required` outcome and correctly refuses to fabricate a production Plan.

That terminal state has no complete source-control lifecycle. No implementation Work Item exists to create a source checkpoint, and the current routed integration service requires Plan execution evidence.

The accepted Research Intake can therefore be “closed” in planning while its durable evidence remains stranded on the Work Intake branch.

## Root Cause

Integration completion is currently modeled only as completed `PlanExecutionInput`. The architecture also permits a legitimate planning-only terminal Work Intake, but there is no adapter from that terminal state into the shared integration candidate lifecycle.

## Objective

Make approved planning-only Research closure a first-class completed Work Intake that receives a durable terminal checkpoint and can use the existing isolated integration/Repair/target-advance mechanics without inventing a fake Plan, Phase, or Work Item.

## Required Changes

1. Define a provider-neutral internal completion-evidence contract that can represent:
   - existing completed Plan evidence; or
   - approved planning-only Research completion.
2. Preserve the existing Plan adapter and Plan integration behavior.
3. For Research `no-implementation-plan-required`, establish terminal completion only when:
   - the Work Intake is current;
   - the Operator route decision is current and selects Research/Prototype;
   - the Research assessment is current and Approved;
   - the structured Research outcome is `no-implementation-plan-required`;
   - required source lineage/digests are current.
4. Use the lifecycle checkpoint capability from WIR23-REPAIR02 to durably commit the planning-only terminal evidence on the Work Intake branch.
5. The terminal checkpoint must include only the exact Intake/routing/research canonical evidence attributable to that closure, including Project identity only when it is part of the Intake source graph.
6. Generalize the integration-candidate composition layer to consume either completion-evidence variant.
7. Planning-only Research integration must reuse:
   - isolated integration candidate construction;
   - mechanical merge;
   - bounded Integration Repair when necessary;
   - target advancement only from a valid candidate;
   - source-control receipts.
8. Do not fabricate `planId`, Work Items, Phases, or acceptance artifacts solely to satisfy the existing Plan-specific integration contract.
9. Expose the terminal Research completion/integration state through the Work Planning surface so “Research closed” does not imply the evidence is already integrated when it is not.
10. Preserve `productionFollowUp: new-work-intake-required`; Research completion never authorizes production implementation.

## Required Proof

From the production code path:

1. An approved Research outcome with `no-implementation-plan-required` creates no Plan.
2. It can create a durable planning-only terminal checkpoint.
3. The Work Intake branch is clean after that checkpoint.
4. Shared integration can construct an isolated candidate from that completion evidence.
5. Conflict/repair semantics remain machine-owned and bounded.
6. Successful integration advances the intended target with the accepted Research evidence.
7. A later production recommendation still requires a new Work Intake.
8. Existing Plan-backed integration remains unchanged.

## Preserve

- Research may legitimately end without implementation.
- Prototype output is not production approval.
- Operator owns the Research decision.
- Existing Plan execution/integration semantics.
- Integration Repair source-control ownership.
- No MVP or automatic Feature/Greenfield promotion.

## Forbidden Changes

- No fake Plan.
- No fake Work Item or Phase.
- No automatic production promotion.
- No Research-specific alternate Git implementation.
- No bypass of the shared isolated integration candidate.
- No broad redesign of route planning.

## Implementer Report

Record the completion-evidence contract, terminal Research checkpoint path, integration adapter changes, exact artifacts included, production files changed, proof exercised, deviations, and residual risk.

## Return Path

Return to the common Work Intake lifecycle after Research integration. Production follow-up, when selected by the Operator, begins as a separate Work Intake.
