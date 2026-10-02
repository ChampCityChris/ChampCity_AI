# RWS05-REPAIR01 — Align Architect Handoff Instructions with Typed Workflow Contracts

**Status:** IMPLEMENTER_READY  
**Parent:** RWS05 Architect Workspace Family  
**Failed review checkpoint:** `25ac382199cb58225bbbc0dcfc049662c3b3cfb8`  
**Repair type:** source-level production defect

## Review evidence

RWS05 correctly introduced workflow-specific typed Architect output validators in `src/shared/architectWorkspaceContracts.ts`, but the production handoff assembled by `src/main/architectOutputs/structuredArchitectWorkspaceService.ts` still emits generic prose that contradicts those validators.

The shared handoff currently tells every Architect workflow:

- `Return only a JSON object whose exact keys each contain 1–32 nonempty text items...`
- `Preserve all seven Feature dimensions.`
- `Project Planning Direction must cover...`

Those statements are not valid for every workflow.

Confirmed contract differences:

- **Project Creation / Greenfield** requires the exact fifteen Greenfield keys, each containing an array of 1–32 bounded strings.
- **Feature / Capability** requires the exact seven Feature keys, each containing one bounded scalar string.
- **Issue Resolution / RCA** requires `{rootCauses:[...]}` with 1–12 typed RootCause objects and exact Finding/Evidence references.
- **Refactor/Migration, Integration/Composition, Infrastructure/Platform, Research/Prototype** each require their exact `ASSESSMENT_SECTIONS` keys, with one bounded scalar string per key.

The generated JSON template is workflow-specific, but the prose immediately surrounding it can instruct the model to return a shape the validator will reject.

## Confirmed defect

The Architect handoff contract and the application validator disagree.

A model can correctly follow the handoff prose and still fail `validateArchitectCandidateOutput()`.

This is a production source defect because the handoff is the application-generated instruction sent to the Architect workflow.

## Root cause

`createStructuredArchitectWorkspaceService().get()` builds one largely generic handoff instruction array for all seven substantive Workflow types, while validation is workflow-specific.

RWS05 centralized the renderer and persistence path, but it did not similarly centralize the **prompt/output-contract description** with the typed validator. The generic prose retained assumptions from Greenfield and Feature and was applied to Issue and the four assessment workflows.

## Objective

Make the Architect handoff describe exactly the same output contract that `validateArchitectCandidateOutput()` enforces for the selected Workflow type.

The repair must eliminate contradictory generic instructions without changing Structured Project State authority, semantic mapping, review-cycle behavior, renderer layout, or downstream Planning behavior.

## Required implementation

### 1. One workflow-specific handoff contract source

Create a bounded shared helper adjacent to the typed Architect candidate contracts, or an equivalent single source of truth, that returns the exact handoff/output instructions for a `WorkflowType`.

Prefer a helper in or immediately beside `src/shared/architectWorkspaceContracts.ts` so the validator, section definitions, templates, and human/model-facing contract cannot drift independently.

The helper must cover all seven substantive Workflow types.

Do not create a second unrelated prompt-schema registry.

### 2. Exact Greenfield instructions

For `project-creation`, the handoff must state that:

- the response is one JSON object with exactly the fifteen `GREENFIELD_ARCHITECT_SECTIONS` keys;
- every value is an array of 1–32 nonempty bounded strings;
- total transport is bounded to the validator limits;
- `projectPlanningDirection` must fit its additional bound;
- proposed decisions/recommendations are not Operator Decisions.

Greenfield-specific guidance such as Project Planning Direction may remain here.

### 3. Exact Feature instructions

For `feature-capability`, the handoff must state that:

- the response has exactly the seven `FEATURE_ARCHITECT_SECTIONS` keys;
- every value is one nonempty scalar string, not an array;
- each scalar obeys the validator byte bound;
- the response obeys the transport bound;
- all seven dimensions are required.

Do not emit Greenfield fifteen-section/array instructions.

### 4. Exact Issue RCA instructions

For `issue-resolution`, the handoff must state the actual RCA shape:

```json
{
  "rootCauses": [
    {
      "title": "...",
      "statement": "...",
      "rationale": "...",
      "confidence": 0.0,
      "findingIds": [],
      "evidenceIds": []
    }
  ]
}
```

It must describe the existing validator/service requirements accurately:

- 1–12 RootCause candidates;
- no unrelated top-level keys;
- bounded title/statement/rationale;
- optional confidence between 0 and 1;
- bounded unique Finding/Evidence ID arrays;
- each candidate must cite at least one valid supplied Finding or Evidence before persistence succeeds;
- references must use IDs supplied in the handoff context.

Do not emit Feature-seven-dimension, Greenfield-array, or Project Planning Direction instructions.

