# Repair Work Card: WC08-REPAIR02 — Report Review Protocol and Validation Disposition Governance

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC08 — Current Step Context Inspector
Repair ID: WC08-REPAIR02
Created: 2026-07-14

## Repair Trigger

WC08 validation exposed a process defect in how generated validation reports and Implementer Reports are interpreted during Architect review.

The immediate problem was not only WC08 Route Context content. The validation report allowed this mixed state:

- Validation Result: `Pass`
- What Failed: one item was listed as failed
- Operator Decision: `Partial - repair or follow-up needed`

The Architect then treated the mixed report too mechanically and created a repair without first classifying whether the issue was a blocking defect, pass-with-concern, carry-forward observation, or future-scope improvement.

This indicates a durable report-template and review-protocol defect:

1. Validation reports do not explain how the Architect should review mixed report fields.
2. `Operator Decision` creates role confusion because it asks the Operator to make a workflow disposition that should be made by the Architect after analysis.
3. Implementer Reports do not consistently contain embedded Architect review instructions.
4. Architect Reviews are not forced into a consistent output shape, which causes inconsistent validation steps and inconsistent observation handling.

## Primary Sources

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Repair_Prompts/REPAIR_PROMPT_WC08_current_step_context_inspector.md`
- `planning/project/Project_Observation_Register.md`
- `planning/phases/phase-03/Observation_Register.md`

## Human Problem

The Operator should record what was tested, what passed, what failed, what felt wrong, and what evidence supports that finding.

The Operator should not be forced to decide whether a finding is:

- mergeable;
- immediate repair;
- deferred observation;
- future-scope backlog;
- no action required.

That disposition belongs to the Architect review.

## Repair Goal

Update the validation-report, repair-prompt, Implementer Report, and Architect Review guidance/templates so future reports contain the rules needed for consistent review.

After this repair, when the user says, “validation report is ready for review,” the Architect should be able to read the report and follow embedded instructions instead of reconstructing report interpretation rules from chat memory.

## Required Process Model

Use this role split:

- Operator supplies validation evidence.
- Implementer supplies implementation evidence.
- Architect supplies disposition.

The report artifacts must make that split explicit.

## Required Validation Report Changes

### 1. Remove or deprecate Operator Decision as routing authority

New validation reports should not ask the Operator to choose workflow disposition such as:

- `Passed - proceed`
- `Partial - repair or follow-up needed`
- `Failed - repair required`

If an existing field named `operatorDecision` must remain for backward compatibility, it must be clearly labeled as deprecated/advisory and must not be treated as final routing authority.

Preferred replacement:

- `Architect Disposition: Pending Architect review`

### 2. Replace the result model with Operator-owned validation outcomes

Validation Result should describe testing outcome, not routing disposition.

Allowed values should be:

- `Pass`
- `Pass with concerns`
- `Partial`
- `Fail`
- `Not tested`
- `Blocked`

Semantics:

- `Pass`: acceptance criteria are satisfied at a functional level.
- `Pass with concerns`: acceptance criteria are substantially satisfied, but non-blocking concerns exist.
- `Partial`: some acceptance criteria were not satisfied; Architect disposition required before merge.
- `Fail`: the Work Card purpose or critical acceptance criteria were not satisfied.
- `Not tested`: validation was not meaningfully performed.
- `Blocked`: validation could not be completed due to a blocker.

### 3. Add acceptance-criteria item results

Where feasible, the validation report should structure tested items as item-level results:

- `Pass`
- `Concern`
- `Fail`
- `Not tested`
- `Not applicable`

This does not need to become a full database model in this pass if the current form cannot support it cleanly, but the report template must guide the Operator to distinguish failure from concern.

### 4. Add report field semantics

Every generated validation report must include a durable section explaining field meaning:

```text
## Field Semantics

Validation Result answers: Did the implementation satisfy the Work Card acceptance criteria at a functional level?

What Failed contains: Acceptance criteria that were not satisfied enough to pass.

Observed Errors contains: Specific broken behavior or evidence supporting failed or partial items.

Additional Operator Observations contains: Usability, design, workflow, or future-scope feedback that may or may not block this Work Card.

Architect Disposition answers: What happens next after Architect review. It is pending until the Architect reviews this report.
```

### 5. Add embedded Architect Review Instructions

Every validation report must include:

```text
## Architect Review Instructions

The Architect must analyze this report using this order:

1. Confirm the validation target.
2. Compare Validation Result, What Failed, Observed Errors, Additional Operator Observations, and all referenced evidence.
3. If legacy Operator Decision exists, treat it as advisory context only, not final routing authority.
4. Review referenced screenshots/files as primary evidence.
5. Classify each issue as:
   - blocking repair item;
   - non-blocking pass-with-observation;
   - carry-forward observation;
   - future-scope/product backlog;
   - no action required.
6. Do not automatically create repair solely because a report contains the word Partial.
7. Do not ignore observations solely because the report result is Pass.
8. Produce a consistent Architect analysis with mergeability, repair decision, observation-register impact, and next action.
```

### 6. Add required Architect disposition output shape

Generated validation reports should include a pending section like this:

```text
## Architect Disposition

Status: Pending Architect review

Required Architect output:
- Mergeable:
- Repair required:
- Observation Register update required:
- Next action:
- Rationale:
```

## Required Implementer Report Changes

Implementer Reports must include embedded Architect review instructions so Architect review is consistent.

Add a durable section to generated Implementer Reports:

```text
## Architect Review Instructions

The Architect must not rely only on this report's claims.

