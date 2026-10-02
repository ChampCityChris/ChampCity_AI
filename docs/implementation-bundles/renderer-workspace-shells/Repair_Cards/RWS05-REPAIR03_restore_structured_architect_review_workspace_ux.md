# RWS05-REPAIR03 — Restore Structured Architect Workspace Review UX

**Status:** IMPLEMENTER_READY  
**Parent:** RWS05 Architect Workspace Family  
**Reviewed source baseline:** `ce5e5c6ec0c96303cc9af498cef79e304db709e0`  
**Repair type:** shared renderer/source defect

## Review evidence

The RWS05 structured Architect family is semantically SQL-backed, but the current shared renderer does not present that state as a usable Architect review workspace.

Confirmed production defects:

1. `StructuredArchitectWorkspace.tsx` places Prepare / Refresh and Copy handoff in the left review column instead of a Browser Actions surface beside the embedded ChatGPT companion.
2. The left column repeats stage/title/Workflow/instructional text above the document viewer even though stage identity is already carried by the application workflow presentation.
3. `FigmaDocumentCard` already supports tabs, but `StructuredArchitectWorkspace` supplies only `model.reviewDocument`, so the approved Intake projection is absent and the viewer is not tabbed.
4. The first useful document for Architect work already exists semantically in SQL: the current approved `WorkflowIntake`. The existing Intake projection writer can render that record without making Markdown authoritative.
5. Review controls are raw buttons in an unstyled `<div>`, while the renderer already has explicit disposition-panel styling primitives. In the observed UI, Approve / Revision Requested / Reject visually collapse into ordinary text.
6. `StructuredArchitectWorkspace` requires the Operator to click **I have reviewed this revision** before any disposition is enabled. `PlanReviewShell` repeats the same prerequisite across Project Planning, exact Workflow Planning, Phase Map/Planning, and WorkItem Planning. That acknowledgement is redundant with the actual exact-revision disposition.
7. Exact revision safety already exists below the renderer: typed review commands require the current `expectedRecordVersion` and reject stale revisions. Removing the acknowledgement click must not weaken that currentness enforcement.

## Objective

Make the shared structured Architect workspace behave as a real document-review workspace for every Architect workflow while preserving SQL as semantic authority.

The completed surface must present the approved Intake first, add the generated Architect Review as a second review document when it exists, expose real handoff actions next to ChatGPT, show an explicit styled disposition surface for the current Architect Review, and remove the application-wide **I have reviewed this revision** prerequisite.

This repair is shared behavior. Do not implement a Greenfield-only screen.

## Required implementation

### 1. Supply the SQL-derived Intake document to the Architect workspace

Extend the structured Architect application model with a reviewable Intake document derived directly from the exact current `WorkflowIntake` record and its SQL disposition.

Reuse the existing Intake projection contract/writer logic such as `intakeReviewDocument(...)`, or extract a narrowly shared projection helper if needed.

Requirements:

- do not call the legacy planning-document repository reader with a SQL entity ID;
- do not parse a generated Markdown file back into semantic state;
- do not make successful filesystem materialization a prerequisite for display;
- the displayed Markdown body must be reproducible from SQL even if the generated projection file is absent;
- the document must retain the exact Workflow/Intake identity and revision represented by the projection.

For `project-creation`, the first tab label should be **Project Intake**. For other workflow families, use the workflow-appropriate Intake label or a concise **Intake** label.

### 2. Use the existing document viewer as a true multi-tab review surface

`StructuredArchitectWorkspace` must provide document slots/selections to `FigmaDocumentCard`.

Required behavior:

- before any Architect output exists, the Intake tab is selected and its SQL-derived Markdown is visible;
- after the user saves a new or revised structured Architect output, add/select the **Architect Review** tab automatically;
- reopening a workspace with an active pending or revision-requested Architect review should surface that current Architect Review directly while retaining the Intake tab for reference;
- approved reviews remain reviewable and the Intake remains available;
- changing tabs changes only presentation, never semantic authority;
- do not create canonical Markdown merely to populate a tab.

Do not introduce a new bespoke document viewer. Reuse the shared document-card/tab presentation.

