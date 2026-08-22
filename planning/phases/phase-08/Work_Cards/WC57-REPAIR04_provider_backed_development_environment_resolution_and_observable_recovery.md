<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
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
      "path": "planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57_deterministic_windows_development_environment_provisioner.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR03_windows_powershell_compatible_elevation_transport_and_preflight_state_precedence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Provider-Backed Development Environment Resolution and Observable Recovery",
    "status": "approved_for_implementation",
    "executionMode": "one bounded WC57 repair replacing static package-allowlist semantics with provider-backed resolution and recoverable preflight failure handling",
    "parentWorkCardId": "WC57",
    "confirmedDefect": "Live FO76_Collector validation proved that WC57 can correctly attempt managed tool installation and UAC elevation yet still hard-block a valid Approved Work Card because development requirements are treated as exact keys in a finite ChampCity-owned capability/package registry. The same run exposed an observability defect: useful per-capability provisioning evidence is hidden behind a collapsed detail surface while repeated generic blocked messages dominate the Implement workspace.",
    "rootCause": "WC57 incorrectly made ChampCity's current package/recipe table an authority boundary. WinGet is already the installation backend, but ChampCity still owns package identity and rejects valid project requirements it has not pre-encoded. The provisioner also treats provider-resolution failure as terminal rather than a recoverable resolution state, and the renderer does not present existing structured failure evidence as the primary explanation.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Retire static-registry allowlist semantics. Project/Work Card requirements remain authoritative even when ChampCity has never seen the capability ID before. Use external Windows package/configuration providers and native project ecosystems first, preserve specialized recipes only as optional fast paths/verifiers, provide a bounded agentic long-tail resolution path, and make unresolved provisioning recoverable and diagnostically clear rather than a dead project state. Do not implement general free-form Implementer chat in this repair.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR04 — Provider-Backed Development Environment Resolution and Observable Recovery

Status: Approved for Implementer execution  
Parent: `WC57`  
Depends on: `WC57-REPAIR03`  
Git mutation: prohibited

## Confirmed Defects

### Defect 1 — The static capability registry is functioning as an architecture allowlist

Current `WindowsDevelopmentEnvironmentProvisioner.preflight(...)` resolves each requirement through `developmentEnvironmentCapabilityRegistry`. A missing exact key becomes `unsupported` before any external package/configuration provider is asked whether the required capability can be established.

That is backwards. The Approved Work Card defines the development capability the project requires. ChampCity's current implementation knowledge must not constrain that architecture.

Live FO76 validation proved the defect. Its current Approved host-readiness Work Card requires:

```text
windows-x64-host / development-host / external
cmake >=3.24 / managed
visual-studio-2022-msvc-desktop-cpp / x64-cpp20 / managed
```

The provisioner correctly reached CMake installation and UAC. The run nevertheless could not become ready because the remaining valid requirements were not exact entries in ChampCity's narrow registry.

`unknown-to-ChampCity` is not `unsupported-on-this-host`.

### Defect 2 — ChampCity owns package identity that existing providers already maintain

The current registry contains mappings such as:

```text
cmake -> Kitware.CMake
git -> Git.Git
nodejs-lts -> OpenJS.NodeJS.LTS
python -> Python.Python.3.12
```

Windows Package Manager already maintains current package sources and package identities. Its default sources include the Microsoft Store catalog (`msstore`) and the WinGet Community Repository (`winget`). Current Windows Package Manager also ships an official stdio MCP server whose `find` operation is designed for AI-assisted package discovery from natural-language intent.

ChampCity should orchestrate those providers, not become their package catalog.

Official Microsoft references:

```text
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-overview
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-setup
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-usage
https://learn.microsoft.com/windows/package-manager/winget/source
https://learn.microsoft.com/windows/package-manager/winget/search
```

### Defect 3 — Composite Windows development workloads require desired-state providers

A capability such as Visual Studio 2022 + MSVC Desktop C++ + x64/C++20 is more than one executable package. WinGet Configuration and PowerShell DSC are designed to establish reproducible Windows development-machine desired state including packages, tools, components, dependencies, and settings.

ChampCity may retain specialized composite detection/verification adapters where semantic verification genuinely requires them. Those adapters are not an allowlist and must not make unrelated valid capabilities unsupported.

Official Microsoft reference:

```text
https://learn.microsoft.com/windows/package-manager/configuration/
```

### Defect 4 — Common project ecosystems already own dependency restoration

