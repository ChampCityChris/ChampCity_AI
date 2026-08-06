<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 4,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR09",
    "repairId": "WC46-REPAIR09",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR08_repair_evidence_workspace_and_prompt_flow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR09_repair_work_card_deterministic_target_path.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Repair Work Card Deterministic Target Path, Tabbed Review UI, and Approval Return Flow",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair target path, repair-card review UI, and repair implementation routing correction",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "The repair workflow used the full Repair Defect Text as the Repair Work Card filename slug, producing long, unreadable, fragile target paths. After WC46-REPAIR09 implementation, Operator validation also showed that the Repair workspace stacks repair status, evidence, Repair Work Card review, and disposition controls vertically instead of using the approved tabbed document-viewer model, making the repair card review surface unreadable. The repair loop also still requires correction so an approved Repair Work Card routes to Implement and a ready repair Implementer Report routes to Review & Validation.",
    "rootCause": "createRepairWorkCard(...) derived repairWorkCardTarget from the defect text slug, overloading substantive repair evidence as filename authority. WC46-REPAIR08 moved work-card-repair to a dedicated evidence-first renderer, and WC46-REPAIR09 restored a review panel by stacking the existing document/review components inside the already-stacked Repair workspace. That lost the approved tabbed document-viewer pattern used elsewhere and produced an unreadable UI. In the backend, repairLoopAuthority(...) began routing an Approved Repair Work Card to Build/Implement, but the repair implementation lifecycle must continue through Build when the repair report is missing or scaffolded and to Review & Validation when the repair-specific Implementer Report is ready. Codex implementer prompt plumbing is warranted for this repair because repair implementation must pass the approved Repair Work Card contract and repair-specific report target into the implementer prompt; it is now explicitly authorized only for that bounded purpose.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Use deterministic repair Work Card target paths, replace the stacked Repair review UI with the approved tabbed document-viewer model, and complete the approved Repair Work Card to Implement to Review & Validation route. Preserve full defect text as evidence, not filename authority.",
    "reviewedAt": "2026-08-05"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR09 — Repair Work Card Deterministic Target Path, Tabbed Review UI, and Approval Return Flow

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

Operator validation identified three related repair-workspace defects that belong in one bounded correction because they occur after `Request Repair` and before the repair implementation pass can be reviewed.

First, the Repair Work Card target path is derived from the complete `repairDefectText`. This produced an unusable filename similar to:

```text
planning/phases/MVP-01/Work_Cards/MVP-01-WC02-REPAIR01_operator_and_architect_identified_four_blocking_defects_and_one_issue_with_wc01_implementation_of_a_pester_suite_these_issues_will_need_addressed_in_a_repair.md
```

The defect text is substantive repair evidence. It should remain long, specific, and auditable. It must not control the artifact filename.

Second, the current Repair workspace presents the promoted Repair Work Card review surface by stacking repair status, repair evidence, Repair Work Card document preview, and disposition controls vertically in one crowded page. Operator visual validation showed this is not readable. The app already has an approved tabbed document-viewer model: document tabs at the top, one readable document viewport, and the disposition panel below the selected document. The Repair workspace must use that model instead of stacking multiple document panels and status blocks.

Third, the repair loop must complete the route after Repair Work Card approval. An Approved Repair Work Card is not the end of repair. It is the implementation contract for the repair pass. The expected sequence is:

```text
Request Repair
→ Validation Record creates repair authority
→ Repair workspace prepares/copies Repair Work Card prompt
→ Architect creates body-only Repair Work Card draft
→ app promotes Repair Work Card to deterministic target path
→ Operator reviews and approves or revision-requests the Repair Work Card
→ Approved Repair Work Card routes to Implement
→ Implement executes against the approved Repair Work Card, not the original Formal Work Card
→ repair-specific Implementer Report becomes ready for Review & Validation
→ Review & Validation reviews the repair report under Operator authority
```

## Source Evidence

Repository verified through ChampCity MCP as workspace `champcity_ai`, repository `ChampCityChris/ChampCity_AI`, branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The working tree is dirty from the active WC46 repair series. No Git mutation is authorized.

Relevant current source facts:

```text
src/main/workCardRepair/workCardRepairService.ts
- createRepairWorkCard(...) previously computed a slug from trimmedDefect and used it in the repair target path.
- repairWorkCardArchitectOutputDefinition promotes the body-only Repair Work Card to the handoff target path.
- full repairDefectText is already persisted in the Validation Record and Repair Architect handoff workflowData.
```

