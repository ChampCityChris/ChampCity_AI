# WRB01 — Current Project Runtime Foundation

**Baseline:** post-WTR02H f72bc436cd55de39671977de790b139a611e096c  
**Implementer:** GPT 6.0 Luna Medium  
**Review cadence:** sequential checkpoints; Architect review after WRB01-05.

**Bundle review:** WRB01 implementation reached `287176637cc8784c4a9552e9305c5795884fbe97`. Repair01 reached `50606b2867c041ad461a3634faf7430699af014a`. Repair02 reached `afc56ee455413dd74f76377da3d40cff04be7652` and corrected Current Project/Repository identity, optional source capability, WIR source ownership, and local-only Git adoption. Architect review found two final integration misses: source capability is attached before Existing Project source topology is proven, and WIR projection still treats managed Dev availability as a prerequisite. WRB01 remains open under one released `Repair03/` card. WRB02 is not authorized until Repair03 closes.

## Bundle outcome

A selected Project is a non-Git Project container with one current Structured Project State runtime. Existing Project and New Project entry are explicit and do not invoke WIR or legacy Workflow migration. Managed source topology provides durable Main/Dev checkouts for later Workflow source materialization.

## Released sequence

1. WRB01-01 — Establish Current Project Registration and Fresh SPS Runtime
2. WRB01-02 — Materialize Managed Project/Main/Dev Source Topology
3. WRB01-03 — Establish Greenfield Source Bootstrap and Gitignore Baseline
4. WRB01-04 — Converge Landing Project Entry onto Current Project Runtime
5. WRB01-05 — Qualify Bundle and Fence Legacy Current-State Reconstruction

All five cards are released for sequential implementation.

After each card: focused validation, Implementer Report, exact attributable checkpoint, then proceed. Stop before the next card only for a bundle-level blocker defined by the re-baseline. After WRB01-05: STOP for Architect bundle review.