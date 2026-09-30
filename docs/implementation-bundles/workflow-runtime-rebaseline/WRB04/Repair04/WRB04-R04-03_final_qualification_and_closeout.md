# WRB04-R04-03 — Final Source-Backed Qualification and WRB04 Closeout

**Parent:** WRB04 Repair04  
**Depends on:** WRB04-R04-02 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Perform the final WRB04 qualification after checkpoint recovery and source-mode planning fences are complete.

This is a qualification/closeout card.

Do not absorb new production defects into this card. If a new defect is found, stop and return it to the Architect.

## 1. Verify Repair04 checkpoints

Verify clean attributable checkpoints/reports for:

- R04-01 durable implementation/Tester checkpoint recovery;
- R04-02 source-neutral deterministic planning fence and runtime failure presentation.

## 2. Implementation checkpoint recovery vertical

Use a disposable source-backed exact Workflow WorkItem.

Exercise:

1. Architect WorkItem plan;
2. Implementer semantic success;
3. exact attributed source changes;
4. structured implementation checkpoint enters blocked or inspection-required;
5. process/application service is recreated;
6. recovery projection identifies same exact ImplementationRecord/checkpoint/boundary;
7. retry/reconcile uses durable attempt evidence;
8. no second Implementer run occurs;
9. exact SourceCheckpoint commits or reconciles the one matching commit;
10. SourceBinding advances;
11. Tester becomes eligible.

Also prove conflicting source evidence remains inspection-required and cannot fabricate a commit.

## 3. Tester checkpoint recovery vertical

Use a source-backed WorkItem whose Tester makes permanent proof changes.

Exercise:

1. implemented + committed implementation checkpoint;
2. one exact TesterResult with permanentTestPaths;
3. Tester checkpoint blocked or inspection-required;
4. process/application service recreated;
5. recovery projection shows exact TesterResult/checkpoint identity;
6. retry/reconcile uses the same TesterResult and path set;
7. matching uncertain commit reconciles without duplicate TesterResult/commit;
8. TesterResult becomes committed;
9. candidateRevisionId/sourceCheckpointId are current;
10. Validator becomes eligible.

Conflicting evidence remains inspection-required.

## 4. Source-neutral validation-policy fence qualification

Prove canonical planning rejects required deterministic Criteria at all required ownership locations:

- WorkItem;
- accepted BoundedSolution;
- Phase.

Prove:

- optional/informational deterministic Criteria remain non-blocking and accepted;
- semantic_ai, visual_human, deferred_visual_phase where valid, and operator_decision remain accepted;
- source-backed Workflow accepts required deterministic Criteria;
- source-neutral decomposition cannot introduce a new required deterministic split;
- generated source-neutral Repairs remain semantic_ai.

No source-neutral deterministic Workflow may reach execution with an impossible required proof obligation.

## 5. Actual source-backed deterministic Phase ValidationCatalog vertical

Close the R02/R03 evidence gap with a real managed source-backed fixture.

Required:

1. real Dev checkout + exact Workflow linked checkout;
2. immutable SourceBaseline;
3. 2+ Phase WorkItems produce committed source revisions;
4. current SourceBinding terminates at exact candidate;
5. Phase has a required deterministic Criterion;
6. exact checkout is clean and on expected Workflow source line;
7. ValidationCatalog phase profile runs against the real exact candidate;
8. changed path/capability selection is attributable;
9. resulting Phase Validation binds:
   - exact Criterion version;
   - current final Phase candidate revision;
   - complete current member TesterResult set;
10. pass permits Phase completion.

Add a failing ValidationCatalog fixture if bounded and practical; otherwise source-backed deterministic failure → Phase Repair is proven separately below.

## 6. Source-backed WorkItem Repair product vertical

Use a real source-backed parent WorkItem and force a current repairable failure.

Required sequence:

```text
parent WorkItem
→ Architect plan
→ Implementer checkpoint
→ Tester
→ failing current Criterion / production defect
→ canonical WorkItem Repair
→ Repair Architect plan
→ Repair Implementer checkpoint
→ Repair Tester
→ deterministic Repair Validator
→ Repair close
→ parent exact correction/revalidation
```

Prove:

- generated Repair Criterion is deterministic;
- Repair source changes stay inside accepted Repair path scope;
- Repair source checkpoint advances exact Workflow chain;
- original failed parent Criterion is not auto-passed merely because Repair closed.

## 7. Source-backed Phase Repair product vertical

Use a real source-backed Phase Criterion failure.

Required:

```text
Phase members close
→ current Phase deterministic|semantic|visual failure
→ typed same-Phase Repair
→ Architect Repair plan
→ Repair Implementer checkpoint
→ Tester
→ deterministic Repair Validator
→ Repair close
→ prior Phase evidence stale
→ fresh original Phase validation
→ Phase close
```

Prove Repair candidate revision is on the canonical Workflow chain.

## 8. Multi-WorkItem/multi-Phase source chronology regression

Retain/prove the R03-02 chronology:

```text
A Tester = R1
B Tester = R2
Phase 1 closes at R2
later Phase → R3
final Workflow candidate = R3
```

Verify:

- A remains valid historical member evidence because R1 is on chain;
- closed A does not revalidate at R3;
- closed Phase 1 does not revalidate at R3;
- final solution-level obligations are current at R3;
- Workflow completion becomes eligible.

## 9. Solution Operator Decision dependency-chain regression