```text
src/renderer/app/WorkCardRepairWorkspace.tsx
- the Repair workspace displays repair evidence and prompt controls.
- the current review presentation stacks evidence/status/review content vertically and does not use the approved tabbed document-viewer pattern.
```

```text
src/renderer/app/App.tsx
- work-card-repair renders WorkCardRepairWorkspace instead of the generic Architect-output document shell.
- the Repair workspace therefore must explicitly provide an equivalent tabbed document viewer and disposition path for the promoted Repair Work Card.
```

```text
src/main/workCardLoop/workCardLoopAuthorityService.ts
- repairLoopAuthority(...) owns the repair routing branch.
- an Approved Repair Work Card must route to work-card-building-review while the repair report is missing or scaffolded.
- once the repair-specific Implementer Report is ready-for-review, the loop must route to work-card-report-review rather than remaining in Build.
```

```text
src/main/workCardBuilding/workCardBuildingReviewService.ts
- repair implementation must use the approved Repair Work Card path as the implementation contract.
- repair implementation must create or resolve a repair-specific Implementer Report target instead of overwriting or reusing the original parent Work Card report.
```

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
- the Codex implementer prompt must receive the implementation contract type, contract label, repair contract path, and repair-specific report path.
- this change is warranted for the approved Repair Work Card implementation route and is authorized by this revision only for that bounded purpose.
```

## Objective

Make Repair Work Card target paths deterministic, make the Repair Work Card review UI readable by using the approved tabbed document-viewer model, and finish the Repair Work Card approval path through Implement and repair Review & Validation.

Required product sequence:

```text
RevisionRequested Validation Record
→ Repair Architect handoff
→ Repair Work Card target path = planning/phases/{phaseId}/Work_Cards/{repairId}.md
→ full defect text remains in evidence and prompt, not filename
→ Repair Work Card draft is promoted to that path
→ Repair workspace displays the Repair Work Card as a reviewable gating document using tabs, one readable document viewport, and disposition controls
→ Operator applies Approved or RevisionRequested disposition
→ Approved Repair Work Card becomes the active Implement contract
→ current workspace routes to Implement for the repair
→ ready repair Implementer Report routes to Review & Validation
```

## Runtime Sequence

### New repair target creation

```text
Operator requests repair
→ Validation Record stores repairDefectText
→ app creates or reuses Repair Architect handoff
→ app assigns deterministic Repair Work Card target:
   planning/phases/{phaseId}/Work_Cards/{repairId}.md
→ prompt uses this exact target path
→ Architect draft promotes only to this exact target path
```

### Tabbed Repair review workspace

```text
Repair Work Card draft promoted
→ Repair workspace opens a tabbed document viewer
→ tabs include Validation Record, Implementer Report, Formal Work Card, and Repair Work Card when available
→ only one selected document body is shown at a time in a readable viewport
→ Repair Work Card is selected by default when it is Pending or RevisionRequested and requires disposition
→ disposition controls sit below the selected Repair Work Card using Architect-output review authority
```

### Repair Work Card review and approval

```text
Repair Work Card selected in Repair workspace
→ Operator can approve or revision-request the Repair Work Card
→ Approved Repair Work Card remains tied to the exact Repair Architect handoff
→ RevisionRequested Repair Work Card remains in Repair and can be revised at the same deterministic target path
```

### Repair implementation and review

```text
Repair Work Card Approved
→ active repair authority is parent Work Card + repairId
→ work-card-building-review opens as Implement while the repair report is missing, scaffolded, invalid, or pending implementation
→ implementation contract path is the Approved Repair Work Card path
→ Implementer Report target is repair-specific and application-owned
→ when repair Implementer Report is ready-for-review, current workspace routes to work-card-report-review
→ Review & Validation reviews the repair Implementer Report under the existing Operator authority model
```

## Required Changes

### 1. Stop using defect text as filename authority

Update `createRepairWorkCard(...)` so new Repair Work Card target paths are deterministic from the repair identity only.

Required target format:

```text
planning/phases/{phaseId}/Work_Cards/{repairId}.md
```

Examples:

```text
planning/phases/MVP-01/Work_Cards/MVP-01-WC02-REPAIR01.md
planning/phases/phase-08/Work_Cards/WC46-REPAIR09.md
```

Do not use `repairDefectText`, Operator notes, advisory summary, validation notes, title text, generated title text, or prompt text to build the filename.

The full defect text must remain preserved in:

```text
Validation Record workflowData.repairDefectText
Validation Record body
Repair Architect handoff workflowData.boundedDefect
Repair Work Card Architect prompt
Repair Work Card metadata/workflowData
Repair Work Card body produced by the Architect
```

### 2. Preserve or safely normalize existing active handoffs

Existing Repair Architect handoffs may already contain defect-slug target paths.

Required behavior:

- If an existing Repair Architect handoff already has a promoted Repair Work Card output or an active draft tied to the old target, do not rename, delete, or orphan it in this repair.
- If an existing active handoff has no promoted Repair Work Card output and no active draft, the app may normalize, supersede, or recreate the handoff to the deterministic target path, but must avoid duplicate active repair handoffs.
- If the active handoff is safely normalized, the normalized handoff must preserve the original evidence path, evidence revision, parent Work Card ID, repair ID, repair defect text, origin, and return target.
- Any conflict must surface as `needs-attention`; do not silently choose among active repair handoffs, active drafts, or Repair Work Card outputs.

### 3. Replace stacked Repair review UI with the approved tabbed document-viewer model

The Repair workspace must not stack repair evidence, repair status, Repair Work Card preview, and disposition controls into a long vertical surface.

Required layout:

```text
Repair workspace document viewer
→ tab row
   - Validation Record
   - Implementer Report
   - Formal Work Card
   - Repair Work Card, when promoted
