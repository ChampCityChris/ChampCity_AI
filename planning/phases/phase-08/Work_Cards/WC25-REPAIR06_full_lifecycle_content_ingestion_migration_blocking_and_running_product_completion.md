<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "repair-work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC25-REPAIR06",
    "parentWorkCardId": "WC25"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR05_INCOMPLETE_FULL_LIFECYCLE_CONTENT_INGESTION_AND_MIGRATION_BLOCKING.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR05_single_canonical_markdown_replacement_pair_protocol_deletion_and_operator_content_ingestion_completion.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Full-Lifecycle Content Ingestion, Migration Blocking, and Running Product Completion",
    "executionMode": "one continuous Codex task",
    "recommendedReasoning": "medium",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "completionAuthority": "Every mandatory Work Card requirement must be Proven through the requirement-to-evidence checklist. Tests are supporting diagnostics only.",
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator authorized REPAIR06 after full RCA. Revision 2 makes the Work Card requirement-to-evidence checklist the completion authority. Tests remain supporting diagnostics only.",
    "reviewedAt": "2026-07-27"
  }
}
CHAMPCITY-METADATA -->

# WC25-REPAIR06 — Full-Lifecycle Content Ingestion, Migration Blocking, and Running Product Completion

Status: approved for immediate Codex execution
Owner: Implementer
Execution: one continuous task using medium reasoning
Repository: ChampCity_AI only
Git mutation: prohibited

## Read First

Read:

- this complete Work Card;
- `planning/phases/phase-08/Architect_Reports/RCA_WC25_REPAIR05_INCOMPLETE_FULL_LIFECYCLE_CONTENT_INGESTION_AND_MIGRATION_BLOCKING.md`;
- `AGENTS.md`;
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`;
- `docs/dev/VALIDATION_COMMAND_LANES.md`.

The RCA fixes the architecture. Do not propose another design.

## Execution and Evidence Rule

The Work Card text is the primary completion checklist.

Before editing, convert every mandatory requirement in this card into a numbered requirement-to-evidence checklist. For each requirement record:

- the exact mandatory requirement;
- the production file, function, IPC channel, preload method, renderer control, or migration path that implements it;
- the exact repository evidence;
- the required running-application observation when the requirement describes visible or end-to-end product behavior;
- `Result=Proven` or `Result=NotProven`.

Evidence authority is ordered:

1. running-product behavior;
2. production repository implementation;
3. typecheck and build health;
4. automated tests.

A lower form of evidence must not replace a higher required form. In particular:

- source inspection does not prove a visible product workflow;
- unit or integration tests do not prove the Electron UI is usable;
- a process-alive smoke check does not prove save, refresh, disposition, or progression;
- a green test command does not override an unmet Work Card requirement.

Any mandatory requirement without direct evidence is `NotProven`. The Work Card remains incomplete. Do not draft the Implementer Report until every mandatory requirement is `Proven`.

Keep the checklist current during implementation and reproduce the completed checklist in the final Implementer Report. Do not reinterpret, narrow, or replace the Work Card acceptance contract.

## Objective

Complete the replacement started by REPAIR05.

The application must receive Architect-authored substantive content at every Architect output step, construct canonical Markdown under application authority, visibly refresh the result, allow disposition, and advance the running workflow.

Do not recreate:

- a universal canonical registry;
- creation contracts;
- context keys;
- target tokens;
- caller-supplied paths, identities, roles, revisions, sources, or dispositions;
- direct LLM repository writes;
- JSON sidecars.

## Stage 1 — Bounded Repository Analysis

Before editing, map the current callers and required output targets for:

1. Project Planning;
2. Phase Map;
3. Phase Interview;
4. Phase Planning;
5. Formal Work Card;
6. Repair Work Card;
7. workspace migration;
8. Architect Interview legacy-envelope repair.

Confirm the exact owning service, current Approved handoff, target path, required identity, source revisions, participation role, workflow data, and disposition for each output.

Record this map in the requirement-to-evidence checklist and final Implementer Report, then continue automatically. Do not stop for approval.

## Stage 2 — Exact Implementation

### Edit 1 — Atomic canonical multi-document writer

File:

`src/main/documents/canonicalMarkdownDocumentWriter.ts`

Add:

```ts
export function writeCanonicalMarkdownDocuments(
  inputs: WriteCanonicalMarkdownDocumentInput[],
): void
```

Required behavior:

- reject an empty input array;
- reject duplicate relative paths;
- serialize every document before writing;
- call `writeArtifactTransaction()` exactly once for the complete set;
- re-read and parse every installed file;
- verify each metadata object and Markdown body;
- roll back the entire set if any write or verification fails.

Refactor:

```ts
writeCanonicalMarkdownDocument(input)
```

into a one-item wrapper around `writeCanonicalMarkdownDocuments([input])`.

Do not create a document registry or document-type switch in this writer.

### Edit 2 — Shared substantive-content rule

Every save operation below must:

- require non-empty substantive Markdown;
- reject `<!-- CHAMPCITY-METADATA` and `CHAMPCITY-METADATA -->`;
- resolve the current Approved handoff internally;
- derive target path and metadata internally;
- create revision 1 with `Pending` when the output does not exist;
- increment the existing artifact revision by exactly one and reset `Pending` when revising;
- derive source revisions from the exact handoff source revisions plus the handoff document revision;
- return saved path or paths and the refreshed current-workspace model.

The renderer supplies substantive content only.

### Edit 3 — Project Planning output bundle

File:

`src/main/projectPlanning/projectPlanningService.ts`

Add:

```ts
export interface ProjectPlanningOutputInput {
  projectProfileMarkdown: string;
  projectRoadmapMarkdown: string;
}

