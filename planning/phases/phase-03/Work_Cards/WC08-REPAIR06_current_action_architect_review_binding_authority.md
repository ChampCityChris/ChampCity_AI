<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC08-REPAIR06",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR06_current_action_architect_review_binding_authority.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR06_current_action_architect_review_binding_authority.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC08",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC08-REPAIR06 — Current Action Architect Review Binding Authority"
  },
  "payloadHash": "sha256:fbc3fb939fb98fc917eb6a56cf5242c43f03205b0167aaf75ee45fa04055e989",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR06",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR06",
      "champcity-ai/phase-03/operator_validation/WC08-REPAIR06"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR06"
    ],
    "sources": [
      "champcity-ai/phase-03/implementer_report/WC08",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
      "champcity-ai/phase-03/work_card/WC08_current_step_context_inspector",
      "champcity-ai/phase-03/work_card/WC08-REPAIR04"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC08-REPAIR06"
}
-->

# Repair Work Card: WC08-REPAIR06 — Current Action Architect Review Binding Authority

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC08 — Current Step Context Inspector
Repair ID: WC08-REPAIR06
Created: 2026-07-14

## Repair Trigger

WC08-REPAIR05 was reviewed as ready for Operator validation, but Operator validation could not be completed in the application.

The application now routes to an Architect Review workspace instead of Implementer Report Capture, but the routed Architect Review screen binds to the wrong Work Card and wrong Implementer Report.

Screenshot evidence supplied by the Operator shows:

- The left Current Action panel correctly identifies `WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority`.
- The current required action is `Architect review of repair Implementer Report required`.
- The routed workspace is now `Architect Review of Implementer Report`, which is directionally correct.
- The right reference-card selector shows `WC08-REPAIR05 — Architect Review Route...`, not the current-action target.
- The Architect Review form's Saved Work Card JSON selector is bound to `WC08-REPAIR05`, not `WC08-REPAIR04`.
- The screen reports `The selected Implementer Report does not match the selected Work Card.`
- The associated Implementer Report displayed is `IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`, not `IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`.

This means WC08-REPAIR05 corrected the broad workspace route but did not establish current-action binding authority inside the Architect Review screen.

## Validation Result Driving This Repair

WC08-REPAIR05 validation is blocked / failed.

The Operator cannot complete the Architect Review in the application because the app is mixing three different concepts:

1. The current action target: `WC08-REPAIR04`.
2. The manually selected reference card: `WC08-REPAIR05`.
3. A stale parent Work Card Implementer Report: `IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md`.

The current action target must control the routed Architect Review workflow. Reference-card selection must not override routed current-action binding.

## Human Problem

The Operator is following the guided workflow, but the app binds the Architect Review form to the wrong target and wrong report.

The user should not have to manually diagnose whether the current-action panel, reference-card selector, form selector, and associated Implementer Report disagree. The application must bind the routed form from current-action state and prevent contradictory target/report combinations.

## Repair Goal

Repair the Architect Review routed workspace so it uses current-action state as the binding authority.

For this current state, the Architect Review screen must bind to:

```text
Current action target: WC08-REPAIR04
Associated Implementer Report: IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md
Expected output: ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md
```

It must not bind to:

```text
Reference card: WC08-REPAIR05
Parent report: IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md
Any manually selected card that conflicts with the routed current action
```

## Required Architectural Correction

This pass must not be implemented as another local selector or `useEffect` patch. The repeated WC08 failures show that current-action evaluation, routed workspace selection, reference-card navigation, form initialization, artifact association, and preview/save validation are deriving target identity independently.

Create one typed routed-review binding contract that is derived once from the current action and passed through the complete Architect Review workflow. At minimum, that contract must contain:

- phase ID;
- current action ID;
- authoritative Work Card or repair ID;
- authoritative Work Card title;
- exact associated Implementer Report path/file name;
- expected Architect Review output path/file name;
- binding source marked as `current_action`;
- any blocking ambiguity or mismatch state.