→ one selected document viewport
→ compact metadata/status line or side strip
→ disposition panel below the selected Repair Work Card when disposition is applicable
→ embedded ChatGPT / prompt controls remain visually separate from document review
```

Required behavior:

- Before a Repair Work Card is promoted, the Validation Record tab is selected by default.
- After a Repair Work Card is promoted and is Pending or RevisionRequested, the Repair Work Card tab is selected by default.
- The Operator can switch tabs without losing review state.
- Only one document body is visible in the main viewer at a time.
- The document body viewport must be readable and independently scrollable, comparable to the approved Project Profile / Project Roadmap tabbed viewer pattern.
- Repair status details such as repair ID, return target, handoff readiness, and repair target path may appear as compact metadata, but must not dominate the document viewer.

### 4. Make promoted Repair Work Cards dispositionable from Repair workspace

When the Repair Work Card body-only draft has been promoted to its target path, the Repair workspace must give the Operator a clear review/disposition path for that Repair Work Card.

Required behavior:

- The promoted Repair Work Card document is visible as the selected tab/current output slot.
- The Operator can apply `Approved` or `RevisionRequested` disposition from the Repair workspace.
- The review action must use the existing Architect-output review authority for `work-card-repair`, including stale presented-revision protection.
- Generic document disposition must not be used to bypass Architect-output review authority.
- When `RevisionRequested` is applied to the Repair Work Card, current Operator revision notes remain available to the repair prompt path and the workspace remains in Repair.

### 5. Route Approved Repair Work Card to Implement, then route ready repair report to Review & Validation

After the Repair Work Card is approved, the Work Card loop must route to `work-card-building-review` for implementation of the approved Repair Work Card until the repair-specific Implementer Report is ready for review.

Required behavior:

```text
Repair Work Card Approved
→ current active repair remains scoped to parent Work Card and repair ID
→ active workspace becomes work-card-building-review while repair report is missing/scaffolded/incomplete
→ Implement context uses the approved Repair Work Card path as the implementation contract
→ Implementer Report target is application-owned and specific to the repair
→ once the repair-specific Implementer Report is ready-for-review, active workspace becomes work-card-report-review
```

The route must not skip directly from Approved Repair Work Card to Validation, Close, or Work Card Map.

The route must preserve repair identity:

```text
parentWorkCardId = original Work Card under repair
repairId = approved Repair Work Card ID
current Work Card identity shown to the Operator makes clear this is repair implementation
```

### 6. Add repair-specific Implement context, report target authority, and Codex prompt context

The Implement workspace may keep the internal workspace ID `work-card-building-review`, but its projection must support an approved Repair Work Card as the implementation contract.

Required behavior:

- The Implement projection must distinguish original Formal Work Card implementation from Repair Work Card implementation.
- For repair implementation, the approved Repair Work Card path is the contract path.
- The displayed contract label must not falsely say `Approved Formal Work Card` when the active contract is a Repair Work Card. Use a generic label such as `Approved Work Card Contract` or an explicit label such as `Approved Repair Work Card Contract`.
- The repair Implementer Report target must be deterministic and repair-specific.
- Recommended repair report target format:

```text
planning/phases/{phaseId}/Implementer_Reports/IMPLEMENTER_REPORT_{repairId}.md
```

- Do not overwrite or reuse the original parent Work Card Implementer Report for repair implementation.
- Do not treat the repair ID as a new Work Card Plan candidate.
- `src/main/workCardBuilding/codexImplementerExecutionService.ts` is authorized to change only as needed to carry the implementation contract type, contract label, approved Repair Work Card path, and repair-specific report target into the Codex prompt/session context.
- Formal Work Card Codex behavior and wording must remain unchanged for non-repair implementation.

### 7. Keep post-repair return target semantics intact

Do not redesign the post-repair return path in this card.

Existing return-target semantics remain:

```text
postValidationRecord → work-card-validation
preValidationReportReview → work-card-building-review
```

For this repair, those return targets apply after the Repair Work Card has been implemented and reviewed according to the existing repair workflow. They do not authorize skipping the Repair Work Card implementation step after Repair Work Card approval.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR08 evidence-first Repair workspace model, except where replaced by the approved tabbed document-viewer pattern;
- Validation Record as the repair authority for post-validation repairs;
- evidence-derived `repairDefectText` from `RevisionRequested` Validation Record;
- selected-workspace-bound Repair Work Card prompt model;
- Repair Work Card promotion through the existing Architect-output runtime;
- stale presented-revision protection for Architect-output review;
- Work Card loop active-candidate lock;
- original Formal Work Card implementation path for non-repair Work Cards;
- formal Work Card Codex prompt wording for non-repair implementation;
- Implement label and Codex final-read behavior from WC46-REPAIR06;
- no hidden state, sidecars, route tokens, alternate repair documents, or separate advisory-review documents;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/workCardRepair/workCardRepairService.ts
src/main/workCardLoop/workCardLoopAuthorityService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/architectOutputs/architectOutputWorkspaceService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/app/WorkCardRepairWorkspace.tsx
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/renderer/app/WorkCardReportReviewWorkspace.tsx
src/renderer/styles.css
```

