<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC43-REPAIR03",
    "repairId": "WC43-REPAIR03",
    "parentWorkCardId": "WC43"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43_work_card_intake_workspace_and_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43_work_card_intake_workspace_and_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Automatic Implementer Report Registration and Build Review Workspace",
    "status": "approved_for_implementation",
    "executionMode": "one bounded approval-transition and workspace repair",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR03_automatic_implementer_report_and_build_review_workspace.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Make the Approved Formal Work Card transition atomically register exactly one canonical Pending Implementer Report, embed the exact report target in future Work Cards, and replace the generic Build / Review surface with a dedicated Work Card and report workspace. Preserve the Approved Work Card as the sole Implementer instruction.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC43-REPAIR03 — Automatic Implementer Report Registration and Build Review Workspace

Status: Approved for Implementer execution  
Parent: `WC43`  
Git mutation: prohibited

## Verified Repository Evidence

The complete current production path was inspected:

```text
Formal Work Card draft promotion
→ Pending Formal Work Card review
→ architectOutput:review
→ reviewArchitectOutput()
→ canonical disposition update to Approved
→ current workflow resolves work-card-building-review
→ generic renderer workspace
→ Implementer is expected to create a report independently
→ report disposition controls become usable only after a report happens to exist
```

The inspected surface includes:

- Formal Work Card service and prompt generation;
- generic Architect-output review and canonical disposition writes;
- existing `createImplementerReportForApprovedWorkCard()` persistence service;
- current-workflow selection and downstream validation eligibility;
- main-process IPC and preload exposure;
- shared workspace and API contracts;
- document classification;
- renderer action and document-review wiring;
- canonical report metadata and writer behavior;
- Work Card Building service, workflow, renderer, and document tests.

Confirmed defects:

1. The Approved Formal Work Card contains detailed report-content requirements but does not name the exact Implementer Report target or state that implementation remains incomplete until that exact report is complete.
2. The Formal Work Card creation prompt has no dynamic Implementer Report target, so the Architect cannot reliably embed that operational instruction.
3. `createImplementerReportForApprovedWorkCard()` already computes and writes the canonical Pending report, but it is not called by any production IPC, preload, current-workflow, approval, or renderer path.
4. Formal Work Card approval and report registration are separate operations. Approval can succeed while the required execution record remains absent.
5. `work-card-building-review` displays the generic action panel, an active disposition selector before any report exists, an empty document list, `Select a document`, `Canonical Markdown — Waiting`, and `Document workflow not yet implemented`.
6. Revisionary demonstrates the normal-use failure: `MVP-01-WC01` is Approved and its implementation files exist, but `planning/phases/MVP-01/Implementer_Reports/` and the required report are absent.

Confirmed preserved architecture:

- the Approved Formal Work Card is the sole Implementer instruction;
- no separate Implementer execution packet, approval token, or primary prompt artifact is required;
- the Implementer Report is the durable Pending review target;
- Approved report advances to Operator validation; RevisionRequested report enters pre-validation repair;
- no Validation Record is created during Implementer Report review.

## Objective

Make Formal Work Card approval and Implementer Report registration one atomic application transition, and provide one dedicated Build / Review workspace that presents the Approved Work Card as instruction and the exact canonical Implementer Report as the review target.

The Implementer must complete the registered report; the application must not rely on the Implementer to invent its path, metadata, or existence.

## Runtime Sequence

### Normal path

```text
Pending Formal Work Card and absent report target
→ Operator applies Approved through architectOutput:review
→ application resolves the deterministic report target
→ one atomic canonical write approves the Formal Work Card and creates one Pending Implementer Report
→ current workflow resolves work-card-building-review with both document identities
→ dedicated workspace displays the Approved Work Card and Pending report
→ Implementer executes the Approved Work Card and completes the existing report at its exact path
→ Operator or Architect reviews the report and applies disposition
→ Approved report enables Work Card Validation; RevisionRequested enables Repair
```

### Existing approved-card recovery

