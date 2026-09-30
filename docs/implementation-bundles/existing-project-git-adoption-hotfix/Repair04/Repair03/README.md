# Existing Project Git Adoption — Repair04 / Repair03

**Repair03 implementation:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Repair01 implementation:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Architect release baseline:** `1ac38a5dbb4341ba444b1e71ace84788b43a43f9`  
**Status:** **REPAIR03 ACTIVE — QUALIFICATION BLOCKED**

## Accepted direction

Repair03/Repair01 established the correct broad boundary:

- Source Control is application-owned and deterministic;
- Git/error/repository infrastructure is neutral, not Agent Harness-owned;
- model-access projection is downstream of source state;
- projection failure does not roll back valid Git;
- Workflow source materialization remains valid before model projection.

## Superseded Repair02

`Repair02/EPGA-R04-R03-R02_distinguish_model_access_absence_from_live_quiescence_failure.md`

is superseded and must not be implemented.

The Operator/Architect correction removes Agent Harness quiescence from Git authority entirely.

## Controlling repair

`Repair03/EPGA-R04-R03-R03_replace_agent_harness_quiescence_with_machine_source_fence_and_close_project_entry_bypass.md`

This repair:

1. introduces a neutral machine-owned cross-process source-transition fence;
2. makes Agent Harness/MCP tool execution obey that fence as a client;
3. removes Agent Harness availability/quiescence from deterministic Git conversion authority;
4. closes the confirmed Clear Project -> sidebar Open/Change Project migration bypass;
5. prevents Project Intake repository selection from silently rebinding the active Project.

## Stop rule

Do not retry the real ChampCity_AI conversion until Repair03 is implemented and Architect-reviewed.
