<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
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
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "work-card-repair-implementation",
    "workCardId": "WC57-REPAIR03",
    "parentWorkCardId": "WC57",
    "repositoryVerification": "verified approved repo root",
    "gitMutationAuthorized": false,
    "commitCreated": false,
    "commitHash": "none"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# IMPLEMENTER REPORT WC57-REPAIR03 - Windows PowerShell-Compatible Elevation Transport And Preflight State Precedence

Report type: numbered Work Card repair implementation  
Repository path inspected: verified approved repo root  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow` tracking `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote: `origin` / `https://github.com/ChampCityChris/ChampCity_AI.git`  
Git mutation authorized: No  
Commit created: No  
Commit hash: none

## Files Changed

Files created:

- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md`

Files modified for this repair:

- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `test/development-environment/elevated-command-transport.test.cjs`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`

Several repository files were already dirty before this repair pass. Those pre-existing changes were preserved and not reverted.

## Implementation Summary

- Preserved the WC57-REPAIR02 request/result envelope, unique application temp execution directory, encoded outer UAC wrapper, original target identity return, and cleanup behavior.
- Replaced the elevated wrapper target invocation so it no longer uses `ProcessStartInfo.ArgumentList`.
- Added deterministic Windows command-line argument escaping in production TypeScript and persisted the escaped command line alongside the request `args[]`.
- Updated the Windows PowerShell wrapper to use full .NET Framework-compatible `ProcessStartInfo.Arguments`.
- Replaced sequential dual-stream `ReadToEnd()` capture with concurrent `ReadToEndAsync()` capture for stdout and stderr.
- Refactored preflight final-state and summary precedence so structural/nonretryable blockers dominate top-level state and retryability.
- Added a shared `codexImplementerAvailabilityLabel(...)` helper and updated the Build workspace so `Codex Availability` remains `Unavailable` while execution state is `unavailable`, even when `canRunAgain=true` permits a preflight retry.
- No WC58 approval transport, App Server/ARC work, automatic retry loop, environment-management UI, registry expansion, or Git mutation was performed.

## Elevated Target Invocation Before And After

Before REPAIR03:

```text
request envelope
-> encoded UAC wrapper
-> powershell.exe elevated wrapper
-> ProcessStartInfo.ArgumentList.Add(...)
-> RedirectStandardOutput/RedirectStandardError
-> StandardOutput.ReadToEnd()
-> StandardError.ReadToEnd()
-> WaitForExit()
```

After REPAIR03:

```text
request envelope with command, args[], cwd, resultPath, and escaped arguments
-> encoded UAC wrapper
-> powershell.exe elevated wrapper
-> ProcessStartInfo.FileName = request.command
-> ProcessStartInfo.Arguments = deterministic Windows command line
-> RedirectStandardOutput/RedirectStandardError
-> StandardOutput.ReadToEndAsync()
-> StandardError.ReadToEndAsync()
-> WaitForExit()
-> wait for both stream tasks
-> result envelope with target exitCode/stdout/stderr
```

The production `powershell.exe` target wrapper no longer uses `ProcessStartInfo.ArgumentList` and does not require PowerShell 7 or `pwsh.exe`.

## Argument Escaping

The production helper `windowsCommandLineFromArguments(args)` applies Windows command-line/CRT-style escaping:

- empty string becomes a quoted empty argument;
- whitespace-containing arguments remain one argument;
- embedded double quotes are escaped and preserved;
- backslashes immediately before double quotes are escaped correctly;
- trailing backslashes in quoted arguments are doubled so they survive;
- argument order is unchanged.

The wrapper still stores the original ordered `args[]` in the request envelope for audit/identity. The final target receives the escaped command line through `ProcessStartInfo.Arguments`, not through outer `Start-Process -ArgumentList`.

## Deadlock Avoidance

The wrapper keeps stdout and stderr separate, but it no longer drains them with the documented deadlock-prone pattern of reading stdout synchronously, then stderr synchronously, then waiting for process exit.

The wrapper starts both asynchronous reads before `WaitForExit()`, waits for the target process, then waits for both read tasks and writes both streams into the result envelope.

## Direct Windows PowerShell Compatibility Proof

Focused command:

```text
node --test --test-concurrency=1 test/development-environment/elevated-command-transport.test.cjs
```

Result: exit 0, 7/7 passed.

