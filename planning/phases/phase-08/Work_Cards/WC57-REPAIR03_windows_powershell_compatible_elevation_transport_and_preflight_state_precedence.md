<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR03",
    "repairId": "WC57-REPAIR03",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Windows PowerShell-Compatible Elevation Transport and Preflight State Precedence",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair of WC57 elevated-wrapper runtime compatibility, redirected-stream safety, mixed preflight state precedence, and Codex availability presentation",
    "parentWorkCardId": "WC57",
    "confirmedDefect": "WC57-REPAIR02 established the correct application-owned request/result envelope and typed retry/interaction contracts, but its generated elevated wrapper uses ProcessStartInfo.ArgumentList even though it explicitly runs under Windows PowerShell 5.1/full .NET Framework where that API is unavailable. The wrapper also drains redirected stdout and stderr in a deadlock-prone synchronous order. Separately, top-level preflight chooses waiting-for-operator before structural blockers, and the renderer equates canRunAgain with Codex Availability Ready even while execution state is unavailable.",
    "rootCause": "REPAIR02 proved the Node-side envelope adapter using injected synthetic result files but did not execute the generated target wrapper under the exact powershell.exe runtime used in production. Runtime API compatibility and stream-drain behavior therefore escaped validation. The state projection also conflated retry action availability with environment/Codex readiness and gave human-interaction state precedence over structural blocker authority.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Preserve the WC56/WC57/REPAIR01/REPAIR02 architecture. Replace only the incompatible/deadlock-prone target execution inside the elevated wrapper with a Windows PowerShell 5.1-compatible deterministic mechanism, add direct host-runtime compatibility proof without UAC, give structural blockers top-level precedence, and stop rendering retryability as Codex readiness. Do not implement WC58.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR03 — Windows PowerShell-Compatible Elevation Transport and Preflight State Precedence

Status: Approved for Implementer execution  
Parent: `WC57`  
Depends on: `WC57-REPAIR02`  
Git mutation: prohibited

## Confirmed Defects

### Defect 1 — Elevated wrapper uses a .NET API unavailable in the runtime it launches

Production `NodeCommandRunner.runElevated(...)` intentionally uses Windows `powershell.exe` for the outer and elevated wrapper processes.

The elevated wrapper currently executes:

```text
[System.Diagnostics.ProcessStartInfo]::new()
→ $processInfo.ArgumentList.Add(...)
```

Microsoft documents Windows PowerShell 5.1 / `powershell.exe` as using full .NET Framework. Microsoft documents `ProcessStartInfo.ArgumentList` for .NET Core 2.1+ / .NET Standard 2.1 and does not list .NET Framework as an applicable runtime.

The wrapper can therefore fail after successful UAC elevation before the approved target command is ever executed.

Official Microsoft references:

```text
https://learn.microsoft.com/powershell/scripting/what-is-windows-powershell
https://learn.microsoft.com/dotnet/api/system.diagnostics.processstartinfo.argumentlist
```

### Defect 2 — Redirected stdout/stderr can deadlock

The wrapper redirects both target streams and then performs:

```text
StandardOutput.ReadToEnd()
StandardError.ReadToEnd()
WaitForExit()
```

Microsoft explicitly documents that sequential synchronous reads from both redirected stdout and stderr can deadlock when the child fills the stream that is not currently being drained.

Official Microsoft reference:

```text
https://learn.microsoft.com/dotnet/api/system.diagnostics.process.standardoutput
```

### Defect 3 — Structural blocker loses top-level authority when any interaction exists

Current `finalState(...)` returns `waiting-for-operator` before checking structural blockers.

Example:

```text
restart-required managed requirement
+
unsupported requirement
```

currently projects:

```text
state = waiting-for-operator
retryAllowed = false
summary = restart required
```

Restarting cannot resolve an unsupported capability. A structural/nonretryable blocker must dominate the top-level state.

### Defect 4 — Retry action availability is rendered as Codex readiness

The execution service correctly projects retryable blocked/waiting preflight as:

```text
state = unavailable
canRunAgain = true
```

The Build console currently maps `canRunAgain=true` to:

```text
Codex Availability = Ready
```

`canRunAgain` means the Operator may rerun the deterministic preflight. It does not mean Codex is currently available to start.

## Objective

Complete WC57's elevation and preflight boundary with an implementation that is actually executable on the supported Windows host runtime.

Required behavior:

```text
approved target command + ordered args
→ REPAIR02 request envelope
→ encoded UAC wrapper
→ Windows PowerShell 5.1-compatible target invocation
→ deadlock-safe stdout/stderr capture
→ REPAIR02 result envelope
→ existing unified classifier
→ structural blocker precedence
→ retryable action remains available without claiming Codex is ready
→ Codex starts only after ready | not-required
```

## Required Changes

