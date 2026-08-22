<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR01",
    "repairId": "WC57-REPAIR01",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC57-REPAIR01 Deterministic Provisioning Execution and Environment Handoff Repair",
    "reviewResult": "RevisionRequested",
    "parentWorkCardId": "WC57",
    "workCardRemainsActive": true,
    "repairAuthorized": "WC57-REPAIR02",
    "operatorValidationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC57-REPAIR01 corrects SDK construction order, WinGet v3 gating, VS2022 binding, environment precedence, capability normalization/version handling, and fake-runner result classification. Production review still finds three bounded defects: the real elevated runner loses elevated child stdout/stderr and argument fidelity, transient managed provisioning failures can become an unretryable UI dead end, and waiting-for-operator UI/status conflates restart-required with Windows-permission-required. WC57 remains unresolved and Operator provisioning validation is premature.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57-REPAIR01

Disposition: `RevisionRequested`  
Parent `WC57`: unresolved  
Operator provisioning validation: not authorized yet  
Next authorized repair: `WC57-REPAIR02`

## Review Basis

Reviewed against:

- `planning/phases/phase-08/Work_Cards/WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md` revision 1;
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md` revision 1;
- current production implementation under `src/main/developmentEnvironment/`, `src/main/workCardBuilding/codexImplementerExecutionService.ts`, and the existing Build workspace;
- current focused tests under `test/development-environment/`, `test/work-card-building/`, and `test/renderer/`.

Current external Microsoft platform evidence was checked only where necessary to validate the implementation assumptions. Microsoft currently documents that WinGet Configuration v3 requires WinGet 1.11 or later, the VS2022 Build Tools workload/component IDs used by the implementation remain valid, and `Start-Process` output/error redirection is explicit rather than implicit.

## Accepted Corrections

The following WC57-REPAIR01 corrections are accepted:

1. `CodexImplementerExecutionService.start(...)` now executes development-environment preflight before constructing the execution SDK adapter. The execution adapter therefore observes the post-preflight `process.env` state.
2. Cached `blocked` and `waiting-for-operator` preflight state no longer projects top-level Codex `ready`.
3. `capabilityId`, `versionConstraint`, and `profile` are trimmed; blank optional strings and duplicate requirement identities are rejected.
4. WinGet v3 readiness now requires WinGet `>=1.11` plus functional `winget configure`.
5. WinGet repair now enters the shared command-attempt classifier and can invoke the elevated runner.
6. Normal/elevated fake-runner results now share a deterministic classifier and no longer fall back to the original elevation result after an elevated command executes.
7. `msvc-x64/desktop-cpp` is generation-bounded to Visual Studio 2022 `[17.0,18.0)`, and the modification path targets the VS2022 Build Tools product.
8. Persisted Machine/User environment values now override stale current-process values; PATH preserves Machine + User + process-only segments with case-insensitive deduplication.
9. Fixed-major package bindings reject incompatible major-line requirements before installation; bare Ninja version output is parsed.
10. Simple WinGet installs now include `--silent` in addition to exact package identity and disabled interactivity.
11. The Implementer reports `npm run typecheck`, production build, focused suites, and the full `366/366` suite passing in the normal Windows lane.

These corrections substantially resolve the defects identified in the original WC57 review.

## Remaining Defect 1 — Real Elevated Execution Does Not Return the Result the Classifier Claims to Classify

The production `NodeCommandRunner.runElevated(...)` currently builds an outer PowerShell command equivalent to:

```text
Start-Process <target> -ArgumentList <args> -Verb RunAs -Wait -PassThru
→ exit with child ExitCode
```

The elevated child stdout/stderr is not redirected into an application-owned result channel. The outer non-elevated PowerShell process therefore reliably returns the elevated child exit code, but it does not reliably return the elevated child output used by `classifyCommandResult(...)` to distinguish:

- host-policy block;
- ambiguous WinGet result;
- detailed installer failure;
- other output-defined classifications.

The focused tests do not exercise `NodeCommandRunner.runElevated(...)`; they inject fake runners whose `runElevated(...)` returns synthetic stdout/stderr directly. Repository search finds no test of the real runner.

This means the test contract and production contract differ at the exact boundary WC57-REPAIR01 was intended to repair. An elevated policy failure can be reduced to an undifferentiated generic failure because the classifier never receives the elevated process's policy text.

The same production runner passes an argument array to `Start-Process`. Microsoft documents that `Start-Process -ArgumentList` joins array elements into a single space-delimited argument string. The current implementation does not provide a separate application-owned escaping/transport contract for arguments containing spaces. The elevated path can therefore alter an argument such as a configuration path under a user/temp directory containing spaces.

This fails the intended deterministic chain:

```text
exact approved command + exact args
→ elevated execution
→ exact effective exit/stdout/stderr
→ one classifier
```

and does not fully satisfy WC57-REPAIR01 Acceptance Criteria 7, 9, 18, and 23.

## Remaining Defect 2 — Transient Managed Provisioning Failure Can Become an Unretryable Dead End

`unavailableModelFromPreflightResult(...)` currently sets:

```text
canRunAgain = true only when state == waiting-for-operator
canRunAgain = false for every blocked state
```

The provisioner classifies a normal managed installation failure such as a temporary network outage as `blocked`. Therefore this production sequence is possible:

```text
approved managed capability missing
→ exact WinGet install attempted
→ temporary network failure
→ preflight blocked
→ cached blocked state
→ Codex unavailable
→ canRunAgain=false
→ Run Codex Implementer disabled
```

The underlying action is deterministic and safe to retry, and `start(...)` would rerun preflight if invoked, but the application removes the Operator's ability to invoke that retry.

WC57-REPAIR01 Required Change 10 requires retry to remain available where the state is genuinely resumable. The current state model does not distinguish structural/nonretryable blocks from retryable managed-provisioning failures.

This fails Acceptance Criterion 19 for retry/status coherence.

## Remaining Defect 3 — Restart-Required State Is Still Presented as Windows Permission Required

`WorkCardBuildingReviewWorkspace.tsx` currently maps every `waiting-for-operator` state to:

```text
Windows permission required...
```

The provisioner uses the same `waiting-for-operator` state for both:

- UAC/Windows permission; and
- Windows restart required.

A restart-required result therefore renders a primary status label telling the Operator that Windows permission is required. The generic preflight summary also says `Windows permission or restart is required`, while the exact requirement reason is available only in the detailed requirement evidence.

For a nontechnical Operator this is materially incorrect interaction guidance. WC57-REPAIR01 Required Change 10 explicitly requires the exact human-interaction reason to remain visible and retry/status projection to remain coherent.

The existing renderer tests contain no restart-specific status assertion.

## RCA

The remaining failures share one root cause: WC57-REPAIR01 made the internal classifier and state transitions deterministic, but two external boundaries remain represented by lossy abstractions.

```text
Elevated OS process
→ lossy exit-only production adapter
→ rich classifier expects stdout/stderr

Provisioning state
→ coarse ready/waiting/blocked state only
→ renderer/retry logic must guess what blocked/waiting means
```

The fake-runner tests bypass the first loss by directly manufacturing rich elevated results. The UI/state model hides the second loss by preserving the exact reason only as free-form text below a coarse state.

The repair must therefore preserve structured information across both boundaries rather than add more text matching.

## Required Disposition

Do not proceed to the WC57 disposable-machine Operator provisioning validation yet.

Create and execute `WC57-REPAIR02` to:

1. make elevated execution return an application-owned structured result containing the actual elevated command's exit code/stdout/stderr while preserving exact argument boundaries;
2. distinguish retryable managed-provisioning failure from structural/nonretryable blocking state;
3. carry typed human-interaction identity for Windows permission versus restart and render the correct Operator instruction.

After WC57-REPAIR02 passes Architect code review, perform the real disposable/intentionally incomplete Windows validation required by WC57/WC57-REPAIR01.

WC58 remains separate approval-transport work and must not be implemented inside this repair.
