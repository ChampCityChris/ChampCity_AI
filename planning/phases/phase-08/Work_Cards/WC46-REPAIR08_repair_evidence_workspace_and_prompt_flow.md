<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR08",
    "repairId": "WC46-REPAIR08",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR07_repair_workspace_architect_handoff_flow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR07_repair_workspace_architect_handoff_flow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR07_repair_workspace_architect_handoff_flow.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Repair Evidence Workspace and Repair Prompt Flow",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair workspace UX and evidence-model correction",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "Operator validation failed WC46-REPAIR07. The Repair workspace exposes internal Stage 1 / Stage 2 handoff mechanics and a Reuse Repair Handoff button instead of an intuitive evidence-review and Repair Work Card prompt flow. The screen does not present the Validation Record as the repair authority, does not provide a repair-evidence document viewer, and forces the Operator to reason about internal handoff plumbing before preparing the Architect prompt.",
    "rootCause": "WC46-REPAIR07 implemented the repair handoff mechanics but presented those mechanics directly in the UI. The application already writes Operator notes, advisory summary, repair defect text, Implementer Report source, and formal Work Card source into the Validation Record, but the Repair workspace does not treat that Validation Record as the primary repair evidence document. The UI is organized by implementation stages rather than by Operator workflow: review evidence, prepare prompt, copy prompt.",
    "selectedOption": "Option A: preserve advisory Architect summary inside the Validation Record as repair evidence; do not create a separate advisory Architect Review document in this repair.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair the Work Card Repair workspace so it is an evidence-review and Repair Work Card prompt flow. Use the Validation Record as the repair authority and hide internal handoff mechanics from the primary Operator path.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR08 — Repair Evidence Workspace and Repair Prompt Flow

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Operator validation failed WC46-REPAIR07.

The current `work-card-repair` screen is technically wired but not a usable product workflow. It presents internal implementation stages:

```text
Stage 1: Repair Architect Handoff
Stage 2: Repair Work Card Prompt
```

and exposes a primary `Reuse Repair Handoff` action. This is not the Operator’s task. The Operator’s task is to review the repair evidence, prepare a Repair Work Card Architect prompt, copy it into embedded ChatGPT, and then review the resulting Repair Work Card.

The screen also lacks the expected evidence viewer. After `Request Repair`, the durable repair authority is the `RevisionRequested` Validation Record. That record contains Operator validation notes, advisory summary, repair defect text, and source references to the Formal Work Card and Implementer Report. The Repair workspace should make that Validation Record the primary left-side document, with the Implementer Report and Formal Work Card available as supporting evidence.

## Source Evidence

Repository verified through ChampCity MCP as workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree is dirty from the active WC46 repair series. No Git mutation is authorized.

Operator visual evidence shows the Repair workspace displaying internal stage labels, a long defect paragraph, a `Reuse Repair Handoff` button, and no repair-evidence document viewer.

Relevant current source facts:

```text
src/main/workCardValidation/workCardValidationService.ts
- applyOperatorValidationDecision(...) writes a Validation Record for Validate Passed / Request Repair.
- validationWorkflowData(...) already stores operatorValidationNotes, advisorySummary, repairDefectText, formalWorkCardPath, implementerReportPath, and implementerReportRevision.
- validationBodyMarkdown(...) already renders Operator Validation Notes, Advisory Summary, and Repair Defect Text.
```

```text
src/main/workCardRepair/workCardRepairService.ts
- getWorkCardRepairProjection(...) exposes repair authority and handoff state, but not a repair-evidence document set suitable for a left-side document viewer.
- createRepairWorkCard(...) can create/reuse the Repair Architect handoff.
- buildRepairWorkCardPreparedInstruction(...) prepares the Repair Work Card prompt once the handoff exists.
```

```text
src/renderer/app/WorkCardRepairWorkspace.tsx
- renders Stage 1 / Stage 2 implementation concepts.
- exposes Prepare/Reuse Repair Handoff as the visible primary action.
- does not present the Validation Record, Implementer Report, and Formal Work Card as reviewable repair evidence documents.
```

## Objective

Make `work-card-repair` an evidence-first Repair workspace.

Expected product flow:

