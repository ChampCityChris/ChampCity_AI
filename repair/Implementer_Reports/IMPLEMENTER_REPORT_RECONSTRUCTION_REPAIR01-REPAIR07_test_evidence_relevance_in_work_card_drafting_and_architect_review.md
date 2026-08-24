# IMPLEMENTER REPORT - RECONSTRUCTION-REPAIR01-REPAIR07

## Pass Type

Bounded prompt-policy repair for `RECONSTRUCTION-REPAIR01-REPAIR07_test_evidence_relevance_in_work_card_drafting_and_architect_review`.

## Repository Path Inspected

Verified approved repo root: `<PROJECT_REPO>`.

## Git Branch And Remote Status

- Branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Remote tracking: `origin/feature/phase-04-wc01-repair01-evidence-derived-workflow`
- Git mutation: none performed. No stage, commit, push, branch, rebase, tag, reset, clean, restore, or stash was run.
- Existing dirty files were present before this pass and left in place.

## Confirmed Prompt Defects And Root Cause

Confirmed Formal Work Card prompt defect:

- `src/main/workCardPlanning/workCardPlanningService.ts` required focused proof but did not instruct the Architect to align validation scope to Work Card-owned behavior.
- That allowed a broad shared test file or suite to become an all-or-nothing acceptance gate even when unrelated assertions were outside the Work Card objective.

Confirmed advisory Architect review prompt defect:

- `src/main/workCardValidation/workCardValidationService.ts` treated passing tests as supporting evidence but did not require failed tests to be technically classified before affecting disposition.
- It did not define `Validate Passed`, `Request Repair`, and `Inconclusive` recommendation semantics.
- It did not state that `## Blocking Findings` may legitimately contain `None`.

Root cause:

- Test execution was too easily treated as a binary compliance gate instead of evidence about a bounded engineering objective. The prompts did not require causal/scope classification of failed assertions.

## Files Changed

- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardValidation/workCardValidationService.ts`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`
- `test/work-card-planning/work-card-planning-service.test.cjs`
- `test/work-card-validation/work-card-validation-service.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR07_test_evidence_relevance_in_work_card_drafting_and_architect_review.md`

## Work Card Drafting Guidance Added

The Formal Work Card Architect prompt now states:

- tests are evidence of the Work Card objective, not independent product authority;
- validation must use the smallest practical boundary relevant to the Work Card-owned behavior;
- an entire multi-domain test file or broad suite must not become an all-or-nothing acceptance gate unless the Work Card owns all behavior exercised by it;
- dedicated focused tests, relevant named test cases, or a focused lane mapped to the Work Card objective are preferred when practical;
- broad suite cleanliness belongs only to Work Cards that explicitly own integration or baseline validation;
- demonstrated unrelated or pre-existing failures discovered by shared validation must be recorded and routed rather than automatically attributed to the current Work Card;
- unexplained failures that may affect the Work Card objective still require classification and cannot be ignored.

Existing requirements for production-path proof, positive/negative proof, failure handling, retry behavior, downstream readiness, and manual-validation boundaries remain intact.

## Failed-Test Classification And Disposition Guidance Added

The advisory Architect review prompt now requires failed commands, test cases, or assertions to be classified before they are treated as blocking.

The required classification covers:

- in-scope implementation defect;
- implementation-caused regression;
- essential proof gap;
- unrelated failure outside the Work Card objective or authorized surface;
- pre-existing failure not caused by the implementation;
- stale or contradictory test invariant;
- validation infrastructure or environment failure;
- insufficient evidence to classify.

The prompt now states:

- passing and failing tests are evidence, not independent authority;
- a failed test is not blocking solely because it appears in a command, file, or suite named by the Work Card;
- demonstrated unrelated, pre-existing, or stale/contradictory failures are normally non-blocking repository/test-baseline concerns when the Work Card objective is independently proven;
- verified current production architecture and approved repository authority outrank a stale source-string assertion;
- correct production behavior must not be changed merely to satisfy an obsolete assertion;
- unexplained failures that could materially affect the Work Card remain blocking or Inconclusive until classified.

