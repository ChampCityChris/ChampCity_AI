# RECONSTRUCTION-REPAIR01-REPAIR06A-REPAIR02 — Narrow Catastrophic Host-Action Guard and Frictionless Execution

## Repair Type

Narrow evidence-derived child repair of `RECONSTRUCTION-REPAIR01-REPAIR06A` and `RECONSTRUCTION-REPAIR01-REPAIR06A-REPAIR01` after Operator live validation proved that the new approval system is too intrusive for routine implementation work.

This repair deliberately narrows the approval architecture. It does not create a broader command-risk system. The intended product behavior is low-friction autonomous implementation with a very small deterministic catastrophic host-action deny guard.

There is no prerequisite gate for this repair and this repair does not create a prerequisite gate for REPAIR06B.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Parent Repairs / Failed Live Evidence

Parent repairs:

- `repair/RECONSTRUCTION_REPAIR01-REPAIR06A_codex_execution_authority_and_operator_approval_boundary.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR06A-REPAIR01_plain_language_codex_approval_impact_presentation.md`

Relevant Implementer Reports:

- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A_codex_execution_authority_and_operator_approval_boundary.md`
- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A-REPAIR01_plain_language_codex_approval_impact_presentation.md`

Operator live validation evidence:

- During a normal implementation run, ChampCity displayed `Codex Approval Required` for the command:

```text
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'npm run build'
```

- The Operator correctly observed that this is routine implementation work, not a host-control intervention.
- Requiring Operator approval for ordinary build/test/package/file operations recreates the intrusive approval friction the product is intended to avoid.
- The original catastrophic failure that motivated REPAIR06A was not that Codex ran ordinary commands. It was that Codex was able to terminate the running ChampCity A/I application while attempting to resolve an implementation obstacle.

## Confirmed Current Implementation

`src/main/workCardBuilding/codexImplementerExecutionPolicy.ts` now correctly gives normal Work Card implementation `workspace-write` authority while retaining `on-request` App Server approval signaling.

`src/main/workCardBuilding/codexAppServerTransport.ts` currently converts every owned command, file-change, and permission approval request into a pending Operator approval unless it identifies an attempt to terminate the protected ChampCity process.

That means even a normal in-workspace command such as `npm run build` pauses the run and requires `Approve Once` or `Deny`.

The transport is already the correct interception point for App Server approval requests. The defect is the policy applied at that interception point, not the existence of the interception point.

## Confirmed Defect

REPAIR06A fixed unsafe blanket auto-approval by replacing it with blanket Operator approval. That correction was too broad.

The correct safety boundary is not:

```text
any App Server approval request
→ Operator decision
```

It is:

```text
ordinary implementation request
→ continue automatically

small catastrophic host-action set
→ hard deny automatically
```

The Operator should not become a shell-command reviewer.

## Required Architecture

The required architecture is explicit:

```text
WORK CARD IMPLEMENTATION
→ workspace-write sandbox remains the technical repository boundary
→ App Server approvalPolicy remains on-request internally
→ ChampCity receives approval requests as an interception hook
→ ordinary owned command/file/permission requests are auto-resolved
→ no Operator approval panel for routine implementation

CATASTROPHIC HOST ACTION
→ mechanically recognized from the approval request
→ hard denied by ChampCity
→ no Approve Anyway path
→ runtime denial evidence returned to Codex
→ Codex must choose another approach
```

`approvalPolicy = on-request` must remain internal so ChampCity continues to receive App Server approval requests and can intercept the catastrophic set. Do **not** change the runtime to an approval mode that bypasses the transport interception point.

## Catastrophic Deny Set

The deny set is intentionally very small.

### A. Terminating ChampCity A/I itself

Hard deny an obvious command that would terminate the active ChampCity control process.

At minimum retain protection for:

- current ChampCity main-process PID;
- `taskkill` or PowerShell `Stop-Process` targeting that protected PID;
- broad image/name termination matching the running ChampCity executable image, because such a command necessarily includes the active ChampCity application.

A process-termination request that does **not** target ChampCity is not forbidden by this repair.

Examples that must remain allowed and auto-resolved when the target is not protected:

```text
taskkill /PID <OTHER_PID> /F
Stop-Process -Id <OTHER_PID>
Stop-Process -Name ExampleApp
```

This intentionally permits Codex to terminate development/test/build processes that it started or that the implementation legitimately needs to clean up, provided the command does not terminate ChampCity itself.

Do not add a general process-ownership approval workflow.

### B. Shutting down, restarting, or logging off the local Windows machine

Hard deny obvious local-machine power/session termination operations, including direct or simply wrapped forms materially equivalent to:

```text
shutdown /s ...
shutdown /r ...
shutdown /g ...
shutdown /l ...
Restart-Computer
Stop-Computer
logoff
```

Do not block harmless inspection or an abort-only operation merely because the executable name is `shutdown`; classify the requested action.

