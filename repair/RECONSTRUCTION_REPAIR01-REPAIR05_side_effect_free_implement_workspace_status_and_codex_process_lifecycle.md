# RECONSTRUCTION-REPAIR01-REPAIR05 — Side-Effect-Free Implement Workspace Status and Codex Process Lifecycle

## Repair Type

Temporary pre-dogfood reconstruction repair derived from failed Operator live validation after the Project Planning / Work Card reconstruction flow reached the Implement workspace.

This repair is intentionally narrow. It corrects one confirmed Codex Implementer lifecycle defect: entering the Implement workspace causes repeated Codex App Server process creation before the Operator clicks `Run Codex Implementer`.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

This card follows the retained Repair Card standard: evidence-derived defect, bounded correction, explicit preservation, precise acceptance criteria, focused regression proof, and no unrelated redesign.

## Parent Repair / Failed Validation

Parent reconstruction repair chain:

- `repair/RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR03_project_planning_gate_boundary_and_baseline_canonical_correction.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR04_prompt_to_harness_tool_contract_parity.md`

Latest Implementer Report:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR04_prompt_to_harness_tool_contract_parity.md`

Operator live validation evidence:

- A Formal Work Card was written and Approved.
- ChampCity A/I navigated normally to the Implement workspace.
- The Operator did **not** click `Run Codex Implementer`.
- Merely remaining in the Implement workspace caused terminal/process windows to begin launching repeatedly.

The explicit Run action was not invoked. Therefore process creation on workspace entry is defective behavior.

## Confirmed Production Path

### Renderer navigation/status behavior

`src/renderer/app/App.tsx` contains an effect for:

```text
activeWorkspaceId === "work-card-building-review"
```

The effect calls:

```text
window.champcity.getCodexImplementerExecutionStatus()
```

immediately and then polls status while the workspace remains active.

The poll interval is approximately:

```text
running: 1500 ms
idle:    4000 ms
```

This renderer path does **not** call `startCodexImplementerExecution()` automatically. The explicit `Run Codex Implementer` button is separately wired through:

```text
onRunCodex={() => void startCodexImplementerExecution()}
```

Therefore renderer navigation is intended to be status-only.

### Main-process status behavior

`src/main/workCardBuilding/codexImplementerExecutionService.ts` currently implements `getStatus()` so that, when no session exists and preflight context is otherwise eligible, it executes:

```text
await this.appServerFactory()
```

before returning `readyModel(context)`.

The default factory is:

```text
loadCodexAppServerExecutionAdapter()
→ loadCodexAppServerAdapter()
```

### App Server factory behavior

`src/main/workCardBuilding/codexAppServerTransport.ts` shows that `loadCodexAppServerAdapter()` is not a passive capability lookup. It constructs a real `JsonlCodexAppServerTransport`, calls `initialize()`, and `initialize()` calls:

```text
spawnPackagedCodexAppServer()
```

which creates the Codex App Server child process.

The packaged spawn already uses:

```text
windowsHide: true
```

Therefore this is **not** primarily a missing terminal-hide flag.

### Leaked status-created adapter

`getStatus()` does not retain the adapter returned by `appServerFactory()` and does not dispose it.

As a result, the current idle navigation path is effectively:

```text
enter Implement workspace
→ renderer getStatus()
→ getStatus() creates real App Server adapter/process
→ adapter reference discarded

~4 seconds later
→ getStatus()
→ creates another App Server adapter/process
→ reference discarded

repeat while workspace remains active
```

This is the confirmed root cause of the Operator-observed process/terminal launch behavior.

## Required Architecture

The boundary for this repair is explicit:

```text
IMPLEMENT WORKSPACE NAVIGATION / STATUS
→ inspect existing ChampCity execution state
→ inspect current Work Card/preflight context as already available
→ return status model
→ NO Codex App Server creation
→ NO child-process creation
→ NO implementation execution
→ NO environment provisioning

EXPLICIT RUN CODEX IMPLEMENTER ACTION
→ development-environment preflight as already designed
→ create exactly one Codex App Server adapter for the execution
→ retain it on the execution session
→ execute implementation
→ dispose it on completion/cancel/shutdown

