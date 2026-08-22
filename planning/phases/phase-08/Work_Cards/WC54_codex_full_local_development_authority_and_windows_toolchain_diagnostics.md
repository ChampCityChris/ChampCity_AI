<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC54"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC52_codex_implementer_execution_policy_boundary_and_workspace_write_enablement.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC53_codex_implementer_per_run_network_access_control.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC53_codex_implementer_per_run_network_access_control.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Codex Full Local Development Authority and Windows Toolchain Diagnostics",
    "status": "approved_for_implementation",
    "executionMode": "concise bounded Codex runtime hardening Work Card",
    "confirmedDefect": "The embedded Codex runtime can now write the selected repository and use network access, but live ChampCity_PDL implementation still receives EPERM for ordinary Node child-process execution and cannot use the normal user-level npm cache. This prevents normal development validation such as npm test and forces sandbox-specific workarounds.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "ChampCity is built for non-technical Operators. AI execution must have a normal usable local development environment rather than requiring the Operator to understand sandbox, network, cache, subprocess, or tool-specific permission decisions. Preserve the WC52 policy seam but change the current Codex execution profile accordingly.",
    "reviewedAt": "2026-08-19"
  }
}
CHAMPCITY-METADATA -->

# WC54 — Codex Full Local Development Authority and Windows Toolchain Diagnostics

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: concise bounded Codex runtime hardening  
Git mutation: prohibited

## Confirmed Defect

Live `ChampCity_PDL` Work Card 01 proved that WC52/WC53 fixed repository writes and dependency-network access, but the runtime is still not equivalent to a normal local development environment.

Observed evidence from `champcity_pdl`:

```text
planning/phases/phase-01/Implementer_Reports/
IMPLEMENTER_REPORT_phase-01-wc-01_establish_project_and_cli_foundation.md
```

The run successfully created the project, generated the lockfile with a repository-local npm cache, installed dependencies, and built TypeScript. It still reported:

```text
npm install --package-lock-only
→ EPERM writing normal user-level npm cache

npm test / node --test
→ spawn EPERM

Node child_process.spawnSync(...)
→ EPERM
```

PowerShell could launch the compiled CLI, demonstrating that the project executable itself was usable while Node-created child processes inside the Codex execution environment were restricted.

## Architectural Decision

Do not assign different local technical capabilities to Architect, Implementer, Validator, or other AI roles as a governance mechanism.

The approved workflow artifact controls what the AI is authorized to do. The local execution environment must allow the AI to install, use, execute, modify, and remove development tools and dependencies required to complete that authorized work.

This card changes only the currently implemented local Codex execution path. It does not add future Architect/Validator execution integrations.

## Objective

Preserve the WC52 execution-policy seam, but make the current embedded Codex execution profile behave like a normal unrestricted local development session:

```text
sandboxMode = danger-full-access
approvalPolicy = never
networkAccessEnabled = true
```

The Operator must not need to understand or select sandbox, approval, network, npm-cache, subprocess, or similar development-environment permissions for an ordinary run.

## Required Changes

1. Change the application-owned default Codex execution policy to:

```text
sandboxMode = danger-full-access
approvalPolicy = never
networkAccessEnabled = true
```

2. Keep the WC52 execution-policy resolver/seam. Do not hard-code policy literals inside the execution loop.

3. Remove the WC52 type restriction that excludes `danger-full-access`.

4. Remove the WC53 per-run network option from the normal production path:
   - remove the `Allow network for this Codex run` control;
   - remove renderer-supplied network configuration;
   - remove the dedicated network start-option/validation path when no longer required;
   - do not persist or replace it with another permission selector.

5. Keep existing project-root, Work Card, Implementer Report, authentication, streaming, retry, cancellation, and report-refresh authority unchanged.

6. Add focused automated tests proving the actual SDK thread receives `danger-full-access`, `never`, and network enabled by default, with no renderer permission input required.

## Local Windows Toolchain Diagnostic Lane

The implementation/review evidence must include a diagnostic lane sufficient to distinguish a broken local Node/npm/PATH installation from Codex runtime restrictions.

Run and record summarized results for:

```text
where.exe node
where.exe npm
where.exe npx
Get-Command node
Get-Command npm
Get-Command npx
node --version
npm --version
node -p "process.execPath"
npm config get cache
npm config get prefix
npm config get userconfig
npm cache verify
```