### C. Stopping, restarting, or disabling Windows services

Hard deny obvious service-control operations materially equivalent to:

```text
Stop-Service ...
Restart-Service ...
Set-Service ... -StartupType Disabled
sc stop ...
sc config ... start= disabled
net stop ...
```

Read-only service inspection such as `Get-Service` or `sc query` is not part of the deny set.

Do not broaden this into a Windows administration policy engine.

## Bounded Wrapper Recognition

The Operator screenshot proves that App Server command approvals may present an ordinary command through a shell wrapper, for example:

```text
powershell.exe -Command 'npm run build'
```

For the catastrophic deny set only, recognize simple direct wrapper forms sufficiently to prevent an obvious protected action from bypassing the guard through:

- PowerShell `-Command` / `-CommandString` style direct command text where present in the request;
- `cmd.exe /c` direct command text.

This is not authorization to build a general shell parser, recursive interpreter, command consequence engine, or encoded-command decoder.

If the wrapper cannot be safely reduced to an obvious catastrophic action, do not invent meaning from it.

## Authorized Scope

### 1. Auto-resolve routine owned approval requests

Primary production file:

`src/main/workCardBuilding/codexAppServerTransport.ts`

For an approval request that:

- belongs to the active ChampCity Work Card execution; and
- is not in the catastrophic deny set above;

the transport must resolve it without Operator intervention using the protocol-supported accepted/granted response for that request type.

This applies to ordinary:

- command approvals;
- file-change approvals;
- legacy command/apply-patch approvals;
- permission approvals.

Required behavior:

```text
owned ordinary request
→ no approval.requested pending state
→ accepted/granted response returned
→ approval.completed telemetry retained
→ implementation continues
```

Do not require the renderer to display `Codex Approval Required` for routine requests.

### 2. Hard-deny only the catastrophic set

For commands in the catastrophic deny set:

```text
→ do not create pendingApproval
→ do not offer Approve Once
→ return protocol-supported rejection/denial
→ emit approval.completed denial telemetry
→ emit runtime.denial with a concise reason
→ keep ChampCity running
```

A denial message should explain the protected boundary, for example:

```text
ChampCity denied a command that would terminate the active ChampCity A/I application.
```

or:

```text
ChampCity denied a command that would restart or shut down the local machine.
```

or:

```text
ChampCity denied a command that would stop, restart, or disable a Windows service.
```

### 3. Preserve internal `on-request` interception

Do not change Work Card execution to `approvalPolicy=never`, `never`, or any protocol mode that causes catastrophic commands to bypass ChampCity's request interception.

Preserve:

```text
Work Card implementation sandbox = workspace-write
approvalPolicy = on-request
approvalsReviewer = user/current compatible protocol value
```

The `approvalsReviewer` protocol field may remain for compatibility even though ordinary approvals are application-resolved. Do not use that field as justification to reintroduce Operator prompts for ordinary commands.

### 4. Do not expand the UI

The existing approval panel code may remain for protocol compatibility, diagnostics, or future use, but routine implementation must not populate `pendingApproval` and therefore must not surface the panel.

Do not add:

- risk scores;
- intervention categories beyond the deny set;
- command consequence previews;
- per-command approval preferences;
- `Approve for session`;
- approval history management;
- another settings surface.

This repair is specifically intended to reduce friction.

## Acceptance Criteria

### AC1 — Routine build command is frictionless

A focused transport/service regression uses the exact live-validation shape:

```text
powershell.exe -Command 'npm run build'
```

Expected result:

```text
request is accepted automatically
no approval.requested event
no pendingApproval in execution model
approval.completed telemetry may record the automatic acceptance
implementation remains running/continues
```

The Operator approval panel is not surfaced.

### AC2 — Other routine implementation approvals are frictionless

Focused proof covers representative owned requests including:

```text
npm test
npm ci
ordinary file-change approval
ordinary permission approval
```

All are automatically resolved without pending Operator approval.

This acceptance criterion does not assert that `npm ci` is always substantively necessary; REPAIR06B separately corrects the Phase-00 WC01 contract. It only proves that an authorized ordinary command does not create approval friction.

### AC3 — ChampCity self-termination remains hard denied

Synthetic tests cover at least:

```text
taskkill targeting protected ChampCity PID
Stop-Process targeting protected ChampCity PID
broad image/name termination matching protected ChampCity executable
```

Expected result:

```text
protocol denial
runtime denial evidence
no pendingApproval
no Operator approval path
```

Do not terminate a real process in tests.

### AC4 — Non-protected process termination is allowed

Focused tests use a synthetic non-protected PID/process name and prove:

```text
taskkill /PID <OTHER_PID> /F
or Stop-Process -Id <OTHER_PID>
→ accepted automatically
→ no pendingApproval
```