The Architect Review screen, selector defaults, visible binding notice, preview logic, and save logic must consume this same contract. They must not independently re-derive the target from reference-card state, list ordering, the parent Work Card, previously selected values, or filename-prefix matching.

Reference-card state must use a separate type/prop from routed-review target state so that one cannot silently substitute for the other.

The Implementer must add a component-level integration test or equivalent mounted-renderer test that exercises the actual state lifecycle. A source-regex assertion or pure backend preview fixture alone is insufficient. The test must render the Architect Review workflow with current action `WC08-REPAIR04` while reference context is `WC08-REPAIR05`, then verify that the rendered form, selected report, preview target, and save payload remain bound to `WC08-REPAIR04` after initialization and state updates.

## Required Repair

### 1. Make current-action target authoritative for routed Architect Review

When the routed action is `architect_review_of_implementer_report_required`, the Architect Review screen must use `currentAction.workCardId`, `currentAction.workCardTitle`, `currentAction.phaseId`, `currentAction.expectedOutput`, and `currentAction.sourceArtifacts` as the authoritative binding source.

The reference-card selector in the top bar is a reference/navigation aid. It must not override the routed current-action target.

### 2. Separate reference card from routed review target

The UI must clearly distinguish:

- Reference card selection: optional reference context.
- Routed current-action target: authoritative target for the current review.

The Architect Review screen must not use the selected reference card as its default Work Card target when a routed current action exists.

### 3. Bind the correct Implementer Report

The screen must select the Implementer Report from the current action's source artifacts.

For `WC08-REPAIR04`, it must select:

```text
IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md
```

The app must not fall back to:

```text
IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md
```

unless the current action actually targets parent `WC08`.

### 4. Prevent mismatched target/report combinations

If current-action binding is active, the screen must not allow saving or previewing with a Work Card and Implementer Report that do not share the same exact Work Card or repair ID.

The UI should show a clear, human-readable message if a manual fallback selection conflicts with current-action authority.

### 5. Fix form state initialization and updates

The Architect Review screen must initialize and update its selected Work Card and selected Implementer Report when current-action state changes.

It must not retain stale selector state from:

- prior reference-card selection;
- prior screen selection;
- parent Work Card route;
- previous validation attempt;
- manual fallback selector values.

### 6. Preserve WC08-REPAIR05 improvements

Do not regress:

- `architect_review_of_implementer_report_required` routes to Architect Review, not Implementer Report Capture.
- Repair Work Cards are visible in association lists.
- skipped historical JSON warnings are compatibility diagnostics, not primary blockers.
- Architect Review preview/save uses governed output structure.
- WC08-REPAIR04 remains the current route and WC09 remains blocked.

### 7. Preserve WC08-REPAIR04 behavior

Do not regress:

- accurate evidence classification;
- governed Route Review Request behavior;
- duplicate validation ambiguity handling;
- current-action route authority;
- `Why this step?` layout and explanation behavior.

## Out of Scope

