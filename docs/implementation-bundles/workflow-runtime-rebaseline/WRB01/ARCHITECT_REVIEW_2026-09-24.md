# WRB01 Architect Bundle Review

**Date:** 2026-09-24
**Reviewed range:** cb81e9d577f23b3ad8029cd345f3ebc666818b5d..287176637cc8784c4a9552e9305c5795884fbe97
**Disposition:** Core bundle direction accepted; bounded Repair Bundle 01 required before WRB01 closes.

## Accepted bundle work

- Current Project registration exists independently of WIR.
- New Project no longer enters Work Intake; Existing Project enters the Project/Hub surface.
- Greenfield managed topology is non-Git Project container + .champcity/repository.git + Main/Dev.
- Existing conventional repository adoption preserves refs/remotes and tested dirty/untracked bytes.
- WTR02D RepositoryCheckout registration is used for Main/Dev.
- legacy inventory/import/equivalence/provider-cutover production modules and their migration-only tests were removed.
- focused WRB01 qualification passed 17/17; dev is clean at the bundle checkpoint.

## Finding 1 — Current Source Graph is broken by the new non-Git Project root

main.ts still constructs createSourceControlService with repositoryRoot equal to the Project container for sourceGraph:get and sourceGraph:revisionDetail. SourceControlService requires repositoryRoot to be an exact Git working-tree root before getSourceGraph runs. After WRB01-02/03 the Project container is intentionally non-Git, so the desktop Source Control graph cannot operate on a successfully established WRB01 Project.

SourceGraph also needs two roots now: Git topology from an explicit managed checkout, and SPS metadata from the Project container. Passing Dev as the old single root would restore Git but make structuredMetadata look for Dev/.champcity/project-state.sqlite. Repair must preserve the root separation rather than add a fallback.

## Finding 2 — conventional adoption can attach dirty state to the wrong branch

managedProjectSourceService always creates Main as --no-checkout and moves the original working-tree bytes into Main. It never inspects which branch the conventional repository currently has checked out. If the selected repository is on dev, dirty/untracked state from dev is moved into Main and interpreted relative to main. ChampCity itself commonly develops on dev, so this is a material adoption defect.

Repair must preserve the original working-tree branch association for main/dev and fail before mutation for detached/other branches that cannot be mapped safely.

## Finding 3 — ordinary main-only repositories are unnecessarily blocked

WRB01-02 currently requires both main and dev refs before adoption. The card allowed this conservative outcome, so this is an Architect specification miss rather than a Luna failure. For the adopted topology, a missing dev ref has a deterministic safe rule when main exists: create dev at the exact main revision inside the copied/managed metadata, without mutating the original repository before commit of adoption.

## Finding 4 — old SPS Projects are rejected instead of abandoned

registerCurrentProject reuses any sole Project record already in project-state.sqlite. If that Project has the old selected-repository source locator, registration fails. The Operator decision was not to migrate old Workflow state; it was to abandon it and start current Workflows fresh.

The existing SQLite store already supports multiple Project identities. The cleaner hard cut is: if there is no selected-project Current Project registration, create a fresh current Project in the same store and leave old Project/Workflow records historical and unselected. Current Project discovery must select the one selected-project registration, not require the database to contain only one Project record.

## Finding 5 — Start New Project can reopen an already-current managed Project as greenfield

assertGreenfieldProjectEntry returns immediately when managed repository metadata exists. A user can therefore choose an existing managed Project through Start New Project and be sent to Project Intake as though it were new. New Project must reject an already-selected Current Project.

Greenfield ordering should allow safe retry: establish/verify the deterministic managed Greenfield source baseline first, then create/select Current Project state. If source bootstrap succeeds but SPS registration fails, a retry may validate the compatible managed baseline and finish registration; a completed Current Project cannot be re-entered through Start New Project.

## Finding 6 — legacy Development/Issue runtime is still reachable from the Current Project Hub

WorkflowHubWorkspace still renders 'Continue legacy Development or Issue work' and its actionable legacy cards. WRB01-05 required retained legacy surfaces to be unreachable from the new Current Project runtime. The disclosure must be removed from the current Hub; WRB02 will replace it with first-class Workflow inventory/direct-start behavior.

## Validation finding

The final affected-profile run was incomplete, not passed. That does not by itself require a broad-suite rerun. Repair qualification should use the focused WRB01 vertical proof plus focused regression proof for the defects above. The bundle qualification report also contains replacement characters in two validation lines and should be rewritten as valid UTF-8 during repair closeout.

## Repair disposition

Release WRB01-R01 as a three-card sequential repair bundle. Luna may execute all three cards with checkpoint commits and stop after R01-03 for Architect review.