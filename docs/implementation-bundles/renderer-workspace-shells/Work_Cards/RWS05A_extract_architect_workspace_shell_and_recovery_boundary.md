# RWS05A — Extract Architect Workspace Shell and Structured Intake Recovery Boundary

**Status:** IMPLEMENTER_READY
**Bundle:** RWS05 Architect Workspace Family
**Baseline:** `dev` at `ac03b39c8cef6145cfd7caf3aa2fd39170939a4e`

## Objective

Extract the current Greenfield Architect Interview presentation out of `App.tsx` into a reusable Architect workspace shell while preserving the approved Greenfield interaction pattern.

Also remove the RWS04C transition defect where a SQL WorkflowIntake ID is sent through the legacy repository-document reader.

This card is presentation/boundary work only. Do not migrate Architect Interview output authority yet.

## Reference composition

The Greenfield Architect workspace currently lives primarily in `App.tsx` and composes:

- left document/review column;
- `FigmaDocumentCard`;
- Architect review/disposition controls;
- right embedded ChatGPT/browser;
- refresh/handoff/review feedback;
- selected output/revision state;
- responsive two-column geometry.

Extract that reusable composition into a component such as `ArchitectWorkspaceShell.tsx`.

The shell must accept typed slots/props for:

- heading/context/header actions;
- primary review/work content;
- review/disposition controls;
- right Architect/browser companion;
- errors/feedback where needed.

It must not know Greenfield-specific document types or Workflow semantics.

## App.tsx ownership reduction

Move Greenfield Architect Interview workspace JSX/composition out of `App.tsx`.

App may retain application routing, top-level selected Workflow/workspace identity, browser host ownership where host mechanics require it, and application-level refresh coordination.

Do not leave a second duplicate Architect workspace composition in App.

## Structured Intake recovery boundary

Direct navigation from an Approved Greenfield Intake into Architect Interview is valid even before an Architect Interview Prompt exists.

The current failure occurs because the SQL-backed Intake review projection carries the WorkflowIntake entity ID as its local logical identity, while the old recovery path assumes every recovery ID belongs to the repository planning-document inventory.

Repair the boundary as part of extraction:

- expose the SQL-backed Intake `PlanningDocumentDetail` directly to the Greenfield Architect adapter/shell when it is the recovery review surface;
- render it directly;
- do not pass its WorkflowIntake ID into the generic repository `readDocument` path;
- do not add generated Intake projections back into `listDocuments()`;
- keep generic repository read behavior unchanged.

After a real Architect Prompt/Interview repository document exists, normal repository-backed selection remains available until later cards replace that authority.

## Preserve

Preserve:

- current Greenfield Architect Interview visual geometry and controls;
- embedded ChatGPT on Architect workspaces;
- no ChatGPT on Intake;
- RWS03-R01/RWS04 stage rail behavior;
- SQL Intake authority and SQL Intake disposition;
- generated Intake projection exclusion from legacy planning-document discovery;
- current Architect Prompt/Interview behavior except the invalid SQL-ID read;
- current Greenfield rail statuses and navigation.

Do not touch Feature/Issue UI in this card.

## Focused proof

Extend existing renderer/Architect Interview owners to prove:

1. Architect shell renders the same left-review/right-browser composition.
2. Greenfield Architect Interview uses the shell.
3. Approved structured Intake + missing prompt opens without `Unknown logical document ID`.
4. SQL Intake recovery review detail renders without calling generic repository read with its entity ID.
5. Prompt/interview repository documents still use normal repository read behavior.
6. Intake remains browser-free.
7. Architect Interview remains browser-attached.
8. Existing top rail behavior is unchanged.

## Validation

Run the work-item validation plan, affected tests for this card, focused Architect Interview/renderer tests, and `git diff --check`.

Do not run full/release qualification.

## Implementer Report

Write `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05A_IMPLEMENTER_REPORT.md`.

## Checkpoint and continuation

Commit `RWS05A extract architect workspace shell and recovery boundary`.

If no bundle stop condition is met, continue directly to RWS05B without waiting for Architect review.
