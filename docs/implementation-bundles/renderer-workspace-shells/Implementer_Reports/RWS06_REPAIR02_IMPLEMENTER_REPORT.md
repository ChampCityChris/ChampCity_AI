# RWS06-REPAIR02 Implementer Report

## Repository and scope

Verified primary `<PROJECT_REPO>` Dev checkout against AGENTS.md and the approved Repair Card. Branch `dev`, origin configured; no push/release. Repair type: authoritative stage completion and reopen.

## Implementation

`recordWorkflowIntakeDecision` now advances the exact owning substantive Workflow from its entry workspace to its Architect/RCA workspace in the review transaction. Negative dispositions remain at Intake. `recordArchitectReview` advances implementation-bearing assessments to exact Planning; Research requires one typed outcome and no-Plan approval calls the factored existing Research completion policy inside the same transaction. The completion Decision, terminal `research-close`, and lifecycle are persisted atomically. Greenfield behavior is preserved.

Forward updates record StateChange/outbox evidence. Repeated review never regresses a later workspace. Architect Prepare is idempotent outside Intake and cannot move Planning backward. Reads/open/listing are not changed to reconcile SQL. Intake and Architect approval callbacks immediately await the existing exact App reload; Plan keeps its acceptance/reload behavior. The service returns a bounded terminal acknowledgement after no-Plan approval rather than attempting an active-only read.

Modified: projectStateService, structuredArchitectWorkspaceService, useWorkflowIntake, WorkflowIntakeWorkspace, StructuredArchitectWorkspace, ExactWorkflowPlanningWorkspace; existing workflow-planning-ipc and workflow-hub-shell test owners; workflow-application-service test owner. Created this report; checkpoint includes the active Repair Card. No new dependency, schema, migration, test file, renderer canonical state, live UUID workaround or generated artifact.

## Proof and validation

The real SQLite six-family direct/WIR matrix now reopens after Intake and Architect approval without either Prepare command. It checks canonical destinations, Plan acceptance and shared Execution, both negative dispositions, stale versions, source-backed Migration identity, and typed Research closure with no WorkItems/Plan/checkpoints. Renderer proof invokes the actual Intake review hook and Architect review panel through mounted App callbacks, then Plan approval into shared Execution. Existing WIR and execution proof is preserved.

Restricted `npm run build` returned spawn EPERM once. Equivalent normal Windows build exited 0. Initial test_toolbox service run (`d05bc90d-f46a-4a1b-804b-7bacb0ebaa90`) passed 19/20 and exposed a stale expected assessment destination; corrected to Planning. A later fixture extension missed its registry import; corrected. Normal Windows `node --test test/workflow/workflow-planning-ipc.test.cjs test/renderer/workflow-hub-shell.test.cjs test/renderer/work-intake-routed-workspaces.test.cjs` passed 65/66; the new renderer proof needed useMemo support in its hook harness. Corrected; `node --test test/renderer/workflow-hub-shell.test.cjs` exited 0, 34/34.

Exact preview `npm run validate:plan -- --profile repair --changes tmp/rws06-r02-changes.json` exited 0. test_toolbox repair-profile request timed out at MCP; no pass inferred. Equivalent normal Windows `npm run test:repair -- --changes tmp/rws06-r02-changes.json` exited 1, receipt `f9a8ee87-fb69-49c9-a158-3edffd4e1bb0`, 202384 ms, sourceStable=true: build/static passed; 544 tests, 516 passed, 28 failed. All matrix, mounted renderer, WIR and shared Execution focused owners passed. Five failures in workflow-application-service encoded approved Intake staying at Intake, Research requiring a later close click, or editing completed Intake. Corrected those expectations and moved projection revision/failure proof before approval; normal Windows `node --test test/workflow/workflow-application-service.test.cjs` exited 0, 27/27. Final preview includes that changed owner.

The remaining 23 failures match the six previously documented RWS06-R01 failing owners: repository-io-hardening (1), reserved-toolbox-namespace (2), execution-completion (6), project-rail-presentation (1), managed-project-source (7), workflow-integration-service (6). Broader qualification remains blocked; no unrelated production changes or weaker assertions were introduced. Full/release and real visual acceptance were not run. Ignored local logs/receipts are under tmp/. Final staged whitespace and bounded added-line secret/local-path/generated-output checks passed.

## Residual validation and checkpoint

Operator real-application validation remains required by the card. Existing already-approved legacy rows are not rewritten or caught up during open: this repair changes authoritative completion commands and deliberately adds no migration. Their canonical state can be advanced by an explicit exact current approval/preparation command, not a read. No visual/external acceptance claimed. Next task: RWS06-REPAIR03.

Checkpoint pending: `RWS06-R02 advance canonical Workflow state on stage completion`. No Git mutation yet; no secrets, concrete local paths, or generated outputs intentionally added.