ChampCity does not need to learn or catalog individual JavaScript, Python, Rust, Go, .NET, Java, C++, Ruby, PHP, or similar libraries. Project manifests, lockfiles, and ecosystem-native tooling are the dependency authority.

Common deterministic adapters should recognize repository evidence and prefer the repository's own wrapper/lockfile where available, including at least:

```text
package-lock.json                      -> npm ci
pnpm-lock.yaml                         -> pnpm frozen-lockfile install
yarn.lock                              -> Yarn immutable/frozen install
uv.lock / pyproject.toml               -> uv sync
requirements*.txt                      -> Python requirements install/sync
Cargo.toml / Cargo.lock                -> Cargo
 go.mod / go.sum                        -> Go modules
*.sln / *.csproj                       -> dotnet restore / NuGet
mvnw / pom.xml                         -> Maven wrapper preferred
 gradlew / build.gradle*                -> Gradle wrapper preferred
vcpkg.json                             -> vcpkg manifest workflow
conanfile.py / conanfile.txt           -> Conan
Gemfile / Gemfile.lock                 -> Bundler
composer.json / composer.lock          -> Composer
```

These adapters identify the provider and normal deterministic restore mechanism. They are not dependency allowlists.

### Defect 5 — Provider failure currently strands the project

A managed capability that cannot be resolved by the current registry becomes a structural `blocked` result with no automated path forward.

The correct distinction is:

```text
provider has not resolved the managed capability yet
!=
project is structurally impossible
```

A valid managed requirement must have a recoverable resolution path. A permanent structural block is reserved for a genuine architecture/external boundary such as incompatible host OS/architecture, externally owned license/purchase/login, or host policy that prevents the required architecture after the supported recovery paths have been attempted.

### Defect 6 — The Implement workspace hides the useful failure evidence

Preflight already records per-requirement:

```text
beforeState
actionTaken
afterState
blockerKind
blocker
retryAllowed
humanInteractionKind
humanInteractionReason
commandSummaries
stdout/stderr/exit code
```

The current renderer emphasizes the generic top-level sentence and hides the useful evidence behind a collapsed `Provisioning evidence` disclosure. Multiple UI surfaces then repeat substantially the same generic blocked message.

The Operator cannot readily determine:

- which capability succeeded;
- which capability failed;
- whether failure occurred during discovery, resolution, provisioning, elevation, refresh, or verification;
- whether the failure is retryable;
- what human action, if any, is actually required; or
- whether Codex implementation ever started.

## Objective

Make ChampCity an orchestrator of existing development-environment providers rather than a maintainer of a finite software catalog.

Required runtime architecture:

```text
Approved Work Card development requirement
→ discover effective current capability
→ specialized detector/recipe when available (fast path only)
→ provider-backed resolution when no sufficient recipe exists
   → WinGet MCP / WinGet catalog for ordinary Windows software
   → WinGet Configuration + DSC for composite Windows workloads
   → repository-native ecosystem provider for project dependencies
→ provision the approved managed requirement
→ refresh environment
→ verify the effective Work Card capability
→ if still unresolved, enter recoverable environment-resolution state
→ bounded agentic environment-resolution turn may research/install/configure the long-tail requirement
→ rerun deterministic preflight
→ normal Codex implementation begins only after required environment is verified
```

A missing static-registry entry is never sufficient reason to block a managed requirement.

## Runtime Sequence

