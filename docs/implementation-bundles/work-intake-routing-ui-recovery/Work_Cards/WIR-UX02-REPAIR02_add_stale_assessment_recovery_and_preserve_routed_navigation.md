# WIR-UX02-REPAIR02 — Add Explicit Stale-Assessment Recovery and Preserve Routed Handoff Navigation

**Parent:** `WIR-UX02 — Rebuild Routing Assessment and Route Decision Workspace`  
**Repairs:** `WIR-UX02-REPAIR01 refresh routing decision and remove accept rationale gate`  
**Current implementation baseline:** `adf4d268d2074eb1f14e8ff320f5a4b6aa2f261a`  
**Implementer:** GPT 6.0 Luna Medium  
**Status:** **ACTIVE — OPERATOR VALIDATION BLOCKER**

## Objective

Repair the Work Intake Routing screen when a previously valid RouteAssessment becomes stale because the Work Intake or managed source evidence changed.

The authority rule is correct:

> A stale RouteAssessment cannot be accepted, overridden, or used to create a target Workflow.

The current UX is not correct:

> When the assessment becomes stale, all route-decision controls disappear and the screen leaves the Operator with status prose plus a visually ambiguous browser action.

The required behavior is:

```text
current assessment becomes stale
-> clearly explain why route decision is unavailable
-> provide one prominent Prepare Current Assessment action
-> remain in the same Routing Workspace
-> prepare a fresh Architect handoff
-> automatically poll/promote the new assessment
-> restore Accept / Override / Request Revised Assessment controls in place
```

Do not weaken stale-assessment authority.

---

# Confirmed production defect

Operator validation on the real ChampCity_AI Project produced:

```text
Work Intake or optional source evidence changed. Prepare a current assessment.
Architect recommendation: Refactor / Migration
[Back to Workflows]
```

The prior assessment is still visible, but:

- Accept Recommendation is absent;
- Override Route is absent;
- Request Revised Assessment is absent;
- the recovery action is not presented in the decision panel;
- the browser-column Prepare Handoff control is visually muted enough to appear disabled.

The current renderer derives:

```ts
const canDecide =
  !!assessment &&
  !assessment.stale &&
  !model?.closed &&
  !model?.targetWorkflowId &&
  model?.reviewState !== "revision-requested";
```

and renders the decision controls only when `canDecide` is true.

That correctly blocks decision authority but incorrectly removes the Operator's recovery path.

---

# 1. Preserve stale-assessment authority

Do not allow any route decision against a stale assessment.

When:

```text
assessment.stale === true
```

the following remain unavailable:

- Accept Recommendation;
- Use Override Route;
- Request Revised Assessment.

Do not enable them through UI-only changes.

The existing main-process checks for:

- current RouteAssessment identity;
- Work Intake recordVersion freshness;
- managed Dev revision freshness;
- exact human Operator authority

remain unchanged.

---

# 2. Add an explicit stale-assessment recovery state

When a RouteAssessment exists but `assessment.stale === true`, render a dedicated recovery panel inside `work-routing-decision`.

Required content:

```text
Assessment needs refresh

The Work Intake or source evidence changed after this recommendation was prepared.
Prepare a current Architect assessment before selecting a route.

Previous recommendation: Refactor / Migration

[ Prepare Current Assessment ]
[ Back to Workflows ]
```

Use the current recommendation only as historical/context information.

Clearly label it stale / previous.

Do not make the stale recommendation look actionable.

---

# 3. Prepare Current Assessment uses the existing prepare path

The new recovery action must call the same existing authoritative preparation path used by the browser action:

```ts
window.champcity.prepareStructuredWorkRouting(intakeId, routingWorkflowId)
```

Do not create another assessment-preparation API.

Reuse/refactor the existing `run("prepare")` handler as needed so:

- browser-column Prepare Handoff;
- stale-panel Prepare Current Assessment;
- revision-request preparation

all use one implementation path.

After preparation:

- update the current structured model;
- preserve the Routing Workspace;
- show clear feedback that a current Architect handoff is ready;
- enable Copy Handoff where appropriate;
- allow the existing 1500 ms automatic polling to take over.

---

# 4. Recovery action must be visually primary and unambiguous

`Prepare Current Assessment` is the only valid forward action while the assessment is stale.

Give it an explicit primary-button treatment.

It must have:

- visible fill or border;
- normal enabled opacity;
- pointer cursor when enabled;
- hover state;
- focus-visible state;
- disabled state only while genuinely busy.