```text
Review & Validation
→ Operator selects Request Repair
→ app writes RevisionRequested Validation Record
→ Work Card Repair opens
→ left side shows repair evidence documents, with Validation Record selected first
→ right side shows embedded ChatGPT and Repair Work Card prompt actions
→ Operator clicks Prepare Repair Work Card Prompt
→ app creates/reuses internal Repair Architect handoff if needed and prepares the prompt
→ Operator copies handoff into embedded ChatGPT
→ Architect creates body-only Repair Work Card draft
→ app promotes Repair Work Card to exact target for review
```

Option A is selected for this repair: the advisory Architect summary remains inside the Validation Record. Do not create a separate Advisory Architect Review document in this repair.

## Runtime Sequence

```text
RevisionRequested Validation Record exists
→ repair projection resolves parent Work Card and evidence
→ projection identifies primary evidence: Validation Record
→ projection identifies supporting evidence: Implementer Report and Formal Work Card from Validation Record source/workflow data
→ Repair workspace displays evidence viewer on the left
→ Operator prepares Repair Work Card prompt on the right
→ internal handoff creation/reuse occurs behind the prompt action when needed
→ Copy Handoff sends selected-workspace-bound Repair Work Card prompt to embedded ChatGPT
→ promoted Repair Work Card becomes the review document at the exact target path
```

## Required Changes

### 1. Treat the Validation Record as the repair authority document

For `postValidationRecord` repair origin, the Repair workspace must use the current `RevisionRequested` Validation Record as the primary evidence document.

The projection must expose enough data for the renderer to show:

```text
primaryEvidenceDocument: Validation Record
supportingEvidenceDocuments: Implementer Report, Formal Work Card
operatorValidationNotes
advisorySummary
repairDefectText
parent Work Card ID
phase ID
evidence path and revision
repair target path, when available
```

The existing Validation Record is sufficient for Option A. Strengthen it only if needed to make these fields reliably available to the Repair workspace. Do not create a new advisory-review artifact.

### 2. Replace the stage-based UI with an evidence-and-prompt UI

`WorkCardRepairWorkspace.tsx` must no longer present the primary UX as `Stage 1` / `Stage 2`, `Repair Architect Handoff`, or `Reuse Repair Handoff`.

Required layout:

```text
Left pane: Repair Evidence
- Validation Record selected by default
- Implementer Report available as supporting evidence
- Formal Work Card available as supporting evidence
- document body preview for the selected evidence document

Right pane: Repair Work Card Architect
- embedded ChatGPT browser
- Prepare Repair Work Card Prompt
- Copy Handoff
- Reload ChatGPT / Refresh
- status text: evidence ready / prompt ready / copied / draft pending / repair card reviewable / needs attention
```

Internal handoff path, repair ID, and target path may appear as compact status details, but must not be the primary conceptual flow.

### 3. Collapse internal handoff creation into the prompt action

The primary Operator action should be:

```text
Prepare Repair Work Card Prompt
```

If no Repair Architect handoff exists, that action must create or reuse the handoff from current repair evidence before preparing the Architect prompt. If the handoff already exists, the same action reuses it internally. Do not require a separate primary `Reuse Repair Handoff` action.

The implementation may keep a secondary diagnostic/status line such as `Repair handoff: ready`, but the Operator-facing path must remain prompt-centered.

### 4. Make evidence document selection deterministic

On entering `work-card-repair`, the selected document should default to the Validation Record that created the repair authority.

The Operator must be able to select at least:

```text
Validation Record
Implementer Report
Formal Work Card
```

If a supporting document is missing or unreadable, show that as a repair evidence problem without silently dropping the evidence path.

### 5. Keep the Repair Work Card prompt evidence-bound

The prepared Repair Work Card prompt must continue selected-workspace binding and must direct the Architect to read the Validation Record first.

The prompt must include exact paths for:

```text
Validation Record
Implementer Report
Formal Work Card
Repair Architect handoff
Repair Work Card target
return target
```

