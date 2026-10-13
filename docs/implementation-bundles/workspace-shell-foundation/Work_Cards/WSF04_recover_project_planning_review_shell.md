# WSF04 — Recover Project Planning Review shell

**Type:** Work Card  
**Depends on:** WSF03A — reusable typed Architect candidate SQL ingress  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` Project Planning Review composition and its project-planning blocker/revision presentation  
**Current defect/state:** Current `StructuredProjectPlanningWorkspace` is rendered through generic `PlanReviewShell`, losing the original workspace-specific composition.

## Objective

Recover Project Plan and Roadmap Review as its own reusable shell, including its dual-pane planning/review/browser composition and blocked/revision states.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/ProjectPlanningReviewShell.tsx`
- `src/renderer/app/StructuredProjectPlanningWorkspace.tsx`
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

- Project planning blocker banner/evidence, planning document review, Architect browser companion, handoff/revision controls, and disposition controls match baseline.
- Not-ready and revision-requested states are visible in the workspace without changing backend authority.
- Greenfield structured Project Planning adapter drives the shell from current SQL state.
- No generic JSON text area is used as a substitute for the recovered planning workspace presentation unless it existed in the baseline.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF04_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF04 recover project planning review shell`