### 3. Restore a real Browser Actions surface for structured Architect work

Add a semantic-neutral Browser Actions slot/panel to the shared Architect shell or an equivalent shared composition point.

For every structured Architect workflow it must expose at least:

- **Reload ChatGPT** using the real browser reload action;
- **Prepare / Refresh Handoff** using `prepareStructuredArchitectWorkspace`;
- **Copy Handoff** using the current SQL-derived handoff.

The actions must appear as actual styled buttons in a Browser Actions panel adjacent to/below the ChatGPT companion, not as loose text/buttons above the left document viewer.

Do not reuse the legacy `FigmaBrowserActionsPanel` by forcing a structured workspace through `ArchitectOutputWorkspaceModel`. If its presentation is reused, generalize the presentation to explicit typed callbacks/capabilities rather than reintroducing legacy authority.

Browser attach/reload/retry mechanics remain application/browser-host concerns; this card only gives the structured workspace a proper action surface.

### 4. Remove duplicate left-column clutter

The structured Architect left review column must not repeat loose informational blocks that add no action or document context.

Remove or relocate the current duplicate:

- stage heading where already provided by the surrounding application/workflow presentation;
- project/workflow title text used only as decoration;
- raw `Workflow <UUID>` line;
- generic instructional paragraph;
- Prepare / Refresh and Copy handoff controls.

Retain necessary navigation such as Back to Workflows, but place it in a deliberate shell/navigation location rather than mixing it into document content.

The primary left surface should read as a document-review workspace, not a debug/status dump.

### 5. Make Architect disposition explicit and visually actionable

When the **Architect Review** tab is selected and a current review revision exists, show a deliberate disposition panel using existing Figma disposition styling or a shared equivalent.

It must visibly contain:

- Operator review notes;
- **Approve**;
- **Revision Requested**;
- **Reject**.

Buttons must look and behave like controls. Never represent an action as ordinary text.

When the Intake tab is selected, do not show Architect Review disposition controls.

`Revision Requested` continues to require nonempty bounded notes. Approve and Reject do not gain a new notes requirement.

### 6. Remove the "I have reviewed this revision" prerequisite from the application

Delete the acknowledgement control and its renderer-only gating state.

This applies to both current implementations:

- `StructuredArchitectWorkspace.tsx`;
- `PlanReviewShell.tsx`.

After this repair, an exact current review revision may be disposed directly with Approve / Revision Requested / Reject.

Preserve exact-revision safety:

- the renderer must still send the current `expectedRecordVersion`;
- stale review commands must still fail in the application/domain service;
- saving a revised candidate must still invalidate an earlier disposition where the existing contract requires it;
- `Revision Requested` still requires notes;
- no review command may be enabled when there is no current review revision.

If `src/shared/structuredArchitectReviewState.ts` becomes unused after removal of the viewed-revision acknowledgement, remove it and its dead tests/imports rather than retaining orphaned state machinery.

Also remove equivalent `viewed` / `revisionKey` acknowledgement state from `PlanReviewShell`. The actual review decision is the Operator acknowledgement.

### 7. Preserve structured JSON transport

This repair does not redesign how structured Architect output is pasted/submitted.

Retain:

- workflow-specific candidate validation;
- bounded structured JSON transport;
- SQL candidate persistence;
- `ArchitectReviewCycle`;
- generated Markdown review projection;
- exact Operator Decision semantics.

The structured JSON editor may be repositioned within the document/review composition if needed, but do not replace it with canonical Markdown input.

## Shared workflow coverage

The Architect document/actions/disposition behavior must work through the shared implementation for:

- Project Creation / Greenfield;
- Feature / Capability;
- Issue Resolution / RCA;
- Refactor / Migration;
- Integration / Composition;
- Infrastructure / Platform;
- Research / Prototype.

The acknowledgement-prerequisite removal must also cover every current `PlanReviewShell` consumer, including the RWS06 planning/review surfaces.

## Preserve

Do not change:

- SQL semantic authority;
- `WorkflowIntake` or `ArchitectReviewCycle` identity/version semantics;
- typed Architect output contracts;
- Intake or Architect-review Decision rules other than removing the renderer acknowledgement prerequisite;
- Planning topology or execution semantics;
- optional WIR behavior;
- global `project_state_authority`;
- legacy write fence;
- browser attachment lifecycle;
- generated Markdown as projection-only output;
- unrelated RWS06J preparation files or unrelated dirty worktree changes.

## Explicitly out of scope

- Markdown Export / Save As implementation;
- fake ChatGPT browser chrome removal;
- general document Open behavior;
- RWS06A–I lifecycle repairs;
- RWS06J authority cutover;
- architecture-document cleanup;
- historical Markdown cleanup;
- visual redesign of unrelated workspaces.

Those shared browser/document primitive defects belong to RWS05-REPAIR04.

## Expected production areas

Primary:

- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`
- `src/shared/architectWorkspaceContracts.ts`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/ArchitectWorkspaceShell.tsx`
- `src/renderer/app/PlanReviewShell.tsx`
- `src/renderer/styles.css`

Potential narrow supporting paths:

- `src/main/workflow/workflowIntakeProjectionWriter.ts`
- `src/shared/structuredArchitectReviewState.ts` if it becomes dead
- existing renderer/workflow test owners

Do not expand into `App.tsx` stage-specific legacy composition unless a small routing cleanup is strictly required by the shared shell.

## Focused proof

Extend existing stable owners rather than creating unnecessary new test files.

Prove at minimum:

1. Greenfield Architect Interview initially renders the SQL-derived Project Intake document.
2. Each other structured Architect workflow initially exposes its exact current Intake projection.
3. Saving Architect output adds/selects the Architect Review tab without removing Intake.
4. Pending/revision-requested review reopening resolves to the current review revision and still exposes Intake.
5. Selecting Intake hides Architect disposition controls.
6. Selecting Architect Review shows clearly actionable Approve / Revision Requested / Reject controls.
7. Prepare / Refresh Handoff and Copy Handoff are present in the Browser Actions surface for all shared Architect workflows.
8. No structured Architect workflow requires `ArchitectOutputWorkspaceModel` merely to render Browser Actions.
9. The literal text **I have reviewed this revision** no longer exists in production renderer source.
10. `PlanReviewShell` dispositions no longer require renderer `viewed` state.
11. Approve/Reject can call the typed exact-revision review command immediately when a current revision exists.
12. Revision Requested remains disabled without notes.
13. Stale `expectedRecordVersion` review commands are still rejected by the existing application/domain service.
14. No SQL ID is sent to legacy planning-document read APIs.
15. Existing workflow-specific Architect candidate validation remains unchanged.

## Validation

Run:

- focused structured Architect renderer/application tests;
- focused PlanReviewShell/RWS06 planning renderer tests affected by acknowledgement removal;
- affected work-item profile using the exact changed-path set;
- production build/typecheck as required by repository validation policy;
- `git diff --check`.

Do not turn unrelated existing failures into this repair.

## Acceptance criteria

RWS05-REPAIR03 passes when:

1. The Architect workspace opens with the approved SQL Intake visible as the first document.
2. The document viewer is multi-tabbed once Architect Review exists.
3. Handoff actions are in a real Browser Actions panel beside the ChatGPT companion.
4. Duplicate debug/instructional clutter is removed from above the document viewer.
5. Architect disposition controls are visibly actionable and shown only for the Architect Review document.
6. The application no longer contains the **I have reviewed this revision** prerequisite in either structured Architect or shared Plan review surfaces.
7. Exact revision/currentness enforcement remains in the typed review commands.
8. All seven Architect workflow families receive the shared behavior.
9. SQL remains authoritative and generated Markdown remains a projection.
10. Focused owned proof passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR03_IMPLEMENTER_REPORT.md`

Include:

- source root cause;
- exact files changed;
- workflow coverage matrix;
- document-tab selection behavior;
- Browser Actions behavior;
- acknowledgement-prerequisite removal proof;
- stale-revision proof;
- focused/affected validation results;
- unrelated failures observed;
- deviations, if any.

## Checkpoint

Commit:

`RWS05-R03 restore structured architect review workspace UX`

Return the checkpoint and Implementer Report for source-code review.

This card creates no Operator approval or execution gate.
