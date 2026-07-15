<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC04-REPAIR02_repair_validation_routing_gate",
  "artifactType": "work_card",
  "createdAt": "2026-07-12T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC04-REPAIR02_repair_validation_routing_gate.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC04-REPAIR02_repair_validation_routing_gate.md",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC04-REPAIR02 — Repair Validation Routing Gate"
  },
  "payloadHash": "sha256:462cda69f0edcd6ceb4323899d10f5ae95bffdecff80759c9f756f054485bac4",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC04-REPAIR02",
      "champcity-ai/phase-03/architect_review/WC04-REPAIR03",
      "champcity-ai/phase-03/implementer_report/WC04-REPAIR02",
      "champcity-ai/phase-03/implementer_report/WC04-REPAIR03",
      "champcity-ai/phase-03/validation_report/WC04-REPAIR02",
      "champcity-ai/phase-03/work_card/WC05"
    ],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "historical",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Repair Work Card: WC04-REPAIR02 — Repair Validation Routing Gate

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC04 — Primary Current Action Panel
Parent Repair: WC04-REPAIR01 — Validation Flow and Current Action Panel Usability
Repair ID: WC04-REPAIR02
Created: 2026-07-12

## Repair Trigger

Architect review of WC04-REPAIR01 found a blocking durable-routing defect before Operator validation.

The WC04-REPAIR01 Implementer Report states that the live repo-backed current-action diagnostic returns:

- `phase-03`
- `WC05`
- `full_work_card_creation_required`

That route is incorrect while WC04 has a deferred Operator decision and WC04-REPAIR01 has not received Operator repair validation.

Primary source:

- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`

Supporting sources:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04_primary_current_action_panel.md`
- `planning/phases/phase-03/Work_Cards/WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`
- `src/shared/workCards/currentRequiredAction.ts`
- `scripts/verify-work-card-fixture.mjs`

## Problem

The durable workflow router is advancing to WC05 even though WC04 is not durably resolved.

The WC04 validation report is contradictory at the raw field level:

- validation result says `Pass`
- Operator decision says `Deferred - not validated yet`

The Operator decision must control the durable route. A deferred validation is not a passing validation. It must keep the parent Work Card unresolved and route to repair/repair validation as appropriate.

Once a repair Work Card and repair Implementer Report exist, but no repair validation record exists, the current action must route to repair validation rather than the next Work Card candidate.

## Goal

Fix current-action routing so unresolved Work Cards and unresolved repair routes cannot be skipped.

After WC04-REPAIR02, the live current action for the current durable repo state must not advance to WC05 until WC04 or the active repair route has a passing Operator validation decision.

## Branch And Review Rule

Base branch for this repair:

- `feature/phase-03-wc04-repair01-validation-flow`

Repair implementation branch:

- `feature/phase-03-wc04-repair02-routing-gate`

The Implementer must create the repair branch from the current WC04-REPAIR01 feature branch. Do not merge to `dev`. Do not push to `master`. Architect review happens after the pushed repair branch and Implementer Report are available.

## Included Scope

### 1. Treat deferred validation as unresolved

Update current-action validation interpretation so `Deferred`, `Deferred - not validated yet`, or equivalent Operator decisions do not count as passing validation even if the raw validation result says `Pass`.

The following decisions/results must keep the Work Card unresolved unless a later passing validation supersedes them:

- deferred
- not validated yet
- failed
- fail
- blocked
- partial
- repair required
- rejected

### 2. Operator decision must take precedence over raw result

When validation result and Operator decision conflict, use the Operator decision for routing.

Example:

- raw result: `Pass`
- Operator decision: `Deferred - not validated yet`
- effective route result: unresolved / not passed

### 3. Route unresolved repair implementation to repair validation

If a repair Work Card exists and a repair Implementer Report exists, but no repair validation record exists, the current action should be repair validation required.

For the current WC04-REPAIR01 durable state, the expected current action after this repair is a repair-validation route for WC04-REPAIR01 or an equivalent unresolved repair validation state. It must not be WC05.

### 4. Preserve WC04-REPAIR01 UI fixes

Do not revert or bypass WC04-REPAIR01 implementation work. This Work Card fixes routing gate logic and related fixture coverage only.

### 5. Add fixture coverage

Add or update targeted fixture coverage proving:

- deferred Operator decision does not pass;
- raw Pass plus deferred Operator decision does not pass;
- failed/blocked/partial decisions do not pass;
- repair Work Card plus repair Implementer Report without repair validation routes to repair validation;
- next Work Card candidate is not selected until parent Work Card or repair route has a passing validation decision.

## Out Of Scope

- Do not implement WC05.
- Do not create WC05 Work Card behavior.
- Do not perform Operator validation.
- Do not create Operator validation records.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not redesign the UI.
- Do not broaden renderer filesystem access.
- Do not add dependencies, provider SDKs, cloud services, browser automation, auth, database, connector, or LLM API integrations.

## Acceptance Criteria

- A validation report with raw `Pass` but Operator decision `Deferred - not validated yet` is not treated as passing.
- Deferred, failed, blocked, partial, rejected, and repair-required outcomes keep the Work Card unresolved.
- The router does not advance WC04 to WC05 while WC04-REPAIR01 lacks passing repair validation.
- The current durable repo state routes to WC04-REPAIR01 repair validation or an equivalent repair-validation-required state, not WC05.
- WC04-REPAIR01 UI changes remain intact.
- Targeted fixture coverage exists for the deferred/raw-pass conflict.
- Targeted fixture coverage exists for repair-report-without-repair-validation routing.
- Existing validation and build commands pass or skipped checks are documented.
- WC04-REPAIR02 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run current-action fixture validation.
- Run any new targeted WC04-REPAIR02 fixture script.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04-REPAIR02_repair_validation_routing_gate.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- how deferred validation is interpreted;
- how Operator decision precedence is enforced;
- how repair validation routing is determined;
- live current-action result after the repair;
- fixture/test coverage added or updated;
- confirmation WC05 was not implemented;
- confirmation WC04-REPAIR01 UI fixes were preserved;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC04-REPAIR02 — Repair Validation Routing Gate

Base branch:
feature/phase-03-wc04-repair01-validation-flow

Target repair branch:
feature/phase-03-wc04-repair02-routing-gate

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC04-REPAIR02_repair_validation_routing_gate.md

Implement only WC04-REPAIR02.

Do not implement WC05.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Fix durable current-action routing so deferred parent validation and unresolved repair validation cannot be skipped. The current repo state must not route to WC05 while WC04-REPAIR01 lacks passing repair validation.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available: feature/phase-03-wc04-repair01-validation-flow.
3. Create and switch to: feature/phase-03-wc04-repair02-routing-gate.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC04 deferred validation report.
7. Read the WC04-REPAIR01 Implementer Report and Architect Review.
8. Inspect current-action routing code and fixture validation code.

Required repairs:
1. Treat deferred/not-validated Operator decisions as unresolved, even if raw validation result says Pass.
2. Make Operator decision override raw result when they conflict.
3. Route repair Work Card plus repair Implementer Report but no repair validation to repair validation required.
4. Prevent WC05 routing until WC04 or its active repair route has a passing Operator validation decision.
5. Add targeted fixture coverage for these routing gates.

When complete:
- run required validation;
- stage only WC04-REPAIR02-scoped files;
- commit to the repair branch;
- push the repair branch to origin;
- create the required Implementer Report;
- include commit hash, push status, validation results, skipped checks, remaining dirty files, and confirmation that dev/master were not touched in the final response.
