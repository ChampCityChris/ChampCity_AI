<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44-REPAIR02",
    "repairId": "WC44-REPAIR02",
    "parentWorkCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Advisory Architect Review and Operator Validation Workspace",
    "status": "approved_for_implementation",
    "executionMode": "one bounded review-authority and workspace repair",
    "parentWorkCardId": "WC44",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair the Review Report screen by making ChatGPT Architect review advisory only, embedding ChatGPT in the right pane, and combining report review with Operator validation authority. Operator validates passed or requests repair through the Validation Record; Implementer Report disposition no longer controls lifecycle authority.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# WC44-REPAIR02 — Advisory Architect Review and Operator Validation Workspace

Status: Approved for Implementer execution  
Parent: `WC44`  
Git mutation: prohibited

## Verified Repository Evidence

The current post-build production path was inspected:

```text
Approved Formal Work Card
→ Pending Implementer Report
→ work-card-building-review Codex execution
→ work-card-report-review document/report disposition surface
→ work-card-validation validation-record surface
→ repair or close
```

The inspected surface includes Work Card Building service logic, Codex execution service, Implementer Report review renderer, Operator Validation service, repair creation service, current workflow, IPC/preload exposure, shared workspace contracts, document classification, nested rail, embedded-browser attachment behavior, canonical report and validation persistence, downstream repair/close behavior, and relevant tests.

Confirmed defects:

1. `work-card-report-review` is a document-disposition screen. It displays the Approved Work Card and Implementer Report but does not provide an embedded ChatGPT Architect review of the Implementer Report and changed code.
2. The current report-review surface gives Implementer Report disposition too much lifecycle authority. It allows `Approved`, `Rejected`, or `RevisionRequested` on the report itself, even though the Architect should only provide an advisory recommendation at this point.
3. Operator validation remains a separate generic `work-card-validation` surface with `Create Current Validation Attempt`, which creates another step after the report review instead of presenting the Operator with the actual authority decision.
4. Both Architect advisory review and Operator manual validation can identify defects requiring repair, but the current workflow separates them into different screens and different authority mechanisms.
5. The current `createValidationAttempt()` service requires an Approved Implementer Report before a Validation Record can be created. That makes the Architect report disposition a gate even though the final authority should reside with the Operator.

Confirmed preserved behavior:

- `work-card-building-review` is now correctly the Implementer Build / Codex execution workspace and should remain separate.
- The existing Pending Implementer Report remains the durable evidence of implementation and validation proof.
- The repair subsystem already supports post-validation repair from RevisionRequested validation evidence.
- An Approved Validation Record is already the downstream evidence used to close or advance the Work Card.

Architect decision for this repair:

- `work-card-building-review` remains the build/Codex execution workspace.
- `work-card-report-review` becomes the combined Advisory Review and Operator Validation workspace.
- `work-card-validation` remains registered only for legacy validation-record classification and historical compatibility, but it must no longer be the normal visible next step for current Work Card validation.
- ChatGPT Architect review is advisory evidence only. It may recommend `Validate Passed`, `Request Repair`, or `Inconclusive`, but it may not apply disposition or create lifecycle authority.
- The Operator is the final authority after reviewing the report, changed code evidence, manual validation, and advisory Architect recommendation.

## Objective

Replace the current Report Review screen with one combined Review & Validation workspace:

```text
left pane: Approved Work Card, Implementer Report, changed-file evidence, Operator decision controls
right pane: embedded ChatGPT advisory Architect review
```

The Operator can then either:

```text
Validate Passed
→ application creates an Approved Validation Record
→ Work Card can advance/close
```

or:

```text
Request Repair
→ application creates a RevisionRequested Validation Record with Operator defect notes
→ existing repair flow uses that validation record as repair evidence
```

The Implementer Report remains evidence. It is not itself the lifecycle authority.

## Runtime Sequence

### Advisory review path

