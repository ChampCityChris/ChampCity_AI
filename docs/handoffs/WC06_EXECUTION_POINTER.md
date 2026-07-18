# WC06 Execution Pointer

This pointer controls repository-start verification for the WC06 Implementer handoff.

The line `Required baseline HEAD: 8801ac0b60a5ad227bc68ba9397f10be461a6e85` in the main WC06 handoff must be interpreted as a required **ancestor checkpoint**, not the current exact HEAD.

Before editing, verify:

1. Repository is `<PROJECT_REPO>`.
2. Remote is `ChampCityChris/ChampCity_AI`.
3. Branch is `feature/phase-04-wc01-repair01-evidence-derived-workflow`.
4. Recovery checkpoint `8801ac0b60a5ad227bc68ba9397f10be461a6e85` is an ancestor of HEAD.
5. WC06 authority-handoff checkpoint `0a70e02675111ba9046f1148404f170c4cb8fa80` is an ancestor of HEAD.
6. The worktree is clean before the WC06 authority-bootstrap action.

Read in this order:

1. `docs/handoffs/WC06_EXECUTION_POINTER.md`
2. `docs/handoffs/WC06_APPROVED_AUTHORITY_BOOTSTRAP.md`
3. `docs/handoffs/IMPLEMENTER_HANDOFF_PHASE06_WC06_trusted_execution_run_activation_workspace_test_fixture_isolation.md`

This pointer supersedes only the exact-HEAD wording. It does not change WC06 scope, approval, prohibitions, pass definitions, validation, or reporting requirements.