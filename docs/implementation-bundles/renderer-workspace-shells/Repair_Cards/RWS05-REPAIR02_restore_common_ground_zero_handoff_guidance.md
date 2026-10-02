# RWS05-REPAIR02 — Restore Common Project Ground-Zero Guidance Across Architect Workflows

**Status:** IMPLEMENTER_READY  
**Parent:** RWS05-REPAIR01  
**Failed review checkpoint:** `1691d9bb04ba8d5ffd37c504c4243f1f63791c43`  
**Repair type:** bounded source-level regression

## Review finding

RWS05-REPAIR01 correctly aligned each Architect workflow handoff with its typed output validator.

However, while moving workflow-specific output instructions into `architectCandidateHandoffContract()`, the implementation also moved this previously common semantic instruction into the Greenfield-only branch:

> Project ground zero is the selected repository plus the local development machine. Distinguish verified installed, verified missing and unverified capabilities, repository bootstrap mechanisms and explicitly externally managed capabilities. Missing required capabilities are Project work unless approved evidence establishes external ownership.

That guidance is not Greenfield-specific. It is materially relevant to Feature, Issue, Refactor/Migration, Integration/Composition, Infrastructure/Platform, and Research/Prototype Architect work as well.

The repair test then codified the regression by asserting that non-Greenfield handoffs must **not** contain `Project ground zero`.

This behavior was not requested by RWS05-REPAIR01 and is outside its intended output-contract correction.

## Objective

Restore the Project ground-zero/local-development-machine guidance as common Architect handoff context for **all seven substantive Workflow types** while preserving the workflow-specific typed output-contract repair from RWS05-REPAIR01.

No other prompt semantics should change.

## Required implementation

### 1. Restore ground-zero guidance to the common handoff

Every structured Architect handoff must again include the common Project ground-zero guidance.

The guidance belongs in the shared handoff composition, not inside the `project-creation` output-contract branch.

Preferred production shape:

```text
common Architect handoff context
├─ exact Project / Workflow / Intake identity
├─ routed provenance context
├─ workflow-specific typed output contract
├─ supplied SQL context / Evidence
├─ repository inspection requirements
├─ Project ground zero / local development machine guidance
├─ approved SQL Intake
├─ approved Project architecture
└─ exact SourceBaseline evidence
```

The exact wording may remain unchanged unless a narrowly necessary edit is required to fit the existing shared handoff composition.

### 2. Keep Project Planning Direction Greenfield-only

The separate Greenfield-specific instruction:

> Project Planning Direction must cover the full adopted Project scope...

must remain only in the `project-creation` contract.

Do not make Project Planning Direction common to Feature, Issue, Migration, Integration, Infrastructure, or Research.

### 3. Preserve the RWS05-REPAIR01 typed contracts exactly

Do not change the accepted output shapes or bounds:

- Project Creation: exact fifteen Greenfield keys, array-valued sections.
- Feature: exact seven scalar-string fields.
- Issue: exact `rootCauses[]` contract.
- Migration / Integration / Infrastructure / Research: exact workflow-specific scalar-string assessment fields.

Do not alter `validateArchitectCandidateOutput()` semantics unless a change is strictly required to undo this regression. No validator change is expected.

## Expected production scope

Primary expected files:

- `src/shared/architectWorkspaceContracts.ts`
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`

The smallest valid repair is expected to:

1. remove the ground-zero instruction from the Greenfield-only contract block;
2. restore it to common handoff composition.

Do not expand production scope without a directly demonstrated need.

## Test correction

Update the existing proof in:

`test/workflow/workflow-application-service.test.cjs`

Remove the incorrect assertion that non-Greenfield handoffs must exclude `Project ground zero`.

Replace it with proof that:

1. all seven substantive Workflow production handoffs include the Project ground-zero/local-development-machine guidance;
2. only Greenfield includes the `Project Planning Direction must...` instruction;
3. all RWS05-REPAIR01 workflow-specific output-contract assertions remain intact;
4. representative outputs for all seven workflows still pass their matching validators;
5. cross-workflow shapes remain rejected.

Do not create a new test owner unless the existing workflow owner cannot express this proof.

## Preserve

Do not change:

- `ArchitectReviewCycle` semantics;
- SQL authority or persistence;
- exact-cycle Operator Decisions;
- Intake provenance/currentness;
- candidate atomicity;
- generated Markdown projection behavior;
- generated-document discovery exclusion;
- Feature/Issue legacy SQL adoption;
- Issue Evidence behavior;
- stage rail state;
- renderer geometry;
- browser/ChatGPT attachment;
- next-stage readiness;
- Planning-family behavior;
- RWS06 implementation.

## Explicitly out of scope

- Architecture Markdown cleanup.
- Historical Markdown cleanup.
- RWS05/RWS06 sequencing language.
- Any approval/execution gate changes.
- SQL schema or `project_state_authority` changes.
- Any new prompt redesign beyond restoring this common instruction.
- Changes to the RWS05-REPAIR01 output-contract architecture.

## Acceptance criteria

RWS05-REPAIR02 passes when:

1. every one of the seven substantive Architect handoffs contains the Project ground-zero/local-development-machine guidance;
2. `Project Planning Direction must...` remains Greenfield-only;
3. all workflow-specific typed output-contract instructions remain exactly aligned with their validators;
4. no SQL, renderer, review-cycle, generated Markdown, rail, or Planning behavior changes;
5. the existing focused Architect workflow owner passes;
6. `git diff --check` passes.

## Validation

Run:

- validation planner preview for the exact repair changed-path set;
- work-item affected validation;
- the existing focused structured Architect workflow owner;
- production build if selected/required by the validation plan;
- `git diff --check`.

Unrelated repository failures must be reported separately and must not be repaired under this card.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05_REPAIR02_IMPLEMENTER_REPORT.md`

Include:

- exact root cause;
- production files changed;
- confirmation that ground-zero guidance is common to all seven workflows;
- confirmation that Project Planning Direction remains Greenfield-only;
- focused test results;
- affected validation results;
- unrelated failures observed;
- any deviation from this card.

## Checkpoint

Commit:

`RWS05-R02 restore common architect ground-zero guidance`

Return the repair checkpoint and Implementer Report for source-code review.
