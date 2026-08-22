<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Deterministic Windows Development Environment Provisioner",
    "status": "approved_for_implementation",
    "executionMode": "one bounded application-owned environment provisioning and Implementer preflight implementation",
    "confirmedDefect": "After WC56, ChampCity A/I can express that required development capabilities are managed project work, but the application still lacks a deterministic mechanism that detects, installs, configures, refreshes, and verifies those capabilities before Codex implementation begins. Without an application-owned provisioner, the model would still need to improvise package discovery and installation from shell/web context. Windows Package Manager provides a deterministic local package and desired-state backend suitable for the majority of Windows development prerequisites.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57_deterministic_windows_development_environment_provisioner.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Implement the application-owned Windows development environment provisioner consumed by WC56 contracts. Use local WinGet/WinGet Configuration as the primary backend, keep package/install mechanics out of model reasoning, and treat UAC/reboot/authentication as bounded resumable human interactions rather than technical setup transferred to the Operator.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57 — Deterministic Windows Development Environment Provisioner

Status: Approved for Implementer execution  
Phase: `phase-08`  
Depends on: `WC56`  
Git mutation: prohibited

## Confirmed Defect

WC56 establishes the correct authority model:

```text
Architect decides required development capability
→ missing managed capability is project work
→ application-owned provisioner determines how to establish it
→ Implementer consumes the verified capability
```

ChampCity A/I does not yet contain that provisioner.

If the application only changes prompts, an agent may still be forced to search the internet, infer package identity, choose installers, reason about silent-install switches, edit PATH, or rediscover platform-specific setup every time a tool is missing. That is unnecessary model work, difficult to make reproducible, and likely to produce inconsistent host environments.

Windows Package Manager now provides the local primitives needed to avoid that behavior:

- WinGet package discovery/installation supports exact package IDs, versions, architectures, scopes, agreement acceptance, and noninteractive operation;
- `winget configure` applies declarative desired-state configuration files and is specifically intended for repeatable machine/development-environment setup;
- Microsoft uses WinGet Configuration/DSC for multi-component development workloads including Visual Studio workloads and Windows SDKs;
- Microsoft documents a repair/bootstrap path for a missing or broken WinGet client through the `Microsoft.WinGet.Client` PowerShell module and `Repair-WinGetPackageManager`;
- Microsoft's current WinGet MCP server exposes package `find` and `install`, but that agent-facing MCP is not required to obtain deterministic package-management behavior inside ChampCity.

Official platform references current at Work Card creation:

```text
https://learn.microsoft.com/windows/package-manager/winget/install
https://learn.microsoft.com/windows/package-manager/winget/configure
https://learn.microsoft.com/windows/package-manager/winget/troubleshooting
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-overview
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-usage
```

## Architectural Decision

Implement an application-owned `Development Environment Provisioner` in the ChampCity main process.

The critical path must not depend on an external MCP server. Use the local WinGet CLI and WinGet Configuration/DSC directly because ChampCity already controls the local process, execution policy, and Work Card lifecycle.

The official WinGet MCP server may remain a future optional adapter or diagnostic/discovery integration. Do not require it for normal provisioning and do not configure VS Code, Copilot, or user-global MCP state in this card.

Provisioning hierarchy for Windows is:

```text
1. verify existing capability
2. resolve capability through ChampCity's application-owned registry
3. use WinGet exact package installation for simple capabilities
4. use WinGet Configuration/DSC for composite workloads or machine desired state
5. refresh the current process environment and re-verify
6. only when the capability is unsupported by the registry, return a precise unsupported-capability result for Architect/repair handling
```

Known capabilities must not trigger general web research by the Implementer.

## Objective

Before an embedded Codex Implementer thread begins, resolve the Approved Work Card's `champcity-development-environment` contract, verify every requirement, automatically provision missing `managed` capabilities through deterministic Windows mechanisms, refresh/verify the resulting host environment, and provide the verified environment evidence to the Implementer.

The nontechnical Operator should be involved only when Windows or a third party genuinely requires human interaction such as UAC consent, sign-in/license action, or restart.

## Required Changes

### 1. Add an application-owned development-environment service boundary

Create a bounded main-process subsystem under a dedicated development-environment namespace, for example:

```text
src/main/developmentEnvironment/
```

The subsystem must separate:

- Work Card requirement parsing/normalization from WC56;
- capability registry/resolution;
- current-machine detection/verification;
- WinGet availability/bootstrap;
- simple package installation;
- WinGet Configuration/DSC workload application;
- environment refresh;
- preflight orchestration; and
- structured provisioning evidence/status.

Do not put package-installation logic directly into the Codex prompt builder or renderer.

### 2. Define the provisioner result/state contract

