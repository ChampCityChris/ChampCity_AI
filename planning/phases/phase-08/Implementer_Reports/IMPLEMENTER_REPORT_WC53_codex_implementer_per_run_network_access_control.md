<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "implementer-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC53"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC53_codex_implementer_per_run_network_access_control.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reportKind": "work-card-implementation",
    "workCardId": "WC53",
    "intendedCommitMessage": "WC53 codex implementer per-run network access control",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# IMPLEMENTER REPORT WC53 - Codex Implementer Per-Run Network Access Control

Report type: numbered Work Card implementation  
Repository path inspected: verified approved repo root  
Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow` tracking `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Commit created: No, Git mutation prohibited by WC53  
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
- `test/renderer/work-card-building-review-workspace.test.cjs`
- `test/renderer/figma-redesign-shell.test.cjs`
- `test/repository/runtime-wiring-source.test.cjs`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC53_codex_implementer_per_run_network_access_control.md`

Some touched files already contained unrelated pre-existing dirty changes. Those changes were preserved and not broadened for WC53.

## Network Request Control Implemented

- Added a bounded `CodexImplementerExecutionStartOptions` contract with only `networkAccessEnabled?: boolean`.
- Added main-process validation that rejects non-object values, non-boolean network values, and unsupported keys such as arbitrary sandbox or approval options.
- Updated preload to forward only the typed start options object to `codexImplementer:start`.
- Added the existing Implement workspace checkbox: `Allow network for this Codex run`.
- The checkbox defaults to false, explains dependency/package download use, disables while a Codex run is active or starting, and resets after a run starts or terminates.

## Default-Disabled Evidence

- `resolveDefaultCodexImplementerExecutionPolicy()` still resolves:
  - `sandboxMode = workspace-write`
  - `approvalPolicy = never`
  - `networkAccessEnabled = false`
- The existing SDK-thread service test now asserts default `networkAccessEnabled=false` reaches `sdk.startThread(...)`.

## Explicit-Enabled SDK Option Evidence

- Added a focused Codex Implementer service test that starts with `{ networkAccessEnabled: true }` and captures actual `sdk.startThread(...)` options.
- The test proves the SDK receives `networkAccessEnabled=true` while `sandboxMode` remains `workspace-write` and `approvalPolicy` remains `never`.
- The execution policy is resolved and stored on the session at `start()` time, making the run policy immutable for the active SDK thread.

## Proof WC52 Sandbox And Approval Values Are Unchanged

- The policy module continues to exclude `danger-full-access` from the local sandbox type.
- No sandbox selector, approval-policy selector, approval broker, domain input, persistent settings page, global Codex config write, or prompt-based permission control was added.
- Focused service tests assert both default and network-enabled paths keep `workspace-write` and `never`.

## Commands Run And Results

- `pwd` - passed; verified approved repo root.
- `git status --short --branch` - passed; found existing dirty worktree on the current feature branch.
- `git remote -v` - passed; confirmed `origin`.
- `Get-Content` for WC53, repository boundary, validation lane, adjacent WC52 report, and affected source/test files - passed.
- `rg` searches for Codex execution references and local safety scan terms - passed; findings were expected environment-variable reads and explicit `danger-full-access` exclusion/rejection evidence.
- `npm run typecheck` - passed in sandbox lane.
- `npm run build` - sandbox lane failed with the documented Vite/esbuild `spawn EPERM` false-failure mode.
- `npm run build` - passed in normal Windows lane.
- `npm test` - first normal Windows lane run failed 328 passed / 1 failed because one pre-existing source assertion still expected the no-argument Codex start call; assertion was updated to the new options object.
- `npm run typecheck` - passed in sandbox lane after correction.
- `npm run build` - passed in normal Windows lane after correction.
- `npm test` - passed in normal Windows lane; 329 tests passed, 0 failed.

## Validation Performed

- TypeScript typecheck.
- Production build through the documented normal Windows lane after sandbox `spawn EPERM`.
- Focused Codex execution service tests for default-disabled and explicit-enabled network policy.
- Focused IPC/source tests proving the validated single-option start path.
- Focused renderer source tests proving the visible checkbox, disabled running state, per-run reset, and no persistence hook.
- Full automated test suite.
- Local safety scan for secrets, credentials, `.env`, concrete local machine paths, and prohibited unrestricted sandbox usage.

## Validation Skipped

- Operator manual validation using `ChampCity_PDL` Work Card 01 was not performed by the Implementer.
- Electron launch smoke was not performed; WC53 required focused service/IPC/renderer tests and full automated validation, which passed.

## Git Actions

- Staging: not performed.
- Commit: not performed.
- Push: not performed.
- Reason: WC53 explicitly prohibits Git mutation.

## Security And Safety Notes

- No secrets, tokens, credentials, API keys, `.env` contents, or concrete local machine paths were added.
- Renderer filesystem access was not broadened.
- No global Codex config, user profile config, or workspace settings persistence was added.
- Network access remains off by default and can only be enabled for an individual Codex run.

## Manual Validation Required

- In `ChampCity_PDL` Work Card 01, confirm the network control defaults to off.
- Enable the control and start the embedded Codex Implementer.
- Confirm dependency retrieval can succeed while the sandbox remains workspace-write.
- Confirm a later or new Build session does not silently inherit network permission.

## Residual Risks

- Live embedded Codex dependency retrieval still requires Operator observation against `ChampCity_PDL`.
- The worktree contains pre-existing unrelated modifications and untracked planning artifacts that were not part of this WC53 pass.

## Recommended Next Implementer Task

Run Operator manual validation for WC53 with `ChampCity_PDL` Work Card 01 and record the observed result in the normal validation flow.

Document.Status=Pending
