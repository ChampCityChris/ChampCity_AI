# WSF16 — Recover Review and Validation shell

**Type:** Work Card  
**Depends on:** WSF14A and WSF15A — durable Implementer Report + structured WorkItem validation/report-review foundation  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/WorkCardReportReviewWorkspace.tsx@965536de` and deleted renderer characterization  
**Current defect/state:** Deleted by RWS06J-C; current `ReviewValidationShell` is a generic SQL evidence dump embedded in Execution.

## Objective

Recover the Work Card Review & Validation workspace as a distinct reusable shell preserving implementation report review, Tester/validation evidence, document comparison/review, Operator controls, repair handoff, and nested navigation.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardReviewValidationShell.tsx`
- `src/renderer/app/WorkCardReviewValidationWorkspace.tsx`
- `src/renderer/styles.css`

Additional CSS/test changes are allowed only when required to restore exact historical presentation behavior.

## Forbidden changes

- no SQL/domain/schema changes;
- no `window.champcity` calls inside the shell;
- no workflow-type branching inside the shell;
- no new generic replacement for another workspace;
- no deletion/cleanup of historical UI during this card;
- no changes to other workflow families;
- no Markdown authority restoration.

## Acceptance

- Review & Validation is a complete workspace, not an evidence subsection.
- Document/report/evidence hierarchy and Operator actions match recovered behavior.
- Repair routing is exposed as a callback/slot; shell does not create Repair state itself.
- Current SQL validation/review projections can drive the recovered presentation.
- The adapter uses the WSF15A `WorkItemValidationCycle` for aggregate Report Review / Operator decision state; it does not invent renderer-local review state.
- The historical advisory Architect flow is restored through WSF15A typed `work-item-review-advisory` ingress; advisory output is read from SQL.
- Tester execution/status/evidence required by current completion policy is exposed in an adapter-supplied action/evidence region without replacing the recovered workspace with generic Execution UI.
- `ValidatePassed` is enabled only when current Tester + criterion proof satisfy WSF15A/current completion eligibility.
- `RequestRepair` requires explicit defect text, records the exact SQL review Decision, and navigates through the supplied Repair callback; the shell itself does not create Repair authority.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF16_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF16 recover review and validation shell`
