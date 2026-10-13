# WSF02 — Recover Project Intake shell

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` and faithful RWS01 extraction `aa80474` (`ProjectIntakeWorkspace` / `IntakeWorkspaceShell`)  
**Current defect/state:** Current intake shell survived, but its composition and state wiring have changed during structured-state migration.

## Objective

Recover the exact Project Intake workspace container as a reusable shell while retaining current SQL-backed Greenfield intake adapter behavior.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/ProjectIntakeShell.tsx`
- `src/renderer/app/ProjectIntakeWorkspace.tsx`
- `src/renderer/app/IntakeWorkspaceShell.tsx`
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

- Project Name, Purpose, Desired Outcome, Project Type, existing-source question, constraints, repository selector, conditional context, submit/review controls appear in recovered order/geometry.
- Document companion and disposition/review area match the working Greenfield composition.
- Post-submit/review states remain visible without moving authority into the shell.
- Current SQL intake adapter can drive the shell without presentation changes.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF02_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF02 recover project intake shell`
