<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC08-REPAIR03",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR03_pending_repair_validation_blocks_next_work_card_advancement.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR03_pending_repair_validation_blocks_next_work_card_advancement.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC08",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC08-REPAIR03 — Pending Repair Validation Blocks Next Work Card Advancement"
  },
  "payloadHash": "sha256:509ba0a71921c9ca2e7e985ff3193f76a5f4048323014628792da7d7b0f2f58b",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR03",
      "champcity-ai/phase-03/validation_report/WC08-REPAIR03"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR03"
    ],
    "sources": [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR02",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR02",
      "champcity-ai/phase-03/validation_report/WC08",
      "champcity-ai/phase-03/work_card/WC08-REPAIR01_route_context_explanation_and_correction_affordance",
      "champcity-ai/phase-03/work_card/WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance",
      "champcity-ai/phase-03/work_card/WC08_current_step_context_inspector"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC08-REPAIR03"
}
-->

# Repair Work Card: WC08-REPAIR03 — Pending Repair Validation Blocks Next Work Card Advancement

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC08 — Current Step Context Inspector
Repair ID: WC08-REPAIR03
Created: 2026-07-14

## Repair Trigger

Operator attempted to validate WC08-REPAIR02 through the application after Architect Review marked WC08-REPAIR02 ready for Operator validation.

The application did not route to WC08-REPAIR02 validation. Instead, it advanced to:

```text
WC09
Full Work Card creation required
Ad Hoc Work Card Capture
```

This makes WC08-REPAIR02 impossible to validate through the app. The Operator cannot create the proper blocked/not-tested validation record from the app because the app has already advanced past the repair.

This is the same class of routing defect previously seen when a Work Card or repair had review evidence available but the current-action evaluator advanced to the next mapped Work Card prematurely.

## Source Evidence

- Operator screenshot in chat showing app routed to WC09 / Full Work Card creation required / Ad Hoc Work Card Capture.
- Current branch: `feature/phase-03-wc08-repair02-report-review-protocol`
- WC08-REPAIR02 Architect Review exists and is ready for Operator validation.
- WC08-REPAIR02 Operator validation record does not exist yet.

Relevant artifacts:

- `planning/phases/phase-03/Work_Cards/WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC08-REPAIR02_report_review_protocol_and_validation_disposition_governance.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08_current_step_context_inspector.md`
- `planning/phases/phase-03/Work_Cards/WC08-REPAIR01_route_context_explanation_and_correction_affordance.md`

## Human Problem

The Operator must be able to validate the repair Work Card that the Architect has just approved for Operator validation.

The application currently skips that step and routes to the next Work Card candidate. That makes the workflow untrustworthy because it allows unresolved repair validation to be bypassed.

## Repair Goal

Repair the current-action evaluator so unresolved repair validation blocks advancement to the next mapped Work Card.

The app must route to WC08-REPAIR02 validation when the repair chain has:

- a repair Work Card artifact;
- a repair Implementer Report;
- an Architect Review indicating ready for Operator validation;
- no passing/accepted repair validation record.

The app must not advance to WC09 until WC08 and its repair chain are actually resolved by Architect/Operator evidence.

## Required Routing Rule

If a Work Card or repair has unresolved validation obligations, it is not complete.

A repair validation obligation is unresolved when all of these are true:

1. A repair Work Card exists.
2. A repair Implementer Report exists.
3. A repair Architect Review exists and indicates ready for Operator validation.
4. No repair validation report exists with a final accepted/pass/mergeable Architect disposition or equivalent resolved state.

When those conditions are present, the current action must be:

```text
repair_validation_required
```

or the current app’s equivalent routed Human Validation state for the repair.

The app must not route to:

```text
full_work_card_creation_required
```

for the next planned Work Card.

## Required WC08-REPAIR02 Specific Behavior

Given current Phase 03 state, the app must route to:

```text
Work Card: WC08-REPAIR02
Current action: repair_validation_required or Operator validation required for repair
Routed screen: Human Validation
Expected output: validation report for WC08-REPAIR02
```

It must not route to:

```text
Work Card: WC09
Current action: full_work_card_creation_required
Routed screen: Ad Hoc Work Card Capture
```

## Architect Disposition Compatibility

WC08-REPAIR02 changed validation-report governance so new validation reports carry:

```text
Architect Disposition: Pending Architect review
```

This repair must preserve that governance while fixing routing.

Rules:

- Pending Architect disposition is unresolved and cannot complete the route.
- Missing repair validation is unresolved and cannot complete the route.
- Legacy Operator Decision remains advisory only.
- The evaluator must not treat `Validation Result: Pass` alone as sufficient if Architect disposition is pending or absent in a repair-validation context created after WC08-REPAIR02.
- The evaluator must not treat the existence of a generated repair prompt as resolution.
- The evaluator must not treat existence of the next Work Card candidate as higher priority than unresolved repair validation.

## Current WC08-REPAIR01 Handling Rule

WC08-REPAIR01 remains paused. Do not implement WC08-REPAIR01 route-context explanation changes in this pass.

The only goal of this pass is to make the application route correctly so WC08-REPAIR02 can be validated.

## Out Of Scope

- Do not implement WC08-REPAIR01.
- Do not implement WC09-WC15.
- Do not create WC09.
- Do not modify the Work Card Plan.
- Do not create or fake a WC08-REPAIR02 validation report.
- Do not mark WC08-REPAIR02 as passed.
- Do not alter historical validation reports except through read-compatible parsing if needed.
- Do not redesign the UI.
- Do not add provider SDKs, database, cloud, auth, deployment, MCP, connector, or external integration changes.
- Do not perform Operator validation.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- Current-action evaluation routes to WC08-REPAIR02 validation instead of WC09 creation when WC08-REPAIR02 has Architect Review ready for Operator validation and lacks repair validation.
- The routed workspace is Human Validation, not Ad Hoc Work Card Capture.
- The current-action panel identifies WC08-REPAIR02 or equivalent repair validation target, not WC09.
- The expected output is a WC08-REPAIR02 validation record.
- Pending Architect disposition remains unresolved and does not complete a Work Card or repair.
- Legacy Operator Decision remains advisory only.
- Next Work Card candidate advancement is blocked until unresolved repair validation is completed.
- Existing WC04/WC05/WC06/WC07 behavior remains intact.
- WC08-REPAIR02 report-governance changes remain intact.
- WC08-REPAIR01 remains unimplemented.
- WC09-WC15 behavior does not appear.
- Focused fixture coverage exists for the exact regression: unresolved WC08-REPAIR02 validation must block WC09 advancement.
- WC08-REPAIR03 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run approved normal Windows validation lanes.
- Run type/build validation.
- Run current-action-only fixture validation.
- Add focused fixture coverage for WC08-REPAIR02 pending validation blocking WC09.
- Run WC08 report-protocol fixture if affected.
- Run WC04/WC05/WC06/WC07 preservation fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR03_pending_repair_validation_blocks_next_work_card_advancement.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- root cause of premature WC09 advancement;
- how unresolved repair validation now blocks next Work Card creation;
- how WC08-REPAIR02 routes to Human Validation;
- how pending Architect disposition remains unresolved;
- how legacy Operator Decision remains advisory only;
- confirmation WC08-REPAIR01 and WC09-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC08-REPAIR03 — Pending Repair Validation Blocks Next Work Card Advancement

Base branch:
feature/phase-03-wc08-repair02-report-review-protocol

Target repair branch:
feature/phase-03-wc08-repair03-pending-repair-validation-routing

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08-REPAIR03_pending_repair_validation_blocks_next_work_card_advancement.md

Implement only WC08-REPAIR03.

Do not implement WC08-REPAIR01.
Do not implement WC09-WC15.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Fix the current-action evaluator so pending repair validation blocks advancement to the next Work Card. The app currently routes to WC09 / Ad Hoc Work Card Capture even though WC08-REPAIR02 still requires Operator validation. This must be repaired before WC08-REPAIR02 can be validated through the app.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available:
   feature/phase-03-wc08-repair02-report-review-protocol
3. Create and switch to:
   feature/phase-03-wc08-repair03-pending-repair-validation-routing
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08-REPAIR03 Work Card.
7. Read WC08-REPAIR02 Work Card, Implementer Report, and Architect Review.
8. Read the WC08 validation report and the WC08-REPAIR01 Work Card to understand unresolved parent repair state.
9. Inspect current-action evaluation, validation disposition parsing, repair state parsing, current-action fixtures, workflow visibility, and Human Validation routing.

Required repair:
- Route unresolved WC08-REPAIR02 to Human Validation.
- Block WC09 creation while WC08-REPAIR02 lacks repair validation.
- Keep pending Architect disposition unresolved.
- Keep legacy Operator Decision advisory only.
- Add focused fixture coverage for this exact regression.
- Preserve WC08-REPAIR02 report-governance behavior.
- Preserve WC04/WC05/WC06/WC07 behavior.
- Do not implement WC08-REPAIR01.
- Do not implement WC09-WC15.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
