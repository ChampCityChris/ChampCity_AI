<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC57-REPAIR03 — Windows PowerShell-Compatible Elevation Transport and Preflight State Precedence",
    "disposition": "approved_for_operator_validation",
    "parentWorkCardId": "WC57",
    "repairId": "WC57-REPAIR03",
    "repairRequired": false,
    "operatorValidationRequired": true,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC57-REPAIR03 satisfies its approved implementation contract. Production target execution now runs under Windows PowerShell-compatible ProcessStartInfo.Arguments with deterministic Windows command-line escaping, drains redirected stdout/stderr concurrently, preserves the REPAIR02 envelope/UAC transport, gives structural blockers top-level precedence, and separates Codex availability from preflight retry permission. No WC58 approval-transport work was introduced. Parent WC57 remains unresolved pending the required real-machine Operator validation.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57-REPAIR03

## Disposition

**Approved for Operator validation.**

No additional repair card is warranted from the current code review. `WC57-REPAIR03` satisfies the bounded repair contract. Parent `WC57` remains unresolved until the required real-machine/disposable-host validation passes.

## Sources Reviewed

- `planning/phases/phase-08/Work_Cards/WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md` revision 1
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md` revision 1
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `test/development-environment/elevated-command-transport.test.cjs`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- reported focused/full validation evidence in the Implementer Report

## Code Review Findings

### 1. Windows PowerShell 5.1 compatibility defect is corrected

Production `elevatedWrapperScript(...)` no longer uses `ProcessStartInfo.ArgumentList`.

The accepted REPAIR02 architecture remains intact:

```text
original command + ordered args[]
→ application-owned request envelope
→ encoded PowerShell wrapper
→ outer UAC Start-Process powershell.exe -Verb RunAs
→ elevated Windows PowerShell wrapper
→ target process
→ result envelope
→ original target identity returned to classifier
→ execution temp cleanup
```

The request now additionally contains an application-owned escaped `arguments` string created by `windowsCommandLineFromArguments(args)`. The elevated wrapper assigns that value to `ProcessStartInfo.Arguments`, which is compatible with the Windows PowerShell/full .NET Framework execution environment selected by WC57.

The quoting helper explicitly handles:

- empty arguments;
- whitespace-containing arguments;
- embedded double quotes;
- backslashes before quotes;
- trailing backslashes in quoted arguments;
- ordered argument preservation.

No PowerShell 7 or `pwsh.exe` dependency was introduced.

### 2. Direct runtime proof now exercises the production wrapper mechanism

The prior REPAIR02 weakness is corrected. `test/development-environment/elevated-command-transport.test.cjs` imports the production `elevatedWrapperScript(...)` and `windowsCommandLineFromArguments(...)` from the compiled production module and executes the generated wrapper directly through real `powershell.exe` without UAC.

The compatibility test proves under the actual selected Windows PowerShell executable that:

- the production wrapper reaches the target process;
- a normal token survives;
- an argument containing spaces survives as one argument;
- an empty argument remains present;
- an embedded double quote survives;
- trailing-backslash and backslash-before-quote cases survive;
- stdout and stderr remain separate;
- target exit code `37` is preserved.

This is materially stronger than the REPAIR02 synthetic result-envelope tests and closes the runtime-API compatibility gap identified by the prior Architect review.

### 3. Redirected-stream deadlock defect is corrected

The production wrapper now begins both:

```text
StandardOutput.ReadToEndAsync()
StandardError.ReadToEndAsync()
```

before waiting for the process to exit, and then waits for both reader tasks before creating the result envelope.

The known sequential dual-stream pattern is no longer present.

The direct Windows PowerShell regression test writes and captures 262144 bytes to stdout and 262144 bytes to stderr using the same production wrapper mechanism. This provides direct proof that both redirected streams can be drained without the prior pipe-buffer deadlock.

### 4. Structural blocker precedence is corrected

`finalState(...)` now evaluates structural/nonretryable unsatisfied requirements before human interaction.

Current precedence is consistent with the repair contract:

```text
structural/nonretryable unsatisfied requirement
→ blocked / retryAllowed=false

