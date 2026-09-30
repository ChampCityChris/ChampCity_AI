# Existing Project Git Adoption — Repair04 / Repair03 / Repair03

**Repair03 checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Repair04 checkpoint:** `b8cc37753da54e0b5e79ce758442ab4389a55618`  
**Repair04 acceptance:** `ec0d21787d9adb8b9fdc90cf319a88570fed97ad`  
**Repair05 checkpoint:** `831d0a116d97d402433964c8128105571e002947`  
**Status:** **REPAIR05 ACCEPTED — REAL RETRY PENDING WORKTREE HYGIENE**

## Accepted architecture

- Source Control owns Git and source-topology transitions.
- A neutral cross-process machine source-operation fence coordinates deterministic source transitions.
- Agent Harness/MCP/model-access operations consume that fence as clients.
- Existing Project admission is canonical.
- Model-access topology reconciliation is downstream and exact.
- Windows root `.git` retirement no longer depends on renaming the live metadata directory.

## Repair05 acceptance

`Repair05/EPGA_R04_R03_R05_ARCHITECT_REVIEW_2026-09-30.md`

Repair05 uses a verified legacy Git recovery copy followed by direct forced PowerShell retirement and exact restore on failure.

## Qualification-state note

The current live ChampCity_AI working tree contains untracked nested managed Project content under:

```text
Signal_Forge/Main/
Signal_Forge/Dev/
```

This is not part of Repair05. Existing Project conversion will preserve current ordinary/untracked source, so Operator disposition is required before the real retry.

## Next action

Determine whether `Signal_Forge` is intentional. Once it is intentionally retained, moved, or removed, retry the real ChampCity_AI Existing Project conversion through the normal application UI.
