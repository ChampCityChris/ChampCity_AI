# Repair Work Card: WC08-REPAIR05 — Architect Review Route and Repair Work Card Association

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC08 — Current Step Context Inspector
Repair ID: WC08-REPAIR05
Created: 2026-07-14

## Repair Trigger

WC08-REPAIR04 was marked ready for Operator validation after Architect review of the Implementer Report. During attempted Operator validation, the application could not complete validation within the app.

The app opened with the correct current action identity in the left panel and top bar:

```text
WC08-REPAIR04
Architect review of repair Implementer Report required
```

However, the routed workspace opened to:

```text
Implementer Report Capture
```

The workspace then required manual association to a saved Work Card JSON, but the Work Card selector did not provide a usable list of available Work Cards or the current WC08-REPAIR04 repair Work Card. The screen displayed validation/setup failures such as:

```text
Select a Work Card before saving a Work Card report.
Enter a repair topic.
No Work Card association.
Report preview needs attention.
```

The Work Card file list was also polluted by large visible schema-validation warnings for historical/superseded Work Card JSON files, including repeated messages that saved Work Card JSON was not valid because fields such as `workCardId`, `phase`, `createdAt`, `updatedAt`, `problem`, `goal`, `userOutcome`, `riskLevel`, `scope`, `outOfScope`, `requirements`, `acceptanceCriteria`, `validationPlan`, `risks`, `builderInstructions`, and `operatorNotes` were missing or not the expected type.

## Primary Validation Source

Operator screenshot evidence supplied in chat for WC08-REPAIR04 validation attempt:

- Screenshot showing the app opened to `WC08-REPAIR04` / `Architect review of repair Implementer Report required` while the workspace displayed `Implementer Report Capture`.
- Screenshot showing the report setup area with `Report Type: Repair`, `Saved Work Card JSON: No Work Card association`, and `Enter a repair topic`.
- Screenshots showing `Skipped Work Card files` warnings for historical/superseded JSON files and no usable current repair Work Card association.

## Human Problem

The current action is an Architect review obligation, but the app routes the Operator into an Implementer Report capture workflow. That workflow expects the user to manually select a Work Card association, but the current repair Work Card is not available or auto-selected.

This blocks validation because the Operator cannot validate the intended WC08-REPAIR04 behavior through the app. The application is asking the user to complete the wrong workflow screen and is exposing internal schema parsing failures as the primary UI experience.

This is not Operator error. The app knows the current action target, but the routed workspace does not use that current-action target to bind the review/capture form.

## Repair Goal

Repair the routed workspace behavior for Architect review of repair Implementer Reports so WC08-REPAIR04 can be reviewed and validated within the application.

The app must:

1. Route `architect_review_of_implementer_report_required` for a repair target to an Architect review workflow, not an Implementer Report capture workflow that asks for a new report.
2. Auto-bind the routed screen to the current action target (`WC08-REPAIR04`) and its associated Implementer Report.
3. Support repair Work Cards in Work Card association logic.
4. Stop surfacing historical/superseded JSON schema failures as a primary blocking UI state.
5. Preserve WC08-REPAIR04 route authority, evidence classification, and route review request behavior.

## Required Repair

### 1. Correct route-to-workspace mapping for Architect review of repair Implementer Reports

When the current action is:

```text
architect_review_of_implementer_report_required
```

and the target is a repair Work Card such as `WC08-REPAIR04`, the routed workspace must support Architect review of the existing Implementer Report.

Acceptable implementation options:

- Route to a dedicated Architect Review screen if one exists.
- Add a clear Architect Review mode to the existing report/review workspace.
- Reuse an existing capture/review screen only if it is visibly and functionally operating as Architect Review, not Implementer Report Capture.

The routed screen must not instruct the user to paste or save a new Implementer Report when the required action is Architect review of an existing repair Implementer Report.

### 2. Auto-bind current action target

The routed workspace must use current-action state to auto-select:

- phase: `phase-03`;
- target Work Card / repair: `WC08-REPAIR04`;
- associated Implementer Report: `BUILDER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`;
- report/review mode: Architect review of repair Implementer Report.

The Operator should not be required to manually select a Work Card association when the current action already identifies the Work Card.

Manual selector fallback may remain available, but it must not be required for the routed current action.

### 3. Support repair Work Card JSON schemas in association lists

The Work Card association selector must include current repair Work Cards, including WC08-REPAIR04.

The selector/parser must recognize both historical and current Work Card schema variants that are valid durable artifacts for this application, including repair Work Cards that may use fields such as:

- `id` instead of `workCardId`;
- `phaseId` or `phase` depending on generation path;
- `parentWorkCardId`;
- `repairId` or repair-specific metadata;
- markdown/json pairs created by Architect repair Work Card generation.

Do not require every historical or repair artifact to satisfy a single newer schema before it can be used as current-action evidence.

### 4. Hide or downgrade skipped historical JSON warnings

The app must not flood the primary routed workflow with large warning blocks for historical/superseded JSON files that are not controlling the current route.

If skipped file warnings remain useful for diagnostics, they must be:

- collapsed by default;
- clearly labeled as diagnostic/non-blocking unless they block the current action;
- not placed above the actual current-action form content;
- not prevent auto-binding to the current current-action target.

### 5. Preserve current-action authority

Do not regress WC08-REPAIR04 route authority.

The app must still identify WC08-REPAIR04 as the controlling unresolved WC08 repair-chain obligation and must not route to:

- stale Phase 03 WC01;
- WC09;
- unrelated historical repairs;
- a generic manual report setup screen with no association.

