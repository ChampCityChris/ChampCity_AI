# WSF20-REPAIR14 — Restore the Work Card Review & Validation advisory workflow

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D33, D34, D35, D36  
**Starting baseline:** `a45a8c32faa017924adefba433172fb6ab06040f`

> The current checkout contains unrelated dirty Forgejo bootstrap work in `toolRegistry.ts` and related source-control artifacts. Do not stage, amend, or modify that work as part of R14.

## Objective

Restore Review & Validation as a coherent evidence-review workflow:

```text
completed Implementer result
→ inspect exact review documents
→ hand exact evidence to Architect
→ Architect advisory submits through MCP into SQL
→ inspect SQL-generated Architect Advisory
→ run/inspect independent Tester + Criterion proof
→ Operator Validate Passed or Request Repair
```

Architect advice remains advisory. Operator remains the only disposition authority.

No SQL schema migration.

# D33 — exact Architect advisory handoff

## 1. Use the shared browser-action presentation

Replace the one-off `validation-action-row` under the embedded browser with `WorkflowCandidateBrowserActions` or the exact same shared presentation contract.

Required actions:

- Reload ChatGPT;
- Prepare Advisory Handoff;
- Copy Advisory Handoff;
- Refresh;
- Retry Browser when applicable.

Buttons must use the same visible browser-action styling as Architect/Planning workspaces.

### Prepare Advisory Handoff

Preparation may create/recover the current exact `WorkItemValidationCycle` so the handoff is bound to a stable current evidence snapshot.

It must not create an Operator Decision.

### Copy Advisory Handoff

Copy the exact current `review.handoff`.

Do not require manual candidate JSON.

## 2. Handoff must contain the actual review artifact

Refactor `structuredWorkItemReviewService` handoff generation.

The handoff must include a bounded semantic review packet built from current SQL authority:

- approved WorkItem contract / planning projection;
- exact current Implementer Report document projection, including its semantic result;
- current implementation attempt/result identity;
- current TesterResult when present;
- current Criterion proof summary;
- current source/checkpoint identity/status;
- current open Repair lineage when relevant;
- existing current advisory cycle identity/revision when present.

Do not substitute raw database-record JSON for the Implementer Report document.

Avoid dumping entire Project State entities when a concise semantic summary plus exact IDs/revisions is sufficient.

The Architect instruction must say:

- review the exact current evidence;
- ask only materially unresolved questions if needed;
- submit the advisory with `workflow_toolbox.submit_stage_candidate`;
- stage = `work-item-review-advisory`;
- exact Workflow + WorkItem scope;
- advice does not approve, close, validate, or create Repair authority;
- after submission tell the Operator to press Refresh.

Keep transport validation in the tool/service boundary, not in prompt prose.

# D34 — SQL-generated Architect Advisory projection

## 3. Preserve the existing typed ingress

Do not create a new advisory save API.

Continue to use:

`workflow_toolbox.submit_stage_candidate(stage="work-item-review-advisory")`.

The candidate remains:

- `advisorySummary`;
- `advisoryBlockingFindings[]`;
- `advisoryRecommendation: ValidatePassed | RequestRepair | Inconclusive`;
- optional `advisoryRepairDefectText`.

Submission must revise/create the current exact `WorkItemValidationCycle` and create no Operator Decision.

## 4. Add deterministic Architect Advisory document projection

Generate a human-readable read-only projection from the current cycle, e.g. **Architect Advisory Review**.

At minimum:

### Summary
advisory summary

### Recommendation
Validate Passed / Request Repair / Inconclusive

### Blocking findings
bounded list, or explicit None

### Suggested repair defect
when supplied

### Review basis
exact Workflow / WorkItem / ImplementationAttempt / ImplementationRecord / cycle revision identities in a compact metadata section

The projection is generated from SQL and is non-authoritative.

Expose it as a normal review document tab after advisory submission.

Suggested document order:

1. Approved Work Card
2. Implementer Report
3. Architect Advisory
4. Validation Record

Architect Advisory tab may render disabled / Not yet submitted before SQL advisory exists.

## 5. Make Validation Record human-readable

Replace the current raw `JSON.stringify(...)` Work Card Validation Record projection with deterministic semantic Markdown.

At minimum include:

- Work Card identity/state;
- exact ImplementationAttempt / ImplementationRecord;
- Tester recommendation/evidence;
- Criterion proof summary;
- source/checkpoint status;
- Architect advisory when present;
- Operator notes;
- repair defect text;
- aggregate disposition/currentness;
- Repair lineage.

Preserve exact IDs/revisions in bounded metadata sections.

Do not remove any SQL facts; improve projection only.

# D35 / D36 — tab the Review & Validation workspace

## 6. Left workspace presentation

Keep the compact evidence strip at the top.

Below it, replace the single stacked body with explicit local tabs using the existing tab visual language.

Required top-level tabs:

### Documents
- document selector and preview for Approved Work Card / Implementer Report / Architect Advisory / Validation Record;
- Copy / Export actions;
- document freshness/status.

### Tester
- Tester model/reasoning selection;
- Run / Cancel Tester;
- pending Tester approval/input;
- Tester failure/status;
- TesterResult recommendation/evidence;
- bounded Tester event tail where useful.

### Criteria
- completion eligibility/blockers;
- Criterion list;
- deterministic / semantic validator actions;
- visual-human proof controls;
- Criterion Operator Decision controls;
- criterion-specific Repair actions.

### Decision
- current Architect advisory recommendation summary;
- Operator validation notes;
- explicit Repair defect text;
- **Validate Passed**;
- **Request Repair**;
- feedback/error.

The default tab on entry should be **Documents**.

If required proof is incomplete, a concise status/badge may indicate Tester or Criteria attention without automatically moving the Operator to Decision.

## 7. Final disposition comes after evidence in the visual workflow

Do not render Validate Passed / Request Repair above or inside the document-preview region.

The Decision surface must be its own last tab.

Existing domain guards remain unchanged:

- Validate Passed requires current completed implementation, current required Tester, and eligible Criterion proof;
- Request Repair requires explicit defect text and may be recorded before all Criteria pass as allowed by WSF15A;
- Architect recommendation never substitutes for Operator disposition.

## 8. Presentation-only tab state

Tab/document selection is renderer-local and ephemeral.

- no SQL write on tab change;
- no canonical navigation change;
- read-only inspection still allows switching tabs and documents;
- mutation controls remain disabled in inspection.

## 9. Embedded browser geometry

Right pane remains the embedded ChatGPT surface with the shared advisory action bar.

The left tab body and right browser each fill available height independently.

Browser actions are intrinsic and must not collapse the browser viewport.

# Focused proof

Extend existing Review & Validation owners rather than creating a parallel suite.

Prove:

1. shared browser action bar renders Reload / Prepare Advisory Handoff / Copy Advisory Handoff / Refresh;
2. prepared handoff contains the exact SQL Implementer Report projection content, not only ImplementationRecord fields;
3. handoff remains bounded and does not dump raw Project State JSON unnecessarily;
4. `workflow_toolbox.submit_stage_candidate(work-item-review-advisory)` persists all advisory fields into the exact `WorkItemValidationCycle`;
5. advisory submission creates no Operator Decision;
6. Refresh exposes an Architect Advisory document tab containing summary, recommendation, blocking findings and suggested defect;
7. Validation Record projection is semantic Markdown rather than raw JSON;
8. left workspace exposes Documents / Tester / Criteria / Decision tabs;
9. only active tab body occupies the scroll region;
10. document selection remains within Documents;
11. Tester controls/results remain functional;
12. Criterion-specific actions remain functional;
13. Validate Passed remains disabled until completion eligibility is satisfied;
14. Request Repair still requires explicit defect text;
15. Decision tab appears after evidence/proof tabs and does not precede them in DOM/action order;
16. read-only inspection permits tab/document viewing but blocks all mutation actions;
17. Repair callback still receives the exact Repair created from the review Decision;
18. browser pane remains usable at normal desktop viewport.

Run at minimum:

- `test/renderer/work-card-report-review-workspace.test.cjs`;
- workflow candidate ingress owner containing `work-item-review-advisory`;
- workflow execution application service owner;
- Greenfield composition/navigation owner;
- full SQL Greenfield lifecycle owner;
- static/build validation available after excluding unrelated dirty Forgejo work.

# Operator acceptance

Continue the current live WorkItem at Review & Validation:

1. Documents tab opens on Implementer Report;
2. Prepare Advisory Handoff is visible and styled;
3. Copy Advisory Handoff into ChatGPT;
4. Architect calls MCP `submit_stage_candidate`;
5. press Refresh;
6. Architect Advisory tab appears with the complete SQL-generated advisory;
7. inspect Tester tab;
8. inspect Criteria tab;
9. open Decision tab last;
10. Validate Passed / Request Repair behave under current evidence rules;
11. no giant mixed scroll column remains.

# Forbidden changes

- no new advisory authority model;
- no direct renderer advisory save;
- no Markdown authority;
- no fake Tester or Criterion proof;
- no weakening Validate Passed eligibility;
- no schema migration;
- no browser/MCP authorization changes;
- no unrelated Forgejo changes;
- no R12/R13 regression.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR14_IMPLEMENTER_REPORT.md`

## Checkpoint

`WSF20-R14 restore Review and Validation advisory workspace`

Then stop for Operator audit.