```text
Approved current Formal Work Card and absent report target
→ dedicated Build / Review workspace shows the exact missing target
→ Operator selects Create Implementer Report
→ existing currentWorkflow:generateHandoff route calls the same report-registration service
→ one Pending report is created and selected
→ repeated activation creates no second report and does not overwrite the first
```

The recovery action exists only for Approved Work Cards created before this repair or otherwise missing their report. It is not a new lifecycle gate.

## Required Changes

### 1. One deterministic report context

Refactor the existing Work Card Building service around one shared resolver used by approval, recovery, workspace projection, and prompt generation.

The resolver must return:

```text
phaseId
workCardId
workCardTitle
formalWorkCardPath
formalWorkCardRevision
implementerReportPath
existingReport identity when present
```

Preserve the existing target convention:

```text
planning/phases/<phase-id>/Implementer_Reports/
IMPLEMENTER_REPORT_<work-card-id>_<formal-work-card-slug>.md
```

For the current Revisionary Work Card, the resolved target must be:

```text
planning/phases/MVP-01/Implementer_Reports/
IMPLEMENTER_REPORT_MVP-01-WC01_architecture_baseline_and_decision_framework.md
```

Do not duplicate slug or path logic in the Formal Work Card service, current workflow, renderer, or tests.

### 2. Exact canonical Pending report

The application-created report must use the existing canonical writer and exactly this authority:

```text
artifactType: implementer-report
participationRole: gatingReview
identity.phaseId: current phase ID
identity.workCardId: current Work Card ID
sourceRevisions: exact Approved Formal Work Card path and artifact revision
documentDisposition.status: Pending
documentDisposition.notes: ""
documentDisposition.reviewedAt: null
```

Retain the existing workflow-data fields:

```text
repositoryVerification
filesChanged
implementationSummary
validationResults
acceptanceEvidence
deviations
blockers
remainingOperatorValidation
```

Initialize one body template:

```text
# Implementer Report — <WORK_CARD_ID>

Approved Formal Work Card: <FORMAL_WORK_CARD_PATH> revision <FORMAL_WORK_CARD_REVISION>
Report target: <IMPLEMENTER_REPORT_PATH>

Status: Pending Implementer completion.

## Repository Verification
## Implementation Summary
## Files Created
## Files Modified
## Acceptance Criteria Evidence
## Commands and Results
## Validation Performed
## Validation Skipped
## Operator Validation Remaining
## Scope Expansion and Deviations
## Residual Risks and Blockers
## Git Actions
```

The template is an editable report shell, not proof of implementation completion.

### 3. Atomic approval transition

For `workspaceId=work-card-planning` and `status=Approved`, replace the current single-file disposition update with one atomic canonical write:

```text
Formal Work Card with Approved disposition
+
absent Implementer Report target initialized as Pending
```

Use the existing multi-document canonical writer. If report preparation or final verification fails, neither final file may change.

Rules:

- absent report target: create it atomically with approval;
- existing current report matching phase, Work Card, target, and Formal Work Card source revision: preserve its bytes and do not create another report;
- malformed, wrong-identity, wrong-source, wrong-target, or conflicting existing report: block approval and preserve both existing files byte-for-byte;
- `Pending`, `RevisionRequested`, or `Rejected` Formal Work Card review outcomes do not create a report;
- no report side effect may occur during polling, workspace reads, or document listing.

Do not add a second approval route or bypass the generic Architect review contract.

### 4. Current legacy recovery action

Add `work-card-building-review` to the existing `currentWorkflow:generateHandoff` production route only when:

- the current Formal Work Card is readable, fresh, and Approved;
- the exact report target is absent.

The action calls the same report-registration service used by approval and returns the exact created path.

Renderer label:

```text
Create Implementer Report
```

Repeated activation after creation must be idempotent: return the current path without changing bytes or revisions. A conflicting existing target must fail without mutation.

Do not add a new IPC or preload route.

### 5. Embed the exact report target in future Work Cards

Add `implementerReportPath` to the Formal Work Card preparation context using the shared resolver.

