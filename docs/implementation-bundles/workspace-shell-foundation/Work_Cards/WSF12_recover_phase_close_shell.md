# WSF12 — Recover Phase Close shell

**Type:** Work Card  
**Depends on:** WSF05A — structured Project/Phase Closeout review-cycle foundation  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` Phase Close composition and historical phase-close controls  
**Current defect/state:** No dedicated Phase Close workspace remains; generic `CloseAdvanceShell` substituted.

## Objective

Recover Phase Close as a distinct Phase-level shell preserving close eligibility, evidence, decision/rationale controls, next-Phase/project progression context, and nested navigation.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/PhaseCloseShell.tsx`
- `src/renderer/app/PhaseCloseWorkspace.tsx`
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

- Phase Close visibly belongs to the current Phase and preserves baseline close/keep-open interaction.
- Adapter supplies SQL close eligibility and typed callbacks.
- Shell supports repeated phases without storing canonical phase identity internally.
- Successful close transitions are outside shell ownership.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF12_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF12 recover phase close shell`
