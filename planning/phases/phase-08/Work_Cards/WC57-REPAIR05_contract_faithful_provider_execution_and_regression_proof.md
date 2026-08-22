<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR05",
    "repairId": "WC57-REPAIR05",
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
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR04_provider_backed_development_environment_resolution_and_observable_recovery.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Contract-Faithful Provider Execution and Regression Proof",
    "status": "approved_for_implementation",
    "executionMode": "one bounded correction of WC57-REPAIR04 provider mechanics and contract-faithful tests",
    "parentWorkCardId": "WC57",
    "confirmedDefect": "WC57-REPAIR04 established useful recovery/UI scaffolding but did not implement several external provider contracts faithfully. Production invokes a nonexistent winget mcp find CLI shape, the exact FO76 contract still blocks on windows-x64-host, direct WinGet search mixes version/profile syntax into substring queries, generic verification assumes capabilityId equals executable name, the Environment Resolution prompt omits the exact unresolved evidence required by REPAIR04, and several tests mask or explicitly assert these defects.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR05_contract_faithful_provider_execution_and_regression_proof.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Preserve the accepted REPAIR04 state/UI/recovery architecture. Correct only the provider execution boundaries, host detection, verification, Environment Resolution evidence handoff, ecosystem adapter accuracy, and tests. External provider behavior must be proven against the provider's documented contract; synthetic fixtures may not invent behavior that production does not have.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR05 — Contract-Faithful Provider Execution and Regression Proof

Status: Approved for Implementer execution  
Parent: `WC57`  
Depends on: `WC57-REPAIR04` Architect review  
Git mutation: prohibited

## Purpose

Correct the provider mechanics rejected in the REPAIR04 Architect review without reopening the accepted architecture.

Preserve unchanged unless directly required by this repair:

- `resolution-required` and `Resolve Environment`;
- deterministic preflight rerun after Environment Resolution;
- REPAIR04 per-capability UI and separate Environment Resolution output;
- REPAIR03 elevation/result transport and environment refresh;
- semantic Visual Studio/MSVC composite adapter;
- arbitrary Work Card capability IDs;
- registry as optional probes/composite verification, not package authority;
- WC54 execution policy and WC58 separation.

Governing implementation rule:

```text
external provider contract
→ production integration follows the documented provider contract
→ automated proof exercises that same contract
```

A permissive mock, invented CLI shape, or test that asserts the known failure is not acceptance evidence.

## Required Corrections

### 1. Implement the WinGet MCP path as actual stdio MCP

Replace the current fictitious:

```text
winget mcp --help
winget mcp find <query>
```

behavior.

Required behavior:

1. use Microsoft-supported `winget mcp` discovery to obtain the configured path to `WindowsPackageManagerMCPServer.exe`;
2. when available, start that executable as an stdio MCP server through the official MCP TypeScript client or equivalent existing official client package;
3. initialize the MCP connection, discover/use the server's advertised package `find` tool, and normalize returned package candidates;
4. close the owned client/process deterministically;
5. if MCP discovery, connection, tool discovery, or `find` fails, continue through direct `winget search` provider discovery;
6. do not implement a second package catalog and do not invent another WinGet MCP CLI syntax.

Adding the official MCP client dependency is authorized if the repository does not already contain one.

### 2. Make direct WinGet search obey WinGet search semantics

For direct CLI discovery:

- search using package/capability identity terms only;
- do not append `>=...`, exact version expressions, or profile labels to the literal `winget search --query` substring unless the text is intentionally part of package identity;
- evaluate the Work Card version constraint separately against provider candidate version metadata;
- evaluate profile/architecture compatibility separately when provider metadata or a specialized verifier supplies it;
- install only the unambiguous selected package by exact provider ID/source;
- preserve existing ambiguity handling and `resolution-required` behavior.

For the live requirement:

```text
cmake >=3.24
```

direct WinGet discovery must search for CMake/package identity, then determine whether the resolved candidate can satisfy `>=3.24`.

### 3. Detect `windows-x64-host` as a host fact

Add a non-provisioning detector for the existing FO76 external host requirement:

```text
windows-x64-host / development-host / external
```

Required behavior:

- `process.platform === "win32"` and `process.arch === "x64"` satisfies the requirement without package installation;
- incompatible OS or architecture produces the genuine structural/external blocker;
- absence from the specialized package registry is irrelevant;
- do not add `windows-x64-host` as an installable package or static package mapping.

### 4. Verify provider-resolved packages by provider identity when no semantic probe exists

Preserve specialized executable/composite probes when they are known and correct.

For an ordinary provider-resolved package without a trusted semantic probe:

- verify installation using the exact provider-resolved package identity/version from Windows Package Manager inventory/state;
- evaluate the Work Card version constraint against the verified installed provider version;
- do not assume `capabilityId` is the executable filename;
- do not mark composite/profile requirements ready solely because one package is installed.

### 5. Send the actual unresolved evidence to Environment Resolution

`buildCodexEnvironmentResolutionPrompt(...)` must use the current execution context and preflight result.

Include, in bounded/sanitized form:

- exact Approved Work Card path and revision;
- each unresolved managed `capabilityId`, version constraint, and profile;
- provider attempts and candidate identities already observed;
- relevant command summaries, exit codes, and concise stderr/error evidence;
- the existing authority/negative constraints from REPAIR04.

Use existing output truncation/redaction primitives where appropriate. Do not omit authorized technical evidence merely because an external implementation harness objects to transmitting it to the embedded Codex resolver.

If a mandatory acceptance criterion cannot be implemented, report the Work Card as incomplete/blocked. Do not relabel a missing mandatory requirement as a residual limitation and recommend another repair.

