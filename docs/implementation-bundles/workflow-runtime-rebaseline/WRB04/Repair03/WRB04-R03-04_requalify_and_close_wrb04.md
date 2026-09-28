# WRB04-R03-04 — Requalify and Close WRB04

**Parent:** WRB04 Repair03  
**Depends on:** WRB04-R03-03 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Perform final WRB04 qualification after Repair03 and produce the evidence required for human Architect acceptance.

This is a qualification/closeout card.

Do not absorb a newly discovered production defect into this card. Stop and report it.

## 1. Verify Repair03 checkpoints

Verify one clean attributable checkpoint/report for:

- R03-01 WorkItem planning UX and scope-violation recovery;
- R03-02 source-backed evidence lineage and completion;
- R03-03 source-mode-executable canonical Repairs.

## 2. WorkItem planning and scope-recovery vertical

Use a disposable source-backed exact Workflow WorkItem.

Prove:

1. embedded Architect browser is present in the shared execution Workspace;
2. Architect handoff includes exact Workflow/WorkItem/solution/Criteria/source context;
3. bounded Architect JSON result imports successfully;
4. accepted execution plan persists in SPS;
5. Implementer contract consumes accepted plan;
6. one attempt writes an out-of-scope path;
7. attempt is persisted as non-successful scope-violation evidence;
8. no SourceCheckpoint is created;
9. exact checkout is restored to prior HEAD and clean state;
10. WorkItem returns to ready;
11. Architect plan is revised to include legitimate broader path;
12. retry uses new record version/digest;
13. valid retry checkpoints normally;
14. a failed safe-restore fixture remains visibly blocked instead of retryable.

## 3. Source-backed multi-WorkItem evidence-lineage vertical

Use at least two sequential source-mutating WorkItems A → B.

Required chronology:

```text
A implementation/tester → R1
A validates/closes
B implementation/tester → R2
B validates/closes
final Workflow candidate → R2
```

Prove:

- A TesterResult at R1 remains valid current member evidence because R1 is on the exact checkpoint chain;
- B TesterResult at R2 is current;
- cumulative evidence helper returns [A,B] at final boundary;
- final SourceBinding revision = R2;
- no closed WorkItem is retroactively invalidated solely because final revision advanced.

## 4. Solution Operator Decision dependency-chain qualification

Use a solution-owned `operator_decision` Criterion and two dependent WorkItems.

Prove:

1. after A TesterResult, Criterion Decision [A] can be recorded;
2. A can close;
3. B becomes eligible and executes;
4. after B TesterResult, Decision [A] is stale;
5. corrected Decision [A,B] becomes current;
6. B can close;
7. final Workflow completion recognizes [A,B];
8. no future/unimplemented WorkItem is required before the current WorkItem can close.

This must be a real dependency chain.

## 5. Source-backed multi-member/multi-Phase aggregate proof

Use a source-backed phased Workflow with at least:

- Phase 1 containing 2 sequential WorkItems producing different revisions;
- Phase 2 producing a later revision.

Prove:

Phase 1:
- aggregate semantic/human/Operator evidence can include both R1/R2 member TesterResults through checkpoint lineage;
- Phase Validation is bound to final Phase-1 candidate;
- Phase closes.

Phase 2:
- advances source to R3;
- Phase 1 remains canonically closed;
- Workflow completion does not revalidate Phase-1 Criteria at R3.

Final solution Criterion must still be current at R3.

Include an actual source-backed deterministic Phase profile fixture against the exact candidate; do not leave that as a stated gap again.

## 6. Source-neutral Repair product vertical

Use actual shared application services.

Prove:

```text
source-neutral parent implementation
→ Tester production defect or rejected human Criterion
→ canonical Repair semantic_ai Criterion
→ Architect Repair plan
→ Repair Implementer
→ source-neutral Tester
→ semantic Validator
→ Repair close
→ parent correction/revalidation
```

No direct `ProjectStateService.recordValidation` injection is allowed as the Repair proof.

No Git/source records are fabricated.

## 7. Source-neutral Phase Repair product vertical

Prove:

```text
source-neutral Phase Criterion fail
→ canonical same-Phase Repair semantic_ai Criterion
→ WorkItem planning
→ Implementer
→ Tester
→ semantic Validator
→ Repair close
→ original Phase evidence remains stale
→ fresh original Phase validation
→ Phase close
```

No direct injected deterministic Repair Validation.

## 8. Source-backed Repair regression

Prove one source-backed WorkItem or Phase Repair through:

- deterministic generated Repair Criterion;
- accepted Repair path scope;
- exact implementation checkpoint;
- Tester;
- deterministic Validator;
- Repair close;
- fresh revalidation of original failed Criterion.

## 9. Runtime interaction/capacity presentation

Prove at renderer/product boundary:

- option input;
- free-text input;
- structured MCP elicitation;
- exact cancel;
- returned capacity exhaustion model appears as visible failure and does **not** display “run started”;
- same-checkout role-lease refusal appears as visible failure;
- valid running result displays started feedback;
- two independent exact Workflows can start when backend capacity remains.

Do not rely only on source-text regex for the returned-model cases.

## 10. Feature composed vertical

Use a disposable managed Current Project and run one substantial source-backed Feature through:

```text
Feature front half
→ Work Item Map
→ embedded Architect WorkItem planning
→ Implementer
→ checkpoint
→ Tester
→ Validator
→ forced WorkItem failure
→ canonical Repair
→ Repair planning/execution/validation
→ WorkItem close
→ phased aggregate validation
→ forced Phase Repair
→ Phase close
→ Workflow execution completion
→ exact integration
→ Dev advance
→ Workflow close
```

The vertical may reuse fixtures from sections above but must compose the actual production services in order.

## 11. Issue composed vertical

From accepted Issue RCA/correction plan, prove the same shared post-plan contracts:

- Architect WorkItem planning;
- Implementer;
- Tester;
- Validator;
- Repair;
- Phase when present;
- completion;
- exact integration.

No private Issue Fix Card/routed execution authority.

## 12. WIR convergence

Route one WIR target to Feature/Issue and prove:

- WIR remains closed routing provenance;
- target opens by exact Workflow ID;
- same Repair03 WorkItem planning/execution path;
- no WorkIntake-owned source/execution/integration authority.

## 13. Source-neutral ordinary vertical

Prove one non-repair source-neutral Workflow through:

- Architect WorkItem plan;
- Implementer;
- Tester;
- semantic/human validation;
- WorkItem/Workflow completion;
- closed Workflow.

No RepositoryCheckout, SourceCheckpoint, fake revision, or IntegrationRecord.

## 14. Restart/reopen matrix

Recreate services from durable SPS/source state at minimum after:

1. accepted WorkItem execution plan;
2. failed scope violation + restored ready state;
3. successful implementation/checkpoint;
4. TesterResult;
5. cumulative solution Decision [A];
6. later evidence making that Decision stale;
7. corrected final solution Decision;
8. active WorkItem Repair;
9. closed WorkItem;
10. active Phase Repair;
11. closed Phase;
12. integration-ready;
13. retained integration candidate/repair;
14. integrated/closed Workflow.

No Markdown or renderer-memory reconstruction.

## 15. Legacy authority fence

Audit Current Project Feature/Issue execution after Repair03.

No authority may come from:

- WorkIntake ID;
- routed-development execution;
- private Issue Fix Card execution;
- Markdown/currentWorkflow reconstruction;
- project-wide execution-plan selection.

Document exact retained legacy callers rather than deleting unrelated history.

## 16. Desktop usability boundary

Run the supported desktop launch smoke.

If an inspectable window is available, verify:

- shared execution Workspace;
- embedded Architect WorkItem browser;
- bounded draft/import/review;
- retry/error state after scope refusal;
- runtime returned-error presentation;
- human/Phase/Repair controls;
- Back to Workflows;
- SPS-derived reopen.

If no inspectable window is available, state that limitation exactly.

Do not claim visual acceptance from process launch alone.

## 17. Final validation/report

Run:

- build;
- all R03 focused suites;
- source-backed multi-WorkItem/multi-Phase evidence suite;
- scope-recovery/retry suite;
- source-neutral Repair product suites;
- source-backed Repair regression;
- Feature composed vertical;
- Issue composed vertical;
- WIR convergence;
- source-neutral ordinary vertical;
- restart/reopen matrix;
- exact integration service proof;
- renderer returned-model interaction tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`;
- desktop launch smoke.

Do not run the historical full repository suite merely for ceremony.

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair03/Reports/WRB04-R03-04_FINAL_QUALIFICATION_REPORT.md`

Update parent WRB04 README/rebaseline to:

**qualification complete / awaiting Architect acceptance**

Do not declare WRB04 accepted on Implementer authority.

## Checkpoint and STOP

Commit:

`WRB04-R03-04 requalify WRB04 final state machine`

Then STOP for human Architect review.

Do not begin WRB05.