### 6. Preserve WC08-REPAIR04 functionality

Do not remove or regress:

- accurate evidence classification;
- duplicate validation ambiguity warnings;
- present-but-pending evidence classification;
- governed in-app Route Review Request behavior;
- `Why this step?` layout improvements;
- compact left panel;
- Artifacts as the only artifact browser;
- supporting/reference screen suppression.

## Out of Scope

- Do not implement WC09-WC15.
- Do not create WC09.
- Do not create a broad artifact revision governance model.
- Do not create unrestricted route override behavior.
- Do not mark WC08, WC08-REPAIR04, or any validation report as accepted.
- Do not perform Operator validation.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- App opens to `WC08-REPAIR04` or the actual current WC08 repair-chain obligation, not stale WC01 or WC09.
- The routed workspace title and form behavior match `Architect review of repair Implementer Report required`.
- The routed workspace does not show `Implementer Report Capture` as the primary task when the current action is Architect review.
- The routed workspace auto-binds to WC08-REPAIR04 from current-action state.
- The associated WC08-REPAIR04 Implementer Report is selected or displayed without requiring manual Work Card selection.
- Repair Work Cards appear in association lists when a manual fallback selector is used.
- Historical/superseded invalid JSON warnings do not block or dominate the current routed workflow.
- If skipped-file warnings are shown, they are collapsed/diagnostic and not confused with current-action blockers.
- The Operator can proceed to Architect review output creation or preview from the routed workspace.
- WC08-REPAIR04 route review request behavior remains available and governed.
- WC08-REPAIR04 evidence classification remains accurate.
- WC08-REPAIR02 and WC08-REPAIR03 behavior remains intact.
- WC09 remains blocked until WC08 repair-chain obligations are resolved.
- Focused fixture coverage exists for repair Architect Review route binding and repair Work Card association.
- WC08-REPAIR05 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run approved normal Windows validation lanes.
- Run TypeScript/type validation and production build validation.
- Run current-action-only fixture validation.
- Add focused fixture coverage proving `architect_review_of_implementer_report_required` for WC08-REPAIR04 routes to an Architect review-capable workspace.
- Add focused fixture coverage proving current-action target auto-binding selects WC08-REPAIR04 and its Implementer Report.
- Add focused fixture coverage proving repair Work Cards are recognized by the association selector/parser.
- Add focused fixture coverage proving historical/superseded invalid JSON files do not block the current-action routed workflow.
- Run WC08-REPAIR04 focused route-recovery fixture.
- Run WC08-REPAIR01 route-context explanation fixture if affected.
- Run WC08-REPAIR02 report-protocol fixture if affected.
- Run WC08-REPAIR03 pending-repair routing fixture if affected.
- Run WC04/WC05/WC06/WC07 preservation fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.
- Do not install or run Playwright.

## Required Implementer Report

Create:

`planning/phases/phase-03/Builder_Reports/BUILDER_REPORT_WC08-REPAIR05_architect_review_route_and_repair_work_card_association.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- root cause of the Architect review route opening Implementer Report Capture;
- how the route-to-workspace mapping was corrected;
- how WC08-REPAIR04 is auto-bound from current-action state;
- how repair Work Card association parsing was corrected;
- how historical/superseded skipped JSON warnings were downgraded or hidden;
- how WC08-REPAIR04 route authority and route recovery behavior were preserved;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action using role-owned language.

## Next Action Ownership

The Architect created this repair Work Card and will review the Implementer Report after implementation.

The Implementer implements WC08-REPAIR05 and produces the required Implementer Report.

The Operator validates WC08-REPAIR05 only after Architect review authorizes Operator validation.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC08-REPAIR05 — Architect Review Route and Repair Work Card Association

Base branch:
feature/phase-03-wc08-repair04-controlled-route-recovery

Target repair branch:
feature/phase-03-wc08-repair05-architect-review-route-binding

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08-REPAIR05_architect_review_route_and_repair_work_card_association.md

Implement only WC08-REPAIR05.

Do not implement WC09-WC15.
Do not implement full artifact revision governance.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Fix the routed workspace for `architect_review_of_implementer_report_required` when the current action target is a repair Work Card. The app currently identifies WC08-REPAIR04 correctly but opens Implementer Report Capture with no usable Work Card association. The app must open or configure an Architect review-capable workflow, auto-bind WC08-REPAIR04 and its Implementer Report, and stop exposing historical invalid JSON warnings as the primary current-action UI.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available: feature/phase-03-wc08-repair04-controlled-route-recovery.
3. Create and switch to: feature/phase-03-wc08-repair05-architect-review-route-binding.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08-REPAIR05 Work Card.
7. Read the WC08-REPAIR04 Implementer Report and Architect review disposition.
8. Inspect current-action route mapping, manual screen mapping, Implementer Report Capture, Architect Review generation/review screens, Work Card association selector, saved Work Card JSON parser, repair Work Card schema, and skipped-file warning rendering.

Required repair:
- Route Architect review of repair Implementer Report to an Architect review-capable workspace.
- Auto-bind current action target WC08-REPAIR04 and the WC08-REPAIR04 Implementer Report.
- Support repair Work Card schemas in Work Card association lists.
- Prevent historical/superseded invalid JSON warnings from blocking or dominating the routed workflow.
- Preserve WC08-REPAIR04 current-action authority and route review behavior.
- Preserve WC08-REPAIR01/WC08-REPAIR02/WC08-REPAIR03 behavior.
- Add focused deterministic fixture coverage for the exact UI/routing regression.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
"