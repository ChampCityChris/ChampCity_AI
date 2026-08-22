<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC57-REPAIR04 — Provider-Backed Development Environment Resolution and Observable Recovery",
    "disposition": "revision_requested",
    "parentWorkCardId": "WC57",
    "repairId": "WC57-REPAIR04",
    "repairRequired": true,
    "nextRepairId": "WC57-REPAIR05",
    "operatorValidationRequired": false,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "REPAIR04 establishes useful recoverable-state and UI foundations, but its provider implementation does not satisfy the approved contract. The WinGet MCP path invokes a nonexistent winget mcp find CLI shape rather than the stdio MCP server; the exact FO76 host contract is still deliberately asserted blocked because windows-x64-host has no external host detector; direct WinGet search embeds profile/version syntax into a literal substring query and is masked by permissive test fixtures; and the environment-resolution prompt omits the exact unresolved requirements/provider evidence required by the Work Card. Additional provider-verification and ecosystem-adapter gaps also remain. Repair through WC57-REPAIR05 before Operator validation.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57-REPAIR04

## Disposition

**Revision requested.**

`WC57-REPAIR04` is not ready for Operator validation. The implementation contains useful accepted work that must be preserved, but the provider-resolution core does not yet satisfy the Approved Repair Work Card and the exact FO76 regression remains reproducibly blocked in automated coverage.

The next bounded repair is `WC57-REPAIR05`.

## Sources Reviewed