The test `Windows PowerShell target wrapper executes with ordered args, separated streams, and exact exit code without UAC` executed the generated production wrapper under real `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand <payload>` without `Start-Process -Verb RunAs`. It used a temporary Node target and proved:

- the wrapper reached and executed the target;
- ordered arguments survived;
- a normal token survived;
- a value containing spaces survived as one argument;
- an empty argument remained present;
- an embedded double quote survived;
- trailing backslash and backslash-before-quote cases survived;
- stdout was captured;
- stderr was captured separately;
- nonzero exit code `37` was preserved exactly;
- no real UAC prompt occurred.

The test `Windows PowerShell target wrapper captures high stdout and stderr output without deadlock` executed the same wrapper mechanism and captured 262144 bytes from stdout plus 262144 bytes from stderr without hanging.

## State Precedence Table

| Requirement mix | Top-level state | Top-level retry | Summary |
| --- | --- | --- | --- |
| restart only | `waiting-for-operator` | true | restart-required summary |
| permission only | `waiting-for-operator` | true | permission-required summary |
| permission + restart | `waiting-for-operator` | true | combined permission/restart summary |
| retryable managed provisioning failure only | `blocked` | true | retryable managed failure summary |
| retryable verification failure only | `blocked` | true | retryable managed failure summary |
| unsupported only | `blocked` | false | blocked by unsatisfied requirements |
| restart + unsupported | `blocked` | false | blocked by unsatisfied requirements |
| permission + host-policy | `blocked` | false | blocked by unsatisfied requirements |
| retryable failure + unsupported | `blocked` | false | blocked by unsatisfied requirements |

Structural/nonretryable blockers include `external`, `unsupported`, `host-policy`, `ambiguous-package`, and any unsatisfied requirement with `retryAllowed=false`.

## Codex Availability And Retry Presentation

`Codex Availability` now derives from `execution.state`, not `canRunAgain` alone.

Minimum behavior:

```text
execution.state = unavailable
-> Codex Availability = Unavailable
```

This remains true for retryable blocked/waiting preflight where `canRunAgain=true`. The existing Run button still uses `canRunAgain=true`, so retry remains available without claiming Codex is currently ready.

## Acceptance Criteria To Test Mapping

1. No `ProcessStartInfo.ArgumentList`: wrapper source assertion in elevated transport test.
2. No PowerShell 7 prerequisite: wrapper test executes `powershell.exe`.
3. REPAIR02 envelope/encoded UAC architecture preserved: existing injected transport tests remain green.
4. Ordered arguments reconstructed under Windows PowerShell 5.1: direct wrapper compatibility test.
5. Spaces remain one argument: direct wrapper compatibility test.
6. Empty argument remains present: direct wrapper compatibility test.
7. Embedded double quotes survive: direct wrapper compatibility test.
8. Adjacent/trailing backslashes survive: direct wrapper compatibility test.
9. Stdout returned separately: direct wrapper compatibility and injected transport tests.
10. Stderr returned separately: direct wrapper compatibility and injected transport tests.
11. Exit code preserved exactly: direct wrapper compatibility test.
12. No sequential dual-`ReadToEnd()` pattern: wrapper source assertion and high-output test.
13. Real non-elevated `powershell.exe` compatibility proof: elevated transport test.
14. High-output dual-stream proof: elevated transport high-output test.
15. Existing injected envelope tests remain green: elevated transport suite passed.
16. UAC cancellation remains typed permission retry: elevated transport suite passed.
17. Elevated host-policy/generic failures still reach classifier: elevated transport suite passed.
18. Temp artifacts cleaned: injected transport cleanup assertions remain green.
19. Structural blockers dominate top-level state: provisioner mixed structural test.
20. Waiting only when no structural blocker exists: provisioner permission/restart mixed test.
21. Retryable managed failures remain blocked and retryable: provisioner failure and verification tests.
22. Structural summary precedence: provisioner mixed structural summary assertions.
23. Permission/restart summaries remain correct: provisioner interaction tests.
24. Execution service remains unavailable for blocked/waiting preflight: Codex execution-service focused tests.
25. Retryable preflight still enables Run and reruns preflight: Codex execution-service retryable blocked test.
26. Renderer availability is unavailable when execution state unavailable: shared helper renderer test.
27. Typed permission/restart status remains correct: renderer typed-label test.
28. WC57-REPAIR01 behavior remains green: parser, environment refresh, provisioner, execution-service, and full suite passed.
29. WC57-REPAIR02 typed behavior remains green with corrected precedence: elevated transport, provisioner, execution-service, renderer, and full suite passed.
30. Automated tests triggered no real UAC/provisioning mutation: tests use non-elevated wrapper execution, fake runners, and fake refresh providers.
31. Required validation passed: typecheck, build, focused tests, and full `npm test` passed.
32. No Git mutation performed: status inspected only.

