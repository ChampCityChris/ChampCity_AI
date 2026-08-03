<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC41"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40_simultaneous_seven_flow_architect_output_product_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC37_phase_planning_workspace_and_atomic_bundle_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "revision": 2
    },
    {
      "path": "planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Domain-Specific Architect Handoff Prompt Contracts",
    "status": "approved_for_implementation",
    "executionMode": "one bounded production-prompt correction",
    "dependsOn": [
      "WC40"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41_domain_specific_architect_handoff_prompt_contracts.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Ensure every active Architect-output prompt states the exact Markdown title, section, and fenced-block naming contract already enforced by its definition. Do not change disposition, promotion, review, validators, paths, or canonical authority.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC41 — Domain-Specific Architect Handoff Prompt Contracts

Status: Approved for Implementer execution  
Git mutation: prohibited

## Confirmed Defect

WC40 routes all seven active Architect-output flows through the shared runtime. Only Formal Work Card and Repair Work Card currently provide definition-owned prepared instructions. Other definitions can fall back to the generic prompt, which provides temporary paths but omits the exact Markdown naming and section contract enforced during promotion.

Operator validation exposed the defect in Phase Planning:

```text
created draft: # MVP-01 Phase Planning — Product Foundations and Architecture
required by validator: # Phase Planning
```

The paired Work Card Plan draft uses the same descriptive-title pattern while its validator requires `# Work Card Plan`. Both drafts are substantive, but the prompt did not state the literal contracts that the application later enforced.

## Objective

Make every active Architect-output definition produce one concise domain-specific prepared instruction that states the exact Markdown title, section names, fenced-block names, and temporary paths required for that output.

This card changes prompts only. It does not change the existing disposition or promotion sequence.

## Required Changes

### 1. Eliminate generic prompt fallback for active definitions

Every definition in `productionArchitectOutputCatalog` must provide `buildPreparedInstruction`.

The shared runtime may retain a generic builder only for non-production development use, but no active production catalog entry may reach it. Prefer a startup/catalog assertion that all active definitions own a prepared-instruction builder rather than workspace-specific branching in the runtime.

### 2. State each exact Markdown contract

Each prepared instruction must identify the current evidence and exact temporary draft path or paths, then state the matching output contract below.

#### Project Architect Interview

```text
# Project Architect Interview
## Project Understanding
## Users and Primary Workflows
## Scope
## Non-Scope
## Constraints
## Key Decisions
## Architect Recommendations
## Data and Integration Requirements
## Security, Compliance, and Operational Considerations
## Risks and Dependencies
## Assumptions
## Deferred Decisions
## Unresolved Questions
## Acceptance Direction
## Project Planning Direction
```

#### Project Planning bundle

Project Profile:

```text
# Project Profile
## Current-State Baseline
## Existing Implementation
## Legacy Planning Reconciliation
## Risks and Unknowns
```

Project Roadmap:

```text
# Project Roadmap
## Baseline Summary
## Work-State Classification
## MVP Scope
## Sequenced Roadmap
## Post-MVP Roadmap
## Deferred and Conditional Work
## Dependencies and Constraints
```

#### Phase Map

```text
# Phase Map
```

Require exactly one `champcity-phase-map` fenced JSON block with the existing phase schema.

#### Phase Interview

```text
# Phase Interview
## Phase Understanding
## Phase Objective
## Scope
## Non-Scope
## Inherited Constraints
## Dependencies and Prior-Phase Evidence
## Material Decisions
## Architect Recommendations
## Risks and Unknowns
## Assumptions
## Acceptance Direction
## Inputs Required for Phase Planning
## Deferred Items
## Unresolved Questions
```

#### Phase Planning bundle

Phase Planning:

```text
# Phase Planning
## Phase Objective
## Scope
## Non-Scope
## Inherited Constraints
## Architecture and Implementation Direction
## Major Deliverables
## Dependencies
## Risks and Mitigations
## Validation Strategy
## Acceptance Criteria
## Sequencing Direction
## Deferred Items
## Unresolved Questions
```

Work Card Plan:

```text
# Work Card Plan
```

Require exactly one `champcity-work-card-plan` fenced JSON array using only the existing `WorkCardCandidate` fields and allowed resolution statuses.

#### Formal Work Card

```text
# <exact-work-card-id> — <candidate-title>
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

#### Repair Work Card

```text
# <exact-repair-id> — <bounded-defect-title>
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

The Repair prompt must continue to state the exact application-owned return target.

### 3. Keep prompts concise and executable

Each prepared instruction should contain only:

- repository/workspace resolution instruction;
- exact current evidence paths and revisions needed by that output;
- exact final output identity for context;
- exact temporary body-only draft path or paths;
- exact H1/H2 and fenced-block contract;
- one `artifact_toolbox.create_markdown_artifact` invocation per slot with `overwrite=false`;
- current Operator revision instructions when the output is `RevisionRequested`;
- a stop instruction after every required draft is created.

Remove duplicated architecture explanation, lifecycle narration, internal coordinator details, and repeated warnings that do not change the requested output.

### 4. Reuse existing domain contract sources

Prompt builders must obtain headings, allowed statuses, and schema guidance from the same exported constants/functions used by current validators where available. Do not create a second manually maintained heading list that can drift from validation.

A focused refactor that exposes an existing required-section list is authorized. Validator behavior itself is not authorized to change.

## Preserved Behavior

Preserve unchanged:

- seven active definitions and nine slots;
- current temporary draft paths and `overwrite=false` creation calls;
- existing validators and exact H1/H2 requirements;
- Phase Map and Work Card Plan machine-consumed schemas;
- application-owned final paths, metadata, source revisions, identities, and dispositions;
- current automatic promotion to Pending canonical output;
- current generic review and disposition process;
- atomic Project Planning and Phase Planning bundle promotion and review;
- single-resolution Copy;
- revision-note delivery;
- Current Workflow projection;
- embedded browser security and manual message submission.

## Authorized Surface

Production prompt changes are limited to:

```text
src/main/architectOutputs/architectOutputRuntimeService.ts
src/main/architectOutputs/productionArchitectOutputCatalog.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardRepair/workCardRepairService.ts
```

Change only the subset required to attach or reuse definition-owned prompt builders. Focused prompt-contract tests may be updated under existing Architect-output and domain test directories.

Do not modify renderer code, IPC/preload contracts, disposition services, promotion order, draft cleanup, canonical writers, final target resolution, or workflow selection.

## Acceptance Criteria

1. All seven active production definitions provide `buildPreparedInstruction`.
2. No active catalog definition uses the generic fallback prompt.
3. Every prepared instruction contains the exact H1 required for each output slot.
4. Every prompt whose validator requires named H2 sections contains those exact section names once in its output template.
5. Phase Map states the exact `champcity-phase-map` fenced-block contract.
6. Work Card Plan states `# Work Card Plan`, the exact `champcity-work-card-plan` array contract, current candidate fields, and allowed resolution statuses.
7. Formal and Repair prompts preserve exact dynamic IDs, titles, evidence, temporary paths, and revision instructions.
8. Each prompt contains exactly one executable `create_markdown_artifact` call per slot and no final-path write.
9. Project Planning and Phase Planning prompts contain two calls and preserve atomic-bundle behavior.
10. Prepared prompts remain concise and contain no duplicated generic lifecycle or coordinator explanation.
11. A production-catalog prompt matrix proves all seven definitions and nine slots against their current validator contracts.
12. The Phase Planning regression scenario produces a prompt explicitly containing `# Phase Planning` and `# Work Card Plan` before either temporary path invocation.
13. Existing validators, promotion, disposition, review, canonical metadata, and workflow behavior remain unchanged.
14. Typecheck, TypeScript build, Vite build, focused tests, and the complete Node test lane pass in the approved normal Windows environment.
15. No Git operation occurs.

## Negative Constraints

Do not:

- change or remove any H1/H2 validator in this card;
- change when final canonical documents are created;
- change the disposition or review sequence;
- display drafts through a new renderer path;
- add workspace-specific IPC, preload, polling, or review surfaces;
- add another prompt registry or coordinator;
- duplicate schema or heading authority unnecessarily;
- add fallback aliases or manual file-copy recovery;
- add dependencies;
- perform Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41_domain_specific_architect_handoff_prompt_contracts.md
```

The report must include:

- every changed file;
- the builder used by each of the seven active definitions;
- a compact nine-slot prompt-contract matrix;
- evidence that no active definition reaches the generic fallback;
- the exact Phase Planning and Work Card Plan title lines from the generated prompt;
- focused and complete validation commands and results;
- confirmation that no validator, disposition, promotion, renderer, path, metadata, dependency, or Git behavior changed;
- any unresolved prompt-contract mismatch.

## Manual Validation

After Architect approval, Operator validation should rerun Phase Planning Prepare and confirm that the copied instruction explicitly names `# Phase Planning` and `# Work Card Plan`, then verify both drafts promote and appear in the unchanged review workspace.
