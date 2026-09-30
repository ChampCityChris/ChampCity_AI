# Existing Project Git Adoption — Repair04

**Repair04 implementation:** `643ea5ed24552b34b9cafa3592b4965703fdb28c`  
**Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Repair03 checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Status:** **REPAIR03 / REPAIR01 ACTIVE — QUALIFICATION BLOCKED**

## Current authority model

- Workspace is a Git-neutral model-access directory.
- Source Control owns repository topology and deterministic Git mechanics.
- RepositoryCheckout is an application-owned semantic descriptor.
- Agent Harness/MCP model access is a downstream projection of application source state.
- Public MCP Git tools are for external models and are not ChampCity's internal Git execution mechanism.

## Repair03 review

Repair03 correctly removed Agent Harness registration/listing from Source Control services and removed the private checkout-list transport.

Architect review found one remaining composition defect: the actual desktop handlers still require Agent Harness registration/revocation before Existing Project conversion and Greenfield bootstrap, and projection failure after a successful conversion is surfaced as a rejected conversion call.

## Active repair

`Repair03/Repair01/EPGA-R04-R03-R01_make_model_access_projection_non_authoritative_in_product_git_paths.md`

## Qualification state

Do not retry the real ChampCity_AI conversion yet.

Preserve the existing schema-3 failed migration evidence until Repair03 / Repair01 is accepted.
