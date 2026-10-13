# WSF05 — Recover Project Phase Map shell

**Type:** Work Card  
**Depends on:** WSF03A — reusable typed Architect candidate SQL ingress  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/phaseMapPresentation.tsx` (`FigmaPhaseMapWorkspace`) and Greenfield App composition at `965536de`  
**Current defect/state:** `FigmaPhaseMapWorkspace` survives but Greenfield now uses `StructuredPhaseMapWorkspace` plus generic `WorkflowPlanningMap`.

## Objective

Turn the proven Figma Phase Map workspace into the reusable Project Phase Map shell and reconnect Greenfield's SQL-backed Phase Map adapter to it.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/ProjectPhaseMapShell.tsx`
- `src/renderer/app/phaseMapPresentation.tsx`
- `src/renderer/app/StructuredPhaseMapWorkspace.tsx`
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

- Recovered phase-map cards/layout, document preview, phase selection/expansion, acceptance/review controls, and Architect companion match the working Greenfield UI.
- Shell accepts phase/map projections and callbacks; it owns no SQL or lifecycle transitions.
- Greenfield Phase Map uses current structured SQL data while rendering the recovered Phase Map experience.
- Generic WorkMap/WorkflowPlanningMap presentation is not used as the Project Phase Map replacement.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF05_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF05 recover project phase map shell`