EXPLICIT RESOLVE ENVIRONMENT ACTION
→ retain its existing explicit-action semantics
→ no automatic invocation from navigation/status polling
```

A status/read operation must be side-effect free with respect to Codex process creation.

## Repair Objective

After repair:

1. Entering the Implement workspace does not create a Codex App Server process.
2. Repeated `getCodexImplementerExecutionStatus()` polling while idle does not call the App Server factory or create any child process.
3. Only an explicit Operator execution action may create the Codex App Server required for that action.
4. One explicit `Run Codex Implementer` invocation creates at most one App Server adapter for that execution.
5. Repeated status reads during or after execution do not create additional adapters.
6. Existing completion, cancellation, shutdown, report-refresh, and environment-resolution behavior remains intact.

## Authorized Scope

### 1. Make `CodexImplementerExecutionService.getStatus()` process-side-effect free

Primary production file:

`src/main/workCardBuilding/codexImplementerExecutionService.ts`

Required correction:

- remove the `await this.appServerFactory()` call from the idle/no-session `getStatus()` path;
- do not instantiate `CodexAppServerExecutionAdapter` from `getStatus()`;
- do not add another process-spawning runtime probe as a replacement;
- do not run development-environment provisioning from `getStatus()`;
- derive status only from current Work Card/context, cached development-environment preflight state, and existing execution-session state already owned by the service;
- if no session exists and the current Work Card/context is otherwise eligible, `getStatus()` may return the existing `readyModel(context)` without launching Codex;
- actual App Server startup failure remains an explicit execution-start failure surfaced by `start()`.

### 2. Preserve explicit process creation in `start()`

Do not redesign the existing explicit execution path.

`start()` may continue to:

```text
run required development-environment preflight
→ appServerFactory()
→ create execution session
→ executeWithAppServer(...)
```

Requirements:

- one successful explicit `start()` creates exactly one App Server adapter for that execution;
- the created adapter remains associated with the session through `session.appServerAdapter` as already designed;
- repeated `getStatus()` calls must not create a second adapter;
- a second `start()` while a session is already `running` must retain the existing current behavior and must not create another adapter.

### 3. Preserve disposal/cleanup

The existing `executeWithAppServer()` cleanup currently disposes the thread and App Server adapter in `finally`, and shutdown handling disposes active session adapters.

Preserve these paths.

Do not solve the defect by caching one global orphan adapter indefinitely.

The lifecycle must remain execution-owned:

```text
explicit execution start
→ adapter created
→ session owns adapter
→ execution terminal/cancel/shutdown
→ adapter disposed
```

### 4. Do not change renderer polling to conceal the defect

`src/renderer/app/App.tsx` may remain unchanged unless a directly necessary test-only or typing adjustment is proven.

The existing status poll is valid once `getStatus()` is side-effect free.

Do not:

- remove status polling merely to reduce the frequency of process creation;
- increase the idle polling interval as the fix;
- require the Operator to manually refresh status;
- auto-click/start implementation on workspace entry.

## Required Acceptance Criteria

### AC1 — Idle status is side-effect free

Create a focused service test with an eligible Work Card/build-review fixture and a counting `appServerFactory`.

Call:

```text
await service.getStatus(root)
```

multiple times with no execution session.

Required result:

```text
status.state = ready
appServerFactoryCalled = 0
```

No App Server adapter is created.

### AC2 — Poll-equivalent repeated status remains side-effect free

Call `getStatus(root)` at least five times in succession against the same eligible idle workspace.

Required result:

```text
appServerFactoryCalled = 0
```

This test represents renderer polling and must prove that repeated status reads cannot accumulate Codex processes.

### AC3 — Explicit start owns process creation

For the same eligible fixture, invoke:

```text
await service.start(root)
```

with a counting fake App Server factory.

Required result:

```text
appServerFactoryCalled = 1
```

and the execution enters the expected running/terminal lifecycle.

### AC4 — Status during execution does not create another adapter

After explicit `start()` has created the execution adapter, call `getStatus(root)` repeatedly while the session is running.

Required result:

```text
appServerFactoryCalled remains 1
```

### AC5 — Status after terminal execution does not create another adapter

After the explicit execution reaches `completed`, `failed`, or `cancelled`, call `getStatus(root)` repeatedly.

Required result:

```text
appServerFactoryCalled remains 1
```

unless and until a separate explicit retry/start action is invoked.

### AC6 — Concurrent/repeated start protection is preserved

While one execution is already running, invoke `start(root)` again.

Preserve existing behavior:

- second call reports execution already running / cannot run again;
- no second App Server adapter is created;
- factory count remains 1.

### AC7 — Adapter disposal is preserved

Focused fake-adapter proof must establish that the execution-owned adapter is disposed on the existing terminal/cancellation lifecycle as applicable.

Do not weaken existing shutdown cleanup.

### AC8 — Environment resolution remains explicit

Navigating to or polling the Implement workspace must not invoke `startEnvironmentResolution()` or development-environment provisioning.

The existing explicit `Resolve Environment` action remains the only UI path that starts environment resolution after the normal execution/preflight state requires Operator action.

### AC9 — Renderer does not auto-start implementation

Preserve the current renderer contract:

```text
workspace entry
→ getCodexImplementerExecutionStatus()
```

and:

```text
Run Codex Implementer button
→ startCodexImplementerExecution()
```

Add or preserve source-level renderer regression proving there is no automatic `startCodexImplementerExecution()` call in the Implement-workspace navigation/status effect.

### AC10 — Windows hide behavior is not used as the repair

`spawnPackagedCodexAppServer()` may retain `windowsHide: true`.

Do not claim acceptance merely because spawned windows are hidden. The proof requirement is that **no Codex App Server is spawned before an explicit execution action**.

## Preserved Passed Behavior

Preserve:

- Work Card approval/navigation into the Implement workspace;
- explicit `Run Codex Implementer` button and execution workflow;
- existing development-environment preflight and explicit environment-resolution workflow;
- Codex App Server stdio transport;
- `windowsHide: true` on packaged Codex process creation;
- existing execution policy, approvals, sandbox, MCP elicitation, and user-input handling;
- execution status/event/report projection;
- Implementer Report detection/refresh behavior;
- cancellation behavior;
- App Server/thread disposal during execution completion and cancellation;
- application-shutdown cleanup of active execution adapters;
- all passed RECONSTRUCTION-REPAIR01 through REPAIR04 behavior;
- Agent Harness/MCP/OAuth behavior.

## Forbidden Changes

Do not:

- redesign the Implement workspace;
- remove or slow polling as a substitute for fixing `getStatus()`;
- add an automatic implementation start on navigation;
- add a process-spawning `codex --version`, App Server initialize, terminal, PowerShell, `cmd.exe`, or other subprocess probe to `getStatus()`;
- hide repeated process creation with additional Windows flags and call that the fix;
- create a global long-lived orphan Codex adapter merely for readiness checks;
- modify planning lifecycle authority;
- modify Work Card approval/disposition behavior;
- modify Agent Harness/MCP/OAuth contracts;
- modify prompt/tool parity from REPAIR04;
- broaden this into generic execution/Harness architecture;
- perform Git stage/commit/push/branch mutation unless separately authorized by the Operator.

## Required Files / Areas to Inspect

At minimum inspect:

- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `src/preload/index.ts`
- `src/main/main.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- relevant renderer Work Card building review/source tests only if required for AC9.

