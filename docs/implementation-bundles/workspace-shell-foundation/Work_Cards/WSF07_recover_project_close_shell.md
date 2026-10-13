# WSF07 — Recover Project Close shell

**Type:** Work Card  
**Depends on:** WSF05A — structured Project/Phase Closeout review-cycle foundation  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` project-close composition, Project closeout presentation, and lifecycle controls  
**Current defect/state:** No dedicated Project Close workspace remains; generic `CloseAdvanceShell` is used instead.

## Objective

Recover Project Close as a distinct shell preserving final Project evidence, close/do-not-close controls, rationale, final status, and navigation behavior from working Greenfield.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/ProjectCloseShell.tsx`
- `src/renderer/app/ProjectCloseWorkspace.tsx`
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

- Project Close presents project-specific close evidence and controls rather than a generic entity close form.
- Close/readiness state is adapter-supplied from current SQL services.
- Viewing the shell does not mutate Project/Workflow state.
- Final completion/return behavior matches recovered Greenfield interaction.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF07_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF07 recover project close shell`
