# WRB01-R02-01 — Separate Current Project Registration from Optional Repository Identity

**Parent:** WRB01
**Starting checkpoint:** 50606b2867c041ad461a3634faf7430699af014a
**Implementer:** GPT 6.0 Luna Medium

## Objective
Correct the Architect-level identity mistake in WRB01/R01: Current Project selection is Project runtime state, not proof that a Git Repository exists.

## 1. Current Project registration marker
Use a dedicated ProjectResource marker for Current Project registration that is not resourceType source-repository.

Canonical semantic shape:
- resourceType: `current-project-registration`
- provider: `champcity`
- logicalName: `current-project`
- locator: `selected-project`
- role: `current-project`

The exact strings above become the current V1 contract and must be exported/reused rather than duplicated.

`selectedCurrentProjectId()` must select exactly one marker satisfying all of:
- ProjectResource entity type;
- the canonical registration body above;
- state_entities.lifecycle_state = active;
- owning Project lifecycle_state = active;
- owning Project exists.

Zero markers means no Current Project. More than one active marker fails closed. Archived/closed/superseded/voided markers do not select a Project.

## 2. Repository is a separate optional resource
A source-backed Current Project may additionally own exactly one active ProjectResource:
- resourceType: `source-repository`
- provider: `git`
- logicalName: canonical bounded Repository ID;
- locator: `managed-repository`
- role: `project-source`.

Add one Current Project helper that returns the active source Repository identity or null. Multiple active source-repository resources for the Current Project fail closed.

A non-source-backed Current Project has no source-repository ProjectResource. Do not manufacture a placeholder Git repository identity.

## 3. Registration API
`registerCurrentProject()` must create/open the Current Project registration marker independently of source backing. Its options may explicitly supply an attached source Repository identity when source infrastructure exists.

Greenfield entry supplies the canonical repository identity only after managed source bootstrap succeeds.

Existing Project entry determines source backing mechanically before registration:
- conventional exact-root Git repository → source-backed;
- already-managed repository metadata/Main/Dev topology → source-backed;
- ordinary non-Git Project container → no source repository.

Do not derive Current Project identity from this determination.

## 4. Hard cut; no migration
The R01 representation `source-repository + locator selected-project` is obsolete. Do not convert it in place or preserve it as a compatibility alias.

If a store contains only that obsolete R01 representation and no canonical current-project-registration marker, treat it like abandoned old state: create a fresh Current Project registration and leave the old Project/Workflow/resource records untouched.

Do not delete or mutate historical records.

## 5. Project facade
Refactor `createProjectWorkflowStateFacade.createProject()` as needed so Project creation does not require a Repository. Repository attachment must be optional/separate.

No new database schema is required; ProjectResource is already generic.

## 6. Architecture documentation
Update `CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md` to state explicitly:
- Current Project registration/selection is not Repository identity;
- source Repository is optional ProjectResource infrastructure;
- non-Git Current Projects are valid;
- source-backed Workflow semantics apply only when a Repository exists.

## 7. Permanent proof
Extend Current Project registration/entry tests to prove:
- non-Git Existing Project gets Current Project marker and zero source-repository resources;
- source-backed Existing and Greenfield Projects get marker plus exactly one source-repository resource;
- obsolete R01 selected-project source marker is abandoned rather than converted;
- inactive registration marker cannot select Current Project;
- inactive Project cannot be selected by an otherwise matching marker;
- duplicate active registration markers fail closed;
- multiple active source resources fail closed.

## Non-scope
Do not redesign Workflow Hub, WIR routing, SourceReadiness, Source Graph visualization, Workflow creation, or WRB02.

## Report/checkpoint
Write `Repair02/Reports/WRB01-R02-01_IMPLEMENTER_REPORT.md`. Suggested commit: `WRB01-R02-01 separate Current Project and Repository identity`. Then proceed directly to R02-02.