1. Parse the Approved Work Card `champcity-development-environment` contract exactly as today. Do not constrain `capabilityId` or `profile` to ChampCity aliases during Formal Work Card creation or promotion.
2. For each requirement, discover current effective state before changing the machine.
3. External requirements are evaluated through an appropriate non-provisioning detector when ChampCity has one. An unknown external requirement is reported as an external unresolved requirement, not converted into an invented package installation.
4. For a managed requirement, use an existing specialized adapter when it directly represents the requested capability. Specialized adapters may contain semantic probes or composite verification, but must not be the only route to provisioning.
5. If no specialized adapter resolves the managed requirement, query a provider using the Work Card's semantic requirement (`capabilityId`, `profile`, `versionConstraint`) rather than failing the requirement as unsupported.
6. For ordinary Windows software, use the Microsoft-owned Windows Package Manager catalog. Prefer the built-in WinGet MCP `find` interface when available. Direct `winget search` against trusted configured WinGet sources is an allowed equivalent provider path when the MCP server is unavailable or unsuitable. This is provider-backed resolution, not a static ChampCity fallback.
7. Provider resolution must return auditable candidate identity including package ID, package name, source, publisher when available, and version information. Do not install an ambiguous result. If more than one materially plausible package remains, proceed to the bounded agentic resolution lane rather than guessing.
8. Execute resolved package installation through the existing WC57/REPAIR03 WinGet command/elevation/result transport. Do not depend on an external AI client's own approval dialog. ChampCity's Approved Work Card remains the machine-change authority.
9. For composite Windows workloads, use WinGet Configuration/DSC or the relevant official vendor configuration mechanism when a simple package install cannot establish the required state. Preserve the existing VS2022/MSVC specialized verification where useful, but do not require the Work Card to use `msvc-x64` as an alias for the architecture it actually requested.
10. After provisioning, refresh the effective process environment using the accepted REPAIR01/REPAIR03 behavior and rediscover/reverify the requested capability.
11. Repository-native dependency restoration uses deterministic ecosystem evidence rather than a ChampCity package catalog. Prefer repository wrappers (`mvnw`, `gradlew`, etc.) and lockfiles when present. If the ecosystem tool itself is missing, resolve/install that machine tool through the same provider-backed system path.
12. If provider/catalog/configuration resolution cannot establish a managed requirement, return a recoverable `resolution-required` result rather than a permanent structural block.
13. The Operator-visible recovery action for `resolution-required` is `Resolve Environment`. It launches a bounded Codex environment-resolution turn with the Approved Work Card requirement, current provider attempts, exact command evidence, and project repository evidence needed to resolve the missing development capability. This turn is environment setup, not normal Work Card implementation.
14. The environment-resolution turn may use full authorized local tooling and network access to inspect authoritative vendor documentation, determine a supported installation/configuration method, execute the necessary setup, and verify it. It must not change the project's approved architecture merely because setup is difficult.
15. After an environment-resolution turn ends, ChampCity automatically reruns the deterministic preflight. Success returns to normal Work Card execution. Failure remains recoverable with updated evidence unless a genuine structural/external boundary has now been established.
16. The normal Codex Implementer must not start while required environment state is unresolved. The Implement workspace must explicitly distinguish `Environment resolution` from `Work Card implementation` so the Operator is never led to believe implementation ran when only preflight/setup ran.
17. True human interactions remain narrow: UAC, required restart, account authentication, purchase/license acceptance, or equivalent external action. After the interaction, the same deterministic resolution/provision/verify path resumes.
18. A permanent `blocked` state requires concrete evidence of a nonrecoverable structural/external condition. `not in the static registry`, `WinGet search returned zero results`, or `one provider attempt failed` are not sufficient structural blockers.

## Required Changes

### 1. Retire static-registry allowlist semantics

Refactor `developmentEnvironmentCapabilityRegistry` so it no longer determines whether a managed requirement is supported merely by key existence.

Permitted retained responsibility:

- known semantic probes;
- known executable/version parsing;
- specialized composite verification;
- optional deterministic fast-path hints.

Do not require a package ID to exist in this registry for ordinary software resolution. Remove hard-coded ordinary package identity where the WinGet provider can own discovery without loss of required determinism.

The production rule is:

```text
no specialized adapter
→ provider resolution
```

not:

```text
no registry entry
→ unsupported
```

### 2. Add a Windows package-provider resolver

Create an application-owned provider boundary under the existing development-environment subsystem.

It must support:

- provider availability detection;
- WinGet MCP server discovery using the Windows Package Manager-supported mechanism (`winget mcp`) when available;
- stdio MCP `find` package discovery, or direct `winget search` provider discovery when MCP is unavailable;
- trusted configured source use only;
- normalized candidate results;
- exact candidate selection only when unambiguous against the requested capability/version/profile;
- no package installation during discovery;
- installation through the existing command/elevation/classification path after resolution.

Do not create or maintain a second local software catalog.

### 3. Add composite Windows configuration provider behavior

Use WinGet Configuration/DSC for Windows development state that cannot be represented as one ordinary package install.

Preserve the accepted WC57/REPAIR03 configuration/elevation transport. Generalize it so composite capability identity need not equal a hard-coded ChampCity capability alias.

The live regression requirement `visual-studio-2022-msvc-desktop-cpp / x64-cpp20` must be resolvable without rewriting the Work Card to `msvc-x64 / desktop-cpp`.

