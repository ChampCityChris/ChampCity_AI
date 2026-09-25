# WRB01 Repair02 Architect Review

**Date:** 2026-09-25
**Reviewed range:** 1e6c205cfc99891b9374d4d977dc9127420d23e8..afc56ee455413dd74f76377da3d40cff04be7652
**Disposition:** Repair02 correctly fixes Current Project/Repository identity separation, inactive registration selection, optional source capability, WIR source ownership semantics, and remote-less Git adoption. WRB01 remains open for one final bounded Repair03 card covering two implementation misses at the Project-entry/Work-Intake integration boundary.

## Repair02 findings closed

- Current Project selection now uses a dedicated active current-project-registration resource on an active Project.
- Git Repository identity is a separate optional source-repository resource.
- non-Git Current Projects are valid and carry no fabricated Repository ID.
- obsolete R01 selected-project source markers are abandoned rather than migrated.
- Source Control Hub entry is capability-gated by optional Repository identity.
- Source Graph fails closed for a Current Project without a Repository.
- WIR capture/retry reports source not-applicable; substantive target Workflows own source records.
- local conventional Git repositories with zero remotes are accepted.
- focused final qualification passed 48/48; dev is clean at afc56ee455413dd74f76377da3d40cff04be7652.

## Finding 1 — Existing Project can persist source capability before source topology is proven

R02-01 required Existing Project entry to determine source backing mechanically before registration. Current main.ts still treats mere existence of `.git` or the three managed path names as sufficient to call registerCurrentProject(... sourceRepositoryId ...) before establishManagedProjectSource validates the Repository.

Consequences:
- a malformed/redirected/non-exact conventional Git candidate can leave a fresh Current Project permanently marked source-backed even though adoption failed;
- a superficially complete but invalid managed topology can do the same;
- the Hub can then expose Source Control from semantic state that was never backed by validated managed source.

Required correction: for source candidates, register the MCP Project workspace, establish/verify managed source first, and only then create/open/attach the Current Project source-repository resource. A successful physical establishment followed by SPS failure is retryable: the next entry sees the valid managed topology and completes registration. Non-source Existing Projects continue to register without source.

## Finding 2 — WIR projection still makes managed source availability an entry gate

R02-02 required Work Intake intent to remain savable without source cleanliness or source availability. Current workIntake:projection resolves managed Dev in main.ts whenever the Project has a Repository, and getStructuredWorkIntakeProjection also resolves Dev when no explicit root is supplied. Missing/invalid Dev therefore throws before the structured Work Intake workspace can obtain a projection.

That recreates the authority gate we have been removing: WIR is source-neutral, so temporary source unavailability cannot prevent intake capture.

Required correction:
- main-process Work Intake projection must not pre-resolve Dev;
- structured projection may attempt managed Dev only as optional branch/base evidence;
- failure to resolve/inspect source returns a valid structured projection with empty branches, null currentBranch, null suggestedBase, and blockedReason null;
- capture/retry remain source not-applicable and require no Git availability;
- Source Control itself remains fail-closed; only WIR evidence degrades.

## Disposition

Release one final WRB01-R03 card. This is not a new architectural expansion; it closes two direct Repair02 acceptance misses. After R03, stop for final Architect disposition. WRB02 remains unauthorized until WRB01 closes.