### 1. Preserve the REPAIR02 envelope/UAC architecture

Do not replace or bypass the accepted REPAIR02 transport architecture.

Preserve:

- one unique application temp execution directory per elevated call;
- request JSON containing original `command`, ordered `args[]`, optional `cwd`, and result target;
- outer UAC `Start-Process powershell.exe -Verb RunAs` using fixed PowerShell switches plus one encoded payload;
- result JSON containing target `exitCode`, `stdout`, and `stderr`;
- original target identity returned by `runElevated(...)` when a valid result envelope exists;
- cleanup in `finally` behavior;
- UAC cancellation fallback when no wrapper result exists.

The repair is inside the elevated wrapper's target-execution mechanism and downstream state projection, not a transport redesign.

### 2. Remove `ProcessStartInfo.ArgumentList` from the Windows PowerShell wrapper

The production elevated wrapper must not use any runtime API unavailable in Windows PowerShell 5.1/full .NET Framework.

Specifically remove reliance on:

```text
ProcessStartInfo.ArgumentList
```

Do not solve this by requiring or installing PowerShell 7 / `pwsh.exe` as a new host prerequisite. Ground-zero provisioning must continue to work using the Windows-shipped PowerShell runtime already selected by WC57.

### 3. Implement deterministic Windows PowerShell 5.1-compatible ordered-argument invocation

Use one application-owned mechanism that preserves the request `args[]` as target arguments under Windows PowerShell 5.1.

A valid implementation may use either:

A. `.NET Framework ProcessStartInfo.Arguments` with an application-owned Windows command-line quoting function; or

B. another Windows PowerShell 5.1-compatible invocation mechanism whose exact ordered-argument behavior is proven by the direct compatibility tests required below.

If using `ProcessStartInfo.Arguments`, implement deterministic quoting equivalent to Windows command-line/CRT argument escaping:

- empty string remains one empty argument;
- whitespace-containing arguments remain one argument;
- embedded double quotes are preserved;
- backslashes immediately preceding a double quote are escaped correctly;
- trailing backslashes in a quoted argument are preserved;
- argument order is unchanged.

Do not concatenate raw arguments with spaces.

Do not rely on `Start-Process -ArgumentList` array joining for the final target.

### 4. Make stdout/stderr capture deadlock-safe

The elevated target must preserve separate stdout/stderr and target exit code without a sequential dual-`ReadToEnd()` deadlock.

Use one of these bounded patterns:

- asynchronous/concurrent draining of at least one redirected stream as documented by Microsoft; or
- target stdout/stderr redirected to separate application-owned transient files by the already-elevated wrapper, followed by file reads after process completion; or
- another equivalent approach with explicit proof that both streams can produce substantial output without hanging.

Do not merge stderr into stdout.

Do not drop target output solely to avoid the deadlock.

All transient stream files, if used, belong under the existing per-execution temp root and must be cleaned with the request/result state.

### 5. Add a direct Windows PowerShell runtime compatibility test

The REPAIR02 injected `processRunner` tests must remain, but they are insufficient by themselves.

Add a Windows-only automated test that executes the generated target-execution wrapper logic under the exact production executable:

```text
powershell.exe
```

without requesting elevation and without mutating the host.

The test must use a harmless temporary target/command and prove under the actual Windows PowerShell runtime:

1. the wrapper reaches and executes the target rather than failing on an unavailable .NET API;
2. ordered arguments survive, including at minimum:
   - normal token;
   - value containing spaces;
   - empty argument;
   - embedded double quote;
   - trailing backslash in a quoted/space-containing argument;
3. target stdout is captured;
4. target stderr is captured separately;
5. target nonzero exit code is captured exactly;
6. no real UAC prompt occurs.

The test may expose a small internal wrapper-builder/helper seam for direct execution. Do not duplicate a second implementation only for tests.

### 6. Add deadlock regression proof

Add a Windows-only harmless target test that writes enough data to both stdout and stderr to exceed trivial pipe buffering and proves the wrapper completes within the normal test timeout with both streams captured.

The test must execute the real target-capture mechanism used by the wrapper, not a fake result envelope.

Do not introduce a production arbitrary short timeout for legitimate Visual Studio/WinGet installation merely to make this test pass.

### 7. Give structural/nonretryable requirements top-level state precedence

Refactor top-level preflight state calculation.

Required precedence:

```text
if any unsatisfied requirement is structural/nonretryable
→ state = blocked
→ retryAllowed = false

else if any unsatisfied requirement requires human interaction
→ state = waiting-for-operator
→ retryAllowed = true

else if any unsatisfied requirement is a retryable managed failure
→ state = blocked
→ retryAllowed = true

else
→ state = ready
```

Structural/nonretryable includes at minimum:

```text
external
unsupported
host-policy
ambiguous-package
```