Add shared types sufficient for application/UI/Codex integration.

At minimum, preflight must distinguish:

```text
not-required
checking
provisioning
ready
waiting-for-operator
blocked
```

Each requirement result must identify:

- `capabilityId`;
- requested version/profile when present;
- provisioning mode (`managed | external`);
- before-state (`satisfied | missing | incompatible | unknown`);
- action taken (`none | install | configure | repair-winget | external-block`);
- after-state;
- detected version/profile where available;
- command/result summary suitable for audit without exposing secrets; and
- blocker or human-interaction reason when applicable.

Do not persist passwords, tokens, installer secrets, or private environment-file contents.

### 3. Add an application-owned capability registry

Create a registry that maps stable WC56 `capabilityId` values to deterministic detection and provisioning behavior.

The initial registry must support the common Windows development capabilities necessary to make the subsystem generally useful, including at minimum:

```text
git
cmake
ninja
nodejs-lts
python
dotnet-sdk
rust
jdk
msvc-x64
```

The registry may use exact WinGet package IDs internally. Package IDs and installer/configuration mechanics remain application implementation details and must not leak into Project Planning or the WC56 requirement block.

For simple tools, registry entries should define:

- detection command/probe;
- version normalization;
- exact WinGet package identity;
- supported version-constraint behavior; and
- post-install verification.

For composite capabilities such as `msvc-x64`, use a named profile and WinGet Configuration/DSC or another deterministic Microsoft-supported Visual Studio workload mechanism rather than treating the toolchain as one executable-presence check.

The initial `msvc-x64` `desktop-cpp` profile must verify the required Visual Studio generation, MSVC x64 compiler capability, and Windows SDK/build prerequisites as one coherent capability.

### 4. Bootstrap or repair WinGet deterministically

Before provisioning a managed Windows package, detect whether `winget` is available and functional.

If WinGet is absent or broken, implement the documented Microsoft repair path using PowerShell and the `Microsoft.WinGet.Client` module, equivalent to:

```powershell
Install-PackageProvider -Name NuGet -Force
Install-Module -Name Microsoft.WinGet.Client -Force -Repository PSGallery
Repair-WinGetPackageManager -Force -Latest
```

The implementation may add noninteractive/scope flags necessary for safe programmatic use, but must preserve the Microsoft-supported repair mechanism rather than downloading arbitrary binaries from model-selected URLs.

After repair/bootstrap, verify `winget --version` and required command availability before attempting package provisioning.

If host policy disables WinGet/Configuration, report the actual policy/host blocker rather than attempting to bypass enterprise controls.

### 5. Use exact, nonheuristic WinGet package installation for simple capabilities

For simple registry-backed packages, installation must resolve to an exact package identity and use a deterministic command equivalent to:

```text
winget install --id <exact-package-id> -e --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity
```

Add version, architecture, or scope options only when required by the capability contract/registry.

Do not use free-text substring package installation as the final install authority.

Do not let Codex choose among ambiguous WinGet search results in the normal supported-capability path.

### 6. Use WinGet Configuration/DSC for composite workloads

For a capability that represents a workload rather than a single package, generate or apply an application-owned WinGet Configuration document under an application-controlled temporary/provisioning area.

The configuration may use Microsoft WinGet/DSC resources such as package and Visual Studio component resources as appropriate.

For Visual Studio/MSVC workload provisioning, follow the Microsoft-supported pattern of installing the Visual Studio product/build tools and applying required workload/components declaratively rather than asking the Operator to use Visual Studio Installer manually.

Generated provisioning documents are machine/provisioning state, not project source authority, unless a future Work Card explicitly requires a project-owned reproducibility file.

Do not clone or depend at runtime on Microsoft's sample configuration repositories. They are reference evidence, not a ChampCity runtime dependency.

### 7. Treat UAC/elevation as a bounded human interaction

When a supported installation requires elevation:

- ChampCity initiates the correct elevated operation;
- Windows owns the UAC consent surface;
- the UI/status explains only that Windows permission is required to install the already-selected development capability;
- the Operator is not asked to choose packages, workloads, SDK components, install directories, or technical alternatives; and
- after approval, provisioning resumes and verifies automatically.

If UAC is declined, classify the requirement as `waiting-for-operator` or a precise blocked state that can be retried without creating a repair card merely because consent was declined once.

If an installation requires reboot, return a structured restart-required state and allow the same preflight to resume idempotently after restart.

Do not reboot the machine automatically in this card.

### 8. Refresh process environment after installation

A successful installer may update user/machine PATH without updating the already-running Electron main-process environment.

After provisioning, reconstruct/refresh the effective Windows process environment from current user/machine environment state before verification and before starting Codex.

