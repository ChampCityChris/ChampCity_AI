# RECONSTRUCTION-REPAIR01-REPAIR06A — Codex Execution Authority and Operator Approval Boundary

## Repair Type

Temporary reconstruction repair derived from failed Operator live validation of the first real Work Card implementation run after RECONSTRUCTION-REPAIR01-REPAIR05.

This repair is intentionally bounded to Codex execution authority. It does not correct the substantive Phase-00 Work Card dependency-readiness contract; that is owned by REPAIR06B after this repair passes.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Parent Evidence / Failed Validation

Relevant preceding repair:

- `repair/RECONSTRUCTION_REPAIR01-REPAIR05_side_effect_free_implement_workspace_status_and_codex_process_lifecycle.md`
- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR05_side_effect_free_implement_workspace_status_and_codex_process_lifecycle.md`

Failed implementation contract:

- `planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md` revision 1
- `planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md` revision 1

Operator live evidence:

- The Operator explicitly clicked `Run Codex Implementer`.
- During execution, Codex attempted dependency/environment work and then decided running Electron processes should be closed.
- The running ChampCity A/I instance was one of those Electron processes and terminated.
- After the failed run, the repository dependency tree was damaged enough that `npm run build` failed because `tsc` could not be resolved from the repository-local dependency tree.
- The canonical Implementer Report remained the untouched Pending reserved scaffold; the execution did not reach durable report completion.

Do not require the Operator to reproduce this failure again.

## Confirmed Root Cause 1 — Declared User Approval Is Auto-Approved by the Transport

`src/main/workCardBuilding/codexImplementerExecutionPolicy.ts` declares:

```text
approvalPolicy = on-request
approvalsReviewer = user
sandboxMode = danger-full-access
```

But `src/main/workCardBuilding/codexAppServerTransport.ts` currently responds to owned App Server approval requests immediately:

```text
command approval      -> { decision: "accept" } / legacy { decision: "approved" }
file-change approval  -> { decision: "accept" } / legacy { decision: "approved" }
permission approval   -> requested permissions granted for the turn
```

The transport therefore claims the user is the reviewer while programmatically acting as the reviewer.

Existing transport tests explicitly prove this auto-accept behavior.

## Confirmed Root Cause 2 — Work Card Implementation Runs With Unbounded Host Sandbox Authority

`src/main/workCardBuilding/codexAppServerTransport.ts` hardcodes `danger-full-access` both when starting the thread and when starting each turn rather than applying the execution policy supplied by the Work Card execution service.

The Work Card implementation path therefore has host-level authority even though normal Work Card implementation primarily needs to read/write the selected repository. Machine-environment provisioning already has a separate application-owned preflight/resolution path.

## Required Architecture

The architecture for this repair is explicit:

```text
WORK CARD IMPLEMENTATION
selected repository = writable implementation boundary
sandbox = workspace-write
approval reviewer = Operator
approval requests = pending until Operator response

ENVIRONMENT RESOLUTION
explicit Operator action only
may retain broader host authority where the existing environment-resolution contract requires it
approval requests = still pending until Operator response

CHAMPCITY CONTROL PLANE
must never be terminated by an Implementer command
```

A Codex model is not the authority to silently broaden execution from repository implementation into host process control.

## Repair Objective

After repair:

1. Normal Work Card implementation executes with repository-scoped write authority rather than unconditional `danger-full-access`.
2. App Server command, file-change, and permission approval requests are no longer automatically accepted by ChampCity.
3. A pending approval is surfaced in the Implement workspace and remains unresolved until the Operator selects Approve or Deny.
4. Commands that plainly attempt to terminate the running ChampCity control process are denied by the application and are never offered as an approvable action.
5. Existing explicit environment resolution, user-input, MCP-elicitation, cancellation, streaming, and report lifecycle behavior remains intact.

## Authorized Scope

### 1. Correct Work Card implementation sandbox authority

Primary files:

- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexAppServerTransport.ts`

Required behavior:

