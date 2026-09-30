# Existing Project Git Adoption Hotfix

**Forced-normalization checkpoint:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Repair02 acceptance checkpoint:** `2a897f96f60ef8d16606ade4c2b1dfb45fddde5a`  
**Repair03 source-preservation checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Repair04 / Repair01 checkpoint:** `f59d5d779f8192d14f47c1175d3a33b871b0c2e4`  
**Repair04 / Repair02 checkpoint:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Repair04 / Repair03 checkpoint:** `2a83d482fbbf2924cd1562aa17106b77d437a529`  
**Repair04 / Repair03 / Repair01 checkpoint:** `aee844a82ad977243570ed63e70f3fbb8a9f4376`  
**Repair04 / Repair03 / Repair03 checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Repair04 / Repair03 / Repair03 / Repair04 checkpoint:** `b8cc37753da54e0b5e79ce758442ab4389a55618`  
**Repair04 acceptance checkpoint:** `ec0d21787d9adb8b9fdc90cf319a88570fed97ad`  
**Current status:** **REPAIR05 ACTIVE — REAL CHAMPCITY_AI QUALIFICATION BLOCKED**

## Current controlling path

1. `Repair04/Repair03/Repair03/Repair05/EPGA-R04-R03-R05_force_windows_root_git_retirement_from_verified_recovery_copy.md`
2. `Repair04/Repair03/Repair03/Repair05/README.md`
3. `Repair04/Repair03/Repair03/README.md`

## Authority model remains accepted

ChampCity A/I Source Control owns Git deterministically.

The application-owned machine source-operation fence coordinates source-topology transitions.

Agent Harness/MCP/model access is downstream and does not authorize Git conversion.

## Current blocker

The real qualification reached physical Windows root Git cutover and failed on the old `fs.renameSync(<Project>/.git, <migration>/legacy-git-entry)` strategy with `EPERM`.

The journal confirms source preservation, ref import, baseline creation, managed metadata preparation, and rollback all worked.

Repair05 replaces the root `.git` rename with a verified recovery copy plus forced PowerShell removal and exact restore-on-failure.

## Next action

Implement Repair05 and stop for Architect review.

Do not manually clean the current failed migration evidence and do not retry **Accept and Convert** before Repair05 acceptance.