The Architect must:
1. Confirm branch, repo, and changed files.
2. Read the Work Card.
3. Compare implementation claims against acceptance criteria.
4. Inspect relevant changed source files or fixtures.
5. Determine whether validation evidence is adequate.
6. Identify skipped checks and decide whether each is acceptable.
7. Decide whether the implementation is:
   - ready for Operator validation;
   - repair required before Operator validation;
   - blocked / incomplete;
   - outside scope.
8. If ready for validation, provide manual Operator validation steps.
9. If repair is required, identify exact repair scope.
10. If observations arise, update or recommend updating the Observation Register.
```

## Required Architect Review Output Standard

Architect Reviews of Implementer Reports must use this stable shape:

```text
## Architect Review Decision

Decision:
- Ready for Operator validation
- Repair required before Operator validation
- Blocked / incomplete
- Out of scope

## Work Card Compliance

## Changed Files Reviewed

## Acceptance Criteria Assessment

## Validation Claims Assessment

## Skipped Checks Assessment

## Observation Register Impact

## Operator Validation Steps

## Required Repair, if any
```

If the decision is `Ready for Operator validation`, the Architect Review must include Operator validation steps. Missing validation steps is a review defect.

## Required Legacy Compatibility

Existing reports may still include `Operator Decision`.

Legacy handling rule:

- Treat `Operator Decision` as advisory context only.
- Do not use it as the sole trigger for repair, merge, or deferral.
- Architect disposition must be based on Validation Result, failed items, observed errors, additional observations, evidence/screenshots, Work Card scope, and Observation Registers.

If parsing code currently treats `operatorDecision` as controlling route evidence, it must be updated so the new report model does not create false repair or false pass states.

## Current WC08 Handling Rule

This repair does not automatically decide whether WC08-REPAIR01 should be implemented.

After this report-governance repair is validated, the Architect should re-review the WC08 validation report under the new protocol and decide whether the route-context plain-language improvement is:

- immediate WC08-REPAIR01;
- pass with observation;
- deferred to a later UX/context pass.

## Carried-Forward Observations Included

### PROJ-OBS-005 / PH03-OBS-008 — Report review protocol and validation disposition role confusion

- Source: Operator discussion following WC08 validation report review.
- Included because: The validation and Implementer report templates are producing ambiguous report artifacts that cause inconsistent Architect review and inconsistent repair/merge recommendations.
- Acceptance impact: Validation reports and Implementer Reports must embed the review rules needed for consistent Architect analysis.

## Out Of Scope

- Do not implement WC09-WC15.
- Do not implement WC08-REPAIR01 route-context explanation changes in this pass.
- Do not redesign the entire validation screen beyond report-template/report-field changes required here.
- Do not implement a full issue tracker.
- Do not remove historical reports.
- Do not add provider SDKs, database, cloud, auth, deployment, MCP, connector, or external integration changes.
- Do not perform Operator validation.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- New validation reports no longer present Operator Decision as final workflow disposition.
- New validation reports include `Architect Disposition: Pending Architect review` or equivalent.
- New validation reports include field semantics explaining Validation Result, What Failed, Observed Errors, Additional Operator Observations, and Architect Disposition.
- New validation reports include embedded Architect Review Instructions.
- Validation result values support `Pass with concerns` or equivalent non-blocking concern state.
- Legacy `operatorDecision` fields are treated as advisory only where parsing/review logic encounters them.
- Implementer Reports include embedded Architect Review Instructions.
- Architect Review generation/guidance consistently includes decision, Work Card compliance, changed files reviewed, acceptance criteria assessment, validation claims assessment, skipped checks assessment, observation-register impact, Operator validation steps, and required repair if any.
- If an Architect Review marks an implementation ready for Operator validation, validation steps are required.
- Observation Register impact is explicit in Architect Review output.
- Existing WC04-WC08 behavior is preserved except for intended report-template/report-protocol changes.
- WC08-REPAIR02 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run approved normal Windows validation lanes.
- Run type/build validation.
- Run current-action and report-generation focused fixtures if available.
- Add or update focused checks for validation-report template semantics and Implementer Report Architect Review Instructions where feasible.
- Run existing WC04-WC08 focused fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- how validation reports changed;
- how Operator Decision was removed, deprecated, or made advisory;
- how Architect Disposition Pending is represented;
- how field semantics and Architect Review Instructions are embedded;
- how Implementer Reports now embed Architect Review Instructions;
- how Architect Review output is standardized;
- how legacy reports remain compatible;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC08-REPAIR02 — Report Review Protocol and Validation Disposition Governance

Base branch:
feature/phase-03-wc08-current-step-context-inspector

Target repair branch:
feature/phase-03-wc08-repair02-report-review-protocol

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md

Implement only WC08-REPAIR02.

Do not implement WC08-REPAIR01.
Do not implement WC09-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Repair the report-template and review-protocol system so validation reports and Implementer Reports contain embedded Architect review instructions and no longer force the Operator to make workflow disposition decisions.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available:
   feature/phase-03-wc08-current-step-context-inspector
3. Create and switch to:
   feature/phase-03-wc08-repair02-report-review-protocol
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08-REPAIR02 Work Card.
7. Read the WC08 validation report and generated repair prompt.
8. Read both Observation Registers.
9. Inspect validation report generation, Implementer Report generation, Architect Review generation/guidance, current-action validation parsing, and any report template fixtures.

Required repair:
- Remove/deprecate Operator Decision as final routing authority in new validation reports.
- Add Architect Disposition Pending to validation reports.
- Add field semantics and Architect Review Instructions to validation reports.
- Add Architect Review Instructions to Implementer Reports.
- Standardize Architect Review output.
- Require validation steps when an implementation is ready for Operator validation.
- Treat legacy operatorDecision as advisory, not final disposition.
- Preserve existing workflow behavior outside report-template/report-protocol scope.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
