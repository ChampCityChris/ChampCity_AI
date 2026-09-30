# WRB02-R01-02 — Restore Source Lifecycle Proof and Requalify WRB02

**Depends on:** WRB02-R01-01 checkpoint  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Close the known source-lifecycle qualification gap without inventing new production architecture.

Production code review shows WRB02-created SourceBaseline/SourceBinding state is compatible with the existing lazy Workflow materialization service. The remaining failures are permanent fixtures that still construct pre-WRB01 Project state.

Repair those existing proofs to the Current Project/WRB02 model and requalify the bundle.

## 1. Repair workflow-source-materialization fixture

Update:

`test/source-control/workflow-source-materialization.test.cjs`

The fixture must establish canonical Current Project state before calling the production materializer.

Prefer reusing existing Current Project/source bootstrap helpers rather than hand-writing obsolete `selected-project` resources.

Required fixture semantics:

- non-Git Project container;
- canonical active Current Project registration;
- separate active source-repository ProjectResource;
- managed Dev source topology consistent with current production expectations;
- exact Project ID supplied to materializer.

Where the test creates a normal substantive Workflow for materialization, use the current WRB02 semantic creation path/primitive so SourceBaseline + unprepared SourceBinding already exist at Workflow creation.

Retain the valuable WTR02F proof:

- exact baseline survives Dev advance;
- supersession anchors physical source to baseline Workflow identity;
- concurrent Workflow checkouts coexist;
- ready retry is stable;
- missing/conflicting checkout handling remains bounded;
- WIR/terminal/no-baseline rejection remains before inappropriate source mutation.

Do not weaken these assertions merely to make the test green.

## 2. Add explicit WRB02 → WTR02F seam proof using the existing test family

At least one materialization scenario must prove:

`WRB02 substantive Workflow creation with source seed`
→ `unprepared SourceBinding`
→ `createWorkflowSourceMaterializationService.materialize(exactWorkflowId)`
→ `workflow/<workflow-id> SourceLine + registered RepositoryCheckout + ready binding`.

No new standalone test file is necessary if the existing materialization test can own this proof cleanly.

## 3. Repair structured-integration fixture

Update:

`test/source-control/structured-integration.test.cjs`

Its Project fixture currently predates Current Project registration and manually assembles obsolete route/source state.

Bring the fixture to current semantics:

- establish canonical Current Project registration and source Repository identity;
- use current managed source topology;
- where practical, create the routed substantive target through the current structured WIR handoff command rather than manual `recordRouteDecision + createWorkflow + linkWorkflowRouteTarget + createWorkflowSourceBaseline`;
- use the target's existing unprepared SourceBinding with lazy materialization;
- do not advance/close WIR using obsolete post-route lifecycle steps if the current handoff already closes it.

Retain the actual integration proof:

- materialized Workflow source is committed at the implementation checkpoint;
- integration targets exact Dev;
- IntegrationRecord ownership is Workflow identity;
- retry does not duplicate integration;
- Project root remains non-Git.

This is fixture modernization and cross-bundle proof, not a production integration redesign.

If the current production integration service exposes a genuine incompatibility with WRB02 target state, stop and report the exact production defect rather than rewriting the test around it.

## 4. Do not resurrect legacy WIR

The fixture repair must not reintroduce:

- Work Intake branch ownership;
- Markdown route authority;
- WIR-owned target execution;
- RoutedIssueBridge;
- legacy route-disposition checkpoint behavior.

Use SPS/current source semantics only.

## 5. Final WRB02 qualification

Run focused:

- `test/workflow/workflow-application-service.test.cjs`;
- `test/source-control/workflow-source-materialization.test.cjs`;
- `test/source-control/structured-integration.test.cjs`;
- Current Project entry test;
- structured Work Intake capture test;
- Workflow Hub/routing renderer tests;
- Workflow type registry test;
- capability-map integrity.

Also run build and `git diff --check`.

Preview the exact changed-path validation plan. Do not run a broad historical multi-minute sweep merely because shared contracts select it; record the preview and focused owned evidence honestly.

## 6. Final bundle report

Update:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-05_BUNDLE_QUALIFICATION_REPORT.md`

with Repair01 checkpoints and final evidence.

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Repair01/Reports/WRB02-R01-02_FINAL_QUALIFICATION_REPORT.md`

Include:

- both repair checkpoint SHAs;
- Greenfield entry result;
- closed-WIR navigation result;
- WIR title bound result;
- WRB02-created source state → materialization result;
- routed target → materialization/checkpoint/integration result;
- focused validation receipts;
- any remaining deferred WRB03/04 planning/execution surfaces.

## Stop boundary

Create one checkpoint commit:

`WRB02-R01-02 restore source lifecycle proof and qualify WRB02`

Then STOP.

Do not begin WRB03. Human Architect performs final WRB02 disposition.
