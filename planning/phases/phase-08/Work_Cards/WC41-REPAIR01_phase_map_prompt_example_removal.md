<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC41-REPAIR01",
    "repairId": "WC41-REPAIR01",
    "parentWorkCardId": "WC41"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 3
    }
  ],
  "workflowData": {
    "title": "Phase Map Prompt Example Removal",
    "status": "approved_for_implementation",
    "executionMode": "single prompt-and-test correction",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41-REPAIR01_phase_map_prompt_example_removal.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Remove the unnecessary Phase Map structural JSON example while preserving the exact named-block and schema guidance. Preserve the existing Work Card Plan prompt pattern and all WC41 behavior.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC41-REPAIR01 — Phase Map Prompt Example Removal

Status: Approved for Implementer execution  
Parent: `WC41`  
Git mutation: prohibited

## Confirmed Defect

WC41 correctly moved all seven active Architect-output flows to definition-owned prompts. The Phase Map prompt still contains an unnecessary placeholder phase object inside a generic `json` fence after requiring a `champcity-phase-map` fenced block.

The application does not consume this example. It requires ChatGPT to author the substantive phase list, validates the named domain block, and projects validated phases into `metadata.workflowData.phases`.

The Work Card Plan uses the same architecture but already follows the desired prompt pattern: exact named block, root type, fields, and statuses without a candidate-array example.

## Objective

Remove the Phase Map structural example and leave one concise, unambiguous domain-block contract. Do not change the Work Card Plan prompt or any runtime behavior.

## Required Changes

In the active Phase Map prepared-instruction builder:

1. Delete the placeholder Phase Map JSON object and its generic `json` fence.
2. Retain these explicit requirements:
   - body title `# Phase Map`;
   - exactly one `champcity-phase-map` fenced block;
   - JSON object root;
   - one non-empty `phases` array;
   - allowed fields only: `phaseId`, `title`, `order`, `purpose`, `dependsOn`, `sourceReferences`;
   - unique phase IDs and order values;
   - valid in-map dependencies without self-dependency or cycles;
   - normalized repository-relative source references;
   - no persisted completion state;
   - all substantive values derived from the Approved Project Profile and Roadmap.
3. Keep the separate `create_markdown_artifact` invocation fenced as `json`.
4. Extend the existing prompt-contract test to prove:
   - the Phase Map prompt states the named block and schema requirements;
   - no placeholder phase object or competing structural JSON example remains;
   - exactly one executable draft-write call remains;
   - the Work Card Plan prompt remains schema-directed and example-free.

## Preserved Behavior

Preserve unchanged:

- all seven definition-owned prompt builders;
- nine output-slot contracts;
- exact H1/H2 validators;
- Phase Map parser and validation;
- Work Card Plan prompt, parser, validation, and canonical candidate projection;
- canonical metadata and downstream authority;
- temporary draft paths and `overwrite=false`;
- promotion, disposition, review, renderer, IPC, preload, and workflow behavior;
- revision-note delivery;
- no generic production prompt fallback.

## Authorized Surface

```text
src/main/phaseMap/phaseMapDraftOutput.ts
test/architect-outputs/architect-output-prompt-contracts.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41-REPAIR01_phase_map_prompt_example_removal.md
```

No other production or test file is authorized unless compilation requires a directly related import-only adjustment, which must be reported.

## Acceptance Criteria

1. The active Phase Map prompt contains no placeholder phase object and no generic structural Phase Map JSON example.
2. It still states `# Phase Map` and exactly one `champcity-phase-map` fenced block.
3. It states object-root, non-empty `phases` array, allowed-field, uniqueness, dependency, source-reference, and no-completion requirements.
4. It retains exactly one `create_markdown_artifact` invocation with the exact temporary path and `overwrite=false`.
5. The Work Card Plan prompt remains unchanged in production behavior and contains no candidate-array example.
6. Focused prompt-contract tests prove both domain-block prompt patterns.
7. All WC41 accepted behavior remains passing.
8. Typecheck, TypeScript build, Vite build, focused tests, and complete Node tests pass in the approved normal Windows environment.
9. No Git operation occurs.

## Negative Constraints

Do not:

- add a replacement Phase Map example;
- change the Phase Map or Work Card Plan schema;
- change validators;
- change disposition, promotion, review, renderer, paths, metadata, or workflow behavior;
- change Work Card Plan prompt wording except where strictly necessary for the focused assertion;
- add dependencies, fallbacks, aliases, or new prompt infrastructure;
- perform Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC41-REPAIR01_phase_map_prompt_example_removal.md
```

Report:

- changed files;
- the final Phase Map domain-block instruction text;
- proof that no Phase Map structural example remains;
- proof that Work Card Plan remains example-free;
- exact validation commands and results;
- confirmation that no validator, disposition, promotion, renderer, path, metadata, workflow, dependency, or Git behavior changed.

## Manual Validation

After Architect approval, Operator validation should prepare and copy the Phase Map handoff and confirm that it states the named block and schema requirements without supplying a sample phase object.
