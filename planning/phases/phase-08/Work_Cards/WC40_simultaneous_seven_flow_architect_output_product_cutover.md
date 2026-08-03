<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC39_unified_embedded_architect_output_catalog_and_runtime_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "revision": 2
    },
    {
      "path": "planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Simultaneous Seven-Flow Architect Output Product Cutover",
    "status": "approved_for_implementation",
    "executionMode": "one coordinated product-surface cutover after approved backend consolidation",
    "dependsOn": [
      "WC39"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40_simultaneous_seven_flow_architect_output_product_cutover.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Activate all seven catalog definitions together; cut Formal and Repair Work Cards over to temporary drafts; replace workspace-specific IPC, polling, actions, and review surfaces with one generic product path; remove every temporary façade and direct-save route.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# WC40 — Simultaneous Seven-Flow Architect Output Product Cutover

Status: Approved for Implementer execution after WC39 acceptance  
Git mutation: prohibited

## Entry Condition

WC40 begins only after Architect approval of WC39 confirms:

```text
one production Architect-output catalog
one production registry
one shared main-process runtime coordinator
five existing draft-ingestion definitions delegated to that coordinator
no workspace-local submission state or promotion orchestration
```

Do not use WC40 to repair an incomplete WC39 consolidation. A backend defect discovered during WC40 must be reported rather than hidden through another local implementation.

## Verified Product-Path Defects

After WC39, the backend is shared but the product still exposes duplicated or incomplete output surfaces:

- workspace-specific model, prepare, copy, and review IPC/preload methods;
- separate renderer polling modules and Project Planning polling embedded in `App.tsx`;
- separate action bars and review components;
- independent viewed-revision state and bundle synchronization policy;
- `currentWorkflowService.ts` independently inferring Architect-output readiness;
- Formal Work Card and Repair Work Card renderer textareas and direct final-save IPC routes;
- temporary workspace-specific service façades retained only to preserve WC39 behavior.

These surfaces must be cut over together. No later workspace-specific adoption card is authorized.

## Objective

Switch all seven approved embedded-Architect output flows to one production product path.

```text
current authoritative repository evidence
→ generic Architect-output workspace model resolves the owning catalog definition
→ Operator Prepare validates eligibility and creates or reuses one shared-runtime submission
→ Operator Copy copies the already-prepared instruction without mutation
→ embedded ChatGPT writes body-only Markdown to the exact temporary slot path or paths
→ one generic renderer refresh calls the promotion-capable model
→ WC39 coordinator inspects and promotes the single output or atomic bundle
→ one shared review shell presents every current output revision
→ one generic review operation applies single or compound disposition
→ current workflow consumes the shared model and projects the next lifecycle action
→ Operator sees the same workflow pattern in all seven workspaces
```

The completed product catalog contains seven active definitions and nine slots:

| Output kind | Owning workspace | Mode | Slots |
|---|---|---|---|
| `project-architect-interview` | `architect-interview` | single | Architect Interview |
| `project-planning` | `project-planning-review` | atomic bundle | Project Profile; Project Roadmap |
| `phase-map` | `project-phase-map` | single | Phase Map |
| `phase-interview` | `phase-interview` | single | Phase Interview |
| `phase-planning-bundle` | `phase-planning-bundle` | atomic bundle | Phase Planning; Work Card Plan |
| `formal-work-card` | `work-card-planning` | single | Formal Work Card |
| `repair-work-card` | `work-card-repair` | single | Repair Work Card |

## Required Runtime Sequence

### Prepare

For every owning workspace, `Prepare Handoff` performs exactly:

```text
resolve current domain context
→ classify current final target state
→ block before handoff mutation when state is ineligible
→ generate or reuse the current Approved non-review handoff
→ create or reuse one WC39 coordinator submission
→ return one instruction containing one create_markdown_artifact invocation per slot
```

Preparation rules:

- every expected final target absent permits fresh creation;
- a complete current `RevisionRequested` output or synchronized bundle permits substantive revision;
- partial, malformed, stale, mixed, wrong-type, wrong-role, wrong-identity, Pending, Approved, Rejected, or otherwise ineligible current targets produce `Needs Attention` and no mutation;
- an active matching waiting or partial submission is reused;
- one explicit Prepare after `promotion-failed` creates fresh absent draft paths and advances the shared ordinal once;
- failed drafts remain untouched.

### Copy

`Copy Handoff` copies only the already-prepared instruction.

It must not:

- generate or revise a handoff;
- create or retry a submission;
- advance an ordinal;
- inspect or promote drafts.

Without a prepared current instruction, Copy returns an actionable Prepare-first error.

### Polling and refresh

Polling:

```text
get promotion-capable generic workspace model
→ list current planning documents
→ compare one catalog-aware fingerprint
→ refresh workflow projection only when evidence changed or refresh is forced
→ select the catalog-defined handoff or final output
```

Polling never creates a handoff, submission, retry, or ordinal.

### Promotion

Promotion remains owned by the WC39 coordinator and WC30 services:

```text
inspect exact declared draft paths
→ require every slot
→ apply generic and domain validators
→ re-resolve current context and eligibility
→ build application-owned canonical output(s)
→ write one output or one atomic bundle
→ reread and verify every final file
→ mark promoted
→ attempt bounded cleanup
```

A cleanup failure after verified installation remains `promoted` with a separate cleanup failure.

## 1. Activate the Complete Catalog

Convert the two WC39 inactive entries into full active definitions:

```text
formal-work-card / work-card-planning
repair-work-card / work-card-repair
```

The production registry must then contain exactly seven definitions and nine slots.

No additional embedded-Architect output definition is authorized by WC40.

## 2. Formal Work Card Draft Cutover

### Source authority

Use the current Approved `work-card-intake-handoff` as authority for:

- selected phase and Work Card identity;
- exact candidate object;
- exact final target;
- current source revisions;
- creation or `RevisionRequested` replacement eligibility.

### Exact body contract

The Architect produces one complete body with these exact headings:

```text
# <work-card-id> — <candidate title>
## Verified Repository Evidence
## Objective
## Runtime Sequence
## Required Changes
## Preserved Behavior
## Authorized Surface
## Risks and Constraints
## Acceptance Criteria
## Negative Constraints
## Implementer Report Requirements
## Manual Validation
```

Validate:

- one H1 beginning with the exact selected Work Card ID;
- every exact H2 once;
- substantive content under each H2;
- no application metadata delimiters;
- no embedded canonical metadata or alternate application schema.

The application constructs final metadata:

```text
artifactType=formal-work-card
participationRole=gatingReview
identity.phaseId=<handoff phase>
identity.workCardId=<candidate ID>
identity.candidateId=<candidate ID>
workflowData.candidate=<exact handoff candidate>
workflowData.returnToPhasePlanningOnRejected=true
current source revisions
Pending disposition
```

Approved remains the sole Implementer instruction and Work Card Building gate.

## 3. Repair Work Card Draft Cutover

### Source authority

Use the current Approved Repair Architect handoff as authority for:

- repair ID;
- original parent Work Card ID;
- origin;
- exact evidence path and revision;
- bounded defect;
- exact final target;
- application-owned return target;
- current source revisions;
- creation or `RevisionRequested` replacement eligibility.

### Exact body contract

The Architect produces one complete body with these exact headings:

```text
# <repair-id> — <bounded repair title>
## Confirmed Defect
## Source Evidence
## Objective
## Runtime Sequence
## Required Changes
## Preserved Behavior
## Authorized Surface
## Acceptance Criteria
## Negative Constraints
## Return Target
## Implementer Report Requirements
## Manual Validation
```

Validate:

- one H1 beginning with the exact repair ID;
- every exact H2 once;
- substantive content under each H2;
- Return Target content agreeing with the handoff's application-owned return target;
- no metadata delimiters;
- no nested repair-parent authority or alternate schema.

The application constructs final identity, original-parent identity, origin, evidence path, bounded defect, return target, source revisions, and Pending disposition from the handoff.

Repair sibling numbering and return behavior remain unchanged.

## 4. Retire Direct-Save and Manual-Import Paths

Remove completely:

```text
saveFormalWorkCardOutput()
workCardPlanning:saveOutput
ChampCityApi.saveFormalWorkCardOutput
FormalWorkCardOutputSaveResult
renderer formalWorkCardMarkdown state and textarea

saveRepairWorkCardOutput()
workCardRepair:saveOutput
ChampCityApi.saveRepairWorkCardOutput
RepairWorkCardOutputSaveResult
renderer repairWorkCardMarkdown state and textarea

LifecycleArchitectOutputImport
Save Architect Output control
```

No fallback, alias, compatibility wrapper, local import, clipboard-to-final-file path, or duplicate canonical writer is permitted.

## 5. One Generic IPC and Preload Contract

Expose exactly these Architect-output operations:

```text
architectOutput:getWorkspaceModel(workspaceId)
architectOutput:prepareHandoff(workspaceId)
architectOutput:copyHandoff(workspaceId)
architectOutput:review(workspaceId, status, operatorReviewNotes)
```

Shared renderer API:

```text
getArchitectOutputWorkspaceModel(workspaceId)
prepareArchitectOutputHandoff(workspaceId)
copyArchitectOutputHandoff(workspaceId)
reviewArchitectOutput(workspaceId, status, operatorReviewNotes)
```

The main process validates that `workspaceId` owns an active production catalog definition.

The renderer may not provide:

- output kind;
- slot definitions;
- draft or final paths;
- source revisions;
- metadata;
- domain context;
- validators.

Remove all workspace-specific Architect-output model, prepare, copy, and review IPC/preload methods after consumers use the generic API.

Browser attachment, navigation, authentication, and sign-in APIs remain separate and unchanged.

## 6. One Shared Workspace Model and State Policy

Create one discriminated workspace model containing:

```text
workspaceId
outputKind
bundleMode
state
railStatus
requiredAction
reason
evidencePaths
handoff path and revision
prepared instruction when present
submission state
promotion and cleanup errors
canPrepareHandoff
canCopyHandoff
reviewMode
document slot identities
canApplyDisposition
shared review notes
typed domain presentation context
```

Each document slot exposes:

```text
slotId
displayLabel
targetPath
logicalDocumentId when present
artifactRevision when present
disposition when present
documentReadState
freshnessState
readError when present
```

Use these states:

```text
not-ready
ready-for-handoff
waiting-for-drafts
partial-draft-set
promotion-failed
ready-for-review
revision-requested
rejected
completed
needs-attention
```

Rail mapping:

```text
not-ready          → Not Ready
ready-for-handoff  → Ready
waiting-for-drafts → Waiting for Output
partial-draft-set  → Waiting for Output
promotion-failed   → Needs Attention
ready-for-review   → Awaiting Approval
revision-requested → Awaiting Approval
rejected           → Needs Attention
completed          → Completed
needs-attention    → Needs Attention
```

A partial current final set is `needs-attention`. `partial-draft-set` applies only to temporary drafts.

Domain services may supply typed evidence and downstream meaning. They must not reimplement generic state or rail mapping.

## 7. One Review Operation

### Single output

Review requires one exact current, readable, fresh, type-valid, role-valid, identity-valid document.

### Atomic bundle

Review requires every catalog slot and synchronized current authority:

```text
same disposition
same review notes
correct current source revisions
readable and fresh members
correct type, role, and identity
```

One review action applies:

```text
one status
one notes value
one reviewedAt timestamp
```

atomically to every member.

For both modes:

- `RevisionRequested` requires non-empty instructions;
- approval requires every current output revision to have been viewed;
- catalog workspaces cannot use generic `documents:setDisposition` or `currentWorkflow:applyDisposition` as review authority.

## 8. One Renderer Refresh, Action Bar, and Review Shell

Create one refresh module:

```text
src/renderer/app/architectOutputWorkspaceRefresh.ts
```

Create one shared action component for:

```text
Prepare Handoff
Copy Handoff
Refresh Outputs
```

Create one shared review shell that:

- displays one selector per catalog slot;
- tracks viewed keys as `slotId + targetPath + artifactRevision`;
- disables Approved until all current revisions are viewed;
- provides one disposition selection and one notes field;
- requires notes for `RevisionRequested`;
- calls the generic review API;
- supports both single and compound definitions.

Domain preview plug-ins, including the structured Phase Map presentation, may render inside the shell. They may not own another polling, action, viewed-state, or review implementation.

Delete:

```text
src/renderer/app/phaseMapWorkspaceRefresh.ts
src/renderer/app/phaseInterviewWorkspaceRefresh.ts
src/renderer/app/phasePlanningWorkspaceRefresh.ts
separate Project Planning polling in App.tsx
workspace-specific Architect-output action bars
separate Project Planning and Phase Planning review components
temporary WC39 product façades no longer needed
```

## 9. Current Workflow Consumes the Shared Model

For the seven owning workspace IDs, `currentWorkflowService.ts` must consume the generic Architect-output workspace model rather than independently infer readiness from file presence.

It projects:

- current target;
- state and rail status;
- required action;
- blockers;
- draft and promotion state;
- review eligibility;
- expected next lifecycle result.

Candidate selection, phase selection, validation, close, and non-Architect workspaces retain their existing services.

No hidden active-workspace state is authorized.

## Preserved Behavior

Preserve:

- the nested Project → Phase → Work Card lifecycle;
- all stable workspace IDs, lifecycle locations, and order;
- application-generated Approved non-review handoffs;
- exact final target families;
- current source freshness and downstream invalidation;
- current Project Planning, Phase Map, Phase Interview, Phase Planning, and candidate validators;
- exact Work Card candidate array projection and downstream selection;
- Approved Formal Work Card as the sole Implementer instruction;
- repair sibling numbering, original-parent authority, and pre/post-validation return targets;
- Operator-created Validation Records and close behavior;
- the WC39 catalog, registry, coordinator, and submission semantics;
- the shared canonical writer, rollback, final verification, and cleanup outcome;
- secure embedded browser behavior;
- no provider API, DOM automation, or automatic message submission;
- no JSON sidecars, legacy migration, or compatibility authority.

## Authorized Surface

Expected shared production changes:

```text
src/shared/architectOutputs/architectOutputContracts.ts
src/shared/workspaceContracts.ts
src/main/architectOutputs/productionArchitectOutputCatalog.ts
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/main.ts
src/preload/index.ts
src/main/currentWorkflow/currentWorkflowService.ts
```

Expected domain changes:

```text
src/main/architectInterview/architectInterviewService.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardRepair/workCardRepairService.ts
```

Expected renderer changes:

```text
src/renderer/app/App.tsx
src/renderer/app/architectOutputWorkspaceRefresh.ts
one shared Architect-output action component
one shared Architect-output review component
src/renderer/app/phaseMapPresentation.tsx only as a preview plug-in
src/renderer/app/workflowReviewDocuments.ts when needed
src/renderer/styles.css
```

Expected deletions include the retired refresh modules, action components, direct-save APIs, manual import component, and temporary WC39 façade code.

Focused test changes are authorized under the current Architect-output, renderer, workflow, Work Card Planning, and Work Card Repair test directories.

Expected report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40_simultaneous_seven_flow_architect_output_product_cutover.md
```

A narrow adjacent context-resolver change is allowed only when required for the fixed catalog contract and documented in the report.

## Production-Path Acceptance Criteria

1. The production registry contains exactly seven active definitions and nine slots.
2. All seven owning workspaces use the WC39 coordinator through one generic workspace model.
3. Formal Work Card and Repair Work Card use body-only temporary drafts and application-owned promotion.
4. Both direct-save routes, renderer textareas, and manual Save Architect Output control are absent with no fallback or alias.
5. The generic IPC/preload contract is the sole Architect-output action surface.
6. One renderer refresh module, one action component, and one review shell serve all seven workspaces.
7. Prepare, Copy, polling, retry, and ordinal behavior match the required sequence.
8. One present bundle draft creates no final output; complete valid drafts promote through the shared coordinator.
9. Malformed drafts preserve drafts and final authority; explicit retry creates fresh paths.
10. Fresh creation produces revision 1 Pending canonical output with exact application-owned metadata.
11. Eligible `RevisionRequested` replacement increments each affected revision once and resets review state.
12. Partial or otherwise ineligible current final states are `Needs Attention`, disable Prepare, cause no handoff/submission/final mutation, and remain byte-identical.
13. Project Planning and Phase Planning review remains atomic and cannot create mixed disposition, notes, or timestamp authority.
14. Approved remains disabled until every current output revision has been viewed; `RevisionRequested` requires instructions.
15. Generic document disposition cannot bypass catalog review authority.
16. Current workflow projects all seven Architect-output workspaces from the shared model.
17. Project Architect Interview approval still enables Project Planning.
18. Project Planning approval still enables Phase Map.
19. Phase Map approval still projects the first incomplete phase.
20. Phase Interview approval still enables Phase Planning.
21. Phase Planning approval still enables Work Card candidate selection with the exact validated candidate array.
22. Formal Work Card approval still enables Work Card Building.
23. Repair Work Card approval still returns to the handoff-defined parent Building review or Validation target.
24. Embedded browser security and all non-Architect lifecycle behavior remain unchanged.
25. Typecheck, build, and the complete test lane pass in the normal Windows environment.
26. Operator running-product validation remains pending.
27. No Git operation occurs.

## Required Proof

Tests are subordinate to this contract. A passing suite does not replace source and production-path review.

Required production-path matrix:

- load all seven definitions from the production catalog;
- invoke the actual generic IPC handlers for one existing single flow, one existing bundle, Formal Work Card, and Repair Work Card;
- invoke the production generic renderer refresh for single and compound definitions;
- exercise each definition's current context and final target resolution;
- prove the complete downstream result for all seven flows;
- prove partial drafts, malformed retention, retry, ineligible final blocking, revision, bundle review, and viewed-current-revision gating.

Required absence searches:

```text
no workspace-specific Architect-output IPC/preload family
no workspace-specific refresh module
no separate Project Planning polling
no saveFormalWorkCardOutput
no saveRepairWorkCardOutput
no LifecycleArchitectOutputImport
no manual Architect-output textarea state
no generic document-disposition bypass for catalog workspaces
```

Source searches support absence claims but do not establish runtime correctness.

Do not create one suite per workspace merely to increase test count. Reuse a production-catalog matrix and focused domain scenarios.

## Operator Running-Product Validation

After Architect code review passes, validate one controlled project through the real embedded ChatGPT/MCP lane:

```text
Architect Interview
→ Project Planning bundle
→ Phase Map
→ Phase Interview
→ Phase Planning bundle
→ Work Card Intake
→ Formal Work Card
→ controlled repair trigger
→ Repair Work Card
```

For each applicable workspace verify:

- Prepare returns exact temporary path or paths;
- Copy does not change paths or state;
- embedded ChatGPT writes only temporary body drafts;
- polling promotes without manual import;
- final output appears Pending;
- approval requires current revision review;
- disposition advances or returns to the correct lifecycle workspace.

Also validate one malformed submission, one partial bundle, one bundle revision, one Formal Work Card revision, and one Repair Work Card revision.

The Implementer must not claim this Operator validation.

## Negative Constraints

Do not:

- split the cutover into later workspace-specific cards;
- retain temporary WC39 product façades after generic consumers are installed;
- add a second registry, coordinator, polling path, action bar, or review implementation;
- retain direct-save or manual-import fallbacks;
- add compatibility aliases for retired APIs;
- introduce an alternative canonical writer, transaction path, candidate schema, or repair schema;
- add generic content-quality scoring;
- add hidden persisted workflow state, marker files, hashes, tokens, execution runs, background scanning, or cleanup workers;
- add legacy-planning preservation or migration;
- alter embedded browser security or automate ChatGPT;
- alter unrelated Implementer Report, Validation Record, Phase Close, or Project Close persistence;
- add dependencies without explicit Operator approval;
- perform Git operations.

## Implementer Report Requirements

Create the Implementer Report only after acceptance criteria 1–25 pass.

The report must:

- list every created, modified, and deleted file;
- reproduce the seven-definition/nine-slot active catalog;
- identify every removed workspace-specific IPC, preload, polling, action, review, direct-save, manual-import, and temporary façade path;
- identify the production generic handlers and renderer refresh exercised;
- map every acceptance criterion to concrete production-path evidence;
- explain any adjacent context-resolver change;
- record typecheck, build, focused proof, and complete test results;
- distinguish automated proof from pending Operator validation;
- disclose any scope expansion, unresolved defect, or residual duplication;
- state that no fallback, migration, dependency, or Git mutation occurred.
