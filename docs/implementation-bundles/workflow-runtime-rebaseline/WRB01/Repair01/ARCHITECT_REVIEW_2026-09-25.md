# WRB01 Repair01 Architect Review

**Date:** 2026-09-25
**Reviewed range:** f6038d0838dde7a1bed0449135155115b4c0fbf7..50606b2867c041ad461a3634faf7430699af014a
**Disposition:** Repair01 fixes its six intended defects. WRB01 remains open for one final two-card Repair02 correcting Current Project/source identity separation and one local-Git adoption defect.

## Repair01 findings closed

- Source Graph now uses managed Dev for Git while SPS metadata remains rooted at the non-Git Project container.
- Current Work Intake branch projection uses managed Dev on source-backed Current Projects.
- conventional adoption preserves dirty/untracked state on the original main/dev branch.
- main-only repositories can establish dev deterministically at the exact main revision.
- abandoned old SPS Projects no longer block creation of a fresh current Project identity.
- Start New Project rejects an already-current managed Project.
- Current Hub no longer exposes legacy Development/Issue recovery.
- focused Repair01 qualification passed 39/39; dev is clean at 50606b2867c041ad461a3634faf7430699af014a.

## Finding 1 — Architect miss: Current Project identity is still incorrectly defined as a source repository

R01-01 followed the released card literally: the selected-project marker is a ProjectResource with resourceType source-repository. That was an Architect specification error.

The approved architecture separates Project identity from Repository identity. A Project container can be non-Git-backed, and Workflow source semantics are conditional when source-backed. Current Project selection therefore cannot itself assert that a Git Repository exists.

Required correction:
- use an application-owned Current Project registration marker that is not a source-repository resource;
- represent a Git Repository as a separate optional source-repository ProjectResource only when source infrastructure actually exists;
- Current Project discovery keys only from the active registration marker;
- source consumers resolve the optional source-repository resource separately;
- old R01 selected-project/source-repository markers are abandoned as obsolete state, not migrated into the corrected current identity.

Also, selectedCurrentProjectId currently does not filter state_entities.lifecycle_state or Project lifecycle. The R01-01 report claims an active registration, but archived/voided/superseded resources can currently select a Project. Corrected selection must require active registration and active Project.

## Finding 2 — Implementer defect: local Git with no remote is rejected during adoption

managedProjectSourceService treats an empty `git remote -v` result as inspection failure (`if (!refs || !remotes)`). An empty remote list is valid. ChampCity explicitly supports local-only Git with no remote provider.

Adoption must distinguish command failure/null from valid empty stdout. A repository with main (and optional dev), normal local history, and zero remotes must adopt successfully while preserving the empty remote set.

## Finding 3 — product capability exposure must follow optional source backing

CurrentProjectRuntimeContext and the Hub currently assume Source Control exists. After identity separation, the runtime context must expose whether a source Repository is attached. The Source Control entry must only be offered when source-control infrastructure exists.

This repair does not redesign Work Intake/WIR. WIR source-neutral/not-applicable behavior is owned by WRB02, which immediately follows WRB01. Repair02 must not reintroduce WIR-owned source.

## Disposition

Release WRB01-R02 as two sequential cards. Luna may execute both with checkpoint commits and stop after R02-02 for final WRB01 Architect review. WRB02 remains unauthorized until WRB01 closes.