## Focused Validation

Do not run the entire historical suite by default.

Required validation:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/work-card-building/codex-implementer-execution-service.test.cjs test/work-card-building/codex-app-server-transport.test.cjs test/renderer/work-card-building-review-workspace.test.cjs
```

If the exact renderer source regression for AC9 lives in another existing focused test file, include that file in the command and report it.

The Implementer Report must give exact command results and identify any sandbox-specific `spawn EPERM` rerun lane separately.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR05_side_effect_free_implement_workspace_status_and_codex_process_lifecycle.md`

The report must include:

- repository/branch/status verification;
- exact Operator live-validation failure;
- confirmed renderer status-poll path;
- confirmed `getStatus()` → `appServerFactory()` → `loadCodexAppServerAdapter()` → `initialize()` → `spawnPackagedCodexAppServer()` root cause;
- confirmation that the status-created adapter was previously discarded without disposal;
- files changed;
- exact correction to `getStatus()`;
- proof repeated idle status calls invoke the App Server factory zero times;
- proof explicit `start()` invokes the factory exactly once;
- proof status calls during/after execution do not increment the factory count;
- proof repeated start while running does not create another adapter;
- adapter disposal/cleanup proof;
- focused commands/results;
- deviations/blockers;
- remaining Operator live validation;
- confirmation of no Git mutation unless separately authorized.

## Required Operator Live Validation

After Architect review passes:

1. Restart/reload ChampCity A/I with the repaired build.
2. Navigate normally to an Approved Work Card's Implement workspace.
3. **Do not click `Run Codex Implementer`.**
4. Remain on the workspace for at least 15 seconds so multiple idle status polls occur.
5. Verify no terminal window appears and no Codex implementation process is launched by navigation/status polling.
6. Verify the workspace remains responsive and presents the normal explicit `Run Codex Implementer` action.
7. Click `Run Codex Implementer` once.
8. Verify Codex execution begins only at that point.
9. Verify no repeated terminal/process windows are spawned by ongoing status polling during execution.
10. Cancel or allow the bounded execution to complete and verify the workspace returns to the expected status/report path.

The live pass criterion is not merely "no visible terminal." The required behavior is **no Codex App Server process creation before the explicit Run action**.

## Return Path

After implementation, return this repair for Architect code review and then Operator live validation.

If it passes, return to the normal Approved Work Card → Implement workflow without creating another lifecycle or approval step.
