# WSF20-REPAIR11 — Restore single-action Work Card Implement workspace

**Type:** Repair Card  
**Parent:** WSF20  
**Defect:** WSF20-D29  
**Starting baseline:** `87299bece2aba79892d7cda257a62b1a2c52bb7e`

## Objective

Restore Work Card Implement to a single Operator action:

approved Work Card contract → choose model/reasoning → **Implement** → durable attempt is prepared/reused internally → Implementer runs → completed report becomes Review & Validation evidence.

There is no separate Operator gate called **Create Implementer Report**.

Preserve the durable SQL `ImplementationAttempt` / `ImplementationRecord` architecture.

## Confirmed RCA

### Reservation primitive leaked into workflow UX

`WorkCardImplementShell` currently renders **Create Implementer Report** whenever no current prepared attempt exists and withholds the actual execution controls until after that button is pressed.

That is unnecessary. `codexImplementerExecutionService.startWorkflowWorkItemSelected()` already:

1. reads the current attempt;
2. reuses a prepared attempt when available;
3. otherwise calls `prepareImplementationAttempt()`;
4. validates the reservation;
5. performs source materialization/preflight;
6. begins the WorkItem attempt with that exact attempt ID;
7. starts Implementer execution.

WSF14A explicitly authorized this direct-Run compatibility.

### Report projection broke the recovered shell geometry

The historical Implement surface was a two-column workspace:

- left: Work Card / contract / environment / execution controls;
- right: Implementer execution console.

WSF15 appended a full Implementer Report document and navigation as additional direct children. The report spans both columns, creates an additional full-width row, and turns Implement into a report viewer.

Implementer Report is execution evidence, not the primary Implement-stage document.

## Required correction

### 1. Remove Create Implementer Report from the Operator workflow

Remove the Operator-facing:

- **Create Implementer Report** button;
- `canCreateReport` shell contract;
- `onCreateReport` shell callback;
- adapter requirement that a report must already exist before execution controls render.

Do not remove `prepareImplementationAttempt()` from the application/domain API. It remains the durable backend primitive used by execution orchestration.

Do not make the renderer manually prepare immediately before Run. The execution service already owns prepare/recover atomically.

### 2. Present one primary Implement action

As soon as the exact approved WorkItem is loaded and runtime/model readiness permits, display model/reasoning controls and a primary **Implement** button.

The button calls only:

`startWorkflowWorkItemCodexExecution(workflowId, workItemId, selection)`

The execution service owns reservation/reuse.

A single click must produce exactly one current durable attempt and one execution start.

Existing prepared attempts must remain runnable and must be reused rather than replaced.

Read-only inspection, running state, runtime unavailability, environment blockers and stale context continue to fail closed.

### 3. Keep attempt/report state as supporting context

During Implement, bounded attempt/report identity and status may remain in the left context/console where useful.

Do **not** render the full SQL-generated Implementer Report as a primary Implement-stage document.

Remove the Implement-stage `documentPanel` / full report projection from the recovered two-column composition.

The completed report remains available in **Review & Validation**, which is the proper review surface.

Do not delete report projection/export services globally.

### 4. Restore the recovered two-column geometry

The primary Implement workspace must again be:

- left column: Work Card context, contract, model/reasoning, Implement/Cancel, environment status, last run;
- right column: Implementer execution console, approvals, user input, MCP elicitation, diagnostics.

If Refresh / Continue to Review & Validation remains, render it as an explicit intrinsic footer row beneath the two-column primary row. It must not become an accidental grid item that changes the column geometry.

Do not auto-advance to Review & Validation unless existing accepted semantics already require it.

### 5. Recover the current live prepared attempt

The Operator already created a prepared attempt in the live project.

After this repair:

- reopening Implement must recognize that prepared attempt;
- no new attempt is created merely because the UI changed;
- **Implement** is available when runtime/model readiness permits;
- clicking Implement reuses that exact attempt.

### 6. Preserve durable execution invariants

Do not change:

- `ImplementationAttempt` lifecycle;
- idempotent prepare/recover;
- attempt ID as executionRef;
- source preparation at Run;
- immutable `ImplementationRecord` on completion;
- `attempt_result` linkage;
- Tester/Review consumption of implementation evidence;
- checkpoint and interrupted-running recovery semantics.

## Focused proof

Replace the existing renderer test that codifies separate Create-before-Run UX.

Prove:

1. no **Create Implementer Report** control exists in Implement;
2. no full Implementer Report document is rendered as a primary grid row;
3. approved exact WorkItem with no attempt shows model/reasoning controls and **Implement**;
4. clicking Implement calls `startWorkflowWorkItemCodexExecution()` exactly once;
5. renderer does not call `prepareImplementationAttempt()`;
6. execution service auto-prepares exactly one attempt when none exists;
7. execution service reuses an existing prepared attempt;
8. executionRef equals the durable attempt ID;
9. double-click/in-flight protection prevents duplicate starts;
10. read-only inspection cannot Implement;
11. running state shows Cancel and locks model selection;
12. environment/approval/input/MCP elicitation controls remain functional;
13. completed report remains available downstream to Review & Validation;
14. Repair WorkItems use the same single-action Implement path.

Add rendered geometry proof that context and console occupy the available Implement workspace before Run, during Run and after completion, with any footer intrinsic and no giant full-width pending report row.

Run at minimum:

- `test/renderer/work-card-implement-workspace.test.cjs`;
- Codex Implementer execution service owner;
- workflow execution application service owner;
- Greenfield composition/navigation owner;
- static/build validation selected by the repair profile.

## Operator acceptance

Continue the existing live WorkItem:

1. open canonical **Implement**;
2. no **Create Implementer Report** button appears;
3. model/reasoning controls and **Implement** are immediately visible;
4. workspace is the recovered two-column context + console layout;
5. no giant Implementer Report occupies the workspace;
6. click **Implement**;
7. the existing prepared attempt is reused and the Implementer starts;
8. running state/console updates normally;
9. after completion, continue to Review & Validation and inspect the completed Implementer Report there.

## Forbidden changes

- no deletion of durable attempt/report services;
- no SQL/domain/schema migration;
- no renderer-authored attempt identity;
- no second execution identity;
- no source materialization during presentation/load;
- no report Markdown authority;
- no Review/Validation redesign;
- no browser/MCP/prompt changes;
- no unrelated D05–D08 work.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR11_IMPLEMENTER_REPORT.md`

## Checkpoint

`WSF20-R11 restore single-action Work Card Implement workspace`

After checkpoint, stop for Operator audit.
