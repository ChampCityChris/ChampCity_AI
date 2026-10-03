# WSF15 — Recover Implement shell

**Type:** Work Card  
**Depends on:** WSF14A — durable SQL ImplementationAttempt / Implementer Report foundation  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx@965536de` and deleted renderer tests  
**Current defect/state:** Deleted by RWS06J-C; current `ExecutionShell` consolidates implementation with unrelated stages.

## Objective

Recover the Work Card Implement workspace as a reusable shell preserving implementation context, model/runtime status, approval/input interactions, execution actions, evidence, and nested Work Card navigation.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardImplementShell.tsx`
- `src/renderer/app/WorkCardImplementWorkspace.tsx`
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

- Implement is its own workspace and does not include Report Review, Validation, Repair, or Close UI.
- Runtime/model/interaction placement matches recovered workspace behavior.
- Shell accepts runtime/evidence projections and typed callbacks only.
- Current Codex/SQL adapter can drive the shell without altering shell composition.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF15_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF15 recover implement shell`
