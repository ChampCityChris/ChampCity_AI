# WSF13 — Recover Work Card Intake shell

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/WorkCardIntakeWorkspace.tsx@965536de` and its historical service/renderer characterization  
**Current defect/state:** Deleted by RWS06J-C.

## Objective

Recover Work Card Intake as the reusable per-Work-Card intake container, preserving exact card context, intake questions/evidence, handoff/review actions, and nested Work Card navigation.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardIntakeShell.tsx`
- `src/renderer/app/WorkCardIntakeWorkspace.tsx`
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

- Workspace matches recovered Work Card Intake geometry and control sequence.
- Shell can be instantiated for any Work Card identity using typed props.
- SQL-backed adapter supplies current WorkItem/Work Card data without shell persistence calls.
- Historical characterization is restored or equivalently extended.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF13_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF13 recover work card intake shell`