- Add/use the existing Codex `workspace-write` sandbox mode for `executionKind = work-card-implementation`.
- The selected project repository root is the Work Card implementation writable root.
- Preserve current network access behavior unless the existing Work Card execution policy already requires otherwise.
- `executionKind = environment-resolution` may retain `danger-full-access` because it is an explicit host-environment action, but it must not inherit automatic approval behavior.
- `JsonlCodexAppServerTransport.startAppThread()` and `runTurn()` must serialize the supplied thread execution policy. Do not hardcode `danger-full-access` for every execution.
- If the installed `@openai/codex` 0.146.0 protocol does not accept the required `workspace-write` thread/turn representation, stop and report the exact protocol mismatch. Do not silently fall back to `danger-full-access` for Work Card implementation.

### 2. Replace auto-approval with a pending approval contract

Use the existing pending-user-input / pending-MCP-elicitation architecture as the integration pattern. Do not invent a second execution subsystem.

Add a pending approval model carrying at minimum:

```text
requestId
approval type: command | file-change | permission
threadId / turnId / itemId
command display when command approval
file-change summary when file-change approval
permission summary when permission approval
plain-language impact summary
```

Required path:

```text
App Server requestApproval
→ validate active Work Card ownership
→ classify protected control-plane termination
→ if protected: deny immediately + runtime denial evidence
→ otherwise store pending approval
→ execution model exposes pendingApproval
→ renderer shows approval panel
→ Operator Approve or Deny
→ IPC/preload/service/transport resolves that exact request once
→ App Server receives response
```

Add one response IPC path following the existing naming pattern, for example:

```text
codexImplementer:respondToApproval
```

and the corresponding preload/shared/service contract.

Do not reuse MCP elicitation or free-form user input as an approval transport.

### 3. Exact Operator UI placement

In `WorkCardBuildingReviewWorkspace.tsx`, render the pending approval inside the existing **Codex execution console**, alongside the existing pending Codex Input and MCP Elicitation panels.

Required presentation:

- heading: `Codex Approval Required`
- approval type
- plain-language impact summary
- proposed command in monospaced text for command approvals
- affected file/change summary for file-change approvals when present
- requested permission summary for permission approvals
- `Approve Once` button
- `Deny` button

Do not use a modal, toast, hidden diagnostics pane, browser pane, or separate workspace.

The Operator must not need to understand sandbox terminology to answer the prompt.

### 4. Hard-deny direct ChampCity control-plane termination

Before creating a pending command approval, mechanically reject commands that plainly target the running ChampCity host process.

At minimum protect:

- the current main-process PID (`process.pid`);
- broad image-name termination matching the basename of `process.execPath`;
- Windows process-termination forms that directly target either of those values, including `taskkill` and PowerShell `Stop-Process` forms represented in the App Server command request.

When denied:

- do not present `Approve Once`;
- respond to the App Server with a denial/rejection response supported by the current protocol;
- append a clear runtime-denial/event-tail message stating that ChampCity denied termination of its active control process;
- keep ChampCity and the active execution UI alive.

Do not create a giant shell parser. This is a bounded protected-process guard for obvious direct termination commands.

Commands that target other processes are not silently approved. They use the normal pending Operator approval path.

## Acceptance Criteria

### AC1 — Work Card implementation is repository-scoped

A focused transport/service test proves one `work-card-implementation` run starts and turns with `workspace-write`, not `danger-full-access`, and is bound to the selected repository root.

### AC2 — Environment resolution remains explicit

A focused test proves `environment-resolution` is still invoked only by the explicit environment-resolution action and retains the intended broader sandbox policy if required.

### AC3 — Command approvals wait for the Operator

For an owned App Server command approval request such as:

```text
["npm", "test"]
```

the transport must not immediately return `accept`/`approved`.

The execution model must expose a pending approval. Only an explicit Approve response resolves it as accepted; explicit Deny resolves it as denied.

### AC4 — File-change and permission approvals are not auto-approved

Equivalent focused proof is required for file-change and permission approval requests. No owned approval request may be accepted merely because it belongs to the current thread.

### AC5 — Foreign/stale approval ownership protection remains