### 5. Exact Migration / Integration / Infrastructure / Research instructions

For each type in `ASSESSMENT_SECTIONS`:

- require exactly that workflow's section keys;
- every value is one nonempty scalar string, not an array;
- every value obeys the existing 4000-byte bound;
- the response obeys the existing total transport bound;
- the generated workflow-specific JSON template remains authoritative for field names.

Do not tell these workflows to preserve Feature dimensions or Greenfield Project Planning Direction.

### 6. Common semantic guidance remains common only where actually common

The following may remain shared when accurate for every Architect workflow:

- exact Project/Workflow/Intake identity;
- routed provenance is context only;
- supplied SQL context/Evidence;
- inspect materially relevant repository evidence;
- distinguish verified implementation, approved architecture, historical evidence, and unresolved assumptions;
- preserve governing architecture unless the Operator revises it;
- proposed Architect recommendations are not Operator Decisions;
- SourceBaseline context where applicable.

Do not force workflow-specific semantic requirements into the common block.

## Preserve

Do not change:

- `ArchitectReviewCycle` semantics;
- SQL semantic authority;
- exact-cycle Operator Decisions;
- candidate atomic persistence;
- Intake provenance/currentness;
- generated Markdown projection behavior;
- generated-document discovery exclusion;
- legacy Feature/Issue SQL adoption;
- Issue Evidence storage/linkage;
- Greenfield Project Planning bridge;
- shared Architect shell geometry;
- right-side ChatGPT/browser companion;
- stage rail behavior;
- next-stage readiness;
- any Planning-family implementation.

## Explicitly out of scope

- Architecture-document cleanup or UTF-8 repair.
- Historical Markdown cleanup.
- RWS05/RWS06 sequencing language.
- Changes to the RWS05 bundle or Work Cards.
- SQL schema changes.
- `project_state_authority` changes.
- Prompt redesign outside the Architect candidate-output contract.
- Planning, topology, execution, validation, or close work.

The current Markdown architecture documents are not part of this repair.

## Expected production areas

Primary:

- `src/shared/architectWorkspaceContracts.ts`
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`

Only modify another production file if the shared contract helper requires a narrowly typed extraction. Explain any expansion in the Implementer Report.

## Test requirements

Inspect existing ownership before adding tests.

Prefer extending existing Architect/workflow proof, particularly:

- `test/workflow/workflow-application-service.test.cjs`
- existing Architect prompt/contract tests if they are the correct stable owner.

Add focused proof that obtains the **actual production handoff** for all seven Workflow types and verifies:

1. Greenfield handoff describes fifteen array-valued sections and does not claim Feature/RCA scalar contracts.
2. Feature handoff describes exactly seven scalar-string fields and does not instruct arrays.
3. Issue handoff describes `rootCauses[]`, Finding/Evidence references, and does not contain Feature/Greenfield-only requirements.
4. Migration handoff names its exact assessment keys and scalar-string shape.
5. Integration handoff names its exact assessment keys and scalar-string shape.
6. Infrastructure handoff names its exact assessment keys and scalar-string shape.
7. Research handoff names its exact assessment keys and scalar-string shape.
8. For every workflow, a representative output that follows the handoff contract passes `validateArchitectCandidateOutput()`.
9. A representative output following a different workflow's contract remains rejected.
10. Existing candidate persistence/review/currentness behavior remains unchanged.

Do not add a new permanent test file if an existing owner can express these assertions cleanly.

## Validation

Run:

- planner preview / work-item profile with the exact changed-path set;
- affected tests for the repair;
- focused production Architect handoff/contract proof;
- existing structured Architect workflow proof materially touched by the repair;
- `git diff --check`.

Do not require full/release qualification for this bounded repair.

Unrelated pre-existing failures must be reported separately and must not be repaired under this card.

## Acceptance criteria

RWS05-REPAIR01 passes when:

1. No production Architect handoff contains a generic output-shape statement that conflicts with its selected Workflow validator.
2. Each of the seven substantive Workflow handoffs accurately describes its exact typed output contract.
3. Handoff examples/templates and validator expectations agree.
4. Workflow-specific guidance appears only where applicable.
5. Valid model output following the generated handoff is accepted by the existing validator/persistence path.
6. Invalid cross-workflow shapes remain rejected.
7. No SQL authority, review-cycle, generated Markdown, UI, rail, or Planning behavior changes.
8. Focused owned proof passes.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- confirmed root cause;
- exact production files changed;
- how handoff/validator contract drift is prevented going forward;
- per-workflow proof matrix;
- tests reused/extended/added and any coverage-gap justification;
- validation commands/results;
- unrelated failures observed;
- deviations, if any.

## Checkpoint

Commit:

`RWS05-R01 align architect handoffs with typed contracts`

Return the repair checkpoint and report for source-code review.