### 4. Add common repository ecosystem provider detection

Implement one small provider-selection layer for common project dependency authorities. It must recognize at least the ecosystem evidence enumerated in Confirmed Defect 4.

Rules:

- wrappers and lockfiles take precedence over global guesses;
- project-native restore/sync remains repository dependency work rather than Microsoft Store package discovery;
- individual libraries are never added to a ChampCity dependency allowlist;
- missing ecosystem tooling is fed back into system-tool provider resolution;
- no project dependencies are installed merely because a manifest exists unless the Approved Work Card/implementation path actually requires dependency restoration.

### 5. Add recoverable `resolution-required` state

Extend the development-environment preflight contract with an explicit recoverable state for an approved managed capability that remains unresolved after ordinary provider attempts.

Required semantics:

```text
state = resolution-required
canRunAgain/resolution action = true
Codex normal implementation availability = unavailable
structural blocker = false
```

The result must identify the unresolved capability and provider attempts.

Do not overload `blocked` for this condition.

### 6. Add bounded environment-resolution agent execution

Reuse the installed Codex execution capability to provide a separate environment-resolution action for `resolution-required`.

The generated instruction must include:

- selected project root;
- exact Approved Work Card path/revision;
- exact development requirement(s) still unresolved;
- provider discovery/provisioning evidence already attempted;
- explicit authority to establish only the required managed development capability;
- instruction to prefer authoritative vendor/package-manager sources;
- instruction not to substitute project architecture;
- instruction to record exact commands/results in the runtime evidence returned to ChampCity;
- instruction to stop only on a genuine human/external boundary or demonstrable inability to provision.

This repair does not implement a general free-form chat interface. WC58's bidirectional Codex transport work remains separate. The environment-resolution action must nevertheless expose its event/final-response output so the Operator can understand what the agent attempted.

### 7. Rerun deterministic preflight after environment resolution

Completion of the environment-resolution turn is never equivalent to environment readiness.

Always rerun the application-owned preflight and require actual capability verification before normal Implementer execution becomes available.

### 8. Make failure evidence primary and understandable

Update the Implement workspace so a non-ready environment renders a visible per-capability summary without requiring the Operator to expand a disclosure.

Minimum visible information per unsatisfied requirement:

```text
capability
requested version/profile
current state
last stage reached: discovery | resolution | provisioning | elevation | refresh | verification | agent-resolution
result/reason
retry or Resolve Environment availability
```

When command execution failed, expose the relevant command summary, exit code, and concise stderr/error evidence in an immediately reachable detail surface.

For a mixed successful/failed run, visibly show successful capabilities as successful rather than collapsing the entire sequence into one generic error.

### 9. State clearly whether Codex implementation actually started

When preflight or environment resolution prevents normal implementation, show an explicit message equivalent to:

```text
Work Card implementation has not started.
Development environment preparation must complete first.
```

When an environment-resolution Codex turn is active or completed, label it as `Environment Resolution`, not as the normal Work Card Implementer run.

### 10. Remove duplicate generic error presentation

Do not render the same top-level blocked/preflight summary in multiple large error surfaces.

One primary environment status surface owns the explanation. The Codex console may reference that status but must not obscure useful model output or command evidence with a duplicate generic banner.

## Preserved Behavior

Preserve:

- WC56 project ground-zero and managed/external authority semantics;
- arbitrary Architect-authored development capability requirements;
- Approved Work Card as the authority for what may be installed;
- discover-before-change and verify-after-change semantics;
- WC57 WinGet bootstrap/repair behavior;
- WC57/REPAIR01 environment refresh ordering;
- WC57/REPAIR02/REPAIR03 elevated request/result transport and deterministic result classification;
- Windows PowerShell 5.1 compatibility and deadlock-safe elevated output capture;
- UAC/restart as narrow human-interaction boundaries;
- no normal Codex implementation before environment readiness;
- WC54 full local development authority until WC58 deliberately changes the embedded approval transport;
- WC55 selected-root MCP routing and prompt cleanup;
- no Git mutation unless explicitly authorized elsewhere.

## Authorized Surface

Expected production surface:

```text
src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/** new provider/resolution modules as narrowly required
src/shared/developmentEnvironmentContracts.ts
src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/shared/workspaceContracts.ts
src/renderer/app/WorkCardBuildingReviewWorkspace.tsx
```

Focused tests may be added/updated under:

```text
test/development-environment/
test/work-card-building/
test/work-card-planning/
test/app-shell/
```

`src/main/workCardPlanning/workCardPlanningService.ts` may be changed only if needed to preserve arbitrary requirement semantics or remove language that incorrectly implies a finite capability vocabulary. Do not add a capability allowlist to Formal Work Card validation.

Required Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md
```

## Acceptance Criteria

1. A managed requirement with no exact entry in `developmentEnvironmentCapabilityRegistry` does not become `unsupported` solely for that reason.
2. The static registry is no longer the authority for whether a managed capability may be provisioned.
3. Ordinary software package identity is resolved from the active Windows Package Manager provider rather than requiring a hard-coded ChampCity package mapping.
4. The WinGet provider can discover packages from trusted configured sources including the default `winget` community catalog and `msstore` where available.
5. The implementation can locate/use the built-in WinGet MCP server for package `find` when supported by the installed Windows Package Manager.
6. If WinGet MCP is unavailable but ordinary WinGet search is available, provider-backed discovery can continue through direct `winget search`; this path must not consult the retired static package mapping as a fallback authority.
7. Provider discovery does not install software before a package/configuration candidate has been resolved.
8. Ambiguous provider results are not guessed. They transition to recoverable environment resolution with candidate/evidence context.
9. WinGet package installation continues through the accepted WC57/REPAIR03 elevation/result-classification path.
10. A composite Windows development requirement can use WinGet Configuration/DSC without requiring a Work Card to encode a ChampCity alias.
11. A regression test using `visual-studio-2022-msvc-desktop-cpp` with profile `x64-cpp20` proves that absence from the old static registry is not an immediate blocker and that the requirement reaches composite/provider resolution.
12. A regression test using `cmake >=3.24` proves provider-backed package resolution and installation/verification without requiring `Kitware.CMake` to be maintained as Work Card knowledge.
13. A regression test using an ordinary non-Microsoft package from the WinGet community source proves the provider is not limited to Microsoft software.
14. External host requirements are not treated as installable packages merely because no specialized detector exists.
15. Common repository ecosystem evidence selects the correct native provider for npm, pnpm, Yarn, uv/Python, Cargo, Go modules, .NET/NuGet, Maven, Gradle, vcpkg, Conan, Bundler, and Composer cases.
16. Repository dependency adapters do not maintain individual project-library allowlists.
17. Missing native ecosystem tooling can feed back into system-tool provider resolution rather than immediately becoming Operator-owned manual setup.
18. A managed capability unresolved after ordinary provider attempts produces `resolution-required`, not structural `blocked`.
19. `resolution-required` keeps normal Codex implementation unavailable while exposing a usable `Resolve Environment` action.
20. `Resolve Environment` runs a bounded Codex environment-resolution turn with the exact Approved Work Card requirement and existing provider evidence.
21. The environment-resolution agent is authorized to research authoritative sources and establish the required managed capability but is not authorized to substitute project architecture.
22. Completion of an environment-resolution turn automatically reruns deterministic preflight; agent completion alone cannot mark the environment ready.
23. A repeated unresolved result remains recoverable with updated evidence unless a concrete structural/external condition has been established.
24. Permanent `blocked` is reserved for demonstrated nonrecoverable/external conditions such as incompatible host architecture, external license/account/purchase ownership, or host policy preventing the required capability.
25. A zero-result WinGet search alone is not sufficient to classify an approved managed capability as permanently unsupported.
26. A single provisioning command failure alone is not sufficient to classify the project as permanently blocked when retry/provider/agent resolution remains possible.
27. The Implement workspace visibly lists each unsatisfied capability, requested constraint/profile, last stage reached, reason, and available recovery action.
28. Successfully installed/verified capabilities remain visibly distinguishable from failed/unresolved capabilities in a mixed preflight.
29. Relevant command exit code and concise stderr/error evidence are accessible without requiring the Operator to infer the cause from a generic top-level sentence.
30. When normal Codex implementation has not started, the UI says so explicitly.
31. Environment-resolution Codex output is labeled and remains visible; generic environment errors do not obscure the event/final-response output.
32. Duplicate large generic `Development environment preflight is blocked by unsatisfied requirements` presentations are removed.
33. UAC cancellation, restart-required, transient network/provider failure, host-policy failure, ambiguous package resolution, and environment-resolution retry paths remain distinct and correctly recoverable/nonrecoverable according to their actual condition.
34. The live FO76 contract shape containing `windows-x64-host`, `cmake >=3.24`, and `visual-studio-2022-msvc-desktop-cpp / x64-cpp20` is represented in automated regression coverage and is not rejected merely because those strings are absent from a static map.
35. No production or test change constrains Formal Work Card capability IDs to a predefined ChampCity vocabulary.
36. No new local package catalog, package manifest mirror, or broad list of hard-coded Windows package IDs is introduced.
37. WC57/REPAIR03 elevation compatibility and high-output deadlock regression tests remain green.
38. WC54/WC55/WC56 behavior remains green and WC58 App Server/automatic-approval architecture is not implemented by this repair.
39. `npm run typecheck`, `npm run build`, focused provider/environment suites, app-shell tests, and the full automated suite pass through the normal Windows validation lane.

## Negative Constraints

- Do not return to `capabilityId must exist in ChampCity's static registry` semantics.
- Do not solve the defect by adding FO76's capability strings or dozens/hundreds of common tools to the existing Map.
- Do not make the Formal Work Card Architect choose from a ChampCity package/tool allowlist.
- Do not make current provisioner vocabulary dictate project architecture.
- Do not maintain a duplicate package catalog or vendor-download URL database inside ChampCity.
- Do not treat WinGet as Microsoft-software-only; use configured trusted package sources appropriately.
- Do not use arbitrary web downloads before provider-backed package/configuration resolution has been attempted.
- Do not install an ambiguous package candidate.
- Do not hand ordinary package selection/install instructions to the Operator.
- Do not convert a zero-result provider search into a permanent project block without attempting the authorized long-tail resolution path.
- Do not convert transient network/install/provider failures into permanent structural blockers.
- Do not allow the environment-resolution agent to substitute MinGW/Clang/another Visual Studio generation/another architecture merely because the Approved Work Card requirement is difficult to establish.
- Do not mark environment ready based only on installer exit or model assertion; verify effective capability.
- Do not implement a general free-form Implementer chat UI in this repair.
- Do not implement WC58's App Server approval-routing architecture in this repair.
- Do not regress REPAIR03's PowerShell-compatible elevated transport.
- Do not perform Git mutation.

## Implementer Report Requirements

The Implementer Report must include:

- all production and test files changed;
- the final provider-resolution hierarchy;
- what remains in the specialized capability registry and why;
- proof that the registry is no longer an allowlist;
- WinGet MCP discovery behavior and direct WinGet provider behavior;
- WinGet Configuration/composite provider behavior;
- common repository ecosystem provider coverage;
- the exact recoverable `resolution-required` state and transition sequence;
- environment-resolution Codex prompt/authority behavior;
- evidence that preflight reruns after environment-resolution completion;
- FO76 regression fixture results;
- non-Microsoft package resolution proof;
- UI screenshots or deterministic renderer tests showing useful per-capability failure/recovery information;
- UAC/restart/transient/provider/ambiguous/structural boundary results;
- exact focused/full validation commands and results;
- confirmation that no static package allowlist or duplicate package catalog was introduced;
- remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

Use a disposable or otherwise acceptable Windows test environment and an Approved Work Card containing at least one missing ordinary development tool and one composite/less-direct development requirement.

1. Start `Run Codex Implementer`.
2. Confirm preflight discovers existing capabilities before installing anything.
3. Confirm ordinary package discovery is provider-backed and does not depend on a ChampCity package ID stored in the Work Card.
4. Confirm an available ordinary package can be provisioned and verified.
5. Confirm UAC, if required, names the Windows permission boundary without asking the Operator to select technical components.
6. Confirm a valid managed requirement not represented by a static ChampCity adapter reaches provider resolution instead of immediate `unsupported`.
7. Force or select a requirement that ordinary provider resolution cannot resolve and confirm the workspace enters `resolution-required`, remains recoverable, and offers `Resolve Environment` rather than dead-ending the project.
8. Run `Resolve Environment` and confirm the agent's environment-resolution output is visible and clearly distinguished from normal Work Card implementation.
9. Confirm deterministic preflight automatically reruns after environment resolution.
10. Confirm normal Work Card implementation begins only after all required managed capabilities are verified.
11. Confirm the workspace clearly identifies which capabilities succeeded, which did not, why, and what recovery action is available without repeated generic error banners obscuring the console.
12. Re-run the current FO76 host-readiness contract and confirm its semantic capability names are not rejected merely because they are not static registry keys.