Do not require the Operator to restart ChampCity merely to pick up ordinary PATH changes when the application can refresh them safely.

A full OS restart remains valid only when the installer/platform explicitly requires it.

### 9. Integrate provisioning as a preflight to Codex Implementer execution

Update the Work Card Building Codex execution path:

```text
Operator starts Implementer
→ resolve Approved Work Card
→ parse champcity-development-environment block
→ run development-environment preflight
→ provision/verify managed capabilities
→ block only for unsatisfied external/unsupported/failed requirements
→ start Codex SDK thread only when preflight is ready
```

If the Work Card contains no environment block, existing Codex startup behavior remains unchanged.

Do not start the Codex SDK thread while required managed capabilities remain missing/incompatible.

Do not make Codex itself responsible for package discovery/install commands in the normal provisioner-supported path.

### 10. Provide provisioning evidence to the Implementer Report workflow

The application must make the preflight result available to the Codex Implementer prompt as verified application evidence.

The prompt should summarize:

- requirements checked;
- capabilities already satisfied;
- capabilities provisioned;
- final detected versions/profiles;
- any human interaction that occurred; and
- the final preflight state.

The Implementer remains responsible for mapping that evidence into the canonical Implementer Report when the Work Card requires environment proof.

Do not let the Implementer rewrite application-owned requirement identity or provisioning state.

### 11. Expose concise provisioning status in the existing Build workspace

Extend the existing Work Card Build/Implementer status projection rather than creating a separate environment-management application.

The Operator-visible state should be simple, for example:

```text
Preparing development environment…
Installing required development tools…
Windows permission required…
Development environment ready.
```

Detailed package/command evidence may remain in an expandable diagnostic/status area if the existing UI supports it.

Do not require the Operator to manually configure package managers or copy commands into a terminal.

### 12. Add deterministic tests with no real machine mutation

Automated tests must use injected/fake command runners and environment providers. The normal test suite must not actually install or modify host development tools.

Test at minimum:

- no requirements → no provisioning → Codex starts normally;
- satisfied managed capability → no install → Codex starts;
- missing simple managed capability → exact WinGet install → refresh → verify → Codex starts;
- incompatible version → provision/upgrade when registry supports it → verify;
- missing external capability → no install → precise block;
- unsupported managed capability → precise provisioner unsupported block;
- missing/broken WinGet → documented repair/bootstrap path → retry;
- ambiguous package resolution cannot become an install;
- composite `msvc-x64` profile uses configuration/workload path rather than a generic package-presence shortcut;
- UAC/elevation-required result maps to resumable Operator state;
- reboot-required result maps to resumable restart state;
- installation failure prevents Codex start;
- PATH/environment refresh occurs before final verification/Codex start;
- preflight evidence is injected into the Implementer prompt;
- existing retry, cancellation, report refresh, WC54 execution policy, and WC55 prompt behavior remain green.

## Platform Evidence and Constraints

Current Microsoft platform behavior to preserve:

- WinGet package installation supports exact ID matching and noninteractive options.
- `winget configure` is the preferred complete approach for declarative multi-package/machine desired-state setup.
- WinGet Configuration detects already-satisfied resources and is designed to be safely reapplied.
- Visual Studio workloads can be applied through Microsoft Visual Studio DSC resources/configuration.
- WinGet can be repaired through `Microsoft.WinGet.Client` / `Repair-WinGetPackageManager`.
- WinGet or installer operations may require elevation; that is an OS interaction boundary, not a reason to transfer technical setup to the Operator.

If the implementation discovers that a cited Microsoft command/resource has changed, use current official Microsoft documentation to make the smallest compatible implementation adjustment and record the deviation in the Implementer Report. Do not substitute an unofficial installer source merely to preserve obsolete syntax.

## Preserved Behavior

Preserve:

- WC56 project ground-zero semantics and structured capability authority;
- Work Card as sole authority for which capabilities may be provisioned;
- WC54 full local development execution policy;
- WC55 prompt-policy and selected-root routing behavior;
- current Codex SDK authentication, cancellation, retry, streamed execution, report refresh, and validation lifecycle;
- existing project/repository boundaries;
- current secret/credential protections;
- Git mutation only when explicitly authorized; and
- non-Windows project behavior outside this Windows provisioner.

The provisioner is infrastructure for development tooling. It must not become a general-purpose software installer UI.

## Authorized Surface

Expected new production surface:

```text
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts
```

Equivalent naming is allowed if the responsibility boundaries remain explicit.

