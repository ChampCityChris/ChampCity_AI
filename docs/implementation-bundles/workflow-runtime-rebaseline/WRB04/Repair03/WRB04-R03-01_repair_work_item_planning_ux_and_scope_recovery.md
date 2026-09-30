# WRB04-R03-01 — Repair WorkItem Planning UX and Scope-Violation Recovery

**Parent:** WRB04 Repair03  
**Starting baseline:** `5585d0354fcc68a09ca2562731af6ee7668cc376`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Finish the exact WorkItem planning/execution boundary as a usable product path and make Architect path-scope violations recoverable without preserving unauthorized source changes.

This card owns:

- embedded Architect WorkItem planning UX;
- bounded Architect draft import/review;
- exact source-scope violation finalization and checkout recovery;
- bounded replanning/retry after non-successful attempts;
- truthful UI handling of returned exact-runtime start failures.

Do not change Tester, Validator, Phase, or integration architecture.

## 1. Restore the embedded Architect WorkItem planning surface

The shared execution Workspace currently copies a handoff prompt to the clipboard and requires the Operator to manually populate three fields.

Feature and Issue front halves already use the embedded Architect browser pattern.

Update the execution Workspace composition so it receives and renders the same embedded Architect browser surface.

Required normal interaction:

```text
Plan WorkItem
→ Prepare Architect Handoff
→ Copy Instructions
→ use embedded Architect browser
→ paste/import structured Architect response
→ review bounded contract
→ Accept execution plan OR apply typed decomposition
```

Pass the existing browser panel from `App.tsx` into `WorkflowExecutionWorkspace`.

Do not create a second browser/runtime implementation.

## 2. Add one bounded Architect result draft

The Architect response contract is bounded structured JSON:

```ts
{
  implementationBoundaries: string[];
  affectedPaths: string[];
  proofIntent: string[];
  decompositionRequired: boolean;
  decomposition?: {
    replacements: WorkItemDecompositionCandidate[];
    criterionDispositions: WorkItemCriterionDisposition[];
    incomingDependentMappings: WorkItemDecompositionInput["incomingDependentMappings"];
  };
}
```

Rules:

- use the existing execution-plan bounds;
- source-neutral affectedPaths must remain empty;
- if decompositionRequired is true, decomposition must satisfy the existing typed decomposition contract;
- if false, decomposition is absent;
- no raw transcript becomes SPS authority.

Provide an Architect draft textarea/import area like the existing Feature/Issue planning workspaces.

Parse failures become visible renderer errors and mutate nothing.

The existing three execution-plan fields may remain as an editable fallback/review surface, but they are not the only normal Architect workflow.

## 3. Preserve exact decomposition authority

Do not replace the typed `decomposeWorkItem` command.

If the accepted Architect result recommends decomposition:

- load the bounded typed decomposition proposal into the review surface;
- Operator applies it through the existing exact decomposition action;
- replacements return to WorkItem planning-required state;
- no Implementer starts automatically.

## 4. Treat an out-of-scope source mutation as a failed attempt, not an implemented WorkItem

Current defect:

- path scope violation is known before final checkpoint;
- model may return semantic `implemented`;
- application currently persists that outcome first;
- WorkItem becomes `validation_pending`;
- checkpoint then blocks.

Change finalization order.

For source-backed exact execution:

1. collect semantic result and application-attributed source paths;
2. evaluate accepted Architect path scope;
3. if any attributable path is outside scope, do **not** persist a successful implementation outcome;
4. preserve one immutable attempt packet and ImplementationRecord with a non-success outcome and explicit scope-violation blocker;
5. create no SourceCheckpoint;
6. restore the exact Workflow checkout to the pre-attempt expected revision using application-owned bounded Git/file mechanics;
7. verify exact HEAD and clean status after restore;
8. return WorkItem to `ready` when restoration succeeds.

The model's semantic statement may remain in the attempt evidence, but it cannot make the WorkItem implemented after the application rejected its source scope.