Use A → B dependency and one solution-level Operator Criterion.

Prove:

- Decision [A] permits A close;
- B then executes;
- Decision [A] becomes stale;
- Decision [A,B] is required/current;
- B/final Workflow can close;
- no dependency deadlock.

Run source-neutral and source-backed versions if they do not duplicate large fixtures excessively; source-backed is mandatory.

## 10. Runtime returned-failure presentation

At renderer/product helper boundary prove all:

- Implementer capacity exhaustion returned model stays visibly failed/unavailable;
- no “run started” feedback;
- same-checkout lease refusal stays visible;
- source-preparation refusal stays visible;
- valid running result shows started feedback;
- Tester returned refusal updates Tester only;
- approval/input/MCP/cancel returned models update their correct role;
- later successful explicit action clears/replaces prior error;
- projection refresh does not erase the operation result prematurely.

Do not rely only on source-code regex; exercise the handler/component behavior.

## 11. Feature composed source-backed vertical

Run one substantial disposable Feature through the complete shared path:

```text
Feature front half
→ Work Item Map
→ embedded Architect WorkItem planning
→ Implementer
→ checkpoint
→ Tester
→ Validator
→ forced WorkItem failure
→ WorkItem Repair
→ Repair plan/execution/Test/Validator/close
→ multi-member Phase
→ deterministic Phase proof
→ forced Phase failure
→ Phase Repair
→ Repair execution/close
→ Phase revalidation/close
→ Workflow execution completion
→ exact Workflow integration
→ Dev advance
→ Workflow closed
```

This must use the production services in order.

## 12. Issue composed vertical

From accepted Issue RCA/correction planning, prove the same post-plan machinery at least through:

- WorkItem Architect planning;
- Implementer checkpoint;
- Tester;
- Validator;
- one canonical Repair;
- WorkItem/Phase completion as applicable;
- exact Workflow integration;
- final close.

No Issue Fix Card/private Issue execution authority.

## 13. WIR convergence

Route one WIR target to Feature or Issue and prove:

- WIR remains routing provenance only;
- target uses the same Repair04 WorkItem/checkpoint recovery/validation/integration services;
- no WorkIntake-owned source/execution/integration authority.

## 14. Source-neutral ordinary + Repair regression

Prove:

- ordinary source-neutral Workflow with supported policies completes without Git state;
- source-neutral Repair uses semantic_ai product Validator;
- required deterministic source-neutral plan is rejected before execution.

## 15. Restart/reopen matrix

Recreate durable services after at minimum:

1. accepted WorkItem execution plan;
2. implementation checkpoint blocked;
3. implementation checkpoint reconciled;
4. TesterResult checkpoint blocked;
5. TesterResult checkpoint reconciled;
6. active WorkItem Repair;
7. closed WorkItem;
8. Phase validation pending;
9. active Phase Repair;
10. closed Phase;
11. integration-ready;
12. retained integration candidate/repair;
13. integrated/closed Workflow.

Running external model processes need not survive.

No recovery may depend on renderer memory or Markdown.

## 16. Legacy authority fence audit

Repeat the Current Project production caller audit after Repair04.

Feature/Issue target execution must not derive authority from:

- WorkIntake identity;
- routed-development execution;
- private Issue Fix Card execution;
- Markdown/currentWorkflow reconstruction;
- project-wide execution-plan selection.

Retained historical callers may remain only when documented as outside the Current Project exact target path.

## 17. Desktop/application smoke

Run the supported desktop lane.

If an inspectable window is available, verify:

- embedded Architect WorkItem planning;
- implementation checkpoint recovery UI;
- Tester checkpoint recovery UI;
- returned runtime failure presentation;
- human/Phase/Repair controls;
- Back to Workflows;
- reopen from durable recovery states.

If no inspectable window is available, state that limitation exactly.

If the desktop lane fails in unrelated test harness code, isolate and report the exact unrelated failure. Do not infer WRB04 failure or success from it.

## 18. Final report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair04/Reports/WRB04-R04-03_FINAL_QUALIFICATION_REPORT.md`

Include:

- checkpoint list;
- implementation checkpoint reconciliation evidence;
- Tester checkpoint reconciliation evidence;
- source-neutral planning fence results;
- source-backed deterministic Phase evidence;
- source-backed WorkItem/Phase Repair results;
- Feature/Issue/WIR/source-neutral composed results;
- source chronology/cumulative Decision results;
- restart/reopen matrix;
- runtime returned-failure presentation;
- legacy caller audit;
- desktop evidence/limitations;
- unrelated remaining debt;
- explicit statement that WRB05/web migration did not begin.

Update parent WRB04 README/rebaseline to:

**qualification complete / awaiting Architect acceptance**

Do not declare Architect acceptance yourself.

## Validation

Run:

- build;
- R04-01 focused checkpoint recovery suites;
- R04-02 planning/runtime presentation suites;
- source-backed deterministic Phase fixture;
- source-backed WorkItem Repair fixture;
- source-backed Phase Repair fixture;
- composed Feature vertical;
- composed Issue vertical;
- WIR convergence;
- source-neutral ordinary/Repair vertical;
- restart/reopen matrix;
- direct exact Workflow integration regression;
- shared renderer product tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`;
- supported desktop lane.

Do not run the historical full repository suite merely for ceremony.

## Checkpoint and STOP

Commit:

`WRB04-R04-03 final qualification and closeout`

Then STOP for human Architect review.

Do not begin WRB05.