and any other unsatisfied requirement explicitly marked `retryAllowed=false`.

A restart/UAC requirement may remain visible in detailed requirement evidence when another structural blocker exists, but it must not replace the top-level blocked state or primary summary.

### 8. Make blocked summary primary when structural authority blocks execution

`summaryForRequirements(...)` must follow the same top-level precedence.

When structural/nonretryable blockers exist, the summary must indicate the environment is blocked by unsatisfied requirements rather than instructing the Operator that restart/permission alone will resolve the run.

When no structural blocker exists:

- permission only → Windows permission summary;
- restart only → Windows restart summary;
- both → combined summary;
- retryable managed failure → blocked/retryable failure summary.

Do not infer blocker or interaction kind from human-readable reason strings.

### 9. Separate Codex current availability from retry action availability

In `WorkCardBuildingReviewWorkspace.tsx`, do not use `canRunAgain` alone to render `Codex Availability: Ready`.

Required minimum semantics:

```text
execution.state = unavailable
→ Codex Availability = Unavailable
```

including when `canRunAgain=true` because a preflight retry is permitted.

The existing Run button may remain enabled from `canRunAgain=true`.

This distinction is intentional:

```text
Codex Availability = Unavailable
Run Codex Implementer = enabled
```

means the button will rerun preflight and may start Codex if the environment becomes ready.

Do not disable legitimate retry merely to make the availability label consistent.

### 10. Expand state/UI tests around mixed conditions

Add tests proving at minimum:

1. restart-only → `waiting-for-operator`, retryable;
2. permission-only → `waiting-for-operator`, retryable;
3. retryable provisioning failure only → `blocked`, retryable;
4. unsupported only → `blocked`, nonretryable;
5. restart + unsupported → `blocked`, nonretryable;
6. permission + host-policy → `blocked`, nonretryable;
7. retryable managed failure + unsupported → `blocked`, nonretryable;
8. mixed structural state summary does not tell the Operator that restart/permission alone is sufficient;
9. execution model remains `unavailable` for retryable blocked/waiting preflight;
10. Run remains available when `canRunAgain=true`;
11. rendered Codex Availability is `Unavailable` while execution state is `unavailable`, even when retry is enabled;
12. existing typed permission/restart labels remain correct when waiting is the true top-level state.

Prefer rendered/helper behavior tests over source-string-only assertions for the availability result.

## Preserved Behavior

Preserve unchanged:

- WC56 project-ground-zero semantics;
- `managed | external` Work Card authority;
- Architect-owned `champcity-development-environment` v1 schema;
- WC57 application-owned WinGet/WinGet Configuration architecture;
- WC57-REPAIR01 WinGet >=1.11 readiness, VS2022 binding, environment refresh, registry/version handling, silent install behavior, and SDK-after-preflight sequence;
- WC57-REPAIR02 request/result envelope identity, encoded outer UAC wrapper, cleanup, typed blocker kinds, per-requirement retry identity, top-level retry identity, and typed interaction kinds;
- no model/web-selected installer behavior;
- exact package registry authority;
- no automatic restart;
- no host-policy bypass;
- WC54 full-local Codex execution policy until WC58 explicitly changes approval transport;
- WC55 selected-root routing/prompt behavior;
- existing Codex cancellation/report-refresh behavior;
- no free-form Implementer chat;
- no Git mutation.

WC58 remains separate and must not be implemented in this repair.

## Authorized Surface

Primary production files authorized:

```text
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
```

`src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts` may be changed only if required to preserve the corrected typed preflight projection.

`src/shared/workspaceContracts.ts` may be changed only if required by an explicit rendered availability/state helper contract; no unrelated execution model redesign is authorized.

A small dedicated Windows command-line quoting/target-process helper module under `src/main/developmentEnvironment/` is authorized if it is used by the production wrapper and tests.

Tests authorized:

```text
test/development-environment/elevated-command-transport.test.cjs
test/development-environment/windows-development-environment-provisioner.test.cjs
test/work-card-building/codex-implementer-execution-service.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
```

A dedicated Windows PowerShell wrapper compatibility test file under `test/development-environment/` is authorized.

