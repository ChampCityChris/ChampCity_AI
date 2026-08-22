<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR02",
    "repairId": "WC57-REPAIR02",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR02_elevated_result_transport_and_resumable_preflight_state.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "disposition": "revision_requested",
    "parentWorkCardId": "WC57",
    "requiredRepairId": "WC57-REPAIR03",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC57-REPAIR02 materially improved typed retry/interaction state and Node-side elevation envelope handling, but the production elevated wrapper is incompatible with Windows PowerShell 5.1, contains a dual redirected-stream deadlock risk, misprojects mixed structural/interacting requirements, and presents retryable unavailable preflight as Codex Availability Ready. WC57 remains unresolved.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# ARCHITECT REVIEW WC57-REPAIR02 — Elevated Result Transport and Resumable Preflight State

Disposition: RevisionRequested  
Parent: `WC57`  
Repair required: `WC57-REPAIR03`  
Git mutation: prohibited

## Review Scope

Reviewed the Approved `WC57-REPAIR02` contract, its Pending Implementer Report, and the production/test paths governing:

- elevated command request/result transport;
- exact argument preservation;
- elevated stdout/stderr/exit-code capture;
- cleanup and classification;
- typed blocker/retry state;
- typed permission/restart state;
- Codex preflight retry projection;
- Build-workspace presentation;
- preservation of WC57-REPAIR01 behavior and separation from WC58.

The Implementer Report states `npm run typecheck`, `npm run build`, focused tests, and the full suite passed 377/377. Those results are accepted as reported evidence, but they do not prove the real Windows PowerShell wrapper path because the transport tests inject a process runner that manufactures the result envelope rather than executing the generated wrapper.

## Accepted Repair02 Results

The following REPAIR02 changes are correct and must be preserved:

1. ChampCity owns a transient elevated request/result envelope outside the project repository.
2. The outer UAC boundary carries only fixed PowerShell switches plus one encoded wrapper payload rather than arbitrary target arguments.
3. `runElevated(...)` prefers a valid target result envelope and preserves original target command identity when the envelope exists.
4. Request/result temp state is removed in `finally` behavior.
5. Shared result contracts now carry typed blocker identity, per-requirement `retryAllowed`, top-level `retryAllowed`, and typed `humanInteractionKind`.
6. Generic managed provisioning/verification failure is retryable while external, unsupported, host-policy, and ambiguous authority remain nonretryable.
7. `CodexImplementerExecutionService` reruns current preflight rather than promoting cached blocked/waiting evidence to ready.
8. Permission versus restart labels derive from typed interaction state rather than regex matching human-readable text.
9. No WC58 App Server/ARC/automatic approval work was introduced.

## Blocking Finding 1 — Production Wrapper Uses an API Not Available in Windows PowerShell 5.1

Production `NodeCommandRunner.runElevated(...)` explicitly launches:

```text
powershell.exe
→ Start-Process powershell.exe -Verb RunAs
→ elevated powershell.exe -EncodedCommand <wrapper>
```

The generated elevated wrapper then executes:

```text
$processInfo = [System.Diagnostics.ProcessStartInfo]::new()
foreach ($argument in @($request.args)) {
    [void]$processInfo.ArgumentList.Add([string]$argument)
}
```

This is not compatible with the selected runtime.

Microsoft documents Windows PowerShell 5.1 / `powershell.exe` as the Windows-shipped PowerShell product built on full .NET Framework. Microsoft documents `ProcessStartInfo.ArgumentList` as applying to .NET Core 2.1+ / .NET Standard 2.1, not .NET Framework.

Therefore the production wrapper can reach UAC successfully and then fail inside the elevated Windows PowerShell process before the target command is executed because `ProcessStartInfo.ArgumentList` is unavailable.

The wrapper catch block can still write a JSON failure envelope, so the Node-side transport test shape may look correct while real provisioning is incapable of performing its target action.

This violates Acceptance Criteria 1, 2, and 3 and blocks real-machine validation.

