# Existing Project Git Adoption — Repair04 / Repair03

**Implementation checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Status:** **BLOCKED — REPAIR01 ACTIVE**

## Architect review

`EPGA_R04_R03_ARCHITECT_REVIEW_2026-09-29.md`

Repair03 corrected the Source Control service boundary:

- Source Control no longer lists/registers/revokes Agent Harness checkout projections;
- deterministic conventional/Main/Dev/Workflow descriptors are application-owned;
- the private checkout-list Service Host/worker control was removed;
- public MCP checkout discovery remains external-model tooling;
- Workflow Git materialization completes before model-access projection.

## Remaining blocker

The actual desktop product path still hard-requires Agent Harness success before Existing Project conversion and Greenfield bootstrap.

Post-conversion model-access projection failure is also surfaced as a rejected conversion call even after Git conversion has completed.

The user-facing harness therefore still treats model-access availability as authoritative over application-owned Git operations.

## Active repair

`Repair01/EPGA-R04-R03-R01_make_model_access_projection_non_authoritative_in_product_git_paths.md`

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair03 / Repair01 is implemented and Architect-reviewed.