The prepared Architect prompt must include:

```text
Application-owned Implementer Report target:
- <IMPLEMENTER_REPORT_PATH>
```

Its section rules must include this exact instruction:

```text
Implementer Report Requirements must name the exact application-owned Implementer Report target above and state that the Implementer updates that existing canonical report rather than creating an alternate report. Implementation is incomplete until the report at that exact path contains the complete auditable evidence required by the Work Card and remains Pending for Architect review.
```

The Approved Work Card remains the sole Implementer instruction. Do not create a separate durable Implementer prompt or execution packet.

### 6. Dedicated Build / Review projection

Add one typed `workCardBuildingReview` projection to `CurrentWorkspaceModel` when `activeWorkspaceId=work-card-building-review`.

Include:

```text
phaseId
workCardId
workCardTitle
formalWorkCardPath
formalWorkCardRevision
implementerReportPath
report logicalDocumentId when present
report artifactRevision when present
report disposition when present
report documentReadState
report freshnessState when present
report readError when present
reportMissing boolean
```

The projection must use the same report resolver and exact current Approved Work Card used by persistence.

### 7. Dedicated Build / Review workspace

Replace the generic `CurrentActionPanel` and generic document-list/preview surface for `work-card-building-review` with one purpose-built component.

The workspace must show:

- current Work Card ID and title;
- Approved Formal Work Card path and revision;
- exact Implementer Report target;
- report status, revision, readability, and freshness when present;
- a clear statement: `The Approved Formal Work Card is the Implementer instruction. Complete the existing Implementer Report at the exact target before review.`

When the report is missing:

- show `Create Implementer Report`;
- show no disposition selector;
- show no empty document list, `Select a document`, `Waiting`, or placeholder copy.

When the report exists:

- provide exactly two document choices: `Approved Work Card` and `Implementer Report`;
- default to the Implementer Report;
- display the Work Card as read-only reference;
- display the Implementer Report as the sole disposition target;
- show disposition, review notes, and `Apply Review` only while the report is selected and current;
- preserve `Approved`, `RevisionRequested`, and `Rejected` meanings;
- after disposition, refresh documents and current workflow normally.

Use the established application card, selector, preview, and review-control visual system. Do not create another generic workspace framework or add embedded ChatGPT in this pass.

## Preserved Behavior

Preserve unchanged:

- the Approved Formal Work Card as the sole Implementer instruction;
- all Formal Work Card drafting, promotion, revision, and Operator review behavior except the atomic Approved companion write;
- existing report filename convention and canonical metadata model;
- report disposition meanings and downstream validation eligibility;
- Work Card repair creation from RevisionRequested Implementer Report evidence;
- Formal Work Card freshness invalidating an older report;
- generic document classification of Implementer Reports to `work-card-building-review`;
- no Validation Record before Operator validation;
- all other workspace layouts and lifecycle behavior;
- no Git operation.

