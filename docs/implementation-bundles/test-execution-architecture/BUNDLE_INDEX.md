# Test Execution Architecture — Bundle Index

## Governing Files

1. `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`
2. `docs/governance/TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`
3. `docs/implementation-bundles/test-execution-architecture/CODE_REVIEW_AND_RCA.md`
4. `docs/implementation-bundles/test-execution-architecture/ASTRA_EXECUTION_MANIFEST.md`
5. `docs/implementation-bundles/test-execution-architecture/WORK_CARD_PLAN.md`

## Execution Placement

This bundle is source-control-topology agnostic from the Implementer's perspective. Astra works in the repository context supplied for the run and does not manage or validate provider-specific repository placement. Concurrent integration into `dev` is handled outside the individual Work Cards.

## Execution Order

1. `TVA01` — `Work_Cards/TVA01_make_capability_map_executable_and_establish_validation_profiles.md`
2. `TVA02` — `Work_Cards/TVA02_split_mixed_lane_tests_and_isolate_performance_desktop_proof.md`
3. `TVA03` — `Work_Cards/TVA03_build_once_and_establish_built_output_freshness.md`
4. `TVA04` — `Work_Cards/TVA04_add_explicit_test_scheduling_safety_and_bounded_parallelism.md`
5. `TVA05` — `Work_Cards/TVA05_implement_deterministic_affected_capability_selection.md`
6. `TVA06` — `Work_Cards/TVA06_replace_integration_full_regression_with_candidate_aware_gate.md`
7. `TVA07` — `Work_Cards/TVA07_recompose_developer_work_item_phase_release_validation_commands.md`
8. `TVA08` — `Work_Cards/TVA08_audit_source_proxy_redundant_proof_and_quarantine_environment_sensitive_tests.md`
9. `TVA09` — `Work_Cards/TVA09_add_validation_telemetry_performance_budgets_and_end_to_end_acceptance.md`

Each card writes `Implementer_Reports/<CARD_ID>_IMPLEMENTER_REPORT.md`.

Do not preload every card into implementation context. Read the manifest, governing architecture/RCA, plan/index, current card, and only the dependency reports required for that card.