otherwise human interaction
→ waiting-for-operator / retryable

otherwise retryable managed failure
→ blocked / retryAllowed=true

otherwise
→ ready
```

`isStructuralUnsatisfiedRequirement(...)` explicitly treats unsatisfied nonretryable requirements and `external`, `unsupported`, `host-policy`, and `ambiguous-package` blocker kinds as structural.

The focused provisioner tests cover the previously failing combinations, including:

- restart + unsupported;
- permission + host-policy;
- retryable managed failure + unsupported.

In each mixed structural case the top-level result is `blocked`, retry is disabled, and the primary summary no longer implies that restart or permission alone will resolve execution.

### 5. Retry permission no longer claims Codex is currently available

The execution service continues to represent retryable preflight states as:

```text
state = unavailable
canRunAgain = true
```

which is correct: the existing Run action may rerun preflight, but Codex is not presently runnable.

`codexImplementerAvailabilityLabel(...)` now gives `state === "unavailable"` explicit precedence and returns `Unavailable` regardless of `canRunAgain`.

The renderer uses that shared helper for the `Codex Availability` field while the Run button continues to use `canRunAgain`. The intended combination is therefore supported:

```text
Codex Availability: Unavailable
Run Codex Implementer: enabled
```

This closes the presentation contradiction identified in REPAIR02 review without removing legitimate retry behavior.

### 6. WC57/WC54/WC58 boundaries are preserved

The current Codex Implementer execution policy remains:

```text
sandboxMode = danger-full-access
approvalPolicy = never
networkAccessEnabled = true
```

REPAIR03 did not implement App Server, ARC routing, automatic Codex approval responses, free-form Implementer input, or any other WC58 behavior.

The repair also did not alter the Architect-owned development-environment input schema, application-owned capability registry/package authority, WinGet provisioning architecture, VS2022 binding, environment-refresh model, or automatic-restart/host-policy boundaries.

## Implementer Validation Evidence

The Implementer Report records the following successful normal Windows validation lane results:

- `npm run typecheck` — exit 0
- `npm run build` — exit 0
- elevated transport suite — 7/7
- Windows provisioner suite — 21/21
- renderer workspace suite — 6/6 after correcting the test import approach
- Codex execution service suite — 15/15
- development-environment contract suite — 7/7
- Windows environment refresh suite — 5/5
- full `npm test` — **382/382**

The direct Windows PowerShell wrapper tests deliberately do not request UAC or perform host provisioning mutation. That is appropriate for automated proof; the remaining UAC/WinGet/Visual Studio behavior belongs to the required manual/disposable-host validation.

## Residual Validation Boundary

The remaining uncertainty is now environmental/integration validation rather than an identified source-code defect.

Before parent `WC57` can be dispositioned complete, perform the WC57 real-machine validation required by the repair chain:

1. managed install that succeeds without elevation;
2. real UAC-elevated provisioning action and confirmation that actual target stdout/stderr/exit result is classified correctly;
3. declined UAC followed by retry;
4. restart-required behavior with the Build workspace displaying restart rather than permission;
5. transient provisioning failure followed by successful retry with Run remaining available;
6. VS2022 `msvc-x64/desktop-cpp` provisioning and final verification;
7. proof that Codex starts only after the final environment state is `ready` or `not-required`.

A failure in that validation should return through the normal validation/repair workflow with concrete host evidence. It should not be preemptively converted into another source repair without evidence.

## Final Architect Decision

`WC57-REPAIR03` is **Approved for Operator validation**.

No `WC57-REPAIR04` is created.

Parent `WC57` remains unresolved pending successful real-machine validation. `WC58` remains held until that validation completes.