Required report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md
```

## Acceptance Criteria

1. Production elevated target execution no longer uses `ProcessStartInfo.ArgumentList` under `powershell.exe`.
2. Production elevated wrapper requires no PowerShell 7/`pwsh.exe` prerequisite.
3. The accepted REPAIR02 request/result envelope and encoded UAC outer-launch architecture remain intact.
4. Final target ordered arguments are reconstructed deterministically under Windows PowerShell 5.1.
5. An argument containing spaces remains one target argument.
6. An empty argument remains present.
7. Embedded double quotes survive target argument reconstruction.
8. Backslashes adjacent to quotes/trailing quoted backslashes survive correctly.
9. Target stdout is returned separately through the result envelope.
10. Target stderr is returned separately through the result envelope.
11. Target exit code is preserved exactly through the result envelope.
12. Target stdout/stderr capture cannot use the documented sequential dual-`ReadToEnd()` deadlock pattern.
13. A real non-elevated `powershell.exe` compatibility test executes the same production target-execution mechanism and proves argument/output/exit behavior without UAC.
14. A real non-elevated `powershell.exe` high-output test proves both stdout and stderr can be captured without deadlock.
15. Existing injected outer-UAC/envelope tests remain green.
16. UAC cancellation with no result envelope still maps to typed `windows-permission` retryable state.
17. Elevated host-policy and generic target failures continue to reach the existing classifier through target result evidence.
18. Temp request/result/stream transport artifacts are cleaned after success/failure/cancellation.
19. Any unsatisfied structural/nonretryable requirement makes top-level preflight `blocked` and `retryAllowed=false` even if another requirement requests restart or permission.
20. Human interaction becomes top-level `waiting-for-operator` only when no structural/nonretryable blocker exists.
21. Retryable managed execution/verification failure remains `blocked` with `retryAllowed=true` when no structural blocker exists.
22. Structural blocker summary takes precedence over restart/permission summary in mixed cases.
23. Permission-only, restart-only, and mixed-interaction summaries remain correct when waiting is the valid top-level state.
24. `CodexImplementerExecutionService` remains `unavailable` for blocked/waiting preflight and never uses cached evidence as ready.
25. Retryable blocked/waiting preflight still enables the existing Run action to rerun preflight.
26. Renderer displays `Codex Availability: Unavailable` whenever execution state is `unavailable`, including retryable blocked/waiting preflight.
27. Renderer continues to display the correct typed Windows permission/restart status.
28. WC57-REPAIR01 accepted WinGet/VS2022/environment/version/SDK-order behavior remains green.
29. WC57-REPAIR02 typed blocker/retry/interaction behavior remains green except for the explicit state-precedence correction in this card.
30. Automated tests trigger no real UAC, WinGet install, Visual Studio modification, reboot, or host machine provisioning mutation.
31. `npm run typecheck`, `npm run build`, focused tests, and `npm test` pass in the normal Windows validation lane.
32. No Git mutation is performed.

## Negative Constraints

Do not:

- install or require PowerShell 7 solely to avoid Windows PowerShell compatibility;
- replace the REPAIR02 request/result envelope with an unrelated transport;
- pass arbitrary final target arguments directly through outer `Start-Process -ArgumentList`;
- concatenate raw target arguments with spaces;
- merge stderr into stdout;
- drop stdout/stderr evidence;
- use the known sequential stdout-then-stderr `ReadToEnd()` pattern with both streams redirected;
- classify structural blocker versus interaction by matching free-form message text;
- make all blocked states retryable;
- make retry action permission imply Codex is currently ready;
- add automatic retry loops;
- bypass UAC or enterprise/host policy;
- auto-reboot Windows;
- broaden the Work Card environment input schema;
- change registry package authority;
- add model/web installer selection;
- add general environment-management UI;
- add free-form Implementer input;
- implement WC58 App Server/ARC/automatic approval behavior;
- change unrelated Project Planning, Phase Planning, MCP routing, Architect generation, or close-loop behavior;
- stage, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Implementer Report Requirements

The Implementer Report must remain `Pending` and include:

- exact files changed;
- before/after elevated target invocation mechanism;
- explicit confirmation that production `powershell.exe` wrapper no longer uses `ProcessStartInfo.ArgumentList`;
- exact argument-escaping/preservation mechanism;
- exact stdout/stderr deadlock-avoidance mechanism;
- direct Windows PowerShell compatibility test command/results;
- high-output dual-stream test command/results;
- mixed structural/interaction state-precedence table;
- Codex Availability versus Run-retry presentation behavior;
- acceptance-criterion-to-test mapping;
- typecheck/build/focused/full validation commands with exit codes;
- confirmation that no real UAC or host provisioning mutation occurred in automated tests;
- remaining disposable-host WC57 Operator validation;
- confirmation no WC58 work was performed.

End with:

```text
Document.Status=Pending
```

## Manual Validation

Do not perform the full disposable-host WC57 Operator validation until this repair passes Architect review.

After approval, the parent WC57 manual validation remains the same:

1. managed install without elevation;
2. real UAC-elevated provisioning action with target result classification;
3. declined UAC followed by retry;
4. restart-required behavior with correct UI guidance;
5. transient provisioning failure followed by retry;
6. VS2022 `msvc-x64/desktop-cpp` provisioning and verification;
7. confirmation Codex starts only after final environment readiness.

WC58 remains held until WC57 passes this repair review and the required real-machine validation.
