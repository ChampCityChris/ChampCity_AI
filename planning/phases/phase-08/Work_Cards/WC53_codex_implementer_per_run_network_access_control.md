<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC53"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC52_codex_implementer_execution_policy_boundary_and_workspace_write_enablement.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Codex Implementer Per-Run Network Access Control",
    "status": "approved_for_implementation",
    "executionMode": "concise bounded Operator-control Work Card",
    "dependsOn": ["WC52"],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC53_codex_implementer_per_run_network_access_control.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Expose only the network permission that the Operator may need for dependency retrieval. Keep sandbox and approval policy application-owned under WC52; do not build a general Codex settings surface.",
    "reviewedAt": "2026-08-17"
  }
}
CHAMPCITY-METADATA -->

# WC53 — Codex Implementer Per-Run Network Access Control

Status: Approved for Implementer execution  
Depends on: `WC52`  
Work Card type: concise bounded Operator control  
Git mutation: prohibited

## Verified Need

WC52 intentionally keeps the embedded Implementer network-disabled by default.

The current `ChampCity_PDL` Work Card 01 requires npm to generate `package-lock.json` and install declared TypeScript development dependencies. A real implementation run may therefore require outbound network access even though the product being built has no runtime network feature.

Automatic permanent network access is not authorized. The Operator needs one explicit, narrow way to enable network access for an individual Codex implementation run.

## Objective

Add one Operator-visible per-run network control to the existing Work Card Build / Codex execution workspace.

Required behavior:

```text
default run
→ workspace-write
→ approvalPolicy never
→ network disabled

Operator enables "Allow network for this Codex run"
→ next Codex run keeps workspace-write
→ keeps approvalPolicy never
→ network enabled for that run only
```

This is not a general Codex settings UI.

## Required Changes

1. Add one bounded start option equivalent to:

```text
networkAccessEnabled: boolean
```

The main process must validate this value and may use it only to select the network field of the WC52 Codex execution policy.

2. Add one control in the existing Build / Codex execution surface:

```text
[ ] Allow network for this Codex run
```

Default: unchecked / false.

3. The UI should explain briefly that network access may be required for package/dependency downloads and applies to the Codex run, not to the product being implemented.

4. The selected value is per-run only. Do not persist it to project artifacts, `workspace-settings.json`, Codex global config, or user profile configuration.

5. Once a run starts, its resolved policy is immutable. Disable the network control while Codex is running.

6. The renderer must not be able to provide arbitrary Codex configuration. The only new Operator-supplied execution-policy value authorized by this card is the network boolean.

7. Add focused service/IPC/renderer tests proving default-disabled and explicitly-enabled behavior.

## Preserved Behavior

Do not change:

- WC52 `workspace-write` sandbox policy;
- WC52 `never` approval policy;
- project-root and Work Card authority;
- local Codex authentication;
- prompt generation;
- retry/cancel/report-refresh behavior;
- Implementer Report review flow;
- Git authorization;
- application credential handling.

WC53 narrowly supersedes the older WC44 rule that the renderer may provide no config override: the sole permitted exception is this validated boolean network request.

## Authorized Surface

Expected changes are limited to the existing Codex execution path:

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
WC52 execution-policy module
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
existing Work Card Build / Codex renderer surface
focused Codex execution / IPC / renderer tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC53_codex_implementer_per_run_network_access_control.md
```

Do not add a separate settings page.

## Acceptance Criteria

1. Network access is disabled when the Operator does not opt in.
2. The Operator can explicitly enable network for the next Codex Implementer run.
3. The validated value reaches the actual SDK thread as `networkAccessEnabled` or the installed SDK's minimal equivalent.
4. Enabling network does not alter `workspace-write` sandbox or `never` approval policy.
5. Network choice is not persisted and cannot carry arbitrary Codex config values.
6. The control is unavailable for mutation while a run is active.
7. Existing Codex execution and review behavior remains green.
8. Focused tests prove both false and true policy paths.
9. `npm run typecheck`, `npm run build`, and `npm test` pass.

## Negative Constraints

- No approval UI or approval broker.
- No sandbox selector.
- No approval-policy selector.
- No `danger-full-access` option.
- No arbitrary domain/URL input.
- No persistent Codex settings system.
- No global Codex config writes.
- No prompt-based permission control.
- No unrelated UI redesign.
- No Git mutation.

Keep the implementation and Implementer Report concise.

## Implementer Report Requirements

Report only:

- files changed;
- network request/control implemented;
- default-disabled evidence;
- explicit-enabled SDK option evidence;
- proof WC52 sandbox/approval values are unchanged;
- typecheck/build/test results;
- remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

Using `ChampCity_PDL` Work Card 01 after WC52 passes:

1. Confirm the network control defaults to off.
2. Enable network for the run and start the embedded Codex Implementer.
3. Confirm Codex can perform required npm dependency retrieval while still writing only under the workspace-write sandbox.
4. Confirm a later/new Build session does not silently inherit network permission as a persisted setting.
