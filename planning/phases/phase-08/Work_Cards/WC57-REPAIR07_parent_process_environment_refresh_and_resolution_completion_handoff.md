<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Parent Process Environment Refresh and Resolution Completion Handoff",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC57 Operator-validation repair",
    "parentWorkCardId": "WC57",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair the live Operator-validation handoff defect in which Environment Resolution establishes a tool in a child process but ChampCity immediately reruns deterministic preflight from stale parent-process environment state. Refresh the ChampCity process environment before post-resolution verification, re-probe an already-installed managed package after environment refresh, and make Environment Resolution completion messaging explicitly distinguish environment work from Work Card implementation/report completion.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR07 — Parent Process Environment Refresh and Resolution Completion Handoff

Status: Approved for Implementer execution  
Parent: `WC57`  
Depends on: `WC57-REPAIR06` Architect approval and live WC57 Operator-validation evidence  
Git mutation: prohibited

## Purpose

Repair one live WC57 Operator-validation defect without reopening the provider architecture established by REPAIR04 through REPAIR06.

The FO76 Collector host-readiness validation proved that Environment Resolution can establish or discover a required development tool successfully inside the resolver process while the ChampCity Electron parent process retains stale Windows environment state. ChampCity then reruns deterministic preflight from that stale parent environment and incorrectly returns the same capability to `resolution-required`.

The observed FO76 validation sequence was:

```text
windows-x64-host
→ satisfied

visual-studio-2022-msvc-desktop-cpp / x64-cpp20
→ satisfied

cmake >=3.24
→ initial semantic probe cannot resolve cmake from ChampCity PATH
→ WinGet reports CMake is already installed and no upgrade is available
→ Environment Resolution confirms CMake exists and succeeds after PATH refresh in its own process
→ Environment Resolution completes
→ ChampCity reruns deterministic preflight from stale parent-process environment
→ cmake remains MISSING -> MISSING
→ preflight returns resolution-required
→ Work Card implementation does not start
```

The reserved FO76 Implementer Report correctly remains unchanged because the run type was `Environment Resolution`, not `Work Card Implementation`. This repair must not cause Environment Resolution to write or finalize a Work Card Implementer Report.

## Confirmed Repository Evidence

Current production boundaries relevant to this repair:

```text
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/shared/developmentEnvironmentContracts.ts
```

Confirmed current behavior:

- `refreshWindowsProcessEnvironment(...)` already reads current Machine and User environment state, merges Windows PATH segments, and writes the refreshed values into `process.env`.
- deterministic provisioning refreshes the ChampCity process environment after an application-owned provisioning action before re-probing the affected requirement.
- the Environment Resolution completion path in `codexImplementerExecutionService.ts` currently reruns `preflightService.runPreflight(...)` directly after the resolver turn completes, without first refreshing the ChampCity parent process environment.
- an environment change made only inside the Codex child process cannot mutate the Electron parent process environment.
- for a simple managed capability such as CMake, a failed semantic probe followed by WinGet reporting an already-installed/no-upgrade package can currently return through provisioning classification without a dedicated refresh-and-reprobe interpretation of that installed-but-undiscoverable state.
- the renderer currently projects the generic terminal-run message `Complete the reserved Implementer Report before Review & Validation.` for completed Environment Resolution runs even though Environment Resolution is intentionally prohibited from updating that report as if Work Card implementation ran.

The FO76 Work Card remains authoritative for the host-readiness result. This repair modifies ChampCity A/I only; it must not modify the FO76 Collector repository to compensate for the provisioner defect.

## Required Changes

### 1. Refresh the ChampCity parent process environment before post-Environment-Resolution preflight

When an `environment-resolution` Codex turn completes successfully and before ChampCity calls deterministic `runPreflight(...)` again:

1. refresh the ChampCity Electron/main-process Windows environment from current Machine and User environment state using the existing environment-refresh authority;
2. update the parent `process.env` before deterministic verification commands are launched;
3. record bounded execution evidence that the parent environment refresh was attempted and whether it succeeded; and
4. then rerun the existing deterministic preflight.

Required sequence:

```text
Environment Resolution turn completes
→ refresh ChampCity parent Windows environment
→ deterministic preflight rerun
→ project resulting ready | not-required | resolution-required | waiting-for-operator | blocked state
```

Do not rely on the child Codex process to mutate the parent environment.

If parent environment refresh itself fails, do not silently rerun verification against knowingly stale state. Project a retryable environment-resolution/preflight failure with the refresh error visible in execution evidence.

### 2. Re-probe an already-installed managed package after environment refresh

For a managed simple capability where:

```text
semantic probe = missing/unavailable
and
WinGet provisioning result indicates the exact package is already installed / no upgrade is available
```

ChampCity must not treat that result as proof that the capability remains missing merely because the original process environment could not locate the executable.

The application-owned provisioner must:

1. refresh the ChampCity process environment;
2. rerun the authoritative semantic probe for the original Work Card requirement; and
3. classify the final capability from the refreshed semantic probe.

If the refreshed probe satisfies the requirement, return `satisfied` and continue normally.

If the refreshed probe still fails, preserve the existing provider/environment-resolution path with explicit verification evidence. Do not invent an ad hoc executable path, change the Work Card capability identity, or declare success from WinGet inventory alone when a specialized semantic probe exists.

Implementation may classify the specific WinGet result through exit code/output or another deterministic WinGet-supported signal, but must remain bounded to the exact resolved package and existing provisioning action. Do not convert arbitrary failed installs into success/reprobe behavior.

### 3. Make Environment Resolution completion messaging truthful

The Implement workspace must distinguish the two run types after a terminal run.

For `executionKind = environment-resolution`:

- do not display `Complete the reserved Implementer Report before Review & Validation.` merely because the reserved report remains unchanged;
- explicitly state that Environment Resolution completed and that Work Card implementation has not yet run;
- project the actual post-resolution deterministic preflight outcome;
- if the outcome is `ready` or `not-required`, indicate that Work Card implementation is now eligible to start;
- if the outcome remains `resolution-required`, `waiting-for-operator`, or `blocked`, identify that environment preparation remains incomplete.

For `executionKind = work-card-implementation`, preserve the existing Implementer Report readiness/completion messaging.

Do not make Environment Resolution write the Implementer Report in order to satisfy the UI.

## Preserved Behavior

Preserve all accepted WC57 and REPAIR01 through REPAIR06 behavior, including:

- Work Card requirements remain authoritative for what development capabilities are required.
- the specialized registry remains a deterministic fast path, not an allowlist.
- official WinGet MCP and direct WinGet provider discovery remain unchanged.
- exact package identity/version verification for provider-backed ordinary packages remains unchanged.
- Visual Studio/MSVC composite provisioning and semantic verification remain unchanged.
- Windows elevation/restart handling remains unchanged.
- Environment Resolution remains the agent-led fallback for unresolved or ambiguous managed environment requirements.
- Environment Resolution receives the exact Work Card/preflight/provider evidence implemented in REPAIR06.
- deterministic preflight remains the authority for declaring the environment ready after Environment Resolution.
- the FO76 Work Card implementation must not start until preflight is `ready` or `not-required`.
- Environment Resolution must not update the Work Card Implementer Report as if product implementation ran.
- no Git mutation is authorized.

## Authorized Surface

Production changes are limited to the existing development-environment/execution/UI handoff needed for this defect, expected principally within:

```text
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
src/shared/developmentEnvironmentContracts.ts
```

Tests may be added or updated under the corresponding existing test areas.

Do not modify FO76 Collector files.

Do not implement WC58/App Server work in this repair.

Do not redesign provider resolution, dependency restoration, Work Card schema, workflow navigation, or the Implement workspace.

## Required Proof

1. A regression test proves that after a successful Environment Resolution turn, the ChampCity parent environment refresh occurs before deterministic preflight is rerun.
2. The same test proves the rerun observes refreshed environment state rather than the stale pre-resolution state.
3. A regression test proves a simple managed capability whose exact WinGet package is already installed/no-upgrade but whose initial semantic probe is missing is refreshed and re-probed before returning unresolved.
4. A positive regression proves refreshed CMake satisfying `>=3.24` becomes `satisfied`/`ready` without another Environment Resolution cycle.
5. A negative regression proves that if refresh/reprobe still cannot satisfy the semantic capability, the result remains unresolved/failed with explicit evidence rather than being falsely accepted from package inventory.
6. Environment Resolution UI tests prove no Implementer Report completion instruction is shown merely because an Environment Resolution run completed without report mutation.
7. Work Card Implementation UI/report-readiness behavior remains unchanged.
8. Existing FO76 three-requirement regression, provider discovery, official MCP transport, direct WinGet fallback, elevation/restart, Environment Resolution evidence, build, typecheck, renderer, and full automated tests remain green.

## Acceptance Criteria

1. Successful Environment Resolution refreshes the ChampCity parent Windows environment before deterministic preflight rerun.
2. Parent-process refresh failure is surfaced as a retryable environment-preparation failure and does not silently verify against known stale state.
3. An exact already-installed/no-upgrade simple managed package causes environment refresh and semantic re-probe when the initial executable probe was unavailable.
4. CMake installed on the machine but absent from the stale ChampCity PATH can become verified after refresh without another resolver cycle.
5. Package inventory alone does not override a failed specialized semantic probe after refresh.
6. The post-resolution deterministic preflight remains the sole authority for transitioning environment readiness to `ready` or `not-required`.
7. Environment Resolution completion does not update or require completion of the Work Card Implementer Report.
8. The Implement workspace accurately distinguishes Environment Resolution completion from Work Card Implementation completion.
9. All accepted WC57 through REPAIR06 behavior remains intact.
10. No WC58/App Server implementation or unrelated architecture change is introduced.
11. No FO76 Collector repository modification is performed by this repair.
12. No Git mutation is performed.
13. The Implementer Report marks any unimplemented acceptance criterion incomplete; no residual-limitation pass is permitted.

## Operator Validation Regression

After automated validation passes, repeat the same FO76 Collector Work Card flow that exposed this defect:

```text
planning/phases/phase-00-engineering-foundation/Work_Cards/
phase-00-wc-01-host-toolchain-readiness_windows_c_development_host_readiness.md
```

Expected result on the current host if CMake and Visual Studio/MSVC remain installed and compliant:

```text
windows-x64-host
→ satisfied

cmake >=3.24
→ satisfied after refreshed parent-process verification

visual-studio-2022-msvc-desktop-cpp / x64-cpp20
→ satisfied

preflight
→ ready

Run Codex Implementer
→ becomes eligible
```

Only after the actual Work Card Implementation run completes should the FO76 canonical Implementer Report be substantively updated.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR07_parent_process_environment_refresh_and_resolution_completion_handoff.md`

Leave `Document.Status=Pending`.