The prompt must treat the Validation Record as the repair authority and must not invent a separate advisory-review source.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR07 backend repair handoff creation/reuse where correct;
- evidence-derived `repairDefectText` from `RevisionRequested` Validation Record;
- `MVP-01` and other non-`phase-\d+` phase ID support;
- selected-workspace-bound Repair Work Card prompt model;
- exact Repair Work Card target path from the Repair Architect handoff;
- Work Card loop authority and active repair routing;
- Review & Validation Operator authority model;
- Implement label and Codex final-read behavior from WC46-REPAIR06;
- no hidden state, sidecars, route tokens, alternate repair documents, or separate advisory-review documents;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardRepairWorkspace.tsx
src/renderer/styles.css
```

`workCardValidationService.ts` is authorized only to preserve or expose existing Validation Record advisory-summary / Operator-note / repair-defect evidence. Do not change the Operator decision authority model.

Tests authorized:

```text
test/work-card-repair/work-card-repair-service.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-repair-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md
```

## Acceptance Criteria

1. After `Request Repair`, `work-card-repair` displays an evidence-first Repair workspace, not the Stage 1 / Stage 2 handoff UI.
2. The left side displays a Repair Evidence document viewer.
3. The Validation Record that created the repair authority is selected by default.
4. The Implementer Report and Formal Work Card are available as supporting evidence documents.
5. Operator validation notes, advisory summary, and repair defect text are visible from the Validation Record evidence.
6. The right side presents `Repair Work Card Architect` prompt controls and embedded ChatGPT.
7. The primary action is `Prepare Repair Work Card Prompt` or equivalent; `Reuse Repair Handoff` is not the primary Operator action.
8. Preparing the prompt creates or reuses the internal Repair Architect handoff when needed.
9. Copy Handoff works after prompt preparation.
10. The Repair Work Card prompt directs the Architect to read the Validation Record first and includes exact Validation Record, Implementer Report, Formal Work Card, repair handoff, repair target, and return-target paths.
11. The prompt contains no project-specific wrong-target repository names and does not request a separate advisory-review document.
12. The Repair Work Card draft still promotes only to the exact repair target path from the handoff.
13. Missing or unreadable evidence documents surface as needs-attention and do not silently disappear.
14. Existing WC46 Map / Planning / Implement / Review & Validation / Repair / Close behavior remains intact outside this UI/evidence-flow repair.
15. Typecheck, build, focused tests, and full test lane pass in the approved Windows environment.
16. No dependency is added.
17. No Git operation occurs.

## Negative Constraints

Do not:

- create a separate Advisory Architect Review document in this repair;
- remove advisory summary from the Validation Record;
- make the Operator retype repair defect text when the Validation Record contains it;
- make internal Repair Architect handoff mechanics the primary UI concept;
- silently create duplicate Repair Architect handoffs;
- silently choose among conflicting active repair handoffs or Repair Work Card outputs;
- use renderer state as repair authority;
- create hidden state, route tokens, sidecars, alternate repair documents, or completion markers;
- rewrite the Work Card loop resolver or global project/phase resolver;
- alter selected-workspace prompt targeting;
- route repair evidence directly back to Implement or Close;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

Preserve existing return-target semantics:

```text
postValidationRecord → work-card-validation
preValidationReportReview → work-card-building-review
```

This repair does not authorize redesigning post-repair execution return behavior.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- evidence model summary showing Validation Record as primary repair authority;
- proof that advisory summary remains in the Validation Record;
- proof that the Repair workspace left pane shows Validation Record, Implementer Report, and Formal Work Card evidence;
- proof that Validation Record is selected by default;
- proof that the primary action prepares the Repair Work Card prompt and internally creates/reuses the handoff when needed;
- representative Repair Work Card prompt text proving evidence-bound selected-workspace targeting;
- proof that missing/unreadable evidence surfaces needs-attention;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review, the Operator must validate in the running application:

1. Request Repair from Review & Validation.
2. Confirm Work Card Repair opens with a left-side Repair Evidence viewer.
3. Confirm Validation Record is selected by default.
4. Confirm Implementer Report and Formal Work Card can be selected as supporting evidence.
5. Confirm Operator notes, advisory summary, and repair defect text are visible from evidence.
6. Confirm the primary action is Prepare Repair Work Card Prompt, not Reuse Repair Handoff.
7. Prepare and copy the Repair Work Card prompt.
8. Confirm embedded ChatGPT receives the selected-workspace-bound, evidence-bound prompt.
9. Create and promote the Repair Work Card draft.
10. Confirm the Repair Work Card appears for review at the exact repair target path.
