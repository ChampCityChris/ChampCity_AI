<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC33"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC31_project_architect_interview_draft_ingestion_pilot_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC31-REPAIR01_interview_cutover_contract_and_retry_repair.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Project Planning Atomic-Bundle Draft-Ingestion Cutover",
    "status": "approved_for_implementation",
    "executionMode": "one bounded production cutover",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC33_project_planning_atomic_bundle_draft_ingestion_cutover.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Cut over only Project Planning Profile and Roadmap output creation to one WC30 atomic draft bundle. Preserve current reconciliation, evidence, review, synchronization, and lifecycle authority.",
    "reviewedAt": "2026-07-31"
  }
}
CHAMPCITY-METADATA -->

# WC33 — Project Planning Atomic-Bundle Draft-Ingestion Cutover

Status: Approved for Implementer execution  
Git mutation: prohibited

## Code-Review Finding

The current Project Planning application already owns:

- readiness from Approved Intake, Prompt, and Interview;
- repository preflight and reconciliation mode;
- evidence and legacy-planning paths;
- final Profile and Roadmap targets;
- required sections;
- canonical output validation and freshness;
- synchronized bundle review and shared disposition;
- Project Planning completion and Phase Map readiness.

The obsolete output path is:

```text
Project Planning handoff
→ instructs ChatGPT to call artifact_toolbox.submit_handoff_outputs
→ MCP/domain route creates final canonical Profile and Roadmap
→ application detects final files
```

Replace only that path with one WC30 atomic-bundle submission.

## Objective

```text
current Approved Project Planning handoff
→ application prepares one deterministic two-slot submission
→ handoff supplies exact temporary Profile and Roadmap draft paths
→ ChatGPT creates both body-only drafts through artifact_toolbox.create_markdown_artifact
→ application waits until both drafts are present
→ WC30 validates and atomically promotes both canonical documents
→ successful verification removes both consumed drafts
→ existing synchronized bundle review surface displays both Pending outputs
```

## 1. One Production Atomic-Bundle Definition

Register exactly one additional production `ArchitectOutputDefinition`:

```text
outputKind: project-planning
owningWorkspaceId: project-planning-review
bundleMode: atomic-bundle
slots:
  project-profile.md
  project-roadmap.md
```

Use `resolveProjectPlanningContext()` and the current Approved handoff as authority for:

- project identity;
- final Profile and Roadmap paths;
- source revisions, including the current handoff revision;
- reconciliation and evidence context;
- required Profile and Roadmap sections;
- current output eligibility.

Do not duplicate repository preflight, reconciliation, freshness, synchronization, or review logic.

## 2. Exact Generic Draft Handoff

Replace the active Project Planning `submit_handoff_outputs` instructions with two exact generic toolbox calls using one application-generated bundle submission:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<exact temporary Project Profile draft path>",
    "content": "<complete body-only Project Profile Markdown>",
    "overwrite": false
  }
}
```

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<exact temporary Project Roadmap draft path>",
    "content": "<complete body-only Project Roadmap Markdown>",
    "overwrite": false
  }
}
```

The handoff must:

- retain the current inputs, reconciliation context, evidence instructions, required headings, roadmap coverage, and Operator revision notes;
- state that both drafts belong to one atomic bundle;
- require body-only Markdown with no metadata delimiters or canonical metadata;
- state that MCP creates only temporary drafts;
- state that ChampCity A/I owns final targets, metadata, validation, revision, atomic promotion, and review state;
- remain incomplete until both drafts are created and the application promotes the bundle;
- contain no active `submit_handoff_outputs`, `handoffKind`, domain save action, final-target write instruction, fallback, or manual import.

## 3. Atomic Creation and Guarded Bundle Revision

### No existing outputs

Promote both documents atomically as revision 1 with:

```text
Project Profile artifactType=project-profile
Project Roadmap artifactType=project-roadmap
participationRole=compoundGatingReview
current project identity
current source revisions
Pending disposition
notes=""
reviewedAt=null
```

### Existing eligible bundle

Allow substantive replacement only when both current outputs are the synchronized, readable, identity-matching bundle resolved by `resolveProjectPlanningContext()` and both are `RevisionRequested` under the current handoff.

Promote atomically at the same final paths using shared substantive-revision semantics:

```text
each artifactRevision + 1
current source revisions
new bodies
Pending disposition
notes cleared
reviewedAt cleared
```

### Ineligible or partial existing state

Block promotion and retain both drafts when the existing state is partial, mixed, malformed, unmanaged, stale outside the current revision workflow, identity-conflicting, wrong type/role, duplicated, or otherwise not the current eligible bundle. Existing final files must remain byte-identical.

Never install only one final document.

## 4. Explicit Retry and Polling

Use the approved WC30 deterministic identity builder with a process-owned per-workspace request ordinal.

- polling must not create or advance submissions;
- one explicit prepare/copy action creates one bundle submission and advances the ordinal once;
- a malformed or failed bundle retains both submitted drafts and creates no final changes;
- the next explicit prepare/copy action creates a distinct submission with two new absent draft paths;
- failed drafts remain untouched;
- do not add background discovery, abandoned-draft cleanup, migration, or persistent run state.

## 5. Remove Only the Retired Project Planning Output Route

Remove active Project Planning reliance on:

- `artifact_toolbox.submit_handoff_outputs`;
- `handoffKind=project-planning` as an MCP write selector;
- any Project Planning direct final-body save or domain persistence path;
- old-action fallback, alias, dual write, manual import, or file-copy recovery.

Preserve handoff generation, copy action, model polling, bundle review, and lifecycle resolution.

## Authorized Surface

Expected changes are limited to:

```text
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningContext.ts only for a narrow read-only eligibility accessor
one adjacent Project Planning draft-bundle orchestration/definition module
src/main/integrations/architectMcpHandoffService.ts only if Project Planning shares it
src/main/main.ts only if existing prepare/copy wiring requires narrow adjustment
src/shared/workspaceContracts.ts only for draft status/error fields
src/renderer/app/App.tsx only for existing polling/status presentation
focused Project Planning and WC30 integration tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC33_project_planning_atomic_bundle_draft_ingestion_cutover.md
```

Do not alter WC30 algorithms. A real WC30 defect must be documented in the Implementer Report and reviewed on technical merit; do not add a parallel algorithm.

## Required Proof

1. Exactly two production definitions exist: Architect Interview and Project Planning.
2. Project Planning uses one WC30 atomic-bundle submission with exactly two expected draft slots.
3. The generated handoff contains two executable action/workspace/params calls using exact draft paths and `overwrite:false`.
4. No active Project Planning `submit_handoff_outputs`, handoff-kind write selector, fallback, alias, dual write, or manual import remains.
5. Polling is stable; each explicit preparation creates exactly one new bundle submission.
6. One present draft does not promote or create a partial final bundle.
7. Two valid drafts promote atomically as revision 1 when outputs are absent.
8. Successful verification precedes cleanup of both drafts.
9. Failure in either body or final verification creates no partial final bundle and retains submitted drafts.
10. A synchronized eligible `RevisionRequested` bundle revises both final files atomically, increments each once, and resets both to Pending.
11. Partial, mixed, stale, conflicting, or otherwise ineligible existing outputs remain byte-identical and block promotion.
12. Explicit retry uses two new draft paths and leaves failed drafts untouched.
13. Current reconciliation, evidence, required-section, bundle-review, completion, and Phase Map readiness behavior remains unchanged.
14. Architect Interview and every other output flow remain unchanged.
15. Typecheck, build, and complete tests pass in the normal Windows lane.
16. Operator running-product validation remains pending.

## Operator Validation

Use a fresh or controlled Revisionary project state:

```text
Approved Architect Interview
→ prepare/copy Project Planning handoff
→ confirm two exact temporary draft paths
→ create both drafts through generic MCP writes
→ confirm no promotion after only one draft
→ confirm atomic promotion after both drafts
→ confirm both drafts are removed after verification
→ confirm Profile and Roadmap appear Pending and synchronized
→ apply one shared Approved disposition
→ confirm Phase Map becomes ready
```

Also validate one malformed/partial attempt and one `RevisionRequested` bundle replacement.

## Non-Scope

Do not change Project Planning content requirements, reconciliation policy, Project Intake, Architect Interview, Phase Map, later lifecycle prompts, MCP implementation, WC30 algorithms, canonical metadata schema, or review governance. Do not add dependencies or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–15 pass. Do not claim Operator running-product validation.