Expected integration surface:

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/main.ts
src/shared/workspaceContracts.ts
src/shared/developmentEnvironmentContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
```

Existing preload/shared API files may be changed only as required to project preflight status through the current Build workspace.

Focused tests may be added under a dedicated development-environment test area and existing Work Card Building/app-shell suites.

No user-global Codex, VS Code, Copilot, or MCP configuration file is authorized for modification.

Required report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57_deterministic_windows_development_environment_provisioner.md
```

## Acceptance Criteria

1. A Work Card with no `champcity-development-environment` requirements starts Codex through the existing path without provisioning behavior.
2. Every Work Card requirement is verified before Codex starts.
3. A satisfied managed capability causes no installation.
4. A missing managed simple capability is resolved through the application-owned registry and exact WinGet installation, then re-verified before Codex starts.
5. An exact package identity is required for final installation; ambiguous package search output cannot be used directly as install authority.
6. A missing/broken WinGet client follows the documented Microsoft repair/bootstrap path and re-verifies WinGet before package provisioning.
7. Composite workload capability `msvc-x64` with `desktop-cpp` profile uses deterministic workload/configuration logic and verifies compiler/toolchain/profile readiness, not only executable presence.
8. WinGet Configuration/DSC documents are generated/applied from application-controlled provisioning state and are not written into the selected project unless a Work Card explicitly requires a project-owned environment file.
9. A missing `external` capability is never auto-installed and blocks with the exact capability identity and external ownership reason.
10. An unsupported managed capability blocks with a specific provisioner-unsupported classification rather than causing Codex to improvise a web installer.
11. Required elevation invokes the platform elevation path and produces a resumable Operator state without asking the Operator to choose technical components.
12. Reboot-required provisioning produces a resumable restart-required state and does not automatically restart Windows.
13. User/machine environment changes are refreshed into the running app before final verification and Codex startup where a reboot is not required.
14. Installation/provisioning failure prevents Codex startup and retains auditable command/result evidence.
15. Successful preflight evidence is injected into the Codex Implementer prompt as application-verified context.
16. The initial registry supports at least `git`, `cmake`, `ninja`, `nodejs-lts`, `python`, `dotnet-sdk`, `rust`, `jdk`, and `msvc-x64`.
17. The standard automated test suite performs no real package installation or machine mutation.
18. Existing WC54 SDK policy remains `danger-full-access`, `approvalPolicy=never`, and network enabled.
19. Existing WC55 prompt cleanup remains intact; no generic security/sanitization gate is added around provisioning.
20. Existing Codex retry/cancellation/report-refresh/lifecycle tests remain green.
21. `npm run typecheck`, `npm run build`, and `npm test` pass using normal ChampCity validation lanes.

## Negative Constraints

Do not:

- make the official WinGet MCP server a required runtime dependency;
- configure VS Code, GitHub Copilot, Codex user config, or user-global MCP files;
- let Codex select arbitrary packages for supported capability IDs;
- install software not authorized by the Approved Work Card environment contract/project instructions;
- use general web search as the first-line mechanism for supported capabilities;
- download executables from model-selected arbitrary URLs;
- treat a missing tool as an automatic Operator task;
- require the Operator to choose Visual Studio workloads/components already determined by the capability profile;
- bypass Windows enterprise policy, application control, or package-management policy;
- auto-reboot the machine;
- expose secrets/credentials in provisioning logs;
- persist installer binaries in the project repository;
- create a general software-management UI;
- modify unrelated project source;
- perform Git mutation.

## Implementer Report Requirements

Report only:

- files changed;
- final preflight/provisioner architecture;
- capability registry entries and detection/provisioning strategy;
- WinGet bootstrap/repair implementation;
- exact simple-package and composite-workload provisioning behavior;
- environment refresh implementation;
- Codex preflight integration and prompt evidence injection;
- Operator/UAC/reboot state behavior;
- proof that tests use fake/injected runners and do not mutate the host;
- focused and full validation results;
- any Microsoft platform syntax/resource adjustment made from current official documentation; and
- remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

Use a disposable or intentionally incomplete Windows development environment rather than uninstalling required tools from the primary ChampCity development machine merely to create a failure.

Validate at least one simple managed capability and one composite toolchain/workload scenario:

1. Start an Implementer Work Card whose required managed capability is absent from the validation environment.
2. Confirm ChampCity detects the missing capability before Codex starts.
3. Confirm ChampCity provisions it through the deterministic provisioner without asking the Operator what package/tool to install.
4. If UAC appears, approve only the Windows consent prompt; perform no manual component selection.
5. Confirm the capability is re-verified and Codex begins only after environment readiness.
6. Confirm the Implementer receives the provisioning evidence and can complete the Work Card using the newly available capability.
7. Repeat/retry the same preflight and confirm it is idempotent: already-satisfied capabilities are not reinstalled.
