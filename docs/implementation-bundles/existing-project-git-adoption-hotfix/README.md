# Existing Project Git Adoption Hotfix

**Original implementation checkpoint:** `07ad7ccb88a0ea7878529235151870dbb0aeec74`  
**Forced-normalization checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Repair02 acceptance checkpoint:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Repair03 source-preservation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 / Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair04 / Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Current status:** **REPAIR04 / REPAIR03 ACTIVE — REAL CONVERSION BLOCKED**

## Controlling path

Read:

1. `Repair04/Repair03/EPGA_R04_R03_ARCHITECT_CORRECTION_2026-09-29.md`
2. `Repair04/Repair03/EPGA-R04-R03_decouple_source_control_from_agent_harness_model_access.md`
3. `Repair04/Repair03/README.md`

## Product boundary

ChampCity A/I is the harness.

Source Control is one deterministic subsystem. MCP/Agent Harness is another capability used to expose selected application functionality to models.

Source Control owns:

- Git discovery;
- repository/bootstrap mechanics;
- repository normalization;
- Main/Dev/Workflow checkout topology;
- Git CLI execution;
- commits, merges, checkpoints, and integration.

Source Control must function without Agent Harness, MCP, or an LLM.

Agent Harness may publish application-owned RepositoryCheckout descriptors to models after Source Control establishes them.

Public MCP Git tools remain external-model tooling and are not part of ChampCity's internal Git execution path.

## Accepted safety work retained

Repair02/03/04 safety work remains unless Repair03 explicitly removes coupling-specific code:

- managed integration-policy generation;
- bounded source staging;
- ignored/local-state preservation;
- non-following link handling;
- Git-neutral generic workspaces;
- schema-3 migration journals;
- staged candidate managed repository;
- bounded Windows filesystem mutation;
- primary-failure-preserving rollback;
- Agent Harness build-generation fencing where independently useful.

## Current real Project state

The latest real qualification attempt remains preserved as a schema-3 failed conversion with root conventional Git authoritative.

No manual migration cleanup is required.

## Next action

Implement Repair04 / Repair03 and stop for Architect review.

Do not run **Accept and Convert** until Repair03 is accepted.
