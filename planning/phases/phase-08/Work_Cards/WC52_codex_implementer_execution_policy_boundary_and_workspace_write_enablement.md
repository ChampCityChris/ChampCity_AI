<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC52"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44-REPAIR01_codex_retry_and_build_review_workspace_split.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Codex Implementer Execution Policy Boundary and Workspace-Write Enablement",
    "status": "approved_for_implementation",
    "executionMode": "concise bounded workflow-hardening Work Card",
    "confirmedDefect": "The embedded Codex Implementer starts SDK threads without an explicit sandbox or approval policy. The first real ChampCity_PDL implementation run therefore inherited a read-only / approval-gated posture and was blocked from writing the selected repository because the embedded SDK workflow has no Operator approval interaction.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC52_codex_implementer_execution_policy_boundary_and_workspace_write_enablement.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Add a small application-owned Codex execution-policy seam and run the Implementer with workspace-write plus non-interactive approval. Do not build the future approval UI in this card.",
    "reviewedAt": "2026-08-17"
  }
}
CHAMPCITY-METADATA -->

# WC52 — Codex Implementer Execution Policy Boundary and Workspace-Write Enablement

Status: Approved for Implementer execution  
Phase: `phase-08`  
Work Card type: concise bounded workflow hardening  
Git mutation: prohibited

## Confirmed Defect

The production Codex Implementer currently starts a thread with only:

```text
workingDirectory = selected project root
skipGitRepoCheck = true
```

`src/main/workCardBuilding/codexImplementerExecutionService.ts` does not set Codex `sandboxMode`, `approvalPolicy`, or network policy.

During live `ChampCity_PDL` Work Card 01 implementation, Codex was blocked by a read-only sandbox / user-approval posture. ChampCity A/I has no approval broker or approval UI, so an approval-requesting runtime cannot complete the implementation workflow.

This is a runtime-policy defect. Implementer prompt text cannot grant filesystem authority that the Codex sandbox denies.

## Objective

Introduce one small application-owned Codex execution-policy boundary and use it to run the embedded Implementer with explicit repository write authority without granting unrestricted filesystem access.

Required current Implementer policy:

```text
sandboxMode: workspace-write
approvalPolicy: never
networkAccessEnabled: false
```

`workspace-write` is the maximum filesystem authority authorized by this card. `danger-full-access` is prohibited.

## Required Changes

1. Add a small Codex Implementer execution-policy contract/resolver owned outside the execution loop. The execution service must obtain policy from this seam rather than embedding policy literals directly in `executeWithSdk(...)`.

2. The current default Implementer policy must resolve to:

```text
sandboxMode = workspace-write
approvalPolicy = never
networkAccessEnabled = false
```

3. Pass the resolved policy explicitly to `sdk.startThread(...)` together with the existing selected `workingDirectory` and `skipGitRepoCheck=true`.

4. Preserve constructor/injection testability so a future Operator approval UI or settings source can replace policy resolution without redesigning the Codex execution service.

5. Add focused tests that capture the actual SDK thread options and prove the explicit policy is applied.

6. If the installed `@openai/codex-sdk` type contract differs from the expected current `ThreadOptions` fields, use the installed SDK type as authority and document the minimal equivalent mapping in the Implementer Report. Do not modify global Codex configuration to work around the SDK.

## Preserved Behavior

Do not change:

- selected project-root derivation;
- Work Card and Implementer Report authority;
- Codex local authentication behavior;
- execution streaming, cancellation, retry, and report-refresh behavior;
- Build / Implementer Report Review workspace split;
- Implementer prompt contents except where compilation requires no-op type accommodation;
- Git authorization rules;
- existing application credential boundaries.

## Authorized Surface

Expected production changes are limited to:

```text
src/main/workCardBuilding/codexImplementerExecutionService.ts
one adjacent Codex execution-policy module if useful
focused Codex Implementer tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC52_codex_implementer_execution_policy_boundary_and_workspace_write_enablement.md
```

Do not add a settings page, approval dialog, IPC approval broker, or broad Codex configuration subsystem.

## Acceptance Criteria

1. Every embedded Codex Implementer thread receives explicit `workspace-write` sandbox authority.
2. Every embedded Codex Implementer thread receives explicit non-interactive / `never` approval policy.
3. Network access remains explicitly disabled by this card.
4. Policy values come through a dedicated resolver/seam rather than being hard-coded inside the execution loop.
5. No `danger-full-access` path is introduced.
6. Existing Codex execution, retry, cancellation, report-refresh, and review tests remain green.
7. Focused tests inspect the actual `startThread(...)` options and prove the current policy.
8. `npm run typecheck`, `npm run build`, and `npm test` pass.

## Negative Constraints

- No approval UI or approval broker.
- No persistent Codex settings UI.
- No global/user `config.toml` writes.
- No prompt-based permission workaround.
- No network enablement in this card.
- No unrestricted filesystem access.
- No API-key or credential changes.
- No unrelated Codex refactor.
- No Git mutation.

Keep the implementation and Implementer Report concise.

## Implementer Report Requirements

Report only:

- files changed;
- policy seam implemented;
- exact effective Implementer policy;
- SDK option mapping used;
- focused regression evidence;
- typecheck/build/test results;
- remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

Using `ChampCity_PDL` Work Card 01:

1. Run the embedded Codex Implementer again.
2. Confirm the run is no longer blocked because the selected repository is read-only or because routine in-workspace writes require an unavailable user approval.
3. Confirm Codex can create/modify files inside the selected `ChampCity_PDL` repository but receives no authorization for unrestricted filesystem access.
4. If dependency retrieval is then blocked by network policy, record that separately and proceed to WC53; that result does not fail WC52.
