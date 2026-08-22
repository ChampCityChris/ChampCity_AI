<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR04",
    "repairId": "WC57-REPAIR04",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "work-card-repair-implementation",
    "workCardId": "WC57-REPAIR04",
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

# IMPLEMENTER REPORT WC57-REPAIR04 - Provider-Backed Development Environment Resolution And Observable Recovery

Report type: numbered Work Card repair implementation  
Repository path inspected: verified approved repo root  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow` tracking `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Remote: `origin` / `https://github.com/ChampCityChris/ChampCity_AI.git`  
Git mutation authorized: No  
Commit created: No  
Commit hash: none

## Files Changed

Files created:

- `src/main/developmentEnvironment/windowsPackageProviderResolver.ts`
- `src/main/developmentEnvironment/repositoryEcosystemProvider.ts`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md`

Files modified for this repair:

- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts`
- `src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts`
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/shared/workspaceContracts.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `src/renderer/styles.css`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- `test/development-environment/elevated-command-transport.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`

Files intentionally not created:

- No JSON sidecar for the governed Work Card or report.
- No local package catalog, package manifest mirror, vendor download URL database, or broad hard-coded Windows package list.
- No WC58 App Server approval transport, free-form Implementer chat UI, authentication, database, cloud, deployment, MCP connector, or provider SDK feature.

Several repository files were already dirty before this pass. Those pre-existing changes were preserved and not reverted.

## Implementation Summary

- Retired static-registry allowlist semantics for managed requirements. A missing registry entry now enters provider-backed discovery/resolution instead of immediate `unsupported`.
- Removed ordinary WinGet package IDs from the specialized registry. The registry now retains semantic probes and the Visual Studio/MSVC composite verifier only.
- Added a Windows package provider resolver that detects WinGet MCP availability, attempts MCP `find` when available, falls back to direct `winget search` over trusted configured sources, normalizes candidate package identity, refuses ambiguous installs, and installs only after an exact provider candidate is selected.
- Added a repository ecosystem provider detector for npm, pnpm, Yarn, uv/Python, Python requirements, Cargo, Go modules, .NET/NuGet, Maven, Gradle, vcpkg, Conan, Bundler, and Composer.
- Added recoverable `resolution-required` preflight state and `provider-resolution` action semantics.
- Added a distinct `Resolve Environment` action through main IPC, preload, app shell, execution service, and renderer controls.
- Added environment-resolution session labeling, output visibility, and deterministic preflight rerun after environment-resolution completion.
- Reworked the Implement workspace environment status surface so per-capability evidence is visible without opening the old collapsed-only disclosure.
- Removed duplicate large generic error presentation from the Codex console when environment preflight already owns the primary explanation.

## Provider-Resolution Hierarchy

Final hierarchy:

```text
Approved Work Card requirement
-> discover effective current capability
-> specialized probe/composite adapter when it directly represents the requested capability
-> provider-backed package or configuration resolution when not satisfied
   -> WinGet MCP availability and package find attempt
   -> direct WinGet search of trusted configured sources when MCP is unavailable or unresolved
   -> WinGet Configuration/DSC for Visual Studio/MSVC desktop C++ composite state
   -> repository-native ecosystem provider detection for dependency authorities
-> install/configure through existing WC57/REPAIR03 command/elevation/result transport
-> refresh Windows process environment
-> verify the requested effective capability
-> unresolved managed capability becomes resolution-required
-> Resolve Environment runs a bounded environment-resolution Codex turn
-> deterministic preflight reruns after the environment-resolution turn
```

## Specialized Registry Status

The registry now keeps:

- executable/version probes for known simple capabilities such as `git`, `cmake`, `ninja`, `nodejs-lts`, `python`, `dotnet-sdk`, `rust`, and `jdk`;
- bounded version parsing/range hints where the probe has known semantics;
- the existing MSVC desktop C++ composite verifier/configuration adapter, generalized so `visual-studio-2022-msvc-desktop-cpp` with profile `x64-cpp20` can use the adapter without rewriting the Work Card to `msvc-x64`.

The registry no longer owns ordinary package identity. No `wingetPackageId` field remains in the registry entries, and a missing registry key is not a support boundary.

## Provider Behavior Evidence

WinGet MCP discovery:

- `WindowsPackageProviderResolver.resolvePackage(...)` runs `winget mcp --help` and records a `winget-mcp` discovery attempt.
- When available, it attempts `winget mcp find <semantic query>` and records normalized candidates.
- Tests assert the MCP path is attempted and that the direct search path remains available when MCP is unavailable.

Direct WinGet provider behavior:

