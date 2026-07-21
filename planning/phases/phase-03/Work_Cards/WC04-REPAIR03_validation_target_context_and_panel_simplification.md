<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC04-REPAIR03_validation_target_context_and_panel_simplification",
  "artifactType": "work_card",
  "createdAt": "2026-07-13T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC04-REPAIR03_validation_target_context_and_panel_simplification.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC04-REPAIR03_validation_target_context_and_panel_simplification.md",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC04-REPAIR03 — Validation Target Context and Panel Simplification"
  },
  "payloadHash": "sha256:d3cef6a6cbb1b9320cf8082ec815713126eccf63256d78f16529e98ae8540afb",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC04-REPAIR03",
      "champcity-ai/phase-03/implementer_report/WC04-REPAIR03",
      "champcity-ai/phase-03/operator_validation/WC04-REPAIR03",
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

# Repair Work Card: WC04-REPAIR03 — Validation Target Context and Panel Simplification

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC04 — Primary Current Action Panel
Parent Repair Chain: WC04-REPAIR01, WC04-REPAIR02
Repair ID: WC04-REPAIR03
Created: 2026-07-13

## Repair Trigger

WC04-REPAIR01 received a partial validation result and failed Operator decision after WC04-REPAIR02 corrected the durable routing gate.

Primary validation source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`

Supporting sources:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC04_primary_current_action_panel.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC04-REPAIR01_validation_flow_and_current_action_panel_usability.md`
- `planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04-REPAIR02_repair_validation_routing_gate.md`
- `planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC04-REPAIR02_repair_validation_routing_gate.md`

## Validation Result Being Repaired

The Operator operator validation for WC04-REPAIR01 records:

- Validation Result: `Partial`
- Operator Decision: `Failed - repair needed`

Items that passed and must be preserved:

- deferred WC04 validation does not count as passed;
- current action does not advance to WC05;
- validation text survives navigation;
- warning/info text wraps;
- screenshot paste or fallback works.

Items that failed and must be repaired:

- current action opens the Repair screen, but the Validation Target dropdown selects WC01 instead of WC04-REPAIR01;
- the checklist still does not use Architect guidance correctly;
- prior targets still show as not validated;
- right context panel still appears duplicative and likely should be removed or materially simplified.

Additional Operator observations to address where feasible:

- screenshot messaging is too verbose;
- screenshot paste records a full file path when the Operator would prefer a small preview similar to ChatGPT;
- supporting screens dropdown is redundant to the action bar;
- Architect guidance may require a durable artifact or better extraction path if the app is expected to load it directly.

## Problem

WC04-REPAIR01 improved several usability issues, and WC04-REPAIR02 fixed the durable routing gate, but the validation workflow still misdirects the Operator at the critical handoff point.

When the current routed action is repair validation, the Validation screen must select the active repair target by default, not an old Work Card such as WC01. Prior validation targets must show real status/report context. Checklist guidance must come from Architect-authored guidance where available or from a durable Architect Review artifact, not from an unsuitable Implementer checklist. The right context area must stop repeating the same conceptual information as the left current-action panel.

## Goal

Repair the remaining validation workflow defects so the Operator can validate WC04-REPAIR01 without being routed to the wrong validation target, without losing status context, and without reading duplicated or misleading UI regions.

## Branch And Review Rule

Base branch for this repair:

- `feature/phase-03-wc04-repair02-routing-gate`

Repair implementation branch:

- `feature/phase-03-wc04-repair03-validation-target-context`

The Implementer must create the repair branch from the current WC04-REPAIR02 branch. Do not merge to `dev`. Do not push to `master`. Architect review happens after the repair branch and repair Implementer Report are pushed.

## Included Scope

### 1. Default Validation Target to the active routed repair target

When the current action is `repair_validation_required` for `WC04-REPAIR01`, the Validation Target dropdown must default to `WC04-REPAIR01`, not WC01 or another stale target.

The implementation must use current-action state and/or durable repair route evidence to identify the active target. If the active target exists in the target list, it must be selected on initial load for that validation context.

Do not hard-code only WC04-REPAIR01 as a special-case string. Implement a generic route-driven target selection rule for the active Work Card or repair Work Card.

### 2. Preserve manual target selection after initial route alignment

After the routed target is selected once, the Operator may still manually choose another target to review history. Manual choice must not be immediately overwritten on every render or refresh.

Acceptable rule:

- route-select the active target on first load or when the current-action target changes;
- then preserve Operator manual selection until the routed target changes or the Operator explicitly refreshes/reselects.

### 3. Fix prior validation target status/report context

Prior targets must not all show `not validated` when durable validation reports exist.

For each target where validation records exist, show at least:

- effective status or decision: passed, failed, partial, blocked, deferred, not validated;
- raw validation result when useful;
- Operator decision when available;
- associated report filename;
- timestamp when available.

If multiple records exist for a target, prefer the newest durable operator validation by timestamp or deterministic filename/date ordering.

### 4. Fix Architect guidance source behavior

The validation checklist must prefer Architect-authored guidance when available. If Architect guidance is not available as a durable artifact for the selected target, the UI must say so plainly rather than pretending the Implementer checklist is Architect guidance.

Required source order:

1. Architect Review Operator validation guidance / Manual validation required section.
2. Repair Work Card acceptance criteria or validation expectations.
3. Parent Work Card acceptance criteria or validation expectations.
4. Implementer Report manual validation section only as a clearly labeled fallback.

If no Architect Review guidance exists because a conversation note was never made durable, the UI must state:

`No durable Architect validation guidance found for this target. Showing fallback guidance.`

Do not rely on non-durable chat context.

### 5. Simplify or remove the redundant right context panel

The right context panel must not mirror the left current-action panel.

Acceptable approaches:

- remove the right context panel for the validation workflow if it is redundant;
- collapse it by default and label it as `Evidence details`;
- or replace it with a distinct compact evidence/status index only.

It must not repeat primary action title, reason, fallback text, or the same warning hierarchy already displayed on the left.

### 6. Reduce screenshot evidence verbosity

Do not regress screenshot paste/import behavior that already passed, but reduce unnecessary instructional noise.

At minimum:

- reduce verbose screenshot messaging;
- make attached screenshot evidence easier to scan;
- avoid showing full local file-system-style paths when a repo-relative path or concise filename is sufficient.

Preferred behavior:

- show a small preview/thumbnail for pasted or attached screenshot evidence when feasible without adding heavy dependencies;
- otherwise show concise attachment cards with filename and repo-relative path.

Do not broaden renderer filesystem access or add a heavy media-management dependency.

### 7. Remove or reduce redundant Supporting Screens dropdown

The Operator observed that the Supporting Screens dropdown is redundant to the action bar.

For this repair, either:

- remove it where the action bar already provides the same navigation;
- collapse it into an advanced/supporting control;
- or clearly distinguish why it exists.

Do not remove the ability to reach existing support screens.

## Out Of Scope

- Do not implement WC05 or later Work Cards.
- Do not perform a full screen-by-screen UI redesign.
- Do not change the durable WC02 routing evaluator unless a narrow bug is directly necessary for active target selection.
- Do not undo WC04-REPAIR02 routing gate behavior.
- Do not create Operator validation records.
- Do not close Phase 03.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not add provider SDKs, cloud services, browser automation, auth, database, or LLM API integrations.

## Acceptance Criteria

- When current action is `repair_validation_required` for a repair Work Card, the Human Validation target defaults to that active repair target.
- WC04-REPAIR01 is selected by default when validating the current WC04 repair path.
- Manual validation target selection remains possible after initial route alignment.
- Prior validation targets show durable report/result/decision context when available.
- Deferred, partial, failed, blocked, and passed targets are distinguishable in the UI.
- The checklist source is clearly identified.
- Architect Review guidance is used when durable guidance exists.
- If Architect guidance is missing, the UI clearly says fallback guidance is being used.
- The right context panel is removed, collapsed, or materially changed so it is not a duplicate of the left current-action panel.
- Screenshot evidence UI is less verbose and displays attached screenshots as concise evidence entries; thumbnail preview is preferred if feasible.
- Supporting screen navigation remains available but is no longer presented as a redundant confusing dropdown where the action bar already provides equivalent navigation.
- Previously passed WC04-REPAIR01 behavior remains intact: draft preservation, warning wrapping, screenshot paste/fallback, and routing gate behavior.
- WC05 is not implemented or selected prematurely.
- Automated validation passes or skipped checks are documented.
- WC04-REPAIR03 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run the normal Windows validation lane.
- Run TypeScript/type validation and build validation.
- Run focused validation target selection/status fixture checks if a testable path exists.
- Run current-action fixture validation if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC04-REPAIR03_validation_target_context_and_panel_simplification.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- how route-driven validation target selection was implemented;
- how manual target selection is preserved;
- how prior target validation status/report context is determined;
- how checklist source precedence and missing Architect guidance are handled;
- what was done to remove/simplify the right context panel;
- what was done to simplify screenshot evidence display;
- what was done to reduce redundant supporting-screen navigation;
- confirmation WC05-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC04-REPAIR03 — Validation Target Context and Panel Simplification

Base branch:
feature/phase-03-wc04-repair02-routing-gate

Target repair branch:
feature/phase-03-wc04-repair03-validation-target-context

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC04-REPAIR03_validation_target_context_and_panel_simplification.md

Implement only WC04-REPAIR03. Do not implement WC05. Do not merge to dev. Do not push to master.

Primary objective:
Repair the remaining failed WC04-REPAIR01 validation items: active repair target selection, prior validation target status/report context, Architect guidance/fallback clarity, right context panel duplication, screenshot evidence verbosity/display, and redundant supporting-screen navigation.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available.
3. Create and switch to feature/phase-03-wc04-repair03-validation-target-context from feature/phase-03-wc04-repair02-routing-gate.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read the WC04-REPAIR01 operator validation.
7. Read WC04-REPAIR02 Implementer Report and Architect Review.
8. Inspect validation target loading, operator validation loading, checklist source selection, WorkflowRouterShell, and screenshot evidence UI code.

When complete:
- run required validation;
- stage only WC04-REPAIR03-scoped files;
- commit to the repair branch;
- push the repair branch to origin;
- create the required Implementer Report;
- include commit hash, push status, validation results, skipped checks, remaining dirty files, and confirmation that dev/master were not touched in the final response.

## Document Disposition
Document.Status=Pending
