<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC08-REPAIR04",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC08",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority"
  },
  "payloadHash": "sha256:968063f8b3a253f84d68037b794f46a0838d798c497a47fd7c9c318425f296b1",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC08-REPAIR06",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR05",
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR06",
      "champcity-ai/phase-03/work_card/WC08-REPAIR05",
      "champcity-ai/phase-03/work_card/WC08-REPAIR06"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC08-REPAIR04"
    ],
    "sources": [
      "champcity-ai/phase-03/validation_report/WC08-REPAIR01",
      "champcity-ai/phase-03/work_card/WC08-REPAIR01_route_context_explanation_and_correction_affordance"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC08-REPAIR04"
}
-->

# Repair Work Card: WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC08 — Current Step Context Inspector
Repair ID: WC08-REPAIR04
Created: 2026-07-14

## Repair Trigger

WC08-REPAIR01 received a Partial Human Validation result.

Primary validation source:

- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_route_context_explanation_and_correction_affordance.md`
- `planning/phases/phase-03/Validation_Reports/VALIDATION_REPORT_WC08-REPAIR01_route_context_explanation_and_correction_affordance.json`

Referenced validation evidence:

- `planning/phases/phase-03/Validation_Evidence/WC08-REPAIR01_route_context_explanation_and_correction_affordance/image.png`
- `planning/phases/phase-03/Validation_Evidence/WC08-REPAIR01_route_context_explanation_and_correction_affordance/image_2.png`
- `planning/phases/phase-03/Validation_Evidence/WC08-REPAIR01_route_context_explanation_and_correction_affordance/image_3.png`

The Operator confirmed that the WC08-REPAIR01 implementation improved the Route Context layout, tab order, plain-language hierarchy, and diagnostic placement, but failed on route authority, evidence accuracy, and usable in-app recovery.

## Operator Validation Result

Validation Result: `Partial`

Failed items:

1. The app did not open to the current unresolved WC08 repair obligation and instead opened to Phase 03 WC01. The Operator could manually move to WC08-REPAIR01 for validation, but the routed current action was wrong.
2. The explanation did not accurately identify evidence already on record.
3. The explanation did not accurately identify missing or pending evidence/disposition.
4. `This route looks wrong` guidance was confusing and not useful.
5. The copyable Architect/LLM handoff model is not an adequate product workflow for an end user.
6. The route-correction affordance did not provide a usable in-app path to move toward the correct next action.

## Human Problem

The Operator must be able to trust the app's current-action route and recover from a wrong route without leaving the application or relying on a prompt to an Architect/LLM.

WC08-REPAIR01 made the explanation more readable, but the app still selected the wrong route after the accepted WC08-REPAIR02 and WC08-REPAIR03 validation/disposition sequence. It also showed incorrect or ambiguous evidence state and provided guidance that is not useful outside the development cycle.

A production end user cannot be expected to copy a prompt to an Architect or LLM to repair routing. The application needs a controlled in-app recovery path that captures the routing concern as durable workflow evidence and routes that concern to the correct Architect disposition process.

## Repair Goal

Repair WC08 route context and recovery behavior so the app:

1. Opens to the actual controlling unresolved WC08 repair obligation.
2. Correctly distinguishes accepted evidence, pending Architect disposition, missing evidence, stale evidence, superseded evidence, and non-controlling duplicate evidence.
3. Provides an in-application controlled route recovery path when the Operator believes the route is wrong.
4. Preserves WC08-REPAIR01's passed layout improvements.
5. Does not create an unrestricted Operator override.
6. Does not advance to WC09 while WC08 repair-chain obligations remain unresolved.

## Current Expected Route State

Given the current Phase 03 state after WC08-REPAIR02 and WC08-REPAIR03 were reviewed and validated, the application must not open to Phase 03 WC01 and must not open to WC09.

The current action must resolve to the earliest controlling unresolved WC08 repair-chain obligation. Based on the current known workflow, this should be WC08-REPAIR01 validation/disposition or the next Architect-controlled repair action created from its failed validation, depending on whether the app is evaluating before or after this WC08-REPAIR04 Work Card is introduced.

The implementer must not hard-code this specific state. The route must be derived from durable evidence and current-action evaluation rules.

## Required Repair

### 1. Correct route authority and current-action selection

Fix current-action evaluation so the application opens to the actual controlling unresolved WC08 repair obligation.

The app must not route to:

- stale Phase 03 WC01 state;
- a superseded or historical route;
- WC09 creation; or
- any later Work Card while WC08 repair-chain obligations remain unresolved.

The evaluator must use durable evidence authority, not filename order or broad file existence alone.

### 2. Reconcile accepted WC08-REPAIR02 and WC08-REPAIR03 state

The evaluator must correctly interpret:

- WC08-REPAIR02 Implementer Report;
- WC08-REPAIR02 Architect Review;
- WC08-REPAIR02 validation reports, including the amended `_2` validation report;
- WC08-REPAIR03 Implementer Report;
- WC08-REPAIR03 validation report;
- Architect dispositions already provided in Architect review output; and
- any pending or missing durable disposition record.

If the application lacks a durable place to store final Architect acceptance after reviewing a validation report, the route model must expose that as the missing/pending evidence instead of selecting an unrelated stale route.

Do not implement the full artifact authority/revision governance model from PH03-OBS-010 / PROJ-OBS-007 in this pass unless the minimum route fix requires a narrow authoritative-selection adapter for current-action evaluation. If a narrow adapter is needed, document its limitations and leave the broader architecture observation open.

### 3. Fix route evidence explanation accuracy

The `Why this is the current action` explanation must accurately classify evidence into these groups:

- Evidence already accepted / controlling.
- Evidence present but pending Architect disposition.
- Evidence missing and required next.
- Evidence stale, historical, superseded, or non-controlling.
- Duplicate evidence that cannot be treated as authoritative without explicit authority.

The explanation must not tell the Operator that evidence is missing when it exists but is pending disposition, duplicated, superseded, or not yet authoritatively selected.

The explanation must not imply a route is correct when the evaluator is relying on stale or ambiguous records.

### 4. Replace prompt-style route correction with controlled in-app recovery

Replace or materially revise `This route looks wrong` so it provides an in-app recovery path.

The recovery path may be non-mutating until submission, but it must provide an actionable in-app workflow, not merely a copyable prompt.

Minimum acceptable behavior:

- The Operator can open a `This route looks wrong` / `Request route review` affordance.
- The app displays the currently selected route, expected controlling evidence, missing/pending evidence, and any ambiguity warnings.
- The Operator can prepare or submit a route review request inside the application.
- If writing durable recovery records is not yet available in this screen, the app must route the Operator to the correct existing in-app screen that can create the needed review/repair record.
- The recovery path must create or guide creation of a durable route-review request artifact, or explicitly identify the existing artifact/action that must be created next.

The recovery path must not:

- mark work complete;
- skip validation;
- approve Architect disposition;
- silently change the current route;
- create fake validation/acceptance evidence;
- advance to WC09; or
- provide unrestricted Operator override.

### 5. Add route ambiguity warnings

If duplicate validation reports, competing repair states, or missing durable Architect disposition records create ambiguity, the app must state this clearly in Route Context and route recovery guidance.

The warning must be understandable to the Operator and must identify what role owns resolution. For example:

- Operator reports route concern.
- Architect reviews and decides controlling evidence/disposition.
- Implementer repairs evaluator or artifact model if needed.

### 6. Preserve WC08-REPAIR01 passed behavior

Preserve all behavior that passed WC08-REPAIR01 validation:

- Default tab is `Complete current action`.
- Tab order is `Complete current action`, `Artifacts`, `Why this step?`.
- `Why this is the current action` is the first major section.
- Explanation remains plain-language.
- It explains why the action comes before later work.
- It explains why the app has not advanced.
- `What happens next` remains visible.
- `What would change this route` remains visible.
- `Detailed route diagnostics` remains secondary/collapsed.
- Raw paths, IDs, warnings, and capability details remain secondary.
- Artifacts remains the only artifact list/preview surface.
- Left Current Action panel remains compact.
- Supporting/reference screens suppress the full Route Context inspector.
- WC08-REPAIR02 governance remains intact.
- WC08-REPAIR03 routing still prevents premature WC09 advancement.

## Carried-Forward Observations Included

### PH03-OBS-009 / PROJ-OBS-006 — Controlled route recovery is needed when current-action routing is wrong or blocks validation

- Included because WC08-REPAIR01 validation proved the existing prompt-style route guidance is not enough.
- Acceptance impact: This pass must provide a controlled in-application recovery path or route to an existing in-app recovery artifact/action.

### PH03-OBS-010 / PROJ-OBS-007 — Artifact authority and revision governance is undefined

- Included as a constraint, not full implementation scope.
- Acceptance impact: This pass must not rely on filename suffixes, filesystem ordering, or timestamps as implicit authority. If duplicate artifacts affect route selection, the app must warn or use a narrow, documented current-action authority rule. Broader artifact revision governance remains open.

### PH03-OBS-001 / PROJ-OBS-001 — Validation checklist should become editable / structured

- Included as a validation-output quality constraint.
- Acceptance impact: The Implementer Report must provide concrete Operator validation steps that test observable behavior and item-level acceptance criteria, not broad setup/navigation instructions.

## Out of Scope

- Do not implement WC09-WC15.
- Do not create WC09.
- Do not create a general unrestricted route override system.
- Do not implement the full project-wide artifact revision governance model from PH03-OBS-010 / PROJ-OBS-007.
- Do not redesign the whole workflow rail or Supporting Tools menu.
- Do not add another artifact browser.
- Do not add a permanent left-panel inspector.
- Do not mark any Work Card, repair, validation report, or Architect disposition as accepted.
- Do not perform Operator validation.
- Do not merge to `dev`.
- Do not push to `master`.

## Acceptance Criteria

- The app opens to the actual controlling unresolved WC08 repair-chain obligation and does not open to stale Phase 03 WC01.
- WC09 remains blocked while WC08 repair-chain obligations are unresolved.
- The current-action evaluator correctly interprets accepted, pending, missing, stale, superseded, and duplicate repair-chain evidence.
- WC08-REPAIR02 and WC08-REPAIR03 accepted/validated state is not regressed.
- The Route Context explanation accurately identifies evidence already on record.
- The Route Context explanation accurately identifies missing or pending evidence/disposition.
- Present-but-pending evidence is not incorrectly described as missing.
- Duplicate or ambiguous validation evidence is surfaced as an ambiguity warning rather than silently treated as authoritative.
- `This route looks wrong` or equivalent provides a controlled in-app route review/recovery path.
- The recovery path is useful to an end user and does not rely primarily on copying a prompt to an Architect or LLM.
- The recovery path does not mutate durable workflow state unless creating an explicit route-review request artifact or routing to an existing app-owned recovery action.
- The recovery path does not approve, validate, skip, complete, or advance workflow state.
- WC08-REPAIR01's passed layout and anti-clutter behavior is preserved.
- Artifacts remains the only artifact list/preview surface.
- Supporting/reference screens do not show the full Route Context inspector.
- Focused fixture coverage exists for the stale-WC01 routing regression and the controlled route-recovery affordance.
- WC08-REPAIR04 Implementer Report exists.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` before validation.
- Run approved normal Windows validation lanes.
- Run TypeScript/type validation and production build validation.
- Run current-action-only fixture validation.
- Add focused fixture coverage for the exact regression: the app must not open stale Phase 03 WC01 when a later WC08 repair-chain obligation controls.
- Add focused fixture coverage for route evidence classification accuracy.
- Add focused fixture coverage for the route-recovery affordance proving it is useful, in-app, and governed.
- Run WC08-REPAIR01 route-context explanation fixture if maintained or updated.
- Run WC08-REPAIR02 report-protocol fixture.
- Run WC08-REPAIR03 pending-repair routing fixture.
- Run WC07 artifact workspace fixture if affected.
- Run WC04/WC05/WC06 preservation fixtures if affected.
- Run local safety scans before staging.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md`

The report must include:

- repair branch name;
- implementation summary;
- files changed;
- root cause of stale WC01 route selection;
- how current-action authority now selects the correct unresolved WC08 repair-chain obligation;
- how accepted, pending, missing, stale, superseded, duplicate, and ambiguous evidence are classified;
- how route explanation accuracy was repaired;
- how controlled route recovery works inside the application;
- what durable artifact/action the recovery path creates or routes to;
- how unrestricted Operator override is prevented;
- how WC08-REPAIR01 passed layout behavior was preserved;
- how WC08-REPAIR02 and WC08-REPAIR03 behavior was preserved;
- confirmation WC09-WC15 were not implemented;
- validation commands and results;
- skipped checks and reasons;
- safety scan results;
- remaining dirty/untracked files;
- final recommended next action using role-owned language.

## Next Action Ownership

The Architect creates this repair Work Card and reviews the Implementer Report after implementation.

The Implementer implements WC08-REPAIR04 and produces the required Implementer Report.

The Operator validates WC08-REPAIR04 only after Architect review authorizes Operator validation.

## Implementer Handoff Prompt

You are acting as Implementer for ChampCity A/I.

Repair Work Card:
WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority

Base branch:
feature/phase-03-wc08-repair01-route-context-explanation

Target repair branch:
feature/phase-03-wc08-repair04-controlled-route-recovery

Expected remote:
ChampCityChris/ChampCity_AI

Use this Repair Work Card as the source of truth:
planning/phases/phase-03/Work_Cards/WC08-REPAIR04_controlled_route_recovery_and_accurate_route_evidence_authority.md

Implement only WC08-REPAIR04.

Do not implement WC09-WC15.
Do not implement full artifact revision governance.
Do not merge to dev.
Do not push to master.
Do not perform Operator validation.

Primary objective:
Fix current-action routing and Route Context recovery so the app selects the actual controlling unresolved WC08 repair-chain obligation, accurately explains route evidence, and gives the Operator a controlled in-application route review/recovery path when the route is wrong.

Before editing:
1. Confirm current repo and remote.
2. Confirm the base branch is available: feature/phase-03-wc08-repair01-route-context-explanation.
3. Create and switch to: feature/phase-03-wc08-repair04-controlled-route-recovery.
4. Read AGENTS.md.
5. Read docs/dev/VALIDATION_COMMAND_LANES.md.
6. Read this WC08-REPAIR04 Work Card.
7. Read the WC08-REPAIR01 validation report and evidence paths.
8. Read WC08, WC08-REPAIR01, WC08-REPAIR02, and WC08-REPAIR03 Work Cards, Implementer Reports, Architect Reviews, and Validation Reports.
9. Read the Phase and Project Observation Registers.
10. Inspect current-action evaluation, repair-chain discovery, validation/disposition parsing, duplicate validation handling, route context generation, and WorkflowRouterShell route recovery UI.

Required repair:
- Fix stale WC01 route selection.
- Keep WC09 blocked while WC08 repair-chain obligations remain unresolved.
- Accurately classify accepted, pending, missing, stale, superseded, duplicate, and ambiguous evidence.
- Fix Route Context explanation accuracy.
- Replace prompt-style route correction with controlled in-app route review/recovery.
- Preserve WC08-REPAIR01 layout improvements.
- Preserve WC08-REPAIR02 governance and WC08-REPAIR03 routing behavior.
- Add focused deterministic fixture coverage for the exact regressions.

Final response must include:
- pushed repair branch;
- commit hash;
- validation results;
- skipped checks;
- remaining dirty/untracked files;
- confirmation that dev and master were not touched.
