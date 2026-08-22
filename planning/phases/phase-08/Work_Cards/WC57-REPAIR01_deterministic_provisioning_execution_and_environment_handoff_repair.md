<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Deterministic Provisioning Execution and Environment Handoff Repair",
    "status": "approved_for_implementation",
    "executionMode": "one bounded repair of WC57 production provisioning correctness, environment handoff, and negative-path proof",
    "parentWorkCardId": "WC57",
    "confirmedDefect": "WC57 established the intended provisioner subsystem and preflight integration, but several production paths can falsely report readiness, strand a ground-zero machine, or launch Codex with the pre-provisioning environment. The defects are inside the approved WC57 architecture and must be corrected without redesigning the provisioner or transferring setup responsibility back to the Operator.",
    "rootCause": "The implementation modeled provisioning as successful command execution plus output-text classification, but did not preserve one deterministic authority chain from capability contract through platform-version verification, elevation/reboot classification, host-state refresh, exact toolchain identity verification, and creation of the Codex process environment. Tests mirrored the happy-path assumptions and therefore did not exercise the failing boundary transitions.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Repair WC57 in place. Preserve the WC56/WC57 architecture; correct SDK creation order, WinGet v3 readiness/elevation handling, command-result classification, VS2022 binding, environment refresh precedence, capability normalization/version support, noninteractive install behavior, retry/status coherence, and the missing negative-path tests.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR01 — Deterministic Provisioning Execution and Environment Handoff Repair

Status: Approved for Implementer execution  
Parent: `WC57`  
Git mutation: prohibited

## Confirmed Defects

WC57 created the correct subsystem boundaries and overall execution sequence, but production review found defects in the exact paths that must make a ground-zero Windows machine usable without technical setup being transferred to the Operator.

### Defect 1 — Codex SDK environment is captured before provisioning

`CodexImplementerExecutionService.start(...)` currently calls `sdkFactory()` before `developmentEnvironmentPreflightService.runPreflight(...)`.

`loadCodexSdkAdapter()` constructs `new Codex({ env: buildCodexRuntimeEnvironment(process.env) })`, so the SDK receives an environment snapshot before WC57 installs tools and refreshes `process.env`.

The current runtime can therefore execute this incorrect sequence:

```text
construct Codex SDK with old PATH/environment
→ provision missing capability
→ refresh process.env
→ report preflight ready
→ start previously constructed SDK
```

That violates WC57 Acceptance Criterion 13 and can reproduce the original failure as `preflight=ready` while Codex still cannot resolve the newly installed tool.

### Defect 2 — WinGet repair/bootstrap is not governed by the elevation/resume path and does not verify the WinGet v3 minimum

`ensureWinget(...)` runs the Microsoft repair command only through `runner.run(...)`. If that repair requires administrator elevation, the repair path does not invoke `runElevated(...)` and does not return the same resumable Windows-permission state used by package provisioning.

The same function considers WinGet ready when `winget --version` and `winget configure --help` return success. WC57 generates a WinGet Configuration v3 document using the `dscv3` processor. Current Microsoft WinGet Configuration v3 documentation requires WinGet 1.11 or later. A client such as the `v1.9.0` accepted by the current tests may expose `configure` but is not sufficient authority for the generated v3 document.

### Defect 3 — Provisioning command-result classification is inconsistent and can convert real failures into repeated permission prompts

`classifyProvisioningAttempt(...)` handles the original command and an elevated retry differently.

Confirmed problems:

- an original command that returns Windows cancellation/UAC-decline semantics can bypass `isElevationDeclined(...)` because decline is checked only after an explicit `runElevated(...)` retry;
- after an elevated retry, success and decline are recognized, but reboot-required, policy-blocked, ambiguous, and generic installer failures are not classified from the elevated result;
- an elevated failure can fall through to the original command's `isElevationRequired(...)` branch and incorrectly return `Windows permission is required` again;
- this can produce a false resumable state or repeated approval loop instead of the actual blocker/restart result.

### Defect 4 — `msvc-x64` does not bind readiness or modification to Visual Studio 2022

WC57 provisions `Microsoft.VisualStudio.2022.BuildTools`, but both the probe and workload modification scripts use `vswhere -latest -products *` without a Visual Studio 17 version range.

The probe can therefore accept a newer Visual Studio generation as satisfying the `msvc-x64` `desktop-cpp` profile.

The set script can also install Visual Studio 2022 Build Tools and then select a newer Visual Studio installation as `$install`, modifying the wrong installation.

The approved WC57 capability requires the selected Visual Studio generation, MSVC x64 capability, and Windows SDK prerequisites to be verified as one coherent profile. For Visual Studio 2022, the deterministic `vswhere` generation range is:

```text
[17.0,18.0)
```

### Defect 5 — Windows environment refresh gives stale current-process values authority over newly persisted values

`mergeWindowsEnvironment(...)` currently overlays sources in this order:

```text
machine
→ user
→ current process
```

Except for PATH, stale values already present in the Electron process therefore overwrite newly changed Machine/User values obtained after installation.

PATH is rebuilt from Machine + User only, which can also discard legitimate process-only PATH segments inherited by ChampCity.

The refresh must make newly read persisted Windows state authoritative while retaining current-process-only variables/segments that do not conflict with persisted state.

### Defect 6 — Capability normalization and version support are broader than the registry can actually guarantee

The WC56 parser verifies `capabilityId.trim()` is nonempty but returns the original untrimmed value. A valid-looking requirement such as `" cmake "` therefore misses the exact registry key.

Every simple registry entry currently advertises both exact and minimum version-constraint support. That is not true for fixed-major package identities such as:

```text
Python.Python.3.12
Microsoft.DotNet.SDK.8
EclipseAdoptium.Temurin.21.JDK
```

A request outside the package line can be accepted as provisionable, only to fail after installation or remain incompatible.

The Ninja probe also uses a version pattern requiring `ninja version ...`, while ordinary `ninja --version` output is a bare version string. Any constrained Ninja requirement can therefore remain incompatible even when the required version is installed.

### Defect 7 — simple WinGet installs are not fully noninteractive

The simple package command uses `--disable-interactivity`, which disables WinGet prompts, but current Microsoft WinGet guidance distinguishes that from installer UI and documents `--silent` for a fully noninteractive installer experience.

Ordinary supported packages should not open installer-choice UI that transfers package setup decisions to the Operator.

### Defect 8 — cached preflight state and top-level Codex readiness can contradict each other

After `start(...)` returns `waiting-for-operator` or `blocked` through an unavailable model, the next `getStatus(...)` call copies the cached preflight result into the context and then returns `readyModel(context)` unconditionally.

The UI can therefore show both:

```text
Codex Availability: Ready
Development Environment: blocked / Windows permission required
```

The retry surface must remain available when remediation is genuinely retryable, but the top-level Codex state must not claim environment readiness while the cached preflight is not `ready` or `not-required`.

## Root Cause Analysis

The defects share one implementation cause rather than eight unrelated architecture failures.

WC57 correctly separated requirement authority, registry resolution, provisioning, refresh, and Codex execution. The implementation then treated each transition locally instead of enforcing one end-to-end invariant:

```text
Approved capability requirement
→ supported deterministic backend verified
→ exact action performed or bounded human interaction completed
→ action result classified from the action that actually ran
→ authoritative host state refreshed
→ exact capability identity re-verified
→ fresh environment captured for Codex
→ only then Codex starts
```

Three specific coding patterns broke that invariant:

1. **Construction-order leakage:** SDK construction remained in its pre-WC57 location, ahead of the new preflight.
2. **Duplicated platform interpretation:** WinGet repair, normal provisioning, and elevated provisioning do not share one result-classification path.
3. **Generic capability assumptions:** the registry and Visual Studio scripts use broad defaults (`latest`, universal version support, untrimmed IDs) instead of proving the exact capability identity represented by the Work Card.

