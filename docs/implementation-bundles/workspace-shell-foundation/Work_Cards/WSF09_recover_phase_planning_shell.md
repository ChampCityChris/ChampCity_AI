# WSF09 — Recover Phase Planning shell

**Type:** Work Card  
**Depends on:** WSF03A — reusable typed Architect candidate SQL ingress  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` phase-planning-bundle composition and its Architect/document planning presentation  
**Current defect/state:** Phase Planning is collapsed into `StructuredPhaseLoopWorkspace(stageKind=planning)`.

## Objective

Recover Phase Planning as a distinct reusable shell preserving phase planning document review, Work Card planning bundle context, Architect browser companion, revision controls, and phase-level navigation.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/PhasePlanningShell.tsx`
- `src/renderer/app/PhasePlanningWorkspace.tsx`
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

- Phase Planning is visually/behaviorally distinct from Project Planning and Work Card Planning.
- Planning documents, review/disposition, handoff/revision controls, and phase context match baseline.
- Shell supports repeated Phase loop instances via props only.
- Current SQL phase-planning adapter drives the shell without generic PlanReview replacement behavior.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF09_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF09 recover phase planning shell`
