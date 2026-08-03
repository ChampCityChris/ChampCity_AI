<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": { "phaseId": "phase-08", "workCardId": "WC31" },
  "sourceRevisions": [
    { "path": "planning/phases/phase-08/Work_Cards/WC31_project_architect_interview_draft_ingestion_pilot_cutover.md", "revision": 2 },
    { "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC31_project_architect_interview_draft_ingestion_pilot_cutover.md", "revision": 1 }
  ],
  "workflowData": {
    "title": "Architect Review — WC31 Project Architect Interview Draft-Ingestion Pilot Cutover",
    "reviewResult": "RevisionRequested",
    "deterministicValidation": { "typecheck": "passed", "build": "passed", "tests": "157/157 passed" }
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "The cutover compiles and tests pass, but the production handoff invocation is invalid, submission identity bypasses the WC30 deterministic identity contract, existing final Interview targets can be overwritten, and failed retries reuse an unwritable draft path instead of preparing a fresh submission.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC31

Disposition: `RevisionRequested`

## Accepted Work

- The retired direct Interview save function, IPC handler, preload method, and shared API contract were removed.
- One production Project Architect Interview definition was added.
- Promotion delegates to the WC30 inspection, promotion, cleanup, and shared canonical writer services.
- Promotion failures are surfaced in the workspace model.
- Typecheck, build, and the complete 157-test suite pass.

## Blocking Defects

### 1. Generated MCP invocation is not callable

The handoff instructs the Architect to call `artifact_toolbox.create_markdown_artifact` with top-level fields:

```json
{
  "path": "<draft path>",
  "content": "<body>",
  "overwrite": false
}
```

The exposed toolbox contract requires:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<draft path>",
    "content": "<body>",
    "overwrite": false
  }
}
```

The current running-product handoff will fail before creating the draft.

### 2. Submission identity bypasses the approved WC30 identity contract

`architectInterviewDraftPilot.ts` constructs IDs from `Date.now()` and custom string builders. This bypasses the collision-safe deterministic WC30 identity builder approved through WC30-REPAIR02 and reintroduces a timestamp/counter identity mechanism explicitly excluded from that foundation.

### 3. Existing final Interview targets can be revised by the fresh-output pilot

The production definition reads an existing final target and assigns `artifactRevision + 1`. WC31 explicitly requires that an existing exact final target is returned as existing evidence and is not overwritten or revised. The orchestration does not block preparation or promotion when the target already exists.

### 4. Failed retry reuses the same unwritable draft path

After `promotion-failed`, the active failed submission still exposes a handoff. The handoff service therefore reuses the same draft path while requiring `overwrite:false`. Because the malformed draft remains present, the Architect cannot replace it. The claimed fresh-retry behavior is not reachable through the production copy-handoff route.

## Validation

```text
npm run typecheck  -> passed
npm run build      -> passed
npm test           -> passed; 157/157
HEAD before/after  -> 30cf9b0c224459d73bc0eb0d0cab5107754558fd
```

Passing tests do not override the four repository-confirmed contract defects above.

## Disposition

WC31 remains unresolved. Operator running-product validation must not begin until the bounded repair is implemented and approved. No additional output-flow cutover is authorized.