`workCardBuildingReviewService.ts` is authorized only to support approved Repair Work Cards as implementation contracts and to create/resolve repair-specific Implementer Report targets. Do not redesign the entire Implement workspace.

`workCardLoopAuthorityService.ts` is authorized only for the repair-loop transition from approved Repair Work Card to Implement, from ready repair report to Review & Validation, and for downstream repair implementation binding. Do not rewrite the global project/phase resolver.

`codexImplementerExecutionService.ts` is authorized only because repair implementation must provide Codex with the correct repair contract label/path and repair-specific Implementer Report path. Do not change provider integration, SDK lifecycle, final-read semantics, retry policy, safety restrictions, or unrelated Codex execution behavior.

Tests authorized:

```text
test/work-card-repair/work-card-repair-service.test.cjs
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-building/codex-implementer-execution-service.test.cjs
test/work-card-loop/work-card-loop-authority-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-repair-workspace.test.cjs
test/renderer/work-card-report-review-workspace.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
test/repository/runtime-wiring-source.test.cjs
test/app-shell/app-shell.test.cjs
```

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md
```

## Acceptance Criteria

1. New Repair Work Card targets use `planning/phases/{phaseId}/Work_Cards/{repairId}.md`.
2. `repairDefectText` is never used as the Repair Work Card filename slug.
3. Full repair defect text remains preserved in Validation Record evidence, Repair Architect handoff workflowData, Repair Work Card prompt, metadata/workflowData, and Repair Work Card body.
4. Existing active defect-slug handoffs with promoted outputs or active drafts are not renamed, deleted, orphaned, or silently replaced.
5. Existing active defect-slug handoffs without promoted output or active draft are either safely normalized to deterministic target path or visibly blocked; no duplicate active repair handoffs are created.
6. The Repair workspace uses the approved tabbed document-viewer pattern rather than stacking all evidence/status/review panels vertically.
7. The Repair workspace tabs include Validation Record, Implementer Report, Formal Work Card, and Repair Work Card when available.
8. Before Repair Work Card promotion, Validation Record is selected by default. After Repair Work Card promotion while disposition is pending, Repair Work Card is selected by default.
9. Only one selected document body is visible in the main repair document viewer at a time, and the document body is readable with a dedicated scroll area.
10. A promoted Repair Work Card appears in the Repair workspace as a reviewable/dispositionable gating document.
11. Repair Work Card disposition from the Repair workspace uses the existing Architect-output review authority and stale presented-revision checks.
12. Approved Repair Work Card routes the Work Card loop to `work-card-building-review` / Implement while the repair-specific Implementer Report is missing, scaffolded, invalid, or otherwise not ready for review.
13. Once the repair-specific Implementer Report is ready-for-review, the Work Card loop routes to `work-card-report-review` / Review & Validation.
14. RevisionRequested Repair Work Card remains in Repair and can be revised through the same deterministic target path.
15. Implement projection for repair shows the approved Repair Work Card as the implementation contract, not the original Formal Work Card.
16. Repair implementation uses a repair-specific Implementer Report target and does not overwrite the original parent Work Card report.
17. Codex Implementer prompt/session context for repair uses the approved Repair Work Card contract label/path and repair-specific Implementer Report path, while non-repair Codex prompt behavior remains unchanged.
18. The route does not skip from approved Repair Work Card directly to Validation, Close, or Work Card Map.
19. Non-repair Work Card implementation behavior remains unchanged.
20. Typecheck, build, focused tests, and full test lane pass in the approved Windows environment.
21. No dependency is added.
22. No Git operation occurs.

## Negative Constraints

Do not:

- use repair defect text, Operator notes, advisory summary, or generated title text as filename authority;
- let the Architect choose or alter the final Repair Work Card path from the body;
- create duplicate active Repair Architect handoffs;
- silently choose among conflicting active repair handoffs, drafts, or outputs;
- delete, rename, or orphan existing promoted Repair Work Card outputs;
- stack all Repair evidence/status/review panels into one unreadable vertical UI;
- bypass Architect-output review authority with generic document disposition;
- route an approved Repair Work Card directly to Validation, Close, or Work Card Map;
- keep a ready repair Implementer Report in Build/Implement instead of Review & Validation;
- overwrite the original parent Work Card Implementer Report for repair implementation;
- treat a repair ID as a new Work Card Plan candidate;
- rewrite the global project/phase resolver;
- redesign post-repair return-target semantics;
- change Codex provider integration, SDK lifecycle, final-read behavior, retry policy, or unrelated execution behavior;
- add hidden state, route tokens, sidecars, alternate repair documents, completion markers, or separate advisory-review documents;
- add dependencies;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

Preserve existing return-target semantics:

```text
postValidationRecord → work-card-validation
preValidationReportReview → work-card-building-review
```

This repair does not authorize redesigning post-repair execution return behavior. The return target is preserved as repair workflow metadata and applies after the repair implementation/report/review path has completed under the existing process.

## Implementer Report Requirements

Create exactly:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR09_repair_work_card_deterministic_target_path.md
```