## Commands And Results

All commands were run with working directory `<PROJECT_REPO>`.

- `pwd`: exit 0; verified approved repo root.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: exit 0; boundary read before edits.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`: exit 0; validation lane read before validation.
- `Get-Content planning/phases/phase-08/Work_Cards/WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md`: exit 0; approved Work Card read.
- `npm run typecheck`: exit 0; passed.
- `npm run build`: exit 0; passed.
- `node --test --test-concurrency=1 test/development-environment/elevated-command-transport.test.cjs`: exit 0; 7/7 passed.
- `node --test --test-concurrency=1 test/development-environment/windows-development-environment-provisioner.test.cjs`: exit 0; 21/21 passed.
- `node --test --test-concurrency=1 test/renderer/work-card-building-review-workspace.test.cjs`: first run failed because the test attempted to import a nonexistent standalone Vite renderer component module; corrected by moving the helper to compiled shared contracts.
- `npm run typecheck`: exit 0 after correction; passed.
- `npm run build`: exit 0 after correction; passed.
- `node --test --test-concurrency=1 test/renderer/work-card-building-review-workspace.test.cjs`: exit 0; 6/6 passed.
- `node --test --test-concurrency=1 test/work-card-building/codex-implementer-execution-service.test.cjs`: exit 0; 15/15 passed.
- `node --test --test-concurrency=1 test/work-card-planning/development-environment-contract.test.cjs`: exit 0; 7/7 passed.
- `node --test --test-concurrency=1 test/development-environment/windows-environment-refresh.test.cjs`: exit 0; 5/5 passed.
- `npm test`: exit 0; 382/382 passed.
- `git status -sb`: exit 0; dirty worktree inspected; no Git mutation performed.
- Bounded repair-touched-file safety scan for local paths and secret-like terms: exit 0 with expected matches only in prompt/test secret-safety text, test token counters, environment passing, and redaction code.

## Validation Skipped

- Operator manual validation was not performed by the Implementer.
- Real UAC was not triggered.
- Real WinGet install/repair, Visual Studio modification, reboot, and host machine provisioning mutation were not performed.
- Electron visual launch smoke was not performed for this repair; renderer/helper tests, service tests, build, and full automated validation were run.

## Security And Secret-Safety Notes

No secrets, credentials, private keys, authentication tokens, API keys, private environment-file contents, concrete local machine paths, installer binaries, or downloaded executables were introduced. Elevated request/result files remain transient application temp execution transport and are removed after each elevated attempt.

## Git Actions

No Git mutation was authorized or performed. Nothing was staged, committed, pushed, stashed, reset, rebased, merged, tagged, cleaned, restored, checked out, or pulled.

The worktree remains dirty due to pre-existing Phase 08 changes plus the WC57-REPAIR03 repair edits and this Pending report.

## Manual Validation Required

After Architect review, the parent WC57 disposable-host validation remains:

- managed install without elevation;
- real UAC-elevated provisioning action with target result classification;
- declined UAC followed by retry;
- restart-required behavior with correct UI guidance;
- transient provisioning failure followed by retry;
- VS2022 `msvc-x64` `desktop-cpp` provisioning and verification;
- confirmation Codex starts only after final environment readiness.

## Residual Risks

- Real UAC and WinGet/Visual Studio installer behavior still require disposable-host Operator validation.
- The command-line quoting helper follows Windows command-line/CRT escaping rules and is directly tested through Node target argument reconstruction; non-CRT native tools may parse command lines differently.
- `ProcessStartInfo.Arguments` remains the supported Windows PowerShell 5.1-compatible bridge for the target command line.

## Blocking Questions

None.

## Recommended Next Implementer Task

Independent verification of WC57-REPAIR03 production code and the direct Windows PowerShell wrapper tests, followed by the parent WC57 disposable-host Operator validation.

Document.Status=Pending