## 5. Exact checkout restore boundary

Before execution, the exact checkout is already required to be:

- exact Workflow checkout;
- correct common repository;
- exact expected HEAD;
- clean;
- exclusively leased for the source-mutating role.

On scope violation, application-owned recovery may therefore discard only the uncheckpointed changes from that exact attempt.

Required recovery:

- tracked files restored to exact pre-attempt revision;
- attempt-created untracked paths removed only after repository-containment/path validation;
- no broad operation against Dev/Main/another checkout;
- no push/tag/release;
- no SourceBinding revision advance;
- final HEAD equals expected revision;
- final ordinary status is clean.

If safe restoration cannot be proven:

- persist the attempt as blocked/failed evidence;
- leave the WorkItem visibly blocked/inspection-required;
- do not pretend it is retryable.

Do not silently accept or checkpoint out-of-scope changes.

## 6. Permit bounded execution-plan revision after a non-successful attempt

The current plan acceptance command rejects any WorkItem with any historical implementation attempt.

That prevents the intended replan/retry path.

Allow execution-plan revision when all are true:

- WorkItem is currently `ready`;
- latest attempt outcome is `partial|failed|abandoned` or an application-classified scope-violation failure;
- no successful `implemented` attempt is current;
- no TesterResult exists for the failed attempt;
- no Validation exists for that attempt;
- no committed/pending/inspection SourceCheckpoint belongs to that attempt;
- no active Repair owns the next correction;
- source-backed checkout is restored clean at the unchanged current SourceBinding revision.

Historical attempts remain immutable.

Successful implementation evidence still freezes the execution plan.

## 7. Exact retry

After safe restoration + revised Architect plan:

- new WorkItem record version/digest;
- new executionRef;
- new attempt;
- new accepted path scope;
- exact source checkout starts from unchanged prior revision.

Prove the prior failed attempt cannot be confused with the retry.

## 8. Truthful start-result handling in the shared Workspace

Exact Implementer/Tester start APIs can return an `unavailable` execution model with `failureReason` rather than throw.

Do not route those through a generic helper that always displays a success message.

For Implementer and Tester start:

- inspect the returned execution model;
- update the local exact runtime model immediately;
- if state is unavailable/failed or failureReason is present, show bounded error/status and do not display “run started”;
- only display started feedback when the returned state is actually running.

This covers:
- exact runtime capacity exhaustion;
- same-checkout role lease refusal;
- source-preparation refusal;
- other bounded preflight failures.

## Permanent proof

Prove at minimum:

1. shared execution Workspace contains the embedded Architect browser;
2. bounded Architect draft parses into execution-plan review fields;
3. malformed draft mutates nothing and surfaces error;
4. Architect-recommended decomposition uses the existing typed command;
5. source-backed out-of-scope change persists a non-success attempt, not implemented;
6. no SourceCheckpoint is created for that attempt;
7. exact checkout returns to expected HEAD and clean state;
8. WorkItem returns to ready after successful restore;
9. execution plan may be revised after that failed attempt;
10. retry starts with new plan version/digest and can checkpoint valid in-scope work;
11. successful implemented attempt still prevents replanning;
12. failed safe-restore path is visibly blocked and not retryable;
13. capacity/lease returned-unavailable model produces visible failure, not “run started”;
14. normal Implementer/Tester running result still produces started feedback.

## Non-scope

Do not change:

- cumulative source evidence semantics;
- human Criterion authority;
- Phase validation/Repair policy;
- generated Repair Criterion policy;
- integration.

## Validation

Run:

- build;
- exact Implementer source-backed scope/recovery tests;
- execution-plan revision tests;
- WorkItem planning renderer tests with embedded Architect panel;
- bounded Architect draft parse tests;
- exact start-result renderer tests;
- existing exact concurrency/lease regression;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair03/Reports/WRB04-R03-01_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R03-01 repair WorkItem planning recovery`

Then immediately proceed to R03-02.