- `planning/phases/phase-08/Work_Cards/WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md` revision 1
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md` revision 1
- `src/main/developmentEnvironment/windowsPackageProviderResolver.ts`
- `src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts`
- `src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts`
- `src/main/developmentEnvironment/repositoryEcosystemProvider.ts`
- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `test/development-environment/windows-development-environment-provisioner.test.cjs`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- Implementer-reported focused and full validation results

Current Microsoft provider behavior was checked against:

```text
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-setup
https://learn.microsoft.com/windows/package-manager/winget/mcp-server-usage
https://learn.microsoft.com/windows/package-manager/winget/search
https://learn.microsoft.com/windows/package-manager/winget/install
https://github.com/modelcontextprotocol/typescript-sdk/tree/main/packages/client
```

## Accepted REPAIR04 Work

The following changes are directionally correct and are not to be rewritten in the next repair:

1. `resolution-required` exists as a distinct recoverable preflight state.
2. Missing managed capability IDs no longer become `unsupported` solely because they are absent from the specialized registry.
3. Ordinary WinGet package IDs were removed from `developmentEnvironmentCapabilityRegistry`; the registry is now primarily semantic probes/composite verification rather than a package catalog.
4. The semantic Visual Studio adapter recognizes `visual-studio-2022-msvc-desktop-cpp / x64-cpp20` without requiring the Work Card to use the `msvc-x64 / desktop-cpp` alias.
5. `Resolve Environment` is a distinct execution action and normal Work Card implementation remains unavailable until deterministic preflight returns `ready | not-required`.
6. Environment-resolution completion reruns deterministic preflight instead of trusting the model's assertion of readiness.
7. The Implement workspace now exposes per-capability state, requested version/profile, stage/recovery information, blocker/interaction detail, and command evidence.
8. The workspace explicitly states when Work Card implementation has not started and labels environment-resolution output separately.
9. Duplicate generic preflight error presentation is materially reduced.
10. REPAIR03 elevation transport, environment refresh ordering, UAC/restart distinctions, WC54 execution policy, and WC58 separation remain preserved.

These are useful foundations. REPAIR05 must correct the provider mechanics around them rather than replace them.

## Blocking Findings

### 1. The purported WinGet MCP path is not an MCP client

Production `WindowsPackageProviderResolver.resolvePackage(...)` currently performs:

```text
winget mcp --help
winget mcp find <query>
```

That is not how the Microsoft WinGet MCP Server is invoked.

Microsoft documents `winget mcp` as a discovery/setup command that emits the configuration fragment containing the path to `WindowsPackageManagerMCPServer.exe`. The server itself exposes its `find` and `install` tools through MCP over stdio. There is no documented `winget mcp find` CLI subcommand that calls the MCP `find` tool.

Therefore the production `winget-mcp` resolution path cannot satisfy AC5. At best it fails and falls through to direct WinGet search; the Implementer Report overstates the MCP implementation.

Required correction: discover the server executable through the Microsoft-supported `winget mcp` mechanism and invoke its advertised package-find tool through a real stdio MCP client. Use the official MCP TypeScript client rather than creating a parallel protocol implementation.

### 2. The exact FO76 contract is still structurally blocked on a valid Windows x64 host

The live FO76 contract contains:

```text
windows-x64-host / development-host / external
cmake >=3.24 / managed
visual-studio-2022-msvc-desktop-cpp / x64-cpp20 / managed
```

Production preflight currently executes:

```ts
if (requirement.provisioning === "external" && !entry) {
  requirementResults.push(externalBlockedRequirement(requirement));
  continue;
}
```

`windows-x64-host` has no specialized registry entry, so the requirement is blocked without evaluating the actual selected host architecture.

The regression test named `FO76 host-readiness shape reaches provider and composite resolution without static aliases` explicitly asserts:

```text
result.state = blocked
windows-x64-host blockerKind = external
```

That test codifies the original dead-end instead of closing it.

This violates the repair's stated runtime sequence and AC34. An external requirement is not automatically missing merely because ChampCity does not provision it. The host condition must be detected.

Required correction: add a non-provisioning host detector for the exact Windows/x64 platform requirement. On `win32 + x64`, satisfy it without installation. On an incompatible host, produce the genuine structural/external block. Keep this out of the package registry.

### 3. Direct WinGet search mixes semantic version/profile constraints into a literal substring query

Current `providerQueryForRequirement(...)` concatenates:

```text
capabilityId + profile + versionConstraint
```

and passes the result directly to:

```text
winget search --query <combined value>
```

For the live CMake requirement that produces a query equivalent to:

```text
cmake >=3.24
```

Microsoft documents `winget search --query` as a case-insensitive substring search across package identity fields. It is not a version-expression evaluator. Version is a separate package/install concern.

The test fixture masks this production defect because its fake provider returns `Kitware.CMake` whenever the query merely starts with `cmake`, regardless of the extra `>=3.24` text.

This means AC12's automated proof does not establish that the production query can resolve CMake.

Required correction: provider discovery must search using package intent/capability terms, then evaluate requested version/profile separately against provider candidate metadata. Do not put `>=`, exact version expressions, or profile labels into the direct WinGet substring query unless they are intentionally part of a natural-language MCP request.

### 4. Environment Resolution does not receive the exact unresolved environment evidence

`buildCodexEnvironmentResolutionPrompt(...)` accepts `_context` but does not use it.

The generated prompt omits the Approved Repair Work Card's explicitly required information:

- exact Work Card path and revision;
- exact unresolved managed requirement(s);
- provider attempts and candidates;
- relevant command/exit/error evidence.

The Implementer Report acknowledges this deviation and attributes it to a tool safety rejection. That does not satisfy the Approved Work Card. The Work Card itself authorizes the bounded environment-resolution handoff.

The focused test only checks that the prompt contains the phrases `Environment Resolution` and `not normal Work Card implementation`; it does not prove AC20.

Required correction: build the prompt from the current execution context and cached preflight result, including bounded/truncated unresolved requirement and provider evidence. Preserve existing secret/output truncation behavior; do not omit authorized technical evidence.

### 5. Generic post-install verification assumes semantic capability ID equals executable name

For an unknown managed capability, `genericProbeEntry(...)` derives:

```text
command = executableFromCapabilityId(capabilityId)
args = --version
```

Provider-backed discovery can correctly resolve a package whose installed executable does not equal the semantic Work Card capability ID. In that case installation can succeed but deterministic verification still probes a nonexistent executable and returns unresolved.

That means the long-tail provider path is not generally capable of verifying the package it just resolved.

Required correction: preserve specialized semantic probes where known; otherwise, after resolving an ordinary WinGet package, verify the exact provider-resolved package identity/version through WinGet package state rather than assuming executable name equivalence. Composite/profile requirements must continue to use semantic verification and must not be declared ready merely because one package is installed.

### 6. Repository ecosystem support is currently descriptive, not an executable provider handoff

`repositoryEcosystemProvider.ts` successfully recognizes the requested ecosystem files, but the provisioner only records the detector result as provider evidence. Missing ecosystem tooling is not actually fed into the same system-tool provider resolution path as AC17 requires.

There are also concrete command-selection defects:

- Maven detection can return `mvnw` even when no wrapper exists instead of falling back to `mvn`.
- Gradle detection can return `gradlew` even when no wrapper exists instead of falling back to `gradle`.
- Python requirements can detect `requirements-dev.txt` while the restore command remains hard-coded to `requirements.txt`.
- generic `pyproject.toml` alone is treated as evidence that `uv` owns the project even though `pyproject.toml` is shared by multiple Python tooling ecosystems.

Required correction: make provider selection accurate and feed only the missing ecosystem machine tool into system-tool resolution when dependency restoration is actually required. Do not install project libraries merely because a manifest exists.

## Test-Suite Defects

The reported `387/387` passing result is not sufficient acceptance evidence because several fixtures assert or mask the defective behavior:

1. The exact FO76 fixture expects top-level `blocked`.
2. The fake WinGet provider accepts version-bearing substring queries by `startsWith(...)` rather than exercising real search semantics.
3. No test launches a fake stdio MCP server and proves an actual MCP package-find call.
4. The environment-resolution test does not verify the exact unresolved requirement/provider evidence payload.
5. Unknown package verification is not tested where package identity and executable/capability name differ.
6. Ecosystem wrapper/no-wrapper and matched requirements-file behavior are not proven.

REPAIR05 must correct the tests so they reproduce the actual provider contracts rather than only the current implementation shape.

## Nonblocking UI Note

`stageForRequirement(...)` prefers the latest provider-attempt stage before considering final verification. A successfully provisioned and reverified requirement can therefore still render `last stage: provisioning`. REPAIR05 should make the visible stage reflect verification when a post-provision verification has actually occurred. This is a small accuracy fix and must not trigger a UI redesign.

## Final Architect Decision

`WC57-REPAIR04` is **RevisionRequested**.

The accepted recovery/UI/state work remains valid. The next repair is limited to making the already-selected provider architecture real and executable:

```text
real WinGet MCP stdio discovery
+ correct direct WinGet query/version separation
+ real external host detection
+ provider-backed post-install verification
+ exact evidence-carrying environment-resolution prompt
+ accurate ecosystem-provider handoff
+ corrected regression tests
```

Do not reopen WC56 ground-zero semantics, the REPAIR03 elevation transport, the `resolution-required` state model, the Implement workspace layout, or WC58.
