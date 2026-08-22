<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reviewKind": "work-card-architect-review",
    "workCardId": "WC54",
    "disposition": "approved_for_operator_validation",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC54 implementation satisfies the source contract and is approved for live Operator validation against ChampCity_PDL. The remaining EPERM observations were gathered from the pre-restart/current Codex execution environment and therefore do not yet test the newly configured embedded danger-full-access thread policy.",
    "reviewedAt": "2026-08-19"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC54 Codex Full Local Development Authority and Windows Toolchain Diagnostics

## Disposition

Approved for Operator validation.

## Scope Reviewed

Reviewed WC54 against:

- `planning/phases/phase-08/Work_Cards/WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md`
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/main.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- focused Codex execution and renderer tests

Repository verified through ChampCity MCP on branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The worktree contains pre-existing unrelated changes; no staging, commit, push, reset, clean, or other Git mutation was performed during this review.

## Findings

The production implementation matches WC54.

The WC52 execution-policy seam remains intact. `resolveDefaultCodexImplementerExecutionPolicy()` now resolves:

```text
sandboxMode = danger-full-access
approvalPolicy = never
networkAccessEnabled = true
```

`CodexImplementerExecutionService.start(...)` receives no Operator/renderer permission options. It resolves policy through the injected resolver, stores the resolved policy on the session, and `executeWithSdk(...)` passes that session policy to the actual `sdk.startThread(...)` call together with the selected project root and existing `skipGitRepoCheck=true` behavior.

The WC53 per-run network control has been removed from the normal production path. The main-process start IPC accepts no permission payload, the shared API exposes `startCodexImplementerExecution()` with no options, the renderer calls it without options, and the Build workspace no longer presents the network checkbox.

Focused service tests capture the actual SDK thread options and assert `danger-full-access`, `never`, and network enabled. Existing retry, cancellation, report-refresh, and review behavior remains covered by the existing Codex execution tests.

## Windows Toolchain Diagnostic Review

The Implementer completed the required diagnostic lane.

The evidence does not indicate a basic Node/npm PATH-resolution failure:

- `where.exe` and `Get-Command` resolve Node, npm, and npx;
- Node reports `v24.18.1`;
- npm reports `11.16.0`;
- `process.execPath` resolves consistently with the Node executable;
- npm cache, prefix, and userconfig locations resolve;
- Process/User/Machine PATH inspection found no obvious missing Node/npm entry.

Two EPERM conditions remain in the Implementer environment:

1. `npm cache verify` fails against the normal user-level npm cache.
2. a direct Node `child_process.spawnSync(process.execPath, ["-e", "process.exit(0)"])` probe fails with `EPERM` / `errno=-4048` before child execution.

Those failures are significant, but they do not currently demonstrate a WC54 source defect. The Implementer explicitly ran them in the current Codex terminal environment before a rebuilt/restarted ChampCity A/I instance could create a new embedded SDK thread with the WC54 `danger-full-access` policy. The Work Card therefore correctly leaves the decisive proof to the live Operator validation lane.

The current diagnostic classification of Node/npm/PATH as `ambiguous` is accepted. PATH discovery itself appears coherent; the unresolved questions are ordinary user-level npm-cache access and Node subprocess creation under the actual rebuilt embedded runtime.

## Automated Validation Evidence

Implementer-reported results:

- `npm run typecheck`: passed.
- `npm run build`: passed in the documented normal Windows validation lane; sandbox lane produced expected environment EPERM behavior.
- `npm test`: passed in the documented normal Windows validation lane with 328 tests passed and 0 failed; sandbox lane failed during build with environment EPERM.

The Architect did not independently rerun these commands during this review.

## Acceptance Disposition

WC54 acceptance criteria are satisfied at the implementation-review stage:

- full-development policy is explicit;
- policy values remain owned by the WC52 resolver seam;
- WC53 permission UI/configuration is removed;
- no Operator sandbox/approval/network decision is required;
- actual SDK thread options are regression-tested;
- existing Codex execution behavior remains covered;
- ChampCity A/I normal validation lanes pass;
- the required Windows toolchain diagnostic evidence is present and clearly classified.

No repair card is warranted from the Implementer Report alone.

## Required Operator Validation

Rebuild/restart ChampCity A/I so the embedded Codex SDK thread is created from the WC54 production code, then rerun `ChampCity_PDL` Work Card 01.

First run the direct Node subprocess probe in that embedded run. It must launch the child Node process successfully without `EPERM`.

Then use only the ordinary project commands:

```text
npm install --package-lock-only
npm ci
npm run build
npm test
```

Do not use a repository-local npm cache, alternate Node test isolation, or PowerShell process launching as substitutes.

If those commands pass, WC54 validates and the prior failures are attributable to the restricted Codex execution environment rather than a broken Node/npm/PATH installation.

If the direct Node subprocess probe or ordinary npm-cache operations still fail under the rebuilt `danger-full-access` embedded run, WC54 Operator validation fails and the next RCA should distinguish host npm-cache permissions/security software from a deeper Codex SDK/Windows process-runtime defect. Preserve the exact failure evidence; do not add another workaround first.

## Final Disposition

WC54 is approved for Operator validation. No Git mutation was performed.
