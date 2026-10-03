# WSF19 — Recover Work Card Close shell

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/WorkCardCloseWorkspace.tsx@965536de` and deleted renderer characterization  
**Current defect/state:** Deleted by RWS06J-C; generic `CloseAdvanceShell` substituted.

## Objective

Recover Work Card Close as a reusable terminal shell preserving completed Work Card evidence, final validation/repair context, return-to-map / next-card behavior, and nested navigation. Historical source proves there is **no second Close/DoNotClose decision or rationale** at this level.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardCloseShell.tsx`
- `src/renderer/app/WorkCardCloseWorkspace.tsx`
- `src/renderer/styles.css`

Additional CSS/test changes are allowed only when required to restore exact historical presentation behavior.

## Forbidden changes

- no SQL/domain/schema changes;
- no `window.champcity` calls inside the shell;
- no workflow-type branching inside the shell;
- no new generic replacement for another workspace;
- no deletion/cleanup of historical UI during this card;
- no changes to other workflow families;
- no Markdown authority restoration;
- no Project/Phase Closeout semantics copied into Work Card Close;
- no new WorkItem closeout entity or Decision.

## Acceptance

- Work Card Close is Work Card-specific and matches recovered baseline status/evidence/actions.
- It renders only after SQL says the exact WorkItem is closed; it does not own or repeat closure.
- Final WSF15A validation-cycle projection, Implementer/Tester evidence and Repair lineage may be shown read-only.
- There is no Close/DoNotClose selector, no close rationale and no new WorkItem close Decision.
- The primary historical action is return to Phase Building / Work Card Map / next Work Card; routing is an adapter callback.
- Reopen may resolve directly to the next canonical SQL stage rather than persisting a fake Work Card Close state.
- Recovered characterization proves terminal evidence and return-selection behavior.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF19_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF19 recover work card close shell`
