# WSF08 — Recover Phase Interview shell

**Type:** Work Card  
**Depends on:** WSF03A — reusable typed Architect candidate SQL ingress  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` phase-interview composition using the Greenfield Architect/document/browser workspace pattern  
**Current defect/state:** Phase Interview is collapsed into `StructuredPhaseLoopWorkspace(stageKind=interview)` and no longer has its prior workspace composition.

## Objective

Recover Phase Interview as its own shell with phase context, interview document/review surface, Architect browser companion, handoff controls, and phase-level navigation.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/PhaseInterviewShell.tsx`
- `src/renderer/app/PhaseInterviewWorkspace.tsx`
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

- Phase identity/context is clearly presented and distinct from Project Architect Interview.
- Interview document/review/browser geometry matches baseline.
- Shell can be instantiated repeatedly for arbitrary Phase IDs without internal lifecycle state.
- Greenfield SQL phase-interview adapter supplies phase-specific data and actions.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF08_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF08 recover phase interview shell`
