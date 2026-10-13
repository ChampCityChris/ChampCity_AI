# WSF14 — Recover Work Card Planning shell

**Type:** Work Card  
**Depends on:** WSF03A — reusable typed Architect candidate SQL ingress  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` Work Card Planning composition plus `workCardPlanPresentation.tsx`  
**Current defect/state:** Distinct planning workspace was collapsed into WorkItem planning inside generic Execution.

## Objective

Recover Work Card Planning as a distinct reusable shell preserving Formal Work Card/plan presentation, Architect browser companion, revision/handoff controls, dependencies/constraints, and review disposition.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardPlanningShell.tsx`
- `src/renderer/app/WorkCardPlanningWorkspace.tsx`
- `src/renderer/app/workCardPlanPresentation.tsx`
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

- Work Card Planning is visually distinct from Project and Phase Planning while using reusable internal primitives where already proven.
- Formal Work Card/plan content and review controls match baseline.
- Shell receives exact Work Card plan projection and actions via props only.
- Planning can loop for arbitrary Work Cards without renderer-owned lifecycle state.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF14_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF14 recover work card planning shell`