```text
Fresh Pending Implementer Report and Approved Formal Work Card
→ Operator opens Review & Validation
→ app shows report/work-card evidence in left pane and embedded ChatGPT in right pane
→ Operator copies the advisory review prompt
→ ChatGPT inspects the Work Card, Implementer Report, changed files, relevant production path, and tests through ChampCity MCP
→ ChatGPT returns an advisory recommendation only
→ Operator decides whether to validate passed or request repair
```

### Validate passed path

```text
Operator selects Validate Passed
→ app creates or updates the current Validation Record as Approved
→ source revisions cite the Approved Formal Work Card and current Implementer Report
→ Operator notes and optional advisory summary are stored in the validation body
→ downstream close/next-work-card behavior reads the Approved Validation Record
```

### Request repair path

```text
Operator enters bounded defect and selects Request Repair
→ app creates or updates the current Validation Record as RevisionRequested
→ validation body stores operator defect notes and optional advisory summary
→ existing repair creation path uses the RevisionRequested Validation Record as post-validation evidence
→ Repair workspace creates the bounded repair handoff/card
```

No Implementer Report disposition controls are used in the normal path.

## Required Changes

### 1. Rename and repurpose the visible review workspace

Preserve the existing workspace ID:

```text
work-card-report-review
```

Change its visible label to:

```text
Review & Validation
```

It remains a Work Card workspace after Build and before Repair. Update the Work Card loop labels to:

```text
Build
Review & Validation
Repair
Close / Next
```

The existing `work-card-validation` ID may remain registered for legacy Validation Record classification, but it must not be the normal next visible workspace for current Work Card validation after this repair.

### 2. Embedded advisory Architect browser

Attach the embedded ChatGPT browser to `work-card-report-review` using the same browser attachment foundation used by Architect-output workspaces.

The right pane must be the embedded ChatGPT surface. The left pane must remain the repository evidence and Operator decision pane.

Do not create another browser service, window, provider integration, SDK integration, or ChatGPT automation layer.

### 3. Advisory prompt generation

Add one bounded main-process/preload/renderer action to copy an advisory review prompt. The renderer must not build the prompt.

The action derives all context from repository evidence:

```text
phaseId
workCardId
Approved Formal Work Card path/revision/SHA-256
current Implementer Report path/revision/SHA-256
filesChanged from report workflowData when available
current report disposition/read/freshness
selected repository root label only when safe to display
```

The action copies the prompt to the clipboard and returns a RuntimeActionResult. It must not create a durable Architect report, disposition, validation record, repair card, or mutation.

Use this exact prompt template, substituting only angle-bracket values:

```text
Use ChampCity MCP with repository reference <PROJECT_REPO>.
Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.

This is an advisory Architect review for Operator decision support.
You are not the disposition authority. Do not approve, reject, validate, or create repair artifacts.
The Operator is the final authority and will choose Validate Passed or Request Repair.

Read the exact Approved Formal Work Card:
- path: <FORMAL_WORK_CARD_PATH>
- revision: <FORMAL_WORK_CARD_REVISION>
- sha256: <FORMAL_WORK_CARD_SHA256>

Read the current Implementer Report:
- path: <IMPLEMENTER_REPORT_PATH>
- revision: <IMPLEMENTER_REPORT_REVISION>
- sha256: <IMPLEMENTER_REPORT_SHA256>

Inspect the implementation evidence named by the report, including changed files, tests, validation output, and any production path necessary to verify the Work Card.
Changed files reported by the Implementer:
<CHANGED_FILES_LIST>

Review standard:
- The Approved Work Card defines the implementation contract.
- The Implementer Report is evidence, not authority.
- Passing tests are supporting evidence only.
- Verify production behavior, preserved behavior, failure paths, and absence of unauthorized parallel mechanisms.
- Distinguish verified repository evidence from Implementer claims and assumptions.

Return an advisory review with exactly these sections:
# Advisory Architect Review — <WORK_CARD_ID>
## Evidence Inspected
## Contract Alignment
## Blocking Findings
## Non-Blocking Concerns
## Acceptance Criteria Assessment
## Suggested Operator Decision
## Suggested Repair Defect Text

Suggested Operator Decision must be one of:
- Validate Passed
- Request Repair
- Inconclusive

Do not write repository files. Do not change dispositions. Do not create repair artifacts. End by reminding the Operator that final authority remains with the Operator.
```