### 6. Correct the repository ecosystem adapter only where REPAIR04 is wrong

Keep the adapter small. Correct these concrete behaviors:

- Maven: prefer `mvnw`/`mvnw.cmd` only when present; otherwise use `mvn`.
- Gradle: prefer `gradlew`/`gradlew.bat` only when present; otherwise use `gradle`.
- Python requirements: the restore command must reference the requirements file actually detected.
- `pyproject.toml` alone must not establish `uv` ownership; `uv.lock` or other explicit uv evidence may do so.
- when dependency restoration is actually required and its ecosystem machine tool is missing, feed that tool requirement into the same system-tool provider-resolution path rather than handing setup to the Operator.
- do not install project libraries merely because a manifest exists.

Do not add more ecosystems in this repair.

### 7. Correct the minor REPAIR04 status-stage accuracy defect

When provisioning completes and post-provision verification actually runs, the visible last stage must be `verification`, not the prior provider `provisioning` stage.

No UI redesign is authorized.

## Required Regression Proof

The focused tests must prove the external contracts rather than mirror production assumptions.

1. **WinGet MCP protocol proof** — use a protocol-faithful fake stdio MCP server or injected official MCP transport and prove connection/tool discovery/package-find behavior. Assert production never executes `winget mcp find ...`.
2. **Direct WinGet query proof** — for `cmake >=3.24`, assert the direct search query does not contain `>=3.24`; separately prove candidate-version evaluation and successful exact package installation/verification.
3. **FO76 full-contract proof** — on simulated `win32/x64`, with CMake and the VS2022/MSVC composite requirement successfully provisioned/verified, the exact three-requirement FO76 contract must finish `ready`, not `blocked`.
4. **FO76 incompatible-host proof** — the same host requirement must structurally block on incompatible OS/architecture.
5. **Unknown package verification proof** — use a semantic capability whose resolved package ID and executable name differ; prove readiness through exact provider-installed identity/version rather than `<capabilityId> --version`.
6. **Environment Resolution payload proof** — assert the prompt contains the exact Work Card path/revision, unresolved requirement identity/constraint/profile, provider attempt/candidate evidence, and relevant failed command evidence.
7. **Ecosystem accuracy proof** — cover Maven/Gradle wrapper present and absent cases, detected requirements filename, and `pyproject.toml` without uv-specific evidence.
8. Preserve and rerun the existing UAC/restart/host-policy/ambiguous/zero-result/retry tests and REPAIR03 elevated transport suite.
9. `npm run typecheck`, `npm run build`, focused suites, and full `npm test` must pass through the normal Windows validation lane.

A fixture may simplify an external provider only at the transport boundary. It must not return success for a request that the documented real provider would interpret differently.

## Acceptance Criteria

1. No production path invokes `winget mcp find` or treats `winget mcp` as the package-find tool.
2. WinGet MCP package discovery uses the actual stdio MCP server when available.
3. MCP unavailability/failure falls back to direct provider-backed WinGet search without static package mappings.
4. Direct WinGet search separates package identity from Work Card version/profile constraints.
5. `cmake >=3.24` is resolved, version-checked, installed if required, and verified without hard-coded Work Card package identity.
6. `windows-x64-host / development-host / external` is satisfied on an actual Windows x64 host and structurally rejected only on incompatible hosts.
7. Unknown ordinary provider-resolved packages can be verified without assuming the semantic capability ID is an executable name.
8. The existing Visual Studio 2022/MSVC `x64-cpp20` composite requirement remains semantically verified.
9. The exact FO76 three-requirement regression fixture reaches `ready` when all three requirements are satisfied.
10. Environment Resolution receives the exact unresolved requirement/provider/command evidence required by REPAIR04.
11. Environment Resolution completion still reruns deterministic preflight before normal implementation becomes available.
12. Maven, Gradle, Python requirements, and uv-selection defects identified in the REPAIR04 review are corrected without expanding ecosystem scope.
13. Missing required ecosystem tooling can re-enter system-tool provider resolution when dependency restoration is required.
14. Per-capability UI/recovery behavior from REPAIR04 remains intact, with post-provision verification shown as the final stage when applicable.
15. No static package allowlist, duplicate package catalog, or Formal Work Card capability vocabulary is introduced.
16. No mandatory criterion is reported as passed when the implementation or test did not exercise that criterion.
17. REPAIR03 elevation tests and the full automated suite remain green.
18. WC58/App Server/free-form Implementer work is not introduced.

## Negative Constraints

- Do not reopen WC56 ground-zero semantics.
- Do not replace `resolution-required` or redesign the Implement workspace.
- Do not add FO76 capability strings to a package allowlist.
- Do not create a broad tool/package registry.
- Do not invent external provider commands or protocols.
- Do not make permissive mocks stand in for documented provider semantics.
- Do not change the approved project architecture to make provisioning easier.
- Do not perform Git mutation.

## Implementer Report

Required path:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR05_contract_faithful_provider_execution_and_regression_proof.md
```

The report must map every acceptance criterion to concrete production/test evidence, state any criterion not actually exercised as incomplete, and end with:

```text
Document.Status=Pending
```

## Operator Validation After Architect Approval

Only after REPAIR05 passes Architect code review:

1. rerun the live FO76 WC01 host-readiness flow;
2. confirm the Windows x64 host requirement satisfies rather than blocks;
3. confirm CMake provider resolution/verification works against the real installed WinGet version;
4. confirm the VS2022/MSVC composite requirement provisions/verifies or enters a precise recoverable state;
5. if ordinary provider resolution cannot resolve a requirement, confirm `Resolve Environment` receives and visibly uses the actual failure evidence instead of dead-ending the project.