Advisory recommendation semantics are now explicitly defined:

- `Validate Passed`: Work Card objective and preserved behavior are materially proven; remaining findings are non-blocking concerns.
- `Request Repair`: material in-scope defect, implementation-caused regression, or essential proof gap prevents reasonable confidence.
- `Inconclusive`: available evidence is insufficient to determine whether a material defect or proof gap exists.

The prompt also states that `## Blocking Findings` may state `None`.

## Standard Change Summary

`WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` now contains a concise durable rule under Work Card testing guidance:

- validation scope must map to card-owned behavior;
- shared test files or suites with unrelated domains must not become all-or-nothing gates unless the card owns those domains;
- unrelated or pre-existing broader-validation failures must be recorded and routed rather than automatically attributed to the current card.

No broader rewrite of the standard was performed.

## Focused Prompt-Contract Proof

Focused tests prove:

- Formal Work Card prompt includes the validation relevance guidance while preserving existing prompt contract requirements.
- Advisory Architect review prompt includes failed-test classification, stale-test/source-string guidance, recommendation semantics, and empty Blocking Findings permission.
- Retained standard contains the durable validation relevance rule.
- Existing bound-workspace instructions, exact artifact path/revision/SHA verification, advisory section names, Operator final authority language, Formal Work Card section structure, and application-owned draft/write path remain covered.

## Commands Run And Results

- `pwd`
  - Lane: read-only workspace verification.
  - Result: verified approved repo root.

- `git status --short --branch`
  - Lane: read-only Git status.
  - Result: branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`; existing dirty files plus this repair's modified files/report.

- `git remote -v`
  - Lane: read-only Git remote inspection.
  - Result: `origin` points to `https://github.com/ChampCityChris/ChampCity_AI.git`.

- `node --check test/work-card-planning/work-card-planning-service.test.cjs`
  - Lane: sandbox syntax check.
  - Result: passed.

- `node --check test/work-card-validation/work-card-validation-service.test.cjs`
  - Lane: sandbox syntax check.
  - Result: passed.

- `node --check test/architect-outputs/architect-output-prompt-contracts.test.cjs`
  - Lane: sandbox syntax check.
  - Result: passed.

- `npm run typecheck`
  - Lane: sandbox.
  - Result: passed.

- `npm run build`
  - Lane: sandbox.
  - Result: failed with documented `spawn EPERM` while Vite/esbuild attempted to spawn.

- `npm run build`
  - Lane: normal Windows validation lane after documented sandbox `spawn EPERM`.
  - Result: passed.

- `node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/work-card-validation/work-card-validation-service.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs`
  - Lane: sandbox.
  - Result: failed with documented `spawn EPERM` before focused tests could run.

- `node --test --test-concurrency=1 test/work-card-planning/work-card-planning-service.test.cjs test/work-card-validation/work-card-validation-service.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs`
  - Lane: normal Windows validation lane after documented sandbox `spawn EPERM`.
  - Result: passed, 25 tests passed, 0 failed.

## Deviations / Blockers

No blockers. No authorized scope deviations known.

## Explicit Non-Scope Confirmation

Not modified:

- Phase 00 WC01 Work Card;
- Phase 00 WC01 Implementer Report;
- `test/repository/runtime-wiring-source.test.cjs`;
- `test/renderer/project-rail-presentation.test.cjs`;
- Project Planning production wiring;
- application validation lifecycle or disposition authority;
- canonical document schemas or metadata;
- renderer/UI behavior;
- Implementer execution policy.

Phase 00 WC01 was not run or dispositioned.

## Security / Secret-Safety Notes

- No secrets, tokens, credentials, API keys, `.env` files, or concrete local machine paths were added.
- No renderer filesystem authority was changed.
- No dependency, cloud service, connector, MCP integration, or provider SDK was added.

## Git Actions Performed

None. Commit hash: not applicable because no commit was created.

## Return Path

Return for Architect code review. Future advisory reviews should use the corrected failed-test classification behavior; this repair does not automatically validate or repair WC01.
