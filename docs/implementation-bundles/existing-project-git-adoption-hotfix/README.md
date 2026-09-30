# Existing Project Git Adoption Hotfix

**Forced-normalization checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Repair02 acceptance checkpoint:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Repair03 source-preservation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 / Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair04 / Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Repair04 / Repair03 checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Repair04 / Repair03 / Repair01 checkpoint:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Repair04 / Repair03 / Repair03 checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Current status:** **REPAIR04 / REPAIR03 / REPAIR03 / REPAIR04 ACTIVE**

## Controlling path

1. `Repair04/Repair03/Repair03/EPGA_R04_R03_R03_ARCHITECT_REVIEW_2026-09-30.md`
2. `Repair04/Repair03/Repair03/Repair04/EPGA-R04-R03-R04_reconcile_model_access_to_exact_source_topology.md`
3. `Repair04/Repair03/Repair03/README.md`

## Product boundary

ChampCity A/I Source Control owns Git and source-topology transitions deterministically.

Agent Harness/MCP/model access consumes application-owned source state and obeys the neutral source-operation fence. It never authorizes Source Control.

Generic workspace selection is not Project admission.

## Current blocker

Repair03 fixed the machine source fence and project-entry bypass.

One downstream projection defect remains: a conventional checkout registered before conversion can survive as stale model-access state after the Project becomes managed. Agent Harness checkout reconciliation also needs to obey the neutral shared source fence while inspecting topology.

## Next action

Implement Repair04 / Repair03 / Repair03 / Repair04, then stop for Architect review.

Do not run the real **Accept and Convert** qualification before acceptance.
