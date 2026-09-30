# Existing Project Git Adoption — Repair04 / Repair03 / Repair03

**Status:** ACTIVE  
**Baseline:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Architect release baseline:** `1ac38a5dbb4341ba444b1e71ace84788b43a43f9`

Controlling card:

`EPGA-R04-R03-R03_replace_agent_harness_quiescence_with_machine_source_fence_and_close_project_entry_bypass.md`

This card supersedes Repair03 / Repair02.

Core corrections:

1. deterministic Git conversion is fenced by a neutral machine-owned cross-process source-operation coordinator, not Agent Harness quiescence;
2. Agent Harness/MCP tool calls obey that application fence as clients;
3. Clear/Open/Change Project can no longer bypass Existing Project admission and Git-migration messaging;
4. Project Intake repository selection cannot silently rebind the active Project through a raw workspace chooser.

Do not retry the real ChampCity_AI conversion until this card is implemented and Architect-reviewed.
