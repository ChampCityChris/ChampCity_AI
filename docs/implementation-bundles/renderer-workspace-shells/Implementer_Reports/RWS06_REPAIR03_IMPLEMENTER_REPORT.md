# RWS06-REPAIR03 Implementer Report

## Scope and repository

Verified the primary `<PROJECT_REPO>` Dev checkout against AGENTS.md and the approved Repair Card. Branch `dev`; origin configured. RWS06-REPAIR02 checkpoint is `6b4efc4`. No push/release.

## Implementation

StructuredWorkflowWorkspace owns one presentation-only inspection selection, bound to the exact loaded Workflow object. New exact open/reload or another Workflow resets the effective selection from persisted currentWorkspace. Rail selection never supplies a destination to a mutation. Current-stage dispatch uses the original SQL summary and existing work surfaces/actions.

workflowStageRailModel now owns the seven IDs/order, per-family labels, canonical stage mapping, required/completed/not-ready states and inspection callbacks. App-level and Architect-specific duplicate rails were removed; Planning's separate local back-navigation control was removed. The shared rail remains accessible across Intake, Architect, Planning and Execution. Inspection selection and work readiness are orthogonal. Greenfield and WIR keep their original surfaces, including terminal summary behavior. Research no-Plan terminal history marks implementation stages Not Required.

Noncurrent stages use a stage-specific read-only inspection shell. Future work shows Not Ready plus its prerequisite; saved stage evidence/history and governing Decisions remain viewable. There are no authoring, review, execution or Prepare controls in inspection. Current-stage mutations retain their existing strict gates.

The bounded getWorkflowStageInspection read projection is exposed through constrained IPC/preload. It reads a transaction-consistent exact Workflow evidence graph, including terminal history, without requiring work readiness or creating cycles/projections. Ownership traversal excludes peer dependencies, route provenance and arbitrary links; explicit foreign Workflow ownership is excluded. Output is capped at 256 records / 200000 record bytes and 512 links, with visible truncation. No SQL save, stage update, schema/migration, approval or revision command is used. It returns the persisted currentWorkspace, not a reconstructed canonical stage. The renderer checks exact identity/current workspace and ignores obsolete asynchronous responses.

## Files and proof

Modified production: workflowApplicationService/Ipc, preload index, workflowApplicationContracts, workspaceContracts, App, StructuredWorkflowWorkspace, workflowStageRailModel, WorkflowStageRail, StructuredArchitectWorkspace and ExactWorkflowPlanningWorkspace. Extended existing workflow-hub-shell and workflow-planning-ipc owners; updated capability-map metadata. Created this report and included the active Repair Card. No dependencies, new production package, new test file, generated output or migration.

The existing SQL matrix now exercises inspection at incomplete Intake, completed Intake and accepted Planning for all six direct/WIR targets. It asserts currentWorkspace and StateChange counts remain unchanged, no cycle is created by inspection, exact saved evidence is returned and a same-title peer's evidence is excluded. Research terminal evidence/completion Decision remains inspectable. Existing stage progression/Plan acceptance/shared Execution proof is retained.

Two tests were added to the existing renderer navigation owner because independent inspection selection and asynchronous read-only inspection lifecycle were previously uncovered: all seven clicks at all seven canonical stages for all six direct/routed families, no mutation calls, future blockers, completed Intake evidence, no authoring controls, exact reload/different Workflow/fresh reopen resets; and mount/read/unmount response isolation. Existing actual App approval callbacks, WIR handoff and shared Execution tests are reused.

## Validation

Normal Windows production `npm run build` exited 0. Initial `node --test test/renderer/workflow-hub-shell.test.cjs test/workflow/workflow-planning-ipc.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs` passed 67/68: a stale Architect-local rail assertion was corrected to check the shared shell rail and preserved browser composition. Rerun exited 0, 68/68. A new source file's Windows encoding was normalized to UTF-8; all changed source files decode as UTF-8.

test_toolbox `run_test_file` for workflow-hub-shell passed 36/36, receipt `523f5ed6-2439-454a-9156-b36c91819830`. test_toolbox workflow-planning-ipc passed 20/20 with a fresh successful build, sourceStable=true, receipt `03dbb77a-66fc-4f38-8036-10120c89ded3`. No shell fallback was needed for these focused toolbox runs.

Normal Windows `npm run validate:plan -- --profile repair --changes tmp/rws06-r03-changes.json` exited 0; exact 16 changed paths plus explicit renderer/workflow preservation capabilities. Normal Windows `npm run test:repair -- --changes tmp/rws06-r03-changes.json` exited 1, receipt `ae4eceed-6e9b-4d1c-8333-97d97d6e72b9`, 335620 ms, sourceStable=true. Fresh production build/static passed. Of 633 tests, 609 passed, 23 failed, one skipped. The 134 focused/preservation tests passed: renderer navigation 36, six-family SQL progression/inspection 20, WIR renderer 12, workflow application 27, shared Execution 30, Greenfield Phase authoring 9. This run covers the final labeled-evidence renderer.

The same six failing owners remain from RWS06-R01/R02: repository-io-hardening (1), reserved-toolbox-namespace (2), execution-completion (6), project-rail-presentation (1), managed-project-source (7), workflow-integration-service (6). Wider qualification remains blocked; no passing integration or release acceptance is claimed. The skipped Windows managed-runtime qualification probe requires CHAMPCITY_IRR_RUNTIME_QUALIFICATION, which was not enabled; it is optional environment-specific runtime proof, not rail/progression proof. The advisory repair budget was exceeded; no tests were dropped.

Ignored local receipts/logs and the exact planner input are under tmp/. `git diff --check` and final staged checks passed. The exact staged diff was reviewed and bounded added-line secret/local-path/generated-artifact and UTF-8 checks passed. Full/release qualification is out of scope. Operator real-application experiential validation is pending; already-stale persisted stage rows are not reconciled on open by this repair.

## Checkpoint and return

Checkpoint pending: `RWS06-R03 make Workflow rail inspection fully navigable`. Only card-local staging/checkpoint is authorized in this pass; no push/release. Next: Architect source review and Operator validation of completed/future stage inspection and canonical reopen. No real-application visual or external-integration acceptance claimed.