- The resolver runs `winget search --query <capability/profile/version> --source winget --accept-source-agreements`.
- It also searches `--source msstore` as a trusted configured source.
- It parses JSON-shaped provider output and WinGet table output.
- It installs only a single unambiguous package candidate.
- Ambiguous or zero-result output produces recoverable `resolution-required`, not permanent `blocked`.

Composite provider behavior:

- Visual Studio 2022 MSVC desktop C++ still uses WinGet Configuration/DSC with `Microsoft.VisualStudio.2022.BuildTools`, `Microsoft.VisualStudio.Workload.VCTools`, x64 tools, and Windows SDK verification.
- The semantic `visual-studio-2022-msvc-desktop-cpp / x64-cpp20` requirement reaches this composite adapter without requiring the Work Card to use the old `msvc-x64 / desktop-cpp` alias.

Repository ecosystem coverage:

- `detectRepositoryEcosystemProviders(...)` recognizes the Work Card enumerated ecosystem evidence.
- Wrappers and lockfiles are preferred where present.
- The detector reports restore authority and required system tool; it does not maintain individual library allowlists and does not install project dependencies merely because a manifest exists.

## Recoverable State And Transition

New recoverable semantics:

```text
preflight.state = resolution-required
retryAllowed = true
canResolveEnvironment = true
canRunAgain for normal implementation = false
structural blocker = false
```

Transition:

```text
Run Codex Implementer
-> deterministic preflight
-> unresolved managed capability after provider attempts
-> UI shows Environment resolution required
-> Resolve Environment action becomes available
-> Environment Resolution Codex turn runs
-> environment-resolution output remains visible
-> deterministic preflight reruns automatically
-> only ready/not-required preflight enables normal Work Card implementation
```

Permanent `blocked` remains reserved for structural/external conditions such as external ownership, unsupported host platform, and host policy.

## Environment-Resolution Prompt And Authority

Implemented:

- Separate environment-resolution execution kind and UI label.
- Bounded prompt authority to establish only Work Card-required managed environment capabilities.
- Explicit instruction not to substitute architecture, compiler family, target architecture, package ecosystem, or approved capability identity.
- Explicit instruction to prefer authoritative vendor, WinGet, WinGet Configuration/DSC, and project-native ecosystem sources.
- Explicit instruction not to update the Implementer Report as if normal Work Card implementation ran.
- Automatic deterministic preflight rerun after completion.

Residual limitation:

- A richer prompt carrying the exact Work Card path/hash, unresolved requirements, provider candidates, and command evidence was attempted, but the tool safety guard rejected embedding that payload into a Codex-destination prompt without explicit approval. The implemented prompt is safer and bounded, but it does not fully satisfy the Work Card's exact-evidence prompt payload requirement.

## UI Evidence

The Implement workspace now visibly shows:

- each capability;
- requested version/profile;
- current state transition;
- last stage reached;
- blocker or human interaction reason;
- retry or Resolve Environment availability;
- successful capabilities separately from unresolved ones;
- immediately reachable command evidence with command string, exit code, and concise stderr.

When preflight prevents implementation, the workspace says:

```text
Work Card implementation has not started. Development environment preparation must complete first.
```

Environment-resolution Codex output is labeled as `Environment Resolution`.

## Acceptance Evidence

- Missing exact registry entry no longer becomes `unsupported`: `unknown managed capability enters recoverable provider-backed resolution instead of unsupported`.
- Static registry no longer owns package identity: no production `wingetPackageId` registry field remains.
- CMake provider-backed resolution: `missing simple managed capability uses exact WinGet install, refreshes environment, and re-verifies`.
- Non-Microsoft package proof: `ordinary non-Microsoft WinGet community package resolves without registry package identity` uses `MikeFarah.yq`.
- FO76 regression fixture: `FO76 host-readiness shape reaches provider and composite resolution without static aliases`.
- Ambiguous provider result proof: `ambiguous WinGet output blocks and cannot become install authority` now produces recoverable `resolution-required` and no install call.
- Zero-result provider proof: `zero-result provider search remains recoverable resolution-required`.
- Ecosystem coverage proof: `repository ecosystem provider recognizes native dependency authorities without library allowlists`.
- UAC/restart/transient/provider/ambiguous/structural boundaries: provisioner and elevated transport focused suites passed.
- Deterministic preflight rerun after environment resolution: `Codex Implementer service runs bounded environment resolution and reruns preflight before implementation`.
- UI evidence proof: `Build workspace presents report target, run controls, and terminal retry summary without report review controls` and related renderer tests passed.
- WC57/REPAIR03 elevated compatibility: elevated command transport suite passed.
- WC58 not implemented: no App Server approval-routing architecture or free-form chat UI was added.

## Commands And Results

All commands were run with working directory `<PROJECT_REPO>`.

- `pwd`: exit 0; verified approved repo root.
- `git status --short --branch`: exit 0; branch and dirty worktree inspected.
- `git remote -v`: exit 0; remote inspected.
- `Get-Content planning/phases/phase-08/Work_Cards/WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md`: exit 0; approved Work Card read.
- `Get-Content docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`: exit 0; repository boundary read.
- `Get-Content docs/dev/VALIDATION_COMMAND_LANES.md`: exit 0; validation lane read.
- `npx tsc --noEmit`: exit 0; passed.
- `npx tsc`: first sandbox run failed with `EPERM` writing `dist/`; rerun in approved normal Windows lane exited 0.
- `node --test --test-concurrency=1 test/development-environment/windows-development-environment-provisioner.test.cjs`: first sandbox run failed with `spawn EPERM`; normal Windows lane final result exited 0, 25/25 passed.
- `node --test --test-concurrency=1 test/work-card-building/codex-implementer-execution-service.test.cjs`: normal Windows lane final result exited 0, 16/16 passed.
- `node --test --test-concurrency=1 test/renderer/work-card-building-review-workspace.test.cjs`: normal Windows lane exited 0, 6/6 passed.
- `node --test --test-concurrency=1 test/development-environment/elevated-command-transport.test.cjs`: normal Windows lane final result exited 0, 7/7 passed.
- `node --test --test-concurrency=1 test/app-shell/app-shell.test.cjs`: normal Windows lane exited 0, 8/8 passed.
- `node --test --test-concurrency=1 test/work-card-planning/development-environment-contract.test.cjs`: normal Windows lane exited 0, 7/7 passed.
- `npm run typecheck`: exit 0; passed.
- `npm run build`: approved normal Windows lane exited 0; `tsc && vite build` passed.
- `npm test`: approved normal Windows lane exited 0; 387/387 passed.
- Bounded safety scan for local paths and secret-like terms: only expected prompt/test/redaction/environment-token-counter text was found; no concrete local path or secret value was introduced.

## Validation Skipped

- Operator manual validation was not performed by the Implementer.
- Real UAC, real WinGet install/repair, real WinGet MCP server stdio exchange, real WinGet Configuration application, Visual Studio modification, reboot, host-policy manipulation, and live FO76 host-readiness execution were not performed.
- Electron visual launch smoke was not performed; renderer source tests, service tests, build, and full automated suite were run.
- Exact-evidence environment-resolution prompt payload was not implemented because the patch safety guard rejected transmitting that richer payload without explicit approval.

## Security And Secret-Safety Notes

No secrets, credentials, API keys, private keys, private environment-file contents, or concrete local machine paths were written into this report or new durable artifacts. Provider command evidence is truncated/sanitized in production, and secret-like key/value command output redaction remains in place.

## Git Actions

No Git mutation was authorized or performed. Nothing was staged, committed, pushed, stashed, reset, rebased, merged, tagged, cleaned, restored, checked out, or pulled.

The worktree remains dirty due to pre-existing Phase 08 changes plus this repair's production, test, and report edits.

## Manual Validation Required

Use a disposable or otherwise acceptable Windows test environment and an Approved Work Card containing at least one missing ordinary development tool and one composite/less-direct development requirement.

- Confirm preflight discovers current capabilities before installing anything.
- Confirm ordinary package discovery is provider-backed and not registry package-ID-backed.
- Confirm an available ordinary package can be provisioned and verified.
- Confirm UAC/restart flows remain narrow human-interaction boundaries.
- Confirm a managed non-registry capability reaches provider resolution instead of immediate unsupported.
- Confirm unresolved provider result enters `resolution-required` and offers `Resolve Environment`.
- Confirm environment-resolution output is labeled separately from Work Card implementation output.
- Confirm deterministic preflight reruns after environment resolution.
- Confirm normal Work Card implementation starts only after all required managed capabilities verify.
- Re-run the live FO76 host-readiness contract and confirm semantic capability names are not rejected because they are absent from a static map.

## Residual Risks

- The environment-resolution prompt is intentionally bounded but does not carry full exact provider/preflight evidence because the tool safety guard rejected that richer prompt payload.
- Real WinGet MCP behavior is represented by production command boundaries and deterministic tests, but live MCP stdio behavior still needs Windows host validation.
- Real provider search output formats may vary; parser covers JSON and common WinGet table output and should be validated against the Operator's installed Windows Package Manager version.
- Real Visual Studio Installer behavior, component names, UAC, restart-required, and host-policy conditions still require disposable-host validation.

## Blocking Questions

None.

## Recommended Next Implementer Task

If the Operator approves transmitting exact unresolved requirement and provider evidence into the environment-resolution Codex prompt, perform a narrow follow-up repair to enrich `buildCodexEnvironmentResolutionPrompt(...)` and add matching prompt-payload tests.

Document.Status=Pending
