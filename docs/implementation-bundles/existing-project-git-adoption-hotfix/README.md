# Existing Project Git Adoption Hotfix

**Forced-normalization checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Repair02 acceptance checkpoint:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Repair03 source-preservation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 / Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair04 / Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Repair04 / Repair03 checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Current status:** **REPAIR04 / REPAIR03 / REPAIR01 ACTIVE**

## Controlling path

1. `Repair04/Repair03/EPGA_R04_R03_ARCHITECT_REVIEW_2026-09-29.md`
2. `Repair04/Repair03/Repair01/EPGA-R04-R03-R01_make_model_access_projection_non_authoritative_in_product_git_paths.md`
3. `Repair04/Repair03/README.md`

## Product boundary

ChampCity A/I is the harness.

Source Control owns Git deterministically and must remain executable without Agent Harness/MCP/model availability.

Agent Harness/MCP exposes selected application capabilities to models. RepositoryCheckout projection is downstream access state, not Git authority.

## Current blocker

Repair03 fixed the Source Control service layer but the actual desktop composition still:

- requires Agent Harness registration/revocation before Existing Project conversion;
- requires Agent Harness registration before Greenfield bootstrap;
- rejects the conversion IPC after successful Git conversion if Main/Dev projection fails.

Repair01 completes the product-level boundary so model-access outage cannot masquerade as source-control failure.

## Next action

Implement Repair04 / Repair03 / Repair01, then stop for Architect review.

Do not run the real **Accept and Convert** qualification before acceptance.
