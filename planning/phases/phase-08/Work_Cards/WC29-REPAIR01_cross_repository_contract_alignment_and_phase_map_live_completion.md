<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC29-REPAIR01",
    "repairId": "WC29-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC29_unified_handoff_submission_full_roadmap_and_phase_map_workflow.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC29_unified_handoff_submission_full_roadmap_and_phase_map_workflow.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Map Contract Alignment and Live Output Detection",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC29",
    "executionMode": "one bounded application repair pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC29-REPAIR01_phase_map_contract_alignment_and_live_output_detection.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct only the remaining code defects after the Operator deleted the prior Revisionary Project Planning and Phase Map artifacts. No migration, preservation, reconciliation, or compatibility behavior is authorized.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC29-REPAIR01 — Phase Map Contract Alignment and Live Output Detection

Status: Approved for Implementer execution  
Parent: `WC29`  
Git mutation: prohibited

## Operator Direction

The prior Revisionary Project Profile, Project Roadmap, Project Planning handoff, Phase Map handoff, and Phase Map output were deleted by the Operator.

This repair must not:

- migrate, preserve, recover, reconcile, or inspect those deleted artifacts;
- create compatibility handling for their prior schemas or revisions;
- add legacy readers, aliases, fallback fields, or translation logic;
- treat the absence of those documents as a blocker;
- encode a dependency gate on another Work Card.

Revisionary will restart cleanly from the existing Approved Project Architect Interview.

## Objective

Correct the remaining production-code defects in the clean Project Planning → Phase Map workflow:

1. align ChampCity A/I to the exact canonical Phase Map handoff contract;
2. define one authoritative Phase Map domain schema owned by ChampCity A/I and enforced by ChampCity_GPT;
3. make Phase Map handoff preparation byte-idempotent;
4. detect and select an MCP-written Phase Map while the workspace remains open;
5. remove the body-only Phase Map compatibility authority path;
6. emit the Project Planning full-lifecycle contract revision expected by the MCP.

## Authority Model

### ChampCity A/I owns the Phase Map domain contract

ChampCity A/I defines:

- the `champcity-phase-map` JSON structure;
- required phase fields;
- field meaning;
- ordering and dependency semantics;
- prohibition on persisted completion state;
- the exact prompt and handoff instructions given to the Architect.

### ChampCity_GPT owns canonical persistence enforcement

ChampCity_GPT derives and enforces:

- the current Approved handoff;
- target path;
- artifact type and participation role;
- identity and source revisions;
- artifact revision;
- Pending disposition;
- idempotency and reviewed-output rules;
- path safety, atomic write, rollback, and audit behavior.

The MCP must enforce the A/I-defined domain schema. It must not invent a different Phase Map domain shape.

## Required Change 1 — Exact Phase Map Handoff Contract

The generated Phase Map handoff `workflowData` must contain exactly:

```text
handoffKind
contractId
phaseMapTarget
requiredTitle
requiredDomainBlocks
```

Required values:

```json
{
  "handoffKind": "phase-map",
  "contractId": "phase-map-output-submission-v1",
  "phaseMapTarget": "planning/project/Phase_Map/PHASE_MAP_<project-slug>.md",
  "requiredTitle": "Phase Map",
  "requiredDomainBlocks": ["champcity-phase-map"]
}
```

Do not generate alternate workflow authority fields such as:

```text
outputTarget
requiredHeading
domainBlock
domainBlockRules
projectProfilePath
projectProfileRevision
projectRoadmapPath
projectRoadmapRevision
projectIdentity
```

Current Profile and Roadmap authority belongs in canonical `sourceRevisions` and `identity`.

The copied Architect instruction may display source paths and revisions for readability, but those values are not caller authority and must not be accepted as submission parameters.

## Required Change 2 — One A/I-Owned Phase Map JSON Schema

The `champcity-phase-map` fenced block must use exactly this root shape:

```json
{
  "phases": [
    {
      "phaseId": "phase-01",
      "title": "Foundation",
      "order": 1,
      "purpose": "Establish the project foundation.",
      "dependsOn": [],
      "sourceReferences": []
    }
  ]
}
```

Each phase entry must contain only:

```text
phaseId
title
order
purpose
dependsOn
sourceReferences
```

Required domain rules:

- `phases` is a non-empty array;
- `phaseId` values are unique;
- `order` values are unique integers;
- every dependency resolves to a phase in the same map;
- self-dependencies and dependency cycles are prohibited;
- `sourceReferences` contains normalized repository-relative paths;
- persisted completion fields are prohibited;
- the phase list is authored from the Approved full Project Roadmap and Project Profile;
- application code must not fabricate a default phase.

Update the generated handoff body, copied Architect instruction, application validation, and focused tests to use this one shape.

Do not document or accept a top-level phase array.

## Required Change 3 — Strict Canonical Phase Map Consumer

The application must read the authoritative normalized phase array from:

```text
metadata.workflowData.phases
```

If that field is absent, malformed, or invalid, Phase Map projection must return the existing malformed state and the workflow must not advance.

Remove production logic that reparses the `champcity-phase-map` body block when canonical metadata phases are missing.

The fenced block remains visible review evidence. It is not an alternate machine authority.

Do not add any fallback, compatibility parser, legacy schema reader, or metadata reconstruction path.

## Required Change 4 — Phase Map Handoff Idempotency

For unchanged current Approved Project Profile and Project Roadmap evidence:

- repeated Prepare returns `alreadyPrepared: true`;
- handoff bytes remain identical;
- artifact revision does not increment;
- source revisions remain unchanged.

The metadata comparison must compare the same normalized field set on both sides.

A genuine Profile or Roadmap revision must create exactly one new handoff revision.

No hidden state, timestamp authority, or generated-value comparison may cause false revisions.

## Required Change 5 — Open-Workspace MCP Output Detection

While `project-phase-map` is open, use the established bounded polling model already used by the embedded Architect workspaces.

Required behavior:

- poll at the existing application interval;
- prevent overlapping requests;
- reject stale request completions;
- refresh document inventory only when the Phase Map evidence fingerprint changes;
- detect a newly created or substantively revised Phase Map;
- automatically select and load the current Phase Map output;
- refresh current workflow and resolver state;
- surface polling failures visibly;
- stop polling when leaving the workspace.

Do not add a filesystem watcher, background worker, hidden timer, manual import, or alternate persistence path.

## Required Change 6 — Project Planning Full-Lifecycle Contract

Generate the Project Planning handoff using:

```text
project-planning-output-submission-v2
```

The exact ordered Project Roadmap section contract is:

```text
Baseline Summary
Work-State Classification
MVP Scope
Sequenced Roadmap
Post-MVP Roadmap
Deferred and Conditional Work
Dependencies and Constraints
```

The following must use the same identifier and ordered section list:

- application contract constants;
- generated handoff metadata;
- generated handoff body;
- copied Architect instruction;
- Project Planning design document;
- focused tests.

Do not generate, accept, translate, or fall back to the former four-section v1 contract.

This requirement does not encode a blocker on the MCP implementation card. The Operator controls coordinated implementation and promotion.

## Clean Revisionary Validation Sequence

After deterministic approval and the Operator-authorized MCP deployment, Revisionary validation starts from its existing Approved Architect Interview:

```text
Prepare fresh Project Planning handoff
→ submit fresh Project Profile and full-lifecycle Project Roadmap through submit_handoff_outputs
→ review and approve the Project Planning bundle
→ prepare fresh Phase Map handoff
→ submit Phase Map through submit_handoff_outputs
→ application detects and selects Pending Phase Map
→ Operator applies Phase Map disposition
```

No deleted artifact is recreated by migration. Every output is generated through the current workflow.

## Preserve Accepted WC29 Behavior

Preserve:

- sole MCP output action `artifact_toolbox.submit_handoff_outputs`;
- Architect Interview unified submission instructions;
- absence of retired save actions;
- absence of Phase Map manual output import and IPC;
- embedded Phase Map browser surface;
- Phase Map-specific disposition controls;
- Project Planning ownership of Project Profile and Project Roadmap disposition;
- no generic Markdown writer fallback;
- no caller-supplied path, metadata, identity, revision, role, or disposition;
- accepted browser attachment authority and project navigation behavior.

## Authorized Production Surface

Expected changes are limited to:

```text
planning/project/Design_Documents/PROJECT_PLANNING_OUTPUT_SUBMISSION_CONTRACT.md
src/main/projectPlanning/projectPlanningPreflight.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/phaseMap/phaseMapService.ts
src/renderer/app/App.tsx
src/shared/workspaceContracts.ts only if polling model types require it
focused tests
Implementer Report
```

Do not add dependencies or perform Git operations.

## Required Proof

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. Generated Phase Map handoff `workflowData` contains exactly the five authorized fields and values.
2. ChampCity A/I defines and documents only the object-with-`phases` domain schema.
3. No top-level phase-array instruction remains in active production generation.
4. A fixture Phase Map handoff generated by ChampCity A/I is accepted by the current MCP phase-map contract without field translation.
5. Phase Map projection requires `metadata.workflowData.phases`.
6. No body-only compatibility parser or metadata reconstruction fallback remains in production source.
7. Repeated unchanged Phase Map Prepare is byte-idempotent and revision-stable.
8. One genuine Profile or Roadmap revision creates exactly one new handoff revision.
9. Open Phase Map workspace detects, selects, and previews a newly written Pending Phase Map without manual Refresh.
10. Phase Map polling is non-overlapping, request-ordered, visibly reports failure, and stops on navigation.
11. Project Planning generation uses only `project-planning-output-submission-v2` and the exact seven-section ordered Roadmap contract.
12. No Project Planning v1 compatibility, alias, translation, or fallback remains in active production generation.
13. Phase Map manual import and local save wiring remain absent.
14. Retired save actions and generic Markdown writer fallbacks remain absent.
15. No code attempts to migrate, preserve, recover, or reconcile the deleted Revisionary Project Planning or Phase Map artifacts.
16. `npm run typecheck`, `npm run build`, and `npm test` pass in the normal Windows lane.
17. Implementer Report states that Revisionary was intentionally reset by Operator deletion and that live validation begins from the existing Approved Architect Interview.

## Completion

Create the Implementer Report only after proof items 1–16 pass.

Revisionary running-product validation remains an Operator action after deterministic approval.

Do not package, promote, restart, reconnect, stage, commit, or push in this repair.