Inspect Process, User, and Machine PATH resolution sufficiently to determine whether Node/npm locations are missing, duplicated, conflicting, or unavailable to the ChampCity/Codex process. Do not copy the complete PATH or unnecessary absolute local-machine paths into the repository report; summarize the finding.

Also run this class of direct Node subprocess probe using the current Node executable:

```text
parent node process
→ child_process.spawnSync(process.execPath, ["-e", "process.exit(0)"])
→ child exits 0 with no EPERM
```

If that probe fails, report the exact error code and whether the failure occurred before or after the WC54 policy change. Do not substitute PowerShell process launching as proof that Node child-process execution works.

`npm doctor` may be run as supplementary evidence. Its advisory version/update findings are not acceptance failures unless they identify an actual local configuration or permission defect relevant to the run.

## Preserved Behavior

Do not change:

- selected project/repository authority;
- Approved Work Card as implementation contract;
- existing Pending Implementer Report as durable completion evidence;
- local Codex authentication;
- Codex execution streaming, cancellation, retry, and terminal evidence;
- Build / Implementer Report Review workspace split;
- Git mutation authority from the Work Card;
- credential handling.

## Authorized Surface

Expected production changes are limited to:

```text
src/main/workCardBuilding/codexImplementerExecutionPolicy.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
existing Work Card Build / Codex renderer surface
focused Codex execution / IPC / renderer tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md
```

No unrelated workflow or UI redesign.

## Acceptance Criteria

1. A normal embedded Codex execution starts with `sandboxMode=danger-full-access`.
2. A normal embedded Codex execution starts with `approvalPolicy=never`.
3. A normal embedded Codex execution starts with network access enabled without Operator configuration.
4. The WC52 policy seam remains the source of these values; execution-loop architecture is not bypassed.
5. The WC53 per-run network checkbox/configuration path is removed from normal production use.
6. No sandbox, approval, or network permission decision is required from the Operator for an ordinary AI execution run.
7. Focused tests capture the actual `startThread(...)` options and prove the default full-development profile.
8. Existing Codex execution, retry, cancellation, report-refresh, and review behavior remains green.
9. `npm run typecheck`, `npm run build`, and `npm test` pass for ChampCity A/I using the normal required validation lanes.
10. The Implementer Report contains the Local Windows Toolchain Diagnostic Lane results and clearly states whether Node/npm/PATH appears correctly installed and resolved.

## Negative Constraints

- No role-specific sandbox policy matrix.
- No approval UI or approval broker in this card.
- No sandbox selector.
- No network selector.
- No persistent permission settings UI.
- No prompt-based permission workaround.
- No npm-cache workaround treated as the permanent product solution.
- No PowerShell process-launch workaround treated as proof that Node subprocess execution is healthy.
- No unrelated cleanup or refactor.
- No Git mutation.

Keep the implementation and Implementer Report concise.

## Implementer Report Requirements

Report only:

- files changed;
- exact effective Codex policy;
- WC53 network-control removal;
- focused SDK-option regression evidence;
- Local Windows Toolchain Diagnostic Lane results;
- whether Node/npm/PATH appears healthy, ambiguous, or defective;
- typecheck/build/test results;
- remaining live Operator validation.

End with `Document.Status=Pending`.

## Manual Validation — ChampCity_PDL

After rebuilding/restarting ChampCity A/I, rerun `ChampCity_PDL` Work Card 01 through the embedded Codex execution path.

Before relying on project validation, confirm the run can execute the diagnostic lane above without `EPERM` from the direct Node child-process probe.

Then run the project using its ordinary commands only:

```text
npm install --package-lock-only
npm ci
npm run build
npm test
```

For this validation:

- do not redirect npm to a repository-local cache;
- do not use `--test-isolation=none` as a substitute for normal `npm test`;
- do not use PowerShell `ProcessStartInfo` as a replacement for Node child-process tests.

Expected result: normal npm cache access, normal dependency installation, normal Node subprocess creation, build success, and the project's unmodified `npm test` completes successfully.

If the direct Node subprocess probe or ordinary npm commands still fail under `danger-full-access`, classify the failure as likely host/toolchain configuration or a deeper Codex/SDK runtime defect and preserve the exact diagnostic evidence for the next RCA. Do not silently add another workaround.
