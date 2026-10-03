# WSF15 Implementer Report

WSF15 shell extraction/recovery is implemented for its card-local checkpoint. This supersedes the earlier WSF14A-blocked report. WSF14A checkpoint: c2cb099985bd9a9934bbcfb3de37442f535528ff. Operator visual acceptance remains pending at WSF20.

Approved Dev root and primary dev checkout verified. Configured origin retained; no fetch, push or release. This card's checkpoint hash is pending creation and will be reported after commit without amending this artifact.

## Recovery and files

Inspected WorkCardBuildingReviewWorkspace.tsx under src/renderer/app and its deleted renderer characterization at 965536de265a4d494503f2173daddc5e81982a88. Recovered the context/console two-column composition, classes, labels, Create/Run/Cancel order, model/reasoning controls, approval controls, bounded input/MCP elicitation, diagnostics/tails, preflight and last-run feedback. Existing CSS preserves responsive layout and scrolling.

Created src/renderer/app/WorkCardImplementShell.tsx as a typed presentation container. It receives context, model controls, runtime/evidence and callbacks; it makes no window.champcity calls, imports no SQL services and performs no workflow switching or persistence. Historical environment-resolution vocabulary is retained only in presentation input, not added to the runtime contract.

Created src/renderer/app/WorkCardImplementWorkspace.tsx as the exact Greenfield adapter. It guards Workflow/WorkItem ownership and stale responses, reads repair lineage, binds execution/approval/input/cancel ports and supplies runtime controls. Create calls only prepareImplementationAttempt; Run separately calls startWorkflowWorkItemCodexExecution with exact model selection. SQL attempts own Pending/running/completed identity; immutable ImplementationRecord semantics remain unchanged.

The adapter supplies report/navigation slots below the recovered context/console row. SQL-generated Markdown displays attempt identity/state and supports Copy and constrained Export Markdown. Completed reports display completed, without a fabricated Pending governance disposition. Continue to Review & Validation is a supplied callback gated on SQL completion. These slots and SQL IDs replacing repository paths are visible authority-driven differences from the historical file baseline. Global composition remains WSF20 scope.

Modified src/renderer/styles.css only for full-grid slot placement. Restored test/renderer/work-card-implement-workspace.test.cjs and registered six behaviors under the existing renderer-navigation-and-presentation capability in validation/capability-map.json. Retained the active supplied WSF15 card and wrote this report. Deleted nothing. No SQL/domain/schema/IPC change, other-family renderer change, Markdown authority, generic replacement or global composition change occurred. Unrelated untracked bundle inputs remain intact.

## Validation

Restored five historical cases for readiness, model/reasoning placement and selection snapshots, console/last-run feedback, context/control ordering and permission/restart requirements. Extended this owner with ordinary and repair WorkItem adapter proof: Create does not Run, identities stay exact, foreign context is rejected, and completed SQL report content has no Pending badge.

- Initial npm run typecheck exposed historical execution-kind type incompatibility; corrected with a presentation-only type. Subsequent typecheck passed.
- node --test test/renderer/work-card-implement-workspace.test.cjs, normal Windows: exit 0, six passed. Final rerun after UTF-8 runtime-label correction and completed-report presentation passed all six.
- npm run test:affected -- --changes tmp/wsf15-changes.json, normal Windows: initial catalog preflight rejected an unsorted restored entry; registration and coverage corrected.
- Same affected command rerun, normal Windows: exit 1, receipt ba74bee9-ce3b-4714-9a5a-9c655349d8b6; build passed, 546 tests, 531 passed, 15 failed. WSF15 owner passed. Failures: six existing execution-completion assertions, one repository-I/O assertion, one Project rail assertion against untouched StructuredArchitectWorkspace source, seven managed-source profile failures. Execution/repository/source failures were already present in WSF14A evidence. The composed receipt remains failed.
- npm run typecheck, normal Windows, final source: exit 0. Final focused proof covers the small report-status/UTF-8 correction after the affected receipt; no final green composed qualification is claimed.
- Exact staged diff inspected; whitespace check allowing supplied Markdown hard breaks and bounded secret/concrete-local-path/generated-artifact scan performed before checkpoint.

Static/build and synthetic presentation/application-port proof were performed. Electron launch, real external Codex, full/release qualification and Operator visual audit were not run. WSF20 owns visual acceptance.

## Residual risks and next card

The composed profile remains failed as disclosed. Global composition and Operator visual acceptance remain outstanding. Resume WSF16 in bundle order, subject to its explicit SQL/domain stop condition.