This is the explicit regression proving Codex can terminate processes it starts or otherwise needs to clean up without asking the Operator.

### AC5 — Machine shutdown/restart/logoff is hard denied

Synthetic direct and simple-wrapper tests cover representative shutdown/restart/logoff commands.

Expected result:

```text
hard denial
runtime denial evidence
no pendingApproval
```

### AC6 — Windows service stop/restart/disable is hard denied

Synthetic tests cover representative service stop/restart/disable forms and prove they are denied without an approval option.

Read-only service inspection remains allowed.

### AC7 — Simple wrapper does not bypass catastrophic guard

At least one focused test proves an obvious catastrophic command nested in a direct PowerShell `-Command` or `cmd /c` wrapper is still denied.

Also prove an ordinary wrapped `npm run build` remains automatically accepted.

### AC8 — Existing ownership checks remain

Foreign-thread, stale-turn, duplicate/resolved-request, and unsupported App Server request protections remain passing.

Do not auto-accept a request that does not belong to the active execution.

### AC9 — Existing interactive requests remain interactive

Preserve existing actual human-interaction surfaces:

- Codex `request_user_input`;
- MCP elicitation;
- Windows UAC / environment-resolution human boundary where already implemented.

These are not command approvals and must not be silently answered by this repair.

### AC10 — REPAIR05 and REPAIR06A sandbox boundaries remain intact

Focused tests preserve:

- entering/polling Implement does not spawn Codex;
- explicit Run starts implementation;
- Work Card execution uses `workspace-write`;
- environment resolution remains the separate explicit broader-authority path;
- cancellation/disposal/report lifecycle behavior remains intact.

## Preserved Passed Behavior

Preserve:

- REPAIR05 side-effect-free status polling;
- REPAIR06A repository-scoped Work Card execution;
- REPAIR06A protected ChampCity control-process guard;
- existing App Server ownership validation;
- existing user-input and MCP-elicitation interactions;
- execution telemetry and runtime denial evidence;
- development-environment preflight/resolution architecture;
- no Git mutation unless separately authorized.

REPAIR06A-REPAIR01 plain-language summary helpers may remain, but routine requests should no longer reach the Operator approval panel.

## Forbidden Changes

Do not:

- create a broader approval or risk-classification system;
- ask the Operator to approve build/test/typecheck/package/file operations;
- block termination of every process;
- block a non-protected PID merely because Codex may have started it;
- special-case the repository name `ChampCity_AI`;
- add process ownership tracking unless strictly necessary to protect the active ChampCity application;
- change to a runtime approval mode that bypasses the transport interception hook;
- remove `workspace-write` Work Card sandboxing;
- turn Environment Resolution into normal implementation authority;
- add command consequence previews or recursive script resolution;
- modify Phase-00 WC01 or REPAIR06B artifacts;
- run Phase-00 WC01 as validation;
- stage/commit/push/branch-mutate unless separately authorized.

## Required Files / Areas to Inspect

At minimum:

- `src/main/workCardBuilding/codexAppServerTransport.ts`
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts` for preservation only
- `src/main/workCardBuilding/codexImplementerExecutionService.ts` for preservation/model proof only
- `src/main/workCardBuilding/codexAppServerProtocol.ts`
- `src/shared/workspaceContracts.ts` only if needed for preservation
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx` for no-routine-panel proof only
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

Do not run the full historical suite by default.

Do not run the actual Phase-00 WC01 implementation as part of this repair validation.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A-REPAIR02_narrow_catastrophic_host_action_guard_and_frictionless_execution.md`

The report must include:

- failed live evidence from the routine `npm run build` approval prompt;
- exact prior blanket-pending behavior removed;
- exact catastrophic deny classes implemented;
- proof `approvalPolicy=on-request` remains internal;
- proof routine command/file/permission approvals no longer create `pendingApproval`;
- proof non-protected process termination is allowed automatically;
- proof ChampCity termination, machine shutdown/restart/logoff, and Windows service stop/restart/disable are hard denied;
- files changed;
- exact focused validation commands/results;
- deviations/blockers;
- confirmation Phase-00 WC01 was not run;
- confirmation no Git mutation.

## Operator Live Validation

After Architect review:

1. Restart/reload ChampCity A/I.
2. Run a safe implementation/fixture that performs normal build/test commands.
3. Verify routine commands proceed without `Codex Approval Required` interruption.
4. Verify normal implementation remains visible through execution telemetry rather than approval prompts.
5. Do not perform real shutdown, service-stop, or ChampCity self-termination testing. Automated synthetic proof is sufficient for catastrophic denials.
6. A safe non-protected child-process fixture may be used if needed to prove Codex can terminate a process it started without Operator intervention.

## Return Path

Return this child repair for Architect code review and Operator low-friction implementation validation.

This repair introduces no prerequisite gate for REPAIR06B and does not change REPAIR06B scope.