Official Microsoft evidence:

```text
https://learn.microsoft.com/powershell/scripting/what-is-windows-powershell
https://learn.microsoft.com/dotnet/api/system.diagnostics.processstartinfo.argumentlist
```

## Blocking Finding 2 — Redirected stdout/stderr Read Order Can Deadlock

The elevated wrapper enables both:

```text
RedirectStandardOutput = true
RedirectStandardError = true
```

and then performs:

```text
$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()
$process.WaitForExit()
```

Microsoft explicitly documents that reading redirected stdout to completion followed by redirected stderr to completion can deadlock if the child fills the stderr pipe while the parent is waiting for stdout to close. Microsoft recommends asynchronous reading of at least one stream or separate concurrent readers.

A package manager, installer, Visual Studio setup process, or PowerShell repair command can produce enough output for this to become a real indefinite provisioning hang.

This violates the deterministic elevated transport objective even if the unsupported `ArgumentList` API were replaced.

Official Microsoft evidence:

```text
https://learn.microsoft.com/dotnet/api/system.diagnostics.process.standardoutput
```

## Blocking Finding 3 — Structural Block Does Not Take Precedence Over Human Interaction

`finalState(...)` currently returns `waiting-for-operator` whenever any requirement has `humanInteractionKind` before evaluating structural blockers.

Example:

```text
requirement A → restart-required; retryAllowed=true
requirement B → unsupported; retryAllowed=false
```

Current projection:

```text
state = waiting-for-operator
retryAllowed = false
summary = Windows restart is required...
```

But REPAIR02 explicitly requires any unsatisfied structural/nonretryable requirement to make the top-level preflight structurally blocked. Restarting cannot resolve the unsupported requirement.

This is both a state-contract error and an Operator-guidance error: the primary status tells the user to restart even though the run remains structurally impossible afterward.

Required semantic precedence is:

```text
any unsatisfied structural/nonretryable requirement
→ blocked, retryAllowed=false

otherwise any human interaction
→ waiting-for-operator

otherwise retryable managed failure
→ blocked, retryAllowed=true

otherwise all satisfied
→ ready
```

## Blocking Finding 4 — Retryability Is Still Rendered as Codex Availability

`CodexImplementerExecutionService` correctly projects retryable blocked/waiting preflight as:

```text
state = unavailable
canRunAgain = true
```

However `CodexExecutionConsole` currently derives:

```text
execution.canRunAgain ? "Ready" : "Unavailable"
```

So a retryable blocked, restart-required, or permission-required environment can display:

```text
Development Environment: blocked / restart required
State: unavailable
Codex Availability: Ready
```

`canRunAgain` means the user may invoke the Run action to rerun preflight. It does not mean Codex is currently available to start.

This contradicts REPAIR01/REPAIR02 preserved behavior that blocked/waiting preflight must not project Codex ready.

## Test-Gap Root Cause

The production defects survived because the new transport suite proves the Node adapter around a synthetic envelope but never executes the generated wrapper under the exact Windows PowerShell runtime used in production.

`elevated-command-transport.test.cjs` injects `processRunner`, reads the request JSON, writes the result JSON itself, and returns an outer result. That is useful unit coverage for Node envelope handling but cannot prove:

- Windows PowerShell API compatibility;
- target argument reconstruction in the real wrapper;
- real target stdout/stderr transport;
- redirected-stream deadlock safety.

Renderer coverage similarly asserts source strings for labels but does not prove the rendered Codex Availability result for retryable `unavailable` state.

## Required Disposition

Do not proceed to WC57 disposable-host Operator validation yet.

Create and execute `WC57-REPAIR03` as a bounded continuation of WC57. REPAIR03 must preserve all accepted WC57/WC57-REPAIR01/WC57-REPAIR02 architecture while correcting the Windows PowerShell-compatible target invocation, stream-drain behavior, mixed-state precedence, and availability presentation.

WC58 remains held until parent WC57 passes Architect review and required real-machine validation.
