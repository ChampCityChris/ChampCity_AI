# RECONSTRUCTION-REPAIR01-REPAIR06A-REPAIR02-REPAIR01 — Two Missing Windows Catastrophic Forms

## Repair Type

Microscopic child repair of `RECONSTRUCTION-REPAIR01-REPAIR06A-REPAIR02_narrow_catastrophic_host_action_guard_and_frictionless_execution.md`.

Governing standard:

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Failed Architect Review Evidence

Parent Implementer Report:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A-REPAIR02_narrow_catastrophic_host_action_guard_and_frictionless_execution.md`

Architect review found the parent repair architecture correct and focused validation passing, but identified two direct Windows forms that remain outside the intended catastrophic deny set:

```text
shutdown /p
Set-Service <name> -Status Stopped
```

Confirmed production source:

`src/main/workCardBuilding/codexAppServerTransport.ts`

Current `targetsMachineSessionTermination()` recognizes `shutdown /s`, `/r`, `/g`, and `/l`, but not `/p`.

Current `targetsWindowsServiceControl()` recognizes `Stop-Service`, `Restart-Service`, `Set-Service ... -StartupType Disabled`, `sc stop`, `sc config ... start= disabled`, and `net stop`, but not `Set-Service ... -Status Stopped`.

These are omissions in the existing narrow catastrophic classifier. They are not authority-architecture defects.

## Objective

Add exactly the two missing deny forms while preserving all frictionless execution behavior from the parent repair.

## Authorized Correction

Modify only the existing catastrophic command classification in:

`src/main/workCardBuilding/codexAppServerTransport.ts`

Required additions:

1. `shutdown /p` is classified as `machine-session` and hard-denied.
2. `Set-Service ... -Status Stopped` is classified as `windows-service` and hard-denied.

The existing one-layer PowerShell/cmd wrapper recognition must continue to apply, so a simple direct wrapper around either form is also denied.

Do not add any other command class.

## Acceptance Criteria

### AC1 — `shutdown /p` is denied

Focused synthetic transport proof:

```text
shutdown /p
→ runtime.denial
→ protocol reject/deny
→ approval.completed denial telemetry
→ no approval.requested pending state
```

Also prove one simple direct wrapper form, for example:

```text
cmd.exe /c "shutdown /p"
```

or equivalent PowerShell `-Command` form.

### AC2 — `Set-Service -Status Stopped` is denied

Focused synthetic transport proof:

```text
Set-Service Spooler -Status Stopped
→ runtime.denial
→ protocol reject/deny
→ approval.completed denial telemetry
→ no approval.requested pending state
```

Also prove one simple direct wrapper form.

### AC3 — Existing frictionless behavior remains

Retained transport tests must still prove routine requests auto-resolve, including the live-validation shape:

```text
powershell.exe -Command 'npm run build'
```

No `Codex Approval Required` state may be introduced for routine implementation work.

### AC4 — Non-protected process cleanup remains allowed

Retained proof must still pass for non-protected process termination such as:

```text
taskkill /PID <OTHER_PID> /F
Stop-Process -Name ExampleApp
```

### AC5 — Parent deny set remains intact

Existing synthetic tests for ChampCity self-termination, machine shutdown/restart/logoff, and Windows service stop/restart/disable remain passing.

## Preservation / Forbidden Changes

Preserve exactly:

- Work Card `workspace-write` sandbox;
- internal `approvalPolicy = on-request` interception;
- ordinary command/file/permission auto-resolution;
- non-protected process termination;
- protected ChampCity process hard denial;
- user-input and MCP elicitation interaction;
- REPAIR05 side-effect-free status polling;
- explicit Environment Resolution behavior.

Do not:

- add a general approval workflow;
- add new UI;
- add command consequence analysis;
- broaden the catastrophic deny set beyond these two missing forms;
- change sandbox or approval policy;
- modify REPAIR06B or Phase-00 WC01;
- run Phase-00 WC01;
- perform Git mutation.

## Focused Validation

Run:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/work-card-building/codex-app-server-transport.test.cjs
```

No full historical suite is required.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06A-REPAIR02-REPAIR01_two_missing_windows_catastrophic_forms.md`

Report only:

- the two predicates added;
- files changed;
- direct + wrapped regression proof for both forms;
- retained routine auto-resolution and non-protected process-cleanup proof;
- exact validation results;
- deviations/blockers;
- confirmation no Git mutation.

## Return Path

Return for Architect code review, then Operator low-friction live validation of ordinary build/test execution. Do not perform real shutdown, service-stop, or self-termination testing.