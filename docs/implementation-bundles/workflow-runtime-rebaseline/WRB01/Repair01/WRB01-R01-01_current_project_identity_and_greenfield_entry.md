# WRB01-R01-01 — Correct Current Project Identity and Greenfield Entry Semantics

**Parent:** WRB01
**Starting checkpoint:** 287176637cc8784c4a9552e9305c5795884fbe97
**Implementer:** GPT 6.0 Luna Medium

## Objective
Make Current Project selection mean one explicit selected-project registration, not one-and-only-one Project record in the SQLite store, and make Start New Project incapable of reopening an already-current Project as Greenfield.

## 1. Fresh current identity in a store containing abandoned Project state
Current Project discovery must select exactly one active ProjectResource whose source-repository locator is selected-project.

Required rules:
- zero selected-project registrations → no Current Project;
- exactly one valid selected-project registration → that Project is current;
- more than one selected-project registration → ambiguous/fail closed;
- old Project records without selected-project registration do not make the database ambiguous;
- old selected-repository resources remain historical and are never converted or attached to the new Current Project.

registerCurrentProject must use the same rule. If no selected-project Current Project exists, create a fresh Project + selected-project source resource even when the database already contains one or more old Project/Workflow records. Do not reuse the old Project merely because it is the only Project row.

Permanent proof must create an old Project with old Workflow state and selected-repository resource, register Current Project, and prove: new Project ID differs; old records remain unchanged/queryable only under old Project ID; selectedCurrentProjectId returns the new ID; current Project contains no imported WorkIntake/Workflow records.

## 2. Greenfield entry ordering and retry
Export/reuse one canonical Current Project repository identity rather than duplicating the literal selected-project-source.

For project:registerCurrent in greenfield mode:
1. reject immediately if selectedCurrentProjectId(root) already returns a Current Project;
2. register the Project container with Agent Harness;
3. establish/verify the deterministic managed Greenfield source baseline using the canonical repository ID;
4. only after source bootstrap succeeds, register the fresh Current Project SPS identity;
5. return the exact Current Project context.

This ordering prevents a failed source bootstrap from leaving a completed Current Project registration. If managed Greenfield source exists from a prior attempt but no Current Project is selected, bootstrap may validate it idempotently and registration may finish.

Start New Project must reject an already-current managed Existing or Greenfield Project. Users reopen those through Existing Project.

Existing Project entry remains register-current-first then managed adoption; a safe adoption failure may leave Current Project state and be retried after the source condition is corrected.

## 3. Tests
Extend current-project-registration and current-project-entry permanent proof for: old SPS abandonment via fresh current identity; multiple historical Project rows with one current selection; completed Current Project rejected by Greenfield entry; compatible managed Greenfield baseline with no Current Project can finish registration; no WIR/WorkIntake creation.

## Non-scope
Do not migrate/void old Workflows, delete old Project rows, archive the SQLite file, change Workflow Hub, change repository adoption mechanics, or implement WRB02.

## Report/checkpoint
Write Repair01/Reports/WRB01-R01-01_IMPLEMENTER_REPORT.md. Suggested commit: WRB01-R01-01 correct Current Project identity and Greenfield entry. Then proceed directly to R01-02.