# WRB04-02 — Establish Exact Workflow/WorkItem Implementer Runtime, Decomposition, and Implementation Checkpoints

**Revision:** 2 — Architect clarification after correct Implementer stop  
**Depends on:** WRB04-01 checkpoint `ae6eb789f829e2c7320827eb24767709cc458bcd`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Move one eligible canonical WorkItem from the WRB04-01 exact Workflow execution projection through:

```text
exact Workflow / WorkItem
→ bounded execution-contract planning
→ optional typed decomposition
→ exact Codex/App Server Implementer runtime
→ canonical ImplementationRecord
→ exact Workflow source checkpoint when required
→ validation_pending
```

Feature and Issue must use the same path.

The existing Codex/App Server transport/runtime mechanics may be reused. Legacy Development Work Card, routed-development, Issue Fix Card, and active-workspace Markdown identity may not be used to establish the new execution context.

## 1. Add an exact Codex execution selector

Extend the Implementer runtime with a selector equivalent to:

```ts
{
  ownerKind: "workflow-work-item";
  workflowId: EntityId;
  workItemId: EntityId;
}
```

This selector is the only new Current Project WorkItem implementation selector.

Required identity:
- exact selected Current Project;
- exact current Workflow ID;
- exact canonical WorkItem ID;
- exact WorkItem record version;
- exact source revision when source-backed;
- exact execution attempt ID issued by ChampCity.

Do not populate or synthesize:
- WorkIntake ID;
- route Decision ID;
- routed Plan ID;
- Issue ID/Fix Card ID;
- legacy Work Card ID as canonical identity.

Legacy selector variants may remain for their existing historical callers until WRB04-05 fences them.

## 2. Separate Project container root from execution working directory

Do not overload one `projectRoot` value for both SPS ownership and worker filesystem mutation.

The exact execution context must distinguish:

- `currentProjectRoot` — non-Git Current Project container containing `.champcity/project-state.sqlite` and application runtime evidence;
- `executionRoot` — the exact Workflow RepositoryCheckout root when source-backed.

For source-backed execution:
- call WRB04-01 `prepareExecution(..., {sourceMutating:true})`;
- require ready SourceBinding;
- resolve the exact registered Workflow RepositoryCheckout from `repositoryCheckoutId`;
- verify the checkout belongs to the exact Workflow/source binding;
- verify HEAD/current branch/revision matches SourceBinding `currentRevisionId`;
- use that checkout as Codex `workingDirectory`.

For non-source execution:
- an execution contract must explicitly be source-neutral;
- do not start a filesystem-mutating Codex run against the Project container as a fake repository;
- if the requested implementation requires source mutation, return `SOURCE_CAPABILITY_UNAVAILABLE`.

The Current Project container remains the home for SPS/runtime evidence, not source mutation.

## 3. Exact WorkItem execution contract

Create a bounded application-owned execution-contract service for one exact WorkItem.

The contract is an execution handoff/projection, not canonical Plan authority.

It must derive from:
- exact Workflow;
- exact WorkItem and record version;
- accepted BoundedSolution;
- owning Phase if any;
- exact WorkItem Criteria;
- dependencies;
- accepted WRB03 plan context;
- exact source context;
- project instructions/capability requirements;
- Architect elaboration produced in this card.

Required execution-contract semantics:
- implementation objective;
- scope in/out or explicit negative constraints;
- affected services/files/contracts when known;
- focused implementation-local proof intent;
- source mutation requirement: `required` or `not-required`;
- development-environment capabilities when actually required;
- accepted decomposition result if decomposition occurred.

ChampCity issues the contract identity and digest.

The contract may be stored as bounded application-owned runtime evidence under the Current Project `.champcity` runtime area and/or embedded directly into the worker prompt.

It must not be discovered by scanning legacy planning Markdown.

## 4. WorkItem Architect planning

Reuse the useful existing Work Card Architect UI/mechanics where practical, but route them through the exact Workflow/WorkItem execution-contract service.

The Architect may:
- elaborate implementation boundaries;
- identify likely affected paths/contracts;
- define focused proof intent;
- determine that the WorkItem is too large and requires decomposition;
- identify a genuine material scope/architecture conflict.

The Architect may not:
- reroute the Workflow;
- replace the accepted WRB03 plan;
- create route-owned WorkItems;
- silently broaden scope.

Acceptance of a normal execution contract does not create a new Plan entity.

## 5. Add one typed atomic decomposition command

There is currently no typed Project State decomposition command. Add one.

Preferred canonical behavior for an accepted decomposition:

- the original WorkItem is superseded as the replaced execution candidate;
- replacement WorkItems are application-issued canonical siblings under the original Workflow/Phase owner;
- every replacement remains in the exact same Workflow;
- WorkItem kind must remain valid for the Workflow family;
- original required Criteria are explicitly mapped to one or more replacements or to the owning Phase/solution;
- incoming/outgoing dependency semantics are explicitly mapped;
- replacement dependency graph is acyclic;
- no cross-Workflow references;
- the original record remains historical through supersession;
- no replacement may lose an acceptance obligation by omission.

