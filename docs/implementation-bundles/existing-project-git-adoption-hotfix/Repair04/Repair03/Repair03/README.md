# Existing Project Git Adoption — Repair04 / Repair03 / Repair03

**Repair03 checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Repair04 checkpoint:** `b8cc37753da54e0b5e79ce758442ab4389a55618`  
**Repair05 checkpoint:** `831d0a116d97d402433964c8128105571e002947`  
**Repair05 acceptance:** `e345019bb6d1b4cdfdd30c06006a2a4ac8e958dd`  
**Status:** **REPAIR06 ACTIVE — REAL QUALIFICATION BLOCKED**

## Accepted architecture

- Source Control owns Git and source-topology transitions.
- A neutral cross-process machine source-operation fence coordinates deterministic source transitions.
- Agent Harness/MCP/model-access operations consume that fence as clients.
- Existing Project admission is canonical.
- Model-access topology reconciliation is downstream and exact.
- Windows root `.git` retirement uses verified recovery plus forced PowerShell removal.

## Latest real qualification result

Repair05 succeeded in moving the real conversion past root Git cutover.

The latest attempt then failed during local-state handling because Git-ignored `node_modules` was treated as durable local state and relocated into Dev.

That policy is now rejected.

## Active repair

`Repair06/EPGA-R04-R03-R06_classify_local_state_and_remove_regenerable_conversion_gates.md`

Repair06 introduces source / durable-local / regenerable classification and makes known reproducible filesystem state non-authoritative to conversion.

## Stop rule

Do not retry the real ChampCity_AI Existing Project conversion until Repair06 is implemented and Architect-reviewed.
