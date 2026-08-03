<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC39"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30_reusable_architect_draft_ingestion_and_canonical_promotion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC30A_single_canonical_markdown_writer_consolidation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC37_phase_planning_workspace_and_atomic_bundle_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC38_dead_work_card_plan_candidate_revision_api_removal.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Unified Architect Output Catalog and Main-Process Runtime Consolidation",
    "status": "approved_for_implementation",
    "executionMode": "one bounded backend consolidation with no product-surface cutover",
    "dependsOn": [
      "WC38"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39_unified_architect_output_catalog_and_main_process_runtime_consolidation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Replace the five duplicated workspace-local Architect-output submission runtimes with one production catalog, registry, and coordinator while preserving current IPC, renderer, review, and Operator-visible behavior for WC40's simultaneous product cutover.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# WC39 — Unified Architect Output Catalog and Main-Process Runtime Consolidation

Status: Approved for Implementer execution after WC38 acceptance  
Git mutation: prohibited

## Verified Repository Evidence

The approved WC30 foundation centralized temporary draft paths, exact-slot inspection, canonical promotion, canonical writing, rollback, verification, and cleanup. It did not provide the stateful production coordinator needed by later workspace adoptions.

The five completed draft-ingestion cutovers therefore created separate production runtimes in:

```text
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
```

Each currently owns local equivalents of:

```text
active submission storage
submission-to-domain-context storage
request ordinals
promotion workspace lookup
one single-definition registry
prepare/status/promotion/retry orchestration
```

Repository review confirmed repeated production identifiers including:

```text
activeByWorkspace
definitionContextByWorkspaceSubmission
requestOrdinalByWorkspace
currentPromotionWorkspaceRoot
createArchitectOutputRegistry([definition])
```

This contradicts the WC30 requirement that a future definition must not require copied draft discovery, polling, transaction orchestration, cleanup, or generic error handling.

The approved workflow maps identify seven embedded-Architect output flows producing nine final canonical Markdown documents. Five flows are already draft-ingestion flows. Formal Work Card and Repair Work Card remain direct-save flows and are intentionally reserved for WC40.

## Complete Architect Output Catalog

WC39 records the complete catalog so the backend architecture is designed once. Only the first five definitions are active in WC39; definitions six and seven become active together in WC40.

| # | Output kind | Owning workspace | Mode | Final Markdown output(s) | WC39 state |
|---:|---|---|---|---|---|
| 1 | `project-architect-interview` | `architect-interview` | single | Project Architect Interview | active and consolidated |
| 2 | `project-planning` | `project-planning-review` | atomic bundle | Project Profile; Project Roadmap | active and consolidated |
| 3 | `phase-map` | `project-phase-map` | single | Phase Map | active and consolidated |
| 4 | `phase-interview` | `phase-interview` | single | Phase Interview | active and consolidated |
| 5 | `phase-planning-bundle` | `phase-planning-bundle` | atomic bundle | Phase Planning; Work Card Plan | active and consolidated |
| 6 | `formal-work-card` | `work-card-planning` | single | Formal Work Card | cataloged; activation deferred to WC40 |
| 7 | `repair-work-card` | `work-card-repair` | single | Repair Work Card | cataloged; activation deferred to WC40 |

The following are application-generated non-review inputs, not Architect-output definitions:

```text
Project Architect Interview Prompt
Project Planning Handoff
Phase Map Handoff
Phase Interview Handoff
Phase Planning Handoff
Work Card Intake Handoff
Repair Architect Handoff
```

Implementer Reports, Validation Records, Phase Closeouts, and Project Closeouts are also outside this catalog.

## Objective

Create one main-process Architect-output runtime for the five existing draft-ingestion flows without changing their current product surfaces.

```text
current authoritative repository evidence
→ existing workspace-specific service entry point
→ one production catalog resolves the definition
→ one shared coordinator prepares or reuses the active submission
→ existing handoff instruction exposes exact temporary draft paths
→ existing polling/service call asks the coordinator to inspect and promote
→ shared WC30 services write and verify the final single output or atomic bundle
→ existing workspace model, IPC, preload, renderer, review, and downstream behavior remain externally unchanged
```

WC39 is complete only when the five flows use one registry and one stateful coordinator and no workspace-local runtime remains.

## Architecture Decisions

### 1. One production catalog

Create:

```text
src/main/architectOutputs/productionArchitectOutputCatalog.ts
```

The module must:

- define the complete seven-flow catalog as typed production metadata;
- register the five WC39-active definitions in one production `ArchitectOutputRegistry` instance;
- expose the two WC40 definitions as typed inactive catalog entries without implementing or registering their runtime callbacks;
- support lookup of active definitions by `outputKind` and owning workspace ID;
- use `project-phase-map` as the Phase Map owning workspace ID;
- reject duplicate output kinds, owning workspace IDs, and slot IDs;
- contain no active-submission state, ordinals, polling state, or repository mutation logic.

No other production file may call `createArchitectOutputRegistry()` after WC39.

Test-only fixture registries remain permitted under `test/`.

### 2. One shared production coordinator

Create:

```text
src/main/architectOutputs/architectOutputRuntimeService.ts
```

The coordinator owns the only production instances of:

```text
active submission per repository root + owning workspace ID
request ordinal per repository root + owning workspace ID
resolved domain-context snapshot per submission
promotion result and bounded cleanup result
```

It provides the only production implementation of:

```text
prepare or reuse active submission
get active submission
inspect active submission
promote a ready submission
record promotion failure
create explicit retry after failure
return current submission status
```

The coordinator must use the existing shared services:

```text
createArchitectDraftSubmission()
inspectArchitectDraftSubmission()
promoteArchitectDraftSubmission()
```

It must not duplicate their path, inspection, validation, transaction, verification, or cleanup algorithms.

### 3. Explicit typed runtime context

Canonical document construction must receive these values explicitly:

```text
workspaceRoot
active submission
resolved typed domain context
```

Remove implicit global workspace discovery through `currentPromotionWorkspaceRoot` or scanning active submissions by submission ID.

A narrow typed extension to `ArchitectOutputDefinition` or the promotion input is authorized when required. Do not replace the current typed contract with untyped callback bags or generic `Record<string, unknown>` authority.

### 4. Domain adapters retain domain decisions

Each active definition or adjacent domain adapter continues to own:

- current evidence and readiness resolution;
- current Approved handoff selection or generation;
- source revisions;
- exact final target resolution;
- creation-versus-`RevisionRequested` replacement eligibility;
- body validation;
- canonical metadata construction;
- post-promotion selection and downstream meaning.

Domain adapters must no longer own:

- active-submission maps;
- request ordinals;
- submission-context maps;
- registries;
- promotion workspace globals;
- generic inspection, promotion, retry, or cleanup orchestration.

### 5. Preserve current submission semantics

For all five active definitions:

```text
Prepare
→ resolve current domain context
→ enforce current creation/revision eligibility
→ generate or reuse the current handoff under existing domain rules
→ create one submission when none is active
→ reuse a matching waiting or partial submission
```

Required behavior:

- repeated preparation reuses an active `waiting-for-drafts` or `partial-draft-set` submission for the same current handoff;
- polling/status checks never create a submission or advance the ordinal;
- one explicit preparation after `promotion-failed` creates one fresh submission and advances the ordinal once;
- failed drafts remain untouched;
- a promoted submission cannot be reused for another substantive revision;
- current domain eligibility is revalidated immediately before promotion;
- a partial temporary draft set creates no final output;
- malformed drafts create no final output and remain available for diagnosis;
- cleanup failure after verified final installation remains a promoted result with a separate cleanup failure.

Existing workspace-specific copy semantics remain unchanged in WC39. WC40 owns the unified Prepare-versus-Copy contract.

### 6. Preserve current final-authority rules

WC39 must not change the existing creation and revision contract of any active flow.

Fresh creation remains permitted only when the expected final target or complete bundle is absent.

Substantive replacement remains permitted only under each current domain's approved `RevisionRequested` rules.

Final metadata, source revisions, participation roles, workflow data, dispositions, revision increments, bundle atomicity, and cleanup ordering remain application-owned.

Project Planning and Phase Planning bundle-policy unification is deferred to WC40's shared review/model cutover. WC39 must not introduce another local policy or alter Operator-visible rail state.

## Required Changes

1. Add the production catalog module and one production registry.
2. Add the shared runtime coordinator.
3. Make each of the five active definition modules export domain definition/adapter behavior without owning runtime state.
4. Route their existing prepare/status entry points through the shared coordinator.
5. Remove every workspace-local registry, active-submission map, context map, request-ordinal map, promotion workspace global, submission lookup, and duplicated status/promotion loop.
6. Correct the active Phase Map definition owner from `phase-map` to `project-phase-map` while preserving the existing workspace and renderer behavior.
7. Preserve current IPC, preload, shared API method names, renderer polling modules, action bars, review components, and current-workflow projection as temporary external façades.
8. Preserve Formal Work Card and Repair Work Card direct-save behavior unchanged for WC40.

Temporary façades may delegate to the coordinator. They may not retain independent runtime state or promotion logic.

## Preserved Behavior

Preserve exactly:

- all current workspace IDs, lifecycle locations, and ordering;
- current five handoff formats and temporary draft invocation instructions;
- current final target families;
- current body validators and canonical metadata builders;
- current single-output and atomic-bundle behavior;
- current source freshness and downstream invalidation;
- current review and disposition behavior;
- current IPC and preload surfaces;
- current renderer layout, polling cadence, action labels, preview components, and viewed-revision behavior;
- current workflow routing and downstream eligibility;
- Formal Work Card and Repair Work Card manual/direct-save paths pending WC40;
- embedded browser security, session partitioning, navigation, attachment, and sign-in behavior;
- the shared canonical writer and artifact transaction;
- no JSON sidecars and no legacy-planning migration.

## Authorized Surface

Expected shared production additions or changes:

```text
src/shared/architectOutputs/architectOutputContracts.ts only for narrow typed runtime context
src/main/architectOutputs/architectOutputRegistry.ts
src/main/architectOutputs/productionArchitectOutputCatalog.ts
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/architectOutputs/architectDraftPromotionService.ts only for narrow explicit-context plumbing
```

Expected domain changes:

```text
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
```

Narrow changes to their adjacent service modules are authorized only when required to delegate existing entry points to the coordinator without changing external behavior.

Expected tests:

```text
test/architect-outputs/
focused existing tests for the five active flows
test/repository/runtime-wiring-source.test.cjs
```

Expected report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC39_unified_architect_output_catalog_and_main_process_runtime_consolidation.md
```

No renderer, preload, generic IPC, current-workflow, Formal Work Card, or Repair Work Card production change is expected. An adjacent change requires a concrete compilation necessity explanation and must preserve the WC39 boundary.

## Acceptance Criteria

1. The typed production catalog identifies all seven approved Architect-output flows and nine final Markdown documents.
2. One production registry contains exactly the five WC39-active definitions; the two WC40 entries are cataloged but inactive.
3. Exactly one production active-submission store and one production request-ordinal store exist.
4. No active definition module contains `activeByWorkspace`, `definitionContextByWorkspaceSubmission`, `requestOrdinalByWorkspace`, `currentPromotionWorkspaceRoot`, a production registry, or an equivalent local runtime.
5. The five existing workspace service entry points delegate to the shared coordinator and retain their current public behavior.
6. Phase Map resolves through owning workspace ID `project-phase-map` without changing the visible workspace.
7. Preparation, polling, partial drafts, valid promotion, malformed-draft retention, explicit retry, and cleanup-failure outcomes follow the required shared semantics.
8. Project Planning and Phase Planning remain atomic bundles; the other three active definitions remain single outputs.
9. Current metadata, revision, freshness, disposition, body-validation, final-target, and downstream rules are unchanged.
10. Current IPC, preload, renderer, review, and workflow-resolution behavior is unchanged.
11. Formal Work Card and Repair Work Card direct-save paths remain unchanged and are not partially migrated.
12. No second registry, coordinator, inspection algorithm, promotion algorithm, canonical writer, fallback, compatibility route, or hidden authority is introduced.
13. Typecheck, build, and the complete test lane pass in the normal Windows environment.
14. Operator running-product validation is not required because WC39 introduces no intended visible behavior change.
15. No Git operation occurs.

## Required Proof

The Implementer Report must map each acceptance criterion to concrete evidence.

Required production-path proof:

- load the five active definitions from the production catalog;
- exercise one existing single-output flow and one existing atomic-bundle flow through their real service entry points and the shared coordinator;
- prove partial draft, successful promotion, malformed retention, explicit retry, and cleanup-failure outcomes through the coordinator;
- prove each of the remaining three active definitions resolves and prepares through the same coordinator;
- confirm existing downstream projections remain unchanged for all five flows.

Required absence proof:

```text
one production createArchitectOutputRegistry call
one production active-submission store
one production request-ordinal store
no currentPromotionWorkspaceRoot
no workspace-local submission-context map
no duplicate status/promotion loop
```

Source searches support these absence claims. They do not substitute for the production-path scenarios.

Do not create one new test suite per workspace or increase test count for its own sake. Tests must target the shared runtime contract and the real production adapters.

## Negative Constraints

Do not:

- activate Formal Work Card or Repair Work Card definitions;
- change or remove their direct-save routes;
- add generic Architect-output IPC or preload methods;
- change renderer polling, actions, review UI, or layout;
- change current-workflow projection;
- unify bundle review policy in this card;
- introduce another workspace-by-workspace cutover;
- add compatibility wrappers around removed runtime state;
- duplicate WC30 inspection, promotion, canonical writing, rollback, or cleanup;
- add persisted submission state, databases, marker files, hashes, digests, tokens, or background workers;
- add legacy-planning preservation or migration;
- alter embedded-browser security or automate ChatGPT;
- add dependencies without explicit Operator approval;
- perform Git operations.

## Implementer Report Requirements

Create the Implementer Report only after acceptance criteria 1–13 pass.

The report must:

- list every created and modified file;
- reproduce the seven-flow catalog and identify the five active definitions;
- identify every deleted local registry, submission store, context store, ordinal store, promotion global, and duplicated orchestration path;
- identify the one production registry and one coordinator;
- map acceptance criteria to production-path evidence;
- record typecheck, build, focused proof, and complete test results;
- explain any adjacent compilation-only change;
- state that current product surfaces and the two direct-save flows were intentionally preserved for WC40;
- disclose any residual duplication or risk;
- state that no fallback, migration, dependency, or Git mutation occurred.
