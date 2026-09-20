# Work Intake Routing — Bundle Index

## Governing Files

1. `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`
2. `docs/implementation-bundles/work-intake-routing/ASTRA_EXECUTION_MANIFEST.md`
3. `docs/implementation-bundles/work-intake-routing/WORK_CARD_PLAN.md`

## Repository Execution Order

1. `WIR01` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR01_establish_work_route_contracts_and_registry.md`
2. `WIR02` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR02_promote_deterministic_git_mechanics_into_application_source_control_service.md`
3. `WIR03` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR03_bind_every_work_intake_to_a_dedicated_git_branch.md`
4. `WIR04` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR04_implement_universal_work_intake_capture_and_canonical_persistence.md`
5. `WIR05` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR05_implement_architect_advisory_routing_assessment.md`
6. `WIR06` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR06_implement_operator_route_decision_and_general_reroute_semantics.md`
7. `WIR07` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR07_build_shared_planned_work_planning_kernel_and_plantopology_contract.md`
8. `WIR08` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR08_implement_greenfield_new_product_planning_profile.md`
9. `WIR09` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR09_implement_feature_capability_change_planning_profile.md`
10. `WIR10` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR10_implement_refactor_migration_platform_transition_planning_profile.md`
11. `WIR11` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR11_implement_integration_composition_planning_profile.md`
12. `WIR12` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR12_implement_infrastructure_platform_change_planning_profile.md`
13. `WIR13` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR13_implement_research_prototype_planning_profile.md`
14. `WIR14` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR14_integrate_issue_resolution_with_universal_work_intake_routing.md`
15. `WIR15` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR15_add_formal_work_card_decomposition_and_topology_correction_safety_valve.md`
16. `WIR16` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR16_establish_generic_direct_phased_plan_execution.md`
17. `WIR17` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR17_adapt_current_development_execution_to_generic_plan_topology.md`
18. `WIR18` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR18_adapt_issue_correction_execution_to_generic_plan_topology.md`
19. `WIR19` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR19_add_machine_owned_work_item_git_checkpoints.md`
20. `WIR20` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR20_implement_machine_owned_integration_candidate_lifecycle.md`
21. `WIR21` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR21_implement_agent_assisted_integration_repair_with_machine_owned_git.md`
22. `WIR22` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR22_make_start_work_the_canonical_workflow_hub_entry.md`
23. `WIR23` — `docs/implementation-bundles/work-intake-routing/Work_Cards/WIR23_end_to_end_routing_execution_git_and_integration_acceptance.md`

## Context Rule

At initialization, read the manifest, architecture, plan, index, and WIR01 only.

After a card passes and receives its checkpoint commit, read the next card from the repository plus only the dependency Implementer Reports needed for that card. Do not preload the rest of the bundle.

## Expected Reports

Each card writes:

`docs/implementation-bundles/work-intake-routing/Implementer_Reports/<CARD_ID>_IMPLEMENTER_REPORT.md`

## Checkpoint Rule

Each passing card creates exactly one checkpoint commit using the source-control capability supplied by the execution harness.

Commit message:

`<CARD_ID>: <exact card title>`

Do not merge, tag, release, or publish during WIR01–WIR23.
