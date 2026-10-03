# WSF17 — Recover Work Card Repair shell

**Type:** Work Card  
**Depends on:** WSF03A, WSF15A, and WSF16A — typed candidate ingress, report-review Repair provenance, structured Repair adapter  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/WorkCardRepairWorkspace.tsx@965536de` and deleted renderer characterization  
**Current defect/state:** Deleted by RWS06J-C; repair creation/execution is folded into generic Execution.

## Objective

Recover Work Card Repair as a reusable shell preserving defect evidence, repair scope, Architect browser/handoff composition, repair Work Card review, implementation/validation context, and return-to-parent behavior.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardRepairShell.tsx`
- `src/renderer/app/WorkCardRepairWorkspace.tsx`
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

- Repair workspace visibly retains parent Work Card/failed evidence context.
- Architect/browser/review composition matches recovered baseline.
- Shell supports repeated repair loops without owning canonical repair relationships.
- Current SQL repair lineage and actions are supplied by the WSF16A exact Repair adapter.
- Manual Report Review Repair uses the exact WSF15A `work-item-validation-review` Decision; Criterion/Tester's existing failure routes remain supported.
- Refresh/retry recovers an existing active Repair for the exact failure identity rather than creating a duplicate.
- Repair planning uses WSF03A WorkItem candidate ingress; implementation and validation reuse WSF15/WSF16/WSF18 building blocks rather than a private Repair execution stack.
- Current SQL Repair return semantics are surfaced honestly; do not fake historical parent completion in renderer state.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF17_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF17 recover work card repair shell`