The report must include:

- repository path, branch, remote, and working status verification;
- all changed files;
- confirmation that no Git mutation occurred;
- exact deterministic Repair Work Card target-path design;
- proof that defect text remains preserved but is not filename authority;
- proof of safe behavior for existing defect-slug handoffs with and without promoted output/draft;
- proof that the Repair workspace uses a tabbed document-viewer model and not stacked unreadable panels;
- proof that Repair Work Card can be dispositioned from Repair workspace;
- proof that Repair Work Card review uses Architect-output authority and stale revision protection;
- proof that Approved Repair Work Card routes to Implement while the repair report is not ready;
- proof that ready repair Implementer Report routes to Review & Validation;
- proof that Implement uses the approved Repair Work Card as the repair implementation contract;
- proof that repair implementation uses a repair-specific Implementer Report target;
- proof that Codex Implementer prompt context changes are limited to repair contract label/path and repair report target support;
- proof that RevisionRequested Repair Work Card remains in Repair for correction;
- proof that non-repair Work Card implementation behavior remains unchanged;
- commands run and results;
- validation skipped and reason;
- residual risks and Operator manual validation remaining.

End with:

```text
Document.Status=Pending
```

## Manual Validation

After Architect review, the Operator must validate in the running application:

1. Request Repair from Review & Validation with a long repair defect text.
2. Prepare the Repair Work Card prompt.
3. Confirm the Repair Target path is short and deterministic, ending in `{repairId}.md`.
4. Confirm the full defect text remains visible in the Validation Record and Repair prompt.
5. Create and promote the Repair Work Card draft.
6. Confirm the Repair workspace uses tabs for evidence/repair-card documents and shows one readable selected document at a time.
7. Confirm the Repair Work Card tab is selected for review once the Repair Work Card exists.
8. Approve the Repair Work Card.
9. Confirm the app routes to Implement.
10. Confirm Implement shows the approved Repair Work Card as the current implementation contract.
11. Confirm the repair Implementer Report target is repair-specific and does not overwrite the original parent Work Card Implementer Report.
12. After a ready repair Implementer Report exists, confirm the app routes to Review & Validation.
