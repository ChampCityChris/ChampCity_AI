# RECONSTRUCTION-REPAIR01-REPAIR07 — Test Evidence Relevance in Work Card Drafting and Architect Review

## Repair Type

Bounded prompt-policy repair for Formal Work Card creation and advisory Architect review.

Governing standard:

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Failed Review Evidence

Phase 00 Work Card 01 produced a concrete failure mode in the current planning/review prompts.

The Approved Formal Work Card named the entire multi-purpose test file:

`test/repository/runtime-wiring-source.test.cjs`

as part of its focused validation lane and AC8 required the listed tests to pass.

The implementation evidence otherwise established the Work Card's development-readiness objective, including successful dependency readiness and successful `npm run build`, but one assertion in that shared runtime-wiring test file failed:

`one generic Architect-output IPC and preload contract serves all catalog workspaces`

The failing assertion requires `src/main/main.ts` not to match `/projectPlanning:/`.

Repository inspection proves that failure is not a development-readiness defect:

- current production intentionally retains `projectPlanning:getWorkspaceModel`;
- `test/renderer/project-rail-presentation.test.cjs` explicitly expects that Project Planning IPC/preload path to exist;
- accepted reconstruction evidence states `getProjectPlanningWorkspaceModel()` remains the Project Planning lifecycle authority and the direct `projectPlanning:getWorkspaceModel` IPC/preload path remains intact;
- the failing assertion was not introduced by WC01 implementation.

The advisory Architect review correctly identified the failure as unrelated to WC01 and not caused by WC01, but still recommended Request Repair solely because AC8 literally required the entire named file to pass.

## Confirmed Current Prompt Defects

### Formal Work Card creation prompt

`src/main/workCardPlanning/workCardPlanningService.ts`

The current prompt correctly requires focused tests and states that source-string checks may support runtime proof, but it does not require the Architect to keep validation boundaries aligned to the Work Card's owned behavior.

It therefore permits a Work Card to make an entire multi-domain test file an all-or-nothing acceptance gate even when only a subset of that file is relevant to the Work Card objective.

### Advisory Architect review prompt

`src/main/workCardValidation/workCardValidationService.ts`

The current review standard states:

- the Approved Work Card defines the implementation contract;
- the Implementer Report is evidence, not authority;
- passing tests are supporting evidence only;
- production behavior must be independently verified.

It does not state that **failing tests are also evidence requiring technical classification rather than automatic blockers**.

It also does not define when `Validate Passed`, `Request Repair`, or `Inconclusive` should be recommended.

This omission encourages literal contract-compliance reasoning even when repository inspection proves that a failed assertion is unrelated, pre-existing, stale, contradictory, or outside the current Work Card's ownership.

### Retained creation standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

The standard requires focused tests and objective acceptance criteria but does not explicitly require test relevance boundaries or classification of unrelated failures discovered in shared suites.

## Root Cause

Test execution has been treated too easily as a binary compliance gate instead of evidence about a bounded engineering objective.

The architecture should remain strict about real defects and regressions, but the prompts must require technical reasoning about what a test result actually proves.

A failed test must not become an independent authority capable of redefining the current Work Card's scope or invalidating otherwise sufficient proof when repository evidence demonstrates that the failure is unrelated or stale.

## Objective

Make test evidence technically meaningful at both ends of the Work Card workflow:

1. Formal Work Cards select validation at the smallest relevant boundary and avoid turning unrelated assertions in shared suites into acceptance gates.
2. Advisory Architect reviews classify failed tests by causal and scope relevance before deciding whether they are blocking.
3. The retained Work/Repair Card creation standard preserves these rules for future prompt evolution.

This repair does not weaken required testing and does not authorize ignoring unexplained failures.

## Authorized Correction

### 1. Formal Work Card creation prompt

Modify the prompt built by:

`src/main/workCardPlanning/workCardPlanningService.ts`

Add concise drafting guidance establishing all of the following:

- tests are evidence of the Work Card objective, not independent product authority;
- validation must be selected at the smallest practical boundary relevant to the Work Card-owned behavior;
- do not make an entire multi-domain test file or broad suite an all-or-nothing acceptance gate unless the Work Card actually owns all behavior exercised by that file or suite;
- when practical, prefer dedicated focused tests, relevant named test cases, or a focused lane whose assertions map to the Work Card objective;
- full-suite or broad integration cleanliness belongs only to a Work Card that explicitly owns integration/baseline validation;
- if a shared validation lane discovers an unrelated or pre-existing failure, require it to be recorded and routed to the appropriate owner rather than automatically converted into a defect of the current Work Card;
- unexplained failures that may affect the Work Card objective still require classification and cannot simply be ignored.

Do not remove the existing requirements for positive/negative proof, runtime behavior, failure handling, or focused validation.

### 2. Advisory Architect review prompt

Modify the prompt built by:

`src/main/workCardValidation/workCardValidationService.ts`

Add a concise failed-test classification rule.

For any failed command, test case, or assertion that could affect disposition, the Architect must determine whether it:

1. demonstrates an in-scope implementation defect;
2. demonstrates a regression caused by the implementation;
3. leaves required Work Card behavior materially unproven;
4. is unrelated to the Work Card objective or authorized surface;
5. is pre-existing and not caused by the implementation;
6. reflects a stale or contradictory test invariant;
7. reflects validation infrastructure/environment failure; or
8. cannot be confidently classified from available evidence.

The prompt must state:

- passing and failing tests are both evidence, not independent authority;
- a failed test is not blocking solely because it appears in a command, file, or suite named by the Work Card;
- a demonstrated unrelated, pre-existing, or stale/contradictory failure is normally a non-blocking repository/test-baseline concern when the Work Card objective is independently proven;
- current verified production architecture and approved repository authority outrank a stale source-string assertion; do not recommend changing correct production behavior merely to satisfy an obsolete test;
- an unexplained failure that could materially affect the Work Card remains blocking or Inconclusive until classified.

Define the advisory recommendation semantics in the generated prompt:

```text
Validate Passed
→ the Work Card objective and preserved behavior are materially proven;
  remaining findings are non-blocking concerns such as demonstrated unrelated,
  pre-existing, stale-test, or maintenance issues.

Request Repair
→ a material in-scope defect, implementation-caused regression, or essential
  proof gap prevents reasonable confidence in the Work Card objective.

Inconclusive
→ available evidence is insufficient to determine whether a material defect
  or proof gap exists.
```

Also state under the review guidance that `## Blocking Findings` may contain `None`; the existence of that required section does not require the Architect to manufacture a blocker.

### 3. Retained Work/Repair Card creation standard

Update only the relevant testing/acceptance guidance in:

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

Add the durable principle that validation scope must map to the card's owned behavior. When a shared test file/suite contains unrelated domains, do not make the entire shared surface an all-or-nothing acceptance gate unless the card owns those domains. Unrelated/pre-existing failures discovered by broader validation must be recorded and routed rather than automatically attributed to the current card.

Keep this addition concise. Do not rewrite the standard.

## Explicit Non-Scope

Do not modify:

- Phase 00 WC01;
- its Implementer Report;
- `test/repository/runtime-wiring-source.test.cjs`;
- `test/renderer/project-rail-presentation.test.cjs`;
- Project Planning production wiring;
- application validation lifecycle or disposition authority;
- canonical document schemas or metadata;
- renderer/UI behavior;
- Implementer execution policy;
- test runner infrastructure.

This card does not disposition WC01 and does not clean up the stale contradictory test. Those remain separate workflow/baseline matters.

## Preserved Behavior

Preserve:

- the Approved Formal Work Card as the implementation contract;
- the Implementer Report as evidence rather than authority;
- Operator final disposition authority;
- exact workspace/path/revision/SHA verification in advisory review;
- existing advisory output sections;
- `Validate Passed`, `Request Repair`, and `Inconclusive` as the only advisory recommendations;
- objective acceptance criteria and required regression proof;
- strict treatment of genuine in-scope failures and regressions;
- current application-owned Formal Work Card draft/promotion lifecycle;
- no Git mutation unless explicitly authorized.

## Forbidden Changes

Do not:

