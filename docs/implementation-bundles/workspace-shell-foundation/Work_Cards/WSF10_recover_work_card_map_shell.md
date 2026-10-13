# WSF10 — Recover Work Card Map shell

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/WorkCardMapWorkspace.tsx@965536de` and its deleted renderer characterization tests  
**Current defect/state:** Deleted by RWS06J-C; current generic `WorkMapShell` is not parity.

## Objective

Recover the Work Card Map workspace as a reusable Phase-level shell that presents candidate Work Cards, readiness/state, selection, dependencies, current/next card, and map actions exactly as the working Greenfield UI.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardMapShell.tsx`
- `src/renderer/app/WorkCardMapWorkspace.tsx`
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

- Work Card cards/map layout and interaction match the deleted workspace rather than generic list output.
- Selection/navigation callbacks are shell props and do not mutate lifecycle state directly.
- Map accepts arbitrary Work Card projections for any Phase.
- Recovered characterization tests prove the old behavior again.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF10_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF10 recover work card map shell`