- Do not implement WC09-WC15.
- Do not create WC09.
- Do not implement full artifact revision governance.
- Do not create unrestricted route override behavior.
- Do not redesign the full workflow rail or Supporting Tools menu.
- Do not remove reference-card navigation; separate it from routed current-action authority.
- Do not mark WC08, WC08-REPAIR04, WC08-REPAIR05, WC08-REPAIR06, or any operator validation as accepted.
- Do not perform Operator validation.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- The routed Architect Review screen binds to `WC08-REPAIR04` when the current action target is `WC08-REPAIR04`.
- The routed Architect Review screen displays or selects `IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`.
- The routed Architect Review screen does not bind to `WC08-REPAIR05` merely because that repair card is selected as a reference card.
- The routed Architect Review screen does not bind to `IMPLEMENTER_REPORT_WC08_current_step_context_inspector.md` when the current action target is `WC08-REPAIR04`.
- Reference-card selection remains available as reference/navigation context but does not override routed current-action authority.
- Manual fallback selectors cannot silently create a mismatched Work Card / Implementer Report pair.
- If a mismatch exists, the screen explains the mismatch and identifies which role/action owns the correction.
- Architect Review preview output filename targets `ARCHITECT_REVIEW_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`.
- Architect Review save output targets `WC08-REPAIR04`, not WC08-REPAIR05 and not parent WC08.
- `architect_review_of_implementer_report_required` still routes to Architect Review, not Implementer Report Capture.
- WC08-REPAIR05 compatibility diagnostics behavior remains intact.
- WC08-REPAIR04 route authority remains intact.
- WC09 remains blocked while WC08 repair-chain obligations remain unresolved.
- Focused fixture coverage exists for current-action binding overriding reference-card selection.
- Focused fixture coverage exists for exact Implementer Report binding from current-action source artifacts.
- WC08-REPAIR06 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run approved normal Windows validation lanes.
- Run TypeScript/type validation and production build validation.
- Run current-action-only fixture validation.
- Add focused fixture coverage proving reference-card selection cannot override the routed current-action Architect Review target.
- Add focused fixture coverage proving WC08-REPAIR04 binds to its exact Implementer Report.
- Add focused fixture coverage proving parent WC08 Implementer Report cannot be selected for a WC08-REPAIR04 Architect Review.
- Run WC08-REPAIR05 architect-review route-binding fixture.
- Run WC08-REPAIR04 controlled route-recovery fixture.
- Run WC08-REPAIR03 pending-repair routing fixture if affected.
- Run WC08-REPAIR02 report-protocol fixture if affected.
- Run WC04/WC05/WC06/WC07 preservation fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.
- Do not install or run Playwright.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR06_current_action_architect_review_binding_authority.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- root cause of WC08-REPAIR05 binding to the wrong Work Card / report;
- how current-action target authority now overrides reference-card selection;
- how the correct WC08-REPAIR04 Implementer Report is selected;
- how mismatched target/report combinations are prevented;
- how WC08-REPAIR05 improvements were preserved;
- how WC08-REPAIR04 route authority was preserved;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action using role-owned language.

## Next Action Ownership

The Architect creates this repair Work Card and reviews the Implementer Report after implementation.

The Implementer implements WC08-REPAIR06 and produces the required Implementer Report.

The Operator validates WC08-REPAIR06 only after Architect review authorizes Operator validation.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC08-REPAIR06 — Current Action Architect Review Binding Authority

Base branch:
feature/phase-03-wc08-repair05-architect-review-route-binding

Target repair branch:
feature/phase-03-wc08-repair06-current-action-architect-review-binding

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08-REPAIR06_current_action_architect_review_binding_authority.md

Implement only WC08-REPAIR06.

Do not implement WC09-WC15.
Do not implement full artifact revision governance.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Fix the Architect Review screen binding so current-action target authority controls the form. For the current state, WC08-REPAIR04 and its exact Implementer Report must be bound automatically, regardless of reference-card selection.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available: feature/phase-03-wc08-repair05-architect-review-route-binding.
3. Create and switch to: feature/phase-03-wc08-repair06-current-action-architect-review-binding.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08-REPAIR06 Work Card.
7. Read WC08-REPAIR05 Work Card and Implementer Report.
8. Read WC08-REPAIR04 Work Card and Implementer Report.
9. Inspect Architect Review screen state initialization, routed current-action props, reference-card selection, Implementer Report selection, preview/save validation, and association parser behavior.

Required repair:
- Bind Architect Review screen from current action, not reference card.
- Auto-select WC08-REPAIR04 when current action target is WC08-REPAIR04.
- Auto-select IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md.
- Prevent parent WC08 report from being associated to WC08-REPAIR04 review.
- Prevent WC08-REPAIR05 reference-card selection from overriding WC08-REPAIR04 routed target.
- Preserve WC08-REPAIR05 route-to-workspace correction.
- Preserve WC08-REPAIR04 route authority and route recovery behavior.
- Add focused deterministic fixture coverage for the exact regressions.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
