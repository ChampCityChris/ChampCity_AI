# WIR-UX02-REPAIR01 — Live Routing Refresh, Actionable Decision Controls, and No-Prose Acceptance

**Parent:** `WIR-UX02 — Rebuild Routing Assessment and Route Decision Workspace`  
**Current baseline:** `1870ffdb6a52da3daa818a6973ea3458196345b9`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — OPERATOR DOGFOODING BLOCKER**

## Objective

Repair the Work Intake Routing decision screen so the Operator can complete the normal routing flow without leaving/re-entering the Workflow, guessing which text is clickable, or typing unnecessary prose merely to accept the Architect recommendation.

This card fixes three confirmed defects in one bounded repair:

1. a completed Architect routing assessment does not appear until the Routing Workspace is re-entered or manually refreshed;
2. route-decision actions are visually malformed and several real buttons render like plain text;
3. **Accept Recommendation** is disabled until free-text rationale is entered, even though simple acceptance does not require an Operator justification.

Do not redesign Work Intake Routing, Project State, route semantics, embedded ChatGPT, or target Workflow creation.

---

# Confirmed production behavior

The Operator performed:

```text
Open Work Intake Routing
-> prepare handoff
-> submit handoff to Architect model
-> Architect writes valid routing assessment
-> model visibly completes
-> Routing Workspace remains on prior state
-> leave Workflow
-> re-enter Workflow
-> getStructuredWorkRouting() runs on mount
-> assessment is promoted
-> Route Decision appears
```

The same Route Decision screen then presents:

- Accept Recommendation;
- Override Route selector;
- Select Override Route;
- Request Revised Assessment;
- Back to Workflows.

Only `Accept Recommendation` has explicit primary button styling. The other action elements render visually like ordinary text.

`Accept Recommendation` is also actually disabled when the decision textarea is empty:

```tsx
disabled={busy || !rationale.trim()}
```

The browser therefore shows the prohibited cursor.

This is not a hidden progression mechanism. It is a real action gate.

---

# 1. Automatically refresh while an Architect routing submission is pending

`StructuredWorkRoutingWorkspace` currently loads Project State only:

- on component mount; or
- when the Operator presses the explicit Refresh button.

That is insufficient because `getStructuredWorkRouting()` is also the deterministic seam that detects a completed Architect draft, promotes it into Project State, and returns the current RouteAssessment.

Add bounded automatic refresh while the current Architect routing submission is waiting for output.

Polling eligibility should be derived from the current structured model, equivalent to:

```text
preparedSubmission exists
AND preparedSubmission.state is waiting-for-drafts or partial-draft-set
AND Work Intake is not closed
AND no routed target has been created
```

A small pure helper such as:

```ts
shouldPollStructuredWorkRouting(model): boolean
```

is preferred so the rule is independently testable.

---

# 2. Poll through the existing deterministic read/promote path

The automatic refresh must call the existing:

```ts
window.champcity.getStructuredWorkRouting(intakeId, routingWorkflowId)
```

Do not add a second draft-inspection or promotion path in the renderer.

The existing main-process service remains authoritative:

```text
getStructuredWorkRouting()
-> inspect active Architect output submission
-> if draft set is ready, parse and validate
-> promote RouteAssessment into Project State
-> return current structured model
```

The renderer only re-reads that authoritative model.

---

# 3. Polling cadence and lifetime

Use a bounded foreground polling cadence approximately equivalent to existing ChampCity execution polling.

Recommended interval:

```text
1000–2000 ms
```

1500 ms is acceptable.

Requirements:

- no overlapping refresh calls;
- stop immediately when the component unmounts;
- stop after submission becomes promoted;
- stop after submission becomes superseded;
- stop after promotion-failed and surface the returned error;
- stop when a current target Workflow exists;
- stop when the WIR is closed;
- do not poll before a handoff has actually been prepared;
- do not continuously poll ordinary historical/closed WIR Workflows.

Manual Refresh remains available as an explicit user action.

Automatic refresh should not emit the manual "Routing evidence refreshed" toast every interval.

---

# 4. Assessment promotion must update the current screen in place

When automatic refresh receives a newly promoted assessment:

- set the new structured model;
- update the selected route to the Architect recommendation;
- render Routing Assessment immediately;
- render Route Decision immediately;
- remain in the same Routing Workspace;
- do not navigate away;
- do not require browser reload;
- do not require leaving/re-entering the Workflow.

If a revised assessment is being awaited after `request-revision`, the same behavior applies when the revised draft is promoted.

---

# 5. Simple acceptance does not require Operator prose

This requirement was already recorded in:

`ARCHITECT_CLOSEOUT_REVIEW_2026-09-23.md`

as governance/UX debt:

> The adopted routing architecture reserves route choice to the Operator but does not require the Operator to justify a simple acceptance of the current Architect recommendation.

Implement that correction now.

For a current, non-stale assessment:

