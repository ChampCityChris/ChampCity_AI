<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR07",
    "repairId": "WC57-REPAIR07",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC57-REPAIR07 — Parent Process Environment Refresh and Resolution Completion Handoff",
    "disposition": "approved_for_operator_validation",
    "parentWorkCardId": "WC57",
    "repairId": "WC57-REPAIR07",
    "repairRequired": false,
    "operatorValidationRequired": true,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "REPAIR07 satisfies the bounded Operator-validation repair contract. Successful Environment Resolution now refreshes the ChampCity parent process environment before deterministic preflight rerun; refresh failure prevents verification against knowingly stale state; exact already-installed/no-upgrade simple managed package results flow through environment refresh and authoritative semantic re-probe; and Environment Resolution terminal messaging is separated from Work Card Implementer Report completion. Automated validation is green. Repeat the FO76 Collector host-readiness flow as the required real-host Operator regression before closing WC57.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57-REPAIR07

## Disposition

**Approved for Operator validation.**

No additional repair is authorized or required from the current repository evidence. REPAIR07 addresses the live WC57 Operator-validation defect that caused Environment Resolution to establish/discover CMake in a child process while ChampCity immediately reverified from stale Electron/main-process environment state.

WC57 is not yet closed solely because the repair card explicitly requires the same FO76 Collector host-readiness flow to be repeated on the real host. That Operator regression is now the next gate.

## Review Basis

Reviewed against:

- `planning/phases/phase-08/Work_Cards/WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md` revision 1, SHA-256 `be09816a6d1cbf676f71fd99aca46cceee6bc5906de6e69895d0d3bc363744ce`.
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md` revision 1, SHA-256 `4e8050faa6b8c7553161581a2df6768147541bc2c9105209efb83ad4419858a5`.
- Current production source and regression tests in the authorized ChampCity A/I development-environment, execution, and Implement-workspace surfaces.
- Current read-only Git status on `feature/phase-04-wc01-repair01-evidence-derived-workflow`; no staged changes were present and the pre-existing dirty Phase 08 worktree remains intact.

## Verified Corrections

### 1. Parent environment refresh occurs before post-resolution deterministic verification

`codexImplementerExecutionService.ts` now injects the existing `refreshWindowsProcessEnvironment(...)` authority into the execution service and, after a successful `environment-resolution` Codex turn, performs the sequence required by the repair:

```text
Environment Resolution completes
→ parent environment refresh requested
→ ChampCity main-process environment refresh completes
→ deterministic preflight rerun requested
→ post-resolution preflight state projected
```

The production path refreshes the parent process before `preflightService.runPreflight(...)` is called. This corrects the live parent/child environment propagation defect rather than relying on a child Codex process to mutate its parent environment.

The focused execution-service regression records call ordering and proves:

```text
preflight-1
→ parent-refresh
→ preflight-2
```

The rerun therefore cannot precede the repaired parent refresh.

### 2. Parent refresh failure does not silently verify against stale state

The execution path catches a failed parent environment refresh before deterministic verification is allowed to proceed. It records failure evidence, produces a retryable `resolution-required` preflight result, preserves the prior requirement evidence, and does not call the post-resolution preflight rerun.

The regression test verifies that only the initial preflight runs when the parent refresh throws and that the resulting execution model exposes the refresh failure as retryable environment-preparation evidence.

This satisfies the repair requirement that known stale process state must not be silently accepted as a verification basis.

### 3. Already-installed CMake is refreshed and semantically re-probed

`windowsDevelopmentEnvironmentProvisioner.ts` now recognizes the bounded WinGet already-installed/no-applicable-upgrade result as a provisioning result that may proceed to environment refresh and re-verification rather than being treated immediately as a failed installation.

Critically, the WinGet message is not accepted as proof that CMake itself satisfies the Work Card. The existing specialized CMake semantic probe remains authoritative after refresh.

The positive regression proves:

```text
cmake --version
→ initially unavailable

exact Kitware.CMake WinGet install
→ package already installed / no applicable update

refresh process environment
→ cmake --version rerun
→ 3.31.0
→ satisfies >=3.24
→ preflight ready
```

The negative regression proves that when the refreshed `cmake --version` probe still fails, the requirement remains unresolved with `verification-failure`. Package inventory/output therefore cannot independently manufacture readiness.

This preserves the core WC57 authority model: provider state can establish how a package is provisioned, but deterministic semantic verification decides whether the required development capability is actually true.

### 4. Environment Resolution no longer implies Implementer Report completion

`WorkCardBuildingReviewWorkspace.tsx` now branches terminal messaging by `executionKind`.

For `environment-resolution`, the UI states that Work Card implementation has not run yet and then projects whether post-resolution preflight is ready/not-required or remains incomplete.

For `work-card-implementation`, the existing Implementer Report readiness behavior remains intact.

This corrects the misleading Operator-validation UI observed after the FO76 Environment Resolution run. The repair does not make Environment Resolution write or finalize the Work Card Implementer Report.

### 5. Accepted WC57 behavior remains intact

No provider redesign, Work Card schema expansion, dependency-restoration subsystem, FO76 repository workaround, or WC58/App Server implementation was introduced.

The Implementer Report records successful focused validation for:

- development-environment provisioner: `32/32`;
- renderer Work Card workspace: `6/6`;
- Codex execution service: `17/17`;
- TypeScript typecheck;
- production build; and
- full automated test lane: `396/396`.

The current source inspection is consistent with those reported acceptance mappings. No implemented acceptance criterion is being passed through a disclosed residual limitation.

## Acceptance Criteria Disposition

All thirteen REPAIR07 acceptance criteria are accepted from the current implementation and automated evidence.

The required FO76 real-host sequence is deliberately not treated as Implementer evidence. It remains Operator validation, exactly as specified by the Work Card.

## Required Operator Regression

Repeat the FO76 Collector Work Card flow that exposed the defect:

`planning/phases/phase-00-engineering-foundation/Work_Cards/phase-00-wc-01-host-toolchain-readiness_windows_c_development_host_readiness.md`

On the current host, assuming the previously observed CMake and Visual Studio/MSVC installations remain compliant, the expected sequence is:

```text
windows-x64-host
→ satisfied

cmake >=3.24
→ visible after refreshed ChampCity parent-process verification
→ satisfied

visual-studio-2022-msvc-desktop-cpp / x64-cpp20
→ satisfied

post-resolution / initial preflight
→ ready

Run Codex Implementer
→ eligible
```

If preflight reaches `ready`, run the actual FO76 WC01 Work Card Implementation. Only that implementation run should substantively update the reserved FO76 Implementer Report.

If the same real-host flow still returns CMake to `missing`/`resolution-required`, capture the new preflight and execution evidence. That would be new Operator-validation evidence and should be diagnosed from the observed failure rather than reopening REPAIR07 speculatively.

## Final Decision

**REPAIR07 is approved for Operator validation.**

Do not create REPAIR08 from the current repository evidence. Repeat the real FO76 host-readiness flow. If it reaches `ready`, WC57's repaired development-environment path has passed the Operator regression and the project can proceed to the next approved sequence.
