# Existing Project Git Adoption Hotfix

**Forced-normalization checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Repair02 acceptance checkpoint:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Repair03 source-preservation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 / Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair04 / Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Repair04 / Repair03 checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Repair04 / Repair03 / Repair01 checkpoint:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Current status:** **REPAIR04 / REPAIR03 / REPAIR03 ACTIVE**

## Controlling path

1. `Repair04/Repair03/Repair03/README.md`
2. `Repair04/Repair03/Repair03/EPGA-R04-R03-R03_replace_agent_harness_quiescence_with_machine_source_fence_and_close_project_entry_bypass.md`
3. `Repair04/Repair03/README.md`

## Product boundary

ChampCity A/I is the harness.

Source Control owns Git and source-topology transitions deterministically.

Agent Harness/MCP/model access is a consumer of application-owned source state and must obey a neutral machine-level source-operation fence. Source Control does not consult Agent Harness to authorize Git.

Generic workspace selection is not Project admission. Existing Projects must enter through the canonical inspect/consent/register path.

## Current repair

Repair03 replaces the previously proposed Agent Harness error-classification repair.

It also closes the confirmed project-entry bypass:

```text
Clear Project
-> sidebar Open Project
-> raw workspace activation
-> migration inspection bypassed
```

## Next action

Implement Repair04 / Repair03 / Repair03, then stop for Architect review.

Do not run the real **Accept and Convert** qualification before acceptance.