### 4. Operator decision controls

Replace report disposition controls with Operator validation controls:

```text
Validate Passed
Request Repair
```

Inputs:

```text
Operator validation notes
Advisory summary / pasted recommendation (optional)
Repair defect text (required only for Request Repair)
```

The UI must clearly state:

```text
Architect review is advisory. Operator decision creates the validation authority.
```

Do not show `Approve`, `Reject`, or `RevisionRequested` as report disposition controls in this workspace.

### 5. Validation Record authority

Change the normal post-build authority so the Operator decision writes the Validation Record directly.

For `Validate Passed`:

- create the next Validation Record when none exists for the current report revision;
- set `documentDisposition.status=Approved`;
- cite the Approved Formal Work Card and current Implementer Report as source revisions;
- include Operator notes and optional advisory summary in workflowData and body;
- do not change Implementer Report disposition.

For `Request Repair`:

- create the next Validation Record when none exists for the current report revision;
- set `documentDisposition.status=RevisionRequested`;
- require non-empty repair defect text;
- cite the Approved Formal Work Card and current Implementer Report as source revisions;
- include Operator notes, advisory summary, and repair defect text in workflowData and body;
- do not change Implementer Report disposition;
- route to the existing post-validation repair path using the Validation Record as evidence.

Idempotency rule:

- repeated `Validate Passed` or `Request Repair` for the same Work Card/report revision must not create duplicate validation records silently;
- if an existing current Validation Record for the same Work Card/report revision is Pending, update that record;
- if it is already Approved or RevisionRequested, block duplicate decision and show the existing validation record path.

### 6. Current workflow and downstream behavior

Update current workflow so:

- fresh Pending Implementer Report after Build resolves to `work-card-report-review` as the next required decision workspace;
- `work-card-report-review` remains reachable for existing Approved, RevisionRequested, or Pending validation evidence;
- Approved Validation Record advances to close/next candidate exactly as before;
- RevisionRequested Validation Record enables Repair exactly as before;
- Implementer Report `Approved` no longer gates validation creation in the normal path.

Keep legacy behavior only where needed to read older report-disposition artifacts. Do not make report disposition the normal current authority.

### 7. Report Review layout

The workspace must use the same shared dual-pane behavior used by the embedded Architect workspaces:

```text
left: evidence, documents, Operator controls
right: embedded ChatGPT advisory browser
```

At normal desktop width, the browser must be readable and not buried under document content. At constrained width, stack predictably.

## Preserved Behavior

Preserve unchanged:

- `work-card-building-review` as Build / Codex execution workspace;
- SDK-primary Codex integration and credential boundaries;
- existing Implementer Report file path and canonical metadata;
- Approved Formal Work Card as implementation authority;
- Implementer Report as evidence and review input;
- Repair Work Card generation from RevisionRequested validation evidence;
- Work Card close/next behavior from Approved validation evidence;
- no Validation Record before Operator decision;
- no automatic lifecycle advancement from ChatGPT advice;
- no Git operation.

