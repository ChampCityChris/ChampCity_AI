<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC53_codex_implementer_per_run_network_access_control.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "disposition": "Approved for Operator validation",
    "reviewType": "Architect source and Implementer Report review",
    "reviewedWorkCard": "WC53_codex_implementer_per_run_network_access_control",
    "operatorValidationRequired": true,
    "gitMutationAuthorized": false,
    "gitMutationPerformedByArchitect": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC53 satisfies the bounded per-run network-control contract. Live ChampCity_PDL dependency retrieval remains for Operator validation.",
    "reviewedAt": "2026-08-19"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC53 Codex Implementer Per-Run Network Access Control

Disposition: Approved for Operator validation  
Git mutation: not authorized and not performed

## Scope Reviewed

Reviewed WC53 against:

- `planning/phases/phase-08/Work_Cards/WC53_codex_implementer_per_run_network_access_control.md`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC53_codex_implementer_per_run_network_access_control.md`
- `src/main/workCardBuilding/codexImplementerExecutionPolicy.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `src/main/main.ts`
- `src/preload/index.ts`
- `src/shared/workspaceContracts.ts`
- `src/renderer/app/App.tsx`
- `src/renderer/app/WorkCardBuildingReviewWorkspace.tsx`
- focused Codex, IPC/wiring, and renderer tests

The repository remains on `feature/phase-04-wc01-repair01-evidence-derived-workflow` with pre-existing unrelated dirty work. No staging, commit, push, or other Git mutation was performed during this review.

## Findings

WC53 is implemented in the intended narrow form.

The application exposes one Operator-supplied execution-policy value only:

```text
networkAccessEnabled: boolean
```

`validateCodexImplementerStartOptions(...)` treats the IPC payload as untrusted input, defaults missing network permission to `false`, rejects non-object and non-boolean values, and rejects every unsupported key. The renderer therefore cannot use this path to select sandbox mode, approval policy, arbitrary URLs, or other Codex configuration.

The WC52 policy remains authoritative:

```text
sandboxMode = workspace-write
approvalPolicy = never
```

The network boolean only changes `networkAccessEnabled`.

The execution service resolves the policy at `start()` and stores it in the session. `executeWithSdk(...)` passes that captured policy to `sdk.startThread(...)`, so the active run policy is immutable after launch.

The Build workspace provides the requested checkbox:

```text
Allow network for this Codex run
```

It defaults to false, explains that the permission is for package/dependency downloads and applies only to the Codex run, is disabled during active execution/action handling, and is reset after a run starts or reaches a terminal state. The value is local renderer state and no persistence path to workspace settings, project artifacts, Codex global configuration, or user-profile configuration was introduced.

## Acceptance Criteria Mapping

1. Default network disabled: satisfied by policy default and SDK-thread regression assertion.
2. Operator can enable next-run network: satisfied by the Build workspace checkbox and typed start option.
3. Value reaches actual SDK thread: satisfied by focused test capturing `networkAccessEnabled=true` in `startThread(...)`.
4. WC52 sandbox/approval unchanged: satisfied by source inspection and tests asserting `workspace-write` and `never` on both default and network-enabled paths.
5. Choice is non-persistent and cannot carry arbitrary config: satisfied by local React state plus strict main-process option validation.
6. Control cannot change while running: satisfied by disabled state for `isRunning || isActionRunning` and session-captured execution policy.
7. Existing execution/review behavior: Implementer reports full regression suite green.
8. Both false/true paths: satisfied by focused service tests.
9. Validation commands: Implementer reports final typecheck/build/full-test pass.

## Implementer-Reported Validation

Final reported results:

```text
npm run typecheck: passed
npm run build: passed in normal Windows lane
npm test: 329 passed, 0 failed
```

The first full test run found one stale source assertion and failed 328/329; the assertion was updated for the new typed start-options contract and the final full suite passed. I did not independently rerun these commands during Architect review.

## Remaining Operator Validation

Using `ChampCity_PDL` Work Card 01:

1. Confirm `Allow network for this Codex run` is initially unchecked.
2. Enable it and launch the embedded Codex Implementer.
3. Confirm required npm/package retrieval succeeds.
4. Confirm repository writes remain bounded by `workspace-write` and no approval prompt deadlock returns.
5. Confirm the network checkbox does not remain silently enabled for the next run/new Build session.

## Final Disposition

WC53 is approved for Operator validation. No additional repair is required from source review. No Git operation was performed.