Do not rely on the browser-column generic muted button styling as the only recovery affordance.

The Operator must not have to infer that a dim-looking button is usable.

---

# 5. Browser action styling must reflect actual enabled state

The current browser action buttons use a muted default appearance even when enabled.

For this Routing screen, ensure enabled controls are visually distinguishable from disabled controls.

At minimum:

- enabled Prepare Handoff / Prepare Current Assessment has normal opacity and visible interactive contrast;
- disabled Copy Handoff remains visibly disabled;
- cursor is pointer only when enabled;
- cursor is not-allowed only when disabled.

Do not globally restyle unrelated browser actions unless necessary.

A routing-specific class is acceptable.

---

# 6. Automatic polling resumes after stale recovery preparation

After `Prepare Current Assessment` returns a model whose `preparedSubmission.state` is:

- `waiting-for-drafts`; or
- `partial-draft-set`,

the existing automatic polling must resume.

Required sequence:

```text
stale assessment
-> Prepare Current Assessment
-> preparedSubmission waiting-for-drafts
-> poll getStructuredWorkRouting()
-> Architect draft appears
-> main process promotes new RouteAssessment
-> returned assessment is current
-> same mounted screen re-renders normal Route Decision controls
```

No Workflow re-entry or manual Refresh is required.

---

# 7. Revised assessment and stale assessment use the same recovery mechanics

Do not create separate polling systems.

Both cases:

- request-revision;
- stale assessment caused by changed Work Intake/source evidence

must converge on the same:

```text
prepare
-> copy/use Architect handoff
-> poll
-> promote
-> current RouteAssessment
-> decision controls
```

The text shown to the Operator may differ, but the mechanics must be shared.

---

# 8. Normal current-assessment decision UI remains unchanged

When the assessment is current and actionable, preserve the Repair01 behavior:

### Accept Recommendation

- enabled with no typed rationale;
- optional acceptance note allowed;
- deterministic default rationale used when empty.

### Override Route

- distinct route required;
- rationale required.

### Request Revised Assessment

- revision instructions required.

Do not regress these rules while adding stale recovery.

---

# 9. Routed handoff navigation remains the intended behavior

Preserve and explicitly prove the existing target navigation contract.

For `accept` or `override`:

```text
Operator selects route
-> structured WIR service atomically creates exact target Workflow
-> returns targetWorkflowId
-> routeStructuredWIRTarget(..., "live-decision")
-> App.openRoutedTargetWorkflow(targetWorkflowId)
-> refresh Workflow inventory
-> get exact Workflow
-> set selected Workflow type/id
-> shellView = "workflow-instance"
-> Operator lands in that Workflow's intake/entry workspace
```

This is the intended behavior.

Do not change accept/override to merely return to the Workflow Hub.

### Request Revised Assessment

Must remain in Routing.

It does not create or open a target Workflow.

---

# 10. Do not auto-open a routed target from passive refresh

Preserve the accepted navigation guard:

- load: no automatic target navigation;
- refresh/poll: no automatic target navigation;
- live decision: open the newly created target Workflow;
- explicit Open routed Workflow button: open exact target.

Polling that discovers an already-routed historical WIR must not unexpectedly navigate.

---

# 11. Stale assessment history remains inspectable

Keep the stale Routing Assessment document visible as historical context.

The document card may continue showing:

- recommendation;
- rationale;
- traits;
- evidence notes;
- assessment identity.

But the decision panel must clearly say that the assessment is stale and unavailable for decision.

Do not delete or hide the assessment merely because it is stale.

---

# 12. Recovery feedback must be human-readable

Do not expose internal submission states such as:

- waiting-for-drafts;
- partial-draft-set;
- promoted;
- superseded.

Use human-facing copy.

Examples:

### After prepare

```text
Current Architect assessment handoff prepared. Submit it to the Architect; this screen will update automatically when the assessment is ready.
```

### While waiting

```text
Waiting for the current Architect assessment.
```

### Promotion failure

Show the bounded returned error as an actual error state.

Do not silently stop polling.

---

# 13. Renderer state matrix

Add a pure renderer-state helper or equivalent proof covering at least:

| State | Decision controls | Recovery action | Target navigation |
| --- | --- | --- | --- |
| no assessment / no prepared handoff | hidden | Prepare Handoff | none |
| handoff pending | hidden | waiting/copy actions | none |
| current assessment | shown | none | decision-driven |
| stale assessment | hidden | **Prepare Current Assessment** | none |
| revision requested | hidden | Prepare Revised Assessment | none |
| routed target exists | hidden | Open routed Workflow | explicit/passive rules preserved |
| closed | hidden | none | Open routed Workflow if target exists |

Avoid ad-hoc JSX branching that makes another dead-end state easy to introduce.

---

# 14. Focused stale-state renderer proof

Add a permanent renderer test for the exact Operator screenshot state.

Fixture:

```text
assessment exists
assessment.stale = true
recommendation = refactor-migration
closed = false
targetWorkflowId = null
```

Prove:

- stale assessment remains visible;
- Architect recommendation remains visible as previous/stale context;
- Accept Recommendation is not rendered;
- Use Override Route is not rendered;
- Request Revised Assessment is not rendered;
- Prepare Current Assessment **is rendered and enabled**;
- Back to Workflows is a visible button;
- recovery action uses explicit button styling.

---

# 15. Recovery-to-current mounted-screen proof

Without unmounting the component:

1. render stale model;
2. invoke Prepare Current Assessment;
3. returned model contains pending prepared submission;
4. automatic polling runs;
5. next authoritative read returns a fresh promoted assessment;
6. same component now renders:
   - Accept Recommendation;
   - Override controls;
   - Request Revised Assessment;
7. Prepare Current Assessment disappears.

No route decision occurs during refresh.

---

# 16. Target Workflow navigation proof

Add/extend renderer/App proof showing:

### Accept

```text
decideStructuredWorkRouting()
-> returns targetWorkflowId
-> onRouted(targetWorkflowId)
-> openRoutedTargetWorkflow()
-> exact target workflow-instance becomes foreground
```

### Override

Same navigation behavior with the selected override target.

### Revision

`onRouted` is not called and Routing remains foreground.

Do not rely only on unit proof of `routeStructuredWIRTarget`; include the App handoff seam where practical.

---

# 17. Visual acceptance

Exercise the desktop screen in these states:

1. stale assessment;
2. stale assessment after Prepare Current Assessment;
3. newly promoted fresh assessment;
4. current assessment with empty rationale;
5. accepted route entering target Workflow intake;
6. overridden route entering target Workflow intake;
7. revision request remaining in Routing.

At the reported desktop width:

- recovery CTA must be obvious;
- no enabled button may look disabled;
- no disabled button may look like ordinary prose;
- no required action may be hidden below ambiguous text.

---

# 18. Non-scope

Do not:

- weaken stale-assessment/source-freshness checks;
- auto-accept the Architect recommendation;
- auto-prepare a new assessment without Operator action;
- redesign Work Intake capture;
- redesign route taxonomy;
- redesign target Workflow intake screens;
- change Project State storage;
- change Git/source-control behavior;
- touch Agent Harness/MCP contracts.

---

# Permanent acceptance proof

At minimum prove:

1. stale assessments remain non-actionable;
2. stale state provides explicit Prepare Current Assessment recovery;
3. recovery uses the existing prepare API;
4. polling resumes after recovery preparation;
5. fresh assessment restores route-decision controls in place;
6. no re-entry/manual refresh is required;
7. simple accept still requires no prose;
8. override/revision still require rationale/instructions;
9. accept and override open the exact target Workflow intake;
10. revision stays in Routing;
11. passive refresh never auto-opens target Workflow;
12. enabled/disabled routing actions are visually unambiguous;
13. `git diff --check` passes.

---

# Validation

Run focused validation only:

- production typecheck/build;
- `test/renderer/work-intake-routed-workspaces.test.cjs`;
- structured WIR service owner;
- App/workflow navigation owner covering `openRoutedTargetWorkflow`;
- Architect-output promotion/polling owner as needed;
- repair validation-plan preview;
- `git diff --check`.

Do not run the broad/full regression suite.

---

# Implementer report

Write:

`docs/implementation-bundles/work-intake-routing-ui-recovery/Implementer_Reports/IMPLEMENTER_REPORT_WIR-UX02-REPAIR02.md`

The report must explicitly state:

- stale-state renderer behavior;
- recovery CTA wiring;
- polling restart behavior;
- exact stop conditions;
- current-assessment decision behavior;
- accept/override target Workflow navigation proof;
- revision-request stay-in-routing proof;
- visual acceptance results;
- focused validation results.

---

# Checkpoint and STOP

Commit:

`WIR-UX02-REPAIR02 add stale assessment recovery and preserve routed navigation`

Then STOP for Architect review.