## Authorized Surface

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/documents/lifecycleArtifact.ts
src/shared/workspaces/documentWorkspace.ts
src/shared/workspaces/projectRailPresentation.ts
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/document-review-surface-source.test.cjs
test/repository/runtime-wiring-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md
```

A small shared renderer component may be extracted only if required to avoid duplicating document preview or validation controls and is fully tested.

No package dependency is authorized.

## Risks and Constraints

This repair intentionally changes authority. The Architect recommendation must not become a hidden approval gate. The Operator decision must be explicit and durable.

The system may preserve legacy report dispositions for old data, but new normal flow must not require report approval before validation.

The advisory browser may produce a recommendation that the Operator rejects. That is acceptable. Operator validation authority prevails.

## Acceptance Criteria

1. `work-card-report-review` is labeled and presented as Review & Validation, not report disposition authority.
2. `work-card-report-review` attaches the embedded ChatGPT browser in the right pane using the established browser foundation.
3. The advisory prompt is built in the main process from repository evidence and copied to the clipboard without renderer-provided paths, prompt text, Work Card IDs, or report IDs.
4. The advisory prompt contains the exact non-authority language and required sections from this card.
5. The workspace shows `Validate Passed` and `Request Repair`, not `Approve`, `Reject`, or `RevisionRequested` report controls.
6. Validate Passed creates or updates one current Validation Record as Approved, cites the Approved Formal Work Card and current Implementer Report, stores Operator notes/advisory summary, and does not change Implementer Report disposition.
7. Request Repair creates or updates one current Validation Record as RevisionRequested, requires repair defect text, stores Operator notes/advisory summary/defect, and does not change Implementer Report disposition.
8. Duplicate Operator decisions for the same Work Card/report revision are blocked once a current Validation Record is already Approved or RevisionRequested.
9. Fresh Pending Implementer Report after Build resolves to Review & Validation as the next required decision workspace.
10. Approved Validation Record advances to existing close/next behavior; RevisionRequested Validation Record enables existing Repair behavior.
11. No ChatGPT advisory output can directly create validation, repair, report disposition, or lifecycle advancement.
12. Legacy Implementer Report dispositions remain readable but are not required for the new validation path.
13. Positive and negative tests exercise prompt generation, browser attachment gating, Operator decision persistence, duplicate prevention, no report-disposition mutation, repair routing, validation close routing, and renderer controls. Source-string assertions are supplemental only.
14. Typecheck, TypeScript build, Vite build, focused tests, and complete Node test lane pass in the approved normal Windows environment.
15. No Git operation occurs.

## Negative Constraints

Do not:

- make ChatGPT, Architect output, or advisory text the disposition authority;
- require Implementer Report Approved before Operator validation;
- keep report disposition controls as the normal Review & Validation action;
- create a durable Architect approval artifact as a gate;
- parse ChatGPT output to decide pass/fail;
- auto-create repair from ChatGPT recommendation alone;
- auto-validate from ChatGPT recommendation alone;
- create another Codex execution path;
- alter SDK/authentication boundaries;
- add dependencies;
- change unrelated workspaces;
- perform Git operations.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC44-REPAIR02_advisory_review_and_operator_validation_workspace.md
```

Implementation is incomplete until that report exists.

The report must map every acceptance criterion to concrete proof and include:

- every changed file;
- prompt-generation proof;
- embedded-browser attachment proof;
- Operator decision persistence proof;
- no-report-disposition-mutation proof;
- duplicate-decision prevention proof;
- repair routing proof;
- validation close/next proof;
- renderer evidence for Review & Validation controls and absence of report disposition controls;
- validation commands and results;
- Operator validation remaining;
- residual risks;
- confirmation that Architect advisory output is not lifecycle authority.

## Manual Validation

After Architect approval, the Operator must validate in the running app:

1. Open Review & Validation after a completed Implementer Report.
2. Confirm left pane shows Work Card/report evidence and Operator decision controls.
3. Confirm right pane is embedded ChatGPT and is readable at normal desktop width.
4. Copy advisory prompt and confirm ChatGPT receives the correct non-authority instruction.
5. Confirm Architect recommendation cannot apply disposition by itself.
6. Choose Request Repair with defect text and confirm a RevisionRequested Validation Record is created and Repair becomes available.
7. Repeat on a clean Work Card and choose Validate Passed; confirm an Approved Validation Record is created and the Work Card can advance.
8. Confirm the Implementer Report disposition remains unchanged by both decisions.
