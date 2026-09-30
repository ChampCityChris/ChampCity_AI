# Existing Project Git Adoption — Repair04 / Repair03 / Repair03

**Repair03 checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Repair04 checkpoint:** `b8cc37753da54e0b5e79ce758442ab4389a55618`  
**Repair04 acceptance:** `ec0d21787d9adb8b9fdc90cf319a88570fed97ad`  
**Status:** **REPAIR05 ACTIVE — REAL QUALIFICATION BLOCKED**

## Accepted architecture

- Source Control owns Git and source-topology transitions.
- A neutral cross-process machine source-operation fence coordinates deterministic source transitions.
- Agent Harness/MCP/model-access operations consume that fence as clients.
- Existing Project admission is canonical.
- model-access topology reconciliation is downstream and exact.

## New real qualification failure

The accepted architecture reached the actual Windows root Git cutover.

The real migration attempt `a880d2a5-4efb-4c0d-807e-2535334e7ac2` failed because Windows rejected:

```text
rename <Project>/.git
-> <migration>/legacy-git-entry
EPERM
```

Root conventional Git was restored/remained authoritative and rollback completed without cleanup warnings.

## Active repair

`Repair05/EPGA-R04-R03-R05_force_windows_root_git_retirement_from_verified_recovery_copy.md`

Repair05 replaces live root `.git` rename with:

1. verified recovery copy;
2. temporary suspension of ChampCity-owned workspace watchers;
3. direct forced PowerShell removal;
4. exact restore from recovery if forced removal partially fails.

## Stop rule

Do not retry the real ChampCity_AI Existing Project conversion until Repair05 is implemented and Architect-reviewed.
