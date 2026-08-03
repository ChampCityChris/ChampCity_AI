<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC39-REPAIR01",
    "repairId": "WC39-REPAIR01",
    "parentWorkCardId": "WC39"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC39-REPAIR01_active_runtime_context_ownership.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39-REPAIR01_active_runtime_context_ownership.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC39-REPAIR01 Active Runtime Context Ownership Repair",
    "reviewResult": "Approved",
    "returnTarget": "WC39",
    "reportedValidation": {
      "typecheck": "passed",
      "typescriptBuild": "passed",
      "viteBuild": "passed in approved normal Windows lane",
      "tests": "200/200 reported passed"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "The historical prepared-context map and submission-context key are removed. The current typed domain context is owned by the single active runtime record and passed directly to promotion. Accepted WC39 behavior and WC40 boundaries remain unchanged.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC39-REPAIR01

Disposition: `Approved`  
Parent return target: `WC39`  
Git mutation: none

## Review Result

WC39-REPAIR01 satisfies its bounded repair contract.

The shared coordinator now stores runtime state as:

```text
activeSubmissionByRuntimeKey
requestOrdinalByRuntimeKey
```

Each active record contains:

```text
workspaceRoot
submission
preparedContext
promotionError
cleanupStatus
cleanupError
```

The removed historical authority is absent from source and compiled output:

```text
preparedContextBySubmission
runtimeSubmissionContextKey
```

## Accepted Runtime Behavior

`prepareArchitectOutputRuntimeSubmission()` now:

1. resolves the current typed domain preparation;
2. reuses a matching waiting or partial active submission without changing its ordinal or paths;
3. otherwise creates one new submission;
4. installs one active record containing that submission and `preparation.domainContext`.

`getArchitectOutputRuntimeStatus()` passes `active.preparedContext` directly to `promoteArchitectDraftSubmission()`. There is no second context lookup store.

Replacing the active runtime-key entry makes the prior submission and prior context unreachable together. No cache, cleanup worker, persisted state, compatibility wrapper, or historical map was added.

## Preservation Review

The repair did not change:

- the seven-flow catalog or five active definitions;
- the production registry;
- domain adapters;
- deterministic submission identity or request ordinals;
- waiting/partial reuse;
- polling behavior;
- explicit retry and failed-draft retention;
- single-output or atomic-bundle promotion;
- canonical metadata, revisions, targets, or downstream behavior;
- IPC, preload, renderer, review, or current-workflow surfaces;
- Formal Work Card or Repair Work Card deferral to WC40.

The focused source guard confirms active-record context ownership and absence of both retired identifiers. Existing production-service tests remain the substantive proof for reuse, retry, promotion, malformed-draft retention, ineligible-target protection, atomic bundles, and downstream behavior.

## Validation Assessment

The Implementer Report records:

```text
npx tsc --noEmit                 passed
npx tsc                          passed
npx vite build                   passed in approved normal Windows lane
node --test --test-concurrency=1 200 passed, 0 failed
```

The sandbox `spawn EPERM` results were correctly separated from the successful approved Windows reruns. ChampCity MCP does not expose command execution, so the Architect independently verified current source and compiled output rather than claiming to have rerun those commands.

## Scope Confirmation

Production change was limited to:

```text
src/main/architectOutputs/architectOutputRuntimeService.ts
```

The only test change was the authorized focused source guard. No Git operation occurred.

WC39-REPAIR01 is complete. Return to parent WC39 disposition.