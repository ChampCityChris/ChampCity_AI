# WSF03 — Recover Architect Interview shell

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` and faithful RWS05A extraction `aab61ed` (`GreenfieldArchitectWorkspace` / `ArchitectWorkspaceShell`)  
**Current defect/state:** `GreenfieldArchitectWorkspace` was removed; current `StructuredArchitectWorkspace` is a different generic structured-output surface.

## Objective

Recover the working Greenfield Architect Interview container: document/review column, embedded Architect browser, browser actions, handoff controls, review/disposition controls, and navigation slots.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/ArchitectInterviewShell.tsx`
- `src/renderer/app/GreenfieldArchitectWorkspace.tsx`
- `src/renderer/app/ArchitectWorkspaceShell.tsx`
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

- Dual-pane layout, browser visibility behavior, review document selection, handoff actions, feedback, and disposition controls match the recovered Greenfield workspace.
- Shell exposes typed slots/callbacks only and contains no service calls.
- Greenfield adapter uses current structured Architect SQL state without changing the recovered workspace composition.
- Browser pane and review pane retain independent bounded scrolling.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF03_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF03 recover architect interview shell`
