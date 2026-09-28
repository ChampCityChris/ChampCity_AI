# WRB04-R02-05 — Requalify and Close WRB04

**Parent:** WRB04 Repair02  
**Depends on:** WRB04-R02-04 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Perform final composed WRB04 qualification after Repair02.

This is a qualification/closeout card.

Do not use it as an excuse for another broad implementation pass.

If a new production defect is discovered, stop and return it to the Architect.

## 1. Verify repair checkpoints

Verify one clean attributable checkpoint/report for:

- R02-01 WorkItem execution-contract authority;
- R02-02 human Criterion authority;
- R02-03 Phase validation/Repair;
- R02-04 runtime interaction/concurrency presentation.

## 2. WorkItem execution-contract qualification

Prove:

1. accepted WorkItem cannot start Implementer before Architect execution planning;
2. Architect plan survives reopen from SPS;
3. exact Implementer contract contains persisted boundaries/affected paths/proof intent;
4. contract includes WorkItem + accepted-solution completion Criteria;
5. decomposition replacements require fresh execution planning;
6. canonical Repair WorkItem uses the same planning boundary;
7. source-backed out-of-plan file change blocks automatic checkpoint;
8. valid in-scope source change checkpoints normally.

## 3. Human Criterion negative/freshness qualification

Prove all of these explicitly:

1. solution planning acceptance does **not** satisfy a solution `operator_decision` Criterion;
2. two Operator Criteria on one owner require two independent Criterion Decisions;
3. prior Criterion Decision becomes stale after a new current TesterResult;
4. WorkItem visual fail persists fail and creates Repair;
5. WorkItem visual inconclusive remains unsatisfied;
6. rejected WorkItem/solution Criterion Decision can create only its exact bounded Repair;
7. Phase human decisions are Criterion-specific and aggregate-evidence fresh;
8. renderer cannot author implementation/source/principal authority.

## 4. Phase validation/repair qualification

Use a Phase with 2+ WorkItems.

Prove:

- source-backed deterministic Phase Criterion uses exact current candidate;
- source-neutral deterministic Phase Criterion never auto-passes from WorkItem closure;
- semantic Phase Validator receives all current member ImplementationRecord/TesterResult evidence;
- WorkItem-owned deferred visual Criterion is consumed by exactly its owning Phase;
- accepted-solution deferred visual Criterion is consumed at the intended final Phase;
- deterministic Phase failure creates Phase Repair;
- semantic Phase failure creates Phase Repair;
- visual Phase failure creates Phase Repair;
- rejected Phase Operator Criterion creates Phase Repair;
- Phase Repair re-enters Architect planning → Implementer → Tester → Validator;
- Phase remains blocked until Repair closes and fresh validation passes.

## 5. Runtime interaction/concurrency qualification

Prove:

- Implementer option question;
- Implementer free-text question;
- Tester option question;
- Tester free-text question;
- MCP elicitation bounded field response;
- exact cancel paths;
- two independent exact Workflows can execute concurrently within backend capacity;
- same-checkout Implementer/Tester source mutation remains mutually exclusive;
- capacity exhaustion returns visible bounded feedback;
- legacy global execution semantics are unchanged.

## 6. Feature source-backed composed vertical

Use a disposable managed Current Project and exercise:

```text
Feature front half
→ Work Item Map
→ Architect WorkItem plan
→ optional decomposition scenario
→ Implementer
→ source checkpoint
→ Tester
→ Validator
→ human Criterion failure
→ canonical Repair
→ replan Repair
→ Implementer/Tester/Validator
→ WorkItem close
→ multi-member Phase validation
→ Phase Repair when forced
→ Phase close
→ Workflow execution completion
→ exact Workflow integration
→ Dev advance
→ Workflow close
```

Do not replace this with isolated service tests.

## 7. Issue vertical

From accepted Issue RCA/correction planning, prove the same shared post-plan services:

- WorkItem planning;
- Implementer;
- Tester;
- Validator;
- human evidence;
- Repair;
- Phase handling if phased;
- Workflow completion;
- exact integration.

No Issue Fix Card/private Issue execution authority may own the target.

## 8. WIR target convergence

Route WIR to Feature or Issue and prove:

- WIR stays routing provenance;
- target opens by exact target Workflow ID;
- target uses identical R02 WorkItem planning/execution services;
- no WorkIntake-owned source/execution/integration path is invoked.

## 9. Source-neutral vertical

Prove source-neutral execution through:

- Architect WorkItem plan;
- Implementer;
- Tester;
- semantic/human validation;
- completion;
- closed Workflow.

No RepositoryCheckout, SourceCheckpoint, fake revision, or IntegrationRecord.

If deterministic source-neutral proof is unsupported, qualification must prove the system reports that limitation rather than inventing pass evidence.

## 10. Restart/reopen matrix

Recreate application services from durable state after:

1. accepted WorkItem execution plan;
2. decomposition;
3. implementation/validation-pending;
4. TesterResult/checkpoint;
5. Criterion Decision/visual evidence;
6. active WorkItem Repair;
7. closed WorkItem;
8. Phase validation pending;
9. failed Phase Criterion;
10. active Phase Repair;
11. Phase revalidated/closed;
12. integration-ready Workflow;
13. retained integration candidate/repair;
14. integrated/closed Workflow.

No Markdown or renderer-memory reconstruction.

## 11. Legacy fence

Audit Current Project production callers.

Exact Feature/Issue target execution must not derive authority from:

- WorkIntake;
- routed-development execution;
- private Issue execution;
- Work Card/Fix Card alias identity;
- Markdown current-workflow reconstruction;
- Project-wide execution-plan selection.

Retained historical modules may remain only with documented non-Current-Project callers.

## 12. Desktop usability smoke

Run supported desktop launch.

When window inspection is available, verify:

- Feature/Issue shared execution Workspace;
- Architect WorkItem planning surface;
- decomposition review;
- exact runtime option/free-text interactions;
- human Criterion controls;
- Phase failure/Repair controls;
- errors/status;
- Back to Workflows;
- reopen to SPS-derived stage.

If no inspectable window surface exists, state the limitation exactly.

Do not claim visual acceptance from process launch alone.

## 13. Final report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair02/Reports/WRB04-R02-05_FINAL_QUALIFICATION_REPORT.md`

Include:

- checkpoint list;
- negative/freshness results;
- Feature/Issue/WIR/source-neutral results;
- Phase failure/repair results;
- concurrency results;
- recovery matrix;
- legacy caller audit;
- desktop evidence/limitations;
- unrelated remaining debt;
- explicit statement that WRB05/web migration did not begin.

Update parent WRB04 README/rebaseline to **qualification complete / awaiting Architect acceptance**.

Do not declare Architect acceptance yourself.

## Validation

Run:

- build;
- all R02 focused suites;
- composed Feature vertical;
- composed Issue vertical;
- WIR target convergence;
- source-neutral vertical;
- restart/reopen matrix;
- exact integration service proof;
- shared renderer interaction tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`;
- desktop launch smoke.

Do not run the historical full suite merely for ceremony.

## Checkpoint and STOP

Commit:

`WRB04-R02-05 requalify WRB04 shared execution`

Then STOP for final Architect review.

Do not begin WRB05.