- create a generic waiver system;
- add an Operator test-waiver workflow;
- make tests optional by default;
- allow the Architect to ignore unexplained failures;
- add probabilistic scoring, severity engines, or AI classifiers;
- weaken workspace/artifact identity checks;
- change Operator disposition authority;
- alter current WC01 solely to make this repair pass;
- repair unrelated stale tests in this card;
- perform Git mutation.

## Acceptance Criteria

### AC1 — Work Card drafting prompt enforces validation relevance

Generated Formal Work Card Architect instructions explicitly require:

- tests as evidence rather than independent authority;
- smallest practical relevant validation boundary;
- no all-or-nothing multi-domain test-file/suite gate unless the Work Card owns all tested behavior;
- routing of demonstrated unrelated/pre-existing failures instead of automatic attribution to the current Work Card.

Existing requirements for focused proof, runtime behavior, negative proof, and failure handling remain present.

### AC2 — Advisory review prompt requires failed-test classification

Generated advisory Architect review instructions explicitly require classification of a failed test/assertion before it is treated as blocking and cover at least:

- in-scope defect/regression;
- essential proof gap;
- unrelated/pre-existing failure;
- stale/contradictory invariant;
- infrastructure/environment failure;
- insufficient evidence / Inconclusive.

### AC3 — Advisory recommendations have engineering semantics

Generated advisory prompt explicitly defines:

- `Validate Passed` for materially proven Work Card behavior with only demonstrated non-blocking concerns;
- `Request Repair` for material in-scope defects, implementation-caused regressions, or essential proof gaps;
- `Inconclusive` when evidence cannot establish whether a material defect/proof gap exists.

The prompt explicitly states that a failed test is not automatically blocking merely because the Work Card named its command/file/suite.

### AC4 — Stale test cannot outrank verified architecture

Generated advisory prompt explicitly states that verified current production architecture and approved repository authority outrank a stale source-string assertion and that correct production behavior must not be changed merely to make an obsolete assertion pass.

### AC5 — Blocking Findings may legitimately be empty

Generated advisory prompt explicitly permits `## Blocking Findings` to state `None` when no material blocker is established.

### AC6 — Retained creation standard captures the rule

`WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` contains a concise durable rule aligning validation scope with card-owned behavior and routing unrelated/pre-existing shared-suite failures instead of automatically treating them as current-card defects.

### AC7 — Existing prompt contracts remain intact

Focused tests prove no regression to:

- bound workspace instructions;
- exact artifact path/revision/SHA verification;
- required advisory review section names;
- Operator final authority language;
- Formal Work Card required section structure;
- application-owned draft/write path.

## Required Files / Areas to Inspect

Production/policy:

- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardValidation/workCardValidationService.ts`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

Focused tests:

- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-validation/work-card-validation-service.test.cjs`
- inspect `test/architect-outputs/architect-output-prompt-contracts.test.cjs` only if necessary to preserve existing Formal Work Card prompt contracts.

Evidence-only, do not modify:

- `planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md`
- `planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md`
- `test/repository/runtime-wiring-source.test.cjs`
- `test/renderer/project-rail-presentation.test.cjs`
- relevant reconstruction Repair/Implementer Reports preserving `projectPlanning:getWorkspaceModel`.

## Focused Validation

Run:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/work-card-validation/work-card-validation-service.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs
```

If `architect-output-prompt-contracts.test.cjs` is unaffected and unnecessary to the final change, it may still be run as preservation proof but must not be modified without demonstrated need.

Do not run the full historical suite merely to satisfy this repair.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR07_test_evidence_relevance_in_work_card_drafting_and_architect_review.md`

The report must include:

- confirmed prompt defects and root cause;
- exact files changed;
- concise summary of the Work Card drafting guidance added;
- concise summary of the failed-test classification/disposition guidance added;
- standard change summary;
- focused prompt-contract proof;
- exact commands/results;
- deviations/blockers;
- confirmation that WC01 and stale contradictory tests were not modified;
- confirmation of no Git mutation.

## Return Path

Return for Architect code review. After this repair passes, use the corrected advisory-review behavior for future Work Card reviews. WC01 disposition remains an Operator decision based on its actual engineering evidence; this repair does not automatically validate or repair WC01.