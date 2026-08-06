<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR07",
    "repairId": "WC46-REPAIR07",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR06_codex_report_canonical_refresh_and_implement_workspace_label.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR06_codex_report_canonical_refresh_and_implement_workspace_label.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR06_codex_report_canonical_refresh_and_implement_workspace_label.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Repair Workspace Architect Handoff Flow",
    "status": "approved_for_implementation",
    "executionMode": "one bounded Work Card Repair workspace repair",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "After WC46 visual validation, Operator Request Repair routed the application to work-card-repair, but the workspace displayed the generic document workflow surface with no selected repair document and no usable repair-card Architect handoff flow. The only existing Create Current Repair Handoff control is hidden because work-card-repair is classified as an Architect-output workspace, while the Architect-output controls cannot prepare/copy because no Repair Architect handoff exists yet.",
    "rootCause": "work-card-repair mixes two sequential responsibilities: creating/reusing the Repair Architect handoff from RevisionRequested evidence and preparing/copying the Repair Work Card Architect prompt. The renderer exposes only the second Architect-output surface in this workspace. The hidden generic action still requires manually re-entered defect text and currentWorkflowService.latestRevisionRequestedEvidence only recognizes phase IDs matching phase-\\d+, which does not cover project phase IDs such as MVP-01.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR07_repair_workspace_architect_handoff_flow.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Create a dedicated Work Card Repair workspace flow that derives the repair handoff from current RevisionRequested evidence, then enables normal Architect handoff preparation/copy for the Repair Work Card. Do not broaden the Work Card loop resolver.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR07 — Repair Workspace Architect Handoff Flow

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Operator visual validation after WC46 showed this production failure:

```text
Operator Request Repair from WC02 Review & Validation
→ current workspace becomes Work Card Repair
→ left pane shows generic document workflow surface
→ no repair document is selected
→ no usable Prepare/Copy handoff path exists for creating the Repair Work Card Architect prompt
```

The Repair workspace must request a bounded Repair Work Card from the Architect. It currently exposes a generic document review shell instead.

## Source Evidence

Inspected repository path through ChampCity MCP: `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. Working tree was dirty from the active WC46 repair series and no files were staged. No Git mutation is authorized.

Operator visual evidence shows `work-card-repair` rendering as a generic document workflow with `No document selected`, `No document yet`, disabled Architect handoff actions, and no repair-card request flow.

Relevant source facts:

```text
src/renderer/app/App.tsx
- isArchitectEnabledWorkspace(...) includes work-card-repair.
- activeWorkspaceId === work-card-repair therefore renders the generic Architect-output/document-chat surface.
- the generic FigmaActionWorkspace branch contains Create Current Repair Handoff, but that branch is hidden for Architect-output workspaces.
```

```text
src/main/workCardRepair/workCardRepairService.ts
- createRepairWorkCard(...) can create an Approved Repair Architect handoff.
- repairWorkCardArchitectOutputDefinition can prepare/copy/promote the final Repair Work Card after a handoff exists.
- buildRepairWorkCardPreparedInstruction(...) still emits a generic selected-repository instruction instead of the selected-workspace binding used by Formal Work Card planning.
```

```text
src/main/currentWorkflow/currentWorkflowService.ts
- createRepairForCurrentFailure(...) requires a manually supplied defect string.
- latestRevisionRequestedEvidence(...) derives phaseId only with /planning/phases/(phase-\d+)/, so phase IDs such as MVP-01 are not supported by the generic repair action.
```

## Objective

Make `work-card-repair` a dedicated Work Card Repair workspace that performs the correct two-stage repair-card flow:

```text
RevisionRequested validation/report evidence
→ derive repair defect from repository evidence
→ create or reuse the exact Repair Architect handoff
→ prepare/copy the selected-workspace-bound Repair Work Card Architect prompt
→ Architect creates the body-only Repair Work Card draft
→ app promotes/reviews the Repair Work Card through the existing Architect-output path
```

## Runtime Sequence

```text
Operator chooses Request Repair
→ validation record is written with RevisionRequested disposition and repairDefectText
→ Work Card loop routes to work-card-repair
→ Repair workspace shows parent Work Card, evidence path, repair defect text, repair ID/target, and return target
→ Operator clicks Prepare Repair Handoff / equivalent action
→ app creates or reuses the Approved Repair Architect handoff from the current evidence
→ app prepares the Repair Work Card Architect output handoff
→ Copy Handoff sends the repair-card Architect prompt to embedded ChatGPT
→ Architect writes the temporary body-only Repair Work Card draft
→ app promotes the Repair Work Card to the exact repair target for review
```

## Required Changes

1. Add a dedicated Work Card Repair workspace presentation.

`work-card-repair` must not rely on the generic document workflow shell. It must display current repair authority:

```text
phase ID
parent Work Card ID
repair ID, when resolved
RevisionRequested evidence path and revision
repair defect text
repair origin
repair Work Card target path
return target
current state: handoff needed / handoff ready / draft pending / repair card reviewable / needs attention
```

2. Derive the repair defect from repository evidence.

For `postValidationRecord` repairs, use the current RevisionRequested validation record `workflowData.repairDefectText` as the authoritative defect text. Do not require the Operator to retype the defect in the Repair workspace. If the validation record lacks `repairDefectText`, block with a specific error explaining that the validation record is missing the repair defect text.

For `preValidationReportReview` repairs, preserve the existing report-review repair behavior only if currently supported. Do not broaden this repair to create a new pre-validation workflow.

3. Fix current RevisionRequested evidence resolution.

Replace the `phase-\d+`-only path parsing in `latestRevisionRequestedEvidence(...)` or its replacement with metadata-first evidence resolution. It must support phase IDs such as `MVP-01`, `phase-08`, and future valid phase IDs. Prefer canonical metadata identity over filename regex.

4. Create/reuse the Repair Architect handoff from the dedicated workspace.

The Repair workspace must expose a direct action equivalent to:

```text
Create or reuse Repair Architect handoff for the current RevisionRequested evidence.
```

The action must be idempotent for the same evidence revision and defect text. It must not create duplicate Repair Architect handoffs for repeated clicks. It must reject conflicts visibly if multiple active Repair Architect handoffs or Repair Work Card outputs exist.

5. Enable normal Architect-output preparation after the repair handoff exists.

Once the handoff exists, `repairWorkCardArchitectOutputDefinition` and the existing Architect-output runtime should enable Prepare Handoff and Copy Handoff for the Repair Work Card. The embedded browser surface must be usable for the repair-card Architect prompt.

6. Apply selected-workspace target binding to the Repair Work Card Architect prompt.

`buildRepairWorkCardPreparedInstruction(...)` must use generic selected project workspace binding equivalent to the Formal Work Card prompt model. It must not rely on open-ended workspace discovery and must not name project-specific wrong targets. Include exact evidence path, handoff path, repair target path, return target, phase ID, repair ID, and parent Work Card ID.

## Preserved Behavior

Preserve unchanged:

- `repairWorkCardArchitectOutputDefinition` as the canonical Repair Work Card output definition;
- exact Repair Architect handoff and Repair Work Card target path conventions unless a bug fix is strictly necessary;
- Work Card loop repair routing from RevisionRequested validation evidence;
- Formal Work Card selected-workspace target binding from WC46-REPAIR04;
- Implement label and Codex final-read behavior from WC46-REPAIR06;
- Review & Validation Operator authority model;
- Repair Work Card review/promotion model;
- no hidden state, sidecars, route tokens, or alternate repair documents;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardRepairWorkspace.tsx
```