Existing rejection of foreign-thread, stale-turn, duplicate, or already-resolved approval requests remains passing.

### AC6 — ChampCity self-termination is hard denied

Focused tests must cover at least:

```text
taskkill targeting current process PID
broad taskkill image target matching basename(process.execPath)
PowerShell Stop-Process targeting current process PID
```

Expected result:

```text
no pending approvable request
App Server receives denial
runtime denial recorded
control process is not terminated
```

Tests must use injected/synthetic protected PID/executable values. Do not terminate a real process in tests.

### AC7 — Other process termination requires Operator approval

A command approval targeting a non-protected process must remain pending for Operator decision; it must not be automatically accepted or automatically killed by ChampCity.

### AC8 — Existing interaction surfaces remain functional

Preserve and prove:

- pending Codex user input;
- pending MCP elicitation;
- cancellation;
- streaming event tails;
- report update detection;
- REPAIR05 side-effect-free status polling.

### AC9 — Operator-visible approval panel

Renderer tests prove the approval panel appears inside the Codex execution console with `Approve Once` and `Deny`, and the proposed command/impact summary is visible when applicable.

### AC10 — No compatibility fallback to blanket authority

There must be no runtime fallback that silently changes a failed `workspace-write` Work Card implementation to `danger-full-access` or silently converts an unresolved approval into acceptance.

## Preserved Passed Behavior

Preserve:

- REPAIR05: navigation/status polling never creates Codex processes;
- explicit `Run Codex Implementer` start action;
- explicit `Resolve Environment` action;
- App Server ownership checks;
- Work Card/report identity and source-revision checks;
- current OAuth/MCP Harness behavior;
- application-owned development-environment preflight;
- cancellation/disposal of owned App Server adapters;
- no Git mutation unless separately authorized.

## Forbidden Changes

Do not:

- special-case only repository name `ChampCity_AI`;
- solve the issue by hiding or suppressing process windows;
- remove approval telemetry;
- keep `approvalsReviewer=user` while auto-approving requests;
- add `Approve for session` or durable blanket approval;
- add a second execution engine;
- disable the development-environment subsystem;
- move machine provisioning into Codex Work Card implementation;
- weaken thread/turn ownership validation;
- alter Project/Phase planning artifacts in this repair;
- alter the current Phase-00 WC01 dependency contract in this repair;
- stage/commit/push/branch-mutate unless separately authorized.

## Required Files / Areas to Inspect

At minimum:

- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/main/workCardBuilding/codexAppServerProtocol.ts`
- `src/shared/workspaceContracts.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `test/work-card-building/codex-app-server-transport.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`

## Focused Validation

Required:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/work-card-building/codex-app-server-transport.test.cjs test/work-card-building/codex-implementer-execution-service.test.cjs test/renderer/work-card-building-review-workspace.test.cjs
```

Do not run the entire historical suite by default.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A_codex_execution_authority_and_operator_approval_boundary.md`

Report:

- failed Operator evidence;
- exact auto-approval code path removed;
- exact Work Card implementation sandbox before/after;
- files changed;
- pending approval contract and UI placement;
- protected-process denial implementation;
- command/file/permission approval proof;
- REPAIR05 preservation proof;
- exact validation commands/results;
- deviations/blockers;
- confirmation no Git mutation.

## Operator Live Validation

After Architect review:

1. Restart/reload the repaired application.
2. Navigate to Implement and remain idle for at least 15 seconds; no Codex process starts.
3. Do **not** rerun Phase-00 WC01 yet. REPAIR06B must correct its contract first.
4. Use a focused safe fixture/work card or synthetic runtime validation to trigger a Codex approval request.
5. Verify the Implement workspace visibly pauses on `Codex Approval Required`.
6. Verify no command proceeds until Approve Once or Deny is selected.
7. Verify Deny keeps ChampCity alive and records the denial.
8. Live self-termination testing against the real ChampCity process is forbidden; automated synthetic proof is sufficient for the protected-process guard.

## Return Path

Return for Architect code review. If this repair passes, implement RECONSTRUCTION-REPAIR01-REPAIR06B before retrying Phase-00 WC01.