```text
Accept Recommendation
-> actionable with empty decision text
-> uses exact current Architect recommendation
-> creates the route decision / target Workflow
```

The Operator may still enter optional rationale before acceptance, but it is not required.

---

# 6. Make structured decision rationale disposition-specific

Change `StructuredWorkRoutingDecisionInput` so rationale is optional at the transport/UI contract boundary.

Equivalent:

```ts
interface StructuredWorkRoutingDecisionInput {
  assessmentId: string;
  disposition: "accept" | "override" | "request-revision";
  route?: ExistingProjectWorkRoute;
  rationale?: string;
}
```

Validation rules:

### accept

- rationale optional;
- route field forbidden;
- current recommendation is selected;
- if Operator rationale is blank/absent, generate deterministic Decision rationale:

```text
Operator accepted Architect recommendation.
```

If the Operator supplied non-empty text, preserve that bounded text instead.

### override

- distinct supported route required;
- non-empty bounded Operator rationale required.

### request-revision

- non-empty bounded revision instructions required;
- no selected route is created.

Do not weaken stale-assessment, source-freshness, human-Operator, or exact identity checks.

---

# 7. Preserve deterministic Decision history without forcing prose

`completeWorkIntakeRouteHandoff()` currently requires a non-empty rationale string.

Do not remove Decision rationale/history.

Instead, normalize the decision before the domain handoff so the domain still receives a bounded non-empty rationale.

For simple acceptance with no Operator text, pass:

```text
Operator accepted Architect recommendation.
```

This keeps Decision history explicit and deterministic without requiring fake human justification.

Do not fabricate a quote or claim that the Operator typed this text.

It is application-generated decision metadata.

---

# 8. Accept Recommendation enablement

Change the renderer gate.

Current:

```tsx
disabled={busy || !rationale.trim()}
```

Required:

```text
disabled only when:
- action is busy; or
- assessment is not current/actionable
```

The button must be enabled with an empty textarea whenever `canDecide` is otherwise true.

The visual cursor must communicate clickability.

---

# 9. Override and revision keep meaningful rationale requirements

Do not remove rationale where it carries actual semantic information.

### Select Override Route

Disabled when:

- busy;
- rationale is blank;
- selected route equals the Architect recommendation;
- assessment is otherwise not actionable.

### Request Revised Assessment

Disabled when:

- busy;
- revision instructions are blank;
- assessment is otherwise not actionable.

This gives the free-text box a meaningful job instead of making it ceremonial for every action.

---

# 10. Rename/reframe the text field

The current label:

```text
Decision rationale or revision instructions
```

implies all dispositions require text.

Change the label/helper copy to make the behavior explicit, for example:

```text
Override / revision rationale
Optional when accepting the recommendation. Required to override the route or request a revised assessment.
```

Keep the 4000-character bound.

Do not hide the field solely because Accept does not require it; optional acceptance notes are still valid.

---

# 11. Recompose the decision controls

The current generic two-column `figma-disposition-row` contains four structurally different controls and produces an ambiguous layout.

Build a clear decision composition within `work-routing-decision`.

Required visual grouping:

## Recommendation action

A clearly visible primary button:

```text
[ Accept Recommendation ]
```

This is the dominant action.

## Override action

One explicit group:

```text
Override Route
[ Refactor / Migration ▼ ] [ Use Override Route ]
```

The select and its action belong together.

## Revision action

One clearly visible secondary/warning-style button:

```text
[ Request Revised Assessment ]
```

## Navigation

One visibly button-like tertiary action:

```text
[ Back to Workflows ]
```

Do not render action buttons as borderless plain words.

---

# 12. Every interactive action requires explicit affordance

Within `work-routing-decision`, every button must have a visible interactive treatment in both light and dark themes.

At minimum:

- border or filled background;
- bounded padding / hit area;
- hover state;
- focus-visible state;
- disabled state visually distinct from enabled;
- pointer cursor when enabled;
- not-allowed cursor only when genuinely disabled.

Do not rely on the global:

```css
button {
  font: inherit;
}
```

as styling.

Reuse existing ChampCity primary/secondary button classes where they fit. Add routing-specific classes only where composition requires them.

---

# 13. Status text is not an action

Keep:

```text
Recommendation ready for your route decision.
Architect recommendation: Refactor / Migration
```

as informational text.

Actions must be visually separate from that text.

The Operator should never need to infer whether prose is clickable.

---

# 14. Preserve route authority and navigation semantics

Do not change these accepted rules:

- Architect recommendation is advisory;
- Operator is the route authority;
- accept uses the exact current recommendation;
- override requires a different supported route;
- revision request does not select a route;
- stale assessments cannot be decided;
- accepted/overridden route atomically creates the exact target Workflow;
- live route decision may navigate to the new target Workflow;
- load/refresh alone must not auto-open an existing routed target;
- WIR closes only after successful route handoff.

No Git or Agent Harness behavior belongs in this repair.

---

# 15. Automatic refresh proof

Add renderer/runtime proof for the exact production regression.

Required sequence:

```text
Routing Workspace mounted
-> preparedSubmission = waiting-for-drafts
-> no assessment
-> automatic poll calls getStructuredWorkRouting()
-> returned model contains promoted assessment
-> rendered screen changes to Routing Assessment + Route Decision
-> component was never unmounted/re-entered
```

Also prove:

- polling stops after promotion;
- polling stops on unmount;
- polling does not overlap requests;
- polling does not run for closed WIR;
- polling does not run when no handoff is pending.

Use fake timers/injected scheduling if necessary. Do not rely on wall-clock sleeps.

---

# 16. Revised-assessment refresh proof

Required sequence:

```text
current assessment
-> Operator requests revision with instructions
-> same Routing Workspace remains active
-> Prepare revised handoff
-> pending revised submission
-> new draft appears
-> automatic refresh promotes revised assessment
-> Route Decision becomes actionable again
```

No leave/re-enter step is permitted.

---

# 17. No-prose acceptance service proof

In the structured WIR service owner, add:

```text
current RouteAssessment
-> decide({ disposition: "accept", rationale absent })
-> exact recommended route selected
-> target Workflow created
-> WIR closes
-> Decision rationale == "Operator accepted Architect recommendation."
```

Also prove optional non-empty acceptance text is retained when supplied.

---

# 18. Rationale enforcement proof

Add negative tests:

### override

```text
distinct override route
+ blank/absent rationale
-> rejected
```

### request revision

```text
blank/absent revision instructions
-> rejected
```

### accept

```text
blank/absent rationale
-> accepted
```

Do not preserve the old "all three dispositions require rationale" assertion.

---

# 19. Renderer affordance proof

Update `test/renderer/work-intake-routed-workspaces.test.cjs` or the closest permanent owner to prove:

1. Accept Recommendation is enabled with empty rationale when assessment is actionable.
2. Override action is disabled with empty rationale.
3. Revision action is disabled with empty instructions.
4. Back to Workflows renders as an explicitly styled button.
5. Override and Revision render as explicitly styled buttons.
6. Decision field copy states that text is optional for acceptance.
7. disabled controls carry disabled styling/state rather than looking like enabled text.
8. enabled controls expose pointer/click affordance through the routing CSS contract.

Do not assert only that text exists in markup.

---

# 20. Visual acceptance

Exercise the actual desktop application at the same screen size class as the reported defect.

Capture/inspect:

1. handoff pending;
2. assessment appears automatically after model output;
3. route decision with empty rationale;
4. Accept Recommendation visibly enabled;
5. override selector + button clearly grouped;
6. Request Revised Assessment visibly a button;
7. Back to Workflows visibly a button;
8. disabled override/revision controls visually distinct from enabled Accept.

The screen must not require guessing which words are clickable.

---

# 21. Non-scope

Do not:

- redesign the embedded ChatGPT/browser shell;
- add a second Architect-output promotion mechanism;
- change route taxonomy;
- change target Workflow types;
- change Work Intake capture;
- alter Project State storage format;
- add automatic route acceptance;
- remove human Operator authority;
- remove rationale from override/revision;
- change Git/source-control semantics;
- touch Agent Harness/MCP contracts.

---

# Permanent acceptance proof

At minimum prove:

1. pending Architect routing output refreshes in place;
2. valid draft promotes without Workflow re-entry;
3. polling is bounded and stops correctly;
4. revised assessment also refreshes in place;
5. Accept Recommendation works with no typed rationale;
6. deterministic acceptance rationale is recorded;
7. optional acceptance note is retained if supplied;
8. override requires a distinct route plus rationale;
9. revision request requires instructions;
10. all route-decision actions have explicit button affordance;
11. disabled and enabled states are visually unambiguous;
12. route authority/freshness rules remain unchanged;
13. exact target Workflow creation/navigation remains unchanged;
14. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- `test/renderer/work-intake-routed-workspaces.test.cjs`;
- structured WIR service owner in `test/workflow/workflow-application-service.test.cjs`;
- Project State route-decision owner if touched;
- existing Architect-output promotion owner needed for polling/promotion proof;
- capability-map integrity only if touched;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/work-intake-routing-ui-recovery/Implementer_Reports/IMPLEMENTER_REPORT_WIR-UX02-REPAIR01.md`

The report must explicitly state:

- automatic refresh eligibility rule and interval;
- how overlapping polls are prevented;
- exact stop conditions;
- service/contract change for optional acceptance rationale;
- deterministic default acceptance rationale;
- override/revision rationale rules;
- exact route-decision control classes/layout;
- visual acceptance evidence;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`WIR-UX02-REPAIR01 refresh routing decision and remove accept rationale gate`

Then STOP for Architect review.