`WorkCardRepairWorkspace.tsx` may be created. Use another narrowly named renderer file only if the Implementer explains the reason in the report.

Tests authorized:

```text
test/work-card-repair/work-card-repair-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-repair-workspace.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR07_repair_workspace_architect_handoff_flow.md
```

## Acceptance Criteria

1. After `Request Repair`, `work-card-repair` displays a dedicated Repair workspace rather than the generic document workflow shell.
2. The Repair workspace shows the parent Work Card, evidence path, RevisionRequested source, repair defect text, repair ID/target when available, and return target.
3. The repair defect is derived from the current RevisionRequested validation record `repairDefectText`; the Operator is not required to retype it.
4. Missing repair defect text blocks repair handoff creation with a specific error.
5. Current repair evidence resolution is metadata-first and supports phase IDs such as `MVP-01` and `phase-08`.
6. The Repair workspace can create or reuse the exact Approved Repair Architect handoff for the current evidence revision.
7. Repeated repair-handoff creation for the same evidence is idempotent and does not create duplicate handoffs.
8. After handoff creation, Prepare Handoff and Copy Handoff are enabled for the Repair Work Card Architect prompt.
9. The Repair Work Card Architect prompt is selected-workspace-bound and includes exact evidence path, handoff path, repair target path, return target, phase ID, repair ID, and parent Work Card ID.
10. The generated prompt contains no project-specific wrong-target repository names.
11. The body-only Repair Work Card draft is promoted only to the exact repair target path from the handoff.
12. Conflicting repair handoffs or repair outputs surface as needs-attention and do not silently select one.
13. Existing Work Card loop Map / Planning / Implement / Review & Validation / Close behavior remains intact.
14. Typecheck, build, focused tests, and the full test lane pass in the approved Windows environment.
15. No dependency is added.
16. No Git operation occurs.

## Negative Constraints

Do not:

- rewrite the global project/phase resolver;
- rewrite the Work Card loop resolver except for the narrow repair workspace authority path;
- require manual defect re-entry when validation evidence already has `repairDefectText`;
- use renderer state as repair authority;
- create hidden repair state, route tokens, sidecars, alternate repair cards, or completion markers;
- create duplicate Repair Architect handoffs for the same evidence revision;
- silently choose among multiple active repair handoffs or repair outputs;
- hard-code project-specific repository names into repair prompts;
- mutate validation records, Implementer Reports, Work Cards, closeouts, or unrelated planning artifacts outside the authorized flow;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

The Repair Work Card handoff must preserve the existing return target semantics from `createRepairWorkCard(...)`:

```text
postValidationRecord → work-card-validation
preValidationReportReview → work-card-building-review
```

This repair does not authorize redesigning the post-repair return path.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR07_repair_workspace_architect_handoff_flow.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact repair workspace presentation and action design;
- proof that `MVP-01` phase IDs work;
- proof that defect text is evidence-derived from the validation record;
- proof that handoff creation is idempotent;
- proof that Prepare/Copy Handoff works after the repair handoff exists;
- representative selected-workspace-bound Repair Work Card prompt output;
- proof that conflicts surface visibly;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review, the Operator must validate in the running application:

1. Request repair from Review & Validation.
2. Confirm the app opens a dedicated Work Card Repair workspace.
3. Confirm the workspace shows parent Work Card, evidence path, and repair defect text without retyping.
4. Create or reuse the Repair Architect handoff.
5. Prepare and copy the Repair Work Card Architect prompt.
6. Confirm embedded ChatGPT receives the selected-workspace-bound Repair Work Card prompt.
7. Create and promote the Repair Work Card draft.
8. Confirm the Repair Work Card appears for review at the exact target path.
