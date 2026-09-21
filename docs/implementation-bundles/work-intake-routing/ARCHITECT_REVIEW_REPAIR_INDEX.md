# Work Intake Routing — Architect Review Repair Index

**Source review:** `ARCHITECT_CODE_REVIEW_2026-09-20.md`

## Repair Packet

1. `Repair_Cards/WIR23-REPAIR01_enforce_route_decision_state_and_non_destructive_reroute.md`
   - Enforce route-decision state legality.
   - Prevent same-route or duplicate decisions from superseding valid downstream artifacts.

2. `Repair_Cards/WIR23-REPAIR02_checkpoint_post_implementation_workflow_evidence.md`
   - Add application-owned lifecycle-evidence checkpoints after source checkpointing.
   - Keep Work Intake source clean across Work Items, Phase acceptance, Plan acceptance, and integration.

3. `Repair_Cards/WIR23-REPAIR03_complete_planning_only_research_intakes_through_shared_integration.md`
   - Depends on REPAIR02.
   - Give planning-only Research closure a durable terminal checkpoint and shared integration path without fabricating a Plan.

4. `Repair_Cards/WIR23-REPAIR04_preserve_sequential_intake_target_baseline.md`
   - Resolve the suggested next-Intake base from service-owned target semantics rather than the currently checked-out Work Intake branch.

## Execution Dependencies

`WIR23-REPAIR01` and `WIR23-REPAIR04` are independent.

`WIR23-REPAIR02 → WIR23-REPAIR03` is the required lifecycle dependency.

Do not combine these cards. Each corrects a distinct state/ownership seam and should return to Architect code review before the package is declared complete.
