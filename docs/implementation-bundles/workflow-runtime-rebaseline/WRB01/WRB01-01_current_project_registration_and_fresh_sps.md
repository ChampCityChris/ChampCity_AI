# WRB01-01 — Establish Current Project Registration and Fresh SPS Runtime

**Implementer:** GPT 6.0 Luna Medium
**Bundle:** WRB01 — Current Project Runtime Foundation
**Execution:** sequentially released; no Architect review required before the next WRB01 card unless a bundle-level blocker is encountered.

Every card requires focused validation, an Implementer Report, one attributable checkpoint commit, then continuation to the next released card. Do not run the broad historical full suite unless selected by the affected-validation planner.

## Outcome
Create the production Project-registration boundary that establishes or opens one current Structured Project State Project without legacy Workflow import, equivalence, provider selection, or WIR creation.

## Required behavior
- Add a main-process Current Project service owned by Project entry, not Work Intake.
- Registration accepts the selected Project container plus explicit mode: existing or greenfield.
- A previously registered current Project opens idempotently and returns its exact Project identity.
- A fresh registration creates .champcity/project-state.sqlite through the existing SQLite Project State store, creates one Project record and one source-repository ProjectResource, and marks Structured Project State as current without staging/importing legacy Workflow state.
- Existing Project registration inspects repository/project facts needed to establish the Project resource but does not convert Markdown Workflow artifacts into current SPS records.
- Greenfield registration creates the Project semantic state only; physical Git bootstrap belongs to WRB01-02/03.
- Current Project discovery must no longer require a legacy→structured cutover event. Introduce a direct current-Project lookup that recognizes freshly established SPS.
- Preserve old migration code for now only because retirement is bundle card 05; new production registration must not call it.

## Identity and safety
- One Project container may resolve to exactly one current SPS Project.
- Existing SPS belonging to another Project or ambiguous Project records fail closed.
- .champcity and database paths must remain contained beneath the selected Project container and reject redirect/symlink escape.
- Do not infer Project identity from folder name, Git branch, Work Intake, or Markdown.

## Expected production surface
- New service under src/main/projectState/ or src/main/projectRuntime/.
- Existing SQLite Project State store/schema/service may be reused.
- main.ts/preload/renderer are not wired in this card except compile-required type exposure; WRB01-04 owns user entry.

## Focused proof
Add a permanent current-Project registration test proving: fresh non-Git directory registration; idempotent reopen; one Project + source resource; no WorkIntake/WIR created; existing Markdown files are ignored as current state; ambiguous/foreign SPS fails closed; no Git mutation occurs.

## Non-scope
Do not create Main/Dev, initialize Git, create Project Creation Workflow, modify Workflow Hub, import legacy Workflows, delete migration code, or implement WIR.

## Report and checkpoint
Write docs/implementation-bundles/workflow-runtime-rebaseline/WRB01/Reports/WRB01-01_IMPLEMENTER_REPORT.md. Suggested commit: WRB01-01 establish current Project runtime.