The automated tests duplicated those assumptions. In particular, they accept WinGet `v1.9.0` for a v3 configuration path, do not exercise a real `runElevated(...)` fake path, do not verify SDK construction occurs after environment refresh, do not test Machine/User overwrite of stale process variables, and do not test Visual Studio 2022 versus newer-generation coexistence.

This is an implementation-correctness repair. Do not redesign WC56/WC57 architecture.

## Objective

Make WC57's existing development-environment provisioner deterministic across ground-zero, elevation, version, environment-refresh, and Codex-handoff boundaries.

Required production sequence:

```text
Operator starts Implementer
→ resolve Approved Work Card and environment contract
→ normalize and resolve exact supported capabilities
→ verify supported WinGet backend/version
→ repair/elevate/resume WinGet when required
→ provision only approved managed capabilities
→ classify the result that actually executed
→ refresh authoritative Windows environment state
→ re-verify exact capability/profile/generation
→ create Codex SDK from the refreshed environment
→ start Codex thread
```

Codex must never start from a stale pre-provisioning environment and preflight must never claim readiness from the wrong Visual Studio generation.

## Required Changes

### 1. Move execution SDK construction after successful preflight

In `CodexImplementerExecutionService.start(...)`, do not retain a `CodexSdkAdapter` created before environment preflight.

The execution path must be ordered:

```text
resolve current Work Card context
→ run development-environment preflight
→ require ready | not-required
→ create the Codex SDK adapter from current refreshed process.env
→ resolve execution policy
→ create session
→ start Codex thread
```

`getStatus(...)` may continue to perform a non-mutating SDK availability check. That check must not create or cache the adapter later used for execution.

Add a regression test in which the injected preflight changes an environment value before returning `ready`, and prove the SDK factory used for execution observes the post-preflight value. Also prove `startThread(...)` is never called before preflight succeeds.

### 2. Normalize WC56 requirement identity before registry lookup

Update the development-environment contract normalization so:

- `capabilityId` is trimmed and the trimmed value is persisted in the parsed contract;
- optional `versionConstraint` and `profile`, when supplied, are trimmed;
- supplied optional values that become empty after trimming are rejected rather than treated as alternate identities;
- duplicate exact requirement identities that would cause the same capability/profile to be provisioned twice are rejected or deterministically collapsed before provisioning. Prefer rejection in the v1 parser so the Architect fixes ambiguous authority before implementation.

Do not add installer/package authority to the Work Card schema.

### 3. Make WinGet readiness explicit for the v3 backend

Refactor `ensureWinget(...)` so readiness is based on actual backend capability, not command existence alone.

For the WC57 v3 configuration implementation:

- parse `winget --version`;
- require WinGet `>= 1.11` before declaring the v3 configuration backend ready;
- require `winget configure --help` success;
- if WinGet is absent, broken, or below the required v3 baseline, use the existing Microsoft-supported `Microsoft.WinGet.Client` / `Repair-WinGetPackageManager -Force -Latest` repair path;
- after repair, refresh the process environment as needed and re-run both version and configure capability verification;
- do not accept a lower fake/test version merely because `configure --help` was stubbed successful.

The provisioner may use one consistent WinGet >=1.11 baseline for all managed package actions instead of maintaining separate simple/composite minimums.

### 4. Route WinGet repair through the same elevation/result model as provisioning

The WinGet repair command is a provisioning action and must use the same deterministic classification rules as package/configuration actions.

Required behavior:

```text
repair succeeds
→ refresh/reverify WinGet

repair explicitly needs elevation and elevated runner exists
→ run exact approved repair through runElevated
→ classify elevated result

UAC declined/cancelled
→ waiting-for-operator; retryable Windows permission reason

restart required
→ waiting-for-operator; restart-required reason

host policy block
→ blocked; host-policy reason

generic repair failure
→ blocked; exact command/exit evidence retained
```

Do not bypass host policy and do not download an alternate WinGet executable from a model-selected URL.

### 5. Replace split result handling with one deterministic command-result classifier

Create one bounded classifier/helper used by normal package install, composite configure, and WinGet repair.

Classification precedence must account for the command result that actually ran:

```text
success
reboot required
UAC/elevation declined or cancelled
elevation required
host policy block
ambiguous WinGet package result
generic failure
```

When an initial result requires elevation and `runElevated(...)` is available, classify the elevated result independently. Do not fall back to the original command's elevation status after the elevated command has run.

An elevated generic failure is a blocker, not another permission request.

An elevated reboot result is restart-required.

An elevated policy result is host-policy blocked.

A cancellation result from a command that triggered UAC itself must become `waiting-for-operator` even if its output does not also contain the word `elevation`.

Do not create an unbounded recursive elevation retry.

### 6. Bind `msvc-x64/desktop-cpp` to Visual Studio 2022 explicitly

Preserve the existing `msvc-x64` capability and `desktop-cpp` profile. Correct its implementation rather than replacing it.

Both probe and set paths must use Visual Studio 2022 generation authority:

```text
vswhere -version "[17.0,18.0)"
```

Probe behavior must:

- inspect only Visual Studio 2022 instances;
- require MSVC x64/x86 tools and the Windows SDK/workload prerequisites represented by the profile;
- verify a usable `VC\Auxiliary\Build\vcvars64.bat` under the selected VS2022 installation;
- obtain/report the VS installation version or otherwise prove major generation 17;
- reject a machine with only Visual Studio 2026/newer tools as unsatisfied for this profile.

Provisioning behavior must:

- retain `Microsoft.VisualStudio.2022.BuildTools` as the application-owned package identity;
- after the package resource is present, locate the Visual Studio 2022 Build Tools instance specifically using both the generation range and `Microsoft.VisualStudio.Product.BuildTools` where the script needs the instance being modified;
- never select an arbitrary newer `-latest -products *` instance for the modification target;
- apply the approved `Microsoft.VisualStudio.Workload.VCTools` plus required x64/Windows SDK components to that VS2022 Build Tools instance;
- run final verification through the same VS2022-bounded probe used before provisioning.

Do not switch the project to Visual Studio 2026, MinGW, Clang, or another toolchain because a VS2022 instance is missing.

### 7. Correct Windows environment refresh precedence and preserve process-only additions

Refactor `mergeWindowsEnvironment(...)` so newly read persisted Windows state wins over stale values from the current Electron process.

Required semantic precedence for ordinary keys:

```text
current process as fallback
→ Machine persisted values override same-name current values
→ User persisted values override same-name Machine/current values
```

Key matching remains case-insensitive.

For PATH:

- include current Machine PATH segments;
- include current User PATH segments;
- retain current-process-only PATH segments that are not already represented;
- deduplicate segments case-insensitively while preserving deterministic order;
- do not allow a stale current PATH entry to prevent newly persisted Machine/User PATH from becoming effective.

Add direct unit tests for:

- a changed Machine variable overriding stale process state;
- a changed User variable overriding stale Machine/current state;
- a current-process-only variable surviving when neither persisted scope defines it;
- Machine + User PATH refresh plus preservation of a process-only PATH segment;
- case-insensitive PATH/key deduplication.

### 8. Make registry version support capability-specific

Do not keep one blanket `exact + minimum` declaration for every simple package.

The registry must be able to answer both:

```text
Can this requirement be verified?
Can this exact registry package identity provision a satisfying version?
```

For package identities pinned to a major line, such as Python 3.12, .NET 8, or Temurin 21, reject a version constraint that cannot be satisfied by that package line before running WinGet.

A bounded implementation may add per-entry version-band/provisionability metadata or a per-entry constraint predicate. Do not add model/web package selection.

Preserve exact package IDs as application-owned implementation details.

Correct the Ninja probe so ordinary bare `ninja --version` output yields a detected version and constrained Ninja requirements can verify successfully.

Tests must cover at minimum:

- a satisfiable constrained capability;
- an impossible fixed-major constraint blocked before install;
- bare Ninja version parsing;
- a trimmed capability ID resolving the same registry entry as its canonical form.

### 9. Make simple installs fully noninteractive

For application-owned simple package installs, add WinGet's silent installer option in addition to the existing agreement and interactivity flags.

The normal command authority should include:

```text
winget install
--id <exact registry package id>
-e
--source winget
--accept-source-agreements
--accept-package-agreements
--disable-interactivity
--silent
```

Add `--version` only for a supported exact version requirement.

If a supported package cannot complete silently, return a precise failure/human-interaction result according to actual platform behavior. Do not expose installer component-selection UI as normal setup work for the Operator.

### 10. Keep cached preflight status coherent with Codex availability and retry

`getStatus(...)` must not return a top-level `ready` Codex model solely because the SDK is available when the cached development-environment preflight remains `waiting-for-operator` or `blocked`.

Preserve retryability without misrepresenting readiness:

- `ready | not-required` may project Codex `ready`;
- `waiting-for-operator` must continue to display the exact human-interaction reason and allow the user to retry the preflight after that external interaction is resolved;
- `blocked` must remain visibly blocked and must not claim Codex availability is ready;
- a retry must rerun preflight from current host state rather than trusting cached `beforeState` evidence.

A bounded change to the execution-model helper functions is authorized. Do not build a new environment-management workspace.

### 11. Expand tests around the actual failed boundaries

Extend the existing fake-runner/test architecture. Automated tests must still perform no real host mutation.

Add explicit tests for all of the following:

1. SDK factory used for execution is called after successful preflight/environment mutation.
2. A blocked/waiting preflight never calls `startThread(...)`.
3. WinGet below 1.11 is not accepted for the v3 configuration backend and follows repair/reverification.
4. WinGet repair elevation requirement invokes `runElevated(...)`.
5. WinGet repair UAC decline maps to `waiting-for-operator`.
6. WinGet repair elevated generic failure maps to blocked, not another elevation request.
7. Normal package UAC decline on the original command maps to `waiting-for-operator`.
8. Elevated package success continues to refresh/reverify.
9. Elevated package reboot maps to restart-required.
10. Elevated package policy block maps to blocked.
11. `msvc-x64` probe rejects a newer-generation-only instance and explicitly filters `[17.0,18.0)`.
12. MSVC workload modification targets VS2022 Build Tools, not an arbitrary latest Visual Studio instance.
13. Environment merge precedence and process-only PATH preservation match Required Change 7.
14. Ninja constrained version detection works with bare output.
15. Fixed-major package constraints that cannot be provisioned are rejected before WinGet install.
16. Simple package install includes exact ID and silent/noninteractive flags.
17. Polling/status does not project Codex `ready` while preflight is blocked/waiting.
18. Existing WC54 full-access execution policy, WC55 selected-root/prompt behavior, WC56 environment authority, retry/cancellation/report-refresh behavior, and environment-free Work Cards remain green.

## Preserved Behavior

Preserve unchanged:

- WC56 definition of project ground zero as repository + local development machine;
- `champcity-development-environment` version-1 authority and `managed | external` ownership model;
- Work Card as sole authority for which capabilities may be provisioned;
- the WC57 application-owned development-environment subsystem boundary;
- exact registry-owned package identity rather than model-selected installers;
- WinGet/WinGet Configuration as the Windows provisioning backend;
- no required WinGet MCP runtime dependency;
- no web search as the normal supported-capability provisioning path;
- WC54 `danger-full-access`, `approvalPolicy=never`, network-enabled SDK policy;
- WC55 selected-root routing and prompt-policy cleanup;
- current Codex authentication, cancellation, retry, report refresh, and lifecycle authority except for the exact preflight/SDK ordering correction required here;
- secret/credential protection;
- no automatic machine reboot;
- no general software-management UI;
- no user-global Codex, VS Code, Copilot, or MCP configuration changes;
- no Git mutation.

