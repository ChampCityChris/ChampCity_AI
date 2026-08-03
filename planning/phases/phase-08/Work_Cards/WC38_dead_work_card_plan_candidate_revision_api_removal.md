<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC38"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC37_phase_planning_workspace_and_atomic_bundle_cutover.md",
      "revision": 2
    },
    {
      "path": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "revision": 2
    },
    {
      "path": "planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Dead Work Card Plan Candidate Revision API Removal",
    "status": "approved_for_implementation",
    "executionMode": "one surgical dead-code removal",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC38_dead_work_card_plan_candidate_revision_api_removal.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Delete the dormant reviseWorkCardPlanCandidates API and its compilation-only residue without creating a replacement mutation path or changing the approved Work Card Plan body-to-metadata authority model.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# WC38 — Dead Work Card Plan Candidate Revision API Removal

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Repository Evidence

WC37 explicitly placed the dormant application-owned function below outside its cutover except for a narrow compilation adjustment:

```text
reviseWorkCardPlanCandidates()
```

Current production location:

```text
src/main/phasePlanning/phasePlanningService.ts
```

Repository search found no production, IPC, preload, renderer, downstream-service, or test caller. The symbol is exported but unused.

The WC37 implementation nevertheless changed the function from its prior destructive body-rewrite behavior into a metadata-only write:

```text
existing Work Card Plan body remains unchanged
→ metadata.workflowData.candidates is replaced
→ artifact revision remains unchanged
→ disposition, notes, and reviewedAt remain unchanged
```

That path can make the human-readable `champcity-work-card-plan` body disagree with the application-owned candidate array in canonical metadata. The prior implementation was also not acceptable because it replaced the complete Work Card Plan body with a generated summary and removed the required domain block.

Neither behavior is part of the approved Phase Planning runtime.

## Objective

Remove the dead mutation API completely.

The resulting normal candidate-authority path remains:

```text
Architect-authored Work Card Plan body
→ exactly one champcity-work-card-plan JSON array
→ application validates through validateCandidates()
→ atomic Phase Planning bundle promotion writes the same validated array to metadata.workflowData.candidates
→ downstream Work Card selection reads and validates canonical metadata
```

No independent candidate-editing or candidate-revision API remains.

## Architecture Decision

Delete `reviseWorkCardPlanCandidates()`.

Do not restore its prior behavior, preserve it as a compatibility wrapper, rename it, move it, replace it with another metadata editor, or create a new body-rewrite utility.

Future candidate changes occur only through a complete Architect-authored Phase Planning bundle revision using the approved atomic draft-promotion path.

## Required Changes

1. Delete the complete exported `reviseWorkCardPlanCandidates()` function from `src/main/phasePlanning/phasePlanningService.ts`.
2. Remove imports or local type references used only by that function when compilation confirms they are no longer required.
3. Confirm that no compiled production export, alias, wrapper, IPC method, preload method, renderer action, or test helper exposes equivalent behavior.
4. Do not modify the Work Card Plan body parser, candidate validator, atomic bundle definition, canonical metadata projection, synchronized review, completion calculation, or downstream selection logic.

## Preserved Behavior

Preserve exactly:

- `candidatesFromWorkCardPlanBody()` as the body parser;
- `validateCandidates()` as the candidate schema and resolution-evidence authority;
- the requirement that the fenced JSON root is an array;
- projection of the exact validated array into `metadata.workflowData.candidates` during atomic promotion;
- `selectNextWorkCardCandidate()` reading canonical metadata as downstream authority;
- Phase Planning bundle creation, revision, review, completion, and polling behavior pending WC39;
- all current candidate resolution statuses and dependency rules;
- single-file canonical Markdown architecture;
- the shared canonical writer and transaction behavior.

## Authorized Surface

Expected production change:

```text
src/main/phasePlanning/phasePlanningService.ts
```

Expected report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC38_dead_work_card_plan_candidate_revision_api_removal.md
```

A focused test file may be changed only when compilation or an existing import requires removal of the deleted symbol. No new production file is authorized.

Any additional production file requires a concrete necessity explanation in the Implementer Report and must not introduce replacement behavior.

## Acceptance Criteria

1. `reviseWorkCardPlanCandidates` no longer exists in production source or compiled production exports.
2. No alias, compatibility wrapper, metadata-only editor, body-rewrite helper, IPC route, preload exposure, renderer control, or alternate candidate-mutation path is added.
3. Phase Planning atomic promotion still parses the Work Card Plan body and projects the exact validated candidate array into canonical metadata.
4. Downstream Work Card selection still reads `metadata.workflowData.candidates` and applies the existing candidate rules.
5. The Work Card Plan body and metadata cannot be independently changed through an application API.
6. No candidate schema, resolution status, ordering, dependency, evidence, completion, or selection rule changes.
7. Typecheck, build, and the complete existing test lane pass in the normal Windows environment.
8. No Git operation occurs.

## Required Proof

The Implementer Report must provide:

- the exact deleted source range;
- repository search results for the removed symbol across `src`, `test`, and compiled production output after build;
- confirmation that no replacement mutation path was added;
- the existing production-path proof showing a promoted Work Card Plan candidate reaches `selectNextWorkCardCandidate()` through canonical metadata;
- typecheck, build, and complete test results.

Source search is appropriate proof of API absence, but it is not sufficient by itself. The downstream selection proof must still exercise the actual Phase Planning promotion and Work Card selection services.

No new test is required merely to increase test count. Add or change a test only when needed to preserve the production-path invariant after deletion.

## Non-Scope

Do not:

- redesign Phase Planning;
- revise the Work Card Plan schema;
- add candidate editing UI;
- add an application-owned candidate revision workflow;
- restore generated candidate summaries;
- preserve compatibility with either dead implementation;
- modify Formal Work Card creation;
- modify Work Card selection;
- change renderer workspace behavior;
- add migration, cleanup, sidecars, hidden state, hashes, tokens, or dependencies;
- perform Git operations.

## Implementer Report Requirements

Create the Implementer Report only after all acceptance criteria pass.

The report must list files changed, explain any adjacent test edit, map each acceptance criterion to concrete evidence, record commands and results, state that no replacement API was created, and identify any residual risk. Do not claim Operator running-product validation; WC38 has no new Operator-facing behavior.
