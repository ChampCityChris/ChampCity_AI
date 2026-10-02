# RWS05-REPAIR03 Implementer Report

## Outcome

Repair Card RWS05-REPAIR03 restores the shared structured Architect document review experience. The approved Intake is rendered directly from the current SQL `WorkflowIntake` record and its effective SQL disposition. The shared document card shows a Project Intake or Intake tab first, then adds Architect Review when a review projection exists. Review controls appear only on the Architect Review tab.

The renderer no longer gates Architect or planning dispositions on a separate viewed-revision acknowledgement. Exact revision checks remain in place through `expectedRecordVersion` and the existing application/domain commands.

## Repository and Git

- Approved repository root verified: `<PROJECT_REPO>` (`Dev` source checkout).
- Card type and identifier: Repair Card `RWS05-REPAIR03`.
- Branch: `dev`; configured origin remote exists. This branch has no configured upstream in the local branch listing.
- The worktree contained substantial unrelated pre-existing changes, including RWS06J and workflow/runtime work.
- During implementation, a concurrent change advanced `dev` with commit `d209f6099616def2c9fcf2a1aea9a460e351646e` (`RWS06B-R01 persist exact planning workspace identity`). That commit includes the RWS05-REPAIR03 implementation/report together with the RWS06B change set. It was not rewritten.
- This report correction is committed separately as the RWS05-REPAIR03 checkpoint follow-up; the implementation remains in `d209f60`.

## Root cause and implementation

`StructuredArchitectWorkspace` previously rendered only the Architect review projection, placed handoff actions in the review column, repeated status/debug text, and required renderer-only viewed state before enabling decisions. `PlanReviewShell` repeated that acknowledgement pattern. The shared shell had no Browser Actions slot.

The application service now calls the existing `intakeReviewDocument(...)` projection helper using the exact current Workflow and Intake records and the disposition read from SQL. It does not use the legacy planning document reader or require projection file materialization. The model retains Intake ID/version and the projected document metadata retains Workflow/Intake identity and revision.

The shared document card accepts typed tab slots. The Architect workspace selects Intake when no review exists, selects a saved/current review when available, and retains Intake for reference. Review actions send the exact current review `recordVersion`; the domain service continues to reject stale decisions. Revision Requested still requires nonempty notes, and no review action is enabled without a current revision.

Browser actions are composed in the shared shell's right browser column: real Reload ChatGPT, Prepare / Refresh Handoff through `prepareStructuredArchitectWorkspace`, and Copy Handoff using the current SQL-derived handoff. The left surface no longer repeats the stage/title/Workflow ID or generic instruction paragraph. Back to Workflows is in the shell navigation slot.

## Workflow coverage

| Workflow family | Intake display label | Shared implementation |
| --- | --- | --- |
| Project Creation / Greenfield | Project Intake | Yes |
| Feature / Capability | Intake | Yes |
| Issue Resolution / RCA | Intake | Yes |
| Refactor / Migration | Intake | Yes |
| Integration / Composition | Intake | Yes |
| Infrastructure / Platform | Intake | Yes |
| Research / Prototype | Intake | Yes |

All seven families flow through `createStructuredArchitectWorkspaceService().get(...)`; the workflow-specific candidate validation and structured JSON transport were not changed.

## Acknowledgement and stale-revision proof

- `I have reviewed this revision` is absent from production renderer/shared source.
- `PlanReviewShell` has no viewed or revision-key acknowledgement state; its decisions are directly actionable only when cycle ID and revision are present.
- Structured Architect decisions are shown only on the Architect Review tab and pass `expectedRecordVersion` to the typed review command.
- The focused workflow application suite continued to pass stale-version rejection after revision changes (70 tests passed, including exact-revision and review-cycle scenarios).

## Files changed for this card

- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`
- `src/shared/architectWorkspaceContracts.ts`
- `src/renderer/app/StructuredArchitectWorkspace.tsx`
- `src/renderer/app/ArchitectWorkspaceShell.tsx`
- `src/renderer/app/PlanReviewShell.tsx`
- `src/renderer/app/FigmaDocumentCard.tsx`
- `src/renderer/styles.css`
- `src/shared/structuredArchitectReviewState.ts` (deleted as dead renderer-only state)
- `validation/capability-map.json` (retired the acknowledgement-only test owner and mapped direct current-revision proof)
- `test/renderer/architect-interview-refresh-state.test.cjs` (deleted with the orphaned state proof)
- `test/renderer/figma-redesign-shell.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- `test/workflow/workflow-planning-ipc.test.cjs` (one review-shell assertion updated)
- This report.

No canonical Markdown was created to populate tabs. No SQL/domain contracts, Intake decisions, planning topology, execution semantics, legacy fences, or browser attachment lifecycle were changed.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Normal Windows | Passed after the initial implementation. |
| `npm run build` | Restricted | `spawn EPERM` from esbuild/Vite; recorded once and not counted as source failure. |
| `npm run build` | Normal Windows | Passed; Vite emitted only the existing >500 KB chunk advisory. |
| `node --test test/renderer/figma-redesign-shell.test.cjs test/renderer/project-rail-presentation.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/workflow/workflow-application-service.test.cjs` | Restricted | Node test runner returned `spawn EPERM`; rerun in normal Windows lane. |
| Same focused command | Normal Windows | Passed, 70 tests, 0 failures. |
| `node --test test/renderer/figma-redesign-shell.test.cjs test/renderer/project-rail-presentation.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/renderer/document-review-surface-source.test.cjs` | Normal Windows | Passed, 47 tests, 0 failures. |
| `git diff --check` | Local source check | Passed; Git printed line-ending normalization notices for existing Windows CRLF files. |

The exact-path repair profile ran after REPAIR04 implementation and failed in broader selected owners. It reported failures in source-control suites and `runtime-wiring-source.test.cjs`; renderer output also exposed one stale browser-chrome assertion (updated under REPAIR04) and two Workflow Hub identity expectations associated with concurrent workflow changes. The focused REPAIR03 suite and direct-current-revision behavior remain green. A normal Windows typecheck and production build passed after both cards' source changes; the build emitted the existing chunk-size advisory.

## Safety and remaining validation

The implementation does not send SQL entity IDs to legacy planning-document read APIs. No secret, concrete machine path, generated artifact, dependency, migration, or unrestricted renderer filesystem access was introduced. User-selected native Markdown export belongs to the following REPAIR04 card.

No manual visual acceptance was performed. The rendered structure and action gating have focused renderer proof; operator visual review remains available during source-code review.

Recommended next task: complete the sequential RWS05-REPAIR04 checkpoint.
