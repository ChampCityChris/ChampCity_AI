# WSF01 — Recover nested lifecycle navigation rail shell

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/NestedWorkflowRail.tsx` and lifecycle-rail composition at `965536de`  
**Current defect/state:** Deleted by RWS06J-C; current `WorkflowStageRail` is a different flat stage model.

## Objective

Recover the Project → Phase → Work Card nested navigation rail as a reusable shell. The rail presents supplied hierarchy/status/navigation callbacks only; it does not own canonical state.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/NestedWorkflowRailShell.tsx`
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

- Project, Phase, and Work Card levels render with the same hierarchy and status semantics as the pre-RWS Greenfield rail.
- Current/available/completed/not-ready presentation is supplied through props and does not mutate lifecycle state.
- Navigation callbacks identify the selected workspace/entity without calling services directly.
- Responsive/scroll/selection behavior matches recovered characterization evidence.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF01_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF01 recover nested lifecycle navigation rail shell`
