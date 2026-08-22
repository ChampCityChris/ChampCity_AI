<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC54"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "work-card-implementation",
    "workCardId": "WC54",
    "intendedCommitMessage": "WC54 codex full local development authority and windows toolchain diagnostics",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# IMPLEMENTER REPORT WC54 - Codex Full Local Development Authority and Windows Toolchain Diagnostics

Report type: numbered Work Card implementation  
Repository path inspected: verified approved repo root  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow` tracking `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Commit created: No, Git mutation prohibited by WC54  
Commit hash: none

## Files Changed

- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- `src/renderer/styles.css`
- `test/work-card-building/codex-implementer-execution-service.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`
- `test/renderer/work-card-building-review-workspace.test.cjs`
- `test/renderer/figma-redesign-shell.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md`

Some touched files already contained unrelated pre-existing dirty changes. Those changes were preserved and not broadened for WC54.

## Implementation Summary

- Preserved the WC52 policy resolver seam and changed the application-owned default Codex Implementer policy to `sandboxMode=danger-full-access`, `approvalPolicy=never`, and `networkAccessEnabled=true`.
- Removed the WC52 type restriction that excluded `danger-full-access`.
- Removed the WC53 per-run network start option from production IPC, preload, shared contracts, and the Implement renderer.
- Removed the `Allow network for this Codex run` UI control and its renderer state.
- Kept selected project, Work Card, Implementer Report, authentication, streaming, retry, cancellation, and report refresh behavior unchanged.

## Effective Codex Policy

- `sandboxMode = danger-full-access`
- `approvalPolicy = never`
- `networkAccessEnabled = true`

Focused SDK-option regression evidence:

- `test/work-card-building/codex-implementer-execution-service.test.cjs` captures the actual `sdk.startThread(...)` options and asserts all three effective values.
- The injectable policy seam test asserts the resolver is called with zero renderer-supplied arguments.
- `test/repository/runtime-wiring-source.test.cjs` asserts the main/preload/shared contract no longer exposes renderer permission options.
- `test/renderer/work-card-building-review-workspace.test.cjs` asserts the UI no longer renders the WC53 network checkbox and the app calls `startCodexImplementerExecution()` with no options.

## Local Windows Toolchain Diagnostic Lane

Commands run and summarized results:

- `where.exe node` - passed; one machine-level Node executable resolved.
- `where.exe npm` - passed; machine-level npm shim and command script resolved.
- `where.exe npx` - passed; machine-level npx shim and command script resolved.
- `Get-Command node` - passed; PowerShell resolves Node to the machine-level Node executable.
- `Get-Command npm` - passed; PowerShell resolves npm to the machine-level npm script shim.
- `Get-Command npx` - passed; PowerShell resolves npx to the machine-level npx script shim.
- `node --version` - passed; Node reported `v24.18.1`.
- `npm --version` - passed; npm reported `11.16.0`.
- `node -p "process.execPath"` - passed; Node reported the same machine-level Node executable.
- `npm config get cache` - passed; npm cache resolves to the normal user-level npm cache.
- `npm config get prefix` - passed; npm prefix resolves to the normal user-level npm prefix.
- `npm config get userconfig` - passed; npm userconfig resolves to the normal user-level npm config file.
- Process, User, and Machine PATH inspection - passed; each scope contains Node/npm-related entries, and the process PATH has no missing Node/npm resolution. The summarized counts showed no obvious missing or unavailable Node/npm location.
- `npm cache verify` - failed with `EPERM` while opening an npm cache index file under the normal user-level npm cache.
- Direct Node subprocess probe after the WC54 policy source change - failed before child execution with `EPERM`, `errno=-4048`, syscall `spawnSync <NODE_EXECUTABLE>`, path `<NODE_EXECUTABLE>`, spawn args `["-e","process.exit(0)"]`.

Node/npm/PATH classification: ambiguous. Command discovery, versions, prefix, cache path, userconfig, and PATH resolution look coherent, but the current Codex execution environment still blocks direct Node child-process creation and user-level npm cache verification with `EPERM`. That remaining failure may indicate host cache permissions, file locking/security software, or a deeper Codex runtime restriction outside this source change. It is not resolved by PowerShell process-launch evidence and requires the WC54 Operator validation lane after rebuilding/restarting ChampCity A/I.

## Validation Performed

- `pwd` - passed; verified approved repo root.
- `git status --short --branch` - passed; confirmed current branch and pre-existing dirty worktree.
- `Get-Content` for repository boundary, validation lane, WC54, adjacent WC53 report, and affected source/test files - passed.
- `rg` searches for WC53 network-control remnants - passed; no production remnants of the renderer-supplied network option remained.
- `npm run typecheck` - passed in the current Codex lane.
- `npm run build` - failed in the sandbox lane with `TS5033 EPERM` writing compiled `dist/` files; per `docs/dev/VALIDATION_COMMAND_LANES.md`, this was not treated as source failure.
- `npm run build` - passed in the normal Windows lane.
- `npm test` - failed in the sandbox lane with the same `TS5033 EPERM` while rerunning build; per validation lane rules, this was not treated as source failure.
- `npm test` - passed in the normal Windows lane; 328 tests passed, 0 failed.

## Validation Skipped

- Operator manual validation using `ChampCity_PDL` Work Card 01 was not performed by the Implementer.
- Electron launch smoke was not performed; WC54 requires the Operator to rebuild/restart ChampCity A/I and rerun the live embedded Codex path.
- `npm doctor` was not run; the required diagnostic lane already identified the relevant unresolved EPERM class.

## Git Actions

- Staging: not performed.
- Commit: not performed.
- Push: not performed.
- Reason: WC54 explicitly prohibits Git mutation.

## Security And Secret-Safety Notes

- No secrets, tokens, credentials, API keys, `.env` contents, or concrete local machine paths were added.
- Renderer filesystem access was not broadened.
- No sandbox, approval, network, npm-cache, or persistent permission selector was added.
- The effective policy intentionally grants full local development authority for normal embedded Codex Implementer runs as required by WC54.

## Manual Validation Required

After rebuilding/restarting ChampCity A/I, rerun `ChampCity_PDL` Work Card 01 through the embedded Codex execution path.

Before relying on project validation, confirm the embedded run can execute the direct Node subprocess probe without `EPERM`. Then run the project using ordinary commands only:

- `npm install --package-lock-only`
- `npm ci`
- `npm run build`
- `npm test`

Do not redirect npm to a repository-local cache, do not use `--test-isolation=none`, and do not use PowerShell process launching as a substitute for Node child-process tests.

## Residual Risks

- The current Codex terminal environment still reports `EPERM` for direct Node child-process creation and user-level npm cache verification after the source change.
- The live embedded runtime must be rebuilt/restarted before confirming the new SDK policy changes affect actual embedded Codex runs.
- The worktree contains pre-existing unrelated modifications and untracked planning artifacts that were not part of this WC54 pass.

## Recommended Next Implementer Task

Run the WC54 Operator validation lane against `ChampCity_PDL` after rebuilding/restarting ChampCity A/I, preserving exact diagnostic evidence if Node subprocess or normal npm commands still fail.

Document.Status=Pending
