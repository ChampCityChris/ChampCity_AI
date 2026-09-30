# WRB04-05 — Complete Workflows and Integrate Exact Workflow Source to Dev

**Depends on:** completed WRB04-04  
**Implementer:** GPT 6.0 Luna Medium  
**Execution rule:** ONE card, ONE report, ONE commit. Do not split this card.

## Objective

Complete the shared execution kernel after all WorkItems/Phases are done:

```text
all WorkItems / Phases complete
→ Workflow execution complete
→ exact Workflow integration candidate
→ validation / Integration Repair when required
→ Dev advance
→ IntegrationRecord integrated
→ Workflow closed
```

Direct and WIR-routed Feature/Issue instances use the same exact-Workflow service.

## 1. Typed Workflow execution completion

Add/use one typed command and projection for Workflow execution completion.

Preconditions:
- exact current substantive Workflow;
- accepted canonical plan exists;
- all current direct WorkItems closed;
- all Phases closed for phased topology;
- no active Repair/Fix;
- required solution/Workflow completion Criteria satisfied;
- no blocking Decision/Finding;
- exact Tester/Validator obligations resolved;
- source checkpoint chain current when source-backed.

Execution completion is not final integration.

For source-backed Workflows:
- advance to an explicit integration-ready workspace/state while Workflow remains active.

For valid source-neutral/non-source Workflows:
- no repository integration exists;
- close the Workflow through typed completion after execution obligations are satisfied.

Do not use generic record mutation to close Workflow.

## 2. Exact Workflow integration service

Create/refactor Current Project integration around:

`Project root + exact workflowId`

Do not require or synthesize WorkIntake ID.

Derive:
- exact Workflow;
- SourceBaseline;
- current SourceBinding;
- incoming source revision;
- target Dev source line;
- checkpoint chain;
- execution completion state;
- current validation evidence;
- IntegrationRecord.

Direct and WIR-routed Workflows must converge on this exact service.

WIR history is provenance only.

## 3. Repair the linked-worktree candidate defect

This is mandatory.

Current managed `Dev/` is a linked checkout, so `.git` may be a file.

Normalize candidate mechanics on exact Git common-directory identity.

Required:
- operation root can be conventional or verified linked checkout;
- resolve `git rev-parse --git-common-dir`;
- canonicalize/verify exact common repository;
- managed Current Project Dev common directory must match the Project-managed repository;
- candidate worktrees must share that exact common repository;
- candidate machine state belongs beneath common-repository-owned storage;
- never assume `root/.git` is a directory;
- preserve conventional checkout behavior.

Do not move Git state into the non-Git Project container.

## 4. Candidate creation

From the exact Workflow:
- current Dev target revision;
- exact incoming Workflow revision;
- exact target-owned integration policy;
- exact completion/validation evidence.

Create one IntegrationRecord and integration candidate.

Stale target/incoming refs reject.

Candidate creation does not advance Dev.

## 5. Candidate validation

Run target-owned integration validation against the exact candidate.

Persist typed Integration Validation evidence.

Only a current validated candidate may become ready for target advancement.

Failure/conflict moves IntegrationRecord to bounded repairing/blocked state.

## 6. Integration Repair

When conflict or post-merge validation failure occurs:
- preserve the candidate;
- create bounded Integration Repair context from exact Workflow/IntegrationRecord evidence;
- agent may edit only integration-policy-approved paths in the candidate;
- application retains Git merge/stage/commit/advance mechanics;
- material product/architecture conflict returns to Operator Decision rather than choosing a semantic winner;
- repaired candidate re-runs the same target-owned validation.

If a canonical Repair WorkItem is used, it belongs to the exact current Workflow and links to IntegrationRecord. Do not attach repair work to superseded Workflow identity.

Do not reintroduce routed-development or WorkIntake integration ownership.

## 7. Dev advance

Before advancing:
- verify exact target ref unchanged;
- exact incoming unchanged;
- exact candidate unchanged/clean;
- required validation still current.

On success:
- application-owned Git advances Dev;
- IntegrationRecord records exact target-before/candidate/result revisions and `integrated`;
- SourceBinding/SourceCheckpoint history remains durable;
- exact Workflow closes through typed command;
- checkout/history is not deleted as a side effect.

No push, tag, release, or Main promotion is implied.

## 8. Source-neutral behavior

Source-neutral/non-source Workflow:
- never creates IntegrationRecord;
- never creates repository candidate;
- never fabricates Dev integration;
- closes after typed execution completion.

## 9. Required proof

Prove:

1. source-backed Feature execution-complete state requires all WorkItems/Phases done.
2. Issue uses same Workflow completion/integration service.
3. source-neutral Workflow closes without Git/integration records.
4. direct Feature integrates without WorkIntake identity.
5. WIR-routed Feature integrates through same exact Workflow service.
6. managed linked Dev creates a valid candidate.
7. conventional checkout candidate behavior still passes.
8. unrelated common repository is rejected.
9. stale target/incoming blocks candidate/advance.
10. conflict creates bounded Integration Repair.
11. candidate validation failure creates bounded Integration Repair.
12. repair edits only allowed candidate paths.
13. repaired candidate revalidates.
14. material conflict requires explicit Decision rather than automated winner.
15. successful candidate advances Dev.
16. IntegrationRecord exact result matches Dev.
17. Workflow closes only after integrated result.
18. no WorkIntake/routed/private Issue integration path owns the Current Project operation.

## Validation

Run:
- build;
- Workflow completion focused tests;
- exact Workflow integration tests;
- integration candidate/policy/repair focused tests;
- linked-worktree common-directory proof;
- conventional checkout regression;
- source-neutral completion proof;
- capability-map integrity if changed;
- exact validation-plan preview;
- `git diff --check`.

Do not run broad historical routed lifecycle suites merely because reusable integration files changed.

## Report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-05_IMPLEMENTER_REPORT.md`

Report:
- typed Workflow completion;
- exact source-backed/source-neutral behavior;
- linked-worktree repair;
- exact integration service;
- candidate/validation/repair;
- final Dev result evidence;
- legacy authority not used;
- focused validation.

## Checkpoint

Commit:

`WRB04-05 complete exact Workflow integration`

Then proceed directly to WRB04-06 unless a genuine architecture contradiction prevents this card from completing.