WC58 or later work may change Codex approval transport/automatic approval behavior. This repair must not pre-implement or redesign that separate concern.

## Authorized Surface

Primary production files authorized:

```text
src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/shared/developmentEnvironmentContracts.ts
src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
```

`src/renderer/app/App.tsx` may be changed only if required to keep preflight retry/status projection coherent through the existing polling/action flow.

Existing styles may be changed only if required for the bounded status correction; no layout redesign is authorized.

Tests authorized:

```text
test/development-environment/windows-development-environment-provisioner.test.cjs
test/work-card-planning/development-environment-contract.test.cjs
test/work-card-building/codex-implementer-execution-service.test.cjs
test/renderer/work-card-building-review-workspace.test.cjs
```

A focused environment-refresh test file may be added under `test/development-environment/` if separation improves proof.

Required Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md
```

A narrowly necessary adjacent correction is permitted only when repository evidence proves it is required for this repair, it preserves the architecture above, it is documented in the Implementer Report, and focused/full tests cover it.

## Acceptance Criteria

1. Codex execution SDK construction occurs only after the current Work Card environment preflight is `ready` or `not-required`.
2. The execution SDK receives environment state captured after WC57 refresh/provisioning, not the preflight-start environment snapshot.
3. Parsed capability IDs are canonicalized before registry lookup; blank/duplicate ambiguous requirement identities are rejected deterministically.
4. WinGet Configuration v3 is not considered available unless the WinGet client meets the current v3 minimum (`>=1.11`) and `configure` is functional.
5. Missing/broken/too-old WinGet uses the approved Microsoft repair path and re-verifies the backend after repair.
6. WinGet repair can invoke the existing platform elevation path and returns resumable permission/restart states instead of generic ground-zero blockers when appropriate.
7. Original and elevated command results use one deterministic classification model; elevated generic failure cannot become a second permission prompt.
8. UAC decline/cancellation, including cancellation returned by the original WinGet/installer command, becomes `waiting-for-operator` and is retryable.
9. Reboot-required and host-policy results are classified from the command that actually ran.
10. `msvc-x64/desktop-cpp` preflight accepts only Visual Studio 2022 generation 17 instances and verifies required x64/compiler/SDK readiness.
11. The MSVC set path modifies the VS2022 Build Tools instance installed/selected by WC57 and cannot silently modify Visual Studio 2026/newer because it is `latest`.
12. A newer-generation-only Visual Studio machine remains unsatisfied for the VS2022 profile and proceeds through the VS2022 provisioning path.
13. Windows persisted Machine/User environment changes override stale current-process values after refresh while process-only nonconflicting values remain available.
14. PATH refresh includes Machine + User persisted segments plus nonduplicate process-only segments using case-insensitive deduplication.
15. Registry version-constraint support reflects the package identity that will actually provision the capability; impossible fixed-major requirements block before install.
16. Bare Ninja version output is parsed correctly for constrained requirements.
17. Simple WinGet installs use exact application-owned package identity and fully noninteractive/silent flags.
18. Successful provisioning is followed by environment refresh and final capability verification before Codex starts.
19. Cached `blocked` or `waiting-for-operator` preflight cannot be projected as top-level Codex `ready`; retry remains available where the state is genuinely resumable.
20. Unsupported managed capabilities still block rather than causing Codex/web installer improvisation.
21. External requirements remain externally owned and are never auto-installed.
22. Automated tests perform no real WinGet, PowerShell repair, Visual Studio modification, UAC, reboot, or host-environment mutation.
23. Focused regression tests prove every Required Change and negative path listed above.
24. Existing environment-free Work Cards still start Codex through the existing no-provisioning path.
25. WC54, WC55, WC56, existing Codex retry/cancellation/report-refresh behavior, and existing workflow lifecycle tests remain green.
26. `npm run typecheck`, `npm run build`, and `npm test` pass using the normal ChampCity validation lanes.
27. No Git mutation is performed.

## Negative Constraints

Do not:

- redesign WC56/WC57 architecture;
- replace WinGet with arbitrary web downloads or model-selected installers;
- make the official WinGet MCP server a required runtime dependency;
- loosen Work Card authority over which capabilities may be installed;
- treat ordinary missing managed tooling as an Operator installation task;
- accept Visual Studio 2026/newer as satisfying the approved VS2022 profile;
- switch the selected compiler/toolchain to avoid provisioning VS2022;
- bypass Windows enterprise/application-control/package-management policy;
- auto-approve or bypass UAC outside the existing Windows consent mechanism;
- auto-reboot Windows;
- add package IDs, installer commands, or machine paths to the Architect-owned `champcity-development-environment` block;
- broaden Codex environment forwarding to arbitrary secrets merely to fix the stale SDK snapshot; preserve the existing deliberate environment boundary unless a specific development variable is proven required and separately justified;
- add free-form Implementer chat or Codex approval-protocol work; that is separate WC58 scope;
- create a general software-management UI;
- change unrelated Project Planning, Phase Planning, MCP routing, Architect output, validation, or close-loop behavior;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC57-REPAIR01 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR01_deterministic_provisioning_execution_and_environment_handoff_repair.md
→ Architect code review
→ Operator validation on disposable/intentionally incomplete Windows environment
→ return to WC57 parent disposition
```

Do not mark parent WC57 complete from Implementer execution alone.

## Implementer Report Requirements

The Implementer Report must remain `Pending` and must include:

- exact files changed;
- before/after execution sequence proving SDK construction moved after preflight;
- final WinGet minimum-version/readiness rule and repair/elevation behavior;
- the unified command-result classification order and evidence for original/elevated negative paths;
- exact VS2022 probe and modification targeting behavior;
- final environment merge/PATH semantics;
- capability normalization and capability-specific version support changes;
- final simple WinGet command shape including silent/noninteractive behavior;
- cached preflight/retry status behavior;
- an acceptance-criterion-to-test/evidence mapping for all 27 criteria;
- focused test commands/results and full `npm test` result;
- confirmation that automated tests performed no real host mutation;
- any adjacent correction, why it was required, and its tests;
- Operator validation remaining and residual risk.

Do not claim real-machine provisioning proof from fake-runner tests.

End with `Document.Status=Pending`.

## Manual Validation

Manual validation remains after Architect acceptance of this repair. Do not perform it by uninstalling tools from the primary ChampCity development machine solely to create a failure.

Use a disposable or intentionally incomplete Windows environment and validate:

1. A missing simple managed capability installs silently through exact WinGet authority, refreshes, re-verifies, and Codex can resolve the tool after launch.
2. A missing/broken or intentionally old WinGet path repairs/upgrades to a v3-capable client and resumes provisioning.
3. If Windows UAC is required, the Operator performs only the Windows consent action; no package/workload selection is requested.
4. A VS2026/newer-only machine does not falsely satisfy the VS2022 `msvc-x64/desktop-cpp` profile.
5. VS2022 Build Tools/workload provisioning targets generation 17 and final verification reports the correct generation/profile.
6. Retrying after a declined UAC or completed restart reruns current preflight and can continue without creating a new repair merely because the interaction was interrupted once.
7. After provisioning, Codex starts with the refreshed environment and completes a Work Card using the newly available capability.
8. A second run is idempotent and does not reinstall already satisfied requirements.