export function saveProjectPlanningOutputs(
  workspaceRoot: string,
  input: ProjectPlanningOutputInput,
): {
  projectProfileMarkdownPath: string;
  projectRoadmapMarkdownPath: string;
}
```

Resolve the current Approved Project Planning handoff and read these application-owned targets from its `workflowData`:

- `projectProfileTarget`;
- `projectRoadmapTarget`.

Write both documents through one `writeCanonicalMarkdownDocuments()` call.

Metadata:

- artifact types: `project-profile`, `project-roadmap`;
- participation role: `compoundGatingReview` for both;
- identity: current `projectSlug` from Project Intake evidence;
- source revisions: handoff source revisions plus current handoff revision;
- disposition: `Pending` for both.

A partial bundle write is prohibited.

### Edit 4 — Phase Map output

File:

`src/main/phaseMap/phaseMapService.ts`

Add:

```ts
export function savePhaseMapOutput(
  workspaceRoot: string,
  markdownBody: string,
): { phaseMapMarkdownPath: string }
```

Resolve the current Approved Phase Map handoff and its `outputTarget`.

Require exactly one fenced substantive domain block in the body:

````markdown
```champcity-phase-map
[
  {
    "phaseId": "phase-01",
    "title": "Phase 01",
    "order": 1,
    "purpose": "...",
    "dependsOn": [],
    "sourceReferences": []
  }
]
```
````

Parse only the JSON inside that block. Validate it through the existing Phase Map validator. Preserve the complete Markdown body unchanged and store the validated phases in application-owned `workflowData.phases`.

Metadata:

- artifact type: `phase-map`;
- participation role: `gatingReview`;
- identity: current `projectSlug`;
- source revisions: handoff sources plus handoff revision;
- disposition: `Pending`.

### Edit 5 — Phase Interview output

File:

`src/main/phaseInterview/phaseInterviewService.ts`

Add:

```ts
export function savePhaseInterviewOutput(
  workspaceRoot: string,
  markdownBody: string,
): {
  phaseId: string;
  phaseInterviewMarkdownPath: string;
}
```

Resolve the current Approved Phase Interview handoff and its `outputTarget`.

Metadata:

- artifact type: `phase-interview`;
- participation role: `gatingReview`;
- identity: exact `phaseId` from the handoff;
- source revisions: handoff sources plus handoff revision;
- disposition: `Pending`.

### Edit 6 — Phase Planning output bundle

File:

`src/main/phasePlanning/phasePlanningService.ts`

Add:

```ts
export interface PhasePlanningOutputInput {
  phasePlanningMarkdown: string;
  workCardPlanMarkdown: string;
}

