<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC57 Deterministic Windows Development Environment Provisioner",
    "reviewResult": "RevisionRequested",
    "workCardRemainsActive": true,
    "additionalRepairAuthorized": false,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC57 establishes the intended provisioner architecture and deterministic WinGet integration, but three production-path defects remain: WinGet repair/bootstrap cannot use the required elevation/resumable-interaction path; Windows environment refresh preserves stale process values over changed machine/user values except PATH; and the msvc-x64 desktop-cpp probe does not verify the required Visual Studio generation. Elevated-command failure/reboot classification and registry version-probe correctness also require bounded hardening before Operator validation.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57 Deterministic Windows Development Environment Provisioner

Review result: `RevisionRequested`  
Work Card remains active: yes  
Additional repair card: not authorized  
Git mutation: none

## Evidence Inspected

Reviewed the Approved WC57 contract, current Implementer Report, and production implementation including:

- `src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts`
- `src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts`
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/main/developmentEnvironment/windowsEnvironmentRefresh.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts`
- `src/shared/developmentEnvironmentContracts.ts`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- WC57-focused Codex/renderer test evidence reported by the Implementer.

Current Microsoft WinGet Configuration v3 documentation was checked against the implementation. The selected top-level `resources` schema, `Microsoft.WinGet/Package`, `Microsoft.DSC.Transitional/WindowsPowerShellScript`, `dependsOn` by resource name, and `metadata.winget.securityContext: elevated` are current supported constructs. The Implementer's documented v3 syntax adjustment is therefore accepted.

The Implementer reports `npm run typecheck` passed, production build passed in the normal Windows lane, focused suites passed 12/12 + 12/12 + 4/4, and the full suite passed 351/351. Those results are supporting evidence but do not override the production-path defects below.

## Accepted Implementation

The following WC57 architecture is accepted and should not be reopened during revision:

- application-owned development-environment subsystem separate from Codex prompt/renderer logic;
- preflight before Codex SDK thread launch;
- no environment contract preserves the pre-WC57 startup path;
- managed requirements are detected and provisioned before Codex starts;
- external requirements are not auto-installed;
- unsupported managed capabilities block rather than trigger model/web installer improvisation;
- exact WinGet package IDs are application-owned registry implementation details;
- simple package provisioning uses exact `winget install --id ... -e` authority;
- composite workload provisioning uses application-controlled WinGet Configuration/DSC state rather than project files or an external MCP dependency;
- successful provisioning refreshes before final probe;
- application-verified preflight evidence is projected into the Codex execution model/prompt;
- WC54 execution policy remains `danger-full-access`, `approvalPolicy=never`, network enabled;
- WC55 selected-root and prompt-policy behavior remains intact;
- no general-purpose software management UI or arbitrary package selection mechanism was introduced;
- renderer status/evidence remains contained within the existing Implement workspace.

## Blocking Findings

### 1. WinGet repair/bootstrap does not use the required elevation/resumable interaction path

`WindowsDevelopmentEnvironmentProvisioner.ensureWinget(...)` runs the Microsoft repair sequence through ordinary `runner.run("powershell.exe", ...)` only:

```text
Install-PackageProvider -Name NuGet -Force
Install-Module -Name Microsoft.WinGet.Client -Force -Repository PSGallery
Repair-WinGetPackageManager -Force -Latest
```

If that bootstrap requires administrator rights, the method does not call `runner.runElevated(...)`, does not classify elevation as `waiting-for-operator`, and does not provide the bounded UAC-resume behavior required by WC57. It simply rechecks WinGet and returns a generic bootstrap blocker if the repair did not succeed.

This violates the intended ground-zero path: a machine missing/broken WinGet is exactly the machine state where ChampCity must attempt deterministic remediation rather than strand the Operator.

The existing elevation test covers a simple `winget install` result only. It does not exercise elevation during WinGet repair/bootstrap.

Required correction:

- classify WinGet repair failure before declaring bootstrap blocked;
- when repair requires elevation and an elevated runner is available, rerun the approved repair through the platform elevation path;
- UAC decline must produce `waiting-for-operator` and remain retryable;
- reboot-required or host-policy results from the elevated repair must retain their correct classifications;
- add deterministic fake-runner coverage for repair/bootstrap elevation, decline, reboot, policy block, and final verification.

### 2. Elevated provisioning results are not fully classified

`classifyProvisioningAttempt(...)` correctly retries an elevation-required command through `runElevated(...)`, but after that elevated call it only handles:

- exit code 0; and
- explicit elevation decline.

If the elevated operation returns reboot-required, host-policy block, ambiguous-package result, or an ordinary installer failure, the code falls back to the *original* non-elevated command's `isElevationRequired(...)` result and reports `Windows permission is required...` again.

Consequences include:

- a successful UAC interaction followed by installer failure being misreported as needing permission again;
- reboot after elevated provisioning being misclassified as another UAC requirement;
- repeated retries potentially creating an approval loop without exposing the real installation defect.

Required correction:

Classify the elevated result as the authoritative result after elevation occurs. Apply reboot, policy, ambiguity, and generic failure handling to that result before returning. Add tests for each outcome.

### 3. Windows environment refresh is stale for non-PATH variables

`mergeWindowsEnvironment(current, machine, user)` iterates sources in this order:

```text
machine → user → current
```

For ordinary environment variables, that means the already-running process value overwrites a newly changed Machine/User value. Only `Path` receives a special reconstruction afterward.

WC57 requires the application to reconstruct/refresh the effective Windows process environment from current machine/user state before verification and Codex startup. The current implementation does not do that for existing non-PATH variables.

This can cause a correctly installed SDK/toolchain to remain invisible or incorrectly configured if its installer updates an existing machine/user variable rather than only PATH.

Required correction:

- preserve process-only variables that do not exist in Machine/User scope;
- for variables represented in current Windows Machine/User state, current Machine/User values must supersede stale process values with normal Windows user-over-machine precedence;
- preserve the explicit merged PATH behavior;
- add tests proving changed Machine/User values replace stale process values and process-only values remain preserved.

### 4. `msvc-x64` can falsely report readiness for the wrong Visual Studio generation

WC57 requires the `msvc-x64` / `desktop-cpp` composite capability to verify the required Visual Studio generation, MSVC x64 compiler capability, and Windows SDK/build prerequisites.

The provisioning configuration installs `Microsoft.VisualStudio.2022.BuildTools`, but the readiness probe uses:

```text
vswhere -latest -products * -requires ...
```

with no Visual Studio 17/2022 version bound.

A machine with a newer Visual Studio generation containing the required C++/SDK components can therefore satisfy the preflight before VS 2022 is installed. ChampCity would report the environment `ready`, start Codex, and a Work Card requiring the Visual Studio 17 2022 generator could still fail.

That is exactly the false-readiness class WC57 is intended to prevent.

Required correction:

- make the composite capability's generation requirement explicit and deterministic;
- for the current `desktop-cpp` profile backed by `Microsoft.VisualStudio.2022.BuildTools`, probe Visual Studio 2022/17 specifically (for example through an appropriate `vswhere -version` range/product constraint);
- verify the same generation after configuration;
- add a negative test where a newer Visual Studio generation is present but VS 2022 is absent and ensure preflight does not report ready;
- preserve Architect-selected tooling rather than treating a newer generation as automatically equivalent.

### 5. Registry version support/probe behavior needs bounded correctness hardening

The registry marks every simple capability as supporting exact and minimum constraints, but those claims are not uniformly true for fixed-major package identities. Examples include `Python.Python.3.12`, `Microsoft.DotNet.SDK.8`, and `EclipseAdoptium.Temurin.21.JDK`. A requirement outside that package line can be classified as supported, trigger an irrelevant installation attempt, and only fail after re-probe.

Additionally, the Ninja probe uses a pattern expecting `ninja version ...`, while normal `ninja --version` output is a bare version. Version-constrained Ninja requirements therefore cannot obtain a detected version through the current parser.

This does not require a registry redesign. Correct the initial registry so each entry truthfully advertises the version constraints it can provision and each probe parses its actual command output. Add focused tests for the supported IDs with representative version output and at least one unsupported major/version request.

## Acceptance Criteria Assessment

- AC1: accepted.
- AC2: partially satisfied; verification exists but composite-generation verification is defective.
- AC3: accepted.
- AC4: accepted for unconstrained supported simple capabilities; version-bound registry behavior requires correction.
- AC5: accepted.
- AC6: not satisfied for elevation-required WinGet bootstrap/repair.
- AC7: not satisfied because `msvc-x64` does not verify the required Visual Studio generation.
- AC8: accepted structurally; real-machine validation remains pending after revision.
- AC9: accepted.
- AC10: accepted.
- AC11: partially satisfied; normal install elevation exists, but bootstrap elevation and elevated-result classification are defective.
- AC12: partially satisfied; reboot classification exists before elevation but is incorrect for reboot returned by an elevated retry.
- AC13: not satisfied for changed non-PATH Machine/User environment variables.
- AC14: partially satisfied; ordinary failure blocks, but elevated failure can be misclassified as another permission request.
- AC15: accepted.
- AC16: registry IDs are present; version/probe correctness requires revision.
- AC17: accepted from inspected fake-runner test architecture and Implementer evidence.
- AC18: accepted.
- AC19: accepted.
- AC20: accepted from reported regression evidence.
- AC21: accepted from Implementer-reported normal Windows validation: typecheck/build/full suite green.

## Required Revision

Continue within WC57. Do not create a new repair architecture or broaden scope.

Correct only the bounded production defects above:

1. elevation-aware WinGet bootstrap/repair and resumable classification;
2. authoritative classification of elevated provisioning results;
3. correct Windows Machine/User environment refresh precedence;
4. exact Visual Studio generation verification for `msvc-x64` / `desktop-cpp`; and
5. truthful simple-capability version/probe handling for the initial registry.

Update the existing WC57 Implementer Report with the changed files, new regression evidence, and rerun:

```text
npm run typecheck
npm run build
focused development-environment/Codex tests
npm test
```

Do not perform real package installation on the primary development host as part of automated validation.

## Operator Validation

Deferred until this revision passes Architect review.

Do not run the disposable-machine/manual provisioning validation yet. The current code can falsely report MSVC readiness and mishandle WinGet bootstrap/elevated outcomes, so manual validation now would not be a reliable acceptance exercise.

## Final Disposition

`RevisionRequested`.

WC57's architecture is accepted, but the Work Card remains active until the five bounded provisioner defects above are corrected and independently reviewed.
