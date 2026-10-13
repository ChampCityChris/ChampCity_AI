# WSF06 — Recover Project Validation shell

**Type:** Work Card  
**Depends on:** WSF05A — structured Project/Phase Closeout review-cycle foundation  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` project-validation composition, project lifecycle rail presentation, and associated validation controls  
**Current defect/state:** No dedicated Project Validation workspace exists on current `dev`; behavior is folded into generic execution/close handling.

## Objective

Recover Project Validation as a distinct reusable shell that presents project-level validation evidence, Operator-required actions, blockers, and transition controls exactly as the working Greenfield UI did.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/ProjectValidationShell.tsx`
- `src/renderer/app/ProjectValidationWorkspace.tsx`
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

- Project-level validation evidence and controls are visually and structurally distinct from Work Card and Phase validation.
- Validation blockers/readiness are supplied by the adapter; the shell does not compute completion policy.
- Greenfield current SQL project-validation data can drive the shell without falling into generic Execution.
- Nested rail remains visible in the same lifecycle context.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF06_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF06 recover project validation shell`