export function savePhasePlanningOutputs(
  workspaceRoot: string,
  input: PhasePlanningOutputInput,
): {
  phaseId: string;
  phasePlanningMarkdownPath: string;
  workCardPlanMarkdownPath: string;
}
```

Resolve the current Approved Phase Planning handoff and read:

- `phasePlanningTarget`;
- `workCardPlanTarget`.

Require exactly one fenced domain block in `workCardPlanMarkdown`:

````markdown
```champcity-work-card-plan
[
  {
    "candidateId": "WC01",
    "order": 1,
    "title": "...",
    "purpose": "...",
    "dependsOn": [],
    "resolutionStatus": "planned",
    "resolutionReason": "",
    "evidencePaths": []
  }
]
```
````

Parse and validate the candidates through `validateCandidates()`.

Write both documents through one `writeCanonicalMarkdownDocuments()` call.

Metadata:

- artifact types: `phase-planning`, `work-card-plan`;
- participation role: `compoundGatingReview` for both;
- identity: exact `phaseId`;
- source revisions: handoff sources plus handoff revision;
- `workflowData.candidates`: validated candidates on Work Card Plan;
- disposition: `Pending` for both.

A partial bundle write is prohibited.

### Edit 7 — Formal Work Card output

File:

`src/main/workCardPlanning/workCardPlanningService.ts`

Delete the placeholder creation behavior in:

```ts
createFormalWorkCardFromIntakeHandoff()
```

Replace it with:

```ts
export function saveFormalWorkCardOutput(
  workspaceRoot: string,
  markdownBody: string,
): {
  phaseId: string;
  workCardId: string;
  formalWorkCardMarkdownPath: string;
}
```

Resolve the current Approved Work Card Intake handoff and its `formalWorkCardTarget`.

Derive:

- `phaseId`;
- `workCardId`;
- `candidateId`;
- candidate substantive data from the handoff.

Metadata:

- artifact type: `formal-work-card`;
- participation role: `gatingReview`;
- identity: `{ phaseId, workCardId, candidateId }`;
- source revisions: handoff sources plus handoff revision;
- workflow data: candidate identity and return-to-Phase-Planning rule;
- disposition: `Pending`.

Do not create placeholder scope, acceptance criteria, or Implementer instructions.

### Edit 8 — Repair Work Card output

File:

`src/main/workCardRepair/workCardRepairService.ts`

Keep `createRepairWorkCard()` as handoff generation only.

Add:

```ts
export function saveRepairWorkCardOutput(
  workspaceRoot: string,
  markdownBody: string,
): {
  phaseId: string;
  repairId: string;
  repairWorkCardMarkdownPath: string;
}
```

Resolve the current Approved Repair Architect handoff and its `repairWorkCardTarget`.

Metadata:

- artifact type: `repair-work-card`;
- participation role: `gatingReview`;
- identity: `{ phaseId, workCardId: repairId, repairId, parentWorkCardId }`;
- source revisions: handoff sources plus handoff revision;
- workflow data: repair origin, evidence path, bounded defect, return target, and parent identity from the handoff;
- disposition: `Pending`.

### Edit 9 — Architect Interview identity

Files:

- `src/main/architectInterview/architectInterviewContextResolver.ts`;
- `src/main/architectInterview/architectInterviewService.ts`.

Extend the resolved canonical identity to expose the parsed metadata identity.

When creating Architect Interview, write the exact project identity derived from current Project Intake and Prompt evidence. At minimum preserve:

- `projectSlug`;
- `Project.ArtifactKey` when present.

Validate that the current Interview identity matches the expected project identity. Do not accept path match alone.

### Edit 10 — Remove legacy recovery outside migration

Delete from normal runtime:

- `repairArchitectInterviewCanonicalEnvelope()`;
- IPC `architectInterview:repairCanonicalEnvelope`;
- preload method `repairArchitectInterviewCanonicalEnvelope`;
- renderer repair function and control;
- `canRepairCanonicalEnvelope` contract state;
- unused `writeMarkdownReview()`;
- unused `writeJsonReview()`;
- JSON `readArtifactRevision()`;
- legacy JSON source detection;
- legacy substantive extraction helpers.

Legacy pair reading may remain only in:

`src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts`

and migration fixtures.

### Edit 11 — Deterministic migration blocking

File:

`src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts`

Replace informational mismatch handling.

A pair is `ready` only when all required values agree:

- artifact revision;
- disposition;
- complete normalized source tuples `(path, revision)`;
- artifact type and canonical identity.

Any mismatch must set:

```ts
status: "blocked"
```

and apply must leave both originals unchanged.

Duplicate identity key must be:

```ts
JSON.stringify({
  artifactType: metadata.artifactType,
  identity: metadata.identity,
})
```

Do not include target path.

### Edit 12 — IPC and preload

Files:

- `src/main/main.ts`;
- `src/preload/index.ts`;
- `src/shared/workspaceContracts.ts`.

Add exact channels and methods:

```text
projectPlanning:saveOutputs
phaseMap:saveOutput
phaseInterview:saveOutput
phasePlanning:saveOutputs
workCardPlanning:saveOutput
workCardRepair:saveOutput
```

Preload API:

```ts
saveProjectPlanningOutputs(input)
savePhaseMapOutput(markdownBody)
savePhaseInterviewOutput(markdownBody)
savePhasePlanningOutputs(input)
saveFormalWorkCardOutput(markdownBody)
saveRepairWorkCardOutput(markdownBody)
```

No method accepts path, identity, role, source revision, artifact revision, or disposition.

### Edit 13 — Renderer output surfaces

File:

`src/renderer/app/App.tsx`

Add visible Architect Output import fields for:

- `project-planning-review`: Project Profile and Project Roadmap textareas;
- `project-phase-map`: Phase Map textarea;
- `phase-interview`: Phase Interview textarea;
- `phase-planning-bundle`: Phase Planning and Work Card Plan textareas;
- `work-card-planning`: Formal Work Card textarea;
- `work-card-repair`: Repair Work Card textarea.

Use the exact preload methods from Edit 12.

After a successful save:

1. clear the submitted field or fields;
2. refresh the document inventory;
3. refresh the current-workspace model;
4. select the newly saved output;
5. show the output preview;
6. expose the existing disposition controls.

Do not add another generic document-authority form.

## Stage 3 — Running Application Acceptance

Do not expand, restore, or perfect the automated test suite. Tests and source searches are supporting diagnostics only.

Complete the implementation first. Then launch the built Electron application against a controlled temporary repository and perform the actual UI workflow:

```text
Create and approve Project Intake
→ save and approve Architect Interview
→ generate Project Planning handoff
→ paste and save Project Profile and Project Roadmap
→ visibly review both and approve the bundle
→ generate Phase Map handoff
→ paste and save Phase Map with the required domain block
→ approve Phase Map
→ generate, save, and approve Phase Interview
→ generate Phase Planning handoff
→ paste and save Phase Planning and Work Card Plan with the required candidate block
→ approve the bundle
→ generate Work Card Intake handoff
→ paste and save Formal Work Card
→ approve Formal Work Card
→ confirm the running app advances to Implementer Handoff and Report Review
```

Also perform one repair-output path:

```text
Use controlled RevisionRequested evidence
→ generate Repair Architect handoff
→ paste and save Repair Work Card
→ confirm the Repair Work Card is visible, Pending, reviewable, and owned by the correct parent
```

For each save verify in the running application:

- the expected field is visible;
- Save succeeds;
- the new or revised document appears without restart;
- the preview shows the pasted body;
- metadata-derived disposition is Pending;
- disposition controls are usable;
- approval advances to the correct next workspace;
- no JSON sibling is created.

A process-alive smoke check, source-string assertion, service-only invocation, or automated test does not satisfy this stage. Record the exact running-application action and observed result for every Stage 3 step in the requirement-to-evidence checklist.

After the running workflow passes, run once:

- `npm run typecheck`;
- `npm run build`;
- `npm test`.

No minimum test count is required. Do not create test work solely to increase coverage.

## Stop Conditions

Contact the Operator only if exact repository evidence proves:

- a required workflow semantic is contradictory or undefined after reading the RCA and governing design documents;
- preserving an unrelated dirty-tree change is impossible;
- a new dependency is unavoidable;
- ChampCity_GPT must change;
- a Git mutation is required.

Compilation failures, implementation size, UI wiring effort, migration conflicts in controlled fixtures, and existing test failures are not stop conditions.

## Completion Report

Create only after the running application workflow passes:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC25-REPAIR06_full_lifecycle_content_ingestion_migration_blocking_and_running_product_completion.md`

