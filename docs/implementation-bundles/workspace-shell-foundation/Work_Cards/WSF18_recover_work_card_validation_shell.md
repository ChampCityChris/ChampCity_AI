# WSF18 — Recover Work Card Validation shell

**Type:** Work Card  
**Depends on:** WSF15A — structured WorkItem validation/report-review foundation  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Source-of-truth:** `App.tsx@965536de` work-card-validation composition and current-validation action presentation  
**Current defect/state:** No dedicated Work Card Validation workspace remains; validation is folded into generic Execution.

## Objective

Recover Operator/Work Card Validation as a distinct reusable **alternate/manual validation surface** preserving validation-attempt creation, evidence/results review, criterion-specific human/validator controls, readiness, and Work Card navigation. It shares the WSF15A validation cycle with Review & Validation; it is not an extra mandatory lifecycle hop after WSF16.

This card is an extraction/recovery card. Follow `../WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`. Preserve current SQL/domain authority; do not redesign workflow semantics.

## Required implementation

- Recover the exact working presentation/interaction composition from the named historical source.
- Create the shell as a dumb typed presentation container.
- Move only presentation geometry/chrome/control placement into the shell.
- Bind a minimal Greenfield adapter/harness to current SQL-backed services for proof.
- Preserve labels, control order, disabled/readiness presentation, scrolling, responsive behavior, and accessibility from the working source.
- Recover/restore characterization coverage from Git history where the original proof was deleted.

## Expected production scope

- `src/renderer/app/WorkCardValidationShell.tsx`
- `src/renderer/app/WorkCardValidationWorkspace.tsx`
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

- Work Card Validation remains distinct from Report Review and Phase Validation.
- Validation attempt/evidence presentation and Operator actions match recovered baseline.
- Shell receives typed WSF15A validation-cycle state plus current Tester/Criterion proof callbacks and contains no policy logic.
- **Create Current Validation Attempt** maps to explicit idempotent WSF15A cycle preparation.
- Existing validation-policy commands remain distinct: deterministic, semantic AI, visual human, and criterion Operator Decision.
- Aggregate `ValidatePassed` may close the WorkItem only through the WSF15A typed callback after all existing completion proof is satisfied; the shell itself never decides eligibility.
- The workspace remains directly navigable under the same nested **Review & Validation** rail step even when WSF16 is the canonical required surface.

Automated proof must exercise the shell as presentation plus its Greenfield adapter. Operator visual validation remains required at WSF20.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF18_IMPLEMENTER_REPORT.md`.

Report exact historical source inspected, files changed, parity evidence, tests reused/restored/extended, validation results, and any visible difference from baseline.

## Checkpoint

`WSF18 recover work card validation shell`
