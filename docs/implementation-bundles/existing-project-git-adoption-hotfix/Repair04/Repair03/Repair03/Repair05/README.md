# Existing Project Git Adoption — Repair05

**Baseline:** `ec0d21787d9adb8b9fdc90cf319a88570fed97ad`  
**Status:** **ACTIVE — REAL QUALIFICATION BLOCKED**

Controlling card:

`EPGA-R04-R03-R05_force_windows_root_git_retirement_from_verified_recovery_copy.md`

The real ChampCity_AI qualification reached deterministic root Git cutover and failed because Windows rejected renaming the live root `.git` directory with `EPERM`.

Repair05 removes that rename dependency.

The corrected Windows transaction is:

```text
verified recovery copy of root .git
-> pause ChampCity-owned workspace watchers
-> forced PowerShell removal of root .git
-> verify removal
-> complete Main/Dev managed topology
-> resume watchers
```

Partial forced-removal failure restores conventional Git from the verified recovery copy.

No Agent Harness, MCP, or model decision is part of this cutover.

Do not retry the real ChampCity_AI conversion until Repair05 is implemented and Architect-reviewed.