The report must include:

- the complete numbered requirement-to-evidence checklist with `Proven` or `NotProven` for every mandatory requirement;
- Stage 1 responsibility map;
- exact files changed;
- each save operation and IPC/preload/renderer path;
- atomic bundle behavior;
- Phase Map and Work Card Plan domain-block handling;
- migration conflict behavior;
- Architect Interview identity behavior;
- removed legacy runtime paths;
- exact running-application observations for every Stage 3 step;
- final typecheck, build, and test results;
- confirmation no Git operation occurred;
- only remaining Operator acceptance.

Do not create WC25-REPAIR07. Do not classify a required output path or running-app step as future work or residual risk. If any checklist item is `NotProven`, report the task as incomplete rather than claiming completion.

## Acceptance

WC25-REPAIR06 is complete only when every mandatory requirement in the numbered evidence checklist is `Proven`, including:

1. all six Architect-authored output types have direct workflow-owned save operations;
2. Project Planning and Phase Planning bundles create or revise atomically;
3. structured Phase Map and Work Card Plan content is parsed from bounded substantive Markdown blocks and stored under application authority;
4. Architect Interview identity is derived and validated;
5. migration mismatches and duplicate identities block apply;
6. legacy pair recovery exists only in the migration boundary;
7. the running Electron application completes the complete Stage 3 workflow;
8. typecheck, build, and the existing test command pass as supporting health evidence;
9. no Git operation, JSON sidecar, generic registry, contract token, or additional repair card is created.

Tests support these findings but do not determine acceptance.
