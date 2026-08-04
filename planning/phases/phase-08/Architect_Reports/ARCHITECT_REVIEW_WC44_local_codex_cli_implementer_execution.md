<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC44"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC44_local_codex_cli_implementer_execution.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC44 Local Codex SDK Implementer Execution",
    "reviewResult": "RevisionRequested",
    "blockingDefects": 1,
    "operatorValidationBlocked": true
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC44 correctly installs the SDK-primary implementation boundary, prompt, IPC/preload surface, and report-centered review flow, but a terminal Codex execution state can permanently block retry through the UI. Repair must add a safe retry/reset path for completed, failed, cancelled, or no-report-update terminal runs while preserving one-running-execution enforcement and repository-evidence authority.",
    "reviewedAt": "2026-08-03"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC44 Local Codex SDK Implementer Execution

Disposition: `RevisionRequested`  
Git mutation: none

## Review Boundary

ChampCity MCP was used to inspect the approved WC44 revision 2 Work Card, the WC44 Implementer Report, package dependency changes, the Codex execution service, main-process IPC wiring, preload exposure, shared contracts, Work Card Building renderer integration, focused tests, and current repository status.

This review did not independently execute `npm`, launch Electron, or run Codex. The MCP does not expose a confirmed arbitrary command-execution lane. The review therefore treats Implementer-reported command results as reported evidence and independently verifies source and test content.

## Accepted Implementation

The following implementation is accepted and should be preserved:

- `@openai/codex-sdk` is installed as the production dependency.
- The main execution service uses the SDK as the primary integration and does not implement raw `codex exec` as the production path.
- The service derives selected project root, Work Card path, Work Card revision, Work Card digest, report path, report revision, and report digest from main-process repository evidence rather than renderer input.
- Renderer-facing APIs are limited to status, start, and cancel.
- The start route accepts no renderer-supplied command, path, Work Card ID, report path, arguments, config override, or prompt.
- The prompt is generated immediately before launch and contains the approved Work Card authority, existing report target, project-instruction discovery rule, no-Git rule, and report-completion rule.
- The service uses `workingDirectory` equal to the selected project root and `skipGitRepoCheck: true`.
- The service does not request, store, parse, display, or inject Codex credentials, OpenAI API keys, or `CODEX_HOME`.
- Event, error, and final-response tails are bounded in memory and are not written into planning artifacts automatically.
- Report-update detection compares repository evidence after execution and does not treat SDK final text as disposition authority.
- Report disposition remains the downstream authority; Codex completion does not create a Validation Record, Repair Work Card, or approval.

## Blocking Defect

### Terminal Codex execution state has no Operator retry path

The service stores one session per selected workspace root. `start()` only rejects a second launch while the stored session is `running`; completed, failed, and cancelled sessions are not technically blocked by the main service.

However, `getStatus()` returns the stored terminal session instead of recomputing a fresh `ready` model when the current Work Card and Pending report are still valid. The renderer then computes:

```text
canRun = state === "ready" && !isActionRunning
```

As a result, after these normal-use outcomes, the Operator cannot run Codex again from the UI:

- SDK failure;
- missing or later-fixed local authentication;
- cancellation;
- successful Codex exit that did not update the Implementer Report;
- completed run where the Operator wants to run again against the still-Pending report before review.

This is not a hypothetical corruption case. It is part of the expected local-agent workflow: a first run may fail because Codex is not authenticated, the Operator may cancel a run, or Codex may return without updating the report. WC44 requires the Build / Review workspace to keep the report review flow visible and controlled by repository evidence. It should not leave the Operator unable to retry while the same Approved Work Card and fresh Pending report remain current.

## Required Correction

Create one bounded repair for WC44. It must:

1. Preserve the current one-running-execution rule.
2. Keep the terminal execution evidence visible as the last run result.
3. Recompute or expose retry readiness from current repository evidence after terminal states.
4. Enable `Run Codex Implementer` again when all current preflight conditions are satisfied and no run is active.
5. Preserve the existing Pending Implementer Report as the sole review target.
6. Preserve cancellation behavior for only the tracked active execution.
7. Preserve the no-arbitrary-command, no-credential-storage, no-API-key, no-Codex-home, and no-auto-approval boundaries.
8. Add automated proof that failure, cancellation, and completed/no-report-update states can return to a retry-capable state without app restart when the Work Card and report remain valid.

## Proof Gaps To Close During Repair

The renderer test for the Build / Review workspace remains mostly source-string based. Because WC44’s requirement is interactive renderer behavior, the repair should add or update a rendered-markup test using the production component for at least:

- ready state enables `Run Codex Implementer`;
- running state exposes cancel;
- terminal state with retry-ready repository evidence exposes run again while preserving the terminal status message;
- non-Pending or missing report does not expose run.

The auth-error mapping is implemented by source inspection but not directly tested. Add a focused test for an SDK/auth-like failure mapping to the approved local-authentication message.

## Final Disposition

WC44 is not ready for Operator validation. The implementation is close, and the accepted SDK/auth/report boundaries should be preserved, but retry lockout must be repaired first.

No Git operation was performed.
