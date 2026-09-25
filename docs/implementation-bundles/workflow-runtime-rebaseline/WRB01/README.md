# WRB01 — Current Project Runtime Foundation

**Baseline:** post-WTR02H `f72bc436cd55de39671977de790b139a611e096c`  
**Implementer:** GPT 6.0 Luna Medium  
**Final disposition:** CLOSED after Repair03 at implementation checkpoint `4c1f13e4d4550ac958f85c0f715d1a0f4a4f46f0`.

See `FINAL_ARCHITECT_DISPOSITION_2026-09-25.md`.

## Bundle outcome

A selected Project is a non-Git Project container with one current Structured Project State runtime. Existing Project and New Project entry are explicit and do not invoke WIR or legacy Workflow migration. Source-backed Projects use durable Main/Dev checkouts while Project identity remains independent from Repository identity. WIR is source-neutral and source availability is not an intake authority gate.

## Implemented sequence

1. WRB01-01 — Establish Current Project Registration and Fresh SPS Runtime
2. WRB01-02 — Materialize Managed Project/Main/Dev Source Topology
3. WRB01-03 — Establish Greenfield Source Bootstrap and Gitignore Baseline
4. WRB01-04 — Converge Landing Project Entry onto Current Project Runtime
5. WRB01-05 — Qualify Bundle and Fence Legacy Current-State Reconstruction
6. Repair01 — close Project/Git-root and adoption integration findings
7. Repair02 — separate Current Project identity from optional Repository identity
8. Repair03 — close source-proof ordering and source-neutral WIR projection

WRB02 is released under `../WRB02/`.