The command must preflight the complete decomposition before mutation and commit atomically.

Do not use a generic parent WorkItem as a pseudo-container unless the domain completion rules are explicitly changed to support non-executable container WorkItems. Superseding the execution candidate into replacement siblings is preferred because current WorkItem completion requires an ImplementationRecord.

If no decomposition is required, retain the original WorkItem unchanged.

## 6. Add typed WorkItem attempt lifecycle commands

Do not drive new exact execution state through ad hoc generic `reviseRecord` calls.

Add typed commands sufficient for:

### Begin attempt
Preconditions:
- exact current Workflow owner;
- exact WorkItem is current;
- WRB04-01 execution eligibility is true;
- no conflicting active attempt;
- exact execution-contract digest/current WorkItem version matches.

Transition:
- WorkItem `planned|ready → in_progress`;
- issue an application-owned `executionRef`.

### Finish attempt
Record one immutable ImplementationRecord for the exact `executionRef`.

Outcomes:
- `implemented` → WorkItem moves to `validation_pending`;
- `partial` / retryable `failed` → record attempt and return WorkItem to `ready` unless a concrete blocker requires `blocked`;
- `blocked` → record attempt and mark WorkItem `blocked`.

Conflicting reuse of an existing `executionRef` must fail.

A successful attempt does not close the WorkItem.

## 7. Exact Workflow/WorkItem Codex execution context

Add a new exact-mode context resolver, separate from:

- `getCurrentWorkspaceModel`;
- `resolveRoutedImplementerContext`;
- `resolveIssueFixCardCodexExecutionContext`.

For `ownerKind: "workflow-work-item"`, resolve only from:
- WRB04 exact execution service;
- exact execution contract;
- exact SourceBinding/checkout when applicable;
- exact runtime report/evidence record.

The context must contain at least:
- currentProjectRoot;
- executionRoot or explicit source-neutral mode;
- workflowId;
- workItemId;
- workItemVersion;
- executionRef;
- execution-contract identity/digest;
- implementation objective/criteria;
- report/evidence location;
- source revision;
- source mutation requirement.

Update `sameExecutionContext`, retry readiness, status projection, and session identity for this exact mode.

Concurrent Workflows with distinct Workflow checkouts must not be serialized merely because they share one Current Project container.

One source-mutating Implementer may own a given Workflow checkout at a time unless a later architecture introduces per-WorkItem checkouts.

## 8. Reuse Codex transport, not legacy authority

The exact mode may reuse:
- Codex runtime manager;
- App Server transport;
- model/reasoning selection;
- approval/user-input/MCP elicitation handling;
- event streaming;
- execution policy;
- environment provisioning mechanics where they can consume the exact execution contract.

The exact mode must bypass:
- legacy current-workspace Work Card discovery;
- routed-development context;
- Issue Fix Card context;
- legacy WorkItem checkpoint capture/finalization;
- legacy report freshness/disposition rules that derive identity from Markdown.

Add an exact-mode Implementer prompt branch.

The prompt must identify the exact Workflow/WorkItem and bounded execution contract. It must instruct the Implementer not to perform Git state transitions.

## 9. Application-owned Implementer report/evidence

Create one application-owned report/evidence packet per execution attempt.

Prefer a small structured runtime schema rather than reusing legacy canonical Work Card report metadata.

Application-owned fields include:
- projectId;
- workflowId;
- workItemId;
- workItemVersion;
- executionRef;
- execution-contract digest;
- starting source revision;
- timestamps/identity.

Implementer-owned completion fields include:
- summary;
- deviations;
- blockers;
- residual risks;
- implementation-local proof performed;
- changed-path evidence/notes.

The runtime validates the exact report after execution.

The report is Evidence for canonical ImplementationRecord creation. It is not itself canonical work state.

Do not require legacy `planning/.../IMPLEMENTER_REPORT.md` discovery.

## 10. Changed-path attribution

For exact source-backed mode:
- collect App Server file-change events;
- canonicalize each changed path relative to `executionRoot`;
- reject/flag paths outside the exact Workflow checkout;
- preserve bounded attribution evidence for source checkpointing;
- compare final checkout state to the captured starting revision/state before checkpoint.

If change attribution is incomplete, do not pretend a clean implementation checkpoint exists. Return bounded inspection/blocked state.

## 11. Structured implementation finalization

Do not call legacy `completePlanWorkItemSource` for `workflow-work-item`.

Add/use an exact finalization service keyed by:
- currentProjectRoot;
- projectId;
- workflowId;
- workItemId;
- executionRef.

### Source-backed successful implementation

After validated report and successful Codex completion:

1. call typed Finish Attempt / create canonical ImplementationRecord;
2. create the structured implementation SourceCheckpoint through the exact Workflow service;
3. checkpoint only attributable source changes;
4. advance exact SourceBinding `currentRevisionId`;
5. bind checkpoint evidence to the ImplementationRecord;
6. leave WorkItem in `validation_pending`.

If source checkpointing fails after source mutation:
- do not mark a clean implemented candidate ready for Validator;
- preserve implementation/report evidence;
- return bounded checkpoint blocked/inspection state for recovery.

### Non-source successful implementation

For an explicitly source-neutral WorkItem:
- create the ImplementationRecord;
- return checkpoint result `not-required`;
- create no SourceCheckpoint/RepositoryCheckout/Git revision;
- move WorkItem to `validation_pending`.

The existing `recordStructuredImplementation` source-backed service may be reused for the source-backed branch. Add a bounded source-neutral finalizer rather than fabricating a SourceBinding.

### Failed/partial execution

Record immutable attempt semantics through the typed attempt command, but do not create a successful source checkpoint or advance to Validator.

## 12. Implementation-local proof classification

The Implementer report may list tests/scripts/checks used during implementation.

Default classification is `implementation-local`.

Do not automatically:
- add them to `validation/capability-map.json`;
- create permanent-test references;
- create RegressionObligation;
- modify durable test metadata.

WRB04-03 Tester owns permanent regression disposition.

Existing permanent tests may be reused as implementation proof without changing their lifecycle ownership.

## 13. Focused permanent proof

Add proof for the exact runtime boundary, not just service internals.

Required:

1. selector `workflow-work-item` resolves exact Feature WorkItem without invoking legacy current-workspace/routed/Issue resolvers;
2. exact Issue Fix WorkItem resolves through the same selector/context path;
3. same-title WorkItems remain distinct by canonical ID;
4. ineligible dependency WorkItem cannot begin;
5. exact source-backed mode uses the Workflow checkout as Codex working directory;
6. Project container and executionRoot remain distinct;
7. two different Workflow checkouts may resolve independent sessions;
8. one Workflow checkout rejects conflicting concurrent source-mutating session;
9. source-neutral non-source WorkItem does not fabricate a repository;
10. source-mutating non-source WorkItem is blocked before Codex start;
11. typed decomposition supersedes original and creates same-Workflow replacement siblings atomically;
12. Criteria/dependency mapping cannot silently lose obligations or cross Workflow boundary;
13. successful exact execution records one ImplementationRecord for exact executionRef;
14. conflicting executionRef reuse fails;
15. source-backed success creates structured SourceCheckpoint and advances SourceBinding revision;
16. source-neutral success returns checkpoint not-required;
17. partial/failed attempt is durable but does not enter validation_pending as successful;
18. implementation-local proof is not automatically made permanent;
19. no exact-mode production call reaches `resolveRoutedImplementerContext`, `resolveIssueFixCardCodexExecutionContext`, or `getCurrentWorkspaceModel` for identity.

Use injected/fake App Server adapters for deterministic tests; do not require a live model call.

## 14. Files/modules likely involved

This is guidance, not a mandatory file list.

Expect changes around:
- `workflowExecutionApplicationService.ts`;
- new exact WorkItem execution-contract/finalization service(s);
- `projectStateService.ts` typed decomposition/attempt commands;
- `codexImplementerExecutionService.ts` exact selector/context/prompt/session/finalization branch;
- structured Workflow checkpoint service;
- shared runtime contracts;
- focused exact runtime tests;
- capability map.

Do not modify legacy paths merely to make them look exact.

## Non-scope

WRB04-02 still does **not** implement:
- Tester permanent-suite judgment;
- Validator;
- Repair loop;
- WorkItem final close;
- Phase close;
- Workflow completion;
- integration;
- final shared execution UI convergence.

Those remain WRB04-03 through WRB04-05.

## Validation

Run:
- build;
- WRB04-01 shared execution tests;
- exact WorkItem execution-contract/decomposition tests;
- exact Codex selector/context tests with fake adapter;
- structured implementation checkpoint tests;
- source materialization regression;
- source-neutral finalization proof;
- capability-map integrity if metadata changes;
- exact validation-plan preview;
- `git diff --check`.

Do not run broad legacy Work Card/Issue lifecycle suites solely because the reused Codex service file changed. Select focused tests for the exact mode plus regressions protecting shared reusable transport mechanics.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-02_IMPLEMENTER_REPORT.md`

The report must explicitly state:
- exact selector/context implemented;
- whether legacy identity resolvers are bypassed in exact mode;
- Project container root vs executionRoot behavior;
- decomposition semantics;
- attempt state transitions;
- source-backed checkpoint evidence;
- non-source not-required evidence;
- proof that implementation-local tests were not automatically promoted.

Suggested commit:

`WRB04-02 establish exact WorkItem Implementer runtime and checkpoint`

Then proceed directly to WRB04-03.
