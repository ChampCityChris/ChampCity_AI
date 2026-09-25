# WRB01-04 — Converge Landing Project Entry onto Current Project Runtime

**Implementer:** GPT 6.0 Luna Medium
**Bundle:** WRB01 — Current Project Runtime Foundation
**Execution:** sequentially released; no Architect review required before the next WRB01 card unless a bundle-level blocker is encountered.

Every card requires focused validation, an Implementer Report, one attributable checkpoint commit, then continuation to the next released card. Do not run the broad historical full suite unless selected by the affected-validation planner.

## Depends on
WRB01-03 checkpoint.

## Outcome
Wire the real desktop entry paths to the current Project runtime. Existing Project opens/establishes an Existing Project registration. Start New Project enters Project Creation/Project Intake. Neither path begins WIR.

## Required behavior
- Add bounded IPC/preload contracts for current Project registration/opening using WRB01-01 service.
- openExistingProjectFromLanding(): select container → register/open current Project → establish/verify managed source topology as appropriate → enter Project/Workflow Hub surface.
- startNewProjectFromLanding(): select empty/new container → establish fresh SPS Project + Greenfield managed source baseline → enter existing Project Intake / Greenfield capture workspace.
- Remove the current Start New Project → work-intake call.
- Do not automatically create a WorkIntake or work-intake-routing Workflow on either Project entry path.
- Reuse the existing Project Intake → Architect Interview → Project Planning front-half UI where possible; this card only restores the correct entry and current Project identity plumbing, not final Greenfield planning normalization.
- Renderer state must carry exact current Project identity rather than infer it from repository/Work Intake.
- Existing Project with historical Markdown opens as current SPS Project without legacy Workflow reconstruction.

## UI boundary
Keep this card functional, not cosmetic. Do not redesign Workflow Hub or Project Intake styling. Existing usable Workspace presentation should be reused.

## Focused proof
Add/modify desktop/renderer boundary tests proving: New Project does not call/open WIR; New Project lands at Project Intake; Existing Project does not create WIR; both have current SPS Project identity; Existing Project opens with non-Git Project root and Main/Dev checkout registration; reopen remains stable.

## Non-scope
Do not implement final Workflow Hub inventory/direct-start, WIR routing repair, Greenfield execution normalization, or shared execution.

## Report and checkpoint
Write Reports/WRB01-04_IMPLEMENTER_REPORT.md. Suggested commit: WRB01-04 converge desktop Project entry.