## Authorized Surface

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/styles.css
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
test/renderer/document-review-surface-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR03_automatic_implementer_report_and_build_review_workspace.md
```

A narrowly necessary adjacent existing test or renderer helper may be changed when required to exercise the real production path. Every adjacent change must be identified and justified in the Implementer Report.

No main-process IPC or preload file is expected because the existing `currentWorkflow:generateHandoff` and disposition routes are reused.

## Risks and Constraints

The application-created report shell guarantees identity, path, source revision, and durable existence; it does not prove the Implementer completed the report. The Operator and Architect remain responsible for evaluating report substance.

Do not add a content-completeness heading gate, hidden completion marker, execution token, or second report status. `Pending` remains the visible review state.

The current Revisionary report must be created through the repaired application recovery action after implementation. Do not mutate the Revisionary workspace as part of ChampCity_AI source implementation.

## Acceptance Criteria

1. Approving a Pending Formal Work Card through the real `architectOutput:review` production service atomically writes the Approved Formal Work Card and one Pending canonical Implementer Report at the deterministic target.
2. The report metadata contains the exact phase, Work Card, Formal Work Card path, and Formal Work Card artifact revision, and its body contains the fixed report template.
3. A simulated failure during the atomic write leaves the Formal Work Card Pending, leaves the report absent, and preserves all final bytes.
4. A conflicting or malformed existing report blocks approval and leaves both the Formal Work Card and report byte-identical.
5. A valid current existing report is preserved without duplicate creation or revision inflation.
6. Non-Approved Formal Work Card dispositions create no report.
7. The current-workflow recovery action creates the missing report for an already Approved current Work Card through the existing IPC/preload route and returns the exact path.
8. Repeated recovery is idempotent; conflicting recovery fails without mutation.
9. Future Formal Work Card prepared prompts contain the exact deterministic report target and the exact update-existing-report completion instruction.
10. No separate Implementer prompt, execution packet, report path, report schema, or approval gate is introduced.
11. With no report, the Build / Review workspace displays the Approved Work Card context, exact target, and `Create Implementer Report`, and renders no generic disposition or placeholder document surface.
12. With a report, the workspace displays exactly the Approved Work Card and current Implementer Report choices, defaults to the report, and applies disposition only to the report.
13. Approved report continues to enable Work Card Validation; RevisionRequested report continues to enable pre-validation Repair; no Validation Record is created by report review.
14. Revising the Formal Work Card makes the older report stale and prevents it from advancing.
15. Positive and negative tests exercise the real Architect review, canonical multi-write, current-workflow action, document inventory, renderer component, report disposition, and downstream eligibility paths. Source-string assertions are supplemental only.
16. Typecheck, TypeScript build, Vite build, focused tests, and the complete Node test lane pass in the approved normal Windows environment.
17. No Git operation occurs.

## Negative Constraints

Do not:

- create a separate Implementer handoff artifact, execution packet, approval token, or primary Implementer prompt;
- require a second Operator action on the normal Approved Work Card path;
- mutate repository state during polling, model reads, document listing, or renderer refresh;
- create more than one report for one Work Card revision;
- overwrite a current or conflicting report;
- add JSON sidecars, marker files, route tokens, execution-run records, or hidden active-card state;
- add a new IPC or preload route when the existing current-workflow action is sufficient;
- add report heading validation or a hidden report-completion gate;
- change unrelated Architect-output, repair, validation, closeout, or workspace behavior;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC43-REPAIR03_automatic_implementer_report_and_build_review_workspace.md
```

Implementation is incomplete until that report exists.

Map every acceptance criterion to concrete evidence. Report:

- every created and modified file;
- the shared report resolver and exact target derivation;
- atomic approval/report registration proof;
- report metadata, body template, and final bytes;
- failure and no-mutation proof;
- legacy recovery and idempotency proof;
- generated Formal Work Card prompt proof;
- rendered Build / Review workspace evidence for missing and present report states;
- report disposition and downstream validation/repair proof;
- exact commands, working directory, exit codes, and results;
- any narrowly necessary adjacent correction and why it was required;
- automated validation completed and Operator validation remaining;
- scope expansion, residual risks, and confirmation that no parallel handoff, report, authority, persistence, or completion mechanism was introduced.

## Manual Validation

After Architect approval, the Operator must validate the current Revisionary state:

1. Open Build / Review for `MVP-01-WC01` and confirm the Approved Work Card path and exact missing report target are shown without the generic empty workspace.
2. Select `Create Implementer Report` and confirm exactly this report appears:

```text
planning/phases/MVP-01/Implementer_Reports/
IMPLEMENTER_REPORT_MVP-01-WC01_architecture_baseline_and_decision_framework.md
```

3. Confirm the report opens by default and the Approved Work Card remains available as read-only reference.
4. Confirm the report contains the application-owned metadata and Pending template.
5. Pass the Approved Work Card to the Implementer and require completion of the existing report path.
6. Refresh and confirm the completed report remains selected and review controls target only that report.
7. Apply the appropriate report disposition and confirm only the authorized next workflow becomes available.
