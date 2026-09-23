# Astra Execution Manifest — Source-Control Lifecycle

Execute `SCL01` through `SCL10` sequentially from the package branch/checkpoint chain.

For every card:

1. read the governing architecture and current card from the repository;
2. inspect the exact dependency reports and current source before implementation;
3. keep changes bounded to the card;
4. use the validation planner/work-item profile with the exact changed-path set and card-owned focused tests;
5. write the required Implementer Report;
6. create one attributable checkpoint commit for the card using the available deterministic source-control capability;
7. verify the checkpoint and only then continue.

Do not switch to or modify the primary `dev` checkout used by the separate WIR UI repair.

Do not replace application-owned Git mechanics with shell instructions or agent-operated Git.

Do not expand this package into multi-agent worktree